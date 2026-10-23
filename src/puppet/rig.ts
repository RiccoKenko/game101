/**
 * 2D cut-out ("paper doll") rigs.
 *
 * A rig is authored on the character's rig-pose picture, in its pixels with y pointing down: bones are joints
 * placed on that picture, and each part image is pinned to a bone by naming two points on its source sheet and
 * where they land on the rig pose. That one rule calibrates position, angle and scale of parts that the artist
 * drew at slightly different sizes. At runtime everything is y-up, in rig-pose pixels around the ground point.
 */
import type { Pose2D } from './pose';

export type Vec2 = [number, number];

/** 2D affine [a, b, c, d, tx, ty]: x' = a·x + c·y + tx, y' = b·x + d·y + ty. */
export type Affine = [number, number, number, number, number, number];

export interface BoneDef {
  name: string;
  parent?: string;
  /** Joint position on the rig pose. */
  at: Vec2;
}

export interface PartDef {
  /** Unique within the rig. */
  name: string;
  /** Sprite name (file without .png). */
  img: string;
  bone: string;
  /** Draw order: higher draws on top. */
  z: number;
  /**
   * Points on the source sheet (sheet pixels) and where they land on the rig pose. Two points turn and scale
   * the part; three also skew it, e.g. to turn a front-on capelet into the rig pose's 3/4 view.
   */
  from: Vec2[];
  to: Vec2[];
  /** Scale across the from→to line, to squash a part lengthwise without thinning it (defaults to the scale along). */
  width?: number;
  /** Colour multiplier, e.g. 0.8 to push the far arm and leg back. */
  shade?: number;
  /** Parts sharing a slot are alternatives (eyes, mouths, hands): one shows at a time, the first by default. */
  slot?: string;
}

export interface SpringDef {
  bone: string;
  /** Rig-pose point the swinging piece hangs towards (its free end). */
  tip: Vec2;
  /** How far motion swings it (degrees per px/s across the bone). */
  gain: number;
  /** Natural frequency (Hz) and damping ratio of the swing. */
  freq: number;
  damping: number;
  /** Largest swing in degrees. */
  max: number;
}

export interface RigDef {
  id: string;
  /** Rig-pose point under the feet: the character's origin. */
  ground: Vec2;
  bones: BoneDef[];
  parts: PartDef[];
  springs?: SpringDef[];
  /** Named points on part images (sheet pixels), e.g. bow tips or the string hand's pinch. */
  points?: Record<string, { part: string; at: Vec2 }>;
  /** Eye parts for automatic blinking. */
  blink?: { slot: string; open: string; half?: string; closed: string };
  /** A bowstring between two named points, pulled towards a third (the string hand) by the pose's `draw`. */
  string?: { top: string; bottom: string; nock: string; color: string; width: number; z: number; drawnZ: number };
  /** The nocked arrow: an image laid from the string towards a named point (the bow grip). */
  arrow?: { img: string; nock: Vec2; tip: Vec2; length: number; toward: string; z: number };
}

export interface SpriteInfo {
  w: number;
  h: number;
  /** Where the sprite's top-left corner sat on its source sheet. */
  ox: number;
  oy: number;
}

export const IDENTITY: Affine = [1, 0, 0, 1, 0, 0];

/** a ∘ b: apply b, then a. */
export function mul(a: Affine, b: Affine): Affine {
  return [
    a[0] * b[0] + a[2] * b[1],
    a[1] * b[0] + a[3] * b[1],
    a[0] * b[2] + a[2] * b[3],
    a[1] * b[2] + a[3] * b[3],
    a[0] * b[4] + a[2] * b[5] + a[4],
    a[1] * b[4] + a[3] * b[5] + a[5],
  ];
}

export const apply = (m: Affine, p: Vec2): Vec2 => [m[0] * p[0] + m[2] * p[1] + m[4], m[1] * p[0] + m[3] * p[1] + m[5]];
export const translate = (x: number, y: number): Affine => [1, 0, 0, 1, x, y];
export const rotate = (r: number): Affine => [Math.cos(r), Math.sin(r), -Math.sin(r), Math.cos(r), 0, 0];
export const scale = (sx: number, sy: number): Affine => [sx, 0, 0, sy, 0, 0];
/**
 * The transform that carries points a, b onto A, B: turn and scale along the a→b line (and across it by
 * `width`, which defaults to the same scale so proportions hold).
 */
export function fitAffine(a: Vec2, b: Vec2, A: Vec2, B: Vec2, width?: number): Affine {
  const along = Math.hypot(B[0] - A[0], B[1] - A[1]) / Math.hypot(b[0] - a[0], b[1] - a[1]);
  const phi = Math.atan2(b[1] - a[1], b[0] - a[0]);
  const PHI = Math.atan2(B[1] - A[1], B[0] - A[0]);
  return mul(translate(A[0], A[1]), mul(rotate(PHI), mul(scale(along, width ?? along), mul(rotate(-phi), translate(-a[0], -a[1])))));
}

/** The affine transform that carries three points exactly onto three others. */
export function fitAffine3(p: Vec2[], q: Vec2[]): Affine {
  const [u1, u2] = [p[1].map((v, i) => v - p[0][i]), p[2].map((v, i) => v - p[0][i])];
  const [w1, w2] = [q[1].map((v, i) => v - q[0][i]), q[2].map((v, i) => v - q[0][i])];
  const det = u1[0] * u2[1] - u2[0] * u1[1];
  // M = [w1 w2] · [u1 u2]⁻¹
  const inv = [u2[1] / det, -u1[1] / det, -u2[0] / det, u1[0] / det];
  const m: Affine = [
    w1[0] * inv[0] + w2[0] * inv[1],
    w1[1] * inv[0] + w2[1] * inv[1],
    w1[0] * inv[2] + w2[0] * inv[3],
    w1[1] * inv[2] + w2[1] * inv[3],
    0,
    0,
  ];
  const at = apply(m, p[0]);
  m[4] = q[0][0] - at[0];
  m[5] = q[0][1] - at[1];
  return m;
}

/** A point on a sprite (given in source-sheet pixels) in the sprite's own y-up coordinates: pixel (u, v) is at (u, -v). */
export const spritePoint = (sprite: SpriteInfo, p: Vec2): Vec2 => [p[0] - sprite.ox, sprite.oy - p[1]];

/** Where a part image sits in its bone's space (y-up, origin at the joint). */
export function partMatrix(part: PartDef, sprite: SpriteInfo, joint: Vec2): Affine {
  const rig = (p: Vec2): Vec2 => [p[0] - joint[0], joint[1] - p[1]];
  const from = part.from.map((p) => spritePoint(sprite, p));
  const to = part.to.map(rig);
  return from.length >= 3 ? fitAffine3(from, to) : fitAffine(from[0], from[1], to[0], to[1], part.width);
}

const lerpAngle = (a: number, b: number, t: number) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * t;
const DEG = Math.PI / 180;

/**
 * Forward kinematics for a pose, plus two goals clips use a lot: two-bone IK (put a hand on a point) and
 * world-angle goals (keep the bow upright whatever the arm does). Pure maths, shared by the renderer and tests.
 */
export class Skeleton2D {
  readonly order: BoneDef[] = [];
  /** Rest offset of each joint from its parent joint (or from the ground for roots), y-up. */
  readonly rest = new Map<string, Vec2>();
  readonly local = new Map<string, Affine>();
  readonly world = new Map<string, Affine>();
  /** World rotation (radians) of each bone. */
  readonly angle = new Map<string, number>();
  /** Final per-bone rotation (radians) after goals, for the renderer. */
  readonly rot = new Map<string, number>();
  private byName = new Map<string, BoneDef>();

  constructor(rig: RigDef) {
    for (const b of rig.bones) this.byName.set(b.name, b);
    const visit = (b: BoneDef) => {
      if (this.order.includes(b)) return;
      if (b.parent) visit(this.bone(b.parent));
      this.order.push(b);
    };
    rig.bones.forEach(visit);
    for (const b of this.order) {
      const from = b.parent ? this.bone(b.parent).at : rig.ground;
      this.rest.set(b.name, [b.at[0] - from[0], from[1] - b.at[1]]);
    }
  }

  bone(name: string): BoneDef {
    const b = this.byName.get(name);
    if (!b) throw new Error(`No bone "${name}"`);
    return b;
  }

  /** Joint position of a bone in character space. */
  joint(name: string): Vec2 {
    const m = this.world.get(name)!;
    return [m[4], m[5]];
  }

  solve(pose: Pose2D): void {
    const bones = pose.bones ?? {};
    const r = new Map<string, number>();
    for (const b of this.order) r.set(b.name, (bones[b.name]?.r ?? 0) * DEG);
    this.fk(pose, r, false);
    for (const [end, goal] of Object.entries(pose.ik ?? {})) {
      const lower = this.bone(end).parent!;
      const upper = this.bone(lower).parent!;
      const parent = this.bone(upper).parent;
      const parentAngle = parent ? this.angle.get(parent)! : 0;
      const restL = this.rest.get(lower)!;
      const restE = this.rest.get(end)!;
      const l1 = Math.hypot(...restL);
      const l2 = Math.hypot(...restE);
      const s = this.joint(upper);
      const dx = goal.target[0] - s[0];
      const dy = goal.target[1] - s[1];
      const d = Math.min(l1 + l2 - 1e-3, Math.max(Math.abs(l1 - l2) + 1e-3, Math.hypot(dx, dy)));
      const inner = Math.acos(Math.min(1, Math.max(-1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d))));
      const seg1 = Math.atan2(dy, dx) + (goal.bend ?? 1) * inner;
      const elbow: Vec2 = [s[0] + l1 * Math.cos(seg1), s[1] + l1 * Math.sin(seg1)];
      const seg2 = Math.atan2(goal.target[1] - elbow[1], goal.target[0] - elbow[0]);
      const ru = seg1 - parentAngle - Math.atan2(restL[1], restL[0]);
      const rl = seg2 - parentAngle - ru - Math.atan2(restE[1], restE[0]);
      const w = goal.w ?? 1;
      r.set(upper, lerpAngle(r.get(upper)!, ru, w));
      r.set(lower, lerpAngle(r.get(lower)!, rl, w));
    }
    this.fk(pose, r, true);
  }

  private fk(pose: Pose2D, r: Map<string, number>, goals: boolean): void {
    const bones = pose.bones ?? {};
    for (const b of this.order) {
      const p = bones[b.name] ?? {};
      const parentAngle = b.parent ? this.angle.get(b.parent)! : 0;
      let rot = r.get(b.name)!;
      if (goals && p.wr !== undefined) rot = lerpAngle(rot, p.wr * DEG - parentAngle, p.ww ?? 1);
      const [rx, ry] = this.rest.get(b.name)!;
      const local = mul(translate(rx + (p.x ?? 0), ry + (p.y ?? 0)), mul(rotate(rot), scale(p.sx ?? 1, p.sy ?? 1)));
      this.local.set(b.name, local);
      this.rot.set(b.name, rot);
      this.world.set(b.name, b.parent ? mul(this.world.get(b.parent)!, local) : local);
      this.angle.set(b.name, parentAngle + rot);
    }
  }
}
