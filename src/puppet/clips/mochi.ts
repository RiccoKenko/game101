/**
 * Mochi's moves: the hero's baby sky whale, summoned as the ultimate skill. It sweeps across the island,
 * bowling the pirates over, then swims off. Rotations in degrees (counter-clockwise), offsets in rig pixels
 * (y-up). Mochi faces right; the game mirrors it to swim left.
 *
 * The body is one rigid sprite, so the bending comes from the bones around it:
 *  - body: pitches and squashes about the middle of the body (+r lifts the nose, sx stretches it lengthwise).
 *  - tail: the fluke on the tail stock (+r swings the fluke down, -r up). Whales stroke up and down.
 *  - fin.near / fin.far: paddle about their roots (-r sweeps them back along the body, +r forward/down).
 *  - spout: the cloud on the blowhole, also on a spring in the rig; sx/sy puff it.
 */
import { ease, key, osc } from '../../anim/curves';
import { layer, type Clip2D, type Pose2D } from '../pose';

const FACE = {
  gentle: { eyes: 'eyes-gentle', mouth: 'mouth-smile' },
  smug: { eyes: 'eyes-gentle', mouth: 'mouth-w' },
  happy: { eyes: 'eyes-happy', mouth: 'mouth-laugh' },
  sparkle: { eyes: 'eyes-sparkle', mouth: 'mouth-o' },
  determined: { eyes: 'eyes-determined', mouth: 'mouth-laugh' },
  focus: { eyes: 'eyes-determined', mouth: 'mouth-smile' },
  surprised: { eyes: 'eyes-surprised', mouth: 'mouth-o' },
  hurt: { eyes: 'eyes-hurt', mouth: 'mouth-worried' },
  sleepy: { eyes: 'eyes-closed', mouth: 'mouth-w' },
};

/** The rig pose: gentle (grumpy-cute) face, fins a touch closer to the body. */
export const REST: Pose2D = {
  slots: FACE.gentle,
  bones: { 'fin.near': { r: -4 }, 'fin.far': { r: -3 } },
};

const TAU = 2 * Math.PI;

/**
 * One swim stroke, `p` 0..1 through the cycle, `size` scales it. The body pitches a little and the fluke follows
 * a quarter cycle behind (follow-through), so the beat reads as a wave travelling from nose to tail; the body
 * stretches as the fluke drives down and the fins paddle with a lag.
 */
function stroke(p: number, size = 1): Pose2D {
  const w = (phase = 0) => Math.sin(TAU * (p + phase));
  const stretch = 0.035 * size * w(-0.1);
  return {
    bones: {
      body: { r: 3.5 * size * w(), y: 9 * size * w(0.15), sx: 1 + stretch, sy: 1 - stretch * 0.9 },
      tail: { r: -24 * size * w(0.25) },
      'fin.near': { r: 10 * size * w(-0.12) },
      'fin.far': { r: 8 * size * w(-0.18) },
      spout: { r: -3 * size * w(-0.1), sy: 1 + 0.04 * size * w(0.2), sx: 1 - 0.025 * size * w(0.2) },
    },
  };
}

/** A puff from the blowhole once a period: the cloud swells quickly, then sinks back slowly (0..1). */
const puff = (t: number, period: number) =>
  key((((t % period) + period) % period) / period, [[0, 0], [0.1, 1, ease.out], [0.55, 0.15, ease.inOut], [1, 0, ease.inOut]]);

/** Hovering in the sky: a slow bob, belly breathing, lazy fins and a spout that puffs now and then. */
function float(t: number, amount = 1): Pose2D {
  const breath = osc(t, 1.8, 0.1);
  const pf = puff(t, 3.6);
  return {
    bones: {
      body: { y: 12 * amount * osc(t, 3.6), r: 1.6 * amount * osc(t, 3.6, 0.2), sx: 1 + 0.012 * amount * breath, sy: 1 - 0.014 * amount * breath },
      'fin.near': { r: 6 * amount * osc(t, 1.8, 0.05) },
      'fin.far': { r: 5 * amount * osc(t, 1.8, 0.2) },
      spout: { sy: 1 + 0.14 * pf, sx: 1 + 0.06 * pf - 0.03 * pf * pf, r: 2.5 * amount * osc(t, 3.6, 0.45) },
    },
  };
}

/** Hanging in the air for the character page: floating with a lazy tail beat. */
const idle: Clip2D = {
  name: 'idle',
  duration: 3.6,
  loop: true,
  pose: (t) => layer(REST, float(t), stroke(t / 1.8, 0.4)),
};

/** A relaxed cruise: full, easy strokes. */
const swim: Clip2D = {
  name: 'swim',
  duration: 0.9,
  loop: true,
  pose: (t) => layer(REST, stroke(t / 0.9, 1), { bones: { body: { r: -1 } } }),
};

/**
 * The ultimate skill: stretched out like a torpedo, fins swept back, the cloud blown back off the blowhole,
 * short powerful strokes with a fanged battle grin. The game slides it across the map at ~1000 px/s, and the
 * rig's springs then lean the cloud and fins further back on their own.
 */
const sweep: Clip2D = {
  name: 'sweep',
  duration: 0.45,
  loop: true,
  events: [[0.12, 'stroke']],
  pose: (t) =>
    layer(REST, stroke(t / 0.45, 1.5), {
      slots: FACE.determined,
      bones: {
        body: { r: -3, sx: 1.07, sy: 0.94 },
        'fin.near': { r: -22 },
        'fin.far': { r: -18 },
        spout: { r: 12, sx: 0.9, sy: 1.06 },
      },
    }),
};

/**
 * A happy back flip: crouch and wind the fluke down, spring up stretched, flip over at the top with fins thrown
 * up and the cloud puffing big, fall, land in a squash and bounce back with a little overshoot.
 */
const cheer: Clip2D = {
  name: 'cheer',
  duration: 1.2,
  loop: false,
  events: [[0.8, 'land']],
  pose: (t) => {
    const crouch = key(t, [[0, 0], [0.13, 1, ease.out], [0.22, 0, ease.in], [0.78, 0], [0.84, 0.8, ease.out], [0.98, -0.25, ease.inOut], [1.12, 0.08, ease.inOut], [1.2, 0, ease.inOut]]);
    const air = key(t, [[0.16, 0], [0.48, 1, ease.out], [0.8, 0, ease.in]]);
    const launch = key(t, [[0.14, 0], [0.24, 1, ease.out], [0.46, 0, ease.inOut]]);
    const flip = key(t, [[0.2, 0], [0.74, 1, ease.inOut]]);
    const arms = key(t, [[0.1, 0], [0.3, 1, ease.back], [0.86, 1], [1.2, 0, ease.inOut]]);
    const pf = key(t, [[0.3, 0], [0.42, 1, ease.out], [1.0, 0, ease.inOut]]);
    // A whole turn, wrapped back to 0 once it lands, so the clip ends exactly on the rest pose.
    const r = flip >= 1 ? 0 : 360 * flip;
    return layer(REST, {
      slots: t < 0.12 ? FACE.focus : FACE.happy,
      bones: {
        body: {
          r: r - 6 * crouch,
          y: -22 * crouch + 210 * air,
          sx: 1 + 0.1 * crouch - 0.08 * launch,
          sy: 1 - 0.12 * crouch + 0.1 * launch,
        },
        tail: { r: 20 * crouch - 30 * launch + 14 * Math.sin(TAU * flip) * arms + 8 * osc(t, 0.3) * arms },
        'fin.near': { r: -50 * arms + 18 * osc(t, 0.24) * arms },
        'fin.far': { r: 45 * arms - 14 * osc(t, 0.24, 0.2) * arms },
        spout: { sx: 1 + 0.18 * pf - 0.06 * crouch, sy: 1 + 0.3 * pf - 0.15 * crouch, r: -10 * launch },
      },
    });
  },
};

/** Breaching: a dive-and-leap arc, nose up out of the "water", over the top and nose down again. */
const leap: Clip2D = {
  name: 'leap',
  duration: 1.0,
  loop: false,
  pose: (t) => {
    const crouch = key(t, [[0, 0], [0.12, 1, ease.out], [0.2, 0, ease.in], [0.82, 0], [0.88, 0.6, ease.out], [1.0, 0, ease.inOut]]);
    const air = key(t, [[0.16, 0], [0.5, 1, ease.out], [0.84, 0, ease.in]]);
    const pitch = key(t, [[0.1, 0], [0.24, 1, ease.out], [0.55, 0], [0.8, -1, ease.inOut], [1.0, 0, ease.inOut]]);
    const p = Math.max(0, t - 0.16) / 0.3;
    return layer(REST, stroke(Math.min(p, 2), 1.2 * (1 - air * 0.6)), {
      slots: t < 0.6 ? FACE.determined : FACE.happy,
      bones: {
        body: { r: 28 * pitch - 6 * crouch, y: 230 * air - 18 * crouch, sx: 1 + 0.08 * crouch + 0.05 * air, sy: 1 - 0.1 * crouch - 0.04 * air },
        tail: { r: 18 * crouch - 12 * pitch },
        'fin.near': { r: -30 * air },
        'fin.far': { r: -20 * air },
        spout: { r: -14 * pitch, sy: 1 + 0.2 * air },
      },
    });
  },
};

/** A showy forward somersault (a spin attack), wrapping back to rest. */
const spin: Clip2D = {
  name: 'spin',
  duration: 0.8,
  loop: false,
  pose: (t) => {
    const wind = key(t, [[0, 0], [0.1, 1, ease.out], [0.6, 1], [0.8, 0, ease.inOut]]);
    const turn = key(t, [[0.08, 0], [0.62, 1, ease.inOut]]);
    const land = key(t, [[0.6, 0], [0.66, 1, ease.out], [0.8, 0, ease.inOut]]);
    return layer(REST, {
      slots: t < 0.66 ? FACE.determined : FACE.gentle,
      bones: {
        body: { r: turn >= 1 ? 0 : -360 * turn, y: 70 * Math.sin(Math.PI * turn), sx: 1 - 0.06 * wind + 0.08 * land, sy: 1 + 0.05 * wind - 0.1 * land },
        tail: { r: 26 * wind },
        'fin.near': { r: 22 * wind },
        'fin.far': { r: 20 * wind },
        spout: { sx: 1 - 0.2 * wind, sy: 1 - 0.25 * wind },
      },
    });
  },
};

/** Snoozing in mid-air: nose dipped, fluke curled down, slow deep breaths and a tiny cloud. */
const sleep: Clip2D = {
  name: 'sleep',
  duration: 4,
  loop: true,
  pose: (t) => {
    const breath = osc(t, 4);
    return layer(REST, {
      slots: FACE.sleepy,
      bones: {
        body: { r: -4 + 1.2 * breath, y: -12 + 6 * breath, sx: 1 + 0.02 * breath, sy: 1 + 0.025 * breath },
        tail: { r: 22 + 4 * osc(t, 4, 0.2) },
        'fin.near': { r: 14 + 3 * osc(t, 4, 0.1) },
        'fin.far': { r: 10 },
        spout: { sx: 0.7 + 0.08 * breath, sy: 0.55 + 0.12 * breath, r: 4 * osc(t, 4, 0.3) },
      },
    });
  },
};

/** Waves hello with the far fin raised in front of the chin, sparkly-eyed (the character page's greeting). */
const wave: Clip2D = {
  name: 'wave',
  duration: 1.4,
  loop: false,
  pose: (t) => {
    const up = key(t, [[0, 0], [0.2, 1, ease.back], [1.15, 1], [1.4, 0, ease.inOut]]);
    return layer(REST, float(t, 0.6), {
      slots: up > 0.3 ? { eyes: 'eyes-sparkle', mouth: 'mouth-smile' } : FACE.gentle,
      bones: {
        body: { r: 5 * up },
        tail: { r: -8 * up + 6 * osc(t, 0.7) * up },
        'fin.near': { r: -10 * up + 5 * osc(t, 0.35, 0.3) * up },
        // Slid forward out from under the chin so the whole flipper shows beside the face.
        'fin.far': { r: (62 + 24 * osc(t, 0.35)) * up, x: 60 * up, y: 30 * up },
      },
    });
  },
};

export const mochiClips: Clip2D[] = [idle, swim, sweep, cheer, leap, spin, sleep, wave];
