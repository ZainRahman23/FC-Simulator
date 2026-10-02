import fs from "fs"; import path from "path";
const PC = process.argv[2], ROOT = path.resolve(PC, "../../..");
const { buildBodySpec } = await import(PC + "/pc_body.js"); const { loadJolt } = await import(PC + "/pc_jolt.js"); const D = await import(PC + "/pc_gated.js"); const { buildPoses } = await import(PC + "/pc_control.js"); const REF = await import(PC + "/pc_ref.js");
REF.initOfLoco(fs.readFileSync(path.join(PC, "../anim3d/of_loco.js"), "utf8"));
const dir = path.join(ROOT, "assets/characters/outfield/gabriel"), rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8")), buf = fs.readFileSync(path.join(dir, "mesh.bin"));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), L = rig.mesh.layout, T = { Float32Array, Uint16Array, Uint32Array, Uint8Array };
const mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new T[L[k].elementType](ab, L[k].byteOffset, L[k].elementCount);
const spec = buildBodySpec(rig, mesh, { calib: "V1.1" }), J = await loadJolt(PC + "/vendor/jolt-physics.wasm-compat.js"), poses = buildPoses(spec);
const extra = process.argv[4] ? JSON.parse(process.argv[4]) : {};
const key = process.argv[3], r = D.runD(J, spec, key, { poses, keepStates: false, ...extra }); const f = (x, d = 3) => x == null ? "-" : (+x).toFixed(d);
const t0 = +(process.env.T0 || 0), t1 = +(process.env.T1 || 3), ev = +(process.env.EV || 12);
console.log(Object.keys(r.recs[0]).join(","), "|", Object.keys(r.recs[0].B || r.recs[0].per?.B || {}).join(","));
for (const q of r.recs) { if (q.t < t0 || q.t > t1 || q.n % ev) continue; const b = q.B || (q.per && q.per.B); if (!b) continue;
  console.log(`${f(q.t, 3)} ${String(b.cls).padEnd(22)} ${String(b.stage).padEnd(8)} ξm ${f(b.xiMargin)} trunk ${f(b.trunk, 1)} | L ${b.feet ? b.feet.L.state + " " + f(b.feet.L.load, 0) : ""} R ${b.feet ? b.feet.R.state + " " + f(b.feet.R.load, 0) : ""} | ${b.reason ? String(b.reason).slice(0, 80) : ""}`); }
