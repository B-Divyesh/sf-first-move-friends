# First Move Friends repair handoff

## Delivered

This repair adds the required product-owned online match service alongside the static browser game.

- `realtime/server.mjs` creates 128-bit opaque room codes and 256-bit opaque player keys, stores room state in SQLite under `/data`, expires rooms after two hours, and removes expired records.
- The service accepts two seats only, validates the player key, expected turn, legal cell, and optimistic state version before a move is saved. It pushes room updates over WebSocket and the browser also polls every two seconds, so a refreshed or briefly disconnected screen recovers the current board.
- Room creation and joining have per-client request allowances. Server integration coverage verifies code shape, expiry, seat limits, out-of-turn rejection, illegal-cell rejection, stale-version rejection, reconnect, and the room-creation allowance.
- The landing screen offers online play and same-screen play. The demo starts at move one, retains isolated `demo:` storage, and teaches all three opening turns.
- URL seeds are normalized to a plain ASCII token before use and are escaped at the render boundary. Saved games are replayed through the deterministic rules before recovery; malformed, incomplete, unknown-goal, altered-score, or impossible histories are discarded.
- All visible controls on landing, demo, privacy, and terms pages measure at least 44 by 44 CSS pixels in the desktop and 390-pixel checks. Escape closes Pause and returns focus to the Pause trigger.

## Regression evidence

The exact verifier seed reproduction is covered by `verifier reproduction: crafted setup seeds stay text and invalid saved state recovers` in `tests/e2e/product.spec.ts`. It opens both reported crafted seed forms, checks that only the application heading remains, checks that no external link is created, and checks that a malformed saved game returns to a playable board without a page error.

Every public product claim has one `@claim:` browser test that starts at the documented `/demo` sandbox. The two-player claim creates its room from the demo, then uses an independent browser context to verify synchronized authoritative turns, expiry, and reload recovery.

## Local verification

Run from a clean checkout:

```sh
npm ci
npm test
npm run build
```

Observed on 2 September 2026 UTC:

- `npm ci`: 59 packages installed; audit reported 0 vulnerabilities.
- `npm test`: 5 Vitest tests, 2 Node room-service integration tests, and 19 Playwright tests passed. Playwright includes desktop/390-pixel layouts, keyboard, touch, focus-return, the full claim manifest, offline demo reload, and axe serious/critical checks on all public routes.
- `npm run build`: passed and emitted `dist/`; production JS is 25.01 kB (8.94 kB gzip) and CSS is 17.11 kB (4.74 kB gzip).
- `verify-url.sh http://127.0.0.1:4173 test-results/verify-local`: passed with title, `lang=en`, one h1, a main landmark, no missing image alt text, no unlabeled buttons, and no console errors.
- The standalone `@axe-core/cli` command could not locate a system Chrome binary in this worker. The bundled Playwright `@axe-core/playwright` checks ran against Chromium instead and passed with no serious or critical findings.

## Deploy

Build and deploy the room service first, then deploy `dist/` to the static app:

```sh
/opt/fleet/lib/deploy-container.sh first-move-friends-realtime /work/repo realtime/Dockerfile 8080
/opt/fleet/lib/deploy-static.sh first-move-friends /work/repo/dist
```

The room service is configured for `https://first-move-friends-realtime.sociobot.in`; the static CSP permits only that product-owned HTTPS/WSS origin in addition to same-origin requests.

Deployment completed on 2 September 2026 UTC for commit `772ac33`:

- Container App: `sf-first-move-friends-realtime`, single-replica durable `/data` mount, live at `https://first-move-friends-realtime.sociobot.in`.
- Static Web App: `sf-first-move-friends`, live at `https://first-move-friends.sociobot.in`.
- Live API exercise created a 22-character opaque code, joined Moon, and saved Sun’s first authoritative move. A live Chromium host and independent guest browser both displayed one placed tile after that move.
- Live `verify-url.sh` passed at the static URL with no console errors. Response headers have the expected self/product-owned CSP, HSTS, nosniff, referrer policy, permissions policy, and no-store room responses.

## Known gaps

None. Online rooms require a live connection by design; the isolated saved demo remains available offline after its initial visit.
