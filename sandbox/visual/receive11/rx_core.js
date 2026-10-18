// ═══ receive11/rx_core.js — RECEIVE-CONTROL-1.1: receiving as an AUTHORITATIVE AUTHORED-ACTION SYSTEM beside the frozen DRIBBLE-V1 ════════════════
// RECEIVE-CONTROL-1 tried to make the first touch emerge from DRIBBLE-V1's foot-contact search (a model built for a ball already travelling with
// the player): 30 % of passes were never touched. RECEIVE-CONTROL-1.1 replaces that search with a dedicated RECEIVE CONTACT MODEL:
//
//   incoming rigid-body ball (BALL-PHYS, untouched)  →  receiver intent (exit direction / speed, kill or go)  →  receive ACTION selection
//   (rx_actions.js: family × contact foot × side × contact tick, scored deterministically)  →  authored preparation / body path (the action owns
//   the body: root, facing, footwork — with its turn cost)  →  AUTHORITATIVE RECEIVE CONTACT at the action's CONTACT marker (one resolved launch
//   through the kernel's own schedule(): the ball must be inside the action's contact window, or the kernel cancels it)  →  the IDEAL post-contact
//   ball state (where the player will next play it)  →  BALL CONTROL execution error (rx_exec.js)  →  the actual rigid-body ball state  →  free
//   ball physics  →  the action completes  →  explicit HANDOFF to DRIBBLE-V1 (a TURN-1.2 actor built from the action's exit state).
//
// Authority: the simulation owns the family, the foot, the contact tick, the ideal touch, the execution and the exit state; the procedural body
// (rx_body.js, a placeholder for authored animation) only shows them — with animation off the outcome is bit-identical (nothing in the decision
// reads a pose; during the action the receiver's colliders are out of the ball's world, the action's contact is the only interaction, and at the
// handoff the collider history restarts from TURN-1.2's own pose). DRIBBLE-V1 (dribble15/d15_core.js, tag dribble-v1-foundation-1) is imported,
// never modified: before the action the receiver runs on TURN-1.2 exactly as any DRIBBLE-V1 actor; after the handoff the frozen resolver runs.
import { DribbleSim, D1, DT, BALL_DEFAULT } from "../dribble15/d15_core.js";
import { receiveTurnAngle, exitTurn } from "../receive1/rc1_core.js";
import { FAMILIES, FAMILY_ORDER, HANDOFF_AHEAD, RECONNECT_TAU, S_ENTRY, SURF, surfacesFor, footYawFor, planSteps, herm, minSpeed, DEG, wrapA, clamp, s5, tab, fwd, rgt, hdg, toPitch, toLocal, sideOf, other } from "./rx_actions.js";
import { RXE, execute, difficulty, bcOf } from "./rx_exec.js";
import { dsin, dcos } from "../physchar2/core/v2_math.js";
export { BALL_DEFAULT, D1, DT, receiveTurnAngle, exitTurn, FAMILIES, RXE };
const R = 0.11, SIDES = ["R", "L"], now = (typeof performance !== "undefined" && performance.now) ? () => performance.now() : () => Date.now();
const r2 = (x) => Math.round(x * 100) / 100, r3 = (x) => Math.round(x * 1000) / 1000;
export const RX = {
  version: "RECEIVE-CONTROL-1.1",
  vFloor: 2.5,                   // m/s: TURN-1.2's slowest gait — the handoff speed is never below it (a kill + hold never hands off)
  // the approach before the action (TURN-1.2): run to the meeting point (RECEIVE-CONTROL-1's minimum-Δv interception); the pace is kept unless
  // the meeting needs ≥ keepBand × a different one (no braking for geometry: the action absorbs the last metres)
  approach: { every: 24, dead: { dir: 2.0, v: 0.25 }, keepBand: 0.06, vUp: 1.5, aMax: 4.0, reach: 0.5, horizon: 3.0, meet: 0.42,
    // a TURNING receive: TURN-1.2 starts braking toward the turn's entry speed (TURN-1's sEntry) in the last second — the body's own preparation
    turnBrake: { within: 1.3, aDec: 4.0, lead: 0.35, k: 1.2 } },
  // the action starts at a TURN-1.2 touchdown once the ball's meeting is within tMax s (a standing receiver: as soon as one is feasible); the
  // contact can be scheduled tMin … tMax after the start (the safe timing range of the preparation)
  start: { tMax: 1.05, tMin: 0.26, standMax: 2.6 },
  kcGrid: 6, kcSpan: 6,          // candidate contact ticks: the natural meeting ± kcSpan × kcGrid ticks
  aPrep: 9.5, aPrepStand: 5.5,   // m/s²: peak root acceleration of the preparation (moving — TURN-1.2's braking capacity / from a standing start)
  aExit: 9.0,                    // m/s²: mean acceleration from the contact to the handoff (TURN-1's braking / plant capacity, 9 m/s²)
  omegaMax: 620,                 // deg/s: peak body rotation (smootherstep peak = 1.875 × mean)
  contactTol: 0.06,              // m: the CONTACT WINDOW — the ball must be within this of the action's planned contact point at the marker
  ballHMax: 0.33,                // m: highest ball centre a ground receive takes (higher: no family applies)
  clear: { stand: 0.035, handoff: 0.30 },   // m: the ball's path past the standing foot (beyond the ball radius); ball ahead of the body at the handoff
  score: { a: 0.5, tx: 0.8, D: 1.2, surf: 1.0, weak: 0.35, vLoss: 0.6, dt: 0.9, rot: 0.15, brake: 1.0, cross: 0.3 },
  adapt: { lat: 0.5, back: 0.5, minAhead: 0.9, aK: 1.3 },
  exitRamp: { dv: 1.5, after: 0.8 },
  handoffLT: true,               // the receive touch is DRIBBLE-V1's last touch at the handoff (false: experiment only)   // the exit pace after the handoff: handoff speed + dv, the full exit pace `after` s later   // the exit's adaptation to the actual touch (m, m, m, × aExit)
  passMiss: 0.6, runOnDeg: 50,   // (classification only) the pass has gone by: moving away, passMiss m beyond its closest approach, unless it runs ahead along the run
};
// a profile with Ball Control set (the calibration harness / review cases): the attribute is the only change
export function withBC(player, bc) { return bc == null ? player : Object.assign({}, player, { attributes: Object.assign({}, player.attributes, { ball_control: bc }) }); }
const rootR = (psi) => { const a = psi + Math.PI / 2, c = dcos(a), s = dsin(a); return [c, 0, s, 0, 1, 0, -s, 0, c]; };
const mv = (A, p) => [A[0] * p[0] + A[1] * p[1] + A[2] * p[2], A[3] * p[0] + A[4] * p[1] + A[5] * p[2], A[6] * p[0] + A[7] * p[1] + A[8] * p[2]];
const mm = (A, B) => [A[0] * B[0] + A[1] * B[3] + A[2] * B[6], A[0] * B[1] + A[1] * B[4] + A[2] * B[7], A[0] * B[2] + A[1] * B[5] + A[2] * B[8], A[3] * B[0] + A[4] * B[3] + A[5] * B[6], A[3] * B[1] + A[4] * B[4] + A[5] * B[7], A[3] * B[2] + A[4] * B[5] + A[5] * B[8], A[6] * B[0] + A[7] * B[3] + A[8] * B[6], A[6] * B[1] + A[7] * B[4] + A[8] * B[7], A[6] * B[2] + A[7] * B[5] + A[8] * B[8]];
// the collider frames of a body (DRIBBLE-V1's boneFrames: root-frame FK → world), for the handoff's collider history
export function boneFramesOf(A, fk) { const Rr = rootR(A.psi), T = [A.P[0], 0, -A.P[1]], ix = A.body.idx, out = {};
  for (const S of SIDES) for (const b of ["thigh", "shin", "foot", "toe"]) { const i = ix[b + "_" + S], p = mv(Rr, fk.P[i]); out[b + "_" + S] = { R: mm(Rr, fk.R[i]), p: [p[0] + T[0], p[1], p[2] + T[2]] }; } return out; }
// TURN-1.2's clock rebased: a fresh actor (t1Make starts its clock at 0) continues the simulation's time (its swing / touchdown times are absolute)
function rebase(A, T) { A.t += T; A.clk.t0 += T; for (const F of SIDES) { const L = A.legs[F]; if (L.tTD != null) L.tTD += T; if (L.tTO != null) L.tTO += T; } }

export class ReceiveSim11 extends DribbleSim {
  // cfg.scenario: { init {v, heading, pos}, pass {from, dist, speed, lead, off, lift}, exit {turn (deg, + right, relative to the initial facing),
  //   v (m/s; 0 = kill and hold), intent ("go" | "kill")}, dur }; cfg.bc: Ball Control override (calibration); cfg.opts.anim (default: record)
  constructor(cfg) {
    const scn = cfg.scenario, ex = scn.exit || { turn: 0 }, player = withBC(cfg.player, cfg.bc);
    const vReq = ex.v != null ? ex.v : Math.max(scn.init.v, RX.vFloor), cmds = [{ t: 0, turn: ex.turn, v: Math.max(vReq, RX.vFloor) }];
    super(Object.assign({}, cfg, { player, scenario: Object.assign({}, scn, { cmds, ball: { ahead: 0, lateral: 0, speed: 0 } }) }));
    const stand = (scn.init.v || 0) < 0.3, intent = ex.intent || (vReq === 0 ? "kill" : "go");
    this.bc = bcOf(player); this.anim = cfg.opts && cfg.opts.anim != null ? !!cfg.opts.anim : !!(cfg.opts && cfg.opts.record);
    this.rx = { phase: "approach", stand, intent, hold: vReq === 0, exitDir: this.rawInput(0).dir, exitV: Math.max(vReq, intent === "kill" ? 0 : RX.vFloor), approach: null, est: null, act: null, nEvent: 0, log: [], first: null,
      plans: 0, cands: 0, candLog: [], rej: {}, kA: 0, cpuRx: 0, cpuPlan: 0, handoff: null, contact: null };
    this.rx.pass = this.setPass(scn.pass, scn.init);
    this.rx.cls = Object.assign({ k: 0, facing: +((scn.init.heading || 0) / DEG).toFixed(3) }, receiveTurnAngle(scn.init.heading || 0, this.rx.exitDir));
    this.rx.cls.kind = this.rx.cls.turning ? "turning" : "ordinary";
    if (this.anim) this.body = cfg.Body ? new cfg.Body(this) : null;
    if (stand) { this.A.V = [0, 0]; this.rx.ready = { P: this.A.P.slice(), psi: this.A.psi }; this.parkColliders(); }
    // (the frozen constructor ran its own intent / record for tick 0 before the adapter existed: replaced)
    this.held = null; this.userDir = null; this.turnLog = []; this.input = this.intent(0); this.A.input = this.input;
    if (stand && this.body) { const pz = this.body.ready(this.rx.ready, 0); this.A.skinMats = pz.skin; this.framesPrev = pz.frames; }
    if (this.rec) { this.rec.length = 0; this.record(); }
  }
  // ── the pass (RECEIVE-CONTROL-1's setPass, unchanged): struck from `from` / `dist` toward where the receiver's run takes him, aimed with BALL-PHYS's
  // own free ball (rolling resistance included); `off` misplaces it, `lift` lofts it
  setPass(pa, init) {
    const h0 = init.heading || 0, f = [dcos(h0), dsin(h0)], r = [-dsin(h0), dcos(h0)], P0 = init.pos, b = (pa.from || 0) * DEG, L = pa.lead != null ? pa.lead : 1;
    const O = [P0[0] + pa.dist * (dcos(b) * f[0] + dsin(b) * r[0]), P0[1] + pa.dist * (dcos(b) * f[1] + dsin(b) * r[1])], off = pa.off || [0, 0], v0 = init.v || 0;
    const aimAt = (T) => [P0[0] + L * v0 * T * f[0] + off[0] * f[0] + off[1] * r[0], P0[1] + L * v0 * T * f[1] + off[0] * f[1] + off[1] * r[1]];
    const strike = (aim) => { const d = [aim[0] - O[0], aim[1] - O[1]], dl = Math.hypot(d[0], d[1]), u = [d[0] / dl, d[1] / dl];
      this.W.ball.p = [O[0], R, O[1]]; this.W.ball.v = [u[0] * pa.speed, pa.lift || 0, u[1] * pa.speed]; this.W.ball.w = [u[1] * pa.speed / R, 0, -u[0] * pa.speed / R]; this.W.ball.mode = "AIRBORNE"; this.W.ball.sleeping = false; this.W.restTime = 0;
      return { u, dl }; };
    const n = Math.round(6 / DT); let { u } = strike(aimAt(pa.dist / pa.speed)); const map = this.predictBall(0, n), sAt = (i) => { const q = map.get(i); return (q.p[0] - O[0]) * u[0] + (q.p[2] - O[1]) * u[1]; };
    let T = null, i0 = null; for (let i = 1; i <= n; i++) { const a = aimAt(i * DT); if (sAt(i) >= Math.hypot(a[0] - O[0], a[1] - O[1])) { i0 = i; T = i * DT; break; } }
    const aim = aimAt(T != null ? T : pa.dist / pa.speed); strike(aim);
    const m2 = this.predictBall(0, n), q = i0 != null ? m2.get(i0) : null;
    return { origin: O, aim, T: T != null ? +T.toFixed(3) : null, vArr: q ? r2(Math.hypot(q.v[0], q.v[2])) : 0, speed: pa.speed, from: pa.from || 0, dist: pa.dist, lead: L };
  }
  // the free ball (BALL-PHYS, no colliders) from the actual state — exact while nothing touches it (the receiver's colliders are out of the ball's
  // world during an action); re-made when the actual ball has left the cached prediction
  rxBall(k, n) { const c = this.rx.bm, b = this.W.ball;
    if (c && c.map.has(k) && c.k0 + c.n >= k + Math.min(n, 360)) { const q = c.map.get(k); if (Math.abs(q.p[0] - b.p[0]) + Math.abs(q.p[1] - b.p[1]) + Math.abs(q.p[2] - b.p[2]) < 1e-9) return c.map; }
    const n2 = Math.max(n, 720), map = this.predictBall(k, n2); this.rx.bm = { k0: k, n: n2, map }; return map; }
  // ── the meeting point (RECEIVE-CONTROL-1's interception): of the predicted free-ball points the receiver can reach in time, the one that asks the
  // least change of his running velocity, earlier slightly preferred
  rxIntercept(k, map) {
    const A = this.A, P = A.P, V0 = this.rx.stand && this.rx.phase !== "dribble" ? [0, 0] : A.V, s0 = Math.hypot(V0[0], V0[1]), vTop = Math.max(s0, this.rx.exitV, 3.0), ap = RX.approach, n = Math.round(ap.horizon / DT);
    let best = null;
    for (let i = 12; i <= n; i += 2) { const b = map.get(k + i); if (!b) break; if (b.p[1] > RX.ballHMax + 0.15) continue; const bx = b.p[0], by = b.p[2], t = i * DT;
      const dx = bx - P[0], dy = by - P[1], dl = Math.hypot(dx, dy), d = Math.max(0, dl - ap.reach), vr = d / t;
      const tAcc = Math.max(0, vr - s0) / ap.aMax; if (vr > vTop || (s0 * tAcc + 0.5 * ap.aMax * tAcc * tAcc + vr * Math.max(0, t - tAcc) < d * 0.999 && vr > s0)) continue;
      const vx = dl > 1e-6 ? dx / dl * vr : 0, vy = dl > 1e-6 ? dy / dl * vr : 0, dv = Math.hypot(vx - V0[0], vy - V0[1]), cost = dv + 0.8 * t;
      if (!best || cost < best.cost) best = { k: k + i, t, p: [bx, by], v: [b.v[0], b.v[2]], d: dl, cost }; }
    return best;
  }
  // the approach input: straight to where the body must be when the ball arrives (the ball meet m in front of him), at his current pace unless the
  // meeting needs a clearly different one (≥ keepBand) — never below TURN-1.2's floor
  rxApproach(k, est) {
    const A = this.A, P = A.P, s0 = Math.hypot(A.V[0], A.V[1]), ap = RX.approach; let dir = Math.atan2(est.p[1] - P[1], est.p[0] - P[0]), tx = est.p[0], ty = est.p[1];
    for (let it = 0; it < 3; it++) { tx = est.p[0] - dcos(dir) * ap.meet; ty = est.p[1] - dsin(dir) * ap.meet; const dx = tx - P[0], dy = ty - P[1]; if (Math.hypot(dx, dy) < 0.3) break; dir = Math.atan2(dy, dx); }
    const dist = Math.hypot(tx - P[0], ty - P[1]); if (dist < 0.3) dir = s0 > 0.3 ? Math.atan2(A.V[1], A.V[0]) : A.psi;
    const need = dist / Math.max(0.15, est.t), vTop = Math.min(9.5, Math.max(s0, this.rx.exitV) + ap.vUp);
    let v = Math.abs(need - s0) <= ap.keepBand * Math.max(s0, 1) ? s0 : clamp(need, RX.vFloor, vTop);
    const tb = ap.turnBrake; if (this.rx.cls.turning && est.t < tb.within) { const ang = Math.abs(this.rx.cls.signed), sE = tab(S_ENTRY, ang) * tb.k; v = Math.min(v, sE + tb.aDec * Math.max(0, est.t - tb.lead)); }
    return { dir, v: r2(clamp(v, RX.vFloor, vTop)) };
  }
  intent11(k) {
    if (!this.rx || this.rx.phase === "dribble") return super.intent11(k);
    const rx = this.rx;
    if (rx.phase !== "approach" || rx.stand) return this.input || { dir: this.A.psi, v: RX.vFloor };
    if (!rx.approach || k % RX.approach.every === 0) {
      const map = this.rxBall(k, Math.round(RX.approach.horizon / DT)), est = this.rxIntercept(k, map); rx.est = est;
      const a = est ? this.rxApproach(k, est) : null;
      if (a && (!rx.approach || Math.abs(wrapA(a.dir - rx.approach.dir)) > RX.approach.dead.dir * DEG || Math.abs(a.v - rx.approach.v) > RX.approach.dead.v)) { rx.approach = a; rx.log.push({ k, ev: "approach", dir: +(a.dir / DEG).toFixed(1), v: a.v, est: est ? { k: est.k, t: r3(est.t) } : null }); }
      if (!rx.approach) { const s0 = Math.hypot(this.A.V[0], this.A.V[1]); rx.approach = { dir: this.A.psi, v: r2(Math.max(RX.vFloor, s0)) }; }
    }
    return { dir: rx.approach.dir, v: rx.approach.v };
  }
  // THE EXIT INTENT AFTER THE HANDOFF: the requested exit direction, and the exit pace reached in two steps — the handoff speed + exitRamp.dv first,
  // the full pace exitRamp.after s later (a player accelerating out of a turn; a single jump to full pace with the ball rolling at his speed is a
  // pocket DRIBBLE-V1 does not take: receive11/tools/rx_d1accept.mjs). Two discrete steps keep DRIBBLE-V1's shared prediction valid between them.
  rawInput(t) { const r = super.rawInput(t), ho = this.rx && this.rx.handoff; if (!ho || t < ho.k * DT - 1e-9) return r; const e = RX.exitRamp;
    return { dir: r.dir, v: t - ho.k * DT < e.after ? Math.min(r.v, Math.max(RX.vFloor, ho.v + e.dv)) : r.v }; }
  // no dribble resolver before the handoff (there is no ball to dribble — a pass is coming)
  resolve(k) { if (this.rx && this.rx.phase !== "dribble") return; return super.resolve(k); }
  // control classification: RECEIVING until the receive contact; then DRIBBLE-V1's own (the ball en route to the point the touch aimed at)
  classify(k) {
    const rx = this.rx; if (!rx || rx.phase === "dribble" || rx.contact) return super.classify(k);
    if (this.ctrl.state !== "RECEIVING") { this.ctrl.changes.push({ k, t: k * DT, from: this.ctrl.state, to: "RECEIVING", dist: null }); this.ctrl.state = "RECEIVING"; this.ctrl.since = k; }
    const b = this.ballA(); this.ctrl.dist = Math.hypot(b.p[0] - this.A.P[0], b.p[2] + this.A.P[1]);
  }
  // the receiver's colliders are taken out of the ball's world while an authored action (or the standing ready stance) owns the body: the action's
  // contact is its only interaction with the ball (presentation never collides). Restored at the handoff from TURN-1.2's pose.
  parkColliders() { for (const S of SIDES) for (const part of ["boot", "toe", "shin", "thigh"]) this.W.setColliderFrame(`${this.pid}:${part}_${S}`, { p: [0, -60, 0], q: [0, 0, 0, 1], v: [0, 0, 0], w: [0, 0, 0] }); }
  touchdownNow() { const A = this.A; for (const F of SIDES) { const L = A.legs[F]; if (L.stance && L.tTD != null && A.t - L.tTD < DT * 1.01 - 1e-12) return F; } return null; }
  // ── THE FIXED STEP ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  step() {
    const rx = this.rx;
    if (rx.phase === "dribble") return super.step();
    if (rx.phase === "approach") {
      const c0 = now(); let act = null;
      if (rx.stand ? this.k >= (rx.nextTry || 0) : (this.touchdownNow() && this.k >= (rx.nextTry || 0))) { act = this.planAction(this.k); if (!act && rx.stand) rx.nextTry = this.k + RX.kcGrid; }
      rx.cpuPlan += now() - c0;
      if (act) this.beginAction(act);
      else if (!rx.stand) { const c1 = now(); super.step(); rx.cpuRx += now() - c1; return; }
      else return this.authoredStep(null);
    }
    return this.authoredStep(rx.act);
  }
  // ── RECEIVE ACTION SELECTION: every family the receive is eligible for × contact foot × side × contact position × contact tick, each evaluated in
  // closed form (body path, footwork, ideal touch, surface, difficulty); the lowest score wins (deterministic: fixed order, strict comparison)
  planAction(k) {
    const rx = this.rx, A = this.A, stand = rx.stand, P0 = A.P.slice(), V0 = stand ? [0, 0] : A.V.slice(), psi0 = A.psi, s0 = Math.hypot(V0[0], V0[1]);
    const H = Math.round((stand ? RX.start.standMax : RX.start.tMax + 0.2) / DT) + 60, map = this.rxBall(k, H), est = this.rxIntercept(k, map); rx.est = est; rx.plans++;
    if (!est) { this.rxRej("no-meeting"); return null; }
    if (!stand && est.t > RX.start.tMax) return null;                                 // (still far: keep approaching — not a planning event)
    const cls = rx.cls, kind = cls.turning ? "turning" : "ordinary", dEx0 = wrapA(rx.exitDir - psi0), ctx = { k, P0, V0, psi0, s0, stand, map, est, dEx0, thRun: s0 > 1 ? hdg(V0) : psi0 };
    const fams = FAMILY_ORDER.map((id) => FAMILIES[id]).filter((f) => (f.kind === kind || f.kind === "any") && f.intents.includes(rx.intent));
    let best = null, n = 0; const kMin = k + Math.round(RX.start.tMin / DT), kMax = k + Math.round((stand ? RX.start.standMax : RX.start.tMax + 0.12) / DT);
    for (const fam of fams) {
      const sig0 = Math.sign(dEx0) || 1, sides = kind === "turning" && fam.kind !== "any" && Math.abs(dEx0) >= 170 * DEG ? [sig0, -sig0] : [sig0];
      for (const sg of sides) { const feet = fam.feet === "either" ? ["R", "L"] : fam.feet === "near" ? [sg > 0 ? "R" : "L"] : [sg > 0 ? "L" : "R"];
        for (const F of feet) for (let vi = 0; vi < fam.contact.length; vi++) for (let j = -RX.kcSpan; j <= RX.kcSpan; j++) {
          const kc = est.k + j * RX.kcGrid; if (kc < kMin || kc > kMax) continue; n++;
          const c = this.evalCand(ctx, fam, F, sg, vi, kc); if (c && (!best || c.score < best.score)) best = c; } } }
    rx.cands += n;
    if (!best) { if (est.t < RX.start.tMin + 0.05 && !stand) this.rxRej("too-late"); rx.log.push({ k, ev: "no-action", n, est: { k: est.k, t: r3(est.t) }, rej: Object.assign({}, this.rx.rejNow || {}) }); this.rx.rejNow = {}; return null; }
    rx.candLog.push({ k, n, best: { fam: best.fam.id, F: best.F, side: best.sg, kc: best.kc, score: r3(best.score) } }); this.rx.rejNow = {};
    return best;
  }
  rxRej(why, info) { if (this.dbgRej) this.dbgRej(why, info); const r = this.rx; r.rej[why] = (r.rej[why] || 0) + 1; (r.rejNow = r.rejNow || {})[why] = (r.rejNow[why] || 0) + 1; return null; }
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
      sMax = Math.min(stand ? Math.min(2.2, rx.exitV) : Math.max(s0, Math.min(rx.exitV, s0 + 1.0)), tab(S_ENTRY, Math.max(45, Math.abs(dT) / DEG)) * fam.vContact.k); sMin = stand ? 0 : Math.max(1.2, 0.45 * s0); thV = stand ? psiC : thRun + 0.3 * dT; }
    else { psiC = psi0 + sg * Math.min(fam.face.k * Math.abs(dEx), fam.face.max * DEG); sMax = Math.min(Math.max(s0, 0.5), tab(S_ENTRY, Math.abs(dEx) / DEG) * fam.vContact.k); sMin = 0; thV = thRun; }
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
    else { const tau = RECONNECT_TAU[fam.id] || 0, Pb = [Ph[0] + Vh[0] * tau, Ph[1] + Vh[1] * tau]; X = toPitch(Pb, thX, tab(HANDOFF_AHEAD, vH), 0); nX = kh - kc + Math.round(tau / DT); }
    const dX = [X[0] - c[0], X[1] - c[1]], DX = Math.hypot(dX[0], dX[1]); if (DX < 0.02) return this.rxRej("no-touch");
    const u0 = this.speedFor(DX, nX, rest); if (u0 == null) return this.rxRej("too-far");
    const uX = rest ? 0 : this.rollDist(u0, nX).v;
    if (!rest && uX > Math.max(1.6 * vH, vH + 2.5)) return this.rxRej("runs-away");
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
  // the launch speed whose free roll covers distance D in n ticks (rest: comes to rest after D) — BALL-PHYS's own roll table (DRIBBLE-V1's)
  speedFor(D, n, rest) { const f = (u) => (rest ? this.rollDist(u, 4800).d : this.rollDist(u, n).d); if (f(25) < D) return null; let lo = 0, hi = 25; for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (f(m) < D) lo = m; else hi = m; } return hi; }
  // the authored facing: the preparation rotation over the last 0.45 s before the contact, the exit rotation from the contact to the handoff
  psiPlan(a, t) {
    const tR = Math.max(a.tS, a.Tp - 0.45), rp = a.rotPre != null ? a.rotPre : wrapA(a.psiC - a.psi0); let psi = a.psi0 + rp * s5((t - tR) / Math.max(1e-3, a.Tp - tR));
    if (t > a.Tp) psi = a.psiC + a.dRot * s5((t - a.Tp) / Math.max(1e-3, a.Tx));
    return psi;
  }
  // the authored root (position, velocity, facing) at tick kk of the action
  rootAt(act, kk) {
    const t = (kk - act.k0) * DT; let st;
    if (t <= act.tS) st = { P: act.P0.slice(), V: [0, 0] };
    else if (t <= act.Tp) st = act.prep.at(t - act.tS);
    else if (t <= act.Tp + act.Tx) st = act.exitP2 && t >= act.exitP2.t0 ? act.exitP2.h.at(t - act.exitP2.t0) : act.exitP.at(t - act.Tp);
    else st = act.hold ? { P: act.Ph.slice(), V: [0, 0] } : { P: [act.Ph[0] + act.Vh[0] * (t - act.Tp - act.Tx), act.Ph[1] + act.Vh[1] * (t - act.Tp - act.Tx)], V: act.Vh.slice() };
    st.psi = this.psiPlan(act, Math.min(t, act.Tp + act.Tx)); return st;
  }
  beginAction(act) {
    const rx = this.rx, k = this.k; rx.nEvent++; act.eventId = "rx" + rx.nEvent + "@" + act.kc; act.kA = rx.stand ? 0 : k; act.tA = this.A.t;
    act.rotPre = wrapA(act.psiC - act.psi0);
    // the handoff state as TURN-1.2 will hold it (built now: its plants are the action's last two footsteps)
    if (!act.hold) { act.Fh = act.steps.steps[act.steps.h].F; act.A1 = this.T1.t1Make(this.cfg.skel, { v: act.vH, heading: act.thX, pos: act.Ph.slice(), foot: act.Fh, turn12: true }); }
    act.kNext = act.rest ? act.kc + Math.round(1.0 / DT) : act.kc + act.nX;
    rx.act = act; rx.phase = "action"; this.parkColliders();
    rx.log.push({ k, ev: "action", id: act.eventId, fam: act.fam.id, F: act.F, side: act.sg, kc: act.kc, kh: act.kh, surface: act.surface, ideal: { dir: +(act.ideal.dir / DEG).toFixed(1), speed: r2(act.ideal.speed) }, D: r3(act.dif.D), score: r3(act.score) });
    if (this.body) this.body.begin(act);
  }
  // ── AN AUTHORED TICK: the action owns the body (root from its path, pose from the presentation layer); the CONTACT marker; the ball kernel ──────
  authoredStep(act) {
    const k = this.k, A = this.A, c0 = now();
    if (act) { const st = this.rootAt(act, k + 1); A.P = st.P; A.V = st.V; A.psi = st.psi; const sp = Math.hypot(st.V[0], st.V[1]); this.input = { dir: sp > 0.3 ? hdg(st.V) : st.psi, v: sp }; }
    (this.inLog || (this.inLog = []))[k] = { dir: this.input.dir, v: this.input.v };
    if (act && k === act.kc) this.contactNow(k, act);
    if (act && !act.hold && !act.adapted && this.rx.contact && this.rx.contact.T.launched && k < act.kh - 12) this.adaptExit(k, act);
    if (this.body) { const pz = act ? this.body.poseAt(act, k + 1) : this.body.ready(this.rx.ready, k + 1); if (pz) { A.skinMats = pz.skin; this.framesPrev = pz.frames; } }
    const c1 = now();
    if (!this.kernelStep(k)) { this.cpu.ball += now() - c1; return; }
    const c2 = now(); this.post(k);
    this.k++; this.cpu.ball += c2 - c1; this.cpu.loco += c1 - c0; this.cpu.n++; this.rx.cpuRx += now() - c0;
    this.record();
    if (act && !act.hold && this.k === act.kh) this.handoff(act);
  }
  // ── THE AUTHORITATIVE RECEIVE CONTACT (the action's CONTACT marker): ideal touch → Ball Control execution → one resolved launch ────────────────
  contactNow(k, act) {
    const b = this.W.ball, vin = [b.v[0], b.v[2]], sIn = Math.hypot(vin[0], vin[1]), key = ["RECEIVE", this.pid, act.eventId];
    const ex = execute(this.rng, key, act.ideal, sIn, this.bc, act.dif.D), vk = [ex.v[0], 0, ex.v[1]], wk = [vk[2] / R, 0, -vk[0] / R], id = `${this.pid}:${act.eventId}`;
    // the kernel asserts the contact window (the ball within contactTol of the planned contact point — never a teleport) and that no other
    // collider contests the ball; colliderId null: the authored action's contact is not a boot-mesh collision
    this.W.schedule({ id, tick: k, position: act.cK.slice(), maxContactError: RX.contactTol, velocity: vk, spin: wk, colliderId: null, preparedAt: this.W.time,
      metadata: { family: "RECEIVE_" + act.fam.id, technique: act.surface, selectedFoot: act.F, preferredFoot: this.pref, seed: this.rng.seed, executionQuality: 1 / act.dif.D, model: RXE.id } });
    const sp = Math.hypot(this.A.V[0], this.A.V[1]);
    const T = { id, k, t: k * DT, F: act.F, reg: act.surface, hull: "boot", collider: `${this.pid}:boot_${act.F}`, swing: -1, receive: true, family: act.fam.id, side: act.sg, weak: act.F !== this.pref, arch: this.arch,
      ball: [b.p[0], b.p[1], -b.p[2]], pre: { v: [b.v[0], b.v[1], -b.v[2]], w: [-b.w[0], -b.w[1], b.w[2]] }, gap: 0, otherGap: 1,
      desired: { v: [act.ideal.vOut[0], 0, -act.ideal.vOut[1]], speed: act.ideal.speed, target: [act.X[0], 0, -act.X[1]], kNext: act.kNext },
      executed: { v: [vk[0], 0, -vk[2]], speed: ex.speed }, error: { dirDeg: ex.dirErrDeg, speed: ex.speedErr, sigDirDeg: ex.sigDirDeg, sigSpeed: ex.sigSpeed, N: ex.N, bc: ex.bc, D: ex.D, keyId: ex.keyId },
      expect: { F: null, swing: null, k: act.kNext, com: null, target: null, inp: null }, minNext: Math.max(0.2, act.hold ? 0.5 : (act.kh - act.kc) * DT), release: false, recovery: false, role: "receive", heldDir: null, setupSw: false, dec: null,
      contactAhead: toLocal(this.A.P, this.A.psi, [b.p[0], b.p[2]])[0], com: this.A.P.slice(), speedPlayer: sp, ctrl: this.ctrl.state, launched: false };
    this.touches.push(T); this.rx.contact = { k, T, ex, act };
  }
  // ── THE EXIT FOLLOWS THE ACTUAL TOUCH: once the receive launch is authoritative, the rest of the action's body path is re-solved on the actual
  // ball (the executed touch, error included, predicted by BALL-PHYS): the running line is shifted sideways (≤ adapt.lat) so the ball is ON it at
  // the handoff, and back (≤ adapt.back) if the ball would be closer than adapt.minAhead — within the exit's acceleration limit; the exit
  // direction, the handoff speed and tick are unchanged. A touch that went too far wrong for that is not chased by the action: DRIBBLE-V1 gets it.
  adaptExit(k, act) {
    act.adapted = true; const kX = act.kc + act.nX, n = kX - k, map = this.predictBall(k, n + 2), b = map.get(kX); if (!b) return;
    const tau = (kX - act.kh) * DT, Bh = [b.p[0] - act.Vh[0] * tau, b.p[2] - act.Vh[1] * tau], rel = toLocal(act.Ph, act.thX, Bh), A = RX.adapt, lat = clamp(rel[1], -A.lat, A.lat), back = rel[0] < A.minAhead ? clamp(rel[0] - A.minAhead, -A.back, 0) : 0;
    if (Math.abs(lat) < 0.01 && back === 0) { act.adapt = { lat: 0, back: 0, rel: rel.map(r3) }; return; }
    const t0 = (k - act.k0) * DT - act.Tp, st = act.exitP.at(t0), Tr = (act.kh - k) * DT;
    for (const f of [1, 0.75, 0.5, 0.25]) { const Ph2 = toPitch(act.Ph, act.thX, back * f, lat * f), h2 = herm(st.P, st.V, Ph2, act.Vh, Tr);
      if (h2.aPeak <= RX.aExit * A.aK) { const T0 = act.Tp + t0; act.exitP2 = { h: h2, t0: T0 }; act.Ph = Ph2; act.adapt = { lat: r3(lat * f), back: r3(back * f), rel: rel.map(r3), aPeak: r2(h2.aPeak) };
        act.A1 = this.T1.t1Make(this.cfg.skel, { v: act.vH, heading: act.thX, pos: Ph2.slice(), foot: act.Fh, turn12: true }); if (this.body) this.body.retarget(act); return; } }
    act.adapt = { lat: 0, back: 0, rel: rel.map(r3), refused: true };
  }
  // ── HANDOFF to DRIBBLE-V1: the action's exit state becomes a TURN-1.2 actor at a touchdown (its clock continues the simulation's), the collider
  // history restarts from its own pose, the frozen resolver's state is fresh (no plan, no held cut, the exit as the requested direction), the
  // receive touch is its last touch (the ball en route to the point it was sent to; no dribble touch before the touch's interval)
  handoff(act) {
    const k = this.k, rx = this.rx, A1 = act.A1;
    rebase(A1, act.tA + (k - act.kA) * DT);
    if (this.cfg.TURN11) this.cfg.TURN11.attach(A1, { mode: "t12" });
    A1.input = { dir: rx.exitDir, v: Math.min(Math.max(rx.exitV, RX.vFloor), Math.max(RX.vFloor, act.vH + RX.exitRamp.dv)) };
    this.A = A1; this.adjs = { R: {}, L: {} }; this.evalPose(A1); this.framesPrev = boneFramesOf(A1, A1.fk); this.prevColV = null;
    this.plan = null; this.job = null; this.locoCache = null; this.ballCache = null; this.track = null; this.adoptable = []; this.genMemo = null; this.ftHold = null; this.carry = null; this.carryTask = null;
    this.held = null; this.userDir = rx.exitDir; this.stageDir = null; this.replanAt = k; this.recoverAt = k; this.lastPursuit = k;
    if (RX.handoffLT === false) { this.lastTouch = null; this.recoverAt = null; }   // (experiment: DRIBBLE-V1 starts as from a scenario — no last touch)
    const b = this.ballA(), rel = toLocal(act.Ph, act.thX, [b.p[0], -b.p[2]]);
    rx.handoff = { k, t: r3(k * DT), P: act.Ph.slice(), v: act.vH, dir: +(act.thX / DEG).toFixed(2), ballRel: rel.map(r3), ballSpeed: r2(Math.hypot(b.v[0], b.v[2])), foot: act.Fh };
    rx.phase = "dribble"; rx.log.push({ k, ev: "handoff", v: act.vH, ballRel: rx.handoff.ballRel });
    if (this.body) this.body.end(act);
  }
  // the record also carries the receive's state for the debugger (the authored action, the contact, the handoff)
  record() { super.record(); if (!this.rec || !this.rx) return; const r = this.rec[this.rec.length - 1]; r.rx = { phase: this.rx.phase, act: this.rx.act ? this.rx.act.eventId : null }; }
  // ── the receive's summary (the evidence reads this) ──────────────────────────────────────────────────────────────────────────────────────────
  summary() {
    const rx = this.rx, a = rx.act, c = rx.contact, T = c ? c.T : null;
    return { cls: rx.cls, intent: rx.intent, hold: rx.hold, bc: this.bc, action: a ? { id: a.eventId, fam: a.fam.id, F: a.F, side: a.sg, surface: a.surface, k0: a.k0, kc: a.kc, kh: a.kh, tc: r3(a.kc * DT), th: a.kh != null ? r3(a.kh * DT) : null,
        psi0: +(a.psi0 / DEG).toFixed(1), psiC: +(a.psiC / DEG).toFixed(1), rotPre: +(a.rotPre / DEG).toFixed(1), rotExit: +(a.dRot / DEG).toFixed(1), sC: r2(a.sC), vH: r2(a.vH), s0: r2(Math.hypot(a.V0[0], a.V0[1])),
        ideal: { dirAbs: +(a.ideal.dir / DEG).toFixed(1), dirRel: +(wrapA(a.ideal.dir - a.psi0) / DEG).toFixed(1), speed: r2(a.ideal.speed), vsExit: +(wrapA(a.ideal.dir - a.thX) / DEG).toFixed(1) }, D: r3(a.dif.D), Dparts: a.dif.parts, alpha: +a.alpha.toFixed(1), dvM: r2(a.dvM), redirect: +a.redirect.toFixed(1), sIn: r2(a.sIn), score: r3(a.score), gS: r3(a.gS), aPeak: r2(a.aPeak), m: a.steps.m, h: a.steps.h } : null,
      contact: T ? { k: T.k, launched: !!T.launched, cancelled: T.cancelled || null, exec: { dirAbs: +(c.ex.dir / DEG).toFixed(1), speed: r2(c.ex.speed), dirErr: +c.ex.dirErrDeg.toFixed(2), speedErr: r2(c.ex.speedErr), sigDir: +c.ex.sigDirDeg.toFixed(2), sigSpeed: r2(c.ex.sigSpeed) } } : null,
      handoff: rx.handoff, plans: rx.plans, cands: rx.cands, rej: rx.rej, cpu: { rx: Math.round(rx.cpuRx), plan: Math.round(rx.cpuPlan) } };
  }
}
