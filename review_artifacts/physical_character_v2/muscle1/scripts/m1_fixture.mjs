// MUSCLE-1 single-axis fixture. One actuator axis at the PPR-3 standing operating point, stepped exactly like the plant does it:
//   torque(ω_end) for the step → kinematics advance → after(e) (strain arms) → plan(next inputs).
// Kinematics: the constraint-parameter angle φ (rad) relative to the operating point; anat = anat0 + s·Δφ (deg), e = −Δφ (C's strain coordinate),
// w = the axis rate at the start of the step. Modes per step: { phi } prescribed (ω_end = Δφ/dt), or { release: { load, I } }: the joint is free
// with inertia I and a constant external load torque; the implicit motor and the load are solved together for ω_end.
// Ledger (all J, absorbed BY the actuator from the fixture is positive): total = −Σ τ·Δφ; split into active (−Σ drive·Δφ), strain element,
// passive B, damping (Σ D·ω_end·Δφ), window clamp, and the implicit-Euler numerical term ½·K_tot·Δφ² per step; element stored energy, relaxation /
// slip / detachment dissipation and "created" energy come from the model's own bookkeeping; residual = total − (everything else).
const R2D = 180 / Math.PI, D2R = Math.PI / 180;
export function makeFixture(model, kit) {
  // passive B energy relative to the operating point: τ_B(φ) = τ_B0 − k_p·φ (param coordinates), so E_B(φ) − E_B(0) = −τ_B0·φ + ½·k_p·φ²
  const tauB0 = -kit.kp * (kit.anat0 - kit.slack) * D2R * kit.s, st = { phi: 0, w: 0, n: 0 }, led = { total: 0, active: 0, element: 0, passiveB: 0, damping: 0, clamp: 0, numerical: 0, kinetic: 0, load: 0 }, B0 = (phi) => -tauB0 * phi + 0.5 * kit.kp * phi * phi;
  const inp = (u, cmd) => ({ anat: kit.anat0 + kit.s * st.phi * R2D, w: st.w, kneeDeg: kit.kneeDeg0, u, cmd });
  const planWith = (u, cmd, init) => (model.id === "V2ENV" ? model.plan(inp(u), cmd) : model.plan(inp(u), init));
  return {
    st, led, B0,
    init(u, cmd) { planWith(u, cmd, true); },
    // one step: kin = { phi } (prescribed target angle at the end of the step) or { release: { load, I } }; next = { u, cmd } for the following plan
    step(kin, next) { const dt = kit.dt, r = model.row; let wEnd;
      if (kin.release) { const { load, I } = kin.release, K = model.id === "V2ENV" ? r.K : r.Ktot; wEnd = (I * st.w / dt + r.tau0 + load) / (I / dt + r.D + dt * K);
        const raw = r.tau0 - (r.D + dt * K) * wEnd; if (raw > r.hi || raw < r.lo) { const tb = raw > r.hi ? r.hi : r.lo; wEnd = st.w + dt * (tb + load) / I; } }
      else wEnd = (kin.phi - st.phi) / dt;
      const t = model.torque(wEnd), dphi = wEnd * dt, Ktot = model.id === "V2ENV" ? r.K : r.Ktot, Kmus = model.id === "V2ENV" ? 0 : r.Kmus;
      led.total += -t.tau * dphi; led.active += -t.active * dphi; led.clamp += -t.clamp * dphi; led.damping += r.D * wEnd * dphi; led.numerical += 0.5 * Ktot * dphi * dphi;
      led.element += -(t.elastic) * dphi - 0.5 * Kmus * dphi * dphi; led.passiveB += -(t.passive) * dphi - 0.5 * (Ktot - Kmus) * dphi * dphi;
      if (kin.release) { const I = kin.release.I; led.kinetic += 0.5 * I * (wEnd * wEnd - st.w * st.w); led.load += kin.release.load * dphi; }
      st.phi += dphi; st.w = wEnd; st.n++; model.after(-st.phi); planWith(next.u, next.cmd, false); return { ...t, phi: st.phi, w: wEnd }; },
    // the energy ledger closure (J): every term the fixture and model account for, and the unexplained residual
    ledger(phi0 = 0) { const Eel = model.storedElastic ? model.storedElastic() : 0, D = model.diss || { relax: 0, detach: 0, slip: 0 }, EB = B0(st.phi) - B0(phi0), cr = model.created || 0;
      const explained = led.active + led.clamp + led.damping + led.numerical + EB + Eel + D.relax + D.detach + D.slip - cr;
      return { absorbedTotal: led.total, activeAbsorbed: led.active, clampAbsorbed: led.clamp, damping: led.damping, numericalImplicit: led.numerical, passiveBStored: EB, elementStored: Eel, relaxDiss: D.relax, detachDiss: D.detach, slipDiss: D.slip,
        createdByStiffnessChange: cr, elementWorkAbsorbed: led.element, residual: led.total - explained, kinetic: led.kinetic, loadWork: led.load }; } };
}
// timing metrics of a response y (one sample per step, y[0] = the value before the change) toward a final value y1
export function timing(y, y0, y1, dt) { const d = y1 - y0, fr = (v) => (v - y0) / d, cross = (p) => { for (let i = 1; i < y.length; i++) if (fr(y[i]) >= p) { const a = fr(y[i - 1]), b = fr(y[i]); return (i - 1 + (p - a) / (b - a)) * dt; } return null; };
  const t10 = cross(0.1), t90 = cross(0.9), t2 = cross(0.02); let m1 = 0, m6 = 0, over = 0; for (let i = 1; i < y.length; i++) m1 = Math.max(m1, Math.abs(y[i] - y[i - 1]) / dt); for (let i = 6; i < y.length; i++) m6 = Math.max(m6, Math.abs(y[i] - y[i - 6]) / (6 * dt));
  for (const v of y) over = Math.max(over, fr(v) - 1);
  return { change: d, t10_90ms: t10 != null && t90 != null ? (t90 - t10) * 1000 : null, onset2ms: t2 != null ? t2 * 1000 : null, firstTickFrac: Math.abs(fr(y[1])), maxTickSlew: m1, max25msSlew: m6, overshootFrac: over }; }
export { R2D, D2R };
