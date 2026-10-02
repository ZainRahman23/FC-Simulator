import fs from "fs"; import path from "path";
const PC = process.argv[2], ROOT = path.resolve(PC, "../../..");
const { buildBodySpec } = await import(PC + "/pc_body.js"); const { loadJolt } = await import(PC + "/pc_jolt.js"); const G = await import(PC + "/pc_gateg1a.js"); const { buildPoses } = await import(PC + "/pc_control.js"); const REF = await import(PC + "/pc_ref.js");
REF.initOfLoco(fs.readFileSync(path.join(PC, "../anim3d/of_loco.js"), "utf8"));
const dir = path.join(ROOT, "assets/characters/outfield/gabriel"), rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8")), buf = fs.readFileSync(path.join(dir, "mesh.bin"));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), L = rig.mesh.layout, T = { Float32Array, Uint16Array, Uint32Array, Uint8Array };
const mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new T[L[k].elementType](ab, L[k].byteOffset, L[k].elementCount);
const spec = buildBodySpec(rig, mesh, { calib: "V1.1" }), J = await loadJolt(PC + "/vendor/jolt-physics.wasm-compat.js"), poses = buildPoses(spec);
const G2 = await import(PC + "/pc_gateg2.js"); const { Q } = await import(PC + "/pc_math.js"); const f = (x, d = 3) => x == null ? "-" : (+x).toFixed(d);
// vertical angular momentum about the whole-body COM by body group during walking + pelvis yaw + the stance feet's free moment proxy
const r = G2.runG2a(J, spec, process.argv[3] || "G2b_walk08", { poses, keepStates: true, seconds: +(process.env.SEC || 2.6), ...(process.env.OVER ? JSON.parse(process.env.OVER) : {}) });
const t0 = +(process.env.T0 || 1.2), t1 = +(process.env.T1 || 2.5), ev = +(process.env.EV || 12), yaw = (q) => { const z = Q.rot(q, [0, 0, 1]); return Math.atan2(z[0], z[2]) * 57.3; };
for (const q of r.recs) { if (q.t < t0 || q.t > t1 || q.n % ev) continue; const lz = G2.amBudget(spec, q.states);
  console.log(`${f(q.t, 2)} ${q.rhythm ? q.rhythm.stage.padEnd(3) : ""} ${q.exec ? q.exec.sw + "sw" : "   "} yaw ${f(yaw(q.states[0].rot), 1).padStart(6)} | Lz all ${f(lz.all, 2).padStart(6)} legs ${f(lz.legs, 2).padStart(6)} arms ${f(lz.arms, 2).padStart(6)} trunk ${f(lz.trunk, 2).padStart(6)} pelvis ${f(lz.pelvis, 2).padStart(6)}`); }
