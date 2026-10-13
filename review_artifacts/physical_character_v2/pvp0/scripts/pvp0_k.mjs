// PVP-0 — SLIDE-A1 K → V2 tackler retarget (motor INTENT only; nothing here is applied as a transform during simulation).
// Input: the committed K pose record (pvp0/source/slide_a1_K/K.json, Astra's SLIDE-A1 K at 59b7245c; 120 Hz; per frame the 23 Gabriel bones'
// world skinning matrices — bind rotations are identity, so each matrix's rotation IS the bone's world rotation — and joint-head positions).
// Mapping (one rule, all frames):
//   V2 body world rotation = Gabriel bone world rotation · C, with C = identity except the arms (V2's rest arms are horizontal, Gabriel's bind arms
//   hang down: upper arm / forearm R: Rz(−90°), L: Rz(+90°)). Both skeletons rest facing +z with +x to the right, legs / torso / head along ±y.
//   pelvis ← pelvis, abdomen ← spine, thorax ← chest, head ← head, upperArm ← upperArm, forearm ← foreArm, thigh ← thigh, shank ← shin, foot ← foot
//   (Gabriel clavicles, hands, toes and hair have no V2 body).
//   V2 body positions by V2's OWN forward kinematics (V2 limb lengths, joint anchors exact), anchored at the hip mid-point = Gabriel's thigh-head mid-point.
//   Joint targets: the V2 joint quaternion qcs(j, R_parent, R_child) (the plant's own convention); anatomical coordinates are audited against the
//   V2 hard limits (targets are NOT clamped — out-of-range intent meets the body's own passive end-stops, and the excess is reported).
// Scene transform: K travels +x (pitch east); PVP-0 rotates it by +90° about the vertical (x → −z) so the tackler slides across the recipient's path
// from his LEFT side (the recipient faces +x, his left foot at +z), then places it by a fixed local offset (pvp0_setup.mjs).
import fs from "fs";
const RA = new URL("../../", import.meta.url).href, PL = await import(RA + "pvp1/scripts/pvp1a_lib.mjs"), { V, Q, IL } = PL;
export const SPEC = PL.SPEC_T();
const K = JSON.parse(fs.readFileSync(new URL("../source/slide_a1_K/K.json", import.meta.url))), HZ = K.sampleHz;
export const KREC = { revision: K.revision, sampleHz: HZ, duration: K.duration, frames: K.frames.length, phases: [...new Set(K.frames.map(f => f.phase))].map(p => [p, K.frames.find(f => f.phase === p).t]) };
const BONE = { pelvis: 1, abdomen: 2, thorax: 3, head: 5, upperArm_R: 8, forearm_R: 9, upperArm_L: 12, forearm_L: 13, thigh_R: 15, shank_R: 16, foot_R: 17, thigh_L: 19, shank_L: 20, foot_L: 21 };
const qz = (deg) => { const a = deg * Math.PI / 360; return [0, 0, Math.sin(a), Math.cos(a)]; }, qy = (deg) => { const a = deg * Math.PI / 360; return [0, Math.sin(a), 0, Math.cos(a)]; };
const C = { upperArm_R: qz(-90), forearm_R: qz(-90), upperArm_L: qz(90), forearm_L: qz(90) };
function mat3q(m) { // column-major 4×4 → quaternion [x, y, z, w] of its rotation part
  const r00 = m[0], r10 = m[1], r20 = m[2], r01 = m[4], r11 = m[5], r21 = m[6], r02 = m[8], r12 = m[9], r22 = m[10], tr = r00 + r11 + r22; let q;
  if (tr > 0) { const s = Math.sqrt(tr + 1) * 2; q = [(r21 - r12) / s, (r02 - r20) / s, (r10 - r01) / s, 0.25 * s]; }
  else if (r00 > r11 && r00 > r22) { const s = Math.sqrt(1 + r00 - r11 - r22) * 2; q = [0.25 * s, (r01 + r10) / s, (r02 + r20) / s, (r21 - r12) / s]; }
  else if (r11 > r22) { const s = Math.sqrt(1 + r11 - r00 - r22) * 2; q = [(r01 + r10) / s, 0.25 * s, (r12 + r21) / s, (r02 - r20) / s]; }
  else { const s = Math.sqrt(1 + r22 - r00 - r11) * 2; q = [(r02 + r20) / s, (r12 + r21) / s, 0.25 * s, (r10 - r01) / s]; } return Q.norm(q); }
export const SCENE = Object.freeze({ yawDeg: 90, pivot: [47.7, 0, -34.0], note: "K world (pitch) → PVP-0 local: rotate +90° about y about K's entry root (ground level), then add the placement offset" });
const QS = qy(SCENE.yawDeg), toLocal = (p, off) => V.add(Q.rot(QS, V.sub(p, SCENE.pivot)), off);
// one K frame → V2 tackler body poses (local frame) for a given placement offset
export function v2Pose(fi, off = [0, 0, 0]) { const f = K.frames[fi], B = SPEC.bodies, R = {}, P = {};
  for (const b of B) { const g = BONE[b.name], qg = Q.norm(Q.mul(QS, mat3q(f.skin.slice(16 * g, 16 * g + 16)))); R[b.name] = C[b.name] ? Q.norm(Q.mul(qg, C[b.name])) : qg; }
  const hipG = V.sc(V.add(toLocal(f.joints[15], off), toLocal(f.joints[19], off)), 0.5), jL = SPEC.joints.find(j => j.name === "hip_L"), jR = SPEC.joints.find(j => j.name === "hip_R"), hipRest = V.sc(V.add(jL.at, jR.at), 0.5);
  P.pelvis = V.sub(hipG, Q.rot(R.pelvis, V.sub(hipRest, B[0].origin)));
  for (const j of SPEC.joints) { const pa = B[j.parentIndex], ch = B[j.childIndex]; P[ch.name] = V.sub(V.add(P[pa.name], Q.rot(R[pa.name], V.sub(j.at, pa.origin))), Q.rot(R[ch.name], V.sub(j.at, ch.origin))); }
  return B.map(b => ({ pos: P[b.name], rot: R[b.name] })); }
// joint target quaternions of a pose
export const jointQ = (pose) => SPEC.joints.map(j => IL.qcs(j, pose[j.parentIndex].rot, pose[j.childIndex].rot));
// limit audit of a pose's joint coordinates against V2 hard limits (rad): per joint the largest excess beyond [lo, hi] on actuated / free axes
export function limitAudit(pose) { return SPEC.joints.map((j, k) => { const a = IL.coordsOf(jointQ(pose)[k]), lo = j.limits.hard.lo, hi = j.limits.hard.hi; let ex = 0, ax = null;
  for (let i = 0; i < 3; i++) { if (j.locked && j.locked.includes(["x", "y", "z"][i])) continue; const e = Math.max(lo[i] - a[i], a[i] - hi[i], 0); if (e > ex) { ex = e; ax = i; } } return { joint: j.name, excessDeg: ex * 180 / Math.PI, axis: ax }; }); }
// targets sampled at 240 Hz from clip time t0 for n steps (slerp between K frames); returns per step the joint quaternions
const slerp = (a, b, u) => { let d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3]; if (d < 0) { b = b.map(x => -x); d = -d; } if (d > 0.9995) return Q.norm(a.map((x, i) => x + (b[i] - x) * u));
  const th = Math.acos(d), s = Math.sin(th); return a.map((x, i) => (Math.sin((1 - u) * th) * x + Math.sin(u * th) * b[i]) / s); };
export function targets(t0, n, h = 1 / 240) { const JQ = K.frames.map((_, fi) => jointQ(v2Pose(fi))), out = [];
  for (let s = 0; s < n; s++) { const t = Math.min(t0 + s * h, K.duration), x = Math.min(t * HZ, K.frames.length - 1), f0 = Math.floor(x), f1 = Math.min(f0 + 1, K.frames.length - 1), u = x - f0;
    out.push(JQ[f0].map((q, k) => Q.norm(slerp(q, JQ[f1][k], u)))); } return out; }
// initial per-body velocities at clip frame fi (finite difference to the next frame), in the local frame
export function v2Vel(fi, off = [0, 0, 0]) { const a = v2Pose(fi, off), b = v2Pose(Math.min(fi + 1, K.frames.length - 1), off), dt = 1 / HZ;
  return a.map((s, i) => { const v = V.sc(V.sub(b[i].pos, s.pos), 1 / dt), dq = Q.norm(Q.mul(b[i].rot, Q.conj(s.rot))), sg = dq[3] < 0 ? -1 : 1, ang = 2 * Math.acos(Math.min(1, Math.abs(dq[3]))), sn = Math.sin(ang / 2);
    const w = sn > 1e-9 ? V.sc([dq[0] * sg, dq[1] * sg, dq[2] * sg], ang / sn / dt) : [0, 0, 0]; return { v, w }; }); }
export const frameAt = (t) => Math.round(t * HZ);
