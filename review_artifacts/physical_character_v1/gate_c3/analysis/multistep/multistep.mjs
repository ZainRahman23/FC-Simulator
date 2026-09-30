// EXPERIMENT: C3 with a second / third capture step (opts.step.maxSteps) on the cases that failed only because "a second step would be needed"
import fs from "fs"; import path from "path";
const PC = process.argv[2], ROOT = path.resolve(PC, "../../.."), MAXS = (process.argv[4] || "1,2,3").split(",").map(Number);
const { buildBodySpec } = await import(PC + "/pc_body.js"); const { loadJolt } = await import(PC + "/pc_jolt.js"); const C3 = await import(PC + "/pc_gatec3.js");
const dir = path.join(ROOT, "assets/characters/outfield/gabriel"), rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8")), buf = fs.readFileSync(path.join(dir, "mesh.bin"));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), L = rig.mesh.layout, T = { Float32Array, Uint16Array, Uint32Array, Uint8Array };
const mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new T[L[k].elementType](ab, L[k].byteOffset, L[k].elementCount);
const spec = buildBodySpec(rig, mesh, { calib: "V1.1" }), J = await loadJolt(PC + "/vendor/jolt-physics.wasm-compat.js");
const ref = Object.fromEntries(JSON.parse(fs.readFileSync(PC + "/results/v1_1/gatec3_V1.1.json", "utf8")).results.map(r => [r.test, r.hash]));
const tests = process.argv[3].split(",");
for (const t of tests) { const row = [];
  for (const m of MAXS) { let stp = null; const { CorrectiveStepper } = await import(PC + "/pc_step.js");
    const r = C3.runC3(J, spec, t, { step: { maxSteps: m }, _hook: null }); const ev = (r.events || []).filter(e => /step|NO STEP|recovered|FAILED/.test(e.kind)).map(e => `${e.t != null ? e.t.toFixed(2) : "-"} ${e.kind}`).join(" · ");
    row.push(`max ${m}: ${r.outcome}${m === 1 ? (r.hash === ref[t] ? " (= C3 hash)" : " (≠ C3 HASH!)") : ""} | ${ev}`); }
  console.log(`${t}\n   ${row.join("\n   ")}`); }
