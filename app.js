/* Red Horse · web — brand home: hero scrub, reel previews + player, "Avísame" form. Vanilla, no dependencies. */
(() => {
  'use strict';

  const API = 'https://red-horse-sorteo.onrender.com';

  const root = document.documentElement;
  const MOTION = root.classList.contains('motion');
  const MOBILE = matchMedia('(max-width: 640px)').matches;

  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const smooth = (v, a, b) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  let vh = innerHeight;

  // ── Reveal on enter ───────────────────────────────────────────────────────
  const io = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
  }), { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
  $$('.reveal').forEach((el) => io.observe(el));

  // ── Reel previews ─────────────────────────────────────────────────────────
  // Memory rules for iOS / in-app browsers: a preview only loads after it has stayed in view ~0.35 s
  // (a fast flick never loads anything), phones keep at most ONE preview loaded, and previews far away unload.
  const previews = $$('video[data-src]');
  let playerOpen = false;
  const unload = (v) => { clearTimeout(v._t); v._t = 0; if (v.getAttribute('src')) { v.pause(); v.removeAttribute('src'); v.load(); } };
  const want = (v) => {
    clearTimeout(v._t);
    v._t = setTimeout(() => {
      v._t = 0;
      if (playerOpen || !v._visible) return;
      if (MOBILE) previews.forEach((o) => { if (o !== v) unload(o); });
      if (!v.getAttribute('src')) v.src = v.dataset.src;
      if (MOTION) v.play().catch(() => {});
    }, 350);
  };
  // "visible" = mostly on screen, also horizontally inside its rail (IO clips by the scrolling ancestor)
  const vio = new IntersectionObserver((entries) => entries.forEach((e) => {
    const v = e.target;
    v._visible = e.isIntersecting && e.intersectionRatio >= .55;
    if (v._visible) want(v); else { clearTimeout(v._t); v._t = 0; v.pause(); }
  }), { threshold: [0, .55] });
  const vfar = new IntersectionObserver((entries) => entries.forEach((e) => { if (!e.isIntersecting) unload(e.target); }),
    { rootMargin: '100% 0px' });
  previews.forEach((v) => { vio.observe(v); vfar.observe(v); });

  // ── Full reel player (with sound, loaded only on tap) ─────────────────────
  const player = $('[data-player]');
  const pv = $('video', player);
  let lastFocus = null;
  function openReel(src, label) {
    lastFocus = document.activeElement;
    playerOpen = true;
    previews.forEach(unload);                       // phones: never two videos decoding at once
    player.hidden = false;
    player.setAttribute('role', 'dialog'); player.setAttribute('aria-modal', 'true'); player.setAttribute('aria-label', label || 'Reel');
    root.classList.add('is-playing');
    pv.src = src;
    pv.play().catch(() => {});
    $('[data-close]', player).focus();
  }
  function closeReel() {
    if (!playerOpen) return;
    playerOpen = false;
    pv.pause(); pv.removeAttribute('src'); pv.load();
    player.hidden = true;
    root.classList.remove('is-playing');
    if (lastFocus) lastFocus.focus({ preventScroll: true });
    previews.forEach((v) => { if (v._visible) want(v); });
  }
  $$('[data-reel]').forEach((b) => b.addEventListener('click', () => openReel(b.dataset.reel, b.getAttribute('aria-label'))));
  $('[data-close]', player).addEventListener('click', closeReel);
  player.addEventListener('click', (e) => { if (e.target === player) closeReel(); });
  addEventListener('keydown', (e) => { if (e.key === 'Escape') closeReel(); });
  pv.addEventListener('ended', closeReel);

  // ── Hero scrub: empty sea → horse → wordmark → tagline ────────────────────
  const hero = $('.hero');
  const hint = $('.hero__hint');
  function heroFrame() {
    const r = hero.getBoundingClientRect();
    if (r.bottom < -vh) return;
    const p = clamp(-r.top / Math.max(1, r.height - vh));
    hero.style.setProperty('--horse', smooth(p, .04, .4).toFixed(3));
    hero.style.setProperty('--kicker', smooth(p, .36, .52).toFixed(3));
    hero.style.setProperty('--wm', smooth(p, .42, .68).toFixed(3));
    hero.style.setProperty('--tag', smooth(p, .62, .84).toFixed(3));
    hero.style.setProperty('--hint', (1 - smooth(p, 0, .06)).toFixed(3));
    hint.style.pointerEvents = p > .06 ? 'none' : 'auto';
  }

  // ── Photos · "Revelado": scroll drops each print onto a pile, with a camera flash on landing ──
  // Memory: prints load just before they drop (640w only), only the top 5 of the pile stay visible,
  // and each frame touches only the prints whose state actually changed.
  const photos = $('.photos');
  const shots = $$('.pile .shot');
  const countEl = $('[data-count]');
  const N = shots.length;
  const shotState = shots.map((s, i) => ({
    img: $('img', s),
    rot: ((i * 37) % 17 - 8) * .8,            // fixed, "random-looking" resting angle per print
    dx: ((i * 53) % 13 - 6) * 2.4,
    css: '', vis: null, flash: '',
  }));
  if (MOTION) shotState.forEach(({ img }) => {      // hold the files back until each print is about to drop
    img.dataset.src = img.getAttribute('src');
    img.removeAttribute('srcset'); img.removeAttribute('src');
  });
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);
  let lastCount = '';
  function photosFrame() {
    const r = photos.getBoundingClientRect();
    if (r.bottom < -vh || r.top > vh * 2) return;
    const p = clamp(-r.top / Math.max(1, r.height - vh));
    const k = clamp((p - .03) / .85) * (N + .5);   // 0..N prints landed (+.5 so the last flash fades out)
    shotState.forEach((s, i) => {
      if (i <= k + 3 && !s.img.getAttribute('src')) s.img.src = s.img.dataset.src;
      const t = clamp(k - i), depth = Math.floor(k) - i;
      const vis = t > 0 && depth <= 4;
      if (vis !== s.vis) { shots[i].style.visibility = vis ? 'visible' : 'hidden'; shots[i].style.zIndex = i + 1; s.vis = vis; }
      if (!vis) return;
      const e = easeOut(t);
      const y = (1 - e) * vh * .9, rot = s.rot * e - (1 - e) * s.rot * 2.5, sc = 1 + (1 - e) * .12;
      const css = `translate(-50%, -50%) translate3d(${s.dx.toFixed(1)}px, ${y.toFixed(1)}px, 0) rotate(${rot.toFixed(2)}deg) scale(${sc.toFixed(3)})`;
      if (css !== s.css) { shots[i].style.transform = css; s.css = css; }
      const u = k - i - 1;                           // time since landing
      const flash = u >= 0 && u < .45 ? ((1 - u / .45) * .85).toFixed(2) : '0';
      if (flash !== s.flash) { shots[i].style.setProperty('--flash', flash); s.flash = flash; }
    });
    const c = String(Math.min(N, Math.max(1, Math.ceil(k - .3)))).padStart(2, '0');
    if (c !== lastCount) { countEl.textContent = c; lastCount = c; }
  }

  // ── Photo viewer: one full-size image at a time; swipe, arrows, keys ──────
  const viewer = $('[data-viewer]');
  const vImg = $('[data-viewer-img]', viewer);
  const vCount = $('[data-viewer-count]', viewer);
  let vIndex = 0, viewerOpen = false, vFocus = null;
  const full = (i) => `assets/photos/rh-${String(i + 1).padStart(2, '0')}-1024.webp`;
  function showPhoto(i) {
    vIndex = (i + N) % N;
    vImg.classList.add('is-loading');
    vImg.onload = () => vImg.classList.remove('is-loading');
    vImg.src = full(vIndex);
    vImg.alt = shotState[vIndex].img.alt;
    vCount.textContent = `${vIndex + 1} / ${N}`;
  }
  function openViewer(i) {
    vFocus = document.activeElement; viewerOpen = true;
    viewer.hidden = false;
    viewer.setAttribute('role', 'dialog'); viewer.setAttribute('aria-modal', 'true'); viewer.setAttribute('aria-label', 'Fotos de Red Horse');
    root.classList.add('is-playing');
    showPhoto(i);
    $('[data-viewer-close]', viewer).focus();
  }
  function closeViewer() {
    if (!viewerOpen) return;
    viewerOpen = false; viewer.hidden = true; vImg.removeAttribute('src');
    root.classList.remove('is-playing');
    if (vFocus) vFocus.focus({ preventScroll: true });
  }
  $$('[data-shot]').forEach((b) => b.addEventListener('click', () => openViewer(+b.dataset.shot)));
  $('[data-viewer-close]', viewer).addEventListener('click', closeViewer);
  $('[data-viewer-prev]', viewer).addEventListener('click', () => showPhoto(vIndex - 1));
  $('[data-viewer-next]', viewer).addEventListener('click', () => showPhoto(vIndex + 1));
  viewer.addEventListener('click', (e) => { if (e.target === viewer || e.target.classList.contains('viewer__fig')) closeViewer(); });
  addEventListener('keydown', (e) => {
    if (!viewerOpen) return;
    if (e.key === 'Escape') closeViewer();
    else if (e.key === 'ArrowRight') showPhoto(vIndex + 1);
    else if (e.key === 'ArrowLeft') showPhoto(vIndex - 1);
  });
  let sx = null;
  viewer.addEventListener('pointerdown', (e) => { sx = e.clientX; });
  viewer.addEventListener('pointerup', (e) => {
    if (sx == null) return;
    const dx = e.clientX - sx; sx = null;
    if (Math.abs(dx) > 50) showPhoto(vIndex + (dx < 0 ? 1 : -1));
  });

  // ── Temperature (background warmth follows the section in the middle) ─────
  const heat = $('.heat');
  const tempEls = $$('[data-temp]');
  let targetTemp = .7, temp = .7, heatRaf = 0;
  function computeTemp() {
    const mid = vh / 2;
    let best = null, bestD = Infinity;
    for (const el of tempEls) {
      const r = el.getBoundingClientRect();
      const d = r.top > mid ? r.top - mid : r.bottom < mid ? mid - r.bottom : 0;
      if (d < bestD) { bestD = d; best = el; }
    }
    if (best) targetTemp = parseFloat(best.dataset.temp);
    if (!heatRaf) heatRaf = requestAnimationFrame(easeTemp);
  }
  // eases toward the target and stops when it gets there (no idle per-frame work; the var lives on the canvas only)
  function easeTemp() {
    const d = targetTemp - temp;
    temp = Math.abs(d) < .004 || !MOTION ? targetTemp : temp + d * .08;
    heat.style.setProperty('--temp', temp.toFixed(3));
    heatRaf = temp === targetTemp ? 0 : requestAnimationFrame(easeTemp);
  }

  // ── Main loop ─────────────────────────────────────────────────────────────
  const nav = $('[data-nav]');
  const bar = $('.progress span');
  let ticking = false;
  function frame() {
    ticking = false;
    const docH = root.scrollHeight - vh;
    bar.style.transform = `scaleX(${clamp(scrollY / Math.max(1, docH)).toFixed(4)})`;
    nav.classList.toggle('is-solid', scrollY > hero.offsetHeight - vh * .9);
    if (MOTION) { heroFrame(); photosFrame(); }
    computeTemp();
  }
  const request = () => { if (!ticking) { ticking = true; requestAnimationFrame(frame); } };
  addEventListener('scroll', request, { passive: true });
  addEventListener('resize', () => { vh = innerHeight; request(); });
  frame();

  // ── Scroll invitation: tap the hint, or the page nudges itself if nobody scrolls ──
  (function invite() {
    let cancelled = false, running = false;
    ['wheel', 'touchstart', 'keydown', 'pointerdown'].forEach((ev) => addEventListener(ev, () => { cancelled = true; }, { passive: true }));
    const ease = (k) => (k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
    const glide = (to, ms) => {
      if (running) return;
      running = true; cancelled = false;
      const from = scrollY, t0 = performance.now();
      const step = (now) => {
        if (cancelled) { running = false; return; }
        const k = Math.min(1, (now - t0) / ms);
        window.scrollTo({ top: from + (to - from) * ease(k), behavior: 'instant' });
        if (k < 1) requestAnimationFrame(step); else running = false;
      };
      requestAnimationFrame(step);
    };
    const heroRange = () => Math.max(0, hero.offsetHeight - innerHeight);
    hint.addEventListener('click', () => (MOTION ? glide(hero.offsetTop + heroRange() * .86, 2000) : $('.intro').scrollIntoView()));
    if (MOTION) setTimeout(() => { if (!cancelled && scrollY < 8) glide(heroRange() * .3, 1800); }, 2200);
  })();

  // ── "Avísame" form → API /api/subscribe ───────────────────────────────────
  (function signup() {
    const form = $('[data-form]');
    if (!form) return;
    const msg = $('[data-msg]', form);
    const btn = $('[data-submit]', form);
    const shownAt = Date.now();
    const KEY = 'rh-avisame';
    const say = (text, bad) => { msg.textContent = text; msg.classList.toggle('is-bad', !!bad); };
    const setErr = (name, text) => {
      const s = $(`[data-err="${name}"]`, form);
      if (s) s.textContent = text || '';
      const f = s && s.closest('.field');
      if (f) f.classList.toggle('bad', !!text);
    };
    // how: 'new' | 'dup' (email already on the list) | 'back' (signed up earlier from this browser)
    const done = (nombre, how) => {
      const first = String(nombre || '').trim().split(/\s+/)[0];
      const n = first ? `, ${first}` : '';
      form.classList.add('is-done');
      say({
        new: `Hecho${n}. Te avisamos de la próxima Red Horse antes que a nadie.`,
        dup: `Ya estabas en la lista${n}. Hemos actualizado tus datos: te avisamos en cuanto haya fecha.`,
        back: `Ya estás en la lista${n}. Te avisamos en cuanto haya fecha.`,
      }[how]);
    };
    try { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s && s.nombre) done(s.nombre, 'back'); } catch (e) { /* storage blocked */ }

    const post = (body, attempt = 0) => {
      const ctrl = 'AbortController' in window ? new AbortController() : null;
      const timer = setTimeout(() => ctrl && ctrl.abort(), 15000);
      // text/plain = simple request: no CORS preflight, one round trip less on a bad connection
      return fetch(`${API}/api/subscribe`, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=UTF-8' }, body: JSON.stringify(body), signal: ctrl ? ctrl.signal : undefined })
        .then((r) => { clearTimeout(timer); return r.json().then((j) => ({ status: r.status, body: j })); })
        .catch((e) => {
          clearTimeout(timer);
          if (attempt < 2) return new Promise((res) => setTimeout(res, 1500 * (attempt + 1))).then(() => post(body, attempt + 1));
          throw e;
        });
    };

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      ['nombre', 'email', 'movil', 'acepta'].forEach((n) => setErr(n, ''));
      say('');
      const el = form.elements;
      const d = { nombre: el.nombre.value.trim(), email: el.email.value.trim(), movil: el.movil.value.trim(), acepta: el.acepta.checked, website: el.website.value, t: Date.now() - shownAt };
      let bad = false;
      if (!d.nombre) { setErr('nombre', 'Dinos cómo te llamas.'); bad = true; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) { setErr('email', 'Revisa el correo.'); bad = true; }
      if (!d.acepta) { setErr('acepta', 'Para avisarte necesitamos tu permiso.'); bad = true; }
      if (bad) { const f = $('.bad input', form) || (!d.acepta && el.acepta); if (f) f.focus(); return; }
      btn.disabled = true; btn.textContent = 'Un momento…';
      post(d).then(({ status, body }) => {
        if (body && body.ok) {
          try { localStorage.setItem(KEY, JSON.stringify({ nombre: body.nombre || d.nombre })); } catch (err) { /* storage blocked */ }
          done(body.nombre || d.nombre, body.status === 'duplicate' ? 'dup' : 'new');
          return;
        }
        if (body && body.fields) Object.entries(body.fields).forEach(([k, v]) => setErr(k, v));
        say((body && body.error) || `Algo ha fallado (${status}). Prueba otra vez.`, true);
      }).catch(() => {
        say('No ha llegado: parece que no hay conexión. Prueba otra vez en un momento.', true);
      }).then(() => { btn.disabled = false; btn.textContent = 'Avísame'; });
    });
  })();
})();
