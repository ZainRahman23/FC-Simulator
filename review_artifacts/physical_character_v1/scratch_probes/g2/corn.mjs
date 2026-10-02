import fs from "fs"; import path from "path";
const PC = process.argv[2], ROOT = path.resolve(PC, "../../..");
const { buildBodySpec } = await import(PC + "/pc_body.js"); const { loadJolt } = await import(PC + "/pc_jolt.js"); const G = await import(PC + "/pc_gateg1a.js"); const { buildPoses } = await import(PC + "/pc_control.js"); const REF = await import(PC + "/pc_ref.js");
REF.initOfLoco(fs.readFileSync(path.join(PC, "../anim3d/of_loco.js"), "utf8"));
const dir = path.join(ROOT, "assets/characters/outfield/gabriel"), rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8")), buf = fs.readFileSync(path.join(dir, "mesh.bin"));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), L = rig.mesh.layout, T = { Float32Array, Uint16Array, Uint32Array, Uint8Array };
const mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new T[L[k].elementType](ab, L[k].byteOffset, L[k].elementCount);
const spec = buildBodySpec(rig, mesh, { calib: "V1.1" }), J = await loadJolt(PC + "/vendor/jolt-physics.wasm-compat.js"), poses = buildPoses(spec);
const G2 = await import(PC + "/pc_gateg2.js"); const { V, Q } = await import(PC + "/pc_math.js"); const f = (x, d = 3) => (+x).toFixed(d);
const r = G2.runG2a(J, spec, "G2a_walkInPlace", { poses, keepStates: true, seconds: 1.26 });
for (const nm of ["foot_R", "foot_L", "shin_R"]) { const i = spec.bodies.findIndex(b => b.name === nm); console.log(nm, i, JSON.stringify(spec.bodies[i].shapes.map(s => ({ type: s.type, pos: s.pos.map(v => +v.toFixed(3)), he: s.he && s.he.map(v => +v.toFixed(3)) })))); }
const q = r.recs.find(x => x.t >= 1.2375); for (const nm of ["foot_R", "foot_L"]) { const i = spec.bodies.findIndex(b => b.name === nm), st = q.states[i], sh = spec.bodies[i].shapes[0]; const cs = [];
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) cs.push(V.add(st.pos, Q.rot(st.rot, V.add(sh.pos, Q.rot(sh.rot || [0, 0, 0, 1], [sx * sh.he[0], sy * sh.he[1], sz * sh.he[2]])))));
  console.log(nm, "pos", st.pos.map(v => f(v)).join(","), "corners minY", f(Math.min(...cs.map(c => c[1]))), cs.map(c => c.map(v => f(v, 2)).join(",")).join(" | ")); }
console.log("contacts", JSON.stringify(q.cts.map(c => ({ a: c.a, b: c.b, d: +c.depth.toFixed(4), p: c.pts.map(p => p.map(v => +v.toFixed(3))) }))).slice(0, 800));
