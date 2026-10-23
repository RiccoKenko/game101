import { expect, test } from '@playwright/test';

test('showcase loads the hero and plays moves, faces and the story without errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('/');
  await page.waitForFunction(() => (window as unknown as { __ready?: boolean }).__ready === true, null, { timeout: 90_000 });
  await page.getByRole('button', { name: 'Shoot' }).click();
  await page.getByRole('button', { name: 'Happy' }).click();
  await page.getByRole('tab', { name: 'Story' }).click();
  await expect(page.locator('#dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Next' }).click();
  await page.waitForTimeout(1000);
  expect(errors).toEqual([]);
});

test('battle demo breaks the target and collects coins', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('/?battle');
  await page.waitForFunction(() => (window as unknown as { __ready?: boolean }).__ready === true, null, { timeout: 90_000 });
  await expect.poll(async () => Number(await page.locator('#coins').textContent()), { timeout: 110_000, intervals: [2000] }).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});

test('crew tab shows every character and plays their moves', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('/');
  await page.waitForFunction(() => (window as unknown as { __ready?: boolean }).__ready === true, null, { timeout: 90_000 });
  await page.getByRole('tab', { name: 'Crew' }).click();
  for (const name of ['Deckhand', 'Powder Monkey', 'Ironclad', 'Parrot Raider', 'First Mate', 'Talon', 'Mochi']) {
    await page.locator('#moves').getByRole('button', { name, exact: true }).click();
    await expect(page.locator('#who')).toHaveText(name);
    // Play whatever moves it has (none while it is still being drawn).
    await expect(page.locator('#moves .note, #moves button:not(.face)').first()).toBeVisible();
    const moves = page.locator('#moves button:not(.face)');
    for (let i = 0; i < (await moves.count()); i++) await moves.nth(i).click();
    await page.waitForTimeout(150);
  }
  expect(errors).toEqual([]);
});
