// ═══ physchar/tools/gatec3_run.js — GATE C3 measurement run (Node, one process, sequential) ═══════════════════════════════════════════
// usage: node tools/gatec3_run.js [--calib V1.1] [--tests a,b|all|group:<prefix>] [--repeat 3] [--out file.json] [--brief] [--nostep]
import fs from "fs"; import path from "path"; import { fileURLToPath } from "url";
import { buildBodySpec, WORKING_CALIB } from "../pc_body.js";
import { loadJolt } from "../pc_jolt.js";
import { runC3, TESTS_C3 } from "../pc_gatec3.js";
import { buildPoses } from "../pc_control.js";
const here = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(here, "../../../..");
const arg = (k, d) => { const i = process.argv.indexOf(k); return i < 0 ? d : (process.argv[i + 1] && !process.argv[i + 1].startsWith("--") ? process.argv[i + 1] : true); };
const dir = path.join(ROOT, "assets/characters/outfield/gabriel"), rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8")), buf = fs.readFileSync(path.join(dir, "mesh.bin"));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), L = rig.mesh.layout, T = { Float32Array, Uint16Array, Uint32Array, Uint8Array };
const mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new T[L[k].elementType](ab, L[k].byteOffset, L[k].elementCount);
const spec = buildBodySpec(rig, mesh, { calib: String(arg("--calib", WORKING_CALIB)) }), J = await loadJolt(path.join(here, "../vendor/jolt-physics.wasm-compat.js")), poses = buildPoses(spec);
const sel = String(arg("--tests", "all")), list = sel === "all" ? Object.keys(TESTS_C3) : sel.startsWith("group:") ? Object.keys(TESTS_C3).filter(k => k.startsWith(sel.slice(6))) : sel.split(",");
const rep = +arg("--repeat", 1), results = [], noStep = !!arg("--nostep", false);
for (const k of list) { const runs = []; for (let r = 0; r < rep; r++) { const x = runC3(J, spec, k, { poses, noStep }); delete x.recs; runs.push(x); }
  const s = runs[0]; s.repeatHashes = runs.map(x => x.hash); s.deterministic = runs.every(x => x.hash === s.hash); results.push(s);
  const st = s.step, f = (v) => v == null ? "-" : v;
  console.log(`${k.padEnd(22)} ${s.outcome.padEnd(20)} ${st ? `${st.foot} step: need ${f(s.tStepNeeded)} · liftoff +${f(st.liftoffAfterNeedS)} · td +${f(st.touchdownAfterNeedS)} · rec +${f(st.recoveredAfterNeedS)} s · foothold ${st.planned ? (st.planned.projected ? "PROJECTED" : "as wanted") : "-"} pred ξm ${st.planned ? st.planned.predictedXiMarginCm : "-"} cm · td err ${st.touchdown ? st.touchdown.errCm : "-"} cm · ξm@td ${f(st.xiMarginAtTouchdownCm)} cm${st.fail ? " · FAIL: " + st.fail : ""}` : s.refused ? "NO STEP: " + s.refused : "no step"} | trunk ${s.whole.trunkMaxDeg}° slid ${f(s.whole.stanceSlidCm)} cm lim ${s.stability.minJointLimitMarginDeg}° (${s.stability.limJoint}) sep ${s.stability.maxJointSepMm} mm | det ${s.deterministic} ${s.hash} cpu ${s.cpu.msPerFrame}`); }
if (arg("--out", null)) fs.writeFileSync(arg("--out"), JSON.stringify({ player: spec.player, calib: spec.calib ? spec.calib.name : "V1", tsc: "240x1", results }, null, 1));
