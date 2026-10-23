// Draws a labelled coordinate grid over an image (optionally a crop, scaled up) for measuring points.
import sharp from 'sharp';
const [file, out, step = '50', crop] = process.argv.slice(2);
let img = sharp(file).flatten({ background: '#ff00ff' });
let ox = 0, oy = 0, w, h, k = 1;
const meta = await sharp(file).metadata();
w = meta.width; h = meta.height;
if (crop) {
  const [x, y, cw, ch, zoom] = crop.split(',').map(Number);
  img = img.extract({ left: x, top: y, width: cw, height: ch });
  ox = x; oy = y; w = cw; h = ch; k = zoom || 1;
  img = img.resize(Math.round(cw * k), Math.round(ch * k));
}
const s = Number(step);
let lines = '';
for (let x = Math.ceil(ox / s) * s; x <= ox + w; x += s) {
  const X = (x - ox) * k;
  lines += `<line x1="${X}" y1="0" x2="${X}" y2="${h * k}" stroke="${x % (s * 2) ? '#00000055' : '#000000aa'}" stroke-width="1"/>`;
  lines += `<text x="${X + 2}" y="12" font-size="11" fill="#000" stroke="#fff" stroke-width="3" paint-order="stroke" font-family="sans-serif">${x}</text>`;
}
for (let y = Math.ceil(oy / s) * s; y <= oy + h; y += s) {
  const Y = (y - oy) * k;
  lines += `<line x1="0" y1="${Y}" x2="${w * k}" y2="${Y}" stroke="${y % (s * 2) ? '#00000055' : '#000000aa'}" stroke-width="1"/>`;
  lines += `<text x="2" y="${Y - 2}" font-size="11" fill="#000" stroke="#fff" stroke-width="3" paint-order="stroke" font-family="sans-serif">${y}</text>`;
}
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.round(w * k)}" height="${Math.round(h * k)}">${lines}</svg>`;
await img.composite([{ input: Buffer.from(svg) }]).png().toFile(out);
