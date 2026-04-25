// NOMAAD Camp — shared site scripts
(function () {
  'use strict';

  // Мобайл nav toggle
  const nav = document.querySelector('.nav');
  const navToggle = document.querySelector('.nav-toggle');
  const navMenu = nav ? nav.querySelector('.nav-links') : null;
  if (nav && navToggle) {
    const setMenuOpen = (isOpen) => {
      nav.classList.toggle('is-open', isOpen);
      navToggle.setAttribute('aria-expanded', String(isOpen));
      document.body.classList.toggle('menu-open', isOpen);
    };

    navToggle.addEventListener('click', () => {
      setMenuOpen(!nav.classList.contains('is-open'));
    });
    document.addEventListener('click', (e) => {
      if (!nav.classList.contains('is-open')) return;
      if (!nav.contains(e.target)) setMenuOpen(false);
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && nav.classList.contains('is-open')) {
        setMenuOpen(false);
        navToggle.focus();
      }
    });
    document.querySelectorAll('.nav-links a').forEach((a) => {
      a.addEventListener('click', () => setMenuOpen(false));
    });
    if (navMenu && !navMenu.id) navMenu.id = 'primary-nav';
  }

  // Sticky nav төлөв
  if (nav) {
    const onScroll = () => {
      nav.classList.toggle('is-scrolled', window.scrollY > 12);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  // Идэвхтэй nav холбоос
  const path = window.location.pathname.replace(/\/$/, '') || '/';
  document.querySelectorAll('.nav-links a').forEach((a) => {
    const href = a.getAttribute('href');
    if (!href) return;
    const target = href.replace(/\/$/, '') || '/';
    if (
      target === path ||
      (target === '/' && (path === '' || path === '/index.html'))
    ) {
      a.classList.add('active');
    }
  });

  // Scroll reveal
  if ('IntersectionObserver' in window) {
    const revealObs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('is-visible');
            revealObs.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    document.querySelectorAll('.reveal').forEach((el) => revealObs.observe(el));
  } else {
    document.querySelectorAll('.reveal').forEach((el) => el.classList.add('is-visible'));
  }

  // Deferred image loading (reduce initial payload for Lighthouse)
  const deferredImages = document.querySelectorAll('img.defer-img[data-src]');
  const loadImage = (img) => {
    const src = img.getAttribute('data-src');
    if (!src) return;
    img.src = src;
    img.removeAttribute('data-src');
  };
  if ('IntersectionObserver' in window) {
    const imgObs = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        loadImage(entry.target);
        observer.unobserve(entry.target);
      });
    }, { rootMargin: '220px 0px' });
    deferredImages.forEach((img) => imgObs.observe(img));
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

    const total = slides.length;
    const autoplay = root.dataset.autoplay === 'true';
    const interval = parseInt(root.dataset.interval, 10) || 4000;
    let index = 0;
    let timer = null;
    let isHover = false;

    // Build dots
    if (dotsWrap) {
      for (let i = 0; i < total; i++) {
        const d = document.createElement('button');
        d.type = 'button';
        d.className = 'carousel-dot';
        d.setAttribute('aria-label', 'Зураг ' + (i + 1));
        d.addEventListener('click', () => go(i, true));
        dotsWrap.appendChild(d);
      }
    }
    const dots = dotsWrap ? dotsWrap.querySelectorAll('.carousel-dot') : [];

    function render() {
      track.style.transform = 'translateX(-' + (index * 100) + '%)';
      dots.forEach((d, i) => d.classList.toggle('is-active', i === index));
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
      timer = setInterval(() => { if (!isHover) next(); }, interval);
    }
    function stop() { if (timer) { clearInterval(timer); timer = null; } }
    function restart() { stop(); start(); }

    if (prevBtn) prevBtn.addEventListener('click', () => go(index - 1, true));
    if (nextBtn) nextBtn.addEventListener('click', () => go(index + 1, true));

    root.addEventListener('mouseenter', () => { isHover = true; });
    root.addEventListener('mouseleave', () => { isHover = false; });

    // Touch swipe
    let touchX = null;
    let touchY = null;
    root.addEventListener('touchstart', (e) => {
      touchX = e.touches[0].clientX;
      touchY = e.touches[0].clientY;
    }, { passive: true });
    root.addEventListener('touchend', (e) => {
      if (touchX === null) return;
      const dx = e.changedTouches[0].clientX - touchX;
      const dy = e.changedTouches[0].clientY - touchY;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
        if (dx < 0) go(index + 1, true); else go(index - 1, true);
      }
      touchX = null; touchY = null;
    }, { passive: true });

    render();
    start();
  });

  // Нүүр хуудасны кемп дэлгэрэнгүй toggle
  const campCards = document.querySelectorAll('[data-camp-target]');
  if (campCards.length > 0) {
    const campDetails = document.querySelectorAll('.camp-detail');
    const showCampDetail = (targetId) => {
      campCards.forEach((card) => {
        card.classList.toggle('is-active', card.dataset.campTarget === targetId);
      });
      campDetails.forEach((detail) => {
        detail.classList.toggle('is-open', detail.id === targetId);
      });
    };
    campCards.forEach((card) => {
      card.addEventListener('click', () => showCampDetail(card.dataset.campTarget));
    });
  }

  // Холбоо барих маягт (AJAX Netlify Forms)
  const form = document.querySelector('form[data-netlify="true"]');
  const feedback = document.querySelector('.form-feedback');
  if (form && feedback) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      feedback.className = 'form-feedback';
      feedback.textContent = '';
      const submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.disabled = true;
      try {
        const data = new URLSearchParams(new FormData(form)).toString();
        const res = await fetch('/', {
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
