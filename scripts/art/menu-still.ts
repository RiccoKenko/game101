/**
 * npx tsx scripts/art/menu-still.ts <master.png> <out.webp> [maxW maxH]
 *
 * Cuts a hero's master illustration out of its flat background for the menu: the background is flooded from
 * the edges, then any pocket of it left enclosed by the figure (inside a staff's curl, between an arm and the
 * body) is cleared too, and the background colour bleeding into the soft edge is taken out.
 */
import sharp from 'sharp';
import { despeck, removeBackground, type RgbaImage } from './slicer';

const [src, out, maxW = '425', maxH = '560'] = process.argv.slice(2);

async function main() {
  const { data, info } = await sharp(src).toColourspace('srgb').ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const img: RgbaImage = { data: new Uint8Array(data.buffer, data.byteOffset, data.length), width: info.width, height: info.height };
  const { image, background: bg } = removeBackground(img);
  if (!bg) throw new Error('no flat background found');
  const d = image.data;
  for (let p = 0; p < image.width * image.height; p++) {
    const i = p * 4;
    if (!d[i + 3]) continue;
    // Enclosed pockets of background, and the background mixed into edge pixels.
    const dist = Math.hypot(d[i] - bg[0], d[i + 1] - bg[1], d[i + 2] - bg[2]);
    if (dist < 60) {
      d[i + 3] = 0;
      continue;
    }
    const spill = Math.min(d[i], d[i + 2]);
    const dom = bg.indexOf(Math.max(...bg));
    if (d[i + dom] > spill + 24 && dist < 200) d[i + dom] = Math.max(spill, Math.min(d[i + dom], (d[i] + d[i + 1] + d[i + 2] - d[i + dom]) / 2 + 12));
  }
  const clean = despeck(image, 400);
  const buf = Buffer.from(clean.data.buffer, clean.data.byteOffset, clean.data.length);
  await sharp(buf, { raw: { width: clean.width, height: clean.height, channels: 4 } })
    .trim({ threshold: 0 })
    .resize(Number(maxW), Number(maxH), { fit: 'inside', kernel: 'lanczos3' })
    .webp({ quality: 92, alphaQuality: 100 })
    .toFile(out);
  console.log(`wrote ${out}`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
