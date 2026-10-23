// node playshot.mjs <outPrefix> "<query>" "<js run after ready>" <ms,ms,...>  (screenshots at each delay after the js)
import { createServer } from 'vite';
import { chromium } from '@playwright/test';
const [prefix, query, js, delays = '500'] = process.argv.slice(2);
const server = await createServer({ root: new URL('../..', import.meta.url).pathname, server: { port: 0 }, logLevel: 'error' });
await server.listen();
const { port } = server.httpServer.address();
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await (await browser.newContext({ viewport: { width: 852, height: 393 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })).newPage();
const logs = [];
page.on('pageerror', (e) => logs.push('PAGEERROR ' + (e.stack || e)));
page.on('console', (m) => m.type() === 'error' && logs.push(m.text()));
await page.goto(`http://localhost:${port}/play.html?${query}`);
await page.waitForFunction(() => window.__ready === true, null, { timeout: 120000 });
await page.waitForTimeout(800);
if (js) console.log('JS', JSON.stringify(await page.evaluate(js)));
let at = 0;
for (const [i, d] of delays.split(',').map(Number).entries()) {
  await page.waitForTimeout(d - at);
  at = d;
  await page.screenshot({ path: `${prefix}-${i}.png` });
}
console.log(logs.join('\n') || 'ok');
await browser.close();
await server.close();
