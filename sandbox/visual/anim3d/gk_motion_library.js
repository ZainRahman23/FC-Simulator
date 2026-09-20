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
//   FOOT_SAVE     FOOT_SAVE                          — SPREAD BLOCK: COM drops, hips open, both legs spread laterally, the saving foot meets the simulation's leg tip,
//                 the support leg squats, torso counter-leans; contact on the leg; leg retracts → SET
//   NEAR_BODY     NEAR_BODY_SAVE (catch group v10: RECEIVE → CRADLE → ABSORB → CONTROL → STRAIGHTEN → HOLD)                     — feet planted, one step out, torso lean, one- or two-hand reach → rise
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
// ── FOOT_SAVE: SPREAD BLOCK — an emergency close-range block: the keeper drops his centre of mass, opens the hips and spreads BOTH
// legs laterally (hip abduction, knees somewhat bent), arms wide, chest open to the shooter; the saving leg's foot meets the
// simulation's leg tip (lateral, ankle height); the body then commits onto the saving-side hip (side-sit, hand on the pitch) and
// recovers through the shared get-up chain from the half-kneel. NOT a forward kick: the saving leg abducts, it does not swing forward.
GK_MOTIONS.FOOT_SAVE = {
  id: "GK_FOOT_SAVE_R", kind: "spread", stepOut: 0.55, absorbT: 0.25, hold: 0.35, travel: 0.12,
  keys: [
    [0.00, "setLow"],
    [0.30, { name: "DROP_LOAD", _pelvis: [0.00, -0.30, 0.02], pelvis: [24, 0, -3], spine: [10, 0, -1], chest: [6, 0, 0], neck: [-10, 0, 0], head: [-14, 0, 0],
             thigh_R: [-50, 0, 26], shin_R: [72, 0, 0], foot_R: [-26, 0, 0], thigh_L: [-50, 0, -26], shin_L: [72, 0, 0], foot_L: [-26, 0, 0],
             upperArm_R: [-20, 0, 48], foreArm_R: [-50, 0, 0], hand_R: [-8, 0, 0], upperArm_L: [-20, 0, -48], foreArm_L: [-50, 0, 0], hand_L: [-8, 0, 0] }],   // COM drops, knees load, feet start to widen
    [0.60, { name: "HIP_OPEN", _pelvis: [0.02, -0.36, 0.02], pelvis: [20, 0, -6], spine: [8, 0, -2], chest: [6, 0, 0], neck: [-12, 0, 0], head: [-14, 0, 0],
             thigh_R: [-32, 0, 40], shin_R: [40, 0, 0], foot_R: [-22, 0, 0], thigh_L: [-36, 0, -38], shin_L: [50, 0, 0], foot_L: [-24, 0, 0],
             upperArm_R: [-30, 0, 62], foreArm_R: [-30, 0, 0], hand_R: [-8, 0, 0], upperArm_L: [-30, 0, -60], foreArm_L: [-30, 0, 0], hand_L: [-8, 0, 0] }],   // hips abduct both ways, the far foot steps out wide, arms open forward-out
    [1.00, { name: "SPREAD", _pelvis: [0.06, -0.50, 0.02], pelvis: [16, 0, -10], spine: [6, 0, -4], chest: [4, 0, -2], neck: [-14, 0, 2], head: [-16, 0, 4],
             thigh_R: [-14, 0, 72], shin_R: [18, 0, 0], foot_R: [-16, 0, 0], thigh_L: [-20, 0, -60], shin_L: [30, 0, 0], foot_L: [-16, 0, 0],
             upperArm_R: [-38, 0, 84], foreArm_R: [-14, 0, 0], hand_R: [-8, 0, 0], upperArm_L: [-38, 0, -80], foreArm_L: [-14, 0, 0], hand_L: [-8, 0, 0] }],   // pelvis 0.45 m, saving leg ~72° abducted, knee ~18° (foot on the simulation's tip), far leg ~60° abducted, knee ~30°, on its wide plant (feet ~1.9 m apart); torso low, chest open to the shooter, head up on the ball; arms wide and a little forward
  ],
  ground: { name: "GROUND", _pelvis: [0.14, -0.71, 0.02], pelvis: [12, 0, -30], spine: [8, 0, -8], chest: [6, 0, -6], neck: [-4, 0, 2], head: [-6, 0, 4],   // side-sit on the saving hip: saving leg still extended along the pitch, far leg folded in, saving hand to the pitch
            thigh_R: [-6, 0, 118], shin_R: [12, 0, 0], foot_R: [-10, 0, 0], thigh_L: [-70, 0, -24], shin_L: [110, 0, 0], foot_L: [-20, 0, 0],
            upperArm_R: [-10, 0, 104], foreArm_R: [-24, 0, 0], hand_R: [-10, 0, 0], upperArm_L: [-60, 0, -36], foreArm_L: [-40, 0, 0], hand_L: [-8, 0, 0] },
};
// ── CATCH group (feet planted; kind "catch"): the production sprite catch's motion language (assets/visual_v1/goalkeeper/GK_ANIM_V1.json
// chest_catch: upright ready → arms open wide (elbows OUT) → hands forward at chest height at contact → hands meet / forearms wrap →
// hug at the chest → upright hold; low_gather: deep crouch, gloves to the ground, scoop, clutch, rise to an upright hold).
// Lifecycle: READY → (keys over u) RECEIVE → CONTACT → CRADLE → ABSORB → CONTROL → STRAIGHTEN → HOLD (a stable possession state).
// The cradle closes by shoulder horizontal adduction (upperArm y) + elbow flexion — the elbows stay apart (0.55 m), the hands close
// around the rendered ball (split hand targets, outward elbow poles in the solver). No fold at the waist: spine pitch ≤ ~25° total.
GK_MOTIONS.READY_UP = { name: "READY_UP", _pelvis: [0, -0.09, 0.01], pelvis: [10, 0, 0], spine: [4, 0, 0], chest: [2, 0, 0], neck: [-8, 0, 0], head: [-10, 0, 0],   // upright goalkeeper ready: knees slightly flexed, torso ~16° total pitch, hands available in front
  thigh_R: [-30, 0, 14], shin_R: [44, 0, 0], foot_R: [-26, 0, 0], thigh_L: [-30, 0, -14], shin_L: [44, 0, 0], foot_L: [-26, 0, 0], upperArm_R: [-44, 0, 26], foreArm_R: [-72, 0, 0], hand_R: [-10, 0, 0], upperArm_L: [-44, 0, -26], foreArm_L: [-72, 0, 0], hand_L: [-10, 0, 0] };
const CATCH_HOLD = { name: "HOLD", _pelvis: [0, -0.07, 0.01], pelvis: [8, 0, 0], spine: [3, 0, 0], chest: [2, 0, 0], neck: [-8, 0, 0], head: [-8, 0, 0],       // upright possession: standing, knees slightly flexed, ball hugged at the chest, elbows apart
  thigh_R: [-30, 0, 14], shin_R: [44, 0, 0], foot_R: [-26, 0, 0], thigh_L: [-30, 0, -14], shin_L: [44, 0, 0], foot_L: [-26, 0, 0], upperArm_R: [-38, -28, 30], foreArm_R: [-104, 0, 0], hand_R: [-10, 0, 0], upperArm_L: [-38, 28, -30], foreArm_L: [-104, 0, 0], hand_L: [-10, 0, 0] };
GK_MOTIONS.CHEST_CATCH = {
  id: "GK_CHEST_CATCH", kind: "catch", twoHands: true, riseT: 0.40, cradleT: 0.12, absorbT: 0.20, controlT: 0.15, straightenT: 0.50,
  keys: [
    [0.00, "readyUp"],
    [0.45, { name: "OPEN", _pelvis: [0, -0.14, 0.02], pelvis: [12, 0, 0], spine: [5, 0, 0], chest: [3, 0, 0], neck: [-9, 0, 0], head: [-11, 0, 0],                 // small brace: knees flex, COM −5 cm, arms open wide, elbows out
             thigh_R: [-38, 0, 16], shin_R: [56, 0, 0], foot_R: [-26, 0, 0], thigh_L: [-38, 0, -16], shin_L: [56, 0, 0], foot_L: [-26, 0, 0], upperArm_R: [-66, 0, 46], foreArm_R: [-40, 0, 0], hand_R: [-8, 0, 0], upperArm_L: [-66, 0, -46], foreArm_L: [-40, 0, 0], hand_L: [-8, 0, 0] }],
    [1.00, { name: "RECEIVE", _pelvis: [0, -0.14, 0.02], pelvis: [12, 0, 0], spine: [6, 0, 0], chest: [3, 0, 0], neck: [-9, 0, 0], head: [-11, 0, 0],              // hands forward at chest height on the ball line (sprite contact frame)
             thigh_R: [-38, 0, 16], shin_R: [56, 0, 0], foot_R: [-26, 0, 0], thigh_L: [-38, 0, -16], shin_L: [56, 0, 0], foot_L: [-26, 0, 0], upperArm_R: [-78, 0, 30], foreArm_R: [-34, 0, 0], hand_R: [-6, 0, 0], upperArm_L: [-78, 0, -30], foreArm_L: [-34, 0, 0], hand_L: [-6, 0, 0] }],
  ],
  cradle: { name: "CRADLE", _pelvis: [0, -0.14, 0.02], pelvis: [13, 0, 0], spine: [7, 0, 0], chest: [4, 0, 0], neck: [-8, 0, 0], head: [-10, 0, 0],               // forearms wrap in (shoulder adduction + elbow flexion), elbows stay out
             thigh_R: [-38, 0, 16], shin_R: [56, 0, 0], foot_R: [-26, 0, 0], thigh_L: [-38, 0, -16], shin_L: [56, 0, 0], foot_L: [-26, 0, 0], upperArm_R: [-72, -28, 32], foreArm_R: [-80, 0, 0], hand_R: [-6, 0, 0], upperArm_L: [-72, 28, -32], foreArm_L: [-80, 0, 0], hand_L: [-6, 0, 0] },
  absorb: { name: "ABSORB", _pelvis: [0, -0.15, 0.02], pelvis: [14, 0, 0], spine: [8, 0, 0], chest: [4, 0, 0], neck: [-8, 0, 0], head: [-10, 0, 0],               // elbows flex, arms yield toward the body, ball cushioned to the chest
             thigh_R: [-38, 0, 16], shin_R: [56, 0, 0], foot_R: [-26, 0, 0], thigh_L: [-38, 0, -16], shin_L: [56, 0, 0], foot_L: [-26, 0, 0], upperArm_R: [-52, -30, 32], foreArm_R: [-108, 0, 0], hand_R: [-8, 0, 0], upperArm_L: [-52, 30, -32], foreArm_L: [-108, 0, 0], hand_L: [-8, 0, 0] },
  hold: CATCH_HOLD,
};
GK_MOTIONS.HIGH_CATCH = {
  id: "GK_HIGH_CATCH", kind: "catch", twoHands: true, riseT: 0.45, jumpM: 0.22, cradleT: 0.12, absorbT: 0.30, controlT: 0.15, straightenT: 0.45,   // jumpM × the simulation's launch demand = pelvis rise
  keys: [
    [0.00, "readyUp"],
    [0.45, { name: "RISING", _pelvis: [0, -0.06, 0.02], pelvis: [8, 0, 0], spine: [2, 0, 0], chest: [0, 0, 0], neck: [-12, 0, 0], head: [-16, 0, 0],
             thigh_R: [-22, 0, 14], shin_R: [28, 0, 0], foot_R: [-36, 0, 0], thigh_L: [-22, 0, -14], shin_L: [28, 0, 0], foot_L: [-36, 0, 0],
             upperArm_R: [-140, 0, 26], foreArm_R: [-24, 0, 0], hand_R: [-4, 0, 0], upperArm_L: [-140, 0, -26], foreArm_L: [-24, 0, 0], hand_L: [-4, 0, 0] }],
    [1.00, { name: "REACH_UP", _pelvis: [0, 0.02, 0.02], pelvis: [2, 0, 0], spine: [-4, 0, 0], chest: [-4, 0, 0], neck: [-16, 0, 0], head: [-22, 0, 0],            // both hands up, apart by a ball's width
             thigh_R: [-8, 0, 12], shin_R: [8, 0, 0], foot_R: [-42, 0, 0], thigh_L: [-8, 0, -12], shin_L: [8, 0, 0], foot_L: [-42, 0, 0],
             upperArm_R: [-166, 0, 16], foreArm_R: [-10, 0, 0], hand_R: [0, 0, 0], upperArm_L: [-166, 0, -16], foreArm_L: [-10, 0, 0], hand_L: [0, 0, 0] }],
  ],
  cradle: { name: "CRADLE_HIGH", _pelvis: [0, -0.04, 0.02], pelvis: [6, 0, 0], spine: [0, 0, 0], chest: [-2, 0, 0], neck: [-14, 0, 0], head: [-18, 0, 0],       // hands close on the ball overhead (elbows still apart)
             thigh_R: [-18, 0, 14], shin_R: [22, 0, 0], foot_R: [-30, 0, 0], thigh_L: [-18, 0, -14], shin_L: [22, 0, 0], foot_L: [-30, 0, 0],
             upperArm_R: [-150, -22, 22], foreArm_R: [-34, 0, 0], hand_R: [-4, 0, 0], upperArm_L: [-150, 22, -22], foreArm_L: [-34, 0, 0], hand_L: [-4, 0, 0] },
  absorb: { name: "BRING_DOWN", _pelvis: [0, -0.12, 0.02], pelvis: [12, 0, 0], spine: [6, 0, 0], chest: [3, 0, 0], neck: [-8, 0, 0], head: [-10, 0, 0],         // the secured ball comes down to the upper chest as the knees give
             thigh_R: [-38, 0, 16], shin_R: [56, 0, 0], foot_R: [-26, 0, 0], thigh_L: [-38, 0, -16], shin_L: [56, 0, 0], foot_L: [-26, 0, 0], upperArm_R: [-70, -30, 30], foreArm_R: [-100, 0, 0], hand_R: [-8, 0, 0], upperArm_L: [-70, 30, -30], foreArm_L: [-100, 0, 0], hand_L: [-8, 0, 0] },
  hold: CATCH_HOLD,
};
GK_MOTIONS.GATHER = {
  id: "GK_GATHER", kind: "catch", twoHands: true, riseT: 0.55, cradleT: 0.12, absorbT: 0.22, controlT: 0.15, straightenT: 0.65,                        // sprite low_gather: deep CROUCH (not a kneel), gloves to the ground, scoop, clutch, rise
  keys: [
    [0.00, "readyUp"],
    [0.50, { name: "CROUCH", _pelvis: [0, -0.34, 0.06], pelvis: [30, 0, 0], spine: [12, 0, 0], chest: [6, 0, 0], neck: [-12, 0, 0], head: [-14, 0, 0],
             thigh_R: [-72, 0, 18], shin_R: [104, 0, 0], foot_R: [-34, 0, 0], thigh_L: [-72, 0, -18], shin_L: [104, 0, 0], foot_L: [-34, 0, 0],
             upperArm_R: [-58, 0, 24], foreArm_R: [-34, 0, 0], hand_R: [-8, 0, 0], upperArm_L: [-58, 0, -24], foreArm_L: [-34, 0, 0], hand_L: [-8, 0, 0] }],
    [1.00, { name: "SCOOP", _pelvis: [0, -0.48, 0.10], pelvis: [36, 0, 0], spine: [14, 0, 0], chest: [6, 0, 0], neck: [-14, 0, 0], head: [-14, 0, 0],             // gloves to the ground in front of the feet, palms open
             thigh_R: [-82, 0, 18], shin_R: [118, 0, 0], foot_R: [-38, 0, 0], thigh_L: [-82, 0, -18], shin_L: [118, 0, 0], foot_L: [-38, 0, 0],
             upperArm_R: [-84, 0, 22], foreArm_R: [-12, 0, 0], hand_R: [-10, 0, 0], upperArm_L: [-84, 0, -22], foreArm_L: [-12, 0, 0], hand_L: [-10, 0, 0] }],
  ],
  cradle: { name: "SCOOP_CLOSE", _pelvis: [0, -0.48, 0.10], pelvis: [36, 0, 0], spine: [14, 0, 0], chest: [6, 0, 0], neck: [-14, 0, 0], head: [-14, 0, 0],        // hands close under / around the ball at the ground
             thigh_R: [-82, 0, 18], shin_R: [118, 0, 0], foot_R: [-38, 0, 0], thigh_L: [-82, 0, -18], shin_L: [118, 0, 0], foot_L: [-38, 0, 0],
             upperArm_R: [-80, -26, 24], foreArm_R: [-40, 0, 0], hand_R: [-10, 0, 0], upperArm_L: [-80, 26, -24], foreArm_L: [-40, 0, 0], hand_L: [-10, 0, 0] },
  absorb: { name: "CLUTCH", _pelvis: [0, -0.40, 0.08], pelvis: [30, 0, 0], spine: [12, 0, 0], chest: [6, 0, 0], neck: [-10, 0, 0], head: [-12, 0, 0],            // ball clutched to the belly while still crouched
             thigh_R: [-74, 0, 18], shin_R: [106, 0, 0], foot_R: [-34, 0, 0], thigh_L: [-74, 0, -18], shin_L: [106, 0, 0], foot_L: [-34, 0, 0],
             upperArm_R: [-56, -30, 30], foreArm_R: [-108, 0, 0], hand_R: [-10, 0, 0], upperArm_L: [-56, 30, -30], foreArm_L: [-108, 0, 0], hand_L: [-10, 0, 0] },
  hold: CATCH_HOLD,
};
GK_MOTIONS.NEAR_BODY = {
  id: "GK_NEAR_BODY_R", kind: "catch", stepOut: 0.30, riseT: 0.40, twoHandsLat: 0.30, cradleT: 0.14, absorbT: 0.22, controlT: 0.15, straightenT: 0.45,   // one step out + lean, near hand reaches; a caught ball is cradled and brought to the chest
  keys: [
    [0.00, "readyUp"],
    [0.50, { name: "REACH_MID", _pelvis: [0.06, -0.18, 0.02], pelvis: [14, 0, -10], spine: [6, 0, -8], chest: [4, 0, -6], neck: [-8, 0, 4], head: [-10, 0, 6],
             thigh_R: [-42, 0, 26], shin_R: [64, 0, 0], foot_R: [-24, 0, 0], thigh_L: [-38, 0, -10], shin_L: [56, 0, 0], foot_L: [-26, 0, 0],
             upperArm_R: [-30, 0, 70], foreArm_R: [-30, 0, 0], hand_R: [-6, 0, 0], upperArm_L: [-46, 0, -20], foreArm_L: [-60, 0, 0], hand_L: [-8, 0, 0] }],
    [1.00, { name: "REACH", _pelvis: [0.12, -0.20, 0.02], pelvis: [14, 0, -18], spine: [6, 0, -14], chest: [4, 0, -10], neck: [-8, 0, 6], head: [-10, 0, 8],
             thigh_R: [-44, 0, 34], shin_R: [66, 0, 0], foot_R: [-22, 0, 0], thigh_L: [-34, 0, -8], shin_L: [50, 0, 0], foot_L: [-26, 0, 0],
             upperArm_R: [-26, 0, 96], foreArm_R: [-16, 0, 0], hand_R: [-4, 0, 0], upperArm_L: [-52, 0, -18], foreArm_L: [-60, 0, 0], hand_L: [-8, 0, 0] }],
  ],
  cradle: { name: "NEAR_CRADLE", _pelvis: [0.10, -0.20, 0.02], pelvis: [14, 0, -14], spine: [6, 0, -10], chest: [4, 0, -8], neck: [-8, 0, 4], head: [-10, 0, 6],   // the far hand joins the near one around the ball
             thigh_R: [-44, 0, 32], shin_R: [66, 0, 0], foot_R: [-22, 0, 0], thigh_L: [-36, 0, -8], shin_L: [52, 0, 0], foot_L: [-26, 0, 0],
             upperArm_R: [-40, -20, 84], foreArm_R: [-40, 0, 0], hand_R: [-6, 0, 0], upperArm_L: [-70, 30, -10], foreArm_L: [-60, 0, 0], hand_L: [-8, 0, 0] },
  absorb: { name: "NEAR_ABSORB", _pelvis: [0.06, -0.16, 0.02], pelvis: [12, 0, -6], spine: [6, 0, -4], chest: [3, 0, -2], neck: [-8, 0, 2], head: [-10, 0, 2],     // ball brought to the chest, lean straightens
             thigh_R: [-40, 0, 24], shin_R: [60, 0, 0], foot_R: [-26, 0, 0], thigh_L: [-38, 0, -14], shin_L: [56, 0, 0], foot_L: [-26, 0, 0],
             upperArm_R: [-52, -30, 32], foreArm_R: [-108, 0, 0], hand_R: [-8, 0, 0], upperArm_L: [-52, 30, -32], foreArm_L: [-108, 0, 0], hand_L: [-8, 0, 0] },
  hold: CATCH_HOLD,
};
// symmetric READY crouch (anticipation for a central LOW ball: no side load); a central ball at hand height anticipates READY_UP instead
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
