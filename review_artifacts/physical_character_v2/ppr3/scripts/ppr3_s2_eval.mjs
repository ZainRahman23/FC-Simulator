// PPR-3 S2 frozen criteria (PPR3_S2_PREREGISTRATION.md §4) applied to one evidence file from ppr3_s2_qualify.mjs → verdict JSON.
// Labels: [M] measured human value, [E] derived from measured values, [D] design threshold, [S] V2 specification, [LIT-MODEL] literature model.
// usage: node ppr3_s2_eval.mjs --evidence <Q.json> --out <verdict.json>
import fs from "fs";
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
export const REF = Object.freeze({
  vlutters: (deg) => 0.93 * Math.pow(deg / 0.29, -0.271), sakanaka: (deg) => 0.94 * Math.pow(deg / 0.2, -0.321), band: [0.5, 1.5],
  ankleQuasi: [0.13, 0.75], hipQuasi: [24, 111], kneeQuasiMin: 17, lumbarFlexFast: [55, 164], lumbarLatFastMin: 55,
  ecc: { 100: [0.25, 0.60], 300: [0.15, 0.45], 1000: [0.08, 0.35] },
});
export const CRIT = Object.freeze({
  E1: "[D] entry load: steps 1–4 within ±10 % of body weight, steps 5–60 within ±1 %",
  E2: "[S] entry: turf penetration ≤ 1 mm and joint separation ≤ 1 mm over the first 250 ms",
  E3: "[D] entry: centre of pressure within 5 mm of the COM ground projection from step 5 (static equilibrium consistent)",
  E4: "[D] entry: over 250 ms pelvis vertical change ≤ 1 mm, COM horizontal ≤ 2 mm, max key-axis drift ≤ 0.5° (no start-up transient)",
  I1a: "[M/E] ankle K/mgh at the end of the 41.7 ms ramp (ankle intrinsic window 40 ms) within [0.5, 1.5] × Vlutters 2015, all 5 amplitudes",
  I1b: "[M/E] ankle K/mgh at 71 ms within [0.5, 1.5] × Sakanaka 2021 for sub-degree rotations (no stretch reflex at sway size, Loram & Lakie 2002)",
  I2: "[M/E] ankle quasi-static (held, 1 s) K/mgh within [0.13 (relaxed passive, Loram 2007a), 0.75 (1.5 × Kiemel 2008 intrinsic ≈ 0.5)]",
  I3: "[M/E] hip quasi-static (held, 1 s) per side within [24, 111] N·m/rad (Kiemel 2008 intrinsic 95–147 both hips → 48–74 per hip × [0.5, 1.5])",
  I4: "[E] knee quasi-static (held, 1 s) ≥ 17 N·m/rad (Riener & Edrich passive at 14°; lower bound only)",
  I5: "[M/E] lumbar flexion fast (29 ms, trunk window 30 ms) elastic stiffness within [55, 164] N·m/rad (Brown & McGill 2009 intrinsic 109 × [0.5, 1.5])",
  I6: "[M/E] lumbar lateral fast elastic stiffness ≥ 55 N·m/rad (Brown & McGill 2009: lateral ≥ flexion at every level; lower bound only)",
  P1: "[D] small pushes (4 directions): no key axis yields within the 30 ms intrinsic window, and some key axis deflects ≥ 0.01° (resisted but compliant)",
  P2: "[D] continuum: max key-axis deflection at 30 ms strictly increases small < moderate < large in every direction",
  R1: "[D] release: no growing oscillation", R2: "[D] release: ζ ≥ 0.05 where an oscillation is measurable",
  C1: "[LIT-MODEL] eccentric hold (near-step 1° held stretch of the tonically active side): fraction of the stretch-induced strain torque remaining at 100 / 300 / 1000 ms within [0.25, 0.60] / [0.15, 0.45] / [0.08, 0.35] (ECCENTRIC_PERSISTENCE_DAMPING_LITERATURE §recommendation), ankle, knee, hip",
  INT: "[S] joint separation ≤ 5 mm in every push run; no non-finite / speed stop in small and moderate pushes",
  DET: "[S] bit-identical reruns (240-step standing, moderate forward push)",
});
export function evaluate(Q) { const res = {}, put = (id, pass, value) => { res[id] = { pass: !!pass, value }; }, E = Q.E, BW = E.bodyWeightN;
  put("E1", E.feetN.first4.every(f => Math.abs(f - BW) <= 0.1 * BW) && Math.abs(E.feetN.after4.min - BW) <= 0.01 * BW && Math.abs(E.feetN.after4.max - BW) <= 0.01 * BW, E.feetN);
  put("E2", E.turfPenMaxMm <= 1 && E.sepMaxMm <= 1, { pen: E.turfPenMaxMm, sep: E.sepMaxMm }); put("E3", E.copComOffsetMm.max <= 5, E.copComOffsetMm);
  put("E4", Math.abs(E.pelvisDropMm) <= 1 && E.comHorizMm <= 2 && E.maxJointDriftDeg <= 0.5, { pelvisDropMm: E.pelvisDropMm, comHorizMm: E.comHorizMm, maxJointDriftDeg: E.maxJointDriftDeg });
  const A = Q.I.ankle.map(r => ({ amp: r.ampDeg, d: r.endRamp.ankleDeg, K: r.endRamp.Kmgh, ratio: r.endRamp.Kmgh / REF.vlutters(r.endRamp.ankleDeg), d71: r.at71.ankleDeg, K71: r.at71.Kmgh, r71: r.at71.Kmgh / REF.sakanaka(r.at71.ankleDeg) }));
  put("I1a", A.every(x => x.ratio >= REF.band[0] && x.ratio <= REF.band[1]), A.map(x => ({ deg: +x.d.toFixed(2), K: +x.K.toFixed(3), ratio: +x.ratio.toFixed(2) })));
  const a71 = A.filter(x => x.d71 <= 1.0); put("I1b", a71.length > 0 && a71.every(x => x.r71 >= REF.band[0] && x.r71 <= REF.band[1]), a71.map(x => ({ deg: +x.d71.toFixed(2), K: +x.K71.toFixed(3), ratio: +x.r71.toFixed(2) })));
  const qs = Q.I.quasi, q1 = (name) => qs ? qs[name].rows.map(r => r.read.find(x => x.ms === 1000).K) : null;
  if (qs) { const ak = q1("ankle").map(k => 2 * k / 647.2); put("I2", ak.every(v => v >= REF.ankleQuasi[0] && v <= REF.ankleQuasi[1]), ak.map(v => +v.toFixed(3)));
    put("I3", q1("hip").every(v => v >= REF.hipQuasi[0] && v <= REF.hipQuasi[1]), q1("hip").map(v => +v.toFixed(1))); put("I4", q1("knee").every(v => v >= REF.kneeQuasiMin), q1("knee").map(v => +v.toFixed(1))); }
  const fk = (name) => Q.I.fast[name].rows.map(r => r.at["29.2"].Kel);
  put("I5", fk("lumbarFlex").every(v => v >= REF.lumbarFlexFast[0] && v <= REF.lumbarFlexFast[1]), fk("lumbarFlex").map(v => +v.toFixed(1))); put("I6", fk("lumbarLat").every(v => v >= REF.lumbarLatFastMin), fk("lumbarLat").map(v => +v.toFixed(1)));
  const P = Q.P.runs, dirs = ["fwd", "back", "left", "right"];
  put("P1", dirs.every(d => P[d + ".small"].yieldInWindow.length === 0 && P[d + ".small"].judge.dev.deg >= 0.01), Object.fromEntries(dirs.map(d => [d, { dev: +P[d + ".small"].judge.dev.deg.toFixed(3), axis: P[d + ".small"].judge.dev.axis, yields: P[d + ".small"].yieldInWindow }])));
  put("P2", dirs.every(d => P[d + ".small"].judge.dev.deg < P[d + ".moderate"].judge.dev.deg && P[d + ".moderate"].judge.dev.deg < P[d + ".large"].judge.dev.deg), Object.fromEntries(dirs.map(d => [d, ["small", "moderate", "large"].map(m => +P[d + "." + m].judge.dev.deg.toFixed(3))])));
  put("R1", Q.R.every(p => !p.growing), Q.R.filter(p => p.growing).map(p => p.probe)); const zs = Q.R.filter(p => p.zeta != null); put("R2", zs.every(p => p.zeta >= 0.05), zs.map(p => ({ probe: p.probe, zeta: +p.zeta.toFixed(3) })));
  if (Q.C) put("C1", Object.values(Q.C).every(c => Object.entries(REF.ecc).every(([ms, [lo, hi]]) => c.fraction[ms] >= lo && c.fraction[ms] <= hi)), Object.fromEntries(Object.entries(Q.C).map(([n, c]) => [n, Object.fromEntries(Object.entries(c.fraction).map(([ms, f]) => [ms, +f.toFixed(3)]))])));
  const stops = Object.entries(P).filter(([k, v]) => !k.endsWith(".large") && v.stop); put("INT", Object.values(P).every(v => v.sepMax <= 5) && stops.length === 0, { sepMax: +Math.max(...Object.values(P).map(v => v.sepMax)).toFixed(3), stops: stops.map(([k]) => k) });
  put("DET", Q.D.identical, Q.D);
  const ids = Object.keys(res), failed = ids.filter(k => !res[k].pass); return { label: Q.label, cond: Q.cond, pass: failed.length === 0, nPass: ids.length - failed.length, n: ids.length, failed, results: res, openLoop: Q.openLoop.exit }; }
if (process.argv[1] && process.argv[1].endsWith("ppr3_s2_eval.mjs")) { const Q = JSON.parse(fs.readFileSync(arg("evidence"))), v = evaluate(Q);
  if (arg("out")) fs.writeFileSync(arg("out"), JSON.stringify({ criteria: CRIT, ref: { ...REF, vlutters: "0.93·(θ/0.29°)^−0.271", sakanaka: "0.94·(θ/0.2°)^−0.321" }, ...v }, null, 1));
  console.log(`${v.label}: ${v.pass ? "PASS" : "FAIL"} ${v.nPass}/${v.n}${v.failed.length ? " · failed: " + v.failed.join(", ") : ""} · open-loop exit ${JSON.stringify(v.openLoop)}`);
  for (const [k, r] of Object.entries(v.results)) console.log(`  ${r.pass ? "✓" : "✗"} ${k.padEnd(5)} ${JSON.stringify(r.value).slice(0, 170)}`); }
