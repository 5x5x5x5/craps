// Pure rules engine for craps. No DOM access — easy to test and reason about.

export const PHASE = { COME_OUT: "come-out", POINT: "point" };

export function initialState(bankroll = 500) {
  return {
    bankroll,
    phase: PHASE.COME_OUT,
    point: null,
    bets: {
      pass: 0,
      dontPass: 0,
      passOdds: 0,
      field: 0,
      place4: 0,
      place5: 0,
      place6: 0,
      place8: 0,
      place9: 0,
      place10: 0,
    },
  };
}

export function rollDice(rng = Math.random) {
  const d1 = Math.floor(rng() * 6) + 1;
  const d2 = Math.floor(rng() * 6) + 1;
  return { d1, d2, total: d1 + d2 };
}

// True odds payouts on Pass Odds (fair, zero house edge).
// e.g. point=6: rolling 6 before 7 is 5/11 (5 ways vs 6 ways). Payout 6:5 makes EV = 0.
const PASS_ODDS_PAYOUT = {
  4: [2, 1],
  10: [2, 1], // 2:1
  5: [3, 2],
  9: [3, 2], // 3:2
  6: [6, 5],
  8: [6, 5], // 6:5
};

// Place bet payouts (these DO have a house edge built in).
const PLACE_PAYOUT = {
  4: [9, 5],
  10: [9, 5], // 9:5  (true 2:1)
  5: [7, 5],
  9: [7, 5], // 7:5  (true 3:2)
  6: [7, 6],
  8: [7, 6], // 7:6  (true 6:5) — best place bet
};

function payout(bet, ratio) {
  // ratio is [num, denom]; bet * num/denom is the profit (stake returned separately).
  return Math.floor((bet * ratio[0]) / ratio[1]);
}

/**
 * Resolve the Pass Line bet for the current roll.
 *
 * Rules (this is the core of craps — write it yourself!):
 *
 *   COME-OUT phase (no point established yet):
 *     - total of 7 or 11  → "natural", Pass wins 1:1
 *     - total of 2, 3, 12 → "craps",   Pass loses
 *     - total of 4,5,6,8,9,10 → that number becomes the "point";
 *                                Pass bet stays on the table for the point phase
 *
 *   POINT phase (a point number is set):
 *     - rolling the point number again → Pass wins 1:1
 *     - rolling a 7 → "seven out", Pass loses
 *     - anything else → no resolution, roll again
 *
 * Inputs:
 *   state — current game state (you can read state.phase and state.point)
 *   total — the dice total just rolled (2..12)
 *
 * Return an object describing what happened:
 *   {
 *     outcome: 'win' | 'loss' | 'point-set' | 'no-action',
 *     newPhase: PHASE.COME_OUT | PHASE.POINT,
 *     newPoint: number | null,
 *     profit: number          // 0 if no resolution; positive on win; negative on loss
 *   }
 *
 * Notes:
 *   - `profit` is just the win/loss amount on the bet, not bankroll. Caller updates bankroll.
 *   - On a win, profit === state.bets.pass (1:1 payout).
 *   - On a loss, profit === -state.bets.pass.
 *   - If there's no pass-line bet (state.bets.pass === 0), the phase logic
 *     still applies — point can still be set by the roll.
 */
export function resolvePassLine(state, total) {
  const bet = state.bets.pass;
  if (state.phase === PHASE.COME_OUT) {
    if (total === 7 || total === 11) {
      return {
        outcome: "win",
        newPhase: PHASE.COME_OUT,
        newPoint: null,
        profit: bet,
      };
    }
    if (total === 2 || total === 3 || total === 12) {
      return {
        outcome: "loss",
        newPhase: PHASE.COME_OUT,
        newPoint: null,
        profit: -bet,
      };
    }
    return {
      outcome: "point-set",
      newPhase: PHASE.POINT,
      newPoint: total,
      profit: 0,
    };
  }
  if (total === state.point) {
    return {
      outcome: "win",
      newPhase: PHASE.COME_OUT,
      newPoint: null,
      profit: bet,
    };
  }
  if (total === 7) {
    return {
      outcome: "loss",
      newPhase: PHASE.COME_OUT,
      newPoint: null,
      profit: -bet,
    };
  }
  return {
    outcome: "no-action",
    newPhase: state.phase,
    newPoint: state.point,
    profit: 0,
  };
}

// --- The rest is implemented for you ---

export function resolveDontPass(state, total) {
  const bet = state.bets.dontPass;
  if (state.phase === PHASE.COME_OUT) {
    if (total === 2 || total === 3) {
      return {
        outcome: "win",
        newPhase: PHASE.COME_OUT,
        newPoint: null,
        profit: bet,
      };
    }
    if (total === 12) {
      // 12 is a PUSH on don't pass (this is what gives the house its edge — without
      // it, don't pass would have a player edge).
      return {
        outcome: "push",
        newPhase: PHASE.COME_OUT,
        newPoint: null,
        profit: 0,
      };
    }
    if (total === 7 || total === 11) {
      return {
        outcome: "loss",
        newPhase: PHASE.COME_OUT,
        newPoint: null,
        profit: -bet,
      };
    }
    // 4,5,6,8,9,10 → point established, don't pass stays
    return {
      outcome: "point-set",
      newPhase: PHASE.POINT,
      newPoint: total,
      profit: 0,
    };
  }
  // Point phase: 7 wins for don't pass, point loses.
  if (total === 7) {
    return {
      outcome: "win",
      newPhase: PHASE.COME_OUT,
      newPoint: null,
      profit: bet,
    };
  }
  if (total === state.point) {
    return {
      outcome: "loss",
      newPhase: PHASE.COME_OUT,
      newPoint: null,
      profit: -bet,
    };
  }
  return {
    outcome: "no-action",
    newPhase: state.phase,
    newPoint: state.point,
    profit: 0,
  };
}

export function resolvePassOdds(state, total) {
  // Odds only resolve when the pass line resolves (point hit or seven out).
  const bet = state.bets.passOdds;
  if (state.phase !== PHASE.POINT || bet === 0) return { profit: 0 };
  if (total === state.point) {
    return { profit: payout(bet, PASS_ODDS_PAYOUT[state.point]) };
  }
  if (total === 7) {
    return { profit: -bet };
  }
  return { profit: 0 };
}

export function resolveField(state, total) {
  // One-roll bet. Wins on 2,3,4,9,10,11,12 (2 and 12 pay double).
  const bet = state.bets.field;
  if (bet === 0) return { profit: 0, resolved: false };
  if (total === 2 || total === 12) return { profit: bet * 2, resolved: true };
  if ([3, 4, 9, 10, 11].includes(total)) return { profit: bet, resolved: true };
  return { profit: -bet, resolved: true };
}

export function resolvePlace(state, total) {
  // Place bets resolve only when their number is rolled, or lose on 7.
  // They stay on the table otherwise (multi-roll bets).
  const results = {};
  for (const num of [4, 5, 6, 8, 9, 10]) {
    const key = `place${num}`;
    const bet = state.bets[key];
    if (bet === 0) continue;
    if (total === 7) {
      results[key] = { profit: -bet, cleared: true };
    } else if (total === num) {
      results[key] = { profit: payout(bet, PLACE_PAYOUT[num]), cleared: false };
    }
  }
  return results;
}

// Bet metadata for tooltips/explanations. Edge values are well-known craps math.
export const BET_INFO = {
  pass: {
    name: "Pass Line",
    summary:
      "Bet WITH the shooter. Wins on 7/11 on the come-out, loses on 2/3/12. If a point is set, you win if the point repeats before a 7.",
    payout: "1:1",
    houseEdge: "1.41%",
  },
  dontPass: {
    name: "Don't Pass",
    summary:
      "Bet AGAINST the shooter. Wins on 2/3 on the come-out, pushes on 12, loses on 7/11. After a point, you win if 7 comes before the point.",
    payout: "1:1 (push on 12)",
    houseEdge: "1.36%",
  },
  passOdds: {
    name: "Pass Line Odds",
    summary:
      'A bonus bet you can place AFTER a point is established, behind your Pass Line bet. Pays true odds — ZERO house edge. This is the best bet in the casino. Some books call it "free odds".',
    payout: "2:1 on 4/10, 3:2 on 5/9, 6:5 on 6/8",
    houseEdge: "0% (true odds)",
  },
  field: {
    name: "Field",
    summary:
      "One-roll bet. Wins if the next roll is 2, 3, 4, 9, 10, 11, or 12. 2 and 12 pay double. Looks attractive (7 winning numbers vs 4 losing) but the losing numbers — 5,6,7,8 — are the most common.",
    payout: "1:1 on 3/4/9/10/11; 2:1 on 2 and 12",
    houseEdge: "~5.56%",
  },
  place4: {
    name: "Place 4",
    summary:
      "Bet that 4 will roll before 7. Stays up across rolls. True odds are 2:1; the casino pays 9:5, giving a steep house edge.",
    payout: "9:5",
    houseEdge: "6.67%",
  },
  place5: {
    name: "Place 5",
    summary: "Bet that 5 will roll before 7. True odds 3:2; casino pays 7:5.",
    payout: "7:5",
    houseEdge: "4.0%",
  },
  place6: {
    name: "Place 6",
    summary:
      "Bet that 6 will roll before 7. True odds 6:5; casino pays 7:6. Best of the place bets.",
    payout: "7:6",
    houseEdge: "1.52%",
  },
  place8: {
    name: "Place 8",
    summary:
      "Bet that 8 will roll before 7. True odds 6:5; casino pays 7:6. Tied with Place 6 as the best place bet.",
    payout: "7:6",
    houseEdge: "1.52%",
  },
  place9: {
    name: "Place 9",
    summary: "Bet that 9 will roll before 7. True odds 3:2; casino pays 7:5.",
    payout: "7:5",
    houseEdge: "4.0%",
  },
  place10: {
    name: "Place 10",
    summary: "Bet that 10 will roll before 7. True odds 2:1; casino pays 9:5.",
    payout: "9:5",
    houseEdge: "6.67%",
  },
};
