
const fs = require("fs");
let notifs = fs.readFileSync("routes/notifications.js", "utf8");

notifs = notifs.replace("LIMIT $2", "LIMIT 50");
notifs = notifs.replace("[userId, 50]", "[userId]");

notifs = notifs.replace("read_at = $2 WHERE id = $1 AND user_id = $2", "read_at = CURRENT_TIMESTAMP WHERE id = $1 AND user_id = $2");
notifs = notifs.replace("[req.params.id, userId]", "[req.params.id, userId]"); // keep

notifs = notifs.replace("read_at = $2 WHERE user_id = $1", "read_at = CURRENT_TIMESTAMP WHERE user_id = $1");
notifs = notifs.replace("[userId, new Date().toISOString()]", "[userId]");

notifs = notifs.replace("user_id = $2", "user_id = $2");
notifs = notifs.replace("[req.body.endpoint]", "[req.body.endpoint, userId]");

// And fix NOW() in notifications
notifs = notifs.replace(/NOW\(\)/g, "CURRENT_TIMESTAMP");

fs.writeFileSync("routes/notifications.js", notifs);

