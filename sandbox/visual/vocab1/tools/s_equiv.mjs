// speed99/tools/s_equiv.mjs — CURRENT PACE ≡ TC-CONTROLLED-1: the SPEED-99-V1 copy with pace CURRENT (and with no pace at all) against
// tc_controlled1's own ControlledSim on identical seeded torture input — BALL OFF, BALL ON · FREE and BALL ON · CONTROLLED — every tick's
// hash, centre of mass and ball compared (bit-identical required)
//   node s_equiv.mjs [--seeds 8] [--dur 30]
import { ENV, DT } from "./u_env.mjs";
import { ControlledSim as Speed, presetLayers } from "../c_sim.js";
import { ControlledSim as Ref } from "../../tc_controlled1/c_sim.js";
import { program, PAGE } from "./c_torture.mjs";
const AR = process.argv, opt = (k, d) => { const i = AR.indexOf("--" + k); return i > 0 ? AR[i + 1] : d; }, seeds = +opt("seeds", 8), dur = +opt("dur", 30);
let same = 0, n = 0; const bad = [];
for (const mode of ["BALL OFF", "BALL ON · FREE", "BALL ON · CONTROLLED"]) for (const pace of ["CURRENT", undefined]) for (let s = 1; s <= seeds; s++) {
  const o = Object.assign(JSON.parse(JSON.stringify(PAGE)), { layers: presetLayers("FULL") }, mode === "BALL OFF" ? { ballOn: false } : {}, mode.endsWith("CONTROLLED") ? { control: "CONTROLLED" } : {});
  const a = new Speed(ENV, Object.assign({}, o, pace ? { pace } : {})), b = new Ref(ENV, JSON.parse(JSON.stringify(o))), P = program(s, dur); let ok = true;
  for (let k = 0; k < Math.round(dur / DT) && ok; k++) { const q = P.req(k * DT); a.step(q); b.step(q); const x = a.stateAt(a.t), y = b.stateAt(b.t);
    if (a.hash !== b.hash || x.P[0] !== y.P[0] || x.P[1] !== y.P[1] || a.ball.p[0] !== b.ball.p[0] || a.ball.p[1] !== b.ball.p[1]) { ok = false; bad.push(`${mode} pace ${pace ?? "(none)"} seed ${s} diverged at tick ${k}`); } }
  n++; if (ok) same++; }
console.log(`${same}/${n} identical: SPEED-99-V1 with pace CURRENT / none ≡ TC-CONTROLLED-1 (BALL OFF, BALL ON · FREE, BALL ON · CONTROLLED; ${seeds} seeded torture programs × ${dur} s each)`); for (const x of bad.slice(0, 10)) console.log("  " + x);
