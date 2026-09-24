const db = require('./db');

async function fixProducts() {
  try {
    await db.initDb();
    const userId = 2; // Oussama

    // 1. Fix Broken Images
    const fixes = [
      {
        nameLike: '%طقم إكسسوارات فضي%',
        img: 'https://images.pexels.com/photos/265906/pexels-photo-265906.jpeg?auto=compress&cs=tinysrgb&w=800'
      },
      {
        nameLike: '%فستان سهرة أسود أنيق%',
        img: 'https://images.pexels.com/photos/291762/pexels-photo-291762.jpeg?auto=compress&cs=tinysrgb&w=800'
      },
      {
        nameLike: '%سروال جينز أزرق داكن%',
        img: 'https://images.pexels.com/photos/428338/pexels-photo-428338.jpeg?auto=compress&cs=tinysrgb&w=800'
      }
    ];

    for (let f of fixes) {
      await db.query(
        `UPDATE products SET image = $1, images = $2 WHERE name LIKE $3 AND user_id = $4`,
        [f.img, JSON.stringify([f.img]), f.nameLike, userId]
      );
    }

    // 2. Add Videos to a few products
    const videoUrl = 'https://www.youtube.com/embed/ysz5S6PUM-U';
    await db.query(
      `UPDATE products SET video_file = $1 WHERE user_id = $2 AND name LIKE '%فستان%' OR name LIKE '%حذاء رياضي للركض%'`,
      [videoUrl, userId]
    );

    // 3. Add Sizes (Variants) to some products
    const productsToVariant = await db.all(
      `SELECT id, name FROM products WHERE user_id = $1 AND name IN ('تيشيرت بولو كلاسيكي', 'سروال جينز أزرق داكن') LIMIT 2`,
      [userId]
    );

    const sizes = ['S', 'M', 'L', 'XL'];
    for (let prod of productsToVariant) {
      await db.query(`UPDATE products SET has_variants = 1, stock = 0 WHERE id = $1`, [prod.id]);
      
      // Clear old variants if any
      await db.query(`DELETE FROM product_variants WHERE product_id = $1`, [prod.id]);
      
      for (let i = 0; i < sizes.length; i++) {
        await db.query(
          `INSERT INTO product_variants (product_id, label, size, stock, sort_order) VALUES ($1, $2, $3, $4, $5)`,
          [prod.id, 'مقاس ' + sizes[i], sizes[i], 15, i]
        );
      }
    }

    console.log("Images fixed, videos added, variants (sizes) added!");
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

fixProducts();
