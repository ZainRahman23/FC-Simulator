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
  start: -0.36, end: 0.90, firstFoot: "F", B: [0.12, 0.14], tLine: 0.44, protect: 0.90, experimental: "new 22 Oct: the heel pose and the route over the front of the ball are authored, not yet reviewed at 1×",
  com: { v: [[-0.36, 3.2], [-0.18, 2.2], [-0.06, 1.0], [0, 0.45], [0.10, 0.25], [0.20, 0.6], [0.32, 1.4], [0.50, 2.6], [0.90, 4.0]],
         h: [[-0.36, 0], [0, 0], [0.08, -50], [0.16, -120], [0.26, -135], [0.50, -135]] },
  face: [[-0.36, 0], [-0.12, 4], [-0.02, 8], [0.06, -30], [0.14, -90], [0.24, -130], [0.32, -135]],
  trunk: [[-0.36, 0], [-0.10, 4], [0, 6], [0.08, -14], [0.18, -8], [0.30, 0]], lean: [[-0.36, 6], [-0.18, 4], [-0.06, 6], [0.04, 2], [0.16, 6], [0.30, 14], [0.55, 13]],
  side: [[-0.36, 0], [-0.04, 4], [0.08, -8], [0.20, -4], [0.36, 0]], crouch: [[-0.36, 0.03], [-0.10, 0.06], [0.04, 0.08], [0.20, 0.05], [0.45, 0.03]],
  arms: [[-0.36, 0.2], [-0.08, 0.6], [0.08, 0.7], [0.30, 0.3]], gait: [[-0.36, 0.6], [-0.15, 0.4], [0.20, 0.2], [0.40, 0.8], [0.55, 1]], look: [[-0.36, 1], [0.30, 1], [0.55, 0.7]],
  stances: [
    { F: "F", t0: -0.36, t1: -0.20, at: { rel: "travel", t: -0.36, p: [0.16, 0.0] }, yaw: "travel", kind: "braking (penultimate)" },
    { F: "S", t0: -0.18, t1: 0.21, at: { rel: "O", p: [0.08, -0.10] }, yaw: -20, pivot: [[0, 0], [0.21, -100]], heel: [0.02, 12], kind: "PLANT · beside and past the ball; the pivot on the forefoot" },
    { F: "F", t0: 0.16, t1: 0.32, at: { rel: "O", p: [0.42, 0.10] }, yaw: -80, w: 0.5, kind: "the heeling foot down in front and to its side, turned toward the new line" },   // (0.32 m ahead it landed in line with the pivoting plant: the exit step crossed it by 10 cm)
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
// ═══ CRUYFF-CHOP-1 (22 Oct): THE ELITE FAMILY — the Cruyff and the Ronaldo chop refined from the locked references (deep copies: pt_tech.js is
// never modified). The hooks stay the locked / VOCAB-1 references: the accessible brake → hook → exit. The elite versions keep their geometry
// (the drag behind the plant leg; the chop's slice behind the shielding leg, its hop) and cut what is unnecessary: a shorter braking window, the
// decisive contact made while the body is still moving, the follow-through and the exit touch sooner, the re-acceleration at the body's own
// rate — and, entered above their reference speed, they shed speed after the contact no faster than the body can (`credible`): the chop at a
// sprint dropped 7 → 3.3 m/s within 0.1 s of its contact (≈ 36 – 50 m/s² of straight-line braking; A99-C's own turns brake ≈ 11). ════════════
const eliteOf = (T, mod) => { const o = JSON.parse(JSON.stringify(T)); mod(o); o.elite = true; o.credible = true; return o; };
// the CRUYFF: braking stride → plant beside / past the ball → the inside drags it behind the plant leg → the pivot on it → away (reference 120°)
const CRUYFF_E = eliteOf(BASE.CRUYFF, (o) => {
  Object.assign(o, { vRange: [1.2, 8.5], start: -0.26, tLine: 0.34, vCmax: 3.0 });   // (vCmax: the drag is made below 3 m/s — a faster entry brakes first)
  // (the last two steps quick — the braking stride and the plant 0.13 s apart, ≈ 8 m/s² of braking, inside Agility's — the drag at ≈ 1.3 m/s,
  // the pivot at ≈ 0.7, then away at ≈ 9 m/s², the ball-carrying body's own acceleration from low speed)
  o.com.v = [[-0.26, 3.4], [-0.12, 2.4], [-0.05, 1.8], [0, 1.3], [0.06, 0.82], [0.10, 0.72], [0.16, 1.25], [0.24, 1.98], [0.34, 2.88], [0.48, 4.0], [0.70, 5.2], [0.95, 6.0]];
  o.com.h = [[-0.26, 0], [-0.02, 0], [0.05, -42], [0.12, -108], [0.20, -123], [0.45, -121], [0.75, -120]];
  o.face = [[-0.26, 0], [-0.15, 0], [-0.07, -6], [-0.02, -12], [0.04, -48], [0.09, -88], [0.14, -112], [0.22, -120]];
  o.trunk = [[-0.26, 0], [-0.07, 0], [-0.02, 4], [0.04, -16], [0.10, -10], [0.19, 0]];
  o.lean = [[-0.26, 6], [-0.15, 4], [-0.06, 8], [0, 4], [0.10, 4], [0.20, 14], [0.42, 13]];
  o.side = [[-0.26, 0], [-0.02, 0], [0.05, -8], [0.15, -5], [0.30, 0]];
  o.crouch = [[-0.26, 0.03], [-0.06, 0.06], [0.05, 0.08], [0.17, 0.05], [0.36, 0.03]];
  o.arms = [[-0.26, 0.2], [-0.05, 0.6], [0.07, 0.7], [0.24, 0.3]];
  o.gait = [[-0.26, 0.6], [-0.10, 0.4], [0.17, 0.2], [0.32, 0.8], [0.44, 1]];
  o.look = [[-0.26, 1], [0.24, 1], [0.44, 0.7]];
  o.stances = [
    { F: "F", t0: -0.26, t1: -0.155, at: { rel: "travel", t: -0.26, p: [0.16, 0.0] }, yaw: "travel", kind: "braking (penultimate, quick)" },
    { F: "S", t0: -0.12, t1: 0.19, at: { rel: "O", p: [0.04, -0.06] }, yaw: -40, pivot: [[0, 0], [0.17, -80]], heel: [0, 14], kind: "PLANT · beside / past the ball; the pivot on the forefoot" },
    { F: "F", t0: 0.15, t1: 0.29, at: { rel: "O", p: [0.18, -0.30] }, yaw: -112, w: 1, kind: "the dragging foot down on the new line" } ];
  const c = o.contacts[0]; c.aim.v = 3.0;
  // (the backswing ≥ 0.09 s after the braking stride lifts, and shorter: 0.04 s threw the foot 12 – 14 cm a tick)
  c.swing.via = [{ tau: -0.065, rel: "ballNow", at: [-0.22, 0.16, 0.25], yaw: 2, pitch: -30 }, { dt: -0.025, rel: "ballNow", at: [0.14, 0.18, 0.12], yaw: -20, pitch: -12 },
    { dt: 0.025, rel: "O", at: [0.02, 0.24, 0.15], yaw: -60, pitch: 0 }, { dt: 0.06, rel: "O", at: [0.25, 0.14, 0.20], yaw: -80, pitch: 4, w: 0.5 }, { dt: 0.095, rel: "O", at: [0.28, -0.10, 0.17], yaw: -105, pitch: 4, w: 1 }];
  o.contacts[1].tau = 0.30; });
// the RONALDO CHOP: (the hop) → the shielding plant in front of the ball → the inside slices it behind the shielding leg → the crossover onto the
// new line (reference 90°); its follow-through and its exit touch sooner; above its reference speed it keeps speed through the turn (credible)
const CHOP_E = eliteOf(BASE.CHOP, (o) => {
  const c = o.contacts[0]; c.swing.via = [{ dt: -0.10, rel: "ball", at: [-0.28, 0.24, 0.20], yaw: -5, pitch: 12 }, { dt: -0.04, rel: "ball", at: [0.10, 0.26, 0.13], yaw: -28, pitch: 9 },
    { dt: 0.03, rel: "ball", at: [0.15, 0.19, 0.15], yaw: -20, pitch: 2 }, { dt: 0.065, rel: "O", at: [0.34, 0.28, 0.22], yaw: -25, pitch: 5, w: 0.5 }, { dt: 0.11, rel: "O", at: [0.50, -0.10, 0.18], yaw: -60, pitch: 5, w: 1 }];
  o.tLine = 0.22; });
export const ELITE = { CRUYFF: CRUYFF_E, CHOP: CHOP_E };
// ═══ ADV-4 (22 Oct): STOP-AND-GO — the deaden-and-push and the hesitation as one credible family: after the contact the body sheds speed no
// faster than it can and re-accelerates on the ball-carrying D38 curve (u_tc.js) — before, the push was scaled to 1.45 × its reference and the
// body reached 6.7 m/s 0.4 s after a 0.9 m/s deaden (D38 with the ball: 4.4) — the push's follow-through shorter (control back sooner) ════════
const advOf = (T, mod) => { const o = eliteOf(T, mod); o.d38 = true; return o; };
// (the deaden is made near a stop: entered faster than its contact can be made (vCmax 1.5 m/s), it brakes first, as the Cruyff does — credible
// alone, a sprint's deaden met the ball at 2.6 m/s and ran on past it: no braking plant could be found)
const STOPGO_E = { DEADEN: advOf(stopGo("DEADEN"), (o) => { o.contacts[0].swing.via[1] = Object.assign({}, o.contacts[0].swing.via[1], { dt: 0.04 }); o.vCmax = 1.5; o.bodyBrake = true; o.releaseAt = 0.10; o.comfort = [0, 10]; o.hard = [0, 15]; }),   // (≤ 15°: its push angled 20 – 45° crossed the legs 5 – 8 cm at a run — a new line is the next action after the relaunch: the chain "stop-and-go → 45°")
  HESITATE: advOf(stopGo("HESITATE"), (o) => { o.contacts[0].swing.via[1] = Object.assign({}, o.contacts[0].swing.via[1], { dt: 0.03 }); }) };
// ═══ ADV-4: THE V-TURN — one parameterized family (the exit 50 – 160°, reference 110°: its turn keys scale with the request; the V-pull, the
// L-drag and the pull-push stay the VOCAB-1 references, outside the family). A moving pull: the braking stride, the standing foot beside the
// ball, the sole rolls the ball back while the body still moves (≈ 1.2 m/s — not the reference's near stop, 0.45), the same foot's inside
// pushes it out across onto the new line 0.15 s later while the body pivots on the standing foot, then away on the ball-carrying D38 curve
// (credible · d38). Braking at the planner's rate — the hook's and the Cruyff's: the V-turn is compared with them on the same body ═══════════
const vTurnOf = (behind) => { const ex = behind ? -130 : -80;
  return advOf(solePull(behind ? "LDRAG" : "VPULL"), (o) => {
    Object.assign(o, { id: behind ? "VTURN_B" : "VTURN", label: behind ? "V-TURN (behind the leg)" : "V-TURN", turn: -1, ref: -ex, comfort: behind ? [110, 150] : [80, 110], hard: behind ? [96, 165] : [70, 120],   /* (70 – 120°: at 60° the carry after its exit crossed / floated 2 per run at a jog and a run; the inside cut is the quicker answer there) */
      vRange: [2.0, 7.5], vFloor: 0, start: -0.26, end: 0.85, B: [0.22, 0.13], tLine: 0.30, protect: behind ? 0.75 : 0.60, vCmax: 2.2 });   // (KNOWN: entered at a walk its exit stride floated 0.21 s in every phase — rejected below 1.6 m/s: the hook / Cruyff / braking pivot there)
    o.com.v = [[-0.26, 2.8], [-0.14, 2.0], [-0.05, 1.45], [0, 1.2], [0.06, 0.85], [0.12, 0.62], [0.17, 0.75], [0.24, 1.35], [0.32, 2.1], [0.44, 3.1], [0.62, 4.3], [0.85, 5.5]];
    o.com.h = [[-0.26, 0], [0.04, 0], [0.10, ex * 0.3], [0.18, ex * 0.75], [0.27, ex], [0.85, ex]];
    // (the pelvis lags the travel until the pulling foot is round: turned ahead of it, the free foot was left on the wrong side — legs crossed 9 cm)
    o.face = [[-0.26, 0], [0.02, 3], [0.10, ex * 0.25], [0.18, ex * 0.55], [0.28, ex]];
    o.trunk = [[-0.26, 0], [-0.04, 0], [0.03, 6], [0.12, -8], [0.26, 0]]; o.side = [[-0.26, 0], [0, 0], [0.08, 4], [0.18, -6], [0.32, 0]];
    o.lean = [[-0.26, 6], [-0.14, 2], [-0.02, -2], [0.08, 0], [0.22, 10], [0.45, 13]]; o.crouch = [[-0.26, 0.03], [-0.04, 0.05], [0.08, 0.07], [0.22, 0.05], [0.42, 0.03]];
    o.arms = [[-0.26, 0.2], [0, 0.5], [0.12, 0.6], [0.34, 0.3]]; o.gait = [[-0.26, 0.5], [-0.13, 0.4], [0.20, 0.3], [0.34, 0.8], [0.50, 1]]; o.look = [[-0.26, 1], [0.34, 1]];
    const s1 = o.stances[1], s2 = o.stances[2];
    o.stances = [
      { F: "F", t0: -0.26, t1: -0.155, at: { rel: "travel", t: -0.26, p: [0.16, 0.0] }, yaw: "travel", kind: "braking (penultimate, quick)" },
      Object.assign({}, s1, { t0: -0.12, t1: 0.21, yaw: ex * 0.25, pivot: [[0.06, 0], [0.21, ex * 0.6]], kind: "STANDING FOOT beside the ball; the pivot on it" }),
      Object.assign({}, s2, { t0: 0.24, t1: 0.37, kind: behind ? "the pulling foot down behind, on the new line" : "the pulling foot down on the new line" }) ];
    const c = o.contacts[0]; c.role = "V-TURN · the sole rolls it back"; c.aim = { v: 1.3, launch: behind ? 180 : 168 };
    c.swing.via = [{ dt: -0.12, rel: "ballNow", at: [-0.32, 0.0, 0.30], yaw: 10, pitch: -25 }, { dt: -0.06, rel: "ballNow", at: [-0.18, 0.03, 0.31], yaw: 0, pitch: 0 },
      { dt: 0.04, rel: "ballNow", at: [0.06, 0.10, 0.12], yaw: behind ? -35 : -20 }, { dt: 0.10, rel: "ballNow", at: [-0.03, 0.13, 0.10], yaw: behind ? -60 : -40, w: 0.5 }];
    o.releaseAt = 0.24; o.contacts[1] = Object.assign({}, o.contacts[1], { tau: 0.15, role: behind ? "V-TURN · the inside takes it behind the standing leg" : "V-TURN · the inside pushes it out across", aim: { v: 2.4, launch: "exit" } });
    // (… and the exit touch: the far foot's laces at the end of its swing onto the new line — without it the plan had no touch after the push, the
    // possession model saw no controlled continuation and the SECURE carry took the body round at its own rate: the pelvis overshot, legs crossed)
    o.contacts[2] = { F: "S", tau: 0.36, surface: "LACES", role: "exit touch", aim: { v: 4.2, launch: "exit" }, swing: { via: [{ dt: 0.03, rel: "ballNow", exitAt: [-0.20, -0.17], h: 0.13, yaw: -10, wYawExit: true }] } }; }); };
// (the behind-the-leg entry (VTURN_B, 96 – 165°) is kept as a measured reference, not in the family: it is the Cruyff's drag behind the plant leg
// with one touch more, and crossed the legs 9 – 10 cm at 120 – 150° — past ≈ 115° the family hands the reversal to the Cruyff / hook / drag-back)
const VTURN = vTurnOf(false), VTURN_B = vTurnOf(true);
// ═══ ADV-4: THE COMPACT MATTHEWS — the same foot, one swing: the inside cue (a nudge of ≈ 0.6 m/s inward — the implication, not a displacement),
// round the front of the ball, the outside takes it out 0.12 s later; the far foot SIDESTEPS (the weight sold inward) instead of the drag-push's
// hop; no set step, a short braking (3.4 → 2.8 m/s). The VOCAB-1 drag-push (MATTHEWS) stays the reference. Its value is deception — a defender's
// reaction — which nothing scores yet. (KNOWN: entered at a walk its exit stride floated 0.15 – 0.19 s in every phase, at 30° a run crossed the
// legs 5 cm — rejected below 1.6 m/s and under 35°: the outside cut / redirect there) ══════════════════════════════════════════════════════════════════════════════════════════════════════
const MATTHEWS_C = advOf(MATTHEWS, (o) => {
  Object.assign(o, { id: "MATTHEWS_C", label: "MATTHEWS (compact)", comfort: [40, 75], hard: [35, 95], vRange: [2.0, 6.4], vFloor: 1.0, start: -0.30, end: 0.75, firstFoot: "F", B: [0.26, 0.04], tLine: 0.20, protect: 0.40 });
  o.com.v = [[-0.30, 3.4], [-0.16, 3.0], [-0.06, 2.8], [0, 2.8], [0.10, 3.4], [0.28, 4.5], [0.50, 5.4], [0.75, 6.0]];
  o.com.h = [[-0.30, 0], [-0.16, -6], [-0.06, -6], [0.02, 4], [0.10, 18], [0.20, 38], [0.32, 48], [0.42, 50]];
  o.face = [[-0.30, 0], [-0.18, -10], [-0.08, -12], [0, -4], [0.10, 22], [0.24, 46], [0.36, 50]]; o.trunk = [[-0.30, 0], [-0.18, -12], [-0.08, -14], [0, -4], [0.10, 10], [0.30, 0]];
  o.side = [[-0.30, 0], [-0.18, -10], [-0.08, -12], [0, -2], [0.10, 10], [0.30, 6], [0.50, 0]]; o.lean = [[-0.30, 7], [-0.12, 5], [0, 7], [0.25, 13], [0.6, 12]];
  o.crouch = [[-0.30, 0.03], [-0.14, 0.06], [-0.02, 0.05], [0.20, 0.035]]; o.arms = [[-0.30, 0.2], [-0.16, 0.6], [0, 0.5], [0.30, 0.25]]; o.gait = [[-0.30, 0.8], [-0.18, 0.5], [0.12, 0.5], [0.32, 1]]; o.look = [[-0.30, 1], [0.30, 1]];
  o.stances = [
    { F: "F", t0: -0.30, t1: -0.19, at: null, yaw: 0, kind: "the last stride" },
    { F: "S", t0: -0.15, t1: 0.05, at: { rel: "B", p: [-0.12, -0.28] }, yaw: -8, kind: "the SIDESTEP inward (the weight sold) — no hop" },
    { F: "F", t0: 0.08, t1: 0.22, at: { rel: "travel", t: 0.08, p: [0.22, 0.09] }, yaw: "travel", kind: "the same foot down on the new line" },
    { F: "S", t0: 0.26, t1: 0.38, at: null, yaw: null, kind: "exit stride (crossover)" } ];
  const c = o.contacts[0]; c.role = "MATTHEWS · the outside of the same foot takes it out";
  c.swing.via = [{ dt: -0.18, rel: "ballNow", at: [-0.24, 0.10, 0.14], yaw: -4 }, { dt: -0.12, rel: "ballNow", at: [-0.04, 0.12, 0.10], yaw: -14 }, { dt: -0.065, rel: "ballNow", at: [0.04, 0.00, 0.12], yaw: -10 },
    { dt: -0.025, rel: "ballNow", at: [-0.03, -0.12, 0.10], yaw: 10 }, { dt: 0.04, rel: "ballNow", exitAt: [-0.13, -0.16], h: 0.12, yaw: 38, w: 1 }];
  o.contacts[1] = Object.assign({}, o.contacts[1], { tau: -0.12, role: "MATTHEWS · the inside cue (a nudge inward)", aim: { v: 0.6, launch: -50 } }); });
// ═══ BODY FEINT V2 (owner, 23 Oct): THE WHOLE BODY TELLS ONE LIE, THEN THE ELITE EXIT. Fake to the S side (the standing foot's), exit to the F
// side (the playing foot's), the ball untouched until the exit. The mechanics (research: review_artifacts/body_feint_v2/RESEARCH.md — the
// rugby side-step's deceptive cues (head yaw, upper-trunk yaw, the out-foot's placement, exaggerated; the centre of mass's shift, the honest
// signal, small) and the coaching "lunge"):
//   APPROACH  the last ordinary stride on the F foot, a slight check (the feint's cost) — its push starts the body toward the fake side
//   FALSE STEP + FALSE LOAD  the S foot lands WIDE on the fake side, toe turned out; the body loads over it — the knee flexes (crouch), the centre
//             of mass drifts ≈ 8 – 12 cm toward the fake (the authoritative root: its heading a few degrees that way), the pelvis turns a little
//             toward it, the upper trunk more (the shoulder line), the fake side's shoulder drops (the side lean + the clavicle), the head turns
//             with it, the arms leave their cycle — the far arm out and forward as the counterweight
//   REVERSAL  the loaded S leg drives the body back the other way (it is on the fake side: its push is toward the exit — physically coherent)
//   EXIT      the F foot's outside takes the ball out toward the exit, the F foot lands on the new line, the hips release first, the shoulders
//             follow, the arms drive (the cycle back, stronger), D38 the acceleration (no bonus: the d38 cap)
// One generator: `tS` the time scale (low speed slower, running quicker), `amp` the fake's depth (shallow / strong), `v0` the reference approach
// speed (the pre-contact speeds map proportionally below it: a running feint keeps ≈ 80 % of its speed). Internal entries; the player-facing
// technique is BODY FEINT V2 ════════════════════════════════════════════════════════════════════════════════════════════════════════════════
function bodyFeintOf(o) { const tS = o.tS, A = o.amp, v0 = o.v0, T = (x) => +(x * tS).toFixed(4), K = (arr, f = (v) => v) => arr.map(([x, v]) => [T(x), f(v)]);
  // (BODY FEINT V2 — VIDEO-GUIDED, from the owner's reference recording (review_artifacts/body_feint_v2_vg/VIDEO_STUDY.md), t = 0 the touch:
  //   −0.50 … −0.38  the penultimate step on the EXIT side: its push launches the false step and begins the brake
  //   −0.29          the FALSE STEP lands wide on the fake side, toe out; the trunk already tipping, the exit arm already rising
  //   −0.26 … −0.06  THE LIE, held: the trunk flexed forward ≈ 35° and leaning ≈ 20° toward the fake in one curve, the head down with it and
  //                  turned that way, the fake side's shoulder low, the exit arm thrown out at shoulder height (the counterweight), the fake hand
  //                  low by the fake knee — the cycle off; the free (exit-side) leg lifted BEHIND, every gram on the fake leg; the forward run
  //                  mostly killed, so for an instant the body moves toward the fake; the ball untouched, rolling on the exit side
  //   −0.18 →        the hips go back first (the centre of mass toward the ball) while the upper body still sells
  //   0              the free foot swings through from behind and its outside takes the ball out as it lands; the fake foot still down
  //   +0.07 … +0.40  the fake foot steps in under the body, the trunk up, the arms back in a driving cycle, D38's re-acceleration (no bonus)
  const vk = [[-0.50, 1.0], [-0.38, 0.94], [-0.28, 0.76], [-0.18, 0.60], [-0.06, 0.54], [0.02, 0.56], [0.10, 0.70], [0.20, 0.86], [0.36, 0.98], [0.60, 1.02], [0.80, 1.04]].map(([x, f]) => [T(x), +(v0 * (1 - (1 - f) * o.cost)).toFixed(3)]);
  const neg = (d) => (d < 0 ? +(d * A).toFixed(2) : d), lean8 = (d) => +(8 + (d - 8) * A).toFixed(2), arm = (r) => [T(r[0]), +(16 + (r[1] - 16) * A).toFixed(1), +(r[2] * A).toFixed(1), r[3]];
  return { id: o.id, label: "BODY FEINT V2", turn: 1, ref: 45, comfort: [25, 70], hard: [12, 90], entryHard: o.entryHard, entryBand: o.entryBand, entryV: o.entryV, carryFoot: !!o.entryHard, setOnly: !!o.entryHard, holdLine: !!o.entryHard, aheadMin: o.entryHard ? 0.42 : null, steady: o.entryHard ? { dv: 0.4, dh: 6, settle: o.settle || 0.5 } : null, vRange: o.vRange, vFloor: o.vRange[0] - 0.2,
    start: T(-0.50), end: T(0.80), firstFoot: "F", B: o.B || [0.30, 0.22], tLine: T(0.22), protect: 0.30, credible: false, d38: true, elite: true, bodyFeint: true, amp: A,
    releaseAt: T(0.20),
    com: { v: vk, h: K([[-0.50, 0], [-0.38, 0], [-0.30, -7], [-0.24, -12], [-0.19, -9], [-0.14, -2], [-0.07, 5], [0.04, 14], [0.12, 27], [0.22, 39], [0.34, 45]], neg) },
    face: K([[-0.50, 0], [-0.36, -3], [-0.26, -10], [-0.16, -14], [-0.06, -10], [0.06, 10], [0.16, 32], [0.30, 45]], neg),
    trunk: K([[-0.50, 0], [-0.38, -4], [-0.28, -10], [-0.12, -12], [-0.02, -8], [0.08, -2], [0.18, 3], [0.32, 0]], neg),
    side: K([[-0.50, 0], [-0.44, -2], [-0.36, -8], [-0.28, -19], [-0.18, -24], [-0.08, -23], [-0.01, -14], [0.08, -2], [0.16, 4], [0.30, 2], [0.50, 0]], neg),
    lean: K([[-0.50, 8], [-0.44, 10], [-0.37, 17], [-0.29, 30], [-0.18, 38], [-0.08, 38], [-0.01, 28], [0.08, 17], [0.16, 12], [0.40, 10], [0.70, 9]], lean8),
    crouch: K([[-0.50, 0.025], [-0.38, 0.035], [-0.30, 0.06], [-0.22, 0.025 + 0.09 * A], [-0.08, 0.025 + 0.09 * A], [0.02, 0.08], [0.12, 0.05], [0.24, 0.03], [0.45, 0.025]]),
    arms: K([[-0.50, 0.15], [-0.36, 0.20], [0.10, 0.25], [0.30, 0.20], [0.50, 0.15]]),
    gait: K([[-0.50, 1], [-0.45, 0.7], [-0.37, 0.15], [-0.08, 0], [0.06, 0.3], [0.14, 0.9], [0.26, 1.15], [0.60, 1]]),
    look: K([[-0.50, 0.9], [-0.40, 0.5], [-0.30, 0.15], [-0.06, 0.2], [0.06, 0.6], [0.18, 0.85], [0.40, 0.85]]),
    headYaw: K([[-0.50, 0], [-0.42, -6], [-0.32, -18], [-0.10, -20], [0, -10], [0.10, 4], [0.22, 0]], neg),
    headDrop: K([[-0.50, 0], [-0.42, 4], [-0.32, 16], [-0.10, 20], [0, 12], [0.10, 4], [0.20, 0]], (d) => +(d * A).toFixed(2)),
    shDrop: K([[-0.50, 0], [-0.38, -3], [-0.30, -10], [-0.08, -10], [0.04, -3], [0.14, 0]], neg),
    armW: K([[-0.50, 0], [-0.46, 0], [-0.40, 0.5], [-0.33, 1], [-0.06, 1], [0.04, 0.7], [0.12, 0.25], [0.20, 0]]),
    // ([tau, abduction, flexion (+ forward), elbow] — the exit side's arm thrown out, the fake side's low by the fake knee)
    armE: [[-0.46, 30, 0, 60], [-0.38, 64, -14, 36], [-0.29, 82, -26, 26], [-0.08, 80, -24, 28], [0.04, 56, -10, 44], [0.14, 28, 6, 66]].map(arm),
    armF: [[-0.46, 18, 10, 60], [-0.38, 30, 28, 34], [-0.29, 40, 42, 20], [-0.08, 38, 42, 22], [0.04, 26, 24, 40], [0.14, 16, 8, 62]].map(arm),
    stances: [
      { F: "F", t0: T(-0.50), t1: T(-0.38), at: null, yaw: "travel", kind: "the penultimate step on the exit side — its push launches the false step, the brake begins" },
      { F: "S", t0: T(-0.29), t1: T(0.07), at: { rel: "travel", t: T(-0.29), p: [0.10, -(0.37 + 0.08 * A)] }, yaw: -(20 + 10 * A), kind: "THE FALSE STEP · wide on the fake side, the toe out, the knee loaded — every gram on it; then the strut that drives the body back" },
      // (EXIT FOOT: the free foot lands where its outside met the ball — beside the ball's inner side, toe a little toward the exit: the touch is
      // made on the landing step, as in the reference; landing on the travel line 0.03 s after an airborne touch jumped the foot 9 cm in a tick)
      { F: "F", t0: T(0.035), t1: T(0.18), at: { rel: "B", p: [-0.11, -0.13] }, yaw: 0, kind: "the exit foot lands at the ball — its outside collects it into the exit" },
      { F: "S", t0: T(0.24), t1: T(0.24 + 0.22 * (o.sd || 1)), at: null, yaw: null, kind: "the fake foot steps in under the body: the exit stride",
        // (… in FRONT of the planted exit foot, on its own side — from the wide false step a large exit (≥ 75°) sent it straight behind the exit leg
        // while the pelvis turned over it: a 7 – 10 cm crossing; the reference's fake foot steps forward and in)
        swingIn: { via: [{ tau: T(0.15), rel: "stance", at: [0.14, -0.16, 0.13], w: 1 }] } },
      { F: "F", t0: T(0.44), t1: T(0.44 + 0.14 * (o.sd || 1)), at: null, yaw: null, kind: "the exit foot down after its touch" } ],
    contacts: [
      { F: "F", tau: 0, surface: "OUTSIDE", role: "BODY FEINT · the free foot from behind, its outside takes it out the other way", decisive: true, aim: { v: +(1.05 * v0).toFixed(2), launch: "exit" },   // (a collect more than a knock: the body leaves the lie slower than it came — the ball out at ≈ the approach speed, not 1.3 ×, stays within reach of the exit stride)
        // (the free leg's path: lifted BEHIND the body through the lie (knee ≈ 90°, unloaded — it never points at the exit), then through to the ball)
        // (EXIT FOOT — the owner, 23 Oct: the exit foot sells the lie too. After its push it tucks in BEHIND the body toward the fake — to the
        // pelvis's midline, the toe a little toward the fake, never past it (the fake foot is 0.4 m out: no crossing) — the reference's left foot
        // does exactly this from +0.07 to +0.20; it holds there through the lie's peak, releases only once the hips have reversed, and comes
        // through explosively to the ball's inner side: its OUTSIDE takes the ball into the exit as it lands)
        swing: { contact: { pitch: -14, roll: 6 }, footSpeed: 2.4, via: [{ dt: T(-0.32), rel: "pelvis", at: [-0.22, 0.06, 0.22], yaw: -3 }, { dt: T(-0.24), rel: "pelvis", at: [-0.26, -0.04, 0.30], yaw: -5 },
          { dt: T(-0.16), rel: "pelvis", at: [-0.24, -0.06, 0.30], yaw: -5 }, { dt: T(-0.095), rel: "pelvis", at: [-0.17, -0.03, 0.27], yaw: -3 },
          { dt: T(-0.045), rel: "pelvis", at: [0.02, 0.02, 0.18] }, { dt: T(-0.02), rel: "ballNow", at: [-0.15, -0.16, 0.13], pitch: -10 }] } },   // (the toe free on the way in: it turns into the outside contact's own orientation, whatever the pace)
      { F: "F", tau: T(0.38), surface: "LACES", role: "exit touch", aim: { v: +(1.25 * v0).toFixed(2), launch: "exit" }, swing: { via: [{ dt: 0.03, rel: "ballNow", exitAt: [-0.20, 0.17], h: 0.13, yaw: 10, wYawExit: true }] } } ] }; }
// ═══ LA CROQUETA — VIDEO-GUIDED (owner, 23 Oct: the reference recording, review_artifacts/croqueta_vg/VIDEO_STUDY.md). F = the FIRST-touch foot
// (the reference's left), S = the receiving foot; the exit is AWAY from F (turn −1). t = 0 the first touch (decisive):
//   −0.34 … −0.06  the SET-UP: the approach slows, S plants wide on the exit side, F beside the ball (the ball just inside it) — a low, wide,
//                  square base, the trunk forward over the ball
//   −0.08 →        the BODY LEADS: the pelvis starts across toward S before the ball does, the trunk leaning into the new lane
//   0              F's inside sweeps the ball across UNDER the moving body (a controlled roll, not a knock)
//   0 … +0.22      the whole body travels across over S (the root ≈ 0.45 m), the F leg extended behind as the push-off, the S-side arm opening,
//                  the F-side arm back; the ball arrives at S
//   +0.22          S's inside meets the ball and sends it on into the exit lane — part of the same movement, the body still travelling
//   +0.36 …        F swings through into the new lane: the exit stride, the arms back to running, D38's re-acceleration (no bonus)
function croquetaOf(o) { const sd = o.sd || 1, wk = !!o.walk, xT = 0.31 + 0.30 * sd, tS = o.tS, v0 = o.v0, T = (x) => +(x * tS).toFixed(4), K = (arr, f = (v) => v) => arr.map(([x, v]) => [T(x), f(v)]), V = (f) => +(v0 * f).toFixed(3);
  const arm = (r) => [T(r[0]), r[1], r[2], r[3]];
  return { id: o.id, label: "LA CROQUETA", turn: -1, ref: 45, comfort: [20, 70], hard: [10, 90], vRange: o.vRange, vFloor: o.vRange[0] - 0.2,
    start: T(o.st || -0.26), end: T(xT + 0.26), firstFoot: "F", B: [o.bA || 0.10, 0.22], tLine: T(0.34), protect: 0.44, credible: false, d38: true, elite: true, croqVG: true,
    releaseAt: T(0.34),
    com: { v: [[o.st || -0.26, V(1.0)], [-0.14, V(o.vSet)], [-0.04, V(o.vShift - 0.04)], [0.10, V(o.vShift)], [0.27, V(o.vShift + 0.02)], [0.42, V(0.82)], [0.62, V(0.96)], [0.84, V(1.02)]].map(([x, v]) => [T(x), v]),
      h: K([[-0.34, 0], [-0.22, 0], [-0.14, -20], [-0.06, -50], [0, -62], [0.10, -70], [0.20, -64], [0.30, -50], [0.42, -45]]) },
    face: K([[-0.34, 0], [-0.16, -2], [-0.04, -5], [0.08, -9], [0.22, -16], [0.34, -30], [0.48, -42], [0.60, -45]]),
    trunk: K([[-0.34, 0], [-0.10, -4], [0.06, -8], [0.20, -4], [0.36, 0]]),
    side: K([[-0.34, 0], [-0.18, -3], [-0.08, -12], [0.02, -22], [0.18, -24], [0.30, -14], [0.44, -4], [0.60, 0]]),
    lean: K([[-0.34, 12], [-0.22, 21], [-0.08, 30], [0.06, 36], [0.22, 33], [0.40, 26], [0.62, 19], [0.88, 12]]),
    crouch: K([[-0.34, 0.03], [-0.20, 0.07], [-0.06, 0.085], [0.12, 0.085], [0.30, 0.06], [0.50, 0.03]]),
    arms: K([[-0.34, 0.2], [-0.10, 0.25], [0.30, 0.3], [0.50, 0.18]]),
    gait: K([[-0.34, 0.6], [-0.22, 0.1], [0.30, 0.1], [0.46, 0.9], [0.64, 1]]),
    look: K([[-0.34, 0.9], [0.30, 0.9], [0.50, 0.8]]),
    headDrop: K([[-0.34, 2], [-0.16, 9], [0.12, 12], [0.34, 5], [0.52, 0]]),
    armW: K([[-0.34, 0.3], [-0.24, 0.8], [-0.16, 1], [0.30, 1], [0.42, 0.55], [0.54, 0]]),
    // ([tau, abduction, flexion (+ forward), elbow] — armE is F's side (the push-off side): back and low; armF is S's (the exit side): opening out)
    // (on the trunk, which leans toward S by up to 24°: F's arm hangs ≈ 30° out in the world with 8–12° of its own; S's opens ≈ 45° with 60–66°)
    armE: [[-0.34, 10, 8, 24], [-0.16, 12, 4, 24], [-0.04, 10, -12, 24], [0.10, 8, -18, 26], [0.24, 12, 10, 34], [0.40, 16, 20, 50]].map(arm),
    armF: [[-0.34, 10, 8, 24], [-0.16, 28, 10, 22], [-0.04, 54, 14, 20], [0.10, 64, 16, 20], [0.24, 58, 12, 26], [0.40, 34, 4, 44]].map(arm),
    stances: [
      { F: "F", t0: T(o.st || -0.26), t1: T(-0.05), at: { rel: "B", p: [-0.02, 0.13] }, yaw: 4, kind: "the set-up: the first foot beside the ball, the ball just inside it" },
      { F: "S", t0: T(-0.16), t1: T(0.16), at: { rel: "travel", t: T(-0.16), p: [0.04, -0.32] }, yaw: -8, kind: "the set-up: the receiving foot planted wide on the exit side — the body travels across over it" },
      { F: "F", t0: T(0.14), t1: T(0.32), at: { rel: "stance", of: 1, t: T(0.14), p: [-0.06, 0.19] }, yaw: -14, kind: "the first foot after its sweep: its follow-through brings it under the moving body, down beside the receiving foot" },
      { F: "S", t0: T(0.31), t1: T(0.31 + 0.13 * sd), at: { rel: "travel", t: T(0.31), p: [0.16, -0.08] }, yaw: "travel", kind: "the receiving foot down after its touch, in the new lane" },
      { F: "F", t0: T(0.31 + 0.15 * sd), t1: T(wk ? xT + 0.13 : xT + 0.09), at: { rel: "travel", t: T(0.31 + 0.15 * sd), p: [0.14, 0.08] }, yaw: "travel", kind: "the exit stride, under the body in the new lane" },
      { F: "S", t0: T(xT + 0.06), t1: T(xT + 0.06 + (wk ? 0.45 : 0.15 * sd)), at: { rel: "travel", t: T(xT + 0.06), p: [0.14, -0.08] }, yaw: "travel", kind: "the receiving foot down after its exit touch" } ],
    contacts: [
      { F: "F", tau: 0, surface: "INSIDE", role: "LA CROQUETA · the first inside sweeps it across under the moving body", decisive: true, aim: { v: +(o.vT).toFixed(2), launch: -78 },
        // (no waypoint: the foot is planted at the ball's F side and sweeps straight through it — a waypoint on the ball at the lift, 0.05 s
        // before, sat ≈ 10 cm behind the planted foot and jumped it there)
        swing: { footSpeed: 1.4 } },
      { F: "S", tau: T(0.27), surface: "INSIDE", role: "LA CROQUETA · the other inside receives it into the new lane", aim: { v: +(o.vR).toFixed(2), launch: "exit", off: 8 },
        swing: { via: [{ dt: -0.05, rel: "ballNow", at: [-0.10, -0.13, 0.08] }] } },
      // (… and the exit touch — the RECEIVING foot again, two steps on, as in the reference: it keeps the ball. The first foot's touch instead
      // reached across in front of the receiving leg at a run, the ball sent on in that foot's lane; with no touch after the receive the carry
      // took over at it and the body stood up within 0.05 s)
      { F: "S", tau: T(xT), surface: "LACES", role: "exit touch", aim: { v: +(o.vR * 1.05).toFixed(2), launch: "exit", off: -6 } } ] }; }
// ── LA CROQUETA — HOP/SWEEP V2 (owner, 23 Oct ≈ 19:20 EEST: the Iniesta reference, its rear-low and front views — the right foot's ball
// across to the left foot as ONE low hop/sweep of the whole lower body). F = the ball-side foot (the reference's right), S = the receiving foot;
// t = 0 the first touch. The reference's support sequence (rear-low view, frame by frame):
//   −0.16 … 0     LOAD: S lands under the body (the support, low); F is OUT with the ball, its leg extended toward the ball side — the "/|"
//   0             F's inside sweeps the ball across and the foot travels with it (the touch on the ball's outer side)
//   +0.04         S unweights — the HOP: F comes down under the body (+0.08) and PUSHES the body across, its leg extending behind as the
//                 push-off; the pelvis, hips and the centre of mass carried across by that one impulse (no walking steps)
//   +0.18         S, flying across with the body, meets the ball at its inside beyond the body's line and lands where it met it — the "|\":
//                 the legs have changed sides (S out in the new lane with the ball, F long behind)
//   +0.24 …       GO: F swings through, S keeps the ball (its next touch two steps on); low and pitched into the new lane
function croqHopOf(o) { const tS = o.tS, v0 = o.v0, T = (x) => +(x * tS).toFixed(4), K = (arr, f = (v) => v) => arr.map(([x, v]) => [T(x), f(v)]), V = (f) => +(v0 * f).toFixed(3);
  const arm = (r) => [T(r[0]), r[1], r[2], r[3]];
  return { id: o.id, label: "LA CROQUETA", turn: -1, ref: 45, comfort: [20, 70], hard: [10, 90], vRange: o.vRange, vFloor: o.vRange[0] - 0.2,
    start: T(o.st), end: T(0.70), firstFoot: "S", B: [o.bA, o.bL], tLine: T(0.26), protect: 0.40, credible: false, d38: true, elite: true, croqVG: true, croqHS: true,
    releaseAt: T(0.24),
    com: { v: [[o.st, V(1.0)], [-0.04, V(o.vLoad)], [0.04, V(o.vLoad)], [0.12, V(o.vHop)], [0.24, V(o.vHop)], [0.40, V(0.94)], [0.62, V(1.0)]].map(([x, v]) => [T(x), v]),
      h: K([[o.st, 0], [-0.06, -6], [0.02, -26], [0.08, -58], [0.16, -70], [0.24, -58], [0.34, -46], [0.46, -45]]) },
    face: K([[-0.16, 0], [0.04, -6], [0.16, -16], [0.26, -30], [0.40, -42], [0.52, -45]]),
    trunk: K([[-0.16, 0], [0.02, -6], [0.16, -4], [0.30, 0]]),
    side: K([[-0.16, 0], [-0.06, 4], [0.04, -14], [0.14, -22], [0.24, -14], [0.36, -4], [0.50, 0]]),
    lean: K([[-0.16, 16], [-0.06, 26], [0.06, 30], [0.20, 29], [0.36, 25], [0.62, 17], [0.80, 12]]),
    crouch: K([[-0.16, 0.08], [-0.06, 0.17], [0.06, 0.18], [0.20, 0.15], [0.34, 0.11], [0.52, 0.06], [0.70, 0.03]]),
    arms: K([[-0.16, 0.2], [0.24, 0.3], [0.44, 0.2]]),
    gait: K([[-0.16, 0.4], [-0.10, 0.1], [0.24, 0.1], [0.40, 0.9], [0.56, 1]]),
    look: K([[-0.16, 0.9], [0.30, 0.9], [0.50, 0.8]]),
    headDrop: K([[-0.16, 6], [-0.06, 11], [0.10, 13], [0.30, 5], [0.46, 0]]),
    armW: K([[-0.20, 0.4], [-0.12, 1], [0.26, 1], [0.38, 0.5], [0.48, 0]]),
    // ([tau, abduction, flexion (+ forward), elbow] — armE F's side, low and a little forward, back as F pushes; armF S's (the new lane's) side,
    // opening as the body hops across — on a trunk leaning toward S)
    armE: [[-0.16, 14, 12, 26], [-0.04, 18, 18, 24], [0.08, 14, -6, 26], [0.20, 12, -10, 30], [0.34, 14, 14, 44]].map(arm),
    armF: [[-0.16, 20, 8, 22], [-0.04, 40, 10, 20], [0.08, 62, 14, 18], [0.20, 58, 10, 22], [0.34, 34, 6, 40]].map(arm),
    stances: [
      { F: "S", t0: T(o.st), t1: T(0.06), at: { rel: "travel", t: T(o.st), p: [o.sA, -o.sL] }, yaw: -4, kind: "the load: the receiving foot down under the body, the support" },
      { F: "F", t0: T(o.fT), t1: T(0.24), at: { rel: "com", t: T(o.fT), p: [0.06, o.fL] }, yaw: -10, kind: "the hop: the ball-side foot down under the body after its sweep, pushing the body across" },
      { F: "S", t0: T(0.21), t1: T(0.36), at: { rel: "ballAt", t: T(0.18), exitAt: [-0.04, -0.13] }, yaw: "travel", kind: "the landing: the receiving foot down where its inside met the ball, in the new lane" },
      { F: "F", t0: T(0.38), t1: T(0.56), at: { rel: "travel", t: T(0.38), p: [0.16, 0.12] }, yaw: "travel", kind: "the exit stride, under the body in the new lane" },
      { F: "S", t0: T(0.52), t1: T(0.78), at: { rel: "travel", t: T(0.52), p: [0.14, -0.12] }, yaw: "travel", kind: "the receiving foot down after its exit touch" } ],
    contacts: [
      { F: "F", tau: 0, surface: "INSIDE", role: "LA CROQUETA · the ball-side inside sweeps it across, the foot travelling with it", decisive: true, aim: { v: +(o.vT).toFixed(2), launch: o.lT },
        swing: { footSpeed: 1.6, via: [{ dt: -0.04, rel: "ballNow", at: [-0.02, 0.12, 0.05] }] } },
      { F: "S", tau: T(0.18), surface: "INSIDE", role: "LA CROQUETA · the receiving inside meets it beyond the body's line as it lands", aim: { v: +(o.vR).toFixed(2), launch: "exit", off: 4 },
        swing: { via: [{ dt: -0.04, rel: "ballNow", at: [-0.06, -0.14, 0.06] }] } },
      { F: "S", tau: T(0.46), surface: "LACES", role: "exit touch", aim: { v: +(o.vX).toFixed(2), launch: "exit", off: o.xOff } } ] }; }
// ── LA CROQUETA — X-SWEEP V3 (owner, 23 Oct ≈ 20:51 EEST): the same reference case as ONE continuous elastic X-shaped SWEEP. F = the
// ball-side foot (the right), S = the receiving foot; t = 0 the first touch:
//   −0.28 … 0     the RIGHT-SIDE BOW: from the upright dribble the right leg swings OUT and FORWARD beyond the ball — the whole chain, the
//                 thigh abducted, the knee and the toe turned out (fVia) — then comes in so its inside establishes the ball ahead of the
//                 torso; the left leg trails; the trunk bends over the pelvis toward the right (bend) and the right hip hikes (proll): the
//                 right side concave, around the ball
//   0 … +0.18     the SWEEP: the right inside sweeps the ball across and slightly BACK, the foot travelling with it; the left foot unweights
//                 (+0.02) and swings forward and out; the right foot comes down behind its sweep (+0.10) and pushes; the pelvis swings —
//                 across, yawing toward the exit, its roll reversing; the bend passes through the centre at ≈ +0.08
//   +0.18         the LEFT-SIDE BOW: the left inside receives the ball, the leg opened out and forward; the trunk bent toward the left, the left
//                 hip hiked (the left side concave); the right leg trailing behind — the geometry has swung from one diagonal to the other
//   +0.21 …       the left foot lands where it met the ball, GO (the exit stride, the exit touch on the laces)
function croqXOf(o) { const tS = o.tS, v0 = o.v0, T = (x) => +(x * tS).toFixed(4), K = (arr, f = (v) => v) => arr.map(([x, v]) => [T(x), f(v)]), V = (f) => +(v0 * f).toFixed(3);
  const arm = (r) => [T(r[0]), r[1], r[2], r[3]], bS = o.bowLead;
  // (each lateral channel's X: + toward F (the right) in the right-side bow, through 0 at +0.08, − toward S (the left) in the left-side bow)
  const X = (pF, pS) => K([[o.st, 0], [-0.14 - bS, pF * 0.5], [-0.05 - bS, pF], [0.02 - bS * 0.5, pF * 0.6], [0.08, 0], [0.14, -pS * 0.7], [0.20, -pS], [0.30, -pS * 0.5], [0.45, 0]]);
  return { id: o.id, label: "LA CROQUETA", turn: -1, ref: 45, comfort: [20, 70], hard: [10, 90], vRange: o.vRange, vFloor: o.vRange[0] - 0.2,
    start: T(o.st), end: T(0.70), firstFoot: "S", B: [o.bA, o.bL], lineBand: o.band, tLine: T(0.26), protect: 0.40, credible: false, d38: true, elite: true, croqVG: true, croqHS: true, croqXS: true,
    releaseAt: T(0.24),
    com: { v: [[o.st, V(1.0)], [-0.04, V(o.vLoad)], [0.04, V(o.vLoad)], [0.12, V(o.vSweep)], [0.24, V(o.vSweep)], [0.40, V(0.94)], [0.62, V(1.0)]].map(([x, v]) => [T(x), v]),
      h: K([[o.st, 0], [-0.06, -4], [0.02, -30], [0.08, -62], [0.16, -72], [0.24, -62], [0.34, -50], [0.46, -45]]) },
    // (the pelvis's yaw swings with it: a little toward the ball side in the right bow, then through the centre and toward the exit by the
    // receive, so the left leg opens forward as well as out)
    face: K([[o.st, 0], [-0.06, 6], [0.02, 0], [0.08, -16], [0.14, -36], [0.18, -46], [0.26, -48], [0.40, -46], [0.60, -45]]),
    trunk: K([[o.st, 0], [-0.05, 4], [0.10, -6], [0.24, -4], [0.36, 0]]),
    // (the X: the whole trunk leaning (side), the trunk's BEND over the pelvis (spine + chest: the bowing side concave) and the pelvis's ROLL
    // (+ = F's hip up: the leg's side hiked) — all three swing through the centre together)
    side: X(o.sideF, o.sideS), bend: X(o.bendF, o.bendS), proll: X(o.rollF, o.rollS),
    lean: K([[o.st, 14], [-0.08, 24], [0.06, 28], [0.20, 28], [0.36, 24], [0.62, 16], [0.80, 12]]),
    crouch: K([[o.st, 0.08], [-0.10, 0.16], [0.0, 0.18], [0.10, 0.19], [0.20, 0.17], [0.34, 0.12], [0.52, 0.06], [0.70, 0.03]]),
    arms: K([[o.st, 0.2], [0.24, 0.3], [0.44, 0.2]]),
    gait: K([[o.st, 0.4], [-0.10, 0.1], [0.24, 0.1], [0.40, 0.9], [0.56, 1]]),
    look: K([[o.st, 0.9], [0.30, 0.9], [0.50, 0.8]]),
    headDrop: K([[o.st, 6], [-0.06, 11], [0.10, 13], [0.30, 5], [0.46, 0]]),
    armW: K([[o.st - 0.04, 0.4], [-0.14, 1], [0.28, 1], [0.40, 0.5], [0.50, 0]]),
    // ([tau, abduction, flexion (+ forward), elbow] — the arms swap with the bow: in the right bow F's (right) arm low toward the ball and S's
    // (left) out as the counterbalance; in the left bow S's low toward the ball and F's out)
    armE: [[o.st, 14, 10, 26], [-0.08, 10, 14, 24], [0.04, 14, 4, 24], [0.14, 40, 8, 22], [0.22, 54, 10, 22], [0.34, 30, 6, 40]].map(arm),
    armF: [[o.st, 18, 8, 22], [-0.08, 48, 10, 20], [0.04, 40, 8, 20], [0.14, 20, 12, 24], [0.22, 16, 18, 28], [0.34, 18, 14, 40]].map(arm),
    stances: [
      { F: "S", t0: T(o.st), t1: T(0.02), at: { rel: "travel", t: T(o.st), p: [o.sA, -o.sL] }, yaw: -4, kind: "the right-side bow: the receiving foot down under the body, the support, trailing" },
      { F: "F", t0: T(o.fT), t1: T(0.24), at: { rel: "com", t: T(o.fT), p: [o.fA, o.fL] }, yaw: -22, kind: "the sweep: the ball-side foot down behind its sweep, pushing the body across — then trailing" },
      { F: "S", t0: T(o.tR + 0.03), t1: T(0.36), at: { rel: "ballAt", t: T(o.tR), exitAt: [-0.04, -0.13] }, yaw: -44, kind: "the left-side bow: the receiving foot down where its inside met the ball, out in the new lane" },
      { F: "F", t0: T(0.38), t1: T(0.56), at: { rel: "travel", t: T(0.38), p: [0.16, 0.12] }, yaw: "travel", kind: "the exit stride, under the body in the new lane" },
      { F: "S", t0: T(0.52), t1: T(0.78), at: { rel: "travel", t: T(0.52), p: [0.14, -0.12] }, yaw: "travel", kind: "the receiving foot down after its exit touch" } ],
    contacts: [
      // (the right leg swings out and forward beyond the ball first, the toe turned out — the knee follows it out — then its inside comes in
      // onto the ball and travels with it)
      { F: "F", tau: 0, surface: "INSIDE", role: "LA CROQUETA · the ball-side inside establishes the ball and sweeps it across and back, the foot with it", decisive: true, aim: { v: +(o.vT).toFixed(2), launch: o.lT },
        swing: { footSpeed: 1.6, via: [{ dt: -0.14, rel: "ballNow", at: [-0.14, o.oF, 0.12], yaw: -30 }, { dt: -0.04, rel: "ballNow", at: [-0.02, 0.16, 0.05], yaw: -25 }, { dt: 0.04, rel: "ballNow", at: [0.0, 0.13, 0.05] }] } },
      // (the left leg opens forward and out from the pelvis while the ball travels, its inside meeting the ball as it arrives)
      { F: "S", tau: T(o.tR), surface: "INSIDE", role: "LA CROQUETA · the receiving inside, the leg opened forward and out, meets it as it lands", aim: { v: +(o.vR).toFixed(2), launch: "exit", off: 4 },
        swing: { via: [{ dt: -0.07, rel: "pelvis", at: [o.oA, -o.oL, 0.16] }, { dt: -0.04, rel: "ballNow", at: [-0.06, -0.15, 0.06] }] } },
      { F: "S", tau: T(0.46), surface: "LACES", role: "exit touch", aim: { v: +(o.vX).toFixed(2), launch: "exit", off: 0 } } ] }; }
// ── LA CROQUETA — LEG-WAVE V4 (owner, 23 Oct ≈ 22:10 EEST): X-SWEEP V3 unchanged up to the first touch — the owner's screenshot, the
// right-side load `\ \` (L1) — and from there ONE WAVE through both legs, the hips and the trunk: `\ \ → / / → | |`. F = the ball-side foot
// (the right), S = the receiving foot (the left); t = 0 the first touch:
//   0 … +0.18     WAVE 1: the right inside carries the ball left and back, the right leg sweeping inward with it (to `/` by +0.125) and
//                 coming down just behind the ball on its own side of the ball's path — a plant further inward puts the boot through the
//                 ball's path in the 0.1 s it has (the boot is held off the ball and then snaps 35 cm in a frame): not done; AT THE SAME TIME the
//                 left leg, already behind, travels farther OUT to the left — making room for the ball, never jumping forward to it
//   +0.18         `/ /`: the ball arrives diagonally at the already-open left inside, the left leg out, the right trailing inward-behind;
//                 the left side bowed — THE CUSHION: the inside takes the pace off the ball
//   +0.21 …       WAVE 2: from the far-left position the body resolves forward over the ball (the right foot through, the exit touch
//                 middle-left and forward): `| |`
function croqLWOf(o) { const tS = o.tS, v0 = o.v0, T = (x) => +(x * tS).toFixed(4), K = (arr, f = (v) => v) => arr.map(([x, v]) => [T(x), f(v)]), V = (f) => +(v0 * f).toFixed(3);
  const arm = (r) => [T(r[0]), r[1], r[2], r[3]], bS = o.bowLead;
  // (each lateral channel's X: + toward F (the right) in the right-side bow, through 0 at +0.08, − toward S (the left) in the left-side bow)
  const X = (pF, pS) => K([[o.st, 0], [-0.14 - bS, pF * 0.5], [-0.05 - bS, pF], [0.02 - bS * 0.5, pF * 0.6], [0.08, 0], [0.14, -pS * 0.7], [0.20, -pS], [0.30, -pS * 0.5], [0.45, 0]]);
  return { id: o.id, label: "LA CROQUETA", turn: -1, ref: 45, comfort: [20, 70], hard: [10, 90], entryHard: o.entryHard, entryV: o.entryV, vRange: o.vRange, vFloor: o.vRange[0] - 0.2,
    start: T(o.st), end: T(0.70), firstFoot: "S", B: [o.bA, o.bL], lineBand: o.band, rollOnly: true, entryBall: o.entryBall, carryFoot: !!o.entryBall, holdLine: !!o.entryBall, steady: o.entryBall ? { dv: 0.4, dh: 6, settle: 0.5 } : null, entryLead: o.entryBall ? 0.62 : null, tLine: T(0.26), protect: 0.40, credible: false, d38: true, elite: true, croqVG: true, croqHS: true, croqXS: true, croqLW: true,
    releaseAt: T(0.24),
    com: { v: [[o.st, V(1.0)], [-0.04, V(o.vLoad)], [0.04, V(o.vLoad)], [0.12, V(o.vSweep)], [0.24, V(o.vSweep)], [0.40, V(0.94)], [0.62, V(1.0)]].map(([x, v]) => [T(x), v]),
      h: K([[o.st, 0], [-0.06, -4], [0.02, -30], [0.08, -62], [0.16, -72], [0.24, -62], [0.34, -50], [0.46, -45]]) },
    // (the pelvis's yaw swings with it: a little toward the ball side in the right bow, then through the centre and toward the exit by the
    // receive, so the left leg opens forward as well as out)
    face: K([[o.st, 0], [-0.06, 6], [0.02, 0], [0.08, -16], [0.14, -36], [0.18, -46], [0.26, -48], [0.40, -46], [0.60, -45]]),
    trunk: K([[o.st, 0], [-0.05, 4], [0.10, -6], [0.24, -4], [0.36, 0]]),
    // (the X: the whole trunk leaning (side), the trunk's BEND over the pelvis (spine + chest: the bowing side concave) and the pelvis's ROLL
    // (+ = F's hip up: the leg's side hiked) — all three swing through the centre together)
    side: X(o.sideF, o.sideS), bend: X(o.bendF, o.bendS), proll: X(o.rollF, o.rollS),
    lean: K([[o.st, 14], [-0.08, 24], [0.06, 28], [0.20, 28], [0.36, 24], [0.62, 16], [0.80, 12]]),
    crouch: K([[o.st, 0.08], [-0.10, 0.16], [0.0, 0.18], [0.10, 0.19], [0.20, 0.17], [0.34, 0.12], [0.52, 0.06], [0.70, 0.03]]),
    arms: K([[o.st, 0.2], [0.24, 0.3], [0.44, 0.2]]),
    gait: K([[o.st, 0.4], [-0.10, 0.1], [0.24, 0.1], [0.40, 0.9], [0.56, 1]]),
    look: K([[o.st, 0.9], [0.30, 0.9], [0.50, 0.8]]),
    headDrop: K([[o.st, 6], [-0.06, 11], [0.10, 13], [0.30, 5], [0.46, 0]]),
    armW: K([[o.st - 0.04, 0.4], [-0.14, 1], [0.28, 1], [0.40, 0.5], [0.50, 0]]),
    // ([tau, abduction, flexion (+ forward), elbow] — the arms swap with the bow: in the right bow F's (right) arm low toward the ball and S's
    // (left) out as the counterbalance; in the left bow S's low toward the ball and F's out)
    armE: [[o.st, 14, 10, 26], [-0.08, 10, 14, 24], [0.04, 14, 4, 24], [0.14, 40, 8, 22], [0.22, 54, 10, 22], [0.34, 30, 6, 40]].map(arm),
    armF: [[o.st, 18, 8, 22], [-0.08, 48, 10, 20], [0.04, 40, 8, 20], [0.14, 20, 12, 24], [0.22, 16, 18, 28], [0.34, 18, 14, 40]].map(arm),
    stances: [
      { F: "S", t0: T(o.st), t1: T(0.02), at: { rel: "travel", t: T(o.st), p: [o.sA, -o.sL] }, yaw: -4, kind: "the right-side bow: the receiving foot down under the body, the support, trailing" },
      { F: "F", t0: T(0.10), t1: T(0.26), at: { rel: "com", t: T(0.10), p: [o.fA, o.fL] }, yaw: -22, kind: "wave 1: the ball-side foot down just behind the ball, on its own side of the ball's path, after carrying it inward" },
      { F: "S", t0: T(o.tR + 0.03), t1: T(0.36), at: { rel: "ballAt", t: T(o.tR), exitAt: [-0.04, -0.13] }, yaw: -44, kind: "the cushion: the left foot down in the far left where its inside met the ball" },
      { F: "F", t0: T(0.38), t1: T(0.56), at: { rel: "travel", t: T(0.38), p: [0.16, 0.12] }, yaw: "travel", kind: "wave 2: the right foot through, the body resolving forward from the far left" },
      { F: "S", t0: T(0.52), t1: T(0.78), at: { rel: "travel", t: T(0.52), p: [0.14, -0.12] }, yaw: "travel", kind: "the left foot down after its exit touch" } ],
    contacts: [
      // (the right leg swings out and forward beyond the ball first, the toe turned out — the knee follows it out — then its inside comes in
      // onto the ball and travels with it)
      { F: "F", tau: 0, surface: "INSIDE", role: "LA CROQUETA · the ball-side inside establishes the ball and sweeps it across and back, the foot with it", decisive: true, aim: { v: +(o.vT).toFixed(2), launch: o.lT },
        swing: { footSpeed: 1.6, via: [{ dt: -0.14, rel: "ballNow", at: [-0.14, o.oF, 0.12], yaw: -30 }, { dt: -0.04, rel: "ballNow", at: [-0.02, 0.16, 0.05], yaw: -25 },
          // (LEG-WAVE V4: … and after it the inside carries the ball inward beside it, the toe turning, before the foot comes down behind it)
          { dt: 0.05, rel: "ballNow", at: [0.0, 0.12, 0.05], yaw: -35 }] } },
      // (the left leg opens forward and out from the pelvis while the ball travels, its inside meeting the ball as it arrives)
      { F: "S", tau: T(o.tR), surface: "INSIDE", role: "LA CROQUETA · the cushion: the already-open left inside takes the pace off the ball in the far left", aim: { v: +(o.vR).toFixed(2), launch: "exit", off: 0 },
        // (the left foot's path, authored all the way: from behind it travels OUT first, its forward progression steady and never ahead of
        // the ball — [forward, toward F (− = out to the left), height] from the body, at +0.06 / +0.09 / +0.12 / +0.15)
        swing: { via: o.sWave.map(([dt, fw, lat, up]) => ({ dt, rel: "pelvis", at: [fw, lat, up] })) } },
      { F: "S", tau: T(0.46), surface: "LACES", role: "exit touch", aim: { v: +(o.vX).toFixed(2), launch: "exit", off: 0 } } ] }; }
export const CROQ_VG = {
  CROQ_W: croquetaOf({ id: "CROQ_W", walk: true, tS: 1.12, v0: 1.6, st: -0.30, vSet: 0.86, vShift: 0.99, vT: 2.9, vR: 2.2, sd: 1.2, vRange: [0.8, 2.0] }),   // (HOP/SWEEP V2: V1 kept below the jog — not generalized yet)
  CROQ_J: croquetaOf({ id: "CROQ_J", tS: 1.0, v0: 3.2, st: -0.26, vSet: 0.72, vShift: 0.68, vT: 3.8, vR: 3.0, vRange: [2.0, 4.2] }),
  CROQ_R: croquetaOf({ id: "CROQ_R", tS: 0.85, v0: 5.2, st: -0.26, vSet: 0.78, vShift: 0.68, vT: 5.0, vR: 4.6, vRange: [4.4, 6.2] }),   // (… and above it)
  // (HOP/SWEEP V2: the one reference case first — the reference's side (the right foot's ball to the left) at a jog)
  CROQ_HS: croqHopOf({ id: "CROQ_HS", tS: 1.0, v0: 3.2, st: -0.24, vLoad: 0.95, vHop: 0.86, vT: 4.6, lT: -96, vR: 3.1, vX: 3.7, xOff: 0, bA: 0.36, bL: 0.30, sA: 0.16, sL: 0.10, fT: 0.10, fL: 0.10, vRange: [2.0, 4.2] }),
  // (X-SWEEP V3: the same reference case, the X-shaped sweep)
  CROQ_XS: croqXOf({ id: "CROQ_XS", tS: 1.0, v0: 3.2, st: -0.28, vLoad: 0.95, vSweep: 0.66, vT: 5.15, lT: -112, vR: 3.1, vX: 3.7, bA: 0.36, bL: 0.34, band: [0.28, 0.42],
    sA: 0.16, sL: 0.10, fT: 0.10, fA: -0.06, fL: 0.14, oF: 0.30, oA: 0.22, oL: 0.36, tR: 0.18, bowLead: 0.07, sideF: 16, sideS: 20, bendF: 22, bendS: 20, rollF: 16, rollS: 14, vRange: [2.0, 4.2] }),
  // (LEG-WAVE V4: the same reference case — V3 to the first touch, the leg wave from there)
  CROQ_LW: croqLWOf({ id: "CROQ_LW", tS: 1.0, v0: 3.2, st: -0.28, vLoad: 0.95, vSweep: 0.66, vT: 5.15, lT: -112, vR: 2.2, vX: 3.7, bA: 0.36, bL: 0.34, band: [0.28, 0.42],
    sA: 0.16, sL: 0.10, fA: 0.06, fL: 0.02, oF: 0.30, tR: 0.18, bowLead: 0.07, sideF: 16, sideS: 20, bendF: 22, bendS: 20, rollF: 16, rollS: 14,
    sWave: [[-0.12, -0.52, -0.20, 0.12], [-0.09, -0.32, -0.29, 0.12], [-0.06, -0.14, -0.35, 0.11], [-0.03, 0.03, -0.38, 0.08]], vRange: [2.0, 4.2],
    // (DRIBBLING VOCABULARY INTEGRATION: the validated entry — the request 40 – 45° (the approved 40° case and its sweep), the ball where V4 meets it)
    entryHard: [40, 45], entryV: [2.6, 3.6], entryBall: { ahead: [0.39, 0.47], out: [0.20, 0.30] } }),
};
export const BODY_FEINT_V2 = {
  // (DRIBBLING VOCABULARY INTEGRATION: each entry only where the approved six were made and the sweep (tools/lib_bf_sweep.mjs, the approved
  // feint's own standard: 0 visible events, the free foot ≤ 900 °/s and ≤ 5 cm a tick, the outside-foot exit) holds — its own speed (entryV: no
  // walk feint at a jog, no jog feint at a run), the exit angle (entryHard: validated walk 45–55°, jog 35–60°, run 35–40°, each ±3° for the
  // heading's drift at the instant the feint is placed), the playing foot the carrying foot (carryFoot: the lie and the set touch are that foot's —
  // the approved fake right → exit left is the left-footed twin's), the ball on that foot's side and out ahead (≥ 0.42 m), a set touch (setOnly: as in all six) and a
  // settled carry (steady: not accelerating, braking or turning — the speed ±0.4 m/s over the last 0.5 s (a walk: 1.0 s), the heading
  // ±6° of 0.2 s ago). Outside them the feint is declined,
  // never re-shaped; the six approved cases (45° jog / walk, 40° run, both fakes) lie inside. JS / JX: experimental depths, not eligible)
  BFEINT_L: bodyFeintOf({ id: "BFEINT_L", tS: 1.12, amp: 1.0, v0: 2.0, cost: 1.0, vBall: 0.75, sd: 1.7, vRange: [1.0, 2.9], entryHard: [42, 58], entryBand: [45, 55], entryV: [0.6, 2.65], settle: 1.0 }),   // (low speed: slower, the fake as deep)
  BFEINT_J: bodyFeintOf({ id: "BFEINT_J", tS: 1.0, amp: 1.0, v0: 3.4, cost: 1.0, vBall: 1.0, vRange: [2.4, 4.6], entryHard: [32, 63], entryBand: [35, 60], entryV: [2.65, 4.3] }),
  BFEINT_R: bodyFeintOf({ id: "BFEINT_R", tS: 0.80, amp: 0.85, v0: 6.0, cost: 0.75, vBall: 1.3, vRange: [4.0, 7.6], entryHard: [32, 43], entryBand: [35, 40], entryV: [4.3, 7.6] }),   // (running: quicker, a little shallower, ≈ 85 % of its speed kept)
  BFEINT_JS: bodyFeintOf({ id: "BFEINT_JS", tS: 0.9, amp: 0.55, v0: 3.4, cost: 0.6, vBall: 1.0, vRange: [2.4, 4.6] }),   // (shallow)
  BFEINT_JX: bodyFeintOf({ id: "BFEINT_JX", tS: 1.08, amp: 1.4, v0: 3.4, cost: 1.25, vBall: 1.0, vRange: [2.4, 4.6] }),   // (strong)
};
export const NEW_TEMPLATES = { ELASTICO: withSetStep(elastico(false)), RELASTICO: withSetStep(elastico(true)), SCISSORS: withSetStep(SCISSORS), SCISSORS_GO: withSetStep(SCISSORS_GO), STEPOVER: withSetStep(STEPOVER, 0.20), DSCISSORS: withSetStep(DSCISSORS, 0.20), MATTHEWS: withSetStep(MATTHEWS, 0.20), VPULL: solePull("VPULL"), LDRAG: solePull("LDRAG"), PULLPUSH: solePull("PULLPUSH"),
  OUTHOOK, VTURN, VTURN_B, MATTHEWS_C, ...BODY_FEINT_V2, ...CROQ_VG, DEADEN: STOPGO_E.DEADEN, FAKESTOP: stopGo("FAKESTOP"), HESITATE: STOPGO_E.HESITATE, SHIELDROLL, ROULETTE, HEELCHOP, ...(String(globalThis.process?.env?.ABL || "").includes("eliteT") ? {} : Object.assign({}, String(globalThis.process?.env?.ABL || "").includes("eliteC") ? {} : { CRUYFF: CRUYFF_E }, String(globalThis.process?.env?.ABL || "").includes("eliteH") ? {} : { CHOP: CHOP_E })) };   // (ABL=eliteT: the locked references — tools only)
export const TEMPLATES = Object.assign({}, BASE, NEW_TEMPLATES);
export const TECH_ALL = Object.keys(TEMPLATES);
export const LABEL_V = Object.fromEntries(Object.entries(NEW_TEMPLATES).map(([k, T]) => [k, T.label]));
