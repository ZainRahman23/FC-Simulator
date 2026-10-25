// ═══ occupy3/o3_cases.js — PLAYER IMPACT + BALANCE V1: the deterministic encounters (identical inputs for STAGE 2 and STAGE 3) ══════════════════
// O3CASES = Stage 2's review set (occupy2/o2_cases.js, unchanged). MATRIX = the owner's §16 test matrix: every row the owner listed, each with its
// mirror — Stage 2's own encounters where one already is that row (named again for the matrix), new ones placed from the moves' measured paths
// (tools/o3_paths: the Body Feint's decisive touch at +1.02 s, 2.8 m ahead, its exit 45° right; the Croqueta's decisive touch at +0.57 s, its
// receiving touch at +0.75 s, its exit 40° left). The format is Standing Tackle V1's (tackle1/t_cases.js): the defender placed from the attacker's
// own path ([ahead, right] m from where the attacker is at t = 0, facing `face`° from his heading — 180 = toward him), his scripted stick
// ([t, ° from his own facing, mode]), the tackle requests. No case names its result.
import { O2CASES } from "../occupy2/o2_cases.js";
import { mirrorCase } from "../occupy1/o_cases.js";
import { CASES } from "../vocab2/v_cases.js";
import { D } from "../tackle1/t_cases.js";
export const O3CASES = O2CASES.slice();
const find = (tech, variant) => CASES.find((x) => x.tech === tech && x.variant === variant), BF = () => find("BODY_FEINT_V2", "FAKE LEFT → RIGHT"), CQ = () => find("CROQUETA", "REF · JOG R → L");
const carry = (mode, o = {}) => Object.assign({ tech: "CARRY", variant: mode, mode, ang: 0, runup: 2.4, dur: 3.0, pre: 1.0, intents: [] }, o);
const old = (id, group, name) => Object.assign({}, O2CASES.find((x) => x.id === id), { group, name, from: id });
const ROWS = [
  // ── ORDINARY CONTACT ──
  { id: "walk-shoulder", group: "ORDINARY CONTACT", name: "WALKING SHOULDER CONTACT · side by side, the defender walking in at 30° (the soft wall keeps a slow drift apart)", c: carry("WALK", { runup: 2.2, dur: 4.0 }), def: D(1.0, 1.6, -30, { stick: [[0.0, 0, "WALK"]] }), tackle: [] },
  old("side", "ORDINARY CONTACT", "JOGGING SHOULDER CONTACT · side by side, the carrier leaning 6° in"),
  old("headon-jog", "ORDINARY CONTACT", "HEAD-ON APPROACH · both jog at each other"),
  { id: "oblique", group: "ORDINARY CONTACT", name: "OBLIQUE APPROACH · the defender jogs in at 45° across the carrier's line", c: carry("JOG", { dur: 3.5 }), def: D(5.5, 2.3, -135, { stick: [[0.0, 0, "JOG"]] }), tackle: [] },
  old("near-miss", "ORDINARY CONTACT", "PASS-BY NEAR MISS · jogging past each other, almost touching"),
  old("static-jog", "ORDINARY CONTACT", "ONE STATIONARY / ONE MOVING · the carrier jogs into a standing player"),
  old("cross", "ORDINARY CONTACT", "BOTH MOVING · the defender jogs across the carrier's line"),
  // ── BODY FEINT ──
  { id: "bf-past", group: "BODY FEINT", name: "BODY FEINT PAST A STATIONARY DEFENDER (in front, a little to the fake side)", c: BF(), def: D(3.7, -0.25, 180), tackle: [] },
  { id: "bf-shoulder", group: "BODY FEINT", name: "BODY FEINT · LIGHT SHOULDER CONTACT on the exit", c: BF(), def: D(3.65, 0.12, 180), tackle: [] },
  { id: "bf-step-in", group: "BODY FEINT", name: "BODY FEINT · THE DEFENDER STEPS INTO THE EXIT", c: BF(), def: D(3.9, -0.35, 180, { stick: [[0.95, -90, "JOG"]] }), tackle: [] },
  old("in-bf", "BODY FEINT", "BODY FEINT INTO A COMMITTED TACKLE"),
  old("bf-fake", "BODY FEINT", "TACKLE RECOVERING INTO THE FEINT (the defender on the fake side)"),
  // ── LA CROQUETA ──
  old("croq-close", "LA CROQUETA", "CROQUETA PAST A STATIONARY DEFENDER (contact between its touches)"),
  { id: "croq-hip", group: "LA CROQUETA", name: "CROQUETA · SHOULDER / HIP CONTACT across the defender", c: CQ(), def: D(2.45, -0.62, 180), tackle: [] },
  { id: "croq-leg", group: "LA CROQUETA", name: "CROQUETA · LEG CONTACT (the sweep beside the defender's legs)", c: CQ(), def: D(2.42, -0.22, 180), tackle: [] },
  old("croq-early", "LA CROQUETA", "CROQUETA INTO A COMMITTED TACKLE"),
  { id: "croq-before", group: "LA CROQUETA", name: "CROQUETA · CONTACT BEFORE THE FIRST TOUCH (a standing defender close in front)", c: CQ(), def: D(2.05, 0.10, 180), tackle: [] },
  { id: "croq-between", group: "LA CROQUETA", name: "CROQUETA · CONTACT BETWEEN THE TOUCHES", c: CQ(), def: D(2.35, -0.40, 180), tackle: [] },
  { id: "croq-after", group: "LA CROQUETA", name: "CROQUETA · CONTACT AFTER THE RECEIVING TOUCH (on its exit)", c: CQ(), def: D(2.85, -1.05, 180), tackle: [] },
  // ── STANDING TACKLE ──
  old("carry-jog-l", "STANDING TACKLE", "CLEAN BALL POKE · jog carry"),
  old("croq", "STANDING TACKLE", "TACKLE MISS · the Croqueta transfer takes the ball away"),
  old("carry-walk", "STANDING TACKLE", "TACKLE INTO THE CARRIER · walk carry, a set defender"),
  old("cut", "STANDING TACKLE", "TACKLE INTO A SHARP CUT (60° at 0.40 s)"),
  old("in-bf", "STANDING TACKLE", "TACKLE INTO A BODY FEINT"),
  old("in-croq", "STANDING TACKLE", "TACKLE INTO A CROQUETA"),
  old("both-committed", "STANDING TACKLE", "BOTH PLAYERS COMMITTED · the tackle into a Croqueta under way"),
];
// (a row listed twice in the owner's matrix — the tackle into a Body Feint is also "Body Feint into a committed tackle" — is run once, under both names)
const uniq = []; for (const r of ROWS) { const u = uniq.find((x) => x.id === r.id); if (u) { u.also = (u.also || []).concat(r.group + " · " + r.name); continue; } uniq.push(r); }
export const MATRIX = [...uniq, ...uniq.map((r) => Object.assign(mirrorCase(r), { group: r.group, matrixMirror: r.id }))];
