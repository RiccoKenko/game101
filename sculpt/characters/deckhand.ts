/**
 * Deckhand: the everyday sky pirate. Chubby, cheeky, red polka-dot bandana with flapping tails,
 * navy-and-white striped shirt, red sash, baggy pants, gold earring, cutlass. Steals crystals by hugging
 * them and waddling off as fast as his little legs allow.
 */
import { defaults, ease, key, layer, osc, poseKeys, type ClipDef, type Pose } from '../anim';
import type { BoneDef, CharacterDef, PieceDef } from '../character';
import { chibiBones, mirrorX, type BodyFrame } from '../rigs';
import {
  capsule, cylinder, ellipsoid, hex, mixRgb, painted, roundBox, roundCone, smoothstep, sphere, subtract, torus, union,
  type Shape, type Vec3,
} from '../sdf';

const C = {
  skin: hex('#f2c393'),
  stubble: hex('#c9a07e'),
  blush: hex('#ff9177'),
  nose: hex('#f0a982'),
  bandana: hex('#e2423b'),
  dot: hex('#fff4e6'),
  brow: hex('#3b2a22'),
  stripeA: hex('#2f4b8f'),
  stripeB: hex('#f7f4ee'),
  sash: hex('#f2b134'),
  sashDark: hex('#d38a1c'),
  pants: hex('#8a6240'),
  patch: hex('#6d4a2e'),
  boot: hex('#2f2a2e'),
  gold: hex('#f6c44f'),
  white: hex('#ffffff'),
  iris: hex('#5b3a26'),
  pupil: hex('#16121a'),
  mouth: hex('#5b2220'),
  tongue: hex('#ff7f86'),
  tooth: hex('#fffdf5'),
  steel: hex('#dfe5ee'),
  steelDark: hex('#9aa4b4'),
  grip: hex('#5a3a22'),
  crystal: hex('#6ff0ff'),
};

export const DECK_FRAME: BodyFrame = {
  hips: [0, 0.28, 0],
  spine: [0, 0.36, 0],
  chest: [0, 0.45, 0],
  neck: [0, 0.53, 0],
  head: [0, 0.57, 0],
  shoulder: [0.122, 0.495, 0],
  elbow: [0.172, 0.393, 0.006],
  wrist: [0.212, 0.305, 0.012],
  hand: [0.228, 0.272, 0.016],
  hip: [0.064, 0.27, 0],
  knee: [0.068, 0.158, 0.006],
  ankle: [0.07, 0.06, 0],
  toe: [0.072, 0.02, 0.078],
};
const F = DECK_FRAME;
const HEAD_C: Vec3 = [0, 0.745, 0.004];
const EYE: Vec3 = [0.07, 0.752, 0.183];
const MOUTH: Vec3 = [0, 0.652, 0.207];
const SWORD: Vec3 = [-F.hand[0] - 0.004, F.hand[1], F.hand[2] + 0.012];
const LOOT: Vec3 = [0, 0.42, 0.21];

function bones(): BoneDef[] {
  return [
    ...chibiBones(F),
    { name: 'eye.L', parent: 'head', head: EYE },
    { name: 'eye.R', parent: 'head', head: mirrorX(EYE) },
    { name: 'brow.L', parent: 'head', head: [0.072, 0.83, 0.19] },
    { name: 'brow.R', parent: 'head', head: [-0.072, 0.83, 0.19] },
    { name: 'mouth', parent: 'head', head: MOUTH },
    { name: 'mouthOpen', parent: 'head', head: [0, 0.65, 0.2] },
    { name: 'tail1', parent: 'head', head: [0, 0.82, -0.2] },
    { name: 'tail2', parent: 'tail1', head: [0.02, 0.74, -0.27], tail: [0.04, 0.66, -0.3] },
    { name: 'sword', parent: 'hand.R', head: SWORD, tail: [SWORD[0], SWORD[1] + 0.1, SWORD[2]] },
    { name: 'loot', parent: 'chest', head: LOOT },
  ];
}

function head(): Shape {
  const skull = ellipsoid(0.215, 0.198, 0.192).place(HEAD_C);
  const jowl = ellipsoid(0.17, 0.1, 0.13).place([0, 0.665, 0.07]);
  const cheek = sphere(0.075).place([0.1, 0.69, 0.1]);
  const face = union([skull, jowl, cheek, cheek.mirrored()], 0.08);
  const nose = sphere(0.04).place([0, 0.718, 0.2]).color(C.nose);
  const ear = ellipsoid(0.03, 0.042, 0.022).place([0.205, 0.74, 0.0], [0, -20, 0]);
  const shape = union([face, nose, ear, ear.mirrored()], 0.02);
  return painted(shape, (p, base) => {
    // Stubble on the jaw, rosy cheeks.
    let c = base;
    if (p[1] < 0.69 && p[2] > 0.02) c = mixRgb(c, C.stubble, 0.55 * smoothstep(0.69, 0.66, p[1]));
    const cheekD = Math.min(Math.hypot(p[0] - 0.118, p[1] - 0.7, p[2] - 0.15), Math.hypot(p[0] + 0.118, p[1] - 0.7, p[2] - 0.15));
    return mixRgb(c, C.blush, 0.45 * (1 - smoothstep(0.012, 0.045, cheekD)));
  }).color(C.skin);
}

function bandana(): Shape {
  // Hugs the skull: just a little bigger than the head, cut above the brows and lower at the back.
  const cap = ellipsoid(0.224, 0.208, 0.2).place([HEAD_C[0], HEAD_C[1] + 0.006, HEAD_C[2] - 0.002]);
  const cut = roundBox(0.4, 0.2, 0.4, 0.02).place([0, 0.57, 0.0], [-18, 0, 0]);
  const wrap = subtract(cap, cut, 0.03);
  const knot = sphere(0.042).place([0, 0.8, -0.205]);
  const tailA = roundCone([0, 0.8, -0.21], [0.03, 0.72, -0.28], 0.03, 0.022);
  const tailB = roundCone([0, 0.8, -0.21], [-0.035, 0.73, -0.26], 0.028, 0.02);
  const shape = union([wrap, knot, tailA, tailB], 0.02);
  return painted(shape, (p, base) => {
    // Polka dots on a 3D lattice: reads as printed cloth from any angle.
    const g = 0.055;
    const dx = p[0] / g - Math.round(p[0] / g);
    const dy = p[1] / g - Math.round(p[1] / g);
    const dz = p[2] / g - Math.round(p[2] / g);
    return Math.hypot(dx, dy, dz) < 0.22 ? C.dot : base;
  }).color(C.bandana).as('cloth');
}

function torso(): Shape {
  const belly = ellipsoid(0.125, 0.135, 0.115).place([0, 0.39, 0.012]);
  const chest = ellipsoid(0.112, 0.1, 0.095).place([0, 0.47, 0.0]);
  const body = union([belly, chest], 0.06);
  const shirt = painted(body, (p) => (Math.floor((p[1] - 0.3) / 0.036) % 2 === 0 ? C.stripeA : C.stripeB)).as('cloth');
  const sash = torus(0.118, 0.016).place([0, 0.318, 0.01], [6, 0, 0]).color(C.sash).as('cloth');
  const sashTail = roundCone([0.1, 0.31, 0.065], [0.12, 0.25, 0.085], 0.016, 0.012).color(C.sashDark).as('cloth');
  const neck = cylinder(0.05, 0.035, 0.012).place([0, 0.54, 0]).color(C.skin);
  return union([shirt, sash, sashTail, neck], 0.01);
}

function arm(side: 1 | -1): Shape {
  const s = (v: Vec3): Vec3 => [v[0] * side, v[1], v[2]];
  const sleeve = union([ellipsoid(0.052, 0.05, 0.05).place(s([0.125, 0.48, 0])), roundCone(s(F.shoulder), s([0.155, 0.43, 0.004]), 0.046, 0.044)], 0.02);
  const sleevePainted = painted(sleeve, (p) => (Math.floor((p[1] - 0.3) / 0.036) % 2 === 0 ? C.stripeA : C.stripeB)).as('cloth');
  const upper = roundCone(s([0.155, 0.43, 0.004]), s(F.elbow), 0.036, 0.034);
  const fore = roundCone(s(F.elbow), s(F.wrist), 0.035, 0.032);
  const fist = ellipsoid(0.04, 0.041, 0.038).place(s(F.hand), [0, 0, 25 * side]);
  const thumb = ellipsoid(0.015, 0.022, 0.015).place(s([F.hand[0] - 0.012, F.hand[1] + 0.014, F.hand[2] + 0.032]), [20, 0, 0]);
  const skin = union([upper, fore, fist, thumb], 0.02).color(C.skin);
  return union([sleevePainted, skin], 0.008);
}

function leg(side: 1 | -1): Shape {
  const s = (v: Vec3): Vec3 => [v[0] * side, v[1], v[2]];
  const baggy = roundCone(s([F.hip[0], F.hip[1] + 0.01, 0]), s([F.knee[0] + 0.006, F.knee[1] - 0.012, F.knee[2]]), 0.066, 0.06);
  const pants = painted(baggy, (p, base) => {
    // A patch on the knee.
    const d = Math.hypot(p[0] - 0.07 * side, p[1] - 0.18, p[2] - 0.055);
    return d < 0.022 ? C.patch : base;
  }).color(C.pants).as('cloth');
  const shin = roundCone(s(F.knee), s([F.ankle[0], F.ankle[1] + 0.03, 0]), 0.036, 0.034).color(C.skin);
  const shaft = roundCone(s([F.ankle[0], 0.1, 0]), s([F.ankle[0], 0.035, 0.006]), 0.045, 0.05);
  const foot = ellipsoid(0.052, 0.034, 0.074).place(s([0.072, 0.033, 0.034]));
  const boot = union([shaft, foot], 0.03).color(C.boot);
  const buckle = roundBox(0.016, 0.012, 0.005, 0.003).place(s([F.ankle[0], 0.08, 0.05])).color(C.gold).as('metal');
  return union([pants, shin, boot, buckle], 0.012);
}

function eye(): Shape {
  const white = ellipsoid(0.035, 0.042, 0.02).color(C.white).as('gloss');
  const iris = ellipsoid(0.024, 0.03, 0.01).place([0.002, -0.004, 0.014]).color(C.iris).as('gloss');
  const pupil = ellipsoid(0.014, 0.018, 0.007).place([0.002, -0.004, 0.02]).color(C.pupil).as('gloss');
  const glint = sphere(0.008).place([0.011, 0.012, 0.023]).color(C.white).as('glow');
  return union([white, iris, pupil, glint]);
}

function placedEye(side: 1 | -1): Shape {
  return eye().place([EYE[0] * side, EYE[1], EYE[2]], [0, 16 * side, 0]);
}

function brow(side: 1 | -1): Shape {
  // Bushy and a bit grumpy: thicker towards the nose.
  return roundCone([-0.03, 0.006 * side, 0], [0.03, -0.006 * side, 0], 0.011, 0.014)
    .place([0.072 * side, 0.83, 0.19], [0, 14 * side, -14 * side])
    .color(C.brow);
}

function grin(): Shape {
  const R = 0.04;
  const arc = torus(R, 0.008, 120).place([0, 0, 0], [90, 0, 0]).place([MOUTH[0], MOUTH[1] + R, MOUTH[2]], [0, 0, -90]).color(C.mouth);
  const tooth = roundBox(0.009, 0.01, 0.004, 0.003).place([0.012, MOUTH[1] + 0.008, MOUTH[2] + 0.004]).color(C.tooth);
  return union([arc, tooth]);
}

function mouthOpen(): Shape {
  const m = ellipsoid(0.038, 0.03, 0.014).place([0, 0.65, 0.2]);
  const painted_ = painted(m, (p, base) => (p[1] < 0.635 ? C.tongue : p[1] > 0.668 ? C.tooth : base)).color(C.mouth);
  return painted_;
}

function earring(): Shape {
  return torus(0.017, 0.0045).place([0, 0, 0], [90, 0, 0]).place([0.215, 0.69, 0.0], [0, 70, 0]).color(C.gold).as('metal');
}

function cutlass(): Shape {
  // Curved blade pointing up from the fist, gold guard, wrapped grip.
  const g = SWORD;
  const grip = capsule([g[0], g[1] - 0.03, g[2]], [g[0], g[1] + 0.03, g[2]], 0.011).color(C.grip);
  const guard = roundBox(0.012, 0.008, 0.036, 0.006).place([g[0], g[1] + 0.034, g[2] + 0.012]).color(C.gold).as('metal');
  // A broad curved cutlass blade: a big flat ellipse with a bite taken out of its back edge.
  const blade = subtract(
    ellipsoid(0.009, 0.17, 0.058).place([g[0], g[1] + 0.2, g[2] + 0.024], [-10, 0, 0]),
    ellipsoid(0.03, 0.19, 0.05).place([g[0], g[1] + 0.235, g[2] - 0.04], [-10, 0, 0]),
    0.004,
  );
  const bladeP = painted(blade, (p, base) => mixRgb(base, C.steelDark, smoothstep(g[2] + 0.03, g[2] - 0.01, p[2]))).color(C.steel).as('metal');
  const pommel = sphere(0.014).place([g[0], g[1] - 0.04, g[2]]).color(C.gold).as('metal');
  return union([grip, guard, bladeP, pommel], 0.003);
}

function loot(): Shape {
  // A big Sky Crystal, hugged to the belly while running away.
  const core = roundCone([LOOT[0], LOOT[1] - 0.06, LOOT[2]], [LOOT[0], LOOT[1] + 0.07, LOOT[2]], 0.05, 0.012);
  const side = roundCone([LOOT[0] + 0.03, LOOT[1] - 0.05, LOOT[2] + 0.01], [LOOT[0] + 0.07, LOOT[1] + 0.02, LOOT[2] + 0.02], 0.026, 0.006);
  const shape = union([core, side, side.mirrored()], 0.01);
  return painted(shape, (p, base) => mixRgb(base, C.white, 0.5 * smoothstep(LOOT[1], LOOT[1] + 0.06, p[1]))).color(C.crystal).as('glow');
}

function pieces(): PieceDef[] {
  const armSkin = (s: 'L' | 'R') => ['chest', `upperArm.${s}`, `lowerArm.${s}`, `hand.${s}`];
  const legSkin = (s: 'L' | 'R') => ['hips', `upperLeg.${s}`, `lowerLeg.${s}`, `foot.${s}`];
  return [
    { name: 'head', shape: head(), cell: 0.0055, maxTris: 2600, bone: 'head' },
    { name: 'bandana', shape: bandana(), cell: 0.0042, maxTris: 3000, skin: ['head', 'tail1', 'tail2'], sharpness: 5 },
    { name: 'eye.L', shape: placedEye(1), cell: 0.002, maxTris: 700, bone: 'eye.L' },
    { name: 'eye.R', shape: placedEye(-1), cell: 0.002, maxTris: 700, bone: 'eye.R' },
    { name: 'brow.L', shape: brow(1), cell: 0.0025, maxTris: 160, bone: 'brow.L' },
    { name: 'brow.R', shape: brow(-1), cell: 0.0025, maxTris: 160, bone: 'brow.R' },
    { name: 'mouth', shape: grin(), cell: 0.0022, maxTris: 300, bone: 'mouth' },
    { name: 'mouthOpen', shape: mouthOpen(), cell: 0.0025, maxTris: 300, bone: 'mouthOpen' },
    { name: 'earring', shape: earring(), cell: 0.0018, maxTris: 200, bone: 'head' },
    { name: 'torso', shape: torso(), cell: 0.0045, maxTris: 3000, skin: ['hips', 'spine', 'chest', 'neck'] },
    { name: 'arm.L', shape: arm(1), cell: 0.0045, maxTris: 1400, skin: armSkin('L') },
    { name: 'arm.R', shape: arm(-1), cell: 0.0045, maxTris: 1400, skin: armSkin('R') },
    { name: 'leg.L', shape: leg(1), cell: 0.0048, maxTris: 1300, skin: legSkin('L') },
    { name: 'leg.R', shape: leg(-1), cell: 0.0048, maxTris: 1300, skin: legSkin('R') },
    { name: 'cutlass', shape: cutlass(), cell: 0.0025, maxTris: 900, bone: 'sword' },
    { name: 'loot', shape: loot(), cell: 0.0035, maxTris: 600, bone: 'loot' },
  ];
}

// ---------- animation

const FACE: Pose = { mouthOpen: { s: 0.001 }, loot: { s: 0.001 } };

const REST: Pose = {
  'upperArm.L': { r: [6, 0, 8] },
  'lowerArm.L': { r: [-16, 0, 0] },
  'upperArm.R': { r: [-10, 0, -4] },
  'lowerArm.R': { r: [-40, 0, 0] },
  sword: { r: [30, 0, 0] },
};

function blink(t: number, at: number[]): Pose {
  let y = 1;
  for (const b of at) y = Math.min(y, key(t, [[b - 0.07, 1], [b, 0.08, ease.in], [b + 0.09, 1, ease.out]]));
  return { 'eye.L': { s: [1, y, 1] }, 'eye.R': { s: [1, y, 1] } };
}

const tails = (t: number, amp: number, lift = 0): Pose => ({
  tail1: { r: [lift + osc(t, 0.6) * amp, osc(t, 1.2) * amp, 0] },
  tail2: { r: [lift * 0.6 + osc(t, 0.6, 0.15) * amp * 1.4, osc(t, 1.2, 0.2) * amp, 0] },
});

function idle(t: number): Pose {
  const breath = osc(t, 2);
  return defaults(FACE, layer(REST, blink(t, [0.9, 3.1]), tails(t, 4), {
    hips: { p: [0, breath * 0.004, 0], r: [0, osc(t, 4) * 4, 0] },
    spine: { s: [1 + breath * 0.02, 1, 1 + breath * 0.02] },
    chest: { r: [breath * 2, 0, 0] },
    head: { r: [-breath * 2, key(t, [[0, 0], [1.2, 0], [1.5, -20], [2.4, -20], [2.7, 0], [4, 0]]), osc(t, 4, 0.2) * 3] },
    // Taps the cutlass on his shoulder.
    'lowerArm.R': { r: [Math.max(0, osc(t, 1, 0.1)) * -10, 0, 0] },
  }));
}

function walk(t: number): Pose {
  const P = 0.7;
  const ph = osc(t, P);
  const step = Math.abs(osc(t, P, 0.25));
  return defaults(FACE, layer(REST, blink(t, [0.4]), tails(t, 8, -10), {
    // A pirate swagger: rolling hips, rocking shoulders.
    hips: { p: [0, step * 0.016 - 0.006, 0], r: [2, ph * 8, ph * 7] },
    chest: { r: [0, -ph * 8, -ph * 6] },
    head: { r: [-step * 3, ph * 4, ph * 4] },
    'upperLeg.L': { r: [-ph * 28, 0, 6] },
    'lowerLeg.L': { r: [Math.max(0, osc(t, P, 0.12)) * 36 + 4, 0, 0] },
    'upperLeg.R': { r: [ph * 28, 0, -6] },
    'lowerLeg.R': { r: [Math.max(0, -osc(t, P, 0.12)) * 36 + 4, 0, 0] },
    'upperArm.L': { r: [ph * 26, 0, 6] },
    'upperArm.R': { r: [-ph * 18, 0, 0] },
  }));
}

function run(t: number): Pose {
  const P = 0.42;
  const ph = osc(t, P);
  const step = Math.abs(osc(t, P, 0.25));
  return defaults(FACE, layer(blink(t, [0.2]), tails(t, 10, -35), {
    hips: { p: [0, step * 0.034 - 0.02, 0], r: [12, ph * 10, ph * 4] },
    chest: { r: [6, -ph * 10, 0] },
    head: { r: [-16 + step * 6, ph * 6, 0] },
    'upperLeg.L': { r: [-ph * 48 - 6, 0, 0] },
    'lowerLeg.L': { r: [Math.max(0, osc(t, P, 0.15)) * 76 + 6, 0, 0] },
    'upperLeg.R': { r: [ph * 48 - 6, 0, 0] },
    'lowerLeg.R': { r: [Math.max(0, -osc(t, P, 0.15)) * 76 + 6, 0, 0] },
    // Waving the cutlass over his head like he means it.
    'upperArm.R': { r: [-120 + ph * 14, 0, -20] },
    'lowerArm.R': { r: [-30, 0, 0] },
    sword: { r: [osc(t, P / 2) * 25, 0, 0] },
    'upperArm.L': { r: [ph * 50, 0, 14] },
    'lowerArm.L': { r: [-50, 0, 0] },
    mouth: { s: 0.001 },
    mouthOpen: { s: 0.8 + step * 0.2 },
    'brow.L': { p: [0, -0.006, 0], r: [0, 0, -10] },
    'brow.R': { p: [0, -0.006, 0], r: [0, 0, 10] },
  }));
}

/** Running away with a crystal hugged to the belly, grinning. */
function carry(t: number): Pose {
  const P = 0.38;
  const ph = osc(t, P);
  const step = Math.abs(osc(t, P, 0.25));
  return defaults(FACE, layer(tails(t, 10, -35), {
    loot: { s: 1, r: [0, 0, ph * 8] },
    hips: { p: [0, step * 0.03 - 0.016, 0], r: [8, ph * 9, ph * 5] },
    chest: { r: [-4, -ph * 6, 0] },
    head: { r: [-10 + step * 5, ph * 8, ph * 5] },
    'upperLeg.L': { r: [-ph * 46 - 6, 0, 0] },
    'lowerLeg.L': { r: [Math.max(0, osc(t, P, 0.15)) * 74 + 6, 0, 0] },
    'upperLeg.R': { r: [ph * 46 - 6, 0, 0] },
    'lowerLeg.R': { r: [Math.max(0, -osc(t, P, 0.15)) * 74 + 6, 0, 0] },
    'hand.L': { ik: { target: [0.075, 0.43, 0.2], pole: [0.35, 0.3, -0.1] } },
    'hand.R': { ik: { target: [-0.075, 0.43, 0.2], pole: [-0.35, 0.3, -0.1] } },
    sword: { r: [70, 0, -40] },
    'eye.L': { s: [1.1, 0.7, 1] },
    'eye.R': { s: [1.1, 0.7, 1] },
    'brow.L': { p: [0, 0.01, 0], r: [0, 0, 12] },
    'brow.R': { p: [0, 0.01, 0], r: [0, 0, -12] },
  }));
}

function hit(t: number): Pose {
  const k = key(t, [[0, 0], [0.05, 1, ease.out], [0.4, 0, ease.inOut]]);
  return defaults(FACE, layer(REST, tails(t, 4, 20 * k), {
    hips: { p: [0, -0.01 * k, -0.03 * k], r: [-12 * k, 0, 6 * k] },
    chest: { r: [-18 * k, 0, 0], s: [1 + 0.06 * k, 1 - 0.06 * k, 1 + 0.06 * k] },
    head: { r: [-20 * k, 10 * k, -10 * k] },
    'eye.L': { s: [1.2, 1 - 0.88 * k, 1] },
    'eye.R': { s: [1.2, 1 - 0.88 * k, 1] },
    'brow.L': { p: [0, 0.012 * k, 0] },
    'brow.R': { p: [0, 0.012 * k, 0] },
    mouth: { s: 1 - k },
    mouthOpen: { s: 0.7 * k },
    'upperArm.L': { r: [-40 * k, 0, 40 * k] },
    'upperArm.R': { r: [-20 * k, 0, -40 * k] },
  }));
}

/** Cartoon defeat: spin, flop on his back, legs kick once, then lie still. Holds the last frame. */
function die(t: number): Pose {
  const spin = key(t, [[0, 0], [0.4, 220, ease.out], [1.4, 220]]);
  const fall = key(t, [[0, 0], [0.15, 0.1, ease.out], [0.45, 1, ease.in], [0.52, 0.94, ease.out], [0.6, 1, ease.out], [1.4, 1]]);
  const kick = key(t, [[0, 0], [0.6, 0], [0.75, 1, ease.out], [0.95, 0, ease.inOut], [1.4, 0]]);
  return defaults(FACE, layer(REST, tails(t, 3), {
    hips: { p: [0, -0.2 * fall, -0.08 * fall], r: [-80 * fall, spin, 0] },
    head: { r: [-10 * fall, 0, 18 * fall] },
    'upperLeg.L': { r: [-50 * fall - 50 * kick, 0, 10] },
    'upperLeg.R': { r: [-40 * fall - 30 * kick, 0, -10] },
    'lowerLeg.L': { r: [30 * fall, 0, 0] },
    'lowerLeg.R': { r: [20 * fall, 0, 0] },
    'upperArm.L': { r: [-60 * fall, 0, 70 * fall] },
    'upperArm.R': { r: [-60 * fall, 0, -70 * fall] },
    'eye.L': { s: [1.2, 1 - 0.9 * fall, 1] },
    'eye.R': { s: [1.2, 1 - 0.9 * fall, 1] },
    mouth: { s: 1 - fall },
    mouthOpen: { s: 0.5 * fall },
  }));
}

/** "Nyah nyah!": wiggles, waves the cutlass, sticks his tongue out. */
function taunt(t: number): Pose {
  const w = osc(t, 0.3);
  const on = key(t, [[0, 0], [0.15, 1, ease.out], [1.05, 1], [1.2, 0]]);
  return defaults(FACE, layer(REST, tails(t, 10), {
    hips: { r: [0, 0, w * 12 * on], p: [0, Math.abs(w) * 0.01 * on, 0] },
    chest: { r: [0, 0, -w * 8 * on] },
    head: { r: [-6 * on, w * 10 * on, -w * 12 * on] },
    'upperArm.R': { r: [-110 * on, 0, -30 * on] },
    'lowerArm.R': { r: [-20 + w * 25 * on, 0, 0] },
    'upperArm.L': { r: [-50 * on, 30 * on, 40 * on] },
    'lowerArm.L': { r: [-90 * on, 0, 0] },
    mouth: { s: 1 - on },
    mouthOpen: { s: on },
    'eye.L': { s: [1, 1 - 0.75 * on, 1] },
  }));
}

function cheer(t: number): Pose {
  const jump = key(t, [[0, 0], [0.12, -0.03, ease.out], [0.32, 0.12, ease.out], [0.52, 0, ease.in], [0.6, -0.02], [0.72, 0], [1.2, 0]]);
  const up: Pose = layer(REST, {
    'upperArm.R': { r: [-140, 0, -30] },
    'lowerArm.R': { r: [-10, 0, 0] },
    'upperArm.L': { r: [-130, 0, 30] },
    mouth: { s: 0.001 },
    mouthOpen: { s: 1.1 },
    'brow.L': { p: [0, 0.012, 0] },
    'brow.R': { p: [0, 0.012, 0] },
  });
  const arms = poseKeys(t, [[0, REST], [0.16, REST], [0.32, up, ease.back], [0.95, up], [1.2, REST]]);
  return defaults(FACE, layer(arms, tails(t, 8, key(t, [[0, 0], [0.32, 30], [0.6, -20], [1, 0]])), { root: { p: [0, Math.max(0, jump), 0] } }));
}

const CLIPS: ClipDef[] = [
  { name: 'idle', duration: 4, loop: true, pose: idle },
  { name: 'walk', duration: 0.7, loop: true, pose: walk },
  { name: 'run', duration: 0.42, loop: true, pose: run },
  { name: 'carry', duration: 0.38, loop: true, pose: carry },
  { name: 'hit', duration: 0.4, loop: false, pose: hit },
  { name: 'die', duration: 1.4, loop: false, pose: die },
  { name: 'taunt', duration: 1.2, loop: false, pose: taunt },
  { name: 'cheer', duration: 1.2, loop: false, pose: cheer },
];

export const deckhand: CharacterDef = { name: 'deckhand', bones: bones(), pieces: pieces(), clips: CLIPS };
