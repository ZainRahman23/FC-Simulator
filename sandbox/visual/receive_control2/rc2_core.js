// ═══ receive_control2/rc2_core.js — RECEIVE-CONTROL-2: ONE AUTHORITATIVE RECEIVE PIPELINE (RECEIVE-KILL + RECEIVE-TURN inside RECEIVE-CONTROL) ═══
// The newer receive pieces were built beside RECEIVE-CONTROL-1.1; here they become its foundation. One receive event, one resolver, one Ball
// Control execution model, one handoff:
//
//   incoming ball (BALL-PHYS) → receiver intent (exit direction / speed, kill or go) → RESOLVER: classify the receive
//     standing receiver · ground ball · go   → RECEIVE-TURN-1 selection: DIRECTIONAL (touch into space) · HALF-TURN · OUTSIDE-OF-FOOT · THROUGH-STANCE
//     standing receiver · ground ball · kill → RECEIVE-KILL: kill / deaden (foot surfaces)
//     standing receiver · aerial ball        → RECEIVE-KILL: thigh / chest / head (or a foot on a dropping ball) + follow-up foot control
//     moving receiver                        → RECEIVE-CONTROL-1.1's moving actions (STRIDE / OPEN_TURN / THROUGH_TURN) — interim until moving
//                                              receives (QUEUE #2) — executed with the SAME Ball Control model as every other receive touch
//   → the action's authored preparation (the root, facing and footwork are the action's) → the authoritative contact (one kernel schedule()) →
//   Ball Control execution (curve B, bounded keyed draws: seed | RECEIVE | receiver | R<event> | c<contact> | receive-control-v2 | dimension) →
//   the rigid-body ball → follow-up / recovery (RECEIVE-KILL's follow-up control, RECEIVE-TURN-1's continuation) → the REJOIN touch (part of the
//   receive event: the ball pushed onto the exit line where DRIBBLE-V1 takes it) → TURN-1.2 takes the body (the run-out is real locomotion) →
//   DRIBBLE-V1 takes the ball (the frozen resolver, the rejoin as its last touch) — or, for a kill and hold, stable possession.
//
// AUTHORITY. The episodes are RECEIVE-KILL's / RECEIVE-TURN-1's own decisions running live in this kernel (rc2_episode.js, bit-identical to
// the stand-alone episodes: tools/rc2_equiv.mjs). The presentation bodies (RECEIVE-TURN-1.1's HumanTurnBody, RECEIVE-KILL's KillBody) only
// show them; the receiver's colliders are out of the ball's world while a receive action owns the body. The rejoin foot and the TURN-1.2 switch
// come from the action's authored FOOTWORK (the footstep plan, computed in the simulation whether animation is on or off — never from a pose).
// DRIBBLE-V1 (dribble15/d15_core.js) and RECEIVE-CONTROL-1.1 (receive11/) are imported, never modified.
import { ReceiveSim11, RX, BALL_DEFAULT, D1, DT, withBC, boneFramesOf } from "../receive11/rx_core.js";
import { HANDOFF_AHEAD, tab } from "../receive11/rx_actions.js";
import { DribbleSim } from "../dribble15/d15_core.js";
import * as RT from "../receive_turn1/rt_sim.js";
import * as RKS from "../receive_turn1/rk_sim.js";
import { RK, surf, incoming, difficulty, surfaceIdeal, idealVel } from "../receive_turn1/rk_model.js";
import { MOVE, TDIFF, DEG, clamp, s5, wrapA, dir, toL2, runDist, runSpeed } from "../receive_turn1/rt_actions.js";
import { Frame, TurnEpisode, KillEpisode, predictK, rollK } from "./rc2_episode.js";
import { HumanTurnBody } from "../receive_turn11/rt11_body.js";
import { dsin, dcos } from "../physchar2/core/v2_math.js";
export { RX, BALL_DEFAULT, D1, DT, withBC };
const R = 0.11, hyp = Math.hypot, abs = Math.abs, max = Math.max, min = Math.min, r2 = (x) => Math.round(x * 100) / 100, r3 = (x) => Math.round(x * 1000) / 1000;
const SIDES = ["R", "L"], sstep = (a, b, x) => s5((x - a) / Math.max(1e-6, b - a)), lerp2 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

export const RC2 = {
  version: "RECEIVE-CONTROL-2",
  groundZ: 0.24,                 // m: a GROUND receive when the ball's centre stays ≤ this while it is in the receiver's reach (RECEIVE-TURN-1's continuation limit)
  reachF: [-1.2, 1.6],           // m: the receiver's reach along his facing (RECEIVE-TURN-1's selection window)
  horizon: 6.0,                  // s: the strike-time prediction (truncated as RECEIVE-KILL's predict(): 1.6 s after the arrival at xRef)
  rejoin: { tau: 0.70, minSpeed: 0.8 },   // the rejoin push: the ball on the exit line HANDOFF_AHEAD(v) ahead of the runner tau s after the touch
  // (the runner after TURN-1.2 takes the body: its switch speed vSw, asked for vSw + exitRamp.dv — modelled as vSw + dv / 2 over the window)
  setOff: { turnShare: 0.6, tau: 0.55 },  // after a kill / control and a go intent: the push along the exit after turnShare of the turn; DRIBBLE-V1 tau s later
  surfaceMap: { INSIDE: "FOOT_INSIDE", OUTSIDE: "FOOT_OUTSIDE", LACES: "FOOT_INSTEP", SOLE: "FOOT_SOLE" },
  // RECEIVE-CONTROL-1.1's moving families on RECEIVE-TURN-1's difficulty terms: the share of the body's rotation inside the touch window
  movingRotIn: { CUSHION: 0.0, STRIDE: 0.25, OPEN_TURN: 0.35, THROUGH_TURN: 0.5 },
};
// RECEIVE-CONTROL-1.1's private rebase (a fresh TURN-1.2 actor continues the simulation's clock)
function rebase(A, T) { A.t += T; A.clk.t0 += T; for (const F of SIDES) { const L = A.legs[F]; if (L.tTD != null) L.tTD += T; if (L.tTO != null) L.tTO += T; } }

export class ReceiveSim2 extends ReceiveSim11 {
  // cfg as RECEIVE-CONTROL-1.1's; cfg.scenario.launch (optional): the pass's exact launch { p, v, w } in the kernel frame (the equivalence and
  // review cases strike RECEIVE-TURN-1 / RECEIVE-KILL's own solved passes); cfg.receiverKey: the receiver's id in the draw keys (default the player id)
  constructor(cfg) {
    super(cfg); const scn = cfg.scenario;
    if (scn.launch) { const b = this.W.ball, L = scn.launch; b.p = L.p.slice(); b.v = L.v.slice(); b.w = L.w.slice(); b.mode = L.mode || (L.p[1] > R + 1e-9 || abs(L.v[1]) > 1e-9 ? "AIRBORNE" : "ROLLING"); b.sleeping = false; this.W.restTime = 0; this.rx.bm = null; this.rx.pass = Object.assign({}, this.rx.pass, { exact: true }); }
    this.rc2 = { phase: this.rx.stand ? "plan" : "moving", receiver: cfg.receiverKey || this.pid, events: 0, ep: null, log: [], launches: [], cls: null, exit: null, cpu: { plan: 0, ep: 0 } };
  }
  get seed() { return this.cfg.seed == null ? 1 : this.cfg.seed; }
  newEvent() { this.rc2.events++; return "R" + this.rc2.events; }
  spec(ev) { return { seed: this.seed, receiver: this.rc2.receiver, receiveEvent: ev }; }
  prefFoot() { const wf = this.player && this.player.weak_foot != null ? this.player.weak_foot : (this.cfg.player && this.cfg.player.weak_foot); return wf >= 5 ? null : (this.pref || "R"); }
  // ── THE FIXED STEP ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  step() {
    const c2 = this.rc2;
    if (c2.phase === "moving" || this.rx.phase === "dribble") return super.step();                       // RECEIVE-CONTROL-1.1's path / DRIBBLE-V1
    if (c2.phase === "exit") { const c0 = now(); DribbleSim.prototype.step.call(this); this.rx.cpuRx += now() - c0; if (this.k === c2.kDribble) this.dribbleOn(); return; }   // TURN-1.2 runs, no dribble resolver yet
    if (c2.phase === "plan") { const c0 = now(); this.resolve2(this.k); c2.cpu.plan += now() - c0; }
    return this.actionStep();
  }
  // ── THE RESOLVER (a standing receiver, at the pass's strike: the clean read) ─────────────────────────────────────────────────────────────────
  resolve2(k) {
    const c2 = this.rc2, rx = this.rx, P0 = this.A.P.slice();
    // the strike-time prediction in a receive frame, truncated as RECEIVE-KILL's predict(): 1.6 s after the arrival at the reach plane
    const predIn = (F) => { const full = predictK(this.W, RC2.horizon, F); let K = full.findIndex((q) => q.p[0] <= RKS.SIM.xRef); if (K < 0) K = full.length - 1; const Kend = min(full.length - 1, K + Math.round(1.6 / DT)), P = [];
      for (let i = 0; i <= Kend; i++) { P.push(full[i]); if (i > K && full[i].p[0] < -2.5) break; } return P; };
    // two frames: the receiver's own facing (RECEIVE-KILL receives from any bearing — the bearing is a difficulty term) and squared up to the pass
    // (RECEIVE-TURN-1's actions are authored for a ball from the front: the receiver faces where it comes from at its closest approach)
    const Fown = new Frame(P0, this.A.psi), Pown = predIn(Fown), raw = predictK(this.W, RC2.horizon, new Frame(P0, 0)); let iC = 0, dC = Infinity; for (let i = 0; i < raw.length; i++) { const d = hyp(raw[i].p[0], raw[i].p[1]); if (d < dC) { dC = d; iC = i; } }
    const vA = raw[iC].v, hFace = abs(vA[1]) < 1e-12 && vA[0] < 0 ? 0 : Math.atan2(-vA[1], -vA[0]), Fsq = abs(wrapA(hFace - this.A.psi)) < 1e-9 ? Fown : new Frame(P0, hFace), Psq = Fsq === Fown ? Pown : predIn(Fsq);
    const inReach = (P) => P.filter((q) => q.p[0] >= RC2.reachF[0] && q.p[0] <= RC2.reachF[1] && abs(q.p[1]) <= 1.2), groundIn = (P) => { const q = inReach(P); return q.length > 0 && q.every((x) => x.p[2] <= RC2.groundZ); };
    const ground = groundIn(Psq), go = rx.intent !== "kill", pref = this.prefFoot(), ev = this.newEvent();
    // the exit relative to the squared-up facing; a 180° turn keeps the side the intent asked for (the scenario's sign)
    // (the intent's own turn, relative to the initial facing: DRIBBLE-V1's command layer stores a 180° turn as 179.5° to keep its side — the
    // receive asks for the turn the intent names; the post-handoff exit direction stays DRIBBLE-V1's)
    const want = this.cfg.scenario.exit && this.cfg.scenario.exit.turn, fTurn = wrapA(hFace - this.A.psi) / DEG;
    let thDeg = want != null ? want - fTurn : +(wrapA(rx.exitDir - hFace) / DEG).toFixed(9); if (thDeg > 180) thDeg -= 360; else if (thDeg < -180) thDeg += 360; if (abs(abs(thDeg) - 180) < 1e-9 && want) thDeg = want < 0 ? -180 : 180;
    const cls = { k, ev, ground, intent: rx.intent, hold: rx.hold, exitRel: thDeg, faceTurn: wrapA(hFace - this.A.psi) / DEG };
    let plan = null, F = null, P = null;
    if (ground && go) { const A = RT.selectTurn({ pred: { P: Psq } }, { theta: thDeg, pref }); if (!A.none) { plan = { kind: "TURN", A }; F = Fsq; P = Psq; } else cls.turnRej = A.rej; }
    if (!plan) for (const [Fk, Pk] of Fsq === Fown ? [[Fown, Pown]] : [[Fown, Pown], [Fsq, Psq]]) { const keep = RK.plan.prefFoot; RK.plan.prefFoot = pref || "R"; const kp = RKS.planKill({ P: Pk }, { surface: "AUTO" }); RK.plan.prefFoot = keep;
      if (!kp.none) { const ideal = surfaceIdeal(kp.sf, kp.st, kp.inc, kp.shift); ideal.base = RKS.solveExit({ ideal, contact: kp.st.p }); ideal.v = idealVel(ideal, ideal.base.s); plan = { kind: "KILL", plan: kp, ideal }; F = Fk; P = Pk; break; } else cls.killRej = kp.rej; }
    cls.frame = F ? { P0, h: F.h } : null;
    cls.action = plan ? (plan.kind === "TURN" ? plan.A.fid : plan.plan.sf.S.group === "FOOT" ? "KILL_" + plan.plan.sf.key : plan.plan.sf.S.group) : "NONE";
    c2.cls = cls; c2.frame = F; c2.P = P; c2.log.push({ k, ev: "resolve", action: cls.action, ground, exitRel: thDeg, face: F ? +(wrapA(F.h - this.A.psi) / DEG).toFixed(1) : null });
    if (!plan) { c2.phase = "none"; return; }
    const spec = this.spec(ev);
    if (plan.kind === "TURN") { const A = plan.A; A.pref = pref; c2.ep = new TurnEpisode({ A, F, kc: k + A.k, bc: this.bc, spec, idPrefix: `${this.pid}:${ev}.c0`, carry: "none" }); c2.kind = "TURN"; c2.kc = k + A.k; c2.thExit = rx.exitDir; }
    else { c2.ep = new KillEpisode({ plan: plan.plan, ideal: plan.ideal, F, kc: k + plan.plan.k, bc: this.bc, spec, idPrefix: `${this.pid}:${ev}.c0` }); c2.kind = "KILL"; c2.kc = k + plan.plan.k; }
    c2.k0 = k; c2.psiInit = this.A.psi; c2.phase = "action"; c2.spec = spec; this.parkColliders();
    if (this.cfg.Body2 && this.anim) this.body2 = null;   // (built when the episode's footwork is known)
  }
  // ── AN AUTHORED TICK: the action owns the body; the episode's contacts; the ball kernel ────────────────────────────────────────────────────────
  actionStep() {
    const k = this.k, c2 = this.rc2, ep = c2.ep, A = this.A, c0 = now();
    if (ep) { const st = this.root2(k + 1); A.P = st.P; A.V = st.V; A.psi = st.psi; const sp = hyp(st.V[0], st.V[1]); this.input = { dir: sp > 0.3 ? Math.atan2(st.V[1], st.V[0]) : st.psi, v: sp }; this.capture(() => ep.pre(this.W)); this.extraPre(k); }
    if (!this.kernelStep(k)) { this.rx.cpuRx += now() - c0; return; }
    this.post(k); this.k++;
    if (ep) { this.capture(() => ep.post(this.W)); this.afterPost(); }
    if (this.body2) { const pz = this.body2.pose(this.k); if (pz) A.skinMats = pz.skin; }
    this.record(); this.rx.cpuRx += now() - c0; c2.cpu.ep += now() - c0;
    if (c2.kT12 != null && this.k === c2.kT12) this.switchToT12();
  }
  // ── the receiver's root during the action (pitch): the action's authored path ────────────────────────────────────────────────────────────────
  root2(kAbs) {
    const c2 = this.rc2, F = c2.frame, t = (kAbs - c2.kc) * DT, at = (tt) => this.rootLocal(tt), p = at(t), q = at(t + DT), psiL = this.psiLocal(t);
    let psi = F.head(psiL); const tk = (kAbs - c2.k0) * DT; if (c2.psiInit != null && tk < 0.5) psi = c2.psiInit + wrapA(psi - c2.psiInit) * s5(tk / 0.5);   // squaring up to the pass
    return { P: F.pitch(p), V: F.pitchV([(q[0] - p[0]) / DT, (q[1] - p[1]) / DT]), psi };
  }
  rootLocal(t) {
    const c2 = this.rc2, ep = c2.ep, tPrep = -min(0.8, (c2.kc - c2.k0) * DT);
    if (c2.kind === "TURN") { const A = ep.A, path = A.path;
      if (t <= 0) return lerp2([0, 0], A.S, sstep(tPrep, 0, t));
      if (c2.setOff) return this.setOffRoot(t);
      if (ep.follow) { const f = ep.follow, tA = max(MOVE.react + 0.10, path.Trot * 0.8); if (t <= tA) return path.rootAt(t); const PA = path.rootAt(tA), c = f.contact, d = [c[0] - PA[0], c[1] - PA[1]], l = hyp(d[0], d[1]) || 1, at = [c[0] - d[0] / l * 0.40, c[1] - d[1] / l * 0.40]; return lerp2(PA, at, sstep(tA, f.t, t)); }
      const P = path.rootAt(t); if (!ep.meet) return P;
      const m = ep.meet, Rm = path.rootAt(m.t), corr = [m.Q[0] - Rm[0], m.Q[1] - Rm[1]], u = t <= m.t ? s5((t - MOVE.react) / max(0.05, m.t - MOVE.react)) : 1; return [P[0] + corr[0] * u, P[1] + corr[1] * u]; }
    // KILL: the shuffle to the first stance, then the adjustment moves between contacts; then a set-off
    if (c2.setOff) return this.setOffRoot(t);
    const S1 = ep.plan.shift; if (t <= 0) return lerp2([0, 0], S1, sstep(tPrep, tPrep + 0.35, t));
    return ep.stanceAt(Math.round(t / DT));
  }
  psiLocal(t) {
    const c2 = this.rc2, ep = c2.ep;
    if (c2.setOff && t >= c2.setOff.t0) { const so = c2.setOff; return so.psi0 + wrapA(so.psi1 - so.psi0) * s5((t - so.t0) / so.Trot); }
    if (c2.kind === "TURN") { const A = ep.A; if (t <= 0) return A.psiC * sstep(-min(0.8, (c2.kc - c2.k0) * DT), 0, t); return A.path.psiAt(t); }
    return 0;
  }
  // ── the episode's extra launches (the rejoin / the set-off push): scheduled when their tick comes ─────────────────────────────────────────────
  extraPre(k) { for (const L of this.rc2.launches) if (!L.done && L.tick === k) { L.done = true; this.scheduleTouch(L); } }
  afterPost() {
    const c2 = this.rc2, ep = c2.ep, k = this.k;
    // the continuation is known one tick after the contact: plan the rejoin (TURN) — or, after a control episode, wait for stable control
    if (c2.kind === "TURN" && !c2.planned && ep.cls !== undefined) { c2.planned = true; ep.finishLive = true;
      if (ep.meet && (ep.cls === "IMMEDIATE" || ep.cls === "ADJUSTED") && !c2.cls.hold) this.planRejoin(); }
    if (!c2.stableAt && (c2.kind === "KILL" || (c2.kind === "TURN" && ep.follow))) { const st = this.stableNow2(); if (st) { c2.stableAt = k; c2.log.push({ k, ev: "stable" }); if (!c2.cls.hold && !c2.setOff) this.planSetOff(); } }
  }
  stableNow2() { const c2 = this.rc2, F = c2.frame, b = this.W.ball, st = { p: F.loc(b.p), v: F.locV(b.v) }, S = this.rootLocal((this.k - c2.kc) * DT); if (this.k < c2.kc + Math.round(0.3 / DT)) return false;
    const ep = c2.ep, last = Array.isArray(ep.contacts) ? ep.contacts[ep.contacts.length - 1] : null; if (last && this.k < last.k + Math.round(0.12 / DT)) return false; if (ep.nextDecision != null && !ep.closed) return false;
    if (c2.kind === "TURN" && ep.follow && this.k < c2.kc + ep.follow.i + Math.round(0.12 / DT)) return false;
    const T = RK.stable, vh = hyp(st.v[0], st.v[1]); if (!(st.p[2] <= T.zMax && abs(st.v[2]) <= T.vzMax && vh <= T.vRel && hyp(st.p[0] - S[0], st.p[1] - S[1]) <= T.radius)) { c2.stRun = 0; return false; }
    c2.stRun = (c2.stRun || 0) + 1; return c2.stRun > Math.round(T.hold / DT); }
  // ── THE REJOIN (a TURN's continuation touch, part of the receive event): at the meeting the receiver plays the ball onto the exit line so that,
  // RX.exitRamp later, it is HANDOFF_AHEAD(speed) ahead of him — DRIBBLE-V1's takeover condition (RECEIVE-CONTROL-1.1's lesson); the touch is a
  // receive contact executed with Ball Control (the event's next contact index); the receiver's FOOTWORK (RECEIVE-TURN-1.1's authored footstep plan)
  // names the foot that plays it and when it lands — TURN-1.2 takes the body at that touchdown
  planRejoin() {
    const c2 = this.rc2, ep = c2.ep, A = ep.A, m = ep.meet, path = A.path, kM = c2.kc + m.i, tau = RC2.rejoin.tau, tH = m.t + tau, u = path.u;
    // the footwork: the swing that plays the meeting and its touchdown (the authored footstep plan — the same one the presentation shows)
    const fw = this.footwork(); let foot = null, tTD = null; if (fw) { for (const X of SIDES) for (const s of fw.seg[X]) if (s.touch && abs(s.touch.t - m.t) < 1e-9) { foot = X; tTD = s.t1; } if (!foot && m.t < (fw.ev.contactLand || 0)) { foot = A.F; tTD = fw.ev.contactLand; } }
    if (!foot) { foot = A.F; tTD = m.t + 0.12; }
    // where the runner will be at the handoff: the action's path to the TURN-1.2 switch, then TURN-1.2 asked for vSw + exitRamp.dv
    const tSw = max(m.t + DT, tTD), Psw = this.rootLocal(tSw), vSw = max(RX.vFloor, hyp(...this.rootVelLocal(tSw))), vRun = vSw + RX.exitRamp.dv / 2, vH = vSw + RX.exitRamp.dv;
    const Rh = [Psw[0] + u[0] * vRun * max(0, tH - tSw), Psw[1] + u[1] * vRun * max(0, tH - tSw)], T = [Rh[0] + u[0] * tab(HANDOFF_AHEAD, vH), Rh[1] + u[1] * tab(HANDOFF_AHEAD, vH)], B = m.ball;
    const d = [T[0] - B[0], T[1] - B[1]], dl = hyp(d[0], d[1]), dHat = [d[0] / dl, d[1] / dl], s0 = max(RC2.rejoin.minSpeed, RT.rollSpeedFor(dl, tau));
    c2.rejoin = { kM, tM: m.t, foot, tTD, kTD: c2.kc + Math.round(tTD / DT), vIdeal: [dHat[0] * s0, dHat[1] * s0, 0], target: T, vH, dHat, s0 };
    this.rc2.launches.push({ id: `${this.pid}:${c2.cls.ev}.c${ep.contacts}`, tick: kM, kind: "REJOIN", foot, contact: ep.contacts, build: () => this.rejoinExec() });
    c2.kT12 = max(kM + 1, c2.rejoin.kTD); c2.kDribble = kM + Math.round(tau / DT); c2.log.push({ k: this.k, ev: "rejoin-plan", kM, foot, kT12: c2.kT12, kDribble: c2.kDribble, s0: r2(s0) });
  }
  rejoinExec() {
    const c2 = this.rc2, ep = c2.ep, A = ep.A, F = c2.frame, rj = c2.rejoin, b = this.W.ball, st = { p: F.loc(b.p), v: F.locV(b.v) }, Vr = this.rootVelLocal((this.k - c2.kc) * DT);
    const vrel = [st.v[0] - Vr[0], st.v[1] - Vr[1], st.v[2]], inc = incoming({ p: st.p, v: vrel }), sf = surf("FOOT_INSIDE", rj.foot), Dk = difficulty(sf, st, inc, 0).D, D = Dk * (1 + TDIFF.out * rj.s0 / RK.diff.vRef);
    const n = hyp(vrel[0], vrel[1]) > 0.05 ? [-vrel[0] / hyp(vrel[0], vrel[1]), -vrel[1] / hyp(vrel[0], vrel[1])] : [-rj.dHat[0], -rj.dHat[1]];
    const Ax = { D, vIdeal: rj.vIdeal, nIn: n, dHat: rj.dHat, sig: A.sig, vInS: max(0.05, hyp(vrel[0], vrel[1])) }, N = RT.turnDraws(c2.spec, ep.contacts), ex = RT.executeTurn(Ax, this.bc, N);
    rj.ex = ex; rj.D = D; rj.N = N; return { vL: ex.v, surface: "FOOT_INSIDE", F: rj.foot, D, ex };
  }
  rootVelLocal(t) { const p = this.rootLocal(t), q = this.rootLocal(t + DT); return [(q[0] - p[0]) / DT, (q[1] - p[1]) / DT]; }
  // ── THE SET-OFF (a kill / control episode with a go intent): once the ball is under stable control the receiver turns to the exit, pushes the
  // ball along it (a receive contact, the event's next index) and runs; TURN-1.2 takes the body at the push's touchdown, DRIBBLE-V1 the ball later
  planSetOff() {
    const c2 = this.rc2, ep = c2.ep, F = c2.frame, t0 = (this.k - c2.kc) * DT, S = this.rootLocal(t0), psi0 = this.psiLocal(t0), th = wrapA(this.rx.exitDir - F.h), dPsi = wrapA(th - psi0), Trot = MOVE.turnBase + abs(dPsi / DEG) / MOVE.omegaTurn;
    const tPush = t0 + RC2.setOff.turnShare * Trot, kP = c2.kc + Math.round(tPush / DT), u = dir(th);
    c2.setOff = { t0, S, psi0, psi1: th, Trot, tPush, kP, u, tGo: tPush };
    const tau = RC2.setOff.tau, tH = tPush + tau, Rh = this.setOffRoot(tH), vH = max(RX.vFloor, runSpeed(tH - tPush)), T = [Rh[0] + u[0] * tab(HANDOFF_AHEAD, vH), Rh[1] + u[1] * tab(HANDOFF_AHEAD, vH)];
    // the ball at the push (the free ball from now: it is settled)
    const Pf = predictK(this.W, tPush - t0 + 0.05, F), B = Pf[min(Pf.length - 1, kP - this.k)].p, d = [T[0] - B[0], T[1] - B[1]], dl = hyp(d[0], d[1]), dHat = [d[0] / dl, d[1] / dl], s0 = max(RC2.rejoin.minSpeed, RT.rollSpeedFor(dl, tau));
    const foot = wrapA(th - psi0) >= 0 ? "R" : "L";   // the push with the foot on the turn side (a turn with the ball: the outside foot stays planted)
    c2.rejoin = { kM: kP, tM: tPush, foot, tTD: tPush + 0.12, kTD: kP + Math.round(0.12 / DT), vIdeal: [dHat[0] * s0, dHat[1] * s0, 0], target: T, vH, dHat, s0, setOff: true };
    const nC = ep.contacts.length != null ? ep.contacts.length : ep.contacts;
    c2.launches.push({ id: `${this.pid}:${c2.cls.ev}.c${nC}`, tick: kP, kind: "SET-OFF", foot, contact: nC, build: () => this.rejoinExecK(nC) });
    c2.kT12 = c2.rejoin.kTD; c2.kDribble = kP + Math.round(tau / DT); c2.log.push({ k: this.k, ev: "set-off-plan", kP, foot, kT12: c2.kT12, kDribble: c2.kDribble, s0: r2(s0) });
  }
  setOffRoot(t) { const so = this.rc2.setOff; if (t <= so.tGo) return so.S.slice(); const d = runDist(t - so.tGo); return [so.S[0] + so.u[0] * d, so.S[1] + so.u[1] * d]; }
  rejoinExecK(nC) {
    const c2 = this.rc2, F = c2.frame, rj = c2.rejoin, b = this.W.ball, st = { p: F.loc(b.p), v: F.locV(b.v) }, inc = incoming(st), sf = surf("FOOT_INSIDE", rj.foot), Dk = difficulty(sf, st, inc, 0).D, D = Dk * (1 + TDIFF.out * rj.s0 / RK.diff.vRef);
    const vh = hyp(st.v[0], st.v[1]), n = vh > 0.05 ? [-st.v[0] / vh, -st.v[1] / vh] : [-rj.dHat[0], -rj.dHat[1]], sig = wrapA(rj.dHat ? Math.atan2(rj.dHat[1], rj.dHat[0]) - c2.setOff.psi0 : 0) >= 0 ? 1 : -1;
    const Ax = { D, vIdeal: rj.vIdeal, nIn: n, dHat: rj.dHat, sig, vInS: max(0.05, vh) }, N = RT.turnDraws(c2.spec, nC), ex = RT.executeTurn(Ax, this.bc, N);
    rj.ex = ex; rj.D = D; rj.N = N; return { vL: ex.v, surface: "FOOT_INSIDE", F: rj.foot, D, ex };
  }
  // the episode's launches (RECEIVE-KILL / RECEIVE-TURN's own schedule() calls) become touch records: DRIBBLE-V1's last touch, the scorecard's
  // receive contact (c0 also fills RECEIVE-CONTROL-1.1's rx.contact so its scorecard reads the integrated receive unchanged)
  capture(fn) {
    const W = this.W, orig = W.schedule, got = []; W.schedule = function (L) { const r = orig.call(W, L); got.push(L); return r; };
    try { fn(); } finally { W.schedule = orig; } for (const L of got) this.touchFromEpisode(L);
  }
  touchFromEpisode(L) {
    const c2 = this.rc2, ep = c2.ep, b = this.W.ball, vk = L.velocity, isC0 = /\.c0$/.test(L.id), F = c2.kind === "TURN" ? (isC0 ? ep.A.F : (ep.follow && ep.follow.F) || ep.A.F) : (() => { const c = ep.contacts[ep.contacts.length - 1]; return c && c.sf.side === "L" ? "L" : "R"; })();
    const T = { id: L.id, k: L.tick, t: L.tick * DT, F, reg: L.metadata && L.metadata.surface || "INSIDE", hull: "boot", collider: `${this.pid}:boot_${F}`, swing: -1, receive: true, family: (L.metadata && (L.metadata.family || L.metadata.action)) || "RECEIVE", side: c2.kind === "TURN" ? ep.A.sig : 1, weak: F !== this.pref, arch: this.arch,
      ball: [b.p[0], b.p[1], -b.p[2]], pre: { v: [b.v[0], b.v[1], -b.v[2]], w: [-b.w[0], -b.w[1], b.w[2]] }, gap: 0, otherGap: 1, desired: { v: [vk[0], 0, -vk[2]], speed: hyp(vk[0], vk[2]), target: null, kNext: null }, executed: { v: [vk[0], 0, -vk[2]], speed: hyp(vk[0], vk[2]) },
      expect: { F: null, swing: null, k: null, com: null, target: null, inp: null }, minNext: 0.5, release: false, recovery: false, role: "receive", heldDir: null, setupSw: false, dec: null, contactAhead: 0, com: this.A.P.slice(), speedPlayer: hyp(this.A.V[0], this.A.V[1]), ctrl: this.ctrl.state, launched: false };
    this.touches.push(T); c2.lastRxTouch = T;
    if (isC0) { const ex = c2.kind === "TURN" ? ep.ex : ep.contacts[0].ex, vI = c2.kind === "TURN" ? ep.A.vIdeal : ep.contacts[0].ideal.v, vL = ex.v, dI = Math.atan2(vI[1], vI[0]), dA = Math.atan2(vL[1], vL[0]), sI = hyp(vI[0], vI[1]), sA = hyp(vL[0], vL[1]);
      this.rx.contact = { k: L.tick, T, ex: { dir: this.rc2.frame.head(dA), speed: sA, dirErrDeg: wrapA(dA - dI) / DEG, speedErr: sA - sI, sigDirDeg: 0, sigSpeed: 0 }, act: null };
      this.rx.act = { k0: c2.k0, kc: c2.kc, rest: true, ideal: { speed: sI, dir: this.rc2.frame.head(dI) }, hold: this.rx.hold }; }
  }
  // RECEIVE-CONTROL-1.1's summary for a standing receiver's integrated receive (the fields its scorecard reads)
  summary() {
    if (this.rx.stand !== true || !this.rc2) return super.summary();
    const rx = this.rx, c2 = this.rc2, ep = c2.ep, c = rx.contact, T = c ? c.T : null, fam = ep ? (c2.kind === "TURN" ? ep.A.fid : "KILL_" + ep.plan.sf.key) : null;
    return { cls: rx.cls, intent: rx.intent, hold: rx.hold, bc: this.bc, action: ep ? { id: c2.cls.ev, fam, F: c2.kind === "TURN" ? ep.A.F : ep.plan.sf.side, side: c2.kind === "TURN" ? ep.A.sig : 0, surface: c2.kind === "TURN" ? ep.A.surface : ep.plan.sf.key, k0: c2.k0, kc: c2.kc, tc: r3(c2.kc * DT), th: rx.handoff ? r3(rx.handoff.k * DT) : null,
        D: r3(c2.kind === "TURN" ? ep.A.D : ep.plan.dif.D), rotPre: c2.kind === "TURN" ? +(ep.A.psiC / DEG).toFixed(1) : 0, rotExit: c2.kind === "TURN" ? +(ep.A.dPsi / DEG).toFixed(1) : 0, ideal: { dirRel: null, vsExit: null, speed: c ? r2(rx.act.ideal.speed) : null }, sIn: c2.kind === "TURN" ? r2(ep.A.vInS || 0) : r2(ep.plan.inc.speed), s0: 0, sC: 0, vH: rx.handoff ? r2(rx.handoff.v) : null } : null,
      contact: T ? { k: T.k, launched: !!T.launched, cancelled: T.cancelled || null, exec: { dirAbs: +(c.ex.dir / DEG).toFixed(1), speed: r2(c.ex.speed), dirErr: +c.ex.dirErrDeg.toFixed(2), speedErr: r2(c.ex.speedErr), sigDir: 0, sigSpeed: 0 } } : null,
      handoff: rx.handoff, plans: rx.plans, cands: rx.cands, rej: rx.rej, cpu: { rx: Math.round(rx.cpuRx), plan: Math.round(c2.cpu.plan) } };
  }
  // one scheduled receive touch of the episode's own (the rejoin / set-off push): executed now, one kernel launch, a touch record DRIBBLE-V1 reads
  scheduleTouch(L) {
    const F = this.rc2.frame, b = this.W.ball, o = L.build(), vk = F.kerV(o.vL), wk = rollK(vk);
    this.W.schedule({ id: L.id, tick: this.k, position: b.p.slice(), maxContactError: RX.contactTol, velocity: vk, spin: wk, colliderId: null, preparedAt: this.W.time, metadata: { family: "RECEIVE_" + L.kind, technique: o.surface, selectedFoot: o.F, preferredFoot: this.pref, seed: this.seed, model: "receive-control-v2" } });
    const sp = hyp(this.A.V[0], this.A.V[1]), rj = this.rc2.rejoin;
    const T = { id: L.id, k: this.k, t: this.k * DT, F: o.F, reg: "INSIDE", hull: "boot", collider: `${this.pid}:boot_${o.F}`, swing: -1, receive: true, family: L.kind, side: 1, weak: o.F !== this.pref, arch: this.arch,
      ball: [b.p[0], b.p[1], -b.p[2]], pre: { v: [b.v[0], b.v[1], -b.v[2]], w: [-b.w[0], -b.w[1], b.w[2]] }, gap: 0, otherGap: 1,
      desired: { v: [vk[0], 0, -vk[2]], speed: hyp(vk[0], vk[2]), target: ((tp) => [tp[0], 0, -tp[1]])(F.pitch(rj.target)), kNext: this.rc2.kDribble }, executed: { v: [vk[0], 0, -vk[2]], speed: hyp(vk[0], vk[2]) },
      expect: { F: null, swing: null, k: this.rc2.kDribble, com: null, target: null, inp: null }, minNext: max(0.2, (this.rc2.kDribble - this.k) * DT), release: false, recovery: false, role: "receive", heldDir: null, setupSw: false, dec: null,
      contactAhead: 0, com: this.A.P.slice(), speedPlayer: sp, ctrl: this.ctrl.state, launched: false };
    this.touches.push(T); this.rc2.lastRxTouch = T;
  }
  // ── the action's authored FOOTWORK (the presentation body uses the same plan): RECEIVE-TURN-1.1's footstep planner on this episode's facts ───
  footwork() {
    const c2 = this.rc2; if (c2.fw !== undefined) return c2.fw; if (c2.kind !== "TURN" || !this.cfg.E || !this.cfg.skel) return (c2.fw = null);
    const ep = c2.ep, prep = { A: ep.A, kc: c2.kc - c2.k0 }, epi = { meet: ep.meet, follow: ep.follow, ex: ep.ex, m: { cls: ep.cls } };
    c2.fw = new HumanTurnBody(this.cfg.E, this.cfg.M4, this.cfg.skel, prep, epi); c2.fwT0 = c2.k0; return c2.fw;
  }
  // ── TURN-1.2 TAKES THE BODY (at the rejoin foot's touchdown): the action's state becomes a TURN-1.2 actor; no dribble resolver yet ───────────────
  switchToT12() {
    const c2 = this.rc2, rx = this.rx, k = this.k, st = this.root2(k), F = c2.frame, rj = c2.rejoin, th = rx.exitDir, v = max(RX.vFloor, hyp(st.V[0], st.V[1]));
    const A1 = this.T1.t1Make(this.cfg.skel, { v, heading: th, pos: st.P.slice(), foot: rj.foot, turn12: true }); rebase(A1, k * DT);
    if (this.cfg.TURN11) this.cfg.TURN11.attach(A1, { mode: "t12" });
    A1.input = { dir: th, v: Math.min(Math.max(rx.exitV, RX.vFloor), Math.max(RX.vFloor, v + RX.exitRamp.dv)) };
    this.A = A1; this.adjs = { R: {}, L: {} }; this.evalPose(A1); this.framesPrev = boneFramesOf(A1, A1.fk); this.prevColV = null; this.input = A1.input;
    c2.t12 = { k, P: st.P.map(r3), v: r2(v), dir: +(th / DEG).toFixed(2), foot: rj.foot }; c2.phase = "exit"; c2.log.push({ k, ev: "turn12", v: r2(v), foot: rj.foot });
    rx.handoff = { k, t: r3(k * DT), P: st.P.slice(), v, dir: +(th / DEG).toFixed(2), foot: rj.foot, ballRel: null, ballSpeed: null };
    if (this.body2) this.body2.end(k);
    if (k >= c2.kDribble) this.dribbleOn();
  }
  // ── DRIBBLE-V1 TAKES THE BALL: the frozen resolver's state is fresh, the rejoin touch is its last touch (the ball en route to where it was sent) ─
  dribbleOn() {
    const k = this.k, rx = this.rx, c2 = this.rc2;
    this.plan = null; this.job = null; this.locoCache = null; this.ballCache = null; this.track = null; this.adoptable = []; this.genMemo = null; this.ftHold = null; this.carry = null; this.carryTask = null;
    this.held = null; this.userDir = rx.exitDir; this.stageDir = null; this.replanAt = k; this.recoverAt = k; this.lastPursuit = k;
    if (c2.lastRxTouch) this.lastTouch = c2.lastRxTouch;
    const b = this.ballA(), dl = Math.cos(rx.exitDir), dr = Math.sin(rx.exitDir), dx = b.p[0] - this.A.P[0], dy = -b.p[2] - this.A.P[1];
    rx.handoff = Object.assign({}, rx.handoff, { kDribble: k, ballRel: [r3(dx * dl + dy * dr), r3(-dx * dr + dy * dl)], ballSpeed: r2(hyp(b.v[0], b.v[2])), vNow: r2(hyp(this.A.V[0], this.A.V[1])) });
    rx.phase = "dribble"; c2.phase = "dribble"; c2.log.push({ k, ev: "dribble", ballRel: rx.handoff.ballRel });
  }
  classify(k) {
    const c2 = this.rc2;
    if (c2 && c2.phase !== "moving" && c2.phase !== "dribble" && this.rx.hold && c2.ep && k > c2.kc) { const b = this.ballA(), d = Math.hypot(b.p[0] - this.A.P[0], b.p[2] + this.A.P[1]), st = d < 1.0 && Math.hypot(b.v[0], b.v[2]) < 1.5 ? "CONTROLLED" : "LOOSE";
      if (st !== this.ctrl.state) { this.ctrl.changes.push({ k, t: k * DT, from: this.ctrl.state, to: st, dist: d }); this.ctrl.state = st; this.ctrl.since = k; } this.ctrl.dist = d; return; }
    return super.classify(k);
  }
  // ── a moving receiver's contact: RECEIVE-CONTROL-1.1's action, executed with the SAME Ball Control model as every receive touch ──────────────────
  contactNow(k, act) {
    const b = this.W.ball, F = new Frame(this.A.P, this.A.psi), st = { p: F.loc(b.p), v: F.locV(b.v) }, Vb = F.locV([this.A.V[0], 0, this.A.V[1]]), vrel = [st.v[0] - Vb[0], st.v[1] - Vb[1], st.v[2]];
    const inc = incoming({ p: st.p, v: vrel }), sfKey = RC2.surfaceMap[act.surface] || "FOOT_INSIDE", sf = surf(sfKey, act.F), Dk = difficulty(sf, st, inc, 0).D;
    const rotIn = (RC2.movingRotIn[act.fam.id] || 0) * abs(act.dRot || 0) / Math.PI, D = Dk * (1 + TDIFF.rot * rotIn + (TDIFF.surface[act.surface] || 0) + TDIFF.out * act.ideal.speed / RK.diff.vRef);
    const vOutL = F.locV([act.ideal.vOut[0], 0, act.ideal.vOut[1]]), sOut = hyp(vOutL[0], vOutL[1]), dHat = sOut > 1e-9 ? [vOutL[0] / sOut, vOutL[1] / sOut] : [1, 0], vrh = hyp(vrel[0], vrel[1]), n = vrh > 0.05 ? [-vrel[0] / vrh, -vrel[1] / vrh] : [1, 0];
    if (!act.eventId2) act.eventId2 = this.newEvent();
    const spec = this.spec(act.eventId2), N = RT.turnDraws(spec, 0), ex = RT.executeTurn({ D, vIdeal: [vOutL[0], vOutL[1], 0], nIn: n, dHat, sig: act.sg || 1, vInS: max(0.05, vrh) }, this.bc, N);
    const vk = F.kerV([ex.v[0], ex.v[1], 0]), wk = rollK(vk), id = `${this.pid}:${act.eventId2}.c0`;
    this.W.schedule({ id, tick: k, position: act.cK.slice(), maxContactError: RX.contactTol, velocity: vk, spin: wk, colliderId: null, preparedAt: this.W.time,
      metadata: { family: "RECEIVE_" + act.fam.id, technique: act.surface, selectedFoot: act.F, preferredFoot: this.pref, seed: this.seed, model: "receive-control-v2" } });
    const sp = hyp(this.A.V[0], this.A.V[1]), dirE = Math.atan2(vk[2], vk[0]), speedE = hyp(vk[0], vk[2]);
    const exO = { dir: dirE, speed: speedE, dirErrDeg: wrapA(dirE - act.ideal.dir) / DEG, speedErr: speedE - act.ideal.speed, sigDirDeg: Math.atan2(ex.sigma.direction, max(0.3, act.ideal.speed)) / DEG, sigSpeed: ex.sigma.weight, N: [N.direction, N.weight], bc: this.bc, D, keyId: N.keyIds ? N.keyIds.direction : null, model: "receive-control-v2" };
    const T = { id, k, t: k * DT, F: act.F, reg: act.surface, hull: "boot", collider: `${this.pid}:boot_${act.F}`, swing: -1, receive: true, family: act.fam.id, side: act.sg, weak: act.F !== this.pref, arch: this.arch,
      ball: [b.p[0], b.p[1], -b.p[2]], pre: { v: [b.v[0], b.v[1], -b.v[2]], w: [-b.w[0], -b.w[1], b.w[2]] }, gap: 0, otherGap: 1,
      desired: { v: [act.ideal.vOut[0], 0, -act.ideal.vOut[1]], speed: act.ideal.speed, target: [act.X[0], 0, -act.X[1]], kNext: act.kNext },
      executed: { v: [vk[0], 0, -vk[2]], speed: speedE }, error: { dirDeg: exO.dirErrDeg, speed: exO.speedErr, N: exO.N, bc: this.bc, D, keyId: exO.keyId },
      expect: { F: null, swing: null, k: act.kNext, com: null, target: null, inp: null }, minNext: Math.max(0.2, act.hold ? 0.5 : (act.kh - act.kc) * DT), release: false, recovery: false, role: "receive", heldDir: null, setupSw: false, dec: null,
      contactAhead: F.loc(b.p)[0], com: this.A.P.slice(), speedPlayer: sp, ctrl: this.ctrl.state, launched: false };
    this.touches.push(T); this.rx.contact = { k, T, ex: exO, act }; this.rc2.moving = { ev: act.eventId2, D, N: { damping: N.damping, weight: N.weight, direction: N.direction, vertical: N.vertical }, ex: { v: ex.v, E: ex.E, capped: ex.capped } };
  }
  // ── the summary (the evidence reads this) ──────────────────────────────────────────────────────────────────────────────────────────────────
  summary2() {
    const c2 = this.rc2, ep = c2.ep, base = this.rx.stand ? null : this.summary(), ev = this.W.events.filter((e) => (e.kind === "AUTHORITATIVE_LAUNCH" || e.kind === "LAUNCH_CANCELLED") && String(e.id).startsWith(this.pid + ":R")).map((e) => ({ id: e.id.split(":")[1], kind: e.kind === "AUTHORITATIVE_LAUNCH" ? "LAUNCH" : "CANCELLED", tick: e.tick != null ? e.tick : null, reason: e.reason || null }));
    if (!this.rx.stand) return { mode: "moving", base, moving: c2.moving || null, launches: ev };
    let m = null; if (ep && c2.kind === "TURN") { if (!ep.m) ep.finish(); m = Object.assign({}, ep.m); } else if (ep) m = { contacts: ep.contacts.length, surfaces: ep.contacts.map((c) => c.sf.key), notes: ep.notes };
    return { mode: "stationary", cls: c2.cls, kind: c2.kind || null, family: ep ? (c2.kind === "TURN" ? ep.A.fid : ep.plan.sf.key) : null, foot: ep && c2.kind === "TURN" ? ep.A.F : null, surface: ep && c2.kind === "TURN" ? ep.A.surface : null,
      kc: c2.kc, episode: m, rejoin: c2.rejoin ? { kind: c2.rejoin.setOff ? "SET-OFF" : "REJOIN", k: c2.rejoin.kM, foot: c2.rejoin.foot, s0: r2(c2.rejoin.s0), D: c2.rejoin.D != null ? r3(c2.rejoin.D) : null } : null,
      stableAt: c2.stableAt != null ? r3(c2.stableAt * DT) : null, t12: c2.t12 || null, handoff: this.rx.handoff, phase: c2.phase, launches: ev, log: c2.log, cpu: { plan: r2(c2.cpu.plan), ep: r2(c2.cpu.ep) } };
  }
}
const now = (typeof performance !== "undefined" && performance.now) ? () => performance.now() : () => Date.now();
