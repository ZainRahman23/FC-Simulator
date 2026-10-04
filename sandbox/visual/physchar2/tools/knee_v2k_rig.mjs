// ═══ physchar2/tools/knee_v2k_rig.mjs — corrected knee (v2k) qualification, JOLT RIG part: KV2b, KV3b, KV4b, KV5, KV6b, KV7b, KV8
// review_artifacts/physical_character_v2/knee_correction/KNEE_CORRECTION_PREREG.md. Rig (the G1 passive-joint-rig method, extended): gravity 0,
// 2 m up, the G1 rig base pose; EVERY body except the tested shank + foot is KINEMATIC (fixed); the passive layer acts on every joint (couplings on);
// the knee FLEXION actuator row (spec capacity) holds / drives flexion (PD encoded in the target angular velocity, the actuation layer's encoding);
// the knee axial actuator is OFF; an external axial torque (anatomical sign, + = internal) acts on the shank about the knee twist axis.
// Ledgers per step (mid-step relative ω): passive work = Σ joints Σ rows (motor λ/dt)·(ω_rel·axis) + explicit pair · ω_rel; actuator work;
// external work; viscous loss (PassiveLayer.dampingLoss); stored energy E = KE(shank, foot) + U.
// usage: node tools/knee_v2k_rig.mjs [--part=all|kv4b|kv3b|kv6b|kv7b|kv8] [--model=v2k|old] [--out=<json>]
import fs from "fs"; import path from "path"; import { fileURLToPath } from "url";
import { loadJolt, V2JoltWorld } from "../core/v2_jolt.js"; import { generateSpec } from "../spec/v2_spec.js"; import { VARIATION_SET } from "../spec/v2_human.js";
import { posedBodies, POSES } from "../spec/v2_pose.js"; import { decompose, pyr } from "../spec/v2_joints.js"; import { V, Q } from "../core/v2_math.js";
import { PassiveLayer } from "../sim/v2_passive.js"; import { kneeEnvelopeV2K, kneeAxialTorque, kneeTheta0, KNEE_V2K } from "../spec/v2_knee.js"; import { G1_WORLD } from "../gates/v2_g1.js";
const here = path.dirname(fileURLToPath(import.meta.url)), J = await loadJolt(path.join(here, "../vendor/jolt-physics.wasm-compat.js")), arg = (k, d) => (process.argv.find(a => a.startsWith(`--${k}=`)) || `--${k}=${d}`).split("=").slice(1).join("=");
const PART = arg("part", "all"), MODEL = arg("model", "v2k"), OUT = arg("out", ""), D = 180 / Math.PI, R = Math.PI / 180;
// close-decisions stage (QUALIFICATION_V2_PREREG.md): --adv = a DELIBERATELY BAD variant of the corrected knee for the discrimination tests of the
// superseding criteria (test harness only; the simulator is unchanged): naive = the moving rest angle WITHOUT the flexion reaction (the knee envelope
// frozen at the current flexion inside the gradient); inject = +0.5 N·m·s/rad negative damping on the knee twist row (an energy source); spring =
// a non-potential elastic torque −0.2 N·m/° × (θ − θ0(φ)) on the knee twist row. --crit=v2 also evaluates the superseding criteria KV2b′ / KV3b′.
const ADV = arg("adv", ""), CRIT = arg("crit", "v1");
const spec = generateSpec(VARIATION_SET.find(h => h.id === "V2-REF")), res = { model: MODEL, checks: [], runs: {} };
const chk = (id, name, pass, value, limit) => { res.checks.push({ id, name, pass: !!pass, value, limit }); console.log(`${pass ? "PASS" : "FAIL"} ${id} ${name}: ${value} (limit ${limit})`); };
const RIG_BASE = { ...POSES.neutral.angles, shoulder_L: { abd: 40 }, shoulder_R: { abd: 40 }, hip_L: { abd: 8 }, hip_R: { abd: 8 } };
const bi = (n) => spec.bodies.findIndex(b => b.name === n), ji = (n) => spec.joints.findIndex(j => j.name === n);
const AX = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
// one rig run. side "R" | "L"; hz; prog(t) → { flex (deg target), dflex (deg/s), T (N·m, anatomical axial torque on the shank) }; seconds
function rig({ side = "R", hz = G1_WORLD.hz, f0, prog, seconds, record = 4 }) {
  const dt = 1 / hz, kneeN = "knee_" + side, k = ji(kneeN), j = spec.joints[k], shank = bi("shank_" + side), foot = bi("foot_" + side), ankle = ji("ankle_" + side);
  const S = posedBodies(spec, { ...RIG_BASE, [kneeN]: { flex: f0, rot: MODEL === "v2k" ? kneeTheta0(f0) : 0 } }).map(s => ({ pos: V.add(s.pos, [0, 2, 0]), rot: s.rot }));
  const w = new V2JoltWorld(J, spec, spec.contact, { velSteps: G1_WORLD.velSteps, posSteps: G1_WORLD.posSteps, gravity: 0, recordContacts: true, actuators: true });
  S.forEach((s, b) => w.setPose(b, s.pos, s.rot)); spec.bodies.forEach((b, n) => { if (n !== shank && n !== foot) w.setKinematic(n); });
  const P = new PassiveLayer(spec, w, { kneeModel: MODEL === "v2k" ? "v2k" : null }); if ((MODEL === "v2k") !== P.kneeIsV2K) throw new Error("model selection");
  if (ADV) advPatch(P, k, j);
  const iy = j.def.axes.y && !j.def.axes.y.locked ? 1 : -1, ix = 0, sx = j.def.axes.x.s, capF = j.capacity.y, Kp = 3000, Kd = 60;
  w.setAct(k, iy, Kp, Kd, -capF.minus.Nm, capF.plus.Nm); w.actOn(k, iy, true);
  const rd = () => spec.bodies.map((b, n) => w.read(n)), qcs = (st, jj) => Q.norm(Q.mul(Q.conj(jj.F1), Q.mul(Q.conj(st[jj.parentIndex].rot), Q.mul(st[jj.childIndex].rot, jj.F2))));
  const anatK = (st) => { const q = qcs(st, j); return { flex: P.anat(P.jd[k], q, "flex"), rot: P.anat(P.jd[k], q, "rot"), tw: decompose(q).tw, sy: decompose(q).sy }; };
  const KE = (st) => [shank, foot].reduce((a, n) => { const b = spec.bodies[n], s = st[n], wl = Q.rot(Q.conj(s.rot), s.w), I = b.inertia;
    return a + 0.5 * b.mass * V.dot(s.v, s.v) + 0.5 * (wl[0] * (I[0][0] * wl[0] + I[0][1] * wl[1] + I[0][2] * wl[2]) + wl[1] * (I[1][0] * wl[0] + I[1][1] * wl[1] + I[1][2] * wl[2]) + wl[2] * (I[2][0] * wl[0] + I[2][1] * wl[1] + I[2][2] * wl[2])); }, 0);
  const E = j.limits.engine; let st = rd(), up = P.compute(st, dt), E0 = KE(st) + up.U, Ecur = E0, U0 = up.U;
  const L = { Wpas: 0, Wact: 0, Wext: 0, Dv: 0, Ppas: 0, Pel: 0, engMin: Infinity, rows: [] }; const N = Math.round(seconds * hz), series = [];
  for (let n = 0; n < N; n++) { const t = n * dt, pr = prog(t);
    // passive drives, then the flexion actuator (target = current rotation; PD in the target angular velocity), then the external torque
    P.apply(up); const qa = Q.norm(w.actRotationCS(k)); w.setActTarget(k, qa); const Tq = Q.norm(w.actTarget(k)), sg = qa[0] * Tq[0] + qa[1] * Tq[1] + qa[2] * Tq[2] + qa[3] * Tq[3] > 0 ? 1 : -1, df = Q.mul(Q.conj(qa), Tq.map(x => x * sg)), Cy = -2 * df[iy];
    const a0 = anatK(st), tau0 = Kp * (pr.flex - a0.flex) * R + Kd * (pr.dflex || 0) * R, wv = [0, 0, 0]; wv[iy] = (tau0 + Kp * Cy) / (Kd + dt * Kp); w.setActVel(k, wv);
    const R2F2 = Q.mul(st[shank].rot, j.F2), axTw = Q.rot(R2F2, AX[ix]), Tw = V.sc(axTw, sx * (pr.T || 0)); if (pr.T) w.addTorqueExt(shank, Tw);
    const pre = st, axW = { [k]: [0, 1, 2].map(i => Q.rot(Q.mul(pre[j.childIndex].rot, j.F2), AX[i])), [ankle]: [0, 1, 2].map(i => Q.rot(Q.mul(pre[spec.joints[ankle].childIndex].rot, spec.joints[ankle].F2), AX[i])) };
    w.step(dt, G1_WORLD.coll); st = rd();
    // ledgers (mid-step ω)
    const wm = (n2) => V.sc(V.add(pre[n2].w, st[n2].w), 0.5), wrel = (jj) => V.sub(wm(jj.childIndex), wm(jj.parentIndex));
    let Pp = 0, Pel = 0, Pvi = 0; for (const kk of [k, ankle]) { const jj = spec.joints[kk], lam = w.lambdaMotor(kk), wr = wrel(jj), pj = up.joints[kk], wE = V.sub(st[jj.childIndex].w, st[jj.parentIndex].w), cc = P.jd[kk].c;
      for (let i = 0; i < 3; i++) { const wm_i = V.dot(wr, axW[kk][i]), we_i = V.dot(wE, axW[kk][i]); Pp += (lam[i] / dt) * wm_i; if (P.jd[kk].rows[i]) { Pel += (lam[i] / dt + cc * we_i) * wm_i; Pvi += -cc * we_i * wm_i; } else Pel += (lam[i] / dt) * wm_i; }
      Pp += V.dot(pj.Tw, wr); Pel += V.dot(pj.Tw, wr); }
    const la = w.lambdaAct(k), Pa = (la[iy] / dt) * V.dot(wrel(j), axW[k][iy]), Pe = pr.T ? V.dot(Tw, wm(shank)) : 0, Dv = P.dampingLoss(st, dt);
    // REPORT-ONLY (erratum diagnostics, KNEE_CORRECTION_RESULTS.md): the implicit drive's numerical dissipation Σ dt·K·ω²·dt per row — the
    // encoding λ/dt = K·δ − (c + dt·K)·Jv dissipates dt·K·ω² beyond the viscous c·ω² (always dissipative by design; not in the preregistered ledgers)
    let Di = 0; for (const kk of [k, ankle]) { const jj = spec.joints[kk], pj = up.joints[kk], wr = V.sub(st[jj.childIndex].w, st[jj.parentIndex].w); for (let i = 0; i < 3; i++) { const x = V.dot(wr, axW[kk][i]); Di += dt * (pj.K[i] || 0) * x * x * dt; } }
    L.Wpas += Pp * dt; L.Wact += Pa * dt; L.Wext += Pe * dt; L.Dv += Dv; L.Di = (L.Di || 0) + Di; L.Ppas += Math.abs(Pp) * dt; L.Pel += Math.abs(Pp * dt + Dv);
    L.Wel = (L.Wel || 0) + Pel * dt; L.Wvi = (L.Wvi || 0) + Pvi * dt; L.PelAbs = (L.PelAbs || 0) + Math.abs(Pel) * dt;   // superseding criteria (exact decomposition)
    up = P.compute(st, dt); Ecur = KE(st) + up.U; const a1 = anatK(st), me = Math.min(a1.tw - E.lo[ix], E.hi[ix] - a1.tw) * D; L.engMin = Math.min(L.engMin, me);
    if (n % record === 0 || n === N - 1) series.push({ t: (n + 1) * dt, flex: a1.flex, rot: a1.rot, th0: MODEL === "v2k" ? kneeTheta0(a1.flex) : 0, T: pr.T || 0, flexTgt: pr.flex, E: Ecur, Wpas: L.Wpas, Wact: L.Wact, Wext: L.Wext, Dv: L.Dv, Di: L.Di, U: up.U, Wel: L.Wel, Wvi: L.Wvi, PelAbs: L.PelAbs }); }
  w.destroy();
  return { side, hz, seconds, series, ledger: { ...L, dE: Ecur - E0, dU: up.U - U0, closure: Ecur - E0 - L.Wext - L.Wact + L.Dv, pasConsistency: L.Wpas + (up.U - U0) + L.Dv, pasConsistencyImpl: L.Wpas + (up.U - U0) + L.Dv + L.Di, elResid: L.Wel + (up.U - U0) } };
}
// deliberately bad variants (discrimination tests only): patches ONE PassiveLayer instance inside the rig
function advPatch(P, k, j) { const i = P.kneeRot[k], sx = j.def.axes.x.s;
  if (ADV === "naive") { const oc = P.compute.bind(P), ol = P.kneeLim.bind(P); let frozen = null;   // the knee envelope frozen at the current flexion while the gradient is taken
    P.kneeLim = (kk, ii, qs, which) => { if (frozen && frozen[kk] != null) { const a = P.jd[kk].axes[ii], e = P.kneeEnv(frozen[kk])[which], x = [e[0] * R, e[1] * R]; return a.s > 0 ? x : [-x[1], -x[0]]; } return ol(kk, ii, qs, which); };
    P.compute = (states, dt) => { frozen = {}; for (const kk of Object.keys(P.kneeRot)) { const d = P.jd[kk]; frozen[kk] = P.anat(d, P.qcs(d, states.map(s2 => s2.rot)), "flex"); } const out = oc(states, dt); frozen = null; return out; }; return; }
  const oc = P.compute.bind(P);
  P.compute = (states, dt) => { const out = oc(states, dt), p = out.joints[k], d = P.jd[k], q = out.ev.qs[k], fl = P.anat(d, q, "flex"), rot = P.anat(d, q, "rot"); let extra = 0;
    if (ADV === "inject") extra = 0.5 * p.wi[i];                                   // N·m: +0.5 N·m·s/rad × twist rate — negative damping (an energy source)
    if (ADV === "spring") extra = sx * -0.2 * (rot - kneeTheta0(fl));              // N·m: −0.2 N·m/° × (θ − θ0), with no potential behind it
    p.Texp = p.Texp.slice(); p.Texp[i] += extra; p.Tw = V.add(p.Tw, V.sc(p.axW[i], extra)); return out; }; }
const capOf = () => 0.35 * 78;   // V2-REF spec capacity (0.35 N·m/kg × 78 kg)
const lawInv = (f, T) => { const c = capOf(); let lo = -60, hi = 60; for (let n = 0; n < 90; n++) { const m = (lo + hi) / 2, t = -kneeAxialTorque(f, m, c, c).tau; if (t < T) lo = m; else hi = m; } return (lo + hi) / 2; };   // θ (abs) where the passive torque balances T
const mean = (a) => a.reduce((s, x) => s + x, 0) / a.length;
const kv2b = (tag, r) => { const L = r.ledger, lim = 0.02 + 0.02 * L.Ppas; res.runs[tag] = { ledger: L }; return { ok: Math.abs(L.pasConsistency) <= lim, okImpl: Math.abs(L.pasConsistencyImpl) <= lim && L.pasConsistency <= 1e-9, val: `|W_pas + ΔU + D| ${Math.abs(L.pasConsistency).toExponential(2)} J (signed ${L.pasConsistency.toExponential(2)}; implicit dissipation ${L.Di.toExponential(2)}; + it: ${L.pasConsistencyImpl.toExponential(2)}) (lim ${lim.toFixed(3)})` }; };
const kv2bAll = [];

// ── KV4b: static torque–rotation at held flexion (plant vs the bench law) ──
function kv4b(hz = 240, cases = [["R", 0], ["R", 10], ["R", 20], ["R", 30], ["R", 40], ["R", 90], ["L", 20]]) {
  const steps = [0, 2.5, 5, 10, 0, -2.5, -5, -10], hold = 2, out = [];
  for (const [side, f] of cases) { const r = rig({ side, hz, f0: f, seconds: hold * steps.length + 1, prog: (t) => ({ flex: f, T: t < 1 ? 0 : steps[Math.min(steps.length - 1, Math.floor((t - 1) / hold))] }) });
    kv2bAll.push([`kv4b ${side}${f} ${hz}Hz`, kv2b(`kv4b_${side}${f}_${hz}`, r)]);
    for (let s = 1; s < steps.length; s++) { if (steps[s] === 0) continue; const t1 = 1 + (s + 1) * hold, win = r.series.filter(p => p.t > t1 - 0.5 && p.t <= t1); const fl = mean(win.map(p => p.flex)), th = mean(win.map(p => p.rot));
      const law = MODEL === "v2k" ? lawInv(fl, steps[s]) : NaN; out.push({ side, f, hz, T: steps[s], flexHeld: fl, rot: th, law, err: th - law, flexErr: fl - f }); } }
  return out; }
// ── KV3b: closed flexion cycles under a constant axial torque ──
function kv3b(hz = 240, sets = [[0, 30], [0, 120]], Ts = [0, 5, -5]) { const out = [];
  for (const [fa, fb] of sets) for (const T of Ts) { const per = 2, nc = 5, r = rig({ hz, f0: fa, seconds: per * nc, record: 1, prog: (t) => ({ flex: fa + (fb - fa) * (1 - Math.cos(2 * Math.PI * t / per)) / 2, dflex: (fb - fa) * Math.PI / per * Math.sin(2 * Math.PI * t / per), T }) });
    kv2bAll.push([`kv3b ${fa}-${fb} T${T} ${hz}Hz`, kv2b(`kv3b_${fa}_${fb}_${T}_${hz}`, r)]);
    const cyc = []; for (let c = 1; c < nc; c++) { const a = r.series.filter(p => p.t > c * per && p.t <= (c + 1) * per), p0 = r.series.filter(p => p.t <= c * per).pop(), p1 = a[a.length - 1];
      const Wp = p1.Wpas - p0.Wpas, Dv = p1.Dv - p0.Dv, Wel = Wp + Dv, dE = p1.E - p0.E, close = dE - (p1.Wext - p0.Wext) - (p1.Wact - p0.Wact) + Dv, dev = a.map(p => p.rot - p.th0);
      let Pel = 0; for (let n = 1; n < a.length; n++) Pel += Math.abs((a[n].Wpas - a[n - 1].Wpas) + (a[n].Dv - a[n - 1].Dv)); cyc.push({ c, Wel, Pel, close, closeImpl: close + (p1.Di - p0.Di), WelImpl: Wel + (p1.Di - p0.Di), Di: p1.Di - p0.Di, amp: Math.max(...dev) - Math.min(...dev), Wact: p1.Wact - p0.Wact, Wext: p1.Wext - p0.Wext, Dv,
      WelX: p1.Wel - p0.Wel, PelX: p1.PelAbs - p0.PelAbs, dEphase: c > 1 ? p1.E - p0.E : null }); }
    out.push({ fa, fb, T, hz, cyc }); }
  return out; }
// ── KV6b: passive reference path, axial free ──
function kv6b(hz = 240) { const per = 8, r = rig({ hz, f0: 0, seconds: per, record: 1, prog: (t) => ({ flex: 40 * (1 - Math.cos(2 * Math.PI * t / per)) / 2, dflex: 40 * Math.PI / per * Math.sin(2 * Math.PI * t / per), T: 0 }) });
  kv2bAll.push([`kv6b ${hz}Hz`, kv2b(`kv6b_${hz}`, r)]);
  let worst = 0, at = null; for (const p of r.series) { if (p.t < 0.5) continue; const e = kneeEnvelopeV2K(p.flex), band = (p.rot >= e.theta0 ? KNEE_V2K.IR.slack * e.fIR : KNEE_V2K.ER.slack * e.fER) + 1.0, x = Math.abs(p.rot - e.theta0) - band; if (x > worst) { worst = x; at = { t: p.t, flex: p.flex, rot: p.rot, th0: e.theta0 }; } }
  const pa = r.series.find(p => p.flex >= 0 && p.t >= 0), up30 = r.series.filter(p => p.t < per / 2).find(p => p.flex >= 30), d30 = up30 ? up30.rot - r.series[0].rot : NaN;
  return { hz, worstExcessDeg: worst, at, delta0to30: d30, series: r.series.filter((p, i) => i % 8 === 0) }; }
// ── KV7b: end-stop and emergency stop ──
function kv7b(hz = 240, fl = [0, 30, 90]) { const out = [], cap = capOf();
  for (const f of fl) for (const sgn of [1, -1]) { const r = rig({ hz, f0: f, seconds: 3.5, record: 1, prog: (t) => ({ flex: f, T: sgn * 40 * Math.min(1, t / 2) }) }); kv2bAll.push([`kv7b ${f} ${sgn > 0 ? "+" : "−"} ${hz}Hz`, kv2b(`kv7b_${f}_${sgn}_${hz}`, r)]);
    const pc = r.series.find(p => Math.abs(p.T) >= cap), e = kneeEnvelopeV2K(pc ? pc.flex : f), bound = sgn > 0 ? e.hard[1] : e.hard[0], beyond = pc ? sgn * (pc.rot - bound) : NaN;
    const hold = r.series.filter(p => p.t > 2), close = hold.length ? (hold[hold.length - 1].E - hold[0].E) - (hold[hold.length - 1].Wext - hold[0].Wext) - (hold[hold.length - 1].Wact - hold[0].Wact) + (hold[hold.length - 1].Dv - hold[0].Dv) : NaN;
    out.push({ f, dir: sgn, hz, beyondBoundAtCapDeg: beyond, engMarginMinDeg: r.ledger.engMin, holdClosureJ: close, rotAt40: r.series[r.series.length - 1].rot, bound }); }
  return out; }

const want = (p) => PART === "all" || PART === p;
if (want("kv4b")) { const r4 = kv4b(); res.kv4b = r4; const bad = r4.filter(x => Math.abs(x.err) > Math.max(0.3, 0.03 * Math.abs(x.law - kneeTheta0(x.flexHeld))) || Math.abs(x.flexErr) > 1.5);
  for (const x of r4) console.log(`     KV4b ${x.side} φ ${x.f}° T ${x.T}: held ${x.flexHeld.toFixed(2)}°, rot ${x.rot.toFixed(3)}° vs law ${x.law.toFixed(3)}° (Δ ${x.err.toFixed(3)}°)`);
  chk("KV4b", "plant static rotation vs the bench law at the held flexion; held flexion", bad.length === 0, `${bad.length} / ${r4.length} outside (worst Δ ${Math.max(...r4.map(x => Math.abs(x.err))).toFixed(3)}°, worst flex error ${Math.max(...r4.map(x => Math.abs(x.flexErr))).toFixed(2)}°)`, "max(0.3°, 3 %); flex ≤ 1.5°"); }
if (want("kv3b")) { const r3 = kv3b(); res.kv3b = r3; let bad = []; for (const s of r3) for (const c of s.cyc) { const okW = Math.abs(c.Wel) <= 0.02 + 0.01 * c.Pel, okC = Math.abs(c.close) <= 0.05; if (!okW || !okC) bad.push({ ...s, cyc: undefined, c }); }
  const growth = r3.map(s => { const a = s.cyc.map(c => c.amp); let g = 0; for (let i = 1; i < a.length; i++) g = Math.max(g, a[i] / Math.max(1e-9, a[i - 1]) - 1); return g; }), gmax = Math.max(...growth);
  for (const s of r3) console.log(`     KV3b φ ${s.fa}–${s.fb}° T ${s.T}: per cycle W_el ${s.cyc.map(c => c.Wel.toExponential(1)).join(", ")} J; closure ${s.cyc.map(c => c.close.toExponential(1)).join(", ")} J; [report: implicit dissipation ${s.cyc.map(c => c.Di.toExponential(1)).join(", ")}; closure + it ${s.cyc.map(c => c.closeImpl.toExponential(1)).join(", ")}]; W_act ${s.cyc.map(c => c.Wact.toFixed(3)).join(", ")}; D ${s.cyc.map(c => c.Dv.toFixed(3)).join(", ")}`);
  chk("KV3b", "closed flexion cycles: elastic passive work per cycle; ledger closure; no amplitude growth", bad.length === 0 && gmax <= 0.05, `${bad.length} cycle violations; max amplitude growth ${(100 * gmax).toFixed(2)} %`, "|W_el| ≤ 0.02 J + 1 % ∮|P_el|; |closure| ≤ 0.05 J; growth ≤ 5 %"); }
if (want("kv6b") && MODEL === "v2k") { const r6 = kv6b(); res.kv6b = r6; chk("KV6b", "passive reference path followed with the axial free (0 → 40 → 0°)", r6.worstExcessDeg <= 0 && Math.abs(r6.delta0to30 - 8.6) <= 1.5, `worst excess beyond slack + 1° = ${r6.worstExcessDeg.toFixed(3)}°; axial change 0 → 30° = ${r6.delta0to30.toFixed(2)}°`, "≤ 0; 8.6 ± 1.5°"); }
if (want("kv7b") && MODEL === "v2k") { const r7 = kv7b(); res.kv7b = r7; const bad = r7.filter(x => Math.abs(x.beyondBoundAtCapDeg - KNEE_V2K.endStopDeg) > 0.75 || x.engMarginMinDeg < 0.25 || Math.abs(x.holdClosureJ) > 0.05);
  for (const x of r7) console.log(`     KV7b φ ${x.f}° ${x.dir > 0 ? "internal" : "external"}: at capacity ${x.beyondBoundAtCapDeg.toFixed(2)}° beyond the bound (${x.bound.toFixed(2)}°); at 40 N·m θ ${x.rotAt40.toFixed(2)}°; min engine margin ${x.engMarginMinDeg.toFixed(1)}°; hold closure ${x.holdClosureJ.toExponential(1)} J`);
  chk("KV7b", "end-stop engages at bound + 3°; no Jolt-stop contact; hold closure", bad.length === 0, `${bad.length} / ${r7.length} violations`, "3 ± 0.75°; margin ≥ 0.25°; ≤ 0.05 J"); }
if (want("kv8") && MODEL === "v2k") { const rate = {}; let ok = true; const s4 = {};
  for (const hz of [180, 240, 480]) { const a = kv4b(hz, [["R", 20]]), b = kv3b(hz, [[0, 30]], [5]), c = kv6b(hz), d = kv7b(hz, [30]); s4[hz] = a;
    const okA = a.every(x => Math.abs(x.err) <= Math.max(0.3, 0.03 * Math.abs(x.law - kneeTheta0(x.flexHeld))) && Math.abs(x.flexErr) <= 1.5), okB = b.every(s => s.cyc.every(c2 => Math.abs(c2.Wel) <= 0.02 + 0.01 * c2.Pel && Math.abs(c2.close) <= 0.05));
    const okC = c.worstExcessDeg <= 0 && Math.abs(c.delta0to30 - 8.6) <= 1.5, okD = d.every(x => Math.abs(x.beyondBoundAtCapDeg - KNEE_V2K.endStopDeg) <= 0.75 && x.engMarginMinDeg >= 0.25 && Math.abs(x.holdClosureJ) <= 0.05);
    rate[hz] = { okA, okB, okC, okD, kv6bExcess: c.worstExcessDeg, kv6bDelta: c.delta0to30, kv7b: d }; ok = ok && okA && okB && okC && okD; console.log(`     KV8 ${hz} Hz: KV4b ${okA}, KV3b ${okB}, KV6b ${okC} (Δ0→30 ${c.delta0to30.toFixed(2)}°), KV7b ${okD}`); }
  let spread = 0; for (let i = 0; i < s4[240].length; i++) spread = Math.max(spread, ...[180, 480].map(h => Math.abs(s4[h][i].rot - s4[240][i].rot)));
  res.kv8 = { rate, spreadDeg: spread }; chk("KV8", "180 / 240 / 480 Hz: KV3b, KV4b, KV6b, KV7b criteria hold; KV4b static rotation spread", ok && spread <= 0.3, `all criteria ${ok}; KV4b spread ${spread.toFixed(3)}°`, "all; ≤ 0.3°"); }
// superseding-criteria comparator (close-decisions stage): the OLD knee's multi-rate runs for KV2b′.c (the v2k-only KV6b / KV7b parts excluded)
if (want("kv8") && MODEL === "old" && CRIT === "v2") for (const hz of [180, 240, 480]) { kv4b(hz, [["R", 20]]); kv3b(hz, [[0, 30]], [5]); }
if (kv2bAll.length) { const bad = kv2bAll.filter(([, r]) => !r.ok); for (const [t, r] of kv2bAll) if (!r.ok) console.log(`     KV2b ${t}: ${r.val}`);
  chk("KV2b", "passive work = −ΔU − viscous loss in every rig run", bad.length === 0, `${bad.length} / ${kv2bAll.length} runs outside`, "≤ 0.02 J + 2 % ∫|P_pas|");
  const badI = kv2bAll.filter(([, r]) => !r.okImpl); console.log(`     report (erratum view): with the implicit-drive dissipation added and the strict residual dissipative (≤ 0): ${kv2bAll.length - badI.length} / ${kv2bAll.length} runs within the same limit`); res.kv2bImpl = { n: kv2bAll.length, ok: kv2bAll.length - badI.length }; }
// ── superseding criteria (QUALIFICATION_V2_PREREG.md; evaluated only with --crit=v2; the original criteria above are unchanged) ──
if (CRIT === "v2") { const EPS = 0.02;
  // KV2b′ (a) no elastic creation, (b) viscous part dissipative — every rig run; (c) consistency: the elastic mismatch converges with the timestep
  // (empirical order ≥ 0.5 from 240 → 480 Hz, and monotone 180 → 240 → 480) on the KV8 runs
  const runs = Object.entries(res.runs), bad = [];
  for (const [tag, x] of runs) { const L = x.ledger, a = L.elResid <= EPS + 0.005 * L.PelAbs, b = L.Wvi <= EPS; if (!a || !b) bad.push(`${tag}: W_el + ΔU ${L.elResid.toExponential(2)} J (lim ${(EPS + 0.005 * L.PelAbs).toFixed(3)}), W_visc ${L.Wvi.toExponential(2)} J`); }
  chk("KV2b′.ab", "elastic part creates no energy (W_el + ΔU ≤ 0.02 J + 0.5 % ∫|P_el|); viscous part dissipative (W_visc ≤ 0.02 J) — every rig run", bad.length === 0, bad.length ? bad.slice(0, 4).join(" | ") : `${runs.length} runs`, "all");
  const conv = []; for (const base of ["kv4b_R20", "kv3b_0_30_5", "kv6b", "kv7b_30_1", "kv7b_30_-1"]) { const g = (hz) => res.runs[`${base}_${hz}`] && Math.abs(res.runs[`${base}_${hz}`].ledger.elResid);
    const e180 = g(180), e240 = g(240), e480 = g(480); if (e240 == null || e480 == null) continue; const p = e480 > 0 && e240 > 0 ? Math.log2(e240 / e480) : Infinity, small = e240 <= 0.005;
    conv.push({ base, e180, e240, e480, order: p, ok: small || (p >= 0.5 && (e180 == null || e180 >= e240)) }); }
  res.kv2bConv = conv; for (const c of conv) console.log(`     KV2b′.c ${c.base}: |W_el + ΔU| ${[c.e180, c.e240, c.e480].map(v => v == null ? "—" : v.toExponential(2)).join(" / ")} J at 180 / 240 / 480 Hz → order ${Number.isFinite(c.order) ? c.order.toFixed(2) : "∞"}${c.e240 <= 0.005 ? " (below 5 mJ)" : ""}`);
  chk("KV2b′.c", "consistency: the elastic energy mismatch converges with the timestep (order ≥ 0.5, monotone), or stays below 5 mJ", conv.length > 0 && conv.every(c => c.ok), conv.filter(c => !c.ok).map(c => c.base).join(", ") || `${conv.length} run families`, "all");
  // KV3b′ per cycle: (a) no creation (closure ≤ +0.05 J), (b) no net elastic energy delivered (W_el ≤ +0.02 J + 1 % ∮|P_el|), (c) no pumping (E at the
  // same phase non-increasing within 0.02 J)
  if (res.kv3b) { const v = []; for (const sset of res.kv3b) for (const c of sset.cyc) { if (c.close > 0.05) v.push(`${sset.fa}-${sset.fb} T${sset.T} c${c.c}: closure ${c.close.toFixed(3)}`); if (c.WelX > 0.02 + 0.01 * c.PelX) v.push(`${sset.fa}-${sset.fb} T${sset.T} c${c.c}: W_el ${c.WelX.toFixed(3)}`); if (c.dEphase != null && c.dEphase > 0.02) v.push(`${sset.fa}-${sset.fb} T${sset.T} c${c.c}: ΔE(phase) ${c.dEphase.toFixed(3)}`); }
    chk("KV3b′", "closed cycles: no energy creation (closure ≤ +0.05 J), no net elastic energy per cycle, no pumping (energy at the same phase non-increasing)", v.length === 0, v.length ? v.slice(0, 4).join(" | ") : `${res.kv3b.reduce((a, x) => a + x.cyc.length, 0)} cycles`, "all"); } }
const nf = res.checks.filter(c => !c.pass).length; console.log(`\n${res.checks.length - nf} / ${res.checks.length} rig checks pass`); res.allPass = nf === 0;
if (OUT) fs.writeFileSync(OUT, JSON.stringify(res));
