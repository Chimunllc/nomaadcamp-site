// NOMAAD Camp — Mapbox map initialisation
// Custom dark-forest style aligned with the brand palette.
(function () {
  'use strict';
  if (typeof mapboxgl === 'undefined') return;
  var container = document.getElementById('nomaad-map');
  if (!container) return;

  // Public token. Restricted to nomaadcamp.com via Mapbox dashboard.
  mapboxgl.accessToken = 'pk.eyJ1Ijoibm9tYWFkY2FtcCIsImEiOiJjbW9weGk4M2ExZGN5MnBxeXhhazg4ZW9rIn0.eiNhSnD2NiSTQQiUuz5kAg';

  // Camp pins. Coordinates are placeholder approximations within Эрдэнэ сум —
  // update each `coords` to the precise GPS of the camp once measured on site.
  var CAMPS = [
    { id: 'a',      name: 'NOMAAD Summit', size: '100–1000 хүн',  coords: [107.3329, 47.8140], color: '#B14F1F' },
    { id: 'b',      name: 'NOMAAD Meadow', size: '50–300 хүн',    coords: [107.3460, 47.8110], color: '#C8A878' },
    { id: 'c',      name: 'NOMAAD Grove',  size: '20–200 хүн',    coords: [107.3215, 47.8205], color: '#C8A878' },
    { id: 'mobile', name: 'NOMAAD Mobile', size: 'Сонгосон газарт', coords: [107.3329, 47.8050], color: '#9A9C94' }
  ];

  // Center point — average of camp coords roughly.
  var center = [107.3329, 47.8140];

  var map = new mapboxgl.Map({
    container: 'nomaad-map',
    style: 'mapbox://styles/mapbox/outdoors-v12',
    center: center,
    zoom: 12.2,
    minZoom: 8,
    maxZoom: 16,
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
