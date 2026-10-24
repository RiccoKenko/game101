/**
 * Little Mage's moves (art/rigs/mage.json, on the archer's 17-bone skeleton: the braid and the hat tip swing where
 * the archer's feather and quiver hung, and the staff sits in the far hand where the bow was). Rotations in degrees
 * (counter-clockwise), offsets in rig pixels (y-up). Facing right: +r swings a hanging arm or leg forward; a negative
 * torso r leans forward. Near side = the character's right (.r, the casting hand), far side = left (.l, the staff).
 */
import { bounce, ease, key, osc } from '../../anim/curves';
import { blend, layer, type Clip2D, type Pose2D } from '../pose';
import type { Vec2 } from '../rig';

/** A point on the rig-pose picture (pixels, y-down) in character space. */
const at = (x: number, y: number): Vec2 => [x - 440, 1374 - y];

/**
 * Rest directions (degrees, y-up) printed by tools/fit/gen_mage.py: the staff's foot-to-crystal line and the near
 * hand's wrist-to-fingers line. The staff is fixed in the fist (it runs through the hole the sheet drew), so turning
 * the far hand aims the staff.
 */
const STAFF_REST = -21.01;
const NEAR_HAND_REST = -114.18;
/** The staff pointing at `deg` (90 = upright, less = crystal forward). */
const staffAt = (deg: number, w = 1): Pose2D['bones'] => ({ 'hand.l': { wr: deg - STAFF_REST, ww: w } });
/** The near hand's fingers pointing at `deg` (0 = forward, 90 = up). */
const palmAt = (deg: number, w = 1): Pose2D['bones'] => ({ 'hand.r': { wr: deg - NEAR_HAND_REST, ww: w } });

const FACE = {
  calm: { eyes: 'eyes-open', mouth: 'mouth-smile' },
  focus: { eyes: 'eyes-focus', mouth: 'mouth-determined' },
  cast: { eyes: 'eyes-focus', mouth: 'mouth-shout' },
  happy: { eyes: 'eyes-happy', mouth: 'mouth-cheer' },
  hurt: { eyes: 'eyes-hurt', mouth: 'mouth-ouch' },
  ko: { eyes: 'eyes-ko', mouth: 'mouth-o' },
};

/** The casting forearm and hand in front of the capelet (the upper arm stays under it). */
const ARM_OVER = { 'forearm-r': 52, 'hand-r-open': 53, 'hand-r-point': 53 };
/** The casting arm at the side: under the capelet, behind nothing else. */
const ARM_SIDE = { 'forearm-r': 42, 'hand-r-open': 44, 'hand-r-point': 44 };

/**
 * The rig pose is three-quarter: the near shoulder sits far behind the chest, out of reach of anything in front of
 * her. Turning towards the target brings it forward (rig px, hidden under the capelet): a little when ready, more
 * when casting.
 */
const SHOULDER_READY = 45;
const SHOULDER_CAST = 150;

/** Ready: the staff upright beside her, its foot on the ground; the casting hand palm-up in front of the chest. */
const STAFF_HAND: Vec2 = [158, 620];
const READY_HAND: Vec2 = [28, 700];

export const STAND: Pose2D = {
  slots: { 'hand.l': 'hand-l-grip', 'hand.r': 'hand-r-open', ...FACE.calm },
  ik: { 'hand.l': { target: STAFF_HAND, bend: -1 }, 'hand.r': { target: READY_HAND, bend: -1 } },
  bones: { 'upperArm.r': { x: SHOULDER_READY }, ...staffAt(88), ...palmAt(12) },
  z: ARM_OVER,
};

/** Breathing and a little sway, one breath per `period`. The bob lowers the torso, so the feet stay planted. */
export const breathe = (t: number, amount = 1, period = 2.4): Pose2D => ({
  bones: {
    torso: { y: -3 * amount * (1 + osc(t, period)), sy: 1 + 0.012 * amount * osc(t, period, 0.15), r: 1.2 * amount * osc(t, period, 0.6) },
    head: { r: 2 * amount * osc(t, period, 0.75) },
    braid: { r: 3 * amount * osc(t, period, 0.9) },
    hatTip: { r: 2.5 * amount * osc(t, period, 0.95) },
    capelet: { r: 0.8 * amount * osc(t, period, 0.85) },
  },
});

/** The casting hand hovers a little with the breath (rig px). */
const hover = (t: number, amount: number, period: number): Pose2D => ({
  ik: { 'hand.r': { target: [READY_HAND[0] + 2 * amount * osc(t, period, 0.3), READY_HAND[1] + 5 * amount * osc(t, period, 0.55)], bend: -1 } },
  bones: palmAt(12 + 4 * amount * osc(t, period, 0.4)),
});

/** Loop length of the ready idle (16 frames at 12 fps) and its breathing strength. */
export const READY_LOOP = 4 / 3;
const READY_BREATH = 1.5;
const readyAt = (t: number): Pose2D => layer(STAND, breathe(t, READY_BREATH, READY_LOOP), hover(t, READY_BREATH, READY_LOOP));
const ready: Clip2D = { name: 'ready', duration: READY_LOOP, loop: true, pose: readyAt };
const idle: Clip2D = { name: 'idle', duration: 4.8, loop: true, pose: (t) => layer(STAND, breathe(t, 1, 2.4), hover(t, 1, 2.4)) };

/** Legs and the casting arm for a stride; `p` is 0..1 through the cycle, `size` scales the swing. */
function stride(p: number, size: number): Pose2D {
  const s = Math.sin(2 * Math.PI * p);
  const c = Math.cos(2 * Math.PI * p);
  const fold = (phase: number) => Math.max(0, Math.sin(2 * Math.PI * (p + phase)));
  return {
    bones: {
      'thigh.r': { r: 30 * size * s },
      'shin.r': { r: -(8 + 62 * fold(0.25)) * size },
      'thigh.l': { r: -30 * size * s },
      'shin.l': { r: -(8 + 62 * fold(0.75)) * size },
      head: { r: 3 * size * c },
    },
  };
}

/** Rig px the run lifts the body by, so its planted foot lands on the standing soles' line. */
export const RUN_LIFT = 34;
const RUN = 0.5;
/** The run's legs, hips, torso and head (no arms): shared frame for frame by run, runCharge and runCast. */
function runBody(t: number): Pose2D {
  return layer(stride(t / RUN, 1), {
    slots: { mouth: 'mouth-cheer' },
    bones: {
      hips: { y: 22 * bounce(t, 0.25) - 26 + RUN_LIFT, r: -4 },
      torso: { r: -9 + 2 * osc(t, 0.25), sy: 1 + 0.025 * osc(t, 0.25, 0.25) },
      head: { r: 6 },
    },
  });
}

/**
 * A target given for the standing body, carried along with the run's bob and (a third of) its lean, so the hands
 * ride with the shoulders while the staff and the cast stay level.
 */
function follow(target: Vec2, body: Pose2D): Vec2 {
  const hips = at(448, 790);
  const torso = at(450, 745);
  const b = body.bones ?? {};
  const hipsY = b.hips?.y ?? 0;
  const hipsR = ((b.hips?.r ?? 0) * Math.PI) / 180;
  const turn = ((((b.hips?.r ?? 0) + (b.torso?.r ?? 0)) / 3) * Math.PI) / 180;
  const rot = (v: Vec2, a: number): Vec2 => [v[0] * Math.cos(a) - v[1] * Math.sin(a), v[0] * Math.sin(a) + v[1] * Math.cos(a)];
  const tj = rot([torso[0] - hips[0], torso[1] - hips[1]], hipsR);
  const joint: Vec2 = [hips[0] + tj[0], hips[1] + hipsY + tj[1]];
  const v = rot([target[0] - torso[0], target[1] - torso[1]], turn);
  return [joint[0] + v[0], joint[1] + v[1]];
}

/** Running, the staff is carried slanted, crystal forward, the hand at the hip. */
const CARRY_HAND: Vec2 = [150, 560];

const run: Clip2D = {
  name: 'run',
  duration: RUN,
  loop: true,
  pose: (t) => {
    const body = runBody(t);
    const s = Math.sin((2 * Math.PI * t) / RUN);
    const c = Math.cos((2 * Math.PI * t) / RUN);
    return layer(STAND, body, {
      slots: { 'hand.r': 'hand-r-open' },
      ik: { 'hand.l': { target: follow([CARRY_HAND[0] + 6 * c, CARRY_HAND[1] + 8 * s], body), bend: -1, w: 1 }, 'hand.r': { target: [0, 0], w: 0 } },
      bones: {
        // The casting arm pumps against the near leg; the hand trails a little.
        'upperArm.r': { r: 14 - 40 * s, x: -SHOULDER_READY },
        'forearm.r': { r: 62 + 14 * c },
        'hand.r': { r: 10 - 12 * c, wr: 0, ww: 0 },
        ...staffAt(48 + 5 * s),
      },
      z: ARM_SIDE,
    });
  },
};

// --- Casting -----------------------------------------------------------------------------------------------
// Charging: the casting hand held out at chest height, palm out; the staff tipped forward. Casting: the arm thrust
// all the way out (the bolt leaves the palm), the staff pushed forward too.
const CHARGE_HAND: Vec2 = [176, 726];
const CAST_HAND: Vec2 = [250, 742];
const CHARGE_STAFF_HAND: Vec2 = [168, 640];
const CAST_STAFF_HAND: Vec2 = [186, 652];

function castArms(k: number): Pose2D {
  // k: 0 = charging, 1 = the thrust.
  const lerp = (a: Vec2, b: Vec2): Vec2 => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
  return {
    slots: { 'hand.l': 'hand-l-grip', 'hand.r': 'hand-r-open', ...(k > 0.5 ? FACE.cast : FACE.focus) },
    ik: { 'hand.l': { target: lerp(CHARGE_STAFF_HAND, CAST_STAFF_HAND), bend: -1 }, 'hand.r': { target: lerp(CHARGE_HAND, CAST_HAND), bend: -1 } },
    // Squash and stretch: the arm grows a little as it shoots out (the IK aims it; the stretch carries the hand further).
    bones: { 'upperArm.r': { x: SHOULDER_CAST - SHOULDER_READY, sx: 1.04 + 0.12 * k, sy: 1.04 + 0.12 * k }, ...staffAt(70 - 12 * k), ...palmAt(84 - 10 * k) },
    z: ARM_OVER,
  };
}

function runArms(t: number, k: number): Pose2D {
  const body = runBody(t);
  const arms = castArms(k);
  return layer(STAND, body, {
    slots: arms.slots,
    ik: {
      'hand.l': { target: follow(arms.ik!['hand.l'].target, body), bend: -1 },
      'hand.r': { target: follow(arms.ik!['hand.r'].target, body), bend: -1 },
    },
    bones: { ...arms.bones },
    z: arms.z,
  });
}

const runCharge: Clip2D = { name: 'runCharge', duration: RUN, loop: true, pose: (t) => runArms(t, 0) };
const runCast: Clip2D = { name: 'runCast', duration: RUN, loop: true, pose: (t) => runArms(t, 1) };

/**
 * One cast out of `ready`: the thrust on the first frame (the bolt flies), the body rocking into it and the staff
 * pushed forward, then everything settles back; starts on the thrust and ends on ready's first frame.
 */
const cast: Clip2D = {
  name: 'cast',
  duration: 0.5,
  loop: false,
  events: [[0, 'release']],
  pose: (t) => {
    const rest = layer(STAND, breathe(0, READY_BREATH, READY_LOOP), hover(0, READY_BREATH, READY_LOOP));
    const lean = key(t, [[0, 0.75], [0.07, 1, ease.out], [0.38, 0, ease.inOut]]);
    const settle = key(t, [[0.1, 0], [0.4, 1, ease.inOut]]);
    // The palm kicks up a little after the bolt leaves (overshoot), then everything settles.
    const kick = key(t, [[0, 0], [0.07, 1, ease.out], [0.3, 0, ease.inOut]]);
    const arms = castArms(1);
    const hand = arms.ik!['hand.r'].target;
    const thrust = layer(STAND, breathe(0, READY_BREATH, READY_LOOP), arms, {
      ik: { 'hand.r': { target: [hand[0] - 6 * kick, hand[1] + 14 * kick], bend: -1 } },
      bones: {
        torso: { r: -6 * lean },
        head: { r: -4 * lean },
        hips: { x: 6 * lean },
        'shin.l': { r: -4 * lean },
        ...palmAt(74 + 12 * kick),
      },
    });
    const pose = blend(thrust, rest, settle);
    return settle < 0.5 ? layer(pose, { slots: t < 0.2 ? FACE.cast : FACE.focus }) : pose;
  },
};

// --- Reactions ---------------------------------------------------------------------------------------------

/** Knocked back by a hit: eyes squeezed shut, the staff wobbles back, then she shakes it off. */
const hit: Clip2D = {
  name: 'hit',
  duration: 0.45,
  loop: false,
  pose: (t) => {
    const k = key(t, [[0, 0], [0.06, 1, ease.out], [0.45, 0, ease.inOut]]);
    return layer(STAND, {
      slots: t < 0.32 ? FACE.hurt : FACE.calm,
      ik: { 'hand.r': { target: [READY_HAND[0] - 40 * k, READY_HAND[1] + 30 * k], bend: -1 } },
      bones: {
        hips: { x: -16 * k, y: -5 * k },
        torso: { r: 13 * k },
        head: { r: 12 * k },
        ...staffAt(88 + 14 * k),
        ...palmAt(12 + 50 * k),
        'thigh.r': { r: 10 * k },
        braid: { r: 14 * k },
        hatTip: { r: 6 * k },
      },
    });
  },
};

/** Knocked out: totters, falls on her back, bounces once and lies there seeing stars; the staff drops beside her. */
const ko: Clip2D = {
  name: 'ko',
  duration: 1.2,
  loop: false,
  pose: (t) => {
    const fall = key(t, [[0, 0], [0.15, 0.1], [0.55, 1, ease.in], [0.68, 0.94, ease.out], [0.82, 1, ease.in]]);
    // The staff tips forward first, so its foot never digs into the ground, and the hand follows it down.
    const tip = key(t, [[0.12, 0], [0.42, 1, ease.inOut], [0.6, 0.96, ease.out], [0.75, 1, ease.inOut]]);
    const drop = key(t, [[0.25, 0], [0.65, 1, ease.inOut]]);
    const sink = (1 - Math.cos((80 * fall * Math.PI) / 180)) / (1 - Math.cos((80 * Math.PI) / 180));
    return layer(STAND, {
      slots: t < 0.15 ? FACE.hurt : FACE.ko,
      // The staff hand lets go towards the ground; the staff ends up lying in front of her.
      ik: {
        'hand.l': { target: [STAFF_HAND[0] + (KO_STAFF_HAND[0] - STAFF_HAND[0]) * drop, STAFF_HAND[1] + (KO_STAFF_HAND[1] - STAFF_HAND[1]) * drop], bend: -1 },
        'hand.r': { target: [0, 0], w: 0 },
      },
      bones: {
        // The hips sink only as fast as the tipping lifts the feet, so the boots never dip below the ground.
        hips: { r: 80 * fall, y: KO_DROP * sink + 46 * Math.sin(Math.PI * Math.min(1, fall)), x: KO_SLIDE * fall },
        // Chibi: the big head and hat would sink through the floor lying flat, so the upper body stays propped a little.
        torso: { r: -14 * fall },
        head: { r: 18 * fall },
        'thigh.r': { r: 30 * fall },
        'shin.r': { r: -55 * fall },
        'thigh.l': { r: 20 * fall },
        'shin.l': { r: -40 * fall },
        'upperArm.r': { r: 20 * fall },
        'forearm.r': { r: 30 * fall },
        'hand.r': { r: 10 * fall, wr: 0, ww: 0 },
        ...staffAt(88 - 92 * tip),
        braid: { r: -20 * fall },
        hatTip: { r: -12 * fall },
      },
      // Once down, the staff has rolled in front of her and lies along the ground.
      z: t >= 0.5 ? { ...ARM_SIDE, staff: 55 } : ARM_SIDE,
    });
  },
};
/** How far the hips drop and slide forward as she falls (rig px). */
const KO_DROP = -230;
const KO_SLIDE = 120;
/** Where the staff hand ends up: low beside her, so the staff lies flat on the ground. */
const KO_STAFF_HAND: Vec2 = [60, 62];

/** A little jump: the staff thrust up high, the other hand waving. */
const cheer: Clip2D = {
  name: 'cheer',
  duration: 1.4,
  loop: false,
  pose: (t) => {
    const squat = key(t, [[0, 0], [0.12, 1, ease.out], [0.22, 0, ease.in], [0.62, 0], [0.7, 0.7, ease.out], [0.85, 0, ease.out]]);
    const air = key(t, [[0.18, 0], [0.42, 1, ease.out], [0.66, 0, ease.in]]);
    const arms = key(t, [[0.1, 0], [0.3, 1, ease.back], [1.15, 1], [1.4, 0, ease.inOut]]);
    const wave = Math.sin(2 * Math.PI * Math.max(0, t - 0.3) * 2.2) * Math.min(1, Math.max(0, (t - 0.3) / 0.15));
    return layer(STAND, {
      slots: { ...FACE.happy },
      ik: {
        'hand.l': { target: [STAFF_HAND[0] + (CHEER_STAFF[0] - STAFF_HAND[0]) * arms, STAFF_HAND[1] + (CHEER_STAFF[1] - STAFF_HAND[1]) * arms], bend: -1 },
        'hand.r': { target: [READY_HAND[0] + (CHEER_WAVE[0] - READY_HAND[0]) * arms, READY_HAND[1] + (CHEER_WAVE[1] - READY_HAND[1]) * arms], bend: -1 },
      },
      bones: {
        // The squash shortens the legs as much as the hips drop, so the soles stay on the ground.
        hips: { y: -29 * squat + CHEER_HOP * air, sy: 1 - 0.05 * squat + 0.03 * air },
        torso: { r: 4 * arms },
        head: { r: 8 * arms },
        'thigh.r': { r: 25 * air },
        'shin.r': { r: -45 * air },
        'thigh.l': { r: -10 * air },
        'shin.l': { r: -40 * air },
        'upperArm.l': { y: 26 * arms },
        ...staffAt(88 - 8 * arms + 4 * wave),
        ...palmAt(12 - (22 - 8 * wave) * arms),
        braid: { r: -14 * air },
        hatTip: { r: -8 * air },
      },
    });
  },
};
/** Jump height of the cheer (rig px), and where the hands go (the staff hand up high, the other flung out, ta-da). */
const CHEER_HOP = 100;
const CHEER_STAFF: Vec2 = [128, 975];
const CHEER_WAVE: Vec2 = [70, 610];

export const mageClips: Clip2D[] = [idle, ready, run, runCharge, runCast, cast, hit, ko, cheer];
