import {
  PHASE,
  initialState,
  rollDice,
  applyRoll,
  simulateBet,
  BET_INFO,
} from "./game.js";
import { TUTORIAL_STEPS, renderTutorialStep } from "./tutorial.js";

// --- UI state ---
let state = initialState(500);
let selectedChip = 5;
let tutorialIndex = 0;

const $ = (id) => document.getElementById(id);

const els = {
  bankroll: $("bankroll"),
  phase: $("phase"),
  point: $("point"),
  die1: $("die1"),
  die2: $("die2"),
  rollTotal: $("roll-total"),
  selectedAmount: $("selected-amount"),
  rollBtn: $("roll-btn"),
  log: $("log-list"),
  modal: $("modal"),
  modalTitle: $("modal-title"),
  modalBody: $("modal-body"),
  modalClose: $("modal-close"),
  simBet: $("sim-bet"),
  simRun: $("sim-run"),
  simResult: $("sim-result"),
  tut: {
    title: $("tutorial-title"),
    body: $("tutorial-body"),
    progress: $("tut-progress"),
    prev: $("tut-prev"),
    next: $("tut-next"),
    skip: $("tut-skip"),
  },
};

// Bets that are illegal in the come-out phase (you can't take pass-odds
// without a point set).
function isBetEnabled(betKey) {
  if (betKey === "passOdds")
    return state.phase === PHASE.POINT && state.bets.pass > 0;
  return true;
}

function render() {
  els.bankroll.textContent = state.bankroll;
  els.phase.textContent = state.phase === PHASE.COME_OUT ? "Come-Out" : "Point";
  els.point.textContent = state.point ?? "—";

  for (const key of Object.keys(state.bets)) {
    const el = $(`bet-${key}`);
    if (el) el.textContent = `$${state.bets[key]}`;
  }

  document.querySelectorAll(".bet").forEach((bet) => {
    const key = bet.dataset.bet;
    bet.classList.toggle("disabled", !isBetEnabled(key));
  });

  document.querySelectorAll(".chip").forEach((c) => {
    c.classList.toggle("active", Number(c.dataset.amount) === selectedChip);
  });
  els.selectedAmount.textContent = selectedChip;
}

function log(message, kind = "info") {
  const li = document.createElement("li");
  li.className = kind;
  li.textContent = message;
  els.log.prepend(li);
  // Keep log from growing unbounded.
  while (els.log.children.length > 50) els.log.removeChild(els.log.lastChild);
}

function placeBet(key) {
  if (!isBetEnabled(key)) {
    if (key === "passOdds")
      log(
        "Pass Odds requires an active Pass Line bet and a point set.",
        "info",
      );
    return;
  }
  if (selectedChip > state.bankroll) {
    log("Not enough bankroll.", "info");
    return;
  }
  state.bets[key] += selectedChip;
  state.bankroll -= selectedChip;
  render();
}

function clearUnresolvedBets() {
  // Used by "Clear bets" button — refund anything currently on the felt.
  // Pass and Don't Pass can't actually be removed mid-round in a real casino once
  // a point is set, but for an educational app we allow it.
  let refund = 0;
  for (const key of Object.keys(state.bets)) {
    refund += state.bets[key];
    state.bets[key] = 0;
  }
  state.bankroll += refund;
  render();
}

async function rollAnimation(d1, d2) {
  els.die1.classList.add("rolling");
  els.die2.classList.add("rolling");
  els.rollTotal.textContent = "";
  await new Promise((r) => setTimeout(r, 400));
  els.die1.textContent = d1;
  els.die2.textContent = d2;
  els.rollTotal.textContent = `= ${d1 + d2}`;
  els.die1.classList.remove("rolling");
  els.die2.classList.remove("rolling");
}

async function onRoll() {
  els.rollBtn.disabled = true;
  try {
    const { d1, d2, total } = rollDice();
    await rollAnimation(d1, d2);
    log(`Rolled ${d1} + ${d2} = ${total}`, "info");
    const result = applyRoll(state, total);
    state = result.state;
    for (const ev of result.events) log(ev.message, ev.kind);
    render();
  } finally {
    els.rollBtn.disabled = false;
  }
}

function showHelp(key) {
  const info = BET_INFO[key];
  if (!info) return;
  els.modalTitle.textContent = info.name;
  els.modalBody.textContent = `${info.summary}\n\nPayout: ${info.payout}\nHouse edge: ${info.houseEdge}`;
  els.modal.classList.remove("hidden");
}

function renderTutorial() {
  renderTutorialStep(
    TUTORIAL_STEPS[tutorialIndex],
    tutorialIndex,
    TUTORIAL_STEPS.length,
    els.tut,
  );
}

// --- House-edge simulator ---
function runSimulation() {
  const key = els.simBet.value;
  const { wagered, net, edgePct } = simulateBet(key, 10000);
  els.simResult.textContent =
    `${BET_INFO[key].name}: wagered $${wagered.toLocaleString()}, ` +
    `net ${net >= 0 ? "+" : "-"}$${Math.abs(net).toLocaleString()}. ` +
    `Measured edge: ${edgePct.toFixed(2)}% (theory: ${BET_INFO[key].houseEdge}).`;
}

// --- Event wiring ---
document.querySelectorAll(".chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    selectedChip = Number(chip.dataset.amount);
    render();
  });
});

document.querySelectorAll(".bet").forEach((bet) => {
  bet.addEventListener("click", (e) => {
    // Ignore clicks on the help button so they don't double-trigger.
    if (e.target.classList.contains("help")) return;
    placeBet(bet.dataset.bet);
  });
  bet.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      placeBet(bet.dataset.bet);
    }
  });
});

document.querySelectorAll(".help").forEach((btn) => {
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    showHelp(btn.dataset.help);
  });
});

els.rollBtn.addEventListener("click", onRoll);
$("clear-bets").addEventListener("click", clearUnresolvedBets);
$("reset").addEventListener("click", () => {
  state = initialState(500);
  els.log.innerHTML = "";
  els.die1.textContent = "?";
  els.die2.textContent = "?";
  els.rollTotal.textContent = "";
  render();
});

els.modalClose.addEventListener("click", () =>
  els.modal.classList.add("hidden"),
);
els.modal.addEventListener("click", (e) => {
  if (e.target === els.modal) els.modal.classList.add("hidden");
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") els.modal.classList.add("hidden");
});

for (const [key, info] of Object.entries(BET_INFO)) {
  const opt = document.createElement("option");
  opt.value = key;
  opt.textContent = info.name;
  els.simBet.appendChild(opt);
}
els.simRun.addEventListener("click", runSimulation);

els.tut.prev.addEventListener("click", () => {
  if (tutorialIndex > 0) {
    tutorialIndex--;
    renderTutorial();
  }
});
els.tut.next.addEventListener("click", () => {
  if (tutorialIndex < TUTORIAL_STEPS.length - 1) {
    tutorialIndex++;
    renderTutorial();
  }
});
els.tut.skip.addEventListener("click", () => {
  document.querySelector(".tutorial-panel").style.display = "none";
  document.querySelectorAll(".bet").forEach((b) => (b.style.boxShadow = ""));
});

// --- Boot ---
render();
renderTutorial();
