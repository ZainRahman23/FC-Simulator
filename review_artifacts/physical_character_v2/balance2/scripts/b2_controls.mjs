// BALANCE-2 §7 — forward vs backward / lateral controls (read-only diagnostic on the FROZEN BALANCE-1 B system). For each push, features of the
// response from b2_decompose.mjs traces: normalised difficulty (J / zero-delay limit at the LOADED support edge of that direction), COM peak /
// timing / settling / overshoot, use of the support (COP excursion toward the edge as a fraction of the available range, time at the edge),
// foot lift (heel / forefoot / one-foot unload), latencies, joint shares of the corrective moment, saturation of the main muscle groups, and the
// controller's integral share at the COM peak and at the reversal. usage: node b2_controls.mjs --out <json>
import fs from "fs";
const { trace } = await import(new URL("./b2_decompose.mjs", import.meta.url).href);
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
export function features(T) { const S = T.series.filter(r => r.t >= 0), dir = T.dir, ap = dir === "fwd" || dir === "back", sg = dir === "fwd" || dir === "left" ? 1 : -1, j = ap ? 0 : 1;
  const edge = T.edgesLoaded[dir], c0 = T.comEntry[ap ? 0 : 2], copRange = Math.abs(edge - (ap ? T.ajc0 + S[0].cop.xAbs : S[0].cop.zAbs)), copAbs = (r) => (ap ? (r.cop.xAbs != null ? T.ajc0 + r.cop.xAbs : null) : r.cop.zAbs);
  const copUse = S.map(r => { const c = copAbs(r); return c == null ? 0 : (sg * (c - (ap ? T.ajc0 + S[0].cop.xAbs : S[0].cop.zAbs))) / copRange; }), atEdge = copUse.filter(u => u > 0.9).length / 240;
  const dx = S.map(r => sg * r.com.dx), pk = Math.max(...dx), ipk = dx.indexOf(pk), mn = Math.min(...dx.slice(ipk)), ovs = -mn / pk;
  const lift = { heelMaxMm: Math.max(...S.map(r => Math.max(r.feet.L.heelLiftMm, r.feet.R.heelLiftMm))), forefootMaxMm: Math.max(...S.map(r => Math.max(r.feet.L.forefootLiftMm, r.feet.R.forefootLiftMm))), heelUpS: S.filter(r => Math.max(r.feet.L.heelLiftMm, r.feet.R.heelLiftMm) > 1).length / 240, forefootUpS: S.filter(r => Math.max(r.feet.L.forefootLiftMm, r.feet.R.forefootLiftMm) > 1).length / 240, minFootLoadN: Math.min(...S.map(r => Math.min(r.feet.L.loadN, r.feet.R.loadN))) };
  // corrective moment shares over the first second: |Δτ| integrated per joint family in the push plane
  const fam = ap ? { ankle: ["ankL", "ankR"], knee: ["kneeL", "kneeR"], hip: ["hipL", "hipR"], spine: ["lumbar", "thoracic"] } : { ankle: ["ankLinv", "ankRinv"], hip: ["hipLabd", "hipRabd"] };
  const W1 = S.filter(r => r.t <= 1.0), share = {}; let tot = 0; for (const [f, ks] of Object.entries(fam)) { share[f] = W1.reduce((s, r) => s + Math.abs(ks.reduce((a, k) => a + r.axes[k].dTauPhys, 0)), 0) / 240; tot += share[f]; } for (const f in share) share[f] /= tot;
  const ctl = S.filter(r => r.ctrl), at = (i) => ctl[Math.min(i, ctl.length - 1)].ctrl, rev = dx.findIndex((v, i) => i > ipk && v < 0.25 * pk), Fi = (c) => (c.F ? c.Fi / c.F : null);
  const sat = { ankleMaxActDrive: Math.max(...S.map(r => Math.max(r.axes.ankL.aM, r.axes.ankL.aP, r.axes.ankR.aM, r.axes.ankR.aP))), hipMaxAct: Math.max(...S.map(r => Math.max(r.axes.hipL.aM, r.axes.hipL.aP, r.axes.hipLabd.aM, r.axes.hipLabd.aP, r.axes.hipRabd.aM, r.axes.hipRabd.aP))) };
  return { dir, J: T.J, normDifficulty: T.J / T.JlimLoaded[dir], JlimLoaded: T.JlimLoaded[dir], marginLoadedMm: T.marginLoadedM[dir] * 1000, recovery: T.recovery, comPeakMm: pk * 1000, tPeakS: ipk / 240, overshootFrac: ovs, copMaxUse: Math.max(...copUse), copAtEdgeS: atEdge, lift, momentShare1s: share,
    latencyMs: T.chronology.ms || null, firstCommandDiffMs: T.chronology.firstCommandDiff != null ? (T.chronology.firstCommandDiff - 480) / 0.24 : null, integralShare: { atPeak: Fi(at(ipk)), atReversal: rev > 0 ? Fi(at(rev)) : null }, saturation: sat }; }
if (process.argv[1] && process.argv[1].endsWith("b2_controls.mjs")) { const runs = [];
  // the frozen moderate levels, then matched normalised difficulty: forward at the backward-moderate fraction and vice versa, lateral at the
  // forward-moderate fraction (fractions of the LOADED-edge zero-delay limit, computed from the first traces)
  const f12 = await trace("B1_B", "fwd", 12), b85 = await trace("B1_B", "back", 8.5), l15 = await trace("B1_B", "left", 15); for (const T of [f12, b85, l15]) runs.push(features(T));
  const fF = 12 / f12.JlimLoaded.fwd, fB = 8.5 / b85.JlimLoaded.back, fL = 15 / l15.JlimLoaded.left;
  for (const [d, J] of [["fwd", fB * f12.JlimLoaded.fwd], ["fwd", fL * f12.JlimLoaded.fwd], ["back", fF * b85.JlimLoaded.back], ["left", fF * l15.JlimLoaded.left]]) runs.push(features(await trace("B1_B", d, +J.toFixed(3))));
  fs.writeFileSync(arg("out"), JSON.stringify({ protocol: "BALANCE-2 §7 controls (frozen BALANCE-1 B; diagnostic)", fractions: { fwdModerate: fF, backModerate: fB, leftModerate: fL }, runs }, null, 1));
  for (const r of runs) console.log(r.dir, r.J.toFixed(2), "norm", r.normDifficulty.toFixed(2), "fall", !!r.recovery.fall, "rec", r.recovery.recovered, "pk", r.comPeakMm.toFixed(1), "@", r.tPeakS.toFixed(2), "settle", r.recovery.settleS, "ovs", r.overshootFrac.toFixed(2), "copUse", r.copMaxUse.toFixed(2), "edgeS", r.copAtEdgeS.toFixed(2), "heelUp", r.lift.heelUpS.toFixed(2), "ffUp", r.lift.forefootUpS.toFixed(2), "minLoad", r.lift.minFootLoadN.toFixed(0), "share", JSON.stringify(r.momentShare1s, (k, v) => typeof v === "number" ? +v.toFixed(2) : v), "Ishare", JSON.stringify(r.integralShare, (k, v) => typeof v === "number" ? +v.toFixed(2) : v), "sat", JSON.stringify(r.saturation, (k, v) => typeof v === "number" ? +v.toFixed(2) : v)); }
