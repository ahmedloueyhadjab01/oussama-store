const fs = require('fs');
let html = fs.readFileSync('public/product.html', 'utf8');

const newCartCode = `function openCart() {
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
    }`;

// Replace everything from function openCart() to the end of closeCart()
html = html.replace(/function openCart\(\)\s*\{[\s\S]*?function closeCart\(\)\s*\{[\s\S]*?\}\s*document\.getElementById\('cartBtn'\)/, newCartCode + '\n\n    document.getElementById(\'cartBtn\')');

fs.writeFileSync('public/product.html', html, 'utf8');
console.log('Fixed product openCart');
