import fs from "fs"; import path from "path";
const PC = process.argv[2], ROOT = path.resolve(PC, "../../.."), H0 = JSON.parse(process.argv[3] || "[null, 0]");
const { buildBodySpec } = await import(PC + "/pc_body.js"); const { loadJolt } = await import(PC + "/pc_jolt.js"); const C3 = await import(PC + "/pc_gatec3.js");
const dir = path.join(ROOT, "assets/characters/outfield/gabriel"), rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8")), buf = fs.readFileSync(path.join(dir, "mesh.bin"));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), L = rig.mesh.layout, T = { Float32Array, Uint16Array, Uint32Array, Uint8Array };
const mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new T[L[k].elementType](ab, L[k].byteOffset, L[k].elementCount);
const spec = buildBodySpec(rig, mesh, { calib: "V1.1" }), J = await loadJolt(PC + "/vendor/jolt-physics.wasm-compat.js"), tally = {};
const ref = Object.fromEntries(JSON.parse(fs.readFileSync(PC + "/results/v1_1/gatec3_V1.1.json", "utf8")).results.map(r => [r.test, r.hash]));
for (const t of Object.keys(C3.TESTS_C3)) { const out = [];
  for (const h0 of H0) { const r = C3.runC3(J, spec, t, h0 == null ? {} : { step: typeof h0 === "object" ? h0 : { h0 } }), s = r.step || {}, td = s.touchdown; { const kk = JSON.stringify(h0); (tally[kk] = tally[kk] || {})[r.outcome] = (tally[kk][r.outcome] || 0) + 1; }
    out.push(`${h0 == null ? "C2" : JSON.stringify(h0).replace(/[{}"]/g, "")}: ${r.outcome.padEnd(20)} ${td ? `u@td ${String(td.uAt).padEnd(4)} err ${String(td.errCm).padStart(5)}` : "".padEnd(20)} trunk ${String(r.whole.trunkMaxDeg).padStart(5)}${h0 == null ? (r.hash === ref[t] ? " =" : " ≠!") : ""}`); }
  console.log(t.padEnd(19) + out.join(" | ")); }
console.log(JSON.stringify(tally));
