import fs from "fs"; import path from "path";
const PC = process.argv[2], ROOT = path.resolve(PC, "../../..");
const { buildBodySpec } = await import(PC + "/pc_body.js"); const { loadJolt } = await import(PC + "/pc_jolt.js"); const G = await import(PC + "/pc_gateg1a.js"); const { buildPoses } = await import(PC + "/pc_control.js"); const REF = await import(PC + "/pc_ref.js");
REF.initOfLoco(fs.readFileSync(path.join(PC, "../anim3d/of_loco.js"), "utf8"));
const dir = path.join(ROOT, "assets/characters/outfield/gabriel"), rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8")), buf = fs.readFileSync(path.join(dir, "mesh.bin"));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), L = rig.mesh.layout, T = { Float32Array, Uint16Array, Uint32Array, Uint8Array };
const mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new T[L[k].elementType](ab, L[k].byteOffset, L[k].elementCount);
const spec = buildBodySpec(rig, mesh, { calib: "V1.1" }), J = await loadJolt(PC + "/vendor/jolt-physics.wasm-compat.js"), poses = buildPoses(spec);
const G2 = await import(PC + "/pc_gateg2.js"); const { Q } = await import(PC + "/pc_math.js"); const f = (x, d = 3) => x == null ? "-" : (+x).toFixed(d);
// LIPM check: measured net horizontal GRF vs W(c − p)/h with the MEASURED CoP; COM accel; whole-body angular momentum about the COM (x/z axes)
const r = G2.runG2a(J, spec, process.argv[3] || "G2b_walk08", { poses, keepStates: true, seconds: +(process.env.SEC || 1.7), ...(process.env.OVER ? JSON.parse(process.env.OVER) : {}) });
const t0 = +(process.env.T0 || 1.0), t1 = +(process.env.T1 || 1.65), ev = +(process.env.EV || 12), M = spec.totalMass, W = M * 9.81;
for (const q of r.recs) { if (q.t < t0 || q.t > t1 || q.n % ev) continue; const c = q.com, p = q.copSmooth, h = c[1] - 0.0, g = q.grf || [0, 0, 0];
  const pred = p ? [W * (c[0] - p[0]) / h, W * (c[2] - p[1]) / h] : null;
  let L = [0, 0, 0]; for (let i = 0; i < spec.bodies.length; i++) { const b = spec.bodies[i], s = q.states[i], rr = [s.com[0] - c[0], s.com[1] - c[1], s.com[2] - c[2]], v = s.v; L = [L[0] + b.mass * (rr[1] * v[2] - rr[2] * v[1]), L[1] + b.mass * (rr[2] * v[0] - rr[0] * v[2]), L[2] + b.mass * (rr[0] * v[1] - rr[1] * v[0])]; }
  console.log(`${f(q.t)} ${q.rhythm ? q.rhythm.stage : ""} com.x ${f(c[0])} cop.x ${p ? f(p[0]) : "-"} | GRF x meas ${f(g[0], 0)} LIPM ${pred ? f(pred[0], 0) : "-"} | z meas ${f(g[2], 0)} LIPM ${pred ? f(pred[1], 0) : "-"} | Fy ${f(g[1], 0)} | L(trans) ${L.map(v => f(v, 2)).join(",")}`); }
