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
    if (MOTION) heroFrame();
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
