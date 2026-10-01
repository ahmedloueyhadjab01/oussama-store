
const fs = require("fs");

let ordersjs = fs.readFileSync("routes/orders.js", "utf8");
ordersjs = ordersjs.replace(
  /ShippingService\.calculateDeliveryCost\(store_id, wilaya_code, commune, delivery_type\)/g,
  "ShippingService.calculateShippingCost(store_id, wilaya_code, delivery_type, finalSubtotal)" // wait, finalSubtotal is not defined there!
);
// In POST /, I need to calculate subtotal BEFORE calculating shipping cost!
fs.writeFileSync("routes/orders.js", ordersjs);

