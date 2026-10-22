// vocab1/tools/v_bodytort.mjs — the posed random torture (c_torture programs, BALL ON, CONTROLLED, CARRY-B) classified like v_extreme: normal-
// speed / slow-motion / diagnostic, by kind and action (for ablations: ABL=pivot,turn,dup CORR=0.14)
//   node v_bodytort.mjs [--seeds 6] [--dur 60]
import { makeSim, DT } from "./u_env.mjs";
import { presetLayers } from "../c_sim.js";
import { program, PAGE } from "./c_torture.mjs";
import { measure } from "./v_extreme.mjs";
const AR = process.argv, opt = (k, d) => { const i = AR.indexOf("--" + k); return i > 0 ? AR[i + 1] : d; }, seeds = +opt("seeds", 6), dur = +opt("dur", 60);
const tot = { normal: 0, slow: 0, diag: 0 }, kinds = {};
for (let sd = 1; sd <= seeds; sd++) { const P = program(sd, dur), sim = makeSim("TL", Object.assign(JSON.parse(JSON.stringify(PAGE)), { layers: presetLayers("FULL"), pace: "D38", vocab: "EXPANDED", control: "CONTROLLED", carry: "B" }));
  for (let k = 0; k < Math.round(dur / DT); k++) sim.step(P.req(k * DT)); const m = measure(sim, Math.round(1.2 / DT), 0); for (const k of ["normal", "slow", "diag"]) tot[k] += m.N[k]; for (const [k, v] of Object.entries(m.kinds)) kinds[k] = (kinds[k] || 0) + v; }
console.log(`■ ${process.env.ABL || "all rules"}${process.env.CORR ? " CORR " + process.env.CORR : ""} · ${seeds} × ${dur} s posed: normal-visible ${tot.normal} · slow-motion ${tot.slow} · diag ${tot.diag} · ${Object.entries(kinds).sort((a, b) => b[1] - a[1]).map(([k, v]) => k + " " + v).join(" · ")}`);
