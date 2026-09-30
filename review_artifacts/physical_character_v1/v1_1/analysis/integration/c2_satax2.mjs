import fs from "fs"; import path from "path";
const PC = process.argv[2], ROOT = path.resolve(PC, "../../.."), CAL = process.argv[3], FW = +process.argv[4], OW = +(process.argv[5] || 0), JN = (process.argv[6] || "hip_L,ankle_L,ankle_R,knee_L").split(",");
const { buildBodySpec } = await import(PC + "/pc_body.js"); const { loadJolt } = await import(PC + "/pc_jolt.js"); const C2 = await import(PC + "/pc_gatec2.js");
const dir = path.join(ROOT, "assets/characters/outfield/gabriel"), rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8")), buf = fs.readFileSync(path.join(dir, "mesh.bin"));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), L = rig.mesh.layout, T = { Float32Array, Uint16Array, Uint32Array, Uint8Array };
const mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new T[L[k].elementType](ab, L[k].byteOffset, L[k].elementCount);
const spec = buildBodySpec(rig, mesh, { calib: CAL }), J = await loadJolt(PC + "/vendor/jolt-physics.wasm-compat.js");
C2.TESTS_C2.X = { group: "x", title: "x", seconds: 8, requests: [{ type: "place", foot: "R", forward: FW, outward: OW, at: 0.5 }] };
const r = C2.runC2(J, spec, "X", { keepStates: true });
for (const jn of JN) { const k = spec.joints.findIndex(j => j.name === jn), by = {};
  for (const q of r.recs) { const x = q.J[k]; if (!x || !x.sat) continue; const st = q.reqStage || "rest"; by[st] = by[st] || {}; for (const a of (x.satAx || ["hinge"])) by[st][a] = (by[st][a] || 0) + 1; }
  console.log(jn, "saturated steps by stage → axis (0 twist, 1 swingY, 2 swingZ):", JSON.stringify(by)); }
