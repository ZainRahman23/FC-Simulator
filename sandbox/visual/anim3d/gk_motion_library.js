// ═══ anim3d/gk_motion_library.js — goalkeeper MOTION LIBRARY: canonical skeletal motions + deterministic selection ═══
// SIMULATION DECIDES WHAT HAPPENS; these motions visually explain it. Every selection input below is an authoritative fact
// already exposed by the simulation / resolver (commit record, classification, contact record, held state, leg tip, root
// velocity). Nothing here writes gk / ball state.
//
// Canonical motions (biomechanically distinct; everything else is deterministic adaptation of these):
//   FAR_DIVE      AIRBORNE_DIVE, MID / HIGH / TOP  — the approved v6 lifecycle (frozen): load → push-off → arc → contact → feet-first
//                 or side landing (blend by body-axis angle) → settle → get-up → reposition
//   LOW_DIVE      AIRBORNE_DIVE, LOW-MID            — same load / push mechanics, then a LOW sideways launch: body horizontal (never
//                 inverted), both arms reaching down to the ball, side landing (forearm / hip), side get-up
//   LOW_COLLAPSE  LOW_COLLAPSE                       — no flight: the near leg folds, the body drops onto the hip toward a low ball
//                 within the lateral envelope, hands go down together; settle on the side → shared get-up
//   FOOT_SAVE     FOOT_SAVE                          — planted: the lead leg sweeps out along the pitch to the simulation's leg tip,
//                 the support leg squats, torso counter-leans; contact on the leg; leg retracts → SET
//   NEAR_BODY     NEAR_BODY_SAVE                     — feet planted, one step out, torso lean, one- or two-hand reach → rise
//   CHEST_CATCH   CHEST_CATCH / SUPPORTED_CATCH      — hands out in front, ball into the chest, absorb / hug when held
//   HIGH_CATCH    HIGH_CATCH                         — both hands up over the head, rise on the toes (jump by the simulation's launch
//                 demand), catch (bring down) or parry (follow through)
//   GATHER        LOW_GATHER                         — long-barrier kneel: near knee down behind the front foot, hands scoop → hug → rise
//   + FOOTWORK (procedural stepping from the simulation root velocity, pre-shot), HOLD (ball held: both hands on the authoritative ball)
//
// Conventions (skeleton.js): pose eulers [pitch, yaw, roll] deg; legs / arms bind −y: negative pitch = forward, positive roll = toward
// +x (the keeper's RIGHT); spine / head: positive pitch = forward bend, negative roll = lean right. RIGHT-side motions are authored;
// LEFT = mirror (poseMirrorP). `_pelvis` offsets are metres for H_REF and are scaled by the skeleton height at sample time.
const GK_MOTION_H_REF = 1.90;   // the simulation keeper's height: authored metres are exact for it, proportional for any other body
const GK_MOTIONS = {};
// ── LOW_DIVE: the far dive's load / plant / push / toe-off keys, then a low extension (both arms down to the ball) ──
GK_MOTIONS.LOW_DIVE = {
  id: "GK_LOW_DIVE_R", kind: "dive", rollMax: 82, twoHands: true,
  preTail: [                                                                                    // appended after the far dive's TOE_OFF key (u 0.31)
    [0.55, { name: "EARLY_FLIGHT_LOW", _pelvis: [0.40, 0.06, 0.04], pelvis: [4, 0, -60], spine: [2, 0, -12], chest: [2, 0, -8], neck: [0, 0, 8], head: [-4, 0, 10],
             thigh_R: [4, 0, 16], shin_R: [6, 0, 0], foot_R: [22, 0, 0], thigh_L: [-22, 0, 14], shin_L: [46, 0, 0], foot_L: [8, 0, 0],
             upperArm_R: [-30, 0, 150], foreArm_R: [-10, 0, 0], hand_R: [0, 0, 0], upperArm_L: [-50, 0, 110], foreArm_L: [-40, 0, 0], hand_L: [-2, 0, 0] }],
    [0.80, { name: "MID_FLIGHT_LOW", _pelvis: [0.44, 0.04, 0.04], pelvis: [2, 0, -72], spine: [0, 0, -14], chest: [0, 0, -10], neck: [2, 0, 8], head: [-2, 0, 10],
             thigh_R: [6, 0, 14], shin_R: [4, 0, 0], foot_R: [30, 0, 0], thigh_L: [-18, 0, 16], shin_L: [40, 0, 0], foot_L: [12, 0, 0],
             upperArm_R: [-28, 0, 160], foreArm_R: [-6, 0, 0], hand_R: [0, 0, 0], upperArm_L: [-46, 0, 128], foreArm_L: [-30, 0, 0], hand_L: [-2, 0, 0] }],
    [1.00, { name: "FULL_EXTENSION_LOW", _pelvis: [0.46, 0.02, 0.04], pelvis: [0, 0, -80], spine: [0, 0, -14], chest: [0, 0, -10], neck: [2, 0, 8], head: [-2, 0, 10],
             thigh_R: [8, 0, 12], shin_R: [2, 0, 0], foot_R: [36, 0, 0], thigh_L: [-16, 0, 16], shin_L: [36, 0, 0], foot_L: [14, 0, 0],
             upperArm_R: [-26, 0, 168], foreArm_R: [-4, 0, 0], hand_R: [0, 0, 0], upperArm_L: [-44, 0, 140], foreArm_L: [-24, 0, 0], hand_L: [-2, 0, 0] }],
  ],
};
// ── LOW_COLLAPSE: no flight — fold the near leg, drop onto the hip, hands down together to the ball ──
GK_MOTIONS.LOW_COLLAPSE = {
  id: "GK_LOW_COLLAPSE_R", kind: "collapse", twoHands: true, hGround: 0.29, lateral: 0.36,
  keys: [
    [0.00, "load"],
    [0.35, { name: "DROP", _pelvis: [0.18, -0.45, 0.04], pelvis: [24, 0, -30], spine: [12, 0, -10], chest: [6, 0, -6], neck: [-6, 0, 4], head: [-10, 0, 6],
             thigh_R: [-40, 0, 40], shin_R: [70, 0, 0], foot_R: [-20, 0, 0], thigh_L: [-60, 0, -14], shin_L: [96, 0, 0], foot_L: [-30, 0, 0],
             upperArm_R: [-40, 0, 70], foreArm_R: [-30, 0, 0], hand_R: [-6, 0, 0], upperArm_L: [-60, 0, 20], foreArm_L: [-50, 0, 0], hand_L: [-6, 0, 0] }],
    [0.70, { name: "KNEE_DOWN", _pelvis: [0.30, -0.58, 0.04], pelvis: [22, 0, -60], spine: [10, 0, -8], chest: [6, 0, -4], neck: [0, 0, 4], head: [-4, 0, 6],
             thigh_R: [-20, 0, 20], shin_R: [40, 0, 0], foot_R: [-10, 0, 0], thigh_L: [-80, 0, -10], shin_L: [110, 0, 0], foot_L: [-20, 0, 0],
             upperArm_R: [-50, 0, 100], foreArm_R: [-40, 0, 0], hand_R: [-10, 0, 0], upperArm_L: [-70, 0, 40], foreArm_L: [-60, 0, 0], hand_L: [-8, 0, 0] }],
    [1.00, { name: "GROUND", _pelvis: [0.36, -0.66, 0.04], pelvis: [16, 0, -84], spine: [8, 0, -4], chest: [6, 0, -2], neck: [6, 0, 2], head: [4, 0, 4],
             thigh_R: [-30, 0, 0], shin_R: [56, 0, 0], foot_R: [0, 0, 0], thigh_L: [-52, 0, -16], shin_L: [78, 0, 0], foot_L: [-4, 0, 0],
             upperArm_R: [-50, 0, 110], foreArm_R: [-30, 0, 0], hand_R: [-10, 0, 0], upperArm_L: [-70, 0, 60], foreArm_L: [-50, 0, 0], hand_L: [-8, 0, 0] }],
  ],
};
// ── FOOT_SAVE: planted; the lead (ball-side) leg sweeps out along the pitch, the support leg squats, torso counter-leans ──
GK_MOTIONS.FOOT_SAVE = {
  id: "GK_FOOT_SAVE_R", kind: "foot", retractT: 0.35,
  keys: [
    [0.00, "setLow"],
    [0.50, { name: "LEG_OUT_MID", _pelvis: [-0.06, -0.28, 0.02], pelvis: [14, 0, 8], spine: [6, 0, 8], chest: [4, 0, 6], neck: [-8, 0, -4], head: [-10, 0, -6],
             thigh_R: [-20, 0, 45], shin_R: [30, 0, 0], foot_R: [-24, 0, 0], thigh_L: [-52, 0, -8], shin_L: [82, 0, 0], foot_L: [-30, 0, 0],
             upperArm_R: [-30, 0, 50], foreArm_R: [-30, 0, 0], hand_R: [-6, 0, 0], upperArm_L: [-30, 0, -60], foreArm_L: [-30, 0, 0], hand_L: [-6, 0, 0] }],
    [1.00, { name: "LEG_OUT", _pelvis: [-0.10, -0.32, 0.02], pelvis: [12, 0, 12], spine: [6, 0, 12], chest: [4, 0, 10], neck: [-8, 0, -6], head: [-10, 0, -8],
             thigh_R: [-8, 0, 72], shin_R: [8, 0, 0], foot_R: [-30, 0, 0], thigh_L: [-56, 0, -10], shin_L: [88, 0, 0], foot_L: [-32, 0, 0],
             upperArm_R: [-46, 0, 44], foreArm_R: [-22, 0, 0], hand_R: [-6, 0, 0], upperArm_L: [-24, 0, -66], foreArm_L: [-30, 0, 0], hand_L: [-6, 0, 0] }],   // near hand drops toward the ball, far arm out for balance
  ],
};
// ── standing group (feet planted): keys over the execution u, a held pose for a caught ball, rise back to SET ──
GK_MOTIONS.NEAR_BODY = {
  id: "GK_NEAR_BODY_R", kind: "standing", stepOut: 0.30, riseT: 0.40, twoHandsLat: 0.30,
  keys: [
    [0.00, "setLow"],
    [0.50, { name: "REACH_MID", _pelvis: [0.06, -0.24, 0.02], pelvis: [16, 0, -10], spine: [8, 0, -8], chest: [6, 0, -6], neck: [-8, 0, 4], head: [-10, 0, 6],
             thigh_R: [-42, 0, 26], shin_R: [64, 0, 0], foot_R: [-24, 0, 0], thigh_L: [-40, 0, -10], shin_L: [60, 0, 0], foot_L: [-26, 0, 0],
             upperArm_R: [-24, 0, 70], foreArm_R: [-30, 0, 0], hand_R: [-6, 0, 0], upperArm_L: [-40, 0, -14], foreArm_L: [-70, 0, 0], hand_L: [-8, 0, 0] }],
    [1.00, { name: "REACH", _pelvis: [0.12, -0.26, 0.02], pelvis: [16, 0, -18], spine: [8, 0, -14], chest: [6, 0, -10], neck: [-8, 0, 6], head: [-10, 0, 8],
             thigh_R: [-44, 0, 34], shin_R: [66, 0, 0], foot_R: [-22, 0, 0], thigh_L: [-34, 0, -8], shin_L: [50, 0, 0], foot_L: [-26, 0, 0],
             upperArm_R: [-20, 0, 96], foreArm_R: [-16, 0, 0], hand_R: [-4, 0, 0], upperArm_L: [-44, 0, -12], foreArm_L: [-72, 0, 0], hand_L: [-8, 0, 0] }],
  ],
  hold: { name: "NEAR_HUG", _pelvis: [0.04, -0.22, 0.02], pelvis: [18, 0, -4], spine: [10, 0, -2], chest: [8, 0, 0], neck: [-6, 0, 0], head: [-8, 0, 0],
          thigh_R: [-40, 0, 20], shin_R: [62, 0, 0], foot_R: [-26, 0, 0], thigh_L: [-40, 0, -14], shin_L: [62, 0, 0], foot_L: [-26, 0, 0],
          upperArm_R: [-54, 0, 10], foreArm_R: [-112, 0, 0], hand_R: [-10, 0, 0], upperArm_L: [-54, 0, -10], foreArm_L: [-112, 0, 0], hand_L: [-10, 0, 0] },
};
GK_MOTIONS.CHEST_CATCH = {
  id: "GK_CHEST_CATCH", kind: "standing", riseT: 0.40, twoHands: true,
  keys: [
    [0.00, "setLow"],
    [0.50, { name: "HANDS_OUT", _pelvis: [0, -0.22, 0.03], pelvis: [16, 0, 0], spine: [8, 0, 0], chest: [6, 0, 0], neck: [-8, 0, 0], head: [-10, 0, 0],
             thigh_R: [-42, 0, 16], shin_R: [62, 0, 0], foot_R: [-24, 0, 0], thigh_L: [-42, 0, -16], shin_L: [62, 0, 0], foot_L: [-24, 0, 0],
             upperArm_R: [-72, 0, 16], foreArm_R: [-46, 0, 0], hand_R: [-6, 0, 0], upperArm_L: [-72, 0, -16], foreArm_L: [-46, 0, 0], hand_L: [-6, 0, 0] }],
    [1.00, { name: "CATCH", _pelvis: [0, -0.20, 0.04], pelvis: [14, 0, 0], spine: [6, 0, 0], chest: [4, 0, 0], neck: [-6, 0, 0], head: [-8, 0, 0],
             thigh_R: [-38, 0, 16], shin_R: [56, 0, 0], foot_R: [-24, 0, 0], thigh_L: [-38, 0, -16], shin_L: [56, 0, 0], foot_L: [-24, 0, 0],
             upperArm_R: [-84, 0, 12], foreArm_R: [-26, 0, 0], hand_R: [-4, 0, 0], upperArm_L: [-84, 0, -12], foreArm_L: [-26, 0, 0], hand_L: [-4, 0, 0] }],
  ],
  hold: { name: "HUG", _pelvis: [0, -0.24, 0.02], pelvis: [22, 0, 0], spine: [14, 0, 0], chest: [10, 0, 0], neck: [-4, 0, 0], head: [-6, 0, 0],
          thigh_R: [-44, 0, 16], shin_R: [66, 0, 0], foot_R: [-26, 0, 0], thigh_L: [-44, 0, -16], shin_L: [66, 0, 0], foot_L: [-26, 0, 0],
          upperArm_R: [-52, 0, 10], foreArm_R: [-114, 0, 0], hand_R: [-12, 0, 0], upperArm_L: [-52, 0, -10], foreArm_L: [-114, 0, 0], hand_L: [-12, 0, 0] },
};
GK_MOTIONS.HIGH_CATCH = {
  id: "GK_HIGH_CATCH", kind: "standing", riseT: 0.45, twoHands: true, jumpM: 0.22,                                   // jumpM × the simulation's launch demand = pelvis rise (feet leave the pitch when it exceeds the toe rise)
  keys: [
    [0.00, "setLow"],
    [0.45, { name: "RISING", _pelvis: [0, -0.10, 0.02], pelvis: [8, 0, 0], spine: [2, 0, 0], chest: [0, 0, 0], neck: [-12, 0, 0], head: [-16, 0, 0],
             thigh_R: [-22, 0, 14], shin_R: [28, 0, 0], foot_R: [-36, 0, 0], thigh_L: [-22, 0, -14], shin_L: [28, 0, 0], foot_L: [-36, 0, 0],
             upperArm_R: [-140, 0, 20], foreArm_R: [-24, 0, 0], hand_R: [-4, 0, 0], upperArm_L: [-140, 0, -20], foreArm_L: [-24, 0, 0], hand_L: [-4, 0, 0] }],
    [1.00, { name: "REACH_UP", _pelvis: [0, 0.02, 0.02], pelvis: [2, 0, 0], spine: [-4, 0, 0], chest: [-4, 0, 0], neck: [-16, 0, 0], head: [-22, 0, 0],
             thigh_R: [-8, 0, 12], shin_R: [8, 0, 0], foot_R: [-42, 0, 0], thigh_L: [-8, 0, -12], shin_L: [8, 0, 0], foot_L: [-42, 0, 0],
             upperArm_R: [-168, 0, 10], foreArm_R: [-8, 0, 0], hand_R: [0, 0, 0], upperArm_L: [-168, 0, -10], foreArm_L: [-8, 0, 0], hand_L: [0, 0, 0] }],
  ],
  hold: { name: "BRING_DOWN", _pelvis: [0, -0.22, 0.02], pelvis: [20, 0, 0], spine: [12, 0, 0], chest: [8, 0, 0], neck: [-4, 0, 0], head: [-6, 0, 0],
          thigh_R: [-42, 0, 16], shin_R: [62, 0, 0], foot_R: [-26, 0, 0], thigh_L: [-42, 0, -16], shin_L: [62, 0, 0], foot_L: [-26, 0, 0],
          upperArm_R: [-56, 0, 10], foreArm_R: [-112, 0, 0], hand_R: [-12, 0, 0], upperArm_L: [-56, 0, -10], foreArm_L: [-112, 0, 0], hand_L: [-12, 0, 0] },
};
GK_MOTIONS.GATHER = {
  id: "GK_GATHER_R", kind: "standing", riseT: 0.55, twoHands: true, kneelSide: "R",                                    // long barrier: RIGHT knee down behind the LEFT foot (mirrored for LEFT)
  keys: [
    [0.00, "setLow"],
    [0.50, { name: "KNEEL_MID", _pelvis: [0.02, -0.42, 0.05], pelvis: [26, 0, 4], spine: [14, 0, 0], chest: [8, 0, 0], neck: [-8, 0, 0], head: [-12, 0, 0],
             thigh_R: [-26, 0, 14], shin_R: [90, 0, 0], foot_R: [-36, 0, 0], thigh_L: [-76, 0, -12], shin_L: [92, 0, 0], foot_L: [-10, 0, 0],
             upperArm_R: [-56, 0, 14], foreArm_R: [-46, 0, 0], hand_R: [-8, 0, 0], upperArm_L: [-56, 0, -14], foreArm_L: [-46, 0, 0], hand_L: [-8, 0, 0] }],
    [1.00, { name: "KNEEL", _pelvis: [0.04, -0.50, 0.08], pelvis: [30, 0, 8], spine: [16, 0, 0], chest: [10, 0, 0], neck: [-10, 0, 0], head: [-12, 0, 0],
             thigh_R: [10, 0, 10], shin_R: [110, 0, 0], foot_R: [-40, 0, 0], thigh_L: [-90, 0, -12], shin_L: [90, 0, 0], foot_L: [0, 0, 0],
             upperArm_R: [-62, 0, 12], foreArm_R: [-38, 0, 0], hand_R: [-10, 0, 0], upperArm_L: [-62, 0, -12], foreArm_L: [-38, 0, 0], hand_L: [-10, 0, 0] }],
  ],
  hold: { name: "SCOOP", _pelvis: [0.04, -0.50, 0.08], pelvis: [34, 0, 8], spine: [18, 0, 0], chest: [12, 0, 0], neck: [-8, 0, 0], head: [-10, 0, 0],
          thigh_R: [10, 0, 10], shin_R: [110, 0, 0], foot_R: [-40, 0, 0], thigh_L: [-90, 0, -12], shin_L: [90, 0, 0], foot_L: [0, 0, 0],
          upperArm_R: [-60, 0, 10], foreArm_R: [-112, 0, 0], hand_R: [-12, 0, 0], upperArm_L: [-60, 0, -10], foreArm_L: [-112, 0, 0], hand_L: [-12, 0, 0] },
};
// symmetric READY crouch (anticipation for a central ball: no side load)
GK_MOTIONS.READY = { name: "READY", _pelvis: [0, -0.27, 0.03], pelvis: [24, 0, 0], spine: [10, 0, 0], chest: [6, 0, 0], neck: [-10, 0, 0], head: [-14, 0, 0],
  thigh_R: [-62, 0, 18], shin_R: [92, 0, 0], foot_R: [-30, 0, 0], thigh_L: [-62, 0, -18], shin_L: [92, 0, 0], foot_L: [-30, 0, 0],
  upperArm_R: [-40, 0, 30], foreArm_R: [-72, 0, 0], hand_R: [-10, 0, 0], upperArm_L: [-40, 0, -30], foreArm_L: [-72, 0, 0], hand_L: [-10, 0, 0] };
// FOOTWORK (procedural): the simulation moves the root; the presentation plants alternating feet by an odometer (no sliding)
GK_MOTIONS.FOOTWORK = { stepLen: 0.45, lift: 0.10, leanDegPerMs: 6, maxLean: 14 };
// ── deterministic selection from authoritative facts (family from the resolver's classification, frozen at the commit) ──
// Returns { motion, key } — key "FAR_DIVE" | "LOW_DIVE" | "LOW_COLLAPSE" | "FOOT_SAVE" | "NEAR_BODY" | "CHEST_CATCH" | "HIGH_CATCH" | "GATHER" | null (no commit).
function gkSelectMotion(desc) {
  const c = desc.commit; if (!c) return { key: null, motion: null };
  const f = desc.family || "", h = desc.cls && desc.cls.hClass;
  let key;
  if (f === "LOW_GATHER") key = "GATHER";
  else if (f === "CHEST_CATCH" || f === "SUPPORTED_CATCH") key = "CHEST_CATCH";
  else if (f === "HIGH_CATCH") key = "HIGH_CATCH";
  else if (f === "NEAR_BODY_SAVE") key = "NEAR_BODY";
  else if (f === "FOOT_SAVE") key = "FOOT_SAVE";
  else if (f === "LOW_COLLAPSE") key = "LOW_COLLAPSE";
  else if (f === "AIRBORNE_DIVE") key = (h === "LOW-MID") ? "LOW_DIVE" : "FAR_DIVE";
  else key = desc.cls && desc.cls.feetPlanted ? "NEAR_BODY" : "FAR_DIVE";                    // deterministic, observable fallback (flagged by the backend)
  return { key, motion: key === "FAR_DIVE" ? null : GK_MOTIONS[key], fallback: !(f === "LOW_GATHER" || f === "CHEST_CATCH" || f === "SUPPORTED_CATCH" || f === "HIGH_CATCH" || f === "NEAR_BODY_SAVE" || f === "FOOT_SAVE" || f === "LOW_COLLAPSE" || f === "AIRBORNE_DIVE") };
}
