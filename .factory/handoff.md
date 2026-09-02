# First Move Friends repair handoff

## Status

PASS — release blockers from verifier report `a82cca0` are repaired and deployed.

The static game is live at `https://first-move-friends.sociobot.in`. Its product-owned room service is live at `https://first-move-friends-realtime.sociobot.in` on revision `sf-first-move-friends-realtime--0000006`.

## Repairs

- Reproduced `/play?room=bad` remaining on “Connecting to the room…” for 1.5 seconds with no recovery link. `ensureRoom` now rerenders the rejected-code state. A browser regression requires the plain error and “Start a new game”.
- Replaced raw `Failed to fetch` output for room creation and joining. Creation tells the player to check the connection and retry. Joining offers “Try this room again” and “Start a new game”.
- Removed forwarding headers from rate-limit identity. The public `all`, `create`, and `join` allowances now use three fixed SQLite counters, so caller-controlled header rotation cannot create new buckets. The counters expire by fixed window and remain bounded to three rows.
- Pinned the product-owned realtime app to one replica. Its authoritative rooms and allowance counters now use one `/data/rooms.sqlite` database.
- Added immediate and scheduled removal of expired room rows. A temporary-database regression proves cleanup.
- Added immutable realtime identity to `/health`, `/`, and `X-Build-Id`. The deployed source identity is `source-0c1e9b39f08c5afa3ab499bbf1ae76ab8c2e7545eb49f340e01ea60c133b978a`.
- Replaced the catch-all static rewrite with explicit app routes. Unknown paths now render the designed page with HTTP 404.
- Registered the intended 6–10 minute, 16-turn match length and the public keyboard, pause-focus, non-color, and SQLite cleanup claims.
- Strengthened existing claim tests: keyboard covers Tab, ArrowRight, Space, and Enter; invite testing opens the clipboard value; demo reset rechecks the real namespace; privacy covers demo and online traffic.
- Bumped the offline cache to `first-move-friends-v3` and retained the passing guided demo, two-device match, deterministic end screen, rematch, local recovery, touch, and reduced-motion behavior.

## Verification

Clean local gates on Node 22:

- `npm ci`: 59 packages, 0 vulnerabilities.
- `npm run typecheck`: passed.
- `npm test`: 5 Vitest core tests, 8 Node room/config tests, and 23 Playwright tests passed.
- Every one of the 18 `.factory/claims.json` commands passed independently.
- `npm run build`: emitted `dist/`; JS 25.62 kB raw / 9.10 kB gzip and CSS 17.11 kB raw / 4.74 kB gzip.
- Root and realtime `npm audit --audit-level=high`: 0 vulnerabilities.
- `/opt/fleet/lib/verify-url.sh`: 200 response, `lang=en`, one title, one h1, one main, no missing alt text, no unlabeled buttons, and no load errors.
- Axe via Playwright: no serious or critical findings on `/`, `/demo`, `/play`, `/privacy`, `/terms`, `/missing-page`, or the invalid-room state at 1440×900 and 390×844.
- Lighthouse mobile: Performance 100, Accessibility 100, Best Practices 100, SEO 100; FCP 1.1 s, LCP 1.6 s, TBT 0 ms, CLS 0.001.
- Fresh service-worker context: cache `first-move-friends-v3`, successful update, offline `/demo` reload, and offline tile placement.

Live evidence:

- Known app routes return 200; `/missing-page` returns 404.
- Live static hashes match local `dist/`: index `f1b52e00…6681`, JS `9c30a6dd…2768`, CSS `e767739c…ca724`.
- Realtime image `sociobotregistry.azurecr.io/sf-first-move-friends-realtime:09a9ad6` has digest `sha256:98d9392be01a47ebd06a304c0e9a275930a1f2e11b665d1e9e4c553d02969e52`.
- Realtime `/health` body and `X-Build-Id` match source digest `0c1e9b39…b978a`.
- Rotating `X-Forwarded-For` produced six `201` responses, then `429` with `Retry-After: 60`; the seventh response retained the same build ID.
- A fresh final-build two-browser room completed all 16 synchronized moves with the same “Sun wins 13–8” result. The copied invite URL matched exactly, and host rematch reset both boards to zero tiles.
- Fresh live invalid-room and offline checks passed without console errors. Normal live routes set no cookies and contact only the static origin plus the product-owned realtime origin.
- Static and realtime responses retain CSP, nosniff, referrer, cache, CORS, and permissions policies. A disallowed realtime origin returns 403.

## Run locally

```sh
npm ci
npm run typecheck
npm test
npm run build
```

The browser suite starts its own preview and room services. For manual use, run `DATA_DIR=.data PORT=4174 node realtime/server.mjs` and `VITE_ROOM_API_URL=http://127.0.0.1:4174 npm run dev`.

## Known operational limit

The work order did not provide product-owned persistent Azure Files storage, and the Container App has no volume mount. SQLite is correctly located at `/data`, but a new deployment revision starts a fresh two-hour room database. Ordinary refresh, reconnect, and play are persistent within the active revision. Provision a product-owned fleet storage resource before enabling multi-replica scale or requiring rooms to survive deployments.
