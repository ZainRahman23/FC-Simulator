// BALANCE-2 §3 — standing-geometry audit (read-only diagnostic; nothing is changed). Runs the FROZEN BALANCE-1 B system (canonical M1b body +
// b1_ctrl B1_B.json, unchanged) undisturbed from the PPR-3 standing entry and measures the settled state at the push onset (t = 2 s, the
// BALANCE-1 battery's onset): anatomy (spec), collider support, contact points, COM / COP / ankle / heel / toe, posture, load split,
// ankle pre-activation and passive loading. usage (worktree root): V2_KNEE_MODEL=v2k LV2_ARCHIVE=<tag archive> node .../b2_geometry.mjs --out <json>
import fs from "fs";
const RA = new URL("../../", import.meta.url).href, PL = await import(RA + "pvp1/scripts/pvp1a_lib.mjs"), { V, Q } = PL, SPEC = PL.SPEC_R();
const { runOne } = await import(RA + "balance1/scripts/b1_run.mjs"), CT = await import(RA + "balance1/scripts/b1_ctrl.mjs"), MS = await import(RA + "ppr3/scripts/ppr3_measure.mjs");
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; }, R2D = 180 / Math.PI, g = 9.81, M = SPEC.totals.mass;
const CP = JSON.parse(fs.readFileSync(new URL("balance1/params/B1_B.json", RA))), ONSET = 480;
const bi = (n) => SPEC.bodies.findIndex(b => b.name === n), jk = (n) => SPEC.joints.findIndex(j => j.name === n);
const FOOT = { L: bi("foot_L"), R: bi("foot_R") }, boot = SPEC.bodies[FOOT.L].boot, yA = SPEC.landmarks.yA;
const mean = (a) => a.reduce((s, x) => s + x, 0) / a.length;
async function settled(noise) { const cp = noise ? CP : (({ noise, ...r }) => r)(CP);
  return runOne({ law: "M1B", params: {}, ctrl: () => new CT.BalanceController(cp), steps: ONSET, instrument: true }); }
function measure(o) { const R = o.recs, W = R.slice(ONSET - 6, ONSET), WL = R.slice(240, ONSET), r = R[ONSET - 1], out = {};
  // per foot: world AJC, foot forward axis (CCS +Z), yaw (toe-out +), hull points near the turf, loaded contact points, local COP
  out.feet = {}; for (const s of ["L", "R"]) { const b = FOOT[s], S = r.S[b], fwd = Q.rot(S.rot, [0, 0, 1]), yawOut = Math.atan2(fwd[2], fwd[0]) * R2D * (s === "L" ? 1 : -1);
    const hull = SPEC.bodies[b].shapes.flatMap(sh => sh.points.map(p => V.add(S.pos, Q.rot(S.rot, V.add(sh.pos, Q.rot(sh.rot, p))))));
    const along = (p) => (p[0] - S.pos[0]) * fwd[0] + (p[2] - S.pos[2]) * fwd[2], near = (h) => hull.filter(p => p[1] <= h);
    const pts = []; for (const rr of W) for (const m of rr.contacts || []) if (m.kind === "turf-runner" && m.b[1] === SPEC.bodies[b].name) for (const p of m.points) pts.push(p);
    const loaded = pts.filter(p => p.lam > 0), bosPts = pts.filter(p => p.lam > 0 || p.depth >= -0.005);
    let F = 0, ax = 0; for (const p of loaded) { F += p.lam; ax += p.lam * along(p.p); }
    out.feet[s] = { ajc: S.pos, fwdAxis: fwd, yawOutDeg: yawOut, soleHullAlong: { heel: Math.min(...near(0.0005).map(along)), front: Math.max(...near(0.0005).map(along)) },
      hullWithin5mmAlong: { heel: Math.min(...near(0.005).map(along)), front: Math.max(...near(0.005).map(along)) }, hullFrontAtHeight: [0.001, 0.002, 0.005, 0.008, 0.012].map(h => [h, Math.max(...near(h).map(along))]),
      contactAlong: { loadedHeel: Math.min(...loaded.map(p => along(p.p))), loadedFront: Math.max(...loaded.map(p => along(p.p))), bosFront: Math.max(...bosPts.map(p => along(p.p))) },
      worldX: { loadedFront: Math.max(...loaded.map(p => p.p[0])), bosFront: Math.max(...bosPts.map(p => p.p[0])), loadedBack: Math.min(...loaded.map(p => p.p[0])) },
      copAlong: F > 0 ? ax / F : null, loadN: r.chars.runner.feet[s] * 240 }; }
  const f = MS.frame(r, R[ONSET - 2]), com = r.chars.runner.com, ajcX = mean([out.feet.L.ajc[0], out.feet.R.ajc[0]]), copX = f.cop ? f.cop[0] : null;
  const edges = { fwd: Math.max(out.feet.L.worldX.bosFront, out.feet.R.worldX.bosFront), loadedFwd: Math.max(out.feet.L.worldX.loadedFront, out.feet.R.worldX.loadedFront), back: Math.min(out.feet.L.worldX.loadedBack, out.feet.R.worldX.loadedBack) };
  const h = com[1], w0 = Math.sqrt(g / h);
  out.com = { pos: com, heightM: h, omega0: w0, meanOver1to2s: [0, 1, 2].map(i => mean(WL.map(q => q.chars.runner.com[i]))) };
  out.cop = { pos: f.cop, meanOver1to2s: [0, 1].map(i => mean(WL.map(q => { const c = MS.cop(q); return c ? c[i] : 0; }))) };
  out.distancesMm = { comAheadOfAJC: (com[0] - ajcX) * 1000, copAheadOfAJC: copX != null ? (copX - ajcX) * 1000 : null, comToBattleryEdgeFwd: (edges.fwd - com[0]) * 1000, comToLoadedFront: (edges.loadedFwd - com[0]) * 1000, comToHeelEdge: (com[0] - edges.back) * 1000,
    comToMTP1: (ajcX + boot.mtp1AheadAJC - com[0]) * 1000, comToMTP5: (ajcX + boot.mtp5AheadAJC - com[0]) * 1000, comToBootTip: (ajcX + boot.tipAheadAJC - com[0]) * 1000, comToAnatomicalToeTip: (ajcX + boot.footTipAheadAJC - com[0]) * 1000,
    comToAnatomicalHeel: (com[0] - (ajcX - boot.footHeelBehindAJC)) * 1000, stanceWidthAJC: Math.abs(out.feet.L.ajc[2] - out.feet.R.ajc[2]) * 1000, comLateralOffset: (com[2] - mean([out.feet.L.ajc[2], out.feet.R.ajc[2]])) * 1000 };
  const FL = boot.footLength, heelX = ajcX - boot.footHeelBehindAJC, pct = (x) => (x - heelX) / FL * 100;
  out.percentFootLengthFromAnatomicalHeel = { ajc: pct(ajcX), com: pct(com[0]), cop: copX != null ? pct(copX) : null, battleryEdgeFwd: pct(edges.fwd), loadedFront: pct(edges.loadedFwd), mtp1: pct(ajcX + boot.mtp1AheadAJC), mtp5: pct(ajcX + boot.mtp5AheadAJC), bootTip: pct(ajcX + boot.tipAheadAJC), bootHeel: pct(ajcX - boot.heelBehindAJC) };
  out.zeroDelayLimitNs = { fwd_battleryEdge: M * w0 * (edges.fwd - com[0]), fwd_loadedFront: M * w0 * (edges.loadedFwd - com[0]), back_heel: M * w0 * (com[0] - edges.back), fwd_MTP1: M * w0 * (ajcX + boot.mtp1AheadAJC - com[0]), fwd_anatomicalToeTip: M * w0 * (ajcX + boot.footTipAheadAJC - com[0]) };
  out.posture = { jointsDeg: f.th, tiltDeg: f.tilt, pelvisHeightM: f.pelvisY, extra: Object.fromEntries([["hip_L.rot", jk("hip_L"), 0], ["hip_R.rot", jk("hip_R"), 0], ["knee_L.rot", jk("knee_L"), 0], ["neck.rot", jk("neck"), 0]].map(([n, k, i]) => [n, r.chars.runner.th[k][i] * R2D])) };
  out.load = { leftN: out.feet.L.loadN, rightN: out.feet.R.loadN, leftShare: out.feet.L.loadN / (out.feet.L.loadN + out.feet.R.loadN), bodyWeightN: M * g };
  // actuator readback for the sagittal support axes: law row [k, i, τ_intent, u+, u−, a+, a−, f+, f−, K_mus, D, τ_elastic, τ_passiveB, drive, Δτ, R+, R−]
  const cap = new Map((o.entry.law0 || []).map(e => [e.k + "_" + e.i, e])); out.actuation = {};
  for (const [n, j, i] of [["ankle_L.df", "ankle_L", 1], ["ankle_R.df", "ankle_R", 1], ["knee_L.flex", "knee_L", 1], ["knee_R.flex", "knee_R", 1], ["hip_L.flex", "hip_L", 1], ["hip_R.flex", "hip_R", 1], ["lumbar.flex", "lumbar", 1], ["ankle_L.inv", "ankle_L", 2], ["hip_L.abd", "hip_L", 2]]) {
    const k = jk(j), L = (r.law || []).find(x => x[0] === k && x[1] === i), a = (r.act || []).find(x => x[0] === k && x[1] === i), e = cap.get(k + "_" + i), sAx = SPEC.joints[k].def.axes[["x", "y", "z"][i]];
    out.actuation[n] = { axisSign: sAx.s, positiveIs: sAx.pos, negativeIs: sAx.neg, tauIntent: L[2], uPos: L[3], uNeg: L[4], aPos: L[5], aNeg: L[6], fPos: L[7], fNeg: L[8], capIso: e.capIso, tauStatic: e.tauStatic,
      activeTorquePos: L[5] * e.capIso[0], activeTorqueNeg: L[6] * e.capIso[1], Kmus: L[9], tauElastic: L[11], tauPassiveB: L[12], actuatorTau: a ? a[2] : null, v2Passive: r.passive[k][i], angleDeg: r.chars.runner.th[k][i] * R2D }; }
  out.edges = edges; return out; }
const res = { protocol: "BALANCE-2 §3 standing-geometry audit (frozen BALANCE-1 B, undisturbed, measured at the battery onset t = 2 s)", anatomy: {
  heightM: SPEC.human.H, massKg: M, footLengthM: boot.footLength, footLengthOverH: boot.footLength / SPEC.human.H, anklePosFromHeelFrac: boot.footHeelBehindAJC / boot.footLength, ankleHeightM: yA,
  bootLengthM: boot.length, bootHeelBehindAJC: boot.heelBehindAJC, bootTipAheadAJC: boot.tipAheadAJC, mtp1AheadAJC: boot.mtp1AheadAJC, mtp5AheadAJC: boot.mtp5AheadAJC, footTipAheadAJC: boot.footTipAheadAJC, footHeelBehindAJC: boot.footHeelBehindAJC,
  toeSpringM: boot.toeSpring, ballWidthM: boot.ballWidth, heelWidthM: boot.heelWidth, profile: SPEC.profile ? { footLen: SPEC.profile.footLen, ankleFromHeel: SPEC.profile.ankleFromHeel, mtp1FromHeel: SPEC.profile.mtp1FromHeel, mtp5FromHeel: SPEC.profile.mtp5FromHeel } : null,
  bootShapeNote: SPEC.bodies[FOOT.L].shapes[0].note } };
const withNoise = await settled(true), noNoise = await settled(false);
res.battery = measure(withNoise); res.noiseFree = measure(noNoise); res.hashes = { withNoise: withNoise.finalHash, noiseFree: noNoise.finalHash };
fs.writeFileSync(arg("out"), JSON.stringify(res, null, 1));
const b = res.battery; console.log(JSON.stringify({ anatomy: res.anatomy, distancesMm: b.distancesMm, pct: b.percentFootLengthFromAnatomicalHeel, Jlim: b.zeroDelayLimitNs, feet: Object.fromEntries(Object.entries(b.feet).map(([s, v]) => [s, { yawOutDeg: v.yawOutDeg, soleHullAlong: v.soleHullAlong, hullWithin5mmAlong: v.hullWithin5mmAlong, hullFrontAtHeight: v.hullFrontAtHeight, contactAlong: v.contactAlong, copAlong: v.copAlong, loadN: v.loadN }])), posture: b.posture, load: b.load, com: b.com.pos, cop: b.cop.pos }, (k, v) => typeof v === "number" ? +v.toFixed(4) : v, 1));
console.log("actuation", JSON.stringify(b.actuation, (k, v) => typeof v === "number" ? +v.toFixed(3) : v));
