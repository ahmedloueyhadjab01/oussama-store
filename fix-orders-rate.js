
const fs = require("fs");
let code = fs.readFileSync("routes/orders.js", "utf8");

const oldBlock = `        let deliveryPrice = delivery_type === \x27desk\x27 ? parseFloat(rate.desk_price) : parseFloat(rate.home_price);
        const vendorShipConfig = await trx.get(\x27SELECT * FROM vendor_shipping_configs WHERE user_id = $1\x27, [store_id]);
        
        if (vendorShipConfig) {
          if (vendorShipConfig.free_shipping_enabled && subtotal >= parseFloat(vendorShipConfig.free_shipping_threshold)) {
            deliveryPrice = 0;
          } else if (vendorShipConfig.pricing_mode === \x27flat\x27) {
            deliveryPrice = delivery_type === \x27desk\x27 ? parseFloat(vendorShipConfig.flat_desk_price) : parseFloat(vendorShipConfig.flat_home_price);
          } else if (vendorShipConfig.pricing_mode === \x27custom\x27) {
            const customRate = await trx.get(\x27SELECT * FROM vendor_custom_delivery_rates WHERE user_id = $1 AND wilaya_code = $2\x27, [store_id, wilaya_code]);
            if (customRate) {
              if (!customRate.is_deliverable) throw new Error(\x27التوصيل غير متاح إلى هذه الولاية حاليًا\x27);
              deliveryPrice = delivery_type === \x27desk\x27 ? parseFloat(customRate.desk_price) : parseFloat(customRate.home_price);
            }
          }
        }`;

const newBlock = `        const shippingResultTrx = await ShippingService.calculateShippingCost(store_id, wilaya_code, delivery_type, subtotal);
        if (shippingResultTrx.is_unavailable) throw new Error(\x27التوصيل غير متاح لهذه الولاية.\x27);
        const deliveryPrice = shippingResultTrx.price;
        const rate = await trx.get(\x27SELECT name FROM delivery_rates WHERE id = $1\x27, [wilaya_code]);
        const wilaya_name = rate ? rate.name : \x27\x27;`;

code = code.replace(oldBlock, newBlock);

fs.writeFileSync("routes/orders.js", code);

