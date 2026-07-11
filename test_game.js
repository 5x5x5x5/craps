// Assert-based checks: engine rules, payout math, the don't-pass ordering
// regression, and a money-conservation fuzz. Run: node test_game.js
import assert from "node:assert/strict";
import {
  PHASE,
  initialState,
  applyRoll,
  resolvePassLine,
  resolveDontPass,
  resolvePassOdds,
  resolveField,
  resolvePlace,
  simulateBet,
} from "./game.js";

// Deterministic rng so the statistical checks can't flake.
function lcg(seed) {
  let x = seed >>> 0;
  return () => {
    x = (Math.imul(x, 1664525) + 1013904223) >>> 0;
    return x / 4294967296;
  };
}

function comeOut(bets = {}) {
  const s = initialState(500);
  Object.assign(s.bets, bets);
  return s;
}

function pointPhase(point, bets = {}) {
  const s = comeOut(bets);
  s.phase = PHASE.POINT;
  s.point = point;
  return s;
}

// --- Pass line ---
for (const t of [7, 11]) {
  const r = resolvePassLine(comeOut({ pass: 10 }), t);
  assert.deepEqual([r.outcome, r.profit], ["win", 10], `pass come-out ${t}`);
}
for (const t of [2, 3, 12]) {
  const r = resolvePassLine(comeOut({ pass: 10 }), t);
  assert.deepEqual([r.outcome, r.profit], ["loss", -10], `pass come-out ${t}`);
}
for (const t of [4, 5, 6, 8, 9, 10]) {
  const r = resolvePassLine(comeOut({ pass: 10 }), t);
  assert.equal(r.outcome, "point-set", `pass come-out ${t}`);
  assert.equal(r.newPhase, PHASE.POINT);
  assert.equal(r.newPoint, t);
}
assert.equal(resolvePassLine(pointPhase(6, { pass: 10 }), 6).outcome, "win");
assert.equal(resolvePassLine(pointPhase(6, { pass: 10 }), 7).outcome, "loss");
assert.equal(
  resolvePassLine(pointPhase(6, { pass: 10 }), 5).outcome,
  "no-action",
);

// --- Don't pass ---
for (const t of [2, 3])
  assert.equal(resolveDontPass(comeOut({ dontPass: 10 }), t).outcome, "win");
assert.equal(resolveDontPass(comeOut({ dontPass: 10 }), 12).outcome, "push");
for (const t of [7, 11])
  assert.equal(resolveDontPass(comeOut({ dontPass: 10 }), t).outcome, "loss");
assert.equal(
  resolveDontPass(comeOut({ dontPass: 10 }), 4).outcome,
  "point-set",
);
assert.equal(
  resolveDontPass(pointPhase(6, { dontPass: 10 }), 7).outcome,
  "win",
);
assert.equal(
  resolveDontPass(pointPhase(6, { dontPass: 10 }), 6).outcome,
  "loss",
);
assert.equal(
  resolveDontPass(pointPhase(6, { dontPass: 10 }), 9).outcome,
  "no-action",
);

// --- Payout math (true odds vs place) ---
assert.equal(resolvePassOdds(pointPhase(4, { passOdds: 30 }), 4).profit, 60); // 2:1
assert.equal(resolvePassOdds(pointPhase(9, { passOdds: 30 }), 9).profit, 45); // 3:2
assert.equal(resolvePassOdds(pointPhase(8, { passOdds: 30 }), 8).profit, 36); // 6:5
assert.equal(resolvePassOdds(pointPhase(8, { passOdds: 30 }), 7).profit, -30);
assert.equal(resolvePlace(pointPhase(6, { place4: 30 }), 4).place4.profit, 54); // 9:5
assert.equal(resolvePlace(pointPhase(6, { place5: 30 }), 5).place5.profit, 42); // 7:5
assert.equal(resolvePlace(pointPhase(4, { place6: 30 }), 6).place6.profit, 35); // 7:6

// --- Field ---
for (const [t, profit] of [
  [2, 60],
  [12, 60],
  [3, 30],
  [4, 30],
  [9, 30],
  [10, 30],
  [11, 30],
  [5, -30],
  [6, -30],
  [7, -30],
  [8, -30],
]) {
  assert.equal(
    resolveField(comeOut({ field: 30 }), t).profit,
    profit,
    `field ${t}`,
  );
}

// --- Regression: don't pass resolves against PRE-roll state (the bug) ---
{
  // Come-out roll sets a point → don't pass must survive.
  const r = applyRoll(comeOut({ dontPass: 10 }), 6);
  assert.equal(
    r.state.bets.dontPass,
    10,
    "don't pass must survive come-out point-set",
  );
  assert.equal(r.state.phase, PHASE.POINT);
  assert.equal(r.state.point, 6);
  assert.equal(r.state.bankroll, 500);
}
{
  // Shooter makes the point → don't pass must lose.
  const r = applyRoll(pointPhase(6, { dontPass: 10 }), 6);
  assert.equal(
    r.state.bets.dontPass,
    0,
    "don't pass must lose when point is made",
  );
  assert.equal(r.state.bankroll, 500); // stake gone, nothing back
}
{
  // Seven out → don't pass wins even money.
  const r = applyRoll(pointPhase(6, { dontPass: 10 }), 7);
  assert.equal(r.state.bets.dontPass, 0);
  assert.equal(r.state.bankroll, 520); // stake + 1:1 profit
  assert.equal(r.state.phase, PHASE.COME_OUT);
}

// --- Place bets are off on come-out ---
{
  const r = applyRoll(comeOut({ place6: 30, place8: 30 }), 7);
  assert.equal(
    r.state.bets.place6,
    30,
    "come-out 7 must not take down place bets",
  );
  assert.equal(r.state.bets.place8, 30);
}
{
  // Number hit on come-out: no action either way; it just becomes the point.
  const r = applyRoll(comeOut({ place6: 30 }), 6);
  assert.equal(r.state.bankroll, 500);
  assert.equal(r.state.bets.place6, 30);
  assert.equal(r.state.point, 6);
}
{
  // Working during point phase: collects profit, stays up.
  const r = applyRoll(pointPhase(4, { place6: 30 }), 6);
  assert.equal(r.state.bankroll, 535);
  assert.equal(r.state.bets.place6, 30);
}

// --- Combined: point made pays pass and odds, clears both ---
{
  const r = applyRoll(pointPhase(6, { pass: 10, passOdds: 30 }), 6);
  assert.equal(r.state.bankroll, 500 + 10 + 10 + 30 + 36);
  assert.equal(r.state.bets.pass, 0);
  assert.equal(r.state.bets.passOdds, 0);
  assert.equal(r.state.phase, PHASE.COME_OUT);
}

// --- No zero-bet log noise ---
{
  const r = applyRoll(comeOut(), 7); // nothing on the felt
  assert.deepEqual(r.events, [], "roll with no bets must produce no events");
}

// --- Money-conservation fuzz ---
// Δ(bankroll + felt) must equal the sum of event profits on every roll.
{
  const rng = lcg(12345);
  const felt = (st) => Object.values(st.bets).reduce((a, b) => a + b, 0);
  let s = initialState(1000);
  for (let i = 0; i < 5000; i++) {
    for (const key of Object.keys(s.bets)) {
      if (rng() < 0.15 && s.bankroll >= 5) {
        if (key === "passOdds" && !(s.phase === PHASE.POINT && s.bets.pass > 0))
          continue;
        s.bets[key] += 5;
        s.bankroll -= 5;
      }
    }
    const before = s.bankroll + felt(s);
    const total = Math.floor(rng() * 6) + 1 + (Math.floor(rng() * 6) + 1);
    const { state: next, events } = applyRoll(s, total);
    const profits = events.reduce((a, e) => a + e.profit, 0);
    assert.equal(
      next.bankroll + felt(next) - before,
      profits,
      `money leak on roll ${i} (total ${total})`,
    );
    assert.ok(next.bankroll >= 0, "bankroll went negative");
    s = next;
    if (s.bankroll < 50) s.bankroll = 1000; // refill so the fuzz keeps betting
  }
}

// --- Simulator sanity (seeded → deterministic) ---
{
  const pass = simulateBet("pass", 20000, lcg(42));
  assert.ok(pass.edgePct > 0 && pass.edgePct < 3, `pass edge ${pass.edgePct}`);
  const dontPass = simulateBet("dontPass", 20000, lcg(43));
  assert.ok(
    dontPass.edgePct > 0 && dontPass.edgePct < 3,
    `dontPass edge ${dontPass.edgePct}`,
  );
  const odds = simulateBet("passOdds", 20000, lcg(44));
  assert.ok(Math.abs(odds.edgePct) < 1.5, `passOdds edge ${odds.edgePct}`);
  const field = simulateBet("field", 20000, lcg(45));
  assert.ok(
    field.edgePct > 4 && field.edgePct < 7.5,
    `field edge ${field.edgePct}`,
  );
  const place6 = simulateBet("place6", 20000, lcg(46));
  assert.ok(
    place6.edgePct > 0 && place6.edgePct < 3.5,
    `place6 edge ${place6.edgePct}`,
  );
}

console.log("all checks passed");
