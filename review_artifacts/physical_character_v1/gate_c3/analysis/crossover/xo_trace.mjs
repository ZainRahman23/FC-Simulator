import fs from "fs"; import path from "path";
const PC = process.argv[2], ROOT = path.resolve(PC, "../../.."), TEST = process.argv[3], FOOT = process.argv[4] || "art", DT = +(process.argv[5] || 0.025);
const { buildBodySpec } = await import(PC + "/pc_body.js"); const { loadJolt } = await import(PC + "/pc_jolt.js"); const C3 = await import(PC + "/pc_gatec3.js"); const { STEP } = await import(PC + "/pc_step.js");
const dir = path.join(ROOT, "assets/characters/outfield/gabriel"), rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8")), buf = fs.readFileSync(path.join(dir, "mesh.bin"));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), L = rig.mesh.layout, T = { Float32Array, Uint16Array, Uint32Array, Uint8Array };
const mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new T[L[k].elementType](ab, L[k].byteOffset, L[k].elementCount);
const spec = buildBodySpec(rig, mesh, { calib: "V1.1" }), J = await loadJolt(PC + "/vendor/jolt-physics.wasm-compat.js");
if (process.env.VMAX) STEP.vFootMax = +process.env.VMAX;
if (FOOT === "human") for (const b of spec.bodies) if (/^foot_/.test(b.name)) { const s = b.shapes[0], yb = s.pos[1] - s.he[1], hx = 0.0525, z0 = -0.06, z1 = 0.23, top = 0.0;
  b.shapes[0] = { ...s, pos: [s.pos[0], (yb + top) / 2, (z0 + z1) / 2], he: [hx, (top - yb) / 2, (z1 - z0) / 2] }; }
const r = C3.runC3(J, spec, TEST, { keepStates: true }); const nm = (i) => i < 0 ? "turf" : spec.bodies[i].name, bi = (n) => spec.bodies.findIndex(b => b.name === n);
const legs = new Set(["thigh_L", "shin_L", "foot_L", "thigh_R", "shin_R", "foot_R"]);
const need = r.recs.find(x => x.stepStage === "SWING"); let next = need ? need.t - 0.01 : 1; const sw = r.step ? (r.step.foot || r.step.sw) : "L", fI = bi("foot_" + sw), kJ = spec.joints.findIndex(j => j.name === "knee_" + sw), hJ = spec.joints.findIndex(j => j.name === "hip_" + sw);
for (const x of r.recs) { if (x.t + 1e-9 < next || x.t > (need ? need.t + 0.75 : 2)) continue; next += DT;
  const a = x.states[fI].pos, tg = x.swingTgt, cts = (x.cts || []).filter(c => c.a >= 0 && c.b >= 0 && legs.has(nm(c.a)) && legs.has(nm(c.b)) && nm(c.a).slice(-1) !== nm(c.b).slice(-1)).map(c => `${nm(c.a)}-${nm(c.b)} ${(c.depth * 1000).toFixed(0)}mm`);
  const Jh = x.J ? x.J[hJ] : null, Jk = x.J ? x.J[kJ] : null;
  console.log(`${x.t.toFixed(3)} ${String(x.stepStage).padEnd(7)} ${String(x.cls).padEnd(15)} tgt ${tg ? tg.pos.map(v => v.toFixed(3)).join(",") : "-".padEnd(17)} u ${tg ? tg.u.toFixed(2) : "-"} | ${sw} ankle ${a.map(v => v.toFixed(3)).join(",")} | hip ${Jh ? (Jh.eff * 100).toFixed(0) + "%" + (Jh.sat ? "SAT" : "") : "-"} knee ${Jk ? (Jk.eff * 100).toFixed(0) + "%" + (Jk.sat ? "SAT" : "") : "-"} | legs ${cts.join(" ") || "-"} | trunk ${x.trunk.toFixed(0)}`); }
console.log(r.outcome, JSON.stringify(r.step || {}).slice(0, 200));
