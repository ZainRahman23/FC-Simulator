import fs from "fs"; import path from "path";
const PC = process.argv[2], ROOT = path.resolve(PC, "../../.."), KEY = process.argv[3], T0 = +process.argv[4], T1 = +process.argv[5], EVERY = +(process.argv[6] || 12), SW = process.argv[7] || "R";
const { buildBodySpec } = await import(PC + "/pc_body.js"); const { loadJolt } = await import(PC + "/pc_jolt.js"); const C2 = await import(PC + "/pc_gatec2.js"); const { Q, V } = await import(PC + "/pc_math.js");
const dir = path.join(ROOT, "assets/characters/outfield/gabriel"), rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8")), buf = fs.readFileSync(path.join(dir, "mesh.bin"));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), L = rig.mesh.layout, T = { Float32Array, Uint16Array, Uint32Array, Uint8Array };
const mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new T[L[k].elementType](ab, L[k].byteOffset, L[k].elementCount);
const spec = buildBodySpec(rig, mesh), J = await loadJolt(PC + "/vendor/jolt-physics.wasm-compat.js"), r = C2.runC2(J, spec, KEY, { keepStates: true });
const bi = (n) => spec.bodies.findIndex(b => b.name === n), ji = (n) => spec.joints.findIndex(j => j.name === n);
for (let i = 0; i < r.recs.length; i += EVERY) { const q = r.recs[i]; if (q.t < T0 || q.t > T1) continue; const f = q.states[bi("foot_" + SW)], fz = Q.rot(f.rot, [0, 0, 1]), th = q.states[bi("shin_" + SW)], sd = Q.rot(th.rot, [0, -1, 0]);
  console.log(`t ${q.t.toFixed(3)} ${String(q.reqStage).padEnd(8)} u ${q.swingTgt ? q.swingTgt.u.toFixed(2) : "-  "} ankle ${f.pos.map(v => v.toFixed(3))} tgt ${q.swingTgt ? q.swingTgt.pos.map(v => v.toFixed(3)) : "-"} sole ${(q.soleY[SW] * 100).toFixed(1)}cm pitch ${(-Math.asin(fz[1]) * 57.3).toFixed(1)} shinTiltBack ${(Math.asin(-sd[2]) * 57.3).toFixed(1)} knee ${(q.jt[ji("knee_" + SW)].act * 57.3).toFixed(0)} man ${q.feet[SW].manifold ? 1 : 0} T ${q.feet[SW].touching ? 1 : 0} pelvisY ${q.states[0].pos[1].toFixed(3)}`); }
