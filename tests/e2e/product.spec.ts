import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    if (!sessionStorage.getItem('test:clean')) {
      localStorage.clear();
      sessionStorage.setItem('test:clean', 'yes');
    }
  });
});

test('@claim:demo-sandbox keeps sample progress separate from a real game', async ({ page }) => {
  await page.goto('/play?seed=realtest');
  await page.locator('[data-cell]:not(:disabled)').first().click();
  const realBefore = await page.evaluate(() => localStorage.getItem('real:game'));
  await page.goto('/demo');
  await expect(page.getByText('Demo — sample data')).toBeVisible();
  await page.locator('[data-cell]:not(:disabled)').first().click();
  await expect.poll(() => page.evaluate(() => localStorage.getItem('demo:game'))).not.toBeNull();
  expect(await page.evaluate(() => localStorage.getItem('real:game'))).toBe(realBefore);
  await page.getByRole('button', { name: 'Reset demo' }).click();
  const demo = await page.evaluate(() => JSON.parse(localStorage.getItem('demo:game') || '{}'));
  expect(demo.placements).toHaveLength(4);
});

test('@claim:local-recovery restores the board and sound choice after reload', async ({ page }) => {
  await page.goto('/play?seed=recovery');
  await page.locator('[data-cell]:not(:disabled)').first().click();
  await page.getByRole('button', { name: 'Sound on' }).click();
  await page.reload();
  await expect(page.locator('.turn-count strong')).toHaveText('2/16');
  await expect(page.getByRole('button', { name: 'Sound off' })).toBeVisible();
});

test('@claim:privacy-same-origin demo sends no request to another origin', async ({ page }) => {
  const origins = new Set<string>();
  page.on('request', (request) => origins.add(new URL(request.url()).origin));
  await page.goto('/demo');
  await page.locator('[data-cell]:not(:disabled)').first().click();
  await page.waitForTimeout(700);
  expect([...origins]).toEqual([new URL(page.url()).origin]);
  await expect(page.locator('input[type="email"], [class*="advert"], [data-payment]')).toHaveCount(0);
});

test('@claim:free-play exposes a complete game with no purchase control', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Free to play.')).toBeVisible();
  await expect(page.getByText(/buy|purchase|subscribe/i)).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Try it with sample data' })).toBeVisible();
});

test('@claim:keyboard-board places a lantern with focus and Enter', async ({ page }) => {
  await page.goto('/play?seed=keyboard');
  await page.keyboard.press('Tab');
  const cell = page.locator('[data-cell]:not(:disabled)').first();
  await cell.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.board-cell.tile')).toHaveCount(1);
});

test('@claim:complete-match reaches the visible end screen in 16 turns', async ({ page }) => {
  await page.goto('/play?seed=complete');
  for (let move = 0; move < 16; move += 1) {
    await page.locator('[data-cell]:not(:disabled)').first().click();
  }
  await expect(page.getByText('Match complete')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Play a rematch' })).toBeVisible();
  await expect(page.locator('.board-cell.tile')).toHaveCount(16);
});

test('@claim:rematch clears a completed board and changes its setup', async ({ page }) => {
  await page.goto('/play?seed=rematch');
  for (let move = 0; move < 16; move += 1) {
    await page.locator('[data-cell]:not(:disabled)').first().click();
  }
  const oldSetup = await page.evaluate(() => {
    const game = JSON.parse(localStorage.getItem('real:game') || '{}');
    return `${game.goal}:${game.tileOrder.join('')}`;
  });
  await page.getByRole('button', { name: 'Play a rematch' }).click();
  await expect(page.locator('.board-cell.tile')).toHaveCount(0);
  await expect(page.locator('.turn-count strong')).toHaveText('1/16');
  const newSetup = await page.evaluate(() => {
    const game = JSON.parse(localStorage.getItem('real:game') || '{}');
    return `${game.goal}:${game.tileOrder.join('')}`;
  });
  expect(newSetup).not.toBe(oldSetup);
});

test('@claim:frame-rate renders at least 50 animation frames per second', async ({ page }) => {
  await page.goto('/demo');
  const frames = await page.evaluate(() => new Promise<number>((resolve) => {
    let count = 0;
    const start = performance.now();
    const tick = (now: number) => {
      count += 1;
      if (now - start >= 1000) resolve(count);
      else requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }));
  expect(frames).toBeGreaterThanOrEqual(50);
});

test('@claim:offline-reload restores a playable game after the first visit', async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto('/play?seed=offline');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
  await context.setOffline(true);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByText('You are offline. Your saved game still works.')).toBeVisible();
  await page.locator('[data-cell]:not(:disabled)').first().click();
  await expect(page.locator('.board-cell.tile')).toHaveCount(1);
  await context.close();
});

test('landing and game routes have accessible structure at mobile width', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const path of ['/', '/demo', '/privacy', '/terms', '/missing-page']) {
    await page.goto(path);
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('main')).toHaveCount(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations.filter((item) => ['serious', 'critical'].includes(item.impact || ''))).toEqual([]);
  }
});

test('every internal link returns a working page', async ({ page, request }) => {
  await page.goto('/');
  const hrefs = await page.locator('a').evaluateAll((links) => links.map((link) => (link as HTMLAnchorElement).href));
  for (const href of [...new Set(hrefs)].filter((href) => href.startsWith(page.url().split('/').slice(0, 3).join('/')))) {
    const response = await request.get(href);
    expect(response.status(), href).toBeLessThan(400);
  }
});

test('no console errors occur on the landing and demo routes', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.goto('/');
  await page.goto('/demo');
  await page.waitForTimeout(800);
  expect(errors).toEqual([]);
});
