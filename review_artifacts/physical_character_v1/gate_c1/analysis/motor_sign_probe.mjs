import fs from "fs"; import path from "path";
const PC = process.argv[2], ROOT = path.resolve(PC, "../../..");
const { buildBodySpec } = await import(PC + "/pc_body.js"); const { loadJolt, JoltCharacterWorld } = await import(PC + "/pc_jolt.js");
const GB = await import(PC + "/pc_gateb.js"); const GA = await import(PC + "/pc_gatea.js"); const C = await import(PC + "/pc_control.js");
const dir = path.join(ROOT, "assets/characters/outfield/gabriel"), rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8")), buf = fs.readFileSync(path.join(dir, "mesh.bin"));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), L = rig.mesh.layout, T = { Float32Array, Uint16Array, Uint32Array, Uint8Array };
const mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new T[L[k].elementType](ab, L[k].byteOffset, L[k].elementCount);
const spec = buildBodySpec(rig, mesh), J = await loadJolt(PC + "/vendor/jolt-physics.wasm-compat.js"), P = C.buildPoses(spec);
for (const [jn, param, lab] of [["ankle_L", { y: 30 }, "ankle y+30 (plantarflexion)"], ["ankle_L", { y: -30 }, "ankle y−30 (dorsiflexion)"], ["knee_L", { a: 60 }, "knee a=60 (flexion)"], ["hip_L", { y: -50 }, "hip y−50 (flexion)"], ["lumbar", { y: 30 }, "lumbar y+30 (flexion)"], ["ankle_L", { z: 20 }, "ankle_L z+20"], ["elbow_L", { a: 90 }, "elbow a=90 (flexion)"], ["neck", { y: 30 }, "neck y+30 (flexion)"]]) {
  const w = new JoltCharacterWorld(J, spec, Object.assign({}, GB.GATE_B_WORLD, { gravity: 0 }), GA.frictionPolicy(spec)); for (const [a, b] of GA.disabledPairs(spec)) w.disablePair(a, b);
  const prof = C.motorProfile(spec, P.N.S, "candidate"); prof.forEach((m, k) => w.setMotor(k, m));
  P.N.S.forEach((s, i) => w.setPose(i, [s.pos[0], s.pos[1] + 2, s.pos[2]], s.rot));   // in the air, zero gravity
  const k = spec.joints.findIndex(j => j.name === jn);
  for (let q = 0; q < spec.joints.length; q++) w.setJointTarget(q, q === k ? C.paramTarget(spec.joints[q], param) : P.N.T[q], spec.joints[q].type === "hinge" ? 0 : [0, 0, 0]);
  w.step(1 / 240, 1); const l = w.motorLambda(k); console.log(`${lab.padEnd(30)} motor λ ${Array.isArray(l) ? "[" + l.map(x => (x * 240).toFixed(1)).join(", ") + "] N·m (X twist, Y, Z)" : (l * 240).toFixed(1) + " N·m"}`); w.destroy(); }
