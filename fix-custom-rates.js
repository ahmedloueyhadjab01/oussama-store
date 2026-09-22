
const fs = require("fs");
let shipping = fs.readFileSync("routes/shipping.js", "utf8");

shipping = shipping.replace(
  /COALESCE\(v\.home_price, 0\) AS home_price,\n\s+COALESCE\(v\.desk_price, 0\) AS desk_price,\n\s+COALESCE\(v\.is_deliverable, 0\) AS is_deliverable/g,
  `COALESCE(v.home_price, d.home_price) AS home_price,
       COALESCE(v.desk_price, d.desk_price) AS desk_price,
       COALESCE(v.is_deliverable, 1) AS is_deliverable`
);

fs.writeFileSync("routes/shipping.js", shipping);

