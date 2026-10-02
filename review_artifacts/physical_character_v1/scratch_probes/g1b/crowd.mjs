// N characters in ONE Jolt world, each running the new stack (production mode: no ledger) in-place stepping (S4 rhythm) — Jolt scaling + controller cost
import fs from "fs"; import path from "path";
const PC = process.argv[2], ROOT = path.resolve(PC, "../../..");
const { buildBodySpec } = await import(PC + "/pc_body.js"); const { loadJolt, JoltCharacterWorld } = await import(PC + "/pc_jolt.js"); const { buildPoses } = await import(PC + "/pc_control.js"); const REF = await import(PC + "/pc_ref.js");
const { shiftSpec } = await import(PC + "/pc_gated.js"); const { disabledPairs, frictionPolicy } = await import(PC + "/pc_gatea.js"); const { GATE_C1_WORLD } = await import(PC + "/pc_gatec1.js");
const { Sensor } = await import(PC + "/pc_sense.js"); const { LocoController } = await import(PC + "/pc_loco.js");
REF.initOfLoco(fs.readFileSync(path.join(PC, "../anim3d/of_loco.js"), "utf8"));
const dir = path.join(ROOT, "assets/characters/outfield/gabriel"), rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8")), buf = fs.readFileSync(path.join(dir, "mesh.bin"));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), Lm = rig.mesh.layout, T = { Float32Array, Uint16Array, Uint32Array, Uint8Array };
const mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new T[Lm[k].elementType](ab, Lm[k].byteOffset, Lm[k].elementCount);
const spec0 = buildBodySpec(rig, mesh, { calib: "V1.1" }), J = await loadJolt(PC + "/vendor/jolt-physics.wasm-compat.js");
const merge = (A, B) => { const nb = A.bodies.length; return { ...A, bodies: [...A.bodies, ...B.bodies.map(b => ({ ...b, index: b.index + nb, parentIndex: b.parentIndex >= 0 ? b.parentIndex + nb : -1 }))], joints: [...A.joints, ...B.joints.map(j => ({ ...j, parentIndex: j.parentIndex + nb, childIndex: j.childIndex + nb }))], totalMass: A.totalMass + B.totalMass }; };
const pct = (a, p) => { const s = a.slice().sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * (s.length - 1) + 0.5))]; }, now = () => performance.now();
const steps = +(process.argv[4] || 720), out = {};
for (const N of process.argv[3].split(",").map(Number)) {
  const specs = [], nb = spec0.bodies.length, nj = spec0.joints.length; for (let i = 0; i < N; i++) specs.push(shiftSpec(spec0, [(i % 6) * 2.5, 0, Math.floor(i / 6) * 2.5]));
  const world = specs.slice(1).reduce((a, s) => merge(a, s), specs[0]), w = new JoltCharacterWorld(J, world, GATE_C1_WORLD, frictionPolicy(world));
  for (let i = 0; i < N; i++) for (const [a, b] of disabledPairs(spec0)) w.disablePair(a + i * nb, b + i * nb);
  const ags = specs.map((sp, i) => { const P = buildPoses(sp), loco = new LocoController(sp, P, { rhythm: { at: 0.5, steps: Array.from({ length: 10 }, (_, k) => ({ sw: k % 2 ? "L" : "R" })) }, style: "idle", ledger: false }, 240), sensor = new Sensor(sp, { supportTouching: true, muSettle: 0.15 });
    loco.ctrl.gain.forEach((g, k) => w.setMotor(i * nj + k, { kp: g.kp, kd: g.kdStance, tau: 1 })); P.N.S.forEach((s, b) => w.setPose(i * nb + b, s.pos, s.rot));
    const aL = sp.joints.findIndex(j => j.name === "ankle_L"), aR = sp.joints.findIndex(j => j.name === "ankle_R"); return { i, sp, loco, sensor, i0: i * nb, k0: i * nj, aL, aR, obs: null }; });
  const read = (a) => { const st = []; for (let b = 0; b < nb; b++) st.push(w.read(a.i0 + b)); return st; }, view = (a, c) => { const m = (x) => x < 0 ? x : (x >= a.i0 && x < a.i0 + nb) ? x - a.i0 : -1000 - x; return { ...c, a: m(c.a), b: m(c.b) }; };
  for (const a of ags) a.obs = a.sensor.update(0, 1 / 240, read(a), [], { L: [0, 0, 0], R: [0, 0, 0] }, null);
  const fr = { ctrl: [], jolt: [], sense: [], io: [] }; let acc = { ctrl: 0, jolt: 0, sense: 0, io: 0 }, up = 0, fell = 0;
  for (let n = 1; n <= steps; n++) { let t0 = now();
    for (const a of ags) { const t = now(); const u = a.loco.control(a.obs, { dt: 1 / 240, n, qCur: (k) => a.sp.joints[k].type === "hinge" ? w.hingeAngle(a.k0 + k) : w.sixdofRot(a.k0 + k) }); const t2 = now(); acc.ctrl += t2 - t;
      for (let k = 0; k < nj; k++) { w.setJointTarget(a.k0 + k, u.final[k], u.vel[k]); w.updateMotor(a.k0 + k, { kp: u.motor[k].kp, kd: u.motor[k].kd, lo: u.limits[k].lo, hi: u.limits[k].hi }); } acc.io += now() - t2; }
    let t = now(); w.step(1 / 240, 1); acc.jolt += now() - t;
    for (const a of ags) { t = now(); const st = read(a), cts = w.contacts.map(c => view(a, c)), lam = { L: w.jointLambdaPosition(a.k0 + a.aL), R: w.jointLambdaPosition(a.k0 + a.aR) }; const t2 = now(); acc.io += t2 - t; a.obs = a.sensor.update(n, 1 / 240, st, cts, lam, null); acc.sense += now() - t2; }
    if (n % 4 === 0) { for (const k in acc) { fr[k].push(acc[k]); acc[k] = 0; } } }
  for (const a of ags) { if (a.obs.nonFootGround || a.obs.com[1] < 0.7) fell++; else up++; }
  const S = (k) => ({ p50: +pct(fr[k], 0.5).toFixed(3), p95: +pct(fr[k], 0.95).toFixed(3), max: +Math.max(...fr[k]).toFixed(2) }), tot = fr.ctrl.map((_, i) => fr.ctrl[i] + fr.jolt[i] + fr.sense[i] + fr.io[i]);
  out[N] = { jolt: S("jolt"), ctrl: S("ctrl"), sense: S("sense"), io: S("io"), total: { p50: +pct(tot, 0.5).toFixed(3), p95: +pct(tot, 0.95).toFixed(3) }, up, fell, rhythmDone: ags.filter(a => a.loco.planner.rhythm && a.loco.planner.rhythm.stage === "DONE").length };
  console.log(`N ${String(N).padStart(2)} (per 60 Hz frame, ALL characters): Jolt p50 ${out[N].jolt.p50} p95 ${out[N].jolt.p95} (per char ${(out[N].jolt.p50 / N).toFixed(3)}) · controller p50 ${out[N].ctrl.p50} p95 ${out[N].ctrl.p95} (per char ${(out[N].ctrl.p50 / N).toFixed(3)}) · sensing ${out[N].sense.p50} · Jolt I/O ${out[N].io.p50} · TOTAL p50 ${out[N].total.p50} p95 ${out[N].total.p95} ms · upright ${up}/${N}, rhythm done ${out[N].rhythmDone}`);
  w.destroy(); }
fs.writeFileSync(process.argv[5] || "/dev/null", JSON.stringify(out));
