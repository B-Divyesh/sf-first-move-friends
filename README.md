# First Move Friends

Play a guided 4×4 lantern duel with a friend.

First Move Friends is a free, local two-player browser game. Two people share one screen and place 16 lanterns. The first three turns mark useful cells, so new players learn during the match. One public goal and a shuffled tile order change each rematch.

The shipped static v1 is pass-and-play. It does not synchronize remote players. See [Known gap](#known-gap) below.

## Try the demo

Open `/demo`, or run the site and visit `http://localhost:5173/demo`. The sample starts after four realistic moves. You play Sun while the browser plays Moon. A banner explains that demo progress uses separate storage.

## Controls

- Pointer or touch: choose any cell marked “Place”.
- Keyboard: Tab to the board, use arrow keys between legal cells, then press Enter or Space.
- Pause: choose “Pause match”. Progress is restored after refresh.
- Sound: choose “Sound on” or “Sound off”. The choice is stored on this device.

## Run and verify

Requires Node.js 20 or newer.

```sh
npm install
npm run dev
npm test
npm run build
npm run preview
```

The exact production build command is `npm run build`. It writes `index.html` and all static assets to `dist/`.

## Privacy and accessibility

The game has no accounts, analytics, ads, or third-party runtime scripts. Current progress and settings use localStorage. After one online visit, the installed game shell works offline. Sun and Moon use distinct symbols and border styles as well as color. The board supports keyboard play and reduced motion.

## Project notes

- `.factory/brief.json` records the product scope.
- `.factory/design.md` records the visual system and asset provenance.
- `.factory/claims.json` maps each product claim to a test.
- `.factory/demo.md` documents the isolated sample mode.
- `.factory/handoff.md` records verification and remaining work.

## Known gap

The brief calls for remote invitation rooms with server-validated turns. This work order deploys a static site, so v1 provides a seeded setup link and same-screen play. A product-owned WebSocket service is required before describing play as remote multiplayer.

## License

MIT. The self-hosted Fraunces and Atkinson Hyperlegible fonts use the SIL Open Font License.
