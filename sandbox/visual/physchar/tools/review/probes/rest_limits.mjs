import fs from "fs"; import path from "path";
const PC = process.argv[2], ROOT = path.resolve(PC, "../../..");
const { buildBodySpec } = await import(PC + "/pc_body.js"); const { loadJolt } = await import(PC + "/pc_jolt.js"); const { runDrop, GATE_A_WORLD } = await import(PC + "/pc_gatea.js");
const dir = path.join(ROOT, "assets/characters/outfield/gabriel"), rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8")), buf = fs.readFileSync(path.join(dir, "mesh.bin"));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), L = rig.mesh.layout, T = { Float32Array, Uint16Array, Uint32Array, Uint8Array };
const mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new T[L[k].elementType](ab, L[k].byteOffset, L[k].elementCount);
const spec = buildBodySpec(rig, mesh), J = await loadJolt(PC + "/vendor/jolt-physics.wasm-compat.js");
for (const d of ["A", "B", "C", "D", "E"]) { const s = runDrop(J, spec, d, { tsc: "240x1", seconds: 6, world: GATE_A_WORLD, keepRecs: true });
  const recs = s.recs || []; const last = recs[recs.length - 1];
  console.log(d, "hash", s.hash, "rest: hardViol", last ? (last.hardViol * 180 / Math.PI).toFixed(2) + "° " + (last.hardJoint >= 0 ? spec.joints[last.hardJoint].name : "-") : "?", "softViol", last ? (last.softViol * 180 / Math.PI).toFixed(2) + "°" : "?", "anchor", last ? (last.anchorErr * 1000).toFixed(2) + " mm" : "?"); }
