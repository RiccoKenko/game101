/**
 * Talon's moves (the hero's eagle). Rotations in degrees (counter-clockwise), offsets in rig pixels (y-up).
 * Facing right. The rig pose has both wings raised: that is the top of a wingbeat.
 * Near wing (the big one, up and back): +r sweeps it down and back (the downstroke), -r lifts it higher.
 * Far wing (behind the head): -r swings it down to the right, +r folds it back over the shoulders.
 * `wingtip.*` is the feather fan under each wing's arm: it lags behind the arm for follow-through.
 * Legs hang from the hips: +r swings the feet forward (talons out), -r tucks them back under the tail.
 * Scaling a wing bone squashes it in the rig pose's axes: sx narrows a raised wing, sy shortens it.
 */
import { ease, key, osc } from '../../anim/curves';
import { layer, type Clip2D, type Pose2D } from '../pose';

const FACE = {
  confident: { eyes: 'eyes-confident', beak: 'beak-closed' },
  determined: { eyes: 'eyes-determined', beak: 'beak-closed' },
  focus: { eyes: 'eyes-fierce', beak: 'beak-closed' },
  fierce: { eyes: 'eyes-fierce', beak: 'beak-cry' },
  proud: { eyes: 'eyes-proud', beak: 'beak-closed' },
  happy: { eyes: 'eyes-happy', beak: 'beak-chirp' },
  surprised: { eyes: 'eyes-surprised', beak: 'beak-cry' },
  hurt: { eyes: 'eyes-hurt', beak: 'beak-cry' },
};

/** Open talons, nothing carried, a confident look: the rig pose. */
export const REST: Pose2D = {
  slots: { 'foot.near': 'foot-near-open', 'foot.far': 'foot-far-open', loot: 'none', ...FACE.confident },
  bones: {},
};

/** Cruising trim: legs tucked back under the tail, toes trailing. */
const TUCK: Pose2D = {
  bones: {
    'leg.near': { r: -34 },
    'foot.near': { r: -62 },
    'leg.far': { r: -30 },
    'foot.far': { r: -58 },
    tail: { r: 3 },
  },
};

/** Both feet closed on the crystal under the belly. */
const HOLD: Pose2D = {
  slots: { 'foot.near': 'foot-near-grip', 'foot.far': 'foot-far-grip', loot: 'crystal' },
  bones: {
    'leg.near': { r: 16 },
    'foot.near': { r: 6 },
    'leg.far': { r: -18 },
    'foot.far': { r: -22 },
  },
};

const wrap = (p: number) => p - Math.floor(p);

/** 0 at the top of a wingbeat (the rig pose), 1 at the bottom: a quick power stroke, then a softer recovery. */
const stroke = (p: number, down = 0.42) => key(wrap(p), [[0, 0], [down, 1, ease.inOut], [1, 0, ease.inOut]]);
/** How fast the stroke is moving (+ while the wings go down), about -1..1. */
const strokeSpeed = (p: number, down = 0.42) => ((stroke(p + 0.02, down) - stroke(p - 0.02, down)) / 0.04) * (down / 1.5);

/**
 * One wingbeat; `p` is 0..1 through it, `size` scales the stroke. The feather fans lag behind the arms (bent
 * up on the way down, flicking through at the bottom), the body rises on the power stroke and the head, tail
 * and scarf follow it a moment later.
 */
function flap(p: number, size = 1, down = 0.42): Pose2D {
  const s = stroke(p, down);
  const lag = strokeSpeed(p - 0.07, down);
  const lift = 2 * stroke(p - 0.14, down) - 1;
  const trail = strokeSpeed(p - 0.2, down);
  return {
    bones: {
      body: { y: 16 * size * lift, r: -2 * size * lift },
      head: { y: -4 * size * lift, r: 2 * size * lift },
      tail: { r: 5 * size * trail },
      'wing.near': { r: (-14 + 92 * s) * size, sy: 1 - 0.14 * s * size },
      'wingtip.near': { r: -24 * size * lag },
      'wing.far': { r: (6 - 100 * s) * size, sy: 1 - 0.25 * s * size },
      'wingtip.far': { r: 18 * size * lag },
      'leg.near': { r: 4 * size * lift },
      'leg.far': { r: 3 * size * lift },
      'scarf.1': { r: 8 * size * trail },
      'scarf.2': { r: 6 * size * strokeSpeed(p - 0.3, down) },
    },
  };
}

/**
 * The stoop, `k` = 0..1 of the way in: wings folded back along the body (narrowed and swept behind), head
 * stretched forward and down, tail closed, talons swung out in front.
 */
const stoop = (k: number): Pose2D => ({
  bones: {
    body: { r: -6 * k },
    head: { x: 22 * k, y: -16 * k, r: -14 * k },
    tail: { r: 6 * k, sy: 1 - 0.1 * k },
    'wing.near': { r: 80 * k, sx: 1 - 0.5 * k, sy: 1 - 0.05 * k },
    'wingtip.near': { r: -12 * k },
    'wing.far': { r: 100 * k, sx: 1 - 0.5 * k },
    'leg.near': { r: 28 * k },
    'foot.near': { r: 14 * k },
    'leg.far': { r: 22 * k },
    'foot.far': { r: 12 * k },
    'scarf.1': { r: 14 * k },
    'scarf.2': { r: 6 * k },
  },
});

/** Multiplies a pose's rotations by k (to fade a held pose in). */
const scaleBones = (bones: NonNullable<Pose2D['bones']>, k: number): NonNullable<Pose2D['bones']> =>
  Object.fromEntries(Object.entries(bones).map(([n, b]) => [n, { r: (b.r ?? 0) * k }]));

/** Gentle hovering for the character page: slow wingbeats, the head looking about. */
const idle: Clip2D = {
  name: 'idle',
  duration: 3.6,
  loop: true,
  pose: (t) => {
    const look = key(t, [[0, 0], [0.9, 0], [1.2, 1, ease.back], [2.3, 1], [2.6, 0, ease.inOut]]);
    return layer(REST, flap(t / 0.9, 0.55), {
      bones: {
        body: { y: 10 * osc(t, 3.6) },
        head: { r: 7 * look + 2 * osc(t, 1.8) },
        'leg.near': { r: 4 * osc(t, 1.8, 0.2) },
        'foot.near': { r: 5 * osc(t, 1.8, 0.35) },
        'leg.far': { r: 3 * osc(t, 1.8, 0.3) },
        'foot.far': { r: 4 * osc(t, 1.8, 0.45) },
      },
    });
  },
};

/** Strong flapping flight, three wingbeats a second. */
const fly: Clip2D = {
  name: 'fly',
  duration: 0.34,
  loop: true,
  pose: (t) => layer(REST, TUCK, flap(t / 0.34), { slots: FACE.determined, bones: { body: { r: -3 } } }),
};

/**
 * Diving on a pirate: folded hard, talons ready, the whole body trembling with speed. The game moves and turns
 * the puppet along the dive path, so this only shapes the body.
 */
const dive: Clip2D = {
  name: 'dive',
  duration: 0.3,
  loop: true,
  pose: (t) => {
    const shake = osc(t, 0.05);
    const flutter = osc(t, 0.075, 0.3);
    return layer(REST, stoop(1), {
      slots: FACE.focus,
      bones: {
        body: { r: 0.8 * shake, y: 1.5 * shake },
        head: { r: shake },
        tail: { r: 2 * flutter },
        'wing.near': { r: 1.5 * flutter },
        'wingtip.near': { r: 3 * flutter },
        'wing.far': { r: flutter },
        'wingtip.far': { r: 2 * flutter },
        'leg.near': { r: shake },
        'leg.far': { r: -shake },
        'scarf.1': { r: 6 * osc(t, 0.1) },
        'scarf.2': { r: 6 * osc(t, 0.1, 0.4) },
      },
    });
  },
};

/**
 * The hit, 0.35 s, straight out of the dive: a tiny wind-up, then the wings flare to brake (overshooting
 * high), the body pitches back and the talons rake forward through the pirate and close on the crystal.
 * Ends with wings up and the crystal held, ready to blend into `carry`.
 * Events: `strike` at the moment of impact, `grab` when the feet close.
 */
const strike: Clip2D = {
  name: 'strike',
  duration: 0.35,
  loop: false,
  events: [
    [0.12, 'strike'],
    [0.22, 'grab'],
  ],
  pose: (t) => {
    const fold = 1 - key(t, [[0.02, 0], [0.1, 1, ease.out]]);
    const flare = key(t, [[0.02, 0], [0.11, 1.15, ease.out], [0.22, 0.9, ease.inOut], [0.35, 1, ease.inOut]]);
    const rake = key(t, [[0, 0], [0.04, -0.4, ease.out], [0.12, 1, ease.back], [0.22, 0.5, ease.inOut], [0.35, 0, ease.inOut]]);
    const hold = key(t, [[0.2, 0], [0.33, 1, ease.out]]);
    return layer(
      REST,
      stoop(fold),
      {
        slots: t < 0.04 ? FACE.focus : t < 0.27 ? FACE.fierce : FACE.determined,
        bones: {
          body: { r: 16 * flare * (1 - 0.6 * hold), x: -10 * flare, y: 12 * flare },
          head: { x: 8 * flare, r: -8 * flare + 6 * hold },
          tail: { r: -14 * flare, sx: 1 + 0.08 * flare },
          'wing.near': { r: -20 * flare },
          'wingtip.near': { r: -14 * flare + 10 * hold },
          'wing.far': { r: 10 * flare },
          'wingtip.far': { r: 10 * flare },
          'leg.near': { r: 42 * rake },
          'foot.near': { r: 30 * rake },
          'leg.far': { r: 34 * rake },
          'foot.far': { r: 24 * rake },
        },
      },
      t >= 0.22 ? { slots: HOLD.slots, bones: scaleBones(HOLD.bones!, hold) } : {},
    );
  },
};

/** Flying home with the crystal in both feet: heavier, slower beats, the crystal swinging, a proud look. */
const carry: Clip2D = {
  name: 'carry',
  duration: 0.84,
  loop: true,
  pose: (t) => {
    const p = t / 0.42;
    // The load swings a moment after the body heaves up on each beat.
    const sway = Math.sin(2 * Math.PI * (p - 0.35));
    return layer(REST, HOLD, flap(p, 0.95, 0.45), {
      slots: FACE.proud,
      bones: {
        body: { r: 2 },
        head: { r: 6 + 2 * osc(t, 0.84) },
        'leg.near': { r: 4 * sway },
        'foot.near': { r: 5 * sway },
        'leg.far': { r: 4 * sway },
        'foot.far': { r: 5 * sway },
      },
    });
  },
};

/** Soaring on spread wings, trimming them now and then. */
const glide: Clip2D = {
  name: 'glide',
  duration: 3.2,
  loop: true,
  pose: (t) => {
    const trim = osc(t, 3.2);
    const wobble = osc(t, 1.6, 0.25);
    return layer(REST, TUCK, {
      slots: FACE.confident,
      bones: {
        body: { r: -3 + 2 * trim, y: 8 * osc(t, 3.2, 0.2) },
        head: { r: 3 - 2 * trim },
        tail: { r: 3 * wobble, sx: 1.04 },
        'wing.near': { r: 42 + 4 * trim, sy: 0.95 },
        'wingtip.near': { r: -6 + 4 * wobble },
        'wing.far': { r: -34 - 3 * trim, sy: 0.9 },
        'wingtip.far': { r: 6 - 3 * wobble },
        'scarf.1': { r: 4 * osc(t, 0.8) },
        'scarf.2': { r: 4 * osc(t, 0.8, 0.3) },
      },
    });
  },
};

/** A happy chirp: a dip, then the head pops up with the beak open, wings giving a little flutter. */
const chirp: Clip2D = {
  name: 'chirp',
  duration: 0.8,
  loop: false,
  pose: (t) => {
    const up = key(t, [[0, 0], [0.08, -0.4, ease.out], [0.2, 1, ease.back], [0.6, 1], [0.8, 0, ease.inOut]]);
    const open = t > 0.12 && t < 0.62;
    return layer(REST, flap(t / 0.4, 0.4), {
      slots: open ? FACE.happy : FACE.confident,
      bones: {
        head: { r: 14 * up, y: 10 * up },
        body: { r: 3 * up },
        tail: { r: 6 * up },
      },
    });
  },
};

export const talonClips: Clip2D[] = [idle, fly, dive, strike, carry, glide, chirp];
