// ═══ anim3d/gk_graph.js — goalkeeper ANIMATION GRAPH: ActionDescription → clip sampling + procedural correction ═══
// Reads only the ActionDescription (layer B) built from the simulation; writes nothing back. Produces a pose, the
// character root matrix, the presentation-root offset and the procedural targets (IK / plant / look-at) for the renderer.
const GK_GRAPH = {
  loadPhase: 0.30,        // IK weight ramps in from here (same as GK_ANIM.loadPhase) → 1 by u = 1 / contact
  toeOff: 0.31,           // plant-foot lock released at TOE_OFF
  ikFadePost: 0.35,       // seconds after endT over which the glove releases the (frozen) simulation hand
  torsoAssistMaxDeg: 20, clavicleAssistMaxDeg: 10,
  presMaxM: 0.6,          // hard cap on the presentation-root offset (metres)
  lookMaxDeg: 55,         // head/neck look-at toward the ball
  landDur: 0.45, recoverDur: 0.60,
  // GEOMETRY-DRIVEN BODY AXIS (procedural redirect of the authored trunk): the authored far dive is laid out along a body axis
  // rolled `authoredRollDeg` from vertical; at runtime the axis is re-aimed at the committed target and the pelvis is placed so the
  // reaching arm can land on the simulation hand. Clip keys still supply the SHAPE (legs, trail arm, head, timing).
  authoredRollDeg: 72, reachLenH: 0.64, jumpMaxM: 0.55, pelvisMinY: 0.30,
  sideLandLo: 30, sideLandHi: 60,      // body-axis angle from vertical (deg): below lo → land on the feet, above hi → land on the side
};
function gkGraphSampleKeys(keys, x, named) {   // piecewise-linear over [x, poseOrName] with 'set'/'reach' references
  const res = (k) => typeof k === "string" ? named[k] : k;
  if (x <= keys[0][0]) return res(keys[0][1]);
  for (let i = 0; i < keys.length - 1; i++) { const [x0, a] = keys[i], [x1, b] = keys[i + 1]; if (x >= x0 && x <= x1) { const t = x1 > x0 ? (x - x0) / (x1 - x0) : 1; return poseLerpP(res(a), res(b), t); } }
  return res(keys[keys.length - 1][1]);
}
function poseLerpP(a, b, t) { const p = poseLerp(stripMeta(a), stripMeta(b), t); const pa = a._pelvis || [0, 0, 0], pb = b._pelvis || [0, 0, 0]; p._pelvis = V3.lerp(pa, pb, t); p._name = t < 0.5 ? (a.name || a._name) : (b.name || b._name); return p; }
function stripMeta(p) { const o = {}; for (const k in p) if (k[0] !== "_" && k !== "name") o[k] = p[k]; return o; }
function poseMirrorP(p) { const m = poseMirror(stripMeta(p)); if (p._pelvis) m._pelvis = [-p._pelvis[0], p._pelvis[1], p._pelvis[2]]; m._name = p.name || p._name; return m; }
// character root matrix (local → 3D world) from the pitch-frame position + facing (radians, pitch convention)
function gkRootMatrix(px, py, facing, dz) {
  const f = facing, m = M4.ident();
  const right = [-Math.sin(f), 0, -Math.cos(f)], up = [0, 1, 0], fwd = [Math.cos(f), 0, -Math.sin(f)];
  m[0] = right[0]; m[1] = right[1]; m[2] = right[2]; m[4] = up[0]; m[5] = up[1]; m[6] = up[2]; m[8] = fwd[0]; m[9] = fwd[1]; m[10] = fwd[2];
  m[12] = px; m[13] = dz || 0; m[14] = -py; return m;
}
const glW = (p) => [p[0], p[2], -p[1]];              // pitch (x, y, z-height) → 3D world (x, height, −y)
const pitchW = (p) => [p[0], -p[2], p[1]];           // 3D world → pitch (x, y, z)
// presentation-root continuation after endT (same law as the sprite sequences' `pres`)
function gkPresContinuation(desc, P) {
  const c = desc.commit; if (!c || desc.endT == null || desc.now < desc.endT) return { dx: 0, dy: 0, dm: 0 };
  const tl = desc.now - desc.endT, ex = desc.simRoot[0] - c.feet[0], ey = desc.simRoot[1] - c.feet[1], trav = Math.hypot(ex, ey);
  if (trav < 1e-6 || tl >= P.tEnd) return { dx: 0, dy: 0, dm: 0 };
  const ux = ex / trav, uy = ey / trav, V0 = trav / Math.max(1e-6, c.execTime), dLand = V0 * P.tau * (1 - Math.exp(-P.tLand / P.tau));
  let d; if (tl <= P.tLand) d = V0 * P.tau * (1 - Math.exp(-tl / P.tau)); else d = dLand * (0.5 + 0.5 * Math.cos(Math.PI * (tl - P.tLand) / (P.tEnd - P.tLand)));
  d = Math.min(d, GK_GRAPH.presMaxM);
  return { dx: ux * d, dy: uy * d, dm: d };
}
// body-axis solve in the character frame: committed target (frozen) relative to the current root → axis angle from vertical,
// solved pelvis position (target − reach along the axis, clamped to a jump ceiling and the ground) and the side-landing weight
function gkGraphAxis(desc, g, skel) {
  const c = desc.commit; if (!c) return null;
  const Tl = M4.transformPoint(M4.invertRigid(g.rootM), glW(c.target));
  const hipY = 0.50 * skel.H, rel = [Tl[0], Tl[1] - hipY, Tl[2]]; const L = V3.len(rel) || 1e-6; const d = V3.scale(rel, 1 / L);
  const theta = Math.atan2(Math.hypot(rel[0], rel[2]), rel[1]) / DEG;                 // 0 = straight up, 90 = horizontal, >90 = below the hip
  const reach = GK_GRAPH.reachLenH * skel.H; let P = V3.sub(Tl, V3.scale(d, reach));
  P[1] = Math.max(GK_GRAPH.pelvisMinY, Math.min(hipY + GK_GRAPH.jumpMaxM * ((desc.cls && desc.cls.expr) ? desc.cls.expr.launch : 1), P[1]));
  const sign = Tl[0] >= 0 ? 1 : -1;                                                  // +x local = the character's right
  const wSide = clamp01((theta - GK_GRAPH.sideLandLo) / (GK_GRAPH.sideLandHi - GK_GRAPH.sideLandLo));
  return { theta: +theta.toFixed(1), d, pelvis: P, pelvisOff: [P[0], P[1] - hipY, P[2]], sign, wSide, targetLocal: Tl };
}
// re-aim an authored pre-contact pose: pelvis roll → −sign·θ and pelvis offset → solved, both weighted by the clip's own extension progress
function gkGraphRedirect(pose, axis) {
  const roll = pose.pelvis ? pose.pelvis[2] : 0, wExt = clamp01(Math.abs(roll) / GK_GRAPH.authoredRollDeg);
  const out = Object.assign({}, pose); out.pelvis = [pose.pelvis ? pose.pelvis[0] : 0, pose.pelvis ? pose.pelvis[1] : 0, lerp(roll, -axis.sign * axis.theta, wExt)];
  const k = lerp(1, Math.min(1.4, axis.theta / GK_GRAPH.authoredRollDeg), wExt);     // the spine/chest lean is part of the body axis: scale it with the solved angle
  for (const bn of ["spine", "chest"]) if (pose[bn]) out[bn] = [pose[bn][0], pose[bn][1], pose[bn][2] * k];
  out._pelvis = V3.lerp(pose._pelvis || [0, 0, 0], axis.pelvisOff, wExt); out._wExt = wExt; return out;
}
// landing on the feet (small body-axis angles): from the pose at endT → crouch → SET
function gkGraphPostFeet(tl, endPose, setPose, axis) {
  const crouch = Object.assign({}, setPose, { _pelvis: [endPose._pelvis ? endPose._pelvis[0] * 0.8 : 0, -0.28, 0.02], pelvis: [18, 0, (endPose.pelvis ? endPose.pelvis[2] : 0) * 0.35], thigh_R: [-48, 0, 16], shin_R: [72, 0, 0], foot_R: [-24, 0, 0], thigh_L: [-48, 0, -16], shin_L: [72, 0, 0], foot_L: [-24, 0, 0], upperArm_R: [-20, 0, 30], foreArm_R: [-40, 0, 0], upperArm_L: [-20, 0, -30], foreArm_L: [-40, 0, 0], _name: "LAND_FEET" });
  if (tl < 0.30) return poseLerpP(endPose, crouch, smooth01(tl / 0.30));
  if (tl < 0.85) return poseLerpP(crouch, Object.assign({}, setPose, { _pelvis: setPose._pelvis, _name: "SET" }), smooth01((tl - 0.30) / 0.55));
  return Object.assign({}, setPose, { _pelvis: setPose._pelvis, _name: "SET" });
}
// main evaluation. state = per-backend memory { commitKey, plantAnkle, … } (presentation memory only)
function gkGraphEvaluate(desc, clip, skel, state) {
  const named = { set: clip.set, reach: clip.pre[clip.pre.length - 1][1] };
  const c = desc.commit, sideL = desc.side === "LEFT";
  let pose, phase = "SET", clipT = null, ikW = 0, plantW = 0, authored = true, mode = "set";
  const dive = !!c && !desc.held && (desc.family === "AIRBORNE_DIVE" || desc.family === "LOW_COLLAPSE" || desc.family === "FOOT_SAVE");   // families the far-dive trunk stands in for
  if (!c) { pose = Object.assign({}, clip.set, { _pelvis: clip.set._pelvis }); phase = desc.state; mode = "set"; }
  else if (desc.now < desc.endT) {                              // committed action in progress (pre-contact / hold at target)
    const u = clamp01(desc.u); clipT = u;
    if (dive) { pose = gkGraphSampleKeys(clip.pre, u, named); phase = u < clip.pre[1][0] ? "LOAD" : u < GK_GRAPH.toeOff ? "PUSH" : (desc.contact && desc.contact.tickT >= c.t0 - 1e-3 ? "CONTACT" : "FLIGHT"); mode = "pre"; }
    else { pose = Object.assign({}, clip.set, { _pelvis: clip.set._pelvis }); phase = desc.family || "REACH"; authored = false; mode = "procedural"; }
    ikW = u >= GK_GRAPH.loadPhase ? clamp01((u - GK_GRAPH.loadPhase) / (1 - GK_GRAPH.loadPhase)) : 0;
    if (desc.contact && desc.contact.tickT >= c.t0 - 1e-3) ikW = 1;
    if (!authored) ikW = 1;
    plantW = u < GK_GRAPH.toeOff ? 1 - smooth01((u - 0.1) / (GK_GRAPH.toeOff - 0.1)) : 0;
  } else {                                                      // after endT: LAND → RECOVER → SET by seconds
    const tl = desc.now - desc.endT; clipT = tl;
    if (dive) { pose = gkGraphSampleKeys(clip.post, tl, named); phase = tl < GK_GRAPH.landDur ? "LAND" : tl < GK_GRAPH.landDur + GK_GRAPH.recoverDur ? "RECOVER" : "SET"; mode = "post"; }
    else { pose = Object.assign({}, clip.set, { _pelvis: clip.set._pelvis }); phase = tl < 0.4 ? "RISE" : "SET"; authored = false; mode = "procedural"; }
    ikW = desc.held ? 1 : Math.max(0, 1 - tl / GK_GRAPH.ikFadePost);
  }
  if (sideL) pose = poseMirrorP(pose);
  // presentation root: 0 during the action (the simulation's own root travel is used); continuation after endT
  const pres = c ? gkPresContinuation(desc, clip.pres) : { dx: 0, dy: 0, dm: 0 };
  const facing = c ? desc.commitFacing : desc.facing;
  const rootM = gkRootMatrix(desc.simRoot[0] + pres.dx, desc.simRoot[1] + pres.dy, facing, 0);
  const g = { pose, phase, clipT, ikW, plantW, pres, rootM, facing, authored, mode, side: desc.side, reachHand: sideL ? "L" : "R", axis: null };
  // GEOMETRY-DRIVEN REDIRECT of the authored trunk (pre-contact): body axis toward the committed target, pelvis solved for reach
  if (c && dive && authored) {
    const axis = gkGraphAxis(desc, g, skel); g.axis = axis;
    if (mode === "pre") { g.pose = gkGraphRedirect(pose, axis); state.endPose = g.pose; state.endAxis = axis; }
    else if (mode === "post" && state.endPose) {
      const tl = clipT, endPose = state.endPose, ax = state.endAxis || axis;
      const feet = gkGraphPostFeet(tl, endPose, sideL ? poseMirrorP(clip.set) : clip.set, ax);
      // side landing (authored): keep pelvis lateral continuity with where the redirected flight ended
      const kx = endPose._pelvis && Math.abs(named.reach._pelvis[0]) > 1e-6 ? endPose._pelvis[0] / (sideL ? -named.reach._pelvis[0] : named.reach._pelvis[0]) : 1;
      const sideP = Object.assign({}, pose, { _pelvis: [(pose._pelvis || [0, 0, 0])[0] * kx, (pose._pelvis || [0, 0, 0])[1], (pose._pelvis || [0, 0, 0])[2]] });
      g.pose = poseLerpP(feet, sideP, ax.wSide); g.pose._name = (ax.wSide < 0.5 ? "FEET:" : "SIDE:") + (sideP._name || pose._name || "");
    }
  } else { state.endPose = null; state.endAxis = null; }
  return g;
}
// procedural pass after the graph: FK → plant-foot IK → ground clamp → torso assist → glove IK → head look-at. Returns fk + diagnostics.
function gkGraphSolve(desc, g, skel, state) {
  const pose = g.pose, pel = skel.byName.pelvis, savedOff = pel.off.slice();
  const pd = pose._pelvis || [0, 0, 0]; pel.off = [savedOff[0] + pd[0], savedOff[1] + pd[1], savedOff[2] + pd[2]];
  const h = g.reachHand, hand = "hand_" + h, fore = "foreArm_" + h, upper = "upperArm_" + h;
  let fk = skelFK(skel, pose, g.rootM);
  const diag = { plant: null, ground: 0, torso: 0, ik: null, look: 0 };
  // 1. plant lock: the push-off (dive-side) foot stays where it was at the commit tick while loading/pushing
  const ankle = "foot_" + h, thigh = "thigh_" + h, shin = "shin_" + h;
  if (desc.commit) {
    const key = desc.commit.commitTick;
    if (state.commitKey !== key) { state.commitKey = key; state.plantAnkle = fk.joint[skel.byName[ankle].idx].slice(); state.plantAnkle[1] = 0.06 * skel.H; }
    if (g.plantW > 0 && state.plantAnkle) { const r = skelIK2(skel, fk, thigh, shin, ankle, state.plantAnkle, g.plantW, null); diag.plant = { w: +g.plantW.toFixed(2), residual: +r.residual.toFixed(3) }; }
  } else state.commitKey = null;
  // 2. ground clamp (presentation only): nothing below the pitch — lift the body by the deepest penetration
  let minY = 1e9; for (const b of skel.bones) { if (!b.part) continue; minY = Math.min(minY, fk.joint[b.idx][1] - b.rad * 0.6, fk.tip[b.idx][1] - b.rad * 0.6); }
  if (minY < 0) { pel.off[1] -= minY; diag.ground = +(-minY).toFixed(3); fk = skelFK(skel, pose, g.rootM); if (diag.plant && state.plantAnkle) skelIK2(skel, fk, thigh, shin, ankle, state.plantAnkle, g.plantW, null); }
  // 3. torso / clavicle assist toward an out-of-reach glove target (bounded), then glove IK
  const T = glW(desc.handTarget);
  if (g.ikW > 0) {
    const up = skel.byName[upper], fo = skel.byName[fore], hd = skel.byName[hand]; const S = fk.joint[up.idx]; const over = V3.dist(T, S) - (up.len + fo.len + 0.6 * hd.len);
    if (over > 0.01) {
      // signed angle (about the character's forward axis) from the pelvis→shoulder line to the pelvis→target line, in the character frame
      const inv = M4.invertRigid(g.rootM), Pj = M4.transformPoint(inv, fk.joint[skel.byName.pelvis.idx]), Sl = M4.transformPoint(inv, S), Tl = M4.transformPoint(inv, T);
      const a1 = Math.atan2(Sl[0] - Pj[0], Sl[1] - Pj[1]), a2 = Math.atan2(Tl[0] - Pj[0], Tl[1] - Pj[1]);
      let e = (a2 - a1) / DEG; e = Math.max(-GK_GRAPH.torsoAssistMaxDeg, Math.min(GK_GRAPH.torsoAssistMaxDeg, e)) * clamp01(over / 0.3) * g.ikW;   // +e = target further toward +x (right) ⇒ negative roll
      const assist = { spine: [0, 0, -e * 0.5], chest: [0, 0, -e * 0.5], ["clavicle_" + h]: [0, 0, (h === "R" ? 1 : -1) * GK_GRAPH.clavicleAssistMaxDeg * clamp01(over / 0.3) * g.ikW] };
      const p2 = poseAdd(pose, assist); p2._pelvis = pose._pelvis; diag.torso = +e.toFixed(1);
      fk = skelFK(skel, p2, g.rootM); if (diag.plant && state.plantAnkle) skelIK2(skel, fk, thigh, shin, ankle, state.plantAnkle, g.plantW, null);
    }
    const r = skelIK2(skel, fk, upper, fore, hand, T, g.ikW, null, 0.6);
    diag.ik = { w: +g.ikW.toFixed(3), reached: r.reached, residual: +r.residual.toFixed(3), wrist: r.wrist, handCentre: r.handCentre, target: T };
  }
  pel.off = savedOff;
  return { fk, diag };
}
