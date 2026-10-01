const fs = require('fs');

function fixToast(filePath) {
  let code = fs.readFileSync(filePath, 'utf8');
  
  const newToastFunc = `function showToast(msg, isError = false) {
  const container = document.getElementById('toastContainer');
  if(!container) return;
  const toast = document.createElement('div');
  toast.className = 'transform translate-y-[-100%] opacity-0 transition-all duration-300 bg-neutral-900 text-white px-4 py-3 rounded-md shadow-lg flex items-center gap-3 text-sm font-medium w-full pointer-events-auto';
  if(isError) toast.className = toast.className.replace('bg-neutral-900', 'bg-red-600');
  
  toast.innerHTML = \`<svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="\${isError ? 'M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' : 'M5 13l4 4L19 7'}"></path></svg><span>\${msg}</span>\`;
  
  container.appendChild(toast);
  
  // Animate in
  requestAnimationFrame(() => {
    toast.classList.remove('translate-y-[-100%]', 'opacity-0');
  });
  
  setTimeout(() => {
    toast.classList.add('translate-y-[-100%]', 'opacity-0');
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}`;

  // Replace old showToast
  code = code.replace(/function showToast\(msg\) \{[\s\S]*?\n\}/, newToastFunc);
  
  fs.writeFileSync(filePath, code, 'utf8');
}

fixToast('public/js/store.js');
fixToast('public/js/product.js');
console.log('Toasts updated!');
