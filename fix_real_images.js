const db = require('./db');

const products = [
  { name: 'حقيبة ظهر عملية', image: 'https://fakestoreapi.com/img/81fPKd-2AYL._AC_SL1500_t.png' },
  { name: 'تي شيرت رجالي قطني', image: 'https://fakestoreapi.com/img/71-3HjGNDUL._AC_SY879._SX._UX._SY._UY_t.png' },
  { name: 'سترة قطنية خفيفة', image: 'https://fakestoreapi.com/img/71li-ujtlUL._AC_UX679_t.png' },
  { name: 'قميص ضيق بأكمام', image: 'https://fakestoreapi.com/img/71YXzeOuslL._AC_UY879_t.png' },
  { name: 'سوار ذهبي نسائي', image: 'https://fakestoreapi.com/img/71pWzhdJNwL._AC_UL640_QL65_ML3_t.png' },
  { name: 'خاتم زواج فضي', image: 'https://fakestoreapi.com/img/61sbMiUnoGL._AC_UL640_QL65_ML3_t.png' },
  { name: 'قرص تخزين SSD 1TB', image: 'https://fakestoreapi.com/img/61IBBVJvSDL._AC_SY879_t.png' },
  { name: 'قرص تخزين SSD 256GB', image: 'https://fakestoreapi.com/img/61U7T1koQqL._AC_SX679_t.png' },
  { name: 'شاشة ألعاب 27 بوصة', image: 'https://fakestoreapi.com/img/81QpkIctqPL._AC_SX679_t.png' },
  { name: 'جاكيت نسائي شتوي', image: 'https://fakestoreapi.com/img/51Y5NI-I5jL._AC_UX679_t.png' }
];

async function seed() {
  try {
    const userId = 2; // oussamastore

    for (const p of products) {
      await db.query(`UPDATE products SET image = $1 WHERE name = $2`, [p.image, p.name]);
    }
    
    console.log('Real images fixed!');
  } catch (err) {
    console.error(err);
  }
}
seed();
