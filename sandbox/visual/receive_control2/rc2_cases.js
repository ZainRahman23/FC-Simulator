// ═══ receive_control2/rc2_cases.js — RECEIVE-CONTROL-2: the integrated review cases (the owner's A–M) ══════════════════════════════════════════════
// A standing receiver at RECEIVE-KILL's stance (pitch 40, 34) facing the passer (+x). Every pass is RECEIVE-TURN-1's / RECEIVE-KILL's own solved
// pass for the condition (the same ball the stand-alone evidence used), struck at t = 0; the intent sets the exit (turn, deg, + right; pace) or a
// kill and hold. Case id: <letter>[_BC##] — e.g. "D", "D_BC50". RECEIVE-CONTROL-1.1's own cases (DIR_ANGLE_RS_PS…) are accepted too.
import { incomingFor } from "../receive_turn1/rt_sim.js";
import { solveIncoming } from "../receive_turn1/rk_sim.js";
import { parseCase as parseCase11 } from "../receive11/rx_cases.js";
const mir = (p) => [p[0], p[1], -p[2]], mirW = (w) => [-w[0], -w[1], w[2]], S0 = [40, 34];
export const CASES = [
  { id: "A", tag: "A ordinary ground kill — 12 m/s, kill and hold", ball: { v: 12 }, exit: { turn: 0, v: 0, intent: "kill" } },
  { id: "B", tag: "B ground directional receive — 12 m/s, out at 30°", ball: { v: 12 }, exit: { turn: 30, v: 5.5, intent: "go" } },
  { id: "C", tag: "C 60° receive — 12 m/s", ball: { v: 12 }, exit: { turn: 60, v: 5.5, intent: "go" } },
  { id: "D", tag: "D 90° half-turn — 12 m/s", ball: { v: 12 }, exit: { turn: 90, v: 5.5, intent: "go" } },
  { id: "E", tag: "E 120° turn — 12 m/s", ball: { v: 12 }, exit: { turn: 120, v: 5.5, intent: "go" } },
  { id: "F", tag: "F 135° large turn — 12 m/s", ball: { v: 12 }, exit: { turn: 135, v: 5.5, intent: "go" } },
  { id: "G", tag: "G 150° through-stance — 12 m/s", ball: { v: 12 }, exit: { turn: 150, v: 5.5, intent: "go" } },
  { id: "H", tag: "H 180° through-stance — 12 m/s", ball: { v: 12 }, exit: { turn: 180, v: 5.5, intent: "go" } },
  { id: "I", tag: "I thigh → foot — 6 m/s dropping 35° at 0.95 m, control and hold", ball: { v: 6, drop: 35, h: 0.95, kill: true }, exit: { turn: 0, v: 0, intent: "kill" } },
  { id: "J", tag: "J chest → foot — 8 m/s dropping 20° at 1.32 m, control and hold", ball: { v: 8, drop: 20, h: 1.32, kill: true }, exit: { turn: 0, v: 0, intent: "kill" } },
  { id: "K", tag: "K head → follow-up — 6 m/s dropping 15° at 1.78 m, control and hold", ball: { v: 6, drop: 15, h: 1.78, kill: true }, exit: { turn: 0, v: 0, intent: "kill" } },
  { id: "L", tag: "L poor / heavy receive — a firm 18 m/s pass, 90° half-turn, BC 50", ball: { v: 18 }, exit: { turn: 90, v: 5.5, intent: "go" }, bc: 50 },
  { id: "M", tag: "M receive → DRIBBLE-V1 continuation — 12 m/s, 90° half-turn, 7 s", ball: { v: 12 }, exit: { turn: 90, v: 5.5, intent: "go" }, dur: 7.0 },
  { id: "I2", tag: "I′ thigh → foot → set off at 90° (a control episode with a go intent)", ball: { v: 6, drop: 35, h: 0.95, kill: true }, exit: { turn: 90, v: 5.5, intent: "go" } },
  { id: "A2", tag: "A′ kill and go — 12 m/s, killed, then away at 0°", ball: { v: 12 }, exit: { turn: 0, v: 5.5, intent: "kill", go: true } },
];
// the pass's exact launch (kernel frame): RECEIVE-TURN-1's ground pass for a turn / directional receive, RECEIVE-KILL's solved pass for a kill / aerial
function launchFor(ball) { const sol = ball.kill || ball.h != null ? solveIncoming({ v: ball.v, drop: ball.drop || 0, h: ball.h, bear: ball.bear || 0, lat: ball.lat || 0 }) : incomingFor({ v: ball.v, lat: ball.lat || 0 }).sol, L = sol.launch;
  return { p: mir(L.p), v: mir(L.v), w: mirW(L.w) }; }
export function makeCase(c, o = {}) {
  const bc = o.bc != null ? o.bc : c.bc != null ? c.bc : 99, id = c.id + (o.bc != null ? "_BC" + o.bc : "");
  const exit = Object.assign({}, c.exit); if (exit.go) { exit.intent = "kill"; exit.v = exit.v || 5.5; delete exit.go; }
  return { id, tag: c.tag, bc, wf: null, intent: exit.intent, scenario: { id, init: { v: 0, heading: 0, pos: S0.slice() }, pass: { from: 0, dist: 12, speed: c.ball.v, lead: 1 }, launch: launchFor(c.ball), exit, dur: o.dur || c.dur || 4.5 } };
}
export function parseCase(id) {
  const m = /^([A-M]2?)(?:_BC(\d+))?$/.exec(id); if (!m) return parseCase11(id);
  const c = CASES.find((x) => x.id === m[1]); if (!c) throw new Error("unknown case " + id); return makeCase(c, { bc: m[2] != null ? +m[2] : undefined });
}
