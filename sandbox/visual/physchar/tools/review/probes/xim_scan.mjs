import fs from "fs"; import path from "path";
const PC = process.argv[2], ROOT = path.resolve(PC, "../../.."), TESTS = process.argv[3].split(",");
const { buildBodySpec } = await import(PC + "/pc_body.js"); const { loadJolt } = await import(PC + "/pc_jolt.js"); const C3 = await import(PC + "/pc_gatec3.js");
const dir = path.join(ROOT, "assets/characters/outfield/gabriel"), rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8")), buf = fs.readFileSync(path.join(dir, "mesh.bin"));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), L = rig.mesh.layout, T = { Float32Array, Uint16Array, Uint32Array, Uint8Array };
const mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new T[L[k].elementType](ab, L[k].byteOffset, L[k].elementCount);
const spec = buildBodySpec(rig, mesh, { calib: "V1.1" }), J = await loadJolt(PC + "/vendor/jolt-physics.wasm-compat.js");
for (const t of TESTS) { const r = C3.runC3(J, spec, t, { noStep: true });
  let first = null, run = 0, maxRun = 0, minM = 1, tMin = null, firstLift = null, need = null;
  for (const x of r.recs) { if (x.t < 1.0) continue; const m = x.xiMargin; if (m < minM) { minM = m; tMin = x.t; }
    if (m < -0.01) { run++; if (first == null) first = x.t; maxRun = Math.max(maxRun, run); } else run = 0;
    if (firstLift == null && (x.feet.L.state === "AIR" || x.feet.R.state === "AIR")) firstLift = x.t + (x.feet.L.state === "AIR" ? " L" : " R");
    if (need == null && x.cls === "STEP_NEEDED") need = x.t; }
  console.log(`${t.padEnd(18)} ${r.outcome.padEnd(22)} first ξm<-1cm ${first ? first.toFixed(3) : "-"} longest ${(maxRun / 240 * 1000).toFixed(0)} ms  min ξm ${(minM * 100).toFixed(1)} @${tMin.toFixed(3)}  first AIR ${firstLift || "-"}  STEP_NEEDED ${need ? need.toFixed(3) : "-"}`); }
