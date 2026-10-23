/** Which pirate a tower (or the hero) shoots at. */
import type { Pt } from './path';

export type TargetMode = 'first' | 'nearest' | 'carrier';

export interface Targetable {
  id: number;
  pos: Pt;
  /** How close it is to winning: grows on the way to the vault and keeps growing on the way back to the dock. */
  progress: number;
  carrying: boolean;
  flying: boolean;
}

const dist = (a: Pt, b: Pt) => Math.hypot(a[0] - b[0], a[1] - b[1]);

/**
 * The target in range for a shooter at `from`.
 * - first: the one furthest along (carriers heading home count as furthest).
 * - nearest: the closest one.
 * - carrier: crystal carriers first, then the one furthest along.
 */
export function pickTarget<T extends Targetable>(from: Pt, range: number, list: readonly T[], mode: TargetMode = 'first', hitsFlying = true): T | null {
  let best: T | null = null;
  let bestScore = -Infinity;
  for (const t of list) {
    if (t.flying && !hitsFlying) continue;
    const d = dist(from, t.pos);
    if (d > range) continue;
    const score = mode === 'nearest' ? -d : mode === 'carrier' ? (t.carrying ? 1e6 : 0) + t.progress : t.progress;
    if (score > bestScore) {
      bestScore = score;
      best = t;
    }
  }
  return best;
}

/** Where to aim so a shot at `speed` meets a target at `pos` moving with `vel` (its position now if it cannot). */
export function intercept(from: Pt, pos: Pt, vel: Pt, speed: number): Pt {
  const rx = pos[0] - from[0];
  const ry = pos[1] - from[1];
  // |r + v t| = speed t  →  (v·v − s²) t² + 2 (r·v) t + r·r = 0
  const a = vel[0] * vel[0] + vel[1] * vel[1] - speed * speed;
  const b = 2 * (rx * vel[0] + ry * vel[1]);
  const c = rx * rx + ry * ry;
  let t: number;
  if (Math.abs(a) < 1e-9) t = b < 0 ? -c / b : -1;
  else {
    const disc = b * b - 4 * a * c;
    if (disc < 0) return pos;
    const s = Math.sqrt(disc);
    const roots = [(-b - s) / (2 * a), (-b + s) / (2 * a)].filter((x) => x > 0);
    t = roots.length ? Math.min(...roots) : -1;
  }
  return t > 0 ? [pos[0] + vel[0] * t, pos[1] + vel[1] * t] : pos;
}
