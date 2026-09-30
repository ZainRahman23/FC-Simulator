import fs from "fs"; import path from "path";
const PC = process.argv[2], ROOT = path.resolve(PC, "../../..");
const { buildBodySpec } = await import(PC + "/pc_body.js"); const { loadJolt } = await import(PC + "/pc_jolt.js"); const C2 = await import(PC + "/pc_gatec2.js"); const { Q } = await import(PC + "/pc_math.js");
const dir = path.join(ROOT, "assets/characters/outfield/gabriel"), rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8")), buf = fs.readFileSync(path.join(dir, "mesh.bin"));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), L = rig.mesh.layout, T = { Float32Array, Uint16Array, Uint32Array, Uint8Array };
const mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new T[L[k].elementType](ab, L[k].byteOffset, L[k].elementCount);
const spec = buildBodySpec(rig, mesh), J = await loadJolt(PC + "/vendor/jolt-physics.wasm-compat.js"), r = C2.runC2(J, spec, "H_uneven", { keepStates: true });
console.log("slab", JSON.stringify(r.env.terrain));
for (const t of [r.reqRaw[0].td.t + 0.01, 4.0, 5.9]) { const q = r.recs.find(x => Math.abs(x.t - t) < 0.003), f = q.feet.R, fr = q.states[spec.bodies.findIndex(b => b.name === "foot_R")]; const up = Q.rot(fr.rot, [0, 1, 0]), fz = Q.rot(fr.rot, [0, 0, 1]);
  const ys = f.points.map(p => p[1]), onSlab = f.points.filter(p => p[1] > 0.02).length;
  console.log(`t ${t.toFixed(2)} R ${f.state} load ${f.load.toFixed(0)} N · contact points ${f.points.length} (on slab y>2 cm: ${onSlab}) y range ${Math.min(...ys).toFixed(3)}–${Math.max(...ys).toFixed(3)} · foot pitch (toe-up +) ${(Math.asin(fz[1]) * 57.3).toFixed(1)}° · ankle ${fr.pos.map(v => v.toFixed(3))}`); }
