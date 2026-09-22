const express = require('express');
const slugify = require('slugify');
const { body, validationResult } = require('express-validator');
const db = require('../db');
const { requireAuth, requireActiveSubscription, checkResourceOwnership } = require('../middleware/auth');
const upload = require('./upload');

const router = express.Router();

async function getVariants(productId) {
  return await db.all('SELECT * FROM product_variants WHERE product_id = $1 ORDER BY sort_order, id', [productId]);
}

// يجمع مُعرّف التصنيف نفسه + كل التصنيفات الفرعية بداخله في مصفوفة واحدة
async function getCategoryIdsWithDescendants(rootId) {
  const ids = [Number(rootId)];
  const children = await db.all('SELECT id FROM categories WHERE parent_id = $1', [rootId]);
  for (const child of children) {
    const subIds = await getCategoryIdsWithDescendants(child.id);
    ids.push(...subIds);
  }
  return ids;
}

async function serialize(p) {
  const base = {
    ...p,
    price: Number(p.price) || 0,
    compare_price: p.compare_price ? Number(p.compare_price) : null,
    cost_price: Number(p.cost_price) || 0,
    images: typeof p.images === 'string' ? JSON.parse(p.images || '[]') : (p.images || []),
    is_active: !!p.is_active,
    has_variants: !!p.has_variants,
  };
  if (base.has_variants) {
    const variants = await getVariants(p.id);
    base.variants = variants.map((v) => ({
      ...v,
      cost_price: Number(v.cost_price) || 0,
    }));
    base.stock = variants.reduce((sum, v) => sum + v.stock, 0);
  }
  return base;
}

async function serializePublic(p) {
  const publicProduct = {
    id: p.id,
    name: p.name,
    slug: p.slug,
    description: p.description,
    price: Number(p.price) || 0,
    compare_price: p.compare_price ? Number(p.compare_price) : null,
    stock: p.stock,
    has_variants: !!p.has_variants,
    pack_quantity: p.pack_quantity || 1,
    category_id: p.category_id,
    category_name: p.category_name,
    category_slug: p.category_slug,
    image: p.image,
    images: typeof p.images === 'string' ? JSON.parse(p.images || '[]') : (p.images || []),
    user_id: p.user_id,
    is_active: true,
  };
  if (p.has_variants) {
    const variants = await getVariants(p.id);
    publicProduct.variants = variants.map(({ id, product_id, label, stock, color, color_code, size, image }) => ({
      id,
      product_id,
      label,
      stock,
      color,
      color_code,
      size,
      image,
    }));
    publicProduct.stock = publicProduct.variants.reduce((sum, variant) => sum + variant.stock, 0);
  }
  return publicProduct;
}

// ------------------------------------------------------------------
// عام: عرض منتجات متجر معين للزبائن
// ------------------------------------------------------------------
router.get('/', async (req, res) => {
  const { category_id, q, slug, limit = 60, offset = 0, store_id, store_slug } = req.query;

  let vendorId = null;
  if (store_id) {
    vendorId = parseInt(store_id, 10);
  } else if (store_slug) {
    const vendor = await db.get('SELECT id FROM users WHERE store_slug = $1', [store_slug]);
    if (!vendor) return res.json([]);
    vendorId = vendor.id;
  }

  let sql = `
    SELECT p.*, c.name AS category_name, c.slug AS category_slug
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.is_active = 1
  `;
  const params = [];
  let paramIdx = 1;

  if (vendorId) {
    sql += ` AND p.user_id = $${paramIdx++}`;
    params.push(vendorId);
  }

  if (slug) {
    sql += ` AND p.slug = $${paramIdx++}`;
    params.push(slug);
  }
  if (category_id) {
    const ids = await getCategoryIdsWithDescendants(category_id);
    const placeholders = ids.map(() => `$${paramIdx++}`).join(',');
    sql += ` AND p.category_id IN (${placeholders})`;
    params.push(...ids);
  }
  if (q && q.trim()) {
    const words = q.trim().split(/\s+/).filter(Boolean);
    for (const word of words) {
      const term = `%${word}%`;
      sql += ` AND (p.name ILIKE $${paramIdx} OR p.description ILIKE $${paramIdx} OR c.name ILIKE $${paramIdx} OR c.slug ILIKE $${paramIdx})`;
      params.push(term);
      paramIdx++;
    }
  }
  sql += ` ORDER BY p.created_at DESC LIMIT $${paramIdx++} OFFSET $${paramIdx++}`;
  params.push(Number(limit), Number(offset));

  const products = await db.all(sql, params);
  const serialized = await Promise.all(products.map(serializePublic));
  res.json(serialized);
});

// خاص: كل المنتجات للتاجر في لوحة تحكمه
router.get('/admin/all', requireAuth, async (req, res) => {
  let products;
  if (req.user.role === 'admin') {
    products = await db.all('SELECT * FROM products ORDER BY created_at DESC');
  } else {
    products = await db.all('SELECT * FROM products WHERE user_id = $1 ORDER BY created_at DESC', [req.user.id]);
  }
  const serialized = await Promise.all(products.map(serialize));
  res.json(serialized);
});

// عام: منتج واحد بالـ id
router.get('/:id', async (req, res) => {
  const product = await db.get(
    'SELECT p.*, c.name AS category_name, c.slug AS category_slug FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.id = $1 AND p.is_active = 1',
    [req.params.id]
  );
  if (!product) return res.status(404).json({ error: 'المنتج غير موجود' });
  res.json(await serializePublic(product));
});

// رفع صورة مفردة
router.post('/upload-single', requireAuth, requireActiveSubscription, upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'لم يتم اختيار أي صورة' });
  const fileUrl = req.file.url || `/uploads/${req.file.filename}`;
  res.json({ url: fileUrl, filename: req.file.filename });
});

// إنشاء منتج جديد
router.post(
  '/',
  requireAuth,
  requireActiveSubscription,
  upload.array('images', 20),
  [
    body('name').trim().isLength({ min: 1, max: 200 }).withMessage('اسم المنتج مطلوب'),
    body('price').isFloat({ min: 0 }).withMessage('السعر يجب أن يكون رقمًا موجبًا'),
    body('stock').optional().isInt({ min: 0 }).withMessage('المخزون يجب أن يكون رقمًا صحيحًا'),
    body('cost_price').optional().isFloat({ min: 0 }).withMessage('سعر الشراء يجب أن يكون رقمًا موجبًا'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }

    const { name, description = '', price, compare_price, sku, stock = 0, cost_price = 0, category_id, video_file = '', reviews = '', rating = 5 } = req.body;

    if (category_id) {
      const cat = await db.get('SELECT user_id FROM categories WHERE id = $1', [category_id]);
      if (cat && cat.user_id !== null && cat.user_id !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'هذا التصنيف لا ينتمي لمتجرك.' });
      }
    }

    let variants = [];
    if (req.body.variants) {
      try {
        variants = typeof req.body.variants === 'string' ? JSON.parse(req.body.variants) : req.body.variants;
        if (!Array.isArray(variants)) variants = [];
      } catch {
        return res.status(400).json({ error: 'صيغة المتغيرات غير صالحة' });
      }
    }
    const hasVariants = variants.length > 0;
    if (hasVariants) {
      for (const v of variants) {
        const vLabel = v.label || [v.color, v.size].filter(Boolean).join(' - ');
        if (!vLabel || !vLabel.trim()) {
          return res.status(400).json({ error: 'كل متغيّر يحتاج اسمًا أو لونًا أو مقاسًا' });
        }
      }
    }

    let slug = slugify(name, { lower: true, strict: true, locale: 'ar' }) || `p-${Date.now()}`;
    const existing = await db.get('SELECT id FROM products WHERE slug = $1', [slug]);
    if (existing) slug = `${slug}-${Date.now()}`;

    let imagePaths = (req.files || []).map((f) => f.url || `/uploads/${f.filename}`);

    if (req.body.existing_images) {
      try {
        const extImgs = JSON.parse(req.body.existing_images);
        if (Array.isArray(extImgs)) {
          imagePaths = [...new Set([...imagePaths, ...extImgs])];
        }
      } catch {}
    }

    if (hasVariants) {
      for (const v of variants) {
        if (v.image && typeof v.image === 'string' && !imagePaths.includes(v.image)) {
          imagePaths.push(v.image);
        }
      }
    }

    const mainImage = imagePaths[0] || (variants[0] && variants[0].image ? variants[0].image : null);
    const initialStock = hasVariants ? 0 : parseInt(stock, 10) || 0;
    const initialCost = hasVariants ? 0 : parseFloat(cost_price) || 0;
    const packQty = Math.max(1, parseInt(req.body.pack_quantity, 10) || 1);

    try {
      const newId = await db.transaction(async (trx) => {
        const insertRes = await trx.query(
          `INSERT INTO products (user_id, name, slug, description, price, compare_price, sku, stock, cost_price, has_variants, category_id, image, images, pack_quantity, video_file, reviews, rating)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
           RETURNING id`,
          [
            req.user.id,
            name.trim(),
            slug,
            description,
            parseFloat(price),
            compare_price ? parseFloat(compare_price) : null,
            sku || null,
            initialStock,
            initialCost,
            hasVariants ? 1 : 0,
            category_id || null,
            mainImage,
            JSON.stringify(imagePaths),
            packQty,
            (video_file || '').trim(),
            (reviews || '').trim(),
            parseFloat(rating) || 5,
          ]
        );

        const productId = insertRes.rows[0].id;

        if (hasVariants) {
          for (let idx = 0; idx < variants.length; idx++) {
            const v = variants[idx];
            const vLabel = (v.label || [v.color, v.size].filter(Boolean).join(' - ')).trim();
            const vColor = (v.color || '').trim();
            const vColorCode = (v.color_code || '').trim();
            const vSize = (v.size || '').trim();
            const vImage = (v.image || '').trim();
            const vStock = Math.max(0, parseInt(v.stock, 10) || 0);
            const vCost = Math.max(0, parseFloat(v.cost_price) || 0);

            const vRes = await trx.query(
              `INSERT INTO product_variants (product_id, label, color, color_code, size, image, stock, cost_price, sort_order)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
              [productId, vLabel, vColor, vColorCode, vSize, vImage, vStock, vCost, idx]
            );

            if (vStock > 0) {
              await trx.query(
                'INSERT INTO variant_restocks (variant_id, qty_added, cost_price) VALUES ($1, $2, $3)',
                [vRes.rows[0].id, vStock, vCost]
              );
            }
          }
        } else if (initialStock > 0) {
          await trx.query(
            'INSERT INTO stock_restocks (product_id, qty_added, cost_price) VALUES ($1, $2, $3)',
            [productId, initialStock, initialCost]
          );
        }

        return productId;
      });

      const product = await db.get('SELECT * FROM products WHERE id = $1', [newId]);
      res.status(201).json(await serialize(product));
    } catch (err) {
      console.error('Error creating product:', err);
      res.status(500).json({ error: 'تعذر إنشاء المنتج: ' + err.message });
    }
  }
);

// تعديل بيانات المنتج
router.put('/:id', requireAuth, requireActiveSubscription, upload.array('images', 20), async (req, res) => {
  const product = await db.get('SELECT * FROM products WHERE id = $1', [req.params.id]);
  if (!product) return res.status(404).json({ error: 'المنتج غير موجود' });

  if (!checkResourceOwnership(product.user_id, req, res)) return;

  const name = req.body.name !== undefined ? req.body.name : product.name;
  const description = req.body.description !== undefined ? req.body.description : product.description;
  const price = req.body.price !== undefined ? req.body.price : product.price;
  const compare_price = req.body.compare_price !== undefined ? req.body.compare_price : product.compare_price;
  const sku = req.body.sku !== undefined ? req.body.sku : product.sku;
  const category_id = req.body.category_id !== undefined ? req.body.category_id : product.category_id;
  const is_active = req.body.is_active !== undefined ? req.body.is_active : product.is_active;
  const pack_quantity = req.body.pack_quantity !== undefined ? req.body.pack_quantity : product.pack_quantity;
  const video_file = req.body.video_file !== undefined ? req.body.video_file : product.video_file;
  const reviews = req.body.reviews !== undefined ? req.body.reviews : product.reviews;
  const rating = req.body.rating !== undefined ? req.body.rating : product.rating;

  let images = typeof product.images === 'string' ? JSON.parse(product.images || '[]') : (product.images || []);
  if (req.body.existing_images) {
    try {
      const ext = JSON.parse(req.body.existing_images);
      if (Array.isArray(ext)) images = ext;
    } catch {}
  }
  if (req.files && req.files.length) {
    const newImgs = req.files.map((f) => f.url || `/uploads/${f.filename}`);
    images = [...images, ...newImgs];
  }
  const mainImage = images[0] || product.image;

  await db.query(
    `UPDATE products SET name=$1, description=$2, price=$3, compare_price=$4, sku=$5, category_id=$6, image=$7, images=$8, is_active=$9, pack_quantity=$10, video_file=$11, reviews=$12, rating=$13
     WHERE id=$14`,
    [
      name,
      description,
      parseFloat(price),
      compare_price ? parseFloat(compare_price) : null,
      sku || null,
      category_id || null,
      mainImage,
      JSON.stringify(images),
      is_active === undefined ? product.is_active : (is_active === 'true' || is_active === true ? 1 : 0),
      Math.max(1, parseInt(pack_quantity, 10) || 1),
      (video_file || '').trim(),
      (reviews || '').trim(),
      rating ? parseFloat(rating) : 5,
      req.params.id,
    ]
  );

  const updated = await db.get('SELECT * FROM products WHERE id = $1', [req.params.id]);
  res.json(await serialize(updated));
});

// تزويد المخزون
router.post(
  '/:id/restock',
  requireAuth,
  requireActiveSubscription,
  [
    body('qty').isInt({ min: 1 }).withMessage('الكمية المضافة يجب أن تكون رقمًا صحيحًا أكبر من صفر'),
    body('cost_price').isFloat({ min: 0 }).withMessage('سعر الشراء مطلوب ويجب أن يكون رقمًا موجبًا'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }

    const product = await db.get('SELECT * FROM products WHERE id = $1', [req.params.id]);
    if (!product) return res.status(404).json({ error: 'المنتج غير موجود' });
    if (!checkResourceOwnership(product.user_id, req, res)) return;
    if (product.has_variants) {
      return res.status(400).json({ error: 'هذا المنتج له متغيرات (مقاسات/أحجام) - زوّد كل متغيّر على حدة' });
    }

    const qtyAdded = parseInt(req.body.qty, 10);
    const newCostPrice = parseFloat(req.body.cost_price);

    const oldStock = product.stock || 0;
    const oldCost = parseFloat(product.cost_price) || 0;
    const totalStock = oldStock + qtyAdded;
    const weightedAvgCost = totalStock > 0 ? (oldStock * oldCost + qtyAdded * newCostPrice) / totalStock : newCostPrice;

    await db.transaction(async (trx) => {
      await trx.query('UPDATE products SET stock = stock + $1, cost_price = $2 WHERE id = $3', [
        qtyAdded,
        weightedAvgCost,
        req.params.id,
      ]);
      await trx.query('INSERT INTO stock_restocks (product_id, qty_added, cost_price) VALUES ($1, $2, $3)', [
        req.params.id,
        qtyAdded,
        newCostPrice,
      ]);
    });

    const updated = await db.get('SELECT * FROM products WHERE id = $1', [req.params.id]);
    res.json(await serialize(updated));
  }
);

// إضافة متغيّر جديد
router.post(
  '/:id/variants',
  requireAuth,
  requireActiveSubscription,
  async (req, res) => {
    const product = await db.get('SELECT * FROM products WHERE id = $1', [req.params.id]);
    if (!product) return res.status(404).json({ error: 'المنتج غير موجود' });
    if (!checkResourceOwnership(product.user_id, req, res)) return;
    if (!product.has_variants && product.stock > 0) {
      return res.status(400).json({
        error: 'هذا منتج بسيط وله مخزون عام بالفعل. لا يمكن تحويله لمتغيرات إلا بعد تصفير مخزونه العام.',
      });
    }

    const color = (req.body.color || '').trim();
    const color_code = (req.body.color_code || '').trim();
    const size = (req.body.size || '').trim();
    const image = (req.body.image || '').trim();
    const label = (req.body.label || [color, size].filter(Boolean).join(' - ') || 'متغير جديد').trim();

    if (!label) {
      return res.status(400).json({ error: 'اسم المتغير أو اللون أو المقاس مطلوب' });
    }

    const qty = Math.max(0, parseInt(req.body.qty, 10) || 0);
    const costPrice = Math.max(0, parseFloat(req.body.cost_price) || 0);

    await db.transaction(async (trx) => {
      if (!product.has_variants) {
        await trx.query('UPDATE products SET has_variants = 1, stock = 0, cost_price = 0 WHERE id = $1', [req.params.id]);
      }
      const maxOrderRow = await trx.get('SELECT COALESCE(MAX(sort_order), -1) AS m FROM product_variants WHERE product_id = $1', [req.params.id]);
      const maxOrder = maxOrderRow ? maxOrderRow.m : -1;

      const result = await trx.query(
        'INSERT INTO product_variants (product_id, label, color, color_code, size, image, stock, cost_price, sort_order) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id',
        [req.params.id, label, color, color_code, size, image, qty, costPrice, maxOrder + 1]
      );

      if (qty > 0) {
        await trx.query('INSERT INTO variant_restocks (variant_id, qty_added, cost_price) VALUES ($1, $2, $3)', [
          result.rows[0].id,
          qty,
          costPrice,
        ]);
      }

      if (image) {
        let curImages = typeof product.images === 'string' ? JSON.parse(product.images || '[]') : (product.images || []);
        if (!curImages.includes(image)) {
          curImages.push(image);
          await trx.query('UPDATE products SET images = $1 WHERE id = $2', [JSON.stringify(curImages), req.params.id]);
        }
      }
    });

    const updated = await db.get('SELECT * FROM products WHERE id = $1', [req.params.id]);
    res.status(201).json(await serialize(updated));
  }
);

// تعديل بيانات متغير موجود
router.put('/:id/variants/:variantId', requireAuth, requireActiveSubscription, async (req, res) => {
  const product = await db.get('SELECT * FROM products WHERE id = $1', [req.params.id]);
  if (!product) return res.status(404).json({ error: 'المنتج غير موجود' });
  if (!checkResourceOwnership(product.user_id, req, res)) return;

  const variant = await db.get('SELECT * FROM product_variants WHERE id = $1 AND product_id = $2', [req.params.variantId, req.params.id]);
  if (!variant) return res.status(404).json({ error: 'المتغيّر غير موجود' });

  const color = req.body.color !== undefined ? String(req.body.color).trim() : variant.color;
  const color_code = req.body.color_code !== undefined ? String(req.body.color_code).trim() : variant.color_code;
  const size = req.body.size !== undefined ? String(req.body.size).trim() : variant.size;
  const image = req.body.image !== undefined ? String(req.body.image).trim() : variant.image;
  const label = req.body.label !== undefined ? String(req.body.label).trim() : (variant.label || [color, size].filter(Boolean).join(' - '));

  await db.transaction(async (trx) => {
    if (req.body.image !== undefined && variant.color) {
      await trx.query('UPDATE product_variants SET image = $1 WHERE product_id = $2 AND color = $3', [
        image,
        req.params.id,
        variant.color,
      ]);
    } else {
      await trx.query(
        'UPDATE product_variants SET label = $1, color = $2, color_code = $3, size = $4, image = $5 WHERE id = $6',
        [label, color, color_code, size, image, req.params.variantId]
      );
    }

    if (req.body.image !== undefined && image) {
      const images = typeof product.images === 'string' ? JSON.parse(product.images || '[]') : (product.images || []);
      if (!images.includes(image)) {
        images.push(image);
        await trx.query('UPDATE products SET images = $1 WHERE id = $2', [JSON.stringify(images), req.params.id]);
      }
    }
  });

  const updated = await db.get('SELECT * FROM products WHERE id = $1', [req.params.id]);
  res.json(await serialize(updated));
});

// تزويد متغيّر موجود بكمية جديدة
router.post(
  '/:id/variants/:variantId/restock',
  requireAuth,
  requireActiveSubscription,
  [
    body('qty').isInt({ min: 1 }).withMessage('الكمية المضافة يجب أن تكون رقمًا صحيحًا أكبر من صفر'),
    body('cost_price').isFloat({ min: 0 }).withMessage('سعر الشراء مطلوب ويجب أن يكون رقمًا موجبًا'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }

    const product = await db.get('SELECT * FROM products WHERE id = $1', [req.params.id]);
    if (!product) return res.status(404).json({ error: 'المنتج غير موجود' });
    if (!checkResourceOwnership(product.user_id, req, res)) return;

    const variant = await db.get('SELECT * FROM product_variants WHERE id = $1 AND product_id = $2', [req.params.variantId, req.params.id]);
    if (!variant) return res.status(404).json({ error: 'المتغيّر غير موجود' });

    const qtyAdded = parseInt(req.body.qty, 10);
    const newCostPrice = parseFloat(req.body.cost_price);
    const oldStock = variant.stock || 0;
    const oldCost = parseFloat(variant.cost_price) || 0;
    const totalStock = oldStock + qtyAdded;
    const weightedAvgCost = totalStock > 0 ? (oldStock * oldCost + qtyAdded * newCostPrice) / totalStock : newCostPrice;

    await db.transaction(async (trx) => {
      await trx.query('UPDATE product_variants SET stock = stock + $1, cost_price = $2 WHERE id = $3', [
        qtyAdded,
        weightedAvgCost,
        req.params.variantId,
      ]);
      await trx.query('INSERT INTO variant_restocks (variant_id, qty_added, cost_price) VALUES ($1, $2, $3)', [
        req.params.variantId,
        qtyAdded,
        newCostPrice,
      ]);
    });

    const updated = await db.get('SELECT * FROM products WHERE id = $1', [req.params.id]);
    res.json(await serialize(updated));
  }
);

// حذف متغيّر
router.delete('/:id/variants/:variantId', requireAuth, requireActiveSubscription, async (req, res) => {
  const product = await db.get('SELECT * FROM products WHERE id = $1', [req.params.id]);
  if (!product) return res.status(404).json({ error: 'المنتج غير موجود' });
  if (!checkResourceOwnership(product.user_id, req, res)) return;

  const variant = await db.get('SELECT * FROM product_variants WHERE id = $1 AND product_id = $2', [req.params.variantId, req.params.id]);
  if (!variant) return res.status(404).json({ error: 'الخيار غير موجود' });
  if (variant.stock > 0) {
    return res.status(400).json({ error: 'لا يمكن حذف خيار يمتلك مخزوناً. قم بتصفير المخزون أولاً.' });
  }
  
  if (variant.image) {
    upload.deleteFiles([variant.image]);
  }

  await db.query('DELETE FROM product_variants WHERE id = $1', [req.params.variantId]);
  const updated = await db.get('SELECT * FROM products WHERE id = $1', [req.params.id]);
  res.json(await serialize(updated));
});

// حذف منتج
router.delete('/:id', requireAuth, requireActiveSubscription, async (req, res) => {
  const product = await db.get('SELECT * FROM products WHERE id = $1', [req.params.id]);
  if (!product) return res.status(404).json({ error: 'المنتج غير موجود' });
  if (!checkResourceOwnership(product.user_id, req, res)) return;
  
  let imagesToDelete = [];
  if (product.image) imagesToDelete.push(product.image);
  if (product.images && product.images.length > 0) {
    if (typeof product.images === 'string') {
      try { imagesToDelete.push(...JSON.parse(product.images)); } catch(e){}
    } else {
      imagesToDelete.push(...product.images);
    }
  }
  
  const variants = await db.all('SELECT image FROM product_variants WHERE product_id = $1', [product.id]);
  variants.forEach(v => { if (v.image) imagesToDelete.push(v.image); });

  await db.query('DELETE FROM products WHERE id = $1', [req.params.id]);
  
  if (imagesToDelete.length > 0) {
    upload.deleteFiles(imagesToDelete);
  }
  
  res.json({ success: true });
});

module.exports = router;
