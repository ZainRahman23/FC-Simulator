// SP2C diagnostics of one run record (reads the record; nothing is simulated). At the milestones the brief names — first fold-side turf contact
// (first contact of thigh_L / shank_L / pelvis after the plant push-off), +50 ms, +100 ms, +250 ms, +500 ms, +1.0 s, end of slide — it reports:
//   • folded-knee position relative to the pelvis in PELVIS-LOCAL coordinates (x lateral, − = fold/left side; y along the pelvis up axis; z anterior)
//     and its distance from the fold hip joint; fold hip flexion / abduction / rotation; knee flexion; ankle df / inv;
//   • fold boot: sole-down cosine (> 0 = studs toward the turf), TCF-1 weight k, toe / heel heights; tackling boot lowest height;
//   • pelvis pitch / roll / yaw, trunk (thorax up-axis) pitch / roll, head height and face-down component, belly-down component;
//   • arm / hand contacts; regional authority (contact schedule × regional failure × global fallback, from the controller log);
//   • COM horizontal / vertical velocity; whole-body angular momentum about the COM (world, and about the travel axis = roll);
//   • turf contacts by region with normal force and friction-braking force over ±10 ms;
// and over the whole run: the braking ledger (fsweep fs_measure), joint-limit excursions, slide distance, the time the body first goes prone, and the
// ROLL LEDGER — the angular impulse about the travel axis that each contact region applies about the COM (only contacts can change the whole body's
// angular momentum; gravity acts at the COM), cumulated over [first fold-side contact, +2 s].
const S1 = new URL("../../slide_phys1/scripts/", import.meta.url).href, L = await import(S1 + "sp_lib.mjs"), { V, Q, B, bi } = L;
const RG = await import(new URL("../../slide_phys2/scripts/sp2_regions.mjs", import.meta.url).href), AA = await import(new URL("../../sp2a/scripts/sp2a_author.mjs", import.meta.url).href);
const FM = await import(new URL("../../sp2a/fsweep/scripts/fs_measure.mjs", import.meta.url).href), FC = await import(new URL("../../sp2a/fsweep/scripts/fs_contact.mjs", import.meta.url).href);
const H = 1 / 240, BW = L.M * L.G, r3 = (x) => x == null || !Number.isFinite(x) ? null : Math.round(x * 1000) / 1000;
const grp = (c) => { const g = c.group || c.body; return g.startsWith("knee") ? "knee_" + g.slice(-1) : g.startsWith("shin") ? "shin_" + g.slice(-1) : g.startsWith("thigh") ? "thigh_" + g.slice(-1) : g === "pelvis" ? "hip/pelvis" : c.body.startsWith("foot") ? c.region : g === "torso" || c.body === "head" ? (c.body === "head" ? "head" : "torso") : g === "arm" ? "upperArm" : g; };
const angMom = (S) => { const c = L.comOf(S); let Lw = [0, 0, 0]; S.forEach((b, i) => { Lw = V.add(Lw, V.add(V.sc(V.cross(V.sub(b.com, c), b.v), B[i].mass), L.IL.mat3vec(L.IL.MC.Iworld(b.rot, B[i].inertia), b.w))); }); return Lw; };
export function snapshot(o, k) { const recs = o.recs, r = recs[k], S = r.S.slice(0, B.length), Spre = recs[Math.max(0, k - 1)].S.slice(0, B.length), an = L.anatOf(S), K = L.skel(S), pel = S[0];
  const toPel = (p) => Q.rot(Q.conj(pel.rot), V.sub(p, K.pelvisM)), kneeP = toPel(K.knee_L), ankleP = toPel(K.ankle_L), pa = AA.pelvisAngles(pel.rot);
  const th = S[bi("thorax")], up = Q.rot(th.rot, [0, 1, 0]), belly = Q.rot(th.rot, [0, 0, 1]), hd = S[bi("head")], face = Q.rot(hd.rot, [0, 0, 1]), f = S[bi("foot_L")];
  const P = r.chars.tackler.P, v = V.sc(P, 1 / L.M), vh = Math.hypot(v[0], v[2]), dir = vh > 0.05 ? [v[0] / vh, 0, v[2] / vh] : [0, 0, 1], Lw = angMom(S);
  // contacts over ±10 ms (forces = impulse / time)
  const win = 2, acc = {}; for (let j = Math.max(1, k - win); j <= Math.min(recs.length - 1, k + win); j++) { const rr = recs[j], vv = rr.chars.tackler.P, hh = Math.hypot(vv[0], vv[2]), dd = hh > 1e-6 ? [vv[0] / hh, 0, vv[2] / hh] : dir;
    for (const c of RG.turfContacts(rr, recs[j - 1].S, "tackler", 0, null)) { if (!(c.Jn > 0)) continue; const g = grp(c), e = acc[g] = acc[g] || [0, 0]; e[0] += c.Jn; e[1] += -V.dot([c.J[0], 0, c.J[2]], dd); } }
  const nW = Math.min(recs.length - 1, k + win) - Math.max(1, k - win) + 1, contacts = Object.fromEntries(Object.entries(acc).map(([g, [n, b]]) => [g, { normalBW: r3(n / (nW * H) / BW), brakeBW: r3(b / (nW * H) / BW) }]));
  const lg = o.ctrlLog && o.ctrlLog[k] ? o.ctrlLog[k] : null, auth = lg ? Object.fromEntries(Object.keys(lg.regF || {}).map(rg => [rg, r3((lg.contactAuth ? lg.contactAuth[rg] ?? 1 : 1) * (lg.regF[rg] ?? 1) * (lg.gF ?? 1))])) : null;
  return { t: r3(r.t + (o.tOffset || 0)), knee_inPelvis: kneeP.map(r3), knee_fromFoldHip: r3(V.len(V.sub(K.knee_L, K.hip_L))), ankle_inPelvis: ankleP.map(r3), knee_L: r3(an.knee_L.flex), hip_L: { flex: r3(an.hip_L.flex), abd: r3(an.hip_L.abd), rot: r3(an.hip_L.rot) },
    ankle_L: { df: r3(an.ankle_L.df), inv: r3(an.ankle_L.inv) }, foldBoot: { soleDownCos: r3(-Q.rot(f.rot, [0, -1, 0])[1]), k: r3(FC.soleK(f.rot)), toeY: r3(K.toe_L[1]), heelY: r3(K.heel_L[1]), lowestY: r3(L.PL.bodyLowest(B[bi("foot_L")], f).y) },
    tackBootLowestY: r3(L.PL.bodyLowest(B[bi("foot_R")], S[bi("foot_R")]).y), pelvis: { pitch: r3(pa.pitchDeg), roll: r3(pa.rollDeg), yaw: r3(pa.yawDeg), y: r3(pel.pos[1]) },
    trunk: { upY: r3(up[1]), bellyDownY: r3(belly[1]) }, head: { y: r3(L.PL.bodyLowest(B[bi("head")], hd).y), faceY: r3(face[1]) }, vh: r3(vh), vy: r3(v[1]),
    angMom: Lw.map(r3), angMomRoll: r3(V.dot(Lw, dir)), contacts, armContacts: Object.fromEntries(Object.entries(contacts).filter(([g]) => /arm|forearm|hand/.test(g))), authority: auth }; }
export function diagnose(o, m = 0.375) { const recs = o.recs, n = recs.length, tOff = o.tOffset || 0;
  // first fold-side contact after the plant push-off
  let kTO = 0; { let seen = false; for (let k = 0; k < n; k++) { const on = recs[k].contacts.some(c => c.kind.startsWith("turf") && c.Jn > 0 && (c.a === "turf" ? c.b : c.a)[1] === "foot_L"); if (on) seen = true; else if (seen) { kTO = k; break; } } }
  const foldBodies = new Set(["thigh_L", "shank_L", "pelvis"]), k0 = recs.findIndex((r, k) => k > kTO && r.contacts.some(c => c.kind.startsWith("turf") && c.Jn > 0 && foldBodies.has((c.a === "turf" ? c.b : c.a)[1])));
  const fm = FM.measure(o, m), kStop = fm.stopped && fm.stopped.t != null ? Math.round((fm.stopped.t - tOff) * 240) - 1 : n - 1;
  const marks = { firstFoldContact: k0, "+50ms": k0 + 12, "+100ms": k0 + 24, "+250ms": k0 + 60, "+500ms": k0 + 120, "+1.0s": k0 + 240, endOfSlide: kStop };
  const milestones = Object.fromEntries(Object.entries(marks).filter(([, k]) => k >= 0 && k < n).map(([lab, k]) => [lab, snapshot(o, k)]));
  // roll ledger: angular impulse about the travel axis applied by each contact region about the COM, [k0, k0 + 2 s]
  const roll = {}; for (let k = Math.max(1, k0); k < Math.min(n, k0 + 480); k++) { const r = recs[k], S = r.S.slice(0, B.length), c = L.comOf(S), P = r.chars.tackler.P, h = Math.hypot(P[0], P[2]), d = h > 0.05 ? [P[0] / h, 0, P[2] / h] : [0, 0, 1];
    for (const x of RG.turfContacts(r, recs[k - 1].S, "tackler", 0, null)) { const g = grp(x); roll[g] = (roll[g] || 0) + V.dot(V.cross(V.sub(x.p, c), x.J), d); } }
  const proneK = recs.findIndex((r, k) => k > k0 && Q.rot(r.S[bi("thorax")].rot, [0, 0, 1])[1] < -0.5);
  // posture series for the plots (every 25 ms): pelvis roll / pitch, belly-down, head height, roll angular momentum, knee lateral in pelvis
  const series = []; for (let k = Math.max(0, k0 - 60); k < n; k += 6) { const s = snapshot(o, k); series.push([s.t, s.pelvis.roll, s.pelvis.pitch, s.trunk.bellyDownY, s.head.y, s.angMomRoll, s.knee_inPelvis[0], s.knee_inPelvis[2], s.vh, s.foldBoot.toeY]); }
  return { hash: o.finalHash, steps: n, pushOffT: r3(recs[kTO].t + tOff), firstFoldContactT: k0 >= 0 ? r3(recs[k0].t + tOff) : null, milestones, proneT: proneK >= 0 ? r3(recs[proneK].t + tOff) : null,
    rollLedger2s: Object.fromEntries(Object.entries(roll).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])).map(([g, x]) => [g, r3(x)])), sweepMeasures: { slidePathM: fm.slidePathM, stopped: fm.stopped, groundEntry: fm.groundEntry,
      ledgerSlide: fm.ledgerSlide, studs: fm.studs, regionPeak29msBW: fm.regionPeak29msBW, finalState: fm.finalState, climits: fm.climits }, series, seriesCols: ["t", "pelvisRoll", "pelvisPitch", "bellyDownY", "headY", "angMomRoll", "kneeLatInPelvis", "kneeAntInPelvis", "vh", "foldToeY"] }; }
