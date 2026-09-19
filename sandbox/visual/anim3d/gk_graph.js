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
  authoredRollDeg: 72, reachLenH: 0.64, jumpMaxM: 0.55, pelvisMinY: 0.30,
  sideLandLo: 35, sideLandHi: 60,                  // body-axis angle from vertical (deg): ≤ lo land on the feet, ≥ hi land on the side
  G: 9.81,
  plantU: 0.10,           // the launch plan starts at the plant: from here the pelvis is ONE trajectory (push → arc → ground) until the settle
  // landing physics (feet-first vs side-first; blended by the body-axis angle). Heights in m for H 1.90, durations in s.
  // Ground deceleration is progressive along the travel direction: decelTouch while the first contact skids, decelImpact while the
  // body hits and folds, then the slide's friction is whatever brings the remaining speed to zero by the end of the settle.
  feet: { hTouch: 0.95, hImpact: 0.60, hGround: 0.28, impactT: 0.16, absorbT: 0.24, decelTouch: 1.5, decelImpact: 3.0, hold: 0.40, followFrac: 0.35 },
  side: { hTouch: 0.62, hImpact: 0.40, hGround: 0.28, impactT: 0.14, absorbT: 0.30, decelTouch: 1.0, decelImpact: 2.5, hold: 0.45, followFrac: 0.30 },
  getup: { brace: 0.30, pushUp: 0.30, halfKneel: 0.35, crouch: 0.35, rise: 0.50 },
  recon: { pushUp: 0.22, halfKneel: 0.50, crouch: 0.85 }, reconRefM: 0.8, reconSlowMax: 1.8,   // fraction of the stop → simulation-root offset recovered by the end of each supported stage (hips over the tucked feet, front-foot step, crouch step)
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
// ── launch + flight plan (world frame, built once at the plant from the authored crouch and the simulation's own facts) ──
// The pelvis is ONE trajectory from the plant to the first ground contact: a constant-acceleration push (plant → toe-off) that
// arrives at the toe-off with the flight's launch velocity, then a ballistic arc (constant horizontal velocity, gravity only)
// that passes through the solved full-extension pelvis at execEnd. Ball contact lies on that arc and does not change it; the
// simulation root's own easing to a stop is not followed (the body carries its momentum; reconciliation happens on the ground).
function gkLaunchPlan(axisEnd, rootMEnd, W0, v0, tP, tT, tE) {
  const g = GK_GRAPH.G, Pc = M4.transformPoint(rootMEnd, axisEnd.pelvis);
  const Tp = Math.max(1e-3, tT - tP), D = Math.max(1e-3, tE - tT), den = D + Tp / 2;
  const V = [(Pc[0] - W0[0] - v0[0] * Tp / 2) / den, 0, (Pc[2] - W0[2] - v0[2] * Tp / 2) / den];
  const vUp = (Pc[1] - W0[1] - v0[1] * Tp / 2 + 0.5 * g * D * D) / den;
  const Wt = [W0[0] + (v0[0] + V[0]) / 2 * Tp, W0[1] + (v0[1] + vUp) / 2 * Tp, W0[2] + (v0[2] + V[2]) / 2 * Tp];
  const a = [(V[0] - v0[0]) / Tp, (vUp - v0[1]) / Tp, (V[2] - v0[2]) / Tp];
  const tA = tT + Math.max(0, vUp / g), hA = Wt[1] + Math.max(0, vUp) ** 2 / (2 * g);
  return { W0, v0, V, vUp, Wt, a, tP, tT, tE, tA, hA, Pc, vLat: Math.hypot(V[0], V[2]) };
}
function gkLaunchState(L, t) {                                    // world pelvis + velocity at absolute time t (push, then the arc — which continues past endT until the landing takes over)
  const g = GK_GRAPH.G;
  if (t <= L.tT) { const s = Math.max(0, t - L.tP); return { W: [L.W0[0] + L.v0[0] * s + 0.5 * L.a[0] * s * s, L.W0[1] + L.v0[1] * s + 0.5 * L.a[1] * s * s, L.W0[2] + L.v0[2] * s + 0.5 * L.a[2] * s * s], v: [L.v0[0] + L.a[0] * s, L.v0[1] + L.a[1] * s, L.v0[2] + L.a[2] * s], airborne: false }; }
  const s = t - L.tT; return { W: [L.Wt[0] + L.V[0] * s, L.Wt[1] + L.vUp * s - 0.5 * g * s * s, L.Wt[2] + L.V[2] * s], v: [L.V[0], L.vUp - g * s, L.V[2]], airborne: true };
}
const hermite = (p0, v0, p1, v1, T, t) => { const x = clamp01(t / Math.max(1e-6, T)), x2 = x * x, x3 = x2 * x; return (2 * x3 - 3 * x2 + 1) * p0 + (x3 - 2 * x2 + x) * T * v0 + (-2 * x3 + 3 * x2) * p1 + (x3 - x2) * T * v1; };
// ── landing plan (world frame, built once at endT from the launch plan and simulation facts) ──────────────────────────
// Touchdown is where the arc reaches the touch height; the horizontal velocity there is the flight's; deceleration starts on the
// ground and is progressive (skid → impact → slide → zero at the settle). The get-up then recovers the stop → simulation-root
// offset over its support points (hips over the tucked feet, front-foot step, crouch step, rise).
function gkLandingPlan(skel, clip, launch, axis, rootM) {
  const H = skel.H, w = axis.wSide, F = GK_GRAPH.feet, Sd = GK_GRAPH.side, G = GK_GRAPH.getup, mix = (a, b) => lerp(a, b, w), hs = H / 1.9, g = GK_GRAPH.G;
  const hip = 0.50 * H;
  const hTouch = mix(F.hTouch, Sd.hTouch) * hs, hImpact = mix(F.hImpact, Sd.hImpact) * hs, hGround = mix(F.hGround, Sd.hGround) * hs;
  const impactT = mix(F.impactT, Sd.impactT), absorbT = mix(F.absorbT, Sd.absorbT), hold = mix(F.hold, Sd.hold), d1 = mix(F.decelTouch, Sd.decelTouch), d2 = mix(F.decelImpact, Sd.decelImpact);
  // touchdown: where the arc comes down to the touch height (never before endT — the reach is complete first)
  const disc = launch.vUp * launch.vUp - 2 * g * (hTouch - launch.Wt[1]); const sT = disc >= 0 ? (launch.vUp + Math.sqrt(disc)) / g : Math.max(0, launch.vUp / g);
  const tTouch = Math.max(launch.tE, launch.tT + sT); const St = gkLaunchState(launch, tTouch);
  const Ht = [St.W[0], St.W[2]], vt = Math.hypot(launch.V[0], launch.V[2]), vz = St.v[1], u = vt > 1e-6 ? [launch.V[0] / vt, launch.V[2] / vt] : [1, 0];
  // ground: progressive deceleration along the travel direction; the remaining speed after the body impact is bled off by the slide
  const seg = (v0, d, T) => { const ts = d > 1e-6 ? Math.min(T, v0 / d) : T; return { v0, d, T, ts, x: v0 * ts - 0.5 * d * ts * ts, v1: Math.max(0, v0 - d * ts) }; };
  const s1 = seg(vt, d1, impactT), s2 = seg(s1.v1, d2, absorbT), s3 = seg(s2.v1, s2.v1 / Math.max(1e-6, hold), hold);
  const xStop = s1.x + s2.x + s3.x, Hstop = [Ht[0] + u[0] * xStop, Ht[1] + u[1] * xStop];
  const tImpact = tTouch + impactT, tAbsorb = tImpact + absorbT, tSettle = tAbsorb + hold;
  const inv = M4.invertRigid(rootM), sc = M4.transformPoint(inv, [Hstop[0], 0, Hstop[1]]);
  const kT = Math.max(1, Math.min(GK_GRAPH.reconSlowMax, Math.hypot(sc[0], sc[2]) / GK_GRAPH.reconRefM));   // a long way back to the simulation root = more time for the supported stages (no lurching)
  const tBrace = tSettle + G.brace, tPush = tBrace + G.pushUp, tKneel = tPush + G.halfKneel * kT, tCrouch = tKneel + G.crouch * kT, tRise = tCrouch + G.rise * kT;
  const hBrace = clip.postFeet.BRACE._h * hs, hPush = clip.postFeet.PUSH_UP._h * hs, hKneel = clip.postFeet.HALF_KNEEL._h * hs, hCrouch = clip.postFeet.CROUCH._h * hs, hSet = hip + (clip.set._pelvis ? clip.set._pelvis[1] : 0);
  const vMid = 0.5 * ((hImpact - hTouch) / impactT + (hGround - hImpact) / absorbT);      // vertical: the arrival speed is absorbed over impact + absorb (velocity-continuous), zero at the ground
  const root = [rootM[12], rootM[14]];                                                      // simulation root (world x, z): stationary after endT; the get-up recovers the offset to it
  return { w, hip, kT, hTouch, hImpact, hGround, hBrace, hPush, hKneel, hCrouch, hSet, tTouch, tImpact, tAbsorb, tSettle, tBrace, tPush, tKneel, tCrouch, tRise, Ht, u, vt, vz, vMid, segs: [s1, s2, s3], xStop, Hstop, root, stopC: [sc[0], sc[2]], dirSign: sc[0] >= 0 ? 1 : -1, launch, impactT, absorbT };
}
// pelvis (world: height h, horizontal H) + stage at absolute time t. Flight = the launch arc; ground = progressive decel; get-up =
// the pelvis moves over its support points toward the simulation root — reconciliation THROUGH the recovery, never in the air.
function gkLandingState(P, t) {
  let h, H, stage, s; const seg = (t0, t1) => clamp01((t - t0) / Math.max(1e-6, t1 - t0)), R = GK_GRAPH.recon;
  const ground = (tl) => { let x = 0, tt = tl; for (const sg of P.segs) { if (tt <= 0) break; const q = Math.min(tt, sg.ts); x += sg.v0 * q - 0.5 * sg.d * q * q; tt -= sg.T; } return x; };
  const along = (x) => [P.Ht[0] + P.u[0] * x, P.Ht[1] + P.u[1] * x];
  const recon = (f) => [lerp(P.Hstop[0], P.root[0], f), lerp(P.Hstop[1], P.root[1], f)];
  if (t < P.tTouch) { s = seg(P.launch.tE, P.tTouch); const St = gkLaunchState(P.launch, t); h = St.W[1]; H = [St.W[0], St.W[2]]; stage = s < GK_GRAPH.feet.followFrac ? "FOLLOW" : "DESCENT"; }
  else if (t < P.tImpact) { s = seg(P.tTouch, P.tImpact); h = hermite(P.hTouch, P.vz, P.hImpact, P.vMid, P.impactT, t - P.tTouch); H = along(ground(t - P.tTouch)); stage = "IMPACT"; }
  else if (t < P.tAbsorb) { s = seg(P.tImpact, P.tAbsorb); h = hermite(P.hImpact, P.vMid, P.hGround, 0, P.absorbT, t - P.tImpact); H = along(ground(t - P.tTouch)); stage = "ABSORB"; }
  else if (t < P.tSettle) { s = seg(P.tAbsorb, P.tSettle); h = P.hGround; H = along(ground(t - P.tTouch)); stage = "SETTLE"; }
  else if (t < P.tBrace) { s = seg(P.tSettle, P.tBrace); h = lerp(P.hGround, P.hBrace, smooth01(s)); H = recon(0); stage = "BRACE"; }
  else if (t < P.tPush) { s = seg(P.tBrace, P.tPush); h = lerp(P.hBrace, P.hPush, smooth01(s)); H = recon(R.pushUp * smooth01(s)); stage = "PUSH_UP"; }                 // hips drawn back over the tucked feet
  else if (t < P.tKneel) { s = seg(P.tPush, P.tKneel); h = lerp(P.hPush, P.hKneel, smooth01(Math.min(1, s / 0.35)));   /* the pelvis reaches kneel height ahead of the leg shapes so the kneeling knee never dips under the pitch */ H = recon(lerp(R.pushUp, R.halfKneel, smooth01(Math.min(1, s / 0.6)))); stage = "HALF_KNEEL"; }
  else if (t < P.tCrouch) { s = seg(P.tKneel, P.tCrouch); h = lerp(P.hKneel, P.hCrouch, smooth01(s)); H = recon(lerp(R.halfKneel, R.crouch, smooth01(s))); stage = "CROUCH"; }
  else if (t < P.tRise) { s = seg(P.tCrouch, P.tRise); h = lerp(P.hCrouch, P.hSet, smooth01(s)); H = recon(lerp(R.crouch, 1, smooth01(s))); stage = "RISE"; }
  else { s = 1; h = P.hSet; H = P.root; stage = "SET"; }
  return { h, H, stage, s };
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
      locks = { reach: 1 - smooth01(clamp01((u - 0.40) / 0.10)), other: 1 - smooth01(clamp01((u - 0.14) / (0.22 - 0.14))) };   // plant foot held until the leg is fully extended (reach cap in the solve) — the toe leaves the pitch when the arc takes the hip out of reach; the other foot unloads during the push
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
  const g = { pose, phase, sub, clipT, ikW, rootM, facing, authored, mode, side: desc.side, reachHand: sideL ? "L" : "R", axis: null, locks, brace, landing: null, flight: null, pres: { dx: 0, dy: 0, dm: 0 } };
  const pelOff = skel.byName.pelvis.off, invRoot = M4.invertRigid(rootM);
  const worldPelvis = (p) => M4.transformPoint(rootM, V3.add(pelOff, p._pelvis || [0, 0, 0]));
  const setPelvisWorld = (p, W) => { p._pelvis = V3.sub(M4.transformPoint(invRoot, W), pelOff); };
  if (c && dive && authored) {
    const axis = gkGraphAxis(desc, rootM, skel); g.axis = axis;
    if (mode === "pre") {
      g.pose = gkGraphRedirect(g.pose, axis, clipT); state.plan = null;
      // launch plan at the plant: from here the pelvis follows ONE planned trajectory (push → toe-off → arc through the solved
      // full-extension pelvis at execEnd → on through contact). Before the plant the authored crouch + the simulation root move it.
      if (!state.launch && clipT >= GK_GRAPH.plantU) {
        const W0 = worldPelvis(g.pose), pv = state.prevPel, v0 = pv && desc.now - pv.t > 1e-4 && desc.now - pv.t < 0.1 ? V3.scale(V3.sub(W0, pv.W), 1 / (desc.now - pv.t)) : [0, 0, 0];
        const rootMEnd = gkRootMatrix(c.rootEnd ? c.rootEnd[0] : desc.simRoot[0], c.rootEnd ? c.rootEnd[1] : desc.simRoot[1], facing, 0), axisEnd = gkGraphAxis(desc, rootMEnd, skel);
        state.launch = gkLaunchPlan(axisEnd, rootMEnd, W0, v0, desc.now, c.t0 + GK_GRAPH.toeOff * c.execTime, c.t0 + c.execTime);
      }
      if (state.launch) { const St = gkLaunchState(state.launch, desc.now); setPelvisWorld(g.pose, St.W); g.flight = St; }
      state.endPose = g.pose; state.endAxis = axis;
    }
    else if (mode === "post") {
      const endPose = state.endPose || gkGraphRedirect(M(gkSampleKeys(clip.pre, 1, named)), axis, 1), ax = state.endAxis || axis;
      if (!state.launch) { const W0 = worldPelvis(endPose); state.launch = gkLaunchPlan(ax, rootM, W0, [0, 0, 0], desc.now - 0.30, desc.now - 0.20, desc.now); }   // fallback (no plant tick was evaluated): a short arc from where the body is
      if (!state.plan) state.plan = gkLandingPlan(skel, clip, state.launch, ax, rootM);
      const plan = state.plan, L = gkLandingState(plan, desc.now); g.landing = { plan, L };
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
      setPelvisWorld(shape, [L.H[0], L.h, L.H[1]]);                                          // every stage's pelvis position is owned by the landing state (position- and velocity-continuous)
      if (L.stage === "FOLLOW" || L.stage === "DESCENT") g.flight = gkLaunchState(plan.launch, desc.now);
      g.pose = shape; g.phase = L.stage; g.sub = shape._name || L.stage;
      const feetStyle = w < 0.5, R = g.reachHand, O = R === "R" ? "L" : "R";
      if (L.stage === "FOLLOW" || L.stage === "DESCENT") locks = { R: 0, L: 0 };
      else if (L.stage === "IMPACT") locks = feetStyle ? { R: 1, L: 1, at: "touch" } : { R: 0, L: 0 };                        // the feet stay where they landed while the momentum carries the body over them
      else if (L.stage === "ABSORB") locks = { R: 0, L: 0 };                                                                    // the body goes down onto the side and slides: the feet drag with it
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
  } else { state.endPose = null; state.endAxis = null; state.plan = null; state.launch = null; }
  state.prevPel = { t: desc.now, W: worldPelvis(g.pose) };                                    // for the launch plan's velocity continuity at the plant
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
  const legMax = skel.byName.thigh_R.len + skel.byName.shin_R.len;
  const reachCap = (side, Pt) => { const hip = fk.joint[skel.byName["thigh_" + side].idx]; return 1 - smooth01((V3.dist(hip, Pt) - (legMax - 0.02)) / 0.08); };   // a planted foot stays planted only while the leg can reach it: release = full extension, never a timer
  const plantFeet = () => { for (const side of ["R", "L"]) { const st = state.feet[side]; let w = clamp01(want[side] || 0); if (st && st.locked && st.P && w > 0) w = Math.min(w, reachCap(side, st.Pnow || st.P)); if (st && st.locked && st.P && w > 0) { const hip = fk.joint[skel.byName["thigh_" + side].idx]; const kj = fk.joint[skel.byName["shin_" + side].idx], knee = [kj[0], Math.max(kj[1], 0.12), kj[2]]; const pole = V3.lerp(knee, [hip[0] + fwd[0] * 0.5, hip[1] + 0.3, hip[2] + fwd[2] * 0.5], w);   /* knees bend forward-up, never into the pitch; a fading lock keeps the authored bend plane */ const Pt = st.Pnow || st.P; const r = skelIK2(skel, fk, "thigh_" + side, "shin_" + side, "foot_" + side, Pt, w, pole, 0); flattenFoot(side, w); diag.feet[side] = { locked: w > 0.05, w: +w.toFixed(2), residual: +r.residual.toFixed(3), P: Pt }; } } };
  for (const side of ["R", "L"]) {
    const fb = skel.byName["foot_" + side], ankle = fk.joint[fb.idx]; const w = clamp01(want[side] || 0); const st = state.feet[side] || { locked: false, P: null };
    if (w > 0 && (!st.locked || state.lockStage !== stage)) {
      let P;
      const sc = g.landing ? g.landing.plan.stopC : [0, 0], Rc = GK_GRAPH.recon;                // stop point (character frame); support points sit where the pelvis is heading in each stage
      if (L.at === "stance") { const spread = (side === "R" ? 1 : -1) * 0.20; P = M4.transformPoint(g.rootM, [spread + sc[0] * (1 - Rc.crouch) * 0.7, ankleH, sc[1] * (1 - Rc.crouch) * 0.7 + 0.02]); }
      else if (L.at === "front" && g.landing) { const f = 1 - Rc.halfKneel - 0.10; if (side === h && st.P) P = st.P.slice(); else P = M4.transformPoint(g.rootM, [sc[0] * f + (side === "R" ? 1 : -1) * 0.14, ankleH, sc[1] * f + 0.12]); }   // half-kneel: the front foot steps toward the simulation root, ahead of where the pelvis will be; the kneeling foot keeps its tucked point
      else if (L.at === "tuck" && g.landing) { const pl = g.landing.plan, px = (pose._pelvis ? pose._pelvis[0] : 0), pz = (pose._pelvis ? pose._pelvis[2] : 0); const bottom = side === h; P = M4.transformPoint(g.rootM, [px - pl.dirSign * (bottom ? 0.42 : 0.34), ankleH, pz + (bottom ? -0.10 : 0.16)]); }   // lying / brace: feet tucked behind the hips
      else P = [ankle[0], ankleH, ankle[2]];
      if (st.locked && st.P) { st.from = st.P.slice(); st.fromT = desc.now; }                    // re-plant: blend from the previous plant point (no foot teleport)
      st.locked = true; st.P = P; st.since = desc.now;
    }
    if (st.locked && st.from && st.fromT != null) { const bt = clamp01((desc.now - st.fromT) / 0.2); st.Pnow = V3.lerp(st.from, st.P, smooth01(bt)); if (V3.dist(st.from, st.P) > 0.12) st.Pnow[1] += 0.10 * Math.sin(Math.PI * bt); /* a re-plant further than a shuffle is a STEP: the foot lifts over its move */ if (bt >= 1) { st.from = null; st.Pnow = st.P; } } else st.Pnow = st.P;
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
  // a LEG below the pitch bends at the knee (foot floored by leg IK, authored bend plane kept); only the body core lifts the pelvis —
  // the planned pelvis trajectory (push → arc → slide) must never be displaced by an authored leg poking through the ground
  const floored = {}; const deepest = () => { let minY = 1e9, minB = null; for (const b of skel.bones) { if (!b.part || CLAMP_SKIP[b.name]) continue; const m = /^(thigh|shin|foot)_([RL])$/.exec(b.name); if (m && floored[m[2]]) continue; const v = Math.min(fk.joint[b.idx][1] - b.rad * 0.6, fk.tip[b.idx][1] - b.rad * 0.6); if (v < minY) { minY = v; minB = b.name; } } return { minY, minB }; };
  for (let pass = 0; pass < 3; pass++) {
    const { minY, minB } = deepest(); if (minY >= 0) break;
    const m = /^(shin|foot)_([RL])$/.exec(minB);
    if (m) { const side = m[2], fb = skel.byName["foot_" + side], ankle = fk.joint[fb.idx], kj = fk.joint[skel.byName["shin_" + side].idx]; const Pt = [ankle[0], Math.max(ankle[1] - minY, ankleH), ankle[2]]; skelIK2(skel, fk, "thigh_" + side, "shin_" + side, "foot_" + side, Pt, 1, [kj[0], Math.max(kj[1], 0.12), kj[2]], 0); floored[side] = true; diag.legFloor = (diag.legFloor || "") + side + ":" + (-minY).toFixed(2) + " "; if (diag.feet[side]) diag.feet[side].floored = true; continue; }
    pel.off[1] -= minY; diag.ground = +(-minY).toFixed(3); diag.groundBone = minB; fk = skelFK(skel, pose, g.rootM); plantFeet(); break;
  }
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
  if (dm > GK_GRAPH.presMaxM) { dx *= GK_GRAPH.presMaxM / dm; dy *= GK_GRAPH.presMaxM / dm; }   // presMaxM is a sanity cap only (a full dive + slide legitimately carries the body well past the simulation root)
  g.pres = { dx, dy, dm: Math.min(dm, GK_GRAPH.presMaxM), x: desc.simRoot[0] + dx, y: desc.simRoot[1] + dy };
  return { fk, diag };
}
