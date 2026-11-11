(() => {
  'use strict';
  const root = document.documentElement;
  const config = window.COURSE_CONFIG || {};
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ---------- Liên hệ tư vấn ----------
     Link Zalo đã nằm sẵn trong href của mọi nút (hoạt động cả khi tắt JS).
     Nếu config.js có link HTTPS khác thì dùng link đó; nếu config xóa link thì mở dialog. */
  const httpsUrl = (value) => {
    try { const url = new URL(value); return url.protocol === 'https:' ? url.href : null; }
    catch { return null; }
  };
  const hasConfigKey = Object.prototype.hasOwnProperty.call(config, 'zaloUrl');
  const zaloUrl = hasConfigKey ? httpsUrl(config.zaloUrl) : null;
  const dialog = document.getElementById('contact-dialog');

  document.querySelectorAll('.contact').forEach(link => {
    if (zaloUrl) {
      link.href = zaloUrl;
    } else if (hasConfigKey) {
      link.removeAttribute('target');
      link.href = '#lien-he';
      link.setAttribute('aria-haspopup', 'dialog');
    }
    if (link.target === '_blank') link.setAttribute('aria-label', 'Liên hệ tư vấn qua Zalo, mở trong thẻ mới');
    link.addEventListener('click', event => {
      document.dispatchEvent(new CustomEvent('course:contact', { detail: { source: link.dataset.source } }));
      if (hasConfigKey && !zaloUrl && dialog && dialog.showModal) {
        event.preventDefault();
        dialog.showModal();
      }
    });
  });
  if (dialog) {
    dialog.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  }

  document.querySelectorAll('[data-location]').forEach(el => { el.textContent = config.location || 'Cần Thơ'; });

  /* ---------- Sản phẩm thực tế (chỉ hiện khi có dữ liệu thật) ---------- */
  const evidence = Array.isArray(config.evidence) ? config.evidence : [];
  const evidenceBox = document.getElementById('evidence-items');
  evidence.forEach(item => {
    const url = httpsUrl(item && item.url);
    if (!item || !item.title || !url) return;
    const article = document.createElement('article');
    article.className = 'evidence-item';
    const h3 = document.createElement('h3'); h3.textContent = item.title;
    const p = document.createElement('p'); p.textContent = item.description || '';
    const a = document.createElement('a');
    a.className = 'text-link'; a.textContent = 'Xem sản phẩm ↗'; a.href = url; a.target = '_blank'; a.rel = 'noopener noreferrer';
    article.append(h3, p, a);
    evidenceBox.append(article);
  });
  if (evidenceBox && evidenceBox.children.length) document.getElementById('san-pham').hidden = false;

  /* ---------- Bật chế độ chuyển động ---------- */
  const canObserve = 'IntersectionObserver' in window;
  if (canObserve) root.classList.add('scrolly');

  const reveals = Array.from(document.querySelectorAll('.reveal'));
  const showAll = () => reveals.forEach(el => el.classList.add('is-in'));

  if (canObserve && !reduceMotion.matches) {
    // Phần tử đã nằm trong màn hình lúc tải thì hiện ngay, không ẩn rồi hiện lại.
    reveals.forEach(el => { if (el.getBoundingClientRect().top < window.innerHeight * 0.92) el.classList.add('is-in'); });
    // Stagger nhẹ cho các phần tử anh em trong danh sách.
    reveals.forEach(el => {
      if (!el.matches('li, .shot')) return;
      const i = Array.from(el.parentElement.children).indexOf(el);
      el.style.setProperty('--d', (i % 3) * 90 + 'ms');
    });
    root.classList.add('motion');
    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });
    reveals.forEach(el => { if (!el.classList.contains('is-in')) io.observe(el); });
  } else {
    showAll();
  }
  reduceMotion.addEventListener && reduceMotion.addEventListener('change', e => {
    if (e.matches) { root.classList.remove('motion'); showAll(); updateScrub(true); }
  });

  /* ---------- Sáu kỹ năng: đổi màn hình điện thoại theo đoạn đang đọc ---------- */
  const stage = document.querySelector('[data-skills]');
  if (stage && canObserve) {
    const steps = Array.from(stage.querySelectorAll('.skill-step'));
    const screens = Array.from(stage.querySelectorAll('.scr'));
    const indexEl = stage.querySelector('[data-skill-index]');
    const nameEl = stage.querySelector('[data-skill-name]');
    let current = 1;
    const setActive = (n) => {
      if (n === current) return;
      current = n;
      steps.forEach(s => s.classList.toggle('is-active', Number(s.dataset.step) === n));
      screens.forEach((s, i) => s.classList.toggle('is-on', i + 1 === n));
      indexEl.textContent = String(n).padStart(2, '0');
      nameEl.textContent = steps[n - 1].querySelector('h3').textContent;
      stage.style.setProperty('--skill', n);
    };
    stage.style.setProperty('--skill', 1);
    const stepObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => { if (entry.isIntersecting) setActive(Number(entry.target.dataset.step)); });
    }, { rootMargin: '-58% 0px -36% 0px', threshold: 0 });
    steps.forEach(s => stepObserver.observe(s));
  }

  /* ---------- Hiệu ứng theo tiến trình cuộn: ghép video, đường lịch học ---------- */
  const scrubs = Array.from(document.querySelectorAll('[data-scrub]'));
  const journeyItems = Array.from(document.querySelectorAll('.journey-steps li'));
  const clamp = (v) => Math.min(1, Math.max(0, v));
  const journeyTrack = document.querySelector('.journey-track');
  const sizeJourneyLine = () => {
    if (!journeyTrack || !journeyItems.length) return;
    journeyTrack.style.setProperty('--line-h', journeyItems[journeyItems.length - 1].offsetTop + 'px');
  };
  sizeJourneyLine();
  window.addEventListener('resize', sizeJourneyLine, { passive: true });
  window.addEventListener('load', sizeJourneyLine);
  function updateScrub(force) {
    const vh = window.innerHeight;
    const still = force === true || reduceMotion.matches;
    scrubs.forEach(el => {
      const r = el.getBoundingClientRect();
      let p = 1;
      if (!still) {
        if (el.classList.contains('journey-track')) p = clamp((vh * 0.6 - r.top) / Math.max(1, r.height - 120));
        else p = clamp((vh * 0.92 - r.top) / (vh * 0.55));
      }
      el.style.setProperty('--p', p.toFixed(3));
    });
    journeyItems.forEach(li => {
      li.classList.toggle('is-reached', still || li.getBoundingClientRect().top < vh * 0.62);
    });
  }

  /* ---------- Thanh tiến độ đọc ---------- */
  let frame = 0;
  const onScroll = () => {
    frame = 0;
    const max = root.scrollHeight - window.innerHeight;
    root.style.setProperty('--reading-progress', max > 0 ? clamp(window.scrollY / max).toFixed(4) : 0);
    updateScrub();
  };
  const queue = () => { if (!frame) frame = requestAnimationFrame(onScroll); };
  window.addEventListener('scroll', queue, { passive: true });
  window.addEventListener('resize', queue, { passive: true });
  onScroll();

  /* ---------- Tạm dừng animation ngoài màn hình / khi ẩn tab ---------- */
  if (canObserve) {
    const pauser = new IntersectionObserver(entries => {
      entries.forEach(e => e.target.classList.toggle('is-paused', !e.isIntersecting));
    });
    document.querySelectorAll('.hero, .process-ribbon, .skills-visual, .ambient').forEach(el => pauser.observe(el));
  }
  document.addEventListener('visibilitychange', () => document.body.classList.toggle('motion-paused', document.hidden));
})();

/* ---------- Glass theme: vector parallax (tắt khi giảm chuyển động) ---------- */
(() => {
  'use strict';
  const vecs = Array.from(document.querySelectorAll('.vec[data-depth]'));
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (!vecs.length) return;
  let bases = [], frame = 0;
  const measure = () => {
    vecs.forEach(v => { v.style.transform = ''; });
    bases = vecs.map(v => ({ el: v, c: v.offsetTop + v.offsetHeight / 2, d: parseFloat(v.dataset.depth) || 0 }));
  };
  const render = () => {
    frame = 0;
    if (reduce.matches) { vecs.forEach(v => { v.style.transform = ''; }); return; }
    const mid = window.scrollY + window.innerHeight / 2;
    bases.forEach(b => {
      const shift = Math.max(-260, Math.min(260, (mid - b.c) * b.d));
      b.el.style.transform = 'translate3d(0,' + shift.toFixed(1) + 'px,0)';
    });
  };
  const queue = () => { if (!frame) frame = requestAnimationFrame(render); };
  measure(); render();
  window.addEventListener('scroll', queue, { passive: true });
  window.addEventListener('resize', () => { measure(); queue(); }, { passive: true });
  window.addEventListener('load', () => { measure(); queue(); });
})();
