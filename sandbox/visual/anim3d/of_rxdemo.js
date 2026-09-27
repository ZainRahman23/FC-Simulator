// ═══ anim3d/of_rxdemo.js — AUTO TACKLED-PLAYER DEMO (playtest instrumentation, inputs only) ════════════════════════════════════════
// Repeats contact situations built from the contact-matrix geometry: a runner (no ball) at a set speed and stride phase, a defender on a
// set line, a slide REQUESTED at a fixed tick (the same request the F key makes). Whether the slide touches him, which segment, and the
// reaction are the simulation's. Pairs differ in ONE causal variable (planted vs free leg, jog vs sprint, square vs glancing, lateral vs
// rear-diagonal …), so they can be watched back to back.   Shift+T on / off   Shift+N next case   - slow (0.25x, while on)
const OFRXD = { on: false, i: 0, slow: false, t0: 0, runT: 4.6, results: [] };
const OFRXD_LEG = 0.865, OFRXD_SL = { vMin: 4.2, vMax: 7.5, vAdd: 1.0, windT: 0.10, decel: 5.5 };
function ofRxdCase(K) {
  const Tc = 0.95, tReq = 0.5, th = K.ang * Math.PI / 180, fx = Math.cos(th), fy = Math.sin(th), u = K.u != null ? K.u : 5, S = OFRXD_SL;
  const Ax = 50, Ay = 34, AT = [Ax + K.v * Tc, Ay], v0 = Math.max(S.vMin, Math.min(S.vMax, u + S.vAdd)), tau = Tc - tReq - S.windT, sTau = v0 * tau - 0.5 * S.decel * tau * tau, reachC = 0.8 * OFRXD_LEG;
  const back = reachC + sTau + u * S.windT + (K.short || 0), Preq = [AT[0] - fx * back - fy * K.off, AT[1] - fy * back + fx * K.off], P0 = [Preq[0] - fx * u * tReq, Preq[1] - fy * u * tReq];
  return { label: K.label, K, tReq, drill: { label: "tackled-player demo", defending: true, center: [55, 34], owner: null, active: 1, autoSwitch: false, ball: K.ballAhead ? { x: AT[0] + 6, y: Ay } : { x: AT[0], y: Ay + 5 }, players: [
    { name: "A", team: 0, x: Ax, y: Ay, vx: K.v, vy: 0, facing: 0, gaitPhase: K.ph, char: K.achar || "vinicius", ai: { mode: "SCRIPT", path: [{ t: 0, x: 200, y: Ay, v: K.v }] } },
    { name: "D", team: 1, x: P0[0], y: P0[1], vx: fx * u, vy: fy * u, facing: th, char: K.dchar || "gabriel", ai: { mode: "SCRIPT", path: [{ t: 0, x: P0[0] + fx * 100, y: P0[1] + fy * 100, v: u }] } }] } };
}
const OFRXD_CASES = [
  { label: "FREE leg struck (3 m/s, lateral)", v: 3, ang: 90, ph: 0.0, off: 0 }, { label: "PLANTED leg struck (same line, 3 m/s)", v: 3, ang: 90, ph: 0.25, off: 0 },
  { label: "JOG (3 m/s) — planted foot swept", v: 3, ang: 90, ph: 0.25, off: 0 }, { label: "SPRINT (7.5 m/s) — planted foot swept", v: 7.5, ang: 90, ph: 0.25, off: 0.5 },
  { label: "SPRINT — planted foot swept EARLY in stance", v: 7.5, ang: 90, ph: 0.6, off: 0.1 }, { label: "SPRINT — planted foot swept LATE in stance", v: 7.5, ang: 90, ph: 0.7, off: 0.3 },
  { label: "SQUARE (full leg reaches)", v: 3, ang: 90, ph: 0.75, off: 0.35 }, { label: "GLANCING (only the leg tip reaches)", v: 3, ang: 90, ph: 0.75, off: 0.35, short: 0.30 },
  { label: "LATERAL (5.5 m/s)", v: 5.5, ang: 90, ph: 0.5, off: 0 }, { label: "REAR-DIAGONAL (same attacker)", v: 5.5, ang: 45, ph: 0.5, off: 0 },
  { label: "FRONT-DIAGONAL", v: 5.5, ang: 135, ph: 0.25, off: 0 }, { label: "FROM BEHIND", v: 5.5, ang: 0, ph: 0.25, off: 0 },
  { label: "STANDING player (hit from the side)", v: 0, ang: 90, ph: 0.08, off: 0 }, { label: "STANDING player facing the slide head-on", v: 0, ang: 180, ph: 0.08, off: 0, ballAhead: true }, { label: "SPRINTER IN FLIGHT", v: 7.5, ang: -45, ph: 0.5, off: 0.2 },
];
function ofRxdStart() {
  const C = ofRxdCase(OFRXD_CASES[OFRXD.i]); ofSquadStart("rxdemo", C.drill); S.pt.squad.humanAi = true;
  OFRXD.cur = { case: C, fired: false, t0: S.pt.now }; S.pt.last = "TACKLED-PLAYER DEMO " + (OFRXD.i + 1) + "/" + OFRXD_CASES.length + " — " + C.label;
}
function ofRxdPre() {
  if (!OFRXD.on || !S.pt || !S.pt.squad || !OFRXD.cur) return; const t = S.pt, c = OFRXD.cur, now = t.now - c.t0;
  if (!c.fired && now >= c.case.tReq - 1e-9) { ptDefSlide(t, 1, c.case.K.ang * Math.PI / 180); c.fired = true; }
  if (now > OFRXD.runT) { const e = t.squad.events.find(x => x.kind === "PLAYER_CONTACT"); OFRXD.results.push({ case: c.case.label, react: e ? (e.react || e.cls) : "no contact", seg: e ? e.seg : null }); OFRXD.i = (OFRXD.i + 1) % OFRXD_CASES.length; ofRxdStart(); }
}
function ofRxdHud() {
  if (!OFRXD.on) return ""; const t = S.pt, Q = t.squad, e = Q && Q.events.find(x => x.kind === "PLAYER_CONTACT");
  const L = [`TACKLED-PLAYER DEMO  ${OFRXD.i + 1}/${OFRXD_CASES.length}  ${OFRXD_CASES[OFRXD.i].label}${OFRXD.slow ? "  SLOW 0.25x" : ""}`];
  if (e) L.push(`  contact ${e.prim} → ${e.seg} (${e.segPlanted ? "weight-bearing" : e.segPlanted === false ? "swinging" : "body"})  ${e.stride}  vn ${e.vn} m/s  J ${e.J} N·s  support ${e.supportLost ? "LOST" : "kept"}  capture error ${e.e0} m vs step ${e.rc} m  → ${e.react || e.cls}${e.family ? " (" + e.family + ")" : ""}  ${e.order}`);
  return L.join("\n");
}
window.addEventListener("keydown", (e) => {
  if (typeof OFPLAY === "undefined" || !OFPLAY.on || !S.pt || !S.pt.on) return;
  if (e.target && (e.target.tagName === "INPUT" || e.target.tagName === "SELECT" || e.target.tagName === "BUTTON")) return;
  if (e.shiftKey && e.code === "KeyT") { OFRXD.on = !OFRXD.on; if (OFRXD.on) ofRxdStart(); else { S.pt.slow = 1; OFRXD.slow = false; S.pt.last = "TACKLED-PLAYER DEMO off"; } }
  else if (e.shiftKey && e.code === "KeyN") { OFRXD.i = (OFRXD.i + 1) % OFRXD_CASES.length; if (OFRXD.on) ofRxdStart(); }
  else if (e.key === "-" && OFRXD.on) { OFRXD.slow = !OFRXD.slow; S.pt.slow = OFRXD.slow ? 0.25 : 1; }
  else return;
  e.preventDefault(); e.stopImmediatePropagation();
}, true);
