// EXPERIMENT: support by another body counted in the support region (Sensor option externalSupport) — D2–D5 with and without
import fs from "fs"; import path from "path";
const PC = process.argv[2], ROOT = path.resolve(PC, "../../..");
const { buildBodySpec } = await import(PC + "/pc_body.js"); const { loadJolt } = await import(PC + "/pc_jolt.js"); const D = await import(PC + "/pc_gated.js");
const dir = path.join(ROOT, "assets/characters/outfield/gabriel"), rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8")), buf = fs.readFileSync(path.join(dir, "mesh.bin"));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), L = rig.mesh.layout, T = { Float32Array, Uint16Array, Uint32Array, Uint8Array };
const mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new T[L[k].elementType](ab, L[k].byteOffset, L[k].elementCount);
const spec = buildBodySpec(rig, mesh, { calib: "V1.1" }), J = await loadJolt(PC + "/vendor/jolt-physics.wasm-compat.js");
for (const t of ["D2_shoved_into", "D3_shoulder", "D4_shoved_hard", "D5_shoulder_hard"]) for (const ext of [false, true]) {
  const r = D.runD(J, spec, t, { keepStates: true, ctrlExtra: ext ? { externalSupport: true } : undefined }), last = r.recs[r.recs.length - 1];
  const supported = r.recs.filter(q => q.A.cls !== "FALLING" && q.A.cls !== "GROUNDED").length, relA = r.recs.find(q => q.A.cls === "FALLING");
  const comA = last.A.com, pel = last.states[0].pos;
  console.log(`${t.padEnd(17)} ${ext ? "EXT-SUPPORT" : "turf only  "} · A final ${last.A.cls.padEnd(18)} released ${relA ? relA.t.toFixed(2) + " s" : "never"} · A pelvis height ${pel[1].toFixed(2)} m · A trunk ${last.A.trunk.toFixed(0)}° · A non-foot ground ${r.recs.some(q => q.A.nonFootGround)} · B ${last.B.cls} · hash ${r.hash}`); }
