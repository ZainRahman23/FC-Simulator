// ═══ physchar2/tools/swing_lag_diag.mjs — DIAGNOSTIC ONLY (sources/2026-10-06_user_decision_lcvff_diagnostic.md): instruments the whole swing-foot command path while the
// unloaded swing foot tracks simple analytic trajectories at hover (constant Cartesian velocity, low-frequency sinusoids, a chirp — reversals included), so that phase delay and
// amplitude ratio can be attributed stage by stage. No controller behaviour is changed (PSTAR5B, D1 off unless --ff=on); the only intervention is the optional FIXED-PELVIS
// mode (--pelvis=fixed: the pelvis body is made kinematic at rest after the lift — a diagnostic rig, never a validated configuration).
// Per paired tick (the command computed at the end of tick n−1 and the physics step of tick n that executes it):
//   reference p / v / a (world) · the swing target (= reference) · IK joint targets (controller's own bounded IK) and their finite-difference joint velocity ω_tfd ·
//   the controller's desired joint velocity ω* (ikW, lcVff) · the Jacobian-ideal joint velocity ω_id from the analytic reference (J_f⁻¹ of the reference velocity relative to the
//   IK frame, mapped to each joint's actuator axes) · gains K, D and the lifecycle weights s, a · command split: statics ff, velocity feed-forward vff, PD = τ0 − ff − vff ·
//   actuator request / limits / activation · the Jolt motor target velocity ω_t = (τ0 + K·C)/(D + dt·K) · the measured actuator torque vs the implicit law τ0 − (D + dt·K)·ω_end ·
//   joint velocity at the step start / end · foot origin velocity (world) and foot / reference motion relative to the pelvis.
// usage: V2_KNEE_MODEL=v2k V2_ANKLE_NEUTRAL_K=0.13 node tools/swing_lag_diag.mjs --human=V2-REF --side=L --hz=240 [--pelvis=floating|fixed] [--ff=off|on] [--liftoff=0|1] --out=<file.json.gz>
import fs from "fs"; import path from "path"; import zlib from "zlib"; import { fileURLToPath } from "url";
import { loadJolt } from "../core/v2_jolt.js"; import { e2Spec, CFG } from "../gates/v2_e2.js"; import { IK } from "../ctrl/v2_stand.js"; import { G3Sim, g3Def } from "../gates/v2_g3.js"; import { V, Q, unitStates } from "../core/v2_math.js";
import { liftRef, stepFrame } from "../ctrl/v2_footstep.js"; import { quintic, qeval } from "../ctrl/v2_swing.js";
const here = path.dirname(fileURLToPath(import.meta.url)), J = await loadJolt(path.join(here, "../vendor/jolt-physics.wasm-compat.js")), arg = (k, d) => (process.argv.find(a => a.startsWith(`--${k}=`)) || `--${k}=${d}`).split("=").slice(1).join("=");
const HUMAN = arg("human", "V2-REF"), SIDE = arg("side", "L"), HZ = +arg("hz", 240), PEL = arg("pelvis", "floating"), FF = arg("ff", "off"), LIFTOFF = arg("liftoff", "0") === "1", OUT = arg("out", "");
// --vff=undamped: COUNTERFACTUAL diagnostic only — the controller's own one-step IK-rate estimate (legIKRate) evaluated with the solver's terminal damping IK.muMin instead of the
// validated IK.mu0 (harness-level wrapper of that one function; the IK solve itself and everything else unchanged). Default "lin" = the validated configuration.
// (The existing lcVff "linmin" variant is NOT this test: it blends μ by the airborne weight, so airborne it equals "lin".)
// --vff=sr: the CORRECTED rate (vffRate "sr", configurations PSTAR5BS / PSTAR5CS; e2/VFF_RATE_CORRECTION.md) — a controller option, not a harness wrapper
const VFF = arg("vff", "lin"); if (!["lin", "undamped", "sr"].includes(VFF)) throw new Error("vff");
const nL = SIDE === "L" ? 0 : 1, nS = 1 - nL, HOV = 0.020, TWO_PI = 2 * Math.PI;
const mj = (u) => { u = Math.min(1, Math.max(0, u)); return u * u * u * (10 - 15 * u + 6 * u * u); }, mjd = (u) => (u <= 0 || u >= 1 ? 0 : 30 * u * u * (1 - u) * (1 - u)), mjdd = (u) => (u <= 0 || u >= 1 ? 0 : 60 * u - 180 * u * u + 120 * u * u * u);
// ── diagnostic trajectories: displacement d(τ) along a unit direction (forward f / outward o / up), returned as { s, sd, sdd } (m, m/s, m/s²) ──
function constVel(v, Tc, Tr) { const D = v * (Tc + Tr), T = Tc + 2 * Tr;   // min-jerk-like ramps: acceleration ramp Tr, constant velocity Tc, deceleration Tr
  const f = (t) => { if (t <= 0) return [0, 0, 0]; if (t < Tr) { const u = t / Tr; return [v * Tr * (u ** 3 - 0.5 * u ** 4), v * (3 * u * u - 2 * u ** 3), v * (6 * u - 6 * u * u) / Tr]; }
    if (t < Tr + Tc) return [v * Tr / 2 + v * (t - Tr), v, 0]; if (t < T) { const [s, sd, sdd] = f(T - t); return [D - s, sd, -sdd]; } return [D, 0, 0]; }; return { f, T, D }; }
function sine(F, A, cycles) { const T = cycles / F, Te = 1 / F;   // raised-cosine envelope over the first and last cycle
  const env = (t) => (t < Te ? 0.5 - 0.5 * Math.cos(Math.PI * t / Te) : t > T - Te ? 0.5 - 0.5 * Math.cos(Math.PI * (T - t) / Te) : 1), envd = (t) => (t < Te ? 0.5 * Math.PI / Te * Math.sin(Math.PI * t / Te) : t > T - Te ? -0.5 * Math.PI / Te * Math.sin(Math.PI * (T - t) / Te) : 0);
  const envdd = (t) => (t < Te ? 0.5 * (Math.PI / Te) ** 2 * Math.cos(Math.PI * t / Te) : t > T - Te ? -0.5 * (Math.PI / Te) ** 2 * Math.cos(Math.PI * (T - t) / Te) : 0), w = TWO_PI * F;
  const f = (t) => { if (t <= 0 || t >= T) return [0, 0, 0]; const s0 = A * Math.sin(w * t), s1 = A * w * Math.cos(w * t), s2 = -A * w * w * Math.sin(w * t), e = env(t), e1 = envd(t), e2 = envdd(t); return [e * s0, e1 * s0 + e * s1, e2 * s0 + 2 * e1 * s1 + e * s2]; }; return { f, T, F, A, Te }; }
function chirp(F0, F1, A, T) { const k = (F1 - F0) / T, Te = 0.5, env = (t) => (t < Te ? mj(t / Te) : t > T - Te ? mj((T - t) / Te) : 1);
  const f = (t) => { if (t <= 0 || t >= T) return [0, 0, 0]; const h = 1e-4, g = (x) => env(x) * A * Math.sin(TWO_PI * (F0 * x + 0.5 * k * x * x)); return [g(t), (g(t + h) - g(t - h)) / (2 * h), (g(t + h) - 2 * g(t) + g(t - h)) / (h * h)]; }; return { f, T }; }
const TRAJ = [ { id: "CV-F", dir: "f", ...constVel(0.10, 0.6, 0.15) }, { id: "CV-Fb", dir: "f", back: true, ...constVel(0.10, 0.6, 0.15) }, { id: "CV-Z", dir: "z", ...constVel(0.05, 0.4, 0.1) }, { id: "CV-Zb", dir: "z", back: true, ...constVel(0.05, 0.4, 0.1) },
  { id: "CV-O", dir: "o", ...constVel(0.08, 0.5, 0.12) }, { id: "CV-Ob", dir: "o", back: true, ...constVel(0.08, 0.5, 0.12) }, { id: "S1-F", dir: "f", ...sine(1, 0.015, 5) }, { id: "S2-Z", dir: "z", ...sine(2, 0.008, 8) },
  { id: "S1-O", dir: "o", ...sine(1, 0.012, 5) }, { id: "S3-F", dir: "f", ...sine(3, 0.005, 9) }, { id: "CH-F", dir: "f", ...chirp(0.5, 3, 0.008, 5) } ];
const HOLD = 0.4;
const sig = (t) => (t <= 3 ? [0.5, 0, 0] : t < 7 ? (() => { const u = (t - 3) / 4; return [0.5 + 0.5 * mj(u), 0.5 * mjd(u) / 4, 0.5 * mjdd(u) / 16]; })() : [1.0, 0, 0]);
const lamFn = (t) => lamFn.d(t)[0]; lamFn.d = (t) => { const [v, d1, d2] = sig(t); return nS === 1 ? [v, d1, d2] : [1 - v, -d1, -d2]; };
const spec = e2Spec(HUMAN), pd = { t0: 1, dur: 2, dz: 0.025 }, def = { ...g3Def(nS === 1 ? "U:R" : "U:L"), key: "LAGDIAG", title: "swing lag diagnostic", lam: lamFn, supervise: {}, holds: [], seconds: 60, push: null, torque: null };
const s = new G3Sim(J, spec, def, { stand: { ikRefTwist: true, lifecycle: true, pelvisDrop: pd, ...CFG[(FF === "on" ? "PSTAR5C" : "PSTAR5B") + (VFF === "sr" ? "S" : "")] }, passiveOpts: { kneeModel: "v2k" }, ...(HZ !== 240 ? { cfg: { hz: HZ } } : {}) });
const C = s.ctrl, dt = s.dt, B = spec.bodies, PELVIS = C.pelvis, FTn = C.feet[nL], legK = C.legK[nL];
if (VFF === "undamped") { const orate = C.legIKRate.bind(C); C.legIKRate = (st, ev, n, pP, qP, fp, sol, now, mu) => orate(st, ev, n, pP, qP, fp, sol, now, IK.muMin); }
const H = { tCmd: null, touchT0: null, tLo: null, A: null, fr: null, k: -1, t0: null, hold: null, base: null, done: false, ref: null, tEnd: null };
const setT = (p, v, a) => { const e = { pos: p, rot: H.A.rot, vel: v, acc: a, w: [0, 0, 0], al: [0, 0, 0] }; C.lc.setSwingTarget(nL, { pos: e.pos, rot: e.rot }); if (!C.swingRef) C.swingRef = [null, null]; C.swingRef[nL] = { vel: v.slice(), acc: a.slice(), w: [0, 0, 0], al: [0, 0, 0] }; H.ref = e; };
const dirVec = (d) => (d === "f" ? H.fr.f : d === "o" ? H.fr.o : [0, 1, 0]);
// LIFTOFF variant: at the measured AIRBORNE the first move (CV-F) starts from the measured foot state (B1 re-anchoring), the vertical blended to hover height over 0.5 s
let ikCap = null; const ob = C.legIKBounded.bind(C); C.legIKBounded = (...a) => { const r = ob(...a); if (!C._e2plan && a[2] === nL && a[5]) ikCap = { r, pP: a[3].slice(), qP: a[4].slice(), tgt: { pos: a[5].pos.slice(), rot: a[5].rot.slice() } }; return r; };
let appliedPlan = null; const oa = s.act.apply.bind(s.act); s.act.apply = (plan) => { const p = plan || s.act.plan; oa(plan); appliedPlan = p; };
let capThis = null, capPrev = null;   // compute-time capture of this tick (executed by the NEXT physics step) and the one awaiting pairing
const oc = C.compute.bind(C);
C.compute = (st, ev, dtt) => { const tc = C.n * dtt, lc = C.lc, f = lc.feet[nL];
  if (!H.done) {
    if (H.tCmd == null) { if (f.state === "TOUCHING") { if (H.touchT0 == null) H.touchT0 = tc; } else H.touchT0 = null;
      if (tc >= 7 - 1e-9 && H.touchT0 != null && tc - H.touchT0 >= 0.5 - 1e-9) { H.tCmd = tc; const a = lc.target(nL); H.A = { pos: a.pos.slice(), rot: a.rot.slice() }; H.fr = stepFrame(C, st, nL); } }
    if (H.tCmd != null && H.k < 0) { const tau = tc - H.tCmd, L = liftRef(H.A, Math.min(tau, 0.6));
      if (LIFTOFF && f.state === "AIRBORNE" && H.tLo == null) { H.tLo = tc; const b = st[FTn], vb = V.add(b.v, V.cross(b.w, V.sub(b.pos, b.com))); H.base = [b.pos[0], H.A.pos[1] + HOV, b.pos[2]];
        H.vq = quintic(b.pos[1], vb[1], L.a[1], H.A.pos[1] + HOV, 0, 0, 0.4); H.k = 0; H.t0 = tc; C.e2reanchor = nL; }   // vertical: quintic from the measured state to hover height in 0.4 s
      else if (!LIFTOFF && tau >= 0.6 + 0.5) { H.base = [H.A.pos[0], H.A.pos[1] + HOV, H.A.pos[2]]; H.k = 0; H.t0 = tc; if (PEL === "fixed") { s.w.setKinematic(PELVIS); s.w.setVel(PELVIS, [0, 0, 0], [0, 0, 0]); H.fixedAt = tc; } }
      else setT(L.p, L.v, L.a); }
    if (H.k >= 0 && H.k < TRAJ.length) { const tr = TRAJ[H.k], u = tc - H.t0, d = dirVec(tr.dir), sgn = tr.back ? -1 : 1, [sv, svd, svdd] = tr.f(Math.min(u, tr.T)), back0 = tr.back ? TRAJ[H.k - 1].D : 0;
      const off = sgn * sv + (tr.back ? back0 : 0), p = V.add(H.base, V.sc(d, off)), v = V.sc(d, u < tr.T ? sgn * svd : 0), a = V.sc(d, u < tr.T ? sgn * svdd : 0);
      if (LIFTOFF && H.k === 0 && H.vq) { const z = qeval(H.vq, Math.min(u, 0.4)); p[1] = z[0]; v[1] = u < 0.4 ? z[1] : 0; a[1] = u < 0.4 ? z[2] : 0; }
      setT(p, v, a);
      if (u >= tr.T + HOLD - 1e-9) { if (!tr.back) H.base = V.add(H.base, V.sc(d, 0)); H.k++; H.t0 = tc; if (H.k >= TRAJ.length) { H.done = true; H.tEnd = tc + 0.2; } } } }
  ikCap = null; const cmd = oc(st, ev, dtt); s._cmd = cmd;
  // capture the command-side stages for this tick (executed by the NEXT physics step)
  if (H.k >= 0 && H.k < TRAJ.length && !H.done && ikCap && H.ref) { const tr = TRAJ[H.k], stU = unitStates(st), pel = stU[PELVIS], b = stU[FTn], vO = V.add(b.v, V.cross(b.w, V.sub(b.pos, b.com)));
    const joints = legK.map(k => { const d = s.P.jd.find(q => q.k === k), R2 = Q.mul(stU[d.child].rot, d.F2), axW = [[1, 0, 0], [0, 1, 0], [0, 0, 1]].map(e => Q.rot(R2, e)), wr = V.sub(stU[d.child].w, stU[d.parent].w);
      const tg = (ikCap.r.targets.find(x => x[0] === k) || [null, null])[1], c = cmd[k]; return { k, axW, w0: axW.map(a => V.dot(wr, a)), tgt: tg ? tg.slice() : null, ikW: C.ikW && C.ikW[k] ? C.ikW[k].slice() : null,
        rows: [0, 1, 2].map(i => (c && c[i] ? { K: c[i].K, D: c[i].D, tau0: c[i].tau0, ff: c[i].ff, vff: c[i].vff ?? 0 } : null)) }; });
    // Jacobian-ideal joint velocity: the reference velocity relative to the IK frame (pelvis pose; the frame's own motion = the pelvis body motion) → J_f⁻¹ → joint axes
    let wid = null; try { const ch = C.legChain(stU, ev, nL, ikCap.pP, ikCap.qP, null), x = ikCap.r.x, kin = (y) => ch.pose(y), K0 = kin(x), eps = 1e-6;
      const angVel = (Ra, Rb, h) => { let q = Q.mul(Ra, Q.conj(Rb)); if (q[3] < 0) q = q.map(v => -v); return [2 * q[0] / h, 2 * q[1] / h, 2 * q[2] / h]; };
      const cols = [0, 1, 2, 3, 4, 5].map(j => { const e = [0, 0, 0, 0, 0, 0]; e[j] = eps; const kp = kin(x.map((v, i) => v + e[i])), km = kin(x.map((v, i) => v - e[i])); return { pf: V.sc(V.sub(kp.p[2], km.p[2]), 1 / (2 * eps)), w: [0, 1, 2].map(q => angVel(kp.R[q], km.R[q], 2 * eps)) }; });
      const Jf = [0, 1, 2, 3, 4, 5].map(r => [0, 1, 2, 3, 4, 5].map(j => (r < 3 ? cols[j].pf[r] : cols[j].w[2][r - 3]))), rel = V.sub(H.ref.pos, pel.pos), vrel = V.sub(V.sub(H.ref.vel, pel.v), V.cross(pel.w, rel)), wrel = V.sub([0, 0, 0], pel.w);
      const sol = (() => { const n = 6, a = Jf.map((r, i) => [...r, [...vrel, ...wrel][i]]); for (let c = 0; c < n; c++) { let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(a[r][c]) > Math.abs(a[p][c])) p = r; [a[c], a[p]] = [a[p], a[c]]; for (let r = 0; r < n; r++) if (r !== c) { const fct = a[r][c] / a[c][c]; for (let q = c; q <= n; q++) a[r][q] -= fct * a[c][q]; } } return a.map((r, i) => r[n] / r[i]); })();
      const wseg = [0, 1, 2].map(q => cols.reduce((acc, col, j) => V.add(acc, V.sc(col.w[q], sol[j])), [0, 0, 0])), wJ = [wseg[0], V.sub(wseg[1], wseg[0]), V.sub(wseg[2], wseg[1])];
      wid = joints.map((jt, idx) => jt.axW.map(a => V.dot(wJ[idx], a))); } catch (e) { wid = null; }
    capThis = ({ tc, k: H.k, id: tr.id, u: tc - H.t0, T: tr.T, ref: { p: H.ref.pos.slice(), v: H.ref.vel.slice(), a: H.ref.acc.slice() }, foot: { p: b.pos.slice(), v: vO }, pel: { p: pel.pos.slice(), rot: pel.rot.slice(), v: pel.v.slice(), w: pel.w.slice() },
      s: C.lc.feet[nL].s, a: C.lc.feet[nL].a, state: C.lc.feet[nL].state, joints, wid }); }
  return cmd; };
const rows = []; let lastStep = null;
while (true) { if (!s.tick()) break; const t = s.n * dt, st = unitStates(s.st);
  // pair: the capture made at the end of the PREVIOUS tick is the command this step executed
  const c = capPrev; capPrev = capThis; capThis = null;
  if (c && appliedPlan) { const tau = {}; for (const r of s.actRes || []) tau[r.k * 3 + r.i] = { tau: r.tau, a: r.a };
    for (const jt of c.joints) { const p = appliedPlan.joints.find(q => q.k === jt.k), d = s.P.jd.find(q => q.k === jt.k), wr1 = V.sub(st[d.child].w, st[d.parent].w);
      jt.w1 = jt.axW.map(a => V.dot(wr1, a)); jt.act = [0, 1, 2].map(i => { const r = p && p.rows[i]; if (!r || r.off) return null; const T = tau[jt.k * 3 + i];
        return { req: r.req, lo: r.lo, hi: r.hi, wStart: r.w, C: p.C ? p.C[i] : null, wt: p.C ? (r.tau0 + r.K * p.C[i]) / (r.D + dt * r.K) : null, tau: T ? T.tau : null, law: r.tau0 - (r.D + dt * r.K) * jt.w1[i], act: T ? T.a : null }; }); }
    const b = st[FTn]; c.footEnd = { p: b.pos.slice(), v: V.add(b.v, V.cross(b.w, V.sub(b.pos, b.com))) }; c.t = +t.toFixed(6); rows.push(c); }
  if (H.tEnd != null && t >= H.tEnd - 1e-9) break; if (t > 60) break; }
const g = s.g3summary(), out = { generated: "tools/swing_lag_diag.mjs", human: HUMAN, side: SIDE, swing: nL, hz: HZ, pelvis: PEL, ff: FF, liftoff: LIFTOFF, vff: VFF, dt, traj: TRAJ.map(tr => ({ id: tr.id, dir: tr.dir, T: tr.T, back: !!tr.back, F: tr.F ?? null, A: tr.A ?? null, Te: tr.Te ?? null })),
  legJoints: legK.map(k => ({ k, name: spec.joints[k].name, axes: s.P.jd.find(q => q.k === k).axes.map(a => (a ? a.key : null)) })), gains: legK.map(k => ({ k, swing: C.gainSwing[k], stance: C.gain[k] })),
  events: { tCmd: H.tCmd, tLo: H.tLo, fixedAt: H.fixedAt ?? null }, authorityWrites: s.ledger.authorityWrites, outcome: g.outcome, rows };
s.destroy(); if (OUT) fs.writeFileSync(OUT, zlib.gzipSync(JSON.stringify(out)));
console.log(`lag diag ${HUMAN} ${SIDE} ${HZ} Hz pelvis ${PEL} FF ${FF} vff ${VFF}${LIFTOFF ? " liftoff" : ""}: rows ${rows.length}; outcome ${g.outcome}; authority writes ${s.ledger.authorityWrites}`);
