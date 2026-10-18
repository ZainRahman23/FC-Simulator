// receive_kill12/tools/rk_det.mjs — determinism and matched counterfactuals for CONTROL EPISODES:
//   1. every contact's draws are keyed by its own event (kill1, kill1.f1, kill1.f2), never by Ball Control: identical at BC 10 … 99 of a seed;
//      the first contact's executed error is the SAME vector × E(BC, D) (exact unless a physical cap binds)
//   2. seeds differ; replay is bit-identical
//   3. the authoritative path: a fresh world from the pass's launch with ALL of the episode's launches scheduled = the episode, bit for bit
//   4. animation on / off: the placeholder body posed at every tick of the episode changes nothing
//   node rk_det.mjs <out.json>
import fs from "fs"; import { createRequire } from "module"; import path from "path"; import { fileURLToPath } from "url";
import { prepare, runEpisode, drawsFor, mkWorld, toWv, toL, spinFor, SIM, DT } from "../rk_sim.js";
import { BC_STEPS, v3 } from "../rk_model.js";
import { KillBody } from "../rk_body.js";
const HERE = path.dirname(fileURLToPath(import.meta.url)), require = createRequire(import.meta.url), { loadTurn1 } = require(path.resolve(HERE, "../../turn1/tools/t1_load.cjs")), X = loadTurn1();
const out = process.argv[2] || "rk_det.json", conds = [{ v: 2 }, { v: 12 }, { v: 22 }, { v: 30 }, { v: 8, h: 0.30, drop: -12 }, { v: 8, h: 0.40, drop: 25 }, { v: 6, h: 0.95, drop: 35, surface: "THIGH" }, { v: 16, h: 0.95, drop: 35, surface: "THIGH" },
  { v: 8, h: 1.32, drop: 20, surface: "CHEST" }, { v: 20, h: 1.32, drop: 20, surface: "CHEST" }, { v: 6, h: 1.78, drop: 15, surface: "HEAD" }, { v: 15, h: 1.78, drop: 25, surface: "HEAD" }, { v: 12, bear: 60 }, { v: 10, h: 2.0, drop: 20 }];
const R = { matched: { conds: 0, seedSets: 0, drawsIdenticalAcrossBC: 0, drawsChecked: 0, proportional: 0, proportionalChecked: 0, capped: 0, maxRelDev: 0 }, seedsDiffer: { pairs: 0, differ: 0 }, replay: { runs: 0, identical: 0 }, schedulePath: { runs: 0, identical: 0, contacts: 0 }, anim: { runs: 0, identical: 0 } };
const same = (a, b) => a.length === b.length && a.every((x, i) => Object.is(x, b[i]));
for (const c of conds) {
  const P = prepare(c); if (P.plan.none) continue; R.matched.conds++;
  for (let s = 1; s <= 6; s++) {
    R.matched.seedSets++; const eps = BC_STEPS.map((bc) => runEpisode(P, bc, { seed: s }, { every: 4 }));
    // 1. per contact n: the draws equal the event's keyed draws and are the same at every rating that reaches contact n
    for (let n = 0; n < 3; n++) { const withN = eps.filter((e) => e.contacts[n]); if (!withN.length) continue; const ev = n === 0 ? "kill1" : "kill1.f" + n, D0 = drawsFor({ seed: s, event: ev });
      R.matched.drawsChecked++; if (withN.every((e) => e.contacts[n].N.reb === D0.reb && e.contacts[n].N.lat === D0.lat && e.contacts[n].N.third === D0.third)) R.matched.drawsIdenticalAcrossBC++; }
    const ref = eps[eps.length - 1].contacts[0].ex; for (const e of eps) { const x = e.contacts[0].ex; if (x.capped || ref.capped) { R.matched.capped++; continue; } R.matched.proportionalChecked++; const k = x.sig.E / ref.sig.E, dev = v3.len(v3.sub(x.err, v3.sc(ref.err, k))) / Math.max(1e-9, v3.len(x.err)); R.matched.maxRelDev = Math.max(R.matched.maxRelDev, dev); if (dev < 1e-9) R.matched.proportional++; }
    // 2. seeds differ (every contact's draws), replay
    if (s > 1) { R.seedsDiffer.pairs++; const a = drawsFor({ seed: s, event: "kill1.f1" }), b = drawsFor({ seed: s - 1, event: "kill1.f1" }), a1 = drawsFor({ seed: s, event: "kill1" }), b1 = drawsFor({ seed: s - 1, event: "kill1" }); if (a.reb !== b.reb && a1.reb !== b1.reb) R.seedsDiffer.differ++; }
    for (const j of [0, 4, 9]) { const e2 = runEpisode(P, BC_STEPS[j], { seed: s }, { every: 4 }); R.replay.runs++; if (same(e2.m.finalBall, eps[j].m.finalBall) && e2.contacts.length === eps[j].contacts.length && e2.contacts.every((x, i) => same(x.ex.v, eps[j].contacts[i].ex.v))) R.replay.identical++; }
    // 3. a fresh world from the launch with every launch of the episode scheduled up front = the episode
    for (const j of [0, 4, 9]) { const e = eps[j], W = mkWorld(P.sol.launch.p, P.sol.launch.v, P.sol.launch.w); let ok = true;
      for (const k of e.contacts) W.schedule({ id: "c" + k.n, tick: P.kc + k.i, position: [40 + k.contact[0], k.contact[2], -(34 + k.contact[1])], velocity: toWv(k.ex.v), spin: spinFor(k.ideal, k.ex.v), maxContactError: SIM.contactWindow, preparedAt: 0, metadata: {} });
      const n = P.kc + e.rec[e.rec.length - 1].i; for (let i = 0; i < n; i++) W.step(); const fin = toL(W.ball.p), launched = W.events.filter((x) => x.kind === "AUTHORITATIVE_LAUNCH").length;
      R.schedulePath.runs++; R.schedulePath.contacts += e.contacts.length; if (same(fin, e.rec[e.rec.length - 1].p) && launched === e.contacts.length) R.schedulePath.identical++; }
    // 4. animation on: pose the body at every tick of the episode, then run again
    if (s === 1) { const e = eps[4], B = new KillBody(X.RUN1_V13, X.M4, X.skel, P, e); for (let i = -300; i < e.rec[e.rec.length - 1].i; i++) B.poseAt((P.kc + i) * DT, P.pred.P[Math.max(0, Math.min(P.kc + i, P.pred.P.length - 1))].p);
      const e2 = runEpisode(P, BC_STEPS[4], { seed: s }, { every: 4 }); R.anim.runs++; if (same(e2.m.finalBall, e.m.finalBall)) R.anim.identical++; }
  }
}
fs.writeFileSync(out, JSON.stringify(R, null, 1)); console.log(JSON.stringify(R));
