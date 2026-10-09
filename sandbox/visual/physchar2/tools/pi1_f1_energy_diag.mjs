// D-1F1 regression diagnosis (DIAGNOSTIC ONLY — nothing here is adopted; every variant is a separate process-local configuration):
//   (1) localisation of the leanF / drop1m one-step energy rise (G1 1.2a / 1.2b) — toe passive law, articulation, geometry, solver settings;
//   (2) singleLeg 1.4f — F1 vs the same record-length boot as ONE rigid body;
//   (3) decision evidence: the full G1 ESSENTIAL set, F0 and F1, under each solver-level alternative that removes the rise.
// usage (worktree root): V2_KNEE_MODEL=v2k V2_ANKLE_NEUTRAL_K=0.13 node sandbox/visual/physchar2/tools/pi1_f1_energy_diag.mjs <out.json>
import fs from "fs"; import path from "path"; import { fileURLToPath } from "url";
import { loadJolt, V2JoltWorld } from "../core/v2_jolt.js"; import { SCENARIOS, ESSENTIAL, runScenario } from "../gates/v2_g1.js"; import { scenarioChecks } from "../gates/v2_g1_checks.js";
import { pi1RunnerSpec, pi1RunnerF1Spec } from "../spec/v2_pi1_runner.js";
if (process.env.V2_KNEE_MODEL !== "v2k" || process.env.V2_ANKLE_NEUTRAL_K !== "0.13") throw new Error("accepted configuration env required");
const here = path.dirname(fileURLToPath(import.meta.url)), J = await loadJolt(path.join(here, "../vendor/jolt-physics.wasm-compat.js"));
// MTP-only warm-start reset: monkeypatched on the prototype for this process only, switched per run
const step0 = V2JoltWorld.prototype.step; let mtpReset = false;
V2JoltWorld.prototype.step = function (dt, cs) { if (mtpReset) for (const { j, c } of this.cons) if (/^mtp_/.test(j.name)) c.ResetWarmStart(); return step0.call(this, dt, cs); };
// the F1 record-length boot (10 rear + 4 front pieces) on ONE rigid foot with the F0 foot's mass, COM and inertia ("lengthened rigid boot")
function mergedRigid() { const s = pi1RunnerF1Spec(), f0 = pi1RunnerSpec();
  for (const sd of ["L", "R"]) { const fi = s.bodies.findIndex(b => b.name === "foot_" + sd), t = s.bodies.find(b => b.name === "toe_" + sd), f = s.bodies[fi], g = f0.bodies[fi], d = t.origin.map((x, k) => x - f.origin[k]);
    f.shapes = f.shapes.concat(t.shapes.map(h => ({ ...h, pos: h.pos.map((x, k) => x + d[k]) }))); for (const k of ["mass", "com", "inertia", "comLocal", "massBody", "massEquip", "comBody", "inertiaBody", "comBodyLocal"]) f[k] = g[k]; }
  const n = s.bodies.findIndex(b => /^toe_/.test(b.name)); s.bodies = s.bodies.slice(0, n); s.joints = s.joints.filter(j => !/^mtp_/.test(j.name)); s.disabledPairs = s.disabledPairs.filter(([a, b]) => a < n && b < n); return s; }
function engineLockedToe() { const s = pi1RunnerF1Spec(), c0 = -15 * Math.PI / 180; for (const j of s.joints) if (/^mtp_/.test(j.name)) { j.limits.engine.lo[1] = c0; j.limits.engine.hi[1] = c0; } return s; }   // toe held at 0° anatomical
const mtpOff = (what) => ({ diagJoint: { mtp_L: { [what]: false }, mtp_R: { [what]: false } } });
function run(spec, key, o = {}) { mtpReset = !!o.mtpReset; const r = runScenario(J, spec, key, { passiveOpts: { kneeModel: "v2k", ...(o.passive || {}) }, ...(o.cfg ? { cfg: o.cfg } : {}) }); mtpReset = false;
  const cs = scenarioChecks(r, SCENARIOS[key]), g = (id) => cs.find(c => c.id === id);
  return { hash: r.hash, maxRiseJ: +r.energy.maxRiseJ.toFixed(4), maxRiseAt: r.energy.maxRiseAt, monoViolJ: +r.energy.monoViolJ.toFixed(4), e12: ["1.2a", "1.2b"].map(id => g(id) && g(id).pass), r14f: g("1.4f") ? { pass: g("1.4f").pass, value: g("1.4f").value } : null,
    failed: cs.filter(c => !c.reportOnly && !c.pass).map(c => c.id + "=" + String(c.value).slice(0, 90)), cpuStepMs: r.cpu ? r.cpu.stepMsPerTick : null }; }
const out = { localisation: {}, singleLeg14f: {}, alternatives: {} };
const LOC = [["F0", pi1RunnerSpec, {}], ["F1 frozen", pi1RunnerF1Spec, {}], ["F1, MTP elastic terms off", pi1RunnerF1Spec, { passive: mtpOff("elastic") }], ["F1, MTP damping off", pi1RunnerF1Spec, { passive: mtpOff("damping") }],
  ["F1, toe engine-locked at 0°", engineLockedToe, {}], ["record-length boot as one rigid body", mergedRigid, {}], ["F1, MTP-only joint warm-start reset", pi1RunnerF1Spec, { mtpReset: true }],
  ["F1, joint warm start off (all joints)", pi1RunnerF1Spec, { cfg: { jointWarmStart: false } }], ["F1, contact warm start off", pi1RunnerF1Spec, { cfg: { contactWarmStart: false } }],
  ["F1, all warm start off", pi1RunnerF1Spec, { cfg: { warmStart: false, contactWarmStart: false } }], ["F1, 600 velocity iterations", pi1RunnerF1Spec, { cfg: { velSteps: 600 } }],
  ["F1, 10 position iterations", pi1RunnerF1Spec, { cfg: { posSteps: 10 } }], ["F1, 480 Hz", pi1RunnerF1Spec, { cfg: { hz: 480 } }]];
for (const key of ["drop1m", "leanF"]) { out.localisation[key] = {}; for (const [l, mk, o] of LOC) { const r = run(mk(), key, o); out.localisation[key][l] = r; console.log(key.padEnd(7), l.padEnd(40), "rise", r.maxRiseJ, "J @", r.maxRiseAt, "| 1.2a/b", r.e12.map(x => x ? "ok" : "FAIL").join("/")); } }
for (const [l, mk] of [["F0", pi1RunnerSpec], ["F1 frozen", pi1RunnerF1Spec], ["record-length boot as one rigid body", mergedRigid]]) { const r = run(mk(), "singleLeg"); out.singleLeg14f[l] = r.r14f; console.log("singleLeg", l.padEnd(38), JSON.stringify(r.r14f)); }
const ALT = [["accepted (240 Hz, contact warm start on)", {}], ["contact warm start off", { cfg: { contactWarmStart: false } }], ["480 Hz", { cfg: { hz: 480 } }]];
for (const [l, o] of ALT) { out.alternatives[l] = {}; for (const [id, mk] of [["F0", pi1RunnerSpec], ["F1", pi1RunnerF1Spec]]) { out.alternatives[l][id] = {};
  for (const key of ESSENTIAL) { const r = run(mk(), key, o); out.alternatives[l][id][key] = { hash: r.hash, failed: r.failed, maxRiseJ: r.maxRiseJ }; }
  console.log("ALT", l.padEnd(42), id, ESSENTIAL.map(k => k + (out.alternatives[l][id][k].failed.length ? ":" + out.alternatives[l][id][k].failed.map(f => f.split("=")[0]).join("+") : ":ok")).join(" ")); } }
fs.writeFileSync(process.argv[2], JSON.stringify(out, null, 1));
