// ═══ physchar2/tools/loco_probe.mjs — DIAGNOSTIC ONLY: downstream locomotion viability probe (user instruction 2026-10-08, e2/loco_probe/). NOT a qualification, NOT E2.
// Composes EXISTING primitives into repeated alternating steps on one continuing simulation — nothing is reset between steps, nothing is added to the controller:
//   per step k (swing foot alternates): E1b weight transfer (stance share 0.5 → 1, min-jerk over --Ttr, the request through the existing λ channel)
//   → release (the swing foot TOUCHING ≥ --rel s, the E2 protocol's rule) → the E2 commanded step (a FRESH ctrl/v2_step.js StepSequencer per step: decision by the one planner,
//   B1 lift from the measured state, swing, measured-contact acceptance, hand-back, the DCM double-support plan back to the quiet-stance reference) → DONE (λ 0.5) → next step.
// The sequencer is a one-shot scheduler whose per-step fields (airborne seen, accepted, contact times) persist after DONE, so each step gets a new instance; the controller,
// lifecycle and physics continue untouched (the controller never reads the sequencer, only its request fields). Configuration: the most advanced adopted one, PSTAR5CHABV
// (A + B + DVG; e2/DVG2_RESULTS.md). TD2C did not validate, so its touchdown coordinator is NOT used. The tracked-clearance certificate has no validated allowance (SV-2R
// was not entered): it is computed and logged, not enforced (the declared diagnostic `diagNoClearance`, with the smoke placeholder allowance 0/0/0), exactly as the E2 smokes.
// Timing knobs (cadence probe only): --Ttr transfer duration, --rel release dwell, --Tds the commanded double-support plan duration (FS.TdsCmd, design value 4 s), --Tsw swing T.
// The run stops at the first substantive failure: fall (the sim's own definition), supervisor abort, sequencer NO_CERTIFIED / NO_LIFT / ABORTED, foot relocation > 20 mm
// (G2's "relocated"), unload time-out, step time-out, non-finite state.
// ── CF-1 (--cf=1; COUNTERFACTUAL, user approval 2026-10-08, diagnostics/loco_cf1_2026-10-08/): the missing between-steps gait-transfer layer, supplied in this harness
// only (default off; never adopted; no controller / planner / lifecycle / production code touched). Every between-steps transfer (including step 1's) becomes:
//   • DCM path: the existing reference layer's Hermite (ctrl/v2_dcm.js cmdPlan / dcmTick) from the MEASURED DCM and its LIPM rate ω(ξ − p) (the sequencer's own
//     initialisation rule: no CoP step) to the NEW STANCE FOOT's region centroid (centroid2 of the controller's own region polygon, 2-D: staggered or wide stance alike),
//     over the unchanged validated transfer time --Ttr; handed to the unchanged balance law through the existing request fields xiRef / xiRefDot;
//   • load schedule: the existing lamFromVrp rule — the stance share follows the plan's VRP along the line between the feet's region centroids (floor 0), so the
//     load reaches full stance exactly as the DCM plan arrives (coordinated, not timed separately);
//   • planned single support: the supervisor's stance-only abort is suspended while the planned transfer is MOVING (the existing precedent: the E2 sequencer
//     suspends it during its planned DS transfer, holdSupervisor()); it is active again in the release hold and in the step. A shadow copy of the same test records
//     whether the suspension was ever needed ("would-abort").
// After the plan ends the request holds (ξ_ref = the stance centroid, full stance) until the step command; the E2 step itself is unchanged.
// usage: V2_KNEE_MODEL=v2k V2_ANKLE_NEUTRAL_K=0.13 node tools/loco_probe.mjs --human=V2-REF --first=L --steps=2 [--hz=240] [--dx=0.10] [--Ttr=4] [--rel=0.5] [--Tds=4]
//        [--Tsw=0.6] [--apex=0.030] [--kind=forward|lateral] [--dy=0.08] --out=<file.json.gz>
// kind lateral: the E2 preregistered lateral commanded step (0.08 m outward from the anchor), alternating legs — the feet stay side by side, so the existing (lateral) transfer applies
import fs from "fs"; import path from "path"; import zlib from "zlib"; import { fileURLToPath } from "url";
import { loadJolt } from "../core/v2_jolt.js"; import { e2Spec, CFG } from "../gates/v2_e2.js"; import { G3Sim, g3Def } from "../gates/v2_g3.js";
import { StepSequencer } from "../ctrl/v2_step.js"; import { stepFrame, swingFrame, candPose, liftRef } from "../ctrl/v2_footstep.js"; import { stepSegment, stepAt } from "../ctrl/v2_swing.js"; import { cmdPlan, dcmTick, lamFromVrp, centroid2 } from "../ctrl/v2_dcm.js"; import { FS } from "../ctrl/v2_footstep.js"; import { polyDist } from "../ctrl/v2_stand.js";
import { V, Q } from "../core/v2_math.js"; import { decompose } from "../spec/v2_joints.js"; import { kneeEnvelopeV2K } from "../spec/v2_knee.js";
const here = path.dirname(fileURLToPath(import.meta.url)), J = await loadJolt(path.join(here, "../vendor/jolt-physics.wasm-compat.js")), arg = (k, d) => (process.argv.find(a => a.startsWith(`--${k}=`)) || `--${k}=${d}`).split("=").slice(1).join("=");
const HUMAN = arg("human", "V2-REF"), FIRST = arg("first", "L"), STEPS = +arg("steps", 2), HZ = +arg("hz", 240), CONFIG = arg("cfg", "PSTAR5CHABV"), DX = +arg("dx", 0.10), TTR = +arg("Ttr", 4), REL = +arg("rel", 0.5),
  TDS = +arg("Tds", 4.0), TSW = +arg("Tsw", 0.6), APEX = +arg("apex", 0.030), OUT = arg("out", ""), TRACE = +arg("trace", 4), KIND = arg("kind", "forward"), DY = +arg("dy", 0.08), CF = +arg("cf", 0);
if (process.env.V2_KNEE_MODEL !== "v2k" || process.env.V2_ANKLE_NEUTRAL_K !== "0.13") throw new Error("E1a configuration env required");
if (![0, 1].includes(CF) || !["forward", "lateral"].includes(KIND) || !["L", "R"].includes(FIRST) || !CFG[CONFIG] || CONFIG !== "PSTAR5CHABV" || !(STEPS >= 1)) throw new Error("args");
// DIAGNOSTIC settings (logged in the output): certificate logged-not-enforced with the smoke placeholder allowance; the commanded DS duration knob
FS.clearAllow = { rise: 0, apex: 0, descent: 0 }; const TDS0 = FS.TdsCmd; FS.TdsCmd = TDS;
const D = 180 / Math.PI, mj = (u) => { u = Math.min(1, Math.max(0, u)); return u * u * u * (10 - 15 * u + 6 * u * u); };
const seg = (t, a, T, v0, v1) => { const u = Math.min(1, Math.max(0, (t - a) / T)), dv = v1 - v0; return [v0 + dv * mj(u), t > a && t < a + T ? dv * 30 * u * u * (1 - u) * (1 - u) / T : 0, t > a && t < a + T ? dv * 60 * u * (1 - u) * (1 - 2 * u) / (T * T) : 0]; };
const CONTACT = ["TOUCHDOWN", "TOUCHING", "LOAD_ACCEPT", "SUPPORT", "UNLOADING"], swingOf = (k) => (FIRST === "L" ? k % 2 : 1 - (k % 2));   // step k (0-based): 0 = left foot swings
// ── state machine of the composed gait (the commanding layer only) ──
const G = { k: 0, ph: "SETTLE", tPh: 0, seq: null, touchT0: null, fail: null, steps: [], cur: null, stopAt: null };
// λ_R request: σ = the STANCE foot's share; λ_R = σ for a right stance
const lamR = (t) => { const n = swingOf(G.k), stR = n === 0;   // left swing ⇒ right stance
  let v = [0.5, 0, 0]; if (G.ph === "TRANSFER") v = seg(t, G.tPh, TTR, 0.5, 1.0); else if (G.ph === "RELEASE" || G.ph === "STEP") v = [1, 0, 0]; else if (G.ph === "FAILED" && G.lastSig) v = G.lastSig;
  return stR ? v : [1 - v[0], -v[1], -v[2]]; };
const lamFn = (t) => lamFn.d(t)[0]; lamFn.d = lamR;
lamFn.e2 = (t, ctrl) => { const q = G.seq; const sq = q && q.active() && !q.rec ? q.request(t) : null; if (sq) return sq; if (CF && G.cf && (G.ph === "TRANSFER" || G.ph === "RELEASE")) return cfRequest(t, ctrl); const [lam, dl, ddl] = lamR(t); return { lam, dl, ddl }; };
// CF-1 request (counterfactual; see header): the plan's DCM reference and the VRP-coordinated stance share
function cfRequest(t, ctrl) { const I = ctrl.info, F = G.cf, r = dcmTick(F.plan, t, { w: I.w0 }), f = lamFromVrp(I.polys, F.m, r.vrp, 0); F.last = { t, xi: r.xi, xid: r.xid, vrp: r.vrp, f };
  return { lam: F.m === 1 ? f : 1 - f, dl: 0, ddl: 0, xiRef: r.xi, xiRefDot: r.xid }; }
// CF-1: the supervisor hook object during the transfer (planned single support permitted only while the plan moves)
const cfHold = { holdSupervisor: () => G.ph === "TRANSFER", active: () => false, rec: false, request: () => null, recover: () => ({ verdict: "NO_CERTIFIED_ONE_STEP" }) };
const spec = e2Spec(HUMAN), pd = { t0: 1, dur: 2, dz: 0.025 }, n0 = swingOf(0);
const def = { ...g3Def(n0 === 0 ? "U:R" : "U:L"), key: "LOCO", title: "DIAGNOSTIC locomotion viability probe", lam: lamFn, supervise: { e2: { pushEnd: () => null } }, holds: [], seconds: 7 + STEPS * (TTR + REL + TDS + 4) + 12, push: null, torque: null };
const s = new G3Sim(J, spec, def, { stand: { ikRefTwist: true, lifecycle: true, pelvisDrop: pd, ...CFG[CONFIG] }, passiveOpts: { kneeModel: "v2k" }, ...(HZ !== 240 ? { cfg: { hz: HZ } } : {}) });
const C = s.ctrl, dt = s.dt; if (C.o.d1Guard !== 2 || !C.o.vffPelvisAir || !C.o.vffPassiveRef || C.o.e2 !== 2 || !C.o.swingAccFF || C.o.e2td) throw new Error("configuration");
const B = spec.bodies, bi = (nm) => B.findIndex(b => b.name === nm), FT = ["foot_L", "foot_R"].map(bi), PEL = bi("pelvis"), JI = (nm) => spec.joints.findIndex(j => j.name === nm);
const LEG = ["hip_L", "hip_R", "knee_L", "knee_R", "ankle_L", "ankle_R"].map(JI);
const solePts = FT.map(f => B[f].shapes.filter(h => h.type === "hull").flatMap(h => h.points.map(p => V.add(p, h.pos))));
const heading = (q) => { const f = Q.rot(q, [0, 0, 1]); return Math.atan2(f[0], f[2]) * D; }, wrap = (a) => { while (a > 180) a -= 360; while (a < -180) a += 360; return a; };
const tilt = (q) => { const u = Q.rot(q, [0, 1, 0]); return Math.acos(Math.min(1, u[1])) * D; };
const clearMm = (n, st) => Math.min(...solePts[n].map(p => V.add(st[FT[n]].pos, Q.rot(st[FT[n]].rot, p))[1])) * 1000;
const qsOf = (st) => s.P.jd.map(d => s.P.qcs(d, st.map(b => b.rot))), anat = (k, qs, key) => s.P.anat(s.P.jd[k], qs[k], key);
const hardMargin = (k, qs) => { const d = s.P.jd[k], v = decompose(qs[k]), th = [v.tw, v.sy, v.sz]; let m = Infinity;
  d.axes.forEach((a, i) => { if (!a) return; let x; if (a.v2k) { const e = kneeEnvelopeV2K(anat(k, qs, "flex")), r = anat(k, qs, "rot"); x = Math.min(r - e.hard[0], e.hard[1] - r); }
    else { const h = s.P.hardOf(k, i, qs); x = Math.min(th[i] - h[0], h[1] - th[i]) * D; } if (x < m) m = x; }); return m; };
const r4 = (x) => (x == null ? null : Array.isArray(x) ? x.map(r4) : typeof x === "number" ? +x.toFixed(4) : x);
const xz = (p) => [p[0], p[2]], d2 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
let lastCmd = null; const oc = C.compute.bind(C);
C.compute = (st, ev, dtt) => { protocol(C.n * dtt, st); const c = oc(st, ev, dtt); lastCmd = c; return c; };
// fail(): record the first substantive failure, hold the current request (σ, zero rates) and stop 0.25 s later
// the load-split geometry at the failure (read-only): region centroids, ξ / ξ_ref / p*, and p*'s projection on the centroid line (the controller's share rule, G3)
const cen = (P) => { let a = 0, x = 0, y = 0; for (let i = 0; i < P.length; i++) { const [x0, y0] = P[i], [x1, y1] = P[(i + 1) % P.length], c = x0 * y1 - x1 * y0; a += c; x += (x0 + x1) * c; y += (y0 + y1) * c; } return a ? [x / (3 * a), y / (3 * a)] : P[0]; };
function splitGeom() { const I = C.info; if (!I || !I.polys) return null; const cL = cen(I.polys[0]), cR = cen(I.polys[1]), ab = [cL[0] - cR[0], cL[1] - cR[1]], L2 = ab[0] * ab[0] + ab[1] * ab[1], tP = ((I.pRaw[0] - cR[0]) * ab[0] + (I.pRaw[1] - cR[1]) * ab[1]) / L2, tX = ((I.xiRef[0] - cR[0]) * ab[0] + (I.xiRef[1] - cR[1]) * ab[1]) / L2;
  return { centroidL: r4(cL), centroidR: r4(cR), xi: r4(I.xi), xiRef: r4(I.xiRef), pStar: r4(I.pRaw), projLeftShare_pStar: r4(tP), projLeftShare_xiRef: r4(tX), cmdShare: I.share ? r4(I.share) : null, FzBW: r4(C.sense.Fz.map(x => x / (C.M * 9.81))) }; }
function fail(t, why, cls = null) { if (!G.fail) { G.fail = { t, why, step: G.k + 1, phase: G.ph, cls, split: splitGeom() }; G.lastSig = (() => { const v = lamR(t)[0]; return [swingOf(G.k) === 0 ? v : 1 - v, 0, 0]; })(); G.ph = "FAILED"; G.stopAt = t + 0.25; } }
// ── the composed protocol (causal, at each controller tick) ──
function protocol(t, st) { const lc = C.lc; if (G.fail) return; const n = swingOf(G.k), f = lc.feet[n], g = C.g3;
  if (g && g.aborted != null) { fail(t, `supervisor abort (stance-only CoP test) in ${G.ph}`); return; }
  if (G.ph === "SETTLE") { if (t >= 3 - 1e-9) { G.ph = "TRANSFER"; G.tPh = t; newStep(t); } return; }
  if (G.ph === "TRANSFER") { if (t >= G.tPh + TTR - 1e-9) { G.ph = "RELEASE"; G.tPh = t; G.touchT0 = null; } return; }
  if (G.ph === "RELEASE") { if (f.state === "TOUCHING") { if (G.touchT0 == null) G.touchT0 = t; } else G.touchT0 = null;
    if (G.touchT0 != null && t - G.touchT0 >= REL - 1e-9 && C.e2st) { G.ph = "STEP"; G.tPh = t; command(t); return; }
    if (t > G.tPh + 3) fail(t, `unload time-out: the swing foot never TOUCHING ≥ ${REL} s within 3 s (state ${f.state}, share ${(lc.feet[n].s ?? 0).toFixed(3)})`); return; }
  if (G.ph === "STEP") { const q = G.seq;
    if (q.ph === "DONE") { G.cur.doneT = q.doneT; finishStep(t); if (G.k + 1 >= STEPS) { G.ph = "END"; G.stopAt = t + 1.0; return; } G.k++; G.ph = "TRANSFER"; G.tPh = t; newStep(t); return; }
    if (["NOCERT", "NOLIFT", "ABORTED"].includes(q.ph)) { if (q.ph === "NOCERT") G.cur.pathDiag = pathDiag(q); finishStep(t); fail(t, `sequencer ${q.ph}: ${(q.events[q.events.length - 1] || {}).what || ""}`); return; }
    if (t > G.tPh + 15) { finishStep(t); fail(t, `step time-out (sequencer phase ${q.ph})`); } } }
// read-only diagnosis of a refused commanded decision (run ends at the failure): the planner's nominal swing posed exactly as the B1 decision poses it, and the bounded
// leg IK residual at each of its path samples with the planner's SOFT bounds and with the HARD limits (which constraint refuses the path, and where in the swing)
// which bounds of the planner's SOFT box the HARD-limit IK solution exceeds: the bounded IK's six solved coordinates (hip twist / flexion / abduction, knee flexion,
// ankle DF / inversion; ctrl/v2_stand.js legIKBounded) against spec joints[k].limits.soft — degrees beyond the soft bound (read-only)
function softViol(r, n) { const ks = C.legK[n], L = ks.map(k => spec.joints[k].limits.soft), lo = [L[0].lo[0], L[0].lo[1], L[0].lo[2], L[1].lo[1], L[2].lo[1], L[2].lo[2]], hi = [L[0].hi[0], L[0].hi[1], L[0].hi[2], L[1].hi[1], L[2].hi[1], L[2].hi[2]];
  const nm = ["hip.twist", "hip.flex", "hip.abd", "knee.flex", "ankle.df", "ankle.inv"], out = {}; r.x.forEach((v, i) => { const e = v < lo[i] ? v - lo[i] : v > hi[i] ? v - hi[i] : 0; if (Math.abs(e) > 1e-9) out[nm[i]] = +(e * D).toFixed(2); }); return out; }
function pathDiag(q) { const n = q.n, st = C.e2st, ev = C.e2ev, A = q.A, fr = stepFrame(C, st, n), goal = candPose(A, fr, KIND === "lateral" ? 0 : DX, KIND === "lateral" ? DY : 0, 0), L = liftRef(A, FS.liftDelayPlan), pel = swingFrame(C, st, n);
  const sg = stepSegment({ p: L.p, v: L.v, a: L.a, th: [0, 0, 0], w: [0, 0, 0], al: [0, 0, 0] }, goal, TSW, { z: q.apexZ, tk: 0.5 * TSW }), ks = C.legK[n], hip = V.add(pel.pos, Q.rot(pel.rot, C.anchor[ks[0]])), out = [];
  C._e2plan = (C._e2plan || 0) + 1; try { for (let i = 0; i < 11; i++) { const e = stepAt(sg, sg.T * i / 10), pose = { pos: e.pos, rot: e.rot }, rs = C.legIKBounded(st, ev, n, pel.pos, pel.rot, pose, { limits: "soft", fallback: "none" }), rh = C.legIKBounded(st, ev, n, pel.pos, pel.rot, pose, { limits: "hard", fallback: "none" });
    out.push({ i, phi: i / 10, softErr: +rs.err.toExponential(2), hardErr: +rh.err.toExponential(2), softViolHard: rs.err > 1e-6 ? softViol(rh, n) : null, hipToFootM: +V.dist(hip, e.pos).toFixed(4), footRelStance: r4([e.pos[0] - st[C.feet[1 - n]].pos[0], e.pos[1], e.pos[2] - st[C.feet[1 - n]].pos[2]]) }); } } finally { C._e2plan--; }
  return { goalRelStance: r4([goal.pos[0] - st[C.feet[1 - n]].pos[0], goal.pos[2] - st[C.feet[1 - n]].pos[2]]), legLen: +(V.len(C.anchor[ks[1]]) + V.len(C.anchor[ks[2]])).toFixed(4), samples: out }; }
function newStep(t) { const n = swingOf(G.k); G.cur = { k: G.k + 1, swing: "LR"[n], stance: "LR"[1 - n], tTransfer: t, transfer: { xiMarginMin: Infinity, slipMax: [0, 0], xiErrMax: 0, pStanceMinHi: Infinity, wouldAbort: null, shadowOut: 0, trailFzEnd: null }, m: null }; G.steps.push(G.cur);
  if (CF) { const I = C.info, m = 1 - n, rs = centroid2(I.polys[m]); G.cf = { m, rs, plan: cmdPlan({ t0: t, xi0: I.xi, xid0: [I.w0 * (I.xi[0] - I.p[0]), I.w0 * (I.xi[1] - I.p[1])], rs, tTD: t + TTR }), last: null };
    C.e2seq = cfHold; G.cur.transfer.cf = { rs: r4(rs), xi0: r4(I.xi), dist: +(Math.hypot(rs[0] - I.xi[0], rs[1] - I.xi[1])).toFixed(4) }; } }
function command(t) { const n = swingOf(G.k), q = (G.seq = C.e2seq = new StepSequencer(C)), st = s.st, I = C.info, m = 1 - n;
  const R = q.command(t, { n, kind: KIND, nominal: KIND === "lateral" ? { dx: 0, dy: DY, dz: 0 } : { dx: DX, dy: 0, dz: 0 }, T: TSW, apex: APEX, diagNoClearance: true }), c0 = q.calls[0];
  const fwd = Q.rot(st[FT[m]].rot, [0, 0, 1]), fl = Math.hypot(fwd[0], fwd[2]), f = [fwd[0] / fl, fwd[2] / fl], lat = [f[1], -f[0]], rel = (p) => { const d = [p[0] - st[FT[m]].pos[0], p[2] - st[FT[m]].pos[2]]; return [d[0] * f[0] + d[1] * f[1], d[0] * lat[0] + d[1] * lat[1]]; };
  G.cur.cmd = { t: r4(t), verdict: R.verdict, why: R.why || null, dx: c0 ? c0.dx : null, dy: c0 ? c0.dy : null, T: c0 ? c0.T : null, Tr: c0 ? c0.Tr : null, slack: c0 ? c0.slack : null, clearanceCert: c0 && c0.log ? c0.log.clearance || null : null, decisionLog: c0 && R.verdict !== "CERTIFIED_ONE_STEP" ? { log: c0.log || null, top: c0.top || null, cert: c0.cert || null } : null,
    // the state handed to this step (did the previous step leave a viable initial state?): stance-frame geometry, DCM inside the stance region, pelvis, COM velocity
    init: { swingRelStance: r4(rel(st[FT[n]].pos)), xiRelStance: r4(rel([I.xi[0], 0, I.xi[1]])), xiStanceMarginMm: +(polyDist(I.polys[m], I.xi) * 1000).toFixed(2), comV: r4(Math.hypot(I.v[0], I.v[2])),
      pelvisYawRelStance: +wrap(heading(st[PEL].rot) - heading(st[FT[m]].rot)).toFixed(3), feetYawDiff: +wrap(heading(st[FT[n]].rot) - heading(st[FT[m]].rot)).toFixed(3), pelvisTilt: +tilt(st[PEL].rot).toFixed(3),
      pelvisH: +st[PEL].pos[1].toFixed(4), stanceShare: I.share ? +I.share[m].toFixed(4) : null, swingState: C.lc.feet[n].state,
      pelvisYawDrift: pel0.yaw == null ? null : +wrap(heading(st[PEL].rot) - pel0.yaw).toFixed(3), footYawDrift: FT.map((b, j) => +wrap(heading(st[b].rot) - foot0[j].yaw).toFixed(3)),
      pelvisLatFromFeetMid: (() => { const mid = [(st[FT[0]].pos[0] + st[FT[1]].pos[0]) / 2, (st[FT[0]].pos[2] + st[FT[1]].pos[2]) / 2], d = [st[PEL].pos[0] - mid[0], st[PEL].pos[2] - mid[1]]; return +((d[0] * lat[0] + d[1] * lat[1]) * 1000).toFixed(2); })(),
      progress: r4(xz(st[PEL].pos).map((v, j) => v - xz(pel0.pos)[j])), xiErrNow: I.xiRef ? +(d2(I.xi, I.xiRef) * 1000).toFixed(2) : null, comH: +I.c[1].toFixed(4), trailFz: +(C.sense.Fz[n] / (C.M * 9.81)).toFixed(4),
      transfer: G.cur.transfer ? { xiErrMaxMm: +(G.cur.transfer.xiErrMax * 1000).toFixed(2), xiSupMarginMinMm: +(G.cur.transfer.xiMarginMin * 1000).toFixed(2), pStarStanceMarginMinAtHighShareMm: Number.isFinite(G.cur.transfer.pStanceMinHi) ? +(G.cur.transfer.pStanceMinHi * 1000).toFixed(2) : null, wouldAbort: G.cur.transfer.wouldAbort, releaseAfterS: G.cur.transfer.tTouch != null && G.cur.transfer.tRel0 != null ? r4(G.cur.transfer.tTouch - G.cur.transfer.tRel0) : null, cf: G.cur.transfer.cf || null } : null } };
  G.cur.m = { stanceFoot0: { pos: st[FT[m]].pos.slice(), yaw: heading(st[FT[m]].rot) }, swingFoot0: st[FT[n]].pos.slice(), clrMin: Infinity, clrMinWin: Infinity, hMax: -Infinity, trkMax: 0, xiSupMin: Infinity, xiStanceMinSS: Infinity, pOutMax: 0, copOutMax: 0,
    xiErrMax: 0, pelTiltMax: 0, pelHMin: Infinity, hardMin: Infinity, hardWho: null, sat: 0, satWho: {}, dTau0Max: 0, dTau0Who: null, eClosPos: 0, eClosMax: 0, stanceSlip: 0, stanceTilt: 0, stanceYaw: 0, vTD: null, tdPos: null, liftShareMin: 1 }; }
function finishStep(t) { const q = G.seq, c = G.cur, m = c.m, S = q.summary(), st = s.st, n = swingOf(G.k);
  const F = S.Fcmd || S.F; c.seq = { ph: q.ph, tAir: S.tAir, tTDm: S.tTDm, tAcc0: S.tAcc0, handBackT: S.handBackT, doneT: S.doneT, early: S.early, late: S.late, failedTD: S.failedTD, nocertSwing: S.nocertSwing, replans: S.calls.filter(x => /re-plan/.test(x.kind)).length,
    liftoffRecert: (S.calls.find(x => x.kind === "liftoff re-certification") || {}).verdict || null, liftoffRecertWhy: (S.calls.find(x => x.kind === "liftoff re-certification") || {}).why || null, events: S.events.map(e => [r4(e.t), e.what]) };
  const land = st[FT[n]].pos; c.result = { liftoff: S.tAir != null, liftDelay: S.tAir != null ? r4(S.tAir - c.cmd.t) : null, contact: S.tTDm != null, accepted: S.tAcc0 != null, done: q.ph === "DONE",
    phiContact: S.tTDm != null && S.tLo != null ? r4((S.tTDm - S.tLo) / S.T) : null, clearanceMinMm: Number.isFinite(m.clrMin) ? +m.clrMin.toFixed(2) : null, clearanceMinWinMm: Number.isFinite(m.clrMinWin) ? +m.clrMinWin.toFixed(2) : null, apexMm: Number.isFinite(m.hMax) ? +m.hMax.toFixed(2) : null,
    swingTrackMaxMm: +m.trkMax.toFixed(2), tdVel: m.vTD, tdPosErrMm: F && m.tdPos ? +(d2(xz(m.tdPos), xz(F.pos)) * 1000).toFixed(2) : null, finalPosErrMm: F ? +(d2(xz(land), xz(F.pos)) * 1000).toFixed(2) : null,
    stepLenMm: +(d2(xz(land), xz(m.swingFoot0)) * 1000).toFixed(1), stanceSlipMm: +(m.stanceSlip * 1000).toFixed(2), stanceTiltMaxDeg: +m.stanceTilt.toFixed(2), stanceYawDeg: +m.stanceYaw.toFixed(2),
    xiSupportMarginMinMm: +(m.xiSupMin * 1000).toFixed(2), xiStanceMarginMinSSmm: Number.isFinite(m.xiStanceMinSS) ? +(m.xiStanceMinSS * 1000).toFixed(2) : null, pStarOutsideMaxMm: +(m.pOutMax * 1000).toFixed(2), copOutsideMaxMm: +(m.copOutMax * 1000).toFixed(2),
    xiErrMaxMm: +(m.xiErrMax * 1000).toFixed(2), pelvisTiltMaxDeg: +m.pelTiltMax.toFixed(2), pelvisHminM: +m.pelHMin.toFixed(4), legHardMarginMinDeg: +m.hardMin.toFixed(2), legHardWho: m.hardWho, satAxisTicks: m.sat, satWho: m.satWho, dTau0MaxNm: +m.dTau0Max.toFixed(2), dTau0Who: m.dTau0Who,
    energyClosurePosJ: +m.eClosPos.toFixed(4), energyClosureMaxTickJ: +m.eClosMax.toFixed(4), liftShareMin: +m.liftShareMin.toFixed(4),
    tAcceptToSupport: null, doneXiErrMm: q.ph === "DONE" && C.info.qsRef ? +(d2(C.info.xi, C.info.qsRef) * 1000).toFixed(2) : null, doneComV: q.ph === "DONE" ? r4(Math.hypot(C.info.v[0], C.info.v[2])) : null, durStep: r4(t - c.tTransfer) }; G.cur.m = null; }
// ── run ──
let foot0 = null; const trace = [], pel0 = { yaw: null, pos: null }; let prevE = null, prevW = null, prevCmd = null, hashes = {}, footPrev = null;
const t0w = Date.now();
while (true) { if (!s.tick()) break; const t = s.n * dt, st = s.st, I = C.info, lcF = C.lc.feet; if (!I) continue;
  if (pel0.yaw == null && t >= 1) { pel0.yaw = heading(st[PEL].rot); pel0.pos = st[PEL].pos.slice(); foot0 = FT.map(b => ({ yaw: heading(st[b].rot), pos: st[b].pos.slice() })); }
  const fin = st.every(b => b.pos.every(Number.isFinite) && b.rot.every(Number.isFinite)); if (!fin) fail(t, "non-finite body state");
  if (s.g2acc && s.g2acc.fallT != null && !G.fallSeen) { G.fallSeen = s.g2acc.fallT; fail(t, `FELL (sim definition: ${s.g2acc.firstOther ? "non-boot contact " + s.g2acc.firstOther : "COM < 70 % of start height"})`); }
  const L = s.ledger, E = s.last.E, W = L.Wact + L.Wext - L.damping, dClos = prevE == null ? 0 : (E - prevE) - (W - prevW); prevE = E; prevW = W;
  let dC = 0, cWho = null; if (prevCmd && lastCmd) lastCmd.forEach((ax, k) => ax && ax.forEach((r, i) => { const p = prevCmd[k] && prevCmd[k][i]; if (r && p && Math.abs(r.tau0 - p.tau0) > dC) { dC = Math.abs(r.tau0 - p.tau0); cWho = spec.joints[k].name + "." + "xyz"[i]; } })); prevCmd = lastCmd;
  const n = swingOf(G.k), mS = 1 - n, pr = s.probeRows, Jy = pr.map(r => (r ? r.JyN : 0)), JT = Jy[0] + Jy[1];
  const copAll = JT > 1e-6 ? [0, 1].reduce((a, k) => (pr[k] && pr[k].cop ? [a[0] + Jy[k] * pr[k].cop[0] / JT, a[1] + Jy[k] * pr[k].cop[2] / JT] : a), [0, 0]) : null;
  // per-step measurement while a step is active
  if (G.cur && G.cur.m && G.ph === "STEP") { const m = G.cur.m, q = G.seq, sw = lcF[n].state, airborne = q.tAir != null && q.tTDm == null;
    if (q.tAir == null) m.liftShareMin = Math.min(m.liftShareMin, lcF[n].s ?? 1);
    if (airborne) { const c = clearMm(n, st); m.clrMin = Math.min(m.clrMin, c); m.hMax = Math.max(m.hMax, c); const phi = (t - q.tLo) / q.T; if (phi >= 0.2 && phi <= 0.8) m.clrMinWin = Math.min(m.clrMinWin, c);
      const tg = lcF[n].swing; if (tg) m.trkMax = Math.max(m.trkMax, V.len(V.sub(st[FT[n]].pos, tg.pos)) * 1000); }
    if (q.tTDm != null && m.vTD == null) { const v = st[FT[n]].v; m.vTD = { down: +(-v[1]).toFixed(4), horiz: +Math.hypot(v[0], v[2]).toFixed(4) }; m.tdPos = st[FT[n]].pos.slice(); }
    const sf = st[FT[mS]]; m.stanceSlip = Math.max(m.stanceSlip, d2(xz(sf.pos), xz(m.stanceFoot0.pos))); m.stanceTilt = Math.max(m.stanceTilt, tilt(sf.rot)); m.stanceYaw = Math.max(m.stanceYaw, Math.abs(wrap(heading(sf.rot) - m.stanceFoot0.yaw)));
    m.xiSupMin = Math.min(m.xiSupMin, polyDist(I.support, I.xi)); if (airborne) m.xiStanceMinSS = Math.min(m.xiStanceMinSS, polyDist(I.polys[mS], I.xi));
    m.pOutMax = Math.max(m.pOutMax, -polyDist(I.support, I.pRaw)); if (copAll) m.copOutMax = Math.max(m.copOutMax, -polyDist(I.support, copAll));
    if (I.xiRef) m.xiErrMax = Math.max(m.xiErrMax, d2(I.xi, I.xiRef)); m.pelTiltMax = Math.max(m.pelTiltMax, tilt(st[PEL].rot)); m.pelHMin = Math.min(m.pelHMin, st[PEL].pos[1]);
    const qs = qsOf(st); for (const k of LEG) { const h = hardMargin(k, qs); if (h < m.hardMin) { m.hardMin = h; m.hardWho = spec.joints[k].name; } }
    for (const r of s.actRes || []) if (r.sat) { m.sat++; const nm = spec.joints[r.k].name + "." + "xyz"[r.i]; m.satWho[nm] = (m.satWho[nm] || 0) + 1; }
    if (dC > m.dTau0Max) { m.dTau0Max = dC; m.dTau0Who = cWho; } if (dClos > 0) m.eClosPos += dClos; m.eClosMax = Math.max(m.eClosMax, dClos);
    if (m.stanceSlip > 0.02) fail(t, `stance foot relocated ${(m.stanceSlip * 1000).toFixed(1)} mm (> 20 mm, G2 "relocated")`); }
  if (G.cur && (G.ph === "TRANSFER" || G.ph === "RELEASE")) { const x = G.cur.transfer, mS2 = 1 - swingOf(G.k); x.xiMarginMin = Math.min(x.xiMarginMin, polyDist(I.support, I.xi)); if (I.xiRef) x.xiErrMax = Math.max(x.xiErrMax, d2(I.xi, I.xiRef));
    // shadow of the supervisor's stance-only test (gates/v2_g3.js supervised: share ≥ 0.85, p* > 10 mm outside the stance region for 20 ms) — records whether the CF suspension mattered
    const hi = I.lam != null && Math.max(I.lam, 1 - I.lam) >= 0.85, pm = polyDist(I.polys[mS2], I.pRaw); if (hi) { x.pStanceMinHi = Math.min(x.pStanceMinHi, pm); x.shadowOut = pm < -0.01 ? x.shadowOut + dt : 0; if (x.shadowOut >= 0.02 - 1e-9 && !x.wouldAbort) x.wouldAbort = { t: r4(t), phase: G.ph, pStarOutMm: +(-pm * 1000).toFixed(2) }; } else x.shadowOut = 0;
    if (G.ph === "RELEASE" && x.tRel0 == null) x.tRel0 = t; if (lcF[swingOf(G.k)].state === "TOUCHING" && x.tTouch == null) x.tTouch = t; x.trailFzEnd = +(C.sense.Fz[swingOf(G.k)] / (C.M * 9.81)).toFixed(4); }
  if (TRACE > 0 && s.n % TRACE === 0) trace.push([r4(t), G.k + 1, G.ph, G.seq ? G.seq.ph : null, lcF.map(f => f.state), r4(lcF.map(f => f.s)), r4(I.lam), r4(I.xi), r4(I.xiRef), r4(I.pRaw), r4(copAll), r4(I.c), r4(I.v),
    r4(st[PEL].pos), +(pel0.yaw == null ? 0 : wrap(heading(st[PEL].rot) - pel0.yaw)).toFixed(3), +tilt(st[PEL].rot).toFixed(3), r4(st[FT[0]].pos), r4(st[FT[1]].pos), +clearMm(0, st).toFixed(2), +clearMm(1, st).toFixed(2), +(polyDist(I.support, I.xi) * 1000).toFixed(2), +dC.toFixed(2), +dClos.toFixed(5), r4(C.sense.Fz.map(x => x / (C.M * 9.81))), I.share ? r4(I.share) : null, C.sense.touch.slice(), +(polyDist(I.polys[0], I.xi) * 1000).toFixed(2), +(polyDist(I.polys[1], I.xi) * 1000).toFixed(2), +(polyDist(I.polys[0], I.pRaw) * 1000).toFixed(2), +(polyDist(I.polys[1], I.pRaw) * 1000).toFixed(2), I.xiRefDot ? r4(I.xiRefDot) : null]);
  if (s.n % 240 === 0) hashes[String(Math.round(t))] = (s.h >>> 0).toString(16).padStart(8, "0");
  if (G.stopAt != null && t >= G.stopAt - 1e-9) break; }
if (G.cur && G.cur.m && G.seq) finishStep(s.n * dt);
const done = G.steps.filter(x => x.result && x.result.done).length, out = { generated: "tools/loco_probe.mjs", diagnostic: true, note: "DIAGNOSTIC locomotion viability probe — not a qualification; no criterion, mechanism or verdict of E2 is affected",
  run: { human: HUMAN, first: FIRST, steps: STEPS, kind: KIND, cf: CF ? "CF-1 (counterfactual between-steps transfer; diagnostic only)" : null, dy: KIND === "lateral" ? DY : 0, hz: HZ, config: CONFIG, dx: DX, Ttr: TTR, rel: REL, Tds: TDS, TdsDesign: TDS0, Tsw: TSW, apex: APEX, clearance: "computed and logged, not enforced (diagNoClearance; placeholder allowance 0/0/0)" },
  completed: done, fail: G.fail, steps: G.steps, endT: r4(s.n * dt), hashEnd: (s.h >>> 0).toString(16).padStart(8, "0"), hashes, wallS: (Date.now() - t0w) / 1000, mass: C.M,
  traceCols: ["t", "step", "ph", "seq", "states", "shares", "lamR", "xi", "xiRef", "pStar", "cop", "com", "comV", "pelvis", "pelvisYawDrift", "pelvisTilt", "footL", "footR", "clrL", "clrR", "xiSupMarginMm", "dTau0", "dClos", "FzBW", "cmdShare", "touchPieces", "xiMarginL_mm", "xiMarginR_mm", "pStarMarginL_mm", "pStarMarginR_mm", "xiRefDot"], trace };
s.destroy(); if (OUT) fs.writeFileSync(OUT, OUT.endsWith(".gz") ? zlib.gzipSync(JSON.stringify(out)) : JSON.stringify(out));
console.log(`LOCO${CF ? " CF-1" : ""} ${HUMAN} ${KIND} first ${FIRST} [Ttr ${TTR} rel ${REL} Tds ${TDS} Tsw ${TSW}]: ${done}/${STEPS} steps DONE; ${G.fail ? `FAIL step ${G.fail.step} @ ${G.fail.t.toFixed(3)} s (${G.fail.phase}): ${G.fail.why}` : "no failure"}; end ${out.endT} s; wall ${out.wallS.toFixed(0)} s; hash ${out.hashEnd}`);
