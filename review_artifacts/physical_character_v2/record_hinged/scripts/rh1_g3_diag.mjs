// RH1 G3 DIAGNOSTIC (read-only, after the gate run; NOT a candidate search): the RH1 G3 failures in V2-REF's rows (G: T7 speed ramps; H3: aborts
// in nominal T7; K′: T11 excessive requests) re-run with the frozen G3 simulation exactly as tools/g3_run.js runJob does (stand
// { timeIK: true } + the run-wide xstand {"ikRefTwist":true,"lifecycle":true}; adopted-configuration env), on one body per process:
//   RH1 (reproduction: the result hashes must equal the battery's; only RH1 is compared — the battery ran no other body in these rows), R0 = PI1-runner-vinicius (was not run in V2-REF's G3 rows by the battery: is the
//   failure inherited from the record morphology?), and the in-memory ATTRIBUTION variants trunk-only / elbow-only (never in any body set; not proposed).
// Row logic per job as the frozen evaluators (gates/v2_g3_checks.js): G = T7 4 s / 2 s ramps "stood or recovered; slip ≤ 1 mm; no abort; hold mean ≥ 0.93";
// H3 = no abort in the nominal T7 ramps 4 / 2 / 1 s; K′ with the
// body's own k_premise margins (λ 1.2 / 1.4 margins are identical for R0, RH1 and both variants: hinge-only leaves the feet / hips unchanged).
// usage (from sandbox/visual/physchar2, env V2_KNEE_MODEL=v2k V2_ANKLE_NEUTRAL_K=0.13): node <this> <RH1|R0|trunk|elbow> [battery g3_results_rh1.json] [out.json]
import fs from "fs"; import path from "path";
const P2 = path.resolve(process.cwd()), imp = (f) => import(path.join(P2, f));
const { loadJolt } = await imp("core/v2_jolt.js"), { generateSpec, specHash } = await imp("spec/v2_spec.js"), { G3Sim, g3Def } = await imp("gates/v2_g3.js");
const { PI1_RUNNER } = await imp("spec/v2_pi1_runner.js"), { PI1_RUNNER_RH1 } = await imp("spec/v2_pi1_runner_rh.js");
const H = PI1_RUNNER_RH1.hinges, WHO = process.argv[2], BAT = process.argv[3] ? JSON.parse(fs.readFileSync(process.argv[3])) : null, OUT = process.argv[4];
const human = { RH1: PI1_RUNNER_RH1, R0: PI1_RUNNER, trunk: { ...PI1_RUNNER, id: "diag-trunk-only", hinges: { lumbar: H.lumbar, thoracic: H.thoracic, source: "diagnostic" } },
  elbow: { ...PI1_RUNNER, id: "diag-elbow-only", hinges: { elbow: H.elbow, source: "diagnostic" } } }[WHO];
const Jolt = await loadJolt(path.join(P2, "vendor/jolt-physics.wasm-compat.js")), spec = generateSpec(human), XSTAND = { ikRefTwist: true, lifecycle: true };
const KEYS = ["T7:R:4", "T7:R:2", "T7:R:1", "T7:L:4", "T7:L:2", "T7:L:1", "T11:over:1.2", "T11:over:1.4", "T11:over:1.4:sup", "T11:fast:0.25", "T11:fast:0.1"], rows = [];
for (const key of KEYS) { const def = g3Def(key), s = new G3Sim(Jolt, spec, def, { stand: { timeIK: true, ...XSTAND } });
  while (s.tick()) { if (s.g2acc.fallT != null && s.g3.last.t > s.g2acc.fallT + 0.5) break; }
  const r = s.g3summary(); s.destroy();
  const bat = WHO === "RH1" && BAT && BAT.jobs.find(j => j.key === key && j.group === key.split(":")[0] && JSON.stringify(j.stand || {}) === JSON.stringify(j.xstand || {}) && !j.stance && !j.sup && j.res);
  const st = key.startsWith("T7") ? key.split(":")[1] : "R", h = r.g3.holds && r.g3.holds[st], slip = Math.max(...r.g3.feet.map(f => f.slipMm));
  const o = { body: WHO, spec: specHash(spec), key, hash: r.hash, batteryHash: bat ? bat.res.hash : null, outcome: r.outcome, holdMean: h ? h.loadMean : null, abortT: r.g3.abortT, slipMm: slip,
    gRow: /^T7:.:[42]$/.test(key) ? ["stood", "recovered"].includes(r.outcome) && slip <= 1 && r.g3.abortT == null && h && h.loadMean >= 0.93 : null, h3Abort: key.startsWith("T7") ? r.g3.abortT != null : null };
  rows.push(o); console.log(`${WHO.padEnd(6)} ${key.padEnd(18)} hash ${r.hash}${bat ? (bat.res.hash === r.hash ? " (= battery)" : ` (battery ${bat.res.hash} DIFFERS)`) : ""} · ${r.outcome} · hold mean ${h ? h.loadMean.toFixed(3) : "—"} · abort ${r.g3.abortT == null ? "—" : r.g3.abortT.toFixed(2) + " s"} · slip ${slip.toFixed(2)} mm${o.gRow !== null ? ` · G ${o.gRow ? "✓" : "✗"}` : ""}${o.h3Abort ? " · H3 abort" : ""}`); }
if (OUT) fs.writeFileSync(OUT, JSON.stringify({ tool: "rh1_g3_diag.mjs", body: WHO, xstand: XSTAND, rows }, null, 1));
