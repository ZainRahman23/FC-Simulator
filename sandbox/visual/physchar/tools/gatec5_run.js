// ═══ physchar/tools/gatec5_run.js — GATE C5: FALL TRANSITION / PROTECTIVE RESPONSE — protective response OFF vs ON on the falls of C1 (no
// stepping) and C3 (failed or impossible steps). Ground-contact sequence from the SOLVED contacts: which body meets the turf first and how
// fast, whether and how fast the head meets it, the pelvis impact, and robustness (joint separation / limits) through the impact.
// usage: node tools/gatec5_run.js [--calib V1.1] [--repeat 1] [--out file.json]
import fs from "fs"; import path from "path"; import { fileURLToPath } from "url";
import { buildBodySpec, WORKING_CALIB } from "../pc_body.js";
import { loadJolt } from "../pc_jolt.js";
import { runC1 } from "../pc_gatec1.js";
import { runC3 } from "../pc_gatec3.js";
import { buildPoses } from "../pc_control.js";
export const C5_FALLS = { C1: ["PF65", "G_fall", "PB40", "PB60", "PR60", "PR70", "PL60"], C3: ["C_proj_B75", "F_nofoot_F160", "D_late_F80_100ms", "B_R65"] };
const here = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(here, "../../../..");
const arg = (k, d) => { const i = process.argv.indexOf(k); return i < 0 ? d : (process.argv[i + 1] && !process.argv[i + 1].startsWith("--") ? process.argv[i + 1] : true); };
const dir = path.join(ROOT, "assets/characters/outfield/gabriel"), rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8")), buf = fs.readFileSync(path.join(dir, "mesh.bin"));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), L = rig.mesh.layout, T = { Float32Array, Uint16Array, Uint32Array, Uint8Array };
const mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new T[L[k].elementType](ab, L[k].byteOffset, L[k].elementCount);
const spec = buildBodySpec(rig, mesh, { calib: String(arg("--calib", WORKING_CALIB)) }), J = await loadJolt(path.join(here, "../vendor/jolt-physics.wasm-compat.js")), poses = buildPoses(spec), rep = +arg("--repeat", 1);
const nm = (i) => spec.bodies[i].name, isFoot = (i) => /^foot_/.test(nm(i)), r2 = (x, d = 2) => x == null ? null : +x.toFixed(d);
export function fallMetrics(spec, recs) {
  const rel = recs.find(r => r.cls === "FALLING"), tRel = rel ? rel.t : null, first = {}, seq = [];
  for (const r of recs) for (const c of r.cts || []) { if (!(c.a === -1 || c.b === -1) || c.depth < -0.001) continue; const i = c.a === -1 ? c.b : c.a; if (i < 0 || first[i]) continue;
    const s = r.states[i]; first[i] = { t: r.t, v: Math.hypot(...s.v), vy: s.v[1] }; if (!isFoot(i)) seq.push(nm(i)); }
  const at = (n) => { const i = spec.bodies.findIndex(b => b.name === n); return first[i] ? { t: r2(first[i].t, 3), dtFromRelease: tRel != null ? r2(first[i].t - tRel, 3) : null, speed: r2(first[i].v), vy: r2(first[i].vy) } : null; };
  const nf = Object.keys(first).map(Number).filter(i => !isFoot(i)).sort((a, b) => first[a].t - first[b].t), f0 = nf.length ? nf[0] : null;
  const hands = ["foreArm_L", "foreArm_R"].map(at).filter(Boolean).sort((a, b) => a.t - b.t)[0] || null, head = at("head"), pelvis = at("pelvis");
  return { tRelease: r2(tRel, 3), firstBody: f0 != null ? nm(f0) : null, firstSpeed: f0 != null ? r2(first[f0].v) : null, order: seq.slice(0, 6), hands, head, pelvis, chest: at("chest"),
    handsBeforeHead: hands && (!head || hands.t < head.t), maxJointSepMm: r2(Math.max(...recs.map(r => r.anchorErr)) * 1000, 1) };
}
const results = [];
for (const gate of ["C1", "C3"]) for (const t of C5_FALLS[gate]) { const row = { gate, test: t };
  for (const prot of [false, true]) { const runs = []; for (let q = 0; q < rep; q++) { const x = (gate === "C1" ? runC1 : runC3)(J, spec, t, { poses, keepStates: true, ctrlExtra: prot ? { protective: true } : {} }); runs.push({ hash: x.hash, outcome: x.outcome, m: fallMetrics(spec, x.recs) }); }
    row[prot ? "prot" : "noProt"] = { ...runs[0], deterministic: runs.every(x => x.hash === runs[0].hash) }; }
  results.push(row); const f = (m) => `first ${String(m.firstBody).padEnd(10)} ${String(m.firstSpeed).padStart(4)} m/s · hands ${m.hands ? m.hands.dtFromRelease + "s" : "-"} · head ${m.head ? `HIT ${m.head.speed} m/s (vy ${m.head.vy})` : "no contact"} · pelvis ${m.pelvis ? m.pelvis.speed + " m/s" : "-"}`;
  console.log(`${gate} ${t.padEnd(17)} OFF: ${f(row.noProt.m)}\n${" ".repeat(21)}ON : ${f(row.prot.m)}   order ${row.prot.m.order.join("→")}`); }
if (arg("--out", null)) fs.writeFileSync(arg("--out"), JSON.stringify({ calib: spec.calib ? spec.calib.name : "V1", results }, null, 1));
