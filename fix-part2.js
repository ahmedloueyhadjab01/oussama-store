
const fs = require("fs");
let ordersjs = fs.readFileSync("routes/orders.js", "utf8");

// Fix duplicate check
ordersjs = ordersjs.replace(
  /AND created_at >= NOW\(\) - INTERVAL \x2710 minutes\x27\n\s*AND status IN \(\x27([^]+?)\x27, \x27([^]+?)\x27\)/,
  "AND created_at >= $3\n         AND status IN (\x27$1\x27, \x27$2\x27)"
);

ordersjs = ordersjs.replace(
  /\[store_id, phone\.trim\(\)\]/,
  "[store_id, phone.trim(), new Date(Date.now() - 10 * 60 * 1000).toISOString()]"
);

// Fix Notifications NOW()
let notifjs = fs.readFileSync("routes/notifications.js", "utf8");
notifjs = notifjs.replace(/NOW\(\)/g, "\x27" + new Date().toISOString() + "\x27"); 
// wait, replacing NOW() globally in string queries with hardcoded date string might not be good for the server runtime, better parameterize or use javascript Date.now.
fs.writeFileSync("routes/orders.js", ordersjs);

