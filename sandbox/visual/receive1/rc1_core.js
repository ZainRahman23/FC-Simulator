// ═══ receive1/rc1_core.js — RECEIVE-CONTROL-1: full-throttle receiving / first touch, as an ADAPTER on the frozen DRIBBLE-V1 foundation ═══════════
// (dribble15/d15_core.js at tag dribble-v1-foundation-1 is imported, never modified). A ReceiveSim IS a DribbleSim: the same TURN-1.2 body, the same
// authoritative free physical ball (BALL-FEEL-1.3 kernel), the same resolved-touch commit with one authoritative impulse, the same contact geometry,
// launch solving, clearance checks, incremental planner and keyed execution error. What the adapter adds is the part of the game before the first
// touch, which the dribble foundation does not do (with an incoming pass it never moves to meet the ball, and a held turn is dropped at once because
// the ball is not yet at the feet):
//   1. the INCOMING PASS — the ball's initial state is a struck pass from anywhere around the receiver (rolling, spin consistent with rolling);
//   2. INTERCEPTION — from BALL-PHYS's prediction of the free ball and the receiver's speed, the first point of the ball's path he can be at in
//      time; the approach input runs him there (TURN-1.2 moves him as it moves any running player — no teleport, no extra acceleration);
//   3. CLASSIFICATION — receiveTurnAngle = the desired exit direction relative to the receiver's facing when the pass is played, in [0°, 360°)
//      (+ = to the right, the lab's convention); 90°–270° (|signed| ≥ 90°) is a TURNING receive, anything else an ORDINARY receive;
//   4. THE FIRST TOUCH — the frozen planner's own candidate / version / check / installation pipeline, given RECEIVE OPTIONS:
//        · the approach motion: a first touch into it (launch solved toward the next touch window; the incoming ball's velocity enters through
//          the impulse-normal contact law), with the exit held as a requested cut, so the frozen cut machinery (cut-at-contact, set-up with the
//          switch, cut value) applies to the receive touch as to any touch;
//        · for a meaningful turn, the exit RELEASED at ticks timed against the ball's predicted arrival (the body starts turning before contact
//          and keeps turning through it), each an exact TURN-1.2 branch of the approach: the decisive contact is searched on the turning body's
//          swings — whichever foot, surface (inside / outside / laces / toe) and moment the geometry offers — and its launch takes the ball
//          into the new line;
//   5. EXECUTION — the touch draws the core's keyed execution error (seed, player, tick, foot), scaled by a generic RECEIVE DIFFICULTY (incoming
//      speed, the redirection the touch makes): a hard pass redirected sharply can be heavy, wrong-side or lost (Ball Control later scales it);
//   6. HANDOFF — once the first touch has launched the adapter stops: the frozen DRIBBLE-V1 resolver (intent, planner, pursuit, clearance) carries
//      on from the authoritative state (body, ball, last touch, held / released exit) with the exit as the player's requested direction.
import { DribbleSim, D1, DT, BALL_DEFAULT } from "../dribble15/d15_core.js";
export { BALL_DEFAULT, D1, DT };
const R = 0.11, SIDES = ["R", "L"], DEG = Math.PI / 180, wrapA = (a) => { a = (a + Math.PI) % (2 * Math.PI); if (a < 0) a += 2 * Math.PI; return a - Math.PI; };
const clamp = (x, a, b) => (x < a ? a : x > b ? b : x), r2 = (x) => Math.round(x * 100) / 100;
export const RC1 = {
  turnMin: 90,                 // |receiveTurnAngle| ≥ this (deg): a turning receive (90°–270° of the 0–360 convention)
  reach: 0.55,                 // m: a receiving foot reaches this far from the body's line (interception estimate only — every contact is searched exactly)
  aMax: 4.0,                   // m/s²: the receiver's acceleration in the interception estimate (TURN-1.2 makes the real motion)
  vFloor: 2.5,                 // m/s: the slowest locomotion TURN-1.2 / RUN-1 has (no walk / stand) — the approach never asks for less
  approachDead: { dir: 2.0, v: 0.25 },   // deg, m/s: the approach input is re-aimed only beyond this (an input change invalidates every prediction)
  approachEvery: 24,           // ticks: how often the interception is re-estimated while no plan is in force
  release: { before: [0.62, 0.48, 0.34, 0.2], minCut: 35 },   // s before the predicted arrival: the release ticks evaluated (meaningful turns ≥ minCut°)
  // APPROACH LINES: the frozen contact vocabulary meets a ball only where its path passes within a few cm of a foot's swing path with a surface able
  // to face it (the contact normal follows the velocity change, so for a hard pass it faces the incoming ball) — a body running straight at the
  // ball's line offers almost none. The planner also evaluates the approach re-aimed so that the ball's path passes these distances to either side
  // of the body (exact TURN-1.2 branches switching plan13.lead ticks ahead): the line is chosen by the contact it produces
  // (where the ball is to arrive in the body frame [ahead, lateral (+ right)] m: the base approach, and the alternatives the planner evaluates)
  // (a closing speed of 8–12 m/s turns a 0.1 s stride-phase error into a metre: the speed variants re-time the meeting against the stride, the side
  // variants put the ball beside a foot) — { at: [ahead, lateral], dv: m/s on the arrive-on-time pace }
  meet: [0.45, 0], lines: [{ at: [0.45, -0.3] }, { at: [0.45, -0.15] }, { at: [0.45, 0.15] }, { at: [0.45, 0.3] }, { at: [0.45, 0], dv: -0.8 }, { at: [0.45, 0], dv: 0.8 }, { at: [0.45, 0], dv: 1.6 }],
  vUp: 2.0,                    // m/s: the approach may run up to this much faster than his run / the exit pace to meet the ball (TURN-1.2 accelerates him)
  horizon: 2.2,                // s: the receive plan's prediction horizon
  planStep: 1,                 // ticks: contact-tick sampling of the receive search (every tick)
  searchH: 1.2,                // s: contact search horizon of the receive search in every motion
  reach2: { lat: 0.35 },       // receive swing-adjustment bounds overriding D1.reach during receive planning: the receiving foot reaches 0.35 m sideways
  // (CPU) the receive search starts once the ball's meeting is within searchH + farMargin s (before that the approach alone runs); approach-line
  // switch ticks lie on a lineGrid-tick grid, so the line branches of successive searches are the same TURN-1.2 predictions (re-used, not re-made)
  passMiss: 0.6,               // m: the ball moving away and this much beyond its closest approach — the receive was missed (chase mode)
  farMargin: 0.25, lineGrid: 48, relGrid: 12, searchGap: 24,   // (ticks: switch-tick grids; a search that found nothing waits searchGap before the next)
  lineAfter: 0.45, turnAfter: 0.9,   // s after the meeting estimate: the end of an approach line's / a turn option's contact window
  // TURN LINES: for a big turn (≥ turnLineMin°), the turn released early from the approach lines on the TURN SIDE (the ball passing beside the
  // standing leg on the side the body turns to): exact two-switch TURN-1.2 branches — the line from its switch tick, the exit from the release tick
  turnLineMin: 110, turnLines: [0.3, 0.5], turnLineBefore: [0.95, 0.75, 0.55, 0.35],
  touchPace: true,             // the receive touch sized for the exit pace (full throttle: see makePlanG)
  regCost: null,               // receive surface preference added to the frozen contact cost, e.g. { FRONT: 0.3, LACES: 0.1, INSIDE: -0.1 }
  warp2: null,                 // (experiments) receive swing time-warp bounds overriding D1.warp during receive planning
  blockGap: 0.015,             // m: a stance boot / shin of the receiver within this of the predicted free ball blocks the later contacts
  sigma: { vRef: 6, vK: 0.06, turnK: 0.35 }   // receive difficulty: σ × (1 + vK·max(0, |v_in| − vRef) + turnK·redirect/180°) (generic; attributes later)
};
// receiveTurnAngle: the desired exit relative to the facing. deg360 ∈ [0, 360): 0 = straight on, 90 = right, 180 = behind, 270 = left (= −90°).
export function receiveTurnAngle(facing, exit) { const s = wrapA(exit - facing) / DEG, s2 = Math.abs(s) > 180 - 1e-9 ? 180 : s; return { signed: +s2.toFixed(6), deg360: +(((s2 % 360) + 360) % 360).toFixed(6), turning: Math.abs(s2) >= RC1.turnMin - 1e-9 }; }
// the lab's exit request for a receiveTurnAngle in [0°, 360°): the signed turn (the frozen rawInput clamps ±179.5°: 180° is taken as 179.5° right,
// or −179.5° left with side "L")
export const exitTurn = (deg360, side = "R") => { const s = ((deg360 % 360) + 360) % 360; return s === 180 ? (side === "L" ? -180 : 180) : s > 180 ? s - 360 : s; };
export class ReceiveSim extends DribbleSim {
  // cfg.scenario: { init {v, heading, pos, foot?}, pass { from (deg: bearing of the passer relative to the receiver's facing, + right, 0 = in front,
  //   180 = behind), dist (m), speed (m/s at the strike), lead (0..1: how far the pass leads the receiver's run; default 1), off [ahead, lateral] (m:
  //   a misplaced pass, receiver frame), lift (m/s) }, exit { turn (deg, + right, relative to the initial facing), v (m/s) }, dur }
  constructor(cfg) {
    const scn = cfg.scenario, ex = scn.exit || { turn: 0 };
    const cmds = [{ t: 0, turn: ex.turn, v: ex.v != null ? ex.v : Math.max(scn.init.v, RC1.vFloor) }];
    super(Object.assign({}, cfg, { scenario: Object.assign({}, scn, { cmds, ball: { ahead: 0, lateral: 0, speed: 0 } }) }));
    this.rc = { phase: "approach", exitDir: this.rawInput(0).dir, exitV: this.rawInput(0).v, approach: null, est: null, plans: 0, log: [], first: null, pending: null, cls: null, branches: new Map(), pass: null };
    this.rc.pass = this.setPass(scn.pass, scn.init);
    // (the frozen constructor ran its own intent for tick 0 before the adapter existed: the receive intent replaces it, and tick 0 is re-recorded)
    this.held = null; this.userDir = null; this.turnLog = []; this.input = this.intent(0); this.A.input = this.input;
    if (this.rec) { this.rec.length = 0; this.record(); }
  }
  // the pass: struck from `from` / `dist` toward the point the receiver will reach (his current run, `lead` of it) — aimed with BALL-PHYS's own free
  // ball, so the ball really passes there (rolling resistance included); `off` misplaces it
  setPass(pa, init) {
    const h0 = init.heading || 0, f = [Math.cos(h0), Math.sin(h0)], r = [-Math.sin(h0), Math.cos(h0)], P0 = init.pos, b = (pa.from || 0) * DEG, L = pa.lead != null ? pa.lead : 1;
    const O = [P0[0] + pa.dist * (Math.cos(b) * f[0] + Math.sin(b) * r[0]), P0[1] + pa.dist * (Math.cos(b) * f[1] + Math.sin(b) * r[1])], off = pa.off || [0, 0], v0 = init.v || 0;
    const aimAt = (T) => [P0[0] + L * v0 * T * f[0] + off[0] * f[0] + off[1] * r[0], P0[1] + L * v0 * T * f[1] + off[0] * f[1] + off[1] * r[1]];
    const strike = (aim) => { const d = [aim[0] - O[0], aim[1] - O[1]], dl = Math.hypot(d[0], d[1]), u = [d[0] / dl, d[1] / dl];
      this.W.ball.p = [O[0], R, O[1]]; this.W.ball.v = [u[0] * pa.speed, pa.lift || 0, u[1] * pa.speed]; this.W.ball.w = [u[1] * pa.speed / R, 0, -u[0] * pa.speed / R]; this.W.ball.mode = "AIRBORNE"; this.W.ball.sleeping = false; this.W.restTime = 0;   // (the kernel's own initial state for a moving ball)
      return { u, dl }; };
    // the ball's free roll (BALL-PHYS, no colliders) from the strike: distance covered per tick (a straight roll: the same along any direction)
    const n = Math.round(6 / DT); let { u } = strike(aimAt(pa.dist / pa.speed)); const map = this.predictBall(0, n), sAt = (i) => { const q = map.get(i); return (q.p[0] - O[0]) * u[0] + (q.p[2] - O[1]) * u[1]; };
    // the arrival: the first tick at which the ball has covered the distance to where the receiver's run (lead) will be then
    let T = null, i0 = null; for (let i = 1; i <= n; i++) { const a = aimAt(i * DT); if (sAt(i) >= Math.hypot(a[0] - O[0], a[1] - O[1])) { i0 = i; T = i * DT; break; } }
    const aim = aimAt(T != null ? T : pa.dist / pa.speed); strike(aim);
    const m2 = this.predictBall(0, n), q = i0 != null ? m2.get(i0) : null;
    return { origin: O, aim, T: T != null ? +T.toFixed(3) : null, vArr: q ? r2(Math.hypot(q.v[0], q.v[2])) : 0, speed: pa.speed, from: pa.from || 0, dist: pa.dist, lead: L };
  }
  // ── interception estimate: the MEETING POINT — of the points of the predicted free ball he can reach in time (straight line, bounded
  // acceleration from his current speed), the one that asks the least change of his running velocity (a receiver adjusts his run to the ball:
  // a through ball is met where his run meets it, a cross-field pass where his line crosses it), earlier slightly preferred. An estimate that only
  // steers the approach — every contact is searched exactly
  rcIntercept(k) {
    // (the planner's free-ball prediction when it is current — exact while the ball is untouched — else a fresh one)
    const n = Math.round(RC1.horizon / DT), bc = this.ballCache, map = bc && bc.k0 <= k && bc.k0 + bc.n >= k + n && !this.ballChangedCache() ? bc.map : this.predictBall(k, n), A = this.A, P = A.P, V0 = A.V, s0 = Math.hypot(V0[0], V0[1]), vTop = Math.max(s0, this.rc.exitV, 3.0);
    let best = null;
    for (let i = 12; i <= n; i += 2) { const b = map.get(k + i); if (!b) break; const bx = b.p[0], by = b.p[2], t = i * DT;   // (predictBall: kernel frame [x, h, y])
      const dx = bx - P[0], dy = by - P[1], dl = Math.hypot(dx, dy), d = Math.max(0, dl - RC1.reach), vr = d / t;
      // reachable: the average speed needed, with the time lost accelerating from s0 toward it
      const tAcc = Math.max(0, vr - s0) / RC1.aMax; if (vr > vTop || s0 * tAcc + 0.5 * RC1.aMax * tAcc * tAcc + vr * Math.max(0, t - tAcc) < d * 0.999 && vr > s0) continue;
      const vx = dl > 1e-6 ? dx / dl * vr : 0, vy = dl > 1e-6 ? dy / dl * vr : 0, dv = Math.hypot(vx - V0[0], vy - V0[1]), cost = dv + 0.8 * t;
      if (!best || cost < best.cost) best = { k: k + i, t, p: [bx, by], v: [b.v[0], b.v[2]], d: dl, cost }; }
    return best;
  }
  // the approach input: the body's target is where the ball is to arrive at `at` = [ahead, lateral] in his frame at the meeting time; he runs
  // straight there at the pace that arrives on time (never below the locomotion floor, never above his run / the exit pace)
  rcApproach(k, at = RC1.meet, est0 = null, dv = 0) {
    const est = est0 || this.rcIntercept(k); if (!est0) this.rc.est = est; if (!est) return null;
    const A = this.A, P = A.P, s0 = Math.hypot(A.V[0], A.V[1]); let dir = Math.atan2(est.p[1] - P[1], est.p[0] - P[0]), tx = est.p[0], ty = est.p[1];
    for (let it = 0; it < 3; it++) { const f = [Math.cos(dir), Math.sin(dir)], r = [-f[1], f[0]]; tx = est.p[0] - f[0] * at[0] - r[0] * at[1]; ty = est.p[1] - f[1] * at[0] - r[1] * at[1];
      const dx = tx - P[0], dy = ty - P[1]; if (Math.hypot(dx, dy) < 0.3) break; dir = Math.atan2(dy, dx); }
    const dist = Math.hypot(tx - P[0], ty - P[1]); if (dist < 0.3) dir = s0 > 0.3 ? Math.atan2(A.V[1], A.V[0]) : A.psi;
    const vTop = Math.min(9.5, Math.max(s0, this.rc.exitV) + RC1.vUp), v = clamp(dist / Math.max(0.15, est.t) + dv, RC1.vFloor, vTop);
    return { dir, v: r2(v) };
  }
  // ── the receive intent: the approach (re-aimed only beyond a dead band), the exit held as a requested cut while it differs from the approach line,
  // released by the receive plan (its release tick, or the core's release with the contact); after the first touch: the frozen DRIBBLE-V1 intent
  intent11(k) {
    if (!this.rc || this.rc.phase !== "approach") return super.intent11(k);
    const P = this.plan, rc = this.rc;
    // a plan made in an APPROACH LINE switches the approach at its switch tick (the plan's motion from then on: its input); a plan made in the
    // released exit releases the turn at its release tick
    const ln = P && P.pred && P.pred.rcLine;
    if (ln && k >= ln.kS && !(rc.approach && rc.approach.dir === ln.inp.dir && rc.approach.v === ln.inp.v)) { rc.approach = { dir: ln.inp.dir, v: ln.inp.v }; P.input = rc.approach; rc.log.push({ k, ev: "approach-line", dir: +(rc.approach.dir / DEG).toFixed(1), v: rc.approach.v, by: P.id }); }
    if (P && P.relAt != null && k >= P.relAt) { if (this.held && !this.held.released) { this.held.released = true; this.held.releasedAt = k; this.userDir = this.held.user; this.turnLog.push({ k, t: k * DT, kind: "release", by: "receive-turn", id: P.id }); } P.relAt = null; }
    if (this.held && this.held.released) return { dir: rc.exitDir, v: rc.exitV };
    if (this.ftHold) { const L = this.A.legs[this.ftHold.F]; if (!L.stance && Math.round(L.tTO * 240) === this.ftHold.swing) return this.input; this.ftHold = null; }
    if (!rc.approach || (!this.plan && k % RC1.approachEvery === 0)) {
      const a = this.rcApproach(k);
      if (a && (!rc.approach || Math.abs(wrapA(a.dir - rc.approach.dir)) > RC1.approachDead.dir * DEG || Math.abs(a.v - rc.approach.v) > RC1.approachDead.v)) { rc.approach = a; rc.log.push({ k, ev: "approach", dir: +(a.dir / DEG).toFixed(1), v: a.v, est: rc.est ? { k: rc.est.k, t: +rc.est.t.toFixed(3) } : null }); }
      if (!rc.approach) { const s0 = Math.hypot(this.A.V[0], this.A.V[1]); rc.approach = { dir: this.A.psi, v: r2(Math.max(RC1.vFloor, s0)) }; }
    }
    if (!rc.cls) { const c = receiveTurnAngle(this.A.psi, rc.exitDir); rc.cls = Object.assign({ k, kind: c.turning ? "turning" : "ordinary", facing: +(this.A.psi / DEG).toFixed(3) }, c); }
    const dA = Math.abs(wrapA(rc.exitDir - rc.approach.dir)) / DEG, raw = { dir: rc.exitDir, v: rc.exitV };
    // (the hold's clock runs from now: the exit is requested for the receive, which has not happened yet — the frozen set-up / hold rules measure
    // what remains of a hold from it)
    if (dA > D1.cutGate) { if (!this.held) this.held = { raw, user: rc.exitDir, since: k * DT, released: false, line: rc.approach.dir }; else { this.held.line = rc.approach.dir; this.held.since = k * DT; } this.userDir = null; }
    else { this.held = null; this.userDir = rc.exitDir; }   // (the exit is the approach line: nothing to hold)
    return { dir: rc.approach.dir, v: rc.approach.v };
  }
  // ── the receive planner: the frozen planner's setup (the main prediction, the free ball) and its search / versions / checks / installation, run on
  // the RECEIVE OPTIONS; after the first touch, the frozen dribble planner
  *makePlanG(k, sliced) {
    if (this.rc.phase !== "approach") return yield* super.makePlanG(k, sliced);
    // (FULL THROTTLE: the receive touch is sized for the pace the receiver leaves at — up to vUp above his speed, toward the exit pace — when
    // RC1.touchPace is on: the frozen rules then read that speed for the launch limits, next-touch interval and separation)
    this.cpu.plans++; this.rc.plans++; this.jwu0 = this.wuTotal(); const c0 = typeof performance !== "undefined" ? performance.now() : Date.now(), A = this.A, s0 = r2(Math.hypot(A.V[0], A.V[1])), s = RC1.touchPace ? r2(Math.max(s0, Math.min(this.rc.exitV, s0 + RC1.vUp))) : s0;
    const held = this.held && !this.held.released ? this.held.raw : null, H = Math.round(RC1.horizon / DT), need = Math.round(1.0 / DT), key = this.inputKey();
    if (!this.locoCache || this.locoCache.key !== key || this.locoCache.k0 + this.locoCache.n - need < k) this.locoCache = { key, k0: k, n: H, need, pred: this.viewFor(k, H), alt: null };
    const LC = this.locoCache, off = k - LC.k0;
    if (!this.ballCache || this.ballChangedCache() || this.ballCache.k0 + this.ballCache.n - need < k) { if (this.ballCache && this.ballChangedCache()) this.ballEpoch = (this.ballEpoch || 0) + 1; this.ballCache = { k0: k, n: H, map: this.predictBall(k, H) }; }
    const opts = [{ pred: LC.pred, off, release: false }];
    this.c12 = this.c12Of(held);
    const LocoTrack = LC.pred.track && LC.pred.track.constructor, PredView = LC.pred.constructor;
    const branch = (inp, kS) => { const bk = LC.pred.track.id + "|" + kS + "|" + inp.dir + "|" + inp.v; let tr = this.rc.branches.get(bk);
      if (!tr) { const cp = LC.pred.track.checkpoint(k, kS); this._tk = "receive"; tr = cp ? new LocoTrack(this, cp.k, cp.C, this.input, inp, kS, LC.pred.track, true) : new LocoTrack(this, k, this.A, this.input, inp, kS, LC.pred.track, true); this._tk = null;
        this.rc.branches.set(bk, tr); if (this.rc.branches.size > 48) this.rc.branches.delete(this.rc.branches.keys().next().value); }
      return new PredView(tr, k, H); };
    // approach lines: the ball arriving elsewhere in the body frame (RC1.lines), each an exact TURN-1.2 branch switching plan13.lead ticks ahead
    const est = this.rcIntercept(k), cur = this.input; this.rc.estPlan = est;
    // CHASE: once the pass has gone by (closest approach passed by passMiss m, the ball moving away) the receive is missed — the receiver chases the
    // loose ball like any loose ball: the current motion only (no approach lines, no timed turns)
    { const b = this.ballA(), dx = b.p[0] - A.P[0], dy = -b.p[2] - A.P[1], d = Math.hypot(dx, dy), away = dx * (b.v[0] - A.V[0]) + dy * (-b.v[2] - A.V[1]) > 0;
      this.rc.dMin = Math.min(this.rc.dMin ?? Infinity, d); if (this.rc.chase == null && away && d > this.rc.dMin + RC1.passMiss) { this.rc.chase = k; this.rc.log.push({ k, ev: "chase", dMin: +this.rc.dMin.toFixed(2) }); } }
    const chase = this.rc.chase != null;
    if (!chase && est && est.t > RC1.searchH + RC1.farMargin) { this.reachable = false; this.rc.far = (this.rc.far || 0) + 1; return; }   // (the ball still far: approach only)
    if (!chase && !this.plan && this.rc.nextSearch != null && k < this.rc.nextSearch) { this.reachable = false; return; }   // (nothing found a moment ago: the same futures)
    // the option set of a main motion and switch tick is fixed when first made (its branches and their candidates are then re-used by later searches)
    const kS = Math.ceil((k + D1.plan13.lead) / RC1.lineGrid) * RC1.lineGrid, oKey = LC.pred.track.id + "|" + kS;
    if (!this.rc.optSet || this.rc.optSet.key !== oKey) this.rc.optSet = { key: oKey, est, lines: RC1.lines.map((ln) => ({ ln, a: est ? this.rcApproach(k, ln.at, est, ln.dv || 0) : null })), tl: new Map() };
    const OS = this.rc.optSet;
    if (!chase && est && LC.pred.track && RC1.lines.length) {
      for (const { ln, a } of OS.lines) { if (!a) continue;
        if (Math.abs(wrapA(a.dir - cur.dir)) < RC1.approachDead.dir * DEG && Math.abs(a.v - cur.v) < RC1.approachDead.v) continue;
        if (held && a.dir === held.dir && a.v === held.v) continue;
        // (an ordinary motion, not a release: a touch made in it keeps the exit held — the frozen line / set-up semantics; its candidates carry the
        // line's input as `now` so the planner checks them in their own motion — blockers, approach — and they get the line version only)
        const pv = branch(a, kS); pv.rcTag = "line" + JSON.stringify(ln); pv.rcLine = { inp: a, kS }; opts.push({ pred: pv, off: 0, jMin: Math.max(0, kS - k - 1), release: false, now: a, kS, rcLine: true, rcEnd: est.k + Math.round(RC1.lineAfter / DT) - k - 1 }); } }
    // turn lines: the approach re-aimed to the turn side, then the exit released early (two switches), for a big turn
    if (!chase && held && est && LC.pred.track && Math.abs(wrapA(held.dir - cur.dir)) >= RC1.turnLineMin * DEG) {
      const side = wrapA(held.dir - cur.dir) > 0 ? 1 : -1, inp = { dir: held.dir, v: held.v };
      for (const lat of RC1.turnLines) { if (!OS.tl.has(lat)) OS.tl.set(lat, this.rcApproach(k, [RC1.meet[0], side * lat], OS.est || est, 0)); const a = OS.tl.get(lat); if (!a) continue; const pl = branch(a, kS), tl = pl.track;
        for (const b of RC1.turnLineBefore) { const kS2 = Math.round((est.k - Math.round(b / DT)) / RC1.relGrid) * RC1.relGrid; if (kS2 < kS + D1.cloneStride) continue;
          const bk = tl.id + "|" + kS2 + "|" + inp.dir + "|" + inp.v; let tr = this.rc.branches.get(bk);
          if (!tr) { const cp = tl.checkpoint(kS, kS2); if (!cp) continue; this._tk = "receive"; tr = new LocoTrack(this, cp.k, cp.C, a, inp, kS2, tl, true); this._tk = null; this.rc.branches.set(bk, tr); if (this.rc.branches.size > 48) this.rc.branches.delete(this.rc.branches.keys().next().value); }
          const pv = new PredView(tr, k, H); pv.rcTag = "turnline" + lat + "@" + b; pv.rcLine = { inp: a, kS };
          opts.push({ pred: pv, off: 0, jMin: Math.max(0, kS2 - k - 1), release: true, now: inp, kS: kS2, rcEnd: est.k + Math.round(RC1.turnAfter / DT) - k - 1 }); } } }
    // a meaningful turn: the exit released at ticks timed against the ball's predicted arrival (each an exact TURN-1.2 branch of the approach motion)
    if (!chase && held && est && LC.pred.track && Math.abs(wrapA(held.dir - this.input.dir)) >= RC1.release.minCut * DEG) {
      const kArr = est.k, inp = { dir: held.dir, v: held.v };
      const ticks = [...new Set(RC1.release.before.map((b) => Math.max(Math.ceil((k + D1.plan13.lead) / RC1.relGrid) * RC1.relGrid, Math.round((kArr - Math.round(b / DT)) / RC1.relGrid) * RC1.relGrid)))].sort((a, b) => a - b);
      for (const kS of ticks) { const pv = branch(inp, kS); pv.rcTag = "turn@" + (kArr - kS); opts.push({ pred: pv, off: 0, jMin: Math.max(0, kS - k - 1), release: true, now: inp, kS, rcEnd: kArr + Math.round(RC1.turnAfter / DT) - k - 1 }); } }
    LC.pred.rcTag = "main";
    const rj = (key2) => { if (this.rej) this.rej[key2] = (this.rej[key2] || 0) + 1; };
    // (CONTACT TIMING: an incoming pass closes on the feet at up to 15 m/s — 6 cm per tick — so the receive search samples every contact tick in every
    // motion (the frozen dribble samples the current motion every o2planStep = 3 ticks, its release motions every tick): the override is in force only
    // inside this planner's own slices and is restored at every pause)
    // (and the contact search looks searchH s ahead in every motion: a pass met 1.2 s away is a decision now — the dribble's 1.0 s / 0.7 s horizons
    // assume a ball already at the feet)
    // (RECEIVE REACH: the receiving foot may reach reachLat sideways of its running path at the contact — the frozen dribble's 0.15 m keeps the ball
    // under the body; a pass is met where it runs, beside the standing foot)
    const g = this.plan13G(k, s, held, LC, off, opts, rj, c0), st0 = D1.o2planStep, h0 = D1.o2horizon, n0 = D1.cut12.nowHorizon, rch = D1.reach, wp = D1.warp; let r;
    for (;;) { D1.o2planStep = RC1.planStep; D1.o2horizon = RC1.searchH; D1.cut12.nowHorizon = RC1.searchH; D1.reach = RC1.reach2 ? Object.assign({}, rch, RC1.reach2) : rch; D1.warp = RC1.warp2 ? Object.assign({}, wp, RC1.warp2) : wp;
      try { r = g.next(); } finally { D1.o2planStep = st0; D1.o2horizon = h0; D1.cut12.nowHorizon = n0; D1.reach = rch; D1.warp = wp; } if (r.done) break; yield r.value; }
    this.rc.nextSearch = this.plan || chase ? null : this.k + RC1.searchGap;
    if (this.plan && this.plan.made === k) this.rc.log.push({ k, ev: "plan", kc: this.plan.kc, F: this.plan.F, reg: this.plan.reg, relAt: this.plan.relAt ?? null, role: this.plan.setupSw ? "setup" : this.plan.relNow ? "turn-release" : this.plan.release ? "cut-at-contact" : "touch" });
  }
  // RECEIVING SURFACES: the frozen contact cost ranks the surfaces for dribbling (laces 0, inside ±, front 0.10, outside 0.22); a pass is received
  // preferably with the inside, never by choice with the toe — added during the receive only
  cost(g, F, reg, smp, close, s, n, release) { const c = super.cost(g, F, reg, smp, close, s, n, release); return this.rc && this.rc.phase === "approach" && RC1.regCost ? c + (RC1.regCost[reg] || 0) : c; }
  // approach-line candidates: the line version only (the frozen set-up / cut-at-contact versions branch from the main motion, not the line)
  // (receive options generate contacts only in their arrival window, O.rcEnd: the launch solve still reads their motion beyond it)
  // (the frozen contact-timed re-release builds its own branch: in the receive it gets the turn options' window)
  *genCandsG(O, held, s, cands, ...a) {
    if (this.rc && this.rc.phase === "approach" && O.retimed && O.rcEnd == null && this.rc.estPlan) O.rcEnd = this.rc.estPlan.k + Math.round(RC1.turnAfter / DT) - O.pred.k0 - 1;
    if (O.rcEnd != null) { a[1] = Math.min(a[1] != null ? a[1] : Infinity, O.rcEnd); O.pred.rcEndJ = O.rcEnd; } const n0 = cands.length, r = yield* super.genCandsG(O, held, s, cands, ...a); if (O.rcLine) for (let i = n0; i < cands.length; i++) { cands[i]._ssc = null; cands[i]._swc = null; } return r; }
  // ── RECEIVE BLOCKERS: the frozen planner rejects a contact whose free ball would first run into another SWINGING boot (blockersG); an incoming
  // pass also runs through the stance area — a stance boot, a shin or a thigh in its path deflects it before the planned contact (the kernel
  // collides the ball with every player collider). During the receive the predicted free ball is also checked against the stance boots (their
  // hull vertices) and both shins and thighs (their capsules); the first such hit per leg phase is a blocker like any other (it rejects later contacts)
  *blockersG(pred0, off) {
    if (!this.rc || this.rc.phase !== "approach") return yield* super.blockersG(pred0, off);
    // (a receive option's blockers matter only before its last contact: the scan ends with its contact window)
    const pred = pred0.rcEndJ != null && pred0.rcEndJ + 2 < pred0.length ? Object.assign(Object.create(Object.getPrototypeOf(pred0)), pred0, { length: pred0.rcEndJ + 2 }) : pred0;
    const out = yield* super.blockersG(pred, off);
    const n = Math.min(pred.length - 1, Math.max(off, 0) + Math.round(D1.o2horizon / DT)), seen = new Set(out.map((h) => h.F + h.swing)), J = this.J.sides;
    for (let j = Math.max(off, 0) + 1; j < n; j++) { if ((j & 3) === 0 && this.wuOver()) yield 0; const smp = pred.at(j); const bk = this.ballCache.map.get(smp.k); if (!bk) break;
      const b = [bk.p[0], bk.p[1], -bk.p[2]]; if (Math.hypot(b[0] - smp.P[0], b[2] + smp.P[1]) > 1.1) continue;   // (anim frame; the COM in pitch coordinates)
      let bn = smp.bones; if (!bn) { smp._tr.evalSample(smp); bn = smp._b; } if (!bn) continue;
      for (const F of SIDES) { const Lg = smp.legs[F], id = Lg.stance ? "st" + Lg.tTD : Lg.swing; if (seen.has(F + id)) continue; let g = Infinity, part = null;
        if (Lg.stance) for (const pt of ["boot", "toe"]) { const fr = bn[(pt === "boot" ? "foot_" : "toe_") + F], Rm = fr.R, o = fr.p; for (const q of J[F][pt].points) {
          const x = o[0] + Rm[0] * q[0] + Rm[1] * q[1] + Rm[2] * q[2] - b[0], y = o[1] + Rm[3] * q[0] + Rm[4] * q[1] + Rm[5] * q[2] - b[1], z = o[2] + Rm[6] * q[0] + Rm[7] * q[1] + Rm[8] * q[2] - b[2], d = Math.sqrt(x * x + y * y + z * z) - R; if (d < g) { g = d; part = pt; } } }
        for (const seg of ["shin", "thigh"]) { const sh = J[F][seg], fr = bn[seg + "_" + F], Rm = fr.R, c = [fr.p[0] + Rm[0] * sh.pos[0] + Rm[1] * sh.pos[1] + Rm[2] * sh.pos[2], fr.p[1] + Rm[3] * sh.pos[0] + Rm[4] * sh.pos[1] + Rm[5] * sh.pos[2], fr.p[2] + Rm[6] * sh.pos[0] + Rm[7] * sh.pos[1] + Rm[8] * sh.pos[2]], ax = [Rm[1], Rm[4], Rm[7]];
          const t = clamp((b[0] - c[0]) * ax[0] + (b[1] - c[1]) * ax[1] + (b[2] - c[2]) * ax[2], -sh.half, sh.half), ds = Math.hypot(b[0] - c[0] - ax[0] * t, b[1] - c[1] - ax[1] * t, b[2] - c[2] - ax[2] * t) - sh.r - R;
          if (ds < g) { g = ds; part = seg; } }
        if (g < RC1.blockGap) { seen.add(F + id); out.push({ k: smp.k, F, swing: id, g, part, rc: true }); } } }
    return out;
  }
  // ── receive difficulty in the execution error (the core's own keyed draw, σ scaled) ──────────────────────────────────────────────────────────────
  rcSigmaK(P) {
    const b = this.ballA(), vIn = [b.v[0], -b.v[2]], sIn = Math.hypot(vIn[0], vIn[1]), n = P && P.launch && P.launch.n ? Math.atan2(-P.launch.n[2], P.launch.n[0]) : null;
    const redirect = n != null && sIn > 0.5 ? Math.abs(wrapA(n - Math.atan2(vIn[1], vIn[0]))) / DEG : 0;
    return { k: 1 + RC1.sigma.vK * Math.max(0, sIn - RC1.sigma.vRef) + RC1.sigma.turnK * redirect / 180, sIn, redirect };
  }
  touchSigma(c, s) { const x = super.touchSigma(c, s); if (this.rc && this.rc.phase === "approach") { const kf = this.rcSigmaK(null).k; return { sigS: x.sigS * kf, sigD: x.sigD * kf, sigL: x.sigL * kf }; } return x; }
  commit(k, P) {
    if (!this.rc || this.rc.phase !== "approach") return super.commit(k, P);
    const o = this.cfg.opts || (this.cfg.opts = {}), e0 = o.errScale, q = this.rcSigmaK(P), b = this.ballA(), A = this.A, n0 = this.touches.length;
    o.errScale = (e0 != null ? e0 : 1) * q.k;
    try { super.commit(k, P); } finally { if (e0 == null) delete o.errScale; else o.errScale = e0; }
    const T = this.touches.length > n0 ? this.touches[this.touches.length - 1] : null;
    if (T && !T.cancelled) this.rc.pending = { T, k, P, q, vIn: [b.v[0], -b.v[2]], psi: A.psi, V: A.V.slice(), held: this.held ? { released: !!this.held.released, releasedAt: this.held.releasedAt ?? null } : null };
    else if (T) this.rc.log.push({ k, ev: "commit-cancelled", why: T.cancelled });
  }
  // the first touch has launched (the kernel's AUTHORITATIVE_LAUNCH): its record, and the handoff to the frozen DRIBBLE-V1 resolver
  post(k) {
    super.post(k);
    const pd = this.rc && this.rc.pending; if (!pd) return;
    const T = pd.T; if (!T.launched) { if (T.cancelled) { this.rc.log.push({ k, ev: "launch-cancelled", why: T.cancelled }); this.rc.pending = null; } return; }
    const cls = receiveTurnAngle(pd.psi, this.rc.exitDir), out = [T.executed.v[0], -T.executed.v[2]], hOut = Math.atan2(out[1], out[0]);
    this.rc.first = { k: T.k, t: +(T.k * DT).toFixed(4), F: T.F, reg: T.reg, hull: T.hull, role: T.role, setupSw: T.setupSw, release: T.release || null, heldAtContact: pd.held, sigmaK: +pd.q.k.toFixed(3), redirectDeg: +pd.q.redirect.toFixed(1),
      vIn: pd.vIn.map((x) => +x.toFixed(3)), speedIn: r2(Math.hypot(pd.vIn[0], pd.vIn[1])), out: out.map((x) => +x.toFixed(3)), speedOut: r2(T.executed.speed), dirOutRel: +(wrapA(hOut - this.rc.cls.facing * DEG) / DEG).toFixed(1),
      exitErrDeg: +(wrapA(hOut - this.rc.exitDir) / DEG).toFixed(1), facingAtContact: +(wrapA(pd.psi - this.rc.cls.facing * DEG) / DEG).toFixed(1), turnLeftAtContact: +cls.signed.toFixed(1), playerSpeed: r2(Math.hypot(pd.V[0], pd.V[1])),
      err: T.error ? [T.error.eS, T.error.eD, T.error.eL].map((x) => +x.toFixed(3)) : null };
    this.rc.pending = null; this.rc.phase = "dribble"; this.rc.log.push({ k, ev: "first-touch", F: T.F, reg: T.reg, role: T.role });
    // handoff: the exit is the player's requested direction from here on — a turn still held is the frozen intent's held cut (its hold clock starts now)
    if (this.held && !this.held.released) { this.held.since = (k + 1) * DT; this.held.user = this.rc.exitDir; }
  }
}
