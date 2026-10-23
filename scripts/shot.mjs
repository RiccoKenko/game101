// Opens the game in a landscape iPhone 15-sized Chromium and screenshots it.
// Usage: node scripts/shot.mjs <out.png> "<path?query>" <waitMs> [x,y | waitMS | drag:x1,y1,x2,y2 ...]
// The page may set window.__ready = true; we wait for it before the timer starts.
// EVAL="js" prints the result of evaluating js in the page after the steps.
import { createServer } from 'vite';
import { chromium } from '@playwright/test';

const [out = 'shot.png', target = '/', waitMs = '2000', ...steps] = process.argv.slice(2);
const server = await createServer({ server: { port: 0 }, logLevel: 'error' });
await server.listen();
const { port } = server.httpServer.address();
const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const context = await browser.newContext({
  viewport: { width: Number(process.env.W ?? 852), height: Number(process.env.H ?? 393) },
  deviceScaleFactor: Number(process.env.DPR ?? 2),
  isMobile: true,
  hasTouch: true,
  userAgent:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
});
const page = await context.newPage();
const logs = [];
page.on('pageerror', (e) => logs.push('PAGEERROR ' + (e.stack || e)));
page.on('console', (m) => ['error', 'warning'].includes(m.type()) && logs.push(m.type() + ' ' + m.text()));
await page.goto(`http://localhost:${port}${target.startsWith('/') ? '' : '/'}${target}`);
await page.waitForFunction(() => window.__ready === true, null, { timeout: 120_000 }).catch(() => logs.push('timeout waiting for __ready'));
await page.waitForTimeout(Number(waitMs));
for (const s of steps) {
  if (s.startsWith('wait')) await page.waitForTimeout(Number(s.slice(4)));
  else if (s.startsWith('drag:')) {
    const [x1, y1, x2, y2] = s.slice(5).split(',').map(Number);
    await page.mouse.move(x1, y1);
    await page.mouse.down();
    for (let i = 1; i <= 10; i++) await page.mouse.move(x1 + ((x2 - x1) * i) / 10, y1 + ((y2 - y1) * i) / 10);
    await page.mouse.up();
  } else {
    const [x, y] = s.split(',').map(Number);
    await page.touchscreen.tap(x, y);
    await page.waitForTimeout(300);
  }
}
await page.screenshot({ path: out });
if (process.env.EVAL) console.log('EVAL', JSON.stringify(await page.evaluate(process.env.EVAL)));
if (logs.length) console.log(logs.join('\n'));
await browser.close();
await server.close();
