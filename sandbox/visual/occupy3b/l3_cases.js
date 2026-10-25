// ═══ occupy3b/l3_cases.js — STAGE 3B.1: THE CONTACT MATRIX (identical inputs for STAGE 2 · OLD STAGE 3 · STAGE 3B) ═════════════════════════════
// The owner's §10 matrix: Stage 3's own §16 matrix (occupy3/o3_cases.js, 26 rows + mirrors: side-by-side, oblique, head-on, one standing, crossing,
// every Body Feint / Croqueta / Standing Tackle row), Stage 2's ordinary rows it did not repeat (overtaking, glancing, turning into each other,
// walking into a standing player, walking head-on), side by side at a WALK and a RUN, the Croqueta into a Standing Tackle's recovery, and a
// CROSSING SWEEP — the defender crossing the carrier's line at 30 … 150° at a JOG and a RUN, his line through the carrier's or 0.35 m to its
// side — each with its mirror. The format is Standing Tackle V1's (tackle1/t_cases.js); no case names its result (whatever its run produces).
import { MATRIX } from "../occupy3/o3_cases.js";
import { O2CASES } from "../occupy2/o2_cases.js";
import { OCASES, mirrorCase } from "../occupy1/o_cases.js";
import { CASES } from "../vocab2/v_cases.js";
import { D } from "../tackle1/t_cases.js";
const carry = (mode, o = {}) => Object.assign({ tech: "CARRY", variant: mode, mode, ang: 0, runup: 2.4, dur: 3.0, pre: 1.0, intents: [] }, o);
const CQ = () => CASES.find((x) => x.tech === "CROQUETA" && x.variant === "REF · JOG R → L");
const from = (L, id, group, name) => Object.assign({}, L.find((x) => x.id === id), { group, name, from: id });
const V = { WALK: 1.4, JOG: 3.2, RUN: 5.6 };
// (the crossing sweep: the two lines meet 1.2 s after t = 0, 3.8 m ahead of the carrier; the defender placed back along his own line — heading
// `face`° from the carrier's (0 = the same way, ± = toward the carrier's right / left), its speed his mode's — and `off` m to the side)
const cross = (face, mode, off) => { const f = face * Math.PI / 180, tm = 1.2, M = [V.JOG * tm, off], v = V[mode]; const at = [M[0] - Math.cos(f) * v * tm, M[1] - Math.sin(f) * v * tm];
  return { id: `x${Math.abs(face)}-${mode.toLowerCase()}${off ? "-off" : ""}`, group: "CROSSING SWEEP", name: `CROSSING · the defender ${mode === "RUN" ? "runs" : "jogs"} across the carrier's line at ${180 - Math.abs(face)}°${off ? ", his line 0.35 m aside" : ""}`, c: carry("JOG", { dur: 3.2 }), def: D(+at[0].toFixed(3), +at[1].toFixed(3), face, { stick: [[0.0, 0, mode]] }), tackle: [] }; };
const ROWS = [
  from(O2CASES, "overtake", "ORDINARY CONTACT", "OVERTAKING · a running player passes the jogging carrier shoulder to shoulder"),
  from(O2CASES, "glance", "ORDINARY CONTACT", "GLANCING HEAD-ON · jogging past each other shoulder to shoulder"),
  from(O2CASES, "turn-into", "ORDINARY CONTACT", "TURNING INTO EACH OTHER · both turn toward the other at 0.5 s"),
  from(OCASES, "static-walk", "MOVING LEG · PLANTED LEG", "ONE STANDING · the carrier WALKS into a standing player"),
  from(OCASES, "headon-walk", "ORDINARY CONTACT", "HEAD-ON · both walk at each other"),
  // (side by side at a WALK and a RUN: the defender placed more than 1.5 m from the carrier's path while he waits — nearer, the canonical defender
  // reacts to the carrier before his stick starts — and setting off as the carrier draws level: level within 0.1 m, then the carrier leans in)
  { id: "side-walk", group: "SIDE BY SIDE", name: "SIDE BY SIDE · walking level, 1.0 m apart, the carrier leaning 6° in", c: carry("WALK", { runup: 2.2, dur: 4.0, stick: [[0, 6, "WALK"]] }), def: D(-1.4, 1.0, 0, { stick: [[-1.05, 0, "WALK"]] }), tackle: [] },
  { id: "side-run", group: "SIDE BY SIDE", name: "SIDE BY SIDE · running level, 1.1 m apart, the carrier leaning 6° in", c: carry("RUN", { dur: 3.0, stick: [[0, 6, "RUN"]] }), def: D(-9.0, 1.1, 0, { stick: [[-1.95, 0, "JOG"], [-1.65, 0, "RUN"]] }), tackle: [] },
  // (the two rows first built as side by side, kept as what they are: the defender reacted to the carrier before setting off)
  { id: "walk-behind", group: "ORDINARY CONTACT", name: "WALKING 0.7 m BEHIND · the defender sets off late and walks behind the carrier's shoulder", c: carry("WALK", { runup: 2.2, dur: 4.0, stick: [[0, 6, "WALK"]] }), def: D(-3.0, 0.62, 0, { stick: [[-1.6, 0, "WALK"]] }), tackle: [] },
  { id: "run-past", group: "ORDINARY CONTACT", name: "RUNNING PAST A DEFENDER STILL TURNING · he sets off as the carrier arrives: a glancing crossing", c: carry("RUN", { dur: 3.0, stick: [[0, 6, "RUN"]] }), def: D(-9.0, 0.62, 0, { stick: [[-2.0, 0, "RUN"]] }), tackle: [] },
  { id: "croq-recover", group: "LA CROQUETA", name: "CROQUETA · A STANDING TACKLE RECOVERING ACROSS ITS EXIT (the defender tackled early on the exit side)", c: CQ(), def: D(2.6, -0.9, 180), tackle: [0.05] },
  { id: "croq-recover2", group: "LA CROQUETA", name: "CROQUETA · A STANDING TACKLE RECOVERING IN FRONT (tackled early, a little to the exit side)", c: CQ(), def: D(2.8, -0.5, 180), tackle: [0.0] },
  ...[-150, -120, -90, -60, -30].flatMap((face) => ["JOG", "RUN"].flatMap((mode) => [cross(face, mode, 0), cross(face, mode, 0.35)])),
];
const extra = [...ROWS, ...ROWS.map((r) => Object.assign(mirrorCase(r), { group: r.group, matrixMirror: r.id }))];
export const L3CASES = [...MATRIX, ...extra];
export const FLAGSHIP = "side";   // (the audit's failure: equal-speed side by side, a thigh brush, the bodies closing at ≈ 0.20 m/s — Stage 3's 13.1 N·s, 14 cm lead)
