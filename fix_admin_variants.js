const fs = require('fs');
let js = fs.readFileSync('public/js/admin.js', 'utf8');

const target1 = `sRow.className = 'cb-size-row grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-center';
 sRow.innerHTML = \`
 <input class="cb-s-label field px-2 py-1 text-sm" placeholder="?????? (????: M)" value="\${escapeHtml(sizeLabel)}" />
 <input class="cb-s-qty field px-2 py-1 text-sm" type="number" min="0" placeholder="?????? ????????" value="\${qty}" />
 <input class="cb-s-cost field px-2 py-1 text-sm" type="number" step="0.01" min="0" placeholder="??? ??????" value="\${cost}" />
 <button type="button" class="cb-s-del text-blue-500 font-extrabold text-sm px-1 hover:bg-blue-500/10 rounded">&times;</button>
 \`;`;

const newTarget1 = `sRow.className = 'cb-size-row grid grid-cols-[1.5fr_1fr_1.2fr_auto] gap-1 items-center';
 sRow.innerHTML = \`
 <input class="cb-s-label field px-1 py-1 text-[12px] min-w-0" placeholder="?????? (M)" value="\${escapeHtml(sizeLabel)}" />
 <input class="cb-s-qty field px-1 py-1 text-[12px] min-w-0" type="number" min="0" placeholder="??????" value="\${qty}" />
 <input class="cb-s-cost field px-1 py-1 text-[12px] min-w-0" type="number" step="0.01" min="0" placeholder="??????" value="\${cost}" />
 <button type="button" class="cb-s-del text-blue-500 font-extrabold text-[15px] px-1 hover:bg-blue-500/10 rounded">&times;</button>
 \`;`;

js = js.replace(target1, newTarget1);

const target2 = `row.className = 'grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-center';
 row.dataset.rowId = id;
 row.innerHTML = \`
 <input class="v-label field px-2 py-1.5 text-sm" placeholder="?????? (????: 42 ?? M)" value="\${escapeHtml(label)}" />
 <input class="v-qty field px-2 py-1.5 text-sm" type="number" min="0" placeholder="??????" value="\${qty}" />
 <input class="v-cost field px-2 py-1.5 text-sm" type="number" step="0.01" min="0" placeholder="??? ??????" value="\${cost}" />
 <button type="button" class="v-remove text-blue-500 font-extrabold text-sm px-1 hover:bg-blue-500/10 rounded">&times;</button>
 \`;`;

const newTarget2 = `row.className = 'grid grid-cols-[1.5fr_1fr_1.2fr_auto] gap-1 items-center';
 row.dataset.rowId = id;
 row.innerHTML = \`
 <input class="v-label field px-1 py-1.5 text-[12px] min-w-0" placeholder="?????? (M)" value="\${escapeHtml(label)}" />
 <input class="v-qty field px-1 py-1.5 text-[12px] min-w-0" type="number" min="0" placeholder="??????" value="\${qty}" />
 <input class="v-cost field px-1 py-1.5 text-[12px] min-w-0" type="number" step="0.01" min="0" placeholder="??????" value="\${cost}" />
 <button type="button" class="v-remove text-blue-500 font-extrabold text-[15px] px-1 hover:bg-blue-500/10 rounded">&times;</button>
 \`;`;

js = js.replace(target2, newTarget2);

fs.writeFileSync('public/js/admin.js', js, 'utf8');
console.log('Fixed variants!');
