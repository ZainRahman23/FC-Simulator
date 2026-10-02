// swing-hip torque by module (arbiter terms) during walking swings — flexion axis (1): mean |τ| and peak, by swing phase
import { J, body, G2, M } from "../fg/lib.mjs";
const { spec, poses } = body("F0"); const T = {}, P = {};
for (const [first, at] of [["R", 0.5], ["L", 0.55]]) {
  const n = 10, steps = Array.from({ length: n }, (_, i) => ({ sw: (i % 2 === 0) === (first === "R") ? "R" : "L", ...(i === 0 ? { fwdK: 0.7 } : i === 1 ? { fwdK: 0.9 } : {}) }));
  let LOCO = null; const HX = process.argv[2] ? JSON.parse(process.argv[2]) : null; const r = G2.runG2a(J, spec, "G2W_A8", { poses, keepStates: true, seconds: 1.6 + n * 0.6, rhythmOver: { steps, at }, ...(HX ? { humanOver: HX } : {}), onLoco: l => { LOCO = l; } });
  const tF = (r.recs.find(q => q.com[1] < 0.75) || { t: 1e9 }).t, D = LOCO.planner.exec.done.filter(d => d.kind === "rhythmic" && d.stepIndex >= 1 && d.liftoff && d.td && d.td.t < tF - 0.3);
  for (const d of D) for (const q of r.recs) { if (q.t < d.liftoff.t || q.t > d.td.t || !q.arb) continue; const e = q.arb.find(x => x.joint === "hip_" + d.sw); if (!e) continue;
    const ph = Math.min(4, Math.floor((q.t - d.liftoff.t) / (d.td.t - d.liftoff.t) * 5));
    for (const tm of e.terms) { const v = Array.isArray(tm.alw ?? tm.req) ? (tm.alw ?? tm.req)[1] : (tm.alw ?? tm.req); const k = tm.m + "/" + tm.c; (T[k] = T[k] || [0, 0, 0, 0, 0, 0]); T[k][ph] += Math.abs(v); T[k][5] = Math.max(T[k][5], Math.abs(v)); }
    const rv = Array.isArray(e.real) ? e.real[1] : e.real, pr = Array.isArray(e.pred) ? e.pred[1] : e.pred; (P.real = P.real || [0, 0, 0, 0, 0, 0]); P.real[ph] += Math.abs(rv); P.real[5] = Math.max(P.real[5], Math.abs(rv)); (P.n = P.n || [0, 0, 0, 0, 0]); P.n[ph]++; } }
console.log("swing-hip flexion axis, mean |τ| per fifth of the air phase (N·m) and the peak:");
for (const [k, v] of Object.entries(T)) console.log(`  ${k.padEnd(34)} ${v.slice(0, 5).map((x, i) => (x / P.n[i]).toFixed(0).padStart(5)).join(" ")} | peak ${v[5].toFixed(0)}`);
console.log(`  ${"REALISED".padEnd(34)} ${P.real.slice(0, 5).map((x, i) => (x / P.n[i]).toFixed(0).padStart(5)).join(" ")} | peak ${P.real[5].toFixed(0)}`);
