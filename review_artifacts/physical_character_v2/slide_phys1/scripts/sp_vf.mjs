// SLIDE-PHYS-1 support-chain objectives (the root / COM physicalization): while a support contact exists, whole-body objectives are converted
// into joint-torque INTENT along the supporting chain — forces then arise only from those joint torques reacting against the real contact.
//   COM objective  F = M·(a_d − g): the force the support must apply to the body (here vertical + optional horizontal components);
//                  each support-chain joint j (ankle, knee, hip of the support leg) carries τ_child = −(c − p_j) × F (the static Jacobian-transpose
//                  map of a contact force at c), the classic virtual-model mapping (Pratt 2001; Coros et al. 2010).
//   ORIENTATION    T = K_o·rotvec(R_d R⁻¹) + D_o·(ω_d − ω) on the pelvis, delivered by the support hip net of the other actuators acting on the
//                  pelvis (the free hip and the lumbar joint: SIMBICON's stance-hip rule, Yin et al. 2007).
// Nothing here applies a force or torque to the world: the output is added to the tracker's per-axis intent and goes through M1b like every
// other intent (capacity, activation, force–velocity, eccentric yield). Without a support contact the output is zero (no "hand of god").
const L = await import(new URL("./sp_lib.mjs", import.meta.url).href), { V, Q, JN, B, M, G, bi, ji } = L;
const E3 = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
const rotvec = (Rd, R) => { const dq = Q.mul(Rd, Q.conj(R)), d = dq[3] < 0 ? dq.map(x => -x) : dq, s = Math.hypot(d[0], d[1], d[2]); if (s < 1e-12) return [0, 0, 0]; const a = 2 * Math.atan2(s, d[3]); return [d[0] / s * a, d[1] / s * a, d[2] / s * a]; };
export const jointPos = (st, j) => V.add(st[j.parentIndex].pos, Q.rot(st[j.parentIndex].rot, V.sub(j.at, B[j.parentIndex].origin)));
export const axesW = (st, j) => { const R2F2 = Q.mul(st[j.childIndex].rot, j.F2); return E3.map(e => Q.rot(R2F2, e)); };
// plan = { side: "L", window: [t0, t1] (s), ramp (s), com: (t) => ({ y, vy, ay, az? , ax? }), pelvis: (t) => ({ R, w }), gains: { ky, dy, kh, dh, ko, do } }
export function makeSupportVF(plan) { const s = plan.side, jA = ji("ankle_" + s), jK = ji("knee_" + s), jH = ji("hip_" + s), jHo = ji("hip_" + (s === "L" ? "R" : "L")), jLu = ji("lumbar"), foot = bi("foot_" + s);
  const g = plan.gains;
  let gateW = 0;
  return (tr, t, st, ev) => { const [t0, t1] = plan.window, ramp = plan.ramp || 0.02; if (t < t0 || t > t1) return null;
    let w = Math.min(1, (t - t0) / ramp, (t1 - t) / ramp); if (w <= 0) return null;
    // tactile gate (plan.gate = { clearM }): active only while the support leg touches the turf (its lowest point within clearM), ramped in/out
    if (plan.gate) { let lo = Infinity; for (const nm of ["foot_" + s, "shank_" + s, "thigh_" + s]) { const i = bi(nm); lo = Math.min(lo, L.PL.bodyLowest(B[i], st[i]).y); }
      let ok = lo < plan.gate.clearM;
      if (ok && plan.gate.aheadM != null) { let cm = [0, 0, 0], Pm = [0, 0, 0]; st.forEach((b, i) => { cm = V.add(cm, V.sc(b.com, B[i].mass)); Pm = V.add(Pm, V.sc(b.v, B[i].mass)); }); cm = V.sc(cm, 1 / M);
        const vh = [Pm[0], 0, Pm[2]], vn = V.len(vh) > 0.3 ? V.sc(vh, 1 / V.len(vh)) : [0, 0, 1], fo = st[bi("foot_" + s)].com, ahead = (fo[0] - cm[0]) * vn[0] + (fo[2] - cm[2]) * vn[2]; ok = ahead > plan.gate.aheadM; }
      gateW = Math.max(0, Math.min(1, gateW + (ok ? 1 : -1) * (1 / 240) / (plan.gate.ramp || 0.02))); w *= gateW; if (w <= 0) return null; }
    // whole-body COM state from the body states
    let com = [0, 0, 0], P = [0, 0, 0]; st.forEach((b, i) => { com = V.add(com, V.sc(b.com, B[i].mass)); P = V.add(P, V.sc(b.v, B[i].mass)); }); com = V.sc(com, 1 / M); const v = V.sc(P, 1 / M);
    const c = plan.com(t), cf = plan.lead ? plan.com(t + plan.lead) : c, ay = c.press != null ? (c.press - 1) * G : (cf.ay || 0) + g.ky * (c.y - com[1]) + g.dy * (c.vy - v[1]);   // feed-forward from the plan at t + lead (muscle lag), feedback on the present
    const az = c.az != null ? c.az + (g.dh || 0) * ((c.vz ?? v[2]) - v[2]) : 0, ax = c.ax != null ? c.ax + (g.dh || 0) * ((c.vx ?? v[0]) - v[0]) : 0;
    const Fraw = V.sc([M * ax, M * (ay + G), M * az], w), F = Fraw.slice(); if (F[1] < 0) F[1] = 0;                       // a support can only push
    // contact point: the support boot's sole centre (proprioceptive estimate from the foot's own state, not from the contact solver)
    const fs = st[foot]; let cpt = V.add(fs.pos, Q.rot(fs.rot, [0, -0.09, 0.07]));
    // plan.contactFrom = "lowest": the support point is the lowest point of the fold-leg bodies (foot → shank → thigh), from their own states
    let chain = [jA, jK, jH];
    if (plan.contactFrom === "lowest") { let best = null; for (const nm of ["foot_" + s, "shank_" + s, "thigh_" + s]) { const i = bi(nm), lo = L.PL.bodyLowest(B[i], st[i]); if (!best || lo.y < best.y) best = { ...lo, nm }; }
      if (!best.nm.startsWith("foot")) { const c2 = st[bi(best.nm)].com; cpt = [c2[0], Math.max(0, best.y), c2[2]]; } if (best.nm.startsWith("shank")) chain = [jK, jH]; else if (best.nm.startsWith("thigh")) chain = [jH]; }
    const out = JN.map(() => [0, 0, 0]), add = (k, tw) => { const ax3 = axesW(st, JN[k]); for (let i = 0; i < 3; i++) out[k][i] += V.dot(tw, ax3[i]); };
    for (const k of chain) add(k, V.sc(V.cross(V.sub(cpt, jointPos(st, JN[k])), F), -1));
    // pelvis orientation torque through the support hip (net of the free hip / lumbar intents already planned this step: their reaction on the pelvis)
    if (plan.pelvis && g.ko) { const pd = plan.pelvis(t), pel = st[0], T = V.sc(V.add(V.sc(rotvec(pd.R, pel.rot), g.ko), V.sc(V.sub(pd.w || [0, 0, 0], pel.w), g.do)), w);
      let other = [0, 0, 0]; for (const k of [jHo, jLu]) { const ax3 = axesW(st, JN[k]), it = tr.lastIntent && tr.lastIntent[k]; if (!it) continue; for (let i = 0; i < 3; i++) other = V.sub(other, V.sc(ax3[i], it[i] || 0)); }   // torque those joints put on the pelvis
      add(jH, V.sc(V.sub(T, other), -1)); out.info = { F, Fraw, T, w }; }
    else out.info = { F, Fraw, w };
    return out; }; }
