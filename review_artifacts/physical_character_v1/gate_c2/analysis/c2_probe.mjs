import fs from "fs"; import path from "path";
const PC = process.argv[2], ROOT = path.resolve(PC, "../../.."), KEY = process.argv[3], T0 = +process.argv[4], T1 = +process.argv[5], EVERY = +(process.argv[6] || 12);
const { buildBodySpec } = await import(PC + "/pc_body.js"); const { loadJolt } = await import(PC + "/pc_jolt.js"); const C2 = await import(PC + "/pc_gatec2.js"); const { Q } = await import(PC + "/pc_math.js");
const dir = path.join(ROOT, "assets/characters/outfield/gabriel"), rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8")), buf = fs.readFileSync(path.join(dir, "mesh.bin"));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), L = rig.mesh.layout, T = { Float32Array, Uint16Array, Uint32Array, Uint8Array };
const mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new T[L[k].elementType](ab, L[k].byteOffset, L[k].elementCount);
const spec = buildBodySpec(rig, mesh), J = await loadJolt(PC + "/vendor/jolt-physics.wasm-compat.js"), r = C2.runC2(J, spec, KEY, { keepStates: true });
const jn = (n) => spec.joints.findIndex(j => j.name === n), JJ = ["hip_L", "hip_R", "ankle_L", "ankle_R", "knee_L", "knee_R", "lumbar"].map(n => [n, jn(n)]);
const R = r.recs; for (let i = 0; i < R.length; i += EVERY) { const q = R[i]; if (q.t < T0 || q.t > T1) continue; const q2 = R[Math.min(R.length - 1, i + 6)], dxi = (q2.xi[0] - q.xi[0]) / (q2.t - q.t), w0 = Math.sqrt(9.81 / Math.max(0.5, q.com[1])); const cp = q.copSmooth || [NaN, NaN];
  console.log(`t ${q.t.toFixed(2)} ${String(q.reqStage).padEnd(9)} L ${q.feet.L.load.toFixed(0).padStart(4)} R ${q.feet.R.load.toFixed(0).padStart(4)} c ${q.com[0].toFixed(3)} ξ ${q.xi[0].toFixed(3)} p* ${q.ctl ? q.ctl.pStar[0].toFixed(3) : "-"} cop ${cp[0].toFixed(3)} dξ/dt ${dxi.toFixed(3)} ω(ξ−cop) ${(w0 * (q.xi[0] - cp[0])).toFixed(3)} trunk ${q.trunk.toFixed(1)} tT ${q.ctl && q.ctl.tauTrunk ? q.ctl.tauTrunk.map(v => v.toFixed(0)) : "-"}`); }
if (0) for (const q of []) {
  console.log(`t ${q.t.toFixed(2)} ${String(q.phase).padEnd(28)} ${String(q.reqStage).padEnd(9)} loads L ${q.feet.L.load.toFixed(0).padStart(4)} R ${q.feet.R.load.toFixed(0).padStart(4)}  COM x ${q.com[0].toFixed(3)} z ${q.com[2].toFixed(3)} ξ ${q.xi.map(v => v.toFixed(3))} ξref ${q.xiRef ? q.xiRef.map(v => v.toFixed(3)) : "-"} p* ${q.ctl ? q.ctl.pStar.map(v => v.toFixed(3)) : "-"} | ${JJ.map(([n, k]) => `${n} ${q.J[k].tq.toFixed(0)}${q.J[k].sat ? "S" : ""}`).join(" ")}`); }
console.log(JSON.stringify(r.requests.map(x => ({ status: x.status, why: x.why }))));
