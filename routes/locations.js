const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const communesData = require('../data/communes.json');

const router = express.Router();

// عام: كل الولايات مع أسعار التوصيل الحالية
router.get('/wilayas', async (req, res) => {
  const rows = await db.all('SELECT * FROM delivery_rates ORDER BY wilaya_code');
  res.json(
    rows.map((r) => ({
      ...r,
      home_price: parseFloat(r.home_price) || 0,
      desk_price: parseFloat(r.desk_price) || 0,
    }))
  );
});

// عام: بلديات ولاية معينة
router.get('/communes/:wilayaCode', (req, res) => {
  const code = parseInt(req.params.wilayaCode, 10);
  const communes = communesData
    .filter((c) => c.wilaya_code === code)
    .map((c) => c.name)
    .sort((a, b) => a.localeCompare(b, 'ar'));
  res.json(communes);
});

// أدمن: تحديث سعر التوصيل لولاية واحدة
router.put(
  '/wilayas/:code',
  requireAuth,
  requireAdmin,
  [
    body('home_price').isFloat({ min: 0 }).withMessage('سعر التوصيل للمنزل يجب أن يكون رقمًا موجبًا'),
    body('desk_price').isFloat({ min: 0 }).withMessage('سعر التوصيل للمكتب يجب أن يكون رقمًا موجبًا'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }
    const code = parseInt(req.params.code, 10);
    const row = await db.get('SELECT * FROM delivery_rates WHERE wilaya_code = $1', [code]);
    if (!row) return res.status(404).json({ error: 'الولاية غير موجودة' });

    await db.query('UPDATE delivery_rates SET home_price = $1, desk_price = $2 WHERE wilaya_code = $3', [
      parseFloat(req.body.home_price),
      parseFloat(req.body.desk_price),
      code,
    ]);

    const updated = await db.get('SELECT * FROM delivery_rates WHERE wilaya_code = $1', [code]);
    res.json({
      ...updated,
      home_price: parseFloat(updated.home_price) || 0,
      desk_price: parseFloat(updated.desk_price) || 0,
    });
  }
);

// أدمن: تحديث جماعي
router.put('/wilayas', requireAuth, requireAdmin, async (req, res) => {
  const { rates } = req.body;
  if (!Array.isArray(rates)) return res.status(400).json({ error: 'بيانات غير صالحة' });
  if (rates.length > 69) return res.status(400).json({ error: 'عدد الأسعار كبير جدًا' });

  try {
    await db.transaction(async (trx) => {
      for (const r of rates) {
        const home = Math.max(0, parseFloat(r.home_price) || 0);
        const desk = Math.max(0, parseFloat(r.desk_price) || 0);
        await trx.query('UPDATE delivery_rates SET home_price = $1, desk_price = $2 WHERE wilaya_code = $3', [
          home,
          desk,
          r.wilaya_code,
        ]);
      }
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'تعذر تحديث الأسعار: ' + err.message });
  }
});

module.exports = router;
