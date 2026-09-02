# Demo sandbox

## Entry point

Use `/demo` or `?demo=1` is not required. The canonical verifier URL is:

`https://first-move-friends.sociobot.in/demo`

Locally, run `npm run dev` and open `http://localhost:5173/demo`.

## Sample state

The demo uses seed `sample42`. It begins with four legal placements already on the board. Sun is the visitor and Moon chooses a validated reply after each Sun move. The sample goal, marks, scores, and bot choices are deterministic.

## Isolation

Demo game progress is stored only in `localStorage` key `demo:game`. Its sound setting is stored in `demo:settings`. Real games use `real:game` and `real:settings`. Demo rendering never reads or writes those real keys.

“Reset demo” removes `demo:game` and immediately rebuilds the four-move sample. “Start for real” removes demo game progress, creates a new real seed, and opens `/play`.

## Verification

Run:

```sh
npm run test:e2e -- --grep @claim:demo-sandbox
```

The test creates real progress, plays in the demo, verifies the real key is unchanged, and resets the sample to four moves.
