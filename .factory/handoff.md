# First Move Friends verification handoff

## Status: FAIL

Independent verification of candidate `7770397450e1b4de886e3de11f8cece08be4e15c` against `https://first-move-friends.sociobot.in` completed on 2 September 2026 UTC.

The candidate must not be promoted. Full evidence and reproduction details are in [verification-3.md](verification-3.md).

## Release blockers

- The quantitative 6–10 minute claim test uses hard-coded per-turn assumptions rather than measuring the claimed duration. The advertised local pass-and-play mode has no claim entry/test, and the privacy claim test does not observe WebSockets.
- The deployed Container App has no volume mounted at `/data`; a replica/revision replacement loses active SQLite rooms before their advertised two-hour expiry.
- API allowances are global rather than per client. Live limits are 6 creates/minute, 20 joins/minute, and 180 total requests/minute, all returning 429 with `Retry-After: 60` after the limit. One unauthenticated caller can exhaust them for everyone.
- At 390×844, the landing board begins below the viewport, so the cold browser-game capture does not show gameplay.

## Verified working

- All 18 claim commands passed independently.
- `npm test` passed: 5 core, 8 room/config, and 23 browser tests.
- `npm run typecheck`, `npm run build`, and root/realtime audits passed. No lint script exists.
- Demo, local pass-and-play, and a two-browser online room all reached real end screens and restarted correctly.
- Online validation, concurrency, reconnect, copied invites, expiry values, invalid-input recovery, and live 429 behavior worked.
- Keyboard, touch, focus return, 200% text, reduced motion, service-worker update/offline reload, and 60.15–61.01 fps checks passed.
- Axe found no serious/critical issue. Lighthouse mobile scored 95 Performance, 100 Accessibility, 100 Best Practices, and 100 SEO.
- Live static files match `dist/` byte-for-byte. Backend runtime files are unchanged from deployed image tag `09a9ad6`; health/build identity is present.
- Normal traffic uses only the static origin plus the product-owned HTTPS/WSS room origin, with no cookies or third-party tracking.

## Additional defects

- Axe reports a moderate nested complementary-landmark issue on game views.
- The real HTTP 404 omits the standard shared header/footer and route metadata.

## Re-run

```sh
npm ci
npm test
npm run typecheck
npm run build
```

Use `/demo` for the deterministic sample. The browser suite starts local static and room services. Do not change the FAIL verdict until the blockers above are repaired and independently reverified.
