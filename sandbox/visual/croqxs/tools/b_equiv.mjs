// ballon1/tools/b_equiv.mjs — BALL-ON PACE V1 changes nothing it should not: (1) without a carry candidate the ballon1 copy ≡ the S99 build
// (speed99/, the 99 pace D38 + EXPANDED) — BALL OFF, BALL ON · FREE, BALL ON · CONTROLLED; (2) with a candidate but the BALL OFF it ≡ BALL OFF
// without one (the envelope binds only with the ball). Seeded torture programs; every tick's hash, centre of mass and ball compared (bit-identical)
//   node b_equiv.mjs [--seeds 8] [--dur 30]
import { ENV, DT } from "./u_env.mjs";
import { ControlledSim as Ball1, presetLayers } from "../c_sim.js";
import { ControlledSim as S99 } from "../../speed99/c_sim.js";
import { program, PAGE } from "./c_torture.mjs";
const AR = process.argv, opt = (k, d) => { const i = AR.indexOf("--" + k); return i > 0 ? AR[i + 1] : d; }, seeds = +opt("seeds", 8), dur = +opt("dur", 30);
const base = (extra) => Object.assign(JSON.parse(JSON.stringify(PAGE)), { layers: presetLayers("FULL"), pace: "D38", vocab: "EXPANDED" }, extra);
function same(A, B, P) { for (let k = 0; k < Math.round(dur / DT); k++) { const q = P.req(k * DT); A.step(q); B.step(q); const x = A.stateAt(A.t), y = B.stateAt(B.t);
  if (A.hash !== B.hash || x.P[0] !== y.P[0] || x.P[1] !== y.P[1] || A.ball.p[0] !== B.ball.p[0] || A.ball.p[1] !== B.ball.p[1]) return k; } return -1; }
let ok1 = 0, n1 = 0, ok2 = 0, n2 = 0; const bad = [];
for (const mode of ["BALL OFF", "BALL ON · FREE", "BALL ON · CONTROLLED"]) for (let s = 1; s <= seeds; s++) { const o = base(mode === "BALL OFF" ? { ballOn: false } : mode.endsWith("CONTROLLED") ? { control: "CONTROLLED" } : {});
  const k = same(new Ball1(ENV, JSON.parse(JSON.stringify(o))), new S99(ENV, JSON.parse(JSON.stringify(o))), program(s, dur)); n1++; if (k < 0) ok1++; else bad.push(`(1) ${mode} seed ${s} diverged at tick ${k}`); }
for (const carry of ["A", "B", "C"]) for (let s = 1; s <= seeds; s++) { const o = base({ ballOn: false, control: "CONTROLLED" });
  const k = same(new Ball1(ENV, Object.assign(JSON.parse(JSON.stringify(o)), { carry })), new Ball1(ENV, JSON.parse(JSON.stringify(o))), program(s, dur)); n2++; if (k < 0) ok2++; else bad.push(`(2) carry ${carry} BALL OFF seed ${s} diverged at tick ${k}`); }
console.log(`(1) ${ok1}/${n1} identical: ballon1 without a carry candidate ≡ the S99 build (speed99/), D38 + EXPANDED (BALL OFF, BALL ON · FREE, BALL ON · CONTROLLED; ${seeds} seeded torture programs × ${dur} s)`);
console.log(`(2) ${ok2}/${n2} identical: BALL OFF with a carry candidate (A / B / C) ≡ BALL OFF without one`); for (const x of bad.slice(0, 10)) console.log("  " + x);
