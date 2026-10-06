// ═══ physchar2/tools/swing_ff_check.mjs — independent check of the swingAccFF inverse dynamics (e2/SWING_ACCEL_FF_DESIGN.md §3): at a real mid-swing state, the Newton–Euler
// wrench of StandController.swingAccWrench projected on the 6 coordinates (virtual work: τ_j = Σ_k ΔT_k · ∂θ_k/∂x_j via the chain's own kinematics) is compared with the
// LAGRANGIAN generalized inertial force M(x)ẍ + Ṁẋ − ½∂(ẋᵀMẋ)/∂x, M = Σ_b m_b J_cᵀJ_c + J_ωᵀ I_b J_ω, computed independently from the same rigid-body data by finite differences.
// usage: V2_KNEE_MODEL=v2k V2_ANKLE_NEUTRAL_K=0.13 node tools/swing_ff_check.mjs
import path from "path"; import { fileURLToPath } from "url"; import { loadJolt } from "../core/v2_jolt.js"; import { e2Sim, e2Spec } from "../gates/v2_e2.js"; import { V, Q, unitStates, unitEv } from "../core/v2_math.js";
const here = path.dirname(fileURLToPath(import.meta.url)), J = await loadJolt(path.join(here, "../vendor/jolt-physics.wasm-compat.js"));
let worst = 0;
for (const human of ["V2-REF", "V2-165-62", "V2-198-92"]) for (const n of [0, 1]) {
  const spec = e2Spec(human), { s } = e2Sim(J, spec, { protocol: "p15", human, side: n === 0 ? "L" : "R", pert: "none", config: "PSTAR4" }); for (let i = 0; i < 240 * 9; i++) s.tick();
  const c = s.ctrl, st = unitStates(s.st), ev = unitEv(s.up.ev), ps = st[c.pelvis], fr = { pos: ps.pos.slice(), rot: ps.rot.slice() }, ch = c.legChain(st, ev, n, fr.pos, fr.rot, null), x = ch.x0.slice();
  const B = spec.bodies, bodies = c.legK[n].map(k => spec.joints[k].childIndex), cOff = bodies.map(b => Q.rot(Q.conj(st[b].rot), V.sub(st[b].com, st[b].pos)));
  const kin = (y) => { const P = ch.pose(y); return { R: P.R, p: P.p, c: P.R.map((R, i) => V.add(P.p[i], Q.rot(R, cOff[i]))) }; };
  // a test reference: foot velocity / acceleration / angular terms of swing magnitude
  const ref = { vel: [0.05, 0.12, 0.18], acc: [0.4, 1.5, -1.2], w: [0.3, -0.2, 0.1], al: [1.0, 0.5, -0.8], vPel: [0, 0, 0] }, A = [0, 0, 0];
  const W = c.swingAccWrench(st, ev, n, fr, x, ref, A), xd = W.xd, xdd = W.xdd;
  // virtual-work projection of the Newton–Euler wrench: τ_j = Σ_k ΔT_k · ω_rel,k(e_j), with ω_rel,k = the angular velocity of body k relative to its parent per unit x_j
  const h = 1e-6, angVel = (Ra, Rb, hh) => { let q = Q.mul(Ra, Q.conj(Rb)); if (q[3] < 0) q = q.map(v => -v); return [2 * q[0] / hh, 2 * q[1] / hh, 2 * q[2] / hh]; };
  const tauNE = [0, 1, 2, 3, 4, 5].map(j => { const e = [0, 0, 0, 0, 0, 0]; e[j] = 1; const kp = kin(x.map((v, i) => v + h * e[i])), km = kin(x.map((v, i) => v - h * e[i]));
    const wb = [0, 1, 2].map(b => angVel(kp.R[b], km.R[b], 2 * h)), wrel = [wb[0], V.sub(wb[1], wb[0]), V.sub(wb[2], wb[1])];
    return c.legK[n].reduce((s2, k, idx) => s2 + V.dot(W.T[k], wrel[idx]), 0); });
  // Lagrangian: M(y) and the generalized inertial force
  const Jac = (y) => [0, 1, 2, 3, 4, 5].map(j => { const e = [0, 0, 0, 0, 0, 0]; e[j] = 1; const kp = kin(y.map((v, i) => v + h * e[i])), km = kin(y.map((v, i) => v - h * e[i])); return { c: [0, 1, 2].map(b => V.sc(V.sub(kp.c[b], km.c[b]), 1 / (2 * h))), w: [0, 1, 2].map(b => angVel(kp.R[b], km.R[b], 2 * h)) }; });
  const Mof = (y) => { const Jc = Jac(y), K = kin(y), M = [0, 1, 2, 3, 4, 5].map(() => [0, 0, 0, 0, 0, 0]);
    for (let b = 0; b < 3; b++) { const m = B[bodies[b]].mass, R = K.R[b], I = B[bodies[b]].inertia, Iw = (v) => { const l = Q.rot(Q.conj(R), v); return Q.rot(R, [0, 1, 2].map(i => I[i][0] * l[0] + I[i][1] * l[1] + I[i][2] * l[2])); };
      for (let i = 0; i < 6; i++) for (let j = 0; j < 6; j++) M[i][j] += m * V.dot(Jc[i].c[b], Jc[j].c[b]) + V.dot(Jc[i].w[b], Iw(Jc[j].w[b])); } return M; };
  const mv = (M, v) => M.map(r => r.reduce((s2, q, j) => s2 + q * v[j], 0)), M0 = Mof(x), hT = 1e-4;
  const Mp = Mof(x.map((v, i) => v + hT * xd[i])), Mm = Mof(x.map((v, i) => v - hT * xd[i])), Mdot = M0.map((r, i) => r.map((q, j) => (Mp[i][j] - Mm[i][j]) / (2 * hT)));
  const dTdx = [0, 1, 2, 3, 4, 5].map(j => { const e = [0, 0, 0, 0, 0, 0]; e[j] = 1e-5; const a = Mof(x.map((v, i) => v + e[i])), b2 = Mof(x.map((v, i) => v - e[i])), q = (M) => xd.reduce((s2, v, i) => s2 + v * mv(M, xd)[i], 0); return 0.5 * (q(a) - q(b2)) / 2e-5; });
  const tauL = mv(M0, xdd).map((v, i) => v + mv(Mdot, xd)[i] - dTdx[i]);
  const err = Math.max(...tauNE.map((v, i) => Math.abs(v - tauL[i]))), scale = Math.max(...tauL.map(Math.abs)); worst = Math.max(worst, err / scale);
  console.log(`${human} ${n === 0 ? "L" : "R"}: Newton–Euler τ ${tauNE.map(v => v.toFixed(3)).join(" ")}\n           Lagrange    τ ${tauL.map(v => v.toFixed(3)).join(" ")}  max |Δ| ${err.toExponential(2)} (${(100 * err / scale).toFixed(3)} %)`); s.destroy(); }
console.log(worst < 1e-3 ? `PASS: Newton–Euler = Lagrangian within ${(100 * worst).toFixed(4)} %` : `FAIL: worst relative difference ${(100 * worst).toFixed(3)} %`);
