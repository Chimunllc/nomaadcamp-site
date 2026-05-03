// NOMAAD Camp — date+time pickers using flatpickr.
// Mongolian locale, hour-only (60-min increment), past dates disabled.
(function () {
  'use strict';
  if (typeof flatpickr === 'undefined') return;

  // Mongolian locale (manually defined — flatpickr's bundled mn is sometimes
  // out of date; this keeps things predictable and CSP-friendly).
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
    toggleTitle: 'Хэлбэр сольж сонгох',
    amPM: ['ӨГ', 'ҮХ'],
    yearAriaLabel: 'Жил',
    monthAriaLabel: 'Сар',
    hourAriaLabel: 'Цаг',
    minuteAriaLabel: 'Минут'
  };

  var commonOptions = {
    locale: mnLocale,
    dateFormat: 'Y-m-d H:i',
    enableTime: true,
    time_24hr: true,
    minuteIncrement: 60,           // hour-only — no minutes
    minDate: 'today',
    maxDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
    defaultHour: 10,
    defaultMinute: 0,
    disableMobile: false,          // use native picker on mobile? keep false → flatpickr everywhere
    altInput: false                // we set value directly on the real input
  };

  var startInput = document.getElementById('start-datetime');
  var endInput   = document.getElementById('end-datetime');

  if (startInput) {
    var startFp = flatpickr(startInput, Object.assign({}, commonOptions, {
      defaultHour: 10,
      onChange: function (sel) {
        // Auto-suggest end-time = start + 8h, if user hasn't picked one yet.
        if (sel[0] && endInput && !endInput.value) {
          var endDefault = new Date(sel[0].getTime() + 8 * 60 * 60 * 1000);
          if (endInput._flatpickr) {
            endInput._flatpickr.set('minDate', sel[0]);
            endInput._flatpickr.setDate(endDefault, true);
          }
        } else if (sel[0] && endInput && endInput._flatpickr) {
          endInput._flatpickr.set('minDate', sel[0]);
        }
      }
    }));
  }

  if (endInput) {
    flatpickr(endInput, Object.assign({}, commonOptions, {
      defaultHour: 18
    }));
  }
})();
