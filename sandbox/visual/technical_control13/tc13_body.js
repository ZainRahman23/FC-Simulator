// ═══ technical_control13/tc13_body.js — TECHNICAL-CONTROL-1.3: ONE CONTINUOUS MOVEMENT from the receive into the carry (the transition / phasing pass) ════
// Owner: receive → turn → first carry looked like separate animations handed over — the knee popped 10 – 20 cm in one frame when the receive's body
// took over from the running gait, the pelvis jumped (1 500 – 3 100 m/s² spikes), the planting foot was yanked over the incoming pass, the far leg of a
// through-stance turn passed through the standing leg. This body (TECHNICAL-CONTROL-1.1's legs) keeps every authoritative fact — contact time, foot,
// surface, ball, launch — and the carry model, and makes the body one movement:
//   · THE HAND-OFF from the running gait: the receive's legs start in the gait's own joint state — the knee's direction, the tibia, the ankle, the
//     toe — and blend into this body's over the hand-off window, the IK on the same feet (the knee cannot jump); a swinging foot keeps the
//     velocity it had (the gait's last frames, recorded by the simulation as presentation data)
//   · THE PELVIS without kinks: the weight shift toward the loaded foot, the reach adaptation, the step cycle's twist and the contact turns are
//     smoothed over ±60 ms (a symmetric kernel: no lag) — the pelvis moves like a body, not a switchboard
//   · CLEARANCE ARCS planned for every swing against the obstacles it will meet — the other leg where it stands (its shin and boot), and the ball
//     on its predicted path — a smooth bump of the foot's path (lift, around, back down), zero at the toe-off, the landing and a touch; the
//     touching leg's own path into a contact behind the standing leg is chosen by the contact search with a clearance cost (the pelvis turn and
//     the hip path, never the ankle)
//   · A LANDING never inside the other foot: a plant keeps its boot clear of the other planted boot
//   · A RESIDUAL CLEARANCE LAYER per frame (the safety net): a swinging boot or shin closer than 1 cm to the planted leg is moved away along the
//     separation, the leg re-solved on its own plan
//   · THE TRANSITION STATE at every contact (planted / free foot, the weight-bearing leg, both feet's positions and velocities, the stride phase,
//     the pelvis, the centre of mass, the body's angular velocity, the contact foot's follow-through) — exposed for the next action and the
//     diagnostics
// Nothing here is read by the simulation (animation ON / OFF and the before / after bodies give identical ball, contacts and results).
import { LegBody, LB } from "../technical_control11/tc11_body.js";
import { TB } from "../technical_control1/tc_body.js";
import { HB } from "../receive_turn11/rt11_body.js";
import { DEG, clamp, s5, wrapA, dir, perp, sgnF } from "../receive_turn1/rt_actions.js";
import { Q, legIK, swivelFor, footOut, ankleFor, ballGap, bootHull, pchip } from "../technical_control11/tc11_leg.js";
import { CarrySim } from "../technical_control12/tc12_core.js";
const DT = 1 / 240, R = 0.11, SIDES = ["R", "L"], hyp = Math.hypot, abs = Math.abs, max = Math.max, min = Math.min, other = (F) => (F === "R" ? "L" : "R");
export const FL = {
  kernel: [[-0.06, 0.06], [-0.04, 0.13], [-0.02, 0.2], [0, 0.22], [0.02, 0.2], [0.04, 0.13], [0.06, 0.06]],   // the pelvis's smoothing (s, weight)
  handoff: 0.16,                         // s: the gait's leg joints blend into this body's
  clr: { shin: 0.052, boot: 0.048, thigh: 0.075, knee: 0.06, ball: 0.11, gap: 0.03 },   // m: capsule radii, the clearance planned between limbs (and around the ball)
  bumpHalf: 0.07, bumpMax: 0.16, bumpIters: 3,                // a clearance bump's half-width (s), its size at most (m), the planning passes
  residual: 0.01,                        // m: the per-frame safety net acts below this separation
};
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
// the closest points between segments [p1, q1] and [p2, q2] (on each), and their distance
function closest(p1, q1, p2, q2) { const d1 = sub(q1, p1), d2 = sub(q2, p2), r = sub(p1, p2), a = dot(d1, d1), e = dot(d2, d2), f = dot(d2, r); let s = 0, t = 0;
  if (a > 1e-12 || e > 1e-12) { if (a <= 1e-12) t = clamp(f / e, 0, 1); else { const c = dot(d1, r); if (e <= 1e-12) s = clamp(-c / a, 0, 1); else { const b = dot(d1, d2), den = a * e - b * b; s = den !== 0 ? clamp((b * f - c * e) / den, 0, 1) : 0; t = (b * s + f) / e; if (t < 0) { t = 0; s = clamp(-c / a, 0, 1); } else if (t > 1) { t = 1; s = clamp((b - c) / a, 0, 1); } } } }
  const c1 = [p1[0] + d1[0] * s, p1[1] + d1[1] * s, p1[2] + d1[2] * s], c2 = [p2[0] + d2[0] * t, p2[1] + d2[1] * t, p2[2] + d2[2] * t]; return { c1, c2, d: hyp(...sub(c1, c2)) }; }
const lerpA = (a, b, t) => a + (b - a) * t;
export class FlowBody extends LegBody {
  get pivotOnEdge() { return true; }
  // A PLANTED FOOT THE BODY HAS TURNED TOO FAR ROUND leaves the turf (TECHNICAL-CONTROL-1.1's early lifts, plus one test): when it would have to pivot
  // more than 110° about the ball of the foot — the hip, tibia and the pivot absorbed the turn, so the leg's residual never rose; in a sprinting
  // 180° turn the required pivot passed the leg's reach round and flipped the foot across in one frame
  earlyLifts() { super.earlyLifts(); const tNow = (this.sim.k - this.sim.rc2.kc) * DT;
    for (const X of SIDES) { const L = this.seg[X]; for (let j = 1; j < L.length; j++) { const s = L[j], ts = L[j - 1].t1; if (s.t0 <= tNow + 0.02 || s.inherited != null) continue; let tr = null;
        for (let t = ts + 0.06; t < s.t0; t += 0.01) { const pf = this.pelvisFull(t + this.tc), ft = pf.feet[X]; if (!ft.planted) break; const st = this.stanceLeg(X, ft, pf); if (abs(st.turn || 0) > 110 * DEG) { tr = t; break; } }
        if (tr != null && tr - 0.01 < s.t0) { s.t0 = max(ts + 0.06, tr - 0.01); s.early = true; s.keys = this.swingKeys(X, s); this._pf = null; } } } }
  constructor(sim, ep, F) {
    super(sim, ep, F); this.kind = "tc13";
    // (the gait's leg joints at the hand-off — only for the episode's first body; a re-plan's body continues from its predecessor)
    this.planJoints2();
  }
  // ── THE GAIT'S LEG STATE at the hand-off (the running gait's pose, joint channels as this body's: ψ, τ, fy, fp, fr, toe) ───────────────────────
  gaitLegs() { if (this._gl !== undefined) return this._gl; const P = this.init && this.init.pose; this._gl = null; if (!P || !P.rot.thigh_R) return null; const o = {};
    for (const X of SIDES) { const Th = P.rot["thigh_" + X], Sh = P.rot["shin_" + X], Ft = P.rot["foot_" + X], To = P.rot["toe_" + X]; if (!Th || !Sh || !Ft) return null; const f = Q.toYXZ(Ft), k = Math.atan2(Sh[7], Sh[4]), M = Q.mul(Q.x(-k), Sh);
      o[X] = [Math.atan2(-Th[6], Th[0]), Math.atan2(M[2], M[0]), f[0], f[1], f[2], To ? Math.atan2(To[7], To[4]) : 0]; }
    this._gl = o; return o; }
  // ── THE PELVIS, smoothed (the raw pelvis — TECHNICAL-CONTROL-1.1's — at the kernel's times; offsets from the root and the rotation's angles averaged)
  pelvisFull(tAbs, ballLocal) {
    if (this._pfS && this._pfS.tAbs === tAbs && this._pfS.ball === ballLocal) return this._pfS.v;
    const raw0 = super.pelvisFull(tAbs, ballLocal), base = Object.assign({}, raw0), ep = this.ep; let dP = [0, 0], pel = [0, 0, 0], ang = [0, 0, 0], wS = 0;
    // (near the episode's start the kernel shrinks symmetrically: the hand-off frame is the gait's own pelvis, not pulled toward later frames)
    for (const [dt, w] of FL.kernel) { if (abs(dt) > tAbs + 1e-9 && dt !== 0) continue; const ta = tAbs + dt, r = dt === 0 ? raw0 : super.pelvisFull(ta, undefined), R0 = ep.rootAt(r.t), e = Q.toYXZ(r.Rp);
      dP = [dP[0] + w * (r.P[0] - R0[0]), dP[1] + w * (r.P[1] - R0[1])]; pel = pel.map((x, i) => x + w * r.pelvis[i]); ang = [ang[0] + w * e[0], ang[1] + w * e[1], ang[2] + w * e[2]]; wS += w; }
    const R0 = ep.rootAt(base.t); let Pw = [R0[0] + dP[0] / wS, R0[1] + dP[1] / wS], pw = pel.map((x) => x / wS), aw = ang.map((x) => x / wS), rot = Object.assign({}, raw0.pose.rot);
    // THE HAND-OVER ACROSS A RE-PLAN: this plan's pelvis and upper body start where the previous plan's were at the re-plan, blending in over 120 ms
    const C = this._carry; if (C && base.t >= C.t0 - 1e-6 && base.t < C.t0 + C.dur) { const w = 1 - s5((base.t - C.t0) / C.dur); Pw = [Pw[0] + w * C.dP[0], Pw[1] + w * C.dP[1]]; pw = pw.map((x, i) => x + w * C.dPel[i]); aw = aw.map((x, i) => x + w * C.dAng[i]);
      for (const k of Object.keys(C.rot)) if (rot[k]) rot[k] = Q.slerp(rot[k], C.rot[k], w); }
    base.P = Pw; base.pelvis = pw; base.Rp = Q.yxz(aw[0], aw[1], aw[2]); base.pose = { rot: Object.assign(rot, { pelvis: base.Rp }), pelvisPos: base.pelvis };
    this._pf = null; this._pfS = { tAbs, ball: ballLocal, v: base }; return base;
  }
  // ── A FOOT: TECHNICAL-CONTROL-1's path + the planned clearance bump (a swinging foot only) ────────────────────────────────────────────────────
  footAt(X, t) { let f = super.footAt(X, t); if (f.planted) return f; const s = this.segAt ? this.segAt(X, t) : null; if (!s) return f;
    const o = this.orbitOf(X, s); if (o && t > o.ta && t < o.tb) { const p = this.orbitAt(o, f.ank, t); f = Object.assign({}, f, { ank: [p[0], p[1], f.ank[2]], orbit: hyp(p[0] - f.ank[0], p[1] - f.ank[1]) }); }
    if (!this._bumps || !s.bumps || !s.bumps.length) return f;
    const b = this.bumpAt(s, t); if (!b) return f; return Object.assign({}, f, { ank: [f.ank[0] + b[0], f.ank[1] + b[1], max(HB.ankleH - 0.012, f.ank[2] + b[2])], bumped: hyp(...b) }); }
  // A SWING ROUND A PLANTED FOOT WHILE THE BODY TURNS (a pivot): TECHNICAL-CONTROL-1's swing goes straight across the turf from lift to landing; with
  // the body turning 90 – 180° over that stance in a tenth of a second, the straight line sweeps the swinging foot through the standing leg as the
  // body turns past it. Here the swing is planned in the TURNING body's frame about the standing ankle — the foot keeps its own side and travels
  // round with the turn, from its lift to its landing (both unchanged) — after any contact of the swing (the contact itself is untouched)
  orbitOf(X, s) { if (s._orbK === s.keys && s._orbI === s.inherited) return s._orb; s._orbK = s.keys; s._orbI = s.inherited; s._orb = null;
    let ta = max(s.t0, s.inherited != null ? s.inherited : -9); const tb = s.t1; if (s.con && s.con.t >= ta - 1e-6 && s.con.t < tb) ta = s.con.t + 0.01; if (tb - ta < 0.08) return null;
    const Y = other(X), fa = super.footAt(Y, ta), fm = super.footAt(Y, (ta + tb) / 2), fb = super.footAt(Y, tb - 1e-4); if (!fa.planted || !fm.planted || !fb.planted || hyp(fa.ank[0] - fb.ank[0], fa.ank[1] - fb.ank[1]) > 0.01) return null;
    const ps = [], n = max(2, Math.ceil((tb - ta) / 0.005)); let acc = this.ep.psiAt(ta), last = acc; for (let i = 0; i <= n; i++) { const q = this.ep.psiAt(ta + (tb - ta) * i / n); acc += wrapA(q - last); last = q; ps.push(acc); }
    const dPsi = ps[n] - ps[0]; if (abs(dPsi) < 20 * DEG) return null; const O = fa.ank.slice(0, 2), b0 = super.footAt(X, ta).ank, b1 = super.footAt(X, tb - 1e-4).ank;
    const rel = (b, q) => { const d = [b[0] - O[0], b[1] - O[1]]; return [d[0] * dir(q)[0] + d[1] * dir(q)[1], d[0] * perp(q)[0] + d[1] * perp(q)[1]]; };
    return (s._orb = { ta, tb, O, ps, n, b0, b1, rel0: rel(b0, ps[0]), rel1: rel(b1, ps[n]), w: s5((abs(dPsi) / DEG - 20) / 25) }); }
  orbitAt(o, b, t) { const c = [o.b1[0] - o.b0[0], o.b1[1] - o.b0[1]], cc = c[0] * c[0] + c[1] * c[1], u = cc > 1e-6 ? clamp(((b[0] - o.b0[0]) * c[0] + (b[1] - o.b0[1]) * c[1]) / cc, 0, 1) : clamp((t - o.ta) / (o.tb - o.ta), 0, 1);
    const x = clamp((t - o.ta) / (o.tb - o.ta), 0, 1) * o.n, i = min(o.n - 1, Math.floor(x)), q = o.ps[i] + (o.ps[i + 1] - o.ps[i]) * (x - i), r = [lerpA(o.rel0[0], o.rel1[0], u), lerpA(o.rel0[1], o.rel1[1], u)];
    const p = [o.O[0] + r[0] * dir(q)[0] + r[1] * perp(q)[0], o.O[1] + r[0] * dir(q)[1] + r[1] * perp(q)[1]], k = o.w * s5((t - o.ta) / 0.04) * s5((o.tb - t) / 0.03); return [b[0] + (p[0] - b[0]) * k, b[1] + (p[1] - b[1]) * k]; }
  bumpAt(s, t) { let o = [0, 0, 0], any = false; const tA = s.inherited != null ? max(s.t0, s.inherited) : s.t0, taper = s5((t - tA) / 0.035) * s5((s.t1 - t) / 0.035) * (s.con ? s5(abs(t - s.con.t) / 0.045) : 1);
    if (taper <= 0) return null; for (const B of s.bumps) { const u = (t - B.t) / FL.bumpHalf; if (abs(u) >= 1) continue; const k = 0.5 * (1 + Math.cos(Math.PI * u)); o = [o[0] + B.v[0] * k, o[1] + B.v[1] * k, o[2] + B.v[2] * k]; any = true; }
    if (!any) return null; const l = hyp(...o); if (l > FL.bumpMax) o = o.map((x) => x * FL.bumpMax / l); return o.map((x) => x * taper); }
  // the other leg as an obstacle at time t: its planted boot and shin (from the planted ankle toward the hip at the shank's length), 2D-local + height
  // a leg's joints at time t from the IK on its planned foot (the knee bent where the leg plane puts it — the foot's own yaw sets the swivel)
  legJoints(X, t, pf, f) { const hip = this.hipAt(pf, X), aM = this.toM(f.ank, pf.P, pf.psi), Rf = Q.y(wrapA(f.yaw - pf.psi)), psiK = swivelFor(footOut(pf.Rp, Rf, X), X), ik = legIK(this.b, pf.Rp, psiK, hip, aM, LB.kMin);
    const kneeM = Q.v(Q.mul(pf.Rp, ik.Rthigh), [0, -this.b.thigh, 0]).map((x, i) => x + hip[i]); return { hip: this.fromM(hip, pf.P, pf.psi), knee: this.fromM(kneeM, pf.P, pf.psi), ankle: f.ank.slice() }; }
  // the posed toe tip of a swinging foot (its joint plan on the leg's IK), 2D-local + height
  posedLeg(X, s, f, pf, t) { const L = this.swingLeg(X, s, f, pf, t), Rth = Q.mul(pf.Rp, L.ik.Rthigh), Rf = Q.mul3(Rth, Q.x(L.ik.k), Q.mul(Q.y(L.v[1]), Q.yxz(L.v[2], L.v[3], L.v[4]))), d = Q.v(Rf, [0, -this.mtpY, 0.24]), hip = this.hipAt(pf, X), kn = Q.v(Rth, [0, -this.b.thigh, 0]);
    return { toe: this.fromM([L.an[0] + d[0], L.an[1] + d[1], L.an[2] + d[2]], pf.P, pf.psi), knee: this.fromM([hip[0] + kn[0], hip[1] + kn[1], hip[2] + kn[2]], pf.P, pf.psi) }; }
  toePosed(X, s, f, pf, t) { return this.posedLeg(X, s, f, pf, t).toe; }
  // (the other leg's own estimate, not its posed swing: two swinging legs each clear half, and a posed obstacle moving with its own re-plan oscillates)
  legObstacle(Y, t) { const fY = this.footAt(Y, t), pf = super.pelvisFull(t + this.tc, undefined), J = this.legJoints(Y, t, pf, fY), toe = [fY.ank[0] + dir(fY.yaw)[0] * 0.24, fY.ank[1] + dir(fY.yaw)[1] * 0.24, fY.planted ? 0.05 : max(0.04, fY.ank[2] - 0.03)];
    return { ankle: J.ankle, knee: J.knee, toe, hip: J.hip, swinging: !fY.planted }; }
  // ── THE CLEARANCE PLAN: every swing sampled every 10 ms against the planted other leg and the ball's predicted path; each violation adds a smooth
  // bump away from the obstacle (and up); three passes ────────────────────────────────────────────────────────────────────────────────────────
  planClearance(only) { this._bumps = true; const C = FL.clr, rec = this.clearLog || [], tNow = (this.sim.k - this.sim.rc2.kc) * DT;
    for (const X of SIDES) { const Y = other(X);
      for (const s of this.seg[X]) { if (only && s !== only) continue; if (s.t1 < tNow - 0.02 || s.t0 > tNow + 2.5) { s.bumps = s.bumps || []; continue; } s.bumps = []; if (s.t1 - s.t0 < 0.06) continue;
        let lastNeed = 0, lastWhat = null;
        for (let it = 0; it < FL.bumpIters; it++) { let added = 0; lastNeed = 0;
          for (let t = max(s.t0, s.inherited != null ? s.inherited : -9) + 0.03; t < s.t1 - 0.03; t += 0.01) { const f = this.footAt(X, t); if (f.planted) continue; let toe = [f.ank[0] + dir(f.yaw)[0] * 0.22, f.ank[1] + dir(f.yaw)[1] * 0.22, max(0.04, f.ank[2] - 0.03)];
            const pf = super.pelvisFull(t + this.tc, undefined), JX = this.legJoints(X, t, pf, f), hip = JX.hip; let knee = JX.knee;
            // (the swing's own joint plan once there is one — its hip swivel places the knee, and a boot pointed for the laces hangs its toe 20 cm lower)
            if (s.J) { const P = this.posedLeg(X, s, f, pf, t); toe = P.toe; knee = P.knee; JX.knee = knee; }
            let need = null, legV = [0, 0, 0], legM = 0; const O = this.legObstacle(Y, t);
            // (boot and shin against the other shin and boot; the thigh and knee against the other thigh — a leg swinging round the standing one)
            if (O) for (const [a1, b1, rA, a2, b2, rB] of [[f.ank, toe, C.boot, O.ankle, O.knee, C.shin], [f.ank, toe, C.boot, O.ankle, O.toe, C.boot], [f.ank, knee, C.shin, O.ankle, O.knee, C.shin], [f.ank, knee, C.shin, O.ankle, O.toe, C.boot],
                [hip, knee, C.thigh, O.hip, O.knee, C.thigh], [knee, knee, C.knee, O.hip, O.knee, C.thigh]]) { const q = closest(a1, b1, a2, b2), gap = q.d - rA - rB;
              if (gap < C.gap) { let u = sub(q.c1, q.c2); u[2] = max(0, u[2]) + 0.25 * hyp(u[0], u[1]); const ul = hyp(...u); u = ul > 1e-6 ? u.map((x) => x / ul) : [0, 0, 1]; const m = C.gap - gap; legV = legV.map((x, i) => x + u[i] * m); legM = max(legM, m); } }
            // (every pair the leg overlaps pushes at once — the worst alone would clear the boot by crossing the thighs — at the deepest one's size)
            if (legM > 0) { const l = hyp(...legV); const u = l > 1e-6 ? legV.map((x) => x / l) : [0, 0, 1]; if (!need || legM > need.m) need = { m: legM, u, what: "leg" }; }
            if (!(s.con && abs(t - s.con.t) < 0.07)) { const Bp = this.ballAt(t); if (Bp) { const q = closest(f.ank, toe, Bp, Bp), gap = q.d - C.boot - C.ball; if (gap < C.gap * 0.6) { let u = sub(q.c1, q.c2); u[2] = max(0, u[2]) + 0.6 * hyp(u[0], u[1]); const ul = hyp(...u); u = ul > 1e-6 ? u.map((x) => x / ul) : [0, 0, 1]; const m = C.gap * 0.6 - gap; if (!need || m > need.m) need = { m, u, what: "ball" }; } } }
            // (a pointed toe never into the turf)
            if (toe[2] < 0.012 && !(s.con && abs(t - s.con.t) < 0.03)) { const m = 0.012 - toe[2]; if (!need || m > need.m) need = { m, u: [0, 0, 1], what: "turf" }; }
            if (need && O && O.swinging && need.what === "leg") need.m *= 0.55;           // (two swinging legs: each takes half, the other one's pass does the rest)
            if (need) { s.bumps.push({ t, v: need.u.map((x) => x * need.m * 1.15) }); added++; rec.push({ X, t: +t.toFixed(3), what: need.what, cm: +(need.m * 100).toFixed(1) }); if (need.m > lastNeed) { lastNeed = need.m; lastWhat = need.what; } } }
          if (!added) break; }
        // FLAGGED EARLY: a swing whose clearance the plan could not resolve (still > 2 cm after every pass) — the contact it carries (or its landing) is
        // flagged when first planned, before it is executed (presentation data; the simulation is untouched)
        if (lastNeed > 0.02 && this.sim.rc2) { const F = this.sim.rc2._tc13flags || (this.sim.rc2._tc13flags = []), key = `${X}|${s.con ? "c" + s.con.i : s.t1.toFixed(2)}`;
          if (!F.some((f) => f.key === key)) F.push({ key, X, contact: s.con ? s.con.i : null, tContact: s.con ? +s.con.t.toFixed(3) : null, swing: [+s.t0.toFixed(3), +s.t1.toFixed(3)], plannedAt: +tNow.toFixed(3), cm: +(lastNeed * 100).toFixed(1), against: lastWhat, kind: "clearance unresolved at planning" }); } } }
    this.clearLog = rec.slice(-200);
  }
  // CONTINUITY ACROSS RE-PLANS (TECHNICAL-CONTROL-1.1's, with the clearance re-planned on the swing in progress — from now: the inherited path
  // already carries the previous body's arc)
  inherit(prev, tNow) { LegBody.prototype.__proto__.inherit.call(this, prev, tNow); if (!prev || !prev.legStateAt) return;
    // (TECHNICAL-CONTROL-1 resumed a swing in progress with the new plan's keys from 25 ms on — a foot whose path the re-plan moved had to catch
    // up in 25 ms; a foot the re-plan lifted out of a stance left the turf at once, at full swing pace. Here the swing in progress keeps the
    // foot's state now and reaches the new path over 60 ms — 80 ms for a foot just lifted out of its stance — never a snap)
    // A LATE LIFT: the re-plan lifts NOW a foot the previous plan still had planted — its heel had not begun to rise (TECHNICAL-CONTROL-1's toe-off
    // heel rise is scheduled over the 60 ms BEFORE a lift, already past): the foot stays down 50 ms more and peels its heel from where it is, then
    // leaves (presentation: the swing's contact, if any, keeps ≥ 80 ms; the gait's own lift times are the simulation's)
    // (the pelvis and the upper body as the previous plan had them now — the offsets this plan blends out)
    // (what the previous body actually POSED in its last frames — re-evaluating it now would read the episode's revised future plan — extrapolated
    // one frame to now)
    const H = prev._posed && prev._posed.length === 2 ? prev._posed : null, ex = (k) => { const [a0, a1] = H, u = (tNow - a1.t) / max(1e-6, a1.t - a0.t); return a1[k].map((x, i) => x + (x - a0[k][i]) * u); };
    this._prevPosed = H ? { P: ex("P"), pelvis: ex("pelvis"), ang: H[1].ang, rot: H[1].rot, legs: { R: ex("vR"), L: ex("vL") }, legsRate: { R: H[1].vR.map((x, i) => (x - H[0].vR[i]) / max(1e-6, H[1].t - H[0].t)), L: H[1].vL.map((x, i) => (x - H[0].vL[i]) / max(1e-6, H[1].t - H[0].t)) } } : null;
    this._late = this._late || {};
    for (const X of SIDES) { const s = this.seg[X].find((q) => q.t0 <= tNow + 1e-6 && q.t1 > tNow); if (!s || s.inherited !== tNow) continue; const pf0 = prev.footAt(X, tNow); if (!pf0.planted) continue;
      const st0 = prev.legStateAt(X, tNow), pp0 = st0 && st0.planted ? -st0.v[5] : 0, lim = s.con ? s.con.t - 0.08 : s.t1 - 0.1, t0n = min(tNow + 0.05, lim); if (t0n <= tNow + 0.01) continue;
      s.t0 = t0n; s.inherited = null; s.lateLift = tNow; this._late[X] = { t0: tNow, t1: t0n, pp0 };
      s.from = { pos: pf0.ank.slice(0, 2), yaw: pf0.yaw }; s.keys = this.swingKeys(X, s); this._pf = null; this._pfS = null; }
    for (const X of SIDES) { const s = this.seg[X].find((q) => q.t0 <= tNow + 1e-6 && q.t1 > tNow); if (!s || !s.keys || s.inherited !== tNow) continue; const wasDown = prev.footAt(X, tNow).planted, gap = min(wasDown ? 0.08 : 0.06, 0.45 * (s.t1 - tNow));
      const K = s.keys, i0 = K.findIndex((k) => k.t >= tNow - 1e-6); if (i0 < 0) continue; const keep = K.slice(0, i0 + 1), rest = K.slice(i0 + 1).filter((k) => k.t > tNow + gap || k.contact || abs(k.t - s.t1) < 1e-6);
      if (wasDown && keep.length) { const k0 = keep[keep.length - 1]; k0.v = [k0.v[0] * 0.3, k0.v[1] * 0.3, max(0.15, k0.v[2])]; }
      s.keys = keep.concat(rest.length ? rest : K.slice(-1)); }
    const fl = this.sim.rc2 && (this.sim.rc2._tc11flags || (this.sim.rc2._tc11flags = []));
    for (const c of this.contactsKnown) { if (c.planned || abs(c.t - tNow) > 0.02) continue; const p0 = prev.contactsKnown.find((q) => q.i === c.i); if (!p0 || !p0.planned) continue;
      const a0 = Math.atan2(...prev.impulseDir(p0).slice().reverse()), a1 = Math.atan2(...this.impulseDir(c).slice().reverse()), dA = abs(wrapA(a1 - a0)) / DEG; if (p0.surface !== c.surface || dA > 25 || p0.F !== c.F) { if (fl && !fl.some((f) => f.i === c.i)) fl.push({ i: c.i, t: +c.t.toFixed(3), F: c.F, planned: p0.surface, executed: c.surface, dImpulse: +dA.toFixed(0), kind: "late decision" }); } }
    for (const X of SIDES) { const late = this.seg[X].find((q) => q.lateLift === tNow); if (late) { this.planClearance(late); this.planSwing(X, late); continue; }   // (it leaves from its stance)
      const s = this.seg[X].find((q) => q.t0 <= tNow && q.t1 > tNow); if (!s) continue; this.planClearance(s); const PP = this._prevPosed;
      if (PP) { this.planSwing(X, s, { t: tNow, v: PP.legs[X].slice(), s: PP.legsRate[X].slice() }); continue; }
      const a = prev.legStateAt(X, tNow), a1 = prev.legStateAt(X, tNow - DT); this.planSwing(X, s, { t: tNow, v: a.v, s: a.v.map((x, i) => (x - a1.v[i]) / DT) }); }
    // (the carry is measured against THIS plan once final — its late-held feet and re-keyed swings move the pelvis's reach)
    const carry = () => {
    { const tA = tNow + this.tc; this._carry = null; this._pf = null; this._pfS = null; const b = this.pelvisFull(tA, undefined), eb = Q.toYXZ(b.Rp), A = this._prevPosed || (() => { const a = prev.pelvisFull(tA, undefined); return { P: a.P, pelvis: a.pelvis, ang: Q.toYXZ(a.Rp), rot: a.pose.rot }; })(), rot = {};
      for (const k of ["spine", "chest", "neck", "head", "clavicle_R", "clavicle_L", "upperArm_R", "upperArm_L", "foreArm_R", "foreArm_L", "hand_R", "hand_L"]) if (A.rot[k]) rot[k] = A.rot[k];
      this._carry = { t0: tNow, dur: 0.12, dP: [A.P[0] - b.P[0], A.P[1] - b.P[1]], dPel: A.pelvis.map((x, i) => x - b.pelvis[i]), dAng: [wrapA(A.ang[0] - eb[0]), A.ang[1] - eb[1], A.ang[2] - eb[2]], rot }; this._pf = null; this._pfS = null; } };
    carry();
    // (a late-held foot stays down only while the leg can still reach it with the heel at its push-off limit — a sprinting body leaves it sooner;
    // what remains of the hold is the heel's peel)
    { const b = this.b, my = this.mtpY, mz = this.mtpZ, dL = 0.97 * b.legLen, pMax = LB.pushMax, back = mz * Math.cos(pMax) - my * Math.sin(pMax), up = my * Math.cos(pMax) + mz * Math.sin(pMax); let changed = false;
      for (const X of SIDES) { const Lt = this._late[X], s = this.seg[X].find((q) => q.lateLift === tNow); if (!Lt || !s || abs(Lt.t0 - tNow) > 1e-6) continue; let tr = null;
        for (let t = tNow + 0.005; t <= Lt.t1 + 1e-6; t += 0.005) { const pf = this.pelvisFull(t + this.tc), ft = pf.feet[X]; if (!ft.planted || !ft.ballPt) break; const ball = ft.ballPt;
          const ank = [ball[0] - dir(ft.yaw)[0] * back, ball[1] - dir(ft.yaw)[1] * back, HB.ankleH - my + up], an = this.toM(ank, pf.P, pf.psi), hip = this.hipAt(pf, X); if (hyp(an[0] - hip[0], an[1] - hip[1], an[2] - hip[2]) > dL) { tr = t; break; } }
        if (tr == null) continue; const t0n = max(tNow + 0.01, tr - 0.005); if (t0n >= Lt.t1 - 1e-6) continue; s.t0 = t0n; Lt.t1 = t0n; s.keys = this.swingKeys(X, s); this._pf = null; this._pfS = null; this.planClearance(s); this.planSwing(X, s); changed = true; }
      if (changed) carry(); }
    this._pf = null; this._pfS = null; }
  // THE RECEIVE'S STANDING FOOT clear of the incoming ball (TECHNICAL-CONTROL-1's run-in planted it on the technique's standing spot as given; the
  // pass then ran into the landing boot and the per-frame avoidance yanked it up): every run-in landing gets the same clearance as any plant — the
  // ball's predicted path and the other foot — the next swing re-keyed from it (presentation: the receive's contact itself is untouched)
  buildFeet() { super.buildFeet(); if (!this.seg) return;
    // (… and every landing once both feet's swings exist — the right foot's landings are placed before the left foot's swings and contacts are
    // built: a landing beside the spot where the other boot plays the ball next is seen only now)
    for (const X of SIDES) { const L = this.seg[X], Y = other(X); for (let i = 0; i < L.length; i++) { const s = L[i]; if (!s.to) continue; if (!s.runIn && !this.seg[Y].some((q) => q.con && q.con.t > s.t1 - 0.03 && q.con.t < s.t1 + 0.3)) continue;
        const p = this.plantClear(X, this.reachClamp(X, s.to.pos, s.t1), s.to.yaw, s.t1); if (hyp(p[0] - s.to.pos[0], p[1] - s.to.pos[1]) < 1e-4) continue;
        s.to = { pos: p, yaw: s.to.yaw }; s.keys = this.swingKeys(X, s); s.standMoved = true; const n = L[i + 1]; if (n) { n.from = { pos: p.slice(), yaw: s.to.yaw }; n.keys = this.swingKeys(X, n); } } } }
  // THE REACH ADAPTATION without a switch: a planted foot's pull on the pelvis ramps in over 80 ms from its touchdown (TECHNICAL-CONTROL-1 pulled at
  // full strength from the touchdown frame — a 4 cm pelvis jump when a foot landed at the edge of its reach); a touching foot's as before
  // (… and until its lift, fading over the 60 ms after it — the pull holds a planted leg as long as it stands)
  reachWeight(X, fX, t, touch) { if (!fX.planted) return max(touch, fX.since != null ? 1 - s5(fX.since / 0.06) : 0); const L = this.seg[X], pv = L.filter((q) => q.t1 <= t + 1e-9).pop(), tTD = pv ? pv.t1 : -9;
    return max(touch, s5((t - tTD) / 0.08)); }
  // A PLANT WITHIN REACH: the landing no further from the hip (at the touchdown) than the leg reaches with the knee a little bent — the stride
  // lands where the leg can take the weight, so the pelvis need not be pulled to it
  reachClamp(X, pos, t1) { const e = this.hipEst(X, t1, null), hip = this.fromM(e.hip, e.P, e.psi), H = hip[2] - HB.ankleH + 0.02, rMax = Math.sqrt(max(0.01, (0.95 * this.b.legLen) ** 2 - H * H));
    const d = [pos[0] - hip[0], pos[1] - hip[1]], dl = hyp(d[0], d[1]); return dl <= rMax ? pos : [hip[0] + d[0] / dl * rMax, hip[1] + d[1] / dl * rMax]; }
  // (the reach first, then the clearances — the ball's path and the other foot — so that a reach correction never moves a plant back into them)
  landAt(X, t) { const L = super.landAt(X, t); L.pos = this.plantClear(X, this.reachClamp(X, L.pos, t), L.yaw, t); return L; }
  landAfterTouch(X, c, s) { const L = super.landAfterTouch(X, c, s); L.pos = this.plantClear(X, this.reachClamp(X, L.pos, s.t1), L.yaw, s.t1); return L; }
  // a plant clear of the other planted boot as well as the ball (TECHNICAL-CONTROL-1.1's plantClear + the other foot)
  plantClear(X, pos, yaw, t1) { let p = super.plantClear(X, pos, yaw, t1); const Y = other(X), fP = super.footAt(Y, t1 + 0.01), obs = [];
    if (fP.planted) obs.push(Object.assign({ need: 0.02 }, fP));
    // (… and the other boot where it will play the ball while this foot stands — a landing beside the spot of the other foot's coming contact is
    // stood on before that boot arrives there; 6 cm, as the boot turns on its surface there, which this flat test does not see)
    for (const s of this.seg[Y]) if (s.con && s.con.t > t1 - 0.03 && s.con.t < t1 + 0.3) { const fc = super.footAt(Y, s.con.t); obs.push(Object.assign({ need: 0.06 }, fc)); }
    if (!obs.length) return p; const fY = obs[0];
    const H = LegBody.hull(this.sim); if (!H) return p; const gap1 = (q, o) => { const a1 = [q[0], q[1], 0.05], b1 = [q[0] + dir(yaw)[0] * 0.24, q[1] + dir(yaw)[1] * 0.24, 0.05], a2 = [o.ank[0], o.ank[1], 0.05], b2 = [o.ank[0] + dir(o.yaw)[0] * 0.24, o.ank[1] + dir(o.yaw)[1] * 0.24, 0.05]; return closest(a1, b1, a2, b2).d - 2 * FL.clr.boot; };
      // (the boots as segments ankle → toe, flat on the turf)
    const gapTo = (q) => min(...obs.map((o) => gap1(q, o) - o.need)) + 0.02;
    // (away from the other foot along their separation — a crossed stance, as after a through-stance turn, stays crossed but clear; it is not
    // pushed to "its own side" through the standing leg)
    if (gapTo(p) >= 0.02) return p; const near = obs.reduce((a, o) => (gap1(p, o) - o.need < gap1(p, a) - a.need ? o : a), fY), ux = [p[0] - near.ank[0], p[1] - near.ank[1]], ul = hyp(ux[0], ux[1]), psi = this.ep.psiAt(t1), sx = sgnF(X), side = ul > 0.02 ? [ux[0] / ul, ux[1] / ul] : [-Math.sin(psi) * sx, Math.cos(psi) * sx];
    for (let d = 0.02; d <= 0.24; d += 0.02) { const q = [p[0] + side[0] * d, p[1] + side[1] * d]; if (gapTo(q) >= 0.02) return q; } return [p[0] + side[0] * 0.24, p[1] + side[1] * 0.24]; }
  planJoints() { if (this._planned2) return super.planJoints(); }      // (TECHNICAL-CONTROL-1.1's constructor plans before the clearance: deferred to planJoints2)
  planJoints2() { this._planned2 = true; this.planClearance(); this._pf = null; this._pfS = null; this.handoffVel(); super.planJoints();
    // (a second round on the posed toes: the clearance again with the swings' joint plans, then the joints on the final paths)
    this.planClearance(); this._pf = null; this._pfS = null; super.planJoints(); }
  // the first swing of a moving receive starts with the velocity the running gait's foot had (TECHNICAL-CONTROL-1 started it at rest, 0.25 m/s up)
  // (TECHNICAL-CONTROL-1 keyed that swing from 50 ms before the hand-off: the key moves to the hand-off frame itself, where the gait left the foot)
  handoffVel() { const H = this.sim._footHist; if (!H || H.length < 2 || !this.init.pose || this._hoDone) return; const a = H[H.length - 2], b = H[H.length - 1], t0 = -this.tc;
    for (const X of SIDES) { const s = this.seg[X][0]; if (!s || !s.keys || !s.keys.length || this.init.feet[X].air == null || s.t0 > t0 + 0.02) continue; const pa = this.F.loc([a[X][0], a[X][1], -a[X][2]]), pb = this.F.loc([b[X][0], b[X][1], -b[X][2]]);
      const k0 = { t: t0, p: pb.slice(), v: [(pb[0] - pa[0]) / DT, (pb[1] - pa[1]) / DT, (pb[2] - pa[2]) / DT], yaw: s.keys[0].yaw, pitch: s.keys[0].pitch }; s.keys = [k0].concat(s.keys.slice(1).filter((k) => k.t > t0 + 0.012)); if (s.keys.length < 2) s.keys.push({ t: s.t1, p: [s.to.pos[0], s.to.pos[1], HB.ankleH], v: [0, 0, -0.4], yaw: s.to.yaw, pitch: 0 }); }
    this._hoDone = true; }
  toeOffPitch(X, tLift) { const my = this.mtpY, mz = this.mtpZ; return Math.asin(clamp(this.toeOffLift(hyp(...this.ep.velAt(tLift))) / hyp(my, mz), 0, 0.9)); }
  // … and keeps it: every rule's heel (dorsiflexion rise, push-off, the pivot, the edge roll) blends in over the window, from the gait's
  heelFinal(X, t, out) { const tAbs = t + this.tc; if (!this._heel0 || tAbs >= FL.handoff) return null; const w = s5(tAbs / FL.handoff); return { pp: lerpA(this._heel0[X], out.pp, w), dy: out.dy * w, rho: out.rho * w }; }
  // a planted foot at the hand-off starts with the gait's own heel (its ankle height then), blending into this body's heel over the window
  heelStart(X, t, sched) { const Lt = this._late && this._late[X]; if (Lt && t >= Lt.t0 - 1e-6 && t <= Lt.t1 + 1e-6) { const pTO = this.toeOffPitch(X, Lt.t1); return lerpA(Lt.pp0, max(sched, pTO), s5((t - Lt.t0) / max(1e-3, Lt.t1 - Lt.t0))); }
    const H = this.sim._footHist, tAbs = t + this.tc; if (!H || !H.length || !this.init.pose || tAbs >= FL.handoff) return sched;
    if (!this._heel0) { this._heel0 = {}; const b = H[H.length - 1], my = this.mtpY, mz = this.mtpZ; for (const Y of SIDES) { const h = b[Y][1]; let lo = 0, hi = 70 * DEG; const f = (p) => HB.ankleH - my + my * Math.cos(p) + mz * Math.sin(p);
        if (f(0) >= h) { this._heel0[Y] = 0; continue; } for (let i = 0; i < 20; i++) { const m = (lo + hi) / 2; if (f(m) < h) lo = m; else hi = m; } this._heel0[Y] = (lo + hi) / 2; } }
    const w = s5(tAbs / FL.handoff); return lerpA(this._heel0[X], sched, w); }
  // ── the leg channels: the gait's joint state blended in over the hand-off ────────────────────────────────────────────────────────────────────
  // (a planted foot keeps its foothold: only the knee's direction blends — the ankle is re-solved for the foot as it stands on the turf; a swinging
  // foot blends every channel)
  blendGait(X, L, tAbs) { const G = this.gaitLegs(); if (!G || tAbs >= FL.handoff) return L; const w = s5(tAbs / FL.handoff), g = G[X], pf = this._pfS ? this._pfS.v : null; if (!pf) return L;
    const hip = this.hipAt(pf, X), psi = lerpA(g[0], L.v[0], w), ik = legIK(this.b, pf.Rp, psi, hip, L.an, LB.kMin);
    if (L.planted && L.Rf) { const A = ankleFor(Q.mul3(pf.Rp, ik.Rthigh, Q.x(ik.k)), L.Rf, X, ik.k); return Object.assign({}, L, { v: [psi, A.tau, A.fy, A.fp, A.fr, L.v[5]], ik }); }
    return Object.assign({}, L, { v: L.v.map((x, i) => (i === 0 ? psi : lerpA(g[i], x, w))), ik }); }
  // ── THE RESIDUAL CLEARANCE (per frame): a swinging boot / shin within 1 cm of the planted leg moves away, the leg re-solved ──────────────────────
  legPts(pf, X, L) { const hip = this.hipAt(pf, X), knee = Q.v(Q.mul(pf.Rp, L.ik.Rthigh), [0, -this.b.thigh, 0]).map((x, i) => x + hip[i]), Rf = Q.mul3(pf.Rp, L.ik.Rthigh, Q.mul3(Q.x(L.ik.k), Q.y(L.v[1]), Q.yxz(L.v[2], L.v[3], L.v[4])));
    const toe = Q.v(Rf, [0, -0.04, 0.22]).map((x, i) => x + L.an[i]); return { hip, knee, ankle: L.an, toe }; }
  residual(pf, X, s, ft, L, LY, t) { const a = this.legPts(pf, X, L), b = this.legPts(pf, other(X), LY), C = FL.clr; let worst = null;
    for (const [p1, q1, r1, p2, q2, r2] of [[a.ankle, a.toe, C.boot, b.knee, b.ankle, C.shin], [a.ankle, a.toe, C.boot, b.ankle, b.toe, C.boot], [a.knee, a.ankle, C.shin, b.knee, b.ankle, C.shin], [a.knee, a.ankle, C.shin, b.ankle, b.toe, C.boot],
        [a.hip, a.knee, C.thigh, b.hip, b.knee, C.thigh]]) { const q = closest(p1, q1, p2, q2), gap = q.d - r1 - r2; if (gap < FL.residual && (!worst || gap < worst.gap)) worst = { gap, q }; }
    if (!worst) return L; let u = sub(worst.q.c1, worst.q.c2); u[1] = max(0, u[1]) + 0.2 * hyp(u[0], u[2]); const ul = hyp(...u); u = ul > 1e-6 ? u.map((x) => x / ul) : [0, 1, 0]; const m = min(0.015, 0.5 * (FL.residual - worst.gap));
    const aM = [L.an[0] + u[0] * m, max(HB.ankleH - 0.012, L.an[1] + u[1] * m), L.an[2] + u[2] * m], ft2 = Object.assign({}, ft, { ank: this.fromM(aM, pf.P, pf.psi) }), L2 = this.swingLeg(X, s, ft2, pf, t); L2.cleared = m; return L2; }
  // ── the pose at tAbs: TECHNICAL-CONTROL-1.1's, with the hand-off blend, the residual clearance and the transition state ───────────────────────
  poseAt(tAbs, ballLocal) {
    const pf = this.pelvisFull(tAbs, ballLocal), t = pf.t, legRot = {}, legs = {}, Ls = {};
    for (const X of SIDES) { const ft = pf.feet[X], s = ft.planted ? null : this.segAt(X, t); let L = ft.planted ? this.stanceLeg(X, ft, pf) : s ? this.swingLeg(X, s, ft, pf, t) : this.legFallback(X, ft, pf);
      if (s && !ft.planted) L = this.avoidBall(X, s, ft, pf, t, L, ballLocal); Ls[X] = { L, ft, s }; }
    for (const X of SIDES) { const A = Ls[X], B = Ls[other(X)]; if (A.s && !A.ft.planted && B.ft.planted) A.L = this.residual(pf, X, A.s, A.ft, A.L, B.L, t); }
    for (const X of SIDES) { let L = this.blendGait(X, Ls[X].L, tAbs); const v = L.v, ft = Ls[X].ft;
      legRot["thigh_" + X] = L.ik.Rthigh; legRot["shin_" + X] = Q.mul(Q.x(L.ik.k), Q.y(v[1])); legRot["foot_" + X] = Q.yxz(v[2], v[3], v[4]); legRot["toe_" + X] = Q.x(v[5]);
      legs[X] = { v, short: L.ik.short, planted: !!ft.planted, roll: L.roll || 0, turn: L.turn || 0, sup: L.sup || null, edge: L.edge || 0, pushed: L.pushed || 0, cleared: L.cleared || 0, bumped: ft.bumped || 0 }; }
    const pose = { rot: Object.assign({}, pf.pose.rot, legRot), pelvisPos: pf.pelvis }, out = this.finish(pf.P, pf.psi, pose);
    out.S = pf.P; out.psi = pf.psi; out.feet = pf.feet; out.w = pf.w; out.t = t; out.fam = pf.fam; out.legs = legs; this.transitionState(t, pf, out);
    const rec = { t, P: pf.P.slice(), pelvis: pf.pelvis.slice(), ang: Q.toYXZ(pf.Rp), rot: pf.pose.rot, vR: legs.R.v.slice(), vL: legs.L.v.slice() }; this._posed = this._posed && this._posed.length && this._posed[this._posed.length - 1].t < t ? [this._posed[this._posed.length - 1], rec] : [rec]; return out;
  }
  // ── THE TRANSITION STATE at a contact (owner: "expose at least …"): recorded once per contact on the simulation's presentation record ─────────
  // (recorded on the first frame that knows the contact as executed — the body re-plans at the contact)
  transitionState(t, pf, out) { const c = this.contactsKnown.find((q) => !q.planned && t - q.t > -0.6 * DT && t - q.t < 0.03); if (!c) return; const L = this.sim.rc2 && (this.sim.rc2._tc13state || (this.sim.rc2._tc13state = [])); if (!L || L.some((q) => q.i === c.i)) return;
    const vel = (X) => { const a = super.footAt(X, t - DT), b = super.footAt(X, t + DT); return [(b.ank[0] - a.ank[0]) / (2 * DT), (b.ank[1] - a.ank[1]) / (2 * DT), (b.ank[2] - a.ank[2]) / (2 * DT)].map((x) => +x.toFixed(2)); };
    const pl = SIDES.filter((X) => pf.feet[X].planted), yaw0 = this.ep.psiAt(t - 0.02), yaw1 = this.ep.psiAt(t + 0.02), cy = this.cycle(t), r3 = (v) => v.map((x) => +x.toFixed(3)), pel = this.fromM(pf.pelvis, pf.P, pf.psi);
    L.push({ i: c.i, tContact: +c.t.toFixed(3), t: +t.toFixed(3), F: c.F, surface: c.surface, planted: pl, free: SIDES.filter((X) => !pf.feet[X].planted), weight: pf.w.R >= pf.w.L ? "R" : "L", weights: { R: +pf.w.R.toFixed(2), L: +pf.w.L.toFixed(2) },
      feet: Object.fromEntries(SIDES.map((X) => [X, { pos: pf.feet[X].ank.map((x) => +x.toFixed(3)), vel: vel(X) }])), stride: { phase: +cy.u.toFixed(2), swinging: cy.sw }, pelvis: { pos: r3(pel), yaw: +((pf.psi + Q.toYXZ(pf.Rp)[0]) / DEG).toFixed(1) },
      hip: Object.fromEntries(SIDES.map((X) => [X, r3(this.fromM(this.hipAt(pf, X), pf.P, pf.psi))])), com: r3([pel[0], pel[1], pel[2] + 0.08]), yawRate: +((wrapA(yaw1 - yaw0) / 0.04) / DEG).toFixed(0), followThrough: vel(c.F) }); }
}
// ═══ THE SIMULATION: TECHNICAL-CONTROL-1.2's (the carry model) + the running gait's foot positions of the last ticks before the hand-off, recorded as
// presentation data (the body's hand-off velocity) — nothing here is read by the simulation ═══════════════════════════════════════════════════════
export class FlowSim extends CarrySim {
  // (its own contact-pose cache: TECHNICAL-CONTROL-1.1's is module-wide, keyed on inputs rounded to 1 mm — a second run in the same process, or the
  // before body beside it in the lab, reused the first one's poses: the presentation was not repeatable)
  constructor(cfg) { super(cfg); this._tc11cache = new Map(); }
  step() { const r = super.step(); const c2 = this.rc2; if (!(c2 && c2.kind === "ELITE" && c2.phase === "action") && this.framesPrev && this.framesPrev.foot_R) { const H = this._footHist || (this._footHist = []); H.push({ R: this.framesPrev.foot_R.p.slice(), L: this.framesPrev.foot_L.p.slice() }); if (H.length > 4) H.shift(); } return r; }
}
