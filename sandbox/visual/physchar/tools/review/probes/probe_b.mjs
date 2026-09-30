import fs from "fs"; import path from "path";
const PC = process.argv[2], ROOT = path.resolve(PC, "../../.."), TESTK = process.argv[3], SEC = +process.argv[4] || 0;
const { buildBodySpec } = await import(PC + "/pc_body.js"); const { loadJolt } = await import(PC + "/pc_jolt.js"); const G = await import(PC + "/pc_gateb.js"); const C = await import(PC + "/pc_control.js"); const { Q, V, deg } = await import(PC + "/pc_math.js");
const dir = path.join(ROOT, "assets/characters/outfield/gabriel"), rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8")), buf = fs.readFileSync(path.join(dir, "mesh.bin"));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), L = rig.mesh.layout, T = { Float32Array, Uint16Array, Uint32Array, Uint8Array };
const mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new T[L[k].elementType](ab, L[k].byteOffset, L[k].elementCount);
const spec = buildBodySpec(rig, mesh), J = await loadJolt(PC + "/vendor/jolt-physics.wasm-compat.js");
const r = G.runTest(J, spec, TESTK, { keepStates: true, seconds: SEC || undefined });
const bi = (n) => spec.bodies.findIndex(b => b.name === n), f = (v) => "[" + v.map(x => x.toFixed(3)).join(",") + "]";
for (const rec of r.recs.filter((x, i) => i % 60 === 0)) { const S = rec.states, com = C.comOf(spec, S), fwd = Q.rot(S[0].rot, [0, 0, 1]), up = Q.rot(S[0].rot, [0, 1, 0]);
  console.log(`t ${rec.t.toFixed(2)} pelvis ${f(S[0].pos)} yaw ${deg(Math.atan2(fwd[0], fwd[2])).toFixed(1)} tilt ${deg(Math.acos(Math.min(1, up[1]))).toFixed(1)} COM ${f(com)} footL ${f(S[bi("foot_L")].pos)} footR ${f(S[bi("foot_R")].pos)} errRms ${deg(rec.errRms).toFixed(2)} KE ${rec.ke.toFixed(2)}${rec.sup ? " supF " + f(rec.sup.F) + " supT " + f(rec.sup.T) : ""}`); }
