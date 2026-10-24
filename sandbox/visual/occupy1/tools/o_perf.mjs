// occupy1/tools/o_perf.mjs — §33 PERFORMANCE: what Player Occupancy V1 costs per tick, per frame (60 Hz = 4 ticks), per simulated second (240
// ticks), measured on the review cases and the torture's long runs, the world's own step timed OLD vs OCCUPANCY and the occupancy pass split:
//   IDLE — the roots beyond the broad phase (1.9 m): one distance test
//   NEAR — within it: both bodies posed live (PlayBody — the drawn body; a game poses it for rendering anyway), 11 + 11 volumes, 121 pairs
//          detected, nothing to resolve
//   ACTIVE — a correction applied (the solve, the soft wall's relative path, the plan shifted, footholds / swing paths)
//   ACCESS — the ball-access occlusion: the legs' record per near tick (legThrough × 2) + the gate at each contact
// The occupancy's own methods are timed by wrapping them on the instance (no change to o_world.js).   node o_perf.mjs [--reps 3]
import { ENV } from "./o_env.mjs";
import { OCASES } from "../o_cases.js";
import { runO } from "../o_run.js";
import { volumesOf, legThrough } from "../o_volumes.js";
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; }, REPS = +arg("reps", 3), now = () => performance.now();
const q = (A, p) => { if (!A.length) return 0; const s = Float64Array.from(A).sort(); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; }, mean = (A) => (A.length ? A.reduce((a, b) => a + b, 0) / A.length : 0), amax = (A) => A.reduce((m, x) => (x > m ? x : m), 0);
const step = { OLD: [], OCC: [] }, cat = { idle: [], near: [], active: [] }, part = { pose: [], shift: [], wall: [], feet: [], gate: [] }; let nearTicks = 0, ticks = 0;
for (let rep = 0; rep < REPS; rep++) for (const tc of OCASES) for (const m of ["OLD", "OCC"]) {
  runO(ENV, tc, m, { record: false, before: (W) => { const s0 = W.step.bind(W); let curK = null; const T = {};
    // (the occupancy's methods, timed on this instance)
    if (m === "OCC") for (const [name, key] of [["livePoses", "pose"], ["shiftPlan", "shift"], ["softWall", "wall"], ["footholds", "feet"], ["swingPath", "feet"], ["accessBlocked", "gate"]]) { const f = W[name].bind(W); W[name] = (...a) => { const c = now(), r = f(...a); T[key] = (T[key] || 0) + (now() - c); return r; }; }
    W.step = (a, d) => { for (const k of Object.keys(T)) T[k] = 0; const c = now(); s0(a, d); const dt = (now() - c) * 1000; step[m].push(dt); if (m !== "OCC") return; ticks++;
      const L = W.occ.log[W.occ.log.length - 1], here = L && L.k === W.k; if (!here) cat.idle.push(dt); else { nearTicks++; (L.acted ? cat.active : cat.near).push(L.us); for (const k of Object.keys(part)) if (T[k] != null) part[k].push(T[k] * 1000); } void curK; }; } }); }
// (ACCESS: the legs' record per near tick — legThrough × 2 on posed volumes — timed in isolation on poses of the review cases)
const r = runO(ENV, OCASES.find((x) => x.id === "headon-jog"), "OCC"), F = [...r.W.frames.values()].slice(0, 600); let c0 = now(); for (const fr of F) { const va = volumesOf(fr.a.J), vd = volumesOf(fr.d.J); legThrough(va, vd, "R"); legThrough(va, vd, "L"); legThrough(vd, va, "R"); legThrough(vd, va, "L"); } const accUs = (now() - c0) * 1000 / F.length;
c0 = now(); for (const fr of F) { volumesOf(fr.a.J); volumesOf(fr.d.J); } const volUs = (now() - c0) * 1000 / F.length;
const f1 = (v) => v.toFixed(1), row = (n, A) => `  ${n.padEnd(58)} mean ${f1(mean(A)).padStart(7)} µs · p99 ${f1(q(A, 0.99)).padStart(7)} µs · max ${f1(amax(A)).padStart(8)} µs   (${A.length} ticks)`;
console.log(`PERFORMANCE — ${OCASES.length} review cases × ${REPS} repetitions, node ${process.version} (one core)`);
console.log(`THE WORLD'S STEP (both players' simulation + the authority + occupancy):`); console.log(row("OLD (Shared Possession + Reaction V1)", step.OLD)); console.log(row("OCCUPANCY V1", step.OCC));
console.log(`THE OCCUPANCY PASS:`); console.log(row("IDLE (beyond the broad phase: the whole step)", cat.idle)); console.log(row("NEAR (posed, detected, nothing to resolve: the pass)", cat.near)); console.log(row("ACTIVE (a correction applied: the pass)", cat.active));
console.log(`  of a near / active pass: posing both bodies live ${f1(mean(part.pose))} µs mean · the soft wall's relative path ${f1(mean(part.wall))} µs · shifting the plans ${f1(mean(part.shift))} µs · footholds + swing paths ${f1(mean(part.feet))} µs · the ball-access gate ${f1(mean(part.gate))} µs`);
console.log(`  the volumes of two posed bodies ${f1(volUs)} µs · the BALL-ACCESS record (4 × legThrough) ${f1(accUs)} µs per near tick`);
const nearShare = nearTicks / Math.max(1, ticks), passMean = mean([...cat.near, ...cat.active]);
console.log(`PER SIMULATED SECOND (240 ticks) in these cases (${(nearShare * 100).toFixed(0)} % of ticks near): occupancy ≈ ${f1(passMean * 240 * nearShare / 1000)} ms, of it posing ≈ ${f1(mean(part.pose) * 240 * nearShare / 1000)} ms (shared with rendering in a game) · step OLD ${f1(mean(step.OLD) * 240 / 1000)} ms → OCC ${f1(mean(step.OCC) * 240 / 1000)} ms`);
console.log(`PER FRAME (60 Hz = 4 ticks), the worst case (both players near every tick): ${f1(passMean * 4 / 1000)} ms mean, ${f1(q([...cat.near, ...cat.active], 0.99) * 4 / 1000)} ms p99`);
