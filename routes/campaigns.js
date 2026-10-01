const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const rateLimit = require('express-rate-limit');
const { normalizeSource, toMs, PLATFORMS } = require('../utils/source');

const router = express.Router();

// 1. تحليلات وأداء الحملات الإعلانية
router.get('/analytics', requireAuth, async (req, res) => {
  try {
    const userId = req.user.role === 'admin' ? null : req.user.id;

    let orders, adSpends;
    if (userId !== null) {
      orders = await db.all('SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
      adSpends = await db.all('SELECT * FROM campaign_ad_spend WHERE user_id = $1 ORDER BY spend_date DESC, id DESC', [userId]);
    } else {
      orders = await db.all('SELECT * FROM orders ORDER BY created_at DESC');
      adSpends = await db.all('SELECT * FROM campaign_ad_spend ORDER BY spend_date DESC, id DESC');
    }

    const campaignsMap = new Map();

    function getCampaignKey(orderOrSpend) {
      const camp = (orderOrSpend.utm_campaign || orderOrSpend.campaign_name || '').trim();
      return camp || 'مباشر / بدون إعلان (Organic)';
    }

    function initCampaignEntry(name, defaultSource = '') {
      return {
        campaign_name: name,
        source: defaultSource || 'direct',
        ad_spend: 0,
        registered_orders: 0,
        processing_orders: 0,
        shipping_orders: 0,
        delivered_orders: 0,
        cancelled_orders: 0,
        delivered_revenue: 0,
        delivered_cogs: 0,
        returned_shipping_loss: 0,
        gross_profit: 0,
        net_profit: 0,
        lead_cpa: 0,
        real_cpa: 0,
        real_roas: 0,
        delivery_rate: 0,
      };
    }

    for (const spend of adSpends) {
      const key = getCampaignKey(spend);
      if (!campaignsMap.has(key)) {
        campaignsMap.set(key, initCampaignEntry(key, spend.source));
      }
      const entry = campaignsMap.get(key);
      entry.ad_spend += parseFloat(spend.spend_amount) || 0;
      if (spend.source && entry.source === 'direct') {
        entry.source = spend.source;
      }
    }

    const deliveredProductsMap = new Map();
    const cancelledProductsMap = new Map();
    const statusBreakdown = {
      delivered: 0,
      processing: 0,
      shipping: 0,
      failed_delivery: 0,
      returned: 0,
      cancelled: 0,
    };

    for (const order of orders) {
      const key = getCampaignKey(order);
      if (!campaignsMap.has(key)) {
        campaignsMap.set(key, initCampaignEntry(key, order.utm_source));
      }
      const entry = campaignsMap.get(key);
      if (order.utm_source && entry.source === 'direct') {
        entry.source = order.utm_source;
      }

      entry.registered_orders += 1;

      if (order.status === 'قيد المعالجة') {
        entry.processing_orders += 1;
        statusBreakdown.processing += 1;
      } else if (order.status === 'قيد التوصيل') {
        entry.shipping_orders += 1;
        statusBreakdown.shipping += 1;
      } else if (order.status === 'تم التسليم') {
        entry.delivered_orders += 1;
        entry.delivered_revenue += parseFloat(order.subtotal);
        statusBreakdown.delivered += 1;

        try {
          const items = typeof order.items === 'string' ? JSON.parse(order.items || '[]') : (order.items || []);
          for (const item of items) {
            entry.delivered_cogs += (parseFloat(item.cost_price) || 0) * (parseInt(item.qty, 10) || 1);
            const pName = item.name || 'منتج';
            deliveredProductsMap.set(pName, (deliveredProductsMap.get(pName) || 0) + (parseInt(item.qty, 10) || 1));
          }
        } catch {}
      } else if (order.status === 'تعذر التوصيل' || order.status === 'مرتجع') {
        entry.cancelled_orders += 1;
        if (order.status === 'تعذر التوصيل') statusBreakdown.failed_delivery += 1;
        if (order.status === 'مرتجع') statusBreakdown.returned += 1;
        
        if (order.shipping_cost_incurred) {
          entry.returned_shipping_loss += (parseFloat(order.shipping_cost_actual) || parseFloat(order.delivery_price)) || 0;
        }

        try {
          const items = typeof order.items === 'string' ? JSON.parse(order.items || '[]') : (order.items || []);
          for (const item of items) {
            const pName = item.name || 'منتج';
            cancelledProductsMap.set(pName, (cancelledProductsMap.get(pName) || 0) + (parseInt(item.qty, 10) || 1));
          }
        } catch {}
      } else if (order.status === 'ملغي') {
        entry.cancelled_orders += 1;
        statusBreakdown.cancelled += 1;
        if (order.shipping_cost_incurred) {
          entry.returned_shipping_loss += (parseFloat(order.shipping_cost_actual) || parseFloat(order.delivery_price)) || 0;
        }

        try {
          const items = typeof order.items === 'string' ? JSON.parse(order.items || '[]') : (order.items || []);
          for (const item of items) {
            const pName = item.name || 'منتج';
            cancelledProductsMap.set(pName, (cancelledProductsMap.get(pName) || 0) + (parseInt(item.qty, 10) || 1));
          }
        } catch {}
      }
    }

    let totalAdSpend = 0;
    let totalDeliveredRevenue = 0;
    let totalDeliveredCogs = 0;
    let totalReturnedShippingLoss = 0;
    let totalRegisteredOrders = 0;
    let totalDeliveredOrders = 0;

    const campaignsList = Array.from(campaignsMap.values()).map((c) => {
      c.gross_profit = c.delivered_revenue - c.delivered_cogs;
      c.net_profit = c.gross_profit - c.returned_shipping_loss - c.ad_spend;

      c.lead_cpa = c.registered_orders > 0 ? c.ad_spend / c.registered_orders : 0;
      c.real_cpa = c.delivered_orders > 0 ? c.ad_spend / c.delivered_orders : 0;
      c.real_roas = c.ad_spend > 0 ? c.delivered_revenue / c.ad_spend : 0;

      const finishedOrders = c.delivered_orders + c.cancelled_orders;
      c.delivery_rate = finishedOrders > 0 ? (c.delivered_orders / finishedOrders) * 100 : 0;

      totalAdSpend += c.ad_spend;
      totalDeliveredRevenue += c.delivered_revenue;
      totalDeliveredCogs += c.delivered_cogs;
      totalReturnedShippingLoss += c.returned_shipping_loss;
      totalRegisteredOrders += c.registered_orders;
      totalDeliveredOrders += c.delivered_orders;

      return c;
    });

    campaignsList.sort((a, b) => b.delivered_revenue - a.delivered_revenue || b.registered_orders - a.registered_orders);

    const totalGrossProfit = totalDeliveredRevenue - totalDeliveredCogs;
    const totalNetProfit = totalGrossProfit - totalReturnedShippingLoss - totalAdSpend;
    const overallRealRoas = totalAdSpend > 0 ? totalDeliveredRevenue / totalAdSpend : 0;

    const dailyMap = new Map();
    const now = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      dailyMap.set(dateStr, { date: dateStr, sales: 0, profit: 0, spend: 0, orders: 0 });
    }

    for (const order of orders) {
      let dateStr = '';
      if (order.created_at) {
        const dObj = new Date(order.created_at);
        dateStr = `${dObj.getFullYear()}-${String(dObj.getMonth() + 1).padStart(2, '0')}-${String(dObj.getDate()).padStart(2, '0')}`;
      }
      if (dailyMap.has(dateStr)) {
        const item = dailyMap.get(dateStr);
        item.orders += 1;
        if (order.status === 'تم التسليم') {
          item.sales += parseFloat(order.subtotal);
          let cogs = 0;
          try {
            const items = typeof order.items === 'string' ? JSON.parse(order.items || '[]') : (order.items || []);
            for (const it of items) cogs += (parseFloat(it.cost_price) || 0) * (parseInt(it.qty, 10) || 1);
          } catch {}
          item.profit += (parseFloat(order.subtotal) - cogs);
        } else if (['ملغي', 'مرتجع', 'تعذر التوصيل'].includes(order.status) && order.shipping_cost_incurred) {
          item.profit -= (parseFloat(order.shipping_cost_actual) || parseFloat(order.delivery_price)) || 0;
        }
      }
    }

    for (const spend of adSpends) {
      let dateStr = '';
      if (spend.spend_date) {
        const dObj = new Date(spend.spend_date);
        dateStr = `${dObj.getFullYear()}-${String(dObj.getMonth() + 1).padStart(2, '0')}-${String(dObj.getDate()).padStart(2, '0')}`;
      }
      if (dailyMap.has(dateStr)) {
        const item = dailyMap.get(dateStr);
        const amt = parseFloat(spend.spend_amount) || 0;
        item.spend += amt;
        item.profit -= amt;
      }
    }

    const dailyTrends = Array.from(dailyMap.values());
    const overallRealCpa = totalDeliveredOrders > 0 ? totalAdSpend / totalDeliveredOrders : (totalRegisteredOrders > 0 ? totalAdSpend / totalRegisteredOrders : 0);

    const topDeliveredProducts = Array.from(deliveredProductsMap.entries())
      .map(([name, qty]) => ({ name, qty }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 6);

    const topCancelledProducts = Array.from(cancelledProductsMap.entries())
      .map(([name, qty]) => ({ name, qty }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 6);

    res.json({
      summary: {
        total_ad_spend: totalAdSpend,
        total_delivered_revenue: totalDeliveredRevenue,
        total_delivered_cogs: totalDeliveredCogs,
        total_returned_shipping_loss: totalReturnedShippingLoss,
        total_gross_profit: totalGrossProfit,
        total_net_profit: totalNetProfit,
        overall_real_roas: overallRealRoas,
        overall_real_cpa: overallRealCpa,
        total_registered_orders: totalRegisteredOrders,
        total_delivered_orders: totalDeliveredOrders,
      },
      status_breakdown: statusBreakdown,
      top_delivered_ad_products: topDeliveredProducts,
      top_cancelled_ad_products: topCancelledProducts,
      campaigns: campaignsList,
      recent_spends: adSpends.slice(0, 30),
      daily_trends: dailyTrends,
    });
  } catch (err) {
    res.status(500).json({ error: 'حدث خطأ أثناء إعداد تقرير الحملات: ' + err.message });
  }
});


// ------------------------------------------------------------------
// تتبع الزيارات القادمة من الإعلانات (عام - يُستدعى من واجهة الزبون)
// ------------------------------------------------------------------
const trackLimiter = rateLimit({ windowMs: 60 * 1000, max: 60, standardHeaders: true, legacyHeaders: false });

async function resolveStoreId(raw) {
  const v = String(raw ?? 'default').trim();
  if (/^\d+$/.test(v) && v !== '1') return parseInt(v, 10);
  if (v === 'default' || v === '1') {
    if (process.env.MAIN_STORE_USER_ID) return parseInt(process.env.MAIN_STORE_USER_ID, 10);
    const u = await db.get("SELECT id FROM users WHERE role = 'admin' ORDER BY id ASC LIMIT 1");
    return u ? u.id : null;
  }
  const u = await db.get('SELECT id FROM users WHERE store_slug = $1', [v]);
  return u ? u.id : null;
}

router.post('/track', trackLimiter, async (req, res) => {
  try {
    const ua = String(req.headers['user-agent'] || '');
    if (/bot|crawler|spider|facebookexternalhit|preview|headless/i.test(ua)) return res.json({ success: true, ignored: true });

    const storeId = await resolveStoreId(req.body.store_id);
    if (!storeId) return res.json({ success: false });

    const source = normalizeSource(req.body.utm_source) || 'direct';
    const sessionId = String(req.body.session_id || '').slice(0, 100);
    const campaign = String(req.body.utm_campaign || '').trim().slice(0, 255);
    const medium = String(req.body.utm_medium || '').trim().slice(0, 255);
    const content = String(req.body.utm_content || '').trim().slice(0, 255);

    // لا نحسب نفس الزائر مرتين في نفس الجلسة
    if (sessionId) {
      const dup = await db.get('SELECT id FROM ad_visits WHERE user_id = $1 AND session_id = $2 AND source = $3', [storeId, sessionId, source]);
      if (dup) return res.json({ success: true, duplicate: true });
    }
    await db.query(
      'INSERT INTO ad_visits (user_id, source, campaign, medium, content, session_id) VALUES ($1, $2, $3, $4, $5, $6)',
      [storeId, source, campaign, medium, content, sessionId]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

// ------------------------------------------------------------------
// العدّاد الحي لكل منصة: زيارات + مشتريات + إنفاق منذ آخر تصفير
// ------------------------------------------------------------------
const RESET_PREFIX = 'ad_counter_reset_';
const CANCELLED = ['ملغي', 'مرتجع', 'تعذر التوصيل'];

async function getResetMap(userId) {
  const rows = await db.all('SELECT key, value FROM settings WHERE user_id = $1 AND key LIKE $2', [userId, RESET_PREFIX + '%']);
  const map = {};
  for (const r of rows) map[r.key.slice(RESET_PREFIX.length)] = parseInt(r.value, 10) || 0;
  return map;
}

router.get('/platform-live', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const resets = await getResetMap(userId);
    const globalReset = resets['all'] || 0;
    const resetFor = (src) => Math.max(globalReset, resets[src] || 0);

    const visits = await db.all('SELECT source, created_at FROM ad_visits WHERE user_id = $1', [userId]);
    const orders = await db.all('SELECT utm_source, status, subtotal, created_at FROM orders WHERE user_id = $1', [userId]);
    const spends = await db.all('SELECT source, spend_amount, spend_date, created_at FROM campaign_ad_spend WHERE user_id = $1', [userId]);

    const stats = {};
    const ensure = (src) => (stats[src] = stats[src] || { source: src, visits: 0, orders: 0, delivered: 0, revenue: 0, spend: 0, reset_at: resetFor(src) });
    PLATFORMS.filter((p) => p !== 'other').forEach(ensure);

    for (const v of visits) {
      const src = normalizeSource(v.source) || 'direct';
      const st = ensure(src);
      if (toMs(v.created_at) >= resetFor(src)) st.visits += 1;
    }
    for (const o of orders) {
      const src = normalizeSource(o.utm_source) || 'direct';
      const st = ensure(src);
      if (toMs(o.created_at) < resetFor(src)) continue;
      if (CANCELLED.includes(o.status)) continue;
      st.orders += 1;
      st.revenue += parseFloat(o.subtotal) || 0;
      if (o.status === 'تم التسليم') st.delivered += 1;
    }
    for (const sp of spends) {
      const src = normalizeSource(sp.source) || 'other';
      const st = ensure(src);
      // الإنفاق المُسجَّل بعد لحظة التصفير فقط
      if (toMs(sp.created_at) >= resetFor(src)) st.spend += parseFloat(sp.spend_amount) || 0;
    }

    const list = Object.values(stats).map((s) => ({
      ...s,
      conversion_rate: s.visits > 0 ? (s.orders / s.visits) * 100 : 0,
      cpa: s.orders > 0 && s.spend > 0 ? s.spend / s.orders : 0,
    }));
    list.sort((a, b) => b.orders - a.orders || b.visits - a.visits);
    res.json({ platforms: list, server_time: Date.now() });
  } catch (err) {
    res.status(500).json({ error: 'تعذر جلب العدّاد: ' + err.message });
  }
});

// تصفير عدّاد منصة واحدة (أو الكل) — يبدأ العدّ التلقائي من الصفر
router.post('/platform-reset', requireAuth, async (req, res) => {
  try {
    const src = req.body.source === 'all' ? 'all' : normalizeSource(req.body.source);
    if (!src) return res.status(400).json({ error: 'المنصة مطلوبة' });
    const key = RESET_PREFIX + src;
    const now = String(Date.now());
    const existing = await db.get('SELECT id FROM settings WHERE user_id = $1 AND key = $2', [req.user.id, key]);
    if (existing) await db.query('UPDATE settings SET value = $1 WHERE id = $2', [now, existing.id]);
    else await db.query('INSERT INTO settings (user_id, key, value) VALUES ($1, $2, $3)', [req.user.id, key, now]);
    res.json({ success: true, reset_at: Number(now) });
  } catch (err) {
    res.status(500).json({ error: 'تعذر التصفير: ' + err.message });
  }
});

// 2. تسجيل مصاريف إعلانية جديدة لحملة
router.post(
  '/spend',
  requireAuth,
  [
    body('campaign_name').trim().notEmpty().withMessage('اسم الحملة مطلوب'),
    body('spend_amount').isFloat({ min: 0.01 }).withMessage('المبلغ يجب أن يكون أكبر من 0'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }

    const { campaign_name, source, spend_amount, spend_date, notes } = req.body;
    let date = spend_date;
    if (!date) {
      const dObj = new Date();
      date = `${dObj.getFullYear()}-${String(dObj.getMonth() + 1).padStart(2, '0')}-${String(dObj.getDate()).padStart(2, '0')}`;
    }

    try {
      const result = await db.query(
        `INSERT INTO campaign_ad_spend (user_id, campaign_name, source, spend_amount, spend_date, notes)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [req.user.id, campaign_name.trim(), (source || 'facebook').trim(), parseFloat(spend_amount), date, (notes || '').trim()]
      );

      res.status(201).json({ success: true, id: result.rows[0].id });
    } catch (err) {
      res.status(500).json({ error: 'تعذر تسجيل المصاريف: ' + err.message });
    }
  }
);

// 2.5 تعديل سجل مصاريف إعلانية
router.put(
  '/spend/:id',
  requireAuth,
  [
    body('campaign_name').trim().notEmpty().withMessage('اسم الحملة مطلوب'),
    body('spend_amount').isFloat({ min: 0.01 }).withMessage('المبلغ يجب أن يكون أكبر من 0'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }
    try {
      const spend = await db.get('SELECT user_id, spend_date FROM campaign_ad_spend WHERE id = $1', [req.params.id]);
      if (!spend) return res.status(404).json({ error: 'السجل غير موجود' });
      if (spend.user_id !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'لا يمكنك تعديل سجل لا ينتمي لحسابك.' });
      }
      const { campaign_name, source, spend_amount, spend_date, notes } = req.body;
      await db.query(
        `UPDATE campaign_ad_spend
            SET campaign_name = $1, source = $2, spend_amount = $3, spend_date = COALESCE($4, spend_date), notes = $5
          WHERE id = $6`,
        [campaign_name.trim(), (source || 'facebook').trim(), parseFloat(spend_amount), spend_date || null, (notes || '').trim(), req.params.id]
      );
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'تعذر تعديل السجل: ' + err.message });
    }
  }
);

// 3. حذف سجل مصاريف إعلانية
router.delete('/spend/:id', requireAuth, async (req, res) => {
  try {
    const spend = await db.get('SELECT user_id FROM campaign_ad_spend WHERE id = $1', [req.params.id]);
    if (!spend) return res.status(404).json({ error: 'السجل غير موجود' });
    if (spend.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'لا يمكنك حذف سجل لا ينتمي لحسابك.' });
    }
    await db.query('DELETE FROM campaign_ad_spend WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'تعذر الحذف' });
  }
});

module.exports = router;
