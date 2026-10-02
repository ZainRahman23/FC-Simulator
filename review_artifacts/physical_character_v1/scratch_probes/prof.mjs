import fs from "fs"; import path from "path";
const PC = process.argv[2], ROOT = path.resolve(PC, "../../..");
const { buildBodySpec } = await import(PC + "/pc_body.js"); const { loadJolt } = await import(PC + "/pc_jolt.js"); const G = await import(PC + "/pc_gateg1a.js"); const { buildPoses } = await import(PC + "/pc_control.js"); const REF = await import(PC + "/pc_ref.js");
REF.initOfLoco(fs.readFileSync(path.join(PC, "../anim3d/of_loco.js"), "utf8"));
const dir = path.join(ROOT, "assets/characters/outfield/gabriel"), rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8")), buf = fs.readFileSync(path.join(dir, "mesh.bin"));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), L = rig.mesh.layout, T = { Float32Array, Uint16Array, Uint32Array, Uint8Array };
const mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new T[L[k].elementType](ab, L[k].byteOffset, L[k].elementCount);
const spec = buildBodySpec(rig, mesh, { calib: "V1.1" }), J = await loadJolt(PC + "/vendor/jolt-physics.wasm-compat.js"), poses = buildPoses(spec);
const LOCO = await import(PC + "/pc_loco.js"), PLAN = await import(PC + "/pc_plan.js"), BALM = await import(PC + "/pc_balance.js"), ACT = await import(PC + "/pc_act.js"), GAIT = await import(PC + "/pc_gait.js"), STEPM = await import(PC + "/pc_step.js");
const TM = {}, wrap = (proto, name, label) => { const f = proto[name]; proto[name] = function (...a) { const t0 = performance.now(); const r = f.apply(this, a); TM[label] = (TM[label] || 0) + performance.now() - t0; return r; }; };
wrap(LOCO.LocoController.prototype, "control", "control(total)"); wrap(BALM.BalanceController.prototype, "update", "balance.update"); wrap(ACT.ActuatorArbiter.prototype, "step", "arbiter.step"); wrap(LOCO.LocoController.prototype, "_swingFF", "swingFF");
wrap(GAIT.GaitState.prototype, "update", "gait.update"); wrap(PLAN.LocoPlanner.prototype, "update", "planner.update"); wrap(PLAN.ViabilityMonitor.prototype, "evaluate", "monitor.evaluate"); wrap(STEPM.CorrectiveStepper.prototype, "_choose", "tool._choose"); wrap(STEPM.CorrectiveStepper.prototype, "_plan2", "tool._plan2");
wrap(PLAN.StepExecutor.prototype, "update", "exec.update"); wrap(PLAN.StepExecutor.prototype, "_adjust", "exec._adjust");
for (const key of process.argv[3].split(",")) { for (const k in TM) delete TM[k]; const r = G.runG1a(J, spec, key, { poses }), n = r.recs.length, fr = n / 4;
  console.log(`== ${key} frames(60Hz) ${fr} · ms per 60 Hz frame:`, Object.entries(TM).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${(v / fr).toFixed(3)}`).join(" · ")); }
