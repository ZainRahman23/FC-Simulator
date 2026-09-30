// EXPERIMENT: swing-shaping options + capture-step sequences together, on the "second step needed" failures (all options default off in C3)
import fs from "fs"; import path from "path";
const PC = process.argv[2], ROOT = path.resolve(PC, "../../..");
const { buildBodySpec } = await import(PC + "/pc_body.js"); const { loadJolt } = await import(PC + "/pc_jolt.js"); const C3 = await import(PC + "/pc_gatec3.js");
const dir = path.join(ROOT, "assets/characters/outfield/gabriel"), rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8")), buf = fs.readFileSync(path.join(dir, "mesh.bin"));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), L = rig.mesh.layout, T = { Float32Array, Uint16Array, Uint32Array, Uint8Array };
const mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new T[L[k].elementType](ab, L[k].byteOffset, L[k].elementCount);
const spec = buildBodySpec(rig, mesh, { calib: "V1.1" }), J = await loadJolt(PC + "/vendor/jolt-physics.wasm-compat.js");
const V = [["C3 default", {}], ["swing opts", { h0: 0, heelUp: true }], ["swing + 2 steps", { h0: 0, heelUp: true, maxSteps: 2 }], ["swing + 3 steps + 2-step plan", { h0: 0, heelUp: true, maxSteps: 3, nStep: true }]];
const tests = ["B_B60", "C_proj_B75", "F_nofoot_B110", "D_late_F80_100ms", "D_late_F80_150ms", "F_nofoot_F160", "B_BL45", "B_BL60", "B_F90", "B_B50"], tally = {};
for (const t of tests) { const row = [];
  for (const [nm, st] of V) { const r = C3.runC3(J, spec, t, { step: st }); const ev = (r.events || []).filter(e => /step \d|next step/.test(e.kind)).length; (tally[nm] = tally[nm] || { rec: 0 }); if (/RECOVERED/.test(r.outcome)) tally[nm].rec++;
    row.push(`${nm}: ${r.outcome}${ev ? ` (${ev} extra-step events)` : ""}`); }
  console.log(t.padEnd(18) + row.join(" | ")); }
console.log(JSON.stringify(tally));
