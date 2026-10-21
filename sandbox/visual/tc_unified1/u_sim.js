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
import { PlaySim, Curve, DT, DEG, wrap, fromLocal, toLocal, rgt, TEMPLATES } from "./u_tc.js";
import { WIDTH, lead } from "../tc_baseline_88573ef0/pt_params.js";
import { predict } from "../tc_baseline_88573ef0/pt_ball.js";
import { PROFILES, advance } from "../agility99/movement.js";
import { bodyGaitFrom as astraGait } from "../agility99/body_gait.js";
import { bodyGaitFrom } from "./u_gait.js";
export * from "./u_tc.js";
const C = PROFILES["A99-C"], abs = Math.abs, min = Math.min, max = Math.max, hyp = Math.hypot, sgn = (X) => (X === "R" ? 1 : -1), other = (X) => (X === "R" ? "L" : "R");
export class UnifiedSim extends PlaySim {
  reset(o = {}) { super.reset(o); if (this.o.ballOn === false) { this.ball.p[0] = -1000; this.ball.p[1] = -1000; this.record(); } return this; }
  // ── C: the plan's travel heading / rate / facing velocity / motion state (Astra's AgilitySim.stateAt, unchanged) ───────────────────────────────
  stateAt(t, plan = this.planAt(t)) {
    const s = super.stateAt(t, plan); if (!plan.aw) return s;
    const i = Math.max(0, Math.min(plan.n, Math.round((t - plan.t0) / DT))); s.w = plan.aw[i]; s.h = plan.ah[i]; s.turnRate = plan.ar[i];
    let m = null; for (const x of plan.am) { if (x.t <= t + 1e-9) m = x.m; else break; } s.motion = m; return s; }
  step(req) {
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
    const profile = C, n = Math.round(1.5 / DT), P = new Float64Array(2 * (n + 1)), V = new Float64Array(2 * (n + 1)), psi = new Float64Array(n + 1), aw = new Float64Array(n + 1), ah = new Float64Array(n + 1), ar = new Float64Array(n + 1), am = [];
    let pos = o.st.P.slice(), x = { s: o.st.s, h: o.st.h, psi: o.st.psi, w: o.st.w || 0, m: o.st.motion || null, turnRate: o.st.turnRate || 0 }; let lastM;
    for (let i = 0; i <= n; i++) {
      const t = o.t0 + i * DT; P[2 * i] = pos[0]; P[2 * i + 1] = pos[1]; V[2 * i] = x.s * Math.cos(x.h); V[2 * i + 1] = x.s * Math.sin(x.h); psi[i] = x.psi; aw[i] = x.w; ah[i] = x.h; ar[i] = x.turnRate;
      if (x.m !== lastM) { am.push({ t, m: x.m }); lastM = x.m; } if (i === n) break;
      const d = this.progAt(o.prog, t + DT, x.s, x.h, o.req, pos);
      if (d.keyed) { x.s = d.s; x.turnRate = wrap(d.h - x.h) / DT; x.h = d.h; x.m = null;
        if (d.psi != null) { x.w = wrap(d.psi - x.psi) / DT; x.psi = d.psi; }
        else { const tgt = x.s > 1 ? x.h : o.req?.h ?? x.psi, err = wrap(tgt - x.psi), a = Math.max(-9000 * DEG, Math.min(9000 * DEG, 360 * err - 38 * x.w)); x.w = Math.max(-this.P.yawRate, Math.min(this.P.yawRate, x.w + a * DT)); x.psi += x.w * DT; } }
      else x = advance(x, d, t + DT, profile, this.P);
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
      if (off) { keys.lean.push([t, 6 + 6 * cl(s / 6, 0, 1) - cl(brake * 0.5, 0, 12)]); keys.side.push([t, cl(lat * 0.55, -22, 22)]); keys.crouch.push([t, 0.022 + cl(brake * 0.006 + Math.abs(lat) * 0.001, 0, 0.065)]); keys.arms.push([t, 0.15 + cl((brake + Math.abs(lat)) / 90, 0, 0.35)]); continue; }
      // (demand: below 2.5 m/s² of lateral acceleration and 2 m/s² of braking nothing changes — a steady straight run keeps 88573ef0's channels)
      const dl = Math.sign(lat) * Math.max(0, Math.abs(lat) - 2.5), db = Math.max(0, brake - 2.0);
      keys.lean.push([t, 6 + 6 * cl(s / 6, 0, 1) - cl(db * 0.5, 0, 10)]); keys.side.push([t, cl(dl * 0.55, -20, 20)]); keys.crouch.push([t, 0.022 + cl(db * 0.005 + Math.abs(dl) * 0.0012, 0, 0.05)]); keys.arms.push([t, 0.15 + cl((db + Math.abs(dl)) / 90, 0, 0.3)]); }
    // (a technique's own authored channels keep their say: only the carry gets the demand channels)
    if (!off && o.action && o.action.tech) return;
    for (const [key, values] of Object.entries(keys)) plan.ch[key] = new Curve([[o.t0, plan.ch[key].at(o.t0)], ...values]); }
}
// ═══ SUPPORT: THE SHARED FOOT PLAN ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════
// (Astra's principle — "a foot already executing a support / swing action has a continuous history; new movement intent can revise an
// uncommitted future landing, but it cannot arbitrarily rewrite the leg's past / current trajectory" — applied to the plan itself)
UnifiedSim.prototype.committed = function (cur, t) {
  const out = PlaySim.prototype.committed.call(this, cur, t); if (!this.L.support) return out;
  // LANDING COMMITMENT: a foot in the air keeps its coming landing (its time; its place revised within bounds by gaitFrom)
  for (const X of ["R", "L"]) { const L = cur.stances[X]; if (L.some((s) => s.t0 <= t + 1e-9 && s.t1 > t)) continue;
    const nx = L.find((s) => s.t0 > t + 1e-9); if (!nx || nx.t0 - t > 0.40 || out.stances[X].some((s) => s.id === nx.id)) continue;
    out.stances[X].push(Object.assign({}, nx, { commit: true, revT: nx.revT != null ? nx.revT : cur.t0 })); out.stances[X].sort((a, b) => a.t0 - b.t0); }
  return out; };
// where the gait would place a footfall of X at tt on this plan's path (the stride rule; for revising a committed landing toward the new path)
UnifiedSim.prototype.placeFor = function (X, tt, plan) { const s0 = this.stateAt(tt, plan), v = s0.s, th = v > 0.6 ? s0.h : s0.psi, w = v > 2.4 ? WIDTH.run : WIDTH.walk, ld = v < 0.3 ? 0 : lead(v); return fromLocal(fromLocal(s0.P, th, ld, 0), s0.psi, 0, sgn(X) * w); };
UnifiedSim.prototype.gaitFrom = function (plan, keep, anchors, tTo) {
  if (!this.L.support) return PlaySim.prototype.gaitFrom.call(this, plan, keep, anchors, tTo);
  const t = this.t, K = { stances: { R: keep.stances.R.map((x) => Object.assign({}, x)), L: keep.stances.L.map((x) => Object.assign({}, x)) }, contacts: keep.contacts, lastT: keep.lastT };
  // EARLY RELEASE: a support the agile root is leaving behind (> 0.60 m, or crossed to the other side) lifts when it would (Astra's probe rule)
  for (const F of ["R", "L"]) for (const s of K.stances[F]) if (s.t0 <= t && s.t1 > t && s.t1 !== Infinity && s.src !== "tech") {
    for (let dt = 0.025; dt <= Math.min(0.32, s.t1 - t); dt += DT) { const x = this.stateAt(t + dt, plan), dx = s.pos[0] - x.P[0], dy = s.pos[1] - x.P[1], side = (-dx * Math.sin(x.psi) + dy * Math.cos(x.psi)) * sgn(F);
      if (hyp(dx, dy) > 0.60 || side < -0.05) { s.t1 = Math.min(s.t1, Math.max(t + 0.025, s.t0 + 0.06, t + dt)); s.released = true; break; } } }
  // COMMITTED LANDINGS: revised toward the new path at Astra's rates — 0.25 m per 1/60 s while > 0.12 s remain, 0.08 m per 1/60 s later, frozen
  // in the last 0.055 s (the revision is rate-limited in time, not per re-plan: BALL ON re-plans far less often than Astra's 60 Hz probe); one
  // still out of the body's reach after it (> 0.62 m from the root at its landing) gives up its commitment — a REPLACEMENT STEP placed afresh.
  // An anchor (a technique's or a generic action's own step) of the same foot within 0.03 s TAKES the landing if its place is within the
  // allowance, else it is refused (the candidate is then not feasible)
  const blocked = new Set();
  for (const F of ["R", "L"]) { const L = K.stances[F]; for (let i = 0; i < L.length; i++) { const c = L[i]; if (!c.commit || c.t0 <= t + 1e-9) continue;
    const rem = c.t0 - t, since = Math.max(DT, t - (c.revT != null ? c.revT : t - DT)), cap = rem < 0.055 ? 0 : (rem > 0.12 ? 15 : 4.8) * since; c.revT = t;
    const A = anchors.find((a) => a.F === F && Math.abs(a.t0 - c.t0) <= 0.03 + 1e-9);
    if (A) { const want = A.pos || this.placeFor(F, A.t0, plan); if (hyp(want[0] - c.pos[0], want[1] - c.pos[1]) <= Math.max(cap, 0.08)) { L.splice(i, 1); i--; } else blocked.add(A); continue; }
    const want = this.placeFor(F, c.t0, plan), d = hyp(want[0] - c.pos[0], want[1] - c.pos[1]), k = Math.min(1, cap / Math.max(d, 1e-9)); c.pos = [c.pos[0] + (want[0] - c.pos[0]) * k, c.pos[1] + (want[1] - c.pos[1]) * k];
    const R0 = this.stateAt(c.t0, plan).P; if (hyp(c.pos[0] - R0[0], c.pos[1] - R0[1]) > 0.62) { L.splice(i, 1); i--; } } }
  const S = bodyGaitFrom.call(this, plan, K, anchors.filter((a) => !blocked.has(a)), tTo);
  for (const a of blocked) a.refused = true; return S; };
// the times a technique's first stance can land: the stride (88573ef0's) — and, with the shared plan, the foot's own COMMITTED landing itself
UnifiedSim.prototype.anchorTimes = function (X, keep, st) {
  const out = PlaySim.prototype.anchorTimes.call(this, X, keep, st); if (!this.L.support) return out;
  const c = keep.stances[X].find((s) => s.commit && s.t0 > this.t + 1e-9); if (c && !out.some((x) => Math.abs(x - c.t0) < 1e-6)) out.push(c.t0);
  return out.filter((x) => x > this.t + 0.04).sort((a, b) => a - b); };
export { PlaySim as TCSim };
