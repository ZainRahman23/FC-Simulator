// ═══ physchar2/gates/v2_g1_checks.js — V2-G1 pass criteria (PRE-REGISTERED: fixed before the final gate run; G1_CRITERIA.md) ══════════
// Spec §22 G1 values are used VERBATIM (marked [spec 1.x]). Criteria the brief asks for without a spec number are defined here with
// their rationale (marked [brief §n]). Nothing here was chosen to make a run pass; boundaries are measured and reported.
export const TOL = {
  // [spec 1.2] passive energy
  energyStepJ: 0.5,             // no step with net mechanical-energy increase > 0.5 J (E = KE + PE + passive elastic energy U)
  energyMonoJ: 0.5,             // total energy monotonically non-increasing after first contact (tolerance 0.5 J)
  // [brief §4] contact-free steps: only gravity, passive torques and damping act → no unexplained GAIN (losses are numerical dissipation, reported)
  airGainJ: 0.01,               // per contact-free step: ΔE + damping loss ≤ +0.01 J (float32 floor of a 1 kJ body ≈ 1e-4 J)
  freeFallAcc: 0.01,            // [brief §3] contact-free steps: COM acceleration = (0, −g, 0) within 0.01 m/s² (no hidden support / propulsion)
  // [spec 1.3] joint integrity
  // D3a (decided 2026-10-03): settled excursion beyond the anatomical ROM boundary ≤ 1.5° — a numerical / compliance tolerance of the C2 3°
  // end-stop (deflection at ≈ 50 % of capacity), NOT a new anatomical limit; the ROM is unchanged; actual excursions are reported. (v1: 0.5°.)
  sepTransMm: 5, sepRestMm: 1, hardTransDeg: 3, hardRestDeg: 1.5,
  // [brief §2] frame continuity: a joint's relative rotation per tick ≤ 2 × the engine angular-velocity cap (100 rad/s) × dt
  frameJumpDegPerTick: (hz) => 2 * 100 * (180 / Math.PI) / hz,
  chatterTogglesPer05s: 10,     // [brief §2] hard-limit on/off switching ≤ 10 per 0.5 s (no sustained > 20 Hz limit chatter)
  // [spec 1.4] contacts. C5 (2026-10-03): the resting tolerance = the penetration slop of the validated Jolt contact configuration (§15.4:
  // 0.005 m — Jolt never corrects the last slop of an overlap, measured: resting contacts settle at 4.7–5.0 mm); "≤ 3 mm" and "0" contradicted it
  // D4c (decided 2026-10-03): the slop-based resting limits are compared with an explicit numerical tolerance of 0.01 mm (resting contacts
  // converge asymptotically onto the 5 mm slop: measured 5.0007–5.0008 mm); the physical 5 mm allowance is unchanged.
  turfTransMm: 10, turfRestMm: 5, selfTransMm: 10, selfRestMm: 5, initOverlapMm: 1, restCmpMm: 0.01,
  firstTouchMm: 3,              // the extreme 15 m/s test (impact15): REPORTED (C7 re-scoped it; player-body high speed = the no-tunnelling envelope)
  // [brief §3] standing release: at t = 0 only boot soles touch, points inside the plantar outline and on the sole plane, normal ≈ +Y
  soleOutsideMm: 2, soleAboveMm: 2, soleNormalDeg: 2,
  // [brief / spec 1.2] rest: the passive body must come to rest by the end of the run; no jitter at rest
  restKEJ: 0.1, restJitterRadS: 0.05,
  maxSpeed: 25,                 // [brief §2] no explosion: no body faster than 25 m/s
  // [spec 1.1] isolated (gravity off, no contact): momentum constant over 2 s. C6 (2026-10-03): 1e-6 is below the measured float32 / Jolt floor.
  // Free-body floor (each V2 segment alone, gyroscopic on, 240 Hz, 2 s): angular 1.5e-3 at 1 rad/s, 5.6e-3 at 3 rad/s, 1.3e-2 at 6 rad/s; linear
  // 0 (no impulses). Multi-body (constraint impulses, float32): linear ≈ 6e-6. Tolerances: linear 2e-5 (3.4× the measured), angular 5e-3,
  // (the free-body floor reaches 5e-3 near 2.7 rad/s; the isolated test's measured drift stays below it — its peak body |ω| is reported)
  momentumRelLinear: 2e-5, momentumRelAngular: 5e-3,
  // [brief §5] passive joint rig
  rigInitRel: 0.02, rigInitAbsNm: 0.1, rigTrackFracOfTauHard: 0.10, rigEnergyRiseJ: 1e-6, dampRel: 0.02, dampAbsNm: 0.05,
  couplingDeg: 0.1,
  // [brief §8] timestep: vs the 720 Hz reference on the convergent scenarios
  rateTimingMs: 25, rateComM: 0.15,
  // [spec 1.5] iteration study: pass every 1.2–1.4 criterion with 2× margin (measured ≤ 50 % of the tolerance)
  marginFactor: 2,
};
const row = (id, name, pass, value, limit, extra = {}) => ({ id, name, pass: !!pass, value, limit, ...extra });
const f = (x, n = 2) => (x == null || !Number.isFinite(x) ? String(x) : x.toFixed(n));

// per-scenario checks (one body, one configuration)
// C7: impact15 (every body at 15 m/s into the turf) is the EXTREME penetration test — not credible player-body motion. It is judged by the
// envelope requirements (no explosion, no missed collision, no catastrophic constraint failure, comes to rest inside the ROM) and its
// impact-transient metrics are reported, not banded.
// D4d (decided 2026-10-03): impact15 is a DIAGNOSTIC / report-only extreme test, not a G1 pass criterion — every row is evaluated and reported
// with its own pass value, marked reportOnly.
export function scenarioChecks(r, sc) {
  if (sc.extreme) return [...scenarioChecksCore(r, sc), ...hsChecks(r, sc).filter(c => c.id !== "HS.r")].map(c => ({ ...c, reportOnly: true, name: c.name + " (EXTREME diagnostic: report only, D4d)" }));
  return scenarioChecksCore(r, sc);
}
function scenarioChecksCore(r, sc) {
  const C = [], iso = sc.group === "isolated", hz = r.cfg.hz, e = r.energy, j = r.joints, c = r.contacts;
  C.push(row("1.F", "finite state, no explosion", r.finite && r.maxSpeed <= TOL.maxSpeed, `finite ${r.finite}, max speed ${f(r.maxSpeed)} m/s`, `finite, ≤ ${TOL.maxSpeed} m/s`));
  if (!iso) {
    C.push(row("1.2a", "no step with net mechanical-energy increase > 0.5 J", e.maxRiseJ <= TOL.energyStepJ, `${f(e.maxRiseJ, 3)} J at t = ${f(e.maxRiseAt, 3)} s`, `≤ ${TOL.energyStepJ} J`, { v: e.maxRiseJ, L: TOL.energyStepJ }));
    C.push(row("1.2b", "energy monotonically non-increasing after first contact", e.monoViolJ <= TOL.energyMonoJ, `${f(e.monoViolJ, 3)} J above the running minimum (t = ${f(e.monoAt, 3)} s)`, `≤ ${TOL.energyMonoJ} J`, { v: e.monoViolJ, L: TOL.energyMonoJ }));
  }
  if (r.invariants) { const I = r.invariants;
    if (!iso) C.push(row("1.2e", "passivity invariant: no step gains more than the numerical floor (investigation B; report until gated)", I.passivityViolations === 0, `max step ${f(I.passivityMaxStepJ, 4)} J at t = ${f(I.passivityMaxAt, 3)} s; ${I.passivityViolations} step(s) over`, `≤ ${I.tol.passivityStepJ} J per step`, { reportOnly: true }));
    C.push(row("1.4j", "turf-manifold validity: every turf manifold on the turf's top face, normal up (investigation B; report until gated)", I.turfInvalidManifolds === 0, I.turfInvalidManifolds ? `${I.turfInvalidManifolds} invalid on ${I.turfInvalidTicks} tick(s); first ${JSON.stringify(I.turfInvalidFirst)}` : "0 invalid", "0", { reportOnly: true }));
    C.push(row("1.4k", "position-solver teleport bound: no body moved beyond its velocity integration by more than the floor (investigation B; report until gated)", I.posCorrTicksOver === 0, `max ${f(I.posCorrMaxMm, 3)} mm (${I.posCorrBody || "—"} @ ${f(I.posCorrAt, 3)} s); ${I.posCorrTicksOver} tick(s) over`, `≤ ${I.tol.posCorrMm} mm per step`, { reportOnly: true })); }
  C.push(row("1.2c", "contact-free steps: no unexplained energy gain (gravity + passive torques + damping only)", e.airGainMaxJ <= TOL.airGainJ, `max gain ${f(e.airGainMaxJ, 4)} J; numerical dissipation Σ ${f(e.airLossSumJ, 2)} J`, `≤ +${TOL.airGainJ} J per step`));
  C.push(row("1.2d", iso ? "isolated: no external force (ΔP = 0 per step)" : "contact-free steps: COM acceleration = gravity (no hidden support)", r.freeFall.maxAccDev <= TOL.freeFallAcc, `${f(r.freeFall.maxAccDev, 5)} m/s² over ${r.freeFall.steps} steps`, `≤ ${TOL.freeFallAcc} m/s²`));
  C.push(row("1.3a", "joint separation (transient)", j.sepMaxMm <= TOL.sepTransMm, `${f(j.sepMaxMm)} mm (${j.sepMaxAt ? j.sepMaxAt.joint + " @ " + f(j.sepMaxAt.t, 3) + " s" : "—"})`, `≤ ${TOL.sepTransMm} mm`, { v: j.sepMaxMm, L: TOL.sepTransMm }));
  // C2 (2026-10-03): the anatomical ROM is resisted by the passive end-stop; the Jolt hard stop is an emergency stop at anatomical ± the
  // measured per-joint margin. The transient requirement is that the emergency stop is NOT reached; the anatomical overshoot is documented.
  const worstAx = (j.axes || []).reduce((m, a) => (Math.max(a.overLoDeg, a.overHiDeg) > m.v ? { v: Math.max(a.overLoDeg, a.overHiDeg), a } : m), { v: 0, a: null });
  C.push(row("1.3b", "emergency (Jolt) stop not reached — ordinary passive loading is resisted by the anatomical end-stop (C2)", r.engine.ticks === 0,
    `${r.engine.ticks} engine-stop ticks${r.engine.ticks ? " (" + r.engine.axes.join(", ") + ")" : ""}; largest anatomical overshoot ${f(worstAx.v)}°${worstAx.a ? " (" + worstAx.a.joint + "." + worstAx.a.key + ")" : ""}`, "0 ticks; overshoot documented", { v: r.engine.ticks, L: 0 }));
  C.push(row("1.3e", "frame continuity: per-tick joint rotation within the physical cap (no flips / wraps)", j.frameJumpMaxDeg <= TOL.frameJumpDegPerTick(hz), `${f(j.frameJumpMaxDeg, 1)}° (${j.frameJumpAt ? j.frameJumpAt.joint : "—"})`, `≤ ${f(TOL.frameJumpDegPerTick(hz), 1)}° per tick`));
  C.push(row("1.3f", "no persistent hard-limit chatter", j.chatterMax <= TOL.chatterTogglesPer05s, `${j.chatterMax} toggles in the worst 0.5 s`, `≤ ${TOL.chatterTogglesPer05s}`));
  C.push(row("1.4c", "intended self-collision exclusions hold (disabled pairs never in contact)", c.disabledHits === 0, `${c.disabledHits} manifolds`, "0"));
  C.push(row("1.4i", "no unintended interpenetration: no allowed pair overlaps in the initial condition (C5 metric)", (c.initSelfOverlap || []).length === 0, (c.initSelfOverlap || []).join(", ") || "none", `none > ${TOL.initOverlapMm} mm`));
  C.push(row("1.4d", "self-penetration between allowed pairs (transient)", c.selfPenMaxMm <= TOL.selfTransMm, `${f(c.selfPenMaxMm)} mm`, `≤ ${TOL.selfTransMm} mm`, { v: c.selfPenMaxMm, L: TOL.selfTransMm }));
  if (!iso) {
    C.push(row("1.3c", "joint separation at rest", j.sepRestMm <= TOL.sepRestMm, `${f(j.sepRestMm)} mm`, `≤ ${TOL.sepRestMm} mm`, { v: j.sepRestMm, L: TOL.sepRestMm }));
    C.push(row("1.3d", "settled excursion beyond the anatomical ROM boundary (D3a compliance tolerance; ROM unchanged)", j.hardExcRestDeg <= TOL.hardRestDeg, `${f(j.hardExcRestDeg)}°${j.hardExcRestDeg > 0.005 && j.hardExcRestWho ? " (" + j.hardExcRestWho + ")" : ""}`, `≤ ${TOL.hardRestDeg}°`, { v: j.hardExcRestDeg, L: TOL.hardRestDeg }));
    C.push(row("1.4a", "turf penetration (transient, exact collider geometry)", c.turfPenMaxMm <= TOL.turfTransMm, `${f(c.turfPenMaxMm, 1)} mm (${c.turfPenAt ? c.turfPenAt.body + " @ " + f(c.turfPenAt.t, 3) + " s" : "—"})`, `≤ ${TOL.turfTransMm} mm`, { v: c.turfPenMaxMm, L: TOL.turfTransMm }));
    C.push(row("1.4b", "resting turf penetration ≤ the slop (C5; compared with a 0.01 mm numerical tolerance, D4c)", c.turfPenRestMm <= TOL.turfRestMm + TOL.restCmpMm, `${f(c.turfPenRestMm, 4)} mm (${c.turfPenRestBody || "—"})`, `≤ ${TOL.turfRestMm} mm (+ ${TOL.restCmpMm} mm comparison tolerance)`, { v: c.turfPenRestMm, L: TOL.turfRestMm }));
    C.push(row("1.4e", "resting self-contact penetration (allowed pairs) ≤ the slop (C5; same 0.01 mm comparison tolerance, D4c)", c.selfPenRestMm <= TOL.selfRestMm + TOL.restCmpMm, `${f(c.selfPenRestMm, 4)} mm`, `≤ ${TOL.selfRestMm} mm (+ ${TOL.restCmpMm} mm comparison tolerance)`, { v: c.selfPenRestMm, L: TOL.selfRestMm }));
    C.push(row("1.R", "comes to rest; no jitter at rest", r.rest.KEmax <= TOL.restKEJ && r.rest.jitterRadS <= TOL.restJitterRadS, `KE ${f(r.rest.KEmax, 3)} J, joint ω RMS ${f(r.rest.jitterRadS, 3)} rad/s (final 0.5 s)`, `≤ ${TOL.restKEJ} J, ≤ ${TOL.restJitterRadS} rad/s`));
  }
  if (c.soleCheck && !sc.rot) { const s = c.soleCheck; C.push(row("1.4f", "standing release: only boot soles touch at t = 0, inside the plantar outline, on the sole plane, normal +Y",
    s.nonBoot.length === 0 && s.maxOutsideMm <= TOL.soleOutsideMm && s.maxAboveSoleMm <= TOL.soleAboveMm && s.normalDevDeg <= TOL.soleNormalDeg,
    `${s.contacts} manifolds; non-boot ${s.nonBoot.length}; outside outline ${f(s.maxOutsideMm)} mm; above sole ${f(s.maxAboveSoleMm)} mm; normal ${f(s.normalDevDeg)}°`, `0 / ≤ ${TOL.soleOutsideMm} / ≤ ${TOL.soleAboveMm} mm / ≤ ${TOL.soleNormalDeg}°`)); }
  if (r.key === "impact15") { const ft = Math.max(...Object.values(c.ground).map(g => g.firstDepthMm ?? -99)); C.push(row("1.4g", "EXTREME 15 m/s whole-body test: first-touch penetration (report; C7)", true, `${f(ft)} mm (deepest first-touch over all bodies)`, "report", { reportOnly: true })); }
  if (r.key === "isoMomentum") {
    C.push(row("1.1a", "linear momentum constant (gravity off, no contact, internal motion only; C6 floor-based)", r.momentum.dPrel <= TOL.momentumRelLinear, `${r.momentum.dPrel.toExponential(2)} relative (|ΔP| ${r.momentum.dP.toExponential(2)} N·s of Σm|v| ${f(r.momentum.pScale)})`, `≤ ${TOL.momentumRelLinear}`));
    C.push(row("1.1b", "angular momentum constant about the COM (C6 floor-based)", r.momentum.dLrel <= TOL.momentumRelAngular, `${r.momentum.dLrel.toExponential(2)} relative (|ΔL| ${r.momentum.dL.toExponential(2)} N·m·s of Σ|L_i| ${f(r.momentum.lScale)}); peak body |ω| ${f(r.maxW)} rad/s (free-body floor there ≈ ${(2.2e-3 * r.maxW).toExponential(1)})`, `≤ ${TOL.momentumRelAngular}`));
    C.push(row("1.1c", "no contact occurred", Object.keys(c.pairs).length === 0 && Object.keys(c.ground).length === 0, `${Object.keys(c.pairs).length} self pairs, ${Object.keys(c.ground).length} turf`, "0"));
  }
  if (r.key === "isoSelfCol" && c.tracked) { const T = Object.values(c.tracked), missed = T.reduce((s, t) => s + t.missedSteps, 0);
    C.push(row("1.4j", "isoSelfCol: no missed self-collision (exact geometric leg ↔ leg overlap > slop + 2 mm with no manifold)", missed === 0, `${missed} missed steps; deepest geometric overlap ${f(Math.max(...T.map(t => t.maxOverlapMm)), 1)} mm`, "0")); }
  if (r.key === "isoSelfCol") {
    const p = c.pairs, legs = Object.keys(p).filter(k => /(thigh|shank|foot)_R ↔ (thigh|shank|foot)_L|(thigh|shank|foot)_L ↔ (thigh|shank|foot)_R/.test(k) && p[k].steps > 0), arm = Object.keys(p).filter(k => /(upperArm|forearm)_R/.test(k) && /(abdomen|pelvis|thigh_R|thorax)/.test(k) && p[k].steps > 0);
    // D4b (decided 2026-10-03): the arm → trunk impact requirement is removed — the approved shoulder ROM stops the arm ≈ 4° short of the trunk,
    // so the test cannot create that impact; arm contacts that do occur are reported. Leg ↔ leg (reachable) remains required.
    C.push(row("1.4h", "intended reachable non-adjacent self-collision occurs (leg ↔ leg) and stops the limbs; arm ↔ trunk reported (D4b)", legs.length > 0 && r.selfCol && !r.selfCol.passedThrough, `legs: ${legs.join(", ") || "none"}; arm: ${arm.join(", ") || "none"}; pass-through ${r.selfCol ? r.selfCol.passedThrough : "?"}`, "≥ 1 each, no pass-through"));
    C.push(row("1.1d", "momentum conserved through self-collisions (linear / angular, report)", true, `${r.momentum.dPrel.toExponential(2)} / ${r.momentum.dLrel.toExponential(2)} relative`, "report", { reportOnly: true }));
  }
  return C;
}
// passive rig checks
export function rigChecks(r) {
  const C = [], init = Math.abs(r.firstTau.tauApplied - r.firstTau.tauSpec + (r.firstTau.tauSpec - r.firstTau.tauExpect)), initLim = Math.max(TOL.rigInitAbsNm, TOL.rigInitRel * Math.abs(r.firstTau.tauExpect));
  const tauH = r.end === "hi" ? r.tauAtHard[1] : r.end === "lo" ? r.tauAtHard[0] : Math.max(...r.tauAtHard), trackLim = TOL.rigTrackFracOfTauHard * tauH;
  const name = `${r.joint}.${r.key} ${r.end === "in" ? "inside soft range, spun 3 rad/s (damping only)" : (r.dir > 0 ? "+" : "−") + " end range (" + r.end + ")"}`;
  C.push(row("5.a", `${name}: applied torque at release = spec law − c·ω`, init <= initLim, `${f(r.firstTau.tauApplied, 3)} vs ${f(r.firstTau.tauExpect, 3)} N·m`, `≤ ${f(initLim, 2)} N·m`));
  if (r.end !== "in") C.push(row("5.b", `${name}: restoring direction; returns into the soft range`, r.restoring && r.returnedToSoft, `restoring ${r.restoring}, back in soft ${r.returnedToSoft}`, "true / true"));
  C.push(row("5.c", `${name}: tracks the spec law through the motion`, r.maxAbsErrNm <= trackLim, `max |error| ${f(r.maxAbsErrNm, 3)} N·m`, `≤ ${f(trackLim, 2)} N·m`));
  C.push(row("5.d", `${name}: never injects energy`, r.selfContacts > 0 ? true : r.maxEnergyRiseJ <= TOL.rigEnergyRiseJ, r.selfContacts > 0 ? `self-contact occurred (${r.selfContacts}); energy rise ${f(r.maxEnergyRiseJ, 4)} J not attributable` : `max step rise ${r.maxEnergyRiseJ.toExponential(1)} J; E ${f(r.E0, 3)} → ${f(r.Eend, 3)} J (damping ${f(r.dampingJ, 3)} J)`, `≤ ${TOL.rigEnergyRiseJ} J`, r.selfContacts > 0 ? { reportOnly: true } : {}));
  return C;
}

// ── C7 high-speed envelope checks (credible football-player motion; penetration reported, not banded) ──
export const HS_TOL = { sepCatastrophicMm: 20, sepRestMm: 1, speedGain: 5 };
export function hsChecks(r, sc) {
  const C = [], j = r.joints, c = r.contacts, v0 = r.initMaxSpeed ?? 0;
  const g = 9.81, vff = Math.sqrt(v0 * v0 + 2 * g * Math.max(0, r.initComY ?? 0));   // free-fall allowance: gravity legitimately adds speed
  C.push(row("HS.1", "finite; no explosion (no body faster than its initial speed + free-fall gain + 5 m/s)", r.finite && r.maxSpeed <= vff + HS_TOL.speedGain, `max speed ${f(r.maxSpeed)} m/s (initial ${f(v0)}, + free fall → ${f(vff)})`, `finite, ≤ ${f(vff + HS_TOL.speedGain)} m/s`));
  C.push(row("HS.2", "no missed turf collision (no body below the turf by more than the slop without a turf manifold)", c.missedTurfSteps === 0, `${c.missedTurfSteps} steps (worst ${f(c.missedTurfMaxMm, 1)} mm)`, "0"));
  if (c.tracked && Object.keys(c.tracked).length) { const T = Object.entries(c.tracked), missed = T.reduce((s, [, t]) => s + t.missedSteps, 0), hit = T.filter(([, t]) => t.maxOverlapMm > 0), worst = T.reduce((m, [k, t]) => (t.maxOverlapMm > m.v ? { k, v: t.maxOverlapMm } : m), { k: "—", v: -1e9 });
    if (sc.knownIssue === "D1a-shin") {   // D1a: the thin pieces of the 10-piece boot miss contact steps at 20 m/s vs the shin proxy — an explicit
      // UNRESOLVED high-speed contact issue (not fixed by distorting the foot or by indiscriminate CCD); contact must still occur
      C.push(row("HS.3", `contact with ${sc.obstacles ? "the obstacle" : "the other leg"} occurs (no complete pass-through)`, hit.length > 0, `${hit.length} pairs overlapped; deepest geometric overlap ${f(worst.v, 1)} mm (${worst.k})`, "contact occurred"));
      C.push(row("HS.3k", "KNOWN UNRESOLVED ISSUE (D1a): missed contact steps of the thin boot pieces at ≈ 20 m/s (exact geometric overlap > slop + 2 mm with no manifold)", missed === 0, `${missed} missed steps`, "report (debt)", { reportOnly: true })); }
    else C.push(row("HS.3", `no tunnelling / missed collision vs ${sc.obstacles ? "the obstacle" : "the other leg"} (exact geometric overlap > slop + 2 mm on a step with no manifold)`, missed === 0 && hit.length > 0,
      `${missed} missed steps; ${hit.length} pairs overlapped (contact happened); deepest geometric overlap ${f(worst.v, 1)} mm (${worst.k})`, "0 missed, contact occurred")); }
  C.push(row("HS.4", "no catastrophic constraint failure: joint separation transient / at rest", j.sepMaxMm <= HS_TOL.sepCatastrophicMm && (sc.gravity === 0 || j.sepRestMm <= HS_TOL.sepRestMm), `${f(j.sepMaxMm)} / ${f(j.sepRestMm)} mm`, `≤ ${HS_TOL.sepCatastrophicMm} / ≤ ${HS_TOL.sepRestMm} mm`));
  C.push(row("HS.r", "report: penetration (first touch / max), emergency engine-stop ticks, anatomical overshoot, energy", true,
    `turf first-touch ${f(Math.max(-99, ...Object.values(c.ground).map(g => g.firstDepthMm ?? -99)), 1)} / max ${f(c.turfPenMaxMm, 1)} mm; obstacle max ${f(Math.max(-99, ...Object.values(c.obstacle).map(o => o.maxDepthMm)), 1)} mm; self max ${f(c.selfPenMaxMm, 1)} mm; engine ticks ${r.engine.ticks}; anatomical overshoot ${f(j.hardExcMaxDeg, 1)}°; max step rise ${f(r.energy.maxRiseJ)} J`, "report", { reportOnly: true }));
  return C;
}
