// ═══ technical_control15/tc15_tech.js — TECHNICAL-CONTROL-1.5: THE FIVE ELITE REFERENCES (Ball Control 99 · Dribbling 99 · Agility 99), authored ═════
// From review_artifacts/technical_control15/TECHNIQUE_RESEARCH_AND_SPEC.md (sources [E], inferences [I], our decisions [D]). Every technique is one
// right-footed player, entering along the local +a axis (heading 0) at its approach speed, the decisive contact at tC; the local frame [a, l]
// (+ l = the player's right) has its origin at the centre of mass at tC. Each is authored in four phases — ENTRY · CONTACT · PROTECTION · EXIT —
// as the owner asked; numbers marked [D] are ours (visually calibrated), the rest follow the research.
// A technique: { id, label, family, turnDeg, dur, tC, phases, com: { v, h } (speed m/s, travel heading deg — C¹ monotone keys), face (the pelvis
// heading, deg), trunk (the chest's turn against the pelvis, deg), lean (forward, deg), side (sideways, + right, deg), crouch (m), arms (balance
// 0 … 1), look (1 = the ball), gait (the running cycle's share), ball0(r), contacts(r), stances(r), pressure (the obvious pressure side for the
// review overlay), checks (the acceptance criteria the tools measure) }.
const hyp = Math.hypot, DEG = Math.PI / 180, cos = Math.cos, sin = Math.sin, sF = (F) => (F === "R" ? 1 : -1);
const lead = (v) => Math.min(0.27, 0.08 + 0.042 * v);
// the local travel heading (deg) and speed of the centre of mass at t
const travel = (r, t) => { const V = r.vel(t); return { v: hyp(V[0], V[1]), h: Math.atan2(V[1], V[0]) / DEG - r.th0 / DEG }; };
const faceD = (r, t) => r.psi(t) / DEG - r.th0 / DEG;
// a point at [ahead, right] (m) in a heading (deg, local) from a local point
export const off = (p, hDeg, ahead, right) => [p[0] + ahead * cos(hDeg * DEG) - right * sin(hDeg * DEG), p[1] + ahead * sin(hDeg * DEG) + right * cos(hDeg * DEG)];
// A RUNNING STANCE (RUN-1's stride): the foot lands lead(v) ahead of the centre of mass along its travel, `w` to its side of the pelvis heading,
// toes out 5°; o: { lead (m, override), w, yaw (deg, override) }
export function runSt(F, t0, t1, o = {}) {
  return { F, t0, t1, kind: o.kind || "run", liftK: o.liftK, heel: o.heel, pivot: o.pivot,
    at: (r) => { const c = r.comL(t0), tr = travel(r, t0), fc = faceD(r, t0), a = o.lead != null ? o.lead : o.afterTouch ? 0.06 : lead(tr.v), w = o.w != null ? o.w : 0.10; return off(off(c, tr.h, a, 0), fc, 0, sF(F) * w); },
    yaw: o.yaw != null ? o.yaw : (r) => travel(r, t0).h + sF(F) * 5 };
}
// a stance at a fixed place (a function of the reference: the ball, the centre of mass …)
export function atSt(F, t0, t1, at, yaw, o = {}) { return Object.assign({ F, t0, t1, at, yaw }, o); }

// THE RUN-UP (TECHNICAL-CONTROL-1.2's carry model: the ball in the right lane, the right foot's laces every second step at speed, the ball always
// ahead of the feet): carry touches at the given times, each aimed at the next touch's point (the centre of mass then + [ahead, lane]); the last
// aims at the technique's own first contact. The clip opens with the ball just pushed (0.42 m ahead in the lane at speed + 0.6 m/s).
export const carryTouches = (times, lane, next, ahead = 0.32) => times.map((t, i) => ({ t, F: "R", surface: "LACES", role: "carry",
  aim: { at: i + 1 < times.length ? (rr) => { const c = rr.comL(times[i + 1]); return [c[0] + ahead, c[1] + lane]; } : next },
  swing: { via: [{ dt: 0.03, rel: "ballNow", at: [-0.22, -0.20, 0.13], yaw: -8, pitch: -30 }] } }));
export const ballStart = (r, lane, v) => ({ at: [r.comL(0)[0] + 0.42, r.comL(0)[1] + lane], v: v + 0.6, h: 0 });
// ═══ 90° — THE RONALDO CHOP (to the left; the right foot's inside behind the left leg) ═══════════════════════════════════════════════════════════
// [E] at (near) top speed; a set touch, slightly bigger; a little hop off the right foot onto the LEFT (the new-direction side), which lands PAST
// the ball — the left leg crosses in front of it (owner: "the opposite / front leg travels across / in front of the ball"); the RIGHT foot, ankle
// locked, toe up, chops the ball with its INSIDE behind the left leg; one redirecting contact; hips swivel, the trunk largely forward, low; as he
// comes down on the left foot he pushes off to follow the ball; a bigger exit touch and a burst.
// [I/D] the geometry that makes it physical: the ball is in the right lane at the chop (the hop moves the centre of mass left of it); the left foot
// lands ahead of the centre of mass and RIGHT of it at first (in front of the ball) — it brakes and, as the body passes over and left of it, pushes
// left; the right foot comes forward past the ball's right side and strikes its FRONT-RIGHT with the inside (the toe turned in, forward-left), moving
// back-left relative to the body: the ball goes back-left, behind the left heel, under the body (through the stance); the right foot comes down
// east of the body (the outside foot) and drives the exit with the left foot's push-off.
// [D] approach 5.0 m/s; the penultimate (right) stance brakes to ~4.1 m/s and pushes left; flight 0.13 s; the plant at 1.26 s; the chop 0.04 s after
// the left foot lands; the ball at the chop 0.05 m ahead / 0.22 m right of the centre of mass; chopped at 3.6 m/s, 90° (sideways); exit touch
// with the left foot ~0.36 s after the chop.
const CHOP_B = [-0.10, 0.24];                                   // [D] the ball at the chop (local, the centre of mass = the origin): under the body, right
export const CHOP90 = {
  id: "CHOP90", label: "90° Ronaldo chop (to the left)", family: "RONALDO CHOP", turnDeg: -90, dur: 2.55, tC: 1.30, approach: 5.0,
  phases: [["ENTRY", 0], ["ENTRY · set touch", 0.86], ["ENTRY · hop (right foot) → plant (left)", 0.98], ["CONTACT · the chop (right inside, behind the left leg)", 1.285], ["PROTECTION · the ball through the stance", 1.31], ["EXIT · push-off, the exit touch, accelerate", 1.45]],
  com: { v: [[0, 5.0], [0.92, 5.0], [1.00, 4.8], [1.13, 3.95], [1.28, 3.85], [1.30, 3.5], [1.40, 2.3], [1.47, 2.2], [1.60, 3.0], [1.80, 3.9], [2.10, 4.9], [2.50, 5.6], [3.0, 6.0]],
         h: [[0, 0], [0.98, 0], [1.13, -14], [1.28, -15], [1.30, -20], [1.40, -55], [1.47, -80], [1.60, -93], [1.80, -91], [3.0, -90]] },
  // the hips stay near the run while the striking leg crosses behind (the trunk forward — [I]), then unwind to the new line
  face: [[0, 0], [1.0, 0], [1.13, -8], [1.28, -18], [1.30, -20], [1.38, -28], [1.45, -55], [1.52, -80], [1.62, -90], [3.0, -90]],
  trunk: [[0, 0], [1.05, 0], [1.28, 6], [1.36, -6], [1.45, -14], [1.55, -8], [1.7, 0]],
  lean: [[0, 9], [0.95, 9], [1.10, 4], [1.28, 1], [1.34, 3], [1.45, 10], [1.65, 16], [2.0, 13], [2.5, 10]],
  side: [[0, 0], [1.05, 0], [1.20, -6], [1.32, -12], [1.45, -14], [1.6, -8], [1.8, 0]],
  crouch: [[0, 0.02], [1.0, 0.02], [1.20, 0.04], [1.30, 0.075], [1.42, 0.07], [1.6, 0.04], [1.9, 0.025]],
  arms: [[0, 0.15], [1.05, 0.2], [1.28, 0.7], [1.4, 0.6], [1.65, 0.25]],
  gait: [[0, 1], [1.0, 1], [1.13, 0.3], [1.45, 0.2], [1.65, 0.8], [1.9, 1]],
  look: [[0, 0.6], [0.8, 1], [1.5, 1], [1.8, 0.7]],
  pressure: { from: "rightAhead", note: "a defender alongside on the right / level-ahead, committed forward (S8, S11: 'alongside you', 'in behind the defender')" },
  // (the clip opens with the ball as the previous touch left it: rolling ahead in the right lane, arriving at the set touch at 3.2 m/s)
  ball0: (r) => ({ arrive: { t: 0.92, at: [r.comL(0.92)[0] + 0.40, 0.37], v: 3.2 }, h: 0 }),
  contacts: (r) => [
    { t: 0.92, F: "R", surface: "LACES", role: "set touch", aim: { at: CHOP_B },
      swing: { via: [{ dt: 0.03, rel: "ball", at: [0.02, 0.22, 0.13], yaw: 4, pitch: -30 }] } },
    { t: 1.30, F: "R", surface: "INSIDE", role: "CHOP", aim: { v: 4.3, h: -82 },
      // the striking foot: forward past the ball's right side, the toe turning in; the chop back-left; the follow-through crosses BEHIND the left
      // heel after the ball (the ball is faster) in the air, then swings on to land on the new line as the hips unwind
      swing: { contact: { pitch: 10, yawOff: 0 }, footSpeed: 3.0,
        via: [{ dt: -0.10, rel: "ball", at: [-0.28, 0.24, 0.20], yaw: -5, pitch: 12 }, { dt: -0.04, rel: "ball", at: [0.10, 0.26, 0.13], yaw: -28, pitch: 9 },
              // (after the ball has gone behind the left heel, the striking foot recovers FORWARD round the outside of the plant foot — a crossover
              // step onto the new line; behind the plant leg there is no room once the body has turned over it)
              { dt: 0.035, rel: "ball", at: [0.15, 0.19, 0.15], yaw: -20, pitch: 2 }, { dt: 0.08, rel: "O", at: [0.34, 0.28, 0.22], yaw: -25, pitch: 5 },
              { dt: 0.14, rel: "O", at: [0.50, -0.10, 0.18], yaw: -60, pitch: 5 }] } },
    { t: 1.60, F: "L", surface: "LACES", role: "exit touch", aim: { v: 5.8, h: -90 }, swing: { via: [{ dt: 0.03, rel: "ball", at: [0.15, 0.10, 0.12], yaw: -70 }] } },
    { t: 2.15, F: "L", surface: "LACES", role: "carry", aim: { v: 6.0, h: -90 }, swing: { via: [{ dt: 0.03, rel: "ball", at: [0.15, 0.10, 0.12], yaw: -70 }] } },
  ],
  stances: (r) => [
    runSt("R", -0.93, -0.76), runSt("L", -0.61, -0.44), runSt("R", -0.29, -0.12), runSt("L", 0.03, 0.20), runSt("R", 0.35, 0.52), runSt("L", 0.67, 0.84),
    atSt("R", 0.98, 1.13, (rr) => { const c = rr.comL(0.98); return [c[0] + 0.24, c[1] + 0.30]; }, 0, { kind: "hop (push-off left, braking)" }),
    // the left (shielding) leg: its swing passes the ball's left side, then reaches across in front of it
    atSt("L", 1.28, 1.46, (rr) => [CHOP_B[0] + 0.30, CHOP_B[1] - 0.14], -30, { kind: "PLANT · the shielding leg in front of the ball",
      swingIn: { via: [{ t: 1.15, rel: "ball", at: [-0.02, -0.26, 0.22], pitch: 10 }, { t: 1.23, rel: "ball", at: [0.26, -0.18, 0.15], yaw: -25, pitch: 6 }] } }),
    atSt("R", 1.52, 1.64, (rr) => [0.36, -0.66], -85, { kind: "the striking foot down on the new line (a crossover step)" }),
    runSt("L", 1.66, 1.80, { w: 0.04 }), runSt("R", 1.94, 2.08), runSt("L", 2.21, 2.34, { w: 0.06 }),
    runSt("R", 2.48, 2.61), runSt("L", 2.74, 2.87, { w: 0.0 }), runSt("R", 3.00, 3.13), runSt("L", 3.26, 3.39),
  ],
};
// ═══ 45° — THE OUTSIDE-FOOT CUT (to the right; the right foot's outside) ═════════════════════════════════════════════════════════════════════════
// [E] the foot on the turn side, its OUTSIDE ("pinky toe"); the plant (opposite) foot beside / past the ball; at speed, little braking at ≤ 45°;
// low, the body turns with the ball; one cut + a big exit touch; accelerate over 5 – 6 steps. Biomechanics: approach ≈ 5.8 m/s at 45°, ~0.4
// braking steps, the plant 0.15 s; one plant turns ~18° at 5 m/s (Vanrenterghem) — the body completes the turn over two steps; pelvis pre-rotation
// ~14° at 45°. [I] the ball never crosses the standing leg; the left side (the planted leg and the body) stays between a defender on the left /
// front-left and the ball.
// [D] 5.5 m/s; the left plant 0.30 m ahead / 0.22 m left of the centre of mass (a side-step: the outside foot pushes the body right); the cut
// 0.12 s into the plant, the ball 0.20 m ahead / 0.12 m right of the centre of mass; 5.6 m/s at 45°; the next touch (right foot) ~0.6 s later.
export const OUTCUT45 = {
  id: "OUTCUT45", label: "45° outside-foot cut (to the right)", family: "OUTSIDE CUT", turnDeg: 45, dur: 2.2, tC: 1.20, approach: 5.5,
  phases: [["ENTRY", 0], ["ENTRY · the plant (left foot, outside the turn)", 1.04], ["CONTACT · the cut (right outside)", 1.185], ["PROTECTION · the body between the left side and the ball", 1.215], ["EXIT · the next steps on the new line, accelerate", 1.32]],
  com: { v: [[0, 5.5], [1.0, 5.5], [1.08, 5.4], [1.22, 5.0], [1.30, 4.85], [1.45, 5.0], [1.8, 5.6], [2.2, 6.1], [2.5, 6.3]],
         h: [[0, 0], [1.06, 0], [1.20, 14], [1.28, 28], [1.42, 41], [1.56, 45], [2.5, 45]] },
  face: [[0, 0], [0.98, 0], [1.08, 10], [1.20, 24], [1.32, 38], [1.45, 45], [2.5, 45]],
  trunk: [[0, 0], [1.0, 0], [1.10, 5], [1.20, 8], [1.35, 0]],
  lean: [[0, 10], [1.0, 10], [1.12, 7], [1.25, 9], [1.40, 13], [1.8, 11]],
  side: [[0, 0], [1.04, 0], [1.15, 6], [1.30, 9], [1.50, 3], [1.7, 0]],
  crouch: [[0, 0.02], [1.0, 0.02], [1.15, 0.05], [1.30, 0.045], [1.5, 0.025]],
  arms: [[0, 0.15], [1.0, 0.15], [1.15, 0.45], [1.35, 0.3], [1.6, 0.15]],
  gait: [[0, 1], [1.02, 1], [1.12, 0.55], [1.30, 0.55], [1.45, 1]],
  look: [[0, 0.6], [0.8, 1], [1.4, 1], [1.7, 0.6]],
  pressure: { from: "left", note: "a defender in front / on the far (left) side (A1, A2: cut away from the defender with the far foot)" },
  ball0: (r) => ({ arrive: { t: 0.69, at: [r.comL(0.69)[0] + 0.42, 0.12], v: 3.6 }, h: 0 }),
  contacts: (r) => [
    { t: 0.69, F: "R", surface: "LACES", role: "carry", aim: { at: (rr) => { const c = rr.comL(1.20); return [c[0] + 0.20, c[1] + 0.12]; } },
      swing: { via: [{ dt: 0.03, rel: "ball", at: [-0.02, -0.20, 0.13], yaw: -4, pitch: -30 }] } },
    { t: 1.20, F: "R", surface: "OUTSIDE", role: "OUTSIDE CUT", aim: { v: 6.4, h: 42 },
      // the right foot comes through between the plant foot and the ball, then its outside sweeps the ball right
      swing: { contact: { pitch: -16, roll: 6 }, footSpeed: 2.4, via: [{ dt: -0.08, rel: "ballNow", at: [-0.20, -0.22, 0.16], yaw: 18, pitch: -10 }, { dt: 0.035, rel: "ballNow", at: [...off([0, 0], 42, -0.15, -0.18), 0.12], yaw: 35, pitch: -6 }] } },
    { t: 1.78, F: "R", surface: "LACES", role: "exit touch", aim: { v: 6.0, h: 45 }, swing: { via: [{ dt: 0.03, rel: "ball", at: [...off([0, 0], 45, -0.05, 0.17), 0.12], yaw: 60 }] } },
  ],
  stances: (r) => [
    runSt("R", -0.49, -0.33), runSt("L", -0.18, -0.02), runSt("R", 0.13, 0.29), runSt("L", 0.44, 0.60), runSt("R", 0.75, 0.91, { w: 0.0 }),
    atSt("L", 1.06, 1.21, (rr) => { const c = rr.comL(1.06); return [c[0] + 0.30, c[1] - 0.22]; }, 12, { kind: "PLANT · the outside foot (pushes the body right)" }),
    runSt("R", 1.27, 1.42, { lead: 0.20, w: -0.02 }), runSt("L", 1.55, 1.70), runSt("R", 1.84, 1.98, { lead: 0.16, w: 0.22 }), runSt("L", 2.11, 2.24), runSt("R", 2.38, 2.51), runSt("L", 2.64, 2.77), runSt("R", 2.90, 3.03),
  ],
};
// ═══ 120° — THE CRUYFF TURN (to the left; the right foot's inside drags the ball behind the left leg) ═════════════════════════════════════════════
// [E] a fake (shot / pass): slow down on the approach and sell it; plant beside / past the ball, WIDE, ~45° to the approach (Smith 2000); the
// kicking (right) foot, instead of striking, goes in front of the ball and its INSIDE ("big toe behind the ball", "wrap the foot around the
// ball") drags it BEHIND and across the standing (left) leg, "sideways or back"; knees bent, the shoulders turn with the drag; the player pivots
// on the plant toward its side (left) and accelerates; 90 – 180° (mostly 180°). [I] at the drag the legs are between the ball and a blocking
// defender in front; after the turn the hip and back face him.
// [D] 4.0 m/s, braked over two steps to ~1 m/s at the drag; the ball nearly stopped beside the plant (the set touch "taps" it ahead); the plant
// 0.15 m past / 0.22 m left of the ball, toes 45° in; the drag at 2.8 m/s toward 120°; the pivot on the left forefoot; exit touch with the right
// foot (the ball comes out on the right of the new line).
const CR_B = [-0.12, 0.20];                                     // [D] the ball at the drag: just behind-right of the centre of mass, behind the plant's heel
export const CRUYFF120 = {
  id: "CRUYFF120", label: "120° Cruyff turn (to the left)", family: "CRUYFF TURN", turnDeg: -120, dur: 2.5, tC: 1.40, approach: 4.0,
  phases: [["ENTRY", 0], ["ENTRY · slowing, the set touch", 0.36], ["ENTRY · the plant beside / past the ball, the fake", 1.20], ["CONTACT · the drag (right inside, behind the left leg)", 1.385], ["PROTECTION · the pivot on the left forefoot", 1.415], ["EXIT · the left foot takes the ball on, accelerate", 1.62]],
  // the body brakes onto the plant and nearly stops over it (the pivot: the weight on the left forefoot), then drives out along the new line
  com: { v: [[0, 4.0], [0.90, 4.0], [1.04, 3.4], [1.22, 2.4], [1.32, 1.1], [1.40, 0.35], [1.48, 0.15], [1.56, 0.45], [1.66, 1.2], [1.80, 2.2], [2.0, 3.3], [2.3, 4.4], [2.5, 5.0]],
         h: [[0, 0], [1.38, 0], [1.46, -40], [1.54, -110], [1.64, -125], [1.9, -123], [2.2, -120], [2.5, -120]] },
  face: [[0, 0], [1.20, 0], [1.30, -6], [1.38, -12], [1.44, -45], [1.50, -85], [1.56, -110], [1.66, -120], [2.5, -120]],
  trunk: [[0, 0], [1.30, 0], [1.38, 4], [1.44, -16], [1.52, -10], [1.62, 0]],
  lean: [[0, 9], [1.0, 9], [1.20, 4], [1.32, 8], [1.40, 4], [1.52, 4], [1.66, 14], [1.9, 13]],
  side: [[0, 0], [1.38, 0], [1.46, -8], [1.58, -5], [1.75, 0]],
  crouch: [[0, 0.02], [1.15, 0.03], [1.32, 0.06], [1.46, 0.08], [1.60, 0.05], [1.85, 0.03]],
  arms: [[0, 0.15], [1.15, 0.2], [1.34, 0.6], [1.48, 0.7], [1.70, 0.3]],
  gait: [[0, 1], [1.05, 1], [1.25, 0.4], [1.60, 0.2], [1.80, 0.8], [1.95, 1]],
  look: [[0, 0.6], [0.8, 1], [1.7, 1], [1.95, 0.7]],
  pressure: { from: "front", note: "a defender in front, blocking the shot / pass (S2, S3: 'in front of you', close marking)" },
  ball0: (r) => ballStart(r, 0.22, 4.0),
  contacts: (r) => [
    ...carryTouches([0.41], 0.22, CR_B).map((c) => Object.assign(c, { role: "set touch (rolls to beside the plant)" })),
    { t: 1.40, F: "R", surface: "INSIDE", role: "CRUYFF drag", aim: { v: 2.8, h: -120 },
      // the fake: a backswing behind, the leg swings forward — and the foot goes past the ball's right side to its front, toe down, the inside
      // wrapped round it; the drag back behind the left heel; then the foot swings round the front of the plant foot onto the new line
      swing: { contact: { pitch: -6, yawOff: 0 }, footSpeed: 2.2,
        via: [{ t: 1.28, rel: "ballNow", at: [-0.30, 0.16, 0.30], yaw: 2, pitch: -35 }, { dt: -0.035, rel: "ballNow", at: [0.14, 0.18, 0.12], yaw: -20, pitch: -12 },
              { dt: 0.03, rel: "O", at: [0.02, 0.24, 0.15], yaw: -60, pitch: 0 }, { dt: 0.08, rel: "O", at: [0.25, 0.14, 0.20], yaw: -80, pitch: 4 }, { dt: 0.13, rel: "O", at: [0.28, -0.10, 0.17], yaw: -105, pitch: 4 }] } },
    { t: 1.78, F: "L", surface: "LACES", role: "exit touch (left foot)", aim: { v: 5.0, h: -122 }, swing: { via: [{ dt: 0.03, rel: "ballNow", at: [...off([0, 0], -122, -0.18, 0.17), 0.13], yaw: -110 }] } },
  ],
  stances: (r) => [
    runSt("L", -0.44, -0.25), runSt("R", -0.10, 0.09), runSt("L", 0.20, 0.39), runSt("R", 0.50, 0.64, { afterTouch: true }), runSt("L", 0.80, 1.00, { kind: "braking" }),
    runSt("R", 1.04, 1.20, { lead: 0.16, w: 0.0, kind: "braking (penultimate)" }),
    atSt("L", 1.22, 1.62, (rr) => [0.04, -0.06], -40, { kind: "PLANT · beside / past the ball; the pivot on the forefoot", pivot: [[1.40, 0], [1.60, -80]], heel: (t) => (t > 1.40 ? 14 * Math.min(1, (t - 1.40) / 0.06) : 0) }),
    atSt("R", 1.58, 1.74, (rr) => [0.18, -0.30], -112, { kind: "the dragging foot down on the new line" }),
    atSt("L", 1.84, 1.98, (rr) => { const b = rr.ballL(1.84); return off(b, -122, -0.25, 0.17); }, -122), runSt("R", 2.08, 2.22, { w: 0.14 }), runSt("L", 2.32, 2.45), runSt("R", 2.55, 2.68), runSt("L", 2.78, 2.91),
  ],
};
// ═══ 150° — THE INSIDE HOOK (to the left; the right foot's inside hooks the ball back) ═══════════════════════════════════════════════════════════
// [E] decelerate, shorten the stride; the standing (left) foot beside / behind the ball; the other foot "comes round", its INSIDE over and behind
// (beyond) the ball, and hooks it back behind the standing foot; rotate and lower the body, pivot the same way as the ball; the turning shoulder
// and body between the ball and the defender; two touches: the hook, then an exit touch; 135 – 180°.
// [D] 3.5 m/s braked to ~0.8 m/s; the standing foot 0.12 m past / 0.24 m left of the ball; the right foot reaches round the ball's far (front)
// side, toe turned in, and hooks it back at 2.4 m/s toward 150°; the body turns with it on the left forefoot; the exit touch with the right foot.
const HK_B = [0.28, 0.20];                                      // [D] the ball at the hook: a step ahead of the body, on its right
export const HOOK150 = {
  id: "HOOK150", label: "150° inside hook (to the left)", family: "INSIDE HOOK", turnDeg: -150, dur: 2.4, tC: 1.42, approach: 3.5,
  phases: [["ENTRY", 0], ["ENTRY · decelerating, short steps", 0.95], ["ENTRY · the standing foot beside the ball, the foot comes round", 1.30], ["CONTACT · the hook (right inside, from beyond the ball)", 1.405], ["PROTECTION · the body turns with the ball: shoulder and back to the pressure", 1.435], ["EXIT · the exit touch, accelerate", 1.66]],
  com: { v: [[0, 3.5], [0.90, 3.5], [1.06, 2.8], [1.22, 1.6], [1.34, 0.8], [1.42, 0.4], [1.50, 0.15], [1.58, 0.45], [1.70, 1.3], [1.85, 2.3], [2.1, 3.4], [2.4, 4.4], [2.6, 4.9]],
         h: [[0, 0], [1.42, 0], [1.50, -70], [1.58, -140], [1.70, -150], [2.6, -150]] },
  face: [[0, 0], [1.28, 0], [1.40, -20], [1.46, -50], [1.54, -100], [1.62, -140], [1.72, -150], [2.6, -150]],
  trunk: [[0, 0], [1.32, 0], [1.42, -10], [1.50, -22], [1.60, -10], [1.72, 0]],
  lean: [[0, 9], [1.0, 9], [1.22, 6], [1.36, 16], [1.46, 14], [1.58, 8], [1.75, 15], [2.0, 13]],
  side: [[0, 0], [1.40, 0], [1.48, -12], [1.60, -8], [1.78, 0]],
  crouch: [[0, 0.02], [1.15, 0.035], [1.34, 0.08], [1.46, 0.11], [1.60, 0.07], [1.85, 0.03]],
  arms: [[0, 0.15], [1.15, 0.25], [1.38, 0.65], [1.52, 0.75], [1.75, 0.3]],
  gait: [[0, 1], [1.05, 1], [1.25, 0.4], [1.62, 0.2], [1.80, 0.8], [2.0, 1]],
  look: [[0, 0.6], [0.8, 1], [1.7, 1], [1.95, 0.7]],
  pressure: { from: "rightAhead", note: "a defender ahead / alongside on the right, closing down: the hook turns the player's back to him (A9, S24: the turning shoulder between ball and defender)" },
  ball0: (r) => ballStart(r, 0.21, 3.5),
  contacts: (r) => [
    ...carryTouches([0.46], 0.21, HK_B),
    { t: 1.42, F: "R", surface: "INSIDE", role: "HOOK", aim: { v: 3.0, h: -150 },
      // the foot comes round the ball's right side and over its far (front) side, toe turned in; the hook back past the standing foot; a short
      // follow-through (the ball is faster), then down behind-right of the body as it turns
      swing: { contact: { pitch: 2, yawOff: 0 }, footSpeed: 2.0,
        via: [{ dt: -0.15, rel: "ballNow", at: [-0.40, 0.08, 0.24], yaw: 25, pitch: 4 }, { dt: -0.10, rel: "ballNow", at: [-0.16, 0.26, 0.22], yaw: 25, pitch: 4 }, { dt: -0.05, rel: "ballNow", at: [0.18, 0.20, 0.22], yaw: -30, pitch: 4 },
              { dt: 0.04, rel: "O", at: [0.46, 0.06, 0.16], yaw: -85, pitch: 2 }, { dt: 0.09, rel: "O", at: [0.46, -0.22, 0.16], yaw: -120, pitch: 2 }] } },
    { t: 1.80, F: "L", surface: "LACES", role: "exit touch (left foot)", aim: { v: 4.8, h: -150 }, swing: { via: [{ dt: 0.03, rel: "ballNow", at: [...off([0, 0], -150, -0.20, 0.17), 0.13], yaw: -140 }] } },
  ],
  stances: (r) => [
    runSt("L", -0.46, -0.24), runSt("R", -0.12, 0.10), runSt("L", 0.24, 0.46), runSt("R", 0.58, 0.73, { afterTouch: true }), runSt("L", 0.92, 1.10, { kind: "braking, short" }),
    runSt("R", 1.12, 1.24, { lead: 0.16, w: -0.04, kind: "braking, short" }),
    atSt("L", 1.30, 1.70, (rr) => [0.04, -0.18], -20, { kind: "STANDING FOOT beside the ball; pivots with the body once the ball has gone past", pivot: [[1.56, 0], [1.70, -110]], heel: (t) => (t > 1.54 ? 16 * Math.min(1, (t - 1.54) / 0.06) : 0) }),
    atSt("R", 1.57, 1.74, (rr) => [0.28, -0.46], -140, { kind: "the hooking foot down beside the standing foot as the body turns" }),
    atSt("L", 1.86, 2.00, (rr) => { const b = rr.ballL(1.86); return off(b, -150, -0.25, 0.17); }, -150), runSt("R", 2.09, 2.23, { w: 0.14 }), runSt("L", 2.32, 2.45), runSt("R", 2.55, 2.68), runSt("L", 2.78, 2.91),
  ],
};
// ═══ 180° — THE DRAG-BACK (turning to the right; the right sole pulls the ball back, the left foot takes it away) ════════════════════════════════
// [E] low – moderate speed, slow down; the standing (left) foot beside the ball; the SOLE (toe part) on top of the ball pulls it straight back
// under the body (≤ ~1 m); turn quickly (side disputed — the majority to the dragging foot's side); two contacts: the pull and a push (usually the
// other foot); force plates (Smith 2000): the support foot plants heel-to-toe, then re-places at ~90° and pushes off sideways; a burst.
// [I] the pull takes the ball away from a frontal tackle; the turning body sits between.
// [D] 3.0 m/s braked to ~0.35 m/s; the standing foot beside the ball, 0.24 m to its left; the pull at 1.7 m/s straight back; the pulling foot down
// behind; the body turns right; the standing foot re-placed (turned) beside the rolling ball; the push with the left foot's laces at 4.6 m/s.
const DB_B = [0.20, 0.18];
export const DRAGBACK180 = {
  id: "DRAGBACK180", label: "180° drag-back (turning to the right)", family: "DRAG-BACK", turnDeg: 180, dur: 2.6, tC: 1.40, approach: 3.0,
  phases: [["ENTRY", 0], ["ENTRY · slowing down", 0.95], ["ENTRY · the standing foot beside the ball", 1.24], ["CONTACT · the pull (right sole)", 1.385], ["PROTECTION · the ball under the body, the turn (the standing foot re-placed)", 1.42], ["CONTACT 2 · the push (left laces) on the reversed line", 1.62], ["EXIT · accelerate", 1.68]],
  com: { v: [[0, 3.0], [0.90, 3.0], [1.06, 2.3], [1.22, 1.3], [1.34, 0.6], [1.40, 0.35], [1.48, 0.15], [1.56, 0.4], [1.66, 1.1], [1.80, 2.1], [2.0, 3.2], [2.3, 4.3], [2.6, 5.0]],
         h: [[0, 0], [1.40, 0], [1.48, 90], [1.56, 170], [1.66, 180], [2.6, 180]] },
  face: [[0, 0], [1.30, 0], [1.40, 4], [1.47, 50], [1.55, 120], [1.63, 165], [1.72, 180], [2.6, 180]],
  trunk: [[0, 0], [1.36, 0], [1.42, 10], [1.50, 18], [1.60, 8], [1.72, 0]],
  lean: [[0, 9], [1.0, 8], [1.20, 2], [1.36, -2], [1.46, 0], [1.58, 6], [1.72, 15], [2.0, 13]],
  side: [[0, 0], [1.40, 0], [1.48, 8], [1.60, 4], [1.75, 0]],
  crouch: [[0, 0.02], [1.15, 0.03], [1.36, 0.05], [1.48, 0.07], [1.62, 0.06], [1.85, 0.03]],
  arms: [[0, 0.15], [1.15, 0.2], [1.38, 0.5], [1.52, 0.7], [1.75, 0.3]],
  gait: [[0, 1], [1.05, 1], [1.25, 0.4], [1.62, 0.2], [1.80, 0.8], [2.0, 1]],
  look: [[0, 0.6], [0.8, 1], [1.7, 1], [2.0, 0.7]],
  pressure: { from: "front", note: "a defender in front, tight (back to goal / closing down — S27, S28)" },
  ball0: (r) => ballStart(r, 0.19, 3.0),
  contacts: (r) => [
    ...carryTouches([0.45], 0.19, DB_B),
    { t: 1.40, F: "R", surface: "SOLE", role: "DRAG-BACK pull", aim: { v: 1.7, h: 180 },
      // the sole onto the top of the ball, pull it back; the foot rides back with it and steps down behind, beside its path
      swing: { contact: { pitch: 18 }, footSpeed: 1.4,
        via: [{ dt: -0.14, rel: "ballNow", at: [-0.34, -0.02, 0.30], yaw: 20, pitch: -25 }, { dt: -0.08, rel: "ballNow", at: [-0.24, 0.05, 0.34], yaw: 0, pitch: 0 }, { dt: 0.04, rel: "O", at: [0.20, 0.0, 0.25], yaw: 10, pitch: 6 }, { dt: 0.08, rel: "O", at: [0.02, -0.08, 0.17], yaw: 45, pitch: 4 }] } },
    { t: 1.64, F: "L", surface: "LACES", role: "push (2nd contact)", aim: { v: 4.6, h: 180 },
      swing: { via: [{ dt: -0.08, rel: "ballNow", at: [0.30, 0.16, 0.18], yaw: 150, pitch: -10 }, { dt: 0.03, rel: "ballNow", at: [0.20, 0.19, 0.13], yaw: 175, pitch: -10 }] } },
  ],
  stances: (r) => [
    runSt("L", -0.50, -0.26), runSt("R", -0.14, 0.10), runSt("L", 0.22, 0.46), runSt("R", 0.58, 0.74, { afterTouch: true }), runSt("L", 0.92, 1.12, { w: 0.13, kind: "braking" }),
    runSt("R", 1.10, 1.22, { lead: 0.16, w: -0.01, kind: "braking" }),
    atSt("L", 1.26, 1.50, (rr) => [0.12, -0.12], 0, { kind: "STANDING FOOT beside the ball (heel-to-toe)" }),
    atSt("R", 1.50, 1.72, (rr) => [-0.12, -0.10], 70, { kind: "the pulling foot down behind (the turning support)", pivot: [[1.52, 0], [1.70, 90]], heel: (t) => (t > 1.52 ? 12 * Math.min(1, (t - 1.52) / 0.06) : 0) }),
    atSt("L", 1.71, 1.84, (rr) => { const b = rr.ballL(1.71); return off(b, 180, -0.22, -0.18); }, 175, { kind: "the pushing foot down beside the ball's path" }),
    runSt("R", 1.94, 2.08, { w: 0.12 }), runSt("L", 2.19, 2.32), runSt("R", 2.43, 2.56), runSt("L", 2.66, 2.79),
  ],
};
export const TECH = { OUTCUT45, CHOP90, CRUYFF120, HOOK150, DRAGBACK180 };
