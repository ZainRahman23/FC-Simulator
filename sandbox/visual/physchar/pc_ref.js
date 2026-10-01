// ═══ physchar/pc_ref.js — REFERENCE MOTION ADAPTER: anim3d/of_loco.js → physical joint-target PREFERENCES ═════════════════════════════════
// LOCOMOTION_ARCHITECTURE_FINAL.md §7 (approved): of_loco is sampled at the MEASURED phase and speed; it supplies joint-space preferences
// only — never the root, the stride, the foothold or any physical state. The authored rotations are mapped exactly as D6's reference keys
// (pc_gated REF_SLIDE): thigh x → hip swingY (x < 0 = flexion), thigh z → hip swingZ, shin x → knee, foot x → ankle swingY (+ = toes down),
// spine / chest x → lumbar / thoracic swingY (lean), neck x → neck Y, upperArm x / z → shoulder Y / Z (+Y = arm back), foreArm x → elbow
// (sign flipped). G2a adds the trunk's YAW and ROLL: the spine joints' twist axis is +y (verified: lumbar / thoracic / neck X = +y), so
// spine / chest y (yaw about +y) → twist, and their swingZ axis is −z, so roll z (about +z) → −swingZ. Toes and the pelvis (the root) are
// not joints: the pelvis's authored roll / yaw / lean and the stance legs' knee bend are passed to the balance controller as its PLANNED
// posture (small offsets on its own desired pelvis pose), never applied to the body. Every target is clamped to the range of motion (2°).
import { paramTarget } from "./pc_control.js";

let OFL = null;
// src: the text of anim3d/of_loco.js (a plain browser script). Its helpers are the anim3d/m4.js definitions, reproduced here. The cycle's
// pelvis-grounding step (ofLocoGroundPelvis: an FK of the RENDER skeleton that places the rendered root) is a presentation concern the
// physical character never uses — the physics decides where the pelvis is — so it is replaced by a no-op; nothing else is altered.
export function initOfLoco(src) {
  const clamp01 = (v) => Math.max(0, Math.min(1, v)), smooth01 = (v) => { v = clamp01(v); return v * v * (3 - 2 * v); }, lerp = (a, b, t) => a + (b - a) * t;
  const V3 = { lerp: (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)], scale: (a, s) => a.map(v => v * s) };
  const f = new Function("clamp01", "smooth01", "lerp", "DEG", "V3", "OF_REF_LEG", src + "\nofLocoGroundPelvis = function () {};\nreturn { OF_LOCO, OF_IDLE, ofLocoParams, ofPoseLerp, ofLocoCycle };");
  OFL = f(clamp01, smooth01, lerp, Math.PI / 180, V3, 1); return OFL; }
export const ofLoco = () => OFL;
const MAP = { hip: (p, s) => ({ y: p["thigh_" + s][0], z: p["thigh_" + s][2] }), knee: (p, s) => ({ a: p["shin_" + s][0] }), ankle: (p, s) => ({ y: p["foot_" + s][0] }),
  lumbar: (p) => ({ y: p.spine[0], t: p.spine[1] || 0, z: -p.spine[2] || 0 }), thoracic: (p) => ({ y: p.chest[0], t: p.chest[1] || 0, z: -p.chest[2] || 0 }), neck: (p) => ({ y: p.neck[0] }),
  shoulder: (p, s) => ({ y: p["upperArm_" + s][0], z: p["upperArm_" + s][2] }), elbow: (p, s) => ({ a: -p["foreArm_" + s][0] }) };
const clampR = (v, lo, hi, m) => Math.max(lo + m, Math.min(hi - m, v));
// an authored pose (bone Euler degrees, of_loco convention) → per-joint targets (constraint-space quaternion / hinge angle), ROM-clamped
export function poseTargets(spec, pose, joints) {
  const out = {}, m2 = 2 * Math.PI / 180, d2r = Math.PI / 180, r2d = 180 / Math.PI;
  spec.joints.forEach((j, k) => { if (joints && !joints.includes(j.name)) return; const [base, side] = j.name.split("_"), fn = MAP[base]; if (!fn) return; if (!pose[base === "hip" ? "thigh_" + side : base === "knee" ? "shin_" + side : base === "ankle" ? "foot_" + side : base === "shoulder" ? "upperArm_" + side : base === "elbow" ? "foreArm_" + side : base === "lumbar" ? "spine" : base === "thoracic" ? "chest" : "neck"]) return;
    const p = fn(pose, side); if (!p) return;
    if (j.type === "hinge") out[k] = paramTarget(j, { a: clampR(p.a * d2r, j.lo, j.hi, m2) * r2d });
    else out[k] = paramTarget(j, { y: p.y != null ? clampR(p.y * d2r, j.limits.swingY[0], j.limits.swingY[1], m2) * r2d : 0, z: p.z != null ? clampR(p.z * d2r, j.limits.swingZ[0], j.limits.swingZ[1], m2) * r2d : 0,
      t: p.t != null ? clampR(p.t * d2r, j.limits.twist[0], j.limits.twist[1], m2) * r2d : 0 }); });
  return out; }
export const idlePose = () => OFL ? OFL.OF_IDLE : null;

// ── G2a: the IN-PLACE WALK — the WALK parameter set (of_loco gaits[1], unchanged) with only its STRIDE terms removed, because the body does
// not progress: no stance extension behind the body (hipExt 0), the swing leg retracts fully under the hip before contact (retract 1),
// and contact is made on the forefoot (ankleHS −8: 8° plantar-flexed at contact) — a heel strike belongs to forward walking (G2b); the
// physical swing lands that forefoot contact with the heel landHeelH = 2 cm up (a height, not an angle: the collider boot is 36 cm long,
// so the reference's 12° contact pitch would put its heel 7.5 cm up, and its toe 28 cm ahead of the ankle carried the first load far in
// front of the body), pressing landPress = 1.5 cm through the surface (a finite contact velocity). Toe-off likewise: the heel rises
// toeOffHeelH = 6 cm about the boot's toe edge (the reference's 22° of plantar-flexion would raise it 13 cm in 90 ms), and the swing knee
// starts its flexion at toe-off from rest (kneeTO 0; the walk's knee is already a quarter into its swing flexion at toe-off, which in
// place the rigid boot's toe pivot cannot hand over to without an acceleration spike). The
// stance fraction is the step timing's own (2 / 3: 0.45 s step, 0.15 s double support); the pelvis yaw is reduced to 2° (in place the
// heading is regulated, and the legs do not sweep). Everything else — knee swing, knee loading, ankle toe-off, arm swing, trunk
// counter-rotation, roll, lean — is the WALK set's own.
export function inPlaceWalkParams(over) { if (!OFL) return null; const W = OFL.OF_LOCO.gaits.find(g => g.id === "WALK"), P = OFL.ofLocoParams(W.v);
  return Object.assign(P, { inPlace: true, stance: 2 / 3, hipExt: 0, retract: 1, ankleHS: -8, pYaw: 2, landHeelH: 0.02, landPress: 0.015, kneeTO: 0, toeOffHeelH: 0.06, gait: "WALK (in place)" }, over || {}); }
const SKEL_STUB = { legLen: 1, byName: { thigh_R: { len: 0.45 }, shin_R: { len: 0.43 } }, ankleH: 0.08, hipY: 0.9 };   // (used only by a flight phase, which a walk has none of)
// IN PLACE (P.inPlace) two walking terms have no in-place meaning and are re-derived from the in-place legs, as marching in place does:
//   the HIP flexes WITH the knee (hip flexion ∝ the knee's swing flexion, peaking at hipFlex): with no stride the foot stays under the body
//   and the knee comes up and forward — the walking timing (the hip flexing late, the foot starting behind the body) lifted the heel back;
//   the COUNTER-SWING (arms, trunk yaw, pelvis yaw) follows the legs' actual fore-aft motion c = (φ_R − φ_L) / hipFlex instead of the walk's
//   cos 2πu: the contralateral arm comes forward as the knee rises. In place the swing leg's vertical angular momentum follows the knee's
//   fore-aft velocity (forward as it rises, back as it lowers), a quarter cycle from the walk's (the leg sweeping forward through the
//   whole swing); with the walk's timing the arms ADDED to the legs' angular momentum (G2a finding: arms-vs-legs L_z correlation +0.38).
//   Amplitudes (arm 22°, elbow, sYaw, pYaw, abduction) are the WALK set's own.
const inPlaceHip = (P, kn) => P.hipFlex * Math.max(0, Math.min(1, (kn - P.kneeStance) / (P.kneeSwing - P.kneeStance)));
function inPlaceAdapt(P, p) { const phR = inPlaceHip(P, p.shin_R[0]), phL = inPlaceHip(P, p.shin_L[0]), c = (phR - phL) / Math.max(1, P.hipFlex);
  p.thigh_R = [-phR, p.thigh_R[1], p.thigh_R[2]]; p.thigh_L = [-phL, p.thigh_L[1], p.thigh_L[2]]; if (P.counterFromLegs === false) return p;   // (diagnostic: the walk's own counter-swing timing)
  const aR = P.arm * c, aL = -aR, cl = (v) => Math.max(0, Math.min(1, v)); p.upperArm_R = [aR, 0, P.abd]; p.upperArm_L = [aL, 0, -P.abd];
  p.foreArm_R = [-P.elbow - 14 * cl(-aR / Math.max(1, P.arm)), 0, 0]; p.foreArm_L = [-P.elbow - 14 * cl(-aL / Math.max(1, P.arm)), 0, 0];
  p.spine = [p.spine[0], P.sYaw * c * 0.5, p.spine[2]]; p.chest = [p.chest[0], P.sYaw * c * 0.5, p.chest[2]]; p.pelvis = [p.pelvis[0], -P.pYaw * c, p.pelvis[2]]; p._c = c; return p; }
// the authored pose at cycle phase u (RIGHT contact at u = 0, LEFT at u = 0.5), blended from the IDLE stance by wGait ∈ [0, 1]
export function refPose(P, u, wGait) { if (!OFL) return null; let cyc = OFL.ofLocoCycle(SKEL_STUB, P, ((u % 1) + 1) % 1, {}); if (P.inPlace) cyc = inPlaceAdapt(P, cyc);
  if (wGait == null || wGait >= 1) return cyc; const p = OFL.ofPoseLerp(OFL.OF_IDLE, cyc, Math.max(0, wGait)); p._legs = cyc._legs; p._c = cyc._c; return p; }
