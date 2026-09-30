// ═══ physchar/pc_loco.js — G1a: THE LOCOMOTION CONTROLLER (composition of L1–L4 for one character) ═════════════════════════════════════
// LOCOMOTION_ARCHITECTURE_FINAL.md §3. One call per control step:
//   truth (the undelayed sensed state) → L3 gait / support state (truth: bookkeeping, never a reaction)
//   feedback view (delayFb) → step execution + the balance controller (C1's CoP law, gravity Jᵀ, hip strategy, feet-in-place — reused)
//   planning view (delayPlan) → the viability monitor's decisions (step or not, release or not)
//   → the actuator arbiter (one envelope per joint axis; style requests at P3 yield first) → targets + motor settings for Jolt
// Delays (approved as PROVISIONAL experimental defaults, swept 0–250 ms): feedback 50 ms, planning 120 ms. They apply only to what a layer
// OBSERVES — never to contact, joint transmission or the motors' current impedance (the mechanical layer is immediate).
import { V, Q } from "./pc_math.js";
import { BalanceController, controllerProfile } from "./pc_balance.js";
import { CorrectiveStepper } from "./pc_step.js";
import { ActuatorArbiter, ownerOf } from "./pc_act.js";
import { GaitState } from "./pc_gait.js";
import { LocoPlanner } from "./pc_plan.js";
import { poseTargets, idlePose } from "./pc_ref.js";
import { SupportSequencer } from "./pc_support.js";

export const LOCO = { delayFb: 0.05, delayPlan: 0.12, styleW: 0.2, styleJoints: ["lumbar", "thoracic", "neck", "shoulder_L", "shoulder_R", "elbow_L", "elbow_R"] };
const logmap = (q) => { let x = q[3] < 0 ? q.map(v => -v) : q; const s = Math.sqrt(x[0] * x[0] + x[1] * x[1] + x[2] * x[2]); if (s < 1e-12) return [0, 0, 0]; const a = 2 * Math.atan2(s, x[3]); return [x[0] / s * a, x[1] / s * a, x[2] / s * a]; };

export class LocoController {
  // opts: { delayFb, delayPlan, ctrl (extra controller options), step (C3 toolbox options), requests (C2 placements), transfer, rhythm,
  //         style: false | "idle" | { targets: {jointName: { y, z } | { a } (degrees)}, w, at, until } (a synthetic style request, S8), naive, task }
  constructor(spec, P, opts, hz) {
    this.spec = spec; this.P = P; this.opts = opts || {}; this.hz = hz || 240;
    this.ctrl = new BalanceController(spec, P, Object.assign({ strength: "candidate" }, controllerProfile(spec), { expose: true, monitor: true, swingMovingBase: true, replantActual: true }, this.opts.ctrl || {}));
    this.tool = new CorrectiveStepper(spec, P, this.ctrl, this.opts.step || {});                 // a TOOLBOX (candidates, 2-step plan, swing); its update() is never run
    const seq = this.opts.requests ? new SupportSequencer(spec, P, this.ctrl, this.opts.requests) : null;
    this.planner = new LocoPlanner(spec, P, this.ctrl, this.tool, { seq, transfer: this.opts.transfer, rhythm: this.opts.rhythm, timedLead: this.opts.timedLead });
    this.gait = new GaitState(spec); this.arb = new ActuatorArbiter(spec, { ledger: this.opts.ledger !== false });
    this.dFb = this.opts.delayFb ?? LOCO.delayFb; this.dPl = this.opts.delayPlan ?? LOCO.delayPlan; this.buf = []; this.obstructedAt = { L: null, R: null }; this.lastR = [0, 0]; this.nStep = 0;
    // (runD / D6Diag compatibility: the executor seen through C3's stepper fields; this controller has no latched refusal)
    const self = this; this.stepper = { get stage() { const R = self.planner.exec.R; return R ? R.stage : null; }, get R() { return self.planner.exec.R || null; },
      get done() { const d = self.planner.exec.done; return d && d.length ? d[d.length - 1] : null; }, refused: null, get log() { return [...self.planner.log, ...self.planner.exec.log].sort((a, b) => a.t - b.t); } };
    // style (P3): the of_loco IDLE pose on the upper body (G1a), or a synthetic request (the S8 saturation test)
    this.styleT = null; if (this.opts.style === "idle" && idlePose()) this.styleT = { targets: poseTargets(spec, idlePose(), this.opts.styleJoints || LOCO.styleJoints), w: this.opts.styleW ?? LOCO.styleW, module: "style(of_loco IDLE)" };
    else if (this.opts.style && this.opts.style.targets) { const T = {}; spec.joints.forEach((j, k) => { const p = this.opts.style.targets[j.name]; if (!p) return; const d = Math.PI / 180;
        T[k] = j.type === "hinge" ? p.a * d : Q.norm(Q.mul(Q.norm([0, Math.tan((p.y || 0) * d / 2), Math.tan((p.z || 0) * d / 2), 1]), [0, 0, 0, 1])); });
      this.styleT = { targets: T, w: this.opts.style.w ?? 1, at: this.opts.style.at ?? 0, until: this.opts.style.until ?? 1e9, module: this.opts.style.module || "style(test)" }; } }
  _swingFF(o, R, u) { const spec = this.spec, ctrl = this.ctrl, Lg = ctrl.legs[R.sw], S = o.states, hip = S[Lg.thigh].pos, Rp = S[0].rot, fz = Q.rot(Rp, [0, 0, 1]), pole = V.norm([fz[0], 0, fz[2]]), h = 1 / 120, t = o.t, B = spec.bodies;
    const ex = this.planner.exec, pose = (tt) => { const tg = ex._timedAt(R, tt), ik = ctrl._legIK(Lg, hip, tg.pos, pole); return [{ i: Lg.thigh, pos: hip, rot: ik.Rt }, { i: Lg.shin, pos: ik.pKnee, rot: ik.Rs }, { i: Lg.foot, pos: tg.pos, rot: tg.rot }]; };
    const A = pose(t - h), Bp = pose(t), C = pose(t + h), com = (X) => V.add(X.pos, Q.rot(X.rot, B[X.i].com)), wOf = (X, Y) => Q.rot(X.rot, logmap(Q.mul(Q.conj(X.rot), Y.rot))).map(v => v / h);
    const acc = [0, 1, 2].map(n => { const b = B[Bp[n].i], a = V.sc(V.add(V.sub(com(C[n]), V.sc(com(Bp[n]), 2)), com(A[n])), 1 / (h * h)), al = V.sc(V.sub(wOf(Bp[n], C[n]), wOf(A[n], Bp[n])), 1 / h), Ra = Bp[n].rot, al_b = Q.rot(Q.conj(Ra), al);
      return { c: com(Bp[n]), F: V.sc(a, b.mass), Ia: Q.rot(Ra, [b.inertia[0] * al_b[0], b.inertia[1] * al_b[1], b.inertia[2] * al_b[2]]) }; });
    const at = [hip, Bp[1].pos, Bp[2].pos], joints = [Lg.hip, Lg.knee, Lg.ankle], out = [];
    joints.forEach((k, jn) => { let tau = [0, 0, 0]; for (let n = jn; n < 3; n++) tau = V.add(tau, V.add(V.cross(V.sub(acc[n].c, at[jn]), acc[n].F), acc[n].Ia)); const j = spec.joints[k], Rc = S[j.childIndex].rot, kp = u.motor[k].kp;
      tau = V.sc(tau, this.opts.swingFFGain ?? 1); const off = j.type === "hinge" ? V.dot(tau, Q.rot(Rc, j.axis)) / kp : V.sc(Q.rot(Q.conj(Q.fromAxes(j.X, j.Y, j.Z)), Q.rot(Q.conj(Rc), tau)), 1 / kp); out.push({ k, module: "swing ID feed-forward", cls: "P1", off }); });
    return out; }
  // the delayed view: the observation `d` seconds old (the first observation until the buffer is that deep)
  view(d) { const k = Math.round(d * this.hz); return this.buf[Math.max(0, this.buf.length - 1 - k)]; }
  // truth: this step's sensed observation; x: { dt, qCur(k), n }
  control(truth, x) {
    this.nStep++; this.buf.push(truth); const keep = Math.round(Math.max(this.dFb, this.dPl) * this.hz) + 2; if (this.buf.length > keep) this.buf.shift();
    const oFb = this.view(this.dFb), oPl = this.view(this.dPl);
    // L3: gait / support state from the truth (the planner's current intent, overridden by contact)
    const g = this.gait.update(truth, this.planner.intent(truth)); for (const e of g.events) if (e.kind === "OBSTRUCTION" && this.obstructedAt[e.foot] == null) this.obstructedAt[e.foot] = e.t;
    for (const s of ["L", "R"]) if (this.obstructedAt[s] != null && !(this.planner.exec.R && this.planner.exec.R.sw === s)) this.obstructedAt[s] = null;
    // L4 + execution
    this.planner.exec.dFb = this.dFb;
    const pr = this.planner.update(oFb, oPl, { obstructedAt: { ...this.obstructedAt } }, x.dt, this.lastR);
    // L2: the balance controller on the feedback view
    this.ctrl.plan = pr.plan; const u = this.ctrl.update(oFb); if (u.debug && u.debug.r) this.lastR = u.debug.r;
    // P3 style requests: a preference toward the reference pose, as an equilibrium-point offset w·(reference ⊖ posture target)
    const extra = []; if (this.styleT && truth.t >= (this.styleT.at || 0) && truth.t < (this.styleT.until ?? 1e9)) for (const [ks, tg] of Object.entries(this.styleT.targets)) { const k = +ks, j = this.spec.joints[k];
      const off = j.type === "hinge" ? this.styleT.w * (tg - u.parts.nominal[k]) : V.sc(logmap(Q.mul(Q.conj(u.parts.nominal[k]), tg)), this.styleT.w); extra.push({ k, module: this.styleT.module, cls: "P3", off }); }
    if (this.opts.task) for (const e of this.opts.task(truth.t, u)) extra.push(e);                   // (S9: a P2 task program)
    // P1 swing feed-forward: the inverse dynamics of the planned TIMED swing (Newton–Euler over thigh, shank, foot about each leg joint) —
    // the inertial torque an equilibrium-point spring otherwise only produces after an error has built up (G1a finding: a 0.4 s in-place
    // swing lagged 3 cm on the way up and overshot 7 cm forward on the way down, unsaturated, with every foothold landing forward / outward)
    const R = this.planner.exec.R; if (R && R.timed && (R.stage === "SWING" || R.stage === "DESCEND") && !this.opts.noSwingFF) for (const e of this._swingFF(oFb, R, u)) extra.push(e);
    // L1: the arbiter (the controller's own frames for its feed-forward torques; the CURRENT joint state for the predicted spring / damping)
    const a = this.arb.step({ u, S: oFb.states, qCur: x.qCur, owner: ownerOf(this.spec, u.parts), extra, dt: x.dt, naive: !!this.opts.naive });
    const motor = u.motor.map((m, k) => ({ ...m, kp: a.motor[k].kp, kd: a.motor[k].kd }));
    return { final: a.final, vel: a.vel, motor, limits: a.limits, cls: u.cls, debug: u.debug, nominal: u.nominal, gOff: u.gOff, bOff: u.bOff, parts: u.parts, arb: a, gait: g, monitor: pr.monitor, plan: pr.plan, views: { fb: oFb.t, pl: oPl.t } }; }
}
