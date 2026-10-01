const db = require('./db');

async function seed() {
  try {
    const userId = 2;

    const cat1 = await db.query(`INSERT INTO categories (user_id, name, slug) VALUES ($1, $2, $3) RETURNING id`, [userId, 'أحذية رياضية', 'sports-shoes']);
    const cat2 = await db.query(`INSERT INTO categories (user_id, name, slug) VALUES ($1, $2, $3) RETURNING id`, [userId, 'عطور وإكسسوارات', 'perfumes-accessories']);
    
    const cat1Id = cat1.rows[0].id;
    const cat2Id = cat2.rows[0].id;

    await db.query(`
      INSERT INTO products (user_id, category_id, name, slug, description, price, compare_price, image, images)
      VALUES 
      ($1, $2, 'حذاء جري مريح', 'running-shoe', 'حذاء رياضي مريح للجري والمشي لمسافات طويلة', 6500, 8000, 'https://picsum.photos/seed/shoe1/600/600', '[]'),
      ($1, $2, 'حذاء كرة قدم احترافي', 'football-shoe', 'حذاء مصمم للعب على العشب الصناعي والطبيعي', 7200, 9500, 'https://picsum.photos/seed/shoe2/600/600', '[]'),
      ($1, $3, 'عطر رجالي فرنسي', 'french-perfume', 'عطر رجالي فخم برائحة الأخشاب والمسك، يدوم طويلاً', 4500, 6000, 'https://picsum.photos/seed/perfume1/600/600', '[]'),
      ($1, $3, 'حقيبة ظهر عصرية', 'modern-backpack', 'حقيبة ظهر قوية ومقاومة للماء وتتسع للحاسوب المحمول', 3800, 5000, 'https://picsum.photos/seed/bag1/600/600', '[]'),
      ($1, $3, 'نظارات شمسية كلاسيكية', 'sunglasses', 'نظارات شمسية لحماية العين من الأشعة فوق البنفسجية', 2500, 3500, 'https://picsum.photos/seed/glasses1/600/600', '[]'),
      ($1, $2, 'حذاء تدريب شامل', 'training-shoe', 'حذاء رياضي خفيف الوزن للصالات الرياضية والتمرينات', 5800, 7500, 'https://picsum.photos/seed/shoe3/600/600', '[]')
    `, [userId, cat1Id, cat2Id]);

    console.log('Seed more completed!');
  } catch (err) {
    console.error(err);
  }
}
seed();
