const db = require('./db');

async function seedMore() {
  try {
    await db.initDb();
    const userId = 2; // oussamastore user ID
    
    const categories = await db.all(`SELECT id, slug FROM categories WHERE user_id = $1`, [userId]);
    const catMap = {};
    categories.forEach(c => catMap[c.slug] = c.id);

    // Get all products to create orders
    let allProducts = await db.all(`SELECT id, name, price, image FROM products WHERE user_id = $1`, [userId]);

    const customers = [
      { name: 'محمد الأمين', phone: '0555123456', code: 16, wilaya: 'الجزائر', commune: 'الجزائر الوسطى', address: 'شارع ديدوش مراد' },
      { name: 'سارة بن علي', phone: '0666987654', code: 31, wilaya: 'وهران', commune: 'وهران', address: 'حي مرافال' },
      { name: 'ياسين بلقاسم', phone: '0777112233', code: 19, wilaya: 'سطيف', commune: 'سطيف', address: 'حي عين تبينت' },
      { name: 'أنيس عبدالرحمن', phone: '0550445566', code: 23, wilaya: 'عنابة', commune: 'عنابة', address: 'حي سانكلو' },
      { name: 'مريم حداد', phone: '0660998877', code: 25, wilaya: 'قسنطينة', commune: 'قسنطينة', address: 'سيدي مبروك' }
    ];

    const statuses = ['جديد', 'قيد المعالجة', 'مكتمل', 'ملغى', 'تم التوصيل'];
    
    await db.query(`DELETE FROM orders WHERE user_id = $1`, [userId]);

    for (let i = 0; i < 20; i++) {
      const customer = customers[Math.floor(Math.random() * customers.length)];
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const numItems = Math.floor(Math.random() * 3) + 1;
      
      const items = [];
      let subtotal = 0;
      for (let j = 0; j < numItems; j++) {
        if(allProducts.length === 0) break;
        const prod = allProducts[Math.floor(Math.random() * allProducts.length)];
        const qty = Math.floor(Math.random() * 2) + 1;
        items.push({
          id: prod.id, name: prod.name, price: prod.price, qty: qty, image: prod.image
        });
        subtotal += (prod.price * qty);
      }
      
      const shippingCost = 600;
      const total = subtotal + shippingCost;
      const date = new Date(Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000));

      await db.query(
        `INSERT INTO orders (user_id, customer_name, phone, wilaya_code, wilaya_name, commune, address, items, subtotal, delivery_price, total, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [
          userId, customer.name, customer.phone, customer.code, customer.wilaya, customer.commune, customer.address, 
          JSON.stringify(items), subtotal, shippingCost, total, status, date
        ]
      );
    }

    await db.query(`DELETE FROM campaign_ad_spend WHERE user_id = $1`, [userId]);
    const campaignNames = ['حملة الفيسبوك للصيف', 'إعلانات انستغرام - ملابس نسائية', 'تيك توك تريند'];
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      for (const campaign of campaignNames) {
        const spend = Math.floor(Math.random() * 5000) + 1000;
        await db.query(
          `INSERT INTO campaign_ad_spend (user_id, spend_date, campaign_name, spend_amount) VALUES ($1, $2, $3, $4)`,
          [userId, date, campaign, spend]
        );
      }
    }

    console.log("More products, orders, and stats filled successfully!");
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
seedMore();
