/**
 * A tiny painter for classic online-RPG-style sprites, drawn from simple shapes.
 *
 * Shapes are given in "sprite pixels" and painted `scale` times larger, supersampled `ss` times and filtered down,
 * so edges come out smooth like the sprites of 2000s online games rather than blocky 8-bit art (scale 1, ss 1
 * still gives hard pixel art). Every shape is filled from a 4-tone ramp (highlight, base, shade, outline) and
 * shaded as if it were round (an ellipse is a ball, a capsule or a polygon is a cylinder) with soft light from the
 * upper left. Each shape gets a thin outline in its own darkest tone where it meets empty space, and a softer one
 * where it lies over a different material.
 */
import sharp from 'sharp';

const LIGHT = (() => {
  const v = [-0.55, -0.62, 0.56];
  const l = Math.hypot(...v);
  return v.map((x) => x / l);
})();

const BAYER = [
  [0, 0.5],
  [0.75, 0.25],
];

const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const smooth = (e0, e1, x) => {
  const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

export class Sprite {
  /** `width` x `height` sprite pixels, painted `scale` times larger and supersampled `ss` times. */
  constructor(width, height, { scale = 3, ss = 3 } = {}) {
    this.w = width;
    this.h = height;
    this.size = scale;
    this.ss = ss;
    this.R = scale * ss;
    this.W = width * this.R;
    this.H = height * this.R;
    /** Per raster pixel: the shape that owns it (-1 empty) and its colour. */
    this.part = new Int32Array(this.W * this.H).fill(-1);
    this.col = new Float32Array(this.W * this.H * 3);
    /** Per shape: its ramp (as RGB), and whether it gets outlines. */
    this.shapes = [];
    this.ox = 0;
    this.oy = 0;
    /** The current transform (x' = a x + c y + e, y' = b x + d y + f), like a canvas: save, translate, rotate, restore. */
    this.m = [1, 0, 0, 1, 0, 0];
    this.stack = [];
    this.clips = [];
  }

  /** Shift everything drawn from now on (a breathing frame, a bob), on top of the transform. */
  offset(x, y) {
    this.ox = x;
    this.oy = y;
    return this;
  }

  save() {
    this.stack.push(this.m.slice());
    return this;
  }

  restore() {
    this.m = this.stack.pop() ?? [1, 0, 0, 1, 0, 0];
    return this;
  }

  translate(x, y) {
    const [a, b, c, d] = this.m;
    this.m[4] += a * x + c * y;
    this.m[5] += b * x + d * y;
    return this;
  }

  /** Turn everything drawn from now on by `t` radians (clockwise on screen) around the current origin. */
  rotate(t) {
    const [a, b, c, d] = this.m;
    const cos = Math.cos(t);
    const sin = Math.sin(t);
    this.m[0] = a * cos + c * sin;
    this.m[1] = b * cos + d * sin;
    this.m[2] = c * cos - a * sin;
    this.m[3] = d * cos - b * sin;
    return this;
  }

  /** Draw everything from now on `k` times larger (radii too; outlines stay one pixel). */
  scale(k) {
    for (let i = 0; i < 4; i++) this.m[i] *= k;
    return this;
  }

  /** How much the transform enlarges lengths. */
  get k() {
    return Math.hypot(this.m[0], this.m[1]);
  }

  /**
   * Only paint inside this rectangle (sprite pixels, as the transform places it now, and inside any clip already
   * set) until the matching `unclip()`.
   */
  clip(x, y, w, h) {
    const [X0, Y0] = this.tf(x, y);
    const [X1, Y1] = this.tf(x + w, y + h);
    const c = [Math.min(X0, X1), Math.min(Y0, Y1), Math.max(X0, X1), Math.max(Y0, Y1)];
    const o = this.clips.at(-1);
    this.clips.push(o ? [Math.max(c[0], o[0]), Math.max(c[1], o[1]), Math.min(c[2], o[2]), Math.min(c[3], o[3])] : c);
    return this;
  }

  unclip() {
    this.clips.pop();
    return this;
  }

  /** Turn by `t` around the point (x, y). */
  pivot(x, y, t) {
    return this.translate(x, y).rotate(t).translate(-x, -y);
  }

  /** A point in sprite pixels to raster pixels, through the transform and the offset. */
  tf(x, y) {
    const [a, b, c, d, e, f] = this.m;
    return [(a * x + c * y + e + this.ox) * this.R, (b * x + d * y + f + this.oy) * this.R];
  }

  /** Where a sprite point ends up (sprite pixels), e.g. to hang a weapon on a hand drawn inside a transform. */
  where(x, y) {
    const [X, Y] = this.tf(x, y);
    return [X / this.R, Y / this.R];
  }

  addShape(ramp, opts) {
    const o = typeof opts === 'number' ? { bias: opts } : opts ?? {};
    this.shapes.push({
      ramp: ramp.map(hex),
      key: ramp,
      bias: o.bias ?? 0,
      outline: o.outline ?? true,
      flat: o.flat ? hex(o.flat) : null,
    });
    return this.shapes.length - 1;
  }

  /** Colour of a surface with normal (nx, ny, nz): soft bands between shade, base and highlight. */
  shade(s, x, y, nx, ny, nz) {
    if (s.flat) return s.flat;
    const b = nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2] + s.bias;
    const [hi, base, sh] = s.ramp;
    if (this.R === 1) {
      const d = BAYER[y & 1][x & 1] * 0.12 - 0.06;
      return b + d > 0.8 ? hi : b + d > 0.3 ? base : sh;
    }
    const lo = mix(sh, base, smooth(0.18, 0.42, b));
    return mix(lo, hi, smooth(0.74, 0.92, b) * 0.85);
  }

  put(X, Y, p, rgb) {
    if (X < 0 || Y < 0 || X >= this.W || Y >= this.H) return;
    const c = this.clips.at(-1);
    if (c && (X < c[0] || Y < c[1] || X >= c[2] || Y >= c[3])) return;
    const i = Y * this.W + X;
    this.part[i] = p;
    this.col.set(rgb, i * 3);
  }

  /** A ball-shaded ellipse (centre and radii in sprite pixels); `opts.rot` tilts it. */
  ellipse(cx, cy, rx, ry, ramp, opts) {
    const { R } = this;
    const p = this.addShape(ramp, opts);
    const s = this.shapes[p];
    [cx, cy] = this.tf(cx, cy);
    rx *= R * this.k;
    ry *= R * this.k;
    const t = Math.atan2(this.m[1], this.m[0]) + ((typeof opts === 'object' && opts?.rot) || 0);
    const cos = Math.cos(t);
    const sin = Math.sin(t);
    const ext = t ? Math.max(rx, ry) : 0;
    const ex = ext || rx;
    const ey = ext || ry;
    for (let Y = Math.floor(cy - ey); Y <= Math.ceil(cy + ey); Y++)
      for (let X = Math.floor(cx - ex); X <= Math.ceil(cx + ex); X++) {
        const dx = X + 0.5 - cx;
        const dy = Y + 0.5 - cy;
        const nx = (dx * cos + dy * sin) / rx;
        const ny = (dy * cos - dx * sin) / ry;
        const r2 = nx * nx + ny * ny;
        if (r2 > 1) continue;
        this.put(X, Y, p, this.shade(s, X, Y, nx * cos - ny * sin, nx * sin + ny * cos, Math.sqrt(1 - r2)));
      }
    return this;
  }

  /** A cylinder-shaded rod with round ends, from (x1, y1) to (x2, y2). */
  capsule(x1, y1, x2, y2, r, ramp, opts) {
    const { R } = this;
    const p = this.addShape(ramp, opts);
    const s = this.shapes[p];
    [x1, y1] = this.tf(x1, y1);
    [x2, y2] = this.tf(x2, y2);
    r *= R * this.k;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len2 = dx * dx + dy * dy || 1;
    for (let Y = Math.floor(Math.min(y1, y2) - r); Y <= Math.ceil(Math.max(y1, y2) + r); Y++)
      for (let X = Math.floor(Math.min(x1, x2) - r); X <= Math.ceil(Math.max(x1, x2) + r); X++) {
        const px = X + 0.5;
        const py = Y + 0.5;
        const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / len2));
        const ex = px - (x1 + t * dx);
        const ey = py - (y1 + t * dy);
        const d = Math.hypot(ex, ey);
        if (d > r) continue;
        const nx = ex / r;
        const ny = ey / r;
        this.put(X, Y, p, this.shade(s, X, Y, nx, ny, Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny))));
      }
    return this;
  }

  /** A rod that narrows from radius r1 at (x1, y1) to r2 at (x2, y2): a lock of hair, a spike, a scarf end. */
  taper(x1, y1, x2, y2, r1, r2, ramp, opts) {
    const { R } = this;
    const p = this.addShape(ramp, opts);
    const s = this.shapes[p];
    [x1, y1] = this.tf(x1, y1);
    [x2, y2] = this.tf(x2, y2);
    r1 *= R * this.k;
    r2 *= R * this.k;
    const rm = Math.max(r1, r2);
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len2 = dx * dx + dy * dy || 1;
    for (let Y = Math.floor(Math.min(y1, y2) - rm); Y <= Math.ceil(Math.max(y1, y2) + rm); Y++)
      for (let X = Math.floor(Math.min(x1, x2) - rm); X <= Math.ceil(Math.max(x1, x2) + rm); X++) {
        const px = X + 0.5;
        const py = Y + 0.5;
        const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / len2));
        const r = r1 + (r2 - r1) * t;
        const ex = px - (x1 + t * dx);
        const ey = py - (y1 + t * dy);
        if (Math.hypot(ex, ey) > r) continue;
        const nx = ex / r;
        const ny = ey / r;
        this.put(X, Y, p, this.shade(s, X, Y, nx, ny, Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny))));
      }
    return this;
  }

  /** A filled polygon, shaded like an upright cylinder across its width. */
  poly(points, ramp, opts) {
    const p = this.addShape(ramp, opts);
    const s = this.shapes[p];
    const pts = points.map(([x, y]) => this.tf(x, y));
    const xs = pts.map((q) => q[0]);
    const ys = pts.map((q) => q[1]);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const cx = (minX + maxX) / 2;
    const hw = (maxX - minX) / 2 || 1;
    for (let Y = Math.floor(minY); Y <= Math.ceil(maxY); Y++)
      for (let X = Math.floor(minX); X <= Math.ceil(maxX); X++) {
        if (!inside(pts, X + 0.5, Y + 0.5)) continue;
        const nx = Math.max(-1, Math.min(1, (X + 0.5 - cx) / hw));
        // A little darker toward the bottom, like cloth hanging in its own shadow.
        const ny = -0.25 + 0.45 * ((Y + 0.5 - minY) / (maxY - minY || 1));
        this.put(X, Y, p, this.shade(s, X, Y, nx * 0.9, ny, Math.sqrt(Math.max(0, 1 - nx * nx * 0.81 - ny * ny))));
      }
    return this;
  }

  rect(x, y, w, h, ramp, opts) {
    return this.poly([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], ramp, opts);
  }

  /** A flat, outline-free detail (an eye, a buckle): an ellipse in one colour. */
  spot(cx, cy, rx, ry, colour) {
    return this.ellipse(cx, cy, rx, ry, [colour, colour, colour, colour], { flat: colour, outline: false });
  }

  /** A flat, outline-free stroke (a brow, a bowstring). */
  line(x1, y1, x2, y2, r, colour) {
    return this.capsule(x1, y1, x2, y2, r, [colour, colour, colour, colour], { flat: colour, outline: false });
  }

  /** Erase everything drawn so far inside a rectangle (sprite pixels), e.g. to flatten the bottom of a blob. */
  clear(x, y, w, h) {
    const { R } = this;
    for (let Y = Math.max(0, Math.floor((y + this.oy) * R)); Y < Math.min(this.H, Math.ceil((y + h + this.oy) * R)); Y++)
      for (let X = Math.max(0, Math.floor((x + this.ox) * R)); X < Math.min(this.W, Math.ceil((x + w + this.ox) * R)); X++)
        this.part[Y * this.W + X] = -1;
    return this;
  }

  /** The raster with outlines, as RGBA at full (supersampled) size. */
  raster() {
    const { W, H, shapes } = this;
    const out = new Float32Array(W * H * 4);
    // Outline width in raster pixels: one display pixel (soft inner lines half as wide).
    const t = Math.max(1, this.ss);
    for (let Y = 0; Y < H; Y++)
      for (let X = 0; X < W; X++) {
        const i = Y * W + X;
        const p = this.part[i];
        if (p < 0) continue;
        const s = shapes[p];
        let rgb = this.col.subarray(i * 3, i * 3 + 3);
        if (s.outline) {
          let edge = 0;
          for (const [ax, ay] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            for (let k = 1; k <= t; k++) {
              const nx = X + ax * k;
              const ny = Y + ay * k;
              const q = nx < 0 || ny < 0 || nx >= W || ny >= H ? -1 : this.part[ny * W + nx];
              if (q < 0) edge = 2;
              else if (q < p && shapes[q].outline && shapes[q].key !== s.key && k <= Math.ceil(t / 2)) edge = Math.max(edge, 1);
            }
            if (edge === 2) break;
          }
          if (edge === 2) rgb = s.ramp[3];
          else if (edge === 1) rgb = mix(s.ramp[2], s.ramp[3], 0.7);
        }
        out[i * 4] = rgb[0];
        out[i * 4 + 1] = rgb[1];
        out[i * 4 + 2] = rgb[2];
        out[i * 4 + 3] = 255;
      }
    return out;
  }

  /** The finished RGBA pixels at `scale` (the supersampled raster filtered down, edges anti-aliased). */
  pixels() {
    const { ss, W, H } = this;
    const hi = this.raster();
    const w = W / ss;
    const h = H / ss;
    const out = new Uint8Array(w * h * 4);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        let r = 0;
        let g = 0;
        let b = 0;
        let a = 0;
        for (let j = 0; j < ss; j++)
          for (let k = 0; k < ss; k++) {
            const i = ((y * ss + j) * W + x * ss + k) * 4;
            const al = hi[i + 3];
            r += hi[i] * al;
            g += hi[i + 1] * al;
            b += hi[i + 2] * al;
            a += al;
          }
        const o = (y * w + x) * 4;
        if (a > 0) out.set([r / a, g / a, b / a, a / (ss * ss)], o);
      }
    return out;
  }

  /** A PNG buffer at `scale`, optionally enlarged `zoom` times more with hard edges. */
  async png(zoom = 1) {
    const w = this.W / this.ss;
    const h = this.H / this.ss;
    const img = sharp(Buffer.from(this.pixels()), { raw: { width: w, height: h, channels: 4 } });
    return (zoom === 1 ? img : img.resize(w * zoom, h * zoom, { kernel: 'nearest' })).png().toBuffer();
  }
}

function inside(pts, x, y) {
  let c = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i];
    const [xj, yj] = pts[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}
