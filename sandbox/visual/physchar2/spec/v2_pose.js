// ═══ physchar2/spec/v2_pose.js — forward kinematics of anatomical poses (inspection + G0 reference poses; NOT a controller) ════════════
// A pose = anatomical joint angles (degrees, v2_joints conventions) + the pelvis transform. Bodies are placed rigidly through the joint
// parameterisation. Used only to (a) display the character in inspection poses and (b) test collider clearance at the G0 reference poses.
import { V, Q } from "../core/v2_math.js";
import { childRotation } from "./v2_joints.js";

const both = (o) => ({ ...Object.fromEntries(Object.entries(o).map(([k, v]) => [k + "_L", v])), ...Object.fromEntries(Object.entries(o).map(([k, v]) => [k + "_R", v])) });
// spec §22 G0 0.10 reference poses (anatomical degrees). Shoulder angles are from the arm-hanging anatomical zero (T-pose = abd 90).
export const POSES = {
  canonical: { title: "Canonical T-pose (reference / export pose)", angles: { ...both({ shoulder: { abd: 90 } }) } },
  neutral: { title: "Neutral anatomical (arms down, 6° abduction, palms facing the thighs)", angles: { ...both({ shoulder: { abd: 6 } }) } },
  quietStance: { title: "Quiet stance", angles: { ...both({ shoulder: { abd: 6 }, elbow: { flex: 10 }, hip: { flex: 5 }, knee: { flex: 10 }, ankle: { df: 5 } }) } },
  lunge: { title: "Lunge (right leg forward)", angles: { lumbar: { flex: 5 }, shoulder_L: { abd: 6, flex: 20 }, shoulder_R: { abd: 6, flex: -20 },
    hip_R: { flex: 60 }, knee_R: { flex: 70 }, ankle_R: { df: 10 }, hip_L: { flex: -15 }, knee_L: { flex: 10 }, ankle_L: { df: 5 } } },
  deepSquat: { title: "Deep squat (90° hips, arms forward)", angles: { lumbar: { flex: 20 }, thoracic: { flex: 10 }, neck: { flex: -15 },
    ...both({ shoulder: { flex: 90, abd: 5 }, hip: { flex: 90, abd: 10 }, knee: { flex: 100 }, ankle: { df: 25 } }) } },
  singleLeg: { title: "Single-leg stance (left stance, right knee raised)", angles: { ...both({ shoulder: { abd: 6 } }), hip_R: { flex: 30 }, knee_R: { flex: 60 } } },
  armsForward: { title: "Arms forward (90° flexion)", angles: { ...both({ shoulder: { flex: 90 } }) } },
};
export const REFERENCE_POSES = ["canonical", "neutral", "quietStance", "lunge", "deepSquat", "singleLeg", "armsForward"];

// body world transforms {pos (body origin = proximal joint), rot} for a pose; pelvis at its canonical origin unless given
export function posedBodies(spec, angles, pelvis = { pos: null, rot: [0, 0, 0, 1] }) {
  const B = spec.bodies, S = B.map(() => null);
  S[0] = { pos: (pelvis.pos || B[0].origin).slice(), rot: pelvis.rot.slice() };
  for (const j of spec.joints) {                                  // joints are listed parent-first (JOINT_DEFS order)
    const P = S[j.parentIndex], pb = B[j.parentIndex], cb = B[j.childIndex];
    S[j.childIndex] = { pos: V.add(P.pos, Q.rot(P.rot, V.sub(cb.origin, pb.origin))), rot: childRotation(j, P.rot, angles[j.name] || {}) };
  }
  return S;
}
// a body-local point → world, for a posed body
export const toWorld = (S, i, pLocal) => V.add(S[i].pos, Q.rot(S[i].rot, pLocal));
