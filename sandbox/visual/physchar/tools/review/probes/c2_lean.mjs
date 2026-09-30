import fs from "fs"; import path from "path";
const PC = process.argv[2], ROOT = path.resolve(PC, "../../.."), KEY = process.argv[3], TS = process.argv[4].split(",").map(Number);
const { buildBodySpec } = await import(PC + "/pc_body.js"); const { loadJolt } = await import(PC + "/pc_jolt.js"); const C2 = await import(PC + "/pc_gatec2.js"); const { Q, V } = await import(PC + "/pc_math.js");
const dir = path.join(ROOT, "assets/characters/outfield/gabriel"), rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8")), buf = fs.readFileSync(path.join(dir, "mesh.bin"));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), L = rig.mesh.layout, T = { Float32Array, Uint16Array, Uint32Array, Uint8Array };
const mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new T[L[k].elementType](ab, L[k].byteOffset, L[k].elementCount);
const spec = buildBodySpec(rig, mesh), J = await loadJolt(PC + "/vendor/jolt-physics.wasm-compat.js"), r = C2.runC2(J, spec, KEY, { keepStates: true });
const bi = (n) => spec.bodies.findIndex(b => b.name === n);
for (const t of TS) { const q = r.recs.find(x => Math.abs(x.t - t) < 0.003), S = q.states; const up = ["abdomen", "chest", "head", "upperArm_L", "foreArm_L", "upperArm_R", "foreArm_R"].map(bi);
  let m = 0, cx = 0; for (const i of up) { m += spec.bodies[i].mass; cx += spec.bodies[i].mass * S[i].com[0]; }
  const cu = Q.rot(S[bi("chest")].rot, [0, 1, 0]), pu = Q.rot(S[0].rot, [0, 1, 0]);
  console.log(`t ${t} pelvis x ${S[0].pos[0].toFixed(3)} upper COM x ${(cx / m).toFixed(3)} (Δ ${(cx / m - S[0].pos[0]).toFixed(3)}) chest up ${cu.map(v => v.toFixed(3))} pelvis up ${pu.map(v => v.toFixed(3))} abdomen x ${S[bi("abdomen")].pos[0].toFixed(3)} chest x ${S[bi("chest")].pos[0].toFixed(3)} head x ${S[bi("head")].pos[0].toFixed(3)}`); }
