import fs from "fs"; import path from "path";
const PC = process.argv[2], ROOT = path.resolve(PC, "../../..");
const { buildBodySpec } = await import(PC + "/pc_body.js"); const { loadJolt } = await import(PC + "/pc_jolt.js"); const G = await import(PC + "/pc_gateg1a.js"); const { buildPoses } = await import(PC + "/pc_control.js"); const REF = await import(PC + "/pc_ref.js");
REF.initOfLoco(fs.readFileSync(path.join(PC, "../anim3d/of_loco.js"), "utf8"));
const dir = path.join(ROOT, "assets/characters/outfield/gabriel"), rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8")), buf = fs.readFileSync(path.join(dir, "mesh.bin"));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), L = rig.mesh.layout, T = { Float32Array, Uint16Array, Uint32Array, Uint8Array };
const mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new T[L[k].elementType](ab, L[k].byteOffset, L[k].elementCount);
const spec = buildBodySpec(rig, mesh, { calib: "V1.1" }), J = await loadJolt(PC + "/vendor/jolt-physics.wasm-compat.js"), poses = buildPoses(spec);
const G2 = await import(PC + "/pc_gateg2.js");
const { Q, V } = await import(PC + "/pc_math.js"); const C = await import(PC + "/pc_control.js"); const f = (x, d = 1) => x == null ? "-" : (+x).toFixed(d);
const r = G2.runG2a(J, spec, process.argv[3] || "G2a_walkInPlace", { poses, keepStates: true, seconds: +(process.env.SEC || 1.35), ...(process.env.OVER ? JSON.parse(process.env.OVER) : {}) }), sw = process.env.SW || "R";
const jk = (n) => spec.joints.findIndex(j => j.name === n), D = 57.2958;
const ang = (k, q) => { const j = spec.joints[k]; if (typeof q === "number") return q * D; return [2 * Math.atan2(q[1], q[3]) * D, 2 * Math.atan2(q[2], q[3]) * D, 2 * Math.atan2(q[0], q[3]) * D]; };
const act = (q, k) => { const j = spec.joints[k], P = q.states[j.parentIndex].rot, Cr = q.states[j.childIndex].rot, rel = Q.mul(Q.conj(P), Cr); if (j.type === "hinge") { const a = j.axis; const s = rel[0] * a[0] + rel[1] * a[1] + rel[2] * a[2]; return 2 * Math.atan2(s, rel[3]); } return C.csOfRel(j, rel); };
const t0 = +(process.env.T0 || 1.06), t1 = +(process.env.T1 || 1.3), ev = +(process.env.EV || 3);
for (const q of r.recs) { if (q.t < t0 || q.t > t1 || q.n % ev) continue; let line = f(q.t, 3) + " " + (q.exec ? q.exec.stage.slice(0, 5) : "-    ");
  for (const n of (process.env.JN ? process.env.JN.split(",") : ["hip_" + sw, "knee_" + sw, "ankle_" + sw])) { const k = jk(n), tg = ang(k, q.tgt.T[k]), ac = ang(k, act(q, k)), e = q.arb.find(x => x.joint === k || x.joint === n);
    line += ` | ${n} tgt ${Array.isArray(tg) ? tg.map(x => f(x)).join("/") : f(tg)} act ${Array.isArray(ac) ? ac.map(x => f(x)).join("/") : f(ac)}${e && (Array.isArray(e.sat) ? e.sat.some(Boolean) : e.sat) ? " SAT" : ""}${e && e.yielded && e.yielded.length ? " Y:" + e.yielded.map(y => y.m).join("/") : ""} ${e ? e.owner : ""}`; }
  console.log(line); }
