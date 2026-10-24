// Renders art.html to a PNG contact sheet.
// Usage: node scripts/art-sheet.mjs <out.png> [characters|items|environment|icons]
import { createServer } from 'vite';
import { chromium } from '@playwright/test';

const out = process.argv[2] ?? 'art-sheet.png';
const set = process.argv[3];
const server = await createServer({ server: { port: 0 }, logLevel: 'error' });
await server.listen();
const { port } = server.httpServer.address();
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
await page.goto(`http://localhost:${port}/art.html${set ? `?set=${set}` : ''}`);
await page.waitForSelector('body[data-ready="1"]');
await page.waitForTimeout(500);
await page.screenshot({ path: out, fullPage: true });
await browser.close();
await server.close();
if (errors.length) {
  console.error('Errors:\n' + errors.join('\n'));
  process.exit(1);
}
console.log('Wrote ' + out);
