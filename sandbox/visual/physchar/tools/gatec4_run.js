// ═══ physchar/tools/gatec4_run.js — GATE C4: WHOLE-BODY REACTIVE BALANCE — reactive arms OFF vs ON on the C1 in-place boundary pushes and
// the C3 corrective-step pushes (Node, one process, sequential). The arms are the only difference between the paired runs.
// usage: node tools/gatec4_run.js [--calib V1.1] [--repeat 1] [--out file.json]
import fs from "fs"; import path from "path"; import { fileURLToPath } from "url";
import { buildBodySpec, WORKING_CALIB } from "../pc_body.js";
import { loadJolt } from "../pc_jolt.js";
import { runC1 } from "../pc_gatec1.js";
import { runC3 } from "../pc_gatec3.js";
import { buildPoses } from "../pc_control.js";
export const C4_PAIRS = { C1: ["PF55", "PF60", "PF65", "PF70", "PB30", "PB35", "PB40", "PB50", "PR45", "PR50", "PR60", "PL40", "PL60", "DF55", "DB35", "DR45"], C3: ["B_F80", "B_F100", "B_B50", "B_B60", "C_proj_F115", "B_R65", "D_late_F80_100ms"] };
const here = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(here, "../../../..");
const arg = (k, d) => { const i = process.argv.indexOf(k); return i < 0 ? d : (process.argv[i + 1] && !process.argv[i + 1].startsWith("--") ? process.argv[i + 1] : true); };
const dir = path.join(ROOT, "assets/characters/outfield/gabriel"), rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8")), buf = fs.readFileSync(path.join(dir, "mesh.bin"));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), L = rig.mesh.layout, T = { Float32Array, Uint16Array, Uint32Array, Uint8Array };
const mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new T[L[k].elementType](ab, L[k].byteOffset, L[k].elementCount);
const spec = buildBodySpec(rig, mesh, { calib: String(arg("--calib", WORKING_CALIB)) }), J = await loadJolt(path.join(here, "../vendor/jolt-physics.wasm-compat.js")), poses = buildPoses(spec), rep = +arg("--repeat", 1), results = [];
const slim = (gate, r) => gate === "C1" ? { outcome: r.outcome, maxClass: r.maxClass, recoveryS: r.recoveryS, xiMinCm: r.whole.xiMarginMinCm, trunkMaxDeg: r.whole.trunkTiltMaxDeg, comExcCm: r.whole.comMaxExcursionCm, hash: r.hash }
  : { outcome: r.outcome, step: r.step ? { foot: r.step.foot, recoveredAfterNeedS: r.step.recoveredAfterNeedS, tdErrCm: r.step.touchdown && r.step.touchdown.errCm, xiAtTd: r.step.xiMarginAtTouchdownCm, fail: r.step.fail } : null, trunkMaxDeg: r.whole.trunkMaxDeg, comExcCm: r.whole.comExcursionCm, hash: r.hash };
for (const gate of ["C1", "C3"]) for (const t of C4_PAIRS[gate]) { const row = { gate, test: t };
  for (const arms of [false, true]) { const runs = []; for (let q = 0; q < rep; q++) { const x = (gate === "C1" ? runC1 : runC3)(J, spec, t, { poses, ctrlExtra: arms ? { reactiveArms: true } : {} }); delete x.recs; runs.push(x); }
    row[arms ? "arms" : "noArms"] = { ...slim(gate, runs[0]), deterministic: runs.every(x => x.hash === runs[0].hash) }; }
  results.push(row); const a = row.noArms, b = row.arms, d = a.outcome !== b.outcome ? "  ◀ OUTCOME CHANGED" : "";
  console.log(`${gate} ${t.padEnd(18)} no arms ${a.outcome.padEnd(20)} trunk ${String(a.trunkMaxDeg).padStart(5)}° | ARMS ${b.outcome.padEnd(20)} trunk ${String(b.trunkMaxDeg).padStart(5)}° ${gate === "C1" ? `rec ${a.recoveryS ?? "-"} → ${b.recoveryS ?? "-"} s` : ""}${d}`); }
if (arg("--out", null)) fs.writeFileSync(arg("--out"), JSON.stringify({ calib: spec.calib ? spec.calib.name : "V1", results }, null, 1));
