// ═══ physchar2/ctrl/v2_stance.js — the V2 QUIET-STANCE REFERENCE (V2-G2): a posture PREFERENCE + a balance target, never a kinematic lock ═══
// Each value is tagged: [H] human quiet-standing evidence (recalled literature unless a source is in the G2 report), [ENG] engineering choice,
// [CTRL] controller target. The controller (ctrl/v2_stand.js) uses the joint angles below only as weak posture preferences; the ankles are
// not posture-servoed at all (their sagittal angle follows from balance), and if balance needs a deviation from this pose, balance wins.
import { V, Q, rad } from "../core/v2_math.js";
import { posedBodies } from "../spec/v2_pose.js";

export const STANCE = {
  // feet: under the hip joint centres (legs vertical in the frontal plane: ankle centres 0.182 m apart at 1.82 m); toe-out by hip external
  // rotation. Self-selected quiet stance: heel centres ≈ 17 cm apart, ≈ 14° between the feet (McIlroy & Maki 1997, recalled) [H] — with
  // 7° per foot about the ankle the heel centres are 16.6 cm apart at 1.82 m.
  toeOutDeg: 7,            // per foot, hip external rotation [H]
  hipAbdDeg: 0,            // legs vertical under the hips [H] (V1: a 4.3° splay from a rig artefact — not carried)
  kneeFlexDeg: 4,          // quiet stance: knees near full extension, a few degrees of flexion [H] (spec 2.1 band 0–15°)
  hipFlexDeg: 3,           // thigh slightly flexed relative to the pelvis, trunk upright [H]/[ENG]
  lumbar: { flex: 0 }, thoracic: { flex: 0 }, neck: { flex: 0 },   // the body's anatomical neutral spine and head (gaze level) [ENG]
  shoulderAbdDeg: 6, shoulderFlexDeg: 0, elbowFlexDeg: 12,          // arms hanging relaxed, elbows slightly flexed [H]
  comAheadOfAnklesM: 0.04, // COM 4 cm anterior of the ankle-joint axis (spec 2.1 band 2–6 cm; human ≈ 4–6 cm, recalled) [H]→[CTRL]
};

const forward = [0, 0, 1], up = [0, 1, 0];
const jointAt = (spec, S, name) => { const j = spec.joints.find(x => x.name === name), pb = spec.bodies[j.parentIndex]; return V.add(S[j.parentIndex].pos, Q.rot(S[j.parentIndex].rot, V.sub(j.at, pb.origin))); };
const comOf = (spec, S) => { let m = 0, c = [0, 0, 0]; spec.bodies.forEach((b, i) => { c = V.add(c, V.sc(V.add(S[i].pos, Q.rot(S[i].rot, b.comLocal)), b.mass)); m += b.mass; }); return V.sc(c, 1 / m); };

// the anatomical angles of the stance (ankle DF / inversion and the pelvis pitch are SOLVED: feet flat on the turf, COM at the target)
export function stanceAngles(st = STANCE, ankle = { df: 0, inv: 0 }) {
  const leg = (s) => ({ [`hip_${s}`]: { flex: st.hipFlexDeg, abd: st.hipAbdDeg, rot: -st.toeOutDeg }, [`knee_${s}`]: { flex: st.kneeFlexDeg }, [`ankle_${s}`]: { df: ankle.df, inv: ankle.inv },
    [`shoulder_${s}`]: { abd: st.shoulderAbdDeg, flex: st.shoulderFlexDeg }, [`elbow_${s}`]: { flex: st.elbowFlexDeg } });
  return { lumbar: { ...st.lumbar }, thoracic: { ...st.thoracic }, neck: { ...st.neck }, ...leg("L"), ...leg("R") };
}
// solve the ankle DF / inversion so both feet are flat (foot up axis = world up) for a given pelvis pitch, then the pelvis pitch so the whole-body
// COM is comAheadOfAnklesM anterior of the mid-ankle point. Symmetric body → one ankle solution for both sides (checked on both).
export function solveStance(spec, st = STANCE) {
  const fL = spec.bodies.findIndex(b => b.name === "foot_L"), fR = spec.bodies.findIndex(b => b.name === "foot_R");
  const pose = (pitch, a) => posedBodies(spec, stanceAngles(st, a), { pos: null, rot: Q.axis([1, 0, 0], rad(pitch)) });
  const tilt = (S) => { const u = Q.rot(S[fL].rot, up), w = Q.rot(S[fR].rot, up); return [u[0], u[2], w[0], w[2]]; };   // flatness residual (x, z of each foot's up axis)
  const flatten = (pitch) => { let a = { df: st.kneeFlexDeg - st.hipFlexDeg + pitch, inv: 0 };
    for (let it = 0; it < 30; it++) { const r = tilt(pose(pitch, a)), e = [(r[1] + r[3]) / 2, (r[0] - r[2]) / 2]; if (Math.hypot(...e) < 1e-10) break;   // z-tilt ↔ DF, mirrored x-tilt ↔ inversion
      const h = 1e-3, rd = tilt(pose(pitch, { df: a.df + h, inv: a.inv })), ri = tilt(pose(pitch, { df: a.df, inv: a.inv + h }));
      const Jm = [[((rd[1] + rd[3]) / 2 - e[0]) / h, ((ri[1] + ri[3]) / 2 - e[0]) / h], [((rd[0] - rd[2]) / 2 - e[1]) / h, ((ri[0] - ri[2]) / 2 - e[1]) / h]], det = Jm[0][0] * Jm[1][1] - Jm[0][1] * Jm[1][0];
      a = { df: a.df - (Jm[1][1] * e[0] - Jm[0][1] * e[1]) / det, inv: a.inv - (-Jm[1][0] * e[0] + Jm[0][0] * e[1]) / det }; }
    return a; };
  const ahead = (pitch) => { const a = flatten(pitch), S = pose(pitch, a), mid = V.sc(V.add(jointAt(spec, S, "ankle_L"), jointAt(spec, S, "ankle_R")), 0.5); return { a, S, d: V.dot(V.sub(comOf(spec, S), mid), forward) }; };
  let lo = -6, hi = 6; for (let it = 0; it < 60; it++) { const m = (lo + hi) / 2; if (ahead(m).d < st.comAheadOfAnklesM) lo = m; else hi = m; }
  const pitch = (lo + hi) / 2, R = ahead(pitch), tl = tilt(R.S);
  return { pitchDeg: pitch, ankle: R.a, angles: stanceAngles(st, R.a), pelvisRot: Q.axis([1, 0, 0], rad(pitch)), comAhead: R.d, footTiltDeg: Math.max(...tl.map(Math.abs)) * 180 / Math.PI, stance: st };
}
