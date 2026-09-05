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
  const copiedInvite = await page.evaluate(() => navigator.clipboard.readText());
  expect(copiedInvite).toBe(`${new URL(page.url()).origin}/play?room=${code}`);
  const guestContext = await browser.newContext();
  const guest = await guestContext.newPage();
  await guest.goto(copiedInvite);
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
  await page.evaluate(() => localStorage.setItem('real:timing', JSON.stringify({ marker: 'unchanged' })));
  await page.locator('[data-cell]:not(:disabled)').first().click();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('demo:game') || '{}').placements?.length)).toBe(2);
  expect(await page.evaluate(() => localStorage.getItem('real:game'))).toContain('unchanged');
  await page.getByRole('button', { name: 'Reset demo' }).click();
  await expect(page.locator('.board-cell.tile')).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem('real:game'))).toContain('unchanged');
  expect(await page.evaluate(() => localStorage.getItem('real:timing'))).toContain('unchanged');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('demo:timing') || '{}').seed)).toBe('sample42');
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

test('@claim:privacy-approved-origins demo and online play contact only approved product origins', async ({ page }) => {
  const origins = new Set<string>();
  const websocketOrigins = new Set<string>();
  let websocketCount = 0;
  let pollingGets = 0;
  page.on('request', (request) => {
    origins.add(new URL(request.url()).origin);
    if (request.method() === 'GET' && /\/v1\/rooms\/[A-Za-z0-9_-]{22}$/.test(new URL(request.url()).pathname)) pollingGets += 1;
  });
  page.on('websocket', (socket) => {
    websocketCount += 1;
    websocketOrigins.add(new URL(socket.url()).origin);
  });
  await enterDemo(page);
  await page.locator('[data-cell]:not(:disabled)').first().click();
  await expect.poll(() => page.locator('.board-cell.tile').count()).toBe(2);
  await page.getByRole('button', { name: 'Start for real' }).click();
  await expect(page).toHaveURL(/\/play\?room=/);
  await expect.poll(() => [...websocketOrigins]).toEqual(['ws://127.0.0.1:4174']);
  await page.waitForTimeout(300);
  const initialSyncGets = pollingGets;
  expect(initialSyncGets).toBeLessThanOrEqual(2);
  await page.waitForTimeout(2_300);
  expect(websocketCount).toBe(1);
  expect(pollingGets).toBe(initialSyncGets);
  expect([...origins]).toEqual(['http://127.0.0.1:4173', 'http://127.0.0.1:4174']);
  await expect(page.locator('input[type="email"], [class*="advert"], [data-payment], [data-chat], [data-account]')).toHaveCount(0);
});

test('@claim:free-play demo reaches gameplay without a purchase control', async ({ page }) => {
  await enterDemo(page);
  await expect(page.locator('.board')).toBeVisible();
  await expect(page.getByText(/buy|purchase|subscribe/i)).toHaveCount(0);
});

test('@claim:keyboard-board reaches the board with Tab, moves with arrows, and places with Space and Enter', async ({ page }) => {
  await enterDemo(page);
  for (let presses = 0; presses < 20 && !(await page.locator('[data-cell]:not(:disabled)').first().evaluate((cell) => cell === document.activeElement)); presses += 1) {
    await page.keyboard.press('Tab');
  }
  const firstCell = page.locator('[data-cell]:not(:disabled)').first();
  await expect(firstCell).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('[data-cell="6"]')).toBeFocused();
  await page.keyboard.press('Space');
  await expect.poll(() => page.locator('.board-cell.tile').count()).toBe(2);
  for (let presses = 0; presses < 20 && !(await page.locator('[data-cell]:not(:disabled)').first().evaluate((cell) => cell === document.activeElement)); presses += 1) {
    await page.keyboard.press('Tab');
  }
  await page.keyboard.press('Enter');
  await expect.poll(() => page.locator('.board-cell.tile').count()).toBe(4);
});

test('@claim:non-color-players identifies Sun and Moon with different symbols and borders', async ({ page }) => {
  await enterDemo(page);
  await page.locator('[data-cell]:not(:disabled)').first().click();
  await expect.poll(() => page.locator('.board-cell.tile').count()).toBe(2);
  await expect(page.locator('.board-cell.tile.sun .sun-glyph')).toHaveText('✦');
  await expect(page.locator('.board-cell.tile.moon .moon-glyph')).toHaveText('◒');
  const borders = await page.locator('.board-cell.tile').evaluateAll((tiles) => tiles.map((tile) => getComputedStyle(tile).borderStyle));
  expect(new Set(borders)).toEqual(new Set(['solid', 'double']));
});

test('@claim:match-length measures a complete match at the intended 6–10 minute pace', async ({ page }) => {
  test.setTimeout(11 * 60 * 1000);
  await enterDemo(page);
  await expect(page.getByText('A match is designed for 6–10 minutes.')).toBeVisible();
  await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /6–10 minutes/);
  const startedAt = Date.now();
  while (await page.locator('.board-cell.tile').count() < 16) {
    const before = await page.locator('.board-cell.tile').count();
    await page.waitForTimeout(45_000);
    await page.locator('[data-cell]:not(:disabled)').first().click();
    await expect.poll(() => page.locator('.board-cell.tile').count()).toBe(Math.min(before + 2, 16));
  }
  const measuredMinutes = (Date.now() - startedAt) / 60_000;
  expect(measuredMinutes).toBeGreaterThanOrEqual(6);
  expect(measuredMinutes).toBeLessThanOrEqual(10);
  await expect(page.getByText('Match complete')).toBeVisible();
  await expect(page.locator('[data-match-duration]')).toHaveText(/6 min/);
});

test('@claim:local-pass-and-play alternates two local players, restores the board, ends, and restarts', async ({ page }) => {
  await enterDemo(page);
  await page.getByRole('link', { name: 'Play' }).click();
  await expect(page).toHaveURL('/play');
  await expect(page.locator('.player-score.sun')).toHaveClass(/active/);
  await page.locator('[data-cell]:not(:disabled)').first().click();
  await expect(page.locator('.player-score.moon')).toHaveClass(/active/);
  await page.reload();
  await expect(page.locator('.board-cell.tile')).toHaveCount(1);
  while (await page.locator('.board-cell.tile').count() < 16) {
    await page.locator('[data-cell]:not(:disabled)').first().click();
  }
  const state = await page.evaluate(() => JSON.parse(localStorage.getItem('real:game') || '{}'));
  const expectedResult = state.scores.sun === state.scores.moon
    ? `Draw at ${state.scores.sun} points each`
    : `${state.scores.sun > state.scores.moon ? 'Sun' : 'Moon'} wins ${Math.max(state.scores.sun, state.scores.moon)}–${Math.min(state.scores.sun, state.scores.moon)}`;
  await expect(page.getByText('Match complete')).toBeVisible();
  await expect(page.getByRole('heading', { name: expectedResult })).toBeVisible();
  await page.getByRole('button', { name: 'Play a rematch' }).click();
  await expect(page.locator('.board-cell.tile')).toHaveCount(0);
  await expect(page.locator('.player-score.sun')).toHaveClass(/active/);
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

test('@claim:pause-focus Escape closes Pause and returns focus to its trigger', async ({ page }) => {
  await enterDemo(page);
  const trigger = page.getByRole('button', { name: 'Pause match' });
  await trigger.click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(trigger).toBeFocused();
});

test('invalid room codes show a plain recovery action instead of staying on loading', async ({ page }) => {
  const roomRequests: string[] = [];
  page.on('request', (request) => { if (request.url().includes('/v1/rooms/')) roomRequests.push(request.url()); });
  await page.goto('/play?room=bad');
  await expect(page.getByRole('status')).toHaveText('This invite link is not valid.');
  await expect(page.getByRole('link', { name: 'Start a new game' })).toBeVisible();
  expect(roomRequests).toEqual([]);
});

test('room-service outages explain what failed and how to recover', async ({ page }) => {
  await page.route('http://127.0.0.1:4174/**', (route) => route.abort('connectionfailed'));
  await page.goto('/');
  await page.getByRole('button', { name: 'Start an online game' }).click();
  await expect(page.getByRole('status')).toHaveText('The online room could not be created. Check your connection and try again.');
  await expect(page.getByRole('button', { name: 'Start an online game' })).toBeEnabled();

  await page.goto('/play?room=AAAAAAAAAAAAAAAAAAAAAA');
  await expect(page.getByRole('status')).toHaveText('The online room could not be reached. Check your connection, then try this room again.');
  await expect(page.getByRole('button', { name: 'Try this room again' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Start a new game' })).toBeVisible();
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
    for (const path of ['/', '/demo', '/privacy', '/terms', '/missing-page', '/404.html']) {
      await page.goto(path);
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page.locator('main')).toHaveCount(1);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `${path} at ${viewport.width}px`).toBe(true);
      const results = await new AxeBuilder({ page }).analyze();
      expect(results.violations, `${path} at ${viewport.width}px`).toEqual([]);
    }
  }
});

test('missing pages explain the error plainly and provide a route home', async ({ page }) => {
  for (const path of ['/missing-page', '/404.html']) {
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Page not found');
    await expect(page.getByText('The page may have moved, or the link may be incomplete.')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Return to the game' })).toHaveAttribute('href', '/');
  }
});

test('the 390px cold first viewport shows game goal, score, turn, and board cells', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  for (const selector of ['.goal-card', '.score-row', '.turn-count', '.board-cell']) {
    const box = await page.locator(selector).first().boundingBox();
    expect(box, selector).not.toBeNull();
    expect(box!.y, selector).toBeLessThan(844);
    expect(box!.y + Math.min(box!.height, 44), selector).toBeLessThanOrEqual(844);
  }
  const board = await page.locator('.board').boundingBox();
  expect(board!.y + board!.height).toBeLessThanOrEqual(844);
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
