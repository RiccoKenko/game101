/**
 * node scripts/art/ro-sheet.mjs [archer] [monsters1] [--preview <dir>]
 *
 * Cuts the frame-by-frame sprite sheets OpenAI painted (art/incoming/ro/*.png: a grid of poses on flat magenta)
 * into the game's textures:
 * - a hero: public/art/hero/<id>.webp + <id>.json, every animation in five facings (s, se, e, ne, n; the game
 *   mirrors se, e and ne for the west side), plus the menu picture <id>_menu.webp;
 * - monsters: public/art/<texture>_0.webp and _1.webp, their two movement frames, listed in src/art/manifest.json;
 * - bosses: public/art/<boss>.webp, one drawing each, and their MVP cards (public/art/relic_<boss>.webp);
 * - monster cards (icon_rune_<id>) from the finished monster pictures, and icons cut from 4 x 4 icon sheets.
 *
 * Each pose is keyed off the magenta, then placed so its feet stand on the same point in every frame (the bottom of
 * the drawing, centred on the feet), so the animation doesn't wobble.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { cardLayers, CARD_WINDOW } from './pixel/card.mjs';
import { C } from './pixel/palette.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
const IN = join(ROOT, 'art/incoming/ro');
const ART = join(ROOT, 'public/art');
const MANIFEST = join(ROOT, 'src/art/manifest.json');

/** The facings, one per sheet row, top to bottom. */
const DIRS = ['s', 'se', 'e', 'ne', 'n'];

/**
 * Heroes: which sheet and column each pose comes from, and the animations made of them (a frame list may repeat a
 * pose to hold it). Every animation exists once per facing, its row in the sheet, unless `sides` names another
 * sheet's row for that facing.
 */
const HEROES = {
  archer: {
    // archer_walk.png (the first walk) was redrawn as archer_walk2.png: its legs barely moved.
    sheets: { walk: 'archer_walk2.png', walkshoot: 'archer_walkshoot.png', attack: 'archer_attack.png', misc: 'archer_misc.png' },
    // The front shots redrawn aiming down the picture (the attack and walk-shoot sheets aim sideways there):
    // rows standing and walking toward the viewer, then standing and walking down-right.
    // `like`: drawn bigger than the others, so it is scaled to match that sheet's typical height.
    extra: { front: { file: 'archer_frontshot.png', rows: 4, like: 'attack' } },
    animations: {
      idle: { fps: 2, loop: true, frames: [['misc', 0]] },
      run: { fps: 9, loop: true, frames: [['walk', 0], ['walk', 1], ['walk', 2], ['walk', 3]] },
      // Walking while the bow keeps firing: the legs match run frame for frame.
      runshoot: {
        fps: 9,
        loop: true,
        frames: [['walkshoot', 0], ['walkshoot', 1], ['walkshoot', 2], ['walkshoot', 3]],
        sides: { s: ['front', 1], se: ['front', 3] },
      },
      shoot: {
        fps: 14,
        loop: false,
        frames: [['attack', 0], ['attack', 1], ['attack', 2], ['attack', 3]],
        sides: { s: ['front', 0], se: ['front', 2] },
      },
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

/**
 * Monster sheets: one column per monster, frame A on top and frame B under it; target size is the larger side.
 * A key may add options: `rows` picks other rows for its two frames, `mirror` the frames to flip so all face the
 * same way (Flow sometimes turns one round).
 */
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
  // Painted in Google Flow from art/prompts/flow_monsters2.txt and flow_monsters3.txt.
  monsters2: {
    file: 'monsters2_flow.jpg',
    cols: 5,
    rows: 2,
    keys: [
      ['skeleton', 112],
      ['ghost', 112],
      ['zombie', 132],
      ['pumpkin', 102],
      ['wraith', 114, { mirror: [0] }],
    ],
  },
  // Flow drew three rows here; the first two are the frames, but the urn takes its widest-open lid.
  monsters3: {
    file: 'monsters3_flow.jpg',
    cols: 6,
    rows: 3,
    keys: [
      ['imp', 110],
      ['knight', 128],
      ['gargoyle', 136],
      ['mimic', 116, { rows: [0, 2] }],
      ['wisp', 100],
      ['goblin', 120],
    ],
  },
};

/**
 * Bosses: one drawing per cell (largest side in game px), each also put on its MVP card (relic_<card>), with the
 * card window's backdrop of its map.
 */
const BOSSES = {
  bosses: {
    file: 'bosses_flow.jpg',
    cols: 3,
    rows: 2,
    keys: [
      { key: 'boss_boar', size: 300, card: 'relic_boar', map: 0 },
      { key: 'boss_captain', size: 290, card: 'relic_captain', map: 1 },
      { key: 'boss_ogre', size: 330, card: 'relic_ogre', map: 2 },
      { key: 'boss_slime', size: 340, card: 'relic_slime', map: 0 },
      { key: 'boss_lich', size: 330, card: 'relic_lich', map: 1 },
      { key: 'boss_demon', size: 360, card: 'relic_demon', map: 2 },
    ],
  },
};
const CARD_BACKDROPS = [C.moss, C.slate, C.tan];

/** Monster cards (the runes' icons, icon_rune_<id>): each monster's first frame in the MVP card frame, by map. */
const CARDS = {
  cards: [
    ['leech', 'slime', 0],
    ['ricochet', 'bat', 0],
    ['giant', 'mushroom', 0],
    ['split', 'puff', 0],
    ['homing', 'bee', 0],
    ['echo', 'ghost', 1],
    ['freeze', 'zombie', 1],
    ['blast', 'pumpkin', 1],
    ['chain', 'wraith', 1],
    ['burn', 'imp', 2],
    ['reaper', 'gargoyle', 2],
    ['nova', 'wisp', 2],
  ],
};

/**
 * Icon sheets (a 4 x 4 grid of objects on magenta, painted in Google Flow from art/prompts/flow_icons_*.txt): each
 * becomes a 128 x 128 icon, the object fitted inside with a small margin.
 */
const ICONS = {
  icons_archer: {
    file: 'icons_archer_flow.jpg',
    keys: [
      'icon_bow', 'icon_stormbow', 'icon_daggers', 'icon_blades',
      'icon_flask', 'icon_plague', 'icon_boomerang', 'icon_twinmoon',
      'icon_traps', 'icon_glacier', 'icon_wisps', 'icon_soulharvest',
      'icon_twister', 'icon_cyclone', 'icon_dash', 'icon_arrowstorm',
    ],
  },
  icons_items: {
    file: 'icons_items_flow.jpg',
    keys: [
      'icon_powergem', 'icon_hourglass', 'icon_heart', 'icon_tome',
      'icon_quiver', 'icon_clover', 'icon_boots', 'icon_magnet',
      'icon_shield', 'icon_spring', 'icon_charm', 'icon_cap',
      'icon_mask', 'icon_thorns', 'icon_ring', 'icon_feather',
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

/** A pose flipped left to right. */
function mirrored(p) {
  const out = Buffer.alloc(p.data.length);
  for (let y = 0; y < p.height; y++)
    for (let x = 0; x < p.width; x++) p.data.copy(out, (y * p.width + (p.width - 1 - x)) * 4, (y * p.width + x) * 4, (y * p.width + x) * 4 + 4);
  return { data: out, width: p.width, height: p.height };
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
  for (const [name, x] of Object.entries(h.extra ?? {})) sheets[name] = poses(await keyed(join(IN, x.file)), 4, x.rows);
  const pose = (sheet, col, row) => sheets[sheet][row][col];
  // How tall each sheet draws her (median over its poses), to check the sheets agree on her size.
  const median = {};
  for (const [name, grid] of Object.entries(sheets)) {
    const hs = grid.flat().map((p) => {
      const f = feetOf(p);
      return f.y - f.top;
    });
    hs.sort((a, b) => a - b);
    median[name] = hs[Math.floor(hs.length / 2)];
    console.log(`  ${name}: median height ${median[name]} px`);
  }
  const scaleOf = (sheet) => (h.extra?.[sheet]?.like ? median[h.extra[sheet].like] / median[sheet] : 1);
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
      // `sides` swaps in another sheet's row for some sides (same columns).
      const side = a.sides?.[dir];
      for (const [sheet, col] of a.frames) {
        const [from, r] = side ? [side[0], side[1]] : [sheet, row];
        frames.push(await place(pose(from, col, r), k * scaleOf(from), FW, FH, FEET));
      }
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
  for (const [c, [tex, size, opts = {}]] of m.keys.entries()) {
    // Both frames share one scale and one feet point, so the step doesn't jump.
    const frames = (opts.rows ?? [0, 1]).map((r, i) => (opts.mirror?.includes(i) ? mirrored(grid[r][c]) : grid[r][c]));
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

async function buildBosses(set, preview) {
  const b = BOSSES[set];
  const grid = poses(await keyed(join(IN, b.file)), b.cols, b.rows);
  const keys = [];
  for (const [i, { key, size, card, map }] of b.keys.entries()) {
    const pic = await sharp(await png(grid[Math.floor(i / b.cols)][i % b.cols])).trim({ threshold: 0 }).png().toBuffer();
    const m = await sharp(pic).metadata();
    const k = size / Math.max(m.width, m.height);
    const boss = await sharp(pic).resize(Math.round(m.width * k), Math.round(m.height * k), { kernel: 'lanczos3' }).png().toBuffer();
    // The card: the boss fills the window's width (a little more), its head at the top, cut to the window.
    const { back, front } = cardLayers(CARD_BACKDROPS[map]);
    const R = back.size;
    const [wx, wy, ww, wh] = [CARD_WINDOW.x * R, CARD_WINDOW.y * R, CARD_WINDOW.w * R, CARD_WINDOW.h * R].map(Math.round);
    const pw = Math.round(ww * 1.08);
    const ph = Math.round((m.height * pw) / m.width);
    const portrait = await sharp(pic).resize(pw, ph, { kernel: 'lanczos3' }).png().toBuffer();
    const window = await sharp({ create: { width: ww, height: wh, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
      .composite([{ input: await sharp(portrait).extract({ left: Math.round((pw - ww) / 2), top: 0, width: ww, height: Math.min(ph, wh - 2) }).png().toBuffer(), left: 0, top: 2 }])
      .png()
      .toBuffer();
    const cardPng = await sharp(await back.png()).composite([{ input: window, left: wx, top: wy }, { input: await front.png() }]).png().toBuffer();
    for (const [name, buf] of [[key, boss], [card, cardPng]]) {
      keys.push(name);
      if (preview) await sharp(buf).toFile(join(preview, `${name}.png`));
      else await sharp(buf).webp({ quality: 92, alphaQuality: 100 }).toFile(join(ART, `${name}.webp`));
    }
  }
  if (!preview) {
    const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'));
    manifest.keys = [...new Set([...manifest.keys, ...keys])].sort();
    writeFileSync(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);
  }
  console.log(`${set}: ${keys.length} pictures${preview ? ' (preview only)' : ''}`);
}

/** A picture set into a card window: fitted inside it, centred, standing on the window's bottom edge. */
async function inCard(pic, map) {
  const { back, front } = cardLayers(CARD_BACKDROPS[map]);
  const R = back.size;
  const [wx, wy, ww, wh] = [CARD_WINDOW.x * R, CARD_WINDOW.y * R, CARD_WINDOW.w * R, CARD_WINDOW.h * R].map(Math.round);
  const m = await sharp(pic).metadata();
  const k = Math.min((ww - 8) / m.width, (wh - 6) / m.height);
  const w = Math.round(m.width * k);
  const h = Math.round(m.height * k);
  const fitted = await sharp(pic).resize(w, h, { kernel: 'lanczos3' }).png().toBuffer();
  return sharp(await back.png())
    .composite([{ input: fitted, left: wx + Math.round((ww - w) / 2), top: wy + wh - h - 2 }, { input: await front.png() }])
    .png()
    .toBuffer();
}

async function buildCards(set, preview) {
  const keys = [];
  for (const [rune, tex, map] of CARDS[set]) {
    const pic = await sharp(join(ART, `${tex}_0.webp`)).trim({ threshold: 0 }).png().toBuffer();
    const key = `icon_rune_${rune}`;
    const out = await inCard(pic, map);
    keys.push(key);
    if (preview) await sharp(out).toFile(join(preview, `${key}.png`));
    else await sharp(out).webp({ quality: 92, alphaQuality: 100 }).toFile(join(ART, `${key}.webp`));
  }
  addToManifest(keys, preview);
  console.log(`${set}: ${keys.length} cards${preview ? ' (preview only)' : ''}`);
}

async function buildIcons(set, preview) {
  const ic = ICONS[set];
  const grid = poses(await keyed(join(IN, ic.file)), 4, 4);
  const S = 128;
  for (const [i, key] of ic.keys.entries()) {
    const pic = await sharp(await png(grid[Math.floor(i / 4)][i % 4])).trim({ threshold: 0 }).png().toBuffer();
    const fitted = await sharp(pic).resize(S - 8, S - 8, { fit: 'inside', kernel: 'lanczos3' }).png().toBuffer();
    const m = await sharp(fitted).metadata();
    const out = await sharp({ create: { width: S, height: S, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
      .composite([{ input: fitted, left: Math.round((S - m.width) / 2), top: Math.round((S - m.height) / 2) }])
      .png()
      .toBuffer();
    if (preview) await sharp(out).toFile(join(preview, `${key}.png`));
    else await sharp(out).webp({ quality: 92, alphaQuality: 100 }).toFile(join(ART, `${key}.webp`));
  }
  addToManifest(ic.keys, preview);
  console.log(`${set}: ${ic.keys.length} icons${preview ? ' (preview only)' : ''}`);
}

function addToManifest(keys, preview) {
  if (preview) return;
  const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'));
  manifest.keys = [...new Set([...manifest.keys, ...keys])].sort();
  writeFileSync(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);
}

async function main() {
  const args = process.argv.slice(2);
  const pi = args.indexOf('--preview');
  const preview = pi >= 0 ? args.splice(pi, 2)[1] : null;
  if (preview) mkdirSync(preview, { recursive: true });
  // Cards come last: they are made from the monsters' finished pictures.
  const sets = [...Object.keys(HEROES), ...Object.keys(MONSTERS), ...Object.keys(BOSSES), ...Object.keys(ICONS), ...Object.keys(CARDS)];
  const names = args.length ? args : sets.filter((n) => !ICONS[n] || existsSync(join(IN, ICONS[n].file)));
  for (const n of names) {
    if (HEROES[n]) await buildHero(n, preview);
    else if (BOSSES[n]) await buildBosses(n, preview);
    else if (CARDS[n]) await buildCards(n, preview);
    else if (ICONS[n]) await buildIcons(n, preview);
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
