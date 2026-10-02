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
import { decideA, decideB, adjustA, adaptBias, predictA, modelAt, modelAtBlend, solveStep, solvePreview } from "./pc_walker.js";
import { swPhase } from "./pc_loco.js";
import { UnifiedWalker, reachRange, latWidth, peakAcc, solveReg } from "./pc_unified.js";
import { StepPlanner, ContactEvent, classifySupport } from "./pc_stepper.js";
import { stepFeatures } from "./pc_stepfeat.js";

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
    if (this.vBarTau) { const hd = this.vBarHd || [0, 1], v = o.vcom[0] * hd[0] + o.vcom[2] * hd[1], a = Math.min(1, (this.vBarT != null ? o.t - this.vBarT : 0) / this.vBarTau); this.vBar = this.vBar == null ? v : this.vBar + a * (v - this.vBar); this.vBarT = o.t; }
    const R = this.R; if (!R) return null; this._o = o; const t = o.t, g = this.geo, F = o.feet, sw = R.sw, st = R.st, T = this.tool;
    const plan = { stepping: true, swing: {}, step: R, swingKpDrop: 0 };
    if (["SWING", "DESCEND", "OBSTRUCTED"].includes(R.stage)) {
      // OBSTRUCTED (the gait layer saw a non-turf contact on this leg; this executor reacts once its own delayed view has reached that time)
      if (R.stage !== "OBSTRUCTED" && truth.obstructedAt[sw] != null && t >= truth.obstructedAt[sw] && R.liftoff) {
        const fp = o.states[g.foot[sw]]; R.stage = "OBSTRUCTED"; R.obst = { t, tTruth: truth.obstructedAt[sw], pos: fp.pos.slice(), rot: fp.rot.slice(), yTop: fp.pos[1] };
        this.ev(t, "OBSTRUCTED", `${sw}: stop progressing, set the foot down where it is (reaction ${((t - truth.obstructedAt[sw] + (this.dFb || 0)) * 1000).toFixed(0)} ms after the contact, of which ${((this.dFb || 0) * 1000).toFixed(0)} ms is the feedback view's age)`); R.obst.reactS = t - truth.obstructedAt[sw] + (this.dFb || 0); }
      // re-plan the foothold from the current state: corrective — during the rise (C3); rhythmic — follow the capture-point error in early swing
      if (R.stage === "SWING" && R.kind === "corrective" && t - R.tSw < STEP.replanUntil * R.T) { const c = T._candidate(o, sw, R.cur0, t - R.tSw, R.alpha); if (c && c.feasible) { R.cand = c; T._aim(R, o, c); R.plannedTd.center = c.target.slice(); } }
      if (R.stage === "SWING" && R.kind === "rhythmic" && (R.u || 0) < (R.walkK && R.walkK.adjustUntil != null ? R.walkK.adjustUntil : PLAN.adjustUntil) && t - R.lastAim >= 1 / 60 - 1e-9) { R.lastAim = t; this._adjust(o, R); }
      let tg; if (R.stage === "OBSTRUCTED") { const y = Math.max(g.yFlat + SUP.touchDepth, R.obst.yTop - PLAN.obstruct.descendV * (t - R.obst.t)), yaw = yawOf(R.obst.rot);
        tg = { pos: [R.obst.pos[0], y, R.obst.pos[2]], rot: Q.axis([0, 1, 0], yaw), vel: [0, -PLAN.obstruct.descendV, 0], u: R.u, reach: [R.obst.pos[0], g.yFlat + SUP.touchDepth, R.obst.pos[2]] }; }
      // ((G2b speed work, walk.swingLead "late") the delay compensation of the swing's time ramps in over the swing (0 before 30 % of it, the full
      //  feedback delay from 70 %): the LANDING is compensated (the overshoot), the START is not moved ahead of the foot's actual unloading)
      else if (R.timed) { const lw = R.walkK && R.walkK.swingLead === "late" && this.lead ? this.lead * minjerk(((t - R.tSw0) / R.T - 0.3) / 0.4) : (this.lead || 0); R.leadNow = lw; tg = this._timedAt(R, t + lw, this.oTruth ? { ...this.oTruth, t: o.t } : o); if (R.stage === "DESCEND") { const y = (R.human ? tg.pos[1] : R.tpT[1]) - Math.min(0.04, PLAN.obstruct.descendV * (t - R.tD)); tg = { ...tg, pos: [tg.pos[0], y, tg.pos[2]], vel: [0, -PLAN.obstruct.descendV, 0] }; } }
      else { tg = R.xo ? T._swingCross(R, t) : R.heelUp ? T._swingHeelUp(R, t) : g._swingAt(R, t);
        if (R.fastDescend && R.stage === "DESCEND") { const y = R.pT[1] - Math.min(0.04, PLAN.obstruct.descendV * (t - R.tD)); tg = { ...tg, pos: [tg.pos[0], y, tg.pos[2]], vel: [0, -PLAN.obstruct.descendV, 0] }; } }
      // ((G2b WALKER, ctrl.ankle = { k, max, min }) Controller A's ANKLE term in single support: the CoP demand is shifted forward (braking) or back by
      // k × (the measured map's latest predicted next forward state − the controller's target), bounded [min, max] m — the speed regulation a human
      // stance ankle does; the foothold still corrects the rest)
      // ((G2b speed work, ctrl.ankle2 = { k, max, min }) the STANCE ANKLE as a speed actuator, computed EVERY TICK from the current view (the
      // same in identification and in walking): the measured map of this instant predicts the next step's start state from the capture point
      // now and the current foothold / timing; the CoP demand under the stance foot moves k × (predicted − the step's target) along the walk
      // (forward = braking), bounded [min, max] m — ground reaction regulating speed within the step; the sole / torque clamps still apply)
      if (R.walkK && R.walkK.ctrlC && R.walkK.ctrlC.ankle2 && R.liftoff) { const K = R.walkK, C = K.ctrlC, ak = C.ankle2, hd = K.hd, rt = [hd[1], -hd[0]], pS = R.pSt, e = [o.xi[0] - pS[0], o.xi[1] - pS[1]], tau = o.t - R.tSw0;
        const x = [e[0] * hd[0] + e[1] * hd[1], (e[0] * rt[0] + e[1] * rt[1]) * K.side], tg = R.proj.target, ut = [(tg[0] - pS[0]) * hd[0] + (tg[1] - pS[1]) * hd[1], ((tg[0] - pS[0]) * rt[0] + (tg[1] - pS[1]) * rt[1]) * K.side, K.Tss];
        const pr = predictA(modelAt(C, tau), x, ut), b = K.ctrlB || [0, 0], d = Math.max(ak.min ?? -0.04, Math.min(ak.max ?? 0.06, ak.k * (pr[0] + b[0] - K.ctrlYt[0])));
        plan.copShift = [hd[0] * d, hd[1] * d]; R.ank2 = R.ank2 || []; R.ank2.push(d); }
      // ((G2b speed work, walk.vReg = { vd, k, max, min, tau }) SPEED REGULATION THROUGH GROUND REACTION: in single support the stance CoP demand
      //  moves forward (braking) or back (propelling) by k × (v̄ − vd), v̄ the forward COM velocity of the view low-passed over tau (≈ one
      //  step, so the regulator acts on the walking speed, not on the within-step pendulum oscillation), bounded [min, max] m. Model-free and
      //  causal: the CoP–COM geometry is what sets the horizontal force (measured: the turf impulse is the pendulum part within ±5 N·s).)
      // (from standing, a constant vd made the regulator propel the first steps by its full bound and launched the body past its braking capacity)
      // ((revised) gait initiation is the measured first step's job: the regulator engages from step VR.from (default 2) once the gait exists —
      //  a wall-clock ramp ended before the first liftoff (the first transfer from standing lasts ≈ 1.1 s))
      if (R.walkK && R.walkK.vReg && R.liftoff && (R.stepIndex ?? 0) >= (R.walkK.vReg.from ?? 2)) { const VR = R.walkK.vReg, hd = R.walkK.hd, vdNow = VR.vd, d = Math.max(VR.min ?? -0.04, Math.min(VR.max ?? 0.05, VR.k * ((this.vBar ?? vdNow) - vdNow)));
        plan.copShift = [hd[0] * d, hd[1] * d]; (R.vreg = R.vreg || []).push(d); (R.vregD = R.vregD || []).push([o.t, this.vBar, vdNow, this.vBarT0]); }
      if (R.walkK && R.walkK.ctrlA && R.walkK.ctrlA.C.ankle) { const A = R.walkK.ctrlA, ak = A.C.ankle, lg = A.log, pr = lg.adj.length ? lg.adj[lg.adj.length - 1].pred : lg.info.pred;
        if (pr) { const d = Math.max(ak.min ?? -0.03, Math.min(ak.max ?? 0.06, ak.k * (pr[0] - A.yt[0]))); plan.copShift = [R.walkK.hd[0] * d, R.walkK.hd[1] * d]; lg.ank = d; } }
      // ((G2b unified, opt-in walk.ssHeelRise = { e0, eMax, H }) TERMINAL-STANCE HEEL RISE: the stance foot's heel rises about its toe in late single
      //  support in proportion to how far the stance leg is beyond e0 of its full extension (hip → ankle) — the same rule as the trailing foot's
      //  pre-swing rise, applied where it begins in human gait: once the body has passed over the foot. Measured: with the foot held flat the stance
      //  leg reached 99–100 % extension by touchdown, so the trailing leg could not stay down (double support 0.07–0.10 s, no authority) and late
      //  single support pivoted the boot on its tip passively)
      if (R.kind === "rhythmic" && R.walkK && R.walkK.ssHeelRise && R.liftoff) { const HR = R.walkK.ssHeelRise, Lg = this.tool.ctrl.legs[st], hip = o.states[Lg.thigh].pos, an = o.states[g.foot[st]].pos, ext = Math.hypot(hip[0] - an[0], hip[1] - an[1], hip[2] - an[2]) / (Lg.L1 + Lg.L2);
        const need = Math.max(0, Math.min(1, (ext - (HR.e0 ?? 0.95)) / ((HR.eMax ?? 0.99) - (HR.e0 ?? 0.95)))); R.ssRise = Math.max(R.ssRise || 0, need); R.ssExt = ext;
        if (R.ssRise > 0) plan.heelRise = { foot: st, rad: Math.asin(Math.min(0.95, (HR.H ?? 0.08) / (2 * g.box.he[2]))) * R.ssRise }; }
      // ((G2b overnight, walk.rocker = { kdF, until }) the HEEL ROCKER continues into single support while the landed (now stance) foot is not yet flat:
      //  the same compliant, level-aimed ankle as in the double support (plan.settle), until its sole is down or `until` s into the step)
      if (R.kind === "rhythmic" && R.walkK && R.walkK.rocker && t - R.tSw0 < (R.walkK.rocker.until ?? 0.25) && !(F[st].heel && F[st].toe)) plan.settle = { foot: st, level: true, ...(R.walkK.rocker.kdF != null ? { kdF: R.walkK.rocker.kdF } : {}) };
      plan.copFoot = st; plan.xiRef = R.kind === "rhythmic" ? this._xiD(R, t, o) : o.xi.slice(); if (R.kind === "rhythmic") plan.xiDot = R.xiDotNow; if (R.walkK) { plan.kXi = R.dcm0 ? { hd: R.walkK.hd, along: R.walkK.ctrlU ? R.walkK.ctrlU.U.C.k : R.walkK.dcmRef.k, across: R.walkK.ctrlU && R.walkK.ctrlU.U.C.latFunnel ? (R.walkK.ctrlU.U.C.latFunnel.k ?? 0) : (R.walkK.kXiAcross ?? BAL.kXi) } : (R.walkK.kXi ?? { hd: R.walkK.hd, along: R.walkK.kXiAlong ?? 0, across: R.walkK.kXiAcross ?? BAL.kXi }); if (R.walkK.latCop) plan.latCop = { foot: st, cap: R.walkK.latCop }; if (R.walkK.swingKpDrop != null) plan.swingKpDrop = R.walkK.swingKpDrop; if (R.walkK.swingPredict) plan.swingPredict = this.dFb || 0; if (R.walkK.swingBase) { plan.swingBase = R.walkK.swingBase;
          // ((G2b unified, swingBase.w "model") the forward model's inputs: the swing's command phase now (view time + dFb — the controller's own clock)
          //  and at the view; swingBase.learn: the pelvis-rate profile is learned ONLINE from the delayed measurements (EMA per phase bin))
          if (plan.swingBase.w === "model") { const SBc = plan.swingBase, nb = 10, side = R.sw === "R" ? 1 : -1, uV = swPhase(R, o.t), uN = swPhase(R, o.t + (this.dFb || 0));
            if (SBc.learn) { this.wProf = this.wProf || (SBc.P ? SBc.P.map(r => r.slice()) : Array.from({ length: nb }, () => [0, 0, 0])); if (R.liftoff && R.stage === "SWING") { const wl = Q.rot(Q.conj(o.states[0].rot), o.states[0].w), b = Math.min(nb - 1, Math.floor(uV * nb)), g = SBc.learn.rate ?? 0.02;
                const smp = [wl[0], wl[1] * side, wl[2] * side]; for (let j = 0; j < 3; j++) this.wProf[b][j] += g * (smp[j] - this.wProf[b][j]); } }
            plan.swingBase = { ...SBc, P: SBc.learn ? this.wProf : SBc.P, uNow: uN, uView: uV, side }; } }
        } plan.swing[sw] = tg; R.u = tg.u; R.lastTgt = tg;
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
  // ((G2b unified) the in-swing re-decision: the same decision from the latest measured state, every planning cycle, until commitRem before the
  //  planned touchdown; a new touchdown time warps the swing's remaining phase; the foothold retargets the swing)
  _adjustU(o, R) { const K = R.walkK, CU = K.ctrlU, U = CU.U, P = U.ctx.planner, C = U.C; if (R.tSw0 + K.Tss - o.t < C.commitRem) return; if (C.late) return this._lateU(o, R); if (C.inSwingUntil != null && o.t - R.tSw0 > C.inSwingUntil) return;
    const hd = K.hd, rt = [hd[1], -hd[0]], side = K.side;
    const dec = P._uniDecide(o, { pSt: R.pSt, hd, rt, side, sw: R.sw, st: R.st, tSw0: R.tSw0, xi: o.xi, liftT: R.liftoff ? R.liftoff.t : null, Tcur: K.Tss, dl0: CU.u[1], yaw: R.proj.yaw, cur0: R.cur0, E0: CU.E0, ytL: CU.ytL, ytF: CU.ytF }, CU.log);
    if (Math.abs(dec.T - K.Tss) > 1e-3) { const st = R.T / Math.max(1e-3, K.Tss), Tn = dec.T * st, wc = swPhase(R, o.t + (R.leadNow || 0));
      R.warp = { tc: o.t + (R.leadNow || 0), wc, tEnd: R.tSw0 + Tn, T0: R.warp ? R.warp.T0 : R.T }; if (R.warp.tEnd - R.warp.tc < 0.05) R.warp.tEnd = R.warp.tc + 0.05;
      R.T = Tn; K.Tss = dec.T; R.plannedTd.t = R.tSw0 + Tn; R.Tchanged = (R.Tchanged || 0) + 1; }
    // ((G2b unified, opt-in C.tgtSmooth = { tau, dead }) the in-swing foothold moves toward the new decision with a first-order lag tau and ignores
    //  changes below `dead` — a swing follows one smooth late correction, not a sequence of jumps)
    if (C.tgtSmooth) { const TS = C.tgtSmooth, a = Math.min(1, (1 / 60) / (TS.tau ?? 0.04)); dec.df = CU.u[0] + (Math.abs(dec.df - CU.u[0]) < (TS.dead ?? 0.015) ? 0 : (dec.df - CU.u[0]) * a); dec.dl = CU.u[1] + (Math.abs(dec.dl - CU.u[1]) < (TS.dead ?? 0.015) ? 0 : (dec.dl - CU.u[1]) * a); }
    CU.u = [dec.df, dec.dl, dec.T]; const tc = [R.pSt[0] + hd[0] * dec.df + rt[0] * side * dec.dl, R.pSt[1] + hd[1] * dec.df + rt[1] * side * dec.dl];
    if (Math.hypot(tc[0] - R.proj.target[0], tc[1] - R.proj.target[1]) < PLAN.adjustTol) return;
    const c = { ...R.cand, target: tc, tSw: R.T }; const T0 = R.T; this.tool._aim(R, o, c); R.T = T0; R.tSw = R.tSw0; this._groundEnd(R); this._timedRetarget(o, R, tc, o.t); R.plannedTd.center = tc.slice(); R.adjusted = (R.adjusted || 0) + 1; }
  // ((G2b overnight, opt-in C.late = { tau, g: [[τ, g], …], gL, dMax, dMaxL, T }) ONE LATE CORRECTION through an INVERSE EXECUTION MODEL: no
  //  re-decision during the swing except once, at the first tick with τ ≥ late.tau (the measured maps are most informative late: the body's own
  //  state carries what the step-start prediction lacks). The matched-state bench measured how the swing EXECUTES a mid-swing change: a
  //  foothold change d at τ lands g(τ)·d further (g ≈ 0.65 / 0.57 / 0.50 at τ 0.15 / 0.20 / 0.25, both directions, sd ≈ 0.5 cm), a
  //  touchdown-time change is executed fully. So the correction is SOLVED in what the swing can deliver — the foothold within
  //  [u − g·dMax, u + g·dMax] (the effect of the largest request the bench covers), the timing within its bounds if late.T — and REQUESTED
  //  through the inverse of that model (Δ/g), so the landing the maps assumed is the one the swing produces. No outcome is forced: the change
  //  goes to the executor's ordinary retarget path and physics decides where the foot lands.
  _lateU(o, R) { const K = R.walkK, CU = K.ctrlU, U = CU.U, P = U.ctx.planner, C = U.C, L = C.late, tau = o.t - R.tSw0; if (CU.lateDone || tau < L.tau) return; CU.lateDone = true;
    const interp = (G, t) => { if (t <= G[0][0]) return G[0][1]; for (let i = 1; i < G.length; i++) if (t <= G[i][0]) { const a = G[i - 1], b = G[i]; return a[1] + (b[1] - a[1]) * (t - a[0]) / (b[0] - a[0]); } return G[G.length - 1][1]; };
    const g = interp(L.g, tau), gL = L.gL ? interp(L.gL, tau) : g, dM = L.dMax ?? 0.08, dML = L.dMaxL ?? dM, hd = K.hd, rt = [hd[1], -hd[0]], side = K.side, u0 = CU.u.slice();
    const bnd = { lo: [u0[0] - g * dM, u0[1] - gL * dML], hi: [u0[0] + g * dM, u0[1] + gL * dML] };
    const dec = P._uniDecide(o, { pSt: R.pSt, hd, rt, side, sw: R.sw, st: R.st, tSw0: R.tSw0, xi: o.xi, liftT: R.liftoff ? R.liftoff.t : null, Tcur: K.Tss, dl0: CU.u[1], yaw: R.proj.yaw, cur0: R.cur0, E0: CU.E0, ytL: CU.ytL, ytF: CU.ytF, bnd, Tfree: !!L.T, uRef: L.uRefCur ? u0 : null }, CU.log);
    const req = [u0[0] + Math.max(-dM, Math.min(dM, (dec.df - u0[0]) / g)), u0[1] + Math.max(-dML, Math.min(dML, (dec.dl - u0[1]) / gL))];
    if (L.T && Math.abs(dec.T - K.Tss) > 1e-3) { const st = R.T / Math.max(1e-3, K.Tss), Tn = dec.T * st, wc = swPhase(R, o.t + (R.leadNow || 0));
      R.warp = { tc: o.t + (R.leadNow || 0), wc, tEnd: R.tSw0 + Tn, T0: R.warp ? R.warp.T0 : R.T }; if (R.warp.tEnd - R.warp.tc < 0.05) R.warp.tEnd = R.warp.tc + 0.05;
      R.T = Tn; K.Tss = dec.T; R.plannedTd.t = R.tSw0 + Tn; R.Tchanged = (R.Tchanged || 0) + 1; }
    CU.lateLog = { tau, g, gL, u0, effective: [dec.df, dec.dl, dec.T], req, pred: dec.info && dec.info.mapPred };
    CU.u = [req[0], req[1], dec.T]; const tc = [R.pSt[0] + hd[0] * req[0] + rt[0] * side * req[1], R.pSt[1] + hd[1] * req[0] + rt[1] * side * req[1]];
    if (Math.hypot(tc[0] - R.proj.target[0], tc[1] - R.proj.target[1]) < PLAN.adjustTol) return;
    const c = { ...R.cand, target: tc, tSw: R.T }; const T0 = R.T; this.tool._aim(R, o, c); R.T = T0; R.tSw = R.tSw0; this._groundEnd(R); this._timedRetarget(o, R, tc, o.t); R.plannedTd.center = tc.slice(); R.adjusted = (R.adjusted || 0) + 1; }
  // ((G2b WALKER) Controller A's in-swing re-decision: the foothold re-solved from the view's measured capture point with the map measured at
  // this instant of the step, toward the step-start target; retargeted as a late adjustment (feasibility-checked, blended by the swing))
  // (no later than commitMargin before the planned touchdown: the foot must still be able to get there)
  _adjustCtrl(o, R) { const K = R.walkK, A = K.ctrlA, tau = o.t - R.tSw0; if (tau > Math.min(A.until, K.Tss - (A.C.commitMargin ?? 0.16))) return; const pS = R.pSt, hd = K.hd, rt = [hd[1], -hd[0]], side = K.side, e = [o.xi[0] - pS[0], o.xi[1] - pS[1]];
    const x = [e[0] * hd[0] + e[1] * hd[1], (e[0] * rt[0] + e[1] * rt[1]) * side], prj = (v) => [v[0] * hd[0] + v[1] * hd[1], (v[0] * rt[0] + v[1] * rt[1]) * side];
    // ((G2b speed work) the limits of this re-decision: the earliest touchdown time a swing can still make (C.inSwingT) and the reachable forward
    //  foothold at a touchdown time T (C.reach = { ext }: the swing hip extrapolated with its measured velocity to the touchdown, the leg's
    //  horizontal reach √((ext·L)² − Δy²) at the hip's height above the landed ankle, less the outline's ankle-to-centre offset))
    let lim = null; if (A.C.inSwingT || A.C.reach) { const g = this.geo, Lg = this.tool.ctrl.legs[R.sw], hip = o.states[Lg.thigh].pos, vh = o.states[0].v, Ll = Lg.L1 + Lg.L2, cOff = g.box.pos[2];
      lim = { tMin: A.C.inSwingT ? tau + (A.C.inSwingT.minRem ?? 0.12) : null,
        dfHi: A.C.reach ? (T) => { const dt = Math.max(0, R.tSw0 + T - o.t), hx = (hip[0] + vh[0] * dt - pS[0]) * hd[0] + (hip[2] + vh[2] * dt - pS[1]) * hd[1], dy = hip[1] - (g.yFlat + 0.005), Rr = Math.sqrt(Math.max(0, (A.C.reach.ext * Ll) ** 2 - dy * dy)); return hx + Rr - cOff; } : null }; }
    const dec = A.C.kind === "B" ? decideB(A.C, { d: prj([o.com[0] - pS[0], o.com[2] - pS[1]]), v: prj([o.vcom[0], o.vcom[2]]) }) : adjustA(A.C, x, tau, A.yt, A.u, A.b, lim); let tc = [pS[0] + hd[0] * dec.df + rt[0] * side * dec.dl, pS[1] + hd[1] * dec.df + rt[1] * side * dec.dl];
    A.log.adj.push({ t: o.t, tau, x, df: dec.df, dl: dec.dl, T: dec.T, pred: dec.info.pred || null, clamped: dec.info.clamped || [], dfHi: lim && lim.dfHi ? lim.dfHi(dec.T) : null });
    // (a new TIMING: the single support's planned duration and the planned touchdown move; the generic swing re-plans to it)
    if (A.C.inSwingT && Math.abs(dec.T - K.Tss) > 1e-4) { const st = R.T / Math.max(1e-3, K.Tss), Tn = dec.T * st, wc = swPhase(R, o.t + (R.leadNow || 0));   // (the swing's own duration keeps the plan's stretch)
      R.warp = { tc: o.t + (R.leadNow || 0), wc, tEnd: R.tSw0 + Tn, T0: R.warp ? R.warp.T0 : R.T }; if (R.warp.tEnd - R.warp.tc < 0.05) R.warp.tEnd = R.warp.tc + 0.05;
      R.T = Tn; K.Tss = dec.T; A.u[2] = dec.T; R.plannedTd.t = R.tSw0 + Tn; R.Tchanged = (R.Tchanged || 0) + 1; }
    if (Math.hypot(tc[0] - R.proj.target[0], tc[1] - R.proj.target[1]) < PLAN.adjustTol) return;
    const Trem = Math.max(0, R.tSw0 + K.Tss - o.t), dC = dComAt(o, pS, Trem), ok = (p) => this.tool._feasible(o, R.sw, p, R.proj.yaw, R.cur0, dC, null).ok;
    if (!ok(tc)) { const a = R.proj.target; let lo = 0, hi = 1; for (let i = 0; i < 16; i++) { const m = (lo + hi) / 2; if (ok([a[0] + (tc[0] - a[0]) * m, a[1] + (tc[1] - a[1]) * m])) lo = m; else hi = m; } tc = [a[0] + (tc[0] - a[0]) * lo, a[1] + (tc[1] - a[1]) * lo]; }
    const c = { ...R.cand, target: tc, tSw: R.T }; const T0 = R.T; this.tool._aim(R, o, c); R.T = T0; R.tSw = R.tSw0; this._groundEnd(R); this._timedRetarget(o, R, tc, o.t); R.plannedTd.center = tc.slice(); R.adjusted = (R.adjusted || 0) + 1; }
  // rhythmic: the planned capture-point trajectory during single support (LIPM about the stance foot's nominal CoP p_st)
  // ((G2b speed work, walk.dcmRef = { k, vd, xL: [a, b], from }) from the swing's measured LIFTOFF the single support's capture-point reference is
  //  the DESIRED gait's, not the step's own measured start: ξ_ref(liftoff) = the stance centre + x_L(vd) along the walk (x_L = a + b·v, measured on
  //  this body: the capture point's offset at liftoff vs the walking speed) and the measured sideways ξ, propagated under the planned heel→toe
  //  CoP roll over the remaining single support; the stance ankle then tracks it, p = p_ref + (1 + k)(ξ − ξ_ref) along the walk — capture-point
  //  (DCM) tracking through the ground reaction: an error converges at k·ω within the step instead of diverging at ω, within the sole / torque)
  _dcmRef(R, t, o) { const K = R.walkK, D = K.dcmRef;
    // ((G2b unified) the orbit of the unified controller: from the measured liftoff, x_L(vd) + I → ξ_td(T) at the CURRENT planned touchdown;
    //  sideways the measured offset propagated as before)
    if (K.ctrlU) { const U = K.ctrlU.U; if ((R.stepIndex ?? 0) < (U.C.from ?? 2)) return null; const hd = K.hd, rt = [hd[1], -hd[0]], w = o.omega0, tau = t - R.tSw0;
      const tauL = R.liftoff ? R.liftoff.t - R.tSw0 : Math.max(tau, U.C.liftDelay), orb = U.orbit(t, K.Tss);
      if (U.C.funnel == null) { if (!R.liftoff) return null; }
      if (R.liftoff && !R.dcm0) R.dcm0 = { t: R.liftoff.t, lat: (o.xi[0] - R.pSt[0]) * rt[0] + (o.xi[1] - R.pSt[1]) * rt[1] };
      // (sideways EXACTLY as the validated inner loop: before liftoff the step-start offset propagated from the step's start, after it the
      //  liftoff offset propagated — the CoP on the walk line)
      let latIni = ((R.xiIni[0] - R.pSt[0]) * rt[0] + (R.xiIni[1] - R.pSt[1]) * rt[1]) * Math.exp(w * Math.max(0, tau));
      // ((G2b unified, C.latFunnel = { f, k }) the SIDEWAYS stance reference converges a fraction f of the step-start error onto the periodic
      //  sideways orbit (the inward offset x*_l at the step start, propagated with the CoP on the foot's line) by touchdown; the stance ankle tracks
      //  it with gain k after liftoff, within the realisable sideways CoP — sideways ground-reaction regulation before the foothold)
      if (U.C.latFunnel) { const LF = U.C.latFunnel, xs = U.C.lat.xStar ?? 0.081, l0 = (R.xiIni[0] - R.pSt[0]) * rt[0] + (R.xiIni[1] - R.pSt[1]) * rt[1], E = Math.exp(w * Math.max(0, tau)), oL = K.side * xs, xm = Math.max(0, Math.min(1, tau / Math.max(0.05, K.Tss))), mj = xm * xm * xm * (10 - 15 * xm + 6 * xm * xm);
        latIni = (oL + (l0 - oL) * (1 - (LF.f ?? 0.5) * mj)) * E; }
      const lat = U.C.latReanchor && R.dcm0 ? R.dcm0.lat * Math.exp(w * Math.max(0, t - R.dcm0.t)) : latIni;
      let f, pf; if (U.C.funnel != null) { const q = U.refFn(orb, K.ctrlU.E0 ?? 0, tauL, K.r, w)(tau); f = q.xi; pf = q.p; }
      else { const P = U.path(orb, tauL, K.r, w), sN = Math.max(0, t - R.liftoff.t); f = P.at(Math.min(sN, P.Ts + 0.2)); pf = P.pa + (P.pb - P.pa) * Math.min(1, sN / P.Ts); }
      return { xi: [R.pSt[0] + hd[0] * f + rt[0] * lat, R.pSt[1] + hd[1] * f + rt[1] * lat], p: [R.pSt[0] + hd[0] * pf, R.pSt[1] + hd[1] * pf] }; }
    if (!D || !R.liftoff || (R.stepIndex ?? 0) < (D.from ?? 2)) return null;
    if (!R.dcm0) { const tL = R.liftoff.t, hd = K.hd, rt = [hd[1], -hd[0]], x0 = D.xL[0] + D.xL[1] * D.vd, lat = (o.xi[0] - R.pSt[0]) * rt[0] + (o.xi[1] - R.pSt[1]) * rt[1], fr = Math.max(0, Math.min(1, (tL - R.tSw0) / K.Tss));
      R.dcm0 = { t: tL, xi: [R.pSt[0] + hd[0] * x0 + rt[0] * lat, R.pSt[1] + hd[1] * x0 + rt[1] * lat], pa: [R.pSt[0] + hd[0] * K.r * (2 * fr - 1), R.pSt[1] + hd[1] * K.r * (2 * fr - 1)], pb: [R.pSt[0] + hd[0] * K.r, R.pSt[1] + hd[1] * K.r], T: Math.max(0.05, R.tSw0 + K.Tss - tL) }; }
    const Z = R.dcm0, q = segXi(Z.xi, Z.pa, Z.pb, Z.T, Math.max(0, t - Z.t), o.omega0); return q; }
  _xiD(R, t, o) { if (R.walkK && (R.walkK.dcmRef || R.walkK.ctrlU)) { const q = this._dcmRef(R, t, o); if (q) { R.xiDotNow = [o.omega0 * (q.xi[0] - q.p[0]), o.omega0 * (q.xi[1] - q.p[1])]; R.pNomNow = q.p; return q.xi; } }
    if (R.walkK && R.walkK.r) { const K = R.walkK, w = o.omega0, q = segXi(R.xiIni, [R.pSt[0] - K.hd[0] * K.r, R.pSt[1] - K.hd[1] * K.r], [R.pSt[0] + K.hd[0] * K.r, R.pSt[1] + K.hd[1] * K.r], K.Tss, Math.max(0, t - R.tSw0), w);
      R.xiDotNow = [w * (q.xi[0] - q.p[0]), w * (q.xi[1] - q.p[1])]; R.pNomNow = q.p; return q.xi; }   // ((G2b) the stance CoP rolls heel → toe)
    const w = o.omega0, e = dexp(w * Math.max(0, t - R.tSw0)), xi = [R.pSt[0] + (R.xiIni[0] - R.pSt[0]) * e, R.pSt[1] + (R.xiIni[1] - R.pSt[1]) * e]; R.xiDotNow = [w * (xi[0] - R.pSt[0]), w * (xi[1] - R.pSt[1])]; return xi; }
  // rhythmic foothold adjustment: the landing target moves with the predicted capture-point error at touchdown (bounded, reach-checked)
  // the capture point at the planned touchdown, predicted WITH the balance law the stance foot is running (p = ξ_d − ξ̇_d/ω + (1 + kXi)(ξ − ξ_d)),
  // its CoP limited to the stance sole AND to what the stance ankle's finite torques can hold (roll ±τ_Z / W sideways, τ_plantar / W ahead,
  // τ_dorsi / W behind the ankle). Only the part of the error the ankle cannot remove moves the foothold (a fixed-CoP prediction amplified
  // every ankle-correctable error by e^{ωT} and pushed the footholds 12 cm out — G1a finding).
  _predictTd(o, R, Trem) { const w = o.omega0, g = this.geo, ctrl = this.tool.ctrl, st = R.st, sole = g._sole(o, st), ank = o.states[g.foot[st]].pos, hd = g._heading(o, st), rt = [hd[1], -hd[0]];
    const Wt = this.tool.W, L = ctrl.limits.ankle, m = ctrl.mult, fwdMax = L.Y[1] * m / Wt, backMax = -L.Y[0] * m / Wt, latMax = R.walkK && R.walkK.latPred != null ? R.walkK.latPred : L.Z[1] * m / Wt;   // ((G2b) walking: the realisable sideways CoP, ≈ 1–2.5 cm)
    let xi = o.xi.slice(); const h = 0.01, n = Math.max(0, Math.round(Trem / h)); let tt = o.t - R.tSw0;
    for (let i = 0; i < n; i++) { let xd, pN = R.pSt; if (R.walkK && R.walkK.r) { const K = R.walkK, q = segXi(R.xiIni, [R.pSt[0] - K.hd[0] * K.r, R.pSt[1] - K.hd[1] * K.r], [R.pSt[0] + K.hd[0] * K.r, R.pSt[1] + K.hd[1] * K.r], K.Tss, tt, w); xd = q.xi; pN = q.p; }
      else { const e = dexp(w * tt); xd = [R.pSt[0] + (R.xiIni[0] - R.pSt[0]) * e, R.pSt[1] + (R.xiIni[1] - R.pSt[1]) * e]; }
      const ex = [xi[0] - xd[0], xi[1] - xd[1]], kq = kXiErr(R.walkK ? (R.walkK.kXi ?? { hd: R.walkK.hd, along: R.walkK.kXiAlong ?? 0, across: R.walkK.kXiAcross ?? BAL.kXi }) : BAL.kXi, ex); let p = [pN[0] + ex[0] + kq[0], pN[1] + ex[1] + kq[1]];
      const d = [p[0] - ank[0], p[1] - ank[2]], f = Math.max(-backMax, Math.min(fwdMax, d[0] * hd[0] + d[1] * hd[1])), l = Math.max(-latMax, Math.min(latMax, d[0] * rt[0] + d[1] * rt[1]));
      p = [ank[0] + hd[0] * f + rt[0] * l, ank[2] + hd[1] * f + rt[1] * l]; if (sole.length >= 3 && polyDist(sole, p) < 0) { const c = this._nearest(sole, p); p = c; }
      xi = [xi[0] + h * w * (xi[0] - p[0]), xi[1] + h * w * (xi[1] - p[1])]; tt += h; }
    return xi; }
  _nearest(P, x) { let best = null, bd = 1e18; for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length], e = [b[0] - a[0], b[1] - a[1]], L2 = e[0] * e[0] + e[1] * e[1] || 1, tq = Math.max(0, Math.min(1, ((x[0] - a[0]) * e[0] + (x[1] - a[1]) * e[1]) / L2)), q = [a[0] + e[0] * tq, a[1] + e[1] * tq], d = (q[0] - x[0]) ** 2 + (q[1] - x[1]) ** 2; if (d < bd) { bd = d; best = q; } } return best; }
  _adjust(o, R) { if (R.walkK && R.walkK.ctrlU) return R.walkK.ctrlU.fixed ? undefined : this._adjustU(o, R); if (R.walkK && R.walkK.ctrlA) return this._adjustCtrl(o, R); if (R.walkK) return this._adjustWalk(o, R); const Trem = Math.max(0, R.tSw0 + R.T - o.t), pred = this._predictTd(o, R, Trem);
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
    // ((G2b speed work, opt-in rhythm.walk.swingLead) the walking swing's trajectory is evaluated at the view time + the feedback delay — the
    //  time the commands act: the plan is a function of absolute time, the view is dFb old; evaluated at the view time every swing target and
    //  every feed-forward torque arrived dFb late (a lagging then overshooting foot: +7 cm landing overshoot, 1–2 cm with no delay))
    if (this._uni && this.rhythm && this.rhythm.wk) { const h0 = this._hdg(); this._uni.observe(oFb, [Math.sin(h0), Math.cos(h0)]); }
    this.exec.lead = this.opts.timedLead ? dt : (this.rhythm && this.rhythm.walk && this.rhythm.walk.swingLead ? (this.exec.dFb || 0) : 0);
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
        r.wds = { t0: oFb.t, xi0: x0, p0: [er.R.pSt[0] + hd[0] * R0, er.R.pSt[1] + hd[1] * R0], p1: [pL[0] - hd[0] * R0, pL[1] - hd[1] * R0], pC: pL, T: r.Tds, cT: er.R.walkK ? er.R.walkK.cNext.slice() : null, pT: er.R.pSt.slice() }; } } }
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
      if (r.tTd != null && t - r.tTd < STEP.softenT && r.lastLanded && !(r.walk && r.walk.noSoften)) plan.soften = { foot: r.lastLanded, k: STEP.softenK + (1 - STEP.softenK) * minjerk((t - r.tTd) / STEP.softenT) };   // ((G2b walker, walk.noSoften) a walking hand-over arrives 50 ms after the impact: softening the landed leg then only weakened its weight acceptance)
      // (G2a) after a forefoot contact the heel LOWERS: the landed foot is aimed level on a compliant ankle (C2's heel rocker, plan.settle) until
      // its sole is down (heel and toe in contact) — the load acceptance of a human step; the body's weight, not a position target, lowers it
      if (r.humanLand && r.humanLand === r.lastLanded && next && !(o.feet[r.humanLand].heel && o.feet[r.humanLand].toe)) { plan.settle = { foot: r.humanLand, level: true }; if (r.walk && r.walk.rocker && r.walk.rocker.kdF != null) plan.settle.kdF = r.walk.rocker.kdF; }
      if (plan.settle && plan.unloading && r.walk && r.walk.settleSole) plan.unloading = { ...plan.unloading, soleFor: plan.settle.foot };   // ((G2b walker) the landing foot's CoP region = its whole sole until it is down)
      r.unloading = next && this.ctrl.opts.unloadPlan && (u > 0.4 || (r.walk && plan.unloading)) ? next.sw : null;
      // ((G2b, walk.firstProg) the FIRST walking transfer unloads the stepping foot by the capture point's PROGRESS toward its target, not by the
      // clock: unloaded on time while ξ was still 4 cm short, the foot lifted, the CoP jumped under the stance foot and pushed ξ back — the
      // first step then needed the maximum width)
      let uU = u; if (r.walk && r.first && r.walk.firstProg && r.wFirst && r.dsFrom) { const d0 = Math.hypot(r.dsFrom[0] - r.wFirst[0], r.dsFrom[1] - r.wFirst[1]), d = Math.hypot(o.xi[0] - r.wFirst[0], o.xi[1] - r.wFirst[1]); uU = Math.min(u, d0 > 1e-3 ? Math.max(0, 1 - d / d0) : 1); }
      if (next && this.ctrl.opts.unloadPlan && uU > 0.4 && !(r.walk && plan.unloading)) { if (next.share0 == null) next.share0 = Math.max(0, Math.min(1, o.feet[next.sw].load / (this.spec.totalMass * 9.81))); plan.unloading = { foot: next.sw, maxShare: next.share0 * (1 - minjerk((uU - 0.4) / 0.6)), bandCap: r.walk ? r.walk.copBand : null }; }
      // ((G2b walker, walk.dsExtEnd = e) the double support ENDS EARLY when the trailing leg reaches e of its full extension (measured, hip →
      // ankle) and the landed foot already carries ≥ 60 % of the weight: past full extension the trailing toe could not be lifted any more — it
      // dragged under the hip with up to 1.2 BW and the swing never left the ground (the C8 failure; identification: 60–89 % swing failures
      // after steps ≥ 0.30 m). The timing follows the body's measured geometry, not a clock.)
      if (u < 1 && next && r.walk && r.walk.dsExtEnd && !r.first && r.trailExt != null && r.trailExt >= r.walk.dsExtEnd && r.lastLanded && o.feet[r.lastLanded].load >= 0.6 * this.spec.totalMass * 9.81) { u = 1; r.extEnded = (r.extEnded || 0) + 1; }
      // ((G2b unified, ctrl.dsState = { tol, min, max }) the double support ENDS ON THE STATE: once the capture point has reached the next step's
      //  start target x_S(vd) + I ahead of the landed foot (within tol) — after at least `min` s, and the landed foot loaded (60 % BW) — instead of
      //  on the clock; while it is still short, the double support extends up to `max` s past its planned end (the trailing-leg extension end
      //  above still applies): the next step then starts from a consistent state, not a timing-dependent one)
      let dsHold = false; if (next && r.walk && this._uni && this._uni.C.dsState && !r.first && r.wds && r.lastLanded) { const DSs = this._uni.C.dsState, ps2 = this._hdg(), hd2 = [Math.sin(ps2), Math.cos(ps2)], pL = this._wkP(o, r.lastLanded), fN = (o.xi[0] - pL[0]) * hd2[0] + (o.xi[1] - pL[1]) * hd2[1], tgt = this._uni.orbit(t, this._uni.C.Tr).xS, el = t - r.tDs, loaded = o.feet[r.lastLanded].load >= 0.6 * this.spec.totalMass * 9.81;
        r.dsStateLog = { fN, tgt, el }; if (u < 1 && el >= (DSs.min ?? 0.06) && loaded && fN >= tgt - (DSs.tol ?? 0.01)) { u = 1; r.stateEnded = (r.stateEnded || 0) + 1; } else if (u >= 1 && fN < tgt - (DSs.tol ?? 0.01) && el < T + (DSs.max ?? 0.1) && !(r.trailExt != null && r.walk.dsExtEnd && r.trailExt >= r.walk.dsExtEnd)) dsHold = true; }
      if (dsHold) return plan;
      // (G2a) a human double support ends on the CONTACT, not the clock: the trailing foot lifts once the landed foot's sole is down (heel and
      // toe) and it carries its planned share (≥ 35 % BW), or at the latest 0.3 s after the planned end (phase follows measured progress)
      if (u >= 1 && next && r.humanLand && r.humanLand === r.lastLanded && t - r.tDs < T + 0.3) { const F = o.feet[r.humanLand], W = this.spec.totalMass * 9.81;
        if (!((F.heel && F.toe) || (r.walk && r.walk.dsFlat === false)) || F.load < 0.35 * W) return plan;   // ((G2b walker, walk.dsFlat false) the load decides, not whether the heel rocker has finished)
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
    // (fwdDS "freeze": along the walk too the double support HOLDS ξ — the forward step map has no double-support term either)
    const fr = W.latDS === "freeze", ff = W.fwdDS === "freeze"; r.wk = { v, cad, T, L: W.L || v * (W.Tss || W.Tds ? r.Tss + r.Tds : T), w: W.w ?? 0.22, E1, E2, k, k1, lE2: fr ? 1 : E2, lK: fr ? 1 : k, fE2: ff ? 1 : E2, fK: ff ? 1 : k, r: W.roll ?? 0.08, omega: w, h0, toeOut: { L: r.homeYaw.L - h0, R: r.homeYaw.R - h0 }, Lmax: W.Lmax ?? 0.68,
      // (the narrowest step this body can take: its collider boots are 16.4 cm wide, so below ≈ 20 cm centre-to-centre the swinging boot's
      // path meets the stance boot — a body-geometry limit, a human foot is ≈ 10 cm wide)
      wMin: W.wMin ?? 0.20, wMax: W.wMax ?? 0.34, w0: Math.hypot(r.home.L[0] - r.home.R[0], r.home.L[1] - r.home.R[1]) };   // (Lmax ≈ 0.73 leg: the reachable step)
    // ((G2b unified, walk.ctrl.kind "U") the unified walking controller: one reference orbit for the requested velocity, served by the ground
    //  reaction and the foothold together (pc_unified.js))
    if (W.ctrl && W.ctrl.kind === "U") this._uni = new UnifiedWalker(W.ctrl, { planner: this });
    if (W.vReg) { this.exec.vBarTau = W.vReg.tau ?? 0.5; this.exec.vBarHd = [Math.sin(h0), Math.cos(h0)]; this.exec.vBarT0 = o.t; }   // (the speed regulator's low-passed walking velocity)
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
    const E2 = K.fE2 ?? K.E2, kk = K.fK ?? K.k, cf = (E2 * (R0 * (K.E1 - 1) + 2 * R0 * (1 - K.k1)) - R0 * (E2 - 1) + (Lf - 2 * R0) * (1 - kk) - Lf) / (1 - K.E1 * E2);
    return [hd[0] * cf + rt[0] * cl, hd[1] * cf + rt[1] * cl]; }
  // ξ at the start of the FIRST single support: the stance foot's point + the nominal offset of the first step (from standing)
  _walkFirstXi(o, step) { const r = this.rhythm, st = step.sw === "L" ? "R" : "L", side = step.sw === "R" ? 1 : -1, p = this._wkP(o, st), c = this._wkC(r, this._stepL(step), side * this._stepW(r.i)); return [p[0] + c[0], p[1] + c[1]]; }
  // the DCM foothold (along, across the walk, relative to the stance centre) for a capture point ξ_eos at the end of single support, so that the
  // double support (CoP: trailing forefoot → leading heel) leaves ξ at c_next from the new stance centre
  _dcmD(K, hd, rt, eos, pSt, cN) { const e = [eos[0] - pSt[0], eos[1] - pSt[1]], ef = e[0] * hd[0] + e[1] * hd[1], el = e[0] * rt[0] + e[1] * rt[1], cf = cN[0] * hd[0] + cN[1] * hd[1], cl = cN[0] * rt[0] + cN[1] * rt[1], R0 = K.r;
    const E2 = K.fE2 ?? K.E2, kk = K.fK ?? K.k; return [(E2 * ef - R0 * (E2 - 1) - 2 * R0 * (1 - kk) - cf) / kk, (K.lE2 * el - cl) / K.lK]; }
  _walkPlan(o, step, xi0) { const r = this.rhythm, K = r.wk, st = step.sw === "L" ? "R" : "L", side = step.sw === "R" ? 1 : -1, ps = this._hdg(), hd = [Math.sin(ps), Math.cos(ps)], rt = [hd[1], -hd[0]];
    const pSt = this._wkP(o, st), nxt = r.steps[r.i + 1], Wn = this._stepW(r.i), R0 = K.r;
    // ((G2b, walk.vGain) GRADUAL forward placement: the next single support aims at the periodic gait of step length L* = L_cur + g_v·(L_nom − L_cur),
    // L_cur the periodic step length whose start offset equals the MEASURED one (c_f(L) is linear in L: c_f = A + B·L) — a speed error decays by
    // (1 − g_v) per step instead of being cancelled in one step; the deadbeat target (always the nominal gait) placed a slow body's next foot
    // behind the stance foot and drove step lengths between 6 and 75 cm)
    let Lnext = nxt ? this._stepL(nxt) : 0; if (nxt && r.walk.vGain != null) { const A = this._wkC(r, 0, 0), B = this._wkC(r, 1, 0), a = A[0] * hd[0] + A[1] * hd[1], b = (B[0] * hd[0] + B[1] * hd[1]) - a, c0f = (xi0[0] - pSt[0]) * hd[0] + (xi0[1] - pSt[1]) * hd[1];
      const Lc = b > 1e-6 ? (c0f - a) / b : Lnext, dLm = r.walk.vStepMax ?? 0.12; Lnext = Math.max(0.05, Math.min(K.Lmax, Lc + Math.max(-dLm, Math.min(dLm, r.walk.vGain * (Lnext - Lc))))); this.lastLc = { Lc, Lnext, c0f }; }
    const cN = nxt ? this._wkC(r, Lnext, -side * this._stepW(r.i + 1)) : [0, 0];
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
    // ((G2 characterisation, opt-in rhythm.walk.char = { [stepIndex]: { df, dl, T } }) an OPEN-LOOP measured step: the foothold is commanded
    // explicitly — df along the heading and dl the step width (toward the swing side) from the stance point — with single-support duration T
    // and no in-swing foothold adjustment; the body's response to it is the measurement)
    let CH = r.walk.char && r.walk.char[r.i], ctrlA = null; this._ctrlStep = null;
    // ((G2b WALKER, rhythm.walk.ctrl — pc_walker.js) a STEPPING CONTROLLER decides this step from the measured state the view holds now:
    // Controller A (measured-response foothold + timing) or B (SIMBICON-style baseline). It returns a foothold and a duration only.)
    // ((G2b unified, identification) a COMMANDED step (walk.char[i]) under the unified inner loop: the controller still owns the stance reference
    //  (its orbit, funnel, the double support's target) but the foothold and timing are the commanded ones and are not re-decided in the swing)
    const uFixed = !!(CH && r.walk.ctrl && r.walk.ctrl.kind === "U" && this._uni && r.walk.ctrl.identFixed && r.i >= (r.walk.ctrl.fromStep ?? 1));
    let ctrlU = null; if ((!CH || uFixed) && r.walk.ctrl && r.walk.ctrl.kind === "U" && this._uni && r.i >= (r.walk.ctrl.fromStep ?? 1)) { const U = this._uni;
      if (r.tTd != null && !r.first && r.i >= 2) U.dsMeas.push(o.t - r.tTd);   // (the double support just ended: its measured duration)
      // ((G2b unified, C.adapt = { gain, max }) the maps' ONLINE bias (Controller A's integral action on a persistent model error): the previous step's
      //  last prediction of this step's start state vs the state measured now)
      if (U.C.adapt) { U.bias = U.bias || [0, 0]; const pl = U.stepLog[U.stepLog.length - 1]; if (pl && pl.i === r.i - 1 && pl.dec.length) { const pr = pl.dec[pl.dec.length - 1].mapPred, ex = [xi0[0] - pSt[0], xi0[1] - pSt[1]], xm = [ex[0] * hd[0] + ex[1] * hd[1], (ex[0] * rt[0] + ex[1] * rt[1]) * side];
          if (pr) { const g = U.C.adapt.gain ?? 0.3, mx = U.C.adapt.max ?? 0.06; pl.err = [xm[0] - pr[0], xm[1] - pr[1]]; U.bias = U.bias.map((b, j) => Math.max(-mx, Math.min(mx, b + g * pl.err[j]))); } } }
      U.rampStart(o.t); U.stepUpdate(o.t, r.i); const lg = { i: r.i, t: o.t, sw: step.sw, I: U.I, vBar: U.vBar, vd: U.vd(o.t), dec: [], ds: U.Tds() };
      const qd = { pSt, hd, rt, side, sw: step.sw, st, tSw0: o.t, xi: xi0, liftT: null, Tcur: U.C.Tr, dl0: U.C.lat.dl0 ?? 0.28, yaw: ps + (K.toeOut[step.sw] || 0), cur0: this.geo._center(o, step.sw), out: {} }, dec = this._uniDecide(o, qd, lg); lg.E0 = qd.out.E0;
      // (identification only, ctrl.dither = { seed, sd } with ctrl.identStart: a seeded, logged perturbation of the step-start decision, executed
      //  without in-swing re-decision — the commanded step is the executed one; the unified inner loop (stance orbit, funnel) still runs)
      let dz = [0, 0, 0]; if (U.C.dither) { const gg = this._dz = this._dz || { s: U.C.dither.seed >>> 0 }, rn = () => { gg.s = (gg.s + 0x6D2B79F5) >>> 0; let tq = gg.s; tq = Math.imul(tq ^ (tq >>> 15), tq | 1); tq ^= tq + Math.imul(tq ^ (tq >>> 7), tq | 61); return ((tq ^ (tq >>> 14)) >>> 0) / 4294967296; };
        dz = U.C.dither.sd.map(sdv => sdv * Math.sqrt(-2 * Math.log(Math.max(1e-12, rn()))) * Math.cos(2 * Math.PI * rn())); }
      // ((G2b unified, C.place "lqr" from step C.lqrFrom) the step-start decision is the LINEAR-QUADRATIC REGULATOR of the step-to-step map identified
      //  AROUND THE STEADY ORBIT (matched-state bench, e5): state s = [ξ_f, v_f, ξ_l, v_l] at the step start (the view: capture point ahead / inward
      //  of the stance centre, COM velocity along / toward the swing side), u = u0 − K (s − s0); executed without in-swing re-decision (the swing
      //  follows a step-start decision; it follows late changes only partly); the foothold within the physical reach range at that timing)
      let lqrU = null; if (U.C.lqr && U.C.lqr.K && r.i >= (U.C.lqrFrom ?? 1) && !uFixed) { const L = U.C.lqr, ex = [xi0[0] - pSt[0], xi0[1] - pSt[1]], v2 = [o.vcom[0], o.vcom[2]];
        // (the state vector: L.state lists its components — xf, vf, xl, vl (default) and optionally swf, swl: the swing foot's position at the step
        //  start relative to the stance centre (forward, toward the swing side) — the previous step's geometry, which the step map depends on)
        const fsw = o.states[this.geo.foot[step.sw]].pos, sf = [fsw[0] - pSt[0], fsw[2] - pSt[1]], comp = { xf: ex[0] * hd[0] + ex[1] * hd[1], vf: v2[0] * hd[0] + v2[1] * hd[1], xl: (ex[0] * rt[0] + ex[1] * rt[1]) * side, vl: (v2[0] * rt[0] + v2[1] * rt[1]) * side, swf: sf[0] * hd[0] + sf[1] * hd[1], swl: (sf[0] * rt[0] + sf[1] * rt[1]) * side };
        const sv = (L.state || ["xf", "vf", "xl", "vl"]).map(k => comp[k]), ds = sv.map((v, j) => v - L.s0[j]);
        lqrU = L.u0.map((u0, i) => u0 - L.K[i].reduce((a, k, j) => a + k * ds[j], 0)); lqrU[1] = Math.max(U.C.lat.lo ?? 0.20, Math.min(U.C.lat.hi ?? 0.40, lqrU[1])); lqrU[2] = Math.max(U.C.Tmin, Math.min(U.C.Tmax, lqrU[2]));
        const rr = dec.info && dec.info.lo != null ? [dec.info.lo, dec.info.hi] : [U.C.dfMin, U.C.dfMax]; lqrU[0] = Math.max(rr[0], Math.min(rr[1], lqrU[0])); lg.lqr = { s: sv, u: lqrU.slice(), raw: L.u0.map((u0, i) => u0 - L.K[i].reduce((a, k, j) => a + k * ds[j], 0)) }; }
      // ((G2b unified, opt-in C.lateExtend = { bias }) PLAN SHORT, EXTEND LATE: the step-start foothold is placed `bias` short of the decision; the
      //  late in-swing re-decisions then lengthen it as the measured state requires — a moving swing executes a late LENGTHENING fully (arrival-
      //  gated descent, matched-state bench: +8 cm at 0.2–0.3 s → ±0.4 cm) but a late shortening only ≈ 40 % (its momentum carries it past))
      if (U.C.lateExtend && !lqrU && dec) dec.df -= U.C.lateExtend.bias ?? 0.04;
      // ((Physical Stepper, opt-in C.stepper = { model, horizon, beam, … } — pc_stepper.js) the step-start decision is the CONTINUATION-AWARE
      //  PLANNER's: nominal proposals scored on the surrogate's prediction of the next step start (two transitions, only the first executed), the
      //  lateral step centred on the feedback law's own width; executed like the oracle's commanded steps (no in-swing re-decision). The step's
      //  support CONTACT EVENT is accepted and executing from here and is classified only from the executor's SENSED touchdown — never a timer.)
      let stU = null; if (U.C.stepper && U.C.stepper.model && r.i >= (U.C.stepper.from ?? 2) && !uFixed && !lqrU) { const SPc = U.C.stepper, SP = this._stepper = this._stepper || new StepPlanner(SPc);
        const evs = this.stepperEvents = this.stepperEvents || [], doneR = this.exec.done.filter(d => d.kind === "rhythmic");
        for (const ev of evs) if (ev.state === "EXECUTING") { const d = doneR.find(q => q.stepIndex === ev.stepIndex && (q.td || q.status === "FAILED")); if (d) { const c = classifySupport(ev, d, SPc.tol); if (c) ev.to(c.state, o.t, c.why, c.outcome); } }
        const prevTd = doneR.filter(d => d.td).pop(), z = stepFeatures(this.spec, o, { sw: step.sw, pSt, h0: r.wk.h0, tSw0: o.t, prevTd: prevTd ? prevTd.td.t : null }), wp = this.exec.wProf;
        z.mem = { I: lg.I, vBar: lg.vBar, vd: lg.vd, Tds: lg.ds, wProf: wp ? [0, 1, 2].map(j => wp.reduce((a, q) => a + q[j], 0) / wp.length) : null };
        const cal = this.stepperCal = this.stepperCal || [], pl = cal[cal.length - 1]; if (pl && pl.i === r.i - 1 && !pl.actual) pl.actual = { "xi.0": z.xi[0], "xi.1": z.xi[1], "v.0": z.v[0], "v.1": z.v[1], achF: -z.swFoot[0], achW: z.swFoot[1], dur: o.t - pl.t };
        const D = SP.decide(z, { vReq: lg.vd, legLen: SPc.legLen, dl0: dec.dl }, [dec.df, dec.dl, dec.T]); stU = D.u; const y = D.pred.y;
        const tgtW = [pSt[0] + hd[0] * y.achF + rt[0] * side * y.achW, pSt[1] + hd[1] * y.achF + rt[1] * side * y.achW], Tn = D.u[2];
        const ev = new ContactEvent({ effector: "foot_" + step.sw, type: "support", stepIndex: r.i, heading: hd, target: { center: tgtW, halfExtent: (SPc.tol && SPc.tol.region) || [0.08, 0.06] },
          window: { earliest: o.t + 0.5 * Tn, nominal: o.t + Tn + 0.08, latest: o.t + Tn + 0.35 }, command: { df: D.u[0], dl: D.u[1], T: D.u[2] }, continuation: { require: "a predicted-safe next step", c2: D.c2 }, source: D.why, predicted: { ...y, pFall: D.pred.pFall } }, o.t, "nominal proposal chosen by the planner");
        ev.to("ACCEPTED", o.t, "committed for this step").to("EXECUTING", o.t, "the executor began the step"); evs.push(ev);
        cal.push({ i: r.i, t: o.t, pred: { ...y, pFall: D.pred.pFall }, u: D.u.slice(), c1: D.c1, c2: D.c2, tot: D.tot });
        lg.stepper = { u: D.u.slice(), c1: D.c1, c2: D.c2, tot: D.tot, n1: D.n1, n2: D.n2, why: D.why, ev: ev.id, pFall: D.pred.pFall }; }
      if (!uFixed) CH = stU ? { df: stU[0], dl: Math.max(0.15, stU[1]), T: stU[2] } : lqrU ? { df: lqrU[0] + dz[0], dl: Math.max(0.15, lqrU[1] + dz[1]), T: lqrU[2] + dz[2] } : { df: dec.df + dz[0], dl: Math.max(0.15, dec.dl + dz[1]), T: dec.T + dz[2] }; const fixedU = uFixed || !!U.C.identStart || !!lqrU || !!stU; lg.u0 = [CH.df, CH.dl, CH.T]; lg.fixed = fixedU; lg.dz = dz; U.stepLog.push(lg);
      { const ex = [xi0[0] - pSt[0], xi0[1] - pSt[1]]; (r.walkerLog = r.walkerLog || []).push({ i: r.i, t: o.t, sw: step.sw, x: [ex[0] * hd[0] + ex[1] * hd[1], (ex[0] * rt[0] + ex[1] * rt[1]) * side], u: [CH.df, CH.dl, CH.T], dec: [dec.df, dec.dl, dec.T], dz, info: { unified: true }, adj: [] }); }
      ctrlU = { U, log: lg, u: [CH.df, CH.dl, CH.T], E0: qd.out.E0, ytL: qd.out.ytL, ytF: qd.out.ytF, fixed: fixedU }; }
    if (!CH && r.walk.ctrl && r.walk.ctrl.kind !== "U" && r.i >= (r.walk.ctrl.fromStep ?? 1)) { const Cc = r.walk.ctrl, e = [xi0[0] - pSt[0], xi0[1] - pSt[1]], x = [e[0] * hd[0] + e[1] * hd[1], (e[0] * rt[0] + e[1] * rt[1]) * side];
      let dec; if (Cc.kind === "B") { const c = [o.com[0] - pSt[0], o.com[2] - pSt[1]], v = [o.vcom[0], o.vcom[2]]; dec = decideB(Cc, { d: [c[0] * hd[0] + c[1] * hd[1], (c[0] * rt[0] + c[1] * rt[1]) * side], v: [v[0] * hd[0] + v[1] * hd[1], (v[0] * rt[0] + v[1] * rt[1]) * side] }); }
      else { // (Controller A's online bias: the previous controller step's last prediction vs the state measured now)
        if (Cc.adapt) { r.wb = r.wb || [0, 0]; const pl = r.walkerLog && r.walkerLog[r.walkerLog.length - 1]; if (pl && pl.i === r.i - 1) { const pr = pl.adj.length ? pl.adj[pl.adj.length - 1].pred : pl.info.pred; if (pr) { pl.err = [x[0] - pr[0], x[1] - pr[1]]; r.wb = adaptBias(Cc, r.wb, [pl.err[0] + r.wb[0], pl.err[1] + r.wb[1]]); } } }
        dec = decideA(Cc, x, Cc.adapt ? r.wb : null);
        // (identification only, ctrl.ytDither = { seed, sd: [σf, σl] }: a seeded, logged perturbation of the step's TARGET — the in-swing
        //  re-decisions then carry an exogenous variation of the final foothold, so the maps can be identified in the controller's own mode)
        if (Cc.ytDither) { const g = this._dy = this._dy || { s: Cc.ytDither.seed >>> 0 }, rn = () => { g.s = (g.s + 0x6D2B79F5) >>> 0; let t = g.s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
          const z = Cc.ytDither.sd.map(sd => sd * Math.sqrt(-2 * Math.log(Math.max(1e-12, rn()))) * Math.cos(2 * Math.PI * rn())); dec.yt = [dec.yt[0] + z[0], dec.yt[1] + z[1]]; dec.info.ytDither = z; } }
      // (identification only, walk.ctrl.dither = { seed, sd: [σdf, σdl, σT] }: a seeded, logged perturbation of the decided step)
      let dz = [0, 0, 0]; if (Cc.dither) { const g = this._dz = this._dz || { s: Cc.dither.seed >>> 0 }, rn = () => { g.s = (g.s + 0x6D2B79F5) >>> 0; let t = g.s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
        dz = Cc.dither.sd.map(sd => sd * Math.sqrt(-2 * Math.log(Math.max(1e-12, rn()))) * Math.cos(2 * Math.PI * rn())); }
      CH = { df: dec.df + dz[0], dl: Math.max(Cc.kind === "B" ? 0.12 : 0.15, dec.dl + dz[1]), T: dec.T + dz[2] }; const lg = { i: r.i, t: o.t, sw: step.sw, x, u: [CH.df, CH.dl, CH.T], dec: [dec.df, dec.dl, dec.T], dz, info: dec.info, adj: [] }; (r.walkerLog = r.walkerLog || []).push(lg);
      // (Controller A: the in-swing re-decision of the foothold until ctrl.inSwing s into the step — the same target, the timing fixed)
      if (Cc.inSwing) ctrlA = { C: Cc, yt: dec.yt, u: [CH.df, CH.dl, CH.T], until: Cc.inSwing, log: lg, b: Cc.adapt && r.wb ? r.wb.slice() : null };
      if (Cc.kind !== "B") this._ctrlStep = { C: Cc, yt: dec.yt, b: Cc.adapt && r.wb ? r.wb.slice() : null }; }   // (B: SIMBICON's swing hip is servoed continuously — the same in-swing re-evaluation of its own law)
    if (CH) { target = [pSt[0] + hd[0] * CH.df + rt[0] * side * CH.dl, pSt[1] + hd[1] * CH.df + rt[1] * side * CH.dl]; if (CH.T) Tk = CH.T; }
    return { target, pSt, pSw: target, xiIni: xi0.slice(), xiTd: eos, yaw: ps + (K.toeOut[step.sw] || 0), dcm: { df: df0, dl: dl0, clamped: df !== df0 || dl !== dl0 }, char: CH || null,
      walkK: { ctrlU, rocker: r.walk.rocker || null, vReg: r.walk.vReg || null, dcmRef: r.walk.dcmRef || null, ...(this._ctrlStep && CH && !(r.walk.char && r.walk.char[r.i]) ? { ctrlC: this._ctrlStep.C, ctrlYt: this._ctrlStep.yt, ctrlB: this._ctrlStep.b } : {}), cNext: cN, side, hd, E2: K.E2, k: K.k, r: K.r, Tss: Tk, kXi: r.walk.kXiSS, latCop: r.walk.latCop, swingKpDrop: r.walk.swingKpDrop, swingPredict: !!r.walk.swingPredict, swingBase: r.walk.swingBase || null, ssHeelRise: r.walk.ssHeelRise || null, swingLead: r.walk.swingLead, adjustUntil: CH ? (ctrlA || (ctrlU && !ctrlU.fixed) ? 1 : 0) : r.walk.adjustUntil, ctrlA, latPred: r.walk.latPred, kXiAcross: r.walk.kXiAcross, kXiAlong: r.walk.kXiAlong, dcm: (eos2, pS2) => this._dcmD(K, hd, rt, eos2, pS2, cN), Lmax: K.Lmax || 0.9, g: r.walk.placeGain ?? 0.6, gf: r.walk.placeGainFwd ?? 1, Ln, w: Wn, wMin: K.wMin, wMax: K.wMax } }; }
  // ((G2b unified) the UNIFIED decision for the step under way (or about to start): the predicted touchdown error that the ground reaction will
  //  not remove → the absorbing foothold for each candidate touchdown time → the reachable range at that time from the actual state → the time
  //  closest to the nominal whose foothold is reachable (least squared violation + timing change); the width from Controller A's map)
  _uniDecide(o, q, lg) { const U = this._uni, C = U.C, g = this.geo, w = o.omega0, tau = o.t - q.tSw0, hd = q.hd, rt = q.rt, rollR = this.rhythm.wk.r;
    const rel = (p) => [(p[0] - q.pSt[0]) * hd[0] + (p[1] - q.pSt[1]) * hd[1], ((p[0] - q.pSt[0]) * rt[0] + (p[1] - q.pSt[1]) * rt[1]) * q.side];
    const x = rel(q.xi), lifted = q.liftT != null, tauL = lifted ? q.liftT - q.tSw0 : Math.max(tau, C.liftDelay);
    const fs = o.states[g.foot[q.sw]], footF = rel([fs.pos[0], fs.pos[2]])[0], footV = lifted ? fs.v[0] * hd[0] + fs.v[2] * hd[1] : 0, vc = [o.vcom[0], o.vcom[2]];
    const Cc = { ...C, models: C.models }, wLo = C.lat.lo ?? 0.17, wHi = C.lat.hi ?? 0.40;
    // (the prediction: the closed-loop stance simulated from the measured capture point now, with the orbit of the NOMINAL timing — a longer or
    //  shorter single support is the body's own capture point running on, not a stretched reference; the stance sole's actual extent bounds the CoP)
    const orbN = U.orbit(o.t, C.Tr), stS = o.feet[q.st] && o.feet[q.st].sole && o.feet[q.st].sole.length >= 3 ? o.feet[q.st].sole.map(pp => rel([pp[0], pp[2]])[0]) : [-0.16, 0.18], sole = [Math.min(...stS), Math.max(...stS)];
    const Ls = this.ctrl.legs[q.st], hipS = o.states[Ls.thigh].pos, ankS = o.states[g.foot[q.st]].pos, comF = rel([o.com[0], o.com[2]])[0];
    const geo = { c: comF, hipOff: rel([hipS[0], hipS[2]])[0] - comF, ankF: rel([ankS[0], ankS[2]])[0], hipH: hipS[1] - ankS[1], Lr: C.stanceExt * (Ls.L1 + Ls.L2) };
    const E0 = q.E0 != null ? q.E0 : x[0] - orbN.xS; if (q.out) q.out.E0 = E0; if (q.ytL == null) q.ytL = C.lat.xStar + C.lat.rho * (x[1] - C.lat.xStar); if (q.out) q.out.ytL = q.ytL;
    const sim = U.simulate(x[0], tau, tauL, Math.max(C.Tmax, q.Tcur) + 0.01, orbN, rollR, w, sole, C.pivot === false ? null : geo, C.funnel != null ? U.refFn(orbN, E0, tauL, rollR, w) : null);
    const evalT = (T) => { const orb = U.orbit(o.t, T), xiTd = sim(T), eps = xiTd - orb.xiTd, uStar = C.G === 1 ? xiTd - orbN.e : orbN.L + C.G * (xiTd - orbN.xiTd), Trem = Math.max(0, T - tau), dCom = [vc[0] * Trem, vc[1] * Trem];
      // (sideways: lat.kind "dcm" — the capture-point placement of the walking plan: the touchdown offset predicted with the CoP on the foot's line,
      //  the foothold that brings the next start to the periodic inward offset of width W, a partial gain g; otherwise Controller A's map)
      let lw; if (C.lat.kind === "dcm") { const wl = C.lat.w ?? w, Wd = C.lat.W ?? 0.26, Tds_ = U.Tds(), E1 = Math.exp(wl * T), E2 = Math.exp(wl * Tds_), kk = (E2 - 1) / (wl * Tds_), elRt = x[1] * q.side * Math.exp(wl * Math.max(0, T - tau)), clRt = (-q.side * Wd) * kk / (E1 * E2 + 1);
        const dlRt = (E2 * elRt - clRt) / kk, dead = dlRt * q.side; lw = { dl: Wd + (C.lat.g ?? 0.6) * (dead - Wd), dead }; }
      else lw = C.models ? latWidth(U, Cc, x, tau, Math.max(C.dfMin, Math.min(C.dfMax, uStar)), T, q.dl0, null, q.ytL) : { dl: q.dl0 };
      const dl = Math.max(wLo, Math.min(wHi, lw.dl)), violL = lw.f ? Math.abs(lw.f(dl) - lw.yt) : 0;   // (the sideways target's residual once the width is within its bounds)
      const tgt = (df) => [q.pSt[0] + hd[0] * df + rt[0] * q.side * dl, q.pSt[1] + hd[1] * df + rt[1] * q.side * dl], ankF = (df) => rel(g._ankleFromCenter(tgt(df), q.yaw))[0];
      const Tair = Math.max(0.05, T - Math.max(tau, tauL)), geomOK = (df) => this.tool._feasible(o, q.sw, tgt(df), q.yaw, q.cur0, dCom, null).ok, accOK = (df) => peakAcc(ankF(df) - footF, footV, Tair) <= C.aCap;
      const rr = reachRange(U, { dfRef: uStar, geomOK, accOK }), u = rr.none ? uStar : Math.max(rr.lo, Math.min(rr.hi, uStar)), viol = rr.none ? 1 : Math.abs(u - uStar);
      return { T, orb, eps, uStar, lo: rr.lo, hi: rr.hi, none: !!rr.none, u, viol, dl, violL, cost: C.wT * (T - C.Tr) ** 2 + (C.wC ?? 1) * (T - q.Tcur) ** 2 + viol * viol + (C.wL ?? 1) * violL * violL }; };
    let best = evalT(q.Tcur);
    if ((best.viol > 1e-3 || (C.Tlat && best.violL > 1e-3)) && C.Tadapt !== false) { const t0 = Math.max(C.Tmin, tau + C.remMin); for (let T = t0; T <= C.Tmax + 1e-9; T += C.Tstep) { const e = evalT(T); if (e.cost < best.cost - 1e-9) best = e; } }
    // ((G2b unified, C.place "maps") the PLACEMENT LAYER as one joint solve on the step maps MEASURED UNDER THIS INNER LOOP (the stance orbit
    //  tracking included — the maps predict the error the ground reaction leaves): foothold, width and touchdown time toward ONE target, the
    //  orbit's next-step start x_S(vd) + I forward (the same state the double support and the stance orbit serve), Controller A's x*_l sideways,
    //  each with partial convergence from the step-start state; bounded by the physical reach range at the reference timing)
    if (C.place === "maps" && C.models) { const M = modelAtBlend(C, tau), xsF = orbN.xS, rhoF = C.rhoF ?? 0.5;
      if (q.ytF == null) q.ytF = xsF + rhoF * (x[0] - xsF); if (q.out) q.out.ytF = q.ytF;
      // (timing: chosen at the step's start within [Tmin, Tmax]; in the swing the timing is held, as Controller A's in-swing re-decision does)
      const atStart = q.liftT == null && tau < 0.02, lo = [best.lo != null ? best.lo : C.dfMin, wLo, C.TinSwing || q.Tfree ? Math.min(C.Tmax, Math.max(C.Tmin, tau + C.remMin)) : C.Tmin], hi = [best.hi != null ? best.hi : C.dfMax, wHi, C.Tmax];
      // ((overnight, opt-in C.Lref m) the GAIT the joint solve settles on: with two targets and three inputs the map solve has one free direction,
      //  resolved by the pull toward the reference step uRef — the orbit's v·(T + Tds) ≈ 0.26 m by default. The oracle placement search (the
      //  simulator as a perfect model, depth-2 lookahead) held this body for 28 steps with ≈ 0.40 m commanded steps; Lref sets that reference)
      // ((overnight, the late correction) bounds = what the swing can still deliver (q.bnd, from the measured execution model) within the static limits
      //  — the in-swing reach estimate above is not used for it (it moved by up to ±20 cm tick to tick in the walks))
      if (q.bnd) for (let i = 0; i < 2; i++) { const s0 = i === 0 ? [C.dfMin, C.dfMax] : [wLo, wHi]; lo[i] = Math.max(s0[0], q.bnd.lo[i]); hi[i] = Math.min(s0[1], q.bnd.hi[i]); if (lo[i] > hi[i]) lo[i] = hi[i] = Math.max(s0[0], Math.min(s0[1], (q.bnd.lo[i] + q.bnd.hi[i]) / 2)); }
      const uRef = q.uRef ? [Math.max(lo[0], Math.min(hi[0], q.uRef[0])), Math.max(lo[1], Math.min(hi[1], q.uRef[1])), Math.max(lo[2], Math.min(hi[2], q.Tcur))] : [Math.max(lo[0], Math.min(hi[0], C.Lref != null ? C.Lref : C.uRefSim === false ? orbN.L : best.uStar)), Math.max(wLo, Math.min(wHi, q.dl0)), Math.max(lo[2], Math.min(hi[2], q.Tcur))];
      const fixT = (C.Tadapt === false && !q.Tfree) || (!atStart && !C.TinSwing && !q.Tfree), PV = C.preview, M1 = PV ? (C.models[0] || modelAt(C, 0)) : null;
      // ((overnight, opt-in C.preview = { q1, q2, r, T: [lo, hi] }) the two-step preview solve (pc_walker solvePreview): the next step's start toward the
      //  orbit's partial target, the step after toward the orbit itself, both steps' inputs bounded (the next step's timing within the maps' data range))
      const PVlo = PV ? [lo[0], lo[1], Math.max(lo[2], (PV.T || [C.Tmin, C.Tmax])[0])] : null, PVhi = PV ? [hi[0], hi[1], Math.min(hi[2], (PV.T || [C.Tmin, C.Tmax])[1])] : null;
      const sv = PV ? solvePreview(M, M1, x, [q.ytF, q.ytL], [orbN.xS, C.lat.xStar], uRef, [orbN.L, uRef[1], C.Tr], PV.r || C.sigM || [0.05, 0.05, 0.03], PV.q1 || [0.04, 0.04], PV.q2 || [0.03, 0.03], fixT ? lo : PVlo, fixT ? hi : PVhi, fixT, C.adapt ? U.bias : null, PVlo, PVhi) : C.reg ? solveReg(M, x, [q.ytF, q.ytL], uRef, C.reg.q, C.reg.r, lo, hi, fixT, C.adapt ? U.bias : null) : solveStep(M, x, [q.ytF, q.ytL], uRef, C.sigM || [0.05, 0.05, 0.03], lo, hi, fixT, C.adapt ? U.bias : null, null);
      // (REACHABILITY at the timing the solve chose: the forward range re-evaluated at the solved T and width; if the foothold is outside it, the
      //  foothold is bounded there and the width / timing re-solved — iterated; a reach range evaluated at another timing is not a constraint)
      let svF = sv; for (let it = 0; it < 3 && C.reachIter !== false && !q.bnd; it++) { const e2 = evalT(svF.u[2]); if (e2.none || e2.lo == null) break; const dfC = Math.max(e2.lo, Math.min(e2.hi, svF.u[0])); if (Math.abs(dfC - svF.u[0]) < 1e-3) break;
        const lo2 = lo.slice(), hi2 = hi.slice(); lo2[0] = hi2[0] = dfC; svF = C.reg ? solveReg(M, x, [q.ytF, q.ytL], [dfC, uRef[1], svF.u[2]], C.reg.q, C.reg.r, lo2, hi2, fixT, C.adapt ? U.bias : null) : solveStep(M, x, [q.ytF, q.ytL], [dfC, uRef[1], svF.u[2]], C.sigM || [0.05, 0.05, 0.03], lo2, hi2, fixT, C.adapt ? U.bias : null, null); svF.info.reachClamped = true; }
      best = { ...best, u: svF.u[0], dl: svF.u[1], T: svF.u[2], mapPred: svF.info.pred, mapClamped: svF.info.clamped, reachClamped: !!svF.info.reachClamped, viol: 0 }; }
    if (lg && C.logSim) (lg.sim = lg.sim || []).push({ tau, x: x.slice(), tauL, T: best.T, orbN: { ...orbN }, E0, sole, geo, rollR, w, lat: { side: q.side, xl: x[1] } });
    if (lg) lg.dec.push({ t: o.t, tau, x, lifted, eps: best.eps, mapPred: best.mapPred, mapClamped: best.mapClamped, uStar: best.uStar, lo: best.lo, hi: best.hi, u: best.u, T: best.T, viol: best.viol, violL: best.violL, dl: best.dl, none: best.none, xiTd: best.orb.xiTd, L: best.orb.L, pred: sim(best.T), sole });
    return { df: best.u, dl: best.dl, T: best.T, info: best }; }
  // the walking double support's reference at the current time (and the CoP reference)
  // ((G2b walker, walk.dsLead) the double support's plan is evaluated AHEAD by the feedback view's age: its t0 is the contact as the 50 ms-old
  // view saw it, and on the hand-over tick the physical foot has been loading for those 50 ms (≈ 50 % of the weight) — evaluated at s = 0 the
  // plan put the CoP back on the trailing toe, the split unloaded the landed foot and it bounced off the turf (20–55 % of touchdowns))
  _walkDSxi(o, r) { const D = r.wds, w = r.wk.omega, s = Math.max(0, o.t + (r.walk.dsLead ? (this.exec.dFb || 0) : 0) - D.t0), T = D.T, d = [D.p1[0] - D.p0[0], D.p1[1] - D.p0[1]];
    const at = (x) => { const E = dexp(w * x); return [E * D.xi0[0] - D.p0[0] * (E - 1) + d[0] * x / T - d[0] * (E - 1) / (w * T), E * D.xi0[1] - D.p0[1] * (E - 1) + d[1] * x / T - d[1] * (E - 1) / (w * T)]; };
    // (beyond T — the double support extended until the trailing foot has unloaded — the reference continues with the CoP on the leading foot
    // if ξ is ahead of it; behind it, it HOLDS instead of running backward away from the new foot)
    let xi, p; if (s <= T) { xi = at(s); p = [D.p0[0] + d[0] * s / T, D.p0[1] + d[1] * s / T]; } else { const xe = at(T), ps = this._hdg(), ahead = (xe[0] - D.p1[0]) * Math.sin(ps) + (xe[1] - D.p1[1]) * Math.cos(ps);
      if (ahead > 0) { const E = dexp(w * (s - T)); xi = [D.p1[0] + (xe[0] - D.p1[0]) * E, D.p1[1] + (xe[1] - D.p1[1]) * E]; p = D.p1; } else { xi = xe; p = xe; } }
    // ACROSS the walk the double support is a planned TRANSFER (as in place, G2a): min-jerk from the touchdown capture point to the next stance's
    // inward offset — the ankle can move the CoP only a few cm sideways, so the analytic free dynamics carried every lateral touchdown error
    // into the next single support (G2b finding: 26 cm after two steps); along the walk the analytic LIPM keeps the body moving
    const ps = this._hdg(), hd = [Math.sin(ps), Math.cos(ps)], rt = [hd[1], -hd[0]], K = r.wk, nx = r.steps[r.i], sideN = nx ? (nx.sw === "R" ? 1 : -1) : 0;
    // ((G2b walker, walk.dsLatTarget) the sideways target of the double support's tracking is the MEASURED nominal inward offset of the next
    // single support (Controller A's periodic state), not the LIPM's)
    const lat0 = (D.xi0[0] - D.p1[0]) * rt[0] + (D.xi0[1] - D.p1[1]) * rt[1], latT = sideN * (r.walk.dsLatTarget != null ? r.walk.dsLatTarget : this._stepW(r.i) * K.lK / (K.E1 * K.lE2 + 1)), x = Math.min(1, s / T), sm = minjerk(x), dsm = x < 1 ? 30 * x * x * (1 - x) * (1 - x) / T : 0;
    // ((G2b speed work) with latDS "lipm" the function returned here, before the forward closed-loop options below were reached: the desired-gait
    //  forward tracking (walk.dcmRef.ds) is applied first, along the walk only — the lateral stays the analytic LIPM)
    // ((G2b unified) the double support aims at the orbit's next-step start x_S(vd) + I)
    const dsU = this._uni && r.i >= (this._uni.C.from ?? 2) && this._uni.C.ds !== false ? this._uni.orbit(o.t, this._uni.C.Tr).xS : null;
    if (r.walk.latDS === "lipm" && ((r.walk.dcmRef && r.walk.dcmRef.ds && r.i >= (r.walk.dcmRef.from ?? 2)) || dsU != null)) { const fN = (o.xi[0] - D.pC[0]) * hd[0] + (o.xi[1] - D.pC[1]) * hd[1], fT = dsU != null ? dsU : r.walk.dcmRef.xS[0] + r.walk.dcmRef.xS[1] * r.walk.dcmRef.vd, tau = Math.max(0.04, T - s), E = dexp(w * tau), kq = (E - 1) / (w * tau), pb = -K.r;
      let pf = (E * fN + pb * (1 - kq) - fT) / (E - kq); const tr = (D.pT[0] - D.pC[0]) * hd[0] + (D.pT[1] - D.pC[1]) * hd[1], ex = this.geo.box.he[2] - 0.02; pf = Math.max(Math.min(tr + ex, -ex), Math.min(ex, pf));
      r.wdsFwd = { fN, fT, pf }; const latP = (p[0] - D.pC[0]) * rt[0] + (p[1] - D.pC[1]) * rt[1], latX = (xi[0] - D.pC[0]) * rt[0] + (xi[1] - D.pC[1]) * rt[1];
      p = [D.pC[0] + hd[0] * pf + rt[0] * latP, D.pC[1] + hd[1] * pf + rt[1] * latP]; xi = [D.pC[0] + hd[0] * fN + rt[0] * latX, D.pC[1] + hd[1] * fN + rt[1] * latX]; }
    if (r.walk.latDS === "lipm") { const dot = [w * (xi[0] - p[0]), w * (xi[1] - p[1])]; return { xi, p, dot, u: Math.min(1, s / T) }; }   // (variant: the analytic lateral, for comparison)
    // (latDS "track" — ACROSS the walk the CoP is re-solved every tick from the MEASURED capture point: the CoP now, ramping linearly onto the
    // leading foot over the remaining double support τ, that brings ξ exactly to the next single support's offset latT — the LIPM boundary
    // solution p0 = (E·ξ + p_b(1 − κ) − ξ_T)/(E − κ), E = e^{ωτ}, κ = (E − 1)/(ωτ); bounded to the two feet's lateral extent (± the ankle's
    // few cm). The reference is the measured ξ itself with the rate that CoP gives, so the balance law places the CoP there. It uses the
    // body's actual sideways momentum at touchdown, which a zero-velocity transfer ignored.)
    // ((G2b, walk.fwdDS "track") ALONG the walk the double support is closed-loop as well: the CoP now (ramping onto the leading foot's
    // single-support start point p_b = stance point − r) that brings ξ to the planned next-start offset c_T (the previous plan's c_next),
    // re-solved every tick from the MEASURED ξ, clamped to the feet's extent along the walk. The analytic ramp over-predicted the double
    // support's forward travel by 4–9 cm per step (the leading foot takes the load sooner than a linear ramp), the next single support started
    // off-plan by ± 5 cm and the speed ran away (0.32 → 1.06 m/s).)
    if (r.walk.fwdDS === "freeze") { const fN = (o.xi[0] - D.pC[0]) * hd[0] + (o.xi[1] - D.pC[1]) * hd[1], ex = this.geo.box.he[2] - 0.02, pf = Math.max(-ex, Math.min(ex, fN)); r.wdsFwd = { fN, pf };
      const latP = (p[0] - D.pC[0]) * rt[0] + (p[1] - D.pC[1]) * rt[1]; p = [D.pC[0] + hd[0] * pf + rt[0] * latP, D.pC[1] + hd[1] * pf + rt[1] * latP];
      const latX = (xi[0] - D.pC[0]) * rt[0] + (xi[1] - D.pC[1]) * rt[1]; xi = [D.pC[0] + hd[0] * fN + rt[0] * latX, D.pC[1] + hd[1] * fN + rt[1] * latX]; }
    // ((G2b speed work, walk.dcmRef.ds) the same closed-loop double support, aimed at the DESIRED gait's next-step start: x_S(vd) = xS[0] + xS[1]·vd
    //  ahead of the landed foot's centre (measured on this body: the capture point at a step's start vs the walking speed) — the double support
    //  is where the CoP has the most room (trailing toe → leading toe) to brake or propel)
    const dsDcm = r.walk.dcmRef && r.walk.dcmRef.ds && r.i >= (r.walk.dcmRef.from ?? 2);
    if ((r.walk.fwdDS === "track" && D.cT) || dsDcm) { const fN = (o.xi[0] - D.pC[0]) * hd[0] + (o.xi[1] - D.pC[1]) * hd[1], fT = dsDcm ? r.walk.dcmRef.xS[0] + r.walk.dcmRef.xS[1] * r.walk.dcmRef.vd : D.cT[0] * hd[0] + D.cT[1] * hd[1], tau = Math.max(0.04, T - s), E = dexp(w * tau), kq = (E - 1) / (w * tau), pb = -K.r;
      let pf = (E * fN + pb * (1 - kq) - fT) / (E - kq); const tr = (D.pT[0] - D.pC[0]) * hd[0] + (D.pT[1] - D.pC[1]) * hd[1], ex = this.geo.box.he[2] - 0.02; pf = Math.max(Math.min(tr + ex, -ex), Math.min(ex, pf));   // (from the trailing toe — its heel is up — to the leading toe)
      r.wdsFwd = { fN, fT, pf }; const latP = (p[0] - D.pC[0]) * rt[0] + (p[1] - D.pC[1]) * rt[1]; p = [D.pC[0] + hd[0] * pf + rt[0] * latP, D.pC[1] + hd[1] * pf + rt[1] * latP];
      const latX = (xi[0] - D.pC[0]) * rt[0] + (xi[1] - D.pC[1]) * rt[1]; xi = [D.pC[0] + hd[0] * fN + rt[0] * latX, D.pC[1] + hd[1] * fN + rt[1] * latX]; }
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
  _walkDS(o, r, plan) { const q = this._walkDSxi(o, r), next = r.steps[r.i], W = this.spec.totalMass * 9.81; plan.xiRef = q.xi; plan.xiDot = q.dot; plan.comGoal = q.xi.slice(); if (r.walk.kXiDS != null) plan.kXi = r.walk.kXiDS; if (r.walk.reachExt) plan.reachExt = r.walk.reachExt;
    if (next) { if (next.share0 == null) next.share0 = Math.max(0, Math.min(1, o.feet[next.sw].load / W)); plan.unloading = { foot: next.sw, maxShare: next.share0 * (1 - minjerk(q.u)), relax: r.walk.relax === false ? null : 1 - minjerk(q.u), release: r.walk.release ?? null, axisSel: !!r.walk.releaseAxisSel, bandCap: r.walk.copBand ?? null };
      // (the heel rises because the body has PASSED over the foot: in proportion to how far the trailing leg is beyond 93 % of full extension
      // from its hip — the rise keeps the trailing knee bent instead of letting the leg lock straight behind the body)
      const hH = r.walk.preSwingHeelH ?? 0.10, Lg = this.ctrl.legs[next.sw], hip = o.states[Lg.thigh].pos, an = o.states[this.geo.foot[next.sw]].pos, ext = Math.hypot(hip[0] - an[0], hip[1] - an[1], hip[2] - an[2]) / (Lg.L1 + Lg.L2);
      const e0 = r.walk.preSwingExt0 ?? 0.93, need = Math.max(0, Math.min(1, (ext - e0) / (0.99 - e0))); r.preRise = Math.max(r.preRise || 0, need); r.trailExt = ext;   // (monotone within one double support; (G2b walker) walk.preSwingExt0 starts the rise earlier)
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
