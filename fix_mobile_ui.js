const fs = require('fs');

// 1. Fix header in index.html
let indexHtml = fs.readFileSync('public/index.html', 'utf8');
indexHtml = indexHtml.replace('<header class="sticky top-0 z-40 glass-nav shadow-sm">', '<header class="relative z-40 glass-nav shadow-sm">');
fs.writeFileSync('public/index.html', indexHtml, 'utf8');

// 2. Fix header in product.html
let prodHtml = fs.readFileSync('public/product.html', 'utf8');
prodHtml = prodHtml.replace('<header class="sticky top-0 z-40 glass-nav shadow-sm">', '<header class="relative z-40 glass-nav shadow-sm">');
fs.writeFileSync('public/product.html', prodHtml, 'utf8');

// 3. Fix variants in admin.js
let adminJs = fs.readFileSync('public/js/admin.js', 'utf8');

// Clothing variants
adminJs = adminJs.replace(
  /sRow\.className = 'cb-size-row grid grid-cols-\[1fr_1fr_1fr_auto\] gap-2 items-center';\n\s*sRow\.innerHTML = `[\s\S]*?<\/button>\n\s*`;/,
  `sRow.className = 'cb-size-row grid grid-cols-[1.5fr_1fr_1.2fr_auto] gap-1 items-center';
  sRow.innerHTML = \`
  <input class="cb-s-label field px-1 py-1 text-[12px] min-w-0" placeholder="?????? (M)" value="\${escapeHtml(sizeLabel)}" />
  <input class="cb-s-qty field px-1 py-1 text-[12px] min-w-0" type="number" min="0" placeholder="??????" value="\${qty}" />
  <input class="cb-s-cost field px-1 py-1 text-[12px] min-w-0" type="number" step="0.01" min="0" placeholder="??????" value="\${cost}" />
  <button type="button" class="cb-s-del text-blue-500 font-extrabold text-sm px-1 hover:bg-blue-500/10 rounded">&times;</button>
  \`;`
);

// Simple variants
adminJs = adminJs.replace(
  /row\.className = 'grid grid-cols-\[1fr_1fr_1fr_auto\] gap-2 items-center';\n\s*row\.dataset\.rowId = id;\n\s*row\.innerHTML = `[\s\S]*?<\/button>\n\s*`;/,
  `row.className = 'grid grid-cols-[1.5fr_1fr_1.2fr_auto] gap-1 items-center';
  row.dataset.rowId = id;
  row.innerHTML = \`
  <input class="v-label field px-1 py-1 text-[12px] min-w-0" placeholder="?????? (M)" value="\${escapeHtml(label)}" />
  <input class="v-qty field px-1 py-1 text-[12px] min-w-0" type="number" min="0" placeholder="??????" value="\${qty}" />
  <input class="v-cost field px-1 py-1 text-[12px] min-w-0" type="number" step="0.01" min="0" placeholder="??????" value="\${cost}" />
  <button type="button" class="v-remove text-blue-500 font-extrabold text-sm px-1 hover:bg-blue-500/10 rounded">&times;</button>
  \`;`
);

fs.writeFileSync('public/js/admin.js', adminJs, 'utf8');
console.log('Mobile UI fixes applied successfully.');
