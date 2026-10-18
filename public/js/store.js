let ALL_CATEGORIES = [];
let CURRENT_CATEGORY = '';
let SEARCH_QUERY = '';
let CURRENT_DELIVERY_TYPE = 'home';
let CURRENT_STORE_ID = null;
let CURRENT_STORE_INFO = null;
let STORE_LOOKUP_FAILED = false;

// ---------- التقاط UTM من رابط الزيارة وحفظها في sessionStorage ----------
(function captureUtm() {
  const params = new URLSearchParams(window.location.search);
  const utm_fields = ['utm_source', 'utm_campaign', 'utm_medium', 'utm_content'];
  let found = false;
  for (const field of utm_fields) {
    if (params.has(field)) {
      sessionStorage.setItem(field, params.get(field));
      found = true;
    }
  }
  // تُدار الإحالة والمصدر في track.js
})();

function getUtmParams() {
  return {
    utm_source: sessionStorage.getItem('utm_source') || '',
    utm_campaign: sessionStorage.getItem('utm_campaign') || '',
    utm_medium: sessionStorage.getItem('utm_medium') || '',
    utm_content: sessionStorage.getItem('utm_content') || '',
  };
}

function money(n) {
  return `${Number(n).toLocaleString('ar-DZ')} دج`;
}

// كشف التاجر/المتجر من الرابط (/store/:idOrSlug أو ?store_id=X أو ?store_slug=X)
function detectStoreIdentifier() { return "default"; }

async function initStoreInfo() {
  const identifier = detectStoreIdentifier();
  if (!identifier) return;

  try {
    const res = await fetch(`/api/auth/store-info/${encodeURIComponent(identifier)}?t=${Date.now()}`);
    if (!res.ok) {
      STORE_LOOKUP_FAILED = true;
      return;
    }
    CURRENT_STORE_INFO = await res.json();
    CURRENT_STORE_ID = CURRENT_STORE_INFO.id;
    if (CURRENT_STORE_INFO.store_name) {
      document.title = CURRENT_STORE_INFO.store_name;
      document.querySelectorAll('.brand-logo').forEach((el) => {
        el.textContent = CURRENT_STORE_INFO.store_name;
      });
    }
  } catch (_) {
    STORE_LOOKUP_FAILED = true;
  }
}

let CATEGORY_TREE = [];

async function loadCategories() {
  const params = new URLSearchParams();
  if (CURRENT_STORE_ID) params.set('store_id', CURRENT_STORE_ID);
  const res = await fetch(`/api/categories?${params.toString()}`);
  CATEGORY_TREE = await res.json();

  const nav = document.getElementById('categoryNav');
  nav.querySelectorAll('.cat-btn:not([data-cat=""])').forEach((b) => b.remove());

  for (const cat of CATEGORY_TREE) {
    const btn = document.createElement('button');
    btn.className = 'cat-btn px-4 py-1.5 rounded-full text-sm font-bold transition-colors whitespace-nowrap bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--text)]';
    btn.dataset.cat = cat.id;
    btn.textContent = cat.name;
    nav.appendChild(btn);
  }

  nav.addEventListener('click', (e) => {
    const btn = e.target.closest('.cat-btn');
    if (!btn) return;
    selectMainCategory(btn.dataset.cat);
  });
}

function selectMainCategory(catId) {
  const nav = document.getElementById('categoryNav');
  const subNav = document.getElementById('subCategoryNav');

  document.querySelectorAll('#categoryNav .cat-btn').forEach((b) => {
    const isActive = b.dataset.cat === catId;
    b.classList.toggle('active-cat', isActive);
    b.classList.toggle('dimmed', !isActive && catId !== '');
  });

  CURRENT_CATEGORY = catId;

  // ابحث عن التصنيفات الفرعية لهذا التصنيف الرئيسي وأظهرها كقائمة منسدلة تحته
  const parent = CATEGORY_TREE.find((c) => String(c.id) === String(catId));
  const children = parent && parent.children ? parent.children : [];

  if (children.length) {
    subNav.classList.remove('hidden');
    subNav.innerHTML =
      `<button data-subcat="${catId}" class="subcat-btn active-cat">الكل في ${escapeHtmlSimple(parent.name)}</button>` +
      children.map((c) => `<button data-subcat="${c.id}" class="subcat-btn">${escapeHtmlSimple(c.name)}</button>`).join('');
    subNav.querySelectorAll('.subcat-btn').forEach((sb) => {
      sb.addEventListener('click', () => {
        subNav.querySelectorAll('.subcat-btn').forEach((b) => b.classList.remove('active-cat'));
        sb.classList.add('active-cat');
        CURRENT_CATEGORY = sb.dataset.subcat;
        loadProducts();
      });
    });
  } else {
    subNav.classList.add('hidden');
    subNav.innerHTML = '';
  }

  loadProducts();
}

function escapeHtmlSimple(str) {
  const div = document.createElement('div');
  div.textContent = String(str ?? '');
  return div.innerHTML.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}


let ALL_PRODUCTS = [];
let DISPLAY_LIMIT = 8;

function getInitialLimit() {
  const w = window.innerWidth;
  if (w >= 1024) return 12; // PC (4 cols x 3 rows)
  if (w >= 768) return 9; // Tablet (3 cols x 3 rows)
  return 8; // Mobile (2 cols x 4 rows)
}

window.handleLoadMore = function() {
  DISPLAY_LIMIT += getInitialLimit();
  renderProductGrid();
};

async function loadProducts() {
  const grid = document.getElementById('productsGrid');
  if (grid) {
    grid.innerHTML = Array(getInitialLimit()).fill(`
      <div class="bg-[var(--surface)] rounded-2xl shadow-sm border border-[var(--border)] overflow-hidden flex flex-col animate-pulse">
        <div class="aspect-[4/5] bg-gray-200"></div>
        <div class="p-4 flex flex-col gap-2">
          <div class="h-4 bg-gray-200 rounded w-3/4"></div>
          <div class="h-4 bg-gray-200 rounded w-1/2"></div>
          <div class="mt-auto pt-2">
            <div class="h-6 bg-gray-200 rounded w-1/3 mb-2"></div>
          </div>
        </div>
      </div>
    `).join('');
  }

  const params = new URLSearchParams();
  if (CURRENT_STORE_ID) params.set('store_id', CURRENT_STORE_ID);
  if (CURRENT_CATEGORY) params.set('category_id', CURRENT_CATEGORY);
  if (SEARCH_QUERY) params.set('q', SEARCH_QUERY);
  params.set('t', Date.now());

  const res = await fetch(`/api/products?${params.toString()}`);
  ALL_PRODUCTS = await res.json();

  if (!CURRENT_STORE_ID && ALL_PRODUCTS.length && ALL_PRODUCTS[0].user_id) {
    CURRENT_STORE_ID = ALL_PRODUCTS[0].user_id;
  }

  DISPLAY_LIMIT = getInitialLimit();
  renderProductGrid();
}

function renderProductGrid() {
  const grid = document.getElementById('productsGrid');
  const empty = document.getElementById('emptyState');
  const loadMoreBtn = document.getElementById('loadMoreContainer');
  
  if (!grid) return;
  grid.innerHTML = '';

  if (!ALL_PRODUCTS.length) {
    if (SEARCH_QUERY) {
      empty.innerHTML = `عذراً، لم نجد أي منتج يطابق "<strong>${escapeHtmlSimple(SEARCH_QUERY)}</strong>"<br><span class="text-xs font-normal text-[var(--muted)] mt-1.5 block">تأكد من كتابة الكلمة بشكل صحيح أو جرب كلمات أخرى</span>`;
    } else {
      empty.innerHTML = 'لا توجد منتجات متاحة حالياً.';
    }
    empty.classList.remove('hidden');
    if (loadMoreBtn) loadMoreBtn.style.display = 'none';
    return;
  }
  empty.classList.add('hidden');

  const visibleProducts = ALL_PRODUCTS.slice(0, DISPLAY_LIMIT);
  
  if (loadMoreBtn) {
    loadMoreBtn.style.display = DISPLAY_LIMIT >= ALL_PRODUCTS.length ? 'none' : 'block';
  }

  for (const p of visibleProducts) {
    const outOfStock = p.stock <= 0;
    const card = document.createElement('div');
    const prodUrl = `/product.html?id=${p.id}&store_id=${CURRENT_STORE_ID || p.user_id}`;
    card.onclick = () => location.href = prodUrl;
    card.className = 'bg-[var(--surface)] rounded-3xl shadow-sm hover:shadow-xl border border-[var(--border)] transition-all duration-400 overflow-hidden flex flex-col group cursor-pointer hover:-translate-y-1';

    let colorDotsHtml = '';
    if (p.has_variants && p.variants && p.variants.length) {
      const distinctColors = [];
      p.variants.forEach((v) => {
        if (v.color_value && !distinctColors.includes(v.color_value)) {
          distinctColors.push(v.color_value);
        }
      });
      if (distinctColors.length > 0) {
        colorDotsHtml = `<div class="flex flex-wrap gap-1 mb-2">
          ${distinctColors.slice(0, 4).map(c => `<span class="w-3 h-3 rounded-full border border-gray-200" style="background-color: ${escapeHtml(c)};"></span>`).join('')}
          ${distinctColors.length > 4 ? `<span class="text-[10px] text-gray-500 font-bold">+${distinctColors.length - 4}</span>` : ''}
        </div>`;
      }
    }

    card.innerHTML = `
      <div class="aspect-[4/5] relative overflow-hidden bg-[var(--bg)]">
        <img src="${escapeHtml(p.image || '/img/placeholder.svg')}" loading="lazy" alt="${escapeHtml(p.name)}" class="w-full h-full object-cover product-img opacity-0 transition-opacity duration-300 group-hover:scale-105" />
        ${outOfStock ? '<div class="absolute inset-0 bg-black/40 flex items-center justify-center"><span class="bg-black/80 text-white px-3 py-1.5 rounded-lg text-xs font-black backdrop-blur-sm">نفذت الكمية</span></div>' : ''}
        ${!outOfStock && p.compare_price > p.price ? `<div class="absolute top-2 right-2 bg-red-600 text-white text-[10px] sm:text-xs font-black px-2 py-1 rounded-lg shadow-sm">تخفيض</div>` : ''}
      </div>
      <div class="p-3 sm:p-4 flex flex-col flex-1">
        ${colorDotsHtml}
        <h3 class="text-xs sm:text-sm font-black text-[var(--text)] line-clamp-2 leading-snug mb-2">${escapeHtml(p.name)}</h3>
        <div class="mt-auto flex items-center justify-between gap-2">
          <div class="flex flex-col">
            <span class="text-primary font-black text-sm sm:text-base">${money(p.price)}</span>
            ${p.compare_price > p.price ? `<span class="text-[10px] sm:text-xs text-[var(--muted)] line-through">${money(p.compare_price)}</span>` : ''}
          </div>
          <button class="${outOfStock ? 'bg-slate-100 text-[var(--muted)] cursor-not-allowed' : 'bg-gradient-to-tr from-primary to-primary-light text-white shadow-md hover:shadow-lg hover:-translate-y-0.5'} add-to-cart w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 shrink-0">
            ${outOfStock 
              ? '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"></path></svg>'
              : '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>'
            }
          </button>
        </div>
      </div>
    `;

    const imgEl = card.querySelector('.product-img');
    if (imgEl) {
      if (imgEl.complete) {
        imgEl.classList.remove('opacity-0');
      } else {
        imgEl.addEventListener('load', () => imgEl.classList.remove('opacity-0'));
        imgEl.addEventListener('error', () => imgEl.classList.remove('opacity-0'));
      }
    }

    if (!outOfStock) {
      const btn = card.querySelector('.add-to-cart');
      if (p.has_variants) {
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            openQuickAddModal(p);
          });
        } else {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const inCart = Cart.get().find((i) => i.id === p.id && !i.variant_id);
          const currentQty = inCart ? inCart.qty : 0;
          if (currentQty + 1 > p.stock) {
            showToast(`عذراً، المتوفر فقط ${p.stock} قطعة`);
            return;
          }
          Cart.add(p, 1);
          showToast('تمت إضافة المنتج إلى السلة.');
          openCart();
        });
      }
    }

    grid.appendChild(card);
  }
}
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = String(str ?? '');
  return div.innerHTML.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function showToast(msg) {
  const toast = document.getElementById('successToast');
  toast.textContent = msg;
  toast.classList.remove('hidden');
  setTimeout(() => toast.classList.add('hidden'), 2200);
}

// ---------- سلة التسوق (Drawer) ----------
function updateCartCount() {
  const count = Cart.get().reduce((acc, i) => acc + i.qty, 0);
  document.getElementById('cartCount').textContent = count;
  const bcc = document.getElementById('bottomCartCount');
  if (bcc) bcc.textContent = count;
}

function renderCartDrawer() {
  updateCartCount();
  const items = Cart.get();
  const container = document.getElementById('cartItemsList');
  container.innerHTML = '';

  if (!items.length) {
    container.innerHTML = '<p class="text-center text-[var(--text)] font-black mt-10 text-base">السلة فارغة</p>';
    document.getElementById('cartTotal').textContent = money(0);
    return;
  }

  for (const item of items) {
    const row = document.createElement('div');
    row.className = 'flex items-center gap-3 border-b-2 border-[var(--border)] pb-3';
    const totalPieces = (item.pack_quantity || 1) * item.qty;
    row.innerHTML = `
      <img src="${escapeHtml(item.image || '/img/placeholder.svg')}" class="w-14 h-14 object-cover rounded-lg bg-[var(--surface)] border-2 border-[var(--border)] shadow-2xs" />
      <div class="flex-1">
        <p class="text-sm font-black text-[var(--text)] line-clamp-1">${escapeHtml(item.name)}${item.variant_label ? ` <span class="text-xs text-green-600 font-black">(${escapeHtml(item.variant_label)})</span>` : ''}</p>
        <p class="text-xs text-[var(--text)] font-bold">${money(item.price)} <span class="text-[10px] text-[var(--muted)] font-normal">/ عبوة</span></p>
        <p class="text-[11px] text-green-600 font-black">المجموع: ${totalPieces} قطعة (${item.qty} عبوة)</p>
        <div class="flex items-center gap-2 mt-1">
          <button class="qty-btn dec w-8 h-8 rounded-xl border-2 border-[var(--border)] bg-[var(--surface)] text-[var(--text)] font-bold text-base flex items-center justify-center hover:border-blue-400 hover:text-red-700 transition-all">-</button>
          <span class="text-sm font-black text-[var(--text)]">${item.qty} عبوة</span>
          <button class="qty-btn inc w-8 h-8 rounded-xl border-2 border-[var(--border)] bg-[var(--surface)] text-[var(--text)] font-bold text-base flex items-center justify-center hover:border-blue-400 hover:text-red-700 transition-all">+</button>
        </div>
      </div>
      <button class="remove-btn w-7 h-7 flex items-center justify-center rounded-lg text-[var(--muted)] hover:bg-red-50 hover:text-red-500 transition-all text-base">حذف</button>
    `;
    row.querySelector('.inc').addEventListener('click', () => { Cart.updateQty(item.id, item.variant_id, item.qty + 1); renderCartDrawer(); });
    row.querySelector('.dec').addEventListener('click', () => { Cart.updateQty(item.id, item.variant_id, item.qty - 1); renderCartDrawer(); });
    row.querySelector('.remove-btn').addEventListener('click', () => { Cart.remove(item.id, item.variant_id); renderCartDrawer(); });
    container.appendChild(row);
  }

  document.getElementById('cartTotal').textContent = money(Cart.total());
}

function openCart() {
  renderCartDrawer();
  const drawer = document.getElementById('cartDrawer');
  const content = document.getElementById('cartDrawerContent');
  if(drawer) drawer.classList.remove('hidden');
  if(content) setTimeout(() => content.classList.remove('translate-x-full'), 10);
}
function closeCart() {
  const drawer = document.getElementById('cartDrawer');
  const content = document.getElementById('cartDrawerContent');
  if(content) content.classList.add('translate-x-full');
  if(drawer) setTimeout(() => drawer.classList.add('hidden'), 300);
}

document.getElementById('cartBtn')?.addEventListener('click', openCart);
document.getElementById('closeCart')?.addEventListener('click', closeCart);
document.getElementById('cartDrawer')?.addEventListener('click', (e) => { if (e.target === e.currentTarget) closeCart(); });
  document.getElementById('checkoutOverlay')?.addEventListener('click', (e) => { if (e.target === e.currentTarget) { document.getElementById('checkoutOverlay').classList.add('hidden'); } });

// ---------- إتمام الطلب: الولاية / البلدية / نوع التوصيل ----------
const wilayaSelect = document.getElementById('custWilaya');
const communeSelect = document.getElementById('custCommune');

Locations.loadWilayas(wilayaSelect);

wilayaSelect.addEventListener('change', async () => {
  const code = wilayaSelect.value;
  if (!code) {
    if(communeSelect) communeSelect.disabled = true;
    if(communeSelect) communeSelect.innerHTML = '<option value="">البلدية...</option>';
  } else {
    await Locations.loadCommunes(code, communeSelect);
  }
  updateDeliveryPrices();
});

document.querySelectorAll('.delivery-option').forEach((label) => {
  label.addEventListener('click', () => {
    document.querySelectorAll('.delivery-option').forEach((l) => l.classList.remove('selected'));
    label.classList.add('selected');
    label.querySelector('input').checked = true;
    CURRENT_DELIVERY_TYPE = label.dataset.type;
    updateDeliveryPrices();
  });
});
document.querySelector('.delivery-option[data-type="home"]').classList.add('selected');

function currentDeliveryPrice() {
  const rate = Locations.getRate(wilayaSelect.value);
  if (!rate) return 0;
  return CURRENT_DELIVERY_TYPE === 'desk' ? rate.desk_price : rate.home_price;
}

let CURRENT_DYNAMIC_SHIPPING = null;

async function updateDeliveryPrices() {
  const code = wilayaSelect.value;
  const hint = document.getElementById('selectWilayaHint');
  const storeId = CURRENT_STORE_ID || (Cart.get()[0] && Cart.get()[0].user_id);
  if (!storeId) return;
  const subtotal = Cart.total();

  if (!code) {
    document.querySelectorAll('.delivery-option').forEach((label) => {
      label.querySelector('.delivery-price').textContent = '—';
    });
    hint.classList.remove('hidden');
    CURRENT_DYNAMIC_SHIPPING = null;
    updateGrandTotal();
    return;
  }

  hint.classList.add('hidden');

  try {
    const homeRes = await fetch(`/api/shipping/calculate-cost?store_id=${storeId}&wilaya_code=${code}&delivery_type=home&subtotal=${subtotal}`);
    const deskRes = await fetch(`/api/shipping/calculate-cost?store_id=${storeId}&wilaya_code=${code}&delivery_type=desk&subtotal=${subtotal}`);
    
    if (!homeRes.ok || !deskRes.ok) throw new Error('تعذر حساب تكلفة التوصيل');
    const homeData = await homeRes.json();
    const deskData = await deskRes.json();

    document.querySelectorAll('.delivery-option').forEach((label) => {
      const priceEl = label.querySelector('.delivery-price');
      const isDesk = label.dataset.type === 'desk';
      const data = isDesk ? deskData : homeData;
      
      if (data.is_unavailable) {
        priceEl.innerHTML = '<span class="text-primary-dark font-black">غير متاح</span>';
      } else if (data.is_free) {
        priceEl.innerHTML = '<span class="text-green-500 font-black">مجاني 🎉</span>';
      } else {
        priceEl.textContent = money(data.price);
      }
    });

    const selectedData = CURRENT_DELIVERY_TYPE === 'desk' ? deskData : homeData;
    if (selectedData.is_unavailable) throw new Error('التوصيل غير متاح إلى هذه الولاية');
    CURRENT_DYNAMIC_SHIPPING = selectedData.price;
  } catch (err) {
    // Fallback to static rates
    const rate = Locations.getRate(code);
    document.querySelectorAll('.delivery-option').forEach((label) => {
      const priceEl = label.querySelector('.delivery-price');
      if (!rate) {
        priceEl.textContent = '—';
        return;
      }
      const price = label.dataset.type === 'desk' ? rate.desk_price : rate.home_price;
      priceEl.textContent = money(price);
    });
    CURRENT_DYNAMIC_SHIPPING = rate ? (CURRENT_DELIVERY_TYPE === 'desk' ? rate.desk_price : rate.home_price) : 0;
  }

  updateGrandTotal();
}

function updateGrandTotal() {
  const deliveryFee = CURRENT_DYNAMIC_SHIPPING !== null ? CURRENT_DYNAMIC_SHIPPING : currentDeliveryPrice();
  const grand = Cart.total() + (deliveryFee || 0);
  document.getElementById('cartTotal').textContent = money(grand);
}

// ---------- إتمام الطلب ----------
document.getElementById('checkoutBtn')?.addEventListener('click', () => {
  if (!Cart.get().length) return;
  closeCart();
  updateGrandTotal();
  document.getElementById('checkoutOverlay').classList.remove('hidden');
});
document.getElementById('cancelCheckout')?.addEventListener('click', () => {
  document.getElementById('checkoutOverlay').classList.add('hidden');
});

document.getElementById('checkoutForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  const errorEl = document.getElementById('checkoutError' /* */);
  errorEl.classList.add('hidden');

  const submitBtn = form.querySelector('button[type="submit"]');
  const origText = submitBtn ? submitBtn.textContent : '';
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'جارٍ تسجيل الطلب...';
  }

  const storeId = CURRENT_STORE_ID || (Cart.get()[0] && Cart.get()[0].user_id) || 1;
  const payload = {
    customer_name: form.customer_name.value.trim(),
    phone: form.phone.value.trim(),
    address: form.address.value.trim(),
    wilaya_code: Number(wilayaSelect.value),
    commune: (communeSelect ? communeSelect.value : '').trim(),
    delivery_type: CURRENT_DELIVERY_TYPE,
    items: Cart.get().map((i) => ({ id: i.id, qty: i.qty, variant_id: i.variant_id || undefined })),
    store_id: storeId,
    ...getUtmParams(),
  };

  if (!payload.wilaya_code || !payload.commune) {
    errorEl.textContent = 'الرجاء اختيار الولاية والبلدية';
    errorEl.classList.remove('hidden');
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = origText;
    }
    return;
  }

  try {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'حدث خطأ أثناء تسجيل الطلب');

    Cart.clear();
    renderCartDrawer();
    document.getElementById('checkoutOverlay').classList.add('hidden');
    form.reset();
    if(communeSelect) communeSelect.disabled = true;
    if(communeSelect) communeSelect.innerHTML = '<option value="">البلدية...</option>';
    showToast(`تم إرسال طلبك بنجاح 🎉 رقم الطلب: ${data.order_id}`);
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.classList.remove('hidden');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = origText;
    }
  }
});

// ---------- البحث والفلترة الشاملة المباشرة ----------
let searchTimeout;
function handleSearch(value, immediate = false) {
  clearTimeout(searchTimeout);
  const perform = () => {
    SEARCH_QUERY = (value || '').trim();
    
    // مزامنة حقلي البحث على سطح المكتب والموبايل
    const deskInput = document.getElementById('searchInput');
    const mobInput = document.getElementById('searchInputMobile');
    const clearDesk = document.getElementById('clearSearchBtn');
    const clearMob = document.getElementById('clearSearchBtnMobile');

    if (deskInput && deskInput.value !== value) deskInput.value = value;
    if (mobInput && mobInput.value !== value) mobInput.value = value;
    if (clearDesk) clearDesk.classList.toggle('hidden', !SEARCH_QUERY);
    if (clearMob) clearMob.classList.toggle('hidden', !SEARCH_QUERY);

    // إذا بدأ المستخدم البحث المباشر، نجعل البحث يبحث في المتجر بالكامل
    if (SEARCH_QUERY && CURRENT_CATEGORY) {
      CURRENT_CATEGORY = '';
      document.querySelectorAll('#categoryNav .cat-btn').forEach((b) => {
        b.classList.toggle('active-cat', b.dataset.cat === '');
        b.classList.remove('dimmed');
      });
      const subNav = document.getElementById('subCategoryNav');
      if (subNav) {
        subNav.classList.add('hidden');
        subNav.innerHTML = '';
      }
    }

    loadProducts();
  };

  if (immediate) {
    perform();
  } else {
    searchTimeout = setTimeout(perform, 150);
  }
}

function clearSearch() {
  handleSearch('', true);
  const deskInput = document.getElementById('searchInput');
  const mobInput = document.getElementById('searchInputMobile');
  if (deskInput) deskInput.focus();
  if (mobInput) mobInput.focus();
}

// ربط أحداث الإدخال الفوري (Live Input)
document.getElementById('searchInput')?.addEventListener('input', (e) => handleSearch(e.target.value));
document.getElementById('searchInputMobile')?.addEventListener('input', (e) => handleSearch(e.target.value));

// دعم الضغط على Enter في كلا الحقلين
document.getElementById('searchInput')?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    handleSearch(e.target.value, true);
  }
});
document.getElementById('searchInputMobile')?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    handleSearch(e.target.value, true);
  }
});

// أزرار البحث المباشرة
document.getElementById('searchBtn')?.addEventListener('click', () => {
  const val = document.getElementById('searchInput')?.value || '';
  handleSearch(val, true);
});
document.getElementById('searchBtnMobile')?.addEventListener('click', () => {
  const val = document.getElementById('searchInputMobile')?.value || '';
  handleSearch(val, true);
});

// أزرار مسح البحث
document.getElementById('clearSearchBtn')?.addEventListener('click', clearSearch);
document.getElementById('clearSearchBtnMobile')?.addEventListener('click', clearSearch);

// منع إعادة تحميل الصفحة عند إرسال نماذج البحث
document.getElementById('searchFormDesktop')?.addEventListener('submit', (e) => {
  e.preventDefault();
  handleSearch(document.getElementById('searchInput')?.value || '', true);
});
document.getElementById('searchFormMobile')?.addEventListener('submit', (e) => {
  e.preventDefault();
  handleSearch(document.getElementById('searchInputMobile')?.value || '', true);
});

// ---------- تشغيل ----------
(async function init() {
  await initStoreInfo();
  await loadCategories();
  await loadProducts();
  if (typeof initSocialIcons === 'function') {
    initSocialIcons('socialIconsFooter', { storeId: CURRENT_STORE_ID });
    initSocialIcons('socialIconsTopBar', { storeId: CURRENT_STORE_ID, size: 'w-8 h-8' });
  }
})();



// --- Quick Add Modal Logic ---
window.openQuickAddModal = async function(product) {
  // Create modal container if not exists
  let modal = document.getElementById('quickAddModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'quickAddModal';
    modal.className = 'fixed inset-0 z-[100] flex items-center justify-center hidden p-4';
    modal.innerHTML = `
      <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" onclick="closeQuickAddModal()"></div>
      <div class="relative bg-[var(--surface)] w-full max-w-lg rounded-3xl shadow-2xl p-6 md:p-8 transform transition-all scale-95 opacity-0" id="quickAddContent">
        <button onclick="closeQuickAddModal()" class="absolute top-4 right-4 text-[var(--muted)] hover:text-red-500 bg-[var(--bg)] rounded-full p-2">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>
        <div class="flex gap-4 mb-6">
          <img id="qaImg" src="" class="w-20 h-20 sm:w-24 sm:h-24 object-cover rounded-2xl border border-[var(--border)] shadow-sm shrink-0">
          <div>
            <h3 id="qaTitle" class="font-black text-lg text-[var(--text)] mb-2"></h3>
            <p id="qaPrice" class="text-primary font-bold text-xl"></p>
          </div>
        </div>
        
        <div id="qaOptionsContainer" class="space-y-4"></div>
        
        <div class="mt-8">
          <button id="qaSubmit" class="w-full bg-primary text-white font-bold py-4 rounded-2xl hover:bg-primary-hover shadow-lg hover:shadow-primary/30 transition-all text-lg">
            إضافة إلى السلة
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  // Populate data
  document.getElementById('qaImg').src = product.image_url || '/placeholder.png';
  document.getElementById('qaTitle').textContent = product.name;
  document.getElementById('qaPrice').textContent = product.discount_price ? product.discount_price + ' د.ج' : product.price + ' د.ج';

  const optsContainer = document.getElementById('qaOptionsContainer');
  optsContainer.innerHTML = ''; // clear

  // Group variants by size
  let sizes = [];
  let colorsBySize = {}; // { size1: [variant, variant], size2: [] }
  
  if (product.variants && product.variants.length > 0) {
    product.variants.forEach(v => {
      const s = v.size_value || 'متوفر';
      if (!sizes.includes(s)) {
        sizes.push(s);
        colorsBySize[s] = [];
      }
      colorsBySize[s].push(v);
    });

    let selectedSize = sizes[0];
    let selectedVariant = null;

    // Render sizes
    if (sizes.length > 0 && sizes[0] !== 'متوفر') {
      const sizeDiv = document.createElement('div');
      sizeDiv.innerHTML = '<h4 class="font-bold text-[var(--text)] mb-3 flex items-center gap-2"><svg class="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"></path></svg>المقاس</h4><div class="flex flex-wrap gap-3" id="qaSizes"></div>';
      optsContainer.appendChild(sizeDiv);

      const qaSizeGrid = document.getElementById('qaSizes');
      sizes.forEach(sz => {
        const btn = document.createElement('button');
        btn.className = `px-5 py-2.5 rounded-xl font-bold border-2 transition-all ${sz === selectedSize ? 'border-primary bg-primary/10 text-primary scale-105' : 'border-[var(--border)] text-[var(--muted)] hover:border-primary/50'}`;
        btn.textContent = sz;
        btn.onclick = () => {
          selectedSize = sz;
          Array.from(qaSizeGrid.children).forEach(c => {
            c.className = 'px-5 py-2.5 rounded-xl font-bold border-2 transition-all border-[var(--border)] text-[var(--muted)] hover:border-primary/50';
          });
          btn.className = 'px-5 py-2.5 rounded-xl font-bold border-2 transition-all border-primary bg-primary/10 text-primary scale-105';
          renderColorsForSize(selectedSize);
        };
        qaSizeGrid.appendChild(btn);
      });
    }

    // Colors container
    const colorDiv = document.createElement('div');
    colorDiv.className = 'mt-5';
    colorDiv.innerHTML = '<h4 class="font-bold text-[var(--text)] mb-3 flex items-center gap-2"><svg class="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"></path></svg>اللون</h4><div class="flex flex-wrap gap-3" id="qaColors"></div>';
    optsContainer.appendChild(colorDiv);

    const renderColorsForSize = (sz) => {
      const qaColorsGrid = document.getElementById('qaColors');
      qaColorsGrid.innerHTML = '';
      const vars = colorsBySize[sz] || [];
      if (vars.length === 0) {
        qaColorsGrid.innerHTML = '<span class="text-sm text-red-500 font-bold">غير متوفر بهذا المقاس</span>';
        selectedVariant = null;
        return;
      }
      
      // Auto select first color
      selectedVariant = vars.find(v => v.stock > 0) || vars[0];

      vars.forEach(v => {
        const isSelected = selectedVariant && selectedVariant.id === v.id;
        const outOfStock = v.stock <= 0;
        
        const btn = document.createElement('button');
        btn.disabled = outOfStock;
        btn.className = `relative flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all ${isSelected ? 'border-primary bg-primary/5 scale-105 shadow-md' : 'border-[var(--border)] hover:border-primary/50'} ${outOfStock ? 'opacity-50 cursor-not-allowed grayscale' : ''}`;
        
        let visualColor = v.color_value || '#ccc';
        let innerHTML = `<div class="w-10 h-10 rounded-full border border-gray-300 shadow-inner" style="background-color: ${escapeHtml(visualColor)}"></div>`;
        if (v.color_name) {
          innerHTML += `<span class="text-xs font-bold text-[var(--text)]">${escapeHtml(v.color_name)}</span>`;
        }
        
        btn.innerHTML = innerHTML;
        
        btn.onclick = () => {
          selectedVariant = v;
          renderColorsForSize(sz); // re-render to update selected state
        };
        qaColorsGrid.appendChild(btn);
      });
      
      // Update price based on variant
      if (selectedVariant) {
        document.getElementById('qaPrice').textContent = selectedVariant.price ? selectedVariant.price + ' د.ج' : (product.discount_price || product.price) + ' د.ج';
      }
    };

    renderColorsForSize(selectedSize);

    // Submit Action
    document.getElementById('qaSubmit').onclick = () => {
      if (!selectedVariant) return showToast('الرجاء اختيار مقاس ولون متاح', 'error');
      
      const inCart = Cart.get().find(i => i.id === product.id && i.variant_id === selectedVariant.id);
      const currentQty = inCart ? inCart.qty : 0;
      if (currentQty + 1 > selectedVariant.stock) {
        showToast('الكمية المطلوبة غير متوفرة في المخزون!', 'error');
        return;
      }

      Cart.add(product, 1, selectedVariant);
      
      const animNode = document.createElement('div');
      animNode.className = 'fixed bg-primary text-white font-bold px-6 py-3 rounded-full shadow-2xl z-[200] transition-all duration-700 pointer-events-none flex items-center gap-2';
      animNode.innerHTML = '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg> أضيف بنجاح';
      
      const btnRect = document.getElementById('qaSubmit').getBoundingClientRect();
      animNode.style.top = btnRect.top + 'px';
      animNode.style.left = (btnRect.left + btnRect.width / 2 - 70) + 'px';
      document.body.appendChild(animNode);
      
      closeQuickAddModal();
      
      setTimeout(() => {
        const cartIcon = document.getElementById('cartBtnDesktop') || document.getElementById('cartBtn');
        if (cartIcon) {
          const cartRect = cartIcon.getBoundingClientRect();
          animNode.style.top = cartRect.top + 'px';
          animNode.style.left = cartRect.left + 'px';
          animNode.style.transform = 'scale(0.5)';
          animNode.style.opacity = '0';
        } else {
          animNode.style.transform = 'translateY(-50px)';
          animNode.style.opacity = '0';
        }
      }, 50);
      
      setTimeout(() => animNode.remove(), 750);
    };

  } else {
    // Should not happen since we only call this for variants, but fallback:
    optsContainer.innerHTML = '<p class="text-[var(--text)] font-bold">لا توجد خيارات لهذا المنتج</p>';
  }

  // Show modal
  modal.classList.remove('hidden');
  setTimeout(() => {
    document.getElementById('quickAddContent').classList.remove('scale-95', 'opacity-0');
    document.getElementById('quickAddContent').classList.add('scale-100', 'opacity-100');
  }, 10);
};

window.closeQuickAddModal = function() {
  const modal = document.getElementById('quickAddModal');
  const content = document.getElementById('quickAddContent');
  if (modal && content) {
    content.classList.remove('scale-100', 'opacity-100');
    content.classList.add('scale-95', 'opacity-0');
    setTimeout(() => {
      modal.classList.add('hidden');
    }, 200);
  }
};
