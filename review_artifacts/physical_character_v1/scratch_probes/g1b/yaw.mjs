import fs from "fs"; import path from "path";
const PC = process.argv[2], ROOT = path.resolve(PC, "../../..");
const { buildBodySpec } = await import(PC + "/pc_body.js"); const { loadJolt } = await import(PC + "/pc_jolt.js"); const G = await import(PC + "/pc_gateg1a.js"); const { buildPoses } = await import(PC + "/pc_control.js"); const REF = await import(PC + "/pc_ref.js");
REF.initOfLoco(fs.readFileSync(path.join(PC, "../anim3d/of_loco.js"), "utf8"));
const dir = path.join(ROOT, "assets/characters/outfield/gabriel"), rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8")), buf = fs.readFileSync(path.join(dir, "mesh.bin"));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), L = rig.mesh.layout, T = { Float32Array, Uint16Array, Uint32Array, Uint8Array };
const mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new T[L[k].elementType](ab, L[k].byteOffset, L[k].elementCount);
const spec = buildBodySpec(rig, mesh, { calib: "V1.1" }), J = await loadJolt(PC + "/vendor/jolt-physics.wasm-compat.js"), poses = buildPoses(spec);
const { V, Q } = await import(PC + "/pc_math.js");
const r = G.runG1a(J, spec, process.argv[3] || "S4_steps10", { poses, keepStates: true, ...(process.argv[4] ? JSON.parse(process.argv[4]) : {}) }), R = r.recs, f = (x, d = 1) => (+x).toFixed(d);
const yaw = (q) => { const fz = Q.rot(q, [0, 0, 1]); return Math.atan2(fz[0], fz[2]) * 57.2958; }, bi = (n) => spec.bodies.findIndex(b => b.name === n), ji = (n) => spec.joints.findIndex(j => j.name === n);
const P = 0, fL = bi("foot_L"), fR = bi("foot_R"), tL = bi("thigh_L"), tR = bi("thigh_R"), ch = bi("chest") >= 0 ? bi("chest") : bi("thorax");
// vertical angular momentum of the swing leg (thigh+shin+foot) about the COM and of the whole body
const leg = (s) => ["thigh_" + s, "shin_" + s, "foot_" + s].map(bi);
const Lz = (S, idx, c) => idx.reduce((a, i) => { const b = spec.bodies[i], q = S[i], wl = Q.rot(Q.conj(q.rot), q.w), Iw = Q.rot(q.rot, [b.inertia[0] * wl[0], b.inertia[1] * wl[1], b.inertia[2] * wl[2]]); return a + Iw[1] + b.mass * V.cross(V.sub(q.com, c), q.v)[1]; }, 0);
for (const q of R) { if (q.t < 2.2 || q.t > 3.3 || q.n % 12) continue; const S = q.states, e = q.exec, c = q.com, all = spec.bodies.map((b, i) => i);
  const hipZ = (s) => { const E = q.arb.find(a => a.joint === "hip_" + s); return E ? `${f(E.real[0], 0)}/${f(E.env.lo[0], 0)}..${f(E.env.hi[0], 0)}` : "-"; };
  console.log(`${f(q.t, 3)} ${e ? e.sw + " " + e.stage.slice(0, 5) + " u" + f(e.u, 2) : "DS      "} | yaw pelvis ${f(yaw(S[P].rot)).padStart(6)} chest ${ch >= 0 ? f(yaw(S[ch].rot)).padStart(6) : "-"} footL ${f(yaw(S[fL].rot)).padStart(5)} footR ${f(yaw(S[fR].rot)).padStart(5)} thighL ${f(yaw(S[tL].rot)).padStart(6)} thighR ${f(yaw(S[tR].rot)).padStart(6)} | Lz body ${f(Lz(S, all, c), 2).padStart(6)} legL ${f(Lz(S, leg("L"), c), 2).padStart(6)} legR ${f(Lz(S, leg("R"), c), 2).padStart(6)} | hip twist τ real/env L ${hipZ("L")} R ${hipZ("R")} | loads L ${f(q.feet.L.load, 0)} R ${f(q.feet.R.load, 0)}`); }
