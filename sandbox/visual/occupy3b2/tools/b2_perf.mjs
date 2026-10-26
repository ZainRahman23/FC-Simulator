// occupy3b2/tools/b2_perf.mjs — PERFORMANCE: the world's step timed STAGE 2 (as decided) · 3B.1 · 3B.2 on the review set + the matrix (3B.1's own tool's
// method: occupy3b/tools/l3_perf.mjs), 3B.2's placement pass split IDLE (no recovery step in flight, nothing to guard) · ACTIVE (a recovery placement, an
// in-flight check, a guarded landing evaluated), the landings evaluated per tick, and the worst tested 60 Hz frame (four consecutive steps).
//   node b2_perf.mjs [--reps 2]
import { ENV } from "../../occupy1/tools/o_env.mjs";
import { O3CASES, MATRIX } from "../../occupy3/o3_cases.js";
import { runB2 } from "../b2_run.js";
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; }, REPS = +arg("reps", 2), now = () => performance.now();
const q = (A, p) => { if (!A.length) return 0; const s = Float64Array.from(A).sort(); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; }, mean = (A) => (A.length ? A.reduce((a, b) => a + b, 0) / A.length : 0), amax = (A) => A.reduce((m, x) => (x > m ? x : m), 0);
const M = ["S2D", "S3B", "S3B2"], step = Object.fromEntries(M.map((m) => [m, []])), frames = Object.fromEntries(M.map((m) => [m, []])), pass = { idle: [], active: [] }, evals = [];
const L = O3CASES.concat(MATRIX.filter((x) => !O3CASES.some((y) => y.id === x.id)));
for (let rep = 0; rep < REPS; rep++) for (const tc of L) for (const m of M) { const four = [];
  runB2(ENV, tc, m, { record: false, before: (W) => { const s0 = W.step.bind(W); let n0 = 0;
    W.step = (a, d) => { const c = now(); s0(a, d); const dt = (now() - c) * 1000; step[m].push(dt); four.push(dt); if (four.length === 4) { frames[m].push(four.reduce((x, y) => x + y, 0)); four.length = 0; }
      if (m !== "S3B2" || !W.b2) return; const us = W.b2.cpu.length ? W.b2.cpu[W.b2.cpu.length - 1] * 1000 : 0, ne = W.b2.nEval - n0; n0 = W.b2.nEval; (ne > 0 ? pass.active : pass.idle).push(us); if (ne > 0) evals.push(ne); }; } }); process.stderr.write("."); }
const f1 = (v) => v.toFixed(1), row = (n, A) => `  ${n.padEnd(58)} mean ${f1(mean(A)).padStart(7)} µs · p99 ${f1(q(A, 0.99)).padStart(8)} µs · max ${f1(amax(A)).padStart(9)} µs   (${A.length} ticks)`;
console.log(`\nPERFORMANCE — ${L.length} encounters (the review set + the matrix) × ${REPS} repetitions, node ${process.version} (one core)`);
for (const m of M) console.log(row(`the world's step, ${m === "S2D" ? "STAGE 2 (as decided)" : m === "S3B" ? "3B.1 (calibrated F+M)" : "3B.2"}`, step[m]));
console.log(row("3B.2's placement pass, IDLE (nothing to place or guard)", pass.idle)); console.log(row("3B.2's placement pass, ACTIVE (a landing evaluated)", pass.active));
console.log(`  landings evaluated per active tick: mean ${f1(mean(evals))} · p99 ${q(evals, 0.99)} · max ${amax(evals)}  (each: the landing interval and the swing corridor against the prediction)`);
for (const m of M) console.log(`  the worst tested 60 Hz frame, ${m}: ${f1(amax(frames[m]) / 1000)} ms · p99 ${f1(q(frames[m], 0.99) / 1000)} ms`);
