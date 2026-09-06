# Review playing a guided two-player tile game — review 2

## Verdict: PASS

- Finding count: **0**
- Untested claim count: **0**
- Reviewed: 6 September 2026 UTC
- Live URL: <https://first-move-friends.sociobot.in>
- Static implementation reviewed: `7561e61b1ff06b5ac2c940afe255e375aee82055`
- Room-service implementation reviewed: `994d00f16359c86470add1b9a64d4148fd65de72`
- Documentation candidate reviewed: `d7e94461f678c65e67f8a9c49cf299a33f2e3079`

**PASS.** This review has zero findings at every severity and zero untested public claims. No product code or service configuration changed during this review.

## First screen

Fresh live desktop (1440×900) and phone (390×844) browser contexts opened at scroll position zero.

- Job: “Play a tile duel you learn together.”
- Audience: pairs who want a short game without accounts or a rulebook wall.
- First action: “Try it with sample data,” which starts a guided match against Moon.
- The phone screen showed the public goal, scores, turn count, and full board before scrolling. The board ended at 840.3 px in the 844 px viewport.

## Live game and recovery checks

- The one-click `/demo` sample showed the persistent “Demo — sample data” label. It began from the empty guided opening, produced two placed tiles after the first touch action, and Reset demo returned to zero tiles without changing a seeded `real:` value. Sound changed to “Sound off” and stayed that way after reload.
- A fresh local pass-and-play run restored one placement after refresh, filled all 16 cells, reached the actual end screen “Moon wins 24–16,” and rematched to an empty board.
- Two independent fresh live clients created and joined a real online room, synchronized all 16 alternating moves, reached “Sun wins 16–12” on the end screen, and rematched to an empty board. The run used only the product static origin, its HTTPS room service, and its product-owned WSS room service.
- Keyboard Tab, ArrowRight, Space, and Enter operated the board. A fresh 390×844 touch context placed the Sun and automatic Moon turns. Reduced motion measured a `0.00001s` game-stage transition.
- A saved demo reloaded offline after service-worker control, displayed its offline notice, and accepted another placement. Invalid `/play?room=bad` displayed “This invite link is not valid.” and a “Start a new game” recovery link. A controlled room-service outage showed specific create and reconnect errors with working retry actions.

## Backend, privacy, routes, and accessibility

- `GET /health` returned 200 with `x-build-id` and body build id `994d00f16359c86470add1b9a64d4148fd65de72`, matching the reviewed room-service implementation.
- Tenant isolation passed: two temporary product rooms were created and a player key from the first received 401 when reading the second. A live room-create boundary returned 201 six times, then 429 with `Retry-After: 60` on the seventh.
- The room-service restart, expiry cleanup, and client-isolated allowance behaviors each passed their declared SQLite/server claim command against a temporary product data directory.
- `npm run verify:live` passed with no console or page errors. Its axe checks reported zero violations for phone home, Privacy, Terms, static 404, and an unknown route. Its 200% text check passed.
- `/opt/fleet/lib/verify-url.sh` passed against live home: HTTP 200, title “First Move Friends — Play a guided tile duel,” `lang=en`, one h1, main landmark, no missing alt text, no unlabeled buttons, and no browser errors.
- The deliberate unknown route returned HTTP 404, rendered “Page not found,” and retained header, navigation, main, footer, and a route home. This expected 404 is not a defect.
- Fresh online request logs contained only `https://first-move-friends.sociobot.in`, `https://first-move-friends-realtime.sociobot.in`, and `wss://first-move-friends-realtime.sociobot.in`. No account, analytics, advertising, chat, payment, or third-party runtime request appeared.

## Clean checkout and claims

From clean commit `d7e94461`, the root and realtime `npm ci`, high-severity audits, lint, typecheck, `npm test`, and production build all passed.

- Both audits reported zero vulnerabilities.
- `npm test` passed 5 deterministic core tests, 9 room-service tests, and 26 browser tests. The full browser suite includes the paced match-duration run.
- `npm run build` emitted `dist/`: JavaScript 26.72 kB raw / 9.42 kB gzip and CSS 17.99 kB raw / 4.97 kB gzip.
- Each exact command from all 21 entries in `.factory/claims.json` was then run separately. All passed. The measured `match-length` command took 6.3 minutes; no duration was computed from a fixed value.
- The claim-tag parity test passed. A landing, README, legal-copy, metadata, and copy-audit cross-check found the public behavior claims represented by the declared claim set.
- A final production build matched live byte-for-byte: `index.html` SHA-256 `4d8aa80da539d36292a0a2e1f6f41e71acbd5aa82de8c5254f36516cfe3e2203`; JavaScript `3621a2adf991d69c3bfe18430da75900146458186a41598a174d2cad941243ca`; CSS `853b2e2f9af7228badc732afc64733ef74780a627d7a700b55071a30b0a141eb`.

## Earlier findings

| Earlier finding | Current disposition |
| --- | --- |
| Missing remote invitation game | Fixed; two independent live clients completed and rematched a synchronized room. |
| Unsafe seed rendering or invalid saved state | Fixed; recovery regression passed in the clean browser suite. |
| Demo skipped the opening or touched real storage | Fixed; live demo started empty, taught the opening, and reset preserved `real:` data. |
| Small targets or pause focus loss | Fixed; target-size and pause-focus claim regressions passed. |
| Invalid invite or opaque outage recovery | Fixed; live invalid and controlled-outage checks showed direct errors and recovery controls. |
| Unlisted, incomplete, or unmeasured claims | Fixed; 21 registered, one-tag claims all passed independently, including the elapsed duration measurement and local mode. |
| Privacy did not observe WebSockets | Fixed; live online review recorded the product-owned WSS origin. |
| Spoofable or global request allowance | Fixed; isolated-client server claim and live 6×201 then 429 boundary passed. |
| Room state was not durable across restart | Fixed; same-data-directory SQLite restart claim passed. |
| Phone first screen hid the game | Fixed; the full board ended at 840.3 px in the 844 px phone viewport. |
| Nested landmark or incomplete 404 | Fixed; axe is clean and the HTTP 404 has the required shared structure. |
| Metaphorical 404 heading | Fixed; both live paths now say “Page not found.” |

## Evidence

Live machine-readable evidence is in `.factory/repair-artifacts/live-verification.json`; fresh phone and desktop first-screen, local-end, online-end, and offline screenshots are beside it. URL-check evidence is in `/work/.evidence/verify-url-review-2/`. The report is copied to `/work/.evidence/qa-report.md`; the matching result JSON records `PASS`, zero findings, and zero untested claims.
