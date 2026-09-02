# First Move Friends

Play a guided 4×4 lantern duel with a friend on one screen or two.

First Move Friends is a free two-player browser game. Place 16 lanterns around one public goal. The first three turns mark useful cells, so new players learn during the match. Online games use a private expiring room; local games work on one shared screen.

Intended session length: 6–10 minutes for one 16-turn match. The end screen records the measured match time.

## Try the demo

Open `/demo`, or run the site and visit `http://localhost:5173/demo`. The sample begins at the first tutorial move. You play Sun while the browser makes Moon’s validated move. The banner remains visible, and demo progress uses only `demo:` storage keys.

## Play online

Choose “Start an online game” and send the invite link to one friend. The private room expires two hours after creation. The room service validates the player, turn, board cell, and state version before saving a move. Refreshing either screen reconnects it with its local player key.

The static site stays at `first-move-friends.sociobot.in`. Its product-owned room service is `first-move-friends-realtime.sociobot.in`. A durable fleet-managed volume mounts its SQLite data at `/data`.

## Play on one screen

Choose “Play on one screen” and pass the device after each turn. Sun and Moon alternate on the same saved board. Refresh restores the match. The scored end screen offers a one-tap rematch.

## Controls

- Pointer or touch: choose any cell marked “Place”.
- Keyboard: Tab to the board, use arrow keys between legal cells, then press Enter or Space.
- Pause: choose “Pause match”. Escape or “Resume match” returns focus to the Pause control.
- Sound: choose “Sound on” or “Sound off”. The choice is stored on this device.

## Run and verify

Requires Node.js 22 or newer.

```sh
npm ci
npm test
npm run typecheck
npm run lint
npm run build
npm run preview
```

The room service can be run separately:

```sh
DATA_DIR=.data PORT=4174 node realtime/server.mjs
```

`npm test` runs deterministic core tests, room API integration tests, and Playwright browser tests. The production build writes the static artifact to `dist/`.

## Deploy

Deploy `dist/` to the product’s static host. Build the product-owned room service from the repository root with `realtime/Dockerfile`. Set `deploy.data_dir` to `/data` so the fleet mounts `sf-first-move-friends-realtime-data`. Pass an immutable source or commit identifier as the `BUILD_ID` build argument. The factory owns DNS and shared infrastructure.

## Privacy and accessibility

There are no accounts, analytics, ads, or third-party runtime scripts. Local and demo progress stays in localStorage. Online moves and opaque player keys go only to the product-owned room service. Request allowances are isolated by the client address observed by the trusted ingress. Expired rooms are removed from its SQLite database.

Sun and Moon use symbols and border styles as well as color. The board supports keyboard and touch input. Reduced-motion mode removes movement and transitions. The saved demo works offline after its first visit; online rooms need a connection.

## Project notes

- `.factory/brief.json` records the product scope.
- `.factory/design.md` records the visual system and asset provenance.
- `.factory/claims.json` maps each visitor-facing claim to one browser test.
- `.factory/demo.md` documents the isolated sample mode.
- `.factory/handoff.md` records verification and deployment evidence.

## License

MIT. The self-hosted Fraunces and Atkinson Hyperlegible fonts use the SIL Open Font License.
