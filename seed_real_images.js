const db = require('./db');

const products = [
  { name: 'حقيبة ظهر عملية', price: 3500, cat: 'عطور وإكسسوارات', slug: 'bag', desc: 'حقيبة ظهر متينة وتتسع لجهاز كمبيوتر محمول', image: 'https://fakestoreapi.com/img/81fPKd-2AYL._AC_SL1500_.jpg' },
  { name: 'تي شيرت رجالي قطني', price: 2500, cat: 'ملابس رجالية', slug: 'tshirt-men', desc: 'تي شيرت قطني 100% مريح جدا', image: 'https://fakestoreapi.com/img/71-3HjGNDUL._AC_SY879._SX._UX._SY._UY_.jpg' },
  { name: 'سترة قطنية خفيفة', price: 4500, cat: 'ملابس رجالية', slug: 'cotton-jacket', desc: 'سترة خفيفة رائعة للأجواء المعتدلة', image: 'https://fakestoreapi.com/img/71li-ujtl-L._AC_UX679_.jpg' },
  { name: 'قميص ضيق بأكمام', price: 3800, cat: 'ملابس رجالية', slug: 'slim-shirt', desc: 'قميص رجالي أنيق مناسب للعمل', image: 'https://fakestoreapi.com/img/71YXzeOuslL._AC_UY879_.jpg' },
  { name: 'سوار ذهبي نسائي', price: 12000, cat: 'عطور وإكسسوارات', slug: 'gold-bracelet', desc: 'سوار أنيق بتصميم عصري', image: 'https://fakestoreapi.com/img/71pWzhdJNwL._AC_UL640_QL65_ML3_.jpg' },
  { name: 'خاتم زواج فضي', price: 8000, cat: 'عطور وإكسسوارات', slug: 'silver-ring', desc: 'خاتم فضة أصلي', image: 'https://fakestoreapi.com/img/61sbMiUnoGL._AC_UL640_QL65_ML3_.jpg' },
  { name: 'قرص تخزين SSD 1TB', price: 14500, cat: 'إلكترونيات', slug: 'ssd-1tb', desc: 'قرص تخزين سريع جدا', image: 'https://fakestoreapi.com/img/61IBBVJvSDL._AC_SY879_.jpg' },
  { name: 'قرص تخزين SSD 256GB', price: 6500, cat: 'إلكترونيات', slug: 'ssd-256', desc: 'قرص تخزين سريع للابتوب', image: 'https://fakestoreapi.com/img/61U7T1koQqL._AC_SX679_.jpg' },
  { name: 'شاشة ألعاب 27 بوصة', price: 42000, cat: 'إلكترونيات', slug: 'gaming-monitor', desc: 'شاشة بجودة عالية وتردد عالي', image: 'https://fakestoreapi.com/img/81QpkIctqPL._AC_SX679_.jpg' },
  { name: 'جاكيت نسائي شتوي', price: 9500, cat: 'ملابس رجالية', slug: 'winter-jacket', desc: 'جاكيت سميك ودافئ جدا', image: 'https://fakestoreapi.com/img/51Y5NI-I5jL._AC_UX679_.jpg' }
];

async function seed() {
  try {
    const userId = 2; // oussamastore

    // Delete old picsum products
    await db.query(`DELETE FROM products WHERE image LIKE '%picsum.photos%'`);

    // Ensure categories exist
    const catsRes = await db.query('SELECT id, name FROM categories WHERE user_id = $1', [userId]);
    const catMap = {};
    for(const c of catsRes.rows) { catMap[c.name] = c.id; }

    for (const p of products) {
      const catId = catMap[p.cat] || Object.values(catMap)[0];
      await db.query(`
        INSERT INTO products (user_id, category_id, name, slug, description, price, compare_price, image, images, stock)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [userId, catId, p.name, p.slug, p.desc, p.price, p.price * 1.3, p.image, '[]', 100]);
    }
    
    console.log('Real images seeded!');
  } catch (err) {
    console.error(err);
  }
}
seed();
