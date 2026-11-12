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


  /* ---------- Cast: natural vertical scrolling, horizontal character entrances ---------- */
  const cast = document.querySelector('[data-cast]');
  const members = cast ? Array.from(cast.querySelectorAll('[data-member]')) : [];
  const castButtons = cast ? Array.from(cast.querySelectorAll('[data-cast-go]')) : [];
  let castTravel = 0;
  let castHeader = 64;
  let castWidth = 0;
  let castActive = -1;
  function castPosition(progress, count) {
    const scaled = clamp(progress) * count;
    const index = Math.min(count - 1, Math.floor(scaled));
    const local = Math.min(1, scaled - index);
    const rawSlide = index < count - 1 ? clamp((local - 0.82) / 0.18) : 0;
    const slide = rawSlide * rawSlide * (3 - 2 * rawSlide);
    return { index, slide, depth: 1 - clamp((local - 0.48) / 0.28) };
  }
  function setCastActive(index) {
    if (castActive === index) return;
    castActive = index;
    castButtons.forEach((button, i) => {
      if (i === index) button.setAttribute('aria-current', 'true');
      else button.removeAttribute('aria-current');
    });
  }
  function updateCast() {
    if (!cast || !cast.classList.contains('cast-enabled')) return;
    const progress = clamp((castHeader - cast.getBoundingClientRect().top) / Math.max(1, castTravel));
    const state = castPosition(progress, members.length);
    cast.style.setProperty('--cast-x', (-(state.index + state.slide) * castWidth).toFixed(2) + 'px');
    cast.style.setProperty('--cast-progress', progress.toFixed(4));
    members.forEach((member, i) => member.style.setProperty('--depth', i < state.index ? 0 : i === state.index ? state.depth.toFixed(3) : 1));
    setCastActive(Math.min(members.length - 1, state.index + (state.slide > 0.5 ? 1 : 0)));
  }
  function measureCast() {
    if (!cast) return;
    cast.classList.remove('cast-enabled', 'cast-compact');
    cast.style.removeProperty('--scene-height');
    if (reduceMotion.matches || !canObserve) return;
    cast.classList.add('cast-enabled');
    const castShell = cast.querySelector('.cast-shell');
    castShell.style.height = 'auto';
    castHeader = parseFloat(getComputedStyle(root).getPropertyValue('--header-h')) || 64;
    const layouts = members.map(m => m.querySelector('.cast-layout'));
    let height = Math.max(...layouts.map(m => m.getBoundingClientRect().height));
    const chrome = cast.querySelector('.cast-shell').getBoundingClientRect().height - cast.querySelector('.cast-viewport').getBoundingClientRect().height;
    if (height + chrome > window.innerHeight - castHeader - 8 && window.innerWidth < 900) {
      cast.classList.add('cast-compact');
      height = Math.max(...layouts.map(m => m.getBoundingClientRect().height));
    }
    castShell.style.removeProperty('height');
    // Long bios, text zoom and short viewports always get a fully readable linear layout.
    if (height + chrome > window.innerHeight - castHeader - 8) {
      cast.classList.remove('cast-enabled');
      setCastActive(0);
      return;
    }
    castWidth = cast.querySelector('.cast-viewport').getBoundingClientRect().width;
    castTravel = members.length * Math.max(600, window.innerHeight * 0.95);
    cast.style.setProperty('--scene-height', Math.ceil(height) + 'px');
    cast.style.setProperty('--cast-height', Math.ceil(height + chrome) + 'px');
    cast.style.setProperty('--cast-travel', Math.ceil(castTravel) + 'px');
    updateCast();
  }
  castButtons.forEach(button => button.addEventListener('click', () => {
    const index = Number(button.dataset.castGo);
    if (cast.classList.contains('cast-enabled')) {
      window.scrollTo({ top: window.scrollY + cast.getBoundingClientRect().top - castHeader + (index + 0.15) / members.length * castTravel, behavior: reduceMotion.matches ? 'auto' : 'smooth' });
    } else members[index].scrollIntoView({ behavior: 'auto', block: 'start' });
  }));
  window.addEventListener('resize', measureCast, { passive: true });
  window.addEventListener('load', measureCast);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measureCast);
  if (reduceMotion.addEventListener) reduceMotion.addEventListener('change', measureCast);
  measureCast();

  /* ---------- Thanh tiến độ đọc ---------- */
  let frame = 0;
  const onScroll = () => {
    frame = 0;
    const max = root.scrollHeight - window.innerHeight;
    root.style.setProperty('--reading-progress', max > 0 ? clamp(window.scrollY / max).toFixed(4) : 0);
    updateScrub();
    updateCast();
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

/* ---------- Đội ngũ: mảng xiên trượt phải → trái theo cuộn / vuốt ---------- */
(() => {
  const crew = document.querySelector('[data-crew]');
  if (!crew) return;
  const scroller = crew.querySelector('.crew-scroll');
  const sticky = crew.querySelector('.crew-sticky');
  const stage = crew.querySelector('.crew-stage');
  const viewport = crew.querySelector('.crew-viewport');
  const track = crew.querySelector('.crew-track');
  const cards = Array.from(crew.querySelectorAll('.crew-card'));
  const bios = Array.from(crew.querySelectorAll('.crew-bio'));
  const buttons = Array.from(crew.querySelectorAll('[data-crew-go]'));
  const n = cards.length;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  let active = -1, pinned = false, travel = 0, header = 64, step = 0, cardW = 0, target = 0, ticking = false;

  function setActive(i) {
    if (i === active) return;
    active = i;
    cards.forEach((c, k) => c.classList.toggle('is-active', k === i));
    bios.forEach((b, k) => { b.classList.toggle('is-active', k === i); b.setAttribute('aria-hidden', k === i ? 'false' : 'true'); });
    buttons.forEach((b, k) => b.setAttribute('aria-current', k === i ? 'true' : 'false'));
  }
  function place(p) {
    track.style.transform = 'translate3d(' + (target - cardW / 2 - p * step).toFixed(1) + 'px,0,0)';
    crew.style.setProperty('--crew-p', (n > 1 ? p / (n - 1) : 1).toFixed(4));
    setActive(Math.max(0, Math.min(n - 1, Math.round(p))));
  }
  function progress() {
    const t = (header - scroller.getBoundingClientRect().top) / Math.max(1, travel);
    return Math.min(1, Math.max(0, t)) * (n - 1);
  }
  function update() { ticking = false; if (pinned) place(progress()); }
  function measure() {
    header = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) || 64;
    crew.classList.remove('crew-enabled', 'crew-carousel');
    cardW = cards[0].offsetWidth;
    step = n > 1 ? cards[1].offsetLeft - cards[0].offsetLeft : 0;
    target = viewport.clientWidth * (window.innerWidth < 900 ? 0.36 : 0.4);
    const fits = stage.getBoundingClientRect().height <= window.innerHeight - header - 8;
    pinned = !reduce.matches && fits;
    if (pinned) {
      travel = (n - 1) * Math.max(420, window.innerHeight * 0.75);
      crew.style.setProperty('--crew-travel', Math.ceil(travel) + 'px');
      crew.classList.add('crew-enabled');
      place(progress());
    } else {
      crew.classList.add('crew-carousel');
      place(active < 0 ? 0 : active);
    }
  }
  function go(i) {
    i = Math.max(0, Math.min(n - 1, i));
    if (pinned) {
      const top = window.scrollY + scroller.getBoundingClientRect().top - header + (n > 1 ? i / (n - 1) : 0) * travel + 2;
      window.scrollTo({ top, behavior: reduce.matches ? 'auto' : 'smooth' });
    } else place(i);
  }
  buttons.forEach(b => b.addEventListener('click', () => go(Number(b.dataset.crewGo))));
  crew.querySelector('.crew-dots').addEventListener('keydown', e => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const i = active + (e.key === 'ArrowRight' ? 1 : -1);
      go(i); const b = buttons[Math.max(0, Math.min(n - 1, i))]; if (b) b.focus();
    }
  });
  let sx = 0, sy = 0;
  sticky.addEventListener('touchstart', e => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
  sticky.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.3) go(active + (dx < 0 ? 1 : -1));
  }, { passive: true });
  window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
  window.addEventListener('resize', measure);
  if (reduce.addEventListener) reduce.addEventListener('change', measure);
  window.addEventListener('load', measure);
  measure();
})();

/* ---------- Đội ngũ kiểu băng poster: mỗi lần một người, trượt phải → trái ---------- */
(() => {
  const reel = document.querySelector('[data-reel]');
  if (!reel) return;
  const scroller = reel.querySelector('.reel-scroll');
  const sticky = reel.querySelector('.reel-sticky');
  const topBar = reel.querySelector('.reel-top');
  const scenes = Array.from(reel.querySelectorAll('.reel-scene'));
  const buttons = Array.from(reel.querySelectorAll('[data-reel-go]'));
  const n = scenes.length;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  let pinned = false, travel = 0, header = 64, active = -1, ticking = false;
  // Giữ yên mỗi người ~60% quãng cuộn, chuyển cảnh ở khoảng giữa
  const ease = f => { const x = Math.min(1, Math.max(0, (f - 0.3) / 0.4)); return x * x * (3 - 2 * x); };

  function setActive(i) {
    if (i === active) return;
    active = i;
    scenes.forEach((s, k) => {
      s.classList.toggle('is-active', k === i);
      s.setAttribute('aria-hidden', pinned && k !== i ? 'true' : 'false');
    });
    buttons.forEach((b, k) => b.setAttribute('aria-current', k === i ? 'true' : 'false'));
  }
  function render(raw) {
    const k = Math.min(n - 1, Math.floor(raw));
    const p = k + ease(raw - k);
    scenes.forEach((s, i) => {
      const t = Math.max(-1.2, Math.min(1.2, p - i));
      s.style.setProperty('--t', t.toFixed(4));
      s.style.setProperty('--ta', Math.abs(t).toFixed(4));
      s.classList.toggle('is-near', Math.abs(t) < 1);
    });
    reel.style.setProperty('--reel-p', (n > 1 ? p / (n - 1) : 1).toFixed(4));
    setActive(Math.round(p));
  }
  function raw() {
    const t = (header - scroller.getBoundingClientRect().top) / Math.max(1, travel);
    return Math.min(1, Math.max(0, t)) * (n - 1);
  }
  function update() { ticking = false; if (pinned) render(raw()); }
  function measure() {
    header = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) || 64;
    reel.classList.remove('reel-enabled');
    pinned = false;
    scenes.forEach(s => { s.style.removeProperty('--t'); s.style.removeProperty('--ta'); });
    const tallest = Math.max(...scenes.map(s => s.offsetHeight));
    const fits = topBar.offsetHeight + tallest + 16 <= window.innerHeight - header;
    pinned = !reduce.matches && fits;
    if (pinned) {
      travel = (n - 1) * Math.max(480, window.innerHeight * 0.9);
      reel.style.setProperty('--reel-travel', Math.ceil(travel) + 'px');
      reel.classList.add('reel-enabled');
      active = -1;
      render(raw());
    } else {
      active = -1;
      setActive(0);
    }
  }
  function go(i) {
    i = Math.max(0, Math.min(n - 1, i));
    if (pinned) {
      const top = window.scrollY + scroller.getBoundingClientRect().top - header + (n > 1 ? i / (n - 1) : 0) * travel + 2;
      window.scrollTo({ top, behavior: reduce.matches ? 'auto' : 'smooth' });
    } else {
      scenes[i].scrollIntoView({ behavior: reduce.matches ? 'auto' : 'smooth', block: 'start' });
      setActive(i);
    }
  }
  buttons.forEach(b => b.addEventListener('click', () => go(Number(b.dataset.reelGo))));
  let sx = 0, sy = 0;
  sticky.addEventListener('touchstart', e => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
  sticky.addEventListener('touchend', e => {
    if (!pinned) return;
    const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.3) go(active + (dx < 0 ? 1 : -1));
  }, { passive: true });
  window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
  window.addEventListener('resize', measure);
  if (reduce.addEventListener) reduce.addEventListener('change', measure);
  window.addEventListener('load', measure);
  measure();
})();
