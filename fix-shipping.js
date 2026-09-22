
const fs = require("fs");
let ordersjs = fs.readFileSync("routes/orders.js", "utf8");

// We need to require ShippingService
if (!ordersjs.includes("ShippingService")) {
    ordersjs = ordersjs.replace(/const db = require\(\x27\.\.\/db\x27\);/, "const db = require(\x27../db\x27);\nconst ShippingService = require(\x27../services/shippingService\x27);");
}

// In POST /
// Replace:
// const rate = await db.get(\x27SELECT * FROM delivery_rates WHERE wilaya_code = $1\x27, [wilaya_code]);
// if (!rate) return res.status(400).json({ error: \x27ولاية غير معروفة\x27 });
//
// And down inside trx, replace delivery_price logic.
const regex = /const rate = await db\.get\(\x27SELECT \* FROM delivery_rates WHERE wilaya_code = \$1\x27, \[wilaya_code\]\);\n\s+if \(!rate\) return res\.status\(400\)\.json\(\{ error: \x27ولاية غير معروفة\x27 \}\);/g;

ordersjs = ordersjs.replace(regex, `const shippingResult = await ShippingService.calculateDeliveryCost(store_id, wilaya_code, commune, delivery_type);
    if (shippingResult.is_unavailable) {
      return res.status(400).json({ error: "التوصيل غير متاح لهذه الولاية." });
    }
    const finalDeliveryPrice = shippingResult.price;`);

// Then replace the delivery_price calculation.
ordersjs = ordersjs.replace(
  /const delivery_price = delivery_type === \x27desk\x27 \? parseFloat\(rate\.desk_fee \|\| 0\) : parseFloat\(rate\.home_fee \|\| 0\);/,
  "const delivery_price = finalDeliveryPrice;"
);

// Fix trackParcel in ShippingService
let ss = fs.readFileSync("services/shippingService.js", "utf8");
// "trackParcel يغيّر حالة الطلب مباشرة دون إعادة المخزون ودون سجل الحالات، بخلاف مسار تغيير الحالة اليدوي."
// Actually trackParcel should only update tracking_status, NOT internal_status (order.status) if we want to avoid stock discrepancies.
ss = ss.replace(
  /UPDATE orders\n\s+SET tracking_status = \$1, return_reason = \$2, status = \$3/,
  "UPDATE orders\n         SET tracking_status = $1, return_reason = $2"
);

// Wait, the parameters are 4: [lastStatus, reason, internalStatus, order.id]
// I should just change the SQL but keep the params since changing params without regex groups is hard.
ss = ss.replace(
  /SET tracking_status = \$1, return_reason = \$2, status = \$3/,
  "SET tracking_status = $1, return_reason = $2"
);

fs.writeFileSync("routes/orders.js", ordersjs);
fs.writeFileSync("services/shippingService.js", ss);

