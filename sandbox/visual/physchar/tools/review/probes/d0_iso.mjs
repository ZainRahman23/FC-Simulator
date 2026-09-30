// D0 isolation check: in the shared world, is each character's trajectory BIT-IDENTICAL to the single-character run? (0.95 s, before any push)
import fs from "fs"; import path from "path";
const PC = process.argv[2], ROOT = path.resolve(PC, "../../..");
const { buildBodySpec } = await import(PC + "/pc_body.js"); const { loadJolt } = await import(PC + "/pc_jolt.js"); const C3 = await import(PC + "/pc_gatec3.js"); const D = await import(PC + "/pc_gated.js");
const dir = path.join(ROOT, "assets/characters/outfield/gabriel"), rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8")), buf = fs.readFileSync(path.join(dir, "mesh.bin"));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), L = rig.mesh.layout, T = { Float32Array, Uint16Array, Uint32Array, Uint8Array };
const mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new T[L[k].elementType](ab, L[k].byteOffset, L[k].elementCount);
const spec = buildBodySpec(rig, mesh, { calib: "V1.1" }), J = await loadJolt(PC + "/vendor/jolt-physics.wasm-compat.js");
const single = C3.runC3(J, spec, "A_inplace_F50", { seconds: 0.95 }), duo = D.runD(J, spec, "D0_apart", { seconds: 0.95 });
const singleB = C3.runC3(J, D.shiftSpec(spec, D.TESTS_D.D0_apart.B), "A_inplace_F50", { seconds: 0.95 });
console.log(`single A ${single.hash} · duo A ${duo.hashA} → ${single.hash === duo.hashA ? "IDENTICAL" : "DIFFERENT"}`);
console.log(`single B (shifted spec) ${singleB.hash} · duo B ${duo.hashB} → ${singleB.hash === duo.hashB ? "IDENTICAL" : "DIFFERENT"}`);
const a = single.recs[single.recs.length - 1], b = duo.recs[duo.recs.length - 1];
console.log("final COM single", a.com.map(v => v.toFixed(6)).join(","), " duo A", b.A.com.map(v => v.toFixed(6)).join(","));
