// EXPERIMENT: is the box-edge first-touch penetration driven by the slider's full-strength hold motors pushing into the contact?
import fs from "fs"; import path from "path";
const PC = process.argv[2], ROOT = path.resolve(PC, "../../..");
const { buildBodySpec } = await import(PC + "/pc_body.js"); const { loadJolt } = await import(PC + "/pc_jolt.js"); const D = await import(PC + "/pc_gated.js");
const dir = path.join(ROOT, "assets/characters/outfield/gabriel"), rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8")), buf = fs.readFileSync(path.join(dir, "mesh.bin"));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), L = rig.mesh.layout, T = { Float32Array, Uint16Array, Uint32Array, Uint8Array };
const mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new T[L[k].elementType](ab, L[k].byteOffset, L[k].elementCount);
const spec = buildBodySpec(rig, mesh, { calib: "V1.1" }), J = await loadJolt(PC + "/vendor/jolt-physics.wasm-compat.js");
for (const gap of [0.85, 0.75]) for (const st of [null, 0.5, 0.25]) { const orig = D.TESTS_D.D6_slide.A.init.leadGap; D.TESTS_D.D6_slide.A.init.leadGap = gap;
  const r = D.runD(J, spec, "D6_slide", { keepStates: true, ctrlExtraA: st ? { strength: st } : undefined }); D.TESTS_D.D6_slide.A.init.leadGap = orig;
  const inv = r.contact.invariant, pk = inv ? Math.max(...inv.series.filter(q => q.step >= inv.touchStep - 1 && q.step <= inv.touchStep + 4 && q.gapMm != null).map(q => -q.gapMm)) : null;
  console.log(`gap ${gap} slider strength ${st ?? "candidate (1)"}`.padEnd(40) + `first-touch window max ${pk != null ? pk.toFixed(2) : "-"} mm · run max ${r.contact.maxDepthMm} mm · slider joint sep ${r.A.maxJointSepMm} mm · slide ${r.A.slide.travelM} m · B ${r.Bres.fell ? "FELL" : "UP"}`); }
