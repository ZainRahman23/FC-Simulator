import fs from "fs"; import path from "path";
const PC = process.argv[2], ROOT = path.resolve(PC, "../../.."), KEY = process.argv[3], TS = process.argv[4].split(",").map(Number);
const { buildBodySpec } = await import(PC + "/pc_body.js"); const { loadJolt } = await import(PC + "/pc_jolt.js"); const C2 = await import(PC + "/pc_gatec2.js"); const { polyDist } = await import(PC + "/pc_sense.js");
const dir = path.join(ROOT, "assets/characters/outfield/gabriel"), rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8")), buf = fs.readFileSync(path.join(dir, "mesh.bin"));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), L = rig.mesh.layout, T = { Float32Array, Uint16Array, Uint32Array, Uint8Array };
const mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new T[L[k].elementType](ab, L[k].byteOffset, L[k].elementCount);
const spec = buildBodySpec(rig, mesh), J = await loadJolt(PC + "/vendor/jolt-physics.wasm-compat.js"), r = C2.runC2(J, spec, KEY, { keepStates: true });
const fi = spec.bodies.findIndex(b => b.name === "foot_L"); console.log("foot box", JSON.stringify(spec.bodies[fi].shapes[0]));
for (const t of TS) { const q = r.recs.find(x => Math.abs(x.t - t) < 0.003); const sole = q.feet.L.sole.map(p => [p[0], p[2]]);
  console.log(`t ${t} ξ ${q.xi.map(v => v.toFixed(3))} ξref ${q.xiRef ? q.xiRef.map(v => v.toFixed(3)) : "-"} ankleL ${q.footPos.L.map(v => v.toFixed(3))} sole ${JSON.stringify(sole.map(p => p.map(v => +v.toFixed(3))))} polyDist raw ${polyDist(sole, q.xi).toFixed(3)} rev ${polyDist(sole.slice().reverse(), q.xi).toFixed(3)} region ${JSON.stringify((q.region || []).map(p => p.map(v => +v.toFixed(3))))}`); }
