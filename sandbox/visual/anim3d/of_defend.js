// ═══ anim3d/of_defend.js — DEFENDING V1 on the shared skeletal runtime (PRESENTATION ONLY) ══════════════════════════════════════════
// The SIMULATION (pt_defend.js) decides every defensive action: when it starts, the contact tick, the tackling boot, whether it reaches the
// ball, what the ball does, the slide's own authoritative movement and how long the player is on the ground. This file only makes the
// body explain it, reading those facts and never writing the ball, a player or possession. With OFPLAY.animOff it never runs.
//   • JOCKEY — a containment stance over the locomotion: lower hips, a wider base, the trunk over the ball, arms out for balance. The
//     locomotion already plays side-steps and the back-pedal from the authoritative velocity / facing; this only changes the posture.
//   • STANDING TACKLE — the support knee gives and the body lunges; the tackling leg opens and the INSIDE of the boot is tracked onto the
//     side of the ball the simulation's contact tick has it (a miss shows the same attempt falling short: the reach is capped, the leg
//     never locks straight). The other boot is planted through the ordinary contact solve. Recovery hands back to the locomotion.
//   • SLIDE TACKLE — launch (drop onto the hip of the non-tackling side), the ground slide (tackling leg extended along the pitch, the
//     other tucked under, the trailing hand bracing, the trunk reclined and curled over the ball), stop, then a get-up (sit → kneel →
//     crouch → stand) timed to the simulation's own ground / get-up windows. The body is lowered onto the pitch by measuring the pose,
//     not by an authored height, so every body lies ON the ground whatever its proportions.
const OF_DEF = {
  enabled: true,
  jockeyT: 0.18,        // s: jockey posture blend
  stand: { inT: 0.10, holdT: 0.10, outT: 0.28, trackT: 0.20, cap: 0.70, surfH: 0.085, eps: 0.004 },
  slide: { dropT: 0.12, clear: 0.012, outT: 0.30, trackT: 0.15, holdT: 0.06, cap: 0.20, reach: true },
  ballR: 0.11,
};
// poses are authored for a RIGHT-foot action; the left one is the mirror (swap sides, negate yaw / roll and the lateral pelvis offset)
OF_DEF.JOCKEY = { _pelvis: [0, -0.07, -0.02], pelvis: [14, 0, 0], spine: [6, 0, 0], chest: [2, 0, 0], neck: [-6, 0, 0], head: [-8, 0, 0],
  thigh_R: [-10, 0, 7], shin_R: [16, 0, 0], thigh_L: [-10, 0, -7], shin_L: [16, 0, 0], upperArm_R: [-14, 0, 26], foreArm_R: [-34, 0, 0], upperArm_L: [-14, 0, -26], foreArm_L: [-34, 0, 0] };   // DELTAS
OF_DEF.LUNGE = { _pelvis: [0, -0.15, 0.06], pelvis: [16, 0, 0], spine: [8, 0, 0], chest: [4, 0, 0], neck: [-8, 0, 0], head: [-10, 0, 0],
  thigh_L: [-38, 0, -6], shin_L: [64, 0, 0], foot_L: [-20, 0, 0],
  thigh_R: [-48, 22, 16], shin_R: [22, 0, 0], foot_R: [-8, 38, 0],
  upperArm_R: [-10, 0, 48], foreArm_R: [-30, 0, 0], upperArm_L: [-34, 0, -46], foreArm_L: [-44, 0, 0] };
// key poses of the ground sequence, SOLVED (not hand-set): target knee / ankle / hand positions for a body lying, sitting, kneeling and
// crouching on the pitch, fitted through this rig's own FK with anatomical bounds (hip rotation ≤ 50°, abduction ≤ 45°, knee 0–140°).
// The pelvis height is not authored: at run time every body is lowered by exactly what puts its lowest point on the pitch.
OF_DEF.SLIDE = { _pelvis: [0, 0, -0.06], pelvis: [-60, 0, 12], spine: [24, 0, -4], chest: [12, 0, -2], neck: [18, 0, 0], head: [16, 0, 0], thigh_R: [-27.5, 2, -16], shin_R: [9, 0, 0], foot_R: [16.8, 0, 0], thigh_L: [-70.3, 9.8, -11.8], shin_L: [106.8, 0, 0], foot_L: [15.5, 0, 0], upperArm_L: [61.3, 6.3, 0], foreArm_L: [-78, 0, 0], upperArm_R: [-56, 0, 56], foreArm_R: [-40, 0, 0] };
OF_DEF.SIT = { _pelvis: [0, 0, -0.08], pelvis: [-30, 0, 5], spine: [28, 0, 0], chest: [12, 0, 0], neck: [6, 0, 0], head: [4, 0, 0], thigh_R: [-98.5, -11.5, 6], shin_R: [96.3, 0, 0], foot_R: [27.3, 0, 0], thigh_L: [-104, -3.8, 3.8], shin_L: [108, 0, 0], foot_L: [20, 0, 0], upperArm_L: [20.3, 14.5, 0], foreArm_L: [-17.5, 0, 0], upperArm_R: [15.8, -34, 0], foreArm_R: [-17.3, 0, 0] };
OF_DEF.KNEEL = { _pelvis: [0, 0, 0], pelvis: [10, 0, 0], spine: [14, 0, 0], chest: [6, 0, 0], neck: [-8, 0, 0], head: [-8, 0, 0], thigh_R: [-93.3, -4.3, 0], shin_R: [99.3, 0, 0], foot_R: [-21.5, 0, 0], thigh_L: [-5.3, 0, 5], shin_L: [90.5, 0, 0], foot_L: [45, 0, 0], upperArm_L: [-24, 0, -26], foreArm_L: [-40, 0, 0], upperArm_R: [-16.5, 6, 0], foreArm_R: [-76.8, 0, 0] };
OF_DEF.CROUCH = { _pelvis: [0, 0, 0], pelvis: [22, 0, 0], spine: [8, 0, 0], chest: [4, 0, 0], neck: [-8, 0, 0], head: [-10, 0, 0], thigh_R: [-61.3, -3, 0], shin_R: [78.5, 0, 0], foot_R: [-40, 0, 0], thigh_L: [-58, 3.3, 0], shin_L: [77.5, 0, 0], foot_L: [-40, 0, 0], upperArm_L: [-20, 0, -30], foreArm_L: [-50, 0, 0], upperArm_R: [-20, 0, 30], foreArm_R: [-50, 0, 0] };
function ofDefMirror(P) {
  const q = {}; for (const k in P) { const v = P[k]; if (!Array.isArray(v)) continue;
    const ks = /_R$/.test(k) ? k.replace(/_R$/, "_L") : /_L$/.test(k) ? k.replace(/_L$/, "_R") : k;
    q[ks] = k === "_pelvis" ? [-v[0], v[1], v[2]] : [v[0], -v[1], -v[2]]; }
  return q; }
const ofDefSide = (P, foot) => foot === "L" ? ofDefMirror(P) : P;
function ofDefLerpPose(A, B, w) { const q = {}; const ks = new Set(Object.keys(A).concat(Object.keys(B)));
  for (const k of ks) { if (k === "name") continue; const a = A[k] || [0, 0, 0], b = B[k] || [0, 0, 0]; if (!Array.isArray(a) && !Array.isArray(b)) continue; q[k] = [a[0] + (b[0] - a[0]) * w, a[1] + (b[1] - a[1]) * w, a[2] + (b[2] - a[2]) * w]; }
  return q; }
function ofDefAddPose(base, D, w, legK) { const q = Object.assign({}, base); for (const k in D) { const d = D[k], b = q[k] || [0, 0, 0], s = k === "_pelvis" ? legK : 1; q[k] = [b[0] + d[0] * w * s, b[1] + d[1] * w * s, b[2] + d[2] * w * s]; } return q; }
// the 3D point the tackling boot's inside face should meet (as the reception's: the ball's surface at the contact height, on the side
// that faces the tackler — the block tackle puts the boot across the ball's path toward him)
function ofDefAim(bx, by, bz, fromX, fromY) {
  const O = OF_DEF, dx = fromX - bx, dy = fromY - by, m = Math.hypot(dx, dy) || 1, ux = dx / m, uy = dy / m;
  const cy = Math.max(0, bz) + O.ballR, dyh = O.stand.surfH - cy, h = Math.sqrt(Math.max(0, (O.ballR + O.stand.eps) ** 2 - dyh * dyh));
  return [bx + ux * h, O.stand.surfH, -(by + uy * h)];
}
// ── the link (per tick, per player, before ofActorTick): copies the simulation's facts onto the actor ─────────────────────────
function ofDefLink(t, a, c, tick) {
  if (!OF_DEF.enabled) { a.defA = null; a.jockeyOn = false; a.defYaw = null; return; }
  const b = t.b, Q = t.squad, i = c.idx, d = c.def, now = t.now;
  a.jockeyOn = !d && b.owner !== i && ((i === Q.active && !Q.humanAi && t.keys && t.keys.jockey) || !!c.aiJockey);
  if (d && (!a.defA || a.defA.src !== d)) a.defA = { src: d, kind: d.kind, foot: d.foot, t0: d.t0, born: now };
  const A = a.defA; if (!A) return;
  if (!d && A.src && A.end == null) A.end = now;                                                   // the simulation finished the action: hand back
  if (A.kind === "STAND") {
    const s = A.src; A.at = s.contactAt;
    if (!s.resolved) { const tl = Math.max(0, s.contactAt - now); A.ball = [b.x + b.vx * tl, b.y + b.vy * tl, b.z]; }             // where the ball will be at the contact tick (a presentation estimate, refreshed every tick)
    else if (s.result && A.res !== s.result) { A.res = s.result; A.ball = s.result.point.slice(); A.fired = now; if (s.result.contactTick === Q.tick) a.defMeasure = A; }
    A.p = ofDefAim(A.ball[0], A.ball[1], A.ball[2], c.p.x, c.p.y); A.recoverUntil = s.recoverUntil;
  } else if (A.kind === "SLIDE") {
    const s = A.src; Object.assign(A, { launchAt: s.launchAt, dir: s.dir, stopAt: s.stopAt, v0: s.v0 });
    if (s.contact && s.contact.contactTick === Q.tick && A.res !== s.contact) { A.res = s.contact; a.defMeasure = A; }
    if (s.contact && s.contact.out !== "MISS" && A.res !== s.contact) A.res = s.contact;
    A.plan = s.plan ? { at: s.plan.at, ball: s.plan.ball.slice(), root: s.plan.root.slice() } : null;
    if (s.contact && s.contact.point && A.hit == null) { A.hit = now; A.hitBall = s.contact.point.slice(); }
    const G = PT_DEF.slide; A.getup0 = s.stopAt != null ? s.stopAt + G.groundT : null; A.getup1 = A.getup0 != null ? A.getup0 + G.getupT : null; A.rec1 = A.getup1 != null ? A.getup1 + G.recoverT : null;
    A.ball = [b.x, b.y, b.z];
  }
}
// ── the body: applied in ofActorTick after the locomotion / touch layers (the receiving layer is suppressed while an action runs) ──
function ofDefApply(a, pose, plants, now, rootM) {
  const O = OF_DEF; let q = pose; const legK = a.skel.legLen / OF_REF_LEG;
  // JOCKEY posture (a delta over the locomotion, weight slewed)
  a.jkW = a.jkW || 0; const jt = a.jockeyOn ? 1 : 0, js = 1 / 60 / O.jockeyT; a.jkW = a.jkW < jt ? Math.min(jt, a.jkW + js) : Math.max(jt, a.jkW - js);
  if (a.jkW > 0.001) q = ofDefAddPose(q, O.JOCKEY, smooth01(a.jkW), legK);
  const A = a.defA; if (!A) return q;
  if (A.kind === "STAND") return ofDefStand(a, A, q, plants, now, legK);
  if (A.kind === "SLIDE") return ofDefSlide(a, A, q, plants, now, rootM);
  return q;
}
function ofDefStand(a, A, pose, plants, now, legK) {
  const O = OF_DEF.stand, sd = A.foot, other = sd === "R" ? "L" : "R", dtc = now - A.at;
  const endT = A.end != null ? A.end : (A.recoverUntil || A.at + 0.3);
  let w = now < A.at ? smooth01(clamp01((now - A.t0) / O.inT)) : now < A.at + O.holdT ? 1 : 1 - smooth01(clamp01((now - (A.at + O.holdT)) / O.outT));
  if (now - (A.at + O.holdT) > O.outT && A.end != null) { a.defA = null; }
  if (w <= 0.001) return pose;
  const L = ofDefSide(OF_DEF.LUNGE, sd), q = ofDefLerpPose(pose, Object.assign({}, L, { _pelvis: V3.scale(L._pelvis, legK) }), w);
  if (plants[other] !== undefined) plants[other] = { want: true, mode: "ankle", s: 0.4, fromLast: true };   // the support boot: planted where it is
  const pr = plants[sd] = { want: false };
  let track;
  if (dtc < -O.trackT) track = { mode: "zero", tLeft: 1 / 60 };
  else if (dtc <= O.holdT) track = { mode: "to", tLeft: Math.max(1 / 60, -dtc), exact: dtc > -1 / 60 - 1e-9 && dtc < O.holdT };
  else track = { mode: "zero", tLeft: Math.max(1 / 60, O.holdT + O.outT - dtc) };
  pr.reach = { p: A.p, w: 1, cap: O.cap, iters: 4, surf: "inside", track };
  return q;
}
function ofDefKeyPose(P, sd) { return ofDefSide(P, sd); }
function ofDefSlide(a, A, pose, plants, now, rootM) {
  const O = OF_DEF.slide, sd = A.foot, G = PT_DEF.slide;
  // the timeline: launch → (the simulation's) slide → ground → get-up → recovery (the simulation's own windows)
  let P, w = 1, phase;
  const S = ofDefKeyPose(OF_DEF.SLIDE, sd);
  if (A.getup0 == null || now < A.getup0) { phase = now < A.launchAt ? "LAUNCH" : A.stopAt == null ? "SLIDE" : "GROUND"; P = S; w = smooth01(clamp01((now - A.t0) / (G.windT + O.dropT))); }
  else if (now < A.getup1) { phase = "GETUP"; const u = (now - A.getup0) / (A.getup1 - A.getup0), K = [[0, S], [0.34, ofDefKeyPose(OF_DEF.SIT, sd)], [0.68, ofDefKeyPose(OF_DEF.KNEEL, sd)], [1, ofDefKeyPose(OF_DEF.CROUCH, sd)]];
    let k = 0; while (k < K.length - 2 && u > K[k + 1][0]) k++; P = ofDefLerpPose(K[k][1], K[k + 1][1], smooth01(clamp01((u - K[k][0]) / (K[k + 1][0] - K[k][0])))); }
  else { phase = "RECOVER"; P = ofDefKeyPose(OF_DEF.CROUCH, sd); w = 1 - smooth01(clamp01((now - A.getup1) / (A.rec1 - A.getup1 + O.outT))); if (w <= 0.001) { a.defA = null; a.defYaw = null; return pose; } }
  A.phase = phase;
  // the body's yaw: turned onto the slide direction through the wind-up (from where the legs were), held until the recovery hands back
  if (A.yaw0 == null) A.yaw0 = a.legYaw != null ? a.legYaw : a.facing;
  if (phase !== "RECOVER") { const k = smooth01(clamp01((now - A.t0) / Math.max(1e-3, A.launchAt - A.t0))), dy = Math.atan2(Math.sin(A.dir - A.yaw0), Math.cos(A.dir - A.yaw0)); a.defYaw = A.yaw0 + dy * k; }
  else a.defYaw = null;
  // lower the body ONTO the pitch: measure the authored pose's lowest core / leg point and drop the pelvis by exactly that (per body)
  const P0 = Object.assign({}, P, { _pelvis: [P._pelvis ? P._pelvis[0] : 0, 0, P._pelvis ? P._pelvis[2] : 0] });
  const fk = skelFK(a.skel, P0, rootM); let minY = 1e9;
  for (const b of a.skel.bones) { if (!b.part || b.name === "root" || b.name === "hair" || /^(hand|foreArm|upperArm|clavicle)_/.test(b.name)) continue; const v = Math.min(fk.joint[b.idx][1], fk.tip[b.idx][1]) - (/^(foot|toe)_/.test(b.name) ? 0.01 : b.rad * 0.6); if (v < minY) minY = v; }
  const drop = Math.max(0, minY - O.clear);
  P0._pelvis[1] = -drop;
  const q = ofDefLerpPose(pose, P0, w);
  // the feet: nothing is planted while the body slides (the root is moving at the slide's speed); in the get-up the root is still
  plants.R = { want: false }; plants.L = { want: false };
  // the tackling boot is TRACKED onto the simulation's planned contact (the ball's surface facing the slider) over the last moments, held
  // through the contact, then handed back to the pose (the same bounded tracking reach the receptions use)
  if (O.reach) { const T = O.trackT, pr = plants[sd]; let track = null, tgt = null;
    // the aim: the point of the ball's surface NEAREST the tackling leg's line (the leg meets the ball from the side it sweeps past)
    const aimAt = (bx, by, bz, rx, ry) => { const G = PT_DEF.slide, leg = a.skel.legLen, sg = sd === "R" ? 1 : -1, fx = Math.cos(A.dir), fy = Math.sin(A.dir), lo = G.legLat * leg;
      const ax = rx + fx * G.legFrom * leg - fy * sg * lo, ay = ry + fy * G.legFrom * leg + fx * sg * lo, ex = rx + fx * G.reachAhead * leg - fy * sg * lo, ey = ry + fy * G.reachAhead * leg + fx * sg * lo;
      const L2 = (ex - ax) ** 2 + (ey - ay) ** 2, u = Math.max(0, Math.min(1, ((bx - ax) * (ex - ax) + (by - ay) * (ey - ay)) / L2)), qx = ax + (ex - ax) * u, qy = ay + (ey - ay) * u;
      return u < 0.6 ? null : ofDefAim(bx, by, bz, qx, qy); };
    if (A.hit != null) { const dh = now - A.hit; track = dh <= O.outT ? { mode: "zero", tLeft: Math.max(1 / 60, O.outT - dh) } : null; }
    else if (A.plan && A.plan.at - now <= T) { tgt = aimAt(A.plan.ball[0], A.plan.ball[1], A.plan.ball[2], A.plan.root[0], A.plan.root[1]); track = tgt ? { mode: "to", tLeft: Math.max(1 / 60, A.plan.at - now) } : { mode: "zero", tLeft: 0.1 }; }
    else if (a.state && a.state.feet[sd] && a.state.feet[sd].track && V3.len(a.state.feet[sd].track.off) > 1e-4) track = { mode: "zero", tLeft: 0.12 };
    if (track) pr.reach = { p: tgt, w: 1, cap: O.cap, iters: 4, track }; }
  if (phase === "RECOVER") { plants.R = { want: true, mode: "ankle", s: 0.4, fromLast: true }; plants.L = { want: true, mode: "ankle", s: 0.4, fromLast: true }; }
  A.drop = drop;
  return q;
}
// final-state measurement at the contact tick: the rendered tackling leg against the ball where the simulation met it
function ofDefMeasure(a, A) {
  const sk = a.skel, fk = a.sol.fk, sd = A.foot, r = A.res, c = [r.point ? r.point[0] : A.ball[0], Math.max(0, r.point ? r.point[2] : 0) + OF_DEF.ballR, -(r.point ? r.point[1] : A.ball[1])];
  const J = (n) => fk.joint[sk.byName[n].idx], toe = fk.tip[sk.byName["toe_" + sd].idx], knee = J("shin_" + sd), ankle = J("foot_" + sd);
  const segD = (p, a0, a1) => { const d = V3.sub(a1, a0), L = V3.dot(d, d), s = L > 1e-12 ? Math.max(0, Math.min(1, V3.dot(V3.sub(p, a0), d) / L)) : 0; return V3.dist(p, V3.add(a0, V3.scale(d, s))); };
  const inside = ofBootSurfacePoint(sk, fk, sd, "inside");
  const legSurf = Math.min(segD(c, knee, ankle) - 0.055, segD(c, ankle, toe) - 0.045) - OF_DEF.ballR;   // the rendered shin / boot capsules against the ball
  const d = a.sol.diag, other = sd === "R" ? "L" : "R", pf = d.feet[other] || {}, rc = (d.reach && d.reach[sd]) || null;
  const hand = J("hand_" + (sd === "R" ? "L" : "R"));
  return { kind: A.kind, foot: sd, out: r.out, why: r.why || null, insideSurf: +(V3.dist(inside, c) - OF_DEF.ballR).toFixed(4), legSurf: +legSurf.toFixed(4), toeSurf: +(V3.dist(toe, c) - OF_DEF.ballR).toFixed(4),
    reachApplied: rc ? rc.applied : null, reachCapped: rc ? !!rc.capped : null, knee: d.knee ? d.knee[sd] : null, kneeOther: d.knee ? d.knee[other] : null,
    plantMode: pf.mode || null, plantContact: !!pf.contact, plantSlide: pf.slide != null ? pf.slide : null, ground: +(d.ground || 0).toFixed(4), handY: +hand[1].toFixed(3), drop: A.drop != null ? +A.drop.toFixed(3) : null, phase: A.phase || null,
    geo: { ball: c.map(v => +v.toFixed(3)), knee: knee.map(v => +v.toFixed(3)), ankle: ankle.map(v => +v.toFixed(3)), toe: toe.map(v => +v.toFixed(3)), root: [+a.x.toFixed(3), +a.y.toFixed(3)] } };
}
