// ═══ receive_moving1/rm1_core.js — RECEIVE-MOVING-1 (QUEUE #2): RECEIVING WHILE MOVING on the integrated pipeline (RECEIVE-CONTROL-2) ═══════════════════
// RECEIVE-CONTROL-2 hands a moving receiver to RECEIVE-CONTROL-1.1's moving actions (touch into stride, open-body and through-stance turns), executed
// with the unified Ball Control model. Their body path braked: a receive into stride lost 10–15 % of the run speed, a sprinter's 60° receive more
// than half (tools/rm1_run.mjs, the baseline). RECEIVE-MOVING-1 keeps the receiver's momentum where the football allows it:
//   · the interception prefers the meeting that keeps the run's velocity (not the earliest), small timing mismatches are absorbed by the stride
//     (RECEIVE-CONTROL-1.1's footwork fitting) instead of the pace
//   · an angled receive CURVES the run toward the exit over the preparation (lateral acceleration aLat) and cuts the rest at the contact; only that
//     residual cut is capped by TURN-1's angle–speed law (vCut, TURN-1's S_ENTRY extended to small angles); a small cut keeps ≥ keepShare of the pace
//   · large turns keep TURN-1's full entry-speed cost (a sprinter cannot reverse at speed)
//   · a standing receiver whose pass runs into space (beyond the stationary receive's reach) runs onto it with the moving actions
// Everything else — the resolver, the stationary receives, the execution, the rejoin / handoff, DRIBBLE-V1 — is RECEIVE-CONTROL-2's, unchanged.
// The methods below are RECEIVE-CONTROL-1.1's (receive11/rx_core.js, copied — that file is not modified) with the changes marked RECEIVE-MOVING-1.
import { ReceiveSim2, RX, BALL_DEFAULT, D1, DT, withBC } from "../receive_control2/rc2_core.js";
import { boneFramesOf } from "../receive11/rx_core.js";
import { FAMILIES, HANDOFF_AHEAD, RECONNECT_TAU, S_ENTRY, SURF, surfacesFor, footYawFor, planSteps, herm, minSpeed, DEG, wrapA, clamp, s5, tab, hdg, toPitch, toLocal, sideOf, other } from "../receive11/rx_actions.js";
import { RXE, difficulty } from "../receive11/rx_exec.js";
import { dsin, dcos } from "../physchar2/core/v2_math.js";
export { RX, BALL_DEFAULT, D1, DT, withBC };
const R = 0.11, r2 = (x) => Math.round(x * 100) / 100;
export const RM = {
  version: "RECEIVE-MOVING-1",
  aLat: 6.0, curveT: 0.8,        // m/s², s: the run's curve toward the exit before the contact (lateral acceleration, over at most curveT of the preparation)
  // the residual cut's entry speed (deg → m/s): TURN-1's S_ENTRY (45° 7.2 … 180° 2.4) extended to small cuts (a cut under 20° does not limit a sprint)
  vCut: [[0, 9.5], [20, 9.5], [45, 7.2], [60, 6.0], [90, 4.3], [120, 3.4], [135, 3.0], [180, 2.4]],
  smallCut: 30, keepShare: 0.85, // a cut ≤ smallCut keeps ≥ keepShare of the run speed at the contact
  keepBand: 0.15, wTime: 0.2,    // the approach keeps the pace within ±15 % of the meeting's need; the interception cost per second of waiting
  prepBand: 0,                    // a moving receiver's approach follows the meeting's need from the strike (RECEIVE-CONTROL-1.1 kept the pace within ±6 %: the
                                  // whole correction then fell to the last 0.8 s — a deeper speed dip before a touch into stride)
  // the curve-then-cut speed law + velocity-first interception above were TRIED and are OFF: with passes weighted for the runner RECEIVE-CONTROL-1.1's
  // own rules already keep the pace on small angles (0.91–0.97 of the run speed), and these lowered it (evidence/rm1_tried_curvecut_*)
  curveCut: false,
  velFirst: true,                // the interception keeps the run's velocity first (wTime per second instead of RECEIVE-CONTROL-1.1's 0.8): the pace-keeping meeting
  // the MOVING HANDOFF (RECEIVE-CONTROL-2's bridge for moving receives): TURN-1.2 takes the body at the action's handoff touchdown, DRIBBLE-V1 the
  // ball settle s later — the first touch solved to be on the exit line HANDOFF_AHEAD ahead of the runner then (the runner: TURN-1.2 asked for vH + exitRamp.dv)
  settle: 0.6, aRun: 3.5,
  lateRedirect: true, lateMax: 9.5,   // large turns while moving: the contact before the body has shed the turn's speed (the cost after the contact)
  steer: true, steerEvery: 12, steerMax: 20,   // the run-out (TURN-1.2, before DRIBBLE-V1) steers onto the ball's actual line (≤ 20° off the exit)
  window: { tMin: 0.3, tMax: 1.6, band: 0.6, lat: 0.25, dv: 1.0 },   // the takeover window (see step())
};
// the runner after TURN-1.2 takes the body at vH (asked for vH + exitRamp.dv, reached at RM.aRun): distance along the exit after dt s, and the speed
function runAfter(vH, dt, vX) { const v1 = Math.max(vH, Math.min(vH + RX.exitRamp.dv, vX != null ? vX : Infinity)), a = RM.aRun, tA = (v1 - vH) / a; return dt <= tA ? { d: vH * dt + 0.5 * a * dt * dt, v: vH + a * dt } : { d: vH * tA + 0.5 * a * tA * tA + v1 * (dt - tA), v: v1 }; }
// RECEIVE-CONTROL-1.1's private rebase (a fresh TURN-1.2 actor continues the simulation's clock)
function rebase(A, T) { A.t += T; A.clk.t0 += T; for (const F of ["R", "L"]) { const L = A.legs[F]; if (L.tTD != null) L.tTD += T; if (L.tTO != null) L.tTO += T; } }
export class ReceiveSimM extends ReceiveSim2 {
  // ── THE MOVING HANDOFF: RECEIVE-CONTROL-1.1's handoff (TURN-1.2 actor from the action's exit state at its touchdown) — but DRIBBLE-V1 takes the ball
  // RM.settle later (RECEIVE-CONTROL-2's bridge: the takeover from a settled gait), the receive touch its last touch
  // the run-out before DRIBBLE-V1 (moving receives): TURN-1.2 steers toward the ball's actual line — the point HANDOFF_AHEAD behind where the free ball
  // will be when DRIBBLE-V1 takes it (the first touch carries the execution error; DRIBBLE-V1 takes over a ball ON the runner's line)
  step() {
    const c2 = this.rc2, rx = this.rx;
    // THE TAKEOVER WINDOW: DRIBBLE-V1 takes the ball when the state is one it takes over — the ball ahead on the runner's line (HANDOFF_AHEAD ± win.band),
    // within win.lat of it, not running away (≤ the runner + win.dv) — at least win.tMin after TURN-1.2 took the body, at the latest win.tMax after it
    if (RM.window && c2 && c2.phase === "exit" && !rx.stand && c2.t12) { const W = RM.window, dt = (this.k - c2.t12.k) * DT;
      if (dt >= W.tMin) { const b = this.ballA(), u = [Math.cos(rx.exitDir), Math.sin(rx.exitDir)], dx = b.p[0] - this.A.P[0], dy = -b.p[2] - this.A.P[1], ah = dx * u[0] + dy * u[1], lat = -dx * u[1] + dy * u[0], vr = Math.hypot(this.A.V[0], this.A.V[1]), vb = Math.hypot(b.v[0], b.v[2]), want = tab(HANDOFF_AHEAD, Math.max(RX.vFloor, vr));
        if ((ah >= want - W.band && ah <= want + W.band && Math.abs(lat) <= W.lat && vb <= vr + W.dv) || dt >= W.tMax) { c2.kDribble = this.k + 1; c2.window = { t: +(dt).toFixed(3), ahead: +ah.toFixed(2), lat: +lat.toFixed(2), timeout: dt >= W.tMax }; } else c2.kDribble = this.k + 1 + 999999; } }
    if (RM.steer && c2 && c2.phase === "exit" && !rx.stand && c2.kDribble != null && (this.k - c2.t12.k) % RM.steerEvery === 0) {
      const kT = Math.min(c2.kDribble, this.k + Math.round(0.4 / DT)), n = Math.max(1, kT - this.k), map = this.predictBall(this.k, n + 1), b = map.get(this.k + n); if (b) { const bp = [b.p[0], b.p[2]], u = [Math.cos(rx.exitDir), Math.sin(rx.exitDir)], vh = Math.hypot(this.A.V[0], this.A.V[1]), back = tab(HANDOFF_AHEAD, Math.max(RX.vFloor, vh));
        const T = [bp[0] - u[0] * back, bp[1] - u[1] * back], d = [T[0] - this.A.P[0], T[1] - this.A.P[1]]; if (Math.hypot(d[0], d[1]) > 0.5) { const dir = Math.atan2(d[1], d[0]); this.input = Object.assign({}, this.input, { dir: rx.exitDir + clamp(wrapA(dir - rx.exitDir), -RM.steerMax * DEG, RM.steerMax * DEG) }); this.A.input = this.input; } } }
    return super.step();
  }
  handoff(act) {
    if (!(RM.settle > 0)) return super.handoff(act);
    const k = this.k, rx = this.rx, A1 = act.A1, c2 = this.rc2;
    rebase(A1, act.tA + (k - act.kA) * DT);
    if (this.cfg.TURN11) this.cfg.TURN11.attach(A1, { mode: "t12" });
    A1.input = { dir: rx.exitDir, v: Math.min(Math.max(rx.exitV, RX.vFloor), Math.max(RX.vFloor, act.vH + RX.exitRamp.dv)) };
    this.A = A1; this.adjs = { R: {}, L: {} }; this.evalPose(A1); this.framesPrev = boneFramesOf(A1, A1.fk); this.prevColV = null; this.input = A1.input;
    rx.handoff = { k, t: Math.round(k * DT * 1000) / 1000, P: act.Ph.slice(), v: act.vH, dir: +(act.thX / DEG).toFixed(2), ballRel: null, ballSpeed: null, foot: act.Fh };
    c2.t12 = { k, P: act.Ph.slice(), v: r2(act.vH), dir: +(act.thX / DEG).toFixed(2), foot: act.Fh }; c2.phase = "exit"; c2.kDribble = k + Math.round(RM.settle / DT); c2.lastRxTouch = rx.contact ? rx.contact.T : null;
    rx.phase = "exitM"; rx.log.push({ k, ev: "handoff-turn12", v: act.vH }); if (this.body) this.body.end(act);
  }
  // a standing receiver whose pass runs into space: the stationary resolver finds no action within reach → the moving actions from a standing start
  resolve2(k) { super.resolve2(k); const c2 = this.rc2; if (c2.phase === "none") { c2.phase = "moving"; c2.log.push({ k, ev: "into-space: the moving actions" }); this.rx.nextTry = 0; } }
  rxIntercept(k, map) {
    const A = this.A, P = A.P, V0 = this.rx.stand && this.rx.phase !== "dribble" ? [0, 0] : A.V, s0 = Math.hypot(V0[0], V0[1]), vTop = Math.max(s0, this.rx.exitV, 3.0), ap = RX.approach, n = Math.round(ap.horizon / DT);
    let best = null;
    for (let i = 12; i <= n; i += 2) { const b = map.get(k + i); if (!b) break; if (b.p[1] > RX.ballHMax + 0.15) continue; const bx = b.p[0], by = b.p[2], t = i * DT;
      const dx = bx - P[0], dy = by - P[1], dl = Math.hypot(dx, dy), d = Math.max(0, dl - ap.reach), vr = d / t;
      const tAcc = Math.max(0, vr - s0) / ap.aMax; if (vr > vTop || (s0 * tAcc + 0.5 * ap.aMax * tAcc * tAcc + vr * Math.max(0, t - tAcc) < d * 0.999 && vr > s0)) continue;
      const vx = dl > 1e-6 ? dx / dl * vr : 0, vy = dl > 1e-6 ? dy / dl * vr : 0, dv = Math.hypot(vx - V0[0], vy - V0[1]), cost = dv + (RM.velFirst ? RM.wTime : 0.8) * t;   // (RECEIVE-MOVING-1: RM.velFirst — the meeting that keeps the run's velocity, not the earliest)
      if (!best || cost < best.cost) best = { k: k + i, t, p: [bx, by], v: [b.v[0], b.v[2]], d: dl, cost }; }
    return best;
  }
  rxApproach(k, est) {
    const A = this.A, P = A.P, s0 = Math.hypot(A.V[0], A.V[1]), ap = RX.approach; let dir = Math.atan2(est.p[1] - P[1], est.p[0] - P[0]), tx = est.p[0], ty = est.p[1];
    for (let it = 0; it < 3; it++) { tx = est.p[0] - dcos(dir) * ap.meet; ty = est.p[1] - dsin(dir) * ap.meet; const dx = tx - P[0], dy = ty - P[1]; if (Math.hypot(dx, dy) < 0.3) break; dir = Math.atan2(dy, dx); }
    const dist = Math.hypot(tx - P[0], ty - P[1]); if (dist < 0.3) dir = s0 > 0.3 ? Math.atan2(A.V[1], A.V[0]) : A.psi;
    const need = dist / Math.max(0.15, est.t), vTop = Math.min(9.5, Math.max(s0, this.rx.exitV) + ap.vUp);
    const band = RM.curveCut ? RM.keepBand : RM.prepBand != null && s0 > 1 ? RM.prepBand : ap.keepBand;   // (RM.curveCut: the tried wider keep band; RM.prepBand: RECEIVE-MOVING-1)
    let v = Math.abs(need - s0) <= band * Math.max(s0, 1) ? s0 : clamp(need, RX.vFloor, vTop);
    const tb = ap.turnBrake; if (this.rx.cls.turning && est.t < tb.within) { const ang = Math.abs(this.rx.cls.signed), sE = tab(S_ENTRY, ang) * tb.k; v = Math.min(v, sE + tb.aDec * Math.max(0, est.t - tb.lead)); }
    return { dir, v: r2(clamp(v, RX.vFloor, vTop)) };
  }
  evalCand(ctx, fam, F, sg, vi, kc) {
    const rx = this.rx, { k, P0, V0, psi0, s0, stand, map, est } = ctx, S = other(F), sF = sideOf(F), b = map.get(kc);
    if (!b) return this.rxRej("no-ball");
    if (b.p[1] > RX.ballHMax) return this.rxRej("airborne");
    const c = [b.p[0], b.p[2]], vin = [b.v[0], b.v[2]], sIn = Math.hypot(vin[0], vin[1]), Tp = (kc - k) * DT, thRun = ctx.thRun;
    // the exit rotation relative to the current facing, the long way round for the other side of a 180° turn
    let dEx = ctx.dEx0; if (fam.kind !== "ordinary" && Math.sign(dEx) !== sg && dEx !== 0) dEx += sg * 2 * Math.PI;
    // PREPARATION — the facing at the contact and the body's velocity there. The speed at the contact is the one that meets the ball on time along
    // the run (the minimum-acceleration straight-line solution) inside the family's range: never above the turn's entry speed (TURN-1's angle–velocity
    // trade-off) — and slowing only when the pass's timing needs it (a touch into stride keeps the pace when the meeting allows; braking is scored)
    let psiC, sMax, sMin, thV;
    if (fam.face.mode === "ball") { const hb = sIn > 0.5 ? hdg([-vin[0], -vin[1]]) : psi0; psiC = psi0 + clamp(wrapA(hb - psi0), -fam.face.max * DEG, fam.face.max * DEG); sMax = Math.min(Math.max(s0, 0.5), fam.vContact.max); sMin = 0; thV = thRun; }
    else if (fam.face.mode === "lead") { const dT = wrapA(rx.exitDir - thRun); psiC = thRun + clamp(fam.face.k * dT, -fam.face.max * DEG, fam.face.max * DEG);
      // RECEIVE-MOVING-1: the run CURVES toward the exit over the preparation (lateral acceleration RM.aLat), the rest of the redirection is the cut at
      // the contact: only that residual cut is capped by TURN-1's angle–speed law (RM.vCut); a receive into stride keeps the pace — it may not brake
      // below RM.keepShare × the run speed for a small cut (a later or earlier contact, a stride adjusted, instead)
      if (RM.curveCut) { const curve = stand ? 0 : Math.min(Math.abs(dT), RM.aLat / Math.max(s0, 2.5) * Math.min(Tp, RM.curveT)), cut = Math.abs(dT) - curve;
        sMax = Math.min(stand ? Math.min(2.2, rx.exitV) : Math.max(s0, Math.min(rx.exitV, s0 + 1.0)), tab(RM.vCut, cut / DEG) * fam.vContact.k); sMin = stand ? 0 : cut / DEG <= RM.smallCut ? Math.min(sMax, RM.keepShare * s0) : Math.max(1.2, 0.45 * s0); thV = stand ? psiC : thRun + Math.sign(dT) * curve; }
      else { sMax = Math.min(stand ? Math.min(2.2, rx.exitV) : Math.max(s0, Math.min(rx.exitV, s0 + 1.0)), tab(S_ENTRY, Math.max(45, Math.abs(dT) / DEG)) * fam.vContact.k); sMin = stand ? 0 : Math.max(1.2, 0.45 * s0); thV = stand ? psiC : thRun + 0.3 * dT; } }
    else { psiC = psi0 + sg * Math.min(fam.face.k * Math.abs(dEx), fam.face.max * DEG); sMax = Math.min(Math.max(s0, 0.5), tab(S_ENTRY, Math.abs(dEx) / DEG) * fam.vContact.k); sMin = 0; thV = thRun;
      // RECEIVE-MOVING-1 (lateRedirect): a moving receiver may take the ball before his body has shed the speed of the turn — the ball-touch capability and
      // the body's momentum redirection are separate: the contact at up to his run speed, the turn's cost paid AFTER the contact by the exit path (its
      // duration ≥ the velocity change / aExit — an overrun, a plant, the new line); the planner still prefers braking first where that is cheaper (score)
      if (RM.lateRedirect && !stand && s0 > RX.vFloor) sMax = Math.max(sMax, Math.min(s0, RM.lateMax)); }
    const lc = fam.contact[vi], Pc = toPitch(c, psiC, -lc[0], -sF * lc[1]), fV = [dcos(thV), dsin(thV)];
    const dAl = (Pc[0] - P0[0]) * fV[0] + (Pc[1] - P0[1]) * fV[1], v0Al = V0[0] * fV[0] + V0[1] * fV[1], Tm0 = stand ? null : Tp;
    // (a standing receiver holds, then moves into the contact over Tm — arriving at 1.5 d / Tm at most: the Hermite from rest then has its peak
    // acceleration 3 d / Tm² at the start and none at the contact)
    const dSt = stand ? Math.hypot(Pc[0] - P0[0], Pc[1] - P0[1]) : 0, Tm = stand ? clamp(Math.sqrt(3 * dSt / (0.8 * RX.aPrepStand)) + 0.15, 0.45, Tp) : Tp;
    const sNat = stand ? 1.5 * dSt / Tm : 2 * dAl / Tp - v0Al, sC = clamp(sNat, sMin, Math.max(sMin, sMax)), fC = stand && dSt > 0.05 ? [(Pc[0] - P0[0]) / dSt, (Pc[1] - P0[1]) / dSt] : fV, Vc = [sC * fC[0], sC * fC[1]];
    // the body path to the contact
    let prep, tS = 0;
    if (stand) { tS = Tp - Tm; prep = herm(P0, [0, 0], Pc, Vc, Tm); }
    else prep = herm(P0, V0, Pc, Vc, Tp);
    const aLim = stand ? RX.aPrepStand : RX.aPrep; if (this.dbgCand) this.dbgCand({ fam: fam.id, F, kc, sNat, sC, sMax, Pc, aPeak: prep.aPeak, psiC }); if (prep.aPeak > aLim) return this.rxRej("prep-accel");
    const rotPre = wrapA(psiC - psi0); if (Math.abs(rotPre) * 1.875 / Math.min(prep.T, 0.5) > RX.omegaMax * DEG) return this.rxRej("rot-prep");
    // EXIT — the handoff state: on the exit line, at a TURN-1.2 speed, after a contact → handoff with bounded acceleration and rotation
    const thX = rx.exitDir, dRot = rx.hold ? 0 : dEx - rotPre;
    const vH = rx.hold ? 0 : fam.id === "CUSHION" ? RX.vFloor : fam.exitV ? Math.max(RX.vFloor, Math.min(rx.exitV, tab(fam.exitV, Math.abs(dEx) / DEG))) : Math.max(RX.vFloor, Math.min(rx.exitV, sC + 1.0));
    const Vh = [vH * dcos(thX), vH * dsin(thX)], dV = Math.hypot(Vh[0] - Vc[0], Vh[1] - Vc[1]);
    const txMin = Math.max(fam.txMin, dV / RX.aExit, 1.875 * Math.abs(dRot) / (RX.omegaMax * DEG));
    // FOOTWORK fitted to the contact marker (and to TURN-1.2's touchdown at the handoff)
    const gp = this.E.r1GaitAt(this.A.body, this.E.RUN1.ref, clamp(Math.max(s0, sC), 2.5, 9.5)), gH = this.E.r1GaitAt(this.A.body, this.E.RUN1.ref, clamp(vH, 2.5, 9.5)), slow = Math.max(s0, sC) < 2.0;
    const F0 = stand ? F : this.touchdownNow() || "R", iNom = slow ? 0.34 : gp.Ts, dcK = slow ? 1 : gp.tc / gp.Ts;
    const st = planSteps({ t0: stand ? tS : 0, tc: Tp, F0, S, iNom, dcK, follow: fam.follow, txMin, iPost: fam.kind === "turning" ? 0.26 : Math.max(0.22, gH.Ts * 0.95), tfH: gH.Ts - gH.tc, slow, hold: rx.hold });
    if (!st) return this.rxRej("footwork");
    const Tx = rx.hold ? 0.45 : st.th - Tp, kh = rx.hold ? null : k + Math.round(st.th / DT);
    let exitP, Ph = null;
    if (rx.hold) { const Pst = [Pc[0] + Vc[0] * 0.22, Pc[1] + Vc[1] * 0.22]; exitP = herm(Pc, Vc, Pst, [0, 0], Tx); Ph = Pst; }
    else { const Txq = (kh - kc) * DT; Ph = [Pc[0] + (Vc[0] + Vh[0]) / 2 * Txq, Pc[1] + (Vc[1] + Vh[1]) / 2 * Txq]; exitP = herm(Pc, Vc, Ph, Vh, Txq); }
    // THE IDEAL FIRST TOUCH — the ball sent to where the player will next play it (reconnection point X at time tX)
    const rc = fam.reconnect; let X, nX, rest = false;
    if (rc.rest != null) { const psiE = rx.hold ? psiC : thX, Pe = rx.hold ? Ph : Ph; X = toPitch(Pe, psiE, rc.rest, 0); rest = true; nX = 2400; }
    else if (RM.settle > 0) { // RECEIVE-MOVING-1: DRIBBLE-V1 takes the ball RM.settle after the TURN-1.2 handoff — the ball on the exit line HANDOFF_AHEAD ahead of the runner then
      const tau = (RECONNECT_TAU[fam.id] || 0) + RM.settle, ra = runAfter(vH, tau, Math.max(rx.exitV, RX.vFloor)), u = [dcos(thX), dsin(thX)], Pb = [Ph[0] + u[0] * ra.d, Ph[1] + u[1] * ra.d]; X = toPitch(Pb, thX, tab(HANDOFF_AHEAD, ra.v), 0); nX = kh - kc + Math.round(tau / DT); }
    else { const tau = RECONNECT_TAU[fam.id] || 0, Pb = [Ph[0] + Vh[0] * tau, Ph[1] + Vh[1] * tau]; X = toPitch(Pb, thX, tab(HANDOFF_AHEAD, vH), 0); nX = kh - kc + Math.round(tau / DT); }
    const dX = [X[0] - c[0], X[1] - c[1]], DX = Math.hypot(dX[0], dX[1]); if (DX < 0.02) return this.rxRej("no-touch");
    const u0 = this.speedFor(DX, nX, rest); if (u0 == null) return this.rxRej("too-far");
    const uX = rest ? 0 : this.rollDist(u0, nX).v;
    const vRef = RM.settle > 0 && !rest ? runAfter(vH, (RECONNECT_TAU[fam.id] || 0) + RM.settle, Math.max(rx.exitV, RX.vFloor)).v : vH; if (!rest && uX > Math.max(1.6 * vRef, vRef + 2.5)) return this.rxRej("runs-away");
    const DXs = Math.sqrt(dX[0] * dX[0] + dX[1] * dX[1]), uOut = [dX[0] / DXs, dX[1] / DXs], vOut = [uOut[0] * u0, uOut[1] * u0], dv = [vOut[0] - vin[0], vOut[1] - vin[1]], dvM = Math.hypot(dv[0], dv[1]);
    const alpha = wrapA(hdg(dv) - psiC) / DEG, surfs = surfacesFor(fam, F, alpha, dvM); if (!surfs.length) return this.rxRej("surface", { fam: fam.id, F, kc, alpha, dvM });
    // the foot's yaw that presents the surface to the impulse, brought into the surface's authored yaw range by at most the glancing tolerance
    const tolG = tab(SURF.tol, dvM); let surface = null, yRel = 0, glance = 0, yRelI = 0;
    for (const sf of surfs) { const yawI = footYawFor(sf, F, dvM > 0.3 ? hdg(dv) : psiC), yi = sF * wrapA(yawI - psiC) / DEG, yr = SURF[sf].yaw, yc = clamp(yi, yr[0], yr[1]), g = Math.abs(yc - yi);
      if (g <= tolG) { surface = sf; yRel = yc; glance = g; yRelI = yi; break; } yRelI = yi; }
    if (!surface) return this.rxRej("foot-yaw", { fam: fam.id, F, kc, surfs, yRelI, alpha });
    const yawF = psiC + sF * yRel * DEG;
    // THE STANDING FOOT: planted where the ball's path after the contact clears it (the stance opens for the ball — in front of the toes or behind
    // the heel): the family's nominal plant, else stepped back / forward / wider; no clear plant → the action cannot pass the ball through
    const uDir = [dX[0] / DX, dX[1] / DX], segD = (p) => { const s = Math.max(0, (p[0] - c[0]) * uDir[0] + (p[1] - c[1]) * uDir[1]); return Math.hypot(c[0] + uDir[0] * s - p[0], c[1] + uDir[1] * s - p[1]); };
    const ls = fam.stand, yS = psiC - sF * 7 * DEG; let Spl = null, gS = -1;
    for (const [da, kl] of [[0, 1], [-0.12, 1], [0.12, 1], [-0.24, 1], [0, 1.3], [-0.12, 1.3], [0.12, 1.3], [-0.24, 1.3], [-0.36, 1], [0, 1.6], [-0.12, 1.6]]) {
      const pl = toPitch(Pc, psiC, ls[0] + da, sF * ls[1] * kl), heel = toPitch(pl, yS, -0.09, 0), toe = toPitch(pl, yS, 0.2, 0); let g = Infinity;
      for (let q = 0; q <= 6; q++) g = Math.min(g, segD([heel[0] + (toe[0] - heel[0]) * q / 6, heel[1] + (toe[1] - heel[1]) * q / 6]));
      if (g >= R + RX.clear.stand) { Spl = pl; gS = g; break; } if (g > gS) gS = g; }
    if (this.dbgCand) this.dbgCand({ fam: fam.id, F, kc, stage: "clear", gS, ideal: hdg(vOut), u0, surface, alpha, Pc, sC, sNat, sMax, aPeak: prep.aPeak, psiC });
    if (!Spl) return this.rxRej("stance-clear");
    // DIFFICULTY of the touch → execution σ (Ball Control)
    const redirect = sIn > 1 && u0 > 1 ? Math.abs(wrapA(hdg(vOut) - hdg(vin))) / DEG : 0, psiAt = (t) => this.psiPlan({ tS, Tp, psi0, psiC, dRot, Tx: rx.hold ? 0.45 : (kh - kc) * DT, hold: rx.hold }, t);
    const rot = Math.abs(wrapA(psiAt(Tp + RXE.diff.rotWin) - psiAt(Math.max(0, Tp - RXE.diff.rotWin)))) / DEG, weak = F !== this.pref;
    const dif = difficulty({ vIn: sIn, redirect, s: sC, rot, surface, weak, wf: this.wf, glance });
    const w = RX.score, aN = prep.aPeak / aLim, score = w.a * aN + w.tx * (rx.hold ? 0 : (kh - kc) * DT) + w.D * (dif.D - 1) + w.surf * SURF[surface].pref + (weak ? w.weak * (5 - (this.wf || 3)) / 2 : 0) + w.vLoss * (rx.exitV > 0 ? Math.max(0, rx.exitV - vH) / rx.exitV : 0) + w.dt * Math.abs(kc - est.k) * DT + fam.pref + w.rot * Math.abs(dRot) / Math.PI + (fam.id === "STRIDE" && s0 > 1 ? w.brake * Math.max(0, s0 - minSpeed(prep)) / s0 : 0) + (rest ? 0 : w.cross * Math.abs(wrapA(hdg(vOut) - thX)) / (30 * DEG));
    return { fam, F, S, sg, vi, kc, kh, k0: k, psi0, psiC, P0, V0, Pc, Vc, Ph, Vh, thX, vH, tS, Tp, Tx: rx.hold ? 0.45 : (kh - kc) * DT, dEx, dRot, rotPre, prep, exitP, steps: st, X, nX, rest, ideal: { dir: hdg(vOut), u: uOut, speed: u0, uX, vOut }, vin, sIn, c, cK: b.p.slice(), cH: b.p[1],
      surface, alpha, yawF, glance, dv, dvM, redirect, rot, dif, weak, score, aPeak: prep.aPeak, gS, stand, hold: rx.hold, sC, Spl, ySpl: yS, gp, gH };
  }
}
