// ═══ physchar2/map/v2_lv2_map.js — MAPPING CONTRACT MC-1: one LV2-STATE-1 state → one V2 state (poses + twists) ═════════════════════════════
// Preregistration: review_artifacts/physical_character_v2/record_hinged/RH1_PREREG.md §2 (frozen 50eae23a); user decision D2 (084f736d).
// Pure and deterministic; no Jolt, no clock, no RNG. Works for any V2 spec (RH1 is the body it is preregistered for).
// Input: `rig` = { bones: [{ name, parent }], bind: [4×4 column-major bind world matrices] } (identity bind rotations); `q` = { m, 0, p }: the LV2-STATE-1
// query results at τ0 − δ, τ0, τ0 + δ (δ = opts.delta, 1e-4 s: queries of LV2's continuous pose function, never rendered frames), each with
// joints[i].world.{ position, rotation (3×3 row-major), linearVelocity, angularVelocity } in rig order and legs.{ L, R }.stance.
//   (1) LOWER BODY (pelvis, thighs, shanks, feet): the frozen PI-1 mapping — rig rotations through V2's bind, R-K leg retarget, hard-range projection,
//       RF-1 boot reconciliation on stance feet, pelvis at the rig hip midpoint — ported from pi1/scripts/compat_lib.mjs (rawRotations rk, project)
//       and pi1/rev1/scripts/pcg_rev1.mjs (reconcileFoot, makeMapper knee "RK"); its twists = the central δ-derivative of that mapping.
//   (2) UPPER BODY POSE: argmin Σ_U m_i ‖c_i − c*_i‖² + ‖L_iᵀ R_iᵀ φ(R_i R*_iᵀ)‖² over the unlocked anatomical angles of lumbar, thoracic, neck,
//       shoulders, elbows, inside the hard ranges (projected Levenberg–Marquardt from the clamped copy mapping).
//   (3) VELOCITIES (V-d): argmin ½ Σ m_i ‖v_i − v*_i‖² + ½ (ω_i − ω*_i)ᵀ I_i^w (ω_i − ω*_i) over u = [v_pelvisCOM, ω_pelvis, ω_rel per joint], with the
//       pelvis twist and the hip / knee / ankle rates fixed to (1) and the locked axes zero; one KKT solve. P and L are not forced.
//   Reference material c*, R*, v*, ω*: each body's bind COM / orientation attached to its carrier rig bone; v*, ω* from LV2's analytic bone values.
// V2's own masses, COMs and inertias are authoritative for every V2 COM / P / L.
import { V, Q } from "../core/v2_math.js";
import { anatomicalAngles, childRotation } from "../spec/v2_joints.js";
import { posedBodies } from "../spec/v2_pose.js";
import { bodyLowest } from "../sim/v2_geom.js";

export const MC1 = Object.freeze({ id: "MC-1", prereg: "record_hinged/RH1_PREREG.md §2 (50eae23a)", delta: 1e-4, fitMaxIt: 60, fitJacStepDeg: 1e-6, fitStopRel: 1e-16 });
export const CARRIER = Object.freeze({ pelvis: "pelvis", abdomen: "spine", thorax: "chest", head: "head", upperArm_L: "upperArm_L", forearm_L: "foreArm_L", upperArm_R: "upperArm_R", forearm_R: "foreArm_R",
  thigh_L: "thigh_L", shank_L: "shin_L", foot_L: "foot_L", thigh_R: "thigh_R", shank_R: "shin_R", foot_R: "foot_R" });
const MAP = { pelvis: "pelvis", spine: "abdomen", chest: "thorax", head: "head", upperArm_L: "upperArm_L", upperArm_R: "upperArm_R", foreArm_L: "forearm_L", foreArm_R: "forearm_R",
  thigh_L: "thigh_L", thigh_R: "thigh_R", shin_L: "shank_L", shin_R: "shank_R", foot_L: "foot_L", foot_R: "foot_R" };
const UPPER_NAMES = ["abdomen", "thorax", "head", "upperArm_L", "forearm_L", "upperArm_R", "forearm_R"];
const D = 180 / Math.PI, R_ = Math.PI / 180, E3 = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
// ── small math (as compat_lib / pcg_f0 / pcg_rev1) ──
export const m2q = (m) => { const r = (i, j) => m[j * 4 + i]; const t = r(0, 0) + r(1, 1) + r(2, 2); let q;
  if (t > 0) { const s = Math.sqrt(t + 1) * 2; q = [(r(2, 1) - r(1, 2)) / s, (r(0, 2) - r(2, 0)) / s, (r(1, 0) - r(0, 1)) / s, 0.25 * s]; }
  else if (r(0, 0) > r(1, 1) && r(0, 0) > r(2, 2)) { const s = Math.sqrt(1 + r(0, 0) - r(1, 1) - r(2, 2)) * 2; q = [0.25 * s, (r(0, 1) + r(1, 0)) / s, (r(0, 2) + r(2, 0)) / s, (r(2, 1) - r(1, 2)) / s]; }
  else if (r(1, 1) > r(2, 2)) { const s = Math.sqrt(1 + r(1, 1) - r(0, 0) - r(2, 2)) * 2; q = [(r(0, 1) + r(1, 0)) / s, 0.25 * s, (r(1, 2) + r(2, 1)) / s, (r(0, 2) - r(2, 0)) / s]; }
  else { const s = Math.sqrt(1 + r(2, 2) - r(0, 0) - r(1, 1)) * 2; q = [(r(0, 2) + r(2, 0)) / s, (r(1, 2) + r(2, 1)) / s, 0.25 * s, (r(1, 0) - r(0, 1)) / s]; }
  return Q.norm(q); };
export const m2p = (m) => [m[12], m[13], m[14]];
const qang = (a, b) => { const d = Math.abs(a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3]); return 2 * Math.acos(Math.min(1, d)) * 180 / Math.PI; };
const fromCols = (x, y, z) => { const m = new Array(16).fill(0); m[0] = x[0]; m[1] = x[1]; m[2] = x[2]; m[4] = y[0]; m[5] = y[1]; m[6] = y[2]; m[8] = z[0]; m[9] = z[1]; m[10] = z[2]; m[15] = 1; return m2q(m); };
const rotAxis = (axis, ang) => { const s = Math.sin(ang / 2); return [axis[0] * s, axis[1] * s, axis[2] * s, Math.cos(ang / 2)]; };
const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
export const rotvec = (q) => { const s = q[3] < 0 ? -1 : 1, v = [q[0] * s, q[1] * s, q[2] * s], n = Math.hypot(...v); if (n < 1e-15) return [2 * v[0], 2 * v[1], 2 * v[2]]; return V.sc(v, 2 * Math.atan2(n, q[3] * s) / n); };
export const angv = (q0, q1, h) => V.sc(rotvec(Q.norm(Q.mul(q1, Q.conj(q0)))), 1 / h);
const mat3 = (q) => { const [x, y, z, w] = q; return [[1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)], [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)], [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)]]; };
export const Iworld = (q, I) => { const R = mat3(q), RI = R.map(row => [0, 1, 2].map(j => row[0] * I[0][j] + row[1] * I[1][j] + row[2] * I[2][j])); return RI.map(row => [0, 1, 2].map(j => row[0] * R[j][0] + row[1] * R[j][1] + row[2] * R[j][2])); };
const mv = (A, x) => A.map(row => row.reduce((s, a, k) => s + a * x[k], 0));
const chol3 = (A) => { const l00 = Math.sqrt(A[0][0]), l10 = A[1][0] / l00, l20 = A[2][0] / l00, l11 = Math.sqrt(A[1][1] - l10 * l10), l21 = (A[2][1] - l20 * l10) / l11, l22 = Math.sqrt(A[2][2] - l20 * l20 - l21 * l21); return [[l00, 0, 0], [l10, l11, 0], [l20, l21, l22]]; };
export function solveDense(A, b) { const n = b.length, Mx = A.map((r, i) => [...r, b[i]]);
  for (let c = 0; c < n; c++) { let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(Mx[r][c]) > Math.abs(Mx[p][c])) p = r; if (Math.abs(Mx[p][c]) < 1e-18) throw new Error("MC-1: singular system at column " + c);
    if (p !== c) { const t = Mx[p]; Mx[p] = Mx[c]; Mx[c] = t; } for (let r = 0; r < n; r++) { if (r === c) continue; const f = Mx[r][c] / Mx[c][c]; if (f === 0) continue; for (let k = c; k <= n; k++) Mx[r][k] -= f * Mx[c][k]; } }
  return Mx.map((r, i) => r[n] / r[i]); }
const swingTwist = (qa, qb, axis) => { const d = Q.norm(Q.mul(Q.conj(qa), qb)), s = d[3] < 0 ? -1 : 1, v = [d[0] * s, d[1] * s, d[2] * s], w = d[3] * s, p = V.dot(v, axis);
  const tw = Q.norm([axis[0] * p, axis[1] * p, axis[2] * p, w]), sw = Q.mul(d, Q.conj(tw)); return { twist: 2 * Math.atan2(p, w) * D, swing: 2 * Math.acos(Math.min(1, Math.abs(Q.norm(sw)[3]))) * D }; };
// a world 4×4 (column-major, the AIR / anim3d layout) from an LV2 joint
export const jointMatrix = (j) => { const R = j.world.rotation, P = j.world.position; return [R[0], R[3], R[6], 0, R[1], R[4], R[7], 0, R[2], R[5], R[8], 0, P[0], P[1], P[2], 1]; };

// ── the model of one spec (cached) ──
const MODELS = new WeakMap();
export function model(spec) {
  if (MODELS.has(spec)) return MODELS.get(spec);
  const B = spec.bodies, NB = B.length, bi = (n) => B.findIndex(b => b.name === n), Z0 = posedBodies(spec, {});
  const hipL = spec.joints.find(j => j.name === "hip_L").at, hipR = spec.joints.find(j => j.name === "hip_R").at, hipMid0 = V.sc(V.add(hipL, hipR), 0.5);
  const UPPER = UPPER_NAMES.map(bi), LOWER = [0, ...["thigh_L", "shank_L", "foot_L", "thigh_R", "shank_R", "foot_R"].map(bi)];
  const UPJ = spec.joints.map((j, k) => k).filter(k => UPPER.includes(spec.joints[k].childIndex)), LOJ = spec.joints.map((j, k) => k).filter(k => !UPJ.includes(k));
  const upJoints = UPJ.map(k => spec.joints[k]), PKEYS = upJoints.map(j => Object.keys(anatomicalAngles(j, [0, 0, 0, 1], [0, 0, 0, 1]))), NP = PKEYS.reduce((s, k) => s + k.length, 0);
  const CHOL = B.map(b => chol3(b.inertia));
  const m = { spec, B, NB, bi, Z0, hipMid0, UPPER, LOWER, UPJ, LOJ, upJoints, PKEYS, NP, CHOL, Mt: B.reduce((s, b) => s + b.mass, 0) };
  MODELS.set(spec, m); return m;
}
export const comW = (md, S, i) => V.add(S[i].pos, Q.rot(S[i].rot, md.B[i].comLocal));

// ── (1) the frozen lower-body mapping (compat_lib rawRotations rk + project, pcg_rev1 reconcileFoot, makeMapper knee "RK" rf1) ──
function rawRotations(md, bones, bind, world, rk) {
  const idx = Object.fromEntries(bones.map((b, i) => [b.name, i])), raw = new Array(md.NB), bi = md.bi, Z0 = md.Z0;
  for (const [rb, vb] of Object.entries(MAP)) { const k = idx[rb]; raw[bi(vb)] = Q.norm(Q.mul(Q.mul(m2q(world[k]), Q.conj(m2q(bind[k]))), Z0[bi(vb)].rot)); }
  const info = {};
  if (rk) for (const sd of ["L", "R"]) { const H = m2p(world[idx["thigh_" + sd]]), K = m2p(world[idx["shin_" + sd]]), A = m2p(world[idx["foot_" + sd]]);
    const u = V.norm(V.sub(K, H)), w = V.norm(V.sub(A, K)), cr = V.cross(u, w), bend = Math.asin(Math.min(1, V.len(cr))) * 180 / Math.PI;
    const xr = Q.rot(raw[bi("thigh_" + sd)], [1, 0, 0]), xrP = V.norm(V.sub(xr, V.sc(u, V.dot(xr, u))));
    let n = V.len(cr) > 1e-9 ? V.norm(cr) : xrP; if (V.dot(n, xrP) < 0) n = V.sc(n, -1);
    const k = smooth(5, 10, bend); n = V.norm(V.add(V.sc(n, k), V.sc(xrP, 1 - k)));
    const nt = V.norm(V.sub(n, V.sc(u, V.dot(n, u)))), ns = V.norm(V.sub(n, V.sc(w, V.dot(n, w))));
    const qt = fromCols(nt, V.sc(u, -1), V.cross(nt, V.sc(u, -1))), qs = fromCols(ns, V.sc(w, -1), V.cross(ns, V.sc(w, -1)));
    info[sd] = { bendDeg: bend, thighTwistDeg: swingTwist(raw[bi("thigh_" + sd)], qt, [0, -1, 0]).twist, shankTwistDeg: swingTwist(raw[bi("shank_" + sd)], qs, [0, -1, 0]).twist,
      thighSwingDeg: swingTwist(raw[bi("thigh_" + sd)], qt, [0, -1, 0]).swing, shankSwingDeg: swingTwist(raw[bi("shank_" + sd)], qs, [0, -1, 0]).swing };
    raw[bi("thigh_" + sd)] = qt; raw[bi("shank_" + sd)] = qs; }
  return { raw, idx, info };
}
function project(md, raw, world, idx) {
  const spec = md.spec, B = md.B, S = new Array(md.NB), res = {}, clamp = {}; S[0] = { rot: raw[0], pos: null };
  const hm = V.sc(V.add(m2p(world[idx.thigh_L]), m2p(world[idx.thigh_R])), 0.5); S[0].pos = V.sub(hm, Q.rot(raw[0], V.sub(md.hipMid0, B[0].origin)));
  for (const j of spec.joints) { const qp = S[j.parentIndex].rot, a = anatomicalAngles(j, qp, raw[j.childIndex]); let c = 0;
    for (const k of Object.keys(a)) { const h = j.def.rom[k] && j.def.rom[k].hard; if (h) { const v = Math.min(h[1], Math.max(h[0], a[k])); c = Math.max(c, Math.abs(v - a[k])); a[k] = v; } }
    const qc = childRotation(j, qp, a); res[j.name] = qang(qc, raw[j.childIndex]); clamp[j.name] = c;
    S[j.childIndex] = { rot: qc, pos: V.add(S[j.parentIndex].pos, Q.rot(qp, V.sub(B[j.childIndex].origin, B[j.parentIndex].origin))) }; }
  return { S, res, clamp }; }
const relRot = (md, S, i) => Q.norm(Q.mul(S[i].rot, Q.conj(md.Z0[i].rot)));
function reconcileFoot(md, rr, world, P, sd, contact) { const i = md.bi("foot_" + sd), lo0 = bodyLowest(md.B[i], P.S[i]).y; if (!contact && lo0 >= 0) return { P, pitchDeg: 0, lowest0: lo0, lowest: lo0, residual: 0 };
  const axis = Q.rot(relRot(md, P.S, i), [1, 0, 0]), raw0 = rr.raw[i], at = (th) => { const raw = rr.raw.slice(); raw[i] = Q.norm(Q.mul(rotAxis(axis, th), raw0)); const Pj = project(md, raw, world, rr.idx); return { Pj, lo: bodyLowest(md.B[i], Pj.S[i]).y, clamp: Pj.clamp["ankle_" + sd] }; };
  const f = (th) => at(th).lo; let best = null;
  for (let s = 0.5; s <= 60 && !best; s += 0.5) for (const sg of [1, -1]) { const t0 = sg * (s - 0.5) * R_, t1 = sg * s * R_, a0 = f(t0), a1 = f(t1); if ((a0 - 0) * (a1 - 0) <= 0) { let lo = t0, hi = t1, flo = a0; for (let it = 0; it < 50; it++) { const m = 0.5 * (lo + hi), fm = f(m); if ((flo) * (fm) <= 0) hi = m; else { lo = m; flo = fm; } } best = 0.5 * (lo + hi); break; } }
  if (best == null) return { P, pitchDeg: NaN, lowest0: lo0, lowest: lo0, residual: lo0 };
  const r = at(best); return { P: { ...P, S: r.Pj.S, clamp: { ...P.clamp, ["ankle_" + sd]: Math.max(P.clamp["ankle_" + sd] || 0, r.clamp || 0) } }, pitchDeg: best * D, lowest0: lo0, lowest: r.lo, residual: r.lo, ankleClampDeg: r.clamp || 0 }; }
// the frozen mapping of one LV2 state (all 14 bodies; MC-1 keeps its pelvis + legs). feet[0] = L, feet[1] = R as in the PI-1 mapper.
export function frozenMapping(spec, rig, q) {
  const md = model(spec), world = q.joints.map(jointMatrix), feet = [{ contact: !!q.legs.L.stance }, { contact: !!q.legs.R.stance }];
  const rr = rawRotations(md, rig.bones, rig.bind, world, true); let P = { ...project(md, rr.raw, world, rr.idx), idx: rr.idx, raw: rr.raw, info: rr.info }, foot = {};
  for (const [n, sd] of [[0, "L"], [1, "R"]]) { const rc = reconcileFoot(md, rr, world, P, sd, feet[n].contact); P = rc.P; foot[sd] = { contact: feet[n].contact, pitchDeg: rc.pitchDeg, lowest0Mm: rc.lowest0 * 1000, lowestMm: rc.lowest * 1000 }; }
  return { ...P, foot, world };
}

// ── reference material (carrier bones, V2 bind COMs) ──
function bindOffsets(md, rig) { const idx = Object.fromEntries(rig.bones.map((b, i) => [b.name, i])); return md.B.map((b, i) => V.sub(comW(md, md.Z0, i), m2p(rig.bind[idx[CARRIER[b.name]]]))); }
export function reference(md, rig, q) { const L = bindOffsets(md, rig), byName = Object.fromEntries(q.joints.map(j => [j.name, j])), c = [], R = [], v = [], w = [];
  md.B.forEach((b, i) => { const j = byName[CARRIER[b.name]], qb = m2q(jointMatrix({ world: { rotation: j.world.rotation, position: [0, 0, 0] } })), d = Q.rot(qb, L[i]);
    c.push(V.add(j.world.position, d)); R.push(Q.norm(Q.mul(qb, md.Z0[i].rot))); v.push(V.add(j.world.linearVelocity, V.cross(j.world.angularVelocity, d))); w.push(j.world.angularVelocity.slice()); });
  return { c, R, v, w }; }
export function momenta(md, S, tw) { const c = S.map((_, i) => comW(md, S, i)), cc = V.sc(c.reduce((s, x, i) => V.add(s, V.sc(x, md.B[i].mass)), [0, 0, 0]), 1 / md.Mt); let P = [0, 0, 0], L = [0, 0, 0];
  for (let i = 0; i < md.NB; i++) { P = V.add(P, V.sc(tw.v[i], md.B[i].mass)); L = V.add(L, V.add(V.cross(V.sub(c[i], cc), V.sc(tw.v[i], md.B[i].mass)), mv(Iworld(S[i].rot, md.B[i].inertia), tw.w[i]))); } return { P, L, com: cc }; }
export function momentaRef(md, ref) { const cc = V.sc(ref.c.reduce((s, x, i) => V.add(s, V.sc(x, md.B[i].mass)), [0, 0, 0]), 1 / md.Mt); let P = [0, 0, 0], L = [0, 0, 0];
  for (let i = 0; i < md.NB; i++) { P = V.add(P, V.sc(ref.v[i], md.B[i].mass)); L = V.add(L, V.add(V.cross(V.sub(ref.c[i], cc), V.sc(ref.v[i], md.B[i].mass)), mv(Iworld(ref.R[i], md.B[i].inertia), ref.w[i]))); } return { P, L, com: cc }; }

// ── (2) upper-body pose fit ──
function chain(md, rots, pelvis) { const S = new Array(md.NB); S[0] = { pos: pelvis.pos.slice(), rot: rots[0] };
  for (const j of md.spec.joints) { const p = j.parentIndex, c = j.childIndex; S[c] = { pos: V.add(S[p].pos, Q.rot(S[p].rot, V.sub(md.B[c].origin, md.B[p].origin))), rot: rots[c] }; } return S; }
function anglesFrom(md, S) { const th = []; md.upJoints.forEach((j, n) => { const a = anatomicalAngles(j, S[j.parentIndex].rot, S[j.childIndex].rot); for (const k of md.PKEYS[n]) th.push(a[k]); }); return th; }
function rotsFrom(md, th, S0) { const rots = S0.map(s => s.rot); let p = 0; for (const j of md.spec.joints) { const n = md.UPJ.indexOf(md.spec.joints.indexOf(j)); if (n < 0) continue; const a = {}; for (const k of md.PKEYS[n]) a[k] = th[p++]; rots[j.childIndex] = childRotation(j, rots[j.parentIndex], a); } return rots; }
function clampTh(md, th) { let p = 0; const o = th.slice(); md.upJoints.forEach((j, n) => { for (const k of md.PKEYS[n]) { const h = j.def.rom[k] && j.def.rom[k].hard; if (h) o[p] = Math.min(h[1], Math.max(h[0], o[p])); p++; } }); return o; }
function residual(md, th, S0, ref) { const S = chain(md, rotsFrom(md, th, S0), S0[0]), r = [];
  for (const i of md.UPPER) { const sm = Math.sqrt(md.B[i].mass); r.push(...V.sc(V.sub(comW(md, S, i), ref.c[i]), sm));
    const thW = rotvec(Q.norm(Q.mul(S[i].rot, Q.conj(ref.R[i])))), thB = Q.rot(Q.conj(S[i].rot), thW), Lt = md.CHOL[i]; r.push(Lt[0][0] * thB[0] + Lt[1][0] * thB[1] + Lt[2][0] * thB[2], Lt[1][1] * thB[1] + Lt[2][1] * thB[2], Lt[2][2] * thB[2]); }
  return r; }
export function fitUpper(md, S0, ref, th0) { const NP = md.NP; let th = clampTh(md, th0 || anglesFrom(md, S0)), r = residual(md, th, S0, ref), f = r.reduce((s, x) => s + x * x, 0), lam = 1e-3, it = 0;
  for (; it < MC1.fitMaxIt; it++) { const Jc = []; for (let p = 0; p < NP; p++) { const t2 = th.slice(); t2[p] += MC1.fitJacStepDeg; const r2 = residual(md, t2, S0, ref); Jc.push(r2.map((x, i) => (x - r[i]) / MC1.fitJacStepDeg)); }
    const JtJ = Array.from({ length: NP }, (_, a) => Array.from({ length: NP }, (_, b) => Jc[a].reduce((s, x, i) => s + x * Jc[b][i], 0))), Jtr = Jc.map(col => col.reduce((s, x, i) => s + x * r[i], 0));
    let improved = false; for (let tries = 0; tries < 8; tries++) { const A = JtJ.map((row, a) => row.map((x, b) => x + (a === b ? lam * (1 + JtJ[a][a]) : 0))), step = solveDense(A, Jtr.map(x => -x)), t2 = clampTh(md, th.map((x, p) => x + step[p])), r2 = residual(md, t2, S0, ref), f2 = r2.reduce((s, x) => s + x * x, 0);
      if (f2 < f) { th = t2; r = r2; const df = f - f2; f = f2; lam = Math.max(1e-9, lam / 4); improved = true; if (df < MC1.fitStopRel * Math.max(1, f)) it = 999; break; } lam *= 8; }
    if (!improved) break; }
  return { th, f, it, S: chain(md, rotsFrom(md, th, S0), S0[0]) }; }

// ── (3) V-d: KKT projection of the reference twists, pelvis + leg rates fixed ──
export function projectVelocities(md, S, refTw, fixedU) {
  const spec = md.spec, nj = spec.joints.length, NU = 6 + 3 * nj, zeros = () => [0, 1, 2].map(() => new Array(NU).fill(0)), skew = (r) => [[0, -r[2], r[1]], [r[2], 0, -r[0]], [-r[1], r[0], 0]];
  const mm = (A, Bm) => A.map(row => Bm[0].map((_, j) => row.reduce((s, x, k) => s + x * Bm[k][j], 0))), madd = (A, Bm, s = 1) => A.map((row, i) => row.map((x, j) => x + s * Bm[i][j])), tr = (A) => A[0].map((_, j) => A.map(row => row[j]));
  const c = S.map((_, i) => comW(md, S, i)), Av = [], Aw = []; Av[0] = zeros(); Aw[0] = zeros(); for (let k = 0; k < 3; k++) { Av[0][k][k] = 1; Aw[0][k][3 + k] = 1; }
  spec.joints.forEach((j, k) => { const p = j.parentIndex, ch = j.childIndex, jp = S[ch].pos; Aw[ch] = Aw[p].map(r => r.slice()); for (let a = 0; a < 3; a++) Aw[ch][a][6 + 3 * k + a] += 1;
    Av[ch] = madd(madd(Av[p], mm(skew(V.sub(jp, c[p])), Aw[p]), -1), mm(skew(V.sub(c[ch], jp)), Aw[ch]), -1); });
  const Iw = S.map((s, i) => Iworld(s.rot, md.B[i].inertia)); let Hm = Array.from({ length: NU }, () => new Array(NU).fill(0)); const g = new Array(NU).fill(0);
  for (let i = 0; i < md.NB; i++) { const m = md.B[i].mass, AvT = tr(Av[i]), AwT = tr(Aw[i]); Hm = madd(Hm, mm(AvT, Av[i]), m); Hm = madd(Hm, mm(AwT, mm(Iw[i], Aw[i])));
    const gv = mv(AvT, refTw.v[i]), gw = mv(AwT, mv(Iw[i], refTw.w[i])); for (let a = 0; a < NU; a++) g[a] += m * gv[a] + gw[a]; }
  const C = [], d = [];
  for (const [idx, val] of fixedU) { const r = new Array(NU).fill(0); r[idx] = 1; C.push(r); d.push(val); }
  spec.joints.forEach((j, k) => { if (md.LOJ.includes(k)) return; for (const key of j.locked) { const a = { x: 0, y: 1, z: 2 }[key], ax = Q.rot(Q.mul(S[j.childIndex].rot, j.F2), E3[a]), r = new Array(NU).fill(0); for (let q = 0; q < 3; q++) r[6 + 3 * k + q] = ax[q]; C.push(r); d.push(0); } });
  const nc = C.length, K = Array.from({ length: NU + nc }, () => new Array(NU + nc).fill(0)), rhs = new Array(NU + nc).fill(0);
  for (let a = 0; a < NU; a++) { for (let b = 0; b < NU; b++) K[a][b] = Hm[a][b]; rhs[a] = g[a]; } for (let r = 0; r < nc; r++) { for (let a = 0; a < NU; a++) { K[NU + r][a] = C[r][a]; K[a][NU + r] = C[r][a]; } rhs[NU + r] = d[r]; }
  const u = solveDense(K, rhs).slice(0, NU), resid = Math.max(0, ...C.map((row, r) => Math.abs(row.reduce((s, x, k) => s + x * u[k], 0) - d[r])));
  let anchor = 0; const v = Av.map(A => mv(A, u)), w = Aw.map(A => mv(A, u));
  spec.joints.forEach(j => { const p = j.parentIndex, ch = j.childIndex, jp = S[ch].pos, a = V.add(v[p], V.cross(w[p], V.sub(jp, c[p]))), b = V.add(v[ch], V.cross(w[ch], V.sub(jp, c[ch]))); anchor = Math.max(anchor, V.dist(a, b)); });
  return { v, w, u, constraintResidual: resid, anchorVelocityMax: anchor };
}
const fixedLower = (md, tw) => { const f = []; for (let a = 0; a < 3; a++) f.push([a, tw.v[0][a]]); for (let a = 0; a < 3; a++) f.push([3 + a, tw.w[0][a]]);
  for (const k of md.LOJ) { const j = md.spec.joints[k], wr = V.sub(tw.w[j.childIndex], tw.w[j.parentIndex]); for (let a = 0; a < 3; a++) f.push([6 + 3 * k + a, wr[a]]); } return f; };

// ── MC-1 ──
export function mapLV2toV2(spec, rig, q, opts = {}) {
  const md = model(spec), dl = opts.delta || MC1.delta;
  const lowP = ["m", "0", "p"].map(k => frozenMapping(spec, rig, q[k]));                        // (1) lower body at τ0 − δ, τ0, τ0 + δ
  const lowTw = { v: lowP[1].S.map((_, i) => V.sc(V.sub(comW(md, lowP[2].S, i), comW(md, lowP[0].S, i)), 1 / (2 * dl))), w: lowP[1].S.map((_, i) => angv(lowP[0].S[i].rot, lowP[2].S[i].rot, 2 * dl)) };
  const ref = reference(md, rig, q["0"]), S0 = chain(md, lowP[1].S.map(s => s.rot), lowP[1].S[0]);  // copy mapping as the fit's start
  const F = fitUpper(md, S0, ref, opts.th0);                                                      // (2)
  const S = F.S.map((s, i) => (md.UPPER.includes(i) ? s : lowP[1].S[i]));                         // lower body exactly the frozen mapping
  const tw = projectVelocities(md, S, { v: ref.v, w: ref.w }, fixedLower(md, lowTw));             // (3)
  return { S, vel: S.map((_, i) => ({ v: tw.v[i], w: tw.w[i] })), ref, lower: { poses: lowP, twists: lowTw }, fit: { f: F.f, it: F.it, th: F.th }, vd: { constraintResidual: tw.constraintResidual, anchorVelocityMax: tw.anchorVelocityMax } };
}
