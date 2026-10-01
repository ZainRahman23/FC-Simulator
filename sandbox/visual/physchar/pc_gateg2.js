// ═══ physchar/pc_gateg2.js — GATE G2a: whole-body YAW / angular-momentum regulation + the first HUMAN in-place gait ═══════════════════════
// The G1 runner (pc_gateg1a runG1a: turf as force plate, the external-impulse ledger, the arbiter ledger) with the G2a locomotion options:
//   loco.human  the gait reference (of_loco WALK, in place: pc_ref inPlaceWalkParams) drives the trunk / neck / arm posture (P3 style), the
//               planned pelvis posture and the swing foot's path; the heading is the INTENDED heading (pc_balance headingIntent)
//   rhythm.human the executor's human swing (toe pivot → reference swing-leg motion from the actual pelvis → forefoot contact)
// Diagnostic variants remove one contribution at a time to attribute the yaw regulation (arms / trunk counter-rotation / intended heading).
import { runG1a } from "./pc_gateg1a.js";
const alt = (n, first) => Array.from({ length: n }, (_, i) => ({ sw: (i % 2 === 0) === (first === "R") ? "R" : "L", fwd: 0, out: 0 }));
const RH = (x) => ({ at: 0.5, steps: alt(16, "R"), Tss: 0.45, Tds: 0.15, Tfirst: 0.5, Tlast: 0.6, human: true, wA: 0.2, ...(x || {}) });
export const TESTS_G2A = {
  G2a_walkInPlace: { group: "G2a human in-place gait", title: "G2a — walking in place, 16 steps: the WALK reference (in place), counter-swing from the in-place legs, thorax stabilisation, intended heading", seconds: 11.5, amBudget: true, loco: { human: {}, rhythm: RH() } },
  G2a_noArms: { group: "G2a yaw attribution (diagnostic)", title: "G2a DIAGNOSTIC — the same without arm counter-swing (arms held in the IDLE pose)", seconds: 11.5, amBudget: true, loco: { human: { arms: false }, rhythm: RH() } },
  G2a_noTrunk: { group: "G2a yaw attribution (diagnostic)", title: "G2a DIAGNOSTIC — the same without trunk counter-rotation (spine / chest yaw 0)", seconds: 11.5, amBudget: true, loco: { human: { trunk: false }, rhythm: RH() } },
  G2a_walkTrunk: { group: "G2a yaw attribution (diagnostic)", title: "G2a DIAGNOSTIC — the WALK's feed-forward thorax twist (sYaw, with the arms) instead of in-place thorax stabilisation", seconds: 11.5, amBudget: true, loco: { human: { trunk: true }, rhythm: RH() } },
  G2a_noHeading: { group: "G2a yaw attribution (diagnostic)", title: "G2a DIAGNOSTIC — the same with G1's heading (the instantaneous stance foot) instead of the intended heading", seconds: 11.5, amBudget: true, loco: { human: {}, headingIntent: false, rhythm: RH() } },
  G2a_walkPhaseArms: { group: "G2a yaw attribution (diagnostic)", title: "G2a DIAGNOSTIC — the counter-swing (arms, trunk and pelvis yaw) on the WALK's own cos 2πu timing instead of the in-place legs'", seconds: 11.5, amBudget: true, loco: { human: { over: { counterFromLegs: false } }, rhythm: RH() } },
  G2a_noSettleAxes: { group: "G2a yaw attribution (diagnostic)", title: "G2a DIAGNOSTIC — the landed foot's ankle compliance on ALL axes (no axis-selective settle: its twist goes soft too)", seconds: 11.5, amBudget: true, loco: { human: {}, ctrl: { settleAxes: false }, rhythm: RH() } },
  G2a_noStyleVel: { group: "G2a yaw attribution (diagnostic)", title: "G2a DIAGNOSTIC — the style joints with a zero target velocity (their damping resists the reference motion)", seconds: 11.5, amBudget: true, loco: { human: { styleVel: false }, rhythm: RH() } },
  G2a_turn30: { group: "G2a intentional turn", title: "G2a — walking in place with an INTENDED 30° turn to the left over 3 s from 3.5 s (the footholds and the intended heading turn; nothing is pinned)", seconds: 11.5, amBudget: true, loco: { human: {}, rhythm: RH({ turn: { at: 3.5, deg: -30, dur: 3 } }) } },
  G2a_G1style: { group: "G2a yaw attribution (diagnostic)", title: "G2a REFERENCE — G1's robotic in-place stepping (S4 timing and swing, IDLE style)", seconds: 11.5, amBudget: true, loco: { rhythm: { at: 0.5, steps: alt(16, "R") }, style: "idle" } },
};
export function runG2a(J, spec, key, opts) { return runG1a(J, spec, key, { ...(opts || {}), test: TESTS_G2A[key] }); }

// ── G2a ANALYSIS (measurement only; needs the run's recs with keepStates) ─────────────────────────────────────────────────────────────
// Yaw: pelvis / chest heading relative to the intended heading, trunk counter-rotation. ANGULAR-MOMENTUM BUDGET: the vertical angular
// momentum L_z about the whole-body COM, split by body group (legs, pelvis, trunk = abdomen + chest + head, arms) — what the arms and trunk
// cancel of the legs' swing, and what remains for the turf to supply (whole-body L_z). Gait: per-swing clearance, ankle lift, heel rise
// before toe-off, joint ranges, the contact sequence at touchdown (which part of the sole touched first, the time until the sole is down),
// stance knee bend, pelvis bob / roll, lateral COM sway. Style: the realised trunk twist and arm swing against the reference's own ranges.
import { V as V2, Q as Q2 } from "./pc_math.js";
import { csOfRel } from "./pc_control.js";
import { refPose, inPlaceWalkParams, ofLoco } from "./pc_ref.js";
const DEG = 180 / Math.PI, r1 = (x, d = 1) => (x == null || !Number.isFinite(x) ? null : +x.toFixed(d)), ptp = (a) => (a.length ? Math.max(...a) - Math.min(...a) : null);
const mean = (a) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : null), wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const yawOfQ = (q) => { const f = Q2.rot(q, [0, 0, 1]); return Math.atan2(f[0], f[2]); };
const pearson = (a, b) => { const ma = mean(a), mb = mean(b); let sab = 0, saa = 0, sbb = 0; for (let i = 0; i < a.length; i++) { sab += (a[i] - ma) * (b[i] - mb); saa += (a[i] - ma) ** 2; sbb += (b[i] - mb) ** 2; } return saa > 0 && sbb > 0 ? sab / Math.sqrt(saa * sbb) : null; };
// joint angles (degrees) of the ACTUAL bodies: sixdof → swing y / z and twist t (the pc_control paramTarget convention); hinge → a
export function jointAngles(spec, S, k) { const j = spec.joints[k], rel = Q2.mul(Q2.conj(S[j.parentIndex].rot), S[j.childIndex].rot);
  if (j.type === "hinge") { const a = j.axis, s = rel[0] * a[0] + rel[1] * a[1] + rel[2] * a[2]; return { a: 2 * Math.atan2(s, rel[3]) * DEG }; }
  let q = csOfRel(j, rel); if (q[3] < 0) q = q.map(v => -v); return { y: 2 * Math.atan2(q[1], q[3]) * DEG, z: 2 * Math.atan2(q[2], q[3]) * DEG, t: 2 * Math.atan2(q[0], q[3]) * DEG }; }
export const AM_GROUPS = { legs: ["thigh_L", "shin_L", "foot_L", "thigh_R", "shin_R", "foot_R"], pelvis: ["pelvis"], trunk: ["abdomen", "chest", "head"], arms: ["upperArm_L", "foreArm_L", "upperArm_R", "foreArm_R"] };
// L_z per group about the whole-body COM (kg·m²/s)
export function amBudget(spec, S) { const M = spec.bodies.reduce((a, b) => a + b.mass, 0); let c = [0, 0, 0]; S.forEach((q, i) => { c = V2.add(c, V2.sc(q.com, spec.bodies[i].mass)); }); c = V2.sc(c, 1 / M);
  const out = { all: 0 }; for (const g in AM_GROUPS) out[g] = 0;
  S.forEach((q, i) => { const b = spec.bodies[i], wl = Q2.rot(Q2.conj(q.rot), q.w), L = V2.add(Q2.rot(q.rot, [b.inertia[0] * wl[0], b.inertia[1] * wl[1], b.inertia[2] * wl[2]]), V2.sc(V2.cross(V2.sub(q.com, c), q.v), b.mass));
    for (const g in AM_GROUPS) if (AM_GROUPS[g].includes(b.name)) out[g] += L[1]; out.all += L[1]; }); return out; }
export function analyzeG2a(spec, r, opts) { const R_ = r.recs, bi = (n) => spec.bodies.findIndex(b => b.name === n), ji = (n) => spec.joints.findIndex(j => j.name === n), o = opts || {};
  if (!R_ || !R_.length || !R_[0].states) return null;
  const box = spec.bodies[bi("foot_R")].shapes[0], soleY = box.pos[1] - box.he[1], flatAnkle = R_[0].states[bi("foot_R")].pos[1];
  const corner = (S, s, sx, sz) => { const f = S[bi("foot_" + s)]; return V2.add(f.pos, Q2.rot(f.rot, [box.pos[0] + sx * box.he[0], soleY, box.pos[2] + sz * box.he[2]])); };
  const lowest = (S, s) => Math.min(...[-1, 1].flatMap(sx => [-1, 1].map(sz => corner(S, s, sx, sz)[1])));
  const heelH = (S, s) => Math.min(corner(S, s, -1, -1)[1], corner(S, s, 1, -1)[1]);
  const st = r.steps.filter(s => s.liftoffT != null && s.tdT != null), t0 = o.t0 ?? (st[2] ? st[2].tdT : st.length ? st[0].tdT : 1), t1 = o.t1 ?? (st.length ? st[st.length - 1].tdT : R_[R_.length - 1].t);
  const W = R_.filter(q => q.t >= t0 && q.t <= t1), at = (t) => R_.find(q => q.t >= t - 1e-9) || R_[R_.length - 1];
  // the INTENDED heading (an intended turn, rhythm.turn, rotates it): yaw is measured against it
  const T_ = TESTS_G2A[r.test] || {}, turn = T_.loco && T_.loco.rhythm && T_.loco.rhythm.turn, mj = (x) => { x = Math.max(0, Math.min(1, x)); return x * x * x * (10 - 15 * x + 6 * x * x); };
  const intended = (t) => turn ? turn.deg * Math.PI / 180 * mj((t - turn.at) / turn.dur) : 0, fwdYaw = (q) => Math.atan2(Q2.rot(q, [0, 0, 1])[0], Q2.rot(q, [0, 0, 1])[2]);
  const yaw0 = Math.atan2(...(() => { const a = Q2.rot(R_[0].states[bi("foot_L")].rot, [0, 0, 1]), b = Q2.rot(R_[0].states[bi("foot_R")].rot, [0, 0, 1]); return [a[0] + b[0], a[2] + b[2]]; })());
  const pel = W.map(q => wrap(yawOfQ(q.states[0].rot) - yaw0 - intended(q.t)) * DEG), che = W.map(q => wrap(yawOfQ(q.states[bi("chest")].rot) - yaw0 - intended(q.t)) * DEG);
  const allPel = R_.map(q => wrap(yawOfQ(q.states[0].rot) - yaw0 - intended(q.t)) * DEG);
  // cycle means (two steps) for the drift: the first and the last full cycle of the window
  const cyc = st.length >= 4 ? 2 * (t1 - t0) / Math.max(1, st.filter(s => s.tdT > t0 && s.tdT <= t1).length) : 1.2;
  const pm = (a, b) => mean(R_.filter(q => q.t >= a && q.t < b).map(q => wrap(yawOfQ(q.states[0].rot) - yaw0 - intended(q.t)) * DEG));
  const lastQ = R_[R_.length - 1], feetYaw = (q) => wrap(Math.atan2(...(() => { const a = Q2.rot(q.states[bi("foot_L")].rot, [0, 0, 1]), b = Q2.rot(q.states[bi("foot_R")].rot, [0, 0, 1]); return [a[0] + b[0], a[2] + b[2]]; })()) - yaw0) * DEG;
  const turned = turn ? { intendedDeg: turn.deg, pelvisDeg: r1(wrap(yawOfQ(lastQ.states[0].rot) - yaw0) * DEG), feetDeg: r1(feetYaw(lastQ)), chestDeg: r1(wrap(yawOfQ(lastQ.states[bi("chest")].rot) - yaw0) * DEG) } : null;
  const am = W.map(q => amBudget(spec, q.states)), amG = {}; for (const g of ["all", ...Object.keys(AM_GROUPS)]) amG[g] = r1(ptp(am.map(x => x[g])), 3);
  const armsVsLegs = r1(pearson(am.map(x => x.arms), am.map(x => x.legs)), 2), trunkVsLegs = r1(pearson(am.map(x => x.trunk + x.pelvis), am.map(x => x.legs)), 2);
  const upperVsLegs = r1(pearson(am.map(x => x.arms + x.trunk + x.pelvis), am.map(x => x.legs)), 2);
  // per-swing kinematics
  const swings = st.filter(s => s.tdT > t0 - 1.5 && s.tdT <= t1).map(s => { const sw = s.sw, F = R_.filter(q => q.t >= s.liftoffT && q.t <= s.tdT), T = s.tdT - s.liftoffT;
    const mid = F.filter(q => q.t >= s.liftoffT + 0.25 * T && q.t <= s.tdT - 0.25 * T), hip = ji("hip_" + sw), kn = ji("knee_" + sw), an = ji("ankle_" + sw);
    const pre = R_.filter(q => q.t >= s.liftoffT - 0.3 && q.t < s.liftoffT && q.feet[sw].touching), after = R_.filter(q => q.t >= s.tdT && q.t <= s.tdT + 0.4);
    const first = after.find(q => q.feet[sw].touching), flat = after.find(q => q.feet[sw].heel && q.feet[sw].toe);
    return { sw, T: r1(T, 3), ankleLiftCm: r1((Math.max(...F.map(q => q.states[bi("foot_" + sw)].pos[1])) - flatAnkle) * 100), minClearCm: r1(Math.min(...mid.map(q => lowest(q.states, sw) - 0)) * 100),
      heelRiseCm: r1(pre.length ? Math.max(...pre.map(q => heelH(q.states, sw))) * 100 : null), hipFlexDeg: r1(-Math.min(...F.map(q => jointAngles(spec, q.states, hip).y))), kneeFlexDeg: r1(Math.max(...F.map(q => jointAngles(spec, q.states, kn).a))),
      ankleRangeDeg: r1(ptp(F.map(q => jointAngles(spec, q.states, an).y))), firstContact: first ? (first.feet[sw].heel && first.feet[sw].toe ? "FLAT" : first.feet[sw].toe ? "FOREFOOT" : first.feet[sw].heel ? "HEEL" : first.feet[sw].state) : null,
      heelDownMs: first && flat ? r1((flat.t - first.t) * 1000, 0) : null }; });
  const sw2 = swings.filter(s => s.T != null), agg = (k, f) => r1(f(sw2.map(s => s[k]).filter(v => v != null)));
  // stance knee bend: the supporting leg's knee during the other leg's swing
  const stK = []; for (const s of st.filter(s => s.tdT > t0 && s.tdT <= t1)) { const sk = ji("knee_" + (s.sw === "L" ? "R" : "L")); for (const q of R_.filter(q => q.t >= s.liftoffT && q.t <= s.tdT)) stK.push(jointAngles(spec, q.states, sk).a); }
  const roll = W.map(q => { const x = Q2.rot(q.states[0].rot, [1, 0, 0]); return Math.asin(Math.max(-1, Math.min(1, x[1]))) * DEG; });
  // style realised vs the reference's own ranges (the reference cycle sampled over one period)
  const tw = W.map(q => jointAngles(spec, q.states, ji("lumbar")).t + jointAngles(spec, q.states, ji("thoracic")).t), shL = W.map(q => jointAngles(spec, q.states, ji("shoulder_L")).y), shR = W.map(q => jointAngles(spec, q.states, ji("shoulder_R")).y);
  const elL = W.map(q => jointAngles(spec, q.states, ji("elbow_L")).a);
  let ref = null; if (ofLoco()) { const P = inPlaceWalkParams(o.over), U = Array.from({ length: 40 }, (_, i) => refPose(P, i / 40, 1));
    ref = { trunkTwistDeg: r1(ptp(U.map(p => (p.spine[1] || 0) + (p.chest[1] || 0)))), pelvisYawDeg: r1(ptp(U.map(p => p.pelvis[1] || 0))), shoulderSwingDeg: r1(ptp(U.map(p => p.upperArm_R[0]))), elbowDeg: r1(ptp(U.map(p => p.foreArm_R[0]))), pelvisRollDeg: r1(ptp(U.map(p => p.pelvis[2] || 0))) }; }
  // arm phase: the RIGHT arm swings back (shoulder y +) while the RIGHT leg is forward (hip flexed, y −): correlation of shoulder_R y with −hip_R y
  const armPhase = r1(pearson(shR, W.map(q => -jointAngles(spec, q.states, ji("hip_R")).y)), 2);
  const satJ = {}; for (const q of R_) if (q.arb) for (const e of q.arb) if (Array.isArray(e.sat) ? e.sat.some(Boolean) : e.sat) satJ[e.joint] = (satJ[e.joint] || 0) + 1;
  return { window: { t0: r1(t0, 3), t1: r1(t1, 3), steps: st.filter(s => s.tdT > t0 && s.tdT <= t1).length },
    yaw: { pelvisPtpDeg: r1(ptp(pel)), pelvisMaxAbsDeg: r1(Math.max(...allPel.map(Math.abs))), chestPtpDeg: r1(ptp(che)), trunkCounterPtpDeg: r1(ptp(W.map((q, i) => che[i] - pel[i]))), driftDegPerCycle: st.length >= 6 ? r1((pm(t1 - cyc, t1) - pm(t0, t0 + cyc)) / Math.max(1, (t1 - t0) / cyc - 1), 2) : null, netDeg: r1(pm(t1 - cyc, t1)), turn: turned, note: "pelvis / chest heading relative to the INTENDED heading (initial feet heading + any intended turn)" },
    angularMomentum: { ptp: amG, armsVsLegs, trunkVsLegs, upperVsLegs, note: "L_z about the whole-body COM (kg·m²/s); ptp over the window; correlation < 0 = counter-rotation" },
    gait: { cadenceSpm: r1(60 / ((t1 - t0) / Math.max(1, st.filter(s => s.tdT > t0 && s.tdT <= t1).length)), 0), swingS: agg("T", mean), ankleLiftCm: agg("ankleLiftCm", mean), minClearCm: agg("minClearCm", (a) => Math.min(...a)), heelRiseCm: agg("heelRiseCm", mean),
      hipFlexDeg: agg("hipFlexDeg", mean), kneeFlexSwingDeg: agg("kneeFlexDeg", mean), ankleRangeDeg: agg("ankleRangeDeg", mean), stanceKneeDeg: { mean: r1(mean(stK)), min: r1(Math.min(...stK)), max: r1(Math.max(...stK)) },
      firstContact: sw2.reduce((a, s) => { a[s.firstContact] = (a[s.firstContact] || 0) + 1; return a; }, {}), heelDownMs: agg("heelDownMs", mean),
      pelvisBobCm: r1(ptp(W.map(q => q.states[0].pos[1])) * 100), pelvisRollDeg: r1(ptp(roll)), comSwayCm: r1(ptp(W.map(q => q.com[0])) * 100) },
    style: { trunkTwistDeg: r1(ptp(tw)), shoulderSwingDeg: { L: r1(ptp(shL)), R: r1(ptp(shR)) }, elbowDeg: r1(ptp(elL)), armPhase, reference: ref },
    satByJoint: satJ, swings }; }
