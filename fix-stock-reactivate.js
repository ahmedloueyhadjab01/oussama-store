
const fs = require("fs");
let orders = fs.readFileSync("routes/orders.js", "utf8");

orders = orders.replace(
  /for \(const item of items\) \{\s+await decrementStock\(item, trx\);\s+\}/g,
  `for (const item of items) {
          const success = await decrementStock(item, trx);
          if (!success) throw new Error("لا يوجد مخزون كافٍ للمنتج: " + item.name);
        }`
);

fs.writeFileSync("routes/orders.js", orders);

