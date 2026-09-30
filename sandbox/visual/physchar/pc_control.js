// ═══ physchar/pc_control.js — GATE B: joint-space TARGETS → finite-strength MOTOR requests (engine-agnostic data + deterministic maths) ═══
// The chain is: authored key poses → joint-space targets (each joint's own constraint coordinates) → a finite motor per joint (Jolt's
// integrated constraint motor, see pc_jolt.js setMotor) → the solver, together with contacts / limits / inertia → the solved bodies → render.
// A target is a REQUEST: it is never written into a body. The bodies are only ever moved by the solver.
//
// Determinism: everything here that feeds a target uses + − × ÷ √ and the deterministic dsin / dcos / dtan of pc_math (Gate A lesson:
// Math.sin differs between Node and Chrome). Math.atan2 / acos appear only in MEASUREMENT (error angles), never in a target.
import { V, Q, rad, dtan } from "./pc_math.js";
import { shapeLowestY } from "./pc_body.js";

// ── joint-space representation ───────────────────────────────────────────────────────────────────────────────────────────────────
// SixDOF target = the rotation in the joint's constraint space q_cs (Jolt GetRotationInConstraintSpace convention: body-2 frame relative to
// body-1 frame, X = twist axis), built from { t, y, z } degrees exactly as the Gate A joint parameters (swing Y/Z as tan-half-angle pyramid
// components, then twist about X). Hinge target = angle (rad), > 0 = flexion.
export function paramTarget(j, p) {
  if (j.type === "hinge") return rad((p && p.a) || 0);
  const qt = Q.axis([1, 0, 0], rad((p && p.t) || 0)), qs = Q.norm([0, dtan(rad((p && p.y) || 0) / 2), dtan(rad((p && p.z) || 0) / 2), 1]);
  return Q.norm(Q.mul(qs, qt));
}
const Cof = (j) => Q.fromAxes(j.X, j.Y, j.Z);
// constraint-space target → the child's rotation relative to its parent (parent frame = world at bind)
export function relOf(j, t) { if (j.type === "hinge") return Q.axis(j.axis, t); const C = Cof(j); return Q.mul(Q.mul(C, t), Q.conj(C)); }
export function csOfRel(j, rel) { const C = Cof(j); return Q.norm(Q.mul(Q.mul(Q.conj(C), rel), C)); }
// forward kinematics of a target pose: root transform + per-joint targets → per-body { pos (origin), rot }
export function fk(spec, rootPos, rootRot, T) {
  const S = spec.bodies.map(() => null); S[0] = { pos: rootPos.slice(), rot: rootRot.slice() };
  spec.joints.forEach((j, k) => { const P = S[j.parentIndex], pb = spec.bodies[j.parentIndex], cb = spec.bodies[j.childIndex];
    S[j.childIndex] = { pos: V.add(P.pos, Q.rot(P.rot, V.sub(cb.origin, pb.origin))), rot: Q.norm(Q.mul(P.rot, relOf(j, T[k]))) }; });
  return S;
}
export const comOf = (spec, S) => { let c = [0, 0, 0]; spec.bodies.forEach((b, i) => { c = V.add(c, V.sc(V.add(S[i].pos, Q.rot(S[i].rot, b.com)), b.mass)); }); return V.sc(c, 1 / spec.totalMass); };
// shortest-path angular error between two constraint-space rotations (rad) — measurement only
export function errAngle(j, target, actual) {
  if (j.type === "hinge") return Math.abs(actual - target);
  let d = Q.mul(Q.conj(target), actual); if (d[3] < 0) d = d.map(x => -x);
  return 2 * Math.atan2(Math.sqrt(d[0] * d[0] + d[1] * d[1] + d[2] * d[2]), d[3]);
}

// ── key poses: authored joint params + a stance rule; the ROOT (pelvis) placement is derived, not authored ─────────────────────────────
// Sign conventions (pc_body JOINT_DEFS): trunk/neck swingY > 0 = flexion (forward); hips/shoulders swingY < 0 = FLEXION (forward);
// ankles swingY > 0 = plantarflexion; swingZ > 0 moves a hanging segment toward the player's right (+x). rootPitch > 0 = forward lean.
export const POSES = {
  RELAXED: { title: "passive-like start (Gate A drop A pose)", stance: "both", rootPitch: 0,
    j: { knee_L: { a: 4 }, knee_R: { a: 4 }, elbow_L: { a: 12 }, elbow_R: { a: 12 }, shoulder_L: { z: -8 }, shoulder_R: { z: 8 }, hip_L: { y: -4 }, hip_R: { y: -4 } } },
  N: { title: "neutral athletic stance", stance: "both", rootPitch: 2,
    j: { hip_L: { y: -8 }, hip_R: { y: -8 }, knee_L: { a: 14 }, knee_R: { a: 14 }, lumbar: { y: 2 }, shoulder_L: { y: -8, z: -12 }, shoulder_R: { y: -8, z: 12 }, elbow_L: { a: 20 }, elbow_R: { a: 20 } } },
  K: { title: "right knee raise (hip + knee flexion, trunk lean, counter-arms)", stance: "L", rootPitch: 8,
    j: { hip_L: { y: -12 }, knee_L: { a: 18 }, hip_R: { y: -75, z: -4 }, knee_R: { a: 95 }, ankle_R: { y: 15 },
         lumbar: { y: 8 }, thoracic: { y: 6 }, neck: { y: -12 },
         shoulder_L: { y: -45, z: -12 }, elbow_L: { a: 85 }, shoulder_R: { y: 30, z: 14 }, elbow_R: { a: 55 } } },
  BACKSWING: { title: "right leg back-swing (hip extension, deep knee flexion), arms swapped", stance: "L", rootPitch: 5,
    j: { hip_L: { y: -12 }, knee_L: { a: 18 }, hip_R: { y: 22, z: -4 }, knee_R: { a: 100 }, ankle_R: { y: 30 },
         lumbar: { y: 5 }, thoracic: { y: 3 }, neck: { y: -6 },
         shoulder_L: { y: 25, z: -14 }, elbow_L: { a: 40 }, shoulder_R: { y: -40, z: 12 }, elbow_R: { a: 75 } } },
  REACH: { title: "right leg forward reach (hip flexion, knee almost straight)", stance: "L", rootPitch: 4,
    j: { hip_L: { y: -14 }, knee_L: { a: 20 }, hip_R: { y: -60, z: -2 }, knee_R: { a: 6 }, ankle_R: { y: 8 },
         lumbar: { y: 4 }, thoracic: { y: 2 }, neck: { y: -6 },
         shoulder_L: { y: -30, z: -14 }, elbow_L: { a: 55 }, shoulder_R: { y: 20, z: 16 }, elbow_R: { a: 40 } } },
};
const bi = (spec, n) => spec.bodies.findIndex(b => b.name === n), ji = (spec, n) => spec.joints.findIndex(j => j.name === n);
const footCenter = (spec, S, side) => { const f = bi(spec, "foot_" + side), sh = spec.bodies[f].shapes[0]; return V.add(S[f].pos, Q.rot(S[f].rot, sh.pos)); };
const lowestFoot = (spec, S, side) => { const f = bi(spec, "foot_" + side); return shapeLowestY(spec.bodies[f].shapes[0], S[f].pos, S[f].rot); };
// stance-foot-consistent pose: the stance foot (or both) is FLAT on the turf at a fixed place; single stance also puts the whole-body COM
// over the stance foot (bisection on the stance hip's ab/adduction and flexion). The ankle targets of stance feet are solved (foot flat);
// the root follows from the stance foot. This is AUTHORING (kinematic consistency of a request); the physics never sees it as a constraint.
export function buildPose(spec, key, footHome) {
  const P = POSES[key], params = JSON.parse(JSON.stringify(P.j)), rootRot = Q.axis([1, 0, 0], rad(P.rootPitch || 0));
  const sides = P.stance === "both" ? ["L", "R"] : [P.stance];
  const solve = () => {
    const T = spec.joints.map(j => paramTarget(j, params[j.name]));
    let S = fk(spec, spec.bodies[0].origin, rootRot, T);
    for (const s of sides) { const k = ji(spec, "ankle_" + s), j = spec.joints[k], shin = S[j.parentIndex].rot; T[k] = csOfRel(j, Q.conj(shin)); }  // foot rot = identity
    S = fk(spec, spec.bodies[0].origin, rootRot, T);
    // root: the (first) stance foot's ORIGIN goes to its home place; for double stance the height puts the lower sole on the turf
    const s0 = sides[0], f0 = bi(spec, "foot_" + s0), shift = footHome ? V.sub(footHome[s0], S[f0].pos) : [0, -Math.min(...sides.map(s => lowestFoot(spec, S, s))) + 0.0005, 0];
    const rootPos = V.add(spec.bodies[0].origin, shift); S = fk(spec, rootPos, rootRot, T);
    return { T, S, rootPos, rootRot };
  };
  let R = solve();
  if (P.stance !== "both") {
    const s = P.stance, hip = "hip_" + s, base = Object.assign({ y: 0, z: 0 }, params[hip]);
    const bis = (axis, lo, hi, f) => { for (let it = 0; it < 40; it++) { const mid = (lo + hi) / 2; params[hip] = Object.assign({}, params[hip], { [axis]: mid }); const v = f(solve()); if (v > 0) hi = mid; else lo = mid; }
      params[hip] = Object.assign({}, params[hip], { [axis]: (lo + hi) / 2 }); };
    for (let round = 0; round < 4; round++) {
      // lateral: COM x − stance-foot-centre x as a function of hip swingZ (monotonic over ±25° around the authored value)
      const gx = (r) => comOf(spec, r.S)[0] - footCenter(spec, r.S, s)[0], sgnX = Math.sign(gx(solveWith(params, hip, "z", base.z + 10)) - gx(solveWith(params, hip, "z", base.z - 10)));
      bis("z", base.z - 25, base.z + 25, r => sgnX * gx(r));
      const gz = (r) => comOf(spec, r.S)[2] - footCenter(spec, r.S, s)[2], sgnZ = Math.sign(gz(solveWith(params, hip, "y", base.y + 10)) - gz(solveWith(params, hip, "y", base.y - 10)));
      bis("y", base.y - 25, base.y + 25, r => sgnZ * gz(r));
    }
    R = solve();
    function solveWith(pr, h, axis, v) { const keep = pr[h]; pr[h] = Object.assign({}, keep, { [axis]: v }); const r = solve(); pr[h] = keep; return r; }
  }
  const com = comOf(spec, R.S), fc = sides.map(s => footCenter(spec, R.S, s)), sup = V.sc(fc.reduce((a, b) => V.add(a, b), [0, 0, 0]), 1 / fc.length);
  return { key, title: P.title, stance: P.stance, T: R.T, rootPos: R.rootPos, rootRot: R.rootRot, S: R.S, params,
           comOffset: [com[0] - sup[0], com[2] - sup[2]], feet: { L: R.S[bi(spec, "foot_L")].pos, R: R.S[bi(spec, "foot_R")].pos } };
}
// all key poses, rooted consistently: N (double stance, soles on the turf) defines the feet's home places; every other pose keeps its
// stance foot exactly there
export function buildPoses(spec) {
  const N = buildPose(spec, "N", null), home = N.feet, out = { N };
  for (const k of Object.keys(POSES)) if (k !== "N") out[k] = buildPose(spec, k, POSES[k].stance === "both" && k !== "RELAXED" ? home : (POSES[k].stance === "both" ? null : home));
  return out;
}
// blend two poses (nlerp per SixDOF joint, lerp per hinge, lerp / nlerp of the root) — deterministic, shortest path
const nlerp = (a, b, s) => { const d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3], bb = d < 0 ? b.map(x => -x) : b; return Q.norm([0, 1, 2, 3].map(i => a[i] + (bb[i] - a[i]) * s)); };
export function blendPose(spec, A, B, s) {
  return { T: spec.joints.map((j, k) => j.type === "hinge" ? A.T[k] + (B.T[k] - A.T[k]) * s : nlerp(A.T[k], B.T[k], s)),
           rootPos: V.lerp(A.rootPos, B.rootPos, s), rootRot: nlerp(A.rootRot, B.rootRot, s) };
}
// ── target trajectories: a list of segments { t0, t1, a, b, ease, T (easing duration, default t1 − t0) } ───────────────────────────────
export const minjerk = (u) => { const x = Math.max(0, Math.min(1, u)); return x * x * x * (10 - 15 * x + 6 * x * x); };
const ease = (seg, t) => { const T = seg.T || (seg.t1 - seg.t0); if (seg.ease === "hold" || T <= 0) return 1; const u = (t - seg.t0) / T;
  return seg.ease === "linear" ? Math.max(0, Math.min(1, u)) : minjerk(u); };
export function segAt(segs, t) { let s = segs[0]; for (const g of segs) if (t >= g.t0) s = g; return s; }
export const poseOnSeg = (spec, seg, t) => blendPose(spec, seg.a, seg.b, ease(seg, Math.min(Math.max(t, seg.t0), seg.t1)));
// the target at time t + its time derivative. The derivative is a one-sided difference INSIDE the active segment (never across a
// segment boundary: a step-change segment requests a new pose with zero feed-forward velocity rather than an infinite one).
export function targetAt(spec, segs, t, h) {
  const seg = segAt(segs, t), P = poseOnSeg(spec, seg, t);
  let t2 = t + h, sgn = 1; if (t2 > seg.t1) { t2 = t - h; sgn = -1; } if (t2 < seg.t0) return { P, W: spec.joints.map(j => j.type === "hinge" ? 0 : [0, 0, 0]), rootV: [0, 0, 0], rootW: [0, 0, 0] };
  const P2 = poseOnSeg(spec, seg, t2), f = sgn / h;
  const angVel = (qa, qb) => { let d = Q.mul(Q.conj(qa), qb); if (d[3] < 0) d = d.map(x => -x); return [2 * d[0] * f, 2 * d[1] * f, 2 * d[2] * f]; };   // body-2 frame
  return { P, W: spec.joints.map((j, k) => j.type === "hinge" ? (P2.T[k] - P.T[k]) * f : angVel(P.T[k], P2.T[k])),
           rootV: V.sc(V.sub(P2.rootPos, P.rootPos), f), rootW: angVel(P.rootRot, P2.rootRot) };
}

// ── REGIONAL MOTOR PROFILES (relative authority, not player attributes) ──────────────────────────────────────────────────────────────
// tau = torque limit per constraint axis (N·m): approximate adult-male isometric maxima averaged over the two directions of each joint
//   (knee extension 247 N·m, Harbo et al. 2012; the others typical dynamometry ranges — see GATE_B_REPORT §8). Jolt clamps the motor impulse
//   per step to ±tau·dt: the authority is finite and timestep-independent.
// satDeg = the error at which the spring alone reaches tau → kp = tau / sat. Below it the joint is a linear compliant spring, above it the
//   motor saturates. kd = 2·ζ·√(kp·I_load) with ζ = 1: critically damped for the inertia the joint most often moves (computed from the
//   body spec in the neutral pose: the distal chain for trunk / neck / arms; for hips / knees / ankles the larger of the distal leg and
//   half the body above the joint, because in stance they carry the body).
export const REGION_OF = { lumbar: "spine", thoracic: "spine", neck: "neck", shoulder_L: "shoulder", shoulder_R: "shoulder", elbow_L: "elbow", elbow_R: "elbow",
  hip_L: "hip", hip_R: "hip", knee_L: "knee", knee_R: "knee", ankle_L: "ankle", ankle_R: "ankle" };
export const MOTOR_REGIONS = {
  spine:    { tau: 200, satDeg: 20 },
  neck:     { tau: 35,  satDeg: 30 },
  shoulder: { tau: 70,  satDeg: 30 },
  elbow:    { tau: 60,  satDeg: 30 },
  hip:      { tau: 220, satDeg: 20 },
  knee:     { tau: 190, satDeg: 20 },
  ankle:    { tau: 110, satDeg: 15 },
};
// strength comparison: one multiplier on authority (tau) AND stiffness (kp); kd follows √kp so ζ stays 1
export const STRENGTH = { candidate: 1, weak: 0.25, strong: 8 };
const subtree = (spec, root) => { const out = [root]; for (let i = 0; i < out.length; i++) spec.joints.forEach(j => { if (j.parentIndex === out[i]) out.push(j.childIndex); }); return out; };
// scalar inertia of a body set about a point (mean principal inertia + m·d²) in pose S
const inertiaAbout = (spec, S, set, p) => set.reduce((a, i) => { const b = spec.bodies[i], c = V.add(S[i].pos, Q.rot(S[i].rot, b.com)), d = V.sub(c, p);
  return a + (b.inertia[0] + b.inertia[1] + b.inertia[2]) / 3 + b.mass * V.dot(d, d); }, 0);
export function motorProfile(spec, S, strength) {
  const mult = typeof strength === "number" ? strength : STRENGTH[strength || "candidate"], all = spec.bodies.map((b, i) => i);
  return spec.joints.map((j) => { const R = MOTOR_REGIONS[REGION_OF[j.name]], p = S[j.childIndex].pos, dist = subtree(spec, j.childIndex);
    let I = inertiaAbout(spec, S, dist, p); if (/^(hip|knee|ankle)_/.test(j.name)) I = Math.max(I, inertiaAbout(spec, S, all.filter(i => !dist.includes(i)), p) / 2);
    const tau = R.tau * mult, kp = tau / rad(R.satDeg), kd = 2 * 1.0 * Math.sqrt(kp * I);
    return { joint: j.name, region: REGION_OF[j.name], tau, kp, kd, Iload: I, satDeg: R.satDeg }; });
}
// ── TEMPORARY GATE B PELVIS SUPPORT (finite, visible, measured, defeatable — NOT balance) ────────────────────────────────────────────
// A spring-damper from the authored root target to the pelvis, force- and torque-limited per axis. candidate: 250 N ≈ 1/3 body weight
// per axis, 100 N·m per axis; reduced: a quarter; off: no support constraint at all.
export const SUPPORT = { candidate: { mult: 1 }, reduced: { mult: 0.25 }, off: null };
export function supportSettings(spec, S, level) {
  if (!SUPPORT[level]) return null; const m = SUPPORT[level].mult, M = spec.totalMass, all = spec.bodies.map((b, i) => i), I = inertiaAbout(spec, S, all, S[0].pos);
  const kLin = 3000 * m, kRot = 400 * m;
  return { level, kLin, cLin: 2 * Math.sqrt(kLin * M), fMax: 250 * m, kRot, cRot: 2 * Math.sqrt(kRot * I), tMax: 100 * m, Ibody: I };
}
