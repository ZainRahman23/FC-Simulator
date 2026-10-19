// ═══ receive_elite1/re1_core.js — RECEIVE-ELITE-1: ELITE TIGHT CONTROL — the 99 / 99 / 99 reference and the three attributes ═══════════════════════
// Owner (19 Oct): "the current turns put the ball too far into space … do not send the ball far into space merely to give the body time to turn".
// Why the previous model did: every receive-and-turn had ONE authored contact whose ideal sent the ball to the point where the body would next
// meet it after its whole turn — RECEIVE-TURN-1's reconnection (the root after the rotation and a 0.55 – 0.75 m run, + 0.40 m), RECEIVE-CONTROL-1.1's
// handoff point (the ball HANDOFF_AHEAD = 1.2 – 2.4 m ahead of the runner when DRIBBLE-V1 takes it) — and a moving receiver often touched the ball
// at his run speed and paid the turn after it (an overrun of 1 – 2 m): the ball had to travel as far as the body's slowest moment.
//
// RECEIVE-ELITE-1 — authored football actions, authoritative contacts, the rigid-body ball between them:
//   the receive TECHNIQUE is selected exactly as before (RECEIVE-TURN-1's selection for a standing receiver, RECEIVE-CONTROL-1.1's families for a
//   moving one — the taxonomy, the feet, the surfaces, the contact tick); what changes is everything after the selection:
//   · AGILITY authors the BODY: the braking into the plant, the redirection of the centre of mass after the contact, the hip rotation, a standing
//     pivot's set-up and rate, the acceleration out, the support-step period — an authored path (never a force simulation) the animation explains
//   · DRIBBLING authors the FEET: after the first contact the ball is played again at the cadence of rapid technical foot actions (alternating feet;
//     the same foot only after its own swing cycle), each touch inside a swing of the foot that plays it
//   · each contact's IDEAL places the ball where the NEXT touching foot will be — a point just ahead of the body on its authored path at the next
//     contact (the ball follows the body through the turn in short segments) — and the LAST contact of the sequence, once the body is on its exit
//     line and moving out, is the exit touch DRIBBLE-V1 takes over (its takeover state: the ball on the runner's line ahead of him)
//   · BALL CONTROL executes every contact (RECEIVE-TURN-1's curve-B execution, the bounded keyed draws, contact index = the sequence index)
//   · CLOSED LOOP: after each launch the player sees what his touch did (Dribbling's reaction time); the next foot plays the ball where it really is
//     if it is within reach of the plan (Dribbling's repositioning), else the run is corrected toward it (Agility's correction rate), else the
//     contact moves later / a recovery touch is made; a ball beyond all of that is released to DRIBBLE-V1 (its own recovery)
// The ball is never attached, parented, teleported or frozen: every contact is one kernel schedule() at the ball's own position, inside the
// kernel's contact window, and the ball is free between contacts. The presentation body (re1_body.js) explains the authored data; it never feeds
// back (animation ON / OFF identical: tools/re1_neutral.mjs).
// Kills, aerial controls, kill-and-go and the intents without a turn are RECEIVE-CONTROL-2's / RECEIVE-MOVING-1's, unchanged (bit-identical).
import { ReceiveSimM, RM, RX, BALL_DEFAULT, D1, DT, withBC } from "../receive_moving1/rm1_core.js";
import { ReceiveSim2 } from "../receive_control2/rc2_core.js";
import { boneFramesOf } from "../receive11/rx_core.js";
import { FAMILIES as FAM11, HANDOFF_AHEAD, S_ENTRY, SURF as SURF11, planSteps, herm, minSpeed, wrapA, clamp, s5, tab, hdg, toPitch, toLocal, sideOf, other } from "../receive11/rx_actions.js";
import { RXE, difficulty as difficulty11 } from "../receive11/rx_exec.js";
import { FAMILIES as FAMT, TDIFF, DEG, dir, toL2 } from "../receive_turn1/rt_actions.js";
import { REF } from "../receive_turn11/rt11_body.js";
import * as RT from "../receive_turn1/rt_sim.js";
import { RK, surf, incoming, difficulty } from "../receive_turn1/rk_model.js";
import { Frame, predictK, rollK } from "../receive_control2/rc2_episode.js";
import { mkWorld } from "../receive_turn1/rk_sim.js";
import { eliteParams, ATTR } from "./re1_attrs.js";
import { dsin, dcos } from "../physchar2/core/v2_math.js";
export { RX, RM, BALL_DEFAULT, D1, DT, withBC, ATTR };
const R = 0.11, hyp = Math.hypot, abs = Math.abs, max = Math.max, min = Math.min, r2 = (x) => Math.round(x * 100) / 100, r3 = (x) => Math.round(x * 1000) / 1000;
const lerp2 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t], sstep = (a, b, x) => s5((x - a) / Math.max(1e-6, b - a));
const now = (typeof performance !== "undefined" && performance.now) ? () => performance.now() : () => Date.now();
export const RE = {
  version: "RECEIVE-ELITE-1",
  touchU: 0.6,                    // a sequence contact happens at this share of the touching foot's swing (the foot plays the ball, then lands ahead)
  ahead: [0.30, 0.03, 0.46],      // m, m per m/s, max: the next contact point ahead of the body's centre (× Dribbling's spacing) — within the leg's reach …
  lat: 0.10,                      // m: … beside the centre line, on the touching foot's side
  exitTol: 15, velTol: 25,        // the body is on its exit (facing within exitTol°, moving within velTol°) …
  exitGo: 2.0,                    // … and running at ≥ the exit pace − exitGo (≥ TURN-1.2's slowest gait): the next contact is the exit touch — the player
                                  // accelerates out with close touches first, so the runner does not run onto a slowing ball after DRIBBLE-V1 takes it
  smallTurn: 30,                  // deg: a moving receive turning ≤ this plays its first touch into stride (the exit touch: a straight sprint uses the space ahead)
  maxContacts: 7,
  runGap: 0.36,                   // s: once the body is out on its exit line and running (≥ runFrom m/s), the touches spread to every other step
  runFrom: 3.0,
  flight: 0.04,                   // s: the next foot lifts this long before the previous one lands (running steps)
  run: [0.30, 0.22],              // s: the swing of a running step at 0 / 6 m/s (RECEIVE-TURN-1.1's cadence)
  exitAhead: HANDOFF_AHEAD,       // the exit touch: the ball on the runner's line this far ahead of him when DRIBBLE-V1 takes it (its takeover state) …
  exitAheadK: 1.0,                // … × this (tools/re1_exit_ab.mjs measured DRIBBLE-V1's takeover at 0.7 … 1.0)
  tauX: 0.55, settle: 0.6, aRun: 3.5, minExit: 0.8,   // the takeover ≥ tauX after the exit touch and ≥ settle after TURN-1.2 took the body; its runner model
  window: { tMin: 0.3, tMax: 1.6, band: 0.6, lat: 0.25, dv: 1.0 },   // DRIBBLE-V1's takeover window (RECEIVE-MOVING-1's)
  clearStand: 0.04,               // m: the first touch's path clears the standing foot by the ball radius + this
  recover: { window: 0.8, kAdj: 1.0 },   // a recovery: the contact up to window s later, the run corrected at kAdj × Agility's rate without the reach cap
  sweep: [0, 6, -6, 12, -12, 18, 24, 30, 36, 48],   // ticks: the next contact's timing adjustments, in preference order
  wLate: 1.5,                     // moving selection: score per (contact speed above the turn's entry speed) / entry speed — the elite body plants first
  wFirst: 2.0,                    // moving selection: score per metre the elite first touch cannot bring the ball to the next foot (beyond Dribbling's reach)
};
// the runner after TURN-1.2 takes the body at vSw: asked for min(vSw + exitRamp.dv, the exit pace) (RECEIVE-CONTROL-1.1's handoff input), reached at aRun
const runAfter = (vSw, dt, vX) => { const v1 = max(vSw, min(vSw + RX.exitRamp.dv, vX != null ? vX : Infinity)), a = RE.aRun, tA = (v1 - vSw) / a; return dt <= tA ? { d: vSw * dt + 0.5 * a * dt * dt, v: vSw + a * dt } : { d: vSw * tA + 0.5 * a * tA * tA + v1 * (dt - tA), v: v1 }; };
// the boot surface that can face an impulse α (deg, body frame, + right) of size dvM for foot F, among `allowed` (RECEIVE-CONTROL-1.1's SURF ranges and
// glancing tolerance): the best fit, or the least-bad one (ok false)
function fitSurface(F, alphaDeg, dvM, allowed) {
  const a = sideOf(F) * alphaDeg, tol = tab(SURF11.tol, dvM); let best = null;
  for (const s of allowed) { const [lo, hi] = SURF11[s].R, x = ((a - lo) % 360 + 360) % 360, w = hi - lo, off = dvM < SURF11.gentle || x <= w ? 0 : min(x - w, 360 - x), cost = off + SURF11[s].pref * 100;
    if (!best || (off <= tol) > (best.off <= best.tol) || ((off <= tol) === (best.off <= best.tol) && cost < best.cost)) best = { surface: s, off, tol, cost }; }
  return { surface: best.surface, glance: best.off, ok: best.off <= best.tol };
}
// ── THE AUTHORED BODY PATHS (receive frame, t relative to the first contact) ──────────────────────────────────────────────────────────────────────
// a standing receiver: RECEIVE-CONTROL-2's preparation (the stance shift and the opening over the last 0.8 s), then AGILITY's pivot about the
// standing foot (set-up + rate) and the run out along the exit (its acceleration, starting goShare into the pivot)
export function stationaryPath(A, ag, tPrep, vMax) {
  const dPsi = A.dPsi, Trot = ag.pivotBase + abs(dPsi / DEG) / ag.pivotOmega, tGo = ag.goShare * Trot, th = A.theta, dirFam = A.fid === "DIRECTIONAL", u = dir(th);
  const endRoot = dirFam ? A.S.slice() : toL2(A.stand, th, -A.standOff[0], -A.standOff[1]), a = ag.accel, tv = vMax / a;
  const run = (t) => (t <= 0 ? 0 : t <= tv ? 0.5 * a * t * t : 0.5 * a * tv * tv + vMax * (t - tv));
  return { kind: "stationary", Trot, tGo, th, u, endRoot, vMax, tPrep,
    base(t) { if (t <= 0) return lerp2([0, 0], A.S, sstep(tPrep, 0, t)); const b = lerp2(A.S, endRoot, s5(min(1, t / Trot))), d = run(t - tGo); return [b[0] + u[0] * d, b[1] + u[1] * d]; },
    psi(t) { if (t <= 0) return A.psiC * sstep(tPrep, 0, t); return A.psiC + dPsi * s5(min(1, t / Trot)); },
    tAligned: Trot };
}
// a moving receiver: RECEIVE-CONTROL-1.1's preparation (the cubic piece from the action start into the contact state, Agility's braking limit), then
// AGILITY's redirection — a cubic piece from the contact state to the exit line at the exit speed (duration ≥ the velocity change / aTurn and the
// rotation / the yaw rate) — and the acceleration out along the exit
export function movingPath(o, ag) {
  const { P0, V0, psi0, Tp, prep, Pc, Vc, psiC, thX, vH, vMax } = o, tS = o.tS || 0, u = dir(thX), Vh = [u[0] * vH, u[1] * vH], dV = hyp(Vh[0] - Vc[0], Vh[1] - Vc[1]), dRot = wrapA(thX - psiC);
  const Trot = max(0.12, 1.875 * abs(dRot) / (ag.omega * DEG)), Tx = max(0.16, dV / ag.aTurn, Trot * 0.8), Ph = [Pc[0] + (Vc[0] + Vh[0]) / 2 * Tx, Pc[1] + (Vc[1] + Vh[1]) / 2 * Tx], ex = herm(Pc, Vc, Ph, Vh, Tx);
  const a = ag.accel, v1 = max(vH, vMax), tA = (v1 - vH) / a, run = (t) => (t <= tA ? vH * t + 0.5 * a * t * t : vH * tA + 0.5 * a * tA * tA + v1 * (t - tA));
  const tR = max(tS, Tp - 0.45), rotPre = wrapA(psiC - psi0);
  return { kind: "moving", Trot, Tx, Ph, Vh, u, th: thX, ex, vMax: v1, dRot, tAligned: Trot,
    base(t) { if (t <= -Tp) return P0.slice(); if (t <= 0) return prep.at(t + Tp).P; if (t <= Tx) return ex.at(t).P; const d = run(t - Tx); return [Ph[0] + u[0] * d, Ph[1] + u[1] * d]; },
    psi(t) { if (t <= 0) { const ta = t + Tp; return psi0 + rotPre * s5((ta - tR) / Math.max(1e-3, Tp - tR)); } return psiC + dRot * s5(t / Trot); } };
}
// ═══ THE ELITE SEQUENCE: the receive contact, the rapid follow-up contacts, the exit touch — live in the kernel ══════════════════════════════════
export class EliteEpisode {
  // o: { F (frame), kc0, k0, path, mode, tech: { fid, label, F0 (first contact foot), surfaces (of the technique), famM, sig, theta, stand (the
  //   standing foot at the contact), lift0 / land0 (the first contact foot's swing), shift, firstExit }, el (eliteParams), bc, spec, idp, vFloor }
  constructor(o) {
    Object.assign(this, o); this.contacts = []; this.corr = []; this.notes = []; this.done = false; this.failed = false; this.exit = null; this.pending = null; this.ver = 0;
    this.swings = this.buildSwings();
    this.next = { i: 0, k: this.kc0, t: 0, F: this.tech.F0, Q: null, swing: this.swings[0], recovery: false };
    // (the presentation body's first contact pose before it is played: the plan on the kernel's predicted ball at the contact tick — no state changes)
    const b0 = this.tech.ballC0; if (b0) { const pv = this.preview(this.next, b0), dv = pv ? [pv.v[0] - b0.v[0], pv.v[1] - b0.v[1]] : null, l = dv ? hyp(dv[0], dv[1]) : 0;
      this.c0Preview = pv ? { i: 0, t: 0, F: this.tech.F0, surface: pv.surface, ball: [b0.p[0], b0.p[1], max(R, b0.p[2] != null ? b0.p[2] : R)], vIn: b0.v.slice(0, 2), vOut: pv.v, n: l > 1e-6 ? [dv[0] / l, dv[1] / l] : [1, 0] } : null; }
  }
  // ── the authored body (base path + the corrections toward the real ball, each blended in from its decision and kept afterwards) ──────────────
  rootAt(t) { let p = this.path.base(t); for (const c of this.corr) if (t > c.t0) { const w = s5((t - c.t0) / max(1e-6, c.t1 - c.t0)); p = [p[0] + c.d[0] * w, p[1] + c.d[1] * w]; } return p; }
  velAt(t) { const a = this.rootAt(t), b = this.rootAt(t + DT); return [(b[0] - a[0]) / DT, (b[1] - a[1]) / DT]; }
  psiAt(t) { return this.path.psi(t); }
  speedBase(t) { const a = this.path.base(t), b = this.path.base(t + DT); return hyp(b[0] - a[0], b[1] - a[1]) / DT; }
  // ── THE FOOTWORK (authoritative: the simulation's own plan — the contact feet, the touchdown TURN-1.2 takes the body at; the presentation shows
  // it): the first contact foot's swing (lift → the contact → its landing, the first step out), then alternating steps — Agility's support-step
  // period while the body is still turning or slow, the running cadence once it is out on the exit
  buildSwings() {
    const T = this.tech, ag = this.el.agi, out = [{ F: T.F0, t0: T.lift0, t1: T.land0, first: true }];
    let t0 = T.land0 + (this.mode === "stationary" ? 0.04 : -RE.flight), side = other(T.F0);
    while (t0 < 4.0 && out.length < 28) { const v = this.speedBase(t0 + 0.08), turning = abs(wrapA(this.path.psi(t0 + 0.1) - this.path.th)) > 20 * DEG || v < 2.2;
      const dT = turning ? ag.stepT + RE.flight : clamp(RE.run[0] + (RE.run[1] - RE.run[0]) * v / 6, RE.run[1], RE.run[0]);
      out.push({ F: side, t0, t1: t0 + dT }); t0 = t0 + dT - RE.flight; side = other(side); }
    return out;
  }
  // the next contact point for foot F at time t: just ahead of the body on its authored path, on the foot's side
  contactPoint(t, F) { const P = this.rootAt(t), V = this.velAt(t), v = hyp(V[0], V[1]), psi = this.psiAt(t), a = this.el.dri.spacing * min(RE.ahead[2], RE.ahead[0] + RE.ahead[1] * v), l = sideOf(F) * RE.lat;
    return [P[0] + a * dcos(psi) - l * dsin(psi), P[1] + a * dsin(psi) + l * dcos(psi)]; }
  // the swing (and its touch time) of the contact after one at time t by foot F: the first swing whose touch falls after Dribbling's cadence
  // (the same foot: after its own swing cycle)
  followingAfter(t, F, from = 0) {
    const Vt = this.velAt(t), out = abs(wrapA(this.psiAt(t) - this.path.th)) <= RE.exitTol * DEG && hyp(Vt[0], Vt[1]) >= RE.runFrom && abs(wrapA(hdg(Vt) - this.path.th)) <= RE.velTol * DEG;
    for (let j = from; j < this.swings.length; j++) { const s = this.swings[j]; if (s.first) continue; const tt = s.t0 + RE.touchU * (s.t1 - s.t0), gap = max(s.F === F ? this.el.dri.sameFoot : this.el.dri.cadence, out ? RE.runGap : 0);
      if (tt >= t + gap - 1e-9) return { j, s, t: tt }; }
    return null;
  }
  // is the contact at time t the EXIT touch? (the body's facing on the exit, its velocity on it and moving out — or the sequence's last contact)
  isExit(c) {
    if (c.i === 0 && this.tech.firstExit) return true; if (c.i >= RE.maxContacts - 1) return true;
    const t = c.t, psi = this.psiAt(t), V = this.velAt(t), v = hyp(V[0], V[1]), u = dir(this.path.th), along = V[0] * u[0] + V[1] * u[1];
    return abs(wrapA(psi - this.path.th)) <= RE.exitTol * DEG && abs(wrapA(hdg(V) - this.path.th)) <= RE.velTol * DEG && along >= max(this.vFloor, this.vX - RE.exitGo);
  }
  // ── pre(): the authoritative CONTACT of this tick — the ideal (where the next foot will play it, or the exit touch), Ball Control execution, one
  // kernel schedule() at the ball's own position ───────────────────────────────────────────────────────────────────────────────────────────────
  pre(W) {
    if (this.done || this.failed || !this.next || W.tick !== this.next.k) return;
    const c = this.next, F = this.F, t = c.t, B = F.loc(W.ball.p), vB = F.locV(W.ball.v), T = this.tech, pl = this.plan(c, B, vB, true);
    if (!pl) { this.failed = true; this.notes.push("no foot for a follow-up contact"); this.ver++; return; }
    const { exit, ideal, nx, fs, alpha, D, vrel } = pl, vI = ideal.v, psi = this.psiAt(t), Vb = this.velAt(t);
    const vrh = hyp(vrel[0], vrel[1]), sOut = hyp(vI[0], vI[1]), n = vrh > 0.05 ? [-vrel[0] / vrh, -vrel[1] / vrh] : [-dcos(psi), -dsin(psi)], dHat = sOut > 1e-9 ? [vI[0] / sOut, vI[1] / sOut] : [dcos(psi), dsin(psi)];
    const N = RT.turnDraws(this.spec, c.i), ex = RT.executeTurn({ D, vIdeal: [vI[0], vI[1], 0], nIn: n, dHat, sig: T.sig || 1, vInS: max(0.05, vrh) }, this.bc, N), vk = F.kerV(ex.v);
    const id = `${this.idp}.c${c.i}`;
    W.schedule({ id, tick: W.tick, position: W.ball.p.slice(), velocity: vk, spin: rollK(vk), maxContactError: 0.06, preparedAt: W.time, colliderId: null,
      metadata: { action: "RECEIVE-ELITE", family: c.i === 0 ? T.fid : exit ? "EXIT" : "FOLLOW", contact: c.i, surface: fs.surface, selectedFoot: c.F, exit, recovery: !!c.recovery, model: "receive-control-v2" } });
    const rec = { i: c.i, id, k: W.tick, t: r3(t), F: c.F, surface: fs.surface, glance: r2(fs.glance), surfaceOk: fs.ok, alpha: r2(alpha), B: B.slice(), vIn: vB.slice(), vBody: Vb.slice(), psi, vIdeal: vI.slice(), vExec: ex.v.slice(), D, N, E: ex.E, capped: ex.capped,
      Q: c.Q ? c.Q.slice() : null, miss: c.Q ? r3(hyp(B[0] - c.Q[0], B[1] - c.Q[1])) : null, exit, recovery: !!c.recovery, corr: c.corr || null, ideal, next: nx ? { i: nx.i, t: r3(nx.t), F: nx.F, Q: nx.Q } : null };
    this.contacts.push(rec); this.pending = nx; this.next = null; this.ver++;
  }
  // the contact's plan from the ball's state at its tick: the exit touch or the touch toward the next foot, the surface that gives that impulse, the
  // touch's difficulty (RECEIVE-TURN-1's terms: the incoming ball relative to the body, the rotation inside the touch window, the glance, the
  // surface, the touch's own speed). commit false: a preview (the presentation body's next contact pose) — no state changes
  plan(c, B, vB, commit) {
    const t = c.t, T = this.tech, Vb = this.velAt(t), psi = this.psiAt(t), exit = this.isExit(c); let ideal, nx = null;
    if (exit) ideal = this.exitIdeal(c, B, commit);
    else if (c.i === 0 && T.dir0 != null) { const fp = this.firstPlan(c, B, vB, commit); if (!fp) return null; nx = fp.nx; ideal = fp.ideal; }
    else { const f = this.followingAfter(t, c.F); if (!f) return null;
      nx = { i: c.i + 1, t: f.t, k: this.kc0 + Math.round(f.t / DT), F: f.s.F, swing: f.s, j: f.j }; nx.t = (nx.k - this.kc0) * DT; nx.Q = this.contactPoint(nx.t, nx.F); ideal = this.towardIdeal(c, B, nx, commit); }
    const vI = ideal.v, vrel = [vB[0] - Vb[0], vB[1] - Vb[1], vB[2] || 0], dv = [vI[0] - vB[0], vI[1] - vB[1]], dvM = hyp(dv[0], dv[1]), alpha = wrapA(hdg(dv) - psi) / DEG;
    const allowed = c.i === 0 ? T.surfaces : ["INSIDE", "OUTSIDE", "LACES", "SOLE"], fs = fitSurface(c.F, alpha, dvM, allowed);
    const st = { p: [B[0], B[1], B[2] != null ? B[2] : R], v: vrel }, inc = incoming(st), Dk = difficulty(surf("FOOT_INSIDE", c.F), st, inc, c.i === 0 ? (T.shift || 0) : 0).D;
    const rotIn = abs(wrapA(this.psiAt(t + 0.15) - this.psiAt(t - 0.15))) / Math.PI, sOut = hyp(vI[0], vI[1]);
    const D = Dk * (c.i === 0 ? T.famM : 1) * (1 + TDIFF.rot * rotIn + TDIFF.glance * fs.glance + (TDIFF.surface[fs.surface] || 0) + TDIFF.out * sOut / RK.diff.vRef);
    return { exit, ideal, nx, fs, alpha, D, vrel };
  }
  preview(c, b) { const pl = this.plan(c, b.p, b.v, false); return pl ? { v: pl.ideal.v.slice(0, 2), surface: pl.fs.surface } : null; }
  // the ideal of a sequence touch: the ball from where it is to the next contact point, arriving when that foot plays it (the kernel's rolling law)
  towardIdeal(c, B, nx, commit) {
    const T = this.tech, dt = max(DT * 6, nx.t - c.t); let Q = nx.Q, d = [Q[0] - B[0], Q[1] - B[1]], dl = hyp(d[0], d[1]);
    // the first touch of a standing receiver's technique: its impulse must be one the technique's surfaces can give and its path must clear the
    // standing foot — else the point is moved toward the direction the technique itself chose (RECEIVE-TURN-1's ideal), never further away
    if (c.i === 0 && T.dir0 != null) { const s0n = dl < 1e-3 ? 0 : this.rollSpeed(dl, dt), ok = (dd) => this.firstOk(B, dd, s0n); if (!ok(Math.atan2(d[1], d[0]))) { let found = false;
      for (const w of [0.25, 0.5, 0.75, 1.0]) { const h = Math.atan2(d[1], d[0]) + wrapA(T.dir0 - Math.atan2(d[1], d[0])) * w; if (ok(h)) { d = [dcos(h) * dl, dsin(h) * dl]; Q = [B[0] + d[0], B[1] + d[1]]; found = w; break; } }
      if (found === false) { d = [dcos(T.dir0) * dl, dsin(T.dir0) * dl]; Q = [B[0] + d[0], B[1] + d[1]]; found = 1; } if (commit) this.firstBlend = found; nx.Q = Q; } }
    const s0 = dl < 1e-3 ? 0 : this.rollSpeed(dl, dt), u = dl < 1e-9 ? [0, 0] : [d[0] / dl, d[1] / dl];
    return { kind: "TOWARD", v: [u[0] * s0, u[1] * s0], speed: s0, target: Q, dt };
  }
  // THE FIRST TOUCH: the technique's surfaces must face its impulse and its path must clear the standing foot. Candidates: the next contact on each of
  // the next swings (Dribbling's cadence), at the touching foot's side or the body's centre line — the ball sent straight there; failing those,
  // the technique's own direction (RECEIVE-TURN-1 / RECEIVE-CONTROL-1.1's ideal) at the speed that brings the ball closest to where the next
  // foot will be (the rest is the follow-up's reach and the run's correction). The least residual wins, an earlier contact preferred.
  firstPlan(c, B, vB, commit) {
    const T = this.tech, cands = []; let f = this.followingAfter(c.t, c.F), n = 0;
    while (f && n < 3) { const k = this.kc0 + Math.round(f.t / DT), tt = (k - this.kc0) * DT, P = this.rootAt(tt), V = this.velAt(tt), v = hyp(V[0], V[1]), psi = this.psiAt(tt), a = this.el.dri.spacing * min(RE.ahead[2], RE.ahead[0] + RE.ahead[1] * v), dt = max(DT * 6, tt - c.t);
      for (const lk of [1, 0, -0.5]) { const l = sideOf(f.s.F) * RE.lat * lk, Q = [P[0] + a * dcos(psi) - l * dsin(psi), P[1] + a * dsin(psi) + l * dcos(psi)], d = [Q[0] - B[0], Q[1] - B[1]], dl = hyp(d[0], d[1]), s0 = this.rollSpeed(dl, dt);
        if (dl > 0.02 && this.firstOk(B, Math.atan2(d[1], d[0]), s0)) cands.push({ f, k, tt, Q, v: [d[0] / dl * s0, d[1] / dl * s0], resid: 0, cost: n * 0.6 + abs(lk) * 0.03, kind: "direct" }); }
      const u0 = [dcos(T.dir0), dsin(T.dir0)], Q = this.contactPoint(tt, f.s.F), d = [Q[0] - B[0], Q[1] - B[1]], along = max(0.08, d[0] * u0[0] + d[1] * u0[1]);
      { const s0 = this.rollSpeed(along, dt), resid = hyp(d[0] - u0[0] * along, d[1] - u0[1] * along), ok = this.firstOk(B, T.dir0, s0);
        cands.push({ f, k, tt, Q, v: [u0[0] * s0, u0[1] * s0], resid, cost: max(0, resid - this.el.dri.reach) * 3 + n * 0.6 + 0.05 + (ok ? 0 : 0.4), kind: ok ? "technique" : "technique-glance" }); }
      f = this.followingAfter(c.t, c.F, f.j + 1); n++; }
    // no direct touch is playable: every direction the technique's surfaces can give (10° steps), at the speed that brings the ball closest to one of
    // the next feet — the least that is left for the reach and the run's correction
    if (!cands.some((q) => q.kind === "direct")) { let g = this.followingAfter(c.t, c.F), m = 0;
      while (g && m < 3) { const k = this.kc0 + Math.round(g.t / DT), tt = (k - this.kc0) * DT, Q = this.contactPoint(tt, g.s.F), d = [Q[0] - B[0], Q[1] - B[1]], dt = max(DT * 6, tt - c.t);
        for (let a = 0; a < 36; a++) { const h = a * 10 * DEG, u = [dcos(h), dsin(h)], along = d[0] * u[0] + d[1] * u[1]; if (along < 0.05) continue; const s0 = this.rollSpeed(along, dt), resid = hyp(d[0] - u[0] * along, d[1] - u[1] * along);
          if (this.firstOk(B, h, s0)) cands.push({ f: g, k, tt, Q, v: [u[0] * s0, u[1] * s0], resid, cost: max(0, resid - this.el.dri.reach) * 3 + m * 0.6 + 0.1, kind: "search" }); }
        g = this.followingAfter(c.t, c.F, g.j + 1); m++; } }
    if (!cands.length) { // nothing feasible: RECEIVE-TURN-1 / RECEIVE-CONTROL-1.1's own first touch direction, meeting the next foot's point as closely as it can
      const g = this.followingAfter(c.t, c.F); if (!g) return null; const k = this.kc0 + Math.round(g.t / DT), tt = (k - this.kc0) * DT, Q = this.contactPoint(tt, g.s.F), u0 = [dcos(T.dir0), dsin(T.dir0)], d = [Q[0] - B[0], Q[1] - B[1]], along = max(0.1, d[0] * u0[0] + d[1] * u0[1]), s0 = this.rollSpeed(along, max(DT * 6, tt - c.t));
      cands.push({ f: g, k, tt, Q, v: [u0[0] * s0, u0[1] * s0], resid: hyp(d[0] - u0[0] * along, d[1] - u0[1] * along), cost: 9, kind: "fallback" }); }
    cands.sort((a, b) => a.cost - b.cost); const b = cands[0]; if (commit) this.firstChoice = { kind: b.kind, resid: r3(b.resid), swing: b.f.j, n: cands.length };
    const nx = { i: c.i + 1, t: b.tt, k: b.k, F: b.f.s.F, swing: b.f.s, j: b.f.j, Q: b.Q }, sp = hyp(b.v[0], b.v[1]);
    return { nx, ideal: { kind: "TOWARD", v: b.v, speed: sp, target: b.Q, dt: b.tt - c.t, first: b.kind } };
  }
  // the first touch's feasibility (a standing receiver): a surface of the technique faces the impulse, the ball's path clears the standing foot
  firstOk(B, h, s) { const T = this.tech, vB = T.vIn0 || [0, 0], psi = this.psiAt(0), dv = [dcos(h) * s - vB[0], dsin(h) * s - vB[1]], alpha = wrapA(hdg(dv) - psi) / DEG;
    const fs = fitSurface(T.F0, alpha, hyp(dv[0], dv[1]), T.surfaces); if (!fs.ok) return false; if (!T.stand) return true;
    const u = [dcos(h), dsin(h)], w = [T.stand[0] - B[0], T.stand[1] - B[1]], along = clamp(w[0] * u[0] + w[1] * u[1], 0, 0.8), cx = B[0] + u[0] * along - T.stand[0], cy = B[1] + u[1] * along - T.stand[1];
    return hyp(cx, cy) - R - RE.clearStand >= 0; }
  // the EXIT touch: the ball onto the exit line where DRIBBLE-V1 takes it — TURN-1.2 takes the body at the first touchdown after the touch at which
  // the body runs at TURN-1.2's slowest gait (no speed step), DRIBBLE-V1 the ball ≥ settle s later (RECEIVE-CONTROL-2's bridge), the ball then
  // exitAhead(speed) ahead of the runner on the exit line (TURN-1.2 asked for the switch speed + exitRamp.dv, reached at aRun)
  exitIdeal(c, B, commit) {
    const t = c.t, u = dir(this.path.th); let sw = null;
    for (const s of this.swings) if (s.t1 >= t + 0.06 && this.speedBase(s.t1) >= 0.97 * this.vFloor) { sw = s; break; }
    if (!sw) sw = this.swings[this.swings.length - 1];
    const tSw = sw.t1, Psw = this.rootAt(tSw), vSw = max(this.vFloor, this.speedBase(tSw)), tH = max(t + RE.tauX, tSw + RE.settle), ra = runAfter(vSw, tH - tSw, this.vX);
    const Rh = [Psw[0] + u[0] * ra.d, Psw[1] + u[1] * ra.d], ah = tab(RE.exitAhead, ra.v) * RE.exitAheadK, Tg = [Rh[0] + u[0] * ah, Rh[1] + u[1] * ah], d = [Tg[0] - B[0], Tg[1] - B[1]], dl = hyp(d[0], d[1]);
    const s0 = max(RE.minExit, this.rollSpeed(dl, tH - t)), dH = [d[0] / dl, d[1] / dl];
    if (commit) this.exit = { t, tSw, tH, kT12: this.kc0 + Math.round(tSw / DT), kDribble: this.kc0 + Math.round(tH / DT), foot: sw.F, target: Tg, vSw: r2(vSw), vH: r2(ra.v), ahead: ah, s0: r2(s0) };
    return { kind: "EXIT", v: [dH[0] * s0, dH[1] * s0], speed: s0, target: Tg, dt: tH - t };
  }
  // ── post(): one tick after a contact the player has the real ball: the next contact is played where the ball really is (within Dribbling's reach
  // of its planned point), else the run is corrected toward it (Agility), else the contact moves (timing sweep), else a recovery ───────────────────
  post(W) {
    const last = this.contacts[this.contacts.length - 1]; if (!last || W.tick !== last.k + 1 || this.done || this.failed) return;
    if (last.exit) { this.done = true; this.ver++; return; }
    const nx = this.pending, F = this.F, tNow = (W.tick - this.kc0) * DT, dri = this.el.dri, horizon = nx.t - tNow + RE.recover.window + 0.1, P = predictK(W, horizon, F), tReact = last.t + dri.react;
    const best = this.findNext(last, nx, (k) => P[k - W.tick], W.tick);
    if (!best) { this.failed = true; this.notes.push(`ball beyond reach after c${last.i} (released to DRIBBLE-V1)`); this.ver++; return; }
    if (best.corr) this.corr.push({ t0: tReact, t1: best.t, d: best.corr, after: last.i });
    const Q = best.corr ? [best.Q[0] + best.corr[0], best.Q[1] + best.corr[1]] : best.Q;
    this.next = { i: nx.i, k: best.k, t: best.t, F: best.F, Q, recovery: best.recovery || (best.corr && hyp(best.corr[0], best.corr[1]) > 0.25) || abs(best.t - nx.t) > 0.12, corr: best.corr ? best.corr.map(r3) : null, planned: { t: r3(nx.t), F: nx.F, Q: nx.Q } }; this.ver++;
  }
  // the next contact on the real ball: where the planned foot can play it (within Dribbling's reach, else with the run corrected toward it at
  // Agility's rate, else a little earlier / later on a swing), or a RECOVERY (later, a full correction); null: beyond reach
  findNext(last, nx, ballAt, tick) {
    const dri = this.el.dri, ag = this.el.agi, tReact = last.t + dri.react, W = { tick };
    let best = null;
    const tryAt = (k, F2, recovery) => { const tt = (k - this.kc0) * DT; if (k <= W.tick + 1) return; const b = ballAt(k); if (!b || b.p[2] > RX.ballHMax) return;
      const Q = this.contactPoint(tt, F2), e = [b.p[0] - Q[0], b.p[1] - Q[1]], el = hyp(e[0], e[1]), need = el - dri.reach, allow = ag.vAdj * (recovery ? RE.recover.kAdj : 1) * max(0, tt - tReact);
      if (need > (recovery ? allow : min(allow, 0.35)) + 1e-9) return; const corr = need > 0 ? [e[0] / el * need, e[1] / el * need] : null;
      const cost = abs(tt - nx.t) * 2 + (corr ? hyp(corr[0], corr[1]) * 3 : 0) + (F2 !== nx.F ? 0.3 : 0);
      if (!best || cost < best.cost) best = { k, t: tt, F: F2, Q, corr, cost, recovery, ball: b.p.slice() }; };
    for (const dk of RE.sweep) { const k = nx.k + dk, tt = (k - this.kc0) * DT; const sw = this.swings.find((s) => !s.first && tt >= s.t0 + 0.05 && tt <= s.t1 - 0.02 && (tt - last.t) >= (s.F === last.F ? dri.sameFoot : dri.cadence) - 1e-9); if (sw) tryAt(k, sw.F, false); }
    if (!best) { // RECOVERY: a later contact (up to the recovery window) with a full correction of the run toward the ball
      for (let dk = 6; dk <= Math.round(RE.recover.window / DT); dk += 6) { const k = nx.k + dk, tt = (k - this.kc0) * DT, sw = this.swings.find((s) => !s.first && tt >= s.t0 + 0.05 && tt <= s.t1 - 0.02); if (sw) tryAt(k, sw.F, true); if (best) break; } }
    return best;
  }
  // DRY RUN of the planned first touch (its ideal launch on the kernel's own free ball, before the contact): can the next foot play it — within reach,
  // with a correction, or a recovery? If not, the elite sequence is not attempted for this receive (the technique's own touch is played instead)
  dryCheck() {
    const b0 = this.tech.ballC0; if (!b0) return { ok: true }; const c = { i: 0, k: this.kc0, t: 0, F: this.tech.F0 }, pl = this.plan(c, b0.p, b0.v, false); if (!pl || pl.exit || !pl.nx) return { ok: true };
    const F = this.F, vI = pl.ideal.v, vk = F.kerV([vI[0], vI[1], 0]), Wd = mkWorld(F.ker([b0.p[0], b0.p[1], max(R, b0.p[2] != null ? b0.p[2] : R)]), vk, rollK(vk)), n = Math.round((pl.nx.t + RE.recover.window + 0.2) / DT), P = [];
    for (let i = 0; i <= n; i++) { P.push({ p: F.loc(Wd.ball.p), v: F.locV(Wd.ball.v) }); Wd.step(); }
    const best = this.findNext({ i: 0, t: 0, F: this.tech.F0 }, pl.nx, (k) => P[k - this.kc0], this.kc0 + 1);
    return { ok: !!best, recovery: best ? best.recovery : null, first: pl.ideal.first || null };
  }
  summary() { return { contacts: this.contacts.map((c) => ({ i: c.i, t: c.t, F: c.F, surface: c.surface, exit: c.exit, recovery: c.recovery, miss: c.miss, D: r3(c.D), speedIdeal: r2(hyp(c.vIdeal[0], c.vIdeal[1])), speedExec: r2(hyp(c.vExec[0], c.vExec[1])), corr: c.corr })),
    exit: this.exit, failed: this.failed, notes: this.notes, firstBlend: this.firstChoice || null, Trot: r3(this.path.Trot), tGo: this.path.tGo != null ? r3(this.path.tGo) : null, Tx: this.path.Tx != null ? r3(this.path.Tx) : null }; }
}
// ═══ THE SIMULATION: RECEIVE-MOVING-1's pipeline with the elite sequence after the technique's selection ═════════════════════════════════════════
export class ReceiveSimE extends ReceiveSimM {
  // cfg.ratings { bc, dri, agi } (default: the player's attributes); cfg.elite === false → RECEIVE-MOVING-1 exactly
  constructor(cfg) {
    super(cfg); const at = (this.player || cfg.player || {}).attributes || {};
    this.ratings = cfg.ratings || { bc: this.bc, dri: at.dribbling != null ? at.dribbling : 99, agi: at.agility != null ? at.agility : 99 }; this.el = eliteParams(this.ratings); this.eliteOn = cfg.elite !== false;
  }
  // ── THE FIXED STEP: DRIBBLE-V1's takeover window and the run-out's steering onto the ball's line (RECEIVE-MOVING-1's, for every elite receive) ──
  step() {
    const c2 = this.rc2;
    if (!c2 || c2.kind !== "ELITE") return super.step();
    const rx = this.rx;
    if (c2.phase === "exit" && c2.t12 && RE.window) { const W = RE.window, dt = (this.k - c2.t12.k) * DT;
      if (dt >= W.tMin) { const b = this.ballA(), u = [Math.cos(rx.exitDir), Math.sin(rx.exitDir)], dx = b.p[0] - this.A.P[0], dy = -b.p[2] - this.A.P[1], ah = dx * u[0] + dy * u[1], lat = -dx * u[1] + dy * u[0], vr = hyp(this.A.V[0], this.A.V[1]), vb = hyp(b.v[0], b.v[2]), want = tab(RE.exitAhead, max(RX.vFloor, vr)) * RE.exitAheadK;
        if ((ah >= want - W.band && ah <= want + W.band && abs(lat) <= W.lat && vb <= vr + W.dv) || dt >= W.tMax) { c2.kDribble = this.k + 1; c2.window = { t: r3(dt), ahead: r2(ah), lat: r2(lat), timeout: dt >= W.tMax }; } else c2.kDribble = this.k + 1 + 999999; } }
    // the run-out (TURN-1.2, before DRIBBLE-V1) steers toward the ball's actual line (RECEIVE-MOVING-1's steering: the point exitAhead behind where
    // the free ball will be when DRIBBLE-V1 takes it, ≤ steerMax off the exit)
    if (RM.steer && c2.phase === "exit" && c2.kDribble != null && c2.t12 && (this.k - c2.t12.k) % RM.steerEvery === 0) {
      const kT = Math.min(c2.kDribble, this.k + Math.round(0.4 / DT)), n = Math.max(1, kT - this.k), map = this.predictBall(this.k, n + 1), b = map.get(this.k + n);
      if (b) { const bp = [b.p[0], b.p[2]], u = [Math.cos(rx.exitDir), Math.sin(rx.exitDir)], vh = hyp(this.A.V[0], this.A.V[1]), back = tab(RE.exitAhead, max(RX.vFloor, vh)) * RE.exitAheadK, T = [bp[0] - u[0] * back, bp[1] - u[1] * back], d = [T[0] - this.A.P[0], T[1] - this.A.P[1]];
        if (hyp(d[0], d[1]) > 0.5) { const dirn = Math.atan2(d[1], d[0]); this.input = Object.assign({}, this.input, { dir: rx.exitDir + clamp(wrapA(dirn - rx.exitDir), -RM.steerMax * DEG, RM.steerMax * DEG) }); this.A.input = this.input; } } }
    return ReceiveSim2.prototype.step.call(this);
  }
  // ── A STANDING RECEIVER: RECEIVE-CONTROL-2's resolver selects the technique; a turn becomes an elite sequence ─────────────────────────────────
  resolve2(k) {
    super.resolve2(k); const c2 = this.rc2;
    if (!this.eliteOn || c2.kind !== "TURN" || c2.cls.hold) return;
    const A = c2.ep.A, ag = this.el.agi, tPrep = -min(0.8, (c2.kc - c2.k0) * DT), path = stationaryPath(A, ag, tPrep, max(4.0, this.rx.exitV)), ref = REF[A.fid](abs(A.thetaDeg)), kA = ag.stepT / 0.24;
    const fam = FAMT[A.fid], land0 = ref.landBase * kA + ref.landShare * path.Trot, P0 = c2.P;
    const vIn0 = (() => { const q = P0 && P0[A.k]; return q ? [q.v[0], q.v[1]] : [-A.vInS, 0]; })();
    const q0 = P0 && P0[A.k], tech = { fid: A.fid, label: fam.label, F0: A.F, variant: A.vid, surfaces: fam.surfaces, famM: fam.m, sig: A.sig, theta: A.theta, stand: A.stand, shift: hyp(A.S[0], A.S[1]), lift0: ref.swing, land0, dir0: hdg(A.vOut), vIn0, firstExit: false,
      ballC0: q0 ? { p: q0.p.slice(), v: q0.v.slice() } : null };
    const ev = c2.cls.ev; c2.tp = { A, path };
    const ep = new EliteEpisode({ F: c2.frame, kc0: c2.kc, k0: c2.k0, path, mode: "stationary", tech, el: this.el, bc: this.bc, spec: c2.spec, idp: `${this.pid}:${ev}`, vFloor: RX.vFloor, vX: max(this.rx.exitV, RX.vFloor), rollSpeed: this.rollSpeedFn() }), dry = ep.dryCheck();
    if (!dry.ok) { c2.eliteDeclined = { k, why: "the next foot cannot reach the first touch (dry run)", first: dry.first }; c2.log.push({ k, ev: "elite-declined" }); return; }   // RECEIVE-CONTROL-2's own turn, unchanged
    c2.ep = ep; c2.kind = "ELITE"; c2.eliteFrom = "TURN"; c2.dry = dry; this.buildBody2();
  }
  // ── A MOVING RECEIVER: RECEIVE-CONTROL-1.1's action selection (Agility's limits), then the elite sequence in RECEIVE-CONTROL-2's action frame ───
  beginAction(act) {
    if (!this.eliteOn || act.hold || act.fam.id === "CUSHION") return super.beginAction(act);
    const rx = this.rx, c2 = this.rc2, k = this.k, ag = this.el.agi, P0 = this.A.P.slice(), F = new Frame(P0, 0), loc = (p) => [p[0] - P0[0], p[1] - P0[1]];
    const famT = act.fam, ang = abs(wrapA(rx.exitDir - act.psiC)) / DEG, vH = famT.exitV ? max(RX.vFloor, min(rx.exitV, tab(famT.exitV, ang) * ag.entryK)) : max(RX.vFloor, min(rx.exitV, act.sC + 1.0));
    const Tp = (act.kc - k) * DT, tS = act.tS || 0, prepL = { at: (t) => { if (t <= tS) return { P: [0, 0], V: [0, 0] }; const s = act.prep.at(t - tS); return { P: loc(s.P), V: s.V }; } };
    const path = movingPath({ P0: [0, 0], V0: act.V0, psi0: act.psi0, Tp, tS, prep: prepL, Pc: loc(act.Pc), Vc: act.Vc, psiC: act.psiC, thX: rx.exitDir, vH, vMax: max(rx.exitV, RX.vFloor) }, ag);
    const kA = ag.stepT / 0.24, st = act.steps.steps, m = act.steps.m, C = st[m - 1], lift0 = C ? (C.t + C.d) - Tp : -0.2, turnNow = abs(wrapA(rx.exitDir - hdg(act.V0))) / DEG;
    const tech = { fid: famT.id, label: famT.label, F0: act.F, surfaces: famT.surfaces, famM: 1, sig: act.sg || 1, theta: rx.exitDir, stand: loc(act.Spl), shift: 0, lift0: min(-0.08, lift0), land0: famT.follow * kA,
      surface0: null, firstExit: famT.id === "STRIDE" && turnNow <= RE.smallTurn, dir0: act.ideal.dir, vIn0: act.vin.slice(), ballC0: { p: [act.cK[0] - P0[0], act.cK[2] - P0[1], act.cK[1]], v: [act.vin[0], act.vin[1], 0] } };
    const ep = new EliteEpisode({ F, kc0: act.kc, k0: k, path, mode: "moving", tech, el: this.el, bc: this.bc, spec: null, idp: null, vFloor: RX.vFloor, vX: max(rx.exitV, RX.vFloor), rollSpeed: this.rollSpeedFn() }), dry = ep.dryCheck();
    // the elite sequence is not possible for this receive (the next foot could not reach even the ideal first touch): the technique's own action
    // (RECEIVE-MOVING-1's — the ball played to where the body will meet it after its turn), unchanged
    if (!dry.ok) { c2.eliteDeclined = { k, why: "the next foot cannot reach the first touch (dry run)", fam: famT.id, sC: r2(act.sC), first: dry.first }; rx.log.push({ k, ev: "elite-declined", fam: famT.id }); return super.beginAction(act); }
    rx.nEvent++; act.eventId = "rx" + rx.nEvent + "@" + act.kc; act.kA = k; act.tA = this.A.t; act.rotPre = wrapA(act.psiC - act.psi0);
    const ev = this.newEvent(), spec = this.spec(ev); ep.spec = spec; ep.idp = `${this.pid}:${ev}`; c2.dry = dry;
    c2.ep = ep; c2.kind = "ELITE"; c2.eliteFrom = "MOVING"; c2.phase = "action"; c2.frame = F; c2.kc = act.kc; c2.k0 = k; c2.psiInit = null; c2.spec = spec; c2.cls = { k, ev, ground: true, intent: rx.intent, hold: false, action: famT.id, moving: true }; c2.act = act;
    rx.act = act; rx.phase = "action"; this.parkColliders();
    rx.log.push({ k, ev: "elite-action", fam: famT.id, F: act.F, side: act.sg, kc: act.kc, sC: r2(act.sC), vH: r2(vH) });
    this.buildBody2();
  }
  authoredStep(act) { if (this.rc2 && this.rc2.kind === "ELITE") return this.actionStep(); return super.authoredStep(act); }
  // the approach (TURN-1.2 before the action): its braking toward a turn's entry speed follows Agility's angle–speed law (× entryK) — a less agile
  // player starts slowing down earlier for the same turn
  rxApproach(k, est) { if (!this.eliteOn) return super.rxApproach(k, est); return this.withAgility(() => super.rxApproach(k, est)); }
  withAgility(fn) { const ag = this.el.agi, keep = { aPrep: RX.aPrep, aExit: RX.aExit, omegaMax: RX.omegaMax }, Sk = S_ENTRY.map((r) => r[1]);
    RX.aPrep = ag.aBrake; RX.aExit = ag.aTurn; RX.omegaMax = ag.omega; for (let i = 0; i < S_ENTRY.length; i++) S_ENTRY[i][1] = Sk[i] * ag.entryK;
    try { return fn(); } finally { RX.aPrep = keep.aPrep; RX.aExit = keep.aExit; RX.omegaMax = keep.omegaMax; for (let i = 0; i < S_ENTRY.length; i++) S_ENTRY[i][1] = Sk[i]; } }
  // ── the action's root in the receive frame ─────────────────────────────────────────────────────────────────────────────────────────────────
  root2(kAbs) {
    const c2 = this.rc2; if (c2.kind !== "ELITE") return super.root2(kAbs);
    const F = c2.frame, ep = c2.ep, t = (kAbs - c2.kc) * DT, p = ep.rootAt(t), q = ep.rootAt(t + DT); let psi = F.head(ep.psiAt(t));
    const tk = (kAbs - c2.k0) * DT; if (c2.psiInit != null && tk < 0.5) psi = c2.psiInit + wrapA(psi - c2.psiInit) * s5(tk / 0.5);
    return { P: F.pitch(p), V: F.pitchV([(q[0] - p[0]) / DT, (q[1] - p[1]) / DT]), psi };
  }
  // after each tick of the sequence: the exit plan → TURN-1.2's switch and DRIBBLE-V1's takeover; a released ball → both at the next touchdown
  afterPost() {
    const c2 = this.rc2; if (c2.kind !== "ELITE") return super.afterPost();
    const ep = c2.ep, k = this.k;
    if (ep.exit && c2.kT12 == null) { const x = ep.exit; c2.kT12 = max(k + 1, x.kT12); c2.kDribble = x.kDribble; c2.rejoin = { kM: this.kc2abs(x.t), tM: x.t, foot: x.foot, tTD: x.tSw, kTD: x.kT12, target: x.target, vH: x.vH, s0: x.s0, exit: true };
      c2.log.push({ k, ev: "exit-plan", kT12: c2.kT12, kDribble: c2.kDribble, foot: x.foot, vSw: x.vSw }); }
    if (ep.failed && c2.kT12 == null) { const t = (k - c2.kc) * DT, sw = ep.swings.find((s) => s.t1 > t + DT); c2.kT12 = sw ? c2.kc + Math.round(sw.t1 / DT) : k + 1; c2.kDribble = c2.kT12 + Math.round(0.2 / DT);
      c2.rejoin = { foot: sw ? sw.F : "R", released: true }; c2.log.push({ k, ev: "released", kT12: c2.kT12 }); }
  }
  kc2abs(t) { return this.rc2.kc + Math.round(t / DT); }
  // the launch speed that rolls the ball d m in t s (the simulation's own kernel table — RECEIVE-CONTROL-1.1's speedFor)
  rollSpeedFn() { return (d, t) => { const u = this.speedFor(d, max(1, Math.round(t / DT)), false); return u == null ? 25 : u; }; }
  // the sequence's launches become touch records (DRIBBLE-V1's last touch is the exit touch; the first contact fills the scorecard's receive contact)
  touchFromEpisode(L) {
    const c2 = this.rc2; if (c2.kind !== "ELITE") return super.touchFromEpisode(L);
    const ep = c2.ep, b = this.W.ball, vk = L.velocity, md = L.metadata || {}, F = md.selectedFoot || "R", c = ep.contacts[ep.contacts.length - 1], ex = ep.exit, isExit = !!md.exit;
    const tgt = isExit ? c2.frame.pitch(ex.target) : (c && c.next ? c2.frame.pitch(c.next.Q) : null), kNext = isExit ? ex.kDribble : (c && c.next ? c2.kc + Math.round(c.next.t / DT) : null);
    const T = { id: L.id, k: L.tick, t: L.tick * DT, F, reg: md.surface || "INSIDE", hull: "boot", collider: `${this.pid}:boot_${F}`, swing: -1, receive: true, family: "ELITE_" + md.family, side: ep.tech.sig, weak: F !== this.pref, arch: this.arch,
      ball: [b.p[0], b.p[1], -b.p[2]], pre: { v: [b.v[0], b.v[1], -b.v[2]], w: [-b.w[0], -b.w[1], b.w[2]] }, gap: 0, otherGap: 1, desired: { v: [vk[0], 0, -vk[2]], speed: hyp(vk[0], vk[2]), target: tgt ? [tgt[0], 0, -tgt[1]] : null, kNext },
      executed: { v: [vk[0], 0, -vk[2]], speed: hyp(vk[0], vk[2]) }, expect: { F: null, swing: null, k: kNext, com: null, target: null, inp: null }, minNext: max(0.12, kNext != null ? (kNext - L.tick) * DT : 0.2), release: false, recovery: !!md.recovery,
      role: "receive", heldDir: null, setupSw: false, dec: null, contactAhead: 0, com: this.A.P.slice(), speedPlayer: hyp(this.A.V[0], this.A.V[1]), ctrl: this.ctrl.state, launched: false, elite: { i: md.contact, exit: isExit } };
    this.touches.push(T); c2.lastRxTouch = T;
    if (md.contact === 0 && c) { const vI = c.vIdeal, vL = c.vExec, dI = Math.atan2(vI[1], vI[0]), dA = Math.atan2(vL[1], vL[0]), sI = hyp(vI[0], vI[1]), sA = hyp(vL[0], vL[1]);
      this.rx.contact = { k: L.tick, T, ex: { dir: c2.frame.head(dA), speed: sA, dirErrDeg: wrapA(dA - dI) / DEG, speedErr: sA - sI, sigDirDeg: 0, sigSpeed: 0, D: c.D }, act: null };
      const prevAct = this.rx.act; this.rx.act = { k0: c2.k0, kc: c2.kc, rest: true, ideal: { speed: sI, dir: c2.frame.head(dI) }, hold: false, eventId: ep.idp, fam: { id: ep.tech.fid }, prev: prevAct ? prevAct.eventId || null : null }; }
  }
  // ── the presentation body (animation on only; never read by the simulation) ──────────────────────────────────────────────────────────────────
  buildBody2() {
    const c2 = this.rc2; if (c2.kind !== "ELITE") return super.buildBody2();
    this.body2 = null; if (!this.anim || !this.cfg.E || !this.cfg.skel || !this.cfg.EliteBody) return;
    this.body2 = new this.cfg.EliteBody(this, c2.ep, c2.frame); this.body2.v = c2.ep.ver;
  }
  body2Stale() { const c2 = this.rc2; if (c2.kind !== "ELITE") return super.body2Stale(); const b = this.body2; return !b || b.v !== c2.ep.ver; }
  footwork() { const c2 = this.rc2; if (c2.kind === "ELITE") return null; return super.footwork(); }
  // ── the receive's summary (RECEIVE-CONTROL-1.1's scorecard reads these fields) ─────────────────────────────────────────────────────────────────
  summary() {
    const c2 = this.rc2; if (!c2 || c2.kind !== "ELITE") return super.summary();
    const rx = this.rx, ep = c2.ep, c = rx.contact, T = c ? c.T : null, c0 = ep.contacts[0];
    return { cls: rx.cls, intent: rx.intent, hold: rx.hold, bc: this.bc, action: { id: ep.idp, fam: ep.tech.fid, F: ep.tech.F0, side: ep.tech.sig, surface: c0 ? c0.surface : null, k0: c2.k0, kc: c2.kc, tc: r3(c2.kc * DT), th: rx.handoff ? r3(rx.handoff.k * DT) : null,
        D: c0 ? r3(c0.D) : null, rotPre: 0, rotExit: 0, ideal: { dirRel: null, vsExit: null, speed: c0 ? r2(hyp(c0.vIdeal[0], c0.vIdeal[1])) : null }, sIn: c0 ? r2(hyp(c0.vIn[0], c0.vIn[1])) : null, s0: 0, sC: c2.act ? r2(c2.act.sC) : 0, vH: rx.handoff ? r2(rx.handoff.v) : null },
      contact: T ? { k: T.k, launched: !!T.launched, cancelled: T.cancelled || null, exec: { dirAbs: +(c.ex.dir / DEG).toFixed(1), speed: r2(c.ex.speed), dirErr: +c.ex.dirErrDeg.toFixed(2), speedErr: r2(c.ex.speedErr), sigDir: 0, sigSpeed: 0 } } : null,
      handoff: rx.handoff, plans: rx.plans, cands: rx.cands, rej: rx.rej, cpu: { rx: Math.round(rx.cpuRx), plan: Math.round(c2.cpu.plan) }, elite: ep.summary() };
  }
  summary2() { const c2 = this.rc2; if (!c2 || c2.kind !== "ELITE") return super.summary2(); return { mode: this.rx.stand ? "stationary" : "moving", kind: "ELITE", from: c2.eliteFrom, cls: c2.cls, family: c2.ep.tech.fid, elite: c2.ep.summary(), t12: c2.t12 || null, handoff: this.rx.handoff, window: c2.window || null, log: c2.log }; }
  // ── RECEIVE-CONTROL-1.1's candidate evaluation (RECEIVE-MOVING-1's copy) with AGILITY's limits — the selection's rules are unchanged:
  //   the preparation's braking limit aBrake (was RX.aPrep), the yaw-rate limit omega (was RX.omegaMax), TURN-1's angle–speed law × entryK, the
  //   exit's mean acceleration aTurn (was RX.aExit); and a score term preferring the plant BEFORE the touch on a large turn (wLate) — the late
  //   redirection stays available (a contact at speed, the turn paid after it) when braking first is not possible
  evalCand(ctx, fam, F, sg, vi, kc) {
    if (!this.eliteOn) return super.evalCand(ctx, fam, F, sg, vi, kc);
    const ag = this.el.agi, eK = ag.entryK, c = this.withAgility(() => super.evalCand(ctx, fam, F, sg, vi, kc));
    if (c && fam.kind === "turning" && !ctx.stand) { const vE = tab(S_ENTRY, abs(c.dEx) / DEG) * eK * fam.vContact.k; if (c.sC > vE) c.score += RE.wLate * (c.sC - vE) / max(vE, 1); }
    if (c && !c.hold && !c.rest) this.scoreFirst(c);
    return c;
  }
  // THE ELITE FIRST TOUCH OF A CANDIDATE (the selection's rules unchanged; the touch it is scored with is the elite one): the next foot's point ~ one
  // support step after the contact on the candidate's exit path; the touch straight there if a surface of the family faces it and its path clears
  // the standing foot, else the family's own direction (RECEIVE-CONTROL-1.1's ideal) and what is left beyond Dribbling's reach — scored (wFirst)
  scoreFirst(c) {
    const ag = this.el.agi, kA = ag.stepT / 0.24, t1 = clamp(c.fam.follow * kA + 0.6 * (ag.stepT + RE.flight), 0.15, max(0.15, c.Tx || 0.3)), st = c.exitP.at(min(t1, c.exitP.T || t1)), Trot = max(0.12, 1.875 * abs(c.dRot) / (ag.omega * DEG));
    const psi1 = c.psiC + c.dRot * s5(t1 / Trot), v1 = hyp(st.V[0], st.V[1]), a = this.el.dri.spacing * min(RE.ahead[2], RE.ahead[0] + RE.ahead[1] * v1), F1 = other(c.F), l = sideOf(F1) * RE.lat;
    const Q = [st.P[0] + a * dcos(psi1) - l * dsin(psi1), st.P[1] + a * dsin(psi1) + l * dcos(psi1)], d = [Q[0] - c.c[0], Q[1] - c.c[1]], dl = hyp(d[0], d[1]);
    const okDir = (h, s0) => { const dv = [dcos(h) * s0 - c.vin[0], dsin(h) * s0 - c.vin[1]], fs = fitSurface(c.F, wrapA(hdg(dv) - c.psiC) / DEG, hyp(dv[0], dv[1]), c.fam.surfaces); if (!fs.ok) return false;
      const u = [dcos(h), dsin(h)], w = [c.Spl[0] - c.c[0], c.Spl[1] - c.c[1]], along = clamp(w[0] * u[0] + w[1] * u[1], 0, 0.8); return hyp(c.c[0] + u[0] * along - c.Spl[0], c.c[1] + u[1] * along - c.Spl[1]) - R - RE.clearStand >= 0; };
    let resid = 0; const s0 = dl > 0.02 ? this.speedFor(dl, max(6, Math.round(t1 / DT)), false) : 0;
    if (!(dl > 0.02 && s0 != null && okDir(Math.atan2(d[1], d[0]), s0))) { const u0 = c.ideal.u, along = d[0] * u0[0] + d[1] * u0[1]; resid = hyp(d[0] - u0[0] * along, d[1] - u0[1] * along) + (along < 0 ? -along : 0); }
    c.eliteFirst = { t1: r3(t1), resid: r3(resid) }; c.score += RE.wFirst * max(0, resid - this.el.dri.reach);
  }
}
