# Verify a guided two-player tile game — round 5

## Verdict: PASS

- Finding count: **0**
- Untested claim count: **0**
- Live URL: <https://first-move-friends.sociobot.in>
- Verified: 5 September 2026 UTC
- Implementation reviewed: `7561e61b1ff06b5ac2c940afe255e375aee82055`
- Unchanged deployed room-service build: `994d00f16359c86470add1b9a64d4148fd65de72`
- Documentation and evidence commit: `452e451a25691fdf14829466eb6e66d91400293f`

This candidate passes independent verification. There are no findings at any severity and no untested public claims. No product code or service configuration was changed during this review.

## First screen

Fresh desktop (1440×900) and phone (390×844) contexts opened the live home at scroll position zero.

- Job: **“Play a tile duel you learn together.”**
- Audience: pairs who want a short game without accounts or a rulebook wall.
- First action: **“Try it with sample data,”** which starts a guided match against Moon in one click.
- The game, public goal, scores, turn count, and full board appeared before scrolling on phone; the board ended at 840.3 px in the 844 px viewport.

## Live product run

- A fresh demo had the persistent “Demo — sample data” label. It began empty at the first teaching move, placed two tiles, then Reset demo returned it to zero tiles while preserved `real:` game and timing values remained unchanged.
- A complete local pass-and-play match restored after refresh, placed all 16 lanterns, reached “Moon wins 24–16,” and rematched to an empty board.
- Two independent fresh browser contexts created and joined a real room, synchronized all 16 alternating placements through the product-owned WebSocket service, reached “Moon wins 24–16” on both clients, and rematched to an empty board.
- Keyboard Tab, ArrowRight, Space, and Enter operated the board. The phone touch flow passed. At 200% text size there was no horizontal overflow. Reduced-motion, focus-return, non-color player cues, and offline demo reload were covered by the independent browser regressions and live verification.
- The live offline demo reloaded under service-worker control, showed its offline state, and accepted a placement.
- Invalid invite `/play?room=bad` displayed “This invite link is not valid” and “Start a new game.” A simulated room-service outage displayed “The online room could not be created. Check your connection and try again.” and restored the enabled action.
- Privacy and Terms, static `/404.html`, and an unknown route passed axe with zero violations. Both 404 paths used the direct heading “Page not found.” The unknown route correctly returned HTTP 404; this is expected behavior, not a defect.

## Clean checkout and claims

From the clean documentation candidate checkout, the following all passed:

```sh
npm ci
npm audit --audit-level=high
(cd realtime && npm ci && npm audit --audit-level=high)
npm run lint
npm run typecheck
npm test
npm run build
```

- Both audits reported zero vulnerabilities.
- `npm test` passed 5 deterministic core tests, 9 room/config integration tests, and 26 browser tests in 7.1 minutes.
- `npm run build` emitted `dist/`.
- Every one of the 21 exact commands declared in `.factory/claims.json` was executed separately and passed. This included the 6.2-minute measured 6–10 minute match claim, restart persistence against the same SQLite directory, SQLite expiry cleanup, client-isolated allowances, offline reload, two-client invitation play, and desktop Chromium frame rate.
- The registered-tag parity test passed; all public behavior claims reviewed in the landing copy, README, privacy copy, and metadata have a corresponding declared claim.

## Live service, privacy, and accessibility

- `GET /health` returned 200 with build id `994d00f16359c86470add1b9a64d4148fd65de72`, matching the unchanged room-service implementation recorded in the handoff.
- A fresh production `npm run build` matched the live `index.html` and `assets/index-COEcEAAP.js` SHA-256 values, confirming that the deployed static runtime is the reviewed implementation.
- A live create allowance boundary produced six `201` responses, followed by `429` with `Retry-After: 60` on the seventh. The test created only short-lived product test rooms.
- Live online traffic used only `https://first-move-friends.sociobot.in`, `https://first-move-friends-realtime.sociobot.in`, and `wss://first-move-friends-realtime.sociobot.in`; no third-party runtime origin appeared.
- `verify-url.sh` passed when given its required evidence directory. It found a 200 home response, title, `lang=en`, one h1, main landmark, complete image alt text, no unlabeled buttons, and no console errors.
- The live Playwright axe checks found zero violations on the phone home, Privacy, Terms, static 404, and unknown-route 404. The mobile first-screen test, 200% text check, keyboard path, local and remote complete matches, offline reload, and no-console-error checks all passed.

## Earlier findings disposition

| Earlier finding | Current disposition |
| --- | --- |
| Missing real invitation play | Fixed; two independent live clients completed, synchronized, and rematched a real room. |
| Unsafe setup rendering or malformed saved state | Fixed; recovery and escaping regressions pass. |
| Demo skipped guided opening or touched real storage | Fixed; the live empty sample teaches the opening and reset preserved `real:` values. |
| Small targets, lost pause focus, mobile game below the fold | Fixed; browser and live mobile checks pass, with board bottom at 840.3 px. |
| Invalid invite or service-outage recovery | Fixed; live checks showed specific error text and recovery controls. |
| Missing, incomplete, or untested claims | Fixed; all 21 registered commands passed separately and tag parity passed. |
| Privacy check missed WebSockets | Fixed; live traffic recorded only the two product-owned HTTPS origins and product-owned WSS origin. |
| Global allowances or no durable restart recovery | Fixed; isolated-client and same-data-directory restart claims pass; live boundary returns 429 and Retry-After. |
| Nested landmark, incomplete 404, or metaphorical 404 heading | Fixed; axe is clean, the 404 has the shared skeleton, returns HTTP 404 for unknown paths, and reads “Page not found.” |

## Evidence

Fresh live evidence is in `.factory/repair-artifacts/live-verification.json` and its desktop, phone, local-end, online-end, and offline screenshots. URL-verifier output is in `/work/.evidence/verify-url-5/`. This report is also copied to `/work/.evidence/qa-report.md`; its matching machine-readable result is `/work/.evidence/qa-result.json`.
