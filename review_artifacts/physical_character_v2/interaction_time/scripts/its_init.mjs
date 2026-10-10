// ITS-1 interaction-time initializer (ITS1_PREREG.md §2, frozen cb886b14). Builds ONE mechanically consistent V2 state at τ_0 from authoritative
// quantities; nothing here steps physics. E-1 pose = the simulation's own collision-skeleton pose (law_provider, V1.3 ptRxBodyChar, PI-1 mapping);
// E-2 one whole-body vertical shift (stance boot lowest point → +0.5 mm); E-3 generalised velocities = the law's own central-difference velocity
// field projected in the kinetic-energy metric onto: stance-foot twist 0, horizontal momentum M·v_auth, vertical COM velocity 0, L about the COM =
// (0, I_yaw·ψ̇_auth, 0); joint anchors and locked axes consistent by construction. Run with V13_WT set (law_provider / pcg_f0 convention).
import { fileURLToPath } from "url";
const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const LP = await import(ROOT + "promotion_carrier/slice/scripts/law_provider.mjs");
export const { L } = LP; const { V, Q, B, NB, bi, bodyLowest, bodySep, SELF_PAIRS } = L;
export const sim2r = (p) => [p[0], p[2], -p[1]];
export const comW = (S, i) => V.add(S[i].pos, Q.rot(S[i].rot, B[i].comLocal));
export const Mtot = B.reduce((s, b) => s + b.mass, 0);
const E3 = [[1, 0, 0], [0, 1, 0], [0, 0, 1]], LIFT = 0.0005, H = 0.25, HS = H / 60;
export const rotvec = (q) => { const s = q[3] < 0 ? -1 : 1, v = [q[0] * s, q[1] * s, q[2] * s], n = Math.hypot(...v); if (n < 1e-15) return [2 * v[0], 2 * v[1], 2 * v[2]]; const a = 2 * Math.atan2(n, q[3] * s); return V.sc(v, a / n); };
const mat3 = (q) => { const [x, y, z, w] = q; return [[1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)], [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)], [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)]]; };
export const Iworld = (q, I) => { const R = mat3(q), RI = R.map(row => [0, 1, 2].map(j => row[0] * I[0][j] + row[1] * I[1][j] + row[2] * I[2][j])); return RI.map(row => [0, 1, 2].map(j => row[0] * R[j][0] + row[1] * R[j][1] + row[2] * R[j][2])); };
const skew = (r) => [[0, -r[2], r[1]], [r[2], 0, -r[0]], [-r[1], r[0], 0]];
const mm = (A, Bm) => A.map(row => Bm[0].map((_, j) => row.reduce((s, x, k) => s + x * Bm[k][j], 0)));
const madd = (A, Bm, s = 1) => A.map((row, i) => row.map((x, j) => x + s * Bm[i][j]));
const tr = (A) => A[0].map((_, j) => A.map(row => row[j]));
const mv = (A, x) => A.map(row => row.reduce((s, a, k) => s + a * x[k], 0));
// dense solve (Gaussian elimination, partial pivoting); deterministic
function solve(A, b) { const n = b.length, M = A.map((r, i) => [...r, b[i]]);
  for (let c = 0; c < n; c++) { let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r; if (Math.abs(M[p][c]) < 1e-14) throw new Error("singular KKT at column " + c);
    if (p !== c) { const t = M[p]; M[p] = M[c]; M[c] = t; } for (let r = 0; r < n; r++) { if (r === c) continue; const f = M[r][c] / M[c][c]; if (f === 0) continue; for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k]; } }
  return M.map((r, i) => r[n] / r[i]); }
// joint table from the passive model (axes as PostureDriver reads them: child rot · F2)
export function buildInit(R, spec, P, tau0, tauC, ev, diag = {}) {   // diag: STOP-diagnostic switches only (default {} = the preregistered initializer)
  const law = LP.makeLaw(R), o = law.at(tau0), om = law.at(tau0 - H, tau0), op = law.at(tau0 + H, tau0);
  const side = ["L", "R"].filter(sd => o.planted[sd]); if (side.length !== 1) throw new Error("ITS-1 states are single-support; law planted " + JSON.stringify(o.planted));
  const sd = side[0], fi = bi("foot_" + sd), evSupport = ev.support, supportAgrees = !!evSupport[sd] && !evSupport[sd === "L" ? "R" : "L"];
  // E-2: vertical shift
  // diag.footFlat: rotate the stance boot about its ankle (body origin) by the minimal rotation that makes the sole plane (local y = y0) horizontal
  let So = o.S, flat = null; if (diag.footFlat) { const r0 = o.S[fi].rot, up = Q.rot(r0, [0, 1, 0]), ax = V.cross(up, [0, 1, 0]), sa = V.len(ax), ca = up[1], th = Math.atan2(sa, ca);
    const qf = sa < 1e-12 ? [0, 0, 0, 1] : (() => { const k = V.sc(ax, 1 / sa), h = Math.sin(th / 2); return [k[0] * h, k[1] * h, k[2] * h, Math.cos(th / 2)]; })(), r1 = Q.norm(Q.mul(qf, r0));
    flat = { deg: +(th * 180 / Math.PI).toFixed(3), lowestBeforeMm: +(bodyLowest(B[fi], o.S[fi]).y * 1000).toFixed(3) }; So = o.S.map((s, i) => (i === fi ? { pos: s.pos, rot: r1 } : s)); }
  const lift = diag.lift0 ? 0 : LIFT, low0 = bodyLowest(B[fi], So[fi]).y, dy = lift - low0, S = So.map(s => ({ pos: [s.pos[0], s.pos[1] + dy, s.pos[2]], rot: Q.norm(s.rot.slice()) }));
  const off = [Math.round(S[0].pos[0]), 0, Math.round(S[0].pos[2])], Sp = S.map(s => ({ pos: V.sub(s.pos, off), rot: s.rot }));
  const lowest = B.map((b, i) => ({ body: b.name, mm: +(bodyLowest(b, S[i]).y * 1000).toFixed(3) }));
  let minSep = Infinity, sepPair = null; for (const [i, j] of SELF_PAIRS) { const d = bodySep(i, j, S).d; if (d < minSep) { minSep = d; sepPair = B[i].name + "↔" + B[j].name; } }
  // reference velocity field (law central difference, same row)
  const vRef = [], wRef = []; for (let i = 0; i < NB; i++) { vRef[i] = V.sc(V.sub(comW(op.S, i), comW(om.S, i)), 1 / (2 * HS)); wRef[i] = V.sc(rotvec(Q.mul(op.S[i].rot, Q.conj(om.S[i].rot))), 1 / (2 * HS)); }
  // kinematic map u → body twists (u = [v0 3, w0 3, ω_rel per joint 3])
  const nj = spec.joints.length, NU = 6 + 3 * nj, Z = () => [[0, 0, 0], [0, 0, 0], [0, 0, 0]].map(r => r.slice()), zeros = () => [0, 1, 2].map(() => new Array(NU).fill(0));
  const Av = [], Aw = [], c = S.map((s, i) => comW(Sp, i)); Av[0] = zeros(); Aw[0] = zeros(); for (let k = 0; k < 3; k++) { Av[0][k][k] = 1; Aw[0][k][3 + k] = 1; }
  spec.joints.forEach((j, k) => { const p = j.parentIndex, ch = j.childIndex, jp = Sp[ch].pos; Aw[ch] = Aw[p].map(r => r.slice()); for (let a = 0; a < 3; a++) Aw[ch][a][6 + 3 * k + a] += 1;
    const t1 = mm(skew(V.sub(jp, c[p])), Aw[p]), t2 = mm(skew(V.sub(c[ch], jp)), Aw[ch]); Av[ch] = madd(madd(Av[p], t1, -1), t2, -1); });
  // objective (KE metric) H u = g
  const Iw = S.map((s, i) => Iworld(s.rot, B[i].inertia)); let Hm = Array.from({ length: NU }, () => new Array(NU).fill(0)), g = new Array(NU).fill(0);
  for (let i = 0; i < NB; i++) { const m = B[i].mass, AvT = tr(Av[i]), AwT = tr(Aw[i]); Hm = madd(Hm, mm(AvT, Av[i]), m); Hm = madd(Hm, mm(AwT, mm(Iw[i], Aw[i])));
    const gv = mv(AvT, vRef[i]), gw = mv(AwT, mv(Iw[i], wRef[i])); for (let a = 0; a < NU; a++) g[a] += m * gv[a] + gw[a]; }
  // constraints
  const C = [], d = [], labels = [];
  for (let a = 0; a < 3; a++) { C.push(Av[fi][a]); d.push(0); labels.push("c1 v_" + "xyz"[a]); } for (let a = 0; a < 3; a++) { C.push(Aw[fi][a]); d.push(0); labels.push("c1 w_" + "xyz"[a]); }
  const vA = ev.vA, vAuth = [vA[0], 0, -vA[1]], rowMom = (a) => { const r = new Array(NU).fill(0); for (let i = 0; i < NB; i++) for (let k = 0; k < NU; k++) r[k] += B[i].mass * Av[i][a][k]; return r; };
  C.push(rowMom(0)); d.push(Mtot * vAuth[0]); labels.push("c2 Px"); C.push(rowMom(2)); d.push(Mtot * vAuth[2]); labels.push("c2 Pz"); if (!diag.noC3) { C.push(rowMom(1)); d.push(0); labels.push("c3 Py"); }
  const cc = V.sc(c.reduce((s, x, i) => V.add(s, V.sc(x, B[i].mass)), [0, 0, 0]), 1 / Mtot);
  const rC = Math.ceil(tauC - 1e-9) - 1, psiDot = (R.rows[rC][12] - R.rows[rC - 1][12]) * 60; let Iyaw = 0; for (let i = 0; i < NB; i++) { const r = V.sub(c[i], cc); Iyaw += Iw[i][1][1] + B[i].mass * (r[0] * r[0] + r[2] * r[2]); }
  const Lt = [0, Iyaw * psiDot, 0], LrowM = (() => { let M = zeros(); for (let i = 0; i < NB; i++) { M = madd(M, mm(skew(V.sub(c[i], cc)), Av[i]), B[i].mass); M = madd(M, mm(Iw[i], Aw[i])); } return M; })();
  for (let a = 0; a < 3; a++) { C.push(LrowM[a]); d.push(Lt[a]); labels.push("c4 L_" + "xyz"[a]); }
  spec.joints.forEach((j, k) => { for (const key of j.locked) { const a = { x: 0, y: 1, z: 2 }[key], d2 = P.jd[k], ax = Q.rot(Q.mul(S[d2.child].rot, d2.F2), E3[a]), r = new Array(NU).fill(0); for (let q = 0; q < 3; q++) r[6 + 3 * k + q] = ax[q]; C.push(r); d.push(0); labels.push("lock " + j.name + "." + key); } });
  // KKT
  const nc = C.length, K = Array.from({ length: NU + nc }, () => new Array(NU + nc).fill(0)), rhs = new Array(NU + nc).fill(0);
  for (let a = 0; a < NU; a++) { for (let b = 0; b < NU; b++) K[a][b] = Hm[a][b]; rhs[a] = g[a]; } for (let r = 0; r < nc; r++) { for (let a = 0; a < NU; a++) { K[NU + r][a] = C[r][a]; K[a][NU + r] = C[r][a]; } rhs[NU + r] = d[r]; }
  const sol = solve(K, rhs), u = sol.slice(0, NU), resid = C.map((row, r) => row.reduce((s, x, k) => s + x * u[k], 0) - d[r]);
  const v = Av.map(A => mv(A, u)), w = Aw.map(A => mv(A, u));
  // checks: joint-anchor velocity continuity, locked-axis rates, KE, momenta
  let anchorV = 0; spec.joints.forEach(j => { const p = j.parentIndex, ch = j.childIndex, jp = Sp[ch].pos, a = V.add(v[p], V.cross(w[p], V.sub(jp, c[p]))), b = V.add(v[ch], V.cross(w[ch], V.sub(jp, c[ch]))); anchorV = Math.max(anchorV, V.dist(a, b)); });
  const ke = (vv, ww) => vv.reduce((s, x, i) => s + 0.5 * B[i].mass * V.dot(x, x) + 0.5 * V.dot(ww[i], mv(Iw[i], ww[i])), 0);
  const keDist = vRef.reduce((s, x, i) => s + 0.5 * B[i].mass * V.dot(V.sub(v[i], x), V.sub(v[i], x)) + 0.5 * V.dot(V.sub(w[i], wRef[i]), mv(Iw[i], V.sub(w[i], wRef[i]))), 0);
  const mom = (vv, ww) => { const P2 = vv.reduce((s, x, i) => V.add(s, V.sc(x, B[i].mass)), [0, 0, 0]); let Lc = [0, 0, 0]; for (let i = 0; i < NB; i++) Lc = V.add(Lc, V.add(V.cross(V.sub(c[i], cc), V.sc(vv[i], B[i].mass)), mv(Iw[i], ww[i]))); return { P: P2, L: Lc }; };
  const mRef = mom(vRef, wRef), mIni = mom(v, w), dV = v.map((x, i) => ({ body: B[i].name, dvMs: +V.dist(x, vRef[i]).toFixed(4), dwRadS: +V.dist(w[i], wRef[i]).toFixed(4) }));
  return { S: Sp, vel: v.map((x, i) => ({ v: x, w: w[i] })), off, side: sd, footIndex: fi,
    info: { tau0, tauC, side: sd, diag, footFlat: flat, supportAgrees, lawPlanted: o.planted, clamp: o.clamp, E2: { lowestStanceBeforeMm: +(low0 * 1000).toFixed(3), dyMm: +(dy * 1000).toFixed(3), lowestAfter: lowest, minSelfSepMm: +(minSep * 1000).toFixed(2), sepPair },
      E3: { constraints: labels, residualMax: Math.max(...resid.map(Math.abs)), anchorVelMaxMs: anchorV, keInitJ: +ke(v, w).toFixed(4), keRefJ: +ke(vRef, wRef).toFixed(4), keDistJ: +keDist.toFixed(4), vAuth, psiDot, Iyaw: +Iyaw.toFixed(4), Ltarget: Lt,
        ref: { P: mRef.P, L: mRef.L, vComY: mRef.P[1] / Mtot }, init: { P: mIni.P, L: mIni.L }, perBody: dV }, comInit: cc, lawS: o.S, refVel: vRef.map((x, i) => ({ v: x, w: wRef[i] })) } };
}
// law pose at τ (physics frame, same shift/offset) — used to carry the authoritative contact point into the struck body's frame
export function lawPoseAt(R, tau, dy, off) { const o = LP.makeLaw(R).at(tau); return o.S.map(s => ({ pos: V.sub([s.pos[0], s.pos[1] + dy, s.pos[2]], off), rot: Q.norm(s.rot.slice()) })); }
