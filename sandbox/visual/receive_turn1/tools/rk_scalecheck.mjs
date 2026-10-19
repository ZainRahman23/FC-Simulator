// receive_kill12/tools/rk_scalecheck.mjs — the comparison machinery is faithful: RECEIVE-KILL-1.2 with setScale("current") reproduces RECEIVE-KILL-1.1
// bit for bit (every contact's executed launch, the final ball, the stable time), and setScale("original") reproduces RECEIVE-KILL-1's first contacts
// (the TYPICAL benchmark grid, against RECEIVE-KILL-1's evidence of record).   node rk_scalecheck.mjs <out.json>
import fs from "fs"; import path from "path"; import { fileURLToPath } from "url";
import * as N from "../rk_sim.js"; import * as NM from "../rk_model.js";
import * as C from "../../receive_kill11/rk_sim.js";
import { BENCHMARKS } from "../rk_conditions.js";
const HERE = path.dirname(fileURLToPath(import.meta.url)), out = process.argv[2] || "rk_scalecheck.json";
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b), R = { current: { runs: 0, identical: 0 }, original: { cells: 0, identical: 0 } };
NM.setScale("current");
for (const b of BENCHMARKS) { const Pn = N.prepare(b.cond), Pc = C.prepare(b.cond); for (const bc of [10, 30, 50, 70, 90, 99]) for (const s of [1, 2, 3]) {
  const en = N.runEpisode(Pn, bc, { seed: s }, { every: 8 }), ec = C.runEpisode(Pc, bc, { seed: s }, { every: 8 }); R.current.runs++;
  if (same(en.contacts.map((k) => [k.sf.key, k.i, k.ex.v]), ec.contacts.map((k) => [k.sf.key, k.i, k.ex.v])) && same(en.m.finalBall, ec.m.finalBall) && en.m.tStable === ec.m.tStable) R.current.identical++; } }
NM.setScale("original");
const K1 = JSON.parse(fs.readFileSync(path.resolve(HERE, "../../../../review_artifacts/receive_kill1/evidence/rk_distribution.json"), "utf8")).matrices.BENCH, OLD = [10, 20, 30, 40, 50, 60, 70, 80, 90, 99];
BENCHMARKS.forEach((b, j) => { const P = N.prepare(b.cond), D = N.drawsFor({ example: "TYPICAL" }); OLD.forEach((bc, i) => { const d = N.runBC(P, bc, D, { post: 2.2 }).m.dStar; R.original.cells++; if (Math.round(d * 1e4) / 1e4 === K1[j].typical[i].d2) R.original.identical++; else (R.original.diffs = R.original.diffs || []).push([b.id, bc, Math.round(d * 1e4) / 1e4, K1[j].typical[i].d2]); }); });
NM.setScale("candidate"); fs.writeFileSync(out, JSON.stringify(R, null, 1)); console.log(JSON.stringify(R));
