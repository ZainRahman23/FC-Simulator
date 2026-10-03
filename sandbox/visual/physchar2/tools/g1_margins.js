// ═══ physchar2/tools/g1_margins.js — G1 decision C2: derive the emergency engine-stop margin per joint class / axis / direction ═════════
// Controlled overshoot tests with the C2 anatomical end-stop ON and the Jolt hard stop moved 40° out of the way:
//   (a) the V2-REF G1 scenario envelope at the validated baseline (240 Hz × 1, 60 velocity iterations) — every passive scenario EXCEPT
//       impact15 (the extreme 15 m/s whole-body test that decision C7 re-scopes as non-credible for player bodies; it validates instead):
//       largest overshoot beyond the ANATOMICAL hard limit per class / axis / direction (left and right merged);
//   (b) a speed-controlled rig (parent held, zero gravity): the child driven into its anatomical limit from the soft limit at 2 / 5 / 10 rad/s
//       — the end-stop's characteristic (reported, not used for the margin).
// margin = max(2°, ceil(1.5 × envelope overshoot + 1°)). Variants, other rates and the high-speed envelope are NOT used here: they validate.
// usage: node tools/g1_margins.js   → review_artifacts/physical_character_v2/g1/json/g1_margins.json + the ENGINE_MARGIN table (stdout)
import fs from "fs"; import path from "path"; import { fileURLToPath } from "url";
import { loadJolt } from "../core/v2_jolt.js";
import { generateSpec } from "../spec/v2_spec.js";
import { V2_REF } from "../spec/v2_human.js";
import { engineLimits, JOINT_DEFS } from "../spec/v2_joints.js";
import { runScenario, SCENARIO_ORDER, G1_WORLD } from "../gates/v2_g1.js";
import { passiveRig } from "../gates/v2_g1_tests.js";
const here = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(here, "../../../.."), J = await loadJolt(path.join(here, "../vendor/jolt-physics.wasm-compat.js"));
const classes = [...new Set(JOINT_DEFS.map(d => d.name.replace(/_[LR]$/, "")))], STUDY = {};
for (const d of JOINT_DEFS) { const c = d.name.replace(/_[LR]$/, ""); STUDY[c] = STUDY[c] || {}; for (const k of ["x", "y", "z"]) { const ax = d.axes[k]; if (ax && !ax.locked) STUDY[c][ax.key] = { pos: 40, neg: 40 }; } }
const spec = generateSpec(V2_REF); for (const j of spec.joints) j.limits.engine = engineLimits(j, STUDY);
const env = {}, put = (c, key, dir, v, where) => { const k = `${c}.${key}.${dir}`; if (!env[k] || v > env[k].v) env[k] = { v, where }; };
for (const c of classes) for (const key of Object.keys(STUDY[c])) for (const dir of ["pos", "neg"]) put(c, key, dir, 0, "—");
const ENV = SCENARIO_ORDER.filter(k => k !== "impact15");
console.log(`envelope: ${ENV.length} V2-REF scenarios (impact15 excluded) at ${G1_WORLD.hz} Hz, ${G1_WORLD.velSteps} it, engine stops +40° …`);
for (const key of ENV) { const r = runScenario(J, spec, key, {});
  for (const a of r.joints.axes) { const c = a.joint.replace(/_[LR]$/, ""); put(c, a.key, a.sign > 0 ? "pos" : "neg", a.overHiDeg, `${key} ${a.joint}`); put(c, a.key, a.sign > 0 ? "neg" : "pos", a.overLoDeg, `${key} ${a.joint}`); }
  process.stdout.write(`  ${key} (rise ${r.energy.maxRiseJ.toFixed(2)} J)\n`); }
console.log("rig: approach speeds 2 / 5 / 10 rad/s …"); const rig = {};
for (const c of classes) { const jn = spec.joints.find(j => j.name === c || j.name === c + "_R").name;
  for (const key of Object.keys(STUDY[c])) for (const dir of ["pos", "neg"]) for (const w of [2, 5, 10]) {
    const j = spec.joints.find(x => x.name === jn), i = ["x", "y", "z"].findIndex(k => j.def.axes[k] && j.def.axes[k].key === key), end = (dir === "pos") === (j.def.axes["xyz"[i]].s > 0) ? "hi" : "lo";
    const r = passiveRig(J, spec, { joint: jn, key, end, w0: end === "hi" ? w : -w, approach: true }, { frac: 0, seconds: 1.0 });
    (rig[`${c}.${key}.${dir}`] = rig[`${c}.${key}.${dir}`] || {})[w] = +r.overshootDeg.toFixed(2); } }
const rows = Object.keys(env).sort().map(k => { const [c, key, dir] = k.split("."), o = env[k].v, m = Math.max(2, Math.ceil(1.5 * o + 1)); return { cls: c, key, dir, envOvershootDeg: +o.toFixed(2), where: env[k].where, rig: rig[k], marginDeg: m }; });
const table = {}; for (const r of rows) { (table[r.cls] = table[r.cls] || {})[r.key] = table[r.cls][r.key] || {}; table[r.cls][r.key][r.dir] = r.marginDeg; }
fs.writeFileSync(path.join(ROOT, "review_artifacts/physical_character_v2/g1/json/g1_margins.json"), JSON.stringify({ generated: "tools/g1_margins.js", world: G1_WORLD, rule: "margin = max(2°, ceil(1.5 × envelope overshoot + 1°)); envelope = V2-REF G1 scenarios except impact15, engine stops +40°", envelope: ENV, rows, table }, null, 1));
console.log("\n| class.axis.direction | envelope overshoot ° (where) | rig overshoot ° at 2/5/10 rad/s | margin ° |\n|---|---|---|---|");
for (const r of rows) console.log(`| ${r.cls}.${r.key}.${r.dir} | ${r.envOvershootDeg} (${r.where}) | ${r.rig ? [2, 5, 10].map(w => r.rig[w]).join(" / ") : "—"} | ${r.marginDeg} |`);
console.log("\nexport const ENGINE_MARGIN = " + JSON.stringify(table) + ";");
