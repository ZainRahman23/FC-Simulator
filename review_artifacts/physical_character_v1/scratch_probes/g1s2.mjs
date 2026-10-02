import fs from "fs"; import path from "path";
const PC = process.argv[2], ROOT = path.resolve(PC, "../../..");
const { buildBodySpec } = await import(PC + "/pc_body.js"); const { loadJolt } = await import(PC + "/pc_jolt.js"); const G = await import(PC + "/pc_gateg1a.js"); const { buildPoses } = await import(PC + "/pc_control.js"); const REF = await import(PC + "/pc_ref.js");
REF.initOfLoco(fs.readFileSync(path.join(PC, "../anim3d/of_loco.js"), "utf8"));
const dir = path.join(ROOT, "assets/characters/outfield/gabriel"), rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8")), buf = fs.readFileSync(path.join(dir, "mesh.bin"));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), L = rig.mesh.layout, T = { Float32Array, Uint16Array, Uint32Array, Uint8Array };
const mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new T[L[k].elementType](ab, L[k].byteOffset, L[k].elementCount);
const spec = buildBodySpec(rig, mesh, { calib: "V1.1" }), J = await loadJolt(PC + "/vendor/jolt-physics.wasm-compat.js"), poses = buildPoses(spec);
const r = G.runG1a(J, spec, "S2_transfer", { poses, keepStates: true }); const f = (x, d = 3) => x == null ? "-" : (+x).toFixed(d);
for (const q of r.recs) { if (q.n % 24 || q.t < 0.4) continue; console.log(`${f(q.t, 2)} L ${q.feet.L.state.padEnd(8)} ${f(q.feet.L.load, 0).padStart(4)} R ${q.feet.R.state.padEnd(8)} ${f(q.feet.R.load, 0).padStart(4)} | ξ ${f(q.xi[0])},${f(q.xi[2])} ξref ${q.ctl && q.ctl.xiRef ? f(q.ctl.xiRef[0]) + "," + f(q.ctl.xiRef[2]) : "-"} p* ${q.ctl && q.ctl.pStar ? f(q.ctl.pStar[0]) : "-"} | v ${f(Math.hypot(q.vcom[0], q.vcom[2]))} | footL ${q.fp.L.map(v => f(v)).join(",")} footR ${q.fp.R.map(v => f(v)).join(",")} | slip L ${q.feet.L.slipping} R ${q.feet.R.slipping} sat ${q.satN}`); }
