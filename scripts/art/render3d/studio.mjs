/**
 * The photo studio for 3D models: serves the repo over a local port, opens scripts/art/render3d/page.html in
 * headless Chromium (software WebGL) and takes pictures of models in any pose. The picture post-processing that
 * turns a render into a game sprite (a dark outline, a downscale for smooth edges) lives here too.
 *
 *   const studio = await openStudio();
 *   const [png] = await studio.render({ url: '/art/models/kaykit/Knight.glb', clip: 'Idle', times: [0] });
 *   await studio.close();
 */
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { dirname, extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import sharp from 'sharp';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../../..');
const TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
};

export async function openStudio() {
  const server = createServer((req, res) => {
    const file = normalize(join(ROOT, decodeURIComponent((req.url ?? '/').split('?')[0])));
    if (!file.startsWith(ROOT) || !existsSync(file) || statSync(file).isDirectory()) {
      res.writeHead(404);
      res.end();
      return;
    }
    res.writeHead(200, { 'content-type': TYPES[extname(file).toLowerCase()] ?? 'application/octet-stream' });
    createReadStream(file).pipe(res);
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({
    executablePath: process.env.PW_CHROMIUM || undefined,
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  });
  const page = await browser.newPage();
  page.on('pageerror', (e) => console.error('page error:', e.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/scripts/art/render3d/page.html`);
  await page.waitForFunction(() => window.ready, null, { timeout: 30000 });
  return {
    info: (url) => page.evaluate((u) => window.info(u), url),
    /** PNG buffers, one per time in `opts.times` (see window.render in page.html). */
    async render(opts) {
      const urls = await page.evaluate((o) => window.render(o), opts);
      return urls.map((u) => Buffer.from(u.split(',')[1], 'base64'));
    },
    async close() {
      await browser.close();
      server.close();
    },
  };
}

/**
 * A render made into a sprite: shrunk by `down` (render big, shrink for smooth edges), then ringed with an outline
 * `r` px wide in `colour` (the classic dark sprite edge). Keeps the picture's size, so frames stay aligned.
 */
export async function spritify(png, { down = 2, r = 2, colour = [46, 34, 28] } = {}) {
  const meta = await sharp(png).metadata();
  const W = Math.round(meta.width / down);
  const H = Math.round(meta.height / down);
  const { data } = await sharp(png).resize(W, H, { kernel: 'lanczos3' }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const out = Buffer.alloc(W * H * 4);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      // The outline's coverage: the most opaque pixel within r (soft at the rim), drawn under the sprite.
      let a = 0;
      for (let dy = -r; dy <= r; dy++)
        for (let dx = -r; dx <= r; dx++) {
          const d = Math.hypot(dx, dy);
          if (d > r + 0.5) continue;
          const X = x + dx;
          const Y = y + dy;
          if (X < 0 || Y < 0 || X >= W || Y >= H) continue;
          a = Math.max(a, data[(Y * W + X) * 4 + 3] * Math.min(1, r + 0.5 - d));
        }
      const i = (y * W + x) * 4;
      const sa = data[i + 3] / 255;
      // Sprite over outline.
      const oa = a / 255;
      const ta = sa + oa * (1 - sa);
      for (let k = 0; k < 3; k++) out[i + k] = ta ? Math.round((data[i + k] * sa + colour[k] * oa * (1 - sa)) / ta) : 0;
      out[i + 3] = Math.round(ta * 255);
    }
  return sharp(out, { raw: { width: W, height: H, channels: 4 } }).png().toBuffer();
}
