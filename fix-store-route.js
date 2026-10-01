
const fs = require("fs");
let serverjs = fs.readFileSync("server.js", "utf8");
serverjs = serverjs.replace(
  /app\.use\(\x27\/api\/settings\x27, settingsRoutes\);/,
  "app.use(\x27/api/settings\x27, settingsRoutes);\napp.use(\x27/api/store\x27, settingsRoutes);"
);
fs.writeFileSync("server.js", serverjs);

