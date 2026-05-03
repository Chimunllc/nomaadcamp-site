// NOMAAD Camp — date pickers with locked check-in/check-out times.
// User picks only the date; the time is auto-set based on day of week:
//   Mon–Thu  →  10:00 → 18:00 (өдрийн хөтөлбөр)
//   Friday   →  Fri 09:00 → Sat 11:00 (кэмп · 1 шөнө)
//   Saturday →  Sat 12:00 → Sun 15:00 (кэмп · 1 шөнө)
//   Sunday   →  Sat 12:00 → Sun 15:00 (Sat slot-той хослоно)
(function () {
  'use strict';
  if (typeof flatpickr === 'undefined') return;

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
    var dow = date.getDay();
    if (dow >= 1 && dow <= 4) {
      return { startHour: 10, endHour: 18, endDayOffset: 0, label: 'Өдрийн хөтөлбөр' };
    }
    if (dow === 5) {
      return { startHour: 9,  endHour: 11, endDayOffset: 1, label: 'Кэмп · 1 шөнө' };
    }
    // dow === 6 (Saturday) or dow === 0 (Sunday) — fold Sunday into Saturday slot.
    var startDate = (dow === 0) ? addDays(date, -1) : date;
    return { startHour: 12, endHour: 15, endDayOffset: 1, label: 'Кэмп · 1 шөнө', startDate: startDate };
  }

  var startDateInput = document.getElementById('start-date');
  var endDateInput   = document.getElementById('end-date');
  var startHidden    = document.getElementById('start-datetime');
  var endHidden      = document.getElementById('end-datetime');
  var startTimeEl    = document.getElementById('start-time-display');
  var endTimeEl      = document.getElementById('end-time-display');

  if (!startDateInput || !endDateInput) return;

  function applySlot(pickedDate) {
    var slot = slotFor(pickedDate);
    var sd = slot.startDate || pickedDate;
    var ed = addDays(sd, slot.endDayOffset);

    var startStr = isoDate(sd) + 'T' + pad(slot.startHour) + ':00';
    var endStr   = isoDate(ed) + 'T' + pad(slot.endHour)   + ':00';

    if (startHidden) startHidden.value = startStr;
    if (endHidden)   endHidden.value   = endStr;
    if (startTimeEl) startTimeEl.textContent = pad(slot.startHour) + ':00';
    if (endTimeEl)   endTimeEl.textContent   = pad(slot.endHour)   + ':00';

    // Reflect the recomputed dates in the visible inputs (without re-firing this handler).
    if (startDateInput._flatpickr) {
      startDateInput._flatpickr.setDate(sd, false);
    }
    if (endDateInput._flatpickr) {
      endDateInput._flatpickr.setDate(ed, false);
    }
  }

  var commonOptions = {
    locale: mnLocale,
    dateFormat: 'Y-m-d',
    altInput: true,
    altFormat: 'l · j · F',  // "Бямба · 9 · 5-р сар"
    enableTime: false,
    minDate: 'today',
    maxDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
    disableMobile: false
  };

  flatpickr(startDateInput, Object.assign({}, commonOptions, {
    onChange: function (sel) {
      if (!sel || !sel[0]) return;
      applySlot(sel[0]);
    }
  }));

  flatpickr(endDateInput, Object.assign({}, commonOptions, {
    onChange: function (sel) {
      if (!sel || !sel[0]) return;
      // Manually picking the end date overrides only its display + the hidden value;
      // the time follows day-of-week of THAT date but as a check-out.
      var d = sel[0];
      var slot = slotFor(d);
      // Use the slot's endHour for this date; keep the start untouched.
      var endStr = isoDate(d) + 'T' + pad(slot.endHour) + ':00';
      if (endHidden) endHidden.value = endStr;
      if (endTimeEl) endTimeEl.textContent = pad(slot.endHour) + ':00';
    }
  }));
})();
