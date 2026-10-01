const fs = require('fs');

function decode(b64) { return Buffer.from(b64, 'base64').toString('utf8'); }

const sizeTxt = decode('2KfZhNmF2YLYp9iz');
const qtyTxt = decode('2KfZhNmD2YXZitip');
const costTxt = decode('2LPYudixINin2YTYtNix2KfYoQ==');
const typeTxt = decode('2KfZhNmG2YjYuS/Yp9mE2YXZgtin2LM=');

let js = fs.readFileSync('public/js/admin.js', 'utf8');

js = js.replace('<input class="cb-s-label field px-1 py-1 text-[12px] min-w-0" placeholder="??????"', '<input class="cb-s-label field px-1 py-1 text-[12px] min-w-0" placeholder="' + sizeTxt + '"');
js = js.replace('<input class="cb-s-qty field px-1 py-1 text-[12px] min-w-0" type="number" min="0" placeholder="??????"', '<input class="cb-s-qty field px-1 py-1 text-[12px] min-w-0" type="number" min="0" placeholder="' + qtyTxt + '"');
js = js.replace('<input class="cb-s-cost field px-1 py-1 text-[12px] min-w-0" type="number" step="0.01" min="0" placeholder="??????"', '<input class="cb-s-cost field px-1 py-1 text-[12px] min-w-0" type="number" step="0.01" min="0" placeholder="' + costTxt + '"');

js = js.replace('<input class="v-label field px-1 py-1 text-[12px] min-w-0" placeholder="??????"', '<input class="v-label field px-1 py-1 text-[12px] min-w-0" placeholder="' + typeTxt + '"');
js = js.replace('<input class="v-qty field px-1 py-1 text-[12px] min-w-0" type="number" min="0" placeholder="??????"', '<input class="v-qty field px-1 py-1 text-[12px] min-w-0" type="number" min="0" placeholder="' + qtyTxt + '"');
js = js.replace('<input class="v-cost field px-1 py-1 text-[12px] min-w-0" type="number" step="0.01" min="0" placeholder="??????"', '<input class="v-cost field px-1 py-1 text-[12px] min-w-0" type="number" step="0.01" min="0" placeholder="' + costTxt + '"');

fs.writeFileSync('public/js/admin.js', js, 'utf8');
console.log('Fixed admin.js placeholders');
