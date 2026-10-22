// ═══ physchar2/spec/v2_hinges.js — RECORD-HINGED joint centres: an opt-in, hinge-only post-step of the V2 generator (RH1) ═══════════════════
// Preregistration: review_artifacts/physical_character_v2/record_hinged/RH1_PREREG.md (frozen 50eae23a). Selected ONLY by a human field `hinges`
// (spec/v2_spec.js calls applyHinges when it is present), so every existing body spec is byte-identical.
// HINGE-ONLY: a joint centre (Jolt constraint anchor, body origin = proximal joint) moves; the child body's mass distribution and colliders stay
// where they are in the canonical pose. Changed: joint.at; the child body's origin with comLocal / comBodyLocal / collider pos re-expressed
// relative to it; the parent arm's `distal` when the elbow moves; the render-skeleton positions that sit at the moved joints (and their frames).
// Preserved (checked by the RH1 tools): masses, world COM, inertia (canonical frame, about the COM), collider world placement, joint frames
// (A, Rz, Cm, F1, F2, axes), ranges, passive parameters, capacities, disabled pairs, landmarks, every other body and joint.
import { V } from "../core/v2_math.js";
import { skeletonFrames } from "./v2_skeleton.js";

// hinges: { lumbar?: [x,y,z], thoracic?: [x,y,z], elbow?: { L: [x,y,z], R: [x,y,z] }, source?: string } — canonical T-pose frame (metres)
export function applyHinges(spec, hinges) {
  const B = Object.fromEntries(spec.bodies.map(b => [b.name, b])), J = Object.fromEntries(spec.joints.map(j => [j.name, j])), moved = [];
  const move = (jointName, at) => {
    const j = J[jointName]; if (!j) throw new Error("applyHinges: no joint " + jointName);
    const c = spec.bodies[j.childIndex], d = V.sub(c.origin, at);                         // old origin − new origin
    j.at = at.slice(); c.origin = at.slice();
    c.comLocal = V.sub(c.com, c.origin); c.comBodyLocal = V.sub(c.comBody, c.origin);
    for (const s of c.shapes) s.pos = V.add(s.pos, d);                                     // colliders stay put in the canonical pose
    const p = spec.bodies[j.parentIndex]; if (p.distal && jointName.startsWith("elbow")) p.distal = at.slice();
    moved.push({ joint: jointName, body: c.name, from: V.add(at, d), to: at.slice() });
  };
  if (hinges.lumbar) move("lumbar", hinges.lumbar);
  if (hinges.thoracic) move("thoracic", hinges.thoracic);
  if (hinges.elbow) for (const s of ["L", "R"]) if (hinges.elbow[s]) move("elbow_" + s, hinges.elbow[s]);
  // render skeleton: the bones that sit at the moved physical joints (v2_skeleton.js conventions), frames recomputed from the positions
  const P = spec.skeleton.positions;
  if (hinges.lumbar) P.spine_01 = J.lumbar.at.slice();
  if (hinges.thoracic) { P.spine_02 = J.thoracic.at.slice(); P.spine_03 = [0, (J.thoracic.at[1] + spec.landmarks.yCERV) / 2, J.thoracic.at[2]]; }
  if (hinges.elbow) for (const s of ["L", "R"]) { if (!hinges.elbow[s]) continue; const sh = J["shoulder_" + s].at, el = J["elbow_" + s].at, wr = P["hand_" + s];
    P["lowerArm_" + s] = el.slice(); P["upperArm_twist_" + s] = V.add(sh, V.sc(V.sub(el, sh), 0.5)); P["forearm_twist_" + s] = V.add(el, V.sc(V.sub(wr, el), 0.6)); }
  spec.skeleton.frames = skeletonFrames(P);
  spec.hinges = { rule: "hinge-only (RH1_PREREG.md §1.3)", source: hinges.source || null, moved };
  return spec;
}
