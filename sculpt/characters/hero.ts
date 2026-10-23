/**
 * Little Archer: green hood with a gold-trimmed capelet, leather vest over a cream shirt, navy pants,
 * brown boots, big teal eyes, chestnut fringe, a recurve bow with a string that really draws back.
 */
import { defaults, ease, key, layer, osc, poseKeys, type ClipDef, type Pose } from '../anim';
import type { BoneDef, CharacterDef, PieceDef } from '../character';
import { chibiBones, mirrorX, type BodyFrame } from '../rigs';
import {
  capsule, cylinder, ellipsoid, hex, mixRgb, painted, roundBox, roundCone, shell, smoothstep, sphere,
  subtract, torus, union, type Shape, type Vec3,
} from '../sdf';

const C = {
  skin: hex('#ffd9bd'),
  blush: hex('#ff9b9b'),
  hair: hex('#8a4b26'),
  hairHi: hex('#b56a37'),
  hood: hex('#3e9a4f'),
  hoodDark: hex('#2d7a3d'),
  trim: hex('#f4c34f'),
  shirt: hex('#f6ead2'),
  vest: hex('#8c5a33'),
  strap: hex('#5d3a1f'),
  belt: hex('#6a4326'),
  gold: hex('#f2c14e'),
  pants: hex('#3c4d73'),
  boot: hex('#704a2c'),
  bootCuff: hex('#a8774b'),
  sole: hex('#3b2618'),
  white: hex('#ffffff'),
  iris: hex('#27b2a4'),
  irisDark: hex('#13615d'),
  pupil: hex('#18182a'),
  mouth: hex('#7a2f2a'),
  tongue: hex('#ff7f86'),
  wood: hex('#b97a40'),
  woodDark: hex('#7c4c24'),
  string: hex('#fbf4e2'),
  steel: hex('#d8dde6'),
  fletchRed: hex('#e5534b'),
};

export const HERO_FRAME: BodyFrame = {
  hips: [0, 0.3, 0],
  spine: [0, 0.38, 0],
  chest: [0, 0.47, 0],
  neck: [0, 0.555, 0],
  head: [0, 0.6, 0],
  shoulder: [0.112, 0.522, 0],
  elbow: [0.163, 0.414, 0.004],
  wrist: [0.206, 0.322, 0.008],
  hand: [0.222, 0.288, 0.01],
  hip: [0.058, 0.292, 0],
  knee: [0.061, 0.172, 0.006],
  ankle: [0.064, 0.064, 0],
  toe: [0.066, 0.02, 0.075],
};
const F = HERO_FRAME;

// Bow geometry: a vertical arc in the YZ plane, grip in the left hand, bulging forward (+Z).
const GRIP: Vec3 = [F.hand[0] + 0.004, F.hand[1], F.hand[2] + 0.02];
const BOW_R = 0.2;
const BOW_HALF = 58;
const tipY = BOW_R * Math.sin((BOW_HALF * Math.PI) / 180);
const tipZ = GRIP[2] - BOW_R + BOW_R * Math.cos((BOW_HALF * Math.PI) / 180);
const NOCK: Vec3 = [GRIP[0], GRIP[1], tipZ];

const EYE: Vec3 = [0.074, 0.752, 0.179];
const MOUTH: Vec3 = [0, 0.674, 0.19];

function bones(): BoneDef[] {
  return [
    ...chibiBones(F),
    { name: 'eye.L', parent: 'head', head: EYE },
    { name: 'eye.R', parent: 'head', head: mirrorX(EYE) },
    { name: 'brow.L', parent: 'head', head: [0.074, 0.822, 0.182] },
    { name: 'brow.R', parent: 'head', head: [-0.074, 0.822, 0.182] },
    { name: 'mouth', parent: 'head', head: MOUTH },
    { name: 'mouthOpen', parent: 'head', head: [0, 0.67, 0.185] },
    { name: 'hoodTip', parent: 'head', head: [0, 0.92, -0.15], tail: [0, 0.84, -0.33] },
    { name: 'cape1', parent: 'chest', head: [0, 0.54, -0.07] },
    { name: 'cape2', parent: 'cape1', head: [0, 0.48, -0.12], tail: [0, 0.4, -0.15] },
    { name: 'bow', parent: 'hand.L', head: GRIP, tail: [GRIP[0], GRIP[1] + 0.1, GRIP[2]] },
    { name: 'nock', parent: 'bow', head: NOCK },
    { name: 'arrow', parent: 'nock', head: NOCK, tail: [NOCK[0], NOCK[1], NOCK[2] + 0.2] },
  ];
}

// ---------- pieces

function head(): Shape {
  const skull = ellipsoid(0.205, 0.192, 0.186).place([0, 0.776, 0.004]);
  const cheekL = sphere(0.075).place([0.098, 0.712, 0.098]);
  const chin = ellipsoid(0.12, 0.08, 0.1).place([0, 0.668, 0.075]);
  const nose = ellipsoid(0.02, 0.015, 0.016).place([0, 0.722, 0.191]);
  const face = union([skull, cheekL, cheekL.mirrored(), chin], 0.07);
  const withNose = union([face, nose], 0.012);
  return painted(withNose, (p, base) => {
    // Rosy cheeks and a slightly warmer nose tip.
    const cheek = Math.min(dist(p, [0.112, 0.705, 0.16]), dist(p, [-0.112, 0.705, 0.16]));
    let c = mixRgb(base, C.blush, 0.55 * (1 - smoothstep(0.012, 0.045, cheek)));
    c = mixRgb(c, C.blush, 0.25 * (1 - smoothstep(0.0, 0.02, dist(p, [0, 0.725, 0.205]))));
    return c;
  }).color(C.skin);
}

function hair(): Shape {
  const locks: Shape[] = [];
  const fringe: [number, number, number][] = [
    [-0.12, -0.02, 0.03], [-0.065, 0.012, 0.038], [0, -0.012, 0.042], [0.06, 0.016, 0.04], [0.118, -0.018, 0.032],
  ];
  for (const [x, dx, r] of fringe) locks.push(roundCone([x, 0.905, 0.1], [x + dx, 0.828, 0.176], r, 0.012));
  // Side locks framing the cheeks.
  const side = roundCone([0.165, 0.84, 0.08], [0.178, 0.705, 0.115], 0.034, 0.012);
  locks.push(side, side.mirrored());
  // A cap of hair under the hood so no scalp shows.
  locks.push(ellipsoid(0.2, 0.17, 0.18).place([0, 0.83, 0.0]));
  return painted(union(locks, 0.025), (p, base) => mixRgb(base, C.hairHi, 0.6 * smoothstep(0.86, 0.9, p[1]) * smoothstep(0.1, 0.16, p[2]))).color(C.hair);
}

function hood(): Shape {
  const outer = ellipsoid(0.228, 0.224, 0.214).place([0, 0.79, -0.016]);
  const opening = ellipsoid(0.182, 0.188, 0.2).place([0, 0.758, 0.2]);
  const tip = roundCone([0, 0.93, -0.13], [0, 0.84, -0.33], 0.072, 0.016);
  const body = union([shell(outer, 0.034), tip], 0.05);
  const cut = subtract(body, opening, 0.012);
  // Keep it a hood, not a helmet: nothing below the jaw line in front.
  const jaw = roundBox(0.3, 0.12, 0.2, 0.02).place([0, 0.555, 0.17]);
  const hoodShape = subtract(cut, jaw, 0.03);
  return painted(hoodShape, (p, base) => {
    const edge = Math.abs(opening.dist(p[0], p[1], p[2]));
    const shade = mixRgb(base, C.hoodDark, 0.35 * smoothstep(0.85, 0.65, p[1]));
    return edge < 0.016 ? C.trim : shade;
  }).color(C.hood).as('cloth');
}

function capelet(): Shape {
  // A short poncho-like capelet: a cone shell from the neck over the shoulders, longer at the back.
  const cone = roundCone([0, 0.585, -0.004], [0, 0.43, -0.012], 0.062, 0.148);
  const cape = shell(cone, 0.02);
  const hem = roundBox(0.4, 0.2, 0.4, 0.01).place([0, 0.3, 0], [-16, 0, 0]);
  const neckHole = cylinder(0.064, 0.1).place([0, 0.64, 0]);
  const shaped = subtract(subtract(cape, hem, 0.012), neckHole, 0.01);
  return painted(shaped, (p, base) => {
    const d = hem.dist(p[0], p[1], p[2]);
    return d < 0.014 ? C.trim : mixRgb(base, C.hoodDark, 0.4 * smoothstep(0.52, 0.44, p[1]));
  }).color(C.hood).as('cloth');
}

function torso(): Shape {
  const chest = ellipsoid(0.104, 0.13, 0.088).place([0, 0.43, 0.004]);
  const skirt = roundCone([0, 0.36, 0.004], [0, 0.275, 0.004], 0.098, 0.11);
  const body = union([chest, skirt], 0.05);
  const belt = torus(0.106, 0.016).place([0, 0.35, 0.004]);
  const buckle = roundBox(0.026, 0.02, 0.008, 0.004).place([0, 0.35, 0.116]).color(C.gold).as('metal');
  const neck = cylinder(0.042, 0.04, 0.01).place([0, 0.56, 0.005]).color(C.skin);
  const vested = painted(body, (p) => {
    // Diagonal quiver strap across the chest, open vest showing the shirt down the middle.
    const strap = Math.abs(p[0] * 0.64 + (p[1] - 0.43) * 0.77);
    if (strap < 0.013 && p[2] > -0.02) return C.strap;
    if (p[1] < 0.37) return C.vest;
    if (p[2] > 0 && Math.abs(p[0]) < 0.03 + (p[1] - 0.37) * 0.25) return C.shirt;
    return C.vest;
  });
  return union([vested, belt.color(C.belt), buckle, neck], 0.004);
}

function arm(side: 1 | -1): Shape {
  const s = (v: Vec3): Vec3 => [v[0] * side, v[1], v[2]];
  const puff = ellipsoid(0.05, 0.048, 0.048).place(s([0.122, 0.5, 0]));
  const upper = roundCone(s(F.shoulder), s(F.elbow), 0.04, 0.034);
  const sleeve = union([puff, upper], 0.03).color(C.shirt).as('cloth');
  const bracer = roundCone(s(F.elbow), s(F.wrist), 0.036, 0.034);
  const cuff = roundCone(s(lerp(F.elbow, F.wrist, 0.82)), s(F.wrist), 0.039, 0.038);
  const fore = union([bracer.color(C.vest), cuff.color(C.bootCuff)], 0.004);
  const palm = ellipsoid(0.036, 0.041, 0.034).place(s(F.hand), [0, 0, 25 * side]);
  const thumb = ellipsoid(0.014, 0.022, 0.014).place(s([F.hand[0] - 0.012, F.hand[1] + 0.012, F.hand[2] + 0.03]), [20, 0, 0]);
  const hand = union([palm, thumb], 0.012).color(C.skin);
  return union([sleeve, fore, hand], 0.012);
}

function leg(side: 1 | -1): Shape {
  const s = (v: Vec3): Vec3 => [v[0] * side, v[1], v[2]];
  const thigh = roundCone(s(F.hip), s(F.knee), 0.054, 0.046);
  const shin = roundCone(s(F.knee), s([F.ankle[0], F.ankle[1] + 0.03, F.ankle[2]]), 0.046, 0.042);
  const pants = union([thigh, shin], 0.02).color(C.pants).as('cloth');
  const shaft = roundCone(s([F.ankle[0], 0.115, 0]), s([F.ankle[0], 0.035, 0.005]), 0.047, 0.05);
  const foot = ellipsoid(0.05, 0.034, 0.072).place(s([0.066, 0.034, 0.034]));
  const boot = painted(union([shaft, foot], 0.03), (p, base) => (p[1] < 0.012 ? C.sole : base)).color(C.boot);
  const cuff = torus(0.048, 0.013).place(s([F.ankle[0], 0.118, 0.001])).color(C.bootCuff);
  return union([pants, boot, cuff], 0.01);
}

function eye(): Shape {
  const white = ellipsoid(0.041, 0.054, 0.024).color(C.white).as('gloss');
  const iris = ellipsoid(0.032, 0.043, 0.012).place([0.002, -0.004, 0.016]);
  const irisPainted = painted(iris, (p, base) => mixRgb(C.irisDark, base, smoothstep(0.02, -0.03, p[1]))).color(C.iris).as('gloss');
  const pupil = ellipsoid(0.017, 0.023, 0.008).place([0.002, -0.002, 0.024]).color(C.pupil).as('gloss');
  const glint = sphere(0.0115).place([0.014, 0.018, 0.028]).color(C.white).as('glow');
  const glint2 = sphere(0.0055).place([-0.01, -0.02, 0.027]).color(C.white).as('glow');
  return union([white, irisPainted, pupil, glint, glint2]);
}

function placedEye(side: 1 | -1): Shape {
  const e = eye();
  e.place([EYE[0] * side, EYE[1], EYE[2]], [0, 14 * side, 0]);
  return e;
}

function brow(side: 1 | -1): Shape {
  return capsule([-0.022, 0, 0], [0.022, 0.006 * side, 0], 0.0075).place([0.074 * side, 0.822, 0.184], [0, 12 * side, -6 * side]).color(C.hair);
}

function mouthSmile(): Shape {
  // An arc open to the top.
  // Torus starts flat (XZ); stand it up to face +Z, then turn the arc's middle to the bottom.
  const R = 0.028;
  return torus(R, 0.0068, 110).place([0, 0, 0], [90, 0, 0]).place([MOUTH[0], MOUTH[1] + R, MOUTH[2]], [0, 0, -90]).color(C.mouth);
}

function mouthOpen(): Shape {
  const m = ellipsoid(0.03, 0.024, 0.012).place([0, 0.67, 0.183]);
  return painted(m, (p, base) => (p[1] < 0.662 ? C.tongue : base)).color(C.mouth);
}

function bow(): Shape {
  const arc = torus(BOW_R, 0.0105, BOW_HALF * 2).place([GRIP[0], GRIP[1], GRIP[2] - BOW_R], [90, 0, 90]).color(C.wood);
  const grip = cylinder(0.016, 0.03, 0.006).place(GRIP).color(C.woodDark);
  const tips: Shape[] = [1, -1].map((s) => sphere(0.015).place([GRIP[0], GRIP[1] + s * tipY, tipZ]).color(C.gold).as('metal'));
  return union([arc, grip, ...tips], 0.006);
}

function bowString(): Shape {
  const top: Vec3 = [NOCK[0], NOCK[1] + tipY, NOCK[2]];
  const bottom: Vec3 = [NOCK[0], NOCK[1] - tipY, NOCK[2]];
  return union([capsule(top, NOCK, 0.0032), capsule(NOCK, bottom, 0.0032)]).color(C.string);
}

function nockedArrow(): Shape {
  const front: Vec3 = [NOCK[0], NOCK[1], NOCK[2] + 0.26];
  const shaft = capsule([NOCK[0], NOCK[1], NOCK[2] + 0.005], front, 0.0045).color(C.wood);
  const head = roundCone(front, [front[0], front[1], front[2] + 0.04], 0.013, 0.002).color(C.steel).as('metal');
  const feathers: Shape[] = [0, 120, 240].map((a) =>
    roundBox(0.0015, 0.012, 0.03, 0.0012).place([0, 0.009, 0], [0, 0, a]).place([NOCK[0], NOCK[1], NOCK[2] + 0.035]).color(C.fletchRed),
  );
  return union([shaft, head, ...feathers]);
}

function quiver(): Shape {
  const a: Vec3 = [0.075, 0.33, -0.15];
  const b: Vec3 = [-0.06, 0.55, -0.15];
  const body = roundCone(a, b, 0.034, 0.042).color(C.vest);
  const band = torus(0.043, 0.006).place(lerp(a, b, 0.85), [0, 0, 32]).color(C.gold).as('metal');
  const arrows: Shape[] = [];
  for (const [dx, dz] of [[0, 0], [0.018, 0.012], [-0.012, 0.014]]) {
    const base: Vec3 = [b[0] + dx, b[1] - 0.01, b[2] + dz];
    const top: Vec3 = [base[0] - 0.05, base[1] + 0.085, base[2]];
    arrows.push(capsule(base, top, 0.004).color(C.wood));
    arrows.push(ellipsoid(0.006, 0.026, 0.013).place(lerp(base, top, 0.82), [0, 0, 32]).color(C.fletchRed).as('cloth'));
  }
  return union([body, band, ...arrows], 0.004);
}

function pieces(): PieceDef[] {
  const armSkin = (s: 'L' | 'R') => ['chest', `upperArm.${s}`, `lowerArm.${s}`, `hand.${s}`];
  const legSkin = (s: 'L' | 'R') => ['hips', `upperLeg.${s}`, `lowerLeg.${s}`, `foot.${s}`];
  return [
    { name: 'head', shape: head(), cell: 0.0055, maxTris: 2600, bone: 'head' },
    { name: 'hair', shape: hair(), cell: 0.0035, maxTris: 2400, bone: 'head' },
    { name: 'hood', shape: hood(), cell: 0.004, maxTris: 3400, skin: ['head', 'hoodTip'], sharpness: 4 },
    { name: 'eye.L', shape: placedEye(1), cell: 0.0022, maxTris: 900, bone: 'eye.L' },
    { name: 'eye.R', shape: placedEye(-1), cell: 0.0022, maxTris: 900, bone: 'eye.R' },
    { name: 'brow.L', shape: brow(1), cell: 0.0025, maxTris: 120, bone: 'brow.L' },
    { name: 'brow.R', shape: brow(-1), cell: 0.0025, maxTris: 120, bone: 'brow.R' },
    { name: 'mouth', shape: mouthSmile(), cell: 0.0022, maxTris: 200, bone: 'mouth' },
    { name: 'mouthOpen', shape: mouthOpen(), cell: 0.0025, maxTris: 260, bone: 'mouthOpen' },
    { name: 'torso', shape: torso(), cell: 0.006, maxTris: 2200, skin: ['hips', 'spine', 'chest', 'neck'] },
    { name: 'capelet', shape: capelet(), cell: 0.005, maxTris: 1600, skin: ['chest', 'cape1', 'cape2'], sharpness: 3 },
    { name: 'arm.L', shape: arm(1), cell: 0.0045, maxTris: 1400, skin: armSkin('L') },
    { name: 'arm.R', shape: arm(-1), cell: 0.0045, maxTris: 1400, skin: armSkin('R') },
    { name: 'leg.L', shape: leg(1), cell: 0.005, maxTris: 1200, skin: legSkin('L') },
    { name: 'leg.R', shape: leg(-1), cell: 0.005, maxTris: 1200, skin: legSkin('R') },
    { name: 'quiver', shape: quiver(), cell: 0.0035, maxTris: 1200, bone: 'chest' },
    { name: 'bow', shape: bow(), cell: 0.003, maxTris: 1000, bone: 'bow' },
    {
      name: 'string',
      shape: bowString(),
      cell: 0.0018,
      maxTris: 300,
      // Straight from each tip to the nock: weight slides from the bow to the nock along the string.
      weigh: (p) => {
        const t = 1 - Math.min(1, Math.abs(p[1] - NOCK[1]) / tipY);
        return [['nock', t], ['bow', 1 - t]];
      },
    },
    { name: 'arrow', shape: nockedArrow(), cell: 0.002, maxTris: 500, bone: 'arrow' },
  ];
}

// ---------- animation

/** Neutral face + hidden extras every clip starts from. */
const FACE: Pose = { mouthOpen: { s: 0.001 }, arrow: { s: 0.001 } };

function blinkPose(t: number, at: number[]): Pose {
  let y = 1;
  for (const b of at) y = Math.min(y, key(t, [[b - 0.07, 1], [b, 0.08, ease.in], [b + 0.09, 1, ease.out]]));
  return { 'eye.L': { s: [1, y, 1] }, 'eye.R': { s: [1, y, 1] } };
}

/** Arms resting with the bow held low. */
const REST: Pose = {
  'upperArm.L': { r: [8, 0, 6] },
  'lowerArm.L': { r: [-14, 0, 0] },
  'upperArm.R': { r: [4, 0, -6] },
  'lowerArm.R': { r: [-12, 0, 0] },
};

function idle(t: number): Pose {
  const breath = osc(t, 2.4);
  const sway = osc(t, 4.8);
  return defaults(FACE, layer(REST, blinkPose(t, [1.1, 3.6]), {
    hips: { p: [0, breath * 0.004, 0], r: [0, sway * 3, 0] },
    spine: { r: [breath * 1.5, 0, sway * 1.5] },
    chest: { r: [breath * 2, 0, 0], s: [1 + breath * 0.012, 1, 1 + breath * 0.012] },
    head: { r: [-breath * 2, key(t, [[0, 0], [1.6, 0], [2.0, 18], [2.9, 18], [3.3, -10], [4.1, -10], [4.6, 0], [4.8, 0]]), osc(t, 4.8, 0.25) * 3] },
    'upperArm.L': { r: [breath * 2, 0, 0] },
    'upperArm.R': { r: [-breath * 2, 0, 0] },
    cape1: { r: [osc(t, 2.4, 0.2) * 4, 0, 0] },
    cape2: { r: [osc(t, 2.4, 0.35) * 6, 0, 0] },
    hoodTip: { r: [osc(t, 2.4, 0.3) * 6, osc(t, 4.8) * 5, 0] },
  }));
}

function run(t: number): Pose {
  const P = 0.5; // one stride cycle
  const ph = osc(t, P);
  const step = Math.abs(osc(t, P, 0.25));
  return defaults(FACE, layer(blinkPose(t, [0.3]), {
    hips: { p: [0, step * 0.03 - 0.018, 0], r: [10, ph * 10, 0] },
    spine: { r: [6, -ph * 6, 0] },
    chest: { r: [4, -ph * 8, 0] },
    head: { r: [-14 + step * 4, ph * 6, 0] },
    'upperLeg.L': { r: [-ph * 42 - 8, 0, 0] },
    'lowerLeg.L': { r: [Math.max(0, osc(t, P, 0.15)) * 70 + 8, 0, 0] },
    'foot.L': { r: [ph * 18, 0, 0] },
    'upperLeg.R': { r: [ph * 42 - 8, 0, 0] },
    'lowerLeg.R': { r: [Math.max(0, -osc(t, P, 0.15)) * 70 + 8, 0, 0] },
    'foot.R': { r: [-ph * 18, 0, 0] },
    'upperArm.L': { r: [ph * 32, 0, 12] },
    'lowerArm.L': { r: [-50, 0, 0] },
    // Keep the bow riding steady instead of flailing with the arm.
    bow: { aim: { fwd: [0.1, -0.35, 1], up: [0.25, 1, 0.3], w: 0.75 } },
    'upperArm.R': { r: [-ph * 46, 0, -10] },
    'lowerArm.R': { r: [-55, 0, 0] },
    cape1: { r: [-28 - step * 10, 0, 0] },
    cape2: { r: [-18 + osc(t, P / 2, 0.3) * 8, 0, 0] },
    hoodTip: { r: [-20 + step * 10, ph * 6, 0] },
  }));
}

/** Where the bow hand holds the bow at full draw, in front of the chest (character space). */
const BOW_HAND: Vec3 = [0.1, 0.45, 0.3];
const DRAW = 0.1;

/** Full draw: body turned a little side-on, bow arm out front, string hand pulled back to the cheek. */
function aimPose(draw: number): Pose {
  return {
    hips: { r: [0, -22, 0] },
    spine: { r: [2, -10, 0] },
    chest: { r: [-3, -8, 0] },
    head: { r: [4, 38, 2] },
    'hand.L': { ik: { target: BOW_HAND, pole: [0.36, 0.3, 0.05] } },
    bow: { aim: { fwd: [0, 0, 1], up: [0.42, 1, 0] } },
    nock: { p: [0, 0, -DRAW * draw] },
    // The string hand pinches the nock: just behind it, a touch above.
    'hand.R': { ik: { target: [BOW_HAND[0] - 0.035, BOW_HAND[1] + 0.03, BOW_HAND[2] - 0.13 - DRAW * draw], pole: [-0.32, 0.62, -0.1] }, r: [0, 0, 0] },
    arrow: { s: 1 },
    'brow.L': { p: [0, -0.006, 0], r: [0, 0, -10] },
    'brow.R': { p: [0, -0.006, 0], r: [0, 0, 10] },
    'eye.R': { s: [1, 0.6, 1] },
  };
}
const AIM = aimPose(1);

/** Just after release: string hand flies back and opens, bow kicks. */
const RELEASE: Pose = {
  ...aimPose(0),
  'hand.R': { ik: { target: [-0.06, 0.58, -0.05], pole: [-0.35, 0.7, -0.1] } },
  'hand.L': { ik: { target: [BOW_HAND[0], BOW_HAND[1] + 0.02, BOW_HAND[2] - 0.02], pole: [0.32, 0.36, 0.05] } },
  arrow: { s: 0.001 },
  chest: { r: [-8, -2, 0] },
};

function shoot(t: number): Pose {
  // 0-0.16 anticipation (dip, bow comes up), draw to 0.4, hold, release at 0.5, recoil, settle.
  const base = poseKeys(t, [
    [0, REST],
    [0.16, layer(REST, { hips: { p: [0, -0.014, 0] }, 'upperArm.L': { r: [-25, 0, 0] }, 'upperArm.R': { r: [-15, 0, 0] } }), ease.out],
    [0.3, { ...aimPose(0.3), arrow: { s: 0.001 } }, ease.out],
    [0.34, aimPose(0.4), ease.out],
    [0.44, AIM, ease.out],
    [0.5, AIM],
    [0.56, RELEASE, ease.out],
    [0.8, layer(RELEASE, { chest: { r: [4, 0, 0] } }), ease.back],
    [1.1, REST, ease.inOut],
  ]);
  // The string snaps forward past rest and wobbles.
  const wobble = t > 0.5 ? Math.sin((t - 0.5) * 70) * Math.exp(-(t - 0.5) * 12) * 0.02 : 0;
  return defaults(FACE, layer(base, { nock: { p: [0, 0, wobble] } }));
}

function cheer(t: number): Pose {
  const jump = key(t, [[0, 0], [0.15, -0.04, ease.out], [0.38, 0.16, ease.out], [0.6, 0, ease.in], [0.7, -0.03, ease.out], [0.85, 0, ease.out], [1.4, 0]]);
  const up: Pose = {
    'upperArm.L': { r: [-160, 0, 20] },
    'lowerArm.L': { r: [-10, 0, 0] },
    'upperArm.R': { r: [-150, 0, -30] },
    'lowerArm.R': { r: [-20, 0, 0] },
    bow: { aim: { fwd: [0, 0.2, 1], up: [0.6, 1, 0] } },
    mouth: { s: 0.001 },
    mouthOpen: { s: 1.15 },
    'eye.L': { s: 1.12 },
    'eye.R': { s: 1.12 },
    'brow.L': { p: [0, 0.012, 0] },
    'brow.R': { p: [0, 0.012, 0] },
    head: { r: [-14, 0, 0] },
  };
  const arms = poseKeys(t, [[0, REST], [0.2, REST], [0.38, up, ease.back], [1.1, up], [1.4, REST]]);
  const squash = key(t, [[0, 1], [0.15, 0.9, ease.out], [0.3, 1.08], [0.6, 1], [0.7, 0.92], [0.85, 1]]);
  return defaults(FACE, layer(arms, {
    root: { p: [0, Math.max(0, jump), 0], s: [2 - squash, squash, 2 - squash] },
    cape1: { r: [key(t, [[0, 0], [0.38, 30], [0.7, -10], [1, 0]]), 0, 0] },
    hoodTip: { r: [key(t, [[0, 0], [0.38, 25], [0.7, -15], [1, 0]]), 0, 0] },
  }));
}

function hit(t: number): Pose {
  const k = key(t, [[0, 0], [0.06, 1, ease.out], [0.45, 0, ease.inOut]]);
  return defaults(FACE, layer(REST, {
    hips: { p: [0, 0, -0.03 * k], r: [-14 * k, 0, 0] },
    chest: { r: [-16 * k, 0, 0] },
    head: { r: [-18 * k, 0, 8 * k] },
    'eye.L': { s: [1 + 0.1 * k, 1 - 0.85 * k, 1] },
    'eye.R': { s: [1 + 0.1 * k, 1 - 0.85 * k, 1] },
    mouth: { s: 1 - k },
    mouthOpen: { s: 0.7 * k },
    'upperArm.L': { r: [-30 * k, 0, 30 * k] },
    'upperArm.R': { r: [-30 * k, 0, -30 * k] },
    cape1: { r: [25 * k, 0, 0] },
  }));
}

function walk(t: number): Pose {
  const P = 0.9;
  const ph = osc(t, P);
  const step = Math.abs(osc(t, P, 0.25));
  return defaults(FACE, layer(REST, blinkPose(t, [0.5]), {
    hips: { p: [0, step * 0.012 - 0.006, 0], r: [2, ph * 6, osc(t, P, 0.25) * 2] },
    chest: { r: [0, -ph * 5, 0] },
    head: { r: [-step * 2, ph * 3, 0] },
    'upperLeg.L': { r: [-ph * 24, 0, 0] },
    'lowerLeg.L': { r: [Math.max(0, osc(t, P, 0.12)) * 34 + 4, 0, 0] },
    'upperLeg.R': { r: [ph * 24, 0, 0] },
    'lowerLeg.R': { r: [Math.max(0, -osc(t, P, 0.12)) * 34 + 4, 0, 0] },
    'upperArm.L': { r: [ph * 16, 0, 0] },
    'upperArm.R': { r: [-ph * 20, 0, 0] },
    cape1: { r: [-8 - step * 4, 0, 0] },
    cape2: { r: [-4 + osc(t, P / 2, 0.3) * 5, 0, 0] },
    hoodTip: { r: [-6 + step * 5, ph * 4, 0] },
  }));
}

/** Gameplay fire loop: quick draw, loose, nock the next arrow. */
function rapid(t: number): Pose {
  const base = poseKeys(t, [
    [0, aimPose(0.15)],
    [0.2, AIM, ease.out],
    [0.25, RELEASE, ease.out],
    [0.38, layer(aimPose(0.05), { chest: { r: [-3, 0, 0] } }), ease.out],
    [0.5, aimPose(0.15)],
  ]);
  const arrow = key(t, [[0, 1], [0.24, 1], [0.25, 0.001], [0.36, 0.001], [0.42, 1, ease.out]]);
  const wobble = t > 0.25 ? Math.sin((t - 0.25) * 80) * Math.exp(-(t - 0.25) * 16) * 0.018 : 0;
  return defaults(FACE, layer(base, { arrow: { s: arrow }, nock: { p: [0, 0, wobble] }, hips: { p: [0, -0.004, 0] } }));
}

/** Quick dash: crouch, spring forward low and stretched, land with a squash. The game moves the character. */
function dodge(t: number): Pose {
  const k = key(t, [[0, 0], [0.08, -1, ease.out], [0.18, 1, ease.out], [0.36, 1], [0.44, -0.6, ease.in], [0.55, 0, ease.out]]);
  const air = Math.max(0, k);
  const crouch = Math.max(0, -k);
  const stretch = 1 + 0.12 * air - 0.12 * crouch;
  return defaults(FACE, layer(REST, {
    root: { s: [1 / Math.sqrt(stretch), stretch, 1 / Math.sqrt(stretch)] },
    hips: { p: [0, 0.05 * air - 0.05 * crouch, 0], r: [26 * air + 10 * crouch, 0, 0] },
    chest: { r: [14 * air + 12 * crouch, 0, 0] },
    head: { r: [-26 * air, 0, 0] },
    'upperLeg.L': { r: [-50 * crouch + 30 * air, 0, 0] },
    'lowerLeg.L': { r: [70 * crouch + 50 * air, 0, 0] },
    'upperLeg.R': { r: [-50 * crouch - 45 * air, 0, 0] },
    'lowerLeg.R': { r: [70 * crouch + 20 * air, 0, 0] },
    'upperArm.L': { r: [50 * air, 0, 20 * air] },
    'upperArm.R': { r: [60 * air, 0, -25 * air] },
    bow: { aim: { fwd: [0, -0.4, 1], up: [0.2, 1, 0.4], w: air } },
    'brow.L': { p: [0, -0.006 * air, 0], r: [0, 0, -12 * air] },
    'brow.R': { p: [0, -0.006 * air, 0], r: [0, 0, 12 * air] },
    cape1: { r: [-50 * air, 0, 0] },
    cape2: { r: [-25 * air, 0, 0] },
    hoodTip: { r: [-45 * air, 0, 0] },
  }));
}

/** Knocked out: stagger back, plop down on the bottom, dizzy. Holds the last frame. */
function ko(t: number): Pose {
  const fall = key(t, [[0, 0], [0.12, 0.25, ease.out], [0.45, 1, ease.in], [0.55, 0.92, ease.out], [0.65, 1, ease.out], [1.2, 1]]);
  const wobble = t > 0.6 ? osc(t, 0.7) * 6 * Math.exp(-(t - 0.6) * 1.5) : 0;
  return defaults(FACE, layer(REST, {
    hips: { p: [0, -0.2 * fall, -0.05 * fall], r: [-28 * fall, 0, wobble] },
    chest: { r: [-10 * fall, 0, 0] },
    head: { r: [-12 * fall, 0, 14 * fall + wobble * 1.5] },
    'upperLeg.L': { r: [-85 * fall, 0, 18 * fall] },
    'upperLeg.R': { r: [-85 * fall, 0, -18 * fall] },
    'lowerLeg.L': { r: [20 * fall, 0, 0] },
    'lowerLeg.R': { r: [20 * fall, 0, 0] },
    'upperArm.L': { r: [-20 * fall, 0, 40 * fall] },
    'upperArm.R': { r: [-20 * fall, 0, -40 * fall] },
    'eye.L': { s: [1.1, 1 - 0.9 * fall, 1] },
    'eye.R': { s: [1.1, 1 - 0.9 * fall, 1] },
    mouth: { s: 1 - fall },
    mouthOpen: { s: 0.55 * fall },
    cape1: { r: [20 * fall, 0, 0] },
    hoodTip: { r: [25 * fall, 0, wobble] },
  }));
}

/** Calls a companion: crouch, then thrust the free hand to the sky. */
function cast(t: number): Pose {
  const up: Pose = {
    hips: { p: [0, 0.01, 0] },
    chest: { r: [-10, 0, 0] },
    head: { r: [-24, 0, 0] },
    'hand.R': { ik: { target: [-0.2, 0.74, 0.22], pole: [-0.45, 0.4, -0.1] } },
    'hand.L': { ik: { target: [0.3, 0.42, 0.1], pole: [0.4, 0.3, -0.2] } },
    bow: { aim: { fwd: [0.4, 0, 1], up: [0.1, 1, 0] } },
    mouth: { s: 0.001 },
    mouthOpen: { s: 1 },
    'brow.L': { p: [0, 0.01, 0] },
    'brow.R': { p: [0, 0.01, 0] },
  };
  const crouch: Pose = layer(REST, { hips: { p: [0, -0.03, 0] }, chest: { r: [14, 0, 0] }, head: { r: [10, 0, 0] }, 'upperArm.R': { r: [10, 0, 20] } });
  const base = poseKeys(t, [[0, REST], [0.15, crouch, ease.out], [0.3, up, ease.back], [0.75, up], [1.0, REST, ease.inOut]]);
  const jump = key(t, [[0, 0], [0.15, 0], [0.27, 0.05, ease.out], [0.4, 0, ease.in], [1, 0]]);
  return defaults(FACE, layer(base, {
    root: { p: [0, jump, 0] },
    cape1: { r: [key(t, [[0, 0], [0.3, 25], [0.5, -10], [0.8, 0]]), 0, 0] },
    hoodTip: { r: [key(t, [[0, 0], [0.3, 30], [0.5, -12], [0.8, 0]]), 0, 0] },
  }));
}

const CLIPS: ClipDef[] = [
  { name: 'idle', duration: 4.8, loop: true, pose: idle },
  { name: 'walk', duration: 0.9, loop: true, pose: walk },
  { name: 'run', duration: 0.5, loop: true, pose: run },
  { name: 'shoot', duration: 1.1, loop: false, pose: shoot },
  { name: 'rapid', duration: 0.5, loop: true, pose: rapid },
  { name: 'dodge', duration: 0.55, loop: false, pose: dodge },
  { name: 'hit', duration: 0.45, loop: false, pose: hit },
  { name: 'ko', duration: 1.2, loop: false, pose: ko },
  { name: 'cheer', duration: 1.4, loop: false, pose: cheer },
  { name: 'cast', duration: 1.0, loop: false, pose: cast },
];

export const hero: CharacterDef = { name: 'hero', bones: bones(), pieces: pieces(), clips: CLIPS };

function dist(a: Vec3, b: Vec3): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

function lerp(a: Vec3, b: Vec3, t: number): Vec3 {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}
