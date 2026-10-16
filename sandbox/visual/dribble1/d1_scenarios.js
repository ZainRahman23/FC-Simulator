// ═══ dribble1/d1_scenarios.js — DRIBBLE-1 lab scenarios: deterministic gameplay inputs (direction / speed requests over time) + the ball's start ═══
// Speeds follow the owner's dribble matrix on TURN-1.2's envelope: JOG 3.0 · RUN 5.5 · FAST 7.8 · SPRINT 9.5 m/s. Heading 0 = across the Touchline
// camera (left → right); + turn = right (toward the camera). The ball starts ahead of the runner, rolling a little slower than him: he approaches it
// and makes the first touch. Turn values are absolute (relative to the initial heading), as in TURN-1's scenarios.
export const SPEEDS = { JOG: 3.0, RUN: 5.5, FAST: 7.8, SPRINT: 9.5 };
const BALL0 = { JOG: { ahead: 1.6, speed: 1.35 }, RUN: { ahead: 1.4, speed: 3.0 }, FAST: { ahead: 2.6, speed: 5.85 }, SPRINT: { ahead: 3.0, speed: 7.4 } };
const base = (sp, extra) => Object.assign({ v: SPEEDS[sp], init: { v: SPEEDS[sp], heading: 0, pos: [12, 34] }, ball: BALL0[sp], cmds: [], dur: 8 }, extra);
export const SCN = {};
const add = (id, label, sp, extra) => { SCN[id] = Object.assign(base(sp, extra), { id, label, group: extra.group, speed: sp }); };
for (const sp of Object.keys(SPEEDS)) add(`STRAIGHT_${sp}`, `${sp} ${SPEEDS[sp]} m/s · straight`, sp, { group: "STRAIGHT", dur: 8 });
add("CURVE_RUN", "RUN 5.5 · gentle steering 20° right, then 20° left", "RUN", { group: "CURVE", cmds: [{ t: 1.8, turn: 20 }, { t: 3.6, turn: -5 }, { t: 5.4, turn: 15 }], dur: 8 });
add("CURVE_JOG", "JOG 3.0 · gentle steering ±25°", "JOG", { group: "CURVE", cmds: [{ t: 1.6, turn: 25 }, { t: 3.6, turn: -10 }], dur: 7 });
add("CUT45_RUN", "RUN 5.5 · 45° cut right", "RUN", { group: "CUT", cmds: [{ t: 2.2, turn: 45 }], dur: 6 });
add("CUT60_RUN", "RUN 5.5 · 60° cut right", "RUN", { group: "CUT", cmds: [{ t: 2.2, turn: 60 }], dur: 6 });
add("CUT60L_RUN", "RUN 5.5 · 60° cut left", "RUN", { group: "CUT", cmds: [{ t: 2.2, turn: -60 }], dur: 6 });
add("CUT90_RUN", "RUN 5.5 · 90° side-step cut right (hero)", "RUN", { group: "CUT", cmds: [{ t: 2.2, turn: 90 }], dur: 6 });
add("CUT90_JOG", "JOG 3.0 · 90° cut right", "JOG", { group: "CUT", cmds: [{ t: 2.0, turn: 90 }], dur: 6 });
add("CUT90L_RUN", "RUN 5.5 · 90° cut left", "RUN", { group: "CUT", cmds: [{ t: 2.2, turn: -90 }], dur: 6 });
add("REV135_RUN", "RUN 5.5 · 135° turn right (experimental)", "RUN", { group: "REVERSAL", cmds: [{ t: 2.2, turn: 135 }], dur: 6 });
add("REV180_SPRINT", "SPRINT 9.5 · 180° reversal (experimental)", "SPRINT", { group: "REVERSAL", cmds: [{ t: 2.4, turn: 180 }], dur: 7 });
add("CANCEL_RUN", "RUN 5.5 · 90° cut requested, cancelled before the touch", "RUN", { group: "INPUT", cmds: [{ t: 2.2, turn: 90 }, { t: 2.3, turn: 0 }], dur: 6 });
add("RETARGET_RUN", "RUN 5.5 · cut right requested, changed to left before commitment", "RUN", { group: "INPUT", cmds: [{ t: 2.2, turn: 60 }, { t: 2.32, turn: -60 }], dur: 6 });
add("INTERCEPT_RUN", "RUN 5.5 · a defender's leg sweeps across the ball between touches", "RUN", { group: "INTERRUPTION", dur: 6, fixture: "SWEEP" });
add("TACKLE_RUN", "RUN 5.5 · a sliding tackle leg knocks the ball loose", "RUN", { group: "INTERRUPTION", dur: 6, fixture: "SLIDE" });
export const list = () => Object.values(SCN);
export const get = (id) => SCN[id] || SCN.STRAIGHT_RUN;
