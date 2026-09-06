# Verify cross-browser tile game play

## Verdict: FAIL

- Finding count: **1** (minor)
- Untested claim count: **0**
- Live URL: <https://first-move-friends.sociobot.in>
- Static implementation reviewed: `7561e61b1ff06b5ac2c940afe255e375aee82055`
- Room-service implementation reviewed: `994d00f16359c86470add1b9a64d4148fd65de72`
- Documentation candidate reviewed: `345cc4ef43e54578284885f6d7162a8d1fc15238`
- Playwright version: `1.58.2`
- Browser engines: Chromium `145.0.7632.6`, Firefox `146.0.1`, WebKit `26.0`

**FAIL.** The game, all 21 declared claims, and complete local and online matches work. One minor WebKit phone-layout finding remains. No claim is untested. No product code, deployment, or service configuration changed during this verification.

The public site and README call this a browser game but do not name supported browser brands or versions. This review qualifies the three requested engines without adding a new public support promise.

## Finding

### Minor — WebKit clips the bottom of the phone preview by 1.26 pixels

At a fresh 390×844 viewport, WebKit `26.0` places the home preview board bottom at `845.2638549804688` CSS pixels. The last board row remains usable, but about 1.26 pixels of the board edge are below the first viewport. Chromium places the bottom at `840.30`; Firefox places it at `840.31`.

This conflicts with the visual thesis in `.factory/design.md`, which says the full 4×4 preview fits inside the first 844 pixels. It does not block play: WebKit touch targets measure 68×68, touch creates both sample placements, and full demo, local, and online matches finish.

Reproduce:

1. Launch Playwright `1.58.2` WebKit `26.0` in a fresh context with `viewport: { width: 390, height: 844 }` and `hasTouch: true`.
2. Open `https://first-move-friends.sociobot.in/` at scroll position zero.
3. Read `document.querySelector('.board').getBoundingClientRect().bottom`.
4. Observe `845.2638549804688` while `innerHeight` is `844`.

Three fresh contexts returned the same value. Evidence: [WebKit phone first screen](verification-6-artifacts/webkit-phone-first.png) and [browser evidence](verification-6-artifacts/browser-evidence.json).

## First screen and sample

Fresh desktop and phone contexts opened at scroll position zero in all three engines. Before scrolling they showed:

- Job: “Play a tile duel you learn together.”
- Audience: “For pairs who want a short game without accounts or a rulebook wall.”
- First action: “Try it with sample data.”
- Facts: saved demo works offline after the first visit; no account, chat, or ads; free to play.
- The goal, score, turn, and 4×4 game preview. The WebKit edge clipping is the finding above.

The first action entered `/demo` in one click. The persistent label said “Demo — sample data, nothing is saved to your real game.” One input produced realistic populated output with Sun and Moon placements. Reset returned to zero placements and preserved a seeded `real:game` marker. Demo end screens in all engines read `Moon wins 25–15`, and rematch returned to zero placements.

## Complete game runs

| Mode | Engine or clients | Recovery | End screen | Restart |
| --- | --- | --- | --- | --- |
| Live local | Chromium 145.0.7632.6 | One placement restored after reload | `Moon wins 10–9` after 16 placements | Zero placements |
| Live local | Firefox 146.0.1 | One placement restored after reload | `Moon wins 24–16` after 16 placements | Zero placements |
| Live local | WebKit 26.0 | One placement restored after reload | `Moon wins 12–11` after 16 placements | Zero placements |
| Live online | Firefox host and WebKit guest | Guest restored six placements after reload | Both read `Moon wins 13–10` after 16 synchronized placements | Both returned to zero placements |

The online run used one 22-character private room code and independent real browser contexts. HTTP requests used only the static and product-owned room origins. Updates used `wss://first-move-friends-realtime.sociobot.in`.

End-screen evidence: [Chromium local](verification-6-artifacts/chromium-local-end.png), [Firefox local](verification-6-artifacts/firefox-local-end.png), [WebKit local](verification-6-artifacts/webkit-local-end.png), [Firefox online](verification-6-artifacts/firefox-online-end.png), and [WebKit online](verification-6-artifacts/webkit-online-end.png).

## Browser behavior

| Check | Chromium | Firefox | WebKit |
| --- | --- | --- | --- |
| Tab, ArrowRight, Space on sample | Pass | Pass | Pass |
| Enter in local game | Pass | Pass | Pass |
| 390×844 touch input | Pass, two placements | Pass, two placements | Pass, two placements |
| Audio context before input | 0 | 0 | 0 |
| Audio context after placement gesture | 1 | 1 | 1 |
| Sound choice after reload | Pass | Pass | Pass |
| Pause Escape focus return | Pass | Pass | Pass |
| Reduced-motion transition | `0.00001s` | `0.00001s` | `0.00001s` |
| Service-worker update and offline reload | Pass | Pass | Pass |
| Play after offline reload | Pass | Pass | Pass |
| 200% text without horizontal overflow | Pass | Pass | Pass |
| Axe violations on checked home, phone, legal, and 404 views | 0 | 0 | 0 |
| Native product console/page errors | 0 | 0 | 0 |

Live one-second `requestAnimationFrame` samples were Chromium `60/61/61`, Firefox `60/61/61`, and WebKit `37/63/63`. The only public frame-rate claim is at least 50 fps in desktop Chromium; all three Chromium samples pass. No WebKit frame-rate promise exists, so its cold first sample is not a finding.

## Worker infrastructure notes

All requested browser engines were available after running Playwright’s documented dependency and browser installers. There is no browser-infrastructure gap and no untested browser claim.

Playwright’s `page.reload()` returned “WebKit encountered an internal error” only after offline emulation. A browser-initiated `location.reload()` under the same offline context restored the service-worker shell, showed the offline notice, and accepted input. This is a Playwright transport limitation, not a product failure.

WebKit logged CSP rejections when axe and Playwright’s full-page screenshot helper injected their own styles. A fresh WebKit phone run without either injection logged zero errors and accepted touch input. The report excludes only these exact verifier-generated messages. The raw classifications remain in `browser-evidence.json`.

## Declared claims

After `npm ci`, each exact command in `.factory/claims.json` ran separately. All 21 passed.

| Claim | Result | Independent command evidence |
| --- | --- | --- |
| `complete-match` | PASS | 15 s; sample reached its 16-placement result |
| `guided-opening` | PASS | 8 s; empty sample and legal guided cells |
| `two-players` | PASS | 8 s; two clients, rejection, synchronization, reconnect |
| `local-pass-and-play` | PASS | 9 s; reload, result, restart |
| `invite-link` | PASS | 7 s; same goal and order |
| `rematch` | PASS | 15 s; empty changed setup |
| `demo-sandbox` | PASS | 9 s; separate sample and real namespaces |
| `local-recovery` | PASS | 8 s; board and sound restored |
| `privacy-approved-origins` | PASS | 10 s; only approved HTTP and WebSocket origins |
| `free-play` | PASS | 6 s; playable with no purchase control |
| `keyboard-board` | PASS | 9 s; Tab, arrows, Space, Enter |
| `pause-focus` | PASS | 7 s; Escape returns focus |
| `touch-board` | PASS | 7 s; phone touch places tiles |
| `non-color-players` | PASS | 8 s; glyph and border differences |
| `reduced-motion` | PASS | 6 s; transitions removed |
| `offline-reload` | PASS | 7 s; cached sample reloads and plays |
| `sqlite-cleanup` | PASS | 1 s; expired room removed |
| `client-rate-limits` | PASS | 1 s; isolated client allowances |
| `durable-room-restart` | PASS | under 1 s; same SQLite directory restores the room |
| `match-length` | PASS | 375 s; real elapsed match ends in the 6–10 minute range |
| `frame-rate` | PASS | 7 s; desktop Chromium exceeds 50 fps |

No visitor-facing claim was found outside the manifest. Untested claim count: **0**.

## Clean quality gates and live identity

- Node `22.23.2`; npm `10.9.8`.
- Root and room-service clean installs passed; both audits found zero vulnerabilities.
- Lint, typecheck, and production build passed.
- `npm test`: 5/5 deterministic tests, 9/9 room-service tests, and 26/26 Chromium browser tests passed in 7.1 minutes.
- Production output: JavaScript 26.72 kB raw / 9.42 kB gzip; CSS 17.99 kB raw / 4.97 kB gzip.
- The standard live URL check passed in 582 ms with HTTPS 200, correct title and language, one h1, a main landmark, complete labels and alt text, and no console errors.
- `/`, `/demo`, `/play`, `/privacy`, `/terms`, `/404.html`, `robots.txt`, and `sitemap.xml` returned 200. An unknown route deliberately returned HTTP 404 with “Page not found,” the shared skeleton, a route home, and zero axe violations.
- Privacy and Terms had route-specific titles. An invalid room code gave a direct explanation and “Start a new game.” The outage, malformed-state, and malformed-seed regressions passed in the clean suite.
- Live `/health` returned 200 and build id `994d00f16359c86470add1b9a64d4148fd65de72` in its body and header.
- A fresh live allowance window returned six 201 responses, then 429 with `Retry-After: 60`. A token from the Firefox/WebKit room returned 401 against another room.
- Restart persistence passed against the same temporary product-owned SQLite directory. The live service was not restarted because this assignment required preserving deployment.

The clean production build exactly matches live:

| Artifact | SHA-256 |
| --- | --- |
| `index.html` | `4d8aa80da539d36292a0a2e1f6f41e71acbd5aa82de8c5254f36516cfe3e2203` |
| `assets/index-COEcEAAP.js` | `3621a2adf991d69c3bfe18430da75900146458186a41598a174d2cad941243ca` |
| `404.html` | `3b6582560f8fa330c72cf6e38734d39ce8e9e12a8d707af456dcaf396a1d11e4` |

## Earlier findings

| Earlier finding | Current disposition |
| --- | --- |
| No real invitation play | Fixed; Firefox and WebKit completed and rematched a live synchronized room. |
| Unsafe seed rendering or malformed saved state | Fixed; clean recovery regression passed. |
| Claim tests skipped the demo sandbox | Fixed; manifest parity and all exact commands pass. |
| Sample skipped the guided opening or reset touched real data | Fixed; sample starts empty and reset preserved the real marker in every engine. |
| Touch targets below 44 px | Fixed; phone board targets measured 68×68. |
| Pause did not restore focus | Fixed; Escape restored the Pause control in every engine. |
| Invalid invite and service-outage recovery were unclear | Fixed; direct recovery actions pass. |
| Duration was unregistered or computed | Fixed; the registered command measured 375 real seconds. |
| Privacy test missed WebSockets | Fixed; the live cross-engine run recorded only the product WSS origin. |
| Global request allowance | Fixed; isolated claim passes and live boundary is six 201 responses then 429. |
| Room state was not durable | Fixed; same-data-directory SQLite restart claim passes. |
| Phone first screen hid the game | Fixed in Chromium and Firefox; WebKit’s new 1.26-pixel edge clipping is the minor finding above. |
| Nested landmark or incomplete 404 | Fixed; axe is clean and the expected HTTP 404 has the shared structure. |
| Metaphorical 404 heading | Fixed; both missing-page paths say “Page not found.” |

## Evidence

- Machine-readable browser results: [browser-evidence.json](verification-6-artifacts/browser-evidence.json)
- Machine-readable local runs: [local-runs.json](verification-6-artifacts/local-runs.json)
- Desktop, phone, demo, local, and online screenshots: `.factory/verification-6-artifacts/`
- Standard URL check: `/work/.evidence/verify-url-6/verify.json`

Required next step: adjust the 390 px home layout so WebKit keeps the board bottom at or above 844 px, then repeat the WebKit phone measurement. Do not promote this verification as PASS until the finding count is zero.
