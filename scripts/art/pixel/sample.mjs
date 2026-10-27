/**
 * node scripts/art/pixel/sample.mjs [outDir]
 *
 * Paints the Ricco Rush sample sprites (scripts/art/pixel/heroes.mjs) and lays them out for the boss to look at:
 * lineup.png (each sprite enlarged with hard pixels) and scene.png (the heroes and a few Gummies on a grass field
 * at about the size they'd have in the game), every sprite frame on its own, and preview.html: a small page with
 * the field and the sprites breathing (publish it as an Artifact).
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { archer, gummy, mage, swordman } from './heroes.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../../..');
const OUT = process.argv[2] ?? join(ROOT, 'art/samples');
mkdirSync(OUT, { recursive: true });

const HEROES = { swordman, archer, mage };

/** A soft painterly grass field: smooth patches of three greens (value noise), a sprinkle of small flowers. */
function grass(w, h, seed = 7) {
  let r = seed;
  const rnd = () => ((r = (r * 1103515245 + 12345) % 2147483648) / 2147483648);
  const G = 10;
  const gw = Math.ceil(w / G) + 2;
  const grid = Array.from({ length: (Math.ceil(h / G) + 2) * gw }, rnd);
  const noise = (x, y) => {
    const gx = x / G;
    const gy = y / G;
    const x0 = Math.floor(gx);
    const y0 = Math.floor(gy);
    const fx = gx - x0;
    const fy = gy - y0;
    const v = (a, b) => grid[(y0 + b) * gw + x0 + a];
    const top = v(0, 0) * (1 - fx) + v(1, 0) * fx;
    const bot = v(0, 1) * (1 - fx) + v(1, 1) * fx;
    return top * (1 - fy) + bot * fy;
  };
  const greens = [[108, 140, 78], [120, 152, 84], [131, 162, 90], [143, 170, 98]];
  const px = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const n = noise(x, y) * 0.8 + rnd() * 0.2;
      px.set([...greens[Math.min(3, Math.floor(n * 4))], 255], (y * w + x) * 4);
    }
  for (let k = 0; k < (w * h) / 900; k++) {
    const x = Math.floor(rnd() * w);
    const y = Math.floor(rnd() * h);
    const c = rnd() < 0.6 ? [232, 228, 206] : [226, 204, 122];
    px.set([...c, 255], (y * w + x) * 4);
    if (x + 1 < w) px.set([c[0] - 40, c[1] - 40, c[2] - 40, 255], (y * w + x + 1) * 4);
  }
  return px;
}

async function main() {
  const frames = {};
  for (const [id, make] of Object.entries(HEROES)) {
    frames[id] = [await make(0).png(), await make(1).png()];
    writeFileSync(join(OUT, `${id}_0.png`), frames[id][0]);
    writeFileSync(join(OUT, `${id}_1.png`), frames[id][1]);
  }
  frames.gummy = [await gummy(0).png(), await gummy(1).png()];
  writeFileSync(join(OUT, 'gummy_0.png'), frames.gummy[0]);
  writeFileSync(join(OUT, 'gummy_1.png'), frames.gummy[1]);

  // Lineup: each sprite x8 on a light card, hard pixel edges.
  const Z = 8;
  const cell = 48 * Z + 40;
  const lineup = [];
  const ids = ['swordman', 'archer', 'mage'];
  ids.forEach((id, i) => lineup.push({ input: null, id, left: 20 + i * cell, top: 20 }));
  const composites = [];
  for (const [i, id] of ids.entries()) {
    composites.push({ input: await sharp(frames[id][0]).resize(48 * Z, 72 * Z, { kernel: 'nearest' }).png().toBuffer(), left: 20 + i * cell, top: 20 });
  }
  composites.push({ input: await sharp(frames.gummy[0]).resize(32 * Z, 28 * Z, { kernel: 'nearest' }).png().toBuffer(), left: 20 + 3 * cell, top: 20 + 72 * Z - 28 * Z });
  await sharp({ create: { width: 40 + 3 * cell + 32 * Z + 20, height: 72 * Z + 40, channels: 4, background: '#e9e4d8' } })
    .composite(composites)
    .png()
    .toFile(join(OUT, 'lineup.png'));

  // Scene: a grass field at game size (sprites x3, softened a touch like the classic games' scaling).
  const W = 360;
  const H = 240;
  const S = 3;
  const field = await sharp(Buffer.from(grass(W, H)), { raw: { width: W, height: H, channels: 4 } })
    .resize(W * S, H * S, { kernel: 'nearest' })
    .png()
    .toBuffer();
  const shadow = (w) =>
    sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${w / 3}"><ellipse cx="${w / 2}" cy="${w / 6}" rx="${w / 2 - 1}" ry="${w / 6 - 1}" fill="rgba(30,40,20,0.35)"/></svg>`)).png().toBuffer();
  const place = [];
  const put = async (buf, w, h, x, y, scale = S) => {
    place.push({ input: await shadow(Math.round(w * 0.55 * scale)), left: Math.round(x + (w * scale) / 2 - (w * 0.55 * scale) / 2), top: Math.round(y + h * scale - (w * 0.55 * scale) / 6 - 2) });
    place.push({ input: await sharp(buf).resize(w * scale, h * scale, { kernel: 'nearest' }).blur(0.4).png().toBuffer(), left: Math.round(x), top: Math.round(y) });
  };
  await put(frames.gummy[0], 32, 28, 150, 70);
  await put(frames.gummy[1], 32, 28, 820, 120);
  await put(frames.gummy[0], 32, 28, 900, 520);
  await put(frames.swordman[0], 48, 72, 260, 260);
  await put(frames.archer[0], 48, 72, 480, 300);
  await put(frames.mage[0], 48, 72, 690, 250);
  await put(frames.gummy[1], 32, 28, 120, 560);
  await sharp(field).composite(place).png().toFile(join(OUT, 'scene.png'));
  writeFileSync(join(OUT, 'preview.html'), await page(frames, await sharp(join(OUT, 'scene.png')).png().toBuffer()));
  console.log(`wrote ${OUT}/lineup.png, scene.png, preview.html and the sprite frames`);
}

main();

/** The preview page: the field, then each sprite enlarged and breathing (two frames, hard pixels). */
async function page(frames, scene) {
  const uri = (b) => `data:image/png;base64,${b.toString('base64')}`;
  const cards = [
    ['swordman', 'Swordman', 'ผ้าคาดหัวกรมท่า เกราะอกเหล็กด้าน ดาบกับบัคเลอร์ไม้'],
    ['archer', 'Archer', 'หางม้าน้ำตาล เสื้อหนังเขียวมอส ธนูยาวไม้'],
    ['mage', 'Mage', 'หมวกพลัมน้ำตาล เสื้อคลุมคราม ผ้าพันคอแดงสนิม'],
    ['gummy', 'Gummy', 'มอนตัวแรกของ Greenhill Fields'],
  ];
  const data = JSON.stringify(Object.fromEntries(cards.map(([id]) => [id, frames[id].map(uri)])));
  return `<title>Ricco Rush Pixel Sample</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Mitr:wght@400;500&family=IBM+Plex+Sans+Thai:wght@400;500&display=swap">
<style>
/* Layout: the field as the hero picture, then one card per sprite; a sprite viewer, so pixels stay hard. */
:root { --bg: #ece6d8; --panel: #f8f4ea; --ink: #2f2a22; --muted: #6d6455; --line: #d6ccb6; --accent: #7a5b3a;
  --display: "Mitr", "IBM Plex Sans Thai", system-ui, sans-serif; --body: "IBM Plex Sans Thai", system-ui, sans-serif; }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { --bg: #1d1a16; --panel: #27231d; --ink: #efe7d6; --muted: #b3a891; --line: #3d362c; --accent: #d6b17f; color-scheme: dark; } }
:root[data-theme="dark"] { --bg: #1d1a16; --panel: #27231d; --ink: #efe7d6; --muted: #b3a891; --line: #3d362c; --accent: #d6b17f; color-scheme: dark; }
* { box-sizing: border-box; }
body { background: var(--bg); color: var(--ink); font: 16px/1.6 var(--body); margin: 0;
  padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px)); padding-block: 20px 40px; }
main { max-width: 760px; margin: 0 auto; display: grid; gap: 18px; }
h1 { font: 500 clamp(26px, 7vw, 36px)/1.15 var(--display); margin: 0; text-wrap: balance; }
.eyebrow { font: 500 13px/1 var(--display); letter-spacing: .08em; color: var(--accent); text-transform: uppercase; }
p { margin: 0; color: var(--muted); }
.scene { width: 100%; height: auto; border-radius: 12px; border: 1px solid var(--line); image-rendering: pixelated; display: block; }
.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; }
.card { background: var(--panel); border: 1px solid var(--line); border-radius: 12px; padding: 12px; display: grid; gap: 6px; justify-items: center; text-align: center; min-width: 0; }
.card canvas { width: 100%; max-width: 192px; height: auto; image-rendering: pixelated; }
.card h2 { font: 500 18px/1.2 var(--display); margin: 0; }
.card p { font-size: 14px; }
</style>
<main>
  <span class="eyebrow">Ricco Rush · ตัวอย่างภาพ</span>
  <h1>สไปรต์แบบเกมออนไลน์ยุค 90 ที่ผมวาดเองด้วยโค้ด</h1>
  <p>วาดทีละพิกเซลจากตารางสีของเรา ตัวสูงราว 3.5 หัว หน้าเล็ก โทนดินหม่น ด้านล่างคือขนาดในเกมจริง</p>
  <img class="scene" src="${uri(scene)}" alt="ทุ่งหญ้ากับ Swordman, Archer, Mage และ Gummy 4 ตัว" width="1080" height="720">
  <div class="grid">
    ${cards.map(([id, name, text]) => `<div class="card"><canvas id="c-${id}" width="${id === 'gummy' ? 32 : 48}" height="${id === 'gummy' ? 28 : 72}" aria-label="${name}"></canvas><h2>${name}</h2><p>${text}</p></div>`).join('\n    ')}
  </div>
</main>
<script>
(function () {
  var FRAMES = ${data};
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  Object.keys(FRAMES).forEach(function (id, k) {
    var c = document.getElementById('c-' + id);
    var ctx = c.getContext('2d');
    var imgs = FRAMES[id].map(function (src) { var i = new Image(); i.src = src; return i; });
    var f = 0;
    function draw() { ctx.clearRect(0, 0, c.width, c.height); if (imgs[f].complete) ctx.drawImage(imgs[f], 0, 0); }
    imgs[0].onload = draw;
    draw();
    if (!reduce) setInterval(function () { f = 1 - f; draw(); }, id === 'gummy' ? 380 : 620 + k * 40);
  });
})();
</script>
`;
}
