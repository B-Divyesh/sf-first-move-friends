# First Move Friends independent verification handoff

## Verdict: FAIL

Candidate `8b7ad4fb0733e56bb0c7a3476f583b55345f374a` was independently tested on 2 September 2026 at `https://first-move-friends.sociobot.in`. Do not promote it.

The repaired online game now works end to end: two independent clients join one opaque two-hour room, complete 16 synchronized server-validated moves, reach the same result, reload the saved board, and reset together for a changed rematch. The demo, local mode, keyboard/touch controls, offline reload, privacy boundaries, accessibility baseline, and performance budgets also pass.

Release blockers remain:

1. `/play?room=bad` stays on “Connecting to the room…” forever and offers no recovery action.
2. Creation/join rate limits trust the caller-controlled first `X-Forwarded-For` value. Fixed values receive `429` with `Retry-After: 60` after 6 creations or 20 joins, but changing only that header immediately bypasses the limit.
3. The deployed raw HTML still claims a 6–10 minute match without a claims-manifest entry or test. Several README claims are also unmapped or incompletely covered, including the full keyboard controls and SQLite cleanup statement.
4. The live room service exposes no commit, image digest, or build version, so its match to this candidate cannot be proven. Static asset hashes do match exactly.

Additional issues: a simulated room-service outage shows only “Failed to fetch”; unknown application routes render the 404 design with HTTP 200; and README omits the required intended session length.

## Verification summary

- `npm ci`: passed, 0 vulnerabilities.
- All 14 claim commands: passed individually.
- `npm test`: passed — 5 Vitest, 2 Node integration, 19 Playwright tests.
- `npm run build`: passed, including `tsc --noEmit`; `dist/` emitted.
- No lint script exists.
- Root and realtime audits: 0 vulnerabilities.
- Live deterministic demo: completed at 16 tiles, Moon 25–12; rematch reset and changed setup.
- Live online match: both clients completed at Moon 15–14; reload and synchronized rematch passed.
- Live axe: no serious/critical findings on six routes at desktop and 390 px.
- Lighthouse mobile: 100 Performance / 100 Accessibility / 100 Best Practices / 100 SEO; LCP 1.45 s, TBT 49.5 ms, CLS 0.0007; 111,574 bytes transferred.
- Live frame samples: 60.15–60.91 fps.
- PWA: active service worker, clean update check, successful offline reload and touch move.
- Privacy: no cookies; demo requests same-origin only; online requests only static plus the product-owned room service.

Full findings, hashes, claim results, and evidence paths are in `.factory/verification-2.md`. Screenshots, Lighthouse JSON, and `verify-url.sh` output are in `.factory/verification-artifacts/`.

No product code or infrastructure was changed.
