// occupy3b2/tools/b2_noise.mjs — HOW CHAOTIC ARE THE METRICS? 3B.1 against 3B.1 with a physically irrelevant change (its contact tolerance + 1 µm):
// the spread the set's totals show for nothing — every comparison of configurations is read against it
import { ENV, setOf, arg, cm, limbMeasure } from "../../occupy3b/tools/l3_common.mjs";
import { measure } from "./b2_measure.mjs";
import { runB2 } from "../b2_run.js";
import { RES3B } from "../../occupy3b/l3_limb.js";
const L = setOf(arg("set", "review"));
for (const [nm, tol] of [["3B.1", 0.02], ["3B.1, tol +1 µm", 0.020001], ["3B.1, tol −1 µm", 0.019999]]) { RES3B.tol = tol; let t5 = 0, cr = 0, falls = 0, steps = 0, jv = 0;
  for (const tc of L) { if (tc.onlyCommitted) { const p = runB2(ENV, tc, "S2D", { record: false }); if (!p.W.tk.act) continue; } const o = measure(tc, "S3B"), lm = limbMeasure(runB2.last); t5 += lm.legs5; cr += o.crossed; jv += o.jointV; for (const e of o.eps) for (const k of ["ATT", "DEF"]) if (e.players[k]) { falls += e.players[k].fall ? 1 : 0; steps += e.players[k].steps.length; } }
  console.log(`${nm.padEnd(20)} >5cm ${t5} · crossed ${cr} · jointV ${jv} · falls ${falls} · steps ${steps}`); }
RES3B.tol = 0.02;
