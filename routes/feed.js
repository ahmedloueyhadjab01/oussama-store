const express = require('express');
const db = require('../db');

const router = express.Router();

function escapeXml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function escapeCsv(str = '') {
  const s = String(str).replace(/"/g, '""');
  return `"${s}"`;
}

function fullUrl(p) {
  const base = (process.env.STORE_URL || '').replace(/\/$/, '');
  return p.startsWith('http') ? p : `${base}${p}`;
}

// خلاصة منتجات لفيسبوك و انستغرام
router.get('/facebook.xml', async (req, res) => {
  const storeId = req.query.store_id ? parseInt(req.query.store_id, 10) : null;

  let products;
  if (storeId) {
    products = await db.all('SELECT * FROM products WHERE is_active = 1 AND user_id = $1', [storeId]);
  } else {
    products = await db.all('SELECT * FROM products WHERE is_active = 1');
  }

  let storeName = process.env.STORE_NAME || 'My Store';
  if (storeId) {
    const vendor = await db.get('SELECT store_name FROM users WHERE id = $1', [storeId]);
    if (vendor && vendor.store_name) storeName = vendor.store_name;
  }
  storeName = escapeXml(storeName);
  const storeUrl = process.env.STORE_URL || '';

  let items = '';
  for (const p of products) {
    const storeParam = storeId ? `&store_id=${storeId}` : '';
    const link = `${storeUrl}/?slug=${encodeURIComponent(p.slug)}${storeParam}`;
    const image = p.image ? fullUrl(p.image) : '';
    items += `
    <item>
      <g:id>${p.id}</g:id>
      <g:title>${escapeXml(p.name)}</g:title>
      <g:description>${escapeXml(p.description || p.name)}</g:description>
      <g:link>${escapeXml(link)}</g:link>
      <g:image_link>${escapeXml(image)}</g:image_link>
      <g:availability>${(p.stock > 0 || p.has_variants == 1 || (p.variants && p.variants !== '[]' && p.variants.length > 2)) ? 'in stock' : 'out of stock'}</g:availability>
      <g:price>${parseFloat(p.price).toFixed(2)} DZD</g:price>
      <g:condition>new</g:condition>
      <g:brand>${storeName}</g:brand>
    </item>`;
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>${storeName}</title>
    <link>${escapeXml(storeUrl)}</link>
    <description>خلاصة منتجات ${storeName}</description>${items}
  </channel>
</rss>`;

  res.set('Content-Type', 'application/xml; charset=utf-8');
  res.send(xml);
});

// خلاصة منتجات لتيك توك شوب (بصيغة CSV)
router.get('/tiktok.csv', async (req, res) => {
  const storeId = req.query.store_id ? parseInt(req.query.store_id, 10) : null;

  let products;
  if (storeId) {
    products = await db.all('SELECT * FROM products WHERE is_active = 1 AND user_id = $1', [storeId]);
  } else {
    products = await db.all('SELECT * FROM products WHERE is_active = 1');
  }

  let storeName = process.env.STORE_NAME || '';
  if (storeId) {
    const vendor = await db.get('SELECT store_name FROM users WHERE id = $1', [storeId]);
    if (vendor && vendor.store_name) storeName = vendor.store_name;
  }

  const storeUrl = process.env.STORE_URL || '';
  const header = 'id,title,description,availability,price,link,image_link,brand\n';
  let rows = '';
  for (const p of products) {
    const storeParam = storeId ? `&store_id=${storeId}` : '';
    const link = `${storeUrl}/?slug=${encodeURIComponent(p.slug)}${storeParam}`;
    const image = p.image ? fullUrl(p.image) : '';
    rows += [
      p.id,
      escapeCsv(p.name),
      escapeCsv(p.description || p.name),
      p.stock > 0 ? 'in stock' : 'out of stock',
      parseFloat(p.price).toFixed(2),
      escapeCsv(link),
      escapeCsv(image),
      escapeCsv(storeName),
    ].join(',') + '\n';
  }

  res.set('Content-Type', 'text/csv; charset=utf-8');
  res.send(header + rows);
});

module.exports = router;
