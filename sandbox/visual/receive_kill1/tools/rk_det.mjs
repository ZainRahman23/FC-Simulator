// receive_kill1/tools/rk_det.mjs — determinism and matched counterfactuals:
//   1. the draws are keyed without Ball Control: identical key ids and values for BC 10 … 99 of a seed; the executed error is the SAME vector scaled
//      by E(BC, D) (exactly proportional unless a physical cap binds)
//   2. seeds differ; replay is bit-identical
//   3. the authoritative path (one kernel schedule() in a fresh world from the launch) = the snapshot path the matrices use, bit for bit
//   4. animation on / off: running the placeholder body at every tick (Node, the real rig) changes nothing
//   node rk_det.mjs <out.json>
import fs from "fs"; import { createRequire } from "module"; import path from "path"; import { fileURLToPath } from "url";
import { prepare, runBC, drawsFor, mkWorld, toWv, contactSpin, SIM, DT, toL } from "../rk_sim.js";
import { BC_STEPS, relErr, v3 } from "../rk_model.js";
import { KillBody } from "../rk_body.js";
const HERE = path.dirname(fileURLToPath(import.meta.url)), require = createRequire(import.meta.url), { loadTurn1 } = require(path.resolve(HERE, "../../turn1/tools/t1_load.cjs")), X = loadTurn1();
const out = process.argv[2] || "rk_det.json", conds = [{ v: 2 }, { v: 12 }, { v: 22 }, { v: 30 }, { v: 8, h: 0.30, drop: -12 }, { v: 8, h: 0.40, drop: 25 }, { v: 8, h: 0.95, drop: 35, surface: "THIGH" }, { v: 16, h: 0.95, drop: 35, surface: "THIGH" },
  { v: 8, h: 1.32, drop: 20, surface: "CHEST" }, { v: 20, h: 1.32, drop: 20, surface: "CHEST" }, { v: 6, h: 1.78, drop: 15, surface: "HEAD" }, { v: 15, h: 1.78, drop: 25, surface: "HEAD" }, { v: 12, bear: 60 }, { v: 10, h: 2.0, drop: 20 }];
const R = { matched: { conds: 0, seeds: 0, keyIdentical: 0, proportional: 0, proportionalChecked: 0, capped: 0, maxRelDev: 0 }, seedsDiffer: { pairs: 0, differ: 0 }, replay: { runs: 0, identical: 0 }, schedulePath: { runs: 0, identical: 0 }, anim: { runs: 0, identical: 0 } };
const same = (a, b) => a.length === b.length && a.every((x, i) => Object.is(x, b[i]));
for (const c of conds) {
  const P = prepare(c); if (P.plan.none) continue; R.matched.conds++;
  for (let s = 1; s <= 8; s++) {
    R.matched.seeds++; const N = drawsFor({ seed: s }), runs = BC_STEPS.map((bc) => runBC(P, bc, N, { post: 2.2 }));
    // 1. key ids / values do not depend on BC (they are drawn once per event); the error vector is proportional to E
    const N2 = drawsFor({ seed: s }); if (N2.reb === N.reb && N2.lat === N.lat && N2.third === N.third && JSON.stringify(N2.keyIds) === JSON.stringify(N.keyIds) && !/ball|bc|BC/.test(N.key)) R.matched.keyIdentical++;
    const ref = runs[runs.length - 1], eRef = ref.ex.sig.E; let ok = true;
    for (const r of runs) { if (r.ex.capped) { R.matched.capped++; continue; } R.matched.proportionalChecked++; const k = r.ex.sig.E / eRef, e = v3.sub(r.ex.v, P.ideal.v), e0 = ref.ex.capped ? null : v3.sub(ref.ex.v, P.ideal.v); if (!e0) continue;
      const dev = v3.len(v3.sub(e, v3.sc(e0, k))) / Math.max(1e-9, v3.len(e)); R.matched.maxRelDev = Math.max(R.matched.maxRelDev, dev); if (dev < 1e-9) R.matched.proportional++; else ok = false; }
    // 2. seeds differ
    if (s > 1) { R.seedsDiffer.pairs++; const Np = drawsFor({ seed: s - 1 }); if (Np.reb !== N.reb && Np.lat !== N.lat && Np.third !== N.third) R.seedsDiffer.differ++; }
    // replay
    const again = runBC(prepare(c), 60, N, { post: 2.2 }), first = runs[BC_STEPS.indexOf(60)]; R.replay.runs++; if (same(again.ex.v, first.ex.v) && same(again.run.final.p, first.run.final.p)) R.replay.identical++;
    // 3. the authoritative path: a fresh world from the pass's launch, the kill scheduled at tick 0 for the CONTACT tick, stepped to the end
    if (s <= 3) for (const bc of [10, 60, 99]) {
      const r = runs[BC_STEPS.indexOf(bc)], W = mkWorld(P.sol.launch.p, P.sol.launch.v, P.sol.launch.w), ex = r.ex;
      W.schedule({ id: "kill1", tick: P.kc, position: toW3(P, W), velocity: toWv(ex.v), spin: contactSpin(P, ex.v), maxContactError: SIM.contactWindow, preparedAt: 0, metadata: {} });
      const n = P.kc + Math.round(2.2 / DT) + 1; for (let i = 0; i < n; i++) W.step(); R.schedulePath.runs++;
      const fin = toL(W.ball.p); if (same(fin, r.run.final.p) && W.events.some((e) => e.kind === "AUTHORITATIVE_LAUNCH")) R.schedulePath.identical++;
    }
    // 4. animation on: the body posed at every tick of the action (it reads the ball, writes nothing) — the outcome is unchanged
    if (s === 1) { const B = new KillBody(X.RUN1_V13, X.M4, X.skel, P); for (let k = Math.max(0, P.kc - 300); k < P.kc + 400; k += 1) B.poseAt(k * DT, P.pred.P[Math.min(k, P.pred.P.length - 1)].p);
      const r2 = runBC(P, 60, N, { post: 2.2 }), r1 = runs[BC_STEPS.indexOf(60)]; R.anim.runs++; if (same(r2.ex.v, r1.ex.v) && same(r2.run.final.p, r1.run.final.p)) R.anim.identical++; }
  }
}
// the contact position of the authoritative path: the predicted ball at the CONTACT tick (the action's CONTACT marker; the kernel checks it)
function toW3(P, W) { const p = P.pred.P[P.kc].p; return [40 + p[0], p[2], -(34 + p[1])]; }
fs.writeFileSync(out, JSON.stringify(R, null, 1)); console.log(JSON.stringify(R));
