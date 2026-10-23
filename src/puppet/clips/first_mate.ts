/**
 * The First Mate's moves (the chapter-1 boss). Rotations in degrees (counter-clockwise), offsets in rig pixels (y-up).
 * Facing right: +r swings a hanging arm or leg forward; a negative torso r leans forward.
 * Near side = his right (.r, viewer's left: the anchor over his shoulder, or the sack's strap), far side = left (.l).
 * He is big and heavy: slow, wide moves that settle late, the boots planted with IK, and the coat tails, braid and
 * feather following through (they also swing on springs).
 */
import { ease, key, osc } from '../../anim/curves';
import { layer, poseKeys, type Clip2D, type Pose2D } from '../pose';
import type { Vec2 } from '../rig';

/** The rig's ground point (art/rigs/first_mate.json). */
const GROUND: Vec2 = [490, 1345];
/** A point on the rig-pose picture (pixels, y-down) in character space. */
const at = (x: number, y: number): Vec2 => [x - GROUND[0], GROUND[1] - y];
/** Where the ankles sit while marching (a little narrower than the rig pose's wide stance), for IK. */
const ANKLE_R = at(330, 1290);
const ANKLE_L = at(645, 1290);
/** The rig pose's wide stance, for standing still. */
const PLANT_R = at(300, 1290);
const PLANT_L = at(665, 1290);

const FACE = {
  fierce: { eye: 'eye-fierce', mouth: 'mouth-sneer' },
  grim: { eye: 'eye-fierce', mouth: 'mouth-gritted' },
  greedy: { eye: 'eye-greedy', mouth: 'mouth-laugh' },
  furious: { eye: 'eye-furious', mouth: 'mouth-gritted' },
  roar: { eye: 'eye-furious', mouth: 'mouth-roar' },
  hurt: { eye: 'eye-hurt', mouth: 'mouth-ouch' },
  ko: { eye: 'eye-ko', mouth: 'mouth-o' },
  smug: { eye: 'eye-smug', mouth: 'mouth-sneer' },
  laugh: { eye: 'eye-closed', mouth: 'mouth-laugh' },
  surprised: { eye: 'eye-surprised', mouth: 'mouth-o' },
};

/** The near forearm comes towards us when folded, so it is drawn shorter; the hand undoes the squash. */
const FORESHORTEN = 0.72;
/**
 * World angle of the anchor over his shoulder, as in the idle reference pose: the shank runs through the fist and
 * up over the shoulder, the crown and flukes stand up behind his head, and the stock and ring hang below the fist
 * with the chain dangling.
 */
const ON_SHOULDER = 205;
/** Draw order with the near arm folded: forearm over the upper arm, the shank over the shoulder, fingers over it. */
const Z_HOLD = { 'forearm-r': 42, anchor: 46, 'hand-r-grip': 47, 'hand-r-open': 47 };
/** Draw order with the near arm raised or flung out: arm, anchor and fist over everything, even the hat. */
const Z_RAISED = { 'upper-arm-r': 54, 'forearm-r': 55, anchor: 56, 'hand-r-grip': 57, 'hand-r-open': 57 };

/**
 * The near arm folded with its fist up by the collar, holding the anchor's shank (or the sack's strap) over the
 * shoulder. No slots, so a hit or a shout keeps whatever the march was carrying.
 */
const HOLD: Pose2D = {
  bones: {
    'upperArm.r': { r: 39 },
    'forearm.r': { r: 128, sy: FORESHORTEN },
    'hand.r': { sy: 1 / FORESHORTEN },
    anchor: { wr: ON_SHOULDER },
    sack: { wr: -12 },
    'upperArm.l': { r: 4 },
    'forearm.l': { r: 8 },
  },
  z: Z_HOLD,
};

/** Anchor on his shoulder, the other hand in a fist. */
export const STAND: Pose2D = layer(HOLD, {
  slots: { 'hand.l': 'hand-l-fist', 'hand.r': 'hand-r-grip', weapon: 'anchor', loot: 'none', ...FACE.fierce },
});

/** Both boots planted on the rig pose's wide stance (knees softened by however far the hips drop). */
const planted = (dx = 0): Pose2D => ({
  ik: {
    'foot.r': { target: [PLANT_R[0] + dx, PLANT_R[1]], bend: 1 },
    'foot.l': { target: [PLANT_L[0] + dx, PLANT_L[1]], bend: 1 },
  },
});

/** A slow, deep breath and a little sway, layered on stances so he is never frozen. */
const breathe = (t: number, amount = 1): Pose2D => ({
  bones: {
    hips: { y: -4 * amount * (1 + osc(t, 3)) },
    torso: { sy: 1 + 0.02 * amount * osc(t, 3, 0.15), sx: 1 + 0.01 * amount * osc(t, 3, 0.15), r: 1.2 * amount * osc(t, 6) },
    head: { r: 2 * amount * osc(t, 6, 0.3) },
    braid: { r: 2 * amount * osc(t, 3, 0.5) },
    feather: { r: 1.5 * amount * osc(t, 6, 0.6) },
    'upperArm.r': { r: 1.5 * amount * osc(t, 3, 0.4) },
    'upperArm.l': { r: -2 * amount * osc(t, 3, 0.45) },
  },
});

/** The far fist on his hip, elbow out, in front of the coat. */
const AKIMBO: Pose2D = {
  bones: { 'upperArm.l': { r: 18 }, 'forearm.l': { r: -58 }, 'hand.l': { r: 12 } },
  z: { ...Z_HOLD, 'forearm-l': 31, 'hand-l-fist': 32, 'hand-l-open': 32 },
};

/** Fist on his hip, anchor on his shoulder, chest out. */
const idle: Clip2D = {
  name: 'idle',
  duration: 6,
  loop: true,
  pose: (t) => layer(STAND, AKIMBO, breathe(t), planted(), { bones: { hips: { y: -6 } } }),
};

/** Where a boot is during a step cycle: planted and sliding back at ground speed, then lifted and swung forward. */
function foot(phase: number, reach: number, lift: number): Vec2 {
  const p = phase - Math.floor(phase);
  if (p < 0.5) return [reach * (1 - 4 * p), 0];
  const u = (p - 0.5) * 2;
  return [-reach + 2 * reach * ease.inOut(u), lift * Math.sin(Math.PI * u) ** 0.8];
}

/**
 * The heavy swaggering march: both boots planted with IK, knees bent under the weight, the hips dropping on
 * each stomp and rolling side to side, shoulders countering, coat tails and braid trailing.
 * `p` is 0..1 through the cycle (the near boot lands at 0, the far one at 0.5); `reach` is half the stride.
 */
function march(p: number, reach: number, lift = 45, swing = 1): Pose2D {
  const s = Math.sin(2 * Math.PI * p);
  const c = Math.cos(2 * Math.PI * p);
  // Down on each landing (twice a cycle), up as the free leg passes; deeper for longer strides.
  const stomp = Math.cos(4 * Math.PI * p);
  const drop = 8 + 0.27 * reach;
  const [rx, ry] = foot(p, reach, lift);
  const [lx, ly] = foot(p + 0.5, reach, lift);
  return {
    bones: {
      // Squash goes on the torso: scaling the hips would stretch the IK legs past their reach.
      hips: { y: -drop - 7 * stomp, r: 2.5 * c },
      torso: { r: -4 - 1.8 * c, sx: 1 + 0.015 * stomp, sy: 1 - 0.025 * stomp },
      head: { r: 1.5 * c + 1.5 * stomp },
      braid: { r: 4 * Math.cos(2 * Math.PI * (p - 0.15)) },
      feather: { r: -3 * stomp },
      'coat.r': { r: -3 * Math.sin(2 * Math.PI * (p - 0.12)) },
      'coat.l': { r: -3 * Math.sin(2 * Math.PI * (p + 0.38)) },
      // The far arm swings against the far leg.
      'upperArm.l': { r: 6 + 16 * swing * s },
      'forearm.l': { r: 10 + 10 * swing * Math.max(0, s) },
      'upperArm.r': { r: 1.5 * stomp },
      anchor: { wr: ON_SHOULDER + 2 * stomp },
    },
    ik: {
      'foot.r': { target: [ANKLE_R[0] + rx, ANKLE_R[1] + ry], bend: 1 },
      'foot.l': { target: [ANKLE_L[0] + lx, ANKLE_L[1] + ly], bend: 1 },
    },
  };
}

/**
 * In the game he is about 150 px tall (size ≈ 0.119) and marches at 28 px/s ≈ 236 rig px/s. A 1.1 s cycle then
 * needs a 130 px stride (each planted boot slides back ±65 px), so the boots keep pace with the ground.
 */
const SPEED = 236;
const WALK = 1.1;
const REACH = (SPEED * WALK) / 4;

const walk: Clip2D = {
  name: 'walk',
  duration: WALK,
  loop: true,
  pose: (t) => layer(STAND, march(t / WALK, REACH)),
};

/**
 * Off to the boat with the loot: the sack of crystals slung over his back by its strap, a slower, heavier march
 * (carrying, he goes at 0.9 × the pace: the same stride over a longer cycle), the free arm pumping, a greedy grin.
 */
const CARRY = WALK / 0.9;
const carry: Clip2D = {
  name: 'carry',
  duration: CARRY,
  loop: true,
  pose: (t) =>
    layer(STAND, march(t / CARRY, REACH, 40, 1.3), {
      slots: { ...FACE.greedy, weapon: 'none', loot: 'sack' },
      bones: {
        torso: { r: -3 },
        head: { r: 2 },
        sack: { wr: -12 + 5 * Math.sin(2 * Math.PI * (2 * t / CARRY - 0.2)) },
      },
    }),
};

/**
 * A heavy flinch (he is a boss: rocked, not knocked about): the body rocks back over planted boots, the eye
 * squeezes shut, then he shakes it off with a snarl. Ends on the march's first frame, where the loop restarts.
 */
const hit: Clip2D = {
  name: 'hit',
  duration: 0.4,
  loop: false,
  pose: (t) => {
    const k = key(t, [[0, 0], [0.06, 1, ease.out], [0.4, 0, ease.inOut]]);
    const shake = osc(t, 0.09) * key(t, [[0.1, 0], [0.18, 1], [0.34, 0]]);
    return layer(HOLD, march(0, REACH), {
      slots: t < 0.26 ? FACE.hurt : FACE.furious,
      bones: {
        hips: { x: -16 * k, y: -6 * k },
        torso: { r: 8 * k + 1.5 * shake, sx: 1 + 0.03 * k, sy: 1 - 0.04 * k },
        head: { r: 9 * k - 2 * shake },
        braid: { r: 10 * k },
        feather: { r: -12 * k },
        'coat.r': { r: 4 * k },
        'coat.l': { r: 4 * k },
        'upperArm.r': { r: 5 * k },
        'upperArm.l': { r: 28 * k },
        'forearm.l': { r: 20 * k },
        anchor: { wr: ON_SHOULDER + 8 * k },
      },
    });
  },
};

/**
 * The rally (every 7 s in the game): he sucks in a huge breath (chest up, leaning back, pointing arm drawn
 * back), then thrusts forward pointing at the enemy and ROARS, shaking with it. The boots keep marching (he
 * keeps walking while he shouts, a little faster: the rally speeds him up too); exactly one step cycle, so the
 * march picks up where it left off.
 */
const SHOUT = 1.0;
const shout: Clip2D = {
  name: 'shout',
  duration: SHOUT,
  loop: false,
  pose: (t) => {
    const breath = key(t, [[0, 0], [0.22, 1, ease.inOut], [0.3, 0, ease.in]]);
    const point = key(t, [[0.18, 0], [0.32, 1, ease.back], [0.82, 1], [1.0, 0, ease.inOut]]);
    const roar = key(t, [[0.26, 0], [0.32, 1, ease.out], [0.8, 1], [0.95, 0, ease.inOut]]);
    const quake = osc(t, 0.07) * roar;
    return layer(HOLD, march(t / SHOUT, (SPEED * 1.5 * SHOUT) / 4, 40, 0.3), {
      slots: {
        ...(roar > 0.1 ? FACE.roar : breath > 0.3 ? FACE.surprised : FACE.fierce),
        'hand.l': point > 0.15 ? 'hand-l-open' : 'hand-l-fist',
      },
      bones: {
        hips: { y: 6 * breath - 6 * roar },
        torso: { r: 8 * breath - 10 * roar + 1.2 * quake, sy: 1 + 0.04 * breath - 0.02 * roar, sx: 1 - 0.015 * breath + 0.03 * roar },
        head: { r: 7 * breath - 9 * roar - 2 * quake, x: 8 * roar },
        braid: { r: -8 * breath + 14 * roar + 4 * quake },
        feather: { r: 6 * breath - 10 * roar + 3 * quake },
        // The far arm draws back, then shoots out level, the open hand pointing ahead.
        'upperArm.l': { r: -24 * breath + 88 * point },
        'forearm.l': { r: -10 * point },
        'hand.l': { r: 34 * point },
        'upperArm.r': { r: -4 * breath + 3 * roar },
        anchor: { wr: ON_SHOULDER - 6 * breath + 4 * quake },
      },
    });
  },
};

/**
 * Knocked out: the blow lands, he wobbles on his heels, then topples over backwards like a felled mast (slow to
 * start, fast at the end), slams flat on his back with a bounce and lies still with his knees up, still clutching
 * the anchor. Falls to the left (behind him), about one body length.
 */
const ko: Clip2D = {
  name: 'ko',
  duration: 1.2,
  loop: false,
  pose: (t) => {
    const jolt = key(t, [[0, 0], [0.06, 1, ease.out], [0.22, 0.3, ease.inOut]]);
    const wobble = osc(t, 0.3) * key(t, [[0.1, 0], [0.2, 1], [0.38, 0]]);
    const fall = key(t, [[0.3, 0], [0.78, 1, ease.in], [0.86, 0.95, ease.out], [0.96, 1, ease.in]]);
    const thud = key(t, [[0.76, 0], [0.8, 1, ease.out], [1.05, 0, ease.inOut]]);
    const limp = key(t, [[0.7, 0], [1.1, 1, ease.out]]);
    const tilt = (88 * fall * Math.PI) / 180;
    // He drops the sack (the game scatters his crystals) but keeps hold of the anchor on his shoulder.
    return layer(STAND, {
      slots: { ...(t < 0.2 ? FACE.hurt : FACE.ko), 'hand.l': 'hand-l-open' },
      bones: {
        // Rocks back on his heels, then pivots over them: the hips swing round and down onto the coat.
        hips: {
          r: 6 * jolt + 3 * wobble + 88 * fall,
          x: -20 * jolt - 520 * Math.sin(tilt),
          y: -385 * (1 - Math.cos(tilt)),
        },
        torso: { r: 6 * jolt + 2 * wobble + 2 * fall, sx: 1 - 0.06 * thud, sy: 1 + 0.03 * thud },
        head: { r: 10 * jolt - 4 * wobble + 4 * fall - 10 * thud },
        braid: { r: 30 * fall + 10 * thud },
        feather: { r: 20 * fall - 15 * thud },
        // The coat tails flop down onto the ground under him.
        'coat.r': { r: -12 * fall },
        'coat.l': { r: -16 * fall },
        'upperArm.r': { r: 12 * jolt - 10 * fall },
        'upperArm.l': { r: 25 * jolt + 30 * fall - 75 * limp },
        'forearm.l': { r: 20 * fall - 10 * limp },
        // A world angle: the anchor turns with him and ends lying behind his head.
        anchor: { wr: ON_SHOULDER + 88 * fall },
      },
      // The boots stay where they stood as he goes over (knees up), then slump a little.
      ik: {
        'foot.r': { target: [PLANT_R[0] + 40 * limp, PLANT_R[1] + 20 * fall - 10 * limp], bend: 1 },
        'foot.l': { target: [PLANT_L[0] - 120 * fall + 30 * limp, PLANT_L[1] + 30 * fall - 15 * limp], bend: 1 },
      },
    });
  },
};

/**
 * Escaped at the dock: a big belly laugh, rocking back with his free hand on his belly ("Har! Har! Har!"),
 * then a smug last look. No weapon or loot slots, so he keeps the anchor or the sack he had.
 */
const taunt: Clip2D = {
  name: 'taunt',
  duration: 1.4,
  loop: false,
  pose: (t) => {
    const back = key(t, [[0, 0], [0.2, 1, ease.out], [1.05, 1], [1.4, 0.2, ease.inOut]]);
    // Three heaves of laughter.
    const har = Math.max(0, Math.sin((Math.PI * (t - 0.18)) / 0.25)) * key(t, [[0.15, 0], [0.25, 1], [0.95, 1], [1.05, 0]]);
    const smug = t > 1.02;
    return layer(HOLD, planted(), breathe(t, 0.4), {
      slots: { ...(smug ? FACE.smug : FACE.laugh), 'hand.l': 'hand-l-open' },
      bones: {
        hips: { y: -10 * back - 6 * har },
        torso: { r: 9 * back + 3 * har, sy: 1 + 0.025 * har - 0.02 * har },
        head: { r: 10 * back + 5 * har - (smug ? 6 : 0) },
        braid: { r: -6 * back - 8 * har },
        feather: { r: 5 * har },
        // The free hand pats his belly with each laugh.
        'upperArm.l': { r: 20 * back + 4 * har },
        'forearm.l': { r: -70 * back - 12 * har },
        'hand.l': { r: -10 * back },
        'upperArm.r': { r: -4 * har },
        anchor: { wr: ON_SHOULDER + 3 * har },
      },
      z: { ...Z_HOLD, 'forearm-l': 31, 'hand-l-fist': 32, 'hand-l-open': 32 },
    });
  },
};

/** The near arm unfolded, raising whatever it holds straight up over his head (0..1). */
const raise = (k: number): Pose2D => ({
  bones: {
    'upperArm.r': { r: -164 * k },
    'forearm.r': { r: -174 * k, sy: 1 + (1 / FORESHORTEN - 1) * k },
    'hand.r': { sy: 1 + (FORESHORTEN - 1) * k },
  },
});

/**
 * The pirates won: a crouch, then he heaves the anchor up over his head with the other fist punching the air,
 * stomps and laughs. It ends raised, since the game holds the last frame.
 */
const cheer: Clip2D = {
  name: 'cheer',
  duration: 1.2,
  loop: false,
  pose: (t) => {
    const crouch = key(t, [[0, 0], [0.18, 1, ease.inOut], [0.34, -0.3, ease.out], [0.5, 0, ease.inOut], [0.78, 0.5, ease.in], [0.9, 0, ease.out]]);
    const up = key(t, [[0.12, 0], [0.4, 1, ease.back]]);
    const pump = up * (1 + 0.08 * Math.sin(Math.PI * Math.max(0, (t - 0.5) / 0.2)));
    return layer(STAND, raise(up), planted(), {
      slots: up > 0.5 ? FACE.laugh : FACE.grim,
      bones: {
        hips: { y: -40 * crouch },
        torso: { r: -8 * crouch + 6 * up, sx: 1 + 0.03 * crouch, sy: 1 - 0.04 * crouch + 0.03 * up },
        head: { r: -6 * crouch + 10 * up },
        braid: { r: 10 * up - 6 * crouch },
        feather: { r: -10 * up },
        'upperArm.r': { r: 4 * Math.sin(Math.PI * Math.max(0, (t - 0.5) / 0.35)) },
        'upperArm.l': { r: 128 * pump },
        'forearm.l': { r: 38 * up },
        anchor: { wr: ON_SHOULDER + (180 - ON_SHOULDER) * up },
      },
      z: up > 0.4 ? Z_RAISED : Z_HOLD,
    });
  },
};

/** An overhead slam: the anchor heaved up and back, then brought down in front of him with a stomp (extra move). */
const SWING_WIND: Pose2D = {
  bones: {
    hips: { y: -20, x: -20 },
    torso: { r: 10 },
    head: { r: 8 },
    'upperArm.l': { r: -20 },
  },
};
const SWING_SLAM: Pose2D = {
  bones: {
    hips: { y: -55, x: 30 },
    torso: { r: -16, sx: 1.04, sy: 0.95 },
    head: { r: -8 },
    'upperArm.l': { r: 30 },
    'forearm.l': { r: 30 },
  },
};
const swing: Clip2D = {
  name: 'swing',
  duration: 1.1,
  loop: false,
  pose: (t) => {
    const lift = key(t, [[0, 0], [0.3, 1, ease.inOut], [0.82, 1], [1.08, 0, ease.inOut]]);
    // The arm swings from overhead down to the front (1), then back up overhead before it folds to the shoulder.
    const down = key(t, [[0.32, 0], [0.46, 1, ease.in], [0.6, 1], [0.82, 0, ease.inOut]]);
    const body = poseKeys(t, [[0, {}], [0.3, SWING_WIND], [0.46, SWING_SLAM, ease.in], [0.6, SWING_SLAM], [0.95, {}]]);
    const shake = osc(t, 0.06) * key(t, [[0.46, 1], [0.6, 0]]);
    return layer(STAND, raise(lift), planted(), body, {
      slots: t < 0.3 ? FACE.grim : t < 0.7 ? FACE.roar : FACE.fierce,
      bones: {
        'upperArm.r': { r: -130 * down },
        torso: { r: shake },
        anchor: { wr: key(t, [[0, ON_SHOULDER], [0.3, 225], [0.46, 50, ease.in], [0.6, 50], [0.82, 180, ease.inOut], [1.08, ON_SHOULDER, ease.inOut]]) },
        braid: { r: 12 * down - 8 * lift },
        feather: { r: -12 * down },
      },
      z: lift > 0.6 ? Z_RAISED : Z_HOLD,
    });
  },
  events: [[0.46, 'impact']],
};

export const firstMateClips: Clip2D[] = [idle, walk, carry, hit, ko, taunt, cheer, shout, swing];
