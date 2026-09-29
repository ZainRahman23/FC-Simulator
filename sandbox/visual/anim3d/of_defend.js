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
  slide: { dropT: 0.12, clear: 0.012, outT: 0.30, trackT: 0.15, trackT12: 0.05, holdT: 0.06, cap: 0.20, reach: true, variant: "normal" },
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
// NORMAL slide (V1.1, from the slide-tackle research): side-on on the tucked-leg hip / outer thigh, one tackling leg along the pitch
OF_DEF.SLIDE2 = { _pelvis: [0, 0, 0], pelvis: [-46, -40.8, 46.5], spine: [40.8, 35, -11.5], chest: [35, -10.8, 20], neck: [34, 29.8, -15], head: [6, -30, 10], thigh_R: [-30.8, -50, 13.5], shin_R: [26, 0, 0], foot_R: [50, 25, -15], thigh_L: [-19.6, -50, 18.5], shin_L: [140, 0, 0], foot_L: [50, 25, 13], upperArm_L: [20.8, -18.8, -15.3], foreArm_L: [-53.3, 0, 0], upperArm_R: [-38.3, -0.3, 24.5], foreArm_R: [-86.8, 0, 0] };
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
  // V1.2: the sweep tables are solved ONCE per body (both sides, both amplitudes) when the defending drill first presents him — a load-time cost
  // (≈ 40 ms per character), never a hitch at the moment of a drop. Deterministic: they depend only on the skeleton.
  if (PT_DEF.slide.rule === "far" && a.skel && !a.skel._defWarm) { a.skel._defWarm = true; const W = PT_DEF.slide.sweep;
    for (const sd of ["R", "L"]) { const S = ofDefKeyPose(OF_DEF.SLIDE2, sd), AL = ofDefLegAlignV12(a.skel, S, sd); ofDefSweepTable(a.skel, S, sd, AL, W.th1); ofDefSweepTable(a.skel, S, sd, AL, W.block1); } }
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
    const s = A.src; Object.assign(A, { launchAt: s.launchAt, dir: s.dir, stopAt: s.stopAt, v0: s.v0, rule: s.rule || "near", tuck: s.tuck || null, th1: s.th1 || 0, tech: s.tech || null });
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
  if (A.kind === "SLIDE" && a.sol && a.sol.fk) { const fk = a.sol.fk, sk = a.skel, pv = {}; for (const sd of ["R", "L"]) pv[sd] = { toe: fk.tip[sk.byName["toe_" + sd].idx].slice(), ankle: fk.joint[sk.byName["foot_" + sd].idx].slice(), knee: fk.joint[sk.byName["shin_" + sd].idx].slice() }; A.prevLeg = pv; }   // V1.2: last tick's rendered legs (velocity at the contact)
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
// ALIGNMENT (V1.1): the simulation's tackling leg is a capsule along the slide, legFrom…reachAhead × leg ahead of the root and legLat × leg to
// the tackling side. The side-on body cannot put its leg exactly there by joint angles alone (the hip is where the body lies), so the
// whole body is turned and shifted by a small PRESENTATION offset — measured once per body and tackling side — that lays the rendered
// knee→toe line on the simulation's line. The authoritative root never moves; the offset is the same kind the lunge's pelvis shift is.
function ofDefLegAlign(skel, P, sd) {
  const C = skel._defAlign || (skel._defAlign = {}); if (C[sd]) return C[sd];
  const G = PT_DEF.slide, leg = skel.legLen, sg = sd === "R" ? 1 : -1, pel = skel.byName.pelvis, base = pel.off.slice();
  const meas = (yaw, ox, oz) => { pel.off = [base[0] + ox, base[1], base[2] + oz]; const fk = skelFK(skel, P, gkRootMatrix(0, 0, yaw, 0)); pel.off = base;
    const K = fk.joint[skel.byName["shin_" + sd].idx], T = fk.tip[skel.byName["toe_" + sd].idx];
    return { kF: K[0], kR: -K[2], tF: T[0], tR: -T[2] }; };                                     // pitch frame at travel 0: forward = x, rig-right = −z
  let yaw = 0;
  for (let it = 0; it < 6; it++) { const m = meas(yaw, 0, 0), phi = Math.atan2(m.tR - m.kR, m.tF - m.kF), m2 = meas(yaw + 0.01, 0, 0), phi2 = Math.atan2(m2.tR - m2.kR, m2.tF - m2.kF);
    const dphi = (phi2 - phi) / 0.01; if (Math.abs(dphi) < 1e-6) break; yaw -= phi / dphi; }
  let ox = 0, oz = 0;
  for (let it = 0; it < 4; it++) { const m = meas(yaw, ox, oz), eF = G.reachAhead * leg - m.tF, eR = sg * G.legLat * leg - (m.tR + m.kR) / 2;
    const mx = meas(yaw, ox + 0.01, oz), mz = meas(yaw, ox, oz + 0.01);
    const a11 = (mx.tF - m.tF) / 0.01, a12 = (mz.tF - m.tF) / 0.01, a21 = ((mx.tR + mx.kR) - (m.tR + m.kR)) / 0.02, a22 = ((mz.tR + mz.kR) - (m.tR + m.kR)) / 0.02, det = a11 * a22 - a12 * a21;
    if (Math.abs(det) < 1e-9) break; ox += (eF * a22 - a12 * eR) / det; oz += (a11 * eR - a21 * eF) / det; }
  return (C[sd] = { yaw, ox, oz });
}
// SLIDE CONTACT GEOMETRY V1.2 — the SWEEP. The simulation's tackling leg (the FAR leg) rotates about its hip from th0 to th1 toward the tucked side
// (ptDefSlideLeg). The rendered leg follows it: at a handful of sweep angles the tackling thigh (3 axes) and knee are SOLVED through this rig's
// own FK so the rendered knee and toe lie on the simulation's leg line (their heights held where the slide pose has them), with the pelvis
// turned by pelvisK × θ (the hip rotation that drives a sweep); the angles between are interpolated. Per body, side and amplitude (cached).
function ofDefSweepTable(skel, S, sd, AL, th1) {
  const C = skel._defSweep || (skel._defSweep = {}), key = sd + ":" + th1.toFixed(3); if (C[key]) return C[key];
  const G = PT_DEF.slide, W = G.sweep, leg = skel.legLen, sgF = sd === "R" ? 1 : -1, k0 = G.legFrom * leg - W.hipF, k1 = G.reachAhead12 * leg - W.hipF, pk = W.pelvisK || 0;
  const pel = skel.byName.pelvis, base = pel.off.slice(), thN = "thigh_" + sd, shN = "shin_" + sd, ftN = "foot_" + sd, iK = skel.byName[shN].idx, iA = skel.byName[ftN].idx, iT = skel.byName["toe_" + sd].idx;
  const meas = (P, yaw) => { pel.off = [base[0] + AL.ox, base[1], base[2] + AL.oz]; const fk = skelFK(skel, P, gkRootMatrix(0, 0, yaw, 0)); pel.off = base;
    const K = fk.joint[iK], A = fk.joint[iA], T = fk.tip[iT]; return [K[0], -K[2], K[1], A[0], -A[2], A[1], T[0], -T[2], T[1]]; };   // pitch frame at travel 0: forward = x, right = −z, height = y
  const h0 = meas(S, AL.yaw), rows = [], NS = Math.max(2, Math.ceil(th1 / 0.15)), NV = 6;
  let x = [0, 0, 0, 0, 0, 0];
  for (let k = 0; k <= NS; k++) {
    const th = th1 * k / NS, ux = Math.cos(th), uy = -sgF * Math.sin(th), hx = W.hipF, hy = sgF * W.hipLat;
    const yaw = AL.yaw - sgF * pk * th;   // the tucked side is −sgF (the pelvis turns with the sweep)
    const pose = (v) => { const P = Object.assign({}, S), a = S[thN] || [0, 0, 0], b = S[shN] || [0, 0, 0], f = S[ftN] || [0, 0, 0];
      P[thN] = [a[0] + v[0], a[1] + v[1], a[2] + v[2]]; P[shN] = [Math.max(0, Math.min(140, b[0] + v[3])), b[1], b[2]]; P[ftN] = [f[0] + v[4], f[1] + v[5], f[2]]; return P; };
    const perp = (px, py) => (px - hx) * -uy + (py - hy) * ux, along = (px, py) => (px - hx) * ux + (py - hy) * uy;
    // the whole lower leg AND the boot on the simulation's line: knee, ankle and toe tip on it (the boot continuing the leg — a locked, hooked
    // ankle), the toe tip at the leg's reach, the heights held where the slide pose has them
    const res = (v) => { const m = meas(pose(v), yaw);
      return [perp(m[6], m[7]), along(m[6], m[7]) - k1, perp(m[3], m[4]), perp(m[0], m[1]), 0.5 * (m[2] - h0[2]), 0.5 * (m[5] - h0[5]), 0.5 * (m[8] - h0[8]), 0.2 * (along(m[0], m[1]) - k0)]; };
    for (let it = 0; it < 16; it++) {
      const r0 = res(x), J = [];
      for (let j = 0; j < NV; j++) { const xp = x.slice(); xp[j] += 0.5; const r1 = res(xp); J.push(r1.map((q, i) => (q - r0[i]) / 0.5)); }
      const A = Array.from({ length: NV }, () => new Array(NV).fill(0)), g = new Array(NV).fill(0), NR = r0.length;
      for (let i = 0; i < NV; i++) { for (let j = 0; j < NV; j++) for (let q = 0; q < NR; q++) A[i][j] += J[i][q] * J[j][q]; for (let q = 0; q < NR; q++) g[i] -= J[i][q] * r0[q]; A[i][i] += 1e-4 + 1e-3 * A[i][i]; }
      const dx = ofDefSolveN(A, g); if (!dx) break; let m = 0; for (let j = 0; j < NV; j++) { const st = Math.max(-12, Math.min(12, dx[j])); x[j] += st; m = Math.max(m, Math.abs(st)); }
      x[0] = Math.max(-80, Math.min(80, x[0])); x[1] = Math.max(-80, Math.min(80, x[1])); x[2] = Math.max(-60, Math.min(60, x[2])); x[4] = Math.max(-60, Math.min(60, x[4])); x[5] = Math.max(-45, Math.min(45, x[5]));
      if (m < 0.05) break; }
    const rr = res(x); rows.push({ th, d: x.slice(), err: +Math.hypot(rr[0], rr[1], rr[2], rr[3]).toFixed(4) }); }
  return (C[key] = { rows, pk, sgF });
}
function ofDefSolveN(A, b) { const n = b.length, M = A.map((r, i) => r.concat([b[i]]));
  for (let c = 0; c < n; c++) { let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r; if (Math.abs(M[p][c]) < 1e-12) return null; [M[c], M[p]] = [M[p], M[c]];
    for (let r = 0; r < n; r++) if (r !== c) { const f = M[r][c] / M[c][c]; for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k]; } }
  return M.map((r, i) => r[n] / r[i]); }
function ofDefSolve4(A, b) { const n = 4, M = A.map((r, i) => r.concat([b[i]]));
  for (let c = 0; c < n; c++) { let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r; if (Math.abs(M[p][c]) < 1e-12) return null; [M[c], M[p]] = [M[p], M[c]];
    for (let r = 0; r < n; r++) if (r !== c) { const f = M[r][c] / M[c][c]; for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k]; } }
  return M.map((r, i) => r[n] / r[i]); }
function ofDefSweepAt(T, th) { const R = T.rows; if (th <= R[0].th) return R[0].d; if (th >= R[R.length - 1].th) return R[R.length - 1].d;
  let k = 0; while (k < R.length - 2 && th > R[k + 1].th) k++; const u = (th - R[k].th) / (R[k + 1].th - R[k].th); return R[k].d.map((v, i) => v + (R[k + 1].d[i] - v) * u); }
// V1.2 ALIGNMENT: the whole slide body turned and shifted (presentation offset, the root never moves) so that the rendered TACKLING HIP sits on the
// simulation's hip (hipF behind the root, hipLat to the tackling side — he lies on the near hip, the top hip over the pelvis) and the rendered
// hip → toe line lies along the slide at th0. Measured once per body and side.
function ofDefLegAlignV12(skel, P, sd) {
  const C = skel._defAlign12 || (skel._defAlign12 = {}); if (C[sd]) return C[sd];
  const W = PT_DEF.slide.sweep, sgF = sd === "R" ? 1 : -1, pel = skel.byName.pelvis, base = pel.off.slice(), iH = skel.byName["thigh_" + sd].idx, iT = skel.byName["toe_" + sd].idx;
  const meas = (yaw, ox, oz) => { pel.off = [base[0] + ox, base[1], base[2] + oz]; const fk = skelFK(skel, P, gkRootMatrix(0, 0, yaw, 0)); pel.off = base;
    const H = fk.joint[iH], T = fk.tip[iT]; return { hF: H[0], hR: -H[2], tF: T[0], tR: -T[2] }; };
  let yaw = 0, ox = 0, oz = 0;
  for (let it = 0; it < 8; it++) { const m = meas(yaw, ox, oz); yaw -= Math.atan2(m.tR - m.hR, m.tF - m.hF);
    const m2 = meas(yaw, ox, oz); const eF = W.hipF - m2.hF, eR = sgF * W.hipLat - m2.hR;
    // the pelvis offset is in the ROOT's local frame (gkRootMatrix: local x = his right, local z = forward); the error is in the pitch frame
    const c = Math.cos(yaw), s = Math.sin(yaw); oz += eF * c + eR * s; ox += -eF * s + eR * c; }
  const m = meas(yaw, ox, oz); return (C[sd] = { yaw, ox, oz, res: +Math.hypot(m.hF - W.hipF, m.hR - sgF * W.hipLat).toFixed(4) });
}
function ofDefSlide(a, A, pose, plants, now, rootM) {
  const O = OF_DEF.slide, sd = A.foot, G = PT_DEF.slide;
  // the timeline: launch → (the simulation's) slide → ground → get-up → recovery (the simulation's own windows)
  let P, w = 1, phase;
  const V1 = O.variant === "reckless_v1", S = ofDefKeyPose(V1 ? OF_DEF.SLIDE : OF_DEF.SLIDE2, sd);
  if (A.getup0 == null || now < A.getup0) { phase = now < A.launchAt ? "LAUNCH" : A.stopAt == null ? "SLIDE" : "GROUND"; P = S; w = smooth01(clamp01((now - A.t0) / (G.windT + O.dropT))); }
  else if (now < A.getup1) { phase = "GETUP"; const u = (now - A.getup0) / (A.getup1 - A.getup0), K = V1 ? [[0, S], [0.34, ofDefKeyPose(OF_DEF.SIT, sd)], [0.68, ofDefKeyPose(OF_DEF.KNEEL, sd)], [1, ofDefKeyPose(OF_DEF.CROUCH, sd)]]
      : [[0, S], [0.45, ofDefKeyPose(OF_DEF.KNEEL, sd)], [1, ofDefKeyPose(OF_DEF.CROUCH, sd)]];   // normal: roll up onto the tucked knee + tackling foot, then up
    let k = 0; while (k < K.length - 2 && u > K[k + 1][0]) k++; P = ofDefLerpPose(K[k][1], K[k + 1][1], smooth01(clamp01((u - K[k][0]) / (K[k + 1][0] - K[k][0])))); }
  else { phase = "RECOVER"; P = ofDefKeyPose(OF_DEF.CROUCH, sd); w = 1 - smooth01(clamp01((now - A.getup1) / (A.rec1 - A.getup1 + O.outT))); if (w <= 0.001) { a.defA = null; a.defYaw = null; return pose; } }
  A.phase = phase;
  // the body's yaw: turned onto the slide direction through the wind-up (from where the legs were), held until the recovery hands back
  if (A.yaw0 == null) A.yaw0 = a.legYaw != null ? a.legYaw : a.facing;
  if (phase !== "RECOVER") { const k = smooth01(clamp01((now - A.t0) / Math.max(1e-3, A.launchAt - A.t0))), dy = Math.atan2(Math.sin(A.dir - A.yaw0), Math.cos(A.dir - A.yaw0)); a.defYaw = A.yaw0 + dy * k; }
  else a.defYaw = null;
  // lower the body ONTO the pitch: measure the authored pose's lowest core / leg point and drop the pelvis by exactly that (per body)
  // the leg alignment, weighted by how much of the slide pose is on (full while sliding / on the ground, handed back through the get-up)
  const AL = V1 ? null : A.rule === "far" ? ofDefLegAlignV12(a.skel, S, sd) : ofDefLegAlign(a.skel, S, sd), wA = !AL ? 0 : phase === "RECOVER" ? 0 : phase === "GETUP" ? 1 - smooth01(clamp01((now - A.getup0) / (0.45 * (A.getup1 - A.getup0)))) : w;
  const P0 = Object.assign({}, P, { _pelvis: [(P._pelvis ? P._pelvis[0] : 0) + (AL ? AL.ox * wA : 0), 0, (P._pelvis ? P._pelvis[2] : 0) + (AL ? AL.oz * wA : 0)] });
  if (AL && a.defYaw != null) a.defYaw += AL.yaw * wA;
  // V1.2: the far leg's SWEEP (the simulation's own sweep angle at this instant), weighted like the alignment
  A.sweepTh = null;
  if (AL && A.rule === "far" && A.th1 > 0) { const TB = ofDefSweepTable(a.skel, S, sd, AL, A.th1), W = PT_DEF.slide.sweep, u = clamp01((now - A.launchAt - W.t0) / W.T), th = W.th0 + (A.th1 - W.th0) * u * u * (3 - 2 * u);
    const dv = ofDefSweepAt(TB, th), thN = "thigh_" + sd, shN = "shin_" + sd, ftN = "foot_" + sd, a0 = P0[thN] || [0, 0, 0], b0 = P0[shN] || [0, 0, 0], f0 = P0[ftN] || [0, 0, 0];
    P0[thN] = [a0[0] + dv[0] * wA, a0[1] + dv[1] * wA, a0[2] + dv[2] * wA]; P0[shN] = [b0[0] + dv[3] * wA, b0[1], b0[2]]; P0[ftN] = [f0[0] + (dv[4] || 0) * wA, f0[1] + (dv[5] || 0) * wA, f0[2]];
    if (a.defYaw != null) a.defYaw -= TB.sgF * TB.pk * th * wA; A.sweepTh = th; }
  const fk = skelFK(a.skel, P0, rootM); let minY = 1e9;
  for (const b of a.skel.bones) { if (!b.part || b.name === "root" || b.name === "hair" || /^(hand|foreArm|upperArm|clavicle)_/.test(b.name)) continue; const v = Math.min(fk.joint[b.idx][1], fk.tip[b.idx][1]) - (/^(foot|toe)_/.test(b.name) ? 0.01 : b.rad * 0.6); if (v < minY) minY = v; }
  const drop = Math.max(0, minY - O.clear);
  P0._pelvis[1] = -drop;
  const q = ofDefLerpPose(pose, P0, w);
  // the feet: nothing is planted while the body slides (the root is moving at the slide's speed); in the get-up the root is still
  plants.R = { want: false }; plants.L = { want: false };
  // the tackling boot is TRACKED onto the simulation's planned contact (the ball's surface facing the slider) over the last moments, held
  // through the contact, then handed back to the pose (the same bounded tracking reach the receptions use)
  if (O.reach) { const T = A.rule === "far" ? O.trackT12 : O.trackT, pr = plants[sd]; let track = null, tgt = null;   // V1.2: the sweep itself brings the leg; the ball target only closes the last cm
    // the aim: the point of the ball's surface NEAREST the tackling leg's line (the leg meets the ball from the side it sweeps past)
    const aimAt = (bx, by, bz, rx, ry, pth) => { if (A.rule === "far") { const L = ptDefSlideLeg(A.src, rx, ry, (A.plan ? A.plan.at : now) - A.launchAt, a.skel.legLen);   // V1.2: the sweeping leg's line then
        const dx = L.ex - L.ax, dy = L.ey - L.ay, L2 = dx * dx + dy * dy, u = Math.max(0, Math.min(1, ((bx - L.ax) * dx + (by - L.ay) * dy) / L2)); return u < 0.6 ? null : ofDefAim(bx, by, bz, L.ax + dx * u, L.ay + dy * u); }
      const G = PT_DEF.slide, leg = a.skel.legLen, sg = sd === "R" ? 1 : -1, fx = Math.cos(A.dir), fy = Math.sin(A.dir), lo = G.legLat * leg;
      const ax = rx + fx * G.legFrom * leg - fy * sg * lo, ay = ry + fy * G.legFrom * leg + fx * sg * lo, ex = rx + fx * G.reachAhead * leg - fy * sg * lo, ey = ry + fy * G.reachAhead * leg + fx * sg * lo;
      const L2 = (ex - ax) ** 2 + (ey - ay) ** 2, u = Math.max(0, Math.min(1, ((bx - ax) * (ex - ax) + (by - ay) * (ey - ay)) / L2)), qx = ax + (ex - ax) * u, qy = ay + (ey - ay) * u;
      return u < 0.6 ? null : ofDefAim(bx, by, bz, qx, qy); };
    if (A.hit != null && !(A.rule === "far" && A.src && (A.src.vNow > 0 || A.src.stopAt === now))) { const dh = now - A.hit; track = dh <= O.outT ? { mode: "zero", tLeft: Math.max(1 / 60, O.outT - dh) } : null; }
    else if (A.rule !== "far" && A.plan && A.plan.at - now <= T) { tgt = aimAt(A.plan.ball[0], A.plan.ball[1], A.plan.ball[2], A.plan.root[0], A.plan.root[1]); track = tgt ? { mode: "to", tLeft: Math.max(1 / 60, A.plan.at - now) } : { mode: "zero", tLeft: 0.1 }; }
    else if (A.rule === "far" && A.src && now >= A.launchAt && (A.src.vNow > 0 || A.src.stopAt === now)) {   // V1.2: through the sweep the boot's INSIDE face FOLLOWS the simulation leg's sweep-side
      // surface (its axis + footR12 toward the sweep) at the boot's part of the leg — at a contact that surface is exactly the ball's surface
      const L = ptDefSlideLeg(A.src, a.x, a.y, now - A.launchAt, a.skel.legLen), r12 = PT_DEF.slide.footR12, dm = Math.min(1.12 * a.skel.legLen, Math.hypot(L.ex - L.hx, L.ey - L.hy) - 0.15);   // the mid-boot: 0.15 m inside the leg's toe end (≤ the leg's reachable 1.12 × leg)
      const qx = L.hx + L.ux * dm, qy = L.hy + L.uy * dm;
      // the LEADING face: the leg point's own velocity (the slide's + the sweep's) perpendicular to the leg — the sweep side while it sweeps, the forward face as it rakes on
      const arm = Math.hypot(qx - L.hx, qy - L.hy), vx = A.src.vNow * Math.cos(A.dir) + L.om * arm * L.px, vy = A.src.vNow * Math.sin(A.dir) + L.om * arm * L.py, vp = vx * L.ux + vy * L.uy;
      let nx = vx - vp * L.ux, ny = vy - vp * L.uy; const nm = Math.hypot(nx, ny); if (nm > 1e-6) { nx /= nm; ny /= nm; } else { nx = L.px; ny = L.py; }
      tgt = [qx + nx * r12, 0.085, -(qy + ny * r12)]; track = { mode: "to", tLeft: 1 / 60, exact: true }; A.follow = true; }
    else if (a.state && a.state.feet[sd] && a.state.feet[sd].track && V3.len(a.state.feet[sd].track.off) > 1e-4) track = { mode: "zero", tLeft: 0.12 };
    if (track) pr.reach = Object.assign({ p: tgt, w: 1, cap: O.cap, iters: 4, track }, A.rule === "far" && tgt ? { surf: "inside" } : {}); }   // V1.2: the far leg sweeps across — its INSIDE (instep side) meets the ball
  if (phase === "RECOVER") { plants.R = { want: true, mode: "ankle", s: 0.4, fromLast: true }; plants.L = { want: true, mode: "ankle", s: 0.4, fromLast: true }; }
  A.drop = drop;
  return q;
}
// V1.2: the FINAL rendered tackling leg at the ball contact — contact patch (the nearest point of the rendered boot / shin capsules), the
// rendered leg's own velocity (this tick vs the last), the residual at the contact INSTANT (the rendered leg moved back by the part of the tick
// after the contact sub-step) and in the drawn frame (against the ball as drawn), the rendered vs simulated contact normal
function ofDefMeasureV12(a, A, fk, sk, sd, r, knee, ankle, toe) {
  const P = (v) => [+v[0].toFixed(4), +(-v[2]).toFixed(4), +v[1].toFixed(4)], BR = OF_DEF.ballR, c = [r.point[0], Math.max(0, r.point[2]) + BR, -r.point[1]];
  const near = (p, a0, a1) => { const d = V3.sub(a1, a0), L = V3.dot(d, d), s = L > 1e-12 ? Math.max(0, Math.min(1, V3.dot(V3.sub(p, a0), d) / L)) : 0; return V3.add(a0, V3.scale(d, s)); };
  const caps = [["BOOT", ankle, toe, 0.045, "toe"], ["SHIN", knee, ankle, 0.055, "ankle"]].map(([n, a0, a1, rc, vk]) => { const q = near(c, a0, a1); return { n, q, rc, vk, a0, a1, sep: V3.dist(q, c) - rc - BR }; }).sort((x, y) => x.sep - y.sep);
  const best = caps[0], pv = A.prevLeg && A.prevLeg[sd], vk = best.vk === "toe" ? toe : ankle, v = pv ? V3.scale(V3.sub(vk, pv[best.vk]), 60) : [0, 0, 0];
  const u = r.sub != null ? r.sub : 1, qC = V3.sub(best.q, V3.scale(v, (1 - u) / 60)), sepC = V3.dist(qC, c) - best.rc - BR;
  const bd = A.ball ? [A.ball[0], Math.max(0, A.ball[2]) + BR, -A.ball[1]] : c, sepF = Math.min(...caps.map(k => V3.dist(near(bd, k.a0, k.a1), bd) - k.rc - BR));
  const nR = [c[0] - qC[0], -(c[2] - qC[2])], nm = Math.hypot(nR[0], nR[1]) || 1; nR[0] /= nm; nR[1] /= nm;
  const nS = r.normal || [0, 0], ang = Math.acos(Math.max(-1, Math.min(1, nR[0] * nS[0] + nR[1] * nS[1]))) * 180 / Math.PI;
  return { patchPart: best.n, patch: P(qC), sepContact: +sepC.toFixed(4), sepFrame: +sepF.toFixed(4), sepBootC: +(caps.find(k => k.n === "BOOT").sep).toFixed(4), vLegRender: [+v[0].toFixed(3), +(-v[2]).toFixed(3)],
    nRender: nR.map(x => +x.toFixed(3)), nSim: nS, nAngle: +ang.toFixed(1), simRegion: r.region, simAlong: r.legAt, sub: u, sweepTh: A.sweepTh != null ? +A.sweepTh.toFixed(3) : null };
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
  const v12 = A.kind === "SLIDE" && A.rule === "far" && r.point ? ofDefMeasureV12(a, A, fk, sk, sd, r, knee, ankle, toe) : null;
  return { v12, kind: A.kind, foot: sd, out: r.out, why: r.why || null, insideSurf: +(V3.dist(inside, c) - OF_DEF.ballR).toFixed(4), legSurf: +legSurf.toFixed(4), toeSurf: +(V3.dist(toe, c) - OF_DEF.ballR).toFixed(4),
    reachApplied: rc ? rc.applied : null, reachCapped: rc ? !!rc.capped : null, knee: d.knee ? d.knee[sd] : null, kneeOther: d.knee ? d.knee[other] : null,
    plantMode: pf.mode || null, plantContact: !!pf.contact, plantSlide: pf.slide != null ? pf.slide : null, ground: +(d.ground || 0).toFixed(4), handY: +hand[1].toFixed(3), drop: A.drop != null ? +A.drop.toFixed(3) : null, phase: A.phase || null,
    geo: { ball: c.map(v => +v.toFixed(3)), knee: knee.map(v => +v.toFixed(3)), ankle: ankle.map(v => +v.toFixed(3)), toe: toe.map(v => +v.toFixed(3)), root: [+a.x.toFixed(3), +a.y.toFixed(3)] } };
}
// V1.2 HUD: the last slide's technique and its contact history (the simulation's facts; the rendered residual from the contact-tick measurement)
function ofDefV12Hud(Q, nm) {
  const st = Q.events.slice().reverse().find(e => e.kind === "TACKLE_START" && e.type === "SLIDE" && e.tuck); if (!st) return "";
  const c = Q.ctx[st.pid], d = c && c.def && c.def.kind === "SLIDE" ? c.def : null, tk = Q.events.slice().reverse().find(e => e.kind === "TACKLE" && e.type === "SLIDE" && e.pid === st.pid && e.tick >= st.tick);
  const g = st.geo || {}, L = [`  slide V1.2  ${nm(st.pid)} ${st.tech}: tackling leg ${st.foot} (FAR) sweeps across · tucked ${st.tuck} (NEAR) — he lies on the ${st.tuck === "R" ? "right" : "left"} hip${g.side ? " · " + g.side.replace("_", " ").toLowerCase() : ""}${g.ballLat != null ? " · ball " + Math.abs(g.ballLat).toFixed(2) + " m beside the line" : ""}`];
  if (tk && tk.out !== "MISS") { const lr = OFSQ.lastDef && OFSQ.lastDef.v12 && OFSQ.lastDef.tick >= tk.tick - 1 ? OFSQ.lastDef.v12 : null;
    L.push(`  ball        ${tk.out} on the ${tk.region} (along ${tk.legAt})  n (${tk.normal})  leg v (${tk.vLeg})  ball ${tk.vIn} → ${tk.vOut}${tk.e != null ? "  e " + tk.e : ""}${lr ? "  rendered " + lr.patchPart + " " + (lr.sepContact * 100).toFixed(1) + " cm, normal " + lr.nAngle + "°" : ""}`); }
  else if (tk) L.push(`  ball        MISS (closest ${tk.minGap} m)`);
  const M = d && d.manifold ? d.manifold : null;
  if (M && M.length) L.push("  contacts    " + M.map(m => m.kind === "BALL" ? `#${m.n} BALL ${m.region}` : m.kind === "BODY" ? `#${m.n} ${m.prim}→${m.seg}${m.planted ? "(planted)" : ""} ${m.cls}/${m.took}` : `#${m.n} ${m.kind}`).join("  ·  "));
  return L.join("\n");
}
