// PPR-2 frozen qualification criteria (PPR2_PREREGISTRATION.md §4) applied to one evidence file from ppr2_qualify.mjs → verdict JSON.
// Labels: [M] measured human value, [E] derived from measured values, [D] design threshold, [S] V2 specification.
// usage: node ppr2_eval.mjs --evidence <Q.json> --out <verdict.json>
import fs from "fs";
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
export const REF = Object.freeze({
  loopDelayS: 0.175,                                            // [M/R] Peterka & Loughlin 2004 postural loop delay
  ankleVlutters: (deg) => 0.93 * Math.pow(deg / 0.29, -0.271),   // [E] power law through Vlutters 2015 (0.93 mgh @ 0.29°, 0.44 @ 4.6°), end of a 40 ms ramp
  ankleSakanaka: (deg) => 0.94 * Math.pow(deg / 0.2, -0.321),    // [E] power law through Sakanaka 2021 (0.94 mgh @ 0.2°, 0.58 @ 0.9°), first 70 ms
  band: [0.5, 1.5],                                             // [E] ±2 SD of Loram & Lakie 2002 (91 ± 23 % mgh) as a fraction of the mean
  hipPerSide: [30, 91],                                         // [E] Kiemel 2008 intrinsic hip 95–147 N·m/rad (both hips) → 60.5 per hip × band
  kneeMin: 17,                                                  // [E] Riener & Edrich 1999 passive knee stiffness at 14° flexion (lower bound only; no standing data)
});
export const CRIT = Object.freeze({
  QS1: { minExitS: 0.45, why: "[E] ≥ start-up 0.10 s + 2 × loop delay: the open-loop body stays inside the standing envelope long enough for a delayed loop to act" },
  QS2: { minEfoldS: 0.175, why: "[E] λ·τ ≤ 1 (margin √2 on the delayed-PD stabilisability limit λτ < √2, Stépán): the departure must be catchable by a 175 ms loop" },
  QS3: { maxExitS: 4.0, why: "[M] passive + fixed tone cannot stand (every primary source): the body must leave the envelope; 4 s = 1.5 × the slowest human-equivalent estimate" },
  I1a: "ankle K/mgh at the end of the 41.7 ms ramp within [0.5, 1.5] × Vlutters 2015 at the measured angle, all 5 amplitudes",
  I1b: "ankle K/mgh at 71 ms within [0.5, 1.5] × Sakanaka 2021 at the measured angle, every amplitude with angle ≤ 1.0°",
  I2: "knee elastic stiffness at 100 ms ≥ 17 N·m/rad (small amplitude, both signs)",
  I3: "hip elastic stiffness at 100 ms within [30, 91] N·m/rad (small amplitude, both signs)",
  S1: { maxDropMm: 5, maxComFrac: 0.5, why: "[D] not a floppy ragdoll: no collapse (relative pelvis drop ≤ 5 mm) and bounded sway (relative COM displacement at 300 ms ≤ ½ the COM-to-edge margin)" },
  S2: { minDevDeg: 0.2, why: "[D] not a rigid mannequin: a measurable joint deflection somewhere between pelvis and ground" },
  S3: { maxSettleRatio: 1.0, why: "[D] the joint-level transient decays: RMS relative joint speed 200–300 ms ≤ that at 50–150 ms" },
  S4: "no loss of no-step balance within 300 ms (XcoM inside the base of support, both feet loaded)",
  M1: { growth: 1.3, minDevDeg: 1.0, minComMm: 15, why: "[D] substantial sway / yield: larger than small (×1.3 for ×1.6 impulse) and ≥ 1° or ≥ 15 mm COM" },
  M2: "no loss of no-step balance within 300 ms",
  L1: "loss of no-step balance within 300 ms",
  C1: "per direction: COM displacement at 300 ms and max joint deflection strictly increase small < moderate < large",
  R1: "no growing oscillation after release (successive alternating extrema about the final value ≤ 1.05 × the previous)",
  R2: { minZeta: 0.05, why: "[D] not undamped where an oscillation (≥ 2 alternating extrema) is measurable" },
  E1: { floorJ: 1.0, frac: 0.05, why: "[S] energy ledger closes where the feet stay planted: |Σ residual| ≤ 1 J + 5 % of |external work| (T1 from t0 to exit; small and moderate T2 to 300 ms). The ledger has no turf-contact term, so foot impacts and sliding (start-up, large pushes) appear as residual: reported, not judged" },
  INT1: { maxTransientMm: 5, why: "[S] V2 G1 spec 1.3a" }, INT2: { maxRestMm: 1, why: "[S] V2 G1 spec 1.3c (at t0 in T1 and at 300 ms after small pushes)" },
  DET: "bit-identical reruns (standing 240 steps, moderate forward push)",
});
export function evaluate(Q) { const res = {}, put = (id, pass, value) => { res[id] = { pass: !!pass, value }; };
  const T1 = Q.T1; put("QS1", T1.exit && T1.exit.t >= CRIT.QS1.minExitS, T1.exit); put("QS2", T1.efoldS != null && T1.efoldS >= CRIT.QS2.minEfoldS, T1.efoldS);
  put("QS3", T1.exit && T1.exit.t <= CRIT.QS3.maxExitS, T1.exit ? T1.exit.t : null);
  const a = Q.T3.ankle.rows.map(r => ({ amp: r.ampDeg, endDeg: r.endRamp.ankleDeg, endK: r.endRamp.Kmgh, endRef: REF.ankleVlutters(r.endRamp.ankleDeg), d71: r.at71.ankleDeg, k71: r.at71.Kmgh, ref71: REF.ankleSakanaka(r.at71.ankleDeg) }));
  a.forEach(x => { x.endRatio = x.endK / x.endRef; x.ratio71 = x.k71 / x.ref71; });
  put("I1a", a.every(x => x.endRatio >= REF.band[0] && x.endRatio <= REF.band[1]), a.map(x => ({ deg: +x.endDeg.toFixed(2), K: +x.endK.toFixed(3), ref: +x.endRef.toFixed(3), ratio: +x.endRatio.toFixed(2) })));
  const a71 = a.filter(x => x.d71 <= 1.0); put("I1b", a71.length > 0 && a71.every(x => x.ratio71 >= REF.band[0] && x.ratio71 <= REF.band[1]), a71.map(x => ({ deg: +x.d71.toFixed(2), K: +x.k71.toFixed(3), ref: +x.ref71.toFixed(3), ratio: +x.ratio71.toFixed(2) })));
  const small = (j) => Q.T3.joints[j].rows.filter(r => r.ampRad === Q.battery.T3.amps[0]);
  put("I2", small("knee").every(r => r.at100.Kel >= REF.kneeMin), small("knee").map(r => ({ sign: r.sign, Kel: +r.at100.Kel.toFixed(1) })));
  put("I3", small("hip").every(r => r.at100.Kel >= REF.hipPerSide[0] && r.at100.Kel <= REF.hipPerSide[1]), small("hip").map(r => ({ sign: r.sign, Kel: +r.at100.Kel.toFixed(1) })));
  const R = Q.T2.runs, dirs = Object.keys(Q.battery.T2.dirs);
  for (const d of dirs) { const s = R[d + ".small"], m = R[d + ".moderate"], l = R[d + ".large"];
    put("S1." + d, s.pelvisDropMm <= CRIT.S1.maxDropMm && s.comRelEndMm / 1000 <= CRIT.S1.maxComFrac * s.marginT0, { dropMm: +s.pelvisDropMm.toFixed(2), comEndMm: +s.comRelEndMm.toFixed(1), marginMm: +(s.marginT0 * 1000).toFixed(1) });
    put("S2." + d, s.maxDev.deg >= CRIT.S2.minDevDeg, +s.maxDev.deg.toFixed(3)); put("S3." + d, s.settle.ratio <= CRIT.S3.maxSettleRatio, +s.settle.ratio.toFixed(3)); put("S4." + d, !s.loss, s.loss || +s.xcomMinMarginM.toFixed(3));
    put("M1." + d, m.maxDev.deg >= CRIT.M1.growth * s.maxDev.deg && (m.maxDev.deg >= CRIT.M1.minDevDeg || m.comRelEndMm >= CRIT.M1.minComMm), { devDeg: +m.maxDev.deg.toFixed(2), axis: m.maxDev.axis, comEndMm: +m.comRelEndMm.toFixed(1), smallDevDeg: +s.maxDev.deg.toFixed(2) });
    put("M2." + d, !m.loss, m.loss || +m.xcomMinMarginM.toFixed(3)); put("L1." + d, !!l.loss, l.loss || +l.xcomMinMarginM.toFixed(3));
    put("C1." + d, s.comRelEndMm < m.comRelEndMm && m.comRelEndMm < l.comRelEndMm && s.maxDev.deg < m.maxDev.deg && m.maxDev.deg < l.maxDev.deg, { comEndMm: [s, m, l].map(x => +x.comRelEndMm.toFixed(1)), devDeg: [s, m, l].map(x => +x.maxDev.deg.toFixed(2)) }); }
  put("R1", Q.T4.every(p => !p.growing), Q.T4.filter(p => p.growing).map(p => p.probe));
  const zs = Q.T4.filter(p => p.zeta != null); put("R2", zs.every(p => p.zeta >= CRIT.R2.minZeta), zs.map(p => ({ probe: p.probe, zeta: +p.zeta.toFixed(3) })));
  const leds = [["T1", T1.ledger], ...Object.entries(R).filter(([k]) => !k.endsWith(".large")).map(([k, v]) => [k, v.ledger])], bad = leds.filter(([, L]) => Math.abs(L.residualJ) > CRIT.E1.floorJ + CRIT.E1.frac * L.extWorkAbsJ);
  put("E1", bad.length === 0, { worst: leds.map(([k, L]) => [k, +L.residualJ.toFixed(3)]).sort((x, y) => Math.abs(y[1]) - Math.abs(x[1])).slice(0, 3), failing: bad.map(([k]) => k) });
  const sepT = Math.max(T1.ledger.sepMaxMm, ...Object.values(R).map(v => v.ledger.sepMaxMm)); put("INT1", sepT <= CRIT.INT1.maxTransientMm, +sepT.toFixed(3));
  const rest = [T1.restSepMm, ...dirs.map(d => R[d + ".small"].restSepEndMm)]; put("INT2", Math.max(...rest) <= CRIT.INT2.maxRestMm, rest.map(x => +x.toFixed(4)));
  const stops = [T1.stop, ...Object.entries(R).filter(([k]) => !k.endsWith(".large")).map(([, v]) => v.stop)].filter(Boolean); if (stops.length) res.INT1.pass = false, res.INT1.stops = stops;
  put("DET", Q.T7.identical, Q.T7);
  const ids = Object.keys(res), failed = ids.filter(k => !res[k].pass); return { label: Q.label, law: Q.law, pass: failed.length === 0, nPass: ids.length - failed.length, n: ids.length, failed, results: res };
}
if (process.argv[1] && process.argv[1].endsWith("ppr2_eval.mjs")) { const Q = JSON.parse(fs.readFileSync(arg("evidence"))), v = evaluate(Q);
  if (arg("out")) fs.writeFileSync(arg("out"), JSON.stringify({ criteria: CRIT, ...v }, null, 1));
  console.log(`${v.label}: ${v.pass ? "PASS" : "FAIL"} ${v.nPass}/${v.n}${v.failed.length ? " · failed: " + v.failed.join(", ") : ""}`);
  for (const [k, r] of Object.entries(v.results)) console.log(`  ${r.pass ? "✓" : "✗"} ${k.padEnd(9)} ${JSON.stringify(r.value).slice(0, 160)}`); }
