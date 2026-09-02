import assert from 'node:assert/strict';
import { readFile, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import test from 'node:test';
import { DatabaseSync } from 'node:sqlite';

const origin = 'http://127.0.0.1:4173';

async function startServer(extra = {}) {
  const dataDir = extra.DATA_DIR || await mkdtemp(path.join(tmpdir(), 'fmf-rooms-'));
  const port = String(4200 + Math.floor(Math.random() * 500));
  const child = spawn(process.execPath, ['server.mjs'], {
    cwd: new URL('.', import.meta.url),
    env: { ...process.env, DATA_DIR: dataDir, PORT: port, ...extra },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  const base = `http://127.0.0.1:${port}`;
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      if ((await fetch(`${base}/health`)).ok) return { child, base, dataDir };
    } catch {
      // The service may still be starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 40));
  }
  throw new Error('Room test server did not start.');
}

async function request(base, pathname, { token, body, ip = '198.51.100.10', method = 'GET' } = {}) {
  const response = await fetch(`${base}${pathname}`, {
    method,
    headers: {
      Origin: origin,
      'Content-Type': 'application/json',
      'X-Forwarded-For': ip,
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  return { response, json: await response.json() };
}

test('rooms use unguessable expiring codes and authoritative synchronized turns', async (t) => {
  const { child, base } = await startServer({ ROOM_TTL_MS: '300' });
  t.after(() => child.kill('SIGTERM'));
  const first = await request(base, '/v1/rooms', { method: 'POST', body: {} });
  const second = await request(base, '/v1/rooms', { method: 'POST', body: {}, ip: '198.51.100.11' });
  assert.equal(first.response.status, 201);
  assert.match(first.json.code, /^[A-Za-z0-9_-]{22}$/);
  assert.equal(first.json.token.length, 43);
  assert.notEqual(first.json.code, second.json.code);
  assert.notEqual(first.json.token, second.json.token);

  const joined = await request(base, `/v1/rooms/${first.json.code}/join`, { method: 'POST', body: {}, ip: '198.51.100.12' });
  assert.equal(joined.response.status, 200);
  assert.equal(joined.json.seat, 'moon');
  const moonFirst = await request(base, `/v1/rooms/${first.json.code}/moves`, { method: 'POST', token: joined.json.token, body: { cell: 5, version: 0 } });
  assert.equal(moonFirst.response.status, 409);
  const illegal = await request(base, `/v1/rooms/${first.json.code}/moves`, { method: 'POST', token: first.json.token, body: { cell: 0, version: 0 } });
  assert.equal(illegal.response.status, 422);
  const moved = await request(base, `/v1/rooms/${first.json.code}/moves`, { method: 'POST', token: first.json.token, body: { cell: 5, version: 0 } });
  assert.equal(moved.response.status, 200);
  assert.equal(moved.json.state.placements.length, 1);
  const reconnected = await request(base, `/v1/rooms/${first.json.code}`, { token: joined.json.token });
  assert.equal(reconnected.json.state.placements.length, 1);
  assert.equal(reconnected.json.version, 1);
  const stale = await request(base, `/v1/rooms/${first.json.code}/moves`, { method: 'POST', token: joined.json.token, body: { cell: 1, version: 0 } });
  assert.equal(stale.response.status, 409);
  await new Promise((resolve) => setTimeout(resolve, 330));
  const expired = await request(base, `/v1/rooms/${first.json.code}`, { token: first.json.token });
  assert.equal(expired.response.status, 410);
});

test('@claim:client-rate-limits rate allowances isolate clients and ignore spoofed left-most forwarding hops', async (t) => {
  const { child, base } = await startServer();
  t.after(() => child.kill('SIGTERM'));
  const responses = [];
  for (let count = 0; count < 7; count += 1) {
    responses.push((await request(base, '/v1/rooms', { method: 'POST', body: {}, ip: `198.51.100.${count + 1}, 203.0.113.10` })).response);
  }
  assert.deepEqual(responses.map((response) => response.status), [201, 201, 201, 201, 201, 201, 429]);
  assert.equal(responses.at(-1).headers.get('retry-after'), '60');
  assert.equal((await request(base, '/v1/rooms', { method: 'POST', body: {}, ip: '203.0.113.11' })).response.status, 201);
});

test('separate service replicas share each client allowance without sharing it between clients', async (t) => {
  const dataDir = await mkdtemp(path.join(tmpdir(), 'fmf-shared-rate-'));
  const first = await startServer({ DATA_DIR: dataDir });
  const second = await startServer({ DATA_DIR: dataDir });
  t.after(() => first.child.kill('SIGTERM'));
  t.after(() => second.child.kill('SIGTERM'));
  const responses = [];
  for (let count = 0; count < 7; count += 1) {
    const base = count % 2 === 0 ? first.base : second.base;
    responses.push((await request(base, '/v1/rooms', { method: 'POST', body: {}, ip: '203.0.113.20' })).response.status);
  }
  assert.deepEqual(responses, [201, 201, 201, 201, 201, 201, 429]);
  assert.equal((await request(second.base, '/v1/rooms', { method: 'POST', body: {}, ip: '203.0.113.21' })).response.status, 201);
});

test('rate buckets expire after their fixed window', async (t) => {
  const windowMs = 500;
  const { child, base } = await startServer({ RATE_LIMIT_WINDOW_MS: String(windowMs) });
  t.after(() => child.kill('SIGTERM'));
  await new Promise((resolve) => setTimeout(resolve, windowMs - (Date.now() % windowMs) + 10));
  for (let count = 0; count < 6; count += 1) {
    assert.equal((await request(base, '/v1/rooms', { method: 'POST', body: {} })).response.status, 201);
  }
  assert.equal((await request(base, '/v1/rooms', { method: 'POST', body: {} })).response.status, 429);
  await new Promise((resolve) => setTimeout(resolve, windowMs + 10));
  assert.equal((await request(base, '/v1/rooms', { method: 'POST', body: {} })).response.status, 201);
});

test('@claim:sqlite-cleanup expired rooms are removed from SQLite', async (t) => {
  const { child, base, dataDir } = await startServer({ ROOM_TTL_MS: '40', ROOM_CLEANUP_MS: '20' });
  t.after(() => child.kill('SIGTERM'));
  const created = await request(base, '/v1/rooms', { method: 'POST', body: {} });
  assert.equal(created.response.status, 201);
  await new Promise((resolve) => setTimeout(resolve, 100));
  const database = new DatabaseSync(path.join(dataDir, 'rooms.sqlite'), { readOnly: true });
  t.after(() => database.close());
  assert.equal(database.prepare('SELECT COUNT(*) AS count FROM rooms').get().count, 0);
});

test('@claim:durable-room-restart an active room survives a room-service restart with the same data directory', async (t) => {
  const dataDir = await mkdtemp(path.join(tmpdir(), 'fmf-durable-room-'));
  const first = await startServer({ DATA_DIR: dataDir });
  const created = await request(first.base, '/v1/rooms', { method: 'POST', body: {} });
  const joined = await request(first.base, `/v1/rooms/${created.json.code}/join`, { method: 'POST', body: {}, ip: '203.0.113.31' });
  assert.equal(joined.response.status, 200);
  const moved = await request(first.base, `/v1/rooms/${created.json.code}/moves`, {
    method: 'POST', token: created.json.token, body: { cell: 5, version: 0 }
  });
  assert.equal(moved.response.status, 200);
  first.child.kill('SIGTERM');
  await new Promise((resolve) => first.child.once('exit', resolve));

  const restarted = await startServer({ DATA_DIR: dataDir });
  t.after(() => restarted.child.kill('SIGTERM'));
  const restored = await request(restarted.base, `/v1/rooms/${created.json.code}`, { token: joined.json.token });
  assert.equal(restored.response.status, 200);
  assert.equal(restored.json.version, 1);
  assert.equal(restored.json.state.placements.length, 1);
  const database = new DatabaseSync(path.join(dataDir, 'rooms.sqlite'), { readOnly: true });
  t.after(() => database.close());
  assert.equal(database.prepare('PRAGMA journal_mode').get().journal_mode, 'delete');
});

test('health and response headers expose the immutable realtime build identity', async (t) => {
  const { child, base } = await startServer({ BUILD_ID: 'stale-runtime-value', SOURCE_COMMIT: 'repair-test-build' });
  t.after(() => child.kill('SIGTERM'));
  const response = await fetch(`${base}/health`);
  assert.equal(response.headers.get('x-build-id'), 'repair-test-build');
  assert.deepEqual(await response.json(), { ok: true, buildId: 'repair-test-build' });
  const dockerfile = await readFile(new URL('./Dockerfile', import.meta.url), 'utf8');
  assert.match(dockerfile, /ARG SOURCE_COMMIT=development/);
  assert.match(dockerfile, /SOURCE_COMMIT=\$SOURCE_COMMIT/);
  assert.match(dockerfile, /ROOM_DATABASE_FILE=rooms-v3\.sqlite/);
});

test('static deployment config preserves a real 404 for unknown routes', async () => {
  const config = JSON.parse(await readFile(new URL('../public/staticwebapp.config.json', import.meta.url), 'utf8'));
  assert.equal(config.navigationFallback, undefined);
  assert.deepEqual(config.responseOverrides['404'], { rewrite: '/404.html' });
  for (const route of ['/demo', '/play', '/privacy', '/terms']) {
    assert.ok(config.routes.some((entry) => entry.route === route && entry.rewrite === '/index.html' && entry.statusCode === undefined));
  }
  const notFound = await readFile(new URL('../public/404.html', import.meta.url), 'utf8');
  for (const required of ['<header', '<nav', '<main', '<footer', 'meta name="description"', 'rel="canonical"', 'Built by Param Factory']) {
    assert.ok(notFound.includes(required), `404.html must include ${required}`);
  }
});

test('every registered claim has exactly one tagged regression and no tag is unregistered', async () => {
  const claims = JSON.parse(await readFile(new URL('../.factory/claims.json', import.meta.url), 'utf8'));
  const sources = await Promise.all([
    readFile(new URL('../tests/e2e/product.spec.ts', import.meta.url), 'utf8'),
    readFile(new URL('./server.test.mjs', import.meta.url), 'utf8')
  ]);
  const tags = sources.join('\n').match(/@claim:[a-z0-9-]+/g) || [];
  const ids = claims.map((claim) => claim.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const claim of claims) {
    const tag = `@claim:${claim.id}`;
    assert.equal(tags.filter((candidate) => candidate === tag).length, 1, tag);
    assert.match(claim.test, new RegExp(tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
  assert.deepEqual([...new Set(tags.map((tag) => tag.slice('@claim:'.length)))].sort(), [...ids].sort());
});
