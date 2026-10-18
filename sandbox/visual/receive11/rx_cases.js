// receive11/rx_cases.js — RECEIVE-CONTROL-1.1 scenarios. The RECEIVE-CONTROL-1 situations exactly (rc1_cases.js: pass direction, receiveTurnAngle,
// receiver speed, pass strength, the seed's pass-distance variant), plus the receive INTENT (go / kill / kill-and-go) and a Ball Control override
// for the calibration blocks. Case id: DIR_ANGLE[R|L]_RS_PS[_KILL | _KILLGO][_BC##] — e.g. F_240_RUN_MED, F_0_STAND_MED_KILL, F_240_RUN_MED_BC50.
import { DIRS, DIRNAME, RSPEED, PSPEED, ANGLES, DIST_ADD, makeCase as makeCase1, matrix as matrix1 } from "../receive1/rc1_cases.js";
export { DIRS, DIRNAME, RSPEED, PSPEED, ANGLES, DIST_ADD };
export function makeCase(o) {
  const c = makeCase1(o), sc = c.scenario;
  // (a kill is received at the feet: RECEIVE-CONTROL-1's rear passes are played 3 m into space ahead of the run — for a standing receiver who
  // wants to kill the ball that pass is unreachable by design; the kill blocks aim rear passes at his feet instead)
  if ((o.intent === "kill" || o.intent === "killgo") && Math.abs(DIRS[o.dir]) > 100) sc.pass = Object.assign({}, sc.pass, { off: [0.35, 0] });
  if (o.intent === "kill") { sc.exit = Object.assign({}, sc.exit, { v: 0, intent: "kill" }); }
  else if (o.intent === "killgo") { sc.exit = Object.assign({}, sc.exit, { v: 2.5, intent: "kill" }); }
  const id = c.id + (o.intent === "kill" ? "_KILL" : o.intent === "killgo" ? "_KILLGO" : "") + (o.bc != null ? "_BC" + o.bc : "");
  return Object.assign(c, { id, intent: o.intent || "go", bc: o.bc != null ? o.bc : null, scenario: Object.assign(sc, { id }) });
}
export function parseCase(id, o = {}) {
  const t = id.split("_"), [dir, ang, rs, ps] = t, angle = parseInt(ang), side = /L$/.test(ang) ? "L" : "R";
  const intent = t.includes("KILL") ? "kill" : t.includes("KILLGO") ? "killgo" : "go", bcT = t.find((x) => /^BC\d+$/.test(x)), bc = bcT ? +bcT.slice(2) : null;
  return makeCase(Object.assign({ dir, angle, side, rs, ps, intent, bc }, o));
}
export const seedCase = (cs, seed) => (seed > 1 ? makeCase({ dir: cs.dir, angle: cs.angle, side: cs.side, rs: cs.rs, ps: cs.ps, intent: cs.intent, bc: cs.bc, distAdd: DIST_ADD[(seed - 1) % DIST_ADD.length] }) : cs);
// the matrix of record: RECEIVE-CONTROL-1's 238 situations (A: every angle × every direction at RUN / MED; B: receiver × pass speeds on the
// cardinal exits from F / L / R; C: the 89/90 and 270/271 boundaries at JOG) — re-made with this file's makeCase (same situations, intent "go")
export function matrix(block) {
  if (block === "all" || block === "A" || block === "B" || block === "C") return matrix1(block).map((c) => makeCase({ dir: c.dir, angle: c.angle, side: c.side, rs: c.rs, ps: c.ps }));
  const out = [];
  // K — KILL: a standing receiver deadens the pass (and holds it), every direction × pass strength; KG — kill and go (set off at 2.5 m/s)
  if (block === "K") for (const d of Object.keys(DIRS)) for (const ps of Object.keys(PSPEED)) out.push(makeCase({ dir: d, angle: 0, rs: "STAND", ps, intent: "kill" }));
  if (block === "KG") for (const d of ["F", "FL", "FR", "L", "R"]) for (const a of [0, 90, 270]) out.push(makeCase({ dir: d, angle: a, rs: "STAND", ps: "MED", intent: "killgo" }));
  // BC — Ball Control calibration: representative situations (ordinary, 90°, 120°/240°, 180° from the main directions) at BC 99 … 40
  if (block === "BC") for (const bc of [99, 89, 80, 70, 60, 50, 40]) for (const [d, a, rs] of [["F", 0, "RUN"], ["L", 0, "RUN"], ["F", 90, "RUN"], ["F", 240, "RUN"], ["FR", 120, "RUN"], ["F", 180, "JOG"], ["R", 270, "FAST"], ["L", 45, "FAST"]])
    out.push(makeCase({ dir: d, angle: a, rs, ps: "MED", bc }));
  return out;
}
// the review's visual cases (the instruction's A–J), seed 1 unless given
export const VISUAL = [
  { id: "F_0_STAND_MED_KILL_BC99", tag: "A kill receive (BC 99)" },
  { id: "FL_0_RUN_MED_BC99", tag: "B touch into stride at 5.5 m/s (BC 99)" },
  { id: "F_90_RUN_MED_BC99", tag: "C 90° turning receive (BC 99)" },
  { id: "FR_135_RUN_MED_BC99", tag: "D 135° large turn — intermediate ball vector (BC 99)" },
  { id: "F_240_JOG_MED_BC99", tag: "E through-stance turn, 120° left, right-foot inside (BC 99)" },
  { id: "F_120_JOG_MED_BC99", tag: "F mirrored: 120° right, left-foot inside (BC 99)" },
  { id: "F_180R_JOG_MED_BC99", tag: "G 180° turn (BC 99)" },
  { id: "F_0_FAST_MED_BC99", tag: "H full throttle: 7.8 m/s in stride (BC 99)" },
  { id: "F_90_FAST_MED_BC99", tag: "H′ full throttle: 90° turn from 7.8 m/s (BC 99)" },
  { id: "FL_0_RUN_MED_BC50", tag: "I poor Ball Control (B's receive at BC 50)" },
  { id: "F_240_RUN_MED_BC45", seed: 4, tag: "J failed / heavy receive (E's action at running pace, BC 45, seed 4)" },
];
