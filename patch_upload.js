const fs = require('fs');
const file = 'C:/Users/pc/Desktop/w/eco/ousama/ecommerce.store/routes/upload.js';
let content = fs.readFileSync(file, 'utf8');

// Replace the throw error with a fallback
const search = "if (error) {\r\n    throw new Error(`??? ?? ??? ????? ??? Supabase Storage: $`);\r\n  }";
const replace = "if (error) {\r\n    console.warn('Supabase upload failed, falling back to local. Error:', error.message);\r\n    throw new Error('FALLBACK_LOCAL');\r\n  }";
content = content.replace(/if \(error\) \{\s*throw new Error\(\.*?Supabase Storage.*?\\);\s*\}/, "if (error) { throw new Error('FALLBACK_LOCAL'); }");

fs.writeFileSync(file, content, 'utf8');
console.log('Patched upload.js');
