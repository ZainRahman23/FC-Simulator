// tc_controlled1/tools/c_cases.mjs — the owner's morning playtest cases (u_tests.js MORNING) in both models: every possession exit, the largest
// separation, touches (simulation only).   node c_cases.mjs
import { makeSim, DT } from "./u_env.mjs";
import { presetLayers } from "../c_sim.js";
import { MORNING, MODES, reqOf } from "../u_tests.js";
for (const sp of MORNING) { const row = [];
  for (const control of ["FREE", "CONTROLLED"]) { const sim = makeSim("TL", { layers: presetLayers("FULL"), control }); let mx = 0;
    for (let k = 0; k < Math.round(sp.dur / DT); k++) { sim.step(reqOf(sp.f, k * DT, MODES[sp.mode])); if (sim.t > 3) { const st = sim.stateAt(sim.t), b = sim.ball.p; mx = Math.max(mx, Math.hypot(b[0] - st.P[0], b[1] - st.P[1])); } }
    const ex = sim.poss.log.filter((e) => e.to === "FREE").map((e) => e.why); row.push(`${control} exits ${ex.length ? ex.join(",") : "none"} sep≤${mx.toFixed(2)} touches ${sim.contacts.filter((c) => c.t > 3 && !c.missed).length}`); }
  console.log(sp.name.slice(0, 46).padEnd(46), row.join(" | ")); }
