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
const PL = 1.15;            // how long each milestone holds
const RL = 2.7;             // how long each zoom-out takes
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

/* ---------------- geometry ----------------
   level 0 = a dot. level k = a grid of 1000 level-(k-1) items.
   Grids alternate 40x25 / 25x40 so every level stays screen-shaped. */
const GAP = 0.06;
let geo = [];
let FLAT = [];
let portrait = false;

function orderFor(a, b) {
  const cells = [];
  for (let j = 0; j < b; j++) for (let i = 0; i < a; i++) {
    cells.push({ i, j, t: Math.max((i + 1) / a, (j + 1) / b), d: i / a + j / b });
  }
  cells.sort((p, q) => (p.t - q.t) || (p.d - q.d));
  const cols = [0], rows = [0], full = [0];
  let mc = 0, mr = 0;
  for (const c of cells) {
    mc = Math.max(mc, c.i + 1); mr = Math.max(mr, c.j + 1);
    cols.push(mc); rows.push(mr);
    const k = cols.length - 1;
    full.push(mc * mr === k ? k : full[k - 1]);
  }
  return { order: cells, cols, rows, full };
}

const DOT = 0.84;
function buildGeo() {
  geo = [{ w: DOT, h: DOT, px: 1, py: 1 }];
  FLAT = [Math.PI * DOT * DOT / 4];
  for (let k = 1; k <= 4; k++) {
    const wide = portrait ? (k % 2 === 0) : (k % 2 === 1);
    const a = wide ? 40 : 25, b = wide ? 25 : 40;
    const c = geo[k - 1];
    const w = a * c.px - (c.px - c.w);
    const h = b * c.py - (c.py - c.h);
    const o = orderFor(a, b);
    geo.push({ a, b, w, h, px: w * (1 + GAP), py: h * (1 + GAP), order: o.order, cols: o.cols, rows: o.rows, full: o.full });
    FLAT.push(FLAT[k - 1] * (1000 * c.px * c.py) / (geo[k].px * geo[k].py));
  }
  cache.clear();
}

/* ---------------- render ---------------- */
const cache = new Map();
const LN_B = Math.log(1.04);
let accentCol = '#4DE4B2';

function cached(level, wdev, isA) {
  const b = Math.round(Math.log(wdev) / LN_B);
  const key = level + '|' + b + '|' + (isA ? accentCol : 'w');
  let img = cache.get(key);
  if (img) return img;
  const g = geo[level];
  const sc = Math.exp(b * LN_B) / g.w;
  const cv = document.createElement('canvas');
  cv.width = Math.max(1, Math.ceil(g.w * sc));
  cv.height = Math.max(1, Math.ceil(g.h * sc));
  drawBlock(cv.getContext('2d'), level, POW[level], isA ? POW[level] : 0, 0, 0, sc, 1);
  cache.set(key, cv);
  if (cache.size > 400) cache.delete(cache.keys().next().value);
  return cv;
}

/* When the children of a block are smaller than ~2px we stop drawing them one
   by one (sub-pixel rects alias into stripes) and fill the shape they cover:
   the completed inner rectangle plus a partially-filled ring around it. */
function drawUnion(c, g, cg, n, color, alpha, x, y, s) {
  const cpx = cg.px * s, cpy = cg.py * s, gx = cpx - cg.w * s, gy = cpy - cg.h * s;
  const k = Math.min(1000, Math.ceil(n));
  const kf = g.full[k];
  const ci = g.cols[kf], ri = g.rows[kf], cb = g.cols[k], rb = g.rows[k];
  c.fillStyle = color;
  if (kf > 0) { c.globalAlpha = alpha; c.fillRect(x, y, ci * cpx - gx, ri * cpy - gy); }
  const ring = cb * rb - kf;
  if (ring > 0 && n > kf) {
    c.globalAlpha = alpha * Math.min(1, (n - kf) / ring);
    if (cb > ci) c.fillRect(x + ci * cpx, y, (cb - ci) * cpx - gx, rb * cpy - gy);
    if (rb > ri) c.fillRect(x, y + ri * cpy, ci * cpx - gx, (rb - ri) * cpy - gy);
  }
  c.globalAlpha = 1;
}

function drawBlock(c, level, count, acc, x, y, s, dpr) {
  const g = geo[level];
  if (level === 0) {
    c.fillStyle = acc >= 1 ? accentCol : WHITE;
    if (s < 2) { c.globalAlpha = FLAT[0]; c.fillRect(x, y, s, s); c.globalAlpha = 1; }
    else { c.beginPath(); c.arc(x + s / 2, y + s / 2, s * DOT / 2, 0, TAU); c.fill(); }
    return;
  }
  const cg = geo[level - 1], unit = POW[level - 1];
  const cpx = cg.px * s, cpy = cg.py * s, cw = cg.w * s, ch = cg.h * s;
  if (cpx < 2 || cpy < 2) {
    const n = count / unit, na = clamp(acc, 0, count) / unit;
    // lift the brightness of far-away fills a little; ramps in from 2px so nothing pops
    const A = Math.min(1, FLAT[level - 1] * (1 + 0.45 * clamp((2 - Math.min(cpx, cpy)) / 1.5, 0, 1)));
    if (na >= n) drawUnion(c, g, cg, n, accentCol, A, x, y, s);
    else {
      drawUnion(c, g, cg, n, WHITE, A, x, y, s);
      if (na > 0) {
        c.globalCompositeOperation = 'destination-out';
        drawUnion(c, g, cg, na, '#000', 1, x, y, s);
        c.globalCompositeOperation = 'source-over';
        drawUnion(c, g, cg, na, accentCol, A, x, y, s);
      }
    }
    return;
  }
  const f = Math.floor(count / unit), rem = count - f * unit;
  const dots = level === 1;
  const ord = g.order;
  let pathA = null, pathW = null;
  for (let i = 0; i < f; i++) {
    const o = ord[i];
    const cx = x + o.i * cpx, cy = y + o.j * cpy;
    const lo = i * unit;
    let isA;
    if (lo + unit <= acc) isA = true;
    else if (lo >= acc) isA = false;
    else { drawBlock(c, level - 1, unit, acc - lo, cx, cy, s, dpr); continue; }
    if (dots) {
      const p = isA ? (pathA || (pathA = new Path2D())) : (pathW || (pathW = new Path2D()));
      p.moveTo(cx + cw, cy + ch / 2); p.arc(cx + cw / 2, cy + ch / 2, cw / 2, 0, TAU);
    } else {
      c.drawImage(cached(level - 1, cw * dpr, isA), cx, cy, cw, ch);
    }
  }
  if (pathW) { c.fillStyle = WHITE; c.fill(pathW); }
  if (pathA) { c.fillStyle = accentCol; c.fill(pathA); }
  if (rem > 0) {
    const o = ord[f];
    drawBlock(c, level - 1, rem, clamp(acc - f * unit, 0, rem), x + o.i * cpx, y + o.j * cpy, s, dpr);
  }
}

function levelFor(N) { return N <= 1e3 ? 1 : N <= 1e6 ? 2 : N <= 1e9 ? 3 : 4; }

function camera(N, W, H) {
  const L = levelFor(N);
  const g = geo[L], cg = geo[L - 1];
  const n = N / POW[L - 1];
  const k0 = Math.floor(n), k1 = Math.min(1000, k0 + 1), fr = n - k0;
  const cols = lerp(g.cols[k0], g.cols[k1], fr);
  const rows = lerp(g.rows[k0], g.rows[k1], fr);
  const ew = cols * cg.px - (cg.px - cg.w);
  const eh = rows * cg.py - (cg.py - cg.h);
  const sMax = 0.15 * Math.min(W, H);
  const s = Math.min(0.84 * W / ew, field.h / eh, sMax);
  return { L, s, ox: W / 2 - ew / 2 * s, oy: field.cy - eh / 2 * s };
}

let W = 0, H = 0, dpr = 1, dbgLock = false;
const field = { cy: 0, h: 0 };
function measureField() {
  const top = els.hud.getBoundingClientRect().bottom + H * 0.035;
  const bottom = H - Math.max(H * 0.09, 56) - 84;
  field.cy = (top + bottom) / 2;
  field.h = Math.max(80, (bottom - top) * 0.96);
}
function render(N, acc) {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);
  const cam = camera(N, W, H);
  drawBlock(ctx, cam.L, N, acc, cam.ox, cam.oy, cam.s, dpr);
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
  const k = reduced ? 1 : 1 - Math.exp(-dt * 6.5);
  smoothY += (targetY - smoothY) * k;
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
  const p = H > W;
  if (p !== portrait || !geo.length) { portrait = p; buildGeo(); }
  els.track.style.height = ((END + OUTRO + 1) * vh) + 'px';
  measureField();
  if (!dbgLock) targetY = window.scrollY;
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
if (dbgY) { dbgLock = true; targetY = smoothY = parseFloat(dbgY) * vh; wake(); }

/* debug: window.__abd.jump(screens) renders a scroll position immediately */
window.__abd = {
  jump(y) { targetY = smoothY = y * vh; window.scrollTo(0, targetY); const st = timeline(y); const t0 = performance.now(); render(st.N, st.acc); updateHud(st); return { N: st.N, acc: st.acc, ms: Math.round((performance.now() - t0) * 100) / 100, cache: cache.size }; },
};
})();
