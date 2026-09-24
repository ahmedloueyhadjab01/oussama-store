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

    function money(n) { return `${Number(n).toLocaleString('ar-DZ')} ϻϼ`; }
    function escapeHtml(str) { const d = document.createElement('div'); d.textContent = str; return d.innerHTML; }
    function showToast(msg) {
      const t = document.getElementById('successToast'); t.textContent = msg; t.classList.remove('hidden');
      setTimeout(() => t.classList.add('hidden'), 2500);
    }

    // ---------- ϦϦ�� Ϧ+�Ϯ Ϻ+�ϬϦ+�+� +�Ϧ ϦϻϺϻϺϬ Ϻ+�+�+�+�Ϯ +�Ϻ+�ϡϦ+� ----------
    function renderCartDrawer() {
      const items = Cart.get();
      const container = document.getElementById('cartItems');
      container.innerHTML = '';

      if (!items.length) {
        container.innerHTML = '<p class="text-center text-slate-900 font-black mt-10 text-base">Ϻ+�Ϧ+�Ϯ +�ϺϦϦϮ</p>';
        document.getElementById('cartTotal').textContent = money(0);
        return;
      }

      for (const item of items) {
        const row = document.createElement('div');
        row.className = 'flex items-center gap-3 border-b-2 border-slate-200/20 pb-3';
        const totalPieces = (item.pack_quantity || 1) * item.qty;
        row.innerHTML = `
          <img src="${item.image || '/img/placeholder.svg'}" class="w-14 h-14 object-cover rounded-lg bg-slate-50-deep border border-slate-200 shadow-2xs" />
          <div class="flex-1">
            <p class="text-sm font-black text-slate-900 line-clamp-1">${escapeHtml(item.name)}${item.variant_label ? ` <span class="text-xs text-blue-600 font-black">(${escapeHtml(item.variant_label)})</span>` : ''}</p>
            <p class="text-xs text-slate-900 font-bold">${money(item.price)} <span class="text-[10px] text-slate-900/60 font-normal">/ ϦϿ+�Ϯ</span></p>
            <p class="text-[11px] text-blue-600 font-black">Ϻ+�+�ϼ+�+�Ϧ: ${totalPieces} +���ϦϮ (${item.qty} ϦϿ+�Ϯ)</p>
            <div class="flex items-center gap-2 mt-1">
              <button class="qty-btn dec btn-outline rounded-lg w-6 h-6 text-sm font-black flex items-center justify-center">-</button>
              <span class="text-sm font-black text-slate-900">${item.qty} ϦϿ+�Ϯ</span>
              <button class="qty-btn inc btn-outline rounded-lg w-6 h-6 text-sm font-black flex items-center justify-center">+</button>
            </div>
          </div>
          <button class="remove-btn text-red-500 text-xs font-black hover:underline">ϡϦ+�</button>
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
  const overlay = document.getElementById('cartOverlay');
  if(drawer) drawer.classList.remove('-translate-x-full');
  if(overlay) {
    overlay.classList.remove('hidden');
    setTimeout(() => overlay.classList.remove('opacity-0'), 10);
  }
}

    function closeCart() {
  const drawer = document.getElementById('cartDrawer');
  const overlay = document.getElementById('cartOverlay');
  if(drawer) drawer.classList.add('-translate-x-full');
  if(overlay) {
    overlay.classList.add('opacity-0');
    setTimeout(() => overlay.classList.add('hidden'), 300);
  }
}

    document.getElementById('cartBtn')?.addEventListener('click', openCart);
document.getElementById('cartBtnMobile')?.addEventListener('click', openCart);
document.getElementById('closeCartBtn')?.addEventListener('click', closeCart);
document.getElementById('cartOverlay')?.addEventListener('click', closeCart);

    // ---------- ��Ϭ+�Ϻ+� Ϻ+���+�Ͽ (Checkout Modal) ϻϺϫ+� ��+�ϡϮ Ϻ+�+�+�Ϭϼ ----------
    const wilayaSelect = document.getElementById('wilayaSelect');
    const communeSelect = document.getElementById('communeSelect');

    Locations.loadWilayas(wilayaSelect);

    wilayaSelect?.addEventListener('change', async () => {
      const code = wilayaSelect.value;
      if (!code) {
        communeSelect.disabled = true;
        communeSelect.innerHTML = '<option value="">Ϻ+�Ͽ+�ϻ+�Ϯ...</option>';
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

    function currentDeliveryPrice() {
      const rate = Locations.getRate(wilayaSelect.value);
      if (!rate) return 0;
      return CURRENT_DELIVERY_TYPE === 'desk' ? rate.desk_price : rate.home_price;
    }

    
    let CURRENT_DYNAMIC_SHIPPING = null;

    async function updateDeliveryPrices() {
      const code = wilayaSelect.value;
      const subtotal = Cart.total();
      const hint = document.getElementById('selectWilayaHint');
      const storeId = (PRODUCT_DATA && PRODUCT_DATA.user_id) || (Cart.get()[0] && Cart.get()[0].user_id) || CURRENT_STORE_ID;
      
      if (!code || !storeId) {
        document.querySelectorAll('.delivery-option').forEach((label) => {
          label.querySelector('.delivery-price').textContent = '-';
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
        if (!homeRes.ok || !deskRes.ok) throw new Error('error');
        
        const homeData = await homeRes.json();
        const deskData = await deskRes.json();
        
        document.querySelector('.delivery-option[data-type="home"] .delivery-price').textContent = homeData.is_unavailable ? 'Ϧ+�Ϧ +�Ϭ+�+�Ϧ' : money(homeData.price);
        document.querySelector('.delivery-option[data-type="desk"] .delivery-price').textContent = deskData.is_unavailable ? 'Ϧ+�Ϧ +�Ϭ+�+�Ϧ' : money(deskData.price);
        
        const selectedData = CURRENT_DELIVERY_TYPE === 'desk' ? deskData : homeData;
        if (selectedData.is_unavailable) throw new Error('unavailable');
        CURRENT_DYNAMIC_SHIPPING = selectedData.price;
      } catch (err) {
        const rate = Locations.getRate(code);
        document.querySelectorAll('.delivery-option').forEach((label) => {
          if (!rate) { label.querySelector('.delivery-price').textContent = '���'; return; }
          const price = label.dataset.type === 'desk' ? rate.desk_price : rate.home_price;
          label.querySelector('.delivery-price').textContent = money(price);
        });
        CURRENT_DYNAMIC_SHIPPING = rate ? (CURRENT_DELIVERY_TYPE === 'desk' ? rate.desk_price : rate.home_price) : 0;
      }
      updateGrandTotal();
    }

    function currentDeliveryPrice() {
      const rate = Locations.getRate(wilayaSelect.value);
      if (!rate) return 0;
      return CURRENT_DELIVERY_TYPE === 'desk' ? rate.desk_price : rate.home_price;
    }

    function updateGrandTotal() {
      const deliveryFee = CURRENT_DYNAMIC_SHIPPING !== null ? CURRENT_DYNAMIC_SHIPPING : currentDeliveryPrice();
      const grand = Cart.total() + (deliveryFee || 0);
      document.getElementById('checkoutGrandTotal').textContent = money(grand);
    }

    function openCheckout() {
      if (!Cart.get().length) {
        showToast('Ϻ+�Ϧ+�Ϯ +�ϺϦϦϮ�� +�Ϧϼ+� ����Ϻ+�Ϯ +�+�Ϭϼ ��+�+�Ϻ+� ��ᴩ�');
        return;
      }
      closeCart();
      updateGrandTotal();
      const modal = document.getElementById('checkoutModal');
if(modal) {
  modal.classList.remove('hidden');
  modal.classList.add('flex');
  setTimeout(() => modal.querySelector('.bg-white').classList.remove('translate-y-full'), 10);
}
    }

    function closeCheckout() {
      const modal = document.getElementById('checkoutModal');
if(modal) {
  const inner = modal.querySelector('.bg-white');
  if(inner) inner.classList.add('translate-y-full');
  setTimeout(() => { modal.classList.add('hidden'); modal.classList.remove('flex'); }, 300);
}
    }

    document.getElementById('checkoutBtn').addEventListener('click', openCheckout);
    document.getElementById('cancelCheckout').addEventListener('click', closeCheckout);
    document.getElementById('cancelCheckoutHeader').addEventListener('click', closeCheckout);

    // +�ϦϺ+�ϼ ��ϦϦϺ+� Ϻ+���+�Ͽ (Submit Order)
    document.getElementById('checkoutForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const form = e.target;
      const errorEl = document.getElementById('checkoutError') || document.createElement('div');
      errorEl.classList.add('hidden');

      const submitBtn = document.getElementById('submitOrderBtn');
      const origText = submitBtn.textContent;
      submitBtn.disabled = true;
      submitBtn.textContent = 'ϼϺϦ+� ϬϦϼ+�+� Ϻ+���+�Ͽ...';

      const storeId = (PRODUCT_DATA && PRODUCT_DATA.user_id) || (Cart.get()[0] && Cart.get()[0].user_id);
      if (!storeId) {
        errorEl.textContent = 'ϬϦϦϦ Ϭϡϻ+�ϻ Ϻ+�+�ϬϼϦ +�+�ϦϺ Ϻ+���+�Ͽ. ��Ϧϻ +�Ϭϡ ��+�ϡϮ Ϻ+�+�ϬϼϦ +�ϡϺ+�+� +�ϦϮ ��ϫϦ+�.';
        errorEl.classList.remove('hidden');
        submitBtn.disabled = false;
        submitBtn.textContent = origText;
        return;
      }
      const payload = {
        customer_name: document.getElementById('customerName').value.trim(),
        phone: document.getElementById('customerPhone').value.trim(),
        address: document.getElementById('customerAddress').value.trim(),
        wilaya_code: Number(wilayaSelect.value),
        commune: communeSelect.value.trim(),
        delivery_type: CURRENT_DELIVERY_TYPE,
        items: Cart.get().map((i) => ({ id: i.id, qty: i.qty, variant_id: i.variant_id || undefined })),
        store_id: storeId,
        ...getUtmParams(),
      };

      if (!payload.wilaya_code || !payload.commune) {
        errorEl.textContent = 'Ϻ+�ϦϼϺ�� ϺϫϬ+�ϺϦ Ϻ+�+�+�Ϻ+�Ϯ +�Ϻ+�Ͽ+�ϻ+�Ϯ';
        errorEl.classList.remove('hidden');
        submitBtn.disabled = false;
        submitBtn.textContent = origText;
        return;
      }

      try {
        const res = await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'ϡϻϽ ϫ���� ��Ͻ+�Ϻ�� ��Ϭ+�Ϻ+� Ϻ+���+�Ͽ');

        Cart.clear();
        closeCheckout();
        form.reset();
        communeSelect.disabled = true;
        communeSelect.innerHTML = '<option value="">Ϻ+�Ͽ+�ϻ+�Ϯ...</option>';
        showToast(`Ϭ+� ϬϦϼ+�+� ��+�Ͽ+� Ͽ+�ϼϺϡ ���� Ϧ+�+� Ϻ+���+�Ͽ: ${data.order_id}`);
      } catch (err) {
        errorEl.textContent = err.message;
        errorEl.classList.remove('hidden');
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = origText;
      }
    });

    // ---------- +�ϦϦ�� Ϻ+���+�Ϧ +�Ϻ+�+�+�+�Ͽ+�+�Ϧ ----------
    let GALLERY_IMAGES = [];
    let GALLERY_INDEX = 0;
    let PRODUCT_DATA = null;
    let SELECTED_COLOR = null;
    let SELECTED_SIZE = null;
    let SELECTED_VARIANT = null;

    function renderMainImage(customSrc = null) {
      const img = document.getElementById('mainProductImage');
      if (!img) return;
      const targetSrc = customSrc || GALLERY_IMAGES[GALLERY_INDEX] || '/img/placeholder.svg';
      
      img.style.opacity = '0.5';
      setTimeout(() => {
        img.src = targetSrc;
        img.style.opacity = '1';
      }, 100);

      document.querySelectorAll('.thumb-btn').forEach((t, i) => {
        const isCurrent = (t.dataset.src === targetSrc) || (i === GALLERY_INDEX && !customSrc);
        t.classList.toggle('border-forest', isCurrent);
        t.classList.toggle('border-slate-200/20', !isCurrent);
      });
    }

    function goToImage(index) {
      GALLERY_INDEX = (index + GALLERY_IMAGES.length) % GALLERY_IMAGES.length;
      renderMainImage();
      if (!document.getElementById('lightbox').classList.contains('hidden')) renderLightbox();
    }

    function openLightbox(index) {
      GALLERY_INDEX = index;
      renderLightbox();
      const lb = document.getElementById('lightbox');
      lb.classList.remove('hidden');
      lb.classList.add('flex');
    }
    function closeLightbox() {
      const lb = document.getElementById('lightbox');
      lb.classList.add('hidden');
      lb.classList.remove('flex');
    }
    function renderLightbox() {
      document.getElementById('lightboxImg').src = GALLERY_IMAGES[GALLERY_INDEX] || '/img/placeholder.svg';
      document.getElementById('lightboxCounter').textContent = `${GALLERY_INDEX + 1} / ${GALLERY_IMAGES.length}`;
      document.getElementById('lightboxPrev').classList.toggle('hidden', GALLERY_IMAGES.length <= 1);
      document.getElementById('lightboxNext').classList.toggle('hidden', GALLERY_IMAGES.length <= 1);
    }

    document.getElementById('lightboxClose').addEventListener('click', closeLightbox);
    document.getElementById('lightbox').addEventListener('click', (e) => { if (e.target.id === 'lightbox') closeLightbox(); });
    document.getElementById('lightboxPrev').addEventListener('click', () => goToImage(GALLERY_INDEX - 1));
    document.getElementById('lightboxNext').addEventListener('click', () => goToImage(GALLERY_INDEX + 1));
    document.addEventListener('keydown', (e) => {
      if (document.getElementById('lightbox').classList.contains('hidden')) return;
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') goToImage(GALLERY_INDEX + 1);
      if (e.key === 'ArrowRight') goToImage(GALLERY_INDEX - 1);
    });

    function enableSwipe(el, onSwipeLeft, onSwipeRight) {
      let startX = 0;
      el.addEventListener('touchstart', (e) => { startX = e.touches[0].clientX; }, { passive: true });
      el.addEventListener('touchend', (e) => {
        const diff = e.changedTouches[0].clientX - startX;
        if (Math.abs(diff) < 40) return;
        if (diff < 0) onSwipeLeft(); else onSwipeRight();
      }, { passive: true });
    }
    enableSwipe(document.getElementById('lightbox'), () => goToImage(GALLERY_INDEX + 1), () => goToImage(GALLERY_INDEX - 1));

    (async function init() {
      const params = new URLSearchParams(location.search);
      const slug = params.get('slug');
      const el = document.getElementById('productDetail');
      if (!slug) { el.innerHTML = '<p class="text-center text-slate-900/40 py-20 font-bold">+�+�Ϭϼ Ϧ+�Ϧ +�+�ϼ+�ϻ</p>'; return; }

      const storeId = params.get('store_id');
      const storeSlug = params.get('store_slug');
      const storeQuery = storeId ? `&store_id=${encodeURIComponent(storeId)}` : (storeSlug ? `&store_slug=${encodeURIComponent(storeSlug)}` : '');
      const res = await fetch(`/api/products?slug=${encodeURIComponent(slug)}${storeQuery}`);
      const all = await res.json();
      const product = all[0];

      if (!product) { el.innerHTML = '<p class="text-center text-slate-900/40 py-20 font-bold">+�+�Ϭϼ Ϧ+�Ϧ +�+�ϼ+�ϻ</p>'; return; }
      PRODUCT_DATA = product;
      initSocialIcons('socialIconsProductFooter', { storeId: product.user_id });

      let allImages = (product.images && product.images.length) ? [...product.images] : [product.image || '/img/placeholder.svg'];
      if (product.variants) {
        for (const v of product.variants) {
          if (v.image && !allImages.includes(v.image)) {
            allImages.push(v.image);
          }
        }
      }
      GALLERY_IMAGES = allImages.filter(Boolean);
      GALLERY_INDEX = 0;

      const thumbsHtml = GALLERY_IMAGES.length > 1
        ? `<div id="galleryThumbs" class="flex gap-2 mt-3 overflow-x-auto no-scrollbar pb-1">
            ${GALLERY_IMAGES.map((img, i) => `
              <button class="thumb-btn w-16 h-16 shrink-0 rounded-xl overflow-hidden border-2 transition-all ${i === 0 ? 'border-forest ring-2 ring-forest/30' : 'border-slate-200/20 opacity-80'}" data-index="${i}" data-src="${img}">
                <img src="${img}" class="w-full h-full object-contain p-1" />
              </button>
            `).join('')}
          </div>`
        : '';

      el.innerHTML = `
        <div class="grid md:grid-cols-2 gap-8">
          <div>
            <div id="mainImageWrap" class="aspect-square bg-gray-200 animate-pulse rounded-2xl overflow-hidden border border-slate-200 relative cursor-zoom-in group shadow-sm">
              <img id="mainProductImage" src="${GALLERY_IMAGES[0]}" class="w-full h-full object-contain p-2 transition-opacity duration-700 opacity-0 ${product.stock <= 0 ? 'grayscale' : ''}"  />
              ${product.stock <= 0 ? '<span class="absolute top-3 right-3 bg-ink text-white text-xs font-extrabold px-3 py-1.5 rounded-full shadow">+�+�ϻ Ϻ+�+�ϫϦ+�+�</span>' : ''}
              <span class="absolute bottom-2 left-2 bg-ink/75 backdrop-blur-sm text-white text-[11px] font-bold px-2.5 py-1 rounded-full pointer-events-none">���� Ϻ��Ϧ�� +�+�Ϭ+�Ͽ+�Ϧ</span>
            </div>
            ${thumbsHtml}
          </div>
          <div class="flex flex-col">
            <h1 class="font-display text-3xl md:text-4xl mb-2 text-slate-900 font-black">${escapeHtml(product.name)}</h1>
            ${(() => {
              const isWholesale = (product.pack_quantity || 1) > 1;
              const packQty = product.pack_quantity || 1;
              return `
            <div class="flex flex-col gap-1 mb-4 bg-slate-50/60 border border-slate-200/20 rounded-2xl p-4">
              <div class="flex items-center justify-between">
                <span id="displayPrice" class="price-ticket lg inline-flex font-black">${money(product.price)}</span>
                ${isWholesale
                  ? `<span class="text-xs bg-blue-500 text-white font-black px-3 py-1 rounded-full">ϦϿ+�Ϯ (${packQty} +���ϦϮ)</span>`
                  : `<span class="text-xs bg-amber-500 text-white font-black px-3 py-1 rounded-full">+���ϦϮ +�ϺϡϻϮ</span>`
                }
              </div>
              ${isWholesale
                ? `<p class="text-xs font-bold text-slate-900/70">ϦϦϦ Ϻ+�+���ϦϮ ϻϺϫ+� Ϻ+�ϦϿ+�Ϯ: <span class="text-blue-600 font-black">${money(Math.round(product.price / packQty))}</span></p>`
                : ''
              }
            </div>`;
            })()}
            
            <p class="text-slate-900 font-semibold leading-relaxed mb-6 whitespace-pre-line text-sm bg-white/75 p-4 rounded-2xl border border-slate-200/20 shadow-2xs">${escapeHtml(product.description || '+�Ϻ +�+�ϼϻ +���+� +�+�ϦϺ Ϻ+�+�+�Ϭϼ ϿϦϻ.')}</p>
            
            <!-- +�Ϧ+� ϺϫϬ+�ϺϦ Ϻ+���+�+�Ϻ+� +�Ϻ+�+�+�ϺϦϺϬ Ϻ+�Ϭ+�ϺϦ+�+� -->
            <div id="variantsContainer" class="space-y-5 mb-6"></div>

            <!-- ϦϻϺϻ Ϻ+�+�+�+�Ϯ + ��ϦϦϺϦ Ϻ+�ϦϦϺ�� Ϻ+�+�+�Ϧ+� +�Ϻ+�����Ϻ+�Ϯ +�+�Ϧ+�Ϯ -->
            <div class="mt-auto pt-4 border-t-2 border-slate-200/20 space-y-3">
              ${(() => {
                const isWholesale = (product.pack_quantity || 1) > 1;
                const packQty = product.pack_quantity || 1;
                return `
              <div class="flex items-center justify-between gap-3 bg-white border border-slate-200/20 p-3 rounded-xl">
                <div class="flex items-center gap-2">
                  <span class="text-xs font-black text-slate-900">${isWholesale ? 'Ϧϻϻ Ϻ+�ϦϿ+�ϺϬ:' : 'Ϻ+�+�+�+�Ϯ:'}</span>
                  <div class="flex items-center gap-1.5 bg-slate-50-deep border border-slate-200 rounded-lg px-2 py-0.5 shadow-2xs">
                    <button id="qtyDecBtn" class="w-7 h-7 rounded-md font-black text-base flex items-center justify-center hover:bg-slate-50 transition-colors">-</button>
                    <input id="productQtyInput" type="number" min="1" value="1" class="w-10 text-center font-black text-sm text-slate-900 outline-none bg-transparent" />
                    <button id="qtyIncBtn" class="w-7 h-7 rounded-md font-black text-base flex items-center justify-center hover:bg-slate-50 transition-colors">+</button>
                  </div>
                </div>
                ${isWholesale ? `
                <div class="text-left">
                  <span class="text-[11px] text-slate-900/60 font-bold block">��ϼ+�Ϻ+�+� Ϻ+�+���Ϧ +�+� Ϻ+�ϦϿ+�Ϯ</span>
                  <span id="calculatedTotalPieces" class="text-sm font-black text-blue-600">${packQty} +���ϦϮ</span>
                </div>` : `<div id="calculatedTotalPieces" class="hidden"></div>`}
              </div>

              <div class="flex flex-wrap items-center gap-3">
                <button id="buyNowBtn" class="btn-primary flex-1 py-3.5 px-6 rounded-xl font-black text-base shadow-md flex items-center justify-center gap-2 transition-all active:scale-[0.98] bg-blue-500 text-white" ${product.stock <= 0 ? 'disabled style="opacity:.5;cursor:not-allowed"' : ''}>
                  <span>���</span>
                  <span>${product.stock <= 0 ? 'Ϧ+�Ϧ +�Ϭ+�+�Ϧ ϡϺ+�+�+�Ϻ' : (isWholesale ? 'Ϻ��+�Ͽ Ϻ+���+� (ϦϿ+�Ϯ +�Ϻ+�+�Ϯ)' : 'Ϻ��+�Ͽ Ϻ+���+� ���')}</span>
                </button>
                <button id="addBtn" class="btn-outline flex-1 py-3.5 px-6 rounded-xl font-black text-base shadow-md flex items-center justify-center gap-2 transition-all active:scale-[0.98]" ${product.stock <= 0 ? 'disabled style="opacity:.5;cursor:not-allowed"' : ''}>
                  <span>����</span>
                  <span id="addBtnText">${product.stock <= 0 ? 'Ϧ+�Ϧ +�Ϭ+�+�Ϧ' : (isWholesale ? '����+� Ϻ+�ϦϿ+�Ϯ +�+�Ϧ+�Ϯ' : '����+� +�+�Ϧ+�Ϯ')}</span>
                </button>
              </div>`;
              })()}

              <div id="productSocialIcons" class="flex gap-2 pt-1"></div>
              <p id="variantHint" class="text-xs text-rose-700 font-black mt-2 hidden flex items-center gap-1">��ᴩ� <span id="variantHintText">Ϻ+�ϦϼϺ�� ϺϫϬ+�ϺϦ Ϻ+�+�+�Ϻ��+�ϺϬ Ϻ+�+���+�+�ϿϮ</span></p>
            </div>
          </div>
        </div>
      `;

      renderMainImage();
      setupVariantSelectors(product);

      // ��ϻϺϦϮ ��ϦϦϺϦ ϦϻϺϻ Ϻ+�+�+�+�Ϯ
      const qtyInput = document.getElementById('productQtyInput');
      const qtyDec = document.getElementById('qtyDecBtn');
      const qtyInc = document.getElementById('qtyIncBtn');

      const updatePiecesCount = () => {
        const val = parseInt(qtyInput.value, 10) || 1;
        const totalPieces = val * (product.pack_quantity || 1);
        const piecesEl = document.getElementById('calculatedTotalPieces');
        if (piecesEl) piecesEl.textContent = `${totalPieces} +���ϦϮ`;
      };

      const unitLabel = (product.pack_quantity || 1) > 1 ? 'ϦϿ+�Ϯ' : '+���ϦϮ';

      if (qtyDec && qtyInc && qtyInput) {
        qtyDec.addEventListener('click', () => {
          let val = parseInt(qtyInput.value, 10) || 1;
          if (val > 1) {
            qtyInput.value = val - 1;
            PRODUCT_QTY = val - 1;
            updatePiecesCount();
          }
        });
        qtyInc.addEventListener('click', () => {
          let val = parseInt(qtyInput.value, 10) || 1;
          const maxStock = SELECTED_VARIANT ? SELECTED_VARIANT.stock : product.stock;
          if (val < maxStock) {
            qtyInput.value = val + 1;
            PRODUCT_QTY = val + 1;
            updatePiecesCount();
          } else {
            showToast(`Ϻ+�+�+�+�Ϯ Ϻ+�+�Ϭ+�+�ϦϮ ϿϺ+�+�ϫϦ+�+� ${maxStock} ${unitLabel} +�+��� ��ᴩ�`);
          }
        });
        qtyInput.addEventListener('change', () => {
          let val = parseInt(qtyInput.value, 10) || 1;
          const maxStock = SELECTED_VARIANT ? SELECTED_VARIANT.stock : product.stock;
          if (val < 1) val = 1;
          if (val > maxStock) {
            val = maxStock;
            showToast(`Ϻ+�+�+�+�Ϯ Ϻ+�+�Ϭ+�+�ϦϮ ϿϺ+�+�ϫϦ+�+� ${maxStock} ${unitLabel} +�+��� ��ᴩ�`);
          }
          qtyInput.value = val;
          PRODUCT_QTY = val;
          updatePiecesCount();
        });
      }

      document.getElementById('mainImageWrap').addEventListener('click', (e) => {
        if (e.target.closest('#galleryPrev') || e.target.closest('#galleryNext')) return;
        openLightbox(GALLERY_INDEX);
      });
      enableSwipe(document.getElementById('mainImageWrap'), () => goToImage(GALLERY_INDEX + 1), () => goToImage(GALLERY_INDEX - 1));

      // ϻϺ+�Ϯ +�ϦϺϦϻϮ +�+�Ϭϡ+�+� +�+� Ϻ+�+�ϬϦ+�ϦϺϬ +�����Ϻ+�Ϯ Ϻ+�+�+�+�Ϯ Ϻ+�+�ϡϻϻϮ +�+�Ϧ+�Ϯ
      function handleAddProduct(isDirectCheckout = false) {
        const hint = document.getElementById('variantHint');
        const hintText = document.getElementById('variantHintText');
        const quantityToAdd = parseInt(document.getElementById('productQtyInput')?.value, 10) || 1;
        
        if (product.has_variants) {
          const hasColors = product.variants.some((v) => v.color);
          const hasSizes = product.variants.some((v) => v.size);

          if (hasColors && !SELECTED_COLOR) {
            hintText.textContent = 'Ϻ+�ϦϼϺ�� ϺϫϬ+�ϺϦ Ϻ+�+�+�+� ��+�+�Ϻ+�';
            hint.classList.remove('hidden');
            return false;
          }

          if (!SELECTED_VARIANT) {
            hintText.textContent = hasSizes ? 'Ϻ+�ϦϼϺ�� ϺϫϬ+�ϺϦ Ϻ+�+�+�ϺϦ ��+�+�Ϻ+�' : 'Ϻ+�ϦϼϺ�� ϺϫϬ+�ϺϦ Ϻ+�ϫ+�ϺϦ Ϻ+�+���+�+�Ͽ';
            hint.classList.remove('hidden');
            return false;
          }

          if (SELECTED_VARIANT.stock <= 0) {
            showToast(`ϦϦϦ+�Ϻ�� +�ϦϺ Ϻ+�ϫ+�ϺϦ (${SELECTED_VARIANT.label || SELECTED_VARIANT.color}) +�+�ϻ +�+� Ϻ+�+�ϫϦ+�+� ��ᴩ�`);
            return false;
          }

          const inCart = Cart.get().find((i) => i.id === product.id && i.variant_id === SELECTED_VARIANT.id);
          const currentQty = inCart ? inCart.qty : 0;
          if (currentQty + quantityToAdd > SELECTED_VARIANT.stock) {
            showToast(`Ϻ+�+�+�+�Ϯ Ϻ+�+�Ϭ+�+�ϦϮ +�+� "${SELECTED_VARIANT.label || SELECTED_VARIANT.color}" +�+� ${SELECTED_VARIANT.stock} +�+��� ��ᴩ�`);
            return false;
          }

          Cart.add(product, quantityToAdd, SELECTED_VARIANT, SELECTED_VARIANT.image || (SELECTED_COLOR ? SELECTED_COLOR.image : null));
          hint.classList.add('hidden');
        } else {
          // +�+�Ϭϼ ϿϦ+���
          const inCart = Cart.get().find((i) => i.id === product.id && !i.variant_id);
          const currentQty = inCart ? inCart.qty : 0;
          if (currentQty + quantityToAdd > product.stock) {
            showToast(`Ϻ+�+�+�+�Ϯ Ϻ+�+�Ϭ+�+�ϦϮ +�+� +�ϦϺ Ϻ+�+�+�Ϭϼ ${product.stock} +�+��� ��ᴩ�`);
            return false;
          }
          Cart.add(product, quantityToAdd);
        }

        if (isDirectCheckout) {
          openCheckout();
        } else {
          showToast('Ϭ+�Ϭ ����Ϻ+�Ϯ Ϻ+�+�+�Ϭϼ ��+�+� Ϻ+�Ϧ+�Ϯ Ͽ+�ϼϺϡ ԣ�');
          openCart();
        }
        return true;
      }

      // +�ϦϺ+�ϼϮ ϦϦ Ϻ+�����Ϻ+�Ϯ +�+�Ϧ+�Ϯ +�ϦϦ Ϻ+�ϦϦϺ�� Ϻ+�+�+�Ϧ+�
      if (product.stock > 0) {
        document.getElementById('addBtn').addEventListener('click', () => handleAddProduct(false));
        document.getElementById('buyNowBtn').addEventListener('click', () => handleAddProduct(true));
      }

      initSocialIcons('productSocialIcons', { size: 'w-11 h-11 text-xl' });

      // --- NEW: RELATED PRODUCTS & CATEGORY BAR ---
      if (typeof initSimilarAndCategories === 'function') {
        initSimilarAndCategories(product);
      }

    })();

    // ---------- +�ϩϺ+� Ϻ+���+�+�Ϻ+� +�Ϻ+�+�+�ϺϦϺϬ Ϻ+�Ϭ+�ϺϦ+�+� ----------
    
    // ---------- RELATED PRODUCTS & CATEGORY BAR ----------
    let CURRENT_STORE_ID = null;

    async function initSimilarAndCategories(product) {
      CURRENT_STORE_ID = product.user_id;
      const mainEl = document.getElementById('productDetail');
      
      const container = document.createElement('div');
      container.className = 'mt-16 border-t-2 border-slate-200/50 pt-10';
      
      // 1. Similar Products Grid
      container.innerHTML += `
        <h2 class="font-display text-2xl font-black text-slate-900 mb-6">+�+�ϬϼϺϬ +�ϦϺϿ+�Ϯ</h2>
        <div id="similarGrid" class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 mb-10">
          <p class="text-slate-400 font-bold col-span-full text-center py-10">ϼϺϦ+� Ϻ+�Ϭϡ+�+�+�...</p>
        </div>
        
        <h2 class="font-display text-2xl font-black text-slate-900 mb-4">Ϭ��+�+�+�ϺϬ Ϻ+�+�ϬϼϦ</h2>
        <div id="productCategoryNav" class="flex overflow-x-auto gap-2 no-scrollbar pb-4 mb-6"></div>
        <div id="categoryProductsGrid" class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6"></div>
      `;
      
      mainEl.appendChild(container);

      // Fetch Similar Products (by category first)
      let similar = [];
      try {
        const storeParam = product.user_id ? `&store_id=${product.user_id}` : '';
        const catParam = product.category_id ? `&category_id=${product.category_id}` : '';
        const res = await fetch(`/api/products?limit=9${catParam}${storeParam}`);
        if (res.ok) {
          const data = await res.json();
          similar = data.filter(p => p.id !== product.id).slice(0, 8); // Max 8
        }
      } catch (e) {}

      // If very few similar products by category, try fetching without category (just from same store)
      if (similar.length < 4) {
        try {
          const storeParam = product.user_id ? `?store_id=${product.user_id}&limit=10` : '?limit=10';
          const res = await fetch(`/api/products${storeParam}`);
          if (res.ok) {
            const data = await res.json();
            const fallback = data.filter(p => p.id !== product.id && !similar.find(s => s.id === p.id));
            similar = [...similar, ...fallback].slice(0, 8);
          }
        } catch (e) {}
      }

      const simGrid = document.getElementById('similarGrid');
      if (similar.length) {
        simGrid.innerHTML = similar.map(p => generateProductCardHtml(p)).join('');
      } else {
        simGrid.innerHTML = '<p class="text-slate-500 font-bold col-span-full text-sm text-center py-10">+�Ϻ Ϭ+�ϼϻ +�+�ϬϼϺϬ +�ϦϺϿ+�Ϯ.</p>';
      }

      
      // Fetch Categories
      try {
        const storeParam = product.user_id ? `?store_id=${product.user_id}` : '';
        const res = await fetch(`/api/categories${storeParam}`);
        if (res.ok) {
          const cats = await res.json();
          // Remove the current product's category from the list
          const filteredCats = cats.filter(c => String(c.id) !== String(product.category_id));
          
          if (filteredCats.length === 0) {
            // Hide the category section if no other categories exist
            document.getElementById('productCategoryNav').previousElementSibling.classList.add('hidden');
            document.getElementById('productCategoryNav').classList.add('hidden');
            document.getElementById('categoryProductsGrid').classList.add('hidden');
            return;
          }

          const catNav = document.getElementById('productCategoryNav');
          catNav.innerHTML = filteredCats.map((c, i) => `<button class="p-cat-btn px-4 py-1.5 rounded-full text-sm font-bold transition-colors whitespace-nowrap ${i === 0 ? 'bg-slate-800 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'}" data-cat="${c.id}">${escapeHtml(c.name)}</button>`).join('');
          
          catNav.querySelectorAll('.p-cat-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
              // Update active state
              catNav.querySelectorAll('.p-cat-btn').forEach(b => {
                b.classList.remove('bg-slate-800', 'text-white', 'shadow-sm');
                b.classList.add('bg-slate-100', 'text-slate-600', 'hover:bg-slate-200', 'hover:text-slate-900');
              });
              btn.classList.remove('bg-slate-100', 'text-slate-600', 'hover:bg-slate-200', 'hover:text-slate-900');
              btn.classList.add('bg-slate-800', 'text-white', 'shadow-sm');
              
              // Load products for category
              const cid = btn.dataset.cat;
              loadCategoryProducts(cid, product.user_id);
            });
          });
          
          // Initial load for the first filtered category
          const firstBtn = catNav.querySelector('.p-cat-btn');
          if (firstBtn) {
            loadCategoryProducts(firstBtn.dataset.cat, product.user_id);
          }
        }
      } catch (e) {}
    }

    async function loadCategoryProducts(catId, storeId) {
      const grid = document.getElementById('categoryProductsGrid');
      grid.innerHTML = '<p class="text-slate-400 font-bold col-span-full text-center py-10">ϼϺϦ+� Ϻ+�Ϭϡ+�+�+�...</p>';
      try {
        const storeParam = storeId ? `&store_id=${storeId}` : '';
        const catParam = catId ? `&category_id=${catId}` : '';
        const res = await fetch(`/api/products?limit=12${catParam}${storeParam}`);
        if (res.ok) {
          const products = await res.json();
          if (products.length) {
            grid.innerHTML = products.map(p => generateProductCardHtml(p)).join('');
          } else {
            grid.innerHTML = '<p class="text-slate-500 font-bold col-span-full text-sm text-center py-10">+�Ϻ Ϭ+�ϼϻ +�+�ϬϼϺϬ +�+� +�ϦϺ Ϻ+�Ϭ��+�+�+�.</p>';
          }
        }
      } catch (e) {}
    }

    function generateProductCardHtml(p) {
      const outOfStock = p.stock <= 0;
      const mainImg = p.image || '/img/placeholder.svg';
      const storeParam = CURRENT_STORE_ID ? `&store_id=${CURRENT_STORE_ID}` : '';
      const prodUrl = `/product.html?slug=${encodeURIComponent(p.slug)}${storeParam}`;
      
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
          colorDotsHtml = `<div class="flex items-center gap-1 mt-1">${distinctColors.slice(0, 5).map(c => `<span class="w-3.5 h-3.5 rounded-full border-2 border-slate-900 shadow-xs inline-block" title="${escapeHtml(c.color)}" style="background-color: ${c.color_code || '#ddd'}"></span>`).join('')}${distinctColors.length > 5 ? `<span class="text-[10px] text-slate-900 font-black">+${distinctColors.length - 5}</span>` : ''}</div>`;
        }
      }

      return `
        <div class="bg-white rounded-2xl shadow-sm hover:shadow-xl border border-gray-100 transition-all duration-300 overflow-hidden flex flex-col group cursor-pointer" onclick="location.href='${prodUrl.replace(/'/g, "\\'")}'">
          <div class="relative aspect-[4/5] bg-gray-100 overflow-hidden cursor-pointer" onclick="location.href='${prodUrl.replace(/'/g, "\\'")}'">
            <img src="${mainImg}" class="product-img w-full h-full object-cover transition-all duration-700 ${outOfStock ? 'grayscale' : 'group-hover:scale-110'}" />
            ${outOfStock ? '<span class="absolute top-2 right-2 bg-red-500 text-white text-[10px] font-black px-2 py-1 rounded shadow-sm">+�+�ϦϬ</span>' : ''}
            <div class="absolute inset-0 bg-blue-900/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          </div>
          <div class="p-4 flex flex-col gap-2 flex-1">
            <div class="flex items-start justify-between gap-2">
              <h3 class="font-black text-sm text-gray-900 line-clamp-2 leading-snug cursor-pointer hover:text-blue-600 transition-colors" onclick="location.href='${prodUrl.replace(/'/g, "\\'")}'">${escapeHtml(p.name)}</h3>
              ${p.compare_price > p.price ? `<span class="bg-blue-50 text-blue-600 text-[9px] font-black px-1.5 py-0.5 rounded-full shrink-0">-${Math.round((1 - p.price/p.compare_price)*100)}%</span>` : ''}
            </div>
            ${colorDotsHtml ? `<div class="flex items-center gap-1.5 mt-0.5">${colorDotsHtml}</div>` : ''}
            <div class="mt-auto pt-2 flex items-center justify-between">
              <div class="flex flex-col">
                <span class="text-lg font-black text-blue-600">${money(p.price)}</span>
                ${p.compare_price > p.price ? `<span class="text-[10px] text-gray-400 font-bold line-through">${money(p.compare_price)}</span>` : ''}
              </div>
              <button onclick="${outOfStock ? '' : (p.has_variants ? `event.stopPropagation(); location.href='${prodUrl.replace(/'/g, "\\'")}'` : `event.stopPropagation(); Cart.add({id:${p.id}, name:'${escapeHtml(p.name).replace(/'/g,"\\'")}', price:${p.price}, image:'${mainImg.replace(/'/g, "\\'")}'}, 1); showToast('Ϭ+�Ϭ ����Ϻ+�Ϭ+� ��+�+� Ϻ+�Ϧ+�Ϯ Ͽ+�ϼϺϡ');`)}" class="${outOfStock ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg hover:-translate-y-0.5'} add-to-cart w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300">
                ${outOfStock ? '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>' : '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>'}
              </button>
            </div>
          </div>
        </div>
      `;
    }

    function setupVariantSelectors(product) {
      const container = document.getElementById('variantsContainer');
      if (!product.has_variants || !product.variants || !product.variants.length) {
        container.innerHTML = '';
        return;
      }

      const variants = product.variants;
      const distinctColors = [];
      const colorMap = new Map();

      for (const v of variants) {
        if (v.color && v.color.trim()) {
          const cName = v.color.trim();
          if (!colorMap.has(cName)) {
            const cObj = {
              name: cName,
              code: v.color_code || '#17241F',
              image: v.image || '',
              variants: [],
            };
            colorMap.set(cName, cObj);
            distinctColors.push(cObj);
          }
          colorMap.get(cName).variants.push(v);
        }
      }

      if (distinctColors.length > 0) {
        container.innerHTML = `
          <!-- ϺϫϬ+�ϺϦ Ϻ+�+�+�+� -->
          <div class="color-section">
            <div class="flex items-center justify-between mb-2">
              <span class="text-sm font-black text-slate-900">Ϻ+�+�+�+�: <span id="selectedColorName" class="text-forest font-black mr-1 text-base">ϺϫϬϦ +�+�+�+�Ϻ</span></span>
            </div>
            <div id="colorSwatches" class="flex flex-wrap gap-2.5 items-center"></div>
          </div>

          <!-- ϺϫϬ+�ϺϦ Ϻ+�+�+�ϺϦ -->
          <div id="sizeSection" class="size-section">
            <div class="flex items-center justify-between mb-2">
              <span class="text-sm font-black text-slate-900">Ϻ+�+�+�ϺϦ: <span id="selectedSizeName" class="text-forest font-black mr-1 text-base">ϺϫϬϦ +�+�ϺϦ+�Ϻ</span></span>
            </div>
            <div id="sizeButtons" class="flex flex-wrap gap-2"></div>
          </div>
          
          <div id="stockAvailability" class="text-xs font-black text-slate-900 min-h-[18px]"></div>
        `;

        const colorSwatchesWrap = document.getElementById('colorSwatches');
        distinctColors.forEach((colorObj) => {
          const totalStockForColor = colorObj.variants.reduce((sum, v) => sum + v.stock, 0);
          const isOutOfStock = totalStockForColor <= 0;

          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = `color-swatch-btn group relative flex items-center gap-2 px-3 py-1.5 rounded-full border-2 transition-all ${
            isOutOfStock ? 'opacity-40 cursor-not-allowed border-slate-200/40' : 'border-slate-200 hover:border-forest bg-white'
          }`;
          btn.dataset.color = colorObj.name;

          btn.innerHTML = `
            <span class="w-5 h-5 rounded-full border border-slate-200 shadow-inner shrink-0" style="background-color: ${colorObj.code || '#ddd'}"></span>
            <span class="text-xs font-black text-slate-900">${escapeHtml(colorObj.name)}</span>
            ${isOutOfStock ? '<span class="text-[10px] text-slate-900 font-bold">(+�+�ϻ)</span>' : ''}
          `;

          btn.addEventListener('click', () => {
            selectColor(colorObj);
          });

          colorSwatchesWrap.appendChild(btn);
        });