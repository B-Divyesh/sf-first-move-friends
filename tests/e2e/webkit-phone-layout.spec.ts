import { expect, test } from '@playwright/test';

test('WebKit keeps the whole home preview board in a 390 by 844 phone viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');

  const board = await page.locator('.hero-game .board').boundingBox();
  const viewportHeight = await page.evaluate(() => window.innerHeight);
  expect(board).not.toBeNull();
  expect(viewportHeight).toBe(844);
  expect(board!.y + board!.height).toBeLessThanOrEqual(viewportHeight);
});
