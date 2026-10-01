const fs = require('fs');

function updateFooter(file) {
  if (!fs.existsSync(file)) return;
  let html = fs.readFileSync(file, 'utf8');

  // Replace Contact Us section
  const contactUsRegex = /<div class="flex flex-col items-center md:items-start">\s*<h3 class="text-neutral-900 font-bold mb-4">تواصل معنا<\/h3>[\s\S]*?<\/div>/;
  const newContactUs = `<div class="flex flex-col items-center md:items-start">
          <h3 class="text-neutral-900 font-bold mb-4">اتصل بنا</h3>
          <p class="text-neutral-500 text-sm mb-4 leading-relaxed text-center md:text-right">نسعد بتواصلكم معنا، لا تترددوا في مراسلتنا عبر الواتساب أو الإنستغرام:</p>
          <div id="socialIconsFooter" class="flex flex-wrap gap-4 justify-center md:justify-start"></div>
        </div>`;
  html = html.replace(contactUsRegex, newContactUs);

  // Replace Quick Links section
  const quickLinksRegex = /<ul class="space-y-2 text-sm text-neutral-500">[\s\S]*?<\/ul>/;
  const newQuickLinks = `<ul class="space-y-3 text-sm text-neutral-500">
            <li><a href="/" class="hover:text-neutral-900 transition-colors">الرئيسية</a></li>
            <li><a href="#" class="hover:text-neutral-900 transition-colors">من نحن</a></li>
            <li><a href="#" class="hover:text-neutral-900 transition-colors">سياسة الاسترجاع والاستبدال</a></li>
          </ul>`;
  html = html.replace(quickLinksRegex, newQuickLinks);

  fs.writeFileSync(file, html, 'utf8');
}

updateFooter('public/index.html');
console.log('Footer updated in index.html');
