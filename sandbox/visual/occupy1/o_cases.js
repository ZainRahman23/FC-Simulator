// ═══ occupy1/o_cases.js — PLAYER OCCUPANCY V1 REVIEW: the deterministic encounters (identical inputs for OLD and OCCUPANCY V1) ════════════════
// The format is Standing Tackle V1's (tackle1/t_cases.js): the attacker's case (a plain carry or a curated move, run exactly as the Dribbling Lab
// runs it), the defender placed from the attacker's own path ([ahead, right] m from where the attacker is at t = 0, facing `face`° from his
// heading — 180 = toward him), the defender's scripted stick ([t, ° from his own facing, mode]; times from the attacker's t = 0, negative = during
// the run-up), the tackle requests. No case names its result. `mirror` = the mirrored world (tools/o_mirror: the defender mirrored too).
import { CASES } from "../vocab2/v_cases.js";
import { TCASES, D } from "../tackle1/t_cases.js";
import { PCASES } from "../possess1/p_cases.js";
const find = (tech, variant) => CASES.find((x) => x.tech === tech && x.variant === variant);
const carry = (mode, o = {}) => Object.assign({ tech: "CARRY", variant: mode, mode, ang: 0, runup: 2.4, dur: 3.0, pre: 1.0, intents: [] }, o);
const P = (id) => Object.assign({}, PCASES.find((x) => x.id === id));
export function mirrorCase(tc) { return Object.assign({}, tc, { id: tc.id + "-m", name: tc.name + " · MIRRORED", mirror: true, group: "MIRROR", def: Object.assign({}, tc.def, { at: [tc.def.at[0], -tc.def.at[1]], face: -tc.def.face, pref: tc.def.pref === "L" ? "R" : "L", stick: (tc.def.stick || []).map(([t, a, m]) => [t, a == null ? null : -a, m]), after: tc.def.after != null ? -tc.def.after : tc.def.after }) }); }
const BASE = [
  // ── CONVERGENCE (no tackle: the bodies meet by their own movement) ──
  { id: "static-walk", group: "CONVERGENCE", name: "STATIC BLOCKER · the carrier WALKS into a standing player", c: carry("WALK", { runup: 2.2, dur: 4.0 }), def: D(2.2, 0.0, 180), tackle: [] },
  { id: "static-jog", group: "CONVERGENCE", name: "STATIC BLOCKER · the carrier JOGS into a standing player", c: carry("JOG", { dur: 3.5 }), def: D(3.2, 0.0, 180), tackle: [] },
  { id: "headon-walk", group: "CONVERGENCE", name: "HEAD-ON WALK · both walk at each other", c: carry("WALK", { runup: 2.2, dur: 4.0 }), def: D(4.4, 0.0, 180, { stick: [[-0.2, 0, "WALK"]] }), tackle: [] },
  { id: "headon-jog", group: "CONVERGENCE", name: "HEAD-ON JOG · both jog at each other", c: carry("JOG", { dur: 3.5 }), def: D(7.2, 0.0, 180, { stick: [[-0.3, 0, "JOG"]] }), tackle: [] },
  { id: "face", group: "CONVERGENCE", name: "STANDING FACE-TO-FACE · the carrier walks up and stops against him", c: carry("WALK", { runup: 2.2, dur: 4.0, stick: [[0, 0, "WALK"], [1.1, null, "WALK"]] }), def: D(1.9, 0.1, 180), tackle: [] },
  { id: "side", group: "CONVERGENCE", name: "SIDE BY SIDE · jogging shoulder to shoulder (the carrier leaning 6° in)", c: carry("JOG", { dur: 4.0, stick: [[0, 6, "JOG"]] }), def: D(-6.0, 0.62, 0, { stick: [[-2.0, 0, "JOG"]] }), tackle: [] },
  { id: "cross", group: "CONVERGENCE", name: "CROSSING PATHS · the defender jogs across the carrier's line", c: carry("JOG", { dur: 3.5 }), def: D(4.3, 2.6, -90, { stick: [[0.4, 0, "JOG"]] }), tackle: [] },
  // ── NO DEADLOCK: paths that diverge again ──
  { id: "headon-one-away", group: "NO DEADLOCK", name: "HEAD-ON WALK · then the carrier turns away (60° at 1.6 s)", c: carry("WALK", { runup: 2.2, dur: 4.0, stick: [[0, 0, "WALK"], [1.6, 60, "WALK"]] }), def: D(4.4, 0.0, 180, { stick: [[-0.2, 0, "WALK"]] }), tackle: [] },
  { id: "headon-both-away", group: "NO DEADLOCK", name: "HEAD-ON WALK · then both turn away (60° each at 1.6 s)", c: carry("WALK", { runup: 2.2, dur: 4.0, stick: [[0, 0, "WALK"], [1.6, 60, "WALK"]] }), def: D(4.4, 0.0, 180, { stick: [[-0.2, 0, "WALK"], [1.6, 60, "WALK"]] }), tackle: [] },
  { id: "bf-into", group: "NO DEADLOCK", name: "BODY FEINT INTO A STANDING PLAYER (the carrier committed)", c: find("BODY_FEINT_V2", "FAKE LEFT → RIGHT"), def: D(2.2, 0.15, 180), tackle: [] },
  // ── THE LOOSE-BALL RACES AND THE TACKLES (Shared Possession + Reaction V1's cases, MEDIUM) ──
  Object.assign(P("race"), { group: "LOOSE BALL / TACKLE" }), Object.assign(P("croq-win"), { group: "LOOSE BALL / TACKLE" }), Object.assign(P("in-steer"), { group: "LOOSE BALL / TACKLE" }), Object.assign(P("carry-walk"), { group: "LOOSE BALL / TACKLE" }),
  Object.assign(P("carry-jog-l"), { group: "LOOSE BALL / TACKLE", name: "STANDING TACKLE · JOG CARRY (the clean contact)" }), Object.assign(P("carry-jog-def"), { group: "LOOSE BALL / TACKLE" }),
  Object.assign(P("cut"), { group: "LOOSE BALL / TACKLE", name: "STANDING TACKLE MISS · THE SHARP CUT" }), Object.assign(P("croq"), { group: "LOOSE BALL / TACKLE", name: "STANDING TACKLE MISS · LA CROQUETA" }),
  // ── THE APPROVED MOVES ──
  Object.assign(P("in-bf"), { group: "BODY FEINT" }), Object.assign(P("bf-exit"), { group: "BODY FEINT" }), Object.assign(P("bf-fake"), { group: "BODY FEINT" }),
  Object.assign(P("in-croq"), { group: "LA CROQUETA" }), Object.assign(P("croq-early"), { group: "LA CROQUETA" }),
  { id: "croq-close", group: "LA CROQUETA", name: "LA CROQUETA PAST A STANDING PLAYER (no tackle: the move around his body)", c: find("CROQUETA", "REF · JOG R → L"), def: D(2.6, -0.45, 180), tackle: [] },
  // ── BOTH COMMITTED ──
  Object.assign(P("croq-win"), { id: "both-committed", group: "NO DEADLOCK", name: "BOTH COMMITTED · the tackle into a Croqueta under way" })
];
export const OCASES = [...BASE, ...["headon-jog", "side", "cross", "carry-jog-l", "in-croq"].map((id) => mirrorCase(BASE.find((x) => x.id === id)))];
