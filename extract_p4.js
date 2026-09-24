const fs = require('fs');
let html = fs.readFileSync('old_product.html', 'utf8');

const marker = "let CURRENT_DELIVERY_TYPE = 'home';";
const startIdx = html.indexOf(marker);

if (startIdx !== -1) {
  const startTagIdx = html.lastIndexOf('<script>', startIdx);
  const endTagIdx = html.indexOf('</script>', startIdx);
  const js = html.substring(startTagIdx + 8, endTagIdx);
  
  // Also we need to apply the DOM ID fixes we did earlier (like customerWilaya etc)
  let pcode = js;
  // Apply the same regex replacements as we did in fix_store_ids.js for product.js
  pcode = pcode.replace(/document\.getElementById\('custWilaya'\)/g, "document.getElementById('customerWilaya')");
  pcode = pcode.replace(/document\.getElementById\('custCommune'\)/g, "document.getElementById('customerCommune')");
  pcode = pcode.replace(/form\.fullName\.value/g, "document.getElementById('customerName').value");
  pcode = pcode.replace(/form\.phone\.value/g, "document.getElementById('customerPhone').value");
  pcode = pcode.replace(/form\.address\.value/g, "document.getElementById('customerAddress').value");
  pcode = pcode.replace(/id='cartCount'/g, "id='cartCountMobile'");
  pcode = pcode.replace(/document\.getElementById\('checkoutOverlay'\)\.classList\.add\('hidden'\);/g, "const modal=document.getElementById('checkoutModal');if(modal) { const inner=modal.querySelector('.bg-white'); if(inner) inner.classList.add('translate-y-full'); setTimeout(()=>modal.classList.add('hidden'), 300); }");
  pcode = pcode.replace(/document\.getElementById\('checkoutOverlay'\)\.classList\.remove\('hidden'\);/g, "const modal=document.getElementById('checkoutModal');if(modal){modal.classList.remove('hidden');setTimeout(()=>{const inner=modal.querySelector('.bg-white');if(inner)inner.classList.remove('translate-y-full');},10);}");

  fs.writeFileSync('public/js/product.js', pcode, 'utf8');
  console.log('Successfully extracted and patched product.js! Length:', pcode.length);
} else {
  console.log('Marker not found');
}
