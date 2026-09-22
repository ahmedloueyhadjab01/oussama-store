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
  // احتفظ بـ referrer إذا لم يكن هناك utm_source (مثلاً زيارة عضوية من موقع آخر)
  if (!found && document.referrer && !sessionStorage.getItem('utm_source')) {
    try {
      const ref = new URL(document.referrer);
      sessionStorage.setItem('utm_source', ref.hostname);
    } catch {}
  }
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

  const nav = document.getElementById('categoryNav');
  nav.querySelectorAll('.cat-btn:not([data-cat=""])').forEach((b) => b.remove());

  for (const cat of CATEGORY_TREE) {
    const btn = document.createElement('button');
    btn.className = 'cat-btn px-4 py-1.5 rounded-full text-sm font-bold transition-colors whitespace-nowrap bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900';
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
  div.textContent = str;
  return div.innerHTML;
}

async function loadProducts() {
  const grid = document.getElementById('productsGrid');
  if (grid) {
    grid.innerHTML = Array(8).fill(`
      <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col animate-pulse">
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
      empty.innerHTML = `لم يتم العثور على منتجات مطابقة لـ "<strong>${escapeHtmlSimple(SEARCH_QUERY)}</strong>"<br><span class="text-xs font-normal text-ink/60 mt-1.5 block">تأكد من كتابة الكلمات بشكل صحيح أو ابحث باسم الصنف أو الوصف</span>`;
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
    card.className = 'bg-white rounded-2xl shadow-sm hover:shadow-xl border border-gray-100 transition-all duration-300 overflow-hidden flex flex-col group cursor-pointer';

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
              <span class="w-3.5 h-3.5 rounded-full border-2 border-ink shadow-xs inline-block" title="${escapeHtml(c.color)}" style="background-color: ${c.color_code || '#ddd'}"></span>
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
      ? 'غير متوفر حاليًا'
      : (p.has_variants ? 'اختر الخيارات 📦' : (isWholesale ? 'أضف العبوة للسلة 🛒' : 'أضف للسلة 🛒'));

    
      // Clean SVGs instead of emojis, beautiful blue theme
      const mainImg = p.image || '/img/placeholder.svg';
      card.innerHTML = `
        <div class="relative aspect-[4/5] bg-gray-100 overflow-hidden cursor-pointer" onclick="location.href='/product.html?id=${p.id}'">
          <img src="${mainImg}" class="product-img opacity-0 w-full h-full object-cover transition-all duration-700 ${outOfStock ? 'grayscale' : 'group-hover:scale-110'}" />
          ${outOfStock ? '<span class="absolute top-2 right-2 bg-red-500 text-white text-[10px] font-black px-2 py-1 rounded shadow-sm">نفد</span>' : ''}
          <div class="absolute inset-0 bg-blue-900/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        </div>
        <div class="p-4 flex flex-col gap-2 flex-1">
          <div class="flex items-start justify-between gap-2">
            <h3 class="font-black text-sm text-gray-900 line-clamp-2 leading-snug cursor-pointer hover:text-blue-600 transition-colors" onclick="location.href='/product.html?id=${p.id}'">${escapeHtml(p.name)}</h3>
            ${p.compare_price > p.price ? `<span class="bg-blue-50 text-blue-600 text-[9px] font-black px-1.5 py-0.5 rounded-full shrink-0">-${Math.round((1 - p.price/p.compare_price)*100)}%</span>` : ''}
          </div>
          ${colorDotsHtml ? `<div class="flex items-center gap-1.5 mt-0.5">${colorDotsHtml}</div>` : ''}
          <div class="mt-auto pt-2 flex items-center justify-between">
            <div class="flex flex-col">
              <span class="text-lg font-black text-blue-600">${money(p.price)}</span>
              ${p.compare_price > p.price ? `<span class="text-[10px] text-gray-400 font-bold line-through">${money(p.compare_price)}</span>` : ''}
            </div>
            <button onclick="${outOfStock ? '' : `addToCart(${p.id}, '${escapeHtml(p.name).replace(/'/g,"\\'")}', ${p.price}, '${mainImg}')`}" class="${outOfStock ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg hover:-translate-y-0.5'} add-to-cart w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300">
              ${outOfStock ? '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>' : '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>'}
            </button>
          </div>
        </div>
      `;

      // Attach onload safely for CSP
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
    
    let targetContainer = grid;

    if (!CURRENT_CATEGORY && !SEARCH_QUERY) {
      let catId = p.category_id || 'other';
      let catName = p.category_name || 'أخرى';
      let catSection = document.getElementById('cat-section-' + catId);
      
      if (!catSection) {
        catSection = document.createElement('div');
        catSection.id = 'cat-section-' + catId;
        catSection.className = 'col-span-full mb-4 sm:mb-8 bg-white/50 rounded-3xl p-3 sm:p-5 border border-slate-200/50'; 
        
        catSection.innerHTML = `
          <div class="flex justify-between items-center mb-4 px-1">
            <h2 class="text-lg sm:text-2xl font-black text-slate-900 flex items-center gap-2">
              <span class="w-1.5 h-6 sm:h-8 bg-blue-600 rounded-full inline-block"></span> 
              ${escapeHtml(catName)}
            </h2>
            <button onclick="CURRENT_CATEGORY='${p.category_id || ''}'; loadProducts(); window.scrollTo(0,0);" class="text-blue-600 text-xs sm:text-sm font-bold hover:bg-blue-50 px-3 py-1.5 rounded-full transition-colors flex items-center gap-1">
              عرض الكل 
              <svg class="w-4 h-4 rtl:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
            </button>
          </div>
          <div class="flex overflow-x-auto gap-3 sm:gap-5 snap-x snap-mandatory no-scrollbar pb-2" id="cat-slider-${catId}">
          </div>
        `;
        grid.appendChild(catSection);
      }
      
      targetContainer = catSection.querySelector('#cat-slider-' + catId);
      card.className = card.className + ' min-w-[160px] max-w-[160px] sm:min-w-[240px] sm:max-w-[240px] shrink-0 snap-start';
    }

    targetContainer.appendChild(card);

  }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
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
    container.innerHTML = '<p class="text-center text-ink font-black mt-10 text-base">السلة فارغة</p>';
    document.getElementById('cartTotal').textContent = money(0);
    return;
  }

  for (const item of items) {
    const row = document.createElement('div');
    row.className = 'flex items-center gap-3 border-b-2 border-ink/20 pb-3';
    const totalPieces = (item.pack_quantity || 1) * item.qty;
    row.innerHTML = `
      <img src="${item.image || '/img/placeholder.svg'}" class="w-14 h-14 object-cover rounded-lg bg-sand-deep border-2 border-ink shadow-2xs" />
      <div class="flex-1">
        <p class="text-sm font-black text-ink line-clamp-1">${escapeHtml(item.name)}${item.variant_label ? ` <span class="text-xs text-forest-dark font-black">(${escapeHtml(item.variant_label)})</span>` : ''}</p>
        <p class="text-xs text-ink font-bold">${money(item.price)} <span class="text-[10px] text-ink/60 font-normal">/ عبوة</span></p>
        <p class="text-[11px] text-forest-dark font-black">المجموع: ${totalPieces} قطعة (${item.qty} عبوة)</p>
        <div class="flex items-center gap-2 mt-1">
          <button class="qty-btn dec btn-outline rounded-lg w-6 h-6 text-sm font-black flex items-center justify-center">-</button>
          <span class="text-sm font-black text-ink">${item.qty} عبوة</span>
          <button class="qty-btn inc btn-outline rounded-lg w-6 h-6 text-sm font-black flex items-center justify-center">+</button>
        </div>
      </div>
      <button class="remove-btn text-terracotta text-xs font-black hover:underline">حذف</button>
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
  document.getElementById('checkoutOverlay' /* renamed overlay */).classList.remove('hidden');
  document.getElementById('cartDrawer').classList.add('open');
}
function closeCart() {
  document.getElementById('checkoutOverlay' /* renamed overlay */).classList.add('hidden');
  document.getElementById('cartDrawer').classList.remove('open');
}

document.getElementById('cartBtn')?.addEventListener('click', openCart);
document.getElementById('closeCart')?.addEventListener('click', closeCart);
document.getElementById('checkoutOverlay' /* renamed overlay */).addEventListener('click', closeCart);

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
        priceEl.innerHTML = '<span class="text-rose-700 font-black">غير متاح</span>';
      } else if (data.is_free) {
        priceEl.innerHTML = '<span class="text-forest font-black">مجاني 🎉</span>';
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
  }
})();

