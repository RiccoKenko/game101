/**
 * node scripts/art/pixel/build.mjs [set ...] [--preview <file.png>] [--dry]
 *
 * Paints the code-drawn art sets in scripts/art/pixel/sets/*.mjs into the game: each set exports
 * `ART = { key: () => Sprite | Buffer }`, and every key becomes public/art/<key>.webp and is listed in
 * src/art/manifest.json (the boot scene loads those). A Sprite is trimmed to its drawn pixels plus a small margin;
 * a Buffer (a seamless ground tile, say) is written as it is.
 *
 * With no set names, every set is built. --preview also writes a contact sheet of what was built, each picture at
 * its game size with its key under it, and --dry only writes the preview.
 */
import { existsSync, readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import sharp from 'sharp';
import { Sprite } from './engine.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '../../..');
const OUT = join(ROOT, 'public/art');
const MANIFEST = join(ROOT, 'src/art/manifest.json');
const SETS = join(HERE, 'sets');

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  if (i < 0) return null;
  const [, value] = args.splice(i, 2);
  return value ?? '';
};
const preview = flag('--preview');
const dry = args.includes('--dry');
const names = args.filter((a) => !a.startsWith('--'));
const sets = names.length ? names : readdirSync(SETS).filter((f) => f.endsWith('.mjs')).map((f) => f.slice(0, -4)).sort();

/** A sprite's PNG cut down to its drawn pixels, with `pad` transparent pixels kept around them. */
async function trimmed(sprite, pad = 2) {
  const png = await sprite.png();
  const { data, info } = await sharp(png).raw().toBuffer({ resolveWithObject: true });
  let [x0, y0, x1, y1] = [info.width, info.height, -1, -1];
  for (let y = 0; y < info.height; y++)
    for (let x = 0; x < info.width; x++)
      if (data[(y * info.width + x) * 4 + 3] > 8) {
        x0 = Math.min(x0, x);
        y0 = Math.min(y0, y);
        x1 = Math.max(x1, x);
        y1 = Math.max(y1, y);
      }
  if (x1 < 0) throw new Error('nothing drawn');
  x0 = Math.max(0, x0 - pad);
  y0 = Math.max(0, y0 - pad);
  x1 = Math.min(info.width - 1, x1 + pad);
  y1 = Math.min(info.height - 1, y1 + pad);
  return sharp(png).extract({ left: x0, top: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 }).png().toBuffer();
}

async function main() {
  const built = [];
  for (const set of sets) {
    const file = join(SETS, `${set}.mjs`);
    if (!existsSync(file)) throw new Error(`no set ${set} (${file})`);
    const { ART } = await import(pathToFileURL(file).href);
    for (const [key, make] of Object.entries(ART)) {
      const out = await make();
      const png = out instanceof Sprite ? await trimmed(out) : out;
      built.push({ key, png });
    }
    console.log(`${set}: ${Object.keys(ART).length} pictures`);
  }
  if (!dry) {
    mkdirSync(OUT, { recursive: true });
    for (const { key, png } of built) await sharp(png).webp({ quality: 92, alphaQuality: 100 }).toFile(join(OUT, `${key}.webp`));
    const manifest = existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, 'utf8')) : { keys: [] };
    const keys = [...new Set([...manifest.keys, ...built.map((b) => b.key)])].sort();
    writeFileSync(MANIFEST, `${JSON.stringify({ ...manifest, keys }, null, 2)}\n`);
    console.log(`wrote ${built.length} pictures to public/art and the manifest`);
  }
  if (preview !== null) await contactSheet(built, preview);
}

/** Every picture at its game size on a light card, its key underneath, in rows that wrap at 1400 px. */
async function contactSheet(built, file) {
  const W = 1400;
  const gap = 24;
  const label = 22;
  let x = gap;
  let y = gap;
  let row = 0;
  const parts = [];
  for (const { key, png } of built) {
    const m = await sharp(png).metadata();
    const w = Math.min(m.width, 520);
    const h = Math.round((m.height * w) / m.width);
    const cell = Math.max(w, key.length * 9 + 8);
    if (x + cell > W - gap) {
      x = gap;
      y += row + label + gap;
      row = 0;
    }
    parts.push({ input: await sharp(png).resize(w, h).png().toBuffer(), left: Math.round(x + (cell - w) / 2), top: y });
    parts.push({
      input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${cell}" height="${label}"><text x="${cell / 2}" y="16" font-family="sans-serif" font-size="14" text-anchor="middle" fill="#5a5040">${key}</text></svg>`),
      left: Math.round(x),
      top: y + h + 2,
    });
    x += cell + gap;
    row = Math.max(row, h);
  }
  const H = y + row + label + gap;
  await sharp({ create: { width: W, height: H, channels: 4, background: '#e9e4d8' } })
    .composite(parts)
    .png()
    .toFile(file);
  console.log(`wrote ${file}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
