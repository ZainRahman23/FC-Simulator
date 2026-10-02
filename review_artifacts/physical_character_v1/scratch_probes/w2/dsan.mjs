// per double support: contact events and the yaw impulse split (horizontal-force couple about the COM vs free moments)
import { spec, W, C, M, f3 } from "./lib.mjs";
const { V } = M;
export function dsAnalyse(r) { const LOCO = r.LOCO, R_ = r.recs, done = LOCO.planner.exec.done.filter(d => d.kind === "rhythmic" && d.td), out = [];
  const tF = (R_.find(q => q.com[1] < 0.75) || { t: 1e9 }).t;
  for (let k = 0; k < done.length; k++) { const d = done[k], nx = done[k + 1] || LOCO.planner.exec.done.find(e => e.kind === "rhythmic" && e.stepIndex === d.stepIndex + 1), td = d.td.t, lift = nx && nx.liftoff ? nx.liftoff.t : null;
    if (td > tF) break; const landed = d.sw, trail = d.sw === "R" ? "L" : "R", e = { k: d.stepIndex, landed, td, first: {}, end: lift != null ? lift - td : null };
    const W_ = R_.filter(q => q.t >= td - 1e-9 && q.t <= (lift ?? td + 0.6) + 1e-9); let Ltot = null, Lprev = null, cpl = 0, dtq = 1 / 240, Fpk = { landBrake: 0, trailProp: 0 };
    const q0 = W_[0]; e.tdContact = q0 ? (q0.feet[landed].heel && !q0.feet[landed].toe ? "heel" : q0.feet[landed].toe && !q0.feet[landed].heel ? "toe" : "flat") : "?";
    for (const q of W_) { const dt = q.t - td, F = q.feet[landed], Tr = q.feet[trail], set = (kk, c) => { if (c && e.first[kk] == null) e.first[kk] = dt; };
      set("flat", F.heel && F.toe); set("land35", F.load >= 0.35 * W); set("land60", F.load >= 0.6 * W); set("trail30", Tr.load <= 0.30 * W); set("trail0", Tr.load < 25);
      if (q.states) { const B = C.bodyState(spec, q.states, trail); if (Lprev == null) Lprev = B.L[1]; Ltot = B.L[1];
        const c = B.com; let tau = 0; for (const s of [landed, trail]) { const f = q.feet[s]; if (!f.touching || !f.centroid) continue; const p = f.centroid, Fx = f.shear[0], Fz = f.shear[2]; tau += (p[2] - c[2]) * Fx - (p[0] - c[0]) * Fz; } cpl += tau * dtq; } }
    if (Lprev != null) { e.dL = Ltot - Lprev; e.couple = cpl; e.free = e.dL - cpl; }
    out.push(e); }
  return out; }
export function dsPrint(rows) { for (const e of rows) console.log(`  DS k${e.k} ${e.landed}-landed (${e.tdContact}) td ${f3(e.td, 2)} end +${f3(e.end)} | flat +${f3(e.first.flat)} land35 +${f3(e.first.land35)} land60 +${f3(e.first.land60)} trail30 +${f3(e.first.trail30)} trail0 +${f3(e.first.trail0)} | ΔLy ${f3(e.dL, 2)} = couple ${f3(e.couple, 2)} + free ${f3(e.free, 2)}`); }
