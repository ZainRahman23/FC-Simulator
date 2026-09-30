import fs from "fs"; import path from "path";
const PC = process.argv[2], ROOT = path.resolve(PC, "../../.."), TEST = process.argv[3];
const { buildBodySpec } = await import(PC + "/pc_body.js"); const { loadJolt } = await import(PC + "/pc_jolt.js"); const C3 = await import(PC + "/pc_gatec3.js");
const dir = path.join(ROOT, "assets/characters/outfield/gabriel"), rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8")), buf = fs.readFileSync(path.join(dir, "mesh.bin"));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), L = rig.mesh.layout, T = { Float32Array, Uint16Array, Uint32Array, Uint8Array };
const mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new T[L[k].elementType](ab, L[k].byteOffset, L[k].elementCount);
const spec = buildBodySpec(rig, mesh, { calib: "V1.1" }), J = await loadJolt(PC + "/vendor/jolt-physics.wasm-compat.js");
for (const arms of [false, true]) { const r = C3.runC3(J, spec, TEST, { keepStates: true, ctrlExtra: arms ? { reactiveArms: true } : {} }), R = r.step;
  console.log(arms ? "ARMS" : "no arms", r.outcome, JSON.stringify({ td: R && R.touchdownAfterNeedS, err: R && R.touchdown && R.touchdown.errCm, xiTd: R && R.xiMarginAtTouchdownCm, proj: R && R.planned && R.planned.projected, fail: R && R.fail }));
  for (const q of r.recs) { if (q.t < 1.25 || q.t > 1.9 || q.n % 24) continue; console.log(`   t ${q.t.toFixed(2)} ${String(q.stepStage).padEnd(7)} ${q.cls.slice(0, 12).padEnd(12)} ξm ${(q.xiMargin * 100).toFixed(1)} v ${Math.hypot(q.vcom[0], q.vcom[2]).toFixed(2)} L ${q.feet.L.load.toFixed(0)} ${q.feet.L.state} R ${q.feet.R.load.toFixed(0)} ${q.feet.R.state} trunk ${q.trunk.toFixed(0)}`); } }
