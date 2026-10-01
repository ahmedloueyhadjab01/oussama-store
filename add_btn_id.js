const fs = require('fs');
let html = fs.readFileSync('public/admin.html', 'utf8');

html = html.replace('<button type="submit" class="btn-primary w-full py-2.5 rounded-xl text-sm font-black">+ تسجيل المصاريف</button>', '<button id="spendSubmitBtn" type="submit" class="btn-primary w-full py-2.5 rounded-xl text-sm font-black">+ تسجيل المصاريف</button>');

fs.writeFileSync('public/admin.html', html);
console.log('Submit button ID added.');
