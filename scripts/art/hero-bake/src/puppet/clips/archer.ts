/**
 * The Feather Cap archer's moves (art/rigs/archer.json, on the old hero's skeleton). hero.ts's clips retuned for
 * the chibi proportions (short arms, big head), plus the aiming and run-and-shoot clips the sprite bake uses.
 * Rotations in degrees (counter-clockwise), offsets in rig pixels (y-up). Facing right: +r swings a hanging arm or
 * leg forward; a negative torso r leans forward. Near side = the character's right (.r), far side = left (.l, bow).
 */
import { bounce, ease, key, osc } from '../../anim/curves';
import { blend, layer, type Clip2D, type Pose2D } from '../pose';
import type { Vec2 } from '../rig';

/** A point on the rig-pose picture (pixels, y-down) in character space. */
const at = (x: number, y: number): Vec2 => [x - 470, 1250 - y];

const FACE = {
  calm: { eyes: 'eyes-open', mouth: 'mouth-smile' },
  focus: { eyes: 'eyes-focus', mouth: 'mouth-determined' },
  happy: { eyes: 'eyes-happy', mouth: 'mouth-cheer' },
  hurt: { eyes: 'eyes-hurt', mouth: 'mouth-ouch' },
  ko: { eyes: 'eyes-ko', mouth: 'mouth-o' },
  shout: { eyes: 'eyes-focus', mouth: 'mouth-shout' },
};

/** Standing with the bow held low in the far hand. */
export const STAND: Pose2D = {
  slots: { 'hand.l': 'hand-l-grip', 'hand.r': 'hand-r-open', ...FACE.calm },
  bones: {
    'upperArm.r': { r: 6 },
    'forearm.r': { r: 8 },
    'hand.r': { r: 4 },
    'upperArm.l': { r: -2 },
    'forearm.l': { r: 10 },
    bow: { wr: -14 },
  },
};

/** Breathing and a little sway, one breath per `period`. The bob lowers the torso, so the feet stay planted. */
export const breathe = (t: number, amount = 1, period = 2.4): Pose2D => ({
  bones: {
    torso: { y: -3 * amount * (1 + osc(t, period)), sy: 1 + 0.012 * amount * osc(t, period, 0.15), r: 1.2 * amount * osc(t, period, 0.6) },
    head: { r: 2 * amount * osc(t, period, 0.75) },
    'upperArm.r': { r: 2 * amount * osc(t, period, 0.4) },
    'upperArm.l': { r: -1.5 * amount * osc(t, period, 0.45) },
    hoodTip: { r: 3 * amount * osc(t, period, 0.9) },
  },
});

const idle: Clip2D = { name: 'idle', duration: 4.8, loop: true, pose: (t) => layer(STAND, breathe(t, 1, 2.4)) };

/** Legs and arms for a stride; `p` is 0..1 through the cycle, `size` scales the swing. */
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
  pose: (t) => layer(STAND, stride(t / 0.9, 0.6), { bones: { hips: { y: 8 * bounce(t, 0.45) - 8 }, torso: { r: -3 } } }),
};

/** Rig px the run lifts the body by, so its planted foot lands on the standing soles' line. */
export const RUN_LIFT = 20;
const RUN = 0.5;
/** The run's legs, hips, torso and head (no arms): shared frame for frame by run, runAim and runRelease. */
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

const run: Clip2D = {
  name: 'run',
  duration: RUN,
  loop: true,
  pose: (t) =>
    layer(STAND, runBody(t), {
      slots: { 'hand.r': 'hand-r-pinch' },
      bones: { 'forearm.l': { r: 20 }, bow: { wr: -30 } },
    }),
};

// --- Archery -------------------------------------------------------------------------------------------
// The bow arm reaches forward at shoulder height; the string hand starts in front of the chest and pulls back to
// the anchor under the chin (the chibi's short arms cannot reach the cheek). With `draw` = 1 the string follows
// the pinching hand.

/** Bow hand (wrist) at full reach, string hand on the string, and the anchor (both wrists, character space). */
const BOW_HAND = at(826, 585);
const ON_STRING = at(540, 610);
const ANCHOR = at(452, 622);
/** Where the string hand flies on the release (relative to the anchor). */
const FLING: Vec2 = [-95, -45];
/** Hands up, string drawn to the chin, arrow on the string. */
const DRAWN: Pose2D = {
  slots: { 'hand.l': 'hand-l-grip', 'hand.r': 'hand-r-pinch', ...FACE.focus },
  ik: { 'hand.l': { target: BOW_HAND, bend: -1 }, 'hand.r': { target: ANCHOR, bend: -1 } },
  bones: { torso: { r: 4 }, head: { r: -4 }, bow: { wr: -4 }, 'hand.r': { wr: 150 }, hips: { y: -6 } },
  draw: 1,
  arrow: 1,
  z: { 'forearm-r': 67, 'hand-r-pinch': 68, 'hand-r-open': 68, 'hand-r-fist': 68 },
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

/** The string hand just after letting go: flung back and open, the bow arm still forward, no arrow. */
function releasePose(fling: number): Pose2D {
  return layer(aimPose(0, 1), {
    slots: { 'hand.r': 'hand-r-open', eyes: 'eyes-focus', mouth: 'mouth-determined' },
    ik: { 'hand.r': { target: [ANCHOR[0] + FLING[0] * fling, ANCHOR[1] + FLING[1] * fling], bend: -1 } },
    draw: 0,
    arrow: 0,
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
    const u = t - RELEASE;
    const fling = key(u, [[0, 0], [0.08, 1, ease.out], [0.6, 0, ease.inOut]]);
    const settle = key(u, [[0.15, 0], [0.6, 1, ease.inOut]]);
    const pose = aimPose(0, 1 - settle);
    return layer(STAND, pose, {
      slots: { 'hand.r': 'hand-r-open', eyes: u < 0.25 ? 'eyes-focus' : 'eyes-open', mouth: 'mouth-smile' },
      ik: { 'hand.r': { target: [ANCHOR[0] + FLING[0] * fling, ANCHOR[1] + FLING[1] * fling], bend: -1, w: 1 - settle } },
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
    return layer(STAND, aimPose(draw, 1), {
      draw: t < 0.25 ? 1 : 0,
      arrow: t < 0.25 ? 1 : 0,
      bones: { torso: { r: t >= 0.25 && t < 0.33 ? 4 : 1 } },
    });
  },
};

/** Loop length of the aiming idle (16 frames at 12 fps) and its breathing strength. */
export const AIM_LOOP = 4 / 3;
const AIM_BREATH = 1.6;
/** Ready to fire: full draw, arrow nocked, breathing. Loops in AIM_LOOP. */
const aim: Clip2D = {
  name: 'aim',
  duration: AIM_LOOP,
  loop: true,
  pose: (t) => layer(STAND, aimPose(1, 1), breathe(t, AIM_BREATH, AIM_LOOP)),
};

/** One shot out of `aim`: `shoot`'s release (string snaps, hand flies back and opens, body rocks), then the
 * re-draw to full; starts and ends on aim's first frame. */
const loose: Clip2D = {
  name: 'loose',
  duration: 0.5,
  loop: false,
  events: [[0, 'release']],
  pose: (t) => {
    const rest = breathe(0, AIM_BREATH, AIM_LOOP);
    if (t < 0.15) return layer(shoot.pose(RELEASE + t), rest);
    const u = t - 0.15;
    const w = key(u, [[0, 0], [0.08, 1, ease.inOut]]);
    const redraw = layer(STAND, aimPose(key(u - 0.05, [[0, 0.1], [0.2, 1, ease.out]]), 1));
    return layer(blend(shoot.pose(RELEASE + t), redraw, w), rest);
  },
};

/**
 * Run and shoot: run's body (legs, hips, torso, head) frame for frame, with the arms aiming (runAim) or just
 * released (runRelease), so a game can swap between them at the same frame without the legs jumping. The arm
 * targets ride along with the run's bob and lean.
 */
function follow(target: Vec2, body: Pose2D): Vec2 {
  // Rest joints (character space) and the standing aim's own hips and torso.
  const hips = at(480, 800);
  const torso = at(482, 760);
  const b = body.bones ?? {};
  const hipsY = b.hips?.y ?? 0;
  const hipsR = ((b.hips?.r ?? 0) * Math.PI) / 180;
  // Only a third of the lean: the bow stays near level while the body pitches forward.
  const turn = ((((b.hips?.r ?? 0) + (b.torso?.r ?? 0) - 4) / 3) * Math.PI) / 180;
  const rot = (v: Vec2, a: number): Vec2 => [v[0] * Math.cos(a) - v[1] * Math.sin(a), v[0] * Math.sin(a) + v[1] * Math.cos(a)];
  const tj = rot([torso[0] - hips[0], torso[1] - hips[1]], hipsR);
  const joint: Vec2 = [hips[0] + tj[0], hips[1] + hipsY + tj[1]];
  const ref: Vec2 = [torso[0], torso[1] - 6];
  const v = rot([target[0] - ref[0], target[1] - ref[1]], turn);
  return [joint[0] + v[0], joint[1] + v[1]];
}

function runArms(t: number, released: boolean): Pose2D {
  const body = runBody(t);
  const arms = released ? releasePose(1) : aimPose(1, 1);
  const right = released ? ([ANCHOR[0] + FLING[0], ANCHOR[1] + FLING[1]] as Vec2) : ANCHOR;
  return layer(STAND, body, {
    slots: arms.slots,
    ik: { 'hand.l': { target: follow(BOW_HAND, body), bend: -1 }, 'hand.r': { target: follow(right, body), bend: -1 } },
    bones: { bow: { wr: -4 }, 'hand.r': { wr: 150 } },
    draw: arms.draw,
    arrow: arms.arrow,
    z: arms.z,
  });
}

const runAim: Clip2D = { name: 'runAim', duration: RUN, loop: true, pose: (t) => runArms(t, false) };
const runRelease: Clip2D = { name: 'runRelease', duration: RUN, loop: true, pose: (t) => runArms(t, true) };

// --- Reactions ---------------------------------------------------------------------------------------------

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
        hips: { x: -16 * k, y: -5 * k },
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
        hips: { r: 80 * fall, y: KO_DROP * fall, x: KO_SLIDE * fall },
        // Chibi: the big head would sink through the floor lying flat, so the upper body stays propped a little.
        torso: { r: -14 * fall },
        head: { r: 16 * fall },
        'thigh.r': { r: 30 * fall },
        'shin.r': { r: -55 * fall },
        'thigh.l': { r: 20 * fall },
        'shin.l': { r: -40 * fall },
        // The near arm lies along the body; the feather flattens out on the ground behind the head.
        'upperArm.r': { r: 15 * fall },
        'forearm.r': { r: 20 * fall },
        'upperArm.l': { r: 40 * fall },
        bow: { wr: -14 + 104 * fall },
        hoodTip: { r: -30 * fall },
      },
    });
  },
};
/** How far the hips drop and slide forward as he falls (rig px). */
const KO_DROP = -200;
const KO_SLIDE = 120;

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
      slots: { ...FACE.happy, 'hand.r': 'hand-r-fist' },
      bones: {
        hips: { y: -45 * squat + CHEER_HOP * air, sy: 1 - 0.05 * squat + 0.03 * air },
        torso: { r: 4 * arms },
        head: { r: 8 * arms },
        'thigh.r': { r: 25 * air },
        'shin.r': { r: -45 * air },
        'thigh.l': { r: -10 * air },
        'shin.l': { r: -40 * air },
        'upperArm.l': { r: 150 * arms },
        'forearm.l': { r: -10 * arms },
        bow: { wr: -14 + 4 * arms },
        'hand.r': { wr: 175, ww: arms },
        hoodTip: { r: -20 * air },
      },
      // The fist punches up beside the head.
      ik: { 'hand.r': { target: at(330, 470), bend: 1, w: arms } },
      z: arms > 0.3 ? { 'forearm-r': 67, 'hand-r-fist': 68 } : undefined,
    });
  },
};
/** Jump height of the cheer (rig px). */
const CHEER_HOP = 110;

export const archerClips: Clip2D[] = [idle, walk, run, shoot, rapid, aim, loose, runAim, runRelease, hit, ko, cheer];
