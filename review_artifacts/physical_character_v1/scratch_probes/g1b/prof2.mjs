import fs from "fs"; import path from "path";
const PC = process.argv[2], ROOT = path.resolve(PC, "../../..");
const { buildBodySpec } = await import(PC + "/pc_body.js"); const { loadJolt } = await import(PC + "/pc_jolt.js"); const G = await import(PC + "/pc_gateg1a.js"); const { buildPoses } = await import(PC + "/pc_control.js"); const REF = await import(PC + "/pc_ref.js");
REF.initOfLoco(fs.readFileSync(path.join(PC, "../anim3d/of_loco.js"), "utf8"));
const dir = path.join(ROOT, "assets/characters/outfield/gabriel"), rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8")), buf = fs.readFileSync(path.join(dir, "mesh.bin"));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), L = rig.mesh.layout, T = { Float32Array, Uint16Array, Uint32Array, Uint8Array };
const mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new T[L[k].elementType](ab, L[k].byteOffset, L[k].elementCount);
const spec = buildBodySpec(rig, mesh, { calib: "V1.1" }), J = await loadJolt(PC + "/vendor/jolt-physics.wasm-compat.js"), poses = buildPoses(spec);
// categorised per-control-step timing → per-60 Hz-frame distributions (p50 / p95 / max)
const LOCO = await import(PC + "/pc_loco.js"), PLAN = await import(PC + "/pc_plan.js"), BALM = await import(PC + "/pc_balance.js"), ACT = await import(PC + "/pc_act.js"), GAIT = await import(PC + "/pc_gait.js"), SENSE = await import(PC + "/pc_sense.js"), JOLTM = await import(PC + "/pc_jolt.js"), STEPM = await import(PC + "/pc_step.js");
const acc = {}, now = () => performance.now(); let stack = [];
const wrap = (proto, name, label) => { const f = proto[name]; proto[name] = function (...a) { const t0 = now(); stack.push(0); const r = f.apply(this, a); const inner = stack.pop(), dt = now() - t0; acc[label] = (acc[label] || 0) + dt - inner; if (stack.length) stack[stack.length - 1] += dt; return r; }; };
// self-time accounting (nested calls subtract from their parent)
wrap(LOCO.LocoController.prototype, "control", "loco.control(self: views, style, wiring)"); wrap(LOCO.LocoController.prototype, "_swingFF", "task: swing inverse-dynamics FF");
wrap(BALM.BalanceController.prototype, "update", "task: balance controller (C1 law, IK, Jᵀ, hip)"); wrap(ACT.ActuatorArbiter.prototype, "step", "arbiter.step"); wrap(ACT.ActuatorArbiter.prototype, "realize", "diag: arbiter.realize (ledger)");
wrap(GAIT.GaitState.prototype, "update", "gait/support state"); wrap(PLAN.LocoPlanner.prototype, "update", "planning: planner (rhythm/transfer/wiring)"); wrap(PLAN.ViabilityMonitor.prototype, "evaluate", "planning: viability monitor");
wrap(PLAN.StepExecutor.prototype, "update", "planning: step executor"); wrap(STEPM.CorrectiveStepper.prototype, "_choose", "planning: capture search (_choose)"); wrap(STEPM.CorrectiveStepper.prototype, "_plan2", "planning: 2-step plan");
wrap(SENSE.Sensor.prototype, "update", "sensing (pc_sense)");
const WP = JOLTM.JoltCharacterWorld.prototype; wrap(WP, "step", "physics: Jolt step"); wrap(WP, "read", "jolt I/O: read body states"); wrap(WP, "setJointTarget", "jolt I/O: motor targets"); wrap(WP, "updateMotor", "jolt I/O: motor gains/limits");
wrap(WP, "jointLambdaPosition", "jolt I/O: ankle λ (sensing)"); wrap(WP, "motorLambda", "diag: motor λ read (ledger)"); if (WP.plateMomentum) wrap(WP, "plateMomentum", "diag: force-plate read");
wrap(WP, "sixdofRot", "jolt I/O: joint coordinate reads"); wrap(WP, "hingeAngle", "jolt I/O: joint coordinate reads");
const pct = (a, p) => { const s = a.slice().sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * (s.length - 1) + 0.5))]; }, res = {};
for (const key of process.argv[3].split(",")) { const frames = {}; let cur = {}, k = 0, tl0 = now(); const loopT = [];
  // per-control-step snapshot via the loco control hook: sample the accumulators every 4 control steps
  const orig = LOCO.LocoController.prototype.control; let steps = 0;
  const snap = () => { for (const [c, v] of Object.entries(acc)) { (frames[c] = frames[c] || []).push(v - (cur[c] || 0)); } cur = { ...acc }; };
  for (const c in acc) acc[c] = 0; cur = {};
  const Rm = LOCO.LocoController.prototype.control; LOCO.LocoController.prototype.control = function (...a) { if (steps % 4 === 0 && steps) { const t = now(); loopT.push(t - tl0); tl0 = t; snap(); } steps++; return Rm.apply(this, a); };
  const t0 = now(); const r = G.runG1a(J, spec, key, { poses, ...(process.argv[4] ? JSON.parse(process.argv[4]) : {}) }); const tot = now() - t0; LOCO.LocoController.prototype.control = Rm;
  const known = Object.keys(frames); const nF = loopT.length; const other = loopT.map((t, i) => t - known.reduce((a, c) => a + (frames[c][i] || 0), 0));
  frames["diag: runner recording / ledger / hashing (rest of loop)"] = other;
  const isDiag = (c) => c.startsWith("diag") || c.startsWith("physics"), prodF = loopT.map((_, i) => known.filter(c => !isDiag(c)).reduce((a, c) => a + (frames[c][i] || 0), 0)), diagF = loopT.map((_, i) => Object.keys(frames).filter(c => c.startsWith("diag")).reduce((a, c) => a + (frames[c][i] || 0), 0)), physF = frames["physics: Jolt step"] || [];
  const st = (a) => ({ p50: +pct(a, 0.5).toFixed(4), p95: +pct(a, 0.95).toFixed(4), max: +Math.max(...a).toFixed(4), mean: +(a.reduce((x, y) => x + y, 0) / a.length).toFixed(4) });
  res[key] = Object.fromEntries(Object.entries(frames).map(([c, a]) => [c, { p50: +pct(a, 0.5).toFixed(4), p95: +pct(a, 0.95).toFixed(4), max: +Math.max(...a).toFixed(4), mean: +(a.reduce((x, y) => x + y, 0) / a.length).toFixed(4) }]));
  res[key]._prodController = st(prodF); res[key]._diag = st(diagF); res[key]._physics = st(physF); res[key]._frames = nF; res[key]._totalMsPerFrame = { p50: +pct(loopT, 0.5).toFixed(4), p95: +pct(loopT, 0.95).toFixed(4), max: +Math.max(...loopT).toFixed(4), mean: +(loopT.reduce((x, y) => x + y, 0) / nF).toFixed(4) };
  console.log(`## ${key} production controller p50 ${res[key]._prodController.p50} p95 ${res[key]._prodController.p95} max ${res[key]._prodController.max} · physics p50 ${res[key]._physics.p50} p95 ${res[key]._physics.p95} · diag p50 ${res[key]._diag.p50} p95 ${res[key]._diag.p95}`);
  console.log(`== ${key} (${nF} frames, run ${tot.toFixed(0)} ms) total per 60 Hz frame p50 ${res[key]._totalMsPerFrame.p50} p95 ${res[key]._totalMsPerFrame.p95} max ${res[key]._totalMsPerFrame.max}`);
  for (const [c, v] of Object.entries(res[key]).filter(([c]) => !c.startsWith("_")).sort((a, b) => b[1].mean - a[1].mean)) console.log(`   ${c.padEnd(58)} mean ${v.mean.toFixed(3)}  p50 ${v.p50.toFixed(3)}  p95 ${v.p95.toFixed(3)}  max ${v.max.toFixed(3)}`); }
fs.writeFileSync(process.argv[5] || "/dev/null", JSON.stringify(res));
