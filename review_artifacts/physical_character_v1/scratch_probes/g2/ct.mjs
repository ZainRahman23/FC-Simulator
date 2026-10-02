import fs from "fs"; import path from "path";
const PC = process.argv[2], ROOT = path.resolve(PC, "../../..");
const { buildBodySpec } = await import(PC + "/pc_body.js"); const { loadJolt } = await import(PC + "/pc_jolt.js"); const G = await import(PC + "/pc_gateg1a.js"); const { buildPoses } = await import(PC + "/pc_control.js"); const REF = await import(PC + "/pc_ref.js");
REF.initOfLoco(fs.readFileSync(path.join(PC, "../anim3d/of_loco.js"), "utf8"));
const dir = path.join(ROOT, "assets/characters/outfield/gabriel"), rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8")), buf = fs.readFileSync(path.join(dir, "mesh.bin"));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), L = rig.mesh.layout, T = { Float32Array, Uint16Array, Uint32Array, Uint8Array };
const mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new T[L[k].elementType](ab, L[k].byteOffset, L[k].elementCount);
const spec = buildBodySpec(rig, mesh, { calib: "V1.1" }), J = await loadJolt(PC + "/vendor/jolt-physics.wasm-compat.js"), poses = buildPoses(spec);
const G2 = await import(PC + "/pc_gateg2.js"); const f = (x, d = 3) => (+x).toFixed(d);
const r = G2.runG2a(J, spec, "G2a_walkInPlace", { poses, keepStates: true, seconds: 1.4 }), nm = (i) => i === -1 ? "turf" : i < -1 ? "obst" + i : spec.bodies[i].name, fR = spec.bodies.findIndex(b => b.name === "foot_R");
for (const q of r.recs) { if (q.t < 1.2 || q.t > 1.3 || q.n % 3) continue; const cs = q.cts.filter(c => (c.a === fR || c.b === fR) && c.depth > -0.003);
  console.log(f(q.t), q.feet.R.state, "touching", q.feet.R.touching, "load", f(q.feet.R.load, 0), "|", cs.map(c => `${nm(c.a)}–${nm(c.b)} d ${f(c.depth * 1000, 1)}mm n ${c.normal.map(v => f(v, 2)).join(",")} p ${c.pts[0].map(v => f(v)).join(",")}`).join(" ; ")); }
