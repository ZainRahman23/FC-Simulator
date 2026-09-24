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
const OF_GAIT = { walkA: 22, runA: 34, walkKnee: 38, runKnee: 78, walkSpeed: 1.6, runSpeed: 5.5, stanceFrac: 0.5, plantBlendT: 0.08, releaseT: 0.07, settleT: 0.05, stanceReach: 0.978, kneePlaneStep: 0.18, reachMax: 0.20, reachT: 0.12, plantY: 0.03, plantWaitT: 0.09, maxDrop: 0.14, dropRate: 1.2, groundRate: 1.5, relSpeed: 6.0, relTmax: 0.26, divergeM: 0.35, armSwingWalk: 22, armSwingRun: 42, bobWalk: 0.012, bobRun: 0.035, leanRun: 10 };
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
  let fk = skelFK(skel, pose, rootM); const diag = { feet: {}, ground: 0, knee: {}, elbow: {}, jump: 0, reach: {} }; const ankleH = skel.ankleH;
  const lockLeg = (sd, P, w, keepPlane) => { const st = state.feet[sd]; const kj = fk.joint[skel.byName["shin_" + sd].idx], hip = fk.joint[skel.byName["thigh_" + sd].idx], fwd = M4.transformDir(rootM, [0, 0, 1]);
    // a PLANTED leg takes the forward-knee pole; a SWING leg being nudged by the ground clamp keeps its own authored bend plane (pole null) —
    // forcing a swing leg onto the planted pole re-poses the whole leg, so a 5 mm floor correction would flip the knee by ~100°
    const pole = keepPlane ? null : [hip[0] + fwd[0] * 0.5, Math.max(kj[1], hip[1] - 0.2), hip[2] + fwd[2] * 0.5];
    const mem = keepPlane ? (st.memF || (st.memF = {})) : st.mem; mem.maxPlane = OF_GAIT.kneePlaneStep;   // a planted leg near full extension has an ill-conditioned knee plane: bound how far it may orbit per tick
    const r = skelIK2(skel, fk, "thigh_" + sd, "shin_" + sd, "foot_" + sd, P, w, pole, 0, mem); return r; };
  const aimToe = (sd, T, w) => {                                                                  // TOE pivot: rotate the foot about the (solved) ankle so its toe tip lands on the locked toe point — the heel rises with the authored plantar-flexion, the toe stays put
    const fb = skel.byName["foot_" + sd], tb = skel.byName["toe_" + sd], m = fk.world[fb.idx], o = M4.origin(m); const cur = V3.sub(fk.tip[tb.idx], o), des = V3.sub(T, o); if (V3.len(cur) < 1e-5 || V3.len(des) < 1e-5) return;
    const cn = V3.norm(cur), dn = V3.norm(des), ang = Math.acos(Math.max(-1, Math.min(1, V3.dot(cn, dn)))); if (ang < 1e-4) return; const ax = V3.cross(cn, dn); if (V3.len(ax) < 1e-6) return; const R = M4.axisAngle(V3.norm(ax), ang * w);
    const m2 = M4.mul(M4.translate(o[0], o[1], o[2]), M4.mul(R, M4.mul(M4.translate(-o[0], -o[1], -o[2]), m))); const d = M4.mul(m2, M4.invertRigid(m)); const apply = (b) => { fk.world[b.idx] = M4.mul(d, fk.world[b.idx]); fk.joint[b.idx] = M4.origin(fk.world[b.idx]); fk.tip[b.idx] = M4.transformPoint(fk.world[b.idx], V3.scale(b.dir, b.len)); for (const c of b.children) apply(c); }; apply(fb); };
  const flatten = (sd, w) => { const fb = skel.byName["foot_" + sd], m = fk.world[fb.idx], cur = V3.norm(M4.transformDir(m, fb.dir)); const hz = V3.norm([cur[0], 0, cur[2]]); if (V3.len([cur[0], 0, cur[2]]) < 1e-4) return;
    const des = V3.norm(V3.add(V3.scale(hz, 0.954), [0, -0.3, 0])); const ang = Math.acos(Math.max(-1, Math.min(1, V3.dot(cur, des)))); if (ang < 1e-4) return; const R = M4.axisAngle(V3.norm(V3.cross(cur, des)), ang * w), o = M4.origin(m);
    const m2 = M4.mul(M4.translate(o[0], o[1], o[2]), M4.mul(R, M4.mul(M4.translate(-o[0], -o[1], -o[2]), m))); const d = M4.mul(m2, M4.invertRigid(m)); const apply = (b) => { fk.world[b.idx] = M4.mul(d, fk.world[b.idx]); fk.joint[b.idx] = M4.origin(fk.world[b.idx]); fk.tip[b.idx] = M4.transformPoint(fk.world[b.idx], V3.scale(b.dir, b.len)); for (const c of b.children) apply(c); }; apply(fb); };
  const TB = Math.min(OF_GAIT.plantBlendT, opts.stanceT ? 0.25 * opts.stanceT : OF_GAIT.plantBlendT), now = opts.now;   // the blend is a quarter of the stance at most (a running stance is short)
  const TBo = OF_GAIT.releaseT;                                                                  // RELEASE: the lock does not fade against a stale point (that pops the foot); the OFFSET the lock was holding decays onto the authored swing — see effP / relOff
  const LC = typeof OF_LOCO !== "undefined" ? OF_LOCO : { stepT: 0.26, stepLift: 0.06, replantM: 0.12, replantDeg: 28 };
  const beginRelease = (sd, st) => {                                                              // hand the foot over to the authored swing: hold the offset the lock had, decay it to zero (never fade the lock weight against a stale point)
    if (st.rel != null) return; st.rel = now;
    const ank = fk.joint[skel.byName["foot_" + sd].idx], tip = fk.tip[skel.byName["toe_" + sd].idx];
    const aA = st.lastA || ank, aT = st.lastT || tip; st.relOff = V3.sub(aA, ank);
    // the foot ORIENTATION is handed over as a decaying ROTATION, not as an aim point: a reversal's held toe can be a metre away and aiming
    // the foot at it would spin the foot to point there
    { const c = V3.sub(tip, ank), d = V3.sub(aT, aA); st.relAng = 0; st.relAx = null;
      if (V3.len(c) > 1e-5 && V3.len(d) > 1e-5) { const cn = V3.norm(c), dn = V3.norm(d), ax = V3.cross(cn, dn);
        if (V3.len(ax) > 1e-6) { st.relAx = V3.norm(ax); st.relAng = Math.acos(Math.max(-1, Math.min(1, V3.dot(cn, dn)))); } } }
    st.relT = Math.min(OF_GAIT.relTmax, Math.max(TBo, V3.len(st.relOff) / OF_GAIT.relSpeed)); };   // a plant the body has run away from (a reversal) hands over a long offset: stretch the hand-over so the foot's own speed stays bounded instead of whipping it in 4 ticks
  const relK = (st) => smooth01(clamp01((now - st.rel) / (st.relT || TBo)));                                  // release progress 0 (still where the lock left it) → 1 (fully on the authored swing)
  const effP = (sd, st) => {                                                                     // the ankle target of a lock: the locked ankle, or (TOE pivot) the ankle that puts the CURRENT foot's toe on the locked toe point
    if (st.rel != null && st.relOff) {                                                            // releasing: authored ankle + the decaying offset, never further from the hip than the leg can reach (a reversal hands over a metre of offset — stretching the leg straight to hold it is a worse artefact than letting go)
      const T = V3.add(fk.joint[skel.byName["foot_" + sd].idx], V3.scale(st.relOff, 1 - relK(st)));
      const hip = fk.joint[skel.byName["thigh_" + sd].idx], d = V3.sub(T, hip), dl = V3.len(d), rch = OF_GAIT.stanceReach * skel.legLen;
      return dl > rch ? V3.add(hip, V3.scale(d, rch / dl)) : T; }
    if (st.mode === "toe" && st.T) { const fb = skel.byName["foot_" + sd], tb = skel.byName["toe_" + sd]; const d = V3.sub(fk.tip[tb.idx], fk.joint[fb.idx]); const P = V3.sub(st.T, d); if (P[1] < ankleH) P[1] = ankleH; return P; }
    if (st.yT != null && now - st.yT < OF_GAIT.settleT) return [st.P[0], lerp(st.y0, st.P[1], smooth01((now - st.yT) / OF_GAIT.settleT)), st.P[2]];   // heel strike: the plant's XZ is pinned at once, its HEIGHT settles from where the authored foot was (a landing, not a teleport)
    return st.P; };
  for (const sd of ["R", "L"]) {                                                                 // plant state: lock weight blends in at the stance start and out at its end (never a cut)
    const st = state.feet[sd] || (state.feet[sd] = { locked: false, P: null, mem: {}, w: 0, mode: "ankle", T: null, step: null }); const req = plants[sd]; const want = req && typeof req === "object" ? !!req.want : !!req; const mode = req && typeof req === "object" && req.mode ? req.mode : "ankle";
    const ankle = fk.joint[skel.byName["foot_" + sd].idx], toeTip = fk.tip[skel.byName["toe_" + sd].idx];
    const other = state.feet[sd === "R" ? "L" : "R"];
    if (req && typeof req === "object" && req.stance) {                                          // STANCE point (idle / stop / standing turn): a foot far from it STEPS there (one foot at a time, a lifted arc), never slides
      const D = M4.transformPoint(rootM, [req.stance[0], ankleH, req.stance[1]]);
      // a STANDING TURN rotates the stance points about the pelvis: the arc is short (the stance is narrow), so a distance threshold alone
      // lets the locked foot be dragged round. Replant on the turned ANGLE as well.
      const fwd0 = M4.transformDir(rootM, [0, 0, 1]);
      const turned = () => { if (!st.fwd) return false; const c = st.fwd[0] * fwd0[0] + st.fwd[2] * fwd0[2]; return Math.acos(Math.max(-1, Math.min(1, c))) > LC.replantDeg * Math.PI / 180; };
      if (!st.locked && !st.step) { st.locked = true; st.mode = "ankle"; st.T = null; st.rel = null; const far = V3.dist([ankle[0], 0, ankle[2]], [D[0], 0, D[2]]) > LC.replantM; st.P = [ankle[0], ankleH, ankle[2]]; st.t0 = now - TB; st.fwd = fwd0.slice(); if (far) st.step = { from: st.P.slice(), to: D, t0: now, T: LC.stepT }; }
      else if (st.locked && !st.step && st.rel == null && (V3.dist([st.P[0], 0, st.P[2]], [D[0], 0, D[2]]) > LC.replantM || turned()) && !(other && other.step)) { st.step = { from: st.P.slice(), to: D, t0: now, T: LC.stepT }; st.fwd = fwd0.slice(); }
      else if (st.step) st.step.to = D;                                                          // the stance point follows the facing while the step is in the air
    } else {
      // CONTACT DETECTION: the cycle asks for the plant, the foot takes it when it actually reaches the pitch (or after plantWaitT, so a
      // leg can never float). Planting while the authored foot is still 10 cm up would either hover it or teleport it down.
      if (want && !st.locked) { if (st.wantT == null) st.wantT = now; }
      else if (!want) st.wantT = null;
      if (want && !st.locked && (ankle[1] - ankleH <= OF_GAIT.plantY || now - st.wantT >= OF_GAIT.plantWaitT)) { st.locked = true; st.mode = "ankle"; st.T = null; st.step = null; st.P = [ankle[0], ankleH, ankle[2]]; st.t0 = now - TB; st.rel = null; st.y0 = ankle[1]; st.yT = now; st.pt0 = now; }   // the plant point = the authored foot projected to the pitch, where the foot IS (the authored cycle lands it on the pitch; the lock is immediate — at 8 m/s a two-tick blend is 25 cm of slide)
      if (!want && st.locked && st.rel == null) beginRelease(sd, st);
      // DIVERGENCE: the cycle has taken the foot a long way from the plant (a reversal / a hard turn). Let go NOW, while the offset is still
      // something the leg can absorb — waiting until the plant is at full stretch leaves an offset no hand-over can carry continuously.
      else if (want && st.locked && st.rel == null && !st.step && V3.dist(st.lastA || ankle, ankle) > OF_GAIT.divergeM * skel.legLen) beginRelease(sd, st);
    }
    if (st.step) { const k = clamp01((now - st.step.t0) / st.step.T); const P = V3.lerp(st.step.from, st.step.to, smooth01(k)); P[1] = ankleH + LC.stepLift * skel.legLen * Math.sin(Math.PI * k); st.P = P; st.w = 1; if (k >= 1) { st.P = st.step.to.slice(); st.step = null; st.t0 = now - TB; } }
    if (st.locked && st.rel != null && now - st.rel >= (st.relT || TBo)) { st.locked = false; st.P = null; st.rel = null; st.relOff = null; st.relAx = null; st.relAng = 0; st.relT = null; st.mode = "ankle"; st.T = null; }
    if (st.locked && mode === "toe" && st.mode !== "toe" && st.rel == null && !st.step) { st.mode = "toe"; const tp = st.lastT || toeTip; st.T = [tp[0], Math.max(0.005, Math.min(tp[1], 0.03)), tp[2]]; }   // the pivot is where the toe ACTUALLY is (last tick, flattened + clamped), not where the authored pose puts it — otherwise the foot snaps by the flatten correction   // late stance: the TOE is the pivot — the heel rises with the authored plantar-flexion, the toe stays put
    if (!st.step) st.w = st.locked ? (st.rel == null ? clamp01((now - st.t0) / TB) : 1) : 0;
    st.s = req && typeof req === "object" ? req.s : null;
  }
  // pelvis follows the plants: lower the pelvis (never raise it) by the least amount that keeps every planted foot within the leg's reach (a 3 % knee margin) —
  // the stride is the body's own; a tall body's hips ride higher than a short body's at the same stride because its legs are longer
  // (stanceReach: a heel strike lands on an almost straight leg — a tighter cap would bend the knee ~28° in the contact tick)
  { let drop = 0; for (const sd of ["R", "L"]) { const st = state.feet[sd]; if (!(st && st.locked && st.w > 0)) continue; const hip = fk.joint[skel.byName["thigh_" + sd].idx]; const Pe = effP(sd, st); const dH = Math.hypot(hip[0] - Pe[0], hip[2] - Pe[2]); const reach = OF_GAIT.stanceReach * skel.legLen; const maxUp = Math.sqrt(Math.max(0, reach * reach - dH * dH)); const need = (hip[1] - Pe[1]) - maxUp; if (need > 0) drop = Math.max(drop, need * st.w); }
    drop = Math.min(drop, OF_GAIT.maxDrop * skel.legLen);
    { const dt = Math.max(1 / 240, Math.min(0.1, opts.dt || 1 / 60)), lim = OF_GAIT.dropRate * dt, p0 = state.dropPrev || 0;   // SLEW: the pelvis height is presentation — it may not step. A plant releasing used to hand back its whole drop in one tick
      drop = Math.max(p0 - lim, Math.min(p0 + lim, drop)); state.dropPrev = drop; }                                        // BOUNDED: the body never crouches to chase a plant it has run away from (a 180° reversal used to drop the pelvis 60 cm and fight the ground clamp) — the reach cap below releases that plant instead
    if (drop > 1e-6) { pel.off[1] -= drop; fk = skelFK(skel, pose, rootM); diag.pelvisDrop = +drop.toFixed(4); } }
  for (const sd of ["R", "L"]) { const st = state.feet[sd]; if (st.locked && st.w > 0 && !st.step) { const hip = fk.joint[skel.byName["thigh_" + sd].idx]; const Pe = effP(sd, st); const cap = 1 - smooth01((V3.dist(hip, Pe) - (skel.legLen - 0.01)) / 0.06); if (cap < 0.999 && st.rel == null) beginRelease(sd, st); } }   // (after the pelvis drop) a plant the leg can no longer reach lets go — the residual is exposed, the leg is never stretched to it
  // ONE per-leg application of the contact solve — the ground clamp re-runs exactly this (it used to re-lock against the raw plant point with a
  // full flatten, which discarded the toe pivot and the release and whipped the knee by ~100° for a 5 mm body lift)
  const applyLeg = (sd) => { const st = state.feet[sd]; const rel = st.rel != null && st.relOff, tip0 = fk.tip[skel.byName["toe_" + sd].idx];
    const Pe = effP(sd, st);
    const kS = st.yT != null ? smooth01(clamp01((now - st.yT) / OF_GAIT.settleT)) : 1;              // heel strike → forefoot roll: the sole reaches the pitch over the settle, it does not snap flat in one tick
    const r = lockLeg(sd, Pe, st.w);
    if (rel) { if (!st.step && st.relAx && st.relAng > 1e-4) { const a2 = fk.joint[skel.byName["foot_" + sd].idx], t2 = fk.tip[skel.byName["toe_" + sd].idx], v = V3.sub(t2, a2);
        if (V3.len(v) > 1e-5) aimToe(sd, V3.add(a2, M4.transformDir(M4.axisAngle(st.relAx, st.relAng * (1 - relK(st))), v)), 1); } }
    else if (st.mode === "toe") { if (!st.step) aimToe(sd, st.T, 1); } else if (!st.step) flatten(sd, st.w * kS);
    return { r, rel, Pe }; };
  for (const sd of ["R", "L"]) {
    const st = state.feet[sd]; const ankle = fk.joint[skel.byName["foot_" + sd].idx];
    if (st.locked && st.w > 0) { const { r, rel } = applyLeg(sd);
      const a2 = fk.joint[skel.byName["foot_" + sd].idx], t2 = fk.tip[skel.byName["toe_" + sd].idx];
      const ref = st.mode === "toe" ? [st.T[0], 0, st.T[2]] : [st.P[0], 0, st.P[2]], cur = st.mode === "toe" ? [t2[0], 0, t2[2]] : [a2[0], 0, a2[2]];
      diag.feet[sd] = { locked: true, contact: !rel && !st.step && st.w >= 0.999, w: +st.w.toFixed(2), mode: st.step ? "step" : rel ? "release" : st.mode, s: st.s, slide: +V3.dist(cur, ref).toFixed(4), residual: +r.residual.toFixed(4), overReach: r.reached ? 0 : +r.residual.toFixed(4), soleY: +(a2[1] - ankleH).toFixed(4), toeY: +t2[1].toFixed(4), P: (st.mode === "toe" ? st.T : st.P).slice(), ankle: a2.slice(), toe: t2.slice() }; }
    else { const t2 = fk.tip[skel.byName["toe_" + sd].idx]; diag.feet[sd] = { locked: false, contact: false, mode: "swing", s: st.s, soleY: +(ankle[1] - ankleH).toFixed(4), toeY: +t2[1].toFixed(4), ankle: ankle.slice(), toe: t2.slice() }; }
  }
  // ── BALL REACH (DRIBBLING V1, presentation only) ─────────────────────────────────────────────────────────────────────────────────
  // The simulation has already decided that THIS boot touches the ball at THIS tick. All that happens here is a bounded correction that
  // puts the boot on the ball so the touch can be seen. It never moves the root, never moves the ball, never touches a PLANTED foot, and
  // never exceeds reachMax; if the ball is further away than that the correction saturates and the miss is reported, not hidden.
  for (const sd of ["R", "L"]) {
    const req = plants[sd], st = state.feet[sd];
    if (!req || typeof req !== "object" || !req.reach) continue;
    const want = req.reach.p, w = clamp01(req.reach.w || 0);
    if (w <= 0.001) continue;
    if (st && st.locked && st.w > 0.5 && st.rel == null) { diag.reach[sd] = { skipped: "planted" }; continue; }   // the support foot is never dragged
    const fb = skel.byName["foot_" + sd], tb = skel.byName["toe_" + sd];
    const cap = (req.reach.cap || OF_GAIT.reachMax) * skel.legLen;
    // The ankle target that puts the TOE on the wanted point depends on the foot's CURRENT orientation, and solving the leg changes that
    // orientation. One shot converges only when the foot points roughly along the leg; with an open or turned-in foot (an inside-foot
    // strike, a trivela) it leaves the boot short by a long way, and how short depends on the body's hip width and leg length. Iterating
    // the same solve removes that body dependence entirely — it is the geometry that is wrong, not the proportions.
    let r = null, need = 0, capped = false;
    for (let it = 0; it < (req.reach.iters || 1); it++) {
      const dvec = V3.sub(fk.tip[tb.idx], fk.joint[fb.idx]);                                      // toe-tip offset from the ankle, re-read each pass
      const cur = fk.joint[fb.idx], P0 = V3.sub(want, dvec);
      const off = V3.sub(P0, cur), d = V3.len(off);
      if (it === 0) need = d;
      const P = d > cap ? V3.add(cur, V3.scale(off, cap / d)) : P0;
      if (d > cap) capped = true;
      r = lockLeg(sd, P, w, true);                                                                // keepPlane: a swing leg keeps its own bend plane (no knee flip)
      if (d < 0.004) break;
    }
    const t2 = fk.tip[tb.idx];
    diag.reach[sd] = { want: +need.toFixed(4), applied: +Math.min(need, cap).toFixed(4), capped, w: +w.toFixed(2),
                       residual: +V3.dist(t2, want).toFixed(4), overReach: r.reached ? 0 : +r.residual.toFixed(4) };
  }
  // ground clamp: nothing of the body core / legs below the pitch (the toe of a swinging foot is the usual offender — the leg is lifted at the knee, the core only if a bone is under)
  // SLEW (same reason as the pelvis drop): a one-tick body lift moves every joint, and the hands furthest of all; a few cm of transient
  // penetration reads better than a pop. The lift also decays back to zero once nothing is under the pitch.
  const slewLift = (want) => { const dt2 = Math.max(1 / 240, Math.min(0.1, opts.dt || 1 / 60)), gl = OF_GAIT.groundRate * dt2, g0 = state.groundPrev || 0;
    const v = Math.max(0, Math.max(g0 - gl, Math.min(g0 + gl, want))); state.groundPrev = v; return v; };
  let minY = 1e9, minB = null; for (const b of skel.bones) { if (!b.part || /^(hand|foreArm|upperArm|clavicle)_/.test(b.name)) continue; const mm = /^(foot|toe)_([RL])$/.exec(b.name); const stt = mm && state.feet[mm[2]]; const tol = mm ? (stt && stt.locked && stt.mode === "toe" ? -0.04 : 0.01) : b.rad * 0.6; const v = Math.min(fk.joint[b.idx][1], fk.tip[b.idx][1]) - tol; if (v < minY) { minY = v; minB = b.name; } }   // a pivoting toe sits at ground level by design (its own margin); other feet 1 cm
  if (minY < 0) { const m = /^(shin|foot|toe)_([RL])$/.exec(minB); if (m && !(state.feet[m[2]] && state.feet[m[2]].locked)) { const sd = m[2], ankle = fk.joint[skel.byName["foot_" + sd].idx]; lockLeg(sd, [ankle[0], ankle[1] - minY, ankle[2]], 1, true); diag.legFloor = (diag.legFloor || "") + sd + ":" + (-minY).toFixed(3) + " "; } else { const lift = slewLift(-minY);
      pel.off[1] += lift; diag.ground = +lift.toFixed(4); fk = skelFK(skel, pose, rootM); for (const sd of ["R", "L"]) { const st = state.feet[sd]; if (st && st.locked && st.w > 0) applyLeg(sd); } } }
  if (!(minY < 0) && (state.groundPrev || 0) > 1e-6) { const lift = slewLift(0); if (lift > 1e-6) { pel.off[1] += lift; diag.ground = +lift.toFixed(4); fk = skelFK(skel, pose, rootM); for (const sd of ["R", "L"]) { const st = state.feet[sd]; if (st && st.locked && st.w > 0) applyLeg(sd); } } else state.groundPrev = 0; }
  for (const sd of ["R", "L"]) { const f = diag.feet[sd]; const a2 = fk.joint[skel.byName["foot_" + sd].idx], t2 = fk.tip[skel.byName["toe_" + sd].idx]; f.soleY = +(a2[1] - ankleH).toFixed(4); f.toeY = +t2[1].toFixed(4); f.ankle = a2.slice(); f.toe = t2.slice(); if (f.locked && f.P) { const st = state.feet[sd]; const ref = st.mode === "toe" ? [st.T[0], 0, st.T[2]] : [st.P[0], 0, st.P[2]], cur = st.mode === "toe" ? [t2[0], 0, t2[2]] : [a2[0], 0, a2[2]]; f.slide = +V3.dist(cur, ref).toFixed(4); } state.feet[sd].lastA = a2.slice(); state.feet[sd].lastT = t2.slice(); }   // the foot facts are the FINAL ones (after the ground clamp / leg floor); lastA/lastT are what the release hands to the swing
  // joint diagnostics: knee / elbow included angles (limits), and the per-tick joint jump (discontinuity detector: max joint displacement vs last tick)
  for (const sd of ["R", "L"]) { const J = (n) => fk.joint[skel.byName[n].idx]; const ang = (a, b, c) => Math.acos(Math.max(-1, Math.min(1, V3.dot(V3.norm(V3.sub(a, b)), V3.norm(V3.sub(c, b)))))) / DEG; diag.knee[sd] = +ang(J("thigh_" + sd), J("shin_" + sd), J("foot_" + sd)).toFixed(1); diag.elbow[sd] = +ang(J("upperArm_" + sd), J("foreArm_" + sd), J("hand_" + sd)).toFixed(1); }
  // POP detector (diag.jerk): the change in a joint's per-tick displacement — a fast swing foot has a large displacement but a small CHANGE in it; a real discontinuity spikes here
  { const inv = M4.invertRigid(rootM), JL = fk.joint.map(p => M4.transformPoint(inv, p)); if (state.prevJL) { let mx = 0, mi = -1, jk = 0, ji = -1; for (let i = 0; i < JL.length; i++) { const dv = V3.sub(JL[i], state.prevJL[i]), d = V3.len(dv);
      if (d > mx) { mx = d; mi = i; } if (state.prevDJ) { const a = V3.len(V3.sub(dv, state.prevDJ[i])); if (a > jk) { jk = a; ji = i; } } state.dj = state.dj || []; state.dj[i] = dv; }
    diag.jump = +mx.toFixed(4); diag.jumpBone = mi >= 0 && skel.bones[mi] ? skel.bones[mi].name : null;
    diag.jerk = +jk.toFixed(4); diag.jerkBone = ji >= 0 && skel.bones[ji] ? skel.bones[ji].name : null; state.prevDJ = state.dj.slice(); } state.prevJL = JL; }   // discontinuity: joint motion in the ROOT frame (the authoritative displacement is not a jump)
  pel.off = saved; return { fk, diag };
}
// one diagnostic actor: authoritative state (root x/y on the pitch, facing, speed) is INPUT; the actor holds only presentation state
// `bodyId` may instead be a ready SKELETON (a real character's own bind): the whole runtime is driven by the skeleton object, so a real
// player body needs no separate animation path — same gait, same contact solve, same kick families, its own proportions.
function ofActorMake(bodyId, x, y, facing) { const skel = (bodyId && bodyId.bones) ? bodyId : ofBuildSkeleton(OF_BODIES[bodyId]); return { body: (bodyId && bodyId.bones) ? (bodyId.character || "character") : bodyId, skel, x, y, facing, speed: 0, phase: 0, state: { feet: {} }, motion: "STAND", turnFrom: null }; }
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
  } else if (a.motion === "LOCO_V0") {                                                           // the earlier diagnostic gait (kept for comparison)
    const gp = ofGaitParams(a.skel, a.speed); if (gp.cadence > 0) a.phase = (a.phase + dt * gp.cadence / 2) % 1;   // one cycle = two steps
    pose = gp.v < 0.05 ? ofRetargetPelvis(a.skel, OF_STAND) : ofGaitPose(a.skel, gp, a.phase); plants = gp.v < 0.05 ? { R: true, L: true } : { R: ofStance(a.phase, "R"), L: ofStance(a.phase, "L") }; a.gait = gp;
  } else {                                                                                       // LOCOMOTION V1 (of_loco.js): IDLE / WALK / JOG / RUN / SPRINT from the authoritative velocity, facing and acceleration
    const sim = a.sim || { x: a.x, y: a.y, vx: Math.cos(a.facing) * a.speed, vy: Math.sin(a.facing) * a.speed, facing: a.facing };
    const lo = ofLocoTick(a.skel, a.loco || (a.loco = ofLocoMake()), sim, dt, now); pose = lo.pose; plants = lo.plants;
    // ── SHOOTING V1: a shot the SIMULATION has scheduled. The kick pose cross-fades over the locomotion, the PLANT foot is braced by the
    // ordinary contact solve and the STRIKING foot is freed and reached onto the authoritative ball so the boot meets it at kickAt.
    if (a.kick && typeof ofKickTick === "function" && now >= a.kick.t0 - 0.001 && now <= a.kick.end + OF_KICK.blendOut) {
      const kk = ofKickTick(a.skel, a.kickS || (a.kickS = ofKickMake()), a.kick, now);
      const inW = clamp01((now - a.kick.t0) / OF_KICK.blendIn);
      const outW = 1 - clamp01((now - a.kick.end) / OF_KICK.blendOut);
      const w = Math.min(inW, outW);
      if (w > 0.001) {
        pose = ofPoseLerp(pose, kk.pose, w); pose.name = kk.pose.name;
        const sf = kk.foot, pf = sf === "R" ? "L" : "R";
        if (w > 0.35) {
          plants[sf] = { want: false };                                                           // the striking leg swings: never locked
          plants[pf] = { want: true, mode: "ankle", s: 0.4 };                                     // the plant leg is braced through the strike
          const dtc = now - a.kick.kickAt;
          const ramp = dtc <= 0 ? smooth01(clamp01(1 + dtc / 0.11)) : 1 - clamp01(dtc / 0.07);               // reach the ball AT contact, release straight after
          if (a.kickBall && ramp > 0.001) plants[sf].reach = { p: a.kickBall, w: ramp * w, cap: OF_KICK.reachMax, iters: 3 };
        }
        a.kickW = w;
      }
    } else a.kickW = 0;
    // a touch the SIMULATION has scheduled (or just fired): ease the chosen boot onto the ball across the plan, hold briefly, then release
    if (!a.kickW && a.touch && plants[a.touch.foot] && typeof plants[a.touch.foot] === "object") {
      const T = a.touch, dtc = now - T.at;                                                        // <0 before the touch, >0 after
      const ramp = dtc < 0 ? clamp01(1 + dtc / Math.max(0.03, T.lead || OF_GAIT.reachT)) : 1 - clamp01(dtc / OF_GAIT.reachT);
      if (ramp > 0.001) plants[a.touch.foot].reach = { p: T.p, w: ramp };
      if (dtc > OF_GAIT.reachT) a.touch = null;
    } a.gait = { cadence: lo.P.step > 0 ? Math.hypot(sim.vx, sim.vy) / (lo.P.step * a.skel.legLen) : 0, stanceFrac: lo.P.stance, stride: lo.P.step * a.skel.legLen, A: lo.P.hipFlex, run: lo.P.idx >= 2 }; a.legYaw = lo.legYaw;
  }
  if (a.legYaw != null && a.motion !== "LOCO_V0") { const rm = gkRootMatrix(a.x, a.y, a.legYaw, 0); for (let i = 0; i < 16; i++) rootM[i] = rm[i]; }   // the legs play along the movement direction; the trunk twist toward the facing is in the pose
  const sol = ofSolve(a.skel, pose, rootM, plants, a.state, { now, dt, stanceT: a.gait && a.gait.cadence > 0 ? (a.gait.stanceFrac || OF_GAIT.stanceFrac) * 2 / a.gait.cadence : null }); a.pose = pose; a.rootM = rootM; a.sol = sol;
  a.skinMats = new Float32Array(a.skel.bones.length * 16); skelSkinMatrices(a.skel, sol.fk, a.skel.invBind).forEach((m, i) => a.skinMats.set(m, i * 16));
  return sol;
}
