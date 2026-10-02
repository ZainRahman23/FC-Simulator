// does the capture point obey ξ̇ = ω(ξ − p) with the MEASURED CoP? (walking, along the heading) — and the CMP from the turf force
import { J, body, G2, M } from "../fg/lib.mjs"; const { Q, V } = M;
const { spec, poses } = body("F0"), Mtot = spec.totalMass; const E = { ss: [], ds: [] }, Ef = { ss: [], ds: [] }, Hs = [];
for (const [first, at] of [["R", 0.5], ["L", 0.55], ["R", 0.6], ["L", 0.6]]) {
  const n = 14, steps = Array.from({ length: n }, (_, i) => ({ sw: (i % 2 === 0) === (first === "R") ? "R" : "L", ...(i === 0 ? { fwdK: 0.7 } : i === 1 ? { fwdK: 0.9 } : {}) }));
  let LOCO = null; const r = G2.runG2a(J, spec, "G2W_A8", { poses, keepStates: true, seconds: 1.6 + n * 0.6, rhythmOver: { steps, at }, onLoco: l => { LOCO = l; } });
  const R_ = r.recs, tF = (R_.find(q => q.com[1] < 0.75) || { t: 1e9 }).t, h0 = LOCO.planner.rhythm.wk.h0, hd = [Math.sin(h0), Math.cos(h0)], fw = (a, b) => a * hd[0] + b * hd[1];
  for (let i = 300; i < R_.length - 2; i++) { const q = R_[i], q1 = R_[i + 1], q0 = R_[i - 1]; if (q.t > tF - 0.4 || !q.copSmooth) continue;
    const h = q.com[1], w = Math.sqrt(9.81 / h), xi = fw(q.xi[0], q.xi[1]), dxi = (fw(q1.xi[0], q1.xi[1]) - fw(q0.xi[0], q0.xi[1])) / (2 / 240), p = fw(q.copSmooth[0], q.copSmooth[1]);
    const ss = !(q.feet.L.touching && q.feet.R.touching) ? "ss" : "ds", res = dxi - w * (xi - p); E[ss].push(res);
    // the CMP from the turf force: x_cmp = x_com − F_h/F_v · h
    const F = [0, 0, 0]; for (const s of ["L", "R"]) { F[0] += q.feet[s].shear[0]; F[2] += q.feet[s].shear[2]; F[1] += q.feet[s].load || 0; }
    if (F[1] > 200) { const cmp = fw(q.com[0], q.com[2]) - fw(F[0], F[2]) / F[1] * h; Ef[ss].push([p - cmp]); } Hs.push(h); } }
const rms = (a) => Math.sqrt(a.reduce((s, x) => s + x * x, 0) / a.length), mean = (a) => a.reduce((s, x) => s + x, 0) / a.length;
for (const k of ["ss", "ds"]) console.log(k, "residual of ξ̇ − ω(ξ − p_CoP): mean", mean(E[k]).toFixed(3), "rms", rms(E[k]).toFixed(3), "m/s  | CoP − CMP: mean", mean(Ef[k].map(x => x[0])).toFixed(3), "rms", rms(Ef[k].map(x => x[0])).toFixed(3), "m  | n", E[k].length);
console.log("COM height mean", mean(Hs).toFixed(3));
