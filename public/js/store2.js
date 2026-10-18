let ALL_CATEGORIES = [];
const PAGE_PARAMS = new URLSearchParams(window.location.search);
let CURRENT_CATEGORY = PAGE_PARAMS.get('category_id') || '';
let SEARCH_QUERY = (PAGE_PARAMS.get('q') || '').trim();
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
  try {
    return {
      utm_source: sessionStorage.getItem('utm_source') || '',
      utm_campaign: sessionStorage.getItem('utm_campaign') || '',
      utm_medium: sessionStorage.getItem('utm_medium') || '',
      utm_content: sessionStorage.getItem('utm_content') || '',
    };
  } catch (e) {
    return {
      utm_source: '',
      utm_campaign: '',
      utm_medium: '',
      utm_content: ''
    };
  }
}

function money(n) {
  return `${Number(n).toLocaleString('ar-DZ')} دج`;
}

// كشف التاجر/المتجر من الرابط (/store/:idOrSlug أو ?store_id=X أو ?store_slug=X)
function detectStoreIdentifier() {
  const params = new URLSearchParams(window.location.search);
  const storePath = window.location.pathname.match(/^\/store\/([^/]+)/);
  return params.get('store_id') || params.get('store_slug') || (storePath && storePath[1]) || 'default';
}

async function initStoreInfo() {
  const identifier = detectStoreIdentifier();
  if (!identifier) return;

  try {
    const res = await fetch(`/api/auth/store-info/${encodeURIComponent(identifier)}`);
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

  const menu = document.getElementById('categoryDropdownMenu');
  const nav = document.getElementById('categoryNav');
  
  if (menu) menu.innerHTML = '';
  if (nav) nav.innerHTML = '';

  const createCatBtn = (catId, catName, isDropdown) => {
    if (isDropdown) {
      const a = document.createElement('a');
      a.href = "#";
      a.className = 'cat-btn px-4 py-3 text-slate-800 hover:bg-slate-600 hover:text-white text-right text-xs sm:text-sm font-bold transition-colors block';
      a.dataset.cat = catId;
      a.textContent = catName;
      a.onclick = (e) => { 
        e.preventDefault(); 
        selectMainCategory(catId); 
        document.getElementById('categoryDropdownMenu').classList.add('hidden'); 
        document.getElementById('categoryDropdownMenu').classList.remove('flex'); 
      };
      return a;
    } else {
      const btn = document.createElement('button');
      btn.className = 'cat-btn px-4 py-1.5 rounded-full text-sm font-bold transition-colors whitespace-nowrap bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900';
      btn.dataset.cat = catId;
      btn.textContent = catName;
      btn.onclick = () => selectMainCategory(catId);
      return btn;
    }
  };
  
  if (menu) menu.appendChild(createCatBtn("", "كل التصنيفات", true));
  if (nav) nav.appendChild(createCatBtn("", "الكل", false));

  for (const cat of CATEGORY_TREE) {
    if (menu) menu.appendChild(createCatBtn(cat.id, cat.name, true));
    if (nav) nav.appendChild(createCatBtn(cat.id, cat.name, false));
  }
  
  const circlesContainer = document.getElementById('dynamicCategoryCircles');
  if (circlesContainer) {
    circlesContainer.innerHTML = '';
    circlesContainer.classList.remove('hidden');
    for (const cat of CATEGORY_TREE) {
      const circle = document.createElement('div');
      circle.className = 'flex flex-col items-center justify-center gap-3 cursor-pointer group';
      circle.onclick = () => { selectMainCategory(cat.id); window.scrollTo(0, document.getElementById('productsGrid')?.offsetTop - 100 || 0); };
      const img = cat.image || '/img/placeholder.svg';
      circle.innerHTML = `
        <div class="w-24 h-24 sm:w-32 sm:h-32 rounded-full overflow-hidden border-4 border-slate-100 shadow-md group-hover:border-[#E52F20] transition-colors relative">
          <img src="${escapeHtml(img)}" loading="lazy" decoding="async" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" alt="${escapeHtml(cat.name)}">
        </div>
        <span class="text-sm sm:text-base font-black text-slate-800 text-center group-hover:text-[#E52F20] transition-colors">${escapeHtml(cat.name)}</span>
      `;
      circle.querySelector('img')?.addEventListener('error', (e) => {
        e.currentTarget.src = '/img/placeholder.svg';
      }, { once: true });
      circlesContainer.appendChild(circle);
    }
  }
}

function selectMainCategory(catId) {
  const subNav = document.getElementById('subCategoryNav');

  document.querySelectorAll('#categoryDropdownMenu .cat-btn, #categoryNav .cat-btn').forEach((b) => {
    const isActive = String(b.dataset.cat) === String(catId);
    b.classList.toggle('active-cat', isActive);
  });

  CURRENT_CATEGORY = catId;

  const parent = CATEGORY_TREE.find((c) => String(c.id) === String(catId));
  const children = parent && parent.children ? parent.children : [];

  if (children.length && subNav) {
    subNav.classList.remove('hidden');
    subNav.innerHTML =
      `<button data-subcat="${catId}" class="subcat-btn active-cat">الكل في ${escapeHtml(parent.name)}</button>` +
      children.map((c) => `<button data-subcat="${c.id}" class="subcat-btn">${escapeHtml(c.name)}</button>`).join('');
    subNav.querySelectorAll('.subcat-btn').forEach((sb) => {
      sb.addEventListener('click', () => {
        subNav.querySelectorAll('.subcat-btn').forEach((b) => b.classList.remove('active-cat'));
        sb.classList.add('active-cat');
        CURRENT_CATEGORY = sb.dataset.subcat;
        loadProducts();
      });
    });
  } else if (subNav) {
    subNav.classList.add('hidden');
    subNav.innerHTML = '';
  }

  loadProducts();
}

async function loadProducts() {
  const grid = document.getElementById('productsGrid');
  if (grid) {
    grid.innerHTML = Array(8).fill(`
      <div class="lekidi-card animate-pulse">
        <div class="aspect-[4/5] bg-gray-200"></div>
        <div class="p-4 flex flex-col gap-2">
          <div class="h-4 bg-gray-200 rounded w-3/4"></div>
          <div class="h-4 bg-gray-200 rounded w-1/2"></div>
          <div class="mt-auto pt-2">
            <div class="h-6 bg-gray-200 rounded w-1/3 mb-2"></div>
            <div class="h-10 bg-gray-200 rounded-xl w-full"></div>
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
  const products = await res.json();

  if (!CURRENT_STORE_ID && products.length && products[0].user_id) {
    CURRENT_STORE_ID = products[0].user_id;
  }

  const empty = document.getElementById('emptyState');
  grid.innerHTML = '';

  if (!products.length) {
    if (SEARCH_QUERY) {
      empty.innerHTML = `لم يتم العثور على منتجات مطابقة لـ "<strong>${escapeHtml(SEARCH_QUERY)}</strong>"<br><span class="text-xs font-normal text-white/60 mt-1.5 block">تأكد من كتابة الكلمات بشكل صحيح أو ابحث باسم الصنف أو الوصف</span>`;
    } else {
      empty.innerHTML = 'لا توجد منتجات حاليًا في هذا التصنيف.';
    }
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');

  for (const p of products) {
    const outOfStock = p.stock <= 0;
    const card = document.createElement('div');
      card.onclick = () => location.href = prodUrl;
    card.className = 'lekidi-card cursor-pointer';

    // جمع الألوان الفريدة إن وجدت
    let colorDotsHtml = '';
    if (p.has_variants && p.variants && p.variants.length) {
      const distinctColors = [];
      const seen = new Set();
      for (const v of p.variants) {
        if (v.color && !seen.has(v.color)) {
          seen.add(v.color);
          distinctColors.push(v);
        }
      }
      if (distinctColors.length > 1) {
        colorDotsHtml = `
          <div class="flex items-center gap-1 mt-1">
            ${distinctColors.slice(0, 5).map(c => `
              <span class="w-3.5 h-3.5 rounded-full border-2 border-ink shadow-xs inline-block" title="${escapeHtml(c.color)}" style="background-color: ${escapeHtml(c.color_code || '#ddd')}"></span>
            `).join('')}
            ${distinctColors.length > 5 ? `<span class="text-[10px] text-ink font-black">+${distinctColors.length - 5}</span>` : ''}
          </div>
        `;
      }
    }

    const storeParam = CURRENT_STORE_ID ? `&store_id=${CURRENT_STORE_ID}` : '';
    const prodUrl = `/product.html?slug=${encodeURIComponent(p.slug)}${storeParam}`;

    const isWholesale = p.pack_quantity && Number(p.pack_quantity) > 1;
    const packBadge = isWholesale
      ? `<span class="text-[11px] bg-forest/10 text-forest-dark font-black px-2 py-0.5 rounded-md">عبوة (${p.pack_quantity} قطعة)</span>`
      : `<span class="text-[11px] bg-sand-deep text-ink/70 font-black px-2 py-0.5 rounded-md">قطعة واحدة</span>`;
    const perPieceText = isWholesale
      ? `<span class="text-[10px] text-ink/60 font-bold">سعر القطعة: ${money(Math.round(p.price / p.pack_quantity))}</span>`
      : '';
    const addBtnLabel = outOfStock
      ? 'غير متوفر'
      : (p.has_variants ? 'اختر الخيارات' : (isWholesale ? 'أضف للسلة' : 'أضف للسلة'));

    
      const mainImg = p.image || '/img/placeholder.svg';
      card.onclick = () => location.href = prodUrl;
      card.innerHTML = `
  <img src="${escapeHtml(mainImg)}" loading="lazy" decoding="async" class="product-img opacity-0 w-full h-full object-cover transition-all duration-500" />
  <div class="lekidi-card-body">
    <a href="${prodUrl}" class="lekidi-title line-clamp-2">${escapeHtml(p.name)}</a>
    ${colorDotsHtml ? `<div class="flex justify-center gap-1">${colorDotsHtml}</div>` : ''}
    <div class="lekidi-price">${money(p.price)}</div>
    <button class="lekidi-btn add-to-cart">${addBtnLabel}</button>
  </div>
`;

      // Attach onload safely for CSP
      const imgEl = card.querySelector('.product-img');
      if (imgEl) {
        if (imgEl.complete) {
          if (!imgEl.naturalWidth) imgEl.src = '/img/placeholder.svg';
          imgEl.classList.remove('opacity-0');
        } else {
          imgEl.addEventListener('load', () => imgEl.classList.remove('opacity-0'), { once: true });
          imgEl.addEventListener('error', () => {
            imgEl.src = '/img/placeholder.svg';
            imgEl.classList.remove('opacity-0');
          }, { once: true });
        }
      }

    if (!outOfStock) {
      const btn = card.querySelector('.add-to-cart');
      if (p.has_variants) {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          window.location.href = prodUrl;
        });
      } else {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const inCart = Cart.get().find((i) => i.id === p.id && !i.variant_id);
          const currentQty = inCart ? inCart.qty : 0;
          if (currentQty + 1 > p.stock) {
            showToast(`الكمية المتوفرة من هذا المنتج ${p.stock} فقط ⚠️`);
            return;
          }
          Cart.add(p, 1);
          showToast('تمت إضافة المنتج إلى السلة ✅');
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
  const cc = document.getElementById('cartCount'); if (cc) cc.textContent = count; const dcc = document.getElementById('cartCountDesktopHeader'); if(dcc) dcc.textContent = count;
  const bcc = document.getElementById('bottomCartCount');
  if (bcc) bcc.textContent = count;
}

function renderCartDrawer() {
  updateCartCount();
  const deskInp = document.getElementById('searchInput');
  const attInp = document.getElementById('attachedSearchInput');
  const mobInp = document.getElementById('mobileSearchInput');
  if (deskInp && SEARCH_QUERY) deskInp.value = SEARCH_QUERY;
  if (attInp && SEARCH_QUERY) attInp.value = SEARCH_QUERY;
  if (mobInp && SEARCH_QUERY) mobInp.value = SEARCH_QUERY;
  const items = Cart.get();
  const container = document.getElementById('cartItemsList');
  container.innerHTML = '';

  if (!items.length) {
    container.innerHTML = '<p class="text-center text-ink font-black mt-10 text-base">السلة فارغة</p>';
    document.getElementById('cartTotal').textContent = money(0);
    return;
  }

  for (const item of items) {
    const row = document.createElement('div');
    row.className = 'flex items-center gap-3 bg-white p-3 rounded-xl shadow-sm border border-red-900/10 mb-3';
    const totalPieces = (item.pack_quantity || 1) * item.qty;
    row.innerHTML = `
      <img src="${escapeHtml(item.image || '/img/placeholder.svg')}" class="w-14 h-14 object-cover rounded-lg bg-sand-deep border-2 border-ink shadow-2xs" />
      <div class="flex-1">
        <p class="text-sm font-black text-ink line-clamp-1">${escapeHtml(item.name)}${item.variant_label ? ` <span class="text-xs text-forest-dark font-black">(${escapeHtml(item.variant_label)})</span>` : ''}</p>
        <p class="text-xs text-ink font-bold">${money(item.price)} <span class="text-[10px] text-ink/60 font-normal">/ عبوة</span></p>
        <p class="text-[11px] text-forest-dark font-black">المجموع: ${totalPieces} قطعة (${item.qty} عبوة)</p>
        <div class="flex items-center gap-2 mt-1">
          <button class="qty-btn dec w-8 h-8 rounded-xl border-2 border-slate-200 bg-white text-slate-700 font-bold text-base flex items-center justify-center hover:border-blue-400 hover:text-red-700 transition-all">-</button>
          <span class="text-sm font-black text-ink">${item.qty} عبوة</span>
          <button class="qty-btn inc w-8 h-8 rounded-xl border-2 border-slate-200 bg-white text-slate-700 font-bold text-base flex items-center justify-center hover:border-blue-400 hover:text-red-700 transition-all">+</button>
        </div>
      </div>
      <button class="remove-btn w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all text-base">حذف</button>
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
  if(content) setTimeout(() => { content.classList.remove('-translate-x-full'); content.classList.add('translate-x-0'); }, 10);
}
function closeCart() {
  const drawer = document.getElementById('cartDrawer');
  const content = document.getElementById('cartDrawerContent');
  if(content) { content.classList.add('-translate-x-full'); content.classList.remove('translate-x-0'); }
  if(drawer) setTimeout(() => drawer.classList.add('hidden'), 300);
}

document.getElementById('cartBtn')?.addEventListener('click', openCart);
document.getElementById('closeCart')?.addEventListener('click', closeCart);
document.getElementById('cartDrawer')?.addEventListener('click', (e) => { if (e.target === e.currentTarget) closeCart(); });
  document.getElementById('checkoutOverlay')?.addEventListener('click', (e) => { if (e.target === e.currentTarget) { document.getElementById('checkoutModalContent')?.classList.add('translate-y-full'); document.getElementById('checkoutOverlay').classList.add('hidden'); } });

// ---------- إتمام الطلب: الولاية / البلدية / نوع التوصيل ----------
const wilayaSelect = document.getElementById('custWilaya');
const communeSelect = document.getElementById('custCommune');

Locations.loadWilayas(wilayaSelect);

wilayaSelect?.addEventListener('change', async () => {
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
    document.querySelectorAll('.delivery-option').forEach((l) => {
      l.classList.remove('selected', 'border-primary', 'bg-red-50/40');
      l.classList.add('border-[var(--border)]');
    });
    label.classList.add('selected', 'border-primary', 'bg-red-50/40');
    label.classList.remove('border-[var(--border)]');
    const radio = label.querySelector('input');
    if (radio) radio.checked = true;
    CURRENT_DELIVERY_TYPE = label.dataset.type;
    updateDeliveryPrices();
  });
});

function currentDeliveryPrice() {
  if (!wilayaSelect || !wilayaSelect.value) return 0;
  const rate = typeof Locations !== 'undefined' ? Locations.getRate(wilayaSelect.value) : null;
  if (!rate) return 0;
  return CURRENT_DELIVERY_TYPE === 'desk' ? rate.desk_price : rate.home_price;
}

let CURRENT_DYNAMIC_SHIPPING = null;

async function updateDeliveryPrices() {
  const code = wilayaSelect ? wilayaSelect.value : '';
  const notice = document.getElementById('selectWilayaNotice');
  const storeId = CURRENT_STORE_ID || (Cart.get()[0] && Cart.get()[0].user_id) || 1;
  const subtotal = Cart.total();

  if (!code) {
    document.querySelectorAll('.delivery-option').forEach((label) => {
      const priceEl = label.querySelector('.delivery-price');
      if (priceEl) priceEl.textContent = '-- د.ج';
    });
    if (notice) notice.classList.remove('hidden');
    CURRENT_DYNAMIC_SHIPPING = null;
    updateGrandTotal();
    return;
  }

  if (notice) notice.classList.add('hidden');

  try {
    const [homeRes, deskRes] = await Promise.all([
      fetch(`/api/shipping/calculate-cost?store_id=${storeId}&wilaya_code=${code}&delivery_type=home&subtotal=${subtotal}`),
      fetch(`/api/shipping/calculate-cost?store_id=${storeId}&wilaya_code=${code}&delivery_type=desk&subtotal=${subtotal}`)
    ]);
    
    if (!homeRes.ok || !deskRes.ok) throw new Error('تعذر حساب سعر التوصيل');
    const homeData = await homeRes.json();
    const deskData = await deskRes.json();

    document.querySelectorAll('.delivery-option').forEach((label) => {
      const priceEl = label.querySelector('.delivery-price');
      if (!priceEl) return;
      const isDesk = label.dataset.type === 'desk';
      const data = isDesk ? deskData : homeData;
      
      if (data.is_unavailable) {
        priceEl.innerHTML = '<span class="text-rose-600 font-bold">غير متوفر</span>';
      } else if (data.is_free) {
        priceEl.innerHTML = '<span class="text-emerald-600 font-black">مجاني 🎉</span>';
      } else {
        priceEl.textContent = money(data.price);
      }
    });

    const selectedData = CURRENT_DELIVERY_TYPE === 'desk' ? deskData : homeData;
    CURRENT_DYNAMIC_SHIPPING = selectedData && !selectedData.is_unavailable ? selectedData.price : 0;
  } catch (err) {
    // Fallback to static rates
    const rate = typeof Locations !== 'undefined' ? Locations.getRate(code) : null;
    document.querySelectorAll('.delivery-option').forEach((label) => {
      const priceEl = label.querySelector('.delivery-price');
      if (!priceEl) return;
      if (!rate) {
        priceEl.textContent = '-- د.ج';
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
  const subtotal = Cart.total();
  const grand = subtotal + (deliveryFee || 0);

  const cartTotalEl = document.getElementById('cartTotal');
  if (cartTotalEl) cartTotalEl.textContent = money(grand);

  const subtotalEl = document.getElementById('checkoutSubtotal');
  if (subtotalEl) subtotalEl.textContent = money(subtotal);

  const feeEl = document.getElementById('checkoutDeliveryFee');
  if (feeEl) {
    if (wilayaSelect && wilayaSelect.value && deliveryFee !== null) {
      feeEl.textContent = deliveryFee === 0 ? 'مجاني 🎉' : money(deliveryFee);
    } else {
      feeEl.textContent = '-- د.ج';
    }
  }

  const grandEl = document.getElementById('checkoutGrandTotal');
  if (grandEl) grandEl.textContent = money(grand);
}

async function loadSavedCustomer() {
  try {
    const saved = localStorage.getItem('savedCustomer');
    if (!saved) return;
    const data = JSON.parse(saved);
    const form = document.getElementById('checkoutForm');
    if (form) {
      if (data.customer_name) form.customer_name.value = data.customer_name;
      if (data.phone) form.phone.value = data.phone;
      if (data.address) form.address.value = data.address;
      const wSelect = document.getElementById('custWilaya');
      const cSelect = document.getElementById('custCommune');
      if (wSelect && data.wilaya_code) {
        // loadWilayas is synchronous so options are populated
        wSelect.value = String(data.wilaya_code);
        if (wSelect.value) {
          if (cSelect) {
            cSelect.disabled = false;
            await Locations.loadCommunes(data.wilaya_code, cSelect);
            if (data.commune) cSelect.value = data.commune;
          }
          await updateDeliveryPrices();
        }
      }
    }
  } catch (e) { console.error('loadSavedCustomer error:', e); }
}
// ---------- إتمام الطلب ----------
document.getElementById('checkoutBtn')?.addEventListener('click', async () => {
  if (!Cart.get().length) return;
  closeCart();
  updateGrandTotal();
  document.getElementById('checkoutModalContent')?.classList.remove('translate-y-full');
  document.getElementById('checkoutOverlay').classList.remove('hidden');
});
document.getElementById('cancelCheckoutHeader')?.addEventListener('click', () => { document.getElementById('checkoutModalContent')?.classList.add('translate-y-full'); document.getElementById('checkoutOverlay').classList.add('hidden'); });
document.getElementById('cancelCheckout')?.addEventListener('click', () => {
  document.getElementById('checkoutModalContent')?.classList.add('translate-y-full');
  document.getElementById('checkoutOverlay').classList.add('hidden');
});

document.getElementById('checkoutForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  const errorEl = document.getElementById('checkoutError' /* */);
  errorEl.classList.add('hidden');

  // Conflict detection
  const savedC = (() => { try { const s = localStorage.getItem('savedCustomer'); return s ? JSON.parse(s) : null; } catch(err){ return null; }})();
  const currentName = (form.customer_name?.value || '').trim();
  const currentPhone = (form.phone?.value || '').trim();
  const currentWilaya = parseInt(form.wilaya_code?.value, 10);
  const currentCommune = (form.commune?.value || '').trim();
  const currentAddress = (form.address?.value || '').trim();
  
  const nameChanged = savedC && savedC.customer_name && currentName && savedC.customer_name !== currentName;
  const phoneChanged = savedC && savedC.phone && currentPhone && savedC.phone !== currentPhone;
  const wilayaChanged = savedC && savedC.wilaya_code && currentWilaya && parseInt(savedC.wilaya_code, 10) !== currentWilaya;
  const communeChanged = savedC && savedC.commune && currentCommune && savedC.commune !== currentCommune;
  const addressChanged = savedC && savedC.address && currentAddress && savedC.address !== currentAddress;

  if (nameChanged || phoneChanged || wilayaChanged || communeChanged || addressChanged) {
    await new Promise(resolve => {
      const modal = document.getElementById('conflictModal');
      if (!modal) { resolve(); return; }
      const oldBox = document.getElementById('conflictOldBox');
      const newBox = document.getElementById('conflictNewBox');
      
      const wilayaNameOld = typeof Locations !== 'undefined' ? (Locations.getRate(savedC.wilaya_code)?.wilaya_name || savedC.wilaya_code) : savedC.wilaya_code;
      const wilayaNameNew = typeof Locations !== 'undefined' ? (Locations.getRate(currentWilaya)?.wilaya_name || currentWilaya) : currentWilaya;
      if (oldBox) oldBox.innerHTML = '<span style="font-size:11px;color:#64748b;font-weight:bold;display:block;margin-bottom:4px">البيانات السابقة المسجلة:</span><div style="color:#0f172a;font-weight:800;">' + escapeHtml(savedC.customer_name || '-') + ' (' + escapeHtml(savedC.phone || '-') + ')</div><div style="color:#475569;font-size:12px;margin-top:2px;">ولاية ' + escapeHtml(wilayaNameOld) + ' - ' + escapeHtml(savedC.commune || '') + ' - ' + escapeHtml(savedC.address || '') + '</div>';
      if (newBox) newBox.innerHTML = '<span style="font-size:11px;color:#dc2626;font-weight:bold;display:block;margin-bottom:4px">البيانات الجديدة التي أدخلتها الآن:</span><div style="color:#0f172a;font-weight:800;">' + escapeHtml(currentName || '-') + ' (' + escapeHtml(currentPhone || '-') + ')</div><div style="color:#475569;font-size:12px;margin-top:2px;">ولاية ' + escapeHtml(wilayaNameNew) + ' - ' + escapeHtml(currentCommune) + ' - ' + escapeHtml(currentAddress) + '</div>';
      modal.style.display = 'flex';
      
      document.getElementById('conflictUseOld').onclick = async () => {
        if (form.customer_name) form.customer_name.value = savedC.customer_name || '';
        if (form.phone) form.phone.value = savedC.phone || '';
        if (form.address) form.address.value = savedC.address || '';
        if (form.wilaya_code) {
         form.wilaya_code.value = String(savedC.wilaya_code || '');
         if (savedC.wilaya_code && communeSelect) {
          communeSelect.disabled = false;
          await Locations.loadCommunes(savedC.wilaya_code, communeSelect);
          communeSelect.value = savedC.commune || '';
         }
         await updateDeliveryPrices();
        }
        modal.style.display = 'none';
        resolve();
      };
      document.getElementById('conflictUseNew').onclick = () => {
        modal.style.display = 'none';
        resolve();
      };
    });
  }

  const cartItems = Cart.get();
  const storeId = CURRENT_STORE_ID || (cartItems[0] && cartItems[0].user_id);
  if (!storeId || cartItems.some((item) => !item.user_id || String(item.user_id) !== String(storeId))) {
    errorEl.textContent = 'يجب أن تحتوي الطلبية على منتجات من متجر واحد. أزل منتجات المتاجر الأخرى أو أفرغ السلة.';
    errorEl.classList.remove('hidden');
    return;
  }

  const submitBtn = form.querySelector('button[type="submit"]');
  const origText = submitBtn ? submitBtn.textContent : '';
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'جارٍ تسجيل الطلب...';
  }

  const payload = {
    customer_name: form.customer_name.value.trim(),
    phone: form.phone.value.trim(),
    address: form.address.value.trim(),
    wilaya_code: Number(wilayaSelect.value),
    commune: (communeSelect ? communeSelect.value : '').trim(),
    delivery_type: CURRENT_DELIVERY_TYPE,
    items: cartItems.map((i) => ({ id: i.id, qty: i.qty, variant_id: i.variant_id || undefined })),
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

    
    localStorage.setItem('savedCustomer', JSON.stringify({
      customer_name: payload.customer_name,
      phone: payload.phone,
      address: payload.address,
      wilaya_code: payload.wilaya_code,
      commune: payload.commune
    }));
    Cart.clear();
    renderCartDrawer();
    document.getElementById('checkoutModalContent')?.classList.add('translate-y-full');
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
      document.querySelectorAll('#categoryDropdownMenu .cat-btn').forEach((b) => {
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



document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('categoryDropdownBtn');
  const menu = document.getElementById('categoryDropdownMenu');
  if (btn && menu) {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      menu.classList.toggle('hidden');
      menu.classList.toggle('flex');
    });
    document.addEventListener('click', (e) => {
      if (!btn.contains(e.target) && !menu.contains(e.target)) {
        menu.classList.add('hidden');
        menu.classList.remove('flex');
      }
    });
  }
});
