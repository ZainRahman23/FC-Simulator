// ═══ physchar/pc_gateg1a.js — GATE G1a: the locomotion architecture skeleton with regression parity (deterministic scenarios) ═══════════
// LOCOMOTION_ARCHITECTURE_FINAL.md §15 (approved, + the unexpected-contact authority test). One character, V1.1, the NEW stack only
// (pc_loco: gait state · planner + viability monitor · balance controller reused · actuator arbiter), on the TURF-AS-FORCE-PLATE
// (pc_jolt cfg.plateFrom: 0 — the plate's momentum change IS the turf impulse on the character). The approved C1–C3 runners are untouched.
// Loop per control step (240 Hz): truth observation → LocoController → targets / gains / envelopes → Jolt (1 or `sub` physics sub-steps:
// the S10 convergence runs halve the physics step with the control period fixed) → sensing → the external-impulse ledger → record.
import { V, Q, hashNums } from "./pc_math.js";
import { shapeLowestY } from "./pc_body.js";
import { JoltCharacterWorld } from "./pc_jolt.js";
import { disabledPairs, frictionPolicy, TIMESTEP_CONFIGS } from "./pc_gatea.js";
import { GATE_C1_TSC, GATE_C1_WORLD } from "./pc_gatec1.js";
import { buildPoses } from "./pc_control.js";
import { Sensor } from "./pc_sense.js";
import { LocoController } from "./pc_loco.js";

const DIR = { F: [0, 0, 1], B: [0, 0, -1], R: [1, 0, 0], L: [-1, 0, 0] };
const place = (foot, forward, outward, x) => Object.assign({ type: "place", foot, forward, outward }, x || {});
const alt = (n, first) => Array.from({ length: n }, (_, i) => ({ sw: (i % 2 === 0) === (first === "R") ? "R" : "L", fwd: 0, out: 0 }));
const P0 = { delayFb: 0, delayPlan: 0 };   // the PARITY configuration: the same information timing as the approved C1–C3 runs
export const TESTS_G1A = {
  S1_stance: { group: "S1–S3 parity (voluntary)", title: "S1 — quiet stance 20 s (parity with C1 QS20)", seconds: 20, loco: { ...P0 } },
  S2_transfer: { group: "S1–S3 parity (voluntary)", title: "S2 — weight transfer onto R (unload L) until the liftoff gate opens, hold, back (no lift; parity with C2 B_lift_L's transfer)", seconds: 4, loco: { ...P0, transfer: [{ foot: "L", at: 0.5 }] } },
  S2b_transfer: { group: "S1–S3 parity (voluntary)", title: "S2b — weight transfer onto L (unload R) until the liftoff gate opens, hold, back (parity with C2 B_lift_R's transfer)", seconds: 4, loco: { ...P0, transfer: [{ foot: "R", at: 0.5 }] } },
  S2x_twice: { group: "S1–S3 parity (voluntary)", title: "S2x OBSERVATION — unload L, back, then unload R from the resulting stance (the second gate does not open: the unloaded foot is not set back on its anchor)", seconds: 8, loco: { ...P0, transfer: [{ foot: "L", at: 0.5 }, { foot: "R" }] } },
  S3a_transferStep: { group: "S1–S3 parity (voluntary)", title: "S3a — ONE placement: weight transfer onto L, R stepped 20 cm forward, loaded and accepted (C2 sequencer)", seconds: 6, loco: { ...P0, requests: [place("R", 0.20, 0, { at: 0.5 })] } },
  S3_place: { group: "S1–S3 parity (voluntary)", title: "S3 — place R 20 cm forward, back to stance; the same with L (parity with C2)", seconds: 27, loco: { ...P0, requests: [place("R", 0.20, 0, { at: 0.5 }), place("R", -0.20, 0), place("L", 0.20, 0), place("L", -0.20, 0)] } },
  S4_steps10: { group: "S4 stepping", title: "S4 — 10 alternating in-place steps at a 0.6 s period (new capability)", seconds: 9, loco: { rhythm: { at: 0.5, steps: alt(10, "R") }, style: "idle" } },
  S7a_swingPush: { group: "S7 disturbance in swing", title: "S7a — S4 with a 15 N·s lateral push toward the swing side at mid-swing of step 5", seconds: 10, loco: { rhythm: { at: 0.5, steps: alt(10, "R") }, style: "idle" }, pushOn: { step: 4, u: 0.5, side: "swing", Ns: 15 } },
  S7c_swingPush30: { group: "S7 disturbance in swing", title: "S7c — S4 with a 30 N·s lateral push toward the swing side at mid-swing of step 5 (beyond the adjustment: the corrective path)", seconds: 10, loco: { rhythm: { at: 0.5, steps: alt(10, "R") }, style: "idle" }, pushOn: { step: 4, u: 0.5, side: "swing", Ns: 30 } },
  S7d_stancePush30: { group: "S7 disturbance in swing", title: "S7d — S4 with a 30 N·s lateral push toward the stance side at mid-swing of step 5", seconds: 10, loco: { rhythm: { at: 0.5, steps: alt(10, "R") }, style: "idle" }, pushOn: { step: 4, u: 0.5, side: "stance", Ns: 30 } },
  S7b_stancePush: { group: "S7 disturbance in swing", title: "S7b — S4 with a 15 N·s lateral push toward the stance side at mid-swing of step 5", seconds: 10, loco: { rhythm: { at: 0.5, steps: alt(10, "R") }, style: "idle" }, pushOn: { step: 4, u: 0.5, side: "stance", Ns: 15 } },
  S8_styleConflict: { group: "S8 actuator saturation", title: "S8 — a large STYLE request (deep crouch, P3) against the stance legs' SUPPORT (P0/P1): the arbiter keeps support, style yields", seconds: 4,
    loco: { ...P0, style: { targets: { hip_L: { y: -45 }, hip_R: { y: -45 }, knee_L: { a: 70 }, knee_R: { a: 70 }, ankle_L: { y: -25 }, ankle_R: { y: -25 } }, w: 1, at: 1.0, until: 3.0, module: "style(test: deep crouch)" } } },
  S8n_naive: { group: "S8 actuator saturation", title: "S8 DIAGNOSTIC — the same style request added WITHOUT arbitration (what the arbiter prevents)", seconds: 4,
    loco: { ...P0, naive: true, style: { targets: { hip_L: { y: -45 }, hip_R: { y: -45 }, knee_L: { a: 70 }, knee_R: { a: 70 }, ankle_L: { y: -25 }, ankle_R: { y: -25 } }, w: 1, at: 1.0, until: 3.0, module: "style(test: deep crouch)" } } },
  S9_internal: { group: "S9 internal momentum", title: "S9 — free-floating (gravity 0, body damping 0), every motor cycling through the arbiter: no net momentum may appear", seconds: 2.5, lift: 2.5, world: { gravity: 0, linDamp: 0, angDamp: 0 }, loco: { ...P0, task: "cycle" } },
  S9d_damped: { group: "S9 internal momentum", title: "S9 (info) — the same with the gate world's body damping (0.05 s⁻¹): Jolt's damping is an engine drag", seconds: 2.5, lift: 2.5, world: { gravity: 0 }, loco: { ...P0, task: "cycle" } },
  S11a_earlyTurf: { group: "S11 unexpected contact", title: "S11a — one step R 25 cm forward; a 2.5 cm raised slab (unknown to the plan) under the landing spot → EARLY touchdown on it", seconds: 4, loco: { rhythm: { at: 0.5, steps: [{ sw: "R", fwd: 0.25 }] } }, slab: { foot: "R", z0: 0.30, len: 0.30, h: 0.025, w: 0.20 } },
  S11c_toeCatch: { group: "S11 unexpected contact", title: "S11c — the same step onto a 4 cm slab: the toe strikes the slab's EDGE mid-swing (a turf contact the foot cannot stand on) → obstruction, not touchdown", seconds: 4, loco: { rhythm: { at: 0.5, steps: [{ sw: "R", fwd: 0.25 }] } }, slab: { foot: "R", z0: 0.30, len: 0.30, h: 0.04, w: 0.20 } },
  S11f_flatStep: { group: "S11 unexpected contact", title: "S11f REFERENCE — the same one step R 25 cm forward on flat turf (what S11a / S11b would have done without the unknown geometry)", seconds: 4, loco: { rhythm: { at: 0.5, steps: [{ sw: "R", fwd: 0.25 }] } } },
  S11b_obstacle: { group: "S11 unexpected contact", title: "S11b — one step R 28 cm forward; a 16 cm box (unknown to the plan) in the swing path → OBSTRUCTED", seconds: 4, loco: { rhythm: { at: 0.5, steps: [{ sw: "R", fwd: 0.28 }] } }, obstacle: { foot: "R", z0: 0.34, depth: 0.05, h: 0.16, w: 0.22 } },
};
for (const [d, Ns, tag] of [["F", 70], ["F", 80], ["F", 100], ["B", 40], ["B", 50], ["R", 40, "inplace"], ["R", 55]])
  TESTS_G1A[`S5_${d}${Ns}`] = { group: "S5 pushes (C3 parity)", title: `S5 — ${Ns} N·s ${{ F: "forward", B: "backward", R: "toward his right" }[d]} at 1.0 s (C3 ${tag === "inplace" ? "A_inplace_R40" : `B_${d}${Ns}`})`, seconds: 5, push: { at: 1.0, dur: 0.05, dir: d, Ns }, c3: tag === "inplace" ? "A_inplace_R40" : `B_${d}${Ns}`, loco: { ...P0 } };
// S9's P2 task program: every leg / arm / spine joint driven through the arbiter by a sinusoid (deterministic)
const cycleTask = (spec) => { const J = ["hip_L", "hip_R", "knee_L", "knee_R", "shoulder_L", "shoulder_R", "elbow_L", "elbow_R", "lumbar"].map(n => spec.joints.findIndex(j => j.name === n));
  return (t) => J.map((k, i) => { const j = spec.joints[k], a = 0.6 * Math.sin(2 * Math.PI * (1.3 + 0.37 * i) * t + i); return { k, module: "task(S9 cycle)", cls: "P1", off: j.type === "hinge" ? a : [0, a, 0.4 * a] }; }); };

export function runG1a(J, spec, key, opts) {
  opts = opts || {}; const TST = opts.test || TESTS_G1A[key], T = TIMESTEP_CONFIGS[GATE_C1_TSC], hz = T.hz, dt = 1 / hz, sub = opts.sub || 1, steps = Math.round((opts.seconds || TST.seconds) * hz);
  const P = opts.poses || buildPoses(spec), nb = spec.bodies.length, nj = spec.joints.length, M = spec.totalMass, g = (TST.world && TST.world.gravity != null) ? TST.world.gravity : -9.81;
  const worldCfg = Object.assign({}, GATE_C1_WORLD, opts.staticTurf ? {} : { plateFrom: 0, plateLate: true }, TST.world || {}, opts.world || {});
  const w = new JoltCharacterWorld(J, spec, worldCfg, frictionPolicy(spec)); for (const [a, b] of disabledPairs(spec)) w.disablePair(a, b);
  // unknown-to-the-plan geometry (S11): relative to the stepping foot's boot at t = 0
  const fI = (s) => spec.bodies.findIndex(b => b.name === "foot_" + s), boxOf = (s) => spec.bodies[fI(s)].shapes[0], obst = [];
  const bootAt = (s) => { const f = P.N.S[fI(s)], b = boxOf(s); return { x: f.pos[0] + b.pos[0], zToe: f.pos[2] + b.pos[2] + b.he[2], z0: f.pos[2] }; };
  if (TST.slab) { const q = TST.slab, a = bootAt(q.foot); obst.push({ kind: "slab", k: w.addObstacle({ shape: { type: "box", he: [q.w / 2, q.h / 2, q.len / 2], cr: 0.004, pos: [0, 0, 0], rot: [0, 0, 0, 1] }, pos: [a.x, q.h / 2 + 0.003, a.z0 + q.z0 + q.len / 2], mass: 50, hold: "fixed", asTurf: true }), def: q, pos: [a.x, q.h / 2 + 0.003, a.z0 + q.z0 + q.len / 2], he: [q.w / 2, q.h / 2, q.len / 2] }); }
  if (TST.obstacle) { const q = TST.obstacle, a = bootAt(q.foot); obst.push({ kind: "box", k: w.addObstacle({ shape: { type: "box", he: [q.w / 2, q.h / 2, q.depth / 2], cr: 0.004, pos: [0, 0, 0], rot: [0, 0, 0, 1] }, pos: [a.x, q.h / 2 + 0.003, a.z0 + q.z0 + q.depth / 2], mass: 20, hold: "fixed" }), def: q, pos: [a.x, q.h / 2 + 0.003, a.z0 + q.z0 + q.depth / 2], he: [q.w / 2, q.h / 2, q.depth / 2] }); }
  const locoOpts = Object.assign({}, TST.loco, opts.loco || {}); if (locoOpts.task === "cycle") locoOpts.task = cycleTask(spec);
  const loco = new LocoController(spec, P, locoOpts, hz), ctrl = loco.ctrl; if (opts.onLoco) opts.onLoco(loco);   // (probe hook: diagnostics only)
  ctrl.gain.forEach((gn, k) => w.setMotor(k, { kp: gn.kp, kd: gn.kdStance, tau: 1 }));
  const expectBodies = nb + 1 + (w.plate ? 1 : 0) + obst.length; if (w.support || w.cons.length !== nj || (w.obstacles || []).length !== obst.length || w.ps.GetNumBodies() !== expectBodies) throw new Error("G1a world is not clean");
  P.N.S.forEach((s, i) => w.setPose(i, [s.pos[0], s.pos[1] + (TST.lift || 0), s.pos[2]], s.rot));
  const fIx = { L: fI("L"), R: fI("R") };
  const sensor = new Sensor(spec, { supportTouching: true, muSettle: 0.15 }), ji = (n) => spec.joints.findIndex(j => j.name === n), aL = ji("ankle_L"), aR = ji("ankle_R");
  const read = () => { const st = []; for (let i = 0; i < nb; i++) st.push(w.read(i)); return st; }, mom = (S) => S.reduce((s, q, i) => V.add(s, V.sc(q.v, spec.bodies[i].mass)), [0, 0, 0]);
  const angMom = (S) => { let c = [0, 0, 0]; S.forEach((q, i) => { c = V.add(c, V.sc(q.com, spec.bodies[i].mass)); }); c = V.sc(c, 1 / M); let L = [0, 0, 0];
    S.forEach((q, i) => { const b = spec.bodies[i], wl = Q.rot(Q.conj(q.rot), q.w); L = V.add(L, V.add(Q.rot(q.rot, [b.inertia[0] * wl[0], b.inertia[1] * wl[1], b.inertia[2] * wl[2]]), V.sc(V.cross(V.sub(q.com, c), q.v), b.mass))); }); return L; };
  let states = read(), obs = sensor.update(0, dt, states, [], { L: [0, 0, 0], R: [0, 0, 0] }, null), plate0 = w.plateMomentum ? w.plateMomentum() : null, prevP = mom(states);
  const pu = TST.push ? { ...TST.push, n0: Math.round(TST.push.at * hz), n1: Math.round((TST.push.at + TST.push.dur) * hz), J: V.sc(DIR[TST.push.dir], TST.push.Ns) } : null; let puOn = null;
  const recs = [], led = { resMax: 0, resSum2: 0, resDampMax: 0, turfJ: [0, 0, 0], pushJ: [0, 0, 0], obstJ: [0, 0, 0], dampJ: [0, 0, 0], n: 0 }, arbSum = {}, ev = [], P0v = prevP.slice(), L0 = angMom(states), supR = { rc: 0, cc: 0, n: 0 };
  let h = 2166136261, cpuJ = 0, cpuC = 0, nan = false, obstDepth = -1; const now = () => (typeof performance !== "undefined" ? performance.now() : 0);
  for (let n = 1; n <= steps; n++) {
    const t0 = now(), truth = obs;
    const u = loco.control(truth, { dt, n, qCur: (k) => spec.joints[k].type === "hinge" ? w.hingeAngle(k) : w.sixdofRot(k) });
    for (let k = 0; k < nj; k++) { w.setJointTarget(k, u.final[k], u.vel[k]); w.updateMotor(k, { kp: u.motor[k].kp, kd: u.motor[k].kd, lo: u.limits[k].lo, hi: u.limits[k].hi }); }
    // the disturbance: at a time (S5), or on the MEASURED gait phase (S7: mid-swing of a given rhythmic step, as the executor sees it)
    if (TST.pushOn && !puOn) { const R = loco.planner.exec.R; if (R && R.kind === "rhythmic" && R.stepIndex === TST.pushOn.step && (R.u || 0) >= TST.pushOn.u) {
      const sgn = (TST.pushOn.side === "swing") === (R.sw === "R") ? 1 : -1; puOn = { n0: n - 1, n1: n - 1 + Math.round(0.05 * hz), J: [sgn * TST.pushOn.Ns, 0, 0], t: n * dt, sw: R.sw, side: TST.pushOn.side }; ev.push({ t: n * dt, kind: "PUSH", what: `${TST.pushOn.Ns} N·s toward ${TST.pushOn.side} side (${sgn > 0 ? "+x" : "−x"}) at u ${R.u.toFixed(2)} of step ${R.stepIndex + 1} (${R.sw} swinging)` }); } }
    // (G2 characterisation, opt-in TST.pushChar = { step, u, J: [fwd, lat] N·s in the heading frame (lat + = toward the swing side), Lz }: a
    // linear push at the pelvis COM and/or a pure YAW couple Lz (kg·m²/s — two equal and opposite horizontal impulses 0.15 m either side of the
    // pelvis COM: no net linear impulse) over 0.05 s at a given swing fraction of a given rhythmic step; recorded in the ledger as a push)
    if (TST.pushChar && !puOn) { const R = loco.planner.exec.R, q = TST.pushChar; if (R && R.kind === "rhythmic" && R.stepIndex === q.step && (R.u || 0) >= (q.u || 0)) {
      const h0 = loco.planner.rhythm && loco.planner.rhythm.wk ? loco.planner.rhythm.wk.h0 : 0, hd = [Math.sin(h0), 0, Math.cos(h0)], lt = [hd[2], 0, -hd[0]], sd = R.sw === "R" ? 1 : -1, J = q.J || [0, 0];
      puOn = { n0: n - 1, n1: n - 1 + Math.round(0.05 * hz), J: V.add(V.sc(hd, J[0]), V.sc(lt, J[1] * sd)), Lz: q.Lz || 0, t: n * dt, sw: R.sw, side: "char" }; ev.push({ t: n * dt, kind: "PUSH", what: `characterisation push fwd ${J[0]} lat ${J[1]} N·s, yaw ${q.Lz || 0} kg·m²/s at u ${R.u.toFixed(2)} of step ${R.stepIndex + 1}` }); } }
    const P_ = pu || puOn; let ext = null; if (P_ && n > P_.n0 && n <= P_.n1) { ext = { J: V.sc(P_.J, 1 / (P_.n1 - P_.n0)), at: states[0].com.slice() }; if (P_.Lz) ext.couple = { Jc: P_.Lz / (2 * 0.15) / (P_.n1 - P_.n0), r: 0.15 }; }
    const t1 = now(), cts = [], lamA = { L: [0, 0, 0], R: [0, 0, 0] }, lamM = spec.joints.map(j => j.type === "hinge" ? 0 : [0, 0, 0]), obJ = obst.map(() => [0, 0, 0]);
    for (let s = 0; s < sub; s++) { if (ext) { w.applyImpulse(0, V.sc(ext.J, 1 / sub), ext.at);
        if (ext.couple) { const R0 = states[0].rot, fx = Q.rot(R0, [0, 0, 1]), lx = Q.rot(R0, [1, 0, 0]), f = V.norm([fx[0], 0, fx[2]]), l = V.norm([lx[0], 0, lx[2]]), c = ext.couple, jv = V.sc(f, c.Jc / sub);
          // (yaw +: about +y; a +y torque from +r·l with −J along f … the pair (J at +r·l, −J at −r·l) gives torque 2·r·(l × J)_y)
          const sgn = (l[2] * f[0] - l[0] * f[2]) >= 0 ? 1 : -1; w.applyImpulse(0, V.sc(jv, sgn), V.add(ext.at, V.sc(l, c.r))); w.applyImpulse(0, V.sc(jv, -sgn), V.sub(ext.at, V.sc(l, c.r))); } }
      w.step(dt / sub, 1); cts.push(...w.contacts);
      lamA.L = V.add(lamA.L, w.jointLambdaPosition(aL)); lamA.R = V.add(lamA.R, w.jointLambdaPosition(aR));
      for (let k = 0; k < nj; k++) { const l = w.motorLambda(k); lamM[k] = spec.joints[k].type === "hinge" ? lamM[k] + l : V.add(lamM[k], l); }
      obst.forEach((o, i) => { obJ[i] = V.add(obJ[i], w.obstacleImpulse(o.k)); }); }
    const t2 = now(); cpuC += t1 - t0; cpuJ += t2 - t1;
    for (const c of cts) if ((c.a <= -2 || c.b <= -2) && c.depth > obstDepth) obstDepth = c.depth;   // deepest penetration into an obstacle (no pass-through)
    const prevStates = states; states = read(); obs = sensor.update(n, dt, states, cts, lamA, ext); loco.arb.realize(lamM, dt);
    // ── the EXTERNAL-IMPULSE LEDGER: ΔP = turf (plate) + push + obstacle mounts + gravity (+ Jolt's body damping, a world setting) ──
    const Pn = mom(states), dP = V.sub(Pn, prevP); prevP = Pn; let turf = [0, 0, 0]; if (w.plate) { const pm = w.plateMomentum(); turf = V.sc(V.sub(pm, plate0), -1); plate0 = pm; }
    const oJ = obJ.reduce((s, x) => V.add(s, x), [0, 0, 0]), grav = [0, g * M * dt, 0], pushJ = ext ? ext.J : [0, 0, 0], lin = worldCfg.linDamp ?? 0.05, damp = V.sc(mom(prevStates), -lin * dt);
    const res = V.sub(dP, V.add(V.add(V.add(turf, pushJ), V.add(oJ, grav)), [0, 0, 0])), resD = V.sub(res, damp);
    led.resMax = Math.max(led.resMax, Math.hypot(...res)); led.resDampMax = Math.max(led.resDampMax, Math.hypot(...resD)); led.resSum2 += V.dot(res, res); led.n++;
    led.turfJ = V.add(led.turfJ, turf); led.pushJ = V.add(led.pushJ, pushJ); led.obstJ = V.add(led.obstJ, oJ); led.dampJ = V.add(led.dampJ, damp);
    for (const s of states) { for (const x of s.pos) if (!Number.isFinite(x)) nan = true; h = hashNums([...s.pos, ...s.rot, ...s.v, ...s.w], h); }
    // arbiter summary: per module requested / allowed / yielded torque impulse (N·m·s, |·| summed over axes), saturation per joint
    for (const e of u.arb.led) { for (const tm of e.terms) { if (tm.c === "D") continue; const A = arbSum[tm.m] = arbSum[tm.m] || { cls: tm.c, req: 0, alw: 0, yielded: 0, yieldSteps: 0 }, mag = (x) => Array.isArray(x) ? Math.abs(x[0]) + Math.abs(x[1]) + Math.abs(x[2]) : Math.abs(x);
        A.req += mag(tm.req) * dt; A.alw += mag(tm.alw !== undefined ? tm.alw : tm.req) * dt; }
      for (const y of e.yielded) { const A = arbSum[y.m]; A.yielded += (y.amt[0] + y.amt[1] + y.amt[2]) * dt; A.yieldSteps++; A.why = A.why || {}; for (const wy of y.why) if (wy) A.why[wy] = (A.why[wy] || 0) + 1; } }
    // SUPPORT REALIZATION under contention: on every joint whose posture target is owned by a P0 module (stance / posture) and that also
    // carries a lower-class request this step, the projection of the REALIZED torque onto the P0 core request (hold + damp + P0 / P1 feed-
    // forward, i.e. the prediction without the allowed lower-class share): Σ real·core / Σ core·core (1 = support fully delivered)
    for (const e of u.arb.led) { const low = e.terms.filter(tm => tm.c === "P2" || tm.c === "P3" || tm.c === "P4"); if (!low.length || !/^(stance|posture)$/.test(e.owner) || e.real == null) continue;
      const vec = (x) => Array.isArray(x) ? x : [x, 0, 0], lowA = low.reduce((acc, tm) => V.add(acc, vec(tm.alw !== undefined ? tm.alw : tm.req)), [0, 0, 0]), core = V.sub(vec(e.pred), lowA), real = vec(e.real);
      supR.rc += V.dot(real, core); supR.cc += V.dot(core, core); supR.n++; }
    for (const e of u.gait.events) ev.push(e);
    const f = obs.feet, satN = u.arb.led.reduce((a, e) => a + (Array.isArray(e.sat) ? e.sat.filter(Boolean).length : e.sat ? 1 : 0), 0);
    const rec = { n, t: n * dt, cls: u.cls.state, com: obs.com, vcom: obs.vcom, xi: obs.xi, h: obs.h, xiMargin: obs.xiMargin, comMargin: obs.comMargin, degraded: obs.supportDegraded, copSmooth: obs.copSmooth, trunk: obs.trunkTiltDeg, grf: obs.grf, nonFootGround: obs.nonFootGround,
      feet: { L: slim(f.L), R: slim(f.R) }, push: ext, satN, gait: { support: u.gait.support, role: u.gait.role, phase: u.gait.phase }, mon: { state: u.monitor.state, verdict: u.monitor.verdict, reason: u.monitor.reason, beyond: u.monitor.beyond },
      exec: loco.planner.exec.R ? { sw: loco.planner.exec.R.sw, kind: loco.planner.exec.R.kind, stage: loco.planner.exec.R.stage, u: loco.planner.exec.R.u, target: loco.planner.exec.R.proj && loco.planner.exec.R.proj.target, planned: loco.planner.exec.R.plannedTd } : null,
      rhythm: loco.planner.rhythm ? { stage: loco.planner.rhythm.stage, i: loco.planner.rhythm.i } : null, ledger: { res: Math.hypot(...res), resD: Math.hypot(...resD), turf, obst: oJ },
      fp: { L: [states[fIx.L].pos[0], states[fIx.L].pos[2]], R: [states[fIx.R].pos[0], states[fIx.R].pos[2]] }, ref: u.ref ? { u: u.ref.u, w: u.ref.w } : null, P: Pn, L: TST.world && TST.world.gravity === 0 ? angMom(states) : null, views: u.views,
      ctl: u.debug ? { pStar: u.debug.pStar, pRaw: u.debug.pRaw, xiRef: u.debug.xiRef, r: u.debug.r, tauTrunk: u.debug.tauTrunk || null, stance: u.debug.stance, fricR: u.debug.fricR, hipCap: u.debug.hipCapHere, reason: u.cls.reason } : null, swingTgt: u.plan && u.plan.swing ? Object.values(u.plan.swing)[0] || null : null };
    if (opts.keepStates) { rec.states = states.map(s => ({ pos: s.pos, rot: s.rot, com: s.com, v: s.v, w: s.w })); rec.cts = cts.map(c => ({ ...c })); rec.region = obs.region; rec.polyReliable = obs.polyReliable; rec.prosp = u.monitor.prosp; rec.tgt = { T: u.final };
      rec.arb = u.arb.led.map(e => ({ joint: e.joint, owner: e.owner, terms: e.terms, pred: e.pred, env: e.env, real: e.real, sat: e.sat, yielded: e.yielded, kp: e.kp, kd: e.kd, off: e.clampOff })); rec.obstacles = obst.map(o => ({ kind: o.kind, pos: o.pos, he: o.he })); }
    recs.push(rec);
  }
  const audit = Object.assign({}, w.audit), support = !!w.support; w.destroy();
  return summarizeG1a(spec, key, TST, { hash: (h >>> 0).toString(16), nan, audit, support, recs, loco, led, arbSum, ev, puOn, cpuJ, cpuC, steps, sub, P0: P0v, L0, M, worldCfg, obst, supR, obstDepth, delays: { fb: loco.dFb, pl: loco.dPl } });
}
const slim = (f) => ({ state: f.state, touching: f.touching, loaded: f.loaded, slipping: f.slipping, load: f.load, shear: f.shear, centroid: f.centroid, slipDist: f.slipDist, slipSpeed: f.slipSpeed, muUsed: f.muUsed, edgeContact: f.edgeContact, sole: f.sole, points: f.points, anchor: f.anchor ? f.anchor.pos : null, heel: f.heel, toe: f.toe, extContact: f.extContact });
const r2 = (x, d = 2) => (x == null || !Number.isFinite(x) ? null : +x.toFixed(d));
export function summarizeG1a(spec, key, TST, x) {
  const R_ = x.recs, last = R_[R_.length - 1], com0 = R_[Math.min(R_.length - 1, 12)].com, hyp = (v) => Math.hypot(v[0], v[2]), pl = x.loco.planner, M = x.M;
  const fell = R_.some(r => r.nonFootGround) || ["FALLING", "GROUNDED"].includes(last.cls), released = R_.some(r => r.cls === "FALLING");
  const exDone = pl.exec.done, rhythm = pl.rhythm, gaitEv = x.ev;
  const out = { test: key, group: TST.group, title: TST.title, hash: x.hash, nan: x.nan, audit: x.audit, supportFixture: x.support, sub: x.sub, delays: x.delays,
    outcome: fell ? "FELL" : released ? "RELEASED_REENGAGED" : exDone.some(R => R.kind === "corrective") ? "RECOVERED_WITH_STEP" : "UPRIGHT", fell, released,
    whole: { comExcursionCm: r2(Math.max(...R_.map(r => Math.hypot(r.com[0] - com0[0], r.com[2] - com0[2]))) * 100, 1), comDropCm: r2((com0[1] - Math.min(...R_.map(r => r.com[1]))) * 100, 1), trunkMaxDeg: r2(Math.max(...R_.map(r => r.trunk)), 1),
      swayStdMm: r2(std(R_.filter(r => r.t >= 2).map(r => r.com[0])) * 1000 + std(R_.filter(r => r.t >= 2).map(r => r.com[2])) * 1000, 2), finalV: r2(hyp(last.vcom), 3),
      // C1's quiet-stance measures, same definitions (pc_gatec1: steady = t ≥ 1 s before any push; reference = the COM at 0.5 s)
      quiet: (() => { const st = R_.filter(r => r.t >= 1.0 && !r.push), c0 = (R_.find(r => r.t >= 0.5 - 1e-9) || R_[0]).com; return st.length > 20 ? { comDriftCm: r2(Math.hypot(last.com[0] - c0[0], last.com[2] - c0[2]) * 100, 2), swayRmsMm: r2(Math.sqrt(st.reduce((a, r) => a + (r.com[0] - c0[0]) ** 2 + (r.com[2] - c0[2]) ** 2, 0) / st.length) * 1000, 2) } : null; })() },
    steps: exDone.map(R => ({ kind: R.kind, sw: R.sw, status: R.status, fail: R.fail || null, stepIndex: R.stepIndex ?? null, liftoffT: R.liftoff ? r2(R.liftoff.t, 3) : null, tdT: R.td ? r2(R.td.t, 3) : null, plannedTdT: R.td ? r2(R.td.plannedT, 3) : null, uAt: R.td ? r2(R.td.uAt, 2) : null,
      footholdErrCm: R.td ? r2(Math.hypot(R.td.center[0] - R.td.planned[0], R.td.center[1] - R.td.planned[1]) * 100, 1) : null, adjustCm: r2(R.adjustCm, 1), stanceSlipCm: R.liftoff && R.td ? r2(slipOf(R_, R.sw === "L" ? "R" : "L", R.liftoff.t, R.td.t) * 100, 2) : null, obstructed: R.obst ? { t: r2(R.obst.t, 3), tTruth: r2(R.obst.tTruth, 3), reactMs: r2((R.obst.reactS || 0) * 1000, 0) } : null })),
    rhythm: rhythm ? { stage: rhythm.stage, stepsDone: rhythm.i, of: rhythm.steps.length } : null,
    transfer: (x.loco.opts.transfer || []).length ? pl.log.filter(e => e.kind === "gate open" || e.kind === "transfer") : null,
    requests: pl.seq ? pl.seq.reports.map(Rq => ({ foot: Rq.foot, status: Rq.status, why: Rq.why, errCm: Rq.td && Rq.proj && Rq.proj.target ? r2(Math.hypot(Rq.td.center[0] - Rq.proj.target[0], Rq.td.center[1] - Rq.proj.target[1]) * 100, 1) : null, accepted: !!Rq.accepted })) : null,
    monitor: { released, verdicts: countBy(R_.map(r => r.mon.verdict)), log: pl.monitor.log.slice(0, 60), releases: pl.monitor.log.filter(e => /^FALLING/.test(e.what)) },
    gaitEvents: gaitEv.slice(0, 120), execLog: pl.exec.log.slice(0, 80), plannerLog: pl.log.slice(0, 60),
    ledger: { residualMaxNs: r2(x.led.resMax, 5), residualRmsNs: r2(Math.sqrt(x.led.resSum2 / Math.max(1, x.led.n)), 6), residualMaxAfterDampingNs: r2(x.led.resDampMax, 5), turfImpulseNs: x.led.turfJ.map(v => r2(v, 2)), pushImpulseNs: x.led.pushJ.map(v => r2(v, 2)), obstacleImpulseNs: x.led.obstJ.map(v => r2(v, 3)), engineDampingNs: x.led.dampJ.map(v => r2(v, 3)),
      noRootForce: !x.support && x.audit.teleports === 0 && x.audit.velocityWrites === 0 },
    arbiter: Object.fromEntries(Object.entries(x.arbSum).map(([m, A]) => [m, { cls: A.cls, requestedNms: r2(A.req, 2), allowedNms: r2(A.alw, 2), yieldedNms: r2(A.yielded, 3), yieldSteps: A.yieldSteps, why: A.why || null }])),
    obstacleMaxDepthMm: x.obst && x.obst.length ? r2(Math.max(0, x.obstDepth) * 1000, 2) : null,
    supportRealization: x.supR && x.supR.n ? { ratio: r2(x.supR.rc / Math.max(1e-9, x.supR.cc), 4), jointSteps: x.supR.n } : null,
    satSteps: R_.reduce((a, r) => a + (r.satN > 0 ? 1 : 0), 0), push: x.puOn ? { t: r2(x.puOn.t, 3), side: x.puOn.side, sw: x.puOn.sw } : TST.push || null,
    internal: TST.world && TST.world.gravity === 0 ? { dPNs: r2(Math.hypot(...V.sub(last.P, x.P0)), 5), dLkgm2s: r2(Math.hypot(...V.sub(last.L, x.L0)), 5), peakPNs: r2(Math.max(...R_.map(r => Math.hypot(...V.sub(r.P, x.P0)))), 5), peakL: r2(Math.max(...R_.map(r => Math.hypot(...V.sub(r.L, x.L0)))), 5) } : null,
    cpu: { msPerFrame: r2((x.cpuJ + x.cpuC) / x.steps * 4, 4), jolt: r2(x.cpuJ / x.steps * 4, 4), controller: r2(x.cpuC / x.steps * 4, 4) }, recs: R_ };
  return out; }
// the stance foot's horizontal travel (ankle) over single support: |Δ| between liftoff and touchdown of the swing foot
const slipOf = (R_, st, t0, t1) => { const a = R_.find(r => r.t >= t0 - 1e-9), b = R_.find(r => r.t >= t1 - 1e-9) || R_[R_.length - 1]; return a && b ? Math.hypot(b.fp[st][0] - a.fp[st][0], b.fp[st][1] - a.fp[st][1]) : null; };
const std = (a) => { if (!a.length) return 0; const m = a.reduce((s, v) => s + v, 0) / a.length; return Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / a.length); };
const countBy = (a) => a.reduce((o, v) => (o[v] = (o[v] || 0) + 1, o), {});
