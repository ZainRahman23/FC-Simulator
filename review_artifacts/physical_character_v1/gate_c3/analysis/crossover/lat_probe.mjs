import fs from "fs"; import path from "path";
const PC = process.argv[2], ROOT = path.resolve(PC, "../../.."), TEST = process.argv[3], T0 = +(process.argv[4] || 1.0), T1 = +(process.argv[5] || 1.6), STEPT = +(process.argv[6] || 0.02);
const { buildBodySpec } = await import(PC + "/pc_body.js"); const { loadJolt } = await import(PC + "/pc_jolt.js"); const C3 = await import(PC + "/pc_gatec3.js");
const dir = path.join(ROOT, "assets/characters/outfield/gabriel"), rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8")), buf = fs.readFileSync(path.join(dir, "mesh.bin"));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), L = rig.mesh.layout, T = { Float32Array, Uint16Array, Uint32Array, Uint8Array };
const mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new T[L[k].elementType](ab, L[k].byteOffset, L[k].elementCount);
const spec = buildBodySpec(rig, mesh, { calib: "V1.1" }), J = await loadJolt(PC + "/vendor/jolt-physics.wasm-compat.js");
const extra = process.argv[7] ? JSON.parse(process.argv[7]) : {};
const r = C3.runC3(J, spec, TEST, { keepStates: true, ctrlExtra: extra.ctrl || {}, step: extra.step });
const bi = (n) => spec.bodies.findIndex(b => b.name === n), fL = bi("foot_L"), fR = bi("foot_R"), pel = bi("pelvis");
let next = T0; for (const x of r.recs) { if (x.t + 1e-9 < next || x.t > T1) continue; next += STEPT;
  const s = x.states, f = (i) => s[i].pos.map(v => v.toFixed(3)).join(",");
  console.log(`${x.t.toFixed(3)} ${String(x.cls).padEnd(16)} ξ ${x.xi ? [x.xi[0], x.xi[2] ?? x.xi[1]].map(v => v.toFixed(3)) : "-"} com ${x.com ? [x.com[0], x.com[2]].map(v => v.toFixed(3)) : "-"} ξm ${x.xiMargin != null ? (x.xiMargin * 100).toFixed(1) : "-"} L ${x.feet.L.state}/${x.feet.L.load.toFixed(0)} [${f(fL)}] R ${x.feet.R.state}/${x.feet.R.load.toFixed(0)} [${f(fR)}] pel [${f(pel)}] trunk ${x.trunk.toFixed(1)} ${x.step ? x.step.stage : ""}`); }
console.log(r.outcome, r.refused || "");
