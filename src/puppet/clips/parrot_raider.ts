/**
 * The Parrot Raider's moves: a cheeky, fast flying thief. Rotations in degrees (counter-clockwise), offsets in
 * rig pixels (y-up). Facing right: a negative body r pitches the beak down (flying forward), +r rears back.
 * Near side = the wing, leg and foot towards the viewer (left in the rig pose; the near wing draws over the
 * body); the far wing sits behind the head. The near wing points up-left, so +r swings it down, while the far
 * wing points up and -r swings it down: `wings()` and `flap()` hide that, so clips think in "down" amounts.
 * The rig pose has both wings raised (the top of a beat). The far foot always grips the grappling hook's rope
 * (it dangles via `hang`); the near foot grips the stolen crystal while carrying.
 */
import { ease, key, osc } from '../../anim/curves';
import { layer, type Clip2D, type Pose2D } from '../pose';

const FACE = {
  cheeky: { eyes: 'eyes-cheeky', beak: 'beak-closed' },
  grin: { eyes: 'eyes-cheeky', beak: 'beak-laugh' },
  greedy: { eyes: 'eyes-greedy', beak: 'beak-laugh' },
  puff: { eyes: 'eyes-greedy', beak: 'beak-squawk' },
  angry: { eyes: 'eyes-angry', beak: 'beak-squawk' },
  hurt: { eyes: 'eyes-hurt', beak: 'beak-squawk' },
  ko: { eyes: 'eyes-ko', beak: 'beak-tongue' },
  surprised: { eyes: 'eyes-surprised', beak: 'beak-squawk' },
  smug: { eyes: 'eyes-smug', beak: 'beak-tongue' },
  laugh: { eyes: 'eyes-closed', beak: 'beak-laugh' },
};

/** Hovering: hook in the far grip, near foot open and empty, wings a touch lower than the rig pose. */
export const STAND: Pose2D = {
  slots: { 'foot.far': 'foot-far-grip', 'foot.near': 'foot-near-open', loot: 'none', hook: 'hook', ...FACE.cheeky },
  bones: {
    body: { r: 2 },
    head: { r: -2 },
    'leg.near': { r: -6 },
    'foot.near': { r: 4 },
    'leg.far': { r: -4 },
    'foot.far': { r: 6 },
  },
};

/**
 * One-shots that can interrupt `carry` leave the loot alone: without these slots in the pose the puppet keeps
 * showing what the loop showed (the crystal in the near grip, or nothing).
 */
function keepLoot(pose: Pose2D): Pose2D {
  const slots = { ...pose.slots };
  delete slots.loot;
  delete slots['foot.near'];
  return { ...pose, slots };
}

/** The near wing points up-left (+r swings it down), the far wing up (-r swings it down). */
const wings = (near: number, far: number, tipNear = 0, tipFar = 0): Pose2D => ({
  bones: {
    'wing.near': { r: near },
    'wingTip.near': { r: tipNear },
    'wing.far': { r: -far },
    'wingTip.far': { r: -tipFar },
  },
});

/** 0 = wings up, 1 = wings down, through one beat (p = 0..1): a quick downstroke and a slower recovery. */
const stroke = (p: number) => {
  const q = ((p % 1) + 1) % 1;
  return q < 0.42 ? ease.inOut(q / 0.42) : 1 - ease.inOut((q - 0.42) / 0.58);
};

/**
 * One wingbeat. `p` is 0..1 through the beat, `size` the stroke (degrees of the near wing's swing).
 * The wingtips trail the arm (overlapping action), the body lifts on each downstroke and the head stays level.
 */
function flap(p: number, size = 100, lift = 18): Pose2D {
  const d = stroke(p);
  // The tip lags the arm by a tenth of a beat: it bends up on the way down and down on the way up.
  const lag = (stroke(p - 0.1) - d) * 0.45;
  const rise = stroke(p - 0.18) - 0.5;
  return layer(wings(-8 + size * d, -6 + size * 0.95 * d, size * lag, size * lag * 0.9), {
    bones: {
      // Wings sweep the air; foreshortened a little at the middle of the stroke.
      'wing.near': { sy: 1 - 0.08 * Math.sin(Math.PI * d) },
      'wing.far': { sy: 1 - 0.1 * Math.sin(Math.PI * d) },
      body: { y: lift * rise, sy: 1 + 0.015 * rise, sx: 1 - 0.01 * rise },
      head: { y: -lift * 0.35 * rise, r: -2 * rise },
      tail: { r: 5 * (stroke(p - 0.3) - 0.5) },
      'leg.near': { r: 3 * rise },
      'leg.far': { r: 3 * rise },
      neckerchief: { r: 6 * osc(p, 0.5, 0.2) },
    },
  });
}

/**
 * The hook dangles from the far grip: cancel the turns above it so it hangs straight down, plus a swing.
 * `follow` (0..1) lets it turn partly with the body (a stiff rope): only for small turns, since after a whole
 * loop it would be left turned by `follow` × 360°.
 */
function hang(pose: Pose2D, swing = 0, follow = 0): Pose2D {
  const b = pose.bones ?? {};
  const r = (n: string) => b[n]?.r ?? 0;
  return layer(pose, { bones: { hook: { r: -(1 - follow) * (r('body') + r('leg.far') + r('foot.far')) + swing } } });
}

/** Hovering in place: fast, wide beats with an upright body, the hook swaying beneath. */
const idle: Clip2D = {
  name: 'idle',
  duration: 1.2,
  loop: true,
  pose: (t) =>
    hang(
      layer(STAND, flap(t / 0.3, 98, 14), {
        bones: {
          body: { r: 4 + 3 * osc(t, 1.2), x: 6 * osc(t, 1.2, 0.25), y: 6 * osc(t, 0.6) },
          head: { r: -3 * osc(t, 1.2) + 3 * osc(t, 1.2, 0.5) },
          tail: { r: 3 * osc(t, 1.2, 0.4) },
          'foot.near': { r: 6 * osc(t, 1.2, 0.3) },
        },
      }),
      7 * osc(t, 1.2, 0.1),
    ),
};

/** Flying forward: pitched beak-down, legs tucked back, strong beats (3.3 a second) bobbing the body. */
function cruise(t: number, beat: number, size: number, lift: number): Pose2D {
  const p = t / beat;
  return layer(STAND, flap(p, size, lift), {
    bones: {
      body: { r: -16 + 2 * osc(p, 1, 0.1) },
      head: { r: 12 },
      tail: { r: 6 },
      'leg.near': { r: -28 },
      'foot.near': { r: -22 },
      'leg.far': { r: -22 },
      'foot.far': { r: -14 },
    },
  });
}

const walk: Clip2D = {
  name: 'walk',
  duration: 0.6,
  loop: true,
  pose: (t) => hang(cruise(t, 0.3, 108, 22), 6 * osc(t, 0.6, 0.6)),
};

/** A dive: wings swept back, beak first (an extra, e.g. for swooping on the vault). */
const dive: Clip2D = {
  name: 'dive',
  duration: 0.4,
  loop: true,
  pose: (t) =>
    hang(
      layer(STAND, wings(62 + 6 * osc(t, 0.2), 38 + 6 * osc(t, 0.2, 0.3), -18, -10), {
        slots: { eyes: 'eyes-angry' },
        bones: {
          'wing.near': { sy: 0.9 },
          'wing.far': { sy: 0.85 },
          body: { r: -38, y: 4 * osc(t, 0.4) },
          head: { r: 18 },
          tail: { r: 12 + 3 * osc(t, 0.2, 0.25) },
          'leg.near': { r: -40 },
          'foot.near': { r: -30 },
          'leg.far': { r: -34 },
          'foot.far': { r: -20 },
          neckerchief: { r: 10 * osc(t, 0.1) },
        },
      }),
      10,
    ),
};

/**
 * Flying off with a crystal clutched in the near foot, slung under the chest: slower, heavier beats, the body
 * sagging lower between them, a greedy grin that puffs on each downstroke.
 */
const carry: Clip2D = {
  name: 'carry',
  duration: 0.8,
  loop: true,
  pose: (t) => {
    const p = t / 0.4;
    const effort = stroke(p);
    return hang(
      layer(STAND, flap(p, 112, 30), {
        slots: { ...(effort > 0.55 ? FACE.puff : FACE.greedy), 'foot.near': 'foot-near-grip', loot: 'crystal' },
        bones: {
          body: { r: -6 + 3 * osc(p, 1, 0.15), y: -14 },
          head: { r: 6 - 3 * effort },
          tail: { r: 2 },
          // The loot is slung forward under the chest, swinging a beat behind the body.
          'leg.near': { x: 55, y: 10, r: 34 + 5 * osc(p, 1, 0.35) },
          'foot.near': { r: 14 + 7 * osc(p, 1, 0.45) },
          'leg.far': { r: -34 },
          'foot.far': { r: -12 },
        },
        // The crystal is held out in front: over the near wing's downstroke.
        z: { crystal: 34, 'foot-near-grip': 35 },
      }),
      9 * osc(t, 0.8, 0.55),
    );
  },
};

/** Knocked back in the air: jerks backwards and up, wings flung, feathers puffed, then flaps to recover. */
const hit: Clip2D = {
  name: 'hit',
  duration: 0.4,
  loop: false,
  pose: (t) => {
    const k = key(t, [[0, 0], [0.05, 1, ease.out], [0.4, 0, ease.inOut]]);
    const ruffle = key(t, [[0, 0], [0.04, 1, ease.out], [0.22, 0, ease.out]]);
    // Flapping resumes as it recovers.
    const beat = flap(t / 0.3, 100 * (1 - k), 14);
    return keepLoot(hang(
      layer(STAND, beat, wings(-30 * k, -26 * k, 20 * k, 16 * k), {
        slots: t < 0.28 ? FACE.hurt : FACE.angry,
        bones: {
          body: { x: -44 * k, y: 18 * k, r: 24 * k, sx: 1 + 0.07 * ruffle, sy: 1 + 0.05 * ruffle },
          head: { r: 12 * k - 6 * ruffle },
          tail: { r: -16 * k + 10 * ruffle * osc(t, 0.08) },
          neckerchief: { r: 25 * ruffle * osc(t, 0.1) },
          'leg.near': { r: 26 * k },
          'foot.near': { r: 20 * k },
          'leg.far': { r: 22 * k },
          'foot.far': { r: 10 * k },
        },
      }),
      -28 * k,
      0.4,
    ));
  },
};

/** Knocked out: a jolt, then tumbling head over tail and dropping towards the ground, seeing spirals. */
const ko: Clip2D = {
  name: 'ko',
  duration: 1.0,
  loop: false,
  pose: (t) => {
    const jolt = key(t, [[0, 0], [0.06, 1, ease.out], [0.2, 0.4, ease.inOut]]);
    const spin = key(t, [[0.08, 0], [1.0, 1, ease.in]]);
    const drop = key(t, [[0.1, 0], [1.0, 1, ease.in]]);
    const limp = key(t, [[0.1, 0], [0.4, 1, ease.out]]);
    return hang(
      layer(STAND, wings(-26 * jolt + 40 * limp + 18 * limp * osc(t, 0.22), -20 * jolt + 30 * limp + 14 * limp * osc(t, 0.22, 0.3), 20 * limp, 14 * limp), {
        slots: { ...(t < 0.12 ? FACE.hurt : FACE.ko), 'foot.near': 'foot-near-open' },
        bones: {
          body: { r: 20 * jolt + 200 * spin, x: -30 * jolt - 60 * drop, y: 30 * jolt - 520 * drop },
          head: { r: 18 * limp },
          tail: { r: -20 * limp },
          neckerchief: { r: 20 * osc(t, 0.16) * limp },
          'leg.near': { r: 30 * limp },
          'foot.near': { r: 20 * limp },
          'leg.far': { r: 36 * limp },
          'foot.far': { r: 16 * limp },
        },
      }),
      40 * limp * osc(t, 0.5, 0.1),
    );
  },
};

/** At the dock: hovers, sticks its tongue out and waggles the near wing at you. "Squawk! Too slow!" */
const taunt: Clip2D = {
  name: 'taunt',
  duration: 1.4,
  loop: false,
  pose: (t) => {
    const up = key(t, [[0, 0], [0.16, 1, ease.back], [1.15, 1], [1.4, 0, ease.inOut]]);
    const wag = osc(t, 0.2) * up;
    // The far wing keeps it aloft; the near wing is raised high to wave.
    const beat = flap(t / 0.3, 98, 12);
    return keepLoot(hang(
      layer(STAND, beat, {
        slots: up > 0.4 ? FACE.smug : FACE.cheeky,
        bones: {
          // Override the near wing: lifted back and waggling (cancel its beat with the rest of the pose).
          'wing.near': { r: -(beat.bones!['wing.near'].r ?? 0) * up + (-14 + 30 * wag) * up },
          'wingTip.near': { r: -(beat.bones!['wingTip.near'].r ?? 0) * up + 16 * osc(t, 0.2, 0.2) * up },
          body: { r: 8 * up - 3 * wag, x: 6 * wag },
          head: { r: -6 * up + 7 * osc(t, 0.4, 0.1) * up },
          tail: { r: 8 * osc(t, 0.2, 0.3) * up },
          'leg.near': { r: 14 * up },
          'foot.near': { r: 10 * up },
        },
      }),
      5 * osc(t, 0.7),
    ));
  },
};

/** The pirates won (or a crystal got away): a loop-de-loop, then wings thrown up with a big laugh. */
const cheer: Clip2D = {
  name: 'cheer',
  duration: 1.2,
  loop: false,
  pose: (t) => {
    // Anticipation dip, the loop (a full backwards turn while rising on a circle), then a whoop.
    const loop = key(t, [[0.12, 0], [0.72, 1, ease.inOut]]);
    const dip = key(t, [[0, 0], [0.12, 1, ease.out], [0.3, 0, ease.in]]);
    const whoop = key(t, [[0.66, 0], [0.82, 1, ease.back], [1.08, 1], [1.2, 0.6, ease.inOut]]);
    const a = 2 * Math.PI * loop;
    const radius = 150;
    const beat = flap(t / 0.24, 90 * (1 - whoop), 10);
    return keepLoot(hang(
      layer(STAND, beat, wings(-36 * whoop + 8 * whoop * osc(t, 0.12), -30 * whoop + 8 * whoop * osc(t, 0.12, 0.3), 10 * whoop, 8 * whoop), {
        slots: t < 0.12 ? FACE.grin : FACE.laugh,
        bones: {
          body: { r: 360 * loop + 6 * whoop, x: radius * Math.sin(a) * 0.6, y: radius * (1 - Math.cos(a)) - 30 * dip + 30 * whoop, sy: 1 - 0.05 * dip },
          head: { r: 10 * whoop + 6 * dip },
          tail: { r: -10 * dip + 12 * Math.sin(a) },
          'leg.near': { r: 20 * whoop - 20 * Math.sin(a) },
          'foot.near': { r: 15 * whoop },
          'leg.far': { r: 16 * whoop },
        },
      }),
      // Flung outwards round the loop.
      -40 * Math.sin(a) + 10 * whoop * osc(t, 0.5),
    ));
  },
};

export const parrotRaiderClips: Clip2D[] = [idle, walk, carry, hit, ko, taunt, cheer, dive];
