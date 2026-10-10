// run1/tools/run1_limits.cjs — joint ranges over one stride against the V2 planning box (hard − 5°; physchar2/spec/v2_joints.js @ 15b0d5c6)
// Channels are RUN-1's own (anatomical sense): hip flexion in the leg plane, hip abduction (+) / adduction (−), hip rotation (internal +,
// leg yaw relative to the pelvis), knee flexion, ankle dorsiflexion (+), ankle inversion (approx. from the foot roll), MTP dorsiflexion,
// lumbar / thoracic axial rotation, elbow flexion, shoulder flexion.
const { loadRun1 } = require("./run1_load.cjs"); const X = loadRun1(), D = 180 / Math.PI, skel = X.charSkel("vinicius");
const LIM = X.R1_LIMITS, rows = {};
const add = (k, v) => { const r = rows[k] || (rows[k] = { min: 1e9, max: -1e9 }); r.min = Math.min(r.min, v); r.max = Math.max(r.max, v); };
for (const v of [3.0, 5.5, 7.8]) { const A = X.r1Make(skel), G = X.r1Prepare(A, v);
  for (let i = 0; i < 400; i++) { const pose = X.r1Pose(G, i / 400);
    for (const sd of ["R"]) { const c = pose.legs[sd].ch, side = 1;
      add("hipFlex", c.h * D); add("hipAbd", side * c.a * D); add("hipRot", -side * c.psi * D); add("knee", c.k * D); add("ankleDF", -c.fp * D); add("ankleInv", side * c.fr * D); add("mtpDF", -c.toe * D); }
    const yx = (R) => X.R3.toYXZ(R);
    add("lumbarAxial", yx(pose.rot.spine)[0] * D); add("thoracicAxial", yx(pose.rot.chest)[0] * D);
    const fa = yx(pose.rot.foreArm_R); add("elbow", -fa[1] * D);
    const ua = pose.rot.upperArm_R, dir = X.R3.v(ua, [0, -1, 0]); add("shoulderFlex", Math.atan2(dir[2], -dir[1]) * D); } }
const box = { hipFlex: LIM.hipFlex, hipAbd: LIM.hipAbd, hipRot: LIM.hipRot, knee: LIM.knee, ankleDF: LIM.ankleDF, ankleInv: LIM.ankleInv, mtpDF: LIM.mtpDF, lumbarAxial: LIM.lumbarAxial, thoracicAxial: LIM.thoracicAxial, elbow: LIM.elbow, shoulderFlex: LIM.shoulderFlex };
console.log("channel         RUN-1 range (3.0–7.8 m/s)    V2 planning box     inside");
for (const k in box) { const r = rows[k], b = box[k], ok = r.min >= b[0] - 1e-9 && r.max <= b[1] + 1e-9; console.log(`${k.padEnd(15)} ${r.min.toFixed(1).padStart(7)} … ${r.max.toFixed(1).padEnd(8)}          ${String(b[0]).padStart(4)} … ${String(b[1]).padEnd(5)}      ${ok ? "yes" : "NO"}`); }
