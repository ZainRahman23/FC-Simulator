import fs from "fs"; import path from "path";
const PC = process.argv[2], ROOT = path.resolve(PC, "../../..");
const { buildBodySpec } = await import(PC + "/pc_body.js"); const { loadJolt } = await import(PC + "/pc_jolt.js"); const G = await import(PC + "/pc_gateg1a.js"); const { buildPoses } = await import(PC + "/pc_control.js"); const REF = await import(PC + "/pc_ref.js");
REF.initOfLoco(fs.readFileSync(path.join(PC, "../anim3d/of_loco.js"), "utf8"));
const dir = path.join(ROOT, "assets/characters/outfield/gabriel"), rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8")), buf = fs.readFileSync(path.join(dir, "mesh.bin"));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), L = rig.mesh.layout, T = { Float32Array, Uint16Array, Uint32Array, Uint8Array };
const mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new T[L[k].elementType](ab, L[k].byteOffset, L[k].elementCount);
const spec = buildBodySpec(rig, mesh, { calib: "V1.1" }), J = await loadJolt(PC + "/vendor/jolt-physics.wasm-compat.js"), poses = buildPoses(spec);
const G2 = await import(PC + "/pc_gateg2.js"); const { Q } = await import(PC + "/pc_math.js"); const f = (x, d = 3) => x == null ? "-" : (+x).toFixed(d);
let LOCO = null; const r = G2.runG2a(J, spec, process.argv[3] || "G2b_walk08", { poses, ...(process.env.OVER ? JSON.parse(process.env.OVER) : {}), keepStates: true, seconds: +(process.env.SEC || 4), onLoco: (l) => { LOCO = l; }, ...(process.argv[4] ? JSON.parse(process.argv[4]) : {}) });
console.log((r.plannerLog || []).filter(e => e.kind === "walk").map(e => e.what).join("\n"));
const fi = { R: spec.bodies.findIndex(b => b.name === "foot_R"), L: spec.bodies.findIndex(b => b.name === "foot_L") }, pit = (q) => { const z = Q.rot(q, [0, 0, 1]); return Math.atan2(z[1], Math.hypot(z[0], z[2])) * 57.3; };
const t0 = +(process.env.T0 || 0.5), t1 = +(process.env.T1 || 4), ev = +(process.env.EV || 12);
for (const q of r.recs) { if (q.t < t0 || q.t > t1 || q.n % ev) continue; const e = q.exec;
  console.log(`${f(q.t, 2)} ${e ? e.kind[0] + e.sw + " " + e.stage.slice(0, 5) : "-      "} ${q.rhythm ? q.rhythm.stage : ""} com ${f(q.com[0], 2)},${f(q.com[2], 2)} v ${f(q.vcom[0], 2)},${f(q.vcom[2], 2)} xi ${f(q.xi[0], 2)},${f(q.xi[1], 2)} ref ${q.ctl && q.ctl.xiRef ? f(q.ctl.xiRef[0], 2) + "," + f(q.ctl.xiRef[1], 2) : "-"} p* ${q.ctl && q.ctl.pStar ? f(q.ctl.pStar[0], 2) + "," + f(q.ctl.pStar[1], 2) : "-"} cop ${q.copSmooth ? f(q.copSmooth[0], 2) + "," + f(q.copSmooth[1], 2) : "-"} | L ${q.feet.L.state.slice(0, 5)} ${f(q.feet.L.load, 0)} ${f(q.states[fi.L].pos[2], 2)} p${f(pit(q.states[fi.L].rot), 0)} | R ${q.feet.R.state.slice(0, 5)} ${f(q.feet.R.load, 0)} ${f(q.states[fi.R].pos[2], 2)} p${f(pit(q.states[fi.R].rot), 0)} | pel ${f(q.states[0].pos[1], 3)} tr ${f(q.trunk, 0)} ${q.mon.state.slice(0, 12)}`); }
