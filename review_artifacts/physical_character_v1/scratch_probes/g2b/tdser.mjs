import fs from "fs"; import path from "path";
const PC = process.argv[2], ROOT = path.resolve(PC, "../../..");
const { buildBodySpec } = await import(PC + "/pc_body.js"); const { loadJolt } = await import(PC + "/pc_jolt.js"); const G = await import(PC + "/pc_gateg1a.js"); const { buildPoses } = await import(PC + "/pc_control.js"); const REF = await import(PC + "/pc_ref.js");
REF.initOfLoco(fs.readFileSync(path.join(PC, "../anim3d/of_loco.js"), "utf8"));
const dir = path.join(ROOT, "assets/characters/outfield/gabriel"), rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8")), buf = fs.readFileSync(path.join(dir, "mesh.bin"));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), L = rig.mesh.layout, T = { Float32Array, Uint16Array, Uint32Array, Uint8Array };
const mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new T[L[k].elementType](ab, L[k].byteOffset, L[k].elementCount);
const spec = buildBodySpec(rig, mesh, { calib: "V1.1" }), J = await loadJolt(PC + "/vendor/jolt-physics.wasm-compat.js"), poses = buildPoses(spec);
const G2 = await import(PC + "/pc_gateg2.js"); const { Q, V } = await import(PC + "/pc_math.js"); const f = (x, d = 3) => x == null ? "-" : (+x).toFixed(d);
// touchdown time series for the chart: landing-foot lowest sole point height, forward velocity, landing-foot vertical force, aligned at each
// rhythmic touchdown (−0.15 … +0.15 s); JSON to stdout
let LOCO = null; const r = G2.runG2a(J, spec, process.argv[3], { poses, keepStates: true, seconds: 3.4, onLoco: (l) => { LOCO = l; } });
const fi = { R: spec.bodies.findIndex(b => b.name === "foot_R"), L: spec.bodies.findIndex(b => b.name === "foot_L") }, box = spec.bodies[fi.R].shapes[0], h0 = LOCO.planner.rhythm.wk.h0, hd = [Math.sin(h0), 0, Math.cos(h0)];
const low = (S) => { let m = 1e9; for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const p = V.add(S.pos, Q.rot(S.rot, [box.pos[0] + sx * box.he[0], box.pos[1] - box.he[1], box.pos[2] + sz * box.he[2]])); m = Math.min(m, p[1]); } return m; };
const out = []; for (const R of LOCO.planner.exec.done) { if (!R.td || R.kind !== "rhythmic") continue; const t0 = R.td.t, s = [];
  for (const q of r.recs) { if (q.t < t0 - 0.15 || q.t > t0 + 0.15) continue; const S = q.states[fi[R.sw]]; s.push([q.t - t0, low(S) * 100, S.v[0] * hd[0] + S.v[2] * hd[2], q.feet[R.sw].load]); } out.push({ sw: R.sw, t0, s }); }
console.log(JSON.stringify(out));
