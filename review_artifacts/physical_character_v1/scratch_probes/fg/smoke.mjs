import { J, body, G1, G2, f3 } from "./lib.mjs";
for (const fm of ["F0", "F1", "F2", "F2h"]) { const { spec, poses } = body(fm); const t0 = Date.now();
  let r; try { r = G2.runG2a(J, spec, "G2a_walkInPlace", { poses, seconds: 4 }); } catch (e) { console.log(fm, "ERROR", e.message.slice(0, 200)); console.log(e.stack.split("\n").slice(1, 4).join("\n")); continue; }
  const last = r.recs[r.recs.length - 1], ti = spec.bodies.findIndex(b => b.name === "toe_R");
  console.log(`${fm}: bodies ${spec.bodies.length} outcome ${r.outcome} hash ${r.hash} COM y ${f3(last.com[1])} steps landed ${r.steps.filter(s => s.status === "LANDED").length} · ${((Date.now() - t0) / 1000).toFixed(1)} s cpu${ti >= 0 ? ` · toe_R y ${f3(last.states ? last.states[ti].pos[1] : NaN)}` : ""}`); }
