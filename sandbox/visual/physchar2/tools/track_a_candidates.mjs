// Track A candidates (DIAGNOSTIC ONLY; TRACK_A_MECHANISM_AND_CANDIDATES.md §5, frozen c94ff5d). A process-local per-step contact-cache filter
// on F1's articulated leaf (turf ↔ foot_L / foot_R / toe_L / toe_R of a spec with human.f1): the read cache is saved, the leaf's cached
// non-penetration + friction λ are zeroed according to the mode, and the cache is restored, immediately before each Jolt Step. F0 specs: inactive.
//   identity — save + restore unmodified (emulation sanity: must equal the plain run bit-for-bit)
//   cold     — Cand-1: every step the leaf's contact λ start from zero
//   topology — Cand-2: zero only when the read cache's set of load-bearing leaf manifolds (λ > 0) differs from the previous step's
// usage (worktree root): V2_KNEE_MODEL=v2k V2_ANKLE_NEUTRAL_K=0.13 node sandbox/visual/physchar2/tools/track_a_candidates.mjs <dev|battery> <out.json> [modes,...]
import fs from "fs"; import path from "path"; import { fileURLToPath } from "url"; import { performance } from "perf_hooks";
import { loadJolt, V2JoltWorld } from "../core/v2_jolt.js"; import { SCENARIOS, ESSENTIAL, RATE_EPS, ensembleKey, ensureScenario, runScenario } from "../gates/v2_g1.js"; import { scenarioChecks } from "../gates/v2_g1_checks.js";
import { pi1RunnerSpec, pi1RunnerF1Spec } from "../spec/v2_pi1_runner.js"; import { saveState, restoreState, decodeContacts, editContacts } from "./track_a_lib.mjs";
if (process.env.V2_KNEE_MODEL !== "v2k" || process.env.V2_ANKLE_NEUTRAL_K !== "0.13") throw new Error("accepted configuration env required");
const here = path.dirname(fileURLToPath(import.meta.url)), J = await loadJolt(path.join(here, "../vendor/jolt-physics.wasm-compat.js"));
let MODE = null; const stats = { fires: 0, steps: 0 };
const step0 = V2JoltWorld.prototype.step;
V2JoltWorld.prototype.step = function (dt, cs) { if (MODE && this.spec && this.spec.human && this.spec.human.f1) leafFilter(this); return step0.call(this, dt, cs); };
function leafFilter(w) {
  if (!w._leaf) { w._leaf = new Set(w.spec.bodies.map((b, i) => (/^(foot|toe)_/.test(b.name) ? w.bodies[i].GetID().GetIndexAndSequenceNumber() : null)).filter(x => x != null)); w._gid = w.ground.GetID().GetIndexAndSequenceNumber(); w._prev = null; }
  const S = J.EStateRecorderState_Contacts, bytes = saveState(J, w.ps, S), dec = decodeContacts(bytes); stats.steps++;
  const isLeaf = (mm) => (mm.key.body1 === w._gid && w._leaf.has(mm.key.body2)) || (mm.key.body2 === w._gid && w._leaf.has(mm.key.body1));
  if (MODE === "identity") { restoreState(J, w.ps, bytes); return; }
  let reset = MODE === "cold";
  if (MODE === "topology") { const set = new Set(); for (const p of dec.pairs) for (const mm of p.manifolds) if (isLeaf(mm) && mm.points.some(pt => pt.lambda > 0)) set.add(`${mm.key.body1}:${mm.key.sub1}:${mm.key.body2}:${mm.key.sub2}`);
    reset = w._prev != null && (set.size !== w._prev.size || [...set].some(k => !w._prev.has(k))); w._prev = set; }
  if (!reset) return; stats.fires++;
  const ed = editContacts(bytes, dec, (p, mm, k) => (isLeaf(mm) ? (k == null ? { friction: true } : { normal: true }) : null)); restoreState(J, w.ps, ed.bytes);
}
const mk = { F0: pi1RunnerSpec, F1: pi1RunnerF1Spec };
function run(body, key, mode) { MODE = mode; stats.fires = 0; stats.steps = 0; const t0 = performance.now(), r = runScenario(J, mk[body](), key, { passiveOpts: { kneeModel: "v2k" } }), ms = performance.now() - t0; MODE = null;
  const cs = scenarioChecks(r, ensureScenario(key)), g = (id) => cs.find(c => c.id === id);
  return { body, key, mode: mode || "none", hash: r.hash, maxRiseJ: +r.energy.maxRiseJ.toFixed(4), maxRiseAt: r.energy.maxRiseAt, pass12ab: ["1.2a", "1.2b"].every(id => !g(id) || g(id).pass),
    failed: cs.filter(c => !c.reportOnly && !c.pass).map(c => c.id + "=" + String(c.value).slice(0, 90)), turfPenRestMm: +r.contacts.turfPenRestMm.toFixed(3), turfPenMaxMm: +r.contacts.turfPenMaxMm.toFixed(3), selfPenRestMm: +r.contacts.selfPenRestMm.toFixed(3),
    engineTicks: r.engine.ticks, fires: stats.fires, filterSteps: stats.steps, wallMs: Math.round(ms) }; }
const what = process.argv[2] || "dev", outPath = process.argv[3], modes = (process.argv[4] || "identity,cold,topology").split(","), out = { what, modes, runs: [] };
const log = (r) => { out.runs.push(r); console.log(r.body, r.key.padEnd(16), r.mode.padEnd(9), r.pass12ab ? "1.2a/b ok  " : "1.2a/b FAIL", "rise", r.maxRiseJ, "| fails", r.failed.map(f => f.split("=")[0]).join("+") || "-", "| restPen", r.turfPenRestMm, "| eng", r.engineTicks, "| fires", r.fires, "| hash", r.hash, "|", r.wallMs, "ms"); };
if (what === "dev") { for (const key of ["drop1m", "leanF", "singleLeg"]) { log(run("F1", key, null)); for (const m of modes) log(run("F1", key, m)); } }
if (what === "battery") { const mode = modes[0];
  for (const key of ESSENTIAL) log(run("F1", key, mode));                                                     // §6.3 ESSENTIAL F1 with the fix
  for (const base of ["drop1m", "leanF"]) for (const eps of RATE_EPS) if (eps) log(run("F1", ensembleKey(base, eps), mode));   // §6.2 ensembles (nominal above)
  for (const key of ESSENTIAL) { const a = run("F0", key, null), b = run("F0", key, mode); log(b); out.runs.push({ f0Identity: key, plain: a.hash, withMode: b.hash, identical: a.hash === b.hash }); console.log("F0 identity", key, a.hash === b.hash); }
  for (const key of ["drop1m", "leanF", "singleLeg"]) { const a = run("F1", key, mode), b = run("F1", key, mode); out.runs.push({ determinism: key, a: a.hash, b: b.hash, identical: a.hash === b.hash }); console.log("determinism", key, a.hash === b.hash); }
  for (const key of ["drop1m", "leanF", "upright"]) for (let i = 0; i < 3; i++) { const a = run("F1", key, null), b = run("F1", key, mode); out.runs.push({ cpu: key, plainMs: a.wallMs, modeMs: b.wallMs }); console.log("cpu", key, a.wallMs, b.wallMs); } }
if (outPath) fs.writeFileSync(outPath, JSON.stringify(out, null, 1));
