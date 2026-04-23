// NOMAAD Camp — shared site scripts
(function () {
  'use strict';

  // ── Mobile nav toggle ──
  const nav = document.querySelector('.nav');
  const navToggle = document.querySelector('.nav-toggle');
  if (nav && navToggle) {
    navToggle.addEventListener('click', () => {
      nav.classList.toggle('is-open');
    });
    document.querySelectorAll('.nav-links a').forEach((a) => {
      a.addEventListener('click', () => nav.classList.remove('is-open'));
    });
  }

  // ── Active nav link based on current page ──
  const path = window.location.pathname.replace(/\/$/, '') || '/';
  document.querySelectorAll('.nav-links a').forEach((a) => {
    const href = a.getAttribute('href');
    if (!href) return;
    const target = href.replace(/\/$/, '') || '/';
    if (
      target === path ||
      (target === '/' && (path === '' || path === '/index.html')) ||
      (target !== '/' && path.endsWith(target))
    ) {
      a.classList.add('active');
    }
  });

  // ── Scroll reveal ──
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

  // ── Hide broken images so placeholder shows ──
  document.querySelectorAll('img').forEach((img) => {
    img.addEventListener('error', () => {
      img.style.display = 'none';
    });
  });

  // ── Packages: Day / Overnight toggle ──
  const toggleBtns = document.querySelectorAll('.pkg-toggle button');
  if (toggleBtns.length) {
    toggleBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const mode = btn.dataset.mode;
        toggleBtns.forEach((b) => b.classList.toggle('is-active', b === btn));
        document.querySelectorAll('[data-price-day]').forEach((el) => {
          const v = mode === 'day' ? el.dataset.priceDay : el.dataset.priceNight;
          if (v) el.textContent = v;
        });
      });
    });
  }

  // ── Gallery filter ──
  const filterBtns = document.querySelectorAll('.gallery-filter button');
  if (filterBtns.length) {
    filterBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const filter = btn.dataset.filter;
        filterBtns.forEach((b) => b.classList.toggle('is-active', b === btn));
        document.querySelectorAll('.gallery-item').forEach((item) => {
          const tags = (item.dataset.tags || '').split(' ');
          const show = filter === 'all' || tags.includes(filter);
          item.classList.toggle('is-hidden', !show);
        });
      });
    });
  }

  // ── Contact form AJAX ──
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
          feedback.textContent = 'Таны захиалгыг хүлээн авлаа. 24 цагийн дотор холбогдох болно.';
          form.reset();
        } else {
          throw new Error('network');
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
