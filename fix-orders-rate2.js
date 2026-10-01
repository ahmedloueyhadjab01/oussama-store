
const fs = require("fs");
let code = fs.readFileSync("routes/orders.js", "utf8");

code = code.replace(
  /rate\.wilaya_code,\n            rate\.wilaya_name,/g,
  "wilaya_code,\n            wilaya_name,"
);

fs.writeFileSync("routes/orders.js", code);

