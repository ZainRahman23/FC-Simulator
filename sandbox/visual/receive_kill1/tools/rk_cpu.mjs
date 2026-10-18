// receive_kill1/tools/rk_cpu.mjs — CPU of the KILL action per surface (run alone on an idle machine):
//   runtime per kill = the plan (surface × side × tick, closed-form) + the ideal (the surface's intended result; the exit-speed table, warm) +
//   Ball Control execution + the one scheduled kernel launch. Reported beside it: the free-ball prediction the plan reads (in a match the shared
//   predictor), the test harness's incoming-pass solve (not part of a receive), one post-contact second of free ball, and matrix generation.
//   node rk_cpu.mjs <out.json>
import fs from "fs";
import { prepare, predict, planKill, solveIncoming, runBC, drawsFor, solveExit, postRun, DT, now, EXIT_TABLE } from "../rk_sim.js";
import { surfaceIdeal, execute, idealVel, BC_STEPS } from "../rk_model.js";
const out = process.argv[2] || "rk_cpu.json";
const GROUPS = { FOOT: [{ v: 2 }, { v: 8 }, { v: 12 }, { v: 22 }, { v: 30 }, { v: 8, h: 0.30, drop: -12 }, { v: 8, h: 0.40, drop: 25 }, { v: 12, bear: 60 }],
  THIGH: [{ v: 3, h: 0.95, drop: 35, surface: "THIGH" }, { v: 8, h: 0.95, drop: 35, surface: "THIGH" }, { v: 16, h: 0.95, drop: 35, surface: "THIGH" }, { v: 12, h: 1.30, drop: 50 }],
  CHEST: [{ v: 4, h: 1.32, drop: 20, surface: "CHEST" }, { v: 8, h: 1.32, drop: 20, surface: "CHEST" }, { v: 16, h: 1.32, drop: 20, surface: "CHEST" }, { v: 25, h: 1.32, drop: 20, surface: "CHEST" }],
  HEAD: [{ v: 3, h: 1.78, drop: 15, surface: "HEAD" }, { v: 8, h: 1.78, drop: 15, surface: "HEAD" }, { v: 15, h: 1.78, drop: 25, surface: "HEAD" }, { v: 10, h: 2.0, drop: 20 }] };
const time = (f, n) => { f(); const t0 = now(); for (let i = 0; i < n; i++) f(); return (now() - t0) / n; };
const R = { groups: {}, tableColdMs: null };
for (const [g, conds] of Object.entries(GROUPS)) {
  const acc = { n: 0, plan: 0, ideal: 0, exec: 0, launch: 0, runtime: 0, predict: 0, solve: 0, post1s: 0, nEval: 0, worstRuntime: 0 };
  for (const c of conds) {
    const P = prepare(c); if (P.plan.none) continue; const N = drawsFor({ seed: 1 });
    const tSolve = time(() => solveIncoming(Object.assign({ _nocache: Math.random() }, c, { xRef: 0.35 + 1e-9 * Math.random() })), 1);
    const tPred = time(() => predict(P.sol), 5), tPlan = time(() => planKill(P.pred, c), 20);
    const tIdeal = time(() => { const id = surfaceIdeal(P.plan.sf, P.plan.st, P.plan.inc, P.plan.shift); const pp = { ideal: id, contact: P.contact }; const b = solveExit(pp); idealVel(id, b.s); }, 200);
    const tExec = time(() => execute(P.plan.sf, P.ideal, P.plan.inc, 60, P.plan.dif.D, N), 2000);
    const tLaunch = time(() => postRun(P, P.ideal.v, { post: DT * 1, every: 1 }), 50);     // clone + schedule + the launch tick
    const tPost = time(() => postRun(P, P.ideal.v, { post: 1.0, every: 24 }), 10);
    const rt = tPlan + tIdeal + tExec + tLaunch;
    acc.n++; acc.plan += tPlan; acc.ideal += tIdeal; acc.exec += tExec; acc.launch += tLaunch; acc.runtime += rt; acc.predict += tPred; acc.solve += tSolve; acc.post1s += tPost; acc.nEval += P.plan.nEval; acc.worstRuntime = Math.max(acc.worstRuntime, rt);
  }
  const k = acc.n; R.groups[g] = { cases: k, runtimeMsPerKill: acc.runtime / k, worstRuntimeMs: acc.worstRuntime, planMs: acc.plan / k, idealMs: acc.ideal / k, execMs: acc.exec / k, launchMs: acc.launch / k, candidatesEvaluated: acc.nEval / k,
    sharedPredictorMs: acc.predict / k, harnessIncomingSolveMs: acc.solve / k, postContactFreeBallMsPerSecond: acc.post1s / k };
}
R.exitTable = { columns: EXIT_TABLE.built, buildMsTotal: EXIT_TABLE.buildMs, msPerColumn: EXIT_TABLE.buildMs / Math.max(1, EXIT_TABLE.built) };
// matrix generation (single process): the GROUND matrix, typical draw, 10 ratings
const { MATRICES, condOf } = await import("../rk_conditions.js"); const M = MATRICES.find((m) => m.id === "GROUND"), t0 = now();
for (const r of M.rows) { const P = prepare(condOf(M, r)), N = drawsFor({ example: "TYPICAL" }); for (const bc of BC_STEPS) runBC(P, bc, N, { post: 2.2 }); }
R.matrixGround = { rows: M.rows.length, cells: M.rows.length * 10, ms: now() - t0 };
fs.writeFileSync(out, JSON.stringify(R, null, 1)); console.log(JSON.stringify(R, null, 1));
