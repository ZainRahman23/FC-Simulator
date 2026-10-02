import fs from "fs"; import path from "path";
const PC = process.argv[2], ROOT = path.resolve(PC, "../../..");
const { buildBodySpec } = await import(PC + "/pc_body.js"); const { loadJolt } = await import(PC + "/pc_jolt.js"); const G = await import(PC + "/pc_gateg1a.js"); const { buildPoses } = await import(PC + "/pc_control.js"); const REF = await import(PC + "/pc_ref.js");
REF.initOfLoco(fs.readFileSync(path.join(PC, "../anim3d/of_loco.js"), "utf8"));
const dir = path.join(ROOT, "assets/characters/outfield/gabriel"), rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8")), buf = fs.readFileSync(path.join(dir, "mesh.bin"));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), L = rig.mesh.layout, T = { Float32Array, Uint16Array, Uint32Array, Uint8Array };
const mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new T[L[k].elementType](ab, L[k].byteOffset, L[k].elementCount);
const spec = buildBodySpec(rig, mesh, { calib: "V1.1" }), J = await loadJolt(PC + "/vendor/jolt-physics.wasm-compat.js"), poses = buildPoses(spec);
const G2 = await import(PC + "/pc_gateg2.js"); const { Q } = await import(PC + "/pc_math.js"); const f = (x, d = 3) => x == null ? "-" : (+x).toFixed(d);
// foot positions / loads / slip state over a window (both feet), with the trailing foot's horizontal velocity
const r = G2.runG2a(J, spec, process.argv[3] || "G2b_walk08", { poses, keepStates: true, seconds: +(process.env.SEC || 2.0), ...(process.env.OVER ? JSON.parse(process.env.OVER) : {}) });
const t0 = +(process.env.T0 || 1.6), t1 = +(process.env.T1 || 1.95), ev = +(process.env.EV || 6), fi = { R: spec.bodies.findIndex(b => b.name === "foot_R"), L: spec.bodies.findIndex(b => b.name === "foot_L") };
for (const q of r.recs) { if (q.t < t0 || q.t > t1 || q.n % ev) continue;
  console.log(`${f(q.t)} ${q.rhythm ? q.rhythm.stage : ""} ` + ["L", "R"].map(s => { const S = q.states[fi[s]]; return `${s} ${q.feet[s].state.slice(0, 5)} ${f(q.feet[s].load, 0)} pos ${f(S.pos[0])},${f(S.pos[2])} v ${f(S.v[0], 2)},${f(S.v[2], 2)}`; }).join(" | ") + ` | grf ${q.grf ? q.grf.map(v => f(v, 0)).join(",") : "-"}`); }
