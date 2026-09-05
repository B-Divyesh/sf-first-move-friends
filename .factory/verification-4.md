# Verify a guided two-player tile game — round 4

## Verdict: FAIL

- Finding count: **1** (minor)
- Untested claim count: **0**
- Live URL: <https://first-move-friends.sociobot.in>
- Verified: 5 September 2026 UTC
- Implementation reviewed: `994d00f16359c86470add1b9a64d4148fd65de72`
- Documentation and verification candidate: `cb934f594fb867ebaf7eb6659a000eebb294b330`

Do not promote this candidate unchanged. The game, its backend, and all declared claims passed independent verification, but the static and in-app 404 headings violate the required plain-words contract. The verdict is FAIL because acceptance requires zero findings at every severity.

No product source or infrastructure configuration was changed during verification. The live rate-limit check created six temporary, expiring test rooms only.

## Finding

### Minor — the 404 heading uses a metaphor instead of saying what happened

Both the static 404 page and the SPA fallback use the `<h1>` “This lantern is off the board.” This is a metaphorical mood heading, not a direct page label. The plain-words contract requires headings to carry usable information and explicitly prohibits metaphor or mood headings. A person following a broken link should receive the direct heading “Page not found.”

Evidence: live `GET /does-not-exist` returned the intended HTTP 404 with one `<h1>` containing that text; `public/404.html:32` and `src/main.ts:400` contain the two implementations. The response itself, shared skeleton, route title, recovery link, and accessibility are otherwise correct.

Required repair: replace that heading in both locations with “Page not found,” then rerun the 404 route and accessible-structure regressions.

## First screen and product run

Fresh desktop (1440×900) and phone (390×844) browser contexts loaded the live home at scroll position zero.

- Job: “Play a tile duel you learn together.”
- Audience: pairs who want a short game without accounts or a rulebook wall.
- First action: “Try it with sample data,” which opens `/demo` in one click.
- The playable board, goal, scores, turn state, and board cells were visible before scrolling on both screens. The phone board bottom was 840.3 px in an 844 px viewport.

The live verifier completed a local pass-and-play match (16 placements, `Moon wins 13–10`) and an independent two-browser online match (16 synchronized placements, `Moon wins 24–16`). Both end screens offered a rematch that reset to zero placements. The demo banner remained present, Reset demo preserved the separate real-data namespace, and the demo started from the empty guided opening.

Keyboard Tab, ArrowRight, Space, and Enter operated the board. Touch worked at 390 px. Pause focus returned to its trigger, reduced-motion behavior passed, text at 200% had no horizontal overflow, and an offline controlled `/demo` reload remained playable after the first visit.

## Claims and clean checkout gates

Starting candidate: `cb934f594fb867ebaf7eb6659a000eebb294b330`, with a clean tracked tree.

```sh
npm ci
npm audit --audit-level=high
npm run lint
npm run typecheck
(cd realtime && npm ci && npm audit --audit-level=high)
npm test
npm run build
```

All commands passed. `npm test` reported 5 unit tests, 9 room/config integration tests, and 25 browser tests. The fresh production build emitted `dist/`; JavaScript was 26.73 kB raw / 9.43 kB gzip and CSS was 17.99 kB raw / 4.97 kB gzip.

Every one of the 21 commands in `.factory/claims.json` was then run separately from the clean setup. All passed, including `@claim:match-length` in 6.2 minutes. The individual command log ended `ALL_CLAIM_COMMANDS_PASSED`; no registered claim is untested.

## Live routes, accessibility, privacy, and backend

- Live `/`, `/demo`, `/play`, `/privacy`, and `/terms` returned 200 with route-specific titles, one h1, main, header, and footer. Invalid `/play?room=bad` showed “This invite link is not valid” and “Start a new game.”
- A deliberate unknown URL returned HTTP 404. Its shared skeleton and axe result were correct; the finding above is about its heading wording, not its expected 404 status.
- `npm run verify:live` passed with zero console/page errors and zero axe violations on the phone home, Privacy, Terms, static 404, and unknown-route 404. It also confirmed the service worker, offline recovery, keyboard play, local recovery, real two-client online play, WebSocket-only updates, and no requests beyond the static and product-owned realtime origins.
- The live room service health endpoint returned 200 and build id `994d00f16359c86470add1b9a64d4148fd65de72`, matching the implementation reviewed. A live create allowance check returned 201 six times, then 429 with `Retry-After: 60` on the seventh request.
- The clean `@claim:two-players` regression exercised isolated player keys, authoritative turn rejection, reconnect, invite seating, and same-room state. `@claim:durable-room-restart` stopped and restarted the service against the same SQLite data directory and restored the placement and version. `@claim:client-rate-limits` proved isolated allowance buckets and that spoofed left-side forwarding values do not evade the bucket.
- Fresh local `dist/` hashes matched the live HTML, JS, and CSS exactly: index `5cd7c8f8…a078`, JS `103f9899…2192`, CSS `853b2e2f…41eb`.

## Earlier findings disposition

| Earlier finding | Current disposition |
| --- | --- |
| No real remote invitation play | Fixed: two fresh browser contexts completed a synchronized online match. |
| Unsafe seed rendering and invalid saved state | Fixed: clean browser regression passed with crafted seed text and malformed saved state recovery. |
| Demo skipped the guided opening | Fixed: empty `sample42` begins with the three teaching turns. |
| Small touch targets and pause focus loss | Fixed: target-size and pause-focus browser regressions passed. |
| Malformed invite and outage recovery | Fixed: invalid link and outage regressions pass with direct recovery actions. |
| Unlisted or incomplete claims | Fixed: 21 registered claims, each with exactly one tag; all declared commands passed independently. |
| Unmeasured match length and unregistered local mode | Fixed: local mode is registered and the measured claim took 6.2 minutes. |
| Privacy regression missed WebSockets | Fixed: regression and live verifier record WebSocket origins. |
| Global request allowance | Fixed: live sixth/seventh create boundary and isolated-client regression pass. |
| No durable room mount/restart recovery | Fixed by the durable snapshot implementation; clean restart claim and prior deployed-volume evidence pass. |
| Mobile first screen hid the game | Fixed: the full board ends at 840.3 px on the 390×844 fresh view. |
| Nested complementary landmark | Fixed: axe reported zero violations. |
| 404 lacked shared structure | Fixed: live 404 has header, nav, main, footer, metadata, and zero axe violations. |
| Plain-words 404 heading | **Open minor finding** recorded above. |

## Evidence

Current live evidence is in `.factory/repair-artifacts/live-verification.json` and its accompanying desktop, mobile, local-end, online-end, and offline screenshots. The 404 wording was independently read from the live route and the two source locations named above.
