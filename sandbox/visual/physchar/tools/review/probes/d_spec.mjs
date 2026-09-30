// EXPERIMENT: the substrate spike's speculative-contact remedy on the rotation-induced first-touch penetration (not the gate config)
import fs from "fs"; import path from "path";
const PC = process.argv[2], ROOT = path.resolve(PC, "../../..");
const { buildBodySpec } = await import(PC + "/pc_body.js"); const { loadJolt } = await import(PC + "/pc_jolt.js"); const D = await import(PC + "/pc_gated.js");
const dir = path.join(ROOT, "assets/characters/outfield/gabriel"), rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8")), buf = fs.readFileSync(path.join(dir, "mesh.bin"));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), L = rig.mesh.layout, T = { Float32Array, Uint16Array, Uint32Array, Uint8Array };
const mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new T[L[k].elementType](ab, L[k].byteOffset, L[k].elementCount);
const spec = buildBodySpec(rig, mesh, { calib: "V1.1" }), J = await loadJolt(PC + "/vendor/jolt-physics.wasm-compat.js");
for (const [key, gap] of [["D6_slide", 0.85], ["D6_slide", 0.75], ["D2_shoved_into", null], ["D5_shoulder_hard", null]]) for (const w of [null, { speculative: 0.10 }, { speculative: 0.25 }]) {
  const orig = D.TESTS_D.D6_slide.A.init.leadGap; if (gap) D.TESTS_D.D6_slide.A.init.leadGap = gap;
  const r = D.runD(J, spec, key, { keepStates: true, world: w || undefined }); D.TESTS_D.D6_slide.A.init.leadGap = orig;
  const inv = r.contact.invariant, pk = inv ? Math.max(...inv.series.filter(q => q.step >= inv.touchStep - 1 && q.step <= inv.touchStep + 4 && q.gapMm != null).map(q => -q.gapMm)) : null;
  console.log(`${key.padEnd(17)} ${gap ?? ""}`.padEnd(24) + `speculative ${w ? w.speculative : "0.02 (gate)"}`.padEnd(26) + `first-touch window max ${pk != null ? pk.toFixed(2) : "-"} mm · run max ${r.contact.maxDepthMm} mm · cpu ${r.cpu.msPerFrame} ms · A ${r.A.slide ? "slide" : r.A.fell ? "FELL" : "UP"} B ${r.Bres.fell ? "FELL" : "UP"}`); }
