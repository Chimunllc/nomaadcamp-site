// NOMAAD Camp — booking-availability calendar with live weather.
// Mon–Thu = өдрийн хөтөлбөр (day program). Fri–Sun = кэмп багц.
// Weather is fetched from Open-Meteo for the geometric center of the 3 camps.
(function () {
  'use strict';
  var grid = document.getElementById('nomaad-calendar');
  if (!grid) return;

  var DAYS = 14;
  var DOW_LABELS = ['Ня', 'Да', 'Мя', 'Лх', 'Пү', 'Ба', 'Бя'];
  var MONTH_LABELS = ['1-р сар', '2-р сар', '3-р сар', '4-р сар', '5-р сар', '6-р сар', '7-р сар', '8-р сар', '9-р сар', '10-р сар', '11-р сар', '12-р сар'];
  var LAT = 47.7273;
  var LNG = 107.6577;

  // WMO weather code → emoji + Mongolian short label.
  // Reference: https://open-meteo.com/en/docs (WMO Weather interpretation codes)
  function wmoToIconLabel(code) {
    if (code === 0) return { icon: '☀️', label: 'Цэлмэг' };
    if (code === 1 || code === 2) return { icon: '🌤️', label: 'Бага үүлтэй' };
    if (code === 3) return { icon: '☁️', label: 'Үүлтэй' };
    if (code === 45 || code === 48) return { icon: '🌫️', label: 'Манантай' };
    if (code >= 51 && code <= 57) return { icon: '🌦️', label: 'Шиврээ' };
    if (code >= 61 && code <= 67) return { icon: '🌧️', label: 'Бороо' };
    if (code >= 71 && code <= 77) return { icon: '❄️', label: 'Цас' };
    if (code >= 80 && code <= 82) return { icon: '🌧️', label: 'Аадар' };
    if (code >= 85 && code <= 86) return { icon: '🌨️', label: 'Цасан шуурга' };
    if (code === 95) return { icon: '⛈️', label: 'Аянга' };
    if (code === 96 || code === 99) return { icon: '⛈️', label: 'Аянга мөндөр' };
    return { icon: '⛅', label: '' };
  }

  // dow: 0=Sun, 1=Mon ... 6=Sat
  // Mon (1) .. Thu (4) → day-program. Fri (5) .. Sun (0,6) → camp.
  function classify(dow) {
    if (dow >= 1 && dow <= 4) return 'day';
    return 'camp';
  }

  function formatDate(d) {
    return d.getDate() + ' · ' + MONTH_LABELS[d.getMonth()];
  }

  function buildSkeleton() {
    grid.innerHTML = '';
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    for (var i = 0; i < DAYS; i++) {
      var d = new Date(today);
      d.setDate(today.getDate() + i);
      var dow = d.getDay();
      var kind = classify(dow);
      var iso = d.toISOString().slice(0, 10);

      var cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'cal-cell cal-cell--' + kind;
      cell.setAttribute('data-date', iso);
      cell.setAttribute('data-kind', kind);
      cell.setAttribute('aria-label', formatDate(d) + ' — ' + (kind === 'day' ? 'Өдрийн хөтөлбөр' : 'Кэмп багц'));

      cell.innerHTML =
        '<span class="cal-cell__dow">' + DOW_LABELS[dow] + '</span>' +
        '<span class="cal-cell__date">' + d.getDate() + '</span>' +
        '<span class="cal-cell__weather" data-weather>' +
        '  <span class="cal-cell__icon" data-icon>·</span>' +
        '  <span class="cal-cell__temp" data-temp>—</span>' +
        '</span>';

      grid.appendChild(cell);
    }
  }

  function fetchWeather() {
    var url = 'https://api.open-meteo.com/v1/forecast' +
      '?latitude=' + LAT +
      '&longitude=' + LNG +
      '&daily=weather_code,temperature_2m_max,temperature_2m_min' +
      '&timezone=Asia%2FUlaanbaatar' +
      '&forecast_days=' + DAYS;

    fetch(url, { method: 'GET' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        if (!data || !data.daily || !data.daily.time) return;
        var t = data.daily;
        for (var i = 0; i < t.time.length; i++) {
          var iso = t.time[i];
          var cell = grid.querySelector('[data-date="' + iso + '"]');
          if (!cell) continue;
          var info = wmoToIconLabel(t.weather_code[i]);
          var tMax = Math.round(t.temperature_2m_max[i]);
          var tMin = Math.round(t.temperature_2m_min[i]);
          cell.querySelector('[data-icon]').textContent = info.icon;
          cell.querySelector('[data-temp]').textContent = '+' + tMax + '°/' + tMin + '°';
          cell.setAttribute('title', info.label + ' · өндөр +' + tMax + '°, доод ' + tMin + '°');
        }
      })
      .catch(function () { /* ignore — keep placeholder */ });
  }

  // Click → prefill quote modal with chosen date and tier guess.
  grid.addEventListener('click', function (ev) {
    var cell = ev.target.closest && ev.target.closest('.cal-cell');
    if (!cell) return;
    var iso = cell.getAttribute('data-date');
    var kind = cell.getAttribute('data-kind');

    var modal = document.getElementById('quote-modal');
    if (!modal) return;

    var startInput = document.getElementById('start-datetime');
    var endInput   = document.getElementById('end-datetime');
    if (startInput) {
      startInput.value = iso + 'T10:00';
      startInput.dispatchEvent(new Event('change', { bubbles: true }));
    }
    if (endInput) {
      endInput.value = iso + (kind === 'day' ? 'T18:00' : 'T12:00');
      endInput.dispatchEvent(new Event('change', { bubbles: true }));
    }

    // Open the modal via the existing trigger pathway.
    var fakeOpener = document.createElement('a');
    fakeOpener.setAttribute('href', '#quote-modal');
    fakeOpener.setAttribute('data-quote-open', 'true');
    fakeOpener.setAttribute('data-quote-mode', kind === 'day' ? 'day-program' : 'camp');
    fakeOpener.setAttribute('data-camp-name', kind === 'day' ? 'Хагас өдрийн хөтөлбөр' : 'NOMAAD Summit');
    fakeOpener.setAttribute('data-tier', kind === 'day' ? 'Хагас өдрийн' : 'Үндсэн');
    fakeOpener.style.display = 'none';
    document.body.appendChild(fakeOpener);
    fakeOpener.click();
    setTimeout(function () { fakeOpener.remove(); }, 200);
  });

  buildSkeleton();
  fetchWeather();
})();
