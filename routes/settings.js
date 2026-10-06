const { getTargetUserId } = require('../utils/store');
const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { ensureFinancialArchive } = require('../db');

const router = express.Router();

const socialKeys = ['social_whatsapp', 'social_instagram', 'social_facebook', 'social_tiktok', 'social_telegram'];

// Ø¹Ø§Ù…: Ø¬Ù„Ø¨ Ø±ÙˆØ§Ø¨Ø· Ø§Ù„ØªÙˆØ§ØµÙ„ Ø§Ù„Ø§Ø¬ØªÙ…Ø§Ø¹ÙŠ Ù„Ù…ØªØ¬Ø± Ù…Ø¹ÙŠÙ‘Ù† (?store_id=X)
router.get('/social', async (req, res) => {
  const storeId = req.query.store_id ? parseInt(req.query.store_id, 10) : null;

  const result = {};
  for (const key of socialKeys) {
    let row;
    if (storeId) {
      row = await db.get('SELECT value FROM settings WHERE user_id = $1 AND key = $2', [storeId, key]);
    }
    // fallback Ø¥Ù„Ù‰ Ø§Ù„Ø¥Ø¹Ø¯Ø§Ø¯Ø§Øª Ø§Ù„Ø¹Ø§Ù…Ø© (user_id = NULL)
    if (!row) {
      row = await db.get('SELECT value FROM settings WHERE user_id IS NULL AND key = $1', [key]);
    }
    result[key] = row ? row.value : '';
  }
  res.json(result);
});

// ØªØ§Ø¬Ø±: ØªØ­Ø¯ÙŠØ« Ø±ÙˆØ§Ø¨Ø· Ø§Ù„ØªÙˆØ§ØµÙ„ Ø§Ù„Ø§Ø¬ØªÙ…Ø§Ø¹ÙŠ (Ø®Ø§ØµØ© Ø¨Ø§Ù„ØªØ§Ø¬Ø±)
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
    res.status(500).json({ error: 'ØªØ¹Ø°Ø± Ø­ÙØ¸ Ø§Ù„Ø¥Ø¹Ø¯Ø§Ø¯Ø§Øª: ' + err.message });
  }
});

// ØªØ§Ø¬Ø±: Ø¥Ø¹Ø§Ø¯Ø© ØªØ¹ÙŠÙŠÙ† Ø§Ù„Ø¥Ø­ØµØ§Ø¦ÙŠØ§Øª (Ø­Ø°Ù Ø§Ù„Ø·Ù„Ø¨Ø§Øª Ø§Ù„Ù…Ø¤Ø±Ø´ÙØ© + ØµÙØ± Ø§Ù„Ø£Ø±Ø´ÙŠÙ Ø§Ù„Ù…Ø§Ù„ÙŠ) - Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„ØªØ§Ø¬Ø± ÙÙ‚Ø·
function getTargetUserId(user) {
  if (user.role !== 'admin' || !process.env.MAIN_STORE_USER_ID) return user.id;
  const mainId = parseInt(process.env.MAIN_STORE_USER_ID, 10);
  return isNaN(mainId) ? user.id : mainId;
}

router.post('/reset-stats', requireAuth, async (req, res) => {
  const targetUserId = getTargetUserId(req.user);
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: 'كلمة المرور مطلوبة' });

  const user = await db.get('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
  if (!user) return res.status(404).json({ error: 'المستخدم غير موجود' });

  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) return res.status(403).json({ error: 'كلمة المرور غير صحيحة' });

  try {
    await db.transaction(async (trx) => {
      await trx.query('DELETE FROM order_status_history WHERE order_id IN (SELECT id FROM orders WHERE user_id = $1)', [targetUserId]);
      await trx.query('DELETE FROM orders WHERE user_id = $1', [targetUserId]);
      await trx.query('DELETE FROM campaign_ad_spend WHERE user_id = $1', [targetUserId]);
      await trx.query('DELETE FROM ad_visits WHERE user_id = $1', [targetUserId]);

      await ensureFinancialArchive(targetUserId, trx.client);
      await trx.query('UPDATE financial_archive SET archived_sales = 0, archived_cogs = 0, archived_shipping_cost = 0 WHERE user_id = $1', [targetUserId]);
    });
    res.json({ success: true, message: 'تم تصفير الأرقام بنجاح.' });
  } catch (err) {
    res.status(500).json({ error: 'خطأ: ' + err.message });
  }
});

router.post('/reset-store', requireAuth, async (req, res) => {
  const targetUserId = getTargetUserId(req.user);
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: 'كلمة المرور مطلوبة' });

  const user = await db.get('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
  if (!user) return res.status(404).json({ error: 'المستخدم غير موجود' });

  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) return res.status(403).json({ error: 'كلمة المرور غير صحيحة' });

  try {
    await db.transaction(async (trx) => {
      // 1. Delete Orders and Stats
      await trx.query('DELETE FROM order_status_history WHERE order_id IN (SELECT id FROM orders WHERE user_id = $1)', [targetUserId]);
      await trx.query('DELETE FROM orders WHERE user_id = $1', [targetUserId]);
      
      // 2. Delete Ads and Finance
      await trx.query('DELETE FROM campaign_ad_spend WHERE user_id = $1', [targetUserId]);
      await trx.query('DELETE FROM ad_visits WHERE user_id = $1', [targetUserId]);
      await ensureFinancialArchive(targetUserId, trx.client);
      await trx.query('UPDATE financial_archive SET archived_sales = 0, archived_cogs = 0, archived_shipping_cost = 0 WHERE user_id = $1', [targetUserId]);

      // 3. Delete Products and Inventory
      await trx.query('DELETE FROM stock_restocks WHERE product_id IN (SELECT id FROM products WHERE user_id = $1)', [targetUserId]);
      await trx.query('DELETE FROM variant_restocks WHERE variant_id IN (SELECT pv.id FROM product_variants pv JOIN products p ON pv.product_id = p.id WHERE p.user_id = $1)', [targetUserId]);
      await trx.query('DELETE FROM product_variants WHERE product_id IN (SELECT id FROM products WHERE user_id = $1)', [targetUserId]);
      await trx.query('DELETE FROM products WHERE user_id = $1', [targetUserId]);

      // 4. Delete Categories safely
      await trx.query('DELETE FROM categories WHERE user_id = $1 AND parent_id IS NOT NULL', [targetUserId]);
      await trx.query('DELETE FROM categories WHERE user_id = $1', [targetUserId]);
      
      // 5. Delete settings
      await trx.query('DELETE FROM settings WHERE user_id = $1', [targetUserId]);
    });
    res.json({ success: true, message: 'تم تصفير المتجر بالكامل بنجاح.' });
  } catch (err) {
    res.status(500).json({ error: 'خطأ: ' + err.message });
  }
});


// ... 
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

