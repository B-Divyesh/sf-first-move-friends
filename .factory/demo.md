# Demo sandbox

## Entry point

Use `https://first-move-friends.sociobot.in/demo`. Locally, run the browser and room services, then open `http://127.0.0.1:4173/demo`.

## Sample state

The demo uses deterministic seed `sample42` and starts on move one with an empty board. It presents all three teaching turns. The visitor plays Sun and the browser chooses a validated Moon reply.

## Isolation

Demo progress uses `localStorage` key `demo:game`; its sound choice uses `demo:settings`. Local games use `real:` keys. Online player keys use `room:<code>:token`. Demo rendering never reads or writes either namespace.

“Reset demo” removes only `demo:game` and rebuilds the empty sample. “Start for real” discards the demo state, creates an isolated expiring online room, and opens it as Sun.

## Verification

Every command in `.factory/claims.json` starts at `/demo` in a fresh browser context. Run all deterministic, room-service, and browser checks with `npm test`.
