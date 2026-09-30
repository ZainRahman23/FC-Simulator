import fs from "fs"; import path from "path";
const PC = process.argv[2], ROOT = path.resolve(PC, "../../.."), KEY = process.argv[3], T0 = +process.argv[4], T1 = +process.argv[5], EVERY = +(process.argv[6] || 12), SW = process.argv[7] || "R";
const { buildBodySpec } = await import(PC + "/pc_body.js"); const { loadJolt } = await import(PC + "/pc_jolt.js"); const C2 = await import(PC + "/pc_gatec2.js"); const { Q, V } = await import(PC + "/pc_math.js");
const dir = path.join(ROOT, "assets/characters/outfield/gabriel"), rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8")), buf = fs.readFileSync(path.join(dir, "mesh.bin"));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), L = rig.mesh.layout, T = { Float32Array, Uint16Array, Uint32Array, Uint8Array };
const mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new T[L[k].elementType](ab, L[k].byteOffset, L[k].elementCount);
const spec = buildBodySpec(rig, mesh), J = await loadJolt(PC + "/vendor/jolt-physics.wasm-compat.js"), r = C2.runC2(J, spec, KEY, { keepStates: true });
const bi = (n) => spec.bodies.findIndex(b => b.name === n);
for (let i = 0; i < r.recs.length; i += EVERY) { const q = r.recs[i]; if (q.t < T0 || q.t > T1) continue; const f = q.feet[SW], p = q.states[bi("foot_" + SW)].pos;
  console.log(`t ${q.t.toFixed(3)} ${String(q.reqStage).padEnd(8)} ${q.cls.slice(0, 12).padEnd(12)} foot ${p.map(v => v.toFixed(3))} ${f.state.padEnd(9)} T ${f.touching ? 1 : 0} ld ${f.loaded ? 1 : 0} slip ${f.slipping ? 1 : 0} load ${f.load.toFixed(0).padStart(4)} anchor ${f.anchor ? f.anchor.map(v => v.toFixed(3)) : "-"} tgt ${q.swingTgt ? q.swingTgt.pos.map(v => v.toFixed(3)) : "-"} ξ ${q.xi.map(v => v.toFixed(3))} ξref ${q.xiRef ? q.xiRef.map(v => v.toFixed(3)) : "-"}`); }
