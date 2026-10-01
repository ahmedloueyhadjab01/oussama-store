(() => {
  const storageKey = 'savedCustomer';
  const fields = ['customer_name', 'phone', 'wilaya_code', 'commune', 'address'];

  function readSaved() {
    try {
      const value = JSON.parse(localStorage.getItem(storageKey) || 'null');
      return value && typeof value === 'object' ? value : null;
    } catch {
      return null;
    }
  }

  function collect(form) {
    return Object.fromEntries(fields.map((name) => {
      const field = form.elements.namedItem(name);
      return [name, String(field ? field.value : '').trim()];
    }));
  }

  function hasConflict(previous, current) {
    return fields.some((name) => previous[name] && current[name] && String(previous[name]) !== current[name]);
  }

  function showChoices(previous, current, getWilayaName) {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/60 p-4';
      overlay.setAttribute('role', 'dialog');
      overlay.setAttribute('aria-modal', 'true');

      const panel = document.createElement('div');
      panel.className = 'w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl';

      const title = document.createElement('h2');
      title.className = 'mb-4 text-xl font-black text-slate-900';
      title.textContent = 'بيانات الطلب تختلف عن طلبك السابق';

      const details = document.createElement('div');
      details.className = 'mb-5 grid gap-3 sm:grid-cols-2';

      function addSummary(label, value, colorClass) {
        const section = document.createElement('section');
        section.className = `rounded-xl border p-3 ${colorClass}`;
        const heading = document.createElement('h3');
        heading.className = 'mb-2 text-sm font-black';
        heading.textContent = label;
        const summary = document.createElement('p');
        summary.className = 'whitespace-pre-line break-words text-sm font-semibold';
        const wilayaName = getWilayaName(value.wilaya_code) || value.wilaya_code || '—';
        summary.textContent = [
          value.customer_name || '—',
          value.phone || '—',
          `ولاية ${wilayaName} - ${value.commune || '—'}`,
          value.address || '—',
        ].join('\n');
        section.append(heading, summary);
        details.appendChild(section);
      }

      addSummary('البيانات السابقة', previous, 'border-slate-200 bg-slate-50 text-slate-800');
      addSummary('البيانات الجديدة', current, 'border-blue-200 bg-blue-50 text-slate-800');

      const actions = document.createElement('div');
      actions.className = 'flex gap-3';
      const oldButton = document.createElement('button');
      oldButton.type = 'button';
      oldButton.className = 'flex-1 rounded-xl bg-slate-100 px-4 py-3 font-black text-slate-800 hover:bg-slate-200';
      oldButton.textContent = 'استخدم البيانات السابقة';
      const newButton = document.createElement('button');
      newButton.type = 'button';
      newButton.className = 'flex-1 rounded-xl bg-slate-900 px-4 py-3 font-black text-white hover:bg-slate-800';
      newButton.textContent = 'استخدم البيانات الجديدة';
      actions.append(oldButton, newButton);
      panel.append(title, details, actions);
      overlay.appendChild(panel);
      document.body.appendChild(overlay);

      let settled = false;
      function finish(usePrevious) {
        if (settled) return;
        settled = true;
        document.removeEventListener('keydown', onKeyDown);
        overlay.remove();
        resolve(usePrevious);
      }
      function onKeyDown(event) {
        if (event.key === 'Escape') finish(false);
      }
      oldButton.addEventListener('click', () => finish(true));
      newButton.addEventListener('click', () => finish(false));
      document.addEventListener('keydown', onKeyDown);
      oldButton.focus();
    });
  }

  async function resolve(form, { loadCommunes, afterRestore, getWilayaName = () => '' } = {}) {
    const previous = readSaved();
    const current = collect(form);
    if (!previous || !hasConflict(previous, current)) return;

    if (!await showChoices(previous, current, getWilayaName)) return;

    for (const name of ['customer_name', 'phone', 'address']) {
      const field = form.elements.namedItem(name);
      if (field) field.value = previous[name] || '';
    }

    const wilaya = form.elements.namedItem('wilaya_code');
    if (wilaya) wilaya.value = String(previous.wilaya_code || '');
    if (previous.wilaya_code && loadCommunes) await loadCommunes(previous.wilaya_code);

    const commune = form.elements.namedItem('commune');
    if (commune) commune.value = previous.commune || '';
    if (afterRestore) await afterRestore();
  }

  function save(form) {
    try {
      localStorage.setItem(storageKey, JSON.stringify(collect(form)));
    } catch {}
  }

  window.CustomerConflict = { resolve, save };
})();