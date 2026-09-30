import fs from "fs"; import path from "path";
const PC = process.argv[2], ROOT = path.resolve(PC, "../../.."), TEST = process.argv[3];
const { buildBodySpec } = await import(PC + "/pc_body.js"); const { loadJolt } = await import(PC + "/pc_jolt.js"); const C3 = await import(PC + "/pc_gatec3.js"); const { Q } = await import(PC + "/pc_math.js");
const dir = path.join(ROOT, "assets/characters/outfield/gabriel"), rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8")), buf = fs.readFileSync(path.join(dir, "mesh.bin"));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), L = rig.mesh.layout, T = { Float32Array, Uint16Array, Uint32Array, Uint8Array };
const mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new T[L[k].elementType](ab, L[k].byteOffset, L[k].elementCount);
const spec = buildBodySpec(rig, mesh, { calib: "V1.1" }), J = await loadJolt(PC + "/vendor/jolt-physics.wasm-compat.js");
const r = C3.runC3(J, spec, TEST, { keepStates: true }), sw = r.step.foot;
const hp = spec.joints.findIndex(j => j.name === "hip_" + sw), kn = spec.joints.findIndex(j => j.name === "knee_" + sw);
const sy = (q) => { if (!Array.isArray(q)) return q * 57.3; const s = Q.swingTwist ? Q.swingTwist(q) : null; return s ? s.swingY * 57.3 : NaN; };
const i0 = r.recs.findIndex(q => q.stepStage === "SWING"); for (let k = i0; k < r.recs.length && k < i0 + 60; k += 5) { const q = r.recs[k], jh = q.jt[hp], jk = q.jt[kn];
  console.log(`${q.t.toFixed(3)} u ${q.swingTgt ? q.swingTgt.u.toFixed(2) : "-"} hip Y: nominal ${sy(jh.nom).toFixed(0)} final ${sy(jh.fin).toFixed(0)} actual ${sy(jh.act).toFixed(0)} (${(q.J[hp].eff * 100).toFixed(0)}%${q.J[hp].sat ? " SAT ax " + q.J[hp].satAx : ""}) · knee: nominal ${sy(jk.nom).toFixed(0)} final ${sy(jk.fin).toFixed(0)} actual ${sy(jk.act).toFixed(0)} (${(q.J[kn].eff * 100).toFixed(0)}%)`); if (q.stepStage !== "SWING") break; }
