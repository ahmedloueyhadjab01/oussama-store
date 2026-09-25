const fs = require('fs');
let js = fs.readFileSync('public/js/admin.js', 'utf8');

js = js.replace(/cb-size-row grid grid-cols-\[1fr_1fr_1fr_auto\] gap-2 items-center/g, "cb-size-row grid grid-cols-[1.4fr_1fr_1fr_auto] gap-1 items-center");
js = js.replace(/row\.className = 'grid grid-cols-\[1fr_1fr_1fr_auto\] gap-2 items-center';/g, "row.className = 'grid grid-cols-[1.4fr_1fr_1fr_auto] gap-1 items-center';");

js = js.replace(/<input class="cb-s-label field px-2 py-1 text-sm" placeholder=".*?"/g, '<input class="cb-s-label field px-1 py-1 text-[12px] min-w-0" placeholder="??????"');
js = js.replace(/<input class="cb-s-qty field px-2 py-1 text-sm".*?placeholder=".*?"/g, '<input class="cb-s-qty field px-1 py-1 text-[12px] min-w-0" type="number" min="0" placeholder="??????"');
js = js.replace(/<input class="cb-s-cost field px-2 py-1 text-sm".*?placeholder=".*?"/g, '<input class="cb-s-cost field px-1 py-1 text-[12px] min-w-0" type="number" step="0.01" min="0" placeholder="??????"');

js = js.replace(/<input class="v-label field px-2 py-1\.5 text-sm" placeholder=".*?"/g, '<input class="v-label field px-1 py-1 text-[12px] min-w-0" placeholder="??????"');
js = js.replace(/<input class="v-qty field px-2 py-1\.5 text-sm".*?placeholder=".*?"/g, '<input class="v-qty field px-1 py-1 text-[12px] min-w-0" type="number" min="0" placeholder="??????"');
js = js.replace(/<input class="v-cost field px-2 py-1\.5 text-sm".*?placeholder=".*?"/g, '<input class="v-cost field px-1 py-1 text-[12px] min-w-0" type="number" step="0.01" min="0" placeholder="??????"');

fs.writeFileSync('public/js/admin.js', js, 'utf8');
console.log('Fixed using robust regex.');
