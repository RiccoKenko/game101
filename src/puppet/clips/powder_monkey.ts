/**
 * The Powder Monkey's moves. Rotations in degrees (counter-clockwise), offsets in rig pixels (y-up).
 * Facing right: +r swings a hanging arm or leg forward; a negative torso r leans forward; -r lifts the tail.
 * Near side = the monkey's right (.r, carries the bomb in its cupped hand), far side = left (.l).
 * Feet are placed with IK on the ankle bones (foot.r / foot.l): a planted foot slides back at exactly the speed the
 * game moves the pirate, so it does not skate.
 */
import { bounce, ease, key, osc } from '../../anim/curves';
import { layer, type Clip2D, type Pose2D } from '../pose';
import type { Vec2 } from '../rig';

/** The rig's ground point (art/rigs/powder_monkey.json). */
const GROUND: Vec2 = [536, 1325];
/** A point on the rig-pose picture (pixels, y-down) in character space. */
const at = (x: number, y: number): Vec2 => [x - GROUND[0], GROUND[1] - y];

/** Steps are timed for this in-game size (about 65 px tall) at the pirate's speed (px/s): rig px/s under a planted foot. */
const SIZE = 0.05;
const SPEED = 86;
const GROUND_SPEED = SPEED / SIZE;

// Where each foot cycles (ankle, character space): under its hip; the far foot stands a little higher (3/4 view).
const FOOT_R = at(462, 1234);
const FOOT_L = at(662, 1214);

const FACE = {
  cheeky: { eyes: 'eyes-cheeky', mouth: 'mouth-grin' },
  greedy: { eyes: 'eyes-greedy', mouth: 'mouth-laugh' },
  angry: { eyes: 'eyes-angry', mouth: 'mouth-gritted' },
  fierce: { eyes: 'eyes-angry', mouth: 'mouth-grin' },
  hurt: { eyes: 'eyes-hurt', mouth: 'mouth-ouch' },
  ko: { eyes: 'eyes-ko', mouth: 'mouth-o' },
  smug: { eyes: 'eyes-smug', mouth: 'mouth-tongue' },
  laugh: { eyes: 'eyes-closed', mouth: 'mouth-laugh' },
  surprised: { eyes: 'eyes-surprised', mouth: 'mouth-o' },
};

/** The bomb sits in the cupped near hand, held out in front of the chest; the far hand balls into a fist. */
export const STAND: Pose2D = {
  slots: { 'hand.l': 'hand-l-fist', 'hand.r': 'hand-r-hold', weapon: 'bomb', loot: 'none', ...FACE.cheeky },
  bones: {
    hips: { y: -14 },
    'upperArm.r': { r: 48 },
    'forearm.r': { r: 96 },
    'hand.r': { wr: 190 },
    'upperArm.l': { r: 10 },
    'forearm.l': { r: 40 },
    tail: { r: -8 },
    tail2: { r: -6 },
  },
  ik: { 'foot.r': { target: at(420, 1234), bend: 1 }, 'foot.l': { target: at(676, 1214), bend: 1 } },
};

/** Quick shallow breaths and a fidgety sway, layered on stances so it is never still. */
const breathe = (t: number, amount = 1): Pose2D => ({
  bones: {
    torso: { sy: 1 + 0.02 * amount * osc(t, 1.2), sx: 1 - 0.01 * amount * osc(t, 1.2), r: 1.5 * amount * osc(t, 2.4) },
    head: { r: 2.5 * amount * osc(t, 2.4, 0.3) },
    'upperArm.l': { r: 3 * amount * osc(t, 1.2, 0.4) },
    tail: { r: 6 * amount * osc(t, 2.4, 0.1) },
    tail2: { r: 9 * amount * osc(t, 2.4, 0.3) },
  },
});

interface Gait {
  /** Seconds per cycle (two steps). */
  period: number;
  /** Share of the cycle each foot is on the ground. */
  duty: number;
  /** How high a swinging foot lifts, how low the hips ride, and how much they bob. */
  lift: number;
  crouch: number;
  bob: number;
  /** Torso lean (negative = forward). */
  lean: number;
  /** Ground speed as a share of SPEED (the carry is slower). */
  pace?: number;
}

/**
 * A quick scurry: short bent-kneed steps, each planted foot sliding back at ground speed, the swinging foot
 * kicking up behind and reaching forward; hips bob twice a cycle, lowest when a foot is under them.
 * `t` is seconds; the far foot runs half a cycle behind the near one.
 */
function scurry(t: number, g: Gait): Pose2D {
  const p = (t / g.period) % 1;
  const stride = GROUND_SPEED * (g.pace ?? 1) * g.duty * g.period;
  const foot = (home: Vec2, phase: number): Vec2 => {
    const q = (p + phase) % 1;
    if (q < g.duty) return [home[0] + stride * (0.5 - q / g.duty), home[1]];
    const u = (q - g.duty) / (1 - g.duty);
    return [home[0] + stride * (ease.inOut(u) - 0.5), home[1] + g.lift * Math.sin(Math.PI * u ** 0.75)];
  };
  // 1 when a foot is right under the body, -1 in mid-flight.
  const low = Math.cos(4 * Math.PI * (p - g.duty / 2));
  const swing = Math.cos(2 * Math.PI * p);
  return {
    bones: {
      hips: { y: -g.crouch - g.bob * low, r: 2.5 * Math.sin(2 * Math.PI * p) },
      torso: { r: g.lean + 2 * low, sy: 1 - 0.035 * low, sx: 1 + 0.02 * low },
      head: { r: -g.lean * 0.45 - 2.5 * low },
      // The far arm pumps against the far leg.
      'upperArm.l': { r: 10 + 38 * swing },
      'forearm.l': { r: 70 + 18 * swing },
      // Tail and bandana stream back and wave a little behind the bob (springs add the rest).
      tail: { r: -22 + 7 * Math.cos(4 * Math.PI * (p - g.duty / 2) - 1.2) },
      tail2: { r: -12 + 10 * Math.cos(4 * Math.PI * (p - g.duty / 2) - 2) },
      'scarf.1': { r: -30 + 6 * Math.cos(4 * Math.PI * p - 1.5) },
      'scarf.2': { r: -38 + 7 * Math.cos(4 * Math.PI * p - 2.2) },
    },
    ik: { 'foot.r': { target: foot(FOOT_R, 0), bend: 1 }, 'foot.l': { target: foot(FOOT_L, 0.5), bend: 1 } },
  };
}

const RUN: Gait = { period: 0.4, duty: 0.42, lift: 150, crouch: 50, bob: 16, lean: -12 };

/** Bouncing on its toes, glancing about, tossing the bomb up and catching it. */
const idle: Clip2D = {
  name: 'idle',
  duration: 2.4,
  loop: true,
  pose: (t) => {
    const toss = key(t, [[1.1, 0], [1.42, 1, ease.out], [1.74, 0, ease.in]]);
    const dip = key(t, [[0.95, 0], [1.1, 1, ease.out], [1.2, 0, ease.out], [1.72, 0], [1.8, 1, ease.out], [2.0, 0, ease.inOut]]);
    const look = t > 1.1 && t < 1.8;
    return layer(STAND, breathe(t), {
      slots: look ? { eyes: 'eyes-greedy', mouth: 'mouth-grin' } : {},
      bones: {
        hips: { y: -10 * bounce(t, 0.3) - 14 * dip },
        head: { r: 5 * osc(t, 2.4) + (look ? 8 * toss : 0) },
        'forearm.r': { r: -14 * dip + 10 * toss },
        bomb: { y: -300 * toss, r: 200 * toss },
      },
    });
  },
};

/** The normal scurry with the bomb held out front, bobbing a beat behind the body. */
const walk: Clip2D = {
  name: 'walk',
  duration: RUN.period,
  loop: true,
  pose: (t) => {
    const p = t / RUN.period;
    const lag = Math.cos(4 * Math.PI * (p - RUN.duty / 2) - 1);
    return layer(STAND, scurry(t, RUN), {
      bones: {
        'upperArm.r': { r: 4 * lag },
        'forearm.r': { r: -6 * lag },
        bomb: { r: 6 * lag },
      },
    });
  },
};

export const powderMonkeyClips: Clip2D[] = [idle, walk];
