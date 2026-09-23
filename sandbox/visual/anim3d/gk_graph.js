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
  ikFadePost: 0.35, torsoAssistMaxDeg: 20, clavicleAssistMaxDeg: 10, lookMaxDeg: 55, presMaxM: 2.5,
  ballVisR: 0.11, handOff: 0.03, antUpZ: [0.45, 0.80],   // presentation ball radius = the PHYSICAL ball (GOALFX.ballR 0.11; the 2D sprite draws an exaggerated 0.19 for readability — hand / ball relationships are judged against the real size); hand-target offset outside the ball; predicted crossing height (m) below/above which the central anticipation is the crouch / the upright ready
  authoredRollDeg: 72, reachLenH: 0.64, jumpMaxM: 0.55, pelvisMinY: 0.30, followRiseM: 0.03, flightCap: true, capBlendT: 0.05, dbg: { noRedirect: false, noLaunch: false, noAssist: false, noIK: false, noArmClear: false }, lateralRule: true,
  armClear: { zIn: [25, 85], maxDeg: 55, zHi: [100, 130], maxDegHigh: 50, zOut: [999, 1000], foreArmRelax: 0, zCap: 85, zCapSlope: 0.2, reachPole: [0.35, -0.35] },   // reachPole: [forward, world-up] offset (m) of the reach arm's IK elbow pole from the shoulder in the lateral regime   // far-lateral regime, trailing (top) arm: horizontal adduction (bone yaw) as a function of the authored frontal-plane adduction z — smooth rise over zIn to maxDeg (the arm crosses IN FRONT of the chest, not through it), rising to maxDegHigh over zHi (at the reach the arm passes in front of the face, not behind the head); zOut = optional fade back to the authored yaw (off)
  selfCol: { abd: 0.125, chest: 0.145, chestTop: 0.09, neck: 0.06, neckLen: 0.11, head: 0.10, uarm: 0.045, farm: 0.040, hand: 0.035, flag: -0.02 },   // approximate self-collision volumes (m at H 2.0, scaled by H/2): abdomen / chest capsules (the chest axis ends chestTop below the shoulder line so its top sits at the trapezius, not 14 cm above the shoulders), neck capsule, head sphere; diagnostic / regression gate only — penetration beyond `flag` is reported
   // lateralRule: the far-LATERAL dive regime (body axis ≥ sideLandHi) — proportional roll, no torso assist toward the target, fall-timed landing; false = the previous behaviour (review before/after)   // dbg.*: review switches isolating the procedural layers (authored motion only when all are set)   // flightCap: review switch only (false reproduces the unbounded continuation for before/after captures) · followRiseM: after execEnd the flight may rise at most this much above the higher of the contact pelvis and the jump ceiling (the accepted v6 follow-through: 42's arc peaks 2 cm above its contact pelvis)
  sideLandLo: 35, sideLandHi: 60,                  // body-axis angle from vertical (deg): ≤ lo land on the feet, ≥ hi land on the side
  G: 9.81,
  plantU: 0.10,           // the launch plan starts at the plant: from here the pelvis is ONE trajectory (push → arc → ground) until the settle
  // landing physics (feet-first vs side-first; blended by the body-axis angle). Heights in m for H 1.90, durations in s.
  // Ground deceleration is progressive along the travel direction: decelTouch while the first contact skids, decelImpact while the
  // body hits and folds, then the slide's friction is whatever brings the remaining speed to zero by the end of the settle.
  feet: { hTouch: 0.95, hImpact: 0.60, hGround: 0.28, impactT: 0.16, absorbT: 0.24, decelTouch: 1.5, decelImpact: 3.0, hold: 0.40, followFrac: 0.35 },
  side: { hTouch: 0.62, hImpact: 0.40, hGround: 0.28, impactT: 0.14, absorbT: 0.30, decelTouch: 1.0, decelImpact: 2.5, hold: 0.45, followFrac: 0.30 },
  getup: { brace: 0.30, pushUp: 0.30, halfKneel: 0.35, crouch: 0.35, rise: 0.50 },
  repo: { stepLen: 0.50, stepT: 0.30, bob: 0.03, minDist: 0.08 },
  holdDecel: 2.5,         // a CAUGHT ball: the arms absorb the momentum — ground deceleration multiplier (the body stops beside the ball it holds)
  holdBlend: 0.30,        // seconds to settle into a held-ball pose
  antSymLat: [0.30, 0.70],// predicted crossing |lateral| (m) below which the anticipation is the symmetric ready crouch, above which the side load   // REPOSITION after standing: shuffle steps back to the simulation root (one support-foot change per step); the get-up itself never moves the body
  launchPos: 0.30,        // authored pelvis keys are used only before the plant (u < plantU); kept for the LOAD blend
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
function gkGraphAxis(desc, rootM, skel, lowMode) {
  const c = desc.commit; if (!c) return null;
  const Tl = M4.transformPoint(M4.invertRigid(rootM), glW(c.target));
  const hipY = 0.50 * skel.H, rel = [Tl[0], Tl[1] - hipY, Tl[2]]; const L = V3.len(rel) || 1e-6; const d = V3.scale(rel, 1 / L);
  const theta = Math.atan2(Math.hypot(rel[0], rel[2]), rel[1]) / DEG;
  const reach = GK_GRAPH.reachLenH * skel.H; let P = V3.sub(Tl, V3.scale(d, reach));
  if (lowMode) {                                                                                 // LOW dive: the body lies along the pitch — pelvis ends at the side-lying height, the arm reaches along the ground to the ball
    const hs = skel.H / 1.9, hLow = Math.max(GK_GRAPH.pelvisMinY, GK_GRAPH.side.hGround * hs + 0.06 * hs), dy = Tl[1] - hLow, horiz = Math.sqrt(Math.max(0, reach * reach - dy * dy));
    const lat = Math.hypot(Tl[0], Tl[2]) || 1e-6, ux = Tl[0] / lat, uz = Tl[2] / lat, back = Math.max(0.15 * hs, lat - horiz * 0.92);   // the fall carries the hips at least a little toward the ball; the arm is not fully straight at contact
    P = [ux * back, hLow, uz * back];
  }
  P[1] = Math.max(GK_GRAPH.pelvisMinY, Math.min(hipY + GK_GRAPH.jumpMaxM * ((desc.cls && desc.cls.expr) ? desc.cls.expr.launch : 1), P[1]));
  const sign = Tl[0] >= 0 ? 1 : -1, wSide = clamp01((theta - GK_GRAPH.sideLandLo) / (GK_GRAPH.sideLandHi - GK_GRAPH.sideLandLo));
  return { theta: +theta.toFixed(1), d, pelvis: P, pelvisOff: [P[0], P[1] - hipY, P[2]], sign, wSide, targetLocal: Tl };
}
function gkGraphRedirect(pose, axis, u, rollMax, lateral) {
  const roll = pose.pelvis ? pose.pelvis[2] : 0, wExt = clamp01(Math.abs(roll) / GK_GRAPH.authoredRollDeg);
  const wPos = u == null ? wExt : smooth01(clamp01((u - GK_GRAPH.launchPos) / (1 - GK_GRAPH.launchPos)));               // the solved jump/launch position takes over from the toe-off; LOAD/PLANT/PUSH keep the authored crouch (feet can stay planted)
  const thetaR = rollMax != null ? Math.min(axis.theta, rollMax) : axis.theta;                                             // LOW dives: the body goes horizontal at most (a keeper never inverts); the arms reach the rest
  // FAR-LATERAL regime (body axis ≥ sideLandHi): the authored roll CURVE is scaled to the target axis (roll = theta · authored fraction), so the
  // trunk inclines in the authored proportion — most of it in flight — instead of the lerp toward the full axis, which adds up to 72·f·(1−f)
  // degrees of roll during the push (the body was horizontal before it left the ground). The approved high-dive rule is unchanged below the regime.
  const rollOut = lateral ? -axis.sign * thetaR * wExt : lerp(roll, -axis.sign * thetaR, wExt);
  const out = Object.assign({}, pose); out.pelvis = [pose.pelvis ? pose.pelvis[0] : 0, pose.pelvis ? pose.pelvis[1] : 0, rollOut];
  const k = lerp(1, Math.min(1.4, axis.theta / GK_GRAPH.authoredRollDeg), wExt);
  for (const bn of ["spine", "chest"]) if (pose[bn]) out[bn] = [pose[bn][0], pose[bn][1], pose[bn][2] * k];
  out._pelvis = V3.lerp(pose._pelvis || [0, 0, 0], axis.pelvisOff, wPos); out._wExt = wExt; out._wPos = wPos; return out;
}
// ── launch + flight plan (world frame, built once at the plant from the authored crouch and the simulation's own facts) ──
// The pelvis is ONE trajectory from the plant to the first ground contact: a constant-acceleration push (plant → toe-off) that
// arrives at the toe-off with the flight's launch velocity, then a ballistic arc (constant horizontal velocity, gravity only)
// that passes through the solved full-extension pelvis at execEnd. Ball contact lies on that arc and does not change it; the
// simulation root's own easing to a stop is not followed (the body carries its momentum; reconciliation happens on the ground).
function gkLaunchPlan(axisEnd, rootMEnd, W0, v0, tP, tT, tE, hCeil) {
  const g = GK_GRAPH.G, Pc = M4.transformPoint(rootMEnd, axisEnd.pelvis);
  const Tp = Math.max(1e-3, tT - tP), D = Math.max(1e-3, tE - tT), den = D + Tp / 2;
  const V = [(Pc[0] - W0[0] - v0[0] * Tp / 2) / den, 0, (Pc[2] - W0[2] - v0[2] * Tp / 2) / den];
  const vUp = (Pc[1] - W0[1] - v0[1] * Tp / 2 + 0.5 * g * D * D) / den;
  const Wt = [W0[0] + (v0[0] + V[0]) / 2 * Tp, W0[1] + (v0[1] + vUp) / 2 * Tp, W0[2] + (v0[2] + V[2]) / 2 * Tp];
  const a = [(V[0] - v0[0]) / Tp, (vUp - v0[1]) / Tp, (V[2] - v0[2]) / Tp];
  // BOUNDED FLIGHT (presentation): the arc is FITTED through the solved contact pelvis at execEnd whatever the simulation's exec time — a very short
  // exec (a fast high tip) fits an unphysical launch velocity (fixture 36: 6.5 m/s ≈ a 2 m jump) and the momentum continuation after execEnd then
  // carries the body far above / past the contact (2.8 m pelvis, 2.5 m from the root). After execEnd the pelvis may rise at most followRiseM above
  // the higher of the contact pelvis and the jump ceiling (standing hip + jumpMaxM·launch): the vertical velocity at execEnd is capped to the value
  // that peaks there; the horizontal velocity is unchanged; an uncapped arc keeps the original (bit-identical) plan. Reach is never extended.
  const vE = vUp - g * D, hCap = hCeil == null ? null : Math.max(Pc[1], hCeil) + GK_GRAPH.followRiseM, vCap = hCap == null ? null : Math.sqrt(Math.max(0, 2 * g * (hCap - Pc[1])));
  const capped = GK_GRAPH.flightCap !== false && vCap != null && vE > vCap + 1e-9, vPost = capped ? vCap : vE;
  const Tb = capped ? GK_GRAPH.capBlendT : 0, hBase = capped ? Pc[1] + (vE - vPost) * Tb / 2 : Pc[1];   // the excess vertical velocity is bled off linearly over capBlendT (velocity-continuous at execEnd); after it the segment is ballistic with vPost from hBase
  const tA = capped ? tE + Math.max(0, vPost) / g : tT + Math.max(0, vUp / g), hA = capped ? hBase + Math.max(0, vPost) ** 2 / (2 * g) : Wt[1] + Math.max(0, vUp) ** 2 / (2 * g);
  return { W0, v0, V, vUp, Wt, a, tP, tT, tE, tA, hA, Pc, vLat: Math.hypot(V[0], V[2]), capped, vPost, vE, hCap, hCeil, Tb, hBase };
}
function gkLaunchState(L, t) {                                    // world pelvis + velocity at absolute time t (push, then the arc — which continues past endT until the landing takes over)
  const g = GK_GRAPH.G;
  if (t <= L.tT) { const s = Math.max(0, t - L.tP); return { W: [L.W0[0] + L.v0[0] * s + 0.5 * L.a[0] * s * s, L.W0[1] + L.v0[1] * s + 0.5 * L.a[1] * s * s, L.W0[2] + L.v0[2] * s + 0.5 * L.a[2] * s * s], v: [L.v0[0] + L.a[0] * s, L.v0[1] + L.a[1] * s, L.v0[2] + L.a[2] * s], airborne: false }; }
  if (L.capped && t > L.tE) {                                                                    // bounded continuation from the contact pelvis: excess velocity bled off over Tb, then ballistic with vPost
    const s = t - L.tE, dv = L.vE - L.vPost, Tb = L.Tb;
    if (s < Tb) return { W: [L.Pc[0] + L.V[0] * s, L.Pc[1] + L.vPost * s - 0.5 * g * s * s + dv * (s - s * s / (2 * Tb)), L.Pc[2] + L.V[2] * s], v: [L.V[0], L.vPost - g * s + dv * (1 - s / Tb), L.V[2]], airborne: true, capped: true };
    return { W: [L.Pc[0] + L.V[0] * s, L.hBase + L.vPost * s - 0.5 * g * s * s, L.Pc[2] + L.V[2] * s], v: [L.V[0], L.vPost - g * s, L.V[2]], airborne: true, capped: true };
  }
  const s = t - L.tT; return { W: [L.Wt[0] + L.V[0] * s, L.Wt[1] + L.vUp * s - 0.5 * g * s * s, L.Wt[2] + L.V[2] * s], v: [L.V[0], L.vUp - g * s, L.V[2]], airborne: true };
}
const hermite = (p0, v0, p1, v1, T, t) => { const x = clamp01(t / Math.max(1e-6, T)), x2 = x * x, x3 = x2 * x; return (2 * x3 - 3 * x2 + 1) * p0 + (x3 - 2 * x2 + x) * T * v0 + (-2 * x3 + 3 * x2) * p1 + (x3 - x2) * T * v1; };
// ── landing plan (world frame, built once at endT from the launch plan and simulation facts) ──────────────────────────
// Touchdown is where the arc reaches the touch height; the horizontal velocity there is the flight's; deceleration starts on the
// ground and is progressive (skid → impact → slide → zero at the settle). The get-up then recovers the stop → simulation-root
// offset over its support points (hips over the tucked feet, front-foot step, crouch step, rise).
// FAR-LATERAL trailing arm: the V6 keys swing the non-reaching arm from abducted (z −30) to across the body (z +76, then up to +140 at the
// reach) with an x flexion of −60; the rig's euler order is Ry·Rx·Rz, and a vector already lateral (after Rz) is invariant under Rx, so
// the flexion cannot lift a crossing arm in front of the chest — the upper arm sweeps THROUGH the chest from PUSH_MID to EARLY_FLIGHT
// (−19 cm at toe-off on both rigs). A bone yaw (Ry, applied last) is the horizontal adduction that carries the same arm in front of the
// chest; it is set from the authored z alone (phase-aware, bounded, zero at the ready pose and at the two-hand reach), so the authored
// elevation / elbow bend are kept. Applied only in the lateral regime (fixture 2 / V6 42 untouched). The arm keys carry no authored yaw.
function gkLateralArmClear(pose, sideL) {
  const A = GK_GRAPH.armClear, u = sideL ? "upperArm_R" : "upperArm_L", e = pose[u]; if (!e) return pose;
  const z0 = Math.abs(e[2]), z = z0 > A.zCap ? A.zCap + (z0 - A.zCap) * A.zCapSlope : z0;   // soft cap on the frontal-plane adduction: the trailing hand stays on ITS side of the reach hand (side-by-side two-hand reach), it does not cross over the reach arm
  const amp = lerp(A.maxDeg, A.maxDegHigh, smooth01(clamp01((z - A.zHi[0]) / (A.zHi[1] - A.zHi[0]))));
  const off = amp * smooth01(clamp01((z - A.zIn[0]) / (A.zIn[1] - A.zIn[0]))) * (1 - smooth01(clamp01((z - A.zOut[0]) / (A.zOut[1] - A.zOut[0]))));
  pose[u] = [e[0], (sideL ? 1 : -1) * off, Math.sign(e[2] || 1) * z]; pose._armClear = off;
  const f = sideL ? "foreArm_R" : "foreArm_L", fe = pose[f]; if (fe && A.foreArmRelax > 0) { const wr = A.foreArmRelax * smooth01(clamp01((z - A.zHi[0]) / (A.zHi[1] - A.zHi[0]))); pose[f] = [fe[0] * (1 - wr), fe[1], fe[2]]; }   // optional: a straighter trailing forearm at the reach (its hand goes toward the ball instead of folding over the reach arm)
  return pose;
}
// approximate self-collision gate: torso capsules (abdomen pelvis→45 % to the shoulder line, chest 45 %→shoulder line) vs upper arms (from
// 35 % down the bone), forearms and hands; clearance = distance − radii (negative = penetration). Diagnostic / regression only.
function gkSelfCollision(skel, fk, reachHand) {
  const C = GK_GRAPH.selfCol, hs = skel.H / 2.0, J = (n) => fk.joint[skel.byName[n].idx], T = (n) => fk.tip[skel.byName[n].idx];
  const pel = J("pelvis"), sm = V3.scale(V3.add(J("upperArm_R"), J("upperArm_L")), 0.5), up = V3.norm(V3.sub(sm, pel)), mid = V3.lerp(pel, sm, 0.45);
  const chestEnd = V3.sub(sm, V3.scale(up, C.chestTop * hs)), neckEnd = V3.add(sm, V3.scale(up, C.neckLen * hs)), headC = V3.add(neckEnd, V3.scale(up, C.head * hs));
  const torso = [["abdomen", pel, mid, C.abd * hs], ["chest", mid, chestEnd, C.chest * hs], ["neck", sm, neckEnd, C.neck * hs], ["head", headC, headC, C.head * hs]];
  const segDist = (p1, q1, p2, q2) => { const d1 = V3.sub(q1, p1), d2 = V3.sub(q2, p2), r = V3.sub(p1, p2), a = V3.dot(d1, d1), e = V3.dot(d2, d2), f = V3.dot(d2, r); let sc, tc;
    if (a < 1e-9 && e < 1e-9) return V3.len(r); if (a < 1e-9) { sc = 0; tc = clamp01(f / e); } else { const c = V3.dot(d1, r); if (e < 1e-9) { tc = 0; sc = clamp01(-c / a); } else { const b = V3.dot(d1, d2), den = a * e - b * b; sc = den > 1e-12 ? clamp01((b * f - c * e) / den) : 0; tc = (b * sc + f) / e; if (tc < 0) { tc = 0; sc = clamp01(-c / a); } else if (tc > 1) { tc = 1; sc = clamp01((b - c) / a); } } }
    return V3.dist(V3.add(p1, V3.scale(d1, sc)), V3.add(p2, V3.scale(d2, tc))); };
  const arms = {}, out = {};
  for (const h of ["R", "L"]) { const sh = J("upperArm_" + h), el = J("foreArm_" + h), wr = J("hand_" + h), tip = T("hand_" + h);
    arms[h] = [["uarm", V3.lerp(sh, el, 0.35), el, C.uarm * hs], ["farm", el, wr, C.farm * hs], ["hand", wr, tip, C.hand * hs]];
    let best = 9, pair = null; for (const [an, p, q, r] of arms[h]) for (const [tn, tp, tq, tr] of torso) { const c = segDist(p, q, tp, tq) - r - tr; if (c < best) { best = c; pair = an + "-" + tn; } }
    out[h] = { c: +best.toFixed(3), pair }; }
  let best = 9, pair = null; for (const [an, p, q, r] of arms.R.slice(1)) for (const [bn, p2, q2, r2] of arms.L.slice(1)) { const c = segDist(p, q, p2, q2) - r - r2; if (c < best) { best = c; pair = an + "R-" + bn + "L"; } }
  out.RL = { c: +best.toFixed(3), pair }; out.min = Math.min(out.R.c, out.L.c, out.RL.c); out.trail = reachHand === "R" ? "L" : "R"; out.capsules = { torso, arms }; return out;
}
function gkLandingPlan(skel, clip, launch, axis, rootM, held, lateral) {
  const H = skel.H, w = axis.wSide, F = GK_GRAPH.feet, Sd = GK_GRAPH.side, G = GK_GRAPH.getup, mix = (a, b) => lerp(a, b, w), hs = H / 1.9, g = GK_GRAPH.G, hd = held ? GK_GRAPH.holdDecel : 1;
  const hip = 0.50 * H;
  let hTouch = mix(F.hTouch, Sd.hTouch) * hs, hImpact = mix(F.hImpact, Sd.hImpact) * hs; const hGround = mix(F.hGround, Sd.hGround) * hs;
  let impactT = mix(F.impactT, Sd.impactT); let lateralAbsorb = null; const absorbT0 = mix(F.absorbT, Sd.absorbT), hold = mix(F.hold, Sd.hold), d1 = mix(F.decelTouch, Sd.decelTouch) * hd, d2 = mix(F.decelImpact, Sd.decelImpact) * hd;
  // touchdown: where the arc comes down to the touch height (never before endT — the reach is complete first)
  const disc = launch.vUp * launch.vUp - 2 * g * (hTouch - launch.Wt[1]); const sT = disc >= 0 ? (launch.vUp + Math.sqrt(disc)) / g : Math.max(0, launch.vUp / g);
  let tTouch = Math.max(launch.tE, launch.tT + sT); const hEnd = gkLaunchState(launch, launch.tE).W[1];
  if (launch.capped) { const d2 = launch.vPost * launch.vPost - 2 * g * (hTouch - launch.hBase); const s2 = d2 >= 0 ? (launch.vPost + Math.sqrt(d2)) / g : Math.max(0, launch.vPost / g); tTouch = Math.max(launch.tE, launch.tE + s2); }   // bounded continuation: touchdown from the capped segment (the blend adds (vE−vPost)·Tb/2 to the ballistic base height)
  const arrivedLow = hEnd < hTouch || (tTouch - launch.tE) < 0.02; if (hEnd < hTouch) { tTouch = launch.tE; hTouch = hEnd; hImpact = Math.min(hImpact, hEnd); }   // no descent stage (arrival at / below the touch height): impact / absorb continue from the arrival height and the arrival POSE
  const St = gkLaunchState(launch, tTouch);
  const Ht = [St.W[0], St.W[2]], vt = Math.hypot(launch.V[0], launch.V[2]), vz = St.v[1], u = vt > 1e-6 ? [launch.V[0] / vt, launch.V[2] / vt] : [1, 0];
  let lateralVMid = null;
  if (lateral && !arrivedLow) {                                                                     // far-lateral regime: the hip is stopped by ONE uniform deceleration from the arrival speed to rest at the ground height (a = v²/2Δh) — the
    const dh = hTouch - hGround, vv = Math.max(0, -vz);                                             // impact / absorb split falls where that profile crosses the impact height, so the two hermite stages reproduce the quadratic exactly (no velocity
    if (vv > 0.3 && dh > 0.02) {                                                                    // kink at the boundary). Only ever FASTER than the authored tempo (a slow arrival keeps the authored durations): the hip is not floated down.
      const a = vv * vv / (2 * dh), Tu = 2 * dh / vv;
      if (Tu < impactT + absorbT0) { const vImp = Math.sqrt(Math.max(0, vv * vv - 2 * a * (hTouch - hImpact))); impactT = Math.max(0.03, (vv - vImp) / a); lateralAbsorb = Math.max(0.05, vImp / a); lateralVMid = -vImp; }
    }
  }
  const absorbT = lateralAbsorb != null ? lateralAbsorb : absorbT0;
  let lowStop = false;                                                                              // LOW arrival still falling: the hip stops on the pitch over the height that is left — uniform deceleration to the ground height (a hard, monotonic landing; never a dip below the ground height and a bounce back up)
  if (arrivedLow && vz < -0.3 && hEnd > hGround + 0.01) { hImpact = hGround; impactT = Math.min(impactT, Math.max(0.03, 2 * (hEnd - hGround) / -vz)); lowStop = true; }
  // ground: progressive deceleration along the travel direction; the remaining speed after the body impact is bled off by the slide
  const seg = (v0, d, T) => { const ts = d > 1e-6 ? Math.min(T, v0 / d) : T; return { v0, d, T, ts, x: v0 * ts - 0.5 * d * ts * ts, v1: Math.max(0, v0 - d * ts) }; };
  const s1 = seg(vt, d1, impactT), s2 = seg(s1.v1, d2, absorbT), s3 = seg(s2.v1, s2.v1 / Math.max(1e-6, hold), hold);
  const xStop = s1.x + s2.x + s3.x, Hstop = [Ht[0] + u[0] * xStop, Ht[1] + u[1] * xStop];
  const tImpact = tTouch + impactT, tAbsorb = tImpact + absorbT, tSettle = tAbsorb + hold;
  const inv = M4.invertRigid(rootM), sc = M4.transformPoint(inv, [Hstop[0], 0, Hstop[1]]);
  const tBrace = tSettle + G.brace, tPush = tBrace + G.pushUp, tKneel = tPush + G.halfKneel, tCrouch = tKneel + G.crouch, tRise = tCrouch + G.rise;
  // REPOSITION: once standing, the offset to the simulation root is walked back with shuffle steps (alternating feet, one re-plant per step)
  const Rp = GK_GRAPH.repo, dist = Math.hypot(sc[0], sc[2]), nSteps = dist > Rp.minDist * hs ? Math.ceil(dist / (Rp.stepLen * hs)) : 0, tRepo = tRise + nSteps * Rp.stepT, lead = sc[0] >= 0 ? "L" : "R";
  const hBrace = clip.postFeet.BRACE._h * hs, hPush = clip.postFeet.PUSH_UP._h * hs, hKneel = clip.postFeet.HALF_KNEEL._h * hs, hCrouch = clip.postFeet.CROUCH._h * hs, hSet = hip + (clip.set._pelvis ? clip.set._pelvis[1] : 0);
  const vMid = lowStop ? 0 : (lateralVMid != null ? lateralVMid : 0.5 * ((hImpact - hTouch) / impactT + (hGround - hImpact) / absorbT));      // vertical: the arrival speed is absorbed over impact + absorb (velocity-continuous), zero at the ground
  const root = [rootM[12], rootM[14]];                                                      // simulation root (world x, z): stationary after endT; the get-up recovers the offset to it
  return { w, hip, nSteps, tRepo, lead, dist, arrivedLow, lowStop, hTouch, hImpact, hGround, hBrace, hPush, hKneel, hCrouch, hSet, tTouch, tImpact, tAbsorb, tSettle, tBrace, tPush, tKneel, tCrouch, tRise, Ht, u, vt, vz, vMid, segs: [s1, s2, s3], xStop, Hstop, root, stopC: [sc[0], sc[2]], dirSign: sc[0] >= 0 ? 1 : -1, launch, impactT, absorbT };
}
// ground plan (LOW_COLLAPSE): the body is already on the pitch at endT — the same recovery chain from SETTLE, no flight, no slide
function gkGroundPlan(skel, clip, Wpelvis, rootM, tE, opt) {                                   // opt (spread block): { absorbT, hold, hGround, v0y, dir, travel } — a descent onto the saving hip with a little lateral travel, side-sit, no brace / push-up stages
  const H = skel.H, hs = H / 1.9, G = GK_GRAPH.getup, hip = 0.50 * H, Sd = GK_GRAPH.side;
  const H2 = [Wpelvis[0], Wpelvis[2]], hStart = Wpelvis[1], hGround = opt ? opt.hGround : Wpelvis[1], hold = opt ? opt.hold : Sd.hold, absorbT = opt ? opt.absorbT : 0;
  const tTouch = tE, tImpact = tE, tAbsorb = tE + absorbT, tSettle = tAbsorb + hold, tBrace = tSettle + (opt ? 0 : G.brace), tPush = tBrace + (opt ? 0 : G.pushUp), tKneel = tPush + G.halfKneel, tCrouch = tKneel + G.crouch, tRise = tCrouch + G.rise;
  const u = opt ? opt.dir : [1, 0], xStop = opt ? opt.travel : 0, segs = opt && xStop > 0 ? [{ v0: 2 * xStop / absorbT, d: 2 * xStop / (absorbT * absorbT), T: absorbT, ts: absorbT }] : [];   // lateral momentum bled to zero over the absorb
  const Hstop = [H2[0] + u[0] * xStop, H2[1] + u[1] * xStop];
  const inv = M4.invertRigid(rootM), sc = M4.transformPoint(inv, [Hstop[0], 0, Hstop[1]]);
  const Rp = GK_GRAPH.repo, dist = Math.hypot(sc[0], sc[2]), nSteps = dist > Rp.minDist * hs ? Math.ceil(dist / (Rp.stepLen * hs)) : 0, tRepo = tRise + nSteps * Rp.stepT, lead = sc[0] >= 0 ? "L" : "R";
  const hBrace = opt ? hGround : clip.postFeet.BRACE._h * hs, hPush = opt ? hGround : clip.postFeet.PUSH_UP._h * hs, hKneel = clip.postFeet.HALF_KNEEL._h * hs, hCrouch = clip.postFeet.CROUCH._h * hs, hSet = hip + (clip.set._pelvis ? clip.set._pelvis[1] * hs : 0);
  return { w: 1, hip, nSteps, tRepo, lead, dist, hTouch: hStart, hImpact: hStart, hGround, hBrace, hPush, hKneel, hCrouch, hSet, tTouch, tImpact, tAbsorb, tSettle, tBrace, tPush, tKneel, tCrouch, tRise, Ht: H2, u, vt: 0, vz: opt ? opt.v0y : 0, vMid: opt ? opt.v0y : 0, segs, xStop, Hstop, root: [rootM[12], rootM[14]], stopC: [sc[0], sc[2]], dirSign: sc[0] >= 0 ? 1 : -1, launch: null, impactT: 0, absorbT, ground: true, spread: !!opt };
}
// pelvis (world: height h, horizontal H) + stage at absolute time t. Flight = the launch arc; ground = progressive decel; get-up =
// the pelvis moves over its support points toward the simulation root — reconciliation THROUGH the recovery, never in the air.
function gkLandingState(P, t) {
  let h, H, stage, s, step = null; const seg = (t0, t1) => clamp01((t - t0) / Math.max(1e-6, t1 - t0)), Rp = GK_GRAPH.repo;
  const ground = (tl) => { let x = 0, tt = tl; for (const sg of P.segs) { if (tt <= 0) break; const q = Math.min(tt, sg.ts); x += sg.v0 * q - 0.5 * sg.d * q * q; tt -= sg.T; } return x; };
  const along = (x) => [P.Ht[0] + P.u[0] * x, P.Ht[1] + P.u[1] * x];
  const recon = (f) => [lerp(P.Hstop[0], P.root[0], f), lerp(P.Hstop[1], P.root[1], f)];   // used ONLY by the standing REPOSITION steps
  if (t < P.tTouch) { s = seg(P.launch.tE, P.tTouch); const St = gkLaunchState(P.launch, t); h = St.W[1]; H = [St.W[0], St.W[2]]; stage = s < GK_GRAPH.feet.followFrac ? "FOLLOW" : "DESCENT"; }
  else if (t < P.tImpact) { s = seg(P.tTouch, P.tImpact); h = hermite(P.hTouch, P.vz, P.hImpact, P.vMid, P.impactT, t - P.tTouch); H = along(ground(t - P.tTouch)); stage = "IMPACT"; }
  else if (t < P.tAbsorb) { s = seg(P.tImpact, P.tAbsorb); h = hermite(P.hImpact, P.vMid, P.hGround, 0, P.absorbT, t - P.tImpact); H = along(ground(t - P.tTouch)); stage = "ABSORB"; }
  else if (t < P.tSettle) { s = seg(P.tAbsorb, P.tSettle); h = P.hGround; H = along(ground(t - P.tTouch)); stage = "SETTLE"; }
  // GET-UP happens where the body settled: the settled pelvis is the recovery origin, no stage below relocates it
  else if (t < P.tBrace) { s = seg(P.tSettle, P.tBrace); h = lerp(P.hGround, P.hBrace, smooth01(s)); H = P.Hstop; stage = "BRACE"; }
  else if (t < P.tPush) { s = seg(P.tBrace, P.tPush); h = lerp(P.hBrace, P.hPush, smooth01(s)); H = P.Hstop; stage = "PUSH_UP"; }
  else if (t < P.tKneel) { s = seg(P.tPush, P.tKneel); h = lerp(P.hPush, P.hKneel, smooth01(Math.min(1, s / 0.35)));   /* the pelvis reaches kneel height ahead of the leg shapes so the kneeling knee never dips under the pitch */ H = P.Hstop; stage = "HALF_KNEEL"; }
  else if (t < P.tCrouch) { s = seg(P.tKneel, P.tCrouch); h = lerp(P.hKneel, P.hCrouch, smooth01(s)); H = P.Hstop; stage = "CROUCH"; }
  else if (t < P.tRise) { s = seg(P.tCrouch, P.tRise); h = lerp(P.hCrouch, P.hSet, smooth01(s)); H = P.nSteps > 0 ? P.Hstop : recon(smooth01(s)); stage = "RISE"; }   // a drift below one shuffle step is recovered while rising onto the feet (a weight shift), never at the SET cut
  // REPOSITION: standing, shuffle steps back toward the simulation root — the pelvis advances one step length per support-foot change
  else if (t < P.tRepo) { const k = Math.min(P.nSteps - 1, Math.floor((t - P.tRise) / Rp.stepT)); s = clamp01((t - P.tRise - k * Rp.stepT) / Rp.stepT); H = recon((k + smooth01(s)) / P.nSteps); h = P.hSet - Rp.bob * Math.sin(Math.PI * s); stage = "REPOSITION"; step = k; }
  else { s = 1; h = P.hSet; H = P.root; stage = "SET"; }
  return { h, H, stage, s, step };
}
// ── main evaluation ───────────────────────────────────────────────────────────────────────────────────────────────────
// which anatomical side is against the pitch, from the solved skeleton (not from the save direction, facing or screen side)
function gkLandedSide(skel, fk) {
  const J = (n) => fk.joint[skel.byName[n].idx], T = (n) => fk.tip[skel.byName[n].idx];
  const shL = J("upperArm_L")[1], shR = J("upperArm_R")[1], hipL = J("thigh_L")[1], hipR = J("thigh_R")[1], chest = J("chest")[1], pelvis = J("pelvis")[1], footL = T("foot_L")[1], footR = T("foot_R")[1];
  const lowSh = Math.min(shL, shR), lowHip = Math.min(hipL, hipR);
  if (lowSh > 0.55 && lowHip > 0.45) return "FEET";                                           // upright: nothing but the feet on the pitch
  const tilt = (shL - shR) + (hipL - hipR);                                                   // positive = the right side is lower
  if (Math.abs(tilt) < 0.12) return chest < pelvis ? "FRONT" : "BACK";
  return tilt > 0 ? "RIGHT" : "LEFT";
}
function gkGraphEvaluate(desc, clip, skel, state) {
  const c = desc.commit;
  // the SIDE (mirror of every authored shape) is frozen for the whole committed action, like the facing: the sprite resolver re-derives its
  // side from the live ball once its own clip ends, which would mirror the lying body in one tick. Recovery selection additionally
  // uses the LANDED side measured from the skeleton at the settle (state.landedSide), never the save direction.
  const sk = c ? c.commitTick : null; if (state.sideKey !== sk) { state.sideKey = sk; state.side = c ? desc.side : null; state.landedSide = null; }
  const sideL = c ? state.side === "LEFT" : desc.side === "LEFT";
  // MOTION SELECTION (gk_motion_library.js): deterministic from the frozen classification; FAR_DIVE keeps the v6 key chain exactly
  const mk = c ? c.commitTick : null; if (state.motionKey !== mk) { state.motionKey = mk; state.motionSel = c ? gkSelectMotion(desc) : { key: null, motion: null }; }   // the motion is chosen ONCE at the commit (a later leg contact must not re-select mid-action)
  const sel = state.motionSel, mkey = sel.key, mo = sel.motion; const hs = skel.H / GK_MOTION_H_REF;
  const preKeys = mkey === "LOW_DIVE" ? clip.pre.filter(k => k[0] <= GK_GRAPH.toeOff + 1e-6).concat(mo.preTail) : clip.pre;
  const named = { set: clip.set, setLow: clip.setLow, reach: preKeys[preKeys.length - 1][1], load: clip.pre[0][1], readyUp: GK_MOTIONS.READY_UP };
  const HS = (q) => { q._pelvis = V3.scale(q._pelvis || [0, 0, 0], hs); return q; };                                        // authored pelvis offsets are metres @ H_REF → proportional to this skeleton
  const M = (p) => HS(sideL ? poseMirrorP(p) : Object.assign({}, p, poseMeta(p)));
  const dive = !!c && (mkey === "FAR_DIVE" || mkey === "LOW_DIVE");                                                          // a CAUGHT ball no longer leaves the dive lifecycle: the body lands holding it
  let pose, phase = "SET", sub = null, clipT = null, ikW = 0, authored = true, mode = "set", locks = { R: 0, L: 0 }, brace = null, landing = null;
  // the presentation facing is frozen for the whole committed action (the sprite resolver drops its own commit snapshot when its
  // clip ends, which would otherwise swing the lying keeper round to the live ball-tracking facing mid-recovery)
  const ck = c ? c.commitTick : null; if (state.facingKey !== ck) { state.facingKey = ck; state.facing = c ? desc.commitFacing : null; }
  let facing = c ? state.facing : desc.facing;
  let rootM = gkRootMatrix(desc.simRoot[0], desc.simRoot[1], facing, 0);
  if (state.lateralKey !== mk) { state.lateralKey = mk; const ax0 = (c && mkey === "FAR_DIVE" && GK_GRAPH.lateralRule) ? gkGraphAxis(desc, rootM, skel, false) : null; state.lateral = !!(ax0 && ax0.wSide >= 1 - 1e-6); }   // far-lateral regime: decided ONCE at the commit from the committed target's body axis (≥ sideLandHi → a side-landing lateral dive)
  let distG = null;
  if (c && desc.dist) {
    // ═══ DISTRIBUTION (v12): the simulation's release plan (desc.dist) drives a possession-graph continuation: the body starts from the pose it
    // is in when the plan starts, turns to the authoritative facing, performs the authored action keyed on the plan's own times, and ends in
    // the standing SET pose over the simulation root. The rendered ball follows an authored in-hand path that ENDS on the authoritative
    // release / drop point at the release tick; from that tick the rendered ball is the simulation ball (never held, never re-parented).
    const D = desc.dist;
    if (!state.dist || state.dist.key !== D.t0) state.dist = { key: D.t0, from: state.lastPose ? Object.assign({}, state.lastPose, poseMeta(state.lastPose)) : M(clip.set), fromFacing: facing, ball0: state.lastBallPres ? state.lastBallPres.slice() : (desc.ball ? glW(desc.ball) : null), startPhase: state.lastPhase || null,
      startDown: !!(state.lastMode === "post" && !(state.lastPhase === "SET" || state.lastPhase === "REPOSITION" || state.lastPhase === "RISE" || state.lastPhase === "CROUCH")),   // the plan started while the body was still on the ground / getting up (exposed: the simulation's secure time ran out before the presentation was standing)
      v0: state.pelVel ? state.pelVel.slice() : [0, 0, 0], W0: state.lastWrists ? { R: state.lastWrists.R.slice(), L: state.lastWrists.L.slice() } : null, E0: state.lastElbows ? { R: state.lastElbows.R.slice(), L: state.lastElbows.L.slice() } : null, assist0: state.lastAssist || null };
    const DS = state.dist, sel = gkSelectDistribution(D), dm = sel.motion, mirror = sel.mirror, rB = GK_GRAPH.ballVisR;
    const MD = (p) => HS(mirror ? poseMirrorP(p) : Object.assign({}, p, poseMeta(p)));
    const wrapA = (a) => Math.atan2(Math.sin(a), Math.cos(a));
    const prepT = Math.max(1e-3, D.tRelease - D.t0), turnT = Math.max(0.15, (dm ? dm.turnFrac : 0.3) * prepT);
    const kTurn = smooth01(clamp01((desc.now - D.t0) / turnT));                                 // the body turns to the authoritative facing over the first part of the preparation (the simulation facing is already there)
    facing = DS.fromFacing + wrapA(D.facing - DS.fromFacing) * kTurn; rootM = gkRootMatrix(desc.simRoot[0], desc.simRoot[1], facing, 0);
    const invR = M4.invertRigid(rootM), lift = (P) => [P[0], Math.max(P[1], rB), P[2]];       // rendered ball centre never below its own radius (a ball ON the pitch: simulation z 0 = ground rest)
    const isPunt = D.kind === "PUNT"; let seg, x;
    if (desc.now < D.tRelease - 1e-9) { seg = "prep"; x = clamp01((desc.now - D.t0) / prepT); }
    else if (isPunt && !D.kicked) { seg = "fall"; x = clamp01((desc.now - D.tDrop) / Math.max(1e-3, D.tKick - D.tDrop)); }   // the ball's own free fall (keyed on the predicted kick time; the kick fires on the ball itself)
    else { const tK = isPunt ? (D.tKickActual != null ? D.tKickActual : D.tKick) : D.tRelease; seg = "post"; x = clamp01((desc.now - tK) / Math.max(1e-3, D.tEnd - tK)); }
    const aux = (k, sx) => ({ ball: k._ball ? [k._ball[0] * (mirror ? -1 : 1) * hs, k._ball[1] * hs, k._ball[2] * hs] : null, hands: mirror ? [k._hL != null ? k._hL : 0, k._hR != null ? k._hR : 0, 0] : [k._hR != null ? k._hR : 0, k._hL != null ? k._hL : 0, 0], palm: k._palm ? [k._palm[0] * (mirror ? -1 : 1), k._palm[1], k._palm[2]] : [0, 1, 0] });   // _palm: the direction from the supporting wrist to the ball centre (a ball resting ON the palm), character frame
    let hands = [0, 0], ballC = null, handAnchor = null, kick = null, palmC = [0, 1, 0];
    if (dm) {
      const lastOf = (list) => list[list.length - 1][1];
      const named = { set: M(clip.set), readyUp: M(GK_MOTIONS.READY_UP) };
      const res = (k) => typeof k === "string" ? named[k] : MD(k);
      if (seg === "prep") {
        const keys = [[0, DS.from]].concat(dm.prep.map(([u, k]) => [u, res(k)]));
        pose = gkSampleKeys(keys, x, {}); sub = pose._name;
        // rendered ball path: captured start → authored keys, the whole path shifted (linearly in u) so that it ends EXACTLY on the authoritative release / drop point
        const relC = M4.transformPoint(invR, lift(glW(D.release))), b0 = DS.ball0 ? M4.transformPoint(invR, DS.ball0) : relC;
        const aLast = aux(lastOf(dm.prep)).ball, delta = aLast ? V3.sub(relC, aLast) : [0, 0, 0];
        const bk = [[0, { ball: b0, hands: [1, 1, 0], palm: aux(dm.prep[0][1]).palm }]].concat(dm.prep.map(([u, k]) => { const a = aux(k); return [u, { ball: a.ball ? V3.add(a.ball, V3.scale(delta, u)) : relC, hands: a.hands, palm: a.palm }]; }));
        const sa = gkSampleKeys(bk, x, {}); ballC = x >= 1 ? relC : sa.ball; hands = [clamp01(sa.hands[0]), clamp01(sa.hands[1])]; palmC = V3.len(sa.palm) > 1e-3 ? V3.norm(sa.palm) : [0, 1, 0]; DS.lastPalm = palmC.slice();
        if (dm.handRelease) { const hr = dm.handRelease, hi = (mirror ? (hr.hand === "L" ? "R" : "L") : hr.hand) === "R" ? 0 : 1; hands[hi] = 1 - smooth01(clamp01((x - hr.from) / Math.max(1e-6, hr.to - hr.from))); }   // one-hand actions: the supporting hand leaves the ball over an explicit window (before the ball swings away from it)
        DS.lastHands = hands.slice();
      } else if (seg === "fall") {
        const keys = [[0, res(lastOf(dm.prep))]].concat(dm.fall.map(([u, k]) => [u, res(k)]));
        pose = gkSampleKeys(keys, x, {}); sub = pose._name;
        const kOff = 1 - smooth01(clamp01((desc.now - D.tDrop) / (dm.handsOff || 0.12))); hands = [(DS.lastHands ? DS.lastHands[0] : 1) * kOff, (DS.lastHands ? DS.lastHands[1] : 1) * kOff]; handAnchor = lift(glW(D.drop)); palmC = DS.lastPalm || palmC;
      } else {
        const prevLast = isPunt ? (dm.fall ? lastOf(dm.fall) : lastOf(dm.prep)) : lastOf(dm.prep);
        const keys = [[0, res(prevLast)]].concat(dm.post.map(([u, k]) => [u, res(k)]));
        pose = gkSampleKeys(keys, x, {}); sub = pose._name;
        const tRel = isPunt ? D.tDrop : D.tRelease, kOff = 1 - smooth01(clamp01((desc.now - tRel) / (dm.handsOff || 0.12)));
        hands = [(DS.lastHands ? DS.lastHands[0] : 1) * kOff, (DS.lastHands ? DS.lastHands[1] : 1) * kOff]; handAnchor = lift(glW(isPunt ? D.drop : D.release)); palmC = DS.lastPalm || palmC;   // the hands come off the ball where it was released (a static anchor: never the flying ball)
      }
      if (isPunt && (seg === "fall" || seg === "post")) {                                    // the kicking leg: solved onto the FALLING simulation ball toward the (predicted) kick tick, held on the actual kick point briefly after the kick
        const foot = mirror ? "L" : "R";
        if (!D.kicked) { const w = seg === "fall" ? smooth01(clamp01((x - 0.40) / 0.60)) : 1; kick = { foot, p: desc.ball ? lift(glW(desc.ball)) : lift(glW(D.kickP)), w, live: true }; }
        else { const w = 1 - smooth01(clamp01((desc.now - (D.tKickActual != null ? D.tKickActual : D.tKick)) / 0.12)); if (w > 0) kick = { foot, p: lift(glW(D.kickActual || D.kickP)), w, live: false }; }
      }
    } else { pose = DS.from; sub = "UNAUTHORED"; authored = false; }
    { const tau = 0.08, dt0 = desc.now - D.t0 + 1 / 60, v0 = DS.v0 || [0, 0, 0]; if (V3.len(v0) > 0.05) { const fade = seg === "post" ? 1 - smooth01(x) : 1; const offW = V3.scale(v0, tau * (1 - Math.exp(-dt0 / tau)) * fade); const offC = M4.transformDir(invR, offW); pose._pelvis = V3.add(pose._pelvis || [0, 0, 0], offC); } }   // momentum-continuous start: the pelvis velocity the body had when the plan started decays over ~80 ms instead of stopping dead (a plan can start mid-step after a get-up); the resulting displacement is kept through the action and eased out over the follow-through (the body ends over the root)
    phase = seg === "prep" ? "DIST_PREP" : seg === "fall" ? "DIST_FALL" : "DIST_FOLLOW"; clipT = x; mode = "dist"; ikW = 0;
    // feet: world-fixed plants; explicit steps at the authored times (character-frame points → planted once in world space), otherwise the stance under the root; a turn re-plants a foot only when its plant has moved > 0.18 m from where the stance now wants it (one foot at a time)
    { const pts = {}, keep = {}, hsp = hs; const stepsDone = {};
      const stepList = dm && dm.steps ? dm.steps : []; const segIdx = { prep: 0, fall: 1, post: 2 }, curIdx = segIdx[seg];
      for (const st of stepList) { const si = segIdx[st.phase]; if (si == null) continue; if (si < curIdx || (si === curIdx && st.at <= x + 1e-9)) stepsDone[mirror ? (st.foot === "R" ? "L" : "R") : st.foot] = st; }
      const kickFoot = (isPunt && dm) ? (mirror ? "L" : "R") : null; let kickFree = false;
      if (kickFoot && dm.kickFree) { const ki = segIdx[dm.kickFree.from]; kickFree = (curIdx > ki || (curIdx === ki && x >= dm.kickFree.at)) && !(stepsDone[kickFoot] && stepsDone[kickFoot].phase === "post"); }
      const stepping = (sd) => { const st = state.feet && state.feet[sd]; return !!(st && st.from && st.fromT != null && desc.now - st.fromT < 0.2); };
      locks = { R: 1, L: 1, at: "dist", pts, keep, keepAge: true };                                // a re-plant inside a plan keeps the bend-plane age (no knee-plane reset when a foot moves from a get-up step point to its stance point)
      for (const sd of ["R", "L"]) {
        if (sd === kickFoot && kickFree) { locks[sd] = 0; continue; }
        const st = state.feet && state.feet[sd]; const s2 = stepsDone[sd]; const mx = s2 ? (mirror ? -s2.pt[0] : s2.pt[0]) : (sd === "R" ? 0.20 : -0.20);   // explicit steps are authored for the RIGHT convention; mirrored with the motion
        const want = [mx * hsp, (s2 ? s2.pt[1] : 0.02) * hsp], wantW = M4.transformPoint(rootM, [want[0], 0.06 * skel.H, want[1]]);
        const thresh = s2 ? 0.10 : 0.18;
        if (!st || !st.P || !st.locked) pts[sd] = want; else if (V3.dist(st.P, wantW) > thresh && !stepping(sd === "R" ? "L" : "R")) pts[sd] = want; else keep[sd] = true;
      }
    }
    distG = { kind: D.kind, seg, x, hands: { R: hands[0], L: hands[1] }, ballW: ballC ? M4.transformPoint(rootM, ballC) : null, handAnchor, kick, mirror, palmW: V3.norm(M4.transformDir(rootM, palmC)), motion: dm ? dm.id : null, released: !!D.released, kicked: !!D.kicked, startDown: DS.startDown, startPhase: DS.startPhase, facingTurn: kTurn, release: lift(glW(D.release)), kIn: smooth01(clamp01((desc.now - D.t0) / 0.12)), W0: DS.W0, E0: DS.E0, ball0W: DS.ball0, assist0: DS.assist0 };
    state.endPose = pose;
  } else if (!c) {
    if (desc.shot && desc.shot.latency > 0) {                                                  // READ / PREPARE: react → weight shift → deep load inside the reaction latency
      const a = clamp01(desc.shot.tSince / desc.shot.latency); clipT = a;
      const predSideL = desc.predLat != null ? desc.predLat < 0 : false, known = desc.predLat != null;
      let p = gkSampleKeys(clip.anticipation, known ? a : Math.min(a, 0.30), named);
      const pSide = HS(predSideL ? poseMirrorP(p) : Object.assign({}, p, poseMeta(p)));
      const kSide = known ? smooth01((Math.abs(desc.predLat) - GK_GRAPH.antSymLat[0]) / (GK_GRAPH.antSymLat[1] - GK_GRAPH.antSymLat[0])) : 0;   // a central ball: no side load, a symmetric ready crouch
      const kUp = (known && desc.predZ != null) ? smooth01((desc.predZ - GK_GRAPH.antUpZ[0]) / (GK_GRAPH.antUpZ[1] - GK_GRAPH.antUpZ[0])) : 0;   // predicted crossing height: a catch-height ball is met UPRIGHT (sprite ready), a ground ball with the crouch
      const symP = kSide >= 1 ? null : poseLerpP(gkSampleKeys([[0, "setLow"], [1, GK_MOTIONS.READY]], a, { setLow: M(clip.setLow) }), poseLerpP(M(clip.set), M(GK_MOTIONS.READY_UP), smooth01(a)), kUp);
      pose = kSide >= 1 ? pSide : poseLerpP(symP, pSide, kSide);
      phase = a < 0.30 ? "READ" : kSide < 0.5 ? (desc.prepared ? "PREPARE" : "READY") : a < 0.65 ? "WEIGHT_SHIFT" : (desc.prepared ? "PREPARE" : "LOAD"); sub = pose._name; mode = "anticipation";
      locks = { R: 1, L: 1 };
    } else if (desc.windup != null) {                                                          // the striker's visible wind-up: drop into the set crouch (symmetric)
      const w = smooth01(desc.windup); pose = poseLerpP(M(clip.set), M(clip.setLow), w); phase = "SET_CROUCH"; sub = pose._name; mode = "setlow"; clipT = w; locks = { R: 1, L: 1 };
    } else if (desc.gkState === "BALL_AT_FEET") { pose = M(GK_MOTIONS.READY_UP); phase = "BALL_AT_FEET"; mode = "set"; locks = { R: 1, L: 1 }; }   // after a put-down: upright, balanced over the ball at his feet (the simulation holds him there facing it), not the keeper's set crouch
    else { pose = M(clip.set); phase = desc.state; mode = "set"; locks = { R: 1, L: 1 }; }
  } else if ((desc.now < desc.endT && state.postT0 == null && !(dive && state.launch && desc.now >= state.launch.tE - 1e-6)) || (!state.plan && !dive && mo && mo.kind !== "spread" && !desc.contact && !desc.held)) {   // a spread block never waits: its momentum carries the body to the ground whether or not the ball arrives   // a dive's execution ends at the planned arrival (launch.tE) even when a contact extends endT: the landing plan owns the pelvis from there   // commit → full extension; non-dive motions WAIT at the target (u = 1) until the ball arrives; the post phase is ONE-WAY (a late contact that moves endT never re-enters the execution)
    const u = clamp01(desc.u); clipT = u;
    if (desc.now >= desc.endT) phase = "WAIT";
    if (dive) {
      pose = M(gkSampleKeys(preKeys, u, named)); mode = "pre";
      phase = u < 0.10 ? "LOAD" : u < 0.19 ? "PLANT" : u < 0.27 ? "PUSH_OFF" : u < 0.34 ? "TOE_OFF" : (desc.contact && desc.contact.tickT >= c.t0 - 1e-3 ? "CONTACT" : (u < 0.55 ? "EARLY_FLIGHT" : u < 0.8 ? "MID_FLIGHT" : "FULL_EXTENSION")); sub = pose._name;
      locks = { reach: 1 - smooth01(clamp01((u - 0.40) / 0.10)), other: 1 - smooth01(clamp01((u - 0.14) / (0.22 - 0.14))) };   // plant foot held until the leg is fully extended (reach cap in the solve) — the toe leaves the pitch when the arc takes the hip out of reach; the other foot unloads during the push
    } else if (mo && mo.kind === "collapse") {                                                 // LOW_COLLAPSE: fold down onto the hip toward the ball, hands go down together
      pose = M(gkSampleKeys(mo.keys, u, named)); mode = "collapse"; phase = u < 0.35 ? "LOAD" : u < 0.7 ? "DROP" : "GROUND"; sub = pose._name;
      locks = { other: 1 - smooth01(clamp01((u - 0.55) / 0.2)), reach: 1 - smooth01(clamp01((u - 0.30) / 0.2)) };
      state.endPose = pose;
    } else if (mo && mo.kind === "spread") {                                                   // FOOT_SAVE (spread block): COM drops, hips open, both legs spread; the saving leg is free for the leg-tip IK, the far foot STEPS OUT to a wide plant
      pose = M(gkSampleKeys(mo.keys, u, named)); mode = "spread"; phase = (desc.contact && desc.contact.tickT >= c.t0 - 1e-3) ? "BLOCK" : u < 0.30 ? "DROP_LOAD" : u < 0.60 ? "HIP_OPEN" : "SPREAD"; sub = pose._name;
      const oSide = sideL ? "R" : "L", hsp = skel.H / GK_MOTION_H_REF;
      const pp = pose._pelvis || [0, 0, 0];
      locks = u >= 0.25 ? { other: 1, reach: 0, at: "spread", fixed: true, pts: { [oSide]: [pp[0] + (oSide === "R" ? 1 : -1) * mo.stepOut * hsp, pp[2] + 0.02] } } : { other: 1, reach: 0 }; state.endPose = pose;   // ONE step out to a wide point beside the pelvis, planted in world space once (fixed: the simulation root keeps sliding toward the ball; the planted foot must not chase it)
    } else if (mo && (mo.kind === "standing" || mo.kind === "catch")) {                       // catch group (NEAR_BODY / CHEST_CATCH / HIGH_CATCH / GATHER): feet planted (one step out for the near-body reach); brace → arms receive
      pose = M(gkSampleKeys(mo.keys, u, named)); mode = "standing"; phase = mo.kind === "catch" ? ((desc.contact && desc.contact.tickT >= c.t0 - 1e-3) ? "CONTACT" : u < 0.45 ? "BRACE" : "RECEIVE") : mkey; sub = pose._name;
      if (mkey === "HIGH_CATCH") { const launch = desc.cls && desc.cls.expr ? desc.cls.expr.launch : clamp01((c.target[2] - 1.12 * skel.H) / (0.30 * skel.H)); pose._pelvis[1] += mo.jumpM * hs * launch * smooth01(clamp01((u - 0.45) / 0.55)); state.jump = launch; }   // launch demand: the simulation's expression, else the target height above the standing overhead reach → toe rise / small jump
      locks = mkey === "NEAR_BODY" ? { other: 1, reach: 1, stepOut: mo.stepOut } : { R: 1, L: 1 }; state.endPose = pose;
    } else { pose = M(clip.set); phase = desc.family || "REACH"; authored = false; mode = "procedural"; }
    ikW = u >= GK_GRAPH.loadPhase ? clamp01((u - GK_GRAPH.loadPhase) / (1 - GK_GRAPH.loadPhase)) : 0;
    if (desc.contact && desc.contact.tickT >= c.t0 - 1e-3) ikW = 1;
    if (!authored) ikW = 1;
    if (mo && mo.kind === "spread") ikW = 0;                                                   // a leg save: the hands balance, the LEG meets the ball
    if (phase === "WAIT" && sub == null) sub = "WAIT";
  } else {                                                                                     // after endT: landing physics + shapes → get-up → SET
    const tl = Math.max(0, desc.now - (state.postT0 != null ? state.postT0 : desc.endT)); clipT = tl; if (state.postT0 == null) state.postT0 = desc.endT;   // post time runs from the FIRST post tick (a contact that moves endT later does not restart it)
    if (dive || (mo && (mo.kind === "collapse" || mo.kind === "spread"))) { mode = "post"; }
    else if (mo && (mo.kind === "standing" || mo.kind === "catch")) {
      const endP = M(mo.keys[mo.keys.length - 1][1]);
      if (desc.held && mo.cradle) {                                                             // possession lifecycle (sprite catch language): CRADLE closes → ABSORB (arms yield) → CONTROL → STRAIGHTEN (knees / hips / spine extend) → HOLD (upright, stable)
        const t1 = mo.cradleT, t2 = t1 + mo.absorbT, t3 = t2 + mo.controlT, t4 = t3 + mo.straightenT;
        pose = gkSampleKeys([[0, endP], [t1, M(mo.cradle)], [t2, M(mo.absorb)], [t3, M(mo.absorb)], [t4, M(mo.hold)]], tl, {});
        phase = tl < t1 ? "CRADLE" : tl < t2 ? "ABSORB" : tl < t3 ? "CONTROL" : tl < t4 ? "STRAIGHTEN" : "HOLD"; sub = pose._name; state.catchPost = { t1, t2, t3, t4 };
      }
      else if (desc.held) { pose = poseLerpP(endP, M(mo.hold), smooth01(tl / GK_GRAPH.holdBlend)); phase = "HOLD"; sub = mo.hold.name; }
      else { pose = poseLerpP(endP, M(clip.set), smooth01(tl / mo.riseT)); phase = tl < mo.riseT ? "RISE" : "SET"; sub = phase; }
      if (mkey === "HIGH_CATCH" && state.jump) pose._pelvis[1] += mo.jumpM * hs * state.jump * (1 - smooth01(clamp01(tl / 0.30)));   // the jump carries into the post and lands over 0.30 s (the executing branch raised the pelvis by the launch demand; dropping it at the post cut was a 6–11 m/s pop)
      mode = "standing-post"; locks = { R: 1, L: 1, at: "stance" };
    }
    else { pose = M(clip.set); phase = tl < 0.4 ? "RISE" : "SET"; authored = false; mode = "procedural"; }
    ikW = desc.held ? 1 : Math.max(0, 1 - tl / GK_GRAPH.ikFadePost);
    if (state.lateral && !desc.held && state.plan && state.plan.launch) { const tf = Math.max(0.12, state.plan.tImpact - state.plan.launch.tE); ikW *= 1 - smooth01(clamp01(tl / tf)); }   // far-lateral regime: the reach is over at the execution end — the glove IK is out by the IMPACT stage (an arm still pulled toward a target 1–2 m away while the body lands folded the elbow to its limit and flipped its bend plane); the authored landing keys place the arm (bridge / brace)
    if (mo && mo.kind === "spread") ikW = 0;
  }
  const g = { pose, phase, sub, clipT, ikW, rootM, facing, authored, mode, motion: mkey, fallback: !!sel.fallback, side: c ? state.side : desc.side, landedSide: state.landedSide || null, reachHand: sideL ? "L" : "R", axis: null, locks, brace, landing: null, flight: null, pres: { dx: 0, dy: 0, dm: 0 },
    holdBall: (c && desc.held && desc.ball) ? desc.ball : null, holdW: 0, catchKind: !!(mo && mo.kind === "catch"), ballR: GK_GRAPH.ballVisR,   // the PHYSICAL ball (0.11 m) regardless of the character's height (the old × H/1.90 was a morphology-dependent ball-size defect)                                                          // a caught ball: both hands stay on the authoritative ball
    twoHands: !!(mo && (mo.twoHands || (mo.twoHandsLat != null && desc.cls && Math.abs(desc.cls.lat) <= mo.twoHandsLat))),
    legTip: null, dist: distG };
  if (distG) { g.holdBall = null; g.holdW = 0; state.holdT0 = null; state.holdLast = null; }   // a distribution owns the rendered ball and the hands (the hold / cradle paths are off)
  { if (g.holdBall) { if (state.holdT0 == null) state.holdT0 = desc.now; state.holdLast = { p: g.holdBall.slice(), t: desc.now }; g.holdW = smooth01(clamp01((desc.now - state.holdT0) / 0.12)); }
    else { if (c && state.holdLast && desc.now - state.holdLast.t < 0.15) { g.holdBall = state.holdLast.p; g.holdW = 1 - smooth01((desc.now - state.holdLast.t) / 0.15); } else state.holdLast = null; if (!c || !desc.held) state.holdT0 = null; } }   // hands onto / off the ball: faded, never a snap
  { const legMotion = !!(mo && (mo.kind === "spread" || mo.kind === "collapse"));                                              // FOOT_SAVE / LOW_COLLAPSE: the leg meets the simulation's leg tip (same side of the hip as the authored leg). NOT the low dive: its authored trailing leg lies on the opposite side of the hip from the simulation's leg-tip model — chasing that tip swept the leg through the hip (documented); a leg-volume contact in a low dive is shown on the authored leg and the mismatch is exposed
    // the simulation clears its leg tip at execEnd: keep the last one for the fade-out (no leg snap at the landing)
    if (c && legMotion && desc.legTip) state.legTipLast = desc.legTip.slice(); if (!c) state.legTipLast = null;
    const tip = desc.legTip || (legMotion ? state.legTipLast : null);
    if (c && legMotion && tip) g.legTip = { p: tip, w: smooth01(clamp01((desc.u == null ? 1 : desc.u) / 0.5)) }; }
  if (g.legTip && mode === "post") g.legTip.w = 1 - smooth01(clamp01(clipT / 0.25));                                       // collapse landing: the extended leg folds back over the impact, never snaps
  const pelOff = skel.byName.pelvis.off, invRoot = M4.invertRigid(rootM);
  const worldPelvis = (p) => M4.transformPoint(rootM, V3.add(pelOff, p._pelvis || [0, 0, 0]));
  const setPelvisWorld = (p, W) => { p._pelvis = V3.sub(M4.transformPoint(invRoot, W), pelOff); };
  if (c && authored && (dive || (mo && (mo.kind === "collapse" || mo.kind === "spread")))) {
    const axis = dive ? gkGraphAxis(desc, rootM, skel, mkey === "LOW_DIVE") : null; g.axis = axis; const rollMax = mo ? mo.rollMax : null;
    if (mode === "pre") {
      g.poseRaw = g.pose; g.pose = GK_GRAPH.dbg.noRedirect ? (function () { const q = Object.assign({}, g.pose); q._pelvis = V3.scale(g.pose._pelvis || [0, 0, 0], 1); return q; })() : gkGraphRedirect(g.pose, axis, clipT, rollMax, state.lateral); state.plan = null;
      // launch plan at the plant: from here the pelvis follows ONE planned trajectory (push → toe-off → arc through the solved
      // full-extension pelvis at execEnd → on through contact). Before the plant the authored crouch + the simulation root move it.
      if (!state.launch && clipT >= GK_GRAPH.plantU) {
        const W0 = worldPelvis(g.pose), pv = state.prevPel, v0 = pv && desc.now - pv.t > 1e-4 && desc.now - pv.t < 0.1 ? V3.scale(V3.sub(W0, pv.W), 1 / (desc.now - pv.t)) : [0, 0, 0];
        const rootMEnd = gkRootMatrix(c.rootEnd ? c.rootEnd[0] : desc.simRoot[0], c.rootEnd ? c.rootEnd[1] : desc.simRoot[1], facing, 0), axisEnd = gkGraphAxis(desc, rootMEnd, skel, mkey === "LOW_DIVE");
        state.launch = gkLaunchPlan(axisEnd, rootMEnd, W0, v0, desc.now, c.t0 + GK_GRAPH.toeOff * c.execTime, c.t0 + c.execTime, 0.50 * skel.H + GK_GRAPH.jumpMaxM * ((desc.cls && desc.cls.expr) ? desc.cls.expr.launch : 1));
      }
      g.poseRedirected = Object.assign({}, g.pose, { _pelvis: (g.pose._pelvis || [0, 0, 0]).slice() });
      if (state.lateral && !GK_GRAPH.dbg.noArmClear) gkLateralArmClear(g.pose, sideL);
      if (state.launch && !GK_GRAPH.dbg.noLaunch) { const St = gkLaunchState(state.launch, desc.now); setPelvisWorld(g.pose, St.W); g.flight = St; }
      state.endPose = g.pose; state.endAxis = axis;
    }
    else if (mode === "post") {
      const endPose = state.endPose || (dive ? gkGraphRedirect(M(gkSampleKeys(preKeys, 1, named)), axis, 1, rollMax, state.lateral) : M(mo.keys[mo.keys.length - 1][1])), ax = state.endAxis || axis;
      if (dive && !state.launch) { const W0 = worldPelvis(endPose); state.launch = gkLaunchPlan(ax, rootM, W0, [0, 0, 0], desc.now - 0.30, desc.now - 0.20, desc.now, 0.50 * skel.H + GK_GRAPH.jumpMaxM * ((desc.cls && desc.cls.expr) ? desc.cls.expr.launch : 1)); }   // fallback (no plant tick was evaluated): a short arc from where the body is
      if (!state.plan) {
        let opt = null;
        if (mo && mo.kind === "spread") {                                                      // spread block: the body commits onto the saving hip — absorb (velocity-continuous descent + a little lateral travel), side-sit, then the chain from the half-kneel
          const W0 = worldPelvis(endPose), pv = state.prevPel, v0y = pv && desc.now - pv.t > 1e-4 && desc.now - pv.t < 0.1 ? (W0[1] - pv.W[1]) / (desc.now - pv.t) : 0;
          const sg = sideL ? -1 : 1, hsp = skel.H / GK_MOTION_H_REF, ux = [rootM[0] * sg, rootM[2] * sg], ul = Math.hypot(ux[0], ux[1]) || 1;
          opt = { absorbT: mo.absorbT, hold: mo.hold, hGround: 0.50 * skel.H + mo.ground._pelvis[1] * hsp, v0y: Math.min(0, v0y), dir: [ux[0] / ul, ux[1] / ul], travel: mo.travel * hsp };
        }
        state.plan = dive ? gkLandingPlan(skel, clip, state.launch, ax, rootM, desc.held, state.lateral) : gkGroundPlan(skel, clip, worldPelvis(endPose), rootM, desc.now, opt);
      }
      const plan = state.plan, L = gkLandingState(plan, desc.now); g.landing = { plan, L };
      const PF = clip.postFeet, PS = clip.postSide, w = plan.w;
      // recovery mirror: from the settle on, the side the body actually lies on (measured at the settle); the landing chain keeps the
      // dive-side mirror it flew with. A mismatch is reported (state.recoveryMismatch) — there is no separately authored branch for it yet
      const recovering = !(L.stage === "FOLLOW" || L.stage === "DESCENT" || L.stage === "IMPACT" || L.stage === "ABSORB");
      const recL = recovering && (state.landedSide === "LEFT" || state.landedSide === "RIGHT") ? state.landedSide === "LEFT" : sideL;
      state.recoveryMismatch = recovering && (state.landedSide === "LEFT" || state.landedSide === "RIGHT") && recL !== sideL;
      const MR = (p) => recL ? poseMirrorP(p) : Object.assign({}, p, poseMeta(p));
      const K = (name) => poseLerpP(MR(PF[name]), MR(PS[name]), w);                            // landing style blend (feet ↔ side) by the body-axis angle
      const setP = M(clip.set), GP = plan.spread && mo && mo.ground ? M(mo.ground) : null; let shape;
      if (GP && L.stage === "ABSORB") shape = poseLerpP(endPose, GP, smooth01(L.s));            // spread block: the body goes down onto the saving hip from the block pose
      else if (GP && (L.stage === "SETTLE" || L.stage === "BRACE" || L.stage === "PUSH_UP")) shape = GP;   // side-sit (hand braced) — no lying settle, no push-up stage (zero duration)
      else if (GP && L.stage === "HALF_KNEEL") shape = gkSampleKeys([[0, GP], [1, K("HALF_KNEEL")]], smooth01(Math.min(1, L.s / 0.6)), {});   // the extended leg folds under into the kneel, the far foot steps in front
      else if (L.stage === "FOLLOW" || L.stage === "DESCENT") shape = gkSampleKeys([[0, endPose], [GK_GRAPH.feet.followFrac, K("FOLLOW")], [0.78, K("DESCENT")], [1, K("TOUCH")]], L.s, {});
      else if (plan.arrivedLow && (L.stage === "IMPACT" || L.stage === "ABSORB")) shape = gkSampleKeys([[0, endPose], [0.3, K("IMPACT")], [0.65, K("ABSORB")], [1, K("SETTLE")]], clamp01((desc.now - plan.tTouch) / Math.max(1e-6, plan.tAbsorb - plan.tTouch)), {});   // a low arrival folds from the flight pose itself, over the whole impact + absorb time
      else if (L.stage === "IMPACT") shape = gkSampleKeys([[0, K("TOUCH")], [1, K("IMPACT")]], smooth01(L.s), {});
      else if (L.stage === "ABSORB") shape = gkSampleKeys([[0, K("IMPACT")], [0.55, K("ABSORB")], [1, K("SETTLE")]], L.s, {});
      else if (L.stage === "SETTLE") shape = plan.ground ? poseLerpP(endPose, K("SETTLE"), smooth01(L.s)) : K("SETTLE");
      else if (L.stage === "BRACE") shape = gkSampleKeys([[0, K("SETTLE")], [1, K("BRACE")]], smooth01(L.s), {});
      else if (L.stage === "PUSH_UP") shape = gkSampleKeys([[0, K("BRACE")], [1, K("PUSH_UP")]], smooth01(L.s), {});
      else if (L.stage === "HALF_KNEEL") shape = gkSampleKeys([[0, K("PUSH_UP")], [1, K("HALF_KNEEL")]], smooth01(Math.min(1, L.s / 0.6)), {});
      else if (L.stage === "CROUCH") shape = gkSampleKeys([[0, K("HALF_KNEEL")], [1, K("CROUCH")]], smooth01(L.s), {});
      else if (L.stage === "RISE") shape = gkSampleKeys([[0, K("CROUCH")], [1, setP]], smooth01(L.s), {});
      else shape = setP;                                                                     // REPOSITION / SET: the standing set pose; the steps are the feet (plants) and the pelvis (landing state)
      setPelvisWorld(shape, [L.H[0], L.h, L.H[1]]);                                          // every stage's pelvis position is owned by the landing state (position- and velocity-continuous)
      if ((L.stage === "FOLLOW" || L.stage === "DESCENT") && plan.launch) g.flight = gkLaunchState(plan.launch, desc.now);
      g.pose = shape; g.phase = L.stage; g.sub = shape._name || L.stage;
      if (state.lateral && !GK_GRAPH.dbg.noArmClear) gkLateralArmClear(g.pose, sideL);   // the trailing arm's yaw is a pure function of its authored z: the same rule carries the descent / brace arm in front of the chest (the brace hand targets are ground points from the root, unchanged)
      const feetStyle = w < 0.5, R = recovering ? (recL ? "L" : "R") : g.reachHand, O = R === "R" ? "L" : "R";   // support side = the side on the pitch
      if (L.stage === "FOLLOW" || L.stage === "DESCENT") locks = { R: 0, L: 0 };
      else if (L.stage === "IMPACT") locks = feetStyle ? { R: 1, L: 1, at: "touch" } : { R: 0, L: 0 };                        // the feet stay where they landed while the momentum carries the body over them
      else if (L.stage === "ABSORB") locks = { R: 0, L: 0 };                                                                    // the body goes down onto the side and slides: the feet drag with it
      else if (L.stage === "SETTLE" || L.stage === "BRACE" || L.stage === "PUSH_UP") locks = plan.spread ? { R: 1, L: 1, at: "tuck", stay: { [R]: true } } : { R: 1, L: 1, at: "tuck" };   // spread: the extended saving foot stays where it is, the far foot tucks            // lying / bracing: feet drawn in behind the body, knees under (leg IK with a forward-up pole)
      else if (L.stage === "HALF_KNEEL") locks = { [R]: 1 - smooth01(Math.min(1, L.s / 0.6)), [O]: 1, at: "front" };   // the kneeling (save-side) foot stays on its tucked point and is released as the authored kneel takes over — no snap
      else if (L.stage === "REPOSITION") {                                                   // step k moves ONE foot (lead foot on even steps, trailing foot closes on odd) to its point beside where the pelvis will be at the end of the step
        const k = L.step, lead = plan.lead, trail = lead === "R" ? "L" : "R", mover = k % 2 === 0 ? lead : trail, f = (k + 1) / plan.nSteps;
        const Hk = [lerp(plan.Hstop[0], plan.root[0], f), lerp(plan.Hstop[1], plan.root[1], f)], pc = M4.transformPoint(invRoot, [Hk[0], 0, Hk[1]]);
        const sp = (side) => (side === "R" ? 1 : -1) * 0.20 + (side === mover && side === lead ? (lead === "R" ? 1 : -1) * 0.08 : 0);
        locks = { R: 1, L: 1, at: "step:" + k, pts: { [mover]: [pc[0] + sp(mover), pc[2] + 0.02] }, keep: { [mover === "R" ? "L" : "R"]: true } };
      }
      else locks = { R: 1, L: 1, at: "stance" };                                           // CROUCH / RISE: under the pelvis where it settled; SET: under the simulation root (the pelvis is there by then)
      g.locks = locks;
      // hands on the pitch: reaching hand from the absorb, both through settle / brace / push-up, released during the half-kneel
      const bw = (a0, a1) => clamp01((L.s - a0) / Math.max(1e-6, a1 - a0));
      if (L.stage === "ABSORB") g.brace = { [R]: smooth01(bw(0.2, 0.9)), [O]: 0 };
      else if (L.stage === "SETTLE") g.brace = { [R]: 1, [O]: smooth01(bw(0.0, 0.5)) };
      else if (L.stage === "BRACE" || L.stage === "PUSH_UP") g.brace = { R: 1, L: 1 };
      else if (L.stage === "HALF_KNEEL") g.brace = { [R]: 1 - smooth01(bw(0.3, 0.9)), [O]: 1 - smooth01(bw(0.0, 0.5)) };
      else g.brace = null;
      if (g.holdBall) g.brace = null;                                                          // both hands hold the ball: no hand brace (the get-up is knee-led)
    }
  } else if (!c) { state.endPose = null; state.endAxis = null; state.plan = null; state.launch = null; state.postT0 = null; }
  // FOOTWORK (pre-shot, the simulation root is moving): alternate foot plants by an odometer — the body never slides on planted feet
  if (!c && (mode === "set" || mode === "setlow") && (Math.hypot(desc.vel[0], desc.vel[1]) > 0.05)) {
    const FW = GK_MOTIONS.FOOTWORK, vl = M4.transformDir(M4.invertRigid(rootM), [desc.vel[0], 0, -desc.vel[1]]), sp = Math.hypot(vl[0], vl[2]);
    const lean = Math.min(FW.maxLean, sp * FW.leanDegPerMs); const pl = g.pose;                                            // lean into the travel direction (pelvis roll toward the lateral component, pitch toward the forward one)
    pl.pelvis = [(pl.pelvis ? pl.pelvis[0] : 0) + lean * (vl[2] / (sp || 1)), 0, (pl.pelvis ? pl.pelvis[2] : 0) - lean * (vl[0] / (sp || 1))];
    const pts = {}, keep = {}; const dirU = [vl[0] / (sp || 1), vl[2] / (sp || 1)];
    for (const sd of ["R", "L"]) { const st = state.feet && state.feet[sd]; const want = [(sd === "R" ? 1 : -1) * 0.20 * hs + dirU[0] * 0.18 * hs, 0.02 + dirU[1] * 0.18 * hs]; const wantW = M4.transformPoint(rootM, [want[0], 0.06 * skel.H, want[1]]);
      const other = state.feet && state.feet[sd === "R" ? "L" : "R"]; const otherStepping = other && other.from && other.fromT != null && desc.now - other.fromT < 0.2;
      if (st && st.P && V3.dist(st.P, wantW) > FW.stepLen * 0.5 * hs && !otherStepping) pts[sd] = want; else keep[sd] = true; }
    g.locks = { R: 1, L: 1, at: "walk", pts, keep }; g.phase = desc.state || "FOOTWORK"; g.mode = "footwork";
  }
  { const Wn = worldPelvis(g.pose), pv = state.prevPel; state.pelVel = pv && desc.now - pv.t > 1e-4 && desc.now - pv.t < 0.1 ? V3.scale(V3.sub(Wn, pv.W), 1 / (desc.now - pv.t)) : [0, 0, 0]; }
  state.prevPel = { t: desc.now, W: worldPelvis(g.pose) };                                    // for the launch plan's velocity continuity at the plant
  if (!distG) { state.lastPose = g.pose; state.lastPhase = g.phase; state.lastMode = g.mode; }   // the pose a distribution starts from (captured at the plan start)
  if (!desc.dist && state.dist) state.dist = null;
  return g;
}
// ── procedural pass: FK → ground clamp → torso assist → glove IK → foot locks (leg IK) → hand brace; presentation root ─
function gkGraphSolve(desc, g, skel, state) {
  const pose = g.pose, pel = skel.byName.pelvis, savedOff = pel.off.slice();
  const pd = pose._pelvis || [0, 0, 0]; pel.off = [savedOff[0] + pd[0], savedOff[1] + pd[1], savedOff[2] + pd[2]];
  const h = g.reachHand, o = h === "R" ? "L" : "R", hand = "hand_" + h, fore = "foreArm_" + h, upper = "upperArm_" + h;
  let fk = skelFK(skel, pose, g.rootM);
  const diag = { plant: null, ground: 0, torso: 0, ik: null, look: 0, feet: {}, jointLimit: null };
  const elbowLimit = () => { for (const sd of ["R", "L"]) { const up = skel.byName["upperArm_" + sd], fo = skel.byName["foreArm_" + sd], hd = skel.byName["hand_" + sd]; const S0 = fk.joint[up.idx], E0 = fk.joint[fo.idx], W0 = fk.joint[hd.idx]; const u1 = V3.norm(V3.sub(S0, E0)), u2 = V3.norm(V3.sub(W0, E0)); const ang = Math.acos(Math.max(-1, Math.min(1, V3.dot(u1, u2)))), minA = GK_IK_MIN_ELBOW_DEG * DEG;
    if (ang < minA - 1e-6) { let ax = V3.cross(u2, u1); if (V3.len(ax) < 1e-6) ax = V3.cross(u1, Math.abs(u1[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0]); ax = V3.norm(ax); const Rr = M4.axisAngle(ax, -(minA - ang)); const m2 = M4.mul(M4.translate(E0[0], E0[1], E0[2]), M4.mul(Rr, M4.mul(M4.translate(-E0[0], -E0[1], -E0[2]), fk.world[fo.idx]))); const dlt = M4.mul(m2, M4.invertRigid(fk.world[fo.idx])); const apply = (bn) => { fk.world[bn.idx] = M4.mul(dlt, fk.world[bn.idx]); fk.joint[bn.idx] = M4.origin(fk.world[bn.idx]); fk.tip[bn.idx] = M4.transformPoint(fk.world[bn.idx], V3.scale(bn.dir, bn.len)); for (const c2 of bn.children) apply(c2); }; apply(fo); fk.tip[up.idx] = fk.joint[fo.idx]; (diag.jointLimit || (diag.jointLimit = {}))["elbow_" + sd] = +((minA - ang) / DEG).toFixed(1); } } };   // ELBOW JOINT LIMIT (presentation): an authored key folding the elbow past its anatomical minimum is opened to that minimum in its own bend plane
  elbowLimit();
  const ankleH = skel.contact && skel.contact.foot ? skel.contact.foot.soleBelowAnkleM : 0.06 * skel.H;   // ankle height with the foot flat: measured from the finished sole (Courtois) or the test mesh's proxy
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
    let d = M4.mul(m2, M4.invertRigid(m)); const apply = (b) => { fk.world[b.idx] = M4.mul(d, fk.world[b.idx]); fk.joint[b.idx] = M4.origin(fk.world[b.idx]); fk.tip[b.idx] = M4.transformPoint(fk.world[b.idx], V3.scale(b.dir, b.len)); for (const c of b.children) apply(c); }; apply(fb);
    if (skel.contact && skel.contact.foot && w > 0) {                                        // finished boot: level the SOLE too (roll about the foot's own axis so its lateral axis is horizontal; the sole is a plane on the pitch)
      const m3 = fk.world[fb.idx], ax = V3.norm(M4.transformDir(m3, fb.dir)), lx = V3.norm(M4.transformDir(m3, [1, 0, 0])); const lp = V3.sub(lx, V3.scale(ax, V3.dot(lx, ax))); const hzx = V3.sub([0, 1, 0], V3.scale(ax, ax[1]));
      if (V3.len(lp) > 1e-4 && V3.len(hzx) > 1e-4) { const a = V3.norm(lp), upP = V3.norm(hzx); const side = V3.norm(V3.cross(upP, ax)); const ang = Math.atan2(V3.dot(V3.cross(a, side), ax), V3.dot(a, side)); if (Math.abs(ang) > 1e-5) { const R2 = M4.axisAngle(ax, ang * w), o2 = M4.origin(m3); const m4 = M4.mul(M4.translate(o2[0], o2[1], o2[2]), M4.mul(R2, M4.mul(M4.translate(-o2[0], -o2[1], -o2[2]), m3))); d = M4.mul(m4, M4.invertRigid(m3)); apply(fb); } }
    }
  };
  const fwd = M4.transformDir(g.rootM, [0, 0, 1]);
  const legMax = skel.byName.thigh_R.len + skel.byName.shin_R.len;
  if (!state.poleMem) state.poleMem = {}; const PM = (k) => state.poleMem[k] || (state.poleMem[k] = {});   // per-chain bend-plane memory (see skelIK2)
  const PMv = (k) => g.motion === "FAR_DIVE" ? null : PM(k);                                   // the approved v6 far dive is FROZEN: its solve paths (glove IK, plants, floor, brace) run without the memory (bit-identical to v6); every other motion gets it
  const reachCap = (side, Pt) => { const hip = fk.joint[skel.byName["thigh_" + side].idx]; return 1 - smooth01((V3.dist(hip, Pt) - (legMax - 0.02)) / 0.08); };   // a planted foot stays planted only while the leg can reach it: release = full extension, never a timer
  const plantFeet = () => { for (const side of ["R", "L"]) { const st = state.feet[side]; let w = clamp01(want[side] || 0); if (st && st.locked && st.releaseT != null) w = Math.max(w, 1 - smooth01((desc.now - st.releaseT) / 0.15)) * (st.releaseW != null ? st.releaseW : 1);   /* releasing: fade the hold out */ if (st && st.locked && st.P && w > 0) w = Math.min(w, reachCap(side, st.Pnow || st.P)); if (st && st.locked && st.P && w > 0) { const hip = fk.joint[skel.byName["thigh_" + side].idx]; const kj = fk.joint[skel.byName["shin_" + side].idx], knee = [kj[0], Math.max(kj[1], 0.12), kj[2]]; const age = st.since != null ? smooth01(clamp01((desc.now - st.since) / 0.2)) : 1; const pole = V3.lerp(knee, [hip[0] + fwd[0] * 0.5, hip[1] + 0.3, hip[2] + fwd[2] * 0.5], w * age);   /* knees bend forward-up, never into the pitch; a fading or fresh lock keeps the authored bend plane (no knee flip on a new plant) */ const Pt = st.Pnow || st.P; const r = skelIK2(skel, fk, "thigh_" + side, "shin_" + side, "foot_" + side, Pt, w, pole, 0, null); flattenFoot(side, w);   /* plants keep their own bend-plane blend (authored knee → forward-up by lock age): no memory here, a rate-limited plane would hold a landing knee under the pitch through a re-plant */ diag.feet[side] = { locked: w > 0.05, w: +w.toFixed(2), residual: +r.residual.toFixed(3), P: Pt }; } } };
  for (const side of ["R", "L"]) {
    const fb = skel.byName["foot_" + side], ankle = fk.joint[fb.idx]; const w = clamp01(want[side] || 0); const st = state.feet[side] || { locked: false, P: null };
    const tuckP = () => { const pl = g.landing.plan, px = (pose._pelvis ? pose._pelvis[0] : 0), pz = (pose._pelvis ? pose._pelvis[2] : 0), hs = skel.H / GK_MOTION_H_REF, bottom = side === h; return M4.transformPoint(g.rootM, [px - pl.dirSign * (bottom ? 0.42 : 0.34) * hs, ankleH, pz + (bottom ? -0.10 : 0.16) * hs]); };   // lying / brace: feet tucked behind the hips (around the CURRENT pelvis)
    const wantW = (L.pts && L.pts[side] && !(L.keep && L.keep[side])) ? M4.transformPoint(g.rootM, [L.pts[side][0], ankleH, L.pts[side][1]]) : (L.at === "tuck" && g.landing) ? tuckP() : null;   // a tucked foot follows a body that is STILL SLIDING at the settle (re-plant when its point moves > 5 cm: the foot drags with the hips, never left behind beyond the leg's reach)
    const follow = !L.fixed && wantW && st.P && st.locked && state.lockStage === stage && V3.dist(wantW, st.P) > (L.at === "tuck" ? 0.15 * (skel.H / GK_MOTION_H_REF) : 0.05);   // footwork: a step target moved; tuck: the hips slid more than 15 cm past the planted feet (a lying body still sliding at the settle) — the feet DRAG after the hips
    if (w > 0 && (!st.locked || state.lockStage !== stage || follow)) {          // (re)plant on a stage change, or when a step target moves (footwork)
      let P;
      const pc = pose._pelvis || [0, 0, 0], hs = skel.H / GK_MOTION_H_REF;                       // support points are placed around the CURRENT pelvis (character frame), proportional to the body — never around the simulation root while the body is away from it
      if (L.stay && L.stay[side]) P = [ankle[0], ankleH, ankle[2]];                            // this foot is planted where it is (an extended leg kept through the settle)
      else if (L.keep && L.keep[side] && st.P) P = st.P.slice();                               // this foot is not the mover of the step: it stays planted
      else if (L.pts && L.pts[side]) P = M4.transformPoint(g.rootM, [L.pts[side][0], ankleH, L.pts[side][1]]);
      else if (L.stepOut != null && side === h) P = M4.transformPoint(g.rootM, [(side === "R" ? 1 : -1) * (0.20 + L.stepOut) * hs, ankleH, 0.02]);   // near-body reach: one step out toward the ball
      else if (L.at === "stance" || L.stepOut != null) { const spread = (side === "R" ? 1 : -1) * 0.20 * hs; P = M4.transformPoint(g.rootM, [pc[0] + spread, ankleH, pc[2] + 0.02]); }
      else if (L.at === "front" && g.landing) { if (side === h && st.P) P = st.P.slice(); else P = M4.transformPoint(g.rootM, [pc[0] + (side === "R" ? 1 : -1) * 0.14 * hs, ankleH, pc[2] + 0.30 * hs]); }   // half-kneel: the front foot plants ahead of the hips (forward), the kneeling foot keeps its tucked point
      else if (L.at === "tuck" && g.landing) P = tuckP();
      else P = [ankle[0], ankleH, ankle[2]];
      st.from = (st.lastAnkle && st.lastT != null && desc.now - st.lastT < 0.1) ? st.lastAnkle.slice() : [ankle[0], ankle[1], ankle[2]]; st.fromT = desc.now;   // (re)plant: blend from where the foot actually was last frame (solved position) — never a foot teleport
      st.drag = !!(follow && L.at === "tuck");                                                  // a dragging foot slides (no step lift, bend plane kept)
      if (!st.drag && (!st.locked || (V3.dist(st.from, P) > 0.12 && !L.keepAge))) st.since = desc.now;         // bend plane blends from the authored knee for a NEW lock or a STEP (foot travelling from behind to under the body); a shuffle keeps its plane; a distribution re-plant keeps its age
      st.locked = true; st.P = P; st.releaseT = null;
    }
    if (st.locked && st.from && st.fromT != null) { const bt = clamp01((desc.now - st.fromT) / 0.2); st.Pnow = V3.lerp(st.from, st.P, smooth01(bt)); if (!st.drag && V3.dist(st.from, st.P) > 0.12) st.Pnow[1] += 0.10 * Math.sin(Math.PI * bt); /* a re-plant further than a shuffle is a STEP: the foot lifts over its move */ if (bt >= 1) { st.from = null; st.Pnow = st.P; } } else st.Pnow = st.P;
    if (w <= 0 && st.locked) { if (st.releaseT == null) { st.releaseT = desc.now; st.releaseW = st.lastW != null ? st.lastW : 1; } else if (desc.now - st.releaseT >= 0.15) { st.locked = false; st.releaseT = null; } }   // release = fade out, not a cut
    if (w > 0) { st.releaseT = null; st.lastW = w; }
    state.feet[side] = st;
    diag.feet[side] = { locked: false, w: 0, height: +(ankle[1] - ankleH).toFixed(3) };
  }
  state.lockStage = stage;
  plantFeet();
  // 2. ground clamp (presentation only): nothing below the pitch — lift the body by the deepest penetration, then re-plant
  // clamp on the body core and legs only: hands/forearms are placed by the brace / glove IK (a hand authored below the pitch in a
  // rolled body frame must not lift the whole body), toes are flattened with their planted foot
  const CLAMP_SKIP = { hand_R: 1, hand_L: 1, foreArm_R: 1, foreArm_L: 1, upperArm_R: 1, upperArm_L: 1, clavicle_R: 1, clavicle_L: 1, toe_R: 1, toe_L: 1 };
  // a LEG below the pitch bends at the knee (foot floored by leg IK, authored bend plane kept); only the body core lifts the pelvis —
  // the planned pelvis trajectory (push → arc → slide) must never be displaced by an authored leg poking through the ground
  const FCf = skel.contact && skel.contact.foot;                                              // finished character: the foot's lowest point is its SOLE — the boot's sole rectangle (foot-local, any foot rotation), not a capsule radius
  const soleLow = (side) => { const fb = skel.byName["foot_" + side], m = fk.world[fb.idx], sy = -FCf.soleBelowAnkleM; let lo = 1e9; for (const c of [[-0.078, sy, -0.081], [0.078, sy, -0.081], [-0.078, sy, 0.128], [0.078, sy, 0.128], [-0.06, sy + 0.02, 0.2], [0.06, sy + 0.02, 0.2]]) lo = Math.min(lo, M4.transformPoint(m, c)[1]); return lo; };
  const floored = {}; const deepest = () => { let minY = 1e9, minB = null; for (const b of skel.bones) { if (!b.part || CLAMP_SKIP[b.name]) continue; const m = /^(thigh|shin|foot)_([RL])$/.exec(b.name); if (m && floored[m[2]] >= (FCf ? 6 : 1)) continue; /* finished boot: up to three ankle lifts (a toe-down boot's corner keeps moving as the leg rotates); test mesh: one (frozen behaviour) */ const isFoot = FCf && /^foot_/.test(b.name); const v = isFoot ? soleLow(b.name.slice(-1)) : Math.min(fk.joint[b.idx][1] - b.rad * 0.6, fk.tip[b.idx][1] - b.rad * 0.6); if (v < minY) { minY = v; minB = b.name; } } return { minY, minB }; };
  const floorPass = () => { let lifted = false; for (const k in floored) delete floored[k];
  for (let pass = 0; pass < (FCf ? 14 : 6); pass++) {
    const { minY, minB } = deepest(); if (minY >= 0) break;
    const m = /^(shin|foot)_([RL])$/.exec(minB);
    if (!m && lifted) break;
    if (m) { const side = m[2], fb = skel.byName["foot_" + side], ankle = fk.joint[fb.idx], kj = fk.joint[skel.byName["shin_" + side].idx]; const Pt = [ankle[0], Math.max(ankle[1] - minY, ankleH), ankle[2]]; skelIK2(skel, fk, "thigh_" + side, "shin_" + side, "foot_" + side, Pt, 1, [kj[0], Math.max(kj[1], 0.12), kj[2]], 0, PMv("leg_" + side)); floored[side] = (floored[side] || 0) + 1; diag.legFloor = (diag.legFloor || "") + side + ":" + (-minY).toFixed(2) + " "; if (diag.feet[side]) diag.feet[side].floored = true; continue; }
    pel.off[1] -= minY; diag.ground = +(-minY).toFixed(3); diag.groundBone = minB; fk = skelFK(skel, pose, g.rootM); elbowLimit(); plantFeet(); lifted = true; for (const k in floored) delete floored[k];   // the lift re-runs FK: the legs are floored again below (never lost)
  } };
  floorPass();
  // 3. torso / clavicle assist + glove IK toward the simulation hand
  const T = glW(desc.handTarget);
  const cradleOn = !g.dist && g.catchKind && (g.twoHands || g.holdBall) && !(g.mode === "standing-post" && !desc.held && (state.cradle && state.cradle.released));   // a parry RELEASES the cradle by blending the arms back to the authored pose over the rise (never a cut)   // two-hand catch (pre-contact receive → held cradle): the arms are solved as ONE cradle below, never as two chains chasing points
  state.lastAssist = null;                                                                     // set below only on a tick that actually applies the torso / clavicle assist (a stale value must never be re-applied by a later plan start)
  if (g.ikW > 0 && !cradleOn && !GK_GRAPH.dbg.noIK) {
    const up = skel.byName[upper], fo = skel.byName[fore], hd = skel.byName[hand]; const S = fk.joint[up.idx]; const over = V3.dist(T, S) - (up.len + fo.len + 0.6 * hd.len);
    if (over > 0.01 && !GK_GRAPH.dbg.noAssist) {
      const inv = M4.invertRigid(g.rootM), Pj = M4.transformPoint(inv, fk.joint[skel.byName.pelvis.idx]), Sl = M4.transformPoint(inv, S), Tl = M4.transformPoint(inv, T);
      const a1 = Math.atan2(Sl[0] - Pj[0], Sl[1] - Pj[1]), a2 = Math.atan2(Tl[0] - Pj[0], Tl[1] - Pj[1]);
      let e = (a2 - a1) / DEG; e = Math.max(-GK_GRAPH.torsoAssistMaxDeg, Math.min(GK_GRAPH.torsoAssistMaxDeg, e)) * clamp01(over / 0.3) * g.ikW; if (state.lateral) e = 0;   // far-lateral dive: the trunk is not bent toward an out-of-reach target (the reach is the arm's; the residual stays)
      const assist = { spine: [0, 0, -e * 0.5], chest: [0, 0, -e * 0.5], ["clavicle_" + h]: [0, 0, (h === "R" ? 1 : -1) * GK_GRAPH.clavicleAssistMaxDeg * clamp01(over / 0.3) * g.ikW * (state.lateral ? 0 : 1)] };
      const p2 = poseAdd(pose, assist); p2._pelvis = pose._pelvis; diag.torso = +e.toFixed(1); fk = skelFK(skel, p2, g.rootM); elbowLimit(); plantFeet(); if (FCf) floorPass(); state.lastAssist = { e, h };
    }
    const rightW = M4.transformDir(g.rootM, [1, 0, 0]), splitOff = (g.catchKind && g.twoHands) ? g.ballR + GK_GRAPH.handOff : 0;   // a two-hand catch: each hand goes to ITS side of the ball line (never both to the centre)
    const Th = V3.add(T, V3.scale(rightW, (h === "R" ? 1 : -1) * splitOff));
    const fwdW = M4.transformDir(g.rootM, [0, 0, 1]);
    const poleH = g.catchKind ? V3.add(fk.joint[skel.byName[upper].idx], [rightW[0] * (h === "R" ? 0.5 : -0.5), -0.3, rightW[2] * (h === "R" ? 0.5 : -0.5)])   // catch arms: elbows out and down, never pinched inward
      : state.lateral ? V3.add(fk.joint[skel.byName[upper].idx], [fwdW[0] * GK_GRAPH.armClear.reachPole[0], GK_GRAPH.armClear.reachPole[1], fwdW[2] * GK_GRAPH.armClear.reachPole[0]]) : null;   // far-lateral regime: the reach elbow folds forward and toward the pitch (away from the face and from the trailing arm) while the target is still inside the reach; the approved dives keep the authored bend plane
    const r = skelIK2(skel, fk, upper, fore, hand, Th, g.ikW, poleH, 0.6, PMv("arm_" + h));
    diag.ik = { w: +g.ikW.toFixed(3), reached: r.reached, residual: +r.residual.toFixed(3), wrist: r.wrist, handCentre: r.handCentre, target: T, split: splitOff };
  }
  // 4. hands on the pitch (impact / settle / brace / push-up): per-hand weights; the reaching hand lands beside the hip, the other in front of the chest
  if (g.brace) {
    for (const sd of ["R", "L"]) {
      const wb = clamp01(g.brace[sd] || 0); if (wb <= 0) continue;
      const sgn = g.landing ? g.landing.plan.dirSign : 1, isReach = sd === h;
      const hs = skel.H / GK_MOTION_H_REF, px = (pose._pelvis ? pose._pelvis[0] : 0) + sgn * (isReach ? 0.42 : 0.18) * hs, pz = (isReach ? 0.22 : 0.36) * hs;
      const Pw = M4.transformPoint(g.rootM, [px, 0.07, pz]); const r = skelIK2(skel, fk, "upperArm_" + sd, "foreArm_" + sd, "hand_" + sd, Pw, wb, null, 0.6, PMv("arm_" + sd));
      diag["brace_" + sd] = { w: +wb.toFixed(2), residual: +r.residual.toFixed(3), P: Pw };
    }
  }
  for (const side of ["R", "L"]) { const st = state.feet[side]; if (st) { st.lastAnkle = fk.joint[skel.byName["foot_" + side].idx].slice(); st.lastT = desc.now; } }   // solved foot positions: the start point of any later (re)plant
  // 5. lead-leg IK (FOOT_SAVE): the reach-side leg sweeps to the simulation's leg tip (authoritative), knee forward-up
  if (g.legTip && g.legTip.w > 0) { const T2 = glW(g.legTip.p), hipJ = fk.joint[skel.byName["thigh_" + h].idx], kJ = fk.joint[skel.byName["shin_" + h].idx]; const wl = g.legTip.w * (1 - smooth01((V3.dist(hipJ, T2) - (legMax - 0.02)) / 0.08)); g.legTip.w = wl;   /* a leg tip beyond the leg's reach is exposed (residual), never chased at full extension */ const pole = g.motion === "FOOT_SAVE" ? [hipJ[0] + fwd[0] * 0.4, hipJ[1] + 0.25, hipJ[2] + fwd[2] * 0.4] : [kJ[0], Math.max(kJ[1], 0.12), kJ[2]];   /* a lying body keeps its authored knee plane */ const r = wl > 0 ? skelIK2(skel, fk, "thigh_" + h, "shin_" + h, "foot_" + h, T2, wl, pole, 0.5, PM("leg_" + h)) : { residual: V3.dist(fk.tip[skel.byName["foot_" + h].idx], T2) }; diag.legTip = { w: +g.legTip.w.toFixed(2), residual: +r.residual.toFixed(3), target: T2 }; }
  // 6. a CAUGHT ball: both hands on the authoritative ball (the ball is never moved; the hands go to it)
  const rightW2 = M4.transformDir(g.rootM, [1, 0, 0]), armPole = (sd) => V3.add(fk.joint[skel.byName["upperArm_" + sd].idx], [rightW2[0] * (sd === "R" ? 0.5 : -0.5), -0.3, rightW2[2] * (sd === "R" ? 0.5 : -0.5)]);   // elbows out and down
  const hc = (sd) => { const j = fk.joint[skel.byName["hand_" + sd].idx], t = fk.tip[skel.byName["hand_" + sd].idx]; return V3.lerp(j, t, 0.6); };
  if (!cradleOn && g.twoHands && g.ikW > 0 && desc.commit && !g.legTip) { const w2 = g.ikW * 0.9 * (1 - g.holdW); if (w2 > 0) { const off2 = g.catchKind ? g.ballR + GK_GRAPH.handOff : 0; const To = V3.add(T, V3.scale(rightW2, (o === "R" ? 1 : -1) * off2)); const r = skelIK2(skel, fk, "upperArm_" + o, "foreArm_" + o, "hand_" + o, To, w2, g.catchKind ? armPole(o) : null, 0.6, PM("arm_" + o)); diag.ik2 = { w: +w2.toFixed(2), residual: +r.residual.toFixed(3) }; } }   // two-hand saves: the second hand joins on ITS side of the ball line (handed over to the hold as the ball is caught)
  if (g.catchKind && g.twoHands && diag.ik && g.ikW > 0) diag.ik.handCentre = V3.lerp(hc("R"), hc("L"), 0.5);   // two-hand catch: the contact metric is the midpoint of the two hands vs the simulation hand
  // 6. a CAUGHT ball: PRESENTATION ball = the authoritative ball at the catch, blending (deterministically, over holdBlend) into the
  //    cradle centre of the authored arms (midpoint of the authored hand centres); both hands are then solved onto THEIR side of that
  //    rendered ball. The simulation ball is never moved: gk / ball state is read only. (Before possession the rendered ball is the simulation ball.)
  if (!cradleOn && g.holdBall && g.holdW > 0) {
    const Bsim = glW(g.holdBall), cr = V3.lerp(hc("R"), hc("L"), 0.5), wB = smooth01(clamp01((desc.now - (state.holdT0 != null ? state.holdT0 : desc.now)) / GK_GRAPH.holdBlend));
    const Bp = state.holdLast && state.holdLast.pres && !desc.held ? state.holdLast.pres : V3.lerp(Bsim, cr, wB); if (desc.held) state.holdLast.pres = Bp.slice();
    const off = g.ballR + GK_GRAPH.handOff;
    for (const sd of ["R", "L"]) { const Ts = V3.add(Bp, [rightW2[0] * (sd === "R" ? off : -off), -0.02, rightW2[2] * (sd === "R" ? off : -off)]); const r = skelIK2(skel, fk, "upperArm_" + sd, "foreArm_" + sd, "hand_" + sd, Ts, g.holdW, armPole(sd), 0.6, PM("arm_" + sd)); diag["hold_" + sd] = +r.residual.toFixed(3); }
    diag.holdW = +g.holdW.toFixed(2); diag.ballPres = { p: Bp, r: g.ballR, cradle: cr, wB: +wB.toFixed(2), handR: hc("R"), handL: hc("L") };
  }
  // ── 7. COORDINATED CRADLE (catch group, two hands): receiving plane ahead of the authoritative contact point on the incoming line,
  //    both arms solved together around the ball with explicit anatomy (elbows out / down, outside the torso volume, hands on
  //    opposing sides of the ball, palms curled onto it); after authoritative possession the rendered ball follows a contained path
  //    catch point → pinned against the chest, and the cradle moves with it. Simulation state is read only.
  if (cradleOn) {
    const CS = state.cradle || (state.cradle = { memR: {}, memL: {} }); const rB = g.ballR, hOff = GK_GRAPH.handOff, hsc = skel.H / GK_MOTION_H_REF;
    const upW = [0, 1, 0], fwdW = M4.transformDir(g.rootM, [0, 0, 1]), rgt = rightW2;
    const pelJ = fk.joint[skel.byName.pelvis.idx], chTip = fk.tip[skel.byName.chest.idx], chM = fk.world[skel.byName.chest.idx];
    const cRight = V3.norm(M4.transformDir(chM, [1, 0, 0])), cUp = V3.norm(V3.sub(chTip, pelJ)), cFwd = V3.norm(V3.cross(cRight, cUp)), Ltor = V3.dist(chTip, pelJ);
    const torso = (pt) => { const q = V3.sub(pt, pelJ), lat = V3.dot(q, cRight), dep = V3.dot(q, cFwd), ht = V3.dot(q, cUp); return Math.abs(lat) < 0.20 * hsc + 0.02 && dep > -0.13 * hsc && dep < 0.12 * hsc && ht > -0.05 && ht < Ltor + 0.06; };   // torso exclusion volume (pelvis → shoulders, ribcage half-width + clearance)
    const backPlane = (pt) => V3.dot(V3.sub(pt, pelJ), cFwd) < -0.16 * hsc;
    const arm = (sd) => ({ up: skel.byName["upperArm_" + sd], fo: skel.byName["foreArm_" + sd], hd: skel.byName["hand_" + sd], S: fk.joint[skel.byName["upperArm_" + sd].idx], sgn: sd === "R" ? 1 : -1 });
    const handLen = skel.byName.hand_R.len;
    let modeC, wR = 1, Bp = null, sB = 0, pin = null, W = {}, Wrecv = null, Tc = null, dIn = null, dPlane = 0;
    const tl = g.clipT != null && g.mode === "standing-post" ? g.clipT : 0, CP = state.catchPost || { t1: 0.12, t2: 0.32 };
    // receiving plane: ahead of the authoritative contact point along the incoming ball line (the ball enters an OPEN basket; the chest is its back wall)
    Tc = T; const bNow = desc.ball ? glW(desc.ball) : null; const dh = bNow ? [bNow[0] - Tc[0], 0, bNow[2] - Tc[2]] : null;
    if (dh && V3.len(dh) > 0.05) CS.dIn = V3.norm(dh); dIn = CS.dIn || fwdW;
    const low = Tc[1] < 0.6 * hsc; dPlane = (low ? 0.20 : 0.28) * hsc;
    const recvW = (sd, sg) => V3.add(V3.add(Tc, V3.scale(dIn, dPlane)), V3.add(V3.scale(rgt, sg * (rB + hOff + 0.6 * handLen + 0.02)), V3.scale(upW, low ? -0.6 * rB : -0.02)));
    let kRel = 0;                                                                              // parry release: 0 = cradle, 1 = authored arms
    if (g.mode === "standing-post" && !g.holdBall) {                                            // no possession: the receiving hands come back to the authored arms over the rise (deterministic blend, no cut)
      modeC = "release"; const mo2 = state.motionSel && state.motionSel.motion; kRel = smooth01(clamp01(tl / ((mo2 && mo2.riseT) || 0.4)));
      if (!CS.Wrecv) CS.Wrecv = { R: fk.joint[arm("R").hd.idx].slice(), L: fk.joint[arm("L").hd.idx].slice() };
      for (const sd of ["R", "L"]) W[sd] = V3.lerp(CS.Wrecv[sd], fk.joint[arm(sd).hd.idx], kRel);
      if (kRel >= 1) CS.released = true;
    } else if (!g.holdBall) {                                                                   // RECEIVE: hands ahead of the contact point on the line, either side of it (weight ramps in over u 0.30 → 0.50)
      modeC = "receive"; wR = clamp01((desc.u == null ? 1 : desc.u) - 0.30) / 0.20; wR = smooth01(clamp01(wR)); if (desc.contact && desc.contact.tickT >= desc.commit.t0 - 1e-3) wR = 1;
      for (const sd of ["R", "L"]) { const A = arm(sd); W[sd] = V3.lerp(fk.joint[A.hd.idx], recvW(sd, A.sgn), wR); }
      CS.Wrecv = { R: W.R.slice(), L: W.L.slice() }; CS.Bcatch = null;
    } else {                                                                                    // HELD: the ball is contained — CRADLE closes the hands from the receive plane onto the ball's sides, then the cradle carries the ball to the chest pin
      modeC = tl < CP.t1 ? "cradle" : tl < CP.t2 ? "absorb" : "secure";
      const Bsim = glW(g.holdBall); if (!CS.Bcatch) { CS.Bcatch = Bsim.slice(); CS.hRel = Math.max(0.30 * hsc, Math.min(Ltor - 0.05, V3.dot(V3.sub(Bsim, pelJ), cUp))); CS.Wrecv = CS.Wrecv || (state.lastWrists ? { R: state.lastWrists.R.slice(), L: state.lastWrists.L.slice() } : { R: fk.joint[arm("R").hd.idx].slice(), L: fk.joint[arm("L").hd.idx].slice() }); }   // a one-hand reach that becomes a catch hands over from where the hands actually WERE (last solved wrists), never from the authored pose
      pin = V3.add(pelJ, V3.add(V3.scale(cUp, CS.hRel), V3.scale(cFwd, 0.12 * hsc + rB + 0.02)));                     // pinned against the chest front at the catch height (clamped to the abdomen … upper chest)
      sB = tl < CP.t1 ? 0 : smooth01(clamp01((tl - CP.t1) / Math.max(1e-6, CP.t2 - CP.t1)));
      Bp = V3.lerp(CS.Bcatch, pin, sB);                                                        // contained path: catch point → chest pin, the cradle moves with it
      { const q = V3.sub(Bp, pelJ), dep = V3.dot(q, cFwd), ht = V3.dot(q, cUp), lat = V3.dot(q, cRight); const front = 0.12 * hsc + rB + 0.01;   // the rendered ball never passes through the torso: a catch point the simulation places inside the body's depth is pushed out to the front face (exposed as ballClamp)
        if (Math.abs(lat) < 0.20 * hsc + 0.02 + rB && ht > -0.05 - rB && ht < Ltor + 0.06 + rB && dep < front && dep > -0.13 * hsc - rB) { CS.ballClamp = +(front - dep).toFixed(3); Bp = V3.add(Bp, V3.scale(cFwd, front - dep)); } else CS.ballClamp = 0; }
      const tuck = smooth01(clamp01((tl - CP.t1) / Math.max(1e-6, CP.t2 - CP.t1)));
      for (const sd of ["R", "L"]) { const A = arm(sd); const Wb = V3.add(Bp, V3.add(V3.scale(rgt, A.sgn * (rB + hOff + 0.6 * handLen)), V3.add(V3.scale(fwdW, 0.04 + 0.03 * tuck), V3.scale(upW, -0.02)))); const kc = tl < CP.t1 ? smooth01(clamp01(tl / CP.t1)) : 1; W[sd] = V3.lerp(CS.Wrecv[sd], Wb, kc); }
    }
    const res = {}; const tuckB = modeC === "secure" ? 1 : modeC === "absorb" ? sB : 0;
    for (const sd of ["R", "L"]) {
      const A = arm(sd); const pref = V3.norm(V3.add(V3.add(V3.scale(rgt, A.sgn * 0.75), V3.scale(upW, -0.55)), V3.scale(fwdW, -0.25 * tuckB)));   // elbows out and down; tucked a little back beside the ribs once secured
      const r = skelCradleElbow(A.S, W[sd], A.up.len, A.fo.len, pref, torso, sd === "R" ? CS.memR : CS.memL, { maxUp: 0.05, backPlane });
      const aim = Bp || V3.add(Tc, V3.scale(dIn, dPlane * 0.3)); const curl = g.holdBall ? 0.7 : 0.35 * (1 - kRel);
      const Ea = fk.joint[A.fo.idx], Wa = fk.joint[A.hd.idx];                                    // authored chain (for the parry release blend)
      const ac = skelAimChain(skel, fk, "upperArm_" + sd, "foreArm_" + sd, "hand_" + sd, kRel > 0 ? V3.lerp(r.E, Ea, kRel) : r.E, kRel > 0 ? V3.lerp(r.W, Wa, kRel) : r.W, aim, curl);
      res[sd] = { E: r.E, W: r.W, valid: r.valid, viol: r.viol, theta: +r.theta.toFixed(2), handCentre: ac.handCentre };
    }
    const crossed = V3.dot(V3.sub(res.L.handCentre, res.R.handCentre), rgt) > 0;
    diag.cradle = { mode: modeC, wR: +wR.toFixed(2), R: res.R, L: res.L, crossed, ballIn: Bp ? torso(Bp) : false, ballClamp: CS.ballClamp || 0, plane: { T: Tc, dIn, dPlane: +dPlane.toFixed(3) }, pin, Bp, sB: +sB.toFixed(2), torso: { pelvis: pelJ, top: chTip, right: cRight, fwd: cFwd, halfW: 0.20 * hsc + 0.02 }, violations: (res.R.valid ? 0 : 1) + (res.L.valid ? 0 : 1) + (crossed ? 1 : 0) + (Bp && torso(Bp) ? 1 : 0) };
    const mid = V3.lerp(res.R.handCentre, res.L.handCentre, 0.5); diag.ik = { w: +wR.toFixed(3), reached: true, residual: +V3.dist(mid, T).toFixed(3), wrist: res[h].W, handCentre: mid, target: T, cradle: true };
    if (g.holdBall) diag.ballPres = { p: Bp, r: rB, cradle: mid, wB: +sB.toFixed(2), handR: res.R.handCentre, handL: res.L.handCentre, pin };
  } else if (state.cradle && !g.catchKind) state.cradle = null;
  // ── 8. DISTRIBUTION hands + kicking leg (v12): the hands hold the rendered ball on its authored path (two hands: on its sides, the cradle
  //    anatomy; one hand: the ball at the end of the arm line, palm behind it) until the authoritative release tick; from that tick the hands
  //    fade off a STATIC anchor at the release point (never the flying ball). The kicking leg's foot is solved onto the falling simulation ball.
  if (g.dist) {
    const Dd = g.dist, rB = g.ballR, hOff = GK_GRAPH.handOff, hsc = skel.H / GK_MOTION_H_REF, handLen = skel.byName.hand_R.len;
    const CS = state.distArms || (state.distArms = { memR: {}, memL: {} });
    const upW = [0, 1, 0], fwdW = M4.transformDir(g.rootM, [0, 0, 1]), rgt = rightW2;
    const pelJ = fk.joint[skel.byName.pelvis.idx], chTip = fk.tip[skel.byName.chest.idx], chM = fk.world[skel.byName.chest.idx];
    const cRight = V3.norm(M4.transformDir(chM, [1, 0, 0])), cUp = V3.norm(V3.sub(chTip, pelJ)), cFwd = V3.norm(V3.cross(cRight, cUp)), Ltor = V3.dist(chTip, pelJ);
    const torso = (pt) => { const q = V3.sub(pt, pelJ), lat = V3.dot(q, cRight), dep = V3.dot(q, cFwd), ht = V3.dot(q, cUp); return Math.abs(lat) < 0.20 * hsc + 0.02 && dep > -0.13 * hsc && dep < 0.12 * hsc && ht > -0.05 && ht < Ltor + 0.06; };
    const kIn = Dd.kIn != null ? Dd.kIn : 1;
    if (Dd.assist0 && kIn < 1) {                                                                // a hold that used the torso / clavicle assist (dive / collapse holds): the assist decays over the first 120 ms instead of vanishing in one tick
      const a0 = Dd.assist0, ea = a0.e * (1 - kIn); const assist = { spine: [0, 0, -ea * 0.5], chest: [0, 0, -ea * 0.5], ["clavicle_" + a0.h]: [0, 0, (a0.h === "R" ? 1 : -1) * GK_GRAPH.clavicleAssistMaxDeg * (1 - kIn)] };
      const p2 = poseAdd(pose, assist); p2._pelvis = pose._pelvis; fk = skelFK(skel, p2, g.rootM); elbowLimit(); plantFeet(); if (FCf) floorPass(); diag.torso = +ea.toFixed(1);
    }
    const B = Dd.ballW || Dd.handAnchor; const two = Dd.hands.R > 0.5 && Dd.hands.L > 0.5; const resD = {};
    // BALL / HAND QUALITY GATE (v13): the ball is a physical sphere of radius rB supported by a hand of length handLen. ONE-HAND grip = the ball
    // rests ON THE PALM: palm point P (mid-hand) with the ball centre B = P + n̂·rB along the palm normal, the hand direction tangent to the
    // ball, so the wrist sits at √(rB² + (½·hand)²) from the centre in the authored `_palm` direction (never at the fingertips, never behind
    // them). TWO-HAND grip = the v11 cradle (hands on the ball's sides). Every active hand is measured: palm-to-surface, fingertip
    // penetration, ball beyond the fingertips, wrist penetration, forearm intersection, hand-centre jump per tick.
    const HC = skel.contact && skel.contact.hand;                                                // finished glove: palm point / normal in the hand's bind-local frame (presentation calibration)
    const palmOff = (sd) => HC ? Math.abs(HC[sd].palmPoint[0]) : hOff, palmAlong = (sd) => HC ? -HC[sd].palmPoint[1] : 0.5 * handLen;   // palm surface offset from the hand axis; distance down the hand
    const dPalmOf = (sd) => Math.sqrt((rB + palmOff(sd)) * (rB + palmOff(sd)) + palmAlong(sd) * palmAlong(sd)), rFore = skel.byName.foreArm_R.rad;   // palm point (mid-hand) at rB + glove thickness (hOff) from the ball centre, hand tangent → wrist at √((rB+hOff)² + (½·hand)²)
    const segDist = (P, A, Bq) => { const ab = V3.sub(Bq, A), t = clamp01(V3.dot(V3.sub(P, A), ab) / Math.max(1e-9, V3.dot(ab, ab))); return V3.dist(P, V3.add(A, V3.scale(ab, t))); };
    const lastHC = state.distLastHC || {};
    if (B) for (const sd of ["R", "L"]) {
      const w = clamp01(Dd.hands[sd]); if (w <= 0) continue;
      const up = skel.byName["upperArm_" + sd], fo = skel.byName["foreArm_" + sd], hd = skel.byName["hand_" + sd], S0 = fk.joint[up.idx], sgn = sd === "R" ? 1 : -1;
      const k2 = clamp01(Dd.hands[sd === "R" ? "L" : "R"]);                                     // how much the OTHER hand is on the ball: the wrist target blends between the two-hand (sides) and the one-hand (palm) rule — a hand-over is never a target jump
      const dSide = V3.norm(V3.add(V3.scale(upW, 0.55), V3.scale(fwdW, 0.83)));                   // two-hand sides grip on the finished glove: fingers along the ball (up-forward), the palm facing the centre
      const WbTwo = HC ? V3.sub(V3.add(B, V3.scale(rgt, sgn * (rB + palmOff(sd)))), V3.scale(dSide, palmAlong(sd))) : V3.add(B, V3.add(V3.scale(rgt, sgn * (rB + hOff + 0.6 * handLen)), V3.add(V3.scale(fwdW, 0.05), V3.scale(upW, -0.02))));
      const uPalm0 = Dd.palmW && V3.len(Dd.palmW) > 1e-3 ? V3.norm(Dd.palmW) : upW, dPalm = dPalmOf(sd);
      const pref = V3.norm(V3.lerp(V3.norm(V3.add(V3.scale(rgt, sgn * 0.9), V3.scale(upW, -0.35))), V3.norm(V3.add(V3.add(V3.scale(rgt, sgn * 0.75), V3.scale(upW, -0.55)), V3.scale(fwdW, -0.25))), k2));   // elbows out / down; a single supporting arm keeps its elbow outside
      const ballIn = (pt) => V3.dist(pt, B) < rB + 0.25 * rFore + 0.01;                        // the elbow, the upper-arm midpoint and the forearm midpoint must stay OUTSIDE the ball (a palm-supported ball must not have the forearm passing through it)
      const Ea = fk.joint[fo.idx], Wa = fk.joint[hd.idx], dHa = V3.norm(V3.sub(fk.tip[hd.idx], Wa));
      // the PALM is parallel to the forearm, so the wrist→ball direction must be PERPENDICULAR to the forearm: the authored `_palm` preference is projected onto the
      // plane ⊥ the forearm (authored arm first, then the solved arm — two passes); the ball then rests on the palm plane and the forearm cannot pass through it
      let r = null, Wb = null, uPalm = uPalm0, dFore = V3.norm(V3.sub(Wa, Ea));
      for (let pass = 0; pass < 2; pass++) {
        let uP = V3.sub(uPalm0, V3.scale(dFore, V3.dot(uPalm0, dFore))); if (V3.len(uP) < 0.05) uP = V3.sub(upW, V3.scale(dFore, dFore[1])); uPalm = V3.norm(uP);
        let WbOne = HC ? V3.sub(V3.sub(B, V3.scale(uPalm, rB + palmOff(sd))), V3.scale(dFore, palmAlong(sd))) : V3.sub(B, V3.scale(uPalm, dPalm));
        if (HC) { const dEx = Math.hypot(rB + palmOff(sd), palmAlong(sd), HC[sd].palmPoint[2]); WbOne = V3.add(B, V3.scale(V3.norm(V3.sub(WbOne, B)), dEx)); }   // exact wrist distance for the palm point ON the surface (its across-hand offset included)   // finished glove: wrist = ball − normal·(r + palm offset) − hand·(palm distance down the hand) — the palm SURFACE carries the ball
        { const dTwo = V3.sub(WbTwo, B), dOne = V3.sub(WbOne, B); const dir = V3.lerp(V3.norm(dOne), V3.norm(dTwo), k2); Wb = V3.add(B, V3.scale(V3.len(dir) > 1e-4 ? V3.norm(dir) : V3.norm(dOne), (1 - k2) * V3.len(dOne) + k2 * V3.len(dTwo))); }   // hand-over blend ON the ball's surface (direction + distance from the centre), never a straight line through the ball
        r = skelCradleElbow(S0, Wb, up.len, fo.len, pref, (pt) => torso(pt) || ballIn(pt), sd === "R" ? CS.memR : CS.memL, { maxUp: 0.05 * k2 + 1.0 * (1 - k2) });
        dFore = V3.norm(V3.sub(r.W, r.E));
      }
      let Ef = V3.lerp(Ea, r.E, w), Wf = V3.lerp(Wa, r.W, w);
      if (kIn < 1 && Dd.W0 && Dd.E0) { const carry = Dd.ball0W && Dd.ballW ? V3.sub(Dd.ballW, Dd.ball0W) : [0, 0, 0]; Ef = V3.lerp(V3.add(Dd.E0[sd], carry), Ef, kIn); Wf = V3.lerp(V3.add(Dd.W0[sd], carry), Wf, kIn); }   // hand-over INTO the distribution grip: from where the arms actually were (last solved elbows / wrists, carried along with the ball's own displacement) over 120 ms — never a cut between two solvers
      // hand direction: one hand → tangent to the ball at the palm (the authored hand direction projected onto the plane ⊥ wrist→ball); two hands → the cradle curl; blended by k2 through the hand-over
      let handDir = null, nOne = null;
      { const uW = V3.norm(V3.sub(B, Wf)), dW = V3.dist(B, Wf); let t = V3.sub(dHa, V3.scale(uW, V3.dot(dHa, uW))); if (V3.len(t) < 0.05) t = V3.sub(fwdW, V3.scale(uW, V3.dot(fwdW, uW))); const dT = V3.norm(t);
        const cS = Math.max(-1, Math.min(1, (dW * dW + handLen * handLen - (rB + hOff) * (rB + hOff)) / (2 * dW * handLen))), sS = Math.sqrt(Math.max(0, 1 - cS * cS));   // exact fingertip-on-surface angle for the ACTUAL wrist distance this tick
        const dSideDir = HC ? V3.norm(V3.add(V3.scale(upW, 0.55), V3.scale(fwdW, 0.83))) : V3.norm(V3.add(V3.scale(uW, cS), V3.scale(dT, sS)));
        let dOne = dT;
        if (HC) {                                                                              // finished glove, one hand: EXACT palm-on-ball hand solve from the solved wrist — the palm point sits at (a down the hand, c along the normal, pz across) from the wrist,
          const a = palmAlong(sd), c = rB + palmOff(sd), pzs = -HC[sd].palmNormal[0] * HC[sd].palmPoint[2]; // so with v = ball − wrist the hand direction makes angle acos(a/|v|) with v; the free spin about v is chosen for the LEAST wrist flexion (hand nearest the forearm line)
          const dF2 = V3.norm(V3.sub(Wf, Ef)); let e2 = V3.sub(dF2, V3.scale(uW, V3.dot(dF2, uW))); if (V3.len(e2) < 1e-4) e2 = V3.sub(fwdW, V3.scale(uW, V3.dot(fwdW, uW))); e2 = V3.norm(e2);
          const ca = Math.min(1, a / Math.max(1e-6, dW)), sa = Math.sqrt(Math.max(0, 1 - ca * ca)); dOne = V3.norm(V3.add(V3.scale(uW, ca), V3.scale(e2, sa)));
          let u1 = V3.sub(uW, V3.scale(dOne, V3.dot(uW, dOne))); if (V3.len(u1) < 1e-4) u1 = e2; u1 = V3.norm(u1); const u2 = V3.cross(dOne, u1); const hc2 = Math.hypot(c, pzs), cp = c / hc2, sp = pzs / hc2;
          const nA = V3.add(V3.scale(u1, cp), V3.scale(u2, sp)), nB = V3.add(V3.scale(u1, cp), V3.scale(u2, -sp)); const want = pzs / Math.max(1e-6, dW);   // the palm normal (⊥ hand) whose across-hand axis n̂×d̂ carries the pz offset toward the ball
          nOne = Math.abs(V3.dot(V3.cross(nA, dOne), uW) - want) <= Math.abs(V3.dot(V3.cross(nB, dOne), uW) - want) ? nA : nB;
        }
        handDir = V3.norm(V3.lerp(dOne, dSideDir, k2));
        if (HC && k2 > 1e-3 && k2 < 1 - 1e-3) { const tipP = V3.add(Wf, V3.scale(handDir, handLen)); const pen = rB - V3.dist(tipP, B); if (pen > 0) { let aw = V3.sub(handDir, V3.scale(uW, V3.dot(handDir, uW))); if (V3.len(aw) < 1e-4) aw = V3.sub(fwdW, V3.scale(uW, V3.dot(fwdW, uW))); aw = V3.norm(aw); for (let it = 0; it < 12; it++) { const cand = V3.norm(V3.add(V3.scale(uW, V3.dot(handDir, uW)), V3.scale(aw, V3.dot(handDir, aw) + 0.08))); handDir = cand; if (V3.dist(V3.add(Wf, V3.scale(handDir, handLen)), B) >= rB) break; } } } }   // hand-over blend (finished glove): the blended hand direction is a lerp, not a surface rule — swing it away from the centre until the knuckles clear the ball   // one hand: tangent to the ball at the palm; sides grip: the exact fingertip-on-surface angle off the centre line, curled toward the tangent
      const ac = skelAimChain(skel, fk, "upperArm_" + sd, "foreArm_" + sd, "hand_" + sd, Ef, Wf, B, 0.7 * w, handDir ? V3.lerp(dHa, handDir, w) : null);
      if (HC && w > 0) {                                                                       // finished glove: twist the hand about its own axis so the PALM faces the ball (bind palm normal ±X; a rigid twist of the hand bone, presentation only)
        const hm = fk.world[hd.idx], axis = V3.norm(V3.sub(fk.tip[hd.idx], fk.joint[hd.idx])), nCur = V3.norm(M4.transformDir(hm, HC[sd].palmNormal)), toB0 = V3.norm(V3.sub(B, fk.joint[hd.idx])), toB = nOne ? V3.norm(V3.lerp(nOne, toB0, k2)) : toB0;   // one hand: the exact palm normal; sides grip: the palm faces the centre; blended through the hand-over
        const pc = V3.sub(nCur, V3.scale(axis, V3.dot(nCur, axis))), pt = V3.sub(toB, V3.scale(axis, V3.dot(toB, axis)));
        if (V3.len(pc) > 1e-4 && V3.len(pt) > 1e-4) { const a = V3.norm(pc), b2 = V3.norm(pt); const ang = Math.atan2(V3.dot(V3.cross(a, b2), axis), V3.dot(a, b2)) * w; const o = M4.origin(hm), Rt = M4.axisAngle(axis, ang); const m2 = M4.mul(M4.translate(o[0], o[1], o[2]), M4.mul(Rt, M4.mul(M4.translate(-o[0], -o[1], -o[2]), hm))); const d = M4.mul(m2, M4.invertRigid(hm)); const apply = (bn) => { fk.world[bn.idx] = M4.mul(d, fk.world[bn.idx]); fk.joint[bn.idx] = M4.origin(fk.world[bn.idx]); fk.tip[bn.idx] = M4.transformPoint(fk.world[bn.idx], V3.scale(bn.dir, bn.len)); for (const c2 of bn.children) apply(c2); }; apply(hd); }
      }
      // metrics (physical hand: wrist W, fingertips F, palm point P — the finished glove's measured palm point, else mid-hand on the axis)
      const Wn = fk.joint[hd.idx], Fn = fk.tip[hd.idx], dHn = V3.norm(V3.sub(Fn, Wn)), Pn = HC ? M4.transformPoint(fk.world[hd.idx], HC[sd].palmPoint) : V3.lerp(Wn, Fn, 0.5), En = fk.joint[fo.idx];
      // beyond-fingers = the ball's NEAR surface lies past the fingertips along the hand (the ball hangs off the fingertips instead of sitting on the palm / against the fingers);
      // forearm = the ball centre inside the forearm's clearance along its proximal 70 % (the wrist end is legitimately within a radius of a palm-supported ball)
      const m = { palmSurface: +(V3.dist(Pn, B) - rB - (HC ? 0 : hOff)).toFixed(3), palmNormalDot: HC ? +V3.dot(V3.norm(M4.transformDir(fk.world[hd.idx], HC[sd].palmNormal)), V3.norm(V3.sub(B, Pn))).toFixed(3) : null, fingerPen: +Math.max(0, rB + (HC ? 0 : hOff) - V3.dist(Fn, B)).toFixed(3), ballBeyondFingers: +(V3.dot(V3.sub(B, Wn), dHn) - handLen - rB).toFixed(3), wristPen: +Math.max(0, rB + (HC ? 0 : hOff) - V3.dist(Wn, B)).toFixed(3), foreArmPen: +Math.max(0, rB + 0.25 * rFore - segDist(B, En, V3.lerp(En, Wn, 0.6))).toFixed(3), handJump: lastHC[sd] ? +V3.dist(ac.handCentre, lastHC[sd]).toFixed(3) : 0, grip: k2 >= 0.5 ? "sides" : "palm" };
      const prevJump = lastHC[sd + "_j"] != null ? lastHC[sd + "_j"] : m.handJump;
      const bad = []; if (Dd.ballW && w > 0.75) { if (k2 < 0.25 && Math.abs(m.palmSurface) > 0.03) bad.push("palm-off-ball"); if (m.fingerPen > 0.02) bad.push("finger-penetration"); if (m.ballBeyondFingers > 0.02) bad.push("ball-beyond-fingers"); if (m.wristPen > 0.015) bad.push("wrist-penetration"); if (m.foreArmPen > 0.01) bad.push("forearm-intersection"); if (m.handJump > 0.16 && m.handJump > 3 * prevJump + 0.02) bad.push("hand-jump"); } m.bad = bad;   // a hand that is ON the ball (w > ¾; a hand at w ≤ ¾ is letting go / arriving); a jump is a CUT only when it is sudden (a whipping throw arm moves 0.2 m/tick smoothly)   // judged only while the rendered ball is in the hands (after the release the hands fade off a static anchor); a hand-centre jump > 0.16 m in one tick (~10 m/s) is a cut, not a swing
      m.wristTargetErr = +V3.dist(Wn, Wb).toFixed(3); m.reachClamp = +V3.dist(Wb, r.W).toFixed(3);   // diagnostics: solved wrist vs the wanted wrist; how much the cradle-elbow solve clamped the wrist for reach
      resD[sd] = { w: +w.toFixed(2), valid: r.valid, viol: r.viol, handCentre: ac.handCentre, wrist: Wn, tip: Fn, palm: Pn, surface: +(V3.dist(ac.handCentre, B) - rB).toFixed(3), metrics: m };   // surface: hand centre to the ball SURFACE (0 = touching)
      lastHC[sd] = ac.handCentre.slice(); lastHC[sd + "_j"] = m.handJump;
    }
    state.distLastHC = lastHC;
    const badN = (resD.R ? resD.R.metrics.bad.length : 0) + (resD.L ? resD.L.metrics.bad.length : 0);
    diag.dist = { seg: Dd.seg, x: +Dd.x.toFixed(3), two, R: resD.R || null, L: resD.L || null, ball: Dd.ballW, anchor: Dd.handAnchor, violations: (resD.R && !resD.R.valid ? 1 : 0) + (resD.L && !resD.L.valid ? 1 : 0) + (Dd.ballW && torso(Dd.ballW) ? 1 : 0) + badN, ballIn: !!(Dd.ballW && torso(Dd.ballW)), handBad: badN };
    if (Dd.ballW) diag.ballPres = { p: Dd.ballW, r: rB, cradle: Dd.ballW, wB: 1, handR: resD.R ? resD.R.handCentre : hc("R"), handL: resD.L ? resD.L.handCentre : hc("L"), dist: true };
    if (Dd.kick && Dd.kick.w > 0) {                                                            // kicking foot: ankle solved so the laces meet the ball (ball centre − forward·(radius + half a foot) − a little down)
      const K = Dd.kick, sd = K.foot, hipJ = fk.joint[skel.byName["thigh_" + sd].idx], fb = skel.byName["foot_" + sd], FC = skel.contact && skel.contact.foot, rF = FC ? FC.lacesUpM : fb.rad, fl = FC ? FC.lacesAlongM : 0.65 * fb.len;   // laces point: measured instep of the finished boot, else the test mesh's radius / 65 % proxy
      // the ball rests on the LACES: ankle target = ball − (foot radius + ball radius) along the laces normal − the contact length back along the foot's own
      // direction. The foot's direction / laces normal are taken from the solved foot (two passes: the first with the current foot, the second with the foot as re-aimed by the leg IK)
      let r = null, wl = 0, T2 = null;
      for (let pass = 0; pass < (FC ? 4 : 2); pass++) {                                     // finished boot: four passes (the laces point sits 10 cm down the foot axis, so the ankle target converges with the re-aimed foot); test mesh: two (frozen)
        const ankJ = fk.joint[fb.idx], tipJ = fk.tip[fb.idx]; let fDir = V3.norm(V3.sub(tipJ, ankJ)); const side = V3.norm(V3.cross(fDir, upW)); let nUp = V3.norm(V3.cross(side, fDir)); if (nUp[1] < 0) nUp = V3.scale(nUp, -1);   // laces normal: perpendicular to the foot in its vertical plane, upward
        T2 = V3.sub(V3.sub(K.p, V3.scale(nUp, rB + rF)), V3.scale(fDir, fl));
        wl = K.w * (1 - smooth01((V3.dist(hipJ, T2) - (legMax - 0.02)) / 0.08));
        if (wl <= 0) break;
        r = skelIK2(skel, fk, "thigh_" + sd, "shin_" + sd, "foot_" + sd, T2, wl, [hipJ[0] + fwdW[0] * 0.5, hipJ[1] + 0.35, hipJ[2] + fwdW[2] * 0.5], 0, PM("leg_" + sd));
      }
      if (FC && wl > 0) {                                                                    // finished boot: roll the kicking foot about its own axis so the LACES normal lies in the foot's vertical plane (the instep meets the ball; a rigid twist of the foot bone + toe, presentation only)
        const fm = fk.world[fb.idx], axF = V3.norm(V3.sub(fk.tip[fb.idx], fk.joint[fb.idx])), nL = V3.norm(M4.transformDir(fm, FC.lacesNormal)); const sideF = V3.norm(V3.cross(axF, upW)); let nW = V3.norm(V3.cross(sideF, axF)); if (nW[1] < 0) nW = V3.scale(nW, -1);
        const pc = V3.sub(nL, V3.scale(axF, V3.dot(nL, axF))), pt = V3.sub(nW, V3.scale(axF, V3.dot(nW, axF)));
        if (V3.len(pc) > 1e-4 && V3.len(pt) > 1e-4) { const a1 = V3.norm(pc), b1 = V3.norm(pt); const ang = Math.atan2(V3.dot(V3.cross(a1, b1), axF), V3.dot(a1, b1)) * wl; if (Math.abs(ang) > 1e-5) { const o = M4.origin(fm), Rt = M4.axisAngle(axF, ang); const m2 = M4.mul(M4.translate(o[0], o[1], o[2]), M4.mul(Rt, M4.mul(M4.translate(-o[0], -o[1], -o[2]), fm))); const d = M4.mul(m2, M4.invertRigid(fm)); const applyF = (bn) => { fk.world[bn.idx] = M4.mul(d, fk.world[bn.idx]); fk.joint[bn.idx] = M4.origin(fk.world[bn.idx]); fk.tip[bn.idx] = M4.transformPoint(fk.world[bn.idx], V3.scale(bn.dir, bn.len)); for (const c2 of bn.children) applyF(c2); }; applyF(fb); } }
      }
      const ank = fk.joint[skel.byName["foot_" + sd].idx], tip = fk.tip[skel.byName["foot_" + sd].idx], contact = FC ? M4.transformPoint(fk.world[fb.idx], FC.lacesPoint) : V3.lerp(ank, tip, 0.65);   // finished boot: the measured laces point (ON the boot surface); test mesh: 65 % along the foot axis + its radius
      diag.kick = { foot: sd, w: +wl.toFixed(2), residual: r ? +r.residual.toFixed(3) : null, surface: +(V3.dist(contact, K.p) - rB - (FC ? 0 : rF)).toFixed(3), lacesNormalDot: FC ? +V3.dot(V3.norm(M4.transformDir(fk.world[fb.idx], FC.lacesNormal)), V3.norm(V3.sub(K.p, contact))).toFixed(3) : null, target: K.p, contact, live: K.live };   // foot SURFACE to ball SURFACE (0 = touching; negative = the ball is inside the foot)
    }
  } else if (state.distArms) { state.distArms = null; state.distLastHC = null; }
  state.lastBallPres = diag.ballPres ? diag.ballPres.p.slice() : null;
  for (const side of ["R", "L"]) if (diag.feet[side]) { const aj = fk.joint[skel.byName["foot_" + side].idx]; diag.feet[side].ankleEnd = aj.slice(); diag.feet[side].soleClearM = FCf ? +soleLow(side).toFixed(4) : null; }   // finished character: the sole's height above the pitch at the end of the solve (0 = flat on the ground)
  pel.off = savedOff;
  state.lastWrists = { R: fk.joint[skel.byName.hand_R.idx].slice(), L: fk.joint[skel.byName.hand_L.idx].slice() };   // solved wrists this frame (the start of any later cradle hand-over)
  state.lastElbows = { R: fk.joint[skel.byName.foreArm_R.idx].slice(), L: fk.joint[skel.byName.foreArm_L.idx].slice() };
  diag.selfCol = gkSelfCollision(skel, fk, g.reachHand);
  const out = { fk, diag, ballPres: diag.ballPres || null, hands: { R: hc("R"), L: hc("L") }, elbows: { R: fk.joint[skel.byName.foreArm_R.idx], L: fk.joint[skel.byName.foreArm_L.idx] }, cradle: diag.cradle || null, dist: diag.dist || null, kick: diag.kick || null };
  // presentation root = ground projection of the pelvis (pitch frame); continuous by construction
  const pw = fk.joint[skel.byName.pelvis.idx]; const pr = pitchW([pw[0], 0, pw[2]]);
  let dx = pr[0] - desc.simRoot[0], dy = pr[1] - desc.simRoot[1]; const dm = Math.hypot(dx, dy);
  if (dm > GK_GRAPH.presMaxM) { dx *= GK_GRAPH.presMaxM / dm; dy *= GK_GRAPH.presMaxM / dm; }   // presMaxM is a sanity cap only (a full dive + slide legitimately carries the body well past the simulation root)
  g.pres = { dx, dy, dm: Math.min(dm, GK_GRAPH.presMaxM), x: desc.simRoot[0] + dx, y: desc.simRoot[1] + dy };
  return out;
}
