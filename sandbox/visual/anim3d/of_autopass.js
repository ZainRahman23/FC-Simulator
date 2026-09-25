// ═══ anim3d/of_autopass.js — AUTO PASS / RECEIVE DEMO (temporary playtest instrumentation, harness only) ═════════════════════════
// Plays repeated passes between real players using ONLY the inputs a person has: "pass to this player / this point with this family"
// (ptSquadPassTo — the same entry the keyboard uses), "switch control", "restart the drill". It never touches the ball, a player, a
// reception or possession. Whether a pass arrives, which boot meets it, and what the first touch does are decided by the accepted
// simulation (pass law, ball physics, reception plan, reach, touch outcome) exactly as in manual play.
// Deterministic: decisions are taken from the authoritative state at fixed points of the simulation clock.
//   Y  auto on / off (starts the current pattern)      B  next pattern      =  pass family (SHORT / DRIVEN / THROUGH)      -  slow auto (0.25x)
// Every pass is recorded (passer, intended receiver, family, target, outcome, receiving foot, final boot–ball residual) and a failure
// is CLASSIFIED from what the simulation reported (never guessed): intercepted, first touch failed, ball never came within a boot's reach,
// plan lost, receiver stuck beside a ball at rest (with the reception geometry at that moment), or timeout.
const OFAUTO = {
  on: false, collect: true, pattern: 0, fam: "SHORT", slow: false, settleT: 0.9, stuckT: 1.2, timeoutT: 7.0, resetAfterT: 1.5,
  n: 0, ok: 0, fail: 0, results: [], cur: null, lastEv: 0, state: "idle", t0: 0, failAt: null, cases: [],
};
// patterns: an authoritative fixture (players, off-ball intent) + how the next target is chosen
const OFAUTO_PATTERNS = [
  { id: "stationary", label: "stationary A <-> B (receivers hold)", drill: () => ofAutoTwo("HOLD"), target: (t, to) => ofAutoAt(t, to, 0, 0) },
  { id: "moving", label: "A <-> B, receivers moving gently (lead pass)", drill: () => ofAutoTwo("SCRIPT"), target: (t, to) => ofAutoLead(t, to) },
  { id: "triangle", label: "passing triangle (drill 8 layout)", drill: () => JSON.parse(JSON.stringify(OFSQ_DRILLS["8"])), target: (t, to) => ofAutoLead(t, to), order: [1, 2, 0] },
  { id: "path", label: "A <-> B, pass 1.2 m into the receiver's path (he comes to meet it)", drill: () => ofAutoTwo("SUPPORT"), target: (t, to) => ofAutoPath(t, to) },
];
function ofAutoTwo(mode) {
  const A = { name: "A", x: 57, y: 34, facing: 0, char: "cucurella", ai: { mode: mode === "SCRIPT" ? "SCRIPT" : mode } };
  const B = { name: "B", x: 70, y: 34, facing: Math.PI, char: "gabriel", ai: { mode: mode === "SCRIPT" ? "SCRIPT" : mode } };
  if (mode === "SCRIPT") {                                                                         // a gentle deterministic shuttle: 3 m sideways and back at 1.2 m/s
    const path = (x, y) => { const p = []; for (let k = 0; k < 60; k++) p.push({ t: k * 2.5, x, y: y + (k % 2 ? 1.5 : -1.5), v: 1.2 }); return p; };
    A.ai.path = path(57, 34); B.ai.path = path(70, 34);
  }
  return { label: "auto", center: [63, 34], owner: 0, active: 0, players: [A, B] };
}
function ofAutoAt(t, to, dx, dy) { const o = t.squad.ctx[to].p; return [o.x + dx, o.y + dy]; }
function ofAutoLead(t, to) { const o = t.squad.ctx[to].p, p = t.p; const lead = Math.max(0.2, Math.min(1.1, Math.hypot(o.x - p.x, o.y - p.y) / 16)); return [o.x + o.vx * lead, o.y + o.vy * lead]; }   // continuous.py lead
function ofAutoPath(t, to) {                                                                       // alternate sides, 1.2 m across the receiver's line to the passer
  const o = t.squad.ctx[to].p, p = t.p, dx = o.x - p.x, dy = o.y - p.y, m = Math.hypot(dx, dy) || 1, side = (OFAUTO.n % 2 ? 1 : -1) * 1.2;
  return [o.x - dy / m * side, o.y + dx / m * side];
}
function ofAutoStart() {
  const P = OFAUTO_PATTERNS[OFAUTO.pattern];
  ofSquadStart("auto", P.drill());
  Object.assign(OFAUTO, { cur: null, lastEv: 0, state: "settle", t0: S.pt.now, failAt: null, ownT: null, ownPid: null });   // the drill restarts the simulation clock
  S.pt.last = "AUTO PASS — " + P.label;
}
function ofAutoNext(Q, from) {
  const P = OFAUTO_PATTERNS[OFAUTO.pattern];
  if (P.order) return P.order[from];
  for (let j = 0; j < Q.ctx.length; j++) if (j !== from && Q.ctx[j].team === Q.ctx[from].team) return j;
  return null;
}
// one decision per simulation tick, BEFORE the tick (the same moment a key press would land)
function ofAutoPre() {
  const t = S.pt, Q = t && t.squad; if (!OFAUTO.on || !Q) return;
  const b = t.b, now = t.now;
  // read what the simulation reported since the last tick
  for (; OFAUTO.lastEv < Q.events.length; OFAUTO.lastEv++) {
    const e = Q.events[OFAUTO.lastEv], c = OFAUTO.cur; if (!c || c.done) continue;
    if (e.kind === "PASS" && e.pid === c.from) c.kicked = e.tick;
    else if (e.kind === "OUT_OF_REACH" && e.pid === c.to) c.planLost = (c.planLost || 0) + 1;
    else if (e.kind === "RECEPTION") {
      c.recv = { pid: e.pid, outcome: e.outcome, foot: e.foot, stretch: e.stretch, rv: e.rv, tick: e.tick, style: e.style };
      c.recvSpeed = e.pv ? +Math.hypot(e.pv[0], e.pv[1]).toFixed(2) : null; c.pushSpeed = e.vOut ? +Math.hypot(e.vOut[0], e.vOut[1]).toFixed(2) : null;
      if (e.pid !== c.to) ofAutoFinish(c, false, "INTERCEPTED by " + Q.ctx[e.pid].name + " (" + e.outcome + ")");
      else if (e.outcome !== "CLEAN") ofAutoFinish(c, false, "FIRST TOUCH " + e.outcome + " (the simulation's touch outcome, rel. speed " + e.rv.toFixed(1) + " m/s)");
      else ofAutoFinish(c, true, "CLEAN " + e.style);
    }
  }
  const c = OFAUTO.cur;
  if (c && !c.done && c.kicked) {                                                                  // in flight: instrument, detect failure (read-only)
    const r = Q.ctx[c.to], p = r.p, d = Math.hypot(b.x - p.x, b.y - p.y), bs = Math.hypot(b.vx, b.vy);
    c.minD = Math.min(c.minD == null ? 1e9 : c.minD, d); if (r.recvPlan) { c.planSeen = true; c.lastPlan = r.recvPlan; }
    if (bs < 0.05 && Math.hypot(p.vx, p.vy) < 0.05 && b.owner == null) { c.restT = c.restT == null ? now : c.restT; }
    else c.restT = null;
    if (c.restT != null && now - c.restT > OFAUTO.stuckT) ofAutoFinish(c, false, "STUCK — " + ofAutoStuckWhy(t, r), true);
    else if (now - c.t > OFAUTO.timeoutT) ofAutoFinish(c, false, "TIMEOUT (ball " + d.toFixed(2) + " m from the receiver, " + (c.planSeen ? "a plan had existed" : "never a plan") + ")");
  }
  if (OFAUTO.state === "failed") { if (now - OFAUTO.failAt > OFAUTO.resetAfterT) ofAutoStart(); return; }   // demo restart after a failure (the failure is recorded first)
  // settle, then pass: the owner is given control (a control input) and, once the ball is at his feet, passes to the next player
  if (b.owner == null) return;
  const o = b.owner; if (o !== Q.active) ptSquadSwitch(t, o);
  const own = Q.ctx[o]; t.keys = {};
  // the player's own input while he has the ball: if it is not at his feet, steer toward it (8-way, jog) — what a person does after a running
  // take. OFAUTO.collect = false gives NO input instead, to measure the finding this demo exposed: after some receptions the owner stops while
  // the first touch leaves the ball out of carry range, and nothing brings them back together (possession stays his, EXPOSED).
  { const dx = b.x - own.p.x, dy = b.y - own.p.y, dd = Math.hypot(dx, dy);
    if (OFAUTO.collect && dd > 0.7) { const a8 = Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) * (Math.PI / 4), cx = Math.cos(a8), cy = Math.sin(a8);
      t.keys = { right: cx > 0.38, left: cx < -0.38, down: cy > 0.38, up: cy < -0.38, jog: true }; }
    if (!OFAUTO.collect) {
      if (dd > 0.85 && Math.hypot(own.p.vx, own.p.vy) < 0.1 && Math.hypot(b.vx, b.vy) < 0.05) { OFAUTO.leftT = OFAUTO.leftT == null ? now : OFAUTO.leftT;
        if (now - OFAUTO.leftT > 1.5) { const lr = OFAUTO.results[OFAUTO.results.length - 1];
          OFAUTO.cases.push({ pattern: OFAUTO_PATTERNS[OFAUTO.pattern].id, fam: OFAUTO.fam, n: OFAUTO.n, tick: Q.tick, kind: "BALL_LEFT_BEHIND_AFTER_RECEPTION",
            detail: { owner: own.name, ctrlState: own.ctrlState, ballDist: +dd.toFixed(2), reception: lr ? lr.reason : null, rv: lr && lr.recv ? lr.recv.rv : null,
                      receiverSpeedAtContact: lr && lr.recvSpeed != null ? lr.recvSpeed : null, firstTouchSpeed: lr && lr.pushSpeed != null ? lr.pushSpeed : null } });
          OFAUTO.leftT = null; OFAUTO.state = "failed"; OFAUTO.failAt = now - OFAUTO.resetAfterT; return; } }
      else OFAUTO.leftT = null; } }
  if (OFAUTO.state !== "settle" || OFAUTO.ownT == null || OFAUTO.ownPid !== o) { OFAUTO.state = "settle"; OFAUTO.ownT = now; OFAUTO.ownPid = o; }
  const rel = Math.hypot(b.vx - own.p.vx, b.vy - own.p.vy), dB = Math.hypot(b.x - own.p.x, b.y - own.p.y);
  if (now - OFAUTO.ownT >= OFAUTO.settleT && rel < 0.6 && dB < PT_RECV.kickReach && !t.kick) {
    const to = ofAutoNext(Q, o); if (to == null) return;
    const tg = OFAUTO_PATTERNS[OFAUTO.pattern].target(t, to);
    const k = ptSquadPassTo(t, OFAUTO.fam, to, tg[0], tg[1]);
    if (k) { OFAUTO.n++; OFAUTO.cur = { n: OFAUTO.n, from: o, to, fam: OFAUTO.fam, target: [+tg[0].toFixed(2), +tg[1].toFixed(2)], t: now, tech: k.tech, foot: k.foot, done: false };
      OFAUTO.state = "flight"; OFAUTO.ownT = null; }
  }
}
// the reception geometry at the moment a receiver is found stopped beside a ball at rest: why is there no reception?
function ofAutoStuckWhy(t, r) {
  const p = r.p, b = t.b, leg = p.legLen || PT.LEG_REF, R = PT_RECV, fx = Math.cos(p.facing), fy = Math.sin(p.facing);
  const along = (b.x - p.x) * fx + (b.y - p.y) * fy, lat = -(b.x - p.x) * fy + (b.y - p.y) * fx, d = Math.hypot(b.x - p.x, b.y - p.y);
  const comfD = R.comfort * leg + PT_BALL_R, reachD = R.reach * leg + PT_BALL_R;
  const boots = ["R", "L"].map(sd => { const side = (sd === "R" ? 1 : -1) * R.idleLat * leg, ah = R.idleAhead * leg;
    const bx = p.x + fx * ah - fy * side, by = p.y + fy * ah + fx * side; return sd + " " + (Math.hypot(bx - b.x, by - b.y) * 100).toFixed(0) + "cm"; });
  const g = r.aiGoal, gd = g ? Math.hypot(g.x - p.x, g.y - p.y) : null;
  const why = along < R.behind * leg ? "ball BEHIND his body line (" + (along * 100).toFixed(0) + " cm; foot receptions need ≥ " + (R.behind * leg * 100).toFixed(0) + ")"
            : "no boot inside reach";
  return `ball at rest ${(d * 100).toFixed(0)} cm from him (along ${(along * 100).toFixed(0)}, lateral ${(lat * 100).toFixed(0)} cm), standing boots ${boots.join(" / ")} vs comfort ${(comfD * 100).toFixed(0)} / reach ${(reachD * 100).toFixed(0)} cm, ${why}; his move goal ${gd == null ? "none" : (gd * 100).toFixed(0) + " cm away (inside the " + 12 + " cm arrival dead band: " + (gd <= 0.12) + ")"}, assist ${r.assist}, plan ${r.recvPlan ? "yes" : "none"}`;
}
function ofAutoFinish(c, ok, reason, stuck) {
  c.done = true; c.ok = ok; c.reason = reason; c.end = S.pt.now;
  const lr = OFSQ.lastRecv; if (c.recv && lr && lr.tick === c.recv.tick) { c.residual = lr.surf; c.reach = lr.reachApplied; }
  if (ok) OFAUTO.ok++; else { OFAUTO.fail++; OFAUTO.state = "failed"; OFAUTO.failAt = S.pt.now; }
  if (!ok) c.detail = { minD: c.minD != null ? +c.minD.toFixed(3) : null, planSeen: !!c.planSeen, planLost: c.planLost || 0, lastPlan: c.lastPlan ? { foot: c.lastPlan.foot, gap: c.lastPlan.gap, stretch: c.lastPlan.stretch, standing: c.lastPlan.standing } : null };
  OFAUTO.results.push(c); if (OFAUTO.results.length > 200) OFAUTO.results.shift();
  if (stuck) OFAUTO.cases.push({ pattern: OFAUTO_PATTERNS[OFAUTO.pattern].id, n: c.n, tick: S.pt.squad.tick, reason, pass: { from: c.from, to: c.to, target: c.target, fam: c.fam }, detail: c.detail });
}
// the residual for a success is measured by the presentation at the contact tick, one tick after the event is read: fill it in late
function ofAutoPost() { const c = OFAUTO.results[OFAUTO.results.length - 1], lr = OFSQ.lastRecv; if (c && c.recv && c.residual == null && lr && lr.tick === c.recv.tick) { c.residual = lr.surf; c.reach = lr.reachApplied; } }
function ofAutoHud() {
  if (!OFAUTO.on && !OFAUTO.n) return "";
  const t = S.pt, Q = t.squad, c = OFAUTO.cur, P = OFAUTO_PATTERNS[OFAUTO.pattern], nm = (i) => i == null ? "space" : Q ? Q.ctx[i].name : "?";
  const last = OFAUTO.results.slice(-1)[0];
  const lines = [`AUTO PASS   ${OFAUTO.on ? "ON" : "off"}  pattern ${OFAUTO.pattern + 1}/${OFAUTO_PATTERNS.length} ${P.label}  family ${OFAUTO.fam}${OFAUTO.slow ? "  SLOW 0.25x" : ""}   passes ${OFAUTO.n}  ok ${OFAUTO.ok}  failed ${OFAUTO.fail}`];
  if (c) lines.push(`  pass #${c.n}   ${nm(c.from)} -> ${nm(c.to)}   ${c.fam} ${c.tech || ""} ${c.foot || ""}   target (${c.target[0]}, ${c.target[1]})   ${c.done ? (c.ok ? "RECEIVED" : "FAILED") : c.kicked ? "in flight" : "winding up"}`);
  if (last) lines.push(`  last        #${last.n} ${last.ok ? "OK" : "FAIL"}  ${last.recv ? "foot " + last.recv.foot + (last.recv.stretch ? " (stretch)" : "") + "  " : ""}${last.residual != null ? "boot–ball " + (last.residual * 100).toFixed(1) + " cm  " : ""}${last.reason}`);
  return lines.join("\n");
}
window.addEventListener("keydown", (e) => {
  if (typeof OFPLAY === "undefined" || !OFPLAY.on || !S.pt || !S.pt.on) return;
  if (e.target && (e.target.tagName === "INPUT" || e.target.tagName === "SELECT" || e.target.tagName === "BUTTON")) return;
  const k = e.key.toLowerCase();
  if (k === "y") { OFAUTO.on = !OFAUTO.on; if (OFAUTO.on) ofAutoStart(); else { S.pt.slow = 1; OFAUTO.slow = false; S.pt.last = "AUTO PASS off — manual control"; } }
  else if (k === "b" && (OFAUTO.on || S.pt.squad)) { OFAUTO.pattern = (OFAUTO.pattern + 1) % OFAUTO_PATTERNS.length; Object.assign(OFAUTO, { n: 0, ok: 0, fail: 0 }); if (OFAUTO.on) ofAutoStart(); else S.pt.last = "AUTO pattern -> " + OFAUTO_PATTERNS[OFAUTO.pattern].label; }
  else if (k === "=" && (OFAUTO.on || S.pt.squad)) { const F = ["SHORT", "DRIVEN", "THROUGH"]; OFAUTO.fam = F[(F.indexOf(OFAUTO.fam) + 1) % F.length]; S.pt.last = "AUTO family -> " + OFAUTO.fam; }
  else if (k === "-" && OFAUTO.on) { OFAUTO.slow = !OFAUTO.slow; S.pt.slow = OFAUTO.slow ? 0.25 : 1; }
  else return;
  e.preventDefault(); e.stopImmediatePropagation();
}, true);
