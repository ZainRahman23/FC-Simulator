import fs from "fs"; import path from "path";
const PC = process.argv[2], ROOT = path.resolve(PC, "../../..");
const { buildBodySpec } = await import(PC + "/pc_body.js"); const { loadJolt } = await import(PC + "/pc_jolt.js"); const G = await import(PC + "/pc_gateg1a.js"); const { buildPoses } = await import(PC + "/pc_control.js"); const REF = await import(PC + "/pc_ref.js");
REF.initOfLoco(fs.readFileSync(path.join(PC, "../anim3d/of_loco.js"), "utf8"));
const dir = path.join(ROOT, "assets/characters/outfield/gabriel"), rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8")), buf = fs.readFileSync(path.join(dir, "mesh.bin"));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), L = rig.mesh.layout, T = { Float32Array, Uint16Array, Uint32Array, Uint8Array };
const mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new T[L[k].elementType](ab, L[k].byteOffset, L[k].elementCount);
const spec = buildBodySpec(rig, mesh, { calib: "V1.1" }), J = await loadJolt(PC + "/vendor/jolt-physics.wasm-compat.js"), poses = buildPoses(spec);
const key = process.argv[3] || "S5_F70", r = G.runG1a(J, spec, key, { poses, keepStates: true, ...(process.argv[4] ? JSON.parse(process.argv[4]) : {}) }); const f = (x, d = 3) => x == null ? "-" : (+x).toFixed(d);
for (const q of r.recs) { if (q.t < 0.99 || q.t > 1.07) continue; console.log(`${f(q.t)} ${q.mon.state.padEnd(22)} ${q.mon.verdict.padEnd(9)} beyond ${f(q.mon.beyond)} xiMargin(sensor) ${f(q.xiMargin)} ξ ${f(q.xi[0])},${f(q.xi[1])} com ${f(q.com[0])},${f(q.com[2])} hipCap ${f(q.ctl && q.ctl.hipCap)} fricR ${f(q.ctl && q.ctl.fricR)} | L ${q.feet.L.state} ${f(q.feet.L.load, 0)} R ${q.feet.R.state} ${f(q.feet.R.load, 0)} | ${q.mon.reason.slice(0, 60)}`); }
