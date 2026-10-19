// ═══ receive_control2/rc2_episode.js — RECEIVE-CONTROL-2: the RECEIVE-KILL and RECEIVE-TURN episodes as LIVE controllers on any ball kernel ═══════
// RECEIVE-KILL (receive_turn1/rk_*: curve B, bounded keyed draws, foot / thigh / chest / head, follow-up foot control) and RECEIVE-TURN
// (receive_turn1/rt_*: directional, half-turn, outside-of-foot, through-stance; continuation) were built as stand-alone episode runners, each in
// its own ball world. Here the same decisions run INSIDE another world — the frozen DRIBBLE-V1 simulation's BallWorld — one tick at a time:
//   pre(W)  before the kernel step of tick W.tick: the authoritative contact (execution with the keyed draws, one schedule() launch)
//   post(W) after it: the decisions RECEIVE-KILL / RECEIVE-TURN take on the REAL ball once a launch has happened (re-prediction, follow-up control,
//           the continuation) — each scheduled launch is again one kernel schedule() with the kernel's contact window
// Nothing is re-implemented: selection, execution, draws, follow-up planning and the continuation are the receive_turn1 modules' own functions
// (imported unchanged); only the two private helpers they keep inside rk_sim / rt_sim (stableAlone, drawsKill) are copied verbatim.
// FRAMES. The receive frame is RECEIVE-KILL's local frame [f, r, z] (forward, right, up) about the receiver's stance and facing. The DRIBBLE-V1
// kernel stores the ball as [x, h, y] (pitch y), RECEIVE-KILL's own world as [x, h, −y]: mirror images. With the receiver at RECEIVE-KILL's
// stance (pitch 40, 34) facing 0 the frame transforms are pure copies / subtractions, and an episode here is bit-identical to the stand-alone one
// (tools/rc2_equiv.mjs proves it on the turn matrix and the kill matrices).
import { RK, R, DT, v3, surf, incoming, difficulty, surfaceIdeal, idealVel, execute as executeKill, VAR, bounded } from "../receive_turn1/rk_model.js";
import { cloneWorld, planFollow, solveExit, stableNow, drawsFor, spinFor } from "../receive_turn1/rk_sim.js";
import { turnDraws, executeTurn, findMeet, CONT, TEXEC } from "../receive_turn1/rt_sim.js";
import { MOVE, DEG, wrapA, turnTime } from "../receive_turn1/rt_actions.js";
import { KeyedRNG } from "../dribble1/d1_rng.js";
import { dsin, dcos } from "../physchar2/core/v2_math.js";
const hyp = Math.hypot, abs = Math.abs, max = Math.max, min = Math.min;
export { R, DT };

// ── the receive frame: the receiver's stance P0 (pitch) and facing h0 (pitch heading, + = right turn; right = (−sin, cos)) ─────────────────────────
export class Frame {
  constructor(P0, h0) { this.P0 = [P0[0], P0[1]]; this.h = h0; this.id0 = h0 === 0; this.c = this.id0 ? 1 : dcos(h0); this.s = this.id0 ? 0 : dsin(h0); }
  loc(pk) { const dx = pk[0] - this.P0[0], dy = pk[2] - this.P0[1]; return this.id0 ? [dx, dy, pk[1]] : [dx * this.c + dy * this.s, -dx * this.s + dy * this.c, pk[1]]; }
  locV(vk) { return this.id0 ? [vk[0], vk[2], vk[1]] : [vk[0] * this.c + vk[2] * this.s, -vk[0] * this.s + vk[2] * this.c, vk[1]]; }
  ker(pl) { return this.id0 ? [this.P0[0] + pl[0], pl[2], this.P0[1] + pl[1]] : [this.P0[0] + pl[0] * this.c - pl[1] * this.s, pl[2], this.P0[1] + pl[0] * this.s + pl[1] * this.c]; }
  kerV(vl) { return this.id0 ? [vl[0], vl[2], vl[1]] : [vl[0] * this.c - vl[1] * this.s, vl[2], vl[0] * this.s + vl[1] * this.c]; }
  pitch(l) { return this.id0 ? [this.P0[0] + l[0], this.P0[1] + l[1]] : [this.P0[0] + l[0] * this.c - l[1] * this.s, this.P0[1] + l[0] * this.s + l[1] * this.c]; }   // local [f, r] → pitch [x, y]
  pitchV(l) { return this.id0 ? [l[0], l[1]] : [l[0] * this.c - l[1] * this.s, l[0] * this.s + l[1] * this.c]; }
  head(psiL) { return this.h + psiL; }                                                                                          // local heading → pitch heading
}
// the kernel's rolling spin for a kernel-frame velocity (RECEIVE-KILL's rollW(toWv(v)) mirrored; DRIBBLE-V1's convention)
export const rollK = (vk) => [vk[2] / R, 0, -vk[0] / R];
// the free ball (no colliders) from a kernel world's CURRENT state in the receive frame: i = ticks from now (RECEIVE-KILL's predictFrom)
export function predictK(W, horizon, F) { const C = cloneWorld(W), n = Math.round(horizon / DT), P = [{ p: F.loc(C.ball.p), v: F.locV(C.ball.v), pk: C.ball.p.slice() }];
  for (let i = 1; i <= n; i++) { C.step(); P.push({ p: F.loc(C.ball.p), v: F.locV(C.ball.v), pk: C.ball.p.slice() }); } return P; }
// (verbatim from rk_sim.js: private there) the first index ≥ i0 from which the ball stays stable for `hold` s (the receiver standing at S), or −1
function stableAlone(P, S, i0, window) { const H = Math.round(RK.stable.hold / DT), n = min(P.length - 1, i0 + Math.round(window / DT)); let run = 0; for (let i = i0; i <= n; i++) { if (stableNow(P[i], S)) { run++; if (run > H) return i - H; } else run = 0; } return -1; }
// (verbatim from rt_sim.js: private there) the extra control touch's draws: the kill model's dimensions on this receive event's contact n
function drawsKill(spec, n, sig = 1) {
  if (spec.example) { const x = spec.example === "PERFECT" ? 0 : 0.674; return { reb: x, lat: x, third: x }; }
  const rng = new KeyedRNG(spec.seed == null ? 1 : spec.seed), key = ["RECEIVE", spec.receiver || "CAL-R", spec.receiveEvent || TEXEC.event, "c" + n, VAR.id], o = {};
  for (const [a, nm] of [["reb", "damping"], ["lat", "direction"], ["third", "vertical"]]) o[a] = bounded(rng.normal(...key, nm, 0));
  o.lat *= sig; return o;
}
const stableNear = (st, S) => { const T = RK.stable, vh = hyp(st.v[0], st.v[1]); return st.p[2] <= T.zMax && abs(st.v[2]) <= T.vzMax && vh <= T.vRel && hyp(st.p[0] - S[0], st.p[1] - S[1]) <= T.radius; };
const offLineOf = (A, p) => { const R0 = A.path.endRoot, u = A.path.u, d = [p[0] - R0[0], p[1] - R0[1]]; return -d[0] * u[1] + d[1] * u[0]; };
const findLaunch = (W, id) => W.events.find((e) => e.id === id && (e.kind === "AUTHORITATIVE_LAUNCH" || e.kind === "LAUNCH_CANCELLED"));

// ═══ THE TURN EPISODE (RECEIVE-TURN-1's runTurn, live) ═══════════════════════════════════════════════════════════════════════════════════════════
//   A: selectTurn()'s action (local frame, contact tick A.k after the pass's strike); kc: its absolute kernel tick; spec: { seed, receiver,
//   receiveEvent } (the semantic key: the same receive event keeps the same draws whatever module runs it); o.carry: "rt" = RECEIVE-TURN-1's
//   ideal continuation push (the stand-alone clips), "none" = no continuation launch (the integrated pipeline makes its own rejoin)
export class TurnEpisode {
  constructor({ A, F, kc, bc, spec, idPrefix, carry }) { Object.assign(this, { A, F, kc, bc, spec, idp: idPrefix || "turn1", carryMode: carry || "rt" }); this.rec = []; this.done = false; this.contacts = 0; this.launchIds = []; }
  pre(W) {
    if (W.tick !== this.kc) return; const A = this.A, F = this.F, vb = F.locV(W.ball.v);
    A.vInS = hyp(vb[0], vb[1]); A.vIdeal = [A.vOut[0], A.vOut[1], 0]; A.C3 = F.loc(W.ball.p); this.Ck = W.ball.p.slice();
    this.N = turnDraws(this.spec, 0); this.ex = executeTurn(A, this.bc, this.N); const vk = F.kerV(this.ex.v);
    W.schedule({ id: this.idp, tick: this.kc, position: W.ball.p.slice(), velocity: vk, spin: rollK(vk), maxContactError: 0.06, preparedAt: 0, colliderId: null, metadata: { action: "RECEIVE-TURN", family: A.fid, surface: A.surface } });
    this.launchIds.push(this.idp); this.contacts = 1;
  }
  post(W) {
    const i = W.tick - this.kc; if (i < 1) return; this.rec.push({ i, p: this.F.loc(W.ball.p), v: this.F.locV(W.ball.v) });
    if (i !== 1) return;
    // the continuation, decided once on the real ball after the contact (index = ticks after the contact)
    const A = this.A, F = this.F, P = [{ p: A.C3, v: this.ex.v.slice(), pk: this.Ck }].concat(predictK(W, 3.4, F)); this.P = P;
    const meet = findMeet(A, P); let cls = null, tCont = null, extraAdj = null, extraT = null, offLine = null, follow = null, carry = null; const notes = [];
    if (meet) { extraAdj = meet.dev; extraT = meet.t - A.tRec; offLine = offLineOf(A, meet.ball); tCont = meet.t;
      cls = extraAdj <= CONT.imm.adj && extraT <= CONT.imm.t && abs(offLine) <= CONT.imm.off ? "IMMEDIATE" : extraAdj <= CONT.adjMax && extraT <= CONT.tMax ? "ADJUSTED" : null; }
    if (!cls) {
      const path = A.path, iFree = Math.round(max(MOVE.react + 0.10, path.Trot * 0.8) / DT), Sp = path.rootAt(iFree * DT), keepPref = RK.plan.prefFoot; RK.plan.prefFoot = A.pref; const c = planFollow(P, { S: Sp, iFree }); RK.plan.prefFoot = keepPref;
      if (!c.none) {
        const id2 = surfaceIdeal(c.sf, c.st, c.inc, c.shift); id2.base = solveExit({ ideal: id2, contact: c.st.p }); id2.v = idealVel(id2, id2.base.s); const N2 = drawsKill(this.spec, 1, A.sig), ex2 = executeKill(c.sf, id2, c.inc, this.bc, c.dif.D, N2), vk = F.kerV(ex2.v);
        W.schedule({ id: this.idp + ".f1", tick: this.kc + c.i, position: P[c.i].pk, velocity: vk, spin: rollK(vk), maxContactError: 0.06, preparedAt: W.time, colliderId: null, metadata: { action: "CONTROL", surface: c.sf.key } });
        this.launchIds.push(this.idp + ".f1"); this.contacts = 2;
        follow = { i: c.i, t: c.i * DT, sf: c.sf.key, F: c.sf.side, stance: c.shift.slice(), from: Sp, adjust: c.dS, D: c.dif.D, ex: ex2, contact: c.st.p.slice(), N: N2 };
        cls = "RECOVERY"; extraAdj = c.dS; notes.push(`extra control touch at +${follow.t.toFixed(2)} s (${c.sf.key})`);
      } else if (meet) { cls = "RECOVERY"; notes.push("met only with a large correction / late"); }
      else { cls = "UNSTABLE"; notes.push("no meeting and no control touch within the window"); }
    }
    if (meet && cls !== "RECOVERY" && cls !== "UNSTABLE" && this.carryMode === "rt") { const vp = A.path.speedAt(meet.t), sp = vp + CONT.carry, u = A.path.u; carry = { i: meet.i, t: meet.t, v: [u[0] * sp, u[1] * sp, 0] }; const vk = F.kerV(carry.v);
      W.schedule({ id: this.idp + ".carry", tick: this.kc + meet.i, position: P[meet.i].pk, velocity: vk, spin: rollK(vk), maxContactError: 0.06, preparedAt: W.time, colliderId: null, metadata: { action: "CONTINUE" } }); this.launchIds.push(this.idp + ".carry"); }
    Object.assign(this, { meet, follow, carry, cls, tCont, extraAdj, extraT, offLine, notes });
  }
  // after the episode: stable control after an extra touch (RECEIVE-TURN-1's measure), from the recorded ball
  finish() {
    const A = this.A, f = this.follow; let cls = this.cls, tCont = this.tCont, extraT = this.extraT;
    if (f) { const H = Math.round(RK.stable.hold / DT); let run = 0, iSt = -1;
      for (const r of this.rec) { if (r.i < f.i + Math.round(0.12 / DT)) continue; if (stableNear(r, f.stance)) { run++; if (run > H) { iSt = r.i - H; break; } } else run = 0; }
      if (iSt >= 0) { const dirNow = Math.atan2(f.contact[1] - f.from[1], f.contact[0] - f.from[0]), back = abs(wrapA(A.theta - dirNow)) / DEG; tCont = iSt * DT + turnTime(back) * 0.6; extraT = tCont - A.tRec; f.tStable = iSt * DT; }
      else { cls = "UNSTABLE"; this.notes.push("the extra control did not settle the ball"); tCont = null; extraT = null; } }
    this.m = { cls, tCont, extraAdj: this.extraAdj, extraT, offLine: this.offLine, contacts: this.contacts, meet: this.meet ? { t: this.meet.t, i: this.meet.i, dev: this.meet.dev, ball: this.meet.ball, Q: this.meet.Q } : null, follow: f ? { t: f.t, surface: f.sf, adjust: f.adjust, tStable: f.tStable } : null, notes: this.notes };
    this.done = true; return this.m;
  }
}

// ═══ THE KILL / CONTROL EPISODE (RECEIVE-KILL's runEpisode, live) ════════════════════════════════════════════════════════════════════════════════
//   plan: planKill()'s action (local; contact tick plan.k after the strike); ideal: its ideal (surfaceIdeal + solveExit + idealVel); stance: plan.shift
export class KillEpisode {
  constructor({ plan, ideal, F, kc, bc, spec, idPrefix }) {
    Object.assign(this, { plan, ideal, F, kc, bc, spec, idp: idPrefix || "kill1" }); this.contacts = []; this.moves = []; this.notes = []; this.rec = []; this.launchIds = []; this.f = 0; this.nextDecision = null; this.closed = false;
  }
  draw(n) { return drawsFor(Object.assign({}, this.spec, { event: n === 0 ? "kill1" : "kill1.f" + n, contact: n })); }
  pre(W) {
    if (W.tick !== this.kc) return; const plan = this.plan, F = this.F, N1 = this.draw(0), ex1 = executeKill(plan.sf, this.ideal, plan.inc, this.bc, plan.dif.D, N1), vk = F.kerV(ex1.v);
    W.schedule({ id: this.idp, tick: this.kc, position: W.ball.p.slice(), velocity: vk, spin: this.ideal.rolling ? rollK(vk) : [0, 0, 0], maxContactError: 0.06, preparedAt: 0, colliderId: null, metadata: { action: "KILL", surface: plan.sf.key } });
    this.launchIds.push(this.idp);
    const stance = plan.shift.slice(), contact = plan.st.p.slice();
    this.contacts.push({ n: 1, k: this.kc, i: 0, sf: plan.sf, group: plan.sf.S.group, stance, contact, ex: ex1, ideal: this.ideal, D: plan.dif.D, N: N1, prep: plan.sf.S.prep, inc: plan.inc });
    const Ff = RK.follow, freeOf = (sf, z) => Ff.free[sf.S.group] + (sf.S.jumpFrom != null && z > sf.S.jumpFrom ? Ff.jump : 0);
    this.S = stance; this.group = plan.sf.S.group; this.iFree = Math.round(freeOf(plan.sf, contact[2]) / DT) - 1; this.nextDecision = this.kc + 1; this.f = 1;
  }
  post(W) {
    const i = W.tick - this.kc; if (i < 1) return; this.rec.push({ i, p: this.F.loc(W.ball.p), v: this.F.locV(W.ball.v) });
    if (this.closed || W.tick !== this.nextDecision) return;
    const Ff = RK.follow, F = this.F; if (this.f > Ff.maxFollow) { this.closed = true; return; }
    const P = predictK(W, Ff.horizon, F), alone = stableAlone(P, this.S, max(0, this.iFree), Ff.aloneWindow), needed = (this.f === 1 && this.group !== "FOOT") || alone < 0;
    if (!needed) { this.notes.push(`after contact ${this.f}: the ball settles by itself`); this.closed = true; return; }
    const c = planFollow(P, { S: this.S, iFree: max(0, this.iFree) }); if (this.f === 1) this.firstPlan = c;
    if (c.none) { this.notes.push(`follow-up ${this.f}: no feasible foot control (${Object.keys(c.rej).join("/")})`); this.closed = true; return; }
    const id2 = surfaceIdeal(c.sf, c.st, c.inc, c.shift), pp = { ideal: id2, contact: c.st.p }; id2.base = solveExit(pp); id2.v = idealVel(id2, id2.base.s);
    const N2 = this.draw(this.f), ex2 = executeKill(c.sf, id2, c.inc, this.bc, c.dif.D, N2), kAbs = W.tick + c.i, vk = F.kerV(ex2.v);
    W.schedule({ id: this.idp + ".f" + this.f, tick: kAbs, position: P[c.i].pk, velocity: vk, spin: id2.rolling ? rollK(vk) : [0, 0, 0], maxContactError: 0.06, preparedAt: W.time, colliderId: null, metadata: { action: "FOLLOW-UP", surface: c.sf.key } });
    this.launchIds.push(this.idp + ".f" + this.f);
    this.moves.push({ iA: i + max(0, this.iFree), iB: i + c.i - Math.round(0.10 / DT), from: this.S.slice(), to: c.shift.slice() });
    this.contacts.push({ n: this.f + 1, k: kAbs, i: i + c.i, sf: c.sf, group: "FOOT", stance: c.shift.slice(), contact: c.st.p.slice(), ex: ex2, ideal: id2, D: c.dif.D, N: N2, prep: Ff.prep, inc: c.inc, adjust: c.dS, wait: c.wait, earliest: c.earliest });
    this.S = c.shift.slice(); this.group = "FOOT"; this.iFree = Math.round(Ff.free.FOOT / DT) - 1; this.nextDecision = kAbs + 1; this.f++;
  }
  // the receiver's stance at ticks-after-contact i (the moves between contacts), RECEIVE-KILL's stanceAt
  stanceAt(i) { let S = this.contacts.length ? this.contacts[0].stance : this.plan.shift; for (const mv of this.moves) { if (i <= mv.iA) return S; if (i >= mv.iB) { S = mv.to; continue; } const u = (i - mv.iA) / Math.max(1, mv.iB - mv.iA); return [mv.from[0] + (mv.to[0] - mv.from[0]) * u, mv.from[1] + (mv.to[1] - mv.from[1]) * u]; } return S; }
}
