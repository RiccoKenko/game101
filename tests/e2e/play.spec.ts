import { expect, test, type Page } from '@playwright/test';

interface PlayHandle {
  battle: {
    level: { slots: [number, number][] };
    towers: unknown[];
    enemies: { progress: number }[];
    purse: { gold: number };
    waves: { wave: number };
  };
  toScreen(p: [number, number]): [number, number];
  setSpeed(s: number): void;
}

const play = (page: Page) => page.evaluate.bind(page) as <T>(fn: () => T) => Promise<T>;

async function tapSlot(page: Page, i: number): Promise<void> {
  const [x, y] = await page.evaluate((i) => {
    const p = (window as unknown as { __play: PlayHandle }).__play;
    return p.toScreen(p.battle.level.slots[i]);
  }, i);
  await page.touchscreen.tap(x, y);
}

test('test battle: build towers, start the waves, pirates walk the road and get shot down', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('/play.html?seed=3');
  await page.waitForFunction(() => (window as unknown as { __ready?: boolean }).__ready === true, null, { timeout: 90_000 });

  await tapSlot(page, 5);
  await expect(page.locator('#menu')).toBeVisible();
  await page.locator('#menu button', { hasText: 'Archer Tower' }).click();
  await expect.poll(() => play(page)(() => (window as unknown as { __play: PlayHandle }).__play.battle.towers.filter(Boolean).length)).toBe(1);
  await expect(page.locator('#gold')).toHaveText('150');

  // Every tower kind is offered; a cannon goes on a second spot.
  await tapSlot(page, 3);
  await expect(page.locator('#menu button')).toHaveCount(4);
  await page.locator('#menu button', { hasText: 'Cannon' }).click();
  await expect(page.locator('#gold')).toHaveText('60');

  await page.locator('#call').click({ force: true });
  await page.evaluate(() => (window as unknown as { __play: PlayHandle }).__play.setSpeed(4));
  await expect.poll(() => play(page)(() => {
    const b = (window as unknown as { __play: PlayHandle }).__play.battle;
    return Math.max(0, ...b.enemies.map((e) => e.progress));
  }), { timeout: 60_000 }).toBeGreaterThan(200);
  // Kills pay gold.
  await expect.poll(async () => Number(await page.locator('#gold').textContent()), { timeout: 90_000, intervals: [1000] }).toBeGreaterThan(60);
  expect(errors).toEqual([]);
});
