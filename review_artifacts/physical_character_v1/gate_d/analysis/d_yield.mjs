// contact-yielding tracking: D6 with and without the yield, across the slide gap variants
import fs from "fs"; import path from "path";
const PC = process.argv[2], ROOT = path.resolve(PC, "../../..");
const { buildBodySpec } = await import(PC + "/pc_body.js"); const { loadJolt } = await import(PC + "/pc_jolt.js"); const D = await import(PC + "/pc_gated.js");
const dir = path.join(ROOT, "assets/characters/outfield/gabriel"), rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8")), buf = fs.readFileSync(path.join(dir, "mesh.bin"));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), L = rig.mesh.layout, T = { Float32Array, Uint16Array, Uint32Array, Uint8Array };
const mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new T[L[k].elementType](ab, L[k].byteOffset, L[k].elementCount);
const spec = buildBodySpec(rig, mesh, { calib: "V1.1" }), J = await loadJolt(PC + "/vendor/jolt-physics.wasm-compat.js");
for (const gap of [0.65, 0.75, 0.85]) for (const noYield of [true, false]) { const orig = D.TESTS_D.D6_slide.A.init.leadGap; D.TESTS_D.D6_slide.A.init.leadGap = gap;
  const r = D.runD(J, spec, "D6_slide", { keepStates: true, noYield }); D.TESTS_D.D6_slide.A.init.leadGap = orig; const inv = r.contact.invariant;
  const first5 = inv ? Math.max(...inv.series.filter(q => q.step >= inv.touchStep && q.step <= inv.touchStep + 4 && q.gapMm != null).map(q => -q.gapMm)) : null;
  console.log(`gap ${gap} ${noYield ? "no yield " : "YIELD    "} touch-window max ${first5 != null ? first5.toFixed(2) : "-"} mm · run max ${r.contact.maxDepthMm} mm · closing ${inv ? inv.closingBefore : "-"} · slide ${r.A.slide.travelM} m, stops ${r.A.slide.stopT} s · slider joint sep ${r.A.maxJointSepMm} mm · B ${r.Bres.fell ? "FELL" : "UP"} · det-hash ${r.hash}`); }
