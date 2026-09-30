// ═══ physchar/pc_step.js — GATE C3: PHYSICS-DRIVEN CORRECTIVE STEPPING (one reactive step) ═════════════════════════════════════════════
// When the current support can no longer arrest the body's momentum (C1's classifier: STEP_NEEDED — the capture point ξ is beyond the
// hip-extended support), choose a foot that can be moved and a reachable foothold that will contain the capture point when the foot lands,
// and execute the step with the SAME physical machinery as C2. There is no time for C2's quasi-static weight transfer (0.9 s + a
// measured-load gate: a C3 step waiting for it never lifted — B50 still carried 251 N after 0.35 s): the foot is unloaded the way a person
// unloads it in a reactive step — the swing leg is put under swing control and starts to RISE at once while the CoP demand moves onto the
// other foot, so the leg stops supporting and the body's weight goes to the stance leg; LIFTOFF is the sensed departure of the foot. It is
// swung by finite motors toward a world-space target, the SENSED touchdown is truth, and the load is accepted by the balance law in the
// new support. Nothing is placed, teleported or asserted: if the foot cannot be unloaded, cannot reach, lands
// short or the stance foot slides, the step fails physically and the body falls.
//
// Foothold (capture-point stepping: Pratt et al. 2006; Koolen et al. 2012 capturability; Hof 2008 "XcoM + b"): while the swing foot is in
// the air the only CoP is on the stance foot, p_st (the demand clamped into its sole), and the LIPM capture point evolves as
//     ξ(t) = p_st + (ξ₀ − p_st)·e^(ω₀·t)
// so at the predicted touchdown time T = T_unload + T_swing it is ξ_td. The new foot's WEIGHT POINT is aimed at ξ_td + b·ê (ê = the
// direction ξ is running away in; b = 3 cm) — the new support then contains ξ_td with room for the CoP beyond it. The target is projected
// onto what the body can physically reach at touchdown (leg length at ≤ 99.5 % extension with bounded pelvis lowering, hip range of motion
// with margin for BOTH legs, footprint / swing-path clearance from the stance foot), and the capture is evaluated at the projected
// foothold. Both feet are evaluated; a capturing candidate is preferred, then the earlier touchdown.
// C3 is ONE step: if the capture point is still outside the new support after the step (STEP_NEEDED again), the character falls honestly.
import { V, Q, rad, deg, datan2, dsin, dcos, dexp } from "./pc_math.js";
import { minjerk } from "./pc_control.js";
import { polyDist } from "./pc_sense.js";
import { nearestInset, BAL } from "./pc_balance.js";
import { SupportSequencer, footprint, polyPolyDist, SUP } from "./pc_support.js";

export const STEP = {
  maxSteps: 1,                  // C3: one corrective step; a second STEP_NEEDED after it → honest fall
  liftTimeout: 0.25,            // s: the foot must physically leave the ground this soon after the step starts (else FAILED: it could not be unloaded)
  replanUntil: 0.10,            // the foothold is re-planned from the current state until this fraction of the swing (the rise, before progression)
  // swing (reactive: fast, one continuous motion; the approach is near-vertical)
  // reactive-step swings are fast even when long (foot-off → contact ≈ 0.2–0.35 s: Maki & McIlroy 1997; Luchies et al. 1994) — and a swing
  // time that grew with length fed back (longer step → slower → ξ runs further → longer step): 0.25 s + 0.2 s/m, ≤ 0.40 s
  tSwMin: 0.25, tSwMax: 0.40, tSwPerM: 0.20,
  clear: 0.06, hStart: 0.10, hEnd: 0.80, approachH: 0.01, descendV: 0.35, descendMax: 0.06, noContact: 0.35, armRise: 0.005,
  // foothold
  b: 0.03, footClear: 0.03, pathClear: 0.01, reachExt: 0.995, dropMax: 0.10, hipMargin: 5, abdMax: 40, addMax: 25,
  heelRise: 0.20,
  vFootMax: 4.5,                // m/s: peak swing-foot speed the leg achieves (measured: the recovered 80 N·s step's foot peaked at ≈ 4.4 m/s;
                                // human fast / reactive swings ≈ 4–6 m/s). The min-jerk progression peaks at 1.875 × mean speed over
                                // (hEnd − hStart)·T, so a step's path may be at most vFootMax·(hEnd − hStart)·T / 1.875 long (finding
                                // 2026-09-30: a 0.95 m foothold at 7 m/s peak left the leg behind; the knee extended and the foot landed 59 cm short)
  // CROSSOVER (the unloaded leg crosses in front of the stance leg — the dominant reactive step for large LATERAL perturbations, where the
  // loaded leg cannot be unloaded in time: Maki & McIlroy 1997; Mille et al. 2005). Routed in 3-D: the swing ankle passes xoFwd in front of
  // the stance ankle (clear of the stance shin by xoShin) and, WHILE its footprint overlaps the stance boot's (dilated by xoClear), stays with
  // its sole xoClear above the stance boot's top. The collider boot is a 16 × 15 × 36 cm box, so the lift is ≈ 19 cm (a real boot's toe
  // would need ≈ 8). The swing's vertical profile is a plateau keyed to that overlap window; its PEAK 3-D speed must stay ≤ vFootMax.
  // (first attempt 2026-09-30, kept in git history: a 2-D route AROUND the 36 cm box made the path 1.0–1.3 m = an 8–9.6 m/s foot.)
  crossover: true, xoFwd: [0.15, 0.20, 0.25, 0.30, 0.35, 0.40, 0.45], xoClear: 0.04, xoShin: 0.07,
  nAlphas: [0.35, 0.45, 0.55, 0.65, 0.75, 0.85, 1.0],   // (experiment, opts.nStep) first-step fractions tried by the 2-step planner
  maxDeficit: 0.08,             // m: a best foothold whose predicted ξ_td is still more than this outside the new support → no capturing step
  // acceptance in the new support
  softenK: 0.35, softenT: 0.15,  // landing compliance: the landed leg's stiffness × 0.35 at touchdown, back to 1 over 0.15 s
  accMargin: 0.015, accV: 0.15, accSteps: 24, accTimeout: 2.5, againSteps: 30,
};
const sub2 = (a, b) => [a[0] - b[0], a[1] - b[1]], add2 = (a, b) => [a[0] + b[0], a[1] + b[1]], sc2 = (a, s) => [a[0] * s, a[1] * s], dot2 = (a, b) => a[0] * b[0] + a[1] * b[1], len2 = (a) => Math.sqrt(dot2(a, a));
const hullXZ = (P) => { const p = P.map(q => q.length === 3 ? [q[0], q[2]] : q).sort((a, b) => a[0] - b[0] || a[1] - b[1]); if (p.length < 3) return p;
  const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]), lo = [], up = [];
  for (const q of p) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
  return lo.slice(0, -1).concat(up.slice(0, -1)); };
const yawOf = (q) => { const f = Q.rot(q, [0, 0, 1]); return datan2(f[0], f[2]); };
const nlerp = (a, b, s) => { const d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3], bb = d < 0 ? b.map(x => -x) : b; return Q.norm([0, 1, 2, 3].map(i => a[i] + (bb[i] - a[i]) * s)); };

export class CorrectiveStepper {
  constructor(spec, poses, ctrl, opts) {
    this.spec = spec; this.ctrl = ctrl; this.opts = opts || {}; this.geo = new SupportSequencer(spec, poses, ctrl, []);
    this.W = spec.totalMass * 9.81; this.yFlat = poses.N.feet.L[1]; this.box = this.geo.box; this.stage = "STAND"; this.steps = 0; this.log = []; this.R = null;
    const hip = spec.joints.find(j => j.name === "hip_R"); this.hipFlexMax = -hip.swingY[0] - STEP.hipMargin; this.hipExtMax = hip.swingY[1] - STEP.hipMargin;
    this.hNomPelvis = ctrl.hPelvis;
    // EXPERIMENT (opts.maxSteps > 1, default 1 = Gate C3 as scoped): a step whose acceptance finds ξ still outside AND receding hands over
    // to the next step (the trailing foot swings) instead of failing — repeated capture-point steps, the core of a stepping gait
    this.maxSteps = (this.opts && this.opts.maxSteps) || STEP.maxSteps; this.history = [];
  }
  event(kind, what) { this.log.push({ t: this.lastT ?? null, kind, what }); }
  // ── the physical reach of foot `sw` at touchdown, with the pelvis carried by the predicted COM motion (not held over the stance foot) ──
  _feasible(o, sw, tc, yaw, cur, dCom, T) {
    const st = sw === "L" ? "R" : "L", reasons = [], stSole = this.geo._sole(o, st), fp = footprint(this.box, tc, yaw), clr = polyPolyDist(fp, stSole);
    if (clr < STEP.footClear) reasons.push(clr < 0 ? "footprint overlaps the stance foot" : `${(clr * 100).toFixed(1)} cm from the stance foot`);
    const pathClear = (via) => { const c2 = via ? sub2(sc2(via, 2), sc2(add2(cur, tc), 0.5)) : null; for (let k = 1; k < 16; k++) { const t = k / 16;
        const pc = via ? add2(add2(sc2(cur, (1 - t) * (1 - t)), sc2(c2, 2 * (1 - t) * t)), sc2(tc, t * t)) : add2(cur, sc2(sub2(tc, cur), t));
        if (polyPolyDist(footprint(this.box, pc, yaw), stSole) < STEP.pathClear) return false; } return true; };
    let via = null, xo = null; if (!pathClear(null) && !STEP.crossover) reasons.push("swing path through the stance foot (a crossover step would be needed — not supported)");
    else if (!pathClear(null)) { xo = this._crossRoute(o, st, stSole, cur, tc, yaw); if (xo.why) reasons.push(xo.why); else via = xo.via; }
    const legs = this.ctrl.legs, Lmax = STEP.reachExt * (legs.L.L1 + legs.L.L2), P = o.states[0].pos, pel = [P[0] + dCom[0], P[2] + dCom[1]], Rp = Q.axis([0, 1, 0], yawOf(o.states[0].rot));
    const yA = this.yFlat, yPelLow = yA + this.hNomPelvis - STEP.dropMax, fwdW = [dsin(yawOf(o.states[0].rot)), dcos(yawOf(o.states[0].rot))], rtW = [fwdW[1], -fwdW[0]];
    const legOK = (s, ank) => { const ho = Q.rot(Rp, legs[s].hipOff), hip = [pel[0] + ho[0], pel[1] + ho[2]], d = sub2(ank, hip), h2 = dot2(d, d), down = yPelLow + ho[1] - yA;
      if (h2 + down * down > Lmax * Lmax) return `${s} leg cannot reach (${(Math.sqrt(h2) * 100).toFixed(0)} cm from the hip at touchdown)`;
      const dn = Math.sqrt(Math.max(1e-6, Lmax * Lmax - h2)), flex = deg(datan2(dot2(d, fwdW), dn)), lat = dot2(d, rtW) * (s === "R" ? 1 : -1), abd = deg(datan2(lat, dn));
      if (flex > this.hipFlexMax) return `${s} hip flexion ${flex.toFixed(0)}°`; if (-flex > this.hipExtMax) return `${s} hip extension ${(-flex).toFixed(0)}°`;
      if (abd > STEP.abdMax) return `${s} hip abduction ${abd.toFixed(0)}°`; if (-abd > STEP.addMax) return `${s} hip adduction ${(-abd).toFixed(0)}°`; return null; };
    const stF = o.states[this.geo.foot[st]], toe = Q.rot(stF.rot, [0, 0, this.box.pos[2] + this.box.he[2] - 0.03]), stToe = [stF.pos[0] + toe[0], stF.pos[2] + toe[2]];
    const stanceOK = () => { const ho = Q.rot(Rp, legs[st].hipOff), hip = [pel[0] + ho[0], pel[1] + ho[2]], d = sub2(stToe, hip), h2 = dot2(d, d), down = yPelLow + ho[1] - yA, Lr = Lmax + STEP.heelRise;
      if (h2 + down * down > Lr * Lr) return `${st} leg cannot keep its toe on the ground (${(Math.sqrt(h2) * 100).toFixed(0)} cm from the hip at touchdown)`;
      const flex = deg(datan2(dot2(d, fwdW), Math.sqrt(Math.max(1e-6, Lr * Lr - h2)))); if (-flex > this.hipExtMax) return `${st} hip extension ${(-flex).toFixed(0)}°`; if (flex > this.hipFlexMax) return `${st} hip flexion ${flex.toFixed(0)}°`; return null; };
    const a = this.geo._ankleFromCenter(tc, yaw), rs = legOK(sw, a), rst = stanceOK();
    if (rs) reasons.push(rs); if (rst) reasons.push("stance: " + rst);
    if (T && xo && !xo.why) { const vPk = this._crossPeak(xo, cur, tc, T); if (vPk > STEP.vFootMax) reasons.push(`crossover ${(xo.len * 100).toFixed(0)} cm + ${(xo.lift * 100).toFixed(0)} cm lift in ${T.toFixed(2)} s needs a ${vPk.toFixed(1)} m/s foot (max ${STEP.vFootMax})`); }
    else if (T) { const pathLen = len2(sub2(tc, cur)), lim = STEP.vFootMax * 0.63 * T / 1.875;
      if (pathLen > lim) reasons.push(`swing ${(pathLen * 100).toFixed(0)} cm in ${T.toFixed(2)} s needs a ${(1.875 * pathLen / (0.63 * T)).toFixed(1)} m/s foot (max ${STEP.vFootMax})`); }
    return { ok: reasons.length === 0, reasons, fp, via, xo };
  }
  // ── CROSSOVER ROUTE (footprint CENTRES, ground plane): a quadratic Bézier through V = stance ankle + xoFwd·(stance heading), the first
  // xoFwd whose swing footprint stays xoShin clear of the stance ankle (the shin's base); [sA, sB] = the Bézier interval where the swing
  // footprint is within xoClear of the stance sole — there the swing ankle must be at yNeed (sole xoClear above the stance boot's top) ──
  _crossRoute(o, st, stSole, cur, tc, yaw) {
    const sF = o.states[this.geo.foot[st]], hd = Q.rot(sF.rot, [0, 0, 1]), fS = [hd[0], hd[2]], aS = [sF.pos[0], sF.pos[2]], b = this.box;
    const top = Math.max(...[-1, 1].flatMap(i => [-1, 1].flatMap(k => [-1, 1].map(j => sF.pos[1] + Q.rot(sF.rot, [b.pos[0] + i * b.he[0], b.pos[1] + b.he[1], b.pos[2] + k * b.he[2]])[1]))));
    const yNeed = top + STEP.xoClear - (b.pos[1] - b.he[1]), N = 24;
    for (const d of STEP.xoFwd) { const V0 = add2(aS, sc2(fS, d)), c2 = sub2(sc2(V0, 2), sc2(add2(cur, tc), 0.5)); let sA = null, sB = null, shin = true, len = 0, prev = cur;
      for (let k = 1; k < N; k++) { const t = k / N, pc = add2(add2(sc2(cur, (1 - t) * (1 - t)), sc2(c2, 2 * (1 - t) * t)), sc2(tc, t * t)), fp = footprint(b, pc, yaw); len += len2(sub2(pc, prev)); prev = pc;
        if (polyPolyDist(fp, stSole) < STEP.xoClear) { if (sA == null) sA = (k - 1) / N; sB = (k + 1) / N; }
        if (polyDist(fp, aS) > -STEP.xoShin) shin = false; }
      len += len2(sub2(tc, prev)); if (!shin) continue;
      return { via: V0, c2, sA: sA ?? 0.5, sB: sB ?? 0.5, yNeed, len, lift: yNeed - this.yFlat, fwd: d }; }
    return { why: `crossover: no route passes the stance shin (≥ ${STEP.xoShin * 100} cm) within ${STEP.xoFwd[STEP.xoFwd.length - 1] * 100} cm in front of the stance ankle` }; }
  // the crossover's vertical profile over the swing phase u: the C2 base line (minjerk p0.y → pT.y) + a PLATEAU of height H: min-jerk rise over
  // [0, uA], held over the overlap window [uA, uB] (mapped from [sA, sB] through the progression's min-jerk timing), min-jerk fall to touchdown
  _crossProfile(xo, y0, yT, H) { const h0 = SUP.hStart, h1 = SUP.hEnd, inv = (s) => { let lo = 0, hi = 1; for (let i = 0; i < 30; i++) { const m = (lo + hi) / 2; if (minjerk(m) < s) lo = m; else hi = m; } return (lo + hi) / 2; };
    const uA = Math.max(0.06, Math.min(0.9, h0 + (h1 - h0) * inv(xo.sA) - 0.03)), uB = Math.max(uA + 0.02, Math.min(0.94, h0 + (h1 - h0) * inv(xo.sB) + 0.03));
    return { uA, uB, H, y: (u) => { const lin = y0 + (yT - y0) * minjerk(u), pl = u <= uA ? minjerk(u / uA) : u <= uB ? 1 : minjerk((1 - u) / (1 - uB)); return lin + H * pl; },
      dy: (u, T) => { const dmj = (x) => 30 * x * x * (1 - x) * (1 - x), lin = (yT - y0) * dmj(u), pl = u <= uA ? dmj(u / uA) / uA : u <= uB ? 0 : -dmj((1 - u) / (1 - uB)) / (1 - uB); return (lin + H * pl) / T; } }; }
  _crossH(xo, y0, yT) { const pr = this._crossProfile(xo, y0, yT, 0); return Math.max(SUP.clearance, xo.yNeed - Math.min(pr.y(pr.uA), pr.y(pr.uB))); }
  // the planned trajectory's peak 3-D foot speed (the feasibility limit; sampled)
  _crossPeak(xo, cur, tc, T) { const y0 = this.yFlat, H = this._crossH(xo, y0, y0), pr = this._crossProfile(xo, y0, y0, H), h0 = SUP.hStart, h1 = SUP.hEnd; let pk = 0;
    for (let k = 0; k <= 80; k++) { const u = k / 80, uh = Math.max(0, Math.min(1, (u - h0) / (h1 - h0))), sh = minjerk(uh), dsh = uh > 0 && uh < 1 ? 30 * uh * uh * (1 - uh) * (1 - uh) / ((h1 - h0) * T) : 0;
      const dB = add2(sc2(sub2(xo.c2, cur), 2 * (1 - sh)), sc2(sub2(tc, xo.c2), 2 * sh)), vh = len2(dB) * dsh, vv = pr.dy(u, T); pk = Math.max(pk, Math.hypot(vh, vv)); } return pk; }
  _swingCross(R, t) { const base = this.geo._swingAt(R, t), u = base.u, X = R.xo, h0 = SUP.hStart, h1 = SUP.hEnd, uh = Math.max(0, Math.min(1, (u - h0) / (h1 - h0))), sh = minjerk(uh), dsh = uh > 0 && uh < 1 ? 30 * uh * uh * (1 - uh) * (1 - uh) / ((h1 - h0) * R.T) : 0;
    const off = sc2(R.hdSw, this.box.pos[2]), p0 = [R.p0[0], R.p0[2]], pT = [R.pT[0], R.pT[2]], c2 = sub2(X.c2, off);   // the route is in footprint centres; the target is the ANKLE
    const P = add2(add2(sc2(p0, (1 - sh) * (1 - sh)), sc2(c2, 2 * (1 - sh) * sh)), sc2(pT, sh * sh)), dP = add2(sc2(sub2(c2, p0), 2 * (1 - sh)), sc2(sub2(pT, c2), 2 * sh));
    let y = R.xoPr.y(u), vy = R.xoPr.dy(u, R.T); if (R.stage === "DESCEND") { y = base.pos[1]; vy = base.vel[1]; }
    return { ...base, pos: [P[0], y, P[1]], vel: u < 1 ? [dP[0] * dsh, vy, dP[1] * dsh] : base.vel }; }
  // ── one candidate: swing foot sw, stance st; the foothold from the PREDICTED capture point, projected onto the reachable region ──
  _candidate(o, sw, R0cur, elapsed, alpha) {
    const st = sw === "L" ? "R" : "L", F = o.feet, W = this.W; if (!F[st].touching || F[st].slipping) return null;
    const stSole = this.geo._sole(o, st); if (stSole.length < 3) return null;
    const w0 = o.omega0 || Math.sqrt(9.81 / Math.max(0.5, o.com[1])), xi = o.xi, pst = nearestInset(stSole, xi, BAL.copInset), cur = R0cur || this.geo._center(o, sw), yaw = yawOf(o.states[this.geo.foot[sw]].rot);
    const hd = [dsin(yaw), dcos(yaw)], c0 = [o.com[0], o.com[2]], v0 = [o.vcom[0], o.vcom[2]], wpToC = this.box.pos[2] - this.ctrl.comFwd;
    const tUnl = -(elapsed || 0);                              // the swing has already run this long (re-planning during the rise)
    const predict = (T) => { const e = dexp(w0 * T), xtd = add2(pst, sc2(sub2(xi, pst), e)), ch = (e + 1 / e) / 2, sh = (e - 1 / e) / 2, ctd = add2(pst, add2(sc2(sub2(c0, pst), ch), sc2(v0, sh / w0))); return { xtd, ctd }; };
    let tSw = 0.4, want = null, pr = null;
    for (let it = 0; it < 3; it++) { pr = predict(tUnl + tSw); const run = sub2(pr.xtd, pst), n = len2(run), e = n > 1e-6 ? sc2(run, 1 / n) : hd;
      want = add2(add2(pr.xtd, sc2(e, STEP.b)), sc2(hd, wpToC)); if (alpha) want = add2(cur, sc2(sub2(want, cur), alpha));   // (experiment) a SHORTER first step of a 2-step sequence
      tSw = Math.max(STEP.tSwMin, Math.min(STEP.tSwMax, STEP.tSwMin + STEP.tSwPerM * len2(sub2(want, cur)))); }
    const dComOf = (T) => sub2(predict(T).ctd, c0);
    let tc = want, f0 = this._feasible(o, sw, want, yaw, cur, dComOf(tUnl + tSw), tSw), projected = false, reasons = f0.reasons;
    if (!f0.ok) { let lo = 0, hi = 1; for (let it = 0; it < 24; it++) { const m = (lo + hi) / 2, p = add2(cur, sc2(sub2(want, cur), m)); if (this._feasible(o, sw, p, yaw, cur, dComOf(tUnl + tSw), tSw).ok) lo = m; else hi = m; }
      tc = add2(cur, sc2(sub2(want, cur), lo)); projected = true; if (!this._feasible(o, sw, tc, yaw, cur, dComOf(tUnl + tSw), tSw).ok || len2(sub2(tc, cur)) < 0.03) return { sw, st, feasible: false, reasons, want }; }
    const fF = this._feasible(o, sw, tc, yaw, cur, dComOf(tUnl + tSw)), via = fF.via, xo = fF.xo && !fF.xo.why ? fF.xo : null, pathLen = xo ? xo.len : len2(sub2(tc, cur));
    tSw = Math.max(STEP.tSwMin, Math.min(STEP.tSwMax, STEP.tSwMin + STEP.tSwPerM * pathLen)); const prT = predict(Math.max(0, tUnl + tSw));
    const newSup = hullXZ(stSole.concat(footprint(this.box, tc, yaw))), margin = polyDist(newSup, prT.xtd);
    return { sw, st, feasible: true, target: tc, want, yaw, projected, reasons, via, xo, tUnl, tSw, T: tUnl + tSw, pst, xtd: prT.xtd, ctd: prT.ctd, margin, capture: margin >= 0, deficit: Math.max(0, -margin), load: F[sw].load };
  }
  // ── EXPERIMENT (opts.nStep): 2-STEP CAPTURABILITY (Koolen et al. 2012). A capture that one step cannot reach may be reached by two — but
  // only if the FIRST step leaves the second one feasible (the longest first step leaves the trailing foot too far behind: finding
  // 2026-09-30, multistep/). For shorter first steps (a fraction α of the one-step foothold) the LIPM predicts the state at its touchdown;
  // a synthetic observation (the first foot flat at its foothold, the pelvis carried by the predicted COM) asks the ordinary one-step
  // planner whether the trailing foot can then capture. The pair with the largest final capture margin is executed step by step. ──
  _synth(o, sw, tc, yaw, xi1, c1, v1) { const box = this.box, fi = this.geo.foot[sw], a = this.geo._ankleFromCenter(tc, yaw), rot = Q.axis([0, 1, 0], yaw), pos = [a[0], this.yFlat, a[1]];
    const sole = []; for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const q = V.add(pos, Q.rot(rot, [box.pos[0] + sx * box.he[0], box.pos[1] - box.he[1], box.pos[2] + sz * box.he[2]])); sole.push(q); }
    const states = o.states.slice(), dc = [c1[0] - o.com[0], c1[1] - o.com[2]]; states[fi] = { ...states[fi], pos, rot, v: [0, 0, 0] }; states[0] = { ...states[0], pos: [states[0].pos[0] + dc[0], states[0].pos[1], states[0].pos[2] + dc[1]] };
    return { ...o, xi: xi1.slice(), com: [c1[0], o.com[1], c1[1]], vcom: [v1[0], 0, v1[1]], states, feet: { ...o.feet, [sw]: { ...o.feet[sw], touching: true, loaded: true, slipping: false, sole } } }; }
  _plan2(o) { const w0 = o.omega0 || Math.sqrt(9.81 / Math.max(0.5, o.com[1])); let best = null;
    for (const sw of ["L", "R"]) { const st = sw === "L" ? "R" : "L";
      for (const alpha of STEP.nAlphas) { const c1 = this._candidate(o, sw, null, 0, alpha); if (!c1 || !c1.feasible) continue;
        const v1 = sc2(sub2(c1.xtd, c1.ctd), w0), o2 = this._synth(o, sw, c1.target, c1.yaw, c1.xtd, c1.ctd, v1), c2 = this._candidate(o2, st, null, 0);
        if (!c2 || !c2.feasible || !c2.capture) continue; if (!best || c2.margin > best.margin) best = { c1, c2, alpha, margin: c2.margin }; } }
    return best; }
  _choose(o) { const all = ["L", "R"].map(s => this._candidate(o, s)); this.allCands = all; const c = all.filter(x => x && x.feasible); this.cands = c; if (!c.length) return null;
    c.sort((a, b) => a.capture !== b.capture ? (a.capture ? -1 : 1) : a.capture ? a.T - b.T : a.deficit - b.deficit); return c[0]; }
  // after a step the body stands in its NEW stance: the balance reference is that stance's mid-point, both feet keep their touchdown poses as
  // re-plant anchors, and the pelvis height stays reach-aware (a plan is kept — plain C1 balance assumes the nominal stance and in a long
  // split stance its pelvis target straightened the legs and lifted a foot; finding 2026-09-30). Before any step: null = plain C1 balance.
  _restPlan() { return this.rest ? { stepping: false, swing: {}, xiRef: this.rest.xiRef.slice(), anchors: this.rest.anchors } : null; }
  // the swing is C2's (pc_support _planSwing / _swingAt): knee-forward progression (the shin within 18° of vertical at mid-swing) and a
  // clearance raised by the predicted toe drop from the ankle's usable dorsiflexion — a rise-first reactive swing put the ankle under the
  // hip with the knee at 45°, the boot pitched 20° toe-down and the toe caught the turf 0.16 s into the step (finding 2026-09-30, B_F80) —
  // only its DURATION is the reactive one
  _aim(R, o, c) { R.foot = R.sw; R.type = "place"; R.proj = { target: c.target, yaw: c.yaw }; R.plannedAt = { ...c }; const keep = R.stage; R.stage = "SWING";
    this.geo._planSwing(R, o); R.T = c.tSw; R.stage = keep; R.tSw = R.tSw0; R.xo = c.xo || null;
    if (R.xo) { R.fwdBias = 0; R.hdSw = [dsin(c.yaw), dcos(c.yaw)]; const H = this._crossH(R.xo, R.p0[1], R.pT[1]); R.xoPr = this._crossProfile(R.xo, R.p0[1], R.pT[1], H); R.clear = H; } }
  // swing trajectory (world, foot ORIGIN = ankle): rise, min-jerk horizontal progression under a sin² clearance bell, vertical approach
  _traj(R, t) { const u = Math.min(1, (t - R.tSw) / R.T), p0 = R.p0, pT = R.pT, T = R.T, h0 = STEP.hStart, h1 = STEP.hEnd;
    const uh = Math.max(0, Math.min(1, (u - h0) / (h1 - h0))), sh = minjerk(uh), dsh = uh > 0 && uh < 1 ? 30 * uh * uh * (1 - uh) * (1 - uh) / ((h1 - h0) * T) : 0;
    const sv = minjerk(u), dsv = u < 1 ? 30 * u * u * (1 - u) * (1 - u) / T : 0, sn = dsin(Math.PI * u), cs = dcos(Math.PI * u), bell = sn * sn, dbell = 2 * sn * cs * Math.PI / T;
    let y = p0[1] + (pT[1] - p0[1]) * sv + STEP.clear * bell; if (R.stage === "DESCEND") y = pT[1] - Math.min(STEP.approachH + STEP.descendMax, STEP.descendV * (t - R.tD));
    const pos = [p0[0] + (pT[0] - p0[0]) * sh, y, p0[2] + (pT[2] - p0[2]) * sh], rot = nlerp(R.q0, R.qT, sh);
    const vel = u < 1 ? [(pT[0] - p0[0]) * dsh, (pT[1] - p0[1]) * dsv + STEP.clear * dbell, (pT[2] - p0[2]) * dsh] : [0, R.stage === "DESCEND" ? -STEP.descendV : 0, 0];
    return { pos, rot, vel, u, reach: [pT[0], this.yFlat - 0.005, pT[2]] }; }
  // ── per step: the plan the balance controller follows (null = plain C1 balance) ──
  update(o) {
    const t = o.t, ctrl = this.ctrl, cls = ctrl.cls.state, F = o.feet, W = this.W; this.lastT = t; let R = this.R;
    if (this.stage === "STAND") {
      if (cls === "STEP_NEEDED" && this.steps < this.maxSteps && !this.refused) {
        let c = this._choose(o), p2 = null;
        if (this.opts.nStep && this.maxSteps >= 2 && (!c || !c.capture)) { p2 = this._plan2(o); if (p2) { c = p2.c1; this.event("2-step plan", `first step α ${p2.alpha} (${c.sw}), predicted final ξ margin ${(p2.margin * 100).toFixed(1)} cm`); } }
        if (!c || (!c.capture && !p2 && c.deficit > STEP.maxDeficit)) { this.refused = c ? `best foothold leaves ξ ${(c.deficit * 100).toFixed(1)} cm outside the new support` : "no reachable foothold (neither foot)"; this.event("NO STEP", this.refused); return this._restPlan(); }
        const s0 = o.states[this.geo.foot[c.sw]];
        R = this.R = { sw: c.sw, st: c.st, cand: c, first: c, tNeed: t, stage: "SWING", tSw0: t, tSw: t, p0: s0.pos.slice(), q0: s0.rot.slice(), cur0: this.geo._center(o, c.sw), soleY0: this.geo._soleLow(o, c.sw), air: 0, alpha: p2 ? p2.alpha : null, plan2: p2 ? { margin: p2.margin, second: p2.c2.target } : null };
        this._aim(R, o, c); this.stage = "SWING";
        this.event("STEP_NEEDED → step", `${c.sw} foot · foothold ${c.projected ? "projected" : "as wanted"} · predicted ξ margin at touchdown ${(c.margin * 100).toFixed(1)} cm · T ${c.T.toFixed(2)} s`);
      } else return this._restPlan();
    }
    const sw = R.sw, st = R.st, plan = { stepping: true, swing: {}, step: R, swingKpDrop: 0 };
    if (["SWING", "DESCEND", "ACCEPT"].includes(this.stage) && (cls === "FALLING" || cls === "GROUNDED" || cls === "UNRECOVERABLE")) { this.stage = "FAILED"; R.fail = R.fail || `balance lost (${cls}) during ${R.stage}`; this.event("FAILED", R.fail); }
    if (this.stage === "SWING" || this.stage === "DESCEND") {
      // re-plan the foothold from the CURRENT state during the rise (the horizontal progression has not started)
      if (this.stage === "SWING" && (t - R.tSw) < STEP.replanUntil * R.T) { const c = this._candidate(o, sw, R.cur0, t - R.tSw, R.alpha); if (c && c.feasible) { R.cand = c; this._aim(R, o, c); } }
      plan.copFoot = st; plan.xiRef = o.xi.slice(); const tg = R.xo ? this._swingCross(R, t) : this.geo._swingAt(R, t); plan.swing[sw] = tg; R.u = tg.u;
      // LIFTOFF = the sensed departure of the foot (no touching contact, < 25 N, 3 steps); it must happen within liftTimeout
      if (!R.liftoff) { if (!F[sw].touching && F[sw].load < 25) R.air++; else R.air = 0;
        if (R.air >= 3) { R.liftoff = { t, dtFromNeed: t - R.tNeed, load: F[sw].load }; this.event("liftoff", `${sw} ${(t - R.tNeed).toFixed(3)} s after STEP_NEEDED`); }
        else if (t - R.tSw > STEP.liftTimeout) { this.stage = "FAILED"; R.fail = `the ${sw} foot did not leave the ground within ${STEP.liftTimeout} s (load ${F[sw].load.toFixed(0)} N) — it could not be unloaded`; this.event("FAILED", R.fail); } }
      if (!R.armed && !F[sw].touching && this.geo._soleLow(o, sw) - R.soleY0 >= STEP.armRise) { R.armed = true; R.armedT = t; }
      if (this.stage === "FAILED") { /* falls through to the release below */ }
      else if (R.armed && F[sw].touching) { const s1 = o.states[this.geo.foot[sw]]; R.td = { t, pos: s1.pos.slice(), rot: s1.rot.slice(), center: this.geo._center(o, sw), xi: o.xi.slice(), uAt: tg.u, planned: R.plannedAt.target, fromNeed: t - R.tNeed };
        const wpS = this.geo._weightPoint(o, st), wpW = this.geo._weightPoint(o, sw); R.accTo = [(wpS[0] + wpW[0]) / 2, (wpS[1] + wpW[1]) / 2];
        const sS = o.states[this.geo.foot[st]]; R.anchors = { [sw]: { foot: sw, pos: s1.pos.slice(), rot: s1.rot.slice() }, [st]: { foot: st, pos: sS.pos.slice(), rot: sS.rot.slice() } };
        this.stage = R.stage = "ACCEPT"; R.tT = t; R.acc = 0; R.again = 0; delete plan.swing[sw]; this.event("touchdown", `${sw} ${((t - R.tNeed)).toFixed(3)} s after STEP_NEEDED · ${(Math.hypot(R.td.center[0] - R.td.planned[0], R.td.center[1] - R.td.planned[1]) * 100).toFixed(1)} cm from the foothold`); }
      else { if (this.stage === "SWING" && tg.u >= 1) { this.stage = R.stage = "DESCEND"; R.tD = t; }
        if (this.stage === "DESCEND" && t - R.tD > STEP.noContact) { this.stage = "FAILED"; R.fail = "no ground contact after the planned touchdown"; this.event("FAILED", R.fail); }
        else return plan; } }
    if (this.stage === "ACCEPT") {
      // the new support is TRUTH from the sensed touchdown; the balance law (C1 CoP law + hip strategy) arrests ξ in it
      // a foot that leaves the turf during acceptance (the trailing foot, up on its toe, bounced by the landing impact) is put back down WHERE
      // IT IS — straight down, keeping its orientation — not onto its touchdown pose: the body keeps travelling while it decelerates and the
      // leg could no longer reach that pose (finding 2026-09-30, B_F100: the trailing foot hung in the air for 0.3 s and the recovered body
      // stopped on the front foot alone). This is C1's feet-in-place rule for a moving body.
      for (const s of [sw, st]) if (!F[s].touching) { const ft = o.states[this.geo.foot[s]], drop = this.geo._soleLow(o, s) - (this.yFlat - this.box.pos[1] - this.box.he[1] + 0.0) * 0;
        const low = this.geo._soleLow(o, s); R.anchors[s] = { foot: s, pos: [ft.pos[0], ft.pos[1] - Math.max(0, low), ft.pos[2]], rot: ft.rot.slice() }; }
      plan.xiRef = R.accTo.slice(); plan.anchors = R.anchors;
      { const x = Math.min(1, (t - R.tT) / STEP.softenT); if (x < 1) plan.soften = { foot: sw, k: STEP.softenK + (1 - STEP.softenK) * minjerk(x) }; }
      const vc = Math.hypot(o.vcom[0], o.vcom[2]), ok = o.xiMargin >= STEP.accMargin && vc <= STEP.accV && F[sw].loaded && F[st].touching; R.acc = ok ? R.acc + 1 : 0;
      // a SECOND step is needed only while the capture point is outside the support AND still running away from it (its margin shrinking) —
      // right after touchdown ξ can sit briefly outside while the trailing foot is off the turf and the new support is already arresting it
      // (finding 2026-09-30, B_F90: failed at +0.35 s for 62 ms outside; ξ then settled 10–15 cm inside and the body stood)
      const away = R.prevXiM != null && o.xiMargin < R.prevXiM - 1e-5; R.prevXiM = o.xiMargin; R.again = cls === "STEPPING" && o.xiMargin < 0 && away ? R.again + 1 : cls === "STEPPING" && o.xiMargin < 0 ? R.again : 0;
      if (R.acc >= STEP.accSteps) { R.accepted = { t, fromTouchdown: t - R.tT, fromNeed: t - R.tNeed }; this.steps++; this.stage = "STAND"; R.stage = "DONE"; R.status = "RECOVERED_WITH_STEP"; this.done = R; this.R = null;
        this.rest = { xiRef: R.accTo.slice(), anchors: R.anchors }; this.event("recovered", `in the new support ${(t - R.tNeed).toFixed(2)} s after STEP_NEEDED`); return this._restPlan(); }
      // (experiment) the NEXT step is due as soon as ξ is beyond the hip-extended new support and still receding for 25 ms (C1's own
      // STEP_NEEDED criterion) — waiting for C3's 30-step failure confirmation left the second step 0.45 s too late (finding 2026-09-30)
      if (R.plan2 && this.maxSteps > this.steps + 1 && t - R.tT >= 0.0125) R.again = STEP.againSteps;   // (experiment) the planned second step follows at once
      if (this.maxSteps > this.steps + 1) { const beyond = -o.xiMargin - (this.ctrl.hipCapHere ?? 0); R.beyond = t - R.tT > 0.0125 && beyond > 0 && away ? (R.beyond || 0) + 1 : 0; if (R.beyond >= 6) R.again = STEP.againSteps; }
      if (R.again >= STEP.againSteps && this.steps + 1 < this.maxSteps) {
        // NEXT STEP (experiment): this step is done (its foot stays where it landed and becomes the stance); the other foot is chosen afresh
        R.stage = "DONE"; R.status = "NEXT_STEP"; R.handover = { t, fromNeed: t - R.tNeed }; this.steps++; this.history.push(R); this.event("next step", `ξ still outside and receding ${(t - R.tT).toFixed(2)} s after touchdown`);
        this.rest = { xiRef: R.accTo.slice(), anchors: R.anchors };
        let c = this._choose(o), p2 = null;
        if (this.opts.nStep && this.maxSteps >= this.steps + 2 && (!c || !c.capture)) { p2 = this._plan2(o); if (p2) c = p2.c1; }
        if (!c || (!c.capture && !p2 && c.deficit > STEP.maxDeficit)) { this.refused = c ? `step ${this.steps + 1}: best foothold leaves ξ ${(c.deficit * 100).toFixed(1)} cm outside the new support` : `step ${this.steps + 1}: no reachable foothold`; this.event("NO STEP", this.refused);
          this.stage = "FAILED"; R.fail = this.refused; this.R = R; return { stepping: false, swing: {}, step: R }; }
        const s0 = o.states[this.geo.foot[c.sw]];
        const N = this.R = { sw: c.sw, st: c.st, cand: c, first: c, tNeed: t, stage: "SWING", tSw0: t, tSw: t, p0: s0.pos.slice(), q0: s0.rot.slice(), cur0: this.geo._center(o, c.sw), soleY0: this.geo._soleLow(o, c.sw), air: 0, index: this.steps + 1, alpha: p2 ? p2.alpha : null, plan2: p2 ? { margin: p2.margin, second: p2.c2.target } : null };
        this._aim(N, o, c); this.stage = "SWING"; this.event("step " + (this.steps + 1), `${c.sw} foot · predicted ξ margin at touchdown ${(c.margin * 100).toFixed(1)} cm`);
        return { stepping: true, swing: {}, step: N, swingKpDrop: 0 }; }
      if (R.again >= STEP.againSteps) { this.stage = "FAILED"; R.fail = `the capture point is still outside the new support after the step (a second step would be needed; C3 takes one)`; this.event("FAILED", R.fail); }
      else if (t - R.tT > STEP.accTimeout) { this.steps++; this.stage = "STAND"; R.stage = "DONE"; R.status = "STEP_TAKEN_NOT_SETTLED"; this.done = R; this.R = null; this.rest = { xiRef: R.accTo.slice(), anchors: R.anchors }; this.event("timeout", "acceptance window over"); return this._restPlan(); }
      else return plan; }
    // FAILED: the step no longer shields the posture — the classifier's own release (C1 fall transition) takes over
    R.stage = "FAILED"; R.status = "FAILED"; this.done = R; return { stepping: false, swing: {}, step: R };
  }
}
