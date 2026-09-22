
const fs = require("fs");
let notifs = fs.readFileSync("routes/notifications.js", "utf8");

// Fix GET /
notifs = notifs.replace(
  /SELECT \* FROM notifications WHERE user_id = \$1 ORDER BY created_at DESC LIMIT \$2\x27,\n\s*\[userId, 50\]/,
  "SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50\x27,\n      [userId]"
);

// Fix PATCH /:id/read
notifs = notifs.replace(
  /UPDATE notifications SET is_read = 1, read_at = \\\$2 WHERE id = \\\$1 AND user_id = \\\$2\x27,\n\s*\[req\.params\.id, userId\]/,
  "UPDATE notifications SET is_read = 1, read_at = CURRENT_TIMESTAMP WHERE id = $1 AND user_id = $2\x27,\n      [req.params.id, userId]"
);

// Fix PATCH /read-all
notifs = notifs.replace(
  /UPDATE notifications SET is_read = 1, read_at = \\\$2 WHERE user_id = \\\$1\x27,\n\s*\[userId, new Date\(\)\.toISOString\(\)\]/,
  "UPDATE notifications SET is_read = 1, read_at = CURRENT_TIMESTAMP WHERE user_id = $1\x27,\n      [userId]"
);

// Fix DELETE /unregister
notifs = notifs.replace(
  /DELETE FROM push_subscriptions WHERE endpoint = \\\$1 AND user_id = \\\$2\x27,\n\s*\[req\.body\.endpoint\]/,
  "DELETE FROM push_subscriptions WHERE endpoint = $1\x27,\n      [req.body.endpoint]"
); // Or user_id = $2, [req.body.endpoint, userId]

fs.writeFileSync("routes/notifications.js", notifs);

