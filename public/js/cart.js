// إدارة سلة التسوق باستخدام localStorage (لا بيانات دفع حساسة تُخزَّن هنا)
// كل سطر في السلة يُعرَّف بمجموعة (id + variant_id) حتى يبقى كل مقاس/حجم كسطر مستقل تمامًا
const Cart = {
  KEY: 'store_cart_v1',

  get() {
    try {
      return JSON.parse(localStorage.getItem(this.KEY)) || [];
    } catch {
      return [];
    }
  },

  save(items) {
    localStorage.setItem(this.KEY, JSON.stringify(items));
    this.updateBadge();
  },

  lineKey(id, variantId) {
    return `${id}::${variantId || 'none'}`;
  },

  add(product, qty = 1, variant = null, customImage = null) {
    const items = this.get();
    const variantId = variant ? variant.id : null;
    const key = this.lineKey(product.id, variantId);
    const existing = items.find((i) => this.lineKey(i.id, i.variant_id) === key);
    const itemImage = (variant && variant.image) || customImage || product.image;
    const label = variant ? (variant.label || [variant.color, variant.size].filter(Boolean).join(' - ')) : null;

    if (existing) {
      existing.qty += qty;
      if (itemImage && !existing.image) existing.image = itemImage;
    } else {
      items.push({
        id: product.id,
        user_id: product.user_id || null,
        name: product.name,
        price: product.price,
        image: itemImage,
        qty,
        pack_quantity: product.pack_quantity || 1,
        variant_id: variantId,
        variant_label: label,
        color: variant ? variant.color || null : null,
        color_code: variant ? variant.color_code || null : null,
        size: variant ? variant.size || null : null,
      });
    }
    this.save(items);
  },

  updateQty(id, variantId, qty) {
    let items = this.get();
    const key = this.lineKey(id, variantId);
    if (qty <= 0) {
      items = items.filter((i) => this.lineKey(i.id, i.variant_id) !== key);
    } else {
      const item = items.find((i) => this.lineKey(i.id, i.variant_id) === key);
      if (item) item.qty = qty;
    }
    this.save(items);
  },

  remove(id, variantId) {
    const key = this.lineKey(id, variantId);
    this.save(this.get().filter((i) => this.lineKey(i.id, i.variant_id) !== key));
  },

  clear() {
    this.save([]);
  },

  total() {
    return this.get().reduce((sum, i) => sum + i.price * i.qty, 0);
  },

  count() {
    return this.get().reduce((sum, i) => sum + i.qty, 0);
  },

  updateBadge() {
    const badge = document.getElementById('cartCount');
    if (badge) badge.textContent = this.count();
  },
};

document.addEventListener('DOMContentLoaded', () => Cart.updateBadge());
