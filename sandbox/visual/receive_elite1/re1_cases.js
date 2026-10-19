// ═══ receive_elite1/re1_cases.js — RECEIVE-ELITE-1: the elite tight-control review set ═══════════════════════════════════════════════════════════
// The owner's §17 set — stationary 30 / 60 / 90 / 120 / 135 / 150 / 180, running 30 … 150 (+ sprinting 180), sprinting 0 … 180 — on the same passes
// the current pipeline was reviewed with: a standing receiver gets RECEIVE-TURN-1's solved ground pass (RECEIVE-CONTROL-2's cases, 12 m/s at the
// receiver, from the front); a moving receiver gets RECEIVE-MOVING-1's pass weighted for the runner (9 m/s at the meeting) — from the side for the
// angled turns, from behind for the straight sprint, from the front for the reversal. Ratings ride on the case: Ball Control / Dribbling / Agility.
// Case id: ST_<turn>[L]_V<ball> | <DIR>_<turn>[R|L]_<RS>_<PS>  [+ _B<bc>_D<dri>_A<agi>]   e.g. ST_180_V12, L_90_RUN_NORMAL_B99_D99_A99
import { incomingFor } from "../receive_turn1/rt_sim.js";
import { makeCase as makeMoving } from "../receive_moving1/rm1_cases.js";
const mir = (p) => [p[0], p[1], -p[2]], mirW = (w) => [-w[0], -w[1], w[2]], S0 = [40, 34];
export const ELITE = { bc: 99, dri: 99, agi: 99 };
export function stationaryCase(o) {
  const v = o.v || 12, turn = o.turn, sol = incomingFor({ v, lat: o.lat || 0 }).sol, L = sol.launch, id = `ST_${Math.abs(turn)}${turn < 0 ? "L" : ""}_V${v}`;
  return { id, kind: "stationary", turn, rs: "STAND", ps: "V" + v, scenario: { id, init: { v: 0, heading: 0, pos: S0.slice() }, pass: { from: 0, dist: 12, speed: v, lead: 1 }, launch: { p: mir(L.p), v: mir(L.v), w: mirW(L.w) }, exit: { turn, v: o.exitV || 5.5, intent: "go" }, dur: o.dur || 5.5 } };
}
export function movingCase(o) { const cs = makeMoving({ dir: o.dir, turn: o.turn, side: o.side, rs: o.rs, ps: o.ps || "NORMAL", lead: o.lead || 0, dur: o.dur || 5.5 });
  cs.kind = o.rs === "SPRINT" ? "sprint" : "running"; return cs; }
// a case id → the case (ratings parsed off the end)
export function parseCase(id) {
  const t = id.split("_"), rat = {}; let core = [];
  for (const x of t) { const m = /^([BDA])(\d+)$/.exec(x); if (m && core.length >= 2) rat[{ B: "bc", D: "dri", A: "agi" }[m[1]]] = +m[2]; else core.push(x); }
  let cs;
  if (core[0] === "ST") { const a = core[1], turn = (/L$/.test(a) ? -1 : 1) * parseInt(a); cs = stationaryCase({ turn, v: core[2] ? +core[2].slice(1) : 12 }); }
  else { const [dir, ang, rs, ps] = core, turnAbs = parseInt(ang), side = /L$/.test(ang) ? "L" : "R"; cs = movingCase({ dir, turn: side === "L" && turnAbs !== 180 ? -turnAbs : turnAbs, side, rs, ps, lead: core.includes("IS") ? 0.42 : 0 }); }
  cs.ratings = Object.assign({}, ELITE, rat); cs.base = cs.id; cs.id = cs.id + `_B${cs.ratings.bc}_D${cs.ratings.dri}_A${cs.ratings.agi}`; return cs;
}
export const withRatings = (cs, r) => parseCase(cs.base + `_B${r.bc}_D${r.dri}_A${r.agi}`);
// the owner's §17 lab set (and the §"required visual comparisons" priority subset)
export const SET = {
  stationary: [30, 60, 90, 120, 135, 150, 180].map((a) => `ST_${a}_V12`),
  running: [30, 60, 90, 120, 150].map((a) => `L_${a}_RUN_NORMAL`).concat(["F_180R_RUN_NORMAL"]),
  sprint: ["RL_0_SPRINT_NORMAL"].concat([30, 60, 90, 120, 150].map((a) => `L_${a}_SPRINT_NORMAL`), ["F_180R_SPRINT_NORMAL"]),
};
export const PRIORITY = ["ST_90_V12", "ST_135_V12", "ST_180_V12", "L_60_RUN_NORMAL", "L_90_RUN_NORMAL", "L_120_RUN_NORMAL", "L_150_RUN_NORMAL", "L_90_SPRINT_NORMAL", "L_120_SPRINT_NORMAL", "L_150_SPRINT_NORMAL", "F_180R_SPRINT_NORMAL"];
export const ALL = SET.stationary.concat(SET.running, SET.sprint);
