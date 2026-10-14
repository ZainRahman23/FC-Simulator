// SP2F trajectory-quality diagnostics of one run record (reads the record; nothing is simulated). Every 2 steps (8.3 ms) from 0.2 s before the first
// fold-side turf contact to the end of the main slide (+0.5 s after the stop):
//   trunkDeg       thorax up-axis angle from vertical; trunkRate / trunkAcc its first / second time derivative (°/s, °/s²; centred differences on a
//                  25 ms window); thoraxW  thorax angular-velocity magnitude (°/s); tipW  its horizontal component (tipping rate, °/s)
//   pelvisRoll     pelvis roll (°, + onto the folded side); pelvisW  pelvis angular-velocity magnitude; rollRate  roll rate about the travel axis (°/s)
//   shoulderL / elbowL   posting-arm elevation vs the thorax / elbow flexion (°); handY  lowest point of the posting forearm + hand (m)
//   handOn / handN / handBrake   posting forearm / hand turf contact state (0/1), normal and friction-braking force (BW); handVt  tangential speed of
//                  the contact point (m/s); trunkTgt*  the authored trunk targets at the controller's clock (lumbar / thoracic flex, lat, thoracic rot) and
//                  their rates (°/s) — exposes target discontinuities; auth  regional authority (trunk / trailLeg / armL); seatOn  pelvis-objective gate
// Summary: the largest trunk / pelvis angular-velocity spikes (time, value, what changed within ±60 ms: contact onsets by region, authority steps, target
// rate peaks), the posting-hand contact record (first contact, continuity, gaps, sliding distance along the turf, peak normal, tangential braking impulse,
// shoulder elevation over the contact), and smoothness measures over the main descent (peak / RMS trunk acceleration, number of trunk-rate sign changes).
const S1 = new URL("../../slide_phys1/scripts/", import.meta.url).href, L = await import(S1 + "sp_lib.mjs"), { V, Q, B, bi } = L;
const RG = await import(new URL("../../slide_phys2/scripts/sp2_regions.mjs", import.meta.url).href), AA = await import(new URL("../../sp2a/scripts/sp2a_author.mjs", import.meta.url).href);
const FM = await import(new URL("../../sp2a/fsweep/scripts/fs_measure.mjs", import.meta.url).href), CH = await import(S1 + "sp_chor.mjs");
const H = 1 / 240, BW = L.M * L.G, D = 180 / Math.PI, r3 = (x) => x == null || !Number.isFinite(x) ? null : Math.round(x * 1000) / 1000;
const grp = (body) => body.startsWith("forearm") ? "hand" + body.slice(-2) : body.startsWith("upperArm") ? "upperArm" + body.slice(-2) : body === "abdomen" || body === "thorax" ? "torso" : body;
const elev = (S, side) => { const th = S[bi("thorax")], down = Q.rot(th.rot, [0, -1, 0]), K = L.skel(S), u = V.sub(K["elbow_" + side], K["shoulder_" + side]); return Math.acos(Math.max(-1, Math.min(1, V.dot(down, u) / V.len(u)))) * D; };
export const COLS = ["t", "trel", "trunkDeg", "trunkRate", "trunkAcc", "thoraxW", "tipW", "pelvisRoll", "pelvisW", "rollRate", "shoulderL", "elbowL", "handY", "handOn", "handN", "handBrake", "handVt",
  "tgtLumFlex", "tgtThoFlex", "tgtLumLat", "tgtThoLat", "tgtThoRot", "tgtRateMax", "authTrunk", "authTrail", "authArmL", "vh"];
// cand: the compiled choreography of the run's candidate (optional — target columns are null without it)
export function diagnoseF(o, chor = null, m = 0.375) { const recs = o.recs, n = recs.length, tOff = o.tOffset || 0, ch = chor ? CH.compile(chor) : null, lead = o.candLead ?? 0.07;
  let kTO = 0; { let seen = false; for (let k = 0; k < n; k++) { const on = recs[k].contacts.some(c => c.kind.startsWith("turf") && c.Jn > 0 && (c.a === "turf" ? c.b : c.a)[1] === "foot_L"); if (on) seen = true; else if (seen) { kTO = k; break; } } }
  const fold = new Set(["thigh_L", "shank_L", "pelvis"]), k0 = recs.findIndex((r, k) => k > kTO && r.contacts.some(c => c.kind.startsWith("turf") && c.Jn > 0 && fold.has((c.a === "turf" ? c.b : c.a)[1])));
  const fm = FM.measure(o, m), kStop = fm.stopped && fm.stopped.t != null ? Math.round((fm.stopped.t - tOff) * 240) - 1 : n - 1, t0 = recs[k0].t + tOff, kEnd = Math.min(n - 1, kStop + 120);
  // per-step raw signals
  const raw = [], firstOn = {}; let handPrev = null;
  for (let k = Math.max(1, k0 - 48); k <= kEnd; k++) { const r = recs[k], S = r.S.slice(0, B.length), P = r.chars.tackler.P, h = Math.hypot(P[0], P[2]), dir = h > 0.05 ? [P[0] / h, 0, P[2] / h] : [0, 0, 1];
    const th = S[bi("thorax")], up = Q.rot(th.rot, [0, 1, 0]), w = th.w, pel = S[0], pa = AA.pelvisAngles(pel.rot), an = L.anatOf(S), lg = o.ctrlLog && o.ctrlLog[k];
    let hN = 0, hB = 0, hV = 0, hNn = 0; for (const c of RG.turfContacts(r, recs[k - 1].S, "tackler", 0, null)) { if (!(c.Jn > 0)) continue; const g = grp(c.body); if (k >= k0 && firstOn[g] == null && c.Jn / H > 0.02 * BW) firstOn[g] = r3(r.t + tOff - t0);
      if (c.body === "forearm_L") { hN += c.Jn; hB += -V.dot([c.J[0], 0, c.J[2]], dir); hV += c.slip * c.Jn; hNn++; } }
    const auth = (rg) => lg ? (lg.contactAuth ? lg.contactAuth[rg] ?? 1 : 1) * (lg.regF && lg.regF[rg] != null ? lg.regF[rg] : 1) * (lg.gF ?? 1) : null;
    const tt = r.t + tOff + lead, tg = ch ? ch.anatAt(tt) : null, tg2 = ch ? ch.anatAt(tt + 0.01) : null, tv = (j, key) => tg && tg[j] ? tg[j][key] ?? null : null;
    const rate = tg ? Math.max(...[["lumbar", "flex"], ["thoracic", "flex"], ["lumbar", "lat"], ["thoracic", "lat"], ["thoracic", "rot"], ["shoulder_L", "abd"], ["shoulder_L", "flex"], ["elbow_L", "flex"]].map(([j, key]) => Math.abs(((tg2[j] || {})[key] ?? 0) - ((tg[j] || {})[key] ?? 0)) / 0.01)) : null;
    raw.push({ k, t: r.t + tOff, tilt: Math.acos(Math.max(-1, Math.min(1, up[1]))) * D, thW: V.len(w) * D, tipW: Math.hypot(w[0], w[2]) * D, roll: pa.rollDeg, pelW: V.len(pel.w) * D, rollRate: V.dot(pel.w, dir) * D,
      shL: elev(S, "L"), elL: an.elbow_L.flex, handY: L.PL.bodyLowest(B[bi("forearm_L")], S[bi("forearm_L")]).y, handOn: hN > 0 ? 1 : 0, handN: hN / H / BW, handB: hB / H / BW, handVt: hN > 0 ? hV / hN : null,
      tg: tg ? [tv("lumbar", "flex"), tv("thoracic", "flex"), tv("lumbar", "lat"), tv("thoracic", "lat"), tv("thoracic", "rot")] : [null, null, null, null, null], tgRate: rate, auth: [auth("trunk"), auth("trailLeg"), auth("armL")], vh: h / L.M }); }
  // derivatives of the trunk angle on a 25 ms centred window
  const W = 3; for (let i = 0; i < raw.length; i++) { const a = raw[Math.max(0, i - W)], b = raw[Math.min(raw.length - 1, i + W)]; raw[i].rate = (b.tilt - a.tilt) / Math.max(1e-6, b.t - a.t); }
  for (let i = 0; i < raw.length; i++) { const a = raw[Math.max(0, i - W)], b = raw[Math.min(raw.length - 1, i + W)]; raw[i].acc = (b.rate - a.rate) / Math.max(1e-6, b.t - a.t); }
  const rows = raw.filter((_, i) => i % 2 === 0).map(x => [r3(x.t), r3(x.t - t0), r3(x.tilt), r3(x.rate), r3(x.acc), r3(x.thW), r3(x.tipW), r3(x.roll), r3(x.pelW), r3(x.rollRate), r3(x.shL), r3(x.elL), r3(x.handY), x.handOn, r3(x.handN), r3(x.handB), r3(x.handVt), ...x.tg.map(r3), r3(x.tgRate), ...x.auth.map(r3), r3(x.vh)]);
  // spikes and their context
  const main = raw.filter(x => x.t - t0 >= -0.1 && x.t - t0 <= Math.min(2.0, kStop / 240 - t0 + tOff + 0.3)), ctx = (x) => { const tr = x.t - t0, near = Object.entries(firstOn).filter(([, ft]) => Math.abs(ft - tr) <= 0.06).map(([g, ft]) => `${g} first turf contact at +${ft.toFixed(3)} s`);
    const win = main.filter(y => Math.abs(y.t - x.t) <= 0.06), authStep = win.length ? ["trunk", "trailLeg", "armL"].map((rg, i) => { const vs = win.map(y => y.auth[i]).filter(v => v != null); return vs.length && Math.max(...vs) - Math.min(...vs) > 0.05 ? `${rg} authority ${Math.min(...vs).toFixed(2)}–${Math.max(...vs).toFixed(2)}` : null; }).filter(Boolean) : [];
    const tgPk = win.length ? Math.max(...win.map(y => y.tgRate || 0)) : 0; return { contacts: near, authority: authStep, targetRateMaxDegS: r3(tgPk), handOn: win.some(y => y.handOn) }; };
  const pk = (key) => { const x = main.reduce((a, b) => Math.abs(b[key]) > Math.abs(a[key]) ? b : a, main[0]); return { t: r3(x.t - t0), value: r3(x[key]), trunkDeg: r3(x.tilt), pelvisRoll: r3(x.roll), context: ctx(x) }; };
  // posting-hand contact record
  const after = raw.filter(x => x.t >= t0), first = after.find(x => x.handOn), gaps = []; let slide = 0, Jb = 0, Jn = 0, pkN = 0, lastOn = null;
  if (first) { let gapStart = null; for (const x of after.filter(y => y.t >= first.t && y.t <= recs[kStop].t + tOff)) { if (x.handOn) { if (gapStart != null && x.t - gapStart > 0.02) gaps.push([r3(gapStart - t0), r3(x.t - t0)]); gapStart = null; slide += (x.handVt || 0) * H; Jb += x.handB * BW * H; Jn += x.handN * BW * H; pkN = Math.max(pkN, x.handN); lastOn = x.t; } else if (gapStart == null) gapStart = x.t; } }
  const onRows = first ? after.filter(x => x.handOn && x.t <= recs[kStop].t + tOff) : [], shEvo = [0, 0.25, 0.5, 0.75, 1].map(f => { if (!onRows.length) return null; const x = onRows[Math.min(onRows.length - 1, Math.round(f * (onRows.length - 1)))]; return [r3(x.t - t0), r3(x.shL), r3(x.elL)]; });
  const desc = main.filter(x => x.t - t0 >= 0 && x.t - t0 <= 1.2), rateSign = desc.reduce((s, x, i) => s + (i > 0 && Math.sign(x.rate) !== Math.sign(desc[i - 1].rate) && Math.abs(x.rate) > 10 ? 1 : 0), 0);
  // post-landing quality: [+0.15 s, stop]; descent evenness: peak / mean trunk rate while the trunk goes 25° → 75° from vertical
  const post = raw.filter(x => x.t - t0 >= 0.15 && x.t <= recs[kStop].t + tOff), i25 = post.findIndex(x => x.tilt >= 25), i75 = post.findIndex(x => x.tilt >= 75), dseg = i25 >= 0 && i75 > i25 ? post.slice(i25, i75 + 1) : [];
  const postQ = post.length ? { peakTrunkRateDegS: r3(Math.max(...post.map(x => Math.abs(x.rate)))), peakTipDegS: r3(Math.max(...post.map(x => x.tipW))), peakTrunkAccDegS2: r3(Math.max(...post.map(x => Math.abs(x.acc)))),
    rmsTrunkAccDegS2: r3(Math.sqrt(post.reduce((s, x) => s + x.acc * x.acc, 0) / post.length)), peakRollRateDegS: r3(Math.max(...post.map(x => Math.abs(x.rollRate)))),
    descent25to75: dseg.length > 1 ? { from: r3(dseg[0].t - t0), to: r3(dseg[dseg.length - 1].t - t0), meanRateDegS: r3((dseg[dseg.length - 1].tilt - dseg[0].tilt) / (dseg[dseg.length - 1].t - dseg[0].t)), peakRateDegS: r3(Math.max(...dseg.map(x => x.rate))), evenness: r3(Math.max(...dseg.map(x => x.rate)) / ((dseg[dseg.length - 1].tilt - dseg[0].tilt) / (dseg[dseg.length - 1].t - dseg[0].t))) } : null } : null;
  return { hash: o.finalHash, firstFoldContactT: r3(t0), postLanding: postQ, stopRel: r3(recs[kStop].t + tOff - t0), slidePathM: fm.slidePathM, cols: COLS, rows, firstContactRel: firstOn,
    spikes: { trunkRate: pk("rate"), trunkAcc: pk("acc"), tipW: pk("tipW"), rollRate: pk("rollRate"), pelvisW: pk("pelW") },
    smooth: { peakTrunkAccDegS2: r3(Math.max(...desc.map(x => Math.abs(x.acc)))), rmsTrunkAccDegS2: r3(Math.sqrt(desc.reduce((s, x) => s + x.acc * x.acc, 0) / desc.length)), peakTrunkRateDegS: r3(Math.max(...desc.map(x => Math.abs(x.rate)))),
      peakRollRateDegS: r3(Math.max(...desc.map(x => Math.abs(x.rollRate)))), trunkRateSignChanges: rateSign },
    hand: first ? { firstContact: r3(first.t - t0), lastContactInSlide: r3(lastOn - t0), gaps, continuous: gaps.length === 0, slideDistM: r3(slide), peakNormalBW: r3(pkN), tangentialBrakingImpulseNs: r3(Jb), normalImpulseNs: r3(Jn), shoulderEvolution: shEvo } : null }; }
