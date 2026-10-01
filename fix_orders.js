const db = require('./db');

async function fixOrders() {
  try {
    await db.initDb();
    await db.query(`UPDATE orders SET status = 'قيد التوصيل' WHERE status = 'تم التوصيل'`);
    await db.query(`UPDATE orders SET status = 'تم التسليم' WHERE status = 'مكتمل'`);
    await db.query(`UPDATE orders SET status = 'ملغي' WHERE status = 'ملغى'`);
    await db.query(`UPDATE orders SET status = 'قيد المعالجة' WHERE status = 'جديد'`);
    console.log("Orders statuses fixed!");
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
fixOrders();
