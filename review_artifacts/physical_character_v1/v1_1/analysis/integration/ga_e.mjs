import fs from "fs"; import path from "path";
const PC = process.argv[2], ROOT = path.resolve(PC, "../../..");
const { buildBodySpec } = await import(PC + "/pc_body.js"); const { loadJolt } = await import(PC + "/pc_jolt.js"); const GA = await import(PC + "/pc_gatea.js");
const dir = path.join(ROOT, "assets/characters/outfield/gabriel"), rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8")), buf = fs.readFileSync(path.join(dir, "mesh.bin"));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), L = rig.mesh.layout, T = { Float32Array, Uint16Array, Uint32Array, Uint8Array };
const mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new T[L[k].elementType](ab, L[k].byteOffset, L[k].elementCount);
const J = await loadJolt(PC + "/vendor/jolt-physics.wasm-compat.js");
for (const cal of ["V1", "V1.1"]) { const spec = buildBodySpec(rig, mesh, { calib: cal });
  for (const d of (process.argv[3] || "A,B,C,D,E").split(",")) { const r = GA.runDrop(J, spec, d, { tsc: GA.GATE_A_TSC, world: GA.GATE_A_WORLD, keepStates: true, seconds: 6 });
    const first = r.recs.slice(1, 4).map(q => `${(q.selfPen * 1000).toFixed(1)}mm ${q.selfPair || ""}`).join(" | ");
    console.log(`${cal.padEnd(4)} ${d} recs ${r.recs.length} first steps self: ${first} · max ${r.maxSelfPenMm} @ ${JSON.stringify(r.maxSelfPenAt)}`); } }
