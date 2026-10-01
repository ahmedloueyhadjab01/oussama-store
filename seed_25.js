const db = require('./db');

async function add25Products() {
  try {
    await db.initDb();
    const userId = 2; // oussamastore user ID
    
    // Get Categories
    const categories = await db.all(`SELECT id, slug FROM categories WHERE user_id = $1`, [userId]);
    const catMap = {};
    categories.forEach(c => catMap[c.slug] = c.id);

    // If categories don't exist, create them
    if (!catMap['mens-clothing']) {
        const c1 = await db.query(`INSERT INTO categories (user_id, name, slug) VALUES ($1, $2, $3) RETURNING id`, [userId, 'ألبسة رجالية', 'mens-clothing']);
        catMap['mens-clothing'] = c1.rows[0].id;
    }
    if (!catMap['womens-clothing']) {
        const c2 = await db.query(`INSERT INTO categories (user_id, name, slug) VALUES ($1, $2, $3) RETURNING id`, [userId, 'ألبسة نسائية', 'womens-clothing']);
        catMap['womens-clothing'] = c2.rows[0].id;
    }
    if (!catMap['sports-shoes']) {
        const c3 = await db.query(`INSERT INTO categories (user_id, name, slug) VALUES ($1, $2, $3) RETURNING id`, [userId, 'أحذية رياضية', 'sports-shoes']);
        catMap['sports-shoes'] = c3.rows[0].id;
    }

    // Clear existing products to put exactly 25 fresh ones
    await db.query(`DELETE FROM products WHERE user_id = $1`, [userId]);

    const productData = [
      { name: "تيشيرت بولو كلاسيكي", c: "mens-clothing", price: 2500, img: "https://images.unsplash.com/photo-1576566588028-4147f3842f27?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60" },
      { name: "سروال جينز أزرق داكن", c: "mens-clothing", price: 4200, img: "https://images.unsplash.com/photo-1542272604-780c8a3dc55f?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60" },
      { name: "جاكيت جلد شبابي", c: "mens-clothing", price: 9500, img: "https://images.unsplash.com/photo-1551028719-00167b16eac5?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60" },
      { name: "قميص رسمي أبيض", c: "mens-clothing", price: 3000, img: "https://images.unsplash.com/photo-1598033129183-c4f50c736f10?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60" },
      { name: "حذاء كاجوال مريح", c: "sports-shoes", price: 5500, img: "https://images.unsplash.com/photo-1549298916-b41d501d3772?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60" },
      { name: "فستان سهرة أسود أنيق", c: "womens-clothing", price: 8000, img: "https://images.unsplash.com/photo-1566160983804-d53348123281?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60" },
      { name: "بلوزة نسائية قطنية", c: "womens-clothing", price: 2800, img: "https://images.unsplash.com/photo-1516762689617-e1cffcef479d?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60" },
      { name: "حقيبة يد فاخرة", c: "womens-clothing", price: 6500, img: "https://images.unsplash.com/photo-1584916201218-f4242ceb4809?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60" },
      { name: "حذاء كعب عالي للسهرات", c: "womens-clothing", price: 5900, img: "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60" },
      { name: "تنورة صيفية خفيفة", c: "womens-clothing", price: 3500, img: "https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60" },
      { name: "حذاء رياضي للركض", c: "sports-shoes", price: 7200, img: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60" },
      { name: "تيشيرت رياضي مقاوم للتعرق", c: "sports-shoes", price: 2100, img: "https://images.unsplash.com/photo-1581655353564-df123a1eb820?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60" },
      { name: "نظارات شمسية عصرية", c: "mens-clothing", price: 1800, img: "https://images.unsplash.com/photo-1511499767150-a48a237f0083?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60" },
      { name: "معطف شتوي طويل", c: "womens-clothing", price: 12000, img: "https://images.unsplash.com/photo-1539533113208-f6df8cc8b543?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60" },
      { name: "ساعة يد كلاسيكية رجالية", c: "mens-clothing", price: 4500, img: "https://images.unsplash.com/photo-1524805444758-089113d48a6d?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60" },
      { name: "محفظة جلدية أصلية", c: "mens-clothing", price: 2900, img: "https://images.unsplash.com/photo-1627123424574-724758594e93?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60" },
      { name: "شورت بحر صيفي", c: "mens-clothing", price: 1500, img: "https://images.unsplash.com/photo-1591195853828-11db59a44f6b?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60" },
      { name: "فستان زهور ربيعي", c: "womens-clothing", price: 4800, img: "https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60" },
      { name: "طقم إكسسوارات فضي", c: "womens-clothing", price: 3200, img: "https://images.unsplash.com/photo-1599643478524-fb66f70d00f8?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60" },
      { name: "حزام جلدي للرجال", c: "mens-clothing", price: 1200, img: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60" },
      { name: "قبعة رياضية خفيفة", c: "sports-shoes", price: 800, img: "https://images.unsplash.com/photo-1588850561407-ed78c282e89b?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60" },
      { name: "ملابس رياضية كاملة", c: "sports-shoes", price: 6800, img: "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60" },
      { name: "بيجاما قطنية للنوم", c: "womens-clothing", price: 3800, img: "https://images.unsplash.com/photo-1541278107931-e006523892df?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60" },
      { name: "سترة مضادة للرياح", c: "mens-clothing", price: 5400, img: "https://images.unsplash.com/photo-1544441893-675973e31985?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60" },
      { name: "جوارب قطنية (مجموعة 5)", c: "mens-clothing", price: 1000, img: "https://images.unsplash.com/photo-1582966772680-860e372bb558?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60" }
    ];

    for (let i = 0; i < productData.length; i++) {
      let p = productData[i];
      let slug = p.name.replace(/\\s+/g, '-').replace(/[^a-zA-Z0-9\\u0600-\\u06FF-]/g, '') + '-' + i;
      let sku = 'PRD-' + (1000 + i);
      let compare_price = p.price + Math.floor(p.price * 0.3); // 30% discount illusion
      
      await db.query(
        `INSERT INTO products (user_id, name, slug, description, price, compare_price, sku, stock, category_id, image, images) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [userId, p.name, slug, 'تفاصيل ومواصفات المنتج: ' + p.name + ' بخامة ممتازة وجودة عالية.', p.price, compare_price, sku, 50, catMap[p.c], p.img, JSON.stringify([p.img])]
      );
    }
    
    console.log("25 Products inserted successfully!");
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
add25Products();
