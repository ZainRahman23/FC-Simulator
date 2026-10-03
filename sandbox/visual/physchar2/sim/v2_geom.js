// ═══ physchar2/sim/v2_geom.js — exact collider geometry queries in the world (measurement only; mirrors the shapes Jolt builds) ══════════
// Shapes are body-local (origin = proximal joint centre, canonical axes). Capsule / tapered capsule axis = shape-local +Y (tapered: TOP
// radius at +Y); box = half extents with the convex radius INSIDE the extents (Jolt BoxShape); hull = point cloud (Jolt keeps the faces of
// the point hull and rounds its corners inward by the convex radius, so the lowest raw point bounds the true lowest point from below).
import { V, Q } from "../core/v2_math.js";

const corners = (he) => { const o = []; for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) o.push([sx * he[0], sy * he[1], sz * he[2]]); return o; };
// world transform of a shape on a posed body
export const shapeXf = (s, pos, rot) => ({ p: V.add(pos, Q.rot(rot, s.pos)), q: Q.mul(rot, s.rot) });
// lowest world y of one shape
export function shapeLowestY(s, pos, rot) {
  const X = shapeXf(s, pos, rot), at = (l) => V.add(X.p, Q.rot(X.q, l))[1];
  if (s.type === "sphere") return X.p[1] - s.r;
  if (s.type === "capsule") return Math.min(at([0, s.half, 0]), at([0, -s.half, 0])) - s.r;
  if (s.type === "tapered") return Math.min(at([0, s.half, 0]) - s.rTop, at([0, -s.half, 0]) - s.rBot);
  if (s.type === "box") { const he = s.he.map(h => h - s.cr); return Math.min(...corners(he).map(at)) - s.cr; }
  // hull: Jolt's contact depth for the boot hull equals the RAW-POINT depth in every tested orientation (flat / heel / toe / edges / corner;
  // tools: scratch hullcheck, 2026-10-03) — the engine collides with the sharp point hull — so the raw points ARE the collision surface
  if (s.type === "hull") return Math.min(...s.points.map(at));
  throw new Error("shape " + s.type);
}
// lowest point of a body (y, shape index)
export function bodyLowest(b, st) { let m = Infinity, k = -1; b.shapes.forEach((s, i) => { const y = shapeLowestY(s, st.pos, st.rot); if (y < m) { m = y; k = i; } }); return { y: m, shape: k }; }
// lowest point of the whole character
export function lowestOf(spec, S) { let m = Infinity, who = -1; spec.bodies.forEach((b, i) => { const l = bodyLowest(b, S[i]); if (l.y < m) { m = l.y; who = i; } }); return { y: m, body: who }; }
// boot sole polygon (foot-local, the hull's plantar points: those within 2 mm of its lowest local y) for the "feet contact where their
// geometry says" check
export function bootSole(footBody) { const P = footBody.shapes.filter(s => s.type === "hull").flatMap(h => h.points.map(p => V.add(p, h.pos))), ys = P.map(p => p[1]), y0 = Math.min(...ys);   // C3: all boot pieces
  return { y0, pts: P.filter((p, i) => ys[i] < y0 + 0.002) }; }
// 2-D convex hull (x, z) + point-in-polygon with signed distance (m, + inside)
export function hull2(pts) { const P = pts.map(p => [p[0], p[2]]).sort((a, b) => a[0] - b[0] || a[1] - b[1]), cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = []; for (const p of P) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
  for (let i = P.length - 1; i >= 0; i--) { const p = P[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
  return lo.slice(0, -1).concat(up.slice(0, -1)); }
export function insideDist(poly, x, z) { let d = Infinity, inside = true; for (let i = 0; i < poly.length; i++) { const a = poly[i], b = poly[(i + 1) % poly.length], ex = b[0] - a[0], ez = b[1] - a[1], L = Math.hypot(ex, ez);
    const c = ((x - a[0]) * ez - (z - a[1]) * ex) / L; // >0 = right of edge; for a CCW polygon inside is left (c < 0)
    if (c > 0) inside = false; d = Math.min(d, Math.abs(c)); } return inside ? d : -d; }

// EXACT rounded-hull geometry (Jolt ConvexHullShape with convex radius cr = the hull's faces shrunk by cr, then expanded by a sphere of
// radius cr: same face planes, corners and edges rounded). The lowest point in any direction = the shrunk polytope's support − cr.
// Faces by brute force over point triples (≤ ~100 points, once per shape), shrunk vertices by intersecting face-plane triples.
const HULL_CACHE = new Map();
export function roundedHull(s) {
  if (!(s.cr > 0)) return null; const key = JSON.stringify([s.points, s.cr]); if (HULL_CACHE.has(key)) return HULL_CACHE.get(key);
  const P = s.points, n = P.length, planes = [], eps = 1e-9;
  for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) for (let c = b + 1; c < n; c++) {
    const nn = V.cross(V.sub(P[b], P[a]), V.sub(P[c], P[a])), L = V.len(nn); if (L < 1e-12) continue; let N = V.sc(nn, 1 / L), d = V.dot(N, P[a]);
    let pos = 0, neg = 0; for (const q of P) { const e = V.dot(N, q) - d; if (e > 1e-7) pos++; else if (e < -1e-7) neg++; } if (pos && neg) continue;
    if (pos) { N = V.sc(N, -1); d = -d; }
    if (!planes.some(p => V.dot(p.N, N) > 1 - 1e-9 && Math.abs(p.d - d) < 1e-9)) planes.push({ N, d }); }
  const sh = planes.map(p => ({ N: p.N, d: p.d - s.cr })), verts = [];
  for (let a = 0; a < sh.length; a++) for (let b = a + 1; b < sh.length; b++) for (let c = b + 1; c < sh.length; c++) {
    const A = sh[a], B = sh[b], C = sh[c], den = V.dot(A.N, V.cross(B.N, C.N)); if (Math.abs(den) < 1e-12) continue;
    const x = V.sc(V.add(V.add(V.sc(V.cross(B.N, C.N), A.d), V.sc(V.cross(C.N, A.N), B.d)), V.sc(V.cross(A.N, B.N), C.d)), 1 / den);
    if (sh.every(p => V.dot(p.N, x) <= p.d + eps) && !verts.some(v => V.dist(v, x) < 1e-9)) verts.push(x); }
  const R = verts.length >= 4 ? { verts, cr: s.cr, faces: planes.length } : null; HULL_CACHE.set(key, R); return R;
}

// ── penetration between shapes (C7 missed-collision detector; measurement only) ────────────────────────────────────────────────────────
// hull face planes (outward normal N, offset d: inside ⇔ N·x ≤ d for all faces), cached
const PLANE_CACHE = new Map();
export function hullPlanes(points) { const key = JSON.stringify(points); if (PLANE_CACHE.has(key)) return PLANE_CACHE.get(key); const P = points, n = P.length, planes = [];
  for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) for (let c = b + 1; c < n; c++) { const nn = V.cross(V.sub(P[b], P[a]), V.sub(P[c], P[a])), L = V.len(nn); if (L < 1e-12) continue;
    let N = V.sc(nn, 1 / L), d = V.dot(N, P[a]), pos = 0, neg = 0; for (const q of P) { const e = V.dot(N, q) - d; if (e > 1e-7) pos++; else if (e < -1e-7) neg++; } if (pos && neg) continue;
    if (pos) { N = V.sc(N, -1); d = -d; } if (!planes.some(p => V.dot(p.N, N) > 1 - 1e-9 && Math.abs(p.d - d) < 1e-9)) planes.push({ N, d }); }
  PLANE_CACHE.set(key, planes); return planes; }
const segClosest = (p1, q1, p2, q2) => {   // closest points between segments p1q1, p2q2 → [s, t, dist]
  const d1 = V.sub(q1, p1), d2 = V.sub(q2, p2), r = V.sub(p1, p2), a = V.dot(d1, d1), e = V.dot(d2, d2), f = V.dot(d2, r); let s, t;
  if (a < 1e-12 && e < 1e-12) return [0, 0, V.len(r)];
  if (a < 1e-12) { s = 0; t = Math.max(0, Math.min(1, f / e)); } else { const c = V.dot(d1, r); if (e < 1e-12) { t = 0; s = Math.max(0, Math.min(1, -c / a)); } else { const b = V.dot(d1, d2), den = a * e - b * b;
    s = den > 1e-12 ? Math.max(0, Math.min(1, (b * f - c * e) / den)) : 0; t = (b * s + f) / e; if (t < 0) { t = 0; s = Math.max(0, Math.min(1, -c / a)); } else if (t > 1) { t = 1; s = Math.max(0, Math.min(1, (b - c) / a)); } } }
  return [s, t, V.len(V.sub(V.add(p1, V.sc(d1, s)), V.add(p2, V.sc(d2, t))))]; };
// a world-space "swept-sphere" description of a shape: segment endpoints + radius at each end (sphere / capsule / tapered), or null
function sweptOf(s, pos, rot) { const X = shapeXf(s, pos, rot), at = (l) => V.add(X.p, Q.rot(X.q, l));
  if (s.type === "sphere") return { a: X.p, b: X.p, ra: s.r, rb: s.r }; if (s.type === "capsule") return { a: at([0, s.half, 0]), b: at([0, -s.half, 0]), ra: s.r, rb: s.r };
  if (s.type === "tapered") return { a: at([0, s.half, 0]), b: at([0, -s.half, 0]), ra: s.rTop, rb: s.rBot }; return null; }
// signed distance of a world point to a shape (≤ 0 inside); boxes rounded (cr), hulls exact inside / lower bound outside
function signedDist(s, pos, rot, p) { const X = shapeXf(s, pos, rot), l = Q.rot(Q.conj(X.q), V.sub(p, X.p));
  if (s.type === "box") { const he = s.he.map(h => h - s.cr), q = l.map((x, i) => Math.abs(x) - he[i]), out = Math.hypot(Math.max(q[0], 0), Math.max(q[1], 0), Math.max(q[2], 0)); return out + Math.min(Math.max(q[0], q[1], q[2]), 0) - s.cr; }
  if (s.type === "hull") { let m = -Infinity; for (const P of hullPlanes(s.points)) m = Math.max(m, V.dot(P.N, l) - P.d); return m; }
  const w = sweptOf(s, pos, rot), [t, , dd] = segClosest(p, p, w.a, w.b); return dd - (w.ra + (w.rb - w.ra) * (t)); }
// penetration depth (m, > 0 = overlap) of shape A (on body state A) vs shape B (on body state B)
export function shapePenetration(sA, stA, sB, stB) {
  const wA = sweptOf(sA, stA.pos, stA.rot), wB = sweptOf(sB, stB.pos, stB.rot);
  if (wA && wB) { const [s, t, d] = segClosest(wA.a, wA.b, wB.a, wB.b); return (wA.ra + (wA.rb - wA.ra) * s) + (wB.ra + (wB.rb - wB.ra) * t) - d; }
  if (wA || wB) { const w = wA || wB, other = wA ? [sB, stB] : [sA, stA]; let m = -Infinity; for (let k = 0; k <= 24; k++) { const u = k / 24, p = V.lerp(w.a, w.b, u); m = Math.max(m, (w.ra + (w.rb - w.ra) * u) - signedDist(other[0], other[1].pos, other[1].rot, p)); } return m; }
  // hull / box vs hull / box: vertices of each inside the other
  const pts = (s, st) => (s.type === "hull" ? s.points : (() => { const he = s.he.map(h => h - s.cr), o = []; for (const a of [-1, 1]) for (const b of [-1, 1]) for (const c of [-1, 1]) o.push([a * he[0], b * he[1], c * he[2]]); return o; })()).map(p => { const X = shapeXf(s, st.pos, st.rot); return V.add(X.p, Q.rot(X.q, p)); });
  let m = -Infinity; for (const p of pts(sA, stA)) m = Math.max(m, -signedDist(sB, stB.pos, stB.rot, p)); for (const p of pts(sB, stB)) m = Math.max(m, -signedDist(sA, stA.pos, stA.rot, p)); return m;
}
