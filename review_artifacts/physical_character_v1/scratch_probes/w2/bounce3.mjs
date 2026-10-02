import { walk, f3, W, spec, M, bi } from "./lib.mjs";
const { Q, V } = M; const COND = { df: 0.237, dl: 0.368, T: 0.45 };
const U = []; for (const df of [0.22, 0.28, 0.34, 0.40, 0.46]) U.push({ df }); for (const dl of [0.18, 0.22, 0.30, 0.34]) U.push({ dl }); for (const T of [0.37, 0.41, 0.49, 0.53]) U.push({ T });
const box = spec.bodies[bi("foot_R")].shapes[0]; let shown = 0;
for (const u of U) { if (shown >= 2) break; const r = walk({ n: 4, seconds: 3.9, keep: true, walk: { char: { 0: COND, 1: { df: 0.34, dl: 0.26, T: 0.45, ...u } } } });
  for (const x of r.LOCO.planner.exec.done.filter(x => x.kind === "rhythmic" && x.td)) { const td = x.td.t, s = x.sw, fb = bi("foot_" + s); const W_ = r.recs.filter(q => q.t >= td - 0.012 && q.t <= td + 0.06);
    let off = 0, b = null; for (const q of W_) { if (q.t < td) continue; const F = q.feet[s]; if (!F.touching && F.load < 25) { off++; if (off === 3 && b == null) b = q.t; } else off = 0; }
    if (b == null || b - td > 0.03) continue; shown++; console.log(`== ${JSON.stringify(u)} step ${x.stepIndex} ${s} td ${f3(td)}`);
    const pt = (S, sx, sz) => V.add(S[fb].pos, Q.rot(S[fb].rot, [box.pos[0] + sx * box.he[0], box.pos[1] - box.he[1], box.pos[2] + sz * box.he[2]]))[1];
    for (const q of W_) { const S = q.states, F = q.feet[s], tg = q.swingTgt, pz = Q.rot(S[fb].rot, [0, 0, 1]), pit = Math.atan2(pz[1], Math.hypot(pz[0], pz[2])) * 57.3, wl = S[fb].w, latax = Q.rot(S[fb].rot, [1, 0, 0]), prate = V.dot(wl, latax) * 57.3;
      console.log(`t+${f3(q.t - td)} load ${f3(F.load / W, 2)} n${F.points ? F.points.length : 0} heel ${f3(Math.min(pt(S, -1, -1), pt(S, 1, -1)) * 1000, 1)}mm toe ${f3(Math.min(pt(S, -1, 1), pt(S, 1, 1)) * 1000, 1)}mm pitch ${f3(pit, 1)} rate ${f3(prate, 0)}°/s ankV ${f3(S[fb].v[1], 2)} tgt ${tg && tg.pos ? f3(tg.pos[1] * 1000, 1) : "-"} tgtRho? ${tg && tg.rot ? f3(Math.atan2(Q.rot(tg.rot, [0, 0, 1])[1], 1) * 57.3, 1) : "-"}`); }
    if (shown >= 2) break; } }
