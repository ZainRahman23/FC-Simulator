// Gate A initial-condition validity per calibration: the first recorded step's self / turf penetration, joint-limit and joint-separation state
import fs from "fs"; import path from "path";
const PC = process.argv[2], ROOT = path.resolve(PC, "../../..");
const { buildBodySpec } = await import(PC + "/pc_body.js"); const { loadJolt } = await import(PC + "/pc_jolt.js"); const GA = await import(PC + "/pc_gatea.js");
const dir = path.join(ROOT, "assets/characters/outfield/gabriel"), rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8")), buf = fs.readFileSync(path.join(dir, "mesh.bin"));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), L = rig.mesh.layout, T = { Float32Array, Uint16Array, Uint32Array, Uint8Array };
const mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new T[L[k].elementType](ab, L[k].byteOffset, L[k].elementCount);
const J = await loadJolt(PC + "/vendor/jolt-physics.wasm-compat.js");
for (const cal of ["V1", "V1.1"]) { const spec = buildBodySpec(rig, mesh, { calib: cal });
  for (const d of Object.keys(GA.DROPS)) { const r = GA.runDrop(J, spec, d, { tsc: GA.GATE_A_TSC, world: GA.GATE_A_WORLD, keepStates: true, seconds: 0.02 }), q = r.recs[0], nm = (i) => i < 0 ? "turf" : spec.bodies[i].name;
    const pairs = (q.cts || []).filter(c => c.a >= 0 && c.b >= 0 && c.depth > 0.001).map(c => `${nm(c.a)}–${nm(c.b)} ${(c.depth * 1000).toFixed(0)}mm`);
    console.log(`${cal.padEnd(4)} ${d}  step1: self ${(q.selfPen * 1000).toFixed(1)} mm · turf ${(q.groundPen * 1000).toFixed(1)} mm · limit ${(q.limitViol * 57.3).toFixed(1)}° (${q.limitJoint >= 0 ? spec.joints[q.limitJoint].name : "-"}) · sep ${(q.anchorErr * 1000).toFixed(2)} mm · E ${q.E.toFixed(1)} J · overlaps ${pairs.join(", ") || "none"}`); } }
