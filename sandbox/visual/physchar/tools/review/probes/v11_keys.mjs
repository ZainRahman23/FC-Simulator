import fs from "fs"; import path from "path";
const PC = process.argv[2], ROOT = path.resolve(PC, "../../..");
const { buildBodySpec } = await import(PC + "/pc_body.js"); const { limitsFor } = await import(PC + "/pc_balance.js");
const dir = path.join(ROOT, "assets/characters/outfield/gabriel"), rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8")), buf = fs.readFileSync(path.join(dir, "mesh.bin"));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), L = rig.mesh.layout, T = { Float32Array, Uint16Array, Uint32Array, Uint8Array };
const mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new T[L[k].elementType](ab, L[k].byteOffset, L[k].elementCount);
const sp = buildBodySpec(rig, mesh, { calib: "V1.1" }); const j = sp.joints.find(x => x.name === "hip_R"), k = sp.joints.find(x => x.name === "knee_R");
console.log(Object.keys(sp.bodies[0]), JSON.stringify(sp.bodies[0]).slice(0, 300)); console.log(JSON.stringify(j.limits), j.swingY, j.swingZ, j.twist, j.bindAbductionDeg); console.log(Object.keys(k), k.lo, k.hi); console.log(JSON.stringify(limitsFor(sp)).slice(0, 600)); console.log(Object.keys(sp), sp.totalMass);
console.log(sp.bodies.map(b => b.name).join(","), sp.joints.map(j => j.name + ":" + sp.bodies[j.parentIndex].name).join(","));
