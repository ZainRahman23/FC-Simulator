import fs from "fs"; import path from "path";
const PC = process.argv[2], ROOT = path.resolve(PC, "../../.."), EXT = process.argv[3] === "1";
const { buildBodySpec } = await import(PC + "/pc_body.js"); const { loadJolt } = await import(PC + "/pc_jolt.js"); const D = await import(PC + "/pc_gated.js");
const dir = path.join(ROOT, "assets/characters/outfield/gabriel"), rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8")), buf = fs.readFileSync(path.join(dir, "mesh.bin"));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), L = rig.mesh.layout, T = { Float32Array, Uint16Array, Uint32Array, Uint8Array };
const mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new T[L[k].elementType](ab, L[k].byteOffset, L[k].elementCount);
const spec = buildBodySpec(rig, mesh, { calib: "V1.1" }), J = await loadJolt(PC + "/vendor/jolt-physics.wasm-compat.js");
const r = D.runD(J, spec, "D4_shoved_hard", { keepStates: true, ctrlExtra: EXT ? { externalSupport: true } : undefined }); let next = 1.1;
for (const q of r.recs) { if (q.t + 1e-9 < next) continue; next += 0.2; const touch = q.inter.filter(c => c.depth > -0.0005).map(c => c.a.slice(2) + "↔" + c.b.slice(2));
  console.log(`${q.t.toFixed(2)} A ${q.A.cls.padEnd(20)} ${String(q.A.stage).padEnd(7)} ξm ${(q.A.xiMargin * 100).toFixed(0).padStart(5)} cm · COM y ${q.A.com[1].toFixed(2)} v ${Math.hypot(...q.A.vcom).toFixed(2)} · trunk ${q.A.trunk.toFixed(0)}° · feet L ${q.A.feet.L.state}/${q.A.feet.L.load.toFixed(0)} R ${q.A.feet.R.state}/${q.A.feet.R.load.toFixed(0)} · touching ${touch.join(",") || "-"}`); }
