// occupy1/tools/o_deadlock.mjs — §21 NO DEADLOCK: the stress cases (head-on, side by side, crossing, one / both turning away, one committed,
// both committed), OLD vs OCCUPANCY V1 on the bodies as drawn: every CONTACT INTERVAL (a resolved pair within the 2 cm tolerance), its length
// and depth; for the cases whose inputs diverge at a known time (turning away at 1.6 s), how long contact lasts after it; the distance between
// the players at the end of the replay (they are apart again).   node o_deadlock.mjs
import { ENV } from "./o_env.mjs";
import { OCASES } from "../o_cases.js";
import { runO } from "../o_run.js";
import { volumesOf, detect, OCC } from "../o_volumes.js";
const DT = 1 / 240, hyp = Math.hypot;
const STRESS = [["headon-walk", "head-on (walk)"], ["headon-jog", "head-on (jog)"], ["side", "side by side"], ["cross", "crossing paths"], ["cross-m", "crossing paths (mirrored)"], ["headon-one-away", "head-on, the carrier turns away at 1.6 s", 1.6], ["headon-both-away", "head-on, both turn away at 1.6 s", 1.6], ["bf-into", "one committed: a Body Feint into a standing player"], ["croq-close", "one committed: a Croqueta past a standing player"], ["both-committed", "both committed: a Croqueta into a committed tackle"]];
console.log("NO DEADLOCK — contact intervals (a resolved pair within the 2 cm tolerance), OLD vs OCCUPANCY V1");
for (const [id, name, tDiv] of STRESS) { const tc = OCASES.find((x) => x.id === id), line = [];
  for (const m of ["OLD", "OCC"]) { const r = runO(ENV, tc, m), W = r.W, iv = []; let cur = null;
    for (const [k, fr] of [...W.frames.entries()].sort((a, b) => a[0] - b[0])) { let mx = -1; if (hyp(fr.a.P[0] - fr.d.P[0], fr.a.P[1] - fr.d.P[1]) < OCC.broad + 0.3) for (const x of detect(volumesOf(fr.a.J), volumesOf(fr.d.J), { within: 0.03 })) if (x.both) mx = Math.max(mx, x.pen); const on = mx > -OCC.tol;
      if (on && !cur) cur = { a: k, b: k, mx }; else if (on) { cur.b = k; cur.mx = Math.max(cur.mx, mx); } else if (cur) { iv.push(cur); cur = null; } }
    if (cur) iv.push(cur); const sa = W.att.stateAt(W.t), sd = W.def.stateAt(W.t), total = iv.reduce((a, x) => a + (x.b - x.a + 1) * DT, 0), longest = Math.max(0, ...iv.map((x) => (x.b - x.a + 1) * DT));
    const after = tDiv != null ? Math.max(0, ...iv.map((x) => x.b * DT - r.t0 - tDiv)) : null;
    line.push(`${m.padEnd(3)} ${String(iv.length).padStart(2)} intervals · in contact ${total.toFixed(2)} s (longest ${longest.toFixed(2)} s, deepest ${(Math.max(-1, ...iv.map((x) => x.mx)) * 100).toFixed(1)} cm)${after != null ? ` · contact ${after.toFixed(3)} s after the inputs diverge` : ""} · apart at the end: ${hyp(sa.P[0] - sd.P[0], sa.P[1] - sd.P[1]).toFixed(2)} m`); }
  console.log(`  ${name}\n      ${line.join("\n      ")}`); }
