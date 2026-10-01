
const fs = require("fs");
let code = fs.readFileSync("routes/orders.js", "utf8");

code = code.replace(
  /router\.get\("\/profit-30d", requireAuth, async \(req, res\) => \{\n\s*const userId =/g,
  "router.get(\x27/profit-30d\x27, requireAuth, async (req, res) => {\n  try {\n  const userId ="
);

fs.writeFileSync("routes/orders.js", code);

