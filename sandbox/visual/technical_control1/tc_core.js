// ═══ technical_control1/tc_core.js — TECHNICAL-CONTROL-1: ONE technical-control layer from the receive through the dribble ═══════════════════════
// Owner (19 Oct): "the player should not suddenly kick the ball away merely because RECEIVE ended and DRIBBLE-V1 began"; the movement intent is the
// input, the footballer chooses the footwork; Ball Control = contact precision, Dribbling = the technical foot actions, Agility = the body.
//
// ARCHITECTURE. RECEIVE-ELITE-1's sequence (approved direction) owns the receive; the SAME episode then keeps the ball — there is no exit touch and
// no RECEIVE → DRIBBLE boundary: after the turn the technical controller carries the ball along the intent (close touches or stride touches as the
// speed, the space and the style call for), and turns, stops and reverses with a small vocabulary of technical actions (tc_actions.js). The frozen
// DRIBBLE-V1 is not reopened: its takeover contract (the ball 1.0 – 2.2 m ahead on the runner's line, not running away, TURN-1.2 settled) is only
// met naturally by a stride carry in open space, so the optional BRIDGE hands it the ball there and nowhere else (bridge: "sprint").
//   · BODY — tc_motion.js (Agility's kinematic programs, re-planned at each decision from the state at that tick)
//   · FEET — the gait: alternating steps from the speed (the running cadence) or Agility's support-step period while turning; a technical contact
//     is made at the END of a swing (touchU) by the swinging foot, which lands just after it beside the ball — contact timing emerges from the gait
//   · BALL — every contact sends the ball to where the NEXT contact will be (the next foot's point on the authored path n steps later: one step =
//     close control, several = a stride carry; the ball's own rolling law sets how far it runs ahead); Ball Control executes each contact
//     (RECEIVE-TURN-1's execution, the keyed draws: seed | RECEIVE | receiver | R<event> | c<contact> | …); one kernel schedule() per contact
//   · CLOSED LOOP — after each launch the next contact is played where the ball really is (RECEIVE-ELITE-1's reach / correction / recovery) — and a
//     ball beyond that is never "released into space": the run is re-planned toward it (a recovery, however long it takes)
import { EliteEpisode, ReceiveSimE, RE, stationaryPath, movingPath } from "../receive_elite1/re1_core.js";
import { ReceiveSim2 } from "../receive_control2/rc2_core.js";
import { RX, DT } from "../receive_moving1/rm1_core.js";
import { HANDOFF_AHEAD, SURF as SURF11, wrapA, clamp, s5, tab, hdg, sideOf, other } from "../receive11/rx_actions.js";
import { TDIFF } from "../receive_turn1/rt_actions.js";
import { RK, surf, incoming, difficulty } from "../receive_turn1/rk_model.js";
import { DEG, dir } from "../receive_turn1/rt_actions.js";
import { Frame, predictK, rollK } from "../receive_control2/rc2_episode.js";
import { MotionPlan, entrySpeed } from "./tc_motion.js";
import { VOCAB, FAMILY_ORDER, ROLE_AT, SEL, footFor, bodyFor } from "./tc_actions.js";
import { techParams, styleOf, ATTR, STYLES } from "./tc_attrs.js";
import { dsin, dcos } from "../physchar2/core/v2_math.js";
export { DT, RX, ATTR, STYLES };
const R = 0.11, hyp = Math.hypot, abs = Math.abs, max = Math.max, min = Math.min, r2 = (x) => Math.round(x * 100) / 100, r3 = (x) => Math.round(x * 1000) / 1000, lerp = (a, b, t) => a + (b - a) * t;
export const TC = {
  version: "TECHNICAL-CONTROL-1",
  touchU: 0.82, landAfter: 0.075, soleDv: 3.2,                     // a technical contact at this share of its swing; the foot lands this long after it
  // the GAIT: the step period Ts (one foot's landing to the other's) and the duty factor (the share of a stride a foot is on the ground — walking
  // > 0.5 with double support, running < 0.5 with a flight between steps; human running data: ~0.38 at 3 m/s, ~0.30 at 5.5, ~0.23 at 8)
  gait: { Ts: [[0, 0.40], [3, 0.33], [5.5, 0.29], [7.8, 0.255], [9.5, 0.24]], duty: [[0, 0.62], [1.5, 0.56], [3, 0.40], [5.5, 0.31], [7.8, 0.24], [9.5, 0.22]], dutyTurn: 0.46, minStance: 0.07, stanceLen: 0.78 }, // stanceLen: the ground a stance covers at most — the leg's reach, landing ≤ 0.27 m ahead → toe-off ≈ 0.5 m behind
  ahead: [0.30, 0.03, 0.46], lat: 0.10,                // the next contact point (as RECEIVE-ELITE-1): ahead of the body, on the touching foot's side
  // the CARRY rhythm: steps between two touches — close control touches every step (alternating feet) or every other step (one foot); a stride
  // carry every 3 – 4 steps in open space at speed; the style's rhythm and directness choose inside what Dribbling's cadence allows
  rhythm: { close: [[0, 1], [6.5, 1], [7.0, 2]], stride: [[0, 2], [3, 2], [4.5, 3], [7, 4]] },
  replanDeg: 10, replanV: 0.6, turnMin: 28,            // the intent moved: re-plan the run (a bend) — beyond turnMin a technical action
  horizon: 3.0,
  recover: { window: 1.6 },                            // a ball beyond reach: the run is re-planned toward it (never released into space)
  bridge: { vMin: 6.4, straight: 8, after: 1.0 },
  ddiff: { v: 0.05, dv: 0.04 },                       // the dribble touch's difficulty: + 0.05 per m/s of running speed, + 0.04 per m/s of impulse
  idealCap: [4.5, 3.5],                                // m/s: a technical / carry touch sends the ball at most max(4.5, the body's speed + 3.5)      // BRIDGE to DRIBBLE-V1: a straight stride carry at ≥ vMin, ≥ after s into the carry
};
const gaitTs = (v, ag, turning) => (turning ? ag.stepT : tab(TC.gait.Ts, v));
// RUN-1's own gait at running speed (≥ 3 m/s, not turning): its step period and duty factor
const gaitOf = (ep, v, turning) => { if (!turning && v >= 3.0 && ep.gaitAt) { const G = ep.gaitAt(v); return { Ts: G.Ts, duty: G.D }; } return { Ts: gaitTs(v, ep.el.agi, turning), duty: turning ? max(TC.gait.dutyTurn, tab(TC.gait.duty, v)) : tab(TC.gait.duty, v) }; };
// ═══ THE EPISODE ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// o: EliteEpisode's options (receive) or { mode: "dribble", start: { P, V, psi } } + { intent(t) → { theta, v, contest }, style, bridge }
export class TechEpisode extends EliteEpisode {
  constructor(o) {
    super(o); this.style = styleOf(o.style); this.intent = o.intent; this.plans = []; this.gen = 0; this.actions = []; this.carryFrom = null; this.lastDecision = null; this.bridgeMode = o.bridge || "off";
    this.pref = o.pref === undefined ? "R" : o.pref; this.techLog = [];        // null: two-footed (no foot bias)
    if (o.mode === "dribble") { this.carryFrom = 0; this.splice(0, Object.assign({ kind: "RUN" }, this.wantNow(0))); }
  }
  // ── the authored body: RECEIVE-ELITE-1's receive path until the first splice, then the motion plans (each from its splice tick) ──────────────
  planAt(t) { if (!this.plans) return null; for (let i = this.plans.length - 1; i >= 0; i--) if (t >= this.plans[i].tFrom - 1e-9) return this.plans[i]; return null; }
  baseAt(t) { const pl = this.planAt(t); return pl ? pl.m.at(t).P : this.path.base(t); }
  rootAt(t) { const pl = this.planAt(t), g = pl ? pl.gen : 0; let p = this.baseAt(t); for (const c of this.corr) if ((c.gen || 0) === g && t > c.t0) { const w = s5((t - c.t0) / max(1e-6, c.t1 - c.t0)); p = [p[0] + c.d[0] * w, p[1] + c.d[1] * w]; } return p; }
  psiAt(t) { const pl = this.planAt(t); return pl ? pl.m.at(t).psi : this.path.psi(t); }
  speedBase(t) { const a = this.baseAt(t), b = this.baseAt(t + DT); return hyp(b[0] - a[0], b[1] - a[1]) / DT; }
  wantNow(t) { const I = this.intent ? this.intent(t) : null; return I || { theta: this.path ? this.path.th : 0, v: this.vX || 5.5, contest: 0 }; }
  // re-plan the body from time t with a program (continuity: the state at t, corrections included), regenerate the gait after t
  splice(t, prog) {
    const P = this.rootAt(t), V = this.velAt(t), psi = this.psiAt(t), w = wrapA(this.psiAt(t + DT) - psi) / DT, m = new MotionPlan({ t, P, V, psi, w }, this.el.agi, TC.horizon).build(prog);
    this.gen++; this.plans.push({ tFrom: t, m, gen: this.gen, prog }); this.rebuildSwings(t); this.ver++; return m;
  }
  // ── THE GAIT after time t: steps in progress keep their timing; new steps alternate feet at the running cadence (or Agility's support-step period
  // while the body turns or brakes), the next foot lifting as the other lands (a flight at running speed) ───────────────────────────────────────
  rebuildSwings(t) {
    const forced = (this.forced || []).filter((f) => f.tc > t + 0.02).slice().sort((x, y) => x.tc - y.tc), keep = this.swings.filter((q) => q.t0 < t - 1e-9), out = keep.slice(); let lastL = null, lastR = null, fi = 0;
    for (const q of keep) { if (q.F === "L") lastL = q; else lastR = q; }
    let side = (lastL && lastR) ? (lastL.t1 > lastR.t1 ? "R" : "L") : other((lastL || lastR || { F: this.tech.F0 }).F), tPrev = max(t, (lastL || lastR) ? max(lastL ? lastL.t1 : -9, lastR ? lastR.t1 : -9) : t), n = 0;
    while (tPrev < t + TC.horizon && n < 30) {
      const v = this.speedBase(tPrev + 0.05), turning = abs(wrapA(this.psiAt(tPrev + 0.1) - hdg(this.velAt(tPrev + 0.1)))) > 20 * DEG && v > 0.8 || this.braking(tPrev), gg = gaitOf(this, v, turning), Ts = gg.Ts, duty = gg.duty;
      const own = side === "L" ? lastL : lastR, tMin0 = own ? own.t1 + TC.gait.minStance : -9; let t1 = tPrev + Ts, t0 = max(tMin0, t1 - (1 - duty) * 2 * Ts), tc = null;
      // PROCEDURAL STRIDE ADJUSTMENT: a technical contact the action needs at a given time with a given foot — this swing ends at it (shortened or
      // lengthened), or, when the other foot is due, this one is cut short (a stutter step) so that the foot that must play the ball is free
      const f = forced[fi];
      if (f) { const land = f.tc + TC.landAfter;
        // (a swing moved earlier keeps its natural duration — it lifts earlier, the stance before it is shorter — never a crammed swing)
        if (side === f.F && land <= t1 + 0.5 * Ts) { const dur = t1 - t0; t1 = max(land, tMin0 + 0.16); t0 = max(tMin0, t1 - max(dur, 0.16)); tc = f.tc; fi++; }
        else if (side !== f.F && t1 > f.tc - 0.10) { const dur = t1 - t0; t1 = max(tMin0 + 0.16, f.tc - 0.13); t0 = max(tMin0, t1 - max(0.16, dur * 0.8)); } }
      // a stance never outlasts the ground the body covers over the foot: the foot lifts when the body has passed it (the swing is longer, never a
      // foot left behind)
      if (own) { const vSt = max(0.5, this.speedBase(own.t1 + 0.08)); t0 = max(t, min(t0, own.t1 + max(TC.gait.minStance, TC.gait.stanceLen / vSt))); }
      const sw = { F: side, t0, t1 }; if (tc != null) sw.tc = tc; out.push(sw); if (side === "L") lastL = sw; else lastR = sw; tPrev = t1; side = other(side); n++; }
    this.swings = out.sort((x, y) => x.t1 - y.t1);
  }
  braking(t) { const v0 = this.speedBase(t), v1 = this.speedBase(t + 0.1); return v1 < v0 - 0.25; }
  // the contact time inside a swing (the end of it: the foot plays the ball and lands)
  contactTimeOf(s) { return s.tc != null ? s.tc : max(s.t0 + 0.55 * (s.t1 - s.t0), s.t1 - TC.landAfter); }
  // ── THE NEXT CONTACT of the carry: the rhythm (steps between touches) the style wants, inside Dribbling's cadence; the preferred foot when the
  // style leans on it and the timing allows ───────────────────────────────────────────────────────────────────────────────────────────────────
  carryNext(c, ac) {
    const t = c.t, v = this.speedBase(t), st = this.style, I = this.wantNow(t), open = (I.contest || 0) < 0.3 && abs(wrapA(I.theta - hdg(this.velAt(t)))) < 12 * DEG && this.carryFrom != null && t - this.carryFrom > 0.4;
    const nClose = tab(TC.rhythm.close, v), nStride = tab(TC.rhythm.stride, v), r = clamp(st.rhythm - (open ? 0.35 * st.direct : -0.25), 0, 1), want = Math.round(lerp(nStride, nClose, r));
    const sw = this.swings.filter((s) => !s.first && this.contactTimeOf(s) > t + 0.02 && (!ac || this.contactTimeOf(s) < ac.contacts[0].tc - 0.1)); let best = null;
    for (let j = 0; j < min(sw.length, 6); j++) { const s = sw[j], tt = this.contactTimeOf(s), gap = s.F === c.F ? this.el.dri.sameFoot : this.el.dri.cadence; if (tt - t < gap - 1e-9) continue;
      const nSteps = j + 1, foot = this.pref && s.F !== this.pref ? st.foot * 1.2 : 0, cost = (ac ? nSteps : abs(nSteps - want)) * 0.8 + foot + (s.F === c.F && want === 1 ? 0.3 : 0);
      if (!best || cost < best.cost) best = { s, j, t: tt, cost, nSteps }; }
    return best;
  }
  // the next contact point for foot F at time t (role: the contact's kind)
  contactPoint(t, F, role) { const P = this.rootAt(t), V = this.velAt(t), v = hyp(V[0], V[1]), psi = this.psiAt(t), a = this.el.dri.spacing * min(TC.ahead[2], TC.ahead[0] + TC.ahead[1] * v), l = sideOf(F) * TC.lat;
    return [P[0] + a * dcos(psi) - l * dsin(psi), P[1] + a * dsin(psi) + l * dcos(psi)]; }
  // ── the receive is RECEIVE-ELITE-1's until the body is out on its exit; then the carry (no exit touch: the bridge only for a straight stride carry)
  isExit(c) {
    if (this.bridgeMode !== "sprint" || this.carryFrom == null || c.t - this.carryFrom < TC.bridge.after) return false;
    const V = this.velAt(c.t), v = hyp(V[0], V[1]), I = this.wantNow(c.t); return v >= TC.bridge.vMin && abs(wrapA(I.theta - hdg(V))) < TC.bridge.straight * DEG && (I.contest || 0) < 0.3;
  }
  inCarry(c) { if (this.carryFrom != null) return true; if (c.i === 0 && this.tech.firstExit) return true;
    const t = c.t, psi = this.psiAt(t), V = this.velAt(t), v = hyp(V[0], V[1]), th = this.path.th; return abs(wrapA(psi - th)) <= RE.exitTol * DEG && v >= 1.2 && abs(wrapA(hdg(V) - th)) <= RE.velTol * DEG; }
  plan(c, B, vB, commit) {
    if (c.i === 0 && this.tech.dir0 != null && !this.tech.firstExit) return super.plan(c, B, vB, commit);      // the receive's first touch: RECEIVE-ELITE-1's
    if (!this.inCarry(c) || this.isExit(c)) return super.plan(c, B, vB, commit);                                // the receive turn (and the bridge's exit)
    // THE TECHNICAL CONTROL: from the first contact played out on the exit — the intent decides (a bend, or a technical action), then the next
    // contact: the action's next contact, else the carry's
    if (commit) this.decide(c);
    let nx = null; const ac = this.act;
    // an action's next contact — unless a carry touch fits before its first one (a less agile body needs the extra steps; the ball stays close)
    if (ac) { const q = ac.contacts.find((x) => x.tc > c.t + 0.02); if (q) { const before = ac.contacts.indexOf(q) === 0 ? this.carryNext(c, ac) : null;
      if (!before) { const k = this.kc0 + Math.round(q.tc / DT); nx = { i: c.i + 1, t: (k - this.kc0) * DT, k, F: q.F, role: q.role, allowed: q.surfaces, act: ac.fam, actIdx: ac.contacts.indexOf(q) }; } } }
    if (!nx) { const f = this.carryNext(c, ac && ac.contacts[0].tc > c.t + 0.02 ? ac : null); if (!f) return null; nx = { i: c.i + 1, t: f.t, k: this.kc0 + Math.round(f.t / DT), F: f.s.F, swing: f.s, role: "carry", nSteps: f.nSteps, allowed: ["INSIDE", "OUTSIDE", "LACES"] }; nx.t = (nx.k - this.kc0) * DT; }
    nx.Q = this.rolePoint(nx.t, nx.F, nx.role);
    const ideal = this.towardIdeal(c, B, nx, commit), vb = hyp(...this.velAt(nx.t)), cap = max(TC.idealCap[0], vb + TC.idealCap[1]);
    if (ideal.speed > cap) { const k = cap / ideal.speed; ideal.v = [ideal.v[0] * k, ideal.v[1] * k]; ideal.speed = cap; ideal.capped = true; }   // a technical touch is never a kick: beyond it, the next contact adapts (findNext)
    return this.finishPlan(c, B, vB, { exit: false, ideal, nx, allowed: c.allowed });
  }
  nextSwingTime(c) { const s = this.swings.find((q) => !q.first && this.contactTimeOf(q) > c.t + 0.02); return s ? this.contactTimeOf(s) : Infinity; }
  // the ball's place at a contact of this role, foot F, time t (carry: RECEIVE-ELITE-1's next contact point; actions: tc_actions.js ROLE_AT)
  rolePoint(t, F, role) { const o = ROLE_AT[role]; if (!o) return this.contactPoint(t, F); const P = this.rootAt(t), psi = this.psiAt(t), l = sideOf(F) * o[1];
    return [P[0] + o[0] * dcos(psi) - l * dsin(psi), P[1] + o[0] * dsin(psi) + l * dcos(psi)]; }
  // the surface that gives this impulse and the touch's difficulty (RECEIVE-ELITE-1's plan tail, copied: the incoming ball relative to the body,
  // the rotation inside the touch window, the glance, the surface, the touch's own speed); the style weights the surfaces that fit
  finishPlan(c, B, vB, o) {
    const t = c.t, Vb = this.velAt(t), psi = this.psiAt(t), vI = o.ideal.v, vrel = [vB[0] - Vb[0], vB[1] - Vb[1], vB[2] || 0], dv = [vI[0] - vB[0], vI[1] - vB[1]], dvM = hyp(dv[0], dv[1]), alpha = wrapA(hdg(dv) - psi) / DEG;
    const fs = this.fitStyled(c.F, alpha, dvM, o.allowed || ["INSIDE", "OUTSIDE", "LACES", "SOLE"], !!(c.role && c.role !== "carry"), hyp(Vb[0], Vb[1])), st = { p: [B[0], B[1], B[2] != null ? B[2] : R], v: vrel }, inc = incoming(st), Dk = difficulty(surf("FOOT_INSIDE", c.F), st, inc, 0).D;
    // THE DRIBBLE TOUCH'S DIFFICULTY: the receive model's (the incoming ball relative to the foot — small for a ball rolling with the runner) plus
    // what makes a dribble touch hard: the running speed it is played at and the impulse the foot imparts (Ball Control's curve itself unchanged)
    const rotIn = abs(wrapA(this.psiAt(t + 0.15) - this.psiAt(t - 0.15))) / Math.PI, sOut = hyp(vI[0], vI[1]), Ddr = TC.ddiff.v * hyp(Vb[0], Vb[1]) + TC.ddiff.dv * dvM;
    const D = (Dk + Ddr) * (1 + TDIFF.rot * rotIn + TDIFF.glance * fs.glance + (TDIFF.surface[fs.surface] || 0) + TDIFF.out * sOut / RK.diff.vRef);
    return { exit: o.exit, ideal: o.ideal, nx: o.nx, fs, alpha, D, vrel };
  }
  // the boot surface for this impulse among those that fit (RECEIVE-CONTROL-1.1's ranges and glancing tolerance), the style's surface preference
  // breaking ties between surfaces that fit (never choosing one that does not)
  // (dribbling: the SOLE rolls the ball in any direction at a low impulse — a drag across, a drag back, a stop — where RECEIVE-CONTROL-1.1's
  // receiving table only lets it pull back)
  // A CARRY touch in stride: the faster the run, the more the push comes from the running foot as it is — the laces (straight) or the outside
  // (angled away) — rather than the inside with the foot turned out (the walking / close-control touch); r: 0 at ≤ 3 m/s … 1 at ≥ 7 m/s
  fitStyled(F, alphaDeg, dvM, allowed, ordered, vBody) {
    const a = sideOf(F) * alphaDeg, tol = tab(SURF11.tol, dvM), st = this.style, r = ordered || vBody == null ? 0 : clamp((vBody - 3) / 4, 0, 1); let best = null;
    const stride = (s) => (s === "INSIDE" ? 22 * r + (a > 8 ? 10 * r : 0) : s === "LACES" ? -13 * r + 0.8 * r * abs(a) : s === "OUTSIDE" ? -8 * r - (a > 8 ? 10 * r : 0) : 0);
    for (const [ix, s] of allowed.entries()) { const [lo, hi] = SURF11[s].R, x = ((a - lo) % 360 + 360) % 360, w = hi - lo, off = dvM < SURF11.gentle || x <= w || (s === "SOLE" && dvM <= TC.soleDv) ? 0 : min(x - w, 360 - x), ok = off <= tol, sp = st.surface[s.toLowerCase()] || (s === "LACES" ? (st.surface.inside + st.surface.outside) / 2 : 1);
      const cost = off + (ordered ? ix * 30 : SURF11[s].pref * 100 + stride(s)) - 25 * Math.log(max(0.2, sp)); if (!best || (ok && !best.ok) || (ok === best.ok && cost < best.cost)) best = { surface: s, off, ok, cost }; }
    return { surface: best.surface, glance: best.off, ok: best.ok };
  }
  // ── A DECISION at a carry contact: the intent at this contact → a bend of the run, or a TECHNICAL ACTION (tc_actions.js) for a turn beyond turnMin
  decide(c, tSplice) {
    const t = tSplice != null ? tSplice : c.t, I = this.wantNow(t); if (this.carryFrom == null) this.carryFrom = t; this.lastDecision = { t, theta: I.theta, v: I.v };
    if (this.act && this.act.endT > t + 1e-6) return;                       // an action in progress: its contacts are planned
    if (this.act) { this.act = null; this.forced = []; }
    const V = this.velAt(t), v = hyp(V[0], V[1]), h = v > 0.8 ? hdg(V) : this.psiAt(t), dS = wrapA(I.theta - h), d = abs(dS), pl = this.planAt(t), cur = pl && pl.prog;
    const heading = cur && cur.theta != null && abs(wrapA(cur.theta - I.theta)) < TC.replanDeg * DEG;      // the plan already takes the body there
    if (!heading && (d >= TC.turnMin * DEG || (I.v < 0.4 && v > 1.2))) { const a = this.selectAction(c, dS, I, v, t); if (a) { this.applyAction(c, a, I, t); return a; } }
    const moved = !cur || cur.kind !== "RUN" || abs(wrapA((cur.theta != null ? cur.theta : h) - I.theta)) > TC.replanDeg * DEG || abs((cur.v != null ? cur.v : v) - I.v) > TC.replanV, short = pl && pl.tFrom + TC.horizon - t < 1.6;
    if (moved || !pl || short) { this.splice(t, { kind: "RUN", theta: I.theta, v: I.v }); if (moved) this.techLog.push({ t: r3(t), ev: "run", theta: r2(I.theta / DEG), v: I.v, d: r2(d / DEG) }); }
  }
  // the feasible set: family × the next swings (the foot each would play it with, the time) — scored (tc_actions.js); the body's program for each
  selectAction(c, dS, I, v, tNow) {
    const sg = dS >= 0 ? 1 : -1, deg = abs(dS) / DEG, el = this.el, st = this.style, soph = el.dri.soph, contest = I.contest || 0, out = [], t0 = tNow != null ? tNow : c.t;
    const sw = this.swings.filter((q) => !q.first && this.contactTimeOf(q) > t0 + 0.06).slice(0, SEL.maxSwings), recent = this.techLog.filter((e) => e.ev === "action" && c.t - e.t < 1.4);
    for (const fam of FAMILY_ORDER) { const f = VOCAB[fam]; if (fam === "CARRY") continue;
      if (f.contest && contest < 0.5) continue; if (f.stop !== true && I.v < 0.4) continue; if (f.stop === true && I.v >= 0.4) continue;
      const lo = f.range[0], hi = f.range[1], outR = deg < lo ? lo - deg : deg > hi ? deg - hi : 0; if (outR > 15) continue;
      const body = bodyFor(fam, deg, v, el.agi, entrySpeed);
      for (let j = 0; j < sw.length; j++) { const s = sw[j], F1 = footFor(f.first.foot, sg) || s.F; if (s.F !== F1 && j > 0) continue;     // (the first swing may be re-footed by a stutter step)
        const tc = this.contactTimeOf(s), dtc = tc - t0, gap = F1 === c.F ? el.dri.sameFoot : el.dri.cadence; if (tc - c.t < gap - 0.02) continue;
        if (body.kind !== "RUN" && body.vEntry < v && (v - body.vEntry) / max(0.05, dtc) > el.agi.aBrake * 1.05) continue;       // the body cannot brake in time: a later swing
        let cost = SEL.wFit * outR / 10 + SEL.wTime * dtc + SEL.wSpeedLoss * (body.vEntry != null ? max(0, v - body.vEntry) / max(v, 1) : 0) + (s.F !== F1 ? 0.35 : 0);
        cost += f.soph * (SEL.wSoph * (1 - soph) + SEL.wSimple) - SEL.wTech * st.technical * soph * f.soph;
        cost += (this.pref && F1 !== this.pref ? st.foot * SEL.wFoot : 0) - SEL.wSurface * Math.log(max(0.2, st.surface[(f.first.surfaces || ["INSIDE"])[0].toLowerCase()] || 1));
        // FUNCTION: what each technical family is for (owner §14) — the drag across when the ball is on the wrong side of the stance at low speed,
        // the double touch in a tight left-right sequence, the inside cut / the outside touch as the plain answers to their angles
        if (fam === "DRAG_ACROSS") cost -= sw[0] && sw[0].F === footFor("turn", sg) && deg >= 35 && v < 4.5 ? SEL.wrongSide : 0;
        if (fam === "DOUBLE") cost -= recent.some((e) => e.sg === -sg) ? 0.7 : 0;
        if (fam === "IN_CUT" && deg >= 40 && deg <= 105) cost -= SEL.natural; if (fam === "OUT_TOUCH" && deg <= 50) cost -= SEL.natural;
        if (f.contest) cost -= SEL.wFeint * st.feint * soph; else cost += SEL.wContest * contest;
        if (f.second) { const F2 = other(F1); cost += (this.pref && F2 !== this.pref ? st.foot * SEL.wFoot * 0.6 : 0); }
        out.push({ fam, j, s, F1, tc, body, cost }); } }
    out.sort((x, y) => x.cost - y.cost); const a = out[0] || null; if (a) a.cands = out.slice(0, 6).map((x) => [x.fam, x.j, x.F1, r2(x.cost)]); return a;
  }
  applyAction(c, a, I, tNow) {
    const t0 = tNow != null ? tNow : c.t, f = VOCAB[a.fam], el = this.el, sg = wrapA(I.theta - (hyp(...this.velAt(t0)) > 0.8 ? hdg(this.velAt(t0)) : this.psiAt(t0))) >= 0 ? 1 : -1, deg = abs(wrapA(I.theta - hdg(this.velAt(t0)))) / DEG, contacts = [{ F: a.F1, tc: a.tc, role: f.first.role, surfaces: f.first.surfaces || ["INSIDE", "OUTSIDE", "LACES"], j: a.j }];
    if (f.second) { const Trot = el.agi.pivotBase + deg / el.agi.pivotOmega, gap = f.second.gap === "cluster" ? el.dri.cluster : max(el.dri.cluster, 0.7 * Trot); contacts.push({ F: other(a.F1), tc: a.tc + gap, role: "push", surfaces: ["INSIDE", "OUTSIDE", "LACES"] }); }
    this.forced = contacts.map((q) => ({ F: q.F, tc: q.tc }));
    const prog = Object.assign({ kind: a.body.kind, theta: I.theta, v: I.v }, a.body.kind === "RUN" ? {} : { tPlant: a.tc, vEntry: a.body.vEntry, vOut: a.body.vOut, holdFace: a.body.kind === "STOP" }, a.body.dip ? { dip: { side: -sg, t0: a.tc - 0.34 } } : {});
    if (a.body.kind === "STOP" && prog.vOut === 0) prog.v = 0;
    this.splice(t0, prog);
    this.act = { fam: a.fam, sg, contacts, endT: contacts[contacts.length - 1].tc + 0.01, t0 };
    this.techLog.push({ t: r3(t0), ev: "action", mid: t0 > c.t + 1e-6, fam: a.fam, sg, deg: r2(deg), F: a.F1, j: a.j, tc: r3(a.tc), body: a.body.kind, vEntry: a.body.vEntry != null ? r2(a.body.vEntry) : null, cands: a.cands });
  }
  // ── THE INTENT, WATCHED BETWEEN CONTACTS (every 6 ticks): when it moves while the ball is on its way, the body reacts NOW (the run bends / brakes into
  // the plant), and the coming contact becomes the action's first one when it is that action's foot — responsiveness does not wait for the next touch
  watch(W) {
    if (this.done || this.failed || !this.next || this.carryFrom == null || W.tick % 6 !== 0) return; const tNow = (W.tick - this.kc0) * DT, nx = this.next; if (nx.t - tNow < 0.12 || this.act) return;
    const I = this.wantNow(tNow), L = this.lastDecision; if (L && abs(wrapA(I.theta - L.theta)) < 20 * DEG && abs(I.v - L.v) < 1.2 && (I.contest || 0) < 0.5) return;
    const last = this.contacts[this.contacts.length - 1]; if (!last) return;
    const a = this.decide(last, tNow); this.lastDecision = { t: tNow, theta: I.theta, v: I.v };
    if (this.act) { const q = this.act.contacts[0], sameSwing = q.F === nx.F && abs(q.tc - nx.t) < 0.08;
      if (sameSwing) { const k = this.kc0 + Math.round(q.tc / DT); Object.assign(nx, { k, t: (k - this.kc0) * DT, role: q.role, allowed: q.surfaces, act: this.act.fam, Q: this.rolePoint((k - this.kc0) * DT, q.F, q.role) }); }
      else { const sw = this.swings.find((s) => !s.first && s.F === nx.F && abs(this.contactTimeOf(s) - nx.t) < 0.2); if (sw) { const k = this.kc0 + Math.round(this.contactTimeOf(sw) / DT); Object.assign(nx, { k, t: (k - this.kc0) * DT, role: "carry", Q: this.contactPoint((k - this.kc0) * DT, nx.F) }); } } }
    else { const sw = this.swings.find((s) => !s.first && s.F === nx.F && abs(this.contactTimeOf(s) - nx.t) < 0.2); if (sw) { const k = this.kc0 + Math.round(this.contactTimeOf(sw) / DT); Object.assign(nx, { k, t: (k - this.kc0) * DT }); } }
    this.ver++;
  }
  // ── post(): RECEIVE-ELITE-1's closed loop; a ball beyond reach is never released: the run is re-planned toward it (a recovery) ─────────────────
  post(W) {
    const last = this.contacts[this.contacts.length - 1]; if (!last || W.tick !== last.k + 1 || this.done || this.failed) return;
    if (last.exit) { this.done = true; this.ver++; return; }
    const nx = this.pending, F = this.F, tNow = (W.tick - this.kc0) * DT, horizon = nx.t - tNow + TC.recover.window + 0.2, P = predictK(W, horizon, F), tReact = last.t + this.el.dri.react;
    let best = this.findNext(last, nx, (k) => P[k - W.tick], W.tick);
    if (!best) best = this.chase(last, nx, P, W.tick, tReact);
    if (!best) { this.failed = true; this.notes.push(`ball beyond reach after c${last.i}`); this.ver++; return; }
    if (best.corr) this.corr.push({ t0: tReact, t1: best.t, d: best.corr, after: last.i, gen: (this.planAt(best.t) || { gen: 0 }).gen });
    // an action's contact played later / earlier than planned (the ball's real place): its following contacts keep their spacing (the push after the
    // drag), the gait re-forced from now
    const ac = this.act; if (ac && nx.act && best.role !== "carry" && nx.actIdx != null && abs(best.t - nx.t) > 1e-6) { const dt = best.t - nx.t;
      for (let j = nx.actIdx; j < ac.contacts.length; j++) ac.contacts[j].tc += dt; ac.endT += dt; this.forced = ac.contacts.filter((q) => q.tc > tNow + 0.02).map((q) => ({ F: q.F, tc: q.tc })); this.rebuildSwings(tNow); }
    const Q = best.corr ? [best.Q[0] + best.corr[0], best.Q[1] + best.corr[1]] : best.Q;
    this.next = { i: nx.i, k: best.k, t: best.t, F: best.F, Q, role: best.role || nx.role, allowed: best.role === "carry" ? ["INSIDE", "OUTSIDE", "LACES"] : nx.allowed, act: best.role === "carry" ? null : nx.act, recovery: best.recovery || (best.corr && hyp(best.corr[0], best.corr[1]) > 0.25) || abs(best.t - nx.t) > 0.12, corr: best.corr ? best.corr.map(r3) : null, planned: { t: r3(nx.t), F: nx.F, Q: nx.Q }, chase: best.chase || false }; this.ver++;
  }
  // the next contact on the real ball (RECEIVE-ELITE-1's findNext, role-aware): an action's contact keeps its foot and its swing; a carry contact may
  // move to a neighbouring swing; beyond Dribbling's reach the run is corrected toward the ball at Agility's rate
  findNext(last, nx, ballAt, tick) {
    const dri = this.el.dri, ag = this.el.agi, tReact = last.t + dri.react; let best = null; const role = nx.role || "carry", act = role !== "carry";
    const tryAt = (k, F2, recovery) => { const tt = (k - this.kc0) * DT; if (k <= tick + 1) return; const b = ballAt(k); if (!b || b.p[2] > RX.ballHMax) return;
      const Q = this.rolePoint(tt, F2, role), e = [b.p[0] - Q[0], b.p[1] - Q[1]], el = hyp(e[0], e[1]), need = el - dri.reach, allow = ag.vAdj * (recovery ? 1 : 1) * max(0, tt - tReact);
      if (need > (recovery ? allow : min(allow, 0.35)) + 1e-9) return; const corr = need > 0 ? [e[0] / el * need, e[1] / el * need] : null;
      const cost = abs(tt - nx.t) * 2 + (corr ? hyp(corr[0], corr[1]) * 3 : 0) + (F2 !== nx.F ? 0.3 : 0);
      if (!best || cost < best.cost) best = { k, t: tt, F: F2, Q, corr, cost, recovery, ball: b.p.slice() }; };
    for (const dk of RE.sweep) { const k = nx.k + dk, tt = (k - this.kc0) * DT, sw = this.swings.find((s) => !s.first && tt >= s.t0 + 0.04 && tt <= s.t1 - 0.01 && (!act || (s.F === nx.F && abs(this.contactTimeOf(s) - nx.t) < 0.2)) && (tt - last.t) >= (s.F === last.F ? dri.sameFoot : dri.cadence) - 0.03); if (sw) tryAt(k, sw.F, false); }
    if (!best) for (let dk = 6; dk <= Math.round(0.8 / DT); dk += 6) { const k = nx.k + dk, tt = (k - this.kc0) * DT, sw = this.swings.find((s) => !s.first && tt >= s.t0 + 0.04 && tt <= s.t1 - 0.01); if (sw) tryAt(k, sw.F, true); if (best) break; }
    if (best && act && (best.F !== nx.F || abs(best.t - nx.t) > 0.15)) { best.role = "carry"; this.act = null; this.forced = []; this.techLog.push({ t: r3(best.t), ev: "action-dropped", fam: nx.act }); }   // the action cannot be played: the carry recovers the ball
    return best;
  }
  // THE CHASE (the replacement of "released into space"): the run is re-planned from the reaction time toward where the ball will be, and the next
  // contact is the first swing end at which it can be played — however long the body (Agility) needs
  chase(last, nx, P, tick, tReact) {
    const ballAt = (k) => P[k - tick], kR = this.kc0 + Math.round(tReact / DT), P0 = this.rootAt(tReact), I = this.wantNow(tReact), save = { n: this.plans.length, gen: this.gen, sw: this.swings, forced: this.forced, act: this.act };
    // arrival times: aim the run at where the ball will be then, at the speed that gets there then (no faster than the intent / a sprint) — the
    // first arrival with a swing that plays it within reach
    const restore = () => { this.plans.length = save.n; this.gen = save.gen; this.swings = save.sw; this.forced = save.forced; this.act = save.act; };
    for (const T of [0.35, 0.5, 0.65, 0.8, 1.0, 1.2, 1.4, 1.6]) { const bA = ballAt(kR + Math.round(T / DT)); if (!bA) break;
      // aim the body (its contact point ahead of it) at the ball; the run's momentum bends it wide — re-aim by the miss (≤ 3 shots)
      const u0 = [bA.p[0] - P0[0], bA.p[1] - P0[1]], l0 = hyp(u0[0], u0[1]) || 1, goal = [bA.p[0] - u0[0] / l0 * TC.ahead[0], bA.p[1] - u0[1] / l0 * TC.ahead[0]]; let aim = goal.slice();
      for (let shot = 0; shot < 3; shot++) { const d = [aim[0] - P0[0], aim[1] - P0[1]], dl = hyp(d[0], d[1]); restore(); this.act = null; this.forced = [];
        this.splice(tReact, { kind: "RUN", theta: Math.atan2(d[1], d[0]), v: clamp(dl / T * 1.05, 1.2, max(I.v, 6.5)) }); const R1 = this.rootAt(tReact + T), miss = [goal[0] - R1[0], goal[1] - R1[1]];
        if (hyp(miss[0], miss[1]) < 0.15) break; aim = [aim[0] + miss[0], aim[1] + miss[1]]; }
      for (const s of this.swings) { const tc = this.contactTimeOf(s); if (s.first || tc <= tReact + 0.05) continue; if (tc > tReact + T + 0.35) break; const kc = this.kc0 + Math.round(tc / DT), bc = ballAt(kc); if (!bc || bc.p[2] > RX.ballHMax) continue;
        const Q = this.contactPoint(tc, s.F), e = hyp(bc.p[0] - Q[0], bc.p[1] - Q[1]); if (e > this.el.dri.reach + 0.3) continue;
        this.techLog.push({ t: r3(tReact), ev: "chase", contact: last.i + 1, T }); this.carryFrom = this.carryFrom ?? tReact;
        return { k: kc, t: (kc - this.kc0) * DT, F: s.F, Q, corr: null, cost: 0, recovery: true, chase: true, ball: bc.p.slice() }; }
      restore(); }
    return null;
  }

}
// ═══ THE SIMULATION ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// cfg as ReceiveSimE's + cfg.style, cfg.intent (fn t (s from the strike) → { theta (pitch heading), v, contest }), cfg.bridge ("off" | "sprint"),
// cfg.dribble (a dribble start without a pass: { v, heading, ball ahead / lateral })
export class TechSim extends ReceiveSimE {
  constructor(cfg) {
    super(cfg); this.tc = { style: styleOf(cfg.style), bridge: cfg.bridge || "off" }; this.el = techParams(this.ratings);
    this.pref = cfg.player && cfg.player.preferred_foot === "L" ? "L" : "R"; // the preferred foot (a two-footed player — weak foot 5 — has none: prefFoot() → null)
    if (cfg.dribble) this.startDribble(cfg.dribble);
  }
  // the movement intent in the episode's frame and time (t from its first contact): the scenario's intent (pitch heading), else the receive's exit
  intentFn(kOrigin, F) { const I = typeof this.cfg.moveIntent === "function" ? this.cfg.moveIntent : null; return (t) => { const tt = (kOrigin + t / DT) * DT, o = I ? I(tt) : { theta: this.rx.exitDir, v: max(this.rx.exitV, RX.vFloor), contest: 0 }; return { theta: o.theta - (F ? F.h : 0), v: o.v, contest: o.contest || 0 }; }; }
  // PHASE 2 — NO BALL INTO SPACE: RECEIVE-ELITE-1 declined the sequence when even the ideal first touch could not be reached (its dry run) and played
  // the technique's own touch into space. Here the sequence is never declined (the dry run's verdict is kept as evidence): a standing receiver's
  // turn keeps its first touch (the closed loop and the chase do the rest); a moving receiver who cannot plant in time CUSHIONS the ball along his
  // run — a touch to his next foot — and the technical controller brakes over as many steps as his Agility needs and turns with the ball (drag-back,
  // Cruyff, inside cut …): the action takes longer, the ball stays close
  withoutDecline(fn) { const orig = EliteEpisode.prototype.dryCheck; let dry = null; EliteEpisode.prototype.dryCheck = function () { dry = orig.call(this); return Object.assign({}, dry, { ok: true }); };
    try { fn(); } finally { EliteEpisode.prototype.dryCheck = orig; } return dry; }
  resolve2(k) { const dry = this.withoutDecline(() => super.resolve2(k)), c2 = this.rc2; if (c2.kind === "ELITE" && !(c2.ep instanceof TechEpisode)) this.promote(c2); if (c2.kind === "ELITE" && dry) c2.dry = dry; }
  beginAction(act) { const dry = this.withoutDecline(() => super.beginAction(act)), c2 = this.rc2;
    if (c2 && c2.kind === "ELITE" && !(c2.ep instanceof TechEpisode)) this.promote(c2);
    if (c2 && c2.kind === "ELITE" && dry) { c2.dry = dry; if (!dry.ok || dry.recovery) { const T = c2.ep.tech; T.firstExit = true; T.cushion = true; T.dir0 = null; c2.ep.techLog.push({ t: 0, ev: "cushion-first-touch", fam: T.fid, why: "the turning first touch could not be followed (dry run): cushion along the run, turn with the ball after" }); } } }
  // RECEIVE-ELITE-1's receive episode becomes a TECHNICAL-CONTROL episode carrying the same state (no event / draw / contact changes)
  promote(c2) { const ep = c2.ep, te = Object.create(TechEpisode.prototype); Object.assign(te, ep);
    Object.assign(te, { gaitAt: this.gaitFn(), style: this.tc.style, intent: this.intentFn(ep.kc0, c2.frame), plans: [], gen: 0, actions: [], carryFrom: null, lastDecision: null, bridgeMode: this.tc.bridge, pref: this.prefFoot(), techLog: [], el: Object.assign({}, ep.el, { dri: Object.assign({}, ep.el.dri, this.el.dri), agi: Object.assign({}, ep.el.agi, this.el.agi) }) });
    c2.ep = te; this.buildBody2(); }
  // A DRIBBLE START (the technical course): the player running at the course's start speed with the ball just ahead of his foot, moving with him —
  // the technical controller owns ball and body from the first tick (the first contact 0.025 s in)
  // the presentation body, rebuilt when the episode re-plans — handed the previous body for its continuity (presentation only)
  buildBody2() { const c2 = this.rc2, prev = this.body2; super.buildBody2(); if (this.body2 && prev && c2.kind === "ELITE" && this.body2.inherit) this.body2.inherit(prev, (this.k - c2.kc) * DT); }
  gaitFn() { const E = this.E || this.cfg.E, body = this.A.body; return (v) => E.r1GaitAt(body, E.RUN1.ref, v); }
  startDribble(d) {
    const c2 = this.rc2, rx = this.rx, A = this.A, P0 = A.P.slice(), F = new Frame(P0, 0), h = d.heading || 0, v = d.v || 0, V = [Math.cos(h) * v, Math.sin(h) * v], F0 = d.foot || (this.prefFoot() || "R");
    const plan = new MotionPlan({ t: 0, P: [0, 0], V, psi: h, w: 0 }, this.el.agi, 8.0).build({ kind: "RUN", theta: h, v }), kc0 = 6;
    const path = { kind: "dribble", base: (t) => plan.at(t).P, psi: (t) => plan.at(t).psi, th: h, Trot: 0 }, ev = this.newEvent(), spec = this.spec(ev);
    const tech = { fid: "DRIBBLE", label: "dribble", F0, surfaces: ["INSIDE", "OUTSIDE", "LACES"], famM: 1, sig: 1, theta: h, stand: null, shift: 0, lift0: -0.16, land0: TC.landAfter, firstExit: true, dir0: null, vIn0: V, ballC0: null };
    const ep = new TechEpisode({ F, kc0, k0: 0, path, mode: "dribble", gaitAt: this.gaitFn(), tech, el: this.el, bc: this.bc, spec, idp: `${this.pid}:${ev}`, vFloor: RX.vFloor, vX: v, rollSpeed: this.rollSpeedFn(), style: this.tc.style, pref: this.prefFoot(), intent: this.intentFn(kc0, F), bridge: this.tc.bridge, pref: this.prefFoot() || "R" });
    // the ball: at the first contact's place (ahead of the foot that plays it), rolling with the player
    const t0 = 0, a = ep.contactPoint(t0, F0), bP = F.ker([a[0] - V[0] * kc0 * DT, a[1] - V[1] * kc0 * DT, R]), bV = F.kerV([V[0], V[1], 0]), b = this.W.ball; b.p = bP; b.v = bV; b.w = rollK(bV); b.mode = "ROLLING"; b.sleeping = false; this.W.restTime = 0;
    Object.assign(c2, { kind: "ELITE", eliteFrom: "DRIBBLE", phase: "action", frame: F, kc: kc0, k0: 0, psiInit: null, spec, ep, cls: { k: 0, ev, ground: true, intent: "go", hold: false, action: "DRIBBLE", moving: true } });
    rx.phase = "action"; rx.stand = false; this.parkColliders(); A.P = P0; A.V = V; A.psi = h; this.input = { dir: h, v };
    if (this.rec) { this.rec.length = 0; this.record(); }
  }
}
