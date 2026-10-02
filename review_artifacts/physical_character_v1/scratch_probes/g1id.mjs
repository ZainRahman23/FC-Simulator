import fs from "fs"; import path from "path";
const PC = process.argv[2], ROOT = path.resolve(PC, "../../..");
const { buildBodySpec } = await import(PC + "/pc_body.js"); const { loadJolt } = await import(PC + "/pc_jolt.js"); const G = await import(PC + "/pc_gateg1a.js"); const { buildPoses } = await import(PC + "/pc_control.js"); const REF = await import(PC + "/pc_ref.js");
REF.initOfLoco(fs.readFileSync(path.join(PC, "../anim3d/of_loco.js"), "utf8"));
const dir = path.join(ROOT, "assets/characters/outfield/gabriel"), rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8")), buf = fs.readFileSync(path.join(dir, "mesh.bin"));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), L = rig.mesh.layout, T = { Float32Array, Uint16Array, Uint32Array, Uint8Array };
const mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new T[L[k].elementType](ab, L[k].byteOffset, L[k].elementCount);
const spec = buildBodySpec(rig, mesh, { calib: "V1.1" }), J = await loadJolt(PC + "/vendor/jolt-physics.wasm-compat.js"), poses = buildPoses(spec);
const { V, Q } = await import(PC + "/pc_math.js");
const extra = process.argv[3] ? JSON.parse(process.argv[3]) : {};
const r = G.runG1a(J, spec, "S4_steps10", { poses, keepStates: true, seconds: 2.2, loco: { delayFb: 0, delayPlan: 0, ...(extra.loco || {}) } }); const f = (x, d = 0) => (+x).toFixed(d);
const B = spec.bodies, bi = (n) => B.findIndex(b => b.name === n), ch = [bi("thigh_R"), bi("shin_R"), bi("foot_R")], jH = spec.joints.findIndex(j => j.name === "hip_R"), j = spec.joints[jH];
const logmap = (q) => { let x = q[3] < 0 ? q.map(v => -v) : q; const s = Math.hypot(x[0], x[1], x[2]); if (s < 1e-12) return [0, 0, 0]; const a = 2 * Math.atan2(s, x[3]); return [x[0] / s * a, x[1] / s * a, x[2] / s * a]; };
const recs = r.recs, h = recs[1].t - recs[0].t; console.log("h", h, "keys", Object.keys(recs[0].states[0]));
const com = (S, i) => V.add(S[i].pos, Q.rot(S[i].rot, B[i].com));
for (let n = 2; n < recs.length - 2; n++) { const q = recs[n]; if (q.t < 1.0 || q.t > 1.45 || q.n % 6) continue; const Sa = recs[n - 1].states, S = q.states, Sc = recs[n + 1].states;
  const hipP = V.add(S[j.childIndex].pos, Q.rot(S[j.childIndex].rot, j.pivotChild || [0, 0, 0]));
  let tau = [0, 0, 0], tg = [0, 0, 0];
  for (const i of ch) { const a = V.sc(V.add(V.sub(com(Sc, i), V.sc(com(S, i), 2)), com(Sa, i)), 1 / (h * h)), F = V.sc(V.sub(a, [0, -9.81, 0]), B[i].mass);
    const w1 = Q.rot(Sa[i].rot, logmap(Q.mul(Q.conj(Sa[i].rot), S[i].rot))).map(v => v / h), w2 = Q.rot(S[i].rot, logmap(Q.mul(Q.conj(S[i].rot), Sc[i].rot))).map(v => v / h), al = V.sc(V.sub(w2, w1), 1 / h), al_b = Q.rot(Q.conj(S[i].rot), al), Ia = Q.rot(S[i].rot, [B[i].inertia[0] * al_b[0], B[i].inertia[1] * al_b[1], B[i].inertia[2] * al_b[2]]);
    tau = V.add(tau, V.add(V.cross(V.sub(com(S, i), hipP), F), Ia)); tg = V.add(tg, V.cross(V.sub(com(S, i), hipP), V.sc([0, 9.81, 0], B[i].mass))); }
  // minus the external contact moment on the foot is ignored (swing, foot in the air) → tau = the hip's net torque on the thigh chain
  const Rc = S[j.childIndex].rot, cs = Q.rot(Q.conj(Q.fromAxes(j.X, j.Y, j.Z)), Q.rot(Q.conj(Rc), tau)), e = q.arb.find(a => a.joint === "hip_R"), ff = e.terms.find(t => t.m === "swing ID feed-forward");
  const gcs = Q.rot(Q.conj(Q.fromAxes(j.X, j.Y, j.Z)), Q.rot(Q.conj(Rc), tg)), gT = e.terms.find(t => t.m === "gravity"), bT = e.terms.find(t => t.m === "balance"), hT = e.terms.find(t => t.m === "hipStrategy"), hold = e.terms.find(t => t.kind === "hold"), damp = e.terms.find(t => t.kind === "damp"); const air = q.feet.R.state; console.log(`${f(q.t, 3)} ${air.padEnd(8)} ID(actual)+g ${cs.map(v => f(v)).join(",")} | realized ${e.real.map(v => f(v)).join(",")} | FF(plan) ${ff ? ff.req.map(v => f(v)).join(",") : "-"} | grav needed ${gcs.map(v => f(v)).join(",")} ctrl g ${gT.req.map(v => f(v)).join(",")} b ${bT.req.map(v => f(v)).join(",")} hp ${hT.req.map(v => f(v)).join(",")} hold ${hold.req.map(v => f(v)).join(",")} damp ${damp.req.map(v => f(v)).join(",")} kp ${f(e.kp)} kd ${f(e.kd,1)} |off| ${e.off}`); }
