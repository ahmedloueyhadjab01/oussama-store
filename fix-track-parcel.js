
const fs = require("fs");
let code = fs.readFileSync("services/shippingService.js", "utf8");

code = code.replace(
  /UPDATE orders\\s+SET tracking_status = \\\$1, return_reason = \\\$2\\s+WHERE id = \\\$4\x60,\n\s*\[lastStatus, reason, internalStatus, order\.id\]/g,
  "UPDATE orders\\n         SET tracking_status = $1, return_reason = $2\\n         WHERE id = $3\x60,\\n        [lastStatus, reason, order.id]"
);

fs.writeFileSync("services/shippingService.js", code);

