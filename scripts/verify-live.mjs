import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import AxeBuilder from '@axe-core/playwright';
import { chromium } from '@playwright/test';

const appUrl = process.env.APP_URL || 'https://first-move-friends.sociobot.in';
const roomUrl = process.env.ROOM_URL || 'https://first-move-friends-realtime.sociobot.in';
const evidenceDirectory = new URL('../.factory/repair-artifacts/', import.meta.url);
const browser = await chromium.launch({ headless: true });
const evidence = {
  checkedAt: new Date().toISOString(),
  appUrl,
  roomUrl,
  desktop: {},
  mobile: {},
  keyboard: {},
  accessibility: {},
  offline: {},
  localMatch: {},
  onlineMatch: {},
  responsePolicy: {},
  errors: []
};

await mkdir(evidenceDirectory, { recursive: true });

function recordErrors(page, label) {
  page.on('pageerror', (error) => evidence.errors.push(`${label}: pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') evidence.errors.push(`${label}: console: ${message.text()}`);
  });
}

async function freshPage(options = {}, label = 'page', captureErrors = true) {
  const context = await browser.newContext(options);
  await context.addInitScript(() => {
    if (!globalThis.sessionStorage.getItem('live:clean')) {
      globalThis.localStorage.clear();
      globalThis.sessionStorage.setItem('live:clean', 'yes');
    }
  });
  const page = await context.newPage();
  if (captureErrors) recordErrors(page, label);
  return { context, page };
}

async function completeMatch(page) {
  while (await page.locator('.board-cell.tile').count() < 16) {
    await page.locator('[data-cell]:not(:disabled)').first().click();
  }
  await page.getByText('Match complete').waitFor();
}

try {
  {
    const { context, page } = await freshPage({ viewport: { width: 1440, height: 900 } }, 'desktop');
    const response = await page.goto(`${appUrl}/`, { waitUntil: 'networkidle' });
    assert.equal(response?.status(), 200);
    assert.equal(await page.locator('h1').count(), 1);
    assert.equal(await page.locator('main').count(), 1);
    await page.screenshot({ path: new URL('live-first-screen-desktop.png', evidenceDirectory).pathname, fullPage: true });
    evidence.desktop = { status: response?.status(), h1: 1, main: 1 };
    await context.close();
  }

  {
    const { context, page } = await freshPage({ viewport: { width: 390, height: 844 }, hasTouch: true }, 'mobile');
    await page.goto(`${appUrl}/`, { waitUntil: 'networkidle' });
    const board = await page.locator('.board').boundingBox();
    assert(board);
    assert(board.y + board.height <= 844, `board bottom ${board.y + board.height} exceeds 844px`);
    for (const selector of ['.goal-card', '.score-row', '.turn-count', '.board-cell']) {
      const box = await page.locator(selector).first().boundingBox();
      assert(box && box.y + Math.min(box.height, 44) <= 844, `${selector} is outside the first viewport`);
    }
    await page.screenshot({ path: new URL('live-first-screen-mobile.png', evidenceDirectory).pathname });
    const axe = await new AxeBuilder({ page }).analyze();
    assert.deepEqual(axe.violations, []);
    evidence.mobile = { viewport: '390x844', boardBottom: Math.round((board.y + board.height) * 100) / 100 };
    evidence.accessibility.mobileHomeViolations = axe.violations.length;
    await page.evaluate(() => { globalThis.document.documentElement.style.fontSize = '200%'; });
    assert.equal(await page.evaluate(() => globalThis.getComputedStyle(globalThis.document.documentElement).fontSize), '32px');
    assert(await page.evaluate(() => globalThis.document.documentElement.scrollWidth <= globalThis.innerWidth));
    assert.equal(await page.locator('h1').count(), 1);
    assert.equal(await page.locator('.board').count(), 1);
    evidence.accessibility.textResize200 = true;
    await context.close();
  }

  {
    const { context, page } = await freshPage({}, 'keyboard');
    await page.goto(`${appUrl}/demo`);
    const firstCell = page.locator('[data-cell]:not(:disabled)').first();
    for (let presses = 0; presses < 24 && !(await firstCell.evaluate((cell) => cell === globalThis.document.activeElement)); presses += 1) {
      await page.keyboard.press('Tab');
    }
    assert(await firstCell.evaluate((cell) => cell === globalThis.document.activeElement));
    await page.keyboard.press('ArrowRight');
    assert(await page.locator('[data-cell="6"]').evaluate((cell) => cell === globalThis.document.activeElement));
    await page.keyboard.press('Space');
    await page.waitForFunction(() => globalThis.document.querySelectorAll('.board-cell.tile').length === 2);
    assert.equal(await page.locator('.board-cell.tile').count(), 2);
    evidence.keyboard = { tab: true, arrows: true, space: true, placements: 2 };
    await context.close();
  }

  {
    const { context, page } = await freshPage({}, 'offline');
    await page.goto(`${appUrl}/demo`);
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.reload();
    await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
    await context.setOffline(true);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.getByText('You are offline. Your saved game still works.').waitFor();
    await page.locator('[data-cell]:not(:disabled)').first().click();
    const placements = await page.locator('.board-cell.tile').count();
    assert(placements > 0);
    await page.screenshot({ path: new URL('live-offline-demo.png', evidenceDirectory).pathname, fullPage: true });
    evidence.offline = { serviceWorkerControlled: true, reloadWorked: true, playablePlacements: placements };
    await context.close();
  }

  {
    const { context, page } = await freshPage({}, 'local-match');
    await page.goto(`${appUrl}/play`);
    await page.locator('[data-cell]:not(:disabled)').first().click();
    assert.equal(await page.locator('.board-cell.tile').count(), 1);
    await page.reload();
    assert.equal(await page.locator('.board-cell.tile').count(), 1);
    await completeMatch(page);
    const result = await page.locator('.turn-panel h2').textContent();
    assert(result && /(?:Sun|Moon) wins|Draw/.test(result));
    await page.screenshot({ path: new URL('live-local-end-screen.png', evidenceDirectory).pathname, fullPage: true });
    await page.getByRole('button', { name: 'Play a rematch' }).click();
    assert.equal(await page.locator('.board-cell.tile').count(), 0);
    evidence.localMatch = { restoredPlacements: 1, completedPlacements: 16, result, rematchPlacements: 0 };
    await context.close();
  }

  {
    const host = await freshPage({}, 'online-host');
    const guest = await freshPage({}, 'online-guest');
    const requestOrigins = new Set();
    const websocketOrigins = new Set();
    let websocketCount = 0;
    let sentFrames = 0;
    let receivedFrames = 0;
    const observeNetwork = (page) => {
      page.on('request', (request) => requestOrigins.add(new URL(request.url()).origin));
      page.on('websocket', (socket) => {
        websocketCount += 1;
        websocketOrigins.add(new URL(socket.url()).origin);
        socket.on('framesent', () => { sentFrames += 1; });
        socket.on('framereceived', () => { receivedFrames += 1; });
      });
    };
    observeNetwork(host.page);
    observeNetwork(guest.page);
    await host.page.goto(`${appUrl}/demo`);
    await host.page.getByRole('button', { name: 'Start for real' }).click();
    await host.page.waitForURL(/\/play\?room=[A-Za-z0-9_-]{22}$/);
    const roomCode = new URL(host.page.url()).searchParams.get('room');
    assert(roomCode);
    await guest.page.goto(`${appUrl}/play?room=${roomCode}`);
    await host.page.getByText('Your turn as Sun.').first().waitFor();
    for (let turn = 0; turn < 16; turn += 1) {
      const activePage = turn % 2 === 0 ? host.page : guest.page;
      const passivePage = turn % 2 === 0 ? guest.page : host.page;
      await activePage.locator('[data-cell]:not(:disabled)').first().click();
      await passivePage.waitForFunction((count) => globalThis.document.querySelectorAll('.board-cell.tile').length === count, turn + 1);
    }
    await Promise.all([host.page.getByText('Match complete').waitFor(), guest.page.getByText('Match complete').waitFor()]);
    const result = await host.page.locator('.turn-panel h2').textContent();
    assert(result && /(?:Sun|Moon) wins|Draw/.test(result));
    await host.page.screenshot({ path: new URL('live-online-end-screen.png', evidenceDirectory).pathname, fullPage: true });
    await host.page.getByRole('button', { name: 'Play a rematch' }).click();
    await guest.page.waitForFunction(() => globalThis.document.querySelectorAll('.board-cell.tile').length === 0);
    const approvedOrigins = [appUrl, roomUrl].sort();
    assert.deepEqual([...requestOrigins].sort(), approvedOrigins);
    assert.deepEqual([...websocketOrigins], [roomUrl.replace(/^http/, 'ws')]);
    assert.equal(websocketCount, 2);
    evidence.onlineMatch = {
      completedPlacements: 16,
      result,
      rematchPlacements: 0,
      privacy: {
        requestOrigins: [...requestOrigins].sort(),
        websocketOrigins: [...websocketOrigins],
        websocketCount,
        sentFrames,
        receivedFrames,
        payloadsRecorded: false
      }
    };
    await host.context.close();
    await guest.context.close();
  }

  {
    const { context, page } = await freshPage({}, 'routes');
    for (const path of ['/privacy', '/terms', '/404.html']) {
      const response = await page.goto(`${appUrl}${path}`);
      assert.equal(response?.status(), 200);
      assert.equal(await page.locator('h1').count(), 1);
      assert.equal(await page.locator('main').count(), 1);
      const axe = await new AxeBuilder({ page }).analyze();
      assert.deepEqual(axe.violations, [], `${path} has accessibility violations`);
      evidence.accessibility[path] = axe.violations.length;
    }
    await context.close();
    const missing = await freshPage({}, 'expected-404', false);
    const missingResponse = await missing.page.goto(`${appUrl}/live-missing-route-proof`);
    assert.equal(missingResponse?.status(), 404);
    assert.equal(await missing.page.locator('header').count(), 1);
    assert.equal(await missing.page.locator('nav').count(), 1);
    assert.equal(await missing.page.locator('main').count(), 1);
    assert.equal(await missing.page.locator('footer').count(), 1);
    const missingAxe = await new AxeBuilder({ page: missing.page }).analyze();
    assert.deepEqual(missingAxe.violations, []);
    evidence.accessibility.missingRouteViolations = missingAxe.violations.length;
    evidence.responsePolicy = { missingRouteStatus: missingResponse?.status(), standardSkeleton: true };
    await missing.context.close();
  }

  assert.deepEqual(evidence.errors, []);
  evidence.ok = true;
} catch (error) {
  evidence.ok = false;
  evidence.failure = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  throw error;
} finally {
  evidence.finishedAt = new Date().toISOString();
  await writeFile(new URL('live-verification.json', evidenceDirectory), `${JSON.stringify(evidence, null, 2)}\n`);
  await browser.close();
}

console.log(JSON.stringify(evidence, null, 2));
