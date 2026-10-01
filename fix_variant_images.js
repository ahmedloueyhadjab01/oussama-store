const db = require('./db');

async function seed() {
  try {
    const userId = 2; // oussamastore

    const res = await db.query(`SELECT id FROM products WHERE name = 'قميص ضيق بأكمام' AND user_id = $1`, [userId]);
    const pid = res.rows[0].id;

    const redImg = 'https://cdn.dummyjson.com/products/images/mens-shirts/Man%20Plaid%20Shirt/1.png';
    const blueImg = 'https://cdn.dummyjson.com/products/images/mens-shirts/Blue%20&%20Black%20Check%20Shirt/1.png';
    const blackImg = 'https://cdn.dummyjson.com/products/images/mens-shirts/Gigabyte%20Aorus%20Men%20Tshirt/1.png';

    const additionalImages = JSON.stringify([blackImg, blueImg, redImg]);

    await db.query(`UPDATE products SET image = $1, images = $2 WHERE id = $3`, [blackImg, additionalImages, pid]);

    await db.query(`UPDATE product_variants SET image = $1 WHERE product_id = $2 AND color = 'أحمر'`, [redImg, pid]);
    await db.query(`UPDATE product_variants SET image = $1 WHERE product_id = $2 AND color = 'أزرق'`, [blueImg, pid]);
    await db.query(`UPDATE product_variants SET image = $1 WHERE product_id = $2 AND color = 'أسود'`, [blackImg, pid]);

    console.log('Variant images updated to real images!');
  } catch (err) {
    console.error(err);
  }
}
seed();
