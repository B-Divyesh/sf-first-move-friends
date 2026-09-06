# First Move Friends repair-5 handoff

## Status

**PASS — repaired and deployed.** The browser game is live at <https://first-move-friends.sociobot.in>.

- Implementation commit: `cbf3184256899d41fe7141f89e25bd6808216362` (`fix: keep phone preview square in webkit`).
- Unchanged room-service implementation: `994d00f16359c86470add1b9a64d4148fd65de72`.
- Static deployment: production `dist/` only. No backend, SQLite volume, DNS, app settings, or replica configuration changed.
- Job: casual pairs play a guided 4×4 lantern-placement duel together without an account or rulebook wall.
- First action: **Try it with sample data** opens the empty, guided sample match in one click.

## Repair

Verification-6 found that WebKit 26.0 made the home-preview board 10 px taller than its width at 390×844. The board bottom landed at `845.2638549804688`, clipping 1.26 px.

`.board` now derives its square from its definite width (`aspect-ratio: 1`) rather than a percentage height in the padded board shell. This avoids WebKit resolving the percentage against the shell border box.

`tests/e2e/webkit-phone-layout.spec.ts` runs in a separate WebKit 26.0, touch-enabled project. It opens a fresh 390×844 home page and asserts the rendered preview board bottom is at or above the actual viewport height. This is an observable layout outcome, not a source assertion.

Fresh live WebKit result: board bottom `835.2645263671875` in an `844` px viewport, leaving 8.74 px visible space. A fresh Chromium desktop result ended the preview board at `788.40` px in a 1440×900 viewport. Both loaded at scroll position zero and showed:

- Job: “Play a tile duel you learn together.”
- Audience: “For pairs who want a short game without accounts or a rulebook wall.”
- First action: “Try it with sample data.”

## Verification

From the documented clean setup, root and room-service `npm ci` and both high-severity audits passed with zero vulnerabilities.

```sh
npm run lint
npm run typecheck
npm test
npm run build
```

- Lint and TypeScript checks passed.
- `npm test` passed 5 deterministic core tests, 9 room-service integration tests, 26 Chromium browser tests, and the dedicated WebKit layout regression (27 browser tests total).
- Every one of the 21 exact commands in `.factory/claims.json` was run separately and passed. The browser wall-clock `@claim:match-length` run completed its 6–10 minute measurement rather than calculating a synthetic duration.
- The clean production build emitted JavaScript `26.72 kB` raw / `9.42 kB` gzip and CSS `18.01 kB` raw / `4.96 kB` gzip.
- `/opt/fleet/lib/verify-url.sh` passed against live HTTPS: HTTP 200, correct title and language, one h1, one main landmark, complete labels and image alternatives, and no browser errors.
- The live Playwright verifier passed: fresh desktop and 390×844 contexts; sample banner/reset isolation; keyboard; 200% text; offline reload; local match/reload/rematch; two independent online clients through a 16-placement game and rematch; product-only HTTPS/WSS origins; Privacy, Terms, static 404, and the expected HTTP 404 route.
- Live Axe checks in the product verifier found zero violations on the phone home, legal pages, static 404, and missing-route 404. Standalone `@axe-core/cli` also reported zero violations on live home.
- Lighthouse mobile against live scored Performance 100, Accessibility 100, Best Practices 100, SEO 100; FCP 1.1 s, LCP 1.5 s, TBT 10 ms, CLS 0.001, transfer 110 KiB.

## Live artifact identity

The deployed static files match the clean production build byte-for-byte:

| Artifact | SHA-256 |
| --- | --- |
| `index.html` | `c792198ba219794ffe9f54a7f292efb0169b1c83f758406b3bfd8fab886a2c84` |
| `assets/index-C476KrDC.js` | `0a86025b8b89896b97111dfa6a74c7b34156642687be265ab213bd95a99b243a` |
| `assets/index-C_XrV5Jg.css` | `ee8d9a7f90edd271efa2aa1bcab6e26f8b8dbf3734ce47ceb2d34a3f4bea3723` |

## Earlier findings disposition

All prior verification and review findings remain repaired: real private invitation play; server validation and reconnection; safe saved-state and seed recovery; separate empty guided sample/reset; 44 px targets; pause focus return; clear invalid-invite and outage recovery; complete registered claims with measured duration; WebSocket privacy coverage; client-isolated rate allowance; durable SQLite restart; first-screen game visibility; accessible landmark structure; and direct shared-skeleton HTTP 404 pages.

The only verification-6 finding, WebKit’s 1.26 px phone-board clipping, is repaired by this release and has a WebKit-specific regression.

## Evidence and known gaps

Current live evidence is in `.factory/repair-artifacts/live-verification.json` and the accompanying local/online end-screen images. Cold desktop and WebKit phone captures, URL-check output, Lighthouse JSON, and the standalone Axe output are stored under `/work/.evidence/` for this repair.

There are no known product gaps. The paid offer is not applicable: the researched brief defines this game as free, and the site contains no checkout or entitlement flow.
