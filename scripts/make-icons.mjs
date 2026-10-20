// Renders the home-screen / PWA icons from the hero art into public/icons/.
import { createServer } from 'vite';
import { chromium } from '@playwright/test';
import { writeFileSync } from 'node:fs';

const server = await createServer({ server: { port: 0 }, logLevel: 'error' });
await server.listen();
const { port } = server.httpServer.address();
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage();
await page.goto(`http://localhost:${port}/art.html`);
const sizes = { 'icon-512.png': 512, 'icon-192.png': 192, 'apple-touch-icon.png': 180, 'favicon-32.png': 32 };
for (const [name, size] of Object.entries(sizes)) {
  const b64 = await page.evaluate(async (size) => {
    const { CHARACTERS_ART } = await import('/src/art/characters.ts');
    const load = (svg) =>
      new Promise((res) => {
        const img = new Image();
        img.onload = () => res(img);
        img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
      });
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(size / 2, size * 0.42, size * 0.05, size / 2, size / 2, size * 0.72);
    g.addColorStop(0, '#5ad15a');
    g.addColorStop(1, '#2e7d3a');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = 'rgba(29, 22, 48, 0.25)';
    ctx.beginPath();
    ctx.ellipse(size / 2, size * 0.86, size * 0.3, size * 0.06, 0, 0, Math.PI * 2);
    ctx.fill();
    const hero = await load(CHARACTERS_ART.hero_0.svg);
    const h = size * 0.74;
    const w = (h * CHARACTERS_ART.hero_0.w) / CHARACTERS_ART.hero_0.h;
    ctx.drawImage(hero, size / 2 - w / 2, size * 0.88 - h, w, h);
    if (size >= 128) {
      const slime = await load(CHARACTERS_ART.slime_0.svg);
      const sh = size * 0.2;
      const sw = (sh * CHARACTERS_ART.slime_0.w) / CHARACTERS_ART.slime_0.h;
      ctx.drawImage(slime, size * 0.06, size * 0.9 - sh, sw, sh);
    }
    return c.toDataURL('image/png').split(',')[1];
  }, size);
  writeFileSync(`public/icons/${name}`, Buffer.from(b64, 'base64'));
  console.log('wrote', name);
}
await browser.close();
await server.close();
