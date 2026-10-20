// Lets the autopilot play a run and reports how it went.
// Usage: node scripts/sim.mjs "<extra query>" <maxWallSeconds> [shopJson] [screenshotPrefix]
import { createServer } from 'vite';
import { chromium, devices } from '@playwright/test';

const [extra = '', maxWall = '120', shopJson = '', shotPrefix = ''] = process.argv.slice(2);
const server = await createServer({ server: { port: 0 }, logLevel: 'error' });
await server.listen();
const { port } = server.httpServer.address();
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const context = await browser.newContext({ ...devices['iPhone 13'] });
if (shopJson) {
  await context.addInitScript((shop) => {
    const save = { version: 1, gold: 0, shop: JSON.parse(shop), unlockedMaps: 3, bestTimes: [0, 0, 0], bossKills: [0, 0, 0], settings: { music: false, sfx: false }, stats: { runs: 0, kills: 0 } };
    localStorage.setItem('little-archer-save-v1', JSON.stringify(save));
  }, shopJson);
}
const page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e.stack || e)));
await page.goto(`http://localhost:${port}/?autostart&bot&speed=16${extra}`);
const start = Date.now();
let shot = 0;
let last = null;
while ((Date.now() - start) / 1000 < Number(maxWall)) {
  await page.waitForTimeout(3000);
  last = await page.evaluate(() => {
    const g = window.__game;
    const game = g.scene.getScene('Game');
    if (!game || !game.run) return null;
    const r = game.run;
    return {
      t: Math.round(r.time),
      lv: r.level,
      kills: r.kills,
      hp: Math.round(game.player.hp),
      maxHp: r.stats.maxHp,
      foes: game.ctx.enemies.alive.length,
      boss: r.boss ? Math.round((r.boss.hp / r.boss.maxHp) * 100) + '%' : '-',
      bossesKilled: r.bossesKilled,
      gold: Math.floor(r.gold),
      inv: r.inventory.weapons.map((w) => w.id + w.level + (w.evolved ? '*' : '')).join(',') + ' | ' + r.inventory.passives.map((p) => p.id + p.level).join(','),
      ended: r.ended,
      scenes: g.scene.getScenes(true).map((s) => s.scene.key).join(','),
      fps: Math.round(g.loop.actualFps),
    };
  });
  console.log(JSON.stringify(last));
  if (shotPrefix && shot < 40) await page.screenshot({ path: `${shotPrefix}-${String(shot++).padStart(2, '0')}.png` });
  if (!last || last.ended) break;
}
if (errors.length) console.log('ERRORS:\n' + errors.join('\n'));
await browser.close();
await server.close();
