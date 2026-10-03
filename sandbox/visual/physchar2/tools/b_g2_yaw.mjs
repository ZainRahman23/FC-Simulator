// ═══ physchar2/tools/b_g2_yaw.mjs — FLAT-PLANE DECISION, G2 follow-up: is the S4 yaw H = 12 slip change (box 7.6 → plane 11.8 mm) a
// systematic torsional-friction difference or near-threshold stick-slip sensitivity? A dense yaw-impulse sweep (V2-REF, both turfs, same
// process), plus a same-process cost comparison (controller / physics ms per tick) on a quiet-stance and a push run. DIAGNOSTIC, no tuning.
// usage: node tools/b_g2_yaw.mjs [out.json]
import fs from "fs"; import path from "path"; import { fileURLToPath } from "url";
import { loadJolt } from "../core/v2_jolt.js";
import { generateSpec } from "../spec/v2_spec.js";
import { VARIATION_SET } from "../spec/v2_human.js";
import { G2Sim, torqueScenario, pushScenario } from "../gates/v2_g2.js";
const J = await loadJolt(path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../vendor/jolt-physics.wasm-compat.js")), spec = generateSpec(VARIATION_SET.find(h => h.id === "V2-REF")), out = { yaw: [], cost: [] };
const run = (base, turf) => { const s = new G2Sim(J, spec, base, { cfg: { turf } }); const t0 = process.hrtime.bigint(); while (s.tick()) { if (s.g2acc.fallT != null && s.lastRow.t > s.g2acc.fallT + 0.5) break; }
  const ms = Number(process.hrtime.bigint() - t0) / 1e6, r = s.g2summary(); s.destroy(); return { r, ms }; };
for (let H = 8; H <= 16.001; H += 0.5) { const row = { H }; for (const turf of ["box", "plane"]) { const { r } = run(torqueScenario("yaw", H), turf); row[turf] = { outcome: r.outcome, slipMaxMm: Math.max(...r.feet.slipMaxMm), slipMm: r.feet.slipMaxMm, tiltMaxDeg: Math.max(...r.feet.tiltMaxDeg) }; }
  out.yaw.push(row); console.log(`yaw H ${H.toFixed(1)}: box ${row.box.outcome} ${row.box.slipMaxMm.toFixed(2)} mm | plane ${row.plane.outcome} ${row.plane.slipMaxMm.toFixed(2)} mm`); }
for (const [name, base] of [["quiet 10 s", { title: "q", seconds: 10 }], ["push F 15", pushScenario("F", 15)]]) for (let rep = 0; rep < 3; rep++) for (const turf of ["box", "plane"]) {
  const { r, ms } = run(base, turf); out.cost.push({ name, turf, rep, wallMs: ms, ctrlMeanMs: r.cpuCtrl.meanMs, cpu: r.cpu }); console.log(`${name} ${turf} rep ${rep}: wall ${ms.toFixed(0)} ms, ctrl mean ${r.cpuCtrl.meanMs.toFixed(3)} ms, cpu ${JSON.stringify(r.cpu)}`); }
if (process.argv[2]) fs.writeFileSync(process.argv[2], JSON.stringify(out, null, 1));
