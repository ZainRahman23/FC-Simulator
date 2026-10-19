// receive_turn1/tools/rt_det.mjs — DETERMINISM and MATCHED COUNTERFACTUALS of the receive-and-turn episode:
//   1. the turn touch's draws are keyed by the receive event and the contact, never by Ball Control: identical at BC 10 … 99 of a seed, and the
//      executed error on each dimension is the SAME standardised draw × σ(BC, D) (exact unless a physical cap binds)
//   2. different seeds differ; a replay is bit-identical
//   3. the authoritative path: a fresh world from the pass's launch with the episode's launches scheduled (turn touch, extra control, continuation)
//      reproduces the episode's ball bit for bit
//   4. animation on / off: the placeholder body posed at every tick of the episode changes nothing
//   5. the mirror: a two-footed receiver's −θ turn is the exact mirror image of his +θ turn, seed for seed
//   node rt_det.mjs <out.json>
import fs from "fs"; import { createRequire } from "module"; import path from "path"; import { fileURLToPath } from "url";
import { prepareTurn, runTurn, turnDraws, TEXEC } from "../rt_sim.js";
import { mkWorld, toL, toWv, rollW, DT } from "../rk_sim.js";
import { TurnBody } from "../rt_body.js";
const HERE = path.dirname(fileURLToPath(import.meta.url)), require = createRequire(import.meta.url), { loadTurn1 } = require(path.resolve(HERE, "../../turn1/tools/t1_load.cjs")), X = loadTurn1();
const out = process.argv[2] || "rt_det.json", BCS = [10, 30, 50, 70, 90, 99];
const conds = [{ v: 6, theta: 0 }, { v: 12, theta: 30 }, { v: 12, theta: 60 }, { v: 12, theta: 90 }, { v: 12, theta: 120 }, { v: 12, theta: 135 }, { v: 12, theta: 150 }, { v: 12, theta: 180 }, { v: 18, theta: 90 }, { v: 18, theta: 180 }, { v: 6, theta: 135 }, { v: 12, theta: -135 }, { v: 12, theta: 90, prep: 0.3 }, { v: 12, theta: 135, lat: 0.25 }];
const R = { matched: { conds: 0, seedSets: 0, drawsIdentical: 0, drawsChecked: 0, proportional: 0, proportionalChecked: 0, capped: 0, maxRelDev: 0 }, seedsDiffer: { pairs: 0, differ: 0 }, replay: { runs: 0, identical: 0 }, schedulePath: { runs: 0, identical: 0, launches: 0 }, anim: { runs: 0, identical: 0 }, mirror: { runs: 0, exact: 0, bitIdentical: 0, maxDev: 0, note: "exact = the same family, class and continuation time (to 1e-12 s) and the ball path mirrored to 1e-9 m; bitIdentical = no floating-point difference at all (angle wraps of mirrored values can differ in the last bit)" } };
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b), fp = (e) => JSON.stringify([e.ex.v, e.m.cls, e.m.tCont, e.m.contacts, e.rec.map((r) => r.p)]);
for (const c of conds) {
  const P = prepareTurn(c); if (P.A.none) continue; R.matched.conds++;
  for (let s = 1; s <= 6; s++) {
    R.matched.seedSets++; const eps = BCS.map((bc) => runTurn(P, bc, { seed: s }, { every: 4 }));
    const N0 = eps[0].N; for (const e of eps) { R.matched.drawsChecked++; if (["damping", "weight", "direction", "vertical"].every((d) => Object.is(e.N[d], N0[d]))) R.matched.drawsIdentical++; }
    for (const e of eps) { if (e.ex.capped) { R.matched.capped++; continue; } R.matched.proportionalChecked++; let ok = true;
      for (const d of ["weight", "direction"]) { const want = e.ex.sigma[d] * e.N[d], got = e.ex.eAxes[d], dev = Math.abs(got - want) / Math.max(1e-12, Math.abs(want)); R.matched.maxRelDev = Math.max(R.matched.maxRelDev, want === 0 ? 0 : dev); if (dev > 1e-9 && Math.abs(want) > 1e-12) ok = false; }
      if (ok) R.matched.proportional++; }
    // replay
    const again = runTurn(P, 70, { seed: s }, { every: 4 }); R.replay.runs++; if (fp(again) === fp(eps[3])) R.replay.identical++;
    // a different seed differs
    const other = runTurn(P, 70, { seed: s + 100 }, { every: 4 }); R.seedsDiffer.pairs++; if (!same(other.ex.v, eps[3].ex.v)) R.seedsDiffer.differ++;
    // the authoritative path: a fresh world from the launch, every launch of the episode scheduled at its tick
    for (const e of [eps[1], eps[3], eps[5]]) { R.schedulePath.runs++; const L = P.inc.sol.launch, Wf = mkWorld(L.p, L.v, L.w), kc = P.kc, list = [{ id: "turn1", tick: kc, v: e.ex.v }];
      if (e.follow) list.push({ id: "turn1.f1", tick: kc + e.follow.i, v: e.follow.ex.v }); if (e.carry) list.push({ id: "turn1.carry", tick: kc + e.carry.i, v: e.carry.v });
      const recs = []; let k = 0; const n = kc + Math.round(3.0 / DT);
      while (k <= n) { for (const it of list) if (it.tick === k) { Wf.schedule({ id: it.id, tick: k, position: Wf.ball.p.slice(), velocity: toWv(it.v), spin: rollW(toWv(it.v)), maxContactError: 0.06, preparedAt: 0, metadata: {} }); R.schedulePath.launches++; }
        if (k >= kc && (k - kc) % 4 === 0) recs.push(toL(Wf.ball.p)); Wf.step(); k++; }
      const mine = e.rec.map((r) => r.p).slice(0, recs.length); if (same(mine, recs.slice(0, mine.length))) R.schedulePath.identical++; }
  }
  // animation on / off: pose the body at every tick; the episode's results must not change
  { const e0 = runTurn(P, 50, { seed: 3 }, { every: 4 }), B = new TurnBody(X.RUN1_V13, X.M4, X.skel, P, e0); for (let k = Math.max(0, P.kc - 200); k < P.kc + 600; k += 2) B.poseAt(k * DT, e0.rec[Math.min(e0.rec.length - 1, Math.max(0, Math.round((k - P.kc) / 4)))].p);
    const e1 = runTurn(P, 50, { seed: 3 }, { every: 4 }); R.anim.runs++; if (fp(e1) === fp(e0)) R.anim.identical++; }
}
// the mirror (two-footed receiver)
for (const v of [6, 12, 18]) for (const a of [30, 90, 135, 180]) { const Pr = prepareTurn({ v, theta: a, pref: null }), Pl = prepareTurn({ v, theta: -a, pref: null }); if (Pr.A.none || Pl.A.none) continue;
  for (const bc of [30, 70, 99]) for (let s = 1; s <= 4; s++) { const x = runTurn(Pr, bc, { seed: s }, { every: 8 }), y = runTurn(Pl, bc, { seed: s }, { every: 8 }); R.mirror.runs++;
    let d = Math.max(Math.abs(x.ex.v[0] - y.ex.v[0]), Math.abs(x.ex.v[1] + y.ex.v[1]), Math.abs(x.ex.v[2] - y.ex.v[2])); for (let i = 0; i < Math.min(x.rec.length, y.rec.length); i++) d = Math.max(d, Math.abs(x.rec[i].p[0] - y.rec[i].p[0]), Math.abs(x.rec[i].p[1] + y.rec[i].p[1]), Math.abs(x.rec[i].p[2] - y.rec[i].p[2]));
    R.mirror.maxDev = Math.max(R.mirror.maxDev, d); const tc = x.m.tCont == null ? y.m.tCont == null : y.m.tCont != null && Math.abs(x.m.tCont - y.m.tCont) < 1e-12;
    if (d < 1e-9 && x.m.cls === y.m.cls && tc && Pr.A.fid === Pl.A.fid) R.mirror.exact++; if (d === 0 && x.m.tCont === y.m.tCont) R.mirror.bitIdentical++; } }
R.keys = { example: turnDraws({ seed: 1 }).key, dims: ["damping", "weight", "direction", "vertical"], id: TEXEC.id };
fs.writeFileSync(out, JSON.stringify(R, null, 1)); console.log(JSON.stringify(R));
