// ═══ anim3d/gk_far_dive_clip.js — AUTHORED base animation: goalkeeper far dive (RIGHT side; LEFT = poseMirror) ═══
// Bone-space keys in the character frame (+x = keeper's RIGHT = the dive side, +y up, +z toward the ball).
// Euler [pitch, yaw, roll] degrees. Sign conventions (from M4.euler on the bind directions):
//   legs / arms (bind −y): negative pitch = swing FORWARD, positive roll = swing toward +x (the right)
//   spine / chest / head (bind +y): positive pitch = bend forward, negative roll = lean RIGHT
// `_pelvis` = pelvis translation [dx, dy, dz] metres added to the bind hip height (the presentation body's own motion —
// the ROOT stays on the simulation root; see gk_graph.js for the root contract).
// Timeline: PRE keys are sampled by the simulation's u (0 = commit, 1 = execEnd; REACH pinned to u = 1 or the contact tick),
// POST keys by seconds after endT (the sprite sequence's contract). Durations mirror the sprite path: LAND 0.45 s, RECOVER 0.60 s.
const GK_CLIP_FAR_DIVE = {
  id: "GK_FAR_DIVE_R", side: "RIGHT", family: "AIRBORNE_DIVE", heights: ["MID", "HIGH", "TOP"],
  pres: { tau: 0.4, tLand: 0.55, tEnd: 1.05 },   // presentation-root continuation law (identical constants to the sprite sequences)
  set: {  // SET stance (also the READ / PREPARE base; head look-at is procedural)
    _pelvis: [0, -0.10, 0], pelvis: [12, 0, 0], spine: [6, 0, 0], chest: [4, 0, 0], neck: [-8, 0, 0], head: [-10, 0, 0],
    thigh_R: [-32, 0, 14], shin_R: [46, 0, 0], foot_R: [-26, 0, 0], thigh_L: [-32, 0, -14], shin_L: [46, 0, 0], foot_L: [-26, 0, 0],
    clavicle_R: [0, 0, 0], upperArm_R: [-28, 0, 22], foreArm_R: [-68, 0, 0], hand_R: [-10, 0, 0],
    clavicle_L: [0, 0, 0], upperArm_L: [-28, 0, -22], foreArm_L: [-68, 0, 0], hand_L: [-10, 0, 0],
  },
  pre: [   // [u, pose]
    [0.00, "set"],
    [0.10, { name: "LOAD",  _pelvis: [0.02, -0.22, 0.02], pelvis: [16, 0, -12], spine: [8, 0, -8], chest: [4, 0, -6], neck: [-8, 0, 6], head: [-12, 0, 8],
             thigh_R: [-40, 0, 22], shin_R: [62, 0, 0], foot_R: [-30, 0, 0], thigh_L: [-38, 0, -16], shin_L: [58, 0, 0], foot_L: [-28, 0, 0],
             upperArm_R: [-30, 0, 40], foreArm_R: [-60, 0, 0], hand_R: [-10, 0, 0], upperArm_L: [-40, 0, -10], foreArm_L: [-70, 0, 0], hand_L: [-10, 0, 0] }],
    [0.20, { name: "PUSH",  _pelvis: [0.12, -0.16, 0.03], pelvis: [12, 0, -34], spine: [4, 0, -10], chest: [2, 0, -8], neck: [-6, 0, 8], head: [-10, 0, 10],
             thigh_R: [-12, 0, 40], shin_R: [16, 0, 0], foot_R: [10, 0, 0], thigh_L: [-52, 0, -8], shin_L: [84, 0, 0], foot_L: [-20, 0, 0],
             upperArm_R: [-24, 0, 96], foreArm_R: [-34, 0, 0], hand_R: [-6, 0, 0], upperArm_L: [-56, 0, 36], foreArm_L: [-50, 0, 0], hand_L: [-8, 0, 0] }],
    [0.31, { name: "TOE_OFF", _pelvis: [0.24, -0.02, 0.04], pelvis: [6, 0, -52], spine: [2, 0, -12], chest: [0, 0, -8], neck: [-4, 0, 8], head: [-8, 0, 10],
             thigh_R: [-4, 0, 30], shin_R: [6, 0, 0], foot_R: [28, 0, 0], thigh_L: [-40, 0, 4], shin_L: [70, 0, 0], foot_L: [-10, 0, 0],
             upperArm_R: [-16, 0, 136], foreArm_R: [-20, 0, 0], hand_R: [-4, 0, 0], upperArm_L: [-60, 0, 70], foreArm_L: [-40, 0, 0], hand_L: [-6, 0, 0] }],
    [0.60, { name: "FLIGHT", _pelvis: [0.40, 0.22, 0.04], pelvis: [0, 0, -66], spine: [0, 0, -14], chest: [0, 0, -10], neck: [-2, 0, 10], head: [-6, 0, 12],
             thigh_R: [4, 0, 18], shin_R: [4, 0, 0], foot_R: [34, 0, 0], thigh_L: [-22, 0, 14], shin_L: [44, 0, 0], foot_L: [10, 0, 0],
             upperArm_R: [-8, 0, 164], foreArm_R: [-10, 0, 0], hand_R: [-2, 0, 0], upperArm_L: [-50, 0, 120], foreArm_L: [-30, 0, 0], hand_L: [-4, 0, 0] }],
    [1.00, { name: "REACH",  _pelvis: [0.48, 0.30, 0.04], pelvis: [-2, 0, -72], spine: [0, 0, -16], chest: [0, 0, -12], neck: [0, 0, 10], head: [-4, 0, 12],
             thigh_R: [6, 0, 14], shin_R: [2, 0, 0], foot_R: [36, 0, 0], thigh_L: [-16, 0, 16], shin_L: [36, 0, 0], foot_L: [14, 0, 0],
             upperArm_R: [-4, 0, 172], foreArm_R: [-4, 0, 0], hand_R: [0, 0, 0], upperArm_L: [-40, 0, 140], foreArm_L: [-24, 0, 0], hand_L: [-2, 0, 0] }],
  ],
  post: [  // [seconds after endT, pose]
    [0.00, "reach"],
    [0.17, { name: "APEX",   _pelvis: [0.54, 0.22, 0.04], pelvis: [-2, 0, -76], spine: [0, 0, -14], chest: [0, 0, -10], neck: [2, 0, 8], head: [-2, 0, 10],
             thigh_R: [8, 0, 12], shin_R: [6, 0, 0], foot_R: [30, 0, 0], thigh_L: [-18, 0, 16], shin_L: [40, 0, 0], foot_L: [12, 0, 0],
             upperArm_R: [-6, 0, 160], foreArm_R: [-12, 0, 0], hand_R: [0, 0, 0], upperArm_L: [-36, 0, 130], foreArm_L: [-36, 0, 0], hand_L: [-2, 0, 0] }],
    [0.32, { name: "LAND",   _pelvis: [0.58, -0.52, 0.04], pelvis: [4, 0, -84], spine: [4, 0, -8], chest: [4, 0, -4], neck: [6, 0, 4], head: [4, 0, 6],
             thigh_R: [-10, 0, 8], shin_R: [20, 0, 0], foot_R: [20, 0, 0], thigh_L: [-34, 0, 18], shin_L: [56, 0, 0], foot_L: [10, 0, 0],
             upperArm_R: [-20, 0, 120], foreArm_R: [-60, 0, 0], hand_R: [-10, 0, 0], upperArm_L: [-50, 0, 96], foreArm_L: [-70, 0, 0], hand_L: [-6, 0, 0] }],
    [0.48, { name: "ABSORB", _pelvis: [0.60, -0.56, 0.04], pelvis: [6, 0, -88], spine: [6, 0, -6], chest: [6, 0, -2], neck: [8, 0, 2], head: [6, 0, 4],
             thigh_R: [-16, 0, 6], shin_R: [30, 0, 0], foot_R: [16, 0, 0], thigh_L: [-40, 0, 20], shin_L: [64, 0, 0], foot_L: [8, 0, 0],
             upperArm_R: [-30, 0, 100], foreArm_R: [-80, 0, 0], hand_R: [-14, 0, 0], upperArm_L: [-60, 0, 80], foreArm_L: [-90, 0, 0], hand_L: [-8, 0, 0] }],
    [0.72, { name: "PUSH_UP", _pelvis: [0.46, -0.40, 0.02], pelvis: [24, 0, -50], spine: [14, 0, -10], chest: [10, 0, -6], neck: [-4, 0, 4], head: [-8, 0, 4],
             thigh_R: [-70, 0, 20], shin_R: [90, 0, 0], foot_R: [-10, 0, 0], thigh_L: [-40, 0, -6], shin_L: [70, 0, 0], foot_L: [-20, 0, 0],
             upperArm_R: [-70, 0, 40], foreArm_R: [-30, 0, 0], hand_R: [-20, 0, 0], upperArm_L: [-60, 0, -10], foreArm_L: [-40, 0, 0], hand_L: [-20, 0, 0] }],
    [0.90, { name: "KNEEL",  _pelvis: [0.26, -0.28, 0.02], pelvis: [22, 0, -16], spine: [10, 0, -4], chest: [6, 0, -2], neck: [-6, 0, 2], head: [-10, 0, 2],
             thigh_R: [-84, 0, 14], shin_R: [96, 0, 0], foot_R: [-12, 0, 0], thigh_L: [-20, 0, -12], shin_L: [92, 0, 0], foot_L: [-40, 0, 0],
             upperArm_R: [-40, 0, 26], foreArm_R: [-50, 0, 0], hand_R: [-16, 0, 0], upperArm_L: [-40, 0, -22], foreArm_L: [-56, 0, 0], hand_L: [-16, 0, 0] }],
    [1.05, "set"],
  ],
};
