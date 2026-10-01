const fs = require('fs');

const productHtml = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <title>OVARO | أوفارو</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { font-family: 'IBM Plex Sans Arabic', sans-serif; background-color: #ffffff; color: #171717; }
    .glass-nav { background: rgba(255, 255, 255, 0.98); backdrop-filter: blur(10px); border-bottom: 1px solid #e5e5e5; }
    .btn-primary { background-color: #171717; color: #ffffff; border-radius: 0.375rem; transition: background-color 0.2s; }
    .btn-primary:hover { background-color: #262626; }
    
    ::-webkit-scrollbar { width: 4px; height: 4px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: #d4d4d4; }
    ::-webkit-scrollbar-thumb:hover { background: #a3a3a3; }
    
    .checkout-modal { background: rgba(255,255,255,0.98); backdrop-filter: blur(10px); }
    .input-field { width: 100%; padding: 0.8rem 1rem; font-size: 0.95rem; border-radius: 0.375rem; border: 1px solid #e5e5e5; background: #ffffff; color: #171717; outline: none; transition: border-color 0.2s; }
    .input-field:focus { border-color: #171717; }
  </style>
</head>
<body class="pb-24 md:pb-0">

  <!-- Header -->
  <header class="sticky top-0 z-40 glass-nav">
    <div class="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
      <a href="/" class="flex items-center gap-3">
        <img src="/img/logo-ovaro.png" alt="OVARO" class="w-10 h-10 object-contain rounded-full" />
        <span class="text-2xl font-bold tracking-[0.2em] text-neutral-900 uppercase">Ovaro</span>
      </a>
      <button id="cartBtn" class="relative items-center gap-2 px-5 py-2.5 rounded-md text-sm font-medium btn-primary hidden md:flex shadow-sm">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path></svg>
        <span>السلة</span>
        <span id="cartCount" class="absolute -top-2 -right-2 bg-neutral-100 text-neutral-900 text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border border-neutral-200">0</span>
      </button>
    </div>
  </header>

  <!-- Main Content -->
  <main class="max-w-7xl mx-auto px-4 py-8 md:py-12">
    <button onclick="history.back()" class="flex items-center gap-2 text-sm font-medium text-neutral-500 hover:text-neutral-900 transition-colors mb-6">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
      عودة
    </button>

    <div id="loading" class="flex justify-center items-center py-20">
      <div class="w-8 h-8 border-2 border-neutral-200 border-t-neutral-900 rounded-full animate-spin"></div>
    </div>
    
    <div id="error" class="hidden text-center py-20 text-red-500 font-medium"></div>

    <div id="productContent" class="hidden flex-col md:flex-row gap-8 lg:gap-16">
      <!-- Gallery -->
      <div class="w-full md:w-1/2">
        <div class="aspect-[4/5] bg-neutral-50 rounded-lg overflow-hidden mb-4 relative group">
          <img id="mainImage" src="" class="w-full h-full object-cover" />
          <div id="videoContainer" class="absolute inset-0 bg-black hidden"></div>
        </div>
        <div id="thumbnails" class="flex gap-3 overflow-x-auto hide-scrollbar pb-2"></div>
      </div>

      <!-- Details -->
      <div class="w-full md:w-1/2 flex flex-col">
        <span id="productCategory" class="text-xs font-bold tracking-widest text-neutral-400 uppercase mb-2"></span>
        <h1 id="productTitle" class="text-2xl md:text-3xl font-bold text-neutral-900 leading-tight mb-4"></h1>
        
        <div class="flex items-end gap-3 mb-8 pb-8 border-b border-neutral-100">
          <span id="productPrice" class="text-3xl font-bold text-neutral-900"></span>
          <span id="comparePrice" class="text-lg text-neutral-400 line-through mb-1"></span>
          <span id="discountBadge" class="hidden bg-neutral-100 text-neutral-900 text-xs font-bold px-2 py-1 rounded-md mb-1.5 ml-2"></span>
        </div>

        <div id="variantsContainer" class="mb-8 hidden">
          <h3 class="text-sm font-bold text-neutral-900 mb-3 uppercase tracking-wider">المقاس / اللون</h3>
          <div id="variantsList" class="flex flex-wrap gap-2"></div>
        </div>

        <!-- Quantity & Add to Cart -->
        <div class="flex flex-col sm:flex-row gap-4 mb-8">
          <div class="flex items-center border border-neutral-200 rounded-md bg-white w-full sm:w-32 shrink-0">
            <button id="qtyMinus" class="w-10 h-12 flex items-center justify-center text-neutral-500 hover:text-neutral-900 transition-colors">−</button>
            <input type="number" id="qtyInput" value="1" min="1" class="w-full h-12 text-center font-medium text-neutral-900 border-none outline-none appearance-none bg-transparent" readonly />
            <button id="qtyPlus" class="w-10 h-12 flex items-center justify-center text-neutral-500 hover:text-neutral-900 transition-colors">+</button>
          </div>
          <button id="addToCartBtn" class="flex-1 btn-primary py-3.5 px-6 font-medium text-sm w-full flex justify-center items-center gap-2">
            إضافة إلى السلة
          </button>
        </div>

        <!-- Stock Status -->
        <div id="stockStatus" class="flex items-center gap-2 text-sm mb-8"></div>

        <!-- Features/Assurance -->
        <div class="grid grid-cols-2 gap-4 py-6 border-y border-neutral-100 mb-8">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-neutral-50 flex items-center justify-center text-neutral-900">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            </div>
            <div class="text-xs">
              <p class="font-bold text-neutral-900">توصيل سريع</p>
              <p class="text-neutral-500 mt-0.5">خلال 24-48 ساعة</p>
            </div>
          </div>
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-neutral-50 flex items-center justify-center text-neutral-900">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
            </div>
            <div class="text-xs">
              <p class="font-bold text-neutral-900">دفع آمن</p>
              <p class="text-neutral-500 mt-0.5">الدفع عند الاستلام</p>
            </div>
          </div>
        </div>

        <!-- Description -->
        <div>
          <h3 class="text-sm font-bold text-neutral-900 mb-4 uppercase tracking-wider">تفاصيل المنتج</h3>
          <div id="productDescription" class="prose prose-sm text-neutral-500 leading-relaxed max-w-none"></div>
        </div>
      </div>
    </div>
  </main>

  <!-- Cart Drawer -->
  <div id="cartDrawer" class="fixed inset-y-0 left-0 w-full md:w-96 bg-white shadow-2xl transform -translate-x-full transition-transform duration-300 z-50 flex flex-col">
    <div class="p-5 border-b border-neutral-100 flex justify-between items-center bg-white">
      <h2 class="text-lg font-bold text-neutral-900">سلة التسوق</h2>
      <button id="closeCartBtn" class="text-neutral-400 hover:text-neutral-900 transition-colors p-2">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
      </button>
    </div>
    <div id="cartItems" class="flex-1 overflow-y-auto p-5 space-y-4 bg-neutral-50/50"></div>
    <div class="p-5 border-t border-neutral-100 bg-white">
      <div class="flex justify-between items-center mb-4">
        <span class="text-neutral-500 text-sm">المجموع</span>
        <span id="cartTotal" class="text-xl font-bold text-neutral-900">0 د.ج</span>
      </div>
      <button id="checkoutBtn" class="w-full btn-primary py-3.5 text-sm font-medium flex items-center justify-center gap-2">
        إتمام الطلب
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3"></path></svg>
      </button>
    </div>
  </div>
  <div id="cartOverlay" class="fixed inset-0 bg-neutral-900/40 backdrop-blur-sm z-40 hidden opacity-0 transition-opacity duration-300"></div>

  <!-- Checkout Modal -->
  <div id="checkoutModal" class="fixed inset-0 z-50 hidden items-end justify-center sm:items-center p-4">
    <div class="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm checkout-overlay"></div>
    <div class="relative bg-white rounded-t-2xl sm:rounded-xl w-full max-w-lg overflow-hidden shadow-2xl transform translate-y-full transition-transform duration-300 flex flex-col max-h-[90vh]">
      <div class="p-5 border-b border-neutral-100 flex justify-between items-center bg-white sticky top-0 z-10">
        <h2 class="text-lg font-bold text-neutral-900">تأكيد الطلب</h2>
        <button class="close-checkout text-neutral-400 hover:text-neutral-900 p-2">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>
      </div>
      <div class="p-6 overflow-y-auto">
        <form id="checkoutForm" class="space-y-4">
          <div>
            <label class="block text-xs font-medium text-neutral-500 mb-1.5">الاسم الكامل *</label>
            <input type="text" id="customerName" required class="input-field" placeholder="الاسم واللقب" />
          </div>
          <div>
            <label class="block text-xs font-medium text-neutral-500 mb-1.5">رقم الهاتف *</label>
            <input type="tel" id="customerPhone" required class="input-field text-left" dir="ltr" placeholder="0550 00 00 00" />
          </div>
          <div>
            <label class="block text-xs font-medium text-neutral-500 mb-1.5">الولاية *</label>
            <select id="customerWilaya" required class="input-field"><option value="">جاري التحميل...</option></select>
          </div>
          <div id="communeContainer" class="hidden">
            <label class="block text-xs font-medium text-neutral-500 mb-1.5">البلدية *</label>
            <select id="customerCommune" required class="input-field"><option value="">اختر البلدية...</option></select>
          </div>
          <div>
            <label class="block text-xs font-medium text-neutral-500 mb-1.5">عنوان التوصيل *</label>
            <textarea id="customerAddress" required rows="2" class="input-field resize-none" placeholder="الشارع، الحي، ورقم المنزل..."></textarea>
          </div>
          <div class="pt-4 border-t border-neutral-100">
            <div class="flex justify-between text-sm text-neutral-600 mb-2">
              <span>قيمة المنتجات</span>
              <span id="summarySubtotal" class="font-medium">0 د.ج</span>
            </div>
            <div class="flex justify-between text-sm text-neutral-600 mb-4">
              <span>تكلفة التوصيل</span>
              <span id="summaryDelivery" class="font-medium">0 د.ج</span>
            </div>
            <div class="flex justify-between text-base font-bold text-neutral-900 pt-3 border-t border-neutral-100">
              <span>المجموع النهائي</span>
              <span id="summaryTotal">0 د.ج</span>
            </div>
          </div>
          <button type="submit" id="confirmOrderBtn" class="w-full btn-primary py-3.5 text-sm font-medium mt-4">
            تأكيد الطلب
          </button>
        </form>
      </div>
    </div>
  </div>

  <div id="toastContainer" class="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 w-full max-w-sm px-4 pointer-events-none"></div>

  <!-- Mobile Sticky CTA for Product Page -->
  <div class="md:hidden fixed bottom-0 w-full bg-white border-t border-neutral-100 p-3 z-40 flex gap-3">
    <button id="cartBtnMobile" class="w-12 h-12 flex items-center justify-center border border-neutral-200 rounded-md text-neutral-900 relative shrink-0">
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path></svg>
      <span id="cartCountMobile" class="absolute -top-1 -right-1 bg-neutral-900 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">0</span>
    </button>
    <button id="addToCartBtnSticky" class="flex-1 btn-primary text-sm font-medium">إضافة إلى السلة</button>
  </div>

  <!-- Footer -->
  <footer class="border-t border-neutral-200 pt-10 pb-24 md:pb-10 bg-neutral-50 text-center">
    <div class="max-w-7xl mx-auto px-4">
      <div class="flex justify-center items-center gap-3 mb-4">
        <img src="/img/logo-ovaro.png" alt="OVARO" class="w-8 h-8 rounded-full" />
        <span class="text-lg font-bold tracking-[0.2em] text-neutral-900 uppercase">Ovaro</span>
      </div>
      <p class="text-neutral-400 text-xs tracking-wider uppercase">&copy; <span id="currentYear"></span> OVARO MEN'S WEAR.</p>
    </div>
  </footer>

  <script src="/js/locations.js"></script>
  <script src="/js/cart.js"></script>
  <script src="/js/social.js"></script>
  <script src="/js/product.js"></script>
</body>
</html>
`;

fs.writeFileSync('public/product.html', productHtml, 'utf8');
console.log('product.html updated successfully.');
