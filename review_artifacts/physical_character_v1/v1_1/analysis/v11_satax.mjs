import fs from "fs"; import path from "path";
const PC = process.argv[2], ROOT = path.resolve(PC, "../../.."), CAL = process.argv[3], TEST = process.argv[4], CTRL = JSON.parse(process.argv[5] || "null"), JN = (process.argv[6] || "hip_L").split(",");
const { buildBodySpec } = await import(PC + "/pc_body.js"); const { loadJolt } = await import(PC + "/pc_jolt.js"); const C2 = await import(PC + "/pc_gatec2.js");
const dir = path.join(ROOT, "assets/characters/outfield/gabriel"), rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8")), buf = fs.readFileSync(path.join(dir, "mesh.bin"));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), L = rig.mesh.layout, T = { Float32Array, Uint16Array, Uint32Array, Uint8Array };
const mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new T[L[k].elementType](ab, L[k].byteOffset, L[k].elementCount);
const spec = buildBodySpec(rig, mesh, { calib: CAL }), J = await loadJolt(PC + "/vendor/jolt-physics.wasm-compat.js"), r = C2.runC2(J, spec, TEST, { ctrl: CTRL, keepStates: true });
for (const jn of JN) { const k = spec.joints.findIndex(j => j.name === jn), cnt = {}, stages = {}; let first = null, last = null;
  for (const q of r.recs) { const x = q.J[k]; if (!x || !x.sat) continue; for (const a of x.satAx || ["h"]) cnt[a] = (cnt[a] || 0) + 1; stages[q.reqStage] = (stages[q.reqStage] || 0) + 1; first = first ?? q.t; last = q.t; }
  console.log(CAL, JSON.stringify(CTRL), TEST, jn, "sat steps by axis", JSON.stringify(cnt), "by stage", JSON.stringify(stages), "t", first, "..", last); }
