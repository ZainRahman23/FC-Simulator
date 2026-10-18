// receive1/tools/rc1_cases.mjs — RECEIVE-CONTROL-1 test scenarios: a pass struck at t = 0 to a receiver at a given speed, and the exit he wants
// (receiveTurnAngle relative to his facing when the pass is played). Pass DIRECTION = where the pass comes FROM (the passer's bearing, + right):
// FRONT 0 · FRONT-RIGHT 45 · RIGHT 90 · REAR-RIGHT 135 · REAR-LEFT −135 · LEFT −90 · FRONT-LEFT −45. Pass SPEEDS are set by the strike speed and
// distance (BALL-FEEL-1.3's free roll decelerates ≈ 3.4 m/s²); the arrival speed of each case is measured, not assumed.
import { exitTurn } from "../rc1_core.js";
export const DIRS = { F: 0, FR: 45, R: 90, RR: 135, RL: -135, L: -90, FL: -45 };
export const DIRNAME = { F: "front", FR: "front-right", R: "right", RR: "rear-right", RL: "rear-left", L: "left", FL: "front-left" };
export const RSPEED = { STAND: 0, JOG: 3.0, RUN: 5.5, FAST: 7.8 };
// pass strength: { dist, speed } — SOFT ≈ 5 m/s, MED ≈ 7 m/s, FIRM ≈ 9–10 m/s at the receiver. A REAR pass is a ball played into space: aimed
// `ahead` m in front of where the runner's run takes him (a pass from behind that reaches the runner himself overtakes him faster than he runs —
// no boot surface can face it), struck from closer
export const PSPEED = { SOFT: { dist: 12, speed: 9.5 }, MED: { dist: 14, speed: 12 }, FIRM: { dist: 14, speed: 14.5 } };
const rearK = (dir) => (Math.abs(DIRS[dir]) > 100 ? { dist: 9, add: 1, ahead: 3.0 } : null);
export const ANGLES = [0, 45, 89, 90, 120, 135, 180, 225, 240, 270, 271, 315];
export function makeCase(o) {
  // o: { dir, angle (receiveTurnAngle 0–360), side ("R" | "L" for 180), rs (receiver speed key), ps (pass strength key), exitV?, dur? }
  const ps = PSPEED[o.ps || "MED"], rk = rearK(o.dir), v = RSPEED[o.rs || "RUN"];
  const pass = { from: DIRS[o.dir], dist: rk ? rk.dist : ps.dist, speed: ps.speed + (rk ? rk.add : 0), lead: o.lead != null ? o.lead : 1, off: rk ? [rk.ahead, 0] : [0, 0] };
  const exit = { turn: exitTurn(o.angle, o.side || "R"), v: o.exitV != null ? o.exitV : Math.max(v, 5.5) };   // (full throttle: at least RUN pace out)
  const id = `${o.dir}_${o.angle}${o.angle === 180 ? o.side || "R" : ""}_${o.rs || "RUN"}_${o.ps || "MED"}`;
  return { id, dir: o.dir, angle: o.angle, side: o.side || null, rs: o.rs || "RUN", ps: o.ps || "MED", scenario: { id, init: { v, heading: 0, pos: [30, 34] }, pass, exit, dur: o.dur || 4.0 } };
}
// the representative matrix (not the Cartesian product): A — every turn angle × every pass direction at RUN / MED; B — the speeds (receiver ×
// pass) on the four cardinal exits from the three main pass directions; C — the boundary pairs 89/90 and 270/271 from every direction at JOG
export function matrix(block) {
  const out = [];
  if (block === "A" || block === "all") for (const a of ANGLES) for (const d of Object.keys(DIRS)) out.push(makeCase({ dir: d, angle: a, rs: "RUN", ps: "MED" }));
  if (block === "B" || block === "all") for (const a of [0, 90, 180, 270]) for (const d of ["F", "L", "R"]) for (const rs of Object.keys(RSPEED)) for (const ps of Object.keys(PSPEED)) { if (rs === "RUN" && ps === "MED") continue; out.push(makeCase({ dir: d, angle: a, rs, ps })); }
  if (block === "C" || block === "all") for (const a of [89, 90, 270, 271]) for (const d of Object.keys(DIRS)) { if (block === "all" && (a === 90 || a === 270) && ["F", "L", "R"].includes(d)) continue; out.push(makeCase({ dir: d, angle: a, rs: "JOG", ps: "MED" })); }   // (in "all", without B's duplicates)
  return out;
}
