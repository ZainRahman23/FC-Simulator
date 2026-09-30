// ═══ physchar/tools/gated_run.js — GATE D vertical slice: two physical characters in one Jolt world (deterministic, sequential)
// usage: node tools/gated_run.js [--calib V1.1] [--tests all|a,b] [--repeat 1] [--prot] [--arms] [--out file.json]
import fs from "fs"; import path from "path"; import { fileURLToPath } from "url";
import { buildBodySpec, WORKING_CALIB } from "../pc_body.js";
import { loadJolt } from "../pc_jolt.js";
import { runD, TESTS_D } from "../pc_gated.js";
import { buildPoses } from "../pc_control.js";
const here = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(here, "../../../..");
const arg = (k, d) => { const i = process.argv.indexOf(k); return i < 0 ? d : (process.argv[i + 1] && !process.argv[i + 1].startsWith("--") ? process.argv[i + 1] : true); };
const dir = path.join(ROOT, "assets/characters/outfield/gabriel"), rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8")), buf = fs.readFileSync(path.join(dir, "mesh.bin"));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), L = rig.mesh.layout, T = { Float32Array, Uint16Array, Uint32Array, Uint8Array };
const mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new T[L[k].elementType](ab, L[k].byteOffset, L[k].elementCount);
const spec = buildBodySpec(rig, mesh, { calib: String(arg("--calib", WORKING_CALIB)) }), J = await loadJolt(path.join(here, "../vendor/jolt-physics.wasm-compat.js")), poses = buildPoses(spec);
const sel = String(arg("--tests", "all")), list = sel === "all" ? Object.keys(TESTS_D) : sel.split(","), rep = +arg("--repeat", 1);
const extra = { ...(arg("--prot", false) ? { protective: true } : {}), ...(arg("--arms", false) ? { reactiveArms: true } : {}) };
const results = [];
for (const key of list) { const runs = []; for (let q = 0; q < rep; q++) runs.push(runD(J, spec, key, { poses, ctrlExtra: extra, keepStates: true }));
  const r = runs[0], inv = r.contact.invariant; delete r.recs; r.repeatHashes = runs.map(x => x.hash); r.deterministic = runs.every(x => x.hash === r.hash); results.push(r);
  const who = (x) => `${x.fell ? "FELL" : "UPRIGHT"}${x.step ? ` step ${x.step.foot} ${x.step.status}${x.step.fail ? " (" + x.step.fail.slice(0, 60) + ")" : ""}` : x.refused ? " no step: " + x.refused.slice(0, 50) : ""}${x.request ? ` req ${x.request.foot} ${x.request.status}` : ""} root≤${x.maxRootResN} N`;
  console.log(`${key.padEnd(16)} contact ${r.contact.any ? `manifold ${r.contact.firstT}s ${r.contact.firstPair} (${inv ? inv.depthAtFirstMm : "-"} mm) touch ${r.contact.firstTouchT}s, max depth ${r.contact.maxDepthMm} mm` : "none"} | A ${who(r.A)} | B ${who(r.Bres)} | det ${r.deterministic} ${r.hash} cpu ${r.cpu.msPerFrame}`);
  if (inv) console.log(`${" ".repeat(17)}invariant ${inv.pair}: closing ${inv.closingBefore} m/s; touch step ${inv.touchStep}, arrested ${inv.arrestStep != null ? "at step " + inv.arrestStep + " (" + (inv.arrestVsTouch >= 0 ? "+" : "") + inv.arrestVsTouch + ")" : "— (not closing)"}\n${" ".repeat(17)}` + inv.series.map(q => `${q.step}: gap ${q.gapMm ?? "-"} v_n ${q.vn} ΔvA ${q.dvA} ΔvB ${q.dvB}`).join(" | "));
  if (arg("--pairs", false)) console.log("   pairs", JSON.stringify(r.contact.pairs)); }
if (arg("--out", null)) fs.writeFileSync(arg("--out"), JSON.stringify({ calib: spec.calib ? spec.calib.name : "V1", extra, results }, null, 1));
