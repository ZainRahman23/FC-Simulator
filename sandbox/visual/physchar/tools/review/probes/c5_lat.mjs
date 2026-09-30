// EXPERIMENT: lateral protective head / trunk flexion away from the impact side (C5 lateral falls)
import fs from "fs"; import path from "path";
const PC = process.argv[2], ROOT = path.resolve(PC, "../../.."), VAR = process.argv[3];
const { buildBodySpec } = await import(PC + "/pc_body.js"); const { loadJolt } = await import(PC + "/pc_jolt.js"); const C1 = await import(PC + "/pc_gatec1.js"); const C3 = await import(PC + "/pc_gatec3.js");
const B = await import(PC + "/pc_balance.js");
const dir = path.join(ROOT, "assets/characters/outfield/gabriel"), rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8")), buf = fs.readFileSync(path.join(dir, "mesh.bin"));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), L = rig.mesh.layout, T = { Float32Array, Uint16Array, Uint32Array, Uint8Array };
const mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new T[L[k].elementType](ab, L[k].byteOffset, L[k].elementCount);
const spec = buildBodySpec(rig, mesh, { calib: "V1.1" }), J = await loadJolt(PC + "/vendor/jolt-physics.wasm-compat.js");
const V = { neck: { R: { neck: { y: 10, z: -30 } }, L: { neck: { y: 10, z: 30 } } }, neckTrunk: { R: { neck: { y: 10, z: -30 }, thoracic: { z: -15 } }, L: { neck: { y: 10, z: 30 }, thoracic: { z: 15 } } } };
if (VAR && V[VAR]) for (const d of ["R", "L"]) Object.assign(B.PROT[d], V[VAR][d]);
const hi = spec.bodies.findIndex(b => b.name === "head");
for (const [g, t] of [["C1", "PR60"], ["C1", "PR70"], ["C1", "PL60"], ["C3", "B_R65"], ["C1", "PF65"], ["C1", "PB60"]]) {
  const x = (g === "C1" ? C1.runC1 : C3.runC3)(J, spec, t, { keepStates: true, ctrlExtra: { protective: true } });
  let head = null; for (const r of x.recs) { if (head) break; for (const c of r.cts || []) { if ((c.a === -1 && c.b === hi) || (c.b === -1 && c.a === hi)) { if (c.depth >= -0.001) { head = { t: r.t, v: Math.hypot(...r.states[hi].v) }; break; } } } }
  console.log(`${(VAR || "current").padEnd(10)} ${t.padEnd(6)} head ${head ? head.v.toFixed(2) + " m/s @" + head.t.toFixed(2) : "no contact"} · hash ${x.hash}`); }
