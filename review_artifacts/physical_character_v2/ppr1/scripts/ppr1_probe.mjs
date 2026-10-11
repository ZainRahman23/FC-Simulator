// PPR-1 joint probes (validation away from the tackle; read-only w.r.t. every record): the runner ALONE (scene SOLO: no tackler exists), standing
// in the PVP-1A-DX entry pose, receives an internal torque-pair STEP across one joint about one of its axes (+T on the child, −T on the parent: no
// net external impulse) from 100 ms for 200 ms, then release. Per probe: the joint's angle change Δθ(t), the actuator torque change Δτ_act(t) on
// that axis, the activation, and from them the instantaneous stiffness (Δτ_act / Δθ at the first steps), the 50 / 150 ms effective stiffness, the
// torque rise time (63 % / 90 % of the 200 ms value), the peak torque rate, the restoring-torque-vs-displacement curve and whether the joint
// returns, yields or keeps creeping. Graded magnitudes per joint (small / medium / large). Same probes for law A and law B. Every quantity is the
// probe run MINUS the same law's unprobed run (same entry, deterministic), so the law's own standing drift is removed.
// usage: V2_KNEE_MODEL=v2k node ppr1_probe.mjs --law A --fixture <PVP1A_FIXTURE.json> --out <json>
import fs from "fs";
const PL = await import(new URL("../../pvp1/scripts/pvp1a_lib.mjs", import.meta.url).href), { V, Q } = PL;
const { runOne } = await import(new URL("./ppr1_run.mjs", import.meta.url).href);
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
export const PROBES = Object.freeze([   // joint, axis key (anatomical), parent / child bodies, magnitudes (N·m), sign of the probe in the constraint parameter
  { joint: "ankle_R", axis: "df", parent: "shank_R", child: "foot_R", T: [5, 15, 40] }, { joint: "ankle_R", axis: "inv", parent: "shank_R", child: "foot_R", T: [3, 8, 20] },
  { joint: "knee_R", axis: "flex", parent: "thigh_R", child: "shank_R", T: [5, 15, 40] }, { joint: "hip_R", axis: "flex", parent: "pelvis", child: "thigh_R", T: [5, 15, 40] },
  { joint: "hip_R", axis: "abd", parent: "pelvis", child: "thigh_R", T: [5, 15, 40] }, { joint: "lumbar", axis: "flex", parent: "pelvis", child: "abdomen", T: [5, 15, 30] },
  { joint: "lumbar", axis: "lat", parent: "pelvis", child: "abdomen", T: [5, 15, 30] }, { joint: "shoulder_R", axis: "flex", parent: "thorax", child: "upperArm_R", T: [2, 5, 10] },
  { joint: "shoulder_R", axis: "abd", parent: "thorax", child: "upperArm_R", T: [2, 5, 10] }, { joint: "neck", axis: "flex", parent: "thorax", child: "head", T: [1, 2, 4] } ]);
export const PROBE_TIMING = Object.freeze({ settle: 24, hold: 48, after: 72, sign: [+1, -1] });   // steps of 1/240 s: onset at 100 ms, 200 ms step, 300 ms after release; both signs
// baseline: the same law, same entry, no probe (subtracted step by step so the inherent standing drift of the law is not read as the probe response)
const BASE = {}; async function baseline(FIX, law) { if (!BASE[law]) { const { settle, hold, after } = PROBE_TIMING; BASE[law] = await runOne({ fixtureObj: FIX, law, scene: "SOLO", steps: settle + hold + after, label: "probe baseline" }); } return BASE[law]; }
export async function probeOne(FIX, law, P, T, sgn) {
  const spec = PL.SPEC_R(), k = spec.joints.findIndex(j => j.name === P.joint), j = spec.joints[k], key = ["x", "y", "z"].find(q => j.def.axes[q] && j.def.axes[q].key === P.axis), i = ["x", "y", "z"].indexOf(key);
  // world axis of constraint axis i in the ENTRY pose (child frame · F2): the probe torque keeps that fixed world direction (an external couple pair)
  const E = FIX.write.runner.poses, axW = Q.rot(Q.mul(E[j.childIndex].rot, j.F2), [[1, 0, 0], [0, 1, 0], [0, 0, 1]][i]), Tw = V.sc(axW, sgn * T);
  const { settle, hold, after } = PROBE_TIMING, o = await runOne({ fixtureObj: FIX, law, scene: "SOLO", steps: settle + hold + after, perturb: [{ from: settle, to: settle + hold, pair: [P.parent, P.child], T: Tw }], label: `${P.joint}.${P.axis} ${sgn > 0 ? "+" : "−"}${T}` });
  const R = o.recs, Rb = (await baseline(FIX, law)).recs, row = (r) => (r.act || []).find(x => x[0] === k && x[1] === i);
  const ts = R.map((r, q) => { const a = row(r), b = row(Rb[q]); return { n: r.n, dth: r.chars.runner.th[k][i] - Rb[q].chars.runner.th[k][i], dtau: a[2] - b[2], a: Math.max(a[7], a[8]), sat: a[5] }; });   // probe run − baseline run, step by step
  const on = ts.filter(x => x.n > settle && x.n <= settle + hold), at = (ms) => on[Math.min(on.length - 1, Math.round(ms / (1000 / 240)) - 1)];
  const end = on[on.length - 1], rise = (f) => { const v = on.findIndex(x => Math.abs(x.dtau) >= f * Math.abs(end.dtau)); return v < 0 ? null : (v + 1) * 1000 / 240; };
  let rate = 0; for (let q = 1; q < on.length; q++) rate = Math.max(rate, Math.abs(on[q].dtau - on[q - 1].dtau) * 240);
  const Kat = (x) => (Math.abs(x.dth) > 1e-6 ? -x.dtau / x.dth : null), rel = ts.filter(x => x.n > settle + hold), back = rel.length ? rel[rel.length - 1] : null;
  // least-squares fit over the hold: Δτ_act = −K·Δθ − D·Δω (Δω by central differences): the EFFECTIVE stiffness and damping the joint shows
  // fit over the first 120 ms of the hold only (before any 125 ms-delayed response can act)
  const H = 1 / 240, NF = Math.min(on.length - 1, 29), fit = (() => { let a11 = 0, a12 = 0, a22 = 0, b1 = 0, b2 = 0; for (let q = 1; q < NF; q++) { const th = on[q].dth, om = (on[q + 1].dth - on[q - 1].dth) / (2 * H), y = -on[q].dtau;
      a11 += th * th; a12 += th * om; a22 += om * om; b1 += th * y; b2 += om * y; } const det = a11 * a22 - a12 * a12; if (Math.abs(det) < 1e-18) return null;
    const K = (b1 * a22 - b2 * a12) / det, D = (a11 * b2 - a12 * b1) / det; let ss = 0, st2 = 0, my = 0, nn = 0; for (let q = 1; q < NF; q++) { my += -on[q].dtau; nn++; } my /= nn;
    for (let q = 1; q < NF; q++) { const th = on[q].dth, om = (on[q + 1].dth - on[q - 1].dth) / (2 * H), y = -on[q].dtau; ss += (y - K * th - D * om) ** 2; st2 += (y - my) ** 2; }
    const q50 = Math.min(on.length - 2, Math.round(0.05 * 240) - 1), om50 = (on[q50 + 1].dth - on[q50 - 1].dth) / (2 * H);
    return { K, D, r2: 1 - ss / Math.max(1e-18, st2), dampShareAt50ms: Math.abs(D * om50) / Math.max(1e-12, Math.abs(D * om50) + Math.abs(K * on[q50].dth)) }; })();
  return { joint: P.joint, axis: P.axis, T, sign: sgn, k, i, aEntry: Math.max(row(R[0])[7], row(R[0])[8]), fit,
    K1: Kat(on[0]), K10ms: Kat(at(10)), K50ms: Kat(at(50)), K150ms: Kat(at(150)), dthDeg: { at10: at(10).dth * 180 / Math.PI, at50: at(50).dth * 180 / Math.PI, at100: at(100).dth * 180 / Math.PI, at150: at(150).dth * 180 / Math.PI, end: end.dth * 180 / Math.PI, max: Math.max(...on.map(x => Math.abs(x.dth))) * 180 / Math.PI },
    dtau: { at10: at(10).dtau, at50: at(50).dtau, at150: at(150).dtau, end: end.dtau }, rise63ms: rise(0.63), rise90ms: rise(0.9), peakRateNmS: rate, aMax: Math.max(...on.map(x => x.a)), dAct30: Math.max(...ts.filter(x => x.n > settle && x.n <= settle + 30).map((x, q) => Math.abs(x.a - Math.max(row(Rb[x.n - 1])[7], row(Rb[x.n - 1])[8])))), satSteps: on.filter(x => x.sat).length,
    afterReleaseDeg: back ? back.dth * 180 / Math.PI : null, status: o.stop ? "STOP " + o.stop.reason : "ok", finalHash: o.finalHash, ts: ts.map(x => [x.n, +(x.dth * 180 / Math.PI).toFixed(4), +x.dtau.toFixed(3), +x.a.toFixed(4)]) }; }
if (process.argv[1] && process.argv[1].endsWith("ppr1_probe.mjs")) {
  const FIX = JSON.parse(fs.readFileSync(arg("fixture"))), law = arg("law", "A"), res = [];
  for (const P of PROBES) for (const T of P.T) for (const s of PROBE_TIMING.sign) { const r = await probeOne(FIX, law, P, T, s); res.push(r);
    console.log(`${law} ${(P.joint + "." + P.axis).padEnd(16)} ${s > 0 ? "+" : "−"}${String(T).padStart(2)} N·m: Δθ 10/50/150 ms ${r.dthDeg.at10.toFixed(2)}/${r.dthDeg.at50.toFixed(2)}/${r.dthDeg.at150.toFixed(2)}° · K1 ${r.K1?.toFixed(0)} K50 ${r.K50ms?.toFixed(0)} K150 ${r.K150ms?.toFixed(0)} N·m/rad · τ rise 63/90% ${r.rise63ms?.toFixed(0)}/${r.rise90ms?.toFixed(0)} ms · rate ${r.peakRateNmS.toFixed(0)} N·m/s · a ${r.aEntry.toFixed(3)}→${r.aMax.toFixed(3)} · after release ${r.afterReleaseDeg?.toFixed(2)}° · fit K ${r.fit?.K.toFixed(0)} D ${r.fit?.D.toFixed(1)} (R² ${r.fit?.r2.toFixed(3)}, damping share @50 ms ${(100 * (r.fit?.dampShareAt50ms ?? 0)).toFixed(0)} %) · ${r.status}`); }
  fs.writeFileSync(arg("out"), JSON.stringify({ tool: "ppr1_probe.mjs", law, probes: PROBES, timing: PROBE_TIMING, results: res })); }
