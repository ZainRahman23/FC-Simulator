import fs from "fs"; import path from "path";
const PC = process.argv[2], ROOT = path.resolve(PC, "../../.."), KEY = process.argv[3], T0 = +process.argv[4], T1 = +process.argv[5], EVERY = +(process.argv[6] || 1);
const { buildBodySpec } = await import(PC + "/pc_body.js"); const { loadJolt } = await import(PC + "/pc_jolt.js"); const C1 = await import(PC + "/pc_gatec1.js");
const dir = path.join(ROOT, "assets/characters/outfield/gabriel"), rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8")), buf = fs.readFileSync(path.join(dir, "mesh.bin"));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), L = rig.mesh.layout, T = { Float32Array, Uint16Array, Uint32Array, Uint8Array };
const mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new T[L[k].elementType](ab, L[k].byteOffset, L[k].elementCount);
const spec = buildBodySpec(rig, mesh), J = await loadJolt(PC + "/vendor/jolt-physics.wasm-compat.js"), r = C1.runC1(J, spec, KEY, { keepStates: true });
for (const q of r.recs.filter((x, i) => x.t >= T0 && x.t <= T1 && i % EVERY === 0)) console.log(`t ${q.t.toFixed(4)} grf ${q.grf ? q.grf.map(v => v.toFixed(1)).join(",") : "-"}  L ${q.feet.L.state} ${q.feet.L.load.toFixed(1)}  R ${q.feet.R.state} ${q.feet.R.load.toFixed(1)}  selfContacts ${q.cts.filter(c => c.a >= 0 && c.b >= 0 && c.depth > -0.0005).map(c => spec.bodies[c.a].name + "-" + spec.bodies[c.b].name).join(" ")}  footSelf ${q.footSelf}`);
