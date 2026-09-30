import fs from "fs"; import path from "path";
const PC = process.argv[2], ROOT = path.resolve(PC, "../../.."), CAL = process.argv[3], TEST = process.argv[4];
const { buildBodySpec } = await import(PC + "/pc_body.js"); const { loadJolt } = await import(PC + "/pc_jolt.js"); const C1 = await import(PC + "/pc_gatec1.js"); const { limitsFor } = await import(PC + "/pc_balance.js");
const dir = path.join(ROOT, "assets/characters/outfield/gabriel"), rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8")), buf = fs.readFileSync(path.join(dir, "mesh.bin"));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), L = rig.mesh.layout, T = { Float32Array, Uint16Array, Uint32Array, Uint8Array };
const mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new T[L[k].elementType](ab, L[k].byteOffset, L[k].elementCount);
const spec = buildBodySpec(rig, mesh, { calib: CAL }), J = await loadJolt(PC + "/vendor/jolt-physics.wasm-compat.js"), r = C1.runC1(J, spec, TEST, { keepStates: true });
for (const jn of ["hip_L", "ankle_L"]) { const k = spec.joints.findIndex(j => j.name === jn); const recs = r.recs.filter(q => q.t > 2 && q.t < 6); const m = [0, 0, 0], pk = [0, 0, 0], effPk = { v: 0 };
  for (const q of recs) { const lam = q.J[k].lam; for (let i = 0; i < 3; i++) { const t = lam[i] * 240; m[i] += Math.abs(t) / recs.length; pk[i] = Math.max(pk[i], Math.abs(t)); } effPk.v = Math.max(effPk.v, q.J[k].eff); }
  console.log(CAL, TEST, jn, "t 2–6 s mean |τ| X/Y/Z", m.map(v => v.toFixed(1)).join(" / "), "peak", pk.map(v => v.toFixed(1)).join(" / "), "peak eff", effPk.v.toFixed(2), "caps", JSON.stringify(limitsFor(spec)[jn.startsWith("hip") ? "hip" : "ankle"])); }
