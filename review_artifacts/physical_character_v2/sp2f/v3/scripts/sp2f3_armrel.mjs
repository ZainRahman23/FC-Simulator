// SP2F3 posting-arm diagnostic IN HAND-RELATIVE COORDINATES (owner correction 2026-10-14 ≈ 22:58), from a run record (reads only). Every 2 steps (8.3 ms),
// 0.2 s before the first fold-side contact → the stop, in the pelvis HEADING frame (fwd = the pelvis forward axis projected on the ground, lat = toward the
// folded side, up):
//   (lat keeps the sign it has at the first fold contact: toward the folded side then); hpTF / hpTL / hsTL: hand−pelvis and hand−shoulder in the
//   TRAVEL frame fixed at the first fold contact (forward = travel, lat = toward the folded side) — the hand's slide with the player's translation
//   hand−pelvis (fwd / lat / up, m) · hand−shoulder (fwd / lat / up) · hand height above the turf (lowest point of the forearm / hand, m) · elbow flexion (°)
//   upper-arm and forearm orientation: elevation above the horizontal and heading azimuth (°, 0 = forward, +90 = toward the folded side, ±180 = backward)
//   shoulder angular velocity |ω_upperArm − ω_thorax| and elbow angular velocity |ω_forearm − ω_upperArm| (°/s) · hand speed along the turf (world) and
//   relative to the pelvis (m/s) · contact (1 = forearm / hand on the turf) · both hands' heights above the shoulders' midpoint (m: the "raised arm")
//   IMAGE-PLANE projection for comparison with the hand-annotated reference: an orthographic camera BEHIND-RIGHT of the slider (heading β = 35° from the
//   travel direction at first contact toward the folded side, elevation 25°), 2-D points of the pelvis, both shoulders, the posting elbow and hand;
//   2-D measures normalised by the 2-D trunk length (pelvis → shoulder midpoint): hand−pelvis, hand−shoulder, elbow angle, upper-arm / forearm angle
const S1 = new URL("../../../slide_phys1/scripts/", import.meta.url).href, L = await import(S1 + "sp_lib.mjs"), { V, Q, B, bi } = L;
const RG = await import(new URL("../../../slide_phys2/scripts/sp2_regions.mjs", import.meta.url).href);
const D = 180 / Math.PI, r3 = (x) => x == null || !Number.isFinite(x) ? null : Math.round(x * 1000) / 1000, r1 = (x) => x == null || !Number.isFinite(x) ? null : Math.round(x * 10) / 10;
export const AR_COLS = ["trel", "hpF", "hpL", "hpU", "hsF", "hsL", "hsU", "hpTF", "hpTL", "hsTL", "handY", "elbow", "uaEl", "uaAz", "faEl", "faAz", "wSh", "wEl", "vHand", "vHandRel", "on", "hLraise", "hRraise",
  "x2hp", "y2hp", "x2hs", "y2hs", "el2", "ua2", "fa2"];
const ang2 = (a, b) => { const d = Math.atan2(a[0] * b[1] - a[1] * b[0], a[0] * b[0] + a[1] * b[1]) * D; return d; };
export function armRel(o, side = "L") { const recs = o.recs, n = recs.length, tOff = o.tOffset || 0, other = side === "L" ? "R" : "L";
  let kTO = 0; { let seen = false; for (let k = 0; k < n; k++) { const on = recs[k].contacts.some(c => c.kind.startsWith("turf") && c.Jn > 0 && (c.a === "turf" ? c.b : c.a)[1] === "foot_L"); if (on) seen = true; else if (seen) { kTO = k; break; } } }
  const fold = new Set(["thigh_L", "shank_L", "pelvis"]), k0 = recs.findIndex((r, k) => k > kTO && r.contacts.some(c => c.kind.startsWith("turf") && c.Jn > 0 && fold.has((c.a === "turf" ? c.b : c.a)[1])));
  const t0 = recs[k0].t + tOff, S0 = recs[k0].S, Pv = S0[0].v, th = Math.hypot(Pv[0], Pv[2]) || 1, tr = [Pv[0] / th, 0, Pv[2] / th], lf0 = [tr[2], 0, -tr[0]];
  // camera: heading β toward the folded side ("lat" of the travel frame, sign fixed by the posting shoulder), elevation 25°; image x = right, y = up
  const shl = L.skel(S0.slice(0, B.length)), lsign = Math.sign(V.dot(V.sub(shl["shoulder_" + side], shl["shoulder_" + other]), lf0)) || 1, lat0 = V.sc(lf0, lsign);
  const be = 35 / D, el = 25 / D, dh = V.add(V.sc(tr, Math.cos(be)), V.sc(lat0, Math.sin(be))), dv = [dh[0] * Math.cos(el), -Math.sin(el), dh[2] * Math.cos(el)], up0 = [0, 1, 0];
  let rt = V.cross(dv, up0); rt = V.sc(rt, 1 / V.len(rt)); if (V.dot(rt, lat0) < 0) rt = V.sc(rt, -1); const uc = V.cross(rt, dv), U = V.sc(uc, V.dot(uc, up0) < 0 ? -1 / V.len(uc) : 1 / V.len(uc)), P2 = (p) => [V.dot(p, rt), V.dot(p, U)];
  const rows = [];
  for (let k = Math.max(1, k0 - 48); k < n; k += 2) { const r = recs[k], S = r.S.slice(0, B.length), K = L.skel(S), pel = S[0], fw = Q.rot(pel.rot, [0, 0, 1]), fn = Math.hypot(fw[0], fw[2]) || 1, f = [fw[0] / fn, 0, fw[2] / fn];
    let l = [f[2], 0, -f[0]]; if (V.dot(l, lat0) < 0) l = V.sc(l, -1);
    const fr = (v) => [V.dot(v, f), V.dot(v, l), v[1]], hp = K["hand_" + side], sh = K["shoulder_" + side], eb = K["elbow_" + side], hpRel = fr(V.sub(hp, pel.pos)), hsRel = fr(V.sub(hp, sh));
    const ua = fr(V.sub(eb, sh)), fa = fr(V.sub(hp, eb)), eo = (v) => [Math.atan2(v[2], Math.hypot(v[0], v[1])) * D, Math.atan2(v[1], v[0]) * D];
    const iu = bi("upperArm_" + side), ifa = bi("forearm_" + side), ith = bi("thorax"), wSh = V.len(V.sub(S[iu].w, S[ith].w)) * D, wEl = V.len(V.sub(S[ifa].w, S[iu].w)) * D;
    const vh = L.IL.velAt(S[ifa], S[ifa].com, hp), vHand = Math.hypot(vh[0], vh[2]), vRel = Math.hypot(vh[0] - pel.v[0], vh[2] - pel.v[2]);
    let on = 0; for (const c of RG.turfContacts(r, recs[k - 1].S, "tackler", 0, null)) if (c.Jn > 0 && c.body === "forearm_" + side) on = 1;
    const an = L.anatOf(S), shm = V.sc(V.add(K["shoulder_L"], K["shoulder_R"]), 0.5);
    // image plane
    const p2 = P2(pel.pos), s2m = P2(shm), s2 = P2(sh), e2 = P2(eb), h2 = P2(hp), T2 = Math.hypot(s2m[0] - p2[0], s2m[1] - p2[1]) || 1, hp2 = [(h2[0] - p2[0]) / T2, (h2[1] - p2[1]) / T2], hs2 = [(h2[0] - s2[0]) / T2, (h2[1] - s2[1]) / T2];
    const ua2 = [e2[0] - s2[0], e2[1] - s2[1]], fa2 = [h2[0] - e2[0], h2[1] - e2[1]];
    const dT = V.sub(hp, pel.pos), dS = V.sub(hp, sh);
    rows.push([r3(r.t + tOff - t0), ...hpRel.map(r3), ...hsRel.map(r3), r3(V.dot(dT, tr)), r3(V.dot(dT, lat0)), r3(V.dot(dS, lat0)), r3(L.PL.bodyLowest(B[ifa], S[ifa]).y), r1(an["elbow_" + side].flex), ...eo(ua).map(r1), ...eo(fa).map(r1), r1(wSh), r1(wEl), r3(vHand), r3(vRel), on,
      r3(K["hand_" + side][1] - shm[1]), r3(K["hand_" + other][1] - shm[1]), r3(hp2[0]), r3(hp2[1]), r3(hs2[0]), r3(hs2[1]), r1(Math.abs(ang2(ua2, fa2))), r1(Math.atan2(ua2[1], ua2[0]) * D), r1(Math.atan2(fa2[1], fa2[0]) * D)]); }
  // summary over the contact window [first hand contact, first + 1.5 s]
  const I = Object.fromEntries(AR_COLS.map((c, i) => [c, i])), fc = rows.find(x => x[I.trel] >= 0 && x[I.on]), win = fc ? rows.filter(x => x[I.trel] >= fc[I.trel] && x[I.trel] <= fc[I.trel] + 1.5) : [];
  const rg = (c) => win.length ? [r3(Math.min(...win.map(x => x[I[c]]))), r3(Math.max(...win.map(x => x[I[c]])))] : null, at = (dt, c) => { const x = win.find(y => y[I.trel] >= (fc ? fc[I.trel] : 0) + dt); return x ? x[I[c]] : null; };
  const pre = rows.filter(x => x[I.trel] >= 0 && x[I.trel] <= 1.6);
  return { cols: AR_COLS, rows, firstFoldT: r3(t0), camera: { betaDeg: 35, elevDeg: 25 },
    summary: fc ? { firstContact: fc[I.trel], handPelvisFwd: rg("hpF"), handPelvisLat: rg("hpL"), handPelvisFwdDrift: r3(at(1.5, "hpF") ?? win.at(-1)[I.hpF]) != null ? r3((at(1.5, "hpF") ?? win.at(-1)[I.hpF]) - fc[I.hpF]) : null,
      handPelvisTravelDisp: r3(Math.max(...win.map(x => Math.hypot(x[I.hpTF] - fc[I.hpTF], x[I.hpTL] - fc[I.hpTL])))), handPelvisTravelFwd: rg("hpTF"), handPelvisTravelLat: rg("hpTL"), handOutboardOfShoulder: rg("hsTL"),
      handShoulderUp: rg("hsU"), maxHandHeightAfterContact: r3(Math.max(...win.map(x => x[I.handY]))), elbow: rg("elbow"), upperArmElev: rg("uaEl"), forearmElev: rg("faEl"), upperArmAz: rg("uaAz"),
      peakShoulderW: r1(Math.max(...win.map(x => x[I.wSh]))), peakElbowW: r1(Math.max(...win.map(x => x[I.wEl]))), handSpeedRel: rg("vHandRel"),
      postingHandAboveShoulders: r3(Math.max(...pre.map(x => x[I.hLraise]))), otherHandAboveShoulders: r3(Math.max(...pre.map(x => x[I.hRraise]))),
      img: { handPelvis: [rg("x2hp"), rg("y2hp")], handShoulder: [rg("x2hs"), rg("y2hs")], elbow2: rg("el2") } } : null }; }
