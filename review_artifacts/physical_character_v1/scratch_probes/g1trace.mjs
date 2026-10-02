import fs from "fs"; import path from "path";
const PC = process.argv[2], ROOT = path.resolve(PC, "../../..");
const { buildBodySpec } = await import(PC + "/pc_body.js"); const { loadJolt } = await import(PC + "/pc_jolt.js"); const G = await import(PC + "/pc_gateg1a.js"); const { buildPoses } = await import(PC + "/pc_control.js"); const REF = await import(PC + "/pc_ref.js");
REF.initOfLoco(fs.readFileSync(path.join(PC, "../anim3d/of_loco.js"), "utf8"));
const dir = path.join(ROOT, "assets/characters/outfield/gabriel"), rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8")), buf = fs.readFileSync(path.join(dir, "mesh.bin"));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), L = rig.mesh.layout, T = { Float32Array, Uint16Array, Uint32Array, Uint8Array };
const mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new T[L[k].elementType](ab, L[k].byteOffset, L[k].elementCount);
const spec = buildBodySpec(rig, mesh, { calib: "V1.1" }), J = await loadJolt(PC + "/vendor/jolt-physics.wasm-compat.js"), poses = buildPoses(spec);
const key = process.argv[3], t0 = +process.argv[4], t1 = +process.argv[5], every = +(process.argv[6] || 6), extra = process.argv[7] ? JSON.parse(process.argv[7]) : {};
const r = G.runG1a(J, spec, key, { poses, ...extra }); const f = (x, d = 3) => x == null ? "-" : (+x).toFixed(d);
const fL = spec.bodies.findIndex(b => b.name === "foot_L"), fR = spec.bodies.findIndex(b => b.name === "foot_R");
for (const q of r.recs) { if (q.t < t0 || q.t > t1 || q.n % every) continue; const e = q.exec;
  console.log(`${f(q.t)} ${e ? `${e.kind[0]}${e.sw} ${e.stage.padEnd(7)} u${f(e.u, 2)}` : `rh:${q.rhythm ? q.rhythm.stage : "-"}${q.rhythm ? q.rhythm.i : ""}`.padEnd(19)} | ξx ${f(q.xi[0])} ξref ${f(q.ctl && q.ctl.xiRef ? q.ctl.xiRef[0] : null)} p* ${f(q.ctl && q.ctl.pStar ? q.ctl.pStar[0] : null)} comx ${f(q.com[0])} vx ${f(q.vcom[0])} | L ${q.feet.L.state.slice(0, 5).padEnd(5)} ${f(q.feet.L.load, 0).padStart(5)} R ${q.feet.R.state.slice(0, 5).padEnd(5)} ${f(q.feet.R.load, 0).padStart(5)} | swingY ${f(q.swingTgt ? q.swingTgt.pos[1] : null)} | ${q.mon.verdict} ${q.cls} | trunk ${f(q.trunk, 1)}`); }
