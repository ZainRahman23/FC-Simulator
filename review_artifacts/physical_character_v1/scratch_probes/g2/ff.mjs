import fs from "fs"; import path from "path";
const PC = process.argv[2], ROOT = path.resolve(PC, "../../..");
const { buildBodySpec } = await import(PC + "/pc_body.js"); const { loadJolt } = await import(PC + "/pc_jolt.js"); const G = await import(PC + "/pc_gateg1a.js"); const { buildPoses } = await import(PC + "/pc_control.js"); const REF = await import(PC + "/pc_ref.js");
REF.initOfLoco(fs.readFileSync(path.join(PC, "../anim3d/of_loco.js"), "utf8"));
const dir = path.join(ROOT, "assets/characters/outfield/gabriel"), rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8")), buf = fs.readFileSync(path.join(dir, "mesh.bin"));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), L = rig.mesh.layout, T = { Float32Array, Uint16Array, Uint32Array, Uint8Array };
const mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new T[L[k].elementType](ab, L[k].byteOffset, L[k].elementCount);
const spec = buildBodySpec(rig, mesh, { calib: "V1.1" }), J = await loadJolt(PC + "/vendor/jolt-physics.wasm-compat.js"), poses = buildPoses(spec);
const G2 = await import(PC + "/pc_gateg2.js"); const f = (x, d = 0) => x == null ? "-" : (+x).toFixed(d);
const r = G2.runG2a(J, spec, "G2a_walkInPlace", { poses, keepStates: true, seconds: +(process.env.SEC || 4.35) }), sw = process.env.SW || "L", k = spec.joints.findIndex(j => j.name === "hip_" + sw);
const t0 = +(process.env.T0 || 4.0), t1 = +(process.env.T1 || 4.3), ev = +(process.env.EV || 3); const mag = (x) => Array.isArray(x) ? x.map(v => f(v)).join("/") : f(x);
for (const q of r.recs) { if (q.t < t0 || q.t > t1 || q.n % ev) continue; const e = q.arb.find(x => x.joint === (process.env.J || "hip_" + sw)); if (!e) continue;
  console.log((+q.t).toFixed(3), "u", q.exec ? (+q.exec.u).toFixed(2) : "-", "kp", f(Array.isArray(e.kp) ? e.kp[1] : e.kp), "env", mag(e.env.lo) + ".." + mag(e.env.hi), "pred", mag(e.pred), "real", mag(e.real), "|", e.terms.map(tm => tm.m.slice(0, 14) + ":" + mag(tm.req)).join(" ")); }
