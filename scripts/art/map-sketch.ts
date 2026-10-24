/**
 * npm run map:sketch -- <level id>
 *
 * Draws a level's layout sketch from its data in src/td/levels.ts: flat colours for sky, island, road, tower
 * spots, dock and vault, plus each level's landmarks (below, keyed by level id) for Codex to paint: trees,
 * windmills, a stream with bridges, cliffs, a lighthouse. Codex paints the finished map over it, so the art
 * lines up with the gameplay. Writes art/maps/<id>-sketch.png and public/maps/<id>-sketch.png (the stand-in
 * map until the art arrives).
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { checkLevel, LEVELS, type LevelDef } from '../../src/td/levels';
import { closedCurve, Path, type Pt } from '../../src/td/path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');

const INK = '#3b2a2a';
const WATER = '#8fd8ff';
const pts = (p: Pt[]) => p.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
/** A smooth open line through the points. */
const curve = (p: Pt[]) => new Path(p, 12).points;

/** What a level's scenery is drawn against. */
interface Scene {
  level: LevelDef;
  road: Path;
  /** Whether a prop of radius `r` at `p` keeps off the road and the tower spots. */
  clear(p: Pt, r?: number): boolean;
}

/** Sketch-only scenery for one level (the game itself only needs the road, spots, dock, vault and island). */
interface Decor {
  /** Clouds as [x, y, radius]. */
  clouds: [number, number, number][];
  /** How far the cliff face shows below the island's rim, and its colours (face, underside). */
  cliff: number;
  rock?: [string, string];
  /** Rock hanging under the island, drawn behind the cliff face. */
  underside: Pt[];
  /** Drawn over the cliff face, behind the island (cracks, floating rocks). */
  back?(s: Scene): string;
  /** Water falling off the rim: from the rim to where it leaves the picture. */
  waterfalls?: [Pt, Pt][];
  /** The island's top colour. */
  grass?: string;
  /** Painted on the island top, under the road (terraces, fields, rock patches). */
  ground?(s: Scene): string;
  /** A stream across the island (from source to rim): drawn under the road, with a bridge wherever the road crosses it. */
  stream?: Pt[];
  trees?: Pt[];
  /** Drawn over the road and trees, under the tower spots (windmills, rocks, the lighthouse). */
  props?(s: Scene): string;
}

// ---------------------------------------------------------------- props

const tree = ([x, y]: Pt, r = 34) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#3f8a3c" stroke="${INK}" stroke-width="4"/>`;

/** A windmill seen from the front: a white tower with a red cap and four sails (it stands at `x, y`, the sails' hub above). */
function windmill([x, y]: Pt, turn = 20): string {
  const hub: Pt = [x, y - 92];
  const sail = (a: number) =>
    `<g transform="rotate(${a} ${hub[0]} ${hub[1]})"><rect x="${hub[0] - 3}" y="${hub[1] - 92}" width="6" height="92" fill="#6d4a2e"/>` +
    `<rect x="${hub[0] + 3}" y="${hub[1] - 88}" width="22" height="66" fill="#ffffff" stroke="#6d4a2e" stroke-width="3"/></g>`;
  return `<ellipse cx="${x}" cy="${y + 4}" rx="46" ry="14" fill="#3f8a3c"/>
  <polygon points="${pts([[x - 38, y], [x - 26, y - 96], [x + 26, y - 96], [x + 38, y]])}" fill="#ffffff" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>
  <rect x="${x - 11}" y="${y - 34}" width="22" height="34" fill="#6d4a2e" stroke="${INK}" stroke-width="3"/>
  <polygon points="${pts([[x - 32, y - 94], [x, y - 134], [x + 32, y - 94]])}" fill="#c0563c" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>
  ${[0, 90, 180, 270].map((a) => sail(a + turn)).join('')}
  <circle cx="${hub[0]}" cy="${hub[1]}" r="9" fill="#6d4a2e" stroke="${INK}" stroke-width="3"/>`;
}

/** A field of crops in rows: a tilted rectangle with stripes. */
function field([x, y]: Pt, w: number, h: number, angle: number, fill: string, rows: string): string {
  const lines = Array.from({ length: Math.floor(h / 18) }, (_, i) => `<line x1="${x - w / 2 + 8}" y1="${y - h / 2 + 12 + i * 18}" x2="${x + w / 2 - 8}" y2="${y - h / 2 + 12 + i * 18}" stroke="${rows}" stroke-width="5" stroke-linecap="round"/>`);
  return `<g transform="rotate(${angle} ${x} ${y})"><rect x="${x - w / 2}" y="${y - h / 2}" width="${w}" height="${h}" rx="10" fill="${fill}" stroke="#6d4a2e" stroke-width="4"/>${lines.join('')}</g>`;
}

/** A grey boulder. */
const rock = ([x, y]: Pt, r = 26) =>
  `<polygon points="${pts([[x - r, y + r * 0.4], [x - r * 0.7, y - r * 0.5], [x - r * 0.1, y - r * 0.8], [x + r * 0.8, y - r * 0.4], [x + r, y + r * 0.4], [x + r * 0.2, y + r * 0.7]])}" fill="#b9b4a6" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>`;

/** The old lighthouse: a striped tower rising behind the point `[x, y]` where it stands, its lamp lit. */
function lighthouse([x, y]: Pt): string {
  const h = 230;
  const half = (t: number) => 34 - 12 * t;
  const band = (t0: number, t1: number, fill: string) =>
    `<polygon points="${pts([[x - half(t0), y - h * t0], [x - half(t1), y - h * t1], [x + half(t1), y - h * t1], [x + half(t0), y - h * t0]])}" fill="${fill}"/>`;
  const top = y - h;
  return `<ellipse cx="${x}" cy="${y}" rx="50" ry="18" fill="#6d665c" stroke="${INK}" stroke-width="4"/>
  ${band(0, 0.25, '#ffffff')}${band(0.25, 0.5, '#d9534f')}${band(0.5, 0.75, '#ffffff')}${band(0.75, 1, '#d9534f')}
  <polygon points="${pts([[x - 34, y], [x - 22, top], [x + 22, top], [x + 34, y]])}" fill="none" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>
  <rect x="${x - 30}" y="${top - 8}" width="60" height="10" fill="${INK}"/>
  <rect x="${x - 18}" y="${top - 48}" width="36" height="40" fill="#ffe066" stroke="${INK}" stroke-width="4"/>
  <polygon points="${pts([[x - 26, top - 46], [x, top - 72], [x + 26, top - 46]])}" fill="${INK}" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>`;
}

/** A wooden bridge carrying the road over the stream at distance `d` along it. */
function bridge(level: LevelDef, road: Path, d: number): string {
  const [x, y] = road.at(d);
  const [dx, dy] = road.dirAt(d);
  const a = (Math.atan2(dy, dx) * 180) / Math.PI;
  const len = 96;
  const wid = level.roadWidth + 22;
  const planks = Array.from({ length: 7 }, (_, i) => `<line x1="${x - len / 2 + 8 + i * 13.3}" y1="${y - wid / 2 + 8}" x2="${x - len / 2 + 8 + i * 13.3}" y2="${y + wid / 2 - 8}" stroke="#6d4a2e" stroke-width="3"/>`);
  return `<g transform="rotate(${a.toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)})">
  <rect x="${x - len / 2}" y="${y - wid / 2}" width="${len}" height="${wid}" fill="#a8875a" stroke="${INK}" stroke-width="4"/>${planks.join('')}
  <rect x="${x - len / 2 - 6}" y="${y - wid / 2 - 6}" width="${len + 12}" height="12" rx="5" fill="#6d4a2e" stroke="${INK}" stroke-width="3"/>
  <rect x="${x - len / 2 - 6}" y="${y + wid / 2 - 6}" width="${len + 12}" height="12" rx="5" fill="#6d4a2e" stroke="${INK}" stroke-width="3"/></g>`;
}

/** Distances along the road where it crosses the polyline `line`. */
function crossings(road: Path, line: Pt[]): number[] {
  const out: number[] = [];
  const r = road.points;
  for (let i = 0; i < r.length - 1; i++)
    for (let j = 0; j < line.length - 1; j++) {
      const [p, p2, q, q2] = [r[i], r[i + 1], line[j], line[j + 1]];
      const [sx, sy, tx, ty] = [p2[0] - p[0], p2[1] - p[1], q2[0] - q[0], q2[1] - q[1]];
      const den = sx * ty - sy * tx;
      if (Math.abs(den) < 1e-9) continue;
      const u = ((q[0] - p[0]) * ty - (q[1] - p[1]) * tx) / den;
      const v = ((q[0] - p[0]) * sy - (q[1] - p[1]) * sx) / den;
      if (u >= 0 && u < 1 && v >= 0 && v < 1) out.push(road.along[i] + u * Math.hypot(sx, sy));
    }
  return out;
}

// ---------------------------------------------------------------- the levels' scenery

const DECOR: Record<string, Decor> = {
  // Sky Haven: a grassy island, a waterfall off the rim, trees.
  level1: {
    clouds: [[180, 120, 160], [1300, 90, 190], [120, 900, 220], [1350, 950, 240], [760, 1000, 260]],
    cliff: 80,
    underside: [[260, 820], [420, 960], [600, 1010], [760, 1024], [960, 1010], [1150, 950], [1320, 830]],
    waterfalls: [[[330, 815], [322, 1024]]],
    trees: [[300, 300], [430, 250], [700, 240], [900, 260], [1290, 410], [1360, 560], [1300, 760], [760, 870], [470, 820], [240, 620], [1010, 300], [640, 400]],
  },
  // The farm island: three terraces stepping down from the dock, fields, windmills, and a stream from a spring
  // at the top down over the rim, with a bridge at each of the road's two crossings.
  level2: {
    clouds: [[120, 80, 150], [1400, 70, 170], [90, 960, 200], [1440, 960, 230], [560, 1010, 240]],
    cliff: 80,
    underside: [[280, 870], [460, 980], [660, 1024], [900, 1024], [1100, 990], [1300, 880]],
    waterfalls: [[[895, 905], [892, 1024]]],
    grass: '#8fd365',
    ground: () => {
      // Lower tiers in deeper greens, each with a step face along its upper edge.
      const tier = (edge: Pt[], fill: string) => {
        const top = curve(edge);
        const shape = [...top, [1600, top[top.length - 1][1]] as Pt, [1600, 1100] as Pt, [-60, 1100] as Pt, [-60, top[0][1]] as Pt];
        return `<polygon points="${pts(shape)}" fill="${fill}"/>
  <polyline points="${pts(top)}" fill="none" stroke="#3f8a3c" stroke-width="16" stroke-linejoin="round"/>
  <polyline points="${pts(top.map(([x, y]) => [x, y - 8]))}" fill="none" stroke="${INK}" stroke-width="3" stroke-linejoin="round" opacity="0.55"/>`;
      };
      return `<g clip-path="url(#isle)">
  ${tier([[-60, 590], [200, 588], [420, 572], [640, 570], [900, 578], [1100, 570], [1300, 566], [1600, 566]], '#7cc85a')}
  ${tier([[-60, 735], [300, 728], [500, 735], [700, 740], [960, 736], [1200, 722], [1600, 712]], '#6cb84e')}
  ${field([520, 205], 140, 84, -4, '#ecd060', '#a8875a')}
  ${field([1090, 215], 140, 80, 5, '#a8875a', '#6d4a2e')}
  ${field([640, 870], 150, 60, -2, '#ecd060', '#a8875a')}
  ${field([1150, 858], 110, 50, -8, '#a8875a', '#6d4a2e')}
  <ellipse cx="880" cy="170" rx="64" ry="32" fill="${WATER}" stroke="${INK}" stroke-width="4"/>
</g>`;
    },
    stream: [[880, 175], [868, 250], [890, 330], [880, 420], [866, 500], [878, 590], [875, 660], [888, 760], [895, 910]],
    trees: [[170, 420], [1360, 330], [1370, 560], [1140, 790], [420, 600], [640, 590], [1330, 690], [1000, 590], [400, 230], [640, 760]],
    props: () => `${windmill([1270, 260], 15)}${windmill([175, 720], 40)}${windmill([670, 250], 5)}`,
  },
  // A rocky headland: grey cliffs and outcrops, boulders, a few wind-bent trees, the old lighthouse on the western
  // point (the vault at its foot) and the pirates' landing on the far (south-east) side.
  level3: {
    clouds: [[230, 100, 170], [1280, 60, 190], [80, 930, 210], [1150, 1000, 250], [600, 1010, 200]],
    cliff: 100,
    rock: ['#8c8478', '#6d665c'],
    underside: [[200, 720], [380, 900], [600, 990], [860, 1024], [1100, 1010], [1330, 940], [1420, 820]],
    back: () => {
      // Cracks down the cliff face, and two little rocks floating off the island.
      const cracks = [[160, 650], [330, 760], [520, 860], [760, 905], [1000, 915], [1240, 900], [1420, 760]]
        .map(([x, y]) => `<polyline points="${pts([[x, y + 10], [x + 8, y + 40], [x - 4, y + 66]])}" fill="none" stroke="#6d665c" stroke-width="5" stroke-linecap="round"/>`);
      const islet = ([x, y]: Pt, r: number) =>
        `<polygon points="${pts([[x - r, y], [x - r * 0.4, y + r * 0.9], [x + r * 0.2, y + r * 1.2], [x + r * 0.6, y + r * 0.7], [x + r, y]])}" fill="#8c8478" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>
  <ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r * 0.38}" fill="#a3cf6e" stroke="${INK}" stroke-width="5"/>`;
      return `${cracks.join('')}${islet([1480, 160], 46)}${islet([70, 250], 38)}`;
    },
    grass: '#a3cf6e',
    ground: (s) => {
      // A band of bare rock round the rim, and stony outcrops (centre, radii).
      const outcrops: [Pt, number, number][] = [
        [[640, 175], 110, 50], [[1200, 190], 130, 50], [[1400, 440], 50, 110], [[560, 840], 120, 50], [[1150, 880], 150, 46],
        [[120, 600], 70, 40], [[700, 760], 70, 40], [[1240, 560], 46, 34],
      ];
      return `<g clip-path="url(#isle)">
  <polygon points="${pts(closedCurve(s.level.island))}" fill="none" stroke="#b9b4a6" stroke-width="44" stroke-linejoin="round"/>
  ${outcrops.map(([[x, y], rx, ry]) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="#b9b4a6" stroke="#8c8478" stroke-width="4"/>`).join('')}
</g>`;
    },
    trees: [[470, 300], [800, 170], [1000, 860], [560, 700], [1010, 420], [300, 440], [1200, 560], [650, 560], [1340, 300], [570, 860]],
    props: (s) => {
      const boulders: Pt[] = [[700, 175], [1250, 180], [1395, 400], [520, 830], [1180, 880], [140, 610], [690, 770], [1410, 650], [330, 650], [960, 140]];
      return `${boulders.filter((p) => s.clear(p, 30)).map((p) => rock(p)).join('')}${lighthouse([135, 470])}`;
    },
  },
};

export function sketchSvg(level: LevelDef): string {
  const decor = DECOR[level.id];
  if (!decor) throw new Error(`No sketch scenery for "${level.id}"`);
  const { w, h } = level.map;
  const road = new Path(level.route);
  const island = closedCurve(level.island);
  const clear = (p: Pt, r = 34) => road.nearest(p).dist > level.roadWidth / 2 + r + 26 && level.slots.every((s) => Math.hypot(s[0] - p[0], s[1] - p[1]) > level.slotRadius + r + 16);
  const scene: Scene = { level, road, clear };
  // The rocky cliff: the island shape dropped a little, with the underside hanging below it.
  const cliff = island.map(([x, y]): Pt => [x, y + decor.cliff]);
  const [face, under] = decor.rock ?? ['#8a6a4c', '#76583e'];
  const [dx, dy] = level.dock;
  // The landing stage runs from the dock off the nearest side of the picture.
  const left = dx < w / 2;
  const deck = left ? { x: 0, w: dx + 40 } : { x: dx - 40, w: w - dx + 40 };
  const plank0 = left ? dx + 20 - 4 * 28 : dx - 20;
  const stream = decor.stream && curve(decor.stream);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs><clipPath id="isle"><polygon points="${pts(island)}"/></clipPath></defs>
  <rect width="${w}" height="${h}" fill="#bfe6ff"/>
  ${decor.clouds.map(([x, y, r]) => `<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r * 0.42}" fill="#ffffff"/>`).join('')}
  <polygon points="${pts(decor.underside)}" fill="${under}" stroke="${INK}" stroke-width="6" stroke-linejoin="round"/>
  <polygon points="${pts(cliff)}" fill="${face}" stroke="${INK}" stroke-width="6" stroke-linejoin="round"/>
  ${decor.back?.(scene) ?? ''}
  ${(decor.waterfalls ?? []).map(([[x1, y1], [x2, y2]]) => `<path d="M ${x1} ${y1} L ${x2} ${y2}" stroke="${WATER}" stroke-width="28"/>`).join('')}
  <polygon points="${pts(island)}" fill="${decor.grass ?? '#7cc85a'}" stroke="${INK}" stroke-width="6" stroke-linejoin="round"/>
  ${decor.ground?.(scene) ?? ''}
  ${stream ? `<g clip-path="url(#isle)"><polyline points="${pts(stream)}" fill="none" stroke="${INK}" stroke-width="38" stroke-linecap="round" stroke-linejoin="round"/><polyline points="${pts(stream)}" fill="none" stroke="${WATER}" stroke-width="30" stroke-linecap="round" stroke-linejoin="round"/></g>` : ''}
  ${decor.ground ? `<polygon points="${pts(island)}" fill="none" stroke="${INK}" stroke-width="6" stroke-linejoin="round"/>` : ''}
  <polyline points="${pts(road.points)}" fill="none" stroke="#a8875a" stroke-width="${level.roadWidth + 12}" stroke-linecap="round" stroke-linejoin="round"/>
  <polyline points="${pts(road.points)}" fill="none" stroke="#e2c48a" stroke-width="${level.roadWidth}" stroke-linecap="round" stroke-linejoin="round"/>
  ${stream ? crossings(road, stream).map((d) => bridge(level, road, d)).join('') : ''}
  <rect x="${deck.x}" y="${dy - 58}" width="${deck.w}" height="116" fill="#9a6a3c" stroke="${INK}" stroke-width="5"/>
  ${[0, 1, 2, 3, 4].map((i) => `<line x1="${plank0 + i * 28}" y1="${dy - 58}" x2="${plank0 + i * 28}" y2="${dy + 58}" stroke="#6d4a2e" stroke-width="4"/>`).join('')}
  ${(decor.trees ?? []).filter((p) => clear(p)).map((p) => tree(p)).join('')}
  ${decor.props?.(scene) ?? ''}
  ${level.slots.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="${level.slotRadius}" fill="#c4c4c4" stroke="#555" stroke-width="5"/><circle cx="${x}" cy="${y}" r="${level.slotRadius * 0.62}" fill="none" stroke="#9a9a9a" stroke-width="4"/>`).join('')}
  <circle cx="${level.vault[0]}" cy="${level.vault[1]}" r="62" fill="#a9a9b8" stroke="${INK}" stroke-width="5"/>
  <polygon points="${pts([[level.vault[0], level.vault[1] - 58], [level.vault[0] + 30, level.vault[1] - 6], [level.vault[0], level.vault[1] + 22], [level.vault[0] - 30, level.vault[1] - 6]])}" fill="#6ff0ff" stroke="#1d7f8a" stroke-width="4"/>
</svg>`;
}

async function main() {
  const id = process.argv[2] ?? 'level1';
  const level = LEVELS[id];
  if (!level) throw new Error(`No level "${id}"`);
  const problems = checkLevel(level);
  for (const p of problems) console.log(`! ${p}`);
  // Flat colours, so a small palette keeps the file small enough to embed in the prompt page.
  const png = await sharp(Buffer.from(sketchSvg(level))).png({ palette: true, colours: 64, dither: 0 }).toBuffer();
  for (const dir of ['art/maps', 'public/maps']) {
    mkdirSync(join(ROOT, dir), { recursive: true });
    writeFileSync(join(ROOT, dir, `${id}-sketch.png`), png);
  }
  console.log(`Wrote art/maps/${id}-sketch.png and public/maps/${id}-sketch.png`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
