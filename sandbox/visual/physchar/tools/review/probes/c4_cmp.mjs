// C4: C1 pushes around the in-place boundary, reactive arms OFF vs ON (V1.1)
import fs from "fs"; import path from "path";
const PC = process.argv[2], ROOT = path.resolve(PC, "../../.."), LIST = process.argv[3].split(","), EXTRA = JSON.parse(process.argv[4] || "{}");
const { buildBodySpec } = await import(PC + "/pc_body.js"); const { loadJolt } = await import(PC + "/pc_jolt.js"); const C1 = await import(PC + "/pc_gatec1.js");
const dir = path.join(ROOT, "assets/characters/outfield/gabriel"), rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8")), buf = fs.readFileSync(path.join(dir, "mesh.bin"));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), L = rig.mesh.layout, T = { Float32Array, Uint16Array, Uint32Array, Uint8Array };
const mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new T[L[k].elementType](ab, L[k].byteOffset, L[k].elementCount);
const spec = buildBodySpec(rig, mesh, { calib: "V1.1" }), J = await loadJolt(PC + "/vendor/jolt-physics.wasm-compat.js");
for (const t of LIST) { const out = [];
  for (const arms of [false, true]) { const r = C1.runC1(J, spec, t, { ctrlExtra: arms ? { reactiveArms: true, ...EXTRA } : {} });
    out.push(`${arms ? "ARMS" : "no-arms"} ${r.outcome.padEnd(9)} max ${String(r.maxClass).slice(0, 15).padEnd(15)} rec ${r.recoveryS ?? "-"} ξmin ${r.whole.xiMarginMinCm} trunk ${r.whole.trunkTiltMaxDeg}° exc ${r.whole.comMaxExcursionCm}`); }
  console.log(t.padEnd(8), out.join("  |  ")); }
