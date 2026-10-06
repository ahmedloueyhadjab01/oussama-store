function parseItems(raw) {
  if (Array.isArray(raw)) return raw;
  try { return JSON.parse(raw || '[]'); } catch (e) { return []; }
}

module.exports = { parseItems };