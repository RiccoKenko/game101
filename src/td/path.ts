/** The road pirates walk: a smooth curve through control points, measured by distance along it. */

export type Pt = [number, number];

/** Catmull-Rom curve through `points`, as `perSegment` straight steps between each pair. */
export function catmullRom(points: Pt[], perSegment = 16): Pt[] {
  const out: Pt[] = [];
  const p = (i: number) => points[Math.max(0, Math.min(points.length - 1, i))];
  for (let i = 0; i < points.length - 1; i++)
    for (let s = 0; s < perSegment; s++) {
      const t = s / perSegment;
      const [p0, p1, p2, p3] = [p(i - 1), p(i), p(i + 1), p(i + 2)];
      const f = (k: 0 | 1) =>
        0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t * t + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t * t * t);
      out.push([f(0), f(1)]);
    }
  out.push(points[points.length - 1]);
  return out;
}

/** A smooth closed outline through the points (Catmull-Rom, wrapped). */
export function closedCurve(p: Pt[], perSegment = 10): Pt[] {
  return new Path([...p.slice(-2), ...p, ...p.slice(0, 3)], perSegment).points.slice(2 * perSegment, (p.length + 2) * perSegment + 1);
}

/** Whether `p` lies inside the polygon (even-odd rule). */
export function insidePolygon(poly: Pt[], [x, y]: Pt): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export class Path {
  /** The curve as short straight steps. */
  readonly points: Pt[];
  /** Distance along the path at each point. */
  readonly along: number[];
  readonly length: number;

  constructor(control: Pt[], perSegment = 16) {
    this.points = catmullRom(control, perSegment);
    this.along = [0];
    for (let i = 1; i < this.points.length; i++) {
      const [a, b] = [this.points[i - 1], this.points[i]];
      this.along.push(this.along[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1]));
    }
    this.length = this.along[this.along.length - 1];
  }

  private segment(d: number): [number, number] {
    const clamped = Math.max(0, Math.min(this.length, d));
    let lo = 0;
    let hi = this.along.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (this.along[mid] <= clamped) lo = mid;
      else hi = mid;
    }
    const span = this.along[hi] - this.along[lo] || 1;
    return [lo, (clamped - this.along[lo]) / span];
  }

  /** Position `d` along the path (clamped to its ends). */
  at(d: number): Pt {
    const [i, t] = this.segment(d);
    const [a, b] = [this.points[i], this.points[i + 1] ?? this.points[i]];
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  }

  /** Unit direction of travel at `d`. */
  dirAt(d: number): Pt {
    const [i] = this.segment(d);
    const [a, b] = [this.points[i], this.points[Math.min(i + 1, this.points.length - 1)]];
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    return [(b[0] - a[0]) / l, (b[1] - a[1]) / l];
  }

  /** How far a point is from the path, and the distance along the path of its nearest spot. */
  nearest(p: Pt): { d: number; dist: number } {
    let best = { d: 0, dist: Infinity };
    for (let i = 0; i < this.points.length - 1; i++) {
      const [a, b] = [this.points[i], this.points[i + 1]];
      const vx = b[0] - a[0];
      const vy = b[1] - a[1];
      const l2 = vx * vx + vy * vy || 1;
      const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * vx + (p[1] - a[1]) * vy) / l2));
      const dist = Math.hypot(p[0] - (a[0] + vx * t), p[1] - (a[1] + vy * t));
      if (dist < best.dist) best = { d: this.along[i] + Math.sqrt(l2) * t, dist };
    }
    return best;
  }
}
