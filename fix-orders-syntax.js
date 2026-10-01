
const fs = require("fs");
let code = fs.readFileSync("routes/orders.js", "utf8");

// Fix the double }); after stats
code = code.replace(/\/\/\s*\.\.\.\s*\n\n\}\);\n\n\n\}\);/, "});");

// Fix the missing end for profit-30d
code = code.replace(
  /top_products\n\s+\}\);\n\nmodule\.exports = router;/g,
  "top_products\n  });\n  } catch (err) { res.status(500).json({error: err.message}); }\n});\n\nmodule.exports = router;"
);

fs.writeFileSync("routes/orders.js", code);

