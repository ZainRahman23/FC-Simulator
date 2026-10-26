// occupy3b2/tools/b2_invar.mjs — §9 / §10 THE INVARIANTS OF STAGE 3B.2 in the world: DETERMINISM (every case twice: every tick's roots, ball, authority,
// every joint, and 3B.2's whole record identical), MIRRORS (each matrix row against its mirror: 3B.2's decisions by kind and result, its NO_FEASIBLE
// results, releases, Stage 3's steps / classes, the legs' ticks > 5 cm — the canonical body's own left / right asymmetries reported as they are), the WORLD
// TURNED 37° (the same, against the unturned case), and THE LEDGER (3B.1's checks on every run, boot contacts included: Stage 3 took exactly its impulses,
// pairing, the bound, no energy gained).   node b2_invar.mjs [--set l3] [--json f]
import { ENV, setOf, arg, live, trace, compare, limbMeasure } from "../../occupy3b/tools/l3_common.mjs";
import { runB2 } from "../b2_run.js";
import { ROT_ROWS, ROT } from "../../occupy3b/l3_forms.js";
import fs from "node:fs";
const SET = arg("set", "l3"), L = setOf(SET), out = { det: [], mir: [], rot: [], ledger: { stage3: 0, pair: 0, bound: 0, energy: 0, n: 0, boot: 0 } };
const sig = (R) => { const W = R.W, B = W.b2, eps = W.imp.episodes, kinds = {}; for (const d of B.decisions) { const k = d.kind + " → " + (d.result ? d.result.kind.replace(/ \(.*$/, "") : "?"); kinds[k] = (kinds[k] || 0) + 1; }
  return { kinds, nf: B.results.map((n) => n.consequence).sort().join(","), rel: B.release.length, steps: eps.reduce((a, e) => a + ["ATT", "DEF"].reduce((b, k) => b + (e.players[k] ? e.players[k].steps.length : 0), 0), 0),
    cls: eps.flatMap((e) => ["ATT", "DEF"].filter((k) => e.players[k]).map((k) => e.players[k].cls)).sort().join(","), apps: W.l3.apps.length, lam: +W.l3.apps.reduce((a, x) => a + x.lam, 0).toFixed(3) }; };
const same = (a, b) => JSON.stringify(a.kinds) === JSON.stringify(b.kinds) && a.nf === b.nf && a.rel === b.rel && a.steps === b.steps && a.cls === b.cls;
const runs = new Map();
for (const tc of L) { if (tc.onlyCommitted) { const p = runB2(ENV, tc, "S2D", { record: false }); if (!p.W.tk.act) continue; }
  const l1 = live(), l2 = live(), R1 = runB2(ENV, tc, "S3B2", { record: true, onTick: l1.onTick }), s1 = sig(R1), t5 = limbMeasure(R1).legs5, rec1 = JSON.stringify(R1.W.b2.decisions.map((d) => [d.k, d.who, d.kind, d.result]));
  const R2 = runB2(ENV, tc, "S3B2", { record: true, onTick: l2.onTick }), c = compare(trace(R1, l1.L), trace(R2, l2.L)), rec2 = JSON.stringify(R2.W.b2.decisions.map((d) => [d.k, d.who, d.kind, d.result]));
  out.det.push({ id: tc.id, identical: c.maxRoot === 0 && c.maxJ === 0 && rec1 === rec2, n: c.n });
  const C = R1.W.l3.check; for (const k of ["stage3", "pair", "bound", "energy"]) out.ledger[k] = Math.max(out.ledger[k], C[k]); out.ledger.n += C.n; out.ledger.boot += R1.W.l3.apps.filter((a) => a.boot).length;
  runs.set(tc.id, Object.assign(s1, { t5 })); process.stderr.write("."); }
for (const [id, a] of runs) { if (id.endsWith("-m")) continue; const b = runs.get(id + "-m"); if (!b) continue; out.mir.push({ id, same: same(a, b), a, b, dt5: b.t5 - a.t5, dlam: +(b.lam - a.lam).toFixed(3) }); }
for (const id of ROT_ROWS) { const base = setOf("l3").find((x) => x.id === id); if (!base) continue; const R = runB2(ENV, base, "S3B2", { record: true, rot: ROT }), s = sig(R), t5 = limbMeasure(R).legs5, a = runs.get(base.id) || Object.assign(sig(runB2(ENV, base, "S3B2", { record: true })), { t5: limbMeasure(runB2.last).legs5 });
  out.rot.push({ id: base.id, rot: ROT, same: same(a, s), a, b: Object.assign(s, { t5 }), dlam: +(s.lam - a.lam).toFixed(3) }); process.stderr.write("r"); }
console.log(`\nTHE INVARIANTS OF STAGE 3B.2 — set ${SET} (${out.det.length} cases)`);
console.log(`  DETERMINISM: ${out.det.filter((x) => x.identical).length} / ${out.det.length} cases identical run twice (every tick's roots, ball, authority, every joint; 3B.2's every decision)`);
console.log(`  THE LEDGER (3B.1's checks, every application, the ${out.ledger.boot} boot-contact applications included, ${out.ledger.n} in all): Stage 3 took exactly its impulses ${out.ledger.stage3.toExponential(1)} N·s · pairing ${out.ledger.pair.toExponential(1)} · bound ${out.ledger.bound.toExponential(1)} · energy gained ${out.ledger.energy.toExponential(1)} J`);
console.log(`  MIRRORS: ${out.mir.filter((x) => x.same).length} / ${out.mir.length} pairs with the same 3B.2 decisions (by kind and result), NO_FEASIBLE results, releases, Stage 3 steps and classes`);
for (const m of out.mir.filter((x) => !x.same)) console.log(`    ${m.id.padEnd(20)} ${JSON.stringify(m.a.kinds)} vs ${JSON.stringify(m.b.kinds)} · steps ${m.a.steps}/${m.b.steps} · classes ${m.a.cls} / ${m.b.cls} · Σλ Δ ${m.dlam} · >5 cm ${m.a.t5}/${m.b.t5}`);
console.log(`  THE WORLD TURNED 37°: ${out.rot.filter((x) => x.same).length} / ${out.rot.length} cases with the same 3B.2 decisions, NO_FEASIBLE results, releases, Stage 3 steps and classes`);
for (const m of out.rot) console.log(`    ${m.id.padEnd(20)} ${m.same ? "same" : "DIFFERS"} · decisions ${Object.values(m.a.kinds).reduce((a, b) => a + b, 0)}/${Object.values(m.b.kinds).reduce((a, b) => a + b, 0)} · steps ${m.a.steps}/${m.b.steps} · classes ${m.a.cls} / ${m.b.cls} · Σλ Δ ${m.dlam} N·s`);
if (arg("json")) fs.writeFileSync(arg("json"), JSON.stringify(out));
