const fs = require('fs');

function fixFile(file) {
  if (!fs.existsSync(file)) return;
  let code = fs.readFileSync(file, 'utf8');
  
  code = code.replace(/document\.getElementById\('custWilaya'\)/g, "document.getElementById('customerWilaya')");
  code = code.replace(/document\.getElementById\('custCommune'\)/g, "document.getElementById('customerCommune')");
  code = code.replace(/wilayaSelect\.addEventListener/g, "wilayaSelect?.addEventListener");
  
  fs.writeFileSync(file, code, 'utf8');
  console.log('Fixed ' + file);
}

fixFile('public/js/store.js');
fixFile('public/js/product.js');
