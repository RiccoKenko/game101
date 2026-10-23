/**
 * npm run art:publish -- <character id>
 *
 * Copies a character's sliced parts (from `npm run art`) into public/sprites/<id>/ for the game, with
 * sprites.json (each sprite's size and where it sat on its source sheet) and the rig from art/rigs/<id>.json.
 * Reference sheets (concept, rig pose, action poses) stay out of the game.
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
const REFERENCE = new Set(['concept', 'rigpose', 'poses']);
const PAD = 8;

interface Manifest {
  [sheet: string]: { parts: { name: string; file: string; x: number; y: number; w: number; h: number }[] };
}

const id = process.argv[2];
if (!id) throw new Error('Usage: npm run art:publish -- <character id>');
const sliced = join(ROOT, 'art/sliced', id);
const manifestFile = join(sliced, 'manifest.json');
if (!existsSync(manifestFile)) throw new Error(`Run "npm run art -- ${id}" first.`);
const manifest = JSON.parse(readFileSync(manifestFile, 'utf8')) as Manifest;
const out = join(ROOT, 'public/sprites', id);
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

const sprites: Record<string, { w: number; h: number; ox: number; oy: number }> = {};
for (const [sheet, entry] of Object.entries(manifest)) {
  if (REFERENCE.has(sheet)) continue;
  for (const p of entry.parts) {
    if (sprites[p.name]) throw new Error(`Two sprites are called "${p.name}"`);
    copyFileSync(join(sliced, p.file), join(out, `${p.name}.png`));
    sprites[p.name] = { w: p.w + PAD * 2, h: p.h + PAD * 2, ox: p.x - PAD, oy: p.y - PAD };
  }
}
writeFileSync(join(out, 'sprites.json'), JSON.stringify(sprites, null, 1) + '\n');

const rigFile = join(ROOT, 'art/rigs', `${id}.json`);
if (existsSync(rigFile)) {
  const rig = JSON.parse(readFileSync(rigFile, 'utf8')) as { parts: { img: string }[]; arrow?: { img: string } };
  const missing = [...rig.parts.map((p) => p.img), ...(rig.arrow ? [rig.arrow.img] : [])].filter((n) => !sprites[n]);
  if (missing.length) throw new Error(`art/rigs/${id}.json uses sprites that do not exist: ${missing.join(', ')}`);
  copyFileSync(rigFile, join(out, 'rig.json'));
}
console.log(`Published ${Object.keys(sprites).length} sprites to public/sprites/${id}/${existsSync(rigFile) ? ' with its rig' : ''}`);
