import fs from "fs"; import path from "path";
const PC = process.argv[2], ROOT = path.resolve(PC, "../../.."), CAL = process.argv[3], DROP = process.argv[4] || "A";
const { buildBodySpec } = await import(PC + "/pc_body.js"); const { loadJolt } = await import(PC + "/pc_jolt.js"); const GA = await import(PC + "/pc_gatea.js");
const dir = path.join(ROOT, "assets/characters/outfield/gabriel"), rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8")), buf = fs.readFileSync(path.join(dir, "mesh.bin"));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), L = rig.mesh.layout, T = { Float32Array, Uint16Array, Uint32Array, Uint8Array };
const mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new T[L[k].elementType](ab, L[k].byteOffset, L[k].elementCount);
const spec = buildBodySpec(rig, mesh, { calib: CAL }), J = await loadJolt(PC + "/vendor/jolt-physics.wasm-compat.js");
const r = GA.runDrop(J, spec, DROP, { tsc: GA.GATE_A_TSC, world: GA.GATE_A_WORLD, keepStates: true, seconds: 6 }), nm = (i) => i === -1 ? "turf" : i < -1 ? "obst" : spec.bodies[i].name;
const top = r.recs.map((q, n) => ({ n, t: q.t, dE: n ? q.E - r.recs[n - 1].E : 0 })).sort((a, b) => b.dE - a.dE).slice(0, 6);
for (const x of top) { const q = r.recs[x.n]; const cts = (q.cts || []).filter(c => c.depth > 0.001).map(c => `${nm(c.a)}–${nm(c.b)} ${(c.depth * 1000).toFixed(1)}mm`).join(", ");
  console.log(`${CAL} ${DROP} n ${x.n} t ${x.t.toFixed(3)} ΔE ${x.dE.toFixed(2)} J | limit ${(q.limitViol * 57.3).toFixed(1)}° (${q.limitJoint >= 0 ? spec.joints[q.limitJoint].name : "-"}) sep ${(q.anchorErr * 1000).toFixed(1)} mm (${q.anchorJoint >= 0 ? spec.joints[q.anchorJoint].name : "-"}) self ${(q.selfPen * 1000).toFixed(1)} | deep contacts: ${cts.slice(0, 160)}`); }
