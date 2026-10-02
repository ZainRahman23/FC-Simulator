import fs from "fs"; import path from "path";
const PC = process.argv[2], ROOT = path.resolve(PC, "../../..");
const { buildBodySpec } = await import(PC + "/pc_body.js"); const { loadJolt } = await import(PC + "/pc_jolt.js"); const G = await import(PC + "/pc_gateg1a.js"); const { buildPoses } = await import(PC + "/pc_control.js"); const REF = await import(PC + "/pc_ref.js");
REF.initOfLoco(fs.readFileSync(path.join(PC, "../anim3d/of_loco.js"), "utf8"));
const dir = path.join(ROOT, "assets/characters/outfield/gabriel"), rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8")), buf = fs.readFileSync(path.join(dir, "mesh.bin"));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), L = rig.mesh.layout, T = { Float32Array, Uint16Array, Uint32Array, Uint8Array };
const mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new T[L[k].elementType](ab, L[k].byteOffset, L[k].elementCount);
const spec = buildBodySpec(rig, mesh, { calib: "V1.1" }), J = await loadJolt(PC + "/vendor/jolt-physics.wasm-compat.js"), poses = buildPoses(spec);
const r = G.runG1a(J, spec, process.argv[3], { poses, keepStates: true, ...(process.argv[4] ? JSON.parse(process.argv[4]) : {}) }); const f = (x, d = 3) => (+x).toFixed(d);
const fL = spec.bodies.findIndex(b => b.name === "foot_L"), fR = spec.bodies.findIndex(b => b.name === "foot_R"); const t0 = +process.env.T0, t1 = +process.env.T1;
for (const q of r.recs) { if (q.t < t0 || q.t > t1) continue; const L = q.feet.L, R = q.feet.R;
  console.log(`${f(q.t)} L ${L.state.padEnd(9)} t${+L.touching} ${f(L.load, 0).padStart(5)} y ${f(q.states[fL].pos[1])} | R ${R.state.padEnd(9)} t${+R.touching} ${f(R.load, 0).padStart(5)} y ${f(q.states[fR].pos[1])} | ${q.exec ? q.exec.sw + " " + q.exec.stage : "-"} ${q.rhythm ? q.rhythm.stage : ""} | gait ${q.gait.role.L}/${q.gait.role.R} ${q.gait.support} | mon ${q.mon.verdict} views pl ${f(q.views.pl)}`); }
