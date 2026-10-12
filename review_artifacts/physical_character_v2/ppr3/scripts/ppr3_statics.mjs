// PPR-3 statics: rest statics for an arbitrary uniform field g⃗ (each body carries m_i·g⃗), feet on the ground. Generalises PPR-2 restStatics
// (ppr2_substrate.mjs, which is the g⃗ = (0, −9.81, 0) case): the ground forces balance the total load −M·g⃗; horizontal parts split equally between
// the feet, plus PPR-2's self-cancelling inward pair; vertical loads and a common centre-of-pressure shift d are solved so the ground forces have no
// net moment about the COM (the field's own moment about the COM is zero). Joint torques by the same subtree sums and per-axis projection.
// Uses: (1) the static Jacobian-transpose map of a virtual horizontal force on the COM, J_f = ∂τ/∂f (N·m per N) — the torques that would hold the
// body still against an external force f at the COM (P2's COM channel); (2) gravitational stiffness of a sub-chain: −∂τ_static/∂θ when that
// chain is rotated about a joint axis (orientation-channel normalisation).
const RA = new URL("../../", import.meta.url).href, PL = await import(RA + "pvp1/scripts/pvp1a_lib.mjs"), { V, Q, P2 } = PL;
const { unitStates, unitEv } = await import(P2 + "core/v2_math.js"), { lockedAxisFF } = await import(P2 + "ctrl/v2_stand.js"), { decompose } = await import(P2 + "spec/v2_joints.js");
const E = [[1, 0, 0], [0, 1, 0], [0, 0, 1]], G0 = 9.81;
export function staticsG(c, st, g, qsOverride = null, pairOverride = null) { st = unitStates(st); const C = c.ctrl, B = c.spec.bodies, M = C.M, P = c.P, qs = qsOverride || unitEv(c.up.ev).qs;
  let cm = [0, 0, 0]; st.forEach((b, i) => { cm = V.add(cm, V.sc(b.com, B[i].mass)); }); cm = V.sc(cm, 1 / M);
  const cp = C.feet.map((f, n) => V.add(st[f].pos, Q.rot(st[f].rot, c.pd.sole[n]))), Lv = [cp[1][0] - cp[0][0], 0, cp[1][2] - cp[0][2]], u = V.sc(Lv, 1 / V.len(Lv));
  const hPD = cp.map(p => { const hz = Math.max(0.05, cm[1] - p[1]); return V.sc([(cm[0] - p[0]) / hz, 0, (cm[2] - p[2]) / hz], M * G0 / 2); }), iPair = pairOverride != null ? pairOverride : (V.dot(hPD[0], u) - V.dot(hPD[1], u)) / 2;
  // unknowns (s, dp, ζ): vertical split s (lever rule), COP shift dp along w (horizontal, ⟂ the inter-foot line; a shift along the line is the
  // same as changing s), and a friction yaw couple ±ζ·w between the feet (balances the yaw moment of horizontal loads when the COM is not over
  // the inter-foot midpoint)
  const Fv = -M * g[1], h = [-M * g[0] / 2, 0, -M * g[2] / 2], w = [-u[2], 0, u[0]];
  const forces = (s, dp, zt) => { const d = V.sc(w, dp), F = [V.add(V.add(V.add(h, [0, (1 - s) * Fv, 0]), V.sc(u, iPair)), V.sc(w, zt)), V.add(V.add(V.add(h, [0, s * Fv, 0]), V.sc(u, -iPair)), V.sc(w, -zt))], A = cp.map(p => V.add(p, d)); return { F, A }; };
  const mom = (x) => { const { F, A } = forces(x[0], x[1], x[2]); return V.add(V.cross(V.sub(A[0], cm), F[0]), V.cross(V.sub(A[1], cm), F[1])); };
  // linear in (s, dx, dz): solve the 3 × 3 system from four evaluations
  const x0 = [0.5, 0, 0], m0 = mom(x0), Jc = [0, 1, 2].map(j => { const x = x0.slice(); x[j] += 1; return V.sub(mom(x), m0); });
  const Mx = [[Jc[0][0], Jc[1][0], Jc[2][0]], [Jc[0][1], Jc[1][1], Jc[2][1]], [Jc[0][2], Jc[1][2], Jc[2][2]]], rhs = V.sc(m0, -1);
  const det = (m) => m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
  const D0 = det(Mx), sol = [0, 1, 2].map(j => det(Mx.map((row, r) => row.map((v, cI) => (cI === j ? rhs[r] : v)))) / D0), x = V.add(x0, sol), { F, A } = forces(x[0], x[1], x[2]);
  const tff = []; for (const dj of P.jd) { const k = dj.k, pj = C.jointAt(st, k); let T = [0, 0, 0];
    for (const i of C.sub[k]) T = V.sub(T, V.cross(V.sub(st[i].com, pj), V.sc(g, B[i].mass)));
    for (const f of C.subFeet[k]) { const n = C.feet.indexOf(f); T = V.sub(T, V.cross(V.sub(A[n], pj), F[n])); }
    const axW = E.map(e => Q.rot(Q.mul(st[dj.child].rot, dj.F2), e)), q = qs[k], Lk = C.o.ffLockedAxis ? C.lockedFix[k] : null, tB1 = Lk != null ? lockedAxisFF(T, axW, decompose(q).tw, Lk) : 0;
    tff[k] = [0, 1, 2].map(i => (Lk != null && i === 3 - Lk ? tB1 : V.dot(T, axW[i]))); }
  return { tff, loads: [(1 - x[0]) * Fv, x[0] * Fv], copShift: V.sc(w, x[1]), yawCouple: x[2], internalPair: iPair, com: cm, residualMoment: V.len(mom(x)) }; }
// J_f: torque per newton of a virtual external force on the COM, along world x (forward) and z (left); [k][i] → [∂τ/∂fx, ∂τ/∂fz]
export function comForceJacobian(c, st) { const M = c.ctrl.M, base = staticsG(c, st, [0, -G0, 0]).tff, ex = staticsG(c, st, [1 / M, -G0, 0]).tff, ez = staticsG(c, st, [0, -G0, 1 / M]).tff;
  return base.map((r, k) => r.map((t, i) => [ex[k][i] - t, ez[k][i] - t])); }
// rigid rotation of a set of bodies about a world point / axis (for gravitational-stiffness probes); returns a modified state array (com, pos, rot)
export function rotateBodies(st, ids, pivot, axis, ang) { const q = [...V.sc(axis, Math.sin(ang / 2)), Math.cos(ang / 2)];
  return st.map((s, i) => (ids.includes(i) ? { ...s, pos: V.add(pivot, Q.rot(q, V.sub(s.pos, pivot))), com: V.add(pivot, Q.rot(q, V.sub(s.com, pivot))), rot: Q.norm(Q.mul(q, s.rot)) } : s)); }
// squat-mode probe (closed chain, feet fixed): the pelvis and everything above translate down by dy (orientation kept); each leg's thigh and shank
// are re-solved by two-link inverse kinematics in the plane of ankle, hip and the original knee; feet unchanged. Returns the probed state, the
// constraint rotations and each knee's anatomical flexion change — so −∂τ_knee/∂θ_knee along the squat mode can be read from staticsG.
export function squatProbe(c, st, dy) { return displaceProbe(c, st, [0, -dy, 0]); }
// general closed-chain probe: pelvis + everything above translate by v (orientation kept); legs re-solved (two-link IK, feet fixed)
export function displaceProbe(c, st, vDisp) { st = unitStates(st); const spec = c.spec, B = spec.bodies, P = c.P, jA = (n) => spec.joints.find(j => j.name === n), jk = (n) => spec.joints.findIndex(j => j.name === n);
  const between = (a, b) => { a = V.norm(a); b = V.norm(b); const cr = V.cross(a, b), d = V.dot(a, b), s = Math.sqrt(2 * (1 + d)); return Q.norm([cr[0] / s, cr[1] / s, cr[2] / s, s / 2]); };
  const legBodies = new Set(); const out = st.map(s => ({ ...s })), down = vDisp;
  for (const side of ["L", "R"]) { const hip = jA("hip_" + side), knee = jA("knee_" + side), ank = jA("ankle_" + side), th = hip.childIndex, sh = knee.childIndex;
    legBodies.add(th); legBodies.add(sh); legBodies.add(ank.childIndex);
    const H = c.ctrl.jointAt(st, jk("hip_" + side)), K = c.ctrl.jointAt(st, jk("knee_" + side)), A = c.ctrl.jointAt(st, jk("ankle_" + side)), Lt = V.dist(H, K), Ls = V.dist(K, A), H2 = V.add(H, down);
    const ah = V.sub(H2, A), dah = V.len(ah), ex = V.sc(ah, 1 / dah), nrm = V.norm(V.cross(V.sub(H, A), V.sub(K, A))), ey = V.norm(V.cross(nrm, ex)), sgn = Math.sign(V.dot(V.sub(K, A), ey)) || 1;
    const xk = (Ls * Ls - Lt * Lt + dah * dah) / (2 * dah), yk = Math.sqrt(Math.max(0, Ls * Ls - xk * xk)) * sgn, K2 = V.add(A, V.add(V.sc(ex, xk), V.sc(ey, yk)));
    const qs = between(V.sub(K, A), V.sub(K2, A)), qt = between(V.sub(K, H), V.sub(K2, H2));
    const sS = st[sh]; out[sh] = { ...sS, pos: V.add(A, Q.rot(qs, V.sub(sS.pos, A))), com: V.add(A, Q.rot(qs, V.sub(sS.com, A))), rot: Q.norm(Q.mul(qs, sS.rot)) };
    const sT = st[th]; out[th] = { ...sT, pos: V.add(K2, Q.rot(qt, V.sub(sT.pos, K))), com: V.add(K2, Q.rot(qt, V.sub(sT.com, K))), rot: Q.norm(Q.mul(qt, sT.rot)) }; }
  st.forEach((s, i) => { if (!legBodies.has(i)) out[i] = { ...s, pos: V.add(s.pos, down), com: V.add(s.com, down) }; });
  const rots0 = st.map(s => s.rot), rots1 = out.map(s => s.rot), qs0 = P.jd.map(d => Q.norm(P.qcs(d, rots0))), qs1 = P.jd.map(d => Q.norm(P.qcs(d, rots1)));
  const kneeD = ["L", "R"].map(sd => { const k = jk("knee_" + sd); return P.anat(P.jd[k], qs1[k], "flex") - P.anat(P.jd[k], qs0[k], "flex"); });
  return { st: out, qs: qs1, qs0, kneeDeltaDeg: kneeD }; }
// minimum-effort internal pair (static optimisation, Crowninshield & Brand 1981 form): the inward force pair between the feet is statically
// indeterminate (any value balances); choose the one minimising Σ (τ_j / capIso_j)² over the actuated axes it changes (τ is affine in the pair).
// caps: [k][i] → isometric capacity of the side that would act (mean of the two sides is used). Returns { pair, tff }.
export function minEffortStatics(c, st, caps) { const t0 = staticsG(c, st, [0, -9.81, 0], null, 0).tff, t1 = staticsG(c, st, [0, -9.81, 0], null, 1).tff; let num = 0, den = 0;
  t0.forEach((r, k) => r.forEach((a, i) => { const cp = caps[k] && caps[k][i]; if (!cp) return; const g = t1[k][i] - a; if (Math.abs(g) < 1e-9) return; const w = 1 / (cp * cp); num += w * g * a; den += w * g * g; }));
  const pair = den > 0 ? -num / den : 0; return { pair, ...staticsG(c, st, [0, -9.81, 0], null, pair) }; }
// gravitational stiffness of a whole-body translation mode (closed chain, feet fixed): K = −∂²U/∂δ² (N/m; positive = destabilising),
// U = Σ m_i g y_i over the probed states for displacement ±δ along unit vector u
export function modeStiffness(c, st, u, delta = 0.002) { st = unitStates(st); const B = c.spec.bodies, U = (S) => S.reduce((a, b, i) => a + B[i].mass * 9.81 * b.com[1], 0);
  const up = displaceProbe(c, st, V.sc(u, delta)).st, dn = displaceProbe(c, st, V.sc(u, -delta)).st, M = c.ctrl.M;
  const comOf = (S) => V.sc(S.reduce((a, b, i) => V.add(a, V.sc(b.com, B[i].mass)), [0, 0, 0]), 1 / M), dCom = V.dot(V.sub(comOf(up), comOf(dn)), u) / 2;
  return { K: -(U(up) + U(dn) - 2 * U(st)) / (delta * delta), comPerDisp: dCom / delta }; }
// frontal-plane four-bar sway mode (wide stance): each leg (thigh + shank + foot, knee and ankle angles frozen) rotates rigidly about its ankle
// about world x; the pelvis is the coupler (hip distance preserved), the rest of the body rides rigidly on the pelvis. Left-leg angle φ is the
// input, the right-leg angle is solved from the hip-distance constraint. Returns K = −∂²U/∂z_COM² (N/m; positive = destabilising, negative =
// stabilising like a hanging pendulum) and the COM shift per radian. Feet are not moved (no contact model; geometry only).
export function fourBarML(c, st, phi = 0.004) { st = unitStates(st); const spec = c.spec, B = spec.bodies, jk = (n) => spec.joints.findIndex(j => j.name === n);
  const kids = B.map(() => []); B.forEach((b, i) => { if (b.parentIndex >= 0) kids[b.parentIndex].push(i); }); const sub = (i) => [i, ...kids[i].flatMap(sub)];
  const leg = { L: sub(spec.joints[jk("hip_L")].childIndex), R: sub(spec.joints[jk("hip_R")].childIndex) }, upper = B.map((_, i) => i).filter(i => !leg.L.includes(i) && !leg.R.includes(i));
  const A = { L: c.ctrl.jointAt(st, jk("ankle_L")), R: c.ctrl.jointAt(st, jk("ankle_R")) }, Hp = { L: c.ctrl.jointAt(st, jk("hip_L")), R: c.ctrl.jointAt(st, jk("hip_R")) }, w = V.dist(Hp.L, Hp.R), X = [1, 0, 0];
  const rotAbout = (p, piv, ang) => V.add(piv, Q.rot([Math.sin(ang / 2), 0, 0, Math.cos(ang / 2)], V.sub(p, piv)));
  const pose = (pL) => { let lo = -0.2, hi = 0.2; const f = (pR) => V.dist(rotAbout(Hp.L, A.L, pL), rotAbout(Hp.R, A.R, pR)) - w; for (let it = 0; it < 80; it++) { const m = (lo + hi) / 2; if (f(lo) * f(m) <= 0) hi = m; else lo = m; } const pR = (lo + hi) / 2;
    const HL = rotAbout(Hp.L, A.L, pL), HR = rotAbout(Hp.R, A.R, pR), d0 = V.sub(Hp.R, Hp.L), d1 = V.sub(HR, HL), ang = Math.atan2(d0[1] * d1[2] - d0[2] * d1[1], d0[1] * d1[1] + d0[2] * d1[2]), q = [Math.sin(ang / 2), 0, 0, Math.cos(ang / 2)];
    return st.map((b, i) => { if (leg.L.includes(i)) return { com: rotAbout(b.com, A.L, pL) }; if (leg.R.includes(i)) return { com: rotAbout(b.com, A.R, pR) }; return { com: V.add(HL, Q.rot(q, V.sub(b.com, Hp.L))) }; }); };
  const U = (S) => S.reduce((a, b, i) => a + B[i].mass * 9.81 * b.com[1], 0), M = c.ctrl.M, cz = (S) => S.reduce((a, b, i) => a + B[i].mass * b.com[2], 0) / M;
  const S0 = pose(0), Sp = pose(phi), Sm = pose(-phi), dz = (cz(Sp) - cz(Sm)) / 2, d2U = (U(Sp) + U(Sm) - 2 * U(S0)) / (phi * phi);
  return { K: -d2U / (dz / phi) ** 2, comPerRad: dz / phi, instantCentreNote: "legs rigid about the ankles; pelvis coupler" }; }
