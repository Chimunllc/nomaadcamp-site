// NOMAAD Camp — Mapbox map initialisation
// Custom dark-forest style aligned with the brand palette.
(function () {
  'use strict';
  if (typeof mapboxgl === 'undefined') return;
  var container = document.getElementById('nomaad-map');
  if (!container) return;

  // Public token. Restricted to nomaadcamp.com via Mapbox dashboard.
  mapboxgl.accessToken = 'pk.eyJ1Ijoibm9tYWFkY2FtcCIsImEiOiJjbW9weGk4M2ExZGN5MnBxeXhhazg4ZW9rIn0.eiNhSnD2NiSTQQiUuz5kAg';

  // Camp pins. Mapbox uses [lng, lat] order (longitude first).
  // Mobile camp is intentionally omitted — it operates wherever the client
  // selects, so a fixed pin would be misleading.
  var CAMPS = [
    { id: 'a', name: 'NOMAAD Summit', size: '100–1000 хүн', coords: [107.659422, 47.727926], color: '#B14F1F' },
    { id: 'b', name: 'NOMAAD Meadow', size: '50–300 хүн',   coords: [107.664493, 47.730607], color: '#C8A878' },
    { id: 'c', name: 'NOMAAD Grove',  size: '20–200 хүн',   coords: [107.649126, 47.723300], color: '#4A5E3E' }
  ];

  // Center point — geometric mean of camp coordinates.
  var center = [107.657680, 47.727278];

  var map = new mapboxgl.Map({
    container: 'nomaad-map',
    style: 'mapbox://styles/mapbox/outdoors-v12',
    center: center,
    zoom: 14,
    minZoom: 8,
    maxZoom: 17,
    cooperativeGestures: true,
    attributionControl: true
  });

  map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');
  map.addControl(new mapboxgl.FullscreenControl(), 'top-right');

  map.on('load', function () {
    CAMPS.forEach(function (c) {
      // Custom marker DOM element
      var el = document.createElement('div');
      el.className = 'nomaad-marker';
      el.setAttribute('aria-label', c.name);
      var dot = document.createElement('span');
      dot.className = 'nomaad-marker__dot';
      dot.style.background = c.color;
      var ring = document.createElement('span');
      ring.className = 'nomaad-marker__ring';
      ring.style.borderColor = c.color;
      el.appendChild(ring);
      el.appendChild(dot);

      var popup = new mapboxgl.Popup({ offset: 22, closeButton: false, className: 'nomaad-popup' })
        .setHTML(
          '<div class="nomaad-popup__name">' + c.name + '</div>' +
          '<div class="nomaad-popup__meta">' + c.size + '</div>'
        );

      new mapboxgl.Marker({ element: el, anchor: 'center' })
        .setLngLat(c.coords)
        .setPopup(popup)
        .addTo(map);
    });
  });
})();
