// HYBRID-RUN-1 RELATIVE-MOTION chain inverse dynamics: slide_phys1/scripts/sp_id.mjs makeChainID, statement for statement, with two changes:
//   (1) the base joint point's linear acceleration is taken as ZERO;
//   (2) gravity is omitted.
// The feed-forward then covers only the limb's motion RELATIVE to a uniformly accelerating body. Under the hybrid runner's gait support, every
// body receives its mass share of the support force, and gravity is uniform too, so neither produces relative motion. sp_id's own version would
// count both twice, and its finite-differenced base acceleration carries every contact spike.
// SLIDE-PHYS-1 inverse-dynamics feed-forward for a FREE serial limb chain (the motor program part of computed-torque control):
// given the ACTUAL state of the chain's root body (pelvis or thorax: rotation, ω, its joint-point acceleration estimated from the previous step)
// and the TARGET joint rotations of the chain at t − h, t, t + h (choreography), recursive Newton–Euler gives the joint torques that would
// produce the target relative motion with the actual base motion. The result is torque INTENT (it goes through M1b like any other intent:
// capacity, activation, force–velocity apply); it is only used for chains without ground contact (swing legs, arms), gated by the caller.
const L = await import(new URL("../../slide_phys1/scripts/sp_lib.mjs", import.meta.url).href), { V, Q, B, JN, G, ji, bi } = L;
const C = await import(new URL("../../slide_phys1/scripts/sp_chor.mjs", import.meta.url).href);
const E3 = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
const rotRate = (Ra, Rb, dt) => { const dq0 = Q.norm(Q.mul(Rb, Q.conj(Ra))), dq = dq0[3] < 0 ? dq0.map(x => -x) : dq0, s = Math.hypot(dq[0], dq[1], dq[2]); if (s < 1e-12) return [0, 0, 0]; const a = 2 * Math.atan2(s, dq[3]); return V.sc([dq[0] / s, dq[1] / s, dq[2] / s], a / dt); };
// chain = [jointName, …] proximal → distal (each joint's child is the next joint's parent)
export function makeChainID(chainNames, chor, h = 1 / 240) { const ks = chainNames.map(ji), J = ks.map(k => JN[k]);
  let prevBase = null;
  // target world rotations of the chain bodies given the base rotation R0 (actual) and anatomical targets at time t
  const rots = (R0, t) => { const an = chor.anatAt(t), R = [R0]; for (const j of J) R.push(L.childRotation(j, R[R.length - 1], an[j.name] || {})); return R; };
  return (st, t) => { const base = J[0].parentIndex, sb = st[base];
    // base joint-point linear acceleration from the previous step's base state (finite difference); no history → gravity-free assumption
    const p0 = V.add(sb.pos, Q.rot(sb.rot, V.sub(J[0].at, B[base].origin))), v0 = V.add(sb.v, V.cross(sb.w, V.sub(p0, sb.com)));
    const a0 = [0, 0, 0], wb0 = prevBase ? V.sc(V.sub(sb.w, prevBase.w), 1 / h) : [0, 0, 0]; prevBase = { v0, w: sb.w };
    // target kinematics: relative rotations from the targets, applied on the ACTUAL base rotation at t−h, t, t+h (base assumed to rotate at ω_base)
    const Rb = (dt) => { const a = V.len(sb.w) * dt; return a === 0 ? sb.rot : Q.norm(Q.mul(Q.axis(V.norm(sb.w), a), sb.rot)); };
    const Rm = rots(Rb(-h), t - h), R0 = rots(sb.rot, t), Rp = rots(Rb(h), t + h);
    const n = J.length, w = [], al = [], pos = [], acc = [], com = [];
    // joint positions and body COM positions along the target chain at t (from the actual base joint point)
    let pj = p0; const jp = [p0];
    for (let i = 0; i < n; i++) { const ch = J[i].childIndex, R = R0[i + 1]; w[i] = V.sc(V.add(rotRate(Rm[i + 1], R, h), rotRate(R, Rp[i + 1], h)), 0.5); al[i] = V.sc(V.sub(rotRate(R, Rp[i + 1], h), rotRate(Rm[i + 1], R, h)), 1 / h);
      com[i] = V.add(pj, Q.rot(R, V.sub(V.add(B[ch].origin, B[ch].comLocal), J[i].at))); if (i + 1 < n) { pj = V.add(pj, Q.rot(R, V.sub(J[i + 1].at, J[i].at))); jp.push(pj); } }
    // linear accelerations: propagate a(p) = a0 + Σ [α × r + ω × (ω × r)] along the chain from the base joint point
    let aj = a0; for (let i = 0; i < n; i++) { const rc = V.sub(com[i], jp[i]); acc[i] = V.add(aj, V.add(V.cross(al[i], rc), V.cross(w[i], V.cross(w[i], rc))));
      if (i + 1 < n) { const rn = V.sub(jp[i + 1], jp[i]); aj = V.add(aj, V.add(V.cross(al[i], rn), V.cross(w[i], V.cross(w[i], rn)))); } }
    // backward Newton–Euler: wrench the parent applies to the subchain at each joint
    let Fd = [0, 0, 0], Td = [0, 0, 0], pd = null; const tau = [];
    for (let i = n - 1; i >= 0; i--) { const ch = J[i].childIndex, m = B[ch].mass, I = L.IL.MC.Iworld(R0[i + 1], B[ch].inertia), Iw = L.IL.mat3vec(I, w[i]), Ia = L.IL.mat3vec(I, al[i]);
      const F = V.add(V.sc(acc[i], m), Fd), T = V.add(V.add(V.add(Ia, V.cross(w[i], Iw)), Td), V.add(V.cross(V.sub(com[i], jp[i]), V.sc(acc[i], m)), pd ? V.cross(V.sub(pd, jp[i]), Fd) : [0, 0, 0]));
      tau[i] = T; Fd = F; Td = T; pd = jp[i]; }
    // torque on child about the joint → per-axis intent on the joint's current constraint axes (actual child rotation)
    const out = {}; ks.forEach((k, i) => { const j = JN[k], R2F2 = Q.mul(st[j.childIndex].rot, j.F2); out[k] = E3.map(e => V.dot(tau[i], Q.rot(R2F2, e))); }); return out; }; }
