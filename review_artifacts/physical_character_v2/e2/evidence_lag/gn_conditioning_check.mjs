// diagnostic: conditioning of the IK Gauss–Newton matrix H = JᵀJ at a hover pose and the attenuation the lcVff rate solve's damping μ0 imposes on a vertical / forward foot velocity
import { loadJolt } from "/Users/zainrahman/Downloads/FC Simulator worktrees/physical-character-v2/sandbox/visual/physchar2/core/v2_jolt.js";
import { e2Spec } from "/Users/zainrahman/Downloads/FC Simulator worktrees/physical-character-v2/sandbox/visual/physchar2/gates/v2_e2.js";
import { e2Sim } from "/Users/zainrahman/Downloads/FC Simulator worktrees/physical-character-v2/sandbox/visual/physchar2/gates/v2_e2.js";
import { IK } from "/Users/zainrahman/Downloads/FC Simulator worktrees/physical-character-v2/sandbox/visual/physchar2/ctrl/v2_stand.js";
import { V, Q, unitStates, unitEv } from "/Users/zainrahman/Downloads/FC Simulator worktrees/physical-character-v2/sandbox/visual/physchar2/core/v2_math.js";
const J = await loadJolt("/Users/zainrahman/Downloads/FC Simulator worktrees/physical-character-v2/sandbox/visual/physchar2/vendor/jolt-physics.wasm-compat.js");
const solve = (M, y) => { const n = y.length, a = M.map((r, i) => [...r, y[i]]); for (let c = 0; c < n; c++) { let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(a[r][c]) > Math.abs(a[p][c])) p = r; [a[c], a[p]] = [a[p], a[c]]; for (let r = 0; r < n; r++) if (r !== c) { const f = a[r][c] / a[c][c]; for (let k = c; k <= n; k++) a[r][k] -= f * a[c][k]; } } return a.map((r, i) => r[n] / r[i]); };
for (const human of ["V2-REF", "V2-165-62", "V2-198-92"]) { const { s } = e2Sim(J, e2Spec(human), { protocol: "p15", human, side: "L", pert: "none", config: "PSTAR4" }); for (let i = 0; i < 240 * 9; i++) s.tick();   // ≈ mid-hover of the E1b lift (20 mm)
  const c = s.ctrl, st = unitStates(s.st), ev = unitEv(s.up.ev), ps = st[c.pelvis], foot = st[c.feet[0]], ch = c.legChain(st, ev, 0, ps.pos, ps.rot, { pos: foot.pos, rot: foot.rot }), x = ch.x0, Jm = ch.jac(x);   // Jm[c][i] = ∂r_i/∂x_c
  const H = [0, 1, 2, 3, 4, 5].map(a => [0, 1, 2, 3, 4, 5].map(b => Jm[a].reduce((sum, v, i) => sum + v * Jm[b][i], 0)));
  // power iteration / Jacobi eigenvalues (symmetric 6×6)
  const A = H.map(r => r.slice()); for (let sweep = 0; sweep < 60; sweep++) for (let p = 0; p < 6; p++) for (let q = p + 1; q < 6; q++) { if (Math.abs(A[p][q]) < 1e-18) continue; const th = 0.5 * Math.atan2(2 * A[p][q], A[q][q] - A[p][p]), cs = Math.cos(th), sn = Math.sin(th);
    for (let k = 0; k < 6; k++) { const akp = A[k][p], akq = A[k][q]; A[k][p] = cs * akp - sn * akq; A[k][q] = sn * akp + cs * akq; } for (let k = 0; k < 6; k++) { const apk = A[p][k], aqk = A[q][k]; A[p][k] = cs * apk - sn * aqk; A[q][k] = sn * apk + cs * aqk; } }
  const eig = [0, 1, 2, 3, 4, 5].map(i => A[i][i]).sort((a, b) => a - b);
  // the rate the lcVff solve returns for a unit foot velocity (vertical, forward), damped (μ0, Marquardt) vs exact
  for (const [lab, v] of [["vertical", [0, 1, 0, 0, 0, 0]], ["forward", [0, 0, 1, 0, 0, 0]]]) { const g = Jm.map(col => col.reduce((sum, q, i) => sum + q * v[i], 0)), exact = solve(H, g), damp = solve(H.map((r, i) => r.map((q, j) => (i === j ? q + IK.mu0 * (1 + q) : q))), g);
    console.log(`${human} ${lab}: knee rate damped/exact ${(damp[3] / exact[3]).toFixed(3)}, hip flex ${(damp[1] / exact[1]).toFixed(3)} | knee flex ${(x[3] * 180 / Math.PI).toFixed(1)}°`); }
  console.log(`   H eigenvalues: ${eig.map(e => e.toExponential(2)).join(" ")} | μ0 = ${IK.mu0}, μmin = ${IK.muMin}`); s.destroy(); }
