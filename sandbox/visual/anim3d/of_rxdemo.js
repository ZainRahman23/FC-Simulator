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
// ═══ SLIDE CONTACT GEOMETRY V1.2 — AUTO SIDE-ON SLIDE DEMO (playtest instrumentation, inputs only) ═══════════════════════════════════════
// The chase → drop → sweep cases of the V1.2 review, driven exactly as you would play them: the defender (the player you control) holds the
// keys and asks for the slide when the ball is within d (the stick direction, or the AI aiming aid). Everything after the request is the
// simulation's.   Shift+G on / off   Shift+H next case   - slow (0.25x, while on)
const OFSGD = { on: false, i: 0, slow: false, runT: 3.4 };
const OFSGD_CASES = [
  { label: "SIDE-ON · defender on the attacker's RIGHT, slide along the run (0.9 m)", lat: 0.9 }, { label: "SIDE-ON · defender on the attacker's LEFT (mirror)", lat: -0.9 },
  { label: "TIGHT · shoulder to shoulder, attacker's right (0.65 m)", lat: 0.65 }, { label: "TIGHT · attacker's left", lat: -0.65 },
  { label: "AIMED · wider chase (1.2 m), the AI aiming aid picks the line", lat: 1.2, aim: true }, { label: "WIDE · 1.3 m, beyond the sweep — a clean miss", lat: 1.3 },
  { label: "EARLY · slide from too far back — it dies short", lat: 0.9, d: 3.6 }, { label: "GLANCING · the same sweep against a strong, balanced carrier", lat: -0.9, strong: true },
  { label: "BLOCK · head-on, the ball on the slide line", block: true },
];
function ofSgdStart() {
  const K = OFSGD_CASES[OFSGD.i], E = Math.PI, A = K.block ? { name: "A", team: 0, x: 52, y: 34, facing: 0, char: "vinicius", ai: { mode: "DRIBBLE", dirs: [{ t: 0, dir: 0, gear: "jog" }] } }
    : { name: "A", team: 0, x: 50, y: 34, facing: 0, char: "vinicius", ai: { mode: "DRIBBLE", dirs: [{ t: 0, dir: 0, gear: "jog" }] }, attrs: K.strong ? { strength: 95, balance: 95 } : undefined };
  const D = K.block ? { name: "D", team: 1, x: 60, y: 34.25, facing: E, char: "gabriel", ai: { mode: "HOLD" } } : { name: "D", team: 1, x: 46.8, y: 34 + K.lat, facing: 0, char: "gabriel", ai: { mode: "HOLD" } };
  ofSquadStart("sgdemo", { label: "side-on slide demo", defending: true, center: [58, 34], owner: 0, active: 1, autoSwitch: false, players: [A, D] });
  OFSGD.cur = { K, fired: false, t0: S.pt.now }; S.pt.last = "SIDE-ON SLIDE DEMO " + (OFSGD.i + 1) + "/" + OFSGD_CASES.length + " — " + K.label;
}
function ofSgdPre() {
  if (!OFSGD.on || !S.pt || !S.pt.squad || !OFSGD.cur) return; const t = S.pt, c = OFSGD.cur, K = c.K, now = t.now - c.t0;
  t.keys = K.block ? { left: true, jog: true } : { right: true, sprint: true };
  if (!c.fired && now > 0.08) { const me = t.squad.ctx[1].p, dB = Math.hypot(t.b.x - me.x, t.b.y - me.y);
    if (dB <= (K.block ? 2.4 : K.d || 1.9)) { ptDefSlide(t, 1, K.block ? Math.PI : K.aim ? ptDefSlideAim(t, t.squad.ctx[1]) : 0); c.fired = true; } }
  if (now > OFSGD.runT) { OFSGD.i = (OFSGD.i + 1) % OFSGD_CASES.length; ofSgdStart(); }
}
function ofSgdHud() { return OFSGD.on ? `SIDE-ON SLIDE DEMO  ${OFSGD.i + 1}/${OFSGD_CASES.length}  ${OFSGD_CASES[OFSGD.i].label}${OFSGD.slow ? "  SLOW 0.25x" : ""}   (Shift+H next · - slow · Shift+G off)` : ""; }
window.addEventListener("keydown", (e) => {
  if (typeof OFPLAY === "undefined" || !OFPLAY.on || !S.pt || !S.pt.on) return;
  if (e.target && (e.target.tagName === "INPUT" || e.target.tagName === "SELECT" || e.target.tagName === "BUTTON")) return;
  if (e.shiftKey && e.code === "KeyG") { OFSGD.on = !OFSGD.on; if (OFSGD.on) { OFRXD.on = false; ofSgdStart(); } else { S.pt.keys = {}; S.pt.slow = 1; OFSGD.slow = false; S.pt.last = "SIDE-ON SLIDE DEMO off"; } }
  else if (e.shiftKey && e.code === "KeyH") { OFSGD.i = (OFSGD.i + 1) % OFSGD_CASES.length; if (OFSGD.on) ofSgdStart(); }
  else if (e.key === "-" && OFSGD.on) { OFSGD.slow = !OFSGD.slow; S.pt.slow = OFSGD.slow ? 0.25 : 1; }
  else return;
  e.preventDefault(); e.stopImmediatePropagation();
}, true);
