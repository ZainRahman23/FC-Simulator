// receive_turn1/tools/var_dist.mjs — PHASE 1 EVIDENCE: the execution distribution of every benchmark at every rating, in three draw modes on the
// same machinery (Alternative B, the same incoming balls):
//   B    RECEIVE-KILL-1.2's keys, unbounded normal draws          = RECEIVE-KILL-1.2 B exactly (the reference: "the current behaviour")
//   Bb   RECEIVE-KILL-1.2's keys, BOUNDED draws                   matched to B seed for seed: isolates what the bounding changes
//   v2   receive-control-v2 keys, BOUNDED draws                   the new production draws: B's distribution re-sampled
// Per seed: first-touch placement error (aerial: drop point; ground: where the touch leaves the ball, 2 s), immediate residual speed, the 0.5 / 1.0 /
// 2.0 s errors, recovery distance / time, contacts, time to stable control, the continuation class; per cell the quantiles (min, p10, p25, p50,
// p75, p90, max), the mean and the class shares; for Bb vs B the per-seed agreement.   node var_dist.mjs <benchmark id> <nSeeds> <out.json>
import fs from "fs";
import { prepare, runBC, runEpisode, firstContact, drawsFor, now } from "../rk_sim.js";
import { BC_STEPS, setScale, setDraws } from "../rk_model.js";
import { THREE_BENCH } from "../rk_conditions.js";
const [id, nArg = "1000", out] = process.argv.slice(2), nS = +nArg, B = THREE_BENCH.find((b) => b.id === id);
const MODES = { B: { keys: "rk12", bounded: false }, Bb: { keys: "rk12", bounded: true }, v2: { keys: "v2", bounded: true } };
const KEYS = ["place", "resid", "e05", "e1", "d2", "recDist", "recTime", "contacts", "tStable"];
const r4 = (x) => (x == null ? null : Math.round(x * 1e4) / 1e4);
const quant = (a) => { const s = a.filter((x) => x != null).sort((x, y) => x - y), n = s.length; if (!n) return null; const q = (p) => s[Math.min(n - 1, Math.floor(p * n))];
  return { n, min: r4(s[0]), p10: r4(q(0.1)), p25: r4(q(0.25)), p50: r4(q(0.5)), p75: r4(q(0.75)), p90: r4(q(0.9)), max: r4(s[n - 1]), mean: r4(s.reduce((t, x) => t + x, 0) / n) }; };
function one(P, bc, spec) {
  const r1 = runBC(P, bc, drawsFor(Object.assign({ event: "kill1", contact: 0 }, spec)), { post: 2.2, every: 4 }), fc = firstContact(P, r1.ex, r1.run), ep = runEpisode(P, bc, spec, { every: 2 }), m = ep.m, aerial = P.plan.sf.S.group !== "FOOT";
  const N = ep.contacts[0].N;
  return { place: aerial ? fc.dropErr : fc["e2"], resid: fc.speed, e05: fc["e0.5"], e1: fc["e1"], d2: r1.m.dStar, recDist: m.extraAdj, recTime: m.extraT, contacts: m.contacts, tStable: m.tStable, cls: m.continuation,
    nMax: Math.max(Math.abs(N.raw.reb), Math.abs(N.raw.lat), Math.abs(N.raw.third)), bMax: Math.max(Math.abs(N.reb), Math.abs(N.lat), Math.abs(N.third)) };
}
setScale("B"); const P = prepare(B.cond), t0 = now(), res = { id, title: B.title, cond: B.cond, nSeeds: nS, bc: BC_STEPS, D: P.plan.dif.D, surface: P.plan.sf.key, modes: {}, matchedBb: {} }, raw = {};
for (const [mk, mo] of Object.entries(MODES)) {
  setDraws(mo); raw[mk] = {}; res.modes[mk] = {};
  for (const bc of BC_STEPS) { const xs = []; for (let s = 1; s <= nS; s++) xs.push(one(P, bc, { seed: s })); raw[mk][bc] = xs;
    const cell = { cls: {} }; for (const k of KEYS) cell[k] = quant(xs.map((x) => x[k]));
    for (const c of ["IMMEDIATE", "ADJUSTED", "RECOVERY", "UNSTABLE"]) cell.cls[c] = r4(xs.filter((x) => x.cls === c).length / nS);
    cell.drawMax = { raw: r4(Math.max(...xs.map((x) => x.nMax))), bounded: r4(Math.max(...xs.map((x) => x.bMax))) }; cell.tailShare = r4(xs.filter((x) => x.nMax > 1.5).length / nS);
    res.modes[mk][bc] = cell; }
}
// Bb vs B, seed for seed (the same keyed normals; Bb only compresses |N| > 1.5)
for (const bc of BC_STEPS) { const a = raw.B[bc], b = raw.Bb[bc], untouched = a.map((x, i) => x.nMax <= 1.5), same = a.filter((x, i) => x.cls === b[i].cls).length;
  const sameAll = a.filter((x, i) => KEYS.every((k) => x[k] === b[i][k]) && x.cls === b[i].cls).length, sameUntouched = a.filter((x, i) => untouched[i] && KEYS.every((k) => x[k] === b[i][k])).length;
  res.matchedBb[bc] = { sameClass: r4(same / nS), identicalEpisode: r4(sameAll / nS), untouchedSeeds: untouched.filter(Boolean).length, untouchedIdentical: sameUntouched }; }
setDraws({ keys: "v2", bounded: true }); res.ms = now() - t0; fs.writeFileSync(out, JSON.stringify(res)); console.log(id, "done", (res.ms / 1000).toFixed(1), "s");
