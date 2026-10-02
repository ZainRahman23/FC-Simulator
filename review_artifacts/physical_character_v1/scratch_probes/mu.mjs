import fs from "fs"; import path from "path";
const PC = process.argv[2], ROOT = path.resolve(PC, "../../..");
const { buildBodySpec } = await import(PC + "/pc_body.js"); const { loadJolt } = await import(PC + "/pc_jolt.js"); const D = await import(PC + "/pc_gated.js"); const { buildPoses } = await import(PC + "/pc_control.js");
const dir = path.join(ROOT, "assets/characters/outfield/gabriel"), rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8")), buf = fs.readFileSync(path.join(dir, "mesh.bin"));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), L = rig.mesh.layout, T = { Float32Array, Uint16Array, Uint32Array, Uint8Array };
const mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new T[L[k].elementType](ab, L[k].byteOffset, L[k].elementCount);
const spec = buildBodySpec(rig, mesh, { calib: "V1.1" }), J = await loadJolt(PC + "/vendor/jolt-physics.wasm-compat.js"), poses = buildPoses(spec);
for (const key of process.argv.slice(3)) { let firstMu = null, lastLine = "";
  D.runD(J, spec, key, { poses, onStep: ({ t, B }) => { const c = B.ctrl, mo = c.muObs || {}, f = B.obs.feet.L;
    const line = `muObs ${JSON.stringify(Object.fromEntries(Object.entries(mo).map(([k, v]) => [k, +v.toFixed(3)])))} fricR ${c.fricR == null ? "-" : c.fricR.toFixed(3)} cls ${c.cls.state}`;
    if (line !== lastLine && t < 2) { console.log(key, t.toFixed(3), line, `| L ${f.state} load ${f.load.toFixed(0)} shear ${f.shearMag.toFixed(0)} muUsed ${f.muUsed == null ? "-" : f.muUsed.toFixed(2)}`); lastLine = line; } } }); }
