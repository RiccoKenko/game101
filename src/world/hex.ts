/**
 * Pointy-top hex grid in axial coordinates (q, r), matching the KayKit hexagon tiles:
 * at scale 1 a tile is 2 wide (flat side to flat side, along x) and 2.31 deep (point to point, along z).
 * "North" is -z (away from the camera).
 */
export interface Hex {
  q: number;
  r: number;
}

export const SQRT3 = Math.sqrt(3);

/** Edge directions in counter-clockwise order seen from above, starting east. Index = edge number. */
export const DIRECTIONS: readonly Hex[] = [
  { q: 1, r: 0 }, // 0 E
  { q: 1, r: -1 }, // 1 NE
  { q: 0, r: -1 }, // 2 NW
  { q: -1, r: 0 }, // 3 W
  { q: -1, r: 1 }, // 4 SW
  { q: 0, r: 1 }, // 5 SE
];

/** Centre of a hex on the ground for tiles scaled by `scale`. */
export function hexToWorld(h: Hex, scale: number): { x: number; z: number } {
  return { x: 2 * scale * (h.q + h.r / 2), z: SQRT3 * scale * h.r };
}

/** Nearest hex to a ground point. */
export function worldToHex(x: number, z: number, scale: number): Hex {
  const r = z / (SQRT3 * scale);
  const q = x / (2 * scale) - r / 2;
  return roundHex(q, r);
}

export function roundHex(q: number, r: number): Hex {
  const s = -q - r;
  let rq = Math.round(q);
  let rr = Math.round(r);
  const rs = Math.round(s);
  const dq = Math.abs(rq - q);
  const dr = Math.abs(rr - r);
  const ds = Math.abs(rs - s);
  if (dq > dr && dq > ds) rq = -rr - rs;
  else if (dr > ds) rr = -rq - rs;
  return { q: rq + 0, r: rr + 0 };
}

export function neighbor(h: Hex, dir: number): Hex {
  const d = DIRECTIONS[((dir % 6) + 6) % 6];
  return { q: h.q + d.q, r: h.r + d.r };
}

/** Edge number (0-5) from `a` to an adjacent hex `b`, or -1 if they are not neighbours. */
export function directionTo(a: Hex, b: Hex): number {
  return DIRECTIONS.findIndex((d) => a.q + d.q === b.q && a.r + d.r === b.r);
}

export const hexKey = (h: Hex) => `${h.q},${h.r}`;

/** Angle (radians, for Object3D.rotation.y) that turns edge 0 (east) to face edge `dir`. */
export const edgeAngle = (dir: number) => (dir * Math.PI) / 3;
