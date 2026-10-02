// DCM tracking in single support: per step, the forward capture-point error (ξ − ξ_ref) at liftoff, mid-stance and touchdown; the CoP demand's
// forward departure from the reference CoP (mean, max) and how much the sole clamp removed
import { J, body, G2 } from "../fg/lib.mjs";
const { spec, poses } = body("F0"), k = +(process.argv[2] || 1); const steps = Array.from({ length: 30 }, (_, i) => ({ sw: i % 2 === 0 ? "R" : "L", ...(i === 0 ? { fwdK: 0.7 } : i === 1 ? { fwdK: 0.9 } : {}) }));
let LOCO = null; const r = G2.runG2a(J, spec, "G2W_A8", { poses, keepStates: true, seconds: 12, rhythmOver: { steps, at: 0.6, walk: { dcmRef: { k, vd: 0.45, xL: [-0.114, 0.393] } } }, onLoco: (l) => { LOCO = l; } });
const P = LOCO.planner, h0 = P.rhythm.wk.h0, hd = [Math.sin(h0), Math.cos(h0)], fw = (a) => a[0] * hd[0] + a[1] * hd[1], vF = (q) => q.vcom[0] * hd[0] + q.vcom[2] * hd[1];
for (const d of P.exec.done.filter(d => d.kind === "rhythmic" && d.liftoff && d.td && d.dcm0)) { const W = r.recs.filter(q => q.t >= d.liftoff.t && q.t <= d.td.t && q.xiRefP && q.ctl && q.ctl.pRaw);
  const e = (q) => fw([q.xi[0] - q.xiRefP[0], q.xi[1] - q.xiRefP[1]]), q0 = W[0], qm = W[Math.floor(W.length / 2)], q1 = W[W.length - 1], cl = W.map(q => fw([q.ctl.pRaw[0] - q.ctl.pStar[0], q.ctl.pRaw[1] - q.ctl.pStar[1]]));
  console.log(`k${d.stepIndex} | v ${vF(q0).toFixed(2)} | ξ error lift ${(e(q0) * 100).toFixed(1)} mid ${(e(qm) * 100).toFixed(1)} td ${(e(q1) * 100).toFixed(1)} cm | clamp removed mean ${(cl.reduce((a, b) => a + b, 0) / cl.length * 100).toFixed(1)} max ${(Math.max(...cl.map(Math.abs)) * 100).toFixed(1)} cm | uAt ${d.td.uAt.toFixed(2)}`); }
