
const fs = require("fs");
let ordersjs = fs.readFileSync("routes/orders.js", "utf8");

ordersjs = ordersjs.replace(
  /\} else \{\s+await trx\.query\(\s*"DELETE FROM orders WHERE status IN \(\x27تم التسليم\x27, \x27ملغي\x27, \x27مرتجع\x27, \x27تعذر التوصيل\x27\)"\s*\);\s*\}/,
  `} else {
        await trx.query(
          \`UPDATE financial_archive
           SET archived_sales = archived_sales + $1,
               archived_cogs = archived_cogs + $2,
               archived_shipping_cost = archived_shipping_cost + $3
           WHERE user_id IS NULL\`,
          [deliveredSales, deliveredCogs, returnedShippingCost]
        );
        await trx.query(
          "DELETE FROM orders WHERE status IN (\x27تم التسليم\x27, \x27ملغي\x27, \x27مرتجع\x27, \x27تعذر التوصيل\x27)"
        );
      }`
);

fs.writeFileSync("routes/orders.js", ordersjs);

