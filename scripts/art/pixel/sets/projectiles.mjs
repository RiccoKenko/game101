/**
 * Projectiles and hit effects, in the same muted, thin-outlined look as the hero and monsters. Keys are the game's
 * texture keys (src/game/Weapons.ts, src/config/enemies.ts, src/game/Effects.ts).
 *
 * Anything that flies along its path (arrows, knives, enemy shots, the meteor) is drawn pointing RIGHT: the game
 * turns it to its heading. Things that spin (boomerang, shuriken) or stand (whirlwind, wisp) are drawn upright;
 * ground things (traps, the poison puddle) are drawn seen from above, flattened.
 *
 * A picture that should shine (magic) is returned as a PNG with a soft glow painted behind it (`glowing`).
 */
import sharp from 'sharp';
import { Sprite } from '../engine.mjs';
import { C } from '../palette.mjs';

/** Extra ramps (highlight, base, shade, outline), muted like the palette's. */
const P = {
  fletch: ['#c9dd9a', '#93b05e', '#6e8a43', '#334420'],
  poison: ['#e2f0a4', '#b3cf5f', '#83a03d', '#3b4c1a'],
  poisonDeep: ['#c5dc7e', '#94b24a', '#6a8634', '#344416'],
  glass: ['#f7fbfb', '#dfe9ea', '#b9c8cb', '#5c6a6e'],
  cork: ['#dfb986', '#bf9563', '#987247', '#523b22'],
  fire: ['#ffe7a3', '#f4a24c', '#d2602e', '#6c2414'],
  flame: ['#fff4cc', '#ffd36e', '#f29a3f', '#8a3b17'],
  arcane: ['#ebe3ff', '#ad9fe4', '#7a6bbd', '#30285a'],
  spirit: ['#f6feff', '#cdeff6', '#97cfdd', '#3e6b78'],
  wind: ['#f7f9fb', '#d9e1ea', '#aebccc', '#56657a'],
  ice: ['#f2fcff', '#bfe6f5', '#86bfdc', '#33607a'],
  rock: ['#9b8573', '#77624f', '#57473a', '#2a201a'],
  ember: ['#ffd9a0', '#f08a45', '#c4522a', '#5e2212'],
};
/** The same colours under another name, so neighbouring bands get a soft line between them. */
P.wind2 = [...P.wind];
P.fire2 = [...P.fire];

/**
 * The sprite as a PNG with a soft round glow of `colour` behind it, centred on (cx, cy) with radii (rx, ry) in sprite
 * pixels (default: the whole picture).
 */
async function glowing(s, colour, { cx = s.w / 2, cy = s.h / 2, rx = s.w / 2, ry = s.h / 2, strength = 0.5 } = {}) {
  const png = await s.png();
  const k = s.size;
  const W = s.w * k;
  const H = s.h * k;
  const glow =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><defs>` +
    `<radialGradient id="g"><stop offset="0.25" stop-color="${colour}" stop-opacity="${strength}"/>` +
    `<stop offset="1" stop-color="${colour}" stop-opacity="0"/></radialGradient></defs>` +
    `<ellipse cx="${cx * k}" cy="${cy * k}" rx="${rx * k}" ry="${ry * k}" fill="url(#g)"/></svg>`;
  return sharp(Buffer.from(glow)).composite([{ input: png }]).png().toBuffer();
}

/** A four-pointed sparkle (a glint), flat. */
function sparkle(s, x, y, r, colour = '#ffffff') {
  const flat = [colour, colour, colour, colour];
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) s.taper(x, y, x + dx * r, y + dy * r * 1.15, r * 0.22, 0.04, flat, { flat: colour, outline: false });
  s.spot(x, y, r * 0.26, r * 0.26, colour);
  return s;
}

/** Points along a quadratic curve, for bands and swirls drawn as chains of short rods. */
function curve(x0, y0, x1, y1, x2, y2, n = 10) {
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n;
    const u = 1 - t;
    return [u * u * x0 + 2 * u * t * x1 + t * t * x2, u * u * y0 + 2 * u * t * y1 + t * t * y2];
  });
}

/** A flat stroke along a curve, `r` thick in the middle and thinning to the ends. */
function stroke(s, pts, r, colour) {
  for (let i = 0; i < pts.length - 1; i++) {
    const t = i / (pts.length - 1);
    const w = r * (0.35 + 0.65 * Math.sin(Math.PI * Math.min(1, t + 0.05)));
    s.line(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], w, colour);
  }
}

/** Two feathers at the tail of an arrow whose shaft runs along y = cy, its tail at x. */
function fletching(s, x, cy, len, spread, ramp) {
  s.poly([[x, cy - spread], [x + len * 0.35, cy - spread], [x + len, cy - 0.3], [x + len * 0.15, cy - 0.2]], ramp, 0.1);
  s.poly([[x, cy + spread], [x + len * 0.35, cy + spread], [x + len, cy + 0.3], [x + len * 0.15, cy + 0.2]], ramp, -0.1);
  s.line(x + len * 0.2, cy - spread * 0.55, x + len * 0.7, cy - 0.5, 0.18, ramp[0]);
}

/** The Archer's arrow: a wooden shaft, an iron head, green fletching and leather bindings. */
function arrow() {
  const s = new Sprite(24, 8);
  s.capsule(2.5, 4, 18.5, 4, 0.55, C.wood);
  fletching(s, 0.8, 4, 6, 2.3, P.fletch);
  s.capsule(6.6, 4, 7.6, 4, 0.75, C.leather).capsule(16.6, 4, 17.6, 4, 0.75, C.leather);
  s.poly([[17.6, 2], [23.2, 4], [17.6, 6], [18.8, 4]], C.steel);
  s.line(18.6, 3.2, 22, 4, 0.2, C.steel[0]);
  return s;
}

/** Storm Bow's arrow: longer, a brass head, pale feathers, and a wisp of wind curling around the head. */
function arrowStorm() {
  const s = new Sprite(29, 11);
  stroke(s, curve(9, 2.4, 17, 0.6, 24, 3.4), 0.5, '#e8f3fa');
  stroke(s, curve(7, 8.6, 15, 10.4, 23, 7.4), 0.5, '#cfe3f0');
  s.capsule(3, 5.5, 22, 5.5, 0.7, C.wood);
  fletching(s, 0.8, 5.5, 7.4, 3, P.wind);
  s.capsule(8.6, 5.5, 9.8, 5.5, 0.9, C.brass).capsule(20, 5.5, 21.2, 5.5, 0.9, C.brass);
  s.poly([[20.8, 2.6], [28.2, 5.5], [20.8, 8.4], [22.4, 5.5]], C.brass);
  s.line(22.4, 4.4, 26.8, 5.5, 0.22, C.brass[0]);
  sparkle(s, 25.4, 3.2, 1.3);
  return s;
}

/** A throwing knife: a steel blade, a small brass guard, a leather-wrapped grip. */
function dagger() {
  const s = new Sprite(20, 7);
  s.capsule(1.2, 3.5, 6, 3.5, 0.95, C.leather);
  s.line(2.4, 2.7, 2.4, 4.3, 0.18, C.leather[2]).line(3.8, 2.7, 3.8, 4.3, 0.18, C.leather[2]);
  s.ellipse(1, 3.5, 1, 1, C.brass);
  s.capsule(6.6, 1.6, 6.6, 5.4, 0.7, C.brass);
  s.poly([[7.2, 2], [15, 2.1], [19.4, 3.5], [15, 4.9], [7.2, 5]], C.steel);
  s.line(8, 3.1, 16.5, 3.2, 0.25, C.steel[0]);
  return s;
}

/** Twin Blades' knife: a brass blade with a ruby in the guard. */
function daggerGold() {
  const s = new Sprite(21, 9);
  s.capsule(1.4, 4.5, 6.4, 4.5, 1.05, C.umber);
  s.line(2.6, 3.6, 2.6, 5.4, 0.2, C.brass[1]).line(4.2, 3.6, 4.2, 5.4, 0.2, C.brass[1]);
  s.ellipse(1.1, 4.5, 1.1, 1.1, C.brass);
  s.capsule(7.2, 1.6, 7.2, 7.4, 0.85, C.brass);
  s.ellipse(7.2, 4.5, 1.1, 1.1, C.ruby, 0.15);
  s.poly([[8, 2.6], [15.6, 2.6], [20.4, 4.5], [15.6, 6.4], [8, 6.4]], C.brass);
  s.line(9, 3.9, 17.4, 4, 0.28, C.brass[0]);
  sparkle(s, 17.6, 2.4, 1.1);
  return s;
}

/** A wooden boomerang (spun in game): two arms bent at the elbow, red painted bands, leather around the elbow. */
function boomerang() {
  const s = new Sprite(15, 22);
  s.taper(4, 11, 12.6, 2.2, 2.4, 1.7, C.wood);
  s.taper(4, 11, 12.6, 19.8, 2.4, 1.7, C.wood, -0.05);
  s.ellipse(4, 11, 2.5, 2.5, C.wood);
  s.capsule(3.4, 9.2, 3.4, 12.8, 1.3, C.leather);
  for (const [x, y] of [[10.6, 4.3], [10.6, 17.7]]) s.line(x - 1.4, y - (y < 11 ? -1.2 : 1.2) * 0.2 - 1, x + 1.2, y + (y < 11 ? 1 : -1) * 1.1 - 0.2, 0.42, C.brick[1]);
  s.line(6, 8.4, 11.6, 3, 0.25, C.wood[0]);
  return s;
}

/** The poison flask: a round glass flask of green brew with a cork and a tied string. */
function flask() {
  const s = new Sprite(14, 19);
  s.ellipse(7, 12.6, 5.6, 5.4, P.poison);
  s.spot(9, 14.4, 1, 1, P.poison[0]).spot(5.6, 15.4, 0.6, 0.6, P.poison[0]);
  s.spot(4.6, 11, 1.3, 1.9, '#f2f8dc');
  s.spot(4.2, 10.4, 0.5, 0.8, '#ffffff');
  s.rect(5, 4.6, 4, 3.6, P.glass);
  s.ellipse(7, 4.6, 2.4, 0.9, P.glass, 0.2);
  s.rect(5.4, 1.6, 3.2, 3.2, P.cork);
  s.ellipse(7, 1.6, 1.6, 0.7, P.cork, 0.2);
  s.capsule(4.8, 6.8, 9.2, 6.8, 0.55, C.brass);
  s.taper(9.2, 7, 10.6, 9.4, 0.4, 0.25, C.brass);
  return s;
}

/** The poison puddle on the ground (seen from above, flattened): a lobed pool, a darker rim, bubbles. */
function puddle() {
  const s = new Sprite(66, 35);
  const lobes = [[33, 17.5, 26, 11.5], [14, 16, 10, 7.5], [52, 19, 11, 7.5], [26, 9, 12, 6], [40, 26, 13, 6.5], [22, 25, 9, 5.5], [44, 9.5, 10, 5.5]];
  for (const [x, y, rx, ry] of lobes) s.ellipse(x, y, rx, ry, P.poisonDeep, { flat: P.poisonDeep[2] });
  for (const [x, y, rx, ry] of lobes) s.ellipse(x - 0.6, y - 0.8, rx - 1.6, ry - 1.4, P.poisonDeep, { flat: P.poisonDeep[1], outline: false });
  s.ellipse(31, 15.6, 18, 7, P.poison, { flat: P.poison[1], outline: false });
  s.spot(25, 12.6, 7, 2.2, P.poison[0]);
  for (const [x, y, r] of [[56, 27.5, 2], [8, 23.5, 1.6], [61, 12.5, 1.2], [5, 10, 1.1]]) s.ellipse(x, y, r * 1.3, r, P.poisonDeep, { flat: P.poisonDeep[1] });
  for (const [x, y, r] of [[38, 16, 2.4], [24, 19.5, 1.8], [46, 21, 1.5], [17, 14.5, 1.3], [34, 23.5, 1.2]]) {
    s.ellipse(x, y, r, r * 0.85, P.poison, 0.2);
    s.spot(x - r * 0.35, y - r * 0.3, r * 0.3, r * 0.25, '#ffffff');
  }
  return s;
}

/** A spike trap seen from above: eight iron spikes around a round plate, a glowing trigger stone in the middle. */
function trap(spike, plate, stone) {
  return () => {
    const s = new Sprite(22, 22);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
      s.taper(11 + Math.cos(a) * 5, 11 + Math.sin(a) * 5, 11 + Math.cos(a) * 10.4, 11 + Math.sin(a) * 10.4, 1.9, 0.2, spike, i % 2 ? -0.05 : 0.08);
    }
    s.ellipse(11, 11, 6.6, 6.6, plate);
    s.ellipse(11, 11, 4.6, 4.6, plate, { flat: plate[2], outline: false });
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      s.spot(11 + Math.cos(a) * 5.6, 11 + Math.sin(a) * 5.6, 0.5, 0.5, plate[3]);
    }
    s.ellipse(11, 11, 2.6, 2.6, stone, 0.15);
    s.spot(10.2, 10.1, 0.9, 0.7, '#ffffff');
    s.line(6.4, 8.4, 8.6, 6, 0.3, plate[0]);
    return s;
  };
}

/** Spirit Wisp: a little pale flame with two dark eyes and a glow. */
async function wisp() {
  const s = new Sprite(16, 19);
  s.taper(8, 11, 8.6, 1.4, 4, 0.3, P.spirit);
  s.taper(6, 10, 4.2, 4.6, 2.2, 0.25, P.spirit, -0.05);
  s.taper(10.4, 10, 12.2, 5.8, 2, 0.25, P.spirit, -0.05);
  s.ellipse(8, 12.4, 5, 4.8, P.spirit);
  s.spot(6.4, 12.4, 0.75, 1.1, C.umber[3]).spot(9.6, 12.4, 0.75, 1.1, C.umber[3]);
  s.spot(6.6, 12, 0.25, 0.3, '#ffffff').spot(9.8, 12, 0.25, 0.3, '#ffffff');
  s.spot(5.4, 14.2, 0.8, 0.45, '#f6c9c0').spot(10.6, 14.2, 0.8, 0.45, '#f6c9c0');
  return glowing(s, '#bfeaf5', { cy: 11.5, rx: 8, ry: 8.5, strength: 0.65 });
}

/** Whirlwind: a funnel of pale wind bands, wide at the top, narrow where it touches the ground. */
function twister() {
  const s = new Sprite(32, 43);
  const n = 11;
  for (let i = n; i >= 0; i--) {
    const t = i / n;
    const y = 6 + t * 34;
    const rx = 14.5 - 12.6 * Math.pow(t, 0.85);
    const sway = Math.sin(t * 3.2) * 2;
    s.ellipse(16 + sway, y, rx, Math.max(1.4, rx * 0.3), i % 2 ? P.wind2 : P.wind, i % 2 ? -0.06 : 0.04);
  }
  s.ellipse(16, 6, 14.5, 4.2, P.wind, { flat: P.wind[2] });
  s.ellipse(16, 6.3, 11.6, 2.9, P.wind, { flat: '#c4cfdc', outline: false });
  stroke(s, curve(5, 11, 12, 14.5, 23, 12.5), 0.4, '#ffffff');
  stroke(s, curve(9, 22, 16, 25, 23.5, 21), 0.35, '#ffffff');
  stroke(s, curve(13, 31.5, 17, 33.5, 21, 30.5), 0.3, '#ffffff');
  for (const [x, y] of [[3, 30], [28, 27], [7, 38.5], [26, 37]]) s.ellipse(x, y, 1.4, 0.9, C.leaf, 0.1);
  return s;
}

/** A monster's fireball, flying right: a hot core with flame tongues streaming back. */
function fireball() {
  const s = new Sprite(17, 13);
  s.taper(10.5, 6.5, 1, 6.5, 4.4, 1, P.fire);
  for (const [x, y, r] of [[3.4, 3.4, 1.1], [1.6, 9.6, 0.8]]) s.ellipse(x, y, r, r, P.fire, 0.1);
  s.taper(10.5, 6.5, 3.4, 6.2, 3, 0.6, P.flame, { flat: P.flame[2], outline: false });
  s.taper(10.5, 6.5, 5.4, 6.4, 2, 0.4, P.flame, { flat: P.flame[1], outline: false });
  s.ellipse(11, 6.5, 4.6, 4.4, P.fire, 0.15);
  s.ellipse(11.6, 6.2, 2.8, 2.6, P.flame, { flat: P.flame[1], outline: false });
  s.ellipse(12, 5.9, 1.5, 1.4, P.flame, { flat: P.flame[0], outline: false });
  return s;
}

/** A monster's magic orb, flying right: a violet ball with a short comet tail and a glow. */
async function orb() {
  const s = new Sprite(16, 13);
  s.taper(9, 6.5, 1, 6.5, 3.4, 0.3, P.arcane, { flat: P.arcane[2] });
  s.taper(9, 6.5, 3, 6.5, 2, 0.2, P.arcane, { flat: P.arcane[1], outline: false });
  s.ellipse(10.5, 6.5, 4.2, 4.2, P.arcane);
  stroke(s, curve(8, 5.4, 10.4, 3.2, 13, 5), 0.3, P.arcane[0]);
  stroke(s, curve(13, 7.6, 10.6, 9.8, 8.2, 7.8), 0.3, '#d4caf6');
  s.spot(9.4, 5.1, 1, 0.8, '#ffffff');
  return glowing(s, '#b9a8f0', { cx: 10.5, cy: 6.5, rx: 6.4, ry: 6.4, strength: 0.55 });
}

/** A meteor, flying right and down: a cracked rock glowing in its seams, a long flame tail. */
function meteor() {
  const s = new Sprite(32, 20);
  s.taper(23, 10, 1, 10, 7.6, 1.4, P.fire);
  for (const [x, y, r] of [[5, 4.4, 1.5], [2.6, 14.6, 1.2], [9, 16.8, 1]]) s.ellipse(x, y, r, r, P.fire, 0.1);
  s.taper(23, 10, 5, 9.6, 5.2, 1, P.flame, { flat: P.flame[2], outline: false });
  s.taper(23, 10, 9, 9.8, 3.6, 0.6, P.flame, { flat: P.flame[1], outline: false });
  s.ellipse(23.6, 10, 6.4, 6, P.rock);
  s.ellipse(25.6, 7.6, 2.6, 2, P.rock, 0.12);
  s.line(20.4, 8.4, 23.4, 10.6, 0.35, P.ember[1]).line(23.4, 10.6, 22.4, 13.6, 0.3, P.ember[1]).line(23.4, 10.6, 27, 11.4, 0.3, P.ember[1]);
  s.spot(24.6, 6.6, 1.2, 0.7, P.rock[0]);
  return s;
}

/** The hit spark: a small four-pointed star, flat and pale (the game tints it). */
function spark() {
  const s = new Sprite(9, 9);
  sparkle(s, 4.5, 4.5, 4.2, '#fff6d8');
  s.spot(4.5, 4.5, 0.9, 0.9, '#ffffff');
  return s;
}

/** An explosion (grown and faded in game): a ring of fire puffs round a bright heart, a few flying embers. */
function explosion() {
  const s = new Sprite(74, 74);
  const c = 37;
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + 0.3;
    const r = i % 2 ? 22 : 25;
    s.ellipse(c + Math.cos(a) * r * 0.62, c + Math.sin(a) * r * 0.62, 11 + (i % 3), 10 + (i % 2) * 2, i % 2 ? P.fire2 : P.fire, 0.05);
  }
  s.ellipse(c, c, 21, 21, P.fire, 0.1);
  s.ellipse(c - 1, c - 1, 15, 15, P.flame, { flat: P.flame[1], outline: false });
  s.ellipse(c - 2, c - 2, 8.5, 8.5, P.flame, { flat: P.flame[0], outline: false });
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + 0.75;
    s.ellipse(c + Math.cos(a) * 33, c + Math.sin(a) * 33, 1.8, 1.8, P.ember, 0.2);
  }
  return s;
}

/** Magic Bolt (the Mage), flying right: a pale-blue ball of light with a soft tail and a glow. */
async function bolt() {
  const s = new Sprite(21, 10);
  s.taper(15, 5, 1, 5, 3, 0.3, P.ice, { flat: P.ice[2] });
  s.taper(15, 5, 4, 5, 2, 0.2, P.ice, { flat: P.ice[1], outline: false });
  s.ellipse(15.6, 5, 3.6, 3.6, P.ice, 0.1);
  s.spot(16, 4.8, 1.8, 1.8, '#ffffff');
  return glowing(s, '#a9dcf2', { cx: 15, cy: 5, rx: 6, ry: 5, strength: 0.6 });
}

/** Frost Shard, flying right: a long, faceted icicle. */
function iceShard() {
  const s = new Sprite(22, 7);
  s.poly([[0.8, 3.5], [6, 1.2], [16, 1.6], [21.4, 3.5], [16, 5.4], [6, 5.8]], P.ice);
  s.poly([[6, 1.4], [16, 1.7], [21, 3.4], [6, 3.4]], P.ice, { flat: P.ice[0], outline: false });
  s.line(3, 3.5, 19, 3.5, 0.2, '#ffffff');
  sparkle(s, 15, 2.2, 1.2);
  return s;
}

/** Starfall's falling star, flying right: a pale-gold five-pointed star with a streaming tail. */
function starBolt() {
  const s = new Sprite(20, 11);
  s.taper(14, 5.5, 1, 5.5, 3, 0.3, P.flame, { flat: P.flame[1] });
  s.taper(14, 5.5, 5, 5.5, 1.8, 0.2, P.flame, { flat: P.flame[0], outline: false });
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    const r = i % 2 ? 2.2 : 5;
    pts.push([14.4 + Math.cos(a) * r, 5.8 + Math.sin(a) * r]);
  }
  s.poly(pts, C.brass, 0.25);
  s.spot(13.6, 5, 1, 0.8, '#fff6d8');
  return s;
}

/** Moon Slash: a pale crescent of a sword sweep, bulging to the right (the game mirrors it and tints it). */
function slash() {
  const s = new Sprite(37, 37);
  const pts = [];
  for (let i = 0; i <= 20; i++) {
    const a = -1.45 + (i / 20) * 2.9;
    pts.push([13 + Math.cos(a) * 21, 18.5 + Math.sin(a) * 17.5]);
  }
  for (let i = 20; i >= 0; i--) {
    const a = -1.25 + (i / 20) * 2.5;
    pts.push([4 + Math.cos(a) * 21, 18.5 + Math.sin(a) * 13.5]);
  }
  s.poly(pts, P.wind, 0.2);
  const inner = [];
  for (let i = 3; i <= 17; i++) {
    const a = -1.45 + (i / 20) * 2.9;
    inner.push([13 + Math.cos(a) * 18.4, 18.5 + Math.sin(a) * 15.4]);
  }
  stroke(s, inner, 0.7, '#ffffff');
  return s;
}

/** A throwing axe (spun in game): a steel double-bladed head on a short wooden haft. */
function axe(ramp, haft, gem) {
  return () => {
    const big = ramp === C.brass;
    const s = new Sprite(big ? 36 : 24, big ? 37 : 24);
    const k = big ? 1.5 : 1;
    s.save().scale(k);
    s.capsule(12, 5, 12, 22, 1.1, haft);
    s.capsule(12, 19.4, 12, 21.4, 1.4, C.leather);
    s.poly([[12.6, 4], [19, 1.6], [22, 6.5], [19, 11.4], [12.6, 9]], ramp, 0.1);
    s.poly([[11.4, 4], [5, 1.6], [2, 6.5], [5, 11.4], [11.4, 9]], ramp, -0.05);
    s.line(20.6, 3.4, 21.6, 7.6, 0.28, ramp[0]).line(3.4, 3.4, 2.6, 7.4, 0.22, ramp[0]);
    s.ellipse(12, 6.5, 1.8, 2.8, ramp === C.brass ? C.brass : C.iron, 0.1);
    if (gem) s.ellipse(12, 6.5, 1.1, 1.4, gem, 0.15);
    s.restore();
    if (big) sparkle(s, 30, 4, 2);
    return s;
  };
}

/** A round iron bomb with a lit fuse (thrown in an arc). */
function bomb() {
  const s = new Sprite(16, 19);
  s.ellipse(7.6, 12, 6.4, 6.2, C.iron);
  s.spot(5.2, 9.6, 1.6, 1.2, C.iron[0]);
  s.rect(5.8, 4.6, 3.6, 2.4, C.iron, 0.1);
  s.ellipse(7.6, 4.6, 1.8, 0.7, C.iron, 0.2);
  s.taper(7.8, 4.2, 10.6, 1.8, 0.5, 0.35, C.sand);
  s.ellipse(11.4, 1.6, 1.4, 1.4, P.flame, 0.2);
  sparkle(s, 12.6, 1.2, 1.6, '#fff1b0');
  return s;
}

/** A javelin, flying right: a wooden shaft, a leaf-shaped steel head, a tied tassel. The Dragon Lance is red and gold. */
function spear(shaft, head, tassel) {
  return () => {
    const s = new Sprite(38, 8);
    s.capsule(1.5, 4, 29, 4, 0.75, shaft);
    s.capsule(26.6, 4, 28.4, 4, 1, C.brass);
    s.taper(27, 4.6, 24.4, 7.4, 0.7, 0.35, tassel);
    s.poly([[28.6, 4], [31, 1.8], [37.4, 4], [31, 6.2]], head);
    s.line(30, 3.4, 35.8, 4, 0.22, head[0]);
    s.poly([[0.6, 2.6], [3, 4], [0.6, 5.4]], head, 0.1);
    return s;
  };
}

/** A four-bladed throwing star (spun in game). */
function shuriken() {
  const s = new Sprite(15, 15);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 - Math.PI / 4;
    s.taper(7.5, 7.5, 7.5 + Math.cos(a) * 7, 7.5 + Math.sin(a) * 7, 2.6, 0.2, C.steel, i % 2 ? -0.08 : 0.08);
  }
  s.ellipse(7.5, 7.5, 2.2, 2.2, C.iron);
  s.ellipse(7.5, 7.5, 0.9, 0.9, C.iron, { flat: C.iron[3], outline: false });
  return s;
}

/** Sentry Turret: a little crossbow on a wooden tripod, aiming right. The Ballista is brass. */
function turret(metal) {
  return () => {
    const s = new Sprite(25, 25);
    s.capsule(12, 13, 5.4, 23, 1, C.wood).capsule(12, 13, 18.6, 23, 1, C.wood).capsule(12, 13, 12, 23.6, 1, C.wood, -0.1);
    s.rect(4, 9, 16, 4, C.wood, 0.1);
    s.line(5, 11.4, 19, 11.4, 0.25, C.wood[2]);
    for (let i = 0; i < 8; i++) {
      const a0 = -1.1 + (i / 8) * 2.2;
      const a1 = -1.1 + ((i + 1) / 8) * 2.2;
      s.capsule(14 + Math.cos(a0) * 5.4, 11 + Math.sin(a0) * 8, 14 + Math.cos(a1) * 5.4, 11 + Math.sin(a1) * 8, 0.85, metal);
    }
    s.line(16.4, 4.2, 13.6, 11, 0.2, C.cream[2]).line(13.6, 11, 16.4, 17.8, 0.2, C.cream[2]);
    s.poly([[20, 9.6], [24, 11], [20, 12.4]], metal);
    s.ellipse(6, 11, 1.4, 1.4, metal, 0.1);
    return s;
  };
}

/** Ward Orb (circles the hero): a glassy orb with a glint and a glow. The Aegis orb is gold. */
function ward(ramp, glow) {
  return async () => {
    const s = new Sprite(19, 19);
    s.ellipse(9.5, 9.5, 5, 5, ramp, 0.05);
    stroke(s, curve(6.4, 9, 7, 6.2, 10, 5.6), 0.45, '#ffffff');
    sparkle(s, 12.2, 11.8, 1.6);
    return glowing(s, glow, { strength: 0.6 });
  };
}

// ------------------------------------------------------------------ The Archer's skills, drawn to match their names

/** Arrow Vulcan's arrow: brass-tipped, gilded shaft, golden fletching. */
function arrowGold() {
  const s = new Sprite(25, 8);
  s.capsule(2.5, 4, 19, 4, 0.6, C.brass);
  fletching(s, 0.8, 4, 6.2, 2.4, ['#fff1b8', '#f2cf6a', '#c9a043', '#5a4822']);
  s.capsule(7, 4, 8, 4, 0.8, C.brick).capsule(17.2, 4, 18.2, 4, 0.8, C.brick);
  s.poly([[18.2, 1.9], [24.2, 4], [18.2, 6.1], [19.4, 4]], C.brass);
  s.line(19.2, 3.2, 23, 4, 0.22, C.brass[0]);
  sparkle(s, 21.4, 2, 1.1);
  return s;
}

/** Charge Arrow: a heavy iron-headed arrow with a curved shockwave bowing out ahead of its head. */
function arrowCharge() {
  const s = new Sprite(34, 14);
  const wave = [];
  for (let i = 0; i <= 12; i++) {
    const a = -1.15 + (i / 12) * 2.3;
    wave.push([24 + Math.cos(a) * 8, 7 + Math.sin(a) * 6.4]);
  }
  stroke(s, wave, 1.1, '#f2d98a');
  const inner = wave.map(([x, y]) => [x - 2.2, 7 + (y - 7) * 0.8]);
  stroke(s, inner, 0.6, '#fff4cc');
  s.capsule(3, 7, 25, 7, 1, C.wood);
  fletching(s, 1, 7, 8, 3.4, P.fletch);
  s.capsule(9, 7, 10.6, 7, 1.25, C.leather).capsule(22.6, 7, 24.2, 7, 1.25, C.iron);
  s.poly([[24, 3.4], [32.6, 7], [24, 10.6], [26, 7]], C.steel);
  s.line(25.6, 5.8, 31.2, 7, 0.3, C.steel[0]);
  return s;
}

/** Phantasmic Arrow: a big pale-blue spirit arrow, softly glowing. */
async function arrowPhantom() {
  const s = new Sprite(38, 14);
  s.taper(4, 7, 26, 7, 0.4, 1.1, P.spirit, { flat: P.spirit[1] });
  for (const k of [-1, 1]) s.poly([[1, 7 + k * 4.2], [6.5, 7 + k * 4.2], [12, 7 + k * 0.4], [4, 7 + k * 0.3]], P.spirit, { flat: P.spirit[0] });
  s.poly([[25, 3.2], [36.6, 7], [25, 10.8], [27.6, 7]], P.ice);
  s.line(27, 5.6, 34.8, 7, 0.35, '#ffffff');
  s.line(6, 7, 25, 7, 0.3, '#ffffff');
  sparkle(s, 31, 3.6, 1.6);
  sparkle(s, 12, 10.6, 1);
  return glowing(s, '#a9dcf2', { cx: 20, cy: 7, rx: 19, ry: 7, strength: 0.55 });
}

/** Where an Arrow Shower falls (seen from above, flattened): a faint ring of scuffed earth, arrows stuck in it. */
function showerMark() {
  const s = new Sprite(66, 35);
  // A dashed ring of scuffed earth marks the spot.
  for (let i = 0; i < 22; i++) {
    const a = (i / 22) * Math.PI * 2;
    s.ellipse(33 + Math.cos(a) * 29, 17.5 + Math.sin(a) * 14.6, 1.8, 0.8, C.umber, { flat: '#7a6249', outline: false, rot: a + Math.PI / 2 });
  }
  const stuck = [[14, 15, -0.25], [24, 25, 0.15], [33, 12, -0.05], [42, 22, 0.3], [52, 14, 0.2], [27, 18, -0.35], [47, 28, -0.1], [18, 27, 0.25], [38, 30, 0.05], [57, 22, -0.3]];
  for (const [x, y, lean] of stuck) {
    s.ellipse(x, y + 0.4, 2, 0.8, C.umber, { flat: '#6d5640', outline: false });
    s.save().pivot(x, y, lean);
    s.capsule(x, y, x, y - 7, 0.45, C.wood);
    s.poly([[x - 1.6, y - 9.6], [x, y - 7.2], [x + 1.6, y - 9.6], [x, y - 8.6]], P.fletch);
    s.restore();
  }
  return s;
}

/** Ankle Snare (seen from above, flattened): a loop of rope pulled into a noose, tangled with green vines. */
function snare() {
  const s = new Sprite(44, 24);
  const loop = [];
  for (let i = 0; i <= 28; i++) {
    const a = (i / 28) * Math.PI * 2;
    loop.push([22 + Math.cos(a) * 18, 12 + Math.sin(a) * 9]);
  }
  for (let i = 0; i < loop.length - 1; i++) s.capsule(loop[i][0], loop[i][1], loop[i + 1][0], loop[i + 1][1], 1.15, C.sand);
  for (let i = 0; i < 28; i += 2) s.line(loop[i][0] - 0.6, loop[i][1] - 0.6, loop[i][0] + 0.6, loop[i][1] + 0.6, 0.25, C.sand[2]);
  s.capsule(40, 12, 43, 10.5, 1.3, C.sand).ellipse(39.6, 12, 2, 1.7, C.sand, 0.1);
  for (const [a0, a1] of [[0.3, 1.5], [2.2, 3.3], [3.9, 5.1], [5.4, 6.2]]) {
    const vine = [];
    for (let i = 0; i <= 8; i++) {
      const a = a0 + ((a1 - a0) * i) / 8;
      const w = Math.sin(i * 1.7) * 1.6;
      vine.push([22 + Math.cos(a) * (18 + w), 12 + Math.sin(a) * (9 + w * 0.5)]);
    }
    for (let i = 0; i < vine.length - 1; i++) s.capsule(vine[i][0], vine[i][1], vine[i + 1][0], vine[i + 1][1], 0.55, C.leaf);
    const [lx, ly] = vine[4];
    s.ellipse(lx, ly - 1.2, 1.6, 0.9, C.leaf, { rot: 0.6, bias: 0.15 });
  }
  return s;
}

/** Shockwave Trap (seen from above, flattened): an iron trap plate with a glowing rune and brass studs. */
function snareShock() {
  const s = new Sprite(44, 24);
  s.ellipse(22, 12, 19, 10, C.iron);
  s.ellipse(22, 12, 15.4, 7.8, C.iron, { flat: C.iron[2], outline: false });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    s.ellipse(22 + Math.cos(a) * 17, 12 + Math.sin(a) * 8.8, 1.2, 0.8, C.brass, 0.1);
  }
  s.ellipse(22, 12, 9, 4.6, ['#fff4c4', '#f2cf6a', '#c9a043', '#5a4822'], 0.2);
  s.ellipse(22, 12, 5.6, 2.8, ['#fffbe8', '#fff1b8', '#f2cf6a', '#8a6a2a'], { flat: '#fff1b8', outline: false });
  s.line(16, 12, 28, 12, 0.35, '#c9a043').line(22, 8.6, 22, 15.4, 0.35, '#c9a043');
  return s;
}

/** Land Mine: a squat brass mine half sunk in a mound of earth, a lit spark on its fuse. */
function mine() {
  const s = new Sprite(22, 18);
  s.ellipse(11, 14, 10, 3.6, C.umber, 0.1);
  s.ellipse(11, 10.6, 7, 5.6, C.brass);
  s.ellipse(11, 13.2, 9, 2.4, C.umber, { flat: C.umber[1] });
  s.line(5.6, 10.6, 16.4, 10.6, 0.3, C.brass[2]);
  for (const x of [7, 11, 15]) s.spot(x, 9, 0.5, 0.5, C.brass[3]);
  s.capsule(11, 5.4, 12.4, 3, 0.45, C.sand);
  s.ellipse(12.8, 2.4, 1.2, 1.2, P.flame, 0.2);
  sparkle(s, 13.6, 2, 1.6, '#fff1b0');
  return s;
}

/** Freezing Trap: an iron jaw trap, its teeth crusted with ice crystals, set flat on the ground. */
function mineFrost() {
  const s = new Sprite(26, 18);
  s.ellipse(13, 12, 12, 4.4, C.slate);
  s.ellipse(13, 12, 8.6, 2.8, C.slate, { flat: C.slate[2], outline: false });
  for (let i = 0; i < 7; i++) {
    const x = 4.6 + i * 2.8;
    s.taper(x, 10.4, x + 0.4, 6.4 - (i % 2) * 1.4, 1, 0.2, C.steel);
    s.taper(x + 1.2, 13.8, x + 1.4, 16.4, 0.9, 0.2, C.steel);
  }
  for (const [x, y, h] of [[6, 8, 4], [12, 6.4, 5], [18.4, 7.6, 4.4], [9, 10, 3], [16, 10.6, 3]]) s.poly([[x - 1.1, y + h * 0.6], [x, y - h * 0.4], [x + 1.1, y + h * 0.6]], P.ice, 0.2);
  s.ellipse(13, 12, 2, 1, C.brass, 0.1);
  sparkle(s, 19.4, 4.4, 1.6);
  return s;
}

/** A falcon from above, gliding to the right: wings spread wide, tail fanned behind, head forward. */
function falconOf(body, wing, belly) {
  const s = new Sprite(26, 26);
  // Wings (each a long feathered blade), then the tail, body and head.
  for (const k of [-1, 1]) {
    s.poly([[15, 13 + k * 2], [12.6, 13 + k * 8], [9.4, 13 + k * 12.4], [6.8, 13 + k * 11.6], [5.6, 13 + k * 7.6], [8.8, 13 + k * 2.4]], wing, k < 0 ? 0.12 : -0.05);
    for (let i = 0; i < 4; i++) s.line(6.2 + i * 0.9, 13 + k * (8.6 + i * 0.8), 9.4 + i * 0.9, 13 + k * (4 + i * 1.2), 0.2, wing[2]);
    s.line(14, 13 + k * 3, 10.4, 13 + k * 11.4, 0.25, wing[0]);
  }
  s.poly([[7.4, 13], [1.6, 9.6], [0.8, 13], [1.6, 16.4]], wing, 0.05);
  s.ellipse(12.6, 13, 6, 2.6, body);
  s.ellipse(12.4, 13, 3.6, 1.4, belly, { flat: belly[1], outline: false });
  s.ellipse(18.2, 13, 2.4, 2.1, body, 0.1);
  s.poly([[20.2, 12.2], [22.4, 13], [20.2, 13.8]], C.brass);
  s.spot(18.8, 12, 0.45, 0.45, '#20160f').spot(18.8, 14, 0.45, 0.45, '#20160f');
  return s;
}

/** Blitz Beat's falcon: brown and cream. */
function falcon() {
  return falconOf(['#b58a5e', '#8c6440', '#6a4a2e', '#3a2717'], ['#a27a50', '#7e5a38', '#5e4229', '#33231a'], C.cream);
}

/** Falcon Assault: the same falcon in gold, glowing. */
async function falconGold() {
  const s = falconOf(['#f6dd8a', '#d9b252', '#a98436', '#5a4420'], ['#fbe7a4', '#e3c06a', '#b8913f', '#5e4822'], C.ivory);
  sparkle(s, 21.4, 9.4, 1.4);
  return glowing(s, '#f6dd8a', { strength: 0.55 });
}

export const ART = {
  arrow,
  arrow_storm: arrowStorm,
  dagger,
  dagger_gold: daggerGold,
  boomerang,
  flask,
  puddle,
  trap: trap(C.iron, C.slate, C.ruby),
  trap_frost: trap(P.ice, C.slate, P.ice),
  wisp,
  twister,
  fireball,
  orb,
  meteor,
  spark,
  explosion,
  bolt,
  ice_shard: iceShard,
  star_bolt: starBolt,
  slash,
  axe: axe(C.steel, C.wood),
  axe_titan: axe(C.brass, C.umber, P.ice),
  bomb,
  spear: spear(C.wood, C.steel, C.brick),
  spear_dragon: spear(C.brick, C.brass, C.brass),
  shuriken,
  turret: turret(C.iron),
  turret_gold: turret(C.brass),
  ward: ward(P.ice, '#a9dcf2'),
  ward_holy: ward(C.brass, '#f2d98a'),
  arrow_gold: arrowGold,
  arrow_charge: arrowCharge,
  arrow_phantom: arrowPhantom,
  shower_mark: showerMark,
  snare,
  snare_shock: snareShock,
  mine,
  mine_frost: mineFrost,
  falcon,
  falcon_gold: falconGold,
};
