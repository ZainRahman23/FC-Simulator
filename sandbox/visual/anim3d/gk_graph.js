// ═══ anim3d/gk_graph.js — goalkeeper ANIMATION GRAPH: ActionDescription → complete SET→…→SET lifecycle ═══
// Reads only the ActionDescription (layer B) built from the simulation; writes nothing back. Produces the body pose, the
// character root matrix, the presentation-root offset, foot-contact states and the procedural targets (IK / plant / look-at).
//
// Timelines: READ/ANTICIPATION (a = tSinceShot/latency) → LOAD/PLANT/PUSH/TOE_OFF/FLIGHT/FULL_EXTENSION (u = (now−t0)/execTime,
// authored trunk re-aimed at the committed target) → CONTACT (simulation tick; glove IK) → FOLLOW/DESCENT/TOUCH/ABSORB/SETTLE/
// GETUP/RISE (landing physics on the pelvis: ballistic follow-through, progressive ground contact, spring absorb, friction
// settle; landing style chosen from the body-axis angle) → SET. Every quantity is closed-form in the simulation's own times, so
// the result is identical whatever the draw rate. The simulation root is never written; the presentation root is the ground
// projection of the pelvis (continuous by construction) and is reconciled to the simulation root during the get-up.
const GK_GRAPH = {
  loadPhase: 0.30, toeOff: 0.31, unloadAt: 0.15,   // IK weight ramp start; plant-foot release; opposite-foot release (pre)
  ikFadePost: 0.35, torsoAssistMaxDeg: 20, clavicleAssistMaxDeg: 10, lookMaxDeg: 55, presMaxM: 0.8,
  authoredRollDeg: 72, reachLenH: 0.64, jumpMaxM: 0.55, pelvisMinY: 0.30,
  sideLandLo: 35, sideLandHi: 60,                  // body-axis angle from vertical (deg): ≤ lo land on the feet, ≥ hi land on the side
  G: 9.81, vUpMax: 1.5, vLatMin: 0.3,
  // landing physics (feet-first vs side-first; blended by the body-axis angle). Heights in m for H 1.90, durations in s.
  feet: { hTouch: 0.95, hImpact: 0.60, hGround: 0.28, impactT: 0.16, absorbT: 0.24, decel: 6.0, hold: 0.40, followFrac: 0.35 },
  side: { hTouch: 0.62, hImpact: 0.40, hGround: 0.28, impactT: 0.14, absorbT: 0.30, decel: 4.0, hold: 0.45, followFrac: 0.30 },
  getup: { brace: 0.30, pushUp: 0.30, halfKneel: 0.35, crouch: 0.35, rise: 0.50 },
  launchPos: 0.30,        // the solved launch/jump position takes over from the toe-off (before it the authored legs produce the height)
};
// ── pose helpers ──────────────────────────────────────────────────────────────────────────────────────────────────────
function stripMeta(p) { const o = {}; for (const k in p) if (k[0] !== "_" && k !== "name") o[k] = p[k]; return o; }
function poseMeta(p) { return { _pelvis: p._pelvis || [0, 0, 0], _h: p._h != null ? p._h : null, _name: p.name || p._name || null }; }
function poseMirrorP(p) { const m = poseMirror(stripMeta(p)); const mt = poseMeta(p); m._pelvis = [-mt._pelvis[0], mt._pelvis[1], mt._pelvis[2]]; m._h = mt._h; m._name = mt._name; return m; }
function poseLerpP(a, b, t) { const p = poseLerp(stripMeta(a), stripMeta(b), t); const ma = poseMeta(a), mb = poseMeta(b); p._pelvis = V3.lerp(ma._pelvis, mb._pelvis, t); p._h = (ma._h != null && mb._h != null) ? lerp(ma._h, mb._h, t) : (ma._h != null ? ma._h : mb._h); p._name = t < 0.5 ? ma._name : mb._name; return p; }
// Catmull-Rom over an ordered key list [[x, pose|name], …]: smooth joint trajectories (velocity-continuous), never linear
function gkSampleKeys(keys, x, named) {
  const res = (k) => typeof k === "string" ? named[k] : k, n = keys.length;
  if (n === 1 || x <= keys[0][0]) return Object.assign({}, res(keys[0][1]), poseMeta(res(keys[0][1])));
  if (x >= keys[n - 1][0]) return Object.assign({}, res(keys[n - 1][1]), poseMeta(res(keys[n - 1][1])));
  let i = 0; while (i < n - 2 && x > keys[i + 1][0]) i++;
  const P = (j) => res(keys[Math.max(0, Math.min(n - 1, j))][1]);
  const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2), x1 = keys[i][0], x2 = keys[i + 1][0], t = (x - x1) / Math.max(1e-9, x2 - x1);
  const cr = (a, b, c, d) => { const t2 = t * t, t3 = t2 * t; return 0.5 * ((2 * b) + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3); };
  const out = {}; const bones = new Set([...Object.keys(stripMeta(p1)), ...Object.keys(stripMeta(p2))]);
  for (const k of bones) { const g = (p) => p[k] || [0, 0, 0]; const a = g(p0), b = g(p1), c = g(p2), d = g(p3); out[k] = [cr(a[0], b[0], c[0], d[0]), cr(a[1], b[1], c[1], d[1]), cr(a[2], b[2], c[2], d[2])]; }
  const m0 = poseMeta(p0), m1 = poseMeta(p1), m2 = poseMeta(p2), m3 = poseMeta(p3);
  out._pelvis = [0, 1, 2].map(j => cr(m0._pelvis[j], m1._pelvis[j], m2._pelvis[j], m3._pelvis[j]));
  out._h = (m1._h != null && m2._h != null) ? cr(m0._h != null ? m0._h : m1._h, m1._h, m2._h, m3._h != null ? m3._h : m2._h) : (m1._h != null ? m1._h : m2._h);
  out._name = t < 0.5 ? m1._name : m2._name; return out;
}
// ── frames ────────────────────────────────────────────────────────────────────────────────────────────────────────────
function gkRootMatrix(px, py, facing, dz) {
  const f = facing, m = M4.ident();
  const right = [-Math.sin(f), 0, -Math.cos(f)], up = [0, 1, 0], fwd = [Math.cos(f), 0, -Math.sin(f)];
  m[0] = right[0]; m[1] = right[1]; m[2] = right[2]; m[4] = up[0]; m[5] = up[1]; m[6] = up[2]; m[8] = fwd[0]; m[9] = fwd[1]; m[10] = fwd[2];
  m[12] = px; m[13] = dz || 0; m[14] = -py; return m;
}
const glW = (p) => [p[0], p[2], -p[1]];              // pitch (x, y, z-height) → 3D world (x, height, −y)
const pitchW = (p) => [p[0], -p[2], p[1]];           // 3D world → pitch (x, y, z)
// body-axis solve (character frame): committed target relative to the current root → axis angle from vertical, solved pelvis
function gkGraphAxis(desc, rootM, skel) {
  const c = desc.commit; if (!c) return null;
  const Tl = M4.transformPoint(M4.invertRigid(rootM), glW(c.target));
  const hipY = 0.50 * skel.H, rel = [Tl[0], Tl[1] - hipY, Tl[2]]; const L = V3.len(rel) || 1e-6; const d = V3.scale(rel, 1 / L);
  const theta = Math.atan2(Math.hypot(rel[0], rel[2]), rel[1]) / DEG;
  const reach = GK_GRAPH.reachLenH * skel.H; let P = V3.sub(Tl, V3.scale(d, reach));
  P[1] = Math.max(GK_GRAPH.pelvisMinY, Math.min(hipY + GK_GRAPH.jumpMaxM * ((desc.cls && desc.cls.expr) ? desc.cls.expr.launch : 1), P[1]));
  const sign = Tl[0] >= 0 ? 1 : -1, wSide = clamp01((theta - GK_GRAPH.sideLandLo) / (GK_GRAPH.sideLandHi - GK_GRAPH.sideLandLo));
  return { theta: +theta.toFixed(1), d, pelvis: P, pelvisOff: [P[0], P[1] - hipY, P[2]], sign, wSide, targetLocal: Tl };
}
function gkGraphRedirect(pose, axis, u) {
  const roll = pose.pelvis ? pose.pelvis[2] : 0, wExt = clamp01(Math.abs(roll) / GK_GRAPH.authoredRollDeg);
  const wPos = u == null ? wExt : smooth01(clamp01((u - GK_GRAPH.launchPos) / (1 - GK_GRAPH.launchPos)));               // the solved jump/launch position takes over from the toe-off; LOAD/PLANT/PUSH keep the authored crouch (feet can stay planted)
  const out = Object.assign({}, pose); out.pelvis = [pose.pelvis ? pose.pelvis[0] : 0, pose.pelvis ? pose.pelvis[1] : 0, lerp(roll, -axis.sign * axis.theta, wExt)];
  const k = lerp(1, Math.min(1.4, axis.theta / GK_GRAPH.authoredRollDeg), wExt);
  for (const bn of ["spine", "chest"]) if (pose[bn]) out[bn] = [pose[bn][0], pose[bn][1], pose[bn][2] * k];
  out._pelvis = V3.lerp(pose._pelvis || [0, 0, 0], axis.pelvisOff, wPos); out._wExt = wExt; out._wPos = wPos; return out;
}
// ── landing physics plan (closed form in seconds after endT; built once per commit from simulation facts only) ─────────
function gkLandingPlan(desc, skel, clip, endPose, axis, sideL) {
  const c = desc.commit, H = skel.H, w = axis.wSide, F = GK_GRAPH.feet, Sd = GK_GRAPH.side, G = GK_GRAPH.getup, mix = (a, b) => lerp(a, b, w), hs = H / 1.9;
  const hip = 0.50 * H, pel = endPose._pelvis || [0, 0, 0];
  const P0 = [pel[0], hip + pel[1], pel[2]];
  const ex = desc.simRoot[0] - c.feet[0], ey = desc.simRoot[1] - c.feet[1], trav = Math.hypot(ex, ey);
  const vLat = Math.max(GK_GRAPH.vLatMin, (trav / Math.max(1e-6, c.execTime)) * Math.sin(axis.theta * DEG) + 0.25);
  const dirSign = pel[0] >= 0 ? 1 : -1;
  const named = { set: sideL ? poseMirrorP(clip.set) : clip.set, setLow: sideL ? poseMirrorP(clip.setLow) : clip.setLow, reach: sideL ? poseMirrorP(clip.pre[clip.pre.length - 1][1]) : clip.pre[clip.pre.length - 1][1], load: sideL ? poseMirrorP(clip.pre[0][1]) : clip.pre[0][1] };
  const hAt = (u) => { let p = gkSampleKeys(clip.pre, u, named); if (sideL) p = poseMirrorP(p); return hip + gkGraphRedirect(p, axis, u)._pelvis[1]; };
  const vUp = Math.max(-1.0, Math.min(GK_GRAPH.vUpMax, (hAt(1) - hAt(0.85)) / (0.15 * Math.max(1e-6, c.execTime))));
  const hTouch = mix(F.hTouch, Sd.hTouch) * hs, hImpact = mix(F.hImpact, Sd.hImpact) * hs, hGround = mix(F.hGround, Sd.hGround) * hs;
  const impactT = mix(F.impactT, Sd.impactT), absorbT = mix(F.absorbT, Sd.absorbT), decel = mix(F.decel, Sd.decel), hold = mix(F.hold, Sd.hold);
  let tTouch; { const A = -0.5 * GK_GRAPH.G, B = vUp, C = P0[1] - hTouch; const disc = B * B - 4 * A * C; tTouch = disc > 0 ? (-B - Math.sqrt(disc)) / (2 * A) : 0.02; if (!(tTouch > 0.02)) tTouch = 0.02; }
  const tStop = vLat / decel, xTouch = vLat * tTouch, xStop = xTouch + vLat * tStop - 0.5 * decel * tStop * tStop;
  const tImpact = tTouch + impactT, tAbsorb = tImpact + absorbT, tSettle = tAbsorb + hold;
  const tBrace = tSettle + G.brace, tPush = tBrace + G.pushUp, tKneel = tPush + G.halfKneel, tCrouch = tKneel + G.crouch, tRise = tCrouch + G.rise;
  const hBrace = clip.postFeet.BRACE._h * hs, hPush = clip.postFeet.PUSH_UP._h * hs, hKneel = clip.postFeet.HALF_KNEEL._h * hs, hCrouch = clip.postFeet.CROUCH._h * hs, hSet = hip + (clip.set._pelvis ? clip.set._pelvis[1] : 0);
  return { w, P0, vLat, vUp, dirSign, hTouch, hImpact, hGround, hBrace, hPush, hKneel, hCrouch, hSet, decel, tTouch, tStop, xTouch, xStop, tImpact, tAbsorb, tSettle, tBrace, tPush, tKneel, tCrouch, tRise, hip };
}
// pelvis (character frame) + stage for tl seconds after endT. Lateral travel: ballistic carry, friction decel, then the get-up
// moves the pelvis over its support points (front foot, stance) toward the simulation root — reconciliation THROUGH the recovery.
function gkLandingState(plan, tl) {
  const g = GK_GRAPH.G, P = plan; let h, x, stage, s;
  const xAt = (t) => t <= P.tTouch ? P.vLat * t : (t - P.tTouch <= P.tStop ? P.xTouch + P.vLat * (t - P.tTouch) - 0.5 * P.decel * (t - P.tTouch) ** 2 : P.xStop);
  const seg = (t0, t1) => clamp01((tl - t0) / Math.max(1e-6, t1 - t0));
  if (tl < P.tTouch) { s = tl / P.tTouch; h = P.P0[1] + P.vUp * tl - 0.5 * g * tl * tl; x = xAt(tl); stage = s < GK_GRAPH.feet.followFrac ? "FOLLOW" : "DESCENT"; }
  else if (tl < P.tImpact) { s = seg(P.tTouch, P.tImpact); h = lerp(P.hTouch, P.hImpact, smooth01(s)); x = xAt(tl); stage = "IMPACT"; }
  else if (tl < P.tAbsorb) { s = seg(P.tImpact, P.tAbsorb); h = lerp(P.hImpact, P.hGround, smooth01(s)); x = xAt(tl); stage = "ABSORB"; }
  else if (tl < P.tSettle) { s = seg(P.tAbsorb, P.tSettle); h = P.hGround; x = xAt(tl); stage = "SETTLE"; }
  else if (tl < P.tBrace) { s = seg(P.tSettle, P.tBrace); h = lerp(P.hGround, P.hBrace, smooth01(s)); x = P.xStop; stage = "BRACE"; }
  else if (tl < P.tPush) { s = seg(P.tBrace, P.tPush); h = lerp(P.hBrace, P.hPush, smooth01(s)); x = P.xStop; stage = "PUSH_UP"; }
  else if (tl < P.tKneel) { s = seg(P.tPush, P.tKneel); h = lerp(P.hPush, P.hKneel, smooth01(Math.min(1, s / 0.35)));   /* the pelvis reaches kneel height ahead of the leg shapes so the kneeling knee never dips under the pitch */ x = P.xStop * lerp(1, 0.55, smooth01(Math.min(1, s / 0.6))); stage = "HALF_KNEEL"; }
  else if (tl < P.tCrouch) { s = seg(P.tKneel, P.tCrouch); h = lerp(P.hKneel, P.hCrouch, smooth01(s)); x = P.xStop * lerp(0.55, 0.15, smooth01(s)); stage = "CROUCH"; }
  else if (tl < P.tRise) { s = seg(P.tCrouch, P.tRise); h = lerp(P.hCrouch, P.hSet, smooth01(s)); x = P.xStop * 0.15 * (1 - smooth01(s)); stage = "RISE"; }
  else { s = 1; h = P.hSet; x = 0; stage = "SET"; }
  return { h, x, stage, s };
}
// ── main evaluation ───────────────────────────────────────────────────────────────────────────────────────────────────
function gkGraphEvaluate(desc, clip, skel, state) {
  const c = desc.commit, sideL = desc.side === "LEFT";
  const named = { set: clip.set, setLow: clip.setLow, reach: clip.pre[clip.pre.length - 1][1], load: clip.pre[0][1] };
  const M = (p) => sideL ? poseMirrorP(p) : Object.assign({}, p, poseMeta(p));
  const dive = !!c && !desc.held && (desc.family === "AIRBORNE_DIVE" || desc.family === "LOW_COLLAPSE" || desc.family === "FOOT_SAVE");
  let pose, phase = "SET", sub = null, clipT = null, ikW = 0, authored = true, mode = "set", locks = { R: 0, L: 0 }, brace = null, landing = null;
  // the presentation facing is frozen for the whole committed action (the sprite resolver drops its own commit snapshot when its
  // clip ends, which would otherwise swing the lying keeper round to the live ball-tracking facing mid-recovery)
  const ck = c ? c.commitTick : null; if (state.facingKey !== ck) { state.facingKey = ck; state.facing = c ? desc.commitFacing : null; }
  const facing = c ? state.facing : desc.facing;
  const rootM = gkRootMatrix(desc.simRoot[0], desc.simRoot[1], facing, 0);
  if (!c) {
    if (desc.shot && desc.shot.latency > 0) {                                                  // READ / PREPARE: react → weight shift → deep load inside the reaction latency
      const a = clamp01(desc.shot.tSince / desc.shot.latency); clipT = a;
      const predSideL = desc.predLat != null ? desc.predLat < 0 : false, known = desc.predLat != null;
      let p = gkSampleKeys(clip.anticipation, known ? a : Math.min(a, 0.30), named);
      pose = predSideL ? poseMirrorP(p) : Object.assign({}, p, poseMeta(p));
      phase = a < 0.30 ? "READ" : a < 0.65 ? "WEIGHT_SHIFT" : (desc.prepared ? "PREPARE" : "LOAD"); sub = pose._name; mode = "anticipation";
      locks = { R: 1, L: 1 };
    } else if (desc.windup != null) {                                                          // the striker's visible wind-up: drop into the set crouch (symmetric)
      const w = smooth01(desc.windup); pose = poseLerpP(M(clip.set), M(clip.setLow), w); phase = "SET_CROUCH"; sub = pose._name; mode = "setlow"; clipT = w; locks = { R: 1, L: 1 };
    } else { pose = M(clip.set); phase = desc.state; mode = "set"; locks = { R: 1, L: 1 }; }
  } else if (desc.now < desc.endT) {                                                           // commit → full extension
    const u = clamp01(desc.u); clipT = u;
    if (dive) {
      pose = M(gkSampleKeys(clip.pre, u, named)); mode = "pre";
      phase = u < 0.10 ? "LOAD" : u < 0.19 ? "PLANT" : u < 0.27 ? "PUSH_OFF" : u < 0.34 ? "TOE_OFF" : (desc.contact && desc.contact.tickT >= c.t0 - 1e-3 ? "CONTACT" : (u < 0.55 ? "EARLY_FLIGHT" : u < 0.8 ? "MID_FLIGHT" : "FULL_EXTENSION")); sub = pose._name;
      locks = { reach: 1 - smooth01(clamp01((u - 0.27) / (0.33 - 0.27))), other: 1 - smooth01(clamp01((u - 0.14) / (0.22 - 0.14))) };   // plant foot through LOAD/PLANT/PUSH, released over the toe-off; the other foot unloads during the push
    } else { pose = M(clip.set); phase = desc.family || "REACH"; authored = false; mode = "procedural"; }
    ikW = u >= GK_GRAPH.loadPhase ? clamp01((u - GK_GRAPH.loadPhase) / (1 - GK_GRAPH.loadPhase)) : 0;
    if (desc.contact && desc.contact.tickT >= c.t0 - 1e-3) ikW = 1;
    if (!authored) ikW = 1;
  } else {                                                                                     // after endT: landing physics + shapes → get-up → SET
    const tl = desc.now - desc.endT; clipT = tl;
    if (dive) { mode = "post"; }
    else { pose = M(clip.set); phase = tl < 0.4 ? "RISE" : "SET"; authored = false; mode = "procedural"; }
    ikW = desc.held ? 1 : Math.max(0, 1 - tl / GK_GRAPH.ikFadePost);
  }
  const g = { pose, phase, sub, clipT, ikW, rootM, facing, authored, mode, side: desc.side, reachHand: sideL ? "L" : "R", axis: null, locks, brace, landing: null, pres: { dx: 0, dy: 0, dm: 0 } };
  if (c && dive && authored) {
    const axis = gkGraphAxis(desc, rootM, skel); g.axis = axis;
    if (mode === "pre") { g.pose = gkGraphRedirect(g.pose, axis, clipT); state.endPose = g.pose; state.endAxis = axis; state.plan = null; }
    else if (mode === "post") {
      const tl = clipT, endPose = state.endPose || gkGraphRedirect(M(gkSampleKeys(clip.pre, 1, named)), axis, 1), ax = state.endAxis || axis;
      if (!state.plan) state.plan = gkLandingPlan(desc, skel, clip, endPose, ax, sideL);
      const plan = state.plan, L = gkLandingState(plan, tl); g.landing = { plan, L };
      const PF = clip.postFeet, PS = clip.postSide, w = plan.w;
      const K = (name) => poseLerpP(M(PF[name]), M(PS[name]), w);                              // landing style blend (feet ↔ side) by the body-axis angle
      const setP = M(clip.set); let shape;
      if (L.stage === "FOLLOW" || L.stage === "DESCENT") shape = gkSampleKeys([[0, endPose], [GK_GRAPH.feet.followFrac, K("FOLLOW")], [0.78, K("DESCENT")], [1, K("TOUCH")]], L.s, {});
      else if (L.stage === "IMPACT") shape = gkSampleKeys([[0, K("TOUCH")], [1, K("IMPACT")]], smooth01(L.s), {});
      else if (L.stage === "ABSORB") shape = gkSampleKeys([[0, K("IMPACT")], [0.55, K("ABSORB")], [1, K("SETTLE")]], L.s, {});
      else if (L.stage === "SETTLE") shape = K("SETTLE");
      else if (L.stage === "BRACE") shape = gkSampleKeys([[0, K("SETTLE")], [1, K("BRACE")]], smooth01(L.s), {});
      else if (L.stage === "PUSH_UP") shape = gkSampleKeys([[0, K("BRACE")], [1, K("PUSH_UP")]], smooth01(L.s), {});
      else if (L.stage === "HALF_KNEEL") shape = gkSampleKeys([[0, K("PUSH_UP")], [1, K("HALF_KNEEL")]], smooth01(Math.min(1, L.s / 0.6)), {});
      else if (L.stage === "CROUCH") shape = gkSampleKeys([[0, K("HALF_KNEEL")], [1, K("CROUCH")]], smooth01(L.s), {});
      else if (L.stage === "RISE") shape = gkSampleKeys([[0, K("CROUCH")], [1, setP]], smooth01(L.s), {});
      else shape = setP;
      const h = L.h;                                                                          // every stage's pelvis height is owned by the landing state (continuous)
      const keepP0 = (L.stage === "FOLLOW" || L.stage === "DESCENT" || L.stage === "IMPACT" || L.stage === "ABSORB" || L.stage === "SETTLE" || L.stage === "BRACE" || L.stage === "PUSH_UP");
      const p0x = keepP0 ? plan.P0[0] : L.stage === "HALF_KNEEL" ? plan.P0[0] * lerp(1, 0.55, smooth01(Math.min(1, L.s / 0.6))) : L.stage === "CROUCH" ? plan.P0[0] * lerp(0.55, 0.15, smooth01(L.s)) : L.stage === "RISE" ? plan.P0[0] * 0.15 * (1 - smooth01(L.s)) : 0;
      shape._pelvis = [p0x + plan.dirSign * L.x, h - plan.hip, plan.P0[2] * (keepP0 ? 1 : 0)];
      g.pose = shape; g.phase = L.stage; g.sub = shape._name || L.stage;
      const feetStyle = w < 0.5, R = g.reachHand, O = R === "R" ? "L" : "R";
      if (L.stage === "FOLLOW" || L.stage === "DESCENT") locks = { R: 0, L: 0 };
      else if (L.stage === "IMPACT" || L.stage === "ABSORB") locks = feetStyle ? { R: 1, L: 1, at: "touch" } : { R: 0, L: 0 };   // the feet stay where they landed while the body folds down
      else if (L.stage === "SETTLE" || L.stage === "BRACE" || L.stage === "PUSH_UP") locks = { R: 1, L: 1, at: "tuck" };            // lying / bracing: feet drawn in behind the body, knees under (leg IK with a forward-up pole)
      else if (L.stage === "HALF_KNEEL") locks = { [R]: 1 - smooth01(Math.min(1, L.s / 0.6)), [O]: 1, at: "front" };   // the kneeling (save-side) foot stays on its tucked point and is released as the authored kneel takes over — no snap
      else locks = { R: 1, L: 1, at: "stance" };
      g.locks = locks;
      // hands on the pitch: reaching hand from the absorb, both through settle / brace / push-up, released during the half-kneel
      const bw = (a0, a1) => clamp01((L.s - a0) / Math.max(1e-6, a1 - a0));
      if (L.stage === "ABSORB") g.brace = { [R]: smooth01(bw(0.2, 0.9)), [O]: 0 };
      else if (L.stage === "SETTLE") g.brace = { [R]: 1, [O]: smooth01(bw(0.0, 0.5)) };
      else if (L.stage === "BRACE" || L.stage === "PUSH_UP") g.brace = { R: 1, L: 1 };
      else if (L.stage === "HALF_KNEEL") g.brace = { [R]: 1 - smooth01(bw(0.3, 0.9)), [O]: 1 - smooth01(bw(0.0, 0.5)) };
      else g.brace = null;
    }
  } else { state.endPose = null; state.endAxis = null; state.plan = null; }
  return g;
}
// ── procedural pass: FK → ground clamp → torso assist → glove IK → foot locks (leg IK) → hand brace; presentation root ─
function gkGraphSolve(desc, g, skel, state) {
  const pose = g.pose, pel = skel.byName.pelvis, savedOff = pel.off.slice();
  const pd = pose._pelvis || [0, 0, 0]; pel.off = [savedOff[0] + pd[0], savedOff[1] + pd[1], savedOff[2] + pd[2]];
  const h = g.reachHand, o = h === "R" ? "L" : "R", hand = "hand_" + h, fore = "foreArm_" + h, upper = "upperArm_" + h;
  let fk = skelFK(skel, pose, g.rootM);
  const diag = { plant: null, ground: 0, torso: 0, ik: null, look: 0, feet: {} };
  const ankleH = 0.06 * skel.H;
  // 1. foot contacts FIRST: locked feet are held at their world plant point by leg IK (no sliding; the knees flex to the authored
  //    pelvis height instead of the pelvis being lifted). Locks are (re)planted at stage changes.
  const key = desc.commit ? desc.commit.commitTick : null; if (state.commitKey !== key) { state.commitKey = key; state.feet = {}; state.lockStage = null; }
  state.feet = state.feet || {};
  const L = g.locks || {}; const want = { [h]: L.reach != null ? L.reach : (L[h] != null ? L[h] : 0), [o]: L.other != null ? L.other : (L[o] != null ? L[o] : 0) };
  const stage = L.at || g.mode + ":" + (g.phase === "SET" || g.phase === "READ" || g.phase === "ANTICIPATION" || g.phase === "PREPARE" || g.phase === "IDLE" || g.phase === "TRACKING" || g.phase === "FOOTWORK" ? "stand" : "act");
  const flattenFoot = (side, w) => {                                                           // planted foot lies on the pitch: rotate the foot (and toe) so its bind slope is level with the ground
    const fb = skel.byName["foot_" + side], m = fk.world[fb.idx], cur = V3.norm(M4.transformDir(m, fb.dir)); const hz = V3.norm([cur[0], 0, cur[2]]); if (V3.len([cur[0], 0, cur[2]]) < 1e-4) return;
    const des = V3.norm(V3.add(V3.scale(hz, 0.954), [0, -0.3, 0])); const ang = Math.acos(Math.max(-1, Math.min(1, V3.dot(cur, des)))); if (ang < 1e-4) return;
    const R = M4.axisAngle(V3.norm(V3.cross(cur, des)), ang * w), o = M4.origin(m); const m2 = M4.mul(M4.translate(o[0], o[1], o[2]), M4.mul(R, M4.mul(M4.translate(-o[0], -o[1], -o[2]), m)));
    const d = M4.mul(m2, M4.invertRigid(m)); const apply = (b) => { fk.world[b.idx] = M4.mul(d, fk.world[b.idx]); fk.joint[b.idx] = M4.origin(fk.world[b.idx]); fk.tip[b.idx] = M4.transformPoint(fk.world[b.idx], V3.scale(b.dir, b.len)); for (const c of b.children) apply(c); }; apply(fb);
  };
  const fwd = M4.transformDir(g.rootM, [0, 0, 1]);
  const plantFeet = () => { for (const side of ["R", "L"]) { const st = state.feet[side]; const w = clamp01(want[side] || 0); if (st && st.locked && st.P && w > 0) { const hip = fk.joint[skel.byName["thigh_" + side].idx]; const kj = fk.joint[skel.byName["shin_" + side].idx], knee = [kj[0], Math.max(kj[1], 0.12), kj[2]]; const pole = V3.lerp(knee, [hip[0] + fwd[0] * 0.5, hip[1] + 0.3, hip[2] + fwd[2] * 0.5], w);   /* knees bend forward-up, never into the pitch; a fading lock keeps the authored bend plane */ const Pt = st.Pnow || st.P; const r = skelIK2(skel, fk, "thigh_" + side, "shin_" + side, "foot_" + side, Pt, w, pole, 0); flattenFoot(side, w); diag.feet[side] = { locked: true, w: +w.toFixed(2), residual: +r.residual.toFixed(3), P: Pt }; } } };
  for (const side of ["R", "L"]) {
    const fb = skel.byName["foot_" + side], ankle = fk.joint[fb.idx]; const w = clamp01(want[side] || 0); const st = state.feet[side] || { locked: false, P: null };
    if (w > 0 && (!st.locked || state.lockStage !== stage)) {
      let P;
      if (L.at === "stance") { const spread = (side === "R" ? 1 : -1) * 0.20; P = M4.transformPoint(g.rootM, [spread + (g.landing ? g.landing.plan.dirSign * g.landing.plan.xStop * 0.15 : 0), ankleH, 0.02]); }
      else if (L.at === "front" && g.landing) { const pl = g.landing.plan; if (side === h && st.P) P = st.P.slice(); else P = M4.transformPoint(g.rootM, [pl.P0[0] * 0.6 + pl.dirSign * pl.xStop * 0.6 + (side === "R" ? 1 : -1) * 0.14, ankleH, 0.12]); }   // half-kneel: the front foot plants toward the simulation root; the kneeling foot keeps its tucked point
      else if (L.at === "tuck" && g.landing) { const pl = g.landing.plan, px = (pose._pelvis ? pose._pelvis[0] : 0); const bottom = side === h; P = M4.transformPoint(g.rootM, [px - pl.dirSign * (bottom ? 0.42 : 0.34), ankleH, bottom ? -0.10 : 0.16]); }   // lying / brace: feet tucked behind the hips
      else P = [ankle[0], ankleH, ankle[2]];
      if (st.locked && st.P) { st.from = st.P.slice(); st.fromT = desc.now; }                    // re-plant: blend from the previous plant point (no foot teleport)
      st.locked = true; st.P = P; st.since = desc.now;
    }
    if (st.locked && st.from && st.fromT != null) { const bt = clamp01((desc.now - st.fromT) / 0.2); st.Pnow = V3.lerp(st.from, st.P, smooth01(bt)); if (bt >= 1) { st.from = null; st.Pnow = st.P; } } else st.Pnow = st.P;
    if (w <= 0) st.locked = false;
    state.feet[side] = st;
    diag.feet[side] = { locked: false, w: 0, height: +(ankle[1] - ankleH).toFixed(3) };
  }
  state.lockStage = stage;
  plantFeet();
  // 2. ground clamp (presentation only): nothing below the pitch — lift the body by the deepest penetration, then re-plant
  // clamp on the body core and legs only: hands/forearms are placed by the brace / glove IK (a hand authored below the pitch in a
  // rolled body frame must not lift the whole body), toes are flattened with their planted foot
  const CLAMP_SKIP = { hand_R: 1, hand_L: 1, foreArm_R: 1, foreArm_L: 1, upperArm_R: 1, upperArm_L: 1, clavicle_R: 1, clavicle_L: 1, toe_R: 1, toe_L: 1 };
  let minY = 1e9, minB = null; for (const b of skel.bones) { if (!b.part || CLAMP_SKIP[b.name]) continue; const v = Math.min(fk.joint[b.idx][1] - b.rad * 0.6, fk.tip[b.idx][1] - b.rad * 0.6); if (v < minY) { minY = v; minB = b.name; } }
  if (minY < 0) { pel.off[1] -= minY; diag.ground = +(-minY).toFixed(3); diag.groundBone = minB; fk = skelFK(skel, pose, g.rootM); plantFeet(); }
  // 3. torso / clavicle assist + glove IK toward the simulation hand
  const T = glW(desc.handTarget);
  if (g.ikW > 0) {
    const up = skel.byName[upper], fo = skel.byName[fore], hd = skel.byName[hand]; const S = fk.joint[up.idx]; const over = V3.dist(T, S) - (up.len + fo.len + 0.6 * hd.len);
    if (over > 0.01) {
      const inv = M4.invertRigid(g.rootM), Pj = M4.transformPoint(inv, fk.joint[skel.byName.pelvis.idx]), Sl = M4.transformPoint(inv, S), Tl = M4.transformPoint(inv, T);
      const a1 = Math.atan2(Sl[0] - Pj[0], Sl[1] - Pj[1]), a2 = Math.atan2(Tl[0] - Pj[0], Tl[1] - Pj[1]);
      let e = (a2 - a1) / DEG; e = Math.max(-GK_GRAPH.torsoAssistMaxDeg, Math.min(GK_GRAPH.torsoAssistMaxDeg, e)) * clamp01(over / 0.3) * g.ikW;
      const assist = { spine: [0, 0, -e * 0.5], chest: [0, 0, -e * 0.5], ["clavicle_" + h]: [0, 0, (h === "R" ? 1 : -1) * GK_GRAPH.clavicleAssistMaxDeg * clamp01(over / 0.3) * g.ikW] };
      const p2 = poseAdd(pose, assist); p2._pelvis = pose._pelvis; diag.torso = +e.toFixed(1); fk = skelFK(skel, p2, g.rootM); plantFeet();
    }
    const r = skelIK2(skel, fk, upper, fore, hand, T, g.ikW, null, 0.6);
    diag.ik = { w: +g.ikW.toFixed(3), reached: r.reached, residual: +r.residual.toFixed(3), wrist: r.wrist, handCentre: r.handCentre, target: T };
  }
  // 4. hands on the pitch (impact / settle / brace / push-up): per-hand weights; the reaching hand lands beside the hip, the other in front of the chest
  if (g.brace) {
    for (const sd of ["R", "L"]) {
      const wb = clamp01(g.brace[sd] || 0); if (wb <= 0) continue;
      const sgn = g.landing ? g.landing.plan.dirSign : 1, isReach = sd === h;
      const px = (pose._pelvis ? pose._pelvis[0] : 0) + sgn * (isReach ? 0.42 : 0.18), pz = isReach ? 0.22 : 0.36;
      const Pw = M4.transformPoint(g.rootM, [px, 0.07, pz]); const r = skelIK2(skel, fk, "upperArm_" + sd, "foreArm_" + sd, "hand_" + sd, Pw, wb, null, 0.6);
      diag["brace_" + sd] = { w: +wb.toFixed(2), residual: +r.residual.toFixed(3), P: Pw };
    }
  }
  pel.off = savedOff;
  // presentation root = ground projection of the pelvis (pitch frame); continuous by construction
  const pw = fk.joint[skel.byName.pelvis.idx]; const pr = pitchW([pw[0], 0, pw[2]]);
  let dx = pr[0] - desc.simRoot[0], dy = pr[1] - desc.simRoot[1]; const dm = Math.hypot(dx, dy);
  if (dm > GK_GRAPH.presMaxM) { dx *= GK_GRAPH.presMaxM / dm; dy *= GK_GRAPH.presMaxM / dm; }
  g.pres = { dx, dy, dm: Math.min(dm, GK_GRAPH.presMaxM), x: desc.simRoot[0] + dx, y: desc.simRoot[1] + dy };
  return { fk, diag };
}
