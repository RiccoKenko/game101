/**
 * npm run map:sketch -- <level id>
 *
 * Draws a level's layout sketch from its data in src/td/levels.ts: flat colours for sky, island, road, tower
 * spots, dock and vault. ChatGPT paints the finished map over it, so the art lines up with the gameplay.
 * Writes art/maps/<id>-sketch.png and public/maps/<id>-sketch.png (the stand-in map until the art arrives).
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { LEVEL1, type LevelDef } from '../../src/td/levels';
import { Path, type Pt } from '../../src/td/path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
const LEVELS: Record<string, LevelDef> = { level1: LEVEL1 };

const pts = (p: Pt[]) => p.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');

/** A smooth closed outline through the points (Catmull-Rom, wrapped). */
function closedCurve(p: Pt[]): Pt[] {
  return new Path([...p.slice(-2), ...p, ...p.slice(0, 3)], 10).points.slice(20, 20 + p.length * 10 + 1);
}

export function sketchSvg(level: LevelDef): string {
  const { w, h } = level.map;
  const road = new Path(level.route);
  const island = closedCurve(level.island);
  // The rocky cliff: the island shape dropped a little, with a jagged point hanging below the middle.
  const cliff = island.map(([x, y]): Pt => [x, y + 80]);
  const taper: Pt[] = [[260, 820], [420, 960], [600, 1010], [760, 1024], [960, 1010], [1150, 950], [1320, 830]];
  const [dx, dy] = level.dock;
  const trees: Pt[] = [[300, 300], [430, 250], [700, 240], [900, 260], [1290, 410], [1360, 560], [1300, 760], [760, 870], [470, 820], [240, 620], [1010, 300], [640, 400]];
  const clear = (p: Pt) => road.nearest(p).dist > level.roadWidth / 2 + 60 && level.slots.every((s) => Math.hypot(s[0] - p[0], s[1] - p[1]) > level.slotRadius + 50);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="${w}" height="${h}" fill="#bfe6ff"/>
  ${[[180, 120, 160], [1300, 90, 190], [120, 900, 220], [1350, 950, 240], [760, 1000, 260]].map(([x, y, r]) => `<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r * 0.42}" fill="#ffffff"/>`).join('')}
  <polygon points="${pts(taper)}" fill="#76583e" stroke="#3b2a2a" stroke-width="6" stroke-linejoin="round"/>
  <polygon points="${pts(cliff)}" fill="#8a6a4c" stroke="#3b2a2a" stroke-width="6" stroke-linejoin="round"/>
  <path d="M 330 815 L 322 1024" stroke="#8fd8ff" stroke-width="28"/>
  <polygon points="${pts(island)}" fill="#7cc85a" stroke="#3b2a2a" stroke-width="6" stroke-linejoin="round"/>
  <polyline points="${pts(road.points)}" fill="none" stroke="#a8875a" stroke-width="${level.roadWidth + 12}" stroke-linecap="round" stroke-linejoin="round"/>
  <polyline points="${pts(road.points)}" fill="none" stroke="#e2c48a" stroke-width="${level.roadWidth}" stroke-linecap="round" stroke-linejoin="round"/>
  <rect x="${dx - 40}" y="${dy - 58}" width="${level.map.w - dx + 40}" height="116" fill="#9a6a3c" stroke="#3b2a2a" stroke-width="5"/>
  ${[0, 1, 2, 3, 4].map((i) => `<line x1="${dx - 20 + i * 28}" y1="${dy - 58}" x2="${dx - 20 + i * 28}" y2="${dy + 58}" stroke="#6d4a2e" stroke-width="4"/>`).join('')}
  ${trees.filter(clear).map(([x, y]) => `<circle cx="${x}" cy="${y}" r="34" fill="#3f8a3c" stroke="#3b2a2a" stroke-width="4"/>`).join('')}
  ${level.slots.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="${level.slotRadius}" fill="#c4c4c4" stroke="#555" stroke-width="5"/><circle cx="${x}" cy="${y}" r="${level.slotRadius * 0.62}" fill="none" stroke="#9a9a9a" stroke-width="4"/>`).join('')}
  <circle cx="${level.vault[0]}" cy="${level.vault[1]}" r="62" fill="#a9a9b8" stroke="#3b2a2a" stroke-width="5"/>
  <polygon points="${pts([[level.vault[0], level.vault[1] - 58], [level.vault[0] + 30, level.vault[1] - 6], [level.vault[0], level.vault[1] + 22], [level.vault[0] - 30, level.vault[1] - 6]])}" fill="#6ff0ff" stroke="#1d7f8a" stroke-width="4"/>
</svg>`;
}

/** Problems that would make the level unplayable: spots on the road, off the island, or overlapping. */
export function checkLevel(level: LevelDef): string[] {
  const road = new Path(level.route);
  const island = closedCurve(level.island);
  const inside = ([x, y]: Pt) => {
    let c = false;
    for (let i = 0, j = island.length - 1; i < island.length; j = i++) {
      const [xi, yi] = island[i];
      const [xj, yj] = island[j];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
    }
    return c;
  };
  const problems: string[] = [];
  level.slots.forEach((s, i) => {
    const gap = road.nearest(s).dist - level.roadWidth / 2 - level.slotRadius;
    if (gap < 8) problems.push(`slot ${i + 1} touches the road (gap ${gap.toFixed(0)} px)`);
    if (!inside(s)) problems.push(`slot ${i + 1} is off the island`);
    level.slots.forEach((t, j) => {
      if (j > i && Math.hypot(s[0] - t[0], s[1] - t[1]) < level.slotRadius * 2 + 20) problems.push(`slots ${i + 1} and ${j + 1} overlap`);
    });
  });
  if (!inside(level.heroStart)) problems.push('hero starts off the island');
  return problems;
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
