/**
 * A tiny pixel-art painter for classic-RPG-style sprites, drawn from simple shapes.
 *
 * Every shape is filled with a 4-tone ramp (highlight, base, shade, outline) and shaded as if it were round
 * (an ellipse is a ball, a capsule or a polygon is a cylinder) with light from the upper left. Afterwards each
 * shape gets a 1-pixel outline in its own darkest tone wherever it meets empty space or a different material
 * behind it, which is what gives old game sprites their look. Detail pixels (eyes, buckles) are painted last.
 */
import sharp from 'sharp';

const LIGHT = (() => {
  const v = [-0.55, -0.62, 0.56];
  const l = Math.hypot(...v);
  return v.map((x) => x / l);
})();

/** 2 x 2 ordered dither, so the tone bands meet in a soft checker the way hand-pixelled sprites do. */
const BAYER = [
  [0, 0.5],
  [0.75, 0.25],
];

const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16), 255];

export class Sprite {
  constructor(width, height) {
    this.w = width;
    this.h = height;
    /** Per pixel: the shape that owns it (-1 empty), its ramp, its tone, and an optional detail colour on top. */
    this.part = new Int32Array(width * height).fill(-1);
    this.tone = new Uint8Array(width * height);
    this.ramps = [];
    this.detail = new Map();
    this.ox = 0;
    this.oy = 0;
  }

  /** Shift everything drawn from now on (a breathing frame, a bob). */
  offset(x, y) {
    this.ox = x;
    this.oy = y;
    return this;
  }

  addPart(ramp) {
    this.ramps.push(ramp);
    return this.ramps.length - 1;
  }

  /** Brightness of a surface with normal (nx, ny, nz), turned into a tone index (0 highlight ... 2 shade). */
  toneAt(x, y, nx, ny, nz, bias = 0) {
    const b = nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2] + bias;
    const d = BAYER[y & 1][x & 1] * 0.12 - 0.06;
    if (b + d > 0.8) return 0;
    if (b + d > 0.3) return 1;
    return 2;
  }

  set(x, y, part, tone) {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = y * this.w + x;
    this.part[i] = part;
    this.tone[i] = tone;
    this.detail.delete(i);
  }

  /** A ball-shaded ellipse. */
  ellipse(cx, cy, rx, ry, ramp, bias = 0) {
    cx += this.ox;
    cy += this.oy;
    const p = this.addPart(ramp);
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const nx = (x + 0.5 - cx) / rx;
        const ny = (y + 0.5 - cy) / ry;
        const r2 = nx * nx + ny * ny;
        if (r2 > 1) continue;
        this.set(x, y, p, this.toneAt(x, y, nx, ny, Math.sqrt(1 - r2), bias));
      }
    return this;
  }

  /** A cylinder-shaded rod with round ends, from (x1, y1) to (x2, y2). */
  capsule(x1, y1, x2, y2, r, ramp, bias = 0) {
    x1 += this.ox;
    x2 += this.ox;
    y1 += this.oy;
    y2 += this.oy;
    const p = this.addPart(ramp);
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len2 = dx * dx + dy * dy || 1;
    for (let y = Math.floor(Math.min(y1, y2) - r); y <= Math.ceil(Math.max(y1, y2) + r); y++)
      for (let x = Math.floor(Math.min(x1, x2) - r); x <= Math.ceil(Math.max(x1, x2) + r); x++) {
        const px = x + 0.5;
        const py = y + 0.5;
        const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / len2));
        const ex = px - (x1 + t * dx);
        const ey = py - (y1 + t * dy);
        const d = Math.hypot(ex, ey);
        if (d > r) continue;
        const nx = ex / r;
        const ny = ey / r;
        this.set(x, y, p, this.toneAt(x, y, nx, ny, Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny)), bias));
      }
    return this;
  }

  /** A filled polygon, shaded like an upright cylinder across its width. */
  poly(points, ramp, bias = 0) {
    const pts = points.map(([x, y]) => [x + this.ox, y + this.oy]);
    const p = this.addPart(ramp);
    const xs = pts.map((q) => q[0]);
    const ys = pts.map((q) => q[1]);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const cx = (minX + maxX) / 2;
    const hw = (maxX - minX) / 2 || 1;
    for (let y = Math.floor(Math.min(...ys)); y <= Math.ceil(Math.max(...ys)); y++)
      for (let x = Math.floor(minX); x <= Math.ceil(maxX); x++) {
        if (!inside(pts, x + 0.5, y + 0.5)) continue;
        const nx = Math.max(-1, Math.min(1, (x + 0.5 - cx) / hw));
        this.set(x, y, p, this.toneAt(x, y, nx * 0.9, -0.15, Math.sqrt(1 - nx * nx * 0.81), bias));
      }
    return this;
  }

  rect(x, y, w, h, ramp, bias = 0) {
    return this.poly([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], ramp, bias);
  }

  /** Detail pixels painted over everything (eyes, a buckle), never outlined. */
  dot(x, y, colour) {
    x = Math.round(x + this.ox);
    y = Math.round(y + this.oy);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return this;
    this.detail.set(y * this.w + x, hex(colour));
    return this;
  }

  dots(list, colour) {
    for (const [x, y] of list) this.dot(x, y, colour);
    return this;
  }

  /** The finished RGBA pixels: fills, outlines, then details. */
  pixels() {
    const { w, h } = this;
    const out = new Uint8Array(w * h * 4);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        const p = this.part[i];
        if (p < 0) continue;
        const ramp = this.ramps[p];
        let tone = this.tone[i];
        // Outline where this shape meets empty space, or a shape of a different material drawn behind it.
        for (const [ax, ay] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + ax;
          const ny = y + ay;
          const q = nx < 0 || ny < 0 || nx >= w || ny >= h ? -1 : this.part[ny * w + nx];
          if (q < 0 || (q < p && this.ramps[q] !== ramp)) {
            tone = 3;
            break;
          }
        }
        const c = hex(ramp[tone]);
        out.set(this.detail.get(i) ?? c, i * 4);
      }
    for (const [i, c] of this.detail) if (this.part[i] < 0) out.set(c, i * 4);
    return out;
  }

  /** A PNG buffer, scaled up `scale` times with hard pixel edges. */
  async png(scale = 1) {
    const img = sharp(Buffer.from(this.pixels()), { raw: { width: this.w, height: this.h, channels: 4 } });
    return (scale === 1 ? img : img.resize(this.w * scale, this.h * scale, { kernel: 'nearest' })).png().toBuffer();
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
