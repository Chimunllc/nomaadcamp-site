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
      'Тайзны эффект':  { price: null }
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
  // Sets camp card thumbnails and populates carousel tracks from manifest.camps
  function initCampCarousels(camps) {
    if (!camps) return;
    var altText = { a: 'A кемп', b: 'B кемп', c: 'C кемп', mobile: 'Нүүдлийн кемп' };

    // Set thumbnail on each camp selector card using cover image from manifest
    document.querySelectorAll('[data-camp-thumb]').forEach(function (img) {
      var key = img.getAttribute('data-camp-thumb');
      var campData = camps[key];
      var cover = campData && campData.cover;
      if (!cover) return;
      img.setAttribute('data-src', cover);
      img.addEventListener('error', function () {
        img.src = PLACEHOLDER;
      }, { once: true });
    });

    // Populate each camp's carousel track (for [data-camp] elements)
    document.querySelectorAll('[data-camp]').forEach(function (root) {
      var key = root.getAttribute('data-camp');
      var campData = camps[key];
      var list = campData ? campData.gallery : [];
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
        img.addEventListener('error', function () {
          img.remove();
        }, { once: true });
        track.appendChild(img);
      });
    });
  }

  // ── CAMP DETAIL GALLERIES ────────────────────────────────────
  // Populates the horizontal scroll gallery shown when "Багц үзэх" is clicked.
  // Reads all images from manifest.camps[key].gallery — supports unlimited images.
  // Shows placeholder state if gallery is empty.
  function initCampDetailGalleries(camps) {
    if (!camps) return;
    var campAltText = { a: 'A кемп', b: 'B кемп', c: 'C кемп', mobile: 'Нүүдлийн кемп' };

    document.querySelectorAll('[data-camp-gallery]').forEach(function (gallery) {
      var key = gallery.getAttribute('data-camp-gallery');
      var campData = camps[key] || {};
      var images = campData.gallery || [];
      var track = gallery.querySelector('.camp-gallery__track');
      var emptyState = gallery.querySelector('.camp-gallery__empty');
      var viewport = gallery.querySelector('.camp-gallery__viewport');
      var featured = gallery.querySelector('.camp-gallery__featured');
      var featuredImg = gallery.querySelector('.camp-gallery__featured-img');
      if (!track) return;

      var setEmptyState = function (isEmpty) {
        track.style.display = isEmpty ? 'none' : '';
        if (featured) featured.hidden = isEmpty;
        if (viewport) viewport.classList.toggle('is-empty', isEmpty);
        if (emptyState) emptyState.hidden = !isEmpty;
      };

      var setFeaturedImage = function (thumb, immediate) {
        if (!featuredImg || !thumb) return;
        var newSrc = thumb.getAttribute('data-src') || thumb.src;

        track.querySelectorAll('.camp-gallery__img').forEach(function (item) {
          item.classList.toggle('is-active', item === thumb);
        });

        if (immediate) {
          featuredImg.src = newSrc;
          featuredImg.setAttribute('data-src', newSrc);
          featuredImg.alt = thumb.alt || 'Кемпийн онцлох зураг';
          return;
        }

        featuredImg.style.opacity = '0';
        clearTimeout(featuredImg._fadeTimer);
        featuredImg._fadeTimer = setTimeout(function () {
          featuredImg.src = newSrc;
          featuredImg.setAttribute('data-src', newSrc);
          featuredImg.alt = thumb.alt || 'Кемпийн онцлох зураг';
          featuredImg.style.opacity = '';
        }, 480);
      };

      track.innerHTML = '';

      images.forEach(function (src, index) {
        var img = document.createElement('img');
        img.className = 'camp-gallery__img defer-img';
        img.src = PLACEHOLDER;
        img.setAttribute('data-src', src);
        img.alt = (campAltText[key] || 'Кемп') + ' - зураг ' + (index + 1);
        img.width = 160;
        img.height = 86;
        img.loading = 'lazy';
        img.decoding = 'async';
        img.tabIndex = 0;
        img.setAttribute('role', 'button');
        img.setAttribute('aria-label', 'Зураг сонгох');
        img.addEventListener('click', function () {
          setFeaturedImage(img, false);
        });
        img.addEventListener('keydown', function (event) {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            setFeaturedImage(img, false);
          }
        });
        img.addEventListener('error', function () {
          img.remove();
          if (track.children.length === 0) {
            setEmptyState(true);
          }
        }, { once: true });
        track.appendChild(img);

        if (index === 0 && featuredImg) {
          featuredImg.src = PLACEHOLDER;
          featuredImg.setAttribute('data-src', src);
          featuredImg.alt = 'Кемпийн онцлох зураг';
        }
      });

      if (track.children.length === 0) {
        setEmptyState(true);
        return;
      }

      setEmptyState(false);
      setFeaturedImage(track.querySelector('.camp-gallery__img'), true);
    });
  }

  // ── CATEGORY GALLERY ─────────────────────────────────────────
  // Renders the #gallery section from manifest.galleryCategories.
  // Tabs → featured image → thumbnail strip, all driven by manifest data.
  function initCategoryGallery(galleryCategories) {
    var container = document.getElementById('cat-gallery');
    if (!container) return;

    var categories = galleryCategories || {};
    var keys = Object.keys(categories);
    if (keys.length === 0) return;

    var tabsEl    = document.getElementById('cat-gallery-tabs');
    var featImg   = document.getElementById('cat-gallery-featured-img');
    var featWrap  = document.getElementById('cat-gallery-featured-wrap');
    var labelEl   = document.getElementById('cat-gallery-label');
    var descEl    = document.getElementById('cat-gallery-desc');
    var thumbsEl  = document.getElementById('cat-gallery-thumbs');
    if (!tabsEl || !featImg || !thumbsEl) return;
    featImg.loading = 'lazy';
    featImg.decoding = 'async';

    var activeKey   = null;
    var fadeTimer   = null;

    function setFeaturedSrc(src, alt) {
      if (fadeTimer) clearTimeout(fadeTimer);
      featImg.classList.add('is-fading');
      fadeTimer = setTimeout(function () {
        featImg.src = src || '';
        featImg.alt = alt || '';
        featImg.classList.remove('is-fading');
      }, 480);
    }

    function setActiveThumb(activeIndex) {
      var thumbBtns = thumbsEl.querySelectorAll('.cat-gallery__thumb');
      thumbBtns.forEach(function (btn, i) {
        btn.classList.toggle('is-active', i === activeIndex);
        btn.setAttribute('aria-pressed', i === activeIndex ? 'true' : 'false');
      });
    }

    function activateCategory(key) {
      if (activeKey === key) return;
      activeKey = key;

      var cat    = categories[key] || {};
      var images = cat.images || [];

      tabsEl.querySelectorAll('.cat-gallery__tab').forEach(function (tab) {
        var isActive = tab.dataset.cat === key;
        tab.classList.toggle('is-active', isActive);
        tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
      });

      if (labelEl) labelEl.textContent = cat.label || key.toUpperCase();
      if (descEl)  descEl.textContent  = cat.description || '';

      thumbsEl.innerHTML = '';

      if (images.length === 0) {
        if (featWrap) featWrap.classList.add('cat-gallery__featured-wrap--empty');
        setFeaturedSrc('', '');
        return;
      }

      if (featWrap) featWrap.classList.remove('cat-gallery__featured-wrap--empty');
      setFeaturedSrc(images[0], cat.label || key);

      images.forEach(function (src, i) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'cat-gallery__thumb' + (i === 0 ? ' is-active' : '');
        btn.setAttribute('role', 'listitem');
        btn.setAttribute('aria-label', 'Зураг ' + (i + 1));
        btn.setAttribute('aria-pressed', i === 0 ? 'true' : 'false');

        var img = document.createElement('img');
        img.src = PLACEHOLDER;
        img.setAttribute('data-src', src);
        img.alt = (cat.title || cat.label || key) + ' - зураг ' + (i + 1);
        img.width = 88;
        img.height = 60;
        img.loading = 'lazy';
        img.decoding = 'async';
        img.className = 'defer-img';
        img.addEventListener('error', function () { btn.hidden = true; }, { once: true });

        btn.appendChild(img);
        btn.addEventListener('click', function () {
          setFeaturedSrc(src, cat.label || key);
          setActiveThumb(i);
        });
        thumbsEl.appendChild(btn);
      });

      if (window._nomaadDeferObserver) {
        thumbsEl.querySelectorAll('img.defer-img[data-src]').forEach(function (img) {
          window._nomaadDeferObserver.observe(img);
        });
      }
    }

    keys.forEach(function (key) {
      var cat = categories[key] || {};
      var tab = document.createElement('button');
      tab.type = 'button';
      tab.className = 'cat-gallery__tab';
      tab.dataset.cat = key;
      tab.setAttribute('role', 'tab');
      tab.setAttribute('aria-selected', 'false');
      tab.textContent = cat.title || key;
      tab.addEventListener('click', function () { activateCategory(key); });
      tabsEl.appendChild(tab);
    });

    activateCategory(keys[0]);
  }

  // ── PARTNERS ────────────────────────────────────────────────
  // Renders partner logos from manifest.partners into #clients .trust-grid.
  function initPartners(partnerLogos) {
    var grid = document.querySelector('#clients .trust-grid');
    if (!grid) return;

    var logos = partnerLogos || [];
    if (logos.length === 0) return;

    grid.innerHTML = '';
    logos.forEach(function (src) {
      var figure = document.createElement('figure');
      figure.className = 'trust-item';

      var img = document.createElement('img');
      img.src = src;
      img.alt = src.split('/').pop().replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ') + ' лого';
      img.width = 120;
      img.height = 36;
      img.loading = 'lazy';
      img.decoding = 'async';

      figure.appendChild(img);
      grid.appendChild(figure);
    });
  }

  // ── INIT FROM MANIFEST ───────────────────────────────────────
  // Must run before deferred-img observer and carousel init
  var manifest = window.NOMAAD_IMAGES || {};
  initHeroSlider(manifest.hero);
  initGallery(manifest.gallery);
  initPartners(manifest.partners);
  initCampCarousels(manifest.camps);
  initCampDetailGalleries(manifest.camps);
  initCategoryGallery(manifest.galleryCategories);

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
    window._nomaadDeferObserver = imgObs;
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
    var resetCampState = function () {
      campCards.forEach(function (card) {
        card.classList.remove('is-active');
        card.setAttribute('aria-expanded', 'false');
        var cta = card.querySelector('[data-camp-cta]');
        if (cta) cta.textContent = 'Багц үзэх →';
      });
      campDetails.forEach(function (detail) { detail.classList.remove('is-open'); });
    };
    var showCampDetail = function (targetId) {
      var targetDetail = null;
      campCards.forEach(function (card) {
        var isTarget = card.dataset.campTarget === targetId;
        card.classList.toggle('is-active', isTarget);
        card.setAttribute('aria-expanded', isTarget ? 'true' : 'false');
        var cta = card.querySelector('[data-camp-cta]');
        if (cta) cta.textContent = isTarget ? 'Хаах ↑' : 'Багц үзэх →';
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
      card.addEventListener('click', function () {
        if (card.classList.contains('is-active')) {
          resetCampState();
          return;
        }
        showCampDetail(card.dataset.campTarget);
      });
    });
    resetCampState();
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

  // ── QUOTE MODAL ──────────────────────────────────────────────
  var quoteModal   = document.getElementById('quote-modal');
  var quoteForm    = document.getElementById('quote-form');
  var quoteMessage = document.getElementById('quote-form-message');
  var quoteOpeners = document.querySelectorAll('[data-quote-open="true"]');

  if (quoteModal && quoteForm && quoteOpeners.length > 0) {
    var closeTargets   = quoteModal.querySelectorAll('[data-quote-close]');
    var campSelect     = document.getElementById('field-camp');
    var tierSelect     = document.getElementById('field-tier');
    var orgInput       = document.getElementById('org-name');
    var contactInput   = document.getElementById('contact-name');
    var phoneInput     = document.getElementById('phone');
    var emailInput     = document.getElementById('email');
    var startInput     = document.getElementById('start-datetime');
    var endInput       = document.getElementById('end-datetime');
    var guestInput     = document.getElementById('guest-count');
    var locationWrap   = document.getElementById('location-field-wrap');
    var locationInput  = document.getElementById('location');
    var visualSelect   = document.getElementById('visual-feature-select');
    var shuttleSelect  = document.getElementById('shuttle-service');
    var contextHint    = document.getElementById('quote-context-hint');
    var estimateEl     = document.getElementById('quote-estimate');

    var errCamp     = document.getElementById('err-camp');
    var errTier     = document.getElementById('err-tier');
    var errOrg      = document.getElementById('err-org');
    var errContact  = document.getElementById('err-contact');
    var errPhone    = document.getElementById('err-phone');
    var errEmail    = document.getElementById('err-email');
    var errStart    = document.getElementById('err-start');
    var errEnd      = document.getElementById('err-end');
    var errGuests   = document.getElementById('err-guests');
    var errLocation = document.getElementById('err-location');

    function showFieldError(errEl, inputEl, msg) {
      if (!errEl) return;
      errEl.textContent = msg;
      errEl.hidden = false;
      if (inputEl) inputEl.classList.add('is-error');
    }

    function clearFieldError(errEl, inputEl) {
      if (!errEl) return;
      errEl.hidden = true;
      errEl.textContent = '';
      if (inputEl) inputEl.classList.remove('is-error');
    }

    function clearAllErrors() {
      clearFieldError(errCamp,     campSelect);
      clearFieldError(errTier,     tierSelect);
      clearFieldError(errOrg,      orgInput);
      clearFieldError(errContact,  contactInput);
      clearFieldError(errPhone,    phoneInput);
      clearFieldError(errEmail,    emailInput);
      clearFieldError(errStart,    startInput);
      clearFieldError(errEnd,      endInput);
      clearFieldError(errGuests,   guestInput);
      clearFieldError(errLocation, locationInput);
    }

    function applyLocationVisibility(camp) {
      var isMobile = (camp || '').trim() === 'Нүүдлийн кемп';
      if (locationWrap) {
        if (isMobile) {
          locationWrap.style.display = 'flex';
          requestAnimationFrame(function () {
            requestAnimationFrame(function () {
              locationWrap.classList.add('is-visible');
            });
          });
        } else {
          locationWrap.classList.remove('is-visible');
          window.setTimeout(function () {
            if (!locationWrap.classList.contains('is-visible')) {
              locationWrap.style.display = 'none';
            }
          }, 280);
        }
        locationWrap.setAttribute('aria-hidden', String(!isMobile));
      }
      if (locationInput) {
        locationInput.required = isMobile;
        if (!isMobile) locationInput.value = '';
      }
    }

    function openQuoteModal(prefill) {
      quoteModal.classList.add('is-open');
      quoteModal.setAttribute('aria-hidden', 'false');
      document.body.classList.add('modal-open');

      var camp    = (prefill && prefill.camp)    || '';
      var tier    = (prefill && prefill.tier)    || '';
      var feature = (prefill && prefill.feature) || '';
      var shuttle = (prefill && prefill.shuttle) || 'Сонгохгүй';

      if (campSelect)    campSelect.value    = camp;
      if (tierSelect)    tierSelect.value    = tier;
      if (visualSelect)  visualSelect.value  = feature;
      if (shuttleSelect) shuttleSelect.value = shuttle;

      if (contextHint) {
        if (camp && tier) {
          contextHint.textContent = 'Та ' + camp + ' · ' + tier + ' багцын үнийн санал авах гэж байна.';
          contextHint.hidden = false;
        } else {
          contextHint.hidden = true;
        }
      }

      applyLocationVisibility(camp);
      clearAllErrors();
      if (quoteMessage) { quoteMessage.textContent = ''; quoteMessage.className = 'quote-form__message'; }
      updateEstimate();

      window.setTimeout(function () {
        var firstFocus = (camp && tier) ? orgInput : campSelect;
        if (firstFocus) firstFocus.focus();
      }, 20);
    }

    function closeQuoteModal() {
      quoteModal.classList.remove('is-open');
      quoteModal.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('modal-open');
      if (contextHint) contextHint.hidden = true;
      if (estimateEl) estimateEl.hidden = true;
      applyLocationVisibility('');
      clearAllErrors();
    }

    // Show/hide location field when camp select changes
    if (campSelect) {
      campSelect.addEventListener('change', function () {
        applyLocationVisibility(campSelect.value);
        clearFieldError(errCamp, campSelect);
      });
    }

    // Clear inline errors on user input
    var clearOnChange = [
      [tierSelect,    errTier,     tierSelect],
      [orgInput,      errOrg,      orgInput],
      [contactInput,  errContact,  contactInput],
      [phoneInput,    errPhone,    phoneInput],
      [emailInput,    errEmail,    emailInput],
      [startInput,    errStart,    startInput],
      [endInput,      errEnd,      endInput],
      [guestInput,    errGuests,   guestInput],
      [locationInput, errLocation, locationInput]
    ];
    clearOnChange.forEach(function (tuple) {
      var el = tuple[0]; var errEl = tuple[1]; var inputEl = tuple[2];
      if (!el) return;
      el.addEventListener('input',  function () { clearFieldError(errEl, inputEl); });
      el.addEventListener('change', function () { clearFieldError(errEl, inputEl); });
    });

    // ── PRICE ESTIMATE ─────────────────────────────────────────
    var PRICE_TABLE = {
      'Essential': { 'A Кемп': 180000, 'B Кемп': 180000, 'C Кемп': 280000, 'Нүүдлийн кемп': 180000 },
      'Experience': { 'A Кемп': 220000, 'B Кемп': 220000, 'C Кемп': 350000, 'Нүүдлийн кемп': 220000 }
    };
    var SHUTTLE_PRICE = {
      'Сонгохгүй': 0,
      'Өдрөөр / 2 талдаа — 1,000,000₮': 1000000,
      'Хоног / 2 талдаа — 1,200,000₮': 1200000
    };
    var SHUTTLE_LABEL = {
      'Өдрөөр / 2 талдаа — 1,000,000₮': 'Тээвэр (өдрөөр)',
      'Хоног / 2 талдаа — 1,200,000₮': 'Тээвэр (хоногоор)'
    };

    function formatMNT(n) {
      return n.toLocaleString('en-US') + '₮';
    }

    function updateEstimate() {
      if (!estimateEl) return;
      var camp   = campSelect    ? campSelect.value              : '';
      var tier   = tierSelect    ? tierSelect.value              : '';
      var guests = guestInput    ? parseInt(guestInput.value, 10) : 0;
      var shuttle = shuttleSelect ? shuttleSelect.value          : 'Сонгохгүй';

      if (!camp || !tier || !guests || guests < 1) {
        estimateEl.hidden = true;
        return;
      }

      estimateEl.hidden = false;

      if (tier === 'Production') {
        estimateEl.innerHTML =
          '<p class="quote-estimate__title">Урьдчилсан тооцоолол</p>' +
          '<p class="quote-estimate__tier">Production багц</p>' +
          '<p class="quote-estimate__custom">Тусгайлан тооцоологдоно.<br>Манай баг 24 цагийн дотор холбогдоно.</p>';
        return;
      }

      var campPrices = PRICE_TABLE[tier];
      if (!campPrices) { estimateEl.hidden = true; return; }
      var perPerson = campPrices[camp];
      if (!perPerson) { estimateEl.hidden = true; return; }

      var base = perPerson * guests;
      var shuttleAmount = SHUTTLE_PRICE[shuttle] !== undefined ? SHUTTLE_PRICE[shuttle] : 0;
      var total = base + shuttleAmount;
      var shuttleLabelText = SHUTTLE_LABEL[shuttle];

      var html = '<p class="quote-estimate__title">Урьдчилсан тооцоолол</p>';
      html += '<p class="quote-estimate__row">' + tier + ' багц · ' + guests + ' хүн</p>';
      html += '<p class="quote-estimate__row">' + guests + ' × ' + formatMNT(perPerson) + ' = <span class="quote-estimate__num">' + formatMNT(base) + '</span></p>';
      if (shuttleLabelText) {
        html += '<p class="quote-estimate__row">' + shuttleLabelText + ': <span class="quote-estimate__num">+' + formatMNT(shuttleAmount) + '</span></p>';
      }
      html += '<hr class="quote-estimate__divider">';
      html += '<p class="quote-estimate__total">~<span class="quote-estimate__num">' + formatMNT(total) + '</span>-с эхлэнэ</p>';
      html += '<p class="quote-estimate__disclaimer">Эцсийн үнэ байршил, нэмэлт үйлчилгээнээс хамааран өөрчлөгдөнө.</p>';
      estimateEl.innerHTML = html;
    }

    if (campSelect)    campSelect.addEventListener('change',  updateEstimate);
    if (tierSelect)    tierSelect.addEventListener('change',  updateEstimate);
    if (guestInput)    guestInput.addEventListener('input',   updateEstimate);
    if (shuttleSelect) shuttleSelect.addEventListener('change', updateEstimate);

    // Open modal from any quote trigger button
    quoteOpeners.forEach(function (link) {
      link.addEventListener('click', function (e) {
        e.preventDefault();
        var campName    = (link.dataset.campName    || '').trim();
        var tier        = (link.dataset.tier        || '').trim();
        var visualGroup = (link.dataset.visualGroup || '').trim();
        var feature     = '';
        if (visualGroup) {
          var checked = document.querySelector('input[name="' + visualGroup + '"]:checked');
          feature = checked ? checked.value : '';
        }
        openQuoteModal(campName || tier ? { camp: campName, tier: tier, feature: feature, shuttle: 'Сонгохгүй' } : null);
      });
    });

    closeTargets.forEach(function (el) {
      el.addEventListener('click', function () { closeQuoteModal(); });
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && quoteModal.classList.contains('is-open')) {
        closeQuoteModal();
      }
    });

    var N8N_WEBHOOK_URL = 'https://chimun.app.n8n.cloud/webhook/nomaad-quote';

    quoteForm.addEventListener('submit', async function (e) {
      e.preventDefault();

      clearAllErrors();
      if (quoteMessage) { quoteMessage.textContent = ''; quoteMessage.className = 'quote-form__message'; }

      var fd       = new FormData(quoteForm);

      if ((fd.get('website') || '').trim()) return;

      var camp     = (fd.get('camp_name')      || '').trim();
      var tier     = (fd.get('package_tier')   || '').trim();
      var org      = (fd.get('organization')   || '').trim();
      var contact  = (fd.get('contact_name')   || '').trim();
      var phone    = (fd.get('phone')          || '').trim();
      var email    = (fd.get('email')          || '').trim();
      var startDt  = (fd.get('start_datetime') || '').trim();
      var endDt    = (fd.get('end_datetime')   || '').trim();
      var guests   = (fd.get('guest_count')    || '').trim();
      var location = (fd.get('location')       || '').trim();
      var isMobile = camp === 'Нүүдлийн кемп';

      var hasError = false;
      var firstErrorEl = null;

      function markError(errEl, inputEl, msg) {
        showFieldError(errEl, inputEl, msg);
        hasError = true;
        if (!firstErrorEl) firstErrorEl = inputEl;
      }

      if (!camp)    markError(errCamp,    campSelect,    'Кемп сонгоно уу.');
      if (!tier)    markError(errTier,    tierSelect,    'Түвшин сонгоно уу.');
      if (!org)     markError(errOrg,     orgInput,      'Байгууллагын нэр оруулна уу.');
      if (!contact) markError(errContact, contactInput,  'Холбоо барих хүний нэр оруулна уу.');

      if (!phone) {
        markError(errPhone, phoneInput, 'Утасны дугаар оруулна уу.');
      } else {
        // Mongolian phone: 8 digits, optionally prefixed with +976 or 976
        var cleanPhone = phone.replace(/[\s\-\(\)\+]/g, '').replace(/^976/, '');
        if (!/^\d{7,8}$/.test(cleanPhone)) {
          markError(errPhone, phoneInput, 'Монгол утасны дугаар буруу байна. (жишээ: 99179417)');
        }
      }

      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        markError(errEmail, emailInput, 'Имэйл хаяг буруу байна.');
      }

      if (!startDt) {
        markError(errStart, startInput, 'Эхлэх огноо, цаг оруулна уу.');
      }

      if (!endDt) {
        markError(errEnd, endInput, 'Дуусах огноо, цаг оруулна уу.');
      } else if (startDt && new Date(endDt) <= new Date(startDt)) {
        markError(errEnd, endInput, 'Дуусах огноо эхлэх огнооноос хойш байх ёстой.');
      }

      if (!guests || parseInt(guests, 10) < 1) {
        markError(errGuests, guestInput, 'Хүний тоо оруулна уу.');
      }

      if (isMobile && !location) {
        markError(errLocation, locationInput, 'Кемп байгуулах байршил оруулна уу.');
      }

      if (hasError) {
        if (firstErrorEl) firstErrorEl.focus();
        return;
      }

      var submitBtn = quoteForm.querySelector('[type="submit"]');
      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Илгээж байна…'; }

      var payload = {
        camp:                  camp,
        tier:                  tier,
        visual_feature:        (fd.get('visual_feature')  || '').trim(),
        shuttle_service:       (fd.get('shuttle_service') || '').trim(),
        location:              isMobile ? location : '',
        notes:                 (fd.get('extra_info')      || '').trim(),
        company:               org,
        contact_name:          contact,
        phone:                 phone,
        email:                 email,
        start_datetime:        startDt,
        end_datetime:          endDt,
        event_date:            startDt,
        guest_count:           guests,
        camp_name:             camp,
        package_tier:          tier,
        shuttle_service_label: (fd.get('shuttle_service') || '').trim(),
        source:                'nomaadcamp.com'
      };

      try {
        var res = await fetch(N8N_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        if (quoteMessage) {
          quoteMessage.textContent = 'Таны хүсэлт амжилттай илгээгдлээ. Манай баг 24 цагийн дотор холбогдоно.';
          quoteMessage.className = 'quote-form__message quote-form__message--success';
        }
        quoteForm.reset();
        applyLocationVisibility('');
        window.setTimeout(function () { closeQuoteModal(); }, 3000);
      } catch (_) {
        if (quoteMessage) {
          quoteMessage.textContent = 'Алдаа гарлаа. Дахин оролдох эсвэл 9917-9417 дугаарт залгана уу.';
          quoteMessage.className = 'quote-form__message quote-form__message--error';
        }
      } finally {
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Урьдчилсан санал авах'; }
      }
    });
  }

  // Package card accordions
  document.querySelectorAll('.pkg-accordion__toggle').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var accordion = btn.closest('.pkg-accordion');
      var isOpen = accordion.classList.contains('is-open');
      accordion.classList.toggle('is-open', !isOpen);
      btn.setAttribute('aria-expanded', String(!isOpen));
    });
  });
})();
