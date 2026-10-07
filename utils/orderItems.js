function parseItems(raw) {
  if (Array.isArray(raw)) return raw;
  try {
    return JSON.parse(raw || "[]");
  } catch (e) {
    console.error("JSON parse error in items:", e.message);
    return [];
  }
}

module.exports = { parseItems };
