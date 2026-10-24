// Screenshots dev/rig.html (rig viewer) for a character: node scripts/shot-rig.mjs <out.png> "<query>" [w] [h]
import { chromium } from '@playwright/test';
import { createServer } from 'vite';
import { resolve } from 'node:path';
const [out, query = 'c=archer&overlay=0.5', w = '900', h = '1300'] = process.argv.slice(2);
const server = await createServer({ root: resolve(import.meta.dirname, '..'), server: { port: 0 }, logLevel: 'error' });
await server.listen();
const { port } = server.httpServer.address();
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: Number(w), height: Number(h) } });
page.on('pageerror', (e) => console.log('PAGEERROR', e.stack || e));
await page.goto(`http://localhost:${port}/dev/rig.html?${query}`);
await page.waitForFunction(() => window.__ready === true, null, { timeout: 120000 });
await page.waitForTimeout(500);
await page.screenshot({ path: out });
await browser.close();
await server.close();
