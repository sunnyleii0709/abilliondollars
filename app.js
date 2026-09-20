/* a billion dollars — scroll from one to a trillion */
(() => {
'use strict';

const $ = s => document.querySelector(s);
const canvas = $('#field');
const ctx = canvas.getContext('2d', { alpha: false });
const els = {
  lead: $('#lead'), word: $('#word'), number: $('#number'), live: $('#live'),
  caption: $('#caption'), hint: $('#hint'), marks: $('#marks'), units: $('#units'),
  track: $('#track'), outro: $('#outro'), outroUnits: $('#outro-units'), outroTop: $('#outro-top'),
  brand: $('#brand'), hud: $('.hud'),
};

const TAU = Math.PI * 2;
const POW = [1, 1e3, 1e6, 1e9, 1e12];
const WORDS = ['one', 'one thousand', 'one million', 'one billion', 'one trillion'];
const MARKS = ['1', '1K', '1M', '1B', '1T'];
const WHITE = '#f2f2f5';

/* timeline, in screen heights */
const PL = 1.3;             // how long each milestone holds
const RL = 3.8;             // how long each zoom-out takes
const SEG = PL + RL;
const END = 4 * SEG + PL;   // end of the trillion plateau
const OUTRO = 0.9;

const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = t => t * t * (3 - 2 * t);

/* ---------------- formatting ---------------- */
const fmtInt = n => Math.round(n).toLocaleString('en-US');
const one = v => Math.round(v * 10) / 10;
function nice(x) {
  if (x >= 1e12) return one(x / 1e12) + ' trillion';
  if (x >= 1e9) return one(x / 1e9) + ' billion';
  if (x >= 1e6) return one(x / 1e6) + ' million';
  if (x >= 1000) return Math.round(x).toLocaleString('en-US');
  if (x >= 10) return String(Math.round(x));
  return String(one(x));
}
function plural(x, word) {
  const s = nice(x);
  return s + ' ' + (s === '1' ? word : word + 's');
}
function duration(sec) {
  if (sec < 60) return plural(sec, 'second');
  if (sec < 3600) return plural(sec / 60, 'minute');
  if (sec < 86400) return plural(sec / 3600, 'hour');
  if (sec < 86400 * 365.25) return plural(sec / 86400, 'day');
  return plural(sec / (86400 * 365.25), 'year');
}
function pct(p) {
  if (p >= 10) return String(Math.round(p));
  if (p >= 1) return String(one(p));
  return p.toPrecision(2).replace(/\.?0+$/, '');
}

/* ---------------- units ---------------- */
const UNITS = [
  {
    id: 'money', label: 'Money', accent: '#4DE4B2', noun: 'dollars', prefix: '$', suffix: '',
    captions: [
      'This is one dollar.',
      'A thousand dollars. A good laptop, or a month of rent. The bright dot is the dollar you started with.',
      'A million dollars. A nice house. That bright block is the thousand from a moment ago.',
      'A billion dollars. Spend a million dollars a day, every single day, and it lasts nearly three years.',
      'A trillion dollars. A million a day since before Rome was founded, and you would still be spending.',
    ],
    live: n => n < 1000 ? '' : 'At $1,000 a day, this lasts ' + duration(n / 1000 * 86400),
  },
  {
    id: 'seconds', label: 'Time', accent: '#5E9BFF', noun: 'seconds', prefix: '', suffix: 'seconds',
    captions: [
      'One second. About one heartbeat.',
      'A thousand seconds. Sixteen minutes. The bright dot is the second you started with.',
      'A million seconds. Eleven and a half days. That bright block is the sixteen minutes from a moment ago.',
      'A billion seconds. Thirty-one years. A whole adulthood.',
      'A trillion seconds. Thirty-one thousand years. Before farming, before writing, before cities.',
    ],
    live: n => n < 60 ? '' : '= ' + duration(n),
  },
  {
    id: 'people', label: 'People', accent: '#FF9F0A', noun: 'people', prefix: '', suffix: 'people',
    captions: [
      'One person. You.',
      'A thousand people. A packed school gym. The bright dot is you.',
      'A million people. A city the size of San Jose. That bright block is the gym.',
      'A billion people. Roughly everyone in North and South America combined.',
      'A trillion people. Every human who has ever lived, eight times over.',
    ],
    live: n => n < 1e5 ? '' : n < 8.2e9
      ? pct(n / 8.2e9 * 100) + '% of everyone alive today'
      : nice(n / 8.2e9) + '× everyone alive today',
  },
  {
    id: 'distance', label: 'Distance', accent: '#BF5AF2', noun: 'meters', prefix: '', suffix: 'meters',
    captions: [
      'One meter. One big step.',
      'A thousand meters. One kilometer, a twelve-minute walk. The bright dot is your first step.',
      'A million meters. A thousand kilometers. London to Milan. That bright block is the walk.',
      'A billion meters. A million kilometers. To the Moon and back, then most of the way there again.',
      'A trillion meters. A billion kilometers. From the Sun out past Jupiter.',
    ],
    live: n => n < 1000 ? '' : n < 3.844e8
      ? '= ' + nice(n / 1000) + ' km'
      : n < 1.496e11
        ? '= ' + nice(n / 3.844e8) + '× the distance to the Moon'
        : '= ' + nice(n / 1.496e11) + '× the distance to the Sun',
  },
  {
    id: 'pixels', label: 'Pixels', accent: '#FF375F', noun: 'pixels', prefix: '', suffix: 'pixels',
    captions: [
      'One pixel.',
      'A thousand pixels. A small app icon. The bright dot is the pixel you started with.',
      'A million pixels. Roughly a 720p photo. That bright block is the icon.',
      'A billion pixels. About 120 4K screens, side by side.',
      'A trillion pixels. Every frame of a ninety-minute 4K movie, all laid out at once.',
    ],
    live: n => {
      if (n < 100) return '';
      if (n < 2073600) { const s = Math.round(Math.sqrt(n)); return '≈ a ' + s + ' × ' + s + ' image'; }
      return '≈ ' + nice(n / 2073600) + ' 1080p screens';
    },
  },
  {
    id: 'storage', label: 'Storage', accent: '#64D2FF', noun: 'bytes', prefix: '', suffix: 'bytes',
    captions: [
      'One byte. A single letter.',
      'A thousand bytes. One kilobyte. A short email. The bright dot is the letter.',
      'A million bytes. One megabyte. A minute of music. That bright block is the email.',
      'A billion bytes. One gigabyte. About 250 songs.',
      'A trillion bytes. One terabyte. A year and a half of music, played nonstop.',
    ],
    live: n => n < 1000 ? '' : n < 1e6
      ? '= ' + nice(n / 1e3) + ' KB'
      : n < 1e9 ? '= ' + nice(n / 1e6) + ' MB'
      : n < 1e12 ? '= ' + nice(n / 1e9) + ' GB' : '= 1 TB',
  },
];

/* ---------------- render ----------------
   One flat field of dots. As the count grows the dots simply get smaller.
   The field is painted with a repeating dot tile (a canvas pattern), so a
   trillion dots cost the same as a thousand. Below ~2 device pixels per dot
   the field becomes a flat fill at the dots' average brightness. */
const DOT = 0.84;                              // dot diameter as a fraction of its cell
const COVER = Math.PI * DOT * DOT / 4;         // how much of a cell a dot covers
const FLAT_AT = 1.25;                          // device px per dot below which we stop drawing dots
const tiles = new Map();
let accentCol = '#4DE4B2';

function tile(pDev, color) {
  const K = clamp(Math.ceil(96 / pDev), 1, 64);            // dots per tile edge
  const size = Math.max(1, Math.round(K * pDev));           // tile edge in device px
  const key = size + '|' + K + '|' + color;
  let t = tiles.get(key);
  if (t) return t;
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const c = cv.getContext('2d');
  const pp = size / K, r = pp * DOT / 2;
  c.fillStyle = color;
  c.beginPath();
  for (let j = 0; j < K; j++) for (let i = 0; i < K; i++) {
    const x = (i + 0.5) * pp, y = (j + 0.5) * pp;
    c.moveTo(x + r, y); c.arc(x, y, r, 0, TAU);
  }
  c.fill();
  t = { pattern: ctx.createPattern(cv, 'repeat'), pitch: pp };
  tiles.set(key, t);
  if (tiles.size > 80) tiles.delete(tiles.keys().next().value);
  return t;
}

/* the first n dots of a grid `cols` wide: full rows plus a partial last row */
function fillShape(c, n, cols, p, style, alpha) {
  const full = Math.floor(n / cols), rem = n - full * cols;
  c.fillStyle = style;
  c.globalAlpha = alpha;
  if (full > 0) c.fillRect(0, 0, cols * p, full * p);
  if (rem > 0) c.fillRect(0, full * p, rem * p, p);
  c.globalAlpha = 1;
}

let W = 0, H = 0, dpr = 1, dbgLock = false, dbgScreens = 0;
const field = { cy: 0, h: 0, w: 0 };
function measureField() {
  const top = els.hud.getBoundingClientRect().bottom + H * 0.025;
  const bottom = H - Math.max(H * 0.09, 56) - 72;
  field.cy = (top + bottom) / 2;
  field.h = Math.max(80, (bottom - top) * 0.96);
  field.w = Math.min(W * 0.84, field.h * 2.4);                  // never a thin wide strip
}

function render(N, acc) {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);

  const A = field.w / field.h;                                   // field aspect
  const pMax = 0.15 * Math.min(W, H);                            // a single dot never grows past this
  let p = Math.min(Math.sqrt(field.w * field.h / N), pMax);      // cell pitch in css px
  const flat = p * dpr < FLAT_AT;
  let tw = null, ta = null;
  if (!flat) {
    tw = tile(p * dpr, WHITE);
    p = tw.pitch / dpr;                                          // snap to what the tile can repeat exactly
    if (acc > 0) ta = tile(p * dpr, accentCol);
  }
  const cols = Math.max(1, Math.ceil(Math.sqrt(N * A)));
  const cw = Math.min(N, Math.sqrt(N * A)) * p;                  // continuous extent, keeps centering smooth
  const ch = Math.max(1, Math.sqrt(N / A)) * p;
  ctx.translate(W / 2 - cw / 2, field.cy - ch / 2);

  if (flat) {
    const lift = 1 + 0.45 * clamp((FLAT_AT - p * dpr) / 1.0, 0, 1); // far-away fields get a little brighter
    const a = Math.min(1, COVER * lift);
    fillShape(ctx, N, cols, p, WHITE, a);
    if (acc > 0) {
      const ac = Math.max(1, Math.ceil(Math.sqrt(acc * A)));
      ctx.globalCompositeOperation = 'destination-out';
      fillShape(ctx, acc, ac, p, '#000', 1);
      ctx.globalCompositeOperation = 'source-over';
      fillShape(ctx, acc, ac, p, accentCol, a);
    }
  } else {
    fillShape(ctx, N, cols, p, tw.pattern, 1);
    if (acc > 0) fillShape(ctx, acc, Math.max(1, Math.ceil(Math.sqrt(acc * A))), p, ta.pattern, 1);
  }
}


/* ---------------- timeline ---------------- */
function timeline(y) {
  y = Math.max(0, y);
  const i = Math.min(4, Math.floor(y / SEG));
  const local = y - i * SEG;
  let m, inPlateau, pt;
  if (i === 4 || local <= PL) { m = 3 * i; inPlateau = true; pt = clamp(local / PL, 0, 1); }
  else { pt = (local - PL) / RL; m = 3 * (i + smooth(pt)); inPlateau = false; }
  const M = POW[i], prev = i === 0 ? 1 : POW[i - 1];
  let acc = M;
  if (inPlateau) { const f = smooth(clamp((pt - 0.3) / 0.6, 0, 1)); acc = prev + (M - prev) * f * f; }
  if (i === 4 && local > PL) acc = M;
  const near = (!inPlateau && pt > 0.5) ? i + 1 : i;
  const pStart = near * SEG, pEnd = pStart + PL;
  const d = y < pStart ? pStart - y : y > pEnd ? y - pEnd : 0;
  const capOp = 1 - clamp(d / 0.45, 0, 1);
  const N = Math.round(Math.pow(10, m));
  return { N, acc: clamp(Math.round(acc), 0, N), near, capOp, y };
}

/* ---------------- state ---------------- */
let unit = UNITS[0];
let targetY = 0, smoothY = 0, vh = 1;
let accFrom = [77, 228, 178], accTo = accFrom.slice(), accT = 1;
let running = false, lastT = 0;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const hud = { number: '', live: '', caption: '', word: '', near: -1, capOp: -1, hint: -1, outro: -1 };

const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
function setAccent() {
  const t = smooth(clamp(accT, 0, 1));
  const c = accFrom.map((v, i) => Math.round(lerp(v, accTo[i], t)));
  accentCol = 'rgb(' + c.join(',') + ')';
  document.documentElement.style.setProperty('--accent', accentCol);
}

function setUnit(id, opts = {}) {
  const u = UNITS.find(x => x.id === id) || UNITS[0];
  if (u !== unit) {
    const cur = accentCol.match(/\d+/g);
    accFrom = (cur && cur.length === 3) ? cur.map(Number) : hex(unit.accent);
    accTo = hex(u.accent); accT = 0;
    unit = u;
  }
  els.lead.textContent = 'How big is a billion ' + u.noun + '?';
  for (const b of els.units.children) b.classList.toggle('active', b.dataset.id === u.id);
  for (const b of els.outroUnits.children) b.hidden = b.dataset.id === u.id;
  if (location.hash.slice(1) !== u.id) history.replaceState(null, '', '#' + u.id);
  hud.number = hud.live = hud.caption = hud.word = '';
  if (opts.top) { window.scrollTo(0, 0); targetY = 0; }
  wake();
}

function scrollToMilestone(i) {
  const y = i * SEG + PL * 0.5;
  window.scrollTo(0, y * vh);
  targetY = y * vh;
  wake();
}

function updateHud(st) {
  const N = st.N;
  const num = unit.prefix + fmtInt(N) + (unit.suffix ? '<span class="suffix">' + unit.suffix + '</span>' : '');
  if (num !== hud.number) { hud.number = num; els.number.innerHTML = num; }
  const live = unit.live(N);
  if (live !== hud.live) { hud.live = live; els.live.textContent = live; }
  const cap = unit.captions[st.near];
  if (cap !== hud.caption) { hud.caption = cap; els.caption.textContent = cap; }
  const word = WORDS[st.near];
  if (word !== hud.word) { hud.word = word; els.word.textContent = word; }
  const outro = clamp((st.y - END) / (OUTRO * 0.7), 0, 1);
  if (st.capOp !== hud.capOp || outro !== hud.outro) {
    hud.capOp = st.capOp;
    els.caption.style.opacity = st.capOp * (1 - outro);
    els.word.style.opacity = st.capOp;
    els.caption.style.transform = 'translateX(-50%) translateY(' + ((1 - st.capOp) * 10) + 'px)';
  }
  if (st.near !== hud.near) {
    hud.near = st.near;
    for (const b of els.marks.children) b.classList.toggle('active', +b.dataset.i === st.near);
  }
  const hint = 1 - clamp(st.y / 0.35, 0, 1);
  if (hint !== hud.hint) { hud.hint = hint; els.hint.style.opacity = hint; els.lead.style.opacity = hint; }
  if (outro !== hud.outro) {
    hud.outro = outro;
    els.outro.style.opacity = outro;
    els.outro.classList.toggle('on', outro > 0.5);
    els.live.style.opacity = 1 - outro;
  }
}

function frame(t) {
  const dt = Math.min(0.05, (t - lastT) / 1000 || 0.016);
  lastT = t;
  const k = reduced ? 1 : 1 - Math.exp(-dt * 5.5);
  smoothY += (targetY - smoothY) * k;
  if (dbgLock) smoothY = targetY;
  if (Math.abs(targetY - smoothY) < 0.05) smoothY = targetY;
  let busy = smoothY !== targetY;
  if (accT < 1) { accT = Math.min(1, accT + dt / 0.6); setAccent(); busy = true; }
  const st = timeline(smoothY / vh);
  render(st.N, st.acc);
  updateHud(st);
  if (busy) requestAnimationFrame(frame); else running = false;
}
function wake() { if (!running) { running = true; lastT = performance.now(); requestAnimationFrame(frame); } }

function resize() {
  W = window.innerWidth; H = window.innerHeight; vh = H;
  dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
  els.track.style.height = ((END + OUTRO + 1) * vh) + 'px';
  measureField();
  targetY = dbgLock ? (smoothY = dbgScreens * vh) : window.scrollY;
  wake();
}

/* ---------------- build UI ---------------- */
for (const u of UNITS) {
  const b = document.createElement('button');
  b.type = 'button'; b.textContent = u.label; b.dataset.id = u.id;
  b.addEventListener('click', () => setUnit(u.id));
  els.units.appendChild(b);
  const o = b.cloneNode(true);
  o.addEventListener('click', () => setUnit(u.id, { top: true }));
  els.outroUnits.appendChild(o);
}
MARKS.forEach((m, i) => {
  const b = document.createElement('button');
  b.type = 'button'; b.dataset.i = i; b.innerHTML = '<span>' + m + '</span>';
  b.setAttribute('aria-label', WORDS[i]);
  b.addEventListener('click', () => scrollToMilestone(i));
  els.marks.appendChild(b);
});
els.outroTop.addEventListener('click', () => { window.scrollTo(0, 0); targetY = 0; wake(); });
els.brand.addEventListener('click', e => { e.preventDefault(); window.scrollTo(0, 0); targetY = 0; wake(); });

window.addEventListener('scroll', () => { targetY = window.scrollY; wake(); }, { passive: true });
window.addEventListener('resize', resize);
if (document.fonts && document.fonts.ready) document.fonts.ready.then(resize);
window.addEventListener('hashchange', () => setUnit(location.hash.slice(1)));
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

const first = UNITS.find(u => u.id === location.hash.slice(1)) || UNITS[0];
unit = first;
accFrom = accTo = hex(first.accent); accT = 1; setAccent();
setUnit(first.id);
resize();
const dbgY = new URLSearchParams(location.search).get('y');
if (dbgY) { dbgLock = true; dbgScreens = parseFloat(dbgY); targetY = smoothY = dbgScreens * vh; wake(); }

/* debug: window.__abd.jump(screens) renders a scroll position immediately */
window.__abd = {
  jump(y) { targetY = smoothY = y * vh; window.scrollTo(0, targetY); const st = timeline(y); const t0 = performance.now(); render(st.N, st.acc); updateHud(st); return { N: st.N, acc: st.acc, ms: Math.round((performance.now() - t0) * 100) / 100, tiles: tiles.size }; },
};
})();
