// D-1F1 leaf-local probes (DIAGNOSTIC ONLY; nothing adopted): which property of the separate toe body produces the drop1m / leanF one-step energy rise
// at the accepted configuration (240 Hz, 150 / 2, contact + joint warm start on). Each probe changes ONE thing inside the foot / toe leaf.
// T4 moves mass without COM / inertia closure: a crude sensitivity probe only.
// usage (worktree root): V2_KNEE_MODEL=v2k V2_ANKLE_NEUTRAL_K=0.13 node sandbox/visual/physchar2/tools/pi1_f1_toe_variants.mjs <out.json>
import fs from "fs"; import path from "path"; import { fileURLToPath } from "url";
import { loadJolt } from "../core/v2_jolt.js"; import { SCENARIOS, runScenario } from "../gates/v2_g1.js"; import { scenarioChecks } from "../gates/v2_g1_checks.js"; import { pi1RunnerF1Spec } from "../spec/v2_pi1_runner.js";
if (process.env.V2_KNEE_MODEL !== "v2k" || process.env.V2_ANKLE_NEUTRAL_K !== "0.13") throw new Error("accepted configuration env required");
const here = path.dirname(fileURLToPath(import.meta.url)), J = await loadJolt(path.join(here, "../vendor/jolt-physics.wasm-compat.js"));
const toes = (s) => s.bodies.filter(b => /^toe_/.test(b.name)), feet = (s) => s.bodies.filter(b => /^foot_/.test(b.name));
const V = {
  "F1 frozen": () => pi1RunnerF1Spec(),
  "T1 toe collider = one hull (4 pieces merged)": () => { const s = pi1RunnerF1Spec(); for (const t of toes(s)) t.shapes = [{ ...t.shapes[0], points: t.shapes.flatMap(h => h.points) }]; return s; },
  "T2 toe body kept, turf contact removed (5 mm hull at the hinge)": () => { const s = pi1RunnerF1Spec(); for (const t of toes(s)) t.shapes = [{ ...t.shapes[0], points: [[-0.005, 0, 0], [0.005, 0, 0], [0, 0.005, 0], [0, 0, 0.005], [0, -0.004, 0.002]] }]; return s; },
  "T3 toe inertia x4": () => { const s = pi1RunnerF1Spec(); for (const t of toes(s)) t.inertia = t.inertia.map(r => r.map(x => 4 * x)); return s; },
  "T4 toe mass 18 % (spec upper bound; crude)": () => { const s = pi1RunnerF1Spec(); for (const sd of ["L", "R"]) { const f = s.bodies.find(b => b.name === "foot_" + sd), t = s.bodies.find(b => b.name === "toe_" + sd), k = 0.18 * (f.mass + t.mass) / t.mass, dm = t.mass * (k - 1); t.inertia = t.inertia.map(r => r.map(x => k * x)); t.mass += dm; f.mass -= dm; } return s; },
  "T5a toe collider starts 10 mm ahead of the hinge": () => { const s = pi1RunnerF1Spec(); for (const t of toes(s)) t.shapes = t.shapes.map(h => ({ ...h, points: h.points.map(p => [p[0], p[1], Math.max(p[2], 0.010)]) })); return s; },
  "T5b toe collider starts 20 mm ahead of the hinge": () => { const s = pi1RunnerF1Spec(); for (const t of toes(s)) t.shapes = t.shapes.map(h => ({ ...h, points: h.points.map(p => [p[0], p[1], Math.max(p[2], 0.020)]) })); return s; },
  "T5c rear collider ends 10 mm behind the hinge": () => { const s = pi1RunnerF1Spec(); for (const f of feet(s)) { const z = Math.max(...f.shapes.flatMap(h => h.points.map(p => p[2]))); f.shapes = f.shapes.map(h => ({ ...h, points: h.points.map(p => [p[0], p[1], Math.min(p[2], z - 0.010)]) })); } return s; },
  "T5d rear collider ends 20 mm behind the hinge": () => { const s = pi1RunnerF1Spec(); for (const f of feet(s)) { const z = Math.max(...f.shapes.flatMap(h => h.points.map(p => p[2]))); f.shapes = f.shapes.map(h => ({ ...h, points: h.points.map(p => [p[0], p[1], Math.min(p[2], z - 0.020)]) })); } return s; } };
const out = {};
for (const key of ["drop1m", "leanF"]) { out[key] = {}; for (const [l, mk] of Object.entries(V)) { const r = runScenario(J, mk(), key, { passiveOpts: { kneeModel: "v2k" } }), cs = scenarioChecks(r, SCENARIOS[key]);
  out[key][l] = { maxRiseJ: +r.energy.maxRiseJ.toFixed(4), maxRiseAt: r.energy.maxRiseAt, pass12ab: ["1.2a", "1.2b"].every(id => cs.find(c => c.id === id).pass), hash: r.hash };
  console.log(key.padEnd(7), l.padEnd(66), out[key][l].pass12ab ? "1.2a/b ok  " : "1.2a/b FAIL", "rise", out[key][l].maxRiseJ, "@", out[key][l].maxRiseAt); } }
fs.writeFileSync(process.argv[2], JSON.stringify(out, null, 1));
