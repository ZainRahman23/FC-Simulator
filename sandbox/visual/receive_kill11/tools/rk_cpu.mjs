// receive_kill11/tools/rk_cpu.mjs — CPU of the CONTROL EPISODE per first surface (run alone on an idle machine):
//   first contact   = the KILL plan (surface × side × tick, closed form) + the ideal (exit table, warm) + Ball Control execution + its one launch
//   follow-up       = its prediction of the real post-contact ball (the kernel, 3 s) + its plan (foot surface × side × tick, closed form) + its contact
//                     (ideal + execution + scheduled launch), per follow-up
//   whole episode   = first contact + every follow-up (the free-ball physics in between is the world's own simulation and reported apart)
// Beside it: the shared free-ball predictor before the first contact, the test harness's pass solve, matrix generation.   node rk_cpu.mjs <out.json>
import fs from "fs";
import { prepare, predict, planKill, solveIncoming, runEpisode, drawsFor, solveExit, postRun, DT, now, EXIT_TABLE } from "../rk_sim.js";
import { surfaceIdeal, execute, idealVel, BC_STEPS } from "../rk_model.js";
import { MATRICES, BENCHMARKS, condOf } from "../rk_conditions.js";
const out = process.argv[2] || "rk_cpu.json";
const GROUPS = { FOOT: [{ v: 2 }, { v: 12 }, { v: 22 }, { v: 30 }, { v: 8, h: 0.30, drop: -12 }, { v: 8, h: 0.40, drop: 25 }], THIGH: [{ v: 6, h: 0.95, drop: 35, surface: "THIGH" }, { v: 16, h: 0.95, drop: 35, surface: "THIGH" }, { v: 12, h: 1.30, drop: 50 }],
  CHEST: [{ v: 8, h: 1.32, drop: 20, surface: "CHEST" }, { v: 20, h: 1.32, drop: 20, surface: "CHEST" }, { v: 4, h: 1.32, drop: 20, surface: "CHEST" }], HEAD: [{ v: 6, h: 1.78, drop: 15, surface: "HEAD" }, { v: 15, h: 1.78, drop: 25, surface: "HEAD" }, { v: 10, h: 2.0, drop: 20 }] };
const time = (f, n) => { f(); const t0 = now(); for (let i = 0; i < n; i++) f(); return (now() - t0) / n; };
const R = { groups: {} };
for (const [g, conds] of Object.entries(GROUPS)) {
  const A = { n: 0, plan: 0, ideal: 0, exec: 0, launch: 0, first: 0, fPredict: 0, fPlan: 0, fContact: 0, follows: 0, episode: 0, worstEpisode: 0, sim: 0, pred: 0, solve: 0, eps: 0 };
  for (const c of conds) {
    const P = prepare(c); if (P.plan.none) continue; const N = drawsFor({ seed: 1, event: "kill1" });
    A.solve += time(() => solveIncoming(Object.assign({}, c, { xRef: 0.35 + 1e-9 * Math.random() })), 1); A.pred += time(() => predict(P.sol), 5);
    const tPlan = time(() => planKill(P.pred, c), 20), tIdeal = time(() => { const id = surfaceIdeal(P.plan.sf, P.plan.st, P.plan.inc, P.plan.shift); idealVel(id, solveExit({ ideal: id, contact: P.contact }).s); }, 200);
    const tExec = time(() => execute(P.plan.sf, P.ideal, P.plan.inc, 60, P.plan.dif.D, N), 2000), tLaunch = time(() => postRun(P, P.ideal.v, { post: DT, every: 1 }), 50), first = tPlan + tIdeal + tExec + tLaunch;
    A.plan += tPlan; A.ideal += tIdeal; A.exec += tExec; A.launch += tLaunch; A.first += first;
    for (const bc of [10, 50, 99]) for (let s = 1; s <= 4; s++) { runEpisode(P, bc, { seed: s }, { every: 8 }); const ep = runEpisode(P, bc, { seed: s }, { every: 8 }), f = ep.contacts.length - 1, k = ep.cpu;
      // the episode's own costs: its follow-up predictions, plans and contacts (the first contact's plan / ideal were made in prepare(): added from above)
      const epi = first + k.predict + k.plan + k.follow; A.fPredict += k.predict; A.fPlan += k.plan; A.fContact += k.follow; A.follows += f; A.episode += epi; A.worstEpisode = Math.max(A.worstEpisode, epi); A.sim += k.sim; A.eps++; }
    A.n++;
  }
  const n = A.n, e = A.eps, perF = (x) => (A.follows ? x / A.follows : 0);
  R.groups[g] = { cases: n, firstContactMs: A.first / n, plan: A.plan / n, ideal: A.ideal / n, exec: A.exec / n, launch: A.launch / n, followUpsPerEpisode: A.follows / e,
    followPredictMsEach: perF(A.fPredict), followPlanMsEach: perF(A.fPlan), followContactMsEach: perF(A.fContact), wholeEpisodeMs: A.episode / e, worstEpisodeMs: A.worstEpisode,
    freeBallSimMsPerEpisode: A.sim / e, sharedPredictorMs: A.pred / n, harnessPassSolveMs: A.solve / n };
}
R.exitTable = { columns: EXIT_TABLE.built, msPerColumn: EXIT_TABLE.buildMs / Math.max(1, EXIT_TABLE.built) };
const M = MATRICES.find((m) => m.id === "GROUND"), t0 = now(); for (const r of M.rows) { const P = prepare(condOf(M, r)); for (const bc of BC_STEPS) runEpisode(P, bc, { example: "TYPICAL" }, { every: 2 }); } R.matrixGroundEpisodesMs = now() - t0;
const B = BENCHMARKS, t1 = now(); for (const b of B) { const P = prepare(b.cond); for (const bc of BC_STEPS) runEpisode(P, bc, { example: "TYPICAL" }, { every: 2 }); } R.matrixBenchEpisodesMs = now() - t1;
fs.writeFileSync(out, JSON.stringify(R, null, 1)); for (const [g, c] of Object.entries(R.groups)) console.log(g, Object.entries(c).map(([k, v]) => `${k} ${typeof v === "number" ? v.toFixed(3) : v}`).join(" · ")); console.log(R.exitTable, "ground matrix", R.matrixGroundEpisodesMs.toFixed(0), "ms, bench", R.matrixBenchEpisodesMs.toFixed(0), "ms");
