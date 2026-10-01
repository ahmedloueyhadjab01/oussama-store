const fs = require("fs");
const file = "C:/Users/pc/Desktop/w/eco/nacer/ecommerce-store/routes/upload.js";
let text = fs.readFileSync(file, "utf8");

const newFunc = `async function uploadToSupabaseStorage(buffer, originalname, mimetype) {
  const ext = require("path").extname(originalname).toLowerCase();
  const safeName = Date.now() + "_" + require("crypto").randomBytes(8).toString("hex") + ext;
  const bucketName = process.env.SUPABASE_STORAGE_BUCKET || "uploads";
  let fallbackLocal = false;
  
  if (supabaseClient) {
    try { await supabaseClient.storage.createBucket(bucketName, { public: true }).catch(()=>{}); } catch(e){}
    const { data, error } = await supabaseClient.storage.from(bucketName).upload(safeName, buffer, { contentType: mimetype, upsert: true });
    if (error) {
      console.warn("Supabase upload failed, falling back to local:", error.message);
      fallbackLocal = true;
    } else {
      const { data: pUrl } = supabaseClient.storage.from(bucketName).getPublicUrl(safeName);
      return { url: pUrl.publicUrl, filename: safeName };
    }
  } else {
    fallbackLocal = true;
  }
  
  if (fallbackLocal) {
    const fs = require("fs");
    const path = require("path");
    const upDir = path.join(__dirname, "..", "public", "uploads");
    if (!fs.existsSync(upDir)) fs.mkdirSync(upDir, { recursive: true });
    fs.writeFileSync(path.join(upDir, safeName), buffer);
    return { url: "/uploads/" + safeName, filename: safeName };
  }
}`;

text = text.replace(/async function uploadToSupabaseStorage[\s\S]*?return \{\s*url: publicUrlData\.publicUrl,\s*filename: safeName,\s*\};\s*\}/, newFunc);
fs.writeFileSync(file, text);
console.log("Patched nacer!");
