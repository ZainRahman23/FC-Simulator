// SP2A whole-body inverse dynamics of the incoming RUN-1 motion at one frame (tackler body, the run-in's geometric scaling), with ONE supporting
// foot: every body's required wrench (m(a − g), Iα + ω × Iω about its COM) from central differences of the V2 FK of the animation at k − 1, k, k + 1;
// the ground reaction is whatever balances the whole body (its force and its moment about the plant sole are reported: the kinematic run is not
// exactly dynamically consistent, so the implied centre of pressure is a check); joint torques by subtree sums — a joint whose child subtree
// holds the supporting foot carries minus the wrench of everything on the other side. The result is the torque the muscles must be producing
// at the takeover if the body is to continue the run: SP2A initialises the muscle state to it (sp2_ctrl opts.initTau) instead of a partial
// command (free-chain ID + support objective, with nothing for the trunk joints).
const S1 = new URL("../../slide_phys1/scripts/", import.meta.url).href, L = await import(S1 + "sp_lib.mjs"), { V, Q, B, JN, G } = L;
const E3 = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
const rotRate = (Ra, Rb, dt) => { const dq0 = Q.norm(Q.mul(Rb, Q.conj(Ra))), dq = dq0[3] < 0 ? dq0.map(x => -x) : dq0, s = Math.hypot(dq[0], dq[1], dq[2]); if (s < 1e-12) return [0, 0, 0]; return V.sc([dq[0] / s, dq[1] / s, dq[2] / s], 2 * Math.atan2(s, dq[3]) / dt); };
const sub = (() => { const kids = B.map(() => []); B.forEach((b, i) => { if (b.parentIndex >= 0) kids[b.parentIndex].push(i); }); const S = (i) => [i, ...kids[i].flatMap(S)]; return B.map((_, i) => new Set(S(i))); })();
// states: a function k → V2 body states (pos / rot) of the animation at frame k, h the frame step
export function wholeBodyID(statesAt, k, h, support = "foot_L") { const Sm = statesAt(k - 1), S0 = statesAt(k), Sp = statesAt(k + 1), sup = B.findIndex(b => b.name === support);
  const W = B.map((b, i) => { const cm = L.comBody(Sm, i), c0 = L.comBody(S0, i), cp = L.comBody(Sp, i), a = V.sc(V.add(V.sub(cp, V.sc(c0, 2)), cm), 1 / (h * h));
    const w1 = rotRate(Sm[i].rot, S0[i].rot, h), w2 = rotRate(S0[i].rot, Sp[i].rot, h), w = V.sc(V.add(w1, w2), 0.5), al = V.sc(V.sub(w2, w1), 1 / h), I = L.IL.MC.Iworld(S0[i].rot, b.inertia);
    const F = V.sc(V.add(a, [0, G, 0]), b.mass), T = V.add(L.IL.mat3vec(I, al), V.cross(w, L.IL.mat3vec(I, w))); return { c: c0, F, T }; });
  const Mabout = (ids, p) => ids.reduce((s, i) => V.add(s, V.add(W[i].T, V.cross(V.sub(W[i].c, p), W[i].F))), [0, 0, 0]), Fsum = (ids) => ids.reduce((s, i) => V.add(s, W[i].F), [0, 0, 0]);
  const all = B.map((_, i) => i), tau = JN.map((j) => { const p = L.V.add(S0[j.parentIndex].pos, Q.rot(S0[j.parentIndex].rot, V.sub(j.at, B[j.parentIndex].origin))), sb = sub[j.childIndex];
    const t = sb.has(sup) ? V.sc(Mabout(all.filter(i => !sb.has(i)), p), -1) : Mabout([...sb], p), ax = E3.map(e => Q.rot(Q.mul(S0[j.childIndex].rot, j.F2), e)); return ax.map(a => V.dot(t, a)); });
  // ground reaction (force, and the implied centre of pressure on the turf plane)
  const Fg = Fsum(all), fs = S0[sup >= 0 ? sup : B.findIndex(b => b.name === "foot_L")], sole = V.add(fs.pos, Q.rot(fs.rot, [0, -0.09, 0.07])), Mg = Mabout(all, sole), cop = sup >= 0 && Fg[1] > 1 ? [sole[0] + Mg[2] / Fg[1], 0, sole[2] - Mg[0] / Fg[1]] : null;   // airborne (no support): Fg is the animation's dynamic inconsistency
  return { tau, grf: { F: Fg, BW: V.sc(Fg, 1 / (L.M * G)), copOffsetFromSoleCentre: cop ? V.sub(cop, [sole[0], 0, sole[2]]) : null }, W }; }
