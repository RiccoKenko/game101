// node rigshot.mjs out.png "query" [width height]
import { createServer } from 'vite';
import { chromium } from '@playwright/test';
const [out, query, w = '900', h = '1100'] = process.argv.slice(2);
const server = await createServer({ root: new URL('../..', import.meta.url).pathname, server: { port: 0, hmr: false, watch: null }, logLevel: 'error' });
await server.listen();
const { port } = server.httpServer.address();
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: Number(w), height: Number(h) } });
const logs = [];
page.on('pageerror', (e) => logs.push('PAGEERROR ' + e));
page.on('console', (m) => m.type() === 'error' && logs.push(m.text()));
await page.goto(`http://localhost:${port}/dev/rig.html?${query}`);
await page.waitForFunction(() => window.__ready === true, null, { timeout: 60000 });
await page.waitForTimeout(700);
await page.screenshot({ path: out });
console.log(logs.join('\n') || 'ok');
await browser.close();
await server.close();
