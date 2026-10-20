// ═══ tc_playtest1/pt_tech.js — TECHNICAL-CONTROL PLAYTEST-1: the five TECHNICAL-CONTROL-1.5 references as PARAMETRIC TECHNIQUES ═════════════════
// Each reference (technical_control15/tc15_tech.js, presented 20 Oct, not frozen) re-expressed around its decisive contact (τ = t − tC, seconds)
// in its RIGHT-FOOT REFERENCE FRAME ([ahead, + right] from the entry heading; headings / yaws in degrees, + = right): the same mechanics — the chop's
// shielding leg across in front of the ball, the inside of the striking foot from behind it, the ball behind / through the stance, the crossover
// recovery onto the new line; the Cruyff's drag behind the plant; the hook from beyond the ball; the drag-back's sole pull — with three freedoms
// the playground needs:
//   · the TURN ANGLE is the request's, not the reference's: headings, pivots and the launch after the contact scale with Δ / Δref, and every
//     exit-side position / foot yaw rotates with (Δ − Δref) by its exit weight (0 = the entry frame, 1 = the exit frame) — no angle buckets: a
//     technique has a comfortable range (no cost) and a hard range (beyond it, infeasible), the resolver scores the rest
//   · the MIRROR: m = +1 the right foot strikes (as authored), m = −1 the left (lateral, headings and yaws negate; F / S swap)
//   · the ENTRY: the template's window starts at its first authored stance (`start`); the approach before it is generic (pt_sim.js: the gait and
//     the braking fitted to land that stance on time, the last touch of the striking foot aimed at the ball's point at the contact — the set touch)
// F = the striking (contact) foot, S = the other (the support / shielding / standing foot).
// Positions: rel "com" (the centre of mass at τ = t, entry frame) · "travel" (the same, in the travel frame at t) · "O" (the centre of mass at the
// decisive contact) · "B" (the ball at the decisive contact) · for swing waypoints also "ball" (the decisive contact's ball), "ballNow" (the ball at
// the waypoint's time), "pelvis" (forward / right in the pelvis frame then).
export const TEMPLATES = {
  // ── RONALDO CHOP — the right foot's inside, behind the left (shielding) leg, turning left (reference 90°) ─────────────────────────────────────────
  CHOP: { id: "CHOP", label: "RONALDO CHOP", turn: -1, ref: 90, comfort: [70, 105], hard: [55, 122], vRange: [3.6, 9.5], vFloor: 3.6,
    start: -0.32, end: 0.80, firstFoot: "F", B: [-0.10, 0.24], tLine: 0.24, protect: 0.90, preTurn: true,
    com: { v: [[-0.32, 4.85], [-0.17, 3.95], [-0.02, 3.85], [0, 3.5], [0.10, 2.3], [0.17, 2.2], [0.30, 3.0], [0.50, 3.9], [0.80, 4.9]],
           h: [[-0.32, 0], [-0.17, -14], [-0.02, -15], [0, -20], [0.10, -55], [0.17, -80], [0.30, -93], [0.50, -91], [0.70, -90]] },
    face: [[-0.32, 0], [-0.17, -8], [-0.02, -18], [0, -20], [0.08, -28], [0.15, -55], [0.22, -80], [0.32, -90]],
    trunk: [[-0.32, 0], [-0.25, 0], [-0.02, 6], [0.06, -6], [0.15, -14], [0.25, -8], [0.40, 0]],
    lean: [[-0.32, 6], [-0.20, 4], [-0.02, 1], [0.04, 3], [0.15, 10], [0.35, 16], [0.70, 13]],
    side: [[-0.32, 0], [-0.25, 0], [-0.10, -6], [0.02, -12], [0.15, -14], [0.30, -8], [0.50, 0]],
    crouch: [[-0.32, 0.025], [-0.10, 0.04], [0, 0.075], [0.12, 0.07], [0.30, 0.04], [0.60, 0.025]],
    arms: [[-0.32, 0.2], [-0.25, 0.2], [-0.02, 0.7], [0.10, 0.6], [0.35, 0.25]],
    gait: [[-0.32, 1], [-0.17, 0.3], [0.15, 0.2], [0.35, 0.8], [0.60, 1]],
    look: [[-0.32, 1], [0.20, 1], [0.50, 0.7]],
    stances: [
      { F: "F", t0: -0.32, t1: -0.17, at: { rel: "com", t: -0.32, p: [0.24, 0.30] }, yaw: 0, kind: "hop (push-off, braking)" },
      { F: "S", t0: -0.02, t1: 0.16, at: { rel: "B", p: [0.30, -0.14] }, yaw: -30, kind: "PLANT · the shielding leg in front of the ball",
        swingIn: { via: [{ tau: -0.15, rel: "ballNow", at: [-0.02, -0.26, 0.22], pitch: 10 }, { tau: -0.07, rel: "ballNow", at: [0.26, -0.18, 0.15], yaw: -25, pitch: 6 }] } },
      { F: "F", t0: 0.22, t1: 0.34, at: { rel: "O", p: [0.36, -0.66] }, yaw: -85, w: 1, kind: "the striking foot down on the new line (crossover)" },
    ],
    contacts: [
      { F: "F", tau: 0, surface: "INSIDE", role: "RONALDO CHOP", decisive: true, aim: { v: 4.3, launch: -82 },
        swing: { contact: { pitch: 10 }, footSpeed: 3.0, via: [{ dt: -0.10, rel: "ball", at: [-0.28, 0.24, 0.20], yaw: -5, pitch: 12 }, { dt: -0.04, rel: "ball", at: [0.10, 0.26, 0.13], yaw: -28, pitch: 9 },
          { dt: 0.035, rel: "ball", at: [0.15, 0.19, 0.15], yaw: -20, pitch: 2 }, { dt: 0.08, rel: "O", at: [0.34, 0.28, 0.22], yaw: -25, pitch: 5, w: 0.5 }, { dt: 0.14, rel: "O", at: [0.50, -0.10, 0.18], yaw: -60, pitch: 5, w: 1 }] } },
      { F: "S", tau: 0.30, surface: "LACES", role: "exit touch", aim: { v: 5.8, launch: "exit" }, swing: { via: [{ dt: 0.03, rel: "ball", at: [0.15, 0.10, 0.12], yaw: -70, w: 1 }] } },
    ] },
  // ── OUTSIDE-FOOT CUT — the right foot's outside, the left (outside-the-turn) foot planted, turning right (reference 45°) ───────────────────────
  OUTCUT: { id: "OUTCUT", label: "OUTSIDE CUT", turn: 1, ref: 45, comfort: [25, 60], hard: [14, 92], vRange: [2.8, 9.5], vFloor: 2.8,
    start: -0.14, end: 0.60, firstFoot: "S", B: [0.20, 0.12], tLine: 0.10, protect: 0.50,
    com: { v: [[-0.14, 5.4], [0.02, 5.0], [0.10, 4.85], [0.25, 5.0], [0.60, 5.6]], h: [[-0.14, 0], [0, 14], [0.08, 28], [0.22, 41], [0.36, 45]], scaleAll: true },
    face: [[-0.22, 0], [-0.12, 10], [0, 24], [0.12, 38], [0.25, 45]],
    trunk: [[-0.20, 0], [-0.10, 5], [0, 8], [0.15, 0]],
    lean: [[-0.20, 10], [-0.08, 7], [0.05, 9], [0.20, 13], [0.60, 11]],
    side: [[-0.16, 0], [-0.05, 6], [0.10, 9], [0.30, 3], [0.50, 0]],
    crouch: [[-0.20, 0.02], [-0.05, 0.05], [0.10, 0.045], [0.30, 0.025]],
    arms: [[-0.20, 0.15], [-0.05, 0.45], [0.15, 0.3], [0.40, 0.15]],
    gait: [[-0.18, 1], [-0.08, 0.55], [0.10, 0.55], [0.25, 1]],
    look: [[-0.20, 1], [0.20, 1], [0.50, 0.6]],
    stances: [
      { F: "S", t0: -0.14, t1: 0.01, at: { rel: "com", t: -0.14, p: [0.30, -0.22] }, yaw: 12, wYaw: 1, kind: "PLANT · the outside foot (pushes the body into the turn)" },
      { F: "F", t0: 0.07, t1: 0.22, at: { rel: "travel", t: 0.07, p: [0.20, -0.02] }, yaw: "travel", kind: "the cutting foot down on the new line" },
    ],
    contacts: [
      { F: "F", tau: 0, surface: "OUTSIDE", role: "OUTSIDE CUT", decisive: true, aim: { v: 6.4, launch: 42 },
        swing: { contact: { pitch: -16, roll: 6 }, footSpeed: 2.4, via: [{ dt: -0.08, rel: "ballNow", at: [-0.20, -0.22, 0.16], yaw: 18, pitch: -10 }, { dt: 0.035, rel: "ballNow", exitAt: [-0.15, -0.18], h: 0.12, yaw: 35, pitch: -6, w: 1 }] } },
    ] },
  // ── CRUYFF TURN — the right foot's inside drags the ball behind the left (plant) leg; the pivot on it, turning left (reference 120°) ─────────────
  CRUYFF: { id: "CRUYFF", label: "CRUYFF TURN", turn: -1, ref: 120, comfort: [95, 145], hard: [80, 168], vRange: [1.2, 7.5], vFloor: 1.2,
    start: -0.36, end: 0.90, firstFoot: "F", B: [-0.12, 0.20], tLine: 0.44, protect: 0.95,
    com: { v: [[-0.36, 3.4], [-0.18, 2.4], [-0.08, 1.1], [0, 0.35], [0.08, 0.15], [0.16, 0.45], [0.26, 1.2], [0.40, 2.2], [0.60, 3.3], [0.90, 4.4]],
           h: [[-0.36, 0], [-0.02, 0], [0.06, -40], [0.14, -110], [0.24, -125], [0.50, -123], [0.80, -120]] },
    face: [[-0.36, 0], [-0.20, 0], [-0.10, -6], [-0.02, -12], [0.04, -45], [0.10, -85], [0.16, -110], [0.26, -120]],
    trunk: [[-0.36, 0], [-0.10, 0], [-0.02, 4], [0.04, -16], [0.12, -10], [0.22, 0]],
    lean: [[-0.36, 6], [-0.20, 4], [-0.08, 8], [0, 4], [0.12, 4], [0.26, 14], [0.50, 13]],
    side: [[-0.36, 0], [-0.02, 0], [0.06, -8], [0.18, -5], [0.35, 0]],
    crouch: [[-0.36, 0.03], [-0.08, 0.06], [0.06, 0.08], [0.20, 0.05], [0.45, 0.03]],
    arms: [[-0.36, 0.2], [-0.06, 0.6], [0.08, 0.7], [0.30, 0.3]],
    gait: [[-0.36, 0.6], [-0.15, 0.4], [0.20, 0.2], [0.40, 0.8], [0.55, 1]],
    look: [[-0.36, 1], [0.30, 1], [0.55, 0.7]],
    stances: [
      { F: "F", t0: -0.36, t1: -0.20, at: { rel: "travel", t: -0.36, p: [0.16, 0.0] }, yaw: "travel", kind: "braking (penultimate)" },
      { F: "S", t0: -0.18, t1: 0.22, at: { rel: "O", p: [0.04, -0.06] }, yaw: -40, pivot: [[0, 0], [0.20, -80]], heel: [0, 14], kind: "PLANT · beside / past the ball; the pivot on the forefoot" },
      { F: "F", t0: 0.18, t1: 0.34, at: { rel: "O", p: [0.18, -0.30] }, yaw: -112, w: 1, kind: "the dragging foot down on the new line" },
    ],
    contacts: [
      { F: "F", tau: 0, surface: "INSIDE", role: "CRUYFF TURN", decisive: true, aim: { v: 2.8, launch: -120 },
        swing: { contact: { pitch: -6 }, footSpeed: 2.2, via: [{ tau: -0.12, rel: "ballNow", at: [-0.30, 0.16, 0.30], yaw: 2, pitch: -35 }, { dt: -0.035, rel: "ballNow", at: [0.14, 0.18, 0.12], yaw: -20, pitch: -12 },
          { dt: 0.03, rel: "O", at: [0.02, 0.24, 0.15], yaw: -60, pitch: 0 }, { dt: 0.08, rel: "O", at: [0.25, 0.14, 0.20], yaw: -80, pitch: 4, w: 0.5 }, { dt: 0.13, rel: "O", at: [0.28, -0.10, 0.17], yaw: -105, pitch: 4, w: 1 }] } },
      { F: "S", tau: 0.38, surface: "LACES", role: "exit touch", aim: { v: 5.0, launch: "exit" }, swing: { via: [{ dt: 0.03, rel: "ballNow", exitAt: [-0.18, 0.17], h: 0.13, yaw: 10, wYawExit: true }] } },
    ] },
  // ── INSIDE HOOK — the right foot comes round and beyond the ball, its inside hooks it back past the left (standing) foot, turning left (150°) ───
  HOOK: { id: "HOOK", label: "INSIDE HOOK", turn: -1, ref: 150, comfort: [130, 172], hard: [112, 185], vRange: [0.8, 6.5], vFloor: 0.8,
    start: -0.30, end: 0.98, firstFoot: "F", B: [0.28, 0.20], tLine: 0.40, protect: 0.55,
    com: { v: [[-0.30, 2.6], [-0.20, 1.6], [-0.08, 0.8], [0, 0.4], [0.08, 0.15], [0.16, 0.45], [0.28, 1.3], [0.43, 2.3], [0.68, 3.4], [0.98, 4.4]],
           h: [[-0.30, 0], [0, 0], [0.08, -70], [0.16, -140], [0.28, -150]] },
    face: [[-0.30, 0], [-0.14, 0], [-0.02, -20], [0.04, -50], [0.12, -100], [0.20, -140], [0.30, -150]],
    trunk: [[-0.30, 0], [-0.10, 0], [0, -10], [0.08, -22], [0.18, -10], [0.30, 0]],
    lean: [[-0.30, 7], [-0.20, 6], [-0.06, 16], [0.04, 14], [0.16, 8], [0.33, 15], [0.58, 13]],
    side: [[-0.30, 0], [-0.02, 0], [0.06, -12], [0.18, -8], [0.36, 0]],
    crouch: [[-0.30, 0.04], [-0.08, 0.08], [0.04, 0.11], [0.18, 0.07], [0.43, 0.03]],
    arms: [[-0.30, 0.25], [-0.04, 0.65], [0.10, 0.75], [0.33, 0.3]],
    gait: [[-0.30, 0.5], [-0.17, 0.4], [0.20, 0.2], [0.38, 0.8], [0.58, 1]],
    look: [[-0.30, 1], [0.28, 1], [0.53, 0.7]],
    stances: [
      { F: "F", t0: -0.30, t1: -0.18, at: { rel: "travel", t: -0.30, p: [0.16, -0.04] }, yaw: "travel", kind: "braking, short" },
      { F: "S", t0: -0.12, t1: 0.28, at: { rel: "O", p: [0.04, -0.18] }, yaw: -20, pivot: [[0.14, 0], [0.28, -110]], heel: [0.12, 16], kind: "STANDING FOOT beside the ball; pivots with the body" },
      { F: "F", t0: 0.15, t1: 0.32, at: { rel: "O", p: [0.28, -0.46] }, yaw: -140, w: 1, kind: "the hooking foot down beside the standing foot" },
    ],
    contacts: [
      { F: "F", tau: 0, surface: "INSIDE", role: "INSIDE HOOK", decisive: true, aim: { v: 3.0, launch: -150 },
        swing: { contact: { pitch: 2 }, footSpeed: 2.0, via: [{ dt: -0.15, rel: "ballNow", at: [-0.40, 0.08, 0.24], yaw: 25, pitch: 4 }, { dt: -0.10, rel: "ballNow", at: [-0.16, 0.26, 0.22], yaw: 25, pitch: 4 }, { dt: -0.05, rel: "ballNow", at: [0.18, 0.20, 0.22], yaw: -30, pitch: 4 },
          { dt: 0.04, rel: "O", at: [0.46, 0.06, 0.16], yaw: -85, pitch: 2, w: 0.5 }, { dt: 0.09, rel: "O", at: [0.46, -0.22, 0.16], yaw: -120, pitch: 2, w: 1 }] } },
      { F: "S", tau: 0.38, surface: "LACES", role: "exit touch", aim: { v: 4.8, launch: "exit" }, swing: { via: [{ dt: 0.03, rel: "ballNow", exitAt: [-0.20, 0.17], h: 0.13, yaw: 10, wYawExit: true }] } },
    ] },
  // ── DRAG-BACK — the right sole pulls the ball straight back under the body; turning right; the left foot takes it away (reference 180°) ───────
  DRAGBACK: { id: "DRAGBACK", label: "DRAG-BACK", turn: 1, ref: 180, comfort: [158, 200], hard: [138, 212], vRange: [0, 5.0], vFloor: 0,
    start: -0.30, end: 0.90, firstFoot: "F", B: [0.20, 0.18], tLine: 0.36, protect: 0.80,
    com: { v: [[-0.30, 2.25], [-0.18, 1.3], [-0.06, 0.6], [0, 0.35], [0.08, 0.15], [0.16, 0.4], [0.26, 1.1], [0.40, 2.1], [0.60, 3.2], [0.90, 4.3]],
           h: [[-0.30, 0], [0, 0], [0.08, 90], [0.16, 170], [0.26, 180]] },
    face: [[-0.30, 0], [-0.10, 0], [0, 4], [0.07, 50], [0.15, 120], [0.23, 165], [0.32, 180]],
    trunk: [[-0.30, 0], [-0.04, 0], [0.02, 10], [0.10, 18], [0.20, 8], [0.32, 0]],
    lean: [[-0.30, 6], [-0.20, 2], [-0.04, -2], [0.06, 0], [0.18, 6], [0.32, 15], [0.60, 13]],
    side: [[-0.30, 0], [0, 0], [0.08, 8], [0.20, 4], [0.35, 0]],
    crouch: [[-0.30, 0.03], [-0.04, 0.05], [0.08, 0.07], [0.22, 0.06], [0.45, 0.03]],
    arms: [[-0.30, 0.2], [-0.02, 0.5], [0.12, 0.7], [0.35, 0.3]],
    gait: [[-0.30, 0.5], [-0.15, 0.4], [0.22, 0.2], [0.40, 0.8], [0.60, 1]],
    look: [[-0.30, 1], [0.30, 1], [0.60, 0.7]],
    stances: [
      { F: "F", t0: -0.30, t1: -0.18, at: { rel: "travel", t: -0.30, p: [0.16, -0.01] }, yaw: "travel", kind: "braking" },
      { F: "S", t0: -0.14, t1: 0.10, at: { rel: "O", p: [0.12, -0.12] }, yaw: 0, kind: "STANDING FOOT beside the ball (heel-to-toe)" },
      { F: "F", t0: 0.10, t1: 0.32, at: { rel: "O", p: [-0.12, -0.10] }, yaw: 70, pivot: [[0.12, 0], [0.30, 90]], heel: [0.12, 12], w: 0.3, kind: "the pulling foot down behind (the turning support)" },
      { F: "S", t0: 0.31, t1: 0.44, at: { rel: "ballAt", t: 0.31, exitAt: [-0.22, -0.18] }, yaw: 175, w: 1, kind: "the pushing foot down beside the ball's path" },
    ],
    contacts: [
      { F: "F", tau: 0, surface: "SOLE", role: "DRAG-BACK", decisive: true, aim: { v: 1.7, launch: 180 },
        swing: { contact: { pitch: 18 }, footSpeed: 1.4, via: [{ dt: -0.14, rel: "ballNow", at: [-0.34, -0.02, 0.30], yaw: 20, pitch: -25 }, { dt: -0.08, rel: "ballNow", at: [-0.24, 0.05, 0.34], yaw: 0, pitch: 0 },
          { dt: 0.04, rel: "O", at: [0.20, 0.0, 0.25], yaw: 10, pitch: 6 }, { dt: 0.08, rel: "O", at: [0.02, -0.08, 0.17], yaw: 45, pitch: 4, w: 0.3 }] } },
      { F: "S", tau: 0.24, surface: "LACES", role: "push (2nd contact)", aim: { v: 4.6, launch: "exit" },
        swing: { via: [{ dt: -0.08, rel: "ballNow", at: [0.30, 0.16, 0.18], yaw: 150, pitch: -10, w: 1 }, { dt: 0.03, rel: "ballNow", at: [0.20, 0.19, 0.13], yaw: 175, pitch: -10, w: 1 }] } },
    ] },
};
export const TECH_IDS = Object.keys(TEMPLATES);
// the technique families' HUD names (the carry's own touches are labelled by what they do)
export const LABEL = { CARRY: "CARRY", CHOP: "RONALDO CHOP", OUTCUT: "OUTSIDE CUT", CRUYFF: "CRUYFF", HOOK: "INSIDE HOOK", DRAGBACK: "DRAG-BACK", STOP: "STOP", START: "START" };
