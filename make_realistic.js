const db = require('./db');

async function seed() {
  try {
    const userId = 2; // oussamastore

    // Find the product
    const res = await db.query(`SELECT id FROM products WHERE name = 'قميص ضيق بأكمام' AND user_id = $1`, [userId]);
    if (res.rows.length === 0) {
      console.log("Product not found");
      return;
    }
    const pid = res.rows[0].id;

    // Additional images for the product gallery
    const additionalImages = JSON.stringify([
      'https://picsum.photos/seed/blueshirt/600/600',
      'https://picsum.photos/seed/redshirt/600/600',
      'https://picsum.photos/seed/blackshirt/600/600'
    ]);

    // Update product to have variants and additional images
    await db.query(`UPDATE products SET has_variants = 1, images = $1 WHERE id = $2`, [additionalImages, pid]);

    // Delete existing variants if any
    await db.query(`DELETE FROM product_variants WHERE product_id = $1`, [pid]);

    const variants = [
      { color: 'أسود', code: '#000000', size: 'M', img: 'https://picsum.photos/seed/blackshirt/600/600' },
      { color: 'أسود', code: '#000000', size: 'L', img: 'https://picsum.photos/seed/blackshirt/600/600' },
      { color: 'أسود', code: '#000000', size: 'XL', img: 'https://picsum.photos/seed/blackshirt/600/600' },
      
      { color: 'أزرق', code: '#1E3A8A', size: 'M', img: 'https://picsum.photos/seed/blueshirt/600/600' },
      { color: 'أزرق', code: '#1E3A8A', size: 'L', img: 'https://picsum.photos/seed/blueshirt/600/600' },
      { color: 'أزرق', code: '#1E3A8A', size: 'XL', img: 'https://picsum.photos/seed/blueshirt/600/600' },
      
      { color: 'أحمر', code: '#DC2626', size: 'M', img: 'https://picsum.photos/seed/redshirt/600/600' },
      { color: 'أحمر', code: '#DC2626', size: 'L', img: 'https://picsum.photos/seed/redshirt/600/600' },
      { color: 'أحمر', code: '#DC2626', size: 'XL', img: 'https://picsum.photos/seed/redshirt/600/600' }
    ];

    for (let i = 0; i < variants.length; i++) {
      const v = variants[i];
      const label = v.size + ' - ' + v.color;
      await db.query(`
        INSERT INTO product_variants (product_id, label, color, color_code, size, image, stock, cost_price, sort_order)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [pid, label, v.color, v.code, v.size, v.img, 50, 2000, i]);
    }

    console.log('Variants and images added!');
  } catch (err) {
    console.error(err);
  }
}
seed();
