// NOMAAD Camp, Mapbox map with satellite view + driving directions overlay.
// Shows the actual paved route from Ulaanbaatar plus the dirt-road final leg
// imported from the team's Google My Map export.
//
// Mapbox GL JS (~700KB) and its CSS are loaded LAZILY, only when the user
// scrolls near the #nomaad-map container. This keeps initial mobile load fast.
(function () {
  'use strict';
  var container = document.getElementById('nomaad-map');
  if (!container) return;

  var TOKEN  = 'pk.eyJ1Ijoibm9tYWFkY2FtcCIsImEiOiJjbW9weGk4M2ExZGN5MnBxeXhhazg4ZW9rIn0.eiNhSnD2NiSTQQiUuz5kAg';
  var MAP_VERSION = '3.7.0';
  var loaded = false;

  function loadStylesheet(href) {
    return new Promise(function (resolve, reject) {
      var link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      link.onload = resolve;
      link.onerror = reject;
      document.head.appendChild(link);
    });
  }

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = src;
      s.async = true;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  function ensureMapboxLoaded() {
    if (loaded) return Promise.resolve();
    loaded = true;
    return Promise.all([
      loadStylesheet('https://api.mapbox.com/mapbox-gl-js/v' + MAP_VERSION + '/mapbox-gl.css'),
      loadScript('https://api.mapbox.com/mapbox-gl-js/v' + MAP_VERSION + '/mapbox-gl.js')
    ]);
  }

  function startWhenVisible() {
    if (!('IntersectionObserver' in window)) {
      ensureMapboxLoaded().then(initMap);
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          io.disconnect();
          ensureMapboxLoaded().then(initMap);
        }
      });
    }, { rootMargin: '300px' });
    io.observe(container);
  }

  function initMap() {
    if (typeof mapboxgl === 'undefined') return;
    mapboxgl.accessToken = TOKEN;

  var CAMPS = [
    { id: 'a', name: 'NOMAAD Summit', size: '100–1000 хүн', coords: [107.659422, 47.727926], color: '#B14F1F' },
    { id: 'b', name: 'NOMAAD Meadow', size: '50–300 хүн',   coords: [107.664493, 47.730607], color: '#C8A878' },
    { id: 'c', name: 'NOMAAD Grove',  size: '20–200 хүн',   coords: [107.419076, 47.643347], color: '#4A5E3E' }
  ];

  var center = [107.657680, 47.727278];

  var map = new mapboxgl.Map({
    container: 'nomaad-map',
    style: 'mapbox://styles/mapbox/satellite-streets-v12',
    center: center,
    zoom: 13.5,
    minZoom: 7,
    maxZoom: 18,
    cooperativeGestures: true,
    attributionControl: true
  });

  map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');
  map.addControl(new mapboxgl.FullscreenControl(), 'top-right');

  // Fit bounds button, shows the whole UB → camp picture.
  var fitBtn = document.createElement('button');
  fitBtn.type = 'button';
  fitBtn.className = 'mapboxgl-ctrl-icon nomaad-fit-btn';
  fitBtn.setAttribute('aria-label', 'Бүх замыг харах');
  fitBtn.textContent = '⤢';
  fitBtn.style.cssText = 'background:#fff;border:none;width:30px;height:30px;border-radius:4px;font-size:18px;line-height:1;cursor:pointer;box-shadow:0 0 0 2px rgba(0,0,0,0.1);margin-top:6px;';

  function loadRoute() {
    fetch('/route.geo.json')
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (geo) {
        if (!geo || !geo.features) return;

        // Бүх асфальт зам (directions) болон шороон замыг олно — нэгээс олон байж болно.
        var mainFeatures = geo.features.filter(function (f) {
          return f.properties && /directions/i.test(f.properties.name || '') && f.geometry.type === 'LineString';
        });
        var dirtFeatures = geo.features.filter(function (f) {
          return f.properties && /шороон/i.test(f.properties.name || '') && f.geometry.type === 'LineString';
        });

        // Зам бүрийг чиглэлээр нь өнгөөр ялгана:
        //   Эрдэнэ (Summit/Meadow) → цайвар цагаан
        //   Grove (Сэргэлэн)        → ногоон
        function isGrove(feat) {
          return (feat.properties && feat.properties.route === 'grove')
            || /grove/i.test((feat.properties && feat.properties.name) || '');
        }

        mainFeatures.forEach(function (feat, i) {
          var src = 'nomaad-main-road-' + i;
          var grove = isGrove(feat);
          map.addSource(src, { type: 'geojson', data: feat });
          map.addLayer({
            id: src + '-casing', type: 'line', source: src,
            layout: { 'line-cap': 'round', 'line-join': 'round' },
            paint: { 'line-color': '#1F2A23', 'line-width': 6 }
          });
          map.addLayer({
            id: src, type: 'line', source: src,
            layout: { 'line-cap': 'round', 'line-join': 'round' },
            paint: { 'line-color': grove ? '#9CC97B' : '#F2F1EC', 'line-width': 3 }
          });
        });

        dirtFeatures.forEach(function (feat, i) {
          var src = 'nomaad-dirt-road-' + i;
          var grove = isGrove(feat);
          map.addSource(src, { type: 'geojson', data: feat });
          map.addLayer({
            id: src + '-casing', type: 'line', source: src,
            layout: { 'line-cap': 'round', 'line-join': 'round' },
            paint: { 'line-color': '#1F2A23', 'line-width': 7 }
          });
          map.addLayer({
            id: src, type: 'line', source: src,
            layout: { 'line-cap': 'round', 'line-join': 'round' },
            paint: { 'line-color': grove ? '#7FB069' : '#FFB347', 'line-width': 4, 'line-dasharray': [2, 1.5] }
          });
        });

        // Compute bounds covering camps + бүх зам.
        var bounds = new mapboxgl.LngLatBounds();
        CAMPS.forEach(function (c) { bounds.extend(c.coords); });
        mainFeatures.concat(dirtFeatures).forEach(function (feat) {
          feat.geometry.coordinates.forEach(function (p) { bounds.extend(p); });
        });
        // Fit-button shows whole route. Default view stays on the camp cluster.
        fitBtn.addEventListener('click', function () {
          map.fitBounds(bounds, { padding: 60, duration: 900 });
        });
      })
      .catch(function () { /* keep going without route */ });
  }

  function addMarkers() {
    CAMPS.forEach(function (c) {
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
  }

  map.on('load', function () {
    addMarkers();
    loadRoute();

    // Бүх 3 кемпийг багтаахаар анхдагч харагдацыг тааруулах
    // (Grove бусдаас зайтай тул fixed center/zoom-д багтахгүй).
    var campBounds = new mapboxgl.LngLatBounds();
    CAMPS.forEach(function (c) { campBounds.extend(c.coords); });
    map.fitBounds(campBounds, { padding: 70, maxZoom: 13, duration: 0 });

    // Inject the fit-bounds button into the navigation control group.
    var navGroup = container.querySelector('.mapboxgl-ctrl-top-right .mapboxgl-ctrl');
    if (navGroup) navGroup.appendChild(fitBtn);
  });
  } // end initMap

  startWhenVisible();
})();
