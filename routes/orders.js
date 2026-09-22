const express = require('express');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const db = require('../db');
const ShippingService = require('../services/shippingService');
const { requireAuth, requireActiveSubscription, checkResourceOwnership, isSubscriptionExpired } = require('../middleware/auth');
const { ensureFinancialArchive } = require('../db');
const { notifyUser } = require('./notifications');

const router = express.Router();

// دوال مساعدة: تتعامل مع المتغيرات والمنتجات البسيطة
async function decrementStock(item, trx) {
  const quantity = Number(item.qty) || 0;
  let result;
  if (item.variant_id) {
    result = await trx.query(
      'UPDATE product_variants SET stock = stock - $1 WHERE id = $2 AND stock >= $3',
      [quantity, item.variant_id, quantity]
    );
  } else {
    result = await trx.query(
      'UPDATE products SET stock = stock - $1 WHERE id = $2 AND stock >= $3',
      [quantity, item.id, quantity]
    );
  }
  return result.rowCount === 1;
}

async function incrementStock(item, trx = db) {
  if (item.variant_id) {
    await trx.query('UPDATE product_variants SET stock = stock + $1 WHERE id = $2', [item.qty, item.variant_id]);
  } else {
    await trx.query('UPDATE products SET stock = stock + $1 WHERE id = $2', [item.qty, item.id]);
  }
}

async function currentStockOf(item, trx = db) {
  if (item.variant_id) {
    const v = await trx.get('SELECT stock FROM product_variants WHERE id = $1', [item.variant_id]);
    return v ? v.stock : null;
  }
  const p = await trx.get('SELECT stock FROM products WHERE id = $1', [item.id]);
  return p ? p.stock : null;
}

function orderCostOfGoods(order) {
  const items = typeof order.items === 'string' ? JSON.parse(order.items || '[]') : (order.items || []);
  return items.reduce((sum, item) => sum + (Number(item.cost_price) || 0) * (Number(item.qty) || 0), 0);
}

const orderLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 15,
  message: { error: 'عدد كبير من الطلبات في وقت قصير. الرجاء المحاولة لاحقًا.' },
});

// ----------------------------------------------------------------
// إنشاء طلب جديد
// ----------------------------------------------------------------
router.post(
  '/',
  orderLimiter,
  [
    body('customer_name').trim().isLength({ min: 2, max: 150 }).withMessage('الاسم مطلوب'),
    body('phone').trim().isLength({ min: 6, max: 30 }).withMessage('رقم هاتف صالح مطلوب'),
    body('address').trim().isLength({ min: 5, max: 500 }).withMessage('العنوان مطلوب'),
    body('wilaya_code').isInt().withMessage('الرجاء اختيار الولاية'),
    body('commune').trim().isLength({ min: 1, max: 150 }).withMessage('الرجاء اختيار البلدية'),
    body('delivery_type').isIn(['home', 'desk']).withMessage('نوع التوصيل غير صالح'),
    body('items').isArray({ min: 1 }).withMessage('السلة فارغة'),
    body('store_id').isInt({ min: 1 }).withMessage('معرّف المتجر (store_id) مطلوب'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }

    let { customer_name, phone, address, wilaya_code, commune, delivery_type, items, store_id } = req.body;

    // التحقق من أن المتجر موجود وفعال
    const vendor = await db.get(
      'SELECT id, role, subscription_status, subscription_plan, trial_ends_at, subscription_ends_at FROM users WHERE id = $1',
      [store_id]
    );
    if (!vendor) {
      return res.status(404).json({ error: 'المتجر غير موجود.' });
    }
    if (vendor.role !== 'admin' && isSubscriptionExpired(vendor)) {
      return res.status(403).json({ error: 'هذا المتجر متوقف مؤقتًا لانتهاء الاشتراك.', is_store_unavailable: true });
    }

    const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000);
    const dateLimit = require('../db').getMode() === 'sqlite' 
      ? tenMinsAgo.toISOString().replace('T', ' ').substring(0, 19) 
      : tenMinsAgo.toISOString();
    const duplicate = await db.get(
      `SELECT id FROM orders
       WHERE user_id = $1 AND phone = $2 AND created_at >= $3
         AND status IN ('قيد المعالجة', 'قيد التوصيل')
       ORDER BY id DESC LIMIT 1`,
      [store_id, phone.trim(), dateLimit]
    );
    if (duplicate) {
      return res.status(409).json({ error: `يوجد طلب مشابه قيد المعالجة بالفعل (رقم ${duplicate.id}).`, duplicate_order_id: duplicate.id });
    }

    const rate = await db.get('SELECT * FROM delivery_rates WHERE wilaya_code = $1', [wilaya_code]);
    if (!rate) return res.status(400).json({ error: 'ولاية غير معروفة' });
    const shippingResult = await ShippingService.calculateShippingCost(store_id, wilaya_code, delivery_type, (items || []).reduce((sum, it) => sum + (parseFloat(it.price) || 0) * (parseInt(it.qty, 10) || 1), 0));
    if (shippingResult.is_unavailable) {
      return res.status(400).json({ error: "التوصيل غير متاح لهذه الولاية." });
    }
    const finalDeliveryPrice = shippingResult.price;

    try {
      const outcome = await db.transaction(async (trx) => {
        let subtotal = 0;
        const verifiedItems = [];
        const requestedItems = new Map();
        for (const item of items) {
          const key = `${item.id}:${item.variant_id || 0}`;
          const existing = requestedItems.get(key);
          requestedItems.set(key, { ...item, qty: (existing ? existing.qty : 0) + (parseInt(item.qty, 10) || 1) });
        }

        for (const item of requestedItems.values()) {
          const product = await trx.get('SELECT * FROM products WHERE id = $1 AND is_active = 1', [item.id]);
          if (!product) throw new Error('المنتج "' + (item.name || 'المحدد') + '" لم يعد متوفراً. يرجى حذفه من السلة لإتمام الطلبية.');
          store_id = product.user_id; // Fix to ensure order goes to the product owner

          const qty = Math.max(1, Math.min(parseInt(item.qty, 10) || 1, 999));

          let variant = null;
          if (product.has_variants) {
            variant = await trx.get(
              'SELECT * FROM product_variants WHERE id = $1 AND product_id = $2',
              [item.variant_id, product.id]
            );
            if (!variant) {
              const err = new Error(`الرجاء اختيار المقاس/الحجم لـ "${product.name}"`);
              err.isStockError = true;
              throw err;
            }
            if (!(await decrementStock({ qty, variant_id: variant.id }, trx))) {
              const latest = (await currentStockOf({ variant_id: variant.id }, trx)) || 0;
              if (latest <= 0) {
                throw new Error(`عذراً، لقد نفد المخزون من "${product.name}" (${variant.label})`);
              } else {
                throw new Error(`عذراً، الكمية المتوفرة من "${product.name}" (${variant.label}) هي ${latest} فقط`);
              }
            }



          } else {
            if (!(await decrementStock({ qty, id: product.id }, trx))) {
              const latest = (await currentStockOf({ id: product.id }, trx)) || 0;
              if (latest <= 0) {
                throw new Error(`عذراً، لقد نفد المخزون من "${product.name}"`);
              } else {
                throw new Error(`عذراً، الكمية المتوفرة من "${product.name}" هي ${latest} فقط`);
              }
            }



          }

          subtotal += parseFloat(product.price) * qty;
          verifiedItems.push({
            id: product.id,
            name: product.name,
            price: parseFloat(product.price),
            cost_price: variant ? parseFloat(variant.cost_price || 0) : parseFloat(product.cost_price || 0),
            qty,
            variant_id: variant ? variant.id : null,
            variant_label: variant ? (variant.label || [variant.color, variant.size].filter(Boolean).join(' - ')) : null,
            color: variant ? variant.color || '' : '',
            color_code: variant ? variant.color_code || '' : '',
            size: variant ? variant.size || '' : '',
            image: variant && variant.image ? variant.image : product.image,
          });
        }

        if (verifiedItems.length === 0) {
          throw new Error('المنتجات المطلوبة غير متوفرة');
        }

        const shippingResultTrx = await ShippingService.calculateShippingCost(store_id, wilaya_code, delivery_type, subtotal);
        if (shippingResultTrx.is_unavailable) throw new Error('التوصيل غير متاح لهذه الولاية.');
        const deliveryPrice = shippingResultTrx.price;
        const rate = await trx.get('SELECT wilaya_name FROM delivery_rates WHERE wilaya_code = $1', [wilaya_code]);
        const wilaya_name = rate ? rate.wilaya_name : String(wilaya_code);

        const total = subtotal + deliveryPrice;

        const utm_source = (req.body.utm_source || '').trim();
        const utm_campaign = (req.body.utm_campaign || '').trim();
        const utm_medium = (req.body.utm_medium || '').trim();
        const utm_content = (req.body.utm_content || '').trim();

        const insertRes = await trx.query(
          `INSERT INTO orders
            (user_id, customer_name, phone, address, wilaya_code, wilaya_name, commune, delivery_type, delivery_price, shipping_cost_actual, subtotal, items, total, status, shipping_cost_incurred, utm_source, utm_campaign, utm_medium, utm_content)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
           RETURNING id`,
          [
            store_id,
            customer_name.trim(),
            phone.trim(),
            address.trim(),
            wilaya_code,
            wilaya_name,
            commune.trim(),
            delivery_type,
            deliveryPrice,
            0,
            subtotal,
            JSON.stringify(verifiedItems),
            total,
            'قيد المعالجة',
            0,
            utm_source,
            utm_campaign,
            utm_medium,
            utm_content,
          ]
        );

        const orderId = insertRes.rows[0].id;
        await trx.query('INSERT INTO order_status_history (order_id, from_status, to_status) VALUES ($1, NULL, $2)', [orderId, 'قيد المعالجة']);

        return { order_id: orderId, notify_args: [store_id, 'طلب جديد', `وصل طلب جديد للمتجر: ${customer_name.trim()} - ${verifiedItems.length} منتجات`, {
          type: 'new_order',
          order_id: String(orderId),
          store_id: String(store_id),
        }], subtotal, delivery_price: deliveryPrice, total };
      });

      if (outcome.notify_args) {
        try { await notifyUser(...outcome.notify_args); } catch (e) {}
        delete outcome.notify_args;
      }
      res.status(201).json({ success: true, ...outcome });
    } catch (err) {
      return res.status(400).json({ error: err.message || 'تعذر إتمام الطلب' });
    }
  }
);

// عرض كل الطلبات للتاجر المسجل دخوله
router.get('/', requireAuth, async (req, res) => {
  let orders;
  if (req.user.role === 'admin') {
    orders = await db.all('SELECT * FROM orders ORDER BY created_at DESC');
  } else {
    orders = await db.all('SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC', [req.user.id]);
  }
  res.json(
    orders.map((o) => ({
      ...o,
      delivery_price: parseFloat(o.delivery_price) || 0,
      subtotal: parseFloat(o.subtotal) || 0,
      total: parseFloat(o.total) || 0,
      shipping_cost_actual: parseFloat(o.shipping_cost_actual) || 0,
      items: typeof o.items === 'string' ? JSON.parse(o.items || '[]') : (o.items || []),
    }))
  );
});

// ملخص مالي للتاجر المسجل دخوله
router.get('/stats', requireAuth, async (req, res) => {
  const userId = req.user.role === 'admin' ? null : req.user.id;

  let liveSalesQuery, liveLostQuery, countsQuery;
  let params = [];

  if (userId !== null) {
    liveSalesQuery = "SELECT COALESCE(SUM(subtotal), 0) AS total FROM orders WHERE status = 'تم التسليم' AND user_id = $1";
    liveLostQuery = "SELECT COALESCE(SUM(COALESCE(NULLIF(shipping_cost_actual, 0), delivery_price)), 0) AS total FROM orders WHERE (status IN ('ملغي', 'مرتجع', 'تعذر التوصيل')) AND shipping_cost_incurred = 1 AND user_id = $1";
    countsQuery = `SELECT
       SUM(CASE WHEN status = 'قيد المعالجة' THEN 1 ELSE 0 END) AS processing,
       SUM(CASE WHEN status = 'قيد التوصيل' THEN 1 ELSE 0 END) AS shipping,
       SUM(CASE WHEN status = 'تم التسليم' THEN 1 ELSE 0 END) AS delivered,
       SUM(CASE WHEN status = 'تعذر التوصيل' THEN 1 ELSE 0 END) AS failed_delivery,
       SUM(CASE WHEN status = 'مرتجع' THEN 1 ELSE 0 END) AS returned,
       SUM(CASE WHEN status = 'ملغي' THEN 1 ELSE 0 END) AS cancelled,
       SUM(CASE WHEN (status IN ('ملغي', 'مرتجع', 'تعذر التوصيل')) AND shipping_cost_incurred = 1 THEN 1 ELSE 0 END) AS cancelled_after_shipping,
       COUNT(*) AS total
     FROM orders WHERE user_id = $1`;
    params = [userId];
  } else {
    liveSalesQuery = "SELECT COALESCE(SUM(subtotal), 0) AS total FROM orders WHERE status = 'تم التسليم'";
    liveLostQuery = "SELECT COALESCE(SUM(COALESCE(NULLIF(shipping_cost_actual, 0), delivery_price)), 0) AS total FROM orders WHERE (status IN ('ملغي', 'مرتجع', 'تعذر التوصيل')) AND shipping_cost_incurred = 1";
    countsQuery = `SELECT
       SUM(CASE WHEN status = 'قيد المعالجة' THEN 1 ELSE 0 END) AS processing,
       SUM(CASE WHEN status = 'قيد التوصيل' THEN 1 ELSE 0 END) AS shipping,
       SUM(CASE WHEN status = 'تم التسليم' THEN 1 ELSE 0 END) AS delivered,
       SUM(CASE WHEN status = 'تعذر التوصيل' THEN 1 ELSE 0 END) AS failed_delivery,
       SUM(CASE WHEN status = 'مرتجع' THEN 1 ELSE 0 END) AS returned,
       SUM(CASE WHEN status = 'ملغي' THEN 1 ELSE 0 END) AS cancelled,
       SUM(CASE WHEN (status IN ('ملغي', 'مرتجع', 'تعذر التوصيل')) AND shipping_cost_incurred = 1 THEN 1 ELSE 0 END) AS cancelled_after_shipping,
       COUNT(*) AS total
     FROM orders`;
  }

  await ensureFinancialArchive(userId);

  const archiveRow = userId !== null
    ? await db.get('SELECT * FROM financial_archive WHERE user_id = $1', [userId])
    : await db.get('SELECT COALESCE(SUM(archived_sales), 0) AS archived_sales, COALESCE(SUM(archived_cogs), 0) AS archived_cogs, COALESCE(SUM(archived_shipping_cost), 0) AS archived_shipping_cost FROM financial_archive');

  const liveDeliveredOrders = userId !== null
    ? await db.all("SELECT items FROM orders WHERE status = 'تم التسليم' AND user_id = $1", [userId])
    : await db.all("SELECT items FROM orders WHERE status = 'تم التسليم'");

  let liveDeliveredCogs = 0;
  for (const o of liveDeliveredOrders) {
    liveDeliveredCogs += orderCostOfGoods(o);
  }

  const liveSalesRow = await db.get(liveSalesQuery, params);
  const liveLostRow = await db.get(liveLostQuery, params);
  const countsRow = await db.get(countsQuery, params);

  const archivedSales = parseFloat(archiveRow?.archived_sales || 0);
  const archivedCogs = parseFloat(archiveRow?.archived_cogs || 0);
  const archivedShippingCost = parseFloat(archiveRow?.archived_shipping_cost || 0);

  const liveSales = parseFloat(liveSalesRow?.total || 0);
  const liveLost = parseFloat(liveLostRow?.total || 0);

  const totalSales = archivedSales + liveSales;
  const totalCogs = archivedCogs + liveDeliveredCogs;
  const totalLost = archivedShippingCost + liveLost;
  const netRevenue = totalSales - totalLost;
  const netProfit = netRevenue - totalCogs;

  res.json({
    total_sales: totalSales,
    total_cogs: totalCogs,
    shipping_losses: totalLost,
    net_revenue: netRevenue,
    net_profit: netProfit,
    archived_sales: archivedSales,
    archived_cogs: archivedCogs,
    archived_shipping_cost: archivedShippingCost,
    live_sales: liveSales,
    live_cogs: liveDeliveredCogs,
    live_shipping_cost: liveLost,
    counts: {
      processing: parseInt(countsRow?.processing || 0, 10),
      shipping: parseInt(countsRow?.shipping || 0, 10),
      delivered: parseInt(countsRow?.delivered || 0, 10),
      failed_delivery: parseInt(countsRow?.failed_delivery || 0, 10),
      returned: parseInt(countsRow?.returned || 0, 10),
      cancelled: parseInt(countsRow?.cancelled || 0, 10),
      cancelled_after_shipping: parseInt(countsRow?.cancelled_after_shipping || 0, 10),
      total: parseInt(countsRow?.total || 0, 10),
    },
  });
});


﻿


// أرشفة الطلبات المكتملة
router.post('/archive-fulfilled', requireAuth, requireActiveSubscription, async (req, res) => {
  const userId = req.user.role === 'admin' ? null : req.user.id;
  await ensureFinancialArchive(userId);

  try {
    const result = await db.transaction(async (trx) => {
      let ordersToArchive;
      if (userId !== null) {
        ordersToArchive = await trx.all(
          "SELECT * FROM orders WHERE status IN ('تم التسليم', 'ملغي', 'مرتجع', 'تعذر التوصيل') AND user_id = $1",
          [userId]
        );
      } else {
        ordersToArchive = await trx.all("SELECT * FROM orders WHERE status IN ('تم التسليم', 'ملغي', 'مرتجع', 'تعذر التوصيل')");
      }

      let deliveredSales = 0;
      let deliveredCogs = 0;
      let returnedShippingCost = 0;

      for (const order of ordersToArchive) {
        if (order.status === 'تم التسليم') {
          deliveredSales += parseFloat(order.subtotal);
          deliveredCogs += orderCostOfGoods(order);
        } else if (order.shipping_cost_incurred) {
          returnedShippingCost += (parseFloat(order.shipping_cost_actual) || parseFloat(order.delivery_price)) || 0;
        }
      }

      if (userId !== null) {
        await trx.query(
          `UPDATE financial_archive
           SET archived_sales = archived_sales + $1,
               archived_cogs = archived_cogs + $2,
               archived_shipping_cost = archived_shipping_cost + $3
           WHERE user_id = $4`,
          [deliveredSales, deliveredCogs, returnedShippingCost, userId]
        );
        await trx.query(
          "DELETE FROM orders WHERE status IN ('تم التسليم', 'ملغي', 'مرتجع', 'تعذر التوصيل') AND user_id = $1",
          [userId]
        );
      } else {
        await trx.query(
          `UPDATE financial_archive
           SET archived_sales = archived_sales + $1,
               archived_cogs = archived_cogs + $2,
               archived_shipping_cost = archived_shipping_cost + $3
           WHERE user_id IS NULL`,
          [deliveredSales, deliveredCogs, returnedShippingCost]
        );
        await trx.query(
          "DELETE FROM orders WHERE status IN ('تم التسليم', 'ملغي', 'مرتجع', 'تعذر التوصيل')"
        );
      }

      return ordersToArchive.length;
    });

    res.json({ success: true, archived_count: result });
  } catch (err) {
    res.status(500).json({ error: 'تعذرت أرشفة الطلبات: ' + err.message });
  }
});

// تحديث حالة الطلب
router.put('/:id/status', requireAuth, requireActiveSubscription, async (req, res) => {
  const allowed = ['قيد المعالجة', 'قيد التوصيل', 'تم التسليم', 'تعذر التوصيل', 'مرتجع', 'ملغي'];
  const { status, shipping_cost_incurred } = req.body;
  if (!allowed.includes(status)) {
    return res.status(400).json({ error: 'حالة غير صالحة' });
  }

  const order = await db.get('SELECT * FROM orders WHERE id = $1', [req.params.id]);
  if (!order) return res.status(404).json({ error: 'الطلب غير موجود' });
  if (!checkResourceOwnership(order.user_id, req, res)) return;

  const oldStatus = order.status;

  try {
    await db.transaction(async (trx) => {
      let costIncurred = order.shipping_cost_incurred;
      if (shipping_cost_incurred !== undefined) {
        costIncurred = shipping_cost_incurred ? 1 : 0;
      } else if (status === 'قيد التوصيل' || status === 'تم التسليم') {
        costIncurred = 1;
      }

      const upd = await trx.query('UPDATE orders SET status = $1, shipping_cost_incurred = $2 WHERE id = $3 AND status = $4', [
        status,
        costIncurred,
        req.params.id,
        oldStatus
      ]);
      if (upd.rowCount !== 1) throw new Error('تغيرت حالة الطلب، أعد المحاولة');

      if (oldStatus !== status) {
        await trx.query('INSERT INTO order_status_history (order_id, from_status, to_status) VALUES ($1, $2, $3)', [
          req.params.id,
          oldStatus,
          status,
        ]);
      }

      const activeStatuses = ['قيد المعالجة', 'قيد التوصيل', 'تم التسليم'];
      const inactiveStatuses = ['ملغي', 'مرتجع', 'تعذر التوصيل'];

      if (activeStatuses.includes(oldStatus) && inactiveStatuses.includes(status)) {
        const items = typeof order.items === 'string' ? JSON.parse(order.items || '[]') : (order.items || []);
        for (const item of items) {
          await incrementStock(item, trx);
        }
      } else if (inactiveStatuses.includes(oldStatus) && activeStatuses.includes(status)) {
        const items = typeof order.items === 'string' ? JSON.parse(order.items || '[]') : (order.items || []);
        for (const item of items) {
          const success = await decrementStock(item, trx);
          if (!success) throw new Error("لا يوجد مخزون كافٍ للمنتج: " + item.name);
        }
      }
    });

    const updated = await db.get('SELECT * FROM orders WHERE id = $1', [req.params.id]);
    res.json({
      ...updated,
      delivery_price: parseFloat(updated.delivery_price) || 0,
      subtotal: parseFloat(updated.subtotal) || 0,
      total: parseFloat(updated.total) || 0,
      shipping_cost_actual: parseFloat(updated.shipping_cost_actual) || 0,
      items: typeof updated.items === 'string' ? JSON.parse(updated.items || '[]') : (updated.items || []),
    });
  } catch (err) {
    res.status(500).json({ error: 'تعذر تحديث الحالة: ' + err.message });
  }
});

// تعديل بيانات الطلب
router.put('/:id/edit', requireAuth, requireActiveSubscription, async (req, res) => {
  const order = await db.get('SELECT * FROM orders WHERE id = $1', [req.params.id]);
  if (!order) return res.status(404).json({ error: 'الطلب غير موجود' });
  if (!checkResourceOwnership(order.user_id, req, res)) return;

  const { customer_name, phone, address, commune, delivery_type, delivery_price, items } = req.body;

  try {
    await db.transaction(async (trx) => {
      let finalItems = typeof order.items === 'string' ? JSON.parse(order.items || '[]') : (order.items || []);
      let finalSubtotal = parseFloat(order.subtotal);
      let finalDeliveryPrice = delivery_price !== undefined ? parseFloat(delivery_price) : parseFloat(order.delivery_price);

      if (items && Array.isArray(items) && items.length > 0) {
        finalSubtotal = items.reduce((sum, it) => sum + (parseFloat(it.price) || 0) * (parseInt(it.qty, 10) || 1), 0);
        finalItems = items;
      }

      const finalTotal = finalSubtotal + finalDeliveryPrice;

      await trx.query(
        `UPDATE orders
         SET customer_name = COALESCE($1, customer_name),
             phone = COALESCE($2, phone),
             address = COALESCE($3, address),
             commune = COALESCE($4, commune),
             delivery_type = COALESCE($5, delivery_type),
             delivery_price = $6,
             subtotal = $7,
             total = $8,
             items = $9
         WHERE id = $10`,
        [
          customer_name ? customer_name.trim() : null,
          phone ? phone.trim() : null,
          address ? address.trim() : null,
          commune ? commune.trim() : null,
          delivery_type || null,
          finalDeliveryPrice,
          finalSubtotal,
          finalTotal,
          JSON.stringify(finalItems),
          req.params.id,
        ]
      );
    });

    const updated = await db.get('SELECT * FROM orders WHERE id = $1', [req.params.id]);
    res.json({
      ...updated,
      delivery_price: parseFloat(updated.delivery_price) || 0,
      subtotal: parseFloat(updated.subtotal) || 0,
      total: parseFloat(updated.total) || 0,
      shipping_cost_actual: parseFloat(updated.shipping_cost_actual) || 0,
      items: typeof updated.items === 'string' ? JSON.parse(updated.items || '[]') : (updated.items || []),
    });
  } catch (err) {
    res.status(500).json({ error: 'تعذر تعديل الطلب: ' + err.message });
  }
});

// تحديث تكلفة الشحن الفعلية
router.put('/:id/shipping-cost', requireAuth, requireActiveSubscription, async (req, res) => {
  const { shipping_cost_actual } = req.body;
  const cost = parseFloat(shipping_cost_actual);
  if (isNaN(cost) || cost < 0) return res.status(400).json({ error: 'تكلفة شحن غير صالحة' });

  const order = await db.get('SELECT * FROM orders WHERE id = $1', [req.params.id]);
  if (!order) return res.status(404).json({ error: 'الطلب غير موجود' });
  if (!checkResourceOwnership(order.user_id, req, res)) return;

  await db.query('UPDATE orders SET shipping_cost_actual = $1 WHERE id = $2', [cost, req.params.id]);
  res.json({ success: true, shipping_cost_actual: cost });
});

// حذف طلب
router.delete('/:id', requireAuth, requireActiveSubscription, async (req, res) => {
  const order = await db.get('SELECT * FROM orders WHERE id = $1', [req.params.id]);
  if (!order) return res.status(404).json({ error: 'الطلب غير موجود' });
  if (!checkResourceOwnership(order.user_id, req, res)) return;

  try {
    await db.transaction(async (trx) => {
      if (['قيد المعالجة', 'قيد التوصيل', 'تم التسليم'].includes(order.status)) {
        const items = typeof order.items === 'string' ? JSON.parse(order.items || '[]') : (order.items || []);
        for (const item of items) {
          await incrementStock(item, trx);
        }
      }
      await trx.query('DELETE FROM orders WHERE id = $1', [req.params.id]);
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'تعذر حذف الطلب: ' + err.message });
  }
});

// سجل تتبع حالات الطلب
router.get('/:id/history', requireAuth, async (req, res) => {
  const order = await db.get('SELECT user_id FROM orders WHERE id = $1', [req.params.id]);
  if (!order) return res.status(404).json({ error: 'الطلب غير موجود' });
  if (!checkResourceOwnership(order.user_id, req, res)) return;

  const history = await db.all('SELECT * FROM order_status_history WHERE order_id = $1 ORDER BY created_at ASC', [req.params.id]);
  res.json(history);
});

router.get('/profit-30d', requireAuth, async (req, res) => {
  try {
  const userId = req.user.role === "admin" ? null : req.user.id;
  
  let ordersQuery = "SELECT * FROM orders WHERE status = 'تم التسليم' AND created_at >= $1";
  const thirtyDaysAgo = new Date(Date.now() - 30*24*60*60*1000).toISOString();
  let params = [thirtyDaysAgo];
  if (userId) {
    ordersQuery += " AND user_id = $2";
    params.push(userId);
  }

  const orders = await db.all(ordersQuery, params);
  
  let revenue = 0;
  let cost_of_goods = 0;
  let shipping_cost = 0;
  let units_sold = 0;
  
  const productSales = {};

  for (const o of orders) {
    revenue += Number(o.subtotal) || 0;
    
    let items = [];
    try {
      items = JSON.parse(o.items || "[]");
    } catch (e) {}

    for (const item of items) {
      const qty = Number(item.qty) || 0;
      const cost = Number(item.cost_price) || 0;
      const price = Number(item.price) || 0;
      
      cost_of_goods += cost * qty;
      units_sold += qty;
      
      if (!productSales[item.id]) {
        productSales[item.id] = { name: item.name, qty: 0, revenue: 0, cost: 0 };
      }
      productSales[item.id].qty += qty;
      productSales[item.id].revenue += price * qty;
      productSales[item.id].cost += cost * qty;
    }
  }

  let lostShippingQuery = "SELECT COALESCE(SUM(COALESCE(NULLIF(shipping_cost_actual, 0), delivery_price)), 0) AS lost FROM orders WHERE (status IN ('ملغي', 'مرتجع', 'تعذر التوصيل')) AND shipping_cost_incurred = 1 AND created_at >= $1";
  if (userId) lostShippingQuery += " AND user_id = $2";
  
  const lostRes = await db.get(lostShippingQuery, params);
  shipping_cost += Number(lostRes.lost) || 0;

  const top_products = Object.values(productSales)
    .sort((a, b) => (b.revenue - b.cost) - (a.revenue - a.cost))
    .slice(0, 10)
    .map(p => ({
      name: p.name,
      qty: p.qty,
      revenue: p.revenue,
      profit: p.revenue - p.cost
    }));

  res.json({
    period_days: 30,
    delivered_orders: orders.length,
    units_sold,
    revenue,
    cost_of_goods,
    shipping_cost,
    net_profit: revenue - cost_of_goods - shipping_cost,
    top_products
  });
  } catch (err) { res.status(500).json({error: err.message}); }
});

module.exports = router;
