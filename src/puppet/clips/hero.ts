/**
 * Little Archer's moves. Rotations in degrees (counter-clockwise), offsets in rig pixels (y-up).
 * Facing right: +r swings a hanging arm or leg forward; a negative torso r leans forward.
 * Near side = the character's right (.r), far side = left (.l, holds the bow).
 */
import { bounce, ease, key, osc } from '../../anim/curves';
import { layer, type Clip2D, type Pose2D } from '../pose';
import type { Vec2 } from '../rig';

/** A point on the rig-pose picture (pixels, y-down) in character space. */
const at = (x: number, y: number): Vec2 => [x - 345, 1420 - y];

const FACE = {
  calm: { eyes: 'eyes-open', mouth: 'mouth-smile' },
  focus: { eyes: 'eyes-focus', mouth: 'mouth-determined' },
  happy: { eyes: 'eyes-happy', mouth: 'mouth-cheer' },
  hurt: { eyes: 'eyes-hurt', mouth: 'mouth-ouch' },
  ko: { eyes: 'eyes-ko', mouth: 'mouth-o' },
  shout: { eyes: 'eyes-focus', mouth: 'mouth-shout' },
};

/** Standing with the bow held low in the far hand, as in the master illustration. */
export const STAND: Pose2D = {
  slots: { 'hand.l': 'hand-l-grip', 'hand.r': 'hand-r-open', ...FACE.calm },
  bones: {
    'upperArm.r': { r: 14 },
    'forearm.r': { r: 12 },
    'hand.r': { r: 6 },
    'upperArm.l': { r: -4 },
    'forearm.l': { r: 22 },
    bow: { wr: -14 },
  },
};

/** Breathing and a little sway: layered on stances so nothing is ever frozen. */
const breathe = (t: number, amount = 1): Pose2D => ({
  bones: {
    hips: { y: -3 * amount * (1 + osc(t, 2.4)) },
    torso: { sy: 1 + 0.012 * amount * osc(t, 2.4, 0.15), r: 1.2 * amount * osc(t, 4.8) },
    head: { r: 2 * amount * osc(t, 4.8, 0.3) },
    'upperArm.r': { r: 2 * amount * osc(t, 2.4, 0.4) },
    'upperArm.l': { r: -1.5 * amount * osc(t, 2.4, 0.45) },
    hoodTip: { r: 3 * amount * osc(t, 4.8, 0.6) },
  },
});

const idle: Clip2D = { name: 'idle', duration: 4.8, loop: true, pose: (t) => layer(STAND, breathe(t)) };

/** Legs and arms for a stride; `p` is 0..1 through the cycle, `size` scales the swing. */
function stride(p: number, size: number): Pose2D {
  const s = Math.sin(2 * Math.PI * p);
  const c = Math.cos(2 * Math.PI * p);
  // The knee folds while that leg swings forward (thigh moving up), straightening before it lands.
  const fold = (phase: number) => Math.max(0, Math.sin(2 * Math.PI * (p + phase)));
  return {
    bones: {
      'thigh.r': { r: 30 * size * s },
      'shin.r': { r: -(8 + 62 * fold(0.25)) * size },
      'thigh.l': { r: -30 * size * s },
      'shin.l': { r: -(8 + 62 * fold(0.75)) * size },
      'upperArm.r': { r: 8 - 38 * size * s },
      'forearm.r': { r: 18 + 52 * size * size + 12 * size * c },
      'upperArm.l': { r: 6 + 16 * size * s },
      head: { r: 3 * size * c },
    },
  };
}

const walk: Clip2D = {
  name: 'walk',
  duration: 0.9,
  loop: true,
  pose: (t) =>
    layer(STAND, stride(t / 0.9, 0.6), {
      bones: { hips: { y: 8 * bounce(t, 0.45) - 8 }, torso: { r: -3 } },
    }),
};

const run: Clip2D = {
  name: 'run',
  duration: 0.5,
  loop: true,
  pose: (t) =>
    layer(STAND, stride(t / 0.5, 1), {
      slots: { mouth: 'mouth-cheer', 'hand.r': 'hand-r-pinch' },
      bones: {
        hips: { y: 22 * bounce(t, 0.25) - 26, r: -4 },
        torso: { r: -9 + 2 * osc(t, 0.25), sy: 1 + 0.025 * osc(t, 0.25, 0.25) },
        head: { r: 6 },
        'forearm.l': { r: 26 },
        bow: { wr: -30 },
      },
    }),
};

// --- Archery -------------------------------------------------------------------------------------------
// The bow arm reaches forward at shoulder height; the string hand starts on the string by the grip and pulls
// back to the anchor by the near cheek. With `draw` = 1 the string follows the pinching hand.

/** Bow hand (wrist) at full reach, string hand on the string at the grip, and the anchor by the cheek. */
const BOW_HAND = at(800, 470);
const ON_STRING = at(720, 490);
const ANCHOR = at(335, 482);
/** Hands up, string drawn to the cheek, arrow on the string. */
const DRAWN: Pose2D = {
  slots: { 'hand.l': 'hand-l-grip', 'hand.r': 'hand-r-pinch', ...FACE.focus },
  ik: { 'hand.l': { target: BOW_HAND, bend: -1 }, 'hand.r': { target: ANCHOR, bend: -1 } },
  bones: { torso: { r: 4 }, head: { r: -4 }, bow: { wr: -4 }, 'hand.r': { wr: 160 }, hips: { y: -6 } },
  draw: 1,
  arrow: 1,
  z: { 'forearm-r': 67, 'hand-r-pinch': 68, 'hand-r-open': 68 },
};

function aimPose(draw: number, reach: number): Pose2D {
  return layer(DRAWN, {
    ik: {
      'hand.l': { target: BOW_HAND, bend: -1, w: reach },
      'hand.r': {
        target: [ON_STRING[0] + (ANCHOR[0] - ON_STRING[0]) * draw, ON_STRING[1] + (ANCHOR[1] - ON_STRING[1]) * draw],
        bend: -1,
        w: reach,
      },
    },
    bones: { bow: { wr: -4, ww: reach } },
    draw: reach >= 0.99 ? 1 : 0,
    arrow: reach >= 0.99 ? 1 : 0,
  });
}

const RELEASE = 0.5;
const shoot: Clip2D = {
  name: 'shoot',
  duration: 1.1,
  loop: false,
  events: [[RELEASE, 'release']],
  pose: (t) => {
    if (t < RELEASE) {
      const reach = key(t, [[0, 0], [0.18, 1, ease.out]]);
      const draw = key(t, [[0.2, 0], [0.44, 1, ease.inOut]]);
      return layer(STAND, aimPose(draw, reach), { bones: { torso: { r: 3 * draw }, 'shin.l': { r: -6 * reach } } });
    }
    // Release: the string snaps forward, the hand flies back and opens, the body rocks, then settles.
    const u = t - RELEASE;
    const fling = key(u, [[0, 0], [0.08, 1, ease.out], [0.6, 0, ease.inOut]]);
    const settle = key(u, [[0.15, 0], [0.6, 1, ease.inOut]]);
    const pose = aimPose(0, 1 - settle);
    return layer(STAND, pose, {
      slots: { 'hand.r': 'hand-r-open', eyes: u < 0.25 ? 'eyes-focus' : 'eyes-open', mouth: 'mouth-smile' },
      ik: { 'hand.r': { target: [ANCHOR[0] - 170 * fling, ANCHOR[1] - 90 * fling], bend: -1, w: 1 - settle } },
      bones: { torso: { r: 6 * fling }, head: { r: 5 * fling }, hips: { x: -8 * fling } },
      draw: 0,
      arrow: 0,
    });
  },
};

/** Draw-and-loose as fast as possible, arms staying up. */
const rapid: Clip2D = {
  name: 'rapid',
  duration: 0.5,
  loop: true,
  events: [[0.25, 'release']],
  pose: (t) => {
    const draw = t < 0.25 ? key(t, [[0, 0.1], [0.2, 1, ease.out]]) : key(t, [[0.25, 1], [0.3, 0, ease.out], [0.5, 0.1]]);
    const pose = aimPose(draw, 1);
    return layer(STAND, pose, {
      draw: t < 0.25 ? 1 : 0,
      arrow: t < 0.25 ? 1 : 0,
      bones: { torso: { r: t >= 0.25 && t < 0.33 ? 4 : 1 } },
    });
  },
};

// --- Movement and reactions ---------------------------------------------------------------------------

/** A low, quick dash forward with a squash before and a stretch through it. */
const dodge: Clip2D = {
  name: 'dodge',
  duration: 0.55,
  loop: false,
  pose: (t) => {
    const crouch = key(t, [[0, 0], [0.08, 1, ease.out], [0.38, 1], [0.55, 0, ease.out]]);
    const lean = key(t, [[0, 0], [0.1, 1, ease.back], [0.4, 1], [0.55, 0, ease.out]]);
    return layer(STAND, {
      slots: { ...FACE.focus, 'hand.r': 'hand-r-open' },
      bones: {
        hips: { y: -70 * crouch, r: -12 * lean, sx: 1 + 0.06 * crouch },
        torso: { r: -22 * lean },
        head: { r: 14 * lean },
        'thigh.r': { r: 55 * lean },
        'shin.r': { r: -70 * lean },
        'thigh.l': { r: -40 * lean },
        'shin.l': { r: -35 * lean },
        'upperArm.r': { r: -50 * lean },
        'forearm.r': { r: 30 * lean },
        'upperArm.l': { r: 30 * lean },
        bow: { wr: -50 },
        hoodTip: { r: -25 * lean },
      },
    });
  },
};

/** Knocked back by a hit: eyes squeezed shut, then shake it off. */
const hit: Clip2D = {
  name: 'hit',
  duration: 0.45,
  loop: false,
  pose: (t) => {
    const k = key(t, [[0, 0], [0.06, 1, ease.out], [0.45, 0, ease.inOut]]);
    return layer(STAND, {
      slots: t < 0.32 ? FACE.hurt : FACE.calm,
      bones: {
        hips: { x: -18 * k, y: -6 * k },
        torso: { r: 14 * k },
        head: { r: 12 * k },
        'upperArm.r': { r: -20 * k },
        'forearm.r': { r: 30 * k },
        'upperArm.l': { r: 18 * k },
        'thigh.r': { r: 10 * k },
        hoodTip: { r: 20 * k },
      },
    });
  },
};

/** Knocked out: totters, falls on his back, bounces once and lies there seeing stars. */
const ko: Clip2D = {
  name: 'ko',
  duration: 1.2,
  loop: false,
  pose: (t) => {
    const fall = key(t, [[0, 0], [0.15, 0.1], [0.55, 1, ease.in], [0.68, 0.94, ease.out], [0.82, 1, ease.in]]);
    return layer(STAND, {
      slots: t < 0.15 ? FACE.hurt : FACE.ko,
      bones: {
        hips: { r: 80 * fall, y: -250 * fall, x: 140 * fall },
        torso: { r: 6 * fall },
        head: { r: 10 * fall },
        // Knees up, the near arm flopped out to the side.
        'thigh.r': { r: 30 * fall },
        'shin.r': { r: -55 * fall },
        'thigh.l': { r: 20 * fall },
        'shin.l': { r: -40 * fall },
        'upperArm.r': { r: -25 * fall },
        'forearm.r': { r: 10 * fall },
        'upperArm.l': { r: 40 * fall },
        bow: { wr: -14 + 104 * fall },
        hoodTip: { r: 30 * fall },
      },
    });
  },
};

/** A little jump with both arms up: bow raised high, fist pumped. */
const cheer: Clip2D = {
  name: 'cheer',
  duration: 1.4,
  loop: false,
  pose: (t) => {
    const squat = key(t, [[0, 0], [0.12, 1, ease.out], [0.22, 0, ease.in], [0.62, 0], [0.7, 0.7, ease.out], [0.85, 0, ease.out]]);
    const air = key(t, [[0.18, 0], [0.42, 1, ease.out], [0.66, 0, ease.in]]);
    const arms = key(t, [[0.1, 0], [0.3, 1, ease.back], [1.15, 1], [1.4, 0, ease.inOut]]);
    return layer(STAND, {
      slots: { ...FACE.happy, 'hand.r': 'hand-r-pinch' },
      bones: {
        hips: { y: -50 * squat + 150 * air, sy: 1 - 0.05 * squat + 0.03 * air },
        torso: { r: 4 * arms },
        head: { r: 8 * arms },
        'thigh.r': { r: 25 * air },
        'shin.r': { r: -45 * air },
        'thigh.l': { r: -10 * air },
        'shin.l': { r: -40 * air },
        'upperArm.l': { r: 150 * arms },
        'forearm.l': { r: -10 * arms },
        bow: { wr: -14 + 4 * arms },
        'hand.r': { wr: 95, ww: arms },
        hoodTip: { r: -20 * air },
      },
      // The fist punches up beside the head.
      ik: { 'hand.r': { target: at(110, 250), bend: 1, w: arms } },
      z: arms > 0.3 ? { 'forearm-r': 67, 'hand-r-pinch': 68 } : undefined,
    });
  },
};

/** Calls a companion: the free hand sweeps forward and up, then a bright shout. */
const cast: Clip2D = {
  name: 'cast',
  duration: 1.0,
  loop: false,
  pose: (t) => {
    const wind = key(t, [[0, 0], [0.2, 1, ease.out], [0.3, 1]]);
    const call = key(t, [[0.25, 0], [0.42, 1, ease.back], [0.8, 1], [1, 0, ease.inOut]]);
    return layer(STAND, {
      slots: call > 0.3 ? { ...FACE.shout, 'hand.r': 'hand-r-open' } : FACE.focus,
      bones: {
        hips: { y: -20 * wind + 10 * call },
        torso: { r: 8 * wind - 12 * call },
        head: { r: 6 * wind - 6 * call },
        'upperArm.r': { r: -30 * wind },
        'forearm.r': { r: 40 * wind },
        'hand.r': { wr: -5, ww: call },
        'upperArm.l': { r: -10 * call },
        hoodTip: { r: 15 * call },
      },
      // The free arm thrusts straight out in front, palm open.
      ik: { 'hand.r': { target: at(800, 560), bend: -1, w: call } },
      z: call > 0.3 ? { 'forearm-r': 67, 'hand-r-open': 68 } : undefined,
    });
  },
};

export const heroClips: Clip2D[] = [idle, walk, run, shoot, rapid, dodge, hit, ko, cheer, cast];
