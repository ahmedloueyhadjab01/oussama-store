
const fs = require("fs");
let orders = fs.readFileSync("routes/orders.js", "utf8");

orders = orders.replace(/user_id = \$2/g, "user_id = $1");

// And fix order_id = $1 in /profit-30d? Wait, /profit-30d had WHERE order_id = $1 ORDER BY created_at ASC\x27, [req.params.id] -- that was the history route!!
// Let\x27s check what replacing user_id = $2 does.
fs.writeFileSync("routes/orders.js", orders);

