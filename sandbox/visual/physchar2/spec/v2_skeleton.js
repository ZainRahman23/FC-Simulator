// ═══ physchar2/spec/v2_skeleton.js — the PRODUCTION SEMANTIC (render) SKELETON contract, 31 bones (V2-G0) ═══════════════════════════
// Spec §6 (topology frozen from RENDER_SKELETON_CONTRACT.md / Astra Unity Humanoid audit) + §7 (coordinate / T-pose contract) + §9
// (driver class per bone). Positions: canonical T-pose, CCS (+X right, +Y up, +Z forward — LEFT-handed, Unity numeric), metres.
// Local axes: +Y_local toward the child (along the bone); +Z_local = anatomical forward (foot / toe: +Z_local = up);
// +X_local = Y × Z (standard formula — always a proper rotation). Mirror operator: q(x, y, z, w) → (x, −y, −z, w); position (x,y,z) → (−x,y,z).
import { V, Q } from "../core/v2_math.js";

// name, parent, Unity HumanBodyBones semantic (null = unmapped), Unity-required, class, driving body (side-substituted), notes
// classes: DIRECT (world = body × constant bind offset) · AIM (position exact, swing from a body, twist split) · PROC (procedural, presentation)
//          DEFORM (deformation-only branch, twist extraction) · DERIVED (structural, computed from physics)
const B = (name, parent, unity, unityReq, cls, body, note) => ({ name, parent, unity, unityRequired: unityReq, cls, body, note });
export const BONES = [
  B("root", null, null, false, "DERIVED", "pelvis", "ground point below the mid-HJC; yaw from the pelvis +Z; never authoritative"),
  B("hips", "root", "Hips", true, "DIRECT", "pelvis", "Unity Hips = the central pelvis; physical L/R hip joints are constraints, not bones"),
  B("spine_01", "hips", "Spine", true, "DIRECT", "abdomen", "at the physical lumbar joint"),
  B("spine_02", "spine_01", "Chest", false, "AIM", "thorax", "at the physical thoracic joint; thorax swing, 50 % of the thorax twist"),
  B("spine_03", "spine_02", "UpperChest", false, "DIRECT", "thorax", "exact: arms and head hang from it"),
  B("neck", "spine_03", "Neck", false, "AIM", "head", "at the physical neck joint; head swing, 27 % of the axial twist (C1–C2 = 73 %, Zhou 2020)"),
  B("head", "neck", "Head", true, "DIRECT", "head", "atlanto-occipital level"),
  ...["L", "R"].flatMap(s => [
    B("clavicle_" + s, "spine_03", s === "L" ? "LeftShoulder" : "RightShoulder", false, "DIRECT", "thorax", "rigid to the thorax in G0 (the physical shoulder centre is fixed in the thorax)"),
    B("upperArm_" + s, "clavicle_" + s, s === "L" ? "LeftUpperArm" : "RightUpperArm", true, "DIRECT", "upperArm_" + s, "at the physical shoulder (GH centre)"),
    B("upperArm_twist_" + s, "upperArm_" + s, null, false, "DEFORM", "upperArm_" + s, "50 % of the upper-arm twist"),
    B("lowerArm_" + s, "upperArm_" + s, s === "L" ? "LeftLowerArm" : "RightLowerArm", true, "DIRECT", "forearm_" + s, "at the physical elbow; includes pronation / supination"),
    B("forearm_twist_" + s, "lowerArm_" + s, null, false, "DEFORM", "forearm_" + s, "50 % of the pronation / supination"),
    B("hand_" + s, "lowerArm_" + s, s === "L" ? "LeftHand" : "RightHand", true, "DIRECT", "forearm_" + s, "wrist straight and rigid on the forearm body (core topology)"),
  ]),
  ...["L", "R"].flatMap(s => [
    B("upperLeg_" + s, "hips", s === "L" ? "LeftUpperLeg" : "RightUpperLeg", true, "DIRECT", "thigh_" + s, "at the physical hip joint centre"),
    B("thigh_twist_" + s, "upperLeg_" + s, null, false, "DEFORM", "thigh_" + s, "50 % of hip axial rotation"),
    B("lowerLeg_" + s, "upperLeg_" + s, s === "L" ? "LeftLowerLeg" : "RightLowerLeg", true, "DIRECT", "shank_" + s, "at the physical knee; includes knee axial rotation"),
    B("calf_twist_" + s, "lowerLeg_" + s, null, false, "DEFORM", "shank_" + s, "50 % of knee axial rotation"),
    B("foot_" + s, "lowerLeg_" + s, s === "L" ? "LeftFoot" : "RightFoot", true, "DIRECT", "foot_" + s, "at the physical ankle (inside the rigid boot)"),
    B("toe_" + s, "foot_" + s, s === "L" ? "LeftToes" : "RightToes", false, "PROC", "foot_" + s, "F0: procedural from the rigid foot + sensed contact (no physical toe)"),
  ]),
];
export const UNITY_REQUIRED = ["Hips", "Spine", "Head", "LeftUpperArm", "RightUpperArm", "LeftLowerArm", "RightLowerArm", "LeftHand", "RightHand",
  "LeftUpperLeg", "RightUpperLeg", "LeftLowerLeg", "RightLowerLeg", "LeftFoot", "RightFoot"];
export const TOUCHLINE_REQUIRED_OPTIONAL = ["Chest", "UpperChest", "Neck", "LeftShoulder", "RightShoulder", "LeftToes", "RightToes"];
// the Unity human hierarchy the mapped bones must respect (child semantic → required ancestor semantic)
export const UNITY_PARENT = { Spine: "Hips", Chest: "Spine", UpperChest: "Chest", Neck: "UpperChest", Head: "Neck",
  LeftShoulder: "UpperChest", RightShoulder: "UpperChest", LeftUpperArm: "LeftShoulder", RightUpperArm: "RightShoulder",
  LeftLowerArm: "LeftUpperArm", RightLowerArm: "RightUpperArm", LeftHand: "LeftLowerArm", RightHand: "RightLowerArm",
  LeftUpperLeg: "Hips", RightUpperLeg: "Hips", LeftLowerLeg: "LeftUpperLeg", RightLowerLeg: "RightUpperLeg",
  LeftFoot: "LeftLowerLeg", RightFoot: "RightLowerLeg", LeftToes: "LeftFoot", RightToes: "RightFoot" };

// canonical T-pose joint positions (spec §6), from the landmarks
export function skeletonPositions(Lm) {
  const { H, P, sole, Ls, yA, yK, yH, yOMPH, yXYPH, ySUPR, yCERV, ySJC, hx, sx, fl, ap } = Lm;
  const ua = Ls.upperArm, fa = Ls.forearm, pos = {};
  pos.root = [0, 0, 0]; pos.hips = [0, yH, 0]; pos.spine_01 = [0, yOMPH, ap.lumbar]; pos.spine_02 = [0, yXYPH, ap.thoracic];
  pos.spine_03 = [0, (yXYPH + yCERV) / 2, ap.thoracic]; pos.neck = [0, yCERV, ap.cervical]; pos.head = [0, P.headJointH * H + sole, P.headJointAP * H];
  const mtp1 = (P.mtp1FromHeel - P.ankleFromHeel) * fl, mtp5 = (P.mtp5FromHeel - P.ankleFromHeel) * fl;
  for (const [s, g] of [["L", -1], ["R", 1]]) {
    pos["clavicle_" + s] = [g * P.claviclePos.x * H, ySUPR, P.claviclePos.z * H]; pos["upperArm_" + s] = [g * sx, ySJC, 0];
    pos["upperArm_twist_" + s] = [g * (sx + 0.5 * ua), ySJC, 0]; pos["lowerArm_" + s] = [g * (sx + ua), ySJC, 0];
    pos["forearm_twist_" + s] = [g * (sx + ua + 0.6 * fa), ySJC, 0]; pos["hand_" + s] = [g * (sx + ua + fa), ySJC, 0];
    pos["upperLeg_" + s] = [g * hx, yH, 0]; pos["thigh_twist_" + s] = [g * hx, (yH + yK) / 2, 0]; pos["lowerLeg_" + s] = [g * hx, yK, 0];
    pos["calf_twist_" + s] = [g * hx, (yK + yA) / 2, 0]; pos["foot_" + s] = [g * hx, yA, 0];
    pos["toe_" + s] = [g * hx, sole + P.mtpHeight * fl, (mtp1 + mtp5) / 2];
  }
  return pos;
}
// where a leaf bone "points" (its +Y_local) in the canonical pose (bones with a semantic child aim at it)
function leafDir(name) {
  if (name === "root" || name === "head") return [0, 1, 0];
  if (/^hand_|upperArm_twist_|forearm_twist_/.test(name)) return [name.endsWith("_L") ? -1 : 1, 0, 0];
  if (/thigh_twist_|calf_twist_/.test(name)) return [0, -1, 0];
  if (/^toe_/.test(name)) return [0, 0, 1];
  return null;
}
const PRIMARY_CHILD = { root: "hips", hips: "spine_01", spine_01: "spine_02", spine_02: "spine_03", spine_03: "neck", neck: "head",
  clavicle_L: "upperArm_L", clavicle_R: "upperArm_R", upperArm_L: "lowerArm_L", upperArm_R: "lowerArm_R", lowerArm_L: "hand_L", lowerArm_R: "hand_R",
  upperLeg_L: "lowerLeg_L", upperLeg_R: "lowerLeg_R", lowerLeg_L: "foot_L", lowerLeg_R: "foot_R", foot_L: "toe_L", foot_R: "toe_R" };
// canonical world rotation of every bone from the local-axis convention
export function skeletonFrames(pos) {
  const out = {};
  for (const b of BONES) {
    let y = PRIMARY_CHILD[b.name] ? V.norm(V.sub(pos[PRIMARY_CHILD[b.name]], pos[b.name])) : leafDir(b.name);
    if (b.name === "root") y = [0, 1, 0];
    const footLike = /^(foot|toe)_/.test(b.name), ref = footLike ? [0, 1, 0] : [0, 0, 1];
    const z = V.norm(V.sub(ref, V.sc(y, V.dot(ref, y)))), x = V.cross(y, z);
    out[b.name] = { x, y, z, q: Q.fromAxes(x, y, z) };
  }
  return out;
}
export const mirrorName = (n) => n.endsWith("_L") ? n.slice(0, -2) + "_R" : n.endsWith("_R") ? n.slice(0, -2) + "_L" : n;
export const mirrorPos = (p) => [-p[0], p[1], p[2]];
export const mirrorQuat = (q) => [q[0], -q[1], -q[2], q[3]];
// a deliberately MIRRORED copy (x negated and L/R labels kept) — the chirality test must reject it
export function mirroredCopy(pos) { const o = {}; for (const k of Object.keys(pos)) o[k] = mirrorPos(pos[k]); return o; }
