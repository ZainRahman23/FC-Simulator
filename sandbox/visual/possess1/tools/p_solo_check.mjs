// possess1/tools/p_solo_check.mjs — a quick single-player identity probe: the canonical ControlledSim vs SharedSim alone, 6 curated cases ×
// 20 s random stick input, every tick's centre of mass, ball, contacts and possession log (the full proof is the milestone regression under the hook)
import { ENV } from "../../vocab2/tools/u_env.mjs";
import { ControlledSim, presetLayers } from "../../vocab2/c_sim.js";
import { caseOpts } from "../../vocab2/v_run.js";
import { SharedSim } from "../p_sim.js";
import { rng } from "../../tackle1/tools/t_matrix.mjs";
const o = () => Object.assign(caseOpts({ pref: "R" }, false), { layers: presetLayers("FULL") }); let bad = 0, ticks = 0; const t0 = performance.now(); let tA = 0, tB = 0;
for (let s = 1; s <= 6; s++) { const A = new ControlledSim(ENV, o()), B = new SharedSim(ENV, o()), R = rng(s); let h = 0, mode = "JOG";
  for (let k = 0; k < 240 * 20; k++) { if (k % 60 === 0) { const u = R(); h = u < 0.15 ? null : (R() - 0.5) * 2 * Math.PI; mode = ["WALK", "JOG", "RUN", "SPRINT"][Math.floor(R() * 4)]; } const q = { h, mode, keys: 0 };
    let c = performance.now(); A.step(q); tA += performance.now() - c; c = performance.now(); B.step(q); tB += performance.now() - c; ticks++;
    const a = A.stateAt(A.t), b = B.stateAt(B.t); if (a.P[0] !== b.P[0] || a.P[1] !== b.P[1] || A.ball.p[0] !== B.ball.p[0] || A.ball.p[1] !== B.ball.p[1] || A.hash !== B.hash || A.contacts.length !== B.contacts.length || A.poss.state !== B.poss.state) { bad++; if (bad < 4) console.log("differ seed", s, "tick", k); break; } } }
console.log(`SINGLE PLAYER — canonical ControlledSim vs SharedSim alone: ${bad ? bad + " runs DIFFER" : "6 / 6 runs identical"} (6 × ${ticks / 6} ticks; CPU canonical ${(tA / ticks * 1000).toFixed(1)} µs/tick, SharedSim ${(tB / ticks * 1000).toFixed(1)} µs/tick)`);
