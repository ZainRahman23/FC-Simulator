// ═══ physchar2/tools/ik_cert_core.mjs — pre-G4 runway (reachability taxonomy): the shared core of the leg-IK infeasibility certificate.
// Used by tools/ik_certificate.mjs (6-D, the IK problem as defined), tools/ik_twist_free.mjs (8-D, the held twist DOFs freed) and the
// permanent soundness regression R6 (tools/v2_component_regressions.mjs). Research instrumentation only — no controller code depends on it.
//
// Problem: is there x inside the box [lo, hi] with ‖r(x)‖ ≤ tol, r = the leg IK residual (ankle-centre position, m; 2·vec of the foot
// orientation error, rad; unweighted)? Branch-and-bound with a rigorous Lipschitz cell bound:  min_{cell} ‖r‖ ≥ ‖r(c)‖ − Σ_i LIP_i·h_i.
// LIP_i = lever_i + 1:
//   orientation: every coordinate rotates the foot by at most its own change (twist about a unit axis; pyramid swing q ∝ (0, tan(sy/2),
//     tan(sz/2), 1) has angular speed (1 + a)·√(1 + b)/(1 + a + b) ≤ 1 per unit coordinate for |sy|, |sz| < 90°, true for every leg box);
//     constant frame rotations preserve angles; 2·vec(q_err) is 1-Lipschitz in the rotation angle and its norm is continuous across the
//     sign normalisation → 1 per coordinate;
//   position (the ankle centre): hip coordinates rotate the hip→ankle vector (length ≤ thigh + shank) → L1 + L2; knee coordinates rotate
//     the knee→ankle vector → L2; ankle coordinates do not move the ankle centre → 0.
// Path argument: change one coordinate at a time inside the cell (the cell is inside the box, so the rate bounds hold along the path).
// Soundness is also tested empirically (R6; tools/ik_certificate.mjs --soundness). Valid up to floating-point rounding (≈ 1e-15 vs tol 1e-6).
import { V, Q, dnorm } from "../core/v2_math.js"; import { pyr, decompose } from "../spec/v2_joints.js";

// levers for the 6-D problem [hip tw, sy, sz, knee sy, ankle sy, sz] or the 8-D problem [hip tw, sy, sz, knee tw, knee sy, ankle tw, sy, sz]
// tight (opt-in): a TWIST coordinate rotates its child segment about a segment-fixed axis through the joint centre (pyr = swing·twist, so the
// twist axis is F2·X in the child body frame). The ankle's displacement per radian is its distance from that axis: knee twist → the ankle's
// perpendicular distance from the shank twist axis (pk); hip twist → ≤ the knee's distance from the thigh twist axis (ph) + shank length.
// In this skeleton pk = ph = 0 to rounding (the twist axes run through the next joint centre), so the knee-axial lever is 0 and the hip-twist
// lever is L2 instead of L1 + L2 (each + 1 nm guard). The default (generic) levers are the ones of record for the runway's 6-D sweep.
export function certLevers(ctrl, n, dims = 6, tight = false) {
  const ks = ctrl.legK[n], a1 = ctrl.anchor[ks[1]], a2 = ctrl.anchor[ks[2]], L1 = V.len(a1), L2 = V.len(a2);
  const ph = V.len(V.cross(Q.rot(ctrl.P.jd[ks[0]].F2, [1, 0, 0]), a1)), pk = V.len(V.cross(Q.rot(ctrl.P.jd[ks[1]].F2, [1, 0, 0]), a2)), hipTw = tight ? ph + L2 + 1e-9 : L1 + L2, kneeTw = tight ? pk + 1e-9 : L2;   // + 1 nm: a rounding guard (pk, ph ≈ 1e-16 m)
  const lev = dims === 8 ? [hipTw, L1 + L2, L1 + L2, kneeTw, L2, 0, 0, 0] : [hipTw, L1 + L2, L1 + L2, L2, 0, 0];
  return { L1, L2, ph, pk, lever: lev, LIP: lev.map(v => v + 1) };
}

// depth-first branch-and-bound; bisects the coordinate with the largest LIP·h. Returns PROVEN-INFEASIBLE (every cell pruned), FEASIBLE
// (a cell centre with ‖r‖ ≤ tol: constructive), or UNDECIDED (cap reached).
export function branchAndBound(fk, lo, hi, LIP, cap, tol = 1e-6) {
  const N = lo.length, stack = [{ c: lo.map((l, i) => (l + hi[i]) / 2), h: lo.map((l, i) => (hi[i] - l) / 2) }]; let evals = 0, minLB = Infinity;
  while (stack.length) { if (evals >= cap) return { verdict: "UNDECIDED", evals, openCells: stack.length, minLowerBound: minLB };
    const cell = stack.pop(); evals++; const r = dnorm(...fk(cell.c)); if (r <= tol) return { verdict: "FEASIBLE", evals, openCells: stack.length, x: cell.c, minLowerBound: minLB };
    const lb = r - cell.h.reduce((a, h, i) => a + LIP[i] * h, 0); if (lb > tol) continue; minLB = Math.min(minLB, lb);
    let j = 0, w = -1; for (let i = 0; i < N; i++) { const wi = LIP[i] * cell.h[i]; if (wi > w) { w = wi; j = i; } }
    const h2 = cell.h.slice(); h2[j] /= 2; for (const sgn of [-1, 1]) { const c2 = cell.c.slice(); c2[j] += sgn * h2[j]; stack.push({ c: c2, h: h2 }); } }
  return { verdict: "PROVEN-INFEASIBLE", evals, openCells: 0, minLowerBound: minLB };
}

// follow the chain of cells containing a known solution xs down the same bisection rule; a pruned cell containing xs falsifies the bound
export function knownSolutionPath(fk, lo, hi, LIP, xs, tol = 1e-6, hMin = 1e-9) {
  let cell = { c: lo.map((l, i) => (l + hi[i]) / 2), h: lo.map((l, i) => (hi[i] - l) / 2) }, depth = 0;
  while (cell.h.reduce((a, h, i) => a + LIP[i] * h, 0) >= hMin) { depth++; if (dnorm(...fk(cell.c)) - cell.h.reduce((a, h, i) => a + LIP[i] * h, 0) > tol) return { depth, pruned: true };
    let j = 0, w = -1; for (let i = 0; i < lo.length; i++) { const wi = LIP[i] * cell.h[i]; if (wi > w) { w = wi; j = i; } } const h2 = cell.h.slice(); h2[j] /= 2; const c2 = cell.c.slice(); c2[j] += (xs[j] >= cell.c[j] ? 1 : -1) * h2[j]; cell = { c: c2, h: h2 }; }
  return { depth, pruned: false };
}

// 8-D chain: an independent re-implementation of StandController.legChain's forward kinematics with the knee axial (x[3]) and ankle
// ab/adduction (x[5]) as coordinates; knee varus (locked) held. With x[3], x[5] at the held values it must equal legChain.fk bit-for-bit.
export function chain8(ctrl, st, ev, n, pP, qP, ft) { const P = ctrl.P, ks = ctrl.legK[n], d = ks.map(k => P.jd[k]), a = ks.map(k => ctrl.anchor[k]), cur = ks.map(k => { const v = decompose(ev.qs[k]); return [v.tw, v.sy, v.sz]; });
  const A0 = Q.mul(qP, d[0].F1), C0 = Q.conj(d[0].F2), C1 = Q.conj(d[1].F2), C2 = Q.conj(d[2].F2), pt = V.add(pP, Q.rot(qP, a[0]));
  const fk = (x) => { const Rt = Q.mul(Q.mul(A0, pyr(x[0], x[1], x[2])), C0), B1 = Q.mul(Rt, d[1].F1), ps = V.add(pt, Q.rot(Rt, a[1])), Rs = Q.mul(Q.mul(B1, pyr(x[3], x[4], cur[1][2])), C1), B2 = Q.mul(Rs, d[2].F1), pf = V.add(ps, Q.rot(Rs, a[2]));
    const Rf = Q.mul(Q.mul(B2, pyr(x[5], x[6], x[7])), C2); let qe = Q.mul(ft.rot, Q.conj(Rf)); if (qe[3] < 0) qe = qe.map(v => -v); return [pf[0] - ft.pos[0], pf[1] - ft.pos[1], pf[2] - ft.pos[2], -2 * qe[0], -2 * qe[1], -2 * qe[2]]; };
  return { fk, cur, embed: (x6) => [x6[0], x6[1], x6[2], cur[1][0], x6[3], cur[2][0], x6[4], x6[5]] };
}
