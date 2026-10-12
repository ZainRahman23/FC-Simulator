// PPR-3 S2 + P2 frozen criteria (PPR3_P2_PREREGISTRATION.md §4) applied to one evidence file from ppr3_p2_qualify.mjs → verdict JSON.
// Labels: [M] measured human value, [E] derived, [D] design threshold, [S] V2 specification.
// usage: node ppr3_p2_eval.mjs --evidence <Q.json> --out <verdict.json>
import fs from "fs";
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
export const CRIT = Object.freeze({
  U1: "[D] undisturbed standing 60 s with motor noise: no fall (COM within 100 mm of entry, pelvis drop < 150 mm), no stop",
  U2: "[D/S] first 250 ms with P2 running: load steps 1–4 within ±10 % BW and steps 5–60 within ±1 %; penetration and separation ≤ 1 mm; COP within 5 mm of the COM projection from step 5; pelvis ≤ 1 mm, COM ≤ 2 mm, key-axis drift ≤ 0.5°",
  U3: "[D] no slow fold or creep: last-10-s mean vs 1–2 s mean — every key axis ≤ 3°, pelvis drop ≤ 10 mm, COM shift ≤ 15 mm",
  U4: "[M/E] alive but bounded: COM sway RMS AP within [1.0, 12.9] mm and ML within [0.43, 6.0] mm (human 4.1–4.3 / 1.7–2.0 mm, Foulger 2025, × [0.25, 3] for this wider, flexed stance)",
  U5: "[S] separation ≤ 5 mm transient and penetration ≤ 1 mm over 60 s",
  P1: "small pushes (4 directions): recovered without a step (no fall; COM within 10 mm of the undisturbed twin over the last 1 s; pelvis < 10 mm)",
  P2: "moderate pushes (4 directions): recovered without a step",
  P3: "large pushes (4 directions; 1.5 × the zero-delay limit): loss of no-step balance within 4 s — a controller that saves everything fails",
  P4: "continuum: COM peak excursion strictly increases small < moderate < large in every direction",
  P5: "[causality] every push: P2 commands bit-identical to the undisturbed twin until the disturbance reaches P2's delayed sensory state; first command difference ≥ onset + 1 step + the shortest channel delay (6 steps = 25 ms); first activation difference not before the first command difference",
  P6: "[M] latency: first neural torque change (> 0.1 N·m) at ankle / knee / hip / lumbar ≥ 60 ms after onset (earliest automatic postural EMG) and ≤ 200 ms for moderate pushes (active torque 100–160 ms, Horak 1989; Robinovitch 2002)",
  M1: "[M/E] Rietdyk-form pushes (20 N·s over 350 ms, AP and ML): recovered; COM peak within [24, 120] mm (Rietdyk 1999: 56–70 mm, × [0.4, 2]); time to peak within [0.25, 1.0] s; settled (within 10 mm) by 3.5 s (human 2–3 s)",
  T1: "[M/E] no-step failure threshold (50 ms pelvis pulse): forward within [8.5, 19.4] N·s and lateral within [21.8, 49.8] N·s (= [0.35, 0.80] × this stance's zero-delay XcoM limit; humans step at ≈ 0.44–0.56)",
  DET: "[S] bit-identical reruns (4 s standing, moderate forward push)",
});
export function evaluate(Q) { const res = {}, put = (id, pass, value) => { res[id] = { pass: !!pass, value }; }, U = Q.U, A = U.audit, BW = A.bodyWeightN;
  put("U1", !U.fall && !U.stop, U.fall || U.stop || "stood 60 s");
  put("U2", A.feetN.first4.every(f => Math.abs(f - BW) <= 0.1 * BW) && Math.abs(A.feetN.after4.min - BW) <= 0.01 * BW && Math.abs(A.feetN.after4.max - BW) <= 0.01 * BW && A.turfPenMaxMm <= 1 && A.sepMaxMm <= 1 && A.copComOffsetMm.max <= 5 && Math.abs(A.pelvisDropMm) <= 1 && A.comHorizMm <= 2 && A.maxJointDriftDeg <= 0.5,
    { feet: [+A.feetN.min.toFixed(1), +A.feetN.max.toFixed(1), +A.feetN.after4.min.toFixed(1), +A.feetN.after4.max.toFixed(1)], pen: +A.turfPenMaxMm.toFixed(3), sep: +A.sepMaxMm.toFixed(3), copOff: +A.copComOffsetMm.max.toFixed(2), pelvis: +A.pelvisDropMm.toFixed(3), com: +A.comHorizMm.toFixed(3), drift: +A.maxJointDriftDeg.toFixed(3) });
  const D = U.postureDrift; put("U3", D.maxJointMeanDeg <= 3 && D.pelvisMeanDropMm <= 10 && D.comMeanShiftMm <= 15, { maxJointMeanDeg: +D.maxJointMeanDeg.toFixed(2), pelvisMeanDropMm: +D.pelvisMeanDropMm.toFixed(2), comMeanShiftMm: +D.comMeanShiftMm.toFixed(2) });
  const sw = U.sway; put("U4", sw.comAPmm.rms >= 1.0 && sw.comAPmm.rms <= 12.9 && sw.comMLmm.rms >= 0.43 && sw.comMLmm.rms <= 6.0, { comAP: +sw.comAPmm.rms.toFixed(2), comML: +sw.comMLmm.rms.toFixed(2), copAP: +sw.copAPmm.rms.toFixed(2), copML: +sw.copMLmm.rms.toFixed(2), copVel: +sw.copMeanVelMmS.toFixed(1) });
  put("U5", U.sepMax <= 5 && U.penMax <= 1, { sepMax: +U.sepMax.toFixed(3), penMax: +U.penMax.toFixed(3) });
  const P = Q.P.runs, dirs = ["fwd", "back", "left", "right"], rcv = (r) => r.recovery.recovered;
  put("P1", dirs.every(d => rcv(P[d + ".small"])), Object.fromEntries(dirs.map(d => [d, { recovered: rcv(P[d + ".small"]), peakMm: +P[d + ".small"].recovery.comPeakMm.toFixed(1), settleS: P[d + ".small"].recovery.settleS }])));
  put("P2", dirs.every(d => rcv(P[d + ".moderate"])), Object.fromEntries(dirs.map(d => [d, { recovered: rcv(P[d + ".moderate"]), peakMm: +P[d + ".moderate"].recovery.comPeakMm.toFixed(1), fall: P[d + ".moderate"].recovery.fall }])));
  put("P3", dirs.every(d => !!P[d + ".large"].recovery.fall), Object.fromEntries(dirs.map(d => [d, P[d + ".large"].recovery.fall])));
  put("P4", dirs.every(d => P[d + ".small"].recovery.comPeakMm < P[d + ".moderate"].recovery.comPeakMm && P[d + ".moderate"].recovery.comPeakMm < P[d + ".large"].recovery.comPeakMm), Object.fromEntries(dirs.map(d => [d, ["small", "moderate", "large"].map(m => +P[d + "." + m].recovery.comPeakMm.toFixed(1))])));
  const onset = Q.battery.onset, causal = Object.entries(P).map(([k, v]) => { const c = v.chronology; return [k, c.commandsIdenticalBeforeSensing && c.firstCommandDiff >= onset + 1 + 6 && (c.firstActivationDiff == null || c.firstActivationDiff >= c.firstCommandDiff), c.ms]; });
  put("P5", causal.every(([, ok]) => ok), Object.fromEntries(causal.map(([k, ok, ms]) => [k, { ok, commandMs: ms.command, activationMs: ms.activation }])));
  const body = ["ankle", "knee", "hip", "lumbar"], lat = (v) => Math.min(...body.map(f => v.neuralTorqueOnsetMsByFamily[f] ?? Infinity));
  put("P6", Object.values(P).every(v => lat(v) >= 60) && dirs.every(d => lat(P[d + ".moderate"]) <= 200), Object.fromEntries(Object.entries(P).map(([k, v]) => [k, lat(v) === Infinity ? null : lat(v)])));
  const M = Q.M, mOk = (m) => m.recovery.recovered && m.recovery.comPeakMm >= 24 && m.recovery.comPeakMm <= 120 && m.recovery.tPeakS >= 0.25 && m.recovery.tPeakS <= 1.0 && m.recovery.settleS != null && m.recovery.settleS <= 3.5;
  put("M1", Object.values(M).every(mOk), Object.fromEntries(Object.entries(M).map(([k, m]) => [k, { recovered: m.recovery.recovered, peakMm: +m.recovery.comPeakMm.toFixed(1), tPeakS: m.recovery.tPeakS, settleS: m.recovery.settleS }])));
  const T = Q.T; put("T1", T.fwd.thresholdNs >= 8.5 && T.fwd.thresholdNs <= 19.4 && T.left.thresholdNs >= 21.8 && T.left.thresholdNs <= 49.8, { fwd: +T.fwd.thresholdNs.toFixed(2), left: +T.left.thresholdNs.toFixed(2), fwdFrac: +T.fwd.fracOfJlim.toFixed(3), leftFrac: +T.left.fracOfJlim.toFixed(3) });
  put("DET", Q.D.identical, Q.D);
  const ids = Object.keys(res), failed = ids.filter(k => !res[k].pass); return { label: Q.label, pass: failed.length === 0, nPass: ids.length - failed.length, n: ids.length, failed, results: res }; }
if (process.argv[1] && process.argv[1].endsWith("ppr3_p2_eval.mjs")) { const Q = JSON.parse(fs.readFileSync(arg("evidence"))), v = evaluate(Q);
  if (arg("out")) fs.writeFileSync(arg("out"), JSON.stringify({ criteria: CRIT, ...v }, null, 1));
  console.log(`${v.label}: ${v.pass ? "PASS" : "FAIL"} ${v.nPass}/${v.n}${v.failed.length ? " · failed: " + v.failed.join(", ") : ""}`);
  for (const [k, r] of Object.entries(v.results)) console.log(`  ${r.pass ? "✓" : "✗"} ${k.padEnd(4)} ${JSON.stringify(r.value).slice(0, 200)}`); }
