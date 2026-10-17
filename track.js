(function () {
  function send(name, params) {
    try { if (typeof gtag === 'function') gtag('event', name, params); } catch (e) {}
  }
  var m = location.pathname.match(/^\/apps\/([^/]+)/);
  var page = m ? m[1] : location.pathname;
  function code(a) {
    var x = (a.getAttribute('href') || '').match(/a8mat=([^&]+)/);
    return x ? x[1] : '';
  }

  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href*="a8.net"]');
    if (a) {
      send('ad_click', { page: page, a8mat: code(a), transport_type: 'beacon' });
      return;
    }
    var b = e.target.closest && e.target.closest('button, input[type="button"], input[type="submit"]');
    if (b && /計算|診断|算出|判定|検定|変換|シミュレーション|生成|比較|求める|チェック|実行/.test(b.textContent || b.value || '')) {
      send('tool_action', { page: page, label: (b.textContent || b.value || '').trim().slice(0, 30) });
    }
  }, true);

  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        io.unobserve(en.target);
        var a = en.target.querySelector('a[href*="a8.net"]');
        send('ad_view', { page: page, a8mat: a ? code(a) : '' });
      });
    }, { threshold: 0.5 });
    document.querySelectorAll('.affiliate-block').forEach(function (el) { io.observe(el); });
  }
})();
