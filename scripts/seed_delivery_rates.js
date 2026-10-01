/**
 * seed_delivery_rates.js
 * يملأ جدول delivery_rates بأسعار شركة تيسير للتوصيل انطلاقاً من المسيلة (ولاية 28)
 * المصدر: Offre Tarifaire Classique départ M'Sila - Tayssir Delivery
 * تشغيل: node scripts/seed_delivery_rates.js
 */

const db = require('../db');

const rates = [
  { code: 16, name: 'الجزائر',           home: 800,  desk: 500  },
  { code: 9,  name: 'البليدة',           home: 800,  desk: 500  },
  { code: 42, name: 'تيبازة',            home: 800,  desk: 500  },
  { code: 15, name: 'تيزي وزو',          home: 900,  desk: 500  },
  { code: 35, name: 'بومرداس',           home: 800,  desk: 500  },
  { code: 26, name: 'المدية',            home: 900,  desk: 600  },
  { code: 34, name: 'برج بوعريريج',      home: 900,  desk: 600  },
  { code: 44, name: 'عين الدفلى',        home: 1000, desk: 700  },
  { code: 6,  name: 'بجاية',             home: 900,  desk: 600  },
  { code: 5,  name: 'باتنة',             home: 900,  desk: 600  },
  { code: 25, name: 'قسنطينة',           home: 1000, desk: 700  },
  { code: 29, name: 'معسكر',             home: 980,  desk: 600  },
  { code: 43, name: 'ميلة',              home: 940,  desk: 600  },
  { code: 27, name: 'مستغانم',           home: 940,  desk: 600  },
  { code: 28, name: 'المسيلة',           home: 500,  desk: 400  },
  { code: 31, name: 'وهران',             home: 980,  desk: 600  },
  { code: 4,  name: 'أم البواقي',        home: 980,  desk: 700  },
  { code: 48, name: 'غليزان',            home: 980,  desk: 600  },
  { code: 38, name: 'تيسمسيلت',          home: 980,  desk: 600  },
  { code: 13, name: 'تلمسان',            home: 960,  desk: 600  },
  { code: 22, name: 'سيدي بلعباس',       home: 900,  desk: 600  },
  { code: 19, name: 'سطيف',              home: 900,  desk: 600  },
  { code: 40, name: 'خنشلة',             home: 900,  desk: 600  },
  { code: 18, name: 'جيجل',              home: 1000, desk: 700  },
  { code: 36, name: 'الطارف',            home: 1000, desk: 700  },
  { code: 24, name: 'قالمة',             home: 1000, desk: 700  },
  { code: 21, name: 'سكيكدة',            home: 1000, desk: 700  },
  { code: 20, name: 'سعيدة',             home: 1000, desk: 700  },
  { code: 41, name: 'سوق أهراس',         home: 1000, desk: 700  },
  { code: 12, name: 'تبسة',              home: 900,  desk: 800  },
  { code: 14, name: 'تيارت',             home: 1200, desk: 700  },
  { code: 23, name: 'عنابة',             home: 1000, desk: 700  },
  { code: 17, name: 'الجلفة',            home: 1100, desk: 700  },
  { code: 3,  name: 'الأغواط',           home: 1100, desk: 700  },
  { code: 7,  name: 'بسكرة',             home: 1300, desk: 800  },
  { code: 2,  name: 'الشلف',             home: 1000, desk: 700  },
  { code: 47, name: 'غرداية',            home: 300,  desk: 800  },
  { code: 39, name: 'الوادي',            home: 1300, desk: 900  },
  { code: 30, name: 'ورقلة',             home: 1400, desk: 900  },
  { code: 10, name: 'البويرة',           home: 900,  desk: 600  },
  { code: 32, name: 'البيض',             home: 1300, desk: 1100 },
  { code: 45, name: 'النعامة',           home: 1400, desk: 1300 },
  { code: 8,  name: 'بشار',              home: 1500, desk: 1300 },
  { code: 1,  name: 'أدرار',             home: 1700, desk: 1500 },
  { code: 11, name: 'تمنراست',           home: 2200, desk: 1400 },
  { code: 37, name: 'تندوف',             home: 2000, desk: 1400 },
  { code: 33, name: 'إليزي',             home: 2200, desk: 1400 },
  { code: 46, name: 'عين تموشنت',        home: 900,  desk: 600  },
  { code: 49, name: 'تيميمون',           home: 1700, desk: 1500 },
  { code: 50, name: 'برج باجي مختار',    home: 1700, desk: 1500 },
  { code: 51, name: 'أولاد جلال',        home: 1300, desk: 800  },
  { code: 52, name: 'بني عباس',          home: 1500, desk: 1300 },
  { code: 53, name: 'عين صالح',          home: 2200, desk: 1400 },
  { code: 54, name: 'عين قزام',          home: 2200, desk: 1400 },
  { code: 55, name: 'تقرت',              home: 1400, desk: 900  },
  { code: 56, name: 'جانت',              home: 2200, desk: 1400 },
  { code: 57, name: 'المغير',            home: 1300, desk: 900  },
  { code: 58, name: 'المنيعة',           home: 1300, desk: 1100 },
  { code: 59, name: 'أفلو',              home: 1100, desk: 700  },
  { code: 60, name: 'الأبيض سيدي الشيخ', home: 1300, desk: 1100 },
  { code: 61, name: 'العريشة',           home: 1000, desk: 700  },
  { code: 62, name: 'القنطرة',           home: 1300, desk: 800  },
  { code: 63, name: 'بريكة',             home: 900,  desk: 600  },
  { code: 64, name: 'بوسعادة',           home: 500,  desk: 400  },
  { code: 65, name: 'بير العاتر',        home: 900,  desk: 800  },
  { code: 66, name: 'قصر البخاري',       home: 900,  desk: 600  },
  { code: 67, name: 'قصر الشلالة',       home: 1200, desk: 700  },
  { code: 68, name: 'عين وسارة',         home: 1100, desk: 700  },
  { code: 69, name: 'مسعد',              home: 1100, desk: 700  },
];

async function seedRates() {
  await db.initDb();

  await db.transaction(async (trx) => {
    for (const r of rates) {
      await trx.query(
        `INSERT INTO delivery_rates (wilaya_code, wilaya_name, home_price, desk_price)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT(wilaya_code) DO UPDATE SET
           wilaya_name = EXCLUDED.wilaya_name,
           home_price  = EXCLUDED.home_price,
           desk_price  = EXCLUDED.desk_price`,
        [r.code, r.name, r.home, r.desk]
      );
    }
  });

  console.log(`\n✅ تم تحديث أسعار توصيل تيسير ديليفري لـ ${rates.length} ولاية في PostgreSQL\n`);
  process.exit(0);
}

seedRates().catch((err) => {
  console.error('❌ خطأ:', err.message);
  process.exit(1);
});
