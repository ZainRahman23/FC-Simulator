// the ground-reaction speed regulator in action: per step, v̄ at liftoff, the commanded CoP shift (mean), the realised CoP vs the demand without
// the shift (forward), and the single-support Δv
import { J, body, G2 } from "../fg/lib.mjs";
const { spec, poses } = body("F0"), k = +(process.argv[2] || 0.15), vd = +(process.argv[3] || 0.45); const steps = Array.from({ length: 30 }, (_, i) => ({ sw: i % 2 === 0 ? "R" : "L", ...(i === 0 ? { fwdK: 0.7 } : i === 1 ? { fwdK: 0.9 } : {}) }));
let LOCO = null; const r = G2.runG2a(J, spec, "G2W_A8", { poses, keepStates: true, seconds: 12, rhythmOver: { steps, at: 0.6, walk: { vReg: { vd, k, max: 0.05, min: -0.04, tau: 0.5 } } }, onLoco: (l) => { LOCO = l; } });
const P = LOCO.planner, h0 = P.rhythm.wk.h0, hd = [Math.sin(h0), Math.cos(h0)], fw = (a) => a[0] * hd[0] + a[1] * hd[1], vF = (q) => q.vcom[0] * hd[0] + q.vcom[2] * hd[1];
for (const d of P.exec.done.filter(d => d.kind === "rhythmic" && d.liftoff && d.td)) { const W = r.recs.filter(q => q.t >= d.liftoff.t && q.t <= d.td.t && q.ctl && q.ctl.pRaw && q.copSmooth); const a = d.vreg || [];
  const m = (x) => x.length ? x.reduce((s, v) => s + v, 0) / x.length : NaN, q0 = W[0], q1 = W[W.length - 1];
  if (d.vregD) console.log("   dbg", JSON.stringify(d.vregD[0].map(v => v == null ? v : +v.toFixed(3))));
  console.log(`k${d.stepIndex} | v at lift ${vF(q0).toFixed(2)} | shift mean ${(m(a) * 100).toFixed(1)} cm | CoP − COM fwd mean ${(m(W.map(q => fw([q.copSmooth[0] - q.com[0], q.copSmooth[1] - q.com[2]]))) * 100).toFixed(1)} cm | SS Δv ${(vF(q1) - vF(q0)).toFixed(3)} | uAt ${d.td.uAt.toFixed(2)}`); }
