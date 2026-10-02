import fs from "fs"; import path from "path";
const PC = process.argv[2], ROOT = path.resolve(PC, "../../..");
const { buildBodySpec } = await import(PC + "/pc_body.js"); const { loadJolt } = await import(PC + "/pc_jolt.js"); const G = await import(PC + "/pc_gateg1a.js"); const { buildPoses } = await import(PC + "/pc_control.js"); const REF = await import(PC + "/pc_ref.js");
REF.initOfLoco(fs.readFileSync(path.join(PC, "../anim3d/of_loco.js"), "utf8"));
const dir = path.join(ROOT, "assets/characters/outfield/gabriel"), rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8")), buf = fs.readFileSync(path.join(dir, "mesh.bin"));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), L = rig.mesh.layout, T = { Float32Array, Uint16Array, Uint32Array, Uint8Array };
const mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new T[L[k].elementType](ab, L[k].byteOffset, L[k].elementCount);
const spec = buildBodySpec(rig, mesh, { calib: "V1.1" }), J = await loadJolt(PC + "/vendor/jolt-physics.wasm-compat.js"), poses = buildPoses(spec);
const G2 = await import(PC + "/pc_gateg2.js"); const { Q } = await import(PC + "/pc_math.js"); const f = (x, d = 3) => x == null ? "-" : (+x).toFixed(d);
// trajectory: COM, COM velocity, pelvis / chest yaw, feet, every DT seconds
const r = G2.runG2a(J, spec, process.argv[3] || "G2b_walk08", { poses, keepStates: true, seconds: +(process.env.SEC || 8), ...(process.env.OVER ? JSON.parse(process.env.OVER) : {}) });
const DT = +(process.env.DT || 0.25), yaw = (q) => { const z = Q.rot(q, [0, 0, 1]); return Math.atan2(z[0], z[2]) * 57.3; }, ch = spec.bodies.findIndex(b => b.name === "chest"), fi = { R: spec.bodies.findIndex(b => b.name === "foot_R"), L: spec.bodies.findIndex(b => b.name === "foot_L") };
let nx = 0; for (const q of r.recs) { if (q.t + 1e-9 < nx) continue; nx += DT;
  console.log(`${f(q.t, 2)} ${q.rhythm ? q.rhythm.stage.padEnd(6) : ""} com ${q.com.map(v => f(v)).join(",")} v ${q.vcom.map(v => f(v, 2)).join(",")} | yaw pel ${f(yaw(q.states[0].rot), 1)} chest ${f(yaw(q.states[ch].rot), 1)} footL ${f(yaw(q.states[fi.L].rot), 1)} footR ${f(yaw(q.states[fi.R].rot), 1)} | L ${f(q.fp.L[0])},${f(q.fp.L[1])} R ${f(q.fp.R[0])},${f(q.fp.R[1])}`); }
