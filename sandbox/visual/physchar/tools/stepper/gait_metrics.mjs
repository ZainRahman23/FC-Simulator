// ═══ physchar/tools/stepper/gait_metrics.mjs — contact-event gait instrumentation (MEASUREMENT ONLY) ════════════════════════════════════
// Records walks (a controller run, or a committed oracle command sequence) and measures them on CONTACT-DEFINED events, identically for every
// run:
//   per step k: commanded vs achieved foothold, ACTUAL step length / width (successive opposite-foot touchdowns), liftoff delay, swing and
//   double-support durations, COM state at touchdown relative to the landed foot, phase-matched forward velocity (at touchdown), the
//   step-average speed, trailing / leading leg extension, landing pitch, saturation, centroidal angular momentum, pelvis yaw, and the
//   single-support CoP (in single support the combined CoP IS the stance-foot CoP; double-support CoP is not reported).
//   per stride (same-foot touchdown → same-foot touchdown): the stride-average speed; the horizontal ground impulse along the walk, per leg and
//   split into double / single support, checked against the COM momentum change (integrity residual); the energy budget — kinetic,
//   potential, motor work Σ τ·(ω_child − ω_parent), and the residual (contact + damping losses + numerical).
// usage: node tools/stepper/gait_metrics.mjs --runs runs.json --out metrics.json   (runs: [{ label, start, fixed?, ctrl?, walk?, human?, n }])
import fs from "fs"; import path from "path"; import { fileURLToPath } from "url";
import { buildBodySpec, WORKING_CALIB } from "../../pc_body.js";
import { loadJolt } from "../../pc_jolt.js";
import { buildPoses, csOfRel } from "../../pc_control.js";
import { initOfLoco } from "../../pc_ref.js";
import { runG2a, TESTS_G2 } from "../../pc_gateg2.js";
import { V, Q } from "../../pc_math.js";
const here = path.dirname(fileURLToPath(import.meta.url)), PC = path.resolve(here, "../.."), ROOT = path.resolve(here, "../../../../..");
const arg = (k, d) => { const i = process.argv.indexOf(k); return i < 0 ? d : process.argv[i + 1]; };
const dir = path.join(ROOT, "assets/characters/outfield/gabriel"), rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8")), buf = fs.readFileSync(path.join(dir, "mesh.bin"));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), Ly = rig.mesh.layout, TA = { Float32Array, Uint16Array, Uint32Array, Uint8Array };
const mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new TA[Ly[k].elementType](ab, Ly[k].byteOffset, Ly[k].elementCount);
const FOOT = process.env.FOOT || "F0";
const spec = buildBodySpec(rig, mesh, { calib: WORKING_CALIB, ...(FOOT !== "F0" ? { footModel: FOOT } : {}) }), J = await loadJolt(path.join(PC, "vendor/jolt-physics.wasm-compat.js")), poses = buildPoses(spec);
initOfLoco(fs.readFileSync(path.join(PC, "../anim3d/of_loco.js"), "utf8"));
const JD = path.resolve(ROOT, "review_artifacts/physical_character_v1/g2_walker/json"), mcache = {};
const models = (pre) => mcache[pre] || (mcache[pre] = Object.fromEntries([0, 0.1, 0.15, 0.2, 0.25].map(t => [t, JSON.parse(fs.readFileSync(path.join(JD, `${pre}${t}.json`), "utf8"))])));
const BASE_CTRL = { kind: "U", vd: 0.5, from: 1, ramp: { a: 0.3 }, place: "maps", uRefSim: false, lat: { rho: 0.4 }, adapt: null, reachIter: false }, BASE_WALK = { swingBase: { w: "model", learn: { rate: 0.05 }, pure: [0] } };
const M = spec.totalMass, g = 9.81, dt = 1 / 240, LINDAMP = 0.05, legLen = 0.9243, bi = (n) => spec.bodies.findIndex(b => b.name === n);
const Cq = spec.joints.map(j => j.type === "hinge" ? null : Q.fromAxes(j.X, j.Y, j.Z));
const yawOf = (q) => { const f = Q.rot(q, [0, 0, 1]); return Math.atan2(f[0], f[2]); }, pitchOf = (q) => { const f = Q.rot(q, [0, 0, 1]); return Math.atan2(f[1], Math.hypot(f[0], f[2])); };
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a)), mean = (a) => a.length ? a.reduce((s, x) => s + x, 0) / a.length : null, sd = (a) => { const m = mean(a); return a.length ? Math.sqrt(mean(a.map(x => (x - m) ** 2))) : null; };
const KE = (S) => S.reduce((s, q, i) => { const b = spec.bodies[i], wl = Q.rot(Q.conj(q.rot), q.w); return s + 0.5 * b.mass * V.dot(q.v, q.v) + 0.5 * (b.inertia[0] * wl[0] ** 2 + b.inertia[1] * wl[1] ** 2 + b.inertia[2] * wl[2] ** 2); }, 0);
const angMom = (S) => { let c = [0, 0, 0]; S.forEach((q, i) => { c = V.add(c, V.sc(q.com, spec.bodies[i].mass)); }); c = V.sc(c, 1 / M); let L = [0, 0, 0];
  S.forEach((q, i) => { const b = spec.bodies[i], wl = Q.rot(Q.conj(q.rot), q.w); L = V.add(L, V.add(Q.rot(q.rot, [b.inertia[0] * wl[0], b.inertia[1] * wl[1], b.inertia[2] * wl[2]]), V.sc(V.cross(V.sub(q.com, c), q.v), b.mass))); }); return L; };
// motor power this tick: the realized motor torque (constraint space → world, on the child) · the relative angular velocity (child − parent)
function motorPower(rec, prev) { let P = 0; const S = rec.states, Sp = prev.states; const byName = Object.fromEntries((rec.arb || []).map(e => [e.joint, e]));
  spec.joints.forEach((j, k) => { const e = byName[j.name]; if (!e || e.real == null) return; const wc = V.sc(V.add(S[j.childIndex].w, Sp[j.childIndex].w), 0.5), wp = V.sc(V.add(S[j.parentIndex].w, Sp[j.parentIndex].w), 0.5), wr = V.sub(wc, wp), Rc = S[j.childIndex].rot;
    const tw = j.type === "hinge" ? V.sc(Q.rot(Rc, j.axis), Array.isArray(e.real) ? e.real[0] : e.real) : Q.rot(Rc, Q.rot(Cq[k], e.real)); P += V.dot(tw, wr); }); return P; }
export function measure(r, P, label) { const R_ = r.recs, tF = (R_.find(q => q.com[1] < 0.75) || { t: Infinity }).t, h0 = P.rhythm.wk ? P.rhythm.wk.h0 : 0, hd = [Math.sin(h0), Math.cos(h0)], rt = [hd[1], -hd[0]];
  const at = (t) => { let lo = 0, hi = R_.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (R_[m].t < t) lo = m; else hi = m; } return hi; };
  const fw = (p) => p[0] * hd[0] + p[1] * hd[1], lat = (p) => p[0] * rt[0] + p[1] * rt[1], wl = P.rhythm.walkerLog || [];
  // per-tick series: forward horizontal force per foot, energies, motor power
  const Fx = { L: R_.map(q => q.feet.L.shear ? fw([q.feet.L.shear[0], q.feet.L.shear[2]]) : 0), R: R_.map(q => q.feet.R.shear ? fw([q.feet.R.shear[0], q.feet.R.shear[2]]) : 0) };
  const turfX = R_.map(q => q.ledger && q.ledger.turf ? fw([q.ledger.turf[0], q.ledger.turf[2]]) : 0), Pm = R_.map(q => q.P ? fw([q.P[0], q.P[2]]) : M * fw([q.vcom[0], q.vcom[2]]));
  // (Jolt's world-level linear body damping — an approved world setting, linDamp 0.05 /s — acts on every body: −linDamp·P per second; it is accounted, not hidden)
  const dampX = R_.map((q, i) => i ? -LINDAMP * Pm[i - 1] * dt : 0);
  const E = R_.map(q => ({ ke: KE(q.states), pe: M * g * q.com[1] })), Pw = R_.map((q, i) => i ? motorPower(q, R_[i - 1]) : 0);
  const sum = (arr, i0, i1) => { let s = 0; for (let i = i0 + 1; i <= i1; i++) s += arr[i]; return s; };
  const D = P.exec.done.filter(d => d.kind === "rhythmic" && d.td && d.td.t < tF).sort((a, b) => a.stepIndex - b.stepIndex), steps = [];
  for (let n = 0; n < D.length; n++) { const d = D[n], prev = n ? D[n - 1] : null, next = D[n + 1] || null, sdn = d.sw === "R" ? 1 : -1, st = d.sw === "R" ? "L" : "R", it = at(d.td.t), q = R_[it], i0 = at(d.tSw0), q0 = R_[i0];
    const c = d.td.center, rel = (p) => [fw([p[0] - d.pSt[0], p[1] - d.pSt[1]]), lat([p[0] - d.pSt[0], p[1] - d.pSt[1]]) * sdn], lg = wl.find(e => e.i === d.stepIndex);
    const comR = [fw([q.com[0] - c[0], q.com[2] - c[1]]), lat([q.com[0] - c[0], q.com[2] - c[1]]) * -sdn];   // (COM relative to the LANDED foot; sideways + = toward the new stance side's outside)
    const ext = (qq, s) => { const a = qq.states[bi("thigh_" + s)].pos, b = qq.states[bi("foot_" + s)].pos; return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) / legLen; };
    // single support CoP (stance foot), relative to the stance sole centre along the walk, at 25 / 50 / 75 % of the single support
    const ssCop = d.liftoff ? [0.25, 0.5, 0.75].map(f => { const qq = R_[at(d.liftoff.t + f * (d.td.t - d.liftoff.t))]; return qq.copSmooth ? fw([qq.copSmooth[0] - d.pSt[0], qq.copSmooth[1] - d.pSt[1]]) : null; }) : null;
    const satM = mean(R_.slice(i0, it + 1).map(qq => qq.satN || 0)), Lm = angMom(q.states);
    steps.push({ k: d.stepIndex, sw: d.sw, cmd: lg ? lg.u.slice(0, 3) : null, ach: rel(c), stepLen: prev ? fw([c[0] - prev.td.center[0], c[1] - prev.td.center[1]]) : null, width: prev ? Math.abs(lat([c[0] - prev.td.center[0], c[1] - prev.td.center[1]])) : null,
      tSw0: d.tSw0, lift: d.liftoff ? d.liftoff.t : null, td: d.td.t, liftDelay: d.liftoff ? d.liftoff.t - d.tSw0 : null, swingT: d.liftoff ? d.td.t - d.liftoff.t : null, dsAfter: next && next.liftoff ? next.liftoff.t - d.td.t : null,
      xi0: rel([q0.xi[0], q0.xi[1]]), v0: fw([q0.vcom[0], q0.vcom[2]]), comTd: comR, vTd: fw([q.vcom[0], q.vcom[2]]), vTdLat: lat([q.vcom[0], q.vcom[2]]) * -sdn, vyTd: q.vcom[1], comH: q.com[1],
      stepSpeed: prev ? (fw([q.com[0], q.com[2]]) - fw([R_[at(prev.td.t)].com[0], R_[at(prev.td.t)].com[2]])) / (d.td.t - prev.td.t) : null,
      trailExt0: ext(q0, d.sw), trailExtLift: d.liftoff ? ext(R_[at(d.liftoff.t)], d.sw) : null, leadExtTd: ext(q, d.sw), stExtTd: ext(q, st), landPitch: pitchOf(q.states[bi("foot_" + d.sw)].rot),
      ssCop, satMean: satM, Lpitch: lat([Lm[0], Lm[2]]) * sdn, Lyaw: Lm[1] * sdn, pelvisYaw: wrap(yawOf(q.states[0].rot) - h0) * sdn, tdErr: d.td.planned ? [fw([c[0] - d.td.planned[0], c[1] - d.td.planned[1]])] : null, uAt: d.td.uAt });
  }
  // strides: same-foot touchdown → same-foot touchdown (steps n−2 → n)
  const strides = []; for (let n = 2; n < D.length; n++) { const a = D[n - 2], b = D[n], ia = at(a.td.t), ib = at(b.td.t), dtS = b.td.t - a.td.t, mid = D[n - 1];
    const JL = sum(Fx.L, ia, ib) * dt, JR = sum(Fx.R, ia, ib) * dt, dP = Pm[ib] - Pm[ia], Jturf = sum(turfX, ia, ib);
    // phase split: double support = from each touchdown to the next liftoff of the other foot; the rest single support
    let Jds = 0, Jss = 0; for (let i = ia + 1; i <= ib; i++) { const qq = R_[i], ds = qq.feet.L.loaded && qq.feet.R.loaded; const f = (Fx.L[i] + Fx.R[i]) * dt; if (ds) Jds += f; else Jss += f; }
    const dKE = E[ib].ke - E[ia].ke, dPE = E[ib].pe - E[ia].pe, Wm = sum(Pw, ia, ib) * dt, Jdamp = sum(dampX, ia, ib);
    strides.push({ k: b.stepIndex, t0: a.td.t, t1: b.td.t, speed: (fw([R_[ib].com[0], R_[ib].com[2]]) - fw([R_[ia].com[0], R_[ia].com[2]])) / dtS, vPhase: fw([R_[ib].vcom[0], R_[ib].vcom[2]]),
      J: JL + JR, JL, JR, Jds, Jss, Jturf, Jdamp, dP, resid: dP - (JL + JR) - Jdamp, dKE, dPE, Wmotor: Wm, Eresid: dKE + dPE - Wm }); }
  const S2 = steps.filter(s => s.k >= 2), St = strides.filter(s => s.k >= 3), lin = (ys) => { const n = ys.length; if (n < 3) return null; const xs = ys.map((_, i) => i), mx = mean(xs), my = mean(ys); let sxy = 0, sxx = 0; for (let i = 0; i < n; i++) { sxy += (xs[i] - mx) * (ys[i] - my); sxx += (xs[i] - mx) ** 2; } return sxy / sxx; };
  const absJ = St.reduce((s, x) => s + Math.abs(x.JL) + Math.abs(x.JR), 0);
  const summary = { label, upright: D.length, fell: Number.isFinite(tF), tFall: Number.isFinite(tF) ? tF : null,
    stepLen: [mean(S2.map(s => s.stepLen).filter(x => x != null)), sd(S2.map(s => s.stepLen).filter(x => x != null))], width: mean(S2.map(s => s.width).filter(x => x != null)), cadence: S2.length > 2 ? 60 * (S2.length - 1) / (S2[S2.length - 1].td - S2[0].td) : null,
    swingT: mean(S2.map(s => s.swingT).filter(x => x != null)), dsT: mean(S2.map(s => s.dsAfter).filter(x => x != null)), liftDelay: mean(S2.map(s => s.liftDelay).filter(x => x != null)),
    strideSpeed: [mean(St.map(s => s.speed)), sd(St.map(s => s.speed))], strideSpeedSlopePerStride: lin(St.map(s => s.speed)), vPhaseTd: [mean(S2.map(s => s.vTd)), sd(S2.map(s => s.vTd))],
    strideJ: [mean(St.map(s => s.J)), sd(St.map(s => s.J))], strideJdamp: mean(St.map(s => s.Jdamp)), impulseIntegrity: St.length ? St.reduce((s, x) => s + Math.abs(x.resid), 0) / Math.max(1e-9, absJ) : null, turfVsFeet: St.length ? mean(St.map(s => s.Jturf - s.J)) : null,
    Wmotor: mean(St.map(s => s.Wmotor)), Eresid: mean(St.map(s => s.Eresid)), trailExt0: mean(S2.map(s => s.trailExt0)), leadExtTd: mean(S2.map(s => s.leadExtTd)), comTdFwd: mean(S2.map(s => s.comTd[0])), satMean: mean(S2.map(s => s.satMean)) };
  return { summary, steps, strides }; }
export function runAndMeasure(job) { const [first, atS] = job.start.split("@"), at = +atS, n = job.n ?? 30;
  const steps = Array.from({ length: n }, (_, i) => ({ sw: (i % 2 === 0) === (first === "R") ? "R" : "L", ...(i === 0 ? { fwdK: 0.7 } : i === 1 ? { fwdK: 0.9 } : {}) }));
  const base = TESTS_G2.G2W_A8.loco.rhythm.walk, ctrl = { ...base.ctrl, ...BASE_CTRL, ...(job.ctrl || {}) }; ctrl.models = models(ctrl.modelsPrefix || "mU1_tau"); delete ctrl.modelsPrefix; if (job.fixed && Object.keys(job.fixed).length) ctrl.identFixed = true;
  const walk = { ...BASE_WALK, ...(job.walk || {}), char: { ...(base.char || {}), ...(job.fixed || {}) }, ctrl }; let LOCO = null, tFall = null;
  const r = runG2a(J, spec, "G2W_A8", { poses, keepStates: true, seconds: job.seconds ?? (1.6 + n * 0.62), rhythmOver: { steps, at, walk }, ...(job.human ? { humanOver: job.human } : {}), ...(job.push ? { pushChar: job.push } : {}), onLoco: (l) => { LOCO = l; },
    stopWhen: (nn, obs) => { if (obs.com[1] < 0.75 && tFall == null) tFall = obs.t; return tFall != null && obs.t > tFall + 0.3; } });
  return { hash: r.hash, ...measure(r, LOCO.planner, job.label || job.start) }; }
if (process.argv[1] && process.argv[1].endsWith("gait_metrics.mjs")) { const runs = JSON.parse(fs.readFileSync(arg("--runs"), "utf8")), out = [];
  for (const job of runs) { const t0 = Date.now(), m = runAndMeasure(job); out.push({ job: { ...job, fixed: undefined, nFixed: job.fixed ? Object.keys(job.fixed).length : 0 }, ...m }); const s = m.summary;
    console.log(`${s.label}: upright ${s.upright}${s.fell ? " (fell " + s.tFall.toFixed(2) + ")" : ""} | step ${s.stepLen[0]?.toFixed(3)}±${s.stepLen[1]?.toFixed(3)} m, width ${s.width?.toFixed(3)}, cadence ${s.cadence?.toFixed(0)}/min, swing ${s.swingT?.toFixed(3)} s, DS ${s.dsT?.toFixed(3)} s | stride speed ${s.strideSpeed[0]?.toFixed(2)}±${s.strideSpeed[1]?.toFixed(2)} (slope ${s.strideSpeedSlopePerStride?.toFixed(3)}/stride) | stride J ${s.strideJ[0]?.toFixed(2)}±${s.strideJ[1]?.toFixed(2)} N·s, integrity ${(100 * (s.impulseIntegrity ?? NaN)).toFixed(1)} % | W_motor ${s.Wmotor?.toFixed(1)} J/stride, E resid ${s.Eresid?.toFixed(1)} J | ${((Date.now() - t0) / 1000).toFixed(0)} s`); }
  if (arg("--out")) fs.writeFileSync(arg("--out"), JSON.stringify(out)); }
