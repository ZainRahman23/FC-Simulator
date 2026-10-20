// technical_control15/tools/tc15_protect.mjs — THE BALL-EXPOSURE DIAGNOSTIC's summaries (the per-frame measure is tc15_ref.js exposureAt: recorded
// by every reference run as rec.exp). Owner: a provisional geometric protection diagnostic; NOT gameplay, NOT a tackle probability.
//   summarise(rec, t0, t1): over [t0, t1] per pressure direction the share of frames with a direct line to the ball; the mean open sector.
export { DIRS, PX, exposureAt } from "../tc15_ref.js";
import { DIRS } from "../tc15_ref.js";
export function summarise(rec, t0, t1) { const F = rec.filter((r) => r.exp && r.t >= t0 - 1e-9 && r.t <= t1 + 1e-9), n = F.length || 1, out = { t0, t1, frames: F.length, exposedShare: {}, openDegMean: +(F.reduce((a, r) => a + r.exp.openDeg, 0) / n).toFixed(0) };
  for (const k of Object.keys(DIRS)) out.exposedShare[k] = +(F.filter((r) => !r.exp.named[k]).length / n).toFixed(2); return out; }
