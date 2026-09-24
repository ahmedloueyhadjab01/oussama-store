const fs = require('fs');
let html = fs.readFileSync('public/product.html', 'utf8');

const injection = `
            </div>
            <div>
              <label class="block text-xs font-medium text-neutral-500 mb-1.5">طريقة التوصيل *</label>
              <p id="selectWilayaHint" class="text-xs text-neutral-400 mb-2 hidden">يرجى اختيار الولاية لعرض أسعار التوصيل</p>
              <div class="grid grid-cols-2 gap-3">
                <label class="delivery-option cursor-pointer flex flex-col items-center gap-1 p-3 rounded-md border border-neutral-200 text-sm" data-type="home">
                  <input type="radio" name="deliveryType" value="home" checked class="hidden" />
                  <span class="font-medium text-neutral-900">توصيل للمنزل</span>
                  <span class="delivery-price text-xs text-neutral-500">---</span>
                </label>
                <label class="delivery-option cursor-pointer flex flex-col items-center gap-1 p-3 rounded-md border border-neutral-200 text-sm" data-type="desk">
                  <input type="radio" name="deliveryType" value="desk" class="hidden" />
                  <span class="font-medium text-neutral-900">توصيل لمكتب التوصيل</span>
                  <span class="delivery-price text-xs text-neutral-500">---</span>
                </label>
              </div>
            </div>`;

// Insert after communeContainer div closure
html = html.replace(/<div id="communeContainer" class="hidden">[\s\S]*?<\/div>/, match => match + injection);

// Also add the CSS for .delivery-option.selected
if (!html.includes('.delivery-option.selected')) {
  html = html.replace('</style>', '  .delivery-option.selected { border-color: #171717; background: #f5f5f5; }\n    </style>');
}

fs.writeFileSync('public/product.html', html, 'utf8');
console.log('Successfully injected delivery options into product.html');
