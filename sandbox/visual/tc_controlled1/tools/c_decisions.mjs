// tc_controlled1/tools/c_decisions.mjs — HOW OFTEN THE CONTROLLED MODEL CHANGES THE DECISION (owner §1: "do not fix this by gating input"): over
// seeded torture programs, every re-plan classified — the planner's own choice (unchanged by CONTROLLED_BALL) · the next-best candidate WITH a
// controlled continuation · the running plan kept (nothing valid — the next re-plan tries again; how long it is kept) · a SECURE fallback
//   node c_decisions.mjs [--seeds 20] [--dur 60]
import { makeSim, DT } from "./u_env.mjs";
import { presetLayers } from "../c_sim.js";
import { program, PAGE } from "./c_torture.mjs";
const AR = process.argv, opt = (k, d) => { const i = AR.indexOf("--" + k); return i > 0 ? AR[i + 1] : d; }, seeds = +opt("seeds", 20), dur = +opt("dur", 60);
const F = {}; let reps = 0; const keptDur = [];
for (let s = 1; s <= seeds; s++) { const P = program(s, dur), sim = makeSim("TL", Object.assign(JSON.parse(JSON.stringify(PAGE)), { layers: presetLayers("FULL"), control: "CONTROLLED" })); let keptAt = null;
  const R0 = sim.replan.bind(sim); sim.replan = (r) => { R0(r); reps++; const fb = (sim.poss.fallback || "the planner's choice").replace(/[0-9.]+ s/, "x s"); F[fb] = (F[fb] || 0) + 1;
    if (fb === "kept the running plan") { if (keptAt == null) keptAt = sim.t; } else if (keptAt != null) { keptDur.push(sim.t - keptAt); keptAt = null; } };
  for (let k = 0; k < Math.round(dur / DT); k++) sim.step(P.req(k * DT)); }
keptDur.sort((a, b) => a - b); const q = (x) => keptDur.length ? keptDur[Math.min(keptDur.length - 1, Math.floor(x * keptDur.length))] : 0;
console.log(`${reps} re-plans over ${(seeds * dur / 60).toFixed(0)} simulated min: ` + Object.entries(F).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v} (${(100 * v / reps).toFixed(1)} %)`).join(" · "));
console.log(`the running plan kept: ${keptDur.length} episodes, held for median ${(1000 * q(0.5)).toFixed(0)} ms, p95 ${(1000 * q(0.95)).toFixed(0)} ms, max ${(1000 * q(1)).toFixed(0)} ms (until the next re-plan finds a valid continuation)`);
