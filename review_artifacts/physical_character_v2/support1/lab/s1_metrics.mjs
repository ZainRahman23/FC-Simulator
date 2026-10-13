// SUPPORT-1 run metrics (from a lab run's compact records vs its TWIN). Nothing here classifies by disturbance size: every quantity is measured
// from the physical response. Outcome classes are reported only as labels of measured facts (fall = pelvis ≥ 0.15 m below the twin within the run).
const LAB = await import(new URL("./s1_lab.mjs", import.meta.url).href), { BI, BW, H_STEP: H, SPEC } = LAB;
const PL = await import(new URL("../../pvp1/scripts/pvp1a_lib.mjs", import.meta.url).href), { V, Q } = PL, D = 180 / Math.PI;
const fL = BI("foot_L"), fR = BI("foot_R"), pel = BI("pelvis"), tho = BI("thorax"), sL = BI("shank_L"), sR = BI("shank_R");
const qang = (a, b) => { const d = Q.mul(Q.conj(a), b), v = Math.hypot(d[0], d[1], d[2]); return 2 * Math.atan2(v, Math.abs(d[3])) * D; };
// contact onset: the first step with an external impulse on the recipient (impactor / pulse / replay)
// (the impactor's first contact when there is an impactor — a constant preload is an external force from step 0 and is not the disturbance onset)
export function onsetOf(o) { const ri = o.recs.find(x => x.ext && x.ext.imp && V.len(x.ext.imp.J) > 1e-6); if (ri) return ri.n; if (o.impactor) return null; const r = o.recs.find(x => x.ext && V.len(x.ext.J) > 1e-6); return r ? r.n : null; }
export function metrics(o, tw, dir) { const R = o.recs, T = tw.recs, n = Math.min(R.length, T.length), on = onsetOf(o); if (on == null) return { onset: null };
  const i0 = R.findIndex(r => r.n === on), d = dir ? V.norm([dir[0], 0, dir[2]]) : null, y0 = T[i0].S[pel].pos[1];
  let fall = null, Jtot = [0, 0, 0], Fpk = 0, lastContact = on, comPk = 0, pelRotPk = 0, thoRotPk = 0, pelTransPk = 0, wPelPk = 0, wThoPk = 0, bodies = new Set();
  const foot = { L: { slip: 0, disp: 0, unload: null, lift: null, liftSteps: 0, roll: 0, yaw: 0 }, R: { slip: 0, disp: 0, unload: null, lift: null, liftSteps: 0, roll: 0, yaw: 0 } };
  const p0 = { L: T[i0].S[fL].com, R: T[i0].S[fR].com }, r0 = { L: T[i0].S[fL].rot, R: T[i0].S[fR].rot };
  let atDrop = null; const knee = { L: 0, R: 0 }, ank = { L: 0, R: 0 }, hip = { L: 0, R: 0 };
  for (let i = i0; i < n; i++) { const r = R[i], t = T[i], tt = (r.n - on) * H;
    if (r.ext) { const Jx = o.impactor ? (r.ext.imp ? r.ext.imp.J : [0, 0, 0]) : r.ext.J; Jtot = V.add(Jtot, Jx); const f = V.len(Jx) / H; if (f > Fpk) Fpk = f; if (V.len(Jx) > 1e-6) lastContact = r.n; if (r.ext.imp) r.ext.imp.bodies.forEach(b => bodies.add(b)); }
    const drop = t.S[pel].pos[1] - r.S[pel].pos[1]; if (fall == null && drop > 0.15) fall = +tt.toFixed(3);
    const dc = V.len(V.sub(r.com, t.com)); comPk = Math.max(comPk, dc);
    if (tt <= 0.6) { pelRotPk = Math.max(pelRotPk, qang(t.S[pel].rot, r.S[pel].rot)); thoRotPk = Math.max(thoRotPk, qang(t.S[tho].rot, r.S[tho].rot)); pelTransPk = Math.max(pelTransPk, Math.hypot(r.S[pel].pos[0] - t.S[pel].pos[0], r.S[pel].pos[2] - t.S[pel].pos[2]));
      wPelPk = Math.max(wPelPk, V.len(r.S[pel].w)); wThoPk = Math.max(wThoPk, V.len(r.S[tho].w)); }
    for (const [s, fi] of [["L", fL], ["R", fR]]) { const F = foot[s], fr = r.feet[s], disp = Math.hypot(r.S[fi].com[0] - p0[s][0], r.S[fi].com[2] - p0[s][2]);
      if (fr.N > 20 && fr.vs != null) F.slip += fr.vs * H; F.disp = Math.max(F.disp, disp); if (F.unload == null && fr.N < 0.05 * BW) F.unload = +tt.toFixed(3); if (fr.N === 0) { F.liftSteps++; if (F.lift == null) F.lift = +tt.toFixed(3); }
      const fx = Q.rot(r.S[fi].rot, [1, 0, 0]), fz = Q.rot(r.S[fi].rot, [0, 0, 1]), fz0 = Q.rot(r0[s], [0, 0, 1]); F.roll = Math.max(F.roll, Math.abs(Math.asin(Math.max(-1, Math.min(1, fx[1]))) * D));
      const yaw = Math.atan2(Math.sin(Math.atan2(fz[0], fz[2]) - Math.atan2(fz0[0], fz0[2])), Math.cos(Math.atan2(fz[0], fz[2]) - Math.atan2(fz0[0], fz0[2]))) * D; if (fr.N > 0) F.yaw = Math.max(F.yaw, Math.abs(yaw)); }
    if (tt <= 0.5) for (const [s, k] of [["L", 0], ["R", 1]]) { ank[s] = Math.max(ank[s], ...[0, 1, 2].map(a => Math.abs(r.th[k][a] - t.th[k][a]) * D)); knee[s] = Math.max(knee[s], Math.abs(r.th[2 + k][1] - t.th[2 + k][1]) * D); hip[s] = Math.max(hip[s], ...[0, 1, 2].map(a => Math.abs(r.th[4 + k][a] - t.th[4 + k][a]) * D)); }
    // the moment the pelvis has dropped 0.10 m: how far have the feet moved along the disturbance, relative to the COM ("sliced" vs "hinged")
    if (atDrop == null && drop > 0.10 && d) { const along = (p, q) => (p[0] - q[0]) * d[0] + (p[2] - q[2]) * d[2]; atDrop = { t: +tt.toFixed(3), footL: +along(r.S[fL].com, p0.L).toFixed(3), footR: +along(r.S[fR].com, p0.R).toFixed(3), com: +along(r.com, t.com).toFixed(3) }; } }
  const e = R[n - 1], te = T[n - 1], endDisp = V.sub(e.com, te.com), endDrop = te.S[pel].pos[1] - e.S[pel].pos[1];
  const fallDir = d && Math.hypot(endDisp[0], endDisp[2]) > 0.05 ? +((endDisp[0] * d[0] + endDisp[2] * d[2]) / Math.hypot(endDisp[0], endDisp[2])).toFixed(2) : null;
  const slipAny = Math.max(foot.L.slip, foot.R.slip), cls = fall != null ? "FALL" : (Math.max(foot.L.disp, foot.R.disp) > 0.02 || slipAny > 0.02 || comPk > 0.05 ? "DISPLACED-RECOVERED" : "ABSORBED");
  const r3 = (x) => +x.toFixed(3);
  return { onset: on, contactS: r3((lastContact - on) * H), impulseNs: r3(V.len(Jtot)), impulse: Jtot.map(r3), peakForceN: Math.round(Fpk), bodies: [...bodies], fallS: fall, cls, endDropM: r3(endDrop), fallDirAlongSweep: fallDir,
    comPeakM: r3(comPk), pelvisTrans06M: r3(pelTransPk), pelvisRot06Deg: +pelRotPk.toFixed(1), thoraxRot06Deg: +thoRotPk.toFixed(1), wPelvisPk: +wPelPk.toFixed(2), wThoraxPk: +wThoPk.toFixed(2),
    feet: { L: { slipM: r3(foot.L.slip), dispM: r3(foot.L.disp), unloadS: foot.L.unload, liftS: foot.L.lift, liftedS: r3(foot.L.liftSteps * H), rollDeg: +foot.L.roll.toFixed(1), yawLoadedDeg: +foot.L.yaw.toFixed(1) },
      R: { slipM: r3(foot.R.slip), dispM: r3(foot.R.disp), unloadS: foot.R.unload, liftS: foot.R.lift, liftedS: r3(foot.R.liftSteps * H), rollDeg: +foot.R.roll.toFixed(1), yawLoadedDeg: +foot.R.yaw.toFixed(1) } },
    yield05Deg: { ankle: { L: +ank.L.toFixed(1), R: +ank.R.toFixed(1) }, knee: { L: +knee.L.toFixed(1), R: +knee.R.toFixed(1) }, hip: { L: +hip.L.toFixed(1), R: +hip.R.toFixed(1) } }, atDrop10cm: atDrop,
    hardExcDeg: Math.max(...R.map(r => r.integ.hard)), selfPenMm: Math.max(...R.map(r => r.integ.self)), turfPenMm: Math.max(...R.map(r => r.integ.turf)), sepMaxMm: Math.max(...R.map(r => r.integ.sep)), slips: o.slips, stop: o.stop };
}
