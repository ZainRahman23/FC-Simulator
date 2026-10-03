// ═══ physchar2/tools/g1_margins.js — G1 decisions C2 + D3a: measure the emergency engine-stop margin per joint class / axis / direction ══════
// Controlled overshoot tests with the C2 anatomical end-stop ON and the Jolt hard stop moved 40° out of the way, over THE WHOLE G1 VALIDATION
// SET (D3a, 2026-10-03: the margins measured on V2-REF alone did not cover the variants and the other rates):
//   • V2-REF and V1-matched: every scenario except impact15 (the D4d report-only extreme diagnostic);
//   • the four population / morphology variants: the essential scenarios;
//   • the D4a timestep ensembles: RATE_KEYS × RATE_SET × RATE_EPS on V2-REF;
//   • the C7 high-speed envelope (V2-REF);
// and a speed-controlled rig (parent held, zero gravity, child driven into its anatomical limit at 2 / 5 / 10 rad/s) — reported only.
// margin = max(2°, ceil(1.5 × largest overshoot beyond the ANATOMICAL hard limit + 1°)) per class / axis / direction (left and right merged).
// The gate then validates that no run reaches the emergency stop (1.3b) — by construction on this set; the margins remain separately measured
// from the anatomical ROM (which is unchanged) and from the 1.5° settled compliance tolerance (D3a).
// usage: node tools/g1_margins.js [--cfg '{...}'] [--mods a,b] [--out <json>] [--workers 8]
//   → review_artifacts/physical_character_v2/g1/json/g1_margins.json (or --out) + the ENGINE_MARGIN table (stdout). The installed table
//   (spec/v2_joints.js) is never written here.
import fs from "fs"; import path from "path"; import os from "os"; import { fork } from "child_process"; import { fileURLToPath } from "url";
import { loadJolt } from "../core/v2_jolt.js";
import { generateSpec } from "../spec/v2_spec.js";
import { VARIATION_SET } from "../spec/v2_human.js";
import { engineLimits, JOINT_DEFS } from "../spec/v2_joints.js";
import { runScenario, SCENARIO_ORDER, ESSENTIAL, HS_ORDER, RATE_KEYS, RATE_SET, RATE_EPS, ensembleKey, G1_WORLD } from "../gates/v2_g1.js";
import { passiveRig } from "../gates/v2_g1_tests.js";
import { applyMods } from "../gates/v2_g1_dx.js";
const here = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(here, "../../../.."), VEND = path.join(here, "../vendor/jolt-physics.wasm-compat.js");
const argv = (k, d) => { const i = process.argv.indexOf(k); return i < 0 ? d : process.argv[i + 1]; }, CFG = JSON.parse(argv("--cfg", "{}")), MODS = (argv("--mods", "") || "").split(",").filter(Boolean);
const classes = [...new Set(JOINT_DEFS.map(d => d.name.replace(/_[LR]$/, "")))], STUDY = {};
for (const d of JOINT_DEFS) { const c = d.name.replace(/_[LR]$/, ""); STUDY[c] = STUDY[c] || {}; for (const k of ["x", "y", "z"]) { const ax = d.axes[k]; if (ax && !ax.locked) STUDY[c][ax.key] = { pos: 40, neg: 40 }; } }
const specCache = new Map(), specFor = (id) => { if (!specCache.has(id)) { const sp = applyMods(generateSpec(VARIATION_SET.find(h => h.id === id)), MODS); for (const j of sp.joints) j.limits.engine = engineLimits(j, STUDY); specCache.set(id, sp); } return specCache.get(id); };
if (process.argv.includes("--worker")) {
  const J = await loadJolt(VEND);
  process.on("message", (job) => { if (job === "exit") process.exit(0); try { const r = runScenario(J, specFor(job.human), job.key, { cfg: { ...CFG, ...(job.hz ? { hz: job.hz } : {}) } });
      process.send({ id: job.id, axes: r.joints.axes.map(a => ({ joint: a.joint, key: a.key, sign: a.sign, overHiDeg: a.overHiDeg, overLoDeg: a.overLoDeg })), rise: r.energy.maxRiseJ }); }
    catch (e) { process.send({ id: job.id, err: String(e.stack || e) }); } });
  process.send({ ready: true });
} else {
  const nW = +argv("--workers", 8), OUTF = argv("--out", null), jobs = []; let id = 0;
  for (const h of ["V2-REF", "V1-matched"]) for (const k of SCENARIO_ORDER) if (k !== "impact15") jobs.push({ id: id++, set: "main", human: h, key: k });
  for (const h of ["V2-165-62", "V2-198-92", "V2-long-legs", "V2-short-legs"]) for (const k of ESSENTIAL) jobs.push({ id: id++, set: "variant", human: h, key: k });
  for (const k of RATE_KEYS) for (const hz of RATE_SET) for (const e of RATE_EPS) jobs.push({ id: id++, set: "rate", human: "V2-REF", key: ensembleKey(k, e), hz });
  for (const k of HS_ORDER) jobs.push({ id: id++, set: "envelope", human: "V2-REF", key: k });
  console.log(`margin study: ${jobs.length} runs (main ${jobs.filter(j => j.set === "main").length}, variants ${jobs.filter(j => j.set === "variant").length}, timestep ensembles ${jobs.filter(j => j.set === "rate").length}, envelope ${jobs.filter(j => j.set === "envelope").length}) at ${G1_WORLD.hz} Hz, ${CFG.velSteps || G1_WORLD.velSteps} it${MODS.length ? ", mods " + MODS.join("+") : ""}; engine stops +40°`);
  const out = new Map(), q = jobs.slice(); let done = 0; const t0 = Date.now(), RECYCLE = 12;
  await new Promise((res) => { const spawn = () => { let n = 0; const cp = fork(fileURLToPath(import.meta.url), ["--worker", ...process.argv.slice(2)], { stdio: ["ignore", "inherit", "inherit", "ipc"] });
      const next = () => { if (n >= RECYCLE && q.length) { cp.send("exit"); spawn(); return; } const j = q.shift(); if (j) { n++; cp.send(j); } else cp.send("exit"); };
      cp.on("message", (m) => { if (m.ready) return next(); if (m.err) console.error(m.err); out.set(m.id, m); if (++done % 25 === 0 || done === jobs.length) process.stdout.write(`  ${done}/${jobs.length}\r`); if (done === jobs.length) res(); next(); }); };
    for (let i = 0; i < nW; i++) spawn(); });
  process.stdout.write("\n");
  const env = {}, put = (c, key, dir, v, where) => { const k = `${c}.${key}.${dir}`; if (!env[k] || v > env[k].v) env[k] = { v, where }; };
  for (const c of classes) for (const key of Object.keys(STUDY[c])) for (const dir of ["pos", "neg"]) put(c, key, dir, 0, "—");
  const failed = []; for (const j of jobs) { const m = out.get(j.id); if (!m || m.err) { failed.push(j); continue; }
    const where = `${j.human} ${j.key}${j.hz ? " @" + j.hz + " Hz" : ""}`; for (const a of m.axes) { const c = a.joint.replace(/_[LR]$/, ""); put(c, a.key, a.sign > 0 ? "pos" : "neg", a.overHiDeg, `${where} ${a.joint}`); put(c, a.key, a.sign > 0 ? "neg" : "pos", a.overLoDeg, `${where} ${a.joint}`); } }
  if (failed.length) { console.error(`${failed.length} runs failed — margins NOT written`); process.exit(2); }
  console.log("rig: approach speeds 2 / 5 / 10 rad/s …"); const J = await loadJolt(VEND), rig = {}, ref = specFor("V2-REF");
  for (const c of classes) { const jn = ref.joints.find(j => j.name === c || j.name === c + "_R").name;
    for (const key of Object.keys(STUDY[c])) for (const dir of ["pos", "neg"]) for (const w of [2, 5, 10]) {
      const j = ref.joints.find(x => x.name === jn), i = ["x", "y", "z"].findIndex(k => j.def.axes[k] && j.def.axes[k].key === key), end = (dir === "pos") === (j.def.axes["xyz"[i]].s > 0) ? "hi" : "lo";
      const r = passiveRig(J, ref, { joint: jn, key, end, w0: end === "hi" ? w : -w, approach: true }, { frac: 0, seconds: 1.0, cfg: CFG });
      (rig[`${c}.${key}.${dir}`] = rig[`${c}.${key}.${dir}`] || {})[w] = +r.overshootDeg.toFixed(2); } }
  const rows = Object.keys(env).sort().map(k => { const [c, key, dir] = k.split("."), o = env[k].v, m = Math.max(2, Math.ceil(1.5 * o + 1)); return { cls: c, key, dir, envOvershootDeg: +o.toFixed(2), where: env[k].where, rig: rig[k], marginDeg: m }; });
  const table = {}; for (const r of rows) { (table[r.cls] = table[r.cls] || {})[r.key] = table[r.cls][r.key] || {}; table[r.cls][r.key][r.dir] = r.marginDeg; }
  fs.writeFileSync(OUTF ? path.resolve(OUTF) : path.join(ROOT, "review_artifacts/physical_character_v2/g1/json/g1_margins.json"), JSON.stringify({ generated: "tools/g1_margins.js", world: { ...G1_WORLD, ...CFG }, mods: MODS, table,
    rule: "margin = max(2°, ceil(1.5 × largest overshoot + 1°)); set = V2-REF + V1-matched (all but impact15), 4 variants (essential), timestep ensembles (4 rates × 5 starts), C7 envelope", runs: jobs.length, seconds: (Date.now() - t0) / 1000, rows }, null, 1));
  console.log("\n| class.axis.direction | largest overshoot ° (where) | rig overshoot ° at 2/5/10 rad/s | margin ° |\n|---|---|---|---|");
  for (const r of rows) console.log(`| ${r.cls}.${r.key}.${r.dir} | ${r.envOvershootDeg} (${r.where}) | ${r.rig ? [2, 5, 10].map(w => r.rig[w]).join(" / ") : "—"} | ${r.marginDeg} |`);
  console.log("\nexport const ENGINE_MARGIN = " + JSON.stringify(table) + ";");
  process.exit(0);
}
