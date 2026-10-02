// ═══ physchar2/spec/v2_spec.js — human specification → complete V2 body specification (plain data) + deterministic hashes ═══════════
// human → landmarks → bodies (mass / COM / inertia) → joints (frames / limits / passive) → colliders → skeleton → mapping → actuators.
// The result is plain JSON-able data; pc-style engines build from it (core/v2_jolt.js). Same input → byte-identical JSON (G0 0.1).
import { humanLandmarks, PROFILE, EQUIP, V2_REF } from "./v2_human.js";
import { buildBodies, wholeBody } from "./v2_body.js";
import { buildJoints, passiveParams, COUPLINGS, PASSIVE } from "./v2_joints.js";
import { buildColliders, disabledPairs, CONTACT } from "./v2_colliders.js";
import { BONES, skeletonPositions, skeletonFrames } from "./v2_skeleton.js";
import { jointAxisCapacities, ACTIVATION, FATIGUE } from "./v2_actuators.js";

export const SPEC_VERSION = "touchline.physchar-v2.spec/0.1 (G0)";
export function generateSpec(human = V2_REF) {
  const Lm = humanLandmarks(human);
  const bodies = buildBodies(Lm);
  const joints = buildJoints(bodies);
  const colliders = buildColliders(Lm, bodies);
  for (const b of bodies) b.shapes = colliders[b.name];
  const positions = skeletonPositions(Lm), frames = skeletonFrames(positions);
  for (const j of joints) {
    j.capacity = jointAxisCapacities(j, human.M);
    const capOpp = (k, dir) => { const c = j.capacity[k]; if (!c) return PASSIVE.passiveOnlyTauAtHard / PASSIVE.endRangeFracOfOpposingCapacity; return dir > 0 ? c.minus.Nm : c.plus.Nm; };   // passive-only axis: [ENG] PASSIVE.passiveOnlyTauAtHard
    j.passive = passiveParams(j, capOpp);
  }
  const toeTip = {}; for (const [s, g] of [["L", -1], ["R", 1]]) { const f = bodies.find(b => b.name === "foot_" + s); toeTip[s] = [g * Lm.hx, EQUIP.toeSpring, f.boot.tipAheadAJC]; }
  const wb = wholeBody(bodies);
  return {
    version: SPEC_VERSION,
    human: { id: human.id || null, H: human.H, M: human.M, overrides: human.overrides || {} },
    coordinate: "CCS +X anatomical right, +Y up, +Z anatomical forward (LEFT-handed, Unity numeric); metres, kg, s, rad; ground = stud-tip plane y = 0",
    landmarks: { yA: Lm.yA, yK: Lm.yK, yH: Lm.yH, yOMPH: Lm.yOMPH, yXYPH: Lm.yXYPH, ySUPR: Lm.ySUPR, yCERV: Lm.yCERV, yVERT: Lm.yVERT, ySJC: Lm.ySJC,
      hipHalf: Lm.hx, shoulderHalf: Lm.sx, footLength: Lm.fl, sole: Lm.sole, closure: Lm.closure, legLength: Lm.legLen, segLen: Lm.Ls, spineAP: Lm.ap },
    profile: Object.assign({}, PROFILE, human.overrides || {}), equipment: EQUIP,
    bodies, joints, disabledPairs: disabledPairs(bodies), contact: CONTACT,
    passive: { law: PASSIVE, couplings: COUPLINGS }, activation: ACTIVATION, fatigue: FATIGUE,
    skeleton: { bones: BONES, positions, frames }, toeTip,
    totals: { mass: wb.M, massBody: bodies.reduce((s, b) => s + b.massBody, 0), massEquip: bodies.reduce((s, b) => s + b.massEquip, 0), com: wb.com, inertiaAboutCom: wb.I },
  };
}
// FNV-1a 32 over the canonical JSON text (char codes; deterministic) — the spec hash
export function fnv1a(str) { let h = 2166136261 >>> 0; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; }
export const specJSON = (spec) => JSON.stringify(spec);
export const specHash = (spec) => fnv1a(specJSON(spec)).toString(16).padStart(8, "0");
