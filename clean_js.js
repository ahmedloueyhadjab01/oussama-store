const fs = require('fs');

function cleanJS(file) {
  if (!fs.existsSync(file)) return;
  let code = fs.readFileSync(file, 'utf8');

  // Colors
  code = code.replace(/bg-blue-600/g, 'bg-neutral-900');
  code = code.replace(/text-blue-600/g, 'text-neutral-900');
  code = code.replace(/border-blue-600/g, 'border-neutral-900');
  code = code.replace(/bg-blue-50/g, 'bg-neutral-100');
  code = code.replace(/hover:bg-blue-700/g, 'hover:bg-neutral-800');
  code = code.replace(/hover:text-blue-600/g, 'hover:text-neutral-600');
  code = code.replace(/text-blue-900/g, 'text-neutral-900');
  code = code.replace(/bg-blue-900\/10/g, 'bg-neutral-900/5');
  code = code.replace(/ring-blue-100/g, 'ring-neutral-100');
  code = code.replace(/focus:border-blue-500/g, 'focus:border-neutral-900');

  // Emojis
  code = code.replace(/🎁/g, '');
  code = code.replace(/🔥/g, '');
  code = code.replace(/✨/g, '');
  code = code.replace(/🚀/g, '');
  code = code.replace(/🎉/g, '');
  code = code.replace(/✅/g, '');
  code = code.replace(/❌/g, '');
  code = code.replace(/⚠️/g, '');
  code = code.replace(/🔎/g, '');
  code = code.replace(/🛒/g, '');

  // Rounded corners
  code = code.replace(/rounded-2xl/g, 'rounded-md');
  code = code.replace(/rounded-full/g, 'rounded-full'); // Leave full alone for circles, but let's check buttons.
  code = code.replace(/w-9 h-9 rounded-full/g, 'w-9 h-9 rounded-md'); // add to cart button in product card
  
  // Font weights
  code = code.replace(/font-black/g, 'font-bold');

  fs.writeFileSync(file, code, 'utf8');
}

cleanJS('public/js/store.js');
cleanJS('public/js/product.js');
cleanJS('public/js/cart.js');
cleanJS('public/js/main.js');
console.log('JS files cleaned!');
