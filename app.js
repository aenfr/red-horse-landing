/* Red Horse · web — scroll engine, heat field, small interactions. Vanilla, no dependencies. */
(() => {
  'use strict';

  // ── Config: fill in when known (never invent) ─────────────────────────────
  const CONFIG = {
    ticketsUrl: 'https://xceed.me/en/valencia/event/red-horse/245729/channel/granviaclub',   // empty = "Entradas · muy pronto"
  };

  const root = document.documentElement;
  const MOTION = root.classList.contains('motion');
  const HOVER = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const MOBILE = matchMedia('(max-width: 640px)').matches;

  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (v, a, b) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  let vw = innerWidth, vh = innerHeight;

  // ── Tickets + calendar ────────────────────────────────────────────────────
  $$('[data-tickets]').forEach((a) => {
    if (CONFIG.ticketsUrl) {
      a.href = CONFIG.ticketsUrl; a.target = '_blank'; a.rel = 'noopener';
    } else if (a.closest('#entradas')) {
      a.removeAttribute('href'); a.setAttribute('aria-disabled', 'true'); a.setAttribute('role', 'link');
      a.textContent = 'Entradas · muy pronto';
    } else {
      a.href = '#evento';
    }
  });
  const ics = $('[data-ics]');
  if (ics) ics.addEventListener('click', () => {
    const body = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Red Horse//ES', 'BEGIN:VEVENT',
      'UID:red-horse-20261024@redhorse', 'DTSTAMP:20261001T000000Z',
      'DTSTART;TZID=Europe/Madrid:20261024T150000', 'DTEND;TZID=Europe/Madrid:20261025T010000',
      'SUMMARY:Red Horse · 24 de octubre',
      'LOCATION:Spook Valencia · Sala Sunbox\\, Valencia',
      'DESCRIPTION:Tardeo de 15:00 a 01:00 en Spook Valencia (Sala Sunbox). Steff presents. Line up: Steff\\, Alexein\\, Tale Of Jus\\, Rik. Del tardeo a la noche.',
      'END:VEVENT', 'END:VCALENDAR',
    ].join('\r\n');
    const url = URL.createObjectURL(new Blob([body], { type: 'text/calendar' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: 'red-horse-24-octubre.ics' });
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  });

  // ── Reveal on enter ───────────────────────────────────────────────────────
  const io = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
  }), { rootMargin: '0px 0px -12% 0px', threshold: 0.15 });
  $$('.reveal, [data-callback]').forEach((el) => io.observe(el));

  // ── Lazy videos ───────────────────────────────────────────────────────────
  // Memory rules for iOS / in-app browsers: a video only loads after it has stayed in view ~0.35 s
  // (a fast flick never loads anything), phones keep at most ONE video loaded, and videos far away unload.
  const videos = $$('video[data-src]');
  const unload = (v) => { if (v.getAttribute('src')) { v.pause(); v.removeAttribute('src'); v.load(); } };
  // load + play the video of the scene that is actually showing, after a short dwell
  const want = (v) => {
    clearTimeout(v._t);
    v._t = setTimeout(() => {
      v._t = 0;
      const fig = v.closest('.media');
      if (fig && !fig.classList.contains('is-active')) return;
      const r = v.getBoundingClientRect();                 // already scrolled past? (fast flick) → don't load
      if (r.bottom < -innerHeight * .2 || r.top > innerHeight * 1.2) return;
      if (MOBILE) videos.forEach((o) => { if (o !== v) unload(o); });
      if (!v.getAttribute('src')) v.src = v.dataset.src;
      if (MOTION) v.play().catch(() => {});
    }, 350);
  };
  const vio = new IntersectionObserver((entries) => entries.forEach((e) => {
    const v = e.target;
    if (e.isIntersecting) want(v); else { clearTimeout(v._t); v.pause(); }
  }), { rootMargin: '10% 0px' });
  const vfar = new IntersectionObserver((entries) => entries.forEach((e) => { if (!e.isIntersecting) { clearTimeout(e.target._t); unload(e.target); } }),
    { rootMargin: '100% 0px' });
  videos.forEach((v) => { vio.observe(v); vfar.observe(v); });

  // ── Word-by-word scroll text ──────────────────────────────────────────────
  const wordEls = $$('[data-words]').map((el) => {
    const words = el.textContent.trim().split(/\s+/);
    el.setAttribute('aria-label', el.textContent.trim());
    el.innerHTML = words.map((w) => `<span class="w" aria-hidden="true">${w}</span> `).join('');
    return { el, spans: $$('.w', el) };
  });

  // ── Scenes ────────────────────────────────────────────────────────────────
  const scenes = {};
  $$('[data-scrub]').forEach((el) => { scenes[el.dataset.scrub] = { el, p: 0 }; });
  const progressOf = (el) => {
    const r = el.getBoundingClientRect();
    return clamp(-r.top / Math.max(1, r.height - vh));
  };

  // around: scatter positions as fractions of the viewport (x, y, rotation)
  const SCATTER = [[-.26, -.30, -7], [.22, -.20, 5], [-.20, -.06, 3], [.24, .06, -6], [-.24, .20, 8], [.18, .28, -4], [-.02, .36, 6]];
  const chips = $$('.chip');
  const podemos = $$('.podemos__words li');
  const seqWords = $$('.sequence__words li');
  const rsBlocks = $$('.rs');
  const track = $('.gallery__track');
  const caption = $('.gallery__caption');
  let capSpans = [];
  if (caption && MOTION) {
    const words = caption.textContent.trim().split(/\s+/);
    caption.setAttribute('aria-label', caption.textContent.trim());
    caption.innerHTML = words.map((w) => `<span class="w" aria-hidden="true">${w}</span> `).join('');
    capSpans = $$('.w', caption);
  }

  // A word that holds the center while its segment is active, entering from below and leaving above.
  function stepWords(items, p, { start = .06, end = .94, hold = 'last', travel = .16, fade = [.2, .48], inner = false } = {}) {
    const n = items.length;
    const seg = (end - start) / Math.max(1, n - 1);
    items.forEach((li, i) => {
      const c = start + i * seg;
      let f = (p - c) / seg;
      if (hold === 'last' && i === n - 1 && f > 0) f = 0;
      if (i === 0 && f < 0) f = 0;           // first one is already there
      const a = smooth(Math.abs(f), fade[0], fade[1]);   // out before the next one comes in: no overlapping text
      // inner: move/fade the word itself, so the GPU layer is word-sized instead of full-screen (iOS memory)
      const t = inner ? li.firstElementChild : li;
      const hidden = a > .995;
      li.style.visibility = hidden ? 'hidden' : 'visible';
      t.style.opacity = (1 - a).toFixed(3);
      t.style.transform = hidden ? '' : `translate3d(0, ${(-Math.sign(f) * a * travel * vh).toFixed(1)}px, 0) scale(${(1 - a * .06).toFixed(3)})`;
    });
  }

  const update = {
    hero(p, el) {
      el.style.setProperty('--horse', smooth(p, .1, .42).toFixed(3));
      el.style.setProperty('--presents', smooth(p, .42, .56).toFixed(3));
      el.style.setProperty('--wm', smooth(p, .46, .7).toFixed(3));
      el.style.setProperty('--info', smooth(p, .66, .84).toFixed(3));
      el.style.setProperty('--hint', (1 - smooth(p, 0, .05)).toFixed(3));
      (el._hint ||= el.querySelector('.hero__hint')).style.pointerEvents = p > .05 ? 'none' : 'auto';
    },
    screens(p, el) {
      // Mobile: phone high, outro below. Wide screens: bigger phone on the left, outro on the right.
      // The stage is 100lvh (can be taller than the visible area while the mobile toolbar shows),
      // so the phone is placed inside the visible part (vh) and the bottom inset is measured on the real stage height.
      const wide = vw >= 900 && vw > vh;
      const H = (el._stage ||= el.querySelector('.stage')).offsetHeight || vh;
      const h0 = wide ? Math.min(vh * .74, 520) : Math.min(vh * .5, Math.min(vw * .66, 300) * 19 / 9);
      const w0 = h0 * 9 / 19, cx = wide ? vw * .3 : vw / 2;
      const it0 = (vh - h0) * (wide ? .5 : .28), ib0 = H - it0 - h0;
      const k = smooth(p, .34, .64);
      const it = lerp(it0, 0, k), ib = lerp(ib0, 0, k);
      el.style.setProperty('--ixl', `${lerp(cx - w0 / 2, 0, k).toFixed(1)}px`);
      el.style.setProperty('--ixr', `${lerp(vw - cx - w0 / 2, 0, k).toFixed(1)}px`);
      el.style.setProperty('--it', `${it.toFixed(1)}px`);
      el.style.setProperty('--ib', `${ib.toFixed(1)}px`);
      el.style.setProperty('--ph', `${(H - it - ib).toFixed(1)}px`);
      el.style.setProperty('--otop', `${(it0 + h0 + 22).toFixed(1)}px`);
      el.style.setProperty('--pw', `${w0.toFixed(1)}px`);
      el.style.setProperty('--r', `${lerp(40, 0, k).toFixed(1)}px`);
      el.style.setProperty('--intro', (1 - smooth(p, .05, .12)).toFixed(3));
      el.style.setProperty('--phone', smooth(p, .12, .2).toFixed(3));
      el.style.setProperty('--outro', (smooth(p, .2, .27) * (1 - smooth(p, .33, .4))).toFixed(3));
      el.style.setProperty('--ignite', smooth(p, .5, .72).toFixed(3));
      el.style.setProperty('--title', smooth(p, .66, .84).toFixed(3));
      el._temp = smooth(p, .45, .75);
    },
    around(p, el) {
      const gather = smooth(p, .1, .42), collapse = smooth(p, .52, .7), appear = smooth(p, 0, .08);
      const n = chips.length, gap = Math.min(54, vh * .065);
      chips.forEach((c, i) => {
        const [sx, sy, rot] = SCATTER[i % SCATTER.length];
        const half = c.offsetWidth / 2, lim = Math.max(0, vw / 2 - half - 10);
        const x0 = clamp(sx * vw, -lim, lim), y0 = sy * vh;
        const x1 = 0, y1 = (i - (n - 1) / 2) * gap;
        const x = lerp(lerp(x0, x1, gather), 0, collapse), y = lerp(lerp(y0, y1, gather), 0, collapse);
        const r = lerp(rot, 0, gather), s = lerp(1, .5, collapse);
        c.style.transform = `translate(-50%,-50%) translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) rotate(${r.toFixed(2)}deg) scale(${s.toFixed(3)})`;
        c.style.opacity = (appear * (1 - collapse)).toFixed(3);
      });
      el.style.setProperty('--final', smooth(p, .64, .84).toFixed(3));
    },
    podemos(p) { stepWords(podemos, p, { start: .08, end: .9, inner: true }); },
    sequence(p) { stepWords(seqWords, p, { start: .1, end: .86, inner: true }); },
    gallery(p, el) {
      if (!track) return;
      const max = Math.max(0, track.scrollWidth - vw);
      el.style.setProperty('--tx', `${(-smooth(p, .06, .9) * max).toFixed(1)}px`);
      const n = capSpans.length;
      capSpans.forEach((s, i) => s.style.setProperty('--o', (.12 + .88 * clamp(smooth(p, .1, .88) * n * 1.1 - i)).toFixed(3)));
    },
    reveal(p, el) {
      el.style.setProperty('--img', smooth(p, 0, .14).toFixed(3));
      stepWords(rsBlocks, p, { start: .16, end: .9, travel: .08 });
    },
  };

  // ── Temperature (heat field) ──────────────────────────────────────────────
  const tempEls = $$('[data-temp]');
  let targetTemp = .7;
  function computeTemp() {
    const mid = vh / 2;
    let best = null, bestD = Infinity;
    for (const el of tempEls) {
      const r = el.getBoundingClientRect();
      const d = r.top > mid ? r.top - mid : r.bottom < mid ? mid - r.bottom : 0;
      if (d < bestD) { bestD = d; best = el; }
    }
    if (!best) return;
    let t = parseFloat(best.dataset.temp);
    if (best.dataset.tempEnd && best._temp != null) t = lerp(t, parseFloat(best.dataset.tempEnd), best._temp);
    targetTemp = t;
  }

  // ── Main loop ─────────────────────────────────────────────────────────────
  const nav = $('[data-nav]');
  const hero = $('.hero');
  const coldItems = $$('.cold__item');
  const chapters = $$('[data-chapter]');
  let ticking = false;

  function frame() {
    ticking = false;
    const docH = document.documentElement.scrollHeight - vh;
    (frame.bar ||= $('.progress span')).style.transform = `scaleX(${clamp(scrollY / Math.max(1, docH)).toFixed(4)})`;
    nav.classList.toggle('is-solid', scrollY > (hero ? hero.offsetHeight - vh * .9 : 40));

    if (MOTION) {
      for (const name in scenes) {
        const s = scenes[name], r = s.el.getBoundingClientRect();
        if (r.bottom < -vh || r.top > vh * 2) continue;      // off-screen: skip work
        s.p = progressOf(s.el);
        update[name] && update[name](s.p, s.el);
      }
      for (const { el, spans } of wordEls) {
        const r = el.getBoundingClientRect();
        if (r.bottom < 0 || r.top > vh) continue;
        const a = vh * .9, b = vh * .42;
        const pr = clamp((a - r.top) / (a - b)), n = spans.length;
        spans.forEach((s, i) => s.style.setProperty('--o', (.12 + .88 * clamp(pr * n * 1.15 - i)).toFixed(3)));
      }
    }
    coldItems.forEach((li) => li.classList.toggle('is-past', li.getBoundingClientRect().top < vh * .3));
    for (const ch of chapters) {
      const r = ch.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh) continue;
      let active = 0, bestD = Infinity;
      $$('.step', ch).forEach((st) => {
        const sr = st.getBoundingClientRect(), d = Math.abs(sr.top + sr.height / 2 - vh * .55);
        if (d < bestD) { bestD = d; active = +st.dataset.step; }
      });
      $$('.media', ch).forEach((m) => m.classList.toggle('is-active', +m.dataset.scene === active));
      // load the showing scene's video (after dwell) when the scene changes, or when it isn't loaded yet
      const v = $(`.media[data-scene="${active}"] video`, ch);
      if (v && (ch._active !== active || (!v.getAttribute('src') && !v._t))) want(v);
      ch._active = active;
    }
    computeTemp();
    if (!MOTION) $('.heat').style.setProperty('--temp', targetTemp.toFixed(3));
  }
  const request = () => { if (!ticking) { ticking = true; requestAnimationFrame(frame); } };
  addEventListener('scroll', request, { passive: true });
  addEventListener('resize', () => { vw = innerWidth; vh = innerHeight; request(); });
  frame();

  // ── Scroll invitation: tap the hint, or the page nudges itself if nobody scrolls ──
  (function invite() {
    const hint = $('.hero__hint');
    if (!hint || !hero) return;
    let cancelled = false, running = false;
    const stop = () => { cancelled = true; };
    ['wheel', 'touchstart', 'keydown', 'pointerdown'].forEach((ev) => addEventListener(ev, stop, { passive: true }));
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
    // tap / click: glide to the wordmark reveal (pointerdown sets cancelled first, so reset happens inside glide)
    hint.addEventListener('click', () => glide(hero.offsetTop + heroRange() * .72, 2000));
    // idle nudge: once, only at the very top, only with motion allowed
    if (MOTION) setTimeout(() => { if (!cancelled && scrollY < 8) glide(heroRange() * .3, 1800); }, 2200);
  })();

  // ── Heat field: one fragment shader, temperature-driven ───────────────────
  (function heat() {
    const canvas = $('.heat');
    // Phones (incl. Instagram / WhatsApp in-app browsers) get the CSS gradient: no GL context, far less memory.
    const gl = MOBILE ? null : canvas.getContext('webgl', { antialias: false, premultipliedAlpha: false, powerPreference: 'low-power' });
    if (!gl) {
      let temp = targetTemp;
      canvas.style.setProperty('--temp', temp.toFixed(3));
      const tick = () => {
        const d = targetTemp - temp;
        if (Math.abs(d) > .002) { temp += d * .08; canvas.style.setProperty('--temp', temp.toFixed(3)); }
        requestAnimationFrame(tick);
      };
      if (MOTION) tick();
      return;
    }
    const vs = 'attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}';
    const fs = `precision mediump float;
uniform vec2 uRes;uniform float uTime;uniform float uTemp;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.-2.*f);
 return mix(mix(h(i),h(i+vec2(1,0)),u.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),u.x),u.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<4;i++){v+=a*n(p);p*=2.03;a*=.5;}return v;}
void main(){
 vec2 uv=gl_FragCoord.xy/uRes; vec2 p=uv*vec2(uRes.x/uRes.y,1.)*2.4;
 float t=uTime*.035;
 vec2 q=vec2(fbm(p+vec2(0.,t)),fbm(p+vec2(5.2,1.3)-t));
 float f=fbm(p+2.4*q+vec2(t*.7,-t*1.6));
 float heat=clamp(f*1.35-.25+(.5-uv.y)*.45,0.,1.);
 vec3 blue=vec3(.17,.11,.96),vio=vec3(.46,.01,.51),red=vec3(.98,.07,.09),ora=vec3(.99,.30,.07),gold=vec3(1.,.75,.13);
 vec3 hot=mix(blue,vio,smoothstep(.0,.28,heat));hot=mix(hot,red,smoothstep(.3,.55,heat));
 hot=mix(hot,ora,smoothstep(.62,.82,heat));hot=mix(hot,gold,smoothstep(.88,1.,heat));
 vec3 ink=vec3(.008,.004,.012),abyss=vec3(.004,.1,.37),steel=vec3(.34,.44,.66);
 vec3 cold=mix(ink,abyss,smoothstep(.25,.75,f));cold=mix(cold,steel,smoothstep(.7,1.,f)*.45);
 vec3 col=mix(cold,hot,uTemp);
 float vig=smoothstep(1.25,.15,length((uv-vec2(.5,.45))*vec2(1.,1.2)));
 col*=mix(.24,.46,uTemp)*(.45+.55*vig);
 col+=(h(gl_FragCoord.xy+fract(uTime*7.)*91.)-.5)*.07;
 gl_FragColor=vec4(col,1.);
}`;
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
    const prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'a');
    gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const uRes = gl.getUniformLocation(prog, 'uRes'), uTime = gl.getUniformLocation(prog, 'uTime'), uTemp = gl.getUniformLocation(prog, 'uTemp');
    const scale = MOBILE ? .35 : .5;
    const size = () => {
      canvas.width = Math.max(2, Math.round(innerWidth * scale)); canvas.height = Math.max(2, Math.round(innerHeight * scale));
      gl.viewport(0, 0, canvas.width, canvas.height); gl.uniform2f(uRes, canvas.width, canvas.height);
    };
    size(); addEventListener('resize', size);
    let temp = targetTemp, last = 0, t0 = performance.now();
    const draw = (now) => {
      requestAnimationFrame(draw);
      if (document.hidden || now - last < 33) return;   // ~30 fps cap
      last = now;
      temp += (targetTemp - temp) * .06;
      gl.uniform1f(uTime, MOTION ? (now - t0) / 1000 : 0);
      gl.uniform1f(uTemp, temp);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    requestAnimationFrame(draw);
  })();

  // ── Pointer niceties (fine pointers only) ─────────────────────────────────
  if (HOVER && MOTION) {
    $$('[data-magnet]').forEach((b) => {
      let raf = 0;
      b.addEventListener('pointermove', (e) => {
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => {
          const r = b.getBoundingClientRect();
          b.style.setProperty('--mx', `${((e.clientX - r.left - r.width / 2) * .22).toFixed(1)}px`);
          b.style.setProperty('--my', `${((e.clientY - r.top - r.height / 2) * .3).toFixed(1)}px`);
        });
      });
      b.addEventListener('pointerleave', () => { b.style.setProperty('--mx', '0px'); b.style.setProperty('--my', '0px'); });
    });
    $$('[data-tilt]').forEach((f) => {
      let raf = 0;
      f.addEventListener('pointermove', (e) => {
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => {
          const r = f.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
          f.style.setProperty('--ry', `${((x - .5) * 12).toFixed(2)}deg`);
          f.style.setProperty('--rx', `${((.5 - y) * 12).toFixed(2)}deg`);
          f.style.setProperty('--gx', `${(x * 100).toFixed(1)}%`);
          f.style.setProperty('--gy', `${(y * 100).toFixed(1)}%`);
        });
      });
      f.addEventListener('pointerleave', () => { f.style.setProperty('--rx', '0deg'); f.style.setProperty('--ry', '0deg'); });
    });
  }
})();
