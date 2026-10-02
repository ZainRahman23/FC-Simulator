import fs from "fs"; import path from "path";
const PC = process.argv[2], ROOT = path.resolve(PC, "../../..");
const { buildBodySpec } = await import(PC + "/pc_body.js"); const { loadJolt } = await import(PC + "/pc_jolt.js"); const D = await import(PC + "/pc_gated.js"); const { buildPoses } = await import(PC + "/pc_control.js"); const REF = await import(PC + "/pc_ref.js");
REF.initOfLoco(fs.readFileSync(path.join(PC, "../anim3d/of_loco.js"), "utf8"));
const dir = path.join(ROOT, "assets/characters/outfield/gabriel"), rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8")), buf = fs.readFileSync(path.join(dir, "mesh.bin"));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), L = rig.mesh.layout, T = { Float32Array, Uint16Array, Uint32Array, Uint8Array };
const mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new T[L[k].elementType](ab, L[k].byteOffset, L[k].elementCount);
const spec = buildBodySpec(rig, mesh, { calib: "V1.1" }), J = await loadJolt(PC + "/vendor/jolt-physics.wasm-compat.js"), poses = buildPoses(spec);
const extra = process.argv[4] ? JSON.parse(process.argv[4]) : {};
const key = process.argv[3], r = D.runD(J, spec, key, { poses, keepStates: true, ...extra }); const f = (x, d = 3) => x == null ? "-" : (+x).toFixed(d); const nb = spec.bodies.length;
const fL = spec.bodies.findIndex(b => b.name === "foot_L"), fR = spec.bodies.findIndex(b => b.name === "foot_R");
for (const q of r.recs) { if (q.t < 0.3 || q.t > 2.1 || q.n % 24) continue; const S = q.states, bl = S[nb + fL], br = S[nb + fR], b = q.B;
  const onA = (q.inter || []).filter(c => c.bn === "B.foot_L" || c.bn === "B.shin_L").map(c => `${c.an}↔${c.bn} ${f(c.depth * 1000, 1)}mm n${c.normal.map(v => f(v, 2)).join(",")}`).join("; ");
  console.log(`${f(q.t, 2)} ${b.cls.padEnd(20)} B.footL ${bl.pos.map(v => f(v)).join(",")} B.footR ${br.pos.map(v => f(v)).join(",")} ξ ${b.xi.map(v => f(v)).join(",")} | L ${b.feet.L.state} ${f(b.feet.L.load, 0)} | A↔B.L: ${onA}`); }
