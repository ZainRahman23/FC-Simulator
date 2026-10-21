// ═══ tc_controlled1/c_sim.js — TC-CONTROLLED-1: THE CONTROLLED-BALL MODEL (owner, 21 Oct: "zero unforced loss at 99") ═════════════════════════════
// ControlledSim = TC-UNIFIED-1's FULL simulation (u_sim.js UnifiedSim: 88573ef0 + A99-C exact + the shared support plan + B4 + B5, unchanged) with
// o.control:
//   "FREE"        (default) TC-UNIFIED-1 exactly — checked bit-identical (tools/c_equiv.mjs). The possession state below is only OBSERVED.
//   "CONTROLLED"  CONTROLLED_BALL: once the player has secured the ball, the simulation keeps a VALID CONTROLLED CONTINUATION at every decision.
// The ball stays the authoritative kernel ball — never parented, never moved: between contacts it rolls freely on the kernel; only contacts
// (the player's planned touches, an opponent's collision) change it, each one a kernel launch from where the ball really is. What changes is
// how the player's movement, support and touches are planned while possession is secure:
//   · THE CONTINUATION (contOf): a plan is a controlled plan only if its next contact comes within 1.2 s, the free ball stays inside the body's
//     control envelope until then (1.5 m + 0.12 m per m/s of the body's speed), and at that contact the ball is within the foot's reach (≤ 1.0 m:
//     the kernel contact's own miss rule) — or the ball comes to rest at the feet. Every candidate B4 weighs (carry, generic families, named
//     moves) is scored with it: a candidate without one pays heavily; it stays a candidate (never a refusal) — the best of the rest wins
//   · NO POSTPONED TOUCH: a re-plan does not push the touch the running plan is about to make later (the resolver changing its mind every 1/60 s
//     while the stick swings never makes it) — the touch's AIM still follows the newest intent
//   · TIGHTER UNDER VOLATILE INPUT (§9): while the stick is turning fast / oscillating, a carry touch sends the ball no further than the body can
//     follow at its present speed (+ 1.5 m/s) — the ball stays with a body that is busy turning, not ahead on a run that will not happen
//   · POSSESSION-PRESERVING FALLBACK (§11): if the decision has no controlled continuation, the player changes the football action — SECURE: go to
//     the ball along its path and play it on toward the intent (88573ef0's pursuit, its touch in the wide reach) — rather than losing it
// THE POSSESSION STATE (deterministic, logged): FREE → (the player's own contact, followed by a controlled continuation: COLLECTED) → CONTROLLED →
// exits, each classified: INTENTIONAL_RELEASE (a release touch) · OPPONENT_TACKLE / OPPONENT_INTERCEPTION / EXTERNAL_COLLISION (an opponent's
// contact with the real ball, within 1 s) · CONTROLLER_FAILURE (anything else: a contact that missed, no contact planned for 0.3 s, the ball
// 3 m away). TECHNICAL_ERROR is reserved for lower ratings' execution variance (none at 99).
// THE OPPONENT (o.opponent: probes): a deterministic foot — a sphere of radius r at height z moving at v from p0 over [t0, t1] — resolved
// against the authoritative ball every tick (relative velocity reflected along the contact normal, restitution e): the ball's new velocity is a
// kernel launch from its real position; nothing in the player's plan or body can shield it. Animation is never read (presentation-neutral).
import { UnifiedSim, PlaySim, DT, DEG, wrap, toLocal, TEMPLATES, CARRY } from "./u_sim.js";
import { predict, speedFor, R as BR } from "../tc_baseline_88573ef0/pt_ball.js";
export * from "./u_sim.js";
const hyp = Math.hypot, abs = Math.abs, min = Math.min, max = Math.max, clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
export const POSS = { volMemory: 0.4, H: 1.2, envBase: 1.5, envPerSpeed: 0.12, reach: 1.0, restSpeed: 0.3, restDist: 0.9, noPlanMax: 0.3, farMax: 3.0, extWindow: 1.0, pushSlack: 1.5 };
export const EXITS = ["PASS", "SHOT", "CROSS", "CLEARANCE", "INTENTIONAL_RELEASE", "OPPONENT_TACKLE", "OPPONENT_INTERCEPTION", "EXTERNAL_COLLISION", "TECHNICAL_ERROR", "CONTROLLER_FAILURE"];
const EXT_EXIT = { tackle: "OPPONENT_TACKLE", poke: "OPPONENT_TACKLE", intercept: "OPPONENT_INTERCEPTION", block: "OPPONENT_INTERCEPTION", collision: "EXTERNAL_COLLISION" };
export class ControlledSim extends UnifiedSim {
  reset(o = {}) { super.reset(o);
    this.poss = { state: "FREE", since: this.t, why: "start: the ball placed at the feet (not yet played)", log: [], ext: null, fallback: null, cont: null, noPlan: 0, sep: 0, threat: 0, nC: this.contacts.length, exits: {} };
    this.opp = (this.o.opponent || []).map((x) => Object.assign({ r: 0.07, z: 0.10, e: 0.55, kind: "tackle" }, x, { hit: false })); this.extLog = []; this.releaseReq = false; return this; }
  get CB() { return this.o.control === "CONTROLLED" && this.o.ballOn !== false; }
  // ── a tick: the opponent's foot against the real ball first (it is where it is, whatever the player planned), then the player's tick, then the
  // possession monitor ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  step(req) { if (this.opp.length) this.opponentStep(); const r = super.step(req); this.volTick(); if (this.o.ballOn !== false) this.possStep(); return r; }
  opponentStep() { const t = this.t;
    for (const e of this.opp) { if (e.hit || t < e.t0 - 1e-9 || t > e.t1 + 1e-9) continue; const f = [e.p0[0] + e.v[0] * (t - e.t0), e.p0[1] + e.v[1] * (t - e.t0), e.z], b = this.ball.p, bz = max(BR, b[2] || BR), d = [b[0] - f[0], b[1] - f[1], bz - f[2]], D = hyp(d[0], d[1], d[2]);
      if (D > BR + e.r) continue; const nh = hyp(d[0], d[1]) || 1, n = [d[0] / nh, d[1] / nh], bv = this.ball.v, vr = [bv[0] - e.v[0], bv[1] - e.v[1]], vn = vr[0] * n[0] + vr[1] * n[1];
      // (a foot moving into the ball: the ball's velocity relative to the foot reflected along the normal with restitution; a ball moving away from
      // a slower foot is caught up only if the foot closes on it — then the same rule)
      if (vn >= 0) continue; const k = (1 + e.e) * vn, vOut = [bv[0] - k * n[0], bv[1] - k * n[1]];
      this.ball.launch(vOut, { external: true, by: e.kind }); e.hit = true; const rec = { t, kind: e.kind, at: [b[0], b[1]], vIn: [bv[0], bv[1]], vOut, foot: f, id: e.id }; this.extLog.push(rec);
      this.poss.ext = rec; this.flags.replan = this.flags.replan || "opponent"; this.mix(vOut[0]); this.mix(vOut[1]); } }
  // ── THE CONTINUATION of a plan from the present ball (the free ball until the plan's next contact — exact: nothing else touches it) ─────────────
  envOf(s) { return POSS.envBase + POSS.envPerSpeed * s; }
  firstContact(plan) { let c = null; for (const q of plan.contacts) if (!q.done && q.t > this.t + 1e-9 && (!c || q.t < c.t)) c = q; return c; }
  contOf(plan) { const t = this.t, b = this.ball.p, bv = this.ball.v, c = this.firstContact(plan);
    if (!c) { const f = predict(b, bv, 1.0), s = this.stateAt(t + 1.0, plan), ok = f.speed < POSS.restSpeed && hyp(f.p[0] - s.P[0], f.p[1] - s.P[1]) < POSS.restDist; return { ok, c: null, why: ok ? "the ball comes to rest at the feet" : "no contact planned" }; }
    if (c.t - t > POSS.H) return { ok: false, c, why: `next contact too late (+${(c.t - t).toFixed(2)} s)` };
    for (let x = t + 0.05; x < c.t - 1e-9; x += 0.05) { const f = predict(b, bv, x - t), s = this.stateAt(x, plan); if (hyp(f.p[0] - s.P[0], f.p[1] - s.P[1]) > this.envOf(s.s)) return { ok: false, c, why: "the ball leaves the control envelope" }; }
    const f = predict(b, bv, c.t - t), s = this.stateAt(c.t, plan), d = hyp(f.p[0] - s.P[0], f.p[1] - s.P[1]);
    if (d > POSS.reach) return { ok: false, c, why: `the contact out of reach (${d.toFixed(2)} m)` };
    return { ok: true, c, why: `next: ${c.role} ${c.F} in ${(c.t - t).toFixed(2)} s` }; }
  // ── the stick's recent activity (the request's heading change over the last 0.25 s): 0 = steady, 1 = turning / oscillating hard ─────────────
  // (the stick's ACTIVITY over the last 0.6 s: its total turning less its single largest change (any 60 ms) — one clean snap, then held, is not
  // activity (B4 answers it as before); oscillation, continuous rotation and wandering are. Remembered, decaying over ≈ 0.4 s — the context the
  // player is in, not a forecast of the next input)
  volInstant() { const R = this.vq; if (!R || R.n < 2) return 0; const N = min(R.n, 144); let tot = 0, big = 0; const d = [];
    for (let j = 1; j < N; j++) { const a = R.h[(R.k - j + 1440) % 144], b = R.h[(R.k - j + 1 + 1440) % 144]; const x = Number.isFinite(a) && Number.isFinite(b) ? abs(wrap(b - a)) : 0; d.push(x); tot += x; }
    let w = 0; for (let j = 0; j < d.length; j++) { w += d[j]; if (j >= 14) w -= d[j - 14]; if (w > big) big = w; }
    return clamp(((tot - big) / DEG / 0.6 - 120) / 400, 0, 1); }
  volatility() { return this.volMem ? this.volMem.v : 0; }
  volTick() { const R = this.vq || (this.vq = { h: new Float64Array(144).fill(NaN), k: -1, n: 0 }); R.k = this.k; R.n++; R.h[this.k % 144] = this.req && this.req.h != null ? this.req.h : NaN;
    const M = this.volMem || (this.volMem = { v: 0 }), x = this.volInstant(); M.v = max(x, M.v * Math.exp(-DT / POSS.volMemory)); }
  // (a NEW touch for a foot already in the air: from where that foot is now (its swing under the running plan) to the ball then, less the body's
  // own travel meanwhile, over the time left — the speed that foot would need relative to the body (m/s))
  footReach(c, cur) { const t = this.t; let worst = 0;
    for (const X of ["R", "L"]) { const f = this.footProxy(X, cur, t); if (!f) continue; const nc = this.firstContact({ contacts: c.contacts.filter((q) => q.F === X) }); if (!nc || nc.t > f.b.t0 + 0.2) continue;
      if (cur.contacts.some((q) => q.F === X && !q.done && abs(q.t - nc.t) < 0.02)) continue; const B = nc.bPred || predict(this.ball.p, this.ball.v, nc.t - t).p, R0 = this.stateAt(t, cur).P, R1 = this.stateAt(nc.t, c).P;
      const rel = hyp(B[0] - f.p[0] - (R1[0] - R0[0]), B[1] - f.p[1] - (R1[1] - R0[1])) / max(DT, nc.t - t); worst = max(worst, rel); }
    return worst; }
  // ── the decision: B4 / the cost with the possession terms (CONTROLLED only) ────────────────────────────────────────────────────────────────
  cost(c, st, q, cur) { const o = super.cost(c, st, q, cur); return this.CB ? this.possCost(c, cur, o) : o; }
  costB4(c, st, q, cur) { const o = super.costB4(c, st, q, cur); return this.CB ? this.possCost(c, cur, o) : o; }
  // (the candidate's continuation; NO POSTPONED TOUCH: the running plan's next touch, valid and within 0.35 s, is not pushed later by a re-plan —
  // a candidate with no contact by then pays 30: the resolver changing its mind every 1/60 s never makes the touch it keeps re-planning)
  possCost(c, cur, o) { const k = this.contOf(c), notes = []; let J = o.J;
    // (a continuation the drawn foot cannot make — its swing would have to jump to the new touch (u_sim's one-foot-one-history measure) — is not a
    // controlled continuation: the boot must be seen to play the ball)
    if (k.ok && this.L.support && (this.swingCont(c, cur) > 0.5 || this.footReach(c, cur) > 8)) { k.ok = false; k.why = "the foot cannot get there (it would jump)"; }
    if (!k.ok) { J += 50; notes.push("no controlled continuation (" + k.why + ")"); }
    const cn = this.firstContact(cur); if (cn && k.ok && this.poss.cur && this.poss.cur.ok && cn.t - this.t < 0.35 && this.volatility() > 0.2) { const late = k.c ? k.c.t - cn.t : 0.5; if (late > 0.03) { J += 30; notes.push(`postpones the touch +${late.toFixed(2)} s`); } }
    const r = Object.assign({}, o, { J, note: (o.note ? o.note + " · " : "") + notes.join(" · "), cont: k }); c._cont = k; if (this._cands) this._cands.push({ c, J, ok: k.ok }); return r; }
  // (the decision: the planner's choice is held back, then — CONTROLLED — the best candidate WITH a controlled continuation is adopted; none:
  // the running plan stays if it still has one (the next re-plan tries again); else the possession-preserving fallback)
  adopt(plan) { if (this._defer) { this._pending = plan; return; } return super.adopt(plan); }
  replan(reason) { if (this.o.ballOn === false) return super.replan(reason);
    const P = this.poss; P.cur = this.contOf(this.plan); P.fallback = null;
    if (!this.CB) { super.replan(reason); P.cont = this.contOf(this.plan); return this.afterReplan(reason, P.cont); }
    this._cands = []; this._pending = null; this._defer = true; try { super.replan(reason); } finally { this._defer = false; }
    const best = this._pending, bc = best ? best._cont || this.contOf(best) : null; let cont;   // (its continuation as the decision judged it — reach and foot included)
    if (best && bc.ok) { super.adopt(best); cont = bc; }
    else { const alts = this._cands.filter((x) => x.ok && x.c !== best).sort((a, b) => a.J - b.J), alt = alts[0];
      if (alt) { alt.c.reason = reason + " (controlled)"; alt.c.why = alt.c.why || [{ label: alt.c.action.label, id: alt.c.action.label, J: +alt.J.toFixed(2), note: "the best candidate with a controlled continuation" }]; super.adopt(alt.c); cont = this.contOf(alt.c); P.fallback = "the next-best controlled candidate"; }
      else if (P.cur.ok) { cont = P.cur; P.fallback = "kept the running plan"; }
      else { const fb = P.state === "CONTROLLED" || reason === "contact" ? this.fallback() : null; if (fb) { super.adopt(fb.plan); cont = fb.cont; P.fallback = fb.label; } else { if (best) super.adopt(best); cont = this.contOf(this.plan); } } }
    this._cands = null; P.cont = cont; return this.afterReplan(reason, cont); }
  afterReplan(reason, cont) { const P = this.poss;
    // (secured: the player's own contact just made, and a controlled continuation after it — the ball has been played, not merely found nearby)
    const last = this.contacts[this.contacts.length - 1]; if (P.state !== "CONTROLLED" && reason === "contact" && last && !last.missed && last.k === this.k && !last.release && cont.ok) this.enterControl(last.role); }
  // ── THE POSSESSION-PRESERVING FALLBACK: SECURE — to the ball along its own path, the touch in the wide reach sending it on toward the intent ─────
  fallback() { const t = this.t, st = this.stateAt(t, this.plan), keep = this.committed(this.plan, t), q = this.req, out = [];
    const ch = this.chasePlan(st, keep, q); if (ch) out.push({ plan: this.finishCarry(ch.plan, ch.touches, keep, q), label: "SECURE (to the ball)" });
    // (the pursuit planned through the body's real movement: for each meeting time, run toward where the ball will be then — integrated by C, its
    // envelope and all — and keep the earliest whose plan ends in a touch; 88573ef0's pursuit assumes a straight run at speed)
    { const b = this.ball.p, bv = this.ball.v, aid = this.plan.action.kind === "CARRY" ? this.plan.action.id : ++this.aid;
      for (let T = 0.2; T <= 1.6 + 1e-9 && out.length < 3; T += 0.1) { const f = predict(b, bv, T), u = q.h != null ? [Math.cos(q.h), Math.sin(q.h)] : f.speed > 0.3 ? [f.v[0] / f.speed, f.v[1] / f.speed] : [Math.cos(st.psi), Math.sin(st.psi)];
        const tgt = [f.p[0] - u[0] * 0.30, f.p[1] - u[1] * 0.30], d = [tgt[0] - st.P[0], tgt[1] - st.P[1]], D = hyp(d[0], d[1]), sp = clamp(D / T * 1.1, 1.0, this.P.speed.SPRINT), h = D > 0.05 ? Math.atan2(d[1], d[0]) : st.psi;
        const pl = this.mkPlan({ t0: t, st, stances: null, contacts: [], action: { kind: "CARRY", label: "CARRY", id: aid, chase: true }, req: q, prog: { kind: "chase", speed: sp, h, until: t + T + 0.1 }, chKeys: this.carryChannels(st, q, t) });
        pl.stances = this.gaitFrom(pl, keep, [], t + 1.5); const tc = this.carryTouches(pl, keep, q, true); if (tc.ok && tc.list.length) { out.push({ plan: this.finishCarry(pl, tc, keep, q), label: `SECURE (pursuit ${T.toFixed(1)} s)` }); break; } } }
    { const base = this.mkPlan({ t0: t, st, stances: null, contacts: [], action: { kind: "CARRY", label: "CARRY", id: this.plan.action.kind === "CARRY" ? this.plan.action.id : ++this.aid }, req: q, prog: { kind: "carry" }, chKeys: this.carryChannels(st, q, t) });
      base.stances = this.gaitFrom(base, keep, [], t + 1.5); const tc = this.carryTouches(base, keep, q, true); if (tc.ok && tc.list.length) out.push({ plan: this.finishCarry(base, tc, keep, q), label: "SECURE (wide touch)" }); }
    for (const o of out) { o.cont = this.contOf(o.plan); if (o.cont.ok) { o.plan.reason = "fallback"; o.plan.why = [{ label: o.label, id: "SECURE", J: 0, note: o.cont.why }]; return o; } }
    return null; }
  finishCarry(plan, touches, keep, q) { plan.contacts = keep.contacts.concat(touches.list.filter((c) => !keep.contacts.some((k) => abs(k.t - c.t) < 0.03 && k.F === c.F))); plan.nContacts = touches.list.length;
    plan.tLine = this.lineTime(plan, q); plan.sepMax = touches.sepMax; plan.sepPen = touches.sepPen; plan.action.carry = touches.info; plan.action.secure = true; return plan; }
  // ── TIGHTER UNDER VOLATILE INPUT: the carry touch's push no longer than the body can follow at its present speed while the stick is busy ───────
  // ── THE CONTROLLED CARRY TOUCH: the ball sent to roll WITH the body — toward where the body will be at that foot's next swing end (its plan's
  // path, blended with its present motion by the stick's activity: a busy stick, a body that may not follow the plan), at no more than the body's
  // own speed then + a little (less, the busier the stick). 88573ef0's touch aims the ball to ARRIVE at a point at a time — it rolls on past it;
  // a slow or turning body then never catches it up. A steady stick at speed keeps 88573ef0's longer push (V = 0 and the body ≥ 3 m/s: unchanged)
  carryTouches(plan, keep, q, recover = false, skip = null) { const out = super.carryTouches(plan, keep, q, recover, skip); if (!this.CB || !out.list.length) return out;
    const c = out.list[0]; if (!c.aim || c.aim.kind !== "target" || !c.bPred || keep.contacts.includes(c)) return out;
    const V = this.volatility(), now = this.stateAt(this.t, this.plan), slow = clamp((3.0 - now.s) / 2.0, 0, 1), W = max(V, slow); if (W <= 0) return out;
    let T = c.aim.T; const B = c.bPred, nx = plan.stances[c.F].find((s) => s.t0 - CARRY.touchBefore > c.t + 0.15); if (W > 0.4 && nx && nx.t0 - CARRY.touchBefore < T - 0.05) T = nx.t0 - CARRY.touchBefore;
    const sp0 = this.stateAt(T, plan), inert = [now.P[0] + now.V[0] * (T - this.t), now.P[1] + now.V[1] * (T - this.t)], bodyP = [sp0.P[0] + (inert[0] - sp0.P[0]) * V, sp0.P[1] + (inert[1] - sp0.P[1]) * V];
    const vb = [sp0.V[0] + (now.V[0] - sp0.V[0]) * V, sp0.V[1] + (now.V[1] - sp0.V[1]) * V], vs = hyp(vb[0], vb[1]), hB = vs > 0.5 ? Math.atan2(vb[1], vb[0]) : q.h != null ? q.h : now.psi, lane = (c.F === "R" ? 1 : -1) * CARRY.lane(q.mode || "RUN");
    const lead = [bodyP[0] + Math.cos(hB) * CARRY.ahead(vs) - Math.sin(hB) * lane, bodyP[1] + Math.sin(hB) * CARRY.ahead(vs) + Math.cos(hB) * lane], d = [lead[0] - B[0], lead[1] - B[1]], D = hyp(d[0], d[1]);
    if (q.h == null) return out;   // (a stop: 88573ef0's own stop touch — to rest where the body stops)
    let sp = D < 1e-3 ? 0 : speedFor(D, max(0.08, T - c.t)); if (sp == null) sp = CARRY.vCap; const cap = max(0.4, vs) + 0.4 + 1.2 * (1 - W); sp = min(sp, cap, CARRY.vCap);
    c.aim = { kind: "vel", speed: sp, h: D > 1e-3 ? Math.atan2(d[1], d[0]) : hB, controlled: +W.toFixed(2), T }; return out; }
  // ── CONTROLLED GENERIC TOUCHES: a braking touch / pivot leaves the ball where the turning body will take it (≤ 1.2 m/s onto the new line — it
  // is not sent away while the body still has to stop and turn); a redirect rolls no faster than the body's speed + 1.5 m/s (less, the busier
  // the stick). Named moves keep their authored trajectories
  genericBuild(key, G, X, tT, e, ap, st, keep, q, turnB, sgnT, hPin = null, base = null) { const p = super.genericBuild(key, G, X, tT, e, ap, st, keep, q, turnB, sgnT, hPin, base); if (!p || !this.CB) return p;
    const c = p.contacts.find((x) => x.src === "generic" && !x.done && Math.abs(x.t - tT) < 1e-6); if (!c || !c.vOutPred) return p; const V = this.volatility(), s = this.stateAt(tT, p), vo = c.vOutPred, sp = hyp(vo[0], vo[1]);
    // (a braking touch: the ball sent back no faster than it separates by ≈ 0.9 m while the body is still stopping to turn — A99-C's own 180°
    // reorientation time at its speed then; at a jog that leaves 88573ef0's touch as it was, at a sprint it keeps the ball near)
    const brake = G.brake || key === "BPV"; if (!brake && V < 0.3) return p; const Trev = 0.42 * (0.58 + 0.42 * min(8, st.s) / 8), cap = brake ? clamp(0.9 / Trev, 1.2, 3.5) : max(0.5, s.s) + 1.5 * (1 - V) + 0.4; if (sp <= cap) return p; const k = cap / sp, h = Math.atan2(vo[1], vo[0]);
    c.aim = { kind: "vel", speed: cap, h, controlled: true }; c.vOutPred = [vo[0] * k, vo[1] * k]; return p; }
  // ── THE TOUCH FOLLOWS THE NEWEST INTENT, at the contact itself: a contact executes before the tick's re-plan — if the stick has changed since
  // the plan (by > 12°, or to / from stop), a carry touch is re-aimed for it there: stopping, a cushion that keeps the ball with the braking body;
  // a new line, a short push into it that the body can follow (0.35 s) ─────────────────────────────────────────────────────────────────────────
  reaim(c) { const q = this.req, pq = this.plan.req; if (!q || !pq) return; const changed = (q.h == null) !== (pq.h == null) || (q.h != null && abs(wrap(q.h - pq.h)) > 12 * DEG); if (!changed) return;
    const b = this.ball.p, bv = this.ball.v, now = this.stateAt(this.t, this.plan), inS = hyp(bv[0], bv[1]);
    if (q.h == null) { const sp = min(inS, now.s * 0.55), h = inS > 0.3 ? Math.atan2(bv[1], bv[0]) : now.psi; c.aim = { kind: "vel", speed: now.s < 2.4 || inS < 0.3 ? 0 : sp, h, reaim: "stop" }; return; }
    const T = this.t + 0.35, lane = (c.F === "R" ? 1 : -1) * CARRY.lane(q.mode), P = [now.P[0] + now.V[0] * 0.35 + Math.cos(q.h) * CARRY.ahead(now.s) - Math.sin(q.h) * lane, now.P[1] + now.V[1] * 0.35 + Math.sin(q.h) * CARRY.ahead(now.s) + Math.cos(q.h) * lane];
    c.aim = { kind: "target", P, T, reaim: "new line" }; }
  // ── the possession monitor (both models: in FREE it only observes, with the same rules) ────────────────────────────────────────────────────
  possStep() { const P = this.poss, t = this.t, st = this.stateAt(t), b = this.ball.p, bv = this.ball.v, sep = hyp(b[0] - st.P[0], b[1] - st.P[1]), plan = this.plan;
    P.sep = sep; P.threat = sep / this.envOf(st.s); let missed = null, release = null;
    while (P.nC < this.contacts.length) { const c = this.contacts[P.nC++]; if (c.missed) missed = c; else if (c.release) release = c; }
    if (P.state !== "CONTROLLED") return;
    if (release) return this.exitControl("INTENTIONAL_RELEASE", "the release touch");
    const future = plan.contacts.some((c) => !c.done && c.t > t - 1e-9) || (!plan.contacts.some((c) => !c.done) && this.contOf(plan).ok), atRest = hyp(bv[0], bv[1]) < POSS.restSpeed && sep < 0.8;   // (a ball coming to rest at the feet is a continuation)
    P.noPlan = !future && !atRest ? P.noPlan + DT : 0;
    const why = missed ? "a planned contact missed the ball" : P.noPlan > POSS.noPlanMax ? "no contact planned" : sep > POSS.farMax ? "the ball 3 m away" : null; if (!why) return;
    const ext = P.ext && t - P.ext.t < POSS.extWindow ? P.ext : null; this.exitControl(ext ? EXT_EXIT[ext.kind] || "EXTERNAL_COLLISION" : "CONTROLLER_FAILURE", why + (ext ? ` (after the opponent's ${ext.kind} at ${ext.t.toFixed(2)} s)` : "")); }
  enterControl(how) { const P = this.poss; P.log.push({ t: +this.t.toFixed(4), from: P.state, to: "CONTROLLED", why: "COLLECTED", detail: how }); P.state = "CONTROLLED"; P.since = this.t; P.why = "secured by " + how; P.noPlan = 0; }
  exitControl(cls, detail) { const P = this.poss, st = this.stateAt(this.t), a = this.plan.action;
    P.log.push({ t: +this.t.toFixed(4), from: "CONTROLLED", to: "FREE", why: cls, detail, action: a.label, speed: +st.s.toFixed(2), sep: +P.sep.toFixed(2), reqH: this.req.h }); P.exits[cls] = (P.exits[cls] || 0) + 1;
    P.state = "FREE"; P.since = this.t; P.why = cls + ": " + detail; }
  // ── INTENTIONAL RELEASE (a test hook — this sandbox has no pass / shot system): the next planned touch becomes a knock-on into space ──────────
  release() { const c = this.firstContact(this.plan); if (!c || c.done) return false; c.aim = { kind: "vel", speed: 14, h: this.req.h != null ? this.req.h : this.stateAt(this.t).h }; c.release = true; c.role = "release (knock-on)"; return true; }
  execute(c) { if (this.CB && c.src === "carry" && !c.release) this.reaim(c); const n = this.contacts.length; super.execute(c); if (c.release && this.contacts.length > n) this.contacts[this.contacts.length - 1].release = true; }
  // ── the HUD's view (diagnostics only, never read by the simulation) ────────────────────────────────────────────────────────────────────────
  possInfo() { const P = this.poss, t = this.t, plan = this.plan, c = this.firstContact(plan), st = this.stateAt(t, plan); let sup = null;
    for (const X of ["R", "L"]) if (plan.stances[X].some((s) => s.t0 <= t + 1e-9 && s.t1 > t)) sup = sup ? "both" : X;
    const a = plan.action, committed = !!(c && (c.t - t < this.P.react + 1e-9 || (a.tech && t >= a.tCommit - 1e-9 && t < a.tRelease)));
    const phase = a.tech ? this.phaseOf(a) : c ? `ball rolling to the ${c.role} (${(c.t - t).toFixed(2)} s)` : "ball at the feet";
    return { model: this.CB ? "CONTROLLED" : "FREE", state: P.state, since: +(t - P.since).toFixed(2), action: a.label + (a.secure ? " · SECURE" : ""), phase, next: c ? `${c.role} · ${c.F} · ${c.surface} in ${(c.t - t).toFixed(2)} s` : "—", support: sup || "none (flight)",
      technical: c ? c.F : "—", committed, threat: +P.threat.toFixed(2), fallback: P.fallback, cont: P.cont ? P.cont.why : "—", lastExit: P.log.filter((e) => e.to === "FREE").slice(-1)[0] || null, volatility: +this.volatility().toFixed(2), speed: +st.s.toFixed(2) }; }
}
