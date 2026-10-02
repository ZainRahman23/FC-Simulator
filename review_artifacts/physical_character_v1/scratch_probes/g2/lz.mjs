import fs from "fs"; import path from "path";
const PC = process.argv[2], ROOT = path.resolve(PC, "../../..");
const { buildBodySpec } = await import(PC + "/pc_body.js"); const { loadJolt } = await import(PC + "/pc_jolt.js"); const G = await import(PC + "/pc_gateg1a.js"); const { buildPoses } = await import(PC + "/pc_control.js"); const REF = await import(PC + "/pc_ref.js");
REF.initOfLoco(fs.readFileSync(path.join(PC, "../anim3d/of_loco.js"), "utf8"));
const dir = path.join(ROOT, "assets/characters/outfield/gabriel"), rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8")), buf = fs.readFileSync(path.join(dir, "mesh.bin"));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), L = rig.mesh.layout, T = { Float32Array, Uint16Array, Uint32Array, Uint8Array };
const mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new T[L[k].elementType](ab, L[k].byteOffset, L[k].elementCount);
const spec = buildBodySpec(rig, mesh, { calib: "V1.1" }), J = await loadJolt(PC + "/vendor/jolt-physics.wasm-compat.js"), poses = buildPoses(spec);
const G2 = await import(PC + "/pc_gateg2.js"); const { Q } = await import(PC + "/pc_math.js"); const f = (x, d = 2) => (+x).toFixed(d);
const r = G2.runG2a(J, spec, process.argv[3] || "G2a_walkInPlace", { poses, keepStates: true, seconds: +(process.env.SEC || 5.2), ...(process.argv[4] ? JSON.parse(process.argv[4]) : {}) });
const yaw = (q) => { const z = Q.rot(q, [0, 0, 1]); return Math.atan2(z[0], z[2]) * 57.3; }, y0 = yaw(r.recs[0].states[0].rot), ji = (n) => spec.joints.findIndex(j => j.name === n);
const t0 = +(process.env.T0 || 3.7), t1 = +(process.env.T1 || 5.0), ev = +(process.env.EV || 6);
for (const q of r.recs) { if (q.t < t0 || q.t > t1 || q.n % ev) continue; const a = G2.amBudget(spec, q.states), e = q.exec, A = (n) => G2.jointAngles(spec, q.states, ji(n));
  const ank = (s) => { const x = q.arb.find(z => z.joint === "ankle_" + s); return x ? (x.sat ? x.sat.map(b => b ? "#" : ".").join("") : "") + " tq " + (x.real ? x.real.map(v => f(v, 0)).join("/") : "") : ""; };
  console.log(`${f(q.t, 3)} ${e ? e.sw + (e.u != null ? f(e.u, 2) : "") : "DS  "} Lz all ${f(a.all)} legs ${f(a.legs)} arms ${f(a.arms)} trunk ${f(a.trunk)} pel ${f(a.pelvis)} | yaw pel ${f(yaw(q.states[0].rot) - y0, 1)} chest ${f(yaw(q.states[2].rot) - y0, 1)} | shR ${f(A("shoulder_R").y, 0)} hipR ${f(A("hip_R").y, 0)} | ankL ${ank("L")} ankR ${ank("R")}`); }
