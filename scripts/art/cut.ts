/**
 * npm run art:cut [-- [--set rr] <sheet> ...]
 *
 * Cuts the painted sheets in art/incoming/mr/ into the game's textures: public/art/<key>.webp, sized in game
 * pixels, and lists every key in src/art/manifest.json (the boot scene loads those in place of the SVG art drawn
 * in code). Which parts each sheet holds, in reading order, and how big each one is in the game is set in
 * scripts/art/mr-sheets.json. A ground sheet (`tile`) becomes a seamless repeating tile instead.
 * For checking by eye: art/sliced/mr/<sheet>.check.png shows the results on grey.
 *
 * `--set rr` cuts the Ricco Rush pictures instead: art/incoming/rr/ with scripts/art/rr-sheets.json (checks in
 * art/sliced/rr/). Those were painted in Gemini, which stamps a small sparkle in the bottom-right corner: a sheet
 * with `watermark` clears that corner first.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { seamless } from './seamless';
import {
  cropPiece,
  despeck,
  findPieces,
  groupByBoxes,
  groupPieces,
  orderPieces,
  removeBackground,
  unmixSpill,
  type Box,
  type Piece,
  type Rgb,
  type RgbaImage,
} from './slicer';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
const args = process.argv.slice(2);
const setAt = args.indexOf('--set');
const SET = setAt >= 0 ? args.splice(setAt, 2)[1] : 'mr';
const IN = join(ROOT, `art/incoming/${SET}`);
const OUT = join(ROOT, 'public/art');
const CHECK = join(ROOT, `art/sliced/${SET}`);
const MANIFEST = join(ROOT, 'src/art/manifest.json');

interface SheetConfig {
  /** Texture keys in reading order (row by row, left to right); null skips a part. */
  keys?: (string | null)[];
  /** Each part is scaled to fit inside [w, h] game pixels. */
  sizes?: Record<string, [number, number]>;
  /** Group blobs by an even grid of [columns, rows] cells instead of by distance (icon and item sheets). */
  grid?: [number, number];
  /** Background tolerance for removeBackground. */
  tolerance?: number;
  /** Drop leftover specks smaller than this many pixels. */
  despeck?: number;
  /** Background colour left in the art's gaps (a ragged robe), recoloured to this colour (see unmixSpill). */
  spill?: { colour: Rgb; everywhere?: boolean };
  /** Rectangles [x, y, w, h] in sheet pixels to clear first (things drawn that the game does by itself). */
  erase?: [number, number, number, number][];
  /** Ground texture: the key and the size in px of the seamless tile it becomes. */
  tile?: { key: string; size: number };
  /** Parts drawn facing the wrong way (a projectile must point right): mirrored left to right. */
  flip?: string[];
  /** Clear the bottom-right corner (this share of the picture's width, square) where Gemini puts its sparkle. */
  watermark?: number;
}

async function load(file: string): Promise<RgbaImage> {
  const { data, info } = await sharp(file).toColourspace('srgb').ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data: new Uint8Array(data.buffer, data.byteOffset, data.length), width: info.width, height: info.height };
}

const toSharp = (img: RgbaImage) =>
  sharp(Buffer.from(img.data.buffer, img.data.byteOffset, img.data.length), { raw: { width: img.width, height: img.height, channels: 4 } });

function gridBoxes(width: number, height: number, [cols, rows]: [number, number]): Box[] {
  const boxes: Box[] = [];
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) boxes.push({ x: (c * width) / cols, y: (r * height) / rows, w: width / cols, h: height / rows });
  return boxes;
}

async function cutSheet(name: string, cfg: SheetConfig): Promise<string[]> {
  const file = join(IN, `${name}.png`);
  if (!existsSync(file)) {
    console.log(`${name}: no picture yet (${file})`);
    return [];
  }
  const sheet = await load(file);
  if (cfg.tile) {
    const tile = seamless(sheet, Math.round(sheet.width / 8));
    const one = await toSharp(tile).resize(cfg.tile.size, cfg.tile.size, { kernel: 'lanczos3' }).png().toBuffer();
    await sharp(one).webp({ quality: 86 }).toFile(join(OUT, `${cfg.tile.key}.webp`));
    // Check: the tile repeated 2 x 2, where a seam would show as a cross through the middle.
    const s = cfg.tile.size;
    await sharp({ create: { width: s * 2, height: s * 2, channels: 4, background: '#000' } })
      .composite([0, 1, 2, 3].map((i) => ({ input: one, left: (i % 2) * s, top: Math.floor(i / 2) * s })))
      .png()
      .toFile(join(CHECK, `${name}.check.png`));
    console.log(`${name}: tile ${cfg.tile.key} (${s} px)`);
    return [cfg.tile.key];
  }

  const removed = removeBackground(sheet, cfg.tolerance);
  let { image } = removed;
  if (cfg.spill && removed.background) image = unmixSpill(image, removed.background, cfg.spill.colour, 48, cfg.spill.everywhere);
  const erase = [...(cfg.erase ?? [])];
  if (cfg.watermark) {
    const s = Math.round(image.width * cfg.watermark);
    erase.push([image.width - s, image.height - s, s, s]);
  }
  for (const [x0, y0, w, h] of erase)
    for (let y = y0; y < y0 + h; y++) image.data.fill(0, (y * image.width + x0) * 4, (y * image.width + x0 + w) * 4);
  if (cfg.despeck) image = despeck(image, cfg.despeck);
  const keys = cfg.keys ?? [];
  const { pieces, labels } = findPieces(image);
  let parts: (Piece | null)[];
  let dropped: number;
  if (cfg.grid) {
    ({ groups: parts, dropped } = groupByBoxes(pieces, gridBoxes(image.width, image.height, cfg.grid)));
  } else {
    const grouped = groupPieces(pieces, keys.length);
    parts = orderPieces(grouped.groups, image.width);
    dropped = grouped.dropped;
  }
  const written: string[] = [];
  const thumbs: { input: Buffer; left: number; top: number }[] = [];
  let x = 16;
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const part = parts[i];
    if (!key) continue;
    if (!part) {
      console.log(`${name}: nothing found for ${key}`);
      continue;
    }
    const [w, h] = cfg.sizes?.[key] ?? [96, 96];
    let piece = toSharp(cropPiece(image, labels, part, 2)).resize(w, h, { fit: 'inside', kernel: 'lanczos3' });
    if (cfg.flip?.includes(key)) piece = piece.flop();
    const png = await piece.png().toBuffer();
    await sharp(png).webp({ quality: 92, alphaQuality: 100 }).toFile(join(OUT, `${key}.webp`));
    written.push(key);
    thumbs.push({ input: png, left: x, top: 16 });
    x += (await sharp(png).metadata()).width! + 24;
  }
  await sharp({ create: { width: Math.max(64, x), height: 420, channels: 4, background: '#8a8a94' } })
    .composite(thumbs)
    .png()
    .toFile(join(CHECK, `${name}.check.png`));
  console.log(`${name}: ${written.join(', ')}${dropped ? ` (${dropped} specks dropped)` : ''}`);
  return written;
}

async function main() {
  const config = JSON.parse(readFileSync(join(ROOT, `scripts/art/${SET}-sheets.json`), 'utf8')) as Record<string, SheetConfig>;
  const only = args;
  mkdirSync(OUT, { recursive: true });
  mkdirSync(CHECK, { recursive: true });
  const manifest = existsSync(MANIFEST) ? (JSON.parse(readFileSync(MANIFEST, 'utf8')) as { keys: string[] }) : { keys: [] };
  const keys = new Set(manifest.keys);
  for (const [name, cfg] of Object.entries(config)) {
    if (name.startsWith('_') || (only.length && !only.includes(name))) continue;
    for (const key of await cutSheet(name, cfg)) keys.add(key);
  }
  writeFileSync(MANIFEST, JSON.stringify({ keys: [...keys].sort() }, null, 2) + '\n');
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
