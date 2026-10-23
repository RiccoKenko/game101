/**
 * The Deckhand's moves. Rotations in degrees (counter-clockwise), offsets in rig pixels (y-up).
 * Facing right: +r swings a hanging arm or leg forward; a negative torso r leans forward.
 * Near side = the character's right (.r, holds the cutlass), far side = left (.l).
 */
import { bounce, ease, key, osc } from '../../anim/curves';
import { layer, type Clip2D, type Pose2D } from '../pose';
import type { Vec2 } from '../rig';

/** The rig's ground point (art/rigs/deckhand.json). */
const GROUND: Vec2 = [485, 1295];
/** A point on the rig-pose picture (pixels, y-down) in character space. */
const at = (x: number, y: number): Vec2 => [x - GROUND[0], GROUND[1] - y];

const FACE = {
  sneaky: { eyes: 'eyes-sneaky', mouth: 'mouth-smirk' },
  greedy: { eyes: 'eyes-greedy', mouth: 'mouth-grin' },
  angry: { eyes: 'eyes-angry', mouth: 'mouth-gritted' },
  hurt: { eyes: 'eyes-hurt', mouth: 'mouth-ouch' },
  ko: { eyes: 'eyes-ko', mouth: 'mouth-o' },
  smug: { eyes: 'eyes-smug', mouth: 'mouth-tongue' },
  laugh: { eyes: 'eyes-closed', mouth: 'mouth-laugh' },
  surprised: { eyes: 'eyes-surprised', mouth: 'mouth-o' },
};

/** Cutlass in the near hand, the far hand in a fist, arms hanging a little closer than in the rig pose. */
export const STAND: Pose2D = {
  slots: { 'hand.l': 'hand-l-fist', 'hand.r': 'hand-r-grip', weapon: 'cutlass', loot: 'none', ...FACE.sneaky },
  bones: {
    'upperArm.r': { r: 10 },
    'forearm.r': { r: 14 },
    'upperArm.l': { r: -6 },
    'forearm.l': { r: 8 },
  },
};

/** Belly breathing and a cocky little sway, layered on stances so he is never frozen. */
const breathe = (t: number, amount = 1): Pose2D => ({
  bones: {
    hips: { y: -3 * amount * (1 + osc(t, 2.6)) },
    torso: { sy: 1 + 0.018 * amount * osc(t, 2.6, 0.15), sx: 1 - 0.008 * amount * osc(t, 2.6, 0.15), r: 1.5 * amount * osc(t, 5.2) },
    head: { r: 2.5 * amount * osc(t, 5.2, 0.3) },
    'upperArm.r': { r: 2 * amount * osc(t, 2.6, 0.4) },
    'upperArm.l': { r: -2 * amount * osc(t, 2.6, 0.45) },
  },
});

const idle: Clip2D = { name: 'idle', duration: 5.2, loop: true, pose: (t) => layer(STAND, breathe(t)) };

/**
 * A rolling pirate waddle: short bow-legged steps, the body rocking onto each foot and bobbing twice a cycle.
 * `p` is 0..1 through the cycle, `size` scales the swing.
 */
function waddle(p: number, size: number): Pose2D {
  const s = Math.sin(2 * Math.PI * p);
  const c = Math.cos(2 * Math.PI * p);
  const lift = (phase: number) => Math.max(0, Math.sin(2 * Math.PI * (p + phase)));
  return {
    bones: {
      hips: { y: -12 * size * Math.abs(Math.cos(2 * Math.PI * p)), r: 3 * size * s },
      torso: { r: -2 - 3 * size * s },
      head: { r: 3 * size * s },
      'thigh.r': { r: 24 * size * s },
      'shin.r': { r: -(4 + 34 * lift(0.25)) * size },
      'thigh.l': { r: -24 * size * s },
      'shin.l': { r: -(4 + 34 * lift(0.75)) * size },
      'upperArm.r': { r: -22 * size * s },
      'forearm.r': { r: 6 * size * c },
      'upperArm.l': { r: 18 * size * s },
      'forearm.l': { r: 10 * size * (1 + c) },
    },
  };
}

const walk: Clip2D = {
  name: 'walk',
  duration: 0.9,
  loop: true,
  pose: (t) => layer(STAND, waddle(t / 0.9, 0.85), breathe(t, 0.3)),
};

/** Charging in with the cutlass held high behind his head and a gritted grin. */
const run: Clip2D = {
  name: 'run',
  duration: 0.55,
  loop: true,
  pose: (t) =>
    layer(STAND, waddle(t / 0.55, 1.2), {
      slots: FACE.angry,
      bones: {
        hips: { y: 10 * bounce(t, 0.275) - 14 },
        torso: { r: -9 },
        head: { r: 5 },
        'upperArm.r': { r: -115 },
        'forearm.r': { r: -50 + 8 * osc(t, 0.55) },
        'hand.r': { r: -25 },
        'upperArm.l': { r: 20 },
        'forearm.l': { r: 60 },
      },
    }),
};

/** Running off with the stolen crystal hugged to his chest, grinning, cutlass gone. */
const carry: Clip2D = {
  name: 'carry',
  duration: 0.5,
  loop: true,
  pose: (t) =>
    layer(STAND, waddle(t / 0.5, 1.05), {
      slots: { ...FACE.greedy, weapon: 'none', loot: 'crystal', 'hand.r': 'hand-r-open', 'hand.l': 'hand-l-open' },
      bones: { hips: { y: 8 * bounce(t, 0.25) - 10 }, torso: { r: -6 }, head: { r: 4 } },
      // Both hands clutch the crystal in front of the belly; they ride along with the body's bob.
      ik: {
        'hand.r': { target: at(640, 650 + 10 * osc(t, 0.25)), bend: 1 },
        'hand.l': { target: at(700, 610 + 10 * osc(t, 0.25)), bend: 1 },
      },
      z: { 'forearm-r': 46, 'upper-arm-r': 47, 'hand-r-open': 48, 'hand-r-grip': 48 },
    }),
};

/** Staggers back from a hit, eyes squeezed shut, then shakes it off. */
const hit: Clip2D = {
  name: 'hit',
  duration: 0.4,
  loop: false,
  pose: (t) => {
    const k = key(t, [[0, 0], [0.05, 1, ease.out], [0.4, 0, ease.inOut]]);
    return layer(STAND, {
      slots: t < 0.3 ? FACE.hurt : FACE.angry,
      bones: {
        hips: { x: -16 * k, y: -6 * k, sx: 1 + 0.04 * k, sy: 1 - 0.04 * k },
        torso: { r: 13 * k },
        head: { r: 10 * k },
        'upperArm.r': { r: -35 * k },
        'forearm.r': { r: 25 * k },
        'upperArm.l': { r: 40 * k },
        'forearm.l': { r: -20 * k },
        'thigh.r': { r: 12 * k },
      },
    });
  },
};

/** Knocked out: a wobble, then flat on his back with his boots in the air, seeing spirals. */
const ko: Clip2D = {
  name: 'ko',
  duration: 1.0,
  loop: false,
  pose: (t) => {
    const fall = key(t, [[0, 0], [0.12, 0.08], [0.5, 1, ease.in], [0.62, 0.92, ease.out], [0.76, 1, ease.in]]);
    return layer(STAND, {
      slots: { ...(t < 0.12 ? FACE.hurt : FACE.ko), weapon: t < 0.3 ? 'cutlass' : 'none', 'hand.r': 'hand-r-open', 'hand.l': 'hand-l-open' },
      bones: {
        hips: { r: 84 * fall, y: -330 * fall, x: 230 * fall },
        torso: { r: 4 * fall },
        head: { r: 8 * fall },
        'thigh.r': { r: 40 * fall },
        'shin.r': { r: -30 * fall },
        'thigh.l': { r: 30 * fall },
        'shin.l': { r: -20 * fall },
        'upperArm.r': { r: -40 * fall },
        'forearm.r': { r: 15 * fall },
        'upperArm.l': { r: 50 * fall },
        'forearm.l': { r: -10 * fall },
      },
    });
  },
};

/** Fist on the hip, the other hand waggling by his face, tongue out: "Nyah!" */
const taunt: Clip2D = {
  name: 'taunt',
  duration: 1.4,
  loop: false,
  pose: (t) => {
    const up = key(t, [[0, 0], [0.18, 1, ease.back], [1.15, 1], [1.4, 0, ease.inOut]]);
    const wag = osc(t, 0.22) * up;
    return layer(STAND, breathe(t, 0.5), {
      slots: { ...(up > 0.4 ? FACE.smug : FACE.sneaky), weapon: 'none', 'hand.l': 'hand-l-open', 'hand.r': 'hand-r-open' },
      bones: {
        hips: { x: 8 * wag, r: -2 * wag },
        torso: { r: 4 * up + 2 * wag },
        head: { r: 6 * up - 4 * wag },
        // The near fist goes to the hip.
        'upperArm.r': { r: -12 * up },
        'forearm.r': { r: 70 * up },
        'hand.r': { r: 30 * wag },
      },
      ik: { 'hand.l': { target: at(760 + 18 * wag, 360), bend: -1, w: up } },
    });
  },
};

/** A hop with the cutlass thrust up and a big laugh (the pirates won, or a crystal got away). */
const cheer: Clip2D = {
  name: 'cheer',
  duration: 1.2,
  loop: false,
  pose: (t) => {
    const squat = key(t, [[0, 0], [0.1, 1, ease.out], [0.2, 0, ease.in], [0.55, 0], [0.62, 0.6, ease.out], [0.78, 0, ease.out]]);
    const air = key(t, [[0.16, 0], [0.36, 1, ease.out], [0.58, 0, ease.in]]);
    const arms = key(t, [[0.08, 0], [0.26, 1, ease.back], [0.95, 1], [1.2, 0, ease.inOut]]);
    return layer(STAND, {
      slots: FACE.laugh,
      bones: {
        hips: { y: -40 * squat + 110 * air, sy: 1 - 0.06 * squat + 0.03 * air },
        torso: { r: 5 * arms },
        head: { r: 8 * arms },
        'thigh.r': { r: 20 * air },
        'shin.r': { r: -30 * air },
        'thigh.l': { r: -12 * air },
        'shin.l': { r: -26 * air },
        'upperArm.r': { r: -125 * arms },
        'forearm.r': { r: -30 * arms },
        'upperArm.l': { r: 70 * arms },
        'forearm.l': { r: 80 * arms },
      },
    });
  },
};

export const deckhandClips: Clip2D[] = [idle, walk, run, carry, hit, ko, taunt, cheer];
