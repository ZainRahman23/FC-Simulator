// ═══ physchar2/tools/g1_boot.js — run the C3 boot experiment (workers) → g1/json/g1_boot.json + table. usage: node tools/g1_boot.js [--workers 8]
import fs from "fs"; import path from "path"; import os from "os"; import { fork } from "child_process"; import { fileURLToPath } from "url";
import { loadJolt } from "../core/v2_jolt.js";
import { generateSpec } from "../spec/v2_spec.js";
import { V2_REF } from "../spec/v2_human.js";
import { runScenario, SCENARIOS } from "../gates/v2_g1.js";
import { scenarioChecks } from "../gates/v2_g1_checks.js";
import { BOOT_REPS, BOOT_SETTINGS, RIG_CASES, FALL_KEYS, bootRig } from "../gates/v2_g1_boot.js";
const here = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(here, "../../../.."), VEND = path.join(here, "../vendor/jolt-physics.wasm-compat.js");
if (process.argv.includes("--worker")) { const J = await loadJolt(VEND), cache = {}; const specOf = (rep) => cache[rep] || (cache[rep] = BOOT_REPS[rep](generateSpec(V2_REF)));
  process.on("message", (job) => { if (job === "exit") process.exit(0); try { let r;
    if (job.kind === "rig") r = bootRig(J, specOf(job.rep), job.case, BOOT_SETTINGS[job.set]);
    else { const x = runScenario(J, specOf(job.rep), job.key, { cfg: BOOT_SETTINGS[job.set] }), cs = scenarioChecks(x, SCENARIOS[job.key]);
      r = { key: job.key, turf: x.contacts.turfPenMaxMm, turfRest: x.contacts.turfPenRestMm, turfRestBody: x.contacts.turfPenRestBody, rise: x.energy.maxRiseJ, sep: x.joints.sepMaxMm, self: x.contacts.selfPenMaxMm,
        fails: cs.filter(c => !c.pass && !c.reportOnly).map(c => c.id), ms: x.cpu.stepMs, hash: x.hash, finite: x.finite, maxSpeed: x.maxSpeed }; }
    process.send({ id: job.id, r }); } catch (e) { process.send({ id: job.id, err: String(e.stack || e) }); } }); process.send({ ready: true }); }
else {
  const nW = 8, jobs = []; let id = 0;
  for (const rep of Object.keys(BOOT_REPS)) for (const set of Object.keys(BOOT_SETTINGS)) { for (const c of Object.keys(RIG_CASES)) jobs.push({ id: id++, kind: "rig", rep, set, case: c }); for (const k of FALL_KEYS) jobs.push({ id: id++, kind: "fall", rep, set, key: k }); }
  const out = new Map(), q = jobs.slice(); let done = 0; const t0 = Date.now();
  await new Promise((res) => { for (let i = 0; i < nW; i++) { const cp = fork(fileURLToPath(import.meta.url), ["--worker"], { stdio: ["ignore", "inherit", "inherit", "ipc"] }); const next = () => { const j = q.shift(); cp.send(j || "exit"); };
    cp.on("message", (m) => { if (m.ready) return next(); if (m.err) console.error(m.err); out.set(m.id, m.r); if (++done === jobs.length) res(); next(); }); } });
  const res = jobs.map(j => ({ ...j, r: out.get(j.id) }));
  fs.writeFileSync(path.join(ROOT, "review_artifacts/physical_character_v2/g1/json/g1_boot.json"), JSON.stringify({ generated: "tools/g1_boot.js", seconds: (Date.now() - t0) / 1000, reps: Object.keys(BOOT_REPS), settings: BOOT_SETTINGS, rigCases: RIG_CASES, falls: FALL_KEYS, results: res }, null, 1));
  console.log(`C3 boot experiment: ${jobs.length} runs in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  const f1 = (x, n = 1) => (x == null ? "—" : (+x).toFixed(n));
  console.log("\nRIG per case: first-touch geo / transient max / settled (mm) · normal std ° / max jump ° · manifolds · points · jitter ω rad/s (settled) · creep mm (quiet) · max speed m/s");
  for (const c of Object.keys(RIG_CASES)) { console.log(`\n${c}: ${RIG_CASES[c].title}`); for (const rep of Object.keys(BOOT_REPS)) for (const set of Object.keys(BOOT_SETTINGS)) { const r = res.find(x => x.kind === "rig" && x.rep === rep && x.set === set && x.case === c).r;
    console.log(`  ${rep.padEnd(10)} ${set.padEnd(16)} ${f1(r.firstTouchGeoMm)} / ${f1(r.maxTransientMm)} / ${f1(r.settledMm)} · ${f1(r.normalStdDeg)} / ${f1(r.normalMaxJumpDeg)} · ${f1(r.manifoldsAvg)} · ${f1(r.pointsAvg)} · ${r.jitterW.toExponential(1)}${r.creepMm != null ? " · creep " + f1(r.creepMm, 2) : ""} · ${f1(r.maxSpeed, 2)} · ${r.msPerStep.toFixed(3)} ms`); } }
  console.log("\nFULL-BODY FALLS (V2-REF, 11 standing-fall scenarios): turf transient max / rest max mm · max step energy rise J · joint sep max mm · scenarios passing every criterion · ms/tick");
  for (const rep of Object.keys(BOOT_REPS)) for (const set of Object.keys(BOOT_SETTINGS)) { const F = res.filter(x => x.kind === "fall" && x.rep === rep && x.set === set).map(x => x.r), mx = (k) => Math.max(...F.map(x => x[k]));
    console.log(`  ${rep.padEnd(10)} ${set.padEnd(16)} ${f1(mx("turf"))} / ${f1(mx("turfRest"))} · ${f1(mx("rise"), 2)} · ${f1(mx("sep"))} · ${F.filter(x => !x.fails.length).length}/${F.length} · ${(F.reduce((a, x) => a + x.ms, 0) / F.length).toFixed(3)} · turf>10: ${F.filter(x => x.turf > 10).map(x => x.key + " " + x.turf.toFixed(0)).join(", ")}`); }
}
