// ═══ physchar/pc_gait.js — G1a: SUPPORT / GAIT STATE (L3) — actual contact is truth ═══════════════════════════════════════════════════
// LOCOMOTION_ARCHITECTURE_FINAL.md §5. Updated every physics-rate control step from the UNDELAYED sensed state (it is bookkeeping of what
// physically happened, not a reaction: the controllers that react read their own delayed views). It never schedules support:
//   support mode  DOUBLE · SINGLE_L · SINGLE_R · FLIGHT · NON_FOOT — derived from touching / loaded feet and non-foot turf contact
//   foot role     STANCE · UNLOADING · SWING · DESCENDING · LOADING (+ OBSTRUCTED, AIR_UNPLANNED) — the executor's INTENT, overridden by truth:
//                 a turf contact of a foot the plan still has in the air is a TOUCHDOWN now (early / late vs the plan is recorded); a non-turf
//                 contact on the swing foot or shank is an OBSTRUCTION now; a stance foot that leaves the turf is AIR_UNPLANNED now
//   phase φ       stride phase (of_loco convention: RIGHT touchdown 0, LEFT touchdown 0.5). Between events it follows the executor's own
//                 progress measure (swing u, double-support progress); at every ACTUAL touchdown it is re-synchronised to that foot's phase —
//                 it never continues a planned / reference phase the body has not followed.
export const GAIT = { touchLoad: 25, warmupSteps: 12 };

export class GaitState {
  constructor(spec) { const bi = (n) => spec.bodies.findIndex(b => b.name === n);
    this.body = { L: { foot: bi("foot_L"), shin: bi("shin_L") }, R: { foot: bi("foot_R"), shin: bi("shin_R") } };
    this.role = { L: "STANCE", R: "STANCE" }; this.support = "DOUBLE"; this.phase = 0.25; this.events = []; this.stepEvents = []; this.touch = { L: true, R: true }; this.obst = { L: null, R: null }; this.tdLatch = { L: false, R: false }; }
  ev(t, kind, what, x) { if (this.quiet) return null; const e = { t, kind, what, ...(x || {}) }; this.events.push(e); this.stepEvents.push(e); return e; }
  // truth: the undelayed observation; intent: { sw, stage, plannedTd: { t, center }, u, dsU, phase0 } from the step executor (or null)
  update(truth, intent) {
    this.stepEvents = []; const t = truth.t, F = truth.feet; this.quiet = truth.n <= GAIT.warmupSteps;   // (the sensor's first observations only establish contact)
    // non-turf contacts on each leg's foot / shank (another character: index ≤ −1000; an obstacle: −2 − k) — in THIS character's own view
    const ext = { L: [], R: [] }; for (const c of truth.contacts || []) for (const s of ["L", "R"]) { const own = [this.body[s].foot, this.body[s].shin];
      if ((own.includes(c.a) && c.b < -1) || (own.includes(c.b) && c.a < -1)) ext[s].push(c); }
    // a turf contact the foot cannot stand on (the vertical face / edge of raised turf — pc_sense edgeContact) is an obstruction too
    for (const s of ["L", "R"]) if (F[s].edgeContact) ext[s].push({ edge: true });
    const nf = truth.nonFootGround, tl = (s) => F[s].touching;
    this.support = nf ? "NON_FOOT" : tl("L") && tl("R") ? "DOUBLE" : tl("L") ? "SINGLE_L" : tl("R") ? "SINGLE_R" : "FLIGHT";
    for (const s of ["L", "R"]) { const was = this.touch[s], now = tl(s); let role;
      if (intent && intent.sw === s && intent.stage) role = { UNLOADING: "UNLOADING", SWING: "SWING", DESCEND: "DESCENDING", DESCENDING: "DESCENDING", OBSTRUCTED: "OBSTRUCTED", ACCEPT: "LOADING", LOADING: "LOADING" }[intent.stage] || "STANCE";
      else role = now ? "STANCE" : "AIR_UNPLANNED";
      // TRUTH OVERRIDES INTENT
      if ((role === "SWING" || role === "DESCENDING" || role === "OBSTRUCTED") && intent && intent.armed && now && !was) { role = "LOADING";
        const pl = intent.plannedTd, dT = pl ? t - pl.t : null, dP = pl && pl.center ? Math.hypot(intent.center[0] - pl.center[0], intent.center[1] - pl.center[1]) : null;
        this.ev(t, "TOUCHDOWN", `${s} touched down at u ${intent.u != null ? intent.u.toFixed(2) : "?"}${dT != null ? ` · ${dT < 0 ? "EARLY" : "late"} by ${Math.abs(dT * 1000).toFixed(0)} ms vs the plan` : ""}${dP != null ? ` · ${(dP * 100).toFixed(1)} cm from the planned foothold` : ""}`, { foot: s, u: intent.u, dT, dP, early: dT != null && dT < -0.02, phaseBefore: this.phase });
        this.phase = s === "R" ? 0 : 0.5; this.lastTd = { t, foot: s }; this.tdLatch[s] = true; }
      // the actual touchdown STAYS authoritative: while the foot remains on the turf the plan's in-air role is not restored (until the executor
      // itself moves to acceptance, or a new intent for this foot begins)
      if (this.tdLatch[s]) { if (!now || !intent || intent.sw !== s || intent.stage === "ACCEPT" || intent.stage === "LOADING") this.tdLatch[s] = false; else if (role === "SWING" || role === "DESCENDING" || role === "OBSTRUCTED" || role === "UNLOADING") role = "LOADING"; }
      if (role !== "STANCE" && role !== "AIR_UNPLANNED" && role !== "LOADING" && ext[s].length && !this.obst[s]) { this.obst[s] = { t, n: ext[s].length }; const edge = ext[s].some(c => c.edge);
        this.ev(t, "OBSTRUCTION", edge ? `${s} foot struck a turf edge it cannot stand on (contact normal outside the friction cone)` : `${s} swing leg touched a non-turf body (${ext[s].length} manifold${ext[s].length > 1 ? "s" : ""})`, { foot: s, edge }); }
      // an obstruction stays latched for the rest of that swing (a flickering contact is ONE obstruction, first contact time kept)
      if (!ext[s].length && (role === "STANCE" || role === "LOADING" || role === "AIR_UNPLANNED" || !intent || intent.sw !== s)) this.obst[s] = null;
      if (this.obst[s] && (role === "SWING" || role === "DESCENDING")) role = "OBSTRUCTED";
      if (role === "AIR_UNPLANNED" && this.role[s] !== "AIR_UNPLANNED") this.ev(t, "UNPLANNED_LIFT", `${s} left the turf without a planned step`, { foot: s });
      if (role === "STANCE" && this.role[s] === "AIR_UNPLANNED") this.ev(t, "RECONTACT", `${s} back on the turf`, { foot: s });
      if (was && !now && role === "SWING") this.ev(t, "LIFTOFF", `${s} left the turf`, { foot: s });
      // a foot the plan is still UNLOADING that leaves the turf: if its step has started, this IS the liftoff (sensed now; the executor's
      // delayed view confirms it later) — the role becomes SWING; in double support before the step, it is an EARLY lift
      if (was && !now && role === "UNLOADING") { if (intent.liftExpected) { role = "SWING"; this.ev(t, "LIFTOFF", `${s} left the turf (sensed before the executor's delayed view confirms it)`, { foot: s }); }
        else this.ev(t, "EARLY_LIFT", intent.src === "transfer" ? `${s} left the turf while being unloaded (transfer only — no step planned)` : `${s} left the turf while still being unloaded in double support (before its step began)`, { foot: s }); }
      if (was && !now && role === "LOADING" && intent.src === "transfer") this.ev(t, "EARLY_LIFT", `${s} left the turf while being re-loaded (transfer back)`, { foot: s });
      if (!was && now && role === "LOADING" && intent.src === "transfer") this.ev(t, "RECONTACT", `${s} back on the turf (re-loading after the transfer)`, { foot: s });
      if (role === "UNLOADING" && intent.liftExpected && !now && this.role[s] === "SWING") role = "SWING";
      if (!was && now && role === "UNLOADING") this.ev(t, "RECONTACT", `${s} back on the turf (still being unloaded)`, { foot: s });
      this.role[s] = role; this.touch[s] = now; }
    // phase between events: the executor's progress (swing u → half a cycle per step); double support holds the phase at the touchdown value
    if (intent && intent.phaseAt != null && this.role[intent.sw] !== "LOADING") this.phase = intent.phaseAt;
    return { support: this.support, role: { ...this.role }, phase: this.phase, events: this.stepEvents.slice(), ext: { L: ext.L.length, R: ext.R.length } }; }
}
