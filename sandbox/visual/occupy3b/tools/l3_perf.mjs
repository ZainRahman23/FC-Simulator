// occupy3b/tools/l3_perf.mjs — §16 PERFORMANCE (Stage 3's tool with STAGE 3B added: the limb pass split IDLE (far apart, nothing to reconcile) ·
// NEAR (within the broad phase, no limb contact) · ACTIVE (a limb contact or a perturbation reconciling); its header:)
// what Stage 3 costs per tick, per frame (60 Hz = 4 ticks), per simulated second (240 ticks), on the
// review set and the matrix, the world's own step timed STAGE 2 (as decided) vs STAGE 3, and Stage 3's impact pass split:
//   IDLE — the roots beyond the broad phase (1.9 m) and nobody responding: one distance test
//   NEAR — within it, no meaningful contact (the contact check: the posed capsules already Stage 2's, 121 pairs detected, nothing responding)
//   ACTIVE — an impact episode responding (the impulses, both players' balance, the realisation, the posture, steps)
// THE WORST TESTED 60 Hz FRAME: the largest sum of four consecutive world steps. SCALE: the impact pass is per PAIR within the broad phase (Stage 2's
// own proximity test gates it; the expensive balance solve runs only for a player in an episode) — 22 players: the pairs within 1.9 m, not 231.
//   node o3_perf.mjs [--reps 3]
import { ENV } from "../../occupy1/tools/o_env.mjs";
import { O3CASES, MATRIX } from "../../occupy3/o3_cases.js";
import { runO3 } from "../../occupy3/o3_run.js";
import "../../occupy3/o3_world.js";
import "../l3_world.js";
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; }, REPS = +arg("reps", 3), now = () => performance.now();
const q = (A, p) => { if (!A.length) return 0; const s = Float64Array.from(A).sort(); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; }, mean = (A) => (A.length ? A.reduce((a, b) => a + b, 0) / A.length : 0), amax = (A) => A.reduce((m, x) => (x > m ? x : m), 0);
const step = { S2D: [], S3: [], S3B: [] }, cat = { idle: [], near: [], active: [] }, lcat = { idle: [], near: [], active: [] }, frames = { S2D: [], S3: [], S3B: [] }, part = { player: [], capture: [] }; let nearTicks = 0, ticks = 0, activeTicks = 0;
const L = O3CASES.concat(MATRIX.filter((x) => !O3CASES.some((y) => y.id === x.id)));
for (let rep = 0; rep < REPS; rep++) for (const tc of L) for (const m of ["S2D", "S3", "S3B"]) { const four = [];
  runO3(ENV, tc, m, { record: false, before: (W) => { const s0 = W.step.bind(W), T = {};
    if (m === "S3") for (const [name, key] of [["player", "player"], ["capture", "capture"]]) { const f = W[name].bind(W); W[name] = (...a) => { const c = now(), r = f(...a); T[key] = (T[key] || 0) + (now() - c); return r; }; }
    W.step = (a, d) => { for (const k of Object.keys(T)) T[k] = 0; const c = now(); s0(a, d); const dt = (now() - c) * 1000; step[m].push(dt); four.push(dt); if (four.length === 4) { frames[m].push(four.reduce((x, y) => x + y, 0)); four.length = 0; }
      if (m === "S3B") { const us = W.l3.cpu.length ? W.l3.cpu[W.l3.cpu.length - 1] * 1000 : 0, r = W.l3.log.length ? W.l3.log[W.l3.log.length - 1] : null, sa = W.att.stateAt(W.att.t), sd = W.def.stateAt(W.def.t), near = Math.hypot(sa.P[0] - sd.P[0], sa.P[1] - sd.P[1]) <= 1.9;
        if (r && r.k === W.k && (r.contacts.length || r.legs.some((P) => ["R", "L"].some((X) => P[X].q.some((v) => v))))) lcat.active.push(us); else if (near) lcat.near.push(us); else lcat.idle.push(us); return; }
      if (m !== "S3") return; ticks++;
      const us = W.imp.cpu.length ? W.imp.cpu[W.imp.cpu.length - 1] * 1000 : 0, act = W.players.some((p) => W.ps.get(p).active), sa = W.att.stateAt(W.att.t), sd = W.def.stateAt(W.def.t), near = Math.hypot(sa.P[0] - sd.P[0], sa.P[1] - sd.P[1]) <= 1.9;
      if (act) { activeTicks++; cat.active.push(us); for (const k of Object.keys(part)) part[k].push((T[k] || 0) * 1000); } else if (near) { nearTicks++; cat.near.push(us); } else cat.idle.push(us); }; } }); }
const f1 = (v) => v.toFixed(1), row = (n, A) => `  ${n.padEnd(62)} mean ${f1(mean(A)).padStart(7)} µs · p99 ${f1(q(A, 0.99)).padStart(7)} µs · max ${f1(amax(A)).padStart(8)} µs   (${A.length} ticks)`;
console.log(`PERFORMANCE — ${L.length} encounters (the review set + the matrix) × ${REPS} repetitions, node ${process.version} (one core)`);
console.log(`THE WORLD'S STEP (both players' simulation + the authority + Stage 2's occupancy + Stage 3's impact pass):`); console.log(row("STAGE 2 (as decided)", step.S2D)); console.log(row("OLD STAGE 3", step.S3)); console.log(row("STAGE 3B (the limb pass + Stage 3)", step.S3B));
console.log(`STAGE 3B's LIMB PASS:`); console.log(row("IDLE (far apart, nothing reconciling: one distance test)", lcat.idle)); console.log(row("NEAR (within the broad phase, no limb contact)", lcat.near)); console.log(row("ACTIVE (a limb contact, or a leg reconciling)", lcat.active));
console.log(`STAGE 3's IMPACT PASS:`); console.log(row("IDLE (beyond the broad phase, nobody responding)", cat.idle)); console.log(row("NEAR (within it, no meaningful contact: the contact check)", cat.near)); console.log(row("ACTIVE (an impact episode responding)", cat.active));
console.log(`  of an active pass: both players' response / balance / realisation ${f1(mean(part.player))} µs mean (of it the capture analysis ${f1(mean(part.capture))} µs)`);
console.log(`THE WORST TESTED 60 Hz FRAME (four consecutive steps): STAGE 2 ${f1(amax(frames.S2D) / 1000)} ms · OLD STAGE 3 ${f1(amax(frames.S3) / 1000)} ms · STAGE 3B ${f1(amax(frames.S3B) / 1000)} ms · p99 ${f1(q(frames.S2D, 0.99) / 1000)} / ${f1(q(frames.S3, 0.99) / 1000)} / ${f1(q(frames.S3B, 0.99) / 1000)} ms · mean ${f1(mean(frames.S2D) / 1000)} / ${f1(mean(frames.S3) / 1000)} / ${f1(mean(frames.S3B) / 1000)} ms`);
console.log(`22 PLAYERS (STAGE 3B, an estimate from these costs): the limb pass runs per PAIR within the broad phase (the same proximity test) — ≈ 4 – 8 near pairs, ≈ 1 – 3 of them in a limb contact: ≈ ${f1((6 * mean(lcat.near) + 2 * mean(lcat.active)) / 1000)} ms per tick on top of Stage 3, ${f1(4 * (6 * mean(lcat.near) + 2 * mean(lcat.active)) / 1000)} ms per 60 Hz frame; far pairs: one distance test each`);
console.log(`PER SIMULATED SECOND (240 ticks) in these encounters (${(100 * nearTicks / Math.max(1, ticks)).toFixed(0)} % near, ${(100 * activeTicks / Math.max(1, ticks)).toFixed(0)} % active): the impact pass ≈ ${f1((mean(cat.idle) * cat.idle.length + mean(cat.near) * cat.near.length + mean(cat.active) * cat.active.length) / Math.max(1, ticks) * 240 / 1000)} ms · the step STAGE 2 ${f1(mean(step.S2D) * 240 / 1000)} ms → STAGE 3 ${f1(mean(step.S3) * 240 / 1000)} ms`);
console.log(`22 PLAYERS (an estimate from these costs): the impact pass runs per pair within the broad phase — a dense match moment has ≈ 4 – 8 such pairs, ≈ 1 – 3 of them in contact: ≈ ${f1((6 * mean(cat.near) + 2 * mean(cat.active)) / 1000)} ms per tick, ${f1(4 * (6 * mean(cat.near) + 2 * mean(cat.active)) / 1000)} ms per 60 Hz frame (+ the pair search, a grid: O(N))`);
