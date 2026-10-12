// BALANCE-2 §6 — phase decomposition of the frozen BALANCE-1 B 12 N·s forward push (diagnostic): runs b2_decompose and derives the phase
// boundaries from the measured trajectory (no fitting): (1) passive response until the first command difference; (2) first delayed neural
// response until the first ankle / hip neural torque change; (3) peak corrective response (largest ankle torque change); (4) the forward hold
// (heels lifted > 1 mm, COP pinned at the forefoot); (5) reversal (COM velocity sign change after the peak; heels re-land); (6) backward
// overshoot (most negative COM excursion); (7) settling (not reached in the 4 s window). Also writes a downsampled series for the review page.
// usage: node b2_phases.mjs [--ctrl B1_B] [--J 12] --out <json>
import fs from "fs";
const { trace } = await import(new URL("./b2_decompose.mjs", import.meta.url).href);
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
const T = await trace(arg("ctrl", "B1_B"), "fwd", +arg("J", "12")), S = T.series.filter(r => r.t >= 0), H = 1 / 240;
const first = (pred) => { const r = S.find(pred); return r ? +(r.t * 1000).toFixed(1) : null; };
const ank = (r) => r.axes.ankL.dTauPhys + r.axes.ankR.dTauPhys, hip = (r) => r.axes.hipL.dTauPhys + r.axes.hipR.dTauPhys, lift = (r) => Math.max(r.feet.L.heelLiftMm, r.feet.R.heelLiftMm);
const cmdMs = T.chronology.firstCommandDiff != null ? (T.chronology.firstCommandDiff - 480) / 0.24 : null;
const neural = (k) => first(r => Math.abs(r.axes[k].dfP) > 1e-3 || Math.abs(r.axes[k].dfM) > 1e-3);
const pkA = S.reduce((b, r) => (ank(r) < ank(b) ? r : b), S[0]), pkX = S.reduce((b, r) => (r.com.dx > b.com.dx ? r : b), S[0]);
const up = S.filter(r => lift(r) > 1), holdFrom = up.length ? up[0].t : null, holdTo = up.length ? up[up.length - 1].t : null;
const rev = S.find(r => r.t > pkX.t && r.com.v < 0 && S.filter(q => q.t > r.t && q.t < r.t + 0.1).every(q => q.com.v < 0)), land = S.find(r => holdTo != null && r.t > holdTo);
const neg = S.reduce((b, r) => (r.com.dx < b.com.dx ? r : b), S[0]);
const atT = (t) => S.reduce((b, r) => (Math.abs(r.t - t) < Math.abs(b.t - t) ? r : b), S[0]);
const snap = (r) => ({ t: +r.t.toFixed(3), comMm: +(r.com.dx * 1000).toFixed(1), comV: +r.com.v.toFixed(3), copAbsMm: r.cop.xAbs != null ? +(r.cop.xAbs * 1000).toFixed(1) : null, comAbsMm: +(r.com.xAbs * 1000).toFixed(1), heelLiftMm: +lift(r).toFixed(1), heelShare: +r.feet.L.heelShare.toFixed(2), dTauAnkle: +ank(r).toFixed(1), dTauHip: +hip(r).toFixed(1), dTauLumbar: +r.axes.lumbar.dTauPhys.toFixed(1), aPlantar: +r.axes.ankL.aM.toFixed(3), aDorsi: +r.axes.ankL.aP.toFixed(3), F: r.ctrl ? +r.ctrl.F.toFixed(1) : null, Fp: r.ctrl ? +r.ctrl.Fp.toFixed(1) : null, Fd: r.ctrl ? +r.ctrl.Fd.toFixed(1) : null, Fi: r.ctrl ? +r.ctrl.Fi.toFixed(1) : null, grfX: +r.grf.x.toFixed(1), thoraxDeg: +r.tilt.thorax.toFixed(2), hipDeg: +r.ang.hip.toFixed(2), kneeDeg: +r.ang.knee.toFixed(2), ankleDeg: +r.ang.ankle.toFixed(2) });
const phases = {
  "1_passive": { fromMs: 0, toMs: cmdMs, note: "intrinsic muscle (short-range stiffness), passive tissue and inertia only; the push accelerates the pelvis, the trunk lags (thorax tilts back)", end: snap(atT(cmdMs / 1000)) },
  "2_first_neural": { firstCommandMs: cmdMs, firstNeuralForceMs: { ankle: neural("ankL"), hip: neural("hipL"), lumbar: neural("lumbar"), neck: neural("neck") }, end: snap(atT(0.15)) },
  "3_peak_correction": { atMs: +(pkA.t * 1000).toFixed(1), state: snap(pkA), copReachesForefootMs: first(r => r.cop.xAbs != null && r.cop.xAbs > 0.12), heelUnloadedMs: first(r => r.feet.L.heelShare < 0.01) },
  "4_forward_hold": { fromS: holdFrom, toS: holdTo, durationS: holdFrom != null ? +(holdTo - holdFrom).toFixed(3) : 0, comPeak: snap(pkX), meanCopAbsMm: +(up.reduce((s, r) => s + (r.cop.xAbs || 0), 0) / Math.max(1, up.length) * 1000).toFixed(1), meanComAbsMm: +(up.reduce((s, r) => s + r.com.xAbs, 0) / Math.max(1, up.length) * 1000).toFixed(1), maxHeelLiftMm: +Math.max(...up.map(lift)).toFixed(1), meanGrfX: +(up.reduce((s, r) => s + r.grf.x, 0) / Math.max(1, up.length)).toFixed(1), maxPlantarAct: +Math.max(...up.map(r => Math.max(r.axes.ankL.aM, r.axes.ankR.aM))).toFixed(3) },
  "5_reversal": { comVelocityReversesS: rev ? +rev.t.toFixed(3) : null, heelsRelandS: land ? +land.t.toFixed(3) : null, atReland: land ? snap(land) : null },
  "6_backward_overshoot": { atS: +neg.t.toFixed(3), state: snap(neg), overshootFracOfPeak: +(-neg.com.dx / pkX.com.dx).toFixed(3) },
  "7_settling": { settledWithin4s: T.recovery.recovered, settleS: T.recovery.settleS, tailComMm: +T.recovery.tailComMm.toFixed(1) } };
const series = S.filter((r, i) => i % 6 === 0).map(snap);
fs.writeFileSync(arg("out"), JSON.stringify({ protocol: "BALANCE-2 §6 phase decomposition (frozen BALANCE-1 B; diagnostic)", J: T.J, recovery: T.recovery, chronology: T.chronology, hashes: T.hashes, phases, series }, null, 1));
console.log(JSON.stringify(phases, null, 1));
