// NOMAAD Camp — shared site scripts
(function () {
  'use strict';

  // Future-ready config: add pricing when realtime estimation is ready
  var PACKAGE_CONFIG = {
    camps: {
      'camp-a':      { name: 'A Кемп',         isMobile: false },
      'camp-b':      { name: 'B Кемп',         isMobile: false },
      'camp-c':      { name: 'C Кемп',         isMobile: false },
      'camp-mobile': { name: 'Нүүдлийн кемп',  isMobile: true  }
    },
    tiers: {
      'Essential':   { hasAddon: false },
      'Experience':  { hasAddon: true  },
      'Production':  { hasAddon: false }
    },
    addons: {
      'LED Screen':     { price: null },
      'Moonbeam Lounge':{ price: null },
      'Тайзны эффект':  { price: null },
      'Shuttle Service':{
        price: 1000000,
        description: '45 хүний автобус · УБ ↔ Кемп / 2 талдаа'
      }
    }
  };

  var PLACEHOLDER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 9'%3E%3Crect width='16' height='9' fill='%23EAE3D5'/%3E%3C/svg%3E";

  // ── HERO SLIDER ──────────────────────────────────────────────
  // Loads images from NOMAAD_IMAGES.hero, crossfades every 5 s
  function initHeroSlider(images) {
    var container = document.getElementById('hero-slides');
    if (!container || !images || images.length === 0) return;

    images.forEach(function (src, i) {
      var div = document.createElement('div');
      div.className = 'hero-slide' + (i === 0 ? ' is-active' : '');
      div.style.backgroundImage = 'url("' + src + '")';
      container.appendChild(div);
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

  // Carousel
  document.querySelectorAll('[data-carousel]').forEach((root) => {
    const track = root.querySelector('.carousel-track');
    const slides = root.querySelectorAll('.carousel-slide');
    const dotsWrap = root.querySelector('.carousel-dots');
    const prevBtn = root.querySelector('.carousel-arrow--prev');
    const nextBtn = root.querySelector('.carousel-arrow--next');
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
      var targetDetail = null;
      campCards.forEach(function (card) {
        card.classList.toggle('is-active', card.dataset.campTarget === targetId);
      });
      campDetails.forEach(function (detail) {
        var isTarget = detail.id === targetId;
        detail.classList.toggle('is-open', isTarget);
        if (isTarget) targetDetail = detail;
      });
      if (targetDetail) {
        window.setTimeout(function () {
          targetDetail.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 120);
      }
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

  // Үнийн санал modal маягт
  const quoteModal = document.getElementById('quote-modal');
  const quoteForm = document.getElementById('quote-form');
  const quoteMessage = document.getElementById('quote-form-message');
  const quoteOpeners = document.querySelectorAll('[data-quote-open="true"]');
  if (quoteModal && quoteForm && quoteMessage && quoteOpeners.length > 0) {
    const closeTargets = quoteModal.querySelectorAll('[data-quote-close]');
    const firstInput = quoteForm.querySelector('input, textarea');

    const prefillBox     = document.getElementById('quote-prefill');
    const prefillCampRow = document.getElementById('prefill-row-camp');
    const prefillTierRow = document.getElementById('prefill-row-tier');
    const prefillFeatRow = document.getElementById('prefill-row-feature');
    const prefillShuttleRow = document.getElementById('prefill-row-shuttle');
    const prefillCampVal = document.getElementById('prefill-camp-val');
    const prefillTierVal = document.getElementById('prefill-tier-val');
    const prefillFeatVal = document.getElementById('prefill-feature-val');
    const prefillShuttleVal = document.getElementById('prefill-shuttle-val');
    const fieldCampName  = document.getElementById('field-camp-name');
    const fieldTier      = document.getElementById('field-package-tier');
    const fieldFeature   = document.getElementById('field-visual-feature');
    const locationWrap   = document.getElementById('location-field-wrap');
    const locationInput  = document.getElementById('location');
    const shuttleServiceSelect = document.getElementById('shuttle-service');

    const applyLocationVisibility = (camp) => {
      var normalizedCamp = (camp || '').trim();
      var isMobile = normalizedCamp === 'Нүүдлийн кемп';
      if (locationWrap) {
        locationWrap.hidden = !isMobile;
        locationWrap.style.display = isMobile ? '' : 'none';
      }
      if (locationInput) {
        locationInput.required = isMobile;
        if (!isMobile) locationInput.value = '';
      }
    };

    const collectSelectedAddons = (groupName) => {
      if (!groupName) return [];
      return Array.from(document.querySelectorAll('input[name="' + groupName + '"]:checked'))
        .map((input) => input.value)
        .filter(Boolean);
    };

    const openQuoteModal = (prefill) => {
      quoteModal.classList.add('is-open');
      quoteModal.setAttribute('aria-hidden', 'false');
      document.body.classList.add('modal-open');
      var camp = (prefill && prefill.camp) || '';

      if (prefillBox) {
        var tier    = (prefill && prefill.tier)    || '';
        var feature = (prefill && prefill.feature) || '';
        var addOns  = (prefill && prefill.addOns)  || [];
        var shuttleService = (prefill && prefill.shuttleService) || 'Сонгохгүй';

        if (fieldCampName) fieldCampName.value = camp;
        if (fieldTier)     fieldTier.value     = tier;
        if (fieldFeature)  fieldFeature.value  = feature;
        if (shuttleServiceSelect) shuttleServiceSelect.value = shuttleService;

        var hasPrefill = !!(camp || tier || feature || shuttleService !== 'Сонгохгүй');
        if (prefillBox)     prefillBox.hidden     = !hasPrefill;
        if (prefillCampRow) { prefillCampRow.hidden = !camp;    if (prefillCampVal) prefillCampVal.textContent = camp; }
        if (prefillTierRow) { prefillTierRow.hidden = !tier;    if (prefillTierVal) prefillTierVal.textContent = tier; }
        if (prefillFeatRow) { prefillFeatRow.hidden = !feature; if (prefillFeatVal) prefillFeatVal.textContent = feature; }
        if (prefillShuttleRow) {
          var showShuttle = shuttleService && shuttleService !== 'Сонгохгүй';
          prefillShuttleRow.hidden = !showShuttle;
          if (prefillShuttleVal) prefillShuttleVal.textContent = shuttleService;
        }

        if (addOns.indexOf('Shuttle Service') !== -1 && shuttleServiceSelect && shuttleServiceSelect.value === 'Сонгохгүй') {
          shuttleServiceSelect.value = 'Өдрөөр / 2 талдаа — 1,000,000₮';
          if (prefillShuttleRow) prefillShuttleRow.hidden = false;
          if (prefillShuttleVal) prefillShuttleVal.textContent = shuttleServiceSelect.value;
        }
      }
      applyLocationVisibility(camp);

      window.setTimeout(() => {
        if (firstInput) firstInput.focus();
      }, 20);
    };

    const closeQuoteModal = () => {
      quoteModal.classList.remove('is-open');
      quoteModal.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('modal-open');
      if (prefillBox)    prefillBox.hidden = true;
      if (fieldCampName) fieldCampName.value = '';
      if (fieldTier)     fieldTier.value     = '';
      if (fieldFeature)  fieldFeature.value  = '';
      if (shuttleServiceSelect) shuttleServiceSelect.value = 'Сонгохгүй';
      applyLocationVisibility('');
    };

    quoteOpeners.forEach((link) => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        var campName    = (link.dataset.campName    || '').trim();
        var tier        = (link.dataset.tier        || '').trim();
        var visualGroup = (link.dataset.visualGroup || '').trim();
        var addonGroup  = (link.dataset.addonGroup  || '').trim();
        var feature     = '';
        if (visualGroup) {
          var checked = document.querySelector('input[name="' + visualGroup + '"]:checked');
          feature = checked ? checked.value : '';
          if (!feature) {
            window.alert('Experience багцын нэмэлт үйлчилгээний 1 сонголт хийнэ үү.');
            return;
          }
        }
        var addOns = collectSelectedAddons(addonGroup);
        var shuttlePrefill = addOns.indexOf('Shuttle Service') !== -1 ? 'Өдрөөр / 2 талдаа — 1,000,000₮' : 'Сонгохгүй';
        openQuoteModal(campName || tier ? { camp: campName, tier: tier, feature: feature, addOns: addOns, shuttleService: shuttlePrefill } : null);
      });
    });

    if (shuttleServiceSelect) {
      shuttleServiceSelect.addEventListener('change', () => {
        var shuttleValue = shuttleServiceSelect.value || 'Сонгохгүй';
        if (prefillShuttleRow) prefillShuttleRow.hidden = shuttleValue === 'Сонгохгүй';
        if (prefillShuttleVal) prefillShuttleVal.textContent = shuttleValue;
      });
    }

    closeTargets.forEach((el) => {
      el.addEventListener('click', () => closeQuoteModal());
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && quoteModal.classList.contains('is-open')) {
        closeQuoteModal();
      }
    });

    const N8N_WEBHOOK_URL = 'https://chimun.app.n8n.cloud/webhook/nomaad-quote';

    quoteForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const submitBtn = quoteForm.querySelector('[type="submit"]');
      const fd = new FormData(quoteForm);
      const phone = (fd.get('phone') || '').trim();
      const email = (fd.get('email') || '').trim();

      quoteMessage.className = 'quote-form__message';
      quoteMessage.textContent = '';

      if (phone && !/^[\d\s+\-() ]{6,20}$/.test(phone)) {
        quoteMessage.textContent = 'Утасны дугаар буруу байна.';
        quoteMessage.className = 'quote-form__message quote-form__message--error';
        return;
      }
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        quoteMessage.textContent = 'Имэйл хаяг буруу байна.';
        quoteMessage.className = 'quote-form__message quote-form__message--error';
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = 'Илгээж байна…';

      const payload = {
        camp:           (fd.get('camp_name')     || '').trim(),
        tier:           (fd.get('package_tier')  || '').trim(),
        visual_feature: (fd.get('visual_feature')|| '').trim(),
        shuttle_service:(fd.get('shuttle_service') || '').trim(),
        location:       ((fd.get('camp_name') || '').trim() === 'Нүүдлийн кемп') ? (fd.get('location') || '').trim() : '',
        notes:          (fd.get('extra_info')    || '').trim(),
        company:        (fd.get('organization')  || '').trim(),
        contact_name:   (fd.get('contact_name')  || '').trim(),
        phone,
        email,
        start_datetime: (fd.get('start_datetime')|| '').trim(),
        end_datetime:   (fd.get('end_datetime')  || '').trim(),
        event_date:     (fd.get('start_datetime')|| '').trim(),
        guest_count:    (fd.get('guest_count')   || '').trim(),
        event_type:     (fd.get('event_type')    || '').trim(),
        camp_name:      (fd.get('camp_name')     || '').trim(),
        package_tier:   (fd.get('package_tier')  || '').trim(),
        shuttle_service_label: (fd.get('shuttle_service') || '').trim(),
        source:         'nomaadcamp.com'
      };

      try {
        const res = await fetch(N8N_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        quoteMessage.textContent = 'Хүсэлт амжилттай илгээгдлээ';
        quoteMessage.className = 'quote-form__message quote-form__message--success';
        quoteForm.reset();
        window.setTimeout(() => closeQuoteModal(), 2400);
      } catch (_) {
        quoteMessage.textContent = 'Алдаа гарлаа. Дахин оролдоно уу.';
        quoteMessage.className = 'quote-form__message quote-form__message--error';
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Урьдчилсан санал авах';
      }
    });
  }
})();
