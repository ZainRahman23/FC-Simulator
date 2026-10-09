// D-1F1 body-level regression (CORRECTION_DESIGN_FROZEN.md §2, 7c090de): the F1 runner vs the frozen F0 runner — G0 construction checks, the G1 ESSENTIAL
// scenarios at the accepted configuration (240 Hz, 150 / 2, plane turf, v2k knee, ankle K 0.13), determinism ×2, MTP hard-limit margins, energy.
// usage (worktree root): V2_KNEE_MODEL=v2k V2_ANKLE_NEUTRAL_K=0.13 node sandbox/visual/physchar2/tools/pi1_f1_regression.mjs <out.json>
import fs from "fs"; import path from "path"; import { fileURLToPath } from "url";
import { loadJolt, V2JoltWorld } from "../core/v2_jolt.js"; import { generateSpec, fnv1a } from "../spec/v2_spec.js"; import { bootHull } from "../spec/v2_colliders.js"; import { humanLandmarks } from "../spec/v2_human.js"; import { f1BootParts } from "../spec/v2_f1.js"; import { setAnkleNeutralKOverride } from "../spec/v2_joints.js"; import { g0Body } from "../gates/v2_g0.js"; import { SCENARIOS, ESSENTIAL, runScenario } from "../gates/v2_g1.js";
import { scenarioChecks } from "../gates/v2_g1_checks.js"; import { PI1_RUNNER, PI1_RUNNER_F1, pi1RunnerSpec, pi1RunnerF1Spec } from "../spec/v2_pi1_runner.js";
if (process.env.V2_KNEE_MODEL !== "v2k" || process.env.V2_ANKLE_NEUTRAL_K !== "0.13") throw new Error("accepted configuration env required");
const here = path.dirname(fileURLToPath(import.meta.url)), J = await loadJolt(path.join(here, "../vendor/jolt-physics.wasm-compat.js"));
const out = { g0: {}, g1: {}, determinism: {}, mtp: {} };
{ const r = g0Body(J, PI1_RUNNER, {}); out.g0.F0 = { n: r.checks.length, failed: r.checks.filter(c => !c.reportOnly && !c.pass).map(c => ({ id: c.id, name: c.name, value: String(c.value).slice(0, 200), limit: c.limit })) }; }
// F1 construction checks (G0's checks are written for the rigid single-piece boot; they are not edited)
{ setAnkleNeutralKOverride(0.13); const S1 = generateSpec(PI1_RUNNER_F1), S0 = generateSpec(PI1_RUNNER), h = [0, 1, 2].map(() => fnv1a(JSON.stringify(generateSpec(PI1_RUNNER_F1))).toString(16)), chk = [], add = (id, name, pass, value) => chk.push({ id, name, pass: !!pass, value });
  add("F1.1", "spec generation deterministic ×3", h.every(x => x === h[0]), h.join(" "));
  const Lm = humanLandmarks(PI1_RUNNER_F1);
  for (const sd of ["L", "R"]) { const f0 = S0.bodies.find(b => b.name === "foot_" + sd), f = S1.bodies.find(b => b.name === "foot_" + sd), t = S1.bodies.find(b => b.name === "toe_" + sd), m = f.mass + t.mass, c = [0, 1, 2].map(k => (f.com[k] * f.mass + t.com[k] * t.mass) / m);
    const par = (mm, d) => { const dd = d[0] * d[0] + d[1] * d[1] + d[2] * d[2]; return [0, 1, 2].map(i => [0, 1, 2].map(j => mm * ((i === j ? dd : 0) - d[i] * d[j]))); }, I = [0, 1, 2].map(i => [0, 1, 2].map(j => f.inertia[i][j] + t.inertia[i][j] + par(f.mass, [0, 1, 2].map(k => f.com[k] - c[k]))[i][j] + par(t.mass, [0, 1, 2].map(k => t.com[k] - c[k]))[i][j]));
    const dI = Math.max(...[0, 1, 2].flatMap(i => [0, 1, 2].map(j => Math.abs(I[i][j] - f0.inertia[i][j]))));
    add("F1.2" + sd, `foot_${sd} + toe_${sd} = the F0 foot (mass, COM, inertia)`, Math.abs(m - f0.mass) < 1e-9 && Math.max(...c.map((x, k) => Math.abs(x - f0.com[k]))) < 1e-9 && dI < 1e-9, `Δm ${Math.abs(m - f0.mass).toExponential(1)} ΔCOM ${Math.max(...c.map((x, k) => Math.abs(x - f0.com[k]))).toExponential(1)} ΔI ${dI.toExponential(1)}`);
    const g = sd === "R" ? 1 : -1, full = bootHull(Lm, f, g), zs = full.map(p => p[2]), toeO = [0, 1, 2].map(k => t.origin[k] - f.origin[k]);
    add("F1.3" + sd, "boot heel / tip / MTP hinge = the record (0.0808 / 0.2752 / 0.1805 ahead, 0.031 above the studs)", Math.abs(-Math.min(...zs) - 0.08076356756756757) < 1e-9 && Math.abs(Math.max(...zs) - 0.2751943783783784) < 1e-9 && Math.abs(toeO[2] - 0.1805) < 1e-12 && Math.abs(t.origin[1] - 0.031) < 1e-9, `heel ${(-Math.min(...zs)).toFixed(4)} tip ${Math.max(...zs).toFixed(4)} hinge ${toeO.map(x => x.toFixed(4))} h ${t.origin[1].toFixed(4)}`);
    const pieces = [...f.shapes.map(s => s.points), ...t.shapes.map(s => s.points.map(p => [p[0] + toeO[0], p[1] + toeO[1], p[2] + toeO[2]]))], key = (p) => p.map(x => x.toFixed(7)).join(",");
    const all = new Set(pieces.flat().map(key)), missing = full.filter(p => !all.has(key(p))).length; add("F1.4" + sd, "the 10 rear + 4 front pieces carry every boot-hull vertex (D1a tiling)", missing === 0 && f.shapes.length === 10 && t.shapes.length === 4, `missing ${missing}, pieces ${f.shapes.length}+${t.shapes.length}`); }
  // engine build + readback
  const w = new V2JoltWorld(J, S1, S1.contact, { velSteps: 150, posSteps: 2 }); let rb = 0; S1.bodies.forEach((b, i) => { const r = w.readbackBody(i); rb = Math.max(rb, Math.abs(r.mass - b.mass)); }); w.destroy();
  add("F1.5", "Jolt build of 16 bodies / 15 joints; mass readback exact", rb < 1e-5 && S1.bodies.length === 16 && S1.joints.length === 15, `max |Δmass| ${rb.toExponential(1)}`);
  out.f1Construction = chk; console.log("F1 construction", chk.map(c => c.id + (c.pass ? ":ok" : ":FAIL") + " " + c.value).join(" | ")); }
const specs = { F0: pi1RunnerSpec(), F1: pi1RunnerF1Spec() };
for (const id of ["F0", "F1"]) { out.g1[id] = {};
  for (const key of ESSENTIAL) { const r = runScenario(J, specs[id], key, { passiveOpts: { kneeModel: "v2k" } }), cs = scenarioChecks(r, SCENARIOS[key]);
    const mtp = id === "F1" ? r.joints.axes.filter(a => /^mtp_/.test(a.joint)).map(a => ({ joint: a.joint, axis: a.axis, dfMinDeg: +a.anMin.toFixed(2), dfMaxDeg: +a.anMax.toFixed(2), hardMarginMinDeg: +a.marginMinDeg.toFixed(2), hardSteps: a.hardSteps, engineTicks: a.engineTicks })) : null;
    out.g1[id][key] = { hash: r.hash, pass: cs.filter(c => !c.reportOnly).every(c => c.pass), failed: cs.filter(c => !c.reportOnly && !c.pass).map(c => ({ id: c.id, name: c.name, value: String(c.value).slice(0, 160), limit: c.limit })),
      selfPenMaxMm: +r.contacts.selfPenMaxMm.toFixed(2), turfPenMaxMm: +r.contacts.turfPenMaxMm.toFixed(2), firstNonFootT: r.outcome ? r.outcome.firstNonFootT : null, mtp };
    console.log(id, key.padEnd(12), out.g1[id][key].pass ? "pass" : "FAIL " + out.g1[id][key].failed.map(c => c.id + "=" + c.value.slice(0, 60)).join("; "), "selfPen", out.g1[id][key].selfPenMaxMm, mtp ? "mtp DF [min, max, hard margin] " + JSON.stringify(mtp.map(m => [m.dfMinDeg, m.dfMaxDeg, m.hardMarginMinDeg])) : ""); } }
for (const key of ["upright", "drop1m", "awkward"]) { const a = runScenario(J, specs.F1, key, { passiveOpts: { kneeModel: "v2k" } }).hash, b = runScenario(J, specs.F1, key, { passiveOpts: { kneeModel: "v2k" } }).hash; out.determinism[key] = { a, b, identical: a === b }; }
const newFail = ["F1"].flatMap(id => ESSENTIAL.flatMap(k => out.g1.F1[k].failed.filter(c => !out.g1.F0[k].failed.some(x => x.id === c.id)).map(c => k + ":" + c.id)));
out.verdict = { f1ConstructionPass: out.f1Construction.every(c => c.pass), g1NewFailures: newFail, g1Fixed: ESSENTIAL.flatMap(k => out.g1.F0[k].failed.filter(c => !out.g1.F1[k].failed.some(x => x.id === c.id)).map(c => k + ":" + c.id)), deterministic: Object.values(out.determinism).every(d => d.identical) };
fs.writeFileSync(process.argv[2], JSON.stringify(out, null, 1)); console.log("G0 F0 failed (D-1, known)", out.g0.F0.failed.map(c => c.id)); console.log("VERDICT", JSON.stringify(out.verdict));
