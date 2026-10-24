// ═══ tackle1/t_cases.js — TACKLING LAB V1: THE DETERMINISTIC REVIEW CASES ═══════════════════════════════════════════════════════════════════════
// Each case = the attacker's CURATED case exactly as the Dribbling Lab runs it (v_cases.js, or a plain carry written the same way) + the
// defender's start (placed from the attacker's own deterministic path: `at` = [ahead, right] metres from where the attacker is at t = 0,
// facing `face`° from the attacker's heading — 180 = straight at him) + its scripted stick + the tackle request time(s). Nothing is scripted
// about the outcome: the label a case carries is what its run produced (tools/t_lab_cases.mjs prints and checks them).
import { CASES } from "../vocab2/v_cases.js";
const find = (tech, variant) => { const c = CASES.find((x) => x.tech === tech && x.variant === variant); if (!c) throw new Error(`case ${tech} · ${variant} missing`); return c; };
// a plain carry, written as the curated cases are (the run-up straight at `mode`, then the stick toward `ang`°; AUTO: B4 decides)
const carry = (mode, ang = 0, o = {}) => Object.assign({ tech: "CARRY", variant: `${mode}${ang ? " " + ang + "°" : ""}`, mode, ang, runup: 2.4, dur: 3.0, pre: 1.0, intents: [] }, o);
// the defender: at [ahead, right] from the attacker at t = 0, facing (180 = toward him) with a stick timeline relative to its own facing
export const D = (ahead, right, face = 180, o = {}) => Object.assign({ at: [ahead, right], face, stick: [] }, o);
// (the set-ups below were chosen from the sweeps in tools/ — t_moves.mjs, t_search.mjs and the cut sweep — as honest football geometry; the
// outcome each one shows is whatever its run produces: tools/t_lab_cases.mjs records them, nothing in a case names its result)
const jogCut = (at, ang) => carry("JOG", 0, { variant: `JOG · CUT ${ang}° AT ${at} s`, stick: [[0, 0, "JOG"], [at, ang, "JOG"]] });
export const TCASES = [
  // ── ORDINARY CARRY (the bodies kept apart: no player collision exists) ──
  { id: "carry-jog-l", group: "ORDINARY CARRY", name: "JOG CARRY · SET DEFENDER · HIS LEFT FOOT", c: carry("JOG"), def: D(4.4, -0.85, 180), tackle: [0.62] },
  { id: "carry-jog-r", group: "ORDINARY CARRY", name: "JOG CARRY · SET DEFENDER · HIS RIGHT FOOT", c: carry("JOG"), def: D(4.4, 1.0, 180), tackle: [0.62] },
  { id: "carry-jog-side", group: "ORDINARY CARRY", name: "JOG CARRY · SIDE-BIASED (facing across the path)", c: carry("JOG"), def: D(4.2, 1.15, -135), tackle: [0.60] },
  { id: "carry-walk", group: "ORDINARY CARRY", name: "WALK CARRY · SET DEFENDER", c: carry("WALK", 0, { runup: 2.2, dur: 3.4 }), def: D(3.0, -0.85, 180), tackle: [0.75] },
  { id: "carry-walk-def", group: "ORDINARY CARRY", name: "WALK CARRY · DEFENDER WALKING IN", c: carry("WALK", 0, { runup: 2.2, dur: 3.4 }), def: D(4.6, -0.9, 180, { stick: [[-0.5, 0, "WALK"], [0.9, null, "WALK"]] }), tackle: [0.45] },
  { id: "carry-jog-def", group: "ORDINARY CARRY", name: "JOG CARRY · DEFENDER JOGGING IN (3.2 m/s)", c: carry("JOG"), def: D(6.6, -0.9, 180, { stick: [[-0.6, 0, "JOG"], [0.45, null, "JOG"]] }), tackle: [0.22] },
  { id: "race", group: "ORDINARY CARRY", name: "JOG + CUT LEFT · SIDE-ON DEFENDER · THE RACE FOR THE POKED BALL", c: jogCut(0.55, -60), def: D(3.51, -0.89, 235), tackle: [0.606], note: "from the timing search (set-up #38, seed 7): the poke sends the ball away and both players chase it" },
  // ── STEERING / CUTS (the attacker's own B4 decisions) ──
  { id: "steer", group: "ATTACKER STEERING", name: "GENTLE STEERING (15° toward the defender's side)", c: carry("JOG", 0, { stick: [[0, 0, "JOG"], [0.3, 15, "JOG"]] }), def: D(4.4, 1.05, 180), tackle: [0.62] },
  { id: "cut", group: "ATTACKER STEERING", name: "SHARP CUT (60° at t = 0.40) AS THE TACKLE COMMITS", c: jogCut(0.40, 60), def: D(4.4, 0.85, 180), tackle: [0.55] },
  // ── THE APPROVED MOVES, UNCHANGED (their curated cases verbatim) ──
  { id: "bf-fake", group: "BODY FEINT", name: "BODY FEINT · DEFENDER ON THE FAKE SIDE, TACKLING INTO THE FAKE", c: find("BODY_FEINT_V2", "FAKE LEFT → RIGHT"), def: D(3.0, -1.0, 180), tackle: [0.20] },
  { id: "bf-exit", group: "BODY FEINT", name: "BODY FEINT · DEFENDER ON THE EXIT SIDE", c: find("BODY_FEINT_V2", "FAKE LEFT → RIGHT"), def: D(4.2, 1.0, 180), tackle: [0.60] },
  { id: "bf-early", group: "BODY FEINT", name: "BODY FEINT · TACKLE BEFORE THE FEINT", c: find("BODY_FEINT_V2", "FAKE LEFT → RIGHT"), def: D(2.4, -0.5, 180), tackle: [0.10] },
  { id: "croq", group: "LA CROQUETA", name: "LA CROQUETA · TACKLE AS THE TRANSFER STARTS", c: find("CROQUETA", "REF · JOG R → L"), def: D(3.0, -1.0, 180), tackle: [0.30] },
  { id: "croq-win", group: "LA CROQUETA", name: "LA CROQUETA · CLOSE DEFENDER, TACKLE AS IT STARTS (from the move sweep)", c: find("CROQUETA", "REF · JOG R → L"), def: D(2.4, -0.5, 180), tackle: [0.40], note: "from tools/t_moves.mjs (set-up 2.4 / −0.5 @ 0.4): the tackle meets the ball as the Croqueta starts; then the race for the loose ball" },
  { id: "croq-early", group: "LA CROQUETA", name: "LA CROQUETA · TACKLE BEFORE THE TRANSFER", c: find("CROQUETA", "REF · JOG R → L"), def: D(2.4, -1.0, 180), tackle: [0.20] },
  // ── MIRROR (the left-footed twin carries; the defender's other foot) ──
  { id: "mirror", group: "MIRROR", name: "MIRROR · LEFT-FOOTED CARRIER · HIS RIGHT FOOT", c: carry("JOG", 0, { pref: "L" }), def: D(4.4, 0.85, 180), tackle: [0.62] },
  { id: "mirror-l", group: "MIRROR", name: "MIRROR · LEFT-FOOTED CARRIER · HIS LEFT FOOT", c: carry("JOG", 0, { pref: "L" }), def: D(4.4, -1.0, 180), tackle: [0.62] },
  // ── DECLINES ──
  { id: "late", group: "DECLINES", name: "LATE REQUEST · THE BALL ALREADY PAST", c: carry("JOG"), def: D(4.4, -0.85, 180), tackle: [1.35] },
  { id: "early", group: "DECLINES", name: "EARLY REQUEST · OUT OF REACH UNTIL THE WINDOW CLOSES", c: carry("JOG"), def: D(6.5, -0.85, 180), tackle: [0.10] },
  { id: "run", group: "DECLINES", name: "RUNNING DEFENDER · OUTSIDE THE VALIDATED SPEEDS", c: carry("JOG"), def: D(9.5, -0.9, 180, { stick: [[-1.6, 0, "RUN"], [0.8, null, "RUN"]] }), tackle: [0.45] },
  { id: "notackle", group: "DECLINES", name: "NO REQUEST · THE SAME ENCOUNTER (reference)", c: carry("JOG"), def: D(4.4, -0.85, 180), tackle: [] }
];
