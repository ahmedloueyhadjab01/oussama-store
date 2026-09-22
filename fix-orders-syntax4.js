
const fs = require("fs");
let code = fs.readFileSync("routes/orders.js", "utf8");

code = code.replace(
  /total: parseInt\(countsRow\?\.total \|\| 0, 10\),\n    \},\n  \}\);\n\xEF\xBB\xBF\n\n\n\/\/ أرشفة/g,
  "total: parseInt(countsRow?.total || 0, 10),\n    },\n  });\n});\n\n// أرشفة"
);

fs.writeFileSync("routes/orders.js", code);

