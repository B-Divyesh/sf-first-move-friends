# First Move Friends verification-6 handoff

## Verification-6 status

Verification-6 completed on 6 September 2026 UTC without product or deployment changes.

- Verdict: **FAIL** — one minor finding, zero untested claims.
- Static implementation reviewed: `7561e61b1ff06b5ac2c940afe255e375aee82055`.
- Room-service implementation reviewed: `994d00f16359c86470add1b9a64d4148fd65de72`.
- Documentation candidate reviewed: `345cc4ef43e54578284885f6d7162a8d1fc15238`.
- Chromium `145.0.7632.6`, Firefox `146.0.1`, and WebKit `26.0` each completed fresh live sample and local games, recovered saved state, rematched, and passed keyboard, touch, audio-start, reduced-motion, offline, legal-route, 404, and accessibility checks.
- Firefox and WebKit completed a real two-client room and reached the same end screen after the WebKit guest reloaded.
- All 21 exact claim commands passed separately. The measured match-length command took 375 seconds.
- The clean build and live static hashes match. Live backend health matches `994d00f`; isolation returned 401, and the rate boundary was six 201 responses then 429 with `Retry-After: 60`.
- Finding: WebKit `26.0` places the 390×844 home preview board bottom at `845.2638549804688`, clipping about 1.26 pixels. Three fresh runs reproduced it. Chromium and Firefox stay within the viewport.

Read `.factory/verification-6.md` for the full report. Evidence is in `.factory/verification-6-artifacts/`. The report is copied to `/work/.evidence/qa-report.md`; `/work/.evidence/qa-result.json` records the matching FAIL result.

## Previous review-2 handoff

## Review-2 status

Review-2 passed on 6 September 2026 UTC. The product remains ready for promotion.

- Verdict: **PASS** — zero findings and zero untested claims.
- Static implementation reviewed: `7561e61b1ff06b5ac2c940afe255e375aee82055`
- Room-service implementation reviewed: `994d00f16359c86470add1b9a64d4148fd65de72`
- Documentation candidate reviewed: `d7e94461f678c65e67f8a9c49cf299a33f2e3079`
- Clean root and room-service install/audit, lint, typecheck, `npm test`, and production build passed.
- All 21 exact claim commands passed separately. The actual paced duration check passed in 6.3 minutes.
- Fresh live desktop and 390×844 phone contexts showed the job, audience, first action, and game before scrolling. Local and independent online runs both reached end screens and reset through rematch.
- The live room service returned the room-service build identity above; tenant isolation returned 401 for a cross-room key, and a room-create boundary was six 201 responses then 429 with `Retry-After: 60`.
- Live URL, axe, offline, invalid/recovery, keyboard, touch, reduced-motion, legal-page, and designed HTTP-404 checks passed. Final local static files matched live hashes byte-for-byte.

Read `.factory/review-2.md` for complete evidence. It is copied to `/work/.evidence/qa-report.md` with matching `/work/.evidence/qa-result.json`.

## Prior review-1 status

## Status

Review-1 passed on 5 September 2026 UTC. The product is ready for promotion.

- Live game: <https://first-move-friends.sociobot.in>
- Product room service: <https://first-move-friends-realtime.sociobot.in>
- Deployed static implementation: `7561e61b1ff06b5ac2c940afe255e375aee82055`
- Unchanged room-service implementation: `994d00f16359c86470add1b9a64d4148fd65de72`
- Documentation and prior verification reviewed: `d76c194de218137243b3b4e0985f20ead352999f`

## Review-1 summary

- Verdict: **PASS** — zero findings and zero untested claims.
- Fresh desktop and 390×844 phone contexts showed the job, audience, first demo action, and full board before scrolling.
- Demo reset preserved separate real local values. Fresh local and independent two-client online games both completed 16 placements, showed actual end screens, and rematched to empty boards.
- Live health matched the backend implementation. Room isolation returned 401 for a cross-room player key. Six room creations returned 201 and the seventh returned 429 with `Retry-After: 60`.
- `npm run verify:live`, the URL structure check, and axe checks passed. Unknown routes deliberately returned a structured, accessible HTTP 404 with “Page not found.”
- From a clean checkout, both audits, lint, typecheck, `npm test` (5 core, 9 server, 26 browser), and build passed. All 21 claim commands passed separately, including the measured 6–10 minute match.
- The final local production index, JavaScript, and CSS hashes exactly matched the live static files.

Read `.factory/review-1.md` for the complete review evidence. It is also copied to `/work/.evidence/qa-report.md` with matching `/work/.evidence/qa-result.json`.

## Verification-5 record

## Verification-5 summary

Independent QA reviewed static implementation `7561e61b1ff06b5ac2c940afe255e375aee82055`; the unchanged deployed room service identified itself as `994d00f16359c86470add1b9a64d4148fd65de72`.

- Verdict: **PASS** — zero findings and zero untested claims.
- Fresh desktop and 390×844 phone contexts showed the plain job, audience, first demo action, and playable board before scrolling.
- The demo label persisted; reset returned the sample to zero placements while preserving `real:` test values.
- Fresh live local and two-client online games each completed 16 placements, reached end screens, and rematched to empty boards. The online run used only product-owned HTTPS and WSS origins.
- Invalid invite, service-outage recovery, keyboard, touch, focus, reduced motion, text resize, offline reload, legal routes, and both 404 paths passed. Unknown routes deliberately returned HTTP 404 and rendered “Page not found.”
- All clean gates passed: root and room-service audits (zero vulnerabilities), lint, typecheck, build, 5 core tests, 9 server tests, and 26 browser tests. Every one of the 21 commands in `.factory/claims.json` was then run separately and passed; the measured match-duration claim took 6.2 minutes.
- Live `/health` returned the backend build identity above. A live room-create boundary returned 201 six times, then 429 with `Retry-After: 60`.
- A fresh production build matched the live `index.html` and JavaScript asset hashes.

Read the complete independent record in `.factory/verification-5.md`. It is copied to `/work/.evidence/qa-report.md`, with the matching result JSON at `/work/.evidence/qa-result.json`.

## Round-4 finding repaired

Both missing-page render paths now use the direct h1 “Page not found.” The static 404 retains HTTP 404, the shared header/navigation/main/footer, its explanation, and its route home. The SPA fallback retains focus handling and route metadata.

The new browser regression opens both `/missing-page` and `/404.html`. It checks the rendered level-one heading, explanation, and working home link. This is an outcome check; it does not inspect source strings. The check failed before the copy repair and passed afterward.

The 404 copy is included in `.factory/copy-audit.md`. `.factory/catalog-description.txt` now contains a 68-byte verb-first description and is copied to `/work/.evidence/catalog-description.txt`.

## Clean local verification

Run from the repository root:

```sh
npm ci
npm audit --audit-level=high
(cd realtime && npm ci && npm audit --audit-level=high)
npm run lint
npm run typecheck
npm test
npm run build
```

Results:

- Root install: 141 packages; zero vulnerabilities.
- Room-service install: 1 package; zero vulnerabilities.
- Lint and TypeScript checks passed.
- `npm test`: 5/5 deterministic core tests, 9/9 room/config integration tests, and 26/26 browser tests passed in 7.1 minutes.
- All 21 commands in `.factory/claims.json` passed individually from the clean setup. The elapsed-time match claim passed in 6.2 minutes.
- Production build emitted `dist/`: JavaScript 26.72 kB raw / 9.42 kB gzip; CSS 17.99 kB raw / 4.97 kB gzip.
- Local `/opt/fleet/lib/verify-url.sh` passed in a fresh browser with one h1, one main, `lang=en`, complete labels/alt text, and no console errors.

Playwright’s route check runs axe on home, demo, privacy, terms, the SPA fallback, and static 404 at desktop and 390 px. It reported zero violations. Dedicated tests also passed for keyboard and touch play, visible focus, 44 px targets, 200% text, reduced motion, non-color state cues, pause focus return, offline reload, and recovery errors.

## Live browser evidence

`npm run verify:live` passed against both production origins with no unexpected console or page errors.

- A fresh 1440×900 browser showed one h1 and one main.
- A fresh 390×844 touch browser showed the goal, score, turn, and full board before scrolling; board bottom was 840.3 px.
- First read: job “Play a tile duel you learn together”; audience “For pairs who want a short game without accounts or a rulebook wall”; first action “Try it with sample data.”
- The one-click sample kept its “Demo — sample data” banner through a 16-placement result (`Moon wins 25–12`). Reset returned to zero placements and did not change seeded `real:` storage.
- Local play restored one placement after reload, finished `Moon wins 13–11`, and rematched to an empty board.
- Two independent online clients synchronized all 16 placements, finished `Moon wins 24–16`, and rematched to an empty board. Network evidence contains only the static and product-owned room origins plus two product-owned WebSockets.
- A controlled offline `/demo` reload remained playable.
- Privacy, Terms, `/404.html`, and an unknown route had zero axe violations.
- Fresh desktop and phone unknown-route checks returned HTTP 404, rendered “Page not found,” kept the route home, and produced no unexpected browser errors.
- `/opt/fleet/lib/verify-url.sh` passed live in 586 ms with one h1, one main, `lang=en`, complete labels/alt text, and no console errors.

Evidence is in `.factory/repair-artifacts/`, including the phone and desktop first screens, demo/local/online end screens, phone and desktop 404 screens, offline state, `live-verification.json`, URL-verifier output, and Lighthouse reports.

## Performance, policy, and live identity

Lighthouse 13.4.1 mobile scores were Performance 100, Accessibility 100, Best Practices 100, and SEO 100. FCP was 1.1 s, LCP 1.4 s, total blocking time 0 ms, CLS 0.001, and total transfer 110 KiB.

Final local/live hashes match:

| Artifact | SHA-256 |
| --- | --- |
| `index.html` | `4d8aa80da539d36292a0a2e1f6f41e71acbd5aa82de8c5254f36516cfe3e2203` |
| `assets/index-COEcEAAP.js` | `3621a2adf991d69c3bfe18430da75900146458186a41598a174d2cad941243ca` |
| `404.html` | `3b6582560f8fa330c72cf6e38734d39ce8e9e12a8d707af456dcaf396a1d11e4` |

The live JavaScript contains the production room-service origin and no localhost room URL. The room health endpoint returns 200 and build id `994d00f16359c86470add1b9a64d4148fd65de72`. A fresh allowance check returned 201 for six creates, then 429 with `Retry-After: 60` on the seventh.

The first upload after testing mistakenly used the Playwright-built `dist/`, whose room URL targets localhost. The live verifier caught it before handoff. A clean production build was created and redeployed; final live hashes, online play, and privacy-origin checks above prove the corrected artifact is active. Always run `npm run build` after Playwright and immediately before static deployment.

## Earlier findings disposition

| Earlier finding | Current evidence |
| --- | --- |
| No remote invitation play | Two fresh live clients completed and rematched a synchronized game. |
| Unsafe seed rendering or malformed saved state | Core and browser recovery regressions pass. |
| Demo skipped the opening; reset crossed namespaces | The live sample starts empty, teaches the opening, and leaves `real:` data unchanged after reset. |
| Small targets or lost pause focus | Target-size and pause-focus browser regressions pass. |
| Invalid invites or service outages lacked recovery | Browser recovery regressions pass with direct actions. |
| Missing or incomplete public claims | All 21 declared commands pass; the registered-tag parity test passes. |
| Duration was computed; local mode was unregistered | The 6.2-minute elapsed test and complete local-mode claim pass. |
| Privacy test missed WebSockets | Local and live tests record product-owned WebSocket origins. |
| Global request allowances | Isolated-client/two-replica tests pass; live boundary is 6×201 then 429 with `Retry-After: 60`. |
| Room state was not durable | Restart persistence passes against the same SQLite directory; deployed backend identity is unchanged. |
| Phone first screen hid the game | The fresh live board ends at 840.3 px in the 844 px viewport. |
| Nested complementary landmark | Axe reports zero violations on every checked route. |
| 404 lacked shared structure or correct status | The live unknown route has the shared skeleton and returns HTTP 404. |
| 404 used a metaphorical heading | Fixed in both render paths; browser and live checks read “Page not found.” |

## Known gaps and next step

No known product defect remains. The room service was not rebuilt or restarted for this static-only copy repair; its existing single-replica durable `/data` deployment remains in place. Independent verification should review implementation `7561e61` and the final evidence commit before promotion.
