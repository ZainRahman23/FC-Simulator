// receive_turn1/tools/rt_cpu.mjs — CPU of the receive-and-turn episode (run alone on an idle machine), per turn-angle group:
//   candidates   the action set evaluated per receive (family × foot × variant × contact tick) and how many were feasible
//   selection    selectTurn() (the closed-form evaluation of every candidate: geometry, the kernel's rolling law by table, surface fit, difficulty)
//   contact      the Ball Control execution of the chosen touch + its authoritative schedule()
//   continuation the real ball's prediction (the kernel, 3.4 s) + the meeting search (+ the extra control's plan when needed)
//   episode      runTurn() whole, with the world's own simulation of the free ball to 3 s after the contact reported apart
// (one-off: the rolling-law table, built once per process, and the incoming pass's solve, cached per pass)   node rt_cpu.mjs <out.json>
import fs from "fs";
import { prepareTurn, runTurn, incomingFor, selectTurn, ROLLT } from "../rt_sim.js";
import { now } from "../rk_sim.js";
const out = process.argv[2] || "rt_cpu.json", G = { "0–45": [0, 15, 30, 45], "60–105": [60, 75, 90, 105], "120–150": [120, 135, 150], "165–180": [165, 180] }, V = [6, 12, 18];
const t0 = now(); prepareTurn({ v: 12, theta: 90 }); const warm = now() - t0;   // the rolling-law table + the first pass's solve
for (const v of V) incomingFor({ v });
const res = { warmupMs: warm, rollTableMs: ROLLT.ms, groups: {} };
for (const [g, angs] of Object.entries(G)) {
  let n = 0, cand = 0, feas = 0, sel = 0, ep = 0, exec = 0, cont = 0, sim = 0, pred = 0, worst = 0, selWorst = 0;
  for (const v of V) for (const a of angs) for (const sg of [1, -1]) { const cond = { v, theta: sg * a }, inc = incomingFor(cond);
    for (let rep = 0; rep < 5; rep++) { const ta = now(); const A = selectTurn(inc, cond); const dt = now() - ta; sel += dt; selWorst = Math.max(selWorst, dt); cand += A.nEval; feas += A.nFeasible; }
    const P = prepareTurn(cond); for (const bc of [30, 50, 70, 90, 99]) for (let s = 1; s <= 6; s++) { const e = runTurn(P, bc, { seed: s }, { every: 8, carry: false }); n++; ep += e.cpu.total; exec += e.cpu.exec; cont += e.cpu.cont; sim += e.cpu.sim; pred += e.cpu.predict; worst = Math.max(worst, e.cpu.total); } }
  const k = V.length * angs.length * 2 * 5;
  res.groups[g] = { receives: k / 5, candidatesPerReceive: cand / k, feasiblePerReceive: feas / k, selectionMs: sel / k, selectionWorstMs: selWorst, episodes: n, contactMs: exec / n, predictMs: pred / n, meetMs: (cont) / n, freeBallSimMs: sim / n, episodeMs: ep / n, episodeWorstMs: worst };
  console.log(g, JSON.stringify(res.groups[g]));
}
fs.writeFileSync(out, JSON.stringify(res, null, 1));
