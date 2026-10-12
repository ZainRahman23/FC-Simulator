// BALANCE-2 final summary (read-only; REPORTED, not judged): the four-system table on the frozen matched battery, the human-comparison metrics the
// battery already records (torque slew, muscle work, head vs thorax peak rate, joint excursions), and from the §18 review records (each system's
// QUIET run is its undisturbed twin: same seed, identical until the push at step 480): peak linear-momentum change, peak centroidal angular
// momentum change (L_O − com × P), active muscle work over the window, heel lift (foot pitch vs the twin), and fall onset.
// usage (worktree root): node .../b2_summary.mjs --rec <review records dir> --out <json>
import fs from "fs"; import zlib from "zlib"; import path from "path";
const RA = new URL("../../", import.meta.url), J = (p) => JSON.parse(fs.readFileSync(new URL(p, RA))), arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
const PL = await import(new URL("pvp1/scripts/pvp1a_lib.mjs", RA).href), { Q } = PL, SPEC = PL.SPEC_R(), FOOT = ["foot_L", "foot_R"].map(n => SPEC.bodies.findIndex(b => b.name === n)), R2D = 180 / Math.PI;
const SYS = { A: "CURRENT V2", S2P2: "S2 + old P2", B1: "M1b + BALANCE-1 B", C2: "M1b + BALANCE-2 C2" };
const QV = { B1: [J("balance2/evidence/B2M_Q_BALANCE1_B.json"), J("balance2/evidence/B2M_V_BALANCE1_B.json")], C2: [J("balance2/evidence/B2M_Q_BALANCE2_C2.json"), J("balance2/evidence/B2M_V_BALANCE2_C2.json")] };
const CMP = { A: J("balance2/evidence/B2M_COMPARE_CURRENT_V2.json"), S2P2: J("balance2/evidence/B2M_COMPARE_S2P2.json") };
const out = { systems: SYS, verdicts: {}, thresholds: {}, quietSway: {}, human: {}, review: {} };
const Qof = (s) => (QV[s] ? QV[s][0] : CMP[s].Q), Vof = (s) => (QV[s] ? QV[s][1] : CMP[s].verdict);
const Jzd = { fwd: 26.02, back: 31.54, left: 62.22, right: 62.22 }; // zero-delay limits at the battery edges × the 50 ms factor (m·ω0·d·1.081; lateral BALANCE-1 Jlim)
for (const s of Object.keys(SYS)) { const V = Vof(s), Qs = Qof(s); out.verdicts[s] = { n: `${V.nPass} / ${V.n}`, outcomeOnly: !!V.outcomeOnly, failed: V.failed, pass: Object.fromEntries(Object.entries(V.results).map(([k, r]) => [k, r.pass])) };
  out.thresholds[s] = Object.fromEntries(Object.entries(Qs.T).map(([d, t]) => [d, { Ns: +t.thresholdNs.toFixed(2), fracZeroDelay: +(t.thresholdNs / Jzd[d]).toFixed(3) }]));
  const sw = Qs.U.sway; out.quietSway[s] = sw ? { comAPmm: +sw.comAPmm.rms.toFixed(2), comMLmm: +sw.comMLmm.rms.toFixed(2), freqHz: +sw.comAPfreqHz.toFixed(2), stood60s: !Qs.U.fall } : { stood60s: !Qs.U.fall, fellAtS: Qs.U.fall && Qs.U.fall.t };
  out.human[s] = Object.fromEntries(Object.entries(Qs.P.runs).filter(([k]) => /small|moderate/.test(k)).map(([k, r]) => [k, r.human ? { ankleAPslewNms: Math.round(r.human.torqueSlew.ankleAP), hipAPslewNms: Math.round(r.human.torqueSlew.hipAP), muscleWorkPosJ: r.human.muscleWork ? +r.human.muscleWork.positiveJ.toFixed(1) : null, muscleWorkNegJ: r.human.muscleWork ? +r.human.muscleWork.negativeJ.toFixed(1) : null,
    headPeakDegS: +r.human.head.headPeakDegS.toFixed(1), thoraxPeakDegS: +r.human.head.thoraxPeakDegS.toFixed(1), headOverThorax: +(r.human.head.headPeakDegS / r.human.head.thoraxPeakDegS).toFixed(2), kneeExcursionDeg: r.human.excursion.knee.deg, peakComMm: +r.recovery.comPeakMm.toFixed(1), overshoot: r.overshoot ? +r.overshoot.frac.toFixed(3) : null } : { fall: !!r.recovery.fall }])); }
const REC = arg("rec"); const load = (k) => JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(REC, k + ".json.gz"))));
const pitch = (r, b) => { const f = Q.rot(r.S[b].rot, [0, 0, 1]); return Math.asin(Math.max(-1, Math.min(1, f[1]))) * R2D; };
for (const s of Object.keys(SYS)) { const tw = load("QUIET_" + s).recs; out.review[s] = {};
  for (const sc of ["SMALLF", "F12", "BACKM", "LATM", "NEARF", "OVERF"]) { const P = load(sc + "_" + s).recs, n = Math.min(P.length, tw.length), ax = sc === "LATM" ? 2 : 0, angAx = sc === "LATM" ? 0 : 2; let dP = 0, dL = 0, heelMax = 0, heelSteps = 0, fall = null;
    const y0 = P[479].S[0].pos[1], Lc = (r) => { const c = r.chars.runner; return [c.L_O[0] - (c.com[1] * c.P[2] - c.com[2] * c.P[1]), c.L_O[1] - (c.com[2] * c.P[0] - c.com[0] * c.P[2]), c.L_O[2] - (c.com[0] * c.P[1] - c.com[1] * c.P[0])]; };
    for (let q = 480; q < n; q++) { const a = P[q], b = tw[q]; dP = Math.max(dP, Math.abs(a.chars.runner.P[ax] - b.chars.runner.P[ax])); dL = Math.max(dL, Math.abs(Lc(a)[angAx] - Lc(b)[angAx]));
      const hp = Math.max(...FOOT.map(f => Math.abs(pitch(a, f) - pitch(b, f)))); heelMax = Math.max(heelMax, hp); if (hp > 1) heelSteps++; if (!fall && (y0 - a.S[0].pos[1]) * 1000 > 150) fall = +((q - 480) / 240).toFixed(2); }
    const W = (r) => r.chars.runner.Wact, wEnd = Math.min(n, 480 + 960) - 1;
    out.review[s][sc] = { peakDeltaLinMomentumNs: +dP.toFixed(2), peakDeltaCentroidalAngMomentum: +dL.toFixed(2), activeWorkDeltaJ: W(P[wEnd]) != null && W(tw[wEnd]) != null ? +(W(P[wEnd]) - W(tw[wEnd])).toFixed(1) : null, maxFootPitchDeltaDeg: +heelMax.toFixed(1), footPitchOver1degS: +(heelSteps / 240).toFixed(2), pelvisDrop150mmAtS: fall }; } }
fs.writeFileSync(arg("out"), JSON.stringify(out, null, 1)); console.log(JSON.stringify(out.verdicts)); console.log(JSON.stringify(out.thresholds)); console.log(JSON.stringify(out.quietSway));
for (const s of Object.keys(SYS)) console.log(s, JSON.stringify(out.review[s]));
