// per phase (SS / DS): yaw impulse = Δ L_y, split into the ground-reaction couple about the COM (per-foot shear at each foot's contact centroid)
// and the remainder (free moments: vertical torques at the soles)
import { walk, spec, C, f3, bi } from "./lib.mjs";
export function yawSplit(r, t0, t1) { const R_ = r.recs.filter(q => q.t >= t0 && q.t <= t1 && q.states), out = []; let cur = null, prevL = null;
  for (const q of R_) { const ph = q.rhythm && q.rhythm.stage === "DS" ? "DS" : "SS", B = C.bodyState(spec, q.states, "R"), c = B.com; let tau = 0;
    for (const s of ["L", "R"]) { const f = q.feet[s]; if (!f.touching || f.load < 5) continue; const p = f.centroid && f.centroid.every(Number.isFinite) ? f.centroid : q.states[bi("foot_" + s)].pos; tau += (p[2] - c[2]) * f.shear[0] - (p[0] - c[0]) * f.shear[2]; }
    if (!cur || cur.ph !== ph) { if (cur) out.push(cur); cur = { ph, t0: q.t, L0: B.L[1], cpl: 0 }; } cur.cpl += tau / 240; cur.L1 = B.L[1]; cur.t1 = q.t; }
  if (cur) out.push(cur); return out.map(p => ({ ...p, dL: p.L1 - p.L0, free: p.L1 - p.L0 - p.cpl })); }
if (process.argv[1].endsWith("yawsplit.mjs")) { const COND = { df: 0.237, dl: 0.368, T: 0.45 };
  for (const T of [0.41, 0.45]) { const r = walk({ n: 4, seconds: 3.6, keep: true, walk: { dsLead: true, dsFlat: false, char: { 0: COND, 1: { df: 0.34, dl: 0.26, T } } } }); console.log('T', T);
  for (const p of yawSplit(r, 1.5, 3.4)) console.log(`${p.ph} ${f3(p.t0, 2)}–${f3(p.t1, 2)} ΔLy ${f3(p.dL, 2).padStart(6)} = couple ${f3(p.cpl, 2).padStart(6)} + free ${f3(p.free, 2).padStart(6)}`); } }
