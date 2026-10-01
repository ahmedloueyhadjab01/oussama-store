const fs = require('fs');
let html = fs.readFileSync('public/product.html', 'utf8');

// 1. Add onclick attribute to thumb-btn
html = html.replace(
  '<button class="thumb-btn w-16 h-16 shrink-0 rounded-xl overflow-hidden border-2 transition-all ${i === 0 ? \'border-forest ring-2 ring-forest/30\' : \'border-slate-200/20 opacity-80\'}" data-index="${i}" data-src="${img}">',
  '<button onclick="window.handleThumbClick(\'${img}\', ${i})" class="thumb-btn w-16 h-16 shrink-0 rounded-xl overflow-hidden border-2 transition-all ${i === 0 ? \'border-forest ring-2 ring-forest/30\' : \'border-slate-200/20 opacity-80\'}" data-index="${i}" data-src="${img}">'
);

// 2. Define window.handleThumbClick
const handleCode = `
      window.handleThumbClick = function(img, index) {
        goToImage(index);
        if (PRODUCT_DATA && PRODUCT_DATA.has_variants && PRODUCT_DATA.variants) {
          const matchingVar = PRODUCT_DATA.variants.find(v => v.image === img);
          if (matchingVar && matchingVar.color) {
            const btn = document.querySelector(\`.color-swatch-btn[data-color="\${matchingVar.color}"]\`);
            if (btn && !btn.classList.contains('border-forest')) {
              btn.click();
            }
          }
        }
      };
      
      function renderMainImage(customSrc = null) {`;

html = html.replace('function renderMainImage(customSrc = null) {', handleCode);

fs.writeFileSync('public/product.html', html, 'utf8');
console.log('Thumbnail click functionality added!');
