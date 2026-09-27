// ═══ pt_defend.js — DEFENDING V1 on the squad playtest (SIMULATION) ═════════════════════════════════════════════════════════════════
// Active only in drills flagged `defending` (Q.spec.defending); every other squad fixture runs exactly as before.
// The simulation decides everything a defensive action does: whether it is attempted, its timing, its target, whether a boot reaches
// the ball, whether the defender's body meets the attacker, what the ball does and who has it afterwards. The presentation explains.
//
// RECOVERED, NOT REINVENTED. The authoritative match model (continuous.py §9 maybe_challenge) already resolves a tackle's RESULT from one
// quality term — the tackler's standing_tackle / reactions, the ball's EXPOSURE (how far it is from the carrier), minus the carrier's
// strength / balance, plus a seeded execution draw — with the thresholds WON > 0.30 > 50-50 poke > −0.05 > miss. That law is ported here
// unchanged in shape. What it lacked is PHYSICS: in the match model a challenge anywhere within 1.35 m of the ball simply re-aims the ball.
// Here a challenge is an ACTION with a contact instant, a tackling boot and a reach; the quality law only runs if that boot actually meets
// the ball. Neutral reference profile, no noise draw (the slot is named), exactly like Receiving V1.
//   • OCCUPANCY — world.py's PLAYER PHYSICAL OCCUPANCY V1 (0.32 m body discs: closing velocity removed, positional Jacobi mop-up).
//   • JOCKEY — a containment movement mode: the facing held on the ball carrier at any speed, desired speed capped; ordinary locomotion.
//   • STANDING TACKLE — plant and challenge: a short lunge, a contact tick, a reach from the tackling-side hip; WON / POKE / BEATEN / MISS.
//   • SLIDE TACKLE — an authoritative slide: launch speed from the player's own speed, uniform deceleration (distance emerges), a boot swept
//     ahead of the body every tick, then the ground and a get-up: a long, real commitment.
//   • Interception is the existing boot-realised reception (hostile outcome branch) — not duplicated.
//   • Fouls: NOT called (the playtest has no referee). Every challenge records the facts continuous.py _adjudicate_foul consumes.
const PT_DEF = {
  bodyR: 0.32, occIters: 8, occTol: 0.005,                    // world.py OCCUPANCY V1
  jockeyV: 2.6,                                                // m/s: desired-speed cap while jockeying (a side-shuffle / back-pedal)
  stand: { windT: 0.20, lungeV: 1.6, reach: 0.72, behind: -0.10, zMax: 0.45, recoverWin: 0.30, recoverFail: 0.55, recoverV: 1.2, cooldown: 0.9 },
  slide: { windT: 0.10, vAdd: 1.0, vMin: 4.2, vMax: 7.5, decel: 5.5, reachAhead: 1.12, legFrom: 0.46, legLat: 0.11, extT: 0.12, footR: 0.08, sub: 4, planTicks: 12, zMax: 0.40, groundT: 0.25, getupT: 0.85, recoverV: 1.2, recoverT: 0.35, contactVmin: 1.0,
    // SLIDE CONTACT GEOMETRY V1.2 — the researched side-on slide (chase → drop → sweep): the NEAR leg (the ball's side) leads, sinks and curls
    // under the seat — he slides on that hip / outer thigh — and the FAR leg is the tackling leg, swinging round in a wide sweep ACROSS his body
    // toward the ball. rule "far" = V1.2; rule "near" = the V1 geometry (near leg straight along the slide), kept only as the diagnostic
    // counterfactual. The sweep is a fixed kinematic law after the drop (a commitment, never aimed at the ball): th0 → th1 toward the tucked
    // side, starting t0 after the launch and lasting T; its amplitude is th1 when the ball is genuinely BESIDE the slide line (SWEEP) and
    // block1 when it is on the line (BLOCK, the straight block slide — the same top leg, barely coming across). Lying on the near hip puts the
    // top (far) hip nearly over the pelvis: hipF behind the root and hipLat toward the tackling side. pelvisK: the body turns with the sweep.
    rule: "far", sweep: { hipF: -0.08, hipLat: 0.05, th0: 0.0, th1: 1.31, block1: 0.30, sweepLat: 0.35, t0: 0.04, T: 0.20, pelvisK: 0.30 },   // pelvisK: the body turns with the sweep (hip rotation drives it)
    // swept ball contact: sub-steps so that neither the leg's points nor the ball move more than `step` relative to each other per sub-step
    ccd: { minSub: 4, maxSub: 32, step: 0.035 },
    // the tackling boot's contact radius about the leg's axis: the rendered boot's half-thickness (V1: 0.08), so a V1.2 contact is a touch you see
    footR12: 0.05,
    // the far leg's reach, hip → toe tip, as the rendered Astra leg + boot measures it swept out on the pitch (1.16 m for a 0.865 m leg); V1's
    // reachAhead matched V1's straight near-leg pose
    reachAhead12: 1.25,
    // the ball's response to the leg (contact point + normal + the leg's own velocity there): the leg's effective mass against the ball's,
    // restitution by technique (a hook / sweep-through carries the ball with the foot; a poke knocks it away), Coulomb-limited tangential drag
    ball: { mBall: 0.43, legMassFrac: 0.0755, e: { WON: 0.15, POKE: 0.50 }, muT: 0.30, glanceV: 1.0 } },
  // continuous.py §9 thresholds and weights (execution quality); `noise` is the seeded draw slot (0 = neutral reference execution)
  q: { won: 0.30, poke: -0.05, behind: -0.20, stretchFrom: 0.60, stretch: -0.25, slideBonus: 0.10, slideBehind: -0.30, shin: -0.15 },
  ref: { standing_tackle: 60, sliding_tackle: 60, reactions: 60, strength: 60, balance: 60, defensive_awareness: 60, interceptions: 60, aggression: 60 },
  won: { standV: 1.4, slideK: 0.6, slideAdd: 1.5 }, poke: { standV: 4.0, slideK: 0.4, slideAdd: 2.0, ang: 0.5, slideAng: 0.7 },
  ai: { stepMin: 0.95, stepRate: 0.5, containDist: 1.7, engageDist: 6.0, tackleExpose: 0.22, tackleReachK: 0.9, contactV: 4.0 },
};
const ptN01 = (x) => Math.max(0, Math.min(1, x / 100));
function ptDefAttrs(c) { return Object.assign({}, PT_DEF.ref, c.attrs || {}); }
function ptDefOn(t) { return !!(t.squad && t.squad.spec && t.squad.spec.defending); }
// ── movement override for ptPlayerStep (match.js): only for a player with a defensive action or a jockey intent ─────────────────
// returns null (ordinary play) or { lock: input ignored, v: [vx,vy] authoritative velocity this tick, vDes: desired velocity through the
// ordinary limiter, vmax: desired-speed cap, facing: facing target at any speed }
function ptDefMotion(t) {
  if (!ptDefOn(t)) return null;
  const Q = t.squad, c = Q.ctx[Q.cur], d = c.def, p = t.p, b = t.b, now = t.now, S = PT_DEF.slide, T = PT_DEF.stand;
  if (c.react && typeof ptRxMotion === "function") { const rx = ptRxMotion(t, c); if (rx) return rx; }   // TACKLED-PLAYER V1: a reaction owns his movement
  if (d && d.kind === "SLIDE") {
    if (now < d.launchAt) return { lock: true, v: [p.vx, p.vy], facing: d.dir };                 // the drop into the slide: no new input, his momentum carries
    if (d.vNow > 0) {                                                                              // SLIDING: authoritative uniform deceleration
      const v = d.vNow; d.vNow = Math.max(0, d.vNow - S.decel * PT_DT); if (d.vNow === 0) d.stopAt = now;
      return { lock: true, v: [Math.cos(d.dir) * v, Math.sin(d.dir) * v], facing: d.dir };
    }
    if (now < d.stopAt + S.groundT + S.getupT) return { lock: true, v: [0, 0], facing: d.dir };   // on the ground, then getting up
    if (now < d.stopAt + S.groundT + S.getupT + S.recoverT) return { vmax: S.recoverV };           // back on his feet, not yet at pace
    c.def = null; return null;
  }
  if (d && d.kind === "STAND") {
    if (!d.resolved) {                                                                              // the lunge: a short step onto the ball
      const dx = b.x - p.x, dy = b.y - p.y, m = Math.hypot(dx, dy) || 1, sp = Math.min(T.lungeV, m * 4);
      return { lock: true, vDes: [dx / m * sp, dy / m * sp], facing: Math.atan2(dy, dx) };
    }
    if (now < d.recoverUntil) return { vmax: T.recoverV };                                         // recovery after the challenge
    c.def = null; return null;
  }
  const jk = (t.keys && t.keys.jockey) || c.aiJockey;
  if (jk && !b.ctrl) {                                                                              // JOCKEY: face the carrier (or the ball), controlled speed
    const o = b.owner != null ? Q.ctx[b.owner].p : null, fx = o ? o.x : b.x, fy = o ? o.y : b.y;
    return { vmax: PT_DEF.jockeyV, facing: Math.atan2(fy - p.y, fx - p.x), jockey: true };
  }
  return null;
}
// ── action requests (keys / AI / demos call these; they are the only way a defensive action starts) ─────────────────────────────
function ptDefBusy(c, now) { return !!(c.def || c.kick || (c.defCool && now < c.defCool)); }
function ptDefStand(t, i) {
  const Q = t.squad; if (!ptDefOn(t)) return null; const c = Q.ctx[i], b = t.b, now = t.now;
  if (b.owner === i || ptDefBusy(c, now)) return null;
  const p = c.p, fx = Math.cos(p.facing), fy = Math.sin(p.facing), rx = -fy, ry = fx;               // his right (rig / world.py convention)
  const lat = (b.x - p.x) * rx + (b.y - p.y) * ry, foot = lat >= 0 ? "R" : "L";                  // the boot on the ball's side (no preferred-foot rule)
  c.def = { kind: "STAND", t0: now, contactAt: now + PT_DEF.stand.windT, foot, target: [b.x, b.y], resolved: false };
  c.defCool = now + PT_DEF.stand.cooldown;
  ptSquadEvent(t, { kind: "TACKLE_START", pid: i, type: "STAND", foot, ball: [+b.x.toFixed(3), +b.y.toFixed(3)] });
  return c.def;
}
function ptDefSlide(t, i, dirIn) {
  const Q = t.squad; if (!ptDefOn(t)) return null; const c = Q.ctx[i], b = t.b, now = t.now, S = PT_DEF.slide;
  if (b.owner === i || ptDefBusy(c, now)) return null;
  const p = c.p, v = Math.hypot(p.vx, p.vy);
  let dir = dirIn;
  if (dir == null) { const lead = 0.30; dir = Math.atan2(b.y + b.vy * lead - p.y, b.x + b.vx * lead - p.x); }   // toward where the ball will be
  const v0 = Math.max(S.vMin, Math.min(S.vMax, v + S.vAdd));                                     // launch speed from HIS OWN pace
  const G = ptDefSlideSide(t, c, p.x, p.y, dir);
  c.def = { kind: "SLIDE", x0: p.x, y0: p.y, t0: now, launchAt: now + S.windT, dir, v0, vNow: v0, foot: G.foot, tuck: G.tuck, tech: G.tech, th1: G.th1, rule: G.rule, geo: G.geo,
    stopAt: null, contact: null, oppContact: null, rootPrev: null, ballPrev: null, tauPrev: null };
  c.defCool = now + S.windT + v0 / S.decel + S.groundT + S.getupT + S.recoverT;
  c.stunT = Math.max(c.stunT || 0, now + S.windT + v0 / S.decel + S.groundT + S.getupT);         // on the ground: no reception until he is back on his feet
  ptSquadEvent(t, Object.assign({ kind: "TACKLE_START", pid: i, type: "SLIDE", foot: c.def.foot, v0: +v0.toFixed(3), dir: +dir.toFixed(4) }, G.rule === "far" ? { tuck: G.tuck, tech: G.tech, geo: G.geo } : {}));
  return c.def;
}
// SLIDE CONTACT GEOMETRY V1.2 — the technique from the geometry at the launch (world frame; RIGHT of a direction (fx, fy) is (−fy, fx), +y toward
// the camera — verified on the rendered rig). The ball's side of the slide line (where it will be in 0.30 s: the carrier's pace if carried) is
// the NEAR side: that leg tucks and he drops on that hip; the FAR leg tackles, sweeping across toward the ball. Tie (ball on the line within
// 5 cm): the nearest opponent's side, else right. SWEEP when the ball is beside the line (≥ sweepLat), BLOCK when it is on it.
function ptDefSlideSide(t, c, px, py, dir) {
  const S = PT_DEF.slide, W = S.sweep, b = t.b, Q = t.squad, fx = Math.cos(dir), fy = Math.sin(dir), lead = 0.30;
  const own = b.owner != null ? Q.ctx[b.owner] : null, bvx = own ? own.p.vx : b.vx, bvy = own ? own.p.vy : b.vy;
  if (S.rule === "near") { const lat = (b.x - px) * (-fy) + (b.y - py) * fx, foot = lat >= 0 ? "R" : "L"; return { rule: "near", foot, tuck: foot === "R" ? "L" : "R", tech: "V1", th1: 0, geo: null }; }
  const qx = b.x + bvx * lead, qy = b.y + bvy * lead, lat = (qx - px) * (-fy) + (qy - py) * fx, fwd = (qx - px) * fx + (qy - py) * fy;
  let sd = lat;
  if (Math.abs(lat) < 0.05) { let best = null, bd = 4.0; for (const o of Q.ctx) if (o.team !== c.team) { const d = Math.hypot(o.p.x - px, o.p.y - py); if (d < bd) { bd = d; best = o; } }
    sd = best ? (best.p.x - px) * (-fy) + (best.p.y - py) * fx : 1; if (Math.abs(sd) < 1e-6) sd = 1; }
  const tuck = sd >= 0 ? "R" : "L", foot = tuck === "R" ? "L" : "R", tech = Math.abs(lat) >= W.sweepLat ? "SWEEP" : "BLOCK";
  // the facts of the geometry (recorded, never an input to the contact law): which side of the carrier he is on, the approach angle
  let side = null, approach = null; if (own && own.team !== c.team) { const q = own.p, cv = Math.hypot(q.vx, q.vy), cd = cv > 0.5 ? Math.atan2(q.vy, q.vx) : q.facing, cfx = Math.cos(cd), cfy = Math.sin(cd);
    side = (px - q.x) * (-cfy) + (py - q.y) * cfx >= 0 ? "CARRIER_RIGHT" : "CARRIER_LEFT"; approach = +((Math.atan2(Math.sin(dir - cd), Math.cos(dir - cd))) * 180 / Math.PI).toFixed(1); }
  return { rule: "far", foot, tuck, tech, th1: tech === "SWEEP" ? W.th1 : W.block1, geo: { ballLat: +lat.toFixed(3), ballFwd: +fwd.toFixed(3), side, approach } };
}
// the tackling leg's capsule (knee → toe, on the pitch) at root (x, y) and τ seconds after the launch, with its hip, direction, sweep angle and
// sweep rate. rule "near" reproduces the V1 leg exactly (straight along the slide, legLat to the tackling side).
function ptDefSlideLeg(d, x, y, tau, leg) {
  const S = PT_DEF.slide, W = S.sweep, fx = Math.cos(d.dir), fy = Math.sin(d.dir), rx = -fy, ry = fx, sgF = d.foot === "R" ? 1 : -1, lo = S.legLat * leg;
  const ext = Math.max(0, Math.min(1, tau / S.extT)), k0r = S.legFrom * leg, k1r = (S.legFrom + ((d.rule === "far" ? S.reachAhead12 : S.reachAhead) - S.legFrom) * ext) * leg;
  if (d.rule !== "far") { const hx = x + rx * sgF * lo, hy = y + ry * sgF * lo; return { hx, hy, ax: hx + fx * k0r, ay: hy + fy * k0r, ex: hx + fx * k1r, ey: hy + fy * k1r, ux: fx, uy: fy, th: 0, om: 0, px: 0, py: 0 }; }
  const hx = x + fx * W.hipF + rx * sgF * W.hipLat, hy = y + fy * W.hipF + ry * sgF * W.hipLat, s = Math.max(0, Math.min(1, (tau - W.t0) / W.T));
  const th = W.th0 + (d.th1 - W.th0) * s * s * (3 - 2 * s), om = s > 0 && s < 1 ? (d.th1 - W.th0) * 6 * s * (1 - s) / W.T : 0;
  const tx = -rx * sgF, ty = -ry * sgF, c = Math.cos(th), sn = Math.sin(th), ux = fx * c + tx * sn, uy = fy * c + ty * sn, px = -fx * sn + tx * c, py = -fy * sn + ty * c;   // u(θ) and ∂u/∂θ (toward the tucked side)
  const k0 = k0r - W.hipF, k1 = k1r - W.hipF;
  return { hx, hy, ax: hx + ux * k0, ay: hy + uy * k0, ex: hx + ux * k1, ey: hy + uy * k1, ux, uy, th, om, px, py };
}
// where to aim a slide launched now (an AIMING aid for the AI / demos / fixtures — what a skilled player would aim at; it is an input,
// never part of the contact law): candidate directions are swept, the slide's own kinematics (wind-up, launch speed, uniform deceleration)
// are rolled forward against the ball's motion (a carried ball moves with its carrier), and the direction whose leg passes closest wins
function ptDefSlidePlan(t, c) {
  const S = PT_DEF.slide, p = c.p, b = t.b, Q = t.squad, leg = p.legLen || PT.LEG_REF, v0 = Math.max(S.vMin, Math.min(S.vMax, Math.hypot(p.vx, p.vy) + S.vAdd));
  const own = b.owner != null ? Q.ctx[b.owner] : null, op = own && own.team !== c.team ? own.p : null;
  const bvx = own ? own.p.vx : b.vx, bvy = own ? own.p.vy : b.vy, R = PT_BALL_R + (S.rule === "far" ? S.footR12 : S.footR), BR = PT_DEF.bodyR + 0.05;
  const base = Math.atan2(b.y - p.y, b.x - p.x); let best = base, bg = 1e9, clean = null, cs = 1e9;
  const far = S.rule === "far", CLR = 0.55;                                                            // V1.2: body past the carrier (0.16 body + 0.32 disc + a hand's width)
  for (let da = -70; da <= 70; da += 1) {
    const dir = base + da * Math.PI / 180, fx = Math.cos(dir), fy = Math.sin(dir); let x = p.x + p.vx * S.windT, y = p.y + p.vy * S.windT, v = v0, tt = S.windT, g = 1e9, hitB = null, hitM = null, clr = 1e9, lowB = true;
    const G = ptDefSlideSide(t, c, p.x, p.y, dir), d = { dir, foot: G.foot, th1: G.th1, rule: G.rule };
    while (v > 0 && tt < 2.0) { x += fx * v * PT_DT; y += fy * v * PT_DT; v = Math.max(0, v - S.decel * PT_DT); tt += PT_DT;
      const L = far ? ptDefSlideLeg(d, x, y, tt - S.windT, leg) : { ax: x + fx * S.legFrom * leg, ay: y + fy * S.legFrom * leg, ex: x + fx * S.reachAhead * leg, ey: y + fy * S.reachAhead * leg };   // V1: the aid's straight leg
      const qx = b.x + bvx * tt, qy = b.y + bvy * tt, gb = ptSegDist(qx, qy, L.ax, L.ay, L.ex, L.ey);   // how deep the LOWER leg (knee → boot) passes the ball
      g = Math.min(g, gb); if (hitB == null && (far ? ptSegDist(qx, qy, L.hx, L.hy, L.ex, L.ey) : gb) <= R) { hitB = tt; if (far && gb > R) lowB = false; }   // V1.2: a first touch on the thigh is not a clean aim
      if (op) { const ox = op.x + op.vx * tt, oy = op.y + op.vy * tt;
        if (hitM == null && (far ? Math.min(ptSegDist(ox, oy, L.hx, L.hy, L.ex, L.ey), ptSegDist(ox, oy, x - fx * 0.35, y - fy * 0.35, x + fx * 0.25, y + fy * 0.25)) : ptSegDist(ox, oy, x, y, L.ex, L.ey)) < BR) hitM = tt;
        if (far && hitB != null) clr = Math.min(clr, ptSegDist(ox, oy, x - fx * 0.35, y - fy * 0.35, x + fx * 0.25, y + fy * 0.25)); }
      if (hitM != null && hitB == null) break; }                                                    // the leg would stop on his body before the ball
    const sc = g + Math.abs(da) * 0.0005; if (sc < bg) { bg = sc; best = dir; }
    const cc = sc + (far && op ? 0.5 * Math.max(0, CLR - clr) : 0);                                     // V1.2: among ball-first lines, the one whose BODY passes beside him
    if (hitB != null && lowB && (hitM == null || hitB <= hitM) && cc < cs) { cs = cc; clean = dir; } }   // the deepest ball-first contact, not a grazing one
  return { dir: clean != null ? clean : best, ballFirst: clean != null, gap: bg };
}
function ptDefSlideAim(t, c) { return ptDefSlidePlan(t, c).dir; }
// ── the tackle quality law (continuous.py §9, ported): execution quality given that the boot MET the ball ─────────────────────
function ptDefQuality(t, c, type, carrier, extra) {
  const A = ptDefAttrs(c), Q = PT_DEF.q, b = t.b, noise = 0;
  const C = carrier ? ptDefAttrs(carrier) : null;
  const expose = carrier ? Math.max(0, Math.min(1.2, Math.hypot(carrier.p.x - b.x, carrier.p.y - b.y) - 0.35)) : 1.2;   // a loose ball is fully exposed
  const skill = type === "SLIDE" ? ptN01(A.sliding_tackle) : ptN01(A.standing_tackle);
  let tq = 0.55 * skill + 0.25 * ptN01(A.reactions) + expose * 0.35 - (C ? (0.30 * ptN01(C.strength) + 0.20 * ptN01(C.balance)) * (1 - expose * 0.5) : 0) + noise * 0.12;
  tq += extra || 0;
  return { tq, expose };
}
function ptDefBehind(c, carrier) {                                                                 // defender behind the carrier's line of travel / facing
  if (!carrier) return false; const q = carrier.p, f = Math.hypot(q.vx, q.vy) > 0.7 ? Math.atan2(q.vy, q.vx) : q.facing;
  return (c.p.x - q.x) * Math.cos(f) + (c.p.y - q.y) * Math.sin(f) < -0.2;
}
function ptDefApply(t, i, c, type, out, dir, speed, carrierIdx) {                                  // the authoritative ball result (WON / POKE)
  const b = t.b, Q = t.squad, now = t.now; let vx, vy;
  if (out === "WON" && type === "STAND") { const dx = c.p.x - b.x, dy = c.p.y - b.y, m = Math.hypot(dx, dy) || 1;   // blocked and dragged to his own feet
    vx = dx / m * PT_DEF.won.standV + c.p.vx * 0.5; vy = dy / m * PT_DEF.won.standV + c.p.vy * 0.5; }
  else { vx = Math.cos(dir) * speed; vy = Math.sin(dir) * speed; }
  b.vx = vx; b.vy = vy; b.vz = 0; b.curve = null; b.owner = null; b.lastTeam = c.team;
  if (carrierIdx != null) { b.exclPid = carrierIdx; b.exclT = now + (out === "WON" ? 0.5 : 0.35); }   // the dispossessed carrier (continuous.py exclusion windows)
}
// resolve every defensive contact due THIS tick (after all players moved, before receptions and the ball step)
function ptDefResolve(t) {
  if (!ptDefOn(t) || t.squad.over) return;                                                         // the ball already crossed a line: play is dead
  const Q = t.squad, b = t.b, now = t.now, R = PT_BALL_R;
  for (let i = 0; i < Q.ctx.length; i++) {
    const c = Q.ctx[i], d = c.def; if (!d) continue;
    const carrierIdx = b.owner != null && Q.ctx[b.owner].team !== c.team ? b.owner : null, carrier = carrierIdx != null ? Q.ctx[carrierIdx] : null;
    const p = c.p, leg = p.legLen || PT.LEG_REF;
    if (d.kind === "STAND" && !d.resolved && now >= d.contactAt - 1e-9) {
      d.resolved = true;
      const f = p.facing, fx = Math.cos(f), fy = Math.sin(f), side = d.foot === "R" ? 1 : -1;
      const hx = p.x - fy * side * 0.10 * leg, hy = p.y + fx * side * 0.10 * leg;                  // the tackling-side hip, on the ground
      const dh = Math.hypot(b.x - hx, b.y - hy), along = (b.x - p.x) * fx + (b.y - p.y) * fy, reach = PT_DEF.stand.reach * leg;
      const inReach = dh - R <= reach && along >= PT_DEF.stand.behind * leg && b.z <= PT_DEF.stand.zMax;
      const why = inReach ? null : dh - R > reach ? "OUT_OF_REACH" : b.z > PT_DEF.stand.zMax ? "TOO_HIGH" : "BEHIND_HIM";
      let out = "MISS", q = null;
      if (inReach) {
        const stretch = Math.max(0, (dh - R) / reach), behind = ptDefBehind(c, carrier);
        q = ptDefQuality(t, c, "STAND", carrier, (stretch > PT_DEF.q.stretchFrom ? PT_DEF.q.stretch * (stretch - PT_DEF.q.stretchFrom) / (1 - PT_DEF.q.stretchFrom) : 0) + (behind ? PT_DEF.q.behind : 0));
        out = q.tq > PT_DEF.q.won ? "WON" : q.tq > PT_DEF.q.poke ? "POKE" : "BEATEN";
        q.behind = behind; q.stretch = +stretch.toFixed(3);
      }
      const pre = { x: b.x, y: b.y, z: b.z, vx: b.vx, vy: b.vy };
      if (out === "WON" || out === "POKE") {
        const away = Math.atan2(b.y - p.y, b.x - p.x), lat = (b.x - p.x) * (-fy) + (b.y - p.y) * fx;
        ptDefApply(t, i, c, "STAND", out, away + (lat >= 0 ? 1 : -1) * PT_DEF.poke.ang, PT_DEF.poke.standV, carrierIdx);
        if (out === "POKE") { c.stunT = Math.max(c.stunT || 0, now + 0.15); }
      }
      d.recoverUntil = now + (out === "WON" || out === "POKE" ? PT_DEF.stand.recoverWin : PT_DEF.stand.recoverFail);
      // the foot's sweep path hip → contact point, against the carrier's body disc: the opponent-contact FACT (no foul is called)
      const cpx = inReach ? b.x : hx + (b.x - hx) / (dh || 1) * reach, cpy = inReach ? b.y : hy + (b.y - hy) / (dh || 1) * reach;
      const oc = carrier ? ptSegDist(carrier.p.x, carrier.p.y, hx, hy, cpx, cpy) < PT_DEF.bodyR + 0.05 : false;
      d.result = { out, why, along: +along.toFixed(3), q: q ? +q.tq.toFixed(4) : null, expose: q ? +q.expose.toFixed(3) : null, stretch: q ? q.stretch : null, behind: q ? q.behind : null, point: [pre.x, pre.y, pre.z], hip: [+hx.toFixed(4), +hy.toFixed(4)], dh: +dh.toFixed(4), reach: +reach.toFixed(4), contactTick: Q.tick,
        vIn: [+pre.vx.toFixed(3), +pre.vy.toFixed(3)], vOut: [+b.vx.toFixed(3), +b.vy.toFixed(3)], attacker: carrier ? [+carrier.p.x.toFixed(3), +carrier.p.y.toFixed(3)] : null,
        relV: carrier ? +Math.hypot(p.vx - carrier.p.vx, p.vy - carrier.p.vy).toFixed(3) : null, ballFirst: inReach, oppContact: oc, oppContactTick: oc ? Q.tick : null };
      ptSquadEvent(t, Object.assign({ kind: "TACKLE", pid: i, type: "STAND", foot: d.foot, carrier: carrierIdx }, d.result));
      if (out === "WON" || out === "POKE") { if (Q.pass) Q.pass.done = true; }
    }
    if (d.kind === "SLIDE" && d.rule === "far" && now >= d.launchAt && (d.vNow > 0 || d.stopAt === now || (d.stopAt != null && !d.contact))) { ptDefSlideBall(t, i, c, d, carrierIdx, carrier); continue; }   // (a slide stopped by a body after this tick's resolution still closes as a MISS)
    if (d.kind === "SLIDE" && now >= d.launchAt && d.vNow > 0 || (d.kind === "SLIDE" && d.stopAt === now)) {
      // the tackling LEG, extended ahead of the sliding body (shin → boot, a capsule), swept against the moving ball through the tick
      const fx = Math.cos(d.dir), fy = Math.sin(d.dir), side = d.foot === "R" ? 1 : -1, S = PT_DEF.slide, lo = S.legLat * leg, lx = -fy * side * lo, ly = fx * side * lo;
      // the leg EXTENDS: from the launch it takes extT to reach full length along the pitch (a body cannot drop and straighten a leg in
      // no time — the reach grows with it, and the presentation's drop is timed to the same window)
      const ext = Math.max(0, Math.min(1, (now - d.launchAt) / S.extT)), k0 = S.legFrom * leg, k1 = (S.legFrom + (S.reachAhead - S.legFrom) * ext) * leg, bx = p.x + fx * k1 + lx, by = p.y + fy * k1 + ly;
      if (!d.contact && d.rootPrev && d.ballPrev && b.z <= S.zMax) {
        let best = null;
        for (let n = 1; n <= S.sub; n++) { const u = n / S.sub, rx = d.rootPrev[0] + (p.x - d.rootPrev[0]) * u, ry = d.rootPrev[1] + (p.y - d.rootPrev[1]) * u;
          const qx = d.ballPrev[0] + (b.x - d.ballPrev[0]) * u, qy = d.ballPrev[1] + (b.y - d.ballPrev[1]) * u;
          const ax = rx + fx * k0 + lx, ay = ry + fy * k0 + ly, ex = rx + fx * k1 + lx, ey = ry + fy * k1 + ly, dd = ptSegDist(qx, qy, ax, ay, ex, ey);
          if (dd <= R + S.footR) { const L2 = (ex - ax) ** 2 + (ey - ay) ** 2; best = { u, dd, along: Math.max(0, Math.min(1, ((qx - ax) * (ex - ax) + (qy - ay) * (ey - ay)) / L2)) }; break; } }
        { const ax = p.x + fx * k0 + lx, ay = p.y + fy * k0 + ly, g = ptSegDist(b.x, b.y, ax, ay, bx, by) - R - S.footR; if (d.minGap == null || g < d.minGap) { d.minGap = g; d.minGapAt = Q.tick; } }   // diagnostic: how close the leg came
        if (best) {
          const behind = ptDefBehind(c, carrier), q = ptDefQuality(t, c, "SLIDE", carrier, PT_DEF.q.slideBonus + (behind ? PT_DEF.q.slideBehind : 0) + (best.along < 0.5 ? PT_DEF.q.shin : 0));
          const out = q.tq > PT_DEF.q.won ? "WON" : q.tq > PT_DEF.q.poke ? "POKE" : "GLANCE";
          const pre = { x: b.x, y: b.y, z: b.z, vx: b.vx, vy: b.vy }, vS = Math.hypot(p.vx, p.vy), lat = (b.x - p.x) * (-fy) + (b.y - p.y) * fx;
          if (out === "WON") ptDefApply(t, i, c, "SLIDE", out, d.dir, PT_DEF.won.slideK * vS + PT_DEF.won.slideAdd, carrierIdx);
          else if (out === "POKE") ptDefApply(t, i, c, "SLIDE", out, d.dir + (lat >= 0 ? 1 : -1) * PT_DEF.poke.slideAng, PT_DEF.poke.slideK * vS + PT_DEF.poke.slideAdd, carrierIdx);
          else { b.vx += fx * 1.0; b.vy += fy * 1.0; }                                               // a glancing touch: the carrier rides it (the carry law decides)
          d.contact = { out, q: +q.tq.toFixed(4), expose: +q.expose.toFixed(3), behind, legAt: +best.along.toFixed(3), sub: best.u, point: [pre.x, pre.y, pre.z], boot: [+bx.toFixed(4), +by.toFixed(4)], contactTick: Q.tick, slideV: +vS.toFixed(3),
            slideDist: +Math.hypot(p.x - d.x0, p.y - d.y0).toFixed(3), vIn: [+pre.vx.toFixed(3), +pre.vy.toFixed(3)], vOut: [+b.vx.toFixed(3), +b.vy.toFixed(3)], attacker: carrier ? [+carrier.p.x.toFixed(3), +carrier.p.y.toFixed(3)] : null,
            relV: carrier ? +Math.hypot(p.vx - carrier.p.vx, p.vy - carrier.p.vy).toFixed(3) : null };
          ptSquadEvent(t, Object.assign({ kind: "TACKLE", pid: i, type: "SLIDE", foot: d.foot, carrier: carrierIdx, ballFirst: d.oppContact == null, oppContactTick: d.oppContact }, d.contact));
          if ((out === "WON" || out === "POKE") && Q.pass) Q.pass.done = true;
        }
      }
      // the PLAN (information only, like the reception plan — never an input to the contact law above): where and when the leg will meet
      // the ball if nothing changes (the slide's own deceleration, the ball — or its carrier — moving on), for the presentation to reach onto
      d.plan = null;
      if (!d.contact && d.vNow > 0) { const own = b.owner != null ? Q.ctx[b.owner].p : null, bvx = own ? own.vx : b.vx, bvy = own ? own.vy : b.vy; let x = p.x, y = p.y, v = d.vNow;
        for (let k = 1; k <= S.planTicks && v > 0; k++) { x += fx * v * PT_DT; y += fy * v * PT_DT; v = Math.max(0, v - S.decel * PT_DT); const qx = b.x + bvx * k * PT_DT, qy = b.y + bvy * k * PT_DT;
          const kk = (S.legFrom + (S.reachAhead - S.legFrom) * Math.max(0, Math.min(1, (now + k * PT_DT - d.launchAt) / S.extT))) * leg;
          if (ptSegDist(qx, qy, x + fx * k0 + lx, y + fy * k0 + ly, x + fx * kk + lx, y + fy * kk + ly) <= R + S.footR) { d.plan = { at: now + k * PT_DT, ball: [qx, qy, b.z], root: [x, y] }; break; } } }
      // TACKLED-PLAYER V1: the body contact is now the segment-level contact model (pt_react.js ptRxStep) — the leg meets his feet / shins /
      // knees, the sliding body meets his legs — and its impulse slows the slide instead of a disc test stopping it dead
      d.rootPrev = [p.x, p.y]; d.ballPrev = [b.x, b.y];
      if (d.stopAt != null && d.stopAt <= now && !d.contact) { ptSquadEvent(t, { kind: "TACKLE", pid: i, type: "SLIDE", foot: d.foot, out: "MISS", carrier: carrierIdx, contactTick: null, minGap: d.minGap != null ? +d.minGap.toFixed(3) : null, minGapTick: d.minGapAt, slideV0: +d.v0.toFixed(2), dir: +d.dir.toFixed(3), slideDist: +Math.hypot(p.x - d.x0, p.y - d.y0).toFixed(3) }); d.contact = { out: "MISS" }; }
    }
  }
}
// ── SLIDE CONTACT GEOMETRY V1.2: the sweeping leg against the ball, swept through the tick, and the ball's physical response ─────────────
// Time frame: at this point of the tick every player has moved (root: previous → now) and the ball has NOT yet stepped (it moves b → b + v·dt
// after this). The leg (root, sweep angle) and the ball are interpolated over the same interval with enough sub-steps that neither moves more
// than ccd.step relative to the other per sub-step, so a fast foot or a fast ball cannot cross between ticks unseen. At the first touching
// sub-step u the ball's new velocity follows from the contact: point, normal, the LEG'S OWN velocity there (slide + sweep), restitution by the
// authoritative outcome, Coulomb-limited tangential drag. The ball is then placed so that the rest of the tick runs with the new velocity from
// the contact point (the keeper contact's convention). The OUTCOME category is the unchanged quality law's.
function ptDefSlideBall(t, i, c, d, carrierIdx, carrier) {
  const Q = t.squad, b = t.b, now = t.now, p = c.p, S = PT_DEF.slide, leg = p.legLen || PT.LEG_REF, R = PT_BALL_R, tau = now - d.launchAt;
  const tau0 = d.tauPrev != null ? d.tauPrev : tau, r0 = d.rootPrev || [p.x, p.y];
  const L1 = ptDefSlideLeg(d, p.x, p.y, tau, leg); d.sweepA = L1.th;
  if (!d.contact && d.rootPrev && b.z <= S.zMax) {
    const L0 = ptDefSlideLeg(d, r0[0], r0[1], tau0, leg), bdx = b.vx * PT_DT, bdy = b.vy * PT_DT;
    const rel = Math.max(Math.hypot(L1.ex - L0.ex - bdx, L1.ey - L0.ey - bdy), Math.hypot(L1.ax - L0.ax - bdx, L1.ay - L0.ay - bdy)), C = S.ccd;
    const n = Math.max(C.minSub, Math.min(C.maxSub, Math.ceil(rel / C.step)));
    let hit = null;
    for (let k = 1; k <= n && !hit; k++) { const u = k / n, L = ptDefSlideLeg(d, r0[0] + (p.x - r0[0]) * u, r0[1] + (p.y - r0[1]) * u, tau0 + (tau - tau0) * u, leg), qx = b.x + bdx * u, qy = b.y + bdy * u;
      const dx = L.ex - L.hx, dy = L.ey - L.hy, L2 = dx * dx + dy * dy, s1 = L2 > 1e-12 ? Math.max(0, Math.min(1, ((qx - L.hx) * dx + (qy - L.hy) * dy) / L2)) : 0, cx = L.hx + dx * s1, cy = L.hy + dy * s1, dd = Math.hypot(qx - cx, qy - cy);
      const lk = Math.hypot(L.ax - L.hx, L.ay - L.hy), lt = Math.sqrt(L2), al = (s1 * lt - lk) / Math.max(1e-6, lt - lk);   // along the knee → toe part (< 0: the thigh)
      if (dd <= R + (al < 0 ? 0.085 : S.footR12)) hit = { u, n, L, qx, qy, al, cx, cy, dd }; }
    { const g = ptSegDist(b.x, b.y, L1.hx, L1.hy, L1.ex, L1.ey) - R - S.footR12; if (d.minGap == null || g < d.minGap) { d.minGap = g; d.minGapAt = Q.tick; } }   // diagnostic: how close the leg came
    if (hit) {
      const { u, L } = hit, behind = ptDefBehind(c, carrier), q = ptDefQuality(t, c, "SLIDE", carrier, PT_DEF.q.slideBonus + (behind ? PT_DEF.q.slideBehind : 0) + (hit.al < 0.5 ? PT_DEF.q.shin : 0));
      const out = q.tq > PT_DEF.q.won ? "WON" : q.tq > PT_DEF.q.poke ? "POKE" : "GLANCE";
      // contact normal (horizontal, leg → ball centre); degenerate: the leg's sweep direction (toward the tucked side)
      let nx = hit.qx - hit.cx, ny = hit.qy - hit.cy, nm = Math.hypot(nx, ny); if (nm < 1e-5) { nx = L.px; ny = L.py; nm = Math.hypot(nx, ny) || 1; } nx /= nm; ny /= nm;
      // the leg's velocity at the contact point: the root's + the sweep's (ω × distance from the hip along ∂u/∂θ)
      const rvx = (p.x - r0[0]) / PT_DT, rvy = (p.y - r0[1]) / PT_DT, arm = Math.hypot(hit.cx - L.hx, hit.cy - L.hy), lvx = rvx + L.om * arm * L.px, lvy = rvy + L.om * arm * L.py;
      const B = S.ball, bIn = [b.vx, b.vy], vrx = lvx - b.vx, vry = lvy - b.vy, vn = vrx * nx + vry * ny, tvx = vrx - vn * nx, tvy = vry - vn * ny, vt = Math.hypot(tvx, tvy);
      const pre = { x: hit.qx, y: hit.qy, z: b.z, vx: b.vx, vy: b.vy }, vS = Math.hypot(p.vx, p.vy);
      let vx = b.vx, vy = b.vy, e = null, dvn = 0, dvt = 0;
      if (out === "WON" || out === "POKE") { const mL = B.legMassFrac * (c.massKg || 75), mEff = mL / (mL + B.mBall); e = B.e[out];
        dvn = (1 + e) * Math.max(0, vn) * mEff; dvt = vt > 1e-6 ? Math.min(B.muT * dvn, 0.4 * vt) : 0;
        vx += dvn * nx + (vt > 1e-6 ? dvt * tvx / vt : 0); vy += dvn * ny + (vt > 1e-6 ? dvt * tvy / vt : 0);
        const vOld = [b.vx, b.vy]; ptDefApplyV(t, i, c, out, vx, vy, carrierIdx);
        b.x += (vOld[0] - b.vx) * PT_DT * u; b.y += (vOld[1] - b.vy) * PT_DT * u; }                  // the rest of the tick from the contact point with the new velocity
      else { dvn = B.glanceV; b.vx += nx * B.glanceV; b.vy += ny * B.glanceV; }                         // a glancing touch: the carrier rides it (the carry law decides)
      // spin: a ground ball rolls (ω = v / r) before; the tangential impulse adds a spin about the vertical (hollow sphere I = ⅔ m r²). RECORDED only —
      // the playtest ball carries no spin state, and a rolling ball re-establishes rolling on the pitch
      const spinIn = +(Math.hypot(bIn[0], bIn[1]) / R).toFixed(2), spinZ = +(1.5 * dvt / R * Math.sign(nx * tvy - ny * tvx || 1)).toFixed(2), spinOut = +(Math.hypot(b.vx, b.vy) / R).toFixed(2);
      const region = hit.al >= 0.72 ? "FOOT" : hit.al >= 0.15 ? "SHIN" : hit.al >= 0 ? "KNEE" : "THIGH", sub = +u.toFixed(4);
      d.contact = { out, q: +q.tq.toFixed(4), expose: +q.expose.toFixed(3), behind, legAt: +hit.al.toFixed(3), region, sub, subN: hit.n, point: [+pre.x.toFixed(4), +pre.y.toFixed(4), +pre.z.toFixed(4)],
        legPoint: [+hit.cx.toFixed(4), +hit.cy.toFixed(4)], boot: [+L.ex.toFixed(4), +L.ey.toFixed(4)], normal: [+nx.toFixed(4), +ny.toFixed(4)], sweepTh: +L.th.toFixed(4), sweepOm: +L.om.toFixed(3),
        vLeg: [+lvx.toFixed(3), +lvy.toFixed(3)], vRelN: +vn.toFixed(3), vRelT: +vt.toFixed(3), e, dvn: +dvn.toFixed(3), dvt: +dvt.toFixed(3), spinIn, spinZ, spinOut, sep: +(hit.dd - R - (hit.al < 0 ? 0.085 : S.footR12)).toFixed(4),
        contactTick: Q.tick, slideV: +vS.toFixed(3), slideDist: +Math.hypot(p.x - d.x0, p.y - d.y0).toFixed(3), vIn: [+pre.vx.toFixed(3), +pre.vy.toFixed(3)], vOut: [+b.vx.toFixed(3), +b.vy.toFixed(3)],
        attacker: carrier ? [+carrier.p.x.toFixed(3), +carrier.p.y.toFixed(3)] : null, relV: carrier ? +Math.hypot(p.vx - carrier.p.vx, p.vy - carrier.p.vy).toFixed(3) : null, tech: d.tech, tuck: d.tuck };
      ptSquadEvent(t, Object.assign({ kind: "TACKLE", pid: i, type: "SLIDE", foot: d.foot, carrier: carrierIdx, ballFirst: d.oppContact == null, oppContactTick: d.oppContact }, d.contact));
      ptRxManifoldAdd(d, { kind: "BALL", tick: Q.tick, sub: u, region, point: d.contact.point, normal: d.contact.normal, out });
      if ((out === "WON" || out === "POKE") && Q.pass) Q.pass.done = true;
    }
  }
  // the PLAN (information only — never an input to the contact law): where and when the leg will meet the ball if nothing changes, for the
  // presentation to reach onto (the ball's point, the root, the sweep angle then)
  d.plan = null;
  if (!d.contact && d.vNow > 0) { const own = b.owner != null ? Q.ctx[b.owner].p : null, bvx = own ? own.vx : b.vx, bvy = own ? own.vy : b.vy; let x = p.x, y = p.y, v = d.vNow;
    for (let k = 1; k <= S.planTicks && v > 0; k++) { x += Math.cos(d.dir) * v * PT_DT; y += Math.sin(d.dir) * v * PT_DT; v = Math.max(0, v - S.decel * PT_DT); const qx = b.x + bvx * k * PT_DT, qy = b.y + bvy * k * PT_DT;
      const L = ptDefSlideLeg(d, x, y, tau + k * PT_DT, leg);
      if (ptSegDist(qx, qy, L.hx, L.hy, L.ex, L.ey) <= R + S.footR12) { d.plan = { at: now + k * PT_DT, ball: [qx, qy, b.z], root: [x, y], th: L.th }; break; } } }
  d.rootPrev = [p.x, p.y]; d.ballPrev = [b.x, b.y]; d.tauPrev = tau;
  if (d.stopAt != null && d.stopAt <= now && !d.contact) { ptSquadEvent(t, { kind: "TACKLE", pid: i, type: "SLIDE", foot: d.foot, out: "MISS", carrier: carrierIdx, contactTick: null, minGap: d.minGap != null ? +d.minGap.toFixed(3) : null, minGapTick: d.minGapAt, slideV0: +d.v0.toFixed(2), dir: +d.dir.toFixed(3), slideDist: +Math.hypot(p.x - d.x0, p.y - d.y0).toFixed(3), tech: d.tech, tuck: d.tuck }); d.contact = { out: "MISS" }; }
}
function ptDefApplyV(t, i, c, out, vx, vy, carrierIdx) {                                          // V1.2: the authoritative WON / POKE bookkeeping with a physical velocity
  const b = t.b; b.vx = vx; b.vy = vy; b.vz = 0; b.curve = null; b.owner = null; b.lastTeam = c.team;
  if (carrierIdx != null) { b.exclPid = carrierIdx; b.exclT = t.now + (out === "WON" ? 0.5 : 0.35); }
}
// the challenge's bounded contact history (ball and bodies, in order) — the facts a future referee reads; never an input to anything else
function ptRxManifoldAdd(d, e) { const M = d.manifold || (d.manifold = []); if (M.length >= 12) return false; e.n = M.length + 1; M.push(e); return true; }
function ptSegDist(px, py, ax, ay, bx, by) { const dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy, s = L > 1e-12 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / L)) : 0; return Math.hypot(ax + s * dx - px, ay + s * dy - py); }
// closest approach of two points moving linearly over the same interval (the boot and the ball within one tick)
function ptSegSeg(a0x, a0y, a1x, a1y, b0x, b0y, b1x, b1y) { const r0x = a0x - b0x, r0y = a0y - b0y, dx = (a1x - a0x) - (b1x - b0x), dy = (a1y - a0y) - (b1y - b0y), dd = dx * dx + dy * dy;
  const s = dd > 1e-12 ? Math.max(0, Math.min(1, -(r0x * dx + r0y * dy) / dd)) : 0; return Math.hypot(r0x + s * dx, r0y + s * dy); }
// ── OCCUPANCY (world.py PLAYER PHYSICAL OCCUPANCY V1, ported): closing velocity removed, then a positional Jacobi mop-up ─────────
function ptDefOccupancy(t) {
  if (!ptDefOn(t)) return;
  // TACKLED-PLAYER V1: a body that is ON THE PITCH (a launched slide, a fallen player) is not a standing disc — legs interact with it through the
  // contact model (pt_react.js) and, once it lies still, through its body capsule (ptRxOccupancy)
  const low = typeof ptRxMotion === "function" ? t.squad.ctx.map(c => (c.def && c.def.kind === "SLIDE" && t.now >= c.def.launchAt && !(c.def.rule === "far" && c.def.stopAt != null && t.now >= c.def.stopAt + PT_DEF.slide.groundT)) || (c.react && c.react.kind === "FALL" && t.now >= c.react.tFall)) : null;   // V1.2: kneeling / getting up he is a standing body again
  const ps = t.squad.ctx.map(c => c.p), n = ps.length, R2 = PT_DEF.bodyR * 2;
  for (let i = 0; i < n; i++) { const a = ps[i]; for (let j = 0; j < n; j++) { if (j === i || (low && (low[i] || low[j]))) continue; const c = ps[j];
    const dx = c.x - a.x, dy = c.y - a.y, d = Math.hypot(dx, dy); if (d < 1e-9 || d > R2 + 0.32) continue;
    const nx = dx / d, ny = dy / d, vn = a.vx * nx + a.vy * ny; if (vn <= 0) continue; const allowed = Math.max(0, (d - R2) / PT_DT);
    if (vn > allowed) { a.vx -= (vn - allowed) * nx; a.vy -= (vn - allowed) * ny; } } }
  for (let it = 0; it < PT_DEF.occIters; it++) {
    const corr = ps.map(() => [0, 0]); let worst = 0;
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) { if (low && (low[i] || low[j])) continue; const a = ps[i], c = ps[j], dx = c.x - a.x, dy = c.y - a.y, d2 = dx * dx + dy * dy; if (d2 >= R2 * R2) continue;
      let ux, uy, pen; if (d2 < 1e-12) { ux = 0; uy = 1; pen = R2; } else { const d = Math.sqrt(d2); ux = dx / d; uy = dy / d; pen = R2 - d; }
      worst = Math.max(worst, pen); corr[i][0] -= ux * pen / 2; corr[i][1] -= uy * pen / 2; corr[j][0] += ux * pen / 2; corr[j][1] += uy * pen / 2; }
    if (worst <= PT_DEF.occTol) break;
    for (let i = 0; i < n; i++) { ps[i].x += corr[i][0]; ps[i].y += corr[i][1]; }
  }
}
// ── simple deterministic AI for players you do not control (defending drills only) ───────────────────────────────────────────────
// attribute ARCHITECTURE: every decision threshold is scaled by a factor that is exactly 1 at the reference profile (no tuning in V1)
const ptDefK = (c, attr, k) => 1 + k * (ptN01(ptDefAttrs(c)[attr]) - 0.6);
function ptDefAttack(Q, team) { const bx = Q.spec.box; return bx ? (team === 0 ? bx[1] : bx[0]) : (team === 0 ? 105 : 0); }   // the line / goal a team attacks
function ptDefLaneClear(Q, team, ax, ay, bx, by, r) { for (const o of Q.ctx) if (o.team !== team && ptSegDist(o.p.x, o.p.y, ax, ay, bx, by) < r) return false; return true; }
function ptDefAiPass(t, i, to, fam) {                                                               // an AI pass: the SAME pass path a key press takes, as that player
  const Q = t.squad, act = Q.active, b = t.b, o = Q.ctx[to].p;
  ptSqIn(t, Q.ctx[i]); Q.active = i; b.ctrl = true;
  const p = t.p, lead = Math.max(0.2, Math.min(1.1, Math.hypot(o.x - p.x, o.y - p.y) / 16));
  const k = ptSquadPassTo(t, fam, to, o.x + o.vx * lead, o.y + o.vy * lead, true);
  ptSqOut(t, Q.ctx[i]); Q.active = act; ptSqIn(t, Q.ctx[act]); b.ctrl = b.owner === act;
  return k;
}
function ptDefIntents(t) {
  if (!ptDefOn(t)) return;
  const Q = t.squad, b = t.b, now = t.now, A = PT_DEF.ai, ps = Q.pass, bx = Q.spec.box;
  if (Q.over) { if (now >= Q.over.t + 1.0) ptDefRestart(t, 1 - (Q.over.team != null ? Q.over.team : 1)); return; }
  if (bx && b.owner == null && !b.held && (b.y < bx[2] - 1 || b.y > bx[3] + 1 || b.x < bx[0] - 1 || b.x > bx[1] + 1)) { Q.over = { kind: "OUT", team: b.lastTeam, tick: Q.tick, t: now }; ptSquadEvent(t, { kind: "OUT", team: b.lastTeam, ball: [+b.x.toFixed(2), +b.y.toFixed(2)] }); return; }
  if (b.owner == null && !b.held) ptSquadPredict(t, PT_RECV.pathTicks);
  const carrierIdx = b.owner, carTeam = carrierIdx != null ? Q.ctx[carrierIdx].team : null;
  const inFlightTeam = b.owner == null && ps && !ps.done && ps.to != null ? Q.ctx[ps.to].team : null;
  const attTeam = carTeam != null ? carTeam : inFlightTeam;                                          // the team in possession (null: a loose ball)
  // the engaging defender: the nearest of the defending team to the carrier (one presser; the rest cover)
  let presser = null; if (carrierIdx != null) { let bd = 1e9; for (const c of Q.ctx) if (c.team !== carTeam && c.ai.mode !== "HOLD") { const d = Math.hypot(c.p.x - Q.ctx[carrierIdx].p.x, c.p.y - Q.ctx[carrierIdx].p.y); if (d < bd) { bd = d; presser = c.idx; } } }
  const chaser = {}; if (attTeam == null) for (const c of Q.ctx) { if (c.ai.mode === "HOLD" || c.def) continue; const d = Math.hypot(c.p.x - b.x, c.p.y - b.y), k = chaser[c.team]; if (!k || d < k.d) chaser[c.team] = { i: c.idx, d }; }
  for (let i = 0; i < Q.ctx.length; i++) {
    const c = Q.ctx[i], p = c.p, m = c.ai.mode; c.aiJockey = false; c.aiKeys = null;
    if (i === Q.active && !c.assist && !Q.humanAi) continue;
    if (m === "HOLD" || m === "SCRIPT" || c.def) continue;                                         // SCRIPT: review fixtures follow their own path
    const attackX = ptDefAttack(Q, c.team), ownX = ptDefAttack(Q, 1 - c.team), cy = bx ? 0.5 * (bx[2] + bx[3]) : 34;
    if (carrierIdx === i) {                                                                           // AI CARRIER: dribble at the line; pass when pressed and a lane is clear
      if (m !== "DRIBBLE" && m !== "SSG") continue;
      if (c.ai.dirs) {                                                                               // review fixtures: a timed list of dribble directions / gears (null dir: stand on the ball)
        let g = null; for (const w of c.ai.dirs) if (now >= w.t) g = w;
        if (g && g.dir != null) { const ux = Math.cos(g.dir), uy = Math.sin(g.dir); c.aiKeys = { right: ux > 0.38, left: ux < -0.38, down: uy > 0.38, up: uy < -0.38, jog: g.gear === "jog", walk: g.gear === "walk", sprint: g.gear === "sprint" }; }
        continue; }
      if (bx && (c.team === 0 ? p.x >= attackX : p.x <= attackX)) { Q.over = { kind: "LINE", team: c.team, tick: Q.tick, t: now }; ptSquadEvent(t, { kind: "LINE", pid: i, team: c.team }); return; }
      let near = null, nd = 1e9; for (const o of Q.ctx) if (o.team !== c.team) { const d = Math.hypot(o.p.x - p.x, o.p.y - p.y); if (d < nd) { nd = d; near = o; } }
      const passT = c.aiPassAt || 0;
      if (m === "SSG" && near && nd < 2.6 * ptDefK(c, "reactions", 0.5) && now > passT && !c.kick && Math.hypot(b.x - p.x, b.y - p.y) <= PT_RECV.kickReach) {
        let best = null, bs = -1e9;
        for (const o of Q.ctx) { if (o.team !== c.team || o.idx === i) continue; const d = Math.hypot(o.p.x - p.x, o.p.y - p.y);
          if (d < 5 || d > 22 || !ptDefLaneClear(Q, c.team, b.x, b.y, o.p.x, o.p.y, 1.4)) continue; const sc = (c.team === 0 ? o.p.x : -o.p.x) * 0.05 - Math.abs(d - 11) * 0.1; if (sc > bs) { bs = sc; best = o.idx; } }
        if (best != null && ptDefAiPass(t, i, best, "SHORT")) { c.aiPassAt = now + 1.5; continue; }
      }
      // away from the nearest opponent's side while going forward (deterministic), a gentle weave otherwise
      const side = near && nd < 4 ? (near.p.y > p.y ? -1 : 1) * 3 : (c.ai.weave || 0) * Math.sin(now * (c.ai.weaveW || 0.9));
      const gx = attackX, gy = Math.max(bx ? bx[2] + 2 : 2, Math.min(bx ? bx[3] - 2 : 66, (c.ai.goal ? c.ai.goal[1] : cy) + side));
      const a8 = Math.round(Math.atan2(gy - p.y, gx - p.x) / (Math.PI / 4)) * (Math.PI / 4), ux = Math.cos(a8), uy = Math.sin(a8);
      c.aiKeys = { right: ux > 0.38, left: ux < -0.38, down: uy > 0.38, up: uy < -0.38, jog: (c.ai.gear || "jog") === "jog", walk: c.ai.gear === "walk" }; continue; }
    if (carrierIdx === i) continue;
    if (attTeam === c.team && m === "SSG") {                                                          // SUPPORT: ahead-diagonal of the ball, on his own side of the box
      if (b.owner == null && ps && !ps.done && ps.to === i) continue;                                 // the receiver is steered by the reception intent
      const car = carrierIdx != null ? Q.ctx[carrierIdx].p : b, dir = c.team === 0 ? 1 : -1, sd = c.home[1] >= cy ? 1 : -1;
      const gx = Math.max(bx ? bx[0] + 1 : 0, Math.min(bx ? bx[1] - 1 : 105, car.x + dir * 5)), gy = Math.max(bx ? bx[2] + 1.5 : 1, Math.min(bx ? bx[3] - 1.5 : 67, cy + sd * 7));
      if (Math.hypot(gx - p.x, gy - p.y) > 1.0) c.aiGoal = { x: gx, y: gy, v: PT_RECV.supportV + 1 }; continue; }
    if (carTeam != null && carTeam !== c.team && (m === "ENGAGE" || m === "SSG")) {
      const car = Q.ctx[carrierIdx].p;
      if (i === presser || m === "ENGAGE") {                                                          // PRESS: contain goal-side, jockey in range, tackle an exposed ball
        const ux = ownX - car.x, uy = cy - car.y, um = Math.hypot(ux, uy) || 1, dC = Math.hypot(car.x - p.x, car.y - p.y);
        if (c.engT == null || c.engOn !== carrierIdx) { c.engT = now; c.engOn = carrierIdx; }
        const beaten = (p.x - car.x) * (ownX - car.x) < 0;                                            // the carrier is between him and his own line
        // contain goal-side, then STEP IN: the distance closes deterministically the longer he has been engaged (a press, not a wait)
        const cd = Math.max(A.stepMin, A.containDist - A.stepRate * (now - c.engT)) * ptDefK(c, "defensive_awareness", -0.4);
        c.aiGoal = { x: car.x + ux / um * cd, y: car.y + uy / um * cd, v: dC > A.engageDist || beaten ? PT_RECV.runV : 4.0 };
        c.aiJockey = dC < A.engageDist && !beaten;                                                    // beaten: turn and run to recover goal-side
        if (c.ai.tackle !== false && !ptDefBusy(c, now)) {
          const expose = Math.hypot(car.x - b.x, car.y - b.y) - 0.35, leg = p.legLen || PT.LEG_REF, dB = Math.hypot(b.x - p.x, b.y - p.y) - PT_BALL_R;
          // the AI slides only when its own read of the geometry says the leg reaches the ball BEFORE the carrier's body (a person's judgement,
          // not a guarantee — the contact is still the simulation's) and not again straight after a slide
          const sp = c.ai.slide !== false && beaten && !ptDefBehind(c, Q.ctx[carrierIdx]) && dB > 1.0 && dB < 2.1 && Math.hypot(p.vx, p.vy) > 3.0 && !(c.slideAgain > now) ? ptDefSlidePlan(t, c) : null;
          if (sp && sp.ballFirst) { c.defQueue = "SLIDE"; c.defQueueDir = sp.dir; c.slideAgain = now + 4.0; }
          else if (expose >= A.tackleExpose * ptDefK(c, "aggression", -0.6) && dB <= PT_DEF.stand.reach * leg * A.tackleReachK + 0.35 * PT_DEF.stand.lungeV * PT_DEF.stand.windT) c.defQueue = "STAND";   // only part of the lunge counts: the carrier moves on through the wind-up
        }
        continue; }
      // COVER: the lane between the ball and the nearest attacker who is not the carrier (the lane-shadow rule)
      let mk = null, md = 1e9; for (const o of Q.ctx) if (o.team === carTeam && o.idx !== carrierIdx) { const d = Math.hypot(o.p.x - p.x, o.p.y - p.y); if (d < md) { md = d; mk = o; } }
      if (mk) { const gx = mk.p.x + 0.38 * (b.x - mk.p.x), gy = mk.p.y + 0.38 * (b.y - mk.p.y); if (Math.hypot(gx - p.x, gy - p.y) > 0.6) c.aiGoal = { x: gx, y: gy, v: 4.5 }; }
      continue; }
    if (attTeam == null && chaser[c.team] && chaser[c.team].i === i) { c.aiGoal = ptRecvGoal(t, c, 6.0); continue; }   // a LOOSE ball: the nearest of each team goes for it
    if (attTeam != null && attTeam !== c.team && m === "SSG") {                                      // a pass in flight against him: hold the lane he is in
      continue; }
  }
}
// a RESTART after the ball crossed a line (a legitimate dead-ball restart, logged — never a mid-contest reset): everyone back to his
// starting slot, the ball at the feet of the first player of the team that restarts
function ptDefRestart(t, team) {
  const Q = t.squad, b = t.b, sp = Q.spec.players; ptSqOut(t, Q.ctx[Q.active]);
  for (let i = 0; i < Q.ctx.length; i++) { const c = Q.ctx[i], f = ptSqCtx(Object.assign({}, sp[i], { facing: sp[i].team === team ? (team === 0 ? 0 : Math.PI) : (sp[i].team === 0 ? 0 : Math.PI) }), i);
    for (const k of Object.keys(f)) if (k !== "idx") c[k] = f[k]; c.def = null; c.defCool = 0; c.aiKeys = null; c.aiJockey = false; c.aiPassAt = 0; }
  let o = Q.ctx.findIndex(c => c.team === team); if (o < 0) o = 0; const op = Q.ctx[o].p;
  b.x = op.x + Math.cos(op.facing) * 0.45; b.y = op.y + Math.sin(op.facing) * 0.45; b.z = 0; b.vx = 0; b.vy = 0; b.vz = 0; b.curve = null; b.held = null; b.exclPid = null; b.exclT = 0;
  b.owner = o; b.lastTeam = team; Q.pass = null; Q.heldPass = null; Q.over = null; Q.restarts = (Q.restarts || 0) + 1;
  ptSqIn(t, Q.ctx[Q.active]); b.ctrl = b.owner === Q.active;
  ptSquadEvent(t, { kind: "RESTART", team, owner: o });
}
function ptDefQueued(t) {                                                                           // AI actions requested this tick (issued like a key press)
  if (!ptDefOn(t)) return; const Q = t.squad;
  for (let i = 0; i < Q.ctx.length; i++) { const c = Q.ctx[i]; if (!c.defQueue) continue; const k = c.defQueue; c.defQueue = null; if (k === "STAND") ptDefStand(t, i); else if (k === "SLIDE") ptDefSlide(t, i, c.defQueueDir); }
}
if (typeof module !== "undefined" && module.exports) module.exports = { PT_DEF };
