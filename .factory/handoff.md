# First Move Friends independent verification handoff

## Verdict: FAIL

Candidate 0544b383671efaed83ac44955e6d887af1217f83 was tested locally and at https://first-move-friends.sociobot.in on 2 September 2026 UTC. The deployed HTML, JavaScript, CSS, and service worker match the candidate byte-for-byte. This is not a deployment-only failure.

Do not promote the candidate. The required invitation-based two-player game is absent. Two independent clients on the same setup URL diverged immediately: after client A placed a tile, A showed 1 tile and client B showed 0, including after B reloaded. The build has no room service, synchronized state, server turn validation, expiring unguessable code, or API rate limit.

Additional release blockers:

- A crafted seed query is inserted as HTML. It can add headings or turn the trusted game UI into outbound links.
- The claim commands pass, but seven claim tests bypass /demo and visitor-facing duration, setup-link, touch, and reduced-motion claims are absent from claims.json.

Other defects:

- Incomplete saved state can blank /play with an uncaught error.
- The demo starts at Move 5 and skips the defining three-turn tutorial.
- Several demo, home, and footer touch targets are smaller than 44 by 44 pixels.
- Closing Pause with Escape leaves focus on body instead of returning to the trigger.

## Verification summary

- npm ci: PASS, 0 vulnerabilities reported.
- All 11 claims.json commands: PASS individually.
- npm test: PASS, 4 unit and 12 Playwright tests.
- npm run build: PASS; TypeScript check included; dist/ produced.
- Lint: not available in package.json.
- Live deterministic game: PASS for local title-to-play-to-end-to-rematch flow; Moon won the observed run 12–11.
- Persistence, sound, pointer, touch, keyboard, reduced motion, and offline reload: PASS for normal state.
- Live privacy log: same-origin requests only; no analytics, ads, third-party scripts, API, sign-in, payment, or WebSocket traffic.
- Worker verify-url.sh: PASS with no normal-load console errors.
- axe serious/critical: 0 across six routes at desktop and 390-pixel mobile.
- Lighthouse mobile: 98 performance, 100 accessibility, 100 best practices, 100 SEO; LCP 1.4 s, CLS 0.001, TBT 160 ms.
- Live frame callback measurement: 61 callbacks in 1009.5 ms.
- Bundles: 19.07 KB JS, 16.78 KB CSS, 70.24 KB fonts, 25.25 KB mobile hero.

Full evidence, reproductions, hashes, and required next work are in .factory/verification.md.

## Re-run

    npm ci
    npm test
    npm run build
    /opt/fleet/lib/verify-url.sh https://first-move-friends.sociobot.in test-results/verification

No product code was modified during verification.
