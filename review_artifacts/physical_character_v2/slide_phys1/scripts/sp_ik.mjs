// SLIDE-PHYS-1 leg IK on the V2 anatomical parameterisation (authoring only — never applied to the simulated body):
// given the pelvis world pose and a desired foot world pose (ankle centre + foot rotation), solve the six anatomical leg angles
// (hip flex / abd / rot, knee flex, ankle df / inv) by damped Gauss–Newton on the exact V2 forward kinematics, warm-started from `guess`.
const L = await import(new URL("./sp_lib.mjs", import.meta.url).href), { V, Q, B, JN } = L;
const VARS = (s) => [["hip_" + s, "flex"], ["hip_" + s, "abd"], ["hip_" + s, "rot"], ["knee_" + s, "flex"], ["ankle_" + s, "df"], ["ankle_" + s, "inv"]];
const jH = (s) => JN.find(j => j.name === "hip_" + s), jK = (s) => JN.find(j => j.name === "knee_" + s), jA = (s) => JN.find(j => j.name === "ankle_" + s);
// leg FK from the pelvis pose: returns { ankle (world AJC), footRot }
export function legFK(pelvis, s, a) { const h = jH(s), k = jK(s), an = jA(s), Rp = pelvis.rot;
  const Rt = L.childRotation(h, Rp, { flex: a[0], abd: a[1], rot: a[2] }), Rs = L.childRotation(k, Rt, { flex: a[3] }), Rf = L.childRotation(an, Rs, { df: a[4], inv: a[5] });
  const hipW = V.add(pelvis.pos, Q.rot(Rp, V.sub(h.at, B[h.parentIndex].origin)));
  const kneeW = V.add(hipW, Q.rot(Rt, V.sub(k.at, h.at))), ankW = V.add(kneeW, Q.rot(Rs, V.sub(an.at, k.at)));
  return { hip: hipW, knee: kneeW, ankle: ankW, footRot: Rf, thighRot: Rt, shankRot: Rs }; }
const rotErr = (Ra, Rb) => { const dq = Q.mul(Rb, Q.conj(Ra)), d = dq[3] < 0 ? dq.map(x => -x) : dq; return [2 * d[0], 2 * d[1], 2 * d[2]]; };
// solve; target = { ankle, footRot, wRot (weight of the orientation rows, rad → m) }; bounds = per variable [lo, hi] deg (default: hard ROM)
export function legIK(pelvis, s, target, guess, opts = {}) { const vars = VARS(s), lo = [], hi = [];
  for (const [jn, key] of vars) { const r = JN.find(j => j.name === jn).def.rom[key]; const b = (opts.bounds && opts.bounds[jn + "." + key]) || r.hard; lo.push(b[0]); hi.push(b[1]); }
  let a = guess.slice(); const wR = opts.wRot ?? 0.15, it = opts.iters ?? 40;
  const res = (a) => { const f = legFK(pelvis, s, a), e = V.sub(target.ankle, f.ankle), r = target.footRot ? rotErr(f.footRot, target.footRot).map(x => x * wR) : [0, 0, 0]; return [...e, ...r]; };
  let r = res(a), cost = r.reduce((s2, x) => s2 + x * x, 0);
  for (let n = 0; n < it && cost > 1e-12; n++) { const Jm = []; for (let i = 0; i < 6; i++) { const b = a.slice(); b[i] += 0.05; const rb = res(b); Jm.push(rb.map((x, k) => (x - r[k]) / 0.05)); }   // columns
    // (JᵀJ + λI) δ = −Jᵀ r  (Jm[i][k] = ∂r_k/∂a_i)
    const lam = opts.lambda ?? 1e-6, A = [...Array(6)].map((_, i) => [...Array(6)].map((_, j) => Jm[i].reduce((s2, x, k) => s2 + x * Jm[j][k], 0) + (i === j ? lam : 0))), g = [...Array(6)].map((_, i) => -Jm[i].reduce((s2, x, k) => s2 + x * r[k], 0));
    const d = solveN(A, g); let step = 1, ok = false;
    for (let ls = 0; ls < 8; ls++) { const b = a.map((x, i) => Math.max(lo[i], Math.min(hi[i], x + step * d[i]))), rb = res(b), cb = rb.reduce((s2, x) => s2 + x * x, 0); if (cb < cost) { a = b; r = rb; cost = cb; ok = true; break; } step /= 2; }
    if (!ok) break; }
  const f = legFK(pelvis, s, a); return { a, cost, ankleErr: V.dist(f.ankle, target.ankle), fk: f, vars }; }
function solveN(A, b) { const n = b.length, M = A.map((r, i) => [...r, b[i]]);
  for (let c = 0; c < n; c++) { let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r; [M[c], M[p]] = [M[p], M[c]]; const piv = M[c][c] || 1e-12;
    for (let r = 0; r < n; r++) if (r !== c) { const f = M[r][c] / piv; for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k]; } }
  return M.map((r, i) => r[n] / (r[i] || 1e-12)); }
export const toAnat = (s, a) => ({ ["hip_" + s]: { flex: a[0], abd: a[1], rot: a[2] }, ["knee_" + s]: { flex: a[3] }, ["ankle_" + s]: { df: a[4], inv: a[5] } });
