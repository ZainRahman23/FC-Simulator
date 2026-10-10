// RUN-1 → V2 handoff contract draft, READ-ONLY probe of RUN-1 (loaded through RUN-1's own loader; nothing in RUN-1 is written). Usage: [RUN1_WT=<locomotion-v2-run1 worktree>] node run1_probe_consistency.cjs
const path = require("path"), RUN1_WT = process.env.RUN1_WT || path.resolve(__dirname, "../../../../../../locomotion-v2-run1");
const { loadRun1 } = require(path.join(RUN1_WT, "sandbox/visual/run1/tools/run1_load.cjs"));
const X = loadRun1(), skel = X.charSkel("vinicius"), R3 = X.R3, M = 73, g = 9.81, D2R = Math.PI / 180;
const out = { run1Head: process.env.RUN1_COMMIT || "(working tree: " + RUN1_WT + ")", speeds: {} };
const MF = { pelvis: 0.1116, spine: 0.1614, chest: 0.1603, head: 0.0686, upperArm_R: 0.0268, upperArm_L: 0.0268, foreArm_R: 0.0220, foreArm_L: 0.0220, thigh_R: 0.1403, thigh_L: 0.1403, shin_R: 0.0438, shin_L: 0.0438, foot_R: 0.0161, foot_L: 0.0161 };
const bones = skel.bones, bi = Object.fromEntries(bones.map(b => [b.name, b.idx]));
for (const v of [3.0, 5.5, 7.8]) {
  const A = X.r1Make(skel), G = X.r1Prepare(A, v), p = G.p; G.accLean = 0; const T = p.T;
  const st = (t) => { const u = ((t / T) % 1 + 1) % 1, pose = X.r1Pose(G, u, null), fk = X.r1FK(G, pose, null); const P = fk.P.map(x => x.slice()), R = fk.R.map(x => x.slice());
    for (const q of P) q[2] += v * t;                                                // root advances along +z (straight run, closed form)
    const seg = {}; for (const n in MF) { const b = bones[bi[n]], tip = X.RV.add(P[b.idx], R3.v(R[b.idx], X.RV.sc(b.dir, b.len))); seg[n] = X.RV.sc(X.RV.add(P[b.idx], tip), 0.5); }
    let c = [0, 0, 0], ms = 0; for (const n in MF) { c = X.RV.add(c, X.RV.sc(seg[n], MF[n])); ms += MF[n]; } c = X.RV.sc(c, 1 / ms);
    return { u, pose, P, R, seg, c }; };
  // samples at (i + ½)/N of the stride: no difference stencil straddles a touchdown (u = 0 / 0.5), where between grid speeds the pose has a ~0.04 mm C0 step
  const h = 1e-5, h2 = 1e-4, N = 480; let rows = [];
  for (let i = 0; i < N; i++) { const t = T * (i + 0.5) / N, a = st(t - h), b = st(t), cc = st(t + h), am = st(t - h2), ap = st(t + h2);
    const vc = [0, 1, 2].map(k => (cc.c[k] - a.c[k]) / (2 * h)), ay = (ap.c[1] - 2 * b.c[1] + am.c[1]) / (h2 * h2);
    let L = [0, 0, 0]; for (const n in MF) { const m = MF[n] * M, r = X.RV.sub(b.seg[n], b.c), vs = [0, 1, 2].map(k => (cc.seg[n][k] - a.seg[n][k]) / (2 * h)), dv = X.RV.sub(vs, vc);
      L = X.RV.add(L, X.RV.sc([r[1] * dv[2] - r[2] * dv[1], r[2] * dv[0] - r[0] * dv[2], r[0] * dv[1] - r[1] * dv[0]], m)); }
    const legs = {}; for (const sd of ["R", "L"]) { const lg = b.pose.legs[sd]; const mtp = R3.angle(b.R[bi["foot_" + sd]], b.R[bi["toe_" + sd]]) / D2R;
      const vAnk = [0, 1, 2].map(k => (cc.P[bi["foot_" + sd]][k] - a.P[bi["foot_" + sd]][k]) / (2 * h)), vMtp = [0, 1, 2].map(k => (cc.P[bi["toe_" + sd]][k] - a.P[bi["toe_" + sd]][k]) / (2 * h));
      legs[sd] = { st: lg.st, s: lg.s, mtp, vAnk: Math.hypot(...vAnk), vMtp: Math.hypot(...vMtp) }; }
    rows.push({ t, u: b.u, vc, ay, L, legs, pelvisVy: (cc.P[bi.pelvis][1] - a.P[bi.pelvis][1]) / (2 * h) }); }
  const stance = rows.flatMap(r => ["R", "L"].filter(sd => r.legs[sd].st).map(sd => ({ ...r.legs[sd], r })));
  const flight = rows.filter(r => !r.legs.R.st && !r.legs.L.st);
  const cls = (q) => q.s < p.flatS ? "heelRoll" : q.s <= p.heelRiseS ? "flat" : q.mtp < 50 ? "heelUpMTP" : "toePad";
  const frac = {}; for (const q of stance) frac[cls(q)] = (frac[cls(q)] || 0) + 1; for (const k in frac) frac[k] = +(frac[k] / stance.length).toFixed(3);
  const rng = (f) => { const xs = rows.map(f); return [Math.min(...xs), Math.max(...xs)].map(x => +x.toFixed(4)); };
  const byCls = (k, f) => { const xs = stance.filter(q => cls(q) === k).map(f); return xs.length ? +Math.max(...xs).toFixed(4) : null; };
  out.speeds[v] = { cadenceStepsPerS: +(2 / T).toFixed(4), strideT: +T.toFixed(4), D: +p.D.toFixed(4), flightFracPerStride: +(flight.length / N).toFixed(4), flatS: p.flatS, heelRiseS: +p.heelRiseS.toFixed(4),
    stanceClassFrac: frac, mtpMaxDeg: +Math.max(...stance.map(q => q.mtp)).toFixed(2), stanceFracMtpOver5: +(stance.filter(q => q.mtp > 5).length / stance.length).toFixed(3), stanceFracMtpOver15: +(stance.filter(q => q.mtp > 15).length / stance.length).toFixed(3),
    rigidTipPenEstMaxMm: +(1000 * 0.0947 * Math.sin(Math.max(...stance.map(q => q.mtp)) * D2R)).toFixed(1),
    stanceAnkleSpeedMax: { heelRoll: byCls("heelRoll", q => q.vAnk), flat: byCls("flat", q => q.vAnk), heelUpMTP: byCls("heelUpMTP", q => q.vAnk), toePad: byCls("toePad", q => q.vAnk) },
    stanceMtpJointSpeedMax: { heelUpMTP: byCls("heelUpMTP", q => q.vMtp), toePad: byCls("toePad", q => q.vMtp) },
    comVzMinusV: rng(r => r.vc[2] - v), comVx: rng(r => r.vc[0]), comVy: rng(r => r.vc[1]), pelvisVy: rng(r => r.pelvisVy),
    momentumDevNs: rng(r => M * (r.vc[2] - v)),
    flightAyPlusG: flight.length ? [Math.min(...flight.map(r => r.ay + g)), Math.max(...flight.map(r => r.ay + g))].map(x => +x.toFixed(3)) : null,
    stanceMinVertForceBW: +Math.min(...rows.filter(r => r.legs.R.st || r.legs.L.st).map(r => (r.ay + g) / g)).toFixed(3), peakVertForceBW: +Math.max(...rows.map(r => (r.ay + g) / g)).toFixed(3),
    Lpointmass: { x: rng(r => r.L[0]), y: rng(r => r.L[1]), z: rng(r => r.L[2]) } };
}
// float32 quantization of r1Kinematics: identical motion at pitch x = 0 vs x = 100 m
{ const v = 5.5, vOf = () => v; const run = (x0) => { const A = X.r1Make(skel); return X.r1Kinematics(A, vOf, (t) => ({ x: x0 + v * t, y: 34, heading: 0, v }), 1.0); };
  const a = run(0), b = run(100); let dv = 0, dw = 0; for (let i = 0; i < a.joints.length; i++) { dv = Math.max(dv, Math.hypot(...[0, 1, 2].map(k => a.joints[i].vel[k] - b.joints[i].vel[k]))); dw = Math.max(dw, Math.hypot(...[0, 1, 2].map(k => a.joints[i].angVel[k] - b.joints[i].angVel[k]))); }
  out.r1KinematicsOffsetSensitivity = { at: "t=1.0 s, 5.5 m/s, pitch x 0 vs 100 m", maxJointVelDiffMs: +dv.toExponential(3), maxAngVelDiffRadS: +dw.toExponential(3), contactExport: a.contact }; }
console.log(JSON.stringify(out, null, 1));
