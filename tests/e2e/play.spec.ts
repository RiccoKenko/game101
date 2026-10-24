import { expect, test, type Page } from '@playwright/test';

interface PlayHandle {
  battle: {
    level: { slots: [number, number][] };
    towers: unknown[];
    enemies: { progress: number }[];
    purse: { gold: number };
    waves: { wave: number };
    talon: { cooldown: number };
    orders: unknown[];
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
  await page.goto('/play.html?level=level1&seed=3');
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
  // Talon is ready once pirates are on the island; calling him starts his cooldown.
  await expect(page.locator('#skill-talon')).toBeEnabled({ timeout: 30_000 });
  await page.locator('#skill-talon').click({ force: true });
  await expect.poll(() => play(page)(() => (window as unknown as { __play: PlayHandle }).__play.battle.talon.cooldown)).toBeGreaterThan(0);
  await expect(page.locator('#skill-talon')).toBeDisabled();
  // Kills pay gold.
  await expect.poll(async () => Number(await page.locator('#gold').textContent()), { timeout: 90_000, intervals: [1000] }).toBeGreaterThan(60);
  // After wave 2 the captain offers three orders; the battle waits for a pick.
  await expect(page.locator('#orders')).toBeVisible({ timeout: 60_000 });
  await expect(page.locator('.order')).toHaveCount(3);
  await page.locator('.order').first().click({ force: true });
  await expect(page.locator('#orders')).toBeHidden();
  expect(await play(page)(() => (window as unknown as { __play: PlayHandle }).__play.battle.orders.length)).toBe(1);
  expect(errors).toEqual([]);
});

test('chapter: pick a level on the map, watch its story, win, and find it saved with the next level open', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('/play.html?seed=5');
  await page.waitForFunction(() => (window as unknown as { __ready?: boolean }).__ready === true, null, { timeout: 90_000 });
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForFunction(() => (window as unknown as { __ready?: boolean }).__ready === true, null, { timeout: 90_000 });

  // Only level 1 is open; the others are locked.
  await expect(page.locator('.chapter')).toBeVisible();
  const nodes = page.locator('.chapter .node');
  const count = await nodes.count();
  expect(count).toBeGreaterThanOrEqual(1);
  await expect(page.locator('.chapter .node.locked')).toHaveCount(count - 1);

  // Hard mode, then level 1: its card, Play, and the opening scene (skipped after one line).
  await page.locator('.diff button', { hasText: 'Hard' }).click();
  await nodes.first().click();
  await expect(page.locator('.level-card')).toBeVisible();
  await page.locator('#play-level').click();
  await expect(page.locator('.chapter')).toBeHidden();
  await expect(page.locator('.story')).toBeVisible();
  await expect(page.locator('.speaker')).toHaveText('Little Archer');
  await page.locator('.story').click();
  await page.locator('#story-skip').click();
  await expect(page.locator('.story')).toBeHidden();
  expect(await page.evaluate(() => (window as unknown as { __play: { difficulty: string } }).__play.difficulty)).toBe('hard');
  await expect(page.locator('#diff-tag')).toHaveText('Hard');

  // Pause and resume.
  await page.locator('#pause-btn').click({ force: true });
  await expect(page.locator('.pause-card')).toBeVisible();
  await page.locator('#resume').click();
  await expect(page.locator('.pause-card')).toBeHidden();

  // Win at once: every wave arrived, nobody left on the road.
  await page.evaluate(() => {
    const b = (window as unknown as { __play: { battle: { callWave(): void; waves: { wave: number; waves: unknown[]; queue: unknown[] }; enemies: unknown[] } } }).__play.battle;
    b.callWave();
    b.waves.wave = b.waves.waves.length - 1;
    b.waves.queue = [];
    b.enemies = [];
  });
  await expect(page.locator('.end-card.won')).toBeVisible({ timeout: 10_000 });
  await expect(page.locator('.big-star.on')).toHaveCount(3, { timeout: 5_000 });
  await expect(page.locator('.best-tag')).toBeVisible();

  // To the map, through the closing scene.
  await page.locator('.end-buttons button', { hasText: 'Map' }).click();
  await expect(page.locator('.story')).toBeVisible();
  await page.locator('#story-skip').click();
  await expect(page.locator('.chapter')).toBeVisible();
  await expect(nodes.first().locator('.star.on')).toHaveCount(3);
  await expect(nodes.first().locator('.hard-badge')).toBeVisible();
  await expect(page.locator('.chapter .node.locked')).toHaveCount(Math.max(0, count - 2));

  // Saved on the device: still there after a reload, and the opening scene isn't shown twice.
  await page.reload();
  await page.waitForFunction(() => (window as unknown as { __ready?: boolean }).__ready === true, null, { timeout: 90_000 });
  await expect(nodes.first().locator('.star.on')).toHaveCount(3);
  await nodes.first().click();
  await page.locator('#play-level').click();
  await expect(page.locator('.chapter')).toBeHidden();
  await page.waitForTimeout(500);
  await expect(page.locator('.story')).toBeHidden();
  expect(errors).toEqual([]);
});
