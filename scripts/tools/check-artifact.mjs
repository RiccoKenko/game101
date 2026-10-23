import { chromium } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';
const [file, out] = process.argv.slice(2);
// Artifacts get wrapped in a doctype skeleton; mimic it.
const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"></head><body>${readFileSync(file, 'utf8')}</body></html>`;
writeFileSync(file + '.wrapped.html', html);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 852, height: 393 }, deviceScaleFactor: 2 });
const errs = [];
p.on('pageerror', (e) => errs.push(String(e)));
p.on('requestfailed', (r) => errs.push('FAILED ' + r.url().slice(0, 80)));
await p.goto('file://' + file + '.wrapped.html');
await p.waitForFunction(() => window.__ready === true, null, { timeout: 90000 });
await p.waitForTimeout(1500);
await p.screenshot({ path: out });
console.log({ errs });
await b.close();
