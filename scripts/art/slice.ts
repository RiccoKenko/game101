/**
 * npm run art -- <character id> [sheet ...] [--from <dir>] [--to <dir>]
 *
 * Reads art/incoming/<id>/<id>_<sheet>.png|webp|jpg (as named in docs/art/CHARACTER_BRIEF.md), removes
 * the flat background, cuts each sheet listed in sheets.json into one PNG per part, and writes
 * art/sliced/<id>/ with a manifest.json and a <sheet>.check.png that boxes and numbers every part.
 * Sheets without a part list (master, rigpose) are just cut out and trimmed.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import {
  cropPiece,
  cutPolygons,
  despeck,
  eraseEllipses,
  findPieces,
  groupByBoxes,
  groupPieces,
  orderPieces,
  removeBackground,
  trim,
  unmixSpill,
  type Box,
  type Ellipse,
  type Piece,
  type RgbaImage,
} from './slicer';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
const SHEETS = ['concept', 'master', 'rigpose', 'head_faces', 'parts_body', 'hands_props', 'poses', 'portraits'];

interface SheetConfig {
  names: string[];
  regions?: [number, number][];
  /** Part boxes [x, y, w, h] in sheet pixels by part name, for sheets the automatic grouping gets wrong. */
  boxes?: Record<string, [number, number, number, number]>;
  /**
   * Ellipses [cx, cy, rx, ry, degrees] in sheet pixels to clear from a part, e.g. drawn "cut ends" at joints; with a
   * sixth value "heal", the lines inside are painted over with the surrounding skin instead (drawn ball joints).
   */
  erase?: Record<string, Ellipse[]>;
  /** Polygons (lists of [x, y] in sheet pixels) to clear from a part: strays the AI drew into it. */
  cut?: Record<string, [number, number][][]>;
  /** The colour of glows and snow painted over the background on this sheet, to turn pink spill back into it (`unmixSpill`). */
  spill?: [number, number, number];
  /** Clean spill trapped inside the art too, not only where it touches the surroundings. */
  spillEverywhere?: boolean;
  /** Clear left-over blobs smaller than this many pixels from every part. */
  despeck?: number;
}

interface SheetEntry {
  source: string;
  size: [number, number];
  background: string;
  parts: (Box & { name: string; file: string })[];
  warnings: string[];
}

async function load(file: string): Promise<RgbaImage> {
  const { data, info } = await sharp(file).toColourspace('srgb').ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data: new Uint8Array(data.buffer, data.byteOffset, data.length), width: info.width, height: info.height };
}

const asSharp = (img: RgbaImage) =>
  sharp(Buffer.from(img.data.buffer, img.data.byteOffset, img.data.length), { raw: { width: img.width, height: img.height, channels: 4 } });

const hex = (c: number[]) => '#' + c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');

const escapeXml = (s: string) => s.replace(/[<>&"]/g, (ch) => `&#${ch.charCodeAt(0)};`);

/** The cut-out sheet on a checkerboard, with every part boxed and numbered, for a quick visual check. */
async function writeCheck(img: RgbaImage, parts: { box: Box; label: string }[], file: string) {
  const { width: w, height: h } = img;
  const font = Math.max(14, Math.round(Math.min(w, h) / 48));
  const checker = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><defs><pattern id="c" width="32" height="32" patternUnits="userSpaceOnUse">` +
      `<rect width="32" height="32" fill="#e4e4e4"/><rect width="16" height="16" fill="#fff"/><rect x="16" y="16" width="16" height="16" fill="#fff"/>` +
      `</pattern></defs><rect width="100%" height="100%" fill="url(#c)"/></svg>`,
  );
  const overlay = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">` +
      parts
        .map(({ box, label }) => {
          // Small parts (mouths) only get their number so labels never pile up.
          const text = box.w >= label.length * font * 0.62 ? label : label.split(' ')[0];
          return (
            `<rect x="${box.x}" y="${box.y}" width="${box.w}" height="${box.h}" fill="none" stroke="#0a7cff" stroke-width="2"/>` +
            `<text x="${box.x + 2}" y="${Math.max(font, box.y - 4)}" font-family="DejaVu Sans, sans-serif" font-size="${font}" font-weight="bold" ` +
            `fill="#0a7cff" stroke="#fff" stroke-width="3" paint-order="stroke">${escapeXml(text)}</text>`
          );
        })
        .join('') +
      `</svg>`,
  );
  const art = await asSharp(img).png().toBuffer();
  await sharp(checker).composite([{ input: art }, { input: overlay }]).png().toFile(file);
}

async function main() {
  const args = process.argv.slice(2);
  const flag = (name: string) => {
    const k = args.indexOf(name);
    return k >= 0 ? args.splice(k, 2)[1] : undefined;
  };
  const from = flag('--from');
  const to = flag('--to');
  const [id, ...only] = args;
  if (!id) throw new Error('Usage: npm run art -- <character id> [sheet ...] [--from <dir>] [--to <dir>]');

  const config = JSON.parse(readFileSync(join(ROOT, 'scripts/art/sheets.json'), 'utf8')) as Record<string, Record<string, SheetConfig>>;
  const inDir = from ?? join(ROOT, 'art/incoming', id);
  const outDir = to ?? join(ROOT, 'art/sliced', id);
  if (!existsSync(inDir)) throw new Error(`No folder ${relative(ROOT, inDir)}: put the images from ChatGPT there first.`);
  mkdirSync(outDir, { recursive: true });
  const manifestFile = join(outDir, 'manifest.json');
  const manifest: Record<string, SheetEntry> = existsSync(manifestFile) ? JSON.parse(readFileSync(manifestFile, 'utf8')) : {};
  const files = readdirSync(inDir);

  // The character sheets every brief asks for, plus any other sheet sheets.json describes (e.g. the towers).
  for (const sheet of [...new Set([...SHEETS, ...Object.keys(config[id] ?? {})])]) {
    if (only.length && !only.includes(sheet)) continue;
    const file = files.find((f) => new RegExp(`^${id}_${sheet}\\.(png|webp|jpe?g)$`, 'i').test(f));
    if (!file) continue;
    const source = await load(join(inDir, file));
    const { image, background } = removeBackground(source);
    const entry: SheetEntry = {
      source: relative(ROOT, join(inDir, file)),
      size: [source.width, source.height],
      background: background ? hex(background) : 'transparent',
      parts: [],
      warnings: [],
    };
    const cfg = config[id]?.[sheet];
    if (cfg) {
      const { pieces, labels } = findPieces(image);
      let ordered: (Piece | null)[];
      let dropped: number;
      if (cfg.boxes) {
        const boxes = cfg.names.map((name) => {
          const b = cfg.boxes![name];
          if (!b) throw new Error(`sheets.json: ${id}.${sheet} has no box for "${name}".`);
          return { x: b[0], y: b[1], w: b[2], h: b[3] };
        });
        ({ groups: ordered, dropped } = groupByBoxes(pieces, boxes));
      } else {
        const grouped = groupPieces(pieces, cfg.names.length);
        ordered = orderPieces(grouped.groups, image.width, cfg.regions);
        dropped = grouped.dropped;
      }
      const found = ordered.filter((p) => p).length;
      if (found < cfg.names.length)
        entry.warnings.push(`Found ${found} of ${cfg.names.length} parts: some parts touch each other or are missing.`);
      if (dropped) entry.warnings.push(`Ignored ${dropped} stray specks.`);
      const dir = join(outDir, sheet);
      rmSync(dir, { recursive: true, force: true });
      mkdirSync(dir, { recursive: true });
      const checks: { box: Box; label: string }[] = [];
      for (const [k, name] of cfg.names.entries()) {
        const part = ordered[k];
        if (!part) continue;
        const out = `${sheet}/${String(k + 1).padStart(2, '0')}-${name}.png`;
        let cut = cropPiece(image, labels, part);
        if (cfg.erase?.[name]) cut = eraseEllipses(cut, part.x - 8, part.y - 8, cfg.erase[name]);
        if (cfg.cut?.[name]) cut = cutPolygons(cut, part.x - 8, part.y - 8, cfg.cut[name]);
        if (cfg.spill && background) cut = unmixSpill(cut, background, cfg.spill, 48, cfg.spillEverywhere);
        if (cfg.despeck) cut = despeck(cut, cfg.despeck);
        await asSharp(cut).png().toFile(join(outDir, out));
        entry.parts.push({ name, file: out, x: part.x, y: part.y, w: part.w, h: part.h });
        checks.push({ box: part, label: `${k + 1} ${name}` });
      }
      await writeCheck(image, checks, join(outDir, `${sheet}.check.png`));
    } else {
      const { image: cut, box } = trim(image);
      await asSharp(cut).png().toFile(join(outDir, `${sheet}.png`));
      entry.parts.push({ name: sheet, file: `${sheet}.png`, ...box });
      await writeCheck(image, [{ box, label: sheet }], join(outDir, `${sheet}.check.png`));
    }
    manifest[sheet] = entry;
    console.log(`${sheet}: ${entry.parts.length} part(s), background ${entry.background}${entry.warnings.map((w) => `\n  ! ${w}`).join('')}`);
  }
  writeFileSync(manifestFile, JSON.stringify(manifest, null, 2) + '\n');
  const shown = relative(ROOT, outDir);
  console.log(`Wrote ${shown.startsWith('..') ? outDir : shown}/`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
