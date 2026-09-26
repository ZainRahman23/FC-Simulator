// ═══ anim3d/of_defdemo.js — AUTO DEFENDING DEMO (temporary playtest instrumentation, harness only) ═══════════════════════════════
// Repeats defensive situations using ONLY the inputs a person has — the defender's held keys (move / sprint / jockey) and the two action
// requests (standing tackle, slide tackle: ptDefStand / ptDefSlide, the entries the keys use). The attackers are the drill's own AI
// (dribble directions, AI passes through the ordinary pass path). It never touches the ball, a player, a contact or possession: whether a
// tackle reaches the ball, what the ball does, who ends up with it is the simulation's. Deterministic (decisions at fixed simulation ticks).
//   Shift+Y  on / off        Shift+B  next pattern        -  slow (0.25x, while on)
// Every attempt is recorded: the pattern's INTENT (what the input tried) next to what the simulation decided (tackle outcome, contact
// facts, the loose-ball aftermath and who has the ball 1.5 s later), plus the final rendered boot / leg–ball residual at the contact tick.
const OFDEF = { on: false, pattern: 0, slow: false, results: [], cur: null, lastEv: 0, afterT: 1.5, restartT: 0.6, maxT: 9, n: 0 };
const ofDA = (x, y, f, dirs, extra) => Object.assign({ name: "A", team: 0, x, y, facing: f, char: "vinicius", ai: { mode: "DRIBBLE", dirs } }, extra || {});
const ofDD = (x, y, f, char) => ({ name: "D", team: 1, x, y, facing: f, char: char || "gabriel", ai: { mode: "HOLD" } });
const ofDDrill = (players, extra) => Object.assign({ label: "defend demo", defending: true, center: [62, 34], owner: 0, active: players.length - 1, autoSwitch: false, players }, extra || {});
const OFDEF_WEAVE = [{ t: 0, dir: 0, gear: "walk" }, { t: 1.2, dir: 0.5, gear: "walk" }, { t: 2.2, dir: -0.5, gear: "walk" }, { t: 3.4, dir: 0, gear: "jog" }, { t: 4.6, dir: 0.6, gear: "walk" }];
// v(n): a deterministic per-attempt variation (-1 … 1) so repeated attempts are not identical (no randomness anywhere)
const ofDefVar = (k) => [0, 0.6, -0.8, 0.3, -0.4, 1, -1, 0.15][(OFDEF.n + k) % 8];
const OFDEF_PATTERNS = [
  { id: "jockey", intent: "contain: jockey goal-side, no challenge", drill: () => ofDDrill([ofDA(54, 34 + ofDefVar(0), 0, OFDEF_WEAVE), ofDD(61, 34.3, Math.PI)]), policy: "jockey", dur: 6 },
  { id: "stand_win", intent: "standing tackle when the ball is exposed and in reach", drill: () => ofDDrill([ofDA(55, 34, 0, OFDEF_WEAVE), ofDD(60.5, 34.2 + 0.4 * ofDefVar(1), Math.PI)]), policy: "standExposed" },
  { id: "stand_miss", intent: "standing tackle launched from too far (out of reach)", drill: () => ofDDrill([ofDA(55, 34, 0, [{ t: 0, dir: 0.2 * ofDefVar(2), gear: "walk" }]), ofDD(61, 34.2, Math.PI, "cucurella")]), policy: "standFar" },
  { id: "retention", intent: "standing tackle from behind on a walking carrier (his body is between)", drill: () => ofDDrill([ofDA(60, 34, 0, [{ t: 0, dir: 0, gear: "walk" }], { attrs: { strength: 80, balance: 80 } }), ofDD(59.0, 34.62 + 0.08 * ofDefVar(3), 0, "vinicius")]), policy: "behind" },
  { id: "slide_win", intent: "slide across the carrier's path, timed to meet the ball", drill: () => ofDDrill([ofDA(62, 25, Math.PI / 2, [{ t: 0, dir: Math.PI / 2, gear: "jog" }]), ofDD(68, 31.5 + 0.8 * ofDefVar(4), Math.PI, "osimhen")]), policy: "slideTimed" },
  { id: "slide_miss", intent: "slide launched from too far, straight at where the ball IS (no lead)", drill: () => ofDDrill([ofDA(62, 25, Math.PI / 2, [{ t: 0, dir: Math.PI / 2, gear: "jog" }]), ofDD(69, 31.5 + 0.8 * ofDefVar(5), Math.PI, "cucurella")]), policy: "slideEarly" },
  { id: "intercept", intent: "step into the passing lane (the reception law decides)", drill: () => ofDDrill([ofDA(56, 34, 0, [{ t: 0, dir: null }], { ai: { mode: "SSG" } }), { name: "B", team: 0, x: 70, y: 36, facing: Math.PI, char: "szoboszlai", ai: { mode: "HOLD" } }, ofDD(63, 34.3 + 0.9 * ofDefVar(6), Math.PI / 2, "gabriel")]), policy: "lane" },
];
function ofDefStart() {
  const P = OFDEF_PATTERNS[OFDEF.pattern]; ofSquadStart("defdemo", P.drill());
  OFDEF.cur = { n: ++OFDEF.n, pattern: P.id, intent: P.intent, t0: S.pt.now, acted: null, tackle: null, body: null, recv: [], done: false };
  OFDEF.lastEv = 0; OFDEF.passAt = null; S.pt.last = "AUTO DEFEND — " + P.id + ": " + P.intent;
}
const ofDefKeysTo = (p, x, y, extra) => { const dx = x - p.x, dy = y - p.y; if (Math.hypot(dx, dy) < 0.25) return Object.assign({}, extra || {});
  const a8 = Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) * (Math.PI / 4), cx = Math.cos(a8), cy = Math.sin(a8);
  return Object.assign({ right: cx > 0.38, left: cx < -0.38, down: cy > 0.38, up: cy < -0.38 }, extra || {}); };
// one decision per tick, BEFORE the tick (where a key press lands)
function ofDefPre() {
  const t = S.pt, Q = t && t.squad; if (!OFDEF.on || !Q) return;
  const c = OFDEF.cur, P = OFDEF_PATTERNS[OFDEF.pattern], b = t.b, now = t.now - c.t0, me = Q.ctx[Q.active], p = me.p;
  for (; OFDEF.lastEv < Q.events.length; OFDEF.lastEv++) { const e = Q.events[OFDEF.lastEv];
    if (e.kind === "TACKLE" && e.pid === Q.active && !c.tackle) { c.tackle = e; c.tackleAt = now; }
    else if (e.kind === "TACKLE_BODY_CONTACT" && e.pid === Q.active) c.body = e;
    else if (e.kind === "RECEPTION") c.recv.push({ pid: e.pid, name: Q.ctx[e.pid].name, outcome: e.outcome, t: +now.toFixed(2) }); }
  if (c.done) { if (now - c.doneAt > OFDEF.restartT) ofDefStart(); t.keys = {}; return; }
  const tackled = c.tackle && now - c.tackleAt > OFDEF.afterT, intercepted = P.policy === "lane" && c.recv.some(r => r.pid === Q.active), timeUp = now > (P.dur || OFDEF.maxT);
  if (tackled || intercepted || timeUp || (P.policy === "lane" && c.recv.length && now - c.recv[c.recv.length - 1].t > OFDEF.afterT)) return ofDefFinish(t, c, now);
  // the policy: held keys + action requests only
  const car = b.owner != null ? Q.ctx[b.owner] : null, cp = car ? car.p : null, own = 105;
  let k = {};
  if (P.policy === "jockey" || P.policy === "standExposed" || P.policy === "standFar") {
    if (cp) { const ux = own - cp.x, uy = 34 - cp.y, m = Math.hypot(ux, uy) || 1, cd = 1.5; k = ofDefKeysTo(p, cp.x + ux / m * cd, cp.y + uy / m * cd, { jockey: true }); }
    if (!c.acted && car && car.team !== me.team) { const dB = Math.hypot(b.x - p.x, b.y - p.y), ex = Math.hypot(b.x - cp.x, b.y - cp.y);
      if (P.policy === "standExposed" && now > 1.0 && ex > 0.62 && dB < 0.95) { ptDefStand(t, Q.active); c.acted = { what: "STAND", at: +now.toFixed(2), ballDist: +dB.toFixed(2), exposed: +ex.toFixed(2) }; }
      if (P.policy === "standFar" && now > 0.6 && dB < 1.75) { ptDefStand(t, Q.active); c.acted = { what: "STAND", at: +now.toFixed(2), ballDist: +dB.toFixed(2), exposed: +ex.toFixed(2) }; } }
  } else if (P.policy === "behind") {                                                               // catch him up from behind, challenge when the ball is within 1 m
    if (!c.acted) { k = { right: true, jog: true }; const dB = Math.hypot(b.x - p.x, b.y - p.y); if (dB < 0.85) { ptDefStand(t, Q.active); c.acted = { what: "STAND", at: +now.toFixed(2), ballDist: +dB.toFixed(2) }; } }
  } else if (P.policy === "slideTimed" || P.policy === "slideEarly") {
    if (!c.acted) { k = { left: true, sprint: true };
      const aim = ptDefSlideAim(t, me), dB = Math.hypot(b.x - p.x, b.y - p.y);
      if (P.policy === "slideTimed" && dB < 3.0 && now > 0.3) { ptDefSlide(t, Q.active, aim); c.acted = { what: "SLIDE", at: +now.toFixed(2), ballDist: +dB.toFixed(2), dir: +aim.toFixed(3) }; }
      if (P.policy === "slideEarly" && dB < 5.2 && now > 0.3) { const dir = Math.atan2(b.y - p.y, b.x - p.x); ptDefSlide(t, Q.active, dir); c.acted = { what: "SLIDE", at: +now.toFixed(2), ballDist: +dB.toFixed(2), dir: +dir.toFixed(3) }; } }
  } else if (P.policy === "lane") {
    if (OFDEF.passAt == null && b.owner === 0 && now > 1.2) { const k2 = ptDefAiPass(t, 0, 1, "SHORT"); if (k2) OFDEF.passAt = now; }
    if (b.owner == null && Q.pass && !Q.pass.done) { const r = Q.pass.target, fx = b.x, fy = b.y, dx = r[0] - fx, dy = r[1] - fy, L = dx * dx + dy * dy;   // step onto the ball's line
      const s = Math.max(0, Math.min(1, ((p.x - fx) * dx + (p.y - fy) * dy) / L)); k = ofDefKeysTo(p, fx + s * dx, fy + s * dy, { sprint: true }); c.acted = c.acted || { what: "LANE", at: +now.toFixed(2) }; }
  }
  t.keys = k;
}
function ofDefFinish(t, c, now) {
  const Q = t.squad, b = t.b; c.done = true; c.doneAt = now;
  const tk = c.tackle, lr = OFSQ.defRecs && OFSQ.defRecs.slice().reverse().find(r => tk && r.tick === tk.tick);
  c.after = { owner: b.owner != null ? Q.ctx[b.owner].name : "LOOSE", ownerTeam: b.owner != null ? Q.ctx[b.owner].team : null, ballSpeed: +Math.hypot(b.vx, b.vy).toFixed(2) };
  c.result = tk ? tk.type + " " + tk.out + (tk.why ? " (" + tk.why + ")" : "") : c.recv.some(r => r.pid === Q.active) ? "INTERCEPTED (" + c.recv.find(r => r.pid === Q.active).outcome + ")" : c.acted ? "no contact" : "contained (no challenge)";
  c.residual = lr ? { inside: lr.insideSurf, leg: lr.legSurf, capped: lr.reachCapped, knee: lr.knee, geo: lr.geo } : null;
  OFDEF.results.push(JSON.parse(JSON.stringify(c))); if (OFDEF.results.length > 300) OFDEF.results.shift();
}
function ofDefPost() { const c = OFDEF.results[OFDEF.results.length - 1]; if (c && c.tackle && !c.residual && OFSQ.defRecs) { const r = OFSQ.defRecs.find(x => x.tick === c.tackle.tick); if (r) c.residual = { inside: r.insideSurf, leg: r.legSurf, capped: r.reachCapped, knee: r.knee, geo: r.geo }; } }
function ofDefHud() {
  if (!OFDEF.on && !OFDEF.results.length) return "";
  const P = OFDEF_PATTERNS[OFDEF.pattern], c = OFDEF.cur, last = OFDEF.results[OFDEF.results.length - 1];
  const L = [`AUTO DEFEND ${OFDEF.on ? "ON" : "off"}  pattern ${OFDEF.pattern + 1}/${OFDEF_PATTERNS.length} ${P.id} — ${P.intent}${OFDEF.slow ? "  SLOW 0.25x" : ""}  attempts ${OFDEF.results.length}`];
  if (c && !c.done) L.push(`  #${c.n}  ${c.acted ? c.acted.what + " at " + c.acted.at + " s (ball " + (c.acted.ballDist != null ? c.acted.ballDist + " m" : "-") + ")" : "watching"}`);
  if (last) L.push(`  last  #${last.n} ${last.pattern}: ${last.result}  -> ball ${last.after.owner}${last.residual ? "  rendered leg–ball " + (last.residual.leg * 100).toFixed(1) + " cm" : ""}${last.body ? "  BODY CONTACT (" + (last.body.ballFirst ? "ball first" : "man first") + ")" : ""}`);
  return L.join("\n");
}
window.addEventListener("keydown", (e) => {
  if (typeof OFPLAY === "undefined" || !OFPLAY.on || !S.pt || !S.pt.on) return;
  if (e.target && (e.target.tagName === "INPUT" || e.target.tagName === "SELECT" || e.target.tagName === "BUTTON")) return;
  if (e.shiftKey && e.code === "KeyY") { OFDEF.on = !OFDEF.on; if (OFDEF.on) ofDefStart(); else { S.pt.keys = {}; S.pt.slow = 1; OFDEF.slow = false; S.pt.last = "AUTO DEFEND off — manual control"; } }
  else if (e.shiftKey && e.code === "KeyB") { OFDEF.pattern = (OFDEF.pattern + 1) % OFDEF_PATTERNS.length; if (OFDEF.on) ofDefStart(); else S.pt.last = "AUTO DEFEND pattern -> " + OFDEF_PATTERNS[OFDEF.pattern].id; }
  else if (e.key === "-" && OFDEF.on) { OFDEF.slow = !OFDEF.slow; S.pt.slow = OFDEF.slow ? 0.25 : 1; }
  else return;
  e.preventDefault(); e.stopImmediatePropagation();
}, true);
