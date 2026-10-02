import fs from "fs"; import path from "path";
const PC = process.argv[2], ROOT = path.resolve(PC, "../../..");
const { buildBodySpec } = await import(PC + "/pc_body.js"); const { loadJolt } = await import(PC + "/pc_jolt.js"); const G = await import(PC + "/pc_gateg1a.js"); const { buildPoses } = await import(PC + "/pc_control.js"); const REF = await import(PC + "/pc_ref.js");
REF.initOfLoco(fs.readFileSync(path.join(PC, "../anim3d/of_loco.js"), "utf8"));
const dir = path.join(ROOT, "assets/characters/outfield/gabriel"), rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8")), buf = fs.readFileSync(path.join(dir, "mesh.bin"));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), L = rig.mesh.layout, T = { Float32Array, Uint16Array, Uint32Array, Uint8Array };
const mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new T[L[k].elementType](ab, L[k].byteOffset, L[k].elementCount);
const spec = buildBodySpec(rig, mesh, { calib: "V1.1" }), J = await loadJolt(PC + "/vendor/jolt-physics.wasm-compat.js"), poses = buildPoses(spec);
const key = process.argv[3], r = G.runG1a(J, spec, key, { poses, keepStates: true, ...(process.argv[4] ? JSON.parse(process.argv[4]) : {}) }); const f = (x, d = 3) => x == null ? "-" : (+x).toFixed(d);
const t0 = +process.env.T0, t1 = +process.env.T1; const byN = new Map(r.recs.map(q => [q.n, q]));
for (const q of r.recs) { if (q.t < t0 || q.t > t1) continue; const pl = byN.get(q.n - Math.round(q.views ? (q.t - q.views.pl) * 240 : 0)) || q;
  console.log(`${f(q.t)} ${q.mon.state.padEnd(20)} ${q.mon.verdict.padEnd(9)} beyond ${f(q.mon.beyond)} views fb ${f(q.views.fb)} pl ${f(q.views.pl)} | PLAN-VIEW ξ ${f(pl.xi[0])},${f(pl.xi[1])} L ${pl.feet.L.state} ${f(pl.feet.L.load, 0)} ld ${pl.feet.L.loaded} R ${pl.feet.R.state} ${f(pl.feet.R.load, 0)} ld ${pl.feet.R.loaded} xiMargin ${f(pl.xiMargin)} | prosp ${q.prosp ? q.prosp.length : "-"} | ${q.mon.reason.slice(0, 90)}`); }
