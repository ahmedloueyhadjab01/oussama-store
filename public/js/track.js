// تتبع مصدر الزيارة (المنصة الإعلانية) وتسجيلها تلقائياً مرة واحدة لكل جلسة
(function () {
  try {
    var params = new URLSearchParams(window.location.search);
    var fields = ['utm_source', 'utm_campaign', 'utm_medium', 'utm_content'];
    var found = false;
    fields.forEach(function (f) {
      if (params.has(f) && params.get(f)) { sessionStorage.setItem(f, params.get(f)); found = true; }
    });

    // إن لم توجد utm: نستنتج المنصة من معرّفات النقر أو من المتصفح الداخلي للتطبيق أو من رابط الإحالة
    if (!found && !sessionStorage.getItem('utm_source')) {
      var guess = '';
      if (params.has('fbclid')) guess = 'facebook';
      else if (params.has('ttclid')) guess = 'tiktok';
      else if (params.has('gclid')) guess = 'google';
      else if (params.has('igshid')) guess = 'instagram';
      if (!guess) {
        var ua = navigator.userAgent || '';
        if (/Instagram/i.test(ua)) guess = 'instagram';
        else if (/FBAN|FBAV|FB_IAB/i.test(ua)) guess = 'facebook';
        else if (/musical_ly|BytedanceWebview|TikTok/i.test(ua)) guess = 'tiktok';
        else if (/Snapchat/i.test(ua)) guess = 'snapchat';
      }
      if (!guess && document.referrer) {
        try {
          var ref = new URL(document.referrer);
          if (ref.hostname !== window.location.hostname) guess = ref.hostname; // تجاهل التنقل الداخلي
        } catch (e) {}
      }
      if (guess) sessionStorage.setItem('utm_source', guess);
    }

    // معرّف جلسة لمنع العدّ المكرر
    var sid = sessionStorage.getItem('visit_sid');
    if (!sid) {
      sid = Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
      sessionStorage.setItem('visit_sid', sid);
    }

    if (!sessionStorage.getItem('visit_tracked')) {
      sessionStorage.setItem('visit_tracked', '1');
      fetch('/api/campaigns/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          store_id: params.get('store_id') || params.get('store_slug') || 'default',
          session_id: sid,
          utm_source: sessionStorage.getItem('utm_source') || '',
          utm_campaign: sessionStorage.getItem('utm_campaign') || '',
          utm_medium: sessionStorage.getItem('utm_medium') || '',
          utm_content: sessionStorage.getItem('utm_content') || '',
        }),
        keepalive: true,
      }).catch(function () {});
    }
  } catch (e) {}
})();
