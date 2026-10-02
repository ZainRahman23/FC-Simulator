import fs from "fs"; import path from "path";
const PC = process.argv[2], ROOT = path.resolve(PC, "../../..");
const { buildBodySpec } = await import(PC + "/pc_body.js"); const { loadJolt } = await import(PC + "/pc_jolt.js"); const G = await import(PC + "/pc_gateg1a.js"); const { buildPoses } = await import(PC + "/pc_control.js"); const REF = await import(PC + "/pc_ref.js");
REF.initOfLoco(fs.readFileSync(path.join(PC, "../anim3d/of_loco.js"), "utf8"));
const dir = path.join(ROOT, "assets/characters/outfield/gabriel"), rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8")), buf = fs.readFileSync(path.join(dir, "mesh.bin"));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), L = rig.mesh.layout, T = { Float32Array, Uint16Array, Uint32Array, Uint8Array };
const mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new T[L[k].elementType](ab, L[k].byteOffset, L[k].elementCount);
const spec = buildBodySpec(rig, mesh, { calib: "V1.1" }), J = await loadJolt(PC + "/vendor/jolt-physics.wasm-compat.js"), poses = buildPoses(spec);
const G2 = await import(PC + "/pc_gateg2.js"); const { Q, V } = await import(PC + "/pc_math.js"); const f = (x, d = 1) => x == null ? "-" : (+x).toFixed(d);
const r = G2.runG2a(J, spec, process.argv[3] || "G2a_walkInPlace", { poses, keepStates: true, seconds: +(process.env.SEC || 6) });
const fi = { R: spec.bodies.findIndex(b => b.name === "foot_R"), L: spec.bodies.findIndex(b => b.name === "foot_L") }, box = spec.bodies[fi.R].shapes[0];
const low = (pos, rot) => { let m = 1e9; for (const sx of [-1, 1]) for (const sz of [-1, 1]) m = Math.min(m, pos[1] + Q.rot(rot, [box.pos[0] + sx * box.he[0], box.pos[1] - box.he[1], box.pos[2] + sz * box.he[2]])[1]); return m; };
const pit = (q) => { const z = Q.rot(q, [0, 0, 1]); return Math.atan2(z[1], Math.hypot(z[0], z[2])) * 57.3; };
let cur = null; const out = [];
for (const q of r.recs) { const e = q.exec; if (!e || e.kind !== "rhythmic" || e.stage !== "SWING" || !q.swingTgt) { if (cur) { out.push(cur); cur = null; } continue; }
  if (!cur || cur.sw !== e.sw) { if (cur) out.push(cur); cur = { sw: e.sw, t0: q.t, minA: 1e9, minT: 1e9, at: null, lag: [] }; }
  const s = q.states[fi[e.sw]], la = low(s.pos, s.rot) * 100, lt = low(q.swingTgt.pos, q.swingTgt.rot) * 100, u = e.u;
  if (u > 0.3 && u < 0.85) { if (la < cur.minA) { cur.minA = la; cur.at = `u ${f(u, 2)} tgtLow ${f(lt)} dy ${f((s.pos[1] - q.swingTgt.pos[1]) * 100)} dz ${f((s.pos[2] - q.swingTgt.pos[2]) * 100)} dPitch ${f(pit(s.rot) - pit(q.swingTgt.rot))} pitch ${f(pit(s.rot))}`; } cur.minT = Math.min(cur.minT, lt); } }
if (cur) out.push(cur); for (const c of out) console.log(c.sw, f(c.t0, 3), "min actual clearance (cm)", f(c.minA), "min target", f(c.minT), "|", c.at);
