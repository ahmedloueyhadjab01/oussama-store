require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const OUSSAMA_ID = 2; // Oussama's user ID

const categoriesData = [
  { name: 'أزياء رجالية', slug: 'mens-fashion-x1' },
  { name: 'أزياء نسائية', slug: 'womens-fashion-x1' },
  { name: 'إكسسوارات ومجوهرات', slug: 'accessories-x1' },
  { name: 'ساعات فاخرة', slug: 'watches-x1' },
  { name: 'عطور ومستحضرات', slug: 'perfumes-x1' },
  { name: 'إلكترونيات ذكية', slug: 'electronics-x1' },
];

const productsData = [
  // Men's
  { catSlug: 'mens-fashion-x1', name: 'قميص كلاسيكي قطني - أبيض', price: 4500, compare_price: 6000, img: 'https://images.unsplash.com/photo-1596755094514-f87e32f85e2c?w=500&q=80' },
  { catSlug: 'mens-fashion-x1', name: 'سترة شتوية فاخرة', price: 8500, compare_price: 12000, img: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=500&q=80' },
  { catSlug: 'mens-fashion-x1', name: 'سروال جينز عصري', price: 5500, compare_price: 7000, img: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=500&q=80' },
  { catSlug: 'mens-fashion-x1', name: 'طقم رياضي مريح', price: 6500, compare_price: 8500, img: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=500&q=80' },
  { catSlug: 'mens-fashion-x1', name: 'حذاء كلاسيكي من الجلد', price: 9500, compare_price: 13000, img: 'https://images.unsplash.com/photo-1614252232525-a1bd33b70830?w=500&q=80' },

  // Women's
  { catSlug: 'womens-fashion-x1', name: 'فستان سهرة أنيق - أسود', price: 12000, compare_price: 18000, img: 'https://images.unsplash.com/photo-1539008835657-9e8e9680c956?w=500&q=80' },
  { catSlug: 'womens-fashion-x1', name: 'حقيبة يد جلدية فاخرة', price: 7500, compare_price: 10000, img: 'https://images.unsplash.com/photo-1584916201218-f4242ceb4809?w=500&q=80' },
  { catSlug: 'womens-fashion-x1', name: 'بلوزة صيفية ناعمة', price: 3500, compare_price: 5000, img: 'https://images.unsplash.com/photo-1515347619362-717472aa7dc2?w=500&q=80' },
  { catSlug: 'womens-fashion-x1', name: 'حذاء كعب عالي كلاسيكي', price: 8000, compare_price: 11500, img: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=500&q=80' },
  { catSlug: 'womens-fashion-x1', name: 'نظارات شمسية عصرية نسائية', price: 4500, compare_price: 6500, img: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=500&q=80' },

  // Accessories
  { catSlug: 'accessories-x1', name: 'طقم مجوهرات مطلي بالذهب', price: 15000, compare_price: 22000, img: 'https://images.unsplash.com/photo-1599643478514-4a4204b37016?w=500&q=80' },
  { catSlug: 'accessories-x1', name: 'سوار أنيق بتصميم عصري', price: 3000, compare_price: 4500, img: 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=500&q=80' },
  { catSlug: 'accessories-x1', name: 'خاتم زواج كلاسيكي', price: 8500, compare_price: 12000, img: 'https://images.unsplash.com/photo-1605100804763-247f67b2548e?w=500&q=80' },
  { catSlug: 'accessories-x1', name: 'قلادة فضية لامعة', price: 6000, compare_price: 8000, img: 'https://images.unsplash.com/photo-1599643477877-530eb83abc8e?w=500&q=80' },
  { catSlug: 'accessories-x1', name: 'محفظة رجالية من الجلد الطبيعي', price: 4500, compare_price: 6500, img: 'https://images.unsplash.com/photo-1627123424574-724758594e93?w=500&q=80' },

  // Watches
  { catSlug: 'watches-x1', name: 'ساعة رجالية فخمة - فضي وأسود', price: 25000, compare_price: 35000, img: 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=500&q=80' },
  { catSlug: 'watches-x1', name: 'ساعة نسائية رقيقة مرصعة', price: 18000, compare_price: 26000, img: 'https://images.unsplash.com/photo-1587925358603-c2eea5305bbc?w=500&q=80' },
  { catSlug: 'watches-x1', name: 'ساعة رياضية ذكية', price: 12000, compare_price: 16000, img: 'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=500&q=80' },
  { catSlug: 'watches-x1', name: 'ساعة كلاسيكية بحزام جلدي', price: 15500, compare_price: 21000, img: 'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=500&q=80' },

  // Perfumes
  { catSlug: 'perfumes-x1', name: 'عطر فرنسي جذاب للرجال', price: 12500, compare_price: 17000, img: 'https://images.unsplash.com/photo-1588405748880-12d1d2a59f75?w=500&q=80' },
  { catSlug: 'perfumes-x1', name: 'عطر نسائي برائحة الزهور', price: 14000, compare_price: 19500, img: 'https://images.unsplash.com/photo-1594035910387-fea47794261f?w=500&q=80' },
  { catSlug: 'perfumes-x1', name: 'عطر ليلي فخم', price: 18000, compare_price: 25000, img: 'https://images.unsplash.com/photo-1541643600914-78b084683601?w=500&q=80' },
  { catSlug: 'perfumes-x1', name: 'مجموعة العناية بالبشرة', price: 9500, compare_price: 13500, img: 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=500&q=80' },

  // Electronics
  { catSlug: 'electronics-x1', name: 'سماعات رأس لاسلكية عازلة للصوت', price: 11000, compare_price: 15000, img: 'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=500&q=80' },
  { catSlug: 'electronics-x1', name: 'باور بانك 20000 مللي أمبير', price: 4500, compare_price: 6000, img: 'https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=500&q=80' },
  { catSlug: 'electronics-x1', name: 'سماعات بلوتوث رياضية صغيرة', price: 6500, compare_price: 9000, img: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=500&q=80' },
  { catSlug: 'electronics-x1', name: 'شاحن سريع لاسلكي', price: 3500, compare_price: 5000, img: 'https://images.unsplash.com/photo-1586953208448-b95a794e77ee?w=500&q=80' },
  { catSlug: 'electronics-x1', name: 'ساعة ذكية لمراقبة اللياقة', price: 8500, compare_price: 12500, img: 'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=500&q=80' }
];

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Insert categories and map them
    const catMap = {};
    for (const c of categoriesData) {
      const res = await client.query(
        'INSERT INTO categories (user_id, name, slug) VALUES ($1, $2, $3) RETURNING id',
        [OUSSAMA_ID, c.name, c.slug]
      );
      catMap[c.slug] = res.rows[0].id;
    }

    // Insert products
    for (const p of productsData) {
      const catId = catMap[p.catSlug];
      const slug = p.name.replace(/\\s+/g, '-').substring(0, 30) + '-' + Math.floor(Math.random() * 1000);
      
      const pRes = await client.query(`
        INSERT INTO products 
        (user_id, category_id, name, slug, price, compare_price, description, stock, image)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id
      `, [
        OUSSAMA_ID, catId, p.name, slug, p.price, p.compare_price, 
        'هذا المنتج هو أحد أفضل اختياراتنا لك، مصنوع بدقة وجودة عالية ليدوم طويلاً ويلبي كل تطلعاتك. يتميز بتصميمه المريح والمبتكر الذي يجعله مثالياً للاستخدام اليومي أو المناسبات الخاصة. لا تفوت فرصة اقتناء هذا المنتج الرائع بسعر لا يُعوض.', 
        Math.floor(Math.random() * 50) + 10, p.img
      ]);
    }

    await client.query('COMMIT');
    console.log('✅ تم إضافة المنتجات بنجاح!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ خطأ:', err);
  } finally {
    client.release();
    pool.end();
  }
}

seed();
