// PI-1 compatibility tooling (PI1_COMPAT_GATE.md, fixed ab9a626): read-only kinematics of the exact D-1 body posed from a recorded presentation.
// Contents: quaternion helpers; the §5 mapping (as validated in D-1A) and the R-K / R-B retarget rules (§4); V2 collider support functions + GJK
// distance (validated in D-1A against analytic cases and brute-force vertex distances); capsule-into-body penetration by an axis scan.
import fs from "fs"; import zlib from "zlib"; import path from "path";
const P = path.join(process.cwd(), "sandbox/visual/physchar2/");
export const { V, Q } = await import(P + "core/v2_math.js"); const { posedBodies } = await import(P + "spec/v2_pose.js");
const { anatomicalAngles, childRotation, decompose } = await import(P + "spec/v2_joints.js"); const { pi1RunnerSpec } = await import(P + "spec/v2_pi1_runner.js");
export const { shapePenetration, bodyLowest } = await import(P + "sim/v2_geom.js");
export const spec = pi1RunnerSpec(), B = spec.bodies, NB = B.length, bi = (n) => B.findIndex(b => b.name === n);
export const loadAir = (dir, f) => JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(dir, f))));
export const m2q = (m) => { const r = (i, j) => m[j * 4 + i]; const t = r(0, 0) + r(1, 1) + r(2, 2); let q;
  if (t > 0) { const s = Math.sqrt(t + 1) * 2; q = [(r(2, 1) - r(1, 2)) / s, (r(0, 2) - r(2, 0)) / s, (r(1, 0) - r(0, 1)) / s, 0.25 * s]; }
  else if (r(0, 0) > r(1, 1) && r(0, 0) > r(2, 2)) { const s = Math.sqrt(1 + r(0, 0) - r(1, 1) - r(2, 2)) * 2; q = [0.25 * s, (r(0, 1) + r(1, 0)) / s, (r(0, 2) + r(2, 0)) / s, (r(2, 1) - r(1, 2)) / s]; }
  else if (r(1, 1) > r(2, 2)) { const s = Math.sqrt(1 + r(1, 1) - r(0, 0) - r(2, 2)) * 2; q = [(r(0, 1) + r(1, 0)) / s, 0.25 * s, (r(1, 2) + r(2, 1)) / s, (r(0, 2) - r(2, 0)) / s]; }
  else { const s = Math.sqrt(1 + r(2, 2) - r(0, 0) - r(1, 1)) * 2; q = [(r(0, 2) + r(2, 0)) / s, (r(1, 2) + r(2, 1)) / s, 0.25 * s, (r(1, 0) - r(0, 1)) / s]; }
  return Q.norm(q); };
export const m2p = (m) => [m[12], m[13], m[14]];
export const qang = (a, b) => { const d = Math.abs(a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3]); return 2 * Math.acos(Math.min(1, d)) * 180 / Math.PI; };
export const slerp = (a, b, t) => { let d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3], bb = b; if (d < 0) { d = -d; bb = b.map(x => -x); } if (d > 0.9995) return Q.norm(a.map((x, i) => x + t * (bb[i] - x)));
  const th = Math.acos(d), s = Math.sin(th); return a.map((x, i) => (Math.sin((1 - t) * th) * x + Math.sin(t * th) * bb[i]) / s); };
const fromCols = (x, y, z) => { const m = new Array(16).fill(0); m[0] = x[0]; m[1] = x[1]; m[2] = x[2]; m[4] = y[0]; m[5] = y[1]; m[6] = y[2]; m[8] = z[0]; m[9] = z[1]; m[10] = z[2]; m[15] = 1; return m2q(m); };
// swing / twist split of the rotation difference qa⁻¹·qb about a body-local long axis (unit), degrees
export function swingTwist(qa, qb, axis) { const d = Q.norm(Q.mul(Q.conj(qa), qb)), s = d[3] < 0 ? -1 : 1, v = [d[0] * s, d[1] * s, d[2] * s], w = d[3] * s, p = V.dot(v, axis);
  const tw = 2 * Math.atan2(p, w) * 180 / Math.PI, swing = 2 * Math.acos(Math.min(1, Math.hypot(w, p))) * 180 / Math.PI; return { swing, twist: tw }; }
export const MAP = { pelvis: "pelvis", spine: "abdomen", chest: "thorax", head: "head", upperArm_L: "upperArm_L", upperArm_R: "upperArm_R", foreArm_L: "forearm_L", foreArm_R: "forearm_R",
  thigh_L: "thigh_L", thigh_R: "thigh_R", shin_L: "shank_L", shin_R: "shank_R", foot_L: "foot_L", foot_R: "foot_R" };
export const Z0 = posedBodies(spec, {}); const hipL = spec.joints.find(j => j.name === "hip_L").at, hipR = spec.joints.find(j => j.name === "hip_R").at, hipMid0 = V.sc(V.add(hipL, hipR), 0.5);
const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
// raw V2 target rotations from the rig (§5), optionally with the R-K leg retarget
export function rawRotations(bones, bind, world, opts = {}) {
  const idx = Object.fromEntries(bones.map((b, i) => [b.name, i])), raw = new Array(NB);
  for (const [rb, vb] of Object.entries(MAP)) { const k = idx[rb]; raw[bi(vb)] = Q.norm(Q.mul(Q.mul(m2q(world[k]), Q.conj(m2q(bind[k]))), Z0[bi(vb)].rot)); }
  const info = {};
  if (opts.rk) for (const sd of ["L", "R"]) { const H = m2p(world[idx["thigh_" + sd]]), K = m2p(world[idx["shin_" + sd]]), A = m2p(world[idx["foot_" + sd]]);
    const u = V.norm(V.sub(K, H)), w = V.norm(V.sub(A, K)), cr = V.cross(u, w), bend = Math.asin(Math.min(1, V.len(cr))) * 180 / Math.PI;
    const xr = Q.rot(raw[bi("thigh_" + sd)], [1, 0, 0]), xrP = V.norm(V.sub(xr, V.sc(u, V.dot(xr, u))));   // the rig thigh's own flexion axis ⟂ u
    let n = V.len(cr) > 1e-9 ? V.norm(cr) : xrP; if (V.dot(n, xrP) < 0) n = V.sc(n, -1);
    const k = smooth(5, 10, bend); n = V.norm(V.add(V.sc(n, k), V.sc(xrP, 1 - k)));
    const nt = V.norm(V.sub(n, V.sc(u, V.dot(n, u)))), ns = V.norm(V.sub(n, V.sc(w, V.dot(n, w))));
    const qt = fromCols(nt, V.sc(u, -1), V.cross(nt, V.sc(u, -1))), qs = fromCols(ns, V.sc(w, -1), V.cross(ns, V.sc(w, -1)));
    info[sd] = { bendDeg: bend, thighTwistDeg: swingTwist(raw[bi("thigh_" + sd)], qt, [0, -1, 0]).twist, shankTwistDeg: swingTwist(raw[bi("shank_" + sd)], qs, [0, -1, 0]).twist,
      thighSwingDeg: swingTwist(raw[bi("thigh_" + sd)], qt, [0, -1, 0]).swing, shankSwingDeg: swingTwist(raw[bi("shank_" + sd)], qs, [0, -1, 0]).swing };
    raw[bi("thigh_" + sd)] = qt; raw[bi("shank_" + sd)] = qs; }
  return { raw, idx, info };
}
// projected V2 body poses from raw rotations (parent-first; hard ROM clamp; locked axes dropped), pelvis placed at the rig hip midpoint
export function project(raw, world, idx) {
  const S = new Array(NB), res = {}, clamp = {}; S[0] = { rot: raw[0], pos: null };
  const hm = V.sc(V.add(m2p(world[idx.thigh_L]), m2p(world[idx.thigh_R])), 0.5); S[0].pos = V.sub(hm, Q.rot(raw[0], V.sub(hipMid0, B[0].origin)));
  for (const j of spec.joints) { const qp = S[j.parentIndex].rot, a = anatomicalAngles(j, qp, raw[j.childIndex]); let c = 0;
    for (const k of Object.keys(a)) { const h = j.def.rom[k] && j.def.rom[k].hard; if (h) { const v = Math.min(h[1], Math.max(h[0], a[k])); c = Math.max(c, Math.abs(v - a[k])); a[k] = v; } }
    const qc = childRotation(j, qp, a); res[j.name] = qang(qc, raw[j.childIndex]); clamp[j.name] = c;
    S[j.childIndex] = { rot: qc, pos: V.add(S[j.parentIndex].pos, Q.rot(qp, V.sub(B[j.childIndex].origin, B[j.parentIndex].origin))) }; }
  return { S, res, clamp }; }
// R-B: minimal extra pitch (about the foot's mediolateral axis, at the ankle) bringing the V2 boot's lowest point to the pitch (+2 mm), for a toe-contact foot
export function bootPitchFix(S, sd, maxDeg = 40) { const i = bi("foot_" + sd), lo0 = bodyLowest(B[i], S[i]).y; if (lo0 <= 0.002) return { deg: 0, lowest0: lo0, lowest: lo0, rot: S[i].rot };
  const ax = Q.rot(S[i].rot, [1, 0, 0]), at = (deg) => { const q = Q.norm(Q.mul(Q.axis(ax, deg * Math.PI / 180), S[i].rot)); return { q, y: bodyLowest(B[i], { pos: S[i].pos, rot: q }).y }; };
  const sgn = at(2).y < at(-2).y ? 1 : -1; let a = 0, b = maxDeg; if (at(sgn * b).y > 0.002) return { deg: Infinity, lowest0: lo0, lowest: at(sgn * b).y, rot: S[i].rot };
  for (let it = 0; it < 40; it++) { const m = (a + b) / 2; if (at(sgn * m).y > 0.002) a = m; else b = m; } const r = at(sgn * b); return { deg: b, sign: sgn, lowest0: lo0, lowest: r.y, rot: r.q, axis: ax }; }
// ── V2 collider support functions, GJK distance, capsule penetration ──
const shapeXf = (s, st) => ({ p: V.add(st.pos, Q.rot(st.rot, s.pos)), q: Q.norm(Q.mul(st.rot, s.rot)) });
export function supportOf(s, st) { const X = shapeXf(s, st), at = (l) => V.add(X.p, Q.rot(X.q, l)), nrm = (d) => { const l = V.len(d); return l > 1e-15 ? V.sc(d, 1 / l) : [1, 0, 0]; };
  if (s.type === "sphere") return (d) => V.add(X.p, V.sc(nrm(d), s.r));
  if (s.type === "capsule" || s.type === "tapered") { const a = at([0, s.half, 0]), b = at([0, -s.half, 0]), ra = s.type === "capsule" ? s.r : s.rTop, rb = s.type === "capsule" ? s.r : s.rBot;
    return (d) => { const n = nrm(d); return V.dot(a, n) + ra >= V.dot(b, n) + rb ? V.add(a, V.sc(n, ra)) : V.add(b, V.sc(n, rb)); }; }
  if (s.type === "box") { const he = s.he.map(h => h - s.cr); return (d) => { const n = nrm(d), l = Q.rot(Q.conj(X.q), n); return V.add(V.add(X.p, Q.rot(X.q, he.map((h, i) => (l[i] >= 0 ? h : -h)))), V.sc(n, s.cr)); }; }
  if (s.type === "hull") { const pts = s.points.map(at); return (d) => { let best = pts[0], bv = -Infinity; for (const p of pts) { const v = p[0] * d[0] + p[1] * d[1] + p[2] * d[2]; if (v > bv) { bv = v; best = p; } } return best; }; }
  throw new Error(s.type); }
export const capsuleSupport = (a, b, r) => (d) => { const l = V.len(d), n = l > 1e-15 ? V.sc(d, 1 / l) : [1, 0, 0]; return V.dot(a, n) >= V.dot(b, n) ? V.add(a, V.sc(n, r)) : V.add(b, V.sc(n, r)); };
function closest(Wm) { const n = Wm.length, d = (a, b) => V.dot(a, b);
  if (n === 1) return { v: Wm[0], keep: [0], lam: [1] };
  if (n === 2) { const a = Wm[0], b = Wm[1], ab = V.sub(b, a), t = -d(a, ab) / Math.max(1e-30, d(ab, ab)); if (t <= 0) return { v: a, keep: [0], lam: [1] }; if (t >= 1) return { v: b, keep: [1], lam: [1] }; return { v: V.add(a, V.sc(ab, t)), keep: [0, 1], lam: [1 - t, t] }; }
  if (n === 3) { const [a, b, c] = Wm, ab = V.sub(b, a), ac = V.sub(c, a), ap = V.sc(a, -1), d1 = d(ab, ap), d2 = d(ac, ap);
    if (d1 <= 0 && d2 <= 0) return { v: a, keep: [0], lam: [1] };
    const bp = V.sc(b, -1), d3 = d(ab, bp), d4 = d(ac, bp); if (d3 >= 0 && d4 <= d3) return { v: b, keep: [1], lam: [1] };
    const vc = d1 * d4 - d3 * d2; if (vc <= 0 && d1 >= 0 && d3 <= 0) { const t = d1 / (d1 - d3); return { v: V.add(a, V.sc(ab, t)), keep: [0, 1], lam: [1 - t, t] }; }
    const cp = V.sc(c, -1), d5 = d(ab, cp), d6 = d(ac, cp); if (d6 >= 0 && d5 <= d6) return { v: c, keep: [2], lam: [1] };
    const vb = d5 * d2 - d1 * d6; if (vb <= 0 && d2 >= 0 && d6 <= 0) { const t = d2 / (d2 - d6); return { v: V.add(a, V.sc(ac, t)), keep: [0, 2], lam: [1 - t, t] }; }
    const va = d3 * d6 - d5 * d4; if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) { const t = (d4 - d3) / ((d4 - d3) + (d5 - d6)); return { v: V.add(b, V.sc(V.sub(c, b), t)), keep: [1, 2], lam: [1 - t, t] }; }
    const den = 1 / (va + vb + vc), v_ = vb * den, w_ = vc * den; return { v: V.add(a, V.add(V.sc(ab, v_), V.sc(ac, w_))), keep: [0, 1, 2], lam: [1 - v_ - w_, v_, w_] }; }
  const F = [[0, 1, 2, 3], [0, 1, 3, 2], [0, 2, 3, 1], [1, 2, 3, 0]]; let best = null, inside = true;
  for (const [i, j, k, o] of F) { const nrm = V.cross(V.sub(Wm[j], Wm[i]), V.sub(Wm[k], Wm[i])), sO = V.dot(nrm, V.sc(Wm[i], -1)), sP = V.dot(nrm, V.sub(Wm[o], Wm[i]));
    if (sO * sP < 0) { inside = false; const r = closest([Wm[i], Wm[j], Wm[k]]), dd = V.dot(r.v, r.v); if (!best || dd < best.dd) best = { v: r.v, keep: r.keep.map(x => [i, j, k][x]), lam: r.lam, dd }; } }
  if (inside) return { v: [0, 0, 0], keep: [0, 1, 2, 3], lam: null, inside: true }; return best; }
export function gjk(sa, sb) { let dir = V.sub(sa([1, 0, 0]), sb([-1, 0, 0])); if (V.len(dir) < 1e-12) dir = [1, 0, 0];
  let A = [], Bv = [], Wm = [], v = dir, last = null;
  for (let it = 0; it < 96; it++) { const a = sa(V.sc(v, -1)), b = sb(v), w = V.sub(a, b), vv = V.dot(v, v);
    if (Wm.length && vv - V.dot(v, w) <= 1e-12 * Math.max(1e-6, vv)) break;
    A.push(a); Bv.push(b); Wm.push(w); const r = closest(Wm); if (r.inside) return { d: 0, overlap: true };
    A = r.keep.map(i => A[i]); Bv = r.keep.map(i => Bv[i]); Wm = r.keep.map(i => Wm[i]); last = r; v = r.v; if (V.dot(v, v) < 1e-18) return { d: 0, overlap: true }; }
  const lam = last.lam, pA = A.reduce((s, a, i) => V.add(s, V.sc(a, lam[i])), [0, 0, 0]), pB = Bv.reduce((s, b, i) => V.add(s, V.sc(b, lam[i])), [0, 0, 0]);
  return { d: V.len(V.sub(pA, pB)), pA, pB }; }
export function bsphere(s, st) { const X = shapeXf(s, st); if (s.type === "sphere") return [X.p, s.r]; if (s.type === "capsule") return [X.p, s.half + s.r]; if (s.type === "tapered") return [X.p, s.half + Math.max(s.rTop, s.rBot)];
  if (s.type === "box") return [X.p, V.len(s.he)]; const c = s.points.reduce((a, p) => V.add(a, p), [0, 0, 0]).map(x => x / s.points.length), r = Math.max(...s.points.map(p => V.dist(p, c))); return [V.add(X.p, Q.rot(X.q, c)), r]; }
const swept = (x) => x.type === "sphere" || x.type === "capsule" || x.type === "tapered";
export function bodySep(i, j, S) { let best = { d: Infinity }; const si = B[i].shapes, sj = B[j].shapes;
  for (let a = 0; a < si.length; a++) { const [ca, ra] = bsphere(si[a], S[i]); for (let b = 0; b < sj.length; b++) { const [cb, rb] = bsphere(sj[b], S[j]); if (V.dist(ca, cb) - ra - rb > best.d) continue;
    const g = gjk(supportOf(si[a], S[i]), supportOf(sj[b], S[j])); let d = g.d, pA = g.pA, pB = g.pB;
    if (swept(si[a]) && swept(sj[b])) { d = -shapePenetration(si[a], S[i], sj[b], S[j]); if (!pA) { pA = ca; pB = cb; } }
    else if (g.overlap) { d = -Math.max(0, shapePenetration(si[a], S[i], sj[b], S[j])); pA = ca; pB = cb; }
    if (d < best.d) best = { d, pA, pB }; } }
  return best; }
// hull signed distance (outside: exact via GJK point-vs-hull; inside: −nearest face plane distance)
const planeCache = new WeakMap();
function hullPlanesWorld(pts) { const P = [], n = pts.length; for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) for (let k = j + 1; k < n; k++) { let nr = V.cross(V.sub(pts[j], pts[i]), V.sub(pts[k], pts[i])); const l = V.len(nr); if (l < 1e-12) continue; nr = V.sc(nr, 1 / l); const d = V.dot(nr, pts[i]);
  let pos = 0, neg = 0; for (const q of pts) { const s = V.dot(nr, q) - d; if (s > 1e-9) pos++; else if (s < -1e-9) neg++; } if (pos === 0) P.push([nr, d]); else if (neg === 0) P.push([V.sc(nr, -1), -d]); } return P; }
export function sdShape(s, st, p) { if (swept(s)) { return -shapePenetration({ type: "sphere", pos: [0, 0, 0], rot: [0, 0, 0, 1], r: 0 }, { pos: p, rot: [0, 0, 0, 1] }, s, st); }
  const g = gjk(() => p, supportOf(s, st)); if (!g.overlap && g.d > 1e-9) return g.d;
  const pts = s.type === "hull" ? s.points.map(q => V.add(st.pos, Q.rot(st.rot, V.add(s.pos, Q.rot(s.rot, q))))) : null; if (!pts) return -0.0;   // box interior: rare here
  let m = -Infinity; for (const [nr, d] of hullPlanesWorld(pts)) m = Math.max(m, V.dot(nr, p) - d); return m; }
// penetration (m, > 0 overlap) of a capsule (a, b, r) into body i, and the deepest axis point
export function capsulePen(a, b, r, i, S, N = 200) { let best = { pen: -Infinity }; for (const s of B[i].shapes) { const [c0, rr] = bsphere(s, S[i]); if (segPointDist(a, b, c0) - rr - r > 0.3) continue;
  for (let u = 0; u <= N; u++) { const p = V.lerp(a, b, u / N), pen = r - sdShape(s, S[i], p); if (pen > best.pen) best = { pen, p, piece: s }; } } return best; }
export function segPointDist(a, b, p) { const ab = V.sub(b, a), t = Math.max(0, Math.min(1, V.dot(V.sub(p, a), ab) / Math.max(1e-12, V.dot(ab, ab)))); return V.dist(V.add(a, V.sc(ab, t)), p); }
export function segSegDist(p1, q1, p2, q2) { const d1 = V.sub(q1, p1), d2 = V.sub(q2, p2), r = V.sub(p1, p2), a = V.dot(d1, d1), e = V.dot(d2, d2), f = V.dot(d2, r), cl = (x) => Math.max(0, Math.min(1, x)); let s, t;
  const c = V.dot(d1, r), b = V.dot(d1, d2), den = a * e - b * b; s = den > 1e-12 ? cl((b * f - c * e) / den) : 0; t = (b * s + f) / Math.max(1e-12, e); if (t < 0) { t = 0; s = cl(-c / a); } else if (t > 1) { t = 1; s = cl((b - c) / a); }
  const P = V.add(p1, V.sc(d1, s)), Qp = V.add(p2, V.sc(d2, t)); return { d: V.dist(P, Qp), s, t, P, Q: Qp }; }
export const sim2r = (p) => [p[0], p[2], -p[1]];   // simulation (x, y, height) → render (x, height, −y)
export const disabledPairs = new Set(spec.disabledPairs.map(([a, b]) => Math.min(a, b) + "-" + Math.max(a, b)));
export const SELF_PAIRS = (() => { const o = []; for (let i = 0; i < NB; i++) for (let j = i + 1; j < NB; j++) if (!disabledPairs.has(i + "-" + j)) o.push([i, j]); return o; })();
