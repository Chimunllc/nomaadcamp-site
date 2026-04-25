// NOMAAD Camp — shared site scripts
(function () {
  'use strict';

  var PLACEHOLDER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 9'%3E%3Crect width='16' height='9' fill='%23EAE3D5'/%3E%3C/svg%3E";

  // ── HERO SLIDER ──────────────────────────────────────────────
  // Loads images from NOMAAD_IMAGES.hero, crossfades every 5 s
  function initHeroSlider(images) {
    var container = document.getElementById('hero-slides');
    if (!container || !images || images.length === 0) return;

    images.forEach(function (src, i) {
      var img = document.createElement('img');
      img.src = src;
      img.alt = 'NOMAAD кемпийн орчин';
      img.className = 'hero-slide' + (i === 0 ? ' is-active' : '');
      img.setAttribute('fetchpriority', i === 0 ? 'high' : 'low');
      img.decoding = 'async';
      container.appendChild(img);
    });

    var slides = container.querySelectorAll('.hero-slide');
    var current = 0;
    setInterval(function () {
      slides[current].classList.remove('is-active');
      current = (current + 1) % slides.length;
      slides[current].classList.add('is-active');
    }, 5000);
  }

  // ── GALLERY ──────────────────────────────────────────────────
  // Renders gallery cards from NOMAAD_IMAGES.gallery into #gallery-grid
  // Applies wide/tall pattern to first 6 images; rest are uniform
  function initGallery(images) {
    var grid = document.getElementById('gallery-grid');
    if (!grid || !images || images.length === 0) return;

    // Layout classes applied by position within each group of 6
    var pattern = ['gallery-card gallery-card--wide', 'gallery-card', 'gallery-card',
                   'gallery-card gallery-card--tall', 'gallery-card', 'gallery-card gallery-card--wide'];

    images.forEach(function (src, i) {
      var cls = i < pattern.length ? pattern[i] : 'gallery-card';
      var figure = document.createElement('figure');
      figure.className = cls;

      var img = document.createElement('img');
      img.src = PLACEHOLDER;
      img.setAttribute('data-src', src);
      img.alt = 'NOMAAD кемп';
      img.loading = 'lazy';
      img.decoding = 'async';
      img.className = 'defer-img';

      figure.appendChild(img);
      grid.appendChild(figure);
    });
  }

  // ── CAMP CAROUSELS ───────────────────────────────────────────
  // Populates camp card thumbnails and carousel tracks from NOMAAD_IMAGES.camps
  function initCampCarousels(camps) {
    if (!camps) return;

    var altText = { a: 'A кемп', b: 'B кемп', c: 'C кемп', mobile: 'Нүүдлийн кемп' };

    // Set thumbnail on each camp selector card
    document.querySelectorAll('[data-camp-thumb]').forEach(function (img) {
      var key = img.getAttribute('data-camp-thumb');
      var list = camps[key];
      if (list && list.length > 0) img.setAttribute('data-src', list[0]);
    });

    // Populate each camp's carousel track
    document.querySelectorAll('[data-camp]').forEach(function (root) {
      var key = root.getAttribute('data-camp');
      var list = camps[key];
      var track = root.querySelector('.carousel-track');
      if (!track || !list || list.length === 0) return;

      track.innerHTML = '';
      list.forEach(function (src, i) {
        var img = document.createElement('img');
        img.className = 'carousel-slide defer-img';
        img.src = PLACEHOLDER;
        img.setAttribute('data-src', src);
        img.alt = (altText[key] || 'кемп') + ' - зураг ' + (i + 1);
        img.loading = 'lazy';
        img.decoding = 'async';
        track.appendChild(img);
      });
    });
  }

  // ── INIT FROM MANIFEST ───────────────────────────────────────
  // Must run before deferred-img observer and carousel init
  var manifest = window.NOMAAD_IMAGES || {};
  initHeroSlider(manifest.hero);
  initGallery(manifest.gallery);
  initCampCarousels(manifest.camps);

  // ── MOBILE NAV TOGGLE ────────────────────────────────────────
  var nav = document.querySelector('.nav');
  var navToggle = document.querySelector('.nav-toggle');
  var navMenu = nav ? nav.querySelector('.nav-links') : null;
  if (nav && navToggle) {
    var setMenuOpen = function (isOpen) {
      nav.classList.toggle('is-open', isOpen);
      navToggle.setAttribute('aria-expanded', String(isOpen));
      document.body.classList.toggle('menu-open', isOpen);
    };

    navToggle.addEventListener('click', function () {
      setMenuOpen(!nav.classList.contains('is-open'));
    });
    document.addEventListener('click', function (e) {
      if (!nav.classList.contains('is-open')) return;
      if (!nav.contains(e.target)) setMenuOpen(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('is-open')) {
        setMenuOpen(false);
        navToggle.focus();
      }
    });
    document.querySelectorAll('.nav-links a').forEach(function (a) {
      a.addEventListener('click', function () { setMenuOpen(false); });
    });
    if (navMenu && !navMenu.id) navMenu.id = 'primary-nav';
  }

  // ── STICKY NAV ───────────────────────────────────────────────
  if (nav) {
    var onScroll = function () {
      nav.classList.toggle('is-scrolled', window.scrollY > 12);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  // ── ACTIVE NAV LINK ──────────────────────────────────────────
  var path = window.location.pathname.replace(/\/$/, '') || '/';
  document.querySelectorAll('.nav-links a').forEach(function (a) {
    var href = a.getAttribute('href');
    if (!href) return;
    var target = href.replace(/\/$/, '') || '/';
    if (target === path || (target === '/' && (path === '' || path === '/index.html'))) {
      a.classList.add('active');
    }
  });

  // ── SCROLL REVEAL ────────────────────────────────────────────
  if ('IntersectionObserver' in window) {
    var revealObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('is-visible');
          revealObs.unobserve(e.target);
        }
      });
    }, { threshold: 0.12 });
    document.querySelectorAll('.reveal').forEach(function (el) { revealObs.observe(el); });
  } else {
    document.querySelectorAll('.reveal').forEach(function (el) { el.classList.add('is-visible'); });
  }

  // ── DEFERRED IMAGE LOADING ───────────────────────────────────
  // Runs after manifest init so dynamically-created defer-img elements are included
  var deferredImages = document.querySelectorAll('img.defer-img[data-src]');
  var loadImage = function (img) {
    var src = img.getAttribute('data-src');
    if (!src) return;
    img.src = src;
    img.removeAttribute('data-src');
  };
  if ('IntersectionObserver' in window) {
    var imgObs = new IntersectionObserver(function (entries, observer) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        loadImage(entry.target);
        observer.unobserve(entry.target);
      });
    }, { rootMargin: '220px 0px' });
    deferredImages.forEach(function (img) { imgObs.observe(img); });
  } else {
    deferredImages.forEach(loadImage);
  }

  // ── CAROUSEL ─────────────────────────────────────────────────
  // Runs after camp carousels are populated so slides exist
  document.querySelectorAll('[data-carousel]').forEach(function (root) {
    var track = root.querySelector('.carousel-track');
    var slides = root.querySelectorAll('.carousel-slide');
    var dotsWrap = root.querySelector('.carousel-dots');
    var prevBtn = root.querySelector('.carousel-arrow--prev');
    var nextBtn = root.querySelector('.carousel-arrow--next');
    if (!track || slides.length === 0) return;

    var total = slides.length;
    var autoplay = root.dataset.autoplay === 'true';
    var interval = parseInt(root.dataset.interval, 10) || 4000;
    var index = 0;
    var timer = null;
    var isHover = false;

    if (dotsWrap) {
      for (var i = 0; i < total; i++) {
        (function (idx) {
          var d = document.createElement('button');
          d.type = 'button';
          d.className = 'carousel-dot';
          d.setAttribute('aria-label', 'Зураг ' + (idx + 1));
          d.addEventListener('click', function () { go(idx, true); });
          dotsWrap.appendChild(d);
        })(i);
      }
    }
    var dots = dotsWrap ? dotsWrap.querySelectorAll('.carousel-dot') : [];

    function render() {
      track.style.transform = 'translateX(-' + (index * 100) + '%)';
      dots.forEach(function (d, i) { d.classList.toggle('is-active', i === index); });
    }
    function go(n, userAction) {
      index = (n + total) % total;
      render();
      if (userAction && autoplay) restart();
    }
    function next() { go(index + 1); }
    function prev() { go(index - 1); }
    function start() {
      if (!autoplay || timer) return;
      timer = setInterval(function () { if (!isHover) next(); }, interval);
    }
    function stop() { if (timer) { clearInterval(timer); timer = null; } }
    function restart() { stop(); start(); }

    if (prevBtn) prevBtn.addEventListener('click', function () { go(index - 1, true); });
    if (nextBtn) nextBtn.addEventListener('click', function () { go(index + 1, true); });

    root.addEventListener('mouseenter', function () { isHover = true; });
    root.addEventListener('mouseleave', function () { isHover = false; });

    var touchX = null;
    var touchY = null;
    root.addEventListener('touchstart', function (e) {
      touchX = e.touches[0].clientX;
      touchY = e.touches[0].clientY;
    }, { passive: true });
    root.addEventListener('touchend', function (e) {
      if (touchX === null) return;
      var dx = e.changedTouches[0].clientX - touchX;
      var dy = e.changedTouches[0].clientY - touchY;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
        if (dx < 0) go(index + 1, true); else go(index - 1, true);
      }
      touchX = null; touchY = null;
    }, { passive: true });

    render();
    start();
  });

  // ── CAMP DETAIL TOGGLE ───────────────────────────────────────
  var campCards = document.querySelectorAll('[data-camp-target]');
  if (campCards.length > 0) {
    var campDetails = document.querySelectorAll('.camp-detail');
    var showCampDetail = function (targetId) {
      campCards.forEach(function (card) {
        card.classList.toggle('is-active', card.dataset.campTarget === targetId);
      });
      campDetails.forEach(function (detail) {
        detail.classList.toggle('is-open', detail.id === targetId);
      });
    };
    campCards.forEach(function (card) {
      card.addEventListener('click', function () { showCampDetail(card.dataset.campTarget); });
    });
  }

  // ── CONTACT FORM (AJAX Netlify) ───────────────────────────────
  var form = document.querySelector('form[data-netlify="true"]');
  var feedback = document.querySelector('.form-feedback');
  if (form && feedback) {
    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      feedback.className = 'form-feedback';
      feedback.textContent = '';
      var submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.disabled = true;
      try {
        var data = new URLSearchParams(new FormData(form)).toString();
        var res = await fetch('/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: data,
        });
        if (res.ok) {
          feedback.classList.add('is-success');
          feedback.textContent = 'Таны хүсэлтийг хүлээн авлаа. 24 цагийн дотор үнийн санал илгээх болно.';
          form.reset();
        } else {
          throw new Error('сүлжээний алдаа');
        }
      } catch (err) {
        feedback.classList.add('is-error');
        feedback.textContent = 'Илгээхэд алдаа гарлаа. Утсаар холбогдоно уу: 9917-9417.';
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  }
})();
