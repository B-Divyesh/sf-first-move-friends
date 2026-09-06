# First Move Friends verification 7 handoff

## Status

**PASS — independent verification completed.** The live browser game has zero findings and zero untested claims.

- Live URL: <https://first-move-friends.sociobot.in>
- Static implementation: `cbf3184256899d41fe7141f89e25bd6808216362`
- Room-service implementation: `994d00f16359c86470add1b9a64d4148fd65de72`
- Documentation candidate verified: `7322284b59c11b3e05890c6e3e6c44d40c9197da`
- Full report: `.factory/verification-7.md`

No product code, deployment, service configuration, or real user data changed. This handoff and the verification evidence are the only repository changes.

## What was verified

Fresh live desktop Chromium, 390×844 Chromium touch, and 390×844 WebKit 26.0 contexts showed the job, audience, first action, and complete game preview before scrolling. The repaired WebKit board bottom is `835.2645263671875px` inside the `844px` viewport.

The one-click sample kept its persistent sandbox label, produced Sun and automatic Moon output, reset without changing a seeded `real:` value, reached “Moon wins 25–12,” and rematched to an empty board. Fresh local and two-client online runs reached real end screens and rematched. A separate live Moon client restored the shared placement after reload.

Keyboard, touch, pause focus, saved sound, non-color player cues, reduced motion, 200% text, offline reload, service-worker update, invalid invite, controlled outage, internal links, route titles, legal pages, expected HTTP 404, and privacy request origins passed.

Live backend checks passed health/build identity, cross-room rejection, two-hour expiry, and the six-success then 429 boundary with `Retry-After: 60`. SQLite cleanup, isolated allowance, and same-directory restart persistence passed locally without restarting the live service.

## How to verify

Requires Node.js 22 or newer and Playwright 1.58.2 browser binaries and host libraries.

```sh
npm ci
(cd realtime && npm ci)
npx playwright install webkit
npx playwright install-deps webkit
npm run lint
npm run typecheck
npm test
npm run build
npm run verify:live
```

Run each exact command in `.factory/claims.json` separately for the claim gate. The `match-length` command intentionally takes just over six minutes.

Verification-7 results:

- Root and room-service high-severity audits: zero vulnerabilities.
- Core tests: 5/5.
- Room-service tests: 9/9.
- Browser tests: 27/27 in 7.3 minutes, including the dedicated WebKit phone regression.
- Declared claim commands: 21/21.
- Production output: JavaScript 26.72 kB raw / 9.42 kB gzip; CSS 18.01 kB raw / 4.96 kB gzip.
- Live URL verifier: pass, no browser errors.
- Standalone Axe and live Playwright Axe: zero violations.
- Mobile Lighthouse: 100 Performance, 100 Accessibility, 100 Best Practices, 100 SEO; LCP 1.5 s; CLS 0.001.
- Desktop Chromium frame samples: 62, 61, and 61 callbacks per second.

## Live identity

The clean production build matches live byte-for-byte:

| Artifact | SHA-256 |
| --- | --- |
| `index.html` | `c792198ba219794ffe9f54a7f292efb0169b1c83f758406b3bfd8fab886a2c84` |
| `404.html` | `3b6582560f8fa330c72cf6e38734d39ce8e9e12a8d707af456dcaf396a1d11e4` |
| `assets/index-C476KrDC.js` | `0a86025b8b89896b97111dfa6a74c7b34156642687be265ab213bd95a99b243a` |
| `assets/index-C_XrV5Jg.css` | `ee8d9a7f90edd271efa2aa1bcab6e26f8b8dbf3734ce47ceb2d34a3f4bea3723` |

## Evidence and next steps

Repository evidence is in `.factory/verification-7-artifacts/`. The required report copies are `/work/.evidence/qa-report.md` and `/work/.evidence/qa-result.json`; URL, Axe, and Lighthouse output is also under `/work/.evidence/`.

There are no known product gaps and no required next step.
