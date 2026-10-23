// Renders a page frame by frame into an MP4 (for previews), with a fixed time step so it is smooth however
// slow the software renderer is. The page must set window.__ready and expose window.__step(dt) and
// window.__length (seconds).
// Usage: node scripts/record.mjs <out.mp4> "<path?query>" [fps]   (env W, H, DPR set the size)
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium } from '@playwright/test';
import { createServer } from 'vite';

const [out = 'out.mp4', target = '/', fpsArg = '30'] = process.argv.slice(2);
const fps = Number(fpsArg);
const server = await createServer({ server: { port: 0 }, logLevel: 'error' });
await server.listen();
const { port } = server.httpServer.address();
const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({
  viewport: { width: Number(process.env.W ?? 720), height: Number(process.env.H ?? 720) },
  deviceScaleFactor: Number(process.env.DPR ?? 1),
});
page.on('pageerror', (e) => console.log('PAGEERROR', e.stack || e));
await page.goto(`http://localhost:${port}${target}`);
await page.waitForFunction(() => window.__ready === true, null, { timeout: 120_000 });
const length = await page.evaluate(() => window.__length);
const dir = mkdtempSync(join(tmpdir(), 'frames-'));
const n = Math.round(length * fps);
for (let i = 0; i < n; i++) {
  await page.evaluate((dt) => window.__step(dt), 1 / fps);
  await page.screenshot({ path: join(dir, `f${String(i).padStart(5, '0')}.png`) });
}
await browser.close();
await server.close();
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(fps), '-i', join(dir, 'f%05d.png'), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', '-movflags', '+faststart', out]);
rmSync(dir, { recursive: true, force: true });
console.log(`Wrote ${out} (${n} frames, ${length.toFixed(1)} s)`);
