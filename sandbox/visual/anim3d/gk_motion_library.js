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
  id: "GK_GATHER", kind: "catch", twoHands: true, riseT: 0.55, cradleT: 0.12, absorbT: 0.24, controlT: 0.15, straightenT: 0.65,                        // sprite low_gather: READY → drop the COM, body behind the ball → hands down and FORWARD (in front of the knees) → scoop basket → ball into the body → secure → rise → upright hold
  keys: [
    [0.00, "readyUp"],
    [0.40, { name: "DROP", _pelvis: [0, -0.26, 0.05], pelvis: [26, 0, 0], spine: [10, 0, 0], chest: [4, 0, 0], neck: [-14, 0, 0], head: [-14, 0, 0],                 // knees / hips flex, torso forward ~40°, head on the ball, hands lowering in front
             thigh_R: [-64, 0, 16], shin_R: [88, 0, 0], foot_R: [-30, 0, 0], thigh_L: [-64, 0, -16], shin_L: [88, 0, 0], foot_L: [-30, 0, 0],
             upperArm_R: [-48, 0, 26], foreArm_R: [-30, 0, 0], hand_R: [-8, 0, 0], upperArm_L: [-48, 0, -26], foreArm_L: [-30, 0, 0], hand_L: [-8, 0, 0] }],
    [1.00, { name: "SCOOP", _pelvis: [0, -0.44, 0.02], pelvis: [26, 0, 0], spine: [10, 0, 0], chest: [4, 0, 0], neck: [-16, 0, 0], head: [-14, 0, 0],   // the BODY stays behind the ball: hips low, torso ~40° (not folded over the ball), shoulders forward, hands down and forward of the knees               // deep but organised crouch: shoulders forward over the knees, hands down and forward of the knees, palms open to the ball, elbows outside the knees
             thigh_R: [-84, 0, 18], shin_R: [116, 0, 0], foot_R: [-34, 0, 0], thigh_L: [-84, 0, -18], shin_L: [116, 0, 0], foot_L: [-34, 0, 0],
             upperArm_R: [-76, 0, 28], foreArm_R: [-14, 0, 0], hand_R: [-12, 0, 0], upperArm_L: [-76, 0, -28], foreArm_L: [-14, 0, 0], hand_L: [-12, 0, 0] }],
  ],
  cradle: { name: "BASKET_CLOSE", _pelvis: [0, -0.44, 0.02], pelvis: [26, 0, 0], spine: [10, 0, 0], chest: [4, 0, 0], neck: [-16, 0, 0], head: [-14, 0, 0],        // hands close under / around the ball, forearms form the basket
             thigh_R: [-84, 0, 18], shin_R: [116, 0, 0], foot_R: [-34, 0, 0], thigh_L: [-84, 0, -18], shin_L: [116, 0, 0], foot_L: [-34, 0, 0],
             upperArm_R: [-72, -22, 30], foreArm_R: [-40, 0, 0], hand_R: [-12, 0, 0], upperArm_L: [-72, 22, -30], foreArm_L: [-40, 0, 0], hand_L: [-12, 0, 0] },
  absorb: { name: "SECURE", _pelvis: [0, -0.38, 0.02], pelvis: [24, 0, 0], spine: [9, 0, 0], chest: [4, 0, 0], neck: [-12, 0, 0], head: [-12, 0, 0],             // the scoop brings the ball up and back into the abdomen while still crouched
             thigh_R: [-76, 0, 18], shin_R: [106, 0, 0], foot_R: [-32, 0, 0], thigh_L: [-76, 0, -18], shin_L: [106, 0, 0], foot_L: [-32, 0, 0],
             upperArm_R: [-50, -28, 30], foreArm_R: [-104, 0, 0], hand_R: [-10, 0, 0], upperArm_L: [-50, 28, -30], foreArm_L: [-104, 0, 0], hand_L: [-10, 0, 0] },
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
// ── DISTRIBUTION group (v12; kind "dist"): the release of a HELD ball, driven by the simulation's plan (gk.dist: kind, t0, tRelease /
// tDrop / tKick, the authoritative release point, facing, side / foot). Every motion is a possession-graph continuation: it starts from
// whatever pose the body is in when the plan starts (a captured "from" key), is keyed over the plan's own times (u = prep progress,
// then v = follow-through progress), and ends in the standing SET pose over the simulation root (no cut when the plan is released).
// `_ball` = the rendered ball centre on its authored path (character frame, metres @ H_REF): the path is shifted so that it ends EXACTLY
// on the authoritative release / drop point at the release tick; `_hR` / `_hL` = which hands are on the ball (1) or free (0).
// Authored RIGHT-handed / right-footed; LEFT = mirror (poses, ball x, hand roles). Foot steps are world-fixed plants (pts) — no root sliding.
GK_MOTIONS.DIST_PUTDOWN = {                                                                   // PUT DOWN: hips / knees flex, torso folds forward, both hands carry the ball down to the pitch ahead of the feet, release, rise
  id: "GK_DIST_PUTDOWN", kind: "dist", symmetric: true, turnFrac: 0.35,
  prep: [
    [0.42, { name: "LOWER", _pelvis: [0, -0.26, 0.04], _ball: [0, 0.62, 0.50], _hR: 1, _hL: 1, pelvis: [30, 0, 0], spine: [14, 0, 0], chest: [8, 0, 0], neck: [-12, 0, 0], head: [-14, 0, 0],
             thigh_R: [-66, 0, 16], shin_R: [88, 0, 0], foot_R: [-30, 0, 0], thigh_L: [-66, 0, -16], shin_L: [88, 0, 0], foot_L: [-30, 0, 0],
             upperArm_R: [-56, -16, 22], foreArm_R: [-30, 0, 0], hand_R: [-8, 0, 0], upperArm_L: [-56, 16, -22], foreArm_L: [-30, 0, 0], hand_L: [-8, 0, 0] }],
    [1.00, { name: "PLACE", _pelvis: [0, -0.42, 0.02], _ball: [0, 0.11, 0.50], _hR: 1, _hL: 1, pelvis: [46, 0, 0], spine: [20, 0, 0], chest: [14, 0, 0], neck: [-18, 0, 0], head: [-16, 0, 0],   // deep squat + ~80° trunk fold: the ball reaches the pitch 0.5 m ahead of the feet
             thigh_R: [-90, 0, 18], shin_R: [120, 0, 0], foot_R: [-34, 0, 0], thigh_L: [-90, 0, -18], shin_L: [120, 0, 0], foot_L: [-34, 0, 0],
             upperArm_R: [-64, -8, 20], foreArm_R: [-6, 0, 0], hand_R: [-8, 0, 0], upperArm_L: [-64, 8, -20], foreArm_L: [-6, 0, 0], hand_L: [-8, 0, 0] }],
  ],
  post: [
    [0.45, { name: "RELEASE_RISE", _pelvis: [0, -0.30, 0.02], _hR: 0, _hL: 0, pelvis: [30, 0, 0], spine: [12, 0, 0], chest: [6, 0, 0], neck: [-14, 0, 0], head: [-14, 0, 0],                   // hands open off the ball, the body rises
             thigh_R: [-70, 0, 16], shin_R: [96, 0, 0], foot_R: [-30, 0, 0], thigh_L: [-70, 0, -16], shin_L: [96, 0, 0], foot_L: [-30, 0, 0],
             upperArm_R: [-20, 0, 28], foreArm_R: [-30, 0, 0], hand_R: [-8, 0, 0], upperArm_L: [-20, 0, -28], foreArm_L: [-30, 0, 0], hand_L: [-8, 0, 0] }],
    [1.00, "set"],
  ],
  handsOff: 0.15, steps: [],
};
GK_MOTIONS.DIST_ROLL = {                                                                      // HAND ROLL (bowl): ball to the rolling hand, backswing, a long lunge forward, the hand releases the ball ON the pitch ahead
  id: "GK_DIST_ROLL_R", kind: "dist", turnFrac: 0.30,
  prep: [
    [0.30, { name: "CARRY", _pelvis: [0.02, -0.12, 0.00], _ball: [0.30, 1.00, 0.32], _hR: 1, _hL: 1, pelvis: [14, 8, -2], spine: [6, 4, 0], chest: [4, 2, 0], neck: [-10, -10, 0], head: [-10, -8, 0],   // the ball comes off the chest to the rolling side, the far hand still on it
             thigh_R: [-36, 0, 16], shin_R: [50, 0, 0], foot_R: [-26, 0, 0], thigh_L: [-36, 0, -14], shin_L: [50, 0, 0], foot_L: [-26, 0, 0],
             upperArm_R: [-20, -10, 36], foreArm_R: [-70, 0, 0], hand_R: [-8, 0, 0], upperArm_L: [-50, 20, -26], foreArm_L: [-80, 0, 0], hand_L: [-8, 0, 0] }],
    [0.58, { name: "BACKSWING", _pelvis: [0.04, -0.22, -0.04], _ball: [0.30, 0.95, -0.50], _hR: 1, _hL: 0, pelvis: [24, 22, -4], spine: [10, 12, -2], chest: [6, 8, 0], neck: [-14, -30, 0], head: [-12, -20, 0],   // one hand: the arm swings back, hips turn, knees load; the free arm points the way
             thigh_R: [-44, 0, 18], shin_R: [64, 0, 0], foot_R: [-24, 0, 0], thigh_L: [-52, 0, -16], shin_L: [70, 0, 0], foot_L: [-26, 0, 0],
             upperArm_R: [40, 0, 26], foreArm_R: [-14, 0, 0], hand_R: [-8, 0, 0], upperArm_L: [-76, 0, -30], foreArm_L: [-24, 0, 0], hand_L: [-6, 0, 0] }],
    [1.00, { name: "RELEASE_LOW", _pelvis: [0.02, -0.36, 0.20], _ball: [0.22, 0.11, 0.60], _hR: 1, _hL: 0, pelvis: [50, -6, 0], spine: [22, -4, 0], chest: [12, -2, 0], neck: [-20, 0, 0], head: [-16, 0, 0],   // deep lunge, trunk folded: the hand lets the ball go at pitch level ahead of the front foot
             thigh_R: [-96, 0, 16], shin_R: [112, 0, 0], foot_R: [-30, 0, 0], thigh_L: [-26, 0, -14], shin_L: [40, 0, 0], foot_L: [24, 0, 0],
             upperArm_R: [-62, 0, 14], foreArm_R: [-4, 0, 0], hand_R: [-8, 0, 0], upperArm_L: [-24, 0, -46], foreArm_L: [-40, 0, 0], hand_L: [-6, 0, 0] }],
  ],
  post: [
    [0.50, { name: "FOLLOW_LOW", _pelvis: [0.00, -0.26, 0.16], _hR: 0, _hL: 0, pelvis: [34, -4, 0], spine: [14, -2, 0], chest: [8, 0, 0], neck: [-18, 0, 0], head: [-14, 0, 0],                   // the arm follows through low along the roll line, the body starts to rise
             thigh_R: [-80, 0, 16], shin_R: [96, 0, 0], foot_R: [-30, 0, 0], thigh_L: [-34, 0, -14], shin_L: [46, 0, 0], foot_L: [14, 0, 0],
             upperArm_R: [-96, 0, 16], foreArm_R: [-10, 0, 0], hand_R: [-8, 0, 0], upperArm_L: [-20, 0, -40], foreArm_L: [-40, 0, 0], hand_L: [-6, 0, 0] }],
    [1.00, "set"],
  ],
  handsOff: 0.12, handRelease: { hand: "L", from: 0.28, to: 0.40 },                          // the far hand leaves the ball while it is still beside the hip (before the backswing carries it behind the body)
  steps: [{ phase: "prep", at: 0.40, foot: "R", pt: [0.22, 0.48] }, { phase: "post", at: 0.55, foot: "L", pt: [-0.20, 0.30] }, { phase: "post", at: 0.85, foot: "R", pt: [0.20, 0.02] }, { phase: "post", at: 0.95, foot: "L", pt: [-0.20, 0.02] }],   // lunge onto the rolling-side foot, then step back to the stance over the root
};
GK_MOTIONS.DIST_THROW = {                                                                     // OVERARM THROW: ball to the throwing hand, hips / shoulders open (wind-up, weight back), the opposite foot steps, the trunk rotates through and the arm comes over the top; release forward-up; follow through across the body; the back foot steps up
  id: "GK_DIST_THROW_R", kind: "dist", turnFrac: 0.30,
  prep: [
    [0.30, { name: "CARRY", _pelvis: [0.04, -0.10, -0.02], _ball: [0.34, 1.35, 0.24], _hR: 1, _hL: 1, pelvis: [8, 10, 0], spine: [4, 6, 0], chest: [2, 4, 0], neck: [-10, -14, 0], head: [-10, -10, 0],   // the ball leaves the chest toward the throwing shoulder, both hands
             thigh_R: [-30, 0, 16], shin_R: [42, 0, 0], foot_R: [-26, 0, 0], thigh_L: [-34, 0, -12], shin_L: [40, 0, 0], foot_L: [-22, 0, 0],
             upperArm_R: [-30, -10, 40], foreArm_R: [-90, 0, 0], hand_R: [-8, 0, 0], upperArm_L: [-60, 20, -22], foreArm_L: [-90, 0, 0], hand_L: [-8, 0, 0] }],
    [0.58, { name: "WIND_UP", _pelvis: [0.06, -0.10, -0.06], _ball: [0.34, 1.25, -0.70], _hR: 1, _hL: 0, pelvis: [6, 22, 0], spine: [2, 14, 0], chest: [0, 8, 0], neck: [-8, -32, 0], head: [-8, -24, 0],   // one hand: the arm extends back at shoulder height, hips + shoulders turned away (~44°), weight on the back foot, the front foot stepped, the free arm sights the target
             thigh_R: [-26, 0, 16], shin_R: [38, 0, 0], foot_R: [-26, 0, 0], thigh_L: [-44, 0, -12], shin_L: [28, 0, 0], foot_L: [-8, 0, 0],
             upperArm_R: [76, 0, 44], foreArm_R: [-34, 0, 0], hand_R: [-8, 0, 0], upperArm_L: [-100, 0, -26], foreArm_L: [-8, 0, 0], hand_L: [-6, 0, 0] }],
    [1.00, { name: "RELEASE_OVER", _pelvis: [0.02, -0.10, 0.22], _ball: [0.28, 1.78, 0.85], _hR: 1, _hL: 0, pelvis: [10, -12, 0], spine: [8, -10, 0], chest: [6, -8, 0], neck: [-14, 16, 0], head: [-12, 12, 0],   // hips drive through (weight onto the front foot, pelvis 0.22 m forward), trunk rotated toward the target, the arm comes over the top: release forward-up at full arm extension
             thigh_R: [-8, 0, 16], shin_R: [22, 0, 0], foot_R: [12, 0, 0], thigh_L: [-52, 0, -14], shin_L: [52, 0, 0], foot_L: [-26, 0, 0],
             upperArm_R: [-135, 0, 18], foreArm_R: [-12, 0, 0], hand_R: [-8, 0, 0], upperArm_L: [-16, 0, -30], foreArm_L: [-60, 0, 0], hand_L: [-6, 0, 0] }],
  ],
  post: [
    [0.45, { name: "FOLLOW_ACROSS", _pelvis: [-0.02, -0.16, 0.26], _hR: 0, _hL: 0, pelvis: [20, -26, 4], spine: [12, -14, 2], chest: [8, -8, 0], neck: [-14, 20, 0], head: [-12, 14, 0],                // the arm follows through down and across the body, the trunk keeps rotating, the back foot begins to come up
             thigh_R: [-6, 0, 16], shin_R: [30, 0, 0], foot_R: [16, 0, 0], thigh_L: [-60, 0, -14], shin_L: [60, 0, 0], foot_L: [-26, 0, 0],
             upperArm_R: [-40, 0, -10], foreArm_R: [-30, 0, 0], hand_R: [-8, 0, 0], upperArm_L: [10, 0, -34], foreArm_L: [-40, 0, 0], hand_L: [-6, 0, 0] }],
    [1.00, "set"],
  ],
  handsOff: 0.10, handRelease: { hand: "L", from: 0.25, to: 0.37 },                          // the supporting hand leaves the ball at the shoulder, before the wind-up takes it back
  steps: [{ phase: "prep", at: 0.22, foot: "L", pt: [-0.22, 0.42] }, { phase: "post", at: 0.40, foot: "R", pt: [0.22, 0.30] }, { phase: "post", at: 0.75, foot: "L", pt: [-0.20, 0.02] }, { phase: "post", at: 0.92, foot: "R", pt: [0.20, 0.02] }],   // the opposite foot steps toward the target for the wind-up; after the release the back foot steps up, then both settle to the stance over the root
};
GK_MOTIONS.DIST_PUNT = {                                                                      // KICKED CLEARANCE (punt): the ball is carried forward in both hands, the plant foot steps, the hands DROP the ball (authoritative moment 1); the kicking leg swings from a backswing through the falling ball at knee height (authoritative moment 2, the leg tip meets the simulation ball) and follows through high
  id: "GK_DIST_PUNT_R", kind: "dist", turnFrac: 0.30,
  prep: [
    [0.45, { name: "CARRY_FWD", _pelvis: [0, -0.08, 0.06], _ball: [0.10, 1.15, 0.36], _hR: 1, _hL: 1, pelvis: [8, 0, 0], spine: [4, 0, 0], chest: [2, 0, 0], neck: [-12, 0, 0], head: [-14, 0, 0],       // both hands take the ball forward and off the chest, a step in
             thigh_R: [-30, 0, 14], shin_R: [42, 0, 0], foot_R: [-24, 0, 0], thigh_L: [-40, 0, -14], shin_L: [44, 0, 0], foot_L: [-22, 0, 0],
             upperArm_R: [-50, -16, 22], foreArm_R: [-50, 0, 0], hand_R: [-8, 0, 0], upperArm_L: [-50, 16, -22], foreArm_L: [-50, 0, 0], hand_L: [-8, 0, 0] }],
    [1.00, { name: "DROP", _pelvis: [0, -0.10, 0.12], _ball: [0.12, 1.05, 0.55], _hR: 1, _hL: 1, pelvis: [10, 0, 0], spine: [4, 0, 0], chest: [2, 0, 0], neck: [-16, 0, 0], head: [-18, 0, 0],           // arms extended forward at waist height, the plant foot forward: the hands open and let the ball fall
             thigh_R: [-30, 0, 14], shin_R: [40, 0, 0], foot_R: [-20, 0, 0], thigh_L: [-46, 0, -14], shin_L: [46, 0, 0], foot_L: [-20, 0, 0],
             upperArm_R: [-60, -10, 20], foreArm_R: [-30, 0, 0], hand_R: [-8, 0, 0], upperArm_L: [-60, 10, -20], foreArm_L: [-30, 0, 0], hand_L: [-8, 0, 0] }],
  ],
  fall: [                                                                                     // between the DROP and the KICK (the ball's own free fall, ~0.35 s): backswing → the leg swings through
    [0.45, { name: "BACKSWING", _pelvis: [-0.04, -0.04, 0.14], _hR: 0, _hL: 0, pelvis: [12, 0, 4], spine: [6, 0, 2], chest: [4, 0, 0], neck: [-18, 0, 0], head: [-16, 0, 0],   // tall on the plant leg (hip ~0.93 m): the kicking leg swings back, knee folded
             thigh_R: [26, 0, 10], shin_R: [80, 0, 0], foot_R: [20, 0, 0], thigh_L: [-14, 0, -12], shin_L: [16, 0, 0], foot_L: [-22, 0, 0],
             upperArm_R: [-30, 0, 40], foreArm_R: [-30, 0, 0], hand_R: [-8, 0, 0], upperArm_L: [-60, 0, -56], foreArm_L: [-40, 0, 0], hand_L: [-8, 0, 0] }],
    [1.00, { name: "KICK", _pelvis: [-0.06, -0.04, 0.18], _hR: 0, _hL: 0, pelvis: [12, 0, 6], spine: [8, 0, 4], chest: [4, 0, 2], neck: [-18, 0, 0], head: [-14, 0, 0],                               // contact: the leg swings through the ball at knee height ahead of the plant foot (knee ~35° flexed, foot plantar-flexed: laces under the ball); the foot is solved onto the simulation ball
             thigh_R: [-50, 0, 10], shin_R: [30, 0, 0], foot_R: [32, 0, 0], thigh_L: [-12, 0, -12], shin_L: [14, 0, 0], foot_L: [-20, 0, 0],
             upperArm_R: [-20, 0, 50], foreArm_R: [-30, 0, 0], hand_R: [-8, 0, 0], upperArm_L: [-56, 0, -60], foreArm_L: [-40, 0, 0], hand_L: [-8, 0, 0] }],
  ],
  post: [
    [0.22, { name: "FOLLOW_HIGH", _pelvis: [-0.06, -0.02, 0.22], _hR: 0, _hL: 0, pelvis: [2, 0, 6], spine: [-2, 0, 4], chest: [-2, 0, 2], neck: [-14, 0, 0], head: [-12, 0, 0],                        // the kicking leg follows through high (~0.2 s after contact), the trunk opens
             thigh_R: [-96, 0, 10], shin_R: [24, 0, 0], foot_R: [36, 0, 0], thigh_L: [-8, 0, -12], shin_L: [10, 0, 0], foot_L: [-30, 0, 0],
             upperArm_R: [-10, 0, 60], foreArm_R: [-20, 0, 0], hand_R: [-8, 0, 0], upperArm_L: [-30, 0, -70], foreArm_L: [-30, 0, 0], hand_L: [-8, 0, 0] }],
    [0.55, { name: "LAND", _pelvis: [-0.02, -0.08, 0.26], _hR: 0, _hL: 0, pelvis: [10, 0, 2], spine: [4, 0, 2], chest: [2, 0, 0], neck: [-12, 0, 0], head: [-12, 0, 0],                               // the kicking leg comes down ahead, the body settles onto it
             thigh_R: [-36, 0, 12], shin_R: [30, 0, 0], foot_R: [-10, 0, 0], thigh_L: [-20, 0, -12], shin_L: [30, 0, 0], foot_L: [-24, 0, 0],
             upperArm_R: [-20, 0, 34], foreArm_R: [-40, 0, 0], hand_R: [-8, 0, 0], upperArm_L: [-30, 0, -40], foreArm_L: [-40, 0, 0], hand_L: [-8, 0, 0] }],
    [1.00, "set"],
  ],
  handsOff: 0.12, kickFoot: "R", kickFree: { from: "prep", at: 0.85 },                        // the kicking foot is free from the end of the carry (backswing) until it re-plants in the follow-through
  steps: [{ phase: "prep", at: 0.50, foot: "L", pt: [-0.20, 0.34] }, { phase: "post", at: 0.50, foot: "R", pt: [0.22, 0.40] }, { phase: "post", at: 0.80, foot: "L", pt: [-0.20, 0.02] }, { phase: "post", at: 0.95, foot: "R", pt: [0.20, 0.02] }],
};
// symmetric READY crouch (anticipation for a central LOW ball: no side load); a central ball at hand height anticipates READY_UP instead
GK_MOTIONS.READY = { name: "READY", _pelvis: [0, -0.27, 0.03], pelvis: [24, 0, 0], spine: [10, 0, 0], chest: [6, 0, 0], neck: [-10, 0, 0], head: [-14, 0, 0],
  thigh_R: [-62, 0, 18], shin_R: [92, 0, 0], foot_R: [-30, 0, 0], thigh_L: [-62, 0, -18], shin_L: [92, 0, 0], foot_L: [-30, 0, 0],
  upperArm_R: [-40, 0, 30], foreArm_R: [-72, 0, 0], hand_R: [-10, 0, 0], upperArm_L: [-40, 0, -30], foreArm_L: [-72, 0, 0], hand_L: [-10, 0, 0] };
// FOOTWORK (procedural): the simulation moves the root; the presentation plants alternating feet by an odometer (no sliding)
GK_MOTIONS.FOOTWORK = { stepLen: 0.45, lift: 0.10, leanDegPerMs: 6, maxLean: 14 };
// ── deterministic selection from authoritative facts (family from the resolver's classification, frozen at the commit) ──
// Returns { motion, key } — key "FAR_DIVE" | "LOW_DIVE" | "LOW_COLLAPSE" | "FOOT_SAVE" | "NEAR_BODY" | "CHEST_CATCH" | "HIGH_CATCH" | "GATHER" | null (no commit).
// DISTRIBUTION (a separate, later selection: the plan's kind is the simulation's decision): gkSelectDistribution(desc.dist) → { key, motion, mirror }.
function gkSelectDistribution(dist) {
  if (!dist) return { key: null, motion: null, mirror: false };
  const key = dist.kind === "PUTDOWN" ? "DIST_PUTDOWN" : dist.kind === "ROLL" ? "DIST_ROLL" : dist.kind === "THROW" ? "DIST_THROW" : dist.kind === "PUNT" ? "DIST_PUNT" : null;
  const mo = key ? GK_MOTIONS[key] : null;
  const mirror = !!mo && !mo.symmetric && (dist.kind === "PUNT" ? dist.foot === "L" : dist.side === "L");   // hand / foot convention from the simulation: authored RIGHT, mirrored for LEFT
  return { key, motion: mo, mirror };
}
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
