// MOVING-HANDOFF INVESTIGATION item 6 (read-only): frame-to-frame presentation discontinuities by source, from the diagnostic exports
// (pres_diag_export.cjs) of the unchanged V1.3 page with PRESENTATION-ONLY OF_GAIT variants (gameplay hashes verified identical):
//   base (as shipped) | noGround (groundRate 0) | noDrop (maxDrop 0) | noPlant (no running plant locks) | procOnly (all three: the procedural gait only)
// Per variant: raw rig pelvis-height steps, the presentation's own pop detector (diag.jerk, root frame), the mapped V2 body's whole-body physics
// (implied external force / torque in the gait's own flight frames — pose._flight on three consecutive frames —, COM velocity vs authority), joint one-frame changes, and agreement with the SIMULATION's
// own runner body (simBody segments / planted flags). Base only: per-frame decomposition of the pelvis height into its code terms.
// usage (worktree root): V13_WT=<v1.3> V2_KNEE_MODEL=v2k V2_ANKLE_NEUTRAL_K=0.13 node .../pres_sources.mjs <presdiag dir> <air_v13 dir> <out.json> <case,...>
import fs from "fs";
const M = await import(new URL("../../rev1/scripts/pcg_rev1.mjs", import.meta.url).href); const { L, makeMapper, angVel, relRot } = M; const { V, Q, B, NB, bi, loadAir, m2p } = L;
const [PD, AIR, OUT, CASES] = process.argv.slice(2), VARS = ["base", "noGround", "noDrop", "noPlant", "procOnly"], G = 9.81, Mt = B.reduce((s, b) => s + b.mass, 0);
const comW = (S, i) => V.add(S[i].pos, Q.rot(S[i].rot, B[i].comLocal)), comOf = (S) => V.sc(S.reduce((s, x, i) => V.add(s, V.sc(comW(S, i), B[i].mass)), [0, 0, 0]), 1 / Mt);
const sim2r = (p) => [p[0], p[2], -p[1]], hl = (v) => Math.hypot(v[0], v[2]);
const q = (a, p) => { const s = a.filter(x => x != null && isFinite(x)).sort((x, y) => x - y); return s.length ? +s[Math.min(s.length - 1, Math.floor(p * (s.length - 1) + 0.5))].toFixed(4) : null; };
const st = (a) => ({ n: a.length, p50: q(a, 0.5), p90: q(a, 0.9), max: q(a, 1) });
const Iw = (S, i, w) => { const r = relRot(S, i), I = B[i].inertia, wl = Q.rot(Q.conj(r), w); return Q.rot(r, [0, 1, 2].map(a => I[a][0] * wl[0] + I[a][1] * wl[1] + I[a][2] * wl[2])); };
// whole-body L about the COM from centred differences (evaluation only)
const Lc = (Sm, S, Sp) => { const c = comOf(S); let Lt = [0, 0, 0]; for (let i = 0; i < NB; i++) { const v = V.sc(V.sub(comW(Sp, i), comW(Sm, i)), 30), w = V.sc(angVel(Sm[i].rot, Sp[i].rot), 0.5); Lt = V.add(Lt, V.add(V.cross(V.sub(comW(S, i), c), V.sc(v, B[i].mass)), Iw(S, i, w))); } return Lt; };
const SEGB = { thigh: "thigh", shin: "shank", foot: "foot" };
const out = { variants: VARS, cases: {} };
for (const cs of CASES.split(",")) {
  const R0 = loadAir(AIR, `${cs}_LOCO.json.gz`), ev = R0.events.filter(e => e.kind === "PLAYER_CONTACT"), first = ev[0] || null, kt = R0.pred.findIndex(x => x != null && x <= 0.25);
  let kend; if (first) kend = first.tick - 2; else { let mn = Infinity, kc = null; for (let k = Math.max(1, kt); k < R0.dnow.length; k++) if (R0.dnow[k] != null && R0.dnow[k] < mn) { mn = R0.dnow[k]; kc = k; } kend = kc - 1; }
  const k0 = Math.max(4, kt - 45), k1 = kend; out.cases[cs] = { range: [k0, k1], v: {} };
  for (const vn of VARS) { const R = loadAir(PD + "/" + vn, `${cs}_LOCO.json.gz`), mp = makeMapper(R, { knee: "RK", rf1: false }), idx = Object.fromEntries(R.bones.map((b, i) => [b.name, i]));
    const pelY = (k) => m2p(R.pres[k].world[idx.pelvis])[1], dg = (k) => R.pres[k].dg || {};
    const dPel = [], d2Pel = [], jerk = [], jerkBone = {}, FhFl = [], FyFl = [], TqFl = [], hga = [], own = [], segD = [], supAgree = [], presFootSpeed = [], legFloorN = { n: 0, dropMm: [] };
    const decomp = []; const Ls = {};
    for (let k = k0; k <= k1; k++) { const y0 = pelY(k - 1), y1 = pelY(k), yp = pelY(k + 1); dPel.push(Math.abs(y1 - y0) * 1000); d2Pel.push(Math.abs(yp - 2 * y1 + y0) * 1000);
      const d = dg(k); if (d.jerk != null) { jerk.push(d.jerk * 1000); if (d.jerk > 0.03) jerkBone[d.jerkBone] = (jerkBone[d.jerkBone] || 0) + 1; }
      if (d.legFloor && !d.ground) { legFloorN.n++; }
      if (vn === "base") { const dm = dg(k - 1); decomp.push({ k, dy: +((y1 - y0) * 1000).toFixed(1), dPose: +(((d.pelvisOff || 0) - (dm.pelvisOff || 0)) * 1000).toFixed(1), dDrop: +((-(d.drop || 0) + (dm.drop || 0)) * 1000).toFixed(1), dGround: +(((d.ground || 0) - (dm.ground || 0)) * 1000).toFixed(1), flight: d.flight, flightPrev: dm.flight, legFloor: d.legFloor || null, feet: d.feet ? Object.fromEntries(Object.entries(d.feet).map(([s, f]) => [s, f.mode])) : null }); }
      const S = mp.poseAt(k).S, Sm = mp.poseAt(k - 1).S, Sp = mp.poseAt(k + 1).S, c = comOf(S), cm = comOf(Sm), cp = comOf(Sp), a = V.sc(V.add(V.sub(cp, V.sc(c, 2)), cm), 3600);
      const flight3 = [k - 1, k, k + 1].every(j => (R.pres[j].dg || {}).flight === true);   // the procedural gait's own flight flag (pose._flight: neither leg in stance); the plant-lock contact flags are absent when locks are off
      const S2 = mp.poseAt(k - 2).S, c2 = comOf(S2), v2 = V.sub(V.sc(V.sub(c, cm), 90), V.sc(V.sub(cm, c2), 30)), row = R.rows[k], va = [row[10], 0, -row[11]]; hga.push(Math.hypot(v2[0] - va[0], v2[2] - va[2]));
      if (flight3) { FhFl.push(hl(a) / G); FyFl.push((a[1] + G) / G); }
      Ls[k] = Lc(Sm, S, Sp);
      let o = 0; for (const j of [0].concat(L.spec.joints.map(x => x.childIndex))) o = Math.max(o, V.dist(V.sub(Sp[j].pos, S[j].pos), V.sub(S[j].pos, Sm[j].pos))); own.push(o * 1000);
      // vs the simulation's own runner body (end of tick: simBody[k][3]); leg body COM to the sim capsule axis, horizontal
      const sb = R.simBody[k] && R.simBody[k][3]; if (sb) { let mx = 0; for (const g of sb.segs) { const bn = SEGB[g.seg]; if (!bn || !g.sd) continue; const i = bi(bn + "_" + g.sd); if (g.name.startsWith("toe")) continue;
          const a2 = sim2r(g.a), b2 = sim2r(g.b), p = comW(S, i), ab = V.sub(b2, a2), t = Math.max(0, Math.min(1, V.dot(V.sub(p, a2), ab) / V.dot(ab, ab))), cl = V.add(a2, V.sc(ab, t)); mx = Math.max(mx, hl(V.sub(p, cl))); } segD.push(mx * 1000);
        for (const [n, sd] of [[0, "L"], [1, "R"]]) supAgree.push(R.pres[k].feet[n].contact === sb.legs[sd].planted ? 1 : 0); }
      for (const [n, sd] of [[0, "L"], [1, "R"]]) if (R.pres[k].feet[n].contact) { const i = bi("foot_" + sd); presFootSpeed.push(hl(V.sc(V.sub(comW(Sp, i), comW(Sm, i)), 30))); } }
    for (let k = k0 + 1; k <= k1 - 1; k++) { const fl = [k - 1, k, k + 1].every(j => (R.pres[j].dg || {}).flight === true); if (fl && Ls[k + 1] && Ls[k - 1]) TqFl.push(V.len(V.sub(Ls[k + 1], Ls[k - 1])) * 30); }
    const big = decomp.filter(x => Math.abs(x.dy) >= 15).map(x => ({ ...x, main: Math.abs(x.dPose) >= Math.max(Math.abs(x.dDrop), Math.abs(x.dGround)) ? "pose" : Math.abs(x.dDrop) >= Math.abs(x.dGround) ? "drop" : "ground" }));
    out.cases[cs].v[vn] = { pelvisStepMm: st(dPel), pelvis2ndDiffMm: st(d2Pel), jerkMm: st(jerk), jerkBones30: jerkBone, legFloorNoLift: legFloorN.n, flightFhBW: st(FhFl), flightFyBW: st(FyFl), flightTorqueNm: st(TqFl), hgaMs: st(hga), jointOneFrameChangeMm: st(own),
      legVsSimBodyMm: st(segD), presVsSimSupportAgree: supAgree.length ? +(supAgree.reduce((a2, b2) => a2 + b2, 0) / supAgree.length).toFixed(3) : null, contactFootSpeedMs: st(presFootSpeed), ...(vn === "base" ? { pelvisDecomp: decomp, bigSteps: big } : {}) };
    const o2 = out.cases[cs].v[vn]; console.log(cs.padEnd(16), vn.padEnd(9), "pelStep p90/max", o2.pelvisStepMm.p90, o2.pelvisStepMm.max, "2nd p90/max", o2.pelvis2ndDiffMm.p90, o2.pelvis2ndDiffMm.max, "| jerk p50/p90/max", o2.jerkMm.p50, o2.jerkMm.p90, o2.jerkMm.max,
      "| flight Fh p50", o2.flightFhBW.p50, "Fy p50", o2.flightFyBW.p50, "T p50", o2.flightTorqueNm.p50, "| HGA p50", o2.hgaMs.p50, "| own p50/max", o2.jointOneFrameChangeMm.p50, o2.jointOneFrameChangeMm.max, "| legVsSim p50/p90", o2.legVsSimBodyMm.p50, o2.legVsSimBodyMm.p90, "| sup agree", o2.presVsSimSupportAgree, "| legFloor", o2.legFloorNoLift); } }
fs.writeFileSync(OUT, JSON.stringify(out));
