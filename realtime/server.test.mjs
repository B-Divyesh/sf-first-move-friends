import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import test from 'node:test';

const origin = 'http://127.0.0.1:4173';

async function startServer(extra = {}) {
  const dataDir = await mkdtemp(path.join(tmpdir(), 'fmf-rooms-'));
  const port = String(4200 + Math.floor(Math.random() * 500));
  const child = spawn(process.execPath, ['server.mjs'], {
    cwd: new URL('.', import.meta.url),
    env: { ...process.env, DATA_DIR: dataDir, PORT: port, ...extra },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  const base = `http://127.0.0.1:${port}`;
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      if ((await fetch(`${base}/health`)).ok) return { child, base };
    } catch {}
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

test('room creation is rate limited', async (t) => {
  const { child, base } = await startServer();
  t.after(() => child.kill('SIGTERM'));
  const statuses = [];
  for (let count = 0; count < 7; count += 1) {
    statuses.push((await request(base, '/v1/rooms', { method: 'POST', body: {}, ip: '203.0.113.44' })).response.status);
  }
  assert.deepEqual(statuses, [201, 201, 201, 201, 201, 201, 429]);
});
