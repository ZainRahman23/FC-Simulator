import fs from "fs"; import path from "path";
const PC = process.argv[2], ROOT = path.resolve(PC, "../../..");
const { buildBodySpec } = await import(PC + "/pc_body.js"); const { loadJolt } = await import(PC + "/pc_jolt.js"); const D = await import(PC + "/pc_gated.js"); const { buildPoses } = await import(PC + "/pc_control.js"); const { D6Diag } = await import(PC + "/pc_d6diag.js");
const dir = path.join(ROOT, "assets/characters/outfield/gabriel"), rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8")), buf = fs.readFileSync(path.join(dir, "mesh.bin"));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), L = rig.mesh.layout, T = { Float32Array, Uint16Array, Uint32Array, Uint8Array };
const mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new T[L[k].elementType](ab, L[k].byteOffset, L[k].elementCount);
const spec = buildBodySpec(rig, mesh, { calib: "V1.1" }), J = await loadJolt(PC + "/vendor/jolt-physics.wasm-compat.js"), poses = buildPoses(spec), d2 = 180 / Math.PI;
for (const key of process.argv.slice(3)) { const dg = new D6Diag(spec); D.runD(J, spec, key, { poses, onStep: (x) => dg.onStep(x) });
  const R = dg.rec, iT = R.findIndex(q => q.touch), win = R.slice(iT, iT + 72); const out = [];
  for (const n of ["ankle_L", "knee_L", "hip_L", "ankle_R", "knee_R", "hip_R"]) { const j = spec.joints.find(q => q.name === n), s = win.map(q => q.B.joints[n]);
    if (j.type === "hinge") { const lo = j.lo * d2, hi = j.hi * d2; out.push(`${n}: min margin ${Math.min(...s.map(x => Math.min(x.a - lo, hi - x.a))).toFixed(1)}° · limit torque ≤ ${Math.max(...s.map(x => Math.abs(x.limTq))).toFixed(1)} N·m`); continue; }
    const lim = j.limits, m = s.map(x => Math.min(x.a[0] - lim.twist[0] * d2, lim.twist[1] * d2 - x.a[0], x.a[1] - lim.swingY[0] * d2, lim.swingY[1] * d2 - x.a[1], x.a[2] - lim.swingZ[0] * d2, lim.swingZ[1] * d2 - x.a[2]));
    out.push(`${n}: min margin to any limit ${Math.min(...m).toFixed(1)}°`); }
  console.log(key, "(first 300 ms after touch)\n  " + out.join("\n  ")); }
