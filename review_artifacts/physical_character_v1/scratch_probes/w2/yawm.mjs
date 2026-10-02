// yaw metrics: transverse whole-body angular momentum range per stride (normalised by M·H, Silverman et al.: human level walking 0.014 ± 0.003 m/s),
// pelvis yaw range per step, DS / SS share of the L_y change
import { spec, C, M, f3 } from "./lib.mjs";
const { Q } = M; const yawOf = (q) => { const f = Q.rot(q, [0, 0, 1]); return Math.atan2(f[0], f[2]); }, MH = spec.totalMass * 1.9;
export function yawMetrics(r, t0, t1) { const h0 = r.LOCO.planner.rhythm.wk.h0, R_ = r.recs.filter(q => q.t >= t0 && q.t <= t1 && q.states); if (R_.length < 10) return null;
  const Ly = R_.map(q => C.bodyState(spec, q.states, "R").L[1]), py = R_.map(q => { let y = yawOf(q.states[0].rot) - h0; return Math.atan2(Math.sin(y), Math.cos(y)) * 57.3; });
  let dDS = 0, dSS = 0; for (let i = 1; i < R_.length; i++) { const d = Math.abs(Ly[i] - Ly[i - 1]); if (R_[i].rhythm && R_[i].rhythm.stage === "DS") dDS += d; else dSS += d; }
  return { rangeN: (Math.max(...Ly) - Math.min(...Ly)) / MH, LyMax: Math.max(...Ly.map(Math.abs)), pelvisRange: Math.max(...py) - Math.min(...py), dsShare: dDS / (dDS + dSS) }; }
