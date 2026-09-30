import fs from "fs"; import path from "path";
const PC = process.argv[2], ROOT = path.resolve(PC, "../../..");
const { buildBodySpec } = await import(PC + "/pc_body.js"); const { loadJolt } = await import(PC + "/pc_jolt.js"); const C1 = await import(PC + "/pc_gatec1.js");
const dir = path.join(ROOT, "assets/characters/outfield/gabriel"), rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8")), buf = fs.readFileSync(path.join(dir, "mesh.bin"));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), L = rig.mesh.layout, T = { Float32Array, Uint16Array, Uint32Array, Uint8Array };
const mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new T[L[k].elementType](ab, L[k].byteOffset, L[k].elementCount);
const spec = buildBodySpec(rig, mesh), J = await loadJolt(PC + "/vendor/jolt-physics.wasm-compat.js"), r = C1.runC1(J, spec, "PR30", { keepStates: true });
for (const q of r.recs.filter(x => x.t > 1.2 && x.t < 1.34)) { const f = q.feet.L; console.log(`t ${q.t.toFixed(3)} L ${f.state.padEnd(9)} load ${f.load.toFixed(1).padStart(6)} shear ${f.shear.toFixed(1).padStart(6)} slipSpeed ${(f.slipSpeed * 1000).toFixed(1).padStart(6)} mm/s slid ${(f.slipDist * 1000).toFixed(2)} mm pts ${f.points.length} manifold ${f.manifold}`); }
