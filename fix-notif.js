
const fs = require("fs");
let notifjs = fs.readFileSync("routes/notifications.js", "utf8");

notifjs = notifjs.replace(/created_at = NOW\(\)/g, "created_at = $3");
notifjs = notifjs.replace(/\[req\.user\.id, req\.params\.id\]/g, "[req.user.id, req.params.id, new Date().toISOString()]");

notifjs = notifjs.replace(/VALUES \(\$1, \$2, \$3, \$4, NOW\(\)\)/g, "VALUES ($1, $2, $3, $4, $5)");
notifjs = notifjs.replace(/\[user_id, title, message, type\]/g, "[user_id, title, message, type, new Date().toISOString()]");

notifjs = notifjs.replace(/SET is_read = 1, read_at = NOW\(\)/g, "SET is_read = 1, read_at = $2");
notifjs = notifjs.replace(/\[req\.user\.id\]/g, "[req.user.id, new Date().toISOString()]");

fs.writeFileSync("routes/notifications.js", notifjs);

