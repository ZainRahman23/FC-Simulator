import fs from "fs"; import path from "path";
const PC = process.argv[2], ROOT = path.resolve(PC, "../../.."), KEY = process.argv[3], T0 = +process.argv[4], T1 = +process.argv[5], EVERY = +(process.argv[6] || 12), JN = (process.argv[7] || "hip_L,ankle_L").split(",");
const { buildBodySpec } = await import(PC + "/pc_body.js"); const { loadJolt } = await import(PC + "/pc_jolt.js"); const C2 = await import(PC + "/pc_gatec2.js"); const { Q } = await import(PC + "/pc_math.js");
const { budgetLimits, BalanceController } = await import(PC + "/pc_balance.js"); const { buildPoses } = await import(PC + "/pc_control.js");
const dir = path.join(ROOT, "assets/characters/outfield/gabriel"), rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8")), buf = fs.readFileSync(path.join(dir, "mesh.bin"));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), L = rig.mesh.layout, T = { Float32Array, Uint16Array, Uint32Array, Uint8Array };
const mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new T[L[k].elementType](ab, L[k].byteOffset, L[k].elementCount);
const spec = buildBodySpec(rig, mesh), J = await loadJolt(PC + "/vendor/jolt-physics.wasm-compat.js"), r = C2.runC2(J, spec, KEY, { keepStates: true });
const ctrl = new BalanceController(spec, buildPoses(spec), { strength: "candidate" });
for (let i = 0; i < r.recs.length; i += EVERY) { const q = r.recs[i]; if (q.t < T0 || q.t > T1) continue; let line = `t ${q.t.toFixed(2)} ${String(q.reqStage).padEnd(8)}`;
  for (const n of JN) { const k = spec.joints.findIndex(j => j.name === n), j = spec.joints[k], e = q.jt[k], lm = q.J[k].lam, g = ctrl.gain[k];
    if (j.type === "hinge") { line += ` | ${n} τ ${(lm * 240).toFixed(0)}`; continue; }
    const b = budgetLimits(g.lim, e.act, e.fin), tq = lm.map(x => x * 240);
    line += ` | ${n} τXYZ ${tq.map(x => x.toFixed(0).padStart(4)).join(",")} lim ${tq.map((x, a) => (x >= 0 ? b.hi[a] : -b.lo[a]).toFixed(0).padStart(3)).join(",")} w ${b.w.map(x => x.toFixed(2)).join(",")} g ${e.g.map(x => (x * 57.3).toFixed(1)).join(",")} b ${e.b.map(x => (x * 57.3).toFixed(1)).join(",")}`; }
  console.log(line); }
