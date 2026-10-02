import fs from "fs"; import path from "path";
const PC = process.argv[2], ROOT = path.resolve(PC, "../../..");
const { buildBodySpec } = await import(PC + "/pc_body.js"); const { loadJolt } = await import(PC + "/pc_jolt.js"); const { buildPoses } = await import(PC + "/pc_control.js"); const REF = await import(PC + "/pc_ref.js");
REF.initOfLoco(fs.readFileSync(path.join(PC, "../anim3d/of_loco.js"), "utf8"));
const dir = path.join(ROOT, "assets/characters/outfield/gabriel"), rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8")), buf = fs.readFileSync(path.join(dir, "mesh.bin"));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), L = rig.mesh.layout, T = { Float32Array, Uint16Array, Uint32Array, Uint8Array };
const mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new T[L[k].elementType](ab, L[k].byteOffset, L[k].elementCount);
const spec = buildBodySpec(rig, mesh, { calib: "V1.1" }), J = await loadJolt(PC + "/vendor/jolt-physics.wasm-compat.js"), poses = buildPoses(spec);
const G2 = await import(PC + "/pc_gateg2.js"); const C = await import(PC + "/pc_g2char.js");
const f = (v, d = 3) => v == null ? "-" : (+v).toFixed(d);
for (const key of process.argv.slice(3)) { let LOCO = null; const r = G2.runG2a(J, spec, key, { poses, keepStates: true, onLoco: (l) => { LOCO = l; } }); const a = C.analyseChar(spec, r, LOCO, null);
  console.log(`== ${key} outcome ${r.outcome} tFall ${f(a.tFall, 2)}`);
  for (const s of a.steps) console.log(`  k${s.k} ${s.sw} t0 ${f(s.tStart, 2)} lift ${f(s.lift, 2)} td ${f(s.td, 2)} swingT ${s.lift != null && s.td != null ? f(s.td - s.lift, 2) : "-"} up ${s.upright} fh ${s.foothold ? s.foothold.map(x => f(x)).join(",") : "-"} ds ${f(s.ds, 2)} ξlift ${s.atLift ? s.atLift.xi.map(x => f(x)).join(",") : "-"} v ${s.atLift ? s.atLift.v.slice(0, 2).map(x => f(x)).join(",") : "-"}`); }
