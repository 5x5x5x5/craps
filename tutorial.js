// Tutorial steps. Each step has a title, body, and optional highlight target.
// Keep prose tight — the user is here to play, not read an essay.

export const TUTORIAL_STEPS = [
  {
    title: "Welcome to the table",
    body:
      "Craps looks chaotic but it's simple: one person rolls two dice, everyone bets on the result. " +
      'You\'re the shooter. Click "Next" to learn the core mechanic.',
  },
  {
    title: "Two phases",
    body:
      'Every "round" has two possible phases:\n\n' +
      "1. COME-OUT — the first roll of a round.\n" +
      "2. POINT — the rolls after a point number has been set.\n\n" +
      "The SAME dice total means different things depending on phase. That's the only tricky part.",
  },
  {
    title: "The Pass Line (the bread-and-butter bet)",
    body:
      "Place a chip on Pass Line. Then roll.\n\n" +
      "On the come-out roll:\n" +
      "  • 7 or 11 → you WIN (1:1).\n" +
      '  • 2, 3, or 12 → you LOSE ("craps").\n' +
      "  • 4, 5, 6, 8, 9, 10 → that number becomes the POINT.\n\n" +
      "Try it: click the Pass Line, then click Roll Dice.",
    highlight: "pass",
  },
  {
    title: "After the point is set",
    body:
      "If you set a point, your Pass Line bet stays on the table. Keep rolling.\n\n" +
      "  • Roll the POINT number again → you WIN (1:1).\n" +
      '  • Roll a 7 → you LOSE (this is called "seven out").\n' +
      "  • Anything else → no resolution, roll again.\n\n" +
      "Notice: 7 was your friend on the come-out, but now it kills you. That's the whole game in a nutshell.",
  },
  {
    title: "Don't Pass — betting against",
    body:
      "Don't Pass is the mirror image of Pass Line.\n\n" +
      "  • Come-out 2 or 3 → win. 7 or 11 → lose. 12 → PUSH (you neither win nor lose).\n" +
      "  • After point: 7 wins for you, point loses.\n\n" +
      "The 12 push is what gives the casino its edge — without it, Don't Pass would actually favor the player. " +
      "House edge: 1.36% vs Pass's 1.41%. Slightly better, but socially awkward at a real table.",
    highlight: "dontPass",
  },
  {
    title: "Pass Line ODDS — the best bet in the casino",
    body:
      'AFTER a point is set, you can add an extra bet "behind" your Pass Line called Odds.\n\n' +
      "This bet pays TRUE ODDS — zero house edge:\n" +
      "  • Point 4 or 10 → pays 2:1\n" +
      "  • Point 5 or 9 → pays 3:2\n" +
      "  • Point 6 or 8 → pays 6:5\n\n" +
      "There's no signed sign on the table for it — the casino doesn't advertise it. " +
      "Always take odds when you have a pass-line bet up.",
    highlight: "passOdds",
  },
  {
    title: "The Field — pretty trap",
    body:
      "Field is a ONE-ROLL bet. Wins on 2, 3, 4, 9, 10, 11, 12. Loses on 5, 6, 7, 8.\n\n" +
      "Seven winners vs four losers — looks great, right? But the losers (5,6,7,8) are the most common totals. " +
      "Out of 36 possible dice combinations, 20 are losers and only 16 are winners. " +
      "Even with 2 and 12 paying 2:1, the house edge is ~5.56%.",
    highlight: "field",
  },
  {
    title: "Place bets",
    body:
      "Place bets let you bet on a specific number (4, 5, 6, 8, 9, 10) rolling before a 7. Multi-roll: they sit there until they win or 7 hits.\n\n" +
      "  • Place 6 / 8 → pays 7:6 (1.52% edge) — fine bets\n" +
      "  • Place 5 / 9 → pays 7:5 (4.0% edge) — meh\n" +
      "  • Place 4 / 10 → pays 9:5 (6.67% edge) — bad\n\n" +
      'The "true odds" on Place 6 are 6:5 (six ways to roll 6, five ways the bet stays alive other than 7). The casino pays 7:6 instead — that 1/6 gap is their edge.',
    highlight: "place6",
  },
  {
    title: "Strategy in one sentence",
    body:
      "The lowest-house-edge way to play: Pass Line + maximum Odds. Add Place 6 / Place 8 if you want more action.\n\n" +
      "Avoid: Field, Place 4/10, and (not in this app) any of the prop bets in the center of the table — those run 10-16% house edge.\n\n" +
      "Click Skip to start playing. Good luck!",
  },
];

export function renderTutorialStep(step, index, total, els) {
  els.title.textContent = step.title;
  els.body.textContent = step.body;
  els.progress.textContent = `${index + 1} / ${total}`;
  els.prev.disabled = index === 0;
  els.next.disabled = index === total - 1;

  // Highlight a bet area if the step references one.
  document.querySelectorAll(".bet").forEach((b) => (b.style.boxShadow = ""));
  if (step.highlight) {
    const target = document.querySelector(`.bet[data-bet="${step.highlight}"]`);
    if (target) target.style.boxShadow = "0 0 0 3px #fff, 0 0 20px #e6c87a";
  }
}
