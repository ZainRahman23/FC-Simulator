import fs from "fs"; import path from "path";
const PC = process.argv[2], ROOT = path.resolve(PC, "../../..");
const { buildBodySpec } = await import(PC + "/pc_body.js"); const { loadJolt } = await import(PC + "/pc_jolt.js"); const G = await import(PC + "/pc_gateg1a.js"); const { buildPoses } = await import(PC + "/pc_control.js"); const REF = await import(PC + "/pc_ref.js");
REF.initOfLoco(fs.readFileSync(path.join(PC, "../anim3d/of_loco.js"), "utf8"));
const dir = path.join(ROOT, "assets/characters/outfield/gabriel"), rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8")), buf = fs.readFileSync(path.join(dir, "mesh.bin"));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), L = rig.mesh.layout, T = { Float32Array, Uint16Array, Uint32Array, Uint8Array };
const mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new T[L[k].elementType](ab, L[k].byteOffset, L[k].elementCount);
const spec = buildBodySpec(rig, mesh, { calib: "V1.1" }), J = await loadJolt(PC + "/vendor/jolt-physics.wasm-compat.js"), poses = buildPoses(spec);
const key = process.argv[3], r = G.runG1a(J, spec, key, { poses, keepStates: true, ...(process.argv[4] ? JSON.parse(process.argv[4]) : {}) }); const f = (x, d = 3) => x == null ? "-" : (+x).toFixed(d);
const t0 = +(process.env.T0 || 3.4), t1 = +(process.env.T1 || 8), ev = +(process.env.EV || 24);
for (const q of r.recs) { if (q.t < t0 || q.t > t1 || q.n % ev) continue; const e = q.exec;
  console.log(`${f(q.t, 2)} ${e ? `${e.kind[0]}${e.sw} ${e.stage.slice(0, 6).padEnd(6)} u${f(e.u, 2)}` : "-".padEnd(17)} ${q.rhythm ? q.rhythm.stage : ""} | ξ ${f(q.xi[0])},${f(q.xi[1])} com ${f(q.com[0])},${f(q.com[2])} v ${f(q.vcom[0], 2)},${f(q.vcom[2], 2)} | fL ${q.fp.L.map(v => f(v)).join(",")} fR ${q.fp.R.map(v => f(v)).join(",")} | L ${q.feet.L.state.slice(0, 5)} ${f(q.feet.L.load, 0)} R ${q.feet.R.state.slice(0, 5)} ${f(q.feet.R.load, 0)} | ${q.mon.verdict} trunk ${f(q.trunk, 1)} yawP ${f(Math.atan2(2 * (q.states[0].rot[3] * q.states[0].rot[1] + q.states[0].rot[0] * q.states[0].rot[2]), 1 - 2 * (q.states[0].rot[1] ** 2 + q.states[0].rot[2] ** 2)) * 57.3, 1)}`); }
for (const e of r.gaitEvents) if (e.kind === "PUSH") console.log("PUSH", JSON.stringify(e));
