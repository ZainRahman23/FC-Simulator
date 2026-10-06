// ═══ physchar2/ctrl/v2_step.js — E2 STEP SEQUENCER (e2/E2_DESIGN_v2.md §2–§6; used only by the default-off E2 option `e2`) ══════════════════════════════════
// A deterministic intent machine on MEASURED lifecycle events (ctrl/v2_support.js — Jolt contact / load decide every state; nothing here declares contact,
// support or liftoff). It only SCHEDULES: the swing target (ctrl/v2_swing.js stepSegment), the DCM reference handed to the existing balance law
// (ctrl/v2_dcm.js), the λ request derived from the plan's VRP, and the acceptance intent / ramp. One planner (ctrl/v2_footstep.js) for commanded and
// recovery steps. Phases: SWING (decision → measured, accepted touchdown) → LANDED (landed foot accepting load) → DS (both SUPPORT, final transition) → DONE.
//   • decision: the planner from the measured state → CERTIFIED_ONE_STEP (executed) or NO_CERTIFIED_ONE_STEP (recorded; the step is not executed).
//   • while the swing foot is unloaded (before liftoff, airborne): the current foothold is re-checked every tick from the measured state; if it no longer certifies,
//     the planner re-plans (the swing re-targets C2 from the current reference state; the touchdown time is kept for commanded steps); a NO_CERTIFIED re-plan is
//     recorded and the last certified plan is kept as the best effort.
//   • measured touchdown after ≥ 60 % of the swing (IHMC): accepted. Earlier contact: not accepted until the gate, or until the planner certifies the contact location
//     from the measured state (whichever first). Late contact: the foothold is held ≤ 0.3 s; then a failed touchdown: re-plan from the measured state (never a declared
//     contact).
//   • at the accepted touchdown: the swing reference re-targets to the lifecycle's landed anchor (C2, over max(remaining, the lifecycle's `accept`) so it arrives as the
//     anchor fades in) and is handed back once there with the airborne weight a = 0; the plan is re-initialised from the measured post-contact DCM (commanded: the
//     final double-support Hermite; recovery: the R1/R2 law continues on the actual support weight). Acceptance: commanded — the plan's λ request reaching wantShare (E1b);
//     recovery — T-A's intent; both with the plan's ramp T_r.
//   • DONE once the plan has ended and both feet are SUPPORT: the request no longer carries ξ_ref (the controller's own quiet-stance reference = the plan's terminal
//     point, ctrl/v2_stand.js info.qsRef).
import { refState, stepSegment, stepAt, stepRef, stepPrev, segRef, segment, segAt, qlog } from "./v2_swing.js";
import { V, Q } from "../core/v2_math.js";
import { cmdPlan, dsPlan, recPlan, dcmTick, lamFromVrp, realisable, inset } from "./v2_dcm.js";
import { plan as fsPlan, check as fsCheck, trajectory as fsTraj, FS, PLAN_MARGINS, stepFrame, swingFrame, landingValid, ikFeasible, latU, liftRef, certifyPath, certifyClearance } from "./v2_footstep.js";

const CONTACT = ["TOUCHDOWN", "TOUCHING", "LOAD_ACCEPT", "SUPPORT", "UNLOADING"], mj = (u) => { u = Math.min(1, Math.max(0, u)); return u * u * u * (10 - 15 * u + 6 * u * u); };
const r6 = (x) => (x == null ? null : Array.isArray(x) ? x.map(r6) : typeof x === "number" ? +x.toFixed(6) : x);
export function e2seqOf(ctrl) { return ctrl.e2seq || (ctrl.e2seq = new StepSequencer(ctrl)); }
// the swing target AND its analytic reference (swingAccFF reads ctrl.swingRef; the controller clears it every tick, so it is set with every target)
function setTarget(c, n, e) { c.lc.setSwingTarget(n, { pos: e.pos, rot: e.rot }); if (!c.swingRef) c.swingRef = [null, null]; c.swingRef[n] = { vel: e.vel.slice(), acc: e.acc.slice(), w: (e.w || [0, 0, 0]).slice(), al: (e.al || [0, 0, 0]).slice() }; }
export class StepSequencer {
  constructor(ctrl) { this.ctrl = ctrl; this.ph = "IDLE"; this.calls = []; this.events = []; this.last = null; this.rec = false; this.memo = null; this.preds = []; }
  ev(t, what, x = {}) { this.events.push({ t, what, ...x }); }
  active() { return !["IDLE", "DONE", "NOCERT", "ABORTED", "NOLIFT"].includes(this.ph); }
  holdSupervisor() { return this.active() && !!this.accepted; }   // after the accepted measured touchdown the stance-only abort test does not apply (the DS plan is the return)
  ctx(t, mode, extra = {}) { const c = this.ctrl, st = c.e2st, ev = c.e2ev, I = c.info, n = this.n;
    return { ctrl: c, st, ev, info: I, n, mode, w: I.w0, dt: this.dt, kXi: c.o.kXi, minShare: c.o.minShare, debounce: c.lc.o.acceptDebounce, abortDur: this.abortDur, xi0: I.xi.slice(), p0: I.p.slice(),
      rs: this.rs, rMid0: I.qsRef, A: this.A, fr: stepFrame(c, st, n), pel: swingFrame(c, st, n), foot: { pos: st[c.feet[n]].pos.slice(), rot: st[c.feet[n]].rot.slice() }, tNow: t, ...extra }; }
  logCall(t, kind, R, X) { this.calls.push({ t, kind, verdict: R.verdict, why: R.why || null, dx: R.dx ?? null, dy: R.dy ?? null, dz: R.dz ?? null, pose: R.pose ? { pos: r6(R.pose.pos), rot: r6(R.pose.rot) } : null, T: R.T ?? null, Tr: R.Tr ?? null,
    slack: R.slack ?? null, eLand: R.eLand ?? null, rMid: r6(R.rMid ?? null), nominal: R.nominal ?? null, path: R.path ? R.path.verdicts : null, cert: R.cert || null, top: R.top || null, log: R.log || null,
    state: { xi: r6(X.xi0), p: r6(X.p0), w: r6(X.w), foot: r6(X.foot.pos), A: r6(X.A.pos), pel: r6(X.pel.pos) } }); }
  // ── commanded step: { n, kind: "forward" | "lateral", nominal: { dx, dy, dz }, T (seed), apex } ──
  // B1 (option e2: 2; e2/E2_PREREG_AMENDMENT_A1B1.md): the step command first runs the vertical LIFT phase (the E1b lift reference); the commanded swing starts at the
  // measured, confirmed liftoff from the measured foot state (startSwing). The decision certifies the post-liftoff swing from the predicted liftoff state (planning
  // liftoff delay FS.liftDelayPlan); touchdown is planned at liftoff + T
  command(t, cmd) { const c = this.ctrl, I = c.info; this.n = cmd.n; this.mode = "commanded"; this.cmd = cmd; this.dt = c.e2dt; this.abortDur = 0.6; this.B1 = c.o.e2 === 2;
    const a = c.lc.target(this.n), Tlo = this.B1 ? FS.liftDelayPlan : 0; this.A = { pos: a.pos.slice(), rot: a.rot.slice() }; this.rs = I.xiRef.slice(); this.tStart = t;
    this.apexZ = Math.max(this.A.pos[1], this.A.pos[1] + (cmd.nominal.dz || 0)) + cmd.apex; this.knotAbs = t + Tlo + 0.5 * cmd.T;
    const L = this.B1 ? liftRef(this.A, Tlo) : null, ref0 = this.B1 ? { p: L.p, v: L.v, a: L.a, th: [0, 0, 0], w: [0, 0, 0], al: [0, 0, 0] } : refState([this.A], this.A.rot, this.dt);
    const X = this.ctx(t, "commanded", { ref: ref0, nominal: cmd.nominal, Tseed: cmd.T, apex: cmd.apex, apexZ: this.apexZ, knotT: this.knotAbs - t - Tlo, liftDelay: Tlo, corridor: cmd.kind, diagNoClearance: !!cmd.diagNoClearance }), R = fsPlan(X);
    this.logCall(t, "decision", R, X); if (R.verdict !== "CERTIFIED_ONE_STEP") { this.ph = "NOCERT"; this.ncT = t; this.ev(t, "NO_CERTIFIED_ONE_STEP at the decision: step not executed (fallback: return to double support)"); return R; }
    this.adopt(t, R); this.tTD = t + Tlo + R.T; this.plan = cmdPlan({ t0: t, xi0: I.xi, xid0: [I.w0 * (I.xi[0] - I.p[0]), I.w0 * (I.xi[1] - I.p[1])], rs: this.rs, tTD: this.tTD }); this.initCom(I);
    this.preds.push({ t, kind: "decision", tTD: this.tTD, traj: this.traj(fsTraj(X, R.pose, R.T, R.Tr)) });
    if (this.B1) { this.ph = "LIFT"; this.liftT0 = t; this.sgPlan = R.seg; this.sg = null; this.segT0 = null; this.tStart = null; } else this.ph = "SWING";
    this.ev(t, "step command: CERTIFIED_ONE_STEP" + (this.B1 ? " — vertical liftoff phase first" : ""), { T: R.T, Tr: R.Tr }); return R; }
  // B1: the measured, confirmed liftoff starts the commanded swing from the MEASURED foot state — origin position, origin velocity v + ω × (origin − COM), orientation and
  // angular velocity relative to the foothold frame — with the lift reference's acceleration (the commanded acceleration stays continuous; a measured acceleration would be a
  // noisy difference). T = the seed from liftoff (no compression); apex knot at liftoff + T/2. The recomputed swing is re-certified online (path, clearance, timed capture)
  startSwing(t, L) { const c = this.ctrl, st = c.e2st, b = st[c.feet[this.n]], Rg = this.F.rot, vO = V.add(b.v, V.cross(b.w, V.sub(b.pos, b.com)));
    const ref = { p: b.pos.slice(), v: vO, a: L.a.slice(), th: qlog(Q.mul(Q.conj(Rg), b.rot)), w: Q.rot(Q.conj(Rg), b.w), al: [0, 0, 0] };
    this.tLo = t; this.tStart = t; this.segT0 = t; this.tTD = t + this.T; this.knotAbs = t + 0.5 * this.T; this.sg = stepSegment(ref, this.F, this.T, { z: this.apexZ, tk: 0.5 * this.T }); this.ph = "SWING"; c.e2reanchor = this.n; if (c.o.e2reanchorVel) c.e2reanchorPrev = stepPrev(this.sg, this.dt);
    const X = this.ctx(t, this.mode, { plan0: this.plan }), path = certifyPath(X, this.sg), clr = certifyClearance(X, this.sg), chk = fsCheck(X, this.F, this.T, this.Tr, this.eLand), ok = path.ok && clr.ok && chk.ok;
    this.calls.push({ t, kind: "liftoff re-certification", verdict: ok ? "CERTIFIED_ONE_STEP" : "NO_CERTIFIED_ONE_STEP", why: ok ? null : [path.ok ? null : "path", clr.ok ? null : `clearance margin ${(clr.margin * 1000).toFixed(1)} mm at φ ${clr.at != null ? clr.at.toFixed(2) : "—"} (envelope ${(clr.envelope * 1000).toFixed(1)} mm)`, chk.ok ? null : "timed capture: " + chk.why].filter(Boolean).join("; "),
      pose: { pos: r6(this.F.pos), rot: r6(this.F.rot) }, T: this.T, Tr: this.Tr, path: path.verdicts, cert: this.cert || null, clearance: { margin: clr.margin, at: clr.at, envelope: clr.envelope }, state: { p: r6(ref.p), v: r6(ref.v), a: r6(ref.a), th: r6(ref.th), w: r6(ref.w), liftRef: r6(L.p) } });
    if (!ok) { this.nocertSwing = (this.nocertSwing || 0) + 1; this.ev(t, "liftoff re-certification NO_CERTIFIED_ONE_STEP (best effort continues)"); }
    this.ev(t, "measured liftoff confirmed: commanded swing started from the measured foot state", { dz: (b.pos[1] - this.A.pos[1]) * 1000, liftRefDz: (L.p[1] - this.A.pos[1]) * 1000 }); }
  // ── recovery step from the supervisor's abort (class B: T-A verdict "step required" at t_cls); the foot is airborne under T-A's put-down segment ──
  recover(t, n, g) { const c = this.ctrl, I = c.info, f = c.lc.feet[n]; this.n = n; this.mode = "recovery"; this.rec = true; this.dt = g.dt; this.abortDur = g.abortDur ?? 0.6; this.tStart = t;
    this.A = { pos: f.hold.pos.slice(), rot: f.hold.rot.slice() }; this.rs = null; this.apexZ = null; this.knotAbs = null;
    const P = g.putDown, ref = P ? segRef(P.seg, t - P.segT0) : refState([f.swing || f.hold], this.A.rot, this.dt), X = this.ctx(t, "recovery", { ref, corridor: "recovery", apex: null }), R = fsPlan(X);
    this.logCall(t, "recovery decision", R, X); if (R.verdict !== "CERTIFIED_ONE_STEP") { this.ph = "NOCERT"; this.ev(t, "NO_CERTIFIED_ONE_STEP at the recovery decision: no foothold forced (T-A in-place fallback continues)"); return R; }
    this.adopt(t, R); this.plan = recPlan({ t0: t, xi0: I.xi, Tds: FS.TdsRec, u: latU(I, n) }); this.initCom(I); this.airSeen = true;
    this.preds.push({ t, kind: "recovery decision", tTD: t + R.T, traj: this.traj(fsTraj(X, R.pose, R.T, R.Tr)) }); this.ph = "SWING"; this.ev(t, "recovery step: CERTIFIED_ONE_STEP", { T: R.T, Tr: R.Tr, slack: R.slack }); return R; }
  adopt(t, R) { this.F = R.pose; this.Fcmd = R.pose; this.eLand = R.eLand; this.cert = R.cert || null; this.T = R.T; this.Tr = R.Tr; this.sg = R.seg; this.segT0 = t; this.tTD = t + R.T; this.slack = R.slack; }
  initCom(I) { this.comRef = [I.c[0], I.c[2]]; }
  traj(r) { return { recovers: r.recovers, why: r.why, s: (r.out || []).filter((_, i) => i % 2 === 0).map(o => [r6(o.t), r6(o.xi), r6(o.xiRef), r6(o.vrp), r6(o.s)]) }; }
  // re-plan of the running swing from the measured state: commanded steps keep the touchdown time (Tfixed); after a FAILED touchdown the planner's own footholds (on the
  // turf, dz 0) with the tracking-bound minimum duration for the re-target; recovery steps search T ≥ T_min of the re-target
  // B1, during LIFT (before the measured liftoff): from the predicted liftoff state, the remaining planning liftoff delay, the swing T kept
  replan(t, why, failed = false) { const lift = this.ph === "LIFT", tau = lift ? t - this.liftT0 : 0, rem = lift ? Math.max(0, FS.liftDelayPlan - tau) : 0, Lp = lift ? liftRef(this.A, tau + rem) : null;
    const X = this.ctx(t, this.mode, { ref: lift ? { p: Lp.p, v: Lp.v, a: Lp.a, th: [0, 0, 0], w: [0, 0, 0], al: [0, 0, 0] } : stepRef(this.sg, t - this.segT0), nominal: this.cmd ? { ...this.cmd.nominal, ...(failed ? { dz: 0 } : {}) } : null, Tseed: this.cmd && !failed ? this.cmd.T : null, apex: this.cmd ? this.cmd.apex : null, apexZ: this.apexZ,
      knotT: lift ? 0.5 * this.T : this.knotAbs != null ? this.knotAbs - t : null, liftDelay: rem, diagNoClearance: !!(this.cmd && this.cmd.diagNoClearance), corridor: this.cmd ? this.cmd.kind : "recovery",
      Tfixed: this.mode === "commanded" && !failed ? (lift ? this.T : Math.max(this.tTD - t, 2 * this.dt)) : null, plan0: this.plan, F0: this.F, eLand0: this.eLand, phiOff: lift ? 0 : t - this.tStart, phiDen: lift ? this.T : this.tTD - this.tStart }), R = fsPlan(X);
    this.logCall(t, "re-plan (" + why + ")", R, X);
    if (R.verdict !== "CERTIFIED_ONE_STEP") { this.nocertSwing = (this.nocertSwing || 0) + 1; this.ev(t, "re-plan NO_CERTIFIED_ONE_STEP: last certified plan kept (best effort)", { why }); return; }
    this.adopt(t, R); if (lift) { this.sg = null; this.segT0 = null; this.tTD = t + rem + R.T; } if (this.plan.kind === "cmd") this.plan.tTD = this.tTD; this.ev(t, "re-plan adopted", { dx: R.dx, dy: R.dy, T: R.T, Tr: R.Tr }); }
  env(t) { const c = this.ctrl, I = c.info, n = this.n, M = PLAN_MARGINS; if (this.plan.kind !== "rec") return { w: I.w0, dt: this.dt, rMid: I.qsRef };
    const s = c.lc.feet[n].s, floor = c.o.minShare * this.fsc(t), S = inset(I.polys[1 - n], M.copSS), R = s > 0 ? realisable(S, inset(I.polys[n], s < 1 ? M.copRamp : M.copFull), s, floor) : S;
    return { w: I.w0, dt: this.dt, R, Rm: M.copFull, s, rMid: I.qsRef }; }
  fsc(t) { return this.mode !== "recovery" ? 1 : this.tContact == null ? 0 : mj((t - this.tContact) / this.abortDur); }   // recovery: T-A's floor rule (0 until the first contact, then min-jerk over abortDur)
  accept(t, why, land) { const c = this.ctrl, I = c.info; this.ph = "LANDED"; this.accepted = true; this.tAcc0 = t; this.ev(t, "touchdown accepted: " + why);
    this.F = { pos: land.pos.slice(), rot: land.rot.slice() }; const u = t - this.segT0; this.hb = stepSegment(stepRef(this.sg, u, land.rot), land, Math.max(this.sg.T - u, c.lc.o.accept), null); this.hbT0 = t;
    if (this.plan.kind === "cmd") { this.plan = dsPlan({ t0: t, xi0: I.xi, xid0: [I.w0 * (I.xi[0] - I.p[0]), I.w0 * (I.xi[1] - I.p[1])], Tds: FS.TdsCmd }); this.initCom(I); }
    const X = this.ctx(t, this.mode, { contactNow: true, plan0: this.plan.kind === "rec" ? this.plan : null }); this.preds.push({ t, kind: "contact re-initialisation", traj: this.traj(fsTraj(X, land, 0, this.Tr)) }); }
  // per-tick: once per controller tick (memoised); returns the request fields or null when inactive
  request(t) { if (this.memo && this.memo.t === t) return this.memo.r; const r = this._request(t); this.memo = { t, r }; return r; }
  _request(t) { const c = this.ctrl, I = c.info, lc = c.lc, n = this.n, g = c.g3; if (!this.active()) { this.last = null; return null; }
    if (!this.rec && g && g.aborted != null) { this.ph = "ABORTED"; this.ev(t, "supervisor abort before the accepted touchdown: commanded step abandoned (E1b abort path)"); this.last = null; return null; }
    const f = lc.feet[n], stt = f.state, inContact = CONTACT.includes(stt);
    if (stt === "AIRBORNE" && !this.airSeen) { this.airSeen = true; this.tAir = t; this.ev(t, "measured AIRBORNE"); }
    if (inContact && this.airSeen && this.tContact == null) this.tContact = t;
    if (this.ph === "LIFT") { const tau = t - this.liftT0, L = liftRef(this.A, tau);
      if (stt === "AIRBORNE") this.startSwing(t, L);
      else if (tau >= FS.lift.T - 1e-9) { this.ph = "NOLIFT_PD"; this.pd = { t0: t, seg: segment({ p: L.p, v: [0, 0, 0], a: [0, 0, 0], th: [0, 0, 0], w: [0, 0, 0], al: [0, 0, 0] }, this.A, FS.lift.T) }; this.ev(t, "no measured liftoff by the end of the lift profile: step abandoned (foot back to its anchor, then return to double support)"); }
      else { setTarget(c, n, { pos: L.p, rot: this.A.rot, vel: L.v, acc: L.a }); this.swRef = { pos: L.p, vel: L.v, acc: L.a };
        const X = this.ctx(t, this.mode, { plan0: this.plan }), chk = fsCheck(X, this.F, Math.max(this.tTD - t, 2 * this.dt), this.Tr, this.eLand); this.chk = chk.ok; if (!chk.ok) this.replan(t, chk.why || "check failed"); } }
    if (this.ph === "NOLIFT_PD") { const e = segAt(this.pd.seg, t - this.pd.t0);
      if (e.done && inContact) { lc.setSwingTarget(n, null); this.ph = "NOLIFT"; this.ncT = t; this.ev(t, "foot back on its anchor: return to double support"); this.last = null; return null; }
      setTarget(c, n, e); this.last = { ph: this.ph }; return { lam: n === 1 ? 0 : 1, dl: 0, ddl: 0 }; }
    if (this.ph === "SWING") { const u = t - this.segT0;
      if (this.airSeen && inContact) { if (this.tTDm == null) { this.tTDm = t; this.ev(t, "measured contact: " + stt); }
        const frac = (t - this.tStart) / Math.max(1e-9, this.tTD - this.tStart);
        if (frac >= FS.gate - 1e-9) this.accept(t, `measured contact at ${(100 * frac).toFixed(0)} % of the swing (≥ 60 % gate)`, f.hold);
        // early contact: the planner, re-run from the measured state, keeps the current foothold while it still certifies (commanded: the nominal priority; recovery: keep while
        // certified); only if it no longer does is the certified contact location accepted as the foothold (corrected after the B1 diagnostic smoke: feasibility alone accepted
        // the liftoff spot itself — a zero-length step)
        else { const X = this.ctx(t, this.mode, { contactNow: true, plan0: this.plan.kind === "rec" ? this.plan : null }), land = f.hold, cur = fsCheck(this.ctx(t, this.mode, { plan0: this.plan }), this.F, Math.max(this.tTD - t, 2 * this.dt), this.Tr, this.eLand);
          const geo = !cur.ok && landingValid(c, X.st, n, land, X.fr), ik = geo && geo.ok && ikFeasible(c, X.st, X.ev, n, X.pel, land), chk = ik ? fsCheck(X, land, 0, this.Tr) : { ok: false };
          if (!this.earlySeen) { this.earlySeen = t; this.ev(t, `EARLY contact at ${(100 * frac).toFixed(0)} % of the swing (< 60 %): not accepted unless the planner certifies the contact location`); }
          if (chk.ok) { this.calls.push({ t, kind: "early-contact certification", verdict: "CERTIFIED_ONE_STEP", pose: { pos: r6(land.pos), rot: r6(land.rot) } }); this.Fcmd = { pos: land.pos.slice(), rot: land.rot.slice() }; this.accept(t, "early contact location certified by the planner", land); } } }
      else if (this.tTDm != null && !inContact) { this.ev(t, "contact lost again before acceptance: " + stt); this.tTDm = null; }
      if (this.ph === "SWING") {
        if (u > this.sg.T + FS.lateHold - 1e-9 && !this.failedTD) { this.failedTD = t; this.ev(t, "FAILED touchdown: no contact 0.3 s after the planned touchdown — re-plan from the measured state (no contact declared)"); this.replan(t, "failed touchdown", true); }
        else if (u < this.sg.T && (!inContact || !this.airSeen)) { const X = this.ctx(t, this.mode, { plan0: this.plan }), chk = fsCheck(X, this.F, this.sg.T - u, this.Tr, this.eLand); this.chk = chk.ok; if (!chk.ok) this.replan(t, chk.why || "check failed"); }
        if (u >= this.sg.T && !this.lateSeen && !inContact) { this.lateSeen = t; this.ev(t, "late contact: foothold held (≤ 0.3 s)"); }
        const e = stepAt(this.sg, t - this.segT0); setTarget(c, n, e); this.swRef = e; } }
    if (this.ph === "LANDED") { if (stt === "SUPPORT") { this.ph = "DS"; this.ev(t, "landed foot SUPPORT"); }
      else if (this.hb && this.handBackT == null) { const e = stepAt(this.hb, t - this.hbT0); this.swRef = e; if (e.done && f.a <= 0) { lc.setSwingTarget(n, null); this.handBackT = t; this.ev(t, "hand-back: swing target cleared (reference at the landed anchor, a = 0)"); } else setTarget(c, n, e); } }
    if (this.ph === "DS") { const P = this.plan, tEnd = P.kind === "ds" ? P.t0 + P.Tds : P.h ? P.h.t0 + P.Tds : Infinity;
      if (t >= tEnd - 1e-9 && lc.feet[0].state === "SUPPORT" && lc.feet[1].state === "SUPPORT") { this.ph = "DONE"; this.doneT = t; this.ev(t, "DONE: plan complete, both feet SUPPORT — reference handed back to the controller's quiet-stance target"); this.last = null; return null; } }
    // DCM reference (once per tick) → the request
    const r = dcmTick(this.plan, t, this.env(t)), w = I.w0, fsc = this.fsc(t); this.comRef = [this.comRef[0] + this.dt * -w * (this.comRef[0] - r.xi[0]), this.comRef[1] + this.dt * -w * (this.comRef[1] - r.xi[1])];
    const landed = this.accepted || (this.rec && this.tContact != null), lamL = landed ? lamFromVrp(I.polys, n, r.vrp, c.o.minShare * fsc) : 0, lamR = n === 1 ? lamL : 1 - lamL;
    // acceptance: recovery — T-A's plan intent (measured contact still required); commanded — the plan's λ request reaching the lifecycle's wantShare (the validated E1b
    // replace mechanism), never intent: an intent-accepted foot with a zero load request is in support unloaded and is lifted by its leg (smoke SMK-1). Both use the plan's T_r
    const intent = this.rec, ramp = this.rec || this.accepted, req = { lam: lamR, dl: 0, ddl: 0, xiRef: r.xi, xiRefDot: r.xid, ...(intent ? { intent: [n === 0, n === 1] } : {}), ...(ramp ? { acceptDur: [n === 0 ? this.Tr : null, n === 1 ? this.Tr : null] } : {}), ...(this.rec ? { floorScale: fsc } : {}) };
    this.last = { ph: this.ph, dph: r.phase, xiRef: r.xi, xiRefDot: r.xid, vrp: r.vrp, comRef: this.comRef.slice(), lamL, fsc, intent, swRef: this.swRef ? { p: this.swRef.pos, v: this.swRef.vel, a: this.swRef.acc } : null, chk: this.chk ?? null };
    return req; }
  summary() { return { mode: this.mode || null, ph: this.ph, n: this.n ?? null, A: this.A ? { pos: r6(this.A.pos), rot: r6(this.A.rot) } : null, F: this.F ? { pos: r6(this.F.pos), rot: r6(this.F.rot) } : null, Fcmd: this.Fcmd ? { pos: r6(this.Fcmd.pos), rot: r6(this.Fcmd.rot) } : null, T: this.T ?? null, Tr: this.Tr ?? null, slack: this.slack ?? null,
    tStart: this.tStart ?? null, tTD: this.tTD ?? null, tAir: this.tAir ?? null, tLo: this.tLo ?? null, liftT0: this.liftT0 ?? null, B1: !!this.B1, tTDm: this.tTDm ?? null, tContact: this.tContact ?? null, tAcc0: this.tAcc0 ?? null, handBackT: this.handBackT ?? null, doneT: this.doneT ?? null,
    early: this.earlySeen ?? null, late: this.lateSeen ?? null, failedTD: this.failedTD ?? null, nocertSwing: this.nocertSwing || 0, calls: this.calls, events: this.events, preds: this.preds }; }
}
