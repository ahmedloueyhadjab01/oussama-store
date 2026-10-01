const Database = require('better-sqlite3');
const db = new Database('eco-store.sqlite');
const userId = 1;

try {
  db.prepare('BEGIN').run();

  // 1. Categories
  const catInsert = db.prepare('INSERT INTO categories (user_id, name, slug) VALUES (?, ?, ?)');
  const c1 = catInsert.run(userId, 'إلكترونيات', 'electronics').lastInsertRowid;
  const c2 = catInsert.run(userId, 'ألبسة', 'clothing').lastInsertRowid;
  const c3 = catInsert.run(userId, 'أحذية', 'shoes').lastInsertRowid;
  const c4 = catInsert.run(userId, 'عطور', 'perfumes').lastInsertRowid;

  // 2. Products
  const prodInsert = db.prepare('INSERT INTO products (user_id, name, slug, description, category_id, price, compare_price, cost_price, has_variants, image) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
  
  const p1 = prodInsert.run(userId, 'سماعات بلوتوث', 'bluetooth-headphones', 'سماعات عالية الجودة مع عزل للضوضاء', c1, 4500, 6000, 2500, 0, 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e').lastInsertRowid;
  const p2 = prodInsert.run(userId, 'حذاء رياضي', 'sports-shoes', 'حذاء مريح للركض والاستخدام اليومي', c3, 3500, 4000, 1500, 1, 'https://images.unsplash.com/photo-1542291026-7eec264c27ff').lastInsertRowid;
  const p3 = prodInsert.run(userId, 'عطر رجالي فاخر', 'men-perfume', 'عطر برائحة الخشب والمسك يدوم طويلا', c4, 8000, 10000, 4500, 0, 'https://images.unsplash.com/photo-1523293115678-d29062015be2').lastInsertRowid;
  const p4 = prodInsert.run(userId, 'تيشيرت صيفي', 'summer-tshirt', 'تيشيرت قطني 100%', c2, 1500, 2500, 800, 1, 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab').lastInsertRowid;

  // 3. Variants
  const varInsert = db.prepare('INSERT INTO product_variants (product_id, label, color, color_code, size, stock, cost_price) VALUES (?, ?, ?, ?, ?, ?, ?)');
  varInsert.run(p2, 'أسود - 42', 'أسود', '#000000', '42', 15, 1500);
  varInsert.run(p2, 'أبيض - 42', 'أبيض', '#ffffff', '42', 5, 1500);
  varInsert.run(p2, 'أسود - 44', 'أسود', '#000000', '44', 10, 1500);

  varInsert.run(p4, 'أحمر - M', 'أحمر', '#ff0000', 'M', 20, 800);
  varInsert.run(p4, 'أزرق - L', 'أزرق', '#0000ff', 'L', 12, 800);

  // Set default stock for non-variant products
  db.prepare('UPDATE products SET stock = ? WHERE id = ?').run(50, p1);
  db.prepare('UPDATE products SET stock = ? WHERE id = ?').run(30, p3);

  // 4. Orders
  const orderInsert = db.prepare('INSERT INTO orders (user_id, customer_name, phone, address, wilaya_code, wilaya_name, commune, delivery_type, delivery_price, subtotal, total, items, status, utm_campaign, utm_source, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');

  const statuses = ['delivered', 'delivered', 'delivered', 'cancelled', 'returned', 'shipped'];
  const wilayas = [{code: 16, name: 'الجزائر'}, {code: 31, name: 'وهران'}, {code: 23, name: 'عنابة'}];
  
  for (let i = 1; i <= 25; i++) {
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const date = new Date();
    date.setDate(date.getDate() - Math.floor(Math.random() * 14)); // Random date in last 14 days
    
    let camp = null;
    let src = null;
    if (Math.random() > 0.5) {
      camp = 'summer_sale';
      src = 'facebook';
    }

    const wilaya = wilayas[Math.floor(Math.random() * wilayas.length)];

    const items = [
      { id: p1, name: 'سماعات بلوتوث', price: 4500, qty: 1, cogs: 2500 }
    ];
    if (i % 3 === 0) {
      items.push({ id: p3, name: 'عطر رجالي فاخر', price: 8000, qty: 1, cogs: 4500 });
    }
    
    let subtotal = items.reduce((acc, it) => acc + (it.price * it.qty), 0);
    let delivery_price = 600;
    let total = subtotal + delivery_price;

    orderInsert.run(
      userId, 
      'زبون تجريبي ' + i, 
      '0555' + Math.floor(100000 + Math.random() * 900000), 
      'شارع الاستقلال رقم ' + i, 
      wilaya.code, 
      wilaya.name, 
      'بلدية ' + i, 
      'home',
      delivery_price,
      subtotal,
      total,
      JSON.stringify(items),
      status, 
      camp, 
      src,
      date.toISOString()
    );
  }

  // 5. Campaign Ad Spend
  const adSpendInsert = db.prepare('INSERT INTO campaign_ad_spend (user_id, campaign_name, source, spend_amount, spend_date, notes) VALUES (?, ?, ?, ?, ?, ?)');
  adSpendInsert.run(userId, 'summer_sale', 'facebook', 15000, new Date().toISOString(), 'حملة الصيف على الفيسبوك');
  adSpendInsert.run(userId, 'promo_1', 'tiktok', 5000, new Date().toISOString(), 'حملة تجريبية تيك توك');

  db.prepare('COMMIT').run();
  console.log("Mock data inserted successfully.");
} catch (err) {
  db.prepare('ROLLBACK').run();
  console.error("Error inserting mock data:", err);
}
