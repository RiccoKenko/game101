/** Keyframe helpers for writing animation clips as plain functions of time. */
import type { Vec3 } from './sdf';

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

export function vkey(t: number, keys: Key<Vec3>[]): Vec3 {
  return [0, 1, 2].map((i) => key(t, keys.map(([kt, v, e]) => [kt, v[i], e] as Key<number>))) as Vec3;
}

/** sin wave with the given period (seconds) and phase (0..1 of a period). */
export const osc = (t: number, period: number, phase = 0) => Math.sin(2 * Math.PI * (t / period + phase));
/** 0..1 bump that peaks once per period (good for steps and bounces). */
export const bounce = (t: number, period: number, phase = 0) => Math.abs(osc(t, period * 2, phase));

/** Reach for a point: solves this bone's two parents (e.g. upper + lower arm) so its head lands on `target`. */
export interface IkGoal {
  /** Target in character space (feet at the origin, facing +Z). */
  target: Vec3;
  /** A point the middle joint (elbow/knee) should bend towards. */
  pole: Vec3;
  /** 0 = ignore (pure keyframes), 1 = fully solved. */
  w?: number;
}

/** Point this bone's +Z along `fwd` and its +Y towards `up`, in character space. */
export interface AimGoal {
  fwd: Vec3;
  up: Vec3;
  w?: number;
}

export interface BonePose {
  /** Euler rotation in degrees, relative to the bind pose. */
  r?: Vec3;
  /** Translation offset from the bind position. */
  p?: Vec3;
  /** Scale (uniform number or per axis). */
  s?: Vec3 | number;
  ik?: IkGoal;
  aim?: AimGoal;
}
export type Pose = Record<string, BonePose>;

/** Adds rotations/offsets and multiplies scales of several poses (layering a breath on top of a stance...). */
export function layer(...poses: Pose[]): Pose {
  const out: Pose = {};
  for (const pose of poses)
    for (const [bone, bp] of Object.entries(pose)) {
      const o = (out[bone] ??= {});
      if (bp.r) o.r = add(o.r, bp.r);
      if (bp.p) o.p = add(o.p, bp.p);
      if (bp.s !== undefined) {
        const s = typeof bp.s === 'number' ? ([bp.s, bp.s, bp.s] as Vec3) : bp.s;
        const prev = o.s === undefined ? ([1, 1, 1] as Vec3) : typeof o.s === 'number' ? ([o.s, o.s, o.s] as Vec3) : o.s;
        o.s = [prev[0] * s[0], prev[1] * s[1], prev[2] * s[2]];
      }
      if (bp.ik) o.ik = bp.ik;
      if (bp.aim) o.aim = bp.aim;
    }
  return out;
}

/** Fills in bones/channels the pose doesn't set (e.g. hidden props, neutral face). */
export function defaults(base: Pose, pose: Pose): Pose {
  const out: Pose = { ...pose };
  for (const [bone, bp] of Object.entries(base)) out[bone] = { ...bp, ...(pose[bone] ?? {}) };
  return out;
}

/** Linear blend between two poses (missing values count as rest). */
export function blend(a: Pose, b: Pose, t: number): Pose {
  const out: Pose = {};
  for (const bone of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const pa = a[bone] ?? {};
    const pb = b[bone] ?? {};
    const sa = toVec(pa.s, 1);
    const sb = toVec(pb.s, 1);
    out[bone] = {
      r: lerp3(pa.r ?? [0, 0, 0], pb.r ?? [0, 0, 0], t),
      p: lerp3(pa.p ?? [0, 0, 0], pb.p ?? [0, 0, 0], t),
      s: lerp3(sa, sb, t),
    };
    // Goals fade in/out by weight; when both sides have one, their points glide between them.
    if (pa.ik || pb.ik) {
      const ga = pa.ik ?? { ...pb.ik!, w: 0 };
      const gb = pb.ik ?? { ...pa.ik!, w: 0 };
      out[bone].ik = { target: lerp3(ga.target, gb.target, t), pole: lerp3(ga.pole, gb.pole, t), w: (ga.w ?? 1) + ((gb.w ?? 1) - (ga.w ?? 1)) * t };
    }
    if (pa.aim || pb.aim) {
      const ga = pa.aim ?? { ...pb.aim!, w: 0 };
      const gb = pb.aim ?? { ...pa.aim!, w: 0 };
      out[bone].aim = { fwd: lerp3(ga.fwd, gb.fwd, t), up: lerp3(ga.up, gb.up, t), w: (ga.w ?? 1) + ((gb.w ?? 1) - (ga.w ?? 1)) * t };
    }
  }
  return out;
}

/** Keyframed sequence of whole poses. */
export function poseKeys(t: number, keys: Key<Pose>[]): Pose {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [t1, p1, e = ease.inOut] = keys[i];
    if (t <= t1) {
      const [t0, p0] = keys[i - 1];
      return blend(p0, p1, t1 === t0 ? 1 : e((t - t0) / (t1 - t0)));
    }
  }
  return keys[keys.length - 1][1];
}

const add = (a: Vec3 | undefined, b: Vec3): Vec3 => (a ? [a[0] + b[0], a[1] + b[1], a[2] + b[2]] : [...b]);
const lerp3 = (a: Vec3, b: Vec3, t: number): Vec3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const toVec = (s: Vec3 | number | undefined, d: number): Vec3 => (s === undefined ? [d, d, d] : typeof s === 'number' ? [s, s, s] : s);

export interface ClipDef {
  name: string;
  duration: number;
  loop: boolean;
  pose: (t: number) => Pose;
}
