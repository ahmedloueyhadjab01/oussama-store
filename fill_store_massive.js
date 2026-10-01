const db = require('./db');

const newProducts = [
  // Electronics (Laptops & Smartphones)
  { name: 'هاتف ذكي 256 جيجابايت', price: 85000, cat: 'إلكترونيات', slug: 'smart-phone-pro', desc: 'هاتف ذكي رائد بكاميرا فائقة الدقة', image: 'https://cdn.dummyjson.com/products/images/smartphones/iPhone%20X/1.png' },
  { name: 'لابتوب احترافي 16 بوصة', price: 150000, cat: 'إلكترونيات', slug: 'laptop-pro', desc: 'حاسوب محمول للأعمال والمونتاج بمعالج قوي', image: 'https://cdn.dummyjson.com/products/images/laptops/MacBook%20Pro/1.png' },
  { name: 'ساعة ذكية بشاشة OLED', price: 12000, cat: 'إلكترونيات', slug: 'oled-watch', desc: 'ساعة ذكية مقاومة للماء وتدعم تتبع اللياقة', image: 'https://cdn.dummyjson.com/product-images/mens-watches/rolex-submariner-watch/1.webp' },
  { name: 'جهاز لوحي للرسم', price: 35000, cat: 'إلكترونيات', slug: 'drawing-tablet', desc: 'جهاز لوحي مخصص للتصميم والرسم الرقمي', image: 'https://cdn.dummyjson.com/products/images/tablets/iPad%20Mini%202021%20Starlight/1.png' },
  { name: 'هاتف مميز 128 جيجا', price: 65000, cat: 'إلكترونيات', slug: 'smart-phone-128', desc: 'هاتف ذكي بسعر مناسب وبطارية تدوم طويلاً', image: 'https://cdn.dummyjson.com/products/images/smartphones/iPhone%2013%20Pro/1.png' },

  // Men's Clothing
  { name: 'قميص صيفي مخطط', price: 3200, cat: 'ملابس رجالية', slug: 'striped-shirt', desc: 'قميص رجالي مخطط خفيف ومريح', image: 'https://cdn.dummyjson.com/product-images/mens-shirts/man-short-sleeve-shirt/1.webp' },
  { name: 'قميص كلاسيكي للمناسبات', price: 4500, cat: 'ملابس رجالية', slug: 'classic-shirt', desc: 'قميص مناسب للحفلات والاجتماعات', image: 'https://cdn.dummyjson.com/product-images/mens-shirts/men-check-shirt/1.webp' },
  { name: 'جاكيت شتوي أنيق', price: 8500, cat: 'ملابس رجالية', slug: 'winter-coat-men', desc: 'معطف شتوي دافئ وعصري', image: 'https://fakestoreapi.com/img/71li-ujtlUL._AC_UX679_t.png' },
  { name: 'سروال رياضي مريح', price: 2500, cat: 'ملابس رجالية', slug: 'sweatpants', desc: 'سروال قطني مناسب للتمارين', image: 'https://cdn.dummyjson.com/products/images/mens-shirts/Gigabyte%20Aorus%20Men%20Tshirt/1.png' }, // Placeholder image
  { name: 'تي شيرت قطن أصلي', price: 1500, cat: 'ملابس رجالية', slug: 'cotton-tshirt', desc: 'تيشيرت يومي بألوان متعددة', image: 'https://fakestoreapi.com/img/71-3HjGNDUL._AC_SY879._SX._UX._SY._UY_t.png' },

  // Sports Shoes
  { name: 'حذاء ركض خفيف', price: 5500, cat: 'أحذية رياضية', slug: 'running-sneakers', desc: 'حذاء مرن جدا لراحتك أثناء الجري', image: 'https://cdn.dummyjson.com/product-images/mens-shoes/nike-baseball-cleats/1.webp' },
  { name: 'حذاء كرة سلة احترافي', price: 8500, cat: 'أحذية رياضية', slug: 'basketball-shoes', desc: 'حذاء يحمي الكاحل ويوفر ثباتا عاليا', image: 'https://cdn.dummyjson.com/product-images/mens-shoes/puma-future-rider-trainers/1.webp' },
  { name: 'حذاء كاجوال يومي', price: 4200, cat: 'أحذية رياضية', slug: 'casual-sneaker', desc: 'تصميم أنيق يناسب كل ملابسك', image: 'https://cdn.dummyjson.com/product-images/mens-shoes/sports-sneakers-off-white-&-red/1.webp' },
  { name: 'حذاء رياضي متطور', price: 9500, cat: 'أحذية رياضية', slug: 'pro-sneaker', desc: 'مريح جدا ومصمم بتقنيات حديثة لامتصاص الصدمات', image: 'https://cdn.dummyjson.com/product-images/mens-shoes/nike-air-jordan-1-red-and-black/1.webp' },
  
  // Accessories & Perfumes
  { name: 'عطر فرنسي فاخر', price: 12000, cat: 'عطور وإكسسوارات', slug: 'luxury-perfume', desc: 'عطر ذو رائحة جذابة تدوم طويلا', image: 'https://cdn.dummyjson.com/products/images/fragrances/Chanel%20Coco%20Noir%20Eau%20De/1.png' },
  { name: 'عطر كلاسيكي أصلي', price: 8500, cat: 'عطور وإكسسوارات', slug: 'classic-perfume', desc: 'رائحة المسك والعود الأصيلة', image: 'https://cdn.dummyjson.com/products/images/fragrances/Dior%20J\'adore/1.png' },
  { name: 'نظارات شمسية عصرية', price: 3500, cat: 'عطور وإكسسوارات', slug: 'fashion-sunglasses', desc: 'نظارات أنيقة تحمي من الأشعة الفوق بنفسجية', image: 'https://cdn.dummyjson.com/products/images/sunglasses/Classic%20Sun%20Glasses/1.png' },
  { name: 'حقيبة سفر صغيرة', price: 6500, cat: 'عطور وإكسسوارات', slug: 'travel-bag', desc: 'حقيبة عملية مناسبة للرحلات القصيرة', image: 'https://cdn.dummyjson.com/products/images/womens-bags/Blue%20Women\'s%20Handbag/1.png' },
  { name: 'طقم إكسسوارات ذهبية', price: 15000, cat: 'عطور وإكسسوارات', slug: 'gold-accessories', desc: 'طقم متكامل بتصميم جذاب', image: 'https://cdn.dummyjson.com/products/images/womens-jewellery/Rose%20Gold%20Plated%20Signet%20Ring/1.png' },
  { name: 'حزام جلدي أصلي', price: 2800, cat: 'عطور وإكسسوارات', slug: 'leather-belt', desc: 'حزام متين من الجلد الطبيعي', image: 'https://fakestoreapi.com/img/81fPKd-2AYL._AC_SL1500_t.png' } // Re-using backpack placeholder
];

async function seed() {
  try {
    const userId = 2; // oussamastore

    const catsRes = await db.query('SELECT id, name FROM categories WHERE user_id = $1', [userId]);
    const catMap = {};
    for(const c of catsRes.rows) { catMap[c.name] = c.id; }

    for (let i = 0; i < newProducts.length; i++) {
      const p = newProducts[i];
      const catId = catMap[p.cat] || Object.values(catMap)[0];
      // Check if product already exists to avoid duplicates if run multiple times
      const existing = await db.query('SELECT id FROM products WHERE slug = $1 AND user_id = $2', [p.slug, userId]);
      
      if (existing.rows.length === 0) {
        await db.query(`
          INSERT INTO products (user_id, category_id, name, slug, description, price, compare_price, image, images, stock)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `, [userId, catId, p.name, p.slug, p.desc, p.price, Math.round(p.price * 1.25), p.image, '[]', 100]);
      }
    }
    
    console.log('Massive store fill completed!');
  } catch (err) {
    console.error(err);
  }
}
seed();
