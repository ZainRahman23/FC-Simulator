// BALANCE-2 C3 summary (read-only; REPORTED, not judged): five systems on the frozen matched battery (CURRENT V2 and S2 + old P2: outcome
// criteria only, from the §17 comparison files; BALANCE-1 B, C2, C3: full B2M), their thresholds as fractions of the zero-delay limit at the battery
// edge (B2M, 102.95 mm) and at the legitimate flat-foot loaded edge (80.3 mm; BALANCE2_MATCHED_CRITERIA.md §2 sensitivity), the legitimacy
// evaluation (scripts/c3_legit.mjs: L1 boot-tip load in non-fall runs, L2 physical vs frozen-rule forward boundary), B2M's recorded human metrics
// (small / moderate pushes) and, from the review records (each system's QUIET run is its undisturbed twin), momentum, heel lift and boot-tip share.
// usage (worktree root): node .../c3_summary.mjs --rec <preserved BALANCE-2 records dir> --rec3 <C3 records dir> --out <json>
import fs from "fs"; import zlib from "zlib"; import path from "path";
const RA = new URL("../../", import.meta.url), J = (p) => JSON.parse(fs.readFileSync(new URL(p, RA))), arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
const { support } = await import(new URL("./c3_support.mjs", import.meta.url).href);
const SYS = { A: "CURRENT V2", S2P2: "S2 + old P2", B1: "M1b + BALANCE-1 B", C2: "M1b + BALANCE-2 C2", C3: "M1b + BALANCE-2 C3" };
const QV = { B1: ["B2M_Q_BALANCE1_B", "B2M_V_BALANCE1_B"], C2: ["B2M_Q_BALANCE2_C2", "B2M_V_BALANCE2_C2"], C3: ["B2M_Q_BALANCE2_C3", "B2M_V_BALANCE2_C3"] }, CMP = { A: "B2M_COMPARE_CURRENT_V2", S2P2: "B2M_COMPARE_S2P2" };
const LEG = { B1: "C3_LEGIT_TOOLCHECK_ON_B1", C2: "C3_LEGIT_TOOLCHECK_ON_C2", C3: "C3_LEGIT_BALANCE2_C3" }, ev = (n) => J("balance2/evidence/" + n + ".json");
const m = 73.91, w0 = 3.1640, f50 = 1.081, Jz = (d) => m * w0 * d * f50, ZD = { battery: { fwd: Jz(0.10295), back: Jz(0.12476) }, legitimate: { fwd: Jz(0.0803), back: Jz(0.12476) } };
const out = { systems: SYS, zeroDelayLimitsNs: ZD, humanFractionBand: [0.50, 0.70], verdicts: {}, thresholds: {}, legitimacy: {}, quietSway: {}, human: {}, review: {} };
for (const s of Object.keys(SYS)) { const Q = QV[s] ? ev(QV[s][0]) : ev(CMP[s]).Q, V = QV[s] ? ev(QV[s][1]) : ev(CMP[s]).verdict;
  out.verdicts[s] = { n: `${V.nPass} / ${V.n}`, outcomeOnly: !!V.outcomeOnly, failed: V.failed, pass: Object.fromEntries(Object.entries(V.results).map(([k, r]) => [k, r.pass])) };
  out.thresholds[s] = Object.fromEntries(Object.entries(Q.T).map(([d, t]) => [d, { Ns: +t.thresholdNs.toFixed(2), ...(ZD.battery[d] ? { fracBatteryEdge: +(t.thresholdNs / ZD.battery[d]).toFixed(3), fracLegitimateEdge: +(t.thresholdNs / ZD.legitimate[d]).toFixed(3) } : {}) }]));
  const sw = Q.U.sway; out.quietSway[s] = sw ? { comAPmm: +sw.comAPmm.rms.toFixed(2), comMLmm: +sw.comMLmm.rms.toFixed(2), freqHz: +sw.comAPfreqHz.toFixed(2), stood60s: !Q.U.fall } : { stood60s: !Q.U.fall };
  if (LEG[s]) { const L = ev(LEG[s]); out.legitimacy[s] = { L1: L.L1.pass, L1violations: L.L1.violations, L2: L.L2.pass, frozenFwdNs: L.L2.frozenRuleFwdThresholdNs, physicalFwdNs: L.L2.physicalFwdBoundaryNs, physicalBackNs: L.physicalBoundary.back.physicalBoundaryNs, frozenFallPhysicallyRecovered: L.L2.frozenFallButPhysicallyRecovered,
    maxHeelLiftNonFallDeg: Math.max(...Object.values(L.heel).map(h => h.peakDeg)), legitFwdLevels: Object.entries(L.runs).filter(([k, r]) => k.startsWith("T.fwd") && !r.fall).map(([k, r]) => ({ J: r.J, tip: r.tipSharePeak })) }; }
  out.human[s] = Object.fromEntries(Object.entries(Q.P.runs).filter(([k]) => /small|moderate/.test(k)).map(([k, r]) => [k, r.human ? { ankleAPslewNms: Math.round(r.human.torqueSlew.ankleAP), hipAPslewNms: Math.round(r.human.torqueSlew.hipAP), muscleWorkPosJ: r.human.muscleWork ? +r.human.muscleWork.positiveJ.toFixed(1) : null,
    headOverThorax: +(r.human.head.headPeakDegS / r.human.head.thoraxPeakDegS).toFixed(2), kneeExcursionDeg: r.human.excursion.knee.deg, peakComMm: +r.recovery.comPeakMm.toFixed(1), settleS: r.recovery.settleS, overshoot: r.overshoot ? +r.overshoot.frac.toFixed(3) : null } : { fall: !!r.recovery.fall }])); }
const load = (dir, k) => JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(dir, k + ".json.gz"))));
for (const s of ["A", "B1", "C2", "C3"]) { const dir = s === "C3" ? arg("rec3") : arg("rec"), tw = load(dir, "QUIET_" + s); out.review[s] = {};
  for (const sc of ["SMALLF", "F12", "BACKM", "LATM", "NEARF", "OVERF"]) { const P = load(dir, sc + "_" + s), n = Math.min(P.recs.length, tw.recs.length), ax = sc === "LATM" ? 2 : 0; let dP = 0, fall = null; const y0 = P.recs[479].S[0].pos[1];
    for (let q = 480; q < n; q++) { dP = Math.max(dP, Math.abs(P.recs[q].chars.runner.P[ax] - tw.recs[q].chars.runner.P[ax])); if (!fall && (y0 - P.recs[q].S[0].pos[1]) * 1000 > 150) fall = +((q - 480) / 240).toFixed(2); }
    const sp = support(P, tw, 480, n), c = (q) => (P.recs[q].chars.runner.com[ax] - tw.recs[q].chars.runner.com[ax]) * 1000; let pk = 0; for (let q = 480; q < n; q++) pk = Math.max(pk, Math.abs(c(q)));
    out.review[s][sc] = { peakComMm: +pk.toFixed(1), endComMm: +c(n - 1).toFixed(1), peakDeltaLinMomentumNs: +dP.toFixed(2), pelvisDrop150mmAtS: fall, tipSharePeak: sp.tipSharePeak, tipLoadedS: sp.tipLoadedS, heelLiftPeakDeg: sp.heelLiftPeakDeg, heelLiftOver1degS: sp.heelLiftOver1degS }; } }
fs.writeFileSync(arg("out"), JSON.stringify(out, null, 1)); console.log(JSON.stringify(out.verdicts, null, 0)); console.log(JSON.stringify(out.thresholds)); console.log(JSON.stringify(out.legitimacy)); console.log(JSON.stringify(out.quietSway));
for (const s of Object.keys(out.review)) console.log(s, JSON.stringify(out.review[s]));
