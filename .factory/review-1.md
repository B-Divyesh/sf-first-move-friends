# Review a guided two-player tile game — review 1

## Verdict: PASS

- Finding count: **0**
- Untested claim count: **0**
- Reviewed 5 September 2026 UTC
- Live URL: <https://first-move-friends.sociobot.in>
- Implementation reviewed: `7561e61b1ff06b5ac2c940afe255e375aee82055`
- Unchanged room-service implementation: `994d00f16359c86470add1b9a64d4148fd65de72`
- Documentation and prior verification candidate reviewed: `d76c194de218137243b3b4e0985f20ead352999f`

This independent review passes. There are zero findings at every severity and zero untested public claims. No product code or service configuration changed during this review.

## First screen

Fresh desktop (1440×900) and phone (390×844) browser contexts opened the live home at scroll position zero.

- Job: “Play a tile duel you learn together.”
- Audience: pairs who want a short game without accounts or a rulebook wall.
- First action: “Try it with sample data,” which starts a guided match against Moon in one click.
- The game itself, public goal, scores, turn count, and full board were visible before scrolling on the phone. The board ended at 840.3 px in the 844 px viewport.

## Demo and game runs

- The one-click `/demo` sample showed the persistent “Demo — sample data” label, began at the empty guided opening, and displayed populated game output after play. Reset demo returned it to zero tiles and preserved separately seeded `real:` local values.
- A fresh local pass-and-play game restored one placed lantern after refresh, completed all 16 placements, showed “Moon wins 24–16,” and rematched to an empty board.
- Two independent fresh browser contexts created and joined a real online room, synchronized all 16 alternating placements through the product-owned WebSocket service, showed “Moon wins 24–16” on both end screens, and rematched to an empty board.
- Keyboard Tab, ArrowRight, Space, and Enter operated the board. Phone touch input worked at 390 px. Reduced motion, 200% text resize, non-color player marks, pause-focus return, offline demo reload, invalid invite recovery, and room-service outage recovery passed.
- Fresh request logs contained only the static product origin, the product-owned room-service HTTPS origin, and the product-owned room-service WSS origin. There were no accounts, ads, analytics, chat, payment, or third-party runtime requests.

## Backend and routes

- `GET /health` returned 200 and build id `994d00f16359c86470add1b9a64d4148fd65de72`, matching the unchanged room-service implementation.
- Live room isolation was checked by creating two temporary rooms and attempting to read the second with the first room’s player key; the response was 401.
- A live creation allowance boundary returned six 201 responses followed by 429 with `Retry-After: 60`. The temporary review rooms expire normally.
- Privacy, Terms, `/404.html`, and an unknown route passed axe with zero violations. The unknown route deliberately returned HTTP 404, rendered the direct heading “Page not found,” and retained the header, navigation, main area, footer, and route home.
- The live URL check passed: HTTP 200, title, `lang=en`, one h1, one main, complete image alt text, labelled buttons, and no console errors.

## Clean checkout and claims

From a clean clone of the documentation candidate, these commands all passed:

```sh
npm ci
(cd realtime && npm ci)
npm audit --audit-level=high
(cd realtime && npm audit --audit-level=high)
npm run lint
npm run typecheck
npm test
npm run build
```

- Both audits found zero vulnerabilities.
- `npm test` passed 5 deterministic core tests, 9 room-service tests, and 26 browser tests.
- The production build emitted `dist/`: JavaScript 26.72 kB raw / 9.42 kB gzip and CSS 17.99 kB raw / 4.97 kB gzip.
- Each of the 21 exact commands in `.factory/claims.json` was run separately from that clean setup. All passed, including the 6–10 minute paced match, two-client invitation play, restart persistence against the same SQLite directory, expiry cleanup, client-isolated rate allowances, offline reload, and desktop Chromium frame rate. No declared claim is untested.
- A fresh production build exactly matched the live static runtime: `index.html` SHA-256 `4d8aa80da539d36292a0a2e1f6f41e71acbd5aa82de8c5254f36516cfe3e2203`, JavaScript `assets/index-COEcEAAP.js` SHA-256 `3621a2adf991d69c3bfe18430da75900146458186a41598a174d2cad941243ca`, and CSS `assets/index-BPDDykin.css` SHA-256 `853b2e2f9af7228badc732afc64733ef74780a627d7a700b55071a30b0a141eb`.

## Earlier findings

All findings in verification rounds 1–4 remain fixed: real online invitation play; safe saved-state and seed recovery; empty guided demo isolation; 44 px targets; pause focus return; invalid invite and outage recovery; complete registered claims; measured match length; WebSocket privacy checking; client-isolated allowances; durable room restart; phone first-screen game visibility; valid landmarks; and the direct, structured 404 page. The prior round-4 minor finding about the metaphorical 404 heading is fixed in both the static and SPA paths.

## Evidence

Fresh screenshots and machine-readable live evidence are in `.factory/repair-artifacts/` in the clean verification checkout. This report is copied to `/work/.evidence/qa-report.md`; the matching `/work/.evidence/qa-result.json` records `PASS`, zero findings, and zero untested claims.
