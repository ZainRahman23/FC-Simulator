// ═══ anim3d/of_recv.js — RECEIVING / FIRST TOUCH V1 on the shared skeletal runtime (presentation only) ═══════════════════════════
// The SIMULATION decides the reception (pt_squad.js): which boot, at which tick, where the ball is then, and what happens to it
// (CLEAN / HEAVY / LOOSE / DEFLECT, the cushion push, possession). It publishes a PLAN while the ball approaches (the boot and the tick it
// expects, re-evaluated every tick) and a RECORD at the contact tick. This file only makes the body explain that:
//   • PREPARE — from ~0.3 s before the planned contact the body comes over the ball: the support knee gives, the trunk leans in and the
//     head drops, the arms balance, the receiving leg opens (hip external rotation, foot turned out so its INSIDE faces the ball, ankle
//     locked slightly up). A standing reception unloads the receiving foot and braces the other; a moving one leaves the gait running.
//   • MEET — over the last ~0.16 s the receiving boot's inside face is reached onto the side of the ball that meets it (the leading side
//     of the ball's motion RELATIVE to the player), through the same bounded reach the kicks use (capped, saturating, residual reported).
//   • GUIDE / RELEASE — the boot stays with the ball for a moment after the contact (a cushion barely moves, a directional touch sweeps
//     it the way the simulation pushed it, a running take carries on with it), then hands back to the locomotion.
// ONE parameterised action — the three first-touch kinds differ only in `open` and in what the ball does next, which is the simulation's.
// If the plan disappears (the ball never came within reach) the reach that had started is let go: the attempted stretch is visible and
// the ball runs on. Nothing here writes the ball, the player or possession; nothing is random.
const OF_RECV = {
  enabled: true,        // review / diagnosis switch: false skips the receiving layer only (the rest of the presentation runs as usual)
  prepT: 0.32,          // s before the authoritative contact that the body starts to prepare
  leadT: 0.16,          // s over which the receiving boot is reached onto the contact point
  holdT: 0.07,          // s the boot stays with the ball after the contact (cushion / guide)
  outT: 0.22,           // s back to the locomotion
  freeV: 1.2,           // m/s: at or below this the reception is a STANDING one (receiving foot unloaded, the other braced) = PT_RECV.standV
  reachCap: 0.42,       // × legLen: the kicks' cap — the boot may be corrected this far; beyond, it saturates and the residual shows
  lostT: 0.22,
  bornT: 0.07,          // s: the shortest ramp-in of a receiving action that appears late (the plan switched foot / came late)          // s to let go of a reach whose plan disappeared (the ball went out of reach) or switched feet
  surfH: 0.085,         // m: height of the contact on the ball's side (the boot's inside face against the sphere)
  eps: 0.004,           // m: the boot face stops this far outside the ball surface
  ballR: 0.11,
  crouch: 0.025,        // × legLen: the pelvis drop of a standing reception (the support knee gives)
  downT: 0.08,          // s: after the hold a STANDING receiver sets the receiving boot down where it is (the contact solve plants it)
  downY: 0.035,         // m: the inside-face height the boot is lowered to (the sole on the pitch)
  moveOutT: 0.30,       // s: a MOVING receiver's boot hands back to the gait over this long (the stride carries it on)
};
// pose DELTAS for a RIGHT-foot reception (mirrored for the left). Yaw terms of the receiving leg scale with `open`.
OF_RECV.DELTA = { thigh_R: [-14, 18, 5], shin_R: [16, 0, 0], foot_R: [-10, 30, 0], thigh_L: [-6, 0, 0], shin_L: [10, 0, 0],
  pelvis: [5, 0, 0], spine: [5, 0, 0], chest: [2, 0, 0], neck: [6, 0, 0], head: [8, 0, 0], upperArm_R: [4, 0, 10], upperArm_L: [-8, 0, -16], foreArm_L: [-6, 0, 0] };
OF_RECV.OPEN = { CUSHION: 1.0, DIRECTIONAL: 0.85, RUNNING: 0.5, HEAVY: 0.9, LOOSE: 0.9, DEFLECT: 0.7 };
OF_RECV.YAWED = { thigh_R: 1, foot_R: 1 };
// the 3D point the receiving boot's inside face should meet: on the ball's surface at the contact height, on the side that meets the foot —
// the leading side of the ball's motion RELATIVE to the player, pulled a little toward where the rendered boot actually is
function ofRecvAim(bx, by, bz, rvx, rvy, from) {
  const R = OF_RECV; let ux = 0, uy = 0; const rv = Math.hypot(rvx, rvy);
  if (rv > 0.3) { ux = rvx / rv * 0.65; uy = rvy / rv * 0.65; }
  if (from) { const dx = from[0] - bx, dy = from[1] - by, m = Math.hypot(dx, dy); if (m > 1e-6) { ux += dx / m * 0.35; uy += dy / m * 0.35; } }
  const m = Math.hypot(ux, uy); if (m < 1e-6) { ux = -1; uy = 0; } else { ux /= m; uy /= m; }
  const cy = Math.max(0, bz) + R.ballR, dy = R.surfH - cy, h = Math.sqrt(Math.max(0, (R.ballR + R.eps) ** 2 - dy * dy));
  return { p: [bx + ux * h, R.surfH, -(by + uy * h)], u: [ux, uy] };                             // 3D world: [x, height, -pitchY]
}
// one receiving action applied onto the locomotion pose and plant requests (returns the new pose)
function ofRecvOne(a, R, pose, plants, now, fade) {
  const O = OF_RECV, dtc = now - R.at;
  let wP = dtc < 0 ? smooth01(clamp01(1 + dtc / O.prepT)) : dtc < O.holdT ? 1 : 1 - smooth01(clamp01((dtc - O.holdT) / O.outT));
  const post = R.fired && dtc > O.holdT;
  let wR = dtc < 0 ? smooth01(clamp01(1 + dtc / O.leadT)) : !post ? 1 : R.standing ? 1 : 1 - smooth01(clamp01((dtc - O.holdT) / O.moveOutT));
  const born = smooth01(clamp01((now - (R.t0 != null ? R.t0 : -1e9)) / O.bornT));             // a late plan (or a switched foot) never snaps its reach in
  wP *= fade * born; wR *= fade * born; R.wP = wP; R.wR = wR;
  if (wP < 0.001 && wR < 0.001) return pose;
  const sd = R.foot, other = sd === "R" ? "L" : "R", mir = sd === "L", open = O.OPEN[R.style] != null ? O.OPEN[R.style] : 1;
  const q = Object.assign({}, pose);
  for (const k in O.DELTA) {
    const d = O.DELTA[k], ks = mir ? (/_R$/.test(k) ? k.replace(/_R$/, "_L") : /_L$/.test(k) ? k.replace(/_L$/, "_R") : k) : k;
    const yawK = O.YAWED[k] ? open : 1, sg = mir ? -1 : 1, base = q[ks] || [0, 0, 0];
    q[ks] = [base[0] + d[0] * wP, base[1] + d[1] * yawK * sg * wP, base[2] + d[2] * sg * wP];
  }
  if (R.standing) { const pd = (q._pelvis || [0, 0, 0]).slice(); pd[1] -= O.crouch * a.skel.legLen * wP; q._pelvis = pd; }
  if (R.standing && post) { plants[sd] = { want: true, mode: "ankle", s: 0.3, fromLast: true }; plants[other] = { want: true, mode: "ankle", s: 0.4 }; }   // SET IT DOWN: both feet on the pitch; the stance logic steps it home afterwards
  else if (R.standing && wP > 0.3) { plants[sd] = { want: false }; plants[other] = { want: true, mode: "ankle", s: 0.4 }; }   // unload the receiving foot, brace the other
  else if (!R.standing && wR > 0.25 && plants[sd] && plants[sd].want) plants[sd] = { want: false };                    // moving: a boot still bearing weight is lifted off
  if (wR > 0.001 && R.p) { const pr = plants[sd] && typeof plants[sd] === "object" ? plants[sd] : (plants[sd] = { want: false });
    const down = R.standing && post ? smooth01(clamp01((dtc - O.holdT) / O.downT)) : 0;                                // lowered onto the pitch where it is (a planted boot is never reached)
    pr.reach = { p: down > 0 ? [R.p[0], lerp(R.p[1], O.downY, down), R.p[2]] : R.p, w: wR, cap: O.reachCap, iters: 4, surf: "inside" }; }
  return q;
}
function ofRecvApply(a, pose, plants, now) {
  const O = OF_RECV; if (!O.enabled) return pose;
  if (a.recvPrev) { const f = 1 - clamp01((now - a.recvPrev.lost) / O.lostT); if (f <= 0) a.recvPrev = null; else pose = ofRecvOne(a, a.recvPrev, pose, plants, now, f); }
  const R = a.recv; if (!R) return pose;
  if (R.lost != null) { const f = 1 - clamp01((now - R.lost) / O.lostT); if (f <= 0) { a.recv = null; return pose; } return ofRecvOne(a, R, pose, plants, now, f); }
  if (R.fired && now - R.at > O.holdT + O.outT) { a.recv = null; return pose; }
  return ofRecvOne(a, R, pose, plants, now, 1);
}
// ── the link from the simulation's reception facts to the actor (the harness calls it every tick, per player, before ofActorTick) ──
// Reads only: the player's plan (`t.recvPlan`), the contact record (`t.lastRecv`), the ball and the player's authoritative velocity.
function ofRecvLink(t, a, tick) {
  const O = OF_RECV, pl = t.recvPlan, lr = t.lastRecv, b = t.b, p = t.p, R0 = a.recv;
  const from = (foot) => { const ft = a.sol && a.sol.diag.feet[foot]; return ft && ft.ankle ? [ft.ankle[0], -ft.ankle[2]] : null; };
  const standing = Math.hypot(p.vx, p.vy) <= O.freeV;
  if (lr && lr.tick === tick) {                                                                  // the contact is THIS tick: freeze on the ball where it was
    const g = ofRecvAim(lr.point[0], lr.point[1], lr.point[2], lr.vIn[0] - lr.pv[0], lr.vIn[1] - lr.pv[1], from(lr.foot));
    if (R0 && R0.foot !== lr.foot) { a.recvPrev = R0; R0.lost = t.now; }
    const R = a.recv = (R0 && R0.foot === lr.foot) ? R0 : { t0: t.now, foot: lr.foot };
    Object.assign(R, { at: t.now, fired: true, lost: null, style: lr.style, outcome: lr.outcome, point: lr.point, p: g.p, u: g.u, rec: lr, standing: R.standing != null ? R.standing : standing });
    a.recvMeasure = R; return;
  }
  if (R0 && R0.fired) {                                                                         // after the contact: the boot stays against the ball for the hold
    if (t.now - R0.at <= O.holdT && R0.u) { const cy = Math.max(0, b.z) + O.ballR, dy = O.surfH - cy, h = Math.sqrt(Math.max(0, (O.ballR + O.eps) ** 2 - dy * dy)); R0.p = [b.x + R0.u[0] * h, O.surfH, -(b.y + R0.u[1] * h)]; }
    return;
  }
  if (pl) {
    if (R0 && R0.foot !== pl.foot && R0.lost == null) { a.recvPrev = R0; R0.lost = t.now; }
    const R = a.recv = (R0 && R0.foot === pl.foot && R0.lost == null) ? R0 : { t0: t.now, foot: pl.foot };
    const g = ofRecvAim(pl.ball[0], pl.ball[1], pl.ball[2], b.vx - p.vx, b.vy - p.vy, from(pl.foot));
    const st2 = pl.standing != null ? pl.standing : standing;                                   // the simulation's own standing / moving model at the planned contact
    Object.assign(R, { at: pl.at, fired: false, lost: null, stretch: pl.stretch, planted: pl.planted, standing: st2, style: st2 ? "CUSHION" : "RUNNING", p: g.p, u: g.u, plan: pl });
    return;
  }
  if (R0 && !R0.fired && R0.lost == null) R0.lost = t.now;                                       // the plan vanished: the ball is out of reach — let go
}
// final-state measurement at the contact tick (after every FK rebuild / ground clamp / reach): where the boot's inside face ACTUALLY is
function ofRecvMeasure(a, R) {
  const sk = a.skel, fk = a.sol.fk, sd = R.foot, other = sd === "R" ? "L" : "R";
  const S3 = ofBootSurfacePoint(sk, fk, sd, "inside"), c = [R.point[0], Math.max(0, R.point[2]) + OF_RECV.ballR, -R.point[1]];
  const d = a.sol.diag, rc = (d.reach && d.reach[sd]) || null, pf = d.feet[other] || {}, rf = d.feet[sd] || {};
  const toe = fk.tip[sk.byName["toe_" + sd].idx];
  return { foot: sd, style: R.style, outcome: R.outcome, surf: +(V3.dist(S3, c) - OF_RECV.ballR).toFixed(4), toeSurf: +(V3.dist(toe, c) - OF_RECV.ballR).toFixed(4),
    reachWant: rc ? rc.want : null, reachApplied: rc ? rc.applied : null, reachCapped: rc ? !!rc.capped : null, reachResidual: rc ? rc.residual : null,
    recvFootMode: rf.mode || null, plantMode: pf.mode || null, plantContact: !!pf.contact, plantSlide: pf.slide != null ? pf.slide : null,
    ground: +(d.ground || 0).toFixed(4), knee: d.knee ? d.knee[sd] : null, standing: !!R.standing };
}
