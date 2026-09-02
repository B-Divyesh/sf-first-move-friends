# Independent product verification

## Verdict: FAIL

Candidate: 0544b383671efaed83ac44955e6d887af1217f83  
Live URL: https://first-move-friends.sociobot.in  
Verified: 2 September 2026 UTC  
Role: independent verifier

Do not promote this candidate. The live files match the candidate, but the product does not perform the researched job-to-be-done: an invitation link does not seat two remote players, turns are not synchronized or server-validated, and rooms neither expire nor use unguessable room codes.

## Release-blocking findings

### Critical — the required invitation game does not exist

The brief requires an invite link that seats two players, with server-validated turns, unguessable room codes, and expiry. The candidate is a static, same-screen pass-and-play game. “Copy setup link” shares only a seed.

Fresh two-client evidence using /play?seed=invitecontract:

- Both independent browser contexts began with 0 tiles.
- Client A placed one tile: A showed 1 tile while B remained at 0.
- Reloading client B still showed 0 tiles.
- Both clients made only static GET requests. No turn, room, polling, WebSocket, or server endpoint was contacted.

There is consequently no invitation seating, remote turn synchronization, authoritative validation, room expiry, reconnect behavior, or request allowance to test. Rate limiting is not applicable because the candidate exposes no server endpoint. Sign-in is also not applicable.

### High — an untrusted setup seed is inserted as HTML

The seed query is stored and rendered through innerHTML without HTML escaping. Fresh-browser reproductions:

- /play?seed=%3Ch1%3EInjected%3C%2Fh1%3E rendered an attacker-provided INJECTED h1 in addition to the real h1.
- /play?seed=%3Ca%20href%3D%2F%2Fexample.com%3EX%3C%2Fa%3E caused the game content to become links to https://example.com/ because the 24-character truncation cut the closing tag.

The response CSP blocks ordinary inline script, but arbitrary same-origin markup and deceptive outbound links remain possible from a shared setup URL.

### High — the claims contract is not satisfied even though all listed commands pass

All 11 manifest commands passed, and each claim ID has exactly one matching test tag. However, the contract requires every claim test to use only the documented /demo sandbox. Seven listed claim tests do not do that: guided-opening and two-players are core unit tests; complete-match, rematch, local-recovery, keyboard-board, and offline-reload open /play. The free-play test opens / and does not enter the demo.

There are also visitor-facing claims without entries in claims.json:

- The live meta description says a match finishes in 6–10 minutes; no duration claim measures this.
- The UI says a copied setup link opens the same goal and tile order; no claim covers it, and it fails for a returning browser because existing real:game state takes precedence over the URL seed.
- README advertises touch input and reduced-motion behavior without corresponding claim entries.

Under the supplied claims policy, unlisted claims and tests outside the demo sandbox block acceptance.

## Other findings

### Medium — invalid saved state can blank the game

Malformed JSON is discarded correctly. A structurally incomplete value such as {"seed":"x","placements":[],"scores":{}} passes the shallow validator, then /play renders a blank body with “Cannot read properties of undefined (reading 'name')”. An unknown goal has the same result. Recovery requires manually clearing site storage.

### Medium — the one-click demo skips the product’s defining tutorial

“Try it with sample data” opens a sample with four moves already placed. The first interactive state is Move 5, after the three guided opening turns. The demo is usable, isolated, and one click away, but it does not let a new visitor experience the core first-three-turn teaching flow it is meant to demonstrate.

### Medium — several touch targets are below 44 by 44 CSS pixels

Measured at 390 by 844:

- Home mark: 31 by 44.
- Demo “Reset demo” and “Start for real”: 179 by 40.
- Footer Privacy and Terms links: 43 by 21.6 and 39 by 21.6.

At desktop width the demo banner buttons are 34 pixels high and footer links are 37.7 pixels high. These do not meet the supplied 44-pixel baseline.

### Medium — pause dialog does not restore keyboard focus

Opening Pause moves focus to “Resume match”, but closing with Escape leaves focus on body rather than returning it to “Pause match”. The same render-based close path does not preserve the trigger, making keyboard continuation less predictable.

## Mandatory first-read test

PASS. A cold 1440 by 900 visit immediately showed the game board and answered all three questions in plain words:

- What: “Play a tile duel you learn together”.
- Who: “For pairs who want a short game without accounts or a rulebook wall.”
- First action: “Try it with sample data”, with “Starts a guided match against Moon.” beside it.

The same cold 390 by 844 view showed the headline, audience, demo action, three facts, and the top of the live board. The action reaches /demo in one click with no account or setup.

## Claims gate results

Each command below was run separately after npm ci from the clean candidate checkout.

| Claim | Result | Observed evidence |
| --- | --- | --- |
| complete-match | PASS | 1 Playwright test passed; 16 placements reached “Match complete”. |
| guided-opening | PASS | 1 Vitest test passed; opening legal-cell restrictions asserted. |
| two-players | PASS | 1 Vitest test passed; Sun/Moon alternation asserted. |
| rematch | PASS | 1 Playwright test passed; empty board and changed setup asserted. |
| demo-sandbox | PASS | 1 Playwright test passed; demo and real keys stayed separate. |
| local-recovery | PASS | 1 Playwright test passed; board and sound restored. |
| privacy-same-origin | PASS | 1 Playwright test passed; demo requests stayed same-origin. |
| free-play | PASS | 1 Playwright test passed; demo action present and no purchase control. |
| keyboard-board | PASS | 1 Playwright test passed; Enter placed a tile. |
| offline-reload | PASS | 1 Playwright test passed in its own context. |
| frame-rate | PASS | 1 Playwright test passed; independent live count was 61 requestAnimationFrame callbacks over 1009.5 ms. |

The command-level pass does not override the claim-sandbox and unlisted-claim blockers above.

## End-to-end game evidence

A fresh scripted live run started at the landing screen, chose “Start a two-player game”, and played the first legal cell through all 16 turns.

- Move 1 exposed only cells 5, 6, 9, and 10 and instructed Sun to choose a centre.
- Move 2 instructed Moon to place beside the first lantern.
- Move 3 instructed Sun to choose a marked scoring cell.
- The completed deterministic run ended Moon 12–11 with all 16 cells filled and a visible “Play a rematch” action.
- Rematch reset to 0 tiles and Turn 1/16, changed goal/order, incremented rematch to 1, and retained the mute preference.
- A disabled-cell activation left storage unchanged.
- Refresh after one move restored the tile and “Sound off”.
- Keyboard Enter/Space placed a tile; mobile touch changed the demo from four to six tiles after Sun and the automatic Moon response.
- Offline reload retained control of the service worker, showed the offline status, restored one tile, and accepted the next move.

The goal, scoring challenge, win/loss result, restart, persistence, pointer/touch/keyboard input, local two-player mode, demo bot mode, and measured frame callback claim all work for the implemented local game.

## Build and repository gates

- Clean starting HEAD and origin/main: 0544b383671efaed83ac44955e6d887af1217f83.
- npm ci: passed; 58 packages installed; 0 audit vulnerabilities.
- npm test: passed; 4 Vitest and 12 Playwright tests.
- npm run build: passed; this includes tsc --noEmit and emitted dist/.
- No lint script exists.
- npm audit --omit=dev: passed with 0 vulnerabilities.
- LICENSE is MIT; README, privacy, terms, demo, design, claims, and handoff documentation exist.
- /opt/fleet/lib/verify-url.sh URL evidence: HTTP 200, title and lang present, one h1, main present, no missing alt, no unlabeled buttons, no console errors.

## Deployment identity, privacy, and headers

The deployed index, JS, CSS, and service worker hashes exactly matched the local production build:

- index.html: 22efc3bf726e1b07a8c96c9226f7a54500fc718f5a528ee1c19adc1a48389b34
- index-mljvETzC.js: 0e321e3df7492e1295d110812674dfcaf695c2f7aff871a8aed11fe1ed1d72fa
- index-CO-M_II_.css: 4356f6a04dbcdcf47ba16f3fe30a5050c4abe6115ef435a8712f056fe5f9b98c
- sw.js: 91e13c8c4369573d04f7c4cb6e2a3ac62ffd2b6527c208537cea0074db0ca129

Cold landing, full match, and two-client request logs contained only https://first-move-friends.sociobot.in. No analytics, advertising, third-party script, sign-in, payment, API, or WebSocket request appeared. Normal tested flows logged no console or page errors.

HTML uses max-age=30 with must-revalidate. Hashed JS/CSS use max-age=31536000 and immutable. The service worker is short-cached, controls the live page, and its offline reload works.

Response headers include a self-only CSP with frame-ancestors none, HSTS, nosniff, strict-origin-when-cross-origin, and a restrictive permissions policy.

## Accessibility, mobile, and performance

- axe on /, /demo, /play, /privacy, /terms, and the in-app 404 at desktop and 390-pixel mobile found no serious or critical violations.
- Every tested route had lang=en, one h1, and one main; normal routes had no horizontal overflow at 390 pixels.
- Keyboard focus rings measured as a 3-pixel tide outline; skip navigation and route focus worked.
- Reduced-motion mode reduced animations and transitions to one 0.01 ms iteration.
- Lighthouse mobile: Performance 98, Accessibility 100, Best Practices 100, SEO 100.
- Lighthouse metrics: FCP 1.0 s, LCP 1.4 s, CLS 0.001, TBT 160 ms, total transfer 107 KiB.
- Production output: JS 19.07 KB (7.16 KB gzip), CSS 16.78 KB (4.69 KB gzip), fonts 70.24 KB total, mobile hero 25.25 KB.

## Required next work

1. Implement product-owned expiring invitation rooms with authoritative turn validation and synchronized/reconnectable state, then test two independent clients through a full match.
2. Treat URL seeds and saved data as untrusted: validate complete schemas and render text with textContent or escaping.
3. Put every claim test through /demo, add missing claim entries/tests, and make copied setup links override stale local state predictably.
4. Start the sample at the guided opening or provide a one-click sample that demonstrates those first three turns.
5. Raise all interactive targets to 44 by 44 pixels and restore focus to the pause trigger.

