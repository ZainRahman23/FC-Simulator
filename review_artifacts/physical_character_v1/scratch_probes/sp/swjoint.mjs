// swing-leg joint tracking: the arbiter's ledger for hip / knee / ankle of the swing leg — realized torque, envelope, saturation, owner, terms
import { J, body, G2, M } from "../fg/lib.mjs";
const first = process.argv[2] || "R", at = +(process.argv[3] || 0.6), K = +(process.argv[4] || 1), HX = JSON.parse(process.argv[5] || '{"swingGen":"v2"}'), { spec, poses } = body("F0");
const steps = Array.from({ length: 30 }, (_, i) => ({ sw: (i % 2 === 0) === (first === "R") ? "R" : "L", ...(i === 0 ? { fwdK: 0.7 } : i === 1 ? { fwdK: 0.9 } : {}) }));
let LOCO = null; const r = G2.runG2a(J, spec, "G2W_A8", { poses, keepStates: true, seconds: 1.6 + 30 * 0.58, rhythmOver: { steps, at }, humanOver: HX, onLoco: (l) => { LOCO = l; } });
const d = LOCO.planner.exec.done.find(d => d.stepIndex === K), s = d.sw, f = (v) => Array.isArray(v) ? v.map(x => x.toFixed(0).padStart(4)).join("") : (v ?? 0).toFixed(0).padStart(4);
const ji = (n) => spec.joints.findIndex(j => j.name === n);
console.log("step", K, s, "lift", (d.liftoff.t - d.tSw0).toFixed(3), "td", (d.td.t - d.tSw0).toFixed(3));
for (const q of r.recs.filter(q => q.t >= d.tSw0 && q.t <= d.td.t && q.n % 8 === 0)) { let line = (q.t - d.tSw0).toFixed(3);
  for (const jn of ["hip_" + s, "knee_" + s]) { const e = q.arb[ji(jn)]; line += ` | ${jn} own ${String(e.owner).slice(0, 6)} real${f(e.real)} env${Array.isArray(e.env) ? "" : ""} ${e.sat ? (Array.isArray(e.sat) ? e.sat.map(b => b ? "S" : ".").join("") : "S") : "."} kp ${Array.isArray(e.kp) ? e.kp[0].toFixed(0) : (e.kp ?? 0).toFixed(0)}`; }
  console.log(line); }
const e0 = r.recs.find(q => q.t >= d.tSw0 + 0.15).arb[ji("hip_" + s)]; console.log(JSON.stringify({ terms: e0.terms, env: e0.env, pred: e0.pred, real: e0.real, kp: e0.kp, kd: e0.kd }).slice(0, 1500));
