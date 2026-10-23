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
const GROUND: Vec2 = [509, 1286];
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
};

/**
 * Hammer grip: the near fist's world angle (0 = hanging as on the rig pose) and the wrench across it, handle
 * square to the hand. At 0 the wrench points straight forward; +90 points it up.
 */
const hammer = (hand: number, ww = 1): Pose2D => ({ bones: { 'hand.r': { wr: hand, ww }, weapon: { wr: hand + 73, ww } } });

/** The wrench and hatch in hand, chest out, the hatch kept upright whatever the far arm does. */
export const STAND: Pose2D = {
  slots: { 'hand.r': 'hand-r-grip', 'hand.l': 'hand-l-grip', weapon: 'wrench', shield: 'shield', loot: 'none', ...FACE.calm },
  bones: { torso: { r: 2 }, head: { r: 2 }, shield: { wr: 0 } },
};

/** Slow boiler breathing: the chest swells and settles, the helmet bobs a beat later. */
const breathe = (t: number, amount = 1): Pose2D => ({
  bones: {
    torso: { y: -3 * amount * (1 + osc(t, 3)), sy: 1 + 0.02 * amount * osc(t, 3, 0.1), sx: 1 - 0.01 * amount * osc(t, 3, 0.1), r: amount * osc(t, 6) },
    head: { r: 2 * amount * osc(t, 6, 0.2), y: 3 * amount * osc(t, 3, 0.25) },
    'upperArm.r': { r: 1.5 * amount * osc(t, 3, 0.3) },
    'upperArm.l': { r: -1.5 * amount * osc(t, 3, 0.35) },
  },
});

// ---- Legs. The boots are long and stiff, so the clips keep them on the ground with a little geometry. ----

/** The legs on the rig pose (character space): hip and knee joints, and heel, middle and toe of each sole. */
const LEGS = {
  r: { hip: at(366, 844), knee: at(342, 1022), sole: [at(240, 1268), at(373, 1277), at(520, 1266)] },
  l: { hip: at(664, 859), knee: at(685, 1028), sole: [at(574, 1250), at(718, 1260), at(879, 1253)] },
};
type Leg = (typeof LEGS)['r'];
const DEG = Math.PI / 180;
const turn = (p: Vec2, c: Vec2, deg: number): Vec2 => {
  const [s, k] = [Math.sin(deg * DEG), Math.cos(deg * DEG)];
  return [c[0] + (p[0] - c[0]) * k - (p[1] - c[1]) * s, c[1] + (p[0] - c[0]) * s + (p[1] - c[1]) * k];
};
/** How far a boot's lowest point sits above where it stands on the rig pose, with the thigh and shin turned. */
function bootHeight(leg: Leg, thigh: number, shin: number): number {
  const low = (pts: Vec2[]) => Math.min(...pts.map((p) => p[1]));
  return low(leg.sole.map((p) => turn(turn(p, leg.knee, shin), leg.hip, thigh))) - low(leg.sole);
}

/** Knees bent by `bend` degrees, both boots kept on the ground: the hips sink to suit. */
function crouch(bend: number): Pose2D {
  const [a, b] = [bend, -1.8 * bend];
  const y = -Math.min(bootHeight(LEGS.r, a, b), bootHeight(LEGS.l, a, b));
  return { bones: { hips: { y }, 'thigh.r': { r: a }, 'shin.r': { r: b }, 'thigh.l': { r: a }, 'shin.l': { r: b } } };
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
 * The stomp: near-stiff legs swinging from the hips (heel down in front, toe down behind), the boot hoisted on
 * each swing and slammed down, a thud through the body as it lands. The hips ride exactly as high as the planted
 * boot allows, so no boot sinks into the ground. `p` is 0..1 through the cycle (two steps), `stride` the leg
 * swing in degrees, `knee` how high the swinging boot lifts.
 */
function stomp(p: number, stride: number, knee = 1): Pose2D {
  const legs = { r: foot(p), l: foot(p + 0.5) };
  const angles = { r: [0, 0], l: [0, 0] };
  for (const side of ['r', 'l'] as const) {
    const f = legs[side];
    // The boot tilts heel-down in front, only a little toe-down behind, toe-up on the swing; the knee gives a
    // little as the boot takes the weight.
    const tilt = stride * f.swing * (f.swing > 0 ? 0.5 : 0.25) + 12 * knee * f.lift - 4 * f.landed;
    const thigh = stride * f.swing + 20 * knee * f.lift + 4 * f.landed;
    angles[side] = [thigh, tilt - thigh];
  }
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
      torso: { r: 2.5 * thud - 1.5 * rock, y: -5 * thud, sy: 1 - 0.035 * thud, sx: 1 + 0.02 * thud },
      head: { r: 2 * rock - 3 * thud, y: -10 * thud },
      strap: { r: 6 * thud },
      'thigh.r': { r: angles.r[0], y: swinging === 'r' ? hoist : 0 },
      'shin.r': { r: angles.r[1] },
      'thigh.l': { r: angles.l[0], y: swinging === 'l' ? hoist : 0 },
      'shin.l': { r: angles.l[1] },
    },
  };
}

// ---- Loops ----

/** The wrench resting on his near shoulder like a rifle, its head behind the helmet. */
const shouldered = (t: number): Pose2D =>
  layer(hammer(142 + 2 * osc(t, 3, 0.3)), { ik: { 'hand.r': { target: at(334 + 3 * osc(t, 3, 0.3), 640 - 4 * osc(t, 3, 0.3)), bend: -1 } } });

const idle: Clip2D = {
  name: 'idle',
  duration: 6,
  loop: true,
  pose: (t) => layer(STAND, breathe(t), shouldered(t), { bones: { 'upperArm.l': { r: 4 }, head: { r: 3 * Math.max(0, osc(t, 6, 0.6)) } } }),
};

/** Arms swinging against the legs: the wrench low in the near fist, head forward; the hatch kept upright. */
function marchArms(p: number, size: number): Pose2D {
  const s = Math.sin(2 * Math.PI * (p + 0.125));
  return layer(hammer(-6 - 10 * size * s), {
    bones: {
      'upperArm.r': { r: 14 - 16 * size * s },
      'forearm.r': { r: 22 + 6 * size * s },
      'upperArm.l': { r: 2 + 9 * size * s },
      'forearm.l': { r: 8 + 4 * size * s },
      shield: { wr: 2 * s },
    },
  });
}

/**
 * Cycle lengths and leg swings, chosen so the planted boot keeps pace with the ground when he walks 36 px/s at
 * size 0.082 (about 440 rig px/s), and 0.85 of that while carrying.
 */
const WALK = { duration: 1.1, stride: 25 };
const walk: Clip2D = {
  name: 'walk',
  duration: WALK.duration,
  loop: true,
  pose: (t) => {
    const p = t / WALK.duration;
    return layer(STAND, stomp(p, WALK.stride), marchArms(p, 1), breathe(t, 0.3), { bones: { torso: { r: 2 }, head: { r: 3 } } });
  },
};

/**
 * Plodding off with the crystal hugged to his chest on the near hand, eyes sparkling at it. The wrench is hung
 * up for this; the hatch stays on the far arm.
 */
const CARRY = { duration: 1.2, stride: 23 };
const carry: Clip2D = {
  name: 'carry',
  duration: CARRY.duration,
  loop: true,
  pose: (t) => {
    const p = t / CARRY.duration;
    const bob = Math.sin(4 * Math.PI * (p - 0.06));
    const peek = osc(t, 2.4) > -0.7;
    return layer(STAND, stomp(p, CARRY.stride, 0.7), marchArms(p, 0.5), breathe(t, 0.3), {
      slots: { ...(peek ? FACE.greedy : FACE.calm), weapon: 'none', loot: 'crystal', 'hand.r': 'hand-r-open' },
      bones: { torso: { r: -2 }, head: { r: -2 + 2 * bob }, 'hand.r': { wr: 92 + 3 * bob } },
      ik: { 'hand.r': { target: at(372, 690 - 8 * bob), bend: -1 } },
    });
  },
};

/** Lumbering forward behind the raised hatch, wrench cocked back over his shoulder: a boiler with a grudge. */
const CHARGE = { duration: 0.8, stride: 22 };
const charge: Clip2D = {
  name: 'charge',
  duration: CHARGE.duration,
  loop: true,
  pose: (t) => {
    const p = t / CHARGE.duration;
    const bob = osc(t, CHARGE.duration / 2);
    return layer(STAND, stomp(p, CHARGE.stride, 0.8), hammer(150 + 6 * bob), {
      slots: FACE.angry,
      bones: { torso: { r: -12 }, head: { r: -2 }, shield: { wr: -4, sx: 1.4 } },
      ik: {
        'hand.r': { target: at(250, 560 + 8 * bob), bend: -1 },
        'hand.l': { target: at(650, 620 + 6 * bob), bend: 1 },
      },
      // The hatch leads, in front of both arms.
      z: { shield: 46 },
    });
  },
};

// ---- One-shots ----

/**
 * Rocks back on his heels from a hit, eyes squeezed, then plants himself again with a huff. Only the eyes are
 * set, so whatever he carries (wrench, crystal) stays in hand.
 */
const hit: Clip2D = {
  name: 'hit',
  duration: 0.4,
  loop: false,
  pose: (t) => {
    const k = key(t, [[0, 0], [0.05, 1, ease.out], [0.22, -0.25, ease.inOut], [0.4, 0, ease.inOut]]);
    const squash = key(t, [[0.15, 0], [0.24, 1, ease.out], [0.4, 0, ease.inOut]]);
    return layer({ bones: STAND.bones }, marchArms(0.25, 0), crouch(6 * squash), {
      slots: t < 0.28 ? FACE.hurt : FACE.angry,
      bones: {
        hips: { x: -12 * k },
        torso: { r: 9 * k, sy: 1 - 0.05 * squash, sx: 1 + 0.03 * squash },
        head: { r: 10 * k, y: -8 * squash },
        'upperArm.r': { r: 22 * k },
        'forearm.r': { r: 15 * k },
        'upperArm.l': { r: 14 * k },
        strap: { r: -10 * k },
        shield: { wr: 4 * k },
      },
    });
  },
};

/**
 * Knocked out: a wobble, then he topples onto his back like a turtle, the hatch under him like a shell, boots
 * and wrench waving in the air. The crystal (if any) is dropped.
 */
/** Where the hatch's hub moves (in the far fist's frame) to lie under his back. */
const SHELL: Vec2 = [-143, 894];
const ko: Clip2D = {
  name: 'ko',
  duration: 1.0,
  loop: false,
  pose: (t) => {
    const fall = key(t, [[0, 0], [0.14, -0.07, ease.out], [0.5, 1, ease.in], [0.6, 0.9, ease.out], [0.7, 1, ease.in]]);
    const kick = key(t, [[0.4, 0], [0.56, 1, ease.out], [0.72, 0.7, ease.inOut], [0.86, 0.95, ease.inOut], [1, 0.85, ease.inOut]]);
    const flat = key(t, [[0.3, 0], [0.5, 1, ease.in]]);
    return layer(STAND, {
      slots: { ...(t < 0.14 ? FACE.hurt : FACE.ko), weapon: 'wrench', loot: 'none', 'hand.r': 'hand-r-grip', 'hand.l': flat > 0.5 ? 'hand-l-open' : 'hand-l-grip' },
      bones: {
        hips: { r: 84 * fall, y: -100 * fall, x: 140 * fall },
        torso: { r: 4 * fall },
        head: { r: 12 * fall },
        'thigh.r': { r: 34 * kick },
        'shin.r': { r: -28 * kick },
        'thigh.l': { r: 20 * kick },
        'shin.l': { r: -18 * kick },
        'upperArm.r': { r: 110 * kick },
        'forearm.r': { r: 30 * kick },
        'hand.r': { r: 10 * osc(t, 0.3) * kick },
        weapon: { wr: 150 + 20 * kick, ww: kick },
        // The hatch ends up under his back like a turtle's shell.
        'upperArm.l': { r: 30 * flat },
        'hand.l': { wr: 170, ww: flat },
        shield: { wr: 90 * flat, x: SHELL[0] * flat, y: SHELL[1] * flat },
      },
      z: t > 0.14 ? { shield: 0 } : undefined,
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
    // Three bangs between 0.3 s and 1.1 s: wind up slowly, slam fast.
    const beat = Math.max(0, Math.min(3, ((t - 0.3) / 0.8) * 3));
    const ph = beat % 1;
    const raise = beat >= 3 ? 0.4 : ph < 0.7 ? ease.out(ph / 0.7) : 1 - ease.in((ph - 0.7) / 0.3);
    const bang = beat < 3 && ph < 0.12 && beat > 0.5 ? 1 - ph / 0.12 : 0;
    return layer(STAND, breathe(t, 0.4), hammer(-10 + 135 * raise * up, up), crouch(4 * bang), {
      slots: up > 0.5 ? (bang > 0 ? FACE.angry : FACE.smug) : FACE.calm,
      bones: {
        torso: { r: (4 - 6 * raise) * up + 3 * bang },
        head: { r: (5 + 4 * raise) * up - 4 * bang },
        'hand.l': { wr: 90, ww: up },
        shield: { wr: 3 * bang, sx: 1 + 0.4 * up },
      },
      ik: {
        'hand.r': { target: at(430 - 70 * raise, 480 - 10 * raise), bend: -1, w: up },
        'hand.l': { target: at(636, 611 - 6 * bang), bend: 1, w: up },
      },
    });
  },
};

/** A heavy little hop with the wrench thrust skyward and his eyes sparkling, then a proud wrench shake. */
const cheer: Clip2D = {
  name: 'cheer',
  duration: 1.2,
  loop: false,
  pose: (t) => {
    const squat = key(t, [[0, 0], [0.14, 1, ease.out], [0.24, 0, ease.in], [0.6, 0], [0.68, 0.8, ease.out], [0.86, 0, ease.out]]);
    const air = key(t, [[0.2, 0], [0.4, 1, ease.out], [0.6, 0, ease.in]]);
    const arm = key(t, [[0, 0], [0.14, -0.12, ease.out], [0.32, 1, ease.back], [1.02, 1], [1.2, 0, ease.inOut]]);
    const shake = osc(t, 0.2) * (t > 0.7 && t < 1.05 ? 1 : 0);
    return layer(STAND, crouch(14 * squat), {
      slots: t < 0.16 ? FACE.surprised : FACE.greedy,
      bones: {
        hips: { y: 90 * air },
        torso: { r: 6 * arm - 5 * squat, sy: 1 - 0.05 * squat + 0.03 * air, sx: 1 + 0.03 * squat },
        head: { r: 8 * arm - 4 * squat },
        strap: { r: -14 * air },
        'thigh.r': { r: 14 * air },
        'shin.r': { r: -26 * air },
        'thigh.l': { r: -6 * air },
        'shin.l': { r: -20 * air },
        'upperArm.r': { r: -150 * arm },
        'forearm.r': { r: -20 * arm + 8 * shake },
        'hand.r': { r: 10 * shake },
        weapon: { wr: 80 + 12 * shake + 75, ww: Math.max(0, arm) },
        'upperArm.l': { r: 10 * arm },
      },
    });
  },
};

export const ironcladClips: Clip2D[] = [idle, walk, carry, charge, hit, ko, taunt, cheer];
