import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    if (!sessionStorage.getItem('test:clean')) {
      localStorage.clear();
      sessionStorage.setItem('test:clean', 'yes');
    }
  });
});

async function enterDemo(page: Page) {
  await page.goto('/demo');
  await expect(page.getByText('Demo — sample data')).toBeVisible();
}

async function playDemoToEnd(page: Page) {
  while (await page.locator('.board-cell.tile').count() < 16) {
    const before = await page.locator('.board-cell.tile').count();
    await page.locator('[data-cell]:not(:disabled)').first().click();
    await expect.poll(() => page.locator('.board-cell.tile').count()).toBeGreaterThan(before);
  }
}

async function startOnlineFromDemo(page: Page) {
  await enterDemo(page);
  await page.getByRole('button', { name: 'Start for real' }).click();
  await expect(page).toHaveURL(/\/play\?room=[A-Za-z0-9_-]{22}$/);
  await expect(page.getByText(/Waiting for Moon/).first()).toBeVisible();
  return new URL(page.url()).searchParams.get('room')!;
}

test('@claim:guided-opening demo begins with the full three-turn tutorial', async ({ page }) => {
  await enterDemo(page);
  await expect(page.locator('.board-cell.tile')).toHaveCount(0);
  await expect(page.getByText('Sun: place the first lantern in a centre cell.')).toBeVisible();
  await expect(page.locator('[data-cell]:not(:disabled)')).toHaveCount(4);
  await page.locator('[data-cell]:not(:disabled)').first().click();
  await expect.poll(() => page.locator('.board-cell.tile').count()).toBe(2);
  await expect(page.getByText('Sun: choose a marked cell that scores under this goal.')).toBeVisible();
});

test('@claim:two-players synchronizes two invited screens with authoritative turns and reconnect', async ({ page, browser }) => {
  const code = await startOnlineFromDemo(page);
  expect(code).toMatch(/^[A-Za-z0-9_-]{22}$/);
  const expiresIn = await page.evaluate(async ({ code }) => {
    const token = localStorage.getItem(`room:${code}:token`);
    const response = await fetch(`http://127.0.0.1:4174/v1/rooms/${code}`, { headers: { Authorization: `Bearer ${token}` } });
    return Date.parse((await response.json()).expiresAt) - Date.now();
  }, { code });
  expect(expiresIn).toBeGreaterThan(119 * 60 * 1000);
  expect(expiresIn).toBeLessThanOrEqual(120 * 60 * 1000);
  const guestContext = await browser.newContext();
  const guest = await guestContext.newPage();
  await guest.goto(`/play?room=${code}`);
  await expect(guest.getByText(/Your turn as Moon|Waiting for Sun/).first()).toBeVisible();
  await expect(page.getByText('Your turn as Sun.').first()).toBeVisible();
  const moonRejected = await guest.evaluate(async ({ code }) => {
    const token = localStorage.getItem(`room:${code}:token`);
    const response = await fetch(`http://127.0.0.1:4174/v1/rooms/${code}/moves`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ cell: 5, version: 0 })
    });
    return response.status;
  }, { code });
  expect(moonRejected).toBe(409);
  await page.locator('[data-cell]:not(:disabled)').first().click();
  await expect(page.locator('.board-cell.tile')).toHaveCount(1);
  await expect.poll(() => guest.locator('.board-cell.tile').count()).toBe(1);
  await guest.reload();
  await expect(guest.locator('.board-cell.tile')).toHaveCount(1);
  await guest.locator('[data-cell]:not(:disabled)').first().click();
  await expect.poll(() => page.locator('.board-cell.tile').count()).toBe(2);
  await guestContext.close();
});

test('@claim:invite-link copied from a demo-started room preserves its setup', async ({ page, browser, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const code = await startOnlineFromDemo(page);
  const hostGoal = await page.locator('.goal-card strong').textContent();
  await page.getByRole('button', { name: 'Copy invite link' }).click();
  await expect(page.getByText('Invite link copied. It seats Moon in this room.')).toBeVisible();
  const guestContext = await browser.newContext();
  const guest = await guestContext.newPage();
  await guest.goto(`/play?room=${code}`);
  await expect(guest.locator('.goal-card strong')).toHaveText(hostGoal || '');
  const [hostOrder, guestOrder] = await Promise.all([page, guest].map((screen) => screen.evaluate(async ({ code }) => {
    const token = localStorage.getItem(`room:${code}:token`);
    const response = await fetch(`http://127.0.0.1:4174/v1/rooms/${code}`, { headers: { Authorization: `Bearer ${token}` } });
    return (await response.json()).state.tileOrder;
  }, { code })));
  expect(guestOrder).toEqual(hostOrder);
  await guestContext.close();
});

test('@claim:demo-sandbox keeps sample progress separate from a real local game', async ({ page }) => {
  await enterDemo(page);
  await page.evaluate(() => localStorage.setItem('real:game', JSON.stringify({ marker: 'unchanged' })));
  await page.locator('[data-cell]:not(:disabled)').first().click();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('demo:game') || '{}').placements?.length)).toBe(2);
  expect(await page.evaluate(() => localStorage.getItem('real:game'))).toContain('unchanged');
  await page.getByRole('button', { name: 'Reset demo' }).click();
  await expect(page.locator('.board-cell.tile')).toHaveCount(0);
});

test('@claim:local-recovery restores demo board and sound after reload', async ({ page }) => {
  await enterDemo(page);
  await page.locator('[data-cell]:not(:disabled)').first().click();
  await expect.poll(() => page.locator('.board-cell.tile').count()).toBe(2);
  await page.getByRole('button', { name: 'Sound on' }).click();
  await page.reload();
  await expect(page.locator('.board-cell.tile')).toHaveCount(2);
  await expect(page.getByRole('button', { name: 'Sound off' })).toBeVisible();
});

test('@claim:privacy-approved-origins demo play contacts only its product origin', async ({ page }) => {
  const origins = new Set<string>();
  page.on('request', (request) => origins.add(new URL(request.url()).origin));
  await enterDemo(page);
  await page.locator('[data-cell]:not(:disabled)').first().click();
  await expect.poll(() => page.locator('.board-cell.tile').count()).toBe(2);
  expect([...origins]).toEqual([new URL(page.url()).origin]);
  await expect(page.locator('input[type="email"], [class*="advert"], [data-payment]')).toHaveCount(0);
});

test('@claim:free-play demo reaches gameplay without a purchase control', async ({ page }) => {
  await enterDemo(page);
  await expect(page.locator('.board')).toBeVisible();
  await expect(page.getByText(/buy|purchase|subscribe/i)).toHaveCount(0);
});

test('@claim:keyboard-board places a demo lantern with Enter', async ({ page }) => {
  await enterDemo(page);
  const cell = page.locator('[data-cell]:not(:disabled)').first();
  await cell.focus();
  await page.keyboard.press('Enter');
  await expect.poll(() => page.locator('.board-cell.tile').count()).toBe(2);
});

test('@claim:touch-board places a demo lantern at 390px', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
  const page = await context.newPage();
  await enterDemo(page);
  await page.locator('[data-cell]:not(:disabled)').first().tap();
  await expect.poll(() => page.locator('.board-cell.tile').count()).toBe(2);
  await context.close();
});

test('@claim:complete-match reaches the demo end screen after 16 turns', async ({ page }) => {
  await enterDemo(page);
  await playDemoToEnd(page);
  await expect(page.getByText('Match complete')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Play a rematch' })).toBeVisible();
});

test('@claim:rematch clears a completed demo board and changes setup', async ({ page }) => {
  await enterDemo(page);
  await playDemoToEnd(page);
  const oldSetup = await page.evaluate(() => {
    const game = JSON.parse(localStorage.getItem('demo:game') || '{}');
    return `${game.goal}:${game.tileOrder.join('')}`;
  });
  await page.getByRole('button', { name: 'Play a rematch' }).click();
  await expect(page.locator('.board-cell.tile')).toHaveCount(0);
  const nextSetup = await page.evaluate(() => {
    const game = JSON.parse(localStorage.getItem('demo:game') || '{}');
    return `${game.goal}:${game.tileOrder.join('')}`;
  });
  expect(nextSetup).not.toBe(oldSetup);
});

test('@claim:reduced-motion removes meaningful demo transitions', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await enterDemo(page);
  const duration = await page.locator('.game-stage').evaluate((element) => getComputedStyle(element).transitionDuration);
  expect(Number.parseFloat(duration)).toBeLessThan(0.001);
});

test('@claim:frame-rate renders at least 50 demo frames per second', async ({ page }) => {
  await enterDemo(page);
  const frames = await page.evaluate(() => new Promise<number>((resolve) => {
    let count = 0;
    const start = performance.now();
    const tick = (now: number) => { count += 1; if (now - start >= 1000) resolve(count); else requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  }));
  expect(frames).toBeGreaterThanOrEqual(50);
});

test('@claim:offline-reload restores a playable demo after the first visit', async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await enterDemo(page);
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

test('verifier reproduction: crafted setup seeds stay text and invalid saved state recovers', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await enterDemo(page);
  await page.evaluate(() => localStorage.setItem('real:game', '{"seed":"x","placements":[],"scores":{}}'));
  await page.goto('/play?seed=%3Ch1%3EInjected%3C%2Fh1%3E');
  await expect(page.locator('h1')).toHaveCount(1);
  await expect(page.locator('h1')).not.toContainText('Injected');
  await expect(page.locator('.board')).toBeVisible();
  await page.goto('/play?seed=%3Ca%20href%3D%2F%2Fexample.com%3EX%3C%2Fa%3E');
  await expect(page.locator('a[href="https://example.com/"]')).toHaveCount(0);
  await page.goto('/play');
  await expect(page.locator('.board')).toBeVisible();
  expect(pageErrors).toEqual([]);
});

test('Escape closes Pause and returns focus to its trigger', async ({ page }) => {
  await enterDemo(page);
  const trigger = page.getByRole('button', { name: 'Pause match' });
  await trigger.click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(trigger).toBeFocused();
});

test('all interactive targets are at least 44 by 44 at mobile and desktop', async ({ page }) => {
  for (const viewport of [{ width: 390, height: 844 }, { width: 1440, height: 900 }]) {
    await page.setViewportSize(viewport);
    for (const path of ['/', '/demo', '/privacy', '/terms']) {
      await page.goto(path);
      const undersized = await page.locator('a:visible, button:not(:disabled):visible').evaluateAll((elements) => elements.flatMap((element) => {
        const box = element.getBoundingClientRect();
        return box.width + 0.1 < 44 || box.height + 0.1 < 44 ? [`${element.textContent?.trim()}: ${box.width}x${box.height}`] : [];
      }));
      expect(undersized, `${path} at ${viewport.width}px`).toEqual([]);
    }
  }
});

test('routes have accessible structure at desktop and 390px mobile', async ({ page }) => {
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    for (const path of ['/', '/demo', '/privacy', '/terms', '/missing-page']) {
      await page.goto(path);
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page.locator('main')).toHaveCount(1);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `${path} at ${viewport.width}px`).toBe(true);
      const results = await new AxeBuilder({ page }).analyze();
      expect(results.violations.filter((item) => ['serious', 'critical'].includes(item.impact || ''))).toEqual([]);
    }
  }
});

test('every internal link works and normal routes log no console errors', async ({ page, request }) => {
  const errors: string[] = [];
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto('/');
  const hrefs = await page.locator('a').evaluateAll((links) => links.map((link) => (link as HTMLAnchorElement).href));
  for (const href of [...new Set(hrefs)].filter((href) => href.startsWith(new URL(page.url()).origin))) {
    expect((await request.get(href)).status(), href).toBeLessThan(400);
  }
  await page.goto('/demo');
  await page.waitForTimeout(600);
  expect(errors).toEqual([]);
});
