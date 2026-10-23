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
