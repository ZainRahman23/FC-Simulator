// SP2E timing diagnostics of one run record (reads the record; nothing is simulated) — applied identically to A (SP2A), SP2C, SP2D and SP2E.
// Every 12.5 ms from 0.2 s before the first fold-side turf contact (thigh / shank / pelvis after the plant push-off) to the end of the run:
//   trunkDeg / trunkBack / trunkSide   thorax up-axis angle from vertical, its back (against the travel) and fold-side components (°)
//   trunkRot      trunk axial rotation relative to the pelvis = lumbar.rot + thoracic.rot (°, + = chest turned toward the tackling side: "open")
//   chestUp       thorax anterior axis · up (+1 face-up, 0 on the side, −1 chest-down)
//   pelvisRoll / pelvisPitch (°, roll + = onto the folded side)
//   shoulderL     posting (folded-side) arm elevation vs the thorax (0 at the side, 180 overhead); elbowL flexion (°)
//   handY         lowest point of the posting forearm + hand above the turf (m); handN / handBrake  its turf normal / friction-braking force (BW)
//   torsoY        lowest point of abdomen + thorax above the turf (m); torsoN (BW)
//   hipThighN     turf normal force on pelvis + folded thigh (BW); kneeN  folded knee region; shinN  folded shin; footN  folded boot (BW)
//   vh            COM horizontal speed (m/s); authMin  lowest regional authority (contact schedule × regional failure × global fallback)
// Events (times relative to the first fold-side contact): hand first touch; hand MEANINGFUL load (50 ms mean ≥ 0.10 BW); ESTABLISHED on the folded
// side / back (trunk ≥ 60° from vertical, pelvis roll ≥ 50°, chest not down, and the trunk stays ≥ 50° for the next 0.5 s); first chest-down; time
// "seated / upright" (trunk < 35°) after +0.3 s and before the stop; peak posting-shoulder elevation; values at the marks +0.10 / 0.20 / 0.25 / 0.30 / 0.50 / 1.00 s.
const S1 = new URL("../../slide_phys1/scripts/", import.meta.url).href, L = await import(S1 + "sp_lib.mjs"), { V, Q, B, bi } = L;
const RG = await import(new URL("../../slide_phys2/scripts/sp2_regions.mjs", import.meta.url).href), AA = await import(new URL("../../sp2a/scripts/sp2a_author.mjs", import.meta.url).href);
const FM = await import(new URL("../../sp2a/fsweep/scripts/fs_measure.mjs", import.meta.url).href);
const H = 1 / 240, BW = L.M * L.G, D = 180 / Math.PI, r3 = (x) => x == null || !Number.isFinite(x) ? null : Math.round(x * 1000) / 1000;
export const MARKS = [0.10, 0.20, 0.25, 0.30, 0.50, 1.00];
const grp = (c) => { const g = c.group || c.body; return g.startsWith("knee") ? "knee_" + g.slice(-1) : g.startsWith("shin") ? "shin_" + g.slice(-1) : g.startsWith("thigh") ? "thigh_" + g.slice(-1) : g === "pelvis" ? "pelvis" : c.body; };
const elev = (S, side) => { const th = S[bi("thorax")], down = Q.rot(th.rot, [0, -1, 0]), K = L.skel(S), u = V.sub(K["elbow_" + side], K["shoulder_" + side]); return Math.acos(Math.max(-1, Math.min(1, V.dot(down, u) / V.len(u)))) * D; };
export const COLS = ["t", "trel", "trunkDeg", "trunkBack", "trunkSide", "trunkRot", "chestUp", "pelvisRoll", "pelvisPitch", "shoulderL", "elbowL", "handY", "handN", "handBrake", "torsoY", "torsoN", "hipThighN", "kneeN", "shinN", "footN", "vh", "authMin"];
export function diagnoseE(o, m = 0.375) { const recs = o.recs, n = recs.length, tOff = o.tOffset || 0;
  let kTO = 0; { let seen = false; for (let k = 0; k < n; k++) { const on = recs[k].contacts.some(c => c.kind.startsWith("turf") && c.Jn > 0 && (c.a === "turf" ? c.b : c.a)[1] === "foot_L"); if (on) seen = true; else if (seen) { kTO = k; break; } } }
  const fold = new Set(["thigh_L", "shank_L", "pelvis"]), k0 = recs.findIndex((r, k) => k > kTO && r.contacts.some(c => c.kind.startsWith("turf") && c.Jn > 0 && fold.has((c.a === "turf" ? c.b : c.a)[1])));
  const fm = FM.measure(o, m), kStop = fm.stopped && fm.stopped.t != null ? Math.round((fm.stopped.t - tOff) * 240) - 1 : n - 1, t0 = recs[k0].t + tOff;
  const rows = []; let acc = null, handTouch = null; const zero = () => ({ handN: 0, handB: 0, torsoN: 0, hipThighN: 0, kneeN: 0, shinN: 0, footN: 0, n: 0 });
  for (let k = Math.max(1, k0 - 48); k < n; k++) { const r = recs[k], P = r.chars.tackler.P, h = Math.hypot(P[0], P[2]), dir = h > 0.05 ? [P[0] / h, 0, P[2] / h] : [0, 0, 1]; if (!acc) acc = zero(); acc.n++;
    for (const c of RG.turfContacts(r, recs[k - 1].S, "tackler", 0, null)) { if (!(c.Jn > 0)) continue; const g = grp(c), b = -V.dot([c.J[0], 0, c.J[2]], dir);
      if (c.body === "forearm_L") { acc.handN += c.Jn; acc.handB += b; if (handTouch == null && k >= k0) handTouch = r.t + tOff; }
      else if (c.body === "abdomen" || c.body === "thorax") acc.torsoN += c.Jn; else if (g === "pelvis" || g === "thigh_L") acc.hipThighN += c.Jn; else if (g === "knee_L") acc.kneeN += c.Jn; else if (g === "shin_L") acc.shinN += c.Jn; else if (c.body === "foot_L") acc.footN += c.Jn; }
    if ((k - k0) % 3 === 0 || k === n - 1) { const S = r.S.slice(0, B.length), th = S[bi("thorax")], up = Q.rot(th.rot, [0, 1, 0]), belly = Q.rot(th.rot, [0, 0, 1]), lat = [dir[2], 0, -dir[0]];
      const back = -V.dot(up, dir), side = -V.dot(up, lat), an = L.anatOf(S), pa = AA.pelvisAngles(S[0].rot), lg = o.ctrlLog && o.ctrlLog[k], f = (x) => r3(x / (acc.n * H) / BW);
      const low = (name) => L.PL.bodyLowest(B[bi(name)], S[bi(name)]).y, auth = lg ? Math.min(...Object.keys(lg.regF || {}).map(rg => (lg.contactAuth ? lg.contactAuth[rg] ?? 1 : 1) * (lg.regF[rg] ?? 1) * (lg.gF ?? 1))) : null;
      rows.push([r3(r.t + tOff), r3(r.t + tOff - t0), r3(Math.acos(Math.max(-1, Math.min(1, up[1]))) * D), r3(Math.atan2(back, up[1]) * D), r3(Math.atan2(side, up[1]) * D), r3((an.lumbar.rot || 0) + (an.thoracic.rot || 0)), r3(belly[1]),
        r3(pa.rollDeg), r3(pa.pitchDeg), r3(elev(S, "L")), r3(an.elbow_L.flex), r3(low("forearm_L")), f(acc.handN), f(acc.handB), r3(Math.min(low("abdomen"), low("thorax"))), f(acc.torsoN), f(acc.hipThighN), f(acc.kneeN), f(acc.shinN), f(acc.footN), r3(h / L.M), r3(auth)]); acc = null; } }
  const C = Object.fromEntries(COLS.map((c, i) => [c, i])), tStop = recs[kStop].t + tOff, rel = (t) => t == null ? null : r3(t - t0), after = rows.filter(r => r[1] >= 0);
  // meaningful hand load: 50 ms running mean of handN ≥ 0.10 BW
  let handLoad = null; for (let i = 0; i + 4 < after.length; i++) { const mN = after.slice(i, i + 4).reduce((s, r) => s + (r[C.handN] || 0), 0) / 4; if (mN >= 0.10) { handLoad = after[i][1]; break; } }
  let est = null; for (let i = 0; i < after.length; i++) { const r = after[i]; if (r[C.trunkDeg] >= 60 && r[C.pelvisRoll] >= 50 && r[C.chestUp] > -0.5) { const later = after.filter(q => q[1] > r[1] && q[1] <= r[1] + 0.5); if (later.every(q => q[C.trunkDeg] >= 50)) { est = r[1]; break; } } }
  const chest = after.find(r => r[C.chestUp] < -0.5), upright = after.filter(r => r[1] >= 0.3 && r[0] <= tStop && r[C.trunkDeg] < 35).length * 0.0125;
  const at = (x) => { const r = after.find(q => q[1] >= x - 1e-6); return r ? Object.fromEntries(COLS.map((c, i) => [c, r[i]])) : null; };
  const slideRows = after.filter(r => r[0] <= tStop), sum = (c) => slideRows.reduce((s, r) => s + (r[C[c]] || 0), 0) * 0.0125;
  const tot = ["handN", "torsoN", "hipThighN", "kneeN", "shinN", "footN"].reduce((s, c) => s + sum(c), 0);
  return { hash: o.finalHash, firstFoldContactT: r3(t0), stopT: r3(tStop), slidePathM: fm.slidePathM, cols: COLS, rows,
    events: { handFirstTouch: rel(handTouch), handMeaningfulLoad: handLoad, established: est, chestDown: chest ? chest[1] : null, uprightS: r3(upright), peakShoulderL: r3(Math.max(...after.filter(r => r[0] <= tStop + 1).map(r => r[C.shoulderL]))), stopRel: rel(tStop) },
    marks: Object.fromEntries(MARKS.map(x => [`+${x.toFixed(2)}`, at(x)])), loadShare: { hand: r3(sum("handN") / tot), torso: r3(sum("torsoN") / tot), hipThigh: r3(sum("hipThighN") / tot), knee: r3(sum("kneeN") / tot), shin: r3(sum("shinN") / tot), foot: r3(sum("footN") / tot) },
    handBrakeShareOfDecel: null, failures: (o.ctrl || {}).failures || null, wholeBody: (o.ctrl || {}).wholeBody ?? null, minAuthority: r3(Math.min(...after.filter(r => r[C.authMin] != null).map(r => r[C.authMin]))), climits: fm.climits, end: fm.finalState }; }
