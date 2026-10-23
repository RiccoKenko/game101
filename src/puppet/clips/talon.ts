/**
 * Talon's moves (the hero's eagle). Rotations in degrees (counter-clockwise), offsets in rig pixels (y-up).
 * Facing right. The rig pose has both wings raised: that is the top of a wingbeat.
 * Near wing (the big one, up and back): +r sweeps it down and back (the downstroke), -r lifts it higher.
 * Far wing (behind the head): -r swings it down to the right, +r lifts it back over the shoulders.
 * `wingtip.*` is the feather fan under each wing's arm: it lags behind the arm for follow-through.
 * Legs hang from the hips: +r swings the feet forward (talons out), -r tucks them back.
 */
import { ease, key, osc } from '../../anim/curves';
import { layer, type Clip2D, type Pose2D } from '../pose';

const FACE = {
  confident: { eyes: 'eyes-confident', beak: 'beak-closed' },
  determined: { eyes: 'eyes-determined', beak: 'beak-closed' },
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

/** Flying trim: legs tucked back under the tail, feet trailing. */
const TUCK: Pose2D = {
  bones: {
    'leg.near': { r: -22 },
    'foot.near': { r: -28 },
    'leg.far': { r: -18 },
    'foot.far': { r: -24 },
    tail: { r: 3 },
  },
};

const wrap = (p: number) => p - Math.floor(p);

/** 0 at the top of a wingbeat (the rig pose), 1 at the bottom: a quick power stroke, then a softer recovery. */
const stroke = (p: number, down = 0.42) => key(wrap(p), [[0, 0], [down, 1, ease.inOut], [1, 0, ease.inOut]]);
/** How fast the stroke is moving (+ while the wings go down), about -1..1. */
const strokeSpeed = (p: number, down = 0.42) => ((stroke(p + 0.02, down) - stroke(p - 0.02, down)) / 0.04) * (down / 1.5);

/**
 * One wingbeat; `p` is 0..1 through it, `size` scales the stroke. The feather fans lag a beat behind the arms
 * (bent up on the way down, flicking through at the bottom), the body rises on the power stroke and the
 * tail and head follow it a moment later.
 */
function flap(p: number, size = 1, down = 0.42): Pose2D {
  const s = stroke(p, down);
  const lag = strokeSpeed(p - 0.07, down);
  const lift = 2 * stroke(p - 0.14, down) - 1;
  return {
    bones: {
      body: { y: 16 * size * lift, r: -2 * size * lift },
      head: { y: -4 * size * lift, r: 2 * size * lift },
      tail: { r: 5 * size * strokeSpeed(p - 0.2, down) },
      'wing.near': { r: (-14 + 92 * s) * size, sy: 1 - 0.14 * s * size },
      'wingtip.near': { r: -24 * size * lag },
      'wing.far': { r: (6 - 100 * s) * size, sy: 1 - 0.25 * s * size },
      'wingtip.far': { r: 18 * size * lag },
      'leg.near': { r: 4 * size * lift },
      'leg.far': { r: 3 * size * lift },
    },
  };
}

/** Gentle hovering for the character page: slow wingbeats, the head looking about. */
const idle: Clip2D = {
  name: 'idle',
  duration: 3.6,
  loop: true,
  pose: (t) => {
    const look = key(t, [[0, 0], [0.9, 0], [1.2, 1, ease.out], [2.3, 1], [2.6, 0, ease.inOut]]);
    return layer(REST, flap(t / 0.9, 0.55), {
      bones: {
        body: { y: 10 * osc(t, 3.6) },
        head: { r: 7 * look + 2 * osc(t, 1.8) },
        'leg.near': { r: 4 * osc(t, 1.8, 0.2) },
        'leg.far': { r: 3 * osc(t, 1.8, 0.3) },
      },
    });
  },
};

/** Strong flapping flight, three wingbeats a second. */
const fly: Clip2D = {
  name: 'fly',
  duration: 0.34,
  loop: true,
  pose: (t) => layer(REST, TUCK, flap(t / 0.34), { slots: FACE.determined }),
};

/**
 * Stooping on a pirate: wings folded back hard, head stretched forward and down, talons out in front, the whole
 * body trembling with speed. The game turns the puppet along the dive path, so this only shapes the body.
 */
const dive: Clip2D = {
  name: 'dive',
  duration: 0.3,
  loop: true,
  pose: (t) => {
    const shake = osc(t, 0.05);
    const flutter = osc(t, 0.075, 0.3);
    return layer(REST, {
      slots: FACE.fierce,
      bones: {
        body: { r: -6 + 0.8 * shake, y: 1.5 * shake },
        head: { x: 22, y: -16, r: -14 + shake },
        tail: { r: -4 + 2 * flutter, sy: 0.92 },
        'wing.near': { r: 70 + 1.5 * flutter, sy: 0.62 },
        'wingtip.near': { r: 28 + 3 * flutter },
        'wing.far': { r: 38 + flutter, sy: 0.5 },
        'wingtip.far': { r: 20 + 2 * flutter },
        'leg.near': { r: 28 + shake },
        'foot.near': { r: 14 },
        'leg.far': { r: 22 + shake },
        'foot.far': { r: 12 },
      },
    });
  },
};

/**
 * The hit (0.35 s): out of the dive the wings flare to brake, the talons rake forward through the pirate and
 * close on the crystal. `strike` is the moment of impact, `grab` when the feet close.
 */
const strike: Clip2D = {
  name: 'strike',
  duration: 0.35,
  loop: false,
  events: [
    [0.12, 'strike'],
    [0.24, 'grab'],
  ],
  pose: (t) => {
    const flare = key(t, [[0, 0], [0.1, 1, ease.out], [0.24, 0.9], [0.35, 0.55, ease.inOut]]);
    const rake = key(t, [[0, 0], [0.05, -0.3, ease.out], [0.13, 1, ease.back], [0.26, 0.7], [0.35, 0.4, ease.inOut]]);
    const fold = 1 - key(t, [[0, 0], [0.09, 1, ease.out]]);
    return layer(REST, {
      slots: { ...FACE.fierce, ...(t > 0.24 ? { 'foot.near': 'foot-near-grip', 'foot.far': 'foot-far-grip', loot: 'crystal' } : {}) },
      bones: {
        body: { r: 16 * flare - 6 * fold, x: -10 * flare, y: 10 * flare },
        head: { x: 22 * fold + 6 * flare, y: -16 * fold, r: -14 * fold - 10 * flare },
        tail: { r: -14 * flare, sx: 1 + 0.08 * flare },
        'wing.near': { r: 70 * fold - 22 * flare, sy: 1 - 0.38 * fold },
        'wingtip.near': { r: 28 * fold - 16 * flare },
        'wing.far': { r: 38 * fold + 10 * flare, sy: 1 - 0.5 * fold },
        'wingtip.far': { r: 20 * fold + 12 * flare },
        'leg.near': { r: 28 * fold + 40 * rake },
        'foot.near': { r: 14 * fold + 25 * rake },
        'leg.far': { r: 22 * fold + 32 * rake },
        'foot.far': { r: 12 * fold + 20 * rake },
      },
    });
  },
};

/** Flying home with the crystal in both feet: heavier, slower beats and a proud look. */
const carry: Clip2D = {
  name: 'carry',
  duration: 0.84,
  loop: true,
  pose: (t) => {
    const p = t / 0.42;
    const sway = Math.sin(2 * Math.PI * (p - 0.3));
    return layer(REST, flap(p, 0.95, 0.45), {
      slots: { ...FACE.proud, 'foot.near': 'foot-near-grip', 'foot.far': 'foot-far-grip', loot: 'crystal' },
      bones: {
        body: { r: 3 },
        head: { r: 6 + 2 * osc(t, 0.84) },
        'leg.near': { r: 12 + 4 * sway },
        'foot.near': { r: -4 + 6 * sway },
        'leg.far': { r: 20 + 4 * sway },
        'foot.far': { r: -2 + 6 * sway },
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
        tail: { r: 3 * wobble },
        'wing.near': { r: 42 + 4 * trim, sy: 0.95 },
        'wingtip.near': { r: -6 + 4 * wobble },
        'wing.far': { r: -34 - 3 * trim, sy: 0.9 },
        'wingtip.far': { r: 6 - 3 * wobble },
      },
    });
  },
};

/** A happy chirp: head bobs up, beak open, a little flutter. */
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
