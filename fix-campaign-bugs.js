
const fs = require("fs");
let campaigns = fs.readFileSync("routes/campaigns.js", "utf8");

campaigns = campaigns.replace(
  /parseFloat\(order\.shipping_cost_actual\) \|\| parseFloat\(order\.delivery_price\) \|\| 0/g,
  "(order.shipping_cost_actual !== null && order.shipping_cost_actual !== \x27\x27 ? parseFloat(order.shipping_cost_actual) : parseFloat(order.delivery_price)) || 0"
);

// Fix totalReturnedShippingLoss in campaigns.js
campaigns = campaigns.replace(
  /totalReturnedShippingLoss \+= parseFloat\(order\.shipping_cost_actual\) \|\| parseFloat\(order\.delivery_price\) \|\| 0;/g,
  "totalReturnedShippingLoss += (order.shipping_cost_actual !== null && order.shipping_cost_actual !== \x27\x27 ? parseFloat(order.shipping_cost_actual) : parseFloat(order.delivery_price)) || 0;"
);

fs.writeFileSync("routes/campaigns.js", campaigns);

