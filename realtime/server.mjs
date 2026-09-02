import http from 'node:http';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { WebSocketServer } from 'ws';
import { activePlayer, createGame, legalCells, placeTile } from './game.mjs';

const port = Number(process.env.PORT || 4174);
const dataDir = process.env.DATA_DIR || '/data';
const ttlMs = Number(process.env.ROOM_TTL_MS || 2 * 60 * 60 * 1000);
const cleanupMs = Number(process.env.ROOM_CLEANUP_MS || 10 * 60 * 1000);
const rateWindowMs = Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000);
const maxBuckets = Math.max(10, Number(process.env.RATE_LIMIT_MAX_BUCKETS || 5_000));
const trustedProxyHops = Math.max(0, Number(process.env.TRUSTED_PROXY_HOPS || 0));
const buildId = process.env.BUILD_ID || 'development';
const allowedOrigins = new Set([
  'https://first-move-friends.sociobot.in',
  'http://127.0.0.1:4173',
  'http://localhost:4173'
]);
fs.mkdirSync(dataDir, { recursive: true });
const db = new DatabaseSync(`${dataDir}/rooms.sqlite`);
db.exec(`PRAGMA journal_mode=WAL;
  CREATE TABLE IF NOT EXISTS rooms (
    code TEXT PRIMARY KEY,
    host_hash TEXT NOT NULL,
    guest_hash TEXT,
    state_json TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS rooms_expiry ON rooms(expires_at);`);

const findRoom = db.prepare('SELECT * FROM rooms WHERE code = ?');
const insertRoom = db.prepare('INSERT INTO rooms(code, host_hash, state_json, created_at, updated_at, expires_at) VALUES (?, ?, ?, ?, ?, ?)');
const seatGuest = db.prepare('UPDATE rooms SET guest_hash = ?, updated_at = ? WHERE code = ? AND guest_hash IS NULL');
const updateState = db.prepare('UPDATE rooms SET state_json = ?, version = version + 1, updated_at = ? WHERE code = ? AND version = ?');
const deleteExpired = db.prepare('DELETE FROM rooms WHERE expires_at <= ?');
const clients = new Map();
const buckets = new Map();
let lastBucketSweep = 0;

function hash(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function sameSecret(value, digest) {
  if (!value || !digest) return false;
  const actual = Buffer.from(hash(value), 'hex');
  const expected = Buffer.from(digest, 'hex');
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

function code() {
  return crypto.randomBytes(16).toString('base64url');
}

function token() {
  return crypto.randomBytes(32).toString('base64url');
}

function originAllowed(origin) {
  return !origin || allowedOrigins.has(origin);
}

function headers(origin) {
  const result = {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'X-Build-Id': buildId,
    'Referrer-Policy': 'no-referrer',
    'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'"
  };
  if (originAllowed(origin) && origin) {
    result['Access-Control-Allow-Origin'] = origin;
    result.Vary = 'Origin';
    result['Access-Control-Allow-Headers'] = 'Authorization, Content-Type';
    result['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS';
  }
  return result;
}

function send(res, status, body, origin, extra = {}) {
  res.writeHead(status, { ...headers(origin), ...extra });
  res.end(JSON.stringify(body));
}

function clientIp(req) {
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',').map((value) => value.trim()).filter(Boolean);
  const ingressIdentity = trustedProxyHops > 0 && forwarded.length >= trustedProxyHops
    ? forwarded[forwarded.length - trustedProxyHops]
    : '';
  return (ingressIdentity || req.socket.remoteAddress || 'unknown').slice(0, 128);
}

function rateLimited(req, group, limit) {
  const now = Date.now();
  if (now - lastBucketSweep >= rateWindowMs) {
    for (const [bucketKey, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(bucketKey);
    }
    lastBucketSweep = now;
  }
  let key = `${group}:${clientIp(req)}`;
  if (!buckets.has(key) && buckets.size >= maxBuckets) {
    key = `${group}:overflow`;
    if (!buckets.has(key)) buckets.delete(buckets.keys().next().value);
  }
  const current = buckets.get(key);
  const bucket = !current || current.resetAt <= now ? { count: 0, resetAt: now + rateWindowMs } : current;
  bucket.count += 1;
  buckets.delete(key);
  buckets.set(key, bucket);
  return bucket.count > limit;
}

async function jsonBody(req) {
  let raw = '';
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 2048) throw new Error('too-large');
  }
  return raw ? JSON.parse(raw) : {};
}

function auth(req, room) {
  const supplied = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (sameSecret(supplied, room.host_hash)) return 'sun';
  if (sameSecret(supplied, room.guest_hash)) return 'moon';
  return null;
}

function publicRoom(room, seat) {
  return {
    code: room.code,
    seat,
    ready: Boolean(room.guest_hash),
    version: room.version,
    expiresAt: new Date(room.expires_at).toISOString(),
    state: JSON.parse(room.state_json)
  };
}

function checkedRoom(res, roomCode, origin) {
  if (!/^[A-Za-z0-9_-]{22}$/.test(roomCode)) {
    send(res, 404, { error: 'Room not found.' }, origin);
    return null;
  }
  const room = findRoom.get(roomCode);
  if (!room) {
    send(res, 404, { error: 'Room not found.' }, origin);
    return null;
  }
  if (room.expires_at <= Date.now()) {
    deleteExpired.run(Date.now());
    send(res, 410, { error: 'This room has expired. Start a new game.' }, origin);
    return null;
  }
  return room;
}

function broadcast(roomCode) {
  for (const socket of clients.get(roomCode) || []) {
    if (socket.readyState === socket.OPEN) socket.send(JSON.stringify({ type: 'room-updated' }));
  }
}

const server = http.createServer(async (req, res) => {
  const origin = String(req.headers.origin || '');
  if (!originAllowed(origin)) return send(res, 403, { error: 'Origin is not allowed.' }, '');
  if (req.method === 'OPTIONS') {
    res.writeHead(204, headers(origin));
    return res.end();
  }
  if (rateLimited(req, 'all', 180)) return send(res, 429, { error: 'Too many requests. Wait one minute.' }, origin, { 'Retry-After': '60' });
  const url = new URL(req.url || '/', 'http://localhost');
  if (req.method === 'GET' && url.pathname === '/') return send(res, 200, { service: 'First Move Friends room service', buildId }, origin);
  if (req.method === 'GET' && url.pathname === '/health') return send(res, 200, { ok: true, buildId }, origin);

  if (req.method === 'POST' && url.pathname === '/v1/rooms') {
    if (rateLimited(req, 'create', 6)) return send(res, 429, { error: 'Too many rooms created. Wait one minute.' }, origin, { 'Retry-After': '60' });
    const now = Date.now();
    let roomCode = code();
    while (findRoom.get(roomCode)) roomCode = code();
    const hostToken = token();
    const state = createGame(crypto.randomBytes(12).toString('hex'));
    insertRoom.run(roomCode, hash(hostToken), JSON.stringify(state), now, now, now + ttlMs);
    return send(res, 201, { ...publicRoom(findRoom.get(roomCode), 'sun'), token: hostToken }, origin);
  }

  const match = url.pathname.match(/^\/v1\/rooms\/([A-Za-z0-9_-]+)(?:\/(join|moves|rematch))?$/);
  if (!match) return send(res, 404, { error: 'Endpoint not found.' }, origin);
  const roomCode = match[1];
  const action = match[2];
  let room = checkedRoom(res, roomCode, origin);
  if (!room) return;

  if (req.method === 'POST' && action === 'join') {
    if (rateLimited(req, 'join', 20)) return send(res, 429, { error: 'Too many join attempts. Wait one minute.' }, origin, { 'Retry-After': '60' });
    if (room.guest_hash) return send(res, 409, { error: 'This room already has two players.' }, origin);
    const guestToken = token();
    seatGuest.run(hash(guestToken), Date.now(), roomCode);
    room = findRoom.get(roomCode);
    broadcast(roomCode);
    return send(res, 200, { ...publicRoom(room, 'moon'), token: guestToken }, origin);
  }

  const seat = auth(req, room);
  if (!seat) return send(res, 401, { error: 'This player key is not valid.' }, origin);
  if (req.method === 'GET' && !action) return send(res, 200, publicRoom(room, seat), origin);

  if (req.method === 'POST' && action === 'moves') {
    let body;
    try { body = await jsonBody(req); } catch { return send(res, 400, { error: 'Send one valid move.' }, origin); }
    const state = JSON.parse(room.state_json);
    if (!room.guest_hash) return send(res, 409, { error: 'Wait for Moon to join.' }, origin);
    if (body.version !== room.version) return send(res, 409, { error: 'The room changed. Refreshing the board.' }, origin);
    if (activePlayer(state) !== seat) return send(res, 409, { error: 'Wait for the other player.' }, origin);
    if (!Number.isInteger(body.cell) || !legalCells(state).includes(body.cell)) return send(res, 422, { error: 'Choose a marked cell.' }, origin);
    const next = placeTile(state, body.cell);
    const changed = updateState.run(JSON.stringify(next), Date.now(), roomCode, room.version);
    if (!changed.changes) return send(res, 409, { error: 'The room changed. Refreshing the board.' }, origin);
    room = findRoom.get(roomCode);
    broadcast(roomCode);
    return send(res, 200, publicRoom(room, seat), origin);
  }

  if (req.method === 'POST' && action === 'rematch') {
    const state = JSON.parse(room.state_json);
    if (seat !== 'sun') return send(res, 403, { error: 'Sun starts the rematch.' }, origin);
    if (state.status !== 'finished') return send(res, 409, { error: 'Finish this match before a rematch.' }, origin);
    const next = createGame(state.seed, state.rematch + 1);
    updateState.run(JSON.stringify(next), Date.now(), roomCode, room.version);
    room = findRoom.get(roomCode);
    broadcast(roomCode);
    return send(res, 200, publicRoom(room, seat), origin);
  }
  return send(res, 405, { error: 'Method not allowed.' }, origin);
});

const sockets = new WebSocketServer({ noServer: true });
server.on('upgrade', (req, socket, head) => {
  const origin = String(req.headers.origin || '');
  const url = new URL(req.url || '/', 'http://localhost');
  const match = url.pathname.match(/^\/v1\/rooms\/([A-Za-z0-9_-]+)\/events$/);
  const room = match && findRoom.get(match[1]);
  const supplied = url.searchParams.get('token') || '';
  if (!originAllowed(origin) || !room || room.expires_at <= Date.now() || (!sameSecret(supplied, room.host_hash) && !sameSecret(supplied, room.guest_hash))) {
    socket.write('HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n');
    return socket.destroy();
  }
  sockets.handleUpgrade(req, socket, head, (ws) => {
    const set = clients.get(room.code) || new Set();
    set.add(ws);
    clients.set(room.code, set);
    ws.on('close', () => {
      set.delete(ws);
      if (!set.size) clients.delete(room.code);
    });
    ws.send(JSON.stringify({ type: 'connected' }));
  });
});

setInterval(() => deleteExpired.run(Date.now()), cleanupMs).unref();
server.listen(port, '0.0.0.0', () => console.log(`First Move Friends room service listening on ${port}`));

function shutdown() {
  sockets.close();
  server.close(() => { db.close(); process.exit(0); });
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
