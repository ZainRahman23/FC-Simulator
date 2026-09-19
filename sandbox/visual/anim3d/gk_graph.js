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
  feet: { hTouch: 0.95, hDip: 0.05, absorbT: 0.30, decel: 7.0, hold: 0.18, getup: 0.55, rise: 0.50, followFrac: 0.35 },
  side: { hTouch: 0.62, hDip: 0.04, absorbT: 0.36, decel: 4.5, hold: 0.35, getup: 0.85, rise: 0.55, followFrac: 0.30 },
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
  const wPos = u == null ? wExt : smooth01(clamp01((u - 0.26) / (1 - 0.26)));               // the solved jump/launch position takes over from the toe-off; LOAD/PLANT/PUSH keep the authored crouch (feet can stay planted)
  const out = Object.assign({}, pose); out.pelvis = [pose.pelvis ? pose.pelvis[0] : 0, pose.pelvis ? pose.pelvis[1] : 0, lerp(roll, -axis.sign * axis.theta, wExt)];
  const k = lerp(1, Math.min(1.4, axis.theta / GK_GRAPH.authoredRollDeg), wExt);
  for (const bn of ["spine", "chest"]) if (pose[bn]) out[bn] = [pose[bn][0], pose[bn][1], pose[bn][2] * k];
  out._pelvis = V3.lerp(pose._pelvis || [0, 0, 0], axis.pelvisOff, wPos); out._wExt = wExt; out._wPos = wPos; return out;
}
// ── landing physics plan (closed form in seconds after endT; built once per commit from simulation facts only) ─────────
function gkLandingPlan(desc, skel, clip, endPose, axis, sideL) {
  const c = desc.commit, H = skel.H, w = axis.wSide, F = GK_GRAPH.feet, Sd = GK_GRAPH.side, mix = (a, b) => lerp(a, b, w);
  const hip = 0.50 * H, pel = endPose._pelvis || [0, 0, 0];
  const P0 = [pel[0], hip + pel[1], pel[2]];                                                    // pelvis at endT (character frame)
  const ex = desc.simRoot[0] - c.feet[0], ey = desc.simRoot[1] - c.feet[1], trav = Math.hypot(ex, ey);
  const vLat = Math.max(GK_GRAPH.vLatMin, (trav / Math.max(1e-6, c.execTime)) * Math.sin(axis.theta * DEG) + 0.25);   // lateral momentum: the root's mean dive speed × the axis' lateral share (+ a small carry)
  const dirSign = pel[0] >= 0 ? 1 : -1;                                                        // continue along the dive side in the character frame
  const named = { set: sideL ? poseMirrorP(clip.set) : clip.set, reach: sideL ? poseMirrorP(clip.pre[clip.pre.length - 1][1]) : clip.pre[clip.pre.length - 1][1], load: sideL ? poseMirrorP(clip.pre[0][1]) : clip.pre[0][1] };
  const hAt = (u) => { let p = gkSampleKeys(clip.pre, u, named); if (sideL) p = poseMirrorP(p); return hip + gkGraphRedirect(p, axis, u)._pelvis[1]; };
  const vUp = Math.max(-1.0, Math.min(GK_GRAPH.vUpMax, (hAt(1) - hAt(0.85)) / (0.15 * Math.max(1e-6, c.execTime))));
  const hTouch = mix(F.hTouch, Sd.hTouch) * (H / 1.9), absorbT = mix(F.absorbT, Sd.absorbT), decel = mix(F.decel, Sd.decel), hold = mix(F.hold, Sd.hold), getup = mix(F.getup, Sd.getup), rise = mix(F.rise, Sd.rise), hDip = mix(F.hDip, Sd.hDip);
  const hSettle = mix(clip.postFeet.SETTLE._h, clip.postSide.SETTLE._h) * (H / 1.9);
  // touch time: P0y + vUp t − ½ g t² = hTouch
  let tTouch; { const a = -0.5 * GK_GRAPH.G, b = vUp, cq = P0[1] - hTouch; const disc = b * b - 4 * a * cq; tTouch = disc > 0 ? (-b - Math.sqrt(disc)) / (2 * a) : 0.02; if (!(tTouch > 0.02)) tTouch = 0.02; }
  const tStop = vLat / decel, xTouch = vLat * tTouch, xStop = xTouch + vLat * tStop - 0.5 * decel * tStop * tStop;
  const tAbs = tTouch + absorbT, tSettle = tAbs + Math.max(0, tStop - absorbT) + hold, tGetup = tSettle + getup, tRise = tGetup + rise;
  return { w, P0, vLat, vUp, dirSign, hTouch, hSettle, hDip, absorbT, decel, tTouch, tStop, xTouch, xStop, tAbs, tSettle, tGetup, tRise, hip, hSet: hip + (clip.set._pelvis ? clip.set._pelvis[1] : 0) };
}
// pelvis (character frame) + stage for tl seconds after endT
function gkLandingState(plan, tl) {
  const g = GK_GRAPH.G; let h, x, stage, s;
  const xAt = (t) => t <= plan.tTouch ? plan.vLat * t : (t - plan.tTouch <= plan.tStop ? plan.xTouch + plan.vLat * (t - plan.tTouch) - 0.5 * plan.decel * (t - plan.tTouch) ** 2 : plan.xStop);
  if (tl < plan.tTouch) { h = plan.P0[1] + plan.vUp * tl - 0.5 * g * tl * tl; x = xAt(tl); const f = tl / plan.tTouch; stage = f < GK_GRAPH.feet.followFrac ? "FOLLOW" : "DESCENT"; s = f; }
  else if (tl < plan.tAbs) { s = (tl - plan.tTouch) / plan.absorbT; h = lerp(plan.hTouch, plan.hSettle, smooth01(s)) - plan.hDip * Math.sin(Math.PI * s); x = xAt(tl); stage = "ABSORB"; }
  else if (tl < plan.tSettle) { s = (tl - plan.tAbs) / Math.max(1e-6, plan.tSettle - plan.tAbs); h = plan.hSettle; x = xAt(tl); stage = "SETTLE"; }
  else if (tl < plan.tGetup) { s = (tl - plan.tSettle) / Math.max(1e-6, plan.tGetup - plan.tSettle); h = null; x = plan.xStop * (1 - 0.85 * smooth01(s)); stage = "GETUP"; }   // h from the keys
  else if (tl < plan.tRise) { s = (tl - plan.tGetup) / Math.max(1e-6, plan.tRise - plan.tGetup); h = null; x = plan.xStop * 0.15 * (1 - smooth01(s)); stage = "RISE"; }
  else { s = 1; h = plan.hSet; x = 0; stage = "SET"; }
  return { h, x, stage, s };
}
// ── main evaluation ───────────────────────────────────────────────────────────────────────────────────────────────────
function gkGraphEvaluate(desc, clip, skel, state) {
  const c = desc.commit, sideL = desc.side === "LEFT";
  const named = { set: clip.set, reach: clip.pre[clip.pre.length - 1][1], load: clip.pre[0][1] };
  const M = (p) => sideL ? poseMirrorP(p) : Object.assign({}, p, poseMeta(p));
  const dive = !!c && !desc.held && (desc.family === "AIRBORNE_DIVE" || desc.family === "LOW_COLLAPSE" || desc.family === "FOOT_SAVE");
  let pose, phase = "SET", sub = null, clipT = null, ikW = 0, authored = true, mode = "set", locks = { R: 0, L: 0 }, brace = null, landing = null;
  const facing = c ? desc.commitFacing : desc.facing;
  const rootM = gkRootMatrix(desc.simRoot[0], desc.simRoot[1], facing, 0);
  if (!c) {
    if (desc.shot && desc.shot.latency > 0) {                                                  // READ / PREPARE: anticipation inside the reaction latency
      const a = clamp01(desc.shot.tSince / desc.shot.latency); clipT = a;
      const predSideL = desc.predLat != null ? desc.predLat < 0 : false, known = desc.predLat != null;
      let p = gkSampleKeys(clip.anticipation, known ? a : Math.min(a, 0.35), named);          // no read yet → react only, no lateral shift
      pose = predSideL ? poseMirrorP(p) : Object.assign({}, p, poseMeta(p));
      phase = a < 0.35 ? "READ" : (desc.prepared ? "PREPARE" : "ANTICIPATION"); sub = pose._name; mode = "anticipation";
      locks = { R: 1, L: 1 };
    } else { pose = M(clip.set); phase = desc.state; mode = "set"; locks = { R: 1, L: 1 }; }
  } else if (desc.now < desc.endT) {                                                           // commit → full extension (pre-contact / hold at target)
    const u = clamp01(desc.u); clipT = u;
    if (dive) {
      pose = M(gkSampleKeys(clip.pre, u, named)); mode = "pre";
      phase = u < 0.08 ? "LOAD" : u < 0.18 ? "PLANT" : u < GK_GRAPH.toeOff ? "PUSH_OFF" : u < 0.34 ? "TOE_OFF" : (desc.contact && desc.contact.tickT >= c.t0 - 1e-3 ? "CONTACT" : (u < 0.55 ? "EARLY_FLIGHT" : u < 0.8 ? "MID_FLIGHT" : "FULL_EXTENSION")); sub = pose._name;
      const rel = clamp01((u - 0.22) / (GK_GRAPH.toeOff - 0.22));                              // plant foot: locked through LOAD/PLANT/PUSH, released over the toe-off
      locks = { reach: 1 - smooth01(rel), other: 1 - smooth01(clamp01((u - 0.06) / (GK_GRAPH.unloadAt - 0.06))) };
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
      const setP = M(clip.set);
      let shape;
      if (L.stage === "FOLLOW" || L.stage === "DESCENT") shape = gkSampleKeys([[0, endPose], [GK_GRAPH.feet.followFrac, K("FOLLOW")], [0.78, K("DESCENT")], [1, K("TOUCH")]], L.s, {});
      else if (L.stage === "ABSORB") shape = gkSampleKeys([[0, K("TOUCH")], [0.5, K("ABSORB")], [1, K("SETTLE")]], L.s, {});
      else if (L.stage === "SETTLE") shape = K("SETTLE");
      else if (L.stage === "GETUP") shape = gkSampleKeys([[0, K("SETTLE")], [0.55, K("PUSH_UP")], [1, K("CROUCH")]], L.s, {});
      else if (L.stage === "RISE") shape = gkSampleKeys([[0, K("CROUCH")], [1, setP]], smooth01(L.s), {});
      else shape = setP;
      // pelvis from physics (height) + lateral travel along the dive side, expressed as the character-frame offset from the bind hip
      const h = L.h != null ? L.h : L.stage === "RISE" ? lerp(clip.postFeet.CROUCH._h * (skel.H / 1.9) * (1 - plan.w) + clip.postSide.CROUCH._h * (skel.H / 1.9) * plan.w, plan.hSet, smooth01(L.s)) : (shape._h != null ? shape._h * (skel.H / 1.9) : plan.hSet);   // RISE: crouch height → SET height, no step
      shape._pelvis = [plan.P0[0] * (L.stage === "RISE" ? 1 - smooth01(L.s) : L.stage === "SET" ? 0 : 1) + plan.dirSign * L.x, h - plan.hip, plan.P0[2] * (L.stage === "GETUP" || L.stage === "RISE" || L.stage === "SET" ? 0 : 1)];
      if (L.stage === "RISE") shape._pelvis[0] = (plan.P0[0] + plan.dirSign * plan.xStop * 0.15) * (1 - smooth01(L.s));
      g.pose = shape; g.phase = L.stage; g.sub = shape._name || L.stage;
      const feetStyle = w < 0.5;
      if (L.stage === "FOLLOW" || L.stage === "DESCENT") locks = { R: 0, L: 0 };
      else if (L.stage === "ABSORB") locks = feetStyle ? { R: 1, L: 1, at: "touch" } : { R: 0, L: 0 };
      else if (L.stage === "SETTLE") locks = feetStyle ? { [g.reachHand]: 0, [g.reachHand === "R" ? "L" : "R"]: 1, at: "touch" } : { R: 0, L: 0 };
      else if (L.stage === "GETUP") locks = { R: 1, L: 1, at: "stance" };
      else if (L.stage === "RISE") locks = { R: 1, L: 1, at: "stance" };
      else locks = { R: 1, L: 1 };
      g.locks = locks;
      // hand brace on the pitch while settled / getting up (the reaching hand for a stumble, both for a side landing)
      if (L.stage === "SETTLE" || L.stage === "GETUP") { const wb = L.stage === "SETTLE" ? clamp01(L.s * 4) : 1 - smooth01(clamp01((L.s - 0.45) / 0.4)); g.brace = { w: wb, both: !feetStyle }; }
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
  const plantFeet = () => { for (const side of ["R", "L"]) { const st = state.feet[side]; const w = clamp01(want[side] || 0); if (st && st.locked && st.P && w > 0) { const r = skelIK2(skel, fk, "thigh_" + side, "shin_" + side, "foot_" + side, st.P, w, null, 0); flattenFoot(side, w); diag.feet[side] = { locked: true, w: +w.toFixed(2), residual: +r.residual.toFixed(3), P: st.P }; } } };
  for (const side of ["R", "L"]) {
    const fb = skel.byName["foot_" + side], ankle = fk.joint[fb.idx]; const w = clamp01(want[side] || 0); const st = state.feet[side] || { locked: false, P: null };
    if (w > 0 && (!st.locked || state.lockStage !== stage)) {
      let P;
      if (L.at === "stance") { const spread = (side === "R" ? 1 : -1) * 0.20; P = M4.transformPoint(g.rootM, [spread + (g.landing ? g.landing.plan.dirSign * g.landing.plan.xStop * 0.15 : 0), ankleH, 0.02]); }
      else P = [ankle[0], ankleH, ankle[2]];
      st.locked = true; st.P = P; st.since = desc.now;
    }
    if (w <= 0) st.locked = false;
    state.feet[side] = st;
    diag.feet[side] = { locked: false, w: 0, height: +(ankle[1] - ankleH).toFixed(3) };
  }
  state.lockStage = stage;
  plantFeet();
  // 2. ground clamp (presentation only): nothing below the pitch — lift the body by the deepest penetration, then re-plant
  let minY = 1e9, minB = null; for (const b of skel.bones) { if (!b.part) continue; const v = Math.min(fk.joint[b.idx][1] - b.rad * 0.6, fk.tip[b.idx][1] - b.rad * 0.6); if (v < minY) { minY = v; minB = b.name; } }
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
  // 4. hand brace on the pitch (stumble / get-up): the braced hand meets the ground beside the pelvis
  if (g.brace && g.brace.w > 0) {
    const hands = g.brace.both ? ["R", "L"] : [h];
    for (const s of hands) { const sgn = (g.landing ? g.landing.plan.dirSign : 1) * (s === h ? 1 : -0.6); const Pl = [ (pose._pelvis ? pose._pelvis[0] : 0) + sgn * 0.42, 0.05, 0.28 ]; const Pw = M4.transformPoint(g.rootM, Pl); const r = skelIK2(skel, fk, "upperArm_" + s, "foreArm_" + s, "hand_" + s, Pw, g.brace.w, null, 0.6); diag["brace_" + s] = { w: +g.brace.w.toFixed(2), residual: +r.residual.toFixed(3), P: Pw }; }
  }
  pel.off = savedOff;
  // presentation root = ground projection of the pelvis (pitch frame); continuous by construction
  const pw = fk.joint[skel.byName.pelvis.idx]; const pr = pitchW([pw[0], 0, pw[2]]);
  let dx = pr[0] - desc.simRoot[0], dy = pr[1] - desc.simRoot[1]; const dm = Math.hypot(dx, dy);
  if (dm > GK_GRAPH.presMaxM) { dx *= GK_GRAPH.presMaxM / dm; dy *= GK_GRAPH.presMaxM / dm; }
  g.pres = { dx, dy, dm: Math.min(dm, GK_GRAPH.presMaxM), x: desc.simRoot[0] + dx, y: desc.simRoot[1] + dy };
  return { fk, diag };
}
