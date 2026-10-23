/**
 * Shared chibi skeleton (2.5 heads tall, ~1 unit high, facing +Z, feet on y = 0).
 * Arms hang in a relaxed A-pose so elbows and shoulders bend cleanly both ways.
 */
import type { BoneDef } from './character';
import type { Vec3 } from './sdf';

export interface BodyFrame {
  hips: Vec3;
  spine: Vec3;
  chest: Vec3;
  neck: Vec3;
  head: Vec3;
  shoulder: Vec3; // left side (+x); the right side is mirrored
  elbow: Vec3;
  wrist: Vec3;
  hand: Vec3;
  hip: Vec3;
  knee: Vec3;
  ankle: Vec3;
  toe: Vec3;
}

export const mirrorX = (v: Vec3): Vec3 => [-v[0], v[1], v[2]];

export function chibiBones(f: BodyFrame): BoneDef[] {
  const side = (s: 'L' | 'R', v: Vec3) => (s === 'L' ? v : mirrorX(v));
  const bones: BoneDef[] = [
    { name: 'root', head: [0, 0, 0], tail: [0, 0.05, 0] },
    { name: 'hips', parent: 'root', head: f.hips },
    { name: 'spine', parent: 'hips', head: f.spine },
    { name: 'chest', parent: 'spine', head: f.chest },
    { name: 'neck', parent: 'chest', head: f.neck },
    { name: 'head', parent: 'neck', head: f.head, tail: [f.head[0], f.head[1] + 0.3, f.head[2]] },
  ];
  for (const s of ['L', 'R'] as const) {
    bones.push(
      { name: `upperArm.${s}`, parent: 'chest', head: side(s, f.shoulder) },
      { name: `lowerArm.${s}`, parent: `upperArm.${s}`, head: side(s, f.elbow) },
      { name: `hand.${s}`, parent: `lowerArm.${s}`, head: side(s, f.wrist), tail: side(s, f.hand) },
      { name: `upperLeg.${s}`, parent: 'hips', head: side(s, f.hip) },
      { name: `lowerLeg.${s}`, parent: `upperLeg.${s}`, head: side(s, f.knee) },
      { name: `foot.${s}`, parent: `lowerLeg.${s}`, head: side(s, f.ankle), tail: side(s, f.toe) },
    );
  }
  return bones;
}
