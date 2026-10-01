// ═══ physchar/pc_loco.js — G1a: THE LOCOMOTION CONTROLLER (composition of L1–L4 for one character) ═════════════════════════════════════
// LOCOMOTION_ARCHITECTURE_FINAL.md §3. One call per control step:
//   truth (the undelayed sensed state) → L3 gait / support state (truth: bookkeeping, never a reaction)
//   feedback view (delayFb) → step execution + the balance controller (C1's CoP law, gravity Jᵀ, hip strategy, feet-in-place — reused)
//   planning view (delayPlan) → the viability monitor's decisions (step or not, release or not)
//   → the actuator arbiter (one envelope per joint axis; style requests at P3 yield first) → targets + motor settings for Jolt
// Delays (approved as PROVISIONAL experimental defaults, swept 0–250 ms): feedback 50 ms, planning 120 ms. They apply only to what a layer
// OBSERVES — never to contact, joint transmission or the motors' current impedance (the mechanical layer is immediate).
import { V, Q, datan2, dsin, dcos } from "./pc_math.js";
import { BalanceController, controllerProfile } from "./pc_balance.js";
import { CorrectiveStepper } from "./pc_step.js";
import { ActuatorArbiter, ownerOf } from "./pc_act.js";
import { GaitState } from "./pc_gait.js";
import { LocoPlanner } from "./pc_plan.js";
import { poseTargets, idlePose, inPlaceWalkParams, refPose } from "./pc_ref.js";
import { fk, minjerk } from "./pc_control.js";
import { SupportSequencer, SUP } from "./pc_support.js";

export const LOCO = { delayFb: 0.05, delayPlan: 0.12, styleW: 0.2, styleJoints: ["lumbar", "thoracic", "neck", "shoulder_L", "shoulder_R", "elbow_L", "elbow_R"] };
const logmap = (q) => { let x = q[3] < 0 ? q.map(v => -v) : q; const s = Math.sqrt(x[0] * x[0] + x[1] * x[1] + x[2] * x[2]); if (s < 1e-12) return [0, 0, 0]; const a = 2 * Math.atan2(s, x[3]); return [x[0] / s * a, x[1] / s * a, x[2] / s * a]; };

export class LocoController {
  // opts: { delayFb, delayPlan, ctrl (extra controller options), step (C3 toolbox options), requests (C2 placements), transfer, rhythm,
  //         style: false | "idle" | { targets: {jointName: { y, z } | { a } (degrees)}, w, at, until } (a synthetic style request, S8), naive, task }
  constructor(spec, P, opts, hz) {
    this.spec = spec; this.P = P; this.opts = opts || {}; this.hz = hz || 240;
    // G2a (opts.human): the human IN-PLACE gait — the gait reference (of_loco WALK, in place) drives the trunk / neck / arm posture (P3 style),
    // the planned pelvis posture and the swing foot's path; the heading is the intended one (see pc_balance headingIntent)
    // (the reference's stance fraction is the rhythm's own: a step of Tss swing + Tds double support, two steps per cycle)
    const rh = this.opts.rhythm, stF = rh && rh.Tss && rh.Tds ? 1 - rh.Tss / (2 * (rh.Tss + rh.Tds)) : undefined;
    const H = this.opts.human ? { P: inPlaceWalkParams(Object.assign(stF != null ? { stance: stF } : {}, this.opts.human.over || {})), styleJoints: ["lumbar", "thoracic", "neck", "shoulder_L", "shoulder_R", "elbow_L", "elbow_R"], arms: this.opts.human.arms !== false, trunk: this.opts.human.trunk === undefined ? "stabilize" : this.opts.human.trunk, styleVel: this.opts.human.styleVel } : null;
    this.human = H; if (H) this.opts.headingIntent = this.opts.headingIntent ?? true;
    this.ctrl = new BalanceController(spec, P, Object.assign({ strength: "candidate" }, controllerProfile(spec), { expose: true, monitor: true, swingMovingBase: true, replantActual: true },
      H ? { styleNominal: true, pelvisStyle: true, settleAxes: true } : {}, this.opts.headingIntent ? { headingIntent: true } : {}, this.opts.ctrl || {}));
    this.tool = new CorrectiveStepper(spec, P, this.ctrl, this.opts.step || {});                 // a TOOLBOX (candidates, 2-step plan, swing); its update() is never run
    const seq = this.opts.requests ? new SupportSequencer(spec, P, this.ctrl, this.opts.requests) : null;
    this.planner = new LocoPlanner(spec, P, this.ctrl, this.tool, { seq, transfer: this.opts.transfer, rhythm: this.opts.rhythm, timedLead: this.opts.timedLead });
    this.gait = new GaitState(spec); this.arb = new ActuatorArbiter(spec, { ledger: this.opts.ledger !== false, styleHold: !!H });
    if (H) { this.planner.exec.refSwing = (R, t, o, noVel) => this._refSwingAt(R, t, o, noVel); const jp = (n) => spec.joints.find(j => j.name === n);
      H.shin = V.dist(jp("knee_L").at, jp("ankle_L").at); H.styleIdx = new Set(H.styleJoints.map(n => spec.joints.findIndex(j => j.name === n)));
      H.kIdle = (idlePose() ? idlePose().shin_L[0] : 7) * Math.PI / 180; }
    this.dFb = this.opts.delayFb ?? LOCO.delayFb; this.dPl = this.opts.delayPlan ?? LOCO.delayPlan; this.buf = []; this.obstructedAt = { L: null, R: null }; this.lastR = [0, 0]; this.nStep = 0;
    // (runD / D6Diag compatibility: the executor seen through C3's stepper fields; this controller has no latched refusal)
    const self = this; this.stepper = { get stage() { const R = self.planner.exec.R; return R ? R.stage : null; }, get R() { return self.planner.exec.R || null; },
      get done() { const d = self.planner.exec.done; return d && d.length ? d[d.length - 1] : null; }, refused: null, get log() { return [...self.planner.log, ...self.planner.exec.log].sort((a, b) => a.t - b.t); } };
    // style (P3): the of_loco IDLE pose on the upper body (G1a), or a synthetic request (the S8 saturation test)
    this.styleT = null; if (this.human) { /* G2a: the style IS the posture (styleNominal), not an offset */ }
    else if (this.opts.style === "idle" && idlePose()) this.styleT = { targets: poseTargets(spec, idlePose(), this.opts.styleJoints || LOCO.styleJoints), w: this.opts.styleW ?? LOCO.styleW, module: "style(of_loco IDLE)" };
    else if (this.opts.style && this.opts.style.targets) { const T = {}; spec.joints.forEach((j, k) => { const p = this.opts.style.targets[j.name]; if (!p) return; const d = Math.PI / 180;
        T[k] = j.type === "hinge" ? p.a * d : Q.norm(Q.mul(Q.norm([0, Math.tan((p.y || 0) * d / 2), Math.tan((p.z || 0) * d / 2), 1]), [0, 0, 0, 1])); });
      this.styleT = { targets: T, w: this.opts.style.w ?? 1, at: this.opts.style.at ?? 0, until: this.opts.style.until ?? 1e9, module: this.opts.style.module || "style(test)" }; } }
  _swingFF(o, R, u) { const spec = this.spec, ctrl = this.ctrl, Lg = ctrl.legs[R.sw], S = o.states, hip = S[Lg.thigh].pos, Rp = S[0].rot, fz = Q.rot(Rp, [0, 0, 1]), pole = V.norm([fz[0], 0, fz[2]]), h = 1 / 120, t = o.t, B = spec.bodies;
    const ex = this.planner.exec, pose = (tt) => { const tg = ex._timedAt(R, tt, undefined, true), ik = ctrl._legIK(Lg, hip, tg.pos, pole); return [{ i: Lg.thigh, pos: hip, rot: ik.Rt }, { i: Lg.shin, pos: ik.pKnee, rot: ik.Rs }, { i: Lg.foot, pos: tg.pos, rot: tg.rot }]; };
    const A = pose(t - h), Bp = pose(t), C = pose(t + h), com = (X) => V.add(X.pos, Q.rot(X.rot, B[X.i].com)), wOf = (X, Y) => Q.rot(X.rot, logmap(Q.mul(Q.conj(X.rot), Y.rot))).map(v => v / h);
    const acc = [0, 1, 2].map(n => { const b = B[Bp[n].i], a = V.sc(V.add(V.sub(com(C[n]), V.sc(com(Bp[n]), 2)), com(A[n])), 1 / (h * h)), al = V.sc(V.sub(wOf(Bp[n], C[n]), wOf(A[n], Bp[n])), 1 / h), Ra = Bp[n].rot, al_b = Q.rot(Q.conj(Ra), al);
      return { c: com(Bp[n]), F: V.sc(a, b.mass), Ia: Q.rot(Ra, [b.inertia[0] * al_b[0], b.inertia[1] * al_b[1], b.inertia[2] * al_b[2]]) }; });
    const at = [hip, Bp[1].pos, Bp[2].pos], joints = [Lg.hip, Lg.knee, Lg.ankle], out = [];
    joints.forEach((k, jn) => { let tau = [0, 0, 0]; for (let n = jn; n < 3; n++) tau = V.add(tau, V.add(V.cross(V.sub(acc[n].c, at[jn]), acc[n].F), acc[n].Ia)); const j = spec.joints[k], Rc = S[j.childIndex].rot, kp = u.motor[k].kp;
      tau = V.sc(tau, this.opts.swingFFGain ?? 1); const off = j.type === "hinge" ? V.dot(tau, Q.rot(Rc, j.axis)) / kp : V.sc(Q.rot(Q.conj(Q.fromAxes(j.X, j.Y, j.Z)), Q.rot(Q.conj(Rc), tau)), 1 / kp); out.push({ k, module: "swing ID feed-forward", cls: "P1", off }); });
    return out; }
  // ── G2a: the reference phase from MEASURED progress (the feedback view): the executor's swing progress, the double support since the last
  // actual touchdown; RIGHT contact u = 0, LEFT u = 0.5 (of_loco's convention). The blend wGait brings the gait pose in during the first
  // double support and out after the last touchdown — the reference never runs on a free clock of its own.
  _refPhase(o, tq) { const P = this.human.P, S = P.stance, ds = S - 0.5, swf = 1 - S, r = this.planner.rhythm, R = this.planner.exec.R, t = tq ?? o.t, sm = (x) => x * x * (3 - 2 * x);
    let u = this.refU, w = this.refW ?? 0; if (u == null) u = r && r.steps && r.steps[0] && r.steps[0].sw === "L" ? 0 : 0.5;
    // (the swing's reference phase starts when the physical foot leaves its toe pivot — the same progress the swing path uses: during the pivot
    // the reference holds at its toe-off; run from the step's start, the arms' counter-swing led the leg by the pivot's 90 ms)
    if (R && R.kind === "rhythmic" && R.human && ["SWING", "DESCEND", "OBSTRUCTED"].includes(R.stage)) { const wA = R.wA ?? 0.2; u = (R.sw === "R" ? S : S - 0.5) + swf * Math.min(1, Math.max(0, ((t - R.tSw0) / R.T - wA) / (1 - wA))); w = 1; }
    else if (r && r.stage === "DS") { const next = r.steps[r.i], T = r.first ? (r.Tfirst || 0.5) : !next ? (r.Tlast || 0.6) : (r.Tds || 0.2), p = Math.min(1, Math.max(0, (t - r.tDs) / T));
      if (r.first) { u = (next && next.sw === "L" ? 0 : 0.5) + ds * p; w = sm(p); } else { u = (r.lastLanded === "R" ? 0 : 0.5) + ds * p; w = next ? 1 : 1 - sm(p); } }
    else if (r && r.stage === "DONE") w = 0;
    u = ((u % 1) + 1) % 1; if (tq == null) { this.refU = u; this.refW = w; } return { u, w }; }
  // the style posture, the planned pelvis posture and the full reference pose (for the overlay) at the measured phase
  _humanStyle(o) { const H = this.human, ph = this._refPhase(o), styled = (u, w) => { const pose = refPose(H.P, u, w); if (!H.arms) { for (const n of ["upperArm_L", "upperArm_R", "foreArm_L", "foreArm_R"]) pose[n] = idlePose()[n]; }
      if (!H.trunk) { pose.spine = [pose.spine[0], 0, pose.spine[2]]; pose.chest = [pose.chest[0], 0, pose.chest[2]]; }
      else if (H.trunk === "stabilize" && tw != null) { pose.spine = [pose.spine[0], tw * 0.5, pose.spine[2]]; pose.chest = [pose.chest[0], tw * 0.5, pose.chest[2]]; } return pose; };
    // TRUNK COUNTER-ROTATION in place = THORAX STABILISATION (H.trunk "stabilize"): the thorax counter-rotates against the pelvis's STEP-TO-STEP
    // yaw oscillation — lumbar + thoracic twist = −(pelvis yaw − its own low-passed heading, τ = 0.6 s ≈ one stride), within ±10° — so the chest
    // keeps its heading while the pelvis rotates beneath it with the legs. The walk's feed-forward thorax twist compensates a stride's pelvis
    // rotation; in place the arms already cancel the legs' momentum and that twist added its own (G2a attribution). (Stabilising against the
    // INTENDED heading instead was positive feedback in a turn: the lagging pelvis was twisted further away and he spun.)
    let tw = null; if (H.trunk === "stabilize") { const f = Q.rot(o.states[0].rot, [0, 0, 1]), yp = datan2(f[0], f[2]), wr = (a) => Math.atan2(Math.sin(a), Math.cos(a));
      if (this.pelLP == null || this.pelLPt == null) { this.pelLP = yp; this.pelLPt = o.t; } const dt = Math.max(0, o.t - this.pelLPt); this.pelLPt = o.t; this.pelLP = wr(this.pelLP + wr(yp - this.pelLP) * Math.min(1, dt / 0.6));
      tw = Math.max(-10, Math.min(10, -wr(yp - this.pelLP) * 180 / Math.PI)); }
    const pose = styled(ph.u, ph.w), sn = poseTargets(this.spec, pose, H.styleJoints); this.ctrl.styleNominal = sn;
    // the style's own VELOCITY (the reference advanced by the same measured-phase law 1/60 s ahead): the joint damping then resists deviation
    // from the intended motion, not the motion — with a zero target velocity the shoulder's damping cancelled its drive and the arm swing
    // lagged ≈ 100 ms (G2a finding; the C2 principle for the legs)
    if (H.styleVel !== false) { const h = 1 / 60, ph2 = this._refPhase(o, o.t + h), sn2 = poseTargets(this.spec, styled(ph2.u, ph2.w), H.styleJoints); this.styleVel = {};
      for (const k in sn) { const a = sn[k], b = sn2[k]; if (typeof a === "number") this.styleVel[k] = (b - a) / h; else { let d = Q.mul(Q.conj(a), b); if (d[3] < 0) d = d.map(x => -x); this.styleVel[k] = [2 * d[0] / h, 2 * d[1] / h, 2 * d[2] / h]; } } }
    // pelvis: the reference's yaw and roll; the height lowers with the SUPPORTING leg's knee bend (stance, before its late-stance heel rise)
    let dy = 0; for (const s of ["L", "R"]) { const lg = pose._legs && pose._legs[s]; if (!lg || !lg.st || lg.s > 0.62) continue; const k = pose["shin_" + s][0] * Math.PI / 180; dy = Math.min(dy, H.shin * (dcos(k) - dcos(H.kIdle))); }
    const d2r = Math.PI / 180; this.ctrl.pelvisStyle = { yaw: pose.pelvis[1] * d2r, roll: pose.pelvis[2] * d2r, dy: dy * ph.w };
    return { u: ph.u, w: ph.w, T: poseTargets(this.spec, pose) }; }
  // ── G2a: the HUMAN SWING — the foot's target pose over the step (R.T), in three parts:
  //   1. toe pivot (w < wA): the unloaded foot rolls onto its toe (heel rise to the reference's toe-off plantar-flexion) — the toe stays put;
  //   2. the reference swing-leg motion (hip / knee / ankle of the in-place WALK cycle, applied from the ACTUAL pelvis by forward kinematics):
  //      the knee lifts, the ankle dorsiflexes, the leg comes back under the hip;
  //   3. blended from mid-swing onto the PLANNED foothold, contacting forefoot-first at the reference's contact pitch (the heel then lowers
  //      under the stance leg's level-foot demand and the landing compliance).
  // A clearance guard keeps the lowest sole point off the turf until the landing blend. The planner still owns the foothold and timing.
  _refSwingAt(R, t, o, noVel) { const H = this.human, spec = this.spec, g = this.planner.exec.geo, fi = g.foot[R.sw], box = g.box, P = H.P, wA = R.wA ?? 0.2, S0 = o.states[0], d2r = Math.PI / 180;
    const yawOfQ = (q) => { const f = Q.rot(q, [0, 0, 1]); return datan2(f[0], f[2]); }, footRot = (yaw, rho) => Q.norm(Q.mul(Q.axis([0, 1, 0], yaw), Q.axis([1, 0, 0], -rho)));
    if (!R.hs) { const toeL = [box.pos[0], box.pos[1] - box.he[1], box.pos[2] + box.he[2]], fz0 = Q.rot(R.q0, [0, 0, 1]); R.hs = { toeL, toe0: V.add(R.p0, Q.rot(R.q0, toeL)), yaw0: yawOfQ(R.q0), rho0: Math.min(0, datan2(fz0[1], Math.hypot(fz0[0], fz0[2]))), rhoTO: P.toeOffHeelH != null ? -Math.asin(P.toeOffHeelH / (2 * box.he[2])) : -P.ankleTO * d2r, rhoL: P.landHeelH != null ? -Math.asin(P.landHeelH / (2 * box.he[2])) : (-P.kneeStance + P.ankleHS) * d2r }; }
    const Hs = R.hs, pivot = (ww) => { const rho = Hs.rho0 + (Hs.rhoTO - Hs.rho0) * minjerk(Math.min(1, ww / wA)), rot = footRot(Hs.yaw0, rho); return { pos: V.sub(Hs.toe0, Q.rot(rot, Hs.toeL)), rho }; };
    // (in place the reference's hip flexes with the knee — pc_ref inPlaceAdapt)
    const legPose = (x) => { const uc = (R.sw === "R" ? P.stance : P.stance - 0.5) + (1 - P.stance) * x, pose = refPose(P, uc, 1);
      const tg = poseTargets(spec, pose, ["hip_" + R.sw, "knee_" + R.sw, "ankle_" + R.sw]), Tt = this.P.N.T.slice();
      for (const k in tg) Tt[+k] = tg[k]; const B = fk(spec, S0.pos, S0.rot, Tt)[fi], fz = Q.rot(B.rot, [0, 0, 1]); return { pos: B.pos, rho: datan2(fz[1], Math.hypot(fz[0], fz[2])) }; };
    // (the landing pose's toe is PRESSED landPress below the turf surface: the leg is still extending when the foot arrives, so contact is
    // made with a small downward velocity and loads at once, as a human foot does — a target arriving at the surface at rest kissed the turf
    // at zero load and left the foot hovering above it)
    const landing = () => { const a = g._ankleFromCenter(R.landC, R.yawT), flat = [a[0], g.yFlat + SUP.touchDepth - (P.landPress || 0), a[1]], rotF = footRot(R.yawT, 0), toeF = V.add(flat, Q.rot(rotF, Hs.toeL)), rotL = footRot(R.yawT, Hs.rhoL); return { pos: V.sub(toeF, Q.rot(rotL, Hs.toeL)), rho: Hs.rhoL }; };
    // The path is C¹ by construction (the swing's inverse-dynamics feed-forward differentiates it twice): the toe pivot hands over to the
    // reference-leg path across a blend window (the reference continues smoothly into its own late stance before the hand-over), and the
    // clearance correction uses smooth minimum / softplus forms rather than switches.
    const sp = (x, k) => x > 20 * k ? x : k * Math.log1p(Math.exp(x / k)), dB = 0.06;
    const at = (tt) => { const w = Math.max(0, Math.min(1, (tt - R.tSw0) / R.T)), sg = minjerk((w - wA + dB) / (2 * dB)), A = pivot(w);
      if (sg <= 0) return { pos: A.pos, rho: A.rho, yaw: Hs.yaw0, w };
      const wp = (w - wA) / (1 - wA), wq = Math.max(0, wp); if (!Hs.d0) { const a = pivot(wA), b = legPose(0); Hs.d0 = { pos: V.sub(a.pos, b.pos), rho: a.rho - b.rho }; }
      if (Hs.cacheO !== o) { Hs.cacheO = o; Hs.f1 = legPose(1); } const f = legPose(wp), f1 = Hs.f1, land = landing();
      // (the offset between the actual foot at toe-off and the reference leg's foot, d0 — up to ~10 cm: the reference leg hangs under its hip,
      // the V1.1 stance is splayed — is carried along and absorbed by the landing blend over the last 75 % of the swing, not faded early)
      const b = minjerk(Math.max(0, Math.min(1, (wp - 0.25) / 0.75)));
      let pos = V.add(V.add(f.pos, Hs.d0.pos), V.sc(V.sub(land.pos, V.add(f1.pos, Hs.d0.pos)), b)), rho = f.rho + Hs.d0.rho + b * (land.rho - f1.rho - Hs.d0.rho); const yaw = Hs.yaw0 + (R.yawT - Hs.yaw0) * minjerk(wq);
      if (sg < 1) { pos = V.add(V.sc(A.pos, 1 - sg), V.sc(pos, sg)); rho = A.rho + (rho - A.rho) * sg; }
      const G = minjerk(Math.min(1, wq / 0.12)) * (1 - minjerk(Math.max(0, Math.min(1, (wp - 0.6) / 0.35))));
      if (G > 0) { const yg = g.yFlat + SUP.touchDepth + box.pos[1] - box.he[1], m = 0.035 * minjerk(Math.min(1, wq / 0.12)) * (1 - minjerk(Math.max(0, Math.min(1, (wp - 0.5) / 0.4)))), kS = 0.004;
        const lowAt = (r0) => { const rot = footRot(yaw, r0); let e = 0; for (const sx of [-1, 1]) for (const sz of [-1, 1]) e += Math.exp(-(pos[1] + Q.rot(rot, [box.pos[0] + sx * box.he[0], box.pos[1] - box.he[1], box.pos[2] + sz * box.he[2]])[1] - yg) / kS); return yg - kS * Math.log(e); };
        const dMax = 10 * d2r; rho += G * dMax * (1 - Math.exp(-sp(yg + m - lowAt(rho), 0.003) / (dMax * 0.25)));
        pos = [pos[0], pos[1] + G * sp(yg + m - lowAt(rho), 0.003), pos[2]]; }
      return { pos, rho, yaw, w }; };
    const c = at(t), out = { pos: c.pos, rot: footRot(c.yaw, c.rho), u: c.w, reach: landing().pos, rho: c.rho };
    if (!noVel) { const h = 1 / 240, a = at(t - h), b = at(t + h); out.vel = c.w < 1 ? V.sc(V.sub(b.pos, a.pos), 1 / (2 * h)) : [0, 0, 0]; }
    return out; }
  // the delayed view: the observation `d` seconds old (the first observation until the buffer is that deep)
  view(d) { const k = Math.round(d * this.hz); return this.buf[Math.max(0, this.buf.length - 1 - k)]; }
  // truth: this step's sensed observation; x: { dt, qCur(k), n }
  control(truth, x) {
    this.nStep++; this.buf.push(truth);
    // (G2a) the INTENDED heading: set once from both planted feet (their mean forward direction) unless given; the balance controller's desired
    // pelvis heading follows it instead of the instantaneous stance foot (opts.headingIntent). A future turn = changing this value.
    if (this.opts.headingIntent && this.heading0 == null) { if (this.opts.heading != null) this.heading0 = this.opts.heading; else { const fw = ["foot_L", "foot_R"].map(n => Q.rot(truth.states[this.spec.bodies.findIndex(b => b.name === n)].rot, [0, 0, 1])); this.heading0 = datan2(fw[0][0] + fw[1][0], fw[0][2] + fw[1][2]); } }
    if (this.opts.headingIntent) this.ctrl.headingIntent = this.heading0 + this.planner.turnAt(truth.t);   // (an intended turn: the planner's heading offset) const keep = Math.round(Math.max(this.dFb, this.dPl) * this.hz) + 2; if (this.buf.length > keep) this.buf.shift();
    const oFb = this.view(this.dFb), oPl = this.view(this.dPl);
    // L3: gait / support state from the truth (the planner's current intent, overridden by contact)
    const g = this.gait.update(truth, this.planner.intent(truth)); for (const e of g.events) if (e.kind === "OBSTRUCTION" && this.obstructedAt[e.foot] == null) this.obstructedAt[e.foot] = e.t;
    for (const s of ["L", "R"]) if (this.obstructedAt[s] != null && !(this.planner.exec.R && this.planner.exec.R.sw === s)) this.obstructedAt[s] = null;
    // L4 + execution
    this.planner.exec.dFb = this.dFb;
    const pr = this.planner.update(oFb, oPl, { obstructedAt: { ...this.obstructedAt } }, x.dt, this.lastR);
    // L2: the balance controller on the feedback view
    const hs = this.human ? this._humanStyle(oFb) : null;
    this.ctrl.plan = pr.plan; const u = this.ctrl.update(oFb); if (u.debug && u.debug.r) this.lastR = u.debug.r;
    if (hs && this.styleVel && !u.parts.released) { if (!u.vel) u.vel = this.spec.joints.map(j => j.type === "hinge" ? 0 : [0, 0, 0]); for (const k in this.styleVel) u.vel[k] = this.styleVel[k]; }
    // P3 style requests: a preference toward the reference pose, as an equilibrium-point offset w·(reference ⊖ posture target)
    const extra = []; if (this.styleT && truth.t >= (this.styleT.at || 0) && truth.t < (this.styleT.until ?? 1e9)) for (const [ks, tg] of Object.entries(this.styleT.targets)) { const k = +ks, j = this.spec.joints[k];
      const off = j.type === "hinge" ? this.styleT.w * (tg - u.parts.nominal[k]) : V.sc(logmap(Q.mul(Q.conj(u.parts.nominal[k]), tg)), this.styleT.w); extra.push({ k, module: this.styleT.module, cls: "P3", off }); }
    if (this.opts.task) for (const e of this.opts.task(truth.t, u)) extra.push(e);                   // (S9: a P2 task program)
    // P1 swing feed-forward: the inverse dynamics of the planned TIMED swing (Newton–Euler over thigh, shank, foot about each leg joint) —
    // the inertial torque an equilibrium-point spring otherwise only produces after an error has built up (G1a finding: a 0.4 s in-place
    // swing lagged 3 cm on the way up and overshot 7 cm forward on the way down, unsaturated, with every foothold landing forward / outward)
    const R = this.planner.exec.R; if (R && R.timed && (R.stage === "SWING" || R.stage === "DESCEND") && !this.opts.noSwingFF) for (const e of this._swingFF(oFb, R, u)) extra.push(e);
    // L1: the arbiter (the controller's own frames for its feed-forward torques; the CURRENT joint state for the predicted spring / damping)
    const own0 = ownerOf(this.spec, u.parts), owner = this.human ? (k) => { const o0 = own0(k); return this.human.styleIdx.has(k) && o0.cls === "P0" && o0.module === "posture" ? { module: "style(of_loco WALK, in place)", cls: "P3" } : o0; } : own0;
    const a = this.arb.step({ u, S: oFb.states, qCur: x.qCur, owner, extra, dt: x.dt, naive: !!this.opts.naive });
    const motor = u.motor.map((m, k) => ({ ...m, kp: a.motor[k].kp, kd: a.motor[k].kd }));
    return { final: a.final, vel: a.vel, motor, limits: a.limits, cls: u.cls, debug: u.debug, nominal: u.nominal, gOff: u.gOff, bOff: u.bOff, parts: u.parts, arb: a, gait: g, monitor: pr.monitor, plan: pr.plan, views: { fb: oFb.t, pl: oPl.t }, ref: hs }; }
}
