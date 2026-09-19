// ═══ anim3d/gk_far_dive_clip.js — AUTHORED goalkeeper far-dive lifecycle (RIGHT side; LEFT = poseMirror) ═══
// Character frame: +x = keeper's RIGHT (the dive side), +y up, +z toward the ball. Euler [pitch, yaw, roll] degrees.
//   legs / arms (bind −y): negative pitch = swing FORWARD, positive roll = swing toward +x
//   spine / chest / head (bind +y): positive pitch = bend forward, negative roll = lean RIGHT
// `_pelvis` = pelvis translation [dx, dy, dz] (m) from the bind hip (pre-commit and flight, relative to the simulation root);
// `_h` = absolute pelvis height (m) used by the post-contact stages when physics does not own the height (get-up / rise).
// Timelines (all sampled with Catmull-Rom, never linear):
//   anticipation: a = (now − shotT0) / latency ∈ [0,1]  (the simulation's READ window; lateral terms toward the PREDICTED side)
//   pre:          u = (now − t0) / execTime ∈ [0,1]     (commit → full extension; REACH pinned to execEnd / the contact tick)
//   post:         stage-local s ∈ [0,1] per landing stage (FOLLOW, DESCENT, TOUCH, ABSORB, SETTLE, GETUP, RISE); pelvis height and
//                 lateral travel come from the landing physics in gk_graph.js, the keys supply the body SHAPE.
const GK_CLIP_FAR_DIVE = {
  id: "GK_FAR_DIVE_R", side: "RIGHT", family: "AIRBORNE_DIVE", heights: ["MID", "HIGH", "TOP"],
  set: { name: "SET", _pelvis: [0, -0.10, 0], pelvis: [12, 0, 0], spine: [6, 0, 0], chest: [4, 0, 0], neck: [-8, 0, 0], head: [-10, 0, 0],
    thigh_R: [-32, 0, 14], shin_R: [46, 0, 0], foot_R: [-26, 0, 0], thigh_L: [-32, 0, -14], shin_L: [46, 0, 0], foot_L: [-26, 0, 0],
    clavicle_R: [0, 0, 0], upperArm_R: [-28, 0, 22], foreArm_R: [-68, 0, 0], hand_R: [-10, 0, 0],
    clavicle_L: [0, 0, 0], upperArm_L: [-28, 0, -22], foreArm_L: [-68, 0, 0], hand_L: [-10, 0, 0] },
  // ── READ / ANTICIPATION (inside the simulation's reaction latency) ──────────────────────────────────────────────────
  anticipation: [
    [0.00, "set"],
    [0.35, { name: "REACT", _pelvis: [0, -0.13, 0.01], pelvis: [14, 0, 0], spine: [7, 0, 0], chest: [4, 0, 0], neck: [-6, 0, 0], head: [-8, 0, 0],
             thigh_R: [-36, 0, 16], shin_R: [54, 0, 0], foot_R: [-26, 0, 0], thigh_L: [-36, 0, -16], shin_L: [54, 0, 0], foot_L: [-26, 0, 0],
             upperArm_R: [-26, 0, 34], foreArm_R: [-58, 0, 0], hand_R: [-6, 0, 0], upperArm_L: [-26, 0, -34], foreArm_L: [-58, 0, 0], hand_L: [-6, 0, 0] }],
    [0.72, { name: "WEIGHT_SHIFT", _pelvis: [0.05, -0.19, 0.01], pelvis: [16, 0, -8], spine: [8, 0, -5], chest: [4, 0, -4], neck: [-6, 0, 3], head: [-8, 0, 4],
             thigh_R: [-44, 0, 26], shin_R: [66, 0, 0], foot_R: [-28, 0, 0], thigh_L: [-34, 0, -8], shin_L: [48, 0, 0], foot_L: [-20, 0, 0],
             upperArm_R: [-20, 0, 38], foreArm_R: [-60, 0, 0], hand_R: [-6, 0, 0], upperArm_L: [-44, 0, -6], foreArm_L: [-72, 0, 0], hand_L: [-8, 0, 0] }],
    [1.00, "load"],                                                                            // fully loaded exactly at the commit tick (= pre[0])
  ],
  // ── COMMIT → FULL EXTENSION (stored energy → release) ───────────────────────────────────────────────────────────────
  pre: [
    [0.00, { name: "LOAD", _pelvis: [0.08, -0.26, 0.02], pelvis: [18, 0, -12], spine: [8, 0, -8], chest: [4, 0, -6], neck: [-6, 0, 4], head: [-10, 0, 6],
             thigh_R: [-52, 0, 30], shin_R: [80, 0, 0], foot_R: [-28, 0, 0], thigh_L: [-40, 0, -10], shin_L: [56, 0, 0], foot_L: [-16, 0, 0],
             upperArm_R: [-10, 0, 44], foreArm_R: [-40, 0, 0], hand_R: [-4, 0, 0], upperArm_L: [-50, 0, 0], foreArm_L: [-70, 0, 0], hand_L: [-8, 0, 0] }],
    [0.08, { name: "PLANT", _pelvis: [0.14, -0.24, 0.03], pelvis: [16, 0, -22], spine: [6, 0, -10], chest: [3, 0, -8], neck: [-6, 0, 6], head: [-10, 0, 8],
             thigh_R: [-40, 0, 38], shin_R: [70, 0, 0], foot_R: [-30, 0, 0], thigh_L: [-46, 0, -4], shin_L: [76, 0, 0], foot_L: [-20, 0, 0],
             upperArm_R: [-4, 0, 60], foreArm_R: [-30, 0, 0], hand_R: [-4, 0, 0], upperArm_L: [-56, 0, 14], foreArm_L: [-60, 0, 0], hand_L: [-8, 0, 0] }],
    [0.18, { name: "PUSH_OFF", _pelvis: [0.26, -0.02, 0.04], pelvis: [10, 0, -38], spine: [4, 0, -10], chest: [2, 0, -8], neck: [-4, 0, 8], head: [-8, 0, 10],
             thigh_R: [-16, 0, 44], shin_R: [30, 0, 0], foot_R: [4, 0, 0], toe_R: [-24, 0, 0], thigh_L: [-56, 0, 2], shin_L: [90, 0, 0], foot_L: [-10, 0, 0],
             upperArm_R: [-12, 0, 104], foreArm_R: [-26, 0, 0], hand_R: [-4, 0, 0], upperArm_L: [-60, 0, 46], foreArm_L: [-50, 0, 0], hand_L: [-6, 0, 0] }],
    [0.31, { name: "TOE_OFF", _pelvis: [0.36, 0.14, 0.05], pelvis: [6, 0, -52], spine: [2, 0, -12], chest: [0, 0, -8], neck: [-4, 0, 8], head: [-8, 0, 10],
             thigh_R: [-4, 0, 34], shin_R: [8, 0, 0], foot_R: [14, 0, 0], toe_R: [-46, 0, 0], thigh_L: [-42, 0, 6], shin_L: [72, 0, 0], foot_L: [-6, 0, 0],
             upperArm_R: [-16, 0, 136], foreArm_R: [-18, 0, 0], hand_R: [-2, 0, 0], upperArm_L: [-60, 0, 76], foreArm_L: [-40, 0, 0], hand_L: [-6, 0, 0] }],
    [0.55, { name: "EARLY_FLIGHT", _pelvis: [0.42, 0.20, 0.04], pelvis: [2, 0, -64], spine: [0, 0, -14], chest: [0, 0, -10], neck: [-2, 0, 10], head: [-6, 0, 12],
             thigh_R: [2, 0, 20], shin_R: [6, 0, 0], foot_R: [22, 0, 0], thigh_L: [-26, 0, 14], shin_L: [50, 0, 0], foot_L: [8, 0, 0],
             upperArm_R: [-8, 0, 160], foreArm_R: [-12, 0, 0], hand_R: [-2, 0, 0], upperArm_L: [-50, 0, 116], foreArm_L: [-32, 0, 0], hand_L: [-4, 0, 0] }],
    [0.80, { name: "MID_FLIGHT", _pelvis: [0.47, 0.28, 0.04], pelvis: [-1, 0, -70], spine: [0, 0, -15], chest: [0, 0, -11], neck: [0, 0, 10], head: [-4, 0, 12],
             thigh_R: [5, 0, 16], shin_R: [3, 0, 0], foot_R: [36, 0, 0], thigh_L: [-18, 0, 16], shin_L: [40, 0, 0], foot_L: [12, 0, 0],
             upperArm_R: [-5, 0, 170], foreArm_R: [-6, 0, 0], hand_R: [0, 0, 0], upperArm_L: [-42, 0, 134], foreArm_L: [-26, 0, 0], hand_L: [-2, 0, 0] }],
    [1.00, { name: "FULL_EXTENSION", _pelvis: [0.48, 0.30, 0.04], pelvis: [-2, 0, -72], spine: [0, 0, -16], chest: [0, 0, -12], neck: [0, 0, 10], head: [-4, 0, 12],
             thigh_R: [6, 0, 14], shin_R: [2, 0, 0], foot_R: [36, 0, 0], thigh_L: [-16, 0, 16], shin_L: [36, 0, 0], foot_L: [14, 0, 0],
             upperArm_R: [-4, 0, 172], foreArm_R: [-4, 0, 0], hand_R: [0, 0, 0], upperArm_L: [-40, 0, 140], foreArm_L: [-24, 0, 0], hand_L: [-2, 0, 0] }],
  ],
  // ── POST-CONTACT SHAPES, landing on the FEET (body axis < ~35° from vertical: a jump-tip). Pelvis height / travel = physics. ──
  postFeet: {
    FOLLOW:  { pelvis: [0, 0, -18], spine: [2, 0, -10], chest: [2, 0, -8], neck: [2, 0, 8], head: [0, 0, 10],
               thigh_R: [-6, 0, 14], shin_R: [16, 0, 0], foot_R: [26, 0, 0], thigh_L: [-14, 0, 12], shin_L: [28, 0, 0], foot_L: [12, 0, 0],
               upperArm_R: [-6, 0, 160], foreArm_R: [-14, 0, 0], hand_R: [0, 0, 0], upperArm_L: [-36, 0, 120], foreArm_L: [-30, 0, 0], hand_L: [-2, 0, 0] },
    DESCENT: { pelvis: [8, 0, -10], spine: [4, 0, -6], chest: [3, 0, -4], neck: [0, 0, 4], head: [-2, 0, 4],
               thigh_R: [-18, 0, 12], shin_R: [28, 0, 0], foot_R: [6, 0, 0], thigh_L: [-18, 0, -4], shin_L: [26, 0, 0], foot_L: [6, 0, 0],
               upperArm_R: [-24, 0, 96], foreArm_R: [-36, 0, 0], hand_R: [-4, 0, 0], upperArm_L: [-34, 0, 40], foreArm_L: [-48, 0, 0], hand_L: [-4, 0, 0] },
    TOUCH:   { pelvis: [14, 0, -6], spine: [6, 0, -3], chest: [4, 0, -2], neck: [-4, 0, 2], head: [-6, 0, 2],                              // feet meet the pitch with the legs nearly extended (pelvis ≈ standing height)
               thigh_R: [-14, 0, 14], shin_R: [20, 0, 0], foot_R: [-6, 0, 0], thigh_L: [-14, 0, -8], shin_L: [18, 0, 0], foot_L: [-4, 0, 0],
               upperArm_R: [-46, 0, 52], foreArm_R: [-30, 0, 0], hand_R: [-10, 0, 0], upperArm_L: [-40, 0, -6], foreArm_L: [-46, 0, 0], hand_L: [-8, 0, 0] },
    ABSORB:  { pelvis: [30, 0, -8], spine: [12, 0, -4], chest: [8, 0, -2], neck: [-8, 0, 2], head: [-10, 0, 2],
               thigh_R: [-72, 0, 18], shin_R: [104, 0, 0], foot_R: [-30, 0, 0], thigh_L: [-66, 0, -10], shin_L: [96, 0, 0], foot_L: [-28, 0, 0],
               upperArm_R: [-62, 0, 44], foreArm_R: [-16, 0, 0], hand_R: [-16, 0, 0], upperArm_L: [-52, 0, -14], foreArm_L: [-40, 0, 0], hand_L: [-10, 0, 0] },
    SETTLE:  { _h: 0.50, pelvis: [26, 0, -10], spine: [12, 0, -4], chest: [8, 0, -2], neck: [-6, 0, 2], head: [-10, 0, 2],          // stumble: save-side knee down (thigh vertical, shin flat behind), front foot planted, hand braced
               thigh_R: [2, 0, 12], shin_R: [92, 0, 0], foot_R: [-72, 0, 0], thigh_L: [-96, 0, -12], shin_L: [96, 0, 0], foot_L: [0, 0, 0],
               upperArm_R: [-70, 0, 42], foreArm_R: [-8, 0, 0], hand_R: [-30, 0, 0], upperArm_L: [-40, 0, -20], foreArm_L: [-50, 0, 0], hand_L: [-10, 0, 0] },
    PUSH_UP: { _h: 0.64, pelvis: [26, 0, -4], spine: [12, 0, -2], chest: [8, 0, -1], neck: [-8, 0, 1], head: [-10, 0, 1],           // knee off the ground, both feet under, hand leaving the pitch
               thigh_R: [-40, 0, 16], shin_R: [78, 0, 0], foot_R: [-24, 0, 0], thigh_L: [-78, 0, -10], shin_L: [66, 0, 0], foot_L: [-10, 0, 0],
               upperArm_R: [-48, 0, 30], foreArm_R: [-40, 0, 0], hand_R: [-16, 0, 0], upperArm_L: [-36, 0, -22], foreArm_L: [-56, 0, 0], hand_L: [-12, 0, 0] },
    CROUCH:  { _h: 0.78, pelvis: [18, 0, -2], spine: [8, 0, -1], chest: [5, 0, 0], neck: [-8, 0, 0], head: [-10, 0, 0],
               thigh_R: [-48, 0, 16], shin_R: [70, 0, 0], foot_R: [-24, 0, 0], thigh_L: [-48, 0, -16], shin_L: [70, 0, 0], foot_L: [-24, 0, 0],
               upperArm_R: [-30, 0, 26], foreArm_R: [-60, 0, 0], hand_R: [-10, 0, 0], upperArm_L: [-30, 0, -26], foreArm_L: [-60, 0, 0], hand_L: [-10, 0, 0] },
  },
  // ── POST-CONTACT SHAPES, landing on the SIDE (body axis > ~60°: a genuine lateral dive). Hand/forearm first, then hip/shoulder. ──
  postSide: {
    FOLLOW:  { pelvis: [-2, 0, -76], spine: [0, 0, -14], chest: [0, 0, -10], neck: [2, 0, 8], head: [-2, 0, 10],
               thigh_R: [8, 0, 12], shin_R: [6, 0, 0], foot_R: [30, 0, 0], thigh_L: [-18, 0, 16], shin_L: [40, 0, 0], foot_L: [12, 0, 0],
               upperArm_R: [-6, 0, 164], foreArm_R: [-10, 0, 0], hand_R: [0, 0, 0], upperArm_L: [-36, 0, 130], foreArm_L: [-36, 0, 0], hand_L: [-2, 0, 0] },
    DESCENT: { pelvis: [2, 0, -80], spine: [2, 0, -10], chest: [2, 0, -6], neck: [4, 0, 6], head: [2, 0, 8],
               thigh_R: [-4, 0, 10], shin_R: [14, 0, 0], foot_R: [24, 0, 0], thigh_L: [-24, 0, 18], shin_L: [48, 0, 0], foot_L: [10, 0, 0],
               upperArm_R: [-14, 0, 140], foreArm_R: [-40, 0, 0], hand_R: [-20, 0, 0], upperArm_L: [-46, 0, 100], foreArm_L: [-60, 0, 0], hand_L: [-6, 0, 0] },
    TOUCH:   { pelvis: [4, 0, -84], spine: [4, 0, -8], chest: [4, 0, -4], neck: [6, 0, 4], head: [4, 0, 6],                            // forearm + hip meet the pitch
               thigh_R: [-10, 0, 8], shin_R: [20, 0, 0], foot_R: [20, 0, 0], thigh_L: [-34, 0, 18], shin_L: [56, 0, 0], foot_L: [10, 0, 0],
               upperArm_R: [-20, 0, 118], foreArm_R: [-70, 0, 0], hand_R: [-20, 0, 0], upperArm_L: [-50, 0, 96], foreArm_L: [-70, 0, 0], hand_L: [-6, 0, 0] },
    ABSORB:  { pelvis: [6, 0, -88], spine: [6, 0, -6], chest: [6, 0, -2], neck: [8, 0, 2], head: [6, 0, 4],
               thigh_R: [-16, 0, 6], shin_R: [30, 0, 0], foot_R: [16, 0, 0], thigh_L: [-40, 0, 20], shin_L: [64, 0, 0], foot_L: [8, 0, 0],
               upperArm_R: [-30, 0, 100], foreArm_R: [-80, 0, 0], hand_R: [-14, 0, 0], upperArm_L: [-60, 0, 80], foreArm_L: [-90, 0, 0], hand_L: [-8, 0, 0] },
    SETTLE:  { _h: 0.34, pelvis: [10, 0, -88], spine: [8, 0, -4], chest: [6, 0, -2], neck: [8, 0, 2], head: [6, 0, 2],
               thigh_R: [-24, 0, 4], shin_R: [40, 0, 0], foot_R: [10, 0, 0], thigh_L: [-52, 0, 16], shin_L: [70, 0, 0], foot_L: [4, 0, 0],
               upperArm_R: [-40, 0, 90], foreArm_R: [-90, 0, 0], hand_R: [-10, 0, 0], upperArm_L: [-70, 0, 70], foreArm_L: [-96, 0, 0], hand_L: [-8, 0, 0] },
    PUSH_UP: { _h: 0.48, pelvis: [26, 0, -52], spine: [14, 0, -10], chest: [10, 0, -6], neck: [-4, 0, 4], head: [-8, 0, 4],          // both hands under, knees under
               thigh_R: [-70, 0, 20], shin_R: [92, 0, 0], foot_R: [-8, 0, 0], thigh_L: [-44, 0, -6], shin_L: [74, 0, 0], foot_L: [-20, 0, 0],
               upperArm_R: [-70, 0, 40], foreArm_R: [-30, 0, 0], hand_R: [-20, 0, 0], upperArm_L: [-60, 0, -10], foreArm_L: [-40, 0, 0], hand_L: [-20, 0, 0] },
    CROUCH:  { _h: 0.70, pelvis: [22, 0, -14], spine: [10, 0, -4], chest: [6, 0, -2], neck: [-6, 0, 2], head: [-10, 0, 2],           // kneel → crouch
               thigh_R: [-84, 0, 14], shin_R: [96, 0, 0], foot_R: [-12, 0, 0], thigh_L: [-20, 0, -12], shin_L: [92, 0, 0], foot_L: [-40, 0, 0],
               upperArm_R: [-40, 0, 26], foreArm_R: [-50, 0, 0], hand_R: [-16, 0, 0], upperArm_L: [-40, 0, -22], foreArm_L: [-56, 0, 0], hand_L: [-16, 0, 0] },
  },
};
