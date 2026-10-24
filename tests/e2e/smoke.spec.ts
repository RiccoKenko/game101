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
