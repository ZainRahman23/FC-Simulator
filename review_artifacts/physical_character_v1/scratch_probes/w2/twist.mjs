import { walk, spec, f3 } from "./lib.mjs";
const r = walk({ n: 12, seconds: 3.4, keep: true });
const J = (n) => spec.joints.findIndex(j => j.name === n), jn = ["hip_L", "hip_R", "ankle_L", "ankle_R", "knee_L", "knee_R"].map(n => [n, J(n)]);
console.log(spec.joints.map((j, i) => `${i}:${j.name}:${j.type}`).join(" "));
// the twist axis: print the realized torque per axis and the per-module terms for the hips in the window around the k1 DS (2.6–2.95)
const sample = r.recs.filter(q => q.t > 2.55 && q.t < 3.0 && Math.round(q.t * 240) % 6 === 0);
for (const q of sample) { const st = q.rhythm ? q.rhythm.stage : "-"; let s = `t ${f3(q.t, 3)} ${st} `;
  for (const [n, k] of jn.slice(0, 2).concat([["lumbar", 0]])) { const e = q.arb.find(a => a.joint === n); if (!e) continue; const real = e.real, terms = e.terms.map(tm => `${tm.m}:${Array.isArray(tm.alw ?? tm.req) ? (tm.alw ?? tm.req).map(x => x.toFixed(0)).join("/") : (tm.alw ?? tm.req).toFixed(0)}`).join(" ");
    s += `| ${n} real ${Array.isArray(real) ? real.map(x => x.toFixed(0)).join("/") : real} own ${e.owner} [${terms}] `; }
  console.log(s); }
