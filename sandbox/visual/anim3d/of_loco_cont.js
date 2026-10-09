// ═══ anim3d/of_loco_cont.js — LOCOMOTION CONTINUITY LC-1 (presentation only) ═══════════════════════════════════════════════════════
// physical-character-v2 review_artifacts/locomotion_continuity/LC1_PREREG.md. A presentation layer over the SHARED PURE LAW (ofLocoCycle, which
// the simulation's CHARCOLLIDE-1 runner legs also use and which is left byte-identical). It makes the presented locomotion physically coherent:
//   D1 the law's joint-angle channels are C0 at their phase breakpoints (the hip reverses instantly at toe-off): each breakpoint gets the exact
//      C1 corner rounding c(τ) = Δm (h − |τ|)² / 4h over one render frame (h = 1/60 s); outside those windows the channels ARE the law's;
//   D2 the vertical COM follows the spring-mass running model (half-sine stance force, Morin et al. 2005; ballistic flight), timed by the gait's
//      own phase / cadence / stance fraction, levelled so the landing foot meets the pitch at the simulation's planted onset; walking keeps the
//      stance grounding (smooth min / max, no hard heel→toe switch); the pelvis carries the difference between that COM and the pose's own COM;
//   D3 the horizontal COM follows the authoritative root (plus its own slowly varying mean offset): the pelvis absorbs the limbs' oscillation;
//   D4 locomotion plants: a foot rolling without slipping on a convex sole (heel pad, rocker, ball), a world-fixed ground reference, C1 engagement at the stance onset (uniform
//      deceleration to rest + vertical Hermite) and an inertialized release at the stance end; planted legs keep their authored knee plane; a smooth
//      reach limit and a smooth swing-clearance lift replace the rate-limited drop / ground slews and the hard leg-floor switch;
//   D5 the ground clamp skips the rig root (every real rig's root carries part "shirt" and scored −12 mm on every tick).
// Nothing here reads or writes simulation state. OF_CONT.on = false reproduces the V1.3 presentation bit for bit.
const OF_CONT = {
  on: true, horiz: true,                // D3 can be switched off alone (reported ablation)
  h: 1 / 60,                            // D1 corner-rounding half-width (s): one render frame
  Te: 0.05, Tr: 0.10,                   // D4 engagement (heel-strike arrest) and release (swing acceleration) times (s)
  rocker: 2.5,                          // D4 rolling sole: rocker radius (m) between the heel pad and the ball (radius = the rig's MTP-joint height); sagitta ≤ 2 mm (P-9's +2 mm)
  toeK: 3,                              // D4 the planted toes stay flat once the foot rolls onto the ball: toe pitch = smooth max(θ, 0), scale (deg)
  solK: 0.003,                          // D2 rounded-sole scale for smooth min / max (m)
  liftK: 0.006,                         // D4 swing-clearance softplus scale (m): half the boot sole (12 mm); the lift of a foot crossing the pitch level at v adds ~v²/4k (dev change 2 → 6 mm)
  lpTau: 0.15,                          // D3 critically damped low-pass time constant of the COM mean offset (s)
  soft0: 0.93, soft1: 0.985,            // D4 reach: smooth compression of the hip→ankle target distance (× leg length)
  divergeM: 0.35,                       // D4 an anchor this far (× leg length) from the authored foot is released early (turns, reversals)
  runS: [0.45, 0.50],                   // D2 walking ↔ running model blend over the stance fraction
  g: 9.81, dAuth: 1e-3,                 // gravity; the time offset of the authored-state central differences (s)
  // de Leva (1996) segment masses (fraction of body mass) and COM fraction along the bone (joint → tip); trunk split pelvis / spine / chest
  mass: { pelvis: [0.1117, 0.5], spine: [0.1633, 0.5], chest: [0.1596, 0.5], head: [0.0694, 0.5], upperArm: [0.0271, 0.577], foreArm: [0.0162, 0.457], hand: [0.0061, 0.5], thigh: [0.1416, 0.41], shin: [0.0433, 0.446], foot: [0.0137, 0.5] },
};
const ofContOn = () => typeof OF_CONT !== "undefined" && OF_CONT.on;
const ofContWrap = (x) => { x = x % 1; if (x <= -0.5) x += 1; else if (x > 0.5) x -= 1; return x; };
const ofContW01 = (x) => ((x % 1) + 1) % 1;
// cubic Hermite decay from (x0, v0) to (0, 0) over T: value and rate at τ
function ofContHerm(x0, v0, T, tau) { if (tau >= T) return [0, 0]; const s = Math.max(0, tau) / T, s2 = s * s, s3 = s2 * s; return [x0 * (2 * s3 - 3 * s2 + 1) + v0 * T * (s3 - 2 * s2 + s), (x0 * (6 * s2 - 6 * s) + v0 * T * (3 * s2 - 4 * s + 1)) / T]; }
// ── D1: the law's leg channels, copied EXACTLY (verified against ofLocoCycle, LC-8), as functions of the leg's own phase ──────────────────
function ofContLegLaw(P, ph, dir) {
  ph = ofContW01(ph); const S = P.stance, st = ph < S, s = st ? ph / S : 1, w = st ? 0 : (ph - S) / (1 - S);
  const hipC = -P.hipFlex * (1 - P.retract);
  let hip = st ? lerp(hipC, P.hipExt, s) : (w < 0.72 ? lerp(P.hipExt, -P.hipFlex, Math.sin(Math.PI / 2 * w / 0.72)) : lerp(-P.hipFlex, hipC, smooth01((w - 0.72) / 0.28)));
  const kp = ofContKneeParts(P, ph, dir); let knee = Math.max.apply(null, kp);
  let ank; if (st) { ank = s < 0.22 ? lerp(-P.ankleHS, 0, s / 0.22) : s < 0.62 ? lerp(0, -8, (s - 0.22) / 0.40) : lerp(-8, P.ankleTO, smooth01((s - 0.62) / 0.38)); }
  else ank = w < 0.45 ? lerp(P.ankleTO, -6, smooth01(w / 0.45)) : lerp(-6, -P.ankleHS, smooth01((w - 0.45) / 0.55));
  const toe = st && s > 0.66 ? -P.toeOff * smooth01((s - 0.66) / 0.34) : (!st && w < 0.3 ? -P.toeOff * (1 - smooth01(w / 0.3)) : 0);
  if (dir < 0) { hip = -hip * 0.75; ank *= 0.6; }
  return [hip, knee, ank, toe];
}
// the knee is a max() of these (the reverse gait adds the kneeStance floor at 0.7×): its crossovers are C0 corners too
function ofContKneeParts(P, ph, dir) {
  ph = ofContW01(ph); const S = P.stance, st = ph < S, s = st ? ph / S : 1, w = st ? 0 : (ph - S) / (1 - S);
  const load = st ? P.kneeStance + P.kneeLoad * Math.sin(Math.PI * Math.min(1, s / 0.7)) * (s < 0.7 ? 1 : 0) : 0;
  const w2 = st ? Math.max(0, (s - 0.72) / 0.28) * P.kneeTO : P.kneeTO + w * (1 - P.kneeTO);
  const swing = P.kneeSwing * Math.pow(Math.sin(Math.PI * Math.min(1, w2)), 1.25);
  const base = st ? P.kneeStance : P.kneeStance + 4 * (1 - w);
  return dir < 0 ? [P.kneeStance, load * 0.7, swing * 0.7, base * 0.7] : [load, swing, base];
}
// the structural breakpoints of the leg channels (leg phase); channels that are C1 there get Δm ≈ 0 and no rounding
function ofContLegBreaks(P) { const S = P.stance; return [0, S * 0.22, S * 0.62, S * 0.66, S * 0.7, S * 0.72, S, S + 0.3 * (1 - S), S + 0.45 * (1 - S), S + 0.72 * (1 - S)]; }
// exact C1 corner rounding of channel f around phase x, half-width hp (phase units); corners at the structural breakpoints and (knee) at the
// crossovers of its max() parts inside the window
function ofContRound(f, x, hp, breaks, parts) {
  if (!(hp > 0)) return 0; const eps = 1e-7; let add = 0; const pts = [];
  const corner = (b) => { const d = ofContWrap(x - b); if (Math.abs(d) >= hp) return; const fb = f(b), dm = (f(b + eps) - fb) / eps - (fb - f(b - eps)) / eps; if (Math.abs(dm) > 1e-6) add += dm * (hp - Math.abs(d)) * (hp - Math.abs(d)) / (4 * hp); };
  for (const b of breaks) { if (Math.abs(ofContWrap(x - b)) < hp) { corner(b); pts.push(x - ofContWrap(x - b)); } }
  if (parts) {                                                                                     // crossovers between consecutive sample points
    const lo = x - hp, hi = x + hp, S = [lo].concat(pts.filter(p => p > lo && p < hi).sort((a, b) => a - b), [hi]), am = (v) => { let k = 0; for (let i = 1; i < v.length; i++) if (v[i] > v[k]) k = i; return k; };
    for (let n = 0; n + 1 < S.length; n++) { let a = S[n] + 2 * eps, b = S[n + 1] - 2 * eps; if (b <= a) continue; const i = am(parts(a)), j = am(parts(b)); if (i === j) continue;
      const g = (y) => { const v = parts(y); return v[i] - v[j]; }; for (let it = 0; it < 48; it++) { const m = 0.5 * (a + b); if (g(m) > 0) a = m; else b = m; }
      const xs = 0.5 * (a + b), d = x - xs, si = (parts(xs + eps)[i] - parts(xs - eps)[i]) / (2 * eps), sj = (parts(xs + eps)[j] - parts(xs - eps)[j]) / (2 * eps), dm = sj - si;
      if (Math.abs(d) < hp && Math.abs(dm) > 1e-6) add += dm * (hp - Math.abs(d)) * (hp - Math.abs(d)) / (4 * hp); } }
  return add;
}
function ofContLegC1(P, ph, dir, hp) {
  const law = ofContLegLaw(P, ph, dir); if (!(hp > 0)) return law; const B = ofContLegBreaks(P), out = law.slice();
  for (let c = 0; c < 4; c++) out[c] += ofContRound((y) => ofContLegLaw(P, y, dir)[c], ph, hp, B, c === 1 ? (y) => ofContKneeParts(P, y, dir) : null);
  return out;
}
// the arm channels that clamp at the arm-swing zero crossing (u = 0.25, 0.75): foreArm and clavicle, both sides
function ofContArmLaw(P, u, dir) { const aR = P.arm * Math.cos(Math.PI * 2 * u) * dir, aL = -aR, m = Math.max(1, P.arm);
  return [-P.elbow - 14 * clamp01(-aR / m), -P.elbow - 14 * clamp01(-aL / m), -2 * clamp01(-aR / m), 2 * clamp01(-aL / m)]; }
// ── D1: the C1 pose — the law's own pose (all its other channels, flags and flight state untouched) with the C1 channels written over it ──
function ofContPoseC1(skel, P, u, opt, rate) {
  const pose = ofLocoCycle(skel, P, u, opt), dir = opt && opt.reverse ? -1 : 1, hp = OF_CONT.h * rate;
  for (const [sd, ph] of [["R", u], ["L", u + 0.5]]) { const c = ofContLegC1(P, ph, dir, hp); pose["thigh_" + sd] = [c[0], pose["thigh_" + sd][1], pose["thigh_" + sd][2]]; pose["shin_" + sd] = [c[1], 0, 0]; pose["foot_" + sd] = [c[2], 0, 0]; pose["toe_" + sd] = [c[3], 0, 0]; }
  if (hp > 0) { const law = ofContArmLaw(P, u, dir), out = law.slice(); for (let c = 0; c < 4; c++) out[c] += ofContRound((y) => ofContArmLaw(P, y, dir)[c], u, hp, [0.25, 0.75], null);
    pose.foreArm_R = [out[0], 0, 0]; pose.foreArm_L = [out[1], 0, 0]; pose.clavicle_R = [0, 0, out[2]]; pose.clavicle_L = [0, 0, out[3]]; }
  return pose;
}
// ── mass model: the pose COM relative to the root with the pelvis offset at zero (all bones descend from the pelvis, so the COM translates with it)
function ofContSegs(skel) { if (skel._contSegs) return skel._contSegs; const M = OF_CONT.mass, s = []; let tot = 0;
  for (const b of skel.bones) { const k = b.name.replace(/_[RL]$/, ""); const m = M[k]; if (!m || !b.parent) continue; s.push({ i: b.idx, m: m[0], c: m[1] }); tot += m[0]; }
  for (const x of s) x.m /= tot; skel._contSegs = s; return s; }
function ofContCOM(skel, fk) { let c = [0, 0, 0]; for (const s of ofContSegs(skel)) { const j = fk.joint[s.i], t = fk.tip[s.i]; for (let a = 0; a < 3; a++) c[a] += (j[a] + (t[a] - j[a]) * s.c) * s.m; } return c; }
function ofContFK0(skel, pose) { return skelFK(skel, pose, M4.ident()); }   // pelvis offset 0 (pose._pelvis is not read by skelFK)
// smooth min / max (rounded sole), C∞
const ofContSmin = (a, b, k) => { const m = Math.min(a, b); return m - k * Math.log(Math.exp(-(a - m) / k) + Math.exp(-(b - m) / k)); };
const ofContSmax = (a, b, k) => -ofContSmin(-a, -b, k);
// the lowest sole point of a foot in an FK (the law's own heel / toe points: ankle − ankleH, toe tip − 5 mm), smooth min
function ofContSole(skel, fk, sd) { const fb = skel.byName["foot_" + sd], tb = skel.byName["toe_" + sd]; return ofContSmin(fk.joint[fb.idx][1] - skel.ankleH, fk.tip[tb.idx][1] - 0.005, OF_CONT.solK); }
// ── D2: the spring-mass running model, relative COM height Y (m) and rate at cycle phase u; rate = cycles / s ─────────────────────────────
function ofContStepY(S, rate, u) {
  const g = OF_CONT.g, Tst = 0.5 / rate, Tc = S / rate, Tf = Math.max(0, (0.5 - S) / rate), tau = (ofContW01(u) % 0.5) / 0.5 * Tst;
  const vL = -g * Tf / 2, Fm = Math.PI / 2 * g * (Tc + Tf) / Tc;
  if (tau < Tc) { const k = Math.PI / Tc; return [vL * tau + Fm / k * (tau - Math.sin(k * tau) / k) - g * tau * tau / 2, vL + Fm / k * (1 - Math.cos(k * tau)) - g * tau, true]; }
  const t2 = tau - Tc, vTO = g * Tf / 2; return [vTO * t2 - g * t2 * t2 / 2, vTO - g * t2, false];
}
// the walking vertical: the stance grounding on the C1 pose — each leg's lowest sole point m (smooth min of heel / toe, pelvis offset 0). Both feet
// must reach the pitch in double support, so the pelvis takes a C1 max of the legs' requirements e_i = lerp(floor, m_i, w_i) (floor a solK below both):
//   a stance leg has w = 1, except the outgoing one, which fades out exactly over the double support (1 − smooth01(s_in / DS), DS = (S − 0.5)/S);
//   a swinging leg ramps in over the descending half of single support (the last half of its swing), reaching w = 1 at its contact, so the
//   pelvis has already come down to meet the landing foot (the law grounds stance legs only: a straight-kneed walk lands its foot ~13 cm above
//   the pitch at 1.45 m/s, and its outgoing leg is dropped at toe-off).
// At least one leg always has w = 1, so the floor never drives the result.
const ofContMaxC1 = (a, b, k) => { const x = Math.abs(a - b) / k; return Math.max(a, b) + (x < 1 ? k * (1 - x) * (1 - x) / 4 : 0); };
function ofContWalkY(skel, pose, fk0, S) {
  const lg = pose._legs, k = OF_CONT.solK, DS = Math.max(1e-3, (S - 0.5) / S), m = { R: ofContSole(skel, fk0, "R"), L: ofContSole(skel, fk0, "L") }, w = {};
  for (const sd of ["R", "L"]) { const l = lg[sd], o = lg[sd === "R" ? "L" : "R"];
    if (l.st) w[sd] = o.st && o.s < l.s ? 1 - smooth01(o.s / DS) : 1;                              // outgoing: fades over the other's first DS of stance
    else w[sd] = smooth01((l.w - 0.5) / 0.5); }                                                     // swinging: ramps in over the last half of its swing
  const fl = ofContSmin(m.R, m.L, k) - k, low = ofContMaxC1(lerp(fl, m.R, w.R), lerp(fl, m.L, w.L), k);
  return Math.max(-0.30 * skel.legLen, -low);
}
// the gait phase rate (cycles / s) the presentation's phase actually advances at
function ofContRate(skel, P, v, sim) { const leg = sim && sim.gaitPhase != null ? ((typeof PT !== "undefined" && PT.LEG_REF) || 0.865) : skel.legLen, step = P.step * leg; return step > 1e-6 ? v / step / 2 : 0; }
// ── the authored presentation at time offset dtau from the tick: C1 pose + D2 vertical + D3 horizontal (state frozen at the tick) ───────
// ctx: { P, u, rate, opt, wGait, idle, lp: { m, md }, yL, wr }. Returns the GAIT pose with _pelvis = its offset (the idle blend is ofPoseLerp's,
// exactly as for the law's pose) and the pose COM.
function ofContAuthor(skel, ctx, dtau, pre) {
  const u = ctx.u + ctx.rate * dtau, P = ctx.P, pose = pre ? pre.pose : ofContPoseC1(skel, P, u, ctx.opt, ctx.rate), fk0 = pre ? pre.fk0 : ofContFK0(skel, pose), com0 = pre ? pre.com0 : ofContCOM(skel, fk0);
  let yRun = null, yWalk = null;
  if (ctx.wr > 0) yRun = ctx.yL + ofContStepY(P.stance, ctx.rate, u)[0] - com0[1];
  if (ctx.wr < 1) yWalk = ofContWalkY(skel, pose, fk0, P.stance);
  const py = yRun != null && yWalk != null ? lerp(yWalk, yRun, ctx.wr) : yRun != null ? yRun : yWalk != null ? yWalk : pose._pelvis[1];
  let px = 0, pz = 0; if (OF_CONT.horiz && ctx.lp) { px = -(com0[0] - (ctx.lp.m[0] + ctx.lp.md[0] * dtau)); pz = -(com0[2] - (ctx.lp.m[1] + ctx.lp.md[1] * dtau)); }
  pose._pelvis = [px, py, pz]; return { pose, com0 };
}
// the presented (idle-blended) pose for a gait pose, as ofLocoTick builds it
function ofContBlend(ctx, gp) { const w = ctx.wGait; const p = w >= 1 ? gp : w <= 0 ? ctx.idle : ofPoseLerp(ctx.idle, gp, w); p._legs = gp._legs; return p; }
// one tick (called by ofLocoTick): advances the D3 low-pass once, returns the gait pose to use and stores the context for re-evaluation
function ofContCycle(skel, L, P, v, sim, dt, opt, wGait, idle) {
  const rate = ofContRate(skel, P, v, sim), S = P.stance, wr = rate > 1e-6 ? smooth01((OF_CONT.runS[1] - S) / (OF_CONT.runS[1] - OF_CONT.runS[0])) : 0;
  const ctx = { P, u: L.phase, rate, opt, wGait, idle, lp: null, wr, yL: null };
  if (wr > 0) { const land = ofContPoseC1(skel, P, 0, opt, rate), fkL = ofContFK0(skel, land); ctx.yL = ofContCOM(skel, fkL)[1] - ofContSole(skel, fkL, "R"); }   // COM height of the grounded landing pose
  const pose0 = ofContPoseC1(skel, P, L.phase, opt, rate), fk0 = ofContFK0(skel, pose0), com0 = ofContCOM(skel, fk0), x = [com0[0], com0[2]];
  const lp = L.contLP || (L.contLP = { m: x.slice(), md: [0, 0] }), w = 1 / OF_CONT.lpTau;          // critically damped 2nd-order low-pass, exact step
  for (let a = 0; a < 2; a++) { const e = lp.m[a] - x[a], f = lp.md[a] + w * e, ex = Math.exp(-w * dt); lp.m[a] = x[a] + (e + f * dt) * ex; lp.md[a] = (f - w * (e + f * dt)) * ex; }
  ctx.lp = { m: lp.m.slice(), md: lp.md.slice() }; L.cont = ctx;
  return ofContAuthor(skel, ctx, 0, { pose: pose0, fk0, com0 }).pose;
}
// ── rotation helpers: foot rotation ↔ (yaw ψ, pitch θ (+ = toes up), roll) with R = Ry(ψ)·Rx(−θ)·Rz(roll) (the skeleton's euler order); rotation vectors
function ofContEuler(M) { const f = V3.norm(M4.transformDir(M, [0, 0, 1])), l = V3.norm(M4.transformDir(M, [1, 0, 0])), th = Math.asin(Math.max(-1, Math.min(1, f[1])));
  return [Math.atan2(f[0], f[2]), th, Math.asin(Math.max(-1, Math.min(1, l[1] / Math.max(1e-9, Math.cos(th)))))]; }
function ofContRotOf(e) { return M4.mul(M4.rotY(e[0]), M4.mul(M4.rotX(-e[1]), M4.rotZ(e[2]))); }
const ofContAng = (a) => Math.atan2(Math.sin(a), Math.cos(a));
function ofContLog(M) { const tr = M[0] + M[5] + M[10], c = Math.max(-1, Math.min(1, (tr - 1) / 2)), ang = Math.acos(c), v = [M[6] - M[9], M[8] - M[2], M[1] - M[4]];
  if (ang < 1e-9) return [v[0] / 2, v[1] / 2, v[2] / 2]; if (Math.PI - ang < 1e-6) { const x = Math.sqrt(Math.max(0, (M[0] + 1) / 2)), y = Math.sqrt(Math.max(0, (M[5] + 1) / 2)), z = Math.sqrt(Math.max(0, (M[10] + 1) / 2)); return V3.scale([x, M[1] >= 0 ? y : -y, M[2] >= 0 ? z : -z], ang); }
  return V3.scale(v, ang / (2 * Math.sin(ang))); }
function ofContExp(v) { const a = V3.len(v); return a < 1e-12 ? M4.ident() : M4.axisAngle(V3.scale(v, 1 / a), a); }
// the offset rate that gives angular velocity w for R = Exp(o)·Ra (Ra turning at wa): ȯ = J_l(o)⁻¹ (w − Exp(o) wa)
function ofContORate(o, w, wa) { const t = V3.len(o), x = V3.sub(w, M4.transformDir(ofContExp(o), wa)); if (t < 1e-6) return x; const ox = V3.cross(o, x), oox = V3.cross(o, ox), k = 1 / (t * t) - (1 + Math.cos(t)) / (2 * t * Math.sin(t));
  return V3.add(V3.sub(x, V3.scale(ox, 0.5)), V3.scale(oox, k)); }
const ofContRel = (A, B) => { const Bi = M4.invertRigid(B); Bi[12] = 0; Bi[13] = 0; Bi[14] = 0; const r = M4.mul(A, Bi); r[12] = 0; r[13] = 0; r[14] = 0; return r; };   // A · B⁻¹ (rotations)
// ── D4: the authored foot facts at the tick and ±dAuth (for C1 transitions): heel ground point, toe (MTP) joint, ankle, pitch, rotation.
// The SWING foot of the layer is the authored foot raised by the smooth clearance lift (softplus of the sole clearance), so swing, engagement
// and release all refer to the same foot.
function ofContFootFacts(skel, fk, sd) {
  const fb = skel.byName["foot_" + sd], tb = skel.byName["toe_" + sd], m = fk.world[fb.idx], A = fk.joint[fb.idx], fwd = V3.norm(M4.transformDir(m, [0, 0, 1])), lat = V3.norm(M4.transformDir(m, [1, 0, 0]));
  const clear = ofContSmin(A[1] - skel.ankleH, fk.tip[tb.idx][1] - 0.005, OF_CONT.solK), k = OF_CONT.liftK, lift = k * Math.log1p(Math.exp(-clear / k)), up = [0, lift, 0];
  const e = ofContEuler(m), Mr = M4.copy(m); Mr[12] = Mr[13] = Mr[14] = 0; const Mt = M4.copy(fk.world[tb.idx]); Mt[12] = Mt[13] = Mt[14] = 0;
  return { A: V3.add(A, up), lat, theta: e[1], yaw: e[0], roll: e[2], M: Mr, Mt, lift, g: ofContRollRef(ofContSole3(skel, sd), V3.add(A, up), Mr, e) };
}
function ofContAuthoredFeet(a, rootAt) {
  const L = a.loco, ctx = L && L.cont; if (!ctx) return null; const d = OF_CONT.dAuth, out = {};
  const at = (dt) => { const p = ofContBlend(ctx, ofContAuthor(a.skel, ctx, dt).pose), o = p._pelvis, pel = a.skel.byName.pelvis, sv = pel.off.slice(); pel.off = [sv[0] + o[0], sv[1] + o[1], sv[2] + o[2]]; const fk = skelFK(a.skel, p, rootAt(dt)); pel.off = sv; return fk; };
  const f0 = at(0), fm = at(-d), fp = at(d);
  for (const sd of ["R", "L"]) { const c = ofContFootFacts(a.skel, f0, sd), m = ofContFootFacts(a.skel, fm, sd), p = ofContFootFacts(a.skel, fp, sd), dv = (x, y) => V3.scale(V3.sub(x, y), 1 / (2 * d));
    out[sd] = { A: c.A, lat: c.lat, theta: c.theta, M: c.M, Mt: c.Mt, Mt_m: m.Mt, Mt_p: p.Mt, lift: c.lift, g: c.g, vg: dv(p.g, m.g), vA: dv(p.A, m.A), thetaDot: (p.theta - m.theta) / (2 * d),
      wt: V3.scale(ofContLog(ofContRel(p.Mt, m.Mt)), 1 / (2 * d)), wtPl: V3.scale(ofContLog(ofContRel(ofContToeRot([p.yaw, p.theta, p.roll]), ofContToeRot([m.yaw, m.theta, m.roll]))), 1 / (2 * d)),
      thetaM: m.theta, thetaP: p.theta, lat_m: m.lat, lat_p: p.lat, M_m: m.M, M_p: p.M, yaw: c.yaw, roll: c.roll, yawM: m.yaw, yawP: p.yaw, rollM: m.roll, rollP: p.roll,
      yawDot: ofContAng(p.yaw - m.yaw) / (2 * d), rollDot: (p.roll - m.roll) / (2 * d), w: V3.scale(ofContLog(ofContRel(p.M, m.M)), 1 / (2 * d)) };
  }
  return out;
}
// ── D4: the rolling foot — a rigid foot rolling WITHOUT SLIPPING on a convex G1 sole in its sagittal plane: a heel pad (circle under the ankle),
// a shallow rocker and the ball of the foot (circle about the MTP joint, radius = its height). The contact point moves continuously along the
// sole as the pitch changes, and the instantaneous centre of rotation is always that contact point, so the foot's velocity field is continuous
// for any C1 pitch — no pivot switch, no dwell. Pitch θ (+ = toes up) about the foot's lateral axis; yaw ψ and roll from the euler decomposition.
function ofContSole3(skel, sd) { const key = "_contSole" + sd; if (skel[key]) return skel[key]; const t = skel.byName["toe_" + sd].off, h = skel.ankleH, r = h + t[1];
  const Ch = [0, -h + r], Cb = [t[2], t[1]], rho = OF_CONT.rocker, c = Cb[0] - Ch[0], te = Math.asin((c / 2) / (rho - r)), Cr = [Ch[0] + c / 2, Ch[1] + (rho - r) * Math.cos(te)];
  return (skel[key] = { r, rho, te, Ch, Cb, Cr, h, mtpH: h + t[1] }); }
// the sole contact for pitch θ: local contact point (foot frame: z forward, y up; x = 0) and the rolling distance S(θ) (S(0) = 0, dS/dθ = radius)
function ofContSoleAt(G, th) { const d = [-Math.sin(th), -Math.cos(th)]; let C, rad, S;
  if (th > G.te) { C = G.Ch; rad = G.r; S = G.rho * G.te + G.r * (th - G.te); } else if (th < -G.te) { C = G.Cb; rad = G.r; S = -G.rho * G.te + G.r * (th + G.te); } else { C = G.Cr; rad = G.rho; S = G.rho * th; }
  return { pl: [0, C[1] + rad * d[1], C[0] + rad * d[0]], S }; }
// the foot pose for a ground reference point G0 (the contact point at θ = 0), euler e = [ψ, θ, roll]: ankle position and rotation
function ofContRollPose(G, G0, e) { const Rf = ofContRotOf(e), so = ofContSoleAt(G, e[1]), u = [Math.sin(e[0]), 0, Math.cos(e[0])], cw = V3.sub(G0, V3.scale(u, so.S)); return { A: V3.sub(cw, M4.transformDir(Rf, so.pl)), Rf, cw }; }
// the ground reference point implied by a foot pose (inverse of ofContRollPose; its height is the foot's clearance at the contact)
function ofContRollRef(G, A, Rf, e) { const so = ofContSoleAt(G, e[1]), u = [Math.sin(e[0]), 0, Math.cos(e[0])]; return V3.add(V3.add(A, M4.transformDir(Rf, so.pl)), V3.scale(u, so.S)); }
// the toe rotation that keeps the toes flat once the foot is on the ball: toe world pitch = smooth max(θ, 0), with the foot's yaw / roll
function ofContToeRot(e) { const k = OF_CONT.toeK * DEG, tp = ofContSmax(e[1], 0, k); return ofContRotOf([e[0], tp, e[2]]); }
// one foot of the locomotion plant layer per tick (state in st.c). Returns the presented foot { A (ankle target), Rf (foot rotation), Rt (toe), … }.
// A transition starts from the OLD mode's presented foot evaluated at THIS tick (position, orientation and their rates), so all are continuous.
// The planted foot does not slide or turn: its ground reference point and its yaw / roll come to rest over the engagement and stay; its pitch is
// the authored pitch, realised by rolling on the sole.
function ofContPlantStep(skel, sd, st, want, au, now) {
  const c = st.c || (st.c = { mode: "swing" }), F = au[sd], Te = OF_CONT.Te, G = ofContSole3(skel, sd);
  const present = () => ofContPresent(skel, sd, c, F, now, G);
  let cur, handed = false;                                                                         // the presented foot now under the current mode
  if (c.mode === "handover") { const Rf = M4.copy(F.M); cur = { A: c.A0, vA: [0, 0, 0], Rf, Rt: F.Mt, w: [0, 0, 0], wt: [0, 0, 0], wtPl: [0, 0, 0], theta: F.theta, thetaDot: 0, yaw: F.yaw, yawDot: 0, roll: F.roll, rollDot: 0,
      g: ofContRollRef(G, c.A0, Rf, [F.yaw, F.theta, F.roll]), vg: [0, 0, 0] }; c.mode = "swing"; delete c.A0; handed = true; }   // a V1.3 lock handed to the layer: its foot, at rest
  else cur = present();
  const startRelease = (early) => { c.mode = "release"; c.t0 = now; c.early = !!early; c.oA0 = V3.sub(cur.A, F.A); c.ovA0 = V3.sub(cur.vA, F.vA);
    c.or0 = ofContLog(ofContRel(cur.Rf, F.M)); c.ord0 = ofContORate(c.or0, cur.w, F.w); c.ot0 = ofContLog(ofContRel(cur.Rt, F.Mt)); c.otd0 = ofContORate(c.ot0, cur.wt, F.wt); };
  if (want && (c.mode === "swing" || c.mode === "release")) {                                      // ENGAGEMENT at the stance onset (the simulation's planted flag)
    c.mode = "engage"; c.t0 = now; c.early = false;
    c.g0 = cur.g.slice(); c.gv0 = cur.vg.slice(); c.anchor = [c.g0[0] + c.gv0[0] * Te / 2, 0, c.g0[2] + c.gv0[2] * Te / 2];   // the ground reference decelerates uniformly to rest
    c.yaw0 = cur.yaw; c.yawd0 = cur.yawDot; c.roll0 = cur.roll; c.rolld0 = cur.rollDot; c.oth0 = cur.theta - F.theta; c.othd0 = cur.thetaDot - F.thetaDot;
    c.ot0 = ofContLog(ofContRel(cur.Rt, ofContToeRot([cur.yaw, cur.theta, cur.roll]))); c.otd0 = ofContORate(c.ot0, cur.wt, cur.wtPl || cur.wt); }
  else if (!want && (c.mode === "engage" || c.mode === "planted" || handed)) startRelease(false);   // RELEASE at the stance end (or from a handed-over V1.3 lock)
  else if (want && c.mode === "planted") { if (Math.hypot(c.anchor[0] - F.g[0], c.anchor[2] - F.g[2]) > OF_CONT.divergeM * skel.legLen) startRelease(true); }
  if (c.mode === "release" && now - c.t0 >= OF_CONT.Tr - 1e-9) c.mode = "swing";                 // (both end states equal the next mode's: continuous)
  if (c.mode === "engage" && now - c.t0 >= Te - 1e-9) c.mode = "planted";
  return present();
}
// the presented foot of a mode at time now; the tick and ±dAuth give the rates
function ofContPresent(skel, sd, c, F, now, G) {
  const Te = OF_CONT.Te, Tr = OF_CONT.Tr, d = OF_CONT.dAuth, tau = now - c.t0;
  const A3 = (s) => s < 0 ? { th: F.thetaM, yaw: F.yawM, roll: F.rollM, M: F.M_m, Mt: F.Mt_m, A: V3.sub(F.A, V3.scale(F.vA, d)) } : s > 0 ? { th: F.thetaP, yaw: F.yawP, roll: F.rollP, M: F.M_p, Mt: F.Mt_p, A: V3.add(F.A, V3.scale(F.vA, d)) } : { th: F.theta, yaw: F.yaw, roll: F.roll, M: F.M, Mt: F.Mt, A: F.A };
  const rest = (x0, v0, t) => (t >= Te ? x0 + v0 * Te / 2 : x0 + v0 * t - v0 * t * t / (2 * Te));   // uniform deceleration to rest over Te
  let ev = null;
  if (c.mode === "engage" || c.mode === "planted") {
    const eng = c.mode === "engage", hv = eng ? ofContHerm(c.g0[1], c.gv0[1], Te, tau) : [0, 0], oth = eng ? ofContHerm(c.oth0, c.othd0, Te, tau) : [0, 0], ot = eng ? [0, 1, 2].map(a => ofContHerm(c.ot0[a], c.otd0[a], Te, tau)) : null;
    ev = (s) => { const a = A3(s), t = Math.min(tau + s, Te), gx = eng ? [rest(c.g0[0], c.gv0[0], tau + s), hv[0] + hv[1] * s, rest(c.g0[2], c.gv0[2], tau + s)] : c.anchor,
        e = [rest(c.yaw0, c.yawd0, eng ? tau + s : Te), a.th + oth[0] + oth[1] * s, rest(c.roll0, c.rolld0, eng ? tau + s : Te)], P = ofContRollPose(G, gx, e);
      let Rt = ofContToeRot(e); if (ot) { Rt = M4.mul(ofContExp(ot.map(x => x[0] + x[1] * s)), Rt); Rt[12] = 0; Rt[13] = 0; Rt[14] = 0; } return { A: P.A, Rf: P.Rf, Rt, e, g: gx, cw: P.cw }; };
  } else if (c.mode === "release") {
    const o = [0, 1, 2].map(a => ofContHerm(c.oA0[a], c.ovA0[a], Tr, tau)), or = [0, 1, 2].map(a => ofContHerm(c.or0[a], c.ord0[a], Tr, tau)), ot = [0, 1, 2].map(a => ofContHerm(c.ot0[a], c.otd0[a], Tr, tau));
    ev = (s) => { const a = A3(s), Rf = M4.mul(ofContExp(or.map(x => x[0] + x[1] * s)), a.M), Rt = M4.mul(ofContExp(ot.map(x => x[0] + x[1] * s)), a.Mt); Rf[12] = Rf[13] = Rf[14] = 0; Rt[12] = Rt[13] = Rt[14] = 0;
      const e = ofContEuler(Rf), A = V3.add(a.A, o.map(x => x[0] + x[1] * s)); return { A, Rf, Rt, e, g: ofContRollRef(G, A, Rf, e) }; };
  }
  if (!ev) { const Rf = M4.copy(F.M); Rf[12] = Rf[13] = Rf[14] = 0; return { A: F.A, Rf, Rt: F.Mt, vA: F.vA, w: F.w, wt: F.wt, wtPl: F.wtPl, theta: F.theta, thetaDot: F.thetaDot, yaw: F.yaw, yawDot: F.yawDot, roll: F.roll, rollDot: F.rollDot,
    g: F.g, vg: F.vg, mode: "swing", anchor: null, contact: false, lift: F.lift }; }
  const p0 = ev(0), pm = ev(-d), pp = ev(d), dv = (x, y) => V3.scale(V3.sub(x, y), 1 / (2 * d)), wOf = (q, r) => V3.scale(ofContLog(ofContRel(q, r)), 1 / (2 * d));
  const res = { A: p0.A, Rf: p0.Rf, Rt: p0.Rt, vA: dv(pp.A, pm.A), w: wOf(pp.Rf, pm.Rf), wt: wOf(pp.Rt, pm.Rt), theta: p0.e[1], thetaDot: (pp.e[1] - pm.e[1]) / (2 * d), yaw: p0.e[0], yawDot: ofContAng(pp.e[0] - pm.e[0]) / (2 * d), roll: p0.e[2], rollDot: (pp.e[2] - pm.e[2]) / (2 * d),
    g: p0.g, vg: dv(pp.g, pm.g), cw: p0.cw || null, mode: c.mode, anchor: c.mode === "release" ? null : c.anchor.slice() };
  res.contact = c.mode === "planted" || (c.mode === "engage" && p0.g[1] <= 0.002);
  return res;
}
// reach: (1) soft-clamped (C1, identity below lim − k) at lim = max(dA + k, L20), dA = the authored leg's own hip→ankle distance, L20 = the
// distance at 20° of knee flexion, k = 3 mm — a planted leg is not driven beyond what the authored leg itself does; (2) a smooth saturation below the
// IK's singular full extension Lmax (softplus, 2 mm): the two-bone IK clamps C0 at full extension, and the law's walking stance knee is within
// 0.5 mm of it. Every leg of the layer, swing included, goes through the same IK, so the IK never switches on or off. An anchor out of reach is left
// (measured slip).
function ofContSoftReach(skel, hip, T, A) { const v = V3.sub(T, hip), d = V3.len(v); if (d < 1e-9) return T; const a = skel.byName.thigh_R.len, b = skel.byName.shin_R.len, k = 0.003, ks = 0.002, Lmax = a + b - 1e-4;
  const L20 = Math.sqrt(a * a + b * b + 2 * a * b * Math.cos(20 * DEG)), dA = A ? V3.dist(A, hip) : L20, lim = Math.max(dA + k, L20), x = (lim - d) / k;
  let d2 = x >= 1 ? d : lim - k * (x <= -1 ? 0 : (x + 1) * (x + 1) / 4); const y = (Lmax - d2) / ks; d2 = Lmax - ks * (y > 30 ? y : Math.log1p(Math.exp(y)));
  return V3.add(hip, V3.scale(v, d2 / d)); }
// set a foot's world rotation (about its current ankle), children follow rigidly
function ofContSetFootRot(skel, fk, sd, Rf) { const fb = skel.byName["foot_" + sd], m = fk.world[fb.idx], o = M4.origin(m), m2 = M4.copy(Rf); m2[12] = o[0]; m2[13] = o[1]; m2[14] = o[2];
  const D = M4.mul(m2, M4.invertRigid(m)); const apply = (b) => { fk.world[b.idx] = M4.mul(D, fk.world[b.idx]); fk.joint[b.idx] = M4.origin(fk.world[b.idx]); fk.tip[b.idx] = M4.transformPoint(fk.world[b.idx], V3.scale(b.dir, b.len)); for (const ch of b.children) apply(ch); }; apply(fb); }
// the knee pole for the layer's leg IK: in the plane through the hip normal to the authored thigh's hinge axis (its local x — the knee is a hinge
// about it), on the forward side. Always well defined (a degenerate pole from a near-straight knee or a target far from the authored ankle flipped
// the knee plane in one step), and with the authored ankle as target it reproduces the authored knee exactly (continuity at engagement / release).
function ofContKneePole(skel, fk, sd, T) { const hip = fk.joint[skel.byName["thigh_" + sd].idx], ax = V3.norm(M4.transformDir(fk.world[skel.byName["thigh_" + sd].idx], [1, 0, 0])), d = V3.sub(T, hip), fwd = V3.cross(d, ax);
  return V3.add(V3.add(hip, V3.scale(d, 0.5)), V3.scale(V3.norm(fwd), 0.5)); }
function ofContSetBoneRot(skel, fk, name, R) { const b = skel.byName[name], m = fk.world[b.idx], o = M4.origin(m), m2 = M4.copy(R); m2[12] = o[0]; m2[13] = o[1]; m2[14] = o[2]; fk.world[b.idx] = m2; fk.joint[b.idx] = o; fk.tip[b.idx] = M4.transformPoint(m2, V3.scale(b.dir, b.len)); }
// the planted foot's actual drift: the ground reference point of the solved foot vs the anchor (horizontal); rolling is not slip
function ofContSlip(skel, fk, sd, res) { if (!res || !res.anchor) return null; const fb = skel.byName["foot_" + sd], m = fk.world[fb.idx], A = M4.origin(m), R = M4.copy(m); R[12] = R[13] = R[14] = 0;
  const g = ofContRollRef(ofContSole3(skel, sd), A, R, ofContEuler(R)); return { slip: Math.hypot(g[0] - res.anchor[0], g[2] - res.anchor[2]), lift: g[1], g }; }
// apply one leg of the layer to an FK: IK to the reach-limited target in the hinge plane + the foot (and planted toe) rotation — every mode, swing
// included (a swing leg's target is its authored, clearance-lifted ankle: the IK reproduces it unless near full extension)
function ofContApplyLeg(skel, fk, sd, st, res) {
  if (!res) return { r: null, lift: 0 };
  const hip = fk.joint[skel.byName["thigh_" + sd].idx], T = ofContSoftReach(skel, hip, res.A, fk.joint[skel.byName["foot_" + sd].idx]);
  const r = skelIK2(skel, fk, "thigh_" + sd, "shin_" + sd, "foot_" + sd, T, 1, ofContKneePole(skel, fk, sd, T), 0, null); ofContSetFootRot(skel, fk, sd, res.Rf);
  if (res.Rt && res.mode !== "swing") ofContSetBoneRot(skel, fk, "toe_" + sd, res.Rt); return { r, T, lift: res.mode === "swing" ? res.lift : 0 };
}
if (typeof module !== "undefined" && module.exports) module.exports = { OF_CONT };
