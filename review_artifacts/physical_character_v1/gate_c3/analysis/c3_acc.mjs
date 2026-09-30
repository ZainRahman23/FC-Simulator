import fs from "fs"; import path from "path";
const PC = process.argv[2], ROOT = path.resolve(PC, "../../.."), TEST = process.argv[3], T0 = +process.argv[4], T1 = +process.argv[5], EV = +(process.argv[6] || 6);
const { buildBodySpec } = await import(PC + "/pc_body.js"); const { loadJolt } = await import(PC + "/pc_jolt.js"); const C3 = await import(PC + "/pc_gatec3.js");
const dir = path.join(ROOT, "assets/characters/outfield/gabriel"), rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8")), buf = fs.readFileSync(path.join(dir, "mesh.bin"));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), L = rig.mesh.layout, T = { Float32Array, Uint16Array, Uint32Array, Uint8Array };
const mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new T[L[k].elementType](ab, L[k].byteOffset, L[k].elementCount);
const spec = buildBodySpec(rig, mesh, { calib: "V1.1" }), J = await loadJolt(PC + "/vendor/jolt-physics.wasm-compat.js"), ji = (n) => spec.joints.findIndex(j => j.name === n);
const r = C3.runC3(J, spec, TEST, { keepStates: true }), f = (v) => v ? v.map(x => (x * 100).toFixed(1)).join(",") : "-";
for (const q of r.recs) { if (q.t < T0 || q.t > T1 || q.n % EV) continue; const c = q.ctl || {};
  console.log(`t ${q.t.toFixed(3)} ${String(q.stepStage).padEnd(7)} ${q.cls.slice(0, 11).padEnd(11)} ξ ${f(q.xi)} ref ${f(c.xiRef)} p* ${f(c.pStar)} cop ${f(q.copSmooth)} ξm ${(q.xiMargin * 100).toFixed(1)} v ${f([q.vcom[0], q.vcom[2]])} | L ${q.feet.L.load.toFixed(0)} ${q.feet.L.state}${q.feet.L.slipping ? "!" : ""} R ${q.feet.R.load.toFixed(0)} ${q.feet.R.state}${q.feet.R.slipping ? "!" : ""} | trunk ${q.trunk.toFixed(0)} pelvis y ${q.states[0].pos[1].toFixed(3)} | hipL ${q.J[ji("hip_L")].eff.toFixed(2)} hipR ${q.J[ji("hip_R")].eff.toFixed(2)} ankL ${q.J[ji("ankle_L")].eff.toFixed(2)} ankR ${q.J[ji("ankle_R")].eff.toFixed(2)}`); }
