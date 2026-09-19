// ═══ anim3d/gk_far_dive_clip.js — AUTHORED goalkeeper far-dive lifecycle v3 (RIGHT side; LEFT = poseMirror) ═══
// Character frame: +x = keeper's RIGHT (the dive side), +y up, +z toward the ball. Euler [pitch, yaw, roll] degrees.
//   legs / arms (bind −y): negative pitch = swing FORWARD, positive roll = swing toward +x
//   spine / chest / head (bind +y): positive pitch = bend forward, negative roll = lean RIGHT
// `_pelvis` = pelvis translation [dx, dy, dz] (m) from the bind hip (relative to the simulation root). The crouch is produced by
// hip + knee + ankle flexion; `_pelvis.dy` states where those flexions put the pelvis (the planted feet are held by leg IK, so the
// legs must be authored consistently with the height — the ground clamp only catches residuals).
// Readability rule (pixel/2.5D camera, keeper ≈ 35 px tall): every phase must change the SILHOUETTE, not just joint angles.
const GK_CLIP_FAR_DIVE = {
  id: "GK_FAR_DIVE_R", side: "RIGHT", family: "AIRBORNE_DIVE", heights: ["MID", "HIGH", "TOP"],
  set: { name: "SET", _pelvis: [0, -0.10, 0], pelvis: [12, 0, 0], spine: [6, 0, 0], chest: [4, 0, 0], neck: [-8, 0, 0], head: [-10, 0, 0],
    thigh_R: [-32, 0, 14], shin_R: [46, 0, 0], foot_R: [-26, 0, 0], thigh_L: [-32, 0, -14], shin_L: [46, 0, 0], foot_L: [-26, 0, 0],
    clavicle_R: [0, 0, 0], upperArm_R: [-28, 0, 22], foreArm_R: [-68, 0, 0], hand_R: [-10, 0, 0],
    clavicle_L: [0, 0, 0], upperArm_L: [-28, 0, -22], foreArm_L: [-68, 0, 0], hand_L: [-10, 0, 0] },
  // ── SET CROUCH on the shooter's visible wind-up (symmetric: the side is not known yet) ─────────────────────────────
  setLow: { name: "SET_LOW", _pelvis: [0, -0.22, 0.02], pelvis: [22, 0, 0], spine: [10, 0, 0], chest: [6, 0, 0], neck: [-10, 0, 0], head: [-14, 0, 0],
    thigh_R: [-58, 0, 18], shin_R: [86, 0, 0], foot_R: [-28, 0, 0], thigh_L: [-58, 0, -18], shin_L: [86, 0, 0], foot_L: [-28, 0, 0],
    upperArm_R: [-24, 0, 34], foreArm_R: [-70, 0, 0], hand_R: [-10, 0, 0], upperArm_L: [-24, 0, -34], foreArm_L: [-70, 0, 0], hand_L: [-10, 0, 0] },
  // ── READ / ANTICIPATION (inside the simulation's reaction latency): react → weight onto the save side → DEEP load ─────
  anticipation: [
    [0.00, "setLow"],
    [0.30, { name: "REACT", _pelvis: [0.02, -0.24, 0.02], pelvis: [24, 0, -4], spine: [10, 0, -2], chest: [6, 0, -2], neck: [-10, 0, 2], head: [-14, 0, 3],
             thigh_R: [-62, 0, 20], shin_R: [92, 0, 0], foot_R: [-30, 0, 0], thigh_L: [-58, 0, -16], shin_L: [86, 0, 0], foot_L: [-28, 0, 0],
             upperArm_R: [-20, 0, 42], foreArm_R: [-60, 0, 0], hand_R: [-8, 0, 0], upperArm_L: [-30, 0, -30], foreArm_L: [-70, 0, 0], hand_L: [-8, 0, 0] }],
    [0.65, { name: "WEIGHT_SHIFT", _pelvis: [0.10, -0.30, 0.03], pelvis: [26, 0, -14], spine: [10, 0, -8], chest: [6, 0, -6], neck: [-8, 0, 5], head: [-12, 0, 6],
             thigh_R: [-70, 0, 30], shin_R: [104, 0, 0], foot_R: [-34, 0, 0], thigh_L: [-52, 0, -8], shin_L: [78, 0, 0], foot_L: [-26, 0, 0],
             upperArm_R: [-14, 0, 46], foreArm_R: [-46, 0, 0], hand_R: [-6, 0, 0], upperArm_L: [-46, 0, -10], foreArm_L: [-76, 0, 0], hand_L: [-8, 0, 0] }],
    [1.00, "load"],                                                                            // deepest load exactly at the commit tick (= pre[0])
  ],
  // ── COMMIT → FULL EXTENSION: the load is HELD through the plant, then hip → knee → ankle → toe extension with the foot planted ──
  pre: [
    [0.00, { name: "LOAD", _pelvis: [0.14, -0.36, 0.04], pelvis: [30, 0, -22], spine: [12, 0, -10], chest: [8, 0, -8], neck: [-8, 0, 6], head: [-12, 0, 8],   // deepest: knees ~65°, hips ~70°, torso 40° toward the dive
             thigh_R: [-78, 0, 36], shin_R: [118, 0, 0], foot_R: [-36, 0, 0], thigh_L: [-48, 0, -4], shin_L: [72, 0, 0], foot_L: [-22, 0, 0],
             upperArm_R: [-8, 0, 50], foreArm_R: [-30, 0, 0], hand_R: [-4, 0, 0], upperArm_L: [-56, 0, 4], foreArm_L: [-76, 0, 0], hand_L: [-8, 0, 0] }],
    [0.10, { name: "PLANT", _pelvis: [0.16, -0.36, 0.04], pelvis: [30, 0, -26], spine: [12, 0, -10], chest: [8, 0, -8], neck: [-8, 0, 6], head: [-12, 0, 8],  // held: save-side foot planted wide, weight over it
             thigh_R: [-78, 0, 40], shin_R: [118, 0, 0], foot_R: [-36, 0, 0], thigh_L: [-52, 0, 0], shin_L: [80, 0, 0], foot_L: [-24, 0, 0],
             upperArm_R: [-4, 0, 58], foreArm_R: [-26, 0, 0], hand_R: [-4, 0, 0], upperArm_L: [-60, 0, 14], foreArm_L: [-70, 0, 0], hand_L: [-8, 0, 0] }],
    [0.19, { name: "PUSH_MID", _pelvis: [0.26, -0.18, 0.05], pelvis: [20, 0, -36], spine: [8, 0, -12], chest: [4, 0, -8], neck: [-6, 0, 8], head: [-10, 0, 10],   // hips and knees extending against the planted foot
             thigh_R: [-42, 0, 44], shin_R: [66, 0, 0], foot_R: [-18, 0, 0], thigh_L: [-58, 0, 2], shin_L: [92, 0, 0], foot_L: [-12, 0, 0],
             upperArm_R: [-10, 0, 100], foreArm_R: [-22, 0, 0], hand_R: [-4, 0, 0], upperArm_L: [-60, 0, 44], foreArm_L: [-50, 0, 0], hand_L: [-6, 0, 0] }],
    [0.26, { name: "PUSH_END", _pelvis: [0.34, 0.00, 0.05], pelvis: [10, 0, -46], spine: [4, 0, -12], chest: [2, 0, -8], neck: [-4, 0, 8], head: [-8, 0, 10],   // leg nearly straight, heel lifting
             thigh_R: [-12, 0, 40], shin_R: [20, 0, 0], foot_R: [0, 0, 0], toe_R: [-14, 0, 0], thigh_L: [-46, 0, 6], shin_L: [78, 0, 0], foot_L: [-6, 0, 0],
             upperArm_R: [-14, 0, 126], foreArm_R: [-18, 0, 0], hand_R: [-2, 0, 0], upperArm_L: [-60, 0, 66], foreArm_L: [-42, 0, 0], hand_L: [-6, 0, 0] }],
    [0.31, { name: "TOE_OFF", _pelvis: [0.38, 0.14, 0.05], pelvis: [6, 0, -52], spine: [2, 0, -12], chest: [0, 0, -8], neck: [-4, 0, 8], head: [-8, 0, 10],     // on the toes: ankle extended, toe the last contact
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
  // ── POST-CONTACT SHAPES (pelvis height and lateral travel come from the landing physics; keys give the SHAPE) ───────────
  // Feet-first landing (this ball: axis 22°): feet → knees collapse → save-side hip and hand hit the pitch → settled on the side.
  postFeet: {
    FOLLOW:  { pelvis: [0, 0, -18], spine: [2, 0, -10], chest: [2, 0, -8], neck: [2, 0, 8], head: [0, 0, 10],
               thigh_R: [-6, 0, 14], shin_R: [16, 0, 0], foot_R: [26, 0, 0], thigh_L: [-14, 0, 12], shin_L: [28, 0, 0], foot_L: [12, 0, 0],
               upperArm_R: [-6, 0, 160], foreArm_R: [-14, 0, 0], hand_R: [0, 0, 0], upperArm_L: [-36, 0, 120], foreArm_L: [-30, 0, 0], hand_L: [-2, 0, 0] },
    DESCENT: { pelvis: [8, 0, -12], spine: [4, 0, -6], chest: [3, 0, -4], neck: [0, 0, 4], head: [-2, 0, 4],                             // legs reach for the pitch, arms come down
               thigh_R: [-20, 0, 12], shin_R: [26, 0, 0], foot_R: [4, 0, 0], thigh_L: [-18, 0, -4], shin_L: [24, 0, 0], foot_L: [4, 0, 0],
               upperArm_R: [-30, 0, 96], foreArm_R: [-36, 0, 0], hand_R: [-4, 0, 0], upperArm_L: [-34, 0, 40], foreArm_L: [-48, 0, 0], hand_L: [-4, 0, 0] },
    TOUCH:   { pelvis: [14, 0, -8], spine: [6, 0, -3], chest: [4, 0, -2], neck: [-4, 0, 2], head: [-6, 0, 2],                              // L1 feet meet the pitch, legs nearly straight
               thigh_R: [-14, 0, 14], shin_R: [20, 0, 0], foot_R: [-6, 0, 0], thigh_L: [-14, 0, -8], shin_L: [18, 0, 0], foot_L: [-4, 0, 0],
               upperArm_R: [-46, 0, 60], foreArm_R: [-30, 0, 0], hand_R: [-10, 0, 0], upperArm_L: [-40, 0, -6], foreArm_L: [-46, 0, 0], hand_L: [-8, 0, 0] },
    IMPACT:  { pelvis: [34, 0, -30], spine: [14, 0, -8], chest: [8, 0, -4], neck: [-8, 0, 2], head: [-10, 0, 2],                           // L2 knees collapse, body folds toward the save side, hand reaching for the pitch
               thigh_R: [-84, 0, 26], shin_R: [118, 0, 0], foot_R: [-30, 0, 0], thigh_L: [-70, 0, -10], shin_L: [104, 0, 0], foot_L: [-28, 0, 0],
               upperArm_R: [-70, 0, 70], foreArm_R: [-10, 0, 0], hand_R: [-20, 0, 0], upperArm_L: [-56, 0, -20], foreArm_L: [-40, 0, 0], hand_L: [-10, 0, 0] },
    ABSORB:  { pelvis: [20, 0, -74], spine: [10, 0, -6], chest: [6, 0, -2], neck: [4, 0, 2], head: [0, 0, 4],                              // L3 save-side hip / thigh on the pitch, forearm down, legs folding
               thigh_R: [-40, 0, -2], shin_R: [70, 0, 0], foot_R: [-10, 0, 0], thigh_L: [-58, 0, -12], shin_L: [92, 0, 0], foot_L: [-6, 0, 0],
               upperArm_R: [-40, 0, 96], foreArm_R: [-70, 0, 0], hand_R: [-20, 0, 0], upperArm_L: [-64, 0, 60], foreArm_L: [-84, 0, 0], hand_L: [-8, 0, 0] },
    SETTLE:  { _h: 0.28, pelvis: [10, 0, -82], spine: [8, 0, -4], chest: [6, 0, -2], neck: [8, 0, 2], head: [6, 0, 4],                       // L4 grounded on the side: hip, elbow/forearm on the pitch, head up
               thigh_R: [-30, 0, -4], shin_R: [56, 0, 0], foot_R: [0, 0, 0], thigh_L: [-52, 0, -16], shin_L: [78, 0, 0], foot_L: [-4, 0, 0],
               upperArm_R: [-46, 0, 88], foreArm_R: [-92, 0, 0], hand_R: [-16, 0, 0], upperArm_L: [-70, 0, 62], foreArm_L: [-96, 0, 0], hand_L: [-8, 0, 0] },
    BRACE:   { _h: 0.36, pelvis: [26, 0, -62], spine: [14, 0, -8], chest: [8, 0, -4], neck: [-2, 0, 4], head: [-6, 0, 4],                    // G1 both hands on the pitch, elbows bending under the shoulders
               thigh_R: [-40, 0, -2], shin_R: [64, 0, 0], foot_R: [-4, 0, 0], thigh_L: [-64, 0, -10], shin_L: [92, 0, 0], foot_L: [-8, 0, 0],
               upperArm_R: [-70, 0, 58], foreArm_R: [-60, 0, 0], hand_R: [-30, 0, 0], upperArm_L: [-78, 0, 26], foreArm_L: [-70, 0, 0], hand_L: [-26, 0, 0] },
    PUSH_UP: { _h: 0.46, pelvis: [28, 0, -34], spine: [14, 0, -6], chest: [8, 0, -2], neck: [-6, 0, 2], head: [-10, 0, 2],                   // G2 elbows extend, torso rises; knee coming under
               thigh_R: [-16, 0, 4], shin_R: [96, 0, 0], foot_R: [-56, 0, 0], thigh_L: [-84, 0, -8], shin_L: [94, 0, 0], foot_L: [-10, 0, 0],
               upperArm_R: [-72, 0, 40], foreArm_R: [-14, 0, 0], hand_R: [-30, 0, 0], upperArm_L: [-70, 0, 4], foreArm_L: [-24, 0, 0], hand_L: [-26, 0, 0] },
    HALF_KNEEL: { _h: 0.52, pelvis: [24, 0, -12], spine: [10, 0, -4], chest: [6, 0, -2], neck: [-8, 0, 2], head: [-10, 0, 2],                // G3/G4 save-side knee on the pitch, front foot planted, hand leaving the pitch
               thigh_R: [2, 0, 12], shin_R: [92, 0, 0], foot_R: [-72, 0, 0], thigh_L: [-96, 0, -12], shin_L: [96, 0, 0], foot_L: [0, 0, 0],
               upperArm_R: [-60, 0, 36], foreArm_R: [-30, 0, 0], hand_R: [-16, 0, 0], upperArm_L: [-36, 0, -22], foreArm_L: [-56, 0, 0], hand_L: [-12, 0, 0] },
    CROUCH:  { _h: 0.66, pelvis: [22, 0, -4], spine: [10, 0, -2], chest: [6, 0, -1], neck: [-8, 0, 0], head: [-10, 0, 0],                    // G5 both feet under, deep crouch
               thigh_R: [-70, 0, 18], shin_R: [104, 0, 0], foot_R: [-32, 0, 0], thigh_L: [-70, 0, -18], shin_L: [104, 0, 0], foot_L: [-32, 0, 0],
               upperArm_R: [-30, 0, 30], foreArm_R: [-60, 0, 0], hand_R: [-10, 0, 0], upperArm_L: [-30, 0, -30], foreArm_L: [-60, 0, 0], hand_L: [-10, 0, 0] },
  },
  // Side-first landing (axis > ~60°): forearm/hand first, then hip/shoulder, slide, settle — same get-up chain
  postSide: {
    FOLLOW:  { pelvis: [-2, 0, -76], spine: [0, 0, -14], chest: [0, 0, -10], neck: [2, 0, 8], head: [-2, 0, 10],
               thigh_R: [8, 0, 12], shin_R: [6, 0, 0], foot_R: [30, 0, 0], thigh_L: [-18, 0, 16], shin_L: [40, 0, 0], foot_L: [12, 0, 0],
               upperArm_R: [-6, 0, 164], foreArm_R: [-10, 0, 0], hand_R: [0, 0, 0], upperArm_L: [-36, 0, 130], foreArm_L: [-36, 0, 0], hand_L: [-2, 0, 0] },
    DESCENT: { pelvis: [2, 0, -80], spine: [2, 0, -10], chest: [2, 0, -6], neck: [4, 0, 6], head: [2, 0, 8],
               thigh_R: [-4, 0, 10], shin_R: [14, 0, 0], foot_R: [24, 0, 0], thigh_L: [-24, 0, 18], shin_L: [48, 0, 0], foot_L: [10, 0, 0],
               upperArm_R: [-14, 0, 140], foreArm_R: [-40, 0, 0], hand_R: [-20, 0, 0], upperArm_L: [-46, 0, 100], foreArm_L: [-60, 0, 0], hand_L: [-6, 0, 0] },
    TOUCH:   { pelvis: [4, 0, -84], spine: [4, 0, -8], chest: [4, 0, -4], neck: [6, 0, 4], head: [4, 0, 6],
               thigh_R: [-10, 0, 8], shin_R: [20, 0, 0], foot_R: [20, 0, 0], thigh_L: [-34, 0, 18], shin_L: [56, 0, 0], foot_L: [10, 0, 0],
               upperArm_R: [-20, 0, 118], foreArm_R: [-70, 0, 0], hand_R: [-20, 0, 0], upperArm_L: [-50, 0, 96], foreArm_L: [-70, 0, 0], hand_L: [-6, 0, 0] },
    IMPACT:  { pelvis: [6, 0, -88], spine: [6, 0, -6], chest: [6, 0, -2], neck: [8, 0, 2], head: [6, 0, 4],
               thigh_R: [-16, 0, 6], shin_R: [30, 0, 0], foot_R: [16, 0, 0], thigh_L: [-40, 0, 20], shin_L: [64, 0, 0], foot_L: [8, 0, 0],
               upperArm_R: [-30, 0, 100], foreArm_R: [-80, 0, 0], hand_R: [-14, 0, 0], upperArm_L: [-60, 0, 80], foreArm_L: [-90, 0, 0], hand_L: [-8, 0, 0] },
    ABSORB:  { pelvis: [8, 0, -88], spine: [8, 0, -4], chest: [6, 0, -2], neck: [8, 0, 2], head: [6, 0, 2],
               thigh_R: [-24, 0, 4], shin_R: [40, 0, 0], foot_R: [10, 0, 0], thigh_L: [-52, 0, 16], shin_L: [70, 0, 0], foot_L: [4, 0, 0],
               upperArm_R: [-40, 0, 90], foreArm_R: [-90, 0, 0], hand_R: [-10, 0, 0], upperArm_L: [-70, 0, 70], foreArm_L: [-96, 0, 0], hand_L: [-8, 0, 0] },
    SETTLE:  { _h: 0.28, pelvis: [10, 0, -86], spine: [8, 0, -4], chest: [6, 0, -2], neck: [8, 0, 2], head: [6, 0, 4],
               thigh_R: [-30, 0, -4], shin_R: [56, 0, 0], foot_R: [0, 0, 0], thigh_L: [-52, 0, -16], shin_L: [78, 0, 0], foot_L: [-4, 0, 0],
               upperArm_R: [-46, 0, 88], foreArm_R: [-92, 0, 0], hand_R: [-16, 0, 0], upperArm_L: [-70, 0, 62], foreArm_L: [-96, 0, 0], hand_L: [-8, 0, 0] },
    BRACE:   { _h: 0.36, pelvis: [26, 0, -62], spine: [14, 0, -8], chest: [8, 0, -4], neck: [-2, 0, 4], head: [-6, 0, 4],
               thigh_R: [-40, 0, -2], shin_R: [64, 0, 0], foot_R: [-4, 0, 0], thigh_L: [-64, 0, -10], shin_L: [92, 0, 0], foot_L: [-8, 0, 0],
               upperArm_R: [-70, 0, 58], foreArm_R: [-60, 0, 0], hand_R: [-30, 0, 0], upperArm_L: [-78, 0, 26], foreArm_L: [-70, 0, 0], hand_L: [-26, 0, 0] },
    PUSH_UP: { _h: 0.46, pelvis: [28, 0, -34], spine: [14, 0, -6], chest: [8, 0, -2], neck: [-6, 0, 2], head: [-10, 0, 2],
               thigh_R: [-16, 0, 4], shin_R: [96, 0, 0], foot_R: [-56, 0, 0], thigh_L: [-84, 0, -8], shin_L: [94, 0, 0], foot_L: [-10, 0, 0],
               upperArm_R: [-72, 0, 40], foreArm_R: [-14, 0, 0], hand_R: [-30, 0, 0], upperArm_L: [-70, 0, 4], foreArm_L: [-24, 0, 0], hand_L: [-26, 0, 0] },
    HALF_KNEEL: { _h: 0.52, pelvis: [24, 0, -12], spine: [10, 0, -4], chest: [6, 0, -2], neck: [-8, 0, 2], head: [-10, 0, 2],
               thigh_R: [2, 0, 12], shin_R: [92, 0, 0], foot_R: [-72, 0, 0], thigh_L: [-96, 0, -12], shin_L: [96, 0, 0], foot_L: [0, 0, 0],
               upperArm_R: [-60, 0, 36], foreArm_R: [-30, 0, 0], hand_R: [-16, 0, 0], upperArm_L: [-36, 0, -22], foreArm_L: [-56, 0, 0], hand_L: [-12, 0, 0] },
    CROUCH:  { _h: 0.66, pelvis: [22, 0, -4], spine: [10, 0, -2], chest: [6, 0, -1], neck: [-8, 0, 0], head: [-10, 0, 0],
               thigh_R: [-70, 0, 18], shin_R: [104, 0, 0], foot_R: [-32, 0, 0], thigh_L: [-70, 0, -18], shin_L: [104, 0, 0], foot_L: [-32, 0, 0],
               upperArm_R: [-30, 0, 30], foreArm_R: [-60, 0, 0], hand_R: [-10, 0, 0], upperArm_L: [-30, 0, -30], foreArm_L: [-60, 0, 0], hand_L: [-10, 0, 0] },
  },
};
