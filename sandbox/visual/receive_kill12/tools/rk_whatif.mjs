// receive_kill12/tools/rk_whatif.mjs — WHAT-IF REMAP: the candidate machinery with alternative PCHIP knots (the CURRENT scale's error at g(BC)), same
// benchmark, metrics and keyed seeds as rk_three.mjs, so a what-if column is directly comparable with the three scales of record. Review evidence only:
// the candidate of record (rk_model.js knots) is untouched.
//   node rk_whatif.mjs <benchmark id> <nSeeds> <knots JSON> <label> <out.json>
import fs from "fs";
import { prepare, runBC, runEpisode, firstContact, drawsFor, now } from "../rk_sim.js";
import { BC_STEPS, setScale, relErr, gBC, RK } from "../rk_model.js";
import { THREE_BENCH } from "../rk_conditions.js";
const [id, nArg = "200", knotsArg, label, out] = process.argv.slice(2), nS = +nArg, B = THREE_BENCH.find((b) => b.id === id), knots = JSON.parse(knotsArg);
const q = (a, p) => { const s = a.filter((x) => x != null).sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : null; }, mean = (a) => { const s = a.filter((x) => x != null); return s.length ? s.reduce((t, x) => t + x, 0) / s.length : null; }, r4 = (x) => (x == null ? null : Math.round(x * 1e4) / 1e4);
function one(P, bc, spec) { const r1 = runBC(P, bc, drawsFor(Object.assign({ event: "kill1" }, spec)), { post: 2.2, every: 4 }), fc = firstContact(P, r1.ex, r1.run), ep = runEpisode(P, bc, spec, { every: 2 }), m = ep.m, aerial = P.plan.sf.S.group !== "FOOT";
  return { resid: fc.speed, velErr: fc.velErr, place: aerial ? fc.dropErr : fc["e2"], e025: fc["e0.25"], e05: fc["e0.5"], e1: fc["e1"], d2: r1.m.dStar, recDist: m.extraAdj, recTime: m.extraT, contacts: m.contacts, tStable: m.tStable, cls: m.continuation }; }
setScale("candidate"); const keep = RK.exec.knots; RK.exec.knots = knots;
const t0 = now(), P = prepare(B.cond), rows = [];
for (const bc of BC_STEPS) { const xs = []; for (let s = 1; s <= nS; s++) xs.push(one(P, bc, { seed: s }));
  const st = (k) => ({ med: r4(q(xs.map((x) => x[k]), 0.5)), mean: r4(mean(xs.map((x) => x[k]))), p90: r4(q(xs.map((x) => x[k]), 0.9)) }), cls = {};
  for (const c of ["IMMEDIATE", "ADJUSTED", "RECOVERY", "UNSTABLE"]) cls[c] = r4(xs.filter((x) => x.cls === c).length / nS);
  rows.push({ bc, E22: r4(relErr(bc, 2.2)), g: r4(gBC(bc)), D: r4(P.plan.dif.D), E: r4(relErr(bc, P.plan.dif.D)), resid: st("resid"), velErr: st("velErr"), place: st("place"), e025: st("e025"), e05: st("e05"), e1: st("e1"), d2: st("d2"), recDist: st("recDist"), recTime: st("recTime"), contacts: st("contacts"), tStable: st("tStable"), cls, surface: P.plan.sf.key }); }
RK.exec.knots = keep; fs.writeFileSync(out, JSON.stringify({ id, label, knots, nSeeds: nS, bc: BC_STEPS, rows, ms: now() - t0 })); console.log(id, label, "done", ((now() - t0) / 1000).toFixed(1), "s");
