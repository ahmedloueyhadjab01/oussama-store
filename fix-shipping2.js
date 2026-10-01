
const fs = require("fs");
let ss = fs.readFileSync("services/shippingService.js", "utf8");

ss = ss.replace(
  /config\.flat_home_price = parseFloat\(config\.flat_home_price\) \|\| 600;/g,
  "const hp = parseFloat(config.flat_home_price); config.flat_home_price = isNaN(hp) ? 600 : hp;"
);
ss = ss.replace(
  /config\.flat_desk_price = parseFloat\(config\.flat_desk_price\) \|\| 350;/g,
  "const dp = parseFloat(config.flat_desk_price); config.flat_desk_price = isNaN(dp) ? 350 : dp;"
);
ss = ss.replace(
  /config\.free_shipping_threshold = parseFloat\(config\.free_shipping_threshold\) \|\| 15000;/g,
  "const fst = parseFloat(config.free_shipping_threshold); config.free_shipping_threshold = isNaN(fst) ? 15000 : fst;"
);

// Fix flat/custom priority in calculateDeliveryCost
// The issue is `if (config.pricing_mode === "flat") return ...` is checked first.
// I will swap Custom and API/Flat if necessary, or just rely on pricing_mode. Wait, if pricing_mode is custom, does it check custom first?
// Let me look at calculateDeliveryCost.
fs.writeFileSync("services/shippingService.js", ss);

