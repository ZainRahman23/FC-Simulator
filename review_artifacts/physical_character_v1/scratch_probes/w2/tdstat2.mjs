import { walk, f3, W, M, bi } from "./lib.mjs";
const COND = { df: 0.237, dl: 0.368, T: 0.45 }, extra = JSON.parse(process.argv[2] || "{}"), hum = JSON.parse(process.argv[3] || "{}"), rows = [];
const U = []; for (const df of [0.22, 0.28, 0.34, 0.40, 0.46]) U.push({ df }); for (const dl of [0.18, 0.22, 0.30, 0.34]) U.push({ dl }); for (const T of [0.37, 0.41, 0.49, 0.53]) U.push({ T });
for (const u of U) { const r = walk({ n: 4, seconds: 3.9, keep: true, walk: { ...extra, char: { 0: COND, 1: { df: 0.34, dl: 0.26, T: 0.45, ...u } } }, human: hum });
  const tF = (r.recs.find(q => q.com[1] < 0.75) || { t: 1e9 }).t;
  for (const x of r.LOCO.planner.exec.done.filter(x => x.kind === "rhythmic" && x.td)) { const td = x.td.t; if (td > tF - 0.2) continue; if ((x.td.uAt ?? 0) < 0.7 || !x.liftoff || td - x.liftoff.t < 0.2) continue; const fz = M.Q.rot(r.recs.find(q => q.t >= td - 1e-9).states[bi('foot_' + x.sw)].rot, [0, 0, 1]); if (Math.atan2(fz[1], Math.hypot(fz[0], fz[2])) * 57.3 < -10) continue; const W_ = r.recs.filter(q => q.t >= td - 1e-9 && q.t <= td + 0.2);
    const ho = (W_.find(q => q.rhythm && q.rhythm.stage === "DS") || { t: null }).t; let off = 0, b = null, pk1 = 0;
    for (const q of W_) { const F = q.feet[x.sw]; if (!F.touching && F.load < 25) { off++; if (off === 3 && b == null && q.t < td + 0.15) b = q.t - 2 / 240 - td; } else off = 0; if (ho == null || q.t < ho) pk1 = Math.max(pk1, F.load / W); }
    rows.push({ b, ho: ho != null ? ho - td : null, pk1 }); } }
const pre = rows.filter(e => e.b != null && e.ho != null && e.b < e.ho).length, post = rows.filter(e => e.b != null && (e.ho == null || e.b >= e.ho)).length;
const hos = rows.map(e => e.ho).filter(x => x != null).sort((a, b) => a - b);
console.log(`n ${rows.length} · bounce before hand-over ${pre} · after ${post} · hand-over at +${f3(hos[Math.floor(hos.length / 2)])} s (p50) · load at hand-over p50 ${f3(rows.map(e => e.pk1).sort()[Math.floor(rows.length / 2)], 2)} BW`);
console.log("bounce starts:", rows.filter(e => e.b != null).map(e => `${f3(e.b)}(ho ${f3(e.ho)})`).join(" "));
