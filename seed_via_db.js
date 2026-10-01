const db = require('./db');

async function seed() {
  try {
    const userId = 2; // oussamastore

    // Insert categories
    const cat1 = await db.query(`INSERT INTO categories (user_id, name, slug) VALUES ($1, $2, $3) RETURNING id`, [userId, 'ملابس رجالية', 'mens-clothing']);
    const cat2 = await db.query(`INSERT INTO categories (user_id, name, slug) VALUES ($1, $2, $3) RETURNING id`, [userId, 'إلكترونيات', 'electronics']);
    
    const cat1Id = cat1.rows[0].id;
    const cat2Id = cat2.rows[0].id;

    // Insert products
    await db.query(`
      INSERT INTO products (user_id, category_id, name, slug, description, price, compare_price, image, images)
      VALUES 
      ($1, $2, 'قميص صيفي أنيق', 'summer-shirt', 'قميص صيفي مريح جداً بخامة قطنية 100%', 3500, 4500, 'https://picsum.photos/seed/shirt1/600/600', '[]'),
      ($1, $2, 'سروال جينز كلاسيكي', 'classic-jeans', 'سروال جينز عالي الجودة متوفر بمقاسات مختلفة', 4200, 5000, 'https://picsum.photos/seed/jeans1/600/600', '[]'),
      ($1, $3, 'سماعات بلوتوث لاسلكية', 'wireless-earbuds', 'سماعات بصوت نقي وعزل ضوضاء، بطارية تدوم 24 ساعة', 5500, 7000, 'https://picsum.photos/seed/audio1/600/600', '[]'),
      ($1, $3, 'ساعة ذكية رياضية', 'smart-watch', 'ساعة ذكية تتبع النبض والخطوات وتستقبل الإشعارات', 8000, 12000, 'https://picsum.photos/seed/watch1/600/600', '[]')
    `, [userId, cat1Id, cat2Id]);

    console.log('Seed completed successfully via db.js!');
  } catch (err) {
    console.error(err);
  }
}
seed();
