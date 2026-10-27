/**
 * node scripts/art/pixel/sample.mjs [outDir]
 *
 * Paints the Ricco Rush sample sprites (scripts/art/pixel/heroes.mjs) and lays them out for the boss to look at:
 * lineup.png (each sprite enlarged twice, smoothly) and scene.png (the heroes and a few Gummies on a painted grass
 * field at the size they'd have in the game), every sprite frame on its own, and preview.html: a small page with
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

/** A soft painted grass field: smooth two-octave patches of green, then tufts and small flowers drawn on top. */
async function grass(w, h, seed = 7) {
  let r = seed;
  const rnd = () => ((r = (r * 1103515245 + 12345) % 2147483648) / 2147483648);
  const layer = (G) => {
    const gw = Math.ceil(w / G) + 2;
    const grid = Array.from({ length: (Math.ceil(h / G) + 2) * gw }, rnd);
    const ease = (t) => t * t * (3 - 2 * t);
    return (x, y) => {
      const gx = x / G;
      const gy = y / G;
      const x0 = Math.floor(gx);
      const y0 = Math.floor(gy);
      const fx = ease(gx - x0);
      const fy = ease(gy - y0);
      const v = (a, b) => grid[(y0 + b) * gw + x0 + a];
      return (v(0, 0) * (1 - fx) + v(1, 0) * fx) * (1 - fy) + (v(0, 1) * (1 - fx) + v(1, 1) * fx) * fy;
    };
  };
  const big = layer(150);
  const mid = layer(46);
  const fine = layer(9);
  const stops = [[96, 128, 70], [116, 148, 80], [136, 165, 92], [156, 180, 104]];
  const px = new Uint8Array(w * h * 3);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const n = Math.max(0, Math.min(0.999, big(x, y) * 0.55 + mid(x, y) * 0.3 + fine(x, y) * 0.15)) * 3;
      const i = Math.floor(n);
      const t = n - i;
      px.set(stops[i].map((c, k) => c + (stops[i + 1][k] - c) * t), (y * w + x) * 3);
    }
  // Tufts (three short blades) in a darker and a lighter green, and a sprinkle of small flowers.
  let marks = '';
  for (let k = 0; k < (w * h) / 4200; k++) {
    const x = rnd() * w;
    const y = rnd() * h;
    const c = rnd() < 0.6 ? '#5f7f42' : '#b9cf86';
    const blades = [-0.6, -0.1, 0.4, 0.8].filter(() => rnd() < 0.75);
    for (const a of blades) {
      const t = 6 + rnd() * 6;
      marks += `<path d="M${x + a * 2} ${y} q${a * 3} ${-t / 2} ${a * 7 + rnd() * 2 - 1} ${-t}" stroke="${c}" stroke-opacity="0.6" stroke-width="1.4" fill="none" stroke-linecap="round"/>`;
    }
  }
  for (let k = 0; k < (w * h) / 14000; k++) {
    const x = rnd() * w;
    const y = rnd() * h;
    const c = rnd() < 0.6 ? '#f4efdc' : '#ecd27c';
    for (let p = 0; p < 5; p++) marks += `<circle cx="${x + Math.cos(p * 1.26) * 2.6}" cy="${y + Math.sin(p * 1.26) * 2.6}" r="2" fill="${c}"/>`;
    marks += `<circle cx="${x}" cy="${y}" r="1.4" fill="#d9a441"/>`;
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">${marks}</svg>`;
  return sharp(Buffer.from(px), { raw: { width: w, height: h, channels: 3 } })
    .blur(1.2)
    .composite([{ input: Buffer.from(svg) }])
    .png()
    .toBuffer();
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
  const size = async (buf) => {
    const m = await sharp(buf).metadata();
    return [m.width, m.height];
  };

  // Lineup: each sprite twice its size on a light card, smoothly enlarged.
  const Z = 2;
  const [hw, hh] = await size(frames.swordman[0]);
  const [gw, gh] = await size(frames.gummy[0]);
  const cell = hw * Z + 30;
  const composites = [];
  for (const [i, id] of ['swordman', 'archer', 'mage'].entries())
    composites.push({ input: await sharp(frames[id][0]).resize(hw * Z, hh * Z, { kernel: 'lanczos3' }).png().toBuffer(), left: 20 + i * cell, top: 20 });
  composites.push({ input: await sharp(frames.gummy[0]).resize(gw * Z, gh * Z, { kernel: 'lanczos3' }).png().toBuffer(), left: 20 + 3 * cell, top: 20 + (hh - gh) * Z });
  await sharp({ create: { width: 40 + 3 * cell + gw * Z, height: hh * Z + 40, channels: 4, background: '#e9e4d8' } })
    .composite(composites)
    .png()
    .toFile(join(OUT, 'lineup.png'));

  // Scene: a grass field with every sprite at its game size and a soft shadow under it.
  const W = 1080;
  const H = 720;
  const field = await grass(W, H);
  const shadow = (w) =>
    sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${Math.round(w / 3)}"><ellipse cx="${w / 2}" cy="${w / 6}" rx="${w / 2 - 1}" ry="${w / 6 - 1}" fill="rgba(30,40,20,0.33)"/></svg>`))
      .blur(1.5)
      .png()
      .toBuffer();
  const place = [];
  const put = async (buf, x, y) => {
    const [w, h] = await size(buf);
    const sw = Math.round(w * 0.55);
    place.push({ input: await shadow(sw), left: Math.round(x + w / 2 - sw / 2), top: Math.round(y + h - sw / 6 - 4) });
    place.push({ input: buf, left: Math.round(x), top: Math.round(y) });
  };
  await put(frames.gummy[0], 150, 70);
  await put(frames.gummy[1], 820, 120);
  await put(frames.gummy[0], 900, 520);
  await put(frames.swordman[0], 260, 260);
  await put(frames.archer[0], 480, 300);
  await put(frames.mage[0], 690, 250);
  await put(frames.gummy[1], 120, 560);
  await sharp(field).composite(place).png().toFile(join(OUT, 'scene.png'));
  writeFileSync(join(OUT, 'preview.html'), await page(frames, await sharp(join(OUT, 'scene.png')).jpeg({ quality: 88 }).toBuffer(), { hw, hh, gw, gh }));
  console.log(`wrote ${OUT}/lineup.png, scene.png, preview.html and the sprite frames`);
}

main();

/** The preview page: the field, then each sprite breathing (two frames). */
async function page(frames, scene, { hw, hh, gw, gh }) {
  const uri = (b, type = 'png') => `data:image/${type};base64,${b.toString('base64')}`;
  const cards = [
    ['swordman', 'Swordman', 'ผ้าคาดหัวกรมท่า เกราะอกเหล็กด้าน ดาบกับบัคเลอร์ไม้'],
    ['archer', 'Archer', 'หางม้าน้ำตาล เสื้อหนังเขียวมอส ธนูยาวไม้'],
    ['mage', 'Mage', 'หมวกพลัมน้ำตาล เสื้อคลุมคราม ผ้าพันคอแดงสนิม'],
    ['gummy', 'Gummy', 'มอนตัวแรกของ Greenhill Fields'],
  ];
  const data = JSON.stringify(Object.fromEntries(cards.map(([id]) => [id, frames[id].map(uri)])));
  return `<title>Ricco Rush Sprite Sample</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Mitr:wght@400;500&family=IBM+Plex+Sans+Thai:wght@400;500&display=swap">
<style>
/* Layout: the field as the hero picture, then one card per sprite at its own size. */
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
.scene { width: 100%; height: auto; border-radius: 12px; border: 1px solid var(--line); display: block; }
.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; }
.card { background: var(--panel); border: 1px solid var(--line); border-radius: 12px; padding: 12px; display: grid; align-content: start; gap: 6px; justify-items: center; text-align: center; min-width: 0; }
.card canvas { width: 100%; max-width: ${hw}px; height: auto; }
.card canvas.small { max-width: ${gw}px; }
.card h2 { font: 500 18px/1.2 var(--display); margin: 0; }
.card p { font-size: 14px; }
</style>
<main>
  <span class="eyebrow">Ricco Rush · ตัวอย่างภาพ</span>
  <h1>สไปรต์แบบเกมออนไลน์ยุค 2000 ที่ผมวาดเองด้วยโค้ด</h1>
  <p>ขอบเนียน ไล่แสงเงานุ่ม เส้นขอบบาง ตัวสูงราว 3.5 หัว หน้าเล็ก โทนดินหม่น ภาพทุ่งหญ้าคือขนาดในเกมจริง</p>
  <img class="scene" src="${uri(scene, 'jpeg')}" alt="ทุ่งหญ้ากับ Swordman, Archer, Mage และ Gummy 4 ตัว" width="1080" height="720">
  <div class="grid">
    ${cards.map(([id, name, text]) => `<div class="card"><canvas id="c-${id}"${id === 'gummy' ? ` class="small" width="${gw}" height="${gh}"` : ` width="${hw}" height="${hh}"`} aria-label="${name}"></canvas><h2>${name}</h2><p>${text}</p></div>`).join('\n    ')}
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
