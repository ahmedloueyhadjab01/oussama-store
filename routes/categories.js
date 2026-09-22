const express = require('express');
const slugify = require('slugify');
const { body, validationResult } = require('express-validator');
const db = require('../db');
const { requireAuth, checkResourceOwnership } = require('../middleware/auth');

const router = express.Router();

function buildTree(categories, parentId = null) {
  return categories
    .filter((c) => c.parent_id === parentId)
    .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name, 'ar'))
    .map((c) => ({
      ...c,
      children: buildTree(categories, c.id),
    }));
}

// عام: عرض كل التصنيفات كشجرة لمتجر معين
// ?store_id=X أو ?store_slug=X لعرض تصنيفات متجر واحد فقط
router.get('/', async (req, res) => {
  const { store_id, store_slug } = req.query;

  let vendorId = null;
  if (store_id) {
    vendorId = parseInt(store_id, 10);
  } else if (store_slug) {
    const vendor = await db.get('SELECT id FROM users WHERE store_slug = $1', [store_slug]);
    if (vendor) vendorId = vendor.id;
  }

  let categories;
  if (vendorId) {
    categories = await db.all('SELECT * FROM categories WHERE user_id = $1', [vendorId]);
  } else {
    categories = await db.all('SELECT * FROM categories');
  }
  res.json(buildTree(categories, null));
});

// قائمة مسطحة لتصنيفات التاجر المسجل دخوله (للنموذج في لوحة التحكم)
router.get('/flat', requireAuth, async (req, res) => {
  let categories;
  if (req.user.role === 'admin') {
    categories = await db.all('SELECT * FROM categories ORDER BY name');
  } else {
    categories = await db.all('SELECT * FROM categories WHERE user_id = $1 ORDER BY name', [req.user.id]);
  }
  res.json(categories);
});

// إضافة تصنيف جديد
router.post(
  '/',
  requireAuth,
  [
    body('name').trim().isLength({ min: 1, max: 100 }).withMessage('اسم التصنيف مطلوب (حتى 100 حرف)'),
    body('parent_id').optional({ nullable: true }).isInt().withMessage('تصنيف أب غير صالح'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }

    const { name, parent_id } = req.body;
    let slug = slugify(name, { lower: true, strict: true, locale: 'ar' }) || `cat-${Date.now()}`;

    // ضمان تفرّد الـ slug
    const existing = await db.get('SELECT id FROM categories WHERE slug = $1', [slug]);
    if (existing) slug = `${slug}-${Date.now()}`;

    if (parent_id) {
      const parent = await db.get('SELECT id, user_id FROM categories WHERE id = $1', [parent_id]);
      if (!parent) return res.status(400).json({ error: 'التصنيف الأب غير موجود' });
      // التحقق أن التصنيف الأب ينتمي لنفس التاجر
      if (parent.user_id !== null && parent.user_id !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'التصنيف الأب لا ينتمي لمتجرك.' });
      }
    }

    const result = await db.query(
      'INSERT INTO categories (user_id, name, slug, parent_id) VALUES ($1, $2, $3, $4) RETURNING *',
      [req.user.id, name.trim(), slug, parent_id || null]
    );

    res.status(201).json(result.rows[0]);
  }
);

// تعديل تصنيف
router.put(
  '/:id',
  requireAuth,
  [body('name').trim().isLength({ min: 1, max: 100 })],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }

    const category = await db.get('SELECT * FROM categories WHERE id = $1', [req.params.id]);
    if (!category) return res.status(404).json({ error: 'التصنيف غير موجود' });
    if (!checkResourceOwnership(category.user_id, req, res)) return;

    const { name } = req.body;
    const result = await db.query(
      'UPDATE categories SET name = $1 WHERE id = $2 RETURNING *',
      [name.trim(), req.params.id]
    );
    res.json(result.rows[0]);
  }
);

// حذف تصنيف (وكل التصنيفات الفرعية بداخله تلقائيًا بسبب ON DELETE CASCADE)
router.delete('/:id', requireAuth, async (req, res) => {
  const category = await db.get('SELECT * FROM categories WHERE id = $1', [req.params.id]);
  if (!category) return res.status(404).json({ error: 'التصنيف غير موجود' });
  if (!checkResourceOwnership(category.user_id, req, res)) return;

  await db.query('DELETE FROM categories WHERE id = $1', [req.params.id]);
  res.json({ success: true });
});

module.exports = router;
