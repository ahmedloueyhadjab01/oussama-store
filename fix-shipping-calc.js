
const fs = require("fs");
let ordersjs = fs.readFileSync("routes/orders.js", "utf8");

// Fix shipping_cost calculation
ordersjs = ordersjs.replace(
  /Number\(o\.shipping_cost_actual \|\| o\.delivery_price\)/g,
  "(o.shipping_cost_actual !== null && o.shipping_cost_actual !== \x27\x27 ? Number(o.shipping_cost_actual) : Number(o.delivery_price))"
);

ordersjs = ordersjs.replace(
  /parseFloat\(order\.shipping_cost_actual\) \|\| parseFloat\(order\.delivery_price\) \|\| 0/g,
  "(order.shipping_cost_actual !== null && order.shipping_cost_actual !== \x27\x27 ? parseFloat(order.shipping_cost_actual) : parseFloat(order.delivery_price)) || 0"
);

// Fix settings & missing routes
// Let\x27s see if they are in other files or just missing. I will write a script to inject them in auth.js and settings.js if settings doesn\x27t exist.
fs.writeFileSync("routes/orders.js", ordersjs);

