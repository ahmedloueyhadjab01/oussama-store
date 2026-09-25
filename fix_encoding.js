const fs = require('fs');

function decode(b64) {
  return Buffer.from(b64, 'base64').toString('utf8');
}

// Fix index.html
let indexHtml = fs.readFileSync('public/index.html', 'utf8');
indexHtml = indexHtml.replace('placeholder="??? ?? ????..."', 'placeholder="' + decode('2KfYqNit2Ksg2LnZhiDZhdmG2KrYrC4uLg==') + '"');
fs.writeFileSync('public/index.html', indexHtml, 'utf8');

// Fix admin.html
let adminHtml = fs.readFileSync('public/admin.html', 'utf8');

adminHtml = adminHtml.replace(
  '<p class="text-[11px] font-bold text-slate-500">??? ?? ???? ?????? ??????? ??????. ????? ??????? ?? ??? ??? ????? ????? ????????.</p>',
  '<p class="text-[11px] font-bold text-slate-500">' + decode('2YfYsNmHINmH2Yog2LXZiNix2Kkg2KfZhNi62YTYp9mBINin2YTYrdin2YTZitipINmE2YTZhdmG2KrYrC4g2YrZhdmD2YbZgyDYqtix2YPZh9in2Iwg2KPZiCDYsdmB2Lkg2LXZiNixINis2K/Zitiv2Kkg2KPYr9mG2KfZhyDZhNiq2LrZitmK2LHZh9inLg==') + '</p>'
);

adminHtml = adminHtml.replace(
  '<label class="text-sm font-bold text-slate-900/70 block mb-1">????? ?? ??? ??? ?????? (?????? ?????? ????? ??????)</label>',
  '<label class="text-sm font-bold text-slate-900/70 block mb-1">' + decode('2KrYutmK2YrYsSDYo9mIINix2YHYuSDYtdmI2LEg2KfZhNmF2YbYqtisICjYp9mE2LXZiNix2Kkg2KfZhNij2YjZhNmJINiz2KrZg9mI2YYg2KfZhNi62YTYp9mBKQ==') + '</label>'
);

fs.writeFileSync('public/admin.html', adminHtml, 'utf8');
console.log('Fixed encoding issues!');
