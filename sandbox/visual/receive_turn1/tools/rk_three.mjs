// receive_kill12/tools/rk_three.mjs — THE SCALES on the same machinery (ORIGINAL RECEIVE-KILL-1 · CURRENT RECEIVE-KILL-1.1 · 1.2 A · 1.2 B = the candidate), one
// benchmark per process, every rating of BC_STEPS (incl. 75), N keyed seeds (the SAME draws in every scale and rating):
//   first contact  immediate residual velocity, velocity error, placement error (aerial: drop point; ground: where the touch leaves the ball, 2 s),
//                  position error vs the ideal ball at 0.25 / 0.50 / 1.0 s, the legacy 2-s distance
//   episode        recovery distance (extra adjustment vs the ideal episode), recovery time (extra time to stable control), contacts, stable time,
//                  continuation shares
//   anchors        per seed, matched, for each 1.2 scale: NEW BC 75 vs CURRENT BC 50, NEW BC 50 vs CURRENT BC 40
//   node rk_three.mjs <benchmark id> <nSeeds> <out.json> [scales comma, default original,current,A,B]
// (RECEIVE-KILL-1.2's first round ran original,current,candidate with the candidate = A: evidence rk12_three_scales.json)
import fs from "fs";
import { prepare, runBC, runEpisode, firstContact, drawsFor, now } from "../rk_sim.js";
import { BC_STEPS, SCALES, CANDIDATE, setScale, relErr, gBC } from "../rk_model.js";
import { THREE_BENCH } from "../rk_conditions.js";
const [id, nArg = "200", out, scArg = "original,current,A,B"] = process.argv.slice(2), nS = +nArg, B = THREE_BENCH.find((b) => b.id === id), SC = scArg.split(","), REMAP = SC.filter((sc) => SCALES[sc].exec.curve === "remap");
const q = (a, p) => { const s = a.filter((x) => x != null).sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : null; }, mean = (a) => { const s = a.filter((x) => x != null); return s.length ? s.reduce((t, x) => t + x, 0) / s.length : null; }, r4 = (x) => (x == null ? null : Math.round(x * 1e4) / 1e4);
function one(P, bc, spec) { const r1 = runBC(P, bc, drawsFor(Object.assign({ event: "kill1" }, spec)), { post: 2.2, every: 4 }), fc = firstContact(P, r1.ex, r1.run), ep = runEpisode(P, bc, spec, { every: 2 }), m = ep.m, aerial = P.plan.sf.S.group !== "FOOT";
  return { resid: fc.speed, velErr: fc.velErr, place: aerial ? fc.dropErr : fc["e2"], e025: fc["e0.25"], e05: fc["e0.5"], e1: fc["e1"], d2: r1.m.dStar, recDist: m.extraAdj, recTime: m.extraT, contacts: m.contacts, tStable: m.tStable, cls: m.continuation }; }
const res = { id, title: B.title, cond: B.cond, nSeeds: nS, bc: BC_STEPS, candidate: CANDIDATE, scales: {}, anchors: {} }, t0 = now(), raw = {};
for (const sc of SC) {
  setScale(sc); const P = prepare(B.cond); raw[sc] = {}; const rows = [];
  for (const bc of BC_STEPS) { const xs = []; for (let s = 1; s <= nS; s++) xs.push(one(P, bc, { seed: s })); raw[sc][bc] = xs;
    const st = (k) => ({ med: r4(q(xs.map((x) => x[k]), 0.5)), mean: r4(mean(xs.map((x) => x[k]))), p90: r4(q(xs.map((x) => x[k]), 0.9)) }), cls = {};
    for (const c of ["IMMEDIATE", "ADJUSTED", "RECOVERY", "UNSTABLE"]) cls[c] = r4(xs.filter((x) => x.cls === c).length / nS);
    rows.push({ bc, E22: r4(relErr(bc, 2.2)), g: REMAP.includes(sc) ? r4(gBC(bc)) : bc, D: r4(P.plan.dif.D), E: r4(relErr(bc, P.plan.dif.D)), resid: st("resid"), velErr: st("velErr"), place: st("place"), e025: st("e025"), e05: st("e05"), e1: st("e1"), d2: st("d2"), recDist: st("recDist"), recTime: st("recTime"), contacts: st("contacts"), tStable: st("tStable"), cls, surface: P.plan.sf.key }); }
  res.scales[sc] = rows;
}
// matched anchors (the same seed → the same draws for every contact), per 1.2 scale: new BC 75 vs current BC 50, new BC 50 vs current BC 40
for (const ns of REMAP) { res.anchors[ns] = {};
  for (const [a, b, lbl] of [[75, 50, "new75_vs_cur50"], [50, 40, "new50_vs_cur40"]]) {
    const A = raw[ns][a], Bx = raw.current[b], d = (k) => A.map((x, i) => (x[k] == null || Bx[i][k] == null ? null : x[k] - Bx[i][k]));
    const Dd = res.scales[ns][0].D; setScale(ns); const Ea = r4(relErr(a, Dd)), ga = r4(gBC(a)); setScale("current"); const Eb = r4(relErr(b, Dd));
    res.anchors[ns][lbl] = { E: { new: Ea, current: Eb, ratio: r4(Ea / Eb), newCurrentEquivalent: ga }, sameClass: r4(A.filter((x, i) => x.cls === Bx[i].cls).length / nS),
      median: Object.fromEntries(["velErr", "place", "d2", "recDist", "tStable"].map((k) => [k, { new: r4(q(A.map((x) => x[k]), 0.5)), current: r4(q(Bx.map((x) => x[k]), 0.5)), medianPairDiff: r4(q(d(k), 0.5)) }])),
      immediate: { new: r4(A.filter((x) => x.cls === "IMMEDIATE").length / nS), current: r4(Bx.filter((x) => x.cls === "IMMEDIATE").length / nS) } };
  } }
setScale("candidate"); res.ms = now() - t0; fs.writeFileSync(out, JSON.stringify(res)); console.log(id, "done", (res.ms / 1000).toFixed(1), "s");
