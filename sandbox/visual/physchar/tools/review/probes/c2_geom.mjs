import fs from "fs"; import path from "path";
const PC = process.argv[2], ROOT = path.resolve(PC, "../../.."), KEY = process.argv[3], TS = process.argv[4].split(",").map(Number);
const { buildBodySpec } = await import(PC + "/pc_body.js"); const { loadJolt } = await import(PC + "/pc_jolt.js"); const C2 = await import(PC + "/pc_gatec2.js"); const { Q, V } = await import(PC + "/pc_math.js");
const dir = path.join(ROOT, "assets/characters/outfield/gabriel"), rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8")), buf = fs.readFileSync(path.join(dir, "mesh.bin"));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), L = rig.mesh.layout, T = { Float32Array, Uint16Array, Uint32Array, Uint8Array };
const mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new T[L[k].elementType](ab, L[k].byteOffset, L[k].elementCount);
const spec = buildBodySpec(rig, mesh), J = await loadJolt(PC + "/vendor/jolt-physics.wasm-compat.js"), r = C2.runC2(J, spec, KEY, { keepStates: true });
const bi = (n) => spec.bodies.findIndex(b => b.name === n);
console.log("masses", spec.bodies.map(b => `${b.name} ${b.mass.toFixed(1)}`).join(", "), "total", spec.totalMass.toFixed(1));
for (const t of TS) { const q = r.recs.find(x => Math.abs(x.t - t) < 0.003), S = q.states, hipL = S[bi("thigh_L")].pos, hipR = S[bi("thigh_R")].pos, kneeL = S[bi("shin_L")].pos, ankL = S[bi("foot_L")].pos;
  let m = 0, cx = 0; spec.bodies.forEach((b, i) => { if (["thigh_L", "shin_L", "foot_L"].includes(b.name)) return; m += b.mass; cx += b.mass * S[i].com[0]; });
  const cp = q.copSmooth; const up = Q.rot(S[0].rot, [0, 1, 0]), th = V.norm(V.sub(kneeL, hipL)), sh = V.norm(V.sub(ankL, kneeL));
  console.log(`t ${t} pelvis x ${S[0].pos[0].toFixed(3)} y ${S[0].pos[1].toFixed(3)} hipL ${hipL.map(v => v.toFixed(3))} hipR ${hipR.map(v => v.toFixed(3))} knee ${kneeL.map(v => v.toFixed(3))} ankle ${ankL.map(v => v.toFixed(3))} COM ${q.com.map(v => v.toFixed(3))} cop ${cp.map(v => v.toFixed(3))} above-hip COM x ${(cx / m).toFixed(3)} (m ${m.toFixed(1)}) → arm ${(cx / m - hipL[0]).toFixed(3)} τ≈ ${(m * 9.81 * (cx / m - hipL[0])).toFixed(0)} N·m | thigh dir ${th.map(v => v.toFixed(2))} shin dir ${sh.map(v => v.toFixed(2))}`); }
