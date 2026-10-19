// receive_turn1/tools/rt_matrix.mjs — PHASE 2 EVIDENCE: the stationary receive-and-turn matrix. One block per process:
//   MAIN[:SPEED[:R|L]]  every desired turn angle 0, ±15 … ±180 × pass SLOW 6 / NORMAL 12 / FIRM 18 m/s (the passer straight in front, the ball on the
//            receiver's line, a right-footed receiver, clean preparation) × BC 30 / 50 / 60 / 70 / 80 / 90 / 99 × N keyed seeds
//   MIRROR   a two-footed receiver, +θ and −θ, the same seeds: the left turn must be the right turn's exact mirror image
//   LATE     late preparation (0.30 / 0.45 s) at 90 … 180 (NORMAL): what the selection does when the body cannot open far
//   LINE     the ball's line 0.25 m left / right of the receiver at 60 / 90 / 135 / 180 (NORMAL)
//   FORCED   every family forced at every angle (NORMAL): its feasibility and its results — why the selection picks what it picks
// Per cell: the action chosen (family, foot, surface, variant, opening, contact time, D, ideal touch speed, reconnection time, the feasible set)
// and, per rating, the distribution of the continuation (class shares, touches, time to continuation, correction, lateness, placement error,
// direction / speed error of the touch).   node rt_matrix.mjs <block> <nSeeds> <out.json>
import fs from "fs";
import { prepareTurn, runTurn, FAMILY_ORDER, DEG } from "../rt_sim.js";
import { now } from "../rk_sim.js";
const [block = "MAIN", nArg = "200", out = "rt_matrix.json"] = process.argv.slice(2), nS = +nArg;
export const BCS = [30, 50, 60, 70, 80, 90, 99], ANG = [0, 15, 30, 45, 60, 75, 90, 105, 120, 135, 150, 165, 180], SPEEDS = { SLOW: 6, NORMAL: 12, FIRM: 18 };
const r4 = (x) => (x == null || !isFinite(x) ? null : Math.round(x * 1e4) / 1e4);
const quant = (a) => { const s = a.filter((x) => x != null && isFinite(x)).sort((x, y) => x - y), n = s.length; if (!n) return null; const q = (p) => s[Math.min(n - 1, Math.floor(p * n))];
  return { n, min: r4(s[0]), p10: r4(q(0.1)), p25: r4(q(0.25)), p50: r4(q(0.5)), p75: r4(q(0.75)), p90: r4(q(0.9)), max: r4(s[n - 1]), mean: r4(s.reduce((t, x) => t + x, 0) / n) }; };
const KEYS = ["tCont", "extraAdj", "extraT", "place", "contacts", "dirErrAbs", "speedErr", "offAbs"];
function cases() {
  const C = [];
  if (block.startsWith("MAIN")) for (const [sk, v] of Object.entries(SPEEDS)) { if (block.includes(":") && block.split(":")[1] !== sk) continue; for (const a of ANG) for (const sg of a === 0 ? [1] : [1, -1]) { if (block.split(":")[2] && ((block.split(":")[2] === "R") !== (sg > 0))) continue; C.push({ id: `${sk}_${sg * a}`, cond: { v, theta: sg * a } }); } }
  if (block === "MIRROR") for (const v of [6, 12, 18]) for (const a of ANG.slice(1)) for (const sg of [1, -1]) C.push({ id: `M${v}_${sg * a}`, cond: { v, theta: sg * a, pref: null } });
  if (block === "LATE") for (const prep of [0.3, 0.45]) for (const a of [90, 105, 120, 135, 150, 165, 180]) C.push({ id: `LATE${prep}_${a}`, cond: { v: 12, theta: a, prep } });
  if (block === "LINE") for (const lat of [-0.25, 0.25]) for (const a of [60, 90, 135, 180]) C.push({ id: `LINE${lat}_${a}`, cond: { v: 12, theta: a, lat } });
  if (block === "FORCED") for (const fam of FAMILY_ORDER) for (const a of ANG) C.push({ id: `F_${fam}_${a}`, cond: { v: 12, theta: a, family: fam } });
  return C;
}
const res = { block, nSeeds: nS, bcs: BCS, cells: {} }, t0 = now(), raw = {};
for (const c of cases()) {
  const tp = now(), P = prepareTurn(c.cond), tSel = now() - tp, A = P.A, cell = { cond: c.cond, selectMs: r4(tSel), ok: !A.none };
  if (A.none) { cell.rej = A.rej; cell.nEval = A.nEval; res.cells[c.id] = cell; continue; }
  Object.assign(cell, { fid: A.fid, F: A.F, surface: A.surface, vid: A.vid, psiC: r4(A.psiC / DEG), rotAfter: r4(A.dPsi / DEG), tContact: r4(A.k / 240), D: r4(A.D), Dk: r4(A.Dk), s0: r4(A.s0), tRec: r4(A.tRec), shift: r4(Math.hypot(A.S[0], A.S[1])), glance: r4(A.glance), touchOffExit: r4(Math.abs(((Math.atan2(A.dHat[1], A.dHat[0]) - A.theta) / DEG + 540) % 360 - 180)), nEval: A.nEval, nFeasible: A.nFeasible, cands: A.cands, bc: {} });
  raw[c.id] = {};
  for (const bc of BCS) { const xs = [], cpu = [];
    for (let s = 1; s <= nS; s++) { const e = runTurn(P, bc, { seed: s }, { every: 8, carry: false }), m = e.m; cpu.push(e.cpu.total);
      xs.push({ cls: m.cls, tCont: m.tCont, extraAdj: m.extraAdj, extraT: m.extraT, place: m.place, contacts: m.contacts, dirErrAbs: Math.abs(m.dirErrDeg), dirErr: m.dirErrDeg, speedErr: m.touchSpeedErr, offAbs: m.offLine == null ? null : Math.abs(m.offLine), v: e.ex.v, end: e.rec[e.rec.length - 1].p }); }
    raw[c.id][bc] = xs; const q = { cls: {} }; for (const k of KEYS) q[k] = quant(xs.map((x) => x[k]));
    for (const k of ["IMMEDIATE", "ADJUSTED", "RECOVERY", "UNSTABLE"]) q.cls[k] = r4(xs.filter((x) => x.cls === k).length / nS);
    q.cpuMs = quant(cpu); cell.bc[bc] = q; }
  const ideal = runTurn(P, 99, { example: "PERFECT" }, { every: 8, carry: false }); cell.ideal = { cls: ideal.m.cls, tCont: r4(ideal.m.tCont), extraAdj: r4(ideal.m.extraAdj) };
  res.cells[c.id] = cell;
}
// MIRROR: per seed, the left turn's results equal the right turn's, and its ball path is the mirror image (r → −r)
if (block === "MIRROR") { res.mirror = {}; for (const id of Object.keys(raw)) { if (!id.includes("_") || id.split("_")[1].startsWith("-")) continue; const [pre, a] = id.split("_"), L = raw[`${pre}_-${a}`], Rr = raw[id]; if (!L) continue; let n = 0, same = 0, mir = 0, maxDev = 0;
  for (const bc of BCS) for (let i = 0; i < nS; i++) { const x = Rr[bc][i], y = L[bc][i]; n++; if (x.cls === y.cls && x.contacts === y.contacts && x.tCont === y.tCont) same++; const d = Math.max(Math.abs(x.v[0] - y.v[0]), Math.abs(x.v[1] + y.v[1]), Math.abs(x.v[2] - y.v[2]), Math.abs(x.end[0] - y.end[0]), Math.abs(x.end[1] + y.end[1])); maxDev = Math.max(maxDev, d); if (d < 1e-9) mir++; }
  res.mirror[`${pre}_${a}`] = { runs: n, sameResult: same, mirroredExactly: mir, maxDev, families: [res.cells[id].fid + " " + res.cells[id].F, res.cells[`${pre}_-${a}`].fid + " " + res.cells[`${pre}_-${a}`].F] }; } }
res.ms = now() - t0; fs.writeFileSync(out, JSON.stringify(res)); console.log(block, "done", Object.keys(res.cells).length, "cells", (res.ms / 1000).toFixed(1), "s");
