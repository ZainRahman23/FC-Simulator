import fs from "fs"; import path from "path";
const PC = process.argv[2], ROOT = path.resolve(PC, "../../..");
const { buildBodySpec } = await import(PC + "/pc_body.js"); const { loadJolt } = await import(PC + "/pc_jolt.js"); const G = await import(PC + "/pc_gateg1a.js"); const { buildPoses } = await import(PC + "/pc_control.js"); const REF = await import(PC + "/pc_ref.js");
REF.initOfLoco(fs.readFileSync(path.join(PC, "../anim3d/of_loco.js"), "utf8"));
const dir = path.join(ROOT, "assets/characters/outfield/gabriel"), rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8")), buf = fs.readFileSync(path.join(dir, "mesh.bin"));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), L = rig.mesh.layout, T = { Float32Array, Uint16Array, Uint32Array, Uint8Array };
const mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new T[L[k].elementType](ab, L[k].byteOffset, L[k].elementCount);
const spec = buildBodySpec(rig, mesh, { calib: "V1.1" }), J = await loadJolt(PC + "/vendor/jolt-physics.wasm-compat.js"), poses = buildPoses(spec);
const G2 = await import(PC + "/pc_gateg2.js"); const { Q } = await import(PC + "/pc_math.js"); const f = (x, d = 3) => x == null ? "-" : (+x).toFixed(d);
const r = G2.runG2a(J, spec, process.argv[3] || "G2a_walkInPlace", { poses, keepStates: true, seconds: +(process.env.SEC || 2.5) });
const fi = { R: spec.bodies.findIndex(b => b.name === "foot_R"), L: spec.bodies.findIndex(b => b.name === "foot_L") }, pit = (q) => { const z = Q.rot(q, [0, 0, 1]); return Math.atan2(z[1], Math.hypot(z[0], z[2])) * 57.3; };
const t0 = +(process.env.T0 || 1.9), t1 = +(process.env.T1 || 2.5), ev = +(process.env.EV || 6);
for (const q of r.recs) { if (q.t < t0 || q.t > t1 || q.n % ev) continue; const e = q.exec;
  console.log(`${f(q.t)} ${e ? e.kind[0] + e.sw + " " + e.stage.slice(0, 6) : "-       "} ${q.rhythm ? q.rhythm.stage : ""} pel ${f(q.states[0].pos[1])} com ${q.com.map(v => f(v)).join(",")} xi ${q.xi.map(v => f(v)).join(",")} | ` + ["L", "R"].map(s => `${s} ${q.feet[s].state.slice(0, 5)} ${f(q.feet[s].load, 0)} y ${f(q.states[fi[s]].pos[1])} p ${f(pit(q.states[fi[s]].rot), 1)}`).join(" | ") + ` | ${q.mon.state}`); }
