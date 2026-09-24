// ═══ pt_squad.js — RECEIVING + PASSING V1: several outfield players and ONE authoritative ball (SIMULATION) ════════════════════════
// The single-player playtest (match.js ptStep) is a port of world.py's Body for one player. This file lets SEVERAL players share its
// ball without a second copy of any law: every player runs the SAME per-player step (ptPlayerStep — input or intent, the locomotion
// limiter, facing, the stride clock, a scheduled kick, the carry law) on his own context, then the keeper, then the ball, once.
// Nothing in the single-player path changes: ptStep only comes here when `t.squad` is set.
//
// WHAT IS NEW IN THE SIMULATION (all of it deterministic, none of it random, none of it reading presentation state):
//   • AIMED PASSES (ptKickAimed): the simulation chooses the receiver and the target point (world.py continuous.py lead targeting), the
//     launch family (SHORT / DRIVEN / THROUGH — world.py FAM, arrival-speed-solved), the technique and the striking foot (the existing
//     ptTech / ptSelectFoot / trivela rule), and the contact instant from the technique's own recovered rhythm (KICK_LIB). At the contact
//     tick the launch is solved from the ball's own position to the target (world.py Body.kick).
//   • RECEPTION REALISED AT A BOOT (ptRecvPlan / ptRecvResolve). world.py receives a ball anywhere inside 0.9 m of the player's CENTRE,
//     which no boot can visibly reach. Here the OUTCOME law is unchanged in kind — world.py interact() applying continuous.py
//     touch_model (CLEAN / HEAVY / LOOSE / DEFLECT, the cushion push p.v·0.7 + dir·1.1) — but WHEN it fires and WHICH foot makes it are
//     decided from the shared boot plan (the same one Dribbling V1 uses): the reception happens when the ball reaches a boot, at a
//     comfortable distance in front of it if it can and at the edge of the leg's reach if it cannot. A ball that never comes within reach
//     of either boot is NOT received — it runs on. A ball behind the body line is not received with the foot. Nothing is rescued.
//   • The touch_model outcome uses a NEUTRAL REFERENCE PROFILE and no noise draw (the neutral / reference execution the V1 brief asks
//     for). The attribute inputs and the draw slot are named where they enter (PT_RECV.ref, `noise`), so Ball Control / Technique /
//     Composure / Reactions and seeded randomness plug in later without changing the architecture.
//   • Off-ball players move by simple deterministic INTENT (hold, support slot, meet the ball, run onto a through ball, shadow a lane)
//     through world.locomote's arrival profile and the SAME limiter keyboard play uses.
const PT_RECV = {
  horizon: 36,          // ticks the reception plan looks ahead (0.6 s): long enough for the body to prepare
  pathTicks: 150,       // ticks of ball path used to find where a receiver can meet the ball (2.5 s)
  reach: 0.36,          // × legLen: boot-plan point → ball CENTRE minus the ball radius, at which a boot can still meet the ball (a stretch)
  comfort: 0.20,        // × legLen: the boot meets the ball here when it can — a comfortable first touch in front of the foot
  behind: -0.10,        // × legLen: a ball further behind the body line than this cannot be received with a foot
  zMax: 0.45,           // m: ball-centre height a FOOT reception is defined for (V1: ground / low balls only — no chest, thigh or head)
  idleAhead: -0.02,     // × legLen: a SETTLED player's boots are at his idle stance (side by side, just behind the root) — not at the frozen
  idleLat: 0.13,        //   gait phase the shared boot plan would give (21 cm ahead), which put every standing reception 20 cm too far out
  approachV: 1.8,       // m/s: an aimed pass's wind-up approaches the ball (world.py KICK intent: locomote toward the ball at 1.8 m/s) — on
  approachTau: 0.18,    //   top of the ball's own velocity, so a kicker on the run keeps pace with a rolling ball instead of braking away from it
  approachBack: 0.55, approachSide: 0.19,   // × legLen: where the body goes — behind the ball on the target line, to the non-striking side
                        //   (the geometry the recovered strike families were validated on: ball ~0.48 m ahead, 0.16 m to the striking side)
  kickReach: 0.80,      // m: a pass is struck only with the ball this close (world.py strikes within 1.0 m); further away the request is
  kickHoldT: 1.0,       //   HELD until the carry brings the ball back, for at most this long (never a strike at a ball the boot cannot reach)
  standV: 1.2,          // m/s: at or below this a receiver is STANDING (either foot can be lifted from his stance; the presentation braces
                        //   the other) — a receiver pulling up to meet the ball is in neither the gait window nor settled otherwise
  winBack: 0.30, winFwd: 0.03,   // cycles: a MOVING player's receiving window (late swing — the foot coming through — to early stance)
  // receiving-foot policy weights (a score; the reach geometry dominates, the rest are preferences, never rules)
  wSoon: 0.02, wStretch: 3.0, wPlanted: 0.8, wSide: 0.8, wTurn: 0.45, wPref: 0.15, wKeep: 0.20,
  // NEUTRAL REFERENCE PROFILE (continuous.py touch_model inputs). Future attribute work replaces these per player — nothing else changes.
  ref: { ball_control: 65, technique: 65, composure: 65, standing_tackle: 50, reactions: 65 },
  cushionV: 1.1,
  faceHoldT: 0.45,      // s: after a controlled first touch the receiver faces the push direction (not the ball's position) this long        // world.py interact CLEAN: the ball kept a step in front, along the cushion direction
  meetV: 3.0,           // m/s: a receiver coming to meet an ordinary pass (a jog)
  runV: 7.0,            // m/s: a receiver running onto a through ball
  runThrough: 3.0,      // m: ... aims this far past where he meets it, so he takes it in stride
  supportV: 3.0,        // m/s: support movement
  directionalDeg: 35,   // a first touch pushed further than this from the facing is a DIRECTIONAL touch (presentation fact)
  runningV: 2.5,        // m/s: a reception at this speed or more is a RUNNING TAKE (presentation fact)
};
// per-player fields of the playtest context (everything ptPlayerStep and the sprite schedulers write on `t`)
const PT_SQ_KEYS = ["p", "kick", "kickInfo", "kickLog", "touchPlan", "dribSeq", "dbgTouch", "ctrlState", "touchN", "touchLog", "touchInfo",
  "presDir", "liveTurn", "lastTouchT", "lastTouchFoot", "lastTouch", "lastFoot", "corr", "contactLog", "charge", "tickN", "looseT", "inDir",
  "gait", "ctrlSince", "corrT", "boots", "pfoot", "kickFbN", "fbN", "dribT", "dribF0", "aiGoal", "recvPlan", "lastRecv", "faceDir"];
const PT_SQ_NOKEYS = Object.freeze({});
function ptSqIn(t, c) { for (const k of PT_SQ_KEYS) t[k] = c[k]; }
function ptSqOut(t, c) { for (const k of PT_SQ_KEYS) c[k] = t[k]; }
const ptWrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
function ptSqCtx(spec, i) {
  const legLen = spec.legLen || PT.LEG_REF;
  return { idx: i, name: spec.name || ("P" + (i + 1)), team: spec.team || 0, char: spec.char || null,
    ai: Object.assign({ mode: "HOLD" }, spec.ai || {}), home: spec.home || [spec.x, spec.y], mark: spec.mark != null ? spec.mark : null,
    assist: false, stunT: 0, vPrev: null, faceHold: null,
    p: { x: spec.x, y: spec.y, vx: spec.vx || 0, vy: spec.vy || 0, facing: spec.facing || 0, touchT: 0, legLen, gaitPhase: 0.08, gaitSettled: true },
    kick: null, kickInfo: null, kickLog: [], touchPlan: null, dribSeq: null, dbgTouch: null, ctrlState: null, touchN: 0, touchLog: [], touchInfo: null,
    presDir: undefined, liveTurn: 0, lastTouchT: undefined, lastTouchFoot: null, lastTouch: null, lastFoot: undefined, corr: undefined, contactLog: undefined,
    charge: null, tickN: 0, looseT: undefined, inDir: null, gait: null, ctrlSince: 0, corrT: undefined, boots: null, pfoot: spec.pfoot || "R",
    kickFbN: 0, fbN: 0, dribT: 0, dribF0: 0, aiGoal: null, recvPlan: null, lastRecv: null, faceDir: null };
}
// ── set up a squad fixture: players (their authoritative state), who has the ball, who you control ────────────────────────────────
// spec = { players: [{ x, y, facing, team, name, ai, home, mark, pfoot, legLen, char }], owner: index | null, active: index,
//          ball: { x, y, vx, vy } (only when owner is null), autoSwitch }
function ptSquadSetup(spec) {
  const t = S.pt; ptReset();
  const Q = t.squad = { ctx: spec.players.map(ptSqCtx), active: spec.active || 0, autoSwitch: spec.autoSwitch !== false, events: [], pass: null,
    shotKick: null, tick: 0, pendingActive: null, pred: new Float64Array(3 * (PT_RECV.pathTicks + 1)), predN: 0, recvRecs: [], spec };
  const b = t.b; b.z = 0; b.vz = 0; b.curve = null; b.held = null; b.exclT = 0; b.exclPid = null; b.lastTeam = null;
  if (spec.owner != null) { const o = Q.ctx[spec.owner].p; b.owner = spec.owner; b.x = o.x + Math.cos(o.facing) * 0.45; b.y = o.y + Math.sin(o.facing) * 0.45; b.vx = o.vx; b.vy = o.vy; b.lastTeam = Q.ctx[spec.owner].team; }
  else { b.owner = null; const s = spec.ball || {}; b.x = s.x != null ? s.x : 52.5; b.y = s.y != null ? s.y : 34; b.vx = s.vx || 0; b.vy = s.vy || 0; }
  ptSqIn(t, Q.ctx[Q.active]); b.ctrl = b.owner === Q.active;
  if (t.gk) { t.gk.x = 104.5; t.gk.y = 34; }
  t.last = "SQUAD — " + Q.ctx.length + " players";
  return Q;
}
function ptSquadEvent(t, e) { const Q = t.squad; e.tick = Q.tick; e.t = +t.now.toFixed(4); Q.events.push(e); if (Q.events.length > 600) Q.events.shift(); }
// ── the tick ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
function ptSquadStep(t) {
  const Q = t.squad, b = t.b, human = t.keys;
  Q.tick++;
  ptSqOut(t, Q.ctx[Q.active]);                                                                  // the resting state holds the controlled player's context
  ptSquadIntents(t);                                                                            // off-ball intent, from the state at the start of the tick
  for (let i = 0; i < Q.ctx.length; i++) {
    const c = Q.ctx[i]; ptSqIn(t, c);
    t.keys = i === Q.active ? human : PT_SQ_NOKEYS;                                             // an ASSISTED receiver's keys are his first-touch intent only (aiGoal moves him)
    b.ctrl = b.owner === i;
    const kicked0 = !!(t.kick && t.kick.kicked);
    ptPlayerStep(t);
    if (t.kick && t.kick.kicked && !kicked0) ptSquadOnKick(t, i, t.kick);
    else if (b.ctrl) b.owner = i;
    else if (b.owner === i) { b.owner = null; ptSquadEvent(t, { kind: "LOOSE", pid: i, note: t.last }); }
    ptSqOut(t, c);
  }
  t.keys = human;
  if (b.owner == null && !b.held) ptSquadReceive(t);
  else for (const c of Q.ctx) c.recvPlan = null;
  if (Q.pendingActive != null) { Q.active = Q.pendingActive; Q.pendingActive = null; }
  const hp = Q.heldPass;                                                                        // a held pass request: struck once the ball is back within reach
  if (hp) { if (t.now > hp.until || b.owner !== hp.pid) Q.heldPass = null;
    else if (hp.pid === Q.active) { ptSqIn(t, Q.ctx[hp.pid]); b.ctrl = true; const o = hp.to != null ? Q.ctx[hp.to].p : null;
      ptSquadPassTo(t, hp.fam, hp.to, o ? o.x + hp.rel[0] : hp.tx, o ? o.y + hp.rel[1] : hp.ty, true); ptSqOut(t, Q.ctx[hp.pid]); } }
  ptSqIn(t, Q.ctx[Q.active]);
  const kSave = t.kick; t.kick = Q.shotKick; ptGkUpdate(t); t.kick = kSave;                      // the keeper reads SHOTS, not passes
  b.ctrl = b.owner != null; ptBallStep(t);
  b.ctrl = b.owner === Q.active;                                                                // between ticks: "the player you control has the ball"
  if (Q.shotKick && t.now > Q.shotKick.end + 1.0) Q.shotKick = null;
}
function ptSquadOnKick(t, i, k) {
  const Q = t.squad, b = t.b, c = Q.ctx[i];
  b.owner = null; b.exclPid = i; b.lastTeam = c.team;
  if (k.aim) {
    Q.pass = Object.assign(Q.pass && Q.pass.pending && Q.pass.from === i ? Q.pass : {}, { from: i, to: k.aim.to, fam: k.fam, kind: k.aim.kind,
      target: [k.aim.x, k.aim.y], kickTick: Q.tick, v0: k.v0, done: false, pending: false, tech: k.tech, foot: k.foot });
    ptSquadEvent(t, { kind: "PASS", pid: i, ball: [b.x, b.y, b.z], to: k.aim.to, fam: k.fam, tech: k.tech, foot: k.foot, v0: +k.v0.toFixed(3), D: +(k.aimD || 0).toFixed(3), target: [+k.aim.x.toFixed(3), +k.aim.y.toFixed(3)], launchDir: +(k.launchDir || 0).toFixed(5) });
    if (k.aim.to != null && Q.autoSwitch && i === Q.active && Q.ctx[k.aim.to].team === c.team) { Q.pendingActive = k.aim.to; Q.ctx[k.aim.to].assist = true; }
  } else { Q.shotKick = k; ptSquadEvent(t, { kind: "SHOT", pid: i, ball: [b.x, b.y, b.z], fam: k.fam, tech: k.tech, foot: k.foot, v0: +k.v0.toFixed(3) }); }
}
// ── off-ball intent ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
function ptSquadIntents(t) {
  const Q = t.squad, b = t.b, ps = Q.pass;
  for (let i = 0; i < Q.ctx.length; i++) {
    const c = Q.ctx[i], p = c.p; c.aiGoal = null;
    // a player the ball is coming to (the called receiver, or anyone holding a reception plan) faces the line it comes along: the
    // ordinary slow-facing law points at the ball's POSITION, which whips the body round as the ball arrives just beside him
    const bs = Math.hypot(b.vx, b.vy);
    c.faceDir = b.owner == null && bs > 1.0 && ((ps && !ps.done && ps.to === i) || c.recvPlan) ? Math.atan2(-b.vy, -b.vx) : null;
    // just after a controlled first touch he faces the way he pushed it (the ball rolls off the side of the receiving boot; chasing its
    // position swung the whole body ~90° and back within a few ticks)
    if (c.faceHold && b.owner === i && t.now < c.faceHold.until) c.faceDir = c.faceHold.dir; else if (c.faceHold && t.now >= c.faceHold.until) c.faceHold = null;
    if (c.assist && (b.owner != null || !ps || ps.done || ps.to !== i)) c.assist = false;          // the assist ends with the pass (received, lost, or another ball)
    if (i === Q.active && !c.assist) continue;                                                  // you drive this one
    if (b.owner === i) continue;                                                                // an AI carrier holds (the carry law settles the ball)
    const incoming = ps && !ps.done && ps.to === i;
    if (incoming && b.owner == null) {
      c.aiGoal = c.ai.mode === "HOLD" ? (c.assist ? { x: p.x, y: p.y, v: 0 } : null) : ptRecvGoal(t, c, ps.fam === "THROUGH" ? PT_RECV.runV : (c.ai.meetV != null ? c.ai.meetV : PT_RECV.meetV));
      // a THROUGH ball is run ONTO: the goal lies beyond the meeting point along the ball's line, so he arrives in stride (a running take)
      // instead of pulling up on the spot and waiting for it
      const bs = Math.hypot(b.vx, b.vy), ahead = (p.x - b.x) * b.vx + (p.y - b.y) * b.vy > 0;   // already ahead of the ball on its line: let it come
      if (c.aiGoal && ps.fam === "THROUGH" && bs > 0.5 && !ahead) { c.aiGoal.x += b.vx / bs * PT_RECV.runThrough; c.aiGoal.y += b.vy / bs * PT_RECV.runThrough; }
      continue; }
    if (incoming && ps.fam === "THROUGH" && b.owner === ps.from) { c.aiGoal = { x: ps.target[0], y: ps.target[1], v: PT_RECV.runV }; continue; }   // the run starts with the decision
    const m = c.ai.mode;
    if (m === "SUPPORT") {                                                                      // a home slot shifted toward the ball; a dead band so nobody jitters
      const gx = c.home[0] + 0.35 * (b.x - Q.spec.center[0]), gy = c.home[1] + 0.35 * (b.y - Q.spec.center[1]);
      if (Math.hypot(gx - p.x, gy - p.y) > 1.0) c.aiGoal = { x: gx, y: gy, v: PT_RECV.supportV };
    } else if (m === "SHADOW" && c.mark != null) {                                              // a passive defender standing in a passing lane (no tackling)
      const a = Q.ctx[c.mark].p, gx = a.x + 0.38 * (b.x - a.x), gy = a.y + 0.38 * (b.y - a.y);
      if (Math.hypot(gx - p.x, gy - p.y) > 0.6) c.aiGoal = { x: gx, y: gy, v: PT_RECV.supportV };
    } else if (m === "SCRIPT" && c.ai.path) {                                                   // review fixtures: a timed list of goal points
      let g = null; for (const w of c.ai.path) if (t.now >= w.t) g = w; if (g) c.aiGoal = { x: g.x, y: g.y, v: g.v };
    }
  }
}
// ── the ball path (shared by every receiver this tick): the free-ball integrator, without curve / goal / net / keeper ─────────────
function ptSquadPredict(t, n) {
  const Q = t.squad, b = t.b, P = Q.pred; let x = b.x, y = b.y, z = b.z, vx = b.vx, vy = b.vy, vz = b.vz;
  P[0] = x; P[1] = y; P[2] = z;
  for (let k = 1; k <= n; k++) {
    x += vx * PT_DT; y += vy * PT_DT; z += vz * PT_DT;
    if (z > 0) vz -= PT.G * PT_DT;
    if (z <= 0) { if (vz < 0) { const r = -vz * PT.REST; if (r < PT.SETTLE) vz = 0; else { vz = r; vx *= PT.KEEP; vy *= PT.KEEP; } } z = Math.max(0, z); }
    const sp = Math.hypot(vx, vy); if (sp > 0) { const ns = Math.max(0, sp - (z > 0.05 ? PT.MU_AIR : PT.MU_ROLL) * PT_DT); vx *= ns / sp; vy *= ns / sp; }
    P[3 * k] = x; P[3 * k + 1] = y; P[3 * k + 2] = z;
  }
  Q.predN = n;
}
// where a receiver can meet the ball: the earliest point of its path he can reach in time (a simple time-to-cover model), else where it stops
function ptRecvGoal(t, c, v) {
  const Q = t.squad, P = Q.pred, p = c.p, N = Q.predN, off = PT_RECV.comfort * (p.legLen || PT.LEG_REF) + PT_BALL_R;
  for (let k = 0; k <= N; k++) {
    const dx = P[3 * k] - p.x, dy = P[3 * k + 1] - p.y, d = Math.max(0, Math.hypot(dx, dy) - off - 0.25);
    if (d / v + 0.20 <= k * PT_DT) return { x: P[3 * k], y: P[3 * k + 1], v };
  }
  return { x: P[3 * N], y: P[3 * N + 1], v };
}
// ── RECEPTION: plan (which boot, when, where) for every candidate, then resolve the one that meets the ball this tick ─────────────
function ptSquadReceive(t) {
  const Q = t.squad, b = t.b;
  ptSquadPredict(t, PT_RECV.pathTicks);
  let best = null;
  for (let i = 0; i < Q.ctx.length; i++) {
    const c = Q.ctx[i];
    if (c.kick || (b.exclPid === i && t.now < b.exclT) || c.stunT > t.now) { if (c.recvPlan) c.recvPlan = null; continue; }
    const had = c.recvPlan;
    const pl = c.recvPlan = ptRecvPlan(t, c);
    if (had && !pl && Q.pass && !Q.pass.done && Q.pass.to === i) ptSquadEvent(t, { kind: "OUT_OF_REACH", pid: i, foot: had.foot, gap: had.gap });
    if (pl && pl.k === 0 && (!best || pl.d < best.pl.d)) best = { i, pl };
  }
  if (best) ptRecvResolve(t, best.i, best.pl);
}
function ptRecvPlan(t, c) {
  const R = PT_RECV, Q = t.squad, P = Q.pred, p = c.p, leg = p.legLen || PT.LEG_REF, v = Math.hypot(p.vx, p.vy);
  const G = (typeof ofLocoParams === "function") ? ofLocoParams(v) : { step: 1, stance: 0.45 };
  // a receiver BRAKING into position (the arrival profile) is predicted to keep braking: his speed, position, stride clock and whether he is
  // STANDING are evaluated per look-ahead tick. Without this the plan switched model (and foot) the tick he dropped below standV.
  const decel = c.vPrev != null ? Math.max(0, Math.min(PT.BRAKE_PLANT, (c.vPrev - v) / PT_DT)) : 0; c.vPrev = v;
  const vAt = (k) => Math.max(0, v - decel * k * PT_DT), sAt = (k) => (v + vAt(k)) / 2 * k * PT_DT;   // speed and distance covered by tick k
  const ux = v > 1e-6 ? p.vx / v : 0, uy = v > 1e-6 ? p.vy / v : 0;
  const step = G.step * leg, settledNow = !!p.gaitSettled || v <= R.standV;
  const dirA = v > 0.3 ? Math.atan2(p.vy, p.vx) : p.facing, dx = Math.cos(dirA), dy = Math.sin(dirA), lx = -dy, ly = dx;
  const fx = Math.cos(p.facing), fy = Math.sin(p.facing);
  const reachD = R.reach * leg + PT_BALL_R, comfD = R.comfort * leg + PT_BALL_R, lat = (typeof OF_BOOT !== "undefined" ? OF_BOOT.lat : 0.198) * leg;
  const F = { R: { k: -1, d: 1e9, km: -1, dm: 1e9 }, L: { k: -1, d: 1e9, km: -1, dm: 1e9 } };
  const K = Math.min(R.horizon, Q.predN - 1);
  const bootAt = (k, sd, out) => {                                                              // the boot at tick k (null when it cannot play the ball)
    const settled = settledNow || vAt(k) <= R.standV, cadK = step > 1e-6 ? (v + vAt(k)) / 2 / step : 0;
    const ph = settled ? p.gaitPhase : (p.gaitPhase + k * PT_DT * cadK / 2) % 1, p0 = sd === "R" ? 0 : 0.5, up = (((ph - p0) % 1) + 1) % 1;
    // a MOVING player plays the ball with a boot coming through (late swing to early stance) — mid-swing it is high and behind, and in
    // mid-stance it bears his weight. A settled player can lift either foot from his stance.
    if (!settled) { const dc = up > 0.5 ? up - 1 : up; if (dc < -R.winBack || dc > R.winFwd) return null; }
    const rx = p.x + ux * sAt(k), ry = p.y + uy * sAt(k);
    // LATERAL SIDE: the RIGHT boot is on (−dirY, dirX) — the side the rig renders it on, and world.py's own convention (select_kick_foot:
    // + = right). The shared boot plan (ofBootPlan, Dribbling V1) has this sign MIRRORED; it is left untouched so Dribbling V1's outcomes do
    // not move, and this planner uses the rig-correct side (measured: facing E / W / S the rendered right ankle is on this side, ±1 cm).
    const ah = settled ? R.idleAhead * leg : (typeof ofBootAhead === "function" ? ofBootAhead(ph, p0, G.stance) : 0) * leg, side = (sd === "R" ? 1 : -1) * (settled ? R.idleLat * leg : lat);
    out[0] = rx + dx * ah + lx * side; out[1] = ry + dy * ah + ly * side; out[2] = rx; out[3] = ry; out[4] = !settled && up < G.stance && up > R.winFwd ? 1 : 0; out[5] = settled ? 1 : 0; return out;
  };
  const A0 = [0, 0, 0, 0, 0, 0], A1 = [0, 0, 0, 0, 0, 0];
  for (let k = 0; k < K; k++) {
    for (const sd of ["R", "L"]) {
      const f = F[sd]; if (f.k >= 0) continue;
      const a0 = bootAt(k, sd, A0), a1 = bootAt(k + 1, sd, A1); if (!a0 || !a1) continue;
      // continuous closest approach over the tick (a fast ball crosses the reach zone between two samples)
      const r0x = a0[0] - P[3 * k], r0y = a0[1] - P[3 * k + 1], r1x = a1[0] - P[3 * k + 3], r1y = a1[1] - P[3 * k + 4], ddx = r1x - r0x, ddy = r1y - r0y, dd = ddx * ddx + ddy * ddy;
      const sm = dd > 1e-12 ? Math.max(0, Math.min(1, -(r0x * ddx + r0y * ddy) / dd)) : 0, dmin = Math.hypot(r0x + sm * ddx, r0y + sm * ddy);
      // the contact tick: comfort-zone ENTRY (already inside at tick k → k, entered during the tick → k + 1); a stretch is taken at the
      // closest approach. (Firing at the closest approach of a ball that is still coming in postponed the contact every tick until the
      // ball was under the boot.)
      const d0 = Math.hypot(r0x, r0y), kf = d0 <= comfD ? k : dmin <= comfD ? k + 1 : (sm > 0.5 ? k + 1 : k), A = kf === k ? a0 : a1, bx = P[3 * kf], by = P[3 * kf + 1], bz = P[3 * kf + 2];
      if (bz > R.zMax) continue;
      if ((bx - A[2]) * fx + (by - A[3]) * fy < R.behind * leg) continue;                        // behind the body line
      const d = Math.hypot(A[0] - bx, A[1] - by);
      if (dmin <= comfD) { f.k = kf; f.d = d; f.boot = [A[0], A[1]]; f.ball = [bx, by, bz]; f.planted = !!A[4]; f.standing = !!A[5]; }
      else if (dmin <= reachD && dmin < f.dm) { f.km = kf; f.dm = dmin; f.md = d; f.mboot = [A[0], A[1]]; f.mball = [bx, by, bz]; f.mplanted = !!A[4]; f.mstanding = !!A[5]; }
    }
    if (F.R.k >= 0 && F.L.k >= 0) break;
  }
  let best = null;
  const inc = Math.hypot(t.b.vx, t.b.vy) > 0.3 ? Math.atan2(t.b.vy, t.b.vx) : null;
  for (const sd of ["R", "L"]) {
    const f = F[sd]; let k = f.k, d = f.d, boot = f.boot, ball = f.ball, planted = f.planted, standing = f.standing, stretch = false;
    if (k < 0) { if (f.km < 0) continue; k = f.km; d = f.md; boot = f.mboot; ball = f.mball; planted = f.mplanted; standing = f.mstanding; stretch = true; }
    const side = sd === "R" ? 1 : -1;
    const rx = p.x + ux * sAt(k), ry = p.y + uy * sAt(k);
    const latBall = -(ball[0] - rx) * fy + (ball[1] - ry) * fx;                                  // + = the ball arrives on the player's RIGHT (rig / world.py convention)
    let sc = -k * R.wSoon - Math.max(0, (stretch ? f.dm : d) - comfD) * R.wStretch;
    if (planted) sc -= R.wPlanted;                                                              // a boot bearing weight has to be unloaded first
    sc += Math.max(-0.5, Math.min(0.5, latBall * side * 1.6)) * R.wSide;                       // the ball's own side
    if (c.inDir != null && inc != null) {                                                       // a directional touch across the body is made with the far foot's inside (turn + = toward his right)
      const turn = ptWrap(c.inDir - (inc + Math.PI)); sc += Math.max(-0.4, Math.min(0.4, turn * side * -0.5)) * R.wTurn;
    }
    if (sd === (c.pfoot || "R")) sc += R.wPref;                                                  // preferred foot: a bias, not a rule
    if (c.recvPlan && c.recvPlan.foot === sd) sc += R.wKeep;                                    // a plan does not flip-flop tick to tick
    if (!best || sc > best.sc) best = { foot: sd, k, standing, d: +d.toFixed(4), gap: +(d - comfD).toFixed(4), stretch, planted, sc: +sc.toFixed(4),
      ball: [+ball[0].toFixed(4), +ball[1].toFixed(4), +ball[2].toFixed(4)], boot: [+boot[0].toFixed(4), +boot[1].toFixed(4)],
      at: +(t.now + k * PT_DT).toFixed(4), fireTick: Q.tick + k };
  }
  return best;
}
// continuous.py touch_model with the neutral reference profile and no noise draw (the draw slot is `noise`)
function ptRecvOutcome(t, c, rv, z, hostile) {
  const b = t.b, p = c.p, A = c.attrs || PT_RECV.ref, n01 = (x) => Math.max(0, Math.min(1, x / 100)), noise = 0;
  if (rv >= 15.0) return { kind: "DEFLECT", ang: Math.atan2(b.y - p.y, b.x - p.x), ln: rv * 0.5, q: null };
  let press = 0; for (const o of t.squad.ctx) if (o.team !== c.team) { const d = Math.hypot(o.p.x - p.x, o.p.y - p.y); if (d < 4.0) press = Math.max(press, 1 - d / 4); }
  const difficulty = 0.06 + rv * 0.032 + Math.min(z, 1.5) * 0.10 + press * 0.22;
  const inc = rv > 1.0 ? Math.atan2(b.vy, b.vx) : p.facing;
  if (hostile) {
    const skill = 0.40 * n01(A.ball_control) + 0.30 * n01(A.standing_tackle) + 0.30 * n01(A.reactions), q = skill - difficulty + noise * 0.14;
    if (q > 0.30 && rv < 9.0) return { kind: "CLEAN", q, skill, difficulty, press };
    c.stunT = Math.max(c.stunT || 0, t.now + 0.22);
    if (q > -0.05) { const gx = c.team === 0 ? 105 : 0; return { kind: "LOOSE", ang: Math.atan2(34 - p.y, gx - p.x), ln: Math.min(2.0 + rv * 0.22, Math.max(rv, 2.0)), q, skill, difficulty, press }; }
    return { kind: "DEFLECT", ang: inc, ln: Math.max(1.5, rv * 0.40), q, skill, difficulty, press };
  }
  const skill = 0.55 * n01(A.ball_control) + 0.25 * n01(A.technique) + 0.20 * n01(A.composure), q = skill - difficulty + noise * 0.10;
  if (q > 0.12) return { kind: "CLEAN", q, skill, difficulty, press };
  // HEAVY: 0.6 of the incoming line and 0.4 of the facing (continuous.py; blended on the circle so it cannot wrap through ±π)
  if (q > -0.12) return { kind: "HEAVY", ang: Math.atan2(0.6 * Math.sin(inc) + 0.4 * Math.sin(p.facing), 0.6 * Math.cos(inc) + 0.4 * Math.cos(p.facing)), ln: 2.2 + rv * 0.18, q, skill, difficulty, press };
  return { kind: "LOOSE", ang: inc, ln: rv * 0.35 + 1.0, q, skill, difficulty, press };
}
function ptRecvResolve(t, i, pl) {
  const Q = t.squad, b = t.b, c = Q.ctx[i], p = c.p;
  const pre = { x: b.x, y: b.y, z: b.z, vx: b.vx, vy: b.vy, vz: b.vz };
  const rv = Math.hypot(b.vx - p.vx, b.vy - p.vy);
  const hostile = b.lastTeam != null && b.lastTeam !== c.team;
  const o = ptRecvOutcome(t, c, rv, b.z, hostile);
  let dir = null, style = null;
  if (o.kind === "CLEAN") {
    // world.py interact CLEAN: the ball a step in front along the cushion direction. The cushion direction is the receiver's INTENDED
    // direction when he has one (the held input — authoritative) and world.py's facing otherwise.
    dir = c.inDir != null ? c.inDir : p.facing;
    b.vx = p.vx * 0.7 + Math.cos(dir) * PT_RECV.cushionV; b.vy = p.vy * 0.7 + Math.sin(dir) * PT_RECV.cushionV;
    if (b.z > 0 && b.z < 1.6) b.vz = Math.min(b.vz, 0.4);
    b.owner = i; b.curve = null; p.touchT = 0.30; c.faceHold = { dir, until: t.now + PT_RECV.faceHoldT }; c.ctrlSince = t.now; c.touchPlan = null; c.lastTouchFoot = pl.foot; c.lastTouchT = t.now;
    const v = Math.hypot(p.vx, p.vy);
    style = v >= PT_RECV.runningV ? "RUNNING" : Math.abs(ptWrap(dir - p.facing)) * 180 / Math.PI > PT_RECV.directionalDeg ? "DIRECTIONAL" : "CUSHION";
  } else {
    b.vx = Math.cos(o.ang) * o.ln + p.vx * (o.kind === "HEAVY" ? 0.5 : o.kind === "LOOSE" ? 0.4 : 0);
    b.vy = Math.sin(o.ang) * o.ln + p.vy * (o.kind === "HEAVY" ? 0.5 : o.kind === "LOOSE" ? 0.4 : 0);
    b.vz = o.kind === "DEFLECT" ? Math.max(0.5, b.vz * 0.4) : Math.min(b.vz, o.kind === "HEAVY" ? 0.5 : 0.8);
    b.exclPid = i; b.exclT = t.now + (o.kind === "HEAVY" ? 0.10 : o.kind === "LOOSE" ? 0.12 : 0.35); b.curve = null;
    style = o.kind;
  }
  b.lastTeam = c.team;
  const rec = { kind: "RECEPTION", pid: i, outcome: o.kind, style, hostile, foot: pl.foot, stretch: pl.stretch, planted: pl.planted, d: pl.d, gap: pl.gap,
    point: [pre.x, pre.y, pre.z], boot: pl.boot, vIn: [+pre.vx.toFixed(4), +pre.vy.toFixed(4)], rv: +rv.toFixed(3),
    vOut: [+b.vx.toFixed(4), +b.vy.toFixed(4)], dir: dir != null ? +dir.toFixed(4) : null, q: o.q != null ? +o.q.toFixed(4) : null,
    pv: [+p.vx.toFixed(4), +p.vy.toFixed(4)], facing: +p.facing.toFixed(4), from: Q.pass && !Q.pass.done ? Q.pass.from : null };
  c.lastRecv = rec; ptSquadEvent(t, rec);
  if (Q.pass && !Q.pass.done) Q.pass.done = true;
  c.assist = false;
  if (o.kind === "CLEAN") {
    ptSquadEvent(t, { kind: "POSSESSION", pid: i, team: c.team });
    if (Q.autoSwitch && c.team === Q.ctx[Q.active].team) Q.pendingActive = i;
  }
  t.last = (o.kind === "CLEAN" ? style + " first touch" : o.kind + " touch") + " — " + c.name + " (" + pl.foot + ")" + (pl.stretch ? " stretching" : "");
}
// ── controls (the harness calls these; they are the only way a pass is requested) ───────────────────────────────────────────────
function ptSquadIntentDir(t) {
  const k = t.keys; let dx = 0, dy = 0; if (k.up) dy -= 1; if (k.down) dy += 1; if (k.left) dx -= 1; if (k.right) dx += 1;
  return (dx || dy) ? Math.atan2(dy, dx) : t.p.facing;
}
// choose the receiver in the direction asked for (the best-aligned team-mate inside ±75°), else pass into space along it
function ptSquadPass(t, fam, dirOverride) {
  const Q = t.squad; if (!Q) return null; const i = Q.active, c = Q.ctx[i], p = t.p, b = t.b;
  if (!b.ctrl || t.kick) return null;
  const dir = dirOverride != null ? dirOverride : ptSquadIntentDir(t);
  let to = null, bs = -1e9;
  for (let j = 0; j < Q.ctx.length; j++) {
    const o = Q.ctx[j]; if (j === i || o.team !== c.team) continue;
    const rx = o.p.x - p.x, ry = o.p.y - p.y, dist = Math.hypot(rx, ry), cs = Math.cos(ptWrap(Math.atan2(ry, rx) - dir));
    if (cs < Math.cos(75 * Math.PI / 180) || dist < 2) continue;
    const sc = cs - dist / 60; if (sc > bs) { bs = sc; to = j; }
  }
  let tx, ty;
  if (to != null) {
    const o = Q.ctx[to].p;
    if (fam === "THROUGH") { const u = [Math.cos(dir), Math.sin(dir)]; tx = o.x + u[0] * 6; ty = o.y + u[1] * 6; }
    else { const lead = Math.max(0.2, Math.min(1.1, Math.hypot(o.x - p.x, o.y - p.y) / 16)); tx = o.x + o.vx * lead; ty = o.y + o.vy * lead; }   // continuous.py lead
  } else { const D = fam === "DRIVEN" ? 18 : fam === "THROUGH" ? 16 : 12; tx = p.x + Math.cos(dir) * D; ty = p.y + Math.sin(dir) * D; }
  return ptSquadPassTo(t, fam, to, tx, ty);
}
// the pass itself, to an explicit point (the key-driven selection above and the review fixtures both come through here)
function ptSquadPassTo(t, fam, to, tx, ty, held) {
  const Q = t.squad, i = Q.active; if (!t.b.ctrl || t.kick) return null;
  if (Math.hypot(t.b.x - t.p.x, t.b.y - t.p.y) > PT_RECV.kickReach) {                          // the ball is out in front of him: the request waits for the carry
    if (!held) { Q.heldPass = { pid: i, fam, to, rel: to != null ? [tx - Q.ctx[to].p.x, ty - Q.ctx[to].p.y] : null, tx, ty, until: t.now + PT_RECV.kickHoldT }; ptSquadEvent(t, { kind: "PASS_HELD", pid: i, to, fam }); t.last = "PASS HELD — ball not at his feet yet"; }
    return null; }
  Q.heldPass = null;
  tx = Math.max(0.5, Math.min(104.5, tx)); ty = Math.max(0.5, Math.min(67.5, ty));
  const label = (fam === "SHORT" ? "PASS" : fam === "DRIVEN" ? "DRIVEN PASS" : "THROUGH PASS") + (to != null ? " -> " + Q.ctx[to].name : " into space");
  ptKick(fam, label, null, null, null, null, { x: tx, y: ty, to, kind: fam });
  if (t.kick && t.kick.aim) { Q.pass = { from: i, to, fam, kind: fam, target: [tx, ty], decidedTick: Q.tick, done: false, pending: true }; ptSquadEvent(t, { kind: "PASS_DECIDED", pid: i, to, fam, tech: t.kick.tech, foot: t.kick.foot, kickAt: +t.kick.kickAt.toFixed(4) }); }
  return t.kick;
}
// an AIMED pass: technique and striking foot from the existing rules, the contact instant from the technique's own recovered rhythm
function ptKickAimed(t, fam, label, aim) {
  const p = t.p, b = t.b, tx = aim.x, ty = aim.y, D = Math.max(0.5, Math.hypot(tx - b.x, ty - b.y));
  const [v0, vz] = ptFam(fam, D);
  const sel = ptSelectFoot(t, tx, ty);
  let tech = ptTech(fam, D, v0);
  if ((tech === "INSIDE" || tech === "LACES") &&
      ((sel.foot === "R" && sel.lat > -0.05 && sel.dtg > 0.26 && sel.dtg < 0.88) ||
       (sel.foot === "L" && sel.lat < 0.05 && sel.dtg < -0.26 && sel.dtg > -0.88))) tech = "OUTSIDE";   // world.py trivela_plausible
  // the rhythm is the technique's (its contact frame at its own fps), not the sprite library's art coverage for this screen direction
  const ent = ptKickEntry(tech, sel.foot, false), e = ent.e || KICK_LIB.INSIDE_R;
  const f0 = Math.hypot(p.vx, p.vy) > 2.0 ? Math.max(0, e.contact - 3) : 0;
  const kickAt = t.now + (e.contact - f0) / e.fps;
  t.kick = { t0: t.now, kickAt, end: t.now + (e.n - f0) / e.fps + 0.12, fam, v0, vz, dir: Math.atan2(ty - b.y, tx - b.x), kicked: false, tech, foot: sel.foot, f0,
             key: ent.key, e, mirror: false, artFoot: ent.artFoot, fb: ent.fb, label, charge: null, tgtD: null,
             aim: { x: tx, y: ty, to: aim.to != null ? aim.to : null, kind: aim.kind || fam } };
  t.kickInfo = { pfoot: t.pfoot || "R", foot: sel.foot, tech, fam, asset: e.set || "none", contactFoot: sel.foot, fb: ent.fb, noAnim: false,
                 v0: +v0.toFixed(2), vz: +vz.toFixed(2), tgtDeg: +((Math.atan2(ty - b.y, tx - b.x) * 57.296 % 360 + 360) % 360).toFixed(0), aimD: +D.toFixed(2) };
  t.last = label + " (" + tech + " " + sel.foot + ")";
  return t.kick;
}
// switch the controlled player (nearest team-mate to the ball, or the next one)
function ptSquadSwitch(t, to) {
  const Q = t.squad; if (!Q) return; const b = t.b;
  if (to == null) { let bd = 1e9; const tm = Q.ctx[Q.active].team;
    for (const c of Q.ctx) { if (c.idx === Q.active || c.team !== tm) continue; const d = Math.hypot(c.p.x - b.x, c.p.y - b.y); if (d < bd) { bd = d; to = c.idx; } } }
  if (to == null || to === Q.active) return;
  ptSqOut(t, Q.ctx[Q.active]); Q.ctx[Q.active].assist = false; Q.active = to; ptSqIn(t, Q.ctx[to]); b.ctrl = b.owner === to;
  t.last = "CONTROL -> " + Q.ctx[to].name;
}
if (typeof module !== "undefined" && module.exports) module.exports = { PT_RECV, ptSquadSetup, ptSquadStep };
