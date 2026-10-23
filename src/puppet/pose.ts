/** Poses and clips for 2D puppets: plain data that clips build as functions of time. */
import { ease, type Key } from '../anim/curves';
import type { Vec2 } from './rig';

export interface BonePose {
  /** Rotation in degrees, counter-clockwise, relative to rest. */
  r?: number;
  /** Offset from rest in rig pixels (y-up). */
  x?: number;
  y?: number;
  /** Squash and stretch. */
  sx?: number;
  sy?: number;
  /** Goal: this bone's world angle in degrees (character space), e.g. keep the bow upright. */
  wr?: number;
  /** Weight of `wr` (default 1). */
  ww?: number;
}

/** Put the end bone's joint (a hand) on a point: solves its parent and grandparent (forearm, upper arm). */
export interface IkGoal {
  /** Character space, y-up, origin at the feet. */
  target: Vec2;
  /** +1 or -1: which side the elbow bends to. */
  bend?: number;
  w?: number;
}

export interface Pose2D {
  bones?: Record<string, BonePose>;
  /** Keyed by the end bone (e.g. "hand.r"). */
  ik?: Record<string, IkGoal>;
  /** Slot → part to show (eyes, mouth, hands). */
  slots?: Record<string, string>;
  /** How far the bowstring is pulled towards the string hand, 0..1. */
  draw?: number;
  /** Nocked arrow visibility, 0..1. */
  arrow?: number;
  /** Draw-order overrides by part name. */
  z?: Record<string, number>;
}

export interface Clip2D {
  name: string;
  duration: number;
  loop: boolean;
  pose: (t: number) => Pose2D;
  /** Moments clips announce, e.g. [0.42, "release"] for the arrow leaving the string. */
  events?: [number, string][];
}

/** Adds rotations/offsets and multiplies scales of several poses (a breath on top of a stance...). */
export function layer(...poses: Pose2D[]): Pose2D {
  const out: Pose2D = {};
  for (const pose of poses) {
    if (pose.bones) {
      out.bones ??= {};
      for (const [name, bp] of Object.entries(pose.bones)) {
        const o = (out.bones[name] ??= {});
        if (bp.r !== undefined) o.r = (o.r ?? 0) + bp.r;
        if (bp.x !== undefined) o.x = (o.x ?? 0) + bp.x;
        if (bp.y !== undefined) o.y = (o.y ?? 0) + bp.y;
        if (bp.sx !== undefined) o.sx = (o.sx ?? 1) * bp.sx;
        if (bp.sy !== undefined) o.sy = (o.sy ?? 1) * bp.sy;
        if (bp.wr !== undefined) {
          o.wr = bp.wr;
          o.ww = bp.ww;
        }
      }
    }
    if (pose.ik) out.ik = { ...out.ik, ...pose.ik };
    if (pose.slots) out.slots = { ...out.slots, ...pose.slots };
    if (pose.z) out.z = { ...out.z, ...pose.z };
    if (pose.draw !== undefined) out.draw = pose.draw;
    if (pose.arrow !== undefined) out.arrow = pose.arrow;
  }
  return out;
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Blend from pose a to pose b. Numbers glide; slots and draw order switch halfway. */
export function blend(a: Pose2D, b: Pose2D, t: number): Pose2D {
  const out: Pose2D = { bones: {} };
  const ab = a.bones ?? {};
  const bb = b.bones ?? {};
  for (const name of new Set([...Object.keys(ab), ...Object.keys(bb)])) {
    const pa = ab[name] ?? {};
    const pb = bb[name] ?? {};
    const o: BonePose = {
      r: lerp(pa.r ?? 0, pb.r ?? 0, t),
      x: lerp(pa.x ?? 0, pb.x ?? 0, t),
      y: lerp(pa.y ?? 0, pb.y ?? 0, t),
      sx: lerp(pa.sx ?? 1, pb.sx ?? 1, t),
      sy: lerp(pa.sy ?? 1, pb.sy ?? 1, t),
    };
    // A world-angle goal fades in or out by weight.
    if (pa.wr !== undefined || pb.wr !== undefined) {
      o.wr = lerp(pa.wr ?? pb.wr!, pb.wr ?? pa.wr!, t);
      o.ww = lerp(pa.wr !== undefined ? (pa.ww ?? 1) : 0, pb.wr !== undefined ? (pb.ww ?? 1) : 0, t);
    }
    out.bones![name] = o;
  }
  const ik = new Set([...Object.keys(a.ik ?? {}), ...Object.keys(b.ik ?? {})]);
  if (ik.size) {
    out.ik = {};
    for (const end of ik) {
      const ga = a.ik?.[end];
      const gb = b.ik?.[end];
      const from = ga ?? { ...gb!, w: 0 };
      const to = gb ?? { ...ga!, w: 0 };
      out.ik[end] = {
        target: [lerp(from.target[0], to.target[0], t), lerp(from.target[1], to.target[1], t)],
        bend: (t < 0.5 ? from : to).bend,
        w: lerp(from.w ?? 1, to.w ?? 1, t),
      };
    }
  }
  const pick = t < 0.5 ? a : b;
  out.slots = { ...(t < 0.5 ? b.slots : a.slots), ...pick.slots };
  out.z = pick.z;
  out.draw = lerp(a.draw ?? 0, b.draw ?? 0, t);
  out.arrow = lerp(a.arrow ?? 0, b.arrow ?? 0, t);
  return out;
}

/** Keyframed sequence of whole poses. */
export function poseKeys(t: number, keys: Key<Pose2D>[]): Pose2D {
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
