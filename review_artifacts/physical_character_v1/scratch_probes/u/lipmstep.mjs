// STEP-LEVEL LIPM prediction with the MEASURED CoP: integrate ξ̇ = ω(ξ − p(t)) from an instant to touchdown / to the next step start
import { J, body, G2, M } from "../fg/lib.mjs"; const { Q, V } = M;
const { spec, poses } = body("F0"); const E = { lift_td: [], start_td: [], td_next: [], start_next: [], mid_td: [] };
for (const [first, at] of [["R", 0.5], ["L", 0.55], ["R", 0.6], ["L", 0.6], ["R", 0.55], ["L", 0.5]]) {
  const n = 14, steps = Array.from({ length: n }, (_, i) => ({ sw: (i % 2 === 0) === (first === "R") ? "R" : "L", ...(i === 0 ? { fwdK: 0.7 } : i === 1 ? { fwdK: 0.9 } : {}) }));
  let LOCO = null; const r = G2.runG2a(J, spec, "G2W_A8", { poses, keepStates: true, seconds: 1.6 + n * 0.6, rhythmOver: { steps, at }, onLoco: l => { LOCO = l; } });
  const R_ = r.recs, tF = (R_.find(q => q.com[1] < 0.75) || { t: 1e9 }).t, h0 = LOCO.planner.rhythm.wk.h0, hd = [Math.sin(h0), Math.cos(h0)], fw = (v) => v[0] * hd[0] + v[1] * hd[1];
  const idx = (t) => R_.findIndex(q => q.t >= t - 1e-9);
  const pred = (i0, i1) => { let xi = fw(R_[i0].xi); for (let i = i0; i < i1; i++) { const q = R_[i], w = Math.sqrt(9.81 / q.com[1]); const p = q.copSmooth ? fw(q.copSmooth) : xi; xi += (1 / 240) * w * (xi - p); } return xi - fw(R_[i1].xi); };
  const D = LOCO.planner.exec.done.filter(d => d.kind === "rhythmic" && d.stepIndex >= 1); for (let j = 0; j < D.length; j++) { const d = D[j], nx = D[j + 1]; if (!d.td || d.td.t > tF - 0.2 || !d.liftoff) continue;
    const iS = idx(d.tSw0), iL = idx(d.liftoff.t - 0.0125), iT = idx(d.td.t); E.lift_td.push(pred(iL, iT)); E.start_td.push(pred(iS, iT)); E.mid_td.push(pred(Math.round((iL + iT) / 2), iT));
    if (nx && nx.tSw0 < tF - 0.2) { const iN = idx(nx.tSw0); E.td_next.push(pred(iT, iN)); E.start_next.push(pred(iS, iN)); } } }
const rms = (a) => Math.sqrt(a.reduce((s, x) => s + x * x, 0) / a.length), mean = (a) => a.reduce((s, x) => s + x, 0) / a.length;
for (const [k, a] of Object.entries(E)) console.log(k.padEnd(11), "n", a.length, "| error (pred − actual ξ, fwd) mean", (mean(a) * 100).toFixed(1), "cm  rms", (rms(a) * 100).toFixed(1), "cm");
