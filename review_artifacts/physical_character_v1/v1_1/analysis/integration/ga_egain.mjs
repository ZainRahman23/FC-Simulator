import fs from "fs"; import path from "path";
const PC = process.argv[2], ROOT = path.resolve(PC, "../../.."), CAL = process.argv[3], DROP = process.argv[4], N0 = +process.argv[5], N1 = +process.argv[6];
const { buildBodySpec } = await import(PC + "/pc_body.js"); const { loadJolt } = await import(PC + "/pc_jolt.js"); const GA = await import(PC + "/pc_gatea.js"); const { V, Q } = await import(PC + "/pc_math.js");
const dir = path.join(ROOT, "assets/characters/outfield/gabriel"), rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8")), buf = fs.readFileSync(path.join(dir, "mesh.bin"));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), L = rig.mesh.layout, T = { Float32Array, Uint16Array, Uint32Array, Uint8Array };
const mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new T[L[k].elementType](ab, L[k].byteOffset, L[k].elementCount);
const spec = buildBodySpec(rig, mesh, { calib: CAL }), J = await loadJolt(PC + "/vendor/jolt-physics.wasm-compat.js");
const r = GA.runDrop(J, spec, DROP, { tsc: GA.GATE_A_TSC, world: GA.GATE_A_WORLD, keepStates: true, seconds: 1.0 }), ji = (n) => spec.joints.findIndex(j => j.name === n), nm = (i) => i < 0 ? "turf" : spec.bodies[i].name;
for (let n = N0; n <= N1; n++) { const q = r.recs[n], p = r.recs[n - 1]; const ke = (s, i) => { const b = spec.bodies[i], wl = Q.rot(Q.conj(s.rot), s.w); return 0.5 * b.mass * V.dot(s.v, s.v) + 0.5 * (b.inertia[0] * wl[0] ** 2 + b.inertia[1] * wl[1] ** 2 + b.inertia[2] * wl[2] ** 2); };
  const dke = q.states.map((s, i) => [nm(i), ke(s, i) - ke(p.states[i], i)]).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k, v]) => `${k} ${v.toFixed(2)}`).join(", ");
  const kL = q.jstates[ji("knee_L")], kR = q.jstates[ji("knee_R")], cts = (q.cts || []).filter(c => c.depth > 0.002).map(c => `${nm(c.a)}–${nm(c.b)} ${(c.depth * 1000).toFixed(1)}`).join(", ");
  console.log(`n ${n} t ${q.t.toFixed(3)} E ${q.E.toFixed(2)} (Δ ${(q.E - p.E).toFixed(2)}) KE ${q.ke.toFixed(1)} | knee L ${(kL.a * 57.3).toFixed(1)}° viol ${(kL.viol * 57.3).toFixed(1)} R ${(kR.a * 57.3).toFixed(1)}° viol ${(kR.viol * 57.3).toFixed(1)} | ΔKE top: ${dke} | contacts: ${cts}`); }
