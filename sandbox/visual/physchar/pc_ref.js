// ═══ physchar/pc_ref.js — REFERENCE MOTION ADAPTER: anim3d/of_loco.js → physical joint-target PREFERENCES (P3 style) ═══════════════════
// LOCOMOTION_ARCHITECTURE_FINAL.md §7 (approved): of_loco is sampled at the MEASURED phase and speed; it supplies joint-space preferences
// only — never the root, the stride, the foothold or any physical state. The authored rotations are mapped exactly as D6's reference keys
// (pc_gated REF_SLIDE): thigh x → hip swingY (x < 0 = flexion), thigh z → hip swingZ, shin x → knee, foot x → ankle swingY (+ = toes down),
// spine x → lumbar Y, chest x → thoracic Y, neck x → neck Y, upperArm x / z → shoulder Y / Z, foreArm x → elbow (sign flipped); toes and
// the pelvis orientation (root) are not used. Every target is clamped to the body's range of motion (2° margin), as in D6.
// G1a uses the IDLE pose only (walking style is G2's subject).
import { paramTarget } from "./pc_control.js";

let OFL = null;
// src: the text of anim3d/of_loco.js (a plain browser script). Its helpers are the anim3d/m4.js definitions, reproduced here.
export function initOfLoco(src) {
  const clamp01 = (v) => Math.max(0, Math.min(1, v)), smooth01 = (v) => { v = clamp01(v); return v * v * (3 - 2 * v); }, lerp = (a, b, t) => a + (b - a) * t;
  const f = new Function("clamp01", "smooth01", "lerp", "DEG", src + "\nreturn { OF_LOCO, OF_IDLE, ofLocoParams, ofPoseLerp };");
  OFL = f(clamp01, smooth01, lerp, Math.PI / 180); return OFL; }
export const ofLoco = () => OFL;
const MAP = { hip: (p, s) => ({ y: p["thigh_" + s][0], z: p["thigh_" + s][2] }), knee: (p, s) => ({ a: p["shin_" + s][0] }), ankle: (p, s) => ({ y: p["foot_" + s][0] }),
  lumbar: (p) => ({ y: p.spine[0] }), thoracic: (p) => ({ y: p.chest[0] }), neck: (p) => ({ y: p.neck[0] }),
  shoulder: (p, s) => ({ y: p["upperArm_" + s][0], z: p["upperArm_" + s][2] }), elbow: (p, s) => ({ a: -p["foreArm_" + s][0] }) };
const clampR = (v, lo, hi, m) => Math.max(lo + m, Math.min(hi - m, v));
// an authored pose (bone Euler degrees, of_loco convention) → per-joint targets (constraint-space quaternion / hinge angle), ROM-clamped
export function poseTargets(spec, pose, joints) {
  const out = {}, m2 = 2 * Math.PI / 180, d2r = Math.PI / 180, r2d = 180 / Math.PI;
  spec.joints.forEach((j, k) => { if (joints && !joints.includes(j.name)) return; const [base, side] = j.name.split("_"), fn = MAP[base]; if (!fn) return; const p = fn(pose, side); if (!p) return;
    if (j.type === "hinge") out[k] = paramTarget(j, { a: clampR(p.a * d2r, j.lo, j.hi, m2) * r2d });
    else out[k] = paramTarget(j, { y: p.y != null ? clampR(p.y * d2r, j.limits.swingY[0], j.limits.swingY[1], m2) * r2d : 0, z: p.z != null ? clampR(p.z * d2r, j.limits.swingZ[0], j.limits.swingZ[1], m2) * r2d : 0 }); });
  return out; }
export const idlePose = () => OFL ? OFL.OF_IDLE : null;
