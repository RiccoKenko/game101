/**
 * node scripts/art/ro-sheet.mjs [archer] [monsters1] [--preview <dir>]
 *
 * Cuts the frame-by-frame sprite sheets OpenAI painted (art/incoming/ro/*.png: a grid of poses on flat magenta)
 * into the game's textures:
 * - a hero: public/art/hero/<id>.webp + <id>.json, every animation in five facings (s, se, e, ne, n; the game
 *   mirrors se, e and ne for the west side), plus the menu picture <id>_menu.webp;
 * - monsters: public/art/<texture>_0.webp and _1.webp, their two movement frames, listed in src/art/manifest.json.
 *
 * Each pose is keyed off the magenta, then placed so its feet stand on the same point in every frame (the bottom of
 * the drawing, centred on the feet), so the animation doesn't wobble.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
const IN = join(ROOT, 'art/incoming/ro');
const ART = join(ROOT, 'public/art');
const MANIFEST = join(ROOT, 'src/art/manifest.json');

/** The facings, one per sheet row, top to bottom. */
const DIRS = ['s', 'se', 'e', 'ne', 'n'];

/**
 * Heroes: which sheet and column each pose comes from, and the animations made of them (a frame list may repeat a
 * pose to hold it). Every animation exists once per facing.
 */
const HEROES = {
  archer: {
    sheets: { walk: 'archer_walk.png', attack: 'archer_attack.png', misc: 'archer_misc.png' },
    animations: {
      idle: { fps: 2, loop: true, frames: [['misc', 0]] },
      run: { fps: 9, loop: true, frames: [['walk', 0], ['walk', 1], ['walk', 2], ['walk', 3]] },
      shoot: { fps: 14, loop: false, frames: [['attack', 0], ['attack', 1], ['attack', 2], ['attack', 3]] },
      hurt: { fps: 8, loop: false, frames: [['misc', 1], ['misc', 1], ['misc', 1]] },
      ko: { fps: 6, loop: false, frames: [['misc', 1], ['misc', 2], ['misc', 2]] },
      cheer: { fps: 6, loop: false, frames: [['misc', 3], ['misc', 0], ['misc', 3], ['misc', 3]] },
    },
    /** The front idle pose, the size reference for the frames. */
    stand: ['misc', 0, 0],
    /** The big picture for the menu (one drawing on magenta). */
    menu: 'archer_menu.png',
  },
};

/** Monster sheets: one column per monster, frame A on top and frame B under it; target size is the larger side. */
const MONSTERS = {
  monsters1: {
    file: 'monsters1.png',
    cols: 5,
    rows: 2,
    keys: [
      ['slime', 104],
      ['bat', 118],
      ['mushroom', 118],
      ['puff', 110],
      ['bee', 96],
    ],
  },
};

/** The picture with the flat magenta made transparent (soft at the edges, with the pink fringe pulled out). */
async function keyed(file) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < info.width * info.height; i++) {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    // How magenta the pixel is: red and blue both high above green.
    const m = Math.min(r, b) - g;
    if (m > 140) data[i * 4 + 3] = 0;
    else if (m > 50) {
      data[i * 4 + 3] = Math.round(255 * (1 - (m - 50) / 90));
      data[i * 4] = Math.min(r, g + 50);
      data[i * 4 + 2] = Math.min(b, g + 50);
    }
  }
  return { data, width: info.width, height: info.height };
}

/**
 * The sheet's drawings sorted into its grid: the biggest blob of paint in each cell (by where its middle lies) is
 * that cell's pose, and every smaller blob (a dropped bow, a stray feather) joins the pose it lies closest to, so a
 * pose that pokes over its cell's edge stays whole and nothing of the neighbours leaks in. Specks are dropped.
 * Returns poses[row][col], each an RGBA image of just its blobs.
 */
function poses(img, cols, rows) {
  const { width: W, height: H, data } = img;
  const label = new Int32Array(W * H).fill(-1);
  const blobs = [];
  const stack = [];
  for (let start = 0; start < W * H; start++) {
    if (label[start] >= 0 || data[start * 4 + 3] <= 40) continue;
    const id = blobs.length;
    const b = { pixels: [], sx: 0, sy: 0, x0: W, y0: H, x1: 0, y1: 0 };
    label[start] = id;
    stack.push(start);
    while (stack.length) {
      const i = stack.pop();
      b.pixels.push(i);
      const x = i % W;
      const y = (i - x) / W;
      b.sx += x;
      b.sy += y;
      b.x0 = Math.min(b.x0, x);
      b.y0 = Math.min(b.y0, y);
      b.x1 = Math.max(b.x1, x);
      b.y1 = Math.max(b.y1, y);
      for (const j of [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, y > 0 ? i - W : -1, y < H - 1 ? i + W : -1]) {
        if (j < 0 || label[j] >= 0 || data[j * 4 + 3] <= 40) continue;
        label[j] = id;
        stack.push(j);
      }
    }
    blobs.push(b);
  }
  const grid = Array.from({ length: rows }, () => Array.from({ length: cols }, () => []));
  const cellOf = (b) => [
    Math.min(rows - 1, Math.floor((b.sy / b.pixels.length / H) * rows)),
    Math.min(cols - 1, Math.floor((b.sx / b.pixels.length / W) * cols)),
  ];
  const kept = blobs.filter((b) => b.pixels.length >= 60).sort((a, b) => b.pixels.length - a.pixels.length);
  const mains = [];
  for (const b of kept) {
    const [r, c] = cellOf(b);
    if (grid[r][c].length) continue;
    grid[r][c].push(b);
    mains.push({ b, r, c });
  }
  // How far a point is from a blob's box.
  const gap = (m, x, y) => Math.hypot(Math.max(m.x0 - x, 0, x - m.x1), Math.max(m.y0 - y, 0, y - m.y1));
  for (const b of kept) {
    if (mains.some((m) => m.b === b)) continue;
    const x = b.sx / b.pixels.length;
    const y = b.sy / b.pixels.length;
    const near = mains.reduce((best, m) => (gap(m.b, x, y) < gap(best.b, x, y) ? m : best));
    grid[near.r][near.c].push(b);
  }
  return grid.map((row) =>
    row.map((bs) => {
      let [x0, y0, x1, y1] = [W, H, 0, 0];
      for (const b of bs)
        for (const i of b.pixels) {
          const x = i % W;
          const y = (i - x) / W;
          x0 = Math.min(x0, x);
          y0 = Math.min(y0, y);
          x1 = Math.max(x1, x);
          y1 = Math.max(y1, y);
        }
      // Keep a margin so the soft edge pixels (alpha up to 40, not part of any blob) come along.
      x0 = Math.max(0, x0 - 3);
      y0 = Math.max(0, y0 - 3);
      x1 = Math.min(W - 1, x1 + 3);
      y1 = Math.min(H - 1, y1 + 3);
      const w = x1 - x0 + 1;
      const h = y1 - y0 + 1;
      const out = Buffer.alloc(w * h * 4);
      const mine = new Set(bs.map((b) => blobs.indexOf(b)));
      for (let y = y0; y <= y1; y++)
        for (let x = x0; x <= x1; x++) {
          const i = y * W + x;
          // A pixel belongs here if it is one of these blobs, or a faint edge pixel next to one of them.
          let ok = mine.has(label[i]);
          if (!ok && label[i] < 0 && data[i * 4 + 3] > 0)
            for (const j of [i - 1, i + 1, i - W, i + W]) if (j >= 0 && j < W * H && mine.has(label[j])) ok = true;
          if (ok) data.copy(out, ((y - y0) * w + (x - x0)) * 4, i * 4, i * 4 + 4);
        }
      return { data: out, width: w, height: h };
    }),
  );
}

/**
 * Where a pose stands: the bottom of the drawing, and across, the middle of what touches its lowest tenth (or with
 * `box`, the middle of the whole drawing: for creatures whose feet sit off-centre).
 */
function feetOf(p, box = false) {
  let top = p.height;
  let bottom = -1;
  let left = p.width;
  let right = -1;
  for (let y = 0; y < p.height; y++)
    for (let x = 0; x < p.width; x++)
      if (p.data[(y * p.width + x) * 4 + 3] > 128) {
        top = Math.min(top, y);
        bottom = Math.max(bottom, y);
        left = Math.min(left, x);
        right = Math.max(right, x);
      }
  if (box) return { x: (left + right) / 2, y: bottom, top };
  const band = Math.max(4, Math.round((bottom - top) * 0.1));
  let sx = 0;
  let n = 0;
  for (let y = bottom - band; y <= bottom; y++)
    for (let x = 0; x < p.width; x++)
      if (p.data[(y * p.width + x) * 4 + 3] > 128) {
        sx += x;
        n++;
      }
  return { x: n ? sx / n : p.width / 2, y: bottom, top };
}

const png = (p) => sharp(p.data, { raw: { width: p.width, height: p.height, channels: 4 } }).png().toBuffer();

/** A pose scaled by `k` and placed in a `fw` x `fh` frame with its feet at `feet`. */
async function place(p, k, fw, fh, feet, box = false) {
  const f = feetOf(p, box);
  const w = Math.round(p.width * k);
  const h = Math.round(p.height * k);
  const scaled = await sharp(await png(p)).resize(w, h, { kernel: 'lanczos3' }).png().toBuffer();
  const left = Math.round(feet[0] - f.x * k);
  const top = Math.round(feet[1] - f.y * k);
  // Crop whatever would fall outside the frame (composite needs the overlay inside the canvas).
  const cx = Math.max(0, -left);
  const cy = Math.max(0, -top);
  const cw = Math.min(w - cx, fw - Math.max(0, left));
  const ch = Math.min(h - cy, fh - Math.max(0, top));
  const piece = await sharp(scaled).extract({ left: cx, top: cy, width: cw, height: ch }).png().toBuffer();
  return sharp({ create: { width: fw, height: fh, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: piece, left: Math.max(0, left), top: Math.max(0, top) }])
    .png()
    .toBuffer();
}

async function buildHero(id, preview) {
  const h = HEROES[id];
  const sheets = {};
  for (const [name, file] of Object.entries(h.sheets)) sheets[name] = poses(await keyed(join(IN, file)), 4, 5);
  const pose = (sheet, col, row) => sheets[sheet][row][col];
  // Scale: the standing front pose ends up `BODY` px tall (the game shows heroes 150 px tall).
  const BODY = 176;
  const stand = feetOf(pose(...h.stand));
  const k = BODY / (stand.y - stand.top);
  const [FW, FH] = [208, 224];
  const FEET = [104, 212];
  const frames = [];
  const meta = { frameWidth: FW, frameHeight: FH, feet: FEET, bodyHeight: BODY, directions: DIRS, animations: {} };
  for (const [name, a] of Object.entries(h.animations))
    for (const [row, dir] of DIRS.entries()) {
      meta.animations[`${name}_${dir}`] = { start: frames.length, count: a.frames.length, fps: a.fps, loop: a.loop };
      for (const [sheet, col] of a.frames) frames.push(await place(pose(sheet, col, row), k, FW, FH, FEET));
    }
  const cols = 8;
  const rows = Math.ceil(frames.length / cols);
  const sheet = await sharp({ create: { width: cols * FW, height: rows * FH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite(frames.map((f, i) => ({ input: f, left: (i % cols) * FW, top: Math.floor(i / cols) * FH })))
    .png()
    .toBuffer();
  // The menu picture, trimmed and brought to the size the menu shows it at (620 px tall).
  const big = poses(await keyed(join(IN, h.menu)), 1, 1)[0][0];
  const menu = await sharp(await png(big)).trim({ threshold: 0 }).resize({ height: 640, kernel: 'lanczos3' }).png().toBuffer();
  if (preview) {
    await sharp(sheet).toFile(join(preview, `${id}_sheet.png`));
    console.log(`${id}: ${frames.length} frames (preview only)`);
    return;
  }
  mkdirSync(join(ART, 'hero'), { recursive: true });
  await sharp(sheet).webp({ quality: 90, alphaQuality: 100 }).toFile(join(ART, 'hero', `${id}.webp`));
  writeFileSync(join(ART, 'hero', `${id}.json`), `${JSON.stringify(meta, null, 2)}\n`);
  await sharp(menu).webp({ quality: 92, alphaQuality: 100 }).toFile(join(ART, 'hero', `${id}_menu.webp`));
  console.log(`${id}: ${frames.length} frames -> public/art/hero/${id}.webp`);
}

async function buildMonsters(set, preview) {
  const m = MONSTERS[set];
  const grid = poses(await keyed(join(IN, m.file)), m.cols, m.rows);
  const keys = [];
  for (const [c, [tex, size]] of m.keys.entries()) {
    // Both frames share one scale and one feet point, so the step doesn't jump.
    const frames = [0, 1].map((r) => grid[r][c]);
    const boxes = await Promise.all(frames.map(async (p) => sharp(await png(p)).trim({ threshold: 0 }).metadata()));
    const big = Math.max(...boxes.flatMap((b) => [b.width, b.height]));
    const k = size / big;
    const fw = Math.ceil(Math.max(...boxes.map((b) => b.width)) * k) + 8;
    const fh = Math.ceil(Math.max(...boxes.map((b) => b.height)) * k) + 8;
    for (const [r, p] of frames.entries()) {
      const out = await place(p, k, fw, fh, [fw / 2, fh - 4], true);
      const key = `${tex}_${r}`;
      keys.push(key);
      if (preview) await sharp(out).toFile(join(preview, `${key}.png`));
      else await sharp(out).webp({ quality: 92, alphaQuality: 100 }).toFile(join(ART, `${key}.webp`));
    }
  }
  if (!preview) {
    const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'));
    manifest.keys = [...new Set([...manifest.keys, ...keys])].sort();
    writeFileSync(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);
  }
  console.log(`${set}: ${keys.length} pictures${preview ? ' (preview only)' : ''}`);
}

async function main() {
  const args = process.argv.slice(2);
  const pi = args.indexOf('--preview');
  const preview = pi >= 0 ? args.splice(pi, 2)[1] : null;
  if (preview) mkdirSync(preview, { recursive: true });
  const names = args.length ? args : [...Object.keys(HEROES), ...Object.keys(MONSTERS)];
  for (const n of names) {
    if (HEROES[n]) await buildHero(n, preview);
    else if (MONSTERS[n]) {
      if (!existsSync(join(IN, MONSTERS[n].file))) throw new Error(`missing ${MONSTERS[n].file}`);
      await buildMonsters(n, preview);
    } else throw new Error(`unknown sheet set ${n}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
