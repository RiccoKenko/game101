/**
 * Pickups and the run-event shrine. Keys are the game's texture keys (src/game/Pickups.ts, src/config/game.ts
 * XP_GEM_TIERS, src/game/RunEvents.ts): gem_s / gem_m / gem_l are the experience crystals (small, medium, large
 * value), `meat` is the healing pickup (drawn as a small red potion), `shrine` the stone statue of the shrine event.
 * Pickups are shown centred on their spot (origin 0.5, 0.5); the shrine stands on its plinth.
 */
import { Sprite } from '../engine.mjs';
import { C } from '../palette.mjs';

/** Extra ramps (highlight, base, shade, outline), muted like the palette's. */
const P = {
  sky: ['#e6f4ff', '#a9d2ef', '#78a9d2', '#2f4c6e'],
  mint: ['#e4f8d8', '#9fd58f', '#68a865', '#284a2a'],
  orchid: ['#fde2f4', '#d79ad0', '#a868aa', '#4a2850'],
  orchidDeep: ['#efc6ea', '#bd7fbd', '#8d5395', '#3d2045'],
  potion: ['#f4998b', '#cf4d44', '#9c2f2c', '#4e1514'],
  glass: ['#f7fbfb', '#dfe9ea', '#b9c8cb', '#5c6a6e'],
  cork: ['#dfb986', '#bf9563', '#987247', '#523b22'],
  magnet: ['#f08f80', '#c9473f', '#983230', '#4b1716'],
  chestWood: ['#c78f5c', '#a06c41', '#7d5130', '#41291a'],
  lidWood: ['#d29b67', '#ab774a', '#875937', '#462d1b'],
  stone: ['#d6d9d6', '#b1b5b3', '#8b908f', '#464b4c'],
  stoneDark: ['#b9bdbb', '#959a99', '#727877', '#3a3f40'],
  moss: ['#a9bb76', '#849a57', '#667a42', '#334023'],
  orb: ['#f0fbff', '#a9def5', '#6fb3dc', '#2d5577'],
  wing: ['#e2e4e0', '#bec2bf', '#989d9b', '#4b5051'],
};
/** The same colours under another name, so neighbouring feathers get a soft line between them. */
P.wing2 = [...P.wing];

/**
 * A faceted crystal standing on its point: a six-sided outline, a lit left face, a shaded right face, a pale top
 * facet and a glint. (cx, cy) is its middle; w x h its size.
 */
function crystal(s, cx, cy, w, h, ramp, tilt = 0) {
  s.save().pivot(cx, cy, tilt);
  const hw = w / 2;
  const top = cy - h / 2;
  const bot = cy + h / 2;
  const sh = cy - h * 0.18;
  s.poly([[cx, top], [cx + hw, sh], [cx + hw * 0.8, cy + h * 0.2], [cx, bot], [cx - hw * 0.8, cy + h * 0.2], [cx - hw, sh]], ramp);
  // Faces: the left one lit, the right one in shade, a soft middle edge, the upper facets pale.
  s.poly([[cx - hw * 0.92, sh + 0.2], [cx - hw * 0.15, sh + h * 0.04], [cx - hw * 0.05, bot - h * 0.06], [cx - hw * 0.74, cy + h * 0.19]], ramp, { flat: ramp[1], outline: false });
  s.poly([[cx + hw * 0.92, sh + 0.2], [cx + hw * 0.15, sh + h * 0.04], [cx + hw * 0.05, bot - h * 0.06], [cx + hw * 0.74, cy + h * 0.19]], ramp, { flat: ramp[2], outline: false });
  s.poly([[cx, top + h * 0.06], [cx + hw * 0.85, sh], [cx + hw * 0.15, sh + h * 0.04], [cx - hw * 0.15, sh + h * 0.04], [cx - hw * 0.85, sh]], ramp, { flat: mixHex(ramp[0], ramp[1], 0.35), outline: false });
  s.poly([[cx, top + h * 0.06], [cx - hw * 0.85, sh], [cx - hw * 0.15, sh + h * 0.04]], ramp, { flat: ramp[0], outline: false });
  s.line(cx - hw * 0.55, sh + h * 0.12, cx - hw * 0.35, cy + h * 0.16, Math.max(0.28, w * 0.05), ramp[0]);
  s.restore();
  return s;
}

const mixHex = (a, b, t) => {
  const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [x, y] = [p(a), p(b)];
  return `#${x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join('')}`;
};

/** A four-pointed sparkle (a glint), flat white. */
function sparkle(s, x, y, r, colour = '#ffffff') {
  const flat = [colour, colour, colour, colour];
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) s.taper(x, y, x + dx * r, y + dy * r * 1.15, r * 0.22, 0.04, flat, { flat: colour, outline: false });
  s.spot(x, y, r * 0.26, r * 0.26, colour);
  return s;
}

/** Small value: a little soft-blue crystal. */
function gemS() {
  const s = new Sprite(10, 13);
  crystal(s, 5, 6.5, 5.6, 10, P.sky);
  return s;
}

/** Medium value: a taller green crystal with a glint. */
function gemM() {
  const s = new Sprite(12, 16);
  crystal(s, 6, 8, 7.4, 13.4, P.mint);
  sparkle(s, 3.4, 4.6, 1.3);
  return s;
}

/** Large value: a cluster of orchid crystals, a big one between two small ones, with glints. */
function gemL() {
  const s = new Sprite(17, 20);
  crystal(s, 4.6, 12.4, 4.6, 8.6, P.orchidDeep, -0.42);
  crystal(s, 12.6, 12.8, 4.4, 8, P.orchidDeep, 0.4);
  crystal(s, 8.5, 9.6, 8.4, 16, P.orchid);
  sparkle(s, 5.6, 4.4, 1.7);
  sparkle(s, 13.6, 7.6, 1);
  return s;
}

/** A muted brass coin: a raised rim, a square hole with a raised edge, a glint. */
function coin() {
  const s = new Sprite(14, 14);
  s.ellipse(7, 7, 6, 6, C.brass, 0.1);
  // The face, a little lower than the rim: flat, with a soft shade along its upper-left inner edge.
  s.ellipse(7, 7, 4.6, 4.6, C.brass, { flat: '#b39348', outline: false });
  s.ellipse(7.25, 7.25, 4.3, 4.3, C.brass, { flat: C.brass[1], outline: false });
  // The square hole and its raised edge.
  s.rect(5, 5, 4, 4, C.brass, { flat: '#d8bb6c', outline: false });
  s.rect(5.6, 5.6, 2.8, 2.8, C.brass, { flat: '#a68943', outline: false });
  s.rect(6.1, 6.1, 1.8, 1.8, C.brass, { flat: '#4a3a1c', outline: false });
  s.spot(9.6, 4.6, 0.45, 0.45, '#a68943').spot(4.4, 9.4, 0.45, 0.45, '#a68943').spot(9.6, 9.4, 0.45, 0.45, '#a68943').spot(4.4, 4.6, 0.45, 0.45, '#a68943');
  s.line(2.6, 6.2, 4.6, 2.9, 0.35, C.brass[0]);
  sparkle(s, 3.6, 3.4, 1.8);
  return s;
}

/** The healing pickup (key `meat`): a small round red potion with a cork and a tied string. */
function meat() {
  const s = new Sprite(16, 17);
  // Glass bottle (the round body full of red potion), its neck, cork and string.
  s.ellipse(8, 10.6, 5.6, 5.4, P.potion);
  s.spot(5.6, 9, 1.4, 2, '#f7b3a6');
  s.spot(5.2, 8.3, 0.55, 0.8, '#fff2ee');
  s.rect(6, 3.6, 4, 3.4, P.glass);
  s.ellipse(8, 3.6, 2.4, 0.9, P.glass, 0.2);
  s.rect(6.4, 1, 3.2, 3, P.cork);
  s.ellipse(8, 1, 1.6, 0.7, P.cork, 0.2);
  s.capsule(5.8, 5.6, 10.2, 5.6, 0.55, C.brass);
  s.taper(10.2, 5.8, 11.6, 8, 0.4, 0.25, C.brass);
  sparkle(s, 12.2, 8.6, 1.3);
  return s;
}

/** A red-and-silver horseshoe magnet, tilted, its poles pointing down to the left. */
function magnet() {
  const s = new Sprite(22, 23);
  s.offset(3, 4.5);
  s.save().pivot(8.5, 8, -0.75);
  // The U: an arc of short rods (one mass), then the silver poles.
  const cx = 8.5;
  const cy = 6.2;
  const R = 4.2;
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI;
    const b = ((i + 1) / 12) * Math.PI;
    s.capsule(cx + Math.cos(a) * R, cy + Math.sin(a) * R, cx + Math.cos(b) * R, cy + Math.sin(b) * R, 2, P.magnet);
  }
  s.capsule(cx - R, cy, cx - R, cy - 2.6, 2, P.magnet).capsule(cx + R, cy, cx + R, cy - 2.6, 2, P.magnet);
  s.rect(cx - R - 2, cy - 6.4, 4, 3.6, C.steel).rect(cx + R - 2, cy - 6.4, 4, 3.6, C.steel);
  s.line(cx - R - 0.9, cy - 5.9, cx - R - 0.9, cy - 3.4, 0.3, C.steel[0]).line(cx + R - 0.9, cy - 5.9, cx + R - 0.9, cy - 3.4, 0.3, C.steel[0]);
  s.restore();
  s.line(4.6, 11.4, 7.2, 13.2, 0.35, P.magnet[0]);
  sparkle(s, 14.2, 3.2, 1.3);
  return s;
}

/** A closed wooden treasure chest with brass bands, corners and a lock, seen from a little above. */
function chest() {
  const s = new Sprite(32, 30);
  // The box front, its planks, then the domed lid (its top catching the light) over it.
  s.rect(3, 13, 26, 14, P.chestWood);
  s.line(3.5, 18.5, 28.5, 18.5, 0.25, P.chestWood[2]).line(3.5, 23, 28.5, 23, 0.25, P.chestWood[2]);
  s.poly([[2.4, 13.6], [2.4, 9], [4, 5.4], [8, 3.2], [24, 3.2], [28, 5.4], [29.6, 9], [29.6, 13.6]], P.lidWood);
  s.poly([[4, 5.4], [8, 3.2], [24, 3.2], [28, 5.4], [26, 7.4], [6, 7.4]], P.lidWood, 0.25);
  s.line(3, 13.6, 29, 13.6, 0.45, P.lidWood[3]);
  s.line(5, 9.5, 27, 9.5, 0.22, P.lidWood[2]);
  // Brass bands over the lid and down the front, corner caps, the lock plate with its keyhole.
  for (const x of [7.4, 24.6]) {
    s.poly([[x - 1.4, 3.6], [x + 1.4, 3.6], [x + 1.4, 27], [x - 1.4, 27]], C.brass);
    s.line(x - 0.5, 4.5, x - 0.5, 26, 0.22, C.brass[0]);
    s.spot(x, 10.5, 0.45, 0.45, C.brass[3]).spot(x, 20.5, 0.45, 0.45, C.brass[3]);
  }
  s.rect(2.6, 24.8, 3, 2.6, C.brass).rect(26.4, 24.8, 3, 2.6, C.brass);
  s.poly([[13.2, 11], [18.8, 11], [18.8, 16.5], [16, 18.6], [13.2, 16.5]], C.brass, 0.1);
  s.spot(16, 13.6, 0.85, 0.85, '#3b2a14');
  s.poly([[15.5, 14], [16.5, 14], [16.8, 16.4], [15.2, 16.4]], C.brass, { flat: '#3b2a14', outline: false });
  s.line(14, 11.8, 14, 15.8, 0.22, C.brass[0]);
  sparkle(s, 6, 4.6, 1.5);
  return s;
}

/**
 * The shrine of the run event: a small stone guardian with leaf-shaped wings, eyes closed, holding a pale-blue orb,
 * on a stepped mossy plinth.
 */
function shrine() {
  const s = new Sprite(48, 58);
  // Stepped plinth with lit tops, cracks and moss.
  s.rect(5, 47, 38, 9, P.stoneDark);
  s.poly([[5, 47], [43, 47], [41, 44.6], [7, 44.6]], P.stoneDark, 0.22);
  s.rect(9, 39, 30, 6, P.stone);
  s.poly([[9, 39], [39, 39], [37.6, 37], [10.4, 37]], P.stone, 0.22);
  s.line(14, 48.5, 15.5, 54.5, 0.28, P.stoneDark[3]).line(33, 40, 34, 44, 0.25, P.stone[3]);
  for (const [x, y, w] of [[10.5, 45.6, 7], [36, 45.4, 6], [12.5, 37.6, 5], [8, 50, 3]]) {
    s.ellipse(x - w * 0.2, y, w * 0.3, 0.9, P.moss, 0.1).ellipse(x + w * 0.15, y - 0.2, w * 0.28, 1.1, P.moss, 0.1).ellipse(x + w * 0.05, y + 0.7, w * 0.22, 0.8, P.moss);
    s.taper(x - w * 0.1, y + 0.8, x - w * 0.15, y + 2.4, 0.6, 0.2, P.moss);
  }
  // Wings behind the shoulders: three stone feathers on each side, fanning up and out like leaves.
  for (const k of [-1, 1]) {
    [[14, -1.1, 2.6], [12, -0.68, 2.4], [9, -0.25, 2.1]].forEach(([len, a, w], i) => {
      const x0 = 24 + k * 3.5;
      const y0 = 23;
      const dx = Math.cos(a) * k;
      const dy = Math.sin(a);
      s.ellipse(x0 + dx * len * 0.55, y0 + dy * len * 0.55, len * 0.55, w, i % 2 ? P.wing2 : P.wing, { rot: Math.atan2(dy, dx), bias: k < 0 ? 0.08 : -0.05 });
    });
  }
  // Robe: a bell of stone with folds, little feet.
  s.poly([[19, 20], [29, 20], [31.5, 30], [33, 37.5], [15, 37.5], [16.5, 30]], P.stone);
  s.line(21, 25, 20, 36.5, 0.25, P.stone[2]).line(24, 26, 24, 37, 0.25, P.stone[2]).line(27.5, 25, 28.5, 36.5, 0.25, P.stone[3]);
  s.ellipse(20, 37.5, 2.2, 1, P.stone).ellipse(28, 37.5, 2.2, 1, P.stone);
  // The orb held in front, in both hands.
  s.ellipse(24, 25, 4.4, 4.4, P.orb);
  s.spot(22.5, 23.4, 1.4, 1.2, '#ffffff');
  // Wide sleeves from the shoulders, hands cupping the orb from below.
  s.ellipse(19.2, 22.4, 2.4, 2.2, P.stone).ellipse(28.8, 22.4, 2.4, 2.2, P.stone);
  s.capsule(19.4, 23, 20.6, 27.6, 1.9, P.stone).capsule(28.6, 23, 27.4, 27.6, 1.9, P.stone);
  s.ellipse(21.6, 28.4, 1.7, 1.2, P.stone, 0.1).ellipse(26.4, 28.4, 1.7, 1.2, P.stone, 0.1);
  // Head: round, eyes closed in a calm smile, a small stone leaf crown.
  s.ellipse(24, 14, 5.6, 5.4, P.stone);
  s.line(21, 14.6, 22.6, 15.2, 0.3, P.stone[3]).line(25.4, 15.2, 27, 14.6, 0.3, P.stone[3]);
  s.spot(20.6, 16.4, 1, 0.55, '#c9b8b8').spot(27.4, 16.4, 1, 0.55, '#c9b8b8');
  s.line(23.4, 17.6, 24.6, 17.6, 0.22, P.stone[3]);
  s.taper(22, 9.4, 20.4, 6.2, 1.2, 0.3, P.stone).taper(24, 9, 24, 5.4, 1.2, 0.3, P.stone).taper(26, 9.4, 27.6, 6.2, 1.2, 0.3, P.stone);
  s.spot(21.8, 11.4, 1.6, 0.8, P.stone[0]);
  return s;
}

export const ART = {
  gem_s: gemS,
  gem_m: gemM,
  gem_l: gemL,
  coin,
  meat,
  magnet,
  chest,
  shrine,
};
