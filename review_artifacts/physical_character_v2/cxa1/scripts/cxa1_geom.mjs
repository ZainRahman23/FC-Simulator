// CXA-1 (collision-exclusion audit) geometry: exact signed separation / penetration between two V2 collision shapes in world space.
// Shapes and support functions are V2's own (pi1/scripts/compat_lib.mjs supportOf: sphere, capsule, tapered capsule = hull of two spheres, box with its
// convex radius, hull = the specified points). Separated → GJK distance + witness points (compat_lib gjk). Overlapping → penetration depth =
// min over unit directions n of h_D(n), D = B ⊖ A (the Minkowski difference; the origin is inside), i.e. the minimum translation distance; found by
// a 642-direction icosphere search refined by a shrinking pattern search to < 1e-5 rad. Read-only; nothing here touches a simulation.
// Convention: A = runner shape, B = tackler shape; normal = unit direction runner → tackler (the direction the tackler shape must move to separate).
// Hull note: Jolt rounds hull / box edges by their convex radius (5 mm boot hulls; 30 mm trunk boxes — the box support already includes it), so at
// hull corners the specified points can protrude ≤ ~2–3 mm beyond Jolt's surface: hull-involving depths here are conservative (never smaller).
const RA = new URL("../../", import.meta.url).href;
const CL = await import(RA + "pi1/scripts/compat_lib.mjs"), { V, Q } = CL;
export { CL, V, Q };
const ico = (() => { const t = (1 + Math.sqrt(5)) / 2; let P = [[-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0], [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t], [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]].map(V.norm);
  let F = [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8], [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]];
  for (let lev = 0; lev < 3; lev++) { const mid = new Map(), m = (a, b) => { const k = a < b ? a + "_" + b : b + "_" + a; if (!mid.has(k)) { P.push(V.norm(V.sc(V.add(P[a], P[b]), 0.5))); mid.set(k, P.length - 1); } return mid.get(k); };
    const G = []; for (const [a, b, c] of F) { const ab = m(a, b), bc = m(b, c), ca = m(c, a); G.push([a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]); } F = G; } return P; })();   // 642 directions
const tangent = (n) => { const a = Math.abs(n[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0], u = V.norm(V.cross(n, a)); return [u, V.cross(n, u)]; };
// signed distance between support functions sa (A) and sb (B); returns { d, n (A→B), pA, pB } (pA / pB witness points; for overlap, the deepest points)
export function signedDistance(sa, sb) {
  const g = CL.gjk(sa, sb);
  if (!g.overlap) { const v = V.sub(g.pB, g.pA), l = V.len(v); return { d: g.d, n: l > 1e-12 ? V.sc(v, 1 / l) : [0, 1, 0], pA: g.pA, pB: g.pB, overlap: false }; }
  const h = (n) => V.dot(sb(n), n) - V.dot(sa(V.sc(n, -1)), n);   // support of D = B ⊖ A in direction n (≥ 0 when the origin is inside)
  let best = null, bv = Infinity; for (const n of ico) { const v = h(n); if (v < bv) { bv = v; best = n; } }
  for (let del = 0.06; del > 1e-5; ) { const [u, w] = tangent(best); let improved = false;
    for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4, c = V.norm(V.add(best, V.add(V.sc(u, Math.cos(a) * del), V.sc(w, Math.sin(a) * del)))), v = h(c); if (v < bv - 1e-15) { bv = v; best = c; improved = true; } }
    if (!improved) del /= 2; }
  const nRT = V.sc(best, -1); return { d: -bv, n: nRT, pA: sa(nRT), pB: sb(V.sc(nRT, -1)), overlap: true };
}
// world shapes of one character: S = its 14 body states; returns entries { b (body index), name, k (shape index), s, st, sup, bc, br, rMin }
export function worldShapes(spec, S) { const out = [];
  spec.bodies.forEach((b, i) => b.shapes.forEach((s, k) => { const st = { pos: S[i].pos, rot: S[i].rot }, [bc, br] = CL.bsphere(s, st);
    const rMin = s.type === "sphere" || s.type === "capsule" ? s.r : s.type === "tapered" ? Math.min(s.rTop, s.rBot) : s.type === "box" ? Math.min(...s.he) : (() => { const P = s.points, ext = [0, 1, 2].map(a => Math.max(...P.map(p => p[a])) - Math.min(...P.map(p => p[a]))); return Math.min(...ext) / 2; })();
    out.push({ b: i, name: b.name, k, type: s.type, s, st, sup: CL.supportOf(s, st), bc, br, rMin }); })); return out; }
// velocity of a body-fixed point p
export const velAt = (st, p) => V.add(st.v, V.cross(st.w, V.sub(p, st.com)));
