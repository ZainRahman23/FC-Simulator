// ═══ vocab1/v_cases.js — DRIBBLING VOCAB-1: THE CURATED REPLAYS (the Dribbling Lab's gallery; the same cases run in node: tools/v_cases_run.mjs) ═══
// Each case is EXACT INITIAL CONDITIONS + an input timeline, simulated deterministically (never a video): the player (the sandbox's: S99 · D38 ·
// A99-C · D99 · BC99 · CARRY-B · CONTROLLED · EXPANDED, right-footed unless `pref`), a straight run-up at `mode` for `runup` s, then from t = 0
// the stick toward `ang`° (+ right of the run-up line; a timeline in `stick`), the manual intents in `intents` (none: the AUTO case — B4 decides),
// a DEFENDER MARKER where the move's purpose is (visual only: `def` [ahead, right] metres from the player at t = 0; `threat` the side of it).
// variant: NORMAL · HIGH-SPEED · MIRROR (the left-foot / left-side version) · AUTO (the same state, no request) · REJECTED (a deliberately
// invalid setup) · CHAIN. The clip shown: from `pre` s before t = 0 to `dur` s after it (approach → preparation → decisive → exit → continuation)
const C = (tech, variant, mode, ang, o = {}) => Object.assign({ tech, variant, mode, ang, runup: 2.2, dur: 2.6, pre: 1.1, def: [3.2, 0], intents: o.auto ? [] : [{ t: 0, id: o.req || tech, foot: o.foot || null }] }, o);
export const CASES = [
  // ── CARRY / PACE ──
  C("CARRY", "NORMAL", "RUN", 0, { auto: true, dur: 2.4, def: null, title: "Run with the ball: the ordinary carry, no skill when none is needed" }),
  C("CLOSE_CARRY", "NORMAL", "JOG", 0, { auto: true, stick: [[0, 0, "JOG"], [0.5, 25, "JOG"], [1.0, -20, "JOG"], [1.5, 15, "JOG"], [2.0, 0, "JOG"]], dur: 2.6, def: [3.0, 0], title: "Close control past a defender: small changes, the ball within a step" }),
  C("SPRINT_CARRY", "NORMAL", "SPRINT", 0, { auto: true, runup: 1.0, dur: 4.0, def: null, title: "Open grass: the sprint carry, a push every few strides" }),
  C("KNOCK_ON", "NORMAL", "SPRINT", 35, { runup: 2.6, def: [2.6, -0.6], title: "Exploit the space: knock it past the defender, run onto it" }),
  C("KNOCK_ON", "AUTO", "SPRINT", 35, { runup: 2.6, def: [2.6, -0.6], auto: true, title: "Would B4 knock it on here? (same state, no request)" }),
  // ── CUT / REDIRECT ──
  C("INSIDE_CUT", "NORMAL", "RUN", -60, { auto: true, title: "Cut inside across the defender (B4's compact inside redirect)" }),
  C("OUTSIDE_REDIRECT", "NORMAL", "RUN", 50, { auto: true, title: "Redirect outside with the outside of the foot (B4)" }),
  C("OUTSIDE_CUT", "NORMAL", "RUN", 45, { title: "Drive at the defender, break outside off the planted foot" }),
  C("OUTSIDE_CUT", "MIRROR", "RUN", -45, { foot: "L", title: "Outside cut, left foot" }),
  C("OUTSIDE_CUT", "AUTO", "RUN", 45, { auto: true, title: "Would B4 cut outside here?" }),
  C("INSIDE_HOOK", "NORMAL", "JOG", -150, { title: "Spin off a defender pressing from in front: the inside hook" }),
  C("INSIDE_HOOK", "MIRROR", "JOG", 150, { foot: "L", title: "Inside hook, left foot" }),
  C("OUTSIDE_HOOK", "NORMAL", "JOG", 150, { title: "The outside hook: reverse away to the hooking foot's side" }),
  C("OUTSIDE_HOOK", "MIRROR", "JOG", -150, { foot: "L", title: "Outside hook, left foot" }),
  C("BRAKING_TOUCH", "NORMAL", "SPRINT", 180, { auto: true, runup: 3.0, dur: 3.0, title: "Reverse from a sprint: the hard brake with the ball (B4)" }),
  // ── CHOP ──
  C("RONALDO_CHOP", "NORMAL", "RUN", -90, { title: "A sharp protected redirect at speed: the chop behind the shielding leg" }),
  C("RONALDO_CHOP", "LOW-SPEED", "RUN", -90, { runup: 0.95, title: "The lower-speed chop (≈ 4 m/s, early in the run)" }),
  C("RONALDO_CHOP", "REJECTED", "JOG", -90, { title: "REJECTED: the chop asked from a jog (its hop needs ≥ 3.6 m/s)" }),
  C("RONALDO_CHOP", "HIGH-SPEED", "SPRINT", -80, { runup: 3.0, title: "The sprint chop" }),
  C("RONALDO_CHOP", "MIRROR", "RUN", 90, { foot: "L", title: "Ronaldo chop, left foot" }),
  C("RONALDO_CHOP", "AUTO", "RUN", -90, { auto: true, title: "Would B4 chop here?" }),
  // ── CRUYFF / BEHIND-BODY ──
  C("CRUYFF_SHORT", "NORMAL", "WALK", -125, { title: "Already slow: the Cruyff from its plant, a step sooner" }),
  C("CRUYFF", "NORMAL", "JOG", -125, { title: "Sell the pass, drag it behind the standing leg, go back" }),
  C("CRUYFF", "HIGH-SPEED", "RUN", -120, { title: "The running Cruyff" }),
  C("CRUYFF", "MIRROR", "RUN", 120, { foot: "L", title: "Cruyff, left foot" }),
  C("CRUYFF", "AUTO", "JOG", -125, { auto: true, title: "Would B4 Cruyff here?" }),
  // ── SOLE / DRAG ──
  C("DRAG_BACK", "NORMAL", "JOG", 180, { title: "Back to the pressure: kill it with the sole, pull it back, go" }),
  C("DRAG_BACK", "MIRROR", "JOG", -180, { foot: "L", title: "Drag-back, left foot" }),
  C("DRAG_BACK", "REJECTED", "SPRINT", 180, { runup: 3.0, title: "REJECTED: a drag-back requested at full sprint" }),
  C("L_DRAG", "NORMAL", "JOG", -90, { title: "Pull back and play it behind the standing leg: 90° behind the body" }),
  C("L_DRAG", "MIRROR", "JOG", 90, { foot: "L", title: "L-drag, left foot" }),
  C("SOLE_ROLL", "NORMAL", "WALK", 100, { title: "Nearly stopped: roll it sideways with the sole and turn" }),
  // ── LATERAL TRANSFER ──
  C("CROQUETA", "NORMAL", "RUN", 35, { def: [2.4, 0.1], title: "Beat the reaching leg: inside to inside across the body in one stride" }),
  C("CROQUETA", "MIRROR", "RUN", -35, { foot: "L", def: [2.4, -0.1], title: "Croqueta to the left" }),
  C("CROQUETA", "PRESSURE", "JOG", 35, { def: [1.6, -0.3], threat: -1, title: "Pressure escape: a defender closing on the ball's side — transfer it away across the body" }),
  C("CROQUETA", "AUTO", "RUN", 35, { auto: true, def: [2.4, 0.1], title: "Would B4 play the croqueta here?" }),
  // ── FEINT ──
  C("BODY_FEINT", "NORMAL", "RUN", 0, { stick: [[0, 0, "RUN"], [0.45, -40, "RUN"]], title: "Sell one way with the body (no touch), then go the other" }),
  C("SHOULDER_DROP", "NORMAL", "JOG", 0, { stick: [[0, 0, "JOG"], [0.40, -45, "JOG"]], title: "The shoulder drop: freeze the defender, then go" }),
  C("HIP_FAKE", "NORMAL", "RUN", 0, { stick: [[0, 0, "RUN"], [0.30, 30, "RUN"]], title: "The hip fake: the subtlest sell" }),
  C("FEINT_OUTSIDE_CUT", "NORMAL", "RUN", -45, { title: "Sell inside, cut outside" }),
  C("FEINT_INSIDE_CUT", "NORMAL", "JOG", -40, { title: "Sell outside, cut inside" }),
  C("MATTHEWS", "NORMAL", "JOG", 50, { title: "Push, hop, take: the Matthews feint" }),
  C("MATTHEWS", "MIRROR", "JOG", -50, { foot: "L", title: "Matthews, left foot" }),
  // ── STEPOVER / SCISSORS ──
  C("SCISSORS", "NORMAL", "RUN", -45, { title: "Loop round the front of the ball, sell it, take it the other way" }),
  C("SCISSORS", "MIRROR", "RUN", 45, { foot: "L", title: "Scissors, left leg" }),
  C("SCISSORS", "HIGH-SPEED", "SPRINT", -40, { runup: 3.0, title: "Scissors from a full sprint: the body brakes into it (its useful entry is ≤ 8 m/s)" }),
  C("SCISSORS", "REJECTED", "RUN", -140, { title: "REJECTED: scissors asked for a 140° exit (its range ends at 92°)" }),
  C("STEPOVER", "AUTO", "RUN", 45, { auto: true, title: "The same state, no request: B4 does not stepover by itself (MANUAL)" }),
  C("SCISSORS_GO", "NORMAL", "RUN", 0, { foot: "R", title: "Sell the cut with the loop, then go straight on past the defender" }),
  C("SCISSORS_GO", "MIRROR", "RUN", 0, { foot: "L", title: "Scissors → continue, left leg" }),
  C("STEPOVER", "NORMAL", "RUN", 45, { title: "Over the front of the ball toward the midline, then back out with the same foot" }),
  C("STEPOVER", "MIRROR", "RUN", -45, { foot: "L", title: "Stepover, left foot" }),
  C("DOUBLE_SCISSORS", "NORMAL", "JOG", 45, { dur: 3.0, title: "Sell one side, then the other, then go" }),
  // ── ELASTICO ──
  C("ELASTICO", "NORMAL", "JOG", -45, { title: "Outside cue, inside snap: the elastico" }),
  C("ELASTICO", "HIGH-SPEED", "RUN", -45, { title: "The elastico at a run" }),
  C("ELASTICO", "MIRROR", "JOG", 45, { foot: "L", title: "Elastico, left foot" }),
  C("ELASTICO", "REJECTED", "JOG", 45, { foot: "R", title: "REJECTED: a right-foot elastico asked to exit to the right (the wrong side)" }),
  C("REVERSE_ELASTICO", "NORMAL", "JOG", 45, { title: "Inside cue, outside snap: the reverse elastico" }),
  C("REVERSE_ELASTICO", "MIRROR", "JOG", -45, { foot: "L", title: "Reverse elastico, left foot" }),
  // ── PULL / PUSH / V ──
  C("V_PULL", "NORMAL", "JOG", -60, { title: "Reset under pressure: sole back, inside out across" }),
  C("V_PULL", "MIRROR", "JOG", 60, { foot: "L", title: "V-pull, left foot" }),
  C("PULL_PUSH", "NORMAL", "JOG", 0, { title: "Stop and relaunch: sole back, push forward again" }),
  // ── SPIN ──
  C("ROULETTE", "NORMAL", "JOG", -90, { title: "EXPERIMENTAL — drag back, spin with the back to the tackle, drag on" }),
  C("ROULETTE", "REJECTED", "SPRINT", -90, { runup: 3.0, title: "REJECTED: a roulette requested at full sprint" }),
  // ── HEEL / SPEED CHANGE ──
  C("HESITATION", "NORMAL", "RUN", 0, { title: "Check the stride, stall the body, then burst" }),
  C("HESITATION", "HIGH-SPEED", "SPRINT", 0, { runup: 3.0, title: "The hesitation at a sprint" }),
  // ── STOP / HESITATION ──
  C("DEADEN_EXPLODE", "NORMAL", "RUN", 0, { title: "Stop it dead under the sole, then explode" }),
  C("DEADEN_EXPLODE", "HIGH-SPEED", "SPRINT", 0, { runup: 3.0, title: "Deaden-and-explode from a sprint" }),
  C("FAKE_STOP", "NORMAL", "RUN", 0, { title: "Sell the stop without touching the ball, then explode" }),
  C("STOP", "NORMAL", "RUN", 0, { auto: true, stick: [[0, null, "RUN"]], dur: 2.0, title: "Stick released: the sole stop" }),
  // ── PROTECTION / SHIELD TURN ──
  C("SHIELD_ROLL", "NORMAL", "WALK", 75, { def: [0.6, -1.0], threat: -1, title: "A threat on the left: roll it away with the far foot, hip between" }),
  C("SHIELD_ROLL", "MIRROR", "WALK", -75, { foot: "L", def: [0.6, 1.0], threat: 1, title: "Shield roll, threat on the right" }),
  C("SHIELD_HOOK", "NORMAL", "JOG", -150, { req: "INSIDE_HOOK", def: [1.2, 0.8], threat: 1, title: "Turn away from a threat coming from the right (the inside hook)" }),
  C("SHIELD_OUTHOOK", "NORMAL", "JOG", 150, { req: "OUTSIDE_HOOK", def: [1.2, -0.8], threat: -1, title: "Turn away from a threat on the left (the outside hook)" }),
];
// ── THE CHAINS: techniques genuinely branched one into the next (the decisive contact, the branch, the next action's start are measured) ─────
const K = (name, mode, steps, o = {}) => Object.assign({ tech: "CHAIN", variant: "CHAIN", name, title: name, mode, ang: steps[0].ang, runup: 2.2, pre: 1.0, def: [3.0, 0], stick: steps.map((s) => [s.t, s.ang, s.mode || mode]), intents: steps.filter((s) => s.id).map((s) => ({ t: s.t, id: s.id, foot: s.foot || null })), dur: steps[steps.length - 1].t + 2.0 }, o);
export const CHAINS = [
  K("Body feint → outside cut", "RUN", [{ t: 0, ang: 0, id: "BODY_FEINT" }, { t: 0.30, ang: 45, id: "OUTSIDE_CUT" }]),
  K("Scissors → outside exit → sprint", "RUN", [{ t: 0, ang: -45, id: "SCISSORS" }, { t: 1.0, ang: -45, mode: "SPRINT" }]),
  K("Stepover → inside exit", "RUN", [{ t: 0, ang: 45, id: "STEPOVER" }, { t: 0.95, ang: -10 }]),
  K("Drag-back → croqueta", "JOG", [{ t: 0, ang: 180, id: "DRAG_BACK" }, { t: 1.05, ang: 145, id: "CROQUETA" }]),
  K("V-pull → 90° exit", "JOG", [{ t: 0, ang: -60, id: "V_PULL" }, { t: 0.85, ang: -100 }]),
  K("Ronaldo chop → accelerate", "RUN", [{ t: 0, ang: -90, id: "RONALDO_CHOP" }, { t: 0.9, ang: -90, mode: "SPRINT" }]),
  K("Cruyff → accelerate", "JOG", [{ t: 0, ang: -125, id: "CRUYFF" }, { t: 0.85, ang: -125, mode: "SPRINT" }]),
  K("Elastico → sprint", "JOG", [{ t: 0, ang: -45, id: "ELASTICO" }, { t: 0.95, ang: -45, mode: "SPRINT" }]),
  K("Knock-on → sprint → chop", "SPRINT", [{ t: 0, ang: 30, id: "KNOCK_ON" }, { t: 1.6, ang: -60, id: "RONALDO_CHOP", mode: "RUN" }], { runup: 2.6 }),
  K("Stop → feint → explode", "RUN", [{ t: 0, ang: 0, id: "DEADEN_EXPLODE" }, { t: 0.55, ang: 0, id: "BODY_FEINT" }, { t: 0.85, ang: 35, mode: "SPRINT" }]),
  K("Croqueta → accelerate → outside cut", "RUN", [{ t: 0, ang: 35, id: "CROQUETA" }, { t: 0.7, ang: 35, mode: "SPRINT" }, { t: 1.6, ang: 75, id: "OUTSIDE_CUT", mode: "SPRINT" }]),
  K("Matthews → sprint", "JOG", [{ t: 0, ang: 50, id: "MATTHEWS" }, { t: 1.0, ang: 50, mode: "SPRINT" }]),
];
// the stick heading (deg, relative to the run-up line) and mode at t (after the run-up); null = released
export function stickAt(c, t) { if (t < 0) return { ang: 0, mode: c.mode }; if (c.stick) { let s = c.stick[0]; for (const x of c.stick) if (t >= x[0]) s = x; return { ang: s[1], mode: s[2] || c.mode }; } return { ang: c.ang, mode: c.mode }; }
export const caseKey = (c) => `${c.tech}·${c.variant}·${c.name || c.title}`;
