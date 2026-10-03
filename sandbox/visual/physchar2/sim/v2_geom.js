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
  if (s.type === "hull") return Math.min(...s.points.map(at));
  throw new Error("shape " + s.type);
}
// lowest point of a body (y, shape index)
export function bodyLowest(b, st) { let m = Infinity, k = -1; b.shapes.forEach((s, i) => { const y = shapeLowestY(s, st.pos, st.rot); if (y < m) { m = y; k = i; } }); return { y: m, shape: k }; }
// lowest point of the whole character
export function lowestOf(spec, S) { let m = Infinity, who = -1; spec.bodies.forEach((b, i) => { const l = bodyLowest(b, S[i]); if (l.y < m) { m = l.y; who = i; } }); return { y: m, body: who }; }
// boot sole polygon (foot-local, the hull's plantar points: those within 2 mm of its lowest local y) for the "feet contact where their
// geometry says" check
export function bootSole(footBody) { const h = footBody.shapes.find(s => s.type === "hull"), ys = h.points.map(p => p[1] + h.pos[1]), y0 = Math.min(...ys);
  return { y0, pts: h.points.filter((p, i) => ys[i] < y0 + 0.002).map(p => V.add(p, h.pos)) }; }
// 2-D convex hull (x, z) + point-in-polygon with signed distance (m, + inside)
export function hull2(pts) { const P = pts.map(p => [p[0], p[2]]).sort((a, b) => a[0] - b[0] || a[1] - b[1]), cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = []; for (const p of P) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
  for (let i = P.length - 1; i >= 0; i--) { const p = P[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
  return lo.slice(0, -1).concat(up.slice(0, -1)); }
export function insideDist(poly, x, z) { let d = Infinity, inside = true; for (let i = 0; i < poly.length; i++) { const a = poly[i], b = poly[(i + 1) % poly.length], ex = b[0] - a[0], ez = b[1] - a[1], L = Math.hypot(ex, ez);
    const c = ((x - a[0]) * ez - (z - a[1]) * ex) / L; // >0 = right of edge; for a CCW polygon inside is left (c < 0)
    if (c > 0) inside = false; d = Math.min(d, Math.abs(c)); } return inside ? d : -d; }
