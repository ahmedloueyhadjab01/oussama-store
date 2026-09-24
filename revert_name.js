const fs = require('fs');

function revertName(filePath) {
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Replace OVARO with ovaro_28 in spans
    content = content.replace(/<span class="tracking-widest">OVARO<\/span>/g, '<span class="tracking-widest">ovaro_28</span>');
    
    // Replace OVARO with ovaro_28 in paragraphs (footer)
    content = content.replace(/<p class="text-2xl font-bold tracking-widest text-slate-900">OVARO<\/p>/g, '<p class="text-2xl font-bold tracking-widest text-slate-900">ovaro_28</p>');
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Updated ' + filePath);
  }
}

revertName('public/index.html');
revertName('public/product.html');
