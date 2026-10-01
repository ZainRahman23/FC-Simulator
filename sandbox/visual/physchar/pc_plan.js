// ═══ physchar/pc_plan.js — G1a: FOOTSTEP PLANNING (L4) — viability monitor, step executor, rhythmic stepping, voluntary transfer ════════
// LOCOMOTION_ARCHITECTURE_FINAL.md §6 / §9. The C1–C3 machinery is REUSED as a toolbox (C3's capture-step candidates and 2-step planner,
// C2's swing planning, transfer and feasibility) — its own decision logic (C1's classifier, C3's one-shot latched update) is not run:
//   • ViabilityMonitor — replaces C1's classifier for this controller. Capture is judged against the PROSPECTIVE support: the feet on the
//     turf, plus a foot C1's feet-in-place rule is already putting back down near its anchor, plus the footprint of a step under way. A step
//     is chosen again every planning cycle (no latch). A posture release needs either PHYSICAL evidence (both feet off unplanned, trunk
//     > 55°, COM below 78 % of stance height) or the planner finding NO capture (one step, then two) for confirmNoCapture — recorded
//     separately: "planner found none" is not "physically unrecoverable".
//   • StepExecutor — one physical step (C3's execution: active lift, sensed liftoff, finite-motor swing, sensed touchdown, load acceptance)
//     with the architecture's deviations explicit: EARLY / LATE touchdown (actual contact ends the swing wherever it happens), OBSTRUCTED
//     (a non-turf contact on the swing leg: the foot stops progressing and is set down where it is), MISSED (no contact after the planned
//     touchdown), FAILED lift. It reacts to the gait layer's truth only once its own (feedback-delayed) view has caught up.
//   • Rhythm — stepping in place / to placements at a set cadence: each step's capture point follows the periodic LIPM solution
//     (ξ_ini = m + (p_st − m)·tanh(ωT/2)), double support moves ξ between steps, the foothold follows the capture-point error in early swing.
//   • TransferOnly — C2's planned, physically bounded weight transfer up to the point its liftoff gate OPENS, without lifting.
import { V, Q, rad, dexp } from "./pc_math.js";
import { minjerk } from "./pc_control.js";
import { polyDist } from "./pc_sense.js";
import { BAL, kXiErr } from "./pc_balance.js";
import { STEP } from "./pc_step.js";
import { SUP, footprint } from "./pc_support.js";

export const PLAN = {
  planHz: 60,                // viability / candidate search rate (plus immediately when the verdict changes)
  confirmNoCapture: 0.0625,  // s of NO_CAPTURE_FOUND with nothing under way before the posture is released (C1's 15 steps, as time)
  physConfirm: 2,            // steps of physical evidence
  prospect: { dxy: 0.08, dy: 0.10 },   // a re-planting foot within 8 cm horizontally / 10 cm vertically of its anchor counts as prospective support
  stepProspectU: 0.5,        // an executing step's landing footprint counts as prospective support from this swing progress on
  seqMax: 4, episodeQuiet: 0.5,        // corrective steps per disturbance episode; episode ends after 0.5 s NOMINAL
  rhythm: { Tss: 0.40, Tds: 0.20, Tfirst: 0.50, Tlast: 0.60 },
  adjustUntil: 0.4, adjustMax: 0.12, adjustTol: 0.01,
  swing: { H: 0.07, h0: 0.10, h1: 0.80 },   // rhythmic swing: sole lift at mid-swing, horizontal progression window (fractions of T)
  obstruct: { descendV: 0.35 },
  reengage: 0.1, reengageMargin: 0.03,
};
const hullXZ = (P) => { const p = P.map(q => q.length === 3 ? [q[0], q[2]] : q).sort((a, b) => a[0] - b[0] || a[1] - b[1]); if (p.length < 3) return p;
  const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]), lo = [], up = [];
  for (const q of p) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
  return lo.slice(0, -1).concat(up.slice(0, -1)); };
const yawOf = (q) => { const f = Q.rot(q, [0, 0, 1]); return Math.atan2(f[0], f[2]); };
// (G2b) the COM's own LIPM displacement over T about the stance point p (x = c − p, ξ' = ξ − p: c(T) − c0 = x0(e^{−ωT} − 1) + ξ'0·sinh ωT) — a
// walking step's reach is checked from where the pelvis WILL be at touchdown, not from where it is when the step is planned
// (G2b) the capture point under a CoP moving LINEARLY from pa to pb over T (ξ̇ = ω(ξ − p)), at time s; beyond T the CoP stays at pb
const segXi = (xa, pa, pb, T, s, w) => { const d = [pb[0] - pa[0], pb[1] - pa[1]], ss = Math.min(s, T), E = dexp(w * ss), k = (E - 1) / (w * T);
  let xi = [E * xa[0] - pa[0] * (E - 1) + d[0] * (ss / T - k), E * xa[1] - pa[1] * (E - 1) + d[1] * (ss / T - k)], p = [pa[0] + d[0] * ss / T, pa[1] + d[1] * ss / T];
  if (s > T) { const E2 = dexp(w * (s - T)); xi = [pb[0] + (xi[0] - pb[0]) * E2, pb[1] + (xi[1] - pb[1]) * E2]; p = pb.slice(); }
  return { xi, p }; };
const dComAt = (o, p, T) => { const w = o.omega0, x0 = [o.com[0] - p[0], o.com[2] - p[1]], xi = [o.xi[0] - p[0], o.xi[1] - p[1]], em = dexp(-w * T), sh = (dexp(w * T) - em) / 2;
  return [x0[0] * (em - 1) + xi[0] * sh, x0[1] * (em - 1) + xi[1] * sh]; };

// ── the viability monitor ──
export class ViabilityMonitor {
  constructor(ctrl, tool) { this.ctrl = ctrl; this.tool = tool; this.geo = tool.geo; this.state = "INIT"; this.verdict = "NOMINAL"; this.reason = ""; this.kind = null;
    this.noCap = 0; this.phys = 0; this.ground = 0; this.reOk = 0; this.lastSearch = -1; this.cand = null; this.p2 = null; this.log = []; this.prosp = null; this.mXi = null; this.beyond = null; }
  ev(t, what) { this.log.push({ t, what }); }
  // o: the PLANNING-delayed observation; x: { stepping, execFootprint, voluntary, dt, lastR }
  evaluate(o, x) {
    const t = o.t, F = o.feet, ctrl = this.ctrl, set = (s, v, why, kind) => { if (s !== this.state || v !== this.verdict) this.ev(t, `${s} · ${v}${why ? " — " + why : ""}`); this.state = s; this.verdict = v; this.reason = why || ""; this.kind = kind || null; };
    if (o.n <= BAL.warmupSteps) { set("INIT", "NOMINAL", ""); return this.out(); }
    if (o.nonFootGround) { this.ground++; if (this.ground >= 2) { set("GROUNDED", "PHYSICAL", "a non-foot body on the turf", "physical"); return this.out(); } } else this.ground = 0;
    if (this.state === "GROUNDED") return this.out();
    if (this.state === "FALLING") {           // re-engage only when the PHYSICS says in-place balance is clearly possible again
      const ok = ["L", "R"].every(s => F[s].loaded && F[s].touching && !F[s].slipping) && o.xiMargin > PLAN.reengageMargin && o.trunkTiltDeg < 30;
      this.reOk = ok ? this.reOk + x.dt : 0; if (this.reOk >= PLAN.reengage) { this.reOk = 0; set("RECOVERABLE_IN_PLACE", "NOMINAL", "re-engaged"); } return this.out(); }
    const feetAir = !F.L.touching && !F.R.touching, unrec = feetAir && !x.plannedFlight ? "both feet off the turf (not a planned flight)" : o.trunkTiltDeg > 55 ? "trunk tilt > 55°" : o.com[1] < 0.78 * ctrl.hNom ? "COM below 78 % of stance height" : null;
    // (both feet off the turf must persist for confirmNoCapture — 62.5 ms, the same window as a missing capture: a landing impact bounces
    // both feet ~1 mm off the turf for ~17 ms, which is not lost support — G1a finding, S7a released on a 1213 N touchdown's bounce)
    if (unrec) { const flight = feetAir && !x.plannedFlight; this.phys++; this.physT = (this.physT || 0) + x.dt;
      if (flight ? this.physT >= PLAN.confirmNoCapture - 1e-9 : this.phys >= PLAN.physConfirm) { set("FALLING", "PHYSICAL", unrec, "physical"); return this.out(); } } else { this.phys = 0; this.physT = 0; }
    // prospective support: the sensed support region + a foot being re-planted near its anchor + the landing footprint of a step under way
    const pts = (o.region || []).map(p => [p[0], p[1]]), pros = [];
    // a foot that is ON the turf but not yet loaded (just landed, or being re-loaded) is support the body can transfer onto — it is not in
    // the sensed region (which holds only loaded feet), so without this a planning view taken just after a touchdown saw only the old stance
    // foot and ordered a corrective step for a body that was already supported (G1a finding, S7: a spurious cross-over step → fall)
    for (const s of ["L", "R"]) if (F[s].touching && !F[s].loaded && F[s].sole && F[s].sole.length >= 3) { pts.push(...F[s].sole); pros.push(`${s} on the turf, loading`); }
    for (const s of ["L", "R"]) { const a = (x.anchors && x.anchors[s]) || F[s].anchor; if (F[s].touching || !a) continue; const fp = o.states[this.geo.foot[s]].pos;
      if (Math.hypot(fp[0] - a.pos[0], fp[2] - a.pos[2]) <= PLAN.prospect.dxy && fp[1] - a.pos[1] <= PLAN.prospect.dy) { const c = V.add(a.pos, Q.rot(a.rot, this.geo.box.pos)); const f = footprint(this.geo.box, [c[0], c[2]], yawOf(a.rot)); pts.push(...f); pros.push(`${s} re-planting`); } }
    if (x.execFootprint) { pts.push(...x.execFootprint); pros.push("step landing"); }
    const prosp = hullXZ(pts); this.prosp = prosp; const mXi = polyDist(prosp, o.xi), hipCap = ctrl.hipCapHere ?? ctrl.hipCap.lat; let beyond = -mXi - hipCap;
    // friction-limited capture (C1 / C3's classifier formula): the horizontal force needed to bring ξ back to the COM exceeds what the turf
    // can supply. Evaluated on THIS (planning) view — its loads, ξ and COM — with the controller's μ beliefs (only once a foot has been seen
    // sliding, as in C1). (G1a finding: taking the controller's fricR, computed on the 50 ms feedback view, against the 120 ms planning view's
    // ξ faked a capture failure during a touchdown's load dip and ordered a spurious cross-over step — S7)
    // The capacity is μ_eff·W: over the capture horizon (~1/ω ≈ 0.3 s) the vertical ground force averages the body weight, so the
    // instantaneous normal load (C1's form) is the wrong measure here — it collapses for a few ms in every touchdown / unloading transient
    // and made a single planning cycle order a step (S7); μ_eff is the load-weighted μ of the feet ON the turf.
    const muO = ctrl.muObs || {}; if (Object.keys(muO).length) { let wmu = 0, nsum = 0; for (const s of ["L", "R"]) { const f = F[s]; if (!f.touching) continue; const N = Math.max(0, f.load); wmu += (muO[s] ?? BAL.muBelief) * N; nsum += N; }
      // (no foot on the turf this instant — a landing bounce: the last measured μ_eff; a real flight is the physical-evidence rule's case)
      if (nsum > 1) this.muEff = wmu / nsum; const fricR = o.h * (this.muEff ?? BAL.muBelief), dx = o.xi[0] - o.com[0], dz = o.xi[1] - o.com[2]; beyond = Math.max(beyond, Math.sqrt(dx * dx + dz * dz) - fricR - hipCap); }
    this.mXi = mXi; this.beyond = beyond; this.prospWhy = pros;
    if (x.stepping) { this.noCap = 0; set("STEPPING", "STEPPING", "a step is under way"); return this.out(); }
    // the planning view is OLDER than a contact event this controller itself executed (a touchdown / liftoff it has already seen on its
    // feedback view): a decision on it would re-plan a foot that has already landed (G1a finding: a corrective step ordered for the foot that
    // had just touched down). Hold the verdict until the planning view has caught up with that event.
    if (x.lastEventT != null && t < x.lastEventT) { this.noCap = 0; set(this.state === "STEPPING" ? "RECOVERABLE_IN_PLACE" : this.state, "WAIT_VIEW", "the planning view has not yet caught up with the last executed contact event"); return this.out(); }
    if (beyond <= 0) { this.noCap = 0; this.cand = null; this.p2 = null; const r = x.lastR || [0, 0];
      set(Math.hypot(r[0], r[1]) > 0.003 || mXi < BAL.copInset ? "RECOVERABLE_HIP" : "RECOVERABLE_IN_PLACE", "NOMINAL", pros.length ? `inside the prospective support (${pros.join(", ")})` : ""); return this.out(); }
    // a step is needed: search again every planning cycle (no latch)
    if (x.voluntary) { this.noCap += x.dt; set(this.noCap >= PLAN.confirmNoCapture ? "FALLING" : "STEP_NEEDED", this.noCap >= PLAN.confirmNoCapture ? "NO_CAPTURE_FOUND" : "STEP_NEEDED", "a voluntary (C2) request is under way — C2 does not step to recover", "planner"); return this.out(); }
    if (t - this.lastSearch >= 1 / PLAN.planHz - 1e-9 || this.verdict === "NOMINAL") { this.lastSearch = t; this.cand = this.tool._choose(o); this.p2 = null;
      if (!(this.cand && (this.cand.capture || this.cand.deficit <= STEP.maxDeficit))) this.p2 = this.tool._plan2(o); }
    const c = this.cand;
    if (c && (c.capture || c.deficit <= STEP.maxDeficit)) { this.noCap = 0; set("STEP_NEEDED", "MODIFIED", `step ${c.sw}: predicted ξ margin ${(c.margin * 100).toFixed(1)} cm`); return this.out(); }
    if (this.p2) { this.noCap = 0; set("STEP_NEEDED", "SEQUENCE", `2-step plan, first ${this.p2.c1.sw} (α ${this.p2.alpha})`); return this.out(); }
    this.noCap += x.dt; const why = c ? `best foothold leaves ξ ${(c.deficit * 100).toFixed(1)} cm outside` : "no reachable foothold (neither foot: " + ["L", "R"].map(s => `${s} ${F[s].touching ? (F[s].slipping ? "slipping" : "ok") : "off the turf"}`).join(", ") + ")";
    if (this.noCap >= PLAN.confirmNoCapture) set("FALLING", "NO_CAPTURE_FOUND", `the planner found no capture for ${(this.noCap * 1000).toFixed(0)} ms: ${why}`, "planner");
    else set("STEP_NEEDED", "NO_CAPTURE_FOUND", why, "planner");
    return this.out(); }
  // the step to take now (if any): the one-step candidate or the first step of the 2-step plan
  stepToTake() { if (this.verdict === "MODIFIED") return this.cand; if (this.verdict === "SEQUENCE" && this.p2) return { ...this.p2.c1, alpha: this.p2.alpha }; return null; }
  out() { return { state: this.state, verdict: this.verdict, reason: this.reason, kind: this.kind, mXi: this.mXi, beyond: this.beyond, prosp: this.prosp, prospWhy: this.prospWhy }; }
}

// ── one physical step ──
export class StepExecutor {
  constructor(tool) { this.tool = tool; this.geo = tool.geo; this.R = null; this.log = []; this.done = []; }
  ev(t, kind, what) { this.log.push({ t, kind, what }); }
  // c: { sw, st, target (sole centre x, z), yaw, tSw, xo?, alpha? }; kind: "rhythmic" | "corrective"; extra: rhythmic ξ plan
  start(o, c, kind, extra) { const g = this.geo, s0 = o.states[g.foot[c.sw]];
    const R = this.R = { sw: c.sw, st: c.st, cand: c, first: c, kind, tNeed: o.t, stage: "SWING", tSw0: o.t, tSw: o.t, p0: s0.pos.slice(), q0: s0.rot.slice(), cur0: g._center(o, c.sw), soleY0: g._soleLow(o, c.sw), air: 0, alpha: c.alpha ?? null, lastAim: o.t, ...(extra || {}) };
    this.tool._aim(R, o, c); if (kind === "rhythmic") { R.T = c.tSw; R.tSw = R.tSw0; this._groundEnd(R); this._timedInit(o, R, c.target, c.yaw); if (R.human) R.landC = c.target.slice(); }
    R.plannedTd = { t: R.tSw0 + R.T, center: c.target.slice() }; R.nominalTarget = c.target.slice();
    this.ev(o.t, "step", `${kind} ${c.sw} → (${c.target[0].toFixed(3)}, ${c.target[1].toFixed(3)}) · swing ${R.T.toFixed(2)} s`); return R; }
  // a TIMED (rhythmic) swing ends AT the ground (5 mm below flat) instead of C2's quasi-static approach point 1.5 cm above it followed by a slow
  // descent: a dynamic step must land when its capture-point plan says so — landing 100 ms late let ξ run past the landing foot (G1a finding)
  // the TIMED swing (rhythmic steps): the ankle lifts H (sin² bell) and moves horizontally (min-jerk over h0 → h1) straight to its foothold,
  // arriving vertically on the ground at u = 1; the boot is kept level (its yaw interpolated). V1.1's 30° dorsiflexion keeps a level boot
  // within its range for a 7 cm lift, so C2's knee-forward bias (a 15 cm forward-and-back excursion needed by V1's 20° ankle) is not used:
  // a 0.4 s step could not track it and landed 13 cm forward (G1a finding). A foothold change re-anchors the path so it stays continuous.
  _timedInit(o, R, target, yaw) { const g = this.geo, a = g._ankleFromCenter(target, yaw); R.tp0 = R.p0.slice(); R.tpT = [a[0], g.yFlat + SUP.touchDepth, a[1]]; R.yaw0 = yawOf(R.q0); R.yawT = yaw; R.timed = true; }
  _timedRetarget(o, R, target, t) { if (R.human) { R.landC = target.slice(); return; }   // (the human swing blends toward its landing in late swing)
    const g = this.geo, a = g._ankleFromCenter(target, R.yawT), u = Math.min(1, (t - R.tSw0) / R.T), sw = PLAN.swing, uh = Math.max(0, Math.min(1, (u - sw.h0) / (sw.h1 - sw.h0))), sh = minjerk(uh);
    const cur = this._timedAt(R, t).pos, nT = [a[0], R.tpT[1], a[1]]; if (sh < 0.95) { R.tp0 = [(cur[0] - nT[0] * sh) / (1 - sh), R.tp0[1], (cur[2] - nT[2] * sh) / (1 - sh)]; } R.tpT = nT; }
  // (G2a) a HUMAN swing (R.human): the locomotion layer's reference-shaped generator (toe pivot → the gait reference's swing-leg motion from the
  // ACTUAL hip → the planned foothold, forefoot first); o: the observation whose hip / pelvis the reference is attached to
  _timedAt(R, t, o) { if (R.human && this.refSwing) return this.refSwing(R, t, o || this._o);
    const sw = PLAN.swing, T = R.T, u = Math.min(1, (t - R.tSw0) / T), p0 = R.tp0, pT = R.tpT, uh = Math.max(0, Math.min(1, (u - sw.h0) / (sw.h1 - sw.h0))), sh = minjerk(uh), dsh = uh > 0 && uh < 1 ? 30 * uh * uh * (1 - uh) * (1 - uh) / ((sw.h1 - sw.h0) * T) : 0;
    const sv = minjerk(u), dsv = u < 1 ? 30 * u * u * (1 - u) * (1 - u) / T : 0, sn = Math.sin(Math.PI * u), cs = Math.cos(Math.PI * u), bell = sn * sn, dbell = 2 * sn * cs * Math.PI / T;
    const pos = [p0[0] + (pT[0] - p0[0]) * sh, p0[1] + (pT[1] - p0[1]) * sv + sw.H * bell, p0[2] + (pT[2] - p0[2]) * sh], yaw = R.yaw0 + (R.yawT - R.yaw0) * sh;
    return { pos, rot: Q.axis([0, 1, 0], yaw), vel: u < 1 ? [(pT[0] - p0[0]) * dsh, (pT[1] - p0[1]) * dsv + sw.H * dbell, (pT[2] - p0[2]) * dsh] : [0, 0, 0], u, reach: [pT[0], pT[1], pT[2]] }; }
  _groundEnd(R) { R.pT[1] = this.geo.yFlat + SUP.touchDepth; R.fastDescend = true; }
  stepping() { return !!(this.R && ["SWING", "DESCEND", "OBSTRUCTED", "ACCEPT"].includes(this.R.stage)); }
  footprintIfOnTrack() { const R = this.R; if (!R || !["SWING", "DESCEND"].includes(R.stage) || (R.u || 0) < PLAN.stepProspectU) return null; return footprint(this.geo.box, R.proj.target, R.proj.yaw); }
  // o: the FEEDBACK-delayed observation; truth: { obstructedAt: { L, R } (the gait layer's times) }
  update(o, truth) {
    const R = this.R; if (!R) return null; this._o = o; const t = o.t, g = this.geo, F = o.feet, sw = R.sw, st = R.st, T = this.tool;
    const plan = { stepping: true, swing: {}, step: R, swingKpDrop: 0 };
    if (["SWING", "DESCEND", "OBSTRUCTED"].includes(R.stage)) {
      // OBSTRUCTED (the gait layer saw a non-turf contact on this leg; this executor reacts once its own delayed view has reached that time)
      if (R.stage !== "OBSTRUCTED" && truth.obstructedAt[sw] != null && t >= truth.obstructedAt[sw] && R.liftoff) {
        const fp = o.states[g.foot[sw]]; R.stage = "OBSTRUCTED"; R.obst = { t, tTruth: truth.obstructedAt[sw], pos: fp.pos.slice(), rot: fp.rot.slice(), yTop: fp.pos[1] };
        this.ev(t, "OBSTRUCTED", `${sw}: stop progressing, set the foot down where it is (reaction ${((t - truth.obstructedAt[sw] + (this.dFb || 0)) * 1000).toFixed(0)} ms after the contact, of which ${((this.dFb || 0) * 1000).toFixed(0)} ms is the feedback view's age)`); R.obst.reactS = t - truth.obstructedAt[sw] + (this.dFb || 0); }
      // re-plan the foothold from the current state: corrective — during the rise (C3); rhythmic — follow the capture-point error in early swing
      if (R.stage === "SWING" && R.kind === "corrective" && t - R.tSw < STEP.replanUntil * R.T) { const c = T._candidate(o, sw, R.cur0, t - R.tSw, R.alpha); if (c && c.feasible) { R.cand = c; T._aim(R, o, c); R.plannedTd.center = c.target.slice(); } }
      if (R.stage === "SWING" && R.kind === "rhythmic" && (R.u || 0) < PLAN.adjustUntil && t - R.lastAim >= 1 / 60 - 1e-9) { R.lastAim = t; this._adjust(o, R); }
      let tg; if (R.stage === "OBSTRUCTED") { const y = Math.max(g.yFlat + SUP.touchDepth, R.obst.yTop - PLAN.obstruct.descendV * (t - R.obst.t)), yaw = yawOf(R.obst.rot);
        tg = { pos: [R.obst.pos[0], y, R.obst.pos[2]], rot: Q.axis([0, 1, 0], yaw), vel: [0, -PLAN.obstruct.descendV, 0], u: R.u, reach: [R.obst.pos[0], g.yFlat + SUP.touchDepth, R.obst.pos[2]] }; }
      else if (R.timed) { tg = this._timedAt(R, t + (this.lead || 0), o); if (R.stage === "DESCEND") { const y = (R.human ? tg.pos[1] : R.tpT[1]) - Math.min(0.04, PLAN.obstruct.descendV * (t - R.tD)); tg = { ...tg, pos: [tg.pos[0], y, tg.pos[2]], vel: [0, -PLAN.obstruct.descendV, 0] }; } }
      else { tg = R.xo ? T._swingCross(R, t) : R.heelUp ? T._swingHeelUp(R, t) : g._swingAt(R, t);
        if (R.fastDescend && R.stage === "DESCEND") { const y = R.pT[1] - Math.min(0.04, PLAN.obstruct.descendV * (t - R.tD)); tg = { ...tg, pos: [tg.pos[0], y, tg.pos[2]], vel: [0, -PLAN.obstruct.descendV, 0] }; } }
      plan.copFoot = st; plan.xiRef = R.kind === "rhythmic" ? this._xiD(R, t, o) : o.xi.slice(); if (R.kind === "rhythmic") plan.xiDot = R.xiDotNow; if (R.walkK) { plan.kXi = R.walkK.kXi ?? { hd: R.walkK.hd, along: 0, across: BAL.kXi }; if (R.walkK.latCop) plan.latCop = { foot: st, cap: R.walkK.latCop }; } plan.swing[sw] = tg; R.u = tg.u; R.lastTgt = tg;
      if (!R.liftoff) { if (!F[sw].touching && F[sw].load < 25) R.air++; else R.air = 0;
        if (R.air >= 3) { R.liftoff = { t }; this.lastEventT = t; this.ev(t, "liftoff", `${sw} ${(t - R.tNeed).toFixed(3)} s after the step started`); }
        else if (t - R.tSw0 > STEP.liftTimeout) { R.stage = "FAILED"; R.fail = `the ${sw} foot did not leave the ground within ${STEP.liftTimeout} s (load ${F[sw].load.toFixed(0)} N)`; this.ev(t, "FAILED", R.fail); } }
      if (R.stage !== "FAILED") {
        // ((G2a) a HUMAN step's toe pivot is a contact phase — the pressed toe may bounce; touchdown detection arms only after the pivot)
        if (!R.armed && !F[sw].touching && g._soleLow(o, sw) - R.soleY0 >= STEP.armRise && !(R.human && (t - R.tSw0) / R.T < (R.wA ?? 0.2) + 0.05)) { R.armed = true; R.armedT = t; }
        if (R.armed && F[sw].touching) { const s1 = o.states[g.foot[sw]]; R.td = { t, pos: s1.pos.slice(), rot: s1.rot.slice(), center: g._center(o, sw), xi: o.xi.slice(), uAt: R.u, planned: R.plannedTd.center, plannedT: R.plannedTd.t, fromNeed: t - R.tNeed, obstructed: !!R.obst };
          const wpS = g._weightPoint(o, st), wpW = g._weightPoint(o, sw); R.accTo = [(wpS[0] + wpW[0]) / 2, (wpS[1] + wpW[1]) / 2];
          const sS = o.states[g.foot[st]]; R.anchors = { [sw]: { foot: sw, pos: s1.pos.slice(), rot: s1.rot.slice() }, [st]: { foot: st, pos: sS.pos.slice(), rot: sS.rot.slice() } };
          R.stage = "ACCEPT"; R.tT = t; R.acc = 0; R.again = 0; delete plan.swing[sw]; this.lastEventT = t;
          this.ev(t, "touchdown", `${sw} at u ${R.u.toFixed(2)} · ${(Math.hypot(R.td.center[0] - R.td.planned[0], R.td.center[1] - R.td.planned[1]) * 100).toFixed(1)} cm from the planned foothold${R.obst ? " (after an obstruction)" : ""} · ${((t - R.td.plannedT) * 1000).toFixed(0)} ms vs the planned time`); }
        else if (R.stage === "SWING" && R.u >= 1) { R.stage = "DESCEND"; R.tD = t; }
        else if (R.stage === "DESCEND" && t - R.tD > STEP.noContact) { R.stage = "FAILED"; R.fail = "MISSED: no ground contact after the planned touchdown"; this.ev(t, "MISSED", R.fail); } }
      if (R.stage !== "ACCEPT" && R.stage !== "FAILED") return plan; }
    if (R.stage === "ACCEPT") {
      if (R.kind === "rhythmic") { R.stage = "DONE"; R.status = "LANDED"; this.done.push(R); this.R = null; return { handover: true, R }; }   // the rhythm's double support takes over
      for (const s of [sw, st]) if (!F[s].touching) { const ft = o.states[g.foot[s]], low = g._soleLow(o, s); R.anchors[s] = { foot: s, pos: [ft.pos[0], ft.pos[1] - Math.max(0, low), ft.pos[2]], rot: ft.rot.slice() }; }
      plan.xiRef = R.accTo.slice(); plan.anchors = R.anchors; { const x = Math.min(1, (t - R.tT) / STEP.softenT); if (x < 1) plan.soften = { foot: sw, k: STEP.softenK + (1 - STEP.softenK) * minjerk(x) }; }
      const vc = Math.hypot(o.vcom[0], o.vcom[2]), ok = o.xiMargin >= STEP.accMargin && vc <= STEP.accV && F[sw].loaded && F[st].touching; R.acc = ok ? R.acc + 1 : 0;
      const away = R.prevXiM != null && o.xiMargin < R.prevXiM - 1e-5; R.prevXiM = o.xiMargin; R.again = o.xiMargin < 0 && away ? R.again + 1 : o.xiMargin < 0 ? R.again : 0;
      if (R.acc >= STEP.accSteps) { R.stage = "DONE"; R.status = "RECOVERED_WITH_STEP"; R.accepted = { t, fromNeed: t - R.tNeed }; this.ev(t, "recovered", `in the new support ${(t - R.tNeed).toFixed(2)} s after the step began`); this.done.push(R); this.R = null; return { rest: { xiRef: R.accTo.slice(), anchors: R.anchors } }; }
      // the next step is due when the capture point is still outside the new support and receding (C1's criterion) — handed to the planner
      if (R.again >= STEP.againSteps) { R.stage = "DONE"; R.status = "NEXT_STEP"; this.ev(t, "next step", "ξ still outside the new support and receding — the planner chooses the next step"); this.done.push(R); this.R = null; return { rest: { xiRef: R.accTo.slice(), anchors: R.anchors }, next: true }; }
      if (t - R.tT > STEP.accTimeout) { R.stage = "DONE"; R.status = "STEP_TAKEN_NOT_SETTLED"; this.done.push(R); this.R = null; return { rest: { xiRef: R.accTo.slice(), anchors: R.anchors } }; }
      return plan; }
    // FAILED: the step no longer shields the posture; the monitor decides
    R.stage = "DONE"; R.status = R.status || "FAILED"; this.done.push(R); this.R = null; return { failed: true, R }; }
  // (G2b) ONLINE DCM FOOT PLACEMENT for a walking step: the capture point at the EXPECTED touchdown (the plan's single-support time), predicted
  // from the measured state with the stance foot's own balance law and finite ankle (_predictTd), placed by the same law as the plan,
  // Δ = (E2(ξ_td − p_st) − c_next)/κ, within the walk's bounds and the leg's reach
  _adjustWalk(o, R) { const K = R.walkK, Trem = Math.max(0, R.tSw0 + K.Tss - o.t), pred = this._predictTd(o, R, Trem), pS = R.pSt, hd = K.hd, rt = [hd[1], -hd[0]];
    const D = K.dcm(pred, pS); let df = K.Ln + K.gf * (D[0] - K.Ln), dl = K.side * K.w + K.g * (D[1] - K.side * K.w); const dl0 = dl;
    df = Math.max(-0.15, Math.min(K.Lmax, df)); dl = K.side > 0 ? Math.max(K.wMin, Math.min(K.wMax, dl)) : Math.min(-K.wMin, Math.max(-K.wMax, dl));
    let tc = [pS[0] + hd[0] * df + rt[0] * dl, pS[1] + hd[1] * df + rt[1] * dl]; (R.adjLog = R.adjLog || []).push({ t: o.t, xi: o.xi.slice(), pred, tc: tc.slice(), Trem, D, dl0, dl });
    if (Math.hypot(tc[0] - R.proj.target[0], tc[1] - R.proj.target[1]) < PLAN.adjustTol) return;
    const dC = dComAt(o, pS, Trem), ok = (p) => this.tool._feasible(o, R.sw, p, R.proj.yaw, R.cur0, dC, null).ok; if (!ok(tc)) { const a = R.proj.target; let lo = 0, hi = 1; for (let i = 0; i < 16; i++) { const m = (lo + hi) / 2; if (ok([a[0] + (tc[0] - a[0]) * m, a[1] + (tc[1] - a[1]) * m])) lo = m; else hi = m; } tc = [a[0] + (tc[0] - a[0]) * lo, a[1] + (tc[1] - a[1]) * lo]; }
    const c = { ...R.cand, target: tc, tSw: R.T }; const T0 = R.T; this.tool._aim(R, o, c); R.T = T0; R.tSw = R.tSw0; this._groundEnd(R); this._timedRetarget(o, R, tc, o.t); R.plannedTd.center = tc.slice(); R.adjusted = (R.adjusted || 0) + 1; R.adjustCm = Math.hypot(tc[0] - R.nominalTarget[0], tc[1] - R.nominalTarget[1]) * 100; }
  // rhythmic: the planned capture-point trajectory during single support (LIPM about the stance foot's nominal CoP p_st)
  _xiD(R, t, o) { if (R.walkK && R.walkK.r) { const K = R.walkK, w = o.omega0, q = segXi(R.xiIni, [R.pSt[0] - K.hd[0] * K.r, R.pSt[1] - K.hd[1] * K.r], [R.pSt[0] + K.hd[0] * K.r, R.pSt[1] + K.hd[1] * K.r], K.Tss, Math.max(0, t - R.tSw0), w);
      R.xiDotNow = [w * (q.xi[0] - q.p[0]), w * (q.xi[1] - q.p[1])]; R.pNomNow = q.p; return q.xi; }   // ((G2b) the stance CoP rolls heel → toe)
    const w = o.omega0, e = dexp(w * Math.max(0, t - R.tSw0)), xi = [R.pSt[0] + (R.xiIni[0] - R.pSt[0]) * e, R.pSt[1] + (R.xiIni[1] - R.pSt[1]) * e]; R.xiDotNow = [w * (xi[0] - R.pSt[0]), w * (xi[1] - R.pSt[1])]; return xi; }
  // rhythmic foothold adjustment: the landing target moves with the predicted capture-point error at touchdown (bounded, reach-checked)
  // the capture point at the planned touchdown, predicted WITH the balance law the stance foot is running (p = ξ_d − ξ̇_d/ω + (1 + kXi)(ξ − ξ_d)),
  // its CoP limited to the stance sole AND to what the stance ankle's finite torques can hold (roll ±τ_Z / W sideways, τ_plantar / W ahead,
  // τ_dorsi / W behind the ankle). Only the part of the error the ankle cannot remove moves the foothold (a fixed-CoP prediction amplified
  // every ankle-correctable error by e^{ωT} and pushed the footholds 12 cm out — G1a finding).
  _predictTd(o, R, Trem) { const w = o.omega0, g = this.geo, ctrl = this.tool.ctrl, st = R.st, sole = g._sole(o, st), ank = o.states[g.foot[st]].pos, hd = g._heading(o, st), rt = [hd[1], -hd[0]];
    const Wt = this.tool.W, L = ctrl.limits.ankle, m = ctrl.mult, fwdMax = L.Y[1] * m / Wt, backMax = -L.Y[0] * m / Wt, latMax = L.Z[1] * m / Wt;
    let xi = o.xi.slice(); const h = 0.01, n = Math.max(0, Math.round(Trem / h)); let tt = o.t - R.tSw0;
    for (let i = 0; i < n; i++) { let xd, pN = R.pSt; if (R.walkK && R.walkK.r) { const K = R.walkK, q = segXi(R.xiIni, [R.pSt[0] - K.hd[0] * K.r, R.pSt[1] - K.hd[1] * K.r], [R.pSt[0] + K.hd[0] * K.r, R.pSt[1] + K.hd[1] * K.r], K.Tss, tt, w); xd = q.xi; pN = q.p; }
      else { const e = dexp(w * tt); xd = [R.pSt[0] + (R.xiIni[0] - R.pSt[0]) * e, R.pSt[1] + (R.xiIni[1] - R.pSt[1]) * e]; }
      const ex = [xi[0] - xd[0], xi[1] - xd[1]], kq = kXiErr(R.walkK ? (R.walkK.kXi ?? { hd: R.walkK.hd, along: 0, across: BAL.kXi }) : BAL.kXi, ex); let p = [pN[0] + ex[0] + kq[0], pN[1] + ex[1] + kq[1]];
      const d = [p[0] - ank[0], p[1] - ank[2]], f = Math.max(-backMax, Math.min(fwdMax, d[0] * hd[0] + d[1] * hd[1])), l = Math.max(-latMax, Math.min(latMax, d[0] * rt[0] + d[1] * rt[1]));
      p = [ank[0] + hd[0] * f + rt[0] * l, ank[2] + hd[1] * f + rt[1] * l]; if (sole.length >= 3 && polyDist(sole, p) < 0) { const c = this._nearest(sole, p); p = c; }
      xi = [xi[0] + h * w * (xi[0] - p[0]), xi[1] + h * w * (xi[1] - p[1])]; tt += h; }
    return xi; }
  _nearest(P, x) { let best = null, bd = 1e18; for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length], e = [b[0] - a[0], b[1] - a[1]], L2 = e[0] * e[0] + e[1] * e[1] || 1, tq = Math.max(0, Math.min(1, ((x[0] - a[0]) * e[0] + (x[1] - a[1]) * e[1]) / L2)), q = [a[0] + e[0] * tq, a[1] + e[1] * tq], d = (q[0] - x[0]) ** 2 + (q[1] - x[1]) ** 2; if (d < bd) { bd = d; best = q; } } return best; }
  _adjust(o, R) { if (R.walkK) return this._adjustWalk(o, R); const Trem = Math.max(0, R.tSw0 + R.T - o.t), pred = this._predictTd(o, R, Trem);
    let d = [pred[0] - R.xiTdNom[0], pred[1] - R.xiTdNom[1]]; const n = Math.hypot(d[0], d[1]); (R.adjLog = R.adjLog || []).push({ t: o.t, xi: o.xi.slice(), pred, nom: R.xiTdNom.slice(), d: d.slice(), Trem }); if (n > PLAN.adjustMax) d = [d[0] * PLAN.adjustMax / n, d[1] * PLAN.adjustMax / n];
    let tc = [R.nominalTarget[0] + d[0], R.nominalTarget[1] + d[1]]; if (Math.hypot(tc[0] - R.proj.target[0], tc[1] - R.proj.target[1]) < PLAN.adjustTol) return;
    const ok = (p) => this.tool._feasible(o, R.sw, p, R.proj.yaw, R.cur0, [0, 0], null).ok; if (!ok(tc)) { let lo = 0, hi = 1; for (let i = 0; i < 16; i++) { const m = (lo + hi) / 2; if (ok([R.nominalTarget[0] + d[0] * m, R.nominalTarget[1] + d[1] * m])) lo = m; else hi = m; } tc = [R.nominalTarget[0] + d[0] * lo, R.nominalTarget[1] + d[1] * lo]; }
    const c = { ...R.cand, target: tc, tSw: R.T }; const T0 = R.T; this.tool._aim(R, o, c); R.T = T0; R.tSw = R.tSw0; this._groundEnd(R); this._timedRetarget(o, R, tc, o.t); R.plannedTd.center = tc.slice(); R.adjusted = (R.adjusted || 0) + 1; R.adjustCm = Math.hypot(tc[0] - R.nominalTarget[0], tc[1] - R.nominalTarget[1]) * 100; }
}

// ── the planner: voluntary transfer / C2 requests, rhythm, corrective steps, and the viability monitor ──
export class LocoPlanner {
  constructor(spec, P, ctrl, tool, opts) { this.spec = spec; this.ctrl = ctrl; this.tool = tool; this.geo = tool.geo; this.opts = opts || {};
    this.monitor = new ViabilityMonitor(ctrl, tool); this.exec = new StepExecutor(tool); this.seq = this.opts.seq || null; this.transfer = (this.opts.transfer || []).map(r => ({ ...r }));
    this.rhythm = this.opts.rhythm ? { ...this.opts.rhythm, i: 0, stage: "WAIT", steps: this.opts.rhythm.steps.map(s => ({ ...s })) } : null;
    this.rest = null; this.episode = { steps: 0, quiet: 0 }; this.log = []; this.lastPlan = null; }
  ev(t, kind, what) { this.log.push({ t, kind, what }); }
  anchorsNow(o) { const g = this.geo, A = {}; for (const s of ["L", "R"]) { const st = o.states[g.foot[s]]; A[s] = { foot: s, pos: st.pos.slice(), rot: st.rot.slice() }; } return A; }
  mid(o) { const a = this.geo._weightPoint(o, "L"), b = this.geo._weightPoint(o, "R"); return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; }
  // the gait layer's view of the current intent (its truth overrides it)
  intent(truth) { const R = this.exec.R, g = this.geo;
    if (R && ["SWING", "DESCEND", "OBSTRUCTED", "ACCEPT"].includes(R.stage)) return { src: "exec", liftExpected: true, sw: R.sw, stage: !R.liftoff && R.stage === "SWING" ? "UNLOADING" : R.stage, armed: !!R.armed, plannedTd: R.plannedTd, u: R.u, center: g._center(truth, R.sw), phaseAt: (R.sw === "R" ? 0.5 : 0) + 0.5 * Math.min(1, R.u || 0) };
    // rhythm double support: the foot being unloaded for the next step (its role is UNLOADING; it has no swing yet)
    const tr = this.transfer && this.transfer[0]; if (tr && ["TRANSFER", "HOLD", "BACK"].includes(tr.stage)) return { src: "transfer", sw: tr.foot, stage: tr.stage === "BACK" ? "LOADING" : "UNLOADING", armed: false, plannedTd: null, u: 0, center: g._center(truth, tr.foot), phaseAt: null };
    const rh = this.rhythm; if (rh && rh.stage === "DS" && rh.unloading) return { src: "rhythm", sw: rh.unloading, stage: "UNLOADING", armed: false, plannedTd: null, u: 0, center: g._center(truth, rh.unloading), phaseAt: null };
    const S = this.seq && this.seq.cur && !this.seq.cur.done ? this.seq.cur : null;
    if (S && S.foot) { const stg = { TRANSFER: "UNLOADING", LIFTOFF: "UNLOADING", SWING: "SWING", HOVER: "SWING", LOWER: "SWING", ALIGN: "SWING", DESCEND: "DESCENDING", BLOCKED: "OBSTRUCTED", ACCEPT: "LOADING" }[S.stage];
      if (stg) return { src: "seq", liftExpected: S.stage === "LIFTOFF", sw: S.foot, stage: stg, armed: !!S.armed, plannedTd: S.tSw != null && S.proj ? { t: S.tSw + S.T, center: S.proj.target } : null, u: S.u, center: g._center(truth, S.foot), phaseAt: null }; }
    return null; }
  // oFb: feedback-delayed view (execution, balance); oPl: planning-delayed view (decisions); truthCtx: { obstructedAt } from the gait layer
  update(oFb, oPl, truthCtx, dt, lastR) {
    this.exec.lead = this.opts.timedLead ? dt : 0;
    const t = oFb.t, g = this.geo; let plan = null;
    // 1. the step under way (execution on the feedback view)
    const er = this.exec.update(oFb, truthCtx);
    if (er && er.stepping) plan = er;
    else if (er && er.handover) { const r = this.rhythm; if (r) { r.stage = "DS"; r.tDs = oFb.t; r.tTd = oFb.t; r.preRise = 0; r.lastLanded = er.R.sw; r.anchors = this.anchorsNow(oFb); r.dsFrom = oFb.xi.slice(); r.i++;
      // (G2a) a HUMAN step contacts forefoot first: the landed foot's anchor is its LEVEL pose about the toe contact (the heel lowers onto
      // the turf), not the heel-up contact pose — held there, a foot that bounced off its toe hovered unloaded through the double support
      if (er.R.human && r.anchors[er.R.sw]) { const a = r.anchors[er.R.sw], b = this.geo.box, toeL = [b.pos[0], b.pos[1] - b.he[1], b.pos[2] + (er.R.heelStrike ? -1 : 1) * b.he[2]], lvl = Q.axis([0, 1, 0], yawOf(a.rot)), toeW = V.add(a.pos, Q.rot(a.rot, toeL));   // (a heel strike's level pose is about the HEEL)
        r.anchors[er.R.sw] = { foot: er.R.sw, pos: V.sub(toeW, Q.rot(lvl, toeL)), rot: lvl }; r.humanLand = er.R.sw; } else r.humanLand = null;
      // (G2b) the walking double support starts from the PLAN's ξ at the actual touchdown time; the CoP reference moves from the trailing foot's
      // stance point to the landed foot's over Tds
      if (r.walk && er.R.td && er.R.td.uAt > 0.5) r.uTd = 0.5 * (r.uTd || 0.88) + 0.5 * Math.min(1, er.R.td.uAt);   // (the measured touchdown fraction of the swing)
      if (r.walk && er.R.pSt) { const w = oFb.omega0, e = dexp(w * (oFb.t - er.R.tSw0)), x0 = r.walk.openLoop ? [er.R.pSt[0] + (er.R.xiIni[0] - er.R.pSt[0]) * e, er.R.pSt[1] + (er.R.xiIni[1] - er.R.pSt[1]) * e] : oFb.xi.slice();
        const ps = this._hdg(), hd = [Math.sin(ps), Math.cos(ps)], R0 = r.wk.r, pL = this._wkP(oFb, er.R.sw);
        r.wds = { t0: oFb.t, xi0: x0, p0: [er.R.pSt[0] + hd[0] * R0, er.R.pSt[1] + hd[1] * R0], p1: [pL[0] - hd[0] * R0, pL[1] - hd[1] * R0], pC: pL, T: r.Tds }; } } }
    else if (er && er.rest) { this.rest = er.rest; if (this.rhythm && this.rhythm.paused) { this.rhythm.paused = false; this.rhythm.stage = "DS"; this.rhythm.tDs = t; this.rhythm.tTd = t; this.rhythm.anchors = er.rest.anchors; this.rhythm.dsFrom = oFb.xi.slice(); } }
    else if (er && er.failed) { if (this.rhythm && this.rhythm.stage !== "DONE") { this.rhythm.stage = "ABORTED"; this.ev(t, "rhythm", `aborted: ${er.R.fail}`); } }
    // 2. voluntary C2 requests (quasi-static placement) / transfer-only requests / the rhythm
    if (!plan && this.seq) { const p = this.seq.update(oFb); if (p && (p.request || p.xiRef)) plan = p; }
    if (!plan && this.transfer.length) plan = this._transfer(oFb);
    if (!plan && this.rhythm) plan = this._rhythm(oFb);
    // 3. the viability monitor (on the planning view); a corrective step when the monitor finds one and nothing is under way
    const voluntary = !!(this.seq && this.seq.cur && !this.seq.cur.done) || this.transfer.some(r => r.stage && r.stage !== "DONE" && r.stage !== "WAIT");
    const anchors = (plan && plan.anchors) || (this.rest && this.rest.anchors) || null;
    const lastEventT = this.exec.lastEventT ?? null;
    const mon = this.monitor.evaluate(oPl, { stepping: this.exec.stepping(), execFootprint: this.exec.footprintIfOnTrack(), voluntary, dt, lastR, anchors, plannedFlight: false, lastEventT });
    const walkNoCorr = this.rhythm && this.rhythm.walk && this.rhythm.walk.noCorrective && !["DONE", "ABORTED", "WAIT", "PAUSED"].includes(this.rhythm.stage);   // (diagnostic)
    if (!this.exec.R && !walkNoCorr && (mon.verdict === "MODIFIED" || mon.verdict === "SEQUENCE") && this.episode.steps < PLAN.seqMax) { const c = this.monitor.stepToTake();
      if (c) { if (this.rhythm && !["DONE", "ABORTED", "WAIT"].includes(this.rhythm.stage)) { this.rhythm.paused = true; this.rhythm.stage = "PAUSED"; }
        this.exec.start(oFb, c, "corrective"); this.episode.steps++; this.ev(t, "corrective step", `${c.sw} (${mon.verdict}, episode step ${this.episode.steps})`); plan = this.exec.update(oFb, truthCtx) || plan; } }
    if (mon.verdict === "NOMINAL") { this.episode.quiet += dt; if (this.episode.quiet >= PLAN.episodeQuiet) this.episode.steps = 0; } else this.episode.quiet = 0;
    if (!plan && this.rest) plan = { stepping: false, swing: {}, xiRef: this.rest.xiRef.slice(), anchors: this.rest.anchors };
    // (G2b) walking: the stance legs' velocity feed-forward is the COM velocity the planned capture point implies, ċ_d = ω(ξ_d − c) — without
    // it the stance damping (≈ 290 N·s/m) acts as a brake on every stride (the single support of in-place stepping never needed one)
    if (plan && plan.xiRef && this.rhythm && this.rhythm.walk && this.rhythm.walk.vRef !== false && !["DONE", "ABORTED", "WAIT"].includes(this.rhythm.stage)) { const w = oFb.omega0; plan.vRef = [w * (plan.xiRef[0] - oFb.com[0]), w * (plan.xiRef[1] - oFb.com[2])]; }
    this.ctrl.monitorState = { state: mon.state, reason: mon.reason }; this.lastPlan = plan; return { plan, monitor: mon }; }
  // ── rhythm: in-place / placement stepping at a set cadence ──
  _rhythm(o) { const r = this.rhythm, t = o.t, g = this.geo, Rp = PLAN.rhythm, Tss = r.Tss || Rp.Tss, Tds = r.Tds || Rp.Tds;
    if (r.stage === "WAIT") { if (t < (r.at || 0.5)) return null; r.stage = "DS"; r.tDs = t; r.first = true; r.dsFrom = this.mid(o); r.anchors = this.anchorsNow(o);
      // HOME footholds (captured once): an in-place / placement step is planned relative to where the foot stood when the rhythm began — not
      // to where it last landed — so per-step landing errors do not accumulate into drift (G1a finding: +3 cm forward / +4 cm outward over 5 steps)
      r.home = { L: g._center(o, "L"), R: g._center(o, "R") }; r.homeYaw = { L: yawOf(o.states[g.foot.L].rot), R: yawOf(o.states[g.foot.R].rot) }; if (r.walk) this._walkInit(o, r); }
    if (r.stage === "PAUSED" || r.stage === "ABORTED") return null;
    if (r.stage === "DONE") return { stepping: false, swing: {}, xiRef: r.restXi, anchors: r.anchors };
    const next = r.steps[r.i];
    if (r.stage === "DS") { const T = r.first ? (r.Tfirst || Rp.Tfirst) : !next ? (r.Tlast || Rp.Tlast) : Tds, plan = { stepping: false, swing: {}, anchors: r.anchors };
      let to, u; if (r.walk && r.wds && next && !r.first) u = this._walkDS(o, r, plan);   // (G2b) the walking double support: the analytic LIPM reference, CoP trailing → leading
      else { if (!next) to = r.restXi = r.restXi || this.mid(o); else if (r.walk) { if (!r.wFirst) r.wFirst = this._walkFirstXi(o, next); to = r.wFirst; } else { const pl = this._xiPlan(o, next, Tss); to = pl.xiIni; next.pl = pl; }
        u = g._transfer(plan, o, `rhythm:ds:${r.i}`, r.dsFrom, to, r.tDs, T); }
      if (r.tTd != null && t - r.tTd < STEP.softenT && r.lastLanded) plan.soften = { foot: r.lastLanded, k: STEP.softenK + (1 - STEP.softenK) * minjerk((t - r.tTd) / STEP.softenT) };
      // (G2a) after a forefoot contact the heel LOWERS: the landed foot is aimed level on a compliant ankle (C2's heel rocker, plan.settle) until
      // its sole is down (heel and toe in contact) — the load acceptance of a human step; the body's weight, not a position target, lowers it
      if (r.humanLand && r.humanLand === r.lastLanded && next && !(o.feet[r.humanLand].heel && o.feet[r.humanLand].toe)) plan.settle = { foot: r.humanLand, level: true };
      r.unloading = next && this.ctrl.opts.unloadPlan && (u > 0.4 || (r.walk && plan.unloading)) ? next.sw : null;
      // ((G2b, walk.firstProg) the FIRST walking transfer unloads the stepping foot by the capture point's PROGRESS toward its target, not by the
      // clock: unloaded on time while ξ was still 4 cm short, the foot lifted, the CoP jumped under the stance foot and pushed ξ back — the
      // first step then needed the maximum width)
      let uU = u; if (r.walk && r.first && r.walk.firstProg && r.wFirst && r.dsFrom) { const d0 = Math.hypot(r.dsFrom[0] - r.wFirst[0], r.dsFrom[1] - r.wFirst[1]), d = Math.hypot(o.xi[0] - r.wFirst[0], o.xi[1] - r.wFirst[1]); uU = Math.min(u, d0 > 1e-3 ? Math.max(0, 1 - d / d0) : 1); }
      if (next && this.ctrl.opts.unloadPlan && uU > 0.4 && !(r.walk && plan.unloading)) { if (next.share0 == null) next.share0 = Math.max(0, Math.min(1, o.feet[next.sw].load / (this.spec.totalMass * 9.81))); plan.unloading = { foot: next.sw, maxShare: next.share0 * (1 - minjerk((uU - 0.4) / 0.6)), bandCap: r.walk ? r.walk.copBand : null }; }
      // (G2a) a human double support ends on the CONTACT, not the clock: the trailing foot lifts once the landed foot's sole is down (heel and
      // toe) and it carries its planned share (≥ 35 % BW), or at the latest 0.3 s after the planned end (phase follows measured progress)
      if (u >= 1 && next && r.humanLand && r.humanLand === r.lastLanded && t - r.tDs < T + 0.3) { const F = o.feet[r.humanLand], W = this.spec.totalMass * 9.81;
        if (!(F.heel && F.toe && F.load >= 0.35 * W)) return plan;
        if (r.walk && r.walk.dsLoadGate !== false && o.feet[next.sw].load > (r.walk.dsLoadGate ?? 0.30) * W) return plan;
        // ((G2b, latDS "track") the double support also lasts until the sideways capture point has reached its offset (bounded by the 0.3 s above))
        if (r.walk && r.walk.latDS === "track" && r.wdsLat && Math.abs(r.wdsLat.lN - r.wdsLat.latT) > (r.walk.latTol ?? 0.01) && t - r.tDs < T + (r.walk.latExt ?? 0.12)) return plan; }   // ((G2b) walking: the trailing foot leaves once it has actually unloaded)
      // ((G2b) the FIRST walking transfer (from standing) ends when the measured capture point has reached the first single support's start
      // within walk.firstTol, at most firstExt s late: a 2 cm shortfall became a 15 cm wider first step through the step's e^{ωT} sensitivity)
      if (u >= 1 && next && r.walk && r.first && r.wFirst && r.walk.firstTol && Math.hypot(o.xi[0] - r.wFirst[0], o.xi[1] - r.wFirst[1]) > r.walk.firstTol && t - r.tDs < T + (r.walk.firstExt ?? 0.4)) return plan;
      if (u >= 1) { if (!next) { r.stage = "DONE"; this.ev(t, "rhythm", `done: ${r.i} steps`); return { stepping: false, swing: {}, xiRef: r.restXi, anchors: r.anchors }; }
        // ((G2b) each single support's plan starts from the MEASURED capture point — the plan is re-anchored at every gait event, so its
        // exponential divergence never accumulates timing errors; the DCM foothold law then corrects the real state by foot placement)
        if (r.walk) next.pl = this._walkPlan(o, next, r.walk.openLoop ? (r.wds && !r.first ? this._walkDSxi(o, r).xi : r.wFirst) : o.xi.slice());
        r.first = false; const st = next.sw === "L" ? "R" : "L", yaw = r.walk ? next.pl.yaw : (r.homeYaw ? r.homeYaw[next.sw] : yawOf(o.states[g.foot[next.sw]].rot)) + (r.turn ? this.turnAt(o.t + Tss) : 0);
        // ((G2b) a walking swing's duration is stretched by the measured touchdown fraction — the human swing contacts before u = 1 (its landing
        // presses through the turf) — so that contact happens when the capture-point plan expects it)
        this.exec.start(o, { sw: next.sw, st, target: next.pl.target, yaw, tSw: r.walk ? next.pl.walkK.Tss / (r.walk.uTdStretch === false ? 1 : (r.uTd || 0.88)) : Tss }, "rhythmic", { pSt: next.pl.pSt, xiIni: next.pl.xiIni, xiTdNom: next.pl.xiTd, stepIndex: r.i, human: !!r.human, wA: r.wA ?? 0.2, walkK: r.walk ? next.pl.walkK : null });
        r.stage = "SS"; return this.exec.update(o, { obstructedAt: {} }); }
      return plan; }
    return null; }
  // ── (G2b) WALKING (rhythm.walk = { speed, w?, L?, ratio?, dsFrac? }) ──────────────────────────────────────────────────────────────────
  // Timing from the speed by the human walk ratio (step length / cadence ≈ 0.0063 m per step/min ⇒ cadence = √(60 v / ratio)), double support
  // dsFrac (0.20) of each step; the step length L = v·T. The capture-point plan is the PERIODIC LIPM solution with a FINITE double support
  // (CoP linear from the trailing to the leading foot over Tds): with E1 = e^{ωTss}, E2 = e^{ωTds}, κ = (E2 − 1)/(ωTds), the offset of ξ
  // from the stance point at the start of single support is c = Δ·κ/(E1E2 − 1) along the walk and Δ·κ/(E1E2 + 1) across it (the mirrored
  // lateral gait). Footholds follow the DCM placement law from the plan's own ξ at the end of single support: Δ = (E2(ξ_eos − p_st) − c_next)/κ.
  _walkInit(o, r) { const W = r.walk, v = W.speed || 0.8, ratio = W.ratio || 0.0063, cad = W.cadence || Math.sqrt(60 * v / ratio), T = 60 / cad, ds = W.dsFrac ?? 0.2, w = o.omega0;
    r.Tds = W.Tds || T * ds; r.Tss = W.Tss || T - r.Tds; const E1 = dexp(w * r.Tss), E2 = dexp(w * r.Tds), k = (E2 - 1) / (w * r.Tds), k1 = (E1 - 1) / (w * r.Tss);
    const f = (s) => Q.rot(o.states[this.geo.foot[s]].rot, [0, 0, 1]), h0 = Math.atan2(f("L")[0] + f("R")[0], f("L")[2] + f("R")[2]);
    // (latDS "freeze": across the walk the double support HOLDS ξ (CoP on ξ), so the lateral step map has no double-support term: E2 = κ = 1)
    const fr = W.latDS === "freeze"; r.wk = { v, cad, T, L: W.L || v * T, w: W.w ?? 0.22, E1, E2, k, k1, lE2: fr ? 1 : E2, lK: fr ? 1 : k, r: W.roll ?? 0.08, omega: w, h0, toeOut: { L: r.homeYaw.L - h0, R: r.homeYaw.R - h0 }, Lmax: W.Lmax ?? 0.68,
      // (the narrowest step this body can take: its collider boots are 16.4 cm wide, so below ≈ 20 cm centre-to-centre the swinging boot's
      // path meets the stance boot — a body-geometry limit, a human foot is ≈ 10 cm wide)
      wMin: W.wMin ?? 0.20, wMax: W.wMax ?? 0.34, w0: Math.hypot(r.home.L[0] - r.home.R[0], r.home.L[1] - r.home.R[1]) };   // (Lmax ≈ 0.73 leg: the reachable step)
    this.ev(o.t, "walk", `${v} m/s · cadence ${cad.toFixed(0)} steps/min · step ${(r.wk.L * 100).toFixed(0)} cm · single support ${r.Tss.toFixed(3)} s · double support ${r.Tds.toFixed(3)} s · width ${(r.wk.w * 100).toFixed(0)} cm`); }
  _stepL(st) { const K = this.rhythm.wk; return st.fwd ?? (st.fwdK != null ? st.fwdK * K.L : K.L); }
  // (the step width narrows from the standing stance (V1.1: ≈ 32 cm) to the walking width over the first three steps — a swing that moved the
  // foot 11 cm inward pulled the COM back toward the stance side and fought the lateral transfer)
  _stepW(i) { const K = this.rhythm.wk; return K.w + (K.w0 - K.w) * Math.max(0, 1 - i / 3); }
  _hdg() { const r = this.rhythm; return this.ctrl.headingIntent != null ? this.ctrl.headingIntent : r.wk.h0; }
  _wkP(o, s) { return this.geo._center(o, s); }                     // a foot's stance point: its sole centre (the CoP mid-way along the stance roll)
  // (with the stance CoP ROLLING r behind → r ahead of the foot centre over single support and on from the trailing forefoot to the leading heel
  // over double support: c_f = [E2(r(E1 − 1) + 2r(1 − κ1)) − r(E2 − 1) + (L − 2r)(1 − κ2) − L] / (1 − E1E2); laterally unchanged)
  _wkC(r, Lf, Ll) { const K = r.wk, ps = this._hdg(), hd = [Math.sin(ps), Math.cos(ps)], rt = [hd[1], -hd[0]], R0 = K.r, cl = Ll * K.lK / (K.E1 * K.lE2 + 1);
    const cf = (K.E2 * (R0 * (K.E1 - 1) + 2 * R0 * (1 - K.k1)) - R0 * (K.E2 - 1) + (Lf - 2 * R0) * (1 - K.k) - Lf) / (1 - K.E1 * K.E2);
    return [hd[0] * cf + rt[0] * cl, hd[1] * cf + rt[1] * cl]; }
  // ξ at the start of the FIRST single support: the stance foot's point + the nominal offset of the first step (from standing)
  _walkFirstXi(o, step) { const r = this.rhythm, st = step.sw === "L" ? "R" : "L", side = step.sw === "R" ? 1 : -1, p = this._wkP(o, st), c = this._wkC(r, this._stepL(step), side * this._stepW(r.i)); return [p[0] + c[0], p[1] + c[1]]; }
  // the DCM foothold (along, across the walk, relative to the stance centre) for a capture point ξ_eos at the end of single support, so that the
  // double support (CoP: trailing forefoot → leading heel) leaves ξ at c_next from the new stance centre
  _dcmD(K, hd, rt, eos, pSt, cN) { const e = [eos[0] - pSt[0], eos[1] - pSt[1]], ef = e[0] * hd[0] + e[1] * hd[1], el = e[0] * rt[0] + e[1] * rt[1], cf = cN[0] * hd[0] + cN[1] * hd[1], cl = cN[0] * rt[0] + cN[1] * rt[1], R0 = K.r;
    return [(K.E2 * ef - R0 * (K.E2 - 1) - 2 * R0 * (1 - K.k) - cf) / K.k, (K.lE2 * el - cl) / K.lK]; }
  _walkPlan(o, step, xi0) { const r = this.rhythm, K = r.wk, st = step.sw === "L" ? "R" : "L", side = step.sw === "R" ? 1 : -1, ps = this._hdg(), hd = [Math.sin(ps), Math.cos(ps)], rt = [hd[1], -hd[0]];
    const pSt = this._wkP(o, st), nxt = r.steps[r.i + 1], cN = nxt ? this._wkC(r, this._stepL(nxt), -side * this._stepW(r.i + 1)) : [0, 0], Wn = this._stepW(r.i), R0 = K.r;
    // (STEP TIMING, rhythm.walk.adaptT: the single support lasts as long as the MEASURED sideways capture-point offset c0 needs to reach the
    // nominal step width — e^{ωT} = (W·κ − c_next) / (E2·c0), bounded. The foot cannot be placed narrower than the boots allow (wMin), so a
    // capture point that starts too close to the stance foot was uncorrectable by placement; a longer stance lets it travel. A larger offset
    // shortens the stance and the placement widens — the two corrections cover the two directions, as human step timing does.)
    let Tk = r.Tss; if (r.walk.adaptT) { const c0 = ((xi0[0] - pSt[0]) * rt[0] + (xi0[1] - pSt[1]) * rt[1]) * side, cl = Math.abs(cN[0] * rt[0] + cN[1] * rt[1]), num = Wn * K.lK - cl;
      const A = r.walk.adaptT === true ? [0.8, 1.35] : r.walk.adaptT; Tk = c0 > 1e-3 && num > 0 ? Math.log(num / (K.lE2 * c0)) / K.omega : r.Tss * A[1]; Tk = Math.max(r.Tss * A[0], Math.min(r.Tss * A[1], Tk)); }
    const eos = segXi(xi0, [pSt[0] - hd[0] * R0, pSt[1] - hd[1] * R0], [pSt[0] + hd[0] * R0, pSt[1] + hd[1] * R0], Tk, Tk, K.omega).xi;
    // (PARTIAL placement: the foothold moves placeGain of the way from the nominal step to the deadbeat DCM foothold — the deadbeat law
    // multiplies a capture-point error by E1·E2/κ ≈ 6.5 over one step, and a ~20 % mismatch between the LIPM and the body made the step-to-step
    // lateral error map oscillate with a gain ≈ −1; the ankle and the following steps share the rest of the correction, as in human walking)
    const D = this._dcmD(K, hd, rt, eos, pSt, cN); const g = r.walk.placeGain ?? 0.6, gf = r.walk.placeGainFwd ?? 1, Ln = this._stepL(step);
    // (along the walk the deadbeat step: a body slower than nominal takes a SHORTER step — pulled toward the nominal length, the foot landed
    // ahead of the capture point and the body stalled behind it; across the walk the partial gain)
    let df = Ln + gf * (D[0] - Ln), dl = side * Wn + g * (D[1] - side * Wn);
    const df0 = df, dl0 = dl; df = Math.max(-0.15, Math.min(K.Lmax || 0.9, df)); dl = side > 0 ? Math.max(K.wMin, Math.min(K.wMax, dl)) : Math.min(-K.wMin, Math.max(-K.wMax, dl));   // (bounded: human step widths, never cross over)
    let target = [pSt[0] + hd[0] * df + rt[0] * dl, pSt[1] + hd[1] * df + rt[1] * dl];
    // (the step must be reachable: the planner's feasibility check, the target pulled back along the step until it is)
    const sw0 = this.geo._center(o, step.sw), dC = dComAt(o, pSt, Tk), ok = (q) => this.tool._feasible(o, step.sw, q, ps + (K.toeOut[step.sw] || 0), sw0, dC, null).ok;
    if (!ok(target)) { const a = [pSt[0] + rt[0] * dl, pSt[1] + rt[1] * dl]; let lo = 0, hi = 1; for (let i = 0; i < 14; i++) { const m = (lo + hi) / 2; if (ok([a[0] + (target[0] - a[0]) * m, a[1] + (target[1] - a[1]) * m])) lo = m; else hi = m; } target = [a[0] + (target[0] - a[0]) * lo, a[1] + (target[1] - a[1]) * lo]; }
    return { target, pSt, pSw: target, xiIni: xi0.slice(), xiTd: eos, yaw: ps + (K.toeOut[step.sw] || 0), dcm: { df: df0, dl: dl0, clamped: df !== df0 || dl !== dl0 },
      walkK: { cNext: cN, side, hd, E2: K.E2, k: K.k, r: K.r, Tss: Tk, kXi: r.walk.kXiSS, latCop: r.walk.latCop, dcm: (eos2, pS2) => this._dcmD(K, hd, rt, eos2, pS2, cN), Lmax: K.Lmax || 0.9, g: r.walk.placeGain ?? 0.6, gf: r.walk.placeGainFwd ?? 1, Ln, w: Wn, wMin: K.wMin, wMax: K.wMax } }; }
  // the walking double support's reference at the current time (and the CoP reference)
  _walkDSxi(o, r) { const D = r.wds, w = r.wk.omega, s = Math.max(0, o.t - D.t0), T = D.T, d = [D.p1[0] - D.p0[0], D.p1[1] - D.p0[1]];
    const at = (x) => { const E = dexp(w * x); return [E * D.xi0[0] - D.p0[0] * (E - 1) + d[0] * x / T - d[0] * (E - 1) / (w * T), E * D.xi0[1] - D.p0[1] * (E - 1) + d[1] * x / T - d[1] * (E - 1) / (w * T)]; };
    // (beyond T — the double support extended until the trailing foot has unloaded — the reference continues with the CoP on the leading foot
    // if ξ is ahead of it; behind it, it HOLDS instead of running backward away from the new foot)
    let xi, p; if (s <= T) { xi = at(s); p = [D.p0[0] + d[0] * s / T, D.p0[1] + d[1] * s / T]; } else { const xe = at(T), ps = this._hdg(), ahead = (xe[0] - D.p1[0]) * Math.sin(ps) + (xe[1] - D.p1[1]) * Math.cos(ps);
      if (ahead > 0) { const E = dexp(w * (s - T)); xi = [D.p1[0] + (xe[0] - D.p1[0]) * E, D.p1[1] + (xe[1] - D.p1[1]) * E]; p = D.p1; } else { xi = xe; p = xe; } }
    // ACROSS the walk the double support is a planned TRANSFER (as in place, G2a): min-jerk from the touchdown capture point to the next stance's
    // inward offset — the ankle can move the CoP only a few cm sideways, so the analytic free dynamics carried every lateral touchdown error
    // into the next single support (G2b finding: 26 cm after two steps); along the walk the analytic LIPM keeps the body moving
    const ps = this._hdg(), hd = [Math.sin(ps), Math.cos(ps)], rt = [hd[1], -hd[0]], K = r.wk, nx = r.steps[r.i], sideN = nx ? (nx.sw === "R" ? 1 : -1) : 0;
    const lat0 = (D.xi0[0] - D.p1[0]) * rt[0] + (D.xi0[1] - D.p1[1]) * rt[1], latT = sideN * this._stepW(r.i) * K.lK / (K.E1 * K.lE2 + 1), x = Math.min(1, s / T), sm = minjerk(x), dsm = x < 1 ? 30 * x * x * (1 - x) * (1 - x) / T : 0;
    if (r.walk.latDS === "lipm") { const dot = [w * (xi[0] - p[0]), w * (xi[1] - p[1])]; return { xi, p, dot, u: Math.min(1, s / T) }; }   // (variant: the analytic lateral, for comparison)
    // (latDS "track" — ACROSS the walk the CoP is re-solved every tick from the MEASURED capture point: the CoP now, ramping linearly onto the
    // leading foot over the remaining double support τ, that brings ξ exactly to the next single support's offset latT — the LIPM boundary
    // solution p0 = (E·ξ + p_b(1 − κ) − ξ_T)/(E − κ), E = e^{ωτ}, κ = (E − 1)/(ωτ); bounded to the two feet's lateral extent (± the ankle's
    // few cm). The reference is the measured ξ itself with the rate that CoP gives, so the balance law places the CoP there. It uses the
    // body's actual sideways momentum at touchdown, which a zero-velocity transfer ignored.)
    if (r.walk.latDS === "freeze") { const lN = (o.xi[0] - D.p1[0]) * rt[0] + (o.xi[1] - D.p1[1]) * rt[1], fw = (xi[0] - D.p1[0]) * hd[0] + (xi[1] - D.p1[1]) * hd[1], xiT = [D.p1[0] + hd[0] * fw + rt[0] * lN, D.p1[1] + hd[1] * fw + rt[1] * lN];
      const dotA = [w * (xi[0] - p[0]), w * (xi[1] - p[1])], fwdDot = dotA[0] * hd[0] + dotA[1] * hd[1]; r.wdsLat = { lN, latT, p0: lN };
      return { xi: xiT, p, dot: [hd[0] * fwdDot, hd[1] * fwdDot], u: Math.min(1, s / T) }; }   // (sideways: reference = measured ξ, rate 0 → the CoP sits on ξ)
    if (r.walk.latDS === "track") { const lN = (o.xi[0] - D.p1[0]) * rt[0] + (o.xi[1] - D.p1[1]) * rt[1], lt = (D.p0[0] - D.p1[0]) * rt[0] + (D.p0[1] - D.p1[1]) * rt[1], tau = Math.max(0.04, T - s), E = dexp(w * tau), kp = (E - 1) / (w * tau);
      let p0 = (E * lN - latT) / (E - kp); const ex = r.walk.latCopX ?? 0.04; p0 = Math.max(Math.min(lt, 0) - ex, Math.min(Math.max(lt, 0) + ex, p0));
      const fw = (xi[0] - D.p1[0]) * hd[0] + (xi[1] - D.p1[1]) * hd[1], xiT = [D.p1[0] + hd[0] * fw + rt[0] * lN, D.p1[1] + hd[1] * fw + rt[1] * lN], dotA = [w * (xi[0] - p[0]), w * (xi[1] - p[1])], fwdDot = dotA[0] * hd[0] + dotA[1] * hd[1], latDot = w * (lN - p0);
      r.wdsLat = { lN, latT, p0 }; return { xi: xiT, p, dot: [hd[0] * fwdDot + rt[0] * latDot, hd[1] * fwdDot + rt[1] * latDot], u: Math.min(1, s / T) }; }
    const latNow = (xi[0] - D.p1[0]) * rt[0] + (xi[1] - D.p1[1]) * rt[1], latRef = lat0 + (latT - lat0) * sm, dLat = latRef - latNow;
    xi = [xi[0] + rt[0] * dLat, xi[1] + rt[1] * dLat]; const dotA = [w * (xi[0] - p[0]), w * (xi[1] - p[1])], fwdDot = dotA[0] * hd[0] + dotA[1] * hd[1], latDot = (latT - lat0) * dsm;
    return { xi, p, dot: [hd[0] * fwdDot + rt[0] * latDot, hd[1] * fwdDot + rt[1] * latDot], u: Math.min(1, s / T) }; }
  // (PRE-SWING, the trailing foot over the double support: it unloads from its measured share to zero and its heel rises toward preSwingHeelH
  // about the toe — the knee flexes as the ankle rises, so the swing begins from a bent knee and a lifted heel, as in human pre-swing)
  _walkDS(o, r, plan) { const q = this._walkDSxi(o, r), next = r.steps[r.i], W = this.spec.totalMass * 9.81; plan.xiRef = q.xi; plan.xiDot = q.dot; plan.comGoal = q.xi.slice();
    if (next) { if (next.share0 == null) next.share0 = Math.max(0, Math.min(1, o.feet[next.sw].load / W)); plan.unloading = { foot: next.sw, maxShare: next.share0 * (1 - minjerk(q.u)), relax: r.walk.relax === false ? null : 1 - minjerk(q.u), release: r.walk.release ?? null, axisSel: !!r.walk.releaseAxisSel, bandCap: r.walk.copBand ?? null };
      // (the heel rises because the body has PASSED over the foot: in proportion to how far the trailing leg is beyond 93 % of full extension
      // from its hip — the rise keeps the trailing knee bent instead of letting the leg lock straight behind the body)
      const hH = r.walk.preSwingHeelH ?? 0.10, Lg = this.ctrl.legs[next.sw], hip = o.states[Lg.thigh].pos, an = o.states[this.geo.foot[next.sw]].pos, ext = Math.hypot(hip[0] - an[0], hip[1] - an[1], hip[2] - an[2]) / (Lg.L1 + Lg.L2);
      const need = Math.max(0, Math.min(1, (ext - 0.93) / 0.06)); r.preRise = Math.max(r.preRise || 0, need);   // (monotone within one double support)
      if (hH > 0 && r.preRise > 0) plan.heelRise = { foot: next.sw, rad: Math.asin(hH / (2 * this.geo.box.he[2])) * r.preRise }; }
    return q.u; }
  // (G2a) an INTENDED TURN (rhythm.turn = { at, deg, dur }): the heading offset at time t (rad, min-jerk) — the in-place footholds and their
  // yaw rotate with it about the home midpoint, and the locomotion layer's intended heading follows it (nothing else is rotated)
  turnAt(t) { const q = this.rhythm && this.rhythm.turn; return q ? q.deg * Math.PI / 180 * minjerk((t - q.at) / q.dur) : 0; }
  _home(sw, th) { const r = this.rhythm, h = r.home[sw]; if (!th) return h; const m = [(r.home.L[0] + r.home.R[0]) / 2, (r.home.L[1] + r.home.R[1]) / 2], d = [h[0] - m[0], h[1] - m[1]], c = Math.cos(th), s = Math.sin(th);
    return [m[0] + d[0] * c + d[1] * s, m[1] - d[0] * s + d[1] * c]; }
  // the periodic LIPM capture-point plan for one step: stance nominal CoP p_st, landing weight point p_sw, midpoint m
  _xiPlan(o, step, Tss) { const g = this.geo, st = step.sw === "L" ? "R" : "L", hd = g._heading(o, st), side = step.sw === "R" ? 1 : -1, lat = [hd[1] * side, -hd[0] * side], th = this.rhythm && this.rhythm.turn ? this.turnAt(o.t + Tss) : 0;
    const cur = this.rhythm && this.rhythm.home ? this._home(step.sw, th) : g._center(o, step.sw), target = [cur[0] + hd[0] * (step.fwd || 0) + lat[0] * (step.out || 0), cur[1] + hd[1] * (step.fwd || 0) + lat[1] * (step.out || 0)];
    const pSt = g._weightPoint(o, st), yaw = (this.rhythm && this.rhythm.homeYaw ? this.rhythm.homeYaw[step.sw] : yawOf(o.states[g.foot[step.sw]].rot)) + th, a = g._ankleFromCenter(target, yaw), pSw = [a[0] + hd[0] * this.ctrl.comFwd, a[1] + hd[1] * this.ctrl.comFwd];
    const m = [(pSt[0] + pSw[0]) / 2, (pSt[1] + pSw[1]) / 2], k = Math.tanh(o.omega0 * Tss / 2), xiIni = [m[0] + (pSt[0] - m[0]) * k, m[1] + (pSt[1] - m[1]) * k], xiTd = [m[0] - (pSt[0] - m[0]) * k, m[1] - (pSt[1] - m[1]) * k];
    return { target, pSt, pSw, xiIni, xiTd }; }
  // ── transfer-only: C2's planned weight transfer until its liftoff gate OPENS (measured), held, then back to the middle ──
  _transfer(o) { const R = this.transfer[0], t = o.t, g = this.geo, F = o.feet, W = this.spec.totalMass * 9.81, ctrl = this.ctrl; if (!R) return null;
    if (!R.stage) R.stage = "WAIT"; if (R.stage === "WAIT") { if (t < (R.at ?? 0.5)) return null; R.stage = "TRANSFER"; R.tS = t; R.from = this.rest ? this.rest.xiRef : this.mid(o); R.ready = 0; R.anchors = this.rest ? this.rest.anchors : this.anchorsNow(o); this.ev(t, "transfer", `unload ${R.foot}`); }
    // (anchors captured ONCE when the transfer begins: the unloaded foot is held to where it stood, not to wherever it has drifted)
    const sw = R.foot, st = sw === "L" ? "R" : "L", plan = { stepping: false, swing: {}, anchors: R.anchors };
    if (R.stage === "TRANSFER") { const uT = g._transfer(plan, o, `tr:${R.foot}:${R.tS}`, R.from, g._weightPoint(o, st), R.tS, SUP.shiftT); plan.lean = { side: st, rad: g.leanRad * minjerk(uT) }; plan.unload = sw;
      if (R.share0 == null) R.share0 = Math.max(0, Math.min(1, F[sw].load / W)); if (ctrl.opts.unloadPlan) plan.unloading = { foot: sw, maxShare: R.share0 * (1 - minjerk(uT)) };
      const stSole = g._sole(o, st), mS = polyDist(stSole, o.xi), vc = Math.hypot(o.vcom[0], o.vcom[2]), tq = ctrl.opts.unloadPlan ? g._ankleUse(o, st, o.xi) : null;
      const ok = F[sw].load < SUP.liftLoadFrac * W && mS >= SUP.liftMargin && vc <= SUP.liftVmax && F[st].loaded && !F[st].slipping && !F[sw].slipping && (!tq || tq.use <= SUP.liftTorqueUse);
      R.ready = ok ? R.ready + 1 : 0; R.minLoad = Math.min(R.minLoad ?? 1e9, F[sw].load);
      if (R.ready >= SUP.readySteps) { R.gate = { t, transferS: t - R.tS, swingLoadN: F[sw].load, swingLoadFrac: F[sw].load / W, stanceMargin: mS, vcom: vc, ankleUse: tq && tq.use }; R.stage = "HOLD"; R.tH = t; R.to = plan.xiRef.slice(); this.ev(t, "gate open", `${sw} unloaded to ${(F[sw].load / W * 100).toFixed(1)} % BW after ${(t - R.tS).toFixed(2)} s — no lift (transfer-only)`); }
      else if (t - R.tS > SUP.shiftT + SUP.readyTimeout) { R.stage = "BACK"; R.tB = t; R.to = plan.xiRef.slice(); R.fail = "gate never opened"; this.ev(t, "transfer", "REJECTED: gate never opened"); }
      return plan; }
    if (R.stage === "HOLD") { plan.xiRef = R.to; plan.lean = { side: st, rad: g.leanRad }; if (ctrl.opts.unloadPlan) plan.unloading = { foot: sw, maxShare: 0 }; if (t - R.tH >= (R.hold ?? 0.3)) { R.stage = "BACK"; R.tB = t; } return plan; }
    if (R.stage === "BACK") { const to = this.mid(o), u = g._transfer(plan, o, `trb:${R.foot}:${R.tB}`, R.to, to, R.tB, SUP.shiftT); plan.lean = { side: st, rad: g.leanRad * (1 - minjerk(u)) };
      if (u >= 1) { R.stage = "DONE"; this.rest = { xiRef: to, anchors: R.anchors }; this.transfer.shift(); if (this.transfer[0]) this.transfer[0].at = Math.max(this.transfer[0].at ?? 0, t + 0.3); } return plan; }
    return null; }
}
