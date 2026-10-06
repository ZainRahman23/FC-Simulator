// scratch (design sizing only, not used by the controller): floating-base D1 — the swingAccWrench resolved-rate / resolved-acceleration
// with the pelvis rigid-body motion (COM c, v, ω, α) and the rotating-frame transport terms. pel = null → identical to swingAccWrench.
import { V, Q } from "/Users/zainrahman/Downloads/FC Simulator worktrees/physical-character-v2/sandbox/visual/physchar2/core/v2_math.js";
import { IK } from "/Users/zainrahman/Downloads/FC Simulator worktrees/physical-character-v2/sandbox/visual/physchar2/ctrl/v2_stand.js";
function solveN(M, y) { const n = y.length, a = M.map((r, i) => [...r, y[i]]); for (let c = 0; c < n; c++) { let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(a[r][c]) > Math.abs(a[p][c])) p = r; if (Math.abs(a[p][c]) < 1e-14) return null; [a[c], a[p]] = [a[p], a[c]];
    for (let r = 0; r < n; r++) if (r !== c) { const f = a[r][c] / a[c][c]; for (let k = c; k <= n; k++) a[r][k] -= f * a[c][k]; } } return a.map((r, i) => r[n] / r[i]); }
export function fbWrench(C, st, ev, n, fr, x, ref, A, pel, terms = { w: true, al: true }) {
  const B = C.spec.bodies, ks = C.legK[n], ch = C.legChain(st, ev, n, fr.pos, fr.rot, null), bodies = ks.map(k => C.spec.joints[k].childIndex);
  const cOff = bodies.map(b => Q.rot(Q.conj(st[b].rot), V.sub(st[b].com, st[b].pos)));
  const kin = (y) => { const P = ch.pose(y); return { R: P.R, p: P.p, c: P.R.map((R, i) => V.add(P.p[i], Q.rot(R, cOff[i]))) }; };
  const angVel = (Ra, Rb, h) => { let q = Q.mul(Ra, Q.conj(Rb)); if (q[3] < 0) q = q.map(v => -v); return [2 * q[0] / h, 2 * q[1] / h, 2 * q[2] / h]; };
  const step = (y, d, s) => y.map((v, i) => v + s * d[i]), eps = IK.h, hT = 1e-3, K0 = kin(x);
  const cols = [0, 1, 2, 3, 4, 5].map(j => { const e = [0, 0, 0, 0, 0, 0]; e[j] = 1; const kp = kin(step(x, e, eps)), km = kin(step(x, e, -eps));
    return { c: K0.c.map((_, b) => V.sc(V.sub(kp.c[b], km.c[b]), 1 / (2 * eps))), w: K0.R.map((_, b) => angVel(kp.R[b], km.R[b], 2 * eps)), pf: V.sc(V.sub(kp.p[2], km.p[2]), 1 / (2 * eps)) }; });
  const Jf = [0, 1, 2, 3, 4, 5].map(r => [0, 1, 2, 3, 4, 5].map(j => (r < 3 ? cols[j].pf[r] : cols[j].w[2][r - 3]))), bad = (v) => !v || v.some(q => !isFinite(q));
  const wp = pel && terms.w ? pel.w : [0, 0, 0], ap = pel && terms.al ? pel.al : [0, 0, 0], rf = pel ? V.sub(K0.p[2], pel.c) : [0, 0, 0];
  const xd = solveN(Jf, [...V.sub(V.sub(ref.vel, ref.vPel || [0, 0, 0]), V.cross(wp, rf)), ...V.sub(ref.w, wp)]); if (bad(xd)) return null;
  const kp = kin(step(x, xd, hT)), km = kin(step(x, xd, -hT)), dd = (b, key) => V.sc(V.add(V.sub(kp[key][b], V.sc(K0[key][b], 2)), km[key][b]), 1 / (hT * hT));
  const wAt = (y) => { const k1 = kin(step(y, xd, eps)), k2 = kin(step(y, xd, -eps)); return k1.R.map((_, b) => angVel(k1.R[b], k2.R[b], 2 * eps)); };
  const wP = wAt(step(x, xd, hT)), wM = wAt(step(x, xd, -hT)), wdot = wP.map((w, b) => V.sc(V.sub(w, wM[b]), 1 / (2 * hT)));
  const lin = (b, key, q) => cols.reduce((s, col, j) => V.add(s, V.sc(col[key][b], q[j])), [0, 0, 0]);
  const vRelF = cols.reduce((s, col, j) => V.add(s, V.sc(col.pf, xd[j])), [0, 0, 0]), wRel = [0, 1, 2].map(b => lin(b, "w", xd)), vRel = [0, 1, 2].map(b => lin(b, "c", xd));
  // transport (world): a = a_rel + α×r + ω×(ω×r) + 2ω×v_rel ; α = α_rel + α_p + ω×ω_rel
  const trA = (r, vr) => V.add(V.add(V.cross(ap, r), V.cross(wp, V.cross(wp, r))), V.sc(V.cross(wp, vr), 2)), trW = (wr) => V.add(ap, V.cross(wp, wr));
  const xdd = solveN(Jf, [...V.sub(V.sub(V.sub(ref.acc, A), dd(2, "p")), trA(rf, vRelF)), ...V.sub(V.sub(ref.al, wdot[2]), trW(wRel[2]))]); if (bad(xdd)) return null;
  const acc = [0, 1, 2].map(b => V.add(V.add(dd(b, "c"), lin(b, "c", xdd)), pel ? trA(V.sub(K0.c[b], pel.c), vRel[b]) : [0, 0, 0]));
  const alpha = [0, 1, 2].map(b => V.add(V.add(wdot[b], lin(b, "w", xdd)), pel ? trW(wRel[b]) : [0, 0, 0])), omega = [0, 1, 2].map(b => V.add(wRel[b], wp));
  const Iw = (b, v) => { const R = K0.R[b], I = B[bodies[b]].inertia, l = Q.rot(Q.conj(R), v); return Q.rot(R, [0, 1, 2].map(i => I[i][0] * l[0] + I[i][1] * l[1] + I[i][2] * l[2])); };
  const T = {}; ks.forEach((k, idx) => { let w = [0, 0, 0]; for (let b = idx; b < 3; b++) w = V.add(w, V.add(V.add(V.cross(V.sub(K0.c[b], K0.p[idx]), V.sc(acc[b], B[bodies[b]].mass)), Iw(b, alpha[b])), V.cross(omega[b], Iw(b, omega[b])))); T[k] = w; });
  return { T, xd, xdd, acc, alpha, omega, Jf, cols, K0 };
}
