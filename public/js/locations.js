// منطق مشترك للولايات/البلديات وأسعار التوصيل (يُستخدم في صفحة إتمام الطلب)
const Locations = {
  wilayas: [],

  async loadWilayas(selectEl) {
    const res = await fetch('/api/locations/wilayas');
    this.wilayas = await res.json();
    selectEl.innerHTML = '<option value="">الولاية...</option>' +
      this.wilayas
        .map((w) => `<option value="${w.wilaya_code}">${String(w.wilaya_code).padStart(2, '0')} - ${w.wilaya_name}</option>`)
        .join('');
  },

  async loadCommunes(wilayaCode, selectEl) {
    selectEl.disabled = true;
    selectEl.innerHTML = '<option value="">جارِ التحميل...</option>';
    const res = await fetch(`/api/locations/communes/${wilayaCode}`);
    const communes = await res.json();
    selectEl.innerHTML = '<option value="">البلدية...</option>' +
      communes.map((c) => `<option value="${c}">${c}</option>`).join('');
    selectEl.disabled = false;
  },

  getRate(wilayaCode) {
    return this.wilayas.find((w) => w.wilaya_code === Number(wilayaCode));
  },
};
