import fs from "fs"; import path from "path";
const PC = process.argv[2], ROOT = path.resolve(PC, "../../..");
const { buildBodySpec } = await import(PC + "/pc_body.js"); const { loadJolt } = await import(PC + "/pc_jolt.js"); const G = await import(PC + "/pc_gateg1a.js"); const { buildPoses } = await import(PC + "/pc_control.js"); const REF = await import(PC + "/pc_ref.js");
REF.initOfLoco(fs.readFileSync(path.join(PC, "../anim3d/of_loco.js"), "utf8"));
const dir = path.join(ROOT, "assets/characters/outfield/gabriel"), rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8")), buf = fs.readFileSync(path.join(dir, "mesh.bin"));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), L = rig.mesh.layout, T = { Float32Array, Uint16Array, Uint32Array, Uint8Array };
const mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new T[L[k].elementType](ab, L[k].byteOffset, L[k].elementCount);
const spec = buildBodySpec(rig, mesh, { calib: "V1.1" }), J = await loadJolt(PC + "/vendor/jolt-physics.wasm-compat.js"), poses = buildPoses(spec);
const P = REF.inPlaceWalkParams(); console.log(JSON.stringify(P).slice(0, 400));
for (const u of [0, 0.1, 0.25, 0.5, 0.667, 0.75, 0.83, 0.92, 0.99]) { const p = REF.refPose(P, u); const f = (a) => a.map(v => (+v).toFixed(1)).join(",");
  console.log(`u ${u.toFixed(2)} R thigh ${f(p.thigh_R)} shin ${f(p.shin_R)} foot ${f(p.foot_R)} | L thigh ${f(p.thigh_L)} shin ${f(p.shin_L)} | pelvis ${f(p.pelvis)} spine ${f(p.spine)} chest ${f(p.chest)} | armR ${f(p.upperArm_R)} armL ${f(p.upperArm_L)} elbowR ${f(p.foreArm_R)}`); }
