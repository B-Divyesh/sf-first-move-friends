# First Move Friends handoff

## What shipped

- A complete deterministic 4×4 lantern-placement game for two people sharing one screen.
- Three guided opening turns, server-style core validation, three seeded public goals, shuffled tile marks, scoring, win/draw results, and one-tap rematches.
- A one-click `/demo` sandbox seeded with four sample moves. The visitor plays Sun and the local Moon bot answers automatically.
- Pointer, touch, keyboard, pause, sound, refresh recovery, offline recovery, mobile layout, and reduced-motion behavior.
- Landing, play, demo, privacy, terms, SPA 404, metadata, social image, sitemap, robots, security headers, and service worker.
- An original generative-geometry lantern scene. Source prompt and review notes are in `assets/src/` and `.factory/design.md`.
- Claim-mapped unit and Playwright coverage. Each public claim has one `@claim:` test in `.factory/claims.json`.

## Run and verify

```sh
npm install
npm test
npm run build
npm run preview
```

The production build command is exactly `npm run build`. Output lands in `dist/`, with `dist/index.html` at its root.

Final local verification on 2026-09-02:

- `npm test`: passed — 4 Vitest tests and 12 Playwright tests.
- `npm run build`: passed.
- Production bundle: 19.07 KB JavaScript / 7.16 KB gzip; 16.78 KB CSS / 4.69 KB gzip.
- Self-hosted fonts: 69 KB total. Shipped hero WebP: 50 KB desktop and 25 KB mobile.
- `npm audit --omit=dev`: 0 vulnerabilities.
- Worker `verify-url.sh`: passed; no console errors, one `h1`, `lang`, `main`, and no missing alt or button labels.
- Playwright axe checks: no serious or critical findings across landing, demo, privacy, terms, and 404 at 390×844.
- Lighthouse mobile: Performance 99, Accessibility 100, Best Practices 100, SEO 100.
- Lighthouse metrics: FCP 1.1 s, LCP 1.5 s, CLS 0.001, TBT 140 ms.
- Animation claim: at least 50 `requestAnimationFrame` callbacks per second in Playwright Chromium.

Local screenshots and JSON reports were written to `.factory/evidence/` and intentionally ignored by Git.

## Storage and privacy

- Real state: `real:game` and `real:settings` in localStorage.
- Demo state: `demo:game` and `demo:settings` in localStorage.
- There are no third-party runtime requests, analytics, accounts, ads, or payment code.
- The service worker caches only same-origin game files.

## Known gap

The researched brief asks for remote invitation rooms with server-validated turns. The injected work order specifies a static deployment. Static hosting cannot securely synchronize or validate remote turns, so this v1 is an honest pass-and-play game on one shared screen. “Copy setup link” shares only the deterministic goal and tile order; it does not synchronize progress.

A later remote version needs a product-owned WebSocket service, unguessable expiring room codes, authoritative turn validation, reconnection handling, and SQLite state under `/data`. No third-party realtime service should be added.
