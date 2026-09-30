import fs from "fs"; import path from "path";
const PC = process.argv[2], ROOT = path.resolve(PC, "../../.."), KEY = process.argv[3], TS = process.argv[4].split(",").map(Number), JN = process.argv[5] || "ankle_L";
const { buildBodySpec } = await import(PC + "/pc_body.js"); const { loadJolt } = await import(PC + "/pc_jolt.js"); const C2 = await import(PC + "/pc_gatec2.js"); const { Q, V } = await import(PC + "/pc_math.js");
const { BalanceController } = await import(PC + "/pc_balance.js"); const { buildPoses } = await import(PC + "/pc_control.js");
const dir = path.join(ROOT, "assets/characters/outfield/gabriel"), rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8")), buf = fs.readFileSync(path.join(dir, "mesh.bin"));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), L = rig.mesh.layout, T = { Float32Array, Uint16Array, Uint32Array, Uint8Array };
const mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new T[L[k].elementType](ab, L[k].byteOffset, L[k].elementCount);
const spec = buildBodySpec(rig, mesh), J = await loadJolt(PC + "/vendor/jolt-physics.wasm-compat.js"), r = C2.runC2(J, spec, KEY, { keepStates: true });
const ctrl = new BalanceController(spec, buildPoses(spec), { strength: "candidate" }), k = spec.joints.findIndex(j => j.name === JN);
console.log(JN, "kp", ctrl.gain[k].kp.toFixed(0), "kdStance", ctrl.gain[k].kdStance.toFixed(1), "lim", JSON.stringify(ctrl.gain[k].lim));
const rv = (d) => { if (d[3] < 0) d = d.map(x => -x); return [d[0], d[1], d[2]].map(x => (2 * x * 57.3).toFixed(2)).join(","); };
for (const t of TS) { const q = r.recs.find(x => Math.abs(x.t - t) < 0.003), e = q.jt[k];
  console.log(`t ${t} fin−act ${rv(Q.mul(Q.conj(e.act), e.fin))} nom−act ${rv(Q.mul(Q.conj(e.act), e.nom))} g ${e.g.map(x => (x * 57.3).toFixed(2))} b ${e.b.map(x => (x * 57.3).toFixed(2))} τ ${q.J[k].lam.map(x => (x * 240).toFixed(1))} cop ${(q.copSmooth || []).map(v => v.toFixed(3))} p* ${q.ctl.pStar.map(v => v.toFixed(3))} ankle z ${q.footPos[JN.slice(-1)][2].toFixed(3)} loadL ${q.feet.L.load.toFixed(0)} | kp ${e.kp.toFixed(0)} kd ${e.kd.toFixed(1)} vt ${e.vt ? e.vt.map(v => (v * 57.3).toFixed(1)) : "-"} °/s rel ω(cs,child) ${(() => { const j = spec.joints[k], S = q.states, wr = V.sub(S[j.childIndex].w, S[j.parentIndex].w), C = Q.fromAxes(j.X, j.Y, V.cross(j.X, j.Y)); const loc = Q.rot(Q.conj(Q.mul(S[j.childIndex].rot, C)), wr); return loc.map(v => (v * 57.3).toFixed(1)).join(","); })()} °/s`); }
