import fs from "fs"; import path from "path";
const PC = process.argv[2], ROOT = path.resolve(PC, "../../..");
const { buildBodySpec } = await import(PC + "/pc_body.js"); const { loadJolt } = await import(PC + "/pc_jolt.js"); const G = await import(PC + "/pc_gateg1a.js"); const { buildPoses } = await import(PC + "/pc_control.js"); const REF = await import(PC + "/pc_ref.js");
REF.initOfLoco(fs.readFileSync(path.join(PC, "../anim3d/of_loco.js"), "utf8"));
const dir = path.join(ROOT, "assets/characters/outfield/gabriel"), rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8")), buf = fs.readFileSync(path.join(dir, "mesh.bin"));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), L = rig.mesh.layout, T = { Float32Array, Uint16Array, Uint32Array, Uint8Array };
const mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new T[L[k].elementType](ab, L[k].byteOffset, L[k].elementCount);
const spec = buildBodySpec(rig, mesh, { calib: "V1.1" }), J = await loadJolt(PC + "/vendor/jolt-physics.wasm-compat.js"), poses = buildPoses(spec);
const G2 = await import(PC + "/pc_gateg2.js"); const out = {};
for (const key of process.argv[3].split(",")) { const r = G2.runG2a(J, spec, key, { poses, keepStates: true, ...(process.argv[4] ? JSON.parse(process.argv[4]) : {}) }); const a = G2.analyzeG2a(spec, r); delete a.swings;
  out[key] = { outcome: r.outcome, hash: r.hash, landed: r.steps.filter(s => s.status === "LANDED").length, a };
  console.log(key.padEnd(18), r.outcome.padEnd(9), "pelvis ptp", a.yaw.pelvisPtpDeg, "max", a.yaw.pelvisMaxAbsDeg, "| chest ptp", a.yaw.chestPtpDeg, "| Lz all", a.angularMomentum.ptp.all, "legs", a.angularMomentum.ptp.legs, "arms", a.angularMomentum.ptp.arms, "| arms·legs r", a.angularMomentum.armsVsLegs, "| drift", a.yaw.driftDegPerCycle, a.yaw.turn ? "| TURN " + JSON.stringify(a.yaw.turn) : ""); }
fs.writeFileSync(process.env.OUT || "/dev/null", JSON.stringify(out, null, 1));
