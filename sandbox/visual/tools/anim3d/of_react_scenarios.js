// TACKLED-PLAYER V1 — review / validation fixtures built from the contact-matrix geometry (of_react_matrix.js): a runner without the ball at
// speed v and stride phase ph, a defender running on a line at the slide angle, a slide requested at a fixed tick timed to reach him.
// Nothing about the outcome is scripted — only where and when the two players are. Characters: the runner Vinícius (73 kg, recorded),
// the tackler Gabriel (78 kg) unless a case names others.
const PT_DT = 1 / 60, LEG = 0.865, SL = { vMin: 4.2, vMax: 7.5, vAdd: 1.0, windT: 0.10, decel: 5.5 };
function rxCase(K) {
  const Tc = 0.95, tReq = 0.5, th = K.ang * Math.PI / 180, fx = Math.cos(th), fy = Math.sin(th), u = K.u != null ? K.u : 5;
  const Ax = 50, Ay = 34, AT = [Ax + K.v * Tc, Ay], v0 = Math.max(SL.vMin, Math.min(SL.vMax, u + SL.vAdd)), tau = Tc - tReq - SL.windT;
  const sTau = v0 * tau - 0.5 * SL.decel * tau * tau, reachC = 0.8 * LEG;
  const back = reachC + sTau + u * SL.windT + (K.short || 0), Preq = [AT[0] - fx * back - fy * K.off, AT[1] - fy * back + fx * K.off], P0 = [Preq[0] - fx * u * tReq, Preq[1] - fy * u * tReq];
  return { ticks: K.ticks || 260, drill: { defending: true, center: [55, 34], owner: null, active: 1, autoSwitch: false, ball: K.ballAhead ? { x: AT[0] + 6, y: Ay } : { x: AT[0], y: Ay + 5 }, players: [
    { name: "A", team: 0, x: Ax, y: Ay, vx: K.v, vy: 0, facing: 0, gaitPhase: K.ph, char: K.achar || "vinicius", ai: { mode: "SCRIPT", path: [{ t: 0, x: 200, y: Ay, v: K.v }] } },
    { name: "D", team: 1, x: P0[0], y: P0[1], vx: fx * u, vy: fy * u, facing: th, char: K.dchar || "gabriel", ai: { mode: "SCRIPT", path: [{ t: 0, x: P0[0] + fx * 100, y: P0[1] + fy * 100, v: u }] } }] },
    cmds: [{ at: 0, do: "humanAi" }, { at: Math.round(tReq / PT_DT), do: "slide", dir: th }], K };
}
const C = (v, ang, ph, off, extra) => rxCase(Object.assign({ v, ang, ph, off }, extra || {}));
const SCEN = {
  // counterfactual pairs: ONE causal variable changes
  rx_free_leg:     C(3, 90, 0.0, 0),        rx_planted_leg:  C(3, 90, 0.25, 0),       // same slide line and speed: the struck leg is swinging vs weight-bearing
  rx_jog:          C(3, 90, 0.25, 0),       rx_sprint:       C(7.5, 90, 0.25, 0.5),   // the planted left foot swept in both: jogging vs sprinting
  rx_square:       C(3, 90, 0.75, 0.35),    rx_glancing:     C(3, 90, 0.75, 0.35, { short: 0.30 }),   // same line / speed / stride: the full leg vs only its tip reaching
  rx_lateral:      C(5.5, 90, 0.5, 0),      rx_rear_diag:    C(5.5, 45, 0.5, 0),      // same attacker state: lateral vs rear-diagonal slide
  rx_front_diag:   C(5.5, 135, 0.25, 0),    rx_rear:         C(3, 0, 0.0, 0),          // front diagonal; from behind
  rx_standing:     C(0, 90, 0.08, 0),       rx_airborne:     C(7.5, -45, 0.5, 0.2),    // a player standing still; a sprinter hit in the flight phase
  rx_early_stance: C(7.5, 90, 0.6, 0.1),    rx_late_stance:  C(7.5, 90, 0.7, 0.3),    // the planted RIGHT foot swept early in its stance (the other foot far from landing) vs late (about to land)
  rx_facing_front: C(0, 180, 0.08, 0, { ballAhead: true }), rx_side_standing: C(0, 90, 0.1, 0.2), rx_behind_standing: C(0, 0, 0.08, 0, { ballAhead: true }),   // standing: facing the slide head-on / hit from the side / feet swept from behind
  rx_heavy:        C(7.5, 90, 0.25, 0.45, { dchar: "james" }), rx_light: C(7.5, 90, 0.25, 0.45, { dchar: "cucurella" }),   // identical geometry: tackler 82 kg vs 68 kg (recorded weights)
};
function keysAt(S0, k) { return {}; }
module.exports = { SCEN, keysAt, rxCase };
