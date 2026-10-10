// run1/tools/run1_kinematics_check.cjs — the exported continuous state is consistent: joint velocities vs the 60 Hz rendered-frame finite
// difference (should agree to O(dt²)), the planted foot's contact velocity ≈ 0, and angular velocities finite and bounded.
const { loadRun1 } = require("./run1_load.cjs"); const X = loadRun1(), skel = X.charSkel("vinicius");
const vOf = (t) => 5.5, simAt = (t) => ({ x: 20 + 5.5 * t, y: 34, heading: 0, v: 5.5 });
const A = X.r1Make(skel); let worst = 0, maxW = 0, plantedV = 0;
for (let k = 30; k < 150; k++) { const t = k / 60, K = X.r1Kinematics(A, vOf, simAt, t), Kp = X.r1Kinematics(A, vOf, simAt, t + 1 / 240), Km = X.r1Kinematics(A, vOf, simAt, t - 1 / 240);
  for (let i = 0; i < K.joints.length; i++) { const fd = [0, 1, 2].map(c => (Kp.joints[i].world[12 + c] - Km.joints[i].world[12 + c]) * 120); worst = Math.max(worst, Math.hypot(...fd.map((x, c) => x - K.joints[i].vel[c]))); maxW = Math.max(maxW, Math.hypot(...K.joints[i].angVel)); }
  for (const sd of ["R", "L"]) if (K.contact[sd].stance && K.contact[sd].s > 0.2 && K.contact[sd].s < 0.4) { const j = K.joints.find(q => q.name === "foot_" + sd); plantedV = Math.max(plantedV, Math.hypot(...j.vel)); } }
console.log(`exported joint velocity vs 240 Hz central difference: max |Δ| ${worst.toFixed(4)} m/s · max joint angular speed ${maxW.toFixed(1)} rad/s · flat-foot ankle speed while planted ${plantedV.toExponential(2)} m/s`);
