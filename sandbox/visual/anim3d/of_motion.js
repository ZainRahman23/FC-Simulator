// ═══ anim3d/of_motion.js — OUTFIELD DIAGNOSTIC MOTION SET + RETARGETING + CONTACT SOLVE (presentation only) ═══
// The smallest motion set that proves the shared-skeleton / per-player-morphology architecture: neutral stand, ready stance, walk, run
// (a parametric gait whose STRIDE comes from the player's own leg length and the AUTHORITATIVE speed), turning, a planted single-leg
// pose, and a lower-body football movement reused from the existing library (the goalkeeper's punt keys, rotation-only). Poses are
// rotation-only eulers on the shared hierarchy; every metre-valued quantity (pelvis offset, stride, plant point, foot height) is derived
// from the player's morphology (leg length) — never from a shared reference height — so a tall body is never forced into a short body's
// stride and a short body never floats on a tall body's pelvis height. The authoritative displacement is INPUT: the presentation root
// follows the simulation root exactly (no presentation root offset in locomotion), the planted foot is locked in the world and the leg
// IK explains the displacement; when the simulation moves faster than the gait's stride × cadence can explain, the residual (foot slide
// or leg over-reach) is EXPOSED in the diagnostics, never hidden by moving the root.
const OF_GAIT = { walkA: 22, runA: 34, walkKnee: 38, runKnee: 78, walkSpeed: 1.6, runSpeed: 5.5, stanceFrac: 0.5, plantBlendT: 0.08, armSwingWalk: 22, armSwingRun: 42, bobWalk: 0.012, bobRun: 0.035, leanRun: 10 };
const OF_STAND = { name: "STAND", pelvis: [0, 0, 0], spine: [0, 0, 0], chest: [0, 0, 0], upperArm_R: [0, 0, 8], upperArm_L: [0, 0, -8], foreArm_R: [-6, 0, 0], foreArm_L: [-6, 0, 0], _pelvis: [0, 0, 0] };
const OF_READY = { name: "READY", _pelvis: [0, -0.20, 0.02], pelvis: [22, 0, 0], spine: [8, 0, 0], chest: [4, 0, 0], neck: [-8, 0, 0], head: [-12, 0, 0], thigh_R: [-44, 0, 10], shin_R: [58, 0, 0], foot_R: [-14, 0, 0], thigh_L: [-44, 0, -10], shin_L: [58, 0, 0], foot_L: [-14, 0, 0], upperArm_R: [-20, 0, 30], foreArm_R: [-60, 0, 0], upperArm_L: [-20, 0, -30], foreArm_L: [-60, 0, 0] };   // athletic stance authored @ H_REF legs (pelvis offset = metres @ OF_H_REF leg length)
const OF_SINGLE_LEG = { name: "SINGLE_LEG", _pelvis: [0.04, -0.06, 0], pelvis: [12, 0, -6], spine: [6, 0, 4], chest: [4, 0, 2], thigh_R: [-8, 0, 6], shin_R: [16, 0, 0], foot_R: [-8, 0, 0], thigh_L: [-84, 0, -8], shin_L: [92, 0, 0], foot_L: [20, 0, 0], upperArm_R: [-30, 0, 40], foreArm_R: [-40, 0, 0], upperArm_L: [-20, 0, -40], foreArm_L: [-30, 0, 0] };   // planted RIGHT leg, LEFT knee lifted
const OF_REF_LEG = (OF_SEG_REF.thigh + OF_SEG_REF.shin) * OF_H_REF;                                // the reference leg length the authored metre offsets are exact for
// stride model: stride per step from the leg length and the gait amplitude; cadence from the authoritative speed (a taller player takes
// longer strides at a lower cadence for the same speed — the stride is HIS, the speed is the simulation's)
function ofGaitParams(skel, speed) {
  const v = Math.max(0, speed), run = v > 3.2, k = run ? clamp01((v - 3.2) / (OF_GAIT.runSpeed - 3.2)) : clamp01(v / OF_GAIT.walkSpeed);
  const A = run ? lerp(OF_GAIT.walkA, OF_GAIT.runA, k) : lerp(8, OF_GAIT.walkA, k), knee = run ? lerp(OF_GAIT.walkKnee, OF_GAIT.runKnee, k) : lerp(12, OF_GAIT.walkKnee, k);
  const stride = 2 * skel.legLen * Math.sin(A * DEG) * (run ? 1.15 : 0.92);                       // metres per STEP (heel to heel of the two feet)
  const cadence = stride > 1e-6 ? v / stride : 0;                                                   // steps per second
  return { v, run, k, A, knee, stride, cadence, armSwing: run ? lerp(OF_GAIT.armSwingWalk, OF_GAIT.armSwingRun, k) : lerp(6, OF_GAIT.armSwingWalk, k), bob: run ? lerp(OF_GAIT.bobWalk, OF_GAIT.bobRun, k) : lerp(0, OF_GAIT.bobWalk, k) * skel.legLen / OF_REF_LEG, lean: run ? OF_GAIT.leanRun * k : 0 };
}
// gait pose at cycle phase u (0..1 = one full cycle of two steps): R leg leads at u = 0
function ofGaitPose(skel, gp, u) {
  const P = { name: gp.run ? "RUN" : "WALK" }, tw = Math.PI * 2;
  const leg = (sd, ph) => { const s = Math.sin(ph * tw), c = Math.cos(ph * tw); const hip = -gp.A * s;   // hip flexion: forward at the start of stance
    const swing = clamp01(-Math.sin(ph * tw - 0.15)); const kneeSwing = gp.knee * swing * swing; const kneeStance = gp.run ? 14 + 12 * Math.max(0, c) : 6 + 8 * Math.max(0, c);
    const kn = Math.max(kneeSwing, kneeStance); const ft = gp.run ? -8 - 14 * Math.max(0, -s) : -4 - 8 * Math.max(0, -s);
    P["thigh_" + sd] = [hip, 0, sd === "R" ? 3 : -3]; P["shin_" + sd] = [kn, 0, 0]; P["foot_" + sd] = [ft, 0, 0]; };
  leg("R", u); leg("L", u + 0.5);
  const armR = gp.armSwing * Math.sin(u * tw + Math.PI), armL = gp.armSwing * Math.sin(u * tw);   // arms counter-swing the legs
  P.upperArm_R = [armR, 0, 10]; P.upperArm_L = [armL, 0, -10]; P.foreArm_R = [gp.run ? -80 : -25, 0, 0]; P.foreArm_L = [gp.run ? -80 : -25, 0, 0];
  P.pelvis = [gp.lean * 0.4 + 4, 4 * Math.sin(u * tw), 3 * Math.sin(u * tw)]; P.spine = [gp.lean * 0.4, -3 * Math.sin(u * tw), 0]; P.chest = [gp.lean * 0.2, -3 * Math.sin(u * tw), 0]; P.neck = [-gp.lean * 0.5, 0, 0]; P.head = [-gp.lean * 0.5, 0, 0];
  P._pelvis = [0, -0.02 * skel.legLen / OF_REF_LEG - gp.bob * Math.abs(Math.sin(u * tw)), 0];        // slight crouch + a bob at each stance (metres from this player's legs)
  return P;
}
// pelvis offsets authored in metres @ the reference leg length → this player's legs (vertical AND horizontal: the body's own scale)
function ofRetargetPelvis(skel, pose) { const k = skel.legLen / OF_REF_LEG; const q = Object.assign({}, pose); q._pelvis = V3.scale(pose._pelvis || [0, 0, 0], k); return q; }
// stance / swing per foot at cycle phase u: stance while the foot is on the ground (front half of its cycle)
function ofStance(u, sd) { const ph = ((sd === "R" ? u : u + 0.5) % 1 + 1) % 1; return ph >= 0.25 && ph < 0.25 + OF_GAIT.stanceFrac; }   // heel strike when the leg is fully forward, toe-off when fully back
// ── CONTACT SOLVE (presentation only): FK → planted feet locked in the WORLD by leg IK (knee forward pole) → sole flat → ground clamp on
//    the body core → diagnostics (slide, float, penetration, over-reach, knee angle, discontinuity). Never moves the root.
function ofSolve(skel, pose, rootM, plants, state, opts) {
  const pel = skel.byName.pelvis, saved = pel.off.slice(); const pd = pose._pelvis || [0, 0, 0]; pel.off = [saved[0] + pd[0], saved[1] + pd[1], saved[2] + pd[2]];
  let fk = skelFK(skel, pose, rootM); const diag = { feet: {}, ground: 0, knee: {}, elbow: {}, jump: 0 }; const ankleH = skel.ankleH;
  const lockLeg = (sd, P, w) => { const st = state.feet[sd]; const kj = fk.joint[skel.byName["shin_" + sd].idx], hip = fk.joint[skel.byName["thigh_" + sd].idx], fwd = M4.transformDir(rootM, [0, 0, 1]);
    const pole = [hip[0] + fwd[0] * 0.5, Math.max(kj[1], hip[1] - 0.2), hip[2] + fwd[2] * 0.5];    // knees bend forward, never into the pitch
    const r = skelIK2(skel, fk, "thigh_" + sd, "shin_" + sd, "foot_" + sd, P, w, pole, 0, st.mem); return r; };
  const flatten = (sd, w) => { const fb = skel.byName["foot_" + sd], m = fk.world[fb.idx], cur = V3.norm(M4.transformDir(m, fb.dir)); const hz = V3.norm([cur[0], 0, cur[2]]); if (V3.len([cur[0], 0, cur[2]]) < 1e-4) return;
    const des = V3.norm(V3.add(V3.scale(hz, 0.954), [0, -0.3, 0])); const ang = Math.acos(Math.max(-1, Math.min(1, V3.dot(cur, des)))); if (ang < 1e-4) return; const R = M4.axisAngle(V3.norm(V3.cross(cur, des)), ang * w), o = M4.origin(m);
    const m2 = M4.mul(M4.translate(o[0], o[1], o[2]), M4.mul(R, M4.mul(M4.translate(-o[0], -o[1], -o[2]), m))); const d = M4.mul(m2, M4.invertRigid(m)); const apply = (b) => { fk.world[b.idx] = M4.mul(d, fk.world[b.idx]); fk.joint[b.idx] = M4.origin(fk.world[b.idx]); fk.tip[b.idx] = M4.transformPoint(fk.world[b.idx], V3.scale(b.dir, b.len)); for (const c of b.children) apply(c); }; apply(fb); };
  const TB = Math.min(OF_GAIT.plantBlendT, opts.stanceT ? 0.25 * opts.stanceT : OF_GAIT.plantBlendT), now = opts.now;   // the blend is a quarter of the stance at most (a running stance is short)
  for (const sd of ["R", "L"]) {                                                                 // plant state: lock weight blends in at the stance start and out at its end (never a cut)
    const st = state.feet[sd] || (state.feet[sd] = { locked: false, P: null, mem: {}, w: 0 }); const want = plants[sd]; const ankle = fk.joint[skel.byName["foot_" + sd].idx];
    if (want && !st.locked) { st.locked = true; st.P = [ankle[0], ankleH, ankle[2]]; st.t0 = state.prevJL ? now : now - TB; st.rel = null; }        // the plant point = the authored foot projected to the pitch, where the foot IS (no teleport); a fresh actor plants instantly
    if (!want && st.locked && st.rel == null) st.rel = now;
    if (st.locked && st.rel != null && now - st.rel >= TB) { st.locked = false; st.P = null; st.rel = null; }
    st.w = st.locked ? (st.rel == null ? clamp01((now - st.t0) / TB) : 1 - clamp01((now - st.rel) / TB)) : 0;
    if (st.locked && st.w > 0) { const hip = fk.joint[skel.byName["thigh_" + sd].idx]; const cap = 1 - smooth01((V3.dist(hip, st.P) - (skel.legLen - 0.02)) / 0.08); st.w *= clamp01(cap); if (cap <= 0 && st.rel == null) st.rel = now; }   // a plant the leg can no longer reach lets go (the residual is exposed, the leg is never stretched to it)
  }
  // pelvis follows the plants: lower the pelvis (never raise it) by the least amount that keeps every planted foot within the leg's reach (a 3 % knee margin) —
  // the stride is the body's own; a tall body's hips ride higher than a short body's at the same stride because its legs are longer
  { let drop = 0; for (const sd of ["R", "L"]) { const st = state.feet[sd]; if (!(st && st.locked && st.w > 0)) continue; const hip = fk.joint[skel.byName["thigh_" + sd].idx]; const dH = Math.hypot(hip[0] - st.P[0], hip[2] - st.P[2]); const reach = 0.97 * skel.legLen; const maxUp = Math.sqrt(Math.max(0, reach * reach - dH * dH)); const need = (hip[1] - st.P[1]) - maxUp; if (need > 0) drop = Math.max(drop, need * st.w); }
    if (drop > 1e-6) { pel.off[1] -= drop; fk = skelFK(skel, pose, rootM); diag.pelvisDrop = +drop.toFixed(4); } }
  for (const sd of ["R", "L"]) {
    const st = state.feet[sd]; const ankle = fk.joint[skel.byName["foot_" + sd].idx];
    if (st.locked && st.w > 0) { const r = lockLeg(sd, st.P, st.w); flatten(sd, st.w); const a2 = fk.joint[skel.byName["foot_" + sd].idx];
      diag.feet[sd] = { locked: true, w: +st.w.toFixed(2), slide: +V3.dist([a2[0], 0, a2[2]], [st.P[0], 0, st.P[2]]).toFixed(4), residual: +r.residual.toFixed(4), overReach: r.reached ? 0 : +r.residual.toFixed(4), soleY: +(a2[1] - ankleH).toFixed(4) }; }
    else diag.feet[sd] = { locked: false, soleY: +(ankle[1] - ankleH).toFixed(4) };
  }
  // ground clamp: nothing of the body core / legs below the pitch (the toe of a swinging foot is the usual offender — the leg is lifted at the knee, the core only if a bone is under)
  let minY = 1e9, minB = null; for (const b of skel.bones) { if (!b.part || /^(hand|foreArm|upperArm|clavicle)_/.test(b.name)) continue; const v = Math.min(fk.joint[b.idx][1], fk.tip[b.idx][1]) - (/^(foot|toe)_/.test(b.name) ? 0.01 : b.rad * 0.6); if (v < minY) { minY = v; minB = b.name; } }
  if (minY < 0) { const m = /^(shin|foot|toe)_([RL])$/.exec(minB); if (m && !(state.feet[m[2]] && state.feet[m[2]].locked)) { const sd = m[2], ankle = fk.joint[skel.byName["foot_" + sd].idx]; lockLeg(sd, [ankle[0], ankle[1] - minY, ankle[2]], 1); diag.legFloor = (diag.legFloor || "") + sd + ":" + (-minY).toFixed(3) + " "; } else { pel.off[1] -= minY; diag.ground = +(-minY).toFixed(4); fk = skelFK(skel, pose, rootM); for (const sd of ["R", "L"]) if (state.feet[sd] && state.feet[sd].locked) { lockLeg(sd, state.feet[sd].P, 1); flatten(sd, 1); } } }
  // joint diagnostics: knee / elbow included angles (limits), and the per-tick joint jump (discontinuity detector: max joint displacement vs last tick)
  for (const sd of ["R", "L"]) { const J = (n) => fk.joint[skel.byName[n].idx]; const ang = (a, b, c) => Math.acos(Math.max(-1, Math.min(1, V3.dot(V3.norm(V3.sub(a, b)), V3.norm(V3.sub(c, b)))))) / DEG; diag.knee[sd] = +ang(J("thigh_" + sd), J("shin_" + sd), J("foot_" + sd)).toFixed(1); diag.elbow[sd] = +ang(J("upperArm_" + sd), J("foreArm_" + sd), J("hand_" + sd)).toFixed(1); }
  { const inv = M4.invertRigid(rootM), JL = fk.joint.map(p => M4.transformPoint(inv, p)); if (state.prevJL) { let mx = 0; for (let i = 0; i < JL.length; i++) mx = Math.max(mx, V3.dist(JL[i], state.prevJL[i])); diag.jump = +mx.toFixed(4); } state.prevJL = JL; }   // discontinuity: joint motion in the ROOT frame (the authoritative displacement is not a jump)
  pel.off = saved; return { fk, diag };
}
// one diagnostic actor: authoritative state (root x/y on the pitch, facing, speed) is INPUT; the actor holds only presentation state
function ofActorMake(bodyId, x, y, facing) { const m = OF_BODIES[bodyId]; const skel = ofBuildSkeleton(m); return { body: bodyId, skel, x, y, facing, speed: 0, phase: 0, state: { feet: {} }, motion: "STAND", turnFrom: null }; }
// evaluate one tick: motion + retarget + solve. dt is the authoritative fixed step; the caller advanced x / y / facing / speed (the "simulation")
function ofActorTick(a, dt, now) {
  const rootM = gkRootMatrix(a.x, a.y, a.facing, 0); let pose, plants = { R: false, L: false };
  if (a.motion === "STAND") pose = ofRetargetPelvis(a.skel, OF_STAND), plants = { R: true, L: true };
  else if (a.motion === "READY") pose = ofRetargetPelvis(a.skel, OF_READY), plants = { R: true, L: true };
  else if (a.motion === "SINGLE_LEG") pose = ofRetargetPelvis(a.skel, OF_SINGLE_LEG), plants = { R: true, L: false };
  else if (a.motion === "PUNT" && typeof GK_MOTIONS !== "undefined" && GK_MOTIONS.DIST_PUNT_R) {   // the existing library's lower-body football movement (rotation-only keys), pelvis offsets retargeted to this body's legs
    const mo = GK_MOTIONS.DIST_PUNT_R, keys = mo.prep.concat(mo.fall || [], mo.follow || []); const T = a.phase % 1; let k0 = keys[0], k1 = keys[keys.length - 1];
    for (let i = 0; i < keys.length - 1; i++) if (T >= keys[i][0] && T <= keys[i + 1][0]) { k0 = keys[i]; k1 = keys[i + 1]; break; }
    const tt = k1[0] > k0[0] ? (T - k0[0]) / (k1[0] - k0[0]) : 0; const strip = (p) => { const q = {}; for (const kk in p) if (!kk.startsWith("_") && kk !== "name") q[kk] = p[kk]; return q; };
    pose = poseLerp(strip(k0[1]), strip(k1[1]), smooth01(tt)); pose._pelvis = V3.scale(V3.lerp(k0[1]._pelvis || [0, 0, 0], k1[1]._pelvis || [0, 0, 0], smooth01(tt)), a.skel.legLen / ((0.24 + 0.22) * 1.90)); plants = { R: T < 0.45 || T > 0.86, L: true }; a.phase += dt / 2.2;
  } else {                                                                                       // WALK / RUN / TURN: the gait from the authoritative speed; the cycle phase advances by the cadence
    const gp = ofGaitParams(a.skel, a.speed); if (gp.cadence > 0) a.phase = (a.phase + dt * gp.cadence / 2) % 1;   // one cycle = two steps
    pose = gp.v < 0.05 ? ofRetargetPelvis(a.skel, OF_STAND) : ofGaitPose(a.skel, gp, a.phase); plants = gp.v < 0.05 ? { R: true, L: true } : { R: ofStance(a.phase, "R"), L: ofStance(a.phase, "L") }; a.gait = gp;
  }
  const sol = ofSolve(a.skel, pose, rootM, plants, a.state, { now, stanceT: a.gait && a.gait.cadence > 0 ? OF_GAIT.stanceFrac * 2 / a.gait.cadence : null }); a.pose = pose; a.rootM = rootM; a.sol = sol;
  a.skinMats = new Float32Array(a.skel.bones.length * 16); skelSkinMatrices(a.skel, sol.fk, a.skel.invBind).forEach((m, i) => a.skinMats.set(m, i * 16));
  return sol;
}
