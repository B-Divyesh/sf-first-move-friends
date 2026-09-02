# First Move Friends repair handoff

## Status: repair complete and deployed

All release blockers in independent report commit `8b91528e54e577154c66631ab0ca78a5f57f5ba9` for candidate `7770397450e1b4de886e3de11f8cece08be4e15c` were reproduced and repaired on 2 September 2026 UTC.

- Static product: <https://first-move-friends.sociobot.in>
- Product-owned room service: <https://first-move-friends-realtime.sociobot.in>
- Deployed backend source: `994d00f16359c86470add1b9a64d4148fd65de72`
- Healthy revision: `sf-first-move-friends-realtime--0000013`
- Image: `sociobotregistry.azurecr.io/sf-first-move-friends-realtime:994d00f16359`
- Deployment class remains a static browser game. The existing product-owned room service supplies the brief's online mode.

## Blockers repaired

| Finding | Root-cause repair | Regression and evidence |
| --- | --- | --- |
| The 6–10 minute test proved arithmetic, not elapsed time | The claim now completes eight player actions at a measured 45-second pair pace. Match start/finish timestamps persist, and the end screen reports the measured duration. | `@claim:match-length` uses browser wall time and passed in the 7.1-minute full browser run. |
| Local pass-and-play was advertised but unregistered | Added the `local-pass-and-play` manifest entry and a complete local flow: alternate players, refresh, finish, verify score, rematch. | `@claim:local-pass-and-play`; live result `Sun wins 18–14`, reload restored one placement, rematch returned to zero. |
| The privacy claim did not observe WebSockets | The browser regression records WebSocket creation as well as HTTP requests and confirms connected rooms do not keep polling. | `@claim:privacy-approved-origins`; live two-browser flow observed two sockets only at `wss://first-move-friends-realtime.sociobot.in`, 37 received frames, and recorded no payloads. |
| Live SQLite had no durable `/data` mount | The fleet-managed Azure Files share is mounted at `/data`. SQLite runs transactionally in a local working directory and atomically replaces its durable snapshot after every mutation, avoiding Azure Files lock incompatibility. | `@claim:durable-room-restart`; a controlled live create/join/move, revision restart, and GET restored version 1 with one placement. Azure reports volume `sf-first-move-friends-re-b5f819` mounted at `/data`. |
| Request allowances were global | Rate keys now include a hash of the right-most ingress-observed client address. Untrusted left-side forwarded hops cannot rotate identity. Buckets persist in SQLite across replicas. | `@claim:client-rate-limits`, the two-replica allowance test, expiry test, and response-header tests all pass. |
| The game was below the 390×844 first viewport | The mobile composition puts the goal, scores, turn, and compact board before secondary mode controls. | Regression requires the complete board bottom to be at or above 844 px. Live measured bottom: 840.3 px. |
| Nested complementary landmark | The turn panel is a styled non-landmark container, leaving landmarks properly nested. | Axe found zero violations on the live home at 390 px and on Privacy, Terms, the explicit 404, and an unknown route. |
| The real 404 lacked the shared structure | `404.html` now has the product header, navigation, one h1, main, footer, metadata, focus treatment, and reduced-motion policy. Static Web Apps rewrites unknown responses to it without changing the 404 status. | Live unknown URL returned HTTP 404 with header/nav/main/footer and zero axe violations. |
| Win/loss/restart needed fresh proof | Both local and remote flows fill all 16 cells, compute a result, show the end screen, and reset synchronously. | Live local result: `Sun wins 18–14`; live online result: `Moon wins 24–16`; both rematches reset to zero placements. |

Pre-fix reproduction confirmed the original failures before repair: the mobile board started at y=1037.45 px, axe reported `landmark-complementary-is-top-level`, the 404 lacked route structure, live `/data` had no mount, rate buckets were global, and the duration test completed in seconds using constants.

## Clean verification

From the final tree:

```sh
npm ci
npm audit --audit-level=high
npm run lint
npm run typecheck
npm test
npm run build
(cd realtime && npm ci && npm audit --audit-level=high)
npm run verify:live
```

Results:

- Clean install: 141 packages; zero vulnerabilities.
- Core: 5/5 passed.
- Room/config integration: 9/9 passed.
- Browser: 25/25 passed in 7.1 minutes.
- Every registered claim has exactly one tagged regression; all claim paths pass inside the full suite.
- Lint and TypeScript: passed.
- Realtime clean install: 1 package; zero vulnerabilities.
- Production build: JS 26.73 kB raw / 9.43 kB gzip; CSS 17.99 kB raw / 4.97 kB gzip; `dist/` produced.
- Root and room-service package audits: zero vulnerabilities.

## Live browser and accessibility evidence

`npm run verify:live` passed against both production origins with no unexpected console or page errors.

- Desktop: HTTP 200, one h1, one main.
- Mobile: 390×844, complete board bottom 840.3 px.
- Keyboard: Tab reached the board, ArrowRight moved focus, Space placed a turn. The browser regression also covers Enter.
- Text resize: 200% retained the heading and board without horizontal overflow.
- Offline/update: a fresh service worker controlled `/demo`; an offline reload showed the offline state and accepted a move.
- Local recovery/end/restart and two-browser online end/restart passed.
- Axe: zero violations across every live route checked.
- `/opt/fleet/lib/verify-url.sh`: title, `lang=en`, one h1, main, alt text, labels, and console checks all passed; load measured 689 ms.
- Reduced-motion, touch, focus-return, non-color player cues, 44 px targets, and 50+ fps each pass a dedicated browser regression.

Evidence is in [repair-artifacts](repair-artifacts), including live desktop/mobile, offline and end-screen captures, [live-verification.json](repair-artifacts/live-verification.json), and Lighthouse reports.

## Performance and response policy

Lighthouse 13.4.1 mobile at 08:02 UTC scored:

- Performance 100
- Accessibility 100
- Best Practices 100
- SEO 100
- FCP 1.1 s, LCP 1.4 s, TBT 0 ms, CLS 0.001, transfer 112,351 bytes

Static responses include HSTS, `nosniff`, strict-origin referrer policy, restrictive permissions policy, and a CSP whose `connect-src` contains only self plus the product room HTTPS/WSS origins. The room service uses `no-store`, `default-src 'none'`, product-origin CORS, and `X-Build-Id`.

The final `dist/` and live static files match byte-for-byte:

| File | SHA-256 |
| --- | --- |
| `index.html` | `5cd7c8f8fafe076324930fe2caf5e81584cc412d94e886681e0a8deb7229a078` |
| JS | `103f9899420186a11c6db662b8ed59821d153f429bec470aed7cf0a760292192` |
| CSS | `853b2e2f9af7228badc732afc64733ef74780a627d7a700b55071a30b0a141eb` |
| `sw.js` | `97939fd88fa9452f06f3950a4422003b5bbc85dffd9f1e8f3f32d99403114f5f` |
| `404.html` | `e2b7de805a3de88699b1ac60cecc488a02b7762047a00ccc32da60e31fdf2368` |

## Deployment evidence

The static artifact was deployed with the work order's static deployment script. The room service was deployed with `deploy.data_dir=/data`; the scoped app reports:

- single active revision mode;
- minimum and maximum one replica;
- one healthy running replica;
- volume `data` mounted at `/data` from product share `sf-first-move-friends-re-b5f819`;
- `/health` body and `X-Build-Id`: `994d00f16359c86470add1b9a64d4148fd65de72`.

No unrelated infrastructure, service settings, secrets, databases, or storage were accessed.

## Known gaps and next step

No known release-blocking product gap remains. The independent verifier should re-run this handoff against the deployed repair before promotion.
