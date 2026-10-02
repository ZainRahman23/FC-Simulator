import fs from "fs"; import path from "path";
const PC = process.argv[2], ROOT = path.resolve(PC, "../../..");
const { buildBodySpec } = await import(PC + "/pc_body.js"); const { loadJolt } = await import(PC + "/pc_jolt.js"); const G = await import(PC + "/pc_gateg1a.js"); const { buildPoses } = await import(PC + "/pc_control.js"); const REF = await import(PC + "/pc_ref.js");
REF.initOfLoco(fs.readFileSync(path.join(PC, "../anim3d/of_loco.js"), "utf8"));
const dir = path.join(ROOT, "assets/characters/outfield/gabriel"), rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8")), buf = fs.readFileSync(path.join(dir, "mesh.bin"));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), L = rig.mesh.layout, T = { Float32Array, Uint16Array, Uint32Array, Uint8Array };
const mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new T[L[k].elementType](ab, L[k].byteOffset, L[k].elementCount);
const spec = buildBodySpec(rig, mesh, { calib: "V1.1" }), J = await loadJolt(PC + "/vendor/jolt-physics.wasm-compat.js"), poses = buildPoses(spec);
const B = await import(PC + "/pc_balance.js"); const D = 57.2958;
for (const n of ["ankle_L", "hip_L", "lumbar", "thoracic", "knee_L", "shoulder_L"]) { const j = spec.joints.find(x => x.name === n); console.log(n, j.type, j.limits ? JSON.stringify(Object.fromEntries(Object.entries(j.limits).map(([k, v]) => [k, Array.isArray(v) ? v.map(x => +(x * D).toFixed(1)) : v]))) : [j.lo * D, j.hi * D].map(v => v.toFixed(1)).join("..")); }
const ctl = new B.BalanceController(spec, poses, {}); console.log(JSON.stringify(ctl.limits && ctl.limits.ankle), JSON.stringify(ctl.gain && ctl.gain.find((g, k) => spec.joints[k].name === "ankle_L")));
