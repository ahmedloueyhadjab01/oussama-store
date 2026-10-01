
const fs = require("fs");
let ordersjs = fs.readFileSync("routes/orders.js", "utf8");

// I need to change:
// const shippingResult = await ShippingService.calculateShippingCost(store_id, wilaya_code, delivery_type, finalSubtotal);
// but I don\x27t have finalSubtotal at that point. I can just pass 0, because free shipping threshold can be calculated later or just pass a rough subtotal.
// Or I can calculate a rough subtotal from req.body.items.
ordersjs = ordersjs.replace(
  /ShippingService\.calculateShippingCost\(store_id, wilaya_code, delivery_type, finalSubtotal\)/g,
  "ShippingService.calculateShippingCost(store_id, wilaya_code, delivery_type, (items || []).reduce((sum, it) => sum + (parseFloat(it.price) || 0) * (parseInt(it.qty, 10) || 1), 0))"
);
fs.writeFileSync("routes/orders.js", ordersjs);

let ss = fs.readFileSync("services/shippingService.js", "utf8");
// Fix calculateShippingCost logic to respect custom pricing mode EVEN IF provider is manual!
// The logic should be:
// 1. Free shipping threshold
// 2. if (config.pricing_mode === "custom") { ... db.get ... }
// 3. if (config.pricing_mode === "api" && provider !== "manual" && api_key) { ... fetch API ... }
// 4. Fallback to flat rate

const newCalc = `static async calculateShippingCost(vendorId, toWilayaCode, deliveryType = \x27home\x27, cartSubtotal = 0) {
    const config = await this.getVendorConfig(vendorId);
    if (!config) return { price: 600, is_free: false, provider: \x27default\x27 };

    if (config.free_shipping_enabled && cartSubtotal >= config.free_shipping_threshold) {
      return { price: 0, is_free: true, provider: config.provider };
    }

    if (config.pricing_mode === \x27custom\x27) {
      const customRate = await db.get(\x27SELECT * FROM vendor_custom_delivery_rates WHERE user_id = $1 AND wilaya_code = $2\x27, [vendorId, toWilayaCode]);
      if (customRate) {
        if (!customRate.is_deliverable) return { price: 0, is_free: false, is_unavailable: true, provider: \x27custom\x27 };
        const price = deliveryType === \x27desk\x27 ? parseFloat(customRate.desk_price) : parseFloat(customRate.home_price);
        return { price: isNaN(price) ? 0 : price, is_free: false, provider: \x27custom\x27 };
      }
    }

    if (config.pricing_mode === \x27api\x27 && config.provider !== \x27manual\x27 && config.api_key) {
       // ... we just keep the rest of the old code by doing a string replace.
       // It\x27s better to replace the whole function.
`;
// Actually, I will just use regex to replace the specific if statement.

ss = ss.replace(
  /if \(config\.pricing_mode === \x27flat\x27 \|\| !config\.api_key \|\| config\.provider === \x27manual\x27\) \{[\s\S]*?\}/,
  `if (config.pricing_mode === \x27flat\x27) {
      const price = deliveryType === \x27desk\x27 ? Number(config.flat_desk_price) : Number(config.flat_home_price);
      return { price, is_free: false, provider: \x27manual\x27 };
    }`
);

// We need to move the Custom check UP above the API check just in case.
fs.writeFileSync("services/shippingService.js", ss);

