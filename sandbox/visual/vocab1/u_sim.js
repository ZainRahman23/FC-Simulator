// ═══ tc_unified1/u_sim.js — TC-UNIFIED-1: THE UNIFIED SIMULATION (owner's overnight mission, 21 Oct) ═══════════════════════════════════════════════
// 88573ef0's simulation with TC-LAYERED-2's Technical Control layers (u_tc.js: B4 generic vocabulary + outcome scoring, B5 short entries / exits;
// B2 optional; B1 / B3 / B6 rejected, off) and two more layers, each a flag in o.layers:
//   c        A99-C — Astra's selected Agility-99 movement ceiling, EXACT: ../agility99/movement.js (Astra's file, unmodified) integrated the way
//            Astra's AgilitySim (../agility99/sim.js) integrates it — the carry's root path by C's advance(), a technique's authored keys exactly
//            as authored; checked bit-identical to AgilitySim (BALL ON) by tools/u_equiv.mjs
//   support  THE PERSISTENT SUPPORT — ONE SHARED FOOT PLAN (Astra's architectural lesson, moved into the plan Technical Control and the body share):
//            a swinging foot's next landing is COMMITTED across re-plans (its time kept; its place revised only within bounds), a support whose
//            leg is left behind by the agile root releases early, the cadence / width follow the directional demand (curve, cut, brake). TC
//            times its contacts on this same plan; the body draws this same plan — so the foot that plays the ball is the foot drawn there
//   BALL OFF (o.ballOn === false): Astra's movement probe (no ball, no TC; analog re-plans at 60 Hz) — for the locomotion audits only
// ALL OFF = exact 88573ef0. Nothing here reads the posed body.
import { PlaySim, Curve, DT, DEG, wrap, fromLocal, toLocal, rgt, TEMPLATES, CARRY } from "./u_tc.js";
import { WIDTH, lead } from "../tc_baseline_88573ef0/pt_params.js";
import { predict } from "../tc_baseline_88573ef0/pt_ball.js";
import { PROFILES } from "../agility99/movement.js";
import { advance } from "./s_movement.js";
import { accLeanDeg } from "./pace.js";
import { demandRaw, demandTick3, opennessOf, vAvailOf, pushOf, DEMAND } from "./carry_env.js";   // (BALL-ON PACE V1: the ball-carrying envelope)   // (SPEED-99-V1: Astra's advance() with the two pace hooks — identical without them)
import { bodyGaitFrom as astraGait } from "../agility99/body_gait.js";
import { bodyGaitFrom, gaitPlace } from "./u_gait.js";
export * from "./u_tc.js";
export const C_AGILITY = PROFILES["A99-C"];   // (PHYSICAL RATINGS V1: the A99-C profile the rated Agility profiles are built from)
const C = PROFILES["A99-C"], abs = Math.abs, min = Math.min, max = Math.max, hyp = Math.hypot, sgn = (X) => (X === "R" ? 1 : -1), other = (X) => (X === "R" ? "L" : "R");
export class UnifiedSim extends PlaySim {
  reset(o = {}) { super.reset(o); if (this.o.ballOn === false) { this.ball.p[0] = -1000; this.ball.p[1] = -1000; this.record(); } return this; }
  // ── C: the plan's travel heading / rate / facing velocity / motion state (Astra's AgilitySim.stateAt, unchanged) ───────────────────────────────
  stateAt(t, plan = this.planAt(t)) {
    const s = super.stateAt(t, plan); if (!plan.aw) return s;
    const i = Math.max(0, Math.min(plan.n, Math.round((t - plan.t0) / DT))); s.w = plan.aw[i]; s.h = plan.ah[i]; s.turnRate = plan.ar[i];
    let m = null; for (const x of plan.am) { if (x.t <= t + 1e-9) m = x.m; else break; } s.motion = m; return s; }
  step(req) {
    // (the request's recent headings, for B4's analog reading — a ring of 0.25 s; recorded always, read only by the unified B4 scoring)
    { const R = this.rq || (this.rq = { h: new Float64Array(60).fill(NaN), k: -1 }); R.k = this.k; R.h[this.k % 60] = req && req.h != null ? req.h : NaN; }
    // (C + B4: a stick ROTATING steadily re-plans in 10° steps instead of 88573ef0's 4° — A99-C re-accelerates only once a motion completes, and
    // a 270°/s circle restarted it every 15 ms: the body stalled at 0.6 m/s while the ball ran on. A snap is unaffected)
    this.reqThresh = this.L.c && this.L.generic && this.o.ballOn !== false && this.rotation().coh ? 10 : 4;
    // (DRIBBLING VOCAB-1 — ANALOG FEINT RECOGNITION: established direction → a brief meaningful fake → a reversal before ball / body commitment →
    // the real exit; ball on, at speed, the carry (or a generic touch not yet committed) running)
    if (this.o.ballOn !== false && this.L.generic && !this.o.noFeint) this.feintTick(req);
    // (BALL OFF: Astra's movement probe samples analog changes at up to 60 Hz; BALL ON keeps 88573ef0's request thresholds)
    if (this.o.ballOn === false && this.L.c && this.k % 4 === 0 && req?.h != null && this.req?.h != null && Math.abs(wrap(req.h - this.plan.req.h)) > 0.1 * DEG) this.flags.replan = "analog movement";
    return super.step(req); }
  replan(reason) {
    if (this.o.ballOn !== false) return super.replan(reason);
    // BALL OFF (Astra's AgilitySim.replan, the movement probe): no contacts; a support whose foot the root leaves behind releases early
    const st = this.stateAt(this.t, this.plan), keep = this.committed(this.plan, this.t), q = this.req; keep.contacts = [];
    const plan = this.mkPlan({ t0: this.t, st, stances: null, contacts: [], action: { id: 1, kind: "CARRY", label: "BODY MOVEMENT" }, req: q, prog: { kind: "carry" }, chKeys: this.carryChannels(st, q, this.t) });
    if (this.L.c) for (const F of ["R", "L"]) { keep.stances[F] = keep.stances[F].map((s) => ({ ...s }));
      for (const stance of keep.stances[F]) if (stance.t0 <= this.t && stance.t1 > this.t) {
        for (let dt = 0.025; dt <= Math.min(0.32, stance.t1 - this.t); dt += DT) { const x = this.stateAt(this.t + dt, plan), dx = stance.pos[0] - x.P[0], dy = stance.pos[1] - x.P[1], side = (-dx * Math.sin(x.psi) + dy * Math.cos(x.psi)) * (F === "R" ? 1 : -1);
          if (Math.hypot(dx, dy) > 0.60 || side < -0.05) { stance.t1 = Math.min(stance.t1, Math.max(this.t + 0.025, stance.t0 + 0.06, this.t + dt)); break; } } } }
    plan.stances = (this.L.support ? this.gaitFrom : this.L.c ? astraGait : this.gaitFrom).call(this, plan, keep, [], this.t + 1.5); plan.reason = reason; this.adopt(plan); }
  // ── C: the plan's root path — the carry by C's advance(), a technique's authored keys exactly (Astra's AgilitySim.mkPlan, profile A99-C) ──────
  mkPlan(o) {
    if (!this.L.c) return super.mkPlan(o);
    const profile = this.P.agiProfile || C, n = Math.round(1.5 / DT), P = new Float64Array(2 * (n + 1)), V = new Float64Array(2 * (n + 1)), psi = new Float64Array(n + 1), aw = new Float64Array(n + 1), ah = new Float64Array(n + 1), ar = new Float64Array(n + 1), am = [];
    let pos = o.st.P.slice(), x = { s: o.st.s, h: o.st.h, psi: o.st.psi, w: o.st.w || 0, m: o.st.motion || null, turnRate: o.st.turnRate || 0 }; let lastM;
    // (BALL-ON PACE V1: the ball-carrying envelope along the plan — the demand carried forward from the moment's (smoothed) value, the stick's
    // activity decaying as it does, the free ball's place for "running onto it"; techniques' keyed ticks are their own movement, untouched)
    const ENV = this.P.ballEnv && this.o.ballOn !== false ? this.P.ballEnv : null, b0 = this.ball.p, bv0 = this.ball.v, vol0 = ENV && this.volatility ? this.volatility() : 0;
    // (the free ball is the ball only until the body reaches it — the plan's own next touch is there: beyond it, no "running to the ball")
    let Dp = ENV && this.ctl ? this.ctl.D : 0, Op = 0, reached = false, volP = vol0; const volK3 = Math.exp(-3 * DT / 0.4), E = this.P._envD || (this.P._envD = { on: false, vA: 0, m: 1, a0: 0, p: 1, aEnd: 0, dec: DEMAND.envDecel }); E.on = false; E.vA = 0;
    if (ENV) { const pr = this.P.pace; E.a0 = pr.a0 != null ? pr.a0 : pr.vmax / pr.tau; E.p = pr.p; E.aEnd = pr.aEnd; }   // (the demand, the available vmax and push: every 3rd tick; the free ball: every 12th)   // (the available vmax and acceleration share: every 3rd tick — they vary slowly)
    for (let i = 0; i <= n; i++) {
      const t = o.t0 + i * DT; P[2 * i] = pos[0]; P[2 * i + 1] = pos[1]; V[2 * i] = x.s * Math.cos(x.h); V[2 * i + 1] = x.s * Math.sin(x.h); psi[i] = x.psi; aw[i] = x.w; ah[i] = x.h; ar[i] = x.turnRate;
      if (x.m !== lastM) { am.push({ t, m: x.m }); lastM = x.m; } if (i === n) break;
      const d = this.progAt(o.prog, t + DT, x.s, x.h, o.req, pos);
      if (ENV) { if (i % 12 === 0) { if (!reached) { const f = predict(b0, bv0, t - o.t0), dist = Math.hypot(f.p[0] - pos[0], f.p[1] - pos[1]); Op = opennessOf(dist); if (dist < 0.6 && i > 0) reached = true; } else Op = 0; }
        if (i % 3 === 0) { // (a PURSUIT — the controlled ball's chase / SECURE — runs to the ball, not toward the stick: its direction demand is its own heading's)
          const hDem = o.prog && o.prog.kind === "chase" && t < o.prog.until ? o.prog.h : o.req && o.req.h != null ? o.req.h : null;
          Dp = demandTick3(Dp, demandRaw(hDem != null && x.s > 0.5 ? wrap(hDem - x.h) : 0, x.turnRate || 0, volP, !!d.keyed)); volP *= volK3;
          E.vA = vAvailOf(ENV, this.P.pace.vmax, Dp, Op); E.m = pushOf(ENV, x.s, Dp, Op); }
        E.on = !d.keyed && d.speed != null; }
      if (d.keyed) { x.s = d.s; x.turnRate = wrap(d.h - x.h) / DT; x.h = d.h; x.m = null;
        if (d.psi != null) { x.w = wrap(d.psi - x.psi) / DT; x.psi = d.psi; }
        else { const tgt = x.s > 1 ? x.h : o.req?.h ?? x.psi, err = wrap(tgt - x.psi), a = Math.max(-9000 * DEG, Math.min(9000 * DEG, 360 * err - 38 * x.w)); x.w = Math.max(-this.P.yawRate, Math.min(this.P.yawRate, x.w + a * DT)); x.psi += x.w * DT; } }
      else x = advance(x, d, t + DT, profile, this.P);
      if (ENV) E.on = false;
      pos = [pos[0] + x.s * Math.cos(x.h) * DT, pos[1] + x.s * Math.sin(x.h) * DT]; }
    const plan = { t0: o.t0, k0: Math.round(o.t0 / DT), n, P, V, psi, aw, ah, ar, am, stances: o.stances, contacts: o.contacts, action: o.action, req: o.req, prog: o.prog }; plan.ch = this.channels(o, plan);
    if (this.o.ballOn === false || this.L.support) this.demandChannels(o, plan);
    return plan; }
  // ── presentation channels read from the actual trajectory (lean, side, crouch, arms) — no root, no foot, no feedback. BALL OFF: Astra's
  // (always on); SUPPORT: DEMAND-DRIVEN — zero on a straight steady run (the original RUN is untouched), rising only with real lateral
  // acceleration (a curve, a cut) or braking, and returning as the trajectory settles
  demandChannels(o, plan) {
    const n = plan.n, V = plan.V, ah = plan.ah, keys = { lean: [], side: [], crouch: [], arms: [] }, cl = (v, a, b) => Math.max(a, Math.min(b, v)), off = this.o.ballOn === false;
    for (const dt of [0.025, 0.06, 0.12, 0.20, 0.30, 0.45, 0.65, 0.9, 1.2, 1.5]) {
      const i = Math.min(n - 1, Math.round(dt / DT)), vx = V[2 * i], vy = V[2 * i + 1], s = Math.hypot(vx, vy), ax = (V[2 * i + 2] - vx) / DT, ay = (V[2 * i + 3] - vy) / DT, h = ah[i], brake = Math.max(0, -ax * Math.cos(h) - ay * Math.sin(h)), lat = -ax * Math.sin(h) + ay * Math.cos(h), t = o.t0 + dt;
      const accL = this.P.pace && this.P.pace.accLean ? accLeanDeg(ax * Math.cos(h) + ay * Math.sin(h)) : 0;   // (SPEED-99-V1: the lean of acceleration — candidates only)
      if (off) { keys.lean.push([t, 6 + 6 * cl(s / 6, 0, 1) - cl(brake * 0.5, 0, 12) + accL]); keys.side.push([t, cl(lat * 0.55, -22, 22)]); keys.crouch.push([t, 0.022 + cl(brake * 0.006 + Math.abs(lat) * 0.001, 0, 0.065)]); keys.arms.push([t, 0.15 + cl((brake + Math.abs(lat)) / 90, 0, 0.35)]); continue; }
      // (demand: below 2.5 m/s² of lateral acceleration and 2 m/s² of braking nothing changes — a steady straight run keeps 88573ef0's channels)
      const dl = Math.sign(lat) * Math.max(0, Math.abs(lat) - 2.5), db = Math.max(0, brake - 2.0);
      keys.lean.push([t, 6 + 6 * cl(s / 6, 0, 1) - cl(db * 0.5, 0, 10) + accL]); keys.side.push([t, cl(dl * 0.55, -20, 20)]); keys.crouch.push([t, 0.022 + cl(db * 0.005 + Math.abs(dl) * 0.0012, 0, 0.05)]); keys.arms.push([t, 0.15 + cl((db + Math.abs(dl)) / 90, 0, 0.3)]); }
    // (a technique's own authored channels keep their say: only the carry gets the demand channels)
    if (!off && o.action && o.action.tech) return;
    for (const [key, values] of Object.entries(keys)) plan.ch[key] = new Curve([[o.t0, plan.ch[key].at(o.t0)], ...values]); }
}
// ═══ SUPPORT: THE SHARED FOOT PLAN ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════
// (Astra's principle — "a foot already executing a support / swing action has a continuous history; new movement intent can revise an
// uncommitted future landing, but it cannot arbitrarily rewrite the leg's past / current trajectory" — applied to the plan itself)
UnifiedSim.prototype.committed = function (cur, t) {
  const out = PlaySim.prototype.committed.call(this, cur, t); if (!this.L.support) return out;
  // LANDING COMMITMENT: a foot in the air keeps its coming landing once it is within 0.25 s (its time; its place revised within bounds by
  // gaitFrom) — earlier in the swing the landing is still the uncommitted future the intent may re-plan (0.40 s cost a step on every technique)
  for (const X of ["R", "L"]) { const L = cur.stances[X]; if (L.some((s) => s.t0 <= t + 1e-9 && s.t1 > t)) continue;
    const nx = L.find((s) => s.t0 > t + 1e-9); if (!nx || nx.t0 - t > 0.25 || out.stances[X].some((s) => s.id === nx.id)) continue;
    out.stances[X].push(Object.assign({}, nx, { commit: true, revT: nx.revT != null ? nx.revT : cur.t0 })); out.stances[X].sort((a, b) => a.t0 - b.t0); }
  return out; };
// where the gait would place a footfall of X at tt on this plan's path (the stride rule; for revising a committed landing toward the new path)
UnifiedSim.prototype.placeFor = function (X, tt, plan) { const s0 = this.stateAt(tt, plan), v = s0.s, th = v > 0.6 ? s0.h : s0.psi, w = v > 2.4 ? WIDTH.run : WIDTH.walk, ld = v < 0.3 ? 0 : lead(v); return fromLocal(fromLocal(s0.P, th, ld, 0), s0.psi, 0, sgn(X) * w); };
UnifiedSim.prototype.gaitFrom = function (plan, keep, anchors, tTo) {
  if (!this.L.support) return PlaySim.prototype.gaitFrom.call(this, plan, keep, anchors, tTo);
  const t = this.t, K = { stances: { R: keep.stances.R.map((x) => Object.assign({}, x)), L: keep.stances.L.map((x) => Object.assign({}, x)) }, contacts: keep.contacts, lastT: keep.lastT };
  // EARLY RELEASE: a support the agile root is leaving behind lifts when it would (Astra's probe rule: crossed to the other side; or left behind
  // beyond 0.80 m — Astra's 0.60 m cut every ordinary running stance short: a run's stance ends ≈ 0.70 m behind the body, the flight grew past
  // 0.15 s; 0.80 m is beyond any ordinary stride, reached only when the root really leaves the foot)
  for (const F of ["R", "L"]) for (const s of K.stances[F]) if (s.t0 <= t && s.t1 > t && s.t1 !== Infinity && s.src !== "tech") {
    for (let dt = 0.025; dt <= Math.min(0.32, s.t1 - t); dt += DT) { const x = this.stateAt(t + dt, plan), dx = s.pos[0] - x.P[0], dy = s.pos[1] - x.P[1], side = (-dx * Math.sin(x.psi) + dy * Math.cos(x.psi)) * sgn(F);
      if (hyp(dx, dy) > 0.80 || side < -0.15) { s.t1 = Math.min(s.t1, Math.max(t + 0.025, s.t0 + 0.06, t + dt)); s.released = true; break; } } }
  // COMMITTED LANDINGS: revised toward the new path at Astra's rates — 0.25 m per 1/60 s while > 0.12 s remain, 0.08 m per 1/60 s later, frozen
  // in the last 0.055 s (the revision is rate-limited in time, not per re-plan: BALL ON re-plans far less often than Astra's 60 Hz probe); one
  // still out of the body's reach after it (> 0.62 m from the root at its landing) gives up its commitment — a REPLACEMENT STEP placed afresh.
  // An anchor (a technique's or a generic action's own step) of the same foot within 0.03 s TAKES the landing if its place is within the
  // allowance, else it is refused (the candidate is then not feasible)
  const blocked = new Set();
  for (const F of ["R", "L"]) { const L = K.stances[F]; for (let i = 0; i < L.length; i++) { const c = L[i]; if (!c.commit || c.t0 <= t + 1e-9) continue;
    const rem = c.t0 - t, since = Math.max(DT, t - (c.revT != null ? c.revT : t - DT)), cap = rem < 0.055 ? 0 : (rem > 0.12 ? 15 : 4.8) * since; c.revT = t;
    // (the anchor may re-time the landing — 0.03 s sooner, up to 0.13 s later while it is not frozen (Astra's two 0.065 s extensions) — and move
    // it as far as a swing can still be steered in the time left: 8 cm + 4.8 m/s × the time before the freeze)
    const A = anchors.find((a) => a.F === F && a.t0 >= c.t0 - 0.03 - 1e-9 && a.t0 <= c.t0 + (rem > 0.055 ? 0.13 : 0.03) + 1e-9);
    if (A) { const want = A.pos || gaitPlace.call(this, plan, K.stances, F, A.t0, A.t1), allow = rem < 0.055 ? 0.03 : 0.08 + 4.8 * (rem - 0.055); if (hyp(want[0] - c.pos[0], want[1] - c.pos[1]) <= Math.max(cap, allow)) { L.splice(i, 1); i--; } else blocked.add(A); continue; }
    // (revised toward the gait's OWN place for it on the new path — 88573ef0's rule: its own side of the other foot, off the free ball's path)
    const want = gaitPlace.call(this, plan, K.stances, F, c.t0, c.t1), d = hyp(want[0] - c.pos[0], want[1] - c.pos[1]), k = Math.min(1, cap / Math.max(d, 1e-9)); c.pos = [c.pos[0] + (want[0] - c.pos[0]) * k, c.pos[1] + (want[1] - c.pos[1]) * k];
    const R0 = this.stateAt(c.t0, plan).P; if (hyp(c.pos[0] - R0[0], c.pos[1] - R0[1]) > 0.62) { L.splice(i, 1); i--; } } }
  // (an anchor the body cannot stand on — its place over 1.3 m from the root at its touchdown: a plant planned beside a ball that has gone — is
  // refused: the candidate is not feasible)
  for (const a of anchors) if (a.pos && !blocked.has(a)) { const R0 = this.stateAt(a.t0, plan).P; if (hyp(a.pos[0] - R0[0], a.pos[1] - R0[1]) > 1.3) blocked.add(a); }
  const S = bodyGaitFrom.call(this, plan, K, anchors.filter((a) => !blocked.has(a)), tTo);
  for (const a of blocked) a.refused = true; return S; };
// the times a technique's first stance can land: the stride (88573ef0's) — and, with the shared plan, the foot's own COMMITTED landing itself
UnifiedSim.prototype.anchorTimes = function (X, keep, st) {
  const out = PlaySim.prototype.anchorTimes.call(this, X, keep, st); if (!this.L.support) return out;
  // (… and re-timed within the window gaitFrom allows: up to 0.13 s later while it is not frozen)
  const c = keep.stances[X].find((s) => s.commit && s.t0 > this.t + 1e-9); if (c) for (const d of c.t0 - this.t > 0.055 ? [0, 0.035, 0.07, 0.10, 0.13] : [0]) { const x = c.t0 + d; if (!out.some((y) => Math.abs(y - x) < 1e-6)) out.push(x); }
  return out.filter((x) => x > this.t + 0.04).sort((a, b) => a - b); };
// ═══ SUPPORT: THE CARRY'S TOUCH IS PLAYED BY A FOOT THAT CAN GET THERE ═══════════════════════════════════════════════════════════════════════════
// (88573ef0's carry chose its touch by the ball's place against the body at the end of a swing; the shared foot plan adds the foot's own way
// there: a foot still planted that would lift < 0.12 s before the touch must reach the ball no faster than 8 m/s relative to the body — a planted
// foot cannot reach a ball a metre away 0.09 s after it lifts (ordinary swings are 88573ef0's, unchanged). Such an end is skipped (88573ef0's own skip: the next swing end decides) — positions of the plan only)
UnifiedSim.prototype.carryTouches = function (plan, keep, q, recover = false, skip = null) {
  const out = PlaySim.prototype.carryTouches.call(this, plan, keep, q, recover, skip); if (!this.L.support || !out.list.length || (skip && skip.size >= 6)) return out;
  const c = out.list[0]; if (keep.contacts.includes(c) || !c.bPred) return out;
  // (one foot, one history: a foot already swinging is not handed a NEW touch in its last 0.09 s more than 12 cm off its way — that end is
  // skipped like the rest, the next one decides)
  { const f = this.footProxy(c.F, this.plan, this.t); if (f && c.t - this.t < 0.09 && !this.plan.contacts.some((q) => q.F === c.F && !q.done && Math.abs(q.t - c.t) < 0.02)) {
      const u = Math.max(0, Math.min(1, (this.t - f.a.t1) / Math.max(1e-3, c.t - f.a.t1))), g = [f.a.pos[0] + (c.bPred[0] - f.a.pos[0]) * u, f.a.pos[1] + (c.bPred[1] - f.a.pos[1]) * u];
      const uS = Math.max(0, Math.min(1, (this.t - f.a.t1) / Math.max(1e-3, f.b.t0 - f.a.t1))), Hs = Math.min(0.5, 0.05 * this.stateAt(this.t, this.plan).s) * Math.sin(Math.PI * uS);
      if (Math.hypot(g[0] - f.p[0], g[1] - f.p[1], Hs) > 0.12) { (this._rej = this._rej || {})["late retarget"] = (this._rej["late retarget"] || 0) + 1; const L2 = plan.stances[c.F], ld = L2.find((s) => s.t0 > c.t);
        // (TC-CONTROLLED-1 fix: never re-skip an end already skipped — a committed touch comes back whatever the skip; TC-UNIFIED-1 recursed without end)
        const key = c.F + (ld ? (ld.t0 - CARRY.touchBefore).toFixed(4) : ""); if (ld && !(skip && skip.has(key)) && !(skip && skip.size >= 6)) return this.carryTouches(plan, keep, q, recover, new Set([...(skip || []), key])); } } }
  const L = plan.stances[c.F]; let lift = null, land = null;
  for (const s of L) { if (s.t1 <= c.t + 1e-9) lift = s; else if (s.t0 > c.t && !land) land = s; } if (!lift || !land || lift.t1 === Infinity) return out;
  // (relative to the body: the foot's way to the ball less the root's own travel meanwhile — a sprinting foot covers metres with the body)
  const t0 = Math.max(lift.t1, this.t - 0.4), R0 = this.stateAt(t0, plan).P, R1 = this.stateAt(c.t, plan).P, rx = c.bPred[0] - lift.pos[0] - (R1[0] - R0[0]), ry = c.bPred[1] - lift.pos[1] - (R1[1] - R0[1]);
  const d = hyp(rx, ry), v = d / Math.max(DT, c.t - t0), lim = lift.t1 > this.t && c.t - lift.t1 < 0.12 ? 8.0 : Infinity;   // (only a foot still down, lifting < 0.12 s before)
  if (v <= lim) return out; (this._rej = this._rej || {})["carry swing"] = (this._rej["carry swing"] || 0) + 1;
  const key = c.F + (land.t0 - CARRY.touchBefore).toFixed(4); if (skip && skip.has(key)) return out; return this.carryTouches(plan, keep, q, recover, new Set([...(skip || []), key])); };
// ═══ SUPPORT: THE URGENT REACH WITHIN THE BODY'S REACH — the lunge's contact box ends at 0.86 m ahead of the body (B4's 0.98 m is beyond the leg:
// the drawn boot stopped 6 – 8 cm short of the ball at its authoritative contact); the rest of URG unchanged
UnifiedSim.prototype.genericBuild = function (key, G, ...rest) { if (this.L.support && key === "URG") G = Object.assign({}, G, { box: { a: [G.box.a[0], Math.min(G.box.a[1], 0.86)], l: G.box.l }, nom: [Math.min(G.nom[0], 0.74), G.nom[1]] });
  return PlaySim.prototype.genericBuild.call(this, key, G, ...rest); };
// ═══ THE UNIFIED B4 SCORING (A99-C on): B4's outcome scoring (u_tc.js costB4, unchanged) + two terms of the unified prototype ═══════════════════
// · ANALOG FIRST — a request ROTATING steadily (the stick turned, not snapped: over the last 0.2 s one direction, no step > 20° in a tick, faster
//   than 45°/s) is a CURVE: the carry follows it at C's limits; a named move or a braking / lunging action (a snap's answers) pays for it, and
//   switching away from the running action pays — so a rotation flows instead of re-deciding every 1/60 s. A snap is unaffected
// · ONE FOOT, ONE HISTORY — a new touch for a foot already in the air must be reachable from where that foot is going under the running plan
//   (its swing toward its planned touch / landing): the candidate's swing may depart from it no faster than 6 m/s before the new touch. A
//   candidate that would need the foot to jump there pays for it (it stays a candidate — never a refusal: the best of the rest wins)
UnifiedSim.prototype.rotation = function () { const R = this.rq; if (!R) return { w: 0, coh: false }; let tot = 0, big = false, pos = 0, neg = 0, n = 0;
  for (let j = 1; j < 48; j++) { const a = R.h[(R.k - j + 600) % 60], b = R.h[(R.k - j + 1 + 600) % 60]; if (!Number.isFinite(a) || !Number.isFinite(b)) return { w: 0, coh: false }; const d = wrap(b - a); tot += d; n++; if (abs(d) > 20 * DEG) big = true; if (d > 1e-4) pos++; else if (d < -1e-4) neg++; }
  const w = tot / (n * DT), coh = !big && abs(w) > 45 * DEG && (tot > 0 ? neg === 0 : pos === 0); return { w, coh }; };
UnifiedSim.prototype.footProxy = function (X, P, t) { const L = P.stances[X]; if (L.some((s) => s.t0 <= t + 1e-9 && s.t1 > t)) return null;
  let a = null, b = null; for (const s of L) { if (s.t1 <= t + 1e-9) a = s; else if (s.t0 > t && !b) b = s; } if (!a || !b) return null;
  const c = P.contacts.find((q) => q.F === X && q.t > a.t1 - 1e-6 && q.t < b.t0 + 1e-6), bp = (cc) => cc.bPred || predict(this.ball.p, this.ball.v, Math.max(0, cc.t - this.t)).p;
  if (c && c.t > t) { const u = (t - a.t1) / Math.max(1e-3, c.t - a.t1), B = bp(c); return { p: [a.pos[0] + (B[0] - a.pos[0]) * u, a.pos[1] + (B[1] - a.pos[1]) * u], a, b }; }
  const p0 = c ? bp(c) : a.pos, t0 = c ? c.t : a.t1, u = (t - t0) / Math.max(1e-3, b.t0 - t0); return { p: [p0[0] + (b.pos[0] - p0[0]) * u, p0[1] + (b.pos[1] - p0[1]) * u], a, b }; };
// (the measure: how far the candidate moves that foot's path NOW — its swing under the running plan against its swing under the candidate, both
// from its lift-off toward their touch / landing — over the time left before the new touch: what the drawn foot must make up, at most 6 m/s)
UnifiedSim.prototype.swingCont = function (c, cur) { const t = this.t; let worst = 0;
  // (a NEW touch played soon after its foot lifts — < 0.12 s — far beyond where that foot can get from its lift-off: relative to the body over
  // 14 m/s is a foot that would have to jump there)
  for (const nc of c.contacts) { if (nc.done || nc.t <= t + 1e-9 || cur.contacts.some((q) => q.F === nc.F && !q.done && abs(q.t - nc.t) < 0.02)) continue;
    let lift = null; for (const s of c.stances[nc.F]) if (s.t1 !== Infinity && s.t1 <= nc.t + 1e-9) lift = s; if (!lift || nc.t - lift.t1 > 0.12 || !lift.pos) continue;
    const t0 = Math.max(lift.t1, t - 0.4), R0 = this.stateAt(t0, c).P, R1 = this.stateAt(nc.t, c).P, B = nc.bPred || predict(this.ball.p, this.ball.v, nc.t - t).p, rel = hyp(B[0] - lift.pos[0] - (R1[0] - R0[0]), B[1] - lift.pos[1] - (R1[1] - R0[1])) / Math.max(DT, nc.t - t0);
    if (rel > 14) worst = Math.max(worst, 0.5 + rel / 14 - 1); }
  for (const X of ["R", "L"]) { const f = this.footProxy(X, cur, t); if (!f) continue;
    const nc = c.contacts.find((q) => q.F === X && !q.done && q.t > t + 1e-9 && q.t < f.b.t0 + 0.2 && !c.stances[X].some((s) => s.t0 <= q.t && s.t1 >= q.t && s.t0 > t)); if (!nc) continue;
    if (cur.contacts.some((q) => q.F === X && !q.done && abs(q.t - nc.t) < 0.02)) continue;   // (the touch it was already swinging to)
    // (a foot in the air is also UP: its swing's height at this phase — ≈ 0.09 + min(0.5, 0.05 × speed) × sin(π u) m — a touch on the ground
    // must also come down from there)
    const g = this.footProxy(X, c, t); if (!g) continue; const u = Math.max(0, Math.min(1, (t - f.a.t1) / Math.max(1e-3, f.b.t0 - f.a.t1))), Hs = Math.min(0.5, 0.05 * this.stateAt(t, cur).s) * Math.sin(Math.PI * u);
    const dep = Math.hypot(g.p[0] - f.p[0], g.p[1] - f.p[1], Hs), left = nc.t - t, need = dep / Math.max(DT, left);
    // (in its last 0.09 s a swinging foot is not handed a NEW touch more than 12 cm from its way: it is committed to where it is going)
    if (left < 0.09 && dep > 0.12) worst = Math.max(worst, 2.0);
    if (need > 6) worst = Math.max(worst, need / 6 - 1); }
  return worst; };
UnifiedSim.prototype.costB4 = function (c, st, q, cur) {
  const o = PlaySim.prototype.costB4.call(this, c, st, q, cur); if (!this.L.c) return o;
  const a = c.action, ca = cur.action, notes = [];
  const r = this.rotation(); if (r.coh) { const R = Math.max(0, Math.min(1, (abs(r.w) - 45 * DEG) / (90 * DEG)));
    if (a.tech) { o.J += 2.5 * R; notes.push("analog curve"); } else if (a.kind === "GENERIC" && (a.fam === "URG" || a.fam === "BRT" || a.fam === "BPV")) { o.J += 1.5 * R; notes.push("analog curve"); }
    if (a.kind !== ca.kind || (a.m || 0) !== (ca.m || 0) || (a.fam || "") !== (ca.fam || "") || (a.tech || "") !== (ca.tech || "")) { o.J += 0.5 * R; notes.push("(flow)"); } }
  if (this.L.support) { const v = this.swingCont(c, cur); if (v > 0) { o.J += 3.0 * Math.min(3, v); notes.push(`foot ${(100 * v).toFixed(0)} % past its reach`); } }
  if (notes.length) o.note = (o.note ? o.note + " · " : "") + notes.join(" · "); return o; };
// ═══ DRIBBLING VOCAB-1: THE ANALOG FEINT (owner-approved concept, conservative) ═══════════════════════════════════════════════════════════════
//   ESTABLISHED  the request held within ±6° of a line for ≥ 0.35 s, the body ≥ 3 m/s, the carry running (no technique in its window), no feint
//                in the last 0.8 s
//   A FAKE       the request leaves that line by 20 – 75° → at once the body SELLS it (the feint overlay toward that side) and for ≤ 0.15 s no
//                NEW touch takes the ball toward it (the carry keeps the ball's line — the root follows the request as A99-C allows: no input
//                delay of the body)
//   CONFIRMED    within 0.30 s of the fake the request comes back across the line (≥ 12° to the other side) or back onto it → FEINT (logged): the
//                ball was never played toward the fake; the real exit is the next ordinary decision
//   GENUINE      the fake held past 0.30 s (or beyond 75°): a real change of direction — the sell is withdrawn, nothing else changes
// Noise: a jittering stick never re-establishes a line for 0.35 s, so it cannot produce FEINT FEINT FEINT (tools/v_feint.mjs measures it)
UnifiedSim.prototype.feintTick = function (req) { const t = this.t, F = this.fr || (this.fr = { base: null, est: 0, dev: null, last: -9 }), h = req && req.h != null ? req.h : null, st = this.stateAt(t, this.plan), a = this.plan.action;
  const busy = (a.tech && t < (a.tRelease || 0)) || (this.skill && !this.skill.done);
  if (h == null || st.s < 3.0 || busy) { F.base = null; F.est = 0; if (F.dev) { F.dev = null; this.fhold = null; } return; }
  if (F.dev) { const d = wrap(h - F.base), age = t - F.dev.t; F.dev.max = Math.max(F.dev.max, Math.abs(d));
    if (d * F.dev.side <= -12 * DEG || (Math.abs(d) <= 6 * DEG && age >= 0.05)) { this.log.feints.push({ t, kind: "ANALOG", side: F.dev.side, dev: +(F.dev.max / DEG).toFixed(0), dur: +age.toFixed(3), src: "analog", confirmed: true }); F.last = t; F.dev = null; F.base = h; F.est = 0; this.fhold = null; this.flags.replan = this.flags.replan || "feint"; return; }
    if (age > 0.30 || Math.abs(d) > 75 * DEG) { F.dev = null; F.base = h; F.est = 0; this.fhold = null; if (this.feint && this.feint.src === "analog") this.feint = null; this.log.feints.push({ t, kind: "GENUINE", src: "analog", confirmed: false }); return; }
    return; }
  if (F.base == null || Math.abs(wrap(h - F.base)) > 75 * DEG) { F.base = h; F.est = 0; return; }
  const d = wrap(h - F.base);
  if (Math.abs(d) <= 6 * DEG) { F.est += DT; F.base = F.base + d * 0.02; return; }
  if (Math.abs(d) >= 20 * DEG && F.est >= 0.35 && t - F.last >= 0.8) { F.dev = { side: Math.sign(d), t, max: Math.abs(d) }; this.fhold = { h: F.base, until: t + 0.15 }; this.startFeint("HIP_FAKE", Math.sign(d), "analog"); this.flags.replan = this.flags.replan || "feint"; return; }
  if (Math.abs(d) > 6 * DEG) { F.est = 0; F.base = h; } };
export { PlaySim as TCSim };
