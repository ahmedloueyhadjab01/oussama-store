const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { ensureFinancialArchive } = require('../db');

const router = express.Router();

const socialKeys = ['social_whatsapp', 'social_instagram', 'social_facebook', 'social_tiktok', 'social_telegram'];

// عام: جلب روابط التواصل الاجتماعي لمتجر معيّن (?store_id=X)
router.get('/social', async (req, res) => {
  const storeId = req.query.store_id ? parseInt(req.query.store_id, 10) : null;

  const result = {};
  for (const key of socialKeys) {
    let row;
    if (storeId) {
      row = await db.get('SELECT value FROM settings WHERE user_id = $1 AND key = $2', [storeId, key]);
    }
    // fallback إلى الإعدادات العامة (user_id = NULL)
    if (!row) {
      row = await db.get('SELECT value FROM settings WHERE user_id IS NULL AND key = $1', [key]);
    }
    result[key] = row ? row.value : '';
  }
  res.json(result);
});

// تاجر: تحديث روابط التواصل الاجتماعي (خاصة بالتاجر)
router.put('/social', requireAuth, async (req, res) => {
  try {
    await db.transaction(async (trx) => {
      for (const key of socialKeys) {
        if (req.body[key] !== undefined) {
          const val = String(req.body[key]).trim();
          const existing = await trx.get('SELECT id FROM settings WHERE user_id = $1 AND key = $2', [req.user.id, key]);
          if (existing) {
            await trx.query('UPDATE settings SET value = $1 WHERE id = $2', [val, existing.id]);
          } else {
            await trx.query('INSERT INTO settings (user_id, key, value) VALUES ($1, $2, $3)', [req.user.id, key, val]);
          }
        }
      }
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'تعذر حفظ الإعدادات: ' + err.message });
  }
});

// تاجر: إعادة تعيين الإحصائيات (حذف الطلبات المؤرشفة + صفر الأرشيف المالي) - بيانات التاجر فقط
router.post('/reset-stats', requireAuth, async (req, res) => {
  const userId = req.user.id;
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: 'كلمة المرور مطلوبة للتأكيد' });

  const user = await db.get('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
  if (!user) return res.status(404).json({ error: 'المستخدم غير موجود' });

  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) return res.status(403).json({ error: 'كلمة المرور غير صحيحة' });

  try {
    await db.transaction(async (trx) => {
      const activeOrders = await trx.all("SELECT items FROM orders WHERE user_id = $1 AND status IN ('قيد المعالجة', 'قيد التوصيل')", [req.user.id]);
      for (const order of activeOrders) {
        const items = typeof order.items === 'string' ? JSON.parse(order.items || '[]') : (order.items || []);
        for (const item of items) {
          if (item.variant_id) {
            await trx.query('UPDATE product_variants SET stock = stock + $1 WHERE id = $2', [item.qty, item.variant_id]);
          } else {
            await trx.query('UPDATE products SET stock = stock + $1 WHERE id = $2', [item.qty, item.id]);
          }
        }
      }
      await trx.query('DELETE FROM orders WHERE user_id = $1', [req.user.id]);
      await trx.query('DELETE FROM campaign_ad_spend WHERE user_id = $1', [req.user.id]);
      await ensureFinancialArchive(req.user.id, trx.client);
      await trx.query('UPDATE financial_archive SET archived_sales = 0, archived_cogs = 0, archived_shipping_cost = 0 WHERE user_id = $1', [req.user.id]);
    });
    res.json({ success: true, message: 'تم مسح الإحصائيات والطلبات بنجاح.' });
  } catch (err) {
    res.status(500).json({ error: 'تعذرت إعادة التعيين: ' + err.message });
  }
});

// تاجر: إعادة تعيين المتجر بالكامل (حذف بيانات التاجر فقط - لا تمس بيانات تجار آخرين)
router.post('/reset-store', requireAuth, async (req, res) => {
  const userId = req.user.id;
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: 'كلمة المرور مطلوبة للتأكيد' });

  const user = await db.get('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
  if (!user) return res.status(404).json({ error: 'المستخدم غير موجود' });

  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) return res.status(403).json({ error: 'كلمة المرور غير صحيحة' });

  try {
    await db.transaction(async (trx) => {
      const activeOrders = await trx.all("SELECT items FROM orders WHERE user_id = $1 AND status IN ('قيد المعالجة', 'قيد التوصيل')", [req.user.id]);
      for (const order of activeOrders) {
        const items = typeof order.items === 'string' ? JSON.parse(order.items || '[]') : (order.items || []);
        for (const item of items) {
          if (item.variant_id) {
            await trx.query('UPDATE product_variants SET stock = stock + $1 WHERE id = $2', [item.qty, item.variant_id]);
          } else {
            await trx.query('UPDATE products SET stock = stock + $1 WHERE id = $2', [item.qty, item.id]);
          }
        }
      }
      await trx.query('DELETE FROM orders WHERE user_id = $1', [req.user.id]);
      await trx.query('DELETE FROM campaign_ad_spend WHERE user_id = $1', [req.user.id]);
      await trx.query('DELETE FROM stock_restocks WHERE product_id IN (SELECT id FROM products WHERE user_id = $1)', [req.user.id]);
      await trx.query('DELETE FROM variant_restocks WHERE variant_id IN (SELECT pv.id FROM product_variants pv JOIN products p ON pv.product_id = p.id WHERE p.user_id = $1)', [req.user.id]);
      await trx.query('DELETE FROM product_variants WHERE product_id IN (SELECT id FROM products WHERE user_id = $1)', [req.user.id]);
      await trx.query('DELETE FROM products WHERE user_id = $1', [req.user.id]);
      await trx.query('DELETE FROM categories WHERE user_id = $1', [req.user.id]);
      await trx.query('DELETE FROM settings WHERE user_id = $1', [req.user.id]);
      await ensureFinancialArchive(req.user.id, trx.client);
      await trx.query('UPDATE financial_archive SET archived_sales = 0, archived_cogs = 0, archived_shipping_cost = 0 WHERE user_id = $1', [req.user.id]);
    });
    res.json({ success: true, message: 'تمت إعادة تعيين متجرك بالكامل مع الاحتفاظ بأسعار التوصيل ✅' });
  } catch (err) {
    res.status(500).json({ error: 'تعذرت إعادة التعيين: ' + err.message });
  }
});


// حفظ بيانات المتجر
router.put("/", requireAuth, async (req, res) => {
  const { store_name, store_description, contact_email, currency, language } = req.body;
  const contact_phone = req.body.contact_phone ?? req.body.phone;
  try {
    await db.query(
      "UPDATE users SET store_name = COALESCE($1, store_name), phone = COALESCE($3, phone) WHERE id = $2",
      [store_name, req.user.id, contact_phone]
    );

    const settingsObj = { store_description, contact_email, contact_phone, currency, language };
    for (const [key, value] of Object.entries(settingsObj)) {
      if (value !== undefined) {
        const existing = await db.get("SELECT id FROM settings WHERE user_id = $1 AND key = $2", [req.user.id, key]);
        if (existing) {
          await db.query("UPDATE settings SET value = $1 WHERE user_id = $2 AND key = $3", [value, req.user.id, key]);
        } else {
          await db.query("INSERT INTO settings (user_id, key, value) VALUES ($1, $2, $3)", [req.user.id, key, value]);
        }
      }
    }

    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Profile endpoints
router.get("/profile", requireAuth, async (req, res) => {
  try {
    const user = await db.get("SELECT name, email, store_name, store_slug FROM users WHERE id = $1", [req.user.id]);
    res.json(user);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

router.put("/profile", requireAuth, async (req, res) => {
  const { name, store_name } = req.body;
  try {
    await db.query("UPDATE users SET name = COALESCE($1, name), store_name = COALESCE($2, store_name) WHERE id = $3", [name, store_name, req.user.id]);
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
