// BALANCE-1 frozen criteria (BALANCE1_PREREGISTRATION.md §6) applied to one evidence file from b1_qualify.mjs → verdict JSON.
// The PPR-3 S2 + P2 criteria (same definitions and human bands) with BALANCE-1's changes made BEFORE any battery run (BALANCE1_PREREGISTRATION.md
// §6): human-level push magnitudes (+ limit and over-limit levels), tiered latency (P6), joint-angle SD (U6), the torque-slew criterion (P7: the
// superhuman corrective-torque rise must be gone). Labels: [M] measured human, [E] derived, [D] design threshold, [S] V2 specification.
// usage: node b1_eval.mjs --evidence <Q.json> --out <verdict.json>
import fs from "fs";
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
export const CRIT = Object.freeze({
  U1: "[D] quiet standing 60 s with motor noise: no fall (COM within 100 mm of entry, pelvis drop < 150 mm), no stop",
  U2: "[D/S] first 250 ms: load steps 1–4 within ±10 % BW, steps 5–60 within ±1 %; penetration and separation ≤ 1 mm; COP within 5 mm of the COM projection from step 5; pelvis ≤ 1 mm, COM ≤ 2 mm, key-axis drift ≤ 0.5°",
  U3: "[D] no slow fold or creep: last-10-s mean vs 1–2 s mean — key axes ≤ 3°, pelvis ≤ 10 mm, COM ≤ 15 mm",
  U4: "[M/E] alive but bounded: COM sway RMS AP within [1.0, 12.9] mm, ML within [0.43, 6.0] mm (human 4.1–4.3 / 1.7–2.0, Foulger 2025, × [0.25, 3])",
  U5: "[S] separation ≤ 5 mm and penetration ≤ 1 mm over 60 s",
  U6: "[M/D] quiet-standing joint-angle SD within [0.1, 0.6]° for both ankles (df), knees (flex), hips (flex) and the neck (flex) (Wang 2014 side-by-side stance: ankle 0.21, knee 0.18, hip 0.30, neck 0.31°; band ×0.5–2, literature §19.3.1)",
  P1: "small human-level pushes (fwd 6.5 / back 4.0 / lateral 7.5 N·s): recovered without a step (no fall; COM within 10 mm of the twin over the last 1 s; pelvis < 10 mm)",
  P2: "moderate human-level pushes (fwd 12.0 / back 8.5 / lateral 15.0 N·s): recovered without a step",
  P3: "over-limit pushes (fwd 28.0 / back 19.5 / lateral 32.5 N·s; humans step or fall): loss of no-step balance within 4 s in every direction — a feet-in-place save exceeds human capability",
  P4: "continuum: COM peak excursion strictly increases small < moderate < limit < over-limit in every direction",
  P5: "[causality] every push: commands bit-identical to the undisturbed twin until the disturbance reaches the controller's delayed observations; first command difference ≥ onset + 1 + the shortest channel delay; first activation difference not before it",
  P6: "[M] tiered latency (literature §19.3.4 / PPR-3 §1g): first neural torque change (developed force × entry capacity, > 0.1 N·m) (a) at ankle / knee / hip / lumbar / thoracic never before 30 ms (W0); (b) at the ankle (task-level) ≥ 85 ms; (c) for moderate pushes the first change among ankle / knee / hip / lumbar ≤ 200 ms. Also REPORTED (not judged): the PPR-3 form (≥ 60 ms in all four families)",
  P7: "[M weak] no superhuman corrective-torque rise: both-ankle AP torque max 25-ms slew ≤ 906 N·m/s for small and moderate forward / backward pushes (Robinovitch 2002 lean-release 372 ± 267 N·m/s, mean + 2 SD; PPR-3 S2+P2 moderate forward 1,122)",
  M1: "[M/E] Rietdyk-form pushes (20 N·s over 350 ms, AP and ML): recovered; COM peak within [24, 120] mm; time to peak within [0.25, 1.0] s; settled (within 10 mm) by 3.5 s",
  T1: "[M/E] no-step failure threshold (50 ms pelvis pulse): forward within [8.5, 19.4] N·s, lateral within [21.8, 49.8] N·s ([0.35, 0.80] × the zero-delay limit; humans ≈ 0.44–0.56)",
  DET: "[S] bit-identical reruns (4 s standing; moderate forward push)" });
export function evaluate(Q) { const res = {}, put = (id, pass, value) => { res[id] = { pass: !!pass, value }; }, U = Q.U, A = U.audit, BW = A.bodyWeightN;
  put("U1", !U.fall && !U.stop && U.steps >= Q.battery.U.steps, U.fall || U.stop || "stood 60 s");
  put("U2", A.feetN.first4.every(f => Math.abs(f - BW) <= 0.1 * BW) && Math.abs(A.feetN.after4.min - BW) <= 0.01 * BW && Math.abs(A.feetN.after4.max - BW) <= 0.01 * BW && A.turfPenMaxMm <= 1 && A.sepMaxMm <= 1 && A.copComOffsetMm.max <= 5 && Math.abs(A.pelvisDropMm) <= 1 && A.comHorizMm <= 2 && A.maxJointDriftDeg <= 0.5,
    { feet: [+A.feetN.min.toFixed(1), +A.feetN.max.toFixed(1)], pen: +A.turfPenMaxMm.toFixed(3), sep: +A.sepMaxMm.toFixed(3), copOff: +A.copComOffsetMm.max.toFixed(2), pelvis: +A.pelvisDropMm.toFixed(3), com: +A.comHorizMm.toFixed(3), drift: +A.maxJointDriftDeg.toFixed(3) });
  const D = U.postureDrift; put("U3", D && D.maxJointMeanDeg <= 3 && D.pelvisMeanDropMm <= 10 && D.comMeanShiftMm <= 15, D ? { maxJointMeanDeg: +D.maxJointMeanDeg.toFixed(2), pelvisMeanDropMm: +D.pelvisMeanDropMm.toFixed(2), comMeanShiftMm: +D.comMeanShiftMm.toFixed(2) } : null);
  const sw = U.sway; put("U4", sw && sw.comAPmm.rms >= 1.0 && sw.comAPmm.rms <= 12.9 && sw.comMLmm.rms >= 0.43 && sw.comMLmm.rms <= 6.0, sw ? { comAP: +sw.comAPmm.rms.toFixed(2), comML: +sw.comMLmm.rms.toFixed(2), copAP: +sw.copAPmm.rms.toFixed(2), copML: +sw.copMLmm.rms.toFixed(2), freqHz: +sw.comAPfreqHz.toFixed(2) } : null);
  put("U5", U.sepMax <= 5 && U.penMax <= 1, { sepMax: +U.sepMax.toFixed(3), penMax: +U.penMax.toFixed(3) });
  const jsd = sw ? Object.fromEntries(["ankle_L.df", "ankle_R.df", "knee_L.flex", "knee_R.flex", "hip_L.flex", "hip_R.flex", "neck.flex"].map(k => [k, sw.jointRmsDeg[k]])) : null;
  put("U6", jsd && Object.values(jsd).every(v => v >= 0.1 && v <= 0.6), jsd && Object.fromEntries(Object.entries(jsd).map(([k, v]) => [k, +v.toFixed(3)])));
  const P = Q.P.runs, dirs = ["fwd", "back", "left", "right"], rcv = (r) => r.recovery.recovered;
  put("P1", dirs.every(d => rcv(P[d + ".small"])), Object.fromEntries(dirs.map(d => [d, { recovered: rcv(P[d + ".small"]), peakMm: +P[d + ".small"].recovery.comPeakMm.toFixed(1), settleS: P[d + ".small"].recovery.settleS, fall: P[d + ".small"].recovery.fall }])));
  put("P2", dirs.every(d => rcv(P[d + ".moderate"])), Object.fromEntries(dirs.map(d => [d, { recovered: rcv(P[d + ".moderate"]), peakMm: +P[d + ".moderate"].recovery.comPeakMm.toFixed(1), settleS: P[d + ".moderate"].recovery.settleS, fall: P[d + ".moderate"].recovery.fall }])));
  put("P3", dirs.every(d => !!P[d + ".over"].recovery.fall), Object.fromEntries(dirs.map(d => [d, P[d + ".over"].recovery.fall])));
  const LV = ["small", "moderate", "limit", "over"]; put("P4", dirs.every(d => LV.every((m, j) => j === 0 || P[d + "." + LV[j - 1]].recovery.comPeakMm < P[d + "." + m].recovery.comPeakMm)), Object.fromEntries(dirs.map(d => [d, LV.map(m => +P[d + "." + m].recovery.comPeakMm.toFixed(1))])));
  const onset = Q.battery.onset, minD = Math.min(...Object.values(Q.params.ctrl.delays)), causal = Object.entries(P).map(([k, v]) => { const c = v.chronology; return [k, c.commandsIdenticalBeforeSensing && c.firstCommandDiff >= onset + 1 + minD && (c.firstActivationDiff == null || c.firstActivationDiff >= c.firstCommandDiff), c.ms]; });
  put("P5", causal.every(([, ok]) => ok), Object.fromEntries(causal.map(([k, ok, ms]) => [k, { ok, commandMs: ms.command, activationMs: ms.activation }])));
  const body = ["ankle", "knee", "hip", "lumbar"], on = (v, f) => v.neuralTorqueOnsetMsByFamily[f] ?? Infinity, lat = (v, fs = body) => Math.min(...fs.map(f => on(v, f)));
  put("P6", Object.values(P).every(v => lat(v, [...body, "thoracic"]) >= 30 && on(v, "ankle") >= 85) && dirs.every(d => lat(P[d + ".moderate"]) <= 200),
    Object.fromEntries(Object.entries(P).map(([k, v]) => [k, Object.fromEntries(["ankle", "knee", "hip", "lumbar", "thoracic", "neck"].map(f => [f, on(v, f) === Infinity ? null : on(v, f)]))])));
  res.P6.reportedPPR3Form = { rule: "≥ 60 ms in ankle / knee / hip / lumbar (PPR-3 P6)", pass: Object.values(P).every(v => lat(v) >= 60) };
  const sl = ["fwd", "back"].flatMap(d => ["small", "moderate"].map(m => [d + "." + m, P[d + "." + m].human.torqueSlew.ankleAP]));
  put("P7", sl.every(([, v]) => v <= 906), Object.fromEntries(sl.map(([k, v]) => [k, +v.toFixed(0)])));
  const M = Q.M, mOk = (m) => m.recovery.recovered && m.recovery.comPeakMm >= 24 && m.recovery.comPeakMm <= 120 && m.recovery.tPeakS >= 0.25 && m.recovery.tPeakS <= 1.0 && m.recovery.settleS != null && m.recovery.settleS <= 3.5;
  put("M1", Object.values(M).every(mOk), Object.fromEntries(Object.entries(M).map(([k, m]) => [k, { recovered: m.recovery.recovered, peakMm: +m.recovery.comPeakMm.toFixed(1), tPeakS: m.recovery.tPeakS, settleS: m.recovery.settleS }])));
  const T = Q.T; put("T1", T.fwd.thresholdNs >= 8.5 && T.fwd.thresholdNs <= 19.4 && T.left.thresholdNs >= 21.8 && T.left.thresholdNs <= 49.8, { fwd: +T.fwd.thresholdNs.toFixed(2), left: +T.left.thresholdNs.toFixed(2), fwdFrac: +T.fwd.fracOfJlim.toFixed(3), leftFrac: +T.left.fracOfJlim.toFixed(3) });
  put("DET", Q.D.identical, Q.D);
  const ids = Object.keys(res), failed = ids.filter(k => !res[k].pass); return { label: Q.label, pass: failed.length === 0, nPass: ids.length - failed.length, n: ids.length, failed, results: res }; }
if (process.argv[1] && process.argv[1].endsWith("b1_eval.mjs")) { const Q = JSON.parse(fs.readFileSync(arg("evidence"))), v = evaluate(Q);
  if (arg("out")) fs.writeFileSync(arg("out"), JSON.stringify({ criteria: CRIT, ...v }, null, 1));
  console.log(`${v.label}: ${v.pass ? "PASS" : "FAIL"} ${v.nPass}/${v.n}${v.failed.length ? " · failed: " + v.failed.join(", ") : ""}`);
  for (const [k, r] of Object.entries(v.results)) console.log(`  ${r.pass ? "✓" : "✗"} ${k.padEnd(4)} ${JSON.stringify(r.value).slice(0, 220)}`); }
