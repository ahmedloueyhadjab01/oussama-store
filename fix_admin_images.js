const fs = require('fs');
let html = fs.readFileSync('public/admin.html', 'utf8');

const oldImagesHtml = `<div>
 <label class="text-sm font-bold text-slate-900/70 block mb-1">??? ??? ?????? ?????? / ??????</label>
 <input name="images" type="file" accept="image/*" multiple class="w-full text-sm" />
 </div>`;

const newImagesHtml = `<div>
 <div id="editProductImagePreview" class="hidden mb-2 flex items-center gap-3 bg-white p-2 rounded-xl border border-slate-200/50">
   <img id="currentCoverImage" src="" class="w-12 h-12 object-cover rounded-lg border border-slate-200 shadow-sm" />
   <p class="text-[11px] font-bold text-slate-500">??? ?? ???? ?????? ??????? ??????. ????? ?????? ?? ??? ??? ????? ????? ????????.</p>
 </div>
 <label class="text-sm font-bold text-slate-900/70 block mb-1">????? ?? ??? ??? ?????? (?????? ?????? ????? ??????)</label>
 <input name="images" type="file" accept="image/*" multiple class="w-full text-sm p-1 border border-slate-200 rounded-lg bg-white" />
 </div>`;

// Regex replacement because of encoding issues inside PowerShell.
html = html.replace(/<div>\s*<label class="text-sm font-bold text-slate-900\/70 block mb-1">.*?<\/label>\s*<input name="images" type="file".*?>\s*<\/div>/, newImagesHtml);

fs.writeFileSync('public/admin.html', html, 'utf8');
console.log('Fixed admin images.');
