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
  // The Quests button is the middle one of the bottom row, 120 game px above the bottom.
  await page.touchscreen.tap(box.x + 540 * scale, box.y + box.height - 120 * scale);
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

test('a run that defeats enough slimes unlocks the Lucky Clover and earns mastery', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.addInitScript(() => {
    if (!localStorage.getItem('little-archer-save-v1')) localStorage.setItem('little-archer-save-v1', JSON.stringify({ version: 1, bestiary: { slime: 398 } }));
  });
  await page.goto('/?autostart&bot&speed=8&seed=4');
  type G = { scene: { getScene(k: string): { run?: { kills: number }; endRun?: (quit: boolean) => void }; isActive(k: string): boolean } };
  await expect
    .poll(() => page.evaluate(() => (window as unknown as { __game?: G }).__game?.scene.getScene('Game')?.run?.kills ?? 0), { timeout: 60_000 })
    .toBeGreaterThanOrEqual(3);
  // End the run as if the hero fell.
  await page.evaluate(() => (window as unknown as { __game: G }).__game.scene.getScene('Game').endRun!(false));
  await expect.poll(() => page.evaluate(() => (window as unknown as { __game: G }).__game.scene.isActive('GameOver')), { timeout: 10_000 }).toBe(true);
  const save = await page.evaluate(() => JSON.parse(localStorage.getItem('little-archer-save-v1')!));
  expect(save.unlocked).toContain('passive:clover');
  expect(save.bestiary.slime).toBeGreaterThanOrEqual(400);
  expect(save.stats.deaths).toBe(1);
  expect(save.mastery.archer).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});

test('the Collection opens from the menu and every tab draws', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('/');
  await expect.poll(() => scenes(page), { timeout: 30_000 }).toContain('Menu');
  const box = (await page.locator('canvas').boundingBox())!;
  const scale = box.width / 1080;
  // The round book button sits left of PLAY, at the same height.
  await page.touchscreen.tap(box.x + 110 * scale, box.y + box.height - 300 * scale);
  await expect.poll(() => scenes(page), { timeout: 10_000 }).toContain('Collection');
  for (const tab of ['runes', 'items', 'monsters', 'heroes', 'weapons']) {
    await page.evaluate((t) => (window as unknown as { __game: { scene: { getScene(k: string): { show(t: string): void } } } }).__game.scene.getScene('Collection').show(t), tab);
  }
  expect(errors).toEqual([]);
});

test('the Gear screen equips and levels an item', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.addInitScript(() => {
    if (localStorage.getItem('little-archer-save-v1')) return;
    const items = [{ uid: 1, type: 'hunterGloves', rarity: 2, level: 1, spent: 0, fresh: true }];
    localStorage.setItem('little-archer-save-v1', JSON.stringify({ version: 1, gold: 500, gear: { items, equipped: {}, next: 2 } }));
  });
  await page.goto('/');
  await expect.poll(() => scenes(page), { timeout: 30_000 }).toContain('Menu');
  const box = (await page.locator('canvas').boundingBox())!;
  const scale = box.width / 1080;
  const tap = (x: number, y: number) => page.touchscreen.tap(box.x + x * scale, box.y + y * scale);
  // Gear is the right-hand button of the bottom row.
  await tap(870, box.height / scale - 120);
  await expect.poll(() => scenes(page), { timeout: 10_000 }).toContain('Gear');
  type Obj = { type: string; x: number; y: number; opts?: { label?: string } };
  type GS = { content: Obj[]; popup: Obj[] };
  const gearScene = () => (window as unknown as { __game: { scene: { getScene(k: string): GS } } }).__game.scene.getScene('Gear');
  // Nothing is worn, so the first tap zone is the item in the bag.
  const [ix, iy] = await page.evaluate((fn) => {
    const z = (eval(fn) as () => GS)().content.find((o) => o.type === 'Zone')!;
    return [z.x, z.y];
  }, `(${gearScene})`);
  await tap(ix, iy);
  const button = (label: string) =>
    page.evaluate(
      ([fn, l]) => {
        const b = (eval(fn) as () => GS)().popup.find((o) => o.opts?.label?.startsWith(l))!;
        return [b.x, b.y];
      },
      [`(${gearScene})`, label] as const,
    );
  const [ex, ey] = await button('Equip');
  await tap(ex, ey);
  await page.waitForTimeout(300);
  const [ux, uy] = await button('Level up');
  await tap(ux, uy);
  await expect
    .poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('little-archer-save-v1')!).gear), { timeout: 5_000 })
    .toMatchObject({ equipped: { gloves: 1 }, items: [{ uid: 1, level: 2 }] });
  expect(errors).toEqual([]);
});
