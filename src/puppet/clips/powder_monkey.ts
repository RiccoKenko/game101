/**
 * The Powder Monkey's moves. Rotations in degrees (counter-clockwise), offsets in rig pixels (y-up).
 * Facing right: +r swings a hanging arm or leg forward; a negative torso r leans forward; -r lifts the tail.
 * Near side = the monkey's right (.r, hugs the bomb in its cupped hand), far side = left (.l).
 * Feet are placed with IK on the ankle bones (foot.r / foot.l): a planted foot slides back at exactly the speed the
 * game moves the pirate, so it does not skate. Hands that must land on something (the bomb, the crystal on its
 * head, an eyelid) use IK too, through `reach`, which also lets the stubby arms stretch a little.
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

// Rest ankles, and where each foot cycles when running (under its hip); the far foot stands higher (3/4 view).
const ANKLE_R = at(420, 1234);
const ANKLE_L = at(676, 1214);
const FOOT_R = at(462, 1234);
const FOOT_L = at(662, 1214);
const WAIST = at(566, 837);
const SHOULDER_R = at(432, 604);
const SHOULDER_L = at(700, 604);

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

/** Where a point fixed to the torso (character space at rest) is after the hips move by (hx, hy) and the torso turns by r. */
function onTorso(p: Vec2, hx: number, hy: number, r: number): Vec2 {
  const c = Math.cos((r * Math.PI) / 180);
  const s = Math.sin((r * Math.PI) / 180);
  const dx = p[0] - WAIST[0];
  const dy = p[1] - WAIST[1];
  return [WAIST[0] + hx + dx * c - dy * s, WAIST[1] + hy + dx * s + dy * c];
}

/** Where the body is: hips offset and torso turn, so hands can be aimed at points that ride on it. */
interface Body {
  hx: number;
  hy: number;
  tr: number;
}

/**
 * Puts a wrist on `target` (a rest-pose point that rides on the torso), the arm scaled by `k` (a cartoon stretch:
 * IK aims at the unscaled point that the scaled arm then reaches). `w` fades it in.
 */
function reach(side: 'r' | 'l', target: Vec2, body: Body, k = 1, bend = 1, w = 1): Pose2D {
  const s = onTorso(side === 'r' ? SHOULDER_R : SHOULDER_L, body.hx, body.hy, body.tr);
  const t = onTorso(target, body.hx, body.hy, body.tr);
  const kk = 1 + (k - 1) * w;
  return {
    bones: { [`upperArm.${side}`]: { sx: kk, sy: kk } },
    ik: { [`hand.${side}`]: { target: [s[0] + (t[0] - s[0]) / kk, s[1] + (t[1] - s[1]) / kk], bend, w } },
  };
}

/** The near wrist under the bomb, hugged to the chest; `dy` lifts it (e.g. a lagging bounce). */
const BOMB_WRIST = at(636, 791);
const bombHand = (body: Body, dy = 0, w = 1): Pose2D =>
  layer({ bones: { 'hand.r': { wr: 190, ww: w } } }, reach('r', [BOMB_WRIST[0], BOMB_WRIST[1] + dy], body, 1, -1, w));

/** A world offset (y-up) for the bomb bone, which hangs off the near hand when that is turned to `wr` 190. */
function inHand(x: number, y: number): { x: number; y: number } {
  const a = (-190 * Math.PI) / 180;
  return { x: x * Math.cos(a) - y * Math.sin(a), y: x * Math.sin(a) + y * Math.cos(a) };
}

/** Feet planted at rest (IK), so the hips can bob and squat over them. */
const PLANTED: Pose2D = { ik: { 'foot.r': { target: ANKLE_R, bend: 1 }, 'foot.l': { target: ANKLE_L, bend: 1 } } };

/** The body of the ready crouch: bent knees, the bomb hugged to the chest in the cupped near hand, far fist low. */
const STAND_BODY: Pose2D = layer(PLANTED, bombHand({ hx: 0, hy: -14, tr: 0 }), {
  bones: {
    hips: { y: -14 },
    'upperArm.l': { r: 8 },
    'forearm.l': { r: 34 },
    tail: { r: -14 },
    tail2: { r: -8 },
  },
});
export const STAND: Pose2D = layer(STAND_BODY, {
  slots: { 'hand.l': 'hand-l-fist', 'hand.r': 'hand-r-hold', weapon: 'bomb', loot: 'none', ...FACE.cheeky },
});

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
  /** How far the far arm pumps (0 when both hands are busy). */
  pump?: number;
}

// Legs at rest (hip, knee, ankle) and the hips joint they hang from, to predict the shin's turn under IK.
const HIPS = at(566, 867);
const LEG = {
  r: [at(452, 912), at(417, 1062), at(402, 1234)],
  l: [at(654, 902), at(676, 1044), at(670, 1214)],
} as const;
/** Sole points around the ankle (rig px, y-up): heel, heel pad, ball, toe tip. The pad is lowest at rest. */
const SOLE: Vec2[] = [[-35, -102], [-1, -112], [124, -93], [139, -57]];

/**
 * How far to raise an ankle target so its foot, turned with the shin, does not dig into the ground: the heel
 * comes up as the foot pushes off behind the body and the toes as it reaches forward.
 */
function footLift(side: 'r' | 'l', target: Vec2, hy: number, hr: number): number {
  const [h0, k0, a0] = LEG[side];
  const c = Math.cos((hr * Math.PI) / 180);
  const s = Math.sin((hr * Math.PI) / 180);
  const hip: Vec2 = [HIPS[0] + (h0[0] - HIPS[0]) * c - (h0[1] - HIPS[1]) * s, HIPS[1] + hy + (h0[0] - HIPS[0]) * s + (h0[1] - HIPS[1]) * c];
  const l1 = Math.hypot(k0[0] - h0[0], k0[1] - h0[1]);
  const l2 = Math.hypot(a0[0] - k0[0], a0[1] - k0[1]);
  const rest = Math.atan2(a0[1] - k0[1], a0[0] - k0[0]);
  let lift = 0;
  for (let i = 0; i < 3; i++) {
    const dx = target[0] - hip[0];
    const dy = target[1] + lift - hip[1];
    const d = Math.min(l1 + l2 - 1e-3, Math.max(Math.abs(l1 - l2) + 1e-3, Math.hypot(dx, dy)));
    const seg1 = Math.atan2(dy, dx) + Math.acos(Math.min(1, Math.max(-1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d))));
    const knee: Vec2 = [hip[0] + l1 * Math.cos(seg1), hip[1] + l1 * Math.sin(seg1)];
    const phi = Math.atan2(target[1] + lift - knee[1], target[0] - knee[0]) - rest;
    const low = Math.min(...SOLE.map(([x, y]) => x * Math.sin(phi) + y * Math.cos(phi)));
    lift = Math.max(0, -low - 112);
  }
  return lift;
}

/** Hips and torso of a gait at time t (for aiming hands at things on the body). */
function gaitBody(t: number, g: Gait): Body & { low: number } {
  const p = (t / g.period) % 1;
  const low = Math.cos(4 * Math.PI * (p - g.duty / 2));
  return { hx: 0, hy: -14 - g.crouch - g.bob * low, tr: g.lean + 2 * low, low };
}

/**
 * A quick scurry: short bent-kneed steps, each planted foot sliding back at ground speed, the swinging foot
 * kicking up behind and reaching forward; hips bob twice a cycle, lowest when a foot is under them.
 * `t` is seconds; the far foot runs half a cycle behind the near one. Meant to be layered on STAND.
 */
function scurry(t: number, g: Gait): Pose2D {
  const p = (t / g.period) % 1;
  const stride = GROUND_SPEED * (g.pace ?? 1) * g.duty * g.period;
  const { low, hy } = gaitBody(t, g);
  const hr = 2.5 * Math.sin(2 * Math.PI * p);
  const foot = (side: 'r' | 'l', home: Vec2, phase: number): Vec2 => {
    const q = (p + phase) % 1;
    const u = (q - g.duty) / (1 - g.duty);
    const x = q < g.duty ? home[0] + stride * (0.5 - q / g.duty) : home[0] + stride * (ease.inOut(u) - 0.5);
    const up = q < g.duty ? 0 : g.lift * Math.sin(Math.PI * u ** 0.75);
    return [x, home[1] + Math.max(up, footLift(side, [x, home[1]], hy, hr))];
  };
  const swing = Math.cos(2 * Math.PI * p);
  const pump = g.pump ?? 1;
  return {
    bones: {
      hips: { y: -g.crouch - g.bob * low, r: hr },
      torso: { r: g.lean + 2 * low, sy: 1 - 0.035 * low, sx: 1 + 0.02 * low },
      head: { r: -g.lean * 0.45 - 2.5 * low },
      // The far arm pumps against the far leg (STAND's far arm is undone first).
      'upperArm.l': { r: -8 + (2 + 38 * swing) * pump },
      'forearm.l': { r: -34 + (60 + 20 * swing) * pump },
      // Tail and bandana stream back and wave a little behind the bob (springs add the rest).
      tail: { r: -10 + 7 * Math.cos(4 * Math.PI * (p - g.duty / 2) - 1.2) },
      tail2: { r: -2 + 10 * Math.cos(4 * Math.PI * (p - g.duty / 2) - 2) },
      'scarf.1': { r: -30 + 6 * Math.cos(4 * Math.PI * p - 1.5) },
      'scarf.2': { r: -38 + 7 * Math.cos(4 * Math.PI * p - 2.2) },
    },
    ik: { 'foot.r': { target: foot('r', FOOT_R, 0), bend: 1 }, 'foot.l': { target: foot('l', FOOT_L, 0.5), bend: 1 } },
  };
}

/** Normal scurry (86 px/s at size 0.05): 0.4 s a cycle, a 290 rig px sweep under each planted foot. */
const RUN: Gait = { period: 0.4, duty: 0.42, lift: 150, crouch: 50, bob: 16, lean: -12 };
/** Bomb overhead: a touch quicker. */
const DASH: Gait = { period: 0.34, duty: 0.4, lift: 140, crouch: 46, bob: 18, lean: -8 };
/** Off with the loot (0.75 of the speed): steadier, the head held level under the crystal. */
const HAUL: Gait = { period: 0.44, duty: 0.44, lift: 120, crouch: 56, bob: 12, lean: -5, pace: 0.75, pump: 0 };

/** Bouncing on its toes, far fist up like a little boxer, glancing about, tossing the bomb and catching it. */
const idle: Clip2D = {
  name: 'idle',
  duration: 2.4,
  loop: true,
  pose: (t) => {
    const toss = key(t, [[1.1, 0], [1.42, 1, ease.out], [1.74, 0, ease.in]]);
    const dip = key(t, [[0.95, 0], [1.1, 1, ease.out], [1.2, 0, ease.out], [1.72, 0], [1.8, 1, ease.out], [2.0, 0, ease.inOut]]);
    const hop = bounce(t, 0.3);
    const hy = -14 - 10 * hop - 14 * dip;
    const look = t > 1.1 && t < 1.8;
    // A cocky glance back over its shoulder first.
    const smirk = key(t, [[0.3, 0], [0.4, 1, ease.back], [0.75, 1], [0.85, 0, ease.inOut]]);
    const face: Record<string, string> = look ? { eyes: 'eyes-greedy', mouth: 'mouth-grin' } : smirk > 0.5 ? { eyes: 'eyes-smug', mouth: 'mouth-grin' } : {};
    return layer(STAND, breathe(t), bombHand({ hx: 0, hy, tr: 0 }, 30 * dip - 20 * toss), {
      slots: face,
      bones: {
        hips: { y: -10 * hop - 14 * dip },
        head: { r: 5 * osc(t, 2.4) + (look ? 8 * toss : 0) + 7 * smirk },
        torso: { r: 3 * smirk },
        tail: { r: -14 * smirk },
        tail2: { r: 18 * smirk * osc(t, 0.2) },
        'upperArm.l': { r: 30 + 4 * osc(t, 0.6) },
        'forearm.l': { r: 60 },
        // The bomb bone hangs off the cupped hand (turned 190°): an offset up and forward in the world.
        bomb: { ...inHand(300 * toss, 470 * toss), r: -220 * toss },
      },
      z: toss > 0.05 ? { bomb: 55 } : {},
    });
  },
};

/** The normal scurry with the bomb hugged to the chest, bobbing a beat behind the body. */
const walk: Clip2D = {
  name: 'walk',
  duration: RUN.period,
  loop: true,
  pose: (t) => {
    const body = gaitBody(t, RUN);
    const lag = Math.cos(4 * Math.PI * (t / RUN.period - RUN.duty / 2) - 1);
    return layer(STAND, scurry(t, RUN), bombHand(body, 14 * lag), { bones: { bomb: { r: 6 * lag } } });
  },
};

/** Charging with the bomb held up on its head, eyes narrowed, grinning. */
const BOMB_TOP_R = at(452, 300);
const bombRun: Clip2D = {
  name: 'bomb-run',
  duration: DASH.period,
  loop: true,
  pose: (t) => {
    const body = gaitBody(t, DASH);
    return layer(STAND, scurry(t, DASH), reach('r', BOMB_TOP_R, body, 1.12, -1), {
      slots: FACE.fierce,
      bones: { 'hand.r': { wr: 150 }, head: { r: 3 }, bomb: { r: 4 * Math.sin((2 * Math.PI * t) / DASH.period) } },
      z: { 'upper-arm-r': 53, 'forearm-r': 56, 'hand-r-hold': 57, bomb: 55 },
    });
  },
};

/** Running away with the crystal on its head, steadied with both hands, laughing greedily. */
const LOOT_R = at(440, 250);
const LOOT_L = at(592, 258);
const carry: Clip2D = {
  name: 'carry',
  duration: HAUL.period,
  loop: true,
  pose: (t) => {
    const body = gaitBody(t, HAUL);
    return layer(STAND, scurry(t, HAUL), reach('r', LOOT_R, body, 1.15, -1), reach('l', LOOT_L, body, 1.2, 1), {
      slots: { ...FACE.greedy, weapon: 'none', loot: 'crystal', 'hand.r': 'hand-r-open', 'hand.l': 'hand-l-open' },
      bones: { 'hand.r': { wr: 175 }, 'hand.l': { wr: 200 }, head: { r: 2 }, loot: { x: 40, y: -36, r: 3 * Math.sin((2 * Math.PI * t) / HAUL.period) } },
      z: { 'upper-arm-r': 53, 'forearm-r': 56, 'hand-r-open': 57, 'hand-l-open': 53 },
    });
  },
};

/** Knocked back on its heels, eyes squeezed shut, far arm flung up, tail and bandana jolted; then shakes it off. */
const hit: Clip2D = {
  name: 'hit',
  duration: 0.4,
  loop: false,
  pose: (t) => {
    const k = key(t, [[0, 0], [0.05, 1, ease.out], [0.3, -0.12, ease.inOut], [0.4, 0, ease.inOut]]);
    const shake = t < 0.3 ? 4 * osc(t, 0.07) * (1 - t / 0.3) : 0;
    return layer(STAND_BODY, {
      slots: t < 0.26 ? FACE.hurt : FACE.angry,
      bones: {
        hips: { x: -34 * k, y: -10 * k },
        torso: { r: 16 * k, sx: 1 + 0.05 * k, sy: 1 - 0.06 * k },
        head: { r: 14 * k + shake, sx: 1 + 0.04 * k, sy: 1 - 0.04 * k },
        'upperArm.l': { r: 60 * k },
        'forearm.l': { r: 40 * k },
        bomb: { r: -18 * k },
        tail: { r: 25 * k },
        tail2: { r: -20 * k },
        'scarf.1': { r: 20 * k },
        'scarf.2': { r: 15 * k },
      },
    });
  },
};

/**
 * Knocked out: a stagger, then flung onto its back, head on the ground and feet in the air, seeing spirals.
 * Whatever is in its hands stays there (the bomb flops with the arm); the loot drops (the game shows it floating home).
 */
const ko: Clip2D = {
  name: 'ko',
  duration: 1.0,
  loop: false,
  pose: (t) => {
    const fall = key(t, [[0, 0], [0.12, 0.06], [0.46, 1, ease.in], [0.58, 0.9, ease.out], [0.72, 1, ease.in]]);
    const w = 1 - Math.min(1, fall * 1.5);
    const twitch = t > 0.75 ? 6 * key(t, [[0.75, 0], [0.82, 1], [0.9, 0]]) : 0;
    return layer(STAND_BODY, {
      slots: { ...(t < 0.12 ? FACE.hurt : FACE.ko), loot: 'none' },
      bones: {
        hips: { r: 74 * fall, y: -272 * fall, x: 150 * fall },
        torso: { r: 6 * fall },
        head: { r: 12 * fall },
        'thigh.r': { r: 45 * fall + twitch },
        'shin.r': { r: -45 * fall },
        'thigh.l': { r: 30 * fall },
        'shin.l': { r: -35 * fall - twitch },
        'upperArm.r': { r: 40 * fall },
        'forearm.r': { r: -20 * fall },
        'hand.r': { wr: 190, ww: w },
        'upperArm.l': { r: 70 * fall },
        'forearm.l': { r: 20 * fall },
        tail: { r: 30 * fall },
        tail2: { r: 20 * fall },
        'scarf.1': { r: 30 * fall },
        'scarf.2': { r: 25 * fall },
      },
      ik: {
        'foot.r': { target: ANKLE_R, bend: 1, w },
        'foot.l': { target: ANKLE_L, bend: 1, w },
        'hand.r': { target: at(636, 791), bend: -1, w: 0 },
      },
    });
  },
};

/** Pulls down an eyelid with one finger, tongue out, fist on the hip and a wiggle: "Nyah!" (Any loot stays on its head.) */
const taunt: Clip2D = {
  name: 'taunt',
  duration: 1.4,
  loop: false,
  pose: (t) => {
    const crouch = key(t, [[0, 0], [0.12, 1, ease.out], [0.26, 0, ease.out]]);
    const up = key(t, [[0.1, 0], [0.28, 1, ease.back], [1.15, 1], [1.4, 0, ease.inOut]]);
    const wag = osc(t, 0.22) * up;
    const body: Body = { hx: 10 * wag, hy: -14 - 30 * crouch, tr: 4 * up + 3 * wag };
    // Hands travel from the sides (where they start after the run) to the eyelid and the hip.
    const lerp = (a: Vec2, b: Vec2): Vec2 => [a[0] + (b[0] - a[0]) * up, a[1] + (b[1] - a[1]) * up];
    return layer(STAND, breathe(t, 0.5), reach('r', lerp(at(310, 850), at(545, 494)), body, 1, -1), reach('l', lerp(at(820, 860), at(740, 842)), body, 1, -1), {
      slots: { ...(up > 0.5 ? FACE.smug : FACE.cheeky), weapon: 'none', 'hand.r': 'hand-r-fist', 'hand.l': 'hand-l-fist' },
      bones: {
        hips: { x: 10 * wag, y: -30 * crouch, r: -2 * wag },
        torso: { r: 4 * up + 3 * wag },
        head: { r: -5 * up - 5 * wag },
        'hand.r': { wr: 165 * up, ww: up },
        tail: { r: 20 * osc(t, 0.22, 0.25) * up },
        tail2: { r: 25 * osc(t, 0.22, 0.4) * up },
      },
      z: up > 0.2 ? { 'forearm-r': 55, 'hand-r-fist': 56 } : {},
    });
  },
};

/** A squat, a hop with both fists punched up and a big laugh (the pirates won); lands with a squash. */
const cheer: Clip2D = {
  name: 'cheer',
  duration: 1.2,
  loop: false,
  pose: (t) => {
    const squat = key(t, [[0, 0], [0.12, 1, ease.out], [0.2, 0, ease.in], [0.55, 0], [0.62, 0.7, ease.out], [0.8, 0, ease.out]]);
    const air = key(t, [[0.16, 0], [0.36, 1, ease.out], [0.58, 0, ease.in]]);
    const arms = key(t, [[0.13, 0], [0.3, 1, ease.back], [0.95, 1], [1.2, 0, ease.inOut]]);
    const shake = osc(t, 0.16) * arms * (t > 0.6 ? 1 : 0);
    const hy = -14 - 50 * squat + 170 * air;
    const body: Body = { hx: 0, hy, tr: 4 * arms };
    const tuck = 60 * air;
    return layer(STAND_BODY, reach('r', at(340 - 8 * shake, 320), body, 1.1, 1, arms), reach('l', at(845 + 8 * shake, 335), body, 1.1, -1, arms), {
      slots: { ...(t < 0.12 ? FACE.cheeky : FACE.laugh), weapon: 'none', loot: 'none', 'hand.r': 'hand-r-fist', 'hand.l': 'hand-l-fist' },
      bones: {
        hips: { y: -50 * squat + 170 * air },
        // Arms swing down and back while it squats, then shoot up (the IK takes over as `arms` grows).
        'upperArm.r': { r: -25 * squat },
        'upperArm.l': { r: -40 * squat - 8 },
        'forearm.l': { r: -20 },
        torso: { r: 4 * arms, sy: 1 - 0.07 * squat + 0.05 * air, sx: 1 + 0.04 * squat },
        head: { r: 8 * arms + 3 * shake },
        'hand.r': { wr: 185, ww: arms },
        'hand.l': { wr: 180, ww: arms },
        tail: { r: -30 * air },
        tail2: { r: -20 * air },
      },
      ik: {
        'foot.r': { target: [ANKLE_R[0] + 20 * air, ANKLE_R[1] + 170 * air + tuck], bend: 1 },
        'foot.l': { target: [ANKLE_L[0] - 10 * air, ANKLE_L[1] + 170 * air + tuck * 0.6], bend: 1 },
      },
      z: arms > 0.3 ? { 'upper-arm-r': 53, 'forearm-r': 55, 'hand-r-fist': 54 } : {},
    });
  },
};

export const powderMonkeyClips: Clip2D[] = [idle, walk, bombRun, carry, hit, ko, taunt, cheer];
