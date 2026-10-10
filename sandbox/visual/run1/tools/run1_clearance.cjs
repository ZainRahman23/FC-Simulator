// run1/tools/run1_clearance.cjs — inter-leg clearance: the swing leg's ankle / MTP / toe tip against the stance leg's thigh and shank bone
// lines over one stride, and knee-to-knee distance, at the anchor speeds (bone-line distances; the shin capsule radius is ~5.6 cm and the boot
// half-width ~4–7 cm, so < ~10 cm reads as clipping in close views). Also the swing boot's lowest point above the stud plane.
const { loadRun1 } = require("./run1_load.cjs");
const X = loadRun1(), skel = X.charSkel("vinicius"), B = skel.byName;
const seg = (p, a, b) => { const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], ap = [p[0] - a[0], p[1] - a[1], p[2] - a[2]]; const t = Math.max(0, Math.min(1, (ab[0] * ap[0] + ab[1] * ap[1] + ab[2] * ap[2]) / (ab[0] ** 2 + ab[1] ** 2 + ab[2] ** 2))); return Math.hypot(ap[0] - ab[0] * t, ap[1] - ab[1] * t, ap[2] - ab[2] * t); };
for (const v of [3.0, 4.2, 5.5, 7.0, 7.8]) {
  const A = X.r1Make(skel), G = X.r1Prepare(A, v); let foot = 1e9, knees = 1e9, at = 0;
  for (let i = 0; i < 800; i++) { const u = i / 800, pose = X.r1Pose(G, u), fk = X.r1FK(G, pose, null), P = fk.P;
    knees = Math.min(knees, Math.hypot(...[0, 1, 2].map(k => P[B.shin_R.idx][k] - P[B.shin_L.idx][k])));
    for (const [sw, st] of [["R", "L"], ["L", "R"]]) { if (pose.legs[sw].st) continue;
      for (const pt of [P[B["foot_" + sw].idx], P[B["toe_" + sw].idx], fk.tip[B["toe_" + sw].idx]]) { const d = Math.min(seg(pt, P[B["shin_" + st].idx], P[B["foot_" + st].idx]), seg(pt, P[B["thigh_" + st].idx], P[B["shin_" + st].idx])); if (d < foot) { foot = d; at = u; } } } }
  console.log(`${v.toFixed(1)} m/s: swing foot ↔ stance leg ${(foot * 100).toFixed(1)} cm (at phase ${at.toFixed(3)}) · knee ↔ knee ${(knees * 100).toFixed(1)} cm`);
}
