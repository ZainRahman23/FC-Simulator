// ═══ tackle1/t_tackle.js — STANDING TACKLE V1: the integrated defensive-action lifecycle on the canonical footballer (owner, 24 Oct) ═══════════
// request → a short-lived PENDING action → the earliest valid PHYSICAL OPPORTUNITY (searched every tick from the defender's actual feet and the
// ball's actual state) → COMMITMENT (the tackle owns the body: the defender's ordinary re-planning is held off) → the CONTACT WINDOW (the
// authoritative boot presented to the canonical opponent law, c_sim.js opponentStep, as moving spheres) → the OUTCOME (read from the canonical
// possession model, never decided here) → RECOVERY (the authored catch / step / settle, the same for a hit and a miss) → CONTROL READY (the
// ordinary gait re-plans from the stances the tackle left).
// THE BODY: Phase C revision 2 (Codex, 19 Oct, the STANDING_POKE / STANDING_LUNGE study recorded as approved; motion.js hash 2eba917e…) re-expressed
// in the canonical plan format — the root keyed (load, drive, momentum), the support stance held with its toe-anchored heel and pivot, the
// reaching foot's swing as dense waypoints, the catch / recovery step / settle as stances, the trunk, pelvis, arms and head as posture channels —
// so the canonical PlayBody draws it. What integration changes: the action starts from the gait's ACTUAL support and swing foot (never a
// stance fixture), the approach's momentum is a continuous braking profile (C¹ with the approach velocity), and the root after contact is one
// smooth curve to the ready stance (Phase C's root stepped to zero velocity at contact).
// THE DEFENDER NEVER READS THE ATTACKER'S PLAN: only the ball's position and velocity now, and its free roll (pt_ball predict). A touch, a cut, a
// Body Feint or a Croqueta made after commitment can take the ball out of the boot's path — geometry decides.
import { DT, DEG, wrap, clamp, dir, rgt, hdg, toLocal } from "../vocab2/u_tc.js";
import { predict, R as BR } from "../tc_baseline_88573ef0/pt_ball.js";
const hyp = Math.hypot, abs = Math.abs, min = Math.min, max = Math.max, other = (X) => (X === "R" ? "L" : "R"), sgnF = (X) => (X === "R" ? 1 : -1);
const sm = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
const ANKLE_H = 0.088;   // (receive_turn11/rt11_body.js HB.ankleH — the body's planted ankle height)
// ── THE ENVELOPE (Phase C rev 2's authored bounds unless stated; integration's own choices marked) ──────────────────────────────────────────────
export const TK = {
  window: 0.35,          // the pending request's lifetime (s) — integration's choice: a defensive request older than this is stale
  sector: 75,            // ° the forward sector (Phase C)
  ax: 1.28, ay: 1.30,    // m: the reach ellipse along / across the facing (Phase C limit())
  rMin: 0.30,            // m: nearer than this the ball is at the feet — not a tackle (integration)
  ballH: 0.24,           // m: the ball's centre above this is not a ground tackle (Codex V1)
  vMax: 3.4,             // m/s: Phase C's approach fixtures are 0 / 1.5 / 3 m/s — above this declined (integration: walk and jog only)
  cross: 0.12,           // m: how far across the defender's midline the tackling foot may reach (integration)
  supportLeft: 0.0,      // s: the support must be planted at commitment (it is then held through the reach)
  brake: 7.0,            // m/s²: the approach braked at most this hard through the action (A99-C's aBrake is 9.5 at 99)
  e: 0.55, r: 0.045,     // the canonical opponent law's restitution; the boot's sphere radius
  tc0: 0.145, tc1: 0.13, // contact at 0.145 + 0.13 c s after commitment (Phase C)
  // THE CONTACT (integration's addition — Phase C rev 2 was a body study with no ball response): "POKE" = the planned contact puts the boot's
  // toe 1 cm into the ball (its proxy, not Phase C's 0.15 m visual allowance), the foot jabbing along its own line of reach at 3.0 − 1.8 c m/s
  // (never slower than Phase C's 0.7 + 0.55 c; a provisional speed, no reference measurement); "PHASE_C" = Phase C's contact pose and speed exactly
  contact: "POKE", pen: 0.01,
  // (integration's two continuity changes to Phase C's timing — the canonical body showed them as pops: the load's pelvis drop eased over 0.15 s
  // (Phase C: 0.085 s — up to 2.4 m/s, the knees ≈ 2000°/s), and THE SWITCH: the tackle's own stances replace the gait's 0.045 s after commitment,
  // once the gait cycle (bob, twist, arm swing) has faded — the stances' future footfalls set the cycle's phase, and changing them under a live
  // cycle lifted the pelvis 1.1 cm in one tick)
  load: 0.15, tB: 0.045, lift: 0.07
};
export const limitOf = (ang) => 1 / Math.sqrt((Math.cos(ang) / TK.ax) ** 2 + (Math.sin(ang) / TK.ay) ** 2);
const herm = (a, b, v0, v1, u, T) => { u = clamp(u, 0, 1); const h00 = 2 * u ** 3 - 3 * u * u + 1, h10 = u ** 3 - 2 * u * u + u, h01 = -2 * u ** 3 + 3 * u * u, h11 = u ** 3 - u * u; return a.map((x, i) => h00 * x + h10 * T * v0[i] + h01 * b[i] + h11 * T * v1[i]); };
const lerp3 = (a, b, u) => a.map((x, i) => x + (b[i] - x) * u);
// the approach's momentum under the tackle's braking: distance travelled and speed τ after commitment
function travel(s0, tau) { const a = clamp(s0 / 0.40, 2.5, TK.brake), tS = s0 / a; if (s0 <= 1e-6) return { d: 0, v: 0, a }; if (tau >= tS) return { d: s0 * s0 / (2 * a), v: 0, a }; return { d: s0 * tau - a * tau * tau / 2, v: s0 - a * tau, a }; }
// ═══ THE LIFECYCLE ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
export class StandingTackle {
  // def: the defender (DefenderSim) · att: the attacker (the canonical ControlledSim whose ball is the authoritative ball)
  constructor(def, att, o = {}) { this.def = def; this.att = att; this.o = o; this.pend = null; this.act = null; this.log = []; this.n = 0; this.pid = 0; this.probeN = 0; this.cpu = { idle: 0, eval: [], build: [] }; }
  // ── THE REQUEST (explicit: the Lab's button / a fixture's tick) — never from the left-stick recognizer ────────────────────────────────────────
  request(t, src = "button") { const rec = { n: ++this.n, tReq: t, src, state: "PENDING", until: t + TK.window, why: {}, last: null };
    if (this.act && t < this.act.tCtl - 1e-9) { rec.state = "DECLINED"; rec.reason = t < this.act.tRec ? "COMMITTED: the tackle in progress owns the body" : "RECOVERING: control not yet returned"; rec.tEnd = t; this.log.push(rec); return rec; }
    if (this.pend) { rec.state = "IGNORED"; rec.reason = "DUPLICATE: a request is already pending"; rec.tEnd = t; this.log.push(rec); return rec; }
    this.pend = rec; this.log.push(rec); return rec; }
  cancel(t) { if (!this.pend) return false; Object.assign(this.pend, { state: "CANCELLED", tEnd: t, reason: "cancelled before commitment" }); this.pend = null; return true; }
  owns(t) { return !!(this.act && t < this.act.tCtl - 1e-9); }
  phaseAt(t) { const A = this.act; if (!A || t < A.t0) return this.pend ? "PENDING" : "—"; const r = t - A.t0, M = A.M;
    return r < 0.035 ? "SET" : r < 0.09 ? "LOAD" : r < M.tc - 0.012 ? "DRIVE + REACH" : r <= M.tc + 0.012 ? "CONTACT" : r < M.landing ? (A.fam === "STANDING_POKE" ? "RETURN" : "FOLLOW-THROUGH / CATCH") : r < M.stepEnd ? "RECOVERY STEP" : r < M.end ? "REGAIN STANCE" : "CONTROL READY"; }
  // ── per world tick, before the defender's step: a pending request searches its opportunity; a committed one may return control ──────────────
  pre(t) {
    if (this.act && !this.act.switched && t >= this.act.tB - 1e-9) { this.act.switched = true; this.act.stepB(); }
    if (this.act && !this.act.released && t >= this.act.tCtl - 1e-9) { this.act.released = true; this.act.tReleased = t; this.def.flags.replan = "tackle: control return"; }
    if (!this.pend) return; const c0 = performance.now(), P = this.pend;
    if (t > P.until + 1e-9) { const top = Object.entries(P.why).sort((a, b) => b[1] - a[1])[0]; Object.assign(P, { state: "DECLINED", tEnd: t, reason: P.last || (top ? top[0] : "no opportunity") }); this.pend = null; this.cpu.eval.push(performance.now() - c0); return; }
    const o = this.opportunity(t); this.cpu.eval.push(performance.now() - c0);
    if (!o.ok) { P.why[o.why] = (P.why[o.why] || 0) + 1; P.last = o.why; return; }
    const c1 = performance.now(); this.commit(t, o, P); this.cpu.build.push(performance.now() - c1); }
  // ── THE PHYSICAL OPPORTUNITY at t: the support planted, the tackling foot free, the predicted ball inside the reach envelope at the contact time
  // the commitment it needs implies (Phase C: tc = 0.145 + 0.13 c), the ball on the ground, the approach inside the validated speeds ─────────────
  opportunity(t) {
    const D = this.def, st = D.stateAt(t, D.plan), s0 = st.s, psi0 = st.psi, h0 = s0 > 0.3 ? st.h : st.psi;
    if (s0 > TK.vMax) return { ok: false, why: `SPEED: ${s0.toFixed(1)} m/s above the validated ${TK.vMax} (run / sprint tackles not validated)` };
    const B = this.att.ballTrack(t); if (B.p[2] > TK.ballH) return { ok: false, why: `BALL TOO HIGH: ${B.p[2].toFixed(2)} m` };
    const feet = this.feetAt(t), cands = [];
    let why = null;
    for (const F of ["R", "L"]) { const S = other(F); if (!feet[S].planted) { why = why || `NO SUPPORT: the ${S} foot is in the air`; continue; }
      const g = this.geometry(t, st, h0, B, F); if (!g.ok) { why = why || g.why; continue; } cands.push(g); }
    if (!cands.length) return { ok: false, why: why || "no foot free" };
    // (both free — double support: the nearer foot to the target, Phase C's rule; a tie within 15 mm: the preferred foot)
    cands.sort((a, b) => (abs(a.dFoot - b.dFoot) < 0.015 ? (a.F === (D.o.foot === "L" ? "L" : "R") ? -1 : 1) : a.dFoot - b.dFoot));
    return Object.assign({ ok: true, st, h0, psi0, s0, B, feet }, cands[0]); }
  // the target for tackling foot F: the contact time searched for the commitment the reach implies (the free ball rolls meanwhile)
  geometry(t, st, h0, B, F) {
    const sx = sgnF(F), psi0 = st.psi; let best = null;
    for (let k = 0; k <= 32; k++) { const tau = TK.tc0 + TK.tc1 * k / 32, tr = travel(st.s, tau), Pc = [st.P[0] + Math.cos(h0) * tr.d, st.P[1] + Math.sin(h0) * tr.d], bp = predict(B.p, B.v, tau).p, L = toLocal(bp, Pc, psi0),
        ang = Math.atan2(L[1], L[0]), rng = hyp(L[0], L[1]), mx = limitOf(ang), c = clamp((min(rng, mx) - 0.5) / (mx - 0.5), 0, 1), err = abs(tau - (TK.tc0 + TK.tc1 * c));
      if (!best || err < best.err) best = { tau, Pc, bp, L, ang, rng, mx, c, err }; }
    const g = best; if (abs(g.ang) > TK.sector * DEG) return { ok: false, why: `OUTSIDE THE FORWARD SECTOR: ${(g.ang / DEG).toFixed(0)}° (±${TK.sector}°)` };
    if (g.rng > g.mx + 1e-9) return { ok: false, why: `OUT OF REACH: ${g.rng.toFixed(2)} m at ${(g.ang / DEG).toFixed(0)}° (envelope ${g.mx.toFixed(2)} m)` };
    if (g.rng < TK.rMin) return { ok: false, why: `TOO CLOSE: the ball ${g.rng.toFixed(2)} m from the body (at the feet)` };
    if (sx * g.L[1] < -TK.cross) return { ok: false, why: `WRONG SIDE: the ball ${abs(g.L[1]).toFixed(2)} m to the ${g.L[1] > 0 ? "right" : "left"}; the free foot is the ${F === "R" ? "right" : "left"}` };
    const fp = this.footNow(F, t), dFoot = hyp(g.bp[0] - fp[0], g.bp[1] - fp[1]);
    return Object.assign({ ok: true, F, dFoot }, g); }
  // the feet at t from the defender's own plan: a stance covering t (planted), else the swing between the last stance and the next
  feetAt(t) { const D = this.def, out = {}; for (const X of ["R", "L"]) { const L = D.plan.stances[X]; let pl = null, last = null, next = null;
      for (const s of L) { if (s.t0 <= t + 1e-9 && s.t1 > t + 1e-9) pl = s; else if (s.t1 <= t + 1e-9 && (!last || s.t1 > last.t1)) last = s; else if (s.t0 > t + 1e-9 && (!next || s.t0 < next.t0)) next = s; }
      out[X] = { planted: pl, last, next }; } return out; }
  // the planted stance per foot at t under a given plan (null when the foot is in the air) — for the body audit
  feetAtPlan(plan, t) { const o = {}; for (const X of ["R", "L"]) o[X] = plan.stances[X].find((s) => s.t0 <= t + 1e-9 && s.t1 > t + 1e-9) || null; return o; }
  // the foot's ankle at t (sim level: a planted stance's position; a swing interpolated between its toe-off and its landing with the gait's lift)
  footNow(X, t) { const f = this.feetAt(t)[X]; if (f.planted) return [f.planted.pos[0], f.planted.pos[1], ANKLE_H];
    const a = f.last, b = f.next; if (a && b) { const u = clamp((t - a.t1) / max(1e-3, b.t0 - a.t1), 0, 1); return [a.pos[0] + (b.pos[0] - a.pos[0]) * u, a.pos[1] + (b.pos[1] - a.pos[1]) * u, ANKLE_H + 0.09 * Math.sin(Math.PI * u)]; }
    const q = a || b; return q ? [q.pos[0], q.pos[1], ANKLE_H] : [this.def.stateAt(t).P[0], this.def.stateAt(t).P[1], ANKLE_H]; }
  // ═══ COMMITMENT: the authored action from the actual entry state ═══════════════════════════════════════════════════════════════════════════
  commit(t0, o, P) {
    const D = this.def, F = o.F, S = other(F), sx = sgnF(F), c = o.c, ang = o.ang, s = abs(ang) < 3 * DEG ? sx : Math.sign(ang), psi0 = o.psi0, fw = dir(psi0), rt = rgt(psi0);
    const fam = c < 0.18 ? "STANDING_POKE" : c > 0.55 ? "STANDING_LUNGE" : "POKE → LUNGE", poke = c < 0.18;
    // Phase C's timing, from commitment (τ = 0): contact, catch, recovery step, settle
    const tc = TK.tc0 + TK.tc1 * c, landing = tc + 0.055 + 0.065 * c, stepDur = 0.13 + 0.27 * c + o.s0 * 0.025, settle = 0.095 + 0.105 * c;
    let stepEnd = landing + stepDur, end = stepEnd + settle;
    const tR = poke ? landing + 0.45 * stepDur : null;   // (the poke: the foot returns to the ready stance instead of catching)
    const dirW = dir(psi0 + ang), bounded = min(o.rng, o.mx), drive = 0.025 + 0.49 * c, recDisp = 0.02 + 0.11 * c;
    // the root: the approach's momentum braked along its travel + the drive toward the challenge + the load's small shift onto the support (C¹)
    const rootAt = (tau) => { const tr = travel(o.s0, tau), dD = tau <= tc ? drive * sm((tau - 0.065) / (tc - 0.065)) : drive + recDisp * sm((tau - tc) / (stepEnd - tc)), load = sm(tau / TK.load), lat = -s * 0.025 * c * load * (1 - sm((tau - 0.065) / (tc - 0.065)));
      return [o.st.P[0] + Math.cos(o.h0) * tr.d + dirW[0] * dD + rt[0] * lat, o.st.P[1] + Math.sin(o.h0) * tr.d + dirW[1] * dD + rt[1] * lat]; };
    const active = (tau) => 1 - sm((tau - landing) / (end - landing)), driveU = (tau) => sm((tau - 0.065) / (tc - 0.065));
    const pelvisYaw = (tau) => s * (3 + 15 * c) * abs(Math.sin(ang)) * driveU(tau) * active(tau);   // (deg; Phase C)
    const dropAt = (tau) => (tau <= tc ? (0.035 + 0.135 * c) * sm(tau / TK.load) - 0.035 * c * driveU(tau) : (0.035 + 0.10 * c) + (0.02 - (0.035 + 0.10 * c)) * sm((tau - landing) / (end - landing)));
    // the boot at contact: its centre 0.15 m short of the predicted ball along the challenge, yawed 14° further out beyond 40° (Phase C)
    // (a planted reaching foot lifts at TK.lift: the body weights a stance out over its last 0.07 s, and a swing's weight is judged at its landing —
    // the catch, a metre away: lifted at once, the pelvis dropped 6.6 cm in a tick to let that leg reach it)
    const f0 = this.footNow(F, t0), fNow = o.feet[F], yaw0 = fNow.planted ? fNow.planted.yaw : fNow.last ? fNow.last.yaw : psi0, uS = fNow.planted ? TK.lift : 0.055, mode = this.o.contact || TK.contact;
    let yawC, ankC, endV, follow, vJab, nAim;
    if (mode === "PHASE_C") { yawC = psi0 + ang + (abs(ang) > 40 * DEG ? s * 0.25 : 0); const bd = dir(yawC), centre = [o.bp[0] - dirW[0] * 0.15, o.bp[1] - dirW[1] * 0.15]; ankC = [centre[0] - bd[0] * 0.18, centre[1] - bd[1] * 0.18, 0.08];
      const d = [ankC[0] - f0[0], ankC[1] - f0[1]], m = hyp(d[0], d[1]) || 1; vJab = 0.7 + 0.55 * c; nAim = [d[0] / m, d[1] / m]; endV = [nAim[0] * vJab, nAim[1] * vJab, 0]; follow = [ankC[0] + dirW[0] * (0.015 + 0.04 * c), ankC[1] + dirW[1] * (0.015 + 0.04 * c), ANKLE_H]; }
    else { // (POKE: the toe on the ball along the foot's own line of reach — from where the foot is to where the ball will be)
      const d = [o.bp[0] - f0[0], o.bp[1] - f0[1]], m = hyp(d[0], d[1]) || 1; nAim = [d[0] / m, d[1] / m]; vJab = max(0.7 + 0.55 * c, 3.0 - 1.8 * c);
      yawC = hdg(nAim) + (abs(ang) > 40 * DEG ? s * 0.25 : 0); const bd = dir(yawC), hz = Math.sqrt((BR + TK.r) ** 2 - (BR - 0.05) ** 2) - TK.pen, toe = [o.bp[0] - nAim[0] * hz, o.bp[1] - nAim[1] * hz];
      ankC = [toe[0] - bd[0] * 0.17, toe[1] - bd[1] * 0.17, 0.08]; endV = [nAim[0] * vJab, nAim[1] * vJab, 0]; const fl = 0.015 + 0.04 * c + 0.03 * vJab; follow = [ankC[0] + nAim[0] * fl, ankC[1] + nAim[1] * fl, ANKLE_H]; }
    const rootEnd = rootAt(end), readyF = [rootEnd[0] + fw[0] * 0.07 + rt[0] * sx * 0.18, rootEnd[1] + fw[1] * 0.07 + rt[1] * sx * 0.18], readyS = [rootEnd[0] - fw[0] * 0.05 - rt[0] * sx * 0.18, rootEnd[1] - fw[1] * 0.05 - rt[1] * sx * 0.18];
    // THE AUTHORITATIVE BOOT: the tackling ankle's path and the boot's yaw from commitment (the contact spheres are built from it every tick)
    const boot = (tau) => { let a, y, p = 0;
      if (tau <= uS) { a = f0.slice(); y = yaw0; }
      else if (tau <= tc) { const u = (tau - uS) / (tc - uS); a = herm(f0, ankC, [0, 0, 0], endV, u, tc - uS); a[2] = (f0[2] + (0.08 - f0[2]) * sm(u)) + 0.035 * Math.sin(Math.PI * u) ** 2; y = yaw0 + wrap(yawC - yaw0) * sm(u); }
      else if (!poke) { const u = (tau - tc) / (landing - tc); a = herm(ankC, follow, endV, [0, 0, 0], u, landing - tc); a[2] = 0.08 + (ANKLE_H - 0.08) * sm(u); y = yawC; }
      else { const ret = sm((tau - tc - 0.04) / (tR - tc - 0.04)), ft = herm(ankC, follow, endV, [0, 0, 0], clamp((tau - tc) / (landing - tc), 0, 1), landing - tc); a = lerp3(ft, [readyF[0], readyF[1], ANKLE_H], ret); a[2] = max(ANKLE_H, a[2]) + 0.045 * Math.sin(Math.PI * ret); y = yawC + wrap(psi0 + sx * 6 * DEG - yawC) * ret; }
      return { a, y, p }; };
    // ── the plan: the stances (the actual support held; the reaching foot's catch / return; the recovery step; the settle) ─────────────────────
    const keep = D.committed(D.plan, t0), A0 = t0, stS = o.feet[S].planted, sid = () => ++D.sid;
    const past = (X) => keep.stances[X].filter((q) => q.t1 <= t0 + 1e-9 && q.t0 < t0).map((q) => Object.assign({}, q));
    const RS = past(S), RF = past(F);
    // (the support: its current stance held through the reach — its ball-of-foot anchored, the heel rising with the push, the foot pivoting toward
    // the challenge: Phase C's 18 c° heel roll and 0.22 × the challenge angle)
    const pv0 = 0, tSupEnd = poke ? tR + 0.02 : landing + 0.02;
    // (THE HEEL AT A LIFT-OFF: the body raises a planted heel once the ankle would dorsiflex past 20° (RF.dfRise), and a swing starts from the
    // stance's AUTHORED toe-off — a heel the body had to raise further jumped down at the lift-off (6.5 – 13 cm, the knee 10 – 38°). The authored
    // heel is set to what the geometry needs then: the hip–ankle line's forward lean along the foot − 20° + 5°)
    const bd = D.body, heelNeed = (st, X, tau, yaw) => { const r = this.rootAtTau(rootAt, tau), ps = psi0 + pelvisYaw(tau) * DEG, hip = [r[0] - Math.sin(ps) * sgnF(X) * bd.hipX, r[1] + Math.cos(ps) * sgnF(X) * bd.hipX, bd.pelvisY - 0.02 - (0.03 + dropAt(tau))];
      const f = dir(yaw), my = abs(bd.mtp[1]), mz = bd.mtp[2], B = [st.pos[0] + f[0] * mz, st.pos[1] + f[1] * mz]; let p = 0;
      for (; p < 55; p += 1) { const q = p * DEG, back = mz * Math.cos(q) - my * Math.sin(q), up = my * Math.cos(q) + mz * Math.sin(q), a = [B[0] - f[0] * back, B[1] - f[1] * back, ANKLE_H - my + up], v = [hip[0] - a[0], hip[1] - a[1], hip[2] - a[2]];
        // (the SHIN's forward lean: the hip–ankle line's lean + the knee's forward bend of a two-link leg — thigh, shank — over that distance)
        const d = hyp(v[0], v[1], v[2]), Lt = bd.thigh, Ls = bd.shank, beta = Math.acos(clamp((Ls * Ls + d * d - Lt * Lt) / (2 * Ls * max(1e-3, d)), -1, 1)), shin = Math.atan2(v[0] * f[0] + v[1] * f[1], v[2]) + beta;
        if (shin / DEG - p <= 15) break; } return p; };
    // (liftK 0: the body's natural toe-off rise is spread over the last 55 % of a stance — a standing stance (t0 = −1) ended now would rise at once)
    const hS = max(18 * c, heelNeed(stS, S, tSupEnd, stS.yaw + 0.22 * ang));
    const sup = Object.assign({}, stS, { t1: A0 + tSupEnd, tackle: "support", liftK: 0, heelNeed: hS, heel: [A0 + 0.11, hS], pivot: [[A0 + TK.tB, pv0], [A0 + tc, pv0 + 0.22 * ang], [A0 + tSupEnd, pv0 + 0.22 * ang]] });
    RS.push(sup);
    // (the reaching foot: lifted now if it was planted; its swing = the authoritative path as waypoints, to the catch (or the ready stance))
    const tLift = o.feet[F].planted ? Object.assign({}, o.feet[F].planted, { t1: A0 + TK.lift, liftK: 0 }) : null; if (tLift) { const hT = heelNeed(tLift, F, TK.lift, tLift.yaw); if (hT > 0) Object.assign(tLift, { heel: [A0, hT], heelNeed: hT }); RF.push(tLift); }
    const via = []; for (let tau = (o.feet[F].planted ? TK.lift + 0.02 : 0.02); tau < (poke ? tR : landing) - 0.012; tau += 0.025) { const b = boot(tau); via.push({ dt: A0 + tau, rel: "O", at: [b.a[0], b.a[1], b.a[2]], yaw: b.y / DEG }); }
    { const b = boot(tc); via.push({ dt: A0 + tc, rel: "O", at: [b.a[0], b.a[1], b.a[2]], yaw: b.y / DEG }); via.sort((a, b) => a.dt - b.dt); }
    const frame = { O: [0, 0], h0: 0, m: 1, rot: 0, tC: 0 };
    const yawEnd = psi0, ready = (X, pos, t0s, swingIn) => ({ id: sid(), F: X, t0: t0s, t1: Infinity, pos: pos.slice(), yaw: yawEnd + sgnF(X) * 6 * DEG, kind: "standing", src: "tackle", swingIn });
    if (poke) { RF.push(ready(F, readyF, A0 + tR, { frame, via }));
      const dS = hyp(readyS[0] - stS.pos[0], readyS[1] - stS.pos[1]); if (dS > 0.10) { const s2 = A0 + tR + 0.02 + max(0.14, 0.6 * stepDur); RS.push(ready(S, readyS, s2, null)); end = max(end, s2 + settle * 0.6); stepEnd = max(stepEnd, s2); }
      else sup.t1 = Infinity; }
    else { const catchSt = { id: sid(), F, t0: A0 + landing, t1: A0 + stepEnd + 0.01, pos: [follow[0], follow[1]], yaw: yawC, kind: "tackle catch", src: "tackle", swingIn: { frame, via } };
      RF.push(catchSt); RS.push(ready(S, readyS, A0 + stepEnd, null)); RF.push(ready(F, readyF, A0 + end, null)); }
    // ── the root path keyed (s, h, ψ per tick — integrated by mkPlan exactly as a technique's keys) ─────────────────────────────────────────────
    const n = Math.ceil(end / DT) + 2, Pk = [], psiK = []; for (let i = 0; i <= n; i++) { Pk.push(rootAt(i * DT)); psiK.push(psi0 + pelvisYaw(i * DT) * DEG); }
    let hLast = o.h0; const sK = [], hK = []; for (let i = 0; i < n; i++) { const d = [Pk[i + 1][0] - Pk[i][0], Pk[i + 1][1] - Pk[i][1]], m = hyp(d[0], d[1]) / DT; if (m > 1e-4) hLast = hdg(d); sK.push(m); hK.push(hLast); }
    const at = (A) => ({ at: (t) => { const i = clamp(Math.round((t - A0) / DT) - 1, 0, A.length - 1); return A[i]; } });
    const prog = { kind: "tackle", tA: -1, tEnd: A0 + end, sC: at(sK), hC: at(hK), fC: { at: (t) => psiK[clamp(Math.round((t - A0) / DT), 0, psiK.length - 1)] } };
    // ── the posture (Phase C's whole-body: lean toward the challenge, the pelvis turned a little, the trunk counter-rotated, the drop, the arms'
    // counterbalance, the head down to the ball) as the canonical channels ───────────────────────────────────────────────────────────────────
    const ch = { lean: [], side: [], trunk: [], crouch: [], arms: [], gait: [], look: [], armW: [], abdR: [], abdL: [], flxR: [], flxL: [], elbR: [], elbL: [], headDrop: [], proll: [] };
    const lean0 = 6 + 6 * clamp(o.s0 / 6, 0, 1);
    for (const tau of [0.035, 0.065, 0.085, 0.5 * (0.065 + tc), TK.load, tc, 0.5 * (tc + landing), landing, 0.5 * (landing + stepEnd), stepEnd, 0.5 * (stepEnd + end), end, end + 0.15]) {
      const e = driveU(tau) * active(tau), load = sm(tau / TK.load), lean = (3 + 25 * c) * e, rel = ang - pelvisYaw(tau) * DEG, t = A0 + tau;
      const drop = dropAt(tau);
      ch.lean.push([t, lean0 * (1 - e) + lean * Math.cos(rel) + 4 * load * (1 - e) * (tau < end ? 1 : 0)]); ch.side.push([t, lean * Math.sin(rel) * 0.8]); ch.trunk.push([t, -0.18 * pelvisYaw(tau)]);
      ch.crouch.push([t, tau >= end + 0.1 ? 0.022 : 0.03 + drop]); ch.proll.push([t, -Math.sign(Math.sin(ang)) * (2 + 5 * c) * e * min(1, abs(Math.sin(ang)) * 2)]);
      const w = sm(tau / 0.09) * (1 - sm((tau - stepEnd) / max(0.05, end - stepEnd))), T = F === "R" ? "R" : "L", O = other(T);
      ch.armW.push([t, w]); ch.arms.push([t, 0.15 + 0.2 * e]);
      ch["abd" + T].push([t, 22 + (14 + 16 * c) * e]); ch["flx" + T].push([t, -6 - (10 + 12 * c) * e]); ch["elb" + T].push([t, 38 + 10 * e]);
      ch["abd" + O].push([t, 20 + (10 + 14 * c) * e]); ch["flx" + O].push([t, 10 + (18 + 22 * c) * e]); ch["elb" + O].push([t, 55 + 15 * e]);
      ch.headDrop.push([t, 16 * e]); ch.look.push([t, 1]); ch.gait.push([t, tau < end - 0.05 ? 0 : clamp((tau - end + 0.05) / 0.2, 0, 1)]); }
    ch.gait.unshift([A0 + 0.025, 0.45], [A0 + TK.tB, 0]); ch.gait.sort((a, b) => a[0] - b[0]);
    const action = { kind: "TACKLE", label: fam, id: ++D.aid, F, fam, tackle: true, c, tC: A0 + tc }, stB = { R: F === "R" ? RF : RS, L: F === "L" ? RF : RS };
    // (step 1: the tackle's root and posture on the gait's own stances while the cycle fades; step 2 (pre, at A0 + TK.tB): the tackle's stances)
    const mk = (t0p, stances, reason) => { const plan = D.mkPlan({ t0: t0p, st: t0p === A0 ? Object.assign({}, o.st, { s: o.s0, h: o.h0 }) : D.stateAt(t0p, D.plan), stances, contacts: [], action, req: D.req, prog, chKeys: ch });
      plan.ch = D.channels({ t0: t0p, chKeys: ch, action }, plan);   // (the ball-off sim's demand channels replaced by the action's own posture)
      plan.reason = reason; D.adopt(plan); };
    const stA = { R: D.plan.stances.R.map((q) => (tLift && q.id === tLift.id && F === "R" ? tLift : q)), L: D.plan.stances.L.map((q) => (tLift && q.id === tLift.id && F === "L" ? tLift : q)) };
    mk(A0, stA, "tackle: commitment");
    const M = { tc, landing, stepEnd, end, tR, drive, recDisp };
    this.act = { n: P.n, tReq: P.tReq, t0: A0, tB: A0 + TK.tB, stepB: () => mk(A0 + TK.tB, stB, "tackle: the tackle's own stances"), switched: false, tC: A0 + tc, tW0: A0 + 0.05, tW1: A0 + (poke ? tR : stepEnd), tRec: A0 + (poke ? tR : landing), tCtl: A0 + end, F, S, fam, c, ang, rng: o.rng, mx: o.mx, bp: o.bp, ankC, yawC, boot, M, rootAt,
      s0: o.s0, contact: mode, vJab, nAim, stride: this.strideOf(t0, o.feet), hits: [], probes: 0, released: false, outcome: null, entry: { P: o.st.P.slice(), psi: psi0, h: o.h0, s: o.s0 }, ball0: { p: o.B.p.slice(), v: o.B.v.slice() }, poss0: this.att.poss ? this.att.poss.state : null };
    Object.assign(P, { state: "COMMITTED", tCommit: A0, F, fam, c, tEnd: A0 }); this.pend = null;
  }
  rootAtTau(rootAt, tau) { return rootAt(tau); }
  // the stride at commitment: the support's time on the ground, the reaching foot's state (planted / in swing, how far through it)
  strideOf(t, feet) { const o = {}; for (const X of ["R", "L"]) { const f = feet[X]; o[X] = f.planted ? { planted: true, since: +(t - f.planted.t0).toFixed(3), left: f.planted.t1 === Infinity ? null : +(f.planted.t1 - t).toFixed(3) } : { planted: false, u: f.last && f.next ? +((t - f.last.t1) / max(1e-3, f.next.t0 - f.last.t1)).toFixed(2) : null }; } return o; }
  // ── THE CONTACT WINDOW: the authoritative boot as moving spheres for the canonical opponent law (one tick each, at t) ─────────────────────────
  spheresAt(t) { const A = this.act, tau = t - A.t0, b = A.boot(tau), f = dir(b.y), r = rgt(b.y), sx = sgnF(A.F), z = max(0.045, b.a[2] - 0.03);
    // (toe, inside forefoot, inside midfoot, outside forefoot — along the boot from its ankle; inside = toward the midline)
    return [["TOE", 0.17, 0], ["INSIDE", 0.10, -0.035], ["INSIDE", 0.02, -0.03], ["OUTSIDE", 0.10, 0.035]].map(([surf, a, l]) => ({ surf, p: [b.a[0] + f[0] * a + r[0] * sx * l, b.a[1] + f[1] * a + r[1] * sx * l, z] })); }
  probes(t) { const A = this.act, opp = this.att.opp; if (opp.length) { for (let i = opp.length - 1; i >= 0; i--) if (opp[i].t1 < t - 1e-9 || opp[i].hit) opp.splice(i, 1); }
    if (!A || t < A.tW0 - 1e-9 || t > A.tW1 + 1e-9) return; const S0 = this.spheresAt(t - DT), S1 = this.spheresAt(t + DT), S = this.spheresAt(t);
    for (let i = 0; i < S.length; i++) { const v = [(S1[i].p[0] - S0[i].p[0]) / (2 * DT), (S1[i].p[1] - S0[i].p[1]) / (2 * DT)];
      opp.push({ id: `tk${A.n}:${i}:${Math.round(t / DT)}`, tk: A.n, surf: S[i].surf, kind: "tackle", t0: t, t1: t, p0: [S[i].p[0], S[i].p[1]], v, z: S[i].p[2], r: TK.r, e: TK.e, hit: false }); A.probes++; } }
  // ── after the world tick: the contacts made (the canonical law's own records), the outcome as the possession model saw it ────────────────────
  post(t) { const A = this.act; if (!A) return; const X = this.att.extLog;
    for (let i = this.probeN; i < X.length; i++) { const r = X[i]; if (!String(r.id).startsWith(`tk${A.n}:`)) continue; const surf = r.id.split(":")[1] | 0, b = A.boot(r.t - A.t0);
      const rel = toLocal(r.at, [b.a[0], b.a[1]], b.y), rec = { t: r.t, tau: r.t - A.t0, surface: ["TOE", "INSIDE", "INSIDE", "OUTSIDE"][surf], at: r.at, vIn: r.vIn, vOut: r.vOut, foot: r.foot, dv: hyp(r.vOut[0] - r.vIn[0], r.vOut[1] - r.vIn[1]), rel,
        possBefore: A.hits.length ? A.hits[A.hits.length - 1].possAfter : A.poss0 };
      rec.possAfter = this.att.poss ? this.att.poss.state : null; A.hits.push(rec); }
    this.probeN = X.length; }
  // ── THE OUTCOME (a label for the review — never fed back): from the contacts and the canonical possession record ──────────────────────────────
  // the race for the ball after the contact: the first player to TOUCH it (each through his own canonical possession model) decides — the
  // carrier at once (ATTACKER RECOVERS), the carrier later (POKED LOOSE · CARRIER RE-COLLECTS), the defender (CONTROLLED WIN when his possession
  // reaches CONTROLLED and the carrier does not touch the ball for 1 s; else WON · CONTESTED / DEFENDER TOUCH), nobody (LOOSE BALL)
  classify(t) { const A = this.act, att = this.att, h = A.hits[0];
    if (!h) return { kind: "MISS", why: this.missWhy() };
    const exit = (att.poss.log || []).find((e) => e.from === "CONTROLLED" && e.to === "FREE" && e.t >= h.t - 1e-3 && e.t <= h.t + 1.05);
    const next = att.contacts.find((c) => !c.missed && c.t > h.t + 1e-6), dz = this.def.contacts.find((c) => !c.missed && c.t > h.t);
    if (!exit && att.poss.state === "CONTROLLED" && (!dz || (next && next.t < dz.t))) return { kind: "OPPONENT RETAINS", why: `a minor deflection (Δv ${h.dv.toFixed(1)} m/s): the carrier's control continued (the canonical rule: Δv < 2 m/s and his next touch within 0.6 s)`, next: next ? +(next.t - h.t).toFixed(2) : null };
    if (dz && (!next || dz.t < next.t)) { const won = (this.def.poss.log || []).find((e) => e.to === "CONTROLLED" && e.t >= dz.t - 1e-3), kept = won && !att.contacts.some((c) => !c.missed && c.t > won.t && c.t < won.t + 1.0) && t >= won.t + 1.0 - 1e-6;
      return { kind: won && kept ? "CONTROLLED WIN" : won ? "WON · CONTESTED" : "DEFENDER TOUCH", why: `the defender's own touch ${(dz.t - h.t).toFixed(2)} s after the tackle${won ? `; his possession CONTROLLED at +${(won.t - h.t).toFixed(2)} s` : ""}${won && !kept ? (t < won.t + 1.0 ? "; the replay ends within 1 s of it" : "; the carrier touched it again within 1 s") : ""}`, next: +(dz.t - h.t).toFixed(2), exit: exit ? exit.why : null }; }
    if (next) { const dt = next.t - h.t; return { kind: dt <= 0.6 ? "ATTACKER RECOVERS" : "POKED LOOSE · CARRIER RE-COLLECTS", why: `the ball ${exit ? "left the carrier's control (" + exit.why + ")" : "deflected"}; the carrier's next touch ${dt.toFixed(2)} s after the tackle`, next: +dt.toFixed(2), exit: exit ? exit.why : null }; }
    const B = att.ballTrack(t), Pa = att.stateAt(t).P, Pd = this.def.stateAt(t).P;
    return { kind: "LOOSE BALL", why: `nobody touched it in the ${(t - h.t).toFixed(1)} s after the tackle; the ball ${hyp(B.p[0] - Pd[0], B.p[1] - Pd[1]).toFixed(1)} m from the defender, ${hyp(B.p[0] - Pa[0], B.p[1] - Pa[1]).toFixed(1)} m from the carrier`, exit: exit ? exit.why : null }; }
  // (a miss explained: the boot's closest approach to the ball over the window, the attacker's touches meanwhile, where the ball was predicted)
  missWhy() { const A = this.act, att = this.att; let best = null;
    for (let t = A.tW0; t <= A.tW1 + 1e-9; t += DT) { const B = att.ballTrack(t).p, S = this.spheresAt(t); for (const s of S) { const d = hyp(B[0] - s.p[0], B[1] - s.p[1], max(BR, B[2]) - s.p[2]) - BR - TK.r; if (!best || d < best.gap) best = { gap: d, t, surf: s.surf }; } }
    const touches = att.contacts.filter((c) => !c.missed && c.t >= A.t0 - 1e-6 && c.t <= A.tW1 + 1e-6), Bc = att.ballTrack(A.tC).p, pe = hyp(Bc[0] - A.bp[0], Bc[1] - A.bp[1]);
    const parts = [`closest boot–ball gap ${(best.gap * 100).toFixed(0)} cm at +${(best.t - A.t0).toFixed(2)} s`, `the ball ${(pe * 100).toFixed(0)} cm from where it was predicted at the contact time`];
    if (touches.length) parts.unshift(`the carrier touched the ball ${touches.length}× after commitment (${touches.map((c) => `${c.role || c.src || "touch"} +${(c.t - A.t0).toFixed(2)} s`).join(", ")})`);
    return parts.join(" · "); }
  finalize(t) { if (this.pend && this.pend.state === "PENDING") Object.assign(this.pend, { state: "DECLINED", tEnd: t, reason: this.pend.last || "the replay ended before an opportunity" }); if (this.act && !this.act.outcome) this.act.outcome = this.classify(t); }
  // ── the review record of the committed action (times relative to the request) ────────────────────────────────────────────────────────────────
  summary() { const A = this.act; if (!A) return null; const r = (x) => (x == null ? null : +(x - A.tReq).toFixed(3));
    return { request: 0, commit: r(A.t0), contactPlanned: r(A.tC), window: [r(A.tW0), r(A.tW1)], recoveryStart: r(A.tRec), controlReady: r(A.tCtl), family: A.fam, foot: A.F, support: A.S, c: +A.c.toFixed(2), angle: +(A.ang / DEG).toFixed(1), range: +A.rng.toFixed(2),
      stride: A.stride, approach: +A.s0.toFixed(2), hits: A.hits.map((h) => ({ t: r(h.t), surface: h.surface, vIn: h.vIn.map((x) => +x.toFixed(2)), vOut: h.vOut.map((x) => +x.toFixed(2)), dv: +h.dv.toFixed(2), possBefore: h.possBefore, possAfter: h.possAfter })), outcome: A.outcome }; }
}
