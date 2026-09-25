const fs = require('fs');
let js = fs.readFileSync('public/js/admin.js', 'utf8');

const target = "form.is_active.checked = product.is_active;";
const replacement = `form.is_active.checked = product.is_active;

    const previewContainer = document.getElementById('editProductImagePreview');
    const previewImage = document.getElementById('currentCoverImage');
    if (product.image) {
      previewImage.src = product.image;
      previewContainer.classList.remove('hidden');
    } else {
      previewContainer.classList.add('hidden');
    }
`;

js = js.replace(target, replacement);

const targetElse = "const variantsEditPanel = document.getElementById('variantsEditPanel');";
const replacementElse = `const variantsEditPanel = document.getElementById('variantsEditPanel');
 document.getElementById('editProductImagePreview').classList.add('hidden');`;

js = js.replace(targetElse, replacementElse);

fs.writeFileSync('public/js/admin.js', js, 'utf8');
console.log('Fixed admin.js images logic.');
