// HAC-1 entry state: RUN-1's own pose and body velocities (finite differences of the animation, as HYBRID-RUN-1), made ANGULAR-MOMENTUM
// CONSISTENT. RUN-1's root rotation is authored, so its finite-difference body velocities carry a whole-body angular momentum about the COM that
// changes even in flight (measured: yaw −3.37 kg·m²/s at the NC entry frame, against a stride average of +0.13). A physical body given that
// state conserves it and spins (≈ 100°/s of pelvis yaw in the first 0.3 s). Here the relative limb velocities and the COM velocity are kept and
// one rigid-body rotation ω_c = I_c⁻¹ (H_entry − H̄) is removed from every body, so the athlete starts with RUN-1's STRIDE-AVERAGE angular
// momentum H̄ (the momentum its limbs carry on average with a non-rotating pelvis). One initial condition, no force.
const RA = new URL("../../", import.meta.url).href, L = await import(RA + "slide_phys1/scripts/sp_lib.mjs"), { V, Q, B, M } = L;
const h = 1 / 240;
export function angMom(pose, vel) { const com = L.comOf(pose); let H = [0, 0, 0];
  pose.forEach((b, i) => { const r = V.sub(L.comBody(pose, i), com); H = V.add(H, V.cross(r, V.sc(vel[i].v, B[i].mass))); const I3 = B[i].inertia, wl = Q.rot(Q.conj(b.rot), vel[i].w), Iw = [0, 1, 2].map(a => I3[a][0] * wl[0] + I3[a][1] * wl[1] + I3[a][2] * wl[2]); H = V.add(H, Q.rot(b.rot, Iw)); });
  return { H, com }; }
export function inertiaAboutCom(pose) { const com = L.comOf(pose), T = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  pose.forEach((b, i) => { const r = V.sub(L.comBody(pose, i), com), m = B[i].mass, I3 = B[i].inertia, R = b.rot;
    const cols = [0, 1, 2].map(c => { const e = [0, 0, 0]; e[c] = 1; const l = Q.rot(Q.conj(R), e), Il = [0, 1, 2].map(a => I3[a][0] * l[0] + I3[a][1] * l[1] + I3[a][2] * l[2]); return Q.rot(R, Il); });   // columns of R·I·Rᵀ
    for (let a = 0; a < 3; a++) for (let c = 0; c < 3; c++) T[a][c] += cols[c][a] + m * ((a === c ? V.dot(r, r) : 0) - r[a] * r[c]); });
  return T; }
const solve3 = (A, b) => { const d = (m) => m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]), D = d(A);
  return [0, 1, 2].map(c => d(A.map((row, r) => row.map((x, k) => (k === c ? b[r] : x)))) / D); };
// RUN-1's kinematic angular momentum averaged over `strideS` seconds from step 0
export function strideMeanH(I, strideS = 0.7) { let S = [0, 0, 0]; const n = Math.round(strideS / h);
  for (let k = 0; k < n; k++) { const p0 = I.pose(k - 1), p1 = I.pose(k), p2 = I.pose(k + 1), vel = L.comVels(p1, L.bodyVels(p0, p2, 2 * h)); S = V.add(S, angMom(p1, vel).H); }
  return V.sc(S, 1 / n); }
export function consistentEntry(I, opts = {}) { const e = I.entry(), Hbar = opts.Hbar || strideMeanH(I, opts.strideS), { H, com } = angMom(e.pose, e.vel), Ic = inertiaAboutCom(e.pose), wc = solve3(Ic, V.sub(H, Hbar));
  const vel = e.vel.map((x, i) => ({ v: V.sub(x.v, V.cross(wc, V.sub(L.comBody(e.pose, i), com))), w: V.sub(x.w, wc) }));
  return { pose: e.pose, vel, H0: H, Hbar, wc, H1: angMom(e.pose, vel).H }; }
