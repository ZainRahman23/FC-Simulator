import fs from "fs"; import path from "path";
const PC = process.argv[2], ROOT = path.resolve(PC, "../../..");
const { buildBodySpec } = await import(PC + "/pc_body.js"); const { loadJolt } = await import(PC + "/pc_jolt.js"); const G = await import(PC + "/pc_gateg1a.js"); const { buildPoses, fk, relOf } = await import(PC + "/pc_control.js"); const REF = await import(PC + "/pc_ref.js"); const { V, Q } = await import(PC + "/pc_math.js");
REF.initOfLoco(fs.readFileSync(path.join(PC, "../anim3d/of_loco.js"), "utf8"));
const dir = path.join(ROOT, "assets/characters/outfield/gabriel"), rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8")), buf = fs.readFileSync(path.join(dir, "mesh.bin"));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), L = rig.mesh.layout, T = { Float32Array, Uint16Array, Uint32Array, Uint8Array };
const mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new T[L[k].elementType](ab, L[k].byteOffset, L[k].elementCount);
const spec = buildBodySpec(rig, mesh, { calib: "V1.1" }), J = await loadJolt(PC + "/vendor/jolt-physics.wasm-compat.js"), poses = buildPoses(spec);
const r = G.runG1a(J, spec, "S4_steps10", { poses, keepStates: true, loco: { delayFb: 0, delayPlan: 0 } }); const f = (x, d = 3) => (+x).toFixed(d);
const fR = spec.bodies.findIndex(b => b.name === "foot_R"), th = spec.bodies.findIndex(b => b.name === "thigh_R");
// fk of the TARGET joint angles for the R leg chain from the ACTUAL pelvis: pelvis → thigh (hip target) → shin (knee target) → foot (ankle target)
const jn = (n) => spec.joints.findIndex(j => j.name === n), kH = jn("hip_R"), kK = jn("knee_R"), kA = jn("ankle_R"), B = spec.bodies;
for (const q of r.recs) { if (q.t < 1.05 || q.t > 1.42 || q.n % 6) continue; const S = q.states, Tg = q.tgt.T, P = S[0];
  const thigh = { pos: V.add(P.pos, Q.rot(P.rot, V.sub(B[th].origin, B[0].origin))), rot: Q.mul(P.rot, relOf(spec.joints[kH], Tg[kH])) };
  const shinI = spec.joints[kK].childIndex, shin = { pos: V.add(thigh.pos, Q.rot(thigh.rot, V.sub(B[shinI].origin, B[th].origin))), rot: Q.mul(thigh.rot, relOf(spec.joints[kK], Tg[kK])) };
  const foot = { pos: V.add(shin.pos, Q.rot(shin.rot, V.sub(B[fR].origin, B[shinI].origin))) };
  // same chain with the ACTUAL joint rotations (to check the chain arithmetic)
  const a = S[fR].pos, tg = q.swingTgt ? q.swingTgt.pos : null;
  console.log(`${f(q.t)} target ${tg ? tg.map(v => f(v)).join(",") : "-"} | fk(targets) ${foot.pos.map(v => f(v)).join(",")} | actual ${a.map(v => f(v)).join(",")} | hip actual→target gap ${f(V.dist(S[th].pos, thigh.pos))}`); }
