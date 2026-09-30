import fs from "fs"; import path from "path";
const PC = process.argv[2], ROOT = path.resolve(PC, "../../.."), TEST = process.argv[3];
const { buildBodySpec, shapeLowestY } = await import(PC + "/pc_body.js"); const { loadJolt } = await import(PC + "/pc_jolt.js"); const C3 = await import(PC + "/pc_gatec3.js"); const { V, Q } = await import(PC + "/pc_math.js");
const dir = path.join(ROOT, "assets/characters/outfield/gabriel"), rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8")), buf = fs.readFileSync(path.join(dir, "mesh.bin"));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), L = rig.mesh.layout, T = { Float32Array, Uint16Array, Uint32Array, Uint8Array };
const mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new T[L[k].elementType](ab, L[k].byteOffset, L[k].elementCount);
const spec = buildBodySpec(rig, mesh, { calib: "V1.1" }), J = await loadJolt(PC + "/vendor/jolt-physics.wasm-compat.js");
const r = C3.runC3(J, spec, TEST, { keepStates: true }), sw = r.step.foot, fi = spec.bodies.findIndex(b => b.name === "foot_" + sw), box = spec.bodies[fi].shapes[0];
const kn = spec.joints.findIndex(j => j.name === "knee_" + sw), hp = spec.joints.findIndex(j => j.name === "hip_" + sw), an = spec.joints.findIndex(j => j.name === "ankle_" + sw);
const i0 = r.recs.findIndex(q => q.stepStage === "SWING"); for (let k = i0; k < r.recs.length && k < i0 + 130; k += 5) { const q = r.recs[k], s = q.states[fi];
  const toe = V.add(s.pos, Q.rot(s.rot, [0, box.pos[1] - box.he[1], box.pos[2] + box.he[2]])), heel = V.add(s.pos, Q.rot(s.rot, [0, box.pos[1] - box.he[1], box.pos[2] - box.he[2]]));
  const fwd = Q.rot(s.rot, [0, 0, 1]), pitch = Math.asin(Math.max(-1, Math.min(1, -fwd[1]))) * 57.3, tg = q.swingTgt;
  console.log(`${q.t.toFixed(3)} ${String(q.stepStage).padEnd(7)} u ${tg ? tg.u.toFixed(2) : "-   "} tgt ${tg ? tg.pos.map(v => v.toFixed(3)).join(",") : "-".padEnd(19)} ankle ${s.pos.map(v => v.toFixed(3)).join(",")} toeY ${toe[1].toFixed(3)} heelY ${heel[1].toFixed(3)} pitch ${pitch.toFixed(0)}° (+ toe down) · pelvisY ${q.states[0].pos[1].toFixed(3)} trunk ${q.trunk.toFixed(0)}° · hip ${(q.J[hp].eff * 100).toFixed(0)}% knee ${(q.J[kn].eff * 100).toFixed(0)}% ankle ${(q.J[an].eff * 100).toFixed(0)}% · ${sw} ${q.feet[sw].state}`); if (q.stepStage === "ACCEPT" || q.stepStage === "FAILED") break; }
