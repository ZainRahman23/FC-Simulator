import fs from "fs"; import path from "path";
const PC = process.argv[2], ROOT = path.resolve(PC, "../../.."), CAL = process.argv[3], TEST = process.argv[4], CTRL = JSON.parse(process.argv[5] || "null"), JN = (process.argv[6] || "ankle_R").split(",");
const { buildBodySpec } = await import(PC + "/pc_body.js"); const { loadJolt } = await import(PC + "/pc_jolt.js"); const C2 = await import(PC + "/pc_gatec2.js"); const { jointState } = await import(PC + "/pc_gatea.js");
const dir = path.join(ROOT, "assets/characters/outfield/gabriel"), rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8")), buf = fs.readFileSync(path.join(dir, "mesh.bin"));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), L = rig.mesh.layout, T = { Float32Array, Uint16Array, Uint32Array, Uint8Array };
const mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new T[L[k].elementType](ab, L[k].byteOffset, L[k].elementCount);
const spec = buildBodySpec(rig, mesh, { calib: CAL }), J = await loadJolt(PC + "/vendor/jolt-physics.wasm-compat.js"), r = C2.runC2(J, spec, TEST, { ctrl: CTRL, keepStates: true }), d = 57.2958;
for (const jn of JN) { const j = spec.joints.find(q => q.name === jn), Lm = j.limits, best = {};
  for (const q of r.recs) { const s = jointState(j, q.states); for (const [ax, lo, hi, v] of [["twist", Lm.twist[0], Lm.twist[1], s.twist], ["Y(df-/pf+)", Lm.swingY[0], Lm.swingY[1], s.swingY], ["Z(inv/ev)", Lm.swingZ[0], Lm.swingZ[1], s.swingZ]]) { const m = Math.min(v - lo, hi - v) * d; if (!best[ax] || m < best[ax].m) best[ax] = { m: +m.toFixed(2), v: +(v * d).toFixed(1), lim: [+(lo * d).toFixed(1), +(hi * d).toFixed(1)], t: q.t, stage: q.reqStage }; } }
  console.log(CAL, TEST, jn, JSON.stringify(best)); }
