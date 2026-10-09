// PI-1 D-1 quick body / integrity check (PI1_PREREGISTRATION.md §4): G0 g0Body on the runner + the G1 ESSENTIAL scenarios with scenarioChecks at the
// accepted world configuration (240 Hz, 150 / 2 iterations, plane turf, v2k knee, ankle neutral K 0.13). V2-REF is run identically as the control,
// so a check that the accepted body itself does not pass under this configuration is identified as such.
// usage (worktree root): V2_KNEE_MODEL=v2k V2_ANKLE_NEUTRAL_K=0.13 node sandbox/visual/physchar2/tools/pi1_body_check.mjs <out.json>
import fs from "fs"; import path from "path"; import { fileURLToPath } from "url";
import { loadJolt } from "../core/v2_jolt.js"; import { g0Body } from "../gates/v2_g0.js"; import { SCENARIOS, ESSENTIAL, runScenario } from "../gates/v2_g1.js";
import { scenarioChecks } from "../gates/v2_g1_checks.js"; import { generateSpec } from "../spec/v2_spec.js"; import { V2_REF } from "../spec/v2_human.js";
import { setAnkleNeutralKOverride } from "../spec/v2_joints.js"; import { PI1_RUNNER, pi1RunnerSpec } from "../spec/v2_pi1_runner.js";
if (process.env.V2_KNEE_MODEL !== "v2k" || process.env.V2_ANKLE_NEUTRAL_K !== "0.13") throw new Error("accepted configuration env required");
const here = path.dirname(fileURLToPath(import.meta.url)), J = await loadJolt(path.join(here, "../vendor/jolt-physics.wasm-compat.js"));
const out = { runner: PI1_RUNNER, g0: {}, g1: {} };
for (const [id, h] of [["runner", PI1_RUNNER], ["V2-REF", V2_REF]]) { const r = g0Body(J, h, {}); out.g0[id] = { pass: r.checks.filter(c => !c.reportOnly).every(c => c.pass), failed: r.checks.filter(c => !c.reportOnly && !c.pass).map(c => ({ id: c.id, name: c.name, value: c.value, limit: c.limit })), n: r.checks.length,
  totals: r.spec.totals ? { mass: r.spec.totals.mass } : null, landmarks: { legLength: r.spec.landmarks.legLength, segLen: r.spec.landmarks.segLen, hipHalf: r.spec.landmarks.hipHalf, shoulderHalf: r.spec.landmarks.shoulderHalf, yA: r.spec.landmarks.yA, yK: r.spec.landmarks.yK, yH: r.spec.landmarks.yH, ySJC: r.spec.landmarks.ySJC } }; }
const specs = { runner: pi1RunnerSpec(), "V2-REF": (() => { setAnkleNeutralKOverride(0.13); return generateSpec(V2_REF); })() };
for (const id of Object.keys(specs)) { out.g1[id] = {};
  for (const key of ESSENTIAL) { const r = runScenario(J, specs[id], key, { passiveOpts: { kneeModel: "v2k" } }), cs = scenarioChecks(r, SCENARIOS[key]);
    out.g1[id][key] = { hash: r.hash, pass: cs.filter(c => !c.reportOnly).every(c => c.pass), failed: cs.filter(c => !c.reportOnly && !c.pass).map(c => ({ id: c.id, name: c.name, value: c.value, limit: c.limit })) };
    console.log(id.padEnd(7), key.padEnd(12), out.g1[id][key].pass ? "pass" : "FAIL " + out.g1[id][key].failed.map(c => c.id).join(",")); } }
const refFail = (key) => new Set(out.g1["V2-REF"][key].failed.map(c => c.id));
out.verdict = { g0: out.g0.runner.pass, g1: ESSENTIAL.every(k => out.g1.runner[k].pass), g1NewFailuresVsRef: ESSENTIAL.flatMap(k => out.g1.runner[k].failed.filter(c => !refFail(k).has(c.id)).map(c => k + ":" + c.id)) };
fs.writeFileSync(process.argv[2], JSON.stringify(out, null, 1)); console.log("G0", out.g0.runner.pass, out.g0.runner.failed.map(c => c.id), "| V2-REF G0", out.g0["V2-REF"].pass, "| G1 runner all pass", out.verdict.g1, "| new failures vs V2-REF", out.verdict.g1NewFailuresVsRef);
