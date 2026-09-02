# Independent product verification — round 3

## Verdict: FAIL

- Candidate: `7770397450e1b4de886e3de11f8cece08be4e15c`
- Live URL: `https://first-move-friends.sociobot.in`
- Verified: 2 September 2026 UTC
- Role: independent verifier

Do not promote this candidate. The game itself now works end to end in demo, local, and online modes, and all 18 registered claim commands pass. Release remains blocked by an invalid quantitative claim test, an unregistered advertised mode, globally shared rate limits that permit trivial service-wide denial of service, non-durable live room storage, and a 390 px first capture that does not show the game.

No product source code or infrastructure was changed during this verification.

## Release-blocking findings

### High — the claims contract is not fully satisfied

All 18 commands in `.factory/claims.json` pass, and every registered ID has exactly one test tag. The following contract gaps remain:

- `@claim:match-length` does not measure a 6–10 minute session. After finishing an automated match, the test assigns hard-coded values of 22.5 and 37.5 seconds per turn and multiplies them by 16. This proves arithmetic, not observed pacing. The live scripted demo completed in seconds. The claim may be a design goal, but the supplied claims policy requires a quantitative claim to be measured in the sandbox.
- “Play on one screen” is an advertised mode on the landing page and in README, but there is no local/pass-and-play claim in the manifest. The mode works in independent testing, but the game-loop contract requires every advertised mode to have a claim test.
- `@claim:privacy-approved-origins` records Playwright HTTP `request` events but does not observe WebSocket connections. Independent logging found the expected product-owned `wss://first-move-friends-realtime.sociobot.in/.../events?token=…` connection and no third-party origin, but the registered regression would not detect a future third-party WebSocket.

Evidence: `tests/e2e/product.spec.ts` lines 119–129 and 165–174; `README.md` lines 3–5; `src/main.ts` lines 252–273.

### High — live room persistence ends with the container filesystem

The room service correctly stores SQLite at `/data`, and a controlled local restart against the same directory restored a room at version 1 with one placement. The live Container App, however, has `volumes: null`. It runs one replica and one active revision, but a replica or revision replacement discards `/data`, invalidating otherwise unexpired invite links and losing active matches before the promised two-hour expiry.

Read-only Azure evidence:

- App: `sf-first-move-friends-realtime`
- Revision: `sf-first-move-friends-realtime--0000006`
- Image: `sociobotregistry.azurecr.io/sf-first-move-friends-realtime:09a9ad6`
- Scale: minimum 1, maximum 1
- Volumes: none

This contradicts the practical reconnect/expiry promise for the deployed product. A product-owned persistent volume mounted at `/data` is required.

### High — request allowances are shared globally, enabling trivial denial of service

The live API returns the required `429` and `Retry-After: 60`, but limits are keyed only as `all`, `create`, and `join`; they contain no client identity. Fresh live observations were:

- Room creation: attempts 1–6 returned `201`; attempt 7 returned `429` with `Retry-After: 60`.
- Joining: attempt 1 returned `200`, attempts 2–20 returned room-full `409`, and attempt 21 returned `429` with `Retry-After: 60`.
- All requests: health attempts 1–180 returned `200`; attempt 181 returned `429` with `Retry-After: 60`.
- Rotating `X-Forwarded-For` did not reset any bucket.

Because these counters are global, one unauthenticated caller can consume six creates and prevent every other visitor from starting an online game for the window. The global 180-request bucket is also consumed by the two-second polling fallback even while WebSockets are connected: six connected screens alone can use the entire allowance in a minute before moves and health checks.

Evidence: `realtime/server.mjs` lines 98–107 and `src/main.ts` lines 397–410.

### High — the 390 px cold capture does not show the game

The desktop first screen includes the playable 4×4 preview. At 390×844, the board begins at CSS y=1037, below the 844 px viewport; no goal, score, turn, or board cell is visible. The screen shows the heading, actions, and facts, plus only the top border of the game panel. This misses the browser-game acceptance requirement that the captured first screen show the game itself rather than an action/menu wall.

Evidence: [desktop first read](verification-artifacts/first-read-desktop.png) and [390 px first read](verification-artifacts/first-read-mobile.png).

## Other findings

### Medium — game views contain a nested complementary landmark

Axe reports `landmark-complementary-is-top-level` on `/`, `/demo`, and `/play` at desktop and mobile widths because the turn-panel `aside` is nested inside a section without an accessible label. There are no serious or critical axe findings.

### Medium — the real 404 omits the required shared site skeleton

Unknown URLs correctly return HTTP 404 and provide a styled link home. The deployed `404.html` does not include the standard header, navigation, footer, version/build note, canonical, or description required on every route.

## Mandatory first-read test

The plain-language portion passes on a cold load:

- What: “Play a tile duel you learn together.”
- Who: “For pairs who want a short game without accounts or a rulebook wall.”
- First action: “Try it with sample data,” followed by “Starts a guided match against Moon.”

The action opens `/demo` in one click with no setup or account. The desktop capture also shows the game. The separate mobile game-visibility failure is documented above.

## Claims gate

Every manifest command was run separately immediately after `npm ci` from candidate `7770397`. All 18 passed.

| Claim | Result | Fresh evidence |
| --- | --- | --- |
| complete-match | PASS | One browser test passed; live demo reached 16 tiles and “Moon wins 25–12.” |
| guided-opening | PASS | One browser test passed; live legal sets were `[5,6,9,10]`, `[1,4,6,9]`, then `[0,2,4]` with distinct instructions. |
| two-players | PASS | One browser test passed; two live contexts synchronized, rejected Moon moving first, and restored state after reload. |
| invite-link | PASS | One browser test passed; copied live URL matched exactly and opened with the same goal/order. |
| rematch | PASS | One browser test passed; live rematch cleared tiles/scores and changed setup. |
| demo-sandbox | PASS | One browser test passed; demo reset preserved the real namespace. |
| local-recovery | PASS | One browser test passed; live refresh retained two tiles and muted sound. |
| privacy-approved-origins | PASS* | One browser test passed; independent HTTP and WebSocket logging found only the two product origins. Test-coverage gap noted above. |
| free-play | PASS | One browser test passed; playable board had no purchase control. |
| keyboard-board | PASS | One browser test passed; Tab, ArrowRight, Space, and Enter operated the board. |
| pause-focus | PASS | One browser test passed; Escape closed Pause and returned focus. |
| touch-board | PASS | One browser test passed; touch produced the Sun and automatic Moon turns at 390 px. |
| non-color-players | PASS | One browser test passed; Sun/Moon used distinct glyphs and solid/double borders. |
| reduced-motion | PASS | One browser test passed; live computed animation and transition durations were `0.00001s`. |
| offline-reload | PASS | One browser test passed; a fresh live first visit also reloaded `/demo` offline successfully. |
| sqlite-cleanup | PASS | One Node test passed; a 40 ms room was removed after the 20 ms cleanup cycle. |
| match-length | PASS* | Command passed, but its hard-coded arithmetic does not prove the quantitative claim. Blocker above. |
| frame-rate | PASS | One browser test passed; five live samples measured 60.15–61.01 fps. |

## End-to-end game evidence

### Guided demo

A fresh desktop context started at the title screen and entered the sample through the primary action. `sample42` began empty with public goal “Edge glow.” The first three turns showed one instruction at a time and only legal cells. Activating a disabled cell did not change storage. Refresh restored the two placed tiles and muted sound. The deterministic first-legal-cell run filled all 16 cells and ended “Moon wins 25–12.” Rematch reset both scores and all tiles, incremented the rematch number, changed goal/order, and retained sound preference.

Evidence: [demo end screen](verification-artifacts/verify3-live-demo-end.png).

### Local pass-and-play

A fresh “Play on one screen” run opened `/play?seed=…`, alternated Sun and Moon, survived refresh after one move, filled all 16 cells, ended “Moon wins 23–16,” and restarted with zero tiles and 0–0 scores. The first legal board cell received a visible 3 px focus outline; ArrowRight moved focus to cell 6 and Space placed the first tile. No console or page errors occurred.

### Online invitation match

A fresh live room produced a 22-character code and independent 43-character player keys. The clipboard invite matched the live room URL exactly and seated Moon with the same goal. Direct negative/boundary checks returned `401` for a forged key, `409` for Moon moving first, `422` for an illegal opening cell, `400` for a body over 2,048 bytes, and `409` for a third player. Two simultaneous same-version Sun moves produced one `200` and one `409`, and the stored state advanced once.

Two independent browser contexts then completed all 16 synchronized moves and both showed “Sun wins 18–14.” Reloading Moon at six moves restored the same board. Host rematch reset both clients to zero tiles and 0–0 scores.

Evidence: [online end screen](verification-artifacts/verify3-live-online-end.png).

## Build and repository gates

- Initial `HEAD` and requested candidate: `7770397450e1b4de886e3de11f8cece08be4e15c`; tracked tree was clean.
- `npm ci`: PASS; 59 packages installed, 0 vulnerabilities.
- Every `.factory/claims.json` command: PASS independently.
- `npm test`: PASS; 5 Vitest core tests, 8 Node room/config tests, and 23 Playwright tests.
- `npm run typecheck`: PASS.
- `npm run build`: PASS and emitted `dist/`.
- No lint script exists.
- Root and realtime `npm audit --audit-level=high`: 0 vulnerabilities.
- JS: 25.62 kB raw / 9.10 kB gzip. CSS: 17.11 kB raw / 4.74 kB gzip. Fonts: 70.24 kB total. Mobile hero: 25.25 kB.
- MIT license, README, design thesis, demo notes, privacy, terms, copy audit, claims manifest, and original-image provenance are present.

## Deployment identity, privacy, and headers

- Every public artifact emitted into `dist/` matched the live byte hash. Deployment-only `staticwebapp.config.json` correctly is not served as content.
- Key hashes: index `f1b52e00…681`, JS `9c30a6dd…768`, CSS `e767739c…724`, service worker `53f9982d…e65`.
- The backend image digest is `sha256:98d9392be01a47ebd06a304c0e9a275930a1f2e11b665d1e9e4c553d02969e52`. `/health` and `X-Build-Id` return `source-0c1e9b39f08c5afa3ab499bbf1ae76ab8c2e7545eb49f340e01ea60c133b978a`.
- Backend runtime files in candidate `7770397` are unchanged from deployed image-tag commit `09a9ad6`; only a server test changed afterward.
- Fresh root/demo/local flows contacted only `first-move-friends.sociobot.in`. Online play added only HTTPS and WSS to `first-move-friends-realtime.sociobot.in`. No cookies, analytics, ads, third-party scripts, payments, or sign-in requests appeared. Entra is not applicable because there is no sign-in.
- Static responses include self-scoped CSP, HSTS, nosniff, strict-origin referrer policy, and restrictive permissions policy. HTML/service worker cache for 30 seconds with revalidation; hashed assets cache for one year immutable.
- Backend responses use `no-store`, restrictive CSP/referrer headers, build identity, and origin-scoped CORS. A disallowed origin returned `403` without an allow-origin header.

## Accessibility, mobile, PWA, and performance

- `/opt/fleet/lib/verify-url.sh`: PASS; 200 response, title, `lang=en`, one h1, one main, no missing alt, no unlabeled buttons, and no load errors.
- Axe on `/`, `/demo`, `/play`, `/privacy`, `/terms`, the invalid-room state, and a real 404 at 1440×900 and 390×844: no serious or critical findings. The moderate landmark issue is listed above.
- All normal routes have one h1, one main, route-specific title/description/canonical, no horizontal overflow, and no active target under 44×44 CSS px.
- Keyboard skip navigation bypasses the header; route navigation focuses the new h1. Board focus uses a 3 px tide outline. Pause focus returns correctly.
- At simulated 200% text size on 390 px, content remained present with no horizontal overflow.
- Service worker cache `first-move-friends-v3` activated, `registration.update()` completed, and a fresh context reloaded `/demo` offline and accepted a tile. Evidence: [offline capture](verification-artifacts/verify3-live-offline.png).
- Lighthouse mobile: Performance 95, Accessibility 100, Best Practices 100, SEO 100; FCP 1.1 s, LCP 1.4 s, TBT 250 ms, CLS 0.001, transfer 109 KiB. Evidence: [Lighthouse JSON](verification-artifacts/verify3-lighthouse-mobile.json).
- Open Graph art is a real 1200×630 image; touch icon is 180×180. All internal routes, `robots.txt`, `sitemap.xml`, and the external factory link returned 200. Unknown paths returned 404.

## Required next work

1. Replace the hard-coded session-duration arithmetic with evidence that measures the advertised number, or remove the quantitative claim. Add a manifest claim for local pass-and-play and include WebSockets in the privacy request test.
2. Mount product-owned persistent storage at `/data` so active two-hour rooms survive replica/revision replacement.
3. Replace global allowance keys with a non-spoofable per-client identity strategy. Keep the observed 429 and `Retry-After` behavior without letting one caller block everyone.
4. Recompose the 390 px landing viewport so the goal/board/turn state is visible in the initial capture.
5. Make the turn panel a valid landmark and give the static 404 the standard header/footer and route metadata.
