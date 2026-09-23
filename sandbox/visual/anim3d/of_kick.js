// ══ OUTFIELD SHOOTING V1 — five strike families on the shared skeletal rig ═══════════════════════════════════════════════════════════
// The SIMULATION owns the shot: ptKick picks the family, the technique, the striking foot, the launch and — critically — `kickAt`, the
// authoritative contact instant. Nothing here changes any of that. This file only answers "what does the body do so that boot meets ball
// at that instant", and it does it by time-warping an authored, normalised action onto whatever schedule the simulation handed down.
//
// RECOVERED, NOT REINVENTED. The五 families, their contact frames and their rhythms come from the existing sprite kick library
// (KICK_LIB in match.js) and the approved POWER V2-BR5 study: 12 frames at 15 fps with contact on frame 7, f0-f6 approach / compression /
// load with the lower leg folded behind, f7 contact with the boot locked on the shin (rel band +/-7 deg), f8-f10 a monotonic rising instep
// arc driven knee-first then shin-whip, recovery deferred to f11, support foot braced through contact and unloading only on release.
// The normalised contact points below ARE those frame timings: INSIDE 6/12 @14, LACES 7/10 @12, POWER 7/12 @15, OUTSIDE 6/8 @14,
// CHIP 5/8 @14. Keeping them means the recovered feel survives the move to the rig.
//
// Rig conventions (shared): thigh x<0 = hip flexion (leg forward), shin x>0 = knee flexion, foot x>0 = plantarflexion (toe down),
// upperArm x<0 = arm forward, foreArm x<0 = elbow flexion, pelvis/spine x>0 = lean forward, y = yaw, z = roll / abduction.
// Every pose below is authored for a RIGHT-footed strike; ofKickPose mirrors for the left foot.
const OF_KICK = {
  blendIn: 0.10,          // s: locomotion -> kick cross-fade
  blendOut: 0.16,         // s: kick -> locomotion
  reachMax: 0.42,         // x legLen: the striking boot may be corrected this far to meet the authoritative ball (a kick reaches; a
                          // dribble touch does not) — it saturates rather than stretching, and the residual is always reported
  warpMin: 0.55,          // the authored action may be compressed to this fraction of its natural length, or stretched to warpMax,
  warpMax: 1.70,          // to land contact on the authoritative tick. Beyond that it is reported as an unrealisable schedule.
  plantLockT: 0.06,       // s before contact that the plant foot is committed
};
// ── the five families ───────────────────────────────────────────────────────────────────────────────────────────────────────────────
// u = normalised time over the whole action; `c` = the contact u. `plant` = the plant foot relative to the BALL in the strike frame
// (lateral to the striking side +, forward +), in leg lengths. `surf` = the boot surface that strikes, which sets the foot's yaw at contact.
OF_KICK.FAM = {
  // 1. INSIDE / CURL — open hip, medial face of the boot, controlled approach, wrapped across-body follow-through.
  INSIDE: { id: "INSIDE", label: "inside / curl", secs: 12 / 14, c: 6 / 12, surf: "INSIDE", plant: [-0.30, 0.10], lean: 4, keys: [
    [0.00, { pelvis: [4, -6, 0], spine: [3, 4, 0], chest: [2, 6, 0], thigh_R: [-39.5, 0, 4], shin_R: [76, 0, 0], foot_R: [-4, 0, 0], thigh_L: [-20.5, 0, 0.5], shin_L: [27.5, 0, 0], foot_L: [-2, 0, 0], upperArm_R: [-10, 0, 14], foreArm_R: [-32, 0, 0], upperArm_L: [-14, 0, -16], foreArm_L: [-36, 0, 0] }],
    [0.28, { pelvis: [6, -14, -3], spine: [4, 8, 0], chest: [3, 10, 0], thigh_R: [-22, 0, 13], shin_R: [88, 0, 0], foot_R: [6, 0, 0], thigh_L: [-29.5, 0, -2], shin_L: [31.5, 0, 0], foot_L: [-6, 0, 0], upperArm_R: [16, 0, 26], foreArm_R: [-28, 0, 0], upperArm_L: [-30, 0, -22], foreArm_L: [-46, 0, 0] }],
    [0.42, { pelvis: [7, -20, -5], spine: [5, 11, 0], chest: [4, 13, 0], thigh_R: [-18, 0, 16], shin_R: [94.5, 0, 0], foot_R: [10, 0, 0], thigh_L: [-34, 0, -1.5], shin_L: [30, 0, 0], foot_L: [-8, 0, 0], upperArm_R: [26, 0, 30], foreArm_R: [-24, 0, 0], upperArm_L: [-40, 0, -26], foreArm_L: [-52, 0, 0] }],
    [0.50, { pelvis: [6, -8, -4], spine: [5, 4, 0], chest: [4, 6, 0], thigh_R: [-58.5, 0, 7.5], shin_R: [65, 0, 0], foot_R: [4, 38, 0], thigh_L: [-31.5, 0, -5], shin_L: [30, 0, 0], foot_L: [-8, 0, 0], upperArm_R: [10, 0, 28], foreArm_R: [-26, 0, 0], upperArm_L: [-34, 0, -24], foreArm_L: [-48, 0, 0] }],
    [0.64, { pelvis: [5, 8, -3], spine: [4, -4, 0], chest: [3, -6, 0], thigh_R: [-81, 0, -18.5], shin_R: [74.5, 0, 0], foot_R: [8, 34, 0], thigh_L: [-28.5, 0, -7], shin_L: [34, 0, 0], foot_L: [-6, 0, 0], upperArm_R: [-4, 0, 22], foreArm_R: [-30, 0, 0], upperArm_L: [-22, 0, -20], foreArm_L: [-42, 0, 0] }],
    [0.82, { pelvis: [4, 18, -2], spine: [3, -10, 0], chest: [2, -12, 0], thigh_R: [-94, 0, -56], shin_R: [91.5, 0, 0], foot_R: [6, 24, 0], thigh_L: [-24, 0, -5], shin_L: [34, 0, 0], foot_L: [-4, 0, 0], upperArm_R: [-18, 0, 16], foreArm_R: [-34, 0, 0], upperArm_L: [-10, 0, -16], foreArm_L: [-36, 0, 0] }],
    [1.00, { pelvis: [3, 6, 0], spine: [2, -2, 0], chest: [1, -3, 0], thigh_R: [-46, 0, -2.5], shin_R: [82.5, 0, 0], foot_R: [-2, 8, 0], thigh_L: [-18, 0, 0], shin_L: [27, 0, 0], foot_L: [-2, 0, 0], upperArm_R: [-10, 0, 12], foreArm_R: [-30, 0, 0], upperArm_L: [-12, 0, -14], foreArm_L: [-34, 0, 0] }] ] },
  // 2. LACES / NORMAL — the balanced default: moderate backswing, instep contact, moderate follow-through. Between INSIDE and POWER.
  LACES: { id: "LACES", label: "normal", secs: 10 / 12, c: 7 / 10, surf: "LACES", plant: [-0.34, 0.06], lean: 7, keys: [
    [0.00, { pelvis: [6, -4, 0], spine: [4, 3, 0], chest: [3, 4, 0], thigh_R: [-42, 0, 2.5], shin_R: [74.5, 0, 0], foot_R: [-4, 0, 0], thigh_L: [-22.5, 0, 0], shin_L: [27.5, 0, 0], foot_L: [-2, 0, 0], upperArm_R: [-12, 0, 12], foreArm_R: [-34, 0, 0], upperArm_L: [-16, 0, -14], foreArm_L: [-38, 0, 0] }],
    [0.32, { pelvis: [10, -10, -4], spine: [7, 6, 0], chest: [5, 8, 0], thigh_R: [-28.5, 0, 7.5], shin_R: [93.5, 0, 0], foot_R: [14, 0, 0], thigh_L: [-36.5, 0, 0.5], shin_L: [36.5, 0, 0], foot_L: [-8, 0, 0], upperArm_R: [24, 0, 22], foreArm_R: [-26, 0, 0], upperArm_L: [-40, 0, -20], foreArm_L: [-54, 0, 0] }],
    [0.55, { pelvis: [13, -16, -7], spine: [9, 9, 0], chest: [7, 11, 0], thigh_R: [-19, 0, 4.5], shin_R: [100.5, 0, 0], foot_R: [18, 0, 0], thigh_L: [-43.5, 0, 2.5], shin_L: [35.5, 0, 0], foot_L: [-10, 0, 0], upperArm_R: [34, 0, 26], foreArm_R: [-22, 0, 0], upperArm_L: [-52, 0, -24], foreArm_L: [-62, 0, 0] }],
    [0.70, { pelvis: [9, -2, -5], spine: [7, 1, 0], chest: [5, 2, 0], thigh_R: [-72.5, 0, 8], shin_R: [78.5, 0, 0], foot_R: [20, 0, 0], thigh_L: [-38, 0, -2.5], shin_L: [35.5, 0, 0], foot_L: [-10, 0, 0], upperArm_R: [12, 0, 24], foreArm_R: [-26, 0, 0], upperArm_L: [-38, 0, -22], foreArm_L: [-52, 0, 0] }],
    [0.82, { pelvis: [7, 8, -3], spine: [5, -5, 0], chest: [4, -7, 0], thigh_R: [-103.5, 0, -6], shin_R: [77.5, 0, 0], foot_R: [26, 0, 0], thigh_L: [-32, 0, -4], shin_L: [36.5, 0, 0], foot_L: [-8, 0, 0], upperArm_R: [-6, 0, 18], foreArm_R: [-32, 0, 0], upperArm_L: [-22, 0, -18], foreArm_L: [-42, 0, 0] }],
    [1.00, { pelvis: [4, 4, 0], spine: [3, -2, 0], chest: [2, -3, 0], thigh_R: [-52, 0, 0.5], shin_R: [85, 0, 0], foot_R: [2, 0, 0], thigh_L: [-19.5, 0, 0], shin_L: [28, 0, 0], foot_L: [-2, 0, 0], upperArm_R: [-12, 0, 12], foreArm_R: [-32, 0, 0], upperArm_L: [-14, 0, -14], foreArm_L: [-36, 0, 0] }] ] },
  // 3. POWER — the recovered V2-BR5 design. Deep compression and a lower leg folded hard behind at LOAD; contact taken with the knee
  //    still leading and the ankle locked; then the shin whips through into a monotonic RISING instep arc that peaks very high, with
  //    recovery deliberately deferred to the last frame. Arms thrown wide for counter-rotation. The plant leg is braced through contact.
  POWER: { id: "POWER", label: "power", secs: 12 / 15, c: 7 / 12, surf: "LACES", plant: [-0.40, 0.02], lean: 11, keys: [
    [0.00, { pelvis: [8, -6, 0], spine: [6, 4, 0], chest: [4, 6, 0], thigh_R: [-45, 0, 3], shin_R: [74, 0, 0], foot_R: [-4, 0, 0], thigh_L: [-24.5, 0, 0.5], shin_L: [27.5, 0, 0], foot_L: [-2, 0, 0], upperArm_R: [-16, 0, 14], foreArm_R: [-36, 0, 0], upperArm_L: [-20, 0, -16], foreArm_L: [-40, 0, 0] }],
    [0.25, { pelvis: [14, -14, -6], spine: [10, 8, 0], chest: [7, 11, 0], thigh_R: [-30.5, 0, 7.5], shin_R: [94, 0, 0], foot_R: [16, 0, 0], thigh_L: [-38, 0, 4], shin_L: [34, 0, 0], foot_L: [-10, 0, 0], upperArm_R: [30, 0, 28], foreArm_R: [-24, 0, 0], upperArm_L: [-46, 0, -26], foreArm_L: [-58, 0, 0] }],
    [0.42, { pelvis: [20, -24, -10], spine: [14, 13, 0], chest: [10, 17, 0], thigh_R: [-18.5, 0, -1.5], shin_R: [101, 0, 0], foot_R: [22, 0, 0], thigh_L: [-51, 0, 7], shin_L: [36.5, 0, 0], foot_L: [-12, 0, 0], upperArm_R: [46, 0, 34], foreArm_R: [-18, 0, 0], upperArm_L: [-64, 0, -32], foreArm_L: [-70, 0, 0] }],
    [0.50, { pelvis: [22, -26, -11], spine: [15, 14, 0], chest: [11, 18, 0], thigh_R: [-17, 0, -5], shin_R: [103.5, 0, 0], foot_R: [24, 0, 0], thigh_L: [-55.5, 0, 7], shin_L: [37.5, 0, 0], foot_L: [-13, 0, 0], upperArm_R: [50, 0, 35], foreArm_R: [-16, 0, 0], upperArm_L: [-68, 0, -33], foreArm_L: [-72, 0, 0] }],
    [0.583,{ pelvis: [16, -6, -8], spine: [12, 3, 0], chest: [9, 4, 0], thigh_R: [-79.5, 0, 11.5], shin_R: [75.5, 0, 0], foot_R: [20, 0, 0], thigh_L: [-47.5, 0, 0], shin_L: [38, 0, 0], foot_L: [-12, 0, 0], upperArm_R: [22, 0, 30], foreArm_R: [-22, 0, 0], upperArm_L: [-50, 0, -30], foreArm_L: [-62, 0, 0] }],
    [0.70, { pelvis: [11, 10, -6], spine: [8, -6, 0], chest: [6, -8, 0], thigh_R: [-99, 0, -5.5], shin_R: [70.5, 0, 0], foot_R: [34, 0, 0], thigh_L: [-38.5, 0, -3.5], shin_L: [37, 0, 0], foot_L: [-10, 0, 0], upperArm_R: [0, 0, 24], foreArm_R: [-28, 0, 0], upperArm_L: [-30, 0, -26], foreArm_L: [-50, 0, 0] }],
    [0.82, { pelvis: [7, 20, -4], spine: [5, -12, 0], chest: [4, -15, 0], thigh_R: [-109, 0, -21], shin_R: [54, 0, 0], foot_R: [44, 0, 0], thigh_L: [-28, 0, -2.5], shin_L: [33.5, 0, 0], foot_L: [-8, 0, 0], upperArm_R: [-20, 0, 20], foreArm_R: [-34, 0, 0], upperArm_L: [-12, 0, -22], foreArm_L: [-40, 0, 0] }],
    [0.92, { pelvis: [5, 24, -2], spine: [4, -14, 0], chest: [3, -17, 0], thigh_R: [-85, 0, -26], shin_R: [0, 0, 0], foot_R: [20, 0, 0], thigh_L: [-21.5, 0, -1.5], shin_L: [31.5, 0, 0], foot_L: [-6, 0, 0], upperArm_R: [-28, 0, 18], foreArm_R: [-36, 0, 0], upperArm_L: [-6, 0, -20], foreArm_L: [-34, 0, 0] }],
    [1.00, { pelvis: [5, 10, 0], spine: [4, -4, 0], chest: [3, -5, 0], thigh_R: [-56, 0, -2.5], shin_R: [85, 0, 0], foot_R: [4, 0, 0], thigh_L: [-19.5, 0, 0], shin_L: [27.5, 0, 0], foot_L: [-2, 0, 0], upperArm_R: [-16, 0, 14], foreArm_R: [-34, 0, 0], upperArm_L: [-14, 0, -16], foreArm_L: [-36, 0, 0] }] ] },
  // 4. OUTSIDE / TRIVELA — a different strike family, not a mirrored instep. The body OPENS away from the target, the hip rotates
  //    internally, the boot turns in so the LATERAL face presents, and the leg wraps outward across a shorter, snappier arc.
  OUTSIDE: { id: "OUTSIDE", label: "trivela / outside", secs: 8 / 14, c: 6 / 8, surf: "OUTSIDE", plant: [-0.22, -0.04], lean: 5, keys: [
    [0.00, { pelvis: [5, 10, 2], spine: [4, -6, 0], chest: [3, -8, 0], thigh_R: [-41, 0, -1.5], shin_R: [76, 0, 0], foot_R: [-4, 0, 0], thigh_L: [-21.5, 0, -2.5], shin_L: [27.5, 0, 0], foot_L: [-2, 0, 0], upperArm_R: [-12, 0, 12], foreArm_R: [-34, 0, 0], upperArm_L: [-14, 0, -14], foreArm_L: [-36, 0, 0] }],
    [0.34, { pelvis: [8, 22, 5], spine: [6, -13, 0], chest: [4, -16, 0], thigh_R: [-29, 0, 1.5], shin_R: [90.5, 0, 0], foot_R: [10, -26, 0], thigh_L: [-28.5, 0, -13], shin_L: [32.5, 0, 0], foot_L: [-8, 0, 0], upperArm_R: [20, 0, 18], foreArm_R: [-28, 0, 0], upperArm_L: [-34, 0, -26], foreArm_L: [-50, 0, 0] }],
    [0.56, { pelvis: [9, 30, 7], spine: [7, -18, 0], chest: [5, -22, 0], thigh_R: [-25.5, 0, 5], shin_R: [93, 0, 0], foot_R: [14, -38, 0], thigh_L: [-31, 0, -19], shin_L: [34.5, 0, 0], foot_L: [-9, 0, 0], upperArm_R: [28, 0, 20], foreArm_R: [-24, 0, 0], upperArm_L: [-44, 0, -30], foreArm_L: [-58, 0, 0] }],
    [0.75, { pelvis: [6, 14, 5], spine: [5, -8, 0], chest: [4, -10, 0], thigh_R: [-63, 0, 8.5], shin_R: [67, 0, 0], foot_R: [12, -44, 0], thigh_L: [-30, 0, -15], shin_L: [34, 0, 0], foot_L: [-9, 0, 0], upperArm_R: [8, 0, 18], foreArm_R: [-28, 0, 0], upperArm_L: [-32, 0, -28], foreArm_L: [-48, 0, 0] }],
    [0.88, { pelvis: [5, 0, 3], spine: [4, 2, 0], chest: [3, 3, 0], thigh_R: [-78, 0, 33.5], shin_R: [65.5, 0, 0], foot_R: [10, -40, 0], thigh_L: [-27.5, 0, -9], shin_L: [33.5, 0, 0], foot_L: [-7, 0, 0], upperArm_R: [-8, 0, 14], foreArm_R: [-32, 0, 0], upperArm_L: [-18, 0, -22], foreArm_L: [-40, 0, 0] }],
    [1.00, { pelvis: [4, 8, 1], spine: [3, -4, 0], chest: [2, -5, 0], thigh_R: [-48, 0, 6], shin_R: [82.5, 0, 0], foot_R: [0, -14, 0], thigh_L: [-19.5, 0, -1.5], shin_L: [28, 0, 0], foot_L: [-2, 0, 0], upperArm_R: [-10, 0, 12], foreArm_R: [-32, 0, 0], upperArm_L: [-12, 0, -14], foreArm_L: [-34, 0, 0] }] ] },
  // 5. CHIP — the boot is driven UNDER the ball with the ankle held dorsiflexed (toe UP, foot x negative), a short stabbing path and a
  //    deliberately truncated follow-through that lifts rather than drives through. It must not read as a normal shot aimed upward.
  CHIP: { id: "CHIP", label: "chip", secs: 8 / 14, c: 5 / 8, surf: "CHIP", plant: [-0.26, 0.16], lean: -3, keys: [
    [0.00, { pelvis: [2, -4, 0], spine: [2, 3, 0], chest: [1, 4, 0], thigh_R: [-36.5, 0, 2], shin_R: [75, 0, 0], foot_R: [-6, 0, 0], thigh_L: [-18.5, 0, 0], shin_L: [27.5, 0, 0], foot_L: [-2, 0, 0], upperArm_R: [-10, 0, 12], foreArm_R: [-32, 0, 0], upperArm_L: [-12, 0, -14], foreArm_L: [-34, 0, 0] }],
    [0.30, { pelvis: [0, -10, -2], spine: [0, 6, 0], chest: [0, 8, 0], thigh_R: [-8.5, 0, 4], shin_R: [77, 0, 0], foot_R: [-18, 0, 0], thigh_L: [-23.5, 0, -1.5], shin_L: [33, 0, 0], foot_L: [-8, 0, 0], upperArm_R: [12, 0, 20], foreArm_R: [-30, 0, 0], upperArm_L: [-26, 0, -20], foreArm_L: [-44, 0, 0] }],
    [0.48, { pelvis: [-3, -14, -3], spine: [-2, 8, 0], chest: [-2, 10, 0], thigh_R: [40.5, 0, 3.5], shin_R: [0, 0, 0], foot_R: [-26, 0, 0], thigh_L: [-26.5, 0, -2], shin_L: [36.5, 0, 0], foot_L: [-10, 0, 0], upperArm_R: [16, 0, 22], foreArm_R: [-28, 0, 0], upperArm_L: [-32, 0, -22], foreArm_L: [-48, 0, 0] }],
    [0.625,{ pelvis: [-6, -4, -3], spine: [-4, 2, 0], chest: [-3, 3, 0], thigh_R: [-22.5, 0, 6.5], shin_R: [35, 0, 0], foot_R: [-32, 0, 0], thigh_L: [-22.5, 0, -4], shin_L: [36.5, 0, 0], foot_L: [-10, 0, 0], upperArm_R: [2, 0, 22], foreArm_R: [-30, 0, 0], upperArm_L: [-26, 0, -22], foreArm_L: [-44, 0, 0] }],
    [0.78, { pelvis: [-8, 4, -2], spine: [-6, -2, 0], chest: [-4, -3, 0], thigh_R: [-32.5, 0, 0.5], shin_R: [35, 0, 0], foot_R: [-30, 0, 0], thigh_L: [-17, 0, -4.5], shin_L: [37, 0, 0], foot_L: [-8, 0, 0], upperArm_R: [-8, 0, 18], foreArm_R: [-32, 0, 0], upperArm_L: [-16, 0, -18], foreArm_L: [-38, 0, 0] }],
    [1.00, { pelvis: [-3, 2, 0], spine: [-2, -1, 0], chest: [-1, -2, 0], thigh_R: [-36, 0, 1], shin_R: [76.5, 0, 0], foot_R: [-10, 0, 0], thigh_L: [-12.5, 0, 0], shin_L: [28, 0, 0], foot_L: [-2, 0, 0], upperArm_R: [-10, 0, 12], foreArm_R: [-30, 0, 0], upperArm_L: [-12, 0, -14], foreArm_L: [-32, 0, 0] }] ] },
};
// technique (simulation) -> family (presentation)
OF_KICK.TECH = { INSIDE: "INSIDE", INSIDE_FINISH: "INSIDE", LACES: "LACES", LACES_POWER: "POWER", OUTSIDE: "OUTSIDE", CHIP: "CHIP" };
function ofKickFam(tech) { return OF_KICK.FAM[OF_KICK.TECH[tech] || "LACES"]; }
// Mirror an authored RIGHT-foot pose for a LEFT-foot strike: swap the R/L joints and negate yaw and roll. Straight mirroring is valid for
// the sagittal families; the two SURFACE families need their foot yaw preserved in sign relative to the striking side, which the swap
// already gives (the medial face of the left boot faces the other way in world, which is what a left-footed curl actually does).
function ofKickPose(fam, u, foot) {
  const K = fam.keys; let i = 0;
  while (i < K.length - 2 && u > K[i + 1][0]) i++;
  const a = K[i], b = K[Math.min(i + 1, K.length - 1)];
  const span = Math.max(1e-6, b[0] - a[0]), t = smooth01(clamp01((u - a[0]) / span));
  const out = {};
  const keys = new Set([...Object.keys(a[1]), ...Object.keys(b[1])]);
  for (const k of keys) {
    const p = a[1][k] || [0, 0, 0], q = b[1][k] || [0, 0, 0];
    out[k] = [lerp(p[0], q[0], t), lerp(p[1], q[1], t), lerp(p[2], q[2], t)];
  }
  if (foot === "R") return out;
  const m = {};                                                                                   // LEFT strike: swap sides, flip yaw / roll
  for (const k in out) {
    const v = out[k], sw = /_R$/.test(k) ? k.replace(/_R$/, "_L") : /_L$/.test(k) ? k.replace(/_L$/, "_R") : k;
    m[sw] = [v[0], -v[1], -v[2]];
  }
  return m;
}
// ── one tick of a scheduled shot ────────────────────────────────────────────────────────────────────────────────────────────────────
// `kick` is the simulation's own descriptor (t.kick): t0, kickAt, end, tech, foot. The action is time-warped so its authored contact u
// lands exactly on kickAt: the approach is scaled to the time actually available before contact, the follow-through to the time after.
// Both scales are reported and clamped; a schedule outside the clamp is flagged rather than silently distorted.
function ofKickMake() { return { on: false, fam: null, foot: "R", warpIn: 1, warpOut: 1, diag: {} }; }
function ofKickTick(skel, K, kick, now) {
  const fam = ofKickFam(kick.tech), foot = kick.foot === "L" ? "L" : "R";
  const pre = Math.max(1e-3, kick.kickAt - kick.t0), post = Math.max(1e-3, kick.end - kick.kickAt);
  const natPre = fam.secs * fam.c, natPost = fam.secs * (1 - fam.c);
  const wIn = clamp01((pre / natPre - OF_KICK.warpMin) / (OF_KICK.warpMax - OF_KICK.warpMin)) * 0 + Math.max(OF_KICK.warpMin, Math.min(OF_KICK.warpMax, pre / natPre));
  const wOut = Math.max(OF_KICK.warpMin, Math.min(OF_KICK.warpMax, post / natPost));
  const dt = now - kick.kickAt;
  let u;
  if (dt <= 0) u = fam.c * clamp01(1 + dt / (natPre * wIn));                                       // approach / load, compressed or stretched to fit
  else u = fam.c + (1 - fam.c) * clamp01(dt / (natPost * wOut));                                   // strike / follow-through
  const pose = ofKickPose(fam, u, foot);
  pose.name = "KICK_" + fam.id; pose._pelvis = [0, 0, 0];
  // Ground the action on the PLANT foot exactly as the gait grounds itself on its stance leg: the pelvis drops until the plant sole is on
  // the pitch. Without this the whole body floats and the contact solver plants a foot in mid-air.
  if (typeof ofLocoGroundPelvis === "function") {
    const pl = foot === "R" ? "L" : "R";
    ofLocoGroundPelvis(skel, pose, { st: pl === "R", s: 0.3 }, { st: pl === "L", s: 0.3 });
  }
  K.on = true; K.fam = fam; K.foot = foot; K.warpIn = wIn; K.warpOut = wOut;
  K.diag = { fam: fam.id, foot, u: +u.toFixed(3), contactU: fam.c, dt: +dt.toFixed(4),
             warpIn: +wIn.toFixed(3), warpOut: +wOut.toFixed(3),
             warped: wIn <= OF_KICK.warpMin + 1e-6 || wIn >= OF_KICK.warpMax - 1e-6 || wOut <= OF_KICK.warpMin + 1e-6 || wOut >= OF_KICK.warpMax - 1e-6,
             surf: fam.surf, plantFoot: foot === "R" ? "L" : "R" };
  return { pose, fam, foot, u, dt };
}
