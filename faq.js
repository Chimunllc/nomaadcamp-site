// NOMAAD Camp · FAQ page — sticky tab filter + smooth anchor scroll.
// Native <details> already handles open/close, so this script is small.
(function () {
  'use strict';

  // ── Tab filter ────────────────────────────────────────────────
  // Clicking a category button hides FAQ items whose data-category
  // doesn't match. "all" shows everything. Category section titles
  // (data-cat) follow the same rule.
  var tabs  = document.querySelectorAll('.faq-tab');
  var items = document.querySelectorAll('.faq-item');
  var titles = document.querySelectorAll('.faq-cat-title');

  function applyFilter(cat) {
    items.forEach(function (el) {
      var match = (cat === 'all') || (el.dataset.category === cat);
      el.hidden = !match;
      // Close any open accordions when filtering for tidiness.
      if (!match) el.removeAttribute('open');
    });
    titles.forEach(function (el) {
      var match = (cat === 'all') || (el.dataset.cat === cat);
      el.hidden = !match;
    });
    tabs.forEach(function (t) {
      var active = t.dataset.faqFilter === cat;
      t.classList.toggle('is-active', active);
      t.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    // Keep URL in sync so the choice survives reload + can be shared.
    if (history && history.replaceState) {
      var hash = (cat === 'all') ? '' : '#cat=' + cat;
      history.replaceState(null, '', location.pathname + hash);
    }
  }

  tabs.forEach(function (t) {
    t.addEventListener('click', function () { applyFilter(t.dataset.faqFilter); });
  });

  // Initial filter from URL hash (e.g. /faq.html#cat=tent).
  var initial = 'all';
  var m = location.hash.match(/cat=(\w+)/);
  if (m && document.querySelector('[data-faq-filter="' + m[1] + '"]')) {
    initial = m[1];
  }
  applyFilter(initial);

  // ── Anchor scroll: open the targeted FAQ + scroll into view ───
  // Supports /faq.html#tent-size — opens the matching <details>.
  function openTargeted() {
    var id = location.hash.replace('#', '');
    if (!id || id.indexOf('cat=') === 0) return;
    var el = document.getElementById(id);
    if (el && el.tagName === 'DETAILS') {
      el.open = true;
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
  window.addEventListener('hashchange', openTargeted);
  // Defer a tick so the layout settles after any tab filtering.
  setTimeout(openTargeted, 60);

  // ── Mobile nav toggle parity (re-uses existing markup) ────────
  var toggle = document.querySelector('.nav-toggle');
  var nav    = document.getElementById('primary-nav');
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }
})();
