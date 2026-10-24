import { expect, test, type Page } from '@playwright/test';

/** Names of the Phaser scenes currently running. */
async function scenes(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const g = (window as unknown as { __game?: { scene: { getScenes(active: boolean): { scene: { key: string } }[] } } }).__game;
    return g ? g.scene.getScenes(true).map((s) => s.scene.key) : [];
  });
}

test('menu loads and PLAY starts a run', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('/');
  await expect.poll(() => scenes(page), { timeout: 30_000 }).toContain('Menu');
  const box = (await page.locator('canvas').boundingBox())!;
  // PLAY button sits 300 game px above the bottom of a 1080-wide canvas.
  const scale = box.width / 1080;
  await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height - 300 * scale);
  await expect.poll(() => scenes(page), { timeout: 15_000 }).toEqual(expect.arrayContaining(['Game', 'Hud']));
  expect(errors).toEqual([]);
});

test('autopilot survives a minute without errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('/?autostart&bot&speed=8&seed=11');
  await expect
    .poll(
      () =>
        page.evaluate(() => {
          const g = (window as unknown as { __game?: { scene: { getScene(k: string): { run?: { time: number; kills: number } } } } }).__game;
          return g?.scene.getScene('Game')?.run?.time ?? 0;
        }),
      { timeout: 90_000, intervals: [2000] },
    )
    .toBeGreaterThan(60);
  const kills = await page.evaluate(() => {
    const g = (window as unknown as { __game: { scene: { getScene(k: string): { run: { kills: number } } } } }).__game;
    return g.scene.getScene('Game').run.kills;
  });
  expect(kills).toBeGreaterThan(20);
  expect(errors).toEqual([]);
});

test('boss appears at 5:00', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('/?autostart&time=298&god&seed=3');
  await expect
    .poll(
      () =>
        page.evaluate(() => {
          const g = (window as unknown as { __game?: { scene: { getScene(k: string): { run?: { boss: unknown } } } } }).__game;
          return !!g?.scene.getScene('Game')?.run?.boss;
        }),
      { timeout: 60_000 },
    )
    .toBe(true);
  expect(errors).toEqual([]);
});

test('a finished daily quest pays out from the Quests screen', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.addInitScript(() => {
    const d = new Date();
    const day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const quests = [
      { id: 'kills', map: 0, target: 300, reward: 60, progress: 300, claimed: false },
      { id: 'level', map: 0, target: 10, reward: 60, progress: 2, claimed: false },
      { id: 'runs', map: 0, target: 3, reward: 40, progress: 0, claimed: false },
    ];
    localStorage.setItem('little-archer-save-v1', JSON.stringify({ version: 1, gold: 5, daily: { day, quests, bonus: 80, bonusClaimed: false } }));
  });
  await page.goto('/');
  await expect.poll(() => scenes(page), { timeout: 30_000 }).toContain('Menu');
  const box = (await page.locator('canvas').boundingBox())!;
  const scale = box.width / 1080;
  // The Quests button sits right of centre, 120 game px above the bottom.
  await page.touchscreen.tap(box.x + (540 + 245) * scale, box.y + box.height - 120 * scale);
  await expect.poll(() => scenes(page), { timeout: 10_000 }).toContain('Quests');
  // The first row's reward button is the only one that can be pressed.
  const [x, y] = await page.evaluate(() => {
    type Btn = { x: number; y: number; opts?: { onClick?: unknown }; enabled?: boolean };
    const g = (window as unknown as { __game: { scene: { getScene(k: string): { content: Btn[] } } } }).__game;
    const b = g.scene.getScene('Quests').content.find((o) => o.opts?.onClick && o.enabled)!;
    return [b.x, b.y];
  });
  await page.touchscreen.tap(box.x + x * scale, box.y + y * scale);
  await expect
    .poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('little-archer-save-v1')!).gold), { timeout: 5_000 })
    .toBe(65);
  expect(errors).toEqual([]);
});
