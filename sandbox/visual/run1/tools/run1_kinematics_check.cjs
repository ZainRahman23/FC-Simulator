// run1/tools/run1_kinematics_check.cjs — the exported continuous state is consistent: joint velocities vs the 60 Hz rendered-frame finite
// difference (should agree to O(dt²)), the planted foot's contact velocity ≈ 0 (sampled in the flat-foot window, 13–20 % of stance in RUN-1.1: the heel rolls up from 24 %), and angular velocities finite and bounded.
// usage: node run1_kinematics_check.cjs [--v 5.5]   (the planted window is the flat-foot part of that speed's stance: flatS … heelRiseS)
const { loadRun1 } = require("./run1_load.cjs"); const X = loadRun1(), skel = X.charSkel("vinicius");
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; }, V = +arg("v", 5.5);
const vOf = (t) => V, simAt = (t) => ({ x: 20 + V * t, y: 34, heading: 0, v: V });
const P0 = X.r1Prepare(X.r1Make(skel), V).p, S0 = P0.flatS + 0.01, S1 = P0.heelRiseS - 0.005;
const A = X.r1Make(skel); let worst = 0, maxW = 0, plantedV = 0;
for (let k = 30; k < 150; k++) { const t = k / 60, K = X.r1Kinematics(A, vOf, simAt, t), Kp = X.r1Kinematics(A, vOf, simAt, t + 1 / 240), Km = X.r1Kinematics(A, vOf, simAt, t - 1 / 240);
  for (let i = 0; i < K.joints.length; i++) { const fd = [0, 1, 2].map(c => (Kp.joints[i].world[12 + c] - Km.joints[i].world[12 + c]) * 120); worst = Math.max(worst, Math.hypot(...fd.map((x, c) => x - K.joints[i].vel[c]))); maxW = Math.max(maxW, Math.hypot(...K.joints[i].angVel)); }
  for (const sd of ["R", "L"]) if (K.contact[sd].stance && K.contact[sd].s > S0 && K.contact[sd].s < S1) { const j = K.joints.find(q => q.name === "foot_" + sd); plantedV = Math.max(plantedV, Math.hypot(...j.vel)); } }
console.log(`${V} m/s (planted window s ${S0.toFixed(3)}–${S1.toFixed(3)}): exported joint velocity vs 240 Hz central difference: max |Δ| ${worst.toFixed(4)} m/s · max joint angular speed ${maxW.toFixed(1)} rad/s · flat-foot ankle speed while planted ${plantedV.toExponential(2)} m/s`);
