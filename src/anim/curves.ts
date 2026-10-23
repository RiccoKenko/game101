/** Keyframe helpers for writing animation as plain functions of time. */

export type Ease = (t: number) => number;

export const ease = {
  linear: (t: number) => t,
  in: (t: number) => t * t * t,
  out: (t: number) => 1 - (1 - t) ** 3,
  inOut: (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2),
  /** Overshoots then settles: snappy cartoon pops. */
  back: (t: number) => {
    const c = 1.9;
    return 1 + (c + 1) * (t - 1) ** 3 + c * (t - 1) ** 2;
  },
  /** Springy wobble at the end. */
  elastic: (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : 2 ** (-9 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3.2)) + 1),
  hold: () => 0,
};

/** [time, value, easing used to arrive at this key] */
export type Key<T> = [number, T, Ease?];

export function key(t: number, keys: Key<number>[]): number {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [t1, v1, e = ease.inOut] = keys[i];
    if (t <= t1) {
      const [t0, v0] = keys[i - 1];
      const u = t1 === t0 ? 1 : e((t - t0) / (t1 - t0));
      return v0 + (v1 - v0) * u;
    }
  }
  return keys[keys.length - 1][1];
}

/** sin wave with the given period (seconds) and phase (0..1 of a period). */
export const osc = (t: number, period: number, phase = 0) => Math.sin(2 * Math.PI * (t / period + phase));
/** 0..1 bump that peaks once per period (good for steps and bounces). */
export const bounce = (t: number, period: number, phase = 0) => Math.abs(osc(t, period * 2, phase));
