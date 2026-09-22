
const fs = require("fs");
let ss = fs.readFileSync("services/shippingService.js", "utf8");

const start = ss.indexOf("static async calculateShippingCost");
const end = ss.indexOf("static async createParcel");

const newMethod = `static async calculateShippingCost(vendorId, toWilayaCode, deliveryType = \x27home\x27, cartSubtotal = 0) {
    const config = await this.getVendorConfig(vendorId);
    if (!config) {
      const rate = await db.get(\x27SELECT * FROM delivery_rates WHERE wilaya_code = $1\x27, [toWilayaCode]);
      const price = rate ? (deliveryType === \x27desk\x27 ? parseFloat(rate.desk_price) : parseFloat(rate.home_price)) : 600;
      return { price: isNaN(price) ? 600 : price, is_free: false, provider: \x27default\x27 };
    }

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

    if (config.pricing_mode === \x27auto\x27 && config.provider === \x27yalidine\x27) {
      try {
        const url = \`https://api.yalidine.app/v1/deliveryfees?from_wilaya_id=\${config.from_wilaya_id}&to_wilaya_id=\${toWilayaCode}\`;
        const res = await fetch(url, { headers: { \x27X-API-ID\x27: config.api_key, \x27X-API-TOKEN\x27: config.api_token } });
        if (res.ok) {
          const data = await res.json();
          const fee = deliveryType === \x27desk\x27 ? data.desk_fee : data.home_fee;
          if (fee !== undefined && fee !== null) return { price: Number(fee), is_free: false, provider: \x27yalidine\x27 };
        }
      } catch (err) {
        console.warn(\x27API Shipping calculation fallback to flat:\x27, err.message);
      }
    }

    const fallbackPrice = deliveryType === \x27desk\x27 ? Number(config.flat_desk_price) : Number(config.flat_home_price);
    return { price: isNaN(fallbackPrice) ? 600 : fallbackPrice, is_free: false, provider: config.provider };
  }

  `;

ss = ss.substring(0, start) + newMethod + ss.substring(end);
fs.writeFileSync("services/shippingService.js", ss);

