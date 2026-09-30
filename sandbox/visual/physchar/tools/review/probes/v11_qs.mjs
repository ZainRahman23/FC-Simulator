import fs from "fs"; import path from "path";
const PC = process.argv[2], ROOT = path.resolve(PC, "../../.."), CAL = process.argv[3], TEST = process.argv[4] || "QS20";
const { buildBodySpec } = await import(PC + "/pc_body.js"); const { loadJolt } = await import(PC + "/pc_jolt.js"); const C1 = await import(PC + "/pc_gatec1.js"); const { Q } = await import(PC + "/pc_math.js");
const { budgetLimits, BalanceController } = await import(PC + "/pc_balance.js"); const { buildPoses } = await import(PC + "/pc_control.js"); const { jointState } = await import(PC + "/pc_gatea.js");
const dir = path.join(ROOT, "assets/characters/outfield/gabriel"), rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8")), buf = fs.readFileSync(path.join(dir, "mesh.bin"));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), L = rig.mesh.layout, T = { Float32Array, Uint16Array, Uint32Array, Uint8Array };
const mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new T[L[k].elementType](ab, L[k].byteOffset, L[k].elementCount);
const spec = buildBodySpec(rig, mesh, { calib: CAL }), J = await loadJolt(PC + "/vendor/jolt-physics.wasm-compat.js"), r = C1.runC1(J, spec, TEST, { keepStates: true });
const ctrl = new BalanceController(spec, buildPoses(spec), { strength: "candidate" });
console.log(CAL, TEST, "N pose feet", JSON.stringify(buildPoses(spec).N.feet), "quiet", JSON.stringify(r.quiet));
for (const t of [2, 10]) { const q = r.recs.find(x => Math.abs(x.t - t) < 0.003); if (!q) continue; let line = `t ${t}`;
  for (const n of ["ankle_L", "ankle_R", "hip_L", "knee_L"]) { const k = spec.joints.findIndex(j => j.name === n), j = spec.joints[k], e = q.jt[k], lm = q.J[k].lam, g = ctrl.gain[k];
    if (j.type === "hinge") { line += ` | ${n} τ ${(lm * 240).toFixed(1)} eff ${q.J[k].eff.toFixed(2)}`; continue; }
    const b = budgetLimits(g.lim, e.act, e.fin), tq = lm.map(x => x * 240), js = jointState(j, q.states);
    line += ` | ${n} τ ${tq.map(x => x.toFixed(1))} lim ${tq.map((x, a) => (x >= 0 ? b.hi[a] : -b.lo[a]).toFixed(1))} eff ${q.J[k].eff.toFixed(2)} ang tw ${(js.twist * 57.3).toFixed(1)} sY ${(js.swingY * 57.3).toFixed(1)} sZ ${(js.swingZ * 57.3).toFixed(1)}`; }
  console.log(line); }
