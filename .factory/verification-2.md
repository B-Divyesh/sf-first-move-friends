# Independent product verification — round 2

## Verdict: FAIL

- Candidate: `8b7ad4fb0733e56bb0c7a3476f583b55345f374a`
- Live URL: `https://first-move-friends.sociobot.in`
- Verified: 2 September 2026 UTC
- Role: independent verifier

Do not promote this candidate. The previous absence of real invitation play is repaired, and the game now completes end to end, but malformed invite links have no recovery, the public API allowance is trivially bypassed, a public duration claim remains outside the claims manifest, and the deployed room service exposes no build identity with which to prove that it matches the candidate.

No product code or infrastructure was changed during this verification.

## Release-blocking findings

### High — malformed invite links never leave the loading state

A fresh visit to `https://first-move-friends.sociobot.in/play?room=bad` remained on “Connecting to the room…” after 1.5 seconds and exposed no recovery action. No request was made because the client rejects the malformed code locally. In `ensureRoom`, that branch sets `roomError` and returns without rerendering, so the visitor never sees the intended “This invite link is not valid” message or “Start a new game” link.

This is an invalid-input and recovery failure in the product’s core invitation flow. Evidence: [`live-invalid-invite.png`](verification-artifacts/live-invalid-invite.png).

### High — the public request allowance trusts a spoofable header

The deployed room service did enforce its nominal limits:

- Room creation: requests 1–6 returned `201`; request 7 returned `429` with `Retry-After: 60`.
- Room joining: attempt 1 returned `200`, attempts 2–20 returned the expected room-full `409`, and attempt 21 returned `429` with `Retry-After: 60`.

However, these buckets use the first value of the caller-supplied `X-Forwarded-For` header. From the same process and connection source, changing only that header after the creation limit immediately returned `201`. A raw client can therefore rotate arbitrary values to evade the allowance and grow both the in-memory bucket map and two-hour SQLite room set. The required allowance is present but not effectively enforced against an untrusted client.

### High — the required claims contract is incomplete

All 14 commands in `.factory/claims.json` passed, and every ID occurs exactly once as an `@claim:<id>` test. That command-level result does not satisfy the supplied claims policy:

- The deployed raw HTML and `index.html` say “finish a match in 6–10 minutes.” There is no duration claim or measured duration test in `.factory/claims.json`.
- README says Arrow keys and Space operate the board, but `@claim:keyboard-board` programmatically focuses a cell and checks only Enter.
- README says Escape returns focus to Pause, expired rooms are removed from SQLite, and Sun/Moon use non-color symbols and borders. These statements are not represented in the claims manifest. Some have untagged coverage, but the contract requires each public claim to be listed and mapped to exactly one tagged test.
- `@claim:invite-link` clicks “Copy invite link” but opens a URL reconstructed from the known room code; it does not read or open the clipboard value it claims to verify.
- `@claim:demo-sandbox` checks the real key before reset but does not assert that the key remains unchanged after “Reset demo.”

Independent live checks confirmed that the copied invitation URL and current reset behavior work. The release blocker is the required claim-to-test contract, not a claim that those two behaviors are currently broken.

### High — live room-service build identity cannot be established

The static deployment is byte-for-byte identical to the candidate build, but the product-owned backend does not expose a commit, image digest, or build/version identifier. `GET /health` returns only `{"ok":true}` and `GET /` returns only the service name. Its observed behavior matches the candidate, but the required live-to-candidate identity check cannot be completed for the authoritative half of the game.

## Other findings

### Medium — a room-service outage exposes an opaque browser error

With the product-owned API request aborted, “Start an online game” re-enabled but displayed only “Failed to fetch.” It does not say that the room could not be created or tell the player to retry, contrary to the supplied error-copy and recovery requirements.

### Medium — unknown routes return HTTP 200

`/missing-page` renders the designed in-app 404 state, but its HTTP response is `200`, not `404`. This weakens crawler and cache semantics for a required real 404 route.

### Medium — intended session length is not documented where required

The supplied game-loop contract requires the README to state the intended session length. The researched brief specifies 6–10 minutes, but the README only calls the game “short.” The only duration text is the untested raw HTML metadata noted above.

## Mandatory first-read test

PASS. A cold 1440×900 visit showed the playable 4×4 board on the first screen and answered all three questions in plain words:

- What: “Play a tile duel you learn together.”
- Who: “For pairs who want a short game without accounts or a rulebook wall.”
- First click: “Try it with sample data,” followed by “Starts a guided match against Moon.”

The demo opens in one click without setup or an account. At 390×844 the headline, audience, demo action, all three plain facts, and the top edge of the game panel are visible without horizontal overflow. Evidence: [`live-first-screen-desktop.png`](verification-artifacts/live-first-screen-desktop.png) and [`live-first-screen-mobile.png`](verification-artifacts/live-first-screen-mobile.png).

## Claims gate

Each listed command was run separately after `npm ci` from the clean candidate checkout. All passed.

| Claim | Result | Observable evidence |
| --- | --- | --- |
| complete-match | PASS | The demo reached 16 tiles and “Moon wins 25–12.” |
| guided-opening | PASS | Moves 1–3 exposed `[5,6,9,10]`, then `[1,4,6,9]`, then `[0,2,4]`, with one distinct instruction per move. |
| two-players | PASS | Two independent live contexts synchronized authoritative Sun and Moon moves and recovered the board after reload. |
| invite-link | PASS | Independent live clipboard check matched the room URL exactly and opened as Moon with the same goal. |
| rematch | PASS | The board reset to zero placements and the seeded setup changed. |
| demo-sandbox | PASS | The command passed; independent code/behavior checks found separate `demo:` and `real:` keys. Test completeness issue remains above. |
| local-recovery | PASS | Board and muted setting survived reload. |
| privacy-approved-origins | PASS | Demo traffic was same-origin only; online traffic added only the product-owned room service. |
| free-play | PASS | Gameplay had no purchase control or gate. |
| keyboard-board | PASS | Enter placed a tile; independent checks also exercised ArrowRight and focus styling. Test completeness issue remains above. |
| touch-board | PASS | A 390 px touch context placed a tile. |
| reduced-motion | PASS | Computed animation/transition durations fell to `0.00001s`; no material motion remained. |
| offline-reload | PASS | A controlled fresh context reloaded `/demo` offline and accepted a move. |
| frame-rate | PASS | Five live one-second samples measured 60.15–60.91 requestAnimationFrame callbacks/second. |

## End-to-end game and backend evidence

### Demo run

A fresh live run started at `/`, used the primary demo link, began with an empty board and four marked centre cells, and reached the real end screen after all 16 placements. The deterministic `sample42` run ended Moon 25–12. “Play a rematch” reset placements and scores, incremented the rematch counter, changed the goal/order setup, and retained the muted setting after reload. A dispatched click on a disabled cell left saved state unchanged.

Evidence: [`live-demo-title.png`](verification-artifacts/live-demo-title.png) and [`live-demo-end.png`](verification-artifacts/live-demo-end.png).

### Online two-player run

A fresh live room produced a unique 22-character code and independent 43-character Sun/Moon keys. Two browser contexts showed the same goal and completed all 16 alternating turns. Both ended Moon 15–14. The host refreshed back to the finished 16-tile board, and a host rematch reset both screens. A separate API run finished at version 16 and rematched at version 17 with zero placements, zero scores, and a changed goal/order setup.

Negative and boundary results:

- Moon moving first: `409`.
- Invalid opening cell: `422`.
- Stale version: `409`.
- Third player: clear room-full state and `409`.
- Missing or forged player key: `401`.
- Body over 2,048 bytes: `400`.
- Disallowed origin: `403` and no access-control allow-origin header.
- Two simultaneous same-version Sun moves: one `200`, one `409`; stored state advanced exactly once.
- Room expiry timestamp: two hours after creation; a local shortened-TTL integration test returned `410` after expiry.
- SQLite persistence boundary: a locally created room at version 1 with one tile remained version 1 with one tile after stopping and restarting the server against the same temporary data directory.

Evidence: [`live-online-end.png`](verification-artifacts/live-online-end.png).

## Clean build and repository gates

- Starting `HEAD`, `origin/main`, and requested candidate were all `8b7ad4fb0733e56bb0c7a3476f583b55345f374a` with a clean tracked tree.
- `npm ci`: PASS; 59 packages installed, 0 audit vulnerabilities.
- Every one of the 14 `.factory/claims.json` commands: PASS individually.
- `npm test`: PASS; 5 Vitest tests, 2 Node room-service integration tests, and 19 Playwright tests.
- `npm run build`: PASS; includes `tsc --noEmit` and emits `dist/`.
- No lint script exists.
- Root and realtime dependency audits: 0 vulnerabilities.
- `LICENSE`: MIT. README, privacy, terms, design, demo, claims, copy audit, and handoff documents exist.
- `/opt/fleet/lib/verify-url.sh`: PASS after providing its required existing output directory; no load errors, one h1, `lang=en`, main landmark, and no unlabeled buttons or missing image alt.

## Deployment identity and privacy

Static production hashes matched exactly:

| Asset | SHA-256 |
| --- | --- |
| `index.html` | `0d6475cffa6fe6f3ea97fe2bb26318a6a4003c3aa1e4e0981ebe624b69338332` |
| `assets/index-C07sbqLF.js` | `eb25e482f35b2b6dfcbcc823c05d5ec378529ca3c6df668e3366c9bb12fd3b33` |
| `assets/index-DQkp5vtv.css` | `e767739caea3fda9081326cc483d89395988c3c5b280e13b4f7b37d48adca724` |
| `sw.js` | `2d72e0eec6197b6be65f16b4aa1dbf1fdc53e757860e10c0f8786c411a1121e7` |

Fresh `/`, `/demo`, `/privacy`, and `/terms` contexts set no cookies. The root and demo used only `first-move-friends.sociobot.in`; online play used that origin plus `first-move-friends-realtime.sociobot.in` over HTTPS/WSS. There were no analytics, advertising, third-party script, payment, or sign-in requests. Entra sign-in is not applicable because the product has no authentication.

Static responses include the expected CSP, HSTS, nosniff, referrer, and permissions policies. HTML and `sw.js` use `max-age=30, must-revalidate`; hashed JS/CSS use one-year immutable caching. Room responses use `no-store`, a restrictive CSP, and origin-scoped CORS. No cookie was set.

## Accessibility, mobile, PWA, and performance

- Playwright axe on `/`, `/demo`, `/play`, `/privacy`, `/terms`, and an unknown route at 1440×900 and 390×844: no serious or critical findings.
- Every tested view had `lang=en`, one h1, one main, no horizontal overflow, and no active target below 44×44 CSS px.
- Keyboard: skip navigation advanced to the first main control, ArrowRight moved between legal cells, Enter placed, Pause moved focus into its dialog, and Escape restored focus to Pause.
- At simulated 200% text size on 390 px, the h1, board, and controls remained present with no horizontal overflow.
- Reduced motion replaced meaningful transitions with effectively instant `0.00001s` durations.
- Service worker: `first-move-friends-v2` was activated and controlling the page; `registration.update()` completed; offline reload restored the demo and accepted a touch move. Evidence: [`live-offline-mobile.png`](verification-artifacts/live-offline-mobile.png).
- Lighthouse mobile: Performance 100, Accessibility 100, Best Practices 100, SEO 100. FCP 1.07 s, LCP 1.45 s, TBT 49.5 ms, CLS 0.0007, total transfer 111,574 bytes. Evidence: [`lighthouse-mobile.json`](verification-artifacts/lighthouse-mobile.json).
- Production budgets: JS 25.01 kB raw / 8.96 kB gzip; CSS 17.11 kB raw / 4.75 kB gzip; fonts 70.24 kB total; mobile hero 25.25 kB.
- The visual system is product-specific and documented; original generated imagery provenance is recorded. Its intentionally single night treatment is explicit in the design thesis.

## Required next work

1. Rerender the invalid-room branch so malformed invite links show the existing plain-language error and recovery link; add a browser regression test.
2. Derive rate-limit identity only from trusted ingress metadata, bound/expire the bucket map, and test that a client-supplied forwarding header cannot reset the allowance.
3. Remove the 6–10 minute claim or add it to `claims.json` with a credible measured test. Inventory and map every other public README/UI claim, and make the tagged tests prove the complete stated outcome.
4. Expose an immutable backend build identifier (commit/image digest) from health or response headers and deploy it with the candidate.
5. Replace raw “Failed to fetch” with a plain explanation and retry instruction; return an actual HTTP 404 for unknown routes.
