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
//     the kernel contact's own miss rule) — or the ball comes to rest at the feet, inside the envelope meanwhile. Every candidate B4 weighs (carry, generic families, named
//     moves) is scored with it: a candidate without one pays heavily; it stays a candidate (never a refusal) — the best of the rest wins
//   · NO POSTPONED TOUCH: a re-plan does not push the touch the running plan is about to make later (the resolver changing its mind every 1/60 s
//     while the stick swings never makes it) — the touch's AIM still follows the newest intent
//   · TIGHTER UNDER VOLATILE INPUT (§9): while the stick is turning fast / oscillating, a carry touch sends the ball no further than the body can
//     follow at its present speed (+ 1.5 m/s) — the ball stays with a body that is busy turning, not ahead on a run that will not happen
//   · POSSESSION-PRESERVING FALLBACK (§11): if the decision has no controlled continuation, the player changes the football action — SECURE: go to
//     the ball along its path and play it on toward the intent (the pursuit planned through A99-C's real movement, 88573ef0's pursuit, the touch
//     in the wide reach) — rather than losing it; when none of those is a controlled continuation either, the earliest pursuit that touches the
//     ball at all is kept as the RECOVERY (a real touch on the real ball, later — never "no contact")
//   · THE LANE FOOT: the controlled touches keep 88573ef0's carry lane (the preferred foot's side and that foot's next swing)
// THE POSSESSION STATE (deterministic, logged): FREE → (the player's own contact, followed by a controlled continuation: COLLECTED) → CONTROLLED →
// exits, each classified: INTENTIONAL_RELEASE (a release touch) · OPPONENT_TACKLE / OPPONENT_INTERCEPTION / EXTERNAL_COLLISION (an opponent's
// contact with the real ball, within 1 s) · CONTROLLER_FAILURE (anything else: a contact that missed, no contact planned for 0.3 s, the ball
// 3 m away). TECHNICAL_ERROR is reserved for lower ratings' execution variance (none at 99).
// THE OPPONENT (o.opponent: probes): a deterministic foot — a sphere of radius r at height z moving at v from p0 over [t0, t1] (or, track: the
// page's poke, steering at the ball where it is now at that speed) — resolved
// against the authoritative ball every tick (relative velocity reflected along the contact normal, restitution e): the ball's new velocity is a
// kernel launch from its real position; nothing in the player's plan or body can shield it. Animation is never read (presentation-neutral).
import { UnifiedSim, PlaySim, DT, DEG, wrap, toLocal, TEMPLATES, CARRY } from "./u_sim.js";
import { predict, speedFor, R as BR } from "../tc_baseline_88573ef0/pt_ball.js";
import { applyPace } from "./pace.js";
import { demandRaw, demandStep, opennessOf, vAvailOf, accOf, carryType } from "./carry_env.js";   // (BALL-ON PACE V1)   // (SPEED-99-V1: o.pace — the SPRINT SPEED / ACCELERATION candidate; none / CURRENT = TC-CONTROLLED-1 exactly)
export * from "./u_sim.js";
const hyp = Math.hypot, abs = Math.abs, min = Math.min, max = Math.max, clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
export const POSS = { keepRunning: globalThis.KEEP_RUNNING !== false, slowTight: false, volMemory: 0.4, H: 1.2, envBase: 1.5, envPerSpeed: 0.12, reach: 1.0, restSpeed: 0.3, restDist: 0.9, noPlanMax: 0.3, farMax: 3.0, extWindow: 1.0, pushSlack: 1.5 };
export const EXITS = ["PASS", "SHOT", "CROSS", "CLEARANCE", "INTENTIONAL_RELEASE", "OPPONENT_TACKLE", "OPPONENT_INTERCEPTION", "EXTERNAL_COLLISION", "TECHNICAL_ERROR", "CONTROLLER_FAILURE"];
const EXT_EXIT = { tackle: "OPPONENT_TACKLE", poke: "OPPONENT_TACKLE", intercept: "OPPONENT_INTERCEPTION", block: "OPPONENT_INTERCEPTION", collision: "EXTERNAL_COLLISION" };
export class ControlledSim extends UnifiedSim {
  reset(o = {}) { super.reset(o); applyPace(this.P, this.o.pace, this.o.carry); this.scHold = null; this.ctl = { D: 0, raw: 0, O: 0, vA: null, mul: 1, aPhys: 0, aBall: 0, type: "" }; this.ctlHist = [];
    this.poss = { state: "FREE", since: this.t, why: "start: the ball placed at the feet (not yet played)", log: [], ext: null, fallback: null, cont: null, noPlan: 0, sep: 0, threat: 0, nC: this.contacts.length, exits: {} };
    this.opp = (this.o.opponent || []).map((x) => Object.assign({ r: 0.07, z: 0.10, e: 0.55, kind: "tackle" }, x, { hit: false })); this.extLog = []; this.releaseReq = false; return this; }
  setAttrs(attrs) { super.setAttrs(attrs); applyPace(this.P, this.o.pace, this.o.carry); }
  get CB() { return this.o.control === "CONTROLLED" && this.o.ballOn !== false; }
  // ── a tick: the opponent's foot against the real ball first (it is where it is, whatever the player planned), then the player's tick, then the
  // possession monitor ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  step(req) { if (this.opp.length) this.opponentStep(); const r = super.step(req); this.volTick(); if (this.o.ballOn !== false) this.possStep(); if (this.P.ballEnv && this.o.ballOn !== false) this.ctlTick(); return r; }
  // ── BALL-ON PACE V1: the control demand of the moment (smoothed), the envelope it leaves — the seed of every plan's own envelope, and the HUD ──
  ctlTick() { const t = this.t, st = this.stateAt(t, this.plan), q = this.req, b = this.ball.p, bv = this.ball.v, C = this.ctl, pr = this.P.pace, env = this.P.ballEnv;
    const keyed = !!(this.plan.action.tech && this.plan.prog && this.plan.prog.tEnd != null && t <= this.plan.prog.tEnd);
    const pg = this.plan.prog, hDem = pg && pg.kind === "chase" && t < pg.until ? pg.h : q && q.h != null ? q.h : null;   // (a pursuit runs to the ball: its own heading)
    C.raw = demandRaw(hDem != null && st.s > 0.5 ? wrap(hDem - st.h) : 0, st.turnRate || 0, this.volatility(), keyed); C.D = demandStep(C.D, C.raw, DT);
    C.O = opennessOf(hyp(b[0] - st.P[0], b[1] - st.P[1])); C.vA = vAvailOf(env, pr.vmax, C.D, C.O); const A = accOf(pr, env, st.s, C.D, C.O, C.vA); C.mul = A.mul; C.m = A.m; C.aPhys = A.aPhys; C.aBall = A.aBall; C.type = carryType(C.D, C.O, keyed, st.s);
    (this.ctlHist || (this.ctlHist = [])).push([this.k, C.D, C.raw, C.O, C.vA, C.mul, C.aPhys, C.aBall, C.type, C.m]); if (this.ctlHist.length > 240 * 30) this.ctlHist.splice(0, 240 * 5); }
  // (the envelope at a recorded instant — the HUD's replay)
  ctlAt(t) { const H = this.ctlHist; if (!H || !H.length) return null; const k = Math.round(t / DT); let lo = 0, hi = H.length - 1; if (k <= H[0][0]) return H[0]; if (k >= H[hi][0]) return H[hi];
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (H[m][0] <= k) lo = m; else hi = m; } return H[lo]; }
  opponentStep() { const t = this.t;
    for (const e of this.opp) { if (e.hit || t < e.t0 - 1e-9 || t > e.t1 + 1e-9) continue; let f, ev = e.v;
      // (a TRACKING foot — the page's poke: a lunging tackler steering at the ball where it is now, at its own fixed speed, integrated tick by tick;
      // otherwise a straight line. Either way the foot is only a moving body the ball collides with: no target, no knowledge of the player's plan)
      if (e.track) { const b0 = this.ball.p, q = e.pos || (e.pos = [e.p0[0], e.p0[1]]), dd = [b0[0] - q[0], b0[1] - q[1]], dn = hyp(dd[0], dd[1]) || 1, sp = hyp(e.v[0], e.v[1]); ev = [dd[0] / dn * sp, dd[1] / dn * sp]; q[0] += ev[0] * DT; q[1] += ev[1] * DT; f = [q[0], q[1], e.z]; }
      else f = [e.p0[0] + e.v[0] * (t - e.t0), e.p0[1] + e.v[1] * (t - e.t0), e.z];
      const b = this.ball.p, bz = max(BR, b[2] || BR), d = [b[0] - f[0], b[1] - f[1], bz - f[2]], D = hyp(d[0], d[1], d[2]);
      if (D > BR + e.r) continue; const nh = hyp(d[0], d[1]) || 1, n = [d[0] / nh, d[1] / nh], bv = this.ball.v, vr = [bv[0] - ev[0], bv[1] - ev[1]], vn = vr[0] * n[0] + vr[1] * n[1];
      // (a foot moving into the ball: the ball's velocity relative to the foot reflected along the normal with restitution; a ball moving away from
      // a slower foot is caught up only if the foot closes on it — then the same rule)
      if (vn >= 0) continue; const k = (1 + e.e) * vn, vOut = [bv[0] - k * n[0], bv[1] - k * n[1]];
      this.ball.launch(vOut, { external: true, by: e.kind }); e.hit = true; const rec = { t, kind: e.kind, at: [b[0], b[1]], vIn: [bv[0], bv[1]], vOut, foot: f, id: e.id }; this.extLog.push(rec);
      this.poss.ext = rec; this.flags.replan = this.flags.replan || "opponent"; this.mix(vOut[0]); this.mix(vOut[1]); } }
  // ── THE CONTINUATION of a plan from the present ball (the free ball until the plan's next contact — exact: nothing else touches it) ─────────────
  envOf(s) { return POSS.envBase + POSS.envPerSpeed * s; }
  firstContact(plan) { let c = null; for (const q of plan.contacts) if (!q.done && q.t > this.t + 1e-9 && (!c || q.t < c.t)) c = q; return c; }
  contOf(plan) { const t = this.t, b = this.ball.p, bv = this.ball.v, c = this.firstContact(plan);
    // (no contact: the ball must come to rest at the feet AND stay inside the envelope meanwhile — a ball rolling away from a body that will only
    // later meet its resting point is not at the feet)
    if (!c) { const f = predict(b, bv, 1.0), s = this.stateAt(t + 1.0, plan); let ok = f.speed < POSS.restSpeed && hyp(f.p[0] - s.P[0], f.p[1] - s.P[1]) < POSS.restDist;
      if (ok) for (let x = t + 0.05; x < t + 1.0 - 1e-9; x += 0.05) { const g = predict(b, bv, x - t), q = this.stateAt(x, plan); if (hyp(g.p[0] - q.P[0], g.p[1] - q.P[1]) > this.envOf(q.s)) { ok = false; break; } }
      return { ok, c: null, why: ok ? "the ball comes to rest at the feet" : "no contact planned" }; }
    if (c.t - t > (c.sc && this.P.pace && this.P.pace.sprintCarry ? this.P.pace.sprintCarry.H : POSS.H)) return { ok: false, c, why: `next contact too late (+${(c.t - t).toFixed(2)} s)` };
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
    if (!best) { cont = P.cur; P.fallback = null; }   // (the planner itself kept its plan — B4's committed generic touch, a committed technique: as FREE)
    else if (bc.ok) { super.adopt(best); cont = bc; }
    else { const alts = this._cands.filter((x) => x.ok && x.c !== best).sort((a, b) => a.J - b.J), alt = alts[0];
      // (the running touch kept, RE-AIMED for the new intent — the body planned on the new request at once, the touch the running plan was about to
      // make kept in its time and foot and sent where the new intent says (88573ef0's committed-touch re-aim): no input waits)
      const rt = !alt ? this.retouch(reason) : null;
      if (rt) { super.adopt(rt.plan); cont = rt.cont; P.fallback = "the running touch, re-aimed (the body follows the new intent)"; }
      else if (alt) { alt.c.reason = reason + " (controlled)"; alt.c.why = alt.c.why || [{ label: alt.c.action.label, id: alt.c.action.label, J: +alt.J.toFixed(2), note: "the best candidate with a controlled continuation" }]; super.adopt(alt.c); cont = this.contOf(alt.c); P.fallback = "the next-best controlled candidate"; }
      else if (P.cur.ok && POSS.keepRunning) { cont = P.cur; P.fallback = "kept the running plan"; }
      else if (this.plan.action.recover && this.reachOf(this.plan)) { cont = P.cur; P.fallback = "kept the recovery"; }   // (its touch still in reach: no re-timing it every tick)
      else { const fb = P.state === "CONTROLLED" || reason === "contact" ? this.fallback() : null; if (fb) { super.adopt(fb.plan); cont = fb.cont; P.fallback = fb.label; } else { if (best) super.adopt(best); cont = this.contOf(this.plan); } } }
    this._cands = null; P.cont = cont; return this.afterReplan(reason, cont); }
  afterReplan(reason, cont) { const P = this.poss;
    // (an opponent's contact this tick: control survives only a MINOR deflection — the ball's velocity changed < 2 m/s and the player's next touch
    // within 0.6 s with a controlled continuation; anything more is contested possession: CONTROLLED → FREE, to be re-collected)
    if (P.state === "CONTROLLED" && P.ext && abs(P.ext.t - this.t) < 1e-9) { const e = P.ext, dv = hyp(e.vOut[0] - e.vIn[0], e.vOut[1] - e.vIn[1]), nc = cont && cont.ok ? cont.c : null;
      if (!(dv < 2.0 && cont && cont.ok && (!nc || nc.t - this.t < 0.6))) this.exitControl(EXT_EXIT[e.kind] || "EXTERNAL_COLLISION", `the opponent's ${e.kind} (Δv ${dv.toFixed(1)} m/s)`); }
    // (secured: the player's own contact just made, and a controlled continuation after it — the ball has been played, not merely found nearby)
    const last = this.contacts[this.contacts.length - 1]; if (P.state !== "CONTROLLED" && reason === "contact" && last && !last.missed && last.k === this.k && !last.release && cont.ok) this.enterControl(last.role); }
  retouch(reason) { const t = this.t, oc = this.firstContact(this.plan); if (!oc || oc.src !== "carry" || oc.t - t > 0.8 || !this.poss.cur.ok) return null;
    const st = this.stateAt(t, this.plan), keep = this.committed(this.plan, t), q = this.req; if (!keep.contacts.includes(oc)) keep.contacts = keep.contacts.concat([oc]);
    const plan = PlaySim.prototype.carryPlan.call(this, st, keep, q, reason); if (!plan || !plan.contacts.includes(oc)) return null; const cont = this.contOf(plan);
    if (!cont.ok || (this.L.support && (this.swingCont(plan, this.plan) > 0.5 || this.footReach(plan, this.plan) > 8))) return null; plan.reason = reason + " (touch kept)"; return { plan, cont }; }
  // ── THE POSSESSION-PRESERVING FALLBACK: SECURE — to the ball along its own path, the touch in the wide reach sending it on toward the intent ─────
  fallback() { const t = this.t, st = this.stateAt(t, this.plan), keep = this.committed(this.plan, t), q = this.req, out = []; let rec = null;
    const ch = this.chasePlan(st, keep, q); if (ch) out.push({ plan: this.finishCarry(ch.plan, ch.touches, keep, q), label: "SECURE (to the ball)" });
    // (the pursuit planned through the body's real movement: for each meeting time, run toward where the ball will be then — integrated by C, its
    // envelope and all — and keep the earliest whose plan ends in a touch; 88573ef0's pursuit assumes a straight run at speed)
    { const b = this.ball.p, bv = this.ball.v, aid = this.plan.action.kind === "CARRY" ? this.plan.action.id : ++this.aid;
      // (the earliest meeting time whose plan is a controlled continuation; failing that, the first that touches the ball at all is kept as the
      // RECOVERY — a real touch on the real ball, later than a controlled one, never "no contact": the player always goes to the ball)
      for (let T = 0.2; T <= 1.6 + 1e-9; T += 0.1) { const f = predict(b, bv, T), u = q.h != null ? [Math.cos(q.h), Math.sin(q.h)] : f.speed > 0.3 ? [f.v[0] / f.speed, f.v[1] / f.speed] : [Math.cos(st.psi), Math.sin(st.psi)];
        const tgt = [f.p[0] - u[0] * 0.30, f.p[1] - u[1] * 0.30], d = [tgt[0] - st.P[0], tgt[1] - st.P[1]], D = hyp(d[0], d[1]), sp = clamp(D / T * 1.1, 1.0, this.P.speed.SPRINT), h = D > 0.05 ? Math.atan2(d[1], d[0]) : st.psi;
        const pl = this.mkPlan({ t0: t, st, stances: null, contacts: [], action: { kind: "CARRY", label: "CARRY", id: aid, chase: true }, req: q, prog: { kind: "chase", speed: sp, h, until: t + T + 0.1 }, chKeys: this.carryChannels(st, q, t) });
        pl.stances = this.gaitFrom(pl, keep, [], t + 1.5); const tc = this.carryTouches(pl, keep, q, true); if (!(tc.ok && tc.list.length)) continue;
        const o = { plan: this.finishCarry(pl, tc, keep, q), label: `SECURE (pursuit ${T.toFixed(1)} s)` }; o.cont = this.contOf(o.plan); if (o.cont.ok) { out.push(o); break; } if (!rec) rec = o; }
      // (S99 MISSION, the 99 pace: THE TURN-BACK PURSUIT — a body faster than the ball overruns it: every pursuit above heads forward from where the
      // body is now, but it cannot stop short of the ball (≈ 1.6 m from 9 m/s), so the ball ends behind it and nothing touches it. Here the run is
      // aimed from the body's braking point to the ball's line behind it — the movement turns the body round for it, at Agility's limits)
      if (this.P.pace && this.P.pace.accGait && st.s > 3.0 && !out.some((o) => (o.cont = o.cont || this.contOf(o.plan)).ok)) { const u0 = [Math.cos(st.h), Math.sin(st.h)], stop = st.s * st.s / (2 * 20), tS = st.s / 20, S0 = [st.P[0] + u0[0] * stop, st.P[1] + u0[1] * stop];
        for (let T = 0.3; T <= 1.8 + 1e-9; T += 0.15) { const f = predict(b, bv, T), ub = f.speed > 0.3 ? [f.v[0] / f.speed, f.v[1] / f.speed] : u0, tgt = [f.p[0] - ub[0] * 0.30, f.p[1] - ub[1] * 0.30], d = [tgt[0] - S0[0], tgt[1] - S0[1]], D = hyp(d[0], d[1]);
          const sp = clamp(D / max(0.15, T - tS) * 1.15, 1.0, this.P.speed.SPRINT), h = D > 0.05 ? Math.atan2(d[1], d[0]) : st.psi;
          const pl = this.mkPlan({ t0: t, st, stances: null, contacts: [], action: { kind: "CARRY", label: "CARRY", id: aid, chase: true }, req: q, prog: { kind: "chase", speed: sp, h, until: t + T + 0.1 }, chKeys: this.carryChannels(st, q, t) });
          pl.stances = this.gaitFrom(pl, keep, [], t + 1.5); const tc = this.carryTouches(pl, keep, q, true); if (!(tc.ok && tc.list.length)) continue;
          const o = { plan: this.finishCarry(pl, tc, keep, q), label: `SECURE (turn back ${T.toFixed(2)} s)` }; o.cont = this.contOf(o.plan); if (o.cont.ok) { out.push(o); break; } if (!rec) rec = o; } } }
    { const base = this.mkPlan({ t0: t, st, stances: null, contacts: [], action: { kind: "CARRY", label: "CARRY", id: this.plan.action.kind === "CARRY" ? this.plan.action.id : ++this.aid }, req: q, prog: { kind: "carry" }, chKeys: this.carryChannels(st, q, t) });
      base.stances = this.gaitFrom(base, keep, [], t + 1.5); const tc = this.carryTouches(base, keep, q, true); if (tc.ok && tc.list.length) out.push({ plan: this.finishCarry(base, tc, keep, q), label: "SECURE (wide touch)" }); }
    for (const o of out) { o.cont = o.cont || this.contOf(o.plan); if (o.cont.ok) { o.plan.reason = "fallback"; o.plan.why = [{ label: o.label, id: "SECURE", J: 0, note: o.cont.why }]; return o; } }
    if (rec && this.reachOf(rec.plan)) { rec.label = rec.label.replace("SECURE (pursuit", "SECURE · RECOVERY (pursuit"); rec.plan.reason = "fallback"; rec.plan.action.recover = true; rec.plan.why = [{ label: rec.label, id: "SECURE", J: 0, note: "recovery: " + rec.cont.why }]; return rec; }
    return null; }
  // (the plan's next contact exists and the free ball is within the contact's reach of the body then — the kernel contact's own miss rule)
  reachOf(plan) { const c = this.firstContact(plan); if (!c) return false; const f = predict(this.ball.p, this.ball.v, c.t - this.t), s = this.stateAt(c.t, plan); return hyp(f.p[0] - s.P[0], f.p[1] - s.P[1]) <= POSS.reach; }
  finishCarry(plan, touches, keep, q) { plan.contacts = keep.contacts.concat(touches.list.filter((c) => !keep.contacts.some((k) => abs(k.t - c.t) < 0.03 && k.F === c.F))); plan.nContacts = touches.list.length;
    plan.tLine = this.lineTime(plan, q); plan.sepMax = touches.sepMax; plan.sepPen = touches.sepPen; plan.action.carry = touches.info; plan.action.secure = true; return plan; }
  // ── TIGHTER UNDER VOLATILE INPUT: the carry touch's push no longer than the body can follow at its present speed while the stick is busy ───────
  // ── THE CONTROLLED CARRY TOUCH: the ball sent to roll WITH the body — toward where the body will be at that foot's next swing end (its plan's
  // path, blended with its present motion by the stick's activity: a busy stick, a body that may not follow the plan), at no more than the body's
  // own speed then + a little (less, the busier the stick). 88573ef0's touch aims the ball to ARRIVE at a point at a time — it rolls on past it;
  // a slow or turning body then never catches it up. A steady stick at speed keeps 88573ef0's longer push (V = 0 and the body ≥ 3 m/s: unchanged)
  carryTouches(plan, keep, q, recover = false, skip = null) { const out = super.carryTouches(plan, keep, q, recover, skip); if (!this.CB || !out.list.length) return out;
    this.controlledTouch(out, plan, keep, q); if (q.h != null && this.stateAt(this.t, this.plan).s > this.P.speed[q.mode] + 1.0) this.noOverrun(out.list[0], plan); return out; }
  // (NO OVERRUN — the body faster than the request wants, braking (after a pursuit, a sprint released): a touch never sends the ball more than
  // 1 m/s slower than the body will still be moving at that foot's next swing end — slowing
  // the ball faster than the body can brake leaves it behind a body that runs past it; a stop keeps 88573ef0's own stop touch)
  noOverrun(c, plan) { if (!c || !c.aim || !c.bPred || c.aim.kind === "rest" || c.done) return; const nx = plan.stances[c.F].find((s) => s.t0 - CARRY.touchBefore > c.t + 0.15), T = nx ? nx.t0 - CARRY.touchBefore : c.t + 0.4, vb = this.stateAt(T, plan).s;
    let sp, h; if (c.aim.kind === "target") { const d = [c.aim.P[0] - c.bPred[0], c.aim.P[1] - c.bPred[1]], D = hyp(d[0], d[1]); sp = D > 1e-3 ? speedFor(D, max(0.05, c.aim.T - c.t)) ?? CARRY.vCap : 0; h = D > 1e-3 ? Math.atan2(d[1], d[0]) : null; } else { sp = c.aim.speed; h = c.aim.h; }
    if (h == null || sp >= vb - 1.0) return; c.aim = { kind: "vel", speed: min(CARRY.vCap, vb - 0.5), h, noOverrun: true }; }
  controlledTouch(out, plan, keep, q) {
    const c = out.list[0]; if (!c.aim || !c.bPred) return out;   // (a kept touch too: 88573ef0 re-aims it for the new path — the same rule then)
    const V = this.volatility(), now = this.stateAt(this.t, this.plan), slow = POSS.slowTight ? clamp((3.0 - now.s) / 2.0, 0, 1) : 0, W = max(V, slow); if (W <= 0) return out;
    // (a velocity aim — 88573ef0's redirect capped at its angle: the same speed rule, its direction kept)
    if (c.aim.kind === "vel") { if (q.h == null) return out; const nx = plan.stances[c.F].find((s) => s.t0 - CARRY.touchBefore > c.t + 0.15), T = nx ? nx.t0 - CARRY.touchBefore : c.t + 0.4, sp0 = this.stateAt(min(T, c.t + 0.3), plan), vb = [sp0.V[0] + (now.V[0] - sp0.V[0]) * V, sp0.V[1] + (now.V[1] - sp0.V[1]) * V], cap = max(0.4, hyp(vb[0], vb[1])) + 0.4 + 1.2 * (1 - W);
      if (c.aim.speed > cap) c.aim = Object.assign({}, c.aim, { speed: cap, controlled: +W.toFixed(2) }); return out; }
    if (c.aim.kind !== "target") return out;
    // (the LANE FOOT as 88573ef0's carry: the ball goes to the preferred foot's lane and that foot's next swing — a touch across by the other foot
    // returns the ball to the lane, never into the other foot's side, so the touches do not alternate feet across the body)
    const LF = this.o.foot === "B" || !this.o.foot ? c.F : this.o.foot;
    let T = c.aim.T; const B = c.bPred, nx = plan.stances[LF].find((s) => s.t0 - CARRY.touchBefore > c.t + 0.15); if (W > 0.4 && nx && nx.t0 - CARRY.touchBefore < T - 0.05) T = nx.t0 - CARRY.touchBefore;
    // (the body's velocity the ball must roll with: over the coming 0.3 s — not at a far rhythm touch, by which a braking body has already slowed)
    const sp0 = this.stateAt(T, plan), sp3 = this.stateAt(min(T, c.t + 0.3), plan), inert = [now.P[0] + now.V[0] * (T - this.t), now.P[1] + now.V[1] * (T - this.t)], bodyP = [sp0.P[0] + (inert[0] - sp0.P[0]) * V, sp0.P[1] + (inert[1] - sp0.P[1]) * V];
    const vb = [sp3.V[0] + (now.V[0] - sp3.V[0]) * V, sp3.V[1] + (now.V[1] - sp3.V[1]) * V], vs = hyp(vb[0], vb[1]), hB = vs > 0.5 ? Math.atan2(vb[1], vb[0]) : q.h != null ? q.h : now.psi, lane = (LF === "R" ? 1 : -1) * CARRY.lane(q.mode || "RUN");
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
    const LF = this.o.foot === "B" || !this.o.foot ? c.F : this.o.foot, T = this.t + 0.35, lane = (LF === "R" ? 1 : -1) * CARRY.lane(q.mode), P = [now.P[0] + now.V[0] * 0.35 + Math.cos(q.h) * CARRY.ahead(now.s) - Math.sin(q.h) * lane, now.P[1] + now.V[1] * 0.35 + Math.sin(q.h) * CARRY.ahead(now.s) + Math.cos(q.h) * lane];
    // (the same rule as the controlled carry touch: no faster than the body then + a little, less the busier the stick)
    const d = [P[0] - b[0], P[1] - b[1]], D = hyp(d[0], d[1]), W = max(this.volatility(), POSS.slowTight ? clamp((3.0 - now.s) / 2.0, 0, 1) : 0); let sp = D < 1e-3 ? 0 : speedFor(D, 0.35); if (sp == null) sp = CARRY.vCap;
    sp = min(sp, max(0.4, now.s) + 0.4 + 1.2 * (1 - W), CARRY.vCap); c.aim = { kind: "vel", speed: sp, h: D > 1e-3 ? Math.atan2(d[1], d[0]) : q.h, reaim: "new line" }; }
  // ── the possession monitor (both models: in FREE it only observes, with the same rules) ────────────────────────────────────────────────────
  possStep() { const P = this.poss, t = this.t, st = this.stateAt(t), b = this.ball.p, bv = this.ball.v, sep = hyp(b[0] - st.P[0], b[1] - st.P[1]), plan = this.plan;
    P.sep = sep; P.threat = sep / this.envOf(st.s); let missed = null, release = null;
    while (P.nC < this.contacts.length) { const c = this.contacts[P.nC++]; if (c.missed) missed = c; else if (c.release) release = c; }
    if (P.state !== "CONTROLLED") return;
    if (release) return this.exitControl("INTENTIONAL_RELEASE", "the release touch");
    const future = plan.contacts.some((c) => !c.done && c.t > t - 1e-9) || (!plan.contacts.some((c) => !c.done) && this.contOf(plan).ok), atRest = hyp(bv[0], bv[1]) < POSS.restSpeed && sep < 0.8;   // (a ball coming to rest at the feet is a continuation)
    P.noPlan = !future && !atRest ? P.noPlan + DT : 0;
    // (BALL-ON PACE V1, with the envelope: no contact planned → the decision searches again every 0.05 s (its fallback: the pursuits, the turn-back,
    // the recovery) as the geometry changes, not only at the next footfall / request / 0.3 s refresh — the recovery a few ticks later existed)
    if (this.P.ballEnv && P.noPlan > 0 && Math.round(P.noPlan / DT) % 12 === 0) this.flags.replan = this.flags.replan || "recover";
    const why = missed ? "a planned contact missed the ball" : P.noPlan > POSS.noPlanMax ? "no contact planned" : sep > POSS.farMax ? "the ball 3 m away" : null; if (!why) return;
    const ext = P.ext && t - P.ext.t < POSS.extWindow ? P.ext : null; this.exitControl(ext ? EXT_EXIT[ext.kind] || "EXTERNAL_COLLISION" : "CONTROLLER_FAILURE", why + (ext ? ` (after the opponent's ${ext.kind} at ${ext.t.toFixed(2)} s)` : "")); }
  enterControl(how) { const P = this.poss; P.log.push({ t: +this.t.toFixed(4), from: P.state, to: "CONTROLLED", why: "COLLECTED", detail: how }); P.state = "CONTROLLED"; P.since = this.t; P.why = "secured by " + how; P.noPlan = 0; }
  exitControl(cls, detail) { const P = this.poss, st = this.stateAt(this.t), a = this.plan.action;
    P.log.push({ t: +this.t.toFixed(4), from: "CONTROLLED", to: "FREE", why: cls, detail, action: a.label, speed: +st.s.toFixed(2), sep: +P.sep.toFixed(2), reqH: this.req.h }); P.exits[cls] = (P.exits[cls] || 0) + 1;
    P.state = "FREE"; P.since = this.t; P.why = cls + ": " + detail; }
  // ── INTENTIONAL RELEASE (a test hook — this sandbox has no pass / shot system): the next planned touch becomes a knock-on into space ──────────
  // (the release is an INTENT held until the player's next touch — re-plans replace contacts, the intent survives them — which becomes the
  // knock-on into space along the request (else the travel))
  release() { this.releasePending = true; return true; }
  execute(c) { if (this.releasePending && (c.src === "carry" || c.src === "generic")) { c.aim = { kind: "vel", speed: 14, h: this.req.h != null ? this.req.h : this.stateAt(this.t).h }; c.release = true; c.role = "release (knock-on)"; this.releasePending = false; }
    else if (this.CB && c.src === "carry" && !c.release) this.reaim(c); const n = this.contacts.length; super.execute(c); if (this.contacts.length > n) { const r = this.contacts[this.contacts.length - 1]; if (c.release) r.release = true; if (!r.missed && c.aim && (c.aim.controlled != null || c.aim.reaim || c.aim.noOverrun)) r.soft = true; } }   // (soft: a touch CONTROLLED_BALL shaped — the pose's follow-through reads it)
  // ── page / test events (recorded in the input log's events — replay and re-simulation apply them at the same tick) ──────────────────────────
  addOpponent(probe) { this.opp.push(Object.assign({ r: 0.07, z: 0.10, e: 0.55, kind: "poke" }, probe, { hit: false })); this.log.events.push({ k: this.k, kind: "opponent", v: probe }); }
  requestRelease() { const ok = this.release(); this.log.events.push({ k: this.k, kind: "release" }); return ok; }
  applyEvent(e) { if (e.kind === "opponent") this.addOpponent(e.v); else if (e.kind === "release") this.requestRelease(); }
  // (an opponent's poke aimed at the ball as it will be in 0.12 s, from the given side of the ball's travel, at the given foot speed — a 10 cm
  // foot: a lunging boot)
  pokeProbe(side = 1, speed = 8) { const b = this.ball.p, bv = this.ball.v, f = predict(b, bv, 0.12), st = this.stateAt(this.t), h = hyp(bv[0], bv[1]) > 0.5 ? Math.atan2(bv[1], bv[0]) : st.psi, a = h + side * Math.PI / 2 + Math.PI, u = [Math.cos(a + Math.PI), Math.sin(a + Math.PI)];
    return { id: "poke@" + this.k, kind: "poke", t0: this.t, t1: this.t + 0.4, p0: [f.p[0] - u[0] * (speed * 0.12 + BR + 0.10), f.p[1] - u[1] * (speed * 0.12 + BR + 0.10)], v: [u[0] * speed, u[1] * speed], r: 0.10, z: 0.1, e: 0.55, track: true }; }
  // ── the HUD's view (diagnostics only, never read by the simulation) ────────────────────────────────────────────────────────────────────────
  possInfo() { const P = this.poss, t = this.t, plan = this.plan, c = this.firstContact(plan), st = this.stateAt(t, plan); let sup = null;
    for (const X of ["R", "L"]) if (plan.stances[X].some((s) => s.t0 <= t + 1e-9 && s.t1 > t)) sup = sup ? "both" : X;
    const a = plan.action, committed = !!(c && (c.t - t < this.P.react + 1e-9 || (a.tech && t >= a.tCommit - 1e-9 && t < a.tRelease)));
    const bs = hyp(this.ball.v[0], this.ball.v[1]), phase = a.tech ? this.phaseOf(a) : c && c.sc ? `SPRINT CARRY · pushed ahead to the next push (${(c.t - t).toFixed(2)} s)` : c ? `ball rolling to the ${c.role} (${(c.t - t).toFixed(2)} s)` : P.sep < 0.8 && bs < POSS.restSpeed ? "ball at the feet" : `ball loose (${P.sep.toFixed(1)} m, ${bs.toFixed(1)} m/s, no touch planned)`;   // (HUD only)
    return { model: this.CB ? "CONTROLLED" : "FREE", state: P.state, since: +(t - P.since).toFixed(2), action: a.label + (a.secure ? " · SECURE" : ""), phase, next: c ? `${c.role} · ${c.F} · ${c.surface} in ${(c.t - t).toFixed(2)} s` : "—", support: sup || "none (flight)",
      technical: c ? c.F : "—", committed, threat: +P.threat.toFixed(2), fallback: P.fallback, cont: P.cont ? P.cont.why : "—", lastExit: P.log.filter((e) => e.to === "FREE").slice(-1)[0] || null, volatility: +this.volatility().toFixed(2), speed: +st.s.toFixed(2) }; }
}
