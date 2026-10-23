import { expect, test } from '@playwright/test';

test('showcase loads the cast and plays a move without errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('/');
  await page.waitForFunction(() => (window as unknown as { __ready?: boolean }).__ready === true, null, { timeout: 90_000 });
  await page.getByRole('button', { name: 'Cheer' }).click();
  await page.getByRole('tab', { name: 'Deckhand' }).click();
  await page.getByRole('button', { name: 'Steal crystal' }).click();
  await page.waitForTimeout(1000);
  expect(errors).toEqual([]);
});

test('battle demo defeats the pirate and collects coins', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('/?battle');
  await page.waitForFunction(() => (window as unknown as { __ready?: boolean }).__ready === true, null, { timeout: 90_000 });
  await expect.poll(async () => Number(await page.locator('#coins').textContent()), { timeout: 110_000, intervals: [2000] }).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});
