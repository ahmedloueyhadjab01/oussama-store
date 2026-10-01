
const fs = require("fs");
let ordersjs = fs.readFileSync("routes/orders.js", "utf8");
const pStart = ordersjs.indexOf("router.get(\"/profit-30d\"");
const pEnd = ordersjs.indexOf("});\n\nconst express =");
const profitRoute = ordersjs.substring(pStart, pEnd + 3);
ordersjs = ordersjs.substring(pEnd + 5);

// Put it at the bottom before module.exports
ordersjs = ordersjs.replace(/module\.exports = router;/, profitRoute + "\n\nmodule.exports = router;");

// Fix `user_id = $1` to `user_id = $2`
ordersjs = ordersjs.replace(/AND user_id = \$1/g, "AND user_id = $2");

fs.writeFileSync("routes/orders.js", ordersjs);

