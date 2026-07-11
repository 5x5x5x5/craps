# Craps Tutorial Webapp

Educational vanilla-JS simulator for learning craps. No build step — open `index.html` directly or serve with any static server.

## Files
- `index.html` — table layout, dice, betting controls
- `styles.css` — felt-table visuals
- `game.js` — pure rules engine (no DOM). State machine with `come-out` and `point` phases. `applyRoll` resolves every bet for a roll against pre-roll state; `simulateBet` measures house edge empirically.
- `tutorial.js` — guided tutorial steps and bet explanations
- `main.js` — wires the UI to the game engine
- `test_game.js` — assert-based checks: rules, payout math, don't-pass ordering regression, money-conservation fuzz
- `package.json` — only `{"type": "module"}` so Node runs the ES-module test file

## Scope
Focused bet set: Pass, Don't Pass, Pass Odds, Field, Place 4/5/6/8/9/10. Skips props/hardways/come bets to keep the tutorial digestible.

## Running
`python3 -m http.server 8000` then open http://localhost:8000

Checks: `node test_game.js`
