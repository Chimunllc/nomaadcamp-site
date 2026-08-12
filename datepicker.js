// NOMAAD Camp, date pickers with locked check-in/check-out times.
// User picks only the date; бүх өдөр адилхан слот:
//   check-in 09:00 → маргааш check-out 10:00 (кэмп · 1 шөнө)
//
// flatpickr (~30KB JS + ~5KB CSS) is loaded LAZILY on first focus of either
// date input. This keeps initial mobile load fast for users who never open
// the quote modal.
(function () {
  'use strict';

  var FP_VERSION = '4.6.13';
  var fpLoading = null;
  function loadFlatpickr() {
    if (typeof flatpickr !== 'undefined') return Promise.resolve();
    if (fpLoading) return fpLoading;
    fpLoading = new Promise(function (resolve, reject) {
      var css = document.createElement('link');
      css.rel = 'stylesheet';
      css.href = 'https://cdn.jsdelivr.net/npm/flatpickr@' + FP_VERSION + '/dist/flatpickr.min.css';
      document.head.appendChild(css);
      var s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/flatpickr@' + FP_VERSION + '/dist/flatpickr.min.js';
      s.async = true;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
    return fpLoading;
  }

  var mnLocale = {
    weekdays: {
      shorthand: ['Ня', 'Да', 'Мя', 'Лх', 'Пү', 'Ба', 'Бя'],
      longhand:  ['Ням', 'Даваа', 'Мягмар', 'Лхагва', 'Пүрэв', 'Баасан', 'Бямба']
    },
    months: {
      shorthand: ['1-р','2-р','3-р','4-р','5-р','6-р','7-р','8-р','9-р','10-р','11-р','12-р'],
      longhand:  ['1-р сар','2-р сар','3-р сар','4-р сар','5-р сар','6-р сар','7-р сар','8-р сар','9-р сар','10-р сар','11-р сар','12-р сар']
    },
    firstDayOfWeek: 1,
    rangeSeparator: ' – ',
    weekAbbreviation: 'Долоо',
    scrollTitle: 'Зөөж сонгох',
    toggleTitle: 'Хэлбэр сольж сонгох'
  };

  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function isoDate(d) {
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }
  function addDays(date, n) {
    var x = new Date(date);
    x.setDate(x.getDate() + n);
    return x;
  }

  // Returns the booking slot for the given date.
  // { startHour, endHour, endDayOffset, label }
  function slotFor(date) {
    // Бүх өдөр адилхан: нэвтрэх 09:00 → маргааш гарах 10:00 (кэмп · 1 шөнө).
    return { startHour: 9, endHour: 10, endDayOffset: 1, label: 'Кэмп · 1 шөнө' };
  }

  var startDateInput = document.getElementById('start-date');
  var endDateInput   = document.getElementById('end-date');
  var startHidden    = document.getElementById('start-datetime');
  var endHidden      = document.getElementById('end-datetime');
  var startTimeEl    = document.getElementById('start-time');   // <input type="time"> (засаж болно)
  var endTimeEl      = document.getElementById('end-time');

  if (!startDateInput || !endDateInput) return;

  // Сонгогдсон огноог хадгална — цаг өөрчлөгдөхөд hidden datetime-г дахин угсарна.
  var _startDate = null, _endDate = null;
  function rebuildHidden() {
    if (_startDate && startHidden) {
      startHidden.value = (startTimeEl && startTimeEl.value)
        ? isoDate(_startDate) + 'T' + startTimeEl.value
        : isoDate(_startDate);
    }
    if (_endDate && endHidden) {
      endHidden.value = (endTimeEl && endTimeEl.value)
        ? isoDate(_endDate) + 'T' + endTimeEl.value
        : isoDate(_endDate);
    }
  }

  // Сонгосон огнооны авто check-in/check-out цагийг үйлчлүүлэгчид харуулна.
  // (Цагийн талбарууд нуугдсан, өдрөөс хамаарч авто тохирдог тул зөвхөн мэдээлэл.)
  function renderSlotSummary(sd, ed, slot) {
    var el = document.getElementById('slot-summary');
    if (!el) return;
    var wd = mnLocale.weekdays.longhand;
    var st = (startTimeEl && startTimeEl.value) || (pad(slot.startHour) + ':00');
    var en = (endTimeEl && endTimeEl.value) || (pad(slot.endHour) + ':00');
    var body = (slot.endDayOffset === 0)
      ? wd[sd.getDay()] + ' ' + st + '–' + en
      : wd[sd.getDay()] + ' ' + st + ' → ' + wd[ed.getDay()] + ' ' + en;
    el.textContent = '⏰ ' + body + ' · ' + slot.label;
    el.hidden = false;
  }

  function applySlot(pickedDate) {
    var slot = slotFor(pickedDate);
    var sd = slot.startDate || pickedDate;
    var ed = addDays(sd, slot.endDayOffset);
    _startDate = sd; _endDate = ed;

    // Өдрөөс хамаарсан стандарт цаг — default болгож тавина, хэрэглэгч засаж болно.
    if (startTimeEl) startTimeEl.value = pad(slot.startHour) + ':00';
    if (endTimeEl)   endTimeEl.value   = pad(slot.endHour)   + ':00';
    rebuildHidden();
    renderSlotSummary(sd, ed, slot);

    // Reflect the recomputed dates in the visible inputs (without re-firing this handler).
    if (startDateInput._flatpickr) {
      startDateInput._flatpickr.setDate(sd, false);
    }
    if (endDateInput._flatpickr) {
      endDateInput._flatpickr.setDate(ed, false);
    }
  }

  // ── Боломжтой (сул) өдрүүд ─────────────────────────────────────────
  // Аппын nomaad-orders webhook-оос баталгаажсан захиалгыг татаж, тухайн
  // сонгосон кемп дээр захиалагдсан огноог сонгуулахгүй (саарал) болгоно.
  // Зөвхөн БАТАЛГААЖСАН (урьдчилгаа/төлбөр/гэрээ/дууссан) захиалга блоклоно —
  // цуцалсан ба зөвхөн үнийн санал (төлбөргүй) блоклохгүй.
  var NOMAAD_ORDERS_URL = 'https://n8n.nomaadcamp.com/webhook/nomaad-orders?key=1YP4RCfL_DMiBhDfkCkX6AesQHd5p2lZ';
  var blockedByCamp = null;      // { summit: {'YYYY-MM-DD':1}, meadow:{}, grove:{} }
  var bookingsLoading = null;

  function campKey(name) {
    var c = String(name || '').toLowerCase();
    if (c.indexOf('summit') >= 0) return 'summit';
    if (c.indexOf('meadow') >= 0) return 'meadow';
    if (c.indexOf('grove')  >= 0) return 'grove';
    return null; // өдрийн хөтөлбөр / бусад — камп биш
  }
  function currentCampKey() {
    var el = document.getElementById('field-camp');
    return el ? campKey(el.value) : null;
  }
  function bookingConfirmed(o) {
    var s = String(o.status || '').toLowerCase();
    if (s.indexOf('больсон') >= 0 || s.indexOf('цуцл') >= 0) return false;      // цуцалсан
    if (Number(o.income_advance) > 0 || Number(o.income_amount) > 0) return true; // урьдчилгаа/төлбөр
    if (String(o.contract_date || '').trim()) return true;                        // гэрээтэй
    if (s.indexOf('дуусс') >= 0 || s.indexOf('гүйцэтгэс') >= 0) return true;      // дууссан
    return false;
  }
  function eachDateISO(startStr, endStr, cb) {
    var s = new Date(String(startStr || '').slice(0, 10) + 'T00:00:00');
    if (isNaN(s.getTime())) return;
    var e = new Date(String(endStr || startStr || '').slice(0, 10) + 'T00:00:00');
    if (isNaN(e.getTime()) || e < s) e = new Date(s);
    for (var d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) cb(isoDate(d));
  }
  function loadNomaadBookings() {
    if (bookingsLoading) return bookingsLoading;
    bookingsLoading = fetch(NOMAAD_ORDERS_URL, { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : { orders: [] }; })
      .then(function (data) {
        var orders = (data && data.orders) || (Array.isArray(data) ? data : []);
        var map = { summit: {}, meadow: {}, grove: {} };
        orders.forEach(function (o) {
          var k = campKey(o.camp);
          if (!k || !bookingConfirmed(o)) return;
          eachDateISO(o.date_start, o.date_end, function (iso) { map[k][iso] = 1; });
        });
        blockedByCamp = map;
        return map;
      })
      .catch(function () { blockedByCamp = { summit: {}, meadow: {}, grove: {} }; return blockedByCamp; });
    return bookingsLoading;
  }
  function isDateBooked(date) {
    if (!blockedByCamp) return false;
    var k = currentCampKey();
    if (!k) return false;
    var set = blockedByCamp[k];
    return !!(set && set[isoDate(date)]);
  }

  var commonOptions = {
    locale: mnLocale,
    dateFormat: 'Y-m-d',
    altInput: true,
    altFormat: 'l · j · F',  // "Бямба · 9 · 5-р сар"
    enableTime: false,
    minDate: 'today',
    maxDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
    disable: [isDateBooked],
    disableMobile: false
  };

  // Захиалагдсан өдөрт "Захиалгатай" тэмдэг нэмнэ (зөвхөн start календарь).
  function onDayCreate(dObj, dStr, fp, dayElem) {
    if (fp.input !== startDateInput) return;
    var prev = dayElem.querySelector('.fp-booked');
    if (prev) prev.remove();
    dayElem.classList.remove('is-booked');
    var today = new Date(); today.setHours(0, 0, 0, 0);
    // Зөвхөн өнөөдрөөс хойшхи захиалагдсан өдөрт "Захиалгатай" (өнгөрсөнд биш).
    if (dayElem.dateObj && dayElem.dateObj >= today && isDateBooked(dayElem.dateObj)) {
      dayElem.classList.add('is-booked');
      var lbl = document.createElement('span');
      lbl.className = 'fp-booked';
      lbl.textContent = 'Захиалгатай';
      dayElem.appendChild(lbl);
    }
  }

  function initPickers() {
    if (typeof flatpickr === 'undefined') return;
    if (startDateInput._flatpickr || endDateInput._flatpickr) return;
    // Start — байнга харагдах (inline) сар харагдац; захиалагдсан өдөр "Захиалгатай".
    flatpickr(startDateInput, Object.assign({}, commonOptions, {
      inline: true,
      onDayCreate: onDayCreate,
      onChange: function (sel) { if (sel && sel[0]) applySlot(sel[0]); }
    }));
    // End — нуугдмал (checkout авто тооцогдоно); зөвхөн утга хадгална.
    flatpickr(endDateInput, Object.assign({}, commonOptions, {
      onChange: function (sel) {
        if (!sel || !sel[0]) return;
        _endDate = sel[0];
        if (endTimeEl && !endTimeEl.value) endTimeEl.value = pad(slotFor(sel[0]).endHour) + ':00';
        rebuildHidden();
      }
    }));
    if (startTimeEl) startTimeEl.addEventListener('change', rebuildHidden);
    if (endTimeEl)   endTimeEl.addEventListener('change', rebuildHidden);
  }

  // Модал нээгдэх / кемп солигдох бүрд: захиалга татаж, тухайн кемпийн
  // захиалагдсан өдрийг "Захиалгатай" болгож дахин зурна.
  function refreshCalendar() {
    var hint = document.getElementById('start-date-hint');
    if (hint) hint.hidden = !currentCampKey();
    loadNomaadBookings().then(function () {
      var fp = startDateInput._flatpickr;
      if (!fp) return;
      if (fp.selectedDates[0] && isDateBooked(fp.selectedDates[0])) {
        fp.clear();
        var sum = document.getElementById('slot-summary'); if (sum) sum.hidden = true;
      }
      fp.redraw();
    });
  }

  function onModalOpen() {
    loadFlatpickr().then(function () { initPickers(); refreshCalendar(); });
  }

  var quoteModalEl = document.getElementById('quote-modal');
  if (quoteModalEl && window.MutationObserver) {
    // data-quote-mode тохируулагдах = модал нээгдсэн/кемп солигдсон.
    new MutationObserver(function () {
      if (quoteModalEl.dataset.quoteMode) onModalOpen();
    }).observe(quoteModalEl, { attributes: true, attributeFilter: ['data-quote-mode'] });
  }
  // Модал аль хэдийн нээлттэй тохиолдолд шууд.
  if (quoteModalEl && quoteModalEl.dataset.quoteMode) onModalOpen();
})();
