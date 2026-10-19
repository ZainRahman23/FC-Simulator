// ═══ receive_moving1/rm1_cases.js — RECEIVE-MOVING-1 (QUEUE #2): moving-receive scenarios ═══════════════════════════════════════════════════════════
// RECEIVE-CONTROL-1.1's case geometry (receive1/rc1_cases.js: the passer's bearing relative to the run, the pass struck to lead the runner, the exit
// turn relative to the run) with the movement groups the owner names — STAND 0, WALK 1.5, JOG 3.0, RUN 5.5 (RUN-1's jog), SPRINT 7.8 (RUN-1's fast run),
// ALLOUT 9.5 — and a HARD pass. Case id: DIR_TURN[R|L]_RS_PS[_BC##] — e.g. RL_0_SPRINT_MED, F_90_RUN_FIRM_BC50.
import { DIRS, DIST_ADD } from "../receive1/rc1_cases.js";
import { exitTurn } from "../receive1/rc1_core.js";
import { mkWorld, DT } from "../receive_turn1/rk_sim.js";
const R = 0.11;
export const RS = { STAND: 0, WALK: 1.5, JOG: 3.0, RUN: 5.5, SPRINT: 7.8, ALLOUT: 9.5 };
// the pass, WEIGHTED FOR THE RUNNER: struck at t = 0 so that it arrives at the runner's projected position (his run at his pace) after tf s with the
// named arrival speed — the ball kernel itself solves the launch speed (a rolling pass: secant on the launch speed, as RECEIVE-KILL's solveIncoming)
export const PS = { SLOW: 5, NORMAL: 9, FIRM: 13, HARD: 17 };   // m/s at the receiver
export const TF = 1.4;                                          // s: the pass's flight to the meeting (seed variants shift it)
// a pass INTO HIS STRIDE (case suffix _IS): aimed LEAD_IS ahead of his projected position — at the stride touch's contact reach (RECEIVE-CONTROL-1.1's
// STRIDE contact, 0.40 – 0.42 m ahead of the body), where a runner plays it without checking his stride; the matrix's passes are aimed at his body
export const LEAD_IS = 0.42;
const rollMemo = new Map();
function rollTo(vA, tf) { const key = vA + "|" + tf; if (rollMemo.has(key)) return rollMemo.get(key); const K = Math.round(tf / DT);
  const run = (sp) => { const W = mkWorld([0, R, 0], [sp, 0, 0], [0, 0, -sp / R]); for (let i = 0; i < K; i++) W.step(); return { v: Math.hypot(W.ball.v[0], W.ball.v[2]), d: W.ball.p[0] }; };
  let a = vA + 0.8, b = vA + 6.0, fa = run(a).v - vA, fb = run(b).v - vA; for (let i = 0; i < 40 && Math.abs(fb) > 1e-11; i++) { const m = b - fb * (b - a) / (fb - fa); a = b; fa = fb; b = m; fb = run(b).v - vA; }
  const o = { s: b, d: run(b).d }; rollMemo.set(key, o); return o; }
export function makeCase(o) {
  const v = RS[o.rs || "RUN"], turn = exitTurn(((o.turn % 360) + 360) % 360, o.side || "R"), vA = PS[o.ps || "NORMAL"], tf = TF + 0.25 * (o.distAdd || 0);
  const P0 = [30, 34], lead = o.lead || 0, M = [P0[0] + v * tf + lead, P0[1]], bear = DIRS[o.dir] * Math.PI / 180, toPasser = [Math.cos(bear), Math.sin(bear)], u = [-toPasser[0], -toPasser[1]], r = rollTo(vA, tf);
  const O = [M[0] - u[0] * r.d, M[1] - u[1] * r.d], vk = [u[0] * r.s, 0, u[1] * r.s], launch = { p: [O[0], R, O[1]], v: vk, w: [vk[2] / R, 0, -vk[0] / R], mode: "ROLLING" };
  const pass = { from: DIRS[o.dir], dist: r.d, speed: r.s, lead: 1, off: [0, 0], aheadOfBody: lead };
  const exitV = o.exitV != null ? o.exitV : Math.max(v, 5.5), id = `${o.dir}_${Math.abs(o.turn)}${Math.abs(o.turn) === 180 ? o.side || "R" : o.turn < 0 ? "L" : ""}_${o.rs}_${o.ps}` + (lead ? "_IS" : "") + (o.bc != null ? "_BC" + o.bc : "");
  return { id, dir: o.dir, turn: o.turn, rs: o.rs, ps: o.ps, lead, bc: o.bc != null ? o.bc : null, wf: null, intent: "go", meet: { t: tf, P: M, vArrive: vA, launchSpeed: r.s, dist: r.d },
    scenario: { id, init: { v, heading: 0, pos: P0.slice() }, pass, launch, exit: { turn, v: exitV, intent: "go" }, dur: o.dur || 4.5 } };
}
export function parseCase(id) { const t = id.split("_"), [dir, ang, rs, ps] = t, bcT = t.find((x) => /^BC\d+$/.test(x)), turnAbs = parseInt(ang), side = /L$/.test(ang) ? "L" : "R";
  return makeCase({ dir, turn: side === "L" && turnAbs !== 180 ? -turnAbs : turnAbs, side, rs, ps, lead: t.includes("IS") ? LEAD_IS : 0, bc: bcT ? +bcT.slice(2) : undefined }); }
export const seedCase = (cs, seed) => (seed > 1 ? makeCase({ dir: cs.dir, turn: cs.turn, side: cs.turn === 180 ? "R" : undefined, rs: cs.rs, ps: cs.ps, lead: cs.lead, bc: cs.bc, distAdd: DIST_ADD[(seed - 1) % DIST_ADD.length] }) : cs);
// the representative movement matrix (the owner's §29): receiver × pass × turn, the pass from the side-rear (into the run) and from the front
export function matrix() { const out = [];
  for (const rs of ["STAND", "JOG", "RUN", "SPRINT"]) for (const ps of ["SLOW", "NORMAL", "FIRM", "HARD"]) for (const turn of [0, 30, 60, 90, 120, 150, 180]) for (const dir of ["RL", "L", "F"]) out.push(makeCase({ dir, turn, rs, ps }));
  return out; }
// the owner's critical manual cases (§30): A sprint receive into stride from behind · B running 30° · C running 60° · D running 90° · E running 120° ·
// F sprinting 180° · G poor Ball Control while sprinting · H BC 99 while sprinting (G / H: the same pass and draw)
export const CASES = [
  { id: "RL_0_SPRINT_NORMAL", tag: "A sprint receive into stride — pass from behind-left, exit straight on" },
  { id: "L_30_RUN_NORMAL", tag: "B running 30° receive" }, { id: "L_60_RUN_NORMAL", tag: "C running 60° receive" }, { id: "L_90_RUN_NORMAL", tag: "D running 90° receive" },
  { id: "L_120_RUN_NORMAL", tag: "E running 120° receive" }, { id: "F_180R_SPRINT_NORMAL", tag: "F sprinting 180° receive — a full reversal" },
  { id: "RL_0_SPRINT_FIRM_BC50", tag: "G poor Ball Control while sprinting (BC 50, firm pass)" }, { id: "RL_0_SPRINT_FIRM_BC99", tag: "H BC 99 while sprinting (the same pass and draw)" },
  { id: "RL_0_SPRINT_NORMAL_IS", tag: "A′ — case A with the pass into his stride (aimed 0.42 m ahead of his body)" }, { id: "L_30_RUN_NORMAL_IS", tag: "B′ — case B, the pass into his stride" },
  { id: "L_60_RUN_NORMAL_IS", tag: "C′ — case C, the pass into his stride" },
  { id: "RL_0_JOG_NORMAL", tag: "jog into stride" }, { id: "RL_90_SPRINT_NORMAL", tag: "sprint 90° (moving through-stance / open turn)" }, { id: "RL_0_STAND_NORMAL", tag: "standing receiver (RECEIVE-CONTROL-2, unchanged)" },
];
