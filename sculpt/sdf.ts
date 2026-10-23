/**
 * Signed distance "clay": primitives that can be smoothly melted together, carved and painted.
 * Distances are negative inside. Everything is plain numbers so meshing millions of samples stays fast.
 */
import * as THREE from 'three';

export type Vec3 = [number, number, number];
export type Rgb = [number, number, number];
/** Surface finish, mapped to a glTF material at export. */
export type Finish = 'soft' | 'cloth' | 'gloss' | 'metal' | 'glow';

/** A colour, or a painter that picks a colour from the point (in the shape's local frame and in world space). */
export type Paint = Rgb | ((local: Vec3, world: Vec3) => Rgb);

export interface Shade {
  color: Rgb;
  finish: Finish;
}

export interface Bounds {
  min: Vec3;
  max: Vec3;
}

/** "#rrggbb" -> linear-ish 0..1 rgb (we keep sRGB values; the exporter marks vertex colours as sRGB-converted). */
export function hex(c: string): Rgb {
  const n = parseInt(c.replace('#', ''), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

export const mixRgb = (a: Rgb, b: Rgb, t: number): Rgb => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
export const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
export const smoothstep = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

export abstract class Shape {
  paint: Paint = [0.8, 0.8, 0.8];
  finish: Finish = 'soft';
  private explicitPaint = false;
  private explicitFinish = false;
  /** World -> local, as a 3x4 row-major matrix. */
  protected inv = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0];
  protected matrix = new THREE.Matrix4();

  abstract dist(x: number, y: number, z: number): number;
  abstract bounds(): Bounds;

  /** Colour and finish of the surface nearest to (x, y, z). */
  shade(x: number, y: number, z: number): Shade {
    const p = this.toLocal(x, y, z);
    const color = typeof this.paint === 'function' ? this.paint(p, [x, y, z]) : this.paint;
    return { color, finish: this.finish };
  }

  /** Paints this shape and every child that has no colour of its own. */
  color(paint: Paint): this {
    this.paint = paint;
    this.explicitPaint = true;
    for (const c of this.kids()) c.inheritPaint(paint);
    return this;
  }

  as(finish: Finish): this {
    this.finish = finish;
    this.explicitFinish = true;
    for (const c of this.kids()) c.inheritFinish(finish);
    return this;
  }

  /** Child shapes of a combination (empty for primitives). */
  protected kids(): Shape[] {
    return [];
  }

  private inheritPaint(paint: Paint): void {
    if (this.explicitPaint) return;
    this.paint = paint;
    for (const c of this.kids()) c.inheritPaint(paint);
  }

  private inheritFinish(finish: Finish): void {
    if (this.explicitFinish) return;
    this.finish = finish;
    for (const c of this.kids()) c.inheritFinish(finish);
  }

  protected toLocal(x: number, y: number, z: number): Vec3 {
    const m = this.inv;
    return [m[0] * x + m[1] * y + m[2] * z + m[3], m[4] * x + m[5] * y + m[6] * z + m[7], m[8] * x + m[9] * y + m[10] * z + m[11]];
  }

  /** Places the shape: translation, then Euler rotation in degrees (XYZ). Rotations compose with earlier calls. */
  place(pos: Vec3, rotDeg: Vec3 = [0, 0, 0]): this {
    const m = new THREE.Matrix4().compose(
      new THREE.Vector3(...pos),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(...(rotDeg.map(THREE.MathUtils.degToRad) as Vec3), 'XYZ')),
      new THREE.Vector3(1, 1, 1),
    );
    this.matrix.premultiply(m);
    this.updateInverse();
    return this;
  }

  /** Mirror copy across x = 0 (for symmetric limbs, eyes...). */
  mirrored(): Shape {
    return new Mirror(this);
  }

  protected updateInverse(): void {
    const e = this.matrix.clone().invert().elements; // column-major
    this.inv = [e[0], e[4], e[8], e[12], e[1], e[5], e[9], e[13], e[2], e[6], e[10], e[14]];
  }

  protected worldBounds(local: Bounds): Bounds {
    const box = new THREE.Box3(new THREE.Vector3(...local.min), new THREE.Vector3(...local.max)).applyMatrix4(this.matrix);
    return { min: box.min.toArray() as Vec3, max: box.max.toArray() as Vec3 };
  }
}

// ---------- primitives (Inigo Quilez's formulas)

export class Sphere extends Shape {
  constructor(private r: number) {
    super();
  }
  dist(x: number, y: number, z: number): number {
    const [px, py, pz] = this.toLocal(x, y, z);
    return Math.hypot(px, py, pz) - this.r;
  }
  bounds(): Bounds {
    const r = this.r;
    return this.worldBounds({ min: [-r, -r, -r], max: [r, r, r] });
  }
}

export class Ellipsoid extends Shape {
  constructor(private rx: number, private ry: number, private rz: number) {
    super();
  }
  dist(x: number, y: number, z: number): number {
    const [px, py, pz] = this.toLocal(x, y, z);
    const k0 = Math.hypot(px / this.rx, py / this.ry, pz / this.rz);
    const k1 = Math.hypot(px / (this.rx * this.rx), py / (this.ry * this.ry), pz / (this.rz * this.rz));
    return k1 === 0 ? -Math.min(this.rx, this.ry, this.rz) : (k0 * (k0 - 1)) / k1;
  }
  bounds(): Bounds {
    return this.worldBounds({ min: [-this.rx, -this.ry, -this.rz], max: [this.rx, this.ry, this.rz] });
  }
}

/** Cone with rounded ends between a (radius ra) and b (radius rb), in the shape's local frame. */
export class RoundCone extends Shape {
  private ab: Vec3;
  private l2: number;
  private rr: number;
  private a2: number;
  private il2: number;
  constructor(private a: Vec3, private b: Vec3, private ra: number, private rb: number) {
    super();
    this.ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    this.l2 = this.ab[0] ** 2 + this.ab[1] ** 2 + this.ab[2] ** 2;
    this.rr = ra - rb;
    this.a2 = this.l2 - this.rr * this.rr;
    this.il2 = 1 / this.l2;
  }
  dist(x: number, y: number, z: number): number {
    const p = this.toLocal(x, y, z);
    const { a, ab, l2, rr, a2, il2, ra, rb } = this;
    const pa: Vec3 = [p[0] - a[0], p[1] - a[1], p[2] - a[2]];
    const yv = pa[0] * ab[0] + pa[1] * ab[1] + pa[2] * ab[2];
    const zv = yv - l2;
    const xx = [pa[0] * l2 - ab[0] * yv, pa[1] * l2 - ab[1] * yv, pa[2] * l2 - ab[2] * yv];
    const x2 = xx[0] ** 2 + xx[1] ** 2 + xx[2] ** 2;
    const y2 = yv * yv * l2;
    const z2 = zv * zv * l2;
    const k = Math.sign(rr) * rr * rr * x2;
    if (Math.sign(zv) * a2 * z2 > k) return Math.sqrt(x2 + z2) * il2 - rb;
    if (Math.sign(yv) * a2 * y2 < k) return Math.sqrt(x2 + y2) * il2 - ra;
    return (Math.sqrt(x2 * a2 * il2) + yv * rr) * il2 - ra;
  }
  bounds(): Bounds {
    const r = Math.max(this.ra, this.rb);
    return this.worldBounds({
      min: [Math.min(this.a[0], this.b[0]) - r, Math.min(this.a[1], this.b[1]) - r, Math.min(this.a[2], this.b[2]) - r],
      max: [Math.max(this.a[0], this.b[0]) + r, Math.max(this.a[1], this.b[1]) + r, Math.max(this.a[2], this.b[2]) + r],
    });
  }
}

export const capsule = (a: Vec3, b: Vec3, r: number) => new RoundCone(a, b, r, r);

export class RoundBox extends Shape {
  constructor(private hx: number, private hy: number, private hz: number, private r: number) {
    super();
  }
  dist(x: number, y: number, z: number): number {
    const [px, py, pz] = this.toLocal(x, y, z);
    const qx = Math.abs(px) - this.hx + this.r;
    const qy = Math.abs(py) - this.hy + this.r;
    const qz = Math.abs(pz) - this.hz + this.r;
    return Math.hypot(Math.max(qx, 0), Math.max(qy, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qy, qz), 0) - this.r;
  }
  bounds(): Bounds {
    return this.worldBounds({ min: [-this.hx, -this.hy, -this.hz], max: [this.hx, this.hy, this.hz] });
  }
}

/** Torus lying in the local XZ plane. `arc` (degrees) keeps only the part within ±arc/2 of +X. */
export class Torus extends Shape {
  constructor(private R: number, private r: number, private arc = 360) {
    super();
  }
  dist(x: number, y: number, z: number): number {
    const [px, py, pz] = this.toLocal(x, y, z);
    if (this.arc >= 360) return Math.hypot(Math.hypot(px, pz) - this.R, py) - this.r;
    const half = THREE.MathUtils.degToRad(this.arc / 2);
    const ang = Math.atan2(pz, px);
    if (Math.abs(ang) <= half) return Math.hypot(Math.hypot(px, pz) - this.R, py) - this.r;
    // Outside the arc: distance to the nearest end cap (a sphere at the arc end).
    const end = ang > 0 ? half : -half;
    const ex = Math.cos(end) * this.R;
    const ez = Math.sin(end) * this.R;
    return Math.hypot(px - ex, py, pz - ez) - this.r;
  }
  bounds(): Bounds {
    const o = this.R + this.r;
    return this.worldBounds({ min: [-o, -this.r, -o], max: [o, this.r, o] });
  }
}

/** Rounded cylinder along local Y: radius ra, half height h, edge rounding rb. */
export class Cylinder extends Shape {
  constructor(private ra: number, private h: number, private rb = 0.002) {
    super();
  }
  dist(x: number, y: number, z: number): number {
    const [px, py, pz] = this.toLocal(x, y, z);
    const dx = Math.hypot(px, pz) - this.ra + this.rb;
    const dy = Math.abs(py) - this.h + this.rb;
    return Math.min(Math.max(dx, dy), 0) + Math.hypot(Math.max(dx, 0), Math.max(dy, 0)) - this.rb;
  }
  bounds(): Bounds {
    return this.worldBounds({ min: [-this.ra, -this.h, -this.ra], max: [this.ra, this.h, this.ra] });
  }
}

/** Hollow version of a shape: a shell of the given thickness around its surface. */
export class Shell extends Shape {
  constructor(private inner: Shape, private thickness: number) {
    super();
  }
  protected kids(): Shape[] {
    return [this.inner];
  }
  dist(x: number, y: number, z: number): number {
    const [lx, ly, lz] = this.toLocal(x, y, z);
    return Math.abs(this.inner.dist(lx, ly, lz)) - this.thickness / 2;
  }
  shade(x: number, y: number, z: number): Shade {
    const [lx, ly, lz] = this.toLocal(x, y, z);
    return this.inner.shade(lx, ly, lz);
  }
  bounds(): Bounds {
    return this.worldBounds(this.inner.bounds());
  }
}

class Mirror extends Shape {
  constructor(private inner: Shape) {
    super();
    this.paint = inner.paint;
    this.finish = inner.finish;
  }
  protected kids(): Shape[] {
    return [this.inner];
  }
  dist(x: number, y: number, z: number): number {
    const [lx, ly, lz] = this.toLocal(x, y, z);
    return this.inner.dist(-lx, ly, lz);
  }
  shade(x: number, y: number, z: number): Shade {
    const [lx, ly, lz] = this.toLocal(x, y, z);
    return this.inner.shade(-lx, ly, lz);
  }
  bounds(): Bounds {
    const b = this.inner.bounds();
    return this.worldBounds({ min: [-b.max[0], b.min[1], b.min[2]], max: [-b.min[0], b.max[1], b.max[2]] });
  }
}

// ---------- combinations (each has its own placement; children are positioned relative to it)

/**
 * Smooth union: `k` is how far shapes melt into each other; `colorBlend` how wide their colours fade
 * (0 = crisp seam, the default, like stitched cloth).
 */
export class Union extends Shape {
  constructor(private parts: Shape[], private k = 0, private colorBlend = 0) {
    super();
  }
  protected kids(): Shape[] {
    return this.parts;
  }
  dist(x: number, y: number, z: number): number {
    const [lx, ly, lz] = this.toLocal(x, y, z);
    let d = this.parts[0].dist(lx, ly, lz);
    for (let i = 1; i < this.parts.length; i++) d = smin(d, this.parts[i].dist(lx, ly, lz), this.k);
    return d;
  }
  shade(x: number, y: number, z: number): Shade {
    const [lx, ly, lz] = this.toLocal(x, y, z);
    // The nearest part wins; within `colorBlend` of a seam the colours mix.
    let best = 0;
    let bestD = Infinity;
    const ds = this.parts.map((p, i) => {
      const d = p.dist(lx, ly, lz);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
      return d;
    });
    const top = this.parts[best].shade(lx, ly, lz);
    if (this.colorBlend <= 0) return top;
    let second = -1;
    let secondD = Infinity;
    ds.forEach((d, i) => {
      if (i !== best && d < secondD) {
        secondD = d;
        second = i;
      }
    });
    if (second < 0 || secondD - bestD > this.colorBlend) return top;
    const t = 0.5 * (1 - (secondD - bestD) / this.colorBlend);
    return { color: mixRgb(top.color, this.parts[second].shade(lx, ly, lz).color, t), finish: top.finish };
  }
  bounds(): Bounds {
    return this.worldBounds(unionBounds(this.parts.map((p) => p.bounds()), this.k));
  }
}

/** Carves `cut` out of `base`. With `paintWalls`, the carved walls take the cutter's colour. */
export class Subtract extends Shape {
  constructor(private base: Shape, private cut: Shape, private k = 0, private paintWalls = false) {
    super();
  }
  protected kids(): Shape[] {
    return [this.base];
  }
  dist(x: number, y: number, z: number): number {
    const [lx, ly, lz] = this.toLocal(x, y, z);
    return smax(this.base.dist(lx, ly, lz), -this.cut.dist(lx, ly, lz), this.k);
  }
  shade(x: number, y: number, z: number): Shade {
    const [lx, ly, lz] = this.toLocal(x, y, z);
    if (this.paintWalls && -this.cut.dist(lx, ly, lz) > this.base.dist(lx, ly, lz) - 0.002) return this.cut.shade(lx, ly, lz);
    return this.base.shade(lx, ly, lz);
  }
  bounds(): Bounds {
    return this.worldBounds(this.base.bounds());
  }
}

export class Intersect extends Shape {
  constructor(private a: Shape, private b: Shape, private k = 0) {
    super();
  }
  protected kids(): Shape[] {
    return [this.a];
  }
  dist(x: number, y: number, z: number): number {
    const [lx, ly, lz] = this.toLocal(x, y, z);
    return smax(this.a.dist(lx, ly, lz), this.b.dist(lx, ly, lz), this.k);
  }
  shade(x: number, y: number, z: number): Shade {
    const [lx, ly, lz] = this.toLocal(x, y, z);
    return this.a.shade(lx, ly, lz);
  }
  bounds(): Bounds {
    return this.worldBounds(this.a.bounds());
  }
}

/**
 * Repaints a shape without changing its form (stripes, gradients, blush...).
 * The painter gets the point in this shape's own frame (= world space unless the Painted is placed).
 */
export class Painted extends Shape {
  constructor(private inner: Shape, private painter: (p: Vec3, base: Rgb) => Rgb) {
    super();
  }
  protected kids(): Shape[] {
    return [this.inner];
  }
  dist(x: number, y: number, z: number): number {
    const [lx, ly, lz] = this.toLocal(x, y, z);
    return this.inner.dist(lx, ly, lz);
  }
  shade(x: number, y: number, z: number): Shade {
    const p = this.toLocal(x, y, z);
    const s = this.inner.shade(p[0], p[1], p[2]);
    return { color: this.painter(p, s.color), finish: s.finish };
  }
  bounds(): Bounds {
    return this.worldBounds(this.inner.bounds());
  }
}

export function smin(a: number, b: number, k: number): number {
  if (k <= 0) return Math.min(a, b);
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
}

export function smax(a: number, b: number, k: number): number {
  return -smin(-a, -b, k);
}

function unionBounds(list: Bounds[], pad: number): Bounds {
  const min: Vec3 = [Infinity, Infinity, Infinity];
  const max: Vec3 = [-Infinity, -Infinity, -Infinity];
  for (const b of list)
    for (let i = 0; i < 3; i++) {
      min[i] = Math.min(min[i], b.min[i] - pad);
      max[i] = Math.max(max[i], b.max[i] + pad);
    }
  return { min, max };
}

// ---------- small constructors so character files read like a recipe

export const sphere = (r: number) => new Sphere(r);
export const ellipsoid = (rx: number, ry: number, rz: number) => new Ellipsoid(rx, ry, rz);
export const roundCone = (a: Vec3, b: Vec3, ra: number, rb: number) => new RoundCone(a, b, ra, rb);
export const roundBox = (hx: number, hy: number, hz: number, r: number) => new RoundBox(hx, hy, hz, r);
export const torus = (R: number, r: number, arc = 360) => new Torus(R, r, arc);
export const cylinder = (ra: number, h: number, rb = 0.002) => new Cylinder(ra, h, rb);
export const union = (parts: Shape[], k = 0, colorBlend = 0) => new Union(parts, k, colorBlend);
export const subtract = (base: Shape, cut: Shape, k = 0, paintWalls = false) => new Subtract(base, cut, k, paintWalls);
export const intersect = (a: Shape, b: Shape, k = 0) => new Intersect(a, b, k);
export const shell = (inner: Shape, thickness: number) => new Shell(inner, thickness);
export const painted = (inner: Shape, painter: (world: Vec3, base: Rgb) => Rgb) => new Painted(inner, painter);

// ---------- organic detail

/** Smooth 3D value noise in [-1, 1]. */
export function noise3(x: number, y: number, z: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const zi = Math.floor(z);
  const xf = x - xi;
  const yf = y - yi;
  const zf = z - zi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const w = zf * zf * (3 - 2 * zf);
  const h = (i: number, j: number, k: number) => {
    let n = (i * 374761393 + j * 668265263 + k * 2147483647) | 0;
    n = (n ^ (n >>> 13)) * 1274126177;
    return (((n ^ (n >>> 16)) >>> 0) / 4294967295) * 2 - 1;
  };
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  return lerp(
    lerp(lerp(h(xi, yi, zi), h(xi + 1, yi, zi), u), lerp(h(xi, yi + 1, zi), h(xi + 1, yi + 1, zi), u), v),
    lerp(lerp(h(xi, yi, zi + 1), h(xi + 1, yi, zi + 1), u), lerp(h(xi, yi + 1, zi + 1), h(xi + 1, yi + 1, zi + 1), u), v),
    w,
  );
}

/** Fractal noise: a few octaves of noise3. */
export function fbm(x: number, y: number, z: number, octaves = 3): number {
  let a = 0.5;
  let f = 1;
  let s = 0;
  for (let i = 0; i < octaves; i++) {
    s += a * noise3(x * f, y * f, z * f);
    a *= 0.5;
    f *= 2.03;
  }
  return s;
}

/** Bumpy surface: pushes the shape in and out by noise (rocks, bark, lumpy earth). */
export class Displaced extends Shape {
  constructor(private inner: Shape, private amp: number, private freq: number) {
    super();
  }
  protected kids(): Shape[] {
    return [this.inner];
  }
  dist(x: number, y: number, z: number): number {
    const [lx, ly, lz] = this.toLocal(x, y, z);
    return this.inner.dist(lx, ly, lz) + this.amp * fbm(lx * this.freq, ly * this.freq, lz * this.freq);
  }
  shade(x: number, y: number, z: number): Shade {
    const [lx, ly, lz] = this.toLocal(x, y, z);
    return this.inner.shade(lx, ly, lz);
  }
  bounds(): Bounds {
    const b = this.inner.bounds();
    const a = this.amp;
    return this.worldBounds({ min: [b.min[0] - a, b.min[1] - a, b.min[2] - a], max: [b.max[0] + a, b.max[1] + a, b.max[2] + a] });
  }
}

export const displaced = (inner: Shape, amp: number, freq: number) => new Displaced(inner, amp, freq);
