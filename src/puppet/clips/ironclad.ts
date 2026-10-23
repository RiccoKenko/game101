/**
 * The Ironclad's moves: a walking boiler in a diving helmet. Slow, proud and stubborn, never scary.
 * Rotations in degrees (counter-clockwise), offsets in rig pixels (y-up).
 * Facing right: +r swings a hanging arm or leg forward; a negative torso r leans forward.
 * Near side = the character's right (.r, holds the wrench), far side = left (.l, holds the hatch shield).
 */
import { ease, key, osc } from '../../anim/curves';
import { layer, type Clip2D, type Pose2D } from '../pose';
import type { Vec2 } from '../rig';

/** The rig's ground point (art/rigs/ironclad.json). */
const GROUND: Vec2 = [509, 1277];
/** A point on the rig-pose picture (pixels, y-down) in character space. */
const at = (x: number, y: number): Vec2 => [x - GROUND[0], GROUND[1] - y];

/** The eyes in the helmet's porthole are his whole face. */
const FACE = {
  calm: { eyes: 'eyes-calm' },
  angry: { eyes: 'eyes-angry' },
  greedy: { eyes: 'eyes-greedy' },
  smug: { eyes: 'eyes-smug' },
  hurt: { eyes: 'eyes-hurt' },
  ko: { eyes: 'eyes-ko' },
  surprised: { eyes: 'eyes-surprised' },
  happy: { eyes: 'eyes-closed' },
};

/**
 * The wrench's direction in the rig pose (grip to head, degrees y-up). `wrench(d)` is the weapon bone's world
 * angle that lays it along direction d, head first.
 */
const WRENCH_REST = -75;
const wrench = (d: number) => d - WRENCH_REST;

/** Wrench in the near fist, shield in the far one, chest out. */
export const STAND: Pose2D = {
  slots: { 'hand.r': 'hand-r-grip', 'hand.l': 'hand-l-grip', weapon: 'wrench', shield: 'shield', loot: 'none', ...FACE.calm },
  bones: {
    torso: { r: 2 },
    head: { r: 2 },
    // The hatch stays upright whatever the far arm does.
    shield: { wr: 0 },
  },
};

/** Slow boiler breathing: the chest swells, the helmet bobs a beat later. */
const breathe = (t: number, amount = 1, sink = true): Pose2D => ({
  bones: {
    hips: { y: sink ? -4 * amount * (1 + osc(t, 3)) : 0 },
    torso: { sy: 1 + 0.02 * amount * osc(t, 3, 0.1), sx: 1 - 0.01 * amount * osc(t, 3, 0.1), r: 1 * amount * osc(t, 6) },
    head: { r: 2 * amount * osc(t, 6, 0.2), y: 3 * amount * osc(t, 3, 0.25) },
    'upperArm.r': { r: 1.5 * amount * osc(t, 3, 0.3) },
    'upperArm.l': { r: -1.5 * amount * osc(t, 3, 0.35) },
  },
});

/** The wrench resting on his near shoulder like a rifle, head behind the helmet. */
const shouldered = (t: number): Pose2D => ({
  bones: { weapon: { wr: wrench(114 + 1.5 * osc(t, 3, 0.3)) }, 'hand.r': { r: -40 } },
  ik: { 'hand.r': { target: at(430 + 4 * osc(t, 3, 0.3), 520 - 5 * osc(t, 3, 0.3)), bend: 1 } },
});

const idle: Clip2D = {
  name: 'idle',
  duration: 6,
  loop: true,
  pose: (t) => layer(STAND, breathe(t), shouldered(t), { bones: { 'upperArm.l': { r: 4 } } }),
};

/** The legs on the rig pose (character space): hip and knee joints, and heel, middle and toe of each boot's sole. */
const LEGS = {
  r: { hip: at(366, 844), knee: at(342, 1022), sole: [at(240, 1268), at(373, 1277), at(520, 1266)] },
  l: { hip: at(664, 859), knee: at(685, 1028), sole: [at(574, 1250), at(718, 1260), at(879, 1253)] },
};
const DEG = Math.PI / 180;
const turn = (p: Vec2, c: Vec2, deg: number): Vec2 => {
  const [s, k] = [Math.sin(deg * DEG), Math.cos(deg * DEG)];
  return [c[0] + (p[0] - c[0]) * k - (p[1] - c[1]) * s, c[1] + (p[0] - c[0]) * s + (p[1] - c[1]) * k];
};
/** How far a boot's lowest point sits above where it stands on the rig pose, with the thigh and shin turned. */
function bootHeight(leg: (typeof LEGS)['r'], thigh: number, shin: number): number {
  const low = (pts: Vec2[]) => Math.min(...pts.map((p) => p[1]));
  return low(leg.sole.map((p) => turn(turn(p, leg.knee, shin), leg.hip, thigh))) - low(leg.sole);
}

/**
 * One foot's part in a step cycle (`p` 0..1). The first half the boot is planted and travels back at a steady
 * speed, so it does not skate. The second half it hoists up, swings forward and comes straight down: a stomp.
 * `swing` is -1 (back) .. 1 (front), `lift` 0..1, `landed` 0..1 through the moment after the boot hits.
 */
function foot(p: number): { swing: number; lift: number; landed: number } {
  const q = ((p % 1) + 1) % 1;
  if (q < 0.5) return { swing: 1 - 4 * q, lift: 0, landed: q < 0.16 ? Math.sin((Math.PI * q) / 0.16) : 0 };
  const u = (q - 0.5) / 0.5;
  const lift = u < 0.62 ? Math.sin(((Math.PI / 2) * u) / 0.62) : Math.cos(((Math.PI / 2) * (u - 0.62)) / 0.38) ** 1.6;
  return { swing: -1 + 2 * ease.inOut(Math.min(1, u / 0.78)), lift, landed: 0 };
}

/**
 * The stomp: near-stiff legs swinging from the hips (heel down in front, toe down behind), the knee hoisted on
 * each swing, and a thud through the body as each boot lands. The hips ride exactly as high as the planted boot
 * allows, so neither boot sinks into the ground. `p` is 0..1 through the cycle (two steps), `stride` the leg
 * swing in degrees, `knee` how high the swinging boot lifts.
 */
function stomp(p: number, stride: number, knee = 1): Pose2D {
  const legs = { r: foot(p), l: foot(p + 0.5) };
  const angles = { r: [0, 0], l: [0, 0] };
  for (const side of ['r', 'l'] as const) {
    const f = legs[side];
    // The boot tilts heel-down in front and only a little toe-down behind; the knee gives a little as the boot
    // takes the weight, and hoists up on the swing.
    const tilt = stride * f.swing * (f.swing > 0 ? 0.5 : 0.25) + 12 * knee * f.lift - 4 * f.landed;
    const thigh = stride * f.swing + 20 * knee * f.lift + 4 * f.landed;
    angles[side] = [thigh, tilt - thigh];
  }
  // The hips ride as high as the planted boot allows.
  const planted = legs.r.lift === 0 && (legs.l.lift > 0 || legs.r.swing > legs.l.swing) ? 'r' : 'l';
  const swinging = planted === 'r' ? 'l' : 'r';
  const y = -bootHeight(LEGS[planted], angles[planted][0], angles[planted][1]);
  // The swinging boot is hoisted clear of the ground: the whole leg rides up under the skirt.
  const clear = 50 * knee * legs[swinging].lift;
  const hoist = Math.max(0, clear - bootHeight(LEGS[swinging], angles[swinging][0], angles[swinging][1]) - y);
  const thud = Math.max(legs.r.landed, legs.l.landed);
  const rock = Math.sin(2 * Math.PI * p);
  return {
    bones: {
      hips: { y },
      torso: { r: 2 + 2.5 * thud - 1.5 * rock, sy: 1 - 0.03 * thud, sx: 1 + 0.015 * thud },
      head: { r: 2 * rock - 3 * thud, y: -8 * thud },
      'thigh.r': { r: angles.r[0], y: swinging === 'r' ? hoist : 0 },
      'shin.r': { r: angles.r[1] },
      'thigh.l': { r: angles.l[0], y: swinging === 'l' ? hoist : 0 },
      'shin.l': { r: angles.l[1] },
    },
  };
}

/** Arms swinging against the legs: the wrench low in the near fist, head forward; the shield kept upright. */
function marchArms(p: number, size: number): Pose2D {
  const s = Math.sin(2 * Math.PI * (p + 0.125));
  return {
    bones: {
      'upperArm.r': { r: 14 - 16 * size * s },
      'forearm.r': { r: 22 + 6 * size * s },
      'hand.r': { r: 10 },
      weapon: { wr: wrench(-8 - 10 * size * s) },
      'upperArm.l': { r: 2 + 9 * size * s },
      'forearm.l': { r: 8 + 4 * size * s },
      shield: { wr: 2 * s },
    },
  };
}

/** Cycle length and leg swing, chosen so the planted boot keeps pace with the ground at 36 px/s (size 0.083). */
const WALK = { duration: 1.1, stride: 25 };
const walk: Clip2D = {
  name: 'walk',
  duration: WALK.duration,
  loop: true,
  pose: (t) => {
    const p = t / WALK.duration;
    return layer(STAND, stomp(p, WALK.stride), marchArms(p, 1), breathe(t, 0.3, false));
  },
};

/** Lumbering forward behind the raised hatch, wrench cocked back: a boiler with a grudge. */
const CHARGE = { duration: 0.8, stride: 20 };
const charge: Clip2D = {
  name: 'charge',
  duration: CHARGE.duration,
  loop: true,
  pose: (t) => {
    const p = t / CHARGE.duration;
    return layer(STAND, stomp(p, CHARGE.stride, 0.8), {
      slots: FACE.angry,
      bones: {
        hips: { y: -26 },
        torso: { r: -14 },
        head: { r: -4 },
        'upperArm.l': { r: 48 },
        'forearm.l': { r: 30 },
        shield: { wr: -6, sx: 1.6 },
        'upperArm.r': { r: -50 + 4 * osc(t, CHARGE.duration / 2) },
        'forearm.r': { r: 70 },
        weapon: { wr: wrench(160) },
      },
      z: { 'upper-arm-l': 46, 'forearm-l': 47, 'hand-l-grip': 48, 'hand-l-open': 48, shield: 49 },
    });
  },
};

/** Plodding off with the crystal clutched under the near arm, eyes sparkling; the wrench is hung up. */
const CARRY = { duration: 1.2, stride: 14.5 };
const carry: Clip2D = {
  name: 'carry',
  duration: CARRY.duration,
  loop: true,
  pose: (t) => {
    const p = t / CARRY.duration;
    const bob = Math.sin(4 * Math.PI * p);
    return layer(STAND, stomp(p, CARRY.stride, 0.7), marchArms(p, 0.5), {
      slots: { ...(Math.sin(2 * Math.PI * t / 2.4) > -0.6 ? FACE.greedy : FACE.calm), weapon: 'none', loot: 'crystal', 'hand.r': 'hand-r-open' },
      bones: { torso: { r: -3 }, 'hand.r': { wr: 30 } },
      ik: { 'hand.r': { target: at(420, 640 - 6 * bob), bend: 1 } },
    });
  },
};

/** Rocks back on his heels from a hit, eyes squeezed, and plants himself again with a huff. */
const hit: Clip2D = {
  name: 'hit',
  duration: 0.4,
  loop: false,
  pose: (t) => {
    const k = key(t, [[0, 0], [0.06, 1, ease.out], [0.26, -0.18, ease.inOut], [0.4, 0, ease.inOut]]);
    return layer(STAND, shouldered(0), {
      slots: t < 0.28 ? FACE.hurt : FACE.angry,
      bones: {
        hips: { x: -14 * k, y: -4 * Math.abs(k), r: 4 * k, sx: 1 + 0.04 * k, sy: 1 - 0.04 * k },
        torso: { r: 9 * k },
        head: { r: 12 * k, y: 6 * k },
        'upperArm.l': { r: 18 * k },
        'forearm.l': { r: 10 * k },
        'thigh.r': { r: -6 * k },
        'thigh.l': { r: -6 * k },
        shield: { wr: 6 * k },
      },
    });
  },
};

/** Knocked out: a wobble, then he topples onto his back like a turtle, boots and wrench in the air. */
const ko: Clip2D = {
  name: 'ko',
  duration: 1.0,
  loop: false,
  pose: (t) => {
    const fall = key(t, [[0, 0], [0.14, -0.06, ease.out], [0.5, 1, ease.in], [0.62, 0.9, ease.out], [0.74, 1, ease.in]]);
    const kick = key(t, [[0.45, 0], [0.6, 1, ease.out], [0.8, 0.75], [1, 0.85]]);
    return layer(STAND, {
      slots: { ...(t < 0.14 ? FACE.hurt : FACE.ko) },
      bones: {
        hips: { r: 86 * fall, y: -300 * fall, x: 120 * fall },
        torso: { r: 4 * fall },
        head: { r: 10 * fall },
        'thigh.r': { r: 30 * kick },
        'shin.r': { r: -20 * kick },
        'thigh.l': { r: 18 * kick },
        'shin.l': { r: -10 * kick },
        'upperArm.r': { r: 120 * kick },
        'forearm.r': { r: 20 * kick },
        weapon: { wr: wrench(60) },
        'upperArm.l': { r: 40 * fall },
        shield: { wr: 0, ww: 1 - fall },
      },
    });
  },
};

/** Raises the hatch and bangs the wrench on it, BONG BONG BONG: "Come and get it!" */
const taunt: Clip2D = {
  name: 'taunt',
  duration: 1.4,
  loop: false,
  pose: (t) => {
    const up = key(t, [[0, 0], [0.22, 1, ease.back], [1.15, 1], [1.4, 0, ease.inOut]]);
    // Three bangs: the wrench winds up, then slams onto the shield.
    const beat = Math.max(0, Math.min(1, (t - 0.25) / 0.85));
    const swing = beat > 0 && beat < 1 ? Math.abs(Math.sin(Math.PI * 3 * beat)) ** 0.6 : 0;
    const hit = beat > 0 && beat < 1 && swing < 0.25 ? 1 - swing / 0.25 : 0;
    return layer(STAND, breathe(t, 0.4), {
      slots: up > 0.5 ? FACE.smug : FACE.calm,
      bones: {
        hips: { y: -8 * up - 4 * hit },
        torso: { r: 4 * up + 2 * hit },
        head: { r: 5 * up - 3 * hit },
        'upperArm.l': { r: 40 * up },
        'forearm.l': { r: 40 * up },
        shield: { wr: 0, sx: 1 + 0.5 * up },
        weapon: { wr: wrench(40 + 70 * swing) },
      },
      ik: { 'hand.r': { target: at(330 + 60 * (1 - swing), 560 - 60 * swing), bend: 1, w: up } },
    });
  },
};

/** A heavy little hop with the wrench thrust skyward and his eyes sparkling. */
const cheer: Clip2D = {
  name: 'cheer',
  duration: 1.2,
  loop: false,
  pose: (t) => {
    const squat = key(t, [[0, 0], [0.12, 1, ease.out], [0.24, 0, ease.in], [0.62, 0], [0.7, 0.8, ease.out], [0.88, 0, ease.out]]);
    const air = key(t, [[0.2, 0], [0.42, 1, ease.out], [0.64, 0, ease.in]]);
    const arm = key(t, [[0.08, 0], [0.3, 1, ease.back], [1.0, 1], [1.2, 0, ease.inOut]]);
    const shake = osc(t, 0.18) * arm * (t > 0.7 ? 1 : 0);
    return layer(STAND, {
      slots: t > 0.15 ? FACE.greedy : FACE.happy,
      bones: {
        hips: { y: -40 * squat + 90 * air, sy: 1 - 0.06 * squat + 0.03 * air, sx: 1 + 0.04 * squat },
        torso: { r: 6 * arm - 4 * squat },
        head: { r: 8 * arm },
        'thigh.r': { r: 14 * air },
        'shin.r': { r: -24 * air },
        'thigh.l': { r: -8 * air },
        'shin.l': { r: -20 * air },
        'upperArm.r': { r: -150 * arm },
        'forearm.r': { r: -20 * arm + 8 * shake },
        'hand.r': { r: 10 * shake },
        weapon: { wr: wrench(80 + 12 * shake), ww: arm },
        'upperArm.l': { r: 10 * arm },
      },
    });
  },
};

export const ironcladClips: Clip2D[] = [idle, walk, charge, carry, hit, ko, taunt, cheer];
