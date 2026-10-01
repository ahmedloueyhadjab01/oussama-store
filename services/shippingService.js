const db = require('../db');

class ShippingService {
  /**
   * جلب إعدادات الشحن لتاجر معين
   */
  static async getVendorConfig(vendorId) {
    if (!vendorId) return null;
    let config = await db.get('SELECT * FROM vendor_shipping_configs WHERE user_id = $1', [vendorId]);
    if (!config) {
      config = {
        user_id: vendorId,
        provider: 'manual',
        api_key: '',
        api_token: '',
        from_wilaya_id: 16,
        from_commune: 'الجزائر الوسطى',
        pricing_mode: 'flat',
        flat_home_price: 600,
        flat_desk_price: 350,
        free_shipping_enabled: 0,
        free_shipping_threshold: 15000,
        is_active: 1,
      };
    } else {
      const hp = parseFloat(config.flat_home_price); config.flat_home_price = isNaN(hp) ? 600 : hp;
      const dp = parseFloat(config.flat_desk_price); config.flat_desk_price = isNaN(dp) ? 350 : dp;
      const fst = parseFloat(config.free_shipping_threshold); config.free_shipping_threshold = isNaN(fst) ? 15000 : fst;
    }
    return config;
  }

  /**
   * حساب تكلفة الشحن للزبون بناءً على إعدادات التاجر
   */
  static async calculateShippingCost(vendorId, toWilayaCode, deliveryType = 'home', cartSubtotal = 0) {
    const config = await this.getVendorConfig(vendorId);
    if (!config) {
      const rate = await db.get('SELECT * FROM delivery_rates WHERE wilaya_code = $1', [toWilayaCode]);
      const price = rate ? (deliveryType === 'desk' ? parseFloat(rate.desk_price) : parseFloat(rate.home_price)) : 600;
      return { price: isNaN(price) ? 600 : price, is_free: false, provider: 'default' };
    }

    if (config.free_shipping_enabled && cartSubtotal >= config.free_shipping_threshold) {
      return { price: 0, is_free: true, provider: config.provider };
    }

    if (config.pricing_mode === 'custom') {
      const customRate = await db.get('SELECT * FROM vendor_custom_delivery_rates WHERE user_id = $1 AND wilaya_code = $2', [vendorId, toWilayaCode]);
      if (customRate) {
        if (!customRate.is_deliverable) return { price: 0, is_free: false, is_unavailable: true, provider: 'custom' };
        const price = deliveryType === 'desk' ? parseFloat(customRate.desk_price) : parseFloat(customRate.home_price);
        return { price: isNaN(price) ? 0 : price, is_free: false, provider: 'custom' };
      }
    }

    if (config.pricing_mode === 'auto' && config.provider === 'yalidine') {
      try {
        const url = `https://api.yalidine.app/v1/deliveryfees?from_wilaya_id=${config.from_wilaya_id}&to_wilaya_id=${toWilayaCode}`;
        const res = await fetch(url, { headers: { 'X-API-ID': config.api_key, 'X-API-TOKEN': config.api_token } });
        if (res.ok) {
          const data = await res.json();
          const fee = deliveryType === 'desk' ? data.desk_fee : data.home_fee;
          if (fee !== undefined && fee !== null) return { price: Number(fee), is_free: false, provider: 'yalidine' };
        }
      } catch (err) {
        console.warn('API Shipping calculation fallback to flat:', err.message);
      }
    }

    const fallbackPrice = deliveryType === 'desk' ? Number(config.flat_desk_price) : Number(config.flat_home_price);
    return { price: isNaN(fallbackPrice) ? 600 : fallbackPrice, is_free: false, provider: config.provider };
  }

  static async createParcel(orderId, vendorId) {
    const order = await db.get('SELECT * FROM orders WHERE id = $1 AND user_id = $2', [orderId, vendorId]);
    if (!order) throw new Error('الطلب غير موجود أو لا ينتمي لمتجرك');

    const config = await this.getVendorConfig(vendorId);
        if (!config || config.provider === 'manual' || !config.api_key) {
      // Return a local manual label URL
      return { label_url: `/api/shipping/orders/${orderId}/manual-label` };
    }

    if (config.provider === 'yalidine') {
      const items = typeof order.items === 'string' ? JSON.parse(order.items || '[]') : (order.items || []);
      const productDescription = items.map((i) => `${i.name} (x${i.qty})`).join(' + ');

      const payload = [
        {
          order_id: `ORD-${order.id}`,
          firstname: order.customer_name,
          familyname: '',
          contact_phone: order.phone,
          address: `${order.commune || ''} - ${order.address || ''}`,
          to_wilaya_name: order.wilaya_name,
          to_commune_name: order.commune,
          product_list: productDescription.substring(0, 200),
          price: parseFloat(order.total),
          freeshipping: parseFloat(order.delivery_price) === 0 ? 1 : 0,
          is_stopdesk: order.delivery_type === 'desk' ? 1 : 0,
          has_exchange: 0,
        },
      ];

      const res = await fetch('https://api.yalidine.app/v1/parcels', {
        method: 'POST',
        headers: {
          'X-API-ID': config.api_key,
          'X-API-TOKEN': config.api_token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const resData = await res.json();
      const parcelData = resData[`ORD-${order.id}`];

      if (!parcelData || !parcelData.tracking) {
        throw new Error(resData.message || (parcelData && parcelData.error) || 'فشل تسجيل الطرد لدى شركة التوصيل');
      }

      const trackingCode = parcelData.tracking;
      const labelUrl = parcelData.label || `https://api.yalidine.app/v1/parcels/${trackingCode}/label`;

      await db.query(
        `UPDATE orders
           SET tracking_status = $1, return_reason = $2
           WHERE id = $3`,
        [lastStatus, reason, order.id]
      );

      return { last_status: lastStatus, reason, internal_status: internalStatus };
    }

    return { last_status: order.tracking_status || order.status, reason: order.return_reason || '', internal_status: order.status };
  }
}

module.exports = ShippingService;
