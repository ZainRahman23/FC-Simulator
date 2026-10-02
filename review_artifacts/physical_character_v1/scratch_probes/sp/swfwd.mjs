// one swing: commanded vs actual foot origin, forward (relative to the landing ankle point) and height, and the forward velocities, over the swing
import { J, body, G2, M } from "../fg/lib.mjs"; const { Q, V } = M;
const first = "R", at = 0.6, K = +(process.argv[2] || 6), { spec, poses } = body("F0"), bi = (n) => spec.bodies.findIndex(b => b.name === n);
const steps = Array.from({ length: 30 }, (_, i) => ({ sw: (i % 2 === 0) === (first === "R") ? "R" : "L", ...(i === 0 ? { fwdK: 0.7 } : i === 1 ? { fwdK: 0.9 } : {}) }));
let LOCO = null; const T = []; const r = G2.runG2a(J, spec, "G2W_A8", { poses, keepStates: true, seconds: 1.6 + 30 * 0.58, rhythmOver: { steps, at }, onLoco: (l) => { LOCO = l; const f = l.planner.exec.refSwing; l.planner.exec.refSwing = (R, t, o, nv) => { const out = f(R, t, o, nv); if (!nv) T.push({ t, k: R.stepIndex, pos: out.pos, vel: out.vel, reach: out.reach, u: out.u }); return out; }; } });
const P = LOCO.planner, h0 = P.rhythm.wk.h0, hd = [Math.sin(h0), 0, Math.cos(h0)], d = P.exec.done.find(d => d.stepIndex === K), fb = bi("foot_" + d.sw);
const land = T.filter(e => e.k === K).pop().reach, fw = (p) => (p[0] - land[0]) * hd[0] + (p[2] - land[2]) * hd[2];
console.log("step", K, d.sw, "lift", (d.liftoff.t - d.tSw0).toFixed(3), "td", (d.td.t - d.tSw0).toFixed(3), "| t  u | fwd cmd act (cm) | y cmd act | vfwd cmd act (m/s) | pelvis vfwd");
for (const q of r.recs.filter(q => q.t >= d.tSw0 && q.t <= d.td.t + 0.02 && q.n % 6 === 0)) { const c = T.filter(e => e.k === K && e.t <= q.t + 1e-9).pop(); if (!c) continue; const S = q.states[fb];
  console.log(`${(q.t - d.tSw0).toFixed(3)} ${c.u.toFixed(2)} | ${(fw(c.pos) * 100).toFixed(1).padStart(6)} ${(fw(S.pos) * 100).toFixed(1).padStart(6)} | ${(c.pos[1] * 100).toFixed(1).padStart(5)} ${(S.pos[1] * 100).toFixed(1).padStart(5)} | ${c.vel ? V.dot(c.vel, hd).toFixed(2).padStart(5) : "  -  "} ${V.dot(S.v, hd).toFixed(2).padStart(5)} | ${V.dot(q.states[0].v, hd).toFixed(2)}`); }
