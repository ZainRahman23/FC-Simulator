import fs from "fs"; import path from "path";
const PC = process.argv[2], ROOT = path.resolve(PC, "../../.."), CAL = process.argv[3], TEST = process.argv[4], CTRL = JSON.parse(process.argv[5] || "null"), TS = (process.argv[6] || "2.3,2.6,3.5").split(",").map(Number);
const { buildBodySpec } = await import(PC + "/pc_body.js"); const { loadJolt } = await import(PC + "/pc_jolt.js"); const C2 = await import(PC + "/pc_gatec2.js"); const { jointState } = await import(PC + "/pc_gatea.js"); const { Q } = await import(PC + "/pc_math.js");
const dir = path.join(ROOT, "assets/characters/outfield/gabriel"), rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8")), buf = fs.readFileSync(path.join(dir, "mesh.bin"));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), L = rig.mesh.layout, T = { Float32Array, Uint16Array, Uint32Array, Uint8Array };
const mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new T[L[k].elementType](ab, L[k].byteOffset, L[k].elementCount);
const spec = buildBodySpec(rig, mesh, { calib: CAL }), J = await loadJolt(PC + "/vendor/jolt-physics.wasm-compat.js"), r = C2.runC2(J, spec, TEST, { ctrl: CTRL, keepStates: true }), d = 57.2958;
const tw = (q) => { let x = q[3] < 0 ? q.map(v => -v) : q; const tl = Math.hypot(x[0], x[3]); return 2 * Math.atan2(x[0], x[3]) * d; };
for (const t of TS) { const q = r.recs.find(x => Math.abs(x.t - t) < 0.003); if (!q || !q.jt) continue; let s = `${CAL} t ${t} ${q.reqStage}`;
  for (const jn of ["hip_R", "knee_R", "ankle_R"]) { const k = spec.joints.findIndex(j => j.name === jn), e = q.jt[k]; if (spec.joints[k].type === "hinge") { s += ` | ${jn} nom ${(e.nom * d).toFixed(1)} act ${(e.act * d).toFixed(1)}`; continue; }
    s += ` | ${jn} twist nom ${tw(e.nom).toFixed(1)} fin ${tw(e.fin).toFixed(1)} act ${(jointState(spec.joints[k], q.states).twist * d).toFixed(1)}`; }
  const yawOf = (qq) => { const f = Q.rot(qq, [0, 0, 1]); return Math.atan2(f[0], f[2]) * d; }; const bi = (n) => spec.bodies.findIndex(b => b.name === n);
  s += ` | yaw foot ${yawOf(q.states[bi("foot_R")].rot).toFixed(1)} shin ${yawOf(q.states[bi("shin_R")].rot).toFixed(1)} thigh ${yawOf(q.states[bi("thigh_R")].rot).toFixed(1)} pelvis ${yawOf(q.states[0].rot).toFixed(1)}`; console.log(s); }
