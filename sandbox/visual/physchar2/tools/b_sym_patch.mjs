// ═══ physchar2/tools/b_sym_patch.mjs — G3 J2a follow-up: DIAGNOSTIC preload that applies candidate controller mirror-symmetry fixes WITHOUT touching
// production code:   node --import ./tools/b_sym_patch.mjs <tool>   with   B_SYM=region,ik   (forked workers inherit the --import flag).
// The two causes J2a found (g3/G3_V3_EVALUATION.md):
//   region — the usable foot regions: hull2 keeps an EXACTLY collinear sole-hull vertex on the left boot only (rounding decides), and the radial
//            5 mm inset turns it into a 4.8 µm L/R region difference. Candidate fix: remove exactly collinear vertices (chord distance ≤ 1e-12 m)
//            before the inset, so both regions are the same 13-vertex polygon mirrored.
//   ik     — the leg IK's finite-difference Jacobian is ONE-SIDED (x_c + h); mirroring flips the sign of some DOFs, so the mirrored solve samples
//            different points and converges to a different point inside the 1e-9 tolerance (unbounded when the target is out of reach). Candidate
//            fix: a CENTRAL difference (x_c ± h), whose sample set maps onto itself under the mirror. Everything else in legIK is unchanged.
//   iktol  — (alone: production one-sided Jacobian; with ik: central) the IK stops at a residual of 1e-12 instead of 1e-9: with the hard 1e-9 threshold, a rounding-level difference occasionally
//            lets one mirrored solve stop just below it while the other iterates once more (≤ 1e-9 apart → ~1e-5 N·m). At 1e-12 any such
//            coincidence is ≤ 1e-12 rad (≤ 1e-8 N·m).
//   norm   — Q.rot uses the unit-quaternion formula; Jolt's float32-derived body orientations have |q|² − 1 ≈ 3e-7, which adds an unrotated
//            (1 − |q|²)·v term. The L / R joint frames differ by a fixed handedness rotation, so the term lands differently on the two sides
//            (≈ 3e-7 rad axis distortion). Candidate fix: normalise the body orientations at the controller's and actuator layer's input.
// Nothing here is a production configuration.
import { StandController, insetPoly } from "../ctrl/v2_stand.js"; import { ActuatorLayer } from "../sim/v2_actuation.js"; import { bootSole, hull2 } from "../sim/v2_geom.js"; import { pyr, decompose } from "../spec/v2_joints.js"; import { V, Q, dnorm } from "../core/v2_math.js";
const SYM = (process.env.B_SYM || "").split(",").filter(Boolean);
export const dedupCollinear = (P, tol = 1e-12) => { let R = P.slice(), changed = true; while (changed) { changed = false; for (let i = 0; i < R.length; i++) { const a = R[(i - 1 + R.length) % R.length], p = R[i], b = R[(i + 1) % R.length], ex = b[0] - a[0], ez = b[1] - a[1];
  if (Math.abs((p[0] - a[0]) * ez - (p[1] - a[1]) * ex) / Math.hypot(ex, ez) <= tol) { R.splice(i, 1); changed = true; break; } } } return R; };
if (SYM.includes("region")) { const fp = StandController.prototype.footPoly;
  StandController.prototype.footPoly = function (st, n) { if (!this._symRegion) { this._symRegion = true; this.sole = this.feet.map(f => { const s = bootSole(this.spec.bodies[f]); return { y0: s.y0, poly: insetPoly(dedupCollinear(hull2(s.pts)), this.o.footInset) }; }); } return fp.call(this, st, n); }; }
function solveN(M, y) { const n = y.length, a = M.map((r, i) => [...r, y[i]]); for (let c = 0; c < n; c++) { let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(a[r][c]) > Math.abs(a[p][c])) p = r; if (Math.abs(a[p][c]) < 1e-14) return null; [a[c], a[p]] = [a[p], a[c]];
    for (let r = 0; r < n; r++) if (r !== c) { const f = a[r][c] / a[c][c]; for (let k = c; k <= n; k++) a[r][k] -= f * a[c][k]; } } return a.map((r, i) => r[n] / r[i]); }
const IKTOL = SYM.includes("iktol") ? 1e-12 : 1e-9;
const CENTRAL = SYM.includes("ik");   // "iktol" alone = production one-sided Jacobian with only the tighter stopping tolerance
if (SYM.includes("ik") || SYM.includes("iktol")) StandController.prototype.legIK = function (st, ev, n, pP, qP, footPose = null) {   // = production legIK except the Jacobian scheme / tolerance selected above
  const P = this.P, ks = this.legK[n], d = ks.map(k => P.jd[k]), a = ks.map(k => this.anchor[k]), cur = ks.map(k => { const v = decompose(ev.qs[k]); return [v.tw, v.sy, v.sz]; });
  if (this.o.ikRefTwist) { const rf = ks.map(k => { const v = decompose(this.qref[k]); return v.tw; }); cur[1] = [rf[1], cur[1][1], cur[1][2]]; cur[2] = [rf[2], cur[2][1], cur[2][2]]; }
  const ft = footPose || st[this.feet[n]], fk = (x) => { const qh = pyr(x[0], x[1], x[2]), qk = pyr(cur[1][0], x[3], cur[1][2]), qa = pyr(cur[2][0], x[4], x[5]);
    const Rt = Q.mul(Q.mul(Q.mul(qP, d[0].F1), qh), Q.conj(d[0].F2)), pt = V.add(pP, Q.rot(qP, a[0]));
    const Rs = Q.mul(Q.mul(Q.mul(Rt, d[1].F1), qk), Q.conj(d[1].F2)), ps = V.add(pt, Q.rot(Rt, a[1]));
    const Rf = Q.mul(Q.mul(Q.mul(Rs, d[2].F1), qa), Q.conj(d[2].F2)), pf = V.add(ps, Q.rot(Rs, a[2]));
    let qe = Q.mul(ft.rot, Q.conj(Rf)); if (qe[3] < 0) qe = qe.map(v => -v);
    return [pf[0] - ft.pos[0], pf[1] - ft.pos[1], pf[2] - ft.pos[2], -2 * qe[0], -2 * qe[1], -2 * qe[2]]; };
  let x = [cur[0][0], cur[0][1], cur[0][2], cur[1][1], cur[2][1], cur[2][2]], r = fk(x), err = dnorm(...r);
  for (let it = 0; it < 6 && err > IKTOL; it++) { const h = 1e-6, Jm = [0, 1, 2, 3, 4, 5].map(c => { if (!CENTRAL) { const xp = x.slice(); xp[c] += h; const rp = fk(xp); return rp.map((v, i) => (v - r[i]) / h); } const xp = x.slice(), xm = x.slice(); xp[c] += h; xm[c] -= h; const rp = fk(xp), rm = fk(xm); return rp.map((v, i) => (v - rm[i]) / (2 * h)); });
    const A = [0, 1, 2, 3, 4, 5].map(i => [0, 1, 2, 3, 4, 5].map(c => Jm[c][i])), dx = solveN(A, r.map(v => -v)); if (!dx) break;
    let step = 1; for (let ls = 0; ls < 6; ls++) { const xn = x.map((v, i) => v + step * dx[i]), rn = fk(xn), en = dnorm(...rn); if (en < err) { x = xn; r = rn; err = en; break; } step *= 0.5; } }
  const tg = [[ks[0], pyr(x[0], x[1], x[2])], [ks[1], pyr(cur[1][0], x[3], cur[1][2])]]; if (footPose) tg.push([ks[2], pyr(cur[2][0], x[4], x[5])]);
  return { targets: tg, err }; };
if (SYM.includes("norm")) { const nq = (q) => { const l = Math.sqrt(q[0] * q[0] + q[1] * q[1] + q[2] * q[2] + q[3] * q[3]); return [q[0] / l, q[1] / l, q[2] / l, q[3] / l]; }, normSt = (st) => st.map(b => ({ ...b, rot: nq(b.rot) }));
  const oc = StandController.prototype.compute, oa = ActuatorLayer.prototype.compute;
  StandController.prototype.compute = function (st, ev, dt) { return oc.call(this, normSt(st), ev, dt); };
  ActuatorLayer.prototype.compute = function (st, ev, cmd, dt, init) { return oa.call(this, normSt(st), ev, cmd, dt, init); }; }
if (SYM.length) console.error(`[b_sym_patch] DIAGNOSTIC controller patch active: ${SYM.join(", ")}`);
