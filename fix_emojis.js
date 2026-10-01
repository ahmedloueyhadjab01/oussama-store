const fs = require('fs');
let js = fs.readFileSync('public/js/admin.js', 'utf8');

js = js.replace(/>تعديل<\/button>/g, '>✏️ تعديل</button>');
js = js.replace(/>حذف<\/button>/g, '>🗑️ حذف</button>');

js = js.replace(/title="تعديل التصنيف">.*?<\/button>/g, 'title="تعديل التصنيف">✏️</button>');
js = js.replace(/title="حذف التصنيف">.*?<\/button>/g, 'title="حذف التصنيف">🗑️</button>');

js = js.replace(/>تعديل<\/a>/g, '>✏️ تعديل</a>');

js = js.replace(/text-blue-500([^>]*>🗑️ حذف)/g, 'text-red-500$1');

fs.writeFileSync('public/js/admin.js', js, 'utf8');
console.log('Fixed emojis with UTF8');
