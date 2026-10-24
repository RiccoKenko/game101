// Bakes the hero puppet into a sprite sheet for the Phaser game (Little Archer: Monster Rush).
// Renders dev/bake.html (src/dev/bake.ts) in headless Chromium with a fixed time step, reads each frame back
// raw (premultiplied RGBA, 4x supersampled), averages it down in premultiplied space (no dark/white fringes),
// then packs the frames into an 8-column grid PNG plus a JSON of the animations, and renders a large menu still.
//
// Usage (from the sky-pirates-td worktree root): node scripts/bake-hero.mjs <outDir> [--contact <dir>]
//   writes <outDir>/hero.png, hero.json, hero_menu.png; with --contact also check images on mid grey.
//   Env: PROBE=1 renders everything (plus alternative clips) on 512 px frames to measure true extents;
//        MENU_CLIP=idle renders the menu still from the calm idle (bow low) instead of the aiming idle.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { chromium } from '@playwright/test';
import sharp from 'sharp';
import { createServer } from 'vite';

const args = process.argv.slice(2);
const outDir = resolve(args[0] ?? 'bake-out');
const contactAt = args.indexOf('--contact');
const contactDir = contactAt >= 0 ? resolve(args[contactAt + 1]) : undefined;

// --- Layout -----------------------------------------------------------------------------------------------
const PROBE = !!process.env.PROBE;
const FRAME = PROBE ? 512 : 256;
const COLS = 8;
/** Supersampling: frames render at FRAME * SS and are box-filtered down. */
const SS = 4;
/** The puppet's ground point (between the feet) in frame px. */
const FEET = PROBE ? [256, 400] : [128, 236];
/** Frame px per rig px: the standing hero (hood top to soles) comes out ~205 px tall. */
const K = 0.14;
/** Bowstring thickness in output px (the rig's own 4 rig px would be a 0.6 px hairline at this size). */
const STRING_PX = 1.35;

// --- Animations -------------------------------------------------------------------------------------------
// `clip`: the bake page's animation (src/dev/bake.ts: hero.ts clips, plus idleAim/shootFling built from them).
// `times`: clip seconds to capture (one-shots are re-timed by picking their key moments); `fps`: playback rate.
const range = (n, step, from = 0) => Array.from({ length: n }, (_, i) => +(from + i * step).toFixed(6));
const BREATH = { period: 16 / 12, amount: 1.6 };
/**
 * Run: rig px to raise the body. hero.ts's run dips 3 px (at K) below the standing soles when a foot is planted;
 * raised by this, its lowest sole meets the idle's, so idle <-> run swaps don't pop.
 */
const RUN_RAISE = 21;
const ANIMS = [
  // Aiming/ready loop: `rapid` held at full draw (arrow nocked) + hero.ts's breathing, one breath per loop.
  { name: 'idle', clip: 'idleAim', opts: BREATH, times: range(16, 1 / 12), fps: 12, loop: true },
  // `run`: one full 0.5 s stride, raised so the planted foot meets the standing soles' line.
  { name: 'run', clip: 'run', opts: { raise: RUN_RAISE }, times: range(8, 1 / 16), fps: 16, loop: true },
  // Release (from `shoot`) and re-draw (from `rapid`): starts and ends on the idle's first frame.
  { name: 'shoot', clip: 'shootFling', opts: BREATH, times: range(8, 1 / 16), fps: 16, loop: false },
  { name: 'hurt', clip: 'hit', times: [0.03, 0.07, 0.13, 0.2, 0.27, 0.38], fps: 12, loop: false },
  { name: 'ko', clip: 'ko', times: [0.06, 0.16, 0.28, 0.38, 0.46, 0.53, 0.6, 0.68, 0.8, 1.2], fps: 12, loop: false },
  // `cheer` up to its arms-up hold (the clip then lowers the arms again); hop reduced to fit the raised bow.
  { name: 'cheer', clip: 'cheer', opts: { hop: 0.4 }, times: [0.05, 0.12, 0.2, 0.28, 0.36, 0.44, 0.52, 0.6, 0.68, 0.76, 0.88, 1.05], fps: 12, loop: false },
];
if (PROBE)
  ANIMS.push(
    { name: 'idleCalm', clip: 'idle', opts: BREATH, times: range(16, 1 / 12), fps: 12, loop: true },
    { name: 'shootCalm', clip: 'shoot', times: [0.07, 0.17, 0.3, 0.42, 0.52, 0.6, 0.78, 0.98], fps: 16, loop: false },
    { name: 'shootRapid', clip: 'shootRapid', opts: BREATH, times: range(8, 1 / 16), fps: 16, loop: false },
    { name: 'runRaw', clip: 'run', times: range(8, 1 / 16), fps: 16, loop: true },
  );

/** Menu still: the idle's first frame with the hero ~520 px tall, trimmed with 12 px padding. */
const MENU = { height: 520, pad: 12, ss: 3, clip: process.env.MENU_CLIP ?? ANIMS[0].clip, opts: ANIMS[0].opts, time: 0, stringPx: 1.8 };

// --- Helpers ----------------------------------------------------------------------------------------------
/** Raw premultiplied RGBA (rows bottom-up, `n * ss` square) → straight RGBA `n` square, rows top-down. */
function downsample(raw, n, ss) {
  const R = n * ss;
  const out = Buffer.alloc(n * n * 4);
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let j = 0; j < ss; j++) {
        const row = R - 1 - (y * ss + j);
        for (let i = 0; i < ss; i++) {
          const o = (row * R + x * ss + i) * 4;
          r += raw[o];
          g += raw[o + 1];
          b += raw[o + 2];
          a += raw[o + 3];
        }
      }
      const o = (y * n + x) * 4;
      const alpha = Math.round(a / (ss * ss));
      if (alpha === 0) continue;
      out[o] = Math.min(255, Math.round((r * 255) / a));
      out[o + 1] = Math.min(255, Math.round((g * 255) / a));
      out[o + 2] = Math.min(255, Math.round((b * 255) / a));
      out[o + 3] = alpha;
    }
  return out;
}

/** Alpha bounding box (alpha > `min`) of a straight RGBA square. */
function bbox(px, n, min = 0) {
  let x0 = n, y0 = n, x1 = -1, y1 = -1;
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++)
      if (px[(y * n + x) * 4 + 3] > min) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
  return { x0, y0, x1, y1 };
}

/** Mean absolute RGBA difference (premultiplied, 0..255) over pixels covered in either image. */
function diff(p, q) {
  let sum = 0;
  let n = 0;
  for (let o = 0; o < p.length; o += 4) {
    if (p[o + 3] === 0 && q[o + 3] === 0) continue;
    for (let c = 0; c < 4; c++) {
      const a = c === 3 ? p[o + 3] : (p[o + c] * p[o + 3]) / 255;
      const b = c === 3 ? q[o + 3] : (q[o + c] * q[o + 3]) / 255;
      sum += Math.abs(a - b);
    }
    n += 4;
  }
  return n ? sum / n : 0;
}

// --- Render -----------------------------------------------------------------------------------------------
const root = resolve(import.meta.dirname, '..');
const server = await createServer({ root, server: { port: 0 }, logLevel: 'error' });
await server.listen();
const { port } = server.httpServer.address();
const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: 800, height: 800 }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.log('PAGEERROR', e.stack || e));
page.on('console', (m) => m.type() === 'error' && console.log('CONSOLE', m.text()));
await page.goto(`http://localhost:${port}/dev/bake.html`);
await page.waitForFunction(() => window.__ready === true, null, { timeout: 120_000 });

async function capture(n, ss, t) {
  const b64 = await page.evaluate((time) => window.__bake.frame(time), t);
  return downsample(Buffer.from(b64, 'base64'), n, ss);
}

await page.evaluate((o) => window.__bake.setup(o), {
  size: FRAME * SS,
  feet: [FEET[0] * SS, FEET[1] * SS],
  scale: K * SS,
  stringWidth: STRING_PX / K,
});

const frames = [];
const animations = {};
for (const a of ANIMS) {
  await page.evaluate(([clip, opts]) => window.__bake.start(clip, opts), [a.clip, a.opts ?? {}]);
  animations[a.name] = { start: frames.length, count: a.times.length, fps: a.fps, loop: a.loop };
  const own = [];
  for (const [i, t] of a.times.entries()) own.push({ anim: a.name, i, t, px: await capture(FRAME, SS, t) });
  frames.push(...own);
  let note = '';
  if (a.loop) {
    // Seamless loop check: one more step should land back on the first frame (springs included).
    const after = await capture(FRAME, SS, a.times.at(-1) + 1 / a.fps);
    const steps = own.map((f, i) => diff(f.px, own[(i + 1) % own.length].px));
    note = `; loop check: next-after-last vs first ${diff(after, own[0].px).toFixed(3)}, frame-to-frame ${Math.min(...steps).toFixed(2)}..${Math.max(...steps).toFixed(2)}`;
  }
  console.log(`${a.name}: ${a.times.length} frames from "${a.clip}"${note}`);
}
if (!PROBE && frames.length > 64) throw new Error(`${frames.length} frames: the budget is 64`);

// The menu still, rendered big on a canvas sized to fit and trimmed after; scaled from the idle's first frame.
const first = bbox(frames[0].px, FRAME);
const menuK = (MENU.height * K) / (first.y1 - first.y0 + 1);
const menuN = 760;
await page.evaluate((o) => window.__bake.setup(o), {
  size: menuN * MENU.ss,
  feet: [Math.round(menuN * 0.46) * MENU.ss, (menuN - 60) * MENU.ss],
  scale: menuK * MENU.ss,
  stringWidth: MENU.stringPx / menuK,
});
await page.evaluate(([clip, opts]) => window.__bake.start(clip, opts), [MENU.clip, MENU.opts]);
const menuPx = await capture(menuN, MENU.ss, MENU.time);
await browser.close();
await server.close();

// --- Checks -----------------------------------------------------------------------------------------------
const problems = [];
for (const f of frames) {
  f.box = bbox(f.px, FRAME);
  const { x0, y0, x1, y1 } = f.box;
  if (x0 < 1 || y0 < 1 || x1 > FRAME - 2 || y1 > FRAME - 2) problems.push(`${f.anim}[${f.i}] touches the frame edge: ${JSON.stringify(f.box)}`);
}
const stand = frames.filter((f) => f.anim === 'idle').map((f) => f.box);
const top = Math.min(...stand.map((b) => b.y0));
const sole = Math.max(...stand.map((b) => b.y1));
console.log(`standing: top ${top}, soles ${sole}, height ${sole - top + 1} px; x ${Math.min(...stand.map((b) => b.x0))}..${Math.max(...stand.map((b) => b.x1))}`);
for (const a of ANIMS) {
  const bs = frames.filter((f) => f.anim === a.name).map((f) => f.box);
  console.log(`  ${a.name.padEnd(6)} x ${Math.min(...bs.map((b) => b.x0))}..${Math.max(...bs.map((b) => b.x1))}  y ${Math.min(...bs.map((b) => b.y0))}..${Math.max(...bs.map((b) => b.y1))}  lowest row per frame: ${bs.map((b) => b.y1).join(' ')}`);
}
const mb = bbox(menuPx, menuN);
if (mb.x0 < 1 || mb.y0 < 1 || mb.x1 > menuN - 2 || mb.y1 > menuN - 2) problems.push(`menu still touches its canvas edge: ${JSON.stringify(mb)}`);
console.log(`menu: ${mb.x1 - mb.x0 + 1} x ${mb.y1 - mb.y0 + 1} px`);
for (const p of problems) console.log('PROBLEM', p);
if (PROBE)
  for (const f of frames)
    console.log(`  ${f.anim}[${f.i}] t=${f.t}  x ${f.box.x0 - FEET[0]}..${f.box.x1 - FEET[0]}  y ${f.box.y0 - FEET[1]}..${f.box.y1 - FEET[1]}`);

// --- Write ------------------------------------------------------------------------------------------------
mkdirSync(outDir, { recursive: true });
const rows = Math.ceil(frames.length / COLS);
const sheet = Buffer.alloc(COLS * FRAME * rows * FRAME * 4);
frames.forEach((f, k) => {
  const ox = (k % COLS) * FRAME;
  const oy = Math.floor(k / COLS) * FRAME;
  for (let y = 0; y < FRAME; y++) f.px.copy(sheet, ((oy + y) * COLS * FRAME + ox) * 4, y * FRAME * 4, (y + 1) * FRAME * 4);
});
const raw = (buf, w, h) => sharp(buf, { raw: { width: w, height: h, channels: 4 } });
await raw(sheet, COLS * FRAME, rows * FRAME).png({ compressionLevel: 9, adaptiveFiltering: true }).toFile(join(outDir, 'hero.png'));
writeFileSync(join(outDir, 'hero.json'), JSON.stringify({ frameWidth: FRAME, frameHeight: FRAME, feet: FEET, animations }, null, 2) + '\n');

const pad = MENU.pad;
const mw = mb.x1 - mb.x0 + 1 + 2 * pad;
const mh = mb.y1 - mb.y0 + 1 + 2 * pad;
const menu = Buffer.alloc(mw * mh * 4);
for (let y = mb.y0; y <= mb.y1; y++)
  menuPx.copy(menu, ((y - mb.y0 + pad) * mw + pad) * 4, (y * menuN + mb.x0) * 4, (y * menuN + mb.x1 + 1) * 4);
await raw(menu, mw, mh).png({ compressionLevel: 9, adaptiveFiltering: true }).toFile(join(outDir, 'hero_menu.png'));
console.log(`Wrote ${outDir}: hero.png (${COLS * FRAME}x${rows * FRAME}, ${frames.length} frames), hero.json, hero_menu.png (${mw}x${mh})`);

// --- Contact images (mid grey, frame borders, the baseline and the feet point) ------------------------------
if (contactDir) {
  mkdirSync(contactDir, { recursive: true });
  const W = COLS * FRAME;
  const H = rows * FRAME;
  const lines = [];
  frames.forEach((f, k) => {
    const ox = (k % COLS) * FRAME;
    const oy = Math.floor(k / COLS) * FRAME;
    lines.push(`<rect x="${ox + 0.5}" y="${oy + 0.5}" width="${FRAME - 1}" height="${FRAME - 1}" fill="none" stroke="#5a5a5a"/>`);
    lines.push(`<line x1="${ox}" x2="${ox + FRAME}" y1="${oy + FEET[1] + 0.5}" y2="${oy + FEET[1] + 0.5}" stroke="#d04040" stroke-opacity="0.6"/>`);
    lines.push(`<line x1="${ox + FEET[0] + 0.5}" x2="${ox + FEET[0] + 0.5}" y1="${oy + FEET[1] - 6}" y2="${oy + FEET[1] + 6}" stroke="#d04040"/>`);
    lines.push(`<text x="${ox + 5}" y="${oy + 15}" font-family="sans-serif" font-size="13" fill="#fff">${k} ${f.anim}[${f.i}] t=${f.t}</text>`);
  });
  const grid = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${lines.join('')}</svg>`);
  const sheetPng = await raw(sheet, W, H).png().toBuffer();
  await sharp({ create: { width: W, height: H, channels: 4, background: '#808080' } })
    .composite([{ input: sheetPng }, { input: grid }])
    .png()
    .toFile(join(contactDir, 'contact.png'));
  const menuPng = await raw(menu, mw, mh).png().toBuffer();
  await sharp({ create: { width: mw, height: mh, channels: 4, background: '#808080' } })
    .composite([{ input: menuPng }])
    .png()
    .toFile(join(contactDir, 'menu_on_grey.png'));
  console.log(`Contact images in ${contactDir}`);
}
