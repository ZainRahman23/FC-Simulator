import fs from "fs"; import path from "path";
const PC = process.argv[2], ROOT = path.resolve(PC, "../../..");
const { buildBodySpec } = await import(PC + "/pc_body.js"); const { loadJolt } = await import(PC + "/pc_jolt.js"); const G = await import(PC + "/pc_gateg1a.js"); const { buildPoses } = await import(PC + "/pc_control.js"); const REF = await import(PC + "/pc_ref.js");
REF.initOfLoco(fs.readFileSync(path.join(PC, "../anim3d/of_loco.js"), "utf8"));
const dir = path.join(ROOT, "assets/characters/outfield/gabriel"), rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8")), buf = fs.readFileSync(path.join(dir, "mesh.bin"));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), L = rig.mesh.layout, T = { Float32Array, Uint16Array, Uint32Array, Uint8Array };
const mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new T[L[k].elementType](ab, L[k].byteOffset, L[k].elementCount);
const spec = buildBodySpec(rig, mesh, { calib: "V1.1" }), J = await loadJolt(PC + "/vendor/jolt-physics.wasm-compat.js"), poses = buildPoses(spec);
const G2 = await import(PC + "/pc_gateg2.js"); const { Q } = await import(PC + "/pc_math.js"); const f = (x, d = 3) => x == null ? "-" : (+x).toFixed(d);
// per-foot GRF in double support (from the contact impulses of the step): fore-aft / lateral / vertical per foot, and the yaw couple they make
// about the COM; plus the pelvis yaw rate
const r = G2.runG2a(J, spec, process.argv[3] || "G2b_walk08", { poses, keepStates: true, seconds: +(process.env.SEC || 2.5), ...(process.env.OVER ? JSON.parse(process.env.OVER) : {}) });
if (process.env.KEYS) { const q = r.recs.find(q => q.cts && q.cts.length); console.log(JSON.stringify(q.cts[0])); }
const fi = { R: spec.bodies.findIndex(b => b.name === "foot_R"), L: spec.bodies.findIndex(b => b.name === "foot_L") }, t0 = +(process.env.T0 || 1.9), t1 = +(process.env.T1 || 2.3), ev = +(process.env.EV || 6), dt = 1 / 240;
for (const q of r.recs) { if (q.t < t0 || q.t > t1 || q.n % ev) continue; const F = { L: [0, 0, 0], R: [0, 0, 0] }, P = { L: [0, 0, 0], R: [0, 0, 0] }, c = q.com;
  for (const ct of q.cts) { for (const s of ["L", "R"]) { const isA = ct.a === fi[s], isB = ct.b === fi[s]; if (!isA && !isB) continue; const imp = ct.impulse || ct.J || ct.lambda; if (!imp) continue; const sg = isA ? 1 : -1, f = V3(imp).map(x => sg * x / dt); F[s] = F[s].map((v, i) => v + f[i]); const p = ct.pos || ct.p; if (p) P[s] = P[s].map((v, i) => v + p[i] * Math.abs(f[1])); } }
  let Mz = 0; for (const s of ["L", "R"]) { const fy = Math.abs(F[s][1]) || 1e-9, p = P[s].map(v => v / fy), rr = [p[0] - c[0], p[2] - c[2]]; if (Math.abs(F[s][1]) > 1) Mz += rr[1] * F[s][0] - rr[0] * F[s][2]; }
  console.log(`${f(q.t)} ${q.rhythm ? q.rhythm.stage : ""} L F ${F.L.map(v => f(v, 0)).join(",")} | R F ${F.R.map(v => f(v, 0)).join(",")} | yaw moment ${f(Mz, 1)} N·m | pelvis yaw rate ${f(q.states[0].w[1] * 57.3, 0)} °/s`); }
function V3(x) { return Array.isArray(x) ? x : [x.x, x.y, x.z]; }
