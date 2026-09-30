import fs from "fs"; import path from "path";
const PC = process.argv[2], ROOT = path.resolve(PC, "../../.."), CAL = process.argv[3], DROP = process.argv[4], JN = process.argv[5], TS = process.argv[6].split(",").map(Number);
const { buildBodySpec } = await import(PC + "/pc_body.js"); const { loadJolt } = await import(PC + "/pc_jolt.js"); const GA = await import(PC + "/pc_gatea.js");
const dir = path.join(ROOT, "assets/characters/outfield/gabriel"), rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8")), buf = fs.readFileSync(path.join(dir, "mesh.bin"));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), L = rig.mesh.layout, T = { Float32Array, Uint16Array, Uint32Array, Uint8Array };
const mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new T[L[k].elementType](ab, L[k].byteOffset, L[k].elementCount);
const spec = buildBodySpec(rig, mesh, { calib: CAL }), J = await loadJolt(PC + "/vendor/jolt-physics.wasm-compat.js");
const r = GA.runDrop(J, spec, DROP, { tsc: GA.GATE_A_TSC, world: GA.GATE_A_WORLD, keepStates: true, seconds: 3 }), k = spec.joints.findIndex(j => j.name === JN), j = spec.joints[k], nm = (i) => i < 0 ? "turf" : spec.bodies[i].name, arm = j.childIndex, par = j.parentIndex;
for (const t of TS) { const q = r.recs[Math.round(t * 240)], js = q.jstates[k], d = 57.3;
  const cts = (q.cts || []).filter(c => [arm, par, arm + 1].includes(c.a) || [arm, par, arm + 1].includes(c.b)).filter(c => c.depth > 0).map(c => `${nm(c.a)}–${nm(c.b)} ${(c.depth * 1000).toFixed(1)}`).join(", ");
  console.log(`${CAL} ${DROP} t ${t} ${JN} twist ${(js.twist * d).toFixed(1)} [${j.twist}] Y ${(js.swingY * d).toFixed(1)} [${j.swingY}] Z ${(js.swingZ * d).toFixed(1)} [${j.swingZ}] viol ${(js.viol * d).toFixed(1)} | contacts: ${cts}`); }
