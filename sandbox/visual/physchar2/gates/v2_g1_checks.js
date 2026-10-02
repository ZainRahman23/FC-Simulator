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
  sepTransMm: 5, sepRestMm: 1, hardTransDeg: 3, hardRestDeg: 0.5,
  // [brief §2] frame continuity: a joint's relative rotation per tick ≤ 2 × the engine angular-velocity cap (100 rad/s) × dt
  frameJumpDegPerTick: (hz) => 2 * 100 * (180 / Math.PI) / hz,
  chatterTogglesPer05s: 10,     // [brief §2] hard-limit on/off switching ≤ 10 per 0.5 s (no sustained > 20 Hz limit chatter)
  // [spec 1.4] contacts
  turfTransMm: 10, turfRestMm: 3, selfTransMm: 10, selfRestMm: 0.1,   // "0 at rest" read as ≤ 0.1 mm (numerical zero of a manifold depth)
  firstTouchMm: 3,              // first touch ≤ 3 mm for a 15 m/s body
  // [brief §3] standing release: at t = 0 only boot soles touch, points inside the plantar outline and on the sole plane, normal ≈ +Y
  soleOutsideMm: 2, soleAboveMm: 2, soleNormalDeg: 2,
  // [brief / spec 1.2] rest: the passive body must come to rest by the end of the run; no jitter at rest
  restKEJ: 0.1, restJitterRadS: 0.05,
  maxSpeed: 25,                 // [brief §2] no explosion: no body faster than 25 m/s
  // [spec 1.1] isolated (gravity off, no contact): linear and angular momentum constant to 1e-6 relative over 2 s
  momentumRel: 1e-6,
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
export function scenarioChecks(r, sc) {
  const C = [], iso = sc.group === "isolated", hz = r.cfg.hz, e = r.energy, j = r.joints, c = r.contacts;
  C.push(row("1.F", "finite state, no explosion", r.finite && r.maxSpeed <= TOL.maxSpeed, `finite ${r.finite}, max speed ${f(r.maxSpeed)} m/s`, `finite, ≤ ${TOL.maxSpeed} m/s`));
  if (!iso) {
    C.push(row("1.2a", "no step with net mechanical-energy increase > 0.5 J", e.maxRiseJ <= TOL.energyStepJ, `${f(e.maxRiseJ, 3)} J at t = ${f(e.maxRiseAt, 3)} s`, `≤ ${TOL.energyStepJ} J`, { v: e.maxRiseJ, L: TOL.energyStepJ }));
    C.push(row("1.2b", "energy monotonically non-increasing after first contact", e.monoViolJ <= TOL.energyMonoJ, `${f(e.monoViolJ, 3)} J above the running minimum (t = ${f(e.monoAt, 3)} s)`, `≤ ${TOL.energyMonoJ} J`, { v: e.monoViolJ, L: TOL.energyMonoJ }));
  }
  C.push(row("1.2c", "contact-free steps: no unexplained energy gain (gravity + passive torques + damping only)", e.airGainMaxJ <= TOL.airGainJ, `max gain ${f(e.airGainMaxJ, 4)} J; numerical dissipation Σ ${f(e.airLossSumJ, 2)} J`, `≤ +${TOL.airGainJ} J per step`));
  C.push(row("1.2d", iso ? "isolated: no external force (ΔP = 0 per step)" : "contact-free steps: COM acceleration = gravity (no hidden support)", r.freeFall.maxAccDev <= TOL.freeFallAcc, `${f(r.freeFall.maxAccDev, 5)} m/s² over ${r.freeFall.steps} steps`, `≤ ${TOL.freeFallAcc} m/s²`));
  C.push(row("1.3a", "joint separation (transient)", j.sepMaxMm <= TOL.sepTransMm, `${f(j.sepMaxMm)} mm (${j.sepMaxAt ? j.sepMaxAt.joint + " @ " + f(j.sepMaxAt.t, 3) + " s" : "—"})`, `≤ ${TOL.sepTransMm} mm`, { v: j.sepMaxMm, L: TOL.sepTransMm }));
  C.push(row("1.3b", "hard-limit excursion (transient)", j.hardExcMaxDeg <= TOL.hardTransDeg, `${f(j.hardExcMaxDeg)}°`, `≤ ${TOL.hardTransDeg}°`, { v: j.hardExcMaxDeg, L: TOL.hardTransDeg }));
  C.push(row("1.3e", "frame continuity: per-tick joint rotation within the physical cap (no flips / wraps)", j.frameJumpMaxDeg <= TOL.frameJumpDegPerTick(hz), `${f(j.frameJumpMaxDeg, 1)}° (${j.frameJumpAt ? j.frameJumpAt.joint : "—"})`, `≤ ${f(TOL.frameJumpDegPerTick(hz), 1)}° per tick`));
  C.push(row("1.3f", "no persistent hard-limit chatter", j.chatterMax <= TOL.chatterTogglesPer05s, `${j.chatterMax} toggles in the worst 0.5 s`, `≤ ${TOL.chatterTogglesPer05s}`));
  C.push(row("1.4c", "intended self-collision exclusions hold (disabled pairs never in contact)", c.disabledHits === 0, `${c.disabledHits} manifolds`, "0"));
  C.push(row("1.4d", "self-penetration between allowed pairs (transient)", c.selfPenMaxMm <= TOL.selfTransMm, `${f(c.selfPenMaxMm)} mm`, `≤ ${TOL.selfTransMm} mm`, { v: c.selfPenMaxMm, L: TOL.selfTransMm }));
  if (!iso) {
    C.push(row("1.3c", "joint separation at rest", j.sepRestMm <= TOL.sepRestMm, `${f(j.sepRestMm)} mm`, `≤ ${TOL.sepRestMm} mm`, { v: j.sepRestMm, L: TOL.sepRestMm }));
    C.push(row("1.3d", "hard-limit excursion at rest", j.hardExcRestDeg <= TOL.hardRestDeg, `${f(j.hardExcRestDeg)}°`, `≤ ${TOL.hardRestDeg}°`, { v: j.hardExcRestDeg, L: TOL.hardRestDeg }));
    C.push(row("1.4a", "turf penetration (transient, exact collider geometry)", c.turfPenMaxMm <= TOL.turfTransMm, `${f(c.turfPenMaxMm, 1)} mm (${c.turfPenAt ? c.turfPenAt.body + " @ " + f(c.turfPenAt.t, 3) + " s" : "—"})`, `≤ ${TOL.turfTransMm} mm`, { v: c.turfPenMaxMm, L: TOL.turfTransMm }));
    C.push(row("1.4b", "turf penetration at rest", c.turfPenRestMm <= TOL.turfRestMm, `${f(c.turfPenRestMm, 1)} mm (${c.turfPenRestBody || "—"})`, `≤ ${TOL.turfRestMm} mm`, { v: c.turfPenRestMm, L: TOL.turfRestMm }));
    C.push(row("1.4e", "self-penetration at rest (allowed pairs)", c.selfPenRestMm <= TOL.selfRestMm, `${f(c.selfPenRestMm)} mm`, `≤ ${TOL.selfRestMm} mm ("0")`, { v: c.selfPenRestMm, L: TOL.selfRestMm }));
    C.push(row("1.R", "comes to rest; no jitter at rest", r.rest.KEmax <= TOL.restKEJ && r.rest.jitterRadS <= TOL.restJitterRadS, `KE ${f(r.rest.KEmax, 3)} J, joint ω RMS ${f(r.rest.jitterRadS, 3)} rad/s (final 0.5 s)`, `≤ ${TOL.restKEJ} J, ≤ ${TOL.restJitterRadS} rad/s`));
  }
  if (c.soleCheck && !sc.rot) { const s = c.soleCheck; C.push(row("1.4f", "standing release: only boot soles touch at t = 0, inside the plantar outline, on the sole plane, normal +Y",
    s.nonBoot.length === 0 && s.maxOutsideMm <= TOL.soleOutsideMm && s.maxAboveSoleMm <= TOL.soleAboveMm && s.normalDevDeg <= TOL.soleNormalDeg,
    `${s.contacts} manifolds; non-boot ${s.nonBoot.length}; outside outline ${f(s.maxOutsideMm)} mm; above sole ${f(s.maxAboveSoleMm)} mm; normal ${f(s.normalDevDeg)}°`, `0 / ≤ ${TOL.soleOutsideMm} / ≤ ${TOL.soleAboveMm} mm / ≤ ${TOL.soleNormalDeg}°`)); }
  if (r.key === "impact15") { const ft = Math.max(...Object.values(c.ground).map(g => g.firstDepthMm ?? -99)); C.push(row("1.4g", "first touch ≤ 3 mm for a 15 m/s body (no tunnelling)", ft <= TOL.firstTouchMm, `${f(ft)} mm (deepest first-touch over all bodies)`, `≤ ${TOL.firstTouchMm} mm`, { v: ft, L: TOL.firstTouchMm })); }
  if (r.key === "isoMomentum") {
    C.push(row("1.1a", "linear momentum constant (gravity off, no contact, internal motion only)", r.momentum.dPrel <= TOL.momentumRel, `${r.momentum.dPrel.toExponential(2)} relative (|ΔP| ${r.momentum.dP.toExponential(2)} N·s of Σm|v| ${f(r.momentum.pScale)})`, `≤ ${TOL.momentumRel}`));
    C.push(row("1.1b", "angular momentum constant (about the COM)", r.momentum.dLrel <= TOL.momentumRel, `${r.momentum.dLrel.toExponential(2)} relative (|ΔL| ${r.momentum.dL.toExponential(2)} N·m·s of Σ|L_i| ${f(r.momentum.lScale)})`, `≤ ${TOL.momentumRel}`));
    C.push(row("1.1c", "no contact occurred", Object.keys(c.pairs).length === 0 && Object.keys(c.ground).length === 0, `${Object.keys(c.pairs).length} self pairs, ${Object.keys(c.ground).length} turf`, "0"));
  }
  if (r.key === "isoSelfCol") {
    const p = c.pairs, legs = Object.keys(p).filter(k => /(thigh|shank|foot)_R ↔ (thigh|shank|foot)_L|(thigh|shank|foot)_L ↔ (thigh|shank|foot)_R/.test(k) && p[k].steps > 0), arm = Object.keys(p).filter(k => /(upperArm|forearm)_R/.test(k) && /(abdomen|pelvis|thigh_R|thorax)/.test(k) && p[k].steps > 0);
    C.push(row("1.4h", "intended non-adjacent self-collisions occur (leg ↔ leg, arm ↔ trunk) and stop the limbs", legs.length > 0 && arm.length > 0 && r.selfCol && !r.selfCol.passedThrough, `legs: ${legs.join(", ") || "none"}; arm: ${arm.join(", ") || "none"}; pass-through ${r.selfCol ? r.selfCol.passedThrough : "?"}`, "≥ 1 each, no pass-through"));
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
