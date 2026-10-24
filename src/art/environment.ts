import { svg, type ArtSet } from './types';

/*
 * Environment art: seamless 512x512 ground tiles (generated deterministically with a seeded RNG so
 * every detail that crosses an edge is duplicated on the opposite edge) plus outlined, cel-shaded
 * decoration props for the three maps (meadow, graveyard, castle).
 */

const OL = '#2a1f3d';
const T = 512;

type Pt = [number, number];
type Rand = () => number;

/** Small deterministic PRNG (mulberry32). */
function mulberry32(seed: number): Rand {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Number -> compact string with one decimal. */
const n = (v: number): string => String(Math.round(v * 10) / 10);
/** Integer formatter for big generated shapes where sub-pixel precision does not matter. */
const ni = (v: number): string => String(Math.round(v));
const range = (r: Rand, a: number, b: number): number => a + (b - a) * r();
const pick = <V>(r: Rand, arr: readonly V[]): V => arr[Math.floor(r() * arr.length)];
const at = (x: number, y: number, rot = 0): string =>
  `transform="translate(${n(x)} ${n(y)})${rot ? ` rotate(${n(rot)})` : ''}"`;

/** Emits draw() at (x, y) plus copies shifted by ±T so anything within `r` of an edge tiles seamlessly. */
function wrap(x: number, y: number, r: number, draw: (x: number, y: number) => string): string {
  const xs = [x];
  const ys = [y];
  if (x - r < 0) xs.push(x + T);
  if (x + r > T) xs.push(x - T);
  if (y - r < 0) ys.push(y + T);
  if (y + r > T) ys.push(y - T);
  let s = '';
  for (const xx of xs) for (const yy of ys) s += draw(xx, yy);
  return s;
}

function torDist(a: Pt, b: Pt): number {
  let dx = Math.abs(a[0] - b[0]);
  let dy = Math.abs(a[1] - b[1]);
  dx = Math.min(dx, T - dx);
  dy = Math.min(dy, T - dy);
  return Math.hypot(dx, dy);
}

/** Irregular (non-grid) scatter on the torus with a minimum spacing; also avoids points in `taken`. */
function scatter(r: Rand, count: number, minDist: number, taken: Pt[] = [], takenDist = minDist): Pt[] {
  const out: Pt[] = [];
  for (let tries = 0; out.length < count && tries < count * 80; tries++) {
    const p: Pt = [r() * T, r() * T];
    if (out.every((q) => torDist(p, q) >= minDist) && taken.every((q) => torDist(p, q) >= takenDist)) {
      out.push(p);
    }
  }
  return out;
}

/** Closed Catmull-Rom spline through the points, as an SVG path. */
function closedSpline(p: Pt[]): string {
  const k = p.length;
  let d = `M${n(p[0][0])} ${n(p[0][1])}`;
  for (let i = 0; i < k; i++) {
    const p0 = p[(i - 1 + k) % k];
    const p1 = p[i];
    const p2 = p[(i + 1) % k];
    const p3 = p[(i + 2) % k];
    d +=
      `C${n(p1[0] + (p2[0] - p0[0]) / 6)} ${n(p1[1] + (p2[1] - p0[1]) / 6)} ` +
      `${n(p2[0] - (p3[0] - p1[0]) / 6)} ${n(p2[1] - (p3[1] - p1[1]) / 6)} ${n(p2[0])} ${n(p2[1])}`;
  }
  return d + 'Z';
}

/** Irregular rounded blob centred on 0,0. */
function blob(r: Rand, rx: number, ry: number, k = 8, jit = 0.22): string {
  const rot = r() * Math.PI;
  const cr = Math.cos(rot);
  const sr = Math.sin(rot);
  const pts: Pt[] = [];
  for (let i = 0; i < k; i++) {
    const a = ((i + range(r, -0.25, 0.25)) / k) * Math.PI * 2;
    const s = 1 + range(r, -jit, jit);
    const x = Math.cos(a) * rx * s;
    const y = Math.sin(a) * ry * s;
    pts.push([x * cr - y * sr, x * sr + y * cr]);
  }
  return closedSpline(pts);
}

/** A little grass tuft (2-4 curved blades) rooted at 0,0, as stroke-only path data. */
function tuft(r: Rand, h: number): string {
  const roll = r();
  const blades = roll < 0.3 ? 2 : roll < 0.8 ? 3 : 4;
  const spread = h * 0.5;
  let d = '';
  for (let i = 0; i < blades; i++) {
    const t = i / (blades - 1) - 0.5;
    const bx = t * spread;
    const bh = h * (1 - Math.abs(t) * 0.55) * range(r, 0.85, 1.1);
    const lean = t * h * 0.8 + range(r, -1.5, 1.5);
    d += `M${n(bx)} 0Q${n(bx + lean * 0.15)} ${n(-bh * 0.6)} ${n(bx + lean)} ${n(-bh)}`;
  }
  return d;
}

/** Rounded polygon path (corner radius `rad`). */
function roundedPoly(p: Pt[], rad: number): string {
  const k = p.length;
  let d = '';
  for (let i = 0; i < k; i++) {
    const a = p[(i - 1 + k) % k];
    const b = p[i];
    const c = p[(i + 1) % k];
    const la = Math.hypot(a[0] - b[0], a[1] - b[1]);
    const lc = Math.hypot(c[0] - b[0], c[1] - b[1]);
    const ra = Math.min(rad, la / 2);
    const rc = Math.min(rad, lc / 2);
    d +=
      `${i === 0 ? 'M' : 'L'}${ni(b[0] + ((a[0] - b[0]) / la) * ra)} ${ni(b[1] + ((a[1] - b[1]) / la) * ra)}` +
      `Q${ni(b[0])} ${ni(b[1])} ${ni(b[0] + ((c[0] - b[0]) / lc) * rc)} ${ni(b[1] + ((c[1] - b[1]) / lc) * rc)}`;
  }
  return d + 'Z';
}

/** Generates `count` patches of one colour (irregular blobs), seamlessly wrapped. */
function patches(r: Rand, fill: string, count: number, minDist: number, rMin: number, rMax: number, opacity = 1): string {
  let s = `<g fill="${fill}"${opacity < 1 ? ` opacity="${opacity}"` : ''}>`;
  for (const [x, y] of scatter(r, count, minDist)) {
    const rx = range(r, rMin, rMax);
    const d = blob(r, rx, rx * range(r, 0.55, 0.85), 9, 0.2);
    s += wrap(x, y, rx * 1.3, (a, b) => `<path ${at(a, b)} d="${d}"/>`);
  }
  return s + '</g>';
}

/** Generates scattered grass tufts in one colour. */
function tufts(r: Rand, color: string, width: number, pts: Pt[], hMin: number, hMax: number): string {
  let s = `<g fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round">`;
  for (const [x, y] of pts) {
    const h = range(r, hMin, hMax);
    const d = tuft(r, h);
    s += wrap(x, y, h + 4, (a, b) => `<path ${at(a, b)} d="${d}"/>`);
  }
  return s + '</g>';
}

/** Tiny 5-petal flowers (top-down) for the ground. */
function groundFlowers(r: Rand, pts: Pt[], kinds: readonly [string, string][]): string {
  let petals = '';
  let centers = '';
  for (const [x, y] of pts) {
    const count = 1 + Math.floor(r() * 3);
    for (let i = 0; i < count; i++) {
      const fx = x + (i === 0 ? 0 : range(r, -11, 11));
      const fy = y + (i === 0 ? 0 : range(r, -9, 9));
      const [pc, cc] = pick(r, kinds);
      const s = range(r, 0.85, 1.15);
      const rot = r() * 72;
      let pd = '';
      for (let k = 0; k < 5; k++) {
        const a = ((rot + k * 72) * Math.PI) / 180;
        pd += `<circle cx="${n(Math.cos(a) * 2.8 * s)}" cy="${n(Math.sin(a) * 2.8 * s)}" r="${n(2.3 * s)}"/>`;
      }
      petals += wrap(fx, fy, 8, (a, b) => `<g ${at(a, b)} fill="${pc}">${pd}</g>`);
      centers += wrap(fx, fy, 8, (a, b) => `<circle cx="${n(a)}" cy="${n(b)}" r="${n(1.7 * s)}" fill="${cc}"/>`);
    }
  }
  return petals + centers;
}

/** Small top-down pebbles / stones. */
function pebbles(r: Rand, pts: Pt[], size: [number, number], shade: string, main: string, hl: string): string {
  let s = '';
  for (const [x, y] of pts) {
    const count = r() < 0.4 ? 2 : 1;
    for (let i = 0; i < count; i++) {
      const px = x + (i ? range(r, -12, 12) : 0);
      const py = y + (i ? range(r, -8, 8) : 0);
      const rx = range(r, size[0], size[1]) * (i ? 0.7 : 1);
      const ry = rx * range(r, 0.6, 0.8);
      const rot = range(r, -30, 30);
      const g =
        `<ellipse cy="${n(ry * 0.25)}" rx="${n(rx)}" ry="${n(ry)}" fill="${shade}"/>` +
        `<ellipse cx="${n(-rx * 0.08)}" cy="${n(-ry * 0.12)}" rx="${n(rx * 0.88)}" ry="${n(ry * 0.8)}" fill="${main}"/>` +
        `<ellipse cx="${n(-rx * 0.35)}" cy="${n(-ry * 0.4)}" rx="${n(rx * 0.32)}" ry="${n(ry * 0.25)}" fill="${hl}"/>`;
      s += wrap(px, py, rx + 2, (a, b) => `<g ${at(a, b, rot)}>${g}</g>`);
    }
  }
  return s;
}

// ---------------------------------------------------------------------------------------------
// Ground tiles
// ---------------------------------------------------------------------------------------------

function meadowTile(): string {
  const r = mulberry32(20240611);
  let s = `<rect width="${T}" height="${T}" fill="#77bf55"/>`;
  s += patches(r, '#71b950', 8, 130, 45, 85);
  s += patches(r, '#7dc55a', 8, 130, 40, 80);
  s += patches(r, '#84c960', 6, 150, 18, 34);
  const flowerPts = scatter(r, 9, 110);
  const pebblePts = scatter(r, 4, 160, flowerPts, 50);
  const taken = [...flowerPts, ...pebblePts];
  const darkTufts = scatter(r, 62, 34, taken, 20);
  const lightTufts = scatter(r, 38, 34, [...taken, ...darkTufts], 18);
  s += tufts(r, '#5ea443', 2.6, darkTufts, 9, 15);
  s += tufts(r, '#93d26f', 2.4, lightTufts, 8, 13);
  s += pebbles(r, pebblePts, [4, 6.5], '#7f9a68', '#a9b99a', '#cdd7c0');
  s += groundFlowers(r, flowerPts, [
    ['#f7f9ef', '#ffd84a'],
    ['#f7f9ef', '#ffd84a'],
    ['#ffe766', '#ff9f3a'],
  ]);
  return s;
}

function graveyardTile(): string {
  const r = mulberry32(666013);
  let s = `<rect width="${T}" height="${T}" fill="#7a8769"/>`;
  s += patches(r, '#75826a', 8, 130, 45, 85);
  s += patches(r, '#7f8c6f', 7, 130, 40, 80);
  // a few bare dirt patches: dirt blob, slightly lighter worn centre, a few clods
  const dirtPts = scatter(r, 4, 210);
  let dirt = '';
  for (const [x, y] of dirtPts) {
    const rx = range(r, 40, 62);
    const ry = rx * range(r, 0.5, 0.68);
    const mid = blob(r, rx, ry, 10, 0.2);
    const inner = blob(r, rx * 0.6, ry * 0.5, 8, 0.25);
    let clods = '';
    for (let i = 0; i < 4; i++) {
      clods += `<circle cx="${n(range(r, -rx * 0.6, rx * 0.6))}" cy="${n(range(r, -ry * 0.5, ry * 0.5))}" r="${n(range(r, 1.6, 3))}"/>`;
    }
    dirt += wrap(x, y, rx * 1.3, (a, b) =>
      `<g ${at(a, b)}><path d="${mid}" fill="#84775c"/>` +
      `<path transform="translate(3 2)" d="${inner}" fill="#8b7e62"/><g fill="#76694f">${clods}</g></g>`,
    );
  }
  s += dirt;
  const stonePts = scatter(r, 9, 120, dirtPts, 50);
  const leafPts = scatter(r, 9, 90, stonePts, 30);
  const taken = [...stonePts, ...leafPts];
  const dryTufts = scatter(r, 48, 36, taken, 20);
  const darkTufts = scatter(r, 40, 36, [...taken, ...dryTufts], 18);
  s += tufts(r, '#66735a', 2.6, darkTufts, 9, 14);
  s += tufts(r, '#a39c74', 2.4, dryTufts, 8, 14);
  s += pebbles(r, stonePts, [4.5, 8], '#6f7166', '#9a9b94', '#b9bab2');
  // fallen leaves
  let leaves = '<g fill="#9c7a52">';
  for (const [x, y] of leafPts) {
    const rot = r() * 360;
    leaves += wrap(x, y, 8, (a, b) => `<path ${at(a, b, rot)} d="M-5 0Q0 -4 5 0Q0 4 -5 0Z"/>`);
  }
  s += leaves + '</g>';
  return s;
}

function castleTile(): string {
  const r = mulberry32(31337);
  const MORTAR = '#58516d';
  const LIP = '#5d5672';
  const TONES = ['#6f6886', '#6b6482', '#736c8a', '#686180', '#706a84'] as const;
  const HL = '#7c7594';
  const SPECK = '#655e7b';
  const CRACK = '#554e69';
  let s = `<rect width="${T}" height="${T}" fill="${MORTAR}"/>`;

  // Row-based irregular flagstones: the layout is periodic in both axes by construction.
  const rowsN = 5;
  let hs = Array.from({ length: rowsN }, () => range(r, 0.7, 1.3));
  const sumH = hs.reduce((a, b) => a + b, 0);
  hs = hs.map((h) => (h / sumH) * T);
  const stones: { x: number; y: number; w: number; h: number }[] = [];
  let y = 0;
  for (const h of hs) {
    const ws: number[] = [];
    let acc = 0;
    while (acc < T - 80) {
      const w = range(r, 80, 170);
      ws.push(w);
      acc += w;
    }
    const k = T / acc;
    let x = r() * T;
    for (const w0 of ws) {
      const w = w0 * k;
      if (r() < 0.2) {
        const split = range(r, 0.38, 0.62) * h;
        stones.push({ x, y, w, h: split }, { x, y: y + split, w, h: h - split });
      } else if (w > 120 && r() < 0.35) {
        const split = range(r, 0.35, 0.65) * w;
        stones.push({ x, y, w: split, h }, { x: x + split, y, w: w - split, h });
      } else {
        stones.push({ x, y, w, h });
      }
      x += w;
    }
    y += h;
  }

  const g = 3.2; // half mortar width
  for (const st of stones) {
    const cx = (st.x % T) + st.w / 2;
    const cy = st.y + st.h / 2;
    const hw = st.w / 2 - g;
    const hh = st.h / 2 - g;
    const j = (): number => range(r, -3, 3);
    const corners: Pt[] = [
      [-hw + j(), -hh + j()],
      [hw + j(), -hh + j()],
      [hw + j(), hh + j()],
      [-hw + j(), hh + j()],
    ];
    const d = roundedPoly(corners, 8);
    const tone = pick(r, TONES);
    // top-left highlight line, inset
    const ins = (p: Pt, f = 5): Pt => [p[0] - Math.sign(p[0]) * f, p[1] - Math.sign(p[1]) * f];
    const [c0, c1, , c3] = corners.map((p) => ins(p));
    const hlD =
      `M${n(c3[0] * 0.2 + c0[0] * 0.8)} ${n(c3[1] * 0.45 + c0[1] * 0.55)}` +
      `L${n(c0[0])} ${n(c0[1])}L${n(c0[0] * 0.35 + c1[0] * 0.65)} ${n(c0[1] * 0.35 + c1[1] * 0.65)}`;
    let inner = `<path d="${hlD}" fill="none" stroke="${HL}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>`;
    // speckles
    const specks = Math.floor(range(r, 0, 3));
    for (let i = 0; i < specks; i++) {
      inner += `<circle cx="${n(range(r, -hw * 0.7, hw * 0.7))}" cy="${n(range(r, -hh * 0.6, hh * 0.7))}" r="${n(range(r, 1.2, 2.4))}" fill="${SPECK}"/>`;
    }
    // occasional crack from an edge
    if (r() < 0.28) {
      const side = r() < 0.5 ? -1 : 1;
      let px = side * hw;
      let py = range(r, -hh * 0.5, hh * 0.5);
      let cd = `M${n(px)} ${n(py)}`;
      for (let i = 0; i < 3; i++) {
        px -= side * range(r, hw * 0.12, hw * 0.25);
        py += range(r, -10, 10);
        py = Math.max(-hh + 6, Math.min(hh - 6, py));
        cd += `L${n(px)} ${n(py)}`;
      }
      inner += `<path d="${cd}" fill="none" stroke="${CRACK}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`;
    }
    const body =
      `<path transform="translate(1.5 3)" d="${d}" fill="${LIP}"/>` + `<path d="${d}" fill="${tone}"/>` + inner;
    s += wrap(cx, cy, Math.max(st.w, st.h) / 2 + 6, (a, b) => `<g ${at(a, b)}>${body}</g>`);
  }

  // a little moss in the mortar joints
  let moss = '';
  for (const [x, y] of scatter(r, 9, 120)) {
    const count = 3 + Math.floor(r() * 4);
    let m = '';
    for (let i = 0; i < count; i++) {
      const col = i % 3 === 2 ? '#86a06a' : '#6f8a5c';
      m += `<circle cx="${n(range(r, -12, 12))}" cy="${n(range(r, -6, 6))}" r="${n(range(r, 2.2, 4.6))}" fill="${col}"/>`;
    }
    const rot = r() * 180;
    moss += wrap(x, y, 18, (a, b) => `<g ${at(a, b, rot)} opacity=".85">${m}</g>`);
  }
  s += moss;
  return s;
}

// ---------------------------------------------------------------------------------------------
// Decoration helpers
// ---------------------------------------------------------------------------------------------

type Circle = [number, number, number];

/** Circles unioned with one clean outline: outline pass, then shade fill, then lit fill shifted up-left. */
function puff(c: Circle[], shade: string, main: string, sw = 4, shift: Pt = [-3, -5], shrink = 6): string {
  const circ = (list: Circle[], dx = 0, dy = 0, dr = 0): string =>
    list.map(([x, y, rr]) => `<circle cx="${n(x + dx)}" cy="${n(y + dy)}" r="${n(rr - dr)}"/>`).join('');
  return (
    `<g fill="${OL}" stroke="${OL}" stroke-width="${sw * 2}">${circ(c)}</g>` +
    `<g fill="${shade}">${circ(c)}</g>` +
    `<g fill="${main}">${circ(c, shift[0], shift[1], shrink)}</g>`
  );
}

/** Tapered spline (branch/root) polygon from w0 to w1 with a rounded tip. */
function taperPts(pts: Pt[], seg = 4): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(i - 1, 0)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(i + 2, pts.length - 1)];
    for (let s = 0; s < seg; s++) {
      const t = s / seg;
      const t2 = t * t;
      const t3 = t2 * t;
      const f = (a: number, b: number, c: number, d: number): number =>
        0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}

interface Branch {
  d: string;
  shade: string;
  hl: string;
}

/** Builds a tapered branch outline plus a shade strip (lower-right side) and a highlight streak. */
function branch(pts: Pt[], w0: number, w1: number): Branch {
  const sm = taperPts(pts);
  const N = sm.length;
  const L: Pt[] = [];
  const R: Pt[] = [];
  const S: Pt[] = [];
  const H: Pt[] = [];
  const normals: Pt[] = [];
  let side = 0;
  for (let i = 0; i < N; i++) {
    const a = sm[Math.max(i - 1, 0)];
    const b = sm[Math.min(i + 1, N - 1)];
    let tx = b[0] - a[0];
    let ty = b[1] - a[1];
    const len = Math.hypot(tx, ty) || 1;
    tx /= len;
    ty /= len;
    normals.push([-ty, tx]);
    side += -ty + tx; // dot(normal, (1,1))
  }
  // shade on the side whose normal points to the lower-right (away from top-left light)
  const sgn = side >= 0 ? 1 : -1;
  for (let i = 0; i < N; i++) {
    const p = sm[i];
    const [nx, ny] = normals[i];
    const w = (w0 + (w1 - w0) * (i / (N - 1))) / 2;
    L.push([p[0] + nx * w, p[1] + ny * w]);
    R.push([p[0] - nx * w, p[1] - ny * w]);
    S.push([p[0] + nx * w * 0.15 * sgn, p[1] + ny * w * 0.15 * sgn]);
    H.push([p[0] - nx * w * 0.5 * sgn, p[1] - ny * w * 0.5 * sgn]);
  }
  const end = sm[N - 1];
  const prev = sm[N - 2];
  const el = Math.hypot(end[0] - prev[0], end[1] - prev[1]) || 1;
  const tip: Pt = [end[0] + ((end[0] - prev[0]) / el) * w1, end[1] + ((end[1] - prev[1]) / el) * w1];
  const line = (arr: Pt[]): string => arr.map((p) => `L${ni(p[0])} ${ni(p[1])}`).join('');
  const d =
    `M${ni(L[0][0])} ${ni(L[0][1])}` +
    line(L.slice(1)) +
    `Q${ni(tip[0])} ${ni(tip[1])} ${ni(R[N - 1][0])} ${ni(R[N - 1][1])}` +
    line(R.slice(0, -1).reverse()) +
    'Z';
  const edge = sgn > 0 ? L : R;
  const shade =
    `M${ni(S[0][0])} ${ni(S[0][1])}` + line(S.slice(1)) + line(edge.slice().reverse()) + 'Z';
  const hlEnd = Math.floor(N * 0.7);
  const hl = `M${ni(H[1][0])} ${ni(H[1][1])}` + line(H.slice(2, hlEnd));
  return { d, shade, hl };
}

const shadow = (cx: number, cy: number, rx: number, ry: number): string =>
  `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${OL}" opacity=".2"/>`;

const SW = `stroke="${OL}" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"`;
const SW3 = `stroke="${OL}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"`;

// ---------------------------------------------------------------------------------------------
// Meadow decorations
// ---------------------------------------------------------------------------------------------

function treeArt(): string {
  const canopy: Circle[] = [
    [85, 64, 48],
    [48, 62, 30],
    [122, 62, 30],
    [44, 100, 34],
    [126, 100, 34],
    [62, 132, 30],
    [108, 132, 30],
    [85, 120, 40],
  ];
  return (
    shadow(85, 199, 48, 8) +
    // trunk with root flare
    `<path d="M71 150C72 170 70 184 58 198Q72 194 80 199Q90 195 100 199Q110 195 114 198C102 184 99 170 100 150Z" fill="#9a6a43" ${SW}/>` +
    `<path d="M92 156C93 172 96 186 104 196Q108 196 112 197C101 184 98 170 98 156Z" fill="#7a4f32"/>` +
    `<path d="M77 162C78 172 77 182 72 190" fill="none" stroke="#c38d5d" stroke-width="3.5" stroke-linecap="round"/>` +
    puff(canopy, '#3a8e3c', '#52b446') +
    // fluffy clump lines
    `<g fill="none" stroke="#3a8e3c" stroke-width="3.5" stroke-linecap="round">` +
    `<path d="M56 110Q60 100 70 101"/><path d="M100 88Q106 80 115 82"/><path d="M80 142Q84 133 93 134"/>` +
    `<path d="M36 80Q38 72 46 71"/><path d="M118 126Q122 118 130 118"/></g>` +
    // highlights
    `<g fill="#8fdc6c"><ellipse cx="66" cy="40" rx="15" ry="9" transform="rotate(-28 66 40)"/>` +
    `<ellipse cx="36" cy="88" rx="9" ry="6" transform="rotate(-40 36 88)"/>` +
    `<ellipse cx="40" cy="50" rx="7" ry="4.5" transform="rotate(-35 40 50)"/>` +
    `<ellipse cx="96" cy="104" rx="9" ry="5.5" transform="rotate(-25 96 104)"/></g>` +
    `<ellipse cx="60" cy="37" rx="5" ry="3" transform="rotate(-28 60 37)" fill="#fff" opacity=".7"/>`
  );
}

function bushArt(): string {
  const c: Circle[] = [
    [28, 50, 20],
    [72, 50, 20],
    [50, 34, 23],
    [34, 34, 17],
    [66, 34, 17],
    [50, 52, 18],
  ];
  const berries: Pt[] = [
    [30, 40],
    [44, 28],
    [62, 44],
    [72, 32],
    [50, 52],
    [24, 54],
    [78, 54],
  ];
  return (
    shadow(50, 70, 40, 5) +
    puff(c, '#2f7f3a', '#41a046', 4, [-2.5, -4], 5) +
    `<g fill="#73cf5f"><ellipse cx="40" cy="22" rx="9" ry="5" transform="rotate(-25 40 22)"/>` +
    `<ellipse cx="18" cy="42" rx="5" ry="3.5" transform="rotate(-40 18 42)"/></g>` +
    berries
      .map(
        ([x, y]) =>
          `<circle cx="${x}" cy="${y}" r="5" fill="#ff4d6a" stroke="${OL}" stroke-width="2.5"/>` +
          `<circle cx="${x - 1.6}" cy="${y - 1.6}" r="1.6" fill="#fff" opacity=".85"/>`,
      )
      .join('')
  );
}

function rockArt(): string {
  return (
    shadow(40, 53, 34, 5) +
    `<path d="M9 48C5 36 12 18 30 12C46 6 64 10 71 26C77 38 74 49 64 52C46 55 24 55 9 48Z" fill="#a9abbb" ${SW}/>` +
    `<path d="M66 28C71 38 70 46 62 49C46 52 28 52 14 47C26 50 46 49 56 44C63 40 66 34 66 28Z" fill="#7f8196"/>` +
    `<path d="M48 30L44 38L49 42" fill="none" stroke="#7f8196" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>` +
    `<path d="M15 38C15 30 19 24 24 21" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round" opacity=".7"/>` +
    // moss cap
    `<path d="M22 18C30 9 50 7 62 16C66 19 65 24 60 23C57 27 52 27 50 23C46 27 40 27 38 23C33 27 25 25 22 18Z" fill="#62b347" ${SW}/>` +
    `<path d="M32 15C38 11 46 11 52 13" fill="none" stroke="#9be07a" stroke-width="3" stroke-linecap="round"/>`
  );
}

function flowersArt(): string {
  const flower = (cx: number, cy: number, r: number, petal: string, center: string, rot: number): string => {
    let o = '';
    let f = '';
    for (let k = 0; k < 5; k++) {
      const a = ((rot + k * 72) * Math.PI) / 180;
      const x = cx + Math.cos(a) * r * 0.62;
      const y = cy + Math.sin(a) * r * 0.62;
      o += `<circle cx="${n(x)}" cy="${n(y)}" r="${n(r * 0.48)}"/>`;
      f += `<circle cx="${n(x)}" cy="${n(y)}" r="${n(r * 0.48)}"/>`;
    }
    return (
      `<g fill="${OL}" stroke="${OL}" stroke-width="6">${o}</g><g fill="${petal}">${f}</g>` +
      `<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(r * 0.36)}" fill="${center}" stroke="${OL}" stroke-width="2"/>` +
      `<circle cx="${n(cx - r * 0.55)}" cy="${n(cy - r * 0.6)}" r="${n(r * 0.16)}" fill="#fff" opacity=".8"/>`
    );
  };
  return (
    shadow(35, 39, 26, 3.5) +
    // leaves
    `<g fill="#4fae46" ${SW3}>` +
    `<path d="M14 38Q4 30 10 22Q20 28 14 38Z"/><path d="M56 38Q66 30 62 22Q50 28 56 38Z"/>` +
    `<path d="M34 40Q26 34 30 27Q40 32 34 40Z"/></g>` +
    flower(18, 24, 11, '#ff7eb6', '#ffd23f', 10) +
    flower(52, 22, 11, '#ffe14d', '#ff8a3a', 40) +
    flower(35, 13, 9.5, '#ffffff', '#ffc83d', 20) +
    flower(34, 32, 8.5, '#8fa8ff', '#ffe066', 55)
  );
}

// ---------------------------------------------------------------------------------------------
// Graveyard decorations
// ---------------------------------------------------------------------------------------------

/** Outline+fill sweep of a shape along a depth vector: gives a slab its side/top thickness. */
function sweep(d: string, dx: number, dy: number, steps: number, fill: string, sw = 4): string {
  let o = '';
  let f = '';
  for (let i = 1; i <= steps; i++) {
    const t = `transform="translate(${n((dx * i) / steps)} ${n((dy * i) / steps)})"`;
    o += `<path ${t} d="${d}"/>`;
    f += `<path ${t} d="${d}"/>`;
  }
  return (
    `<g fill="${OL}" stroke="${OL}" stroke-width="${sw * 2}" stroke-linejoin="round">${o}</g>` +
    `<g fill="${fill}">${f}</g>`
  );
}

function graveArt(): string {
  const front = 'M10 84L10 40A23 23 0 0 1 56 40L56 84Z';
  return (
    shadow(38, 89, 33, 5) +
    sweep(front, 7, -5, 4, '#7c7893') +
    `<path d="${front}" fill="#b4b1c7" ${SW}/>` +
    `<path d="M46 84L46 42C46 33 44 26 39 21A23 23 0 0 1 56 40L56 84Z" fill="#9591ad"/>` +
    `<path d="M16 44C16 34 20 27 27 23" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".6"/>` +
    // engraved panel (no text)
    `<path d="M21 46L37 46M21 54L41 54M21 62L33 62" fill="none" stroke="#7c7893" stroke-width="3" stroke-linecap="round"/>` +
    // crack
    `<path d="M44 19L39 29L45 34L40 44" fill="none" stroke="${OL}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>` +
    // moss spot
    `<path d="M10 70Q14 64 20 68Q24 66 26 72Q22 78 16 76Q11 76 10 70Z" fill="#79a35a" stroke="${OL}" stroke-width="2"/>` +
    // dirt mound + grass
    `<path d="M4 88C10 80 60 79 68 86C70 92 56 94 36 94C16 94 4 93 4 88Z" fill="#8a7458" ${SW}/>` +
    `<path d="M14 86C24 83 40 83 50 84" fill="none" stroke="#a88f6c" stroke-width="3" stroke-linecap="round"/>` +
    `<g fill="none" stroke="#4f7a45" stroke-width="3" stroke-linecap="round">` +
    `<path d="M8 90L5 82M11 90L12 80"/><path d="M62 90L66 81M59 90L58 82"/></g>`
  );
}

function graveCrossArt(): string {
  const cross = 'M25 82L25 44L10 44L10 30L25 30L25 14L39 14L39 30L54 30L54 44L39 44L39 82Z';
  return (
    shadow(36, 92, 31, 4.5) +
    // plinth
    `<path d="M14 80L52 80L58 75L58 88L52 93L14 93Z" fill="#7c7893" ${SW}/>` +
    `<path d="M14 80L52 80L52 93L14 93Z" fill="#a9a6bd" ${SW}/>` +
    `<path d="M14 80L20 75L58 75L52 80Z" fill="#c9c6d8" ${SW}/>` +
    sweep(cross, 6, -4, 4, '#7c7893') +
    `<path d="${cross}" fill="#b4b1c7" ${SW}/>` +
    `<path d="M33 82L33 44L39 44L39 82ZM33 14L39 14L39 30L33 30ZM46 37L54 37L54 44L46 44Z" fill="#9591ad"/>` +
    `<path d="M29 40L29 19M14 37L23 37" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".6"/>` +
    // crack on arm
    `<path d="M48 30L45 36L49 40" fill="none" stroke="${OL}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>` +
    // ivy
    `<path d="M26 82C22 72 30 66 26 56" fill="none" stroke="#3f7a3c" stroke-width="2.5" stroke-linecap="round"/>` +
    `<g fill="#6fae52" stroke="${OL}" stroke-width="2">` +
    `<ellipse cx="23" cy="72" rx="4.5" ry="3" transform="rotate(-30 23 72)"/>` +
    `<ellipse cx="30" cy="63" rx="4" ry="2.8" transform="rotate(25 30 63)"/>` +
    `<ellipse cx="25" cy="55" rx="3.6" ry="2.5" transform="rotate(-20 25 55)"/></g>`
  );
}

function deadTreeArt(): string {
  const parts: Branch[] = [
    // trunk
    branch([[80, 192], [82, 170], [74, 146], [80, 120], [78, 98], [82, 84]], 34, 18),
    // roots
    branch([[80, 186], [66, 190], [54, 194]], 16, 5),
    branch([[84, 186], [98, 189], [110, 194]], 15, 5),
    // left branch with curl
    branch([[78, 106], [62, 92], [44, 82], [30, 70], [26, 54], [34, 46], [42, 52], [36, 58]], 15, 3.5),
    // right branch with curl
    branch([[82, 100], [100, 88], [118, 80], [132, 66], [134, 50], [126, 44], [120, 50], [126, 55]], 14, 3.5),
    // top branch
    branch([[80, 90], [86, 70], [80, 50], [84, 32], [94, 22], [100, 28]], 13, 3.5),
    // small twigs
    branch([[50, 85], [44, 98], [32, 102]], 6, 3),
    branch([[120, 78], [134, 86], [146, 82]], 6, 3),
    branch([[83, 62], [70, 52], [64, 38]], 6, 3),
  ];
  const outline = parts.map((p) => `<path d="${p.d}"/>`).join('');
  return (
    shadow(82, 194, 42, 6) +
    `<g fill="${OL}" stroke="${OL}" stroke-width="8" stroke-linejoin="round">${outline}</g>` +
    `<g fill="#6d5872">${parts.map((p) => `<path d="${p.d}"/>`).join('')}</g>` +
    `<g fill="#523f58">${parts.map((p) => `<path d="${p.shade}"/>`).join('')}</g>` +
    `<g fill="none" stroke="#927a97" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">` +
    parts
      .slice(0, 6)
      .map((p) => `<path d="${p.hl}"/>`)
      .join('') +
    `</g>` +
    // hollow knot with glowing eyes
    `<ellipse cx="80" cy="140" rx="9" ry="12" fill="#1c142a" stroke="${OL}" stroke-width="3"/>` +
    `<circle cx="76.5" cy="138" r="2.2" fill="#ffe066"/><circle cx="83.5" cy="138" r="2.2" fill="#ffe066"/>` +
    // bark lines
    `<path d="M70 172Q74 164 72 156M90 120Q86 112 88 104" fill="none" stroke="#523f58" stroke-width="2.5" stroke-linecap="round"/>`
  );
}

function bonesArt(): string {
  const bone = (x1: number, y1: number, x2: number, y2: number): string => {
    const a = Math.atan2(y2 - y1, x2 - x1);
    const ox = Math.cos(a + Math.PI / 2) * 2.7;
    const oy = Math.sin(a + Math.PI / 2) * 2.7;
    const knobs = [
      [x1 + ox, y1 + oy],
      [x1 - ox, y1 - oy],
      [x2 + ox, y2 + oy],
      [x2 - ox, y2 - oy],
    ]
      .map(([x, y]) => `<circle cx="${n(x)}" cy="${n(y)}" r="3.5"/>`)
      .join('');
    const shaft = `d="M${n(x1)} ${n(y1)}L${n(x2)} ${n(y2)}"`;
    return (
      `<g fill="${OL}" stroke="${OL}" stroke-width="6">${knobs}</g>` +
      `<path ${shaft} stroke="${OL}" stroke-width="11" stroke-linecap="round"/>` +
      `<g fill="#efe6cf">${knobs}</g>` +
      `<path ${shaft} stroke="#efe6cf" stroke-width="5" stroke-linecap="round"/>` +
      `<path d="M${n(x1 + (x2 - x1) * 0.3 + ox * 0.5)} ${n(y1 + (y2 - y1) * 0.3 + oy * 0.5)}L${n(x1 + (x2 - x1) * 0.7 + ox * 0.5)} ${n(y1 + (y2 - y1) * 0.7 + oy * 0.5)}" stroke="#d3c6a6" stroke-width="2" stroke-linecap="round"/>`
    );
  };
  return (
    shadow(36, 38, 31, 4) +
    bone(6, 20, 32, 34) +
    bone(8, 34, 30, 18) +
    // skull
    `<path d="M30 22C30 10 40 5 47 5C56 5 64 11 64 21C64 27 61 30 58 31L58 36L37 36L37 31C33 30 30 27 30 22Z" fill="#f3ead4" ${SW3}/>` +
    `<path d="M58 14C62 18 63 24 58 29L58 34L52 34L52 30C58 27 59 20 58 14Z" fill="#d3c6a6"/>` +
    `<ellipse cx="41" cy="20" rx="4.6" ry="5" fill="${OL}"/><ellipse cx="53" cy="20" rx="4.6" ry="5" fill="${OL}"/>` +
    `<circle cx="39.6" cy="18.4" r="1.4" fill="#fff"/><circle cx="51.6" cy="18.4" r="1.4" fill="#fff"/>` +
    `<path d="M47 25L45 29L49 29Z" fill="${OL}"/>` +
    `<path d="M42 31L42 36M47 31L47 36M52 31L52 36" stroke="${OL}" stroke-width="2" stroke-linecap="round"/>` +
    `<path d="M36 14C38 10 41 8 44 8" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" opacity=".8"/>`
  );
}

// ---------------------------------------------------------------------------------------------
// Castle decorations
// ---------------------------------------------------------------------------------------------

const ST_TOP = '#d3cce1';
const ST_FRONT = '#aba2c0';
const ST_SIDE = '#857c9e';
const ST_DARK = '#6f6789';

/** A stone block in 3/4 view: (x,y) = front-top-left corner. */
function block(x: number, y: number, w: number, h: number, d: number, rot = 0, sw = 4): string {
  const dx = d * 0.55;
  const top = `M${x} ${y}L${n(x + dx)} ${y - d}L${n(x + w + dx)} ${y - d}L${x + w} ${y}Z`;
  const side = `M${x + w} ${y}L${n(x + w + dx)} ${y - d}L${n(x + w + dx)} ${y - d + h}L${x + w} ${y + h}Z`;
  const front = `M${x} ${y}L${x + w} ${y}L${x + w} ${y + h}L${x} ${y + h}Z`;
  const sil = `M${x} ${y}L${n(x + dx)} ${y - d}L${n(x + w + dx)} ${y - d}L${n(x + w + dx)} ${y - d + h}L${x + w} ${y + h}L${x} ${y + h}Z`;
  const cx = x + w / 2;
  const cy = y + h / 2;
  return (
    `<g${rot ? ` transform="rotate(${rot} ${n(cx)} ${n(cy)})"` : ''}>` +
    `<path d="${sil}" fill="${OL}" stroke="${OL}" stroke-width="${sw}" stroke-linejoin="round"/>` +
    `<path d="${front}" fill="${ST_FRONT}"/><path d="${top}" fill="${ST_TOP}"/><path d="${side}" fill="${ST_SIDE}"/>` +
    `<path d="M${x} ${y}L${x + w} ${y}L${n(x + w + dx)} ${y - d}M${x + w} ${y}L${x + w} ${y + h}" fill="none" stroke="${OL}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>` +
    `<path d="M${x + 3} ${y + h - 4}L${x + 3} ${y + 4}" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".55"/>` +
    `</g>`
  );
}

function pillarArt(): string {
  return (
    shadow(48, 212, 42, 6) +
    // plinth
    `<path d="M12 196L84 196L84 211L12 211Z" fill="${ST_FRONT}" ${SW}/>` +
    `<path d="M16 189L80 189L84 196L12 196Z" fill="${ST_TOP}" ${SW}/>` +
    `<path d="M70 196L84 196L84 211L70 211Z" fill="${ST_SIDE}"/>` +
    `<path d="M12 196L84 196L84 211L12 211Z" fill="none" ${SW}/>` +
    // base torus
    `<path d="M20 190C18 180 22 177 26 177L70 177C74 177 78 180 76 190Z" fill="${ST_FRONT}" ${SW}/>` +
    `<path d="M64 178L70 177C74 177 78 180 76 190L66 190C68 184 67 180 64 178Z" fill="${ST_SIDE}"/>` +
    // shaft
    `<path d="M26 177L26 46L70 46L70 177Z" fill="${ST_FRONT}" ${SW}/>` +
    `<path d="M57 46L70 46L70 177L57 177Z" fill="${ST_SIDE}"/>` +
    `<path d="M33 52L33 172" stroke="${ST_TOP}" stroke-width="5" stroke-linecap="round"/>` +
    `<g stroke="${ST_DARK}" stroke-width="2.5" stroke-linecap="round" opacity=".7"><path d="M41 54L41 170M50 54L50 170M63 54L63 170"/></g>` +
    `<path d="M26 177L26 46L70 46L70 177Z" fill="none" ${SW}/>` +
    // crack + moss
    `<path d="M70 120L62 128L66 136L58 146" fill="none" stroke="${OL}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>` +
    `<path d="M24 186C24 176 30 172 36 176C40 172 46 176 44 182C48 184 46 190 40 190L24 190Z" fill="#6fa35a" stroke="${OL}" stroke-width="2.5" stroke-linejoin="round"/>` +
    // capital: echinus + abacus slab
    `<path d="M20 46C20 38 24 34 30 34L66 34C72 34 76 38 76 46Z" fill="${ST_FRONT}" ${SW}/>` +
    `<path d="M62 34L66 34C72 34 76 38 76 46L66 46C66 40 64 36 62 34Z" fill="${ST_SIDE}"/>` +
    `<path d="M12 22L84 22L84 35L12 35Z" fill="${ST_FRONT}" ${SW}/>` +
    `<path d="M70 22L84 22L84 35L70 35Z" fill="${ST_SIDE}"/>` +
    `<path d="M17 10L79 10L84 22L12 22Z" fill="${ST_TOP}" ${SW}/>` +
    `<path d="M12 22L84 22L84 35L12 35Z" fill="none" ${SW}/>` +
    `<path d="M24 14L50 14" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".7"/>`
  );
}

function pillarBrokenArt(): string {
  return (
    shadow(50, 101, 44, 5) +
    // plinth
    `<path d="M12 86L80 86L80 99L12 99Z" fill="${ST_FRONT}" ${SW}/>` +
    `<path d="M16 79L76 79L80 86L12 86Z" fill="${ST_TOP}" ${SW}/>` +
    `<path d="M67 86L80 86L80 99L67 99Z" fill="${ST_SIDE}"/>` +
    `<path d="M12 86L80 86L80 99L12 99Z" fill="none" ${SW}/>` +
    // stump shaft with jagged broken top
    `<path d="M24 82L24 40L30 30L36 36L43 24L50 32L56 26L62 34L68 32L68 82Z" fill="${ST_FRONT}" ${SW}/>` +
    `<path d="M56 40L68 38L68 82L56 82Z" fill="${ST_SIDE}"/>` +
    // broken top surface
    `<path d="M24 40L30 30L36 36L43 24L50 32L56 26L62 34L68 32L68 38L56 42L44 44L32 44Z" fill="${ST_TOP}" stroke="${OL}" stroke-width="3" stroke-linejoin="round"/>` +
    `<path d="M30 48L30 78" stroke="${ST_TOP}" stroke-width="4" stroke-linecap="round"/>` +
    `<g stroke="${ST_DARK}" stroke-width="2.5" stroke-linecap="round" opacity=".7"><path d="M38 50L38 78M47 50L47 78"/></g>` +
    `<path d="M24 82L24 40L32 44L44 44L56 42L68 38L68 82Z" fill="none" ${SW}/>` +
    `<path d="M48 52L52 60L48 66" fill="none" stroke="${OL}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>` +
    // rubble chunks
    block(70, 82, 16, 12, 7, 12, 4) +
    block(6, 88, 14, 10, 6, -10, 4) +
    block(82, 98, 9, 6, 4, 20, 3)
  );
}

function brazierArt(): string {
  return (
    `<defs><radialGradient id="brazier_glow" cx="50%" cy="50%" r="50%">` +
    `<stop offset="0" stop-color="#ffd36b" stop-opacity=".75"/><stop offset=".55" stop-color="#ffb347" stop-opacity=".3"/>` +
    `<stop offset="1" stop-color="#ffb347" stop-opacity="0"/></radialGradient></defs>` +
    `<circle cx="40" cy="34" r="36" fill="url(#brazier_glow)"/>` +
    shadow(40, 94, 26, 4) +
    // legs
    `<g fill="none" stroke="${OL}" stroke-width="10" stroke-linecap="round"><path d="M30 64L17 92M50 64L63 92M40 68L40 94"/></g>` +
    `<g fill="none" stroke="#4d4762" stroke-width="5" stroke-linecap="round"><path d="M30 64L17 92M50 64L63 92M40 68L40 94"/></g>` +
    `<path d="M14 92L20 92M60 92L66 92" stroke="${OL}" stroke-width="5" stroke-linecap="round"/>` +
    // bowl
    `<path d="M12 50C13 64 24 72 40 72C56 72 67 64 68 50Z" fill="#5d5776" ${SW}/>` +
    `<path d="M56 52L68 50C67 64 56 72 40 72C52 68 56 60 56 52Z" fill="#433d58"/>` +
    `<path d="M20 58C23 63 27 66 32 67" fill="none" stroke="#9790b3" stroke-width="3" stroke-linecap="round"/>` +
    `<g fill="#ffcc33" stroke="${OL}" stroke-width="2"><circle cx="24" cy="61" r="2.5"/><circle cx="40" cy="65" r="2.5"/><circle cx="56" cy="61" r="2.5"/></g>` +
    // rim + coals
    `<ellipse cx="40" cy="50" rx="29" ry="7" fill="#6e6890" ${SW}/>` +
    `<ellipse cx="40" cy="50" rx="22" ry="4" fill="#c2402a"/>` +
    // flame
    `<path d="M40 8C47 19 60 24 59 38C58 48 51 54 40 54C29 54 21 48 21 38C21 29 27 25 29 18C33 23 34 27 36 29C36 21 37 14 40 8Z" fill="#ff7a2a" ${SW}/>` +
    `<path d="M41 14C46 24 54 30 53 40C52 47 47 51 40 51C33 51 27 47 27 40C27 34 31 30 33 26C35 31 37 33 39 34C38 27 39 20 41 14Z" fill="#ffb12e"/>` +
    `<path d="M41 26C45 33 49 37 48 43C47 47 44 49 40 49C36 49 33 47 33 43C33 39 36 36 37 33C38 36 39 37 40 38C40 34 40 30 41 26Z" fill="#ffe86b"/>` +
    `<ellipse cx="40" cy="45" rx="4.5" ry="3.5" fill="#fffbe0"/>` +
    // sparks
    `<g fill="#ffd23f" stroke="${OL}" stroke-width="1.5"><circle cx="58" cy="14" r="2.2"/><circle cx="20" cy="22" r="1.8"/><circle cx="64" cy="28" r="1.5"/></g>`
  );
}

function rubbleArt(): string {
  return (
    shadow(45, 50, 40, 5) +
    block(8, 30, 26, 16, 10, -6) +
    block(50, 32, 30, 15, 10, 8) +
    block(28, 18, 26, 16, 10, 3) +
    block(36, 40, 14, 9, 6, -12, 3) +
    `<g fill="${ST_SIDE}" stroke="${OL}" stroke-width="2" stroke-linejoin="round">` +
    `<path d="M3 49L6 45L10 46L10 50L6 51Z"/><path d="M82 50L85 46L88 48L87 51Z"/><path d="M54 51L57 48L60 50L58 52Z"/></g>` +
    `<path d="M30 21Q34 14 40 17Q44 13 48 17L46 20L32 22Z" fill="#6fa35a" stroke="${OL}" stroke-width="2" stroke-linejoin="round"/>`
  );
}

export const ENVIRONMENT_ART: ArtSet = {
  // Seamless ground tiles
  ground_meadow: svg(T, T, meadowTile()),
  ground_graveyard: svg(T, T, graveyardTile()),
  ground_castle: svg(T, T, castleTile()),
  // Meadow decorations
  tree: svg(170, 210, treeArt()),
  bush: svg(100, 76, bushArt()),
  rock: svg(80, 60, rockArt()),
  flowers: svg(70, 44, flowersArt()),
  // Graveyard decorations
  grave: svg(74, 96, graveArt()),
  grave_cross: svg(70, 100, graveCrossArt()),
  dead_tree: svg(160, 200, deadTreeArt()),
  bones: svg(70, 44, bonesArt()),
  // Castle decorations
  pillar: svg(96, 220, pillarArt()),
  pillar_broken: svg(100, 110, pillarBrokenArt()),
  brazier: svg(80, 100, brazierArt()),
  rubble: svg(90, 56, rubbleArt()),
};
