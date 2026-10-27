/**
 * The world: one seamless ground tile per map (512 x 512 PNG buffers, painted like the soft, hazy fields of 2000s
 * online RPGs) and six standing decorations per map, drawn as sprites on their base (bottom centre). Keys are the
 * game's texture keys (src/config/maps.ts: `ground` and `decor`).
 */
import sharp from 'sharp';
import { Sprite } from '../engine.mjs';
import { C } from '../palette.mjs';

// ------------------------------------------------------------------------------------------------ ground painter

const N = 512;

function mulberry(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const smoothstep = (e0, e1, x) => {
  const t = clamp((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
};
const hexRgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const lerp3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const wrap = (v) => ((v % N) + N) % N;

/** Gradient noise that repeats every N pixels (`cells` lattice cells across the tile), about 0..1 around 0.5. */
function pnoise(cells, rnd) {
  const gx = new Float32Array(cells * cells);
  const gy = new Float32Array(cells * cells);
  for (let i = 0; i < cells * cells; i++) {
    const a = rnd() * Math.PI * 2;
    gx[i] = Math.cos(a);
    gy[i] = Math.sin(a);
  }
  const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
  return (x, y) => {
    const u = (wrap(x) / N) * cells;
    const v = (wrap(y) / N) * cells;
    const x0 = Math.floor(u);
    const y0 = Math.floor(v);
    const fx = u - x0;
    const fy = v - y0;
    const dot = (i, j) => {
      const k = ((y0 + j) % cells) * cells + ((x0 + i) % cells);
      return gx[k] * (fx - i) + gy[k] * (fy - j);
    };
    const sx = fade(fx);
    const sy = fade(fy);
    const a = dot(0, 0) + (dot(1, 0) - dot(0, 0)) * sx;
    const b = dot(0, 1) + (dot(1, 1) - dot(0, 1)) * sx;
    return clamp(0.5 + (a + (b - a) * sy) * 0.8);
  };
}

/** Several octaves of periodic noise, weights summing to 1: [[cells, weight], ...]. */
function fbm(rnd, octaves) {
  const fs = octaves.map(([cells, w]) => [pnoise(cells, rnd), w]);
  const total = octaves.reduce((s, [, w]) => s + w, 0);
  return (x, y) => fs.reduce((s, [f, w]) => s + f(x, y) * w, 0) / total;
}

/** A colour from a list of stops for t in 0..1. */
function ramp(stops, t) {
  const n = clamp(t, 0, 0.9999) * (stops.length - 1);
  const i = Math.floor(n);
  return lerp3(stops[i], stops[i + 1], n - i);
}

/** A 512 x 512 RGB canvas whose edges wrap around, so everything painted on it tiles seamlessly. */
class Ground {
  constructor(seed) {
    this.rnd = mulberry(seed);
    this.px = new Float32Array(N * N * 3);
  }

  r(a = 0, b = 1) {
    return a + this.rnd() * (b - a);
  }

  fill(fn) {
    for (let y = 0; y < N; y++)
      for (let x = 0; x < N; x++) this.px.set(fn(x, y), (y * N + x) * 3);
    return this;
  }

  get(x, y) {
    const i = (wrap(Math.round(y)) * N + wrap(Math.round(x))) * 3;
    return [this.px[i], this.px[i + 1], this.px[i + 2]];
  }

  blend(x, y, rgb, a) {
    if (a <= 0) return;
    const i = (wrap(y) * N + wrap(x)) * 3;
    this.px[i] += (rgb[0] - this.px[i]) * a;
    this.px[i + 1] += (rgb[1] - this.px[i + 1]) * a;
    this.px[i + 2] += (rgb[2] - this.px[i + 2]) * a;
  }

  /** A soft ellipse of colour (a brush dab), fading out over its outer `soft` part. */
  dab(cx, cy, rx, ry, rgb, alpha, { rot = 0, soft = 0.6 } = {}) {
    const ext = Math.max(rx, ry) + 1;
    const cos = Math.cos(rot);
    const sin = Math.sin(rot);
    const fall = Math.max(soft, 1.2 / Math.min(rx, ry));
    for (let y = Math.floor(cy - ext); y <= Math.ceil(cy + ext); y++)
      for (let x = Math.floor(cx - ext); x <= Math.ceil(cx + ext); x++) {
        const dx = x + 0.5 - cx;
        const dy = y + 0.5 - cy;
        const u = (dx * cos + dy * sin) / rx;
        const v = (dy * cos - dx * sin) / ry;
        const d = Math.sqrt(u * u + v * v);
        if (d >= 1) continue;
        this.blend(x, y, rgb, alpha * smoothstep(1, 1 - fall, d));
      }
    return this;
  }

  /** An anti-aliased stroke along a polyline, its radius going from r0 at the start to r1 at the end. */
  stroke(pts, r0, r1, rgb, alpha) {
    const xs = pts.map((p) => p[0]);
    const ys = pts.map((p) => p[1]);
    const m = Math.max(r0, r1) + 1.5;
    const lens = [0];
    for (let i = 1; i < pts.length; i++) lens.push(lens[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    const L = lens.at(-1) || 1;
    for (let y = Math.floor(Math.min(...ys) - m); y <= Math.ceil(Math.max(...ys) + m); y++)
      for (let x = Math.floor(Math.min(...xs) - m); x <= Math.ceil(Math.max(...xs) + m); x++) {
        const px = x + 0.5;
        const py = y + 0.5;
        let best = Infinity;
        for (let i = 1; i < pts.length; i++) {
          const [ax, ay] = pts[i - 1];
          const [bx, by] = pts[i];
          const dx = bx - ax;
          const dy = by - ay;
          const l2 = dx * dx + dy * dy || 1;
          const t = clamp(((px - ax) * dx + (py - ay) * dy) / l2);
          const r = r0 + (r1 - r0) * ((lens[i - 1] + t * (lens[i] - lens[i - 1])) / L);
          best = Math.min(best, Math.hypot(px - ax - t * dx, py - ay - t * dy) - r);
        }
        const cov = clamp(0.5 - best);
        if (cov > 0) this.blend(x, y, rgb, alpha * cov);
      }
    return this;
  }

  /** A curved blade (quadratic curve) from its root up to its tip. */
  blade(x, y, len, ang, bend, w, rgb, alpha) {
    const tx = x + Math.sin(ang) * len;
    const ty = y - Math.cos(ang) * len;
    const mx = (x + tx) / 2 + Math.cos(ang) * bend;
    const my = (y + ty) / 2 + Math.sin(ang) * bend;
    const pts = [];
    for (let i = 0; i <= 6; i++) {
      const t = i / 6;
      pts.push([(1 - t) ** 2 * x + 2 * (1 - t) * t * mx + t * t * tx, (1 - t) ** 2 * y + 2 * (1 - t) * t * my + t * t * ty]);
    }
    return this.stroke(pts, w, 0.25, rgb, alpha);
  }

  /** Soften the whole tile (box blur, three passes, wrapping round the edges). */
  blur(r) {
    const tmp = new Float32Array(this.px.length);
    const pass = (src, dst, horizontal) => {
      for (let a = 0; a < N; a++)
        for (let c = 0; c < 3; c++) {
          let sum = 0;
          const at = (b) => (horizontal ? (a * N + wrap(b)) * 3 + c : (wrap(b) * N + a) * 3 + c);
          for (let b = -r; b <= r; b++) sum += src[at(b)];
          for (let b = 0; b < N; b++) {
            dst[at(b)] = sum / (2 * r + 1);
            sum += src[at(b + r + 1)] - src[at(b - r)];
          }
        }
    };
    for (let k = 0; k < 3; k++) {
      pass(this.px, tmp, true);
      pass(tmp, this.px, false);
    }
    return this;
  }

  png() {
    const out = Buffer.alloc(N * N * 3);
    for (let i = 0; i < out.length; i++) out[i] = clamp(Math.round(this.px[i]), 0, 255);
    return sharp(out, { raw: { width: N, height: N, channels: 3 } }).png().toBuffer();
  }
}

/** Points scattered in loose clumps: `n` points around `groups` centres, plus some on their own. */
function scatter(g, n, groups, spread, alone = 0.3) {
  const centres = Array.from({ length: groups }, () => [g.r(0, N), g.r(0, N)]);
  return Array.from({ length: n }, () => {
    if (g.rnd() < alone) return [g.r(0, N), g.r(0, N)];
    const [cx, cy] = centres[Math.floor(g.rnd() * groups)];
    const a = g.r(0, Math.PI * 2);
    const d = spread * Math.sqrt(g.rnd());
    return [cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.8];
  });
}

/** Many soft brush dabs that take the colour already under them and nudge it lighter or darker: painted texture. */
function brushwork(g, count, { size = [5, 14], amount = 10, alpha = [0.18, 0.4], warm = 0 } = {}) {
  for (let k = 0; k < count; k++) {
    const x = g.r(0, N);
    const y = g.r(0, N);
    const c = g.get(x, y);
    const d = g.r(-amount, amount);
    const rx = g.r(...size);
    g.dab(x, y, rx, rx * g.r(0.4, 0.7), [c[0] + d + warm * d, c[1] + d, c[2] + d * 0.7], g.r(...alpha), { rot: g.r(-0.5, 0.5), soft: 0.8 });
  }
}

/** Short, faint strokes of a lighter and a darker tone everywhere: the brush texture of a painted field. */
function hatching(g, count, light, dark, { len = [2.5, 5], alpha = [0.1, 0.22], tilt = 0.5 } = {}) {
  for (let k = 0; k < count; k++) {
    const x = g.r(0, N);
    const y = g.r(0, N);
    const a = g.r(-tilt, tilt);
    const l = g.r(...len);
    g.stroke([[x, y], [x + Math.sin(a) * l, y - Math.cos(a) * l]], 0.7, 0.35, g.rnd() < 0.5 ? light : dark, g.r(...alpha));
  }
}

/** Greenhill Fields: soft painted grass, faint lighter and darker patches, a few worn spots, small flowers. */
async function meadow() {
  const g = new Ground(11);
  const big = fbm(g.rnd, [[2, 0.3], [4, 0.4], [8, 0.3]]);
  const mid = fbm(g.rnd, [[16, 0.6], [32, 0.4]]);
  const warpX = pnoise(8, g.rnd);
  const warpY = pnoise(8, g.rnd);
  const stops = ['#7a9455', '#839c5b', '#8ca460', '#95ac66', '#9eb36c'].map(hexRgb);
  g.fill((x, y) => {
    const wx = x + (warpX(x, y) - 0.5) * 24;
    const wy = y + (warpY(x, y) - 0.5) * 24;
    const t = big(wx, wy) * 0.65 + mid(wx, wy) * 0.35;
    return ramp(stops, smoothstep(0.28, 0.72, t));
  });
  brushwork(g, 3000, { size: [4, 11], amount: 9 });
  // Worn spots of earth showing through, small and faint, broken up by the grass.
  const dirt = hexRgb('#a3956c');
  for (const [x, y] of scatter(g, 60, 4, 20, 0)) g.dab(x, y, g.r(4, 10), g.r(2.5, 5), dirt, g.r(0.15, 0.32), { rot: g.r(-0.4, 0.4), soft: 0.9 });
  g.blur(1);
  hatching(g, 9000, hexRgb('#a8bc74'), hexRgb('#647f47'));
  // Grass: tufts of short blades, darker and a few lighter, thicker where the noise says so.
  const dense = pnoise(16, g.rnd);
  const darkBlade = hexRgb('#5a7340');
  const midBlade = hexRgb('#6e8a4a');
  const lightBlade = hexRgb('#b4c784');
  for (let k = 0; k < 1500; k++) {
    const x = g.r(0, N);
    const y = g.r(0, N);
    if (g.rnd() > 0.2 + dense(x, y) * 0.9) continue;
    const roll = g.rnd();
    const c = roll < 0.5 ? darkBlade : roll < 0.8 ? midBlade : lightBlade;
    const a = roll < 0.8 ? g.r(0.35, 0.55) : g.r(0.4, 0.6);
    const n = 2 + Math.floor(g.rnd() * 3);
    for (let b = 0; b < n; b++) {
      const ang = -0.6 + (b / Math.max(1, n - 1)) * 1.2 + g.r(-0.2, 0.2);
      g.blade(x + ang * 3, y, g.r(5, 10), ang, g.r(-1.5, 1.5), 0.8, c, a);
    }
  }
  // Tiny clover leaves here and there.
  const clover = hexRgb('#66844a');
  const cloverHi = hexRgb('#a2ba70');
  for (const [x, y] of scatter(g, 70, 10, 26, 0.4)) {
    for (let p = 0; p < 3; p++) {
      const a = (p / 3) * Math.PI * 2 - Math.PI / 2 + g.r(-0.2, 0.2);
      g.dab(x + Math.cos(a) * 2.2, y + Math.sin(a) * 1.8, 2, 1.7, clover, 0.65, { soft: 0.45 });
      g.dab(x + Math.cos(a) * 2.2 - 0.5, y + Math.sin(a) * 1.8 - 0.5, 0.9, 0.7, cloverHi, 0.5, { soft: 0.6 });
    }
  }
  // Small flowers: white and a few yellow, each with a soft shadow, a ring of petals and a warm centre.
  for (const [x, y] of scatter(g, 80, 10, 30, 0.35)) {
    const white = g.rnd() < 0.68;
    const petal = hexRgb(white ? '#f1ecdb' : '#e6cc76');
    const centre = hexRgb(white ? '#d8b34e' : '#c98f3e');
    const r = g.r(1.8, 2.4);
    g.dab(x + 1.2, y + 1.6, r * 2.2, r * 1.4, hexRgb('#4e6638'), 0.22, { soft: 0.9 });
    for (let p = 0; p < 5; p++) {
      const a = p * 1.2566 + g.r(0, 0.4);
      g.dab(x + Math.cos(a) * r * 1.15, y + Math.sin(a) * r * 0.95, r * 0.85, r * 0.75, petal, 0.92, { soft: 0.45 });
    }
    g.dab(x, y, r * 0.55, r * 0.5, centre, 0.95, { soft: 0.4 });
  }
  return g.png();
}

/** Lantern Pines: a dark mossy forest floor, soft earth, drifts of fallen pine needles, little forest sprigs. */
async function pines() {
  const g = new Ground(23);
  const big = fbm(g.rnd, [[2, 0.3], [4, 0.4], [8, 0.3]]);
  const mid = fbm(g.rnd, [[16, 0.6], [32, 0.4]]);
  const mossMask = fbm(g.rnd, [[4, 0.3], [8, 0.4], [16, 0.3]]);
  const warpX = pnoise(8, g.rnd);
  const warpY = pnoise(8, g.rnd);
  const earth = ['#52483a', '#5a4f3f', '#625645'].map(hexRgb);
  const moss = ['#4c573c', '#546043', '#5c694a'].map(hexRgb);
  g.fill((x, y) => {
    const wx = x + (warpX(x, y) - 0.5) * 24;
    const wy = y + (warpY(x, y) - 0.5) * 24;
    const t = smoothstep(0.28, 0.72, big(wx, wy) * 0.6 + mid(wx, wy) * 0.4);
    const m = smoothstep(0.32, 0.6, mossMask(wx, wy));
    return lerp3(ramp(earth, t), ramp(moss, t), 0.15 + m * 0.75);
  });
  brushwork(g, 3200, { size: [4, 11], amount: 7, warm: 0.3 });
  // Rust-brown drifts where the needles gather.
  const drift = fbm(g.rnd, [[8, 0.5], [16, 0.5]]);
  const rusty = hexRgb('#6a5036');
  for (let k = 0; k < 1100; k++) {
    const x = g.r(0, N);
    const y = g.r(0, N);
    const d = smoothstep(0.45, 0.65, drift(x, y));
    if (d > 0.05) g.dab(x, y, g.r(4, 9), g.r(3, 5), rusty, 0.2 * d, { rot: g.r(-0.4, 0.4), soft: 0.9 });
  }
  g.blur(1);
  hatching(g, 5000, hexRgb('#6f7651'), hexRgb('#3d3d2c'), { tilt: 1.2, alpha: [0.08, 0.18] });
  // Moss cushions: clusters of small soft dabs, lighter and yellower on their upper left.
  const mossLo = hexRgb('#56663d');
  const mossHi = hexRgb('#7d8f50');
  for (const [x, y] of scatter(g, 420, 22, 16, 0.25)) {
    if (mossMask(x, y) < 0.4 && g.rnd() < 0.6) continue;
    const r = g.r(1.6, 3.2);
    g.dab(x, y, r, r * 0.8, mossLo, 0.5, { soft: 0.7 });
    g.dab(x - r * 0.3, y - r * 0.35, r * 0.55, r * 0.45, mossHi, 0.45, { soft: 0.8 });
  }
  // Fallen needles, in their little bundles of two (a narrow V), rust and pale brown, mostly in the drifts.
  const needles = ['#735a3e', '#836848', '#654e36', '#97805d'].map(hexRgb);
  for (let k = 0; k < 1700; k++) {
    const x = g.r(0, N);
    const y = g.r(0, N);
    if (g.rnd() > smoothstep(0.38, 0.62, drift(x, y)) * 0.85 + 0.1) continue;
    const a = g.r(0, Math.PI * 2);
    const l = g.r(4, 7);
    const c = needles[Math.floor(g.rnd() * needles.length)];
    const al = g.r(0.3, 0.55);
    for (const s of [-0.13, 0.13]) g.stroke([[x, y], [x + Math.cos(a + s) * l, y + Math.sin(a + s) * l * 0.75]], 0.5, 0.3, c, al);
  }
  // Little forest sprigs: three pointed leaves on a short stem.
  const sprig = hexRgb('#5f7343');
  const sprigHi = hexRgb('#87995c');
  for (const [x, y] of scatter(g, 50, 10, 24, 0.4)) {
    g.stroke([[x, y + 3], [x, y]], 0.4, 0.3, sprig, 0.7);
    for (const a of [-2.3, -1.57, -0.85]) {
      g.dab(x + Math.cos(a) * 2, y + Math.sin(a) * 1.7, 2, 1.1, sprig, 0.8, { rot: a, soft: 0.4 });
      g.dab(x + Math.cos(a) * 1.9 - 0.3, y + Math.sin(a) * 1.6 - 0.3, 1, 0.5, sprigHi, 0.6, { rot: a, soft: 0.6 });
    }
  }
  // A few small twigs, pebbles and fallen cones.
  const twig = hexRgb('#3b2f24');
  for (let k = 0; k < 6; k++) {
    const x = g.r(0, N);
    const y = g.r(0, N);
    const a = g.r(-0.6, 0.6);
    const l = g.r(4, 7);
    g.stroke([[x - Math.cos(a) * l, y - Math.sin(a) * l], [x + Math.cos(a) * l, y + Math.sin(a) * l]], 0.85, 0.5, twig, 0.4);
    g.stroke([[x, y], [x + 3, y - 3 + g.r(-1, 1)]], 0.6, 0.4, twig, 0.35);
  }
  for (const [x, y] of scatter(g, 22, 6, 30, 0.5)) {
    const r = g.r(1.4, 2.6);
    g.dab(x + 0.8, y + 1, r * 1.2, r * 0.8, hexRgb('#2f2a20'), 0.3, { soft: 0.9 });
    g.dab(x, y, r, r * 0.75, hexRgb('#77725f'), 0.75, { soft: 0.4 });
    g.dab(x - r * 0.3, y - r * 0.3, r * 0.5, r * 0.35, hexRgb('#99937c'), 0.6, { soft: 0.6 });
  }
  for (let k = 0; k < 6; k++) {
    const x = g.r(0, N);
    const y = g.r(0, N);
    const a = g.r(-0.8, 0.8);
    g.dab(x + 1, y + 1.5, 4.5, 2.2, hexRgb('#2c261d'), 0.3, { rot: a, soft: 0.9 });
    g.dab(x, y, 3.6, 2.2, hexRgb('#6e4e33'), 0.9, { rot: a, soft: 0.35 });
    for (let i = -1; i <= 1; i++) g.dab(x + Math.cos(a) * i * 1.6 - 0.3, y + Math.sin(a) * i * 1.6 - 0.5, 1, 0.7, hexRgb('#94704b'), 0.7, { soft: 0.5 });
  }
  // Grass: sparse dark-green blades poking through the moss.
  const blades = ['#48573a', '#64744a'].map(hexRgb);
  for (let k = 0; k < 700; k++) {
    const x = g.r(0, N);
    const y = g.r(0, N);
    if (mossMask(x, y) < 0.45 && g.rnd() < 0.8) continue;
    const c = blades[g.rnd() < 0.7 ? 0 : 1];
    const n = 2 + Math.floor(g.rnd() * 2);
    for (let b = 0; b < n; b++) {
      const ang = -0.5 + (b / Math.max(1, n - 1)) * 1 + g.r(-0.2, 0.2);
      g.blade(x + ang * 3, y, g.r(4, 8), ang, g.r(-1, 1), 0.75, c, g.r(0.35, 0.55));
    }
  }
  return g.png();
}

/** Sunscar Desert: warm sand with soft wind ripples, fine grain and a few pebbles. */
async function desert() {
  const g = new Ground(37);
  const big = fbm(g.rnd, [[2, 0.3], [4, 0.4], [8, 0.3]]);
  const mid = fbm(g.rnd, [[16, 0.6], [32, 0.4]]);
  const bend = fbm(g.rnd, [[2, 0.4], [4, 0.6]]);
  const bend2 = pnoise(16, g.rnd);
  const show = fbm(g.rnd, [[4, 0.5], [8, 0.5]]);
  const stops = ['#b8966b', '#bf9d72', '#c6a478', '#cdab7f'].map(hexRgb);
  const K = 20;
  /** The ripples' height: waves running across the tile at a slant, bent by noise, fading in and out. */
  const height = (x, y) => {
    const phase = (2 * Math.PI * (K * y + 3 * x)) / N + (bend(x, y) - 0.5) * 12 + (bend2(x, y) - 0.5) * 3;
    // A sharper crest and a long gentle back, like wind ripples.
    const w = Math.sin(phase);
    return (w > 0 ? Math.pow(w, 1.6) : -Math.pow(-w, 0.7) * 0.6) * smoothstep(0.42, 0.62, show(x, y));
  };
  g.fill((x, y) => {
    const t = smoothstep(0.3, 0.7, big(x, y) * 0.6 + mid(x, y) * 0.4);
    // Lit from the upper left: slopes facing up-left are lighter, the others darker.
    const slope = height(x - 1, y - 1.2) - height(x + 1, y + 1.2);
    return lerp3(ramp(stops, t), slope > 0 ? [228, 206, 162] : [150, 116, 80], Math.min(0.3, Math.abs(slope) * 0.32));
  });
  brushwork(g, 2600, { size: [4, 11], amount: 6, warm: 0.4 });
  g.blur(1);
  hatching(g, 5000, hexRgb('#dcc49a'), hexRgb('#a78558'), { len: [2, 4], alpha: [0.08, 0.18], tilt: 1.5 });
  // Grain: tiny lighter and darker specks.
  for (let k = 0; k < 2600; k++) {
    const light = g.rnd() < 0.5;
    g.dab(g.r(0, N), g.r(0, N), g.r(0.5, 0.9), g.r(0.5, 0.8), light ? [232, 214, 178] : [146, 114, 80], g.r(0.15, 0.3), { soft: 0.6 });
  }
  // Pebbles: shaded little stones with a soft shadow to the lower right.
  const pebbles = [['#968672', '#bdae97'], ['#8a7660', '#b39e82'], ['#a08068', '#c9a98e']].map((p) => p.map(hexRgb));
  for (const [x, y] of scatter(g, 40, 7, 26, 0.4)) {
    const r = g.r(1.4, 3.2);
    const [base, hi] = pebbles[Math.floor(g.rnd() * pebbles.length)];
    g.dab(x + r * 0.5, y + r * 0.55, r * 1.25, r * 0.8, [118, 90, 60], 0.35, { soft: 0.9 });
    g.dab(x, y, r, r * 0.72, base, 0.92, { soft: 0.35 });
    g.dab(x - r * 0.3, y - r * 0.28, r * 0.55, r * 0.35, hi, 0.75, { soft: 0.7 });
  }
  // A few dry, pale grass tufts.
  const dry = [hexRgb('#8d7752'), hexRgb('#b39d70')];
  for (let k = 0; k < 7; k++) {
    const x = g.r(0, N);
    const y = g.r(0, N);
    g.dab(x + 1, y + 0.5, 6, 1.8, [130, 100, 66], 0.25, { soft: 0.9 });
    for (let b = 0; b < 7; b++) {
      const ang = -1 + b * 0.33 + g.r(-0.1, 0.1);
      g.blade(x + ang * 2.5, y, g.r(6, 11) * (1 - Math.abs(ang) * 0.3), ang, ang * 2.5, 0.75, dry[b % 2], 0.6);
    }
  }
  return g.png();
}

// ------------------------------------------------------------------------------------------------ decorations

/** Extra ramps for the world (highlight, base, shade, outline), muted like the palette's. */
const W = {
  oak: ['#b3c67a', '#88a255', '#66823f', '#334a22'],
  oakDeep: ['#8fa85d', '#6a8644', '#516b35', '#283a1c'],
  oakLight: ['#c8d78c', '#a0b965', '#7d9a4b', '#3d5226'],
  bush: ['#a9c174', '#7f9c52', '#5f7c3e', '#2f4521'],
  bushDeep: ['#88a35d', '#648145', '#4b6435', '#25371b'],
  bark: ['#a07c5a', '#7b5a42', '#5c4331', '#2f2219'],
  stone: ['#c9c9bd', '#a3a397', '#7f7f75', '#40413b'],
  stoneDark: ['#adaea3', '#8a8b81', '#6a6b63', '#36372f'],
  moss: ['#b2c27a', '#8ca259', '#6c8343', '#364523'],
  plank: ['#d2a971', '#ad8352', '#88633c', '#4a3320'],
  rope: ['#e4d3a3', '#c4ab78', '#9d8657', '#55472a'],
  clover: ['#9fbc6c', '#76984f', '#58783c', '#2c4220'],
  petal: ['#fffaf0', '#f1ead6', '#d6cbb0', '#7d745f'],
  yellow: ['#f4dc8a', '#e0bd5e', '#bb9840', '#64511f'],
  berry: ['#e08474', '#b94c42', '#8e3632', '#4a1a17'],
  pine: ['#7f9f72', '#587b58', '#425f47', '#1f3226'],
  pineBark: ['#9b6f53', '#77523d', '#5a3d2f', '#2f1f18'],
  paper: ['#f3bd7c', '#dc9050', '#b56d39', '#5e351b'],
  roof: ['#8b8f8a', '#686e6a', '#505653', '#272b2a'],
  shroom: ['#c99b6b', '#a5754b', '#815939', '#45301d'],
  stumpTop: ['#e2c491', '#c6a26f', '#a28155', '#5b462b'],
  fern: ['#9cb86e', '#71924c', '#55733a', '#2a3d1e'],
  mossDark: ['#9aab6a', '#778a4e', '#5b6c3d', '#2e3a20'],
  frond: ['#b2c072', '#879a4f', '#68793c', '#33401d'],
  frondDeep: ['#8fa05c', '#6c7d42', '#536233', '#29321a'],
  palmBark: ['#c9a476', '#a07d55', '#7d5f40', '#423120'],
  dates: ['#e5a65c', '#c27c3a', '#97592a', '#4f2c13'],
  cactus: ['#a9c07c', '#7f9c5d', '#617d47', '#2f4226'],
  sandstone: ['#efd6a6', '#d3b27f', '#ae8d5e', '#614c30'],
  sandstoneDark: ['#dcc093', '#bd9b6c', '#987850', '#56422a'],
  sandMound: ['#dcc398', '#c7a77a', '#ab8b61', '#6e5a3e'],
  bone: ['#fffaf0', '#ece2cc', '#cdbf9f', '#7a6f58'],
  clay: ['#dc9c6e', '#bb774d', '#94593a', '#4e2c1b'],
  clayDark: ['#c98c64', '#a66a46', '#825036', '#45271a'],
  cloth: ['#e9d6ae', '#cfb88c', '#ad966c', '#5f5038'],
};
/** The same colours as W.pine under another name: tiers drawn in turn get a soft line between them. */
W.pine2 = [...W.pine];

/**
 * A sprite that can also lay soft, see-through shadows on the ground under what it draws
 * (`shadow(cx, cy, rx, ry, alpha)`), and soft heaps of sand over its foot that fade into the ground
 * (`heap(cx, cy, rx, ry)`, the ground line through the centre), in sprite pixels. Everything else is a plain Sprite.
 */
class Prop extends Sprite {
  /** `w` x `h` sprite pixels to draw in, with a spare margin all round so nothing (a soft shadow) gets cut off. */
  constructor(w, h, opts) {
    const M = 5;
    super(w + 2 * M, h + 2 * M, opts);
    this.M = M;
    this.offset(M, M);
    this.shadows = [];
    this.heaps = [];
  }

  shadow(cx, cy, rx, ry, alpha = 0.3) {
    this.shadows.push([cx + this.M, cy + this.M, rx, ry, alpha]);
    return this;
  }

  heap(cx, cy, rx, ry, top = '#d8bd90', base = '#c6a477') {
    this.heaps.push([cx + this.M, cy + this.M, rx, ry, hexRgb(top), hexRgb(base)]);
    return this;
  }

  pixels() {
    const out = super.pixels();
    if (!this.shadows.length && !this.heaps.length) return out;
    const w = this.W / this.ss;
    const h = this.H / this.ss;
    const z = this.size;
    const tone = [24, 22, 30];
    /** Lay `rgb` at `a` under (or over) what is already at pixel o. */
    const lay = (o, rgb, a, over) => {
      const ad = out[o + 3] / 255;
      const [top, bot, ta, ba] = over ? [rgb, out.subarray(o, o + 3), a, ad] : [out.subarray(o, o + 3), rgb, ad, a];
      const A = ta + ba * (1 - ta);
      if (A <= 0) return;
      const mixed = [0, 1, 2].map((c) => (top[c] * ta + bot[c] * ba * (1 - ta)) / A);
      for (let c = 0; c < 3; c++) out[o + c] = Math.round(mixed[c]);
      out[o + 3] = Math.round(A * 255);
    };
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const o = (y * w + x) * 4;
        let a = 0;
        for (const [cx, cy, rx, ry, al] of this.shadows) {
          const d = Math.hypot((x + 0.5 - cx * z) / (rx * z), (y + 0.5 - cy * z) / (ry * z));
          if (d < 1) a = Math.max(a, al * (1 - smoothstep(0.35, 1, d)));
        }
        if (a > 0) lay(o, tone, a, false);
        for (const [cx, cy, rx, ry, top, base] of this.heaps) {
          const u = (x + 0.5 - cx * z) / (rx * z);
          const v = (y + 0.5 - cy * z) / (ry * z);
          const d = Math.hypot(u, v);
          if (d >= 1) continue;
          // Lighter on its upper left, fading out at its rim.
          lay(o, lerp3(top, base, clamp(0.5 + v * 0.6 + u * 0.25)), 1 - smoothstep(0.5, 1, d), true);
        }
      }
    return out;
  }
}

/** A tuft of grass blades fanning up from (x, y). */
function tuft(s, x, y, h = 5, n = 5, ramp = W.oak, spread = 1) {
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0 : i / (n - 1) - 0.5;
    const len = h * (1 - Math.abs(t) * 0.7);
    s.taper(x + t * 2.2 * spread, y, x + t * 5 * spread + t * 1.5, y - len, 0.75, 0.15, ramp);
  }
}

// -------------------------------------------------------------------------- Greenhill Fields

/**
 * A clump of leaves like a small cloud: a soft ball with a few rounder bunches along its upper rim, so the outline
 * is scalloped, and a few leaf marks inside (pale on the lit upper left, dark lower down).
 */
function clump(s, x, y, rx, ry, ramp, { bumps = 5, bias = -0.1 } = {}) {
  s.ellipse(x, y, rx, ry, ramp, bias);
  const r = Math.min(rx, ry) * 0.46;
  for (let i = 0; i < bumps; i++) {
    const a = Math.PI * (1.08 + (0.84 * i) / (bumps - 1));
    s.ellipse(x + Math.cos(a) * (rx - r * 0.75), y + Math.sin(a) * (ry - r * 0.75), r, r * 0.88, ramp, bias);
  }
  for (const [u, v] of [[-0.45, -0.35], [-0.1, -0.55], [-0.62, 0.0], [0.25, -0.4]])
    s.spot(x + u * rx, y + v * ry, Math.max(0.8, rx * 0.1), Math.max(0.5, ry * 0.06), ramp[0]);
  for (const [u, v] of [[0.2, 0.45], [-0.25, 0.6], [0.55, 0.2]])
    s.spot(x + u * rx, y + v * ry, Math.max(0.9, rx * 0.12), Math.max(0.5, ry * 0.07), ramp[2]);
  return s;
}

/**
 * A crown of clumps [x, y, rx, ry]: a deep-green mass behind, then the clumps from the back (top) to the front
 * (bottom), each toned by where it sits: sunny on the upper left, deep on the lower right.
 */
function crown(s, clumps, { tones = [W.oakDeep, W.oak, W.oakLight], bumps = 5, mass = null } = {}) {
  if (mass) s.ellipse(...mass, tones[0], -0.15);
  const xs = clumps.flatMap(([x, , rx]) => [x - rx, x + rx]);
  const ys = clumps.flatMap(([, y, , ry]) => [y - ry, y + ry]);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
  const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  const hx = (Math.max(...xs) - Math.min(...xs)) / 2;
  const hy = (Math.max(...ys) - Math.min(...ys)) / 2;
  for (const [x, y, rx, ry] of [...clumps].sort((p, q) => p[1] - q[1])) {
    const l = -(((x - cx) / hx) * 0.55 + ((y - cy) / hy) * 0.75);
    clump(s, x, y, rx, ry, l > 0.25 ? tones[2] : l < -0.3 ? tones[0] : tones[1], { bumps });
  }
  return s;
}

/** A big round oak: a thick short trunk and a crown of soft leafy clumps. */
function tree() {
  const s = new Prop(72, 82);
  s.shadow(37, 78.5, 30, 5.5, 0.32);
  // Trunk with root flares, then bark grooves.
  s.poly([[29, 48], [42, 48], [42.5, 64], [45, 72], [50, 78.5], [43, 78.5], [36, 79.5], [29, 78.5], [22, 78.5], [27, 72], [29.5, 64]], W.bark);
  s.taper(29, 73, 21.5, 78.6, 2.4, 0.9, W.bark).taper(43, 73, 50.5, 78.6, 2.4, 0.9, W.bark);
  s.line(32.5, 55, 31.6, 76, 0.4, W.bark[2]).line(37, 57, 37.6, 77.5, 0.35, W.bark[2]).line(40.5, 54, 41.6, 72, 0.35, W.bark[3]);
  s.line(30.8, 58, 31.2, 70, 0.3, W.bark[0]).line(34.5, 62, 34.8, 72, 0.25, W.bark[0]);
  s.spot(38.8, 65, 1.2, 1.7, W.bark[3]); // a knot hole
  // Branches reaching into the crown.
  s.taper(40, 51, 50, 40, 2.4, 1, W.bark).taper(31, 51, 23, 42, 2.2, 0.9, W.bark);
  // The crown's shadow on the top of the trunk.
  s.spot(35.5, 50, 7.5, 3, W.bark[3]);
  crown(s, [[36, 12, 13, 9], [22, 18, 12, 10], [50, 18, 12, 10], [13, 32, 10, 9], [35, 27, 15, 11], [59, 32, 10, 9], [23, 40, 13, 9], [49, 40, 13, 9], [36, 45, 13, 7]]);
  return s;
}

/** A round bush with a few small red berries. */
function bush() {
  const s = new Prop(38, 32);
  s.shadow(19, 30, 16, 3.2, 0.3);
  crown(s, [[14, 13, 8, 6.5], [25, 12, 8.5, 7], [9, 22, 6.5, 6], [20, 21, 9, 7.5], [30, 22, 6.5, 6]], { tones: [W.bushDeep, W.bush, W.oakLight], bumps: 4, mass: [19, 19, 15.5, 10.5] });
  s.clear(0, 29.5, 38, 4);
  for (const [x, y] of [[11, 15], [22, 10.5], [28.5, 17.5], [16, 22.5], [26, 24], [7.5, 21.5]]) {
    s.ellipse(x, y, 1.05, 1.05, W.berry);
    s.spot(x - 0.35, y - 0.4, 0.32, 0.28, '#ffd9cf');
  }
  tuft(s, 5, 30, 4, 4, W.bush);
  tuft(s, 33, 30, 3.5, 3, W.bush);
  return s;
}

/** Patches of moss lying on a surface: a few flat, overlapping blobs that merge into one ragged patch. */
function mossPatch(s, x, y, w, h, ramp = W.moss, n = 5, seed = 1) {
  const rnd = mulberry(seed);
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0.5 : i / (n - 1);
    const rx = Math.min(w * (0.2 + rnd() * 0.1), h * 0.9);
    s.ellipse(x + (t - 0.5) * w * 0.8 + (rnd() - 0.5) * 1.2, y + (rnd() - 0.5) * h * 0.4, rx, h * (0.42 + rnd() * 0.15), ramp, -0.05);
  }
  // A few soft speckles of lighter moss.
  for (let i = 0; i < Math.ceil(n / 2); i++) s.spot(x + (rnd() - 0.6) * w * 0.6, y - h * 0.15 + (rnd() - 0.5) * h * 0.3, 0.6, 0.4, ramp[0]);
  return s;
}

/** A mossy grey boulder with a smaller stone beside it and a grass tuft. */
function rock() {
  const s = new Prop(32, 28);
  s.shadow(16, 26, 14.5, 3, 0.3);
  s.clip(0, 0, 32, 25.6);
  s.ellipse(14, 17, 11.5, 9.5, W.stone);
  s.ellipse(13, 12.5, 8.5, 4.6, W.stone, 0.18); // the top, catching the light
  s.ellipse(25.5, 22, 5.5, 4.2, W.stoneDark);
  s.ellipse(25, 20.4, 3.6, 1.8, W.stoneDark, 0.18);
  s.unclip();
  mossPatch(s, 12.5, 11, 13, 4.2, W.moss, 5, 3);
  s.ellipse(6.5, 15, 2, 1.5, W.moss, 0.05).ellipse(24.5, 19.8, 2.4, 1.1, W.moss, 0.1);
  // Cracks and pits.
  s.line(18.5, 15.5, 20.5, 19.5, 0.3, W.stone[3]).line(20.5, 19.5, 20, 23, 0.28, W.stone[3]);
  s.spot(9, 20, 0.7, 0.5, W.stone[2]).spot(13, 23, 0.5, 0.4, W.stone[2]).spot(16, 19.5, 0.5, 0.4, W.stone[2]);
  tuft(s, 5.5, 25.8, 5, 5, W.oak);
  tuft(s, 30, 25.8, 3.5, 3, W.oak);
  return s;
}

/** A patch of white and yellow wildflowers among clover leaves. */
function flowers() {
  const s = new Prop(28, 20);
  s.shadow(14, 18.2, 12, 2.4, 0.26);
  const clover = (x, y, k = 1) => {
    s.line(x, y + 2, x, y + 4.5, 0.3, W.clover[2]);
    for (let i = 0; i < 3; i++) {
      const a = -Math.PI / 2 + (i - 1) * 2.1;
      s.ellipse(x + Math.cos(a) * 1.5 * k, y + Math.sin(a) * 1.1 * k, 1.5 * k, 1.2 * k, W.clover);
    }
  };
  // Stems first, then clover, then the flower heads on top.
  const heads = [[6, 9, 'w'], [11, 6.5, 'y'], [16, 8, 'w'], [21, 6.5, 'w'], [24.5, 10.5, 'y'], [9, 12.5, 'y'], [18, 12.5, 'w']];
  for (const [x, y] of heads) s.line(x, y + 1, x + (14 - x) * 0.1, 17, 0.32, W.clover[2]);
  for (const [x, y] of [[3.5, 14.5], [12, 15], [20, 15.5], [26, 14.5], [15, 13], [7, 16], [23, 17]]) clover(x, y);
  for (const [x, y, c] of heads) {
    const ramp = c === 'w' ? W.petal : W.yellow;
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + i * 1.2566;
      s.ellipse(x + Math.cos(a) * 1.25, y + Math.sin(a) * 1.05, 1.05, 0.9, ramp);
    }
    s.ellipse(x, y, 0.75, 0.7, c === 'w' ? W.yellow : C.tan);
  }
  tuft(s, 2, 18, 3.5, 3, W.clover);
  return s;
}

/** A short rustic fence: three posts, two rails, a rope tied round the middle post. */
function fence() {
  const s = new Prop(48, 30);
  s.shadow(24, 27.5, 22, 2.6, 0.28);
  const posts = [[6, 9, 27], [24, 7, 27.5], [42, 9.5, 27]];
  // Rails behind the posts, sagging and a little crooked.
  s.capsule(5, 13.5, 43, 12.8, 1.3, W.plank).capsule(5, 20.5, 43, 20, 1.3, W.plank);
  s.line(10, 13, 20, 12.9, 0.25, W.plank[0]).line(28, 12.7, 38, 12.6, 0.25, W.plank[0]);
  for (const [x, top, bot] of posts) {
    s.rect(x - 2.1, top, 4.2, bot - top, W.bark);
    s.ellipse(x, top, 2.1, 1.1, W.plank, 0.2); // the cut top, seen from above
    s.spot(x - 0.3, top - 0.1, 1.1, 0.45, W.plank[2]);
    s.line(x - 0.6, top + 3, x - 0.8, bot - 3, 0.25, W.bark[2]);
  }
  // The rope: three wraps around the middle post and an end hanging down.
  for (const y of [10.5, 12, 13.5]) s.capsule(21.6, y + 0.4, 26.4, y - 0.3, 0.55, W.rope);
  s.taper(25.5, 13.6, 27.4, 18.5, 0.6, 0.35, W.rope).ellipse(27.5, 18.8, 0.7, 0.8, W.rope);
  s.taper(24.8, 13.8, 25.4, 16.5, 0.55, 0.3, W.rope);
  for (const [x] of posts) tuft(s, x, 27.2, 4, 4, W.oak);
  tuft(s, 14, 27.4, 3, 3, W.oak);
  tuft(s, 34, 27.4, 3.5, 3, W.oak);
  return s;
}

/** A wooden signpost with two blank arrow boards. */
function signpost() {
  const s = new Prop(32, 44);
  s.shadow(16, 41.5, 11, 2.4, 0.3);
  s.rect(14.2, 6, 3.6, 36, W.bark);
  s.ellipse(16, 6, 1.8, 0.9, W.plank, 0.2);
  s.line(15.2, 9, 15, 39, 0.25, W.bark[2]);
  // Boards: one pointing right, one left, each with grain lines and nails.
  s.poly([[9, 9], [26, 9], [30, 12.5], [26, 16], [9, 16]], W.plank);
  s.poly([[23, 19], [6, 19], [2, 22.5], [6, 26], [23, 26]], W.plank);
  s.line(10.5, 11.6, 25, 11.6, 0.25, W.plank[2]).line(11, 13.9, 26.5, 13.9, 0.22, W.plank[2]);
  s.line(7, 21.6, 21.5, 21.6, 0.25, W.plank[2]).line(5.5, 23.9, 20.5, 23.9, 0.22, W.plank[2]);
  for (const [x, y] of [[16, 12.5], [16, 22.5]]) s.spot(x, y, 0.6, 0.6, C.iron[2]).spot(x - 0.2, y - 0.2, 0.25, 0.25, C.iron[0]);
  // A few stones and grass at its foot.
  s.ellipse(11, 41, 2.2, 1.4, W.stone).ellipse(20.5, 41.3, 1.6, 1.1, W.stone);
  tuft(s, 14, 42, 4.5, 4, W.oak);
  tuft(s, 19, 42, 3.5, 3, W.oak);
  return s;
}

// -------------------------------------------------------------------------- Lantern Pines

/**
 * A frond (a fern leaf, a palm leaf): a rib from (x0, y0) along a quadratic curve through (cx, cy) to (x1, y1),
 * with leaflets on both sides that shorten toward the tip. `droop` bends the leaflets down (palms), `len` is the
 * longest leaflet.
 */
function frond(s, x0, y0, cx, cy, x1, y1, ramp, { len = 4, n = 8, r = 0.8, droop = 0.4, rib = 0.5, round = false, bell = false } = {}) {
  const at = (t) => [(1 - t) ** 2 * x0 + 2 * (1 - t) * t * cx + t * t * x1, (1 - t) ** 2 * y0 + 2 * (1 - t) * t * cy + t * t * y1];
  for (let i = 0; i < n; i++) {
    const t = 0.12 + (i / n) * 0.85;
    const [px, py] = at(t);
    const [qx, qy] = at(Math.min(1, t + 0.05));
    const d = Math.hypot(qx - px, qy - py) || 1;
    const ux = (qx - px) / d;
    const uy = (qy - py) / d;
    const l = bell ? len * (0.45 + 0.55 * Math.sin(Math.PI * Math.min(1, t * 1.25))) * (1 - t * 0.35) : len * (1 - t * 0.65);
    for (const side of [-1, 1]) {
      // Leaflets lean toward the tip and hang down a little.
      const vx = -uy * side + ux * 0.55;
      const vy = ux * side + uy * 0.55 + droop;
      const m = Math.hypot(vx, vy);
      if (round) s.ellipse(px + (vx / m) * l * 0.5, py + (vy / m) * l * 0.5, l * 0.55, r * (1 - t * 0.35), ramp, { rot: Math.atan2(vy, vx) });
      else s.taper(px, py, px + (vx / m) * l, py + (vy / m) * l, r * (1 - t * 0.4), 0.15, ramp);
    }
  }
  const pts = Array.from({ length: 7 }, (_, i) => at(i / 6));
  for (let i = 1; i < pts.length; i++) s.taper(...pts[i - 1], ...pts[i], rib * (1 - (i - 1) / 7), rib * (1 - i / 7) + 0.1, ramp);
  return s;
}

/** A tall dark pine: a straight trunk under five tiers of drooping, needled branches. */
function pine() {
  const s = new Prop(60, 88);
  s.shadow(30, 84.5, 23, 4.5, 0.32);
  // Drawn a touch smaller around its foot, so it stands about as tall as the oak.
  s.translate(30 * 0.08, 85 * 0.08).scale(0.92);
  s.rect(26.8, 56, 6.4, 29, W.pineBark);
  s.taper(27, 82, 23.5, 84.9, 1.6, 0.6, W.pineBark).taper(33, 82, 36.5, 84.9, 1.6, 0.6, W.pineBark);
  s.line(28.6, 66, 28.4, 82, 0.3, W.pineBark[2]).line(31.6, 62, 31.8, 80, 0.25, W.pineBark[3]).line(28, 60, 28, 70, 0.25, W.pineBark[0]);
  // Tiers from the bottom up: apex y, bottom y, half width. Each is a cone whose lower edge is a row of drooping,
  // rounded branch ends (the outer ones hang lowest), with a shadow cast on the tier below.
  const cx = 30;
  const tiers = [[34, 70, 28], [23, 57, 23.5], [13, 44, 19], [5, 31, 14], [-1, 19, 9]];
  tiers.forEach(([top, bot, hw], i) => {
    const ramp = i % 2 ? W.pine2 : W.pine;
    if (i > 0) s.spot(cx + 1.5, bot - 0.5, hw * 0.75, 1.6, W.pine[2]);
    // Branch ends first (their lit tops are then hidden under the cone, leaving a soft, darker, drooping hem).
    const n = Math.max(3, Math.round(hw / 5));
    const rnd = mulberry(i + 4);
    for (let k = 0; k < n; k++) {
      const u = n === 1 ? 0 : -1 + (2 * k) / (n - 1);
      const r = (hw / n) * (1.35 + rnd() * 0.25);
      const x = cx + u * hw * 0.8 + (rnd() - 0.5) * 1.5;
      const y = bot - 3 + Math.abs(u) * 1.8;
      s.ellipse(x, y, r, 2.6, ramp, { bias: -0.12, rot: u * 0.3 });
      for (const d of [-0.6, -0.15, 0.35, 0.75]) s.taper(x + d * r, y + 1.2, x + d * r * 1.25 + u, y + 3.2 + rnd() * 0.8, 0.75, 0.12, ramp, -0.25);
    }
    s.poly([[cx, top], [cx + hw * 0.5, top + (bot - top) * 0.55], [cx + hw * 0.98, bot - 3], [cx - hw * 0.98, bot - 3], [cx - hw * 0.5, top + (bot - top) * 0.55]], ramp);
    // Needles: pale strokes on the lit left, dark ones on the right, running down and out from the middle.
    const h = bot - top;
    for (let k = 0; k < 3 + i; k++) {
      const v = (k + 0.5) / (3 + i);
      const y = top + h * (0.3 + v * 0.5);
      const w = hw * ((y - top) / h);
      const j = (rnd() - 0.5) * 0.25;
      s.line(cx - w * (0.35 + j), y - 1, cx - w * (0.62 + j), y + 0.8, 0.24, W.pine[0]);
      s.line(cx + w * (0.35 + j), y - 0.8, cx + w * (0.65 + j), y + 1, 0.24, W.pine[2]);
    }
  });
  return s;
}

/** A squat, mossy stone lantern: a low base, a short post, a box with a dark window, a wide little roof. */
function stoneLantern() {
  const s = new Prop(30, 40);
  s.shadow(15, 37.5, 12, 2.5, 0.32);
  // Base block and its top.
  s.rect(6, 31.5, 18, 6, W.stoneDark);
  s.poly([[6, 31.5], [24, 31.5], [22.5, 29.5], [7.5, 29.5]], W.stoneDark, 0.2);
  s.rect(11.5, 23, 7, 7.5, W.stone);
  // The light box: a dark window, a frame, a slab under it.
  s.rect(8.5, 21.5, 13, 2.5, W.stoneDark, 0.1);
  s.rect(9.5, 13.5, 11, 8.5, W.stone);
  s.rect(12, 15, 6, 5.5, ['#4a3f33', '#3a3129', '#2d2620', '#1c1814'], { outline: false });
  s.line(15, 15, 15, 20.5, 0.35, W.stone[2]);
  // Roof: a wide flat pyramid with turned-up corners, and its knob.
  s.poly([[2, 14.5], [4.5, 12.6], [10, 9.6], [15, 7.4], [20, 9.6], [25.5, 12.6], [28, 14.5], [24, 15.4], [6, 15.4]], W.stone, 0.1);
  s.line(15, 8, 15, 14.5, 0.25, W.stone[2]);
  s.ellipse(15, 6.2, 2.2, 2, W.stone).ellipse(15, 3.6, 1.1, 1.3, W.stone, 0.1);
  mossPatch(s, 10.5, 11.2, 8, 2.6, W.mossDark, 4, 7);
  s.ellipse(22.8, 12.8, 1.4, 1, W.mossDark, -0.05);
  mossPatch(s, 9.5, 30, 6, 1.6, W.mossDark, 3, 8);
  s.ellipse(21.8, 33.8, 1.1, 1.5, W.mossDark);
  s.spot(17, 27, 0.5, 0.8, W.stone[2]).spot(8.5, 35, 0.8, 0.4, W.stoneDark[2]);
  tuft(s, 5, 37.5, 4, 4, W.fern);
  tuft(s, 25, 37.5, 3.5, 3, W.fern);
  return s;
}

/** A wooden post with an arm, and a round orange paper lantern with wooden ribs hanging from a hook (unlit). */
function paperLantern() {
  const s = new Prop(30, 48);
  s.shadow(13, 45.5, 10, 2.2, 0.32);
  s.shadow(21, 45, 6, 1.6, 0.18);
  s.rect(7, 5, 4, 41, W.bark);
  s.ellipse(9, 5, 2, 0.9, W.plank, 0.2);
  s.line(8.2, 9, 8, 43, 0.25, W.bark[2]);
  // The arm and its brace.
  s.capsule(9, 8.5, 22.5, 8.5, 1.05, W.bark);
  s.capsule(10, 15, 15.5, 9, 0.75, W.bark);
  // Hook and cord.
  s.line(21, 9.5, 21, 12.5, 0.32, C.iron[2]);
  s.capsule(20.6, 12.6, 21.4, 12.6, 0.45, C.iron);
  // The lantern: top cap, paper ball, its wooden ribs (curving as seen from a little above), bottom cap, tassel.
  const cx = 21;
  const cy = 22.5;
  const rx = 6.4;
  const ry = 7.6;
  s.rect(cx - 2.6, 13.3, 5.2, 1.8, C.umber);
  s.ellipse(cx, cy, rx, ry, W.paper);
  for (const v of [-0.62, -0.3, 0, 0.3, 0.62]) {
    const y0 = cy + v * ry;
    const w = rx * Math.sqrt(1 - v * v) * 0.97;
    const pts = Array.from({ length: 9 }, (_, i) => {
      const u = -1 + (i / 8) * 2;
      return [cx + u * w, y0 + Math.sqrt(1 - u * u) * 0.9];
    });
    for (let i = 1; i < pts.length; i++) s.line(...pts[i - 1], ...pts[i], 0.24, W.paper[2]);
  }
  s.line(cx, cy - ry + 1, cx, cy + ry - 1, 0.22, W.paper[2]);
  s.spot(cx - 2.6, cy - 3, 1.3, 2.2, W.paper[0]);
  s.rect(cx - 2.2, cy + ry - 0.6, 4.4, 1.6, C.umber);
  s.taper(cx, cy + ry + 1, cx, cy + ry + 5, 0.9, 0.5, C.brick);
  s.ellipse(cx, cy + ry + 1.2, 0.9, 0.7, C.brick);
  // Foot of the post.
  s.ellipse(5.5, 45.2, 1.8, 1.1, W.stone).ellipse(13, 45.4, 1.4, 0.9, W.stone);
  tuft(s, 9, 46, 4, 4, W.fern);
  return s;
}

/** A tiny wooden house with a curved, sweeping roof on a single post, a red cloth tied to the post. */
function waysideShrine() {
  const s = new Prop(36, 50);
  s.shadow(18, 47.5, 10, 2.2, 0.32);
  s.rect(16, 24, 4, 24, W.bark);
  s.line(17, 28, 16.8, 46, 0.25, W.bark[2]);
  // A shelf on two brackets, the little house with its doors open, a stone and an offering bowl inside.
  s.taper(16.5, 28.6, 12.5, 25.6, 0.75, 0.55, W.bark).taper(19.5, 28.6, 23.5, 25.6, 0.75, 0.55, W.bark);
  s.rect(8, 23.5, 20, 2.4, W.plank, 0.1);
  s.rect(10.5, 14, 15, 9.8, W.plank);
  s.rect(13.8, 15.6, 8.4, 8, ['#40352b', '#342a21', '#282019', '#16110d'], { outline: false });
  s.ellipse(18, 21.6, 1.9, 1.7, W.stone);
  s.spot(17.4, 21, 0.55, 0.45, W.stone[0]);
  s.ellipse(15.3, 23, 1.1, 0.6, C.cream);
  s.rect(11.6, 15.6, 2.2, 8, W.plank, 0.15).rect(22.2, 15.6, 2.2, 8, W.plank, -0.1);
  s.line(12.7, 16.5, 12.7, 22.8, 0.2, W.plank[2]).line(23.3, 16.5, 23.3, 22.8, 0.2, W.plank[2]);
  s.spot(18, 15.2, 6, 0.9, W.plank[3]);
  // The roof: concave slopes sweeping out to turned-up tips, tile lines, a ridge cap.
  const roof = [];
  for (let i = 0; i <= 16; i++) {
    const u = -1 + i / 8;
    const lift = Math.abs(u) > 0.86 ? (Math.abs(u) - 0.86) * 9 : 0;
    roof.push([18 + u * 16.5, 13.5 - 8.2 * (1 - Math.abs(u)) ** 1.9 - lift]);
  }
  roof.push([31.5, 15.6], [18, 14.8], [4.5, 15.6]);
  s.poly(roof, W.roof);
  for (const u of [-0.7, -0.45, -0.2, 0.2, 0.45, 0.7]) {
    const x = 18 + u * 16.5;
    s.line(x, 13.6 - 8.2 * (1 - Math.abs(u)) ** 1.9 + 0.6, x + u * 1.2, 14.6, 0.22, u < 0 ? W.roof[0] : W.roof[2]);
  }
  s.capsule(14.5, 5.6, 21.5, 5.6, 0.95, W.roof, 0.15);
  s.ellipse(14, 5.2, 1, 1.1, W.roof, 0.2).ellipse(22, 5.2, 1, 1.1, W.roof, 0.2);
  // The red cloth: a band, a knot and two tails.
  s.rect(15.7, 31.5, 4.6, 2, C.brick);
  s.taper(19.8, 33, 21.8, 39.5, 1.1, 0.5, C.brick).taper(19.3, 33, 19.9, 38, 0.9, 0.45, C.brick);
  s.ellipse(19.9, 32.6, 1.3, 1.1, C.brick, 0.1);
  s.ellipse(13, 47.2, 1.6, 1, W.stone).ellipse(22.5, 47.3, 1.3, 0.9, W.stone);
  tuft(s, 16, 48, 4, 4, W.fern);
  tuft(s, 21, 48, 3, 3, W.fern);
  return s;
}

/** An old tree stump with rings on top, roots, a patch of moss and small brown mushrooms. */
function stump() {
  const s = new Prop(36, 28);
  s.shadow(18, 25.5, 15, 2.6, 0.32);
  s.taper(9, 21, 3.5, 25.2, 2.2, 0.7, W.bark).taper(26, 21, 31.5, 25.2, 2.2, 0.7, W.bark).taper(17, 23, 18.5, 26, 2, 0.8, W.bark);
  s.poly([[8.5, 9], [26.5, 9], [27, 19], [28, 23.5], [7, 23.5], [8, 19]], W.bark);
  for (const [x, a] of [[11, 0.3], [15, -0.2], [19.5, 0.1], [24, -0.3]]) s.line(x, 12, x + a, 22, 0.28, W.bark[2]);
  s.line(10, 13, 10.2, 18, 0.25, W.bark[0]);
  // The cut top with its rings and a crack.
  s.ellipse(17.5, 9, 9.2, 3.4, W.stumpTop, 0.1);
  for (const k of [0.72, 0.46, 0.22]) s.ellipse(17.5, 9.1, 9.2 * k, 3.4 * k, [W.stumpTop[2], W.stumpTop[2], W.stumpTop[2], W.stumpTop[2]], { flat: W.stumpTop[2], outline: false }).ellipse(17.5, 9.1, 9.2 * k - 0.45, 3.4 * k - 0.3, W.stumpTop, { flat: W.stumpTop[1], outline: false });
  s.line(17.5, 9, 23, 7.4, 0.25, W.stumpTop[3]);
  mossPatch(s, 11, 16, 6, 4, W.mossDark, 3, 11);
  // Mushrooms at the foot and one on the side.
  const shroom = (x, y, r) => {
    s.rect(x - r * 0.35, y - r * 0.9, r * 0.7, r * 0.95, C.cream);
    s.ellipse(x, y - r * 0.95, r, r * 0.6, W.shroom);
    s.spot(x - r * 0.35, y - r * 1.15, r * 0.3, r * 0.15, W.shroom[0]);
  };
  shroom(27.8, 24.4, 3.1);
  shroom(32, 24.8, 2.2);
  shroom(24.4, 25, 1.9);
  shroom(6.5, 21.8, 2);
  tuft(s, 4, 25.5, 3.5, 3, W.fern);
  return s;
}

/** A mossy boulder with ferns growing around it. */
function fernRock() {
  const s = new Prop(44, 32);
  s.shadow(22, 29.5, 19, 3, 0.32);
  const f = { len: 3.4, n: 10, r: 0.9, round: true, droop: 0.25 };
  // Ferns behind the rock, arching up and out.
  frond(s, 16, 25, 10, 8, 2, 11, W.fern, f);
  frond(s, 24, 24, 29, 6, 39, 9, W.fern, f);
  frond(s, 20, 24, 19, 8, 14, 3, W.fern, { ...f, len: 2.8, n: 8 });
  s.clip(0, 0, 44, 29);
  s.ellipse(22, 21, 11.5, 9, W.stone);
  s.ellipse(21, 16.5, 8.5, 4.2, W.stone, 0.18);
  s.unclip();
  mossPatch(s, 20.5, 15, 14, 4.4, W.mossDark, 5, 13);
  s.ellipse(13, 19.5, 1.8, 1.4, W.mossDark);
  s.line(26, 19, 28.5, 24.5, 0.3, W.stone[3]);
  s.spot(16, 24, 0.7, 0.5, W.stone[2]).spot(29.5, 21, 0.5, 0.4, W.stone[2]);
  // Ferns in front.
  frond(s, 11, 29, 4, 22, 1, 15, W.fern, { ...f, len: 2.8, n: 8 });
  frond(s, 32, 29, 38, 20, 43, 18, W.fern, { ...f, len: 2.8, n: 8 });
  frond(s, 27, 29.5, 31, 25, 36, 25, W.fern, { ...f, len: 2.2, n: 6 });
  return s;
}

// -------------------------------------------------------------------------- Sunscar Desert

/** A tall date palm: a curved, ringed trunk, a crown of drooping fronds and a bunch of dates. */
function palm() {
  const s = new Prop(70, 88);
  s.shadow(28, 85, 14, 3, 0.3);
  s.shadow(46, 84.5, 20, 3.5, 0.18);
  s.translate(28 * 0.05, 85 * 0.05).scale(0.95);
  // The trunk along a curve from its foot up to the crown, thinner toward the top, ringed.
  const P0 = [27, 85];
  const P1 = [20, 52];
  const P2 = [38, 22];
  const at = (t) => [(1 - t) ** 2 * P0[0] + 2 * (1 - t) * t * P1[0] + t * t * P2[0], (1 - t) ** 2 * P0[1] + 2 * (1 - t) * t * P1[1] + t * t * P2[1]];
  const rAt = (t) => 3.6 - t * 1.4;
  for (let i = 0; i < 24; i++) s.capsule(...at(i / 24), ...at((i + 1) / 24), rAt(i / 24), W.palmBark);
  s.taper(P0[0] - 1, P0[1] - 5, P0[0] - 5, P0[1] - 0.3, 2.4, 1, W.palmBark).taper(P0[0] + 1, P0[1] - 5, P0[0] + 5, P0[1] - 0.3, 2.4, 1, W.palmBark);
  for (let i = 1; i < 18; i++) {
    const t = i / 18;
    const [x, y] = at(t);
    const [qx, qy] = at(t + 0.01);
    const d = Math.hypot(qx - x, qy - y);
    const nx = -(qy - y) / d;
    const ny = (qx - x) / d;
    const r = rAt(t) * 0.92;
    s.line(x - nx * r, y - ny * r + 0.5, x + nx * r, y + ny * r + 0.5, 0.28, W.palmBark[2]);
    s.line(x - nx * r * 0.8, y - ny * r * 0.8 - 0.1, x - nx * r * 0.1, y - ny * r * 0.1 - 0.4, 0.2, W.palmBark[0]);
  }
  // Fronds: the back ones first (deep green, arching up and away), then the ones drooping to the sides and front.
  const c = [38, 21];
  const f = (x1, y1, mx, my, ramp, len = 6.5, n = 16) => frond(s, c[0], c[1], mx, my, x1, y1, ramp, { len, n, r: 1.25, droop: 1.6, rib: 0.9, bell: true });
  f(14, 14, 22, 2, W.frondDeep);
  f(62, 12, 52, 0, W.frondDeep);
  f(30, 4, 32, 2, W.frondDeep, 4.5, 10);
  f(48, 4, 44, 1, W.frondDeep, 4.5, 10);
  f(3, 30, 14, 9, W.frond);
  f(68, 31, 59, 10, W.frond);
  // Dates hanging under the crown.
  for (const [x, y] of [[40, 25], [42.5, 26.5], [38.5, 27.5], [41, 29], [43.5, 29], [39.5, 30.5], [42, 31.5]]) s.ellipse(x, y, 1.35, 1.5, W.dates);
  s.capsule(39.5, 22.5, 41, 25, 0.4, W.dates);
  f(15, 40, 19, 21, W.frond, 6, 14);
  f(61, 42, 57, 22, W.frond, 6, 14);
  f(29, 41, 30, 26, W.frond, 4.6, 11);
  f(49, 42, 47, 27, W.frond, 4.6, 11);
  s.ellipse(c[0], c[1], 2.6, 2, W.palmBark);
  s.heap(27, 85.5, 7.5, 2.4);
  return s;
}

/** A round green cactus with a small yellow flower, a little one beside it. */
function cactus() {
  const s = new Prop(30, 34);
  s.shadow(15, 31.5, 12.5, 2.6, 0.3);
  const ball = (x, y, rx, ry, ribs) => {
    s.clip(0, 0, 30, y + ry * 0.75);
    s.ellipse(x, y, rx, ry, W.cactus);
    s.unclip();
    for (let k = 1; k < ribs; k++) {
      const u = -1 + (2 * k) / ribs;
      const pts = Array.from({ length: 9 }, (_, i) => {
        const v = -0.92 + (i / 8) * 1.65;
        return [x + u * rx * Math.sqrt(1 - v * v), y + v * ry];
      });
      for (let i = 1; i < pts.length; i++) s.line(...pts[i - 1], ...pts[i], 0.24, u < -0.2 ? W.cactus[2] : W.cactus[3]);
      for (let i = 1; i < pts.length - 1; i += 2) s.spot(pts[i][0] - 0.3, pts[i][1], 0.32, 0.32, W.cloth[0]);
    }
  };
  ball(23, 26, 5, 4.6, 5);
  ball(13, 18.5, 9, 10, 7);
  // The flower on top.
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI / 2 + i * 1.047;
    s.ellipse(13 + Math.cos(a) * 1.5, 8.6 + Math.sin(a) * 1, 1.25, 0.95, W.yellow);
  }
  s.ellipse(13, 8.6, 0.8, 0.65, C.tan);
  s.heap(15, 31.5, 13, 2.6);
  s.ellipse(4, 30.5, 1.4, 0.9, W.sandstoneDark).ellipse(26.5, 31, 1, 0.7, W.sandstoneDark);
  return s;
}

/** A broken sandstone pillar on a stepped base, with carved bands, cracks and a fallen piece. */
function pillarBroken() {
  const s = new Prop(36, 48);
  s.shadow(18, 45.5, 16, 2.6, 0.3);
  // Stepped base, each step with its lit top.
  s.rect(4, 38.5, 26, 6.5, W.sandstoneDark);
  s.poly([[4, 38.5], [30, 38.5], [28.5, 36.5], [5.5, 36.5]], W.sandstoneDark, 0.22);
  s.rect(7, 33, 20, 4.2, W.sandstone);
  s.poly([[7, 33], [27, 33], [26, 31.4], [8, 31.4]], W.sandstone, 0.22);
  // The shaft and its broken, jagged top (the break catching the light).
  s.poly([[9.5, 32], [9.5, 11], [11.5, 9.5], [13.5, 6], [16, 8], [18.5, 4.5], [20.5, 7.5], [22.5, 6.5], [24.5, 10], [24.5, 32]], W.sandstone);
  s.poly([[9.6, 11.2], [11.5, 9.5], [13.5, 6], [16, 8], [18.5, 4.5], [20.5, 7.5], [22.5, 6.5], [24.4, 10.2], [22, 11.6], [17, 10.4], [12.5, 12]], W.sandstone, 0.35);
  // Flutes, then two carved bands.
  for (const x of [12.5, 15.5, 18.5, 21.5]) s.line(x, 15, x, 26, 0.22, x < 17 ? W.sandstone[2] : W.sandstone[3]);
  for (const y of [13, 27]) {
    s.rect(9, y, 16, 2.6, W.sandstone, 0.1);
    s.line(9.6, y + 1.3, 24.4, y + 1.3, 0.2, W.sandstone[2]);
  }
  // Cracks and chips.
  s.line(20.5, 16, 22, 20, 0.25, W.sandstone[3]).line(22, 20, 21, 24, 0.22, W.sandstone[3]);
  s.spot(11, 21, 0.7, 0.5, W.sandstone[2]).spot(14, 35, 0.6, 0.4, W.sandstone[2]).spot(26, 41, 0.8, 0.5, W.sandstoneDark[2]);
  // The fallen piece.
  s.poly([[28.5, 44.5], [29, 40.5], [32, 39], [34.5, 41], [34, 44.5]], W.sandstone);
  s.poly([[29, 40.5], [32, 39], [34.5, 41], [31.5, 42]], W.sandstone, 0.3);
  s.heap(12, 45.5, 10, 2.2);
  s.heap(26, 45.5, 6, 1.8);
  return s;
}

/** A weathered sandstone lion lying on a low block, its paws forward, eyes calmly closed. */
function lionStatue() {
  const s = new Prop(48, 36);
  s.shadow(24, 33.5, 22, 2.8, 0.3);
  // The block and its top.
  s.rect(4, 23, 40, 9.5, W.sandstoneDark);
  s.poly([[4, 23], [44, 23], [42, 20.5], [6, 20.5]], W.sandstoneDark, 0.22);
  s.line(6, 26.5, 42, 26.5, 0.22, W.sandstoneDark[2]);
  s.spot(15, 29.5, 1, 0.5, W.sandstoneDark[2]).spot(36, 28.5, 0.8, 0.5, W.sandstoneDark[2]);
  // Tail curled at the back, body, haunch.
  s.taper(9, 20, 5.5, 15, 1.1, 0.7, W.sandstone).taper(5.5, 15, 7.5, 12, 0.8, 0.6, W.sandstone);
  s.ellipse(7.8, 11.6, 1.5, 1.4, W.sandstone, -0.05);
  s.ellipse(21, 16.5, 12, 5.4, W.sandstone);
  s.ellipse(12.5, 16.5, 6, 5, W.sandstone, 0.05);
  s.line(10, 19.5, 15, 20.8, 0.25, W.sandstone[2]);
  // Front paws reaching forward.
  s.capsule(27, 20, 38, 20.6, 1.9, W.sandstone).ellipse(38.6, 20.4, 2.3, 1.7, W.sandstone, 0.1);
  s.line(39.4, 19.6, 39.6, 21.6, 0.2, W.sandstone[2]).line(38, 19.6, 38.2, 21.7, 0.2, W.sandstone[2]);
  // Mane (a scalloped ring), face, muzzle, small ears.
  const mx = 32;
  const my = 12;
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    s.ellipse(mx + Math.cos(a) * 5.3, my + Math.sin(a) * 5.6, 2.6, 2.6, W.sandstoneDark, -0.05);
  }
  s.ellipse(mx, my, 6, 6.3, W.sandstoneDark);
  s.ellipse(mx - 2.6, my - 5.2, 1.4, 1.3, W.sandstone).ellipse(mx + 2.8, my - 5.2, 1.4, 1.3, W.sandstone);
  s.ellipse(mx + 0.6, my + 0.4, 4.2, 4, W.sandstone);
  s.ellipse(mx + 1.6, my + 2.5, 2.4, 1.7, W.sandstone, 0.1);
  s.spot(mx + 1.6, my + 1.5, 0.9, 0.6, W.sandstone[3]);
  s.line(mx - 2, my - 0.4, mx - 0.6, my - 0.1, 0.28, W.sandstone[3]).line(mx + 2.2, my - 0.1, mx + 3.6, my - 0.4, 0.28, W.sandstone[3]);
  s.line(mx + 1.6, my + 2.1, mx + 1.6, my + 3, 0.2, W.sandstone[3]);
  // Weathering: cracks and chips.
  s.line(20, 12, 22, 15.5, 0.24, W.sandstone[3]).line(22, 15.5, 21, 19, 0.22, W.sandstone[3]);
  s.spot(26, 18, 0.7, 0.45, W.sandstone[2]).spot(mx - 4, my + 3, 0.6, 0.5, W.sandstoneDark[2]);
  s.heap(10, 33, 9, 2.2);
  s.heap(36, 33, 9, 2);
  return s;
}

/** A cute, sun-bleached animal skull half sunk in the sand, with a few small bones. */
function skull() {
  const s = new Prop(34, 22);
  s.shadow(17, 19.5, 15, 2.4, 0.28);
  const bone = (x1, y1, x2, y2, r) => {
    s.capsule(x1, y1, x2, y2, r, W.bone);
    const a = Math.atan2(y2 - y1, x2 - x1) + Math.PI / 2;
    for (const [x, y] of [[x1, y1], [x2, y2]]) for (const k of [-1, 1]) s.ellipse(x + Math.cos(a) * r * 0.8 * k, y + Math.sin(a) * r * 0.8 * k, r * 0.95, r * 0.95, W.bone);
  };
  bone(25, 17.5, 31.5, 15.8, 0.7);
  bone(3, 17, 7.5, 18.6, 0.6);
  // Little curved horns, the round cranium, the snout, big round eye sockets, nostrils.
  s.taper(10, 7, 5.5, 4.5, 1.3, 0.5, W.bone).taper(5.5, 4.5, 4.8, 2, 0.6, 0.3, W.bone);
  s.taper(19, 6.5, 23, 3.5, 1.3, 0.5, W.bone).taper(23, 3.5, 23.4, 1, 0.6, 0.3, W.bone);
  s.ellipse(14.5, 10.5, 7.5, 5.8, W.bone);
  s.ellipse(15, 15.2, 4.6, 3.6, W.bone, -0.05);
  s.spot(11.5, 11, 1.9, 2, '#5b4e3f').spot(18, 11, 1.8, 1.9, '#5b4e3f');
  s.spot(11.2, 10.6, 1.2, 1.3, '#3f352b').spot(17.7, 10.6, 1.1, 1.2, '#3f352b');
  s.spot(13.8, 16, 0.5, 0.6, '#5b4e3f').spot(16, 16, 0.5, 0.6, '#5b4e3f');
  s.line(14.5, 5, 15.5, 7.6, 0.2, W.bone[2]);
  s.spot(11.5, 7, 1.6, 0.7, W.bone[0]);
  // Sand piled over its lower half.
  s.heap(15, 20.5, 12, 3.6);
  s.spot(6, 17.6, 1.2, 0.5, W.sandMound[0]).spot(23, 18, 1.5, 0.5, W.sandMound[0]);
  return s;
}

/** Three clay pots, one tipped over, on a striped cloth. */
function pots() {
  const s = new Prop(46, 32);
  s.shadow(23, 29.5, 21, 2.8, 0.28);
  // The cloth, rumpled on the sand, with stripes.
  s.poly([[3, 27], [7, 22.5], [20, 21], [36, 22], [44, 26], [40, 30], [22, 30.5], [6, 30]], W.cloth);
  for (const [y, c] of [[24, C.brick[1]], [26.5, C.indigo[1]], [28.8, C.brick[1]]]) s.line(6 + (28.8 - y) * 0.6, y, 41 - (28.8 - y) * 0.7, y + 0.3, 0.38, c);
  s.line(12, 22.4, 10, 29.6, 0.2, W.cloth[2]).line(30, 22.2, 32, 29.8, 0.2, W.cloth[2]);
  // The tall pot: body, neck, rim and opening, a painted band, small handles.
  s.capsule(5.6, 12, 4.8, 15.5, 0.7, W.clay).capsule(16.4, 12, 17.2, 15.5, 0.7, W.clay);
  s.ellipse(11, 17.5, 6.8, 8, W.clay);
  s.rect(8.2, 7.5, 5.6, 4, W.clay);
  s.ellipse(11, 7.4, 3.6, 1.3, W.clay, 0.2);
  s.spot(11, 7.4, 2.4, 0.7, '#4a2c1c');
  s.line(5, 15.5, 17, 15.5, 0.45, W.cloth[1]).line(5.2, 17, 16.8, 17, 0.25, W.clay[3]);
  // The tipped-over pot lying on its side, its mouth toward us.
  s.ellipse(33.5, 22.5, 6.5, 4.5, W.clayDark, { rot: -0.12 });
  s.ellipse(39.4, 22, 1.8, 3, W.clayDark, 0.2);
  s.spot(39.6, 22, 1.1, 2.1, '#3e2418');
  s.line(29, 19.5, 30, 26, 0.25, W.clayDark[2]);
  // The squat round pot in front.
  s.ellipse(22, 24.5, 6, 5, W.clay, 0.05);
  s.ellipse(22, 19.8, 3, 1, W.clay, 0.25);
  s.spot(22, 19.8, 1.9, 0.5, '#4a2c1c');
  s.line(16.6, 24, 27.4, 24, 0.3, W.clay[3]);
  return s;
}

export const ART = {
  ground_meadow: meadow,
  ground_graveyard: pines,
  ground_castle: desert,
  tree,
  bush,
  rock,
  flowers,
  fence,
  signpost,
  pine,
  stone_lantern: stoneLantern,
  paper_lantern: paperLantern,
  wayside_shrine: waysideShrine,
  stump,
  fern_rock: fernRock,
  palm,
  cactus,
  pillar_broken: pillarBroken,
  lion_statue: lionStatue,
  skull,
  pots,
};
