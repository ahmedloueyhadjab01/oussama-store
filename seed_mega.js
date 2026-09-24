const db = require('./db');

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDate(daysAgo) {
  const d = new Date();
  d.setDate(d.getDate() - randomInt(0, daysAgo));
  return d.toISOString();
}

async function seedMega() {
  try {
    await db.initDb();
    const userId = 2; // Oussama
    console.log("Seeding Oussama store (ID: 2) with mega data...");

    // 1. Categories
    const categoryNames = [
      'أزياء رجالية', 'أزياء نسائية', 'إكسسوارات', 'أحذية رياضية', 
      'إلكترونيات ذكية', 'عطور فاخرة', 'ملابس رياضية', 'ساعات يد', 
      'حقائب ظهر', 'نظارات شمسية'
    ];
    
    // Clear old data for a fresh test (optional but good for testing)
    // Actually, I'll just keep existing data and add to it to be safe, except categories which might duplicate.
    // Better to delete existing dummy data? I'll just add new ones.
    
    let categoryIds = [];
    for (let cName of categoryNames) {
      // Check if exists
      let cat = await db.get('SELECT id FROM categories WHERE name = $1 AND user_id = $2', [cName, userId]);
      if (!cat) {
        const slug = cName.replace(/\s+/g, '-') + '-' + Math.random().toString(36).substr(2, 5);
        const res = await db.query(
          'INSERT INTO categories (user_id, name, slug, sort_order) VALUES ($1, $2, $3, $4) RETURNING id',
          [userId, cName, slug, 0]
        );
        cat = { id: res.rows[0].id };
      }
      categoryIds.push(cat.id);
    }

    // 2. Products
    const productsData = [
      { n: 'قميص رجالي كاجوال', c: 0, p: 3500, cp: 4500, img: 'https://images.pexels.com/photos/297933/pexels-photo-297933.jpeg?w=400' },
      { n: 'جاكيت شتوي دافئ', c: 0, p: 8500, cp: 11000, img: 'https://images.pexels.com/photos/1689731/pexels-photo-1689731.jpeg?w=400' },
      { n: 'تيشيرت صيفي قطن', c: 0, p: 2500, cp: 3000, img: 'https://images.pexels.com/photos/428338/pexels-photo-428338.jpeg?w=400' },
      
      { n: 'فستان سهرة أحمر', c: 1, p: 9000, cp: 12000, img: 'https://images.pexels.com/photos/291762/pexels-photo-291762.jpeg?w=400' },
      { n: 'تنورة طويلة كلاسيك', c: 1, p: 4000, cp: 5000, img: 'https://images.pexels.com/photos/1007018/pexels-photo-1007018.jpeg?w=400' },
      { n: 'بلوزة حرير ناعمة', c: 1, p: 3500, cp: 4500, img: 'https://images.pexels.com/photos/1759622/pexels-photo-1759622.jpeg?w=400' },
      
      { n: 'طقم قلادة ذهبية', c: 2, p: 5000, cp: 7000, img: 'https://images.pexels.com/photos/265906/pexels-photo-265906.jpeg?w=400' },
      { n: 'خاتم فضة 925', c: 2, p: 3000, cp: 4000, img: 'https://images.pexels.com/photos/2735970/pexels-photo-2735970.jpeg?w=400' },
      { n: 'سوار جلد أنيق', c: 2, p: 1500, cp: 2000, img: 'https://images.pexels.com/photos/1191531/pexels-photo-1191531.jpeg?w=400' },
      
      { n: 'حذاء رياضي للمشي', c: 3, p: 5500, cp: 7500, img: 'https://images.pexels.com/photos/2529148/pexels-photo-2529148.jpeg?w=400' },
      { n: 'حذاء ركض احترافي', c: 3, p: 8000, cp: 10000, img: 'https://images.pexels.com/photos/1598505/pexels-photo-1598505.jpeg?w=400' },
      { n: 'حذاء كاجوال أبيض', c: 3, p: 4500, cp: 5500, img: 'https://images.pexels.com/photos/19090/pexels-photo.jpg?w=400' },
      
      { n: 'سماعات بلوتوث لاسلكية', c: 4, p: 4000, cp: 6000, img: 'https://images.pexels.com/photos/3394665/pexels-photo-3394665.jpeg?w=400' },
      { n: 'ساعة ذكية رياضية', c: 4, p: 7000, cp: 9500, img: 'https://images.pexels.com/photos/437037/pexels-photo-437037.jpeg?w=400' },
      { n: 'شاحن سريع 20W', c: 4, p: 1500, cp: 2500, img: 'https://images.pexels.com/photos/3850512/pexels-photo-3850512.jpeg?w=400' },
      
      { n: 'عطر مسك فاخر', c: 5, p: 6000, cp: 8000, img: 'https://images.pexels.com/photos/1961795/pexels-photo-1961795.jpeg?w=400' },
      { n: 'عطر زهري نسائي', c: 5, p: 5500, cp: 7000, img: 'https://images.pexels.com/photos/965989/pexels-photo-965989.jpeg?w=400' },
      { n: 'عود ملكي مركز', c: 5, p: 12000, cp: 15000, img: 'https://images.pexels.com/photos/2581179/pexels-photo-2581179.jpeg?w=400' },
      
      { n: 'طقم رياضي قطعتين', c: 6, p: 6500, cp: 8500, img: 'https://images.pexels.com/photos/4426511/pexels-photo-4426511.jpeg?w=400' },
      { n: 'بنطال يوجا مريح', c: 6, p: 3500, cp: 4500, img: 'https://images.pexels.com/photos/3823039/pexels-photo-3823039.jpeg?w=400' },
      
      { n: 'ساعة كلاسيكية معدنية', c: 7, p: 11000, cp: 14000, img: 'https://images.pexels.com/photos/2783873/pexels-photo-2783873.jpeg?w=400' },
      { n: 'ساعة جلدية رسمية', c: 7, p: 8500, cp: 10500, img: 'https://images.pexels.com/photos/236900/pexels-photo-236900.jpeg?w=400' },
      
      { n: 'حقيبة لابتوب مقاومة', c: 8, p: 4500, cp: 6000, img: 'https://images.pexels.com/photos/3731256/pexels-photo-3731256.jpeg?w=400' },
      { n: 'حقيبة سفر صغيرة', c: 8, p: 9000, cp: 11000, img: 'https://images.pexels.com/photos/386009/pexels-photo-386009.jpeg?w=400' },
      
      { n: 'نظارة شمسية دائرية', c: 9, p: 3500, cp: 5000, img: 'https://images.pexels.com/photos/701877/pexels-photo-701877.jpeg?w=400' },
      { n: 'نظارة رياضية عاكسة', c: 9, p: 4000, cp: 5500, img: 'https://images.pexels.com/photos/1036622/pexels-photo-1036622.jpeg?w=400' }
    ];

    let productIds = [];
    for (let p of productsData) {
      let prod = await db.get('SELECT id FROM products WHERE name = $1 AND user_id = $2', [p.n, userId]);
      if (!prod) {
        const slug = p.n.replace(/\\s+/g, '-') + '-' + Math.random().toString(36).substr(2, 5);
        const res = await db.query(
          `INSERT INTO products (user_id, name, slug, price, compare_price, cost_price, stock, category_id, image, images)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
          [userId, p.n, slug, p.p, p.cp, p.p * 0.5, randomInt(10, 100), categoryIds[p.c], p.img, JSON.stringify([p.img])]
        );
        prod = { id: res.rows[0].id };
      }
      productIds.push({ id: prod.id, price: p.p, cost: p.p * 0.5, name: p.n, img: p.img });
    }

    // 3. Orders (100 orders with mixed statuses)
    const statuses = ['قيد المعالجة', 'قيد التوصيل', 'تم التسليم', 'تم التسليم', 'تم التسليم', 'ملغي', 'تعذر التوصيل', 'مرتجع'];
    const wilayas = ['الجزائر', 'وهران', 'عنابة', 'قسنطينة', 'سطيف', 'باتنة', 'بجاية', 'تلمسان', 'البليدة', 'تيبازة'];
    
    for (let i = 0; i < 100; i++) {
      const status = statuses[randomInt(0, statuses.length - 1)];
      const numItems = randomInt(1, 3);
      let items = [];
      let subtotal = 0;
      let totalCost = 0;
      for (let j = 0; j < numItems; j++) {
        const p = productIds[randomInt(0, productIds.length - 1)];
        const qty = randomInt(1, 2);
        items.push({
          product_id: p.id,
          name: p.name,
          image: p.img,
          price: p.price,
          qty: qty,
          cost_price: p.cost
        });
        subtotal += p.price * qty;
        totalCost += p.cost * qty;
      }
      
      const deliveryPrice = randomInt(400, 1000);
      const total = subtotal + deliveryPrice;
      const createdAt = randomDate(30);
      
      // If active, no shipping cost incurred, else if delivered/returned etc, incurred
      const incurred = ['تم التسليم', 'مرتجع', 'تعذر التوصيل'].includes(status) ? 1 : 0;
      
      await db.query(
        `INSERT INTO orders (user_id, customer_name, phone, address, commune, wilaya_name, wilaya_code, delivery_type, delivery_price, items, subtotal, total, status, shipping_cost_incurred, shipping_cost_actual, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
        [
          userId,
          'زبون ' + i,
          '0550' + randomInt(100000, 999999),
          'حي الاستقلال رقم ' + randomInt(1, 100),
          'بلدية ' + i,
          wilayas[randomInt(0, wilayas.length - 1)],
          randomInt(1, 48),
          'home',
          deliveryPrice,
          JSON.stringify(items),
          subtotal,
          total,
          status,
          incurred,
          incurred ? deliveryPrice : 0,
          createdAt
        ]
      );
    }

    // 4. Ad Campaigns (last 30 days)
    const sources = ['facebook', 'tiktok', 'instagram', 'snapchat'];
    for (let i = 0; i < 40; i++) {
      const src = sources[randomInt(0, sources.length - 1)];
      const d = randomDate(30).split('T')[0];
      const spend = randomInt(500, 5000);
      
      // Upsert
      const existing = await db.get('SELECT id FROM campaign_ad_spend WHERE user_id = $1 AND source = $2 AND spend_date = $3', [userId, src, d]);
      if (existing) {
        await db.query('UPDATE campaign_ad_spend SET spend_amount = spend_amount + $1 WHERE id = $2', [spend, existing.id]);
      } else {
        await db.query('INSERT INTO campaign_ad_spend (user_id, campaign_name, source, spend_date, spend_amount) VALUES ($1, $2, $3, $4, $5)', [userId, 'حملة ' + src, src, d, spend]);
      }
    }

    console.log("Mega seed completed!");
    process.exit(0);
  } catch(err) {
    console.error(err);
    process.exit(1);
  }
}

seedMega();
