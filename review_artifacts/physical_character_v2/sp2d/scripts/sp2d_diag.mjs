// SP2D critical-test diagnostics of one run record (reads the record; nothing is simulated) — applied identically to A (SP2A), SP2C and SP2D.
// From the first fold-side turf contact (thigh / shank / pelvis after the plant push-off) to the end of the run, every 25 ms:
//   trunkDeg     angle of the thorax up-axis from vertical (0 = upright, 90 = lying), split into its BACK component (in the travel frame: + = leaning
//                back against the travel) and SIDE component (+ = toward the fold / left side)
//   shoulderL/R  arm elevation: angle between the upper arm and the thorax down-axis (0 = arm at the side, 180 = overhead) — the posting arm is L
//   handL/R      turf normal force on the forearm + hand (BW) and its friction braking (BW); upperArm likewise
//   torso        turf normal force on abdomen + thorax (BW); head normal force (BW)
//   pelvisRoll   pelvis roll (°, + = onto the fold side); pelvisPitch
//   bellyDown    thorax anterior axis · up (−1 = chest-down, 0 = on the side, +1 = face-up); sideDown = thorax left axis · down (+1 = lying on the left/fold side)
//   authority    the controller's regional authority product (contact schedule × regional failure × global fallback) — the "passive" indicator
// Summary: first post-arm contact time and its share of the turf normal impulse / braking over the slide, peak posting-shoulder elevation, first torso
// contact, first chest-down (bellyDown < −0.5), time spent "artificially seated / upright" (trunk < 35° from vertical) from +0.6 s to the end of the slide,
// regional failures / whole-body fallback, minimum authority, end posture.
const S1 = new URL("../../slide_phys1/scripts/", import.meta.url).href, L = await import(S1 + "sp_lib.mjs"), { V, Q, B, bi } = L;
const RG = await import(new URL("../../slide_phys2/scripts/sp2_regions.mjs", import.meta.url).href), AA = await import(new URL("../../sp2a/scripts/sp2a_author.mjs", import.meta.url).href);
const FM = await import(new URL("../../sp2a/fsweep/scripts/fs_measure.mjs", import.meta.url).href);
const H = 1 / 240, BW = L.M * L.G, D = 180 / Math.PI, r3 = (x) => x == null || !Number.isFinite(x) ? null : Math.round(x * 1000) / 1000;
const elev = (S, side) => { const th = S[bi("thorax")], down = Q.rot(th.rot, [0, -1, 0]), ua = S[bi("upperArm_" + side)], K = L.skel(S), u = V.sub(K["elbow_" + side], K["shoulder_" + side]); return Math.acos(Math.max(-1, Math.min(1, V.dot(down, u) / V.len(u)))) * D; };
export function diagnoseD(o, m = 0.375) { const recs = o.recs, n = recs.length, tOff = o.tOffset || 0;
  let kTO = 0; { let seen = false; for (let k = 0; k < n; k++) { const on = recs[k].contacts.some(c => c.kind.startsWith("turf") && c.Jn > 0 && (c.a === "turf" ? c.b : c.a)[1] === "foot_L"); if (on) seen = true; else if (seen) { kTO = k; break; } } }
  const fold = new Set(["thigh_L", "shank_L", "pelvis"]), k0 = recs.findIndex((r, k) => k > kTO && r.contacts.some(c => c.kind.startsWith("turf") && c.Jn > 0 && fold.has((c.a === "turf" ? c.b : c.a)[1])));
  const fm = FM.measure(o, m), kStop = fm.stopped && fm.stopped.t != null ? Math.round((fm.stopped.t - tOff) * 240) - 1 : n - 1;
  // per-step contacts (all steps from k0) → per-25 ms series
  const acc = { handL: [0, 0], handR: [0, 0], uarmL: [0, 0], uarmR: [0, 0], torso: [0, 0], head: [0, 0], all: [0, 0] }, first = {}, rows = []; let win = null;
  const bucket = () => ({ handL: [0, 0], handR: [0, 0], uarmL: [0, 0], uarmR: [0, 0], torso: [0, 0], head: [0, 0], all: [0, 0], n: 0 });
  for (let k = Math.max(1, k0); k < n; k++) { const r = recs[k], P = r.chars.tackler.P, h = Math.hypot(P[0], P[2]), dir = h > 0.05 ? [P[0] / h, 0, P[2] / h] : [0, 0, 1]; if (!win) win = bucket(); win.n++;
    for (const c of RG.turfContacts(r, recs[k - 1].S, "tackler", 0, null)) { if (!(c.Jn > 0)) continue; const b = -V.dot([c.J[0], 0, c.J[2]], dir);
      const key = c.body === "forearm_L" ? "handL" : c.body === "forearm_R" ? "handR" : c.body === "upperArm_L" ? "uarmL" : c.body === "upperArm_R" ? "uarmR" : c.body === "abdomen" || c.body === "thorax" ? "torso" : c.body === "head" ? "head" : null;
      for (const kk of key ? [key, "all"] : ["all"]) { win[kk][0] += c.Jn; win[kk][1] += b; if (k <= kStop) { acc[kk][0] += c.Jn; acc[kk][1] += b; } } if (key && first[key] == null && c.Jn / H > 0.05 * BW) first[key] = r3(r.t + tOff); }
    if ((k - k0) % 6 === 5 || k === n - 1) { const S = r.S.slice(0, B.length), th = S[bi("thorax")], up = Q.rot(th.rot, [0, 1, 0]), belly = Q.rot(th.rot, [0, 0, 1]), left = Q.rot(th.rot, [-1, 0, 0]);
      const tilt = Math.acos(Math.max(-1, Math.min(1, up[1]))) * D, back = -V.dot(up, dir), lat = [dir[2], 0, -dir[0]], side = V.dot(up, lat) * -1, pa = AA.pelvisAngles(S[0].rot), lg = o.ctrlLog && o.ctrlLog[k];
      const auth = lg ? Math.min(...Object.keys(lg.regF || {}).map(rg => (lg.contactAuth ? lg.contactAuth[rg] ?? 1 : 1) * (lg.regF[rg] ?? 1) * (lg.gF ?? 1))) : null, f = (x) => r3(x / (win.n * H) / BW);
      rows.push([r3(r.t + tOff), r3(tilt), r3(Math.atan2(back, up[1]) * D), r3(Math.atan2(side, up[1]) * D), r3(elev(S, "L")), r3(elev(S, "R")), f(win.handL[0]), f(win.handL[1]), f(win.uarmL[0]), f(win.handR[0]), f(win.torso[0]), f(win.head[0]),
        r3(pa.rollDeg), r3(pa.pitchDeg), r3(belly[1]), r3(-left[1]), r3(auth), r3(Math.hypot(P[0], P[2]) / L.M)]); win = null; } }
  const cols = ["t", "trunkDeg", "trunkBackDeg", "trunkSideDeg", "shoulderL", "shoulderR", "handL_N", "handL_brake", "uarmL_N", "handR_N", "torso_N", "head_N", "pelvisRoll", "pelvisPitch", "bellyDown", "sideDownL", "authMin", "vh"];
  const t0 = recs[k0].t + tOff, tStop = recs[kStop].t + tOff, inSlide = rows.filter(r => r[0] >= t0 + 0.6 && r[0] <= tStop), dt = 0.025;
  const sh = (kk) => ({ normalShare: r3(acc[kk][0] / Math.max(1e-9, acc.all[0])), brakeShare: r3(acc[kk][1] / Math.max(1e-9, acc.all[1])), normalNs: r3(acc[kk][0]), brakeNs: r3(acc[kk][1]) });
  const prone = rows.find(r => r[0] > t0 && r[14] < -0.5), last = rows[rows.length - 1], ct = o.ctrl || {};
  return { hash: o.finalHash, firstFoldContactT: r3(t0), stopT: r3(tStop), slidePathM: fm.slidePathM, series: rows, seriesCols: cols,
    summary: { firstContact: first, handL: sh("handL"), uarmL: sh("uarmL"), handR: sh("handR"), torso: sh("torso"), head: sh("head"), peakShoulderL: r3(Math.max(...rows.filter(r => r[0] <= tStop + 1).map(r => r[4]))),
      shoulderLAtPost: first.handL != null ? (rows.find(r => r[0] >= first.handL) || [])[4] ?? null : null, chestDownT: prone ? prone[0] : null, minBellyDown: r3(Math.min(...rows.map(r => r[14]))),
      uprightS: r3(inSlide.filter(r => r[1] < 35).length * dt), lyingFromT: (rows.find(r => r[0] > t0 && r[1] > 70) || [null])[0], trunkAt: Object.fromEntries([0.25, 0.5, 1.0, 1.5, 2.0].map(x => [`+${x}s`, (rows.find(r => r[0] >= t0 + x) || [])[1] ?? null])),
      trunkAtStop: (rows.find(r => r[0] >= tStop) || [])[1] ?? null, failures: ct.failures || null, wholeBody: ct.wholeBody ?? null, minAuthority: r3(Math.min(...rows.filter(r => r[16] != null).map(r => r[16]))),
      end: { t: last[0], trunkDeg: last[1], bellyDown: last[14], sideDownL: last[15], pelvisRoll: last[12], shoulderL: last[4], class: fm.finalState.class }, headTurfT: fm.finalState.headTurfT, climits: fm.climits } }; }
