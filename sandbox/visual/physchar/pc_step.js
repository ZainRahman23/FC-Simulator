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
import { SupportSequencer, footprint, polyPolyDist } from "./pc_support.js";

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
  crossover: false,             // crossover steps (routed around the stance foot) — OFF: executing them needs coordinated pelvis/trunk rotation
                                // and leg-to-leg clearance the controller does not have yet (finding 2026-09-30: the crossing hip saturated
                                // and the foot never landed); a lateral fall that only a crossover could catch is refused → honest fall
  viaClear: 0.06,               // m: a CROSSOVER swing is routed around the stance foot through a waypoint this far beyond its toe (or heel)               // m: the trailing stance foot may rise onto its toe — its reach is taken to the toe with this much extra lever
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
  }
  event(kind, what) { this.log.push({ t: this.lastT ?? null, kind, what }); }
  // ── the physical reach of foot `sw` at touchdown, with the pelvis carried by the predicted COM motion (not held over the stance foot) ──
  _feasible(o, sw, tc, yaw, cur, dCom, T) {
    const st = sw === "L" ? "R" : "L", reasons = [], stSole = this.geo._sole(o, st), fp = footprint(this.box, tc, yaw), clr = polyPolyDist(fp, stSole);
    if (clr < STEP.footClear) reasons.push(clr < 0 ? "footprint overlaps the stance foot" : `${(clr * 100).toFixed(1)} cm from the stance foot`);
    const pathClear = (via) => { const c2 = via ? sub2(sc2(via, 2), sc2(add2(cur, tc), 0.5)) : null; for (let k = 1; k < 16; k++) { const t = k / 16;
        const pc = via ? add2(add2(sc2(cur, (1 - t) * (1 - t)), sc2(c2, 2 * (1 - t) * t)), sc2(tc, t * t)) : add2(cur, sc2(sub2(tc, cur), t));
        if (polyPolyDist(footprint(this.box, pc, yaw), stSole) < STEP.pathClear) return false; } return true; };
    let via = null; if (!pathClear(null) && !STEP.crossover) reasons.push("swing path through the stance foot (a crossover step would be needed — not supported)");
    else if (!pathClear(null)) { const sF = o.states[this.geo.foot[st]], hdS = Q.rot(sF.rot, [0, 0, 1]), fS = [hdS[0], hdS[2]], cS = this.geo._center(o, st), hz = 2 * this.box.he[2] + STEP.viaClear;   // two half boot lengths + clearance beyond the stance centre
      const opts2 = [add2(cS, sc2(fS, hz)), sub2(cS, sc2(fS, hz)), add2(cS, sc2(fS, 1.25 * hz)), sub2(cS, sc2(fS, 1.25 * hz))].filter(v => pathClear(v)).sort((a, b) => (len2(sub2(a, cur)) + len2(sub2(tc, a))) - (len2(sub2(b, cur)) + len2(sub2(tc, b))));
      if (opts2.length) via = opts2[0]; else reasons.push("swing path through the stance foot (no crossover route)"); }
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
    if (T) { const pathLen = via ? len2(sub2(via, cur)) + len2(sub2(tc, via)) : len2(sub2(tc, cur)), lim = STEP.vFootMax * 0.63 * T / 1.875;
      if (pathLen > lim) reasons.push(`swing ${(pathLen * 100).toFixed(0)} cm in ${T.toFixed(2)} s needs a ${(1.875 * pathLen / (0.63 * T)).toFixed(1)} m/s foot (max ${STEP.vFootMax})`); }
    return { ok: reasons.length === 0, reasons, fp, via };
  }
  // ── one candidate: swing foot sw, stance st; the foothold from the PREDICTED capture point, projected onto the reachable region ──
  _candidate(o, sw, R0cur, elapsed) {
    const st = sw === "L" ? "R" : "L", F = o.feet, W = this.W; if (!F[st].touching || F[st].slipping) return null;
    const stSole = this.geo._sole(o, st); if (stSole.length < 3) return null;
    const w0 = o.omega0 || Math.sqrt(9.81 / Math.max(0.5, o.com[1])), xi = o.xi, pst = nearestInset(stSole, xi, BAL.copInset), cur = R0cur || this.geo._center(o, sw), yaw = yawOf(o.states[this.geo.foot[sw]].rot);
    const hd = [dsin(yaw), dcos(yaw)], c0 = [o.com[0], o.com[2]], v0 = [o.vcom[0], o.vcom[2]], wpToC = this.box.pos[2] - this.ctrl.comFwd;
    const tUnl = -(elapsed || 0);                              // the swing has already run this long (re-planning during the rise)
    const predict = (T) => { const e = dexp(w0 * T), xtd = add2(pst, sc2(sub2(xi, pst), e)), ch = (e + 1 / e) / 2, sh = (e - 1 / e) / 2, ctd = add2(pst, add2(sc2(sub2(c0, pst), ch), sc2(v0, sh / w0))); return { xtd, ctd }; };
    let tSw = 0.4, want = null, pr = null;
    for (let it = 0; it < 3; it++) { pr = predict(tUnl + tSw); const run = sub2(pr.xtd, pst), n = len2(run), e = n > 1e-6 ? sc2(run, 1 / n) : hd;
      want = add2(add2(pr.xtd, sc2(e, STEP.b)), sc2(hd, wpToC)); tSw = Math.max(STEP.tSwMin, Math.min(STEP.tSwMax, STEP.tSwMin + STEP.tSwPerM * len2(sub2(want, cur)))); }
    const dComOf = (T) => sub2(predict(T).ctd, c0);
    let tc = want, f0 = this._feasible(o, sw, want, yaw, cur, dComOf(tUnl + tSw), tSw), projected = false, reasons = f0.reasons;
    if (!f0.ok) { let lo = 0, hi = 1; for (let it = 0; it < 24; it++) { const m = (lo + hi) / 2, p = add2(cur, sc2(sub2(want, cur), m)); if (this._feasible(o, sw, p, yaw, cur, dComOf(tUnl + tSw), tSw).ok) lo = m; else hi = m; }
      tc = add2(cur, sc2(sub2(want, cur), lo)); projected = true; if (!this._feasible(o, sw, tc, yaw, cur, dComOf(tUnl + tSw), tSw).ok || len2(sub2(tc, cur)) < 0.03) return { sw, st, feasible: false, reasons, want }; }
    const fF = this._feasible(o, sw, tc, yaw, cur, dComOf(tUnl + tSw)), via = fF.via, pathLen = via ? len2(sub2(via, cur)) + len2(sub2(tc, via)) : len2(sub2(tc, cur));
    tSw = Math.max(STEP.tSwMin, Math.min(STEP.tSwMax, STEP.tSwMin + STEP.tSwPerM * pathLen)); const prT = predict(Math.max(0, tUnl + tSw));
    const newSup = hullXZ(stSole.concat(footprint(this.box, tc, yaw))), margin = polyDist(newSup, prT.xtd);
    return { sw, st, feasible: true, target: tc, want, yaw, projected, reasons, via, tUnl, tSw, T: tUnl + tSw, pst, xtd: prT.xtd, ctd: prT.ctd, margin, capture: margin >= 0, deficit: Math.max(0, -margin), load: F[sw].load };
  }
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
    this.geo._planSwing(R, o); R.T = c.tSw; R.stage = keep; R.tSw = R.tSw0; R.via = c.via || null; if (R.via) { R.fwdBias = 0; R.clear = Math.max(R.clear, 0.08); } }
  // a CROSSOVER swing: C2's vertical profile and foot orientation, the horizontal path a quadratic Bézier through the waypoint
  _swingVia(R, t) { const base = this.geo._swingAt(R, t), u = base.u, h0 = 0.12, h1 = 0.75, uh = Math.max(0, Math.min(1, (u - h0) / (h1 - h0))), sh = minjerk(uh), dsh = uh > 0 && uh < 1 ? 30 * uh * uh * (1 - uh) * (1 - uh) / ((h1 - h0) * R.T) : 0;
    const p0 = [R.p0[0], R.p0[2]], pT = [R.pT[0], R.pT[2]], c2 = sub2(sc2(R.via, 2), sc2(add2(p0, pT), 0.5));
    const P = add2(add2(sc2(p0, (1 - sh) * (1 - sh)), sc2(c2, 2 * (1 - sh) * sh)), sc2(pT, sh * sh)), dP = add2(sc2(sub2(c2, p0), 2 * (1 - sh)), sc2(sub2(pT, c2), 2 * sh));
    return { ...base, pos: [P[0], base.pos[1], P[1]], vel: [dP[0] * dsh, base.vel[1], dP[1] * dsh] }; }
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
      if (cls === "STEP_NEEDED" && this.steps < STEP.maxSteps && !this.refused) {
        const c = this._choose(o);
        if (!c || (!c.capture && c.deficit > STEP.maxDeficit)) { this.refused = c ? `best foothold leaves ξ ${(c.deficit * 100).toFixed(1)} cm outside the new support` : "no reachable foothold (neither foot)"; this.event("NO STEP", this.refused); return this._restPlan(); }
        const s0 = o.states[this.geo.foot[c.sw]];
        R = this.R = { sw: c.sw, st: c.st, cand: c, first: c, tNeed: t, stage: "SWING", tSw0: t, tSw: t, p0: s0.pos.slice(), q0: s0.rot.slice(), cur0: this.geo._center(o, c.sw), soleY0: this.geo._soleLow(o, c.sw), air: 0 };
        this._aim(R, o, c); this.stage = "SWING";
        this.event("STEP_NEEDED → step", `${c.sw} foot · foothold ${c.projected ? "projected" : "as wanted"} · predicted ξ margin at touchdown ${(c.margin * 100).toFixed(1)} cm · T ${c.T.toFixed(2)} s`);
      } else return this._restPlan();
    }
    const sw = R.sw, st = R.st, plan = { stepping: true, swing: {}, step: R, swingKpDrop: 0 };
    if (["SWING", "DESCEND", "ACCEPT"].includes(this.stage) && (cls === "FALLING" || cls === "GROUNDED" || cls === "UNRECOVERABLE")) { this.stage = "FAILED"; R.fail = R.fail || `balance lost (${cls}) during ${R.stage}`; this.event("FAILED", R.fail); }
    if (this.stage === "SWING" || this.stage === "DESCEND") {
      // re-plan the foothold from the CURRENT state during the rise (the horizontal progression has not started)
      if (this.stage === "SWING" && (t - R.tSw) < STEP.replanUntil * R.T) { const c = this._candidate(o, sw, R.cur0, t - R.tSw); if (c && c.feasible) { R.cand = c; this._aim(R, o, c); } }
      plan.copFoot = st; plan.xiRef = o.xi.slice(); const tg = R.via ? this._swingVia(R, t) : this.geo._swingAt(R, t); plan.swing[sw] = tg; R.u = tg.u;
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
      if (R.again >= STEP.againSteps) { this.stage = "FAILED"; R.fail = `the capture point is still outside the new support after the step (a second step would be needed; C3 takes one)`; this.event("FAILED", R.fail); }
      else if (t - R.tT > STEP.accTimeout) { this.steps++; this.stage = "STAND"; R.stage = "DONE"; R.status = "STEP_TAKEN_NOT_SETTLED"; this.done = R; this.R = null; this.rest = { xiRef: R.accTo.slice(), anchors: R.anchors }; this.event("timeout", "acceptance window over"); return this._restPlan(); }
      else return plan; }
    // FAILED: the step no longer shields the posture — the classifier's own release (C1 fall transition) takes over
    R.stage = "FAILED"; R.status = "FAILED"; this.done = R; return { stepping: false, swing: {}, step: R };
  }
}
