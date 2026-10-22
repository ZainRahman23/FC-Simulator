// ═══ vocab1/v_tech.js — DRIBBLING VOCAB-1 (owner's overnight mission, 22 Oct): THE TECHNICAL LIBRARY ══════════════════════════════════════════════
// The research (review_artifacts/dribbling_vocab1/RESEARCH_TAXONOMY.md) finds that nearly every named move is a SEQUENCE OF ≈ 10 CONTACT
// PRIMITIVES plus a body fake and a timing pattern:
//   P1 carry push · P2 cut in front of the standing foot · P3 cut behind the standing leg · P4 hook (wrap past, pull back) · P5 sole pull / roll
//   · P6 transfer to the other foot · P7 no-contact fake (leg around / over the ball, body / shoulder) · P8 same-foot double contact
//   · P9 heel · P10 stop / deaden
// so the library is built that way: the locked baseline's five references (pt_tech.js: RONALDO CHOP, OUTSIDE CUT, CRUYFF, INSIDE HOOK,
// DRAG-BACK — untouched), B4's one-contact generic families (u_tc.js GENERIC), and the NEW parametric techniques below — each one authored ONCE
// in the same reference format the baseline uses (the right foot strikes; [ahead, + right] from the entry heading; mirrored by the resolver
// for the left foot; the turn angle the request's), so a named move is a combination of primitives with parameters, never a canned clip:
// the resolver instantiates it from the live state (the foot on the stride, the ball where it is, the entry speed, the requested exit),
// CONTROLLED_BALL owns the ball, the kernel launches every contact from where the ball really is, the body is drawn from the plan.
// `free: true` — a technique whose exit is the request itself (0° included: stop-and-go, pull-push): its heading keys are deviations plus a
// share of the requested turn (com.hFrac), its exit launches "exit" = the request.
// Every technique (old and new) carries META: family, status (INTEGRATED / REVIEW / EXPERIMENTAL), mode (AUTO / AUTO+MANUAL / MANUAL), the
// football purpose, the preferred entry, the primitives, and DIFFICULTY dimensions for the future Dribbling rating (not calibrated: 0–1 each).
import { TEMPLATES as BASE } from "../tc_baseline_88573ef0/pt_tech.js";
const c = (arr) => arr;   // (readability)
// ── P8 · SAME-FOOT DOUBLE CONTACT: the ELASTICO (outside cue → the same foot's inside snaps it back) and its reverse ──────────────────────────
// (ref 50: the snap's exit; the cue a short guided push the other way — the touches "fuse into one", the first never pushed far)
function elastico(rev) { const s = rev ? 1 : -1;   // s: the exit side (− left for the elastico, + right for the reverse)
  return { id: rev ? "RELASTICO" : "ELASTICO", label: rev ? "REVERSE ELASTICO" : "ELASTICO", turn: s, ref: 50, comfort: [30, 72], hard: [14, 96], vRange: [0.6, 7.2], vFloor: 0.6,
    start: -0.30, end: 0.75, firstFoot: "S", B: [0.32, 0.10], tLine: 0.20, protect: 0.40,
    com: { v: [[-0.30, 3.8], [-0.14, 3.3], [-0.04, 3.1], [0, 3.1], [0.08, 3.4], [0.22, 4.3], [0.45, 5.1], [0.75, 5.8]], h: [[-0.30, 0], [-0.12, -s * 4], [0, -s * 2], [0.06, s * 12], [0.14, s * 32], [0.26, s * 47], [0.40, s * 50]] },
    face: [[-0.30, 0], [-0.14, -s * 10], [-0.03, -s * 8], [0.04, s * 12], [0.14, s * 36], [0.28, s * 50]],
    trunk: [[-0.30, 0], [-0.16, -s * 12], [-0.05, -s * 14], [0.03, s * 8], [0.18, s * 6], [0.35, 0]],
    side: [[-0.30, 0], [-0.15, -s * 9], [-0.04, -s * 11], [0.05, s * 10], [0.22, s * 7], [0.45, 0]],
    lean: [[-0.30, 7], [-0.12, 5], [0.02, 6], [0.18, 12], [0.45, 12]], crouch: [[-0.30, 0.03], [-0.12, 0.06], [0.02, 0.06], [0.20, 0.035], [0.45, 0.025]],
    arms: [[-0.30, 0.2], [-0.12, 0.55], [0.06, 0.5], [0.30, 0.2]], gait: [[-0.30, 0.8], [-0.16, 0.4], [0.12, 0.5], [0.30, 1]], look: [[-0.30, 1], [0.30, 1]],
    stances: [
      { F: "S", t0: -0.30, t1: 0.04, at: null, yaw: -4, kind: "PLANT · the standing foot beside the ball" },
      { F: "F", t0: 0.08, t1: 0.22, at: { rel: "travel", t: 0.08, p: [0.22, 0.09] }, yaw: "travel", kind: `the ${rev ? "reverse elastico" : "elastico"} foot down on the new line` },
      { F: "S", t0: 0.26, t1: 0.38, at: null, yaw: null, kind: s > 0 ? "exit stride (crossover)" : "exit stride" },
    ],
    // (the decisive snap first: the body draws ONE swing with both touches — the cue is its waypoint at τ −0.09, the snap its contact pose)
    contacts: [
      { F: "F", tau: 0, surface: rev ? "OUTSIDE" : "INSIDE", role: rev ? "REVERSE ELASTICO · the outside snaps it back" : "ELASTICO · the inside snaps it back", decisive: true, aim: { v: 4.8, launch: s * 50 },
        swing: { contact: rev ? { pitch: -10, roll: 8 } : { pitch: 0 }, footSpeed: 2.6, via: rev
          ? [{ dt: -0.20, rel: "ballNow", at: [-0.30, 0.10, 0.15], yaw: -4 }, { dt: -0.12, rel: "ballNow", at: [-0.07, 0.12, 0.11], yaw: -12 }, { dt: -0.09, rel: "ballNow", at: [-0.02, 0.12, 0.10], yaw: -18 },
             { dt: -0.045, rel: "ballNow", at: [0.05, -0.05, 0.12], yaw: -6 }, { dt: 0.035, rel: "ballNow", at: [0.09, 0.07, 0.11], yaw: 30, w: 0.6 }, { dt: 0.08, rel: "O", at: [0.34, 0.20, 0.16], yaw: 32, w: 1 }]
          : [{ dt: -0.20, rel: "ballNow", at: [-0.30, -0.06, 0.15], yaw: 6 }, { dt: -0.12, rel: "ballNow", at: [-0.08, -0.11, 0.11], yaw: 16 }, { dt: -0.09, rel: "ballNow", at: [-0.02, -0.11, 0.10], yaw: 20, roll: 8 },
             { dt: -0.045, rel: "ballNow", at: [0.05, 0.06, 0.12], yaw: 10 }, { dt: 0.035, rel: "ballNow", at: [0.10, -0.06, 0.11], yaw: -30, w: 0.6 }, { dt: 0.08, rel: "O", at: [0.34, -0.18, 0.16], yaw: -32, w: 1 }] } },
      { F: "F", tau: -0.09, surface: rev ? "INSIDE" : "OUTSIDE", role: rev ? "reverse elastico · inside cue" : "elastico · outside cue", aim: { v: 1.0, launch: -s * 55 } },
    ] }; }
// ── P7 · THE LEG AROUND THE BALL: SCISSORS (the leg loops round the FRONT of the ball, inside → outside, down at ≈ 2 o'clock; the OTHER foot's
// outside takes it away the other way) · STEPOVER (the foot over the front of the ball toward the midline, outside → inside; the SAME foot's
// outside takes it back the way it came) · DOUBLE SCISSORS (both legs loop; the first foot's outside takes it) ───────────────────────────────
const SCISSORS = { id: "SCISSORS", label: "SCISSORS", turn: -1, ref: 45, comfort: [24, 70], hard: [10, 92], vRange: [1.4, 8.0], vFloor: 1.2,
  start: -0.38, end: 0.70, firstFoot: "S", B: [0.30, -0.04], tLine: 0.16, protect: 0.35,
  com: { v: [[-0.38, 4.6], [-0.20, 4.0], [-0.06, 3.8], [0, 3.8], [0.10, 4.3], [0.30, 5.3], [0.70, 6.2]], h: [[-0.38, 0], [-0.20, 6], [-0.08, 7], [0.02, -6], [0.12, -26], [0.24, -40], [0.36, -45]] },
  face: [[-0.38, 0], [-0.24, 14], [-0.10, 16], [0.0, -4], [0.12, -30], [0.26, -45]], trunk: [[-0.38, 0], [-0.26, 12], [-0.12, 16], [-0.02, 4], [0.10, -10], [0.30, 0]],
  side: [[-0.38, 0], [-0.24, 10], [-0.10, 12], [0.02, -8], [0.20, -8], [0.45, 0]], lean: [[-0.38, 8], [-0.20, 7], [0, 9], [0.25, 13], [0.60, 12]],
  crouch: [[-0.38, 0.03], [-0.20, 0.06], [0, 0.055], [0.25, 0.03]], arms: [[-0.38, 0.2], [-0.22, 0.65], [0.02, 0.5], [0.30, 0.25]], gait: [[-0.38, 0.9], [-0.26, 0.45], [0.10, 0.55], [0.30, 1]], look: [[-0.38, 1], [0.30, 1]],
  stances: [
    { F: "S", t0: -0.38, t1: -0.15, at: null, yaw: 0, kind: "support · the ball ahead between the feet" },
    { F: "F", t0: -0.12, t1: 0.05, at: { rel: "B", p: [0.04, 0.30] }, yaw: 18, kind: "SCISSORS · the right leg loops round the front of the ball, down outside it (≈ 2 o'clock)",
      swingIn: { via: [{ tau: -0.30, rel: "ballNow", at: [-0.22, -0.10, 0.12], yaw: -10 }, { tau: -0.24, rel: "ballNow", at: [0.10, -0.12, 0.20], yaw: 20 }, { tau: -0.19, rel: "ballNow", at: [0.22, 0.06, 0.24], yaw: 45 }, { tau: -0.15, rel: "ballNow", at: [0.12, 0.24, 0.13], yaw: 30 }] } },
    { F: "S", t0: 0.08, t1: 0.22, at: { rel: "travel", t: 0.08, p: [0.22, -0.09] }, yaw: "travel", kind: "the exit foot down on the new line" },
    { F: "F", t0: 0.26, t1: 0.38, at: null, yaw: null, kind: "exit stride (accelerating)" },
  ],
  contacts: [{ F: "S", tau: 0, surface: "OUTSIDE", role: "SCISSORS · the outside of the other foot takes it away", decisive: true, aim: { v: 5.4, launch: -45 },
    swing: { contact: { pitch: -14, roll: -6 }, footSpeed: 2.6, via: [{ dt: -0.10, rel: "ballNow", at: [-0.24, 0.02, 0.14], yaw: -6 }, { dt: -0.035, rel: "ballNow", at: [-0.07, 0.11, 0.11], yaw: -20 }, { dt: 0.04, rel: "ballNow", exitAt: [-0.12, 0.16], h: 0.12, yaw: -38, w: 1 }] } }] };
const STEPOVER = { id: "STEPOVER", label: "STEPOVER", turn: 1, ref: 45, comfort: [24, 70], hard: [10, 92], vRange: [1.4, 7.6], vFloor: 1.2,
  start: -0.36, end: 0.70, firstFoot: "S", B: [0.30, 0.08], tLine: 0.16, protect: 0.35,
  com: { v: [[-0.36, 4.4], [-0.20, 3.9], [-0.06, 3.7], [0, 3.7], [0.10, 4.2], [0.30, 5.2], [0.70, 6.1]], h: [[-0.36, 0], [-0.18, -6], [-0.06, -6], [0.02, 8], [0.12, 28], [0.24, 42], [0.36, 45]] },
  face: [[-0.36, 0], [-0.20, -14], [-0.08, -12], [0.02, 6], [0.14, 32], [0.28, 45]], trunk: [[-0.36, 0], [-0.20, -14], [-0.08, -14], [0.02, 6], [0.18, 8], [0.35, 0]],
  side: [[-0.36, 0], [-0.20, -10], [-0.06, -10], [0.04, 8], [0.22, 8], [0.45, 0]], lean: [[-0.36, 8], [-0.18, 7], [0, 9], [0.25, 13], [0.60, 12]],
  crouch: [[-0.36, 0.03], [-0.18, 0.06], [0, 0.055], [0.25, 0.03]], arms: [[-0.36, 0.2], [-0.20, 0.6], [0.02, 0.5], [0.30, 0.25]], gait: [[-0.36, 0.9], [-0.24, 0.45], [0.10, 0.55], [0.30, 1]], look: [[-0.36, 1], [0.30, 1]],
  stances: [
    { F: "S", t0: -0.36, t1: 0.02, at: null, yaw: 0, kind: "support · the standing foot" },
    { F: "F", t0: -0.22, t1: -0.11, at: { rel: "B", p: [0.04, -0.13] }, yaw: -15, kind: "STEPOVER · the right foot over the front of the ball toward the midline, down inside it",
      swingIn: { via: [{ tau: -0.34, rel: "ballNow", at: [-0.10, 0.15, 0.12], yaw: 5 }, { tau: -0.29, rel: "ballNow", at: [0.10, 0.10, 0.23], yaw: -10 }, { tau: -0.25, rel: "ballNow", at: [0.13, -0.06, 0.18], yaw: -20 }] } },
    { F: "F", t0: 0.08, t1: 0.22, at: { rel: "travel", t: 0.08, p: [0.22, 0.09] }, yaw: "travel", kind: "the stepover foot down on the new line" },
    { F: "S", t0: 0.26, t1: 0.38, at: null, yaw: null, kind: "exit stride" },
  ],
  contacts: [{ F: "F", tau: 0, surface: "OUTSIDE", role: "STEPOVER · the same foot's outside takes it back the other way", decisive: true, aim: { v: 5.2, launch: 45 },
    swing: { contact: { pitch: -14, roll: 6 }, footSpeed: 2.4, via: [{ dt: -0.07, rel: "ballNow", at: [-0.06, -0.13, 0.10], yaw: 8 }, { dt: 0.04, rel: "ballNow", exitAt: [-0.14, -0.16], h: 0.12, yaw: 35, w: 1 }] } }] };
const DSCISSORS = { id: "DSCISSORS", label: "DOUBLE SCISSORS", turn: 1, ref: 45, comfort: [24, 70], hard: [10, 92], vRange: [1.4, 7.0], vFloor: 1.2,
  start: -0.64, end: 0.70, firstFoot: "S", B: [0.30, 0.04], tLine: 0.16, protect: 0.40,
  com: { v: [[-0.64, 4.2], [-0.44, 3.7], [-0.22, 3.5], [-0.06, 3.5], [0, 3.6], [0.10, 4.2], [0.30, 5.2], [0.70, 6.1]], h: [[-0.64, 0], [-0.44, 6], [-0.30, 4], [-0.16, -6], [-0.04, -4], [0.06, 10], [0.16, 30], [0.28, 42], [0.40, 45]] },
  face: [[-0.64, 0], [-0.48, 14], [-0.34, 10], [-0.20, -14], [-0.06, -10], [0.04, 10], [0.16, 34], [0.30, 45]],
  trunk: [[-0.64, 0], [-0.50, 12], [-0.38, 14], [-0.24, -12], [-0.10, -14], [0.02, 6], [0.20, 6], [0.38, 0]],
  side: [[-0.64, 0], [-0.48, 10], [-0.36, 10], [-0.22, -10], [-0.08, -10], [0.04, 8], [0.24, 7], [0.48, 0]], lean: [[-0.64, 8], [-0.40, 7], [-0.10, 8], [0.25, 13], [0.60, 12]],
  crouch: [[-0.64, 0.03], [-0.44, 0.06], [-0.10, 0.06], [0.25, 0.03]], arms: [[-0.64, 0.2], [-0.46, 0.65], [-0.20, 0.65], [0.04, 0.5], [0.32, 0.25]],
  gait: [[-0.64, 0.9], [-0.50, 0.45], [0.10, 0.55], [0.30, 1]], look: [[-0.64, 1], [0.30, 1]],
  stances: [
    { F: "S", t0: -0.64, t1: -0.40, at: null, yaw: 0, kind: "support · the ball ahead between the feet" },
    { F: "F", t0: -0.42, t1: -0.22, at: { rel: "B", p: [0.02, 0.30] }, yaw: 18, kind: "1st loop · the right leg round the front of the ball, down outside it",
      swingIn: { via: [{ tau: -0.58, rel: "ballNow", at: [-0.22, -0.10, 0.12], yaw: -10 }, { tau: -0.53, rel: "ballNow", at: [0.10, -0.12, 0.20], yaw: 20 }, { tau: -0.48, rel: "ballNow", at: [0.22, 0.06, 0.24], yaw: 45 }, { tau: -0.44, rel: "ballNow", at: [0.12, 0.24, 0.13], yaw: 30 }] } },
    { F: "S", t0: -0.17, t1: 0.04, at: { rel: "B", p: [0.02, -0.30] }, yaw: -18, kind: "2nd loop · the left leg round the front of the ball, down outside it",
      swingIn: { via: [{ tau: -0.36, rel: "ballNow", at: [-0.22, 0.10, 0.12], yaw: 10 }, { tau: -0.30, rel: "ballNow", at: [0.10, 0.12, 0.20], yaw: -20 }, { tau: -0.25, rel: "ballNow", at: [0.22, -0.06, 0.24], yaw: -45 }, { tau: -0.20, rel: "ballNow", at: [0.12, -0.24, 0.13], yaw: -30 }] } },
    { F: "F", t0: 0.08, t1: 0.22, at: { rel: "travel", t: 0.08, p: [0.22, 0.09] }, yaw: "travel", kind: "the exit foot down on the new line" },
    { F: "S", t0: 0.26, t1: 0.38, at: null, yaw: null, kind: "exit stride (crossover, accelerating)" },
  ],
  contacts: [{ F: "F", tau: 0, surface: "OUTSIDE", role: "DOUBLE SCISSORS · the first foot's outside takes it away", decisive: true, aim: { v: 5.3, launch: 45 },
    swing: { contact: { pitch: -14, roll: 6 }, footSpeed: 2.6, via: [{ dt: -0.10, rel: "ballNow", at: [-0.24, -0.02, 0.14], yaw: 6 }, { dt: -0.035, rel: "ballNow", at: [-0.07, -0.11, 0.11], yaw: 20 }, { dt: 0.04, rel: "ballNow", exitAt: [-0.12, -0.16], h: 0.12, yaw: 38, w: 1 }] } }] };
// ── P8 + P7 · THE MATTHEWS FEINT (Coerver's DRAG-PUSH): lean and drop the shoulder left, nudge the ball left with the inside of the right foot,
// hop left, take it right with the outside of the SAME right foot — "push, hop, take" ────────────────────────────────────────────────────────
const MATTHEWS = { id: "MATTHEWS", label: "MATTHEWS FEINT (drag-push)", turn: 1, ref: 50, comfort: [30, 75], hard: [14, 95], vRange: [0.8, 6.4], vFloor: 0.6,
  start: -0.42, end: 0.75, firstFoot: "S", B: [0.26, 0.02], tLine: 0.20, protect: 0.40,
  com: { v: [[-0.42, 3.6], [-0.26, 3.0], [-0.12, 2.6], [0, 2.6], [0.10, 3.3], [0.28, 4.5], [0.50, 5.4], [0.75, 6.0]], h: [[-0.42, 0], [-0.26, -10], [-0.12, -14], [-0.02, -8], [0.08, 14], [0.18, 36], [0.30, 48], [0.42, 50]] },
  face: [[-0.42, 0], [-0.28, -14], [-0.14, -18], [-0.02, -8], [0.10, 22], [0.24, 46], [0.36, 50]], trunk: [[-0.42, 0], [-0.30, -14], [-0.16, -18], [-0.04, -6], [0.10, 10], [0.30, 0]],
  side: [[-0.42, 0], [-0.30, -12], [-0.16, -14], [-0.02, -4], [0.10, 10], [0.30, 6], [0.50, 0]], lean: [[-0.42, 7], [-0.20, 5], [0, 7], [0.25, 13], [0.6, 12]],
  crouch: [[-0.42, 0.03], [-0.24, 0.07], [-0.08, 0.06], [0.20, 0.035]], arms: [[-0.42, 0.2], [-0.26, 0.7], [0, 0.55], [0.30, 0.25]], gait: [[-0.42, 0.8], [-0.28, 0.4], [0.12, 0.5], [0.32, 1]], look: [[-0.42, 1], [0.30, 1]],
  stances: [
    { F: "S", t0: -0.42, t1: -0.20, at: null, yaw: 0, kind: "support · the shoulder drops left" },
    { F: "S", t0: -0.12, t1: 0.06, at: { rel: "B", p: [-0.10, -0.32] }, yaw: -10, kind: "the HOP left (the weight sold left)" },
    { F: "F", t0: 0.08, t1: 0.22, at: { rel: "travel", t: 0.08, p: [0.22, 0.09] }, yaw: "travel", kind: "the pushing foot down on the new line" },
    { F: "S", t0: 0.26, t1: 0.38, at: null, yaw: null, kind: "exit stride (crossover)" },
  ],
  contacts: [
    { F: "F", tau: 0, surface: "OUTSIDE", role: "MATTHEWS · the outside of the same foot takes it away", decisive: true, aim: { v: 5.0, launch: 50 },
      swing: { contact: { pitch: -12, roll: 6 }, footSpeed: 2.4, via: [{ dt: -0.34, rel: "ballNow", at: [-0.26, 0.10, 0.14], yaw: -4 }, { dt: -0.24, rel: "ballNow", at: [-0.04, 0.12, 0.10], yaw: -14 }, { dt: -0.12, rel: "ballNow", at: [0.04, 0.00, 0.12], yaw: -10 },
        { dt: -0.04, rel: "ballNow", at: [-0.03, -0.12, 0.10], yaw: 10 }, { dt: 0.04, rel: "ballNow", exitAt: [-0.13, -0.16], h: 0.12, yaw: 38, w: 1 }] } },
    { F: "F", tau: -0.24, surface: "INSIDE", role: "matthews · the inside nudge left", aim: { v: 0.9, launch: -70 } },
  ] };
// ── P5 · THE SOLE PULL, one primitive with its follow-ups (the research: drag-back, V-pull, L-turn, pull-push are the same pull with a different
// second contact): the standing foot beside the ball, the sole on top pulls it back, then — V-PULL: the inside of the same foot out across
// (≈ 60° the other way) · L-DRAG: the inside of the same foot behind the standing leg (≈ 90° across, behind the body) · PULL-PUSH: the same
// foot pushes it forward again (a reset — stop and relaunch; free: the exit is the request) ──────────────────────────────────────────────────
function solePull(kind) {
  const V = kind === "VPULL", Ld = kind === "LDRAG", PP = kind === "PULLPUSH", ex = V ? -60 : Ld ? -90 : 0;   // (the exit, reference degrees: − = left for the right sole)
  const T = { id: kind, label: V ? "V-PULL" : Ld ? "L-DRAG" : "PULL-PUSH", turn: PP ? 0 : -1, ref: PP ? 0 : -ex, comfort: V ? [40, 85] : Ld ? [70, 115] : [0, 30], hard: V ? [24, 108] : Ld ? [55, 138] : [0, 60],
    vRange: [0, 4.6], vFloor: 0, free: PP, start: -0.30, end: 0.85, firstFoot: "F", B: [0.22, 0.14], tLine: PP ? 0.30 : 0.30, protect: V ? 0.55 : Ld ? 0.75 : 0.60,
    com: { v: [[-0.30, 2.4], [-0.18, 1.5], [-0.06, 0.7], [0, 0.45], [0.10, 0.30], [0.20, 0.6], [0.30, 1.4], [0.45, 2.5], [0.65, 3.6], [0.85, 4.6]],
      h: PP ? [[-0.30, 0], [0.20, 0]] : [[-0.30, 0], [0.10, 0], [0.22, ex * 0.6], [0.32, ex * 0.95], [0.42, ex]], hFrac: PP ? [[-0.30, 0], [0.18, 0], [0.30, 0.8], [0.40, 1]] : undefined },
    face: PP ? [[-0.30, 0], [0.30, 0]] : [[-0.30, 0], [0.04, 4], [0.16, ex * 0.4], [0.26, ex * 0.85], [0.36, ex]],
    trunk: [[-0.30, 0], [-0.04, 0], [0.04, 6], [0.16, -6], [0.32, 0]], side: [[-0.30, 0], [0, 0], [0.10, 4], [0.24, ex ? -6 : 0], [0.40, 0]],
    lean: [[-0.30, 6], [-0.16, 2], [-0.02, -2], [0.10, 0], [0.28, 10], [0.55, 13]], crouch: [[-0.30, 0.03], [-0.04, 0.05], [0.10, 0.07], [0.26, 0.05], [0.50, 0.03]],
    arms: [[-0.30, 0.2], [0, 0.5], [0.14, 0.6], [0.40, 0.3]], gait: [[-0.30, 0.5], [-0.15, 0.4], [0.24, 0.3], [0.42, 0.8], [0.60, 1]], look: [[-0.30, 1], [0.40, 1]],
    stances: [
      { F: "F", t0: -0.30, t1: -0.18, at: { rel: "travel", t: -0.30, p: [0.16, 0.0] }, yaw: "travel", kind: "braking (penultimate)" },
      { F: "S", t0: -0.15, t1: 0.20, at: { rel: "O", p: [0.10, -0.14] }, yaw: ex * 0.3, kind: "STANDING FOOT beside the ball", pivot: ex ? [[0.10, 0], [0.24, ex * 0.6]] : undefined },
      { F: "F", t0: 0.26, t1: 0.42, at: { rel: "travel", t: 0.26, p: [0.16, 0.09] }, yaw: "travel", kind: "the pulling foot down on the new line" },
      { F: "S", t0: 0.44, t1: 0.58, at: null, yaw: null, kind: "exit stride" },
    ],
    contacts: [
      { F: "F", tau: 0, surface: "SOLE", role: `${V ? "V-PULL" : Ld ? "L-DRAG" : "PULL-PUSH"} · the sole pulls it back`, decisive: true, aim: { v: PP ? 1.2 : 1.4, launch: Ld ? 180 : V ? 165 : 180 },
        swing: { contact: { pitch: 18 }, footSpeed: 1.3, via: [{ dt: -0.14, rel: "ballNow", at: [-0.34, 0.0, 0.30], yaw: 10, pitch: -25 }, { dt: -0.07, rel: "ballNow", at: [-0.20, 0.03, 0.32], yaw: 0, pitch: 0 },
          { dt: 0.05, rel: "ballNow", at: [0.06, 0.10, 0.12], yaw: Ld ? -40 : V ? -20 : 0 }, { dt: 0.14, rel: "ballNow", at: [-0.04, 0.12, 0.10], yaw: Ld ? -70 : V ? -40 : 0, w: 0.5 }] } },
      { F: "F", tau: 0.20, surface: PP ? "LACES" : "INSIDE", role: V ? "V-pull · the inside out across" : Ld ? "L-drag · the inside behind the standing leg" : "pull-push · the push forward again", aim: { v: PP ? 4.2 : 3.8, launch: "exit" } },
    ] };
  return T; }
// ── P4 · THE OUTSIDE HOOK — the right foot's outside goes over and beyond the ball and pulls it back to the right, the standing knee bent; the
// spin-off away from a defender pressing on the left (reference 150°) ────────────────────────────────────────────────────────────────────────
const OUTHOOK = { id: "OUTHOOK", label: "OUTSIDE HOOK", turn: 1, ref: 150, comfort: [122, 172], hard: [104, 186], vRange: [0.6, 6.2], vFloor: 0.6,
  start: -0.30, end: 0.98, firstFoot: "F", B: [0.30, 0.10], tLine: 0.42, protect: 0.60,
  com: { v: [[-0.30, 2.6], [-0.20, 1.6], [-0.08, 0.8], [0, 0.4], [0.08, 0.15], [0.16, 0.45], [0.28, 1.3], [0.43, 2.3], [0.68, 3.4], [0.98, 4.4]], h: [[-0.30, 0], [0, 0], [0.08, 70], [0.16, 140], [0.28, 150]] },
  face: [[-0.30, 0], [-0.14, 0], [-0.02, 20], [0.04, 50], [0.12, 100], [0.20, 140], [0.30, 150]], trunk: [[-0.30, 0], [-0.10, 0], [0, 10], [0.08, 22], [0.18, 10], [0.30, 0]],
  lean: [[-0.30, 7], [-0.20, 6], [-0.06, 16], [0.04, 14], [0.16, 8], [0.33, 15], [0.58, 13]], side: [[-0.30, 0], [-0.02, 0], [0.06, 12], [0.18, 8], [0.36, 0]],
  crouch: [[-0.30, 0.04], [-0.08, 0.09], [0.04, 0.12], [0.18, 0.07], [0.43, 0.03]], arms: [[-0.30, 0.25], [-0.04, 0.65], [0.10, 0.75], [0.33, 0.3]], gait: [[-0.30, 0.5], [-0.17, 0.4], [0.20, 0.2], [0.38, 0.8], [0.58, 1]], look: [[-0.30, 1], [0.28, 1], [0.53, 0.7]],
  stances: [
    { F: "F", t0: -0.30, t1: -0.18, at: { rel: "travel", t: -0.30, p: [0.16, 0.06] }, yaw: "travel", kind: "braking, short" },
    { F: "S", t0: -0.12, t1: 0.28, at: { rel: "O", p: [0.02, -0.20] }, yaw: 15, pivot: [[0.14, 0], [0.28, 110]], heel: [0.12, 16], kind: "STANDING FOOT beside the ball (knee bent); pivots with the body" },
    { F: "F", t0: 0.15, t1: 0.32, at: { rel: "travel", t: 0.15, p: [0.10, 0.14] }, yaw: "travel", kind: "the hooking foot down on its own side of the standing foot" },
  ],
  // (the hooking foot stays on its OWN side: up beside the ball, OVER it to the front, the toes turned in so the outside faces back, then it pulls
  // the ball back to its side — it never wraps round past the standing foot)
  contacts: [
    { F: "F", tau: 0, surface: "OUTSIDE", role: "OUTSIDE HOOK", decisive: true, aim: { v: 3.0, launch: 150 },
      swing: { contact: { pitch: 2, roll: 8 }, footSpeed: 2.0, via: [{ dt: -0.16, rel: "ballNow", at: [-0.32, 0.12, 0.20], yaw: 5 }, { dt: -0.11, rel: "ballNow", at: [-0.04, 0.16, 0.26], yaw: -15 }, { dt: -0.05, rel: "ballNow", at: [0.16, 0.06, 0.22], yaw: -55 },
        { dt: 0.04, rel: "O", at: [0.38, 0.20, 0.16], yaw: 60, w: 0.5 }, { dt: 0.09, rel: "O", at: [0.24, 0.36, 0.16], yaw: 110, w: 1 }] } },
    { F: "S", tau: 0.38, surface: "LACES", role: "exit touch", aim: { v: 4.8, launch: "exit" }, swing: { via: [{ dt: 0.03, rel: "ballNow", exitAt: [-0.20, -0.17], h: 0.13, yaw: -10, wYawExit: true }] } },
  ] };
// ── P10 + P1 · STOP / HESITATION (free: the exit is the request — straight on or turned): DEADEN-AND-EXPLODE (the sole stops the ball dead
// at the feet while the body brakes hard, then the laces push and the body explodes at its Acceleration) · FAKE STOP (the body brakes as if to
// stop — upright, arms out — the ball NOT touched, rolling on slowly; then the laces push and explode: the stop is only sold) · HESITATION (a
// short checked stride and a stall of the body — the ball carried on softly — then the push and the burst) ───────────────────────────────────
function stopGo(kind) { const D = kind === "DEADEN", F = kind === "FAKESTOP";
  return { id: kind, label: D ? "DEADEN-AND-EXPLODE" : F ? "FAKE STOP" : "HESITATION", turn: 0, ref: 0, free: true, comfort: [0, 30], hard: [0, D ? 75 : 50], vRange: [D ? 1.2 : 2.4, 10.8], vFloor: 0,
    start: D ? -0.36 : -0.40, end: 0.90, firstFoot: "F", B: [D ? 0.20 : 0.34, 0.10], tLine: 0.10, protect: D ? 0.35 : 0.20,
    com: { v: D ? [[-0.36, 5.0], [-0.22, 3.0], [-0.10, 1.4], [0, 0.9], [0.08, 1.4], [0.20, 2.8], [0.40, 4.6], [0.65, 6.0], [0.90, 7.0]]
      : F ? [[-0.40, 5.6], [-0.26, 3.6], [-0.14, 2.6], [-0.04, 2.6], [0, 2.8], [0.10, 3.8], [0.28, 5.4], [0.55, 6.8], [0.90, 7.8]]
      : [[-0.40, 5.6], [-0.26, 4.6], [-0.14, 4.2], [-0.04, 4.3], [0, 4.5], [0.12, 5.4], [0.30, 6.6], [0.60, 7.6], [0.90, 8.4]],
      h: [[-0.40, 0], [0.40, 0]], hFrac: [[-0.40, 0], [0, 0.05], [0.14, 0.6], [0.26, 1]] },
    face: [[-0.40, 0], [0.30, 0]], trunk: [[-0.40, 0], [0.30, 0]], side: [[-0.40, 0], [0.30, 0]],
    lean: D ? [[-0.36, 8], [-0.20, -4], [-0.04, -2], [0.08, 14], [0.30, 18], [0.70, 13]] : F ? [[-0.40, 8], [-0.26, -8], [-0.10, -6], [0.02, 10], [0.20, 18], [0.60, 13]] : [[-0.40, 9], [-0.26, 2], [-0.10, 4], [0.04, 14], [0.24, 18], [0.60, 13]],
    crouch: D ? [[-0.36, 0.03], [-0.16, 0.07], [0.02, 0.08], [0.20, 0.05], [0.50, 0.025]] : [[-0.40, 0.025], [-0.20, 0.035], [0, 0.05], [0.20, 0.04], [0.50, 0.025]],
    arms: F ? [[-0.40, 0.2], [-0.24, 0.65], [-0.04, 0.5], [0.30, 0.3]] : [[-0.40, 0.2], [-0.20, 0.45], [0.10, 0.45], [0.40, 0.3]],
    gait: [[-0.40, 1], [-0.26, 0.5], [0.04, 0.6], [0.30, 1]], look: [[-0.40, 1], [0.30, 1]],
    stances: D ? [
      { F: "F", t0: -0.36, t1: -0.22, at: { rel: "travel", t: -0.36, p: [0.20, 0.06] }, yaw: "travel", kind: "HARD BRAKE (penultimate)" },
      { F: "S", t0: -0.20, t1: 0.06, at: { rel: "O", p: [0.10, -0.14] }, yaw: 0, kind: "the braking plant beside the ball" },
      { F: "F", t0: 0.10, t1: 0.22, at: { rel: "O", p: [0.40, 0.10] }, yaw: 0, w: 1, kind: "the push-off (explosive)" },
    ] : [
      { F: "F", t0: -0.40, t1: -0.26, at: { rel: "travel", t: -0.40, p: [0.24, 0.08] }, yaw: "travel", kind: F ? "the SOLD stop · braking stride" : "the checked stride" },
      { F: "S", t0: -0.26, t1: -0.12, at: { rel: "travel", t: -0.26, p: [0.12, -0.10] }, yaw: "travel", kind: F ? "the SOLD stop · the plant" : "the stall" },   // (KNOWN: the fake stop has 0.22 s with no foot down before the push-off at 2.6 m/s; holding this plant longer pinned the foot that makes the τ 0 push, re-timing both delayed the move 0.22 s — kept as authored)
      { F: "F", t0: 0.10, t1: 0.22, at: { rel: "O", p: [0.42, 0.10] }, yaw: 0, w: 1, kind: "the push-off (explosive)" },
    ],
    contacts: D ? [
      { F: "F", tau: -0.04, surface: "SOLE", role: "DEADEN · the sole stops it dead", decisive: true, aim: { v: 0.0, launch: 0 },
        swing: { contact: { pitch: 18 }, footSpeed: 1.0, via: [{ dt: -0.10, rel: "ballNow", at: [-0.24, 0.0, 0.26], pitch: -20 }, { dt: 0.06, rel: "ballNow", at: [-0.10, 0.06, 0.14], w: 0.3 }] } },
      { F: "F", tau: 0.06, surface: "LACES", role: "EXPLODE · the push away", aim: { v: 5.6, launch: "exit" } },
    ] : [
      { F: "S", tau: 0, surface: "LACES", role: F ? "FAKE STOP · the push away (the stop was only sold)" : "HESITATION · the push after the stall", decisive: true, aim: { v: F ? 6.0 : 6.4, launch: "exit" },
        swing: { contact: { pitch: -24 }, footSpeed: 3.4, via: [{ dt: -0.10, rel: "ballNow", at: [-0.30, -0.10, 0.16] }, { dt: 0.04, rel: "ballNow", exitAt: [-0.12, -0.04], h: 0.12, w: 1 }] } },
    ] }; }
// ── P5 + body · SHIELD ROLL-AWAY — the sole of the foot FAR from the threat rolls the ball out to its own side while the body turns side-on, hip
// and back between the threat and the ball (the threat's side is the harness's, o.threat; the resolver prefers the foot away from it) ─────────
const SHIELDROLL = { id: "SHIELDROLL", label: "SHIELD ROLL-AWAY", turn: 1, ref: 75, comfort: [50, 100], hard: [34, 122], vRange: [0, 3.6], vFloor: 0,
  start: -0.26, end: 0.85, firstFoot: "S", B: [0.18, 0.12], tLine: 0.34, protect: 0.85, shield: true,
  com: { v: [[-0.26, 2.0], [-0.12, 1.1], [0, 0.6], [0.12, 0.7], [0.26, 1.4], [0.45, 2.4], [0.85, 3.8]], h: [[-0.26, 0], [0, 6], [0.12, 40], [0.26, 70], [0.40, 75]] },
  face: [[-0.26, 0], [-0.10, -10], [0.04, 20], [0.16, 55], [0.30, 75]], trunk: [[-0.26, 0], [-0.10, -12], [0.06, -16], [0.22, -8], [0.40, 0]],
  side: [[-0.26, 0], [-0.10, -8], [0.10, -10], [0.30, -4], [0.50, 0]], lean: [[-0.26, 6], [-0.08, 10], [0.10, 12], [0.40, 12]],
  crouch: [[-0.26, 0.04], [-0.06, 0.08], [0.16, 0.08], [0.45, 0.035]], arms: [[-0.26, 0.3], [-0.08, 0.75], [0.20, 0.7], [0.50, 0.3]], gait: [[-0.26, 0.5], [0, 0.35], [0.30, 0.6], [0.50, 1]], look: [[-0.26, 1], [0.30, 1]],
  stances: [
    { F: "S", t0: -0.26, t1: 0.18, at: { rel: "B", p: [-0.10, -0.32] }, yaw: -10, pivot: [[0.0, 0], [0.18, 50]], kind: "STANDING FOOT · the near foot, the hip toward the threat" },
    { F: "F", t0: 0.16, t1: 0.36, at: { rel: "travel", t: 0.16, p: [0.10, 0.10] }, yaw: "travel", kind: "the rolling foot down beside the ball's path" },
    { F: "S", t0: 0.38, t1: 0.52, at: null, yaw: null, kind: "exit stride (side-on)" },
  ],
  contacts: [{ F: "F", tau: 0, surface: "SOLE", role: "SHIELD ROLL · the far foot's sole rolls it away", decisive: true, aim: { v: 1.9, launch: 82 },
    swing: { contact: { pitch: 16 }, footSpeed: 1.2, via: [{ dt: -0.12, rel: "ballNow", at: [-0.12, -0.10, 0.28], yaw: 10, pitch: -10 }, { dt: -0.05, rel: "ballNow", at: [-0.02, -0.06, 0.24], yaw: 30 }, { dt: 0.08, rel: "ballNow", at: [-0.04, -0.12, 0.14], yaw: 60, w: 0.6 }] } }] };
// ── P5 × 2 + spin · ROULETTE (Marseille turn) — EXPERIMENTAL: the right sole drags the ball back as the body spins (back to the threat), the left
// sole drags it on as the spin completes; exit ≈ 90° to the left of the entry ────────────────────────────────────────────────────────────────
const ROULETTE = { id: "ROULETTE", label: "ROULETTE (Marseille turn)", turn: -1, ref: 90, comfort: [60, 120], hard: [40, 140], vRange: [0, 4.2], vFloor: 0,
  start: -0.28, end: 1.0, firstFoot: "F", B: [0.22, 0.08], tLine: 0.55, protect: 0.80, experimental: "the 360° spin is drawn as a facing rotation over planted / pivoting feet: the legs cross mid-spin in some phases",
  com: { v: [[-0.28, 2.4], [-0.14, 1.3], [0, 0.5], [0.12, 0.4], [0.26, 0.5], [0.40, 1.0], [0.60, 2.2], [1.0, 3.8]], h: [[-0.28, 0], [0.10, 0], [0.26, -30], [0.40, -80], [0.55, -90]] },
  face: [[-0.28, 0], [-0.04, 4], [0.10, 90], [0.22, 180], [0.34, 250], [0.46, 270]], trunk: [[-0.28, 0], [0, 6], [0.20, 10], [0.40, 0]],
  side: [[-0.28, 0], [0.10, 6], [0.30, 0]], lean: [[-0.28, 6], [0, 2], [0.2, 4], [0.5, 12]], crouch: [[-0.28, 0.03], [0, 0.07], [0.30, 0.07], [0.6, 0.03]],
  arms: [[-0.28, 0.2], [0, 0.6], [0.3, 0.7], [0.6, 0.3]], gait: [[-0.28, 0.5], [0, 0.3], [0.45, 0.4], [0.65, 1]], look: [[-0.28, 1], [0.6, 1]],
  stances: [
    { F: "F", t0: -0.28, t1: -0.16, at: { rel: "travel", t: -0.28, p: [0.16, 0.04] }, yaw: "travel", kind: "braking" },
    { F: "S", t0: -0.12, t1: 0.16, at: { rel: "O", p: [0.08, -0.14] }, yaw: 0, pivot: [[-0.02, 0], [0.16, 120]], kind: "the left foot beside the ball, pivoting (back to the threat)" },
    { F: "F", t0: 0.14, t1: 0.36, at: { rel: "com", t: 0.25, p: [0.0, 0.04] }, yaw: 180, pivot: [[0.20, 0], [0.36, 80]], w: 0, kind: "the right foot down under the body, the spin turning on it" },
    { F: "S", t0: 0.40, t1: 0.56, at: null, yaw: null, kind: "exit stride" },
  ],
  contacts: [
    { F: "F", tau: 0, surface: "SOLE", role: "ROULETTE · the right sole drags it back", decisive: true, aim: { v: 0.9, launch: 200 },
      swing: { contact: { pitch: 16 }, footSpeed: 1.2, via: [{ dt: -0.12, rel: "ballNow", at: [-0.26, 0.0, 0.28], pitch: -20 }, { dt: 0.06, rel: "ballNow", at: [0.04, 0.10, 0.14], yaw: 60 }] } },
    { F: "S", tau: 0.30, surface: "SOLE", role: "roulette · the left sole drags it on", aim: { v: 2.6, launch: "exit" } },
  ] };
// ── P9 · HEEL CHOP — EXPERIMENTAL (new 22 Oct): the plant goes beside and past the ball; the right foot passes the ball's outside and in front of
// it and its HEEL drives it back behind the standing leg; the body turns on the plant onto it (reference 135° to the left). The heel contact is
// the body's HEEL pose (u_body.js); the route over the front of the ball is authored ─────────────────────────────────────────────────────────
const HEELCHOP = { id: "HEELCHOP", label: "HEEL CHOP", turn: -1, ref: 135, comfort: [110, 160], hard: [95, 175], vRange: [1.0, 6.0], vFloor: 1.0,
  start: -0.36, end: 0.90, firstFoot: "F", B: [0.12, 0.14], tLine: 0.44, protect: 0.90, experimental: "new 22 Oct: the heel pose and the route over the front of the ball are authored, not yet reviewed at 1×; the exit step crosses the planted heeling foot (≈ 10 cm)",
  com: { v: [[-0.36, 3.2], [-0.18, 2.2], [-0.06, 1.0], [0, 0.45], [0.10, 0.25], [0.20, 0.6], [0.32, 1.4], [0.50, 2.6], [0.90, 4.0]],
         h: [[-0.36, 0], [0, 0], [0.08, -50], [0.16, -120], [0.26, -135], [0.50, -135]] },
  face: [[-0.36, 0], [-0.12, 4], [-0.02, 8], [0.06, -30], [0.14, -90], [0.24, -130], [0.32, -135]],
  trunk: [[-0.36, 0], [-0.10, 4], [0, 6], [0.08, -14], [0.18, -8], [0.30, 0]], lean: [[-0.36, 6], [-0.18, 4], [-0.06, 6], [0.04, 2], [0.16, 6], [0.30, 14], [0.55, 13]],
  side: [[-0.36, 0], [-0.04, 4], [0.08, -8], [0.20, -4], [0.36, 0]], crouch: [[-0.36, 0.03], [-0.10, 0.06], [0.04, 0.08], [0.20, 0.05], [0.45, 0.03]],
  arms: [[-0.36, 0.2], [-0.08, 0.6], [0.08, 0.7], [0.30, 0.3]], gait: [[-0.36, 0.6], [-0.15, 0.4], [0.20, 0.2], [0.40, 0.8], [0.55, 1]], look: [[-0.36, 1], [0.30, 1], [0.55, 0.7]],
  stances: [
    { F: "F", t0: -0.36, t1: -0.20, at: { rel: "travel", t: -0.36, p: [0.16, 0.0] }, yaw: "travel", kind: "braking (penultimate)" },
    { F: "S", t0: -0.18, t1: 0.21, at: { rel: "O", p: [0.08, -0.10] }, yaw: -20, pivot: [[0, 0], [0.21, -100]], heel: [0.02, 12], kind: "PLANT · beside and past the ball; the pivot on the forefoot" },
    { F: "F", t0: 0.16, t1: 0.32, at: { rel: "O", p: [0.32, 0.0] }, yaw: -80, w: 0.5, kind: "the heeling foot down in front, turned toward the new line" },
    { F: "S", t0: 0.36, t1: 0.50, at: null, yaw: null, kind: "exit stride" },
  ],
  contacts: [
    { F: "F", tau: 0, surface: "HEEL", role: "HEEL CHOP · the heel drives it back behind the standing leg", decisive: true, aim: { v: 2.4, launch: -150 },
      swing: { contact: { pitch: -8 }, footSpeed: 1.6, via: [{ tau: -0.14, rel: "ballNow", at: [-0.22, 0.16, 0.24], yaw: 4, pitch: -20 }, { dt: -0.06, rel: "ballNow", at: [0.20, 0.10, 0.20], yaw: 30, pitch: -10 },
        { dt: 0.05, rel: "O", at: [0.14, 0.10, 0.16], yaw: -30, pitch: 0 }] } },
    { F: "S", tau: 0.40, surface: "LACES", role: "exit touch", aim: { v: 4.5, launch: "exit" }, swing: { via: [{ dt: 0.03, rel: "ballNow", exitAt: [-0.18, 0.17], h: 0.13, yaw: 10, wYawExit: true }] } },
  ] };
// (the SET STEP: a technique that opens with its support / other foot gets a first stance of the striking foot `lead` s before — the step whose
// swing end plays the SET TOUCH that places the ball at the technique's point (the resolver's set touch is the striking foot's), as the
// baseline's chop / Cruyff open with theirs; the approach keys are held back to it)
function withSetStep(T, lead = 0.18) { const s0 = T.start, s1 = s0 - lead; T.stances.unshift({ F: "F", t0: s1, t1: s1 + 0.13, at: null, yaw: "travel", kind: "set step (the touch that sets the ball)" });   // (at: null — the gait's own footfall)
  T.start = s1; T.firstFoot = "F"; T.com.v.unshift([s1, T.com.v[0][1] + 0.2]); T.com.h.unshift([s1, 0]); if (T.com.hFrac) T.com.hFrac.unshift([s1, 0]);
  for (const k of ["face", "trunk", "side", "lean", "crouch", "arms", "gait", "look"]) if (T[k] && T[k].length) T[k].unshift([s1, T[k][0][1]]); return T; }
// ── P7 → P1 · SCISSORS → CONTINUE: the loop sells the cut, the other foot's laces push the ball straight on (free: the exit is the request) ──
const SCISSORS_GO = Object.assign(JSON.parse(JSON.stringify(SCISSORS)), { id: "SCISSORS_GO", label: "SCISSORS → CONTINUE", turn: 0, ref: 0, free: true, comfort: [0, 25], hard: [0, 40] });
SCISSORS_GO.com.h = [[-0.38, 0], [-0.20, 6], [-0.08, 7], [0.06, 0], [0.30, 0]]; SCISSORS_GO.com.hFrac = [[-0.38, 0], [0, 0], [0.20, 0.8], [0.30, 1]];
SCISSORS_GO.face = [[-0.38, 0], [-0.24, 14], [-0.10, 16], [0.04, 2], [0.20, 0]]; SCISSORS_GO.com.v = [[-0.38, 4.6], [-0.20, 4.0], [-0.06, 3.8], [0, 3.9], [0.10, 4.6], [0.30, 5.8], [0.70, 6.8]];
SCISSORS_GO.contacts = [{ F: "S", tau: 0, surface: "LACES", role: "SCISSORS → CONTINUE · the other foot pushes it on", decisive: true, aim: { v: 5.6, launch: "exit" },
  swing: { contact: { pitch: -22 }, footSpeed: 3.0, via: [{ dt: -0.10, rel: "ballNow", at: [-0.26, -0.02, 0.15] }, { dt: 0.04, rel: "ballNow", exitAt: [-0.12, -0.04], h: 0.12, w: 1 }] } }];
SCISSORS_GO.stances[2] = { F: "S", t0: 0.08, t1: 0.22, at: { rel: "travel", t: 0.08, p: [0.22, -0.09] }, yaw: "travel", kind: "the pushing foot down, running on" };
export const NEW_TEMPLATES = { ELASTICO: withSetStep(elastico(false)), RELASTICO: withSetStep(elastico(true)), SCISSORS: withSetStep(SCISSORS), SCISSORS_GO: withSetStep(SCISSORS_GO), STEPOVER: withSetStep(STEPOVER, 0.20), DSCISSORS: withSetStep(DSCISSORS, 0.20), MATTHEWS: withSetStep(MATTHEWS, 0.20), VPULL: solePull("VPULL"), LDRAG: solePull("LDRAG"), PULLPUSH: solePull("PULLPUSH"),
  OUTHOOK, DEADEN: stopGo("DEADEN"), FAKESTOP: stopGo("FAKESTOP"), HESITATE: stopGo("HESITATE"), SHIELDROLL, ROULETTE, HEELCHOP };
export const TEMPLATES = Object.assign({}, BASE, NEW_TEMPLATES);
export const TECH_ALL = Object.keys(TEMPLATES);
export const LABEL_V = Object.fromEntries(Object.entries(NEW_TEMPLATES).map(([k, T]) => [k, T.label]));
