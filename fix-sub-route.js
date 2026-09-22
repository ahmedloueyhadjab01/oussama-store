
const fs = require("fs");
let authjs = fs.readFileSync("routes/auth.js", "utf8");

const subRoute = `
// Dummy subscription route to prevent 404
router.get("/subscription", requireAuth, (req, res) => {
  res.json({ is_active: true, plan: "annual", ends_at: new Date(Date.now() + 365*24*60*60*1000).toISOString() });
});
`;

authjs = authjs.replace(/module\.exports = router;/, subRoute + "\nmodule.exports = router;");
fs.writeFileSync("routes/auth.js", authjs);

let serverjs = fs.readFileSync("server.js", "utf8");
// Map /api/subscription to authRoutes just in case
serverjs = serverjs.replace(
  /app\.use\(\x27\/api\/auth\x27, authRoutes\);/,
  "app.use(\x27/api/auth\x27, authRoutes);\napp.use(\x27/api/subscription\x27, authRoutes);"
);
fs.writeFileSync("server.js", serverjs);

