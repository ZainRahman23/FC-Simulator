// small robustness check of the Gate D invariant: B's placement ±5 cm (D2, D3) and the slider's gap ±10 cm (D6)
import fs from "fs"; import path from "path";
const PC = process.argv[2], ROOT = path.resolve(PC, "../../..");
const { buildBodySpec } = await import(PC + "/pc_body.js"); const { loadJolt } = await import(PC + "/pc_jolt.js"); const D = await import(PC + "/pc_gated.js");
const dir = path.join(ROOT, "assets/characters/outfield/gabriel"), rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8")), buf = fs.readFileSync(path.join(dir, "mesh.bin"));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), L = rig.mesh.layout, T = { Float32Array, Uint16Array, Uint32Array, Uint8Array };
const mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new T[L[k].elementType](ab, L[k].byteOffset, L[k].elementCount);
const spec = buildBodySpec(rig, mesh, { calib: "V1.1" }), J = await loadJolt(PC + "/vendor/jolt-physics.wasm-compat.js");
const variants = [["D2_shoved_into", "B", [0, 0, 0.50]], ["D2_shoved_into", "B", [0, 0, 0.60]], ["D3_shoulder", "B", [0.80, 0, 0]], ["D3_shoulder", "B", [0.90, 0, 0]], ["D6_slide", "gap", 0.65], ["D6_slide", "gap", 0.85]];
for (const [key, what, val] of variants) { const orig = JSON.parse(JSON.stringify(D.TESTS_D[key]));
  if (what === "B") D.TESTS_D[key].B = val; else D.TESTS_D[key].A.init.leadGap = val;
  const r = D.runD(J, spec, key, { keepStates: true }), inv = r.contact.invariant; D.TESTS_D[key] = orig;
  const firstTouch = inv ? inv.series.filter(q => q.step >= inv.touchStep).map(q => q.gapMm).filter(x => x != null)[0] : null;
  console.log(`${key.padEnd(15)} ${what}=${JSON.stringify(val).padEnd(12)} contact ${r.contact.any ? r.contact.firstTouchPair : "none"} · closing ${inv ? inv.closingBefore : "-"} m/s · arrested ${inv ? (inv.arrestVsTouch >= 0 ? "+" : "") + inv.arrestVsTouch : "-"} vs touch · depth at touch ${firstTouch != null ? (-firstTouch).toFixed(2) : "-"} mm · max ${r.contact.maxDepthMm} mm · A ${r.A.slide ? "slide " + r.A.slide.travelM + " m" : r.A.fell ? "FELL" : "UP"} · B ${r.Bres.fell ? "FELL" : "UP"}`); }
