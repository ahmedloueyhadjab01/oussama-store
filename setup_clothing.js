const db = require('./db');

async function setup() {
  try {
    await db.initDb();
    const userId = 2;
    
    await db.query(`UPDATE users SET store_name = 'ovaro_28' WHERE id = $1`, [userId]);
    
    // Manage settings correctly
    await db.query(`DELETE FROM settings WHERE user_id = $1 AND key = 'store_description'`, [userId]);
    await db.query(`INSERT INTO settings (user_id, key, value) VALUES ($1, 'store_description', 'متجر ovaro_28 لأحدث صيحات الموضة والألبسة العصرية. نقدم لكم أفضل الخامات وأحدث الموديلات التي تناسب جميع الأذواق.')`, [userId]);
    
    await db.query(`DELETE FROM products WHERE user_id = $1`, [userId]);
    await db.query(`DELETE FROM categories WHERE user_id = $1`, [userId]);

    const cats = [
      { name: 'ألبسة رجالية', slug: 'mens-clothing' },
      { name: 'ألبسة نسائية', slug: 'womens-clothing' },
      { name: 'أحذية رياضية', slug: 'sports-shoes' }
    ];
    
    const catIds = [];
    for (let c of cats) {
      const res = await db.query(`INSERT INTO categories (user_id, name, slug) VALUES ($1, $2, $3) RETURNING id`, [userId, c.name, c.slug]);
      catIds.push(res.rows[0].id);
    }

    const products = [
      {
        name: 'تيشيرت صيفي قطني 100%',
        slug: 'summer-cotton-tshirt',
        description: 'تيشيرت صيفي مريح جداً مصنوع من القطن الخالص، متوفر بعدة مقاسات وألوان.',
        price: 2500, compare_price: 3500, sku: 'CL-TS-01', stock: 50, category_id: catIds[0],
        image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60',
        images: '["https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60"]'
      },
      {
        name: 'فستان صيفي أنيق',
        slug: 'elegant-summer-dress',
        description: 'فستان صيفي بتصميم عصري وألوان زاهية، خفيف ومريح جداً.',
        price: 4500, compare_price: 6000, sku: 'CL-DR-01', stock: 30, category_id: catIds[1],
        image: 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60',
        images: '["https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60"]'
      },
      {
        name: 'حذاء رياضي مريح للجري',
        slug: 'comfortable-running-shoes',
        description: 'حذاء رياضي خفيف الوزن ومصمم لدعم القدم أثناء المشي.',
        price: 5800, compare_price: 7500, sku: 'CL-SH-01', stock: 20, category_id: catIds[2],
        image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60',
        images: '["https://images.unsplash.com/photo-1542291026-7eec264c27ff?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60"]'
      }
    ];

    for (let p of products) {
      await db.query(
        `INSERT INTO products (user_id, name, slug, description, price, compare_price, sku, stock, category_id, image, images) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [userId, p.name, p.slug, p.description, p.price, p.compare_price, p.sku, p.stock, p.category_id, p.image, p.images]
      );
    }
    console.log("Done");
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
setup();
