import fs from "fs"; import path from "path";
const PC = process.argv[2], ROOT = path.resolve(PC, "../../..");
const { buildBodySpec } = await import(PC + "/pc_body.js"); const { loadJolt } = await import(PC + "/pc_jolt.js"); const C1 = await import(PC + "/pc_gatec1.js"); const B = await import(PC + "/pc_balance.js"); const { Q, V } = await import(PC + "/pc_math.js");
const dir = path.join(ROOT, "assets/characters/outfield/gabriel"), rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8")), buf = fs.readFileSync(path.join(dir, "mesh.bin"));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), L = rig.mesh.layout, T = { Float32Array, Uint16Array, Uint32Array, Uint8Array };
const mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new T[L[k].elementType](ab, L[k].byteOffset, L[k].elementCount);
const spec = buildBodySpec(rig, mesh), J = await loadJolt(PC + "/vendor/jolt-physics.wasm-compat.js");
const hipL = spec.joints.findIndex(j => j.name === "hip_L"), kneeL = spec.joints.findIndex(j => j.name === "knee_L");
for (const [fs_, ft] of (process.argv[3] || "0.15:0,0.3:0.6").split(",").map(x => x.split(":").map(Number))) { B.BAL.fallScale = fs_; B.BAL.fallTone = ft;
  const out = []; for (const key of ["G_fall", "PF65", "PB35", "PR50"]) { const r = C1.runC1(J, spec, key, { keepStates: true }); const tf = r.classTimes.FALLING, tg = r.tGrounded, t0 = r.push.at ?? 1.0;
    const win = r.recs.filter(q => q.cls === "FALLING"); let hipMax = 0, kneeMax = 0; for (const q of win) { const s = Q.swingTwist(q.jt[hipL].act); hipMax = Math.max(hipMax, -s.swingY * 180 / Math.PI); kneeMax = Math.max(kneeMax, q.jt[kneeL].act * 180 / Math.PI); }
    out.push(`${key} ${r.outcome} fall ${tf} ground ${tg} lead ${r.fallLeadS} hipFlexMax ${hipMax.toFixed(0)}° kneeMax ${kneeMax.toFixed(0)}° trunkMax ${r.whole.trunkTiltMaxDeg}°`); }
  console.log(`fallScale ${fs_} fallTone ${ft}:\n  ` + out.join("\n  ")); }
