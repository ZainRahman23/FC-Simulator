import fs from "fs"; import path from "path";
const PC = process.argv[2], ROOT = path.resolve(PC, "../../..");
const { buildBodySpec } = await import(PC + "/pc_body.js"); const C = await import(PC + "/pc_control.js"); const { V } = await import(PC + "/pc_math.js");
const dir = path.join(ROOT, "assets/characters/outfield/gabriel"), rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8")), buf = fs.readFileSync(path.join(dir, "mesh.bin"));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), L = rig.mesh.layout, T = { Float32Array, Uint16Array, Uint32Array, Uint8Array };
const mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new T[L[k].elementType](ab, L[k].byteOffset, L[k].elementCount);
const spec = buildBodySpec(rig, mesh), P = C.buildPoses(spec);
const f = (v) => "[" + v.map(x => x.toFixed(3)).join(",") + "]";
for (const k of ["N", "K", "REACH"]) { const p = P[k], S = p.S; const bi = (n) => spec.bodies.findIndex(b => b.name === n);
  console.log(k, "pelvis", f(S[0].pos), "COM", f(C.comOf(spec, S)), "footL", f(S[bi("foot_L")].pos), "footR", f(S[bi("foot_R")].pos), "thighL", f(S[bi("thigh_L")].pos), "shinL", f(S[bi("shin_L")].pos), "head", f(S[bi("head")].pos)); }
console.log("bind pelvis", f(spec.bodies[0].origin), "bind thigh_L", f(spec.bodies[spec.bodies.findIndex(b => b.name === "thigh_L")].origin), "bind foot_L", f(spec.bodies[spec.bodies.findIndex(b => b.name === "foot_L")].origin));
