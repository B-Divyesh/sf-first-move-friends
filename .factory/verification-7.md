# Verify a guided two-player tile game — verification 7

## Verdict: PASS

- Finding count: **0**
- Untested claim count: **0**
- Verified: 6 September 2026 UTC
- Live URL: <https://first-move-friends.sociobot.in>
- Static implementation reviewed: `cbf3184256899d41fe7141f89e25bd6808216362`
- Room-service implementation reviewed: `994d00f16359c86470add1b9a64d4148fd65de72`
- Documentation candidate reviewed: `7322284b59c11b3e05890c6e3e6c44d40c9197da`

**PASS.** This verification has zero findings at every severity and zero untested public claims. Product code, deployment, service configuration, and real user data were not changed.

## First screen

Fresh desktop Chromium and 390×844 phone contexts opened the live home at scroll position zero. A separate fresh WebKit 26.0 touch context checked the repaired phone layout.

- Job: “Play a tile duel you learn together.”
- Audience: pairs who want a short game without accounts or a rulebook wall.
- First action: “Try it with sample data,” which opens the guided sample in one click.
- The first screen says the saved demo works offline, there are no accounts, chat, or ads, and play is free.
- The goal, scores, turn count, and complete 4×4 game preview are visible before scrolling.
- The board bottom was `840.30px` in Chromium and `835.2645263671875px` in WebKit, both inside the `844px` viewport.

The WebKit result closes verification-6’s only finding. The repaired layout has 8.74 px of space below the board in the tested WebKit viewport.

## Sample and complete game runs

The one-click sample opened `/demo` and kept the label “Demo — sample data, nothing is saved to your real game.” One phone touch placed Sun’s tile and Moon’s automatic reply, producing a realistic two-tile board. Reset returned the sample to zero placements while a seeded `real:` value remained unchanged.

A deterministic sample run then placed all 16 lanterns and reached the actual end screen “Moon wins 25–12.” “Play a rematch” returned it to an empty board. The fast verification run displayed its observed five-second completion time; the separate paced claim measured the promised session design over 376 real seconds.

| Mode | Recovery | End screen | Restart |
| --- | --- | --- | --- |
| Local pass-and-play | One placement remained after reload | `Sun wins 18–13` after 16 placements | Returned to zero placements |
| Online invitation | Two independent clients synchronized 16 placements | `Sun wins 16–14` on both clients | Returned to zero placements |
| Online reconnect | Moon reloaded in a separate context | Same room and one placed tile restored | Not applicable to this partial recovery check |

The online room used a 22-character code. Host and guest had separate browser contexts and seats. This was the live product-owned service, not a mocked room.

## Interaction, recovery, and accessibility

- Tab, ArrowRight, Space, and Enter operate the board in the clean browser suite; the fresh live keyboard flow placed two sample tiles.
- Touch works at 390×844. No visible link or enabled button on the checked phone view was smaller than 44×44 CSS px.
- Escape closed Pause and returned focus to “Pause match.” The sound choice remained after reload.
- Reduced-motion mode reported a `0.00001s` game transition. There is no rapid flashing.
- Text at 200% retained the board, one h1, and no horizontal overflow.
- Sun and Moon use different glyphs and border styles as well as color.
- The saved sample reloaded offline under service-worker control and accepted another move. A service-worker update check completed with an activated worker and no waiting worker.
- Invalid room code `bad` showed “This invite link is not valid.” and “Start a new game.”
- A controlled room-service outage showed direct create and reconnect errors, plus retry and new-game actions.
- Standalone axe-core 4.10.3 found zero violations on live home. Playwright axe found zero violations on the phone home, Privacy, Terms, `/404.html`, and the unknown-route 404.
- The standard URL verifier found HTTPS 200, `lang=en`, the plain title, one h1, one main landmark, complete image alternatives, labeled buttons, and no browser errors.

## Routes, privacy, and backend

`/`, `/demo`, `/play`, `/privacy`, `/terms`, and `/404.html` returned 200 and used route-specific titles, one h1, header, navigation, main, and footer. Every internal home link returned 200. `robots.txt` names the sitemap, and `sitemap.xml` lists five routes.

`/verification-7-missing` deliberately returned HTTP 404 with “Page not found,” the shared site structure, a route home, and zero axe violations. Chrome’s expected failed-main-resource console message for that deliberate 404 is not a defect; all normal routes had zero console or page errors.

Fresh live traffic during demo and online play used only:

- `https://first-move-friends.sociobot.in`
- `https://first-move-friends-realtime.sociobot.in`
- `wss://first-move-friends-realtime.sociobot.in`

No account, analytics, advertising, chat, payment, or third-party runtime request appeared. Privacy explains local storage, online room data, expiry, and removal by clearing this site’s browser storage.

The live room service returned health 200. Its response body and `x-build-id` both named `994d00f16359c86470add1b9a64d4148fd65de72`. A player key from one temporary room received 401 against another room. Six room creates returned 201; the seventh returned 429, and the next response included `Retry-After: 60`. The reported expiry was 120 minutes. Temporary verification rooms expire normally.

Restart persistence was exercised against the same temporary product-owned SQLite directory by the exact `durable-room-restart` claim command. The placement and state version survived a stopped and restarted room-service process. The live service was not restarted during this no-deploy assignment.

## Declared claims

After clean installation, every exact command in `.factory/claims.json` ran separately. All 21 passed.

| Claim | Result | Time | Observable evidence |
| --- | --- | ---: | --- |
| `complete-match` | PASS | 15 s | 16 placements reached a winner/draw end screen |
| `guided-opening` | PASS | 9 s | Empty sample exposed one guided legal objective at a time |
| `two-players` | PASS | 10 s | Two clients, rejection, synchronization, expiry, reconnect |
| `local-pass-and-play` | PASS | 11 s | Alternation, reload, score, end screen, restart |
| `invite-link` | PASS | 9 s | Invite seated Moon in the same setup |
| `rematch` | PASS | 16 s | Empty board with a changed setup |
| `demo-sandbox` | PASS | 9 s | Demo and real storage stayed separate |
| `local-recovery` | PASS | 9 s | Board and sound restored after reload |
| `privacy-approved-origins` | PASS | 11 s | Only approved HTTP and WebSocket origins |
| `free-play` | PASS | 8 s | Playable board with no purchase control |
| `keyboard-board` | PASS | 11 s | Tab, arrows, Space, and Enter |
| `pause-focus` | PASS | 8 s | Escape closed Pause and returned focus |
| `touch-board` | PASS | 9 s | Phone touch placed both sample turns |
| `non-color-players` | PASS | 9 s | Different glyphs and solid/double borders |
| `reduced-motion` | PASS | 7 s | Movement and transitions removed |
| `offline-reload` | PASS | 8 s | Cached sample reloaded and remained playable |
| `sqlite-cleanup` | PASS | 1 s | Expired room removed from SQLite |
| `client-rate-limits` | PASS | 1 s | One client could not consume another allowance |
| `durable-room-restart` | PASS | 1 s | Same SQLite directory restored room state |
| `match-length` | PASS | 376 s | Browser wall-clock run ended within 6–10 minutes |
| `frame-rate` | PASS | 8 s | Desktop Chromium exceeded 50 fps |

Claim-tag parity passed: each registered claim has exactly one tagged regression, and no test tag is unregistered. A fresh cross-check of the landing page, metadata, README, legal pages, and copy audit found no public behavior claim outside the manifest. Untested claim count: **0**.

Fresh live desktop Chromium frame samples were `62`, `61`, and `61` callbacks over one second. The stated threshold is at least 50 frames per second in desktop Chromium.

## Clean checkout and performance

The starting tracked tree at `7322284` was clean. Node was `22.23.2` and npm was `10.9.8`.

```sh
npm ci
npm audit --audit-level=high
(cd realtime && npm ci && npm audit --audit-level=high)
npm run lint
npm run typecheck
npm test
npm run build
```

Both audits found zero vulnerabilities. Lint and typecheck passed. The final unchanged `npm test` run passed 5/5 core tests, 9/9 room-service tests, and 27/27 browser tests in 7.3 minutes.

The worker initially lacked Playwright 1.58.2’s WebKit binary and host libraries, so the first full-suite attempt had 26 passed tests and one test that could not launch. Following the work-order prerequisite, WebKit 26.0 and its host packages were installed. The dedicated WebKit case then passed, followed by the complete 27/27 rerun. This was worker setup, not a product or test failure; no source changed.

The production build emitted `dist/`:

- JavaScript: 26.72 kB raw / 9.42 kB gzip
- CSS: 18.01 kB raw / 4.96 kB gzip
- Self-hosted fonts: 70.24 kB total
- Mobile hero image: 25.25 kB

Fresh mobile Lighthouse scored Performance 100, Accessibility 100, Best Practices 100, and SEO 100. FCP was 1.1 s, LCP 1.5 s, TBT 0 ms, CLS 0.001, and total transfer 110 KiB.

## Live artifact identity

The clean build and live files match byte-for-byte:

| Artifact | SHA-256 |
| --- | --- |
| `index.html` | `c792198ba219794ffe9f54a7f292efb0169b1c83f758406b3bfd8fab886a2c84` |
| `404.html` | `3b6582560f8fa330c72cf6e38734d39ce8e9e12a8d707af456dcaf396a1d11e4` |
| `assets/index-C476KrDC.js` | `0a86025b8b89896b97111dfa6a74c7b34156642687be265ab213bd95a99b243a` |
| `assets/index-C_XrV5Jg.css` | `ee8d9a7f90edd271efa2aa1bcab6e26f8b8dbf3734ce47ceb2d34a3f4bea3723` |

The only commit after implementation `cbf3184` and before documentation candidate `7322284` changed handoff and repair evidence. It did not change the product runtime. The live static artifact therefore matches the implementation reviewed.

## Earlier findings

| Earlier finding | Current disposition |
| --- | --- |
| Missing real invitation play | Fixed; two independent live clients completed and rematched a synchronized room. |
| Unsafe setup rendering or malformed saved state | Fixed; the clean crafted-seed and state-recovery regression passed. |
| Claims skipped the sample, were incomplete, or were unmeasured | Fixed; tag parity and all 21 exact commands passed, including real elapsed time. |
| Sample skipped the guided opening or touched real storage | Fixed; live sample started empty, taught the opening, and reset preserved the real marker. |
| Touch targets below 44 px | Fixed; the complete mobile target check returned no undersized controls. |
| Pause did not restore focus | Fixed; live Escape returned focus to Pause. |
| Invalid invites remained loading or outage errors were opaque | Fixed; live invalid and controlled-outage paths gave direct recovery actions. |
| Request allowance trusted spoofable input or was shared globally | Fixed; isolated-client regression passed; live boundary was six 201 responses then 429 with `Retry-After`. |
| Live room-service identity was unknown | Fixed; health body and header match `994d00f`. |
| Room state was not durable | Fixed; the same-data-directory SQLite restart command passed. |
| Session length was undocumented | Fixed; README, metadata, sample copy, and measured claim state 6–10 minutes. |
| Privacy regression missed WebSockets | Fixed; fresh live evidence records only the product-owned WSS origin. |
| Unknown routes returned 200 or lacked the shared structure | Fixed; the designed unknown route returns 404 with header, nav, main, footer, and a route home. |
| Nested complementary landmark | Fixed; live axe checks report zero violations. |
| Metaphorical 404 heading | Fixed; both missing-page paths say “Page not found.” |
| Phone first screen hid the game | Fixed; the complete board fits in Chromium and WebKit. |
| WebKit clipped the phone preview by 1.26 px | Fixed; live WebKit board bottom is 835.2645 px in an 844 px viewport. |

## Evidence

- Browser results: `.factory/verification-7-artifacts/browser-evidence.json`
- Live verifier results: `.factory/verification-7-artifacts/live-verification.json`
- Fresh desktop, Chromium phone, WebKit phone, sample end, local end, online end, and offline captures: `.factory/verification-7-artifacts/`
- Standard URL check: `/work/.evidence/verify-url-7/verify.json`
- Standalone Axe: `/work/.evidence/axe-live-7.json`
- Mobile Lighthouse: `/work/.evidence/lighthouse-live-7.json`

Final verdict: **PASS — 0 findings and 0 untested claims.**
