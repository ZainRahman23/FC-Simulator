// ═══ occupy3/o3_geom.js — PLAYER OCCUPANCY STAGE 3: the body's physical quantities read from the POSED body (PlayBody's joints, pitch metres,
// z up) — shared by the impact / balance model (o3_world.js) and every Stage 3 tool, so the study, the model and the Lab measure the same thing:
//   comOf      the whole-body centre of mass: each segment's mass fraction (the rig's own table, skel._kbody.massFrac — de Leva) at its bone's
//              midpoint (joint → tip)
//   footPoly   a planted boot's ground footprint: heel (the rig's heelZ behind the ankle) → toe tip, ±FOOT_W/2 wide, along the drawn foot
//   supportOf  the support polygon (the convex hull of the planted footprints) and the body's place in it
//   regionOf   a capsule contact's anatomical region (SHOULDER / CHEST / WAIST / PELVIS / THIGH / SHIN / FOOT / ARM) from the closest point's place
//              on the capsule; facingSide: where the contact is on a player (FRONT / SIDE / BEHIND) from his pelvis heading
const hyp = Math.hypot;
export const FOOT_W = 0.095;   // m: the boot's width at the ground (DRIBBLE-1's boot hull: ≈ 9.5 cm across the forefoot)
// the centre of mass of a posed body (3-D) — massFrac: { bone: fraction } (sums to 1)
export function comOf(J, massFrac) { let x = 0, y = 0, z = 0, m = 0;
  for (const k in massFrac) { const b = J[k]; if (!b) continue; const w = massFrac[k]; x += w * (b.j[0] + b.t[0]) / 2; y += w * (b.j[1] + b.t[1]) / 2; z += w * (b.j[2] + b.t[2]) / 2; m += w; }
  return [x / m, y / m, z / m]; }
// a boot's footprint on the ground (counter-clockwise from the heel's right corner): heelZ (negative: behind the ankle) along the drawn foot
export function footPoly(J, X, heelZ = -0.0808) { const a = J["foot_" + X].j, tip = J["toe_" + X] ? J["toe_" + X].t : J["foot_" + X].t, d = [tip[0] - a[0], tip[1] - a[1]], L = hyp(d[0], d[1]) || 1, f = [d[0] / L, d[1] / L], l = [-f[1], f[0]], w = FOOT_W / 2;
  const heel = [a[0] + f[0] * heelZ, a[1] + f[1] * heelZ], toe = [tip[0], tip[1]];
  return [[heel[0] - l[0] * w, heel[1] - l[1] * w], [toe[0] - l[0] * w, toe[1] - l[1] * w], [toe[0] + l[0] * w, toe[1] + l[1] * w], [heel[0] + l[0] * w, heel[1] + l[1] * w]]; }
// the convex hull (Andrew's monotone chain), counter-clockwise
export function hull(pts) { if (pts.length < 3) return pts.slice(); const P = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]), cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]), lo = [], up = [];
  for (const p of P) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
  for (let i = P.length - 1; i >= 0; i--) { const p = P[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
  up.pop(); lo.pop(); return lo.concat(up); }
// the signed distance of a point to a convex polygon (counter-clockwise): > 0 inside (to the nearest edge), < 0 outside
export function polyMargin(poly, p) { if (!poly || poly.length < 3) return -Infinity; let inside = true, dmin = Infinity;
  for (let i = 0; i < poly.length; i++) { const a = poly[i], b = poly[(i + 1) % poly.length], e = [b[0] - a[0], b[1] - a[1]], L = hyp(e[0], e[1]) || 1, cr = (e[0] * (p[1] - a[1]) - e[1] * (p[0] - a[0])) / L;
    if (cr < 0) inside = false; const u = Math.max(0, Math.min(1, ((p[0] - a[0]) * e[0] + (p[1] - a[1]) * e[1]) / (L * L))), q = [a[0] + e[0] * u, a[1] + e[1] * u]; dmin = Math.min(dmin, hyp(p[0] - q[0], p[1] - q[1])); }
  return inside ? dmin : -dmin; }
// how far from p the polygon's boundary lies along the unit direction u (p inside; 0 if p is outside or on it): the room to move that way
export function polyReach(poly, p, u) { if (!poly || poly.length < 3 || polyMargin(poly, p) <= 0) return 0; let best = Infinity;
  for (let i = 0; i < poly.length; i++) { const a = poly[i], b = poly[(i + 1) % poly.length], e = [b[0] - a[0], b[1] - a[1]], den = u[0] * e[1] - u[1] * e[0]; if (Math.abs(den) < 1e-12) continue;
    const w = [a[0] - p[0], a[1] - p[1]], s = (w[0] * e[1] - w[1] * e[0]) / den, r = (w[0] * u[1] - w[1] * u[0]) / den; if (s >= -1e-12 && r >= -1e-9 && r <= 1 + 1e-9) best = Math.min(best, s); }
  return best === Infinity ? 0 : best; }
// the support of a posed body: the planted feet's footprints → their hull, its centroid; the centre of mass (projected) inside it or not
export function supportOf(J, planted, massFrac) { const feet = planted.map((X) => ({ X, poly: footPoly(J, X) })), poly = feet.length ? hull(feet.flatMap((f) => f.poly)) : null, com = comOf(J, massFrac);
  let cx = 0, cy = 0; if (poly) { for (const p of poly) { cx += p[0]; cy += p[1]; } cx /= poly.length; cy /= poly.length; }
  return { feet, poly, centroid: poly ? [cx, cy] : null, com, margin: poly ? polyMargin(poly, com) : null }; }
// a capsule's anatomical region at the contact (the CHEST capsule's ends are the shoulders: its axis runs across them)
export function regionOf(id, u) { if (id === "CHEST") return u < 0.22 || u > 0.78 ? "SHOULDER" : "CHEST"; if (id === "UARM_R" || id === "UARM_L") return "ARM"; if (id === "WAIST") return "WAIST";
  if (id === "PELVIS") return u < 0.2 || u > 0.8 ? "HIP" : "PELVIS"; return id.replace(/_[RL]$/, ""); }
// the pair's anatomical name, A's region first (e.g. "SHOULDER / CHEST", "THIGH / SHIN")
export const pairName = (x) => regionOf(x.A, x.uA) + " / " + regionOf(x.B, x.uB);
// where on a player a contact acts: the direction INTO him (from the other) against his pelvis heading psi → FRONT / SIDE (L / R) / BEHIND
export function facingSide(nInto, psi) { const f = [Math.cos(psi), Math.sin(psi)], a = Math.atan2(f[0] * -nInto[1] - f[1] * -nInto[0], -(f[0] * nInto[0] + f[1] * nInto[1])) * 180 / Math.PI;
  // (a: the angle of the contact's source direction (−nInto) from the facing, + = to his left)
  const A = Math.abs(a); return { deg: +a.toFixed(1), side: A <= 45 ? "FRONT" : A >= 135 ? "BEHIND" : a > 0 ? "SIDE (L)" : "SIDE (R)" }; }
// a point on a capsule at parameter u
export const capPt = (v, u) => [v.a[0] + (v.b[0] - v.a[0]) * u, v.a[1] + (v.b[1] - v.a[1]) * u, v.a[2] + (v.b[2] - v.a[2]) * u];
