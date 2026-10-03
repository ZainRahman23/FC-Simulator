// ═══ physchar2/tools/g1_boot.js — run the C3 boot experiment (workers) → g1/json/g1_boot.json + table. usage: node tools/g1_boot.js [--workers 8]
import fs from "fs"; import path from "path"; import os from "os"; import { fork } from "child_process"; import { fileURLToPath } from "url";
import { loadJolt } from "../core/v2_jolt.js";
import { generateSpec } from "../spec/v2_spec.js";
import { V2_REF } from "../spec/v2_human.js";
import { runScenario, SCENARIOS } from "../gates/v2_g1.js";
import { scenarioChecks } from "../gates/v2_g1_checks.js";
import { BOOT_REPS, BOOT_SETTINGS, RIG_CASES, FALL_KEYS, bootRig, heldSweep, seamSweep, rollOver } from "../gates/v2_g1_boot.js";
const here = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(here, "../../../.."), VEND = path.join(here, "../vendor/jolt-physics.wasm-compat.js");
if (process.argv.includes("--worker")) { const J = await loadJolt(VEND), cache = {}; const specOf = (rep) => cache[rep] || (cache[rep] = BOOT_REPS[rep](generateSpec(V2_REF)));
  process.on("message", (job) => { if (job === "exit") process.exit(0); try { let r;
    if (job.kind === "rig") r = bootRig(J, specOf(job.rep), job.case, BOOT_SETTINGS[job.set]);
    else if (job.kind === "sweep") r = heldSweep(J, specOf(job.rep), 200, BOOT_SETTINGS[job.set]);
    else if (job.kind === "seam") r = seamSweep(J, specOf(job.rep), BOOT_SETTINGS[job.set]);
    else if (job.kind === "roll") r = rollOver(J, specOf(job.rep), job.case, BOOT_SETTINGS[job.set]);
    else { const x = runScenario(J, specOf(job.rep), job.key, { cfg: BOOT_SETTINGS[job.set] }), cs = scenarioChecks(x, SCENARIOS[job.key]);
      r = { key: job.key, turf: x.contacts.turfPenMaxMm, turfRest: x.contacts.turfPenRestMm, turfRestBody: x.contacts.turfPenRestBody, rise: x.energy.maxRiseJ, sep: x.joints.sepMaxMm, self: x.contacts.selfPenMaxMm,
        fails: cs.filter(c => !c.pass && !c.reportOnly).map(c => c.id), ms: x.cpu.stepMs, hash: x.hash, finite: x.finite, maxSpeed: x.maxSpeed }; }
    process.send({ id: job.id, r }); } catch (e) { process.send({ id: job.id, err: String(e.stack || e) }); } }); process.send({ ready: true }); }
else {
  // v2 (after the passive-drive fixes): rigs at every setting; full-body falls at S0 (Jolt default) and S3 (adopted); the held random-orientation
  // sweep (Jolt-side validation of calc/boot_face_model.py) at S3. The pre-fix run is kept as g1_boot_v1.json.
  const nW = 8, jobs = [], FALL_SETS = ["S0_default", "S3_bothOff"]; let id = 0;
  for (const rep of Object.keys(BOOT_REPS)) jobs.push({ id: id++, kind: "sweep", rep, set: "S3_bothOff" });
  // D1a seam verification (S3 = the adopted contact settings): R1 single hull (no seams) vs R2 C3 2-piece vs R4 10-piece (adopted)
  for (const rep of ["R1_hull", "R2_split2", "R4_grid10"]) { jobs.push({ id: id++, kind: "seam", rep, set: "S3_bothOff" }); for (const c of ["heel", "toe", "medial", "lateral"]) jobs.push({ id: id++, kind: "roll", rep, set: "S3_bothOff", case: c }); }
  for (const rep of Object.keys(BOOT_REPS)) for (const set of Object.keys(BOOT_SETTINGS)) { for (const c of Object.keys(RIG_CASES)) jobs.push({ id: id++, kind: "rig", rep, set, case: c }); if (FALL_SETS.includes(set)) for (const k of FALL_KEYS) jobs.push({ id: id++, kind: "fall", rep, set, key: k }); }
  const out = new Map(), q = jobs.slice(); let done = 0; const t0 = Date.now();
  // workers are RECYCLED every 4 jobs: each rig builds its own Jolt world and the WASM heap does not return all of it (many-piece boots ran
  // the first v2 run out of memory)
  const RECYCLE = 4;
  await new Promise((res) => { const spawn = () => { let n = 0; const cp = fork(fileURLToPath(import.meta.url), ["--worker"], { stdio: ["ignore", "inherit", "inherit", "ipc"] });
      const next = () => { if (n >= RECYCLE && q.length) { cp.send("exit"); spawn(); return; } const j = q.shift(); if (j) { n++; cp.send(j); } else cp.send("exit"); };
      cp.on("message", (m) => { if (m.ready) return next(); if (m.err) console.error(m.err); out.set(m.id, m.r); if (++done === jobs.length) res(); next(); }); };
    for (let i = 0; i < nW; i++) spawn(); });
  const res = jobs.map(j => ({ ...j, r: out.get(j.id) }));
  fs.writeFileSync(path.join(ROOT, "review_artifacts/physical_character_v2/g1/json/g1_boot.json"), JSON.stringify({ generated: "tools/g1_boot.js", seconds: (Date.now() - t0) / 1000, reps: Object.keys(BOOT_REPS), settings: BOOT_SETTINGS, rigCases: RIG_CASES, falls: FALL_KEYS, results: res }, null, 1));
  console.log(`C3 boot experiment: ${jobs.length} runs in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  const f1 = (x, n = 1) => (x == null ? "—" : (+x).toFixed(n));
  console.log("\nRIG per case: first-touch geo / transient max / settled (mm) · normal std ° / max jump ° · manifolds · points · jitter ω rad/s (settled) · creep mm (quiet) · max speed m/s");
  for (const c of Object.keys(RIG_CASES)) { console.log(`\n${c}: ${RIG_CASES[c].title}`); for (const rep of Object.keys(BOOT_REPS)) for (const set of Object.keys(BOOT_SETTINGS)) { const r = res.find(x => x.kind === "rig" && x.rep === rep && x.set === set && x.case === c).r;
    console.log(`  ${rep.padEnd(10)} ${set.padEnd(16)} ${f1(r.firstTouchGeoMm)} / ${f1(r.maxTransientMm)} / ${f1(r.settledMm)} · ${f1(r.normalStdDeg)} / ${f1(r.normalMaxJumpDeg)} · ${f1(r.manifoldsAvg)} · ${f1(r.pointsAvg)} · ${r.jitterW.toExponential(1)}${r.creepMm != null ? " · creep " + f1(r.creepMm, 2) : ""} · ${f1(r.maxSpeed, 2)} · ${r.msPerStep.toFixed(3)} ms`); } }
  console.log("\nFULL-BODY FALLS (V2-REF, 11 standing-fall scenarios): turf transient max / rest max mm · max step energy rise J · joint sep max mm · scenarios passing every criterion · ms/tick");
  for (const rep of Object.keys(BOOT_REPS)) for (const set of Object.keys(BOOT_SETTINGS)) { const F = res.filter(x => x.kind === "fall" && x.rep === rep && x.set === set).map(x => x.r); if (!F.length) continue; const mx = (k) => Math.max(...F.map(x => x[k]));
    console.log(`  ${rep.padEnd(10)} ${set.padEnd(16)} ${f1(mx("turf"))} / ${f1(mx("turfRest"))} · ${f1(mx("rise"), 2)} · ${f1(mx("sep"))} · ${F.filter(x => !x.fails.length).length}/${F.length} · ${(F.reduce((a, x) => a + x.ms, 0) / F.length).toFixed(3)} · turf>10: ${F.filter(x => x.turf > 10).map(x => x.key + " " + x.turf.toFixed(0)).join(", ")}`); }
  console.log("\nHELD SWEEP (loaded boot, rotation locked, 200 random orientations, S3): settled depth p50 / p95 / p99 / max mm · share > 7 mm (slop + 2) · share > 10 mm");
  for (const x of res.filter(x => x.kind === "sweep")) console.log(`  ${x.rep.padEnd(10)} ${f1(x.r.p50, 2)} / ${f1(x.r.p95)} / ${f1(x.r.p99)} / ${f1(x.r.max)} · ${(x.r.overSlopPlus2 * 100).toFixed(1)} % · ${(x.r.over10 * 100).toFixed(1)} %`);
  console.log("\nSEAM VERIFICATION (D1a; S3): held pitch / roll sweep −30…30° — max settled depth / max step between 1° neighbours (mm); roll-over — max depth / settled (mm) · max normal jump ° · max vertical-speed change beyond gravity (m/s per tick) · max energy rise (J)");
  for (const rep of ["R1_hull", "R2_split2", "R4_grid10"]) { const sw = res.find(x => x.kind === "seam" && x.rep === rep); if (sw && sw.r) console.log(`  ${rep.padEnd(10)} pitch ${f1(sw.r.pitch.maxDepthMm, 2)} / ${f1(sw.r.pitch.maxStepMm, 2)} · roll ${f1(sw.r.roll.maxDepthMm, 2)} / ${f1(sw.r.roll.maxStepMm, 2)}`);
    for (const x of res.filter(x => x.kind === "roll" && x.rep === rep)) if (x.r) console.log(`     roll-over ${x.case.padEnd(8)} ${f1(x.r.maxDepthMm, 2)} / ${f1(x.r.settledDepthMm, 2)} · ${f1(x.r.maxNormalJumpDeg, 1)}° · ${f1(x.r.maxVyChangeMs, 3)} · ${f1(x.r.maxEnergyRiseJ, 3)} J`); }
}
