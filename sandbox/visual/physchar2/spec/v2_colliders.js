// ═══ physchar2/spec/v2_colliders.js — physics-first colliders, self-collision matrix, contact policy (V2-G0) ═════════════════════════
// Spec §15 / §12.2 (approved). Generated from anthropometry — never fitted to a display mesh and never used for mass.
// Shapes are in BODY-LOCAL coordinates (origin = proximal joint centre, axes = CCS at canonical). Jolt shape conventions: capsule and
// tapered capsule axis = local +Y of the shape (tapered: TOP radius at +Y); box = half extents + convex radius; hull = point cloud.
// Engineering offsets authored at V2-REF scale with H (Lm.s = H / 1.82); boot construction constants (sole stack, toe spring, toe
// allowance) are absolute.
import { V, Q, datan2 } from "../core/v2_math.js";
import { DE_LEVA } from "./v2_human.js";

const INSET = 0.003;                                     // collider ~3 mm inside the skin [ENG]
const RHO = { upperArm: 1070, forearm: 1130, shank: 1090 };   // Dempster / Winter segment densities [H]
const TAPER = { upperArm: 1.15, forearm: 1.45, shank: 1.45 };  // proximal / distal radius ratio [ENG]
export function frustumRadii(m, L, rho, k) { const Vv = m / rho, r2 = Math.sqrt(3 * Vv / (Math.PI * L * (k * k + k + 1))); return [k * r2 - INSET, r2 - INSET]; }
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
function alignY(d) {                                     // rotation taking shape +Y onto direction d (deterministic)
  const n = V.norm(d), ax = V.cross([0, 1, 0], n), s = V.len(ax), c = n[1];
  if (s < 1e-12) return c > 0 ? [0, 0, 0, 1] : [1, 0, 0, 0];
  return Q.axis(V.sc(ax, 1 / s), datan2(s, c));
}
// segment between two cap centres (body-local) → capsule / tapered capsule placement
function between(top, bot) { const d = sub(top, bot), mid = [(top[0] + bot[0]) / 2, (top[1] + bot[1]) / 2, (top[2] + bot[2]) / 2]; return { pos: mid, rot: alignY(d), half: V.len(d) / 2 }; }

export function buildColliders(Lm, bodies) {
  const { H, M, P, E, sole, Ls, yA, yK, yH, yOMPH, yXYPH, ySUPR, yCERV, ySJC, hx, sx, s } = Lm;
  const by = Object.fromEntries(bodies.map(b => [b.name, b])), out = {};
  const loc = (b, w) => sub(w, by[b].origin);
  const mf = (seg) => DE_LEVA[seg].m / 100 * M;
  // ── trunk ──
  out.pelvis = [{ type: "box", material: "body", he: [P.hipBreadth * H / 2, (yOMPH - (yH - 0.07 * s)) / 2, P.pelvisDepth * H / 2], cr: 0.03,
    pos: loc("pelvis", [0, (yOMPH + yH - 0.07 * s) / 2, -0.010 * s]), rot: [0, 0, 0, 1], note: "hip breadth × pelvis depth; 7 cm below the HJC (gluteal)" }];
  out.abdomen = [{ type: "box", material: "body", he: [P.abdomenBreadth * H / 2, (yXYPH - yOMPH) / 2, P.waistDepth * H / 2], cr: 0.03,
    pos: loc("abdomen", [0, (yXYPH + yOMPH) / 2, 0]), rot: [0, 0, 0, 1], note: "waist depth (ANSUR subset); breadth for arm clearance" }];
  const gird = between(loc("thorax", [0.0715 * H, ySJC + 0.028 * s, -0.02 * s]), loc("thorax", [-0.0715 * H, ySJC + 0.028 * s, -0.02 * s]));
  out.thorax = [{ type: "box", material: "body", he: [P.chestBreadth * H / 2, (ySUPR - yXYPH) / 2, P.chestDepth * H / 2], cr: 0.03,
      pos: loc("thorax", [0, (ySUPR + yXYPH) / 2, 0]), rot: [0, 0, 0, 1], note: "chest box xiphion → suprasternale" },
    { type: "capsule", material: "body", r: 0.033 * H, half: gird.half, pos: gird.pos, rot: gird.rot, note: "shoulder-girdle capsule (trapezius / clavicle contact)" }];
  const headPt = [0, P.headJointH * H + sole, P.headJointAP * H], nk = between(loc("head", headPt), loc("head", by.head.origin));
  // C1 (approved 2026-10-02) fixed the head dimensions: r = head breadth / 2 = 0.044 H, AP offset = (head length − head breadth) / 2 = 0.013 H,
  // so the AP extent = head length and the lateral extent = head breadth. C4 (approved 2026-10-03) changes only the COLLISION REPRESENTATION:
  // two spheres of radius r at ±offset along AP instead of the AP capsule (G1 showed Jolt's capsule face heuristic rests a short, fat capsule's
  // end cap up to 7.5 mm into the turf; a sphere has no supporting face). Same AP extent and breadth; the sides between the sphere centres
  // are 3.7 mm inside the capsule (within the −15…+5 mm head tolerance). Placement rule unchanged: skull top 0.005 H below the vertex, AP centre
  // +0.0055 H. Colliders never carry mass: head mass / COM / inertia unchanged.
  const hr = P.headBreadth * H / 2, hh = (P.headLength - P.headBreadth) * H / 2, hc = [0, H + sole - 0.005 * H - hr, 0.0055 * H];
  out.head = [{ type: "sphere", material: "body", r: hr, pos: loc("head", [hc[0], hc[1], hc[2] + hh]), rot: [0, 0, 0, 1], note: "skull: anterior sphere of the AP pair (C4; length 0.114 H, breadth 0.088 H)" },
    { type: "sphere", material: "body", r: hr, pos: loc("head", [hc[0], hc[1], hc[2] - hh]), rot: [0, 0, 0, 1], note: "skull: posterior sphere of the AP pair (C4)" },
    { type: "capsule", material: "body", r: 0.030 * H, half: nk.half, pos: nk.pos, rot: nk.rot, note: "neck capsule C7 → skull base" }];
  // ── arms ──
  const ua = frustumRadii(mf("upperArm"), Ls.upperArm, RHO.upperArm, TAPER.upperArm), fa = frustumRadii(mf("forearm"), Ls.forearm, RHO.forearm, TAPER.forearm);
  for (const [sd, g] of [["L", -1], ["R", 1]]) {
    const U = by["upperArm_" + sd], F = by["forearm_" + sd], u = [g, 0, 0];
    const t = between(loc(U.name, V.add(U.origin, V.sc(u, 0.04 * s))), loc(U.name, V.sub(U.distal, V.sc(u, 0.01 * s))));
    out[U.name] = [{ type: "sphere", material: "body", r: 0.030 * H, pos: loc(U.name, V.add(U.origin, V.sc(u, 0.0066 * H))), rot: [0, 0, 0, 1], note: "deltoid sphere (bideltoid 0.291 H)" },
      { type: "tapered", material: "body", rTop: ua[0], rBot: ua[1], half: t.half, pos: t.pos, rot: t.rot, note: "volume-matched frustum (density 1070)" }];
    const f = between(loc(F.name, F.origin), loc(F.name, F.distal)), hl = Ls.hand + 0.02 * s, hr = 0.0135 * H;
    const h = between(loc(F.name, V.add(F.distal, V.sc(u, hr))), loc(F.name, V.add(F.distal, V.sc(u, hl - hr))));
    out[F.name] = [{ type: "tapered", material: "body", rTop: fa[0], rBot: fa[1], half: f.half, pos: f.pos, rot: f.rot, note: "volume-matched frustum (density 1130)" },
      { type: "capsule", material: "hand", r: hr, half: h.half, pos: h.pos, rot: h.rot, note: `hand capsule, extent ${hl.toFixed(3)} m from the wrist (palm to knuckles)` }];
  }
  // ── legs ──
  const sh = frustumRadii(mf("shank"), Ls.shank, RHO.shank, TAPER.shank);
  for (const [sd, g] of [["L", -1], ["R", 1]]) {
    const T = by["thigh_" + sd], S = by["shank_" + sd], Ft = by["foot_" + sd];
    const t = between(loc(T.name, [g * (hx + 0.02 * s), yH - 0.05 * s, 0]), loc(T.name, [g * hx, yK + 0.02 * s, 0]));
    out[T.name] = [{ type: "tapered", material: "body", rTop: 0.048 * H, rBot: 0.034 * H, half: t.half, pos: t.pos, rot: t.rot, note: "girth-based (proximal 0.048 H, lateral axis offset)" }];
    const k = between(loc(S.name, [g * hx, yK - 0.03 * s, -0.01 * s]), loc(S.name, [g * hx, yA + 0.06 * s, -0.01 * s]));
    out[S.name] = [{ type: "tapered", material: "body", rTop: sh[0], rBot: sh[1], half: k.half, pos: k.pos, rot: k.rot, note: "volume-matched frustum (density 1090), calf 1 cm posterior" }];
    // D1a (decided 2026-10-03): the approved rigid boot hull is REPRESENTED as 10 convex pieces — a grid AP 5 (planes at 20/40/60/80 % of
    // the hull's length) × ML 2 (mid-width) of the hull — whose union is exactly the approved hull (identical external geometry, mass
    // properties and ankle; a collision-manifold representation change, not an anatomical change). Why: Jolt builds each contact manifold
    // from the ONE face whose normal best matches the contact and drops the deepest point whenever that face lies within 21 mm
    // (ConvexHullShape::GetSupportingFace + ManifoldBetweenTwoFaces); on the approved 27-vertex polytope that missed the deepest point by
    // > 10 mm in ≈ 1 % of orientations (single hull 35 mm worst, C3 two pieces 31 mm worst; calc/boot_face_model.py). The 10-piece grid:
    // worst 1.2 mm (model), 4.1 mm (Jolt held sweep). Requires manifold reduction OFF + body-pair cache OFF (C3 S3). History: C3 adopted 2
    // AP pieces (splitHullAP, kept below); D1a replaced them.
    // hullTol 1e-5 m: Jolt's default 1 mm hull tolerance dropped seam-section vertices and shrank the pieces (Σ volume −0.28 %, ≤ 1 mm slivers
    // missing at the seams); at 1e-5 the Jolt pieces tile the hull exactly (Σ volume = hull volume to 2e-7) — measured, G0 0.10e.
    out[Ft.name] = splitHullGrid(bootHull(Lm, Ft, g), BOOT_GRID.ap, BOOT_GRID.ml).map((pts, k, all) => ({ type: "hull", material: "boot", cr: 0.005, hullTol: 1e-5, pos: [0, 0, 0], rot: [0, 0, 0, 1], points: pts,
      note: `rigid boot hull (anatomical outline, oblique MTP break, 12 mm toe spring) — convex piece ${k + 1}/${all.length} of the approved hull (D1a grid AP 5 × ML 2)` }));
  }
  return out;
}
// boot hull points, foot-local (origin = AJC). lat = +1 right foot (lateral = +x), −1 left foot.
export function bootHull(Lm, foot, lat) {
  const { s, yA } = Lm, b = foot.boot, ys = -yA, z0 = -b.heelBehindAJC, z1 = b.tipAheadAJC, hw = b.heelWidth / 2, bw = b.ballWidth / 2, m1 = b.mtp1AheadAJC, m5 = b.mtp5AheadAJC, ts = b.toeSpring;
  const mtpZ = (x) => { const t = (lat * x + bw) / (2 * bw); return m1 + (m5 - m1) * Math.max(0, Math.min(1, t)); };   // oblique break: medial m1 → lateral m5
  const soleY = (x, z) => { const zm = mtpZ(x); return z <= zm ? ys : ys + ts * Math.min(1, (z - zm) / (z1 - zm)); };
  const P = [], add = (x, y, z) => P.push([x, y, z]), sp = (x, z) => add(x, soleY(x, z), z);
  // plantar outline
  sp(0, z0); sp(lat * 0.80 * hw, z0 + 0.012 * s); sp(-lat * 0.80 * hw, z0 + 0.012 * s); sp(lat * hw, z0 + 0.040 * s); sp(-lat * hw, z0 + 0.040 * s);
  sp(lat * 0.5 * (hw + bw), 0.5 * (z0 + m5)); sp(-lat * 0.485 * (hw + bw), 0.5 * (z0 + m1)); sp(lat * bw, m5); sp(-lat * bw, m1);
  sp(lat * 0.80 * bw, m5 + 0.45 * (z1 - m5)); sp(lat * 0.35 * bw, z1 - 0.010 * s); sp(-lat * 0.25 * bw, z1); sp(-lat * 0.80 * bw, m1 + 0.55 * (z1 - m1));
  // upper silhouette (heel counter, collar, instep, toe box)
  add(0, ys + 0.065 * s, z0 + 0.004 * s); add(lat * 0.75 * hw, ys + 0.060 * s, z0 + 0.015 * s); add(-lat * 0.75 * hw, ys + 0.060 * s, z0 + 0.015 * s);
  add(lat * 0.035 * s, ys + 0.070 * s, 0); add(-lat * 0.035 * s, ys + 0.070 * s, 0);
  add(0, ys + 0.075 * s, 0.035 * s); add(lat * 0.6 * bw, ys + 0.060 * s, 0.07 * s); add(-lat * 0.6 * bw, ys + 0.060 * s, 0.07 * s);
  add(0, ys + 0.055 * s, 0.11 * s); add(lat * 0.75 * bw, ys + 0.040 * s, m5); add(-lat * 0.75 * bw, ys + 0.040 * s, m1);
  add(-lat * 0.2 * bw, ys + 0.045 * s, 0.19 * s); add(-lat * 0.25 * bw, ys + ts + 0.030 * s, z1 - 0.008 * s); add(lat * 0.5 * bw, ys + 0.6 * ts + 0.028 * s, 0.20 * s);
  return P;
}
// self-collision: one group per character, sub-group = body index; disabled pairs (spec §15.3): 13 parent–child + 3
export function disabledPairs(bodies) {
  const idx = (n) => bodies.findIndex(b => b.name === n), out = [];
  for (const b of bodies) if (b.parentIndex >= 0) out.push([b.parentIndex, b.index, "parent–child"]);
  out.push([idx("pelvis"), idx("thorax"), "pelvis–thorax (extreme flexion governed by joint limits)"]);
  out.push([idx("abdomen"), idx("thigh_L"), "abdomen–thigh (deep hip flexion governed by ROM + passive torque)"]);
  out.push([idx("abdomen"), idx("thigh_R"), "abdomen–thigh (deep hip flexion governed by ROM + passive torque)"]);
  return out;
}
// contact policy (spec §15.4) — friction per material pair; restitution 0 for bodies (the ball is handled separately, later)
export const CONTACT = { speculative: 0.02, slop: 0.005, baumgarte: 0.2, restitution: 0,
  friction: { "boot|turf": 1.2, "hand|turf": 0.7, "body|turf": 0.5, "body|body": 0.4, "boot|body": 0.4, "hand|body": 0.4, "boot|boot": 0.4, "hand|hand": 0.4, "boot|hand": 0.4 },
  frictionNote: "boot–turf 1.2 [ENG] default pending the turf gate (range 1.0–1.6); others [V1] values kept as [ENG]" };
export const frictionOf = (ma, mb) => { const k1 = ma + "|" + mb, k2 = mb + "|" + ma; return CONTACT.friction[k1] ?? CONTACT.friction[k2] ?? 0.4; };

// split a convex point hull by the plane z = z0 + frac·(z1 − z0) into two convex pieces whose union is exactly the hull: each piece = the
// points on its side + the intersections of every crossing point pair with the plane (edge pairs give the section's vertices; interior pairs
// land inside it and are discarded by the hull builder) (C3)
// D1a boot collision representation: grid planes (fractions of the hull's AP = foot-z and ML = foot-x extent)
export const BOOT_GRID = { ap: [0.2, 0.4, 0.6, 0.8], ml: [0.5] };
// split a convex point hull on a GRID of planes into convex pieces that tile it exactly (union = the hull): each cut keeps the points on each
// side plus the section of the piece by the plane; the section is the 2D convex hull of the crossing pairs' intersections (the others lie
// inside it), so a piece carries only its own vertices and section vertices (≈ 15–28 points; Jolt's hull cap is 256)
export function splitHullGrid(P, apFracs = [], mlFracs = []) {
  const hull2 = (pts, ax) => { const [u, v] = ax === 2 ? [0, 1] : [1, 2], Qs = pts.slice().sort((a, b) => a[u] - b[u] || a[v] - b[v]), cr = (o, a, b) => (a[u] - o[u]) * (b[v] - o[v]) - (a[v] - o[v]) * (b[u] - o[u]);
    const lo = [], hi = []; for (const p of Qs) { while (lo.length >= 2 && cr(lo.at(-2), lo.at(-1), p) <= 0) lo.pop(); lo.push(p); }
    for (const p of Qs.slice().reverse()) { while (hi.length >= 2 && cr(hi.at(-2), hi.at(-1), p) <= 0) hi.pop(); hi.push(p); }
    return lo.slice(0, -1).concat(hi.slice(0, -1)); };
  const cutPts = (pts, ax, c) => { const o = []; for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) { const a = pts[i], d = pts[j];
    if ((a[ax] - c) * (d[ax] - c) < 0) { const t = (c - a[ax]) / (d[ax] - a[ax]); const p = [a[0] + t * (d[0] - a[0]), a[1] + t * (d[1] - a[1]), a[2] + t * (d[2] - a[2])]; p[ax] = c; o.push(p); } }
    return o.length > 2 ? hull2(o, ax) : o; };
  let pieces = [P];
  for (const [ax, fr] of [[2, apFracs], [0, mlFracs]]) { const vs = P.map(p => p[ax]), lo = Math.min(...vs), hi = Math.max(...vs);
    for (const f of fr) { const c = lo + f * (hi - lo), next = [];
      for (const Qp of pieces) { const qv = Qp.map(p => p[ax]); if (!(Math.min(...qv) < c && Math.max(...qv) > c)) { next.push(Qp); continue; }
        const X = cutPts(Qp, ax, c); next.push([...Qp.filter(p => p[ax] <= c), ...X], [...Qp.filter(p => p[ax] >= c), ...X]); }
      pieces = next; } }
  return pieces;
}
// HISTORY (C3, superseded by D1a): split by one AP plane into two pieces
export function splitHullAP(P, frac) {
  const zs = P.map(p => p[2]), z0 = Math.min(...zs), z1 = Math.max(...zs), zc = z0 + frac * (z1 - z0), cut = [];
  for (let i = 0; i < P.length; i++) for (let j = i + 1; j < P.length; j++) { const a = P[i], c = P[j]; if ((a[2] - zc) * (c[2] - zc) < 0) { const t = (zc - a[2]) / (c[2] - a[2]); cut.push([a[0] + t * (c[0] - a[0]), a[1] + t * (c[1] - a[1]), zc]); } }
  return [[...P.filter(p => p[2] <= zc), ...cut], [...P.filter(p => p[2] >= zc), ...cut]];
}
