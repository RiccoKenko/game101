// Opens the game in an iPhone-sized Chromium and screenshots it.
// Usage: node scripts/shot.mjs <out.png> "<query string>" <waitMs> [clickX,clickY ...]
import { createServer } from 'vite';
import { chromium, devices } from '@playwright/test';

const [out = 'shot.png', query = '', waitMs = '3000', ...clicks] = process.argv.slice(2);
const server = await createServer({ server: { port: 0 }, logLevel: 'error' });
await server.listen();
const { port } = server.httpServer.address();
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const context = await browser.newContext({ ...devices['iPhone 13'], defaultBrowserType: undefined });
const page = await context.newPage();
const logs = [];
page.on('pageerror', (e) => logs.push('PAGEERROR ' + (e.stack || e)));
page.on('console', (m) => (m.type() === 'error' || m.type() === 'warning') && logs.push(m.type() + ' ' + m.text()));
await page.goto(`http://localhost:${port}/${query}`);
await page.waitForTimeout(Number(waitMs));
for (const c of clicks) {
  if (c.startsWith('wait')) {
    await page.waitForTimeout(Number(c.slice(4)));
    continue;
  }
  const [x, y] = c.split(',').map(Number);
  await page.touchscreen.tap(x, y);
  await page.waitForTimeout(600);
}
if (process.env.PRE_EVAL) {
  await page.evaluate(process.env.PRE_EVAL);
  await page.waitForTimeout(Number(process.env.PRE_WAIT ?? 1500));
}
await page.screenshot({ path: out });
const info = await page.evaluate(() => {
  const g = window.__game;
  if (!g) return null;
  const active = g.scene.getScenes(true).map((s) => s.scene.key);
  const game = g.scene.getScene('Game');
  const run = game && game.run ? { time: Math.round(game.run.time), level: game.run.level, kills: game.run.kills, hp: Math.round(game.player.hp), ended: game.run.ended } : null;
  return { active, run, fps: Math.round(g.loop.actualFps) };
});
console.log(JSON.stringify(info));
if (process.env.EVAL) console.log('EVAL', await page.evaluate(process.env.EVAL));
if (logs.length) console.log(logs.join('\n'));
await browser.close();
await server.close();
