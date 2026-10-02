import fs from "fs"; import path from "path";
const PC = process.argv[2], ROOT = path.resolve(PC, "../../..");
const { buildBodySpec } = await import(PC + "/pc_body.js"); const { loadJolt } = await import(PC + "/pc_jolt.js"); const G = await import(PC + "/pc_gateg1a.js"); const { buildPoses } = await import(PC + "/pc_control.js"); const REF = await import(PC + "/pc_ref.js");
REF.initOfLoco(fs.readFileSync(path.join(PC, "../anim3d/of_loco.js"), "utf8"));
const dir = path.join(ROOT, "assets/characters/outfield/gabriel"), rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8")), buf = fs.readFileSync(path.join(dir, "mesh.bin"));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), L = rig.mesh.layout, T = { Float32Array, Uint16Array, Uint32Array, Uint8Array };
const mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new T[L[k].elementType](ab, L[k].byteOffset, L[k].elementCount);
const spec = buildBodySpec(rig, mesh, { calib: "V1.1" }), J = await loadJolt(PC + "/vendor/jolt-physics.wasm-compat.js"), poses = buildPoses(spec);
const { V, Q } = await import(PC + "/pc_math.js");
const key = process.argv[3], r = G.runG1a(J, spec, key, { poses, keepStates: true }); const f = (x, d = 3) => x == null ? "-" : (+x).toFixed(d);
const fR = spec.bodies.findIndex(b => b.name === "foot_R"), box = spec.bodies[fR].shapes[0], t0 = +process.env.T0, t1 = +process.env.T1, ev = +(process.env.EV || 2);
console.log("obstacles", JSON.stringify(r.recs[0].obstacles));
for (const q of r.recs) { if (q.t < t0 || q.t > t1 || q.n % ev) continue; const S = q.states[fR]; let yMin = 1e9, zT = -1e9;
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) { const p = V.add(S.pos, Q.rot(S.rot, [box.pos[0] + sx * box.he[0], box.pos[1] + sy * box.he[1], box.pos[2] + sz * box.he[2]])); yMin = Math.min(yMin, p[1]); zT = Math.max(zT, p[2]); }
  const cts = (q.cts || []).filter(c => c.a === fR || c.b === fR).map(c => `${c.a},${c.b}`).join(" ");
  console.log(`${f(q.t)} ${q.exec ? q.exec.stage : "-"} u ${q.exec ? f(q.exec.u, 2) : "-"} | foot ankle ${S.pos.map(v => f(v)).join(",")} sole yMin ${f(yMin)} toe z ${f(zT)} | R ${q.feet.R.state} ${f(q.feet.R.load, 0)} touch ${q.feet.R.touching} | gait ${q.gait.role.R} ${q.gait.support} | cts ${cts} | obst ${q.ledger.obst.map(v => f(v, 2)).join(",")}`); }
