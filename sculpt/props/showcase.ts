/** Props for the character showcase: a little floating island stage, the arrow, loot. */
import type { PropDef } from '../props';
import {
  capsule, cylinder, displaced, ellipsoid, fbm, hex, intersect, mixRgb, painted, roundBox, roundCone, smoothstep, sphere, torus, union,
  type Shape, type Vec3,
} from '../sdf';

const C = {
  grass: hex('#5fb548'),
  grassLight: hex('#84cc52'),
  grassDark: hex('#43913b'),
  dirt: hex('#9b6a43'),
  rock: hex('#9a8d86'),
  rockDark: hex('#6f6461'),
  rockWarm: hex('#b49a84'),
  moss: hex('#6fae4f'),
  flowerW: hex('#fff7ef'),
  flowerY: hex('#ffd34d'),
  flowerP: hex('#ff8fb7'),
  wood: hex('#b97a40'),
  steel: hex('#e2e7ef'),
  fletch: hex('#e5534b'),
  gold: hex('#ffcf4a'),
  goldDark: hex('#e2a62a'),
  crystal: hex('#6ff0ff'),
  white: hex('#ffffff'),
};

function isletTop(r: number): Shape {
  const slab = displaced(cylinder(r, 0.07, 0.06).place([0, -0.07, 0]), 0.012, 3.2);
  return painted(slab, (p, base) => {
    const n = fbm(p[0] * 2.2, 0, p[2] * 2.2);
    let c = mixRgb(base, n > 0 ? C.grassLight : C.grassDark, Math.min(1, Math.abs(n) * 1.3));
    const rad = Math.hypot(p[0], p[2]);
    if (p[1] < -0.07) c = C.dirt; // the side of the slab shows earth
    else c = mixRgb(c, C.grassDark, 0.35 * smoothstep(r - 0.15, r, rad));
    return c;
  }).color(C.grass);
}

function isletRock(r: number): Shape {
  // An upside-down mountain: stacked, shrinking lumps melted together, flat on top.
  const layers: Shape[] = [
    ellipsoid(r * 0.97, 0.26 * r, r * 0.97).place([0, -0.2 * r, 0]),
    ellipsoid(r * 0.74, 0.28 * r, r * 0.74).place([0.06 * r, -0.45 * r, -0.04 * r]),
    ellipsoid(r * 0.5, 0.26 * r, r * 0.5).place([-0.05 * r, -0.68 * r, 0.03 * r]),
    ellipsoid(r * 0.26, 0.22 * r, r * 0.26).place([0.04 * r, -0.9 * r, 0]),
  ];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.4;
    layers.push(sphere(r * 0.26).place([Math.cos(a) * r * 0.66, -0.36 * r, Math.sin(a) * r * 0.66]));
  }
  const body = displaced(union(layers, r * 0.22), 0.045 * r, 2.4 / r);
  const flatTop = roundBox(r * 1.5, r, r * 1.5, 0.01).place([0, -0.12 - r, 0]);
  const rock = intersect(body, flatTop, 0.03);
  return painted(rock, (p, base) => {
    const band = Math.sin(p[1] * 18 + fbm(p[0] * 3, p[1] * 3, p[2] * 3) * 3);
    let c = mixRgb(base, band > 0 ? C.rockWarm : C.rockDark, Math.abs(band) * 0.45);
    // Earth just under the grass, moss creeping down.
    c = mixRgb(c, C.dirt, smoothstep(-0.26, -0.14, p[1]));
    c = mixRgb(c, C.moss, 0.6 * smoothstep(-0.36, -0.22, p[1]) * smoothstep(0.1, 0.4, fbm(p[0] * 4, p[1] * 4, p[2] * 4)));
    return c;
  }).color(C.rock);
}

function tuft(at: Vec3, s: number): Shape {
  const blades: Shape[] = [];
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const tip: Vec3 = [at[0] + Math.cos(a) * 0.03 * s, at[1] + 0.09 * s, at[2] + Math.sin(a) * 0.03 * s];
    blades.push(roundCone(at, tip, 0.018 * s, 0.003));
  }
  return union(blades, 0.01).color(C.grassDark).as('cloth');
}

function flower(at: Vec3, petal: [number, number, number]): Shape {
  const stem = capsule(at, [at[0], at[1] + 0.07, at[2]], 0.005).color(C.grassDark);
  const head: Vec3 = [at[0], at[1] + 0.075, at[2]];
  const petals: Shape[] = [];
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    petals.push(ellipsoid(0.016, 0.006, 0.01).place([head[0] + Math.cos(a) * 0.015, head[1], head[2] + Math.sin(a) * 0.015], [0, (-a * 180) / Math.PI, 0]));
  }
  const center = sphere(0.009).place(head).color(C.flowerY);
  return union([stem, union(petals, 0.004).color(petal), center]);
}

function pebble(at: Vec3, s: number): Shape {
  return displaced(ellipsoid(0.05 * s, 0.03 * s, 0.04 * s).place(at), 0.006 * s, 18).color(C.rock);
}

export function islet(): PropDef {
  const r = 1.25;
  const deco: { shape: Shape; cell: number; maxTris?: number }[] = [];
  const ring = (i: number, n: number, rr: number, off = 0) => {
    const a = (i / n) * Math.PI * 2 + off;
    return [Math.cos(a) * rr, 0, Math.sin(a) * rr] as Vec3;
  };
  for (let i = 0; i < 9; i++) deco.push({ shape: tuft(ring(i, 9, 0.95 + (i % 3) * 0.08, 0.2), 1 + (i % 2) * 0.4), cell: 0.004, maxTris: 260 });
  const petals = [C.flowerW, C.flowerP, C.flowerW, C.flowerY, C.flowerP, C.flowerW];
  for (let i = 0; i < 6; i++) deco.push({ shape: flower(ring(i, 6, 1.02, 0.55), petals[i]), cell: 0.0035, maxTris: 300 });
  for (let i = 0; i < 4; i++) deco.push({ shape: pebble(ring(i, 4, 1.08, 1.1), 1 + (i % 2) * 0.6), cell: 0.005, maxTris: 160 });
  return {
    name: 'islet',
    pieces: [
      { shape: isletTop(r), cell: 0.014, maxTris: 5000 },
      { shape: isletRock(r), cell: 0.022, maxTris: 5000 },
      ...deco,
    ],
  };
}

/** Arrow pointing +Z, nock at the origin. */
export function arrow(): PropDef {
  const shaft = capsule([0, 0, 0.0], [0, 0, 0.3], 0.0065).color(C.wood);
  const head = roundCone([0, 0, 0.3], [0, 0, 0.36], 0.02, 0.002).color(C.steel).as('metal');
  const feathers: Shape[] = [0, 120, 240].map((a) =>
    ellipsoid(0.002, 0.016, 0.04).place([0, 0.011, 0.05]).place([0, 0, 0], [0, 0, a]).color(C.fletch).as('cloth'),
  );
  return { name: 'arrow', pieces: [{ shape: union([shaft, head, ...feathers]), cell: 0.0022, maxTris: 700 }] };
}

export function coin(): PropDef {
  const disc = cylinder(0.045, 0.008, 0.006);
  const rim = torus(0.042, 0.006);
  const star: Shape[] = [];
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    star.push(capsule([0, 0.008, 0], [Math.cos(a) * 0.022, 0.008, Math.sin(a) * 0.022], 0.005));
  }
  const shape = union([disc.color(C.gold), rim.color(C.goldDark), union(star, 0.004).color(C.goldDark)], 0.002).as('metal');
  return { name: 'coin', pieces: [{ shape: shape.place([0, 0, 0], [90, 0, 0]), cell: 0.002, maxTris: 600 }] };
}

export function shard(): PropDef {
  const core = roundCone([0, -0.05, 0], [0, 0.06, 0], 0.035, 0.008);
  const side = roundCone([0.02, -0.04, 0.005], [0.05, 0.02, 0.01], 0.018, 0.004);
  const shape = painted(union([core, side, side.mirrored()], 0.008), (p, base) => mixRgb(base, C.white, 0.5 * smoothstep(0, 0.05, p[1])));
  return { name: 'shard', pieces: [{ shape: shape.color(C.crystal).as('glow'), cell: 0.0025, maxTris: 400 }] };
}
