// Bakes a cut-out puppet into a sprite sheet for the Phaser game (Little Archer: Monster Rush).
// Renders dev/bake.html (src/dev/bake.ts) in headless Chromium with a fixed time step, reads each frame back
// raw (premultiplied RGBA, 4x supersampled), averages it down in premultiplied space (no dark/white fringes),
// then packs the frames into an 8-column grid PNG plus a JSON of the animations.
//
// Usage (from the sky-pirates-td worktree root):
//   node scripts/bake-hero.mjs <outDir> [--char archer|hero] [--contact <dir>]
//   writes <outDir>/hero.png and hero.json (and hero_menu.png for the old hero); with --contact, check images on
//   mid grey (contact.png, plus run_strip.png for the archer: run, runaim and runrelease frame by frame).
//   Env: PROBE=1 renders on 512 px frames to measure true extents (per-frame boxes relative to the feet).
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { chromium } from '@playwright/test';
import sharp from 'sharp';
import { createServer } from 'vite';

const args = process.argv.slice(2);
const flag = (name) => {
  const k = args.indexOf(name);
  return k >= 0 ? args.splice(k, 2)[1] : undefined;
};
const CHAR = flag('--char') ?? 'archer';
const contactArg = flag('--contact');
const contactDir = contactArg ? resolve(contactArg) : undefined;
const outDir = resolve(args[0] ?? 'bake-out');
const PROBE = !!process.env.PROBE;

const range = (n, step, from = 0) => Array.from({ length: n }, (_, i) => +(from + i * step).toFixed(6));

// --- Characters -------------------------------------------------------------------------------------------
// K: frame px per rig px. FEET: where the rig's ground point lands in the 256 px frame. STRING_PX: bowstring
// thickness in frame px (the rigs' own 4 rig px would be a 0.6 px hairline). ANIMS: `clip` is a clip of the
// character (src/puppet/clips/<id>.ts; the old hero also has bake-only mixes in src/dev/bake.ts), `times` the clip
// seconds to capture (one-shots are re-timed by picking their key moments), `fps` the playback rate.
const CHARS = {
  // The Feather Cap archer (art/rigs/archer.json, clips in src/puppet/clips/archer.ts).
  archer: {
    K: 0.158,
    FEET: [128, 236],
    STRING_PX: 1.35,
    ANIMS: [
      // Ready loop: full draw, arrow nocked, breathing (one breath per 16 frames).
      { name: 'idle', clip: 'aim', times: range(16, 1 / 12), fps: 12, loop: true },
      // One full 0.5 s stride, bow held low.
      { name: 'run', clip: 'run', times: range(8, 1 / 16), fps: 16, loop: true },
      // The same stride with the arms at full draw / just released: frame i shares run's legs, hips, torso and head.
      { name: 'runaim', clip: 'runAim', times: range(8, 1 / 16), fps: 16, loop: true },
      { name: 'runrelease', clip: 'runRelease', times: range(8, 1 / 16), fps: 16, loop: true },
      // Release then re-draw: starts and ends on idle frame 0.
      { name: 'shoot', clip: 'loose', times: range(8, 1 / 16), fps: 16, loop: false },
      { name: 'hurt', clip: 'hit', times: [0.03, 0.07, 0.13, 0.2, 0.27, 0.38], fps: 12, loop: false },
      { name: 'ko', clip: 'ko', times: [0.06, 0.16, 0.28, 0.38, 0.46, 0.53, 0.6, 0.68, 0.8, 1.2], fps: 12, loop: false },
      // Up to the arms-up hold (the clip lowers the arms again after 1.15 s).
      { name: 'cheer', clip: 'cheer', times: [0.05, 0.12, 0.2, 0.28, 0.36, 0.44, 0.52, 0.6, 0.68, 0.76, 0.88, 1.05], fps: 12, loop: false },
    ],
    SHARED: ['run', 'runaim', 'runrelease'],
  },
  // The old anime hero (public/sprites/hero), as baked first: idle/shoot are bake-only mixes of its clips.
  hero: {
    K: 0.14,
    FEET: [128, 236],
    STRING_PX: 1.35,
    ANIMS: [
      { name: 'idle', clip: 'idleAim', opts: { period: 16 / 12, amount: 1.6 }, times: range(16, 1 / 12), fps: 12, loop: true },
      { name: 'run', clip: 'run', opts: { raise: 21 }, times: range(8, 1 / 16), fps: 16, loop: true },
      { name: 'shoot', clip: 'shootFling', opts: { period: 16 / 12, amount: 1.6 }, times: range(8, 1 / 16), fps: 16, loop: false },
      { name: 'hurt', clip: 'hit', times: [0.03, 0.07, 0.13, 0.2, 0.27, 0.38], fps: 12, loop: false },
      { name: 'ko', clip: 'ko', times: [0.06, 0.16, 0.28, 0.38, 0.46, 0.53, 0.6, 0.68, 0.8, 1.2], fps: 12, loop: false },
      { name: 'cheer', clip: 'cheer', opts: { hop: 0.4 }, times: [0.05, 0.12, 0.2, 0.28, 0.36, 0.44, 0.52, 0.6, 0.68, 0.76, 0.88, 1.05], fps: 12, loop: false },
    ],
    MENU: { height: 520, pad: 12, ss: 3, clip: process.env.MENU_CLIP ?? 'idleAim', opts: { period: 16 / 12, amount: 1.6 }, time: 0, stringPx: 1.8 },
  },
};
const C = CHARS[CHAR];
if (!C) throw new Error(`Unknown character "${CHAR}"`);
const FRAME = PROBE ? 512 : 256;
const COLS = 8;
/** Supersampling: frames render at FRAME * SS and are box-filtered down. */
const SS = 4;
const FEET = PROBE ? [256, 400] : C.FEET;
const { K, STRING_PX } = C;
// ONLY=ko,cheer limits a (probe) run to some animations.
const ANIMS = process.env.ONLY ? C.ANIMS.filter((a) => process.env.ONLY.split(',').includes(a.name)) : C.ANIMS;
/** Bones whose transforms must match frame for frame across C.SHARED (everything but the arms and the bow). */
const BODY = ['hips', 'torso', 'head', 'hoodTip', 'capelet', 'quiver', 'thigh.r', 'shin.r', 'thigh.l', 'shin.l'];

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

const raw = (buf, w, h) => sharp(buf, { raw: { width: w, height: h, channels: 4 } });

/** Frames packed left to right, top to bottom into a COLS-wide grid (straight RGBA). */
function pack(frames, cols = COLS) {
  const rows = Math.ceil(frames.length / cols);
  const W = cols * FRAME;
  const sheet = Buffer.alloc(W * rows * FRAME * 4);
  frames.forEach((f, k) => {
    const ox = (k % cols) * FRAME;
    const oy = Math.floor(k / cols) * FRAME;
    for (let y = 0; y < FRAME; y++) f.px.copy(sheet, ((oy + y) * W + ox) * 4, y * FRAME * 4, (y + 1) * FRAME * 4);
  });
  return { sheet, W, H: rows * FRAME };
}

/** The frames on mid grey with frame borders, the baseline, the feet point and labels. */
async function contact(frames, file, cols = COLS) {
  const { sheet, W, H } = pack(frames, cols);
  const lines = [];
  frames.forEach((f, k) => {
    const ox = (k % cols) * FRAME;
    const oy = Math.floor(k / cols) * FRAME;
    lines.push(`<rect x="${ox + 0.5}" y="${oy + 0.5}" width="${FRAME - 1}" height="${FRAME - 1}" fill="none" stroke="#5a5a5a"/>`);
    lines.push(`<line x1="${ox}" x2="${ox + FRAME}" y1="${oy + FEET[1] + 0.5}" y2="${oy + FEET[1] + 0.5}" stroke="#d04040" stroke-opacity="0.6"/>`);
    lines.push(`<line x1="${ox + FEET[0] + 0.5}" x2="${ox + FEET[0] + 0.5}" y1="${oy + FEET[1] - 6}" y2="${oy + FEET[1] + 6}" stroke="#d04040"/>`);
    lines.push(`<text x="${ox + 5}" y="${oy + 15}" font-family="sans-serif" font-size="13" fill="#fff">${f.k ?? k} ${f.anim}[${f.i}] t=${f.t}</text>`);
  });
  const grid = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${lines.join('')}</svg>`);
  await sharp({ create: { width: W, height: H, channels: 4, background: '#808080' } })
    .composite([{ input: await raw(sheet, W, H).png().toBuffer() }, { input: grid }])
    .png()
    .toFile(file);
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
page.on('console', (m) => m.type() === 'error' && !m.text().includes('404') && console.log('CONSOLE', m.text()));
await page.goto(`http://localhost:${port}/dev/bake.html`);
await page.waitForFunction(() => window.__ready === true, null, { timeout: 120_000 });

async function capture(n, ss, t) {
  const b64 = await page.evaluate((time) => window.__bake.frame(time), t);
  return downsample(Buffer.from(b64, 'base64'), n, ss);
}

await page.evaluate((o) => window.__bake.setup(o), {
  id: CHAR,
  size: FRAME * SS,
  feet: [FEET[0] * SS, FEET[1] * SS],
  scale: K * SS,
  stringWidth: STRING_PX / K,
});

const frames = [];
const animations = {};
const bodies = {};
for (const a of ANIMS) {
  await page.evaluate(([clip, opts]) => window.__bake.start(clip, opts), [a.clip, a.opts ?? {}]);
  animations[a.name] = { start: frames.length, count: a.times.length, fps: a.fps, loop: a.loop };
  const own = [];
  bodies[a.name] = [];
  for (const [i, t] of a.times.entries()) {
    own.push({ anim: a.name, i, t, px: await capture(FRAME, SS, t) });
    bodies[a.name].push(await page.evaluate((names) => window.__bake.bones(names), BODY));
  }
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

// The old hero's menu still: rendered big on a canvas sized to fit and trimmed after.
let menu;
if (C.MENU && !PROBE) {
  const M = C.MENU;
  const first = bbox(frames[0].px, FRAME);
  const menuK = (M.height * K) / (first.y1 - first.y0 + 1);
  const menuN = 760;
  await page.evaluate((o) => window.__bake.setup(o), {
    id: CHAR,
    size: menuN * M.ss,
    feet: [Math.round(menuN * 0.46) * M.ss, (menuN - 60) * M.ss],
    scale: menuK * M.ss,
    stringWidth: M.stringPx / menuK,
  });
  await page.evaluate(([clip, opts]) => window.__bake.start(clip, opts), [M.clip, M.opts]);
  menu = { px: await capture(menuN, M.ss, M.time), n: menuN };
}
await browser.close();
await server.close();

// --- Checks -----------------------------------------------------------------------------------------------
const problems = [];
if (!PROBE && frames.length > 80) problems.push(`${frames.length} frames`);
for (const f of frames) {
  f.box = bbox(f.px, FRAME);
  const { x0, y0, x1, y1 } = f.box;
  if (x0 < 1 || y0 < 1 || x1 > FRAME - 2 || y1 > FRAME - 2) problems.push(`${f.anim}[${f.i}] touches the frame edge: ${JSON.stringify(f.box)}`);
}
const stand = frames.filter((f) => f.anim === (process.env.ONLY ? ANIMS[0].name : 'idle')).map((f) => f.box);
const top = Math.min(...stand.map((b) => b.y0));
const sole = Math.max(...stand.map((b) => b.y1));
console.log(`standing (idle): top ${top}, soles ${sole}, height ${sole - top + 1} px; x ${Math.min(...stand.map((b) => b.x0))}..${Math.max(...stand.map((b) => b.x1))}`);
for (const a of ANIMS) {
  const bs = frames.filter((f) => f.anim === a.name).map((f) => f.box);
  console.log(`  ${a.name.padEnd(10)} x ${Math.min(...bs.map((b) => b.x0))}..${Math.max(...bs.map((b) => b.x1))}  y ${Math.min(...bs.map((b) => b.y0))}..${Math.max(...bs.map((b) => b.y1))}  lowest row per frame: ${bs.map((b) => b.y1).join(' ')}`);
}
if (PROBE)
  for (const f of frames)
    console.log(`  ${f.anim}[${f.i}] t=${f.t}  x ${f.box.x0 - FEET[0]}..${f.box.x1 - FEET[0]}  y ${f.box.y0 - FEET[1]}..${f.box.y1 - FEET[1]}`);
// Shared body: the run-and-shoot clips must put every non-arm bone exactly where run does, frame for frame.
if (C.SHARED && C.SHARED.every((n) => bodies[n])) {
  const [base, ...others] = C.SHARED;
  let worst = 0;
  for (const o of others)
    bodies[o].forEach((b, i) => {
      for (const bone of BODY) b[bone].forEach((v, j) => (worst = Math.max(worst, Math.abs(v - bodies[base][i][bone][j]))));
    });
  console.log(`shared body (${C.SHARED.join(', ')}): largest difference in ${BODY.length} body bones' transforms over all frames: ${worst.toExponential(2)}`);
  if (worst > 1e-6) problems.push(`${C.SHARED.join('/')} do not share the body frame for frame (${worst})`);
}
let mb;
if (menu) {
  mb = bbox(menu.px, menu.n);
  if (mb.x0 < 1 || mb.y0 < 1 || mb.x1 > menu.n - 2 || mb.y1 > menu.n - 2) problems.push(`menu still touches its canvas edge: ${JSON.stringify(mb)}`);
}
for (const p of problems) console.log('PROBLEM', p);

// --- Write ------------------------------------------------------------------------------------------------
mkdirSync(outDir, { recursive: true });
const { sheet, W, H } = pack(frames);
await raw(sheet, W, H).png({ compressionLevel: 9, adaptiveFiltering: true }).toFile(join(outDir, 'hero.png'));
writeFileSync(join(outDir, 'hero.json'), JSON.stringify({ frameWidth: FRAME, frameHeight: FRAME, feet: FEET, animations }, null, 2) + '\n');
let wrote = `hero.png (${W}x${H}, ${frames.length} frames), hero.json`;
if (menu) {
  const pad = C.MENU.pad;
  const mw = mb.x1 - mb.x0 + 1 + 2 * pad;
  const mh = mb.y1 - mb.y0 + 1 + 2 * pad;
  const out = Buffer.alloc(mw * mh * 4);
  for (let y = mb.y0; y <= mb.y1; y++) menu.px.copy(out, ((y - mb.y0 + pad) * mw + pad) * 4, (y * menu.n + mb.x0) * 4, (y * menu.n + mb.x1 + 1) * 4);
  await raw(out, mw, mh).png({ compressionLevel: 9, adaptiveFiltering: true }).toFile(join(outDir, 'hero_menu.png'));
  wrote += `, hero_menu.png (${mw}x${mh})`;
}
console.log(`Wrote ${outDir}: ${wrote}`);

if (contactDir) {
  mkdirSync(contactDir, { recursive: true });
  frames.forEach((f, k) => (f.k = k));
  await contact(frames, join(contactDir, 'contact.png'));
  if (C.SHARED && C.SHARED.every((n) => bodies[n])) {
    // One row per animation, frame i under frame i: the legs must line up exactly.
    const rows = C.SHARED.flatMap((name) => frames.filter((f) => f.anim === name));
    await contact(rows, join(contactDir, 'run_strip.png'), rows.length / C.SHARED.length);
  }
  console.log(`Contact images in ${contactDir}`);
}
