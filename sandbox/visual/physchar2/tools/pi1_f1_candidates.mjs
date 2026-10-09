// D-1F1 candidate-fix characterisation (DIAGNOSTIC ONLY; nothing adopted): the two global solver alternatives that remove the F1 one-step energy rise
// (480 Hz; contact-lambda warm start off) vs the accepted configuration, as G1's existing D4a ensembles (nominal + lift ±1 µm, ±10 µm; RATE_EPS) on the
// rows they fail or fix, plus CPU per simulated second. Criteria are the unchanged G1 rows; this only measures robustness (chaos spread vs systematic).
// usage (worktree root): V2_KNEE_MODEL=v2k V2_ANKLE_NEUTRAL_K=0.13 node sandbox/visual/physchar2/tools/pi1_f1_candidates.mjs <out.json>
import fs from "fs"; import path from "path"; import { fileURLToPath } from "url";
import { loadJolt } from "../core/v2_jolt.js"; import { RATE_EPS, ensembleKey, ensureScenario, runScenario } from "../gates/v2_g1.js"; import { scenarioChecks } from "../gates/v2_g1_checks.js";
import { pi1RunnerSpec, pi1RunnerF1Spec } from "../spec/v2_pi1_runner.js";
if (process.env.V2_KNEE_MODEL !== "v2k" || process.env.V2_ANKLE_NEUTRAL_K !== "0.13") throw new Error("accepted configuration env required");
const here = path.dirname(fileURLToPath(import.meta.url)), J = await loadJolt(path.join(here, "../vendor/jolt-physics.wasm-compat.js"));
const CFG = { "accepted 240 Hz": {}, "480 Hz": { hz: 480 }, "contact warm start off": { contactWarmStart: false } };
const PLAN = [["F1", "accepted 240 Hz", ["drop1m", "leanF", "awkward"]], ["F1", "480 Hz", ["drop1m", "leanF", "awkward"]], ["F1", "contact warm start off", ["drop1m", "leanF", "awkward"]],
  ["F0", "480 Hz", ["awkward"]], ["F0", "contact warm start off", ["awkward", "singleLeg"]], ["F0", "accepted 240 Hz", ["singleLeg"]]];
const mk = { F0: pi1RunnerSpec, F1: pi1RunnerF1Spec }, out = { eps: RATE_EPS, runs: [] };
for (const [body, cfgName, keys] of PLAN) for (const base of keys) for (const eps of RATE_EPS) { const key = ensembleKey(base, eps), sc = ensureScenario(key);
  const r = runScenario(J, mk[body](), key, { passiveOpts: { kneeModel: "v2k" }, cfg: CFG[cfgName] }), cs = scenarioChecks(r, sc), hz = r.cfg.hz;
  const row = { body, cfg: cfgName, key, failed: cs.filter(c => !c.reportOnly && !c.pass).map(c => c.id + "=" + String(c.value).slice(0, 80)), maxRiseJ: +r.energy.maxRiseJ.toFixed(4), engineTicks: r.engine.ticks, engineAxes: r.engine.axes,
    turfPenRestMm: +r.contacts.turfPenRestMm.toFixed(3), selfPenRestMm: +r.contacts.selfPenRestMm.toFixed(3), cpuMsPerSimS: +((r.cpu.stepMs + r.cpu.passiveMs) * hz).toFixed(1) };
  out.runs.push(row); console.log(body, cfgName.padEnd(23), key.padEnd(14), row.failed.length ? "FAIL " + row.failed.map(f => f.split("=")[0]).join("+") : "pass", "rise", row.maxRiseJ, "eng", row.engineTicks, "restPen", row.turfPenRestMm, row.selfPenRestMm, "cpu ms/sim-s", row.cpuMsPerSimS); }
fs.writeFileSync(process.argv[2], JSON.stringify(out, null, 1));
