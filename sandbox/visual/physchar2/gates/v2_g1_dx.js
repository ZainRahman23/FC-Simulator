// ═══ physchar2/gates/v2_g1_dx.js — G1 DIAGNOSTIC experiments (NOT adopted): candidate remedies measured so the open decisions can be
// taken on evidence. Every modifier here returns a modified COPY of a spec for a diagnostic run only; the approved spec is untouched.
import { V, Q } from "../core/v2_math.js";

const clone = (o) => JSON.parse(JSON.stringify(o));
// split the boot hull by the plane z = zc (foot-local) into two convex pieces whose union is EXACTLY the original hull: each piece = the
// original points on its side + the intersections of every crossing point pair with the plane (interior pairs land inside the section,
// edge pairs give its vertices; the hull builder discards the interior ones)
export function splitBootHull(spec, zcFrac = 0.55) {
  const s = clone(spec);
  for (const b of s.bodies) { if (!/^foot_/.test(b.name)) continue; const h = b.shapes.find(x => x.type === "hull"), P = h.points, zs = P.map(p => p[2]), z0 = Math.min(...zs), z1 = Math.max(...zs), zc = z0 + zcFrac * (z1 - z0);
    const cut = []; for (let i = 0; i < P.length; i++) for (let j = i + 1; j < P.length; j++) { const a = P[i], c = P[j]; if ((a[2] - zc) * (c[2] - zc) < 0) { const t = (zc - a[2]) / (c[2] - a[2]); cut.push([a[0] + t * (c[0] - a[0]), a[1] + t * (c[1] - a[1]), zc]); } }
    const rear = { ...h, points: [...P.filter(p => p[2] <= zc), ...cut], note: "DX: rear piece" }, front = { ...h, points: [...P.filter(p => p[2] >= zc), ...cut], note: "DX: front piece" };
    b.shapes = [rear, front, ...b.shapes.filter(x => x !== h)]; }
  return s;
}
// C3 representation R3: the hull split into FOUR convex pieces (rear / front × medial / lateral about the hull's mid-width line); the union is
// exactly the original hull (each piece = original points on its side + the plane intersections of every crossing pair, for both planes)
export function splitBootHull4(spec, zcFrac = 0.55) {
  const s = clone(spec);
  for (const b of s.bodies) { if (!/^foot_/.test(b.name)) continue; const h = b.shapes.find(x => x.type === "hull"), P = h.points, zs = P.map(p => p[2]), xs = P.map(p => p[0]);
    const zc = Math.min(...zs) + zcFrac * (Math.max(...zs) - Math.min(...zs)), xc = (Math.min(...xs) + Math.max(...xs)) / 2;
    const cut = (pts, ax, c) => { const o = []; for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) { const a = pts[i], d = pts[j]; if ((a[ax] - c) * (d[ax] - c) < 0) { const t = (c - a[ax]) / (d[ax] - a[ax]); o.push([0, 1, 2].map(k => a[k] + t * (d[k] - a[k]))); } } return o; };
    const half = (pts, ax, c, sgn) => [...pts.filter(p => sgn * (p[ax] - c) >= 0), ...cut(pts, ax, c)];
    const pieces = []; for (const sz of [-1, 1]) { const pz = half(P, 2, zc, sz); for (const sx of [-1, 1]) pieces.push({ ...h, points: half(pz, 0, xc, sx), note: `C3 R3 piece z${sz > 0 ? "+" : "−"} x${sx > 0 ? "+" : "−"}` }); }
    b.shapes = [...pieces, ...b.shapes.filter(x => x !== h)]; }
  return s;
}
// head AP capsule → two spheres of the capsule radius at the capsule's segment ends (same AP extent and breadth; 3.7 mm waist at the sides)
export function headSpherePair(spec) {
  const s = clone(spec), b = s.bodies.find(x => x.name === "head"), cap = b.shapes[0], ax = Q.rot(cap.rot, [0, 1, 0]);
  const sp = (sg) => ({ type: "sphere", material: cap.material, r: cap.r, pos: V.add(cap.pos, V.sc(ax, sg * cap.half)), rot: [0, 0, 0, 1], note: "DX: head sphere pair" });
  b.shapes = [sp(1), sp(-1), ...b.shapes.slice(1)]; return s;
}
// G1 diagnostics at the validated baseline (240 Hz × 1, 60 velocity / 2 position iterations, warm start ON, manifold reduction OFF, pair cache
// OFF, the C3 two-piece boot): each varies ONE thing unless labelled a package. Measured to inform the decision report; NOT adopted.
export const DX_CONFIGS = [
  { id: "DX-R1", label: "C3 reference: the approved single boot hull (union of the two pieces)", cfg: {}, mods: ["singleHull"] },
  { id: "DX-W0", label: "warm starting off (joints and contacts)", cfg: { warmStart: false } },
  { id: "DX-JW0", label: "warm starting off for the joints only", cfg: { jointWarmStart: false } },
  { id: "DX-CW0", label: "warm starting off for the contacts only", cfg: { contactWarmStart: false } },
  { id: "DX-100", label: "100 velocity iterations", cfg: { velSteps: 100 } },
  { id: "DX-150", label: "150 velocity iterations", cfg: { velSteps: 150 } },
  { id: "DX-200", label: "200 velocity iterations", cfg: { velSteps: 200 } },
  { id: "DX-POS4", label: "4 position iterations (V1's value)", cfg: { posSteps: 4 } },
  { id: "DX-B10", label: "boot as 10 convex pieces (AP 5 × ML 2 grid of the approved hull; identical external geometry)", cfg: {}, mods: ["bootGridAP5xML2"] },
  { id: "DX-B12", label: "boot as 12 convex pieces (AP 4 × ML 3 grid; identical external geometry)", cfg: {}, mods: ["bootGridAP4xML3"] },
  { id: "DX-B10-150", label: "PACKAGE: 10-piece boot + 150 velocity iterations", cfg: { velSteps: 150 }, mods: ["bootGridAP5xML2"] },
];
// the approved single hull, reconstructed from the spec's convex pieces (the hull of their union = the approved hull, exactly)
export function singleHull(spec) { const s = clone(spec); for (const b of s.bodies) { if (!/^foot_/.test(b.name)) continue; const H = b.shapes.filter(x => x.type === "hull");
  if (H.length > 1) b.shapes = [{ ...H[0], points: H.flatMap(h => h.points), note: "approved single boot hull (union of the C3 pieces)" }, ...b.shapes.filter(x => x.type !== "hull")]; } return s; }
export const BOOT_GRIDS = { AP5xML2: [[0.2, 0.4, 0.6, 0.8], [0.5]], AP4xML3: [[0.25, 0.5, 0.75], [1 / 3, 2 / 3]], AP4xML2: [[0.25, 0.5, 0.75], [0.5]], AP6: [[1 / 6, 2 / 6, 3 / 6, 4 / 6, 5 / 6], []] };
export function applyMods(spec, mods = []) { let s = spec; if (mods.includes("singleHull")) s = singleHull(s);
  for (const m of mods) if (m.startsWith("bootGrid")) s = splitBootGrid(singleHull(s), ...BOOT_GRIDS[m.slice(8)]);
  if (mods.includes("headSpheres")) s = headSpherePair(s); return s; }
// G1 boot contact-generation study: the approved hull (union of the spec's boot pieces = the approved single hull, exactly) split on a GRID of
// planes — AP fractions along foot z, ML fractions along foot x. Identical external geometry: every piece is hull ∩ slab and the pieces tile
// the hull. Cut points are reduced to their in-plane convex hull (the interior ones are redundant), so the Jolt hull builder stays far
// below its 256-vertex cap.
export function splitBootGrid(spec, apFracs = [], mlFracs = []) {
  const s = clone(spec);
  const hull2 = (pts, ax) => {   // 2D convex hull (monotone chain) of points lying in the plane normal to axis ax
    const [u, v] = ax === 2 ? [0, 1] : [1, 2], Q = pts.slice().sort((a, b) => a[u] - b[u] || a[v] - b[v]), cr = (o, a, b) => (a[u] - o[u]) * (b[v] - o[v]) - (a[v] - o[v]) * (b[u] - o[u]);
    const lo = [], hi = []; for (const p of Q) { while (lo.length >= 2 && cr(lo.at(-2), lo.at(-1), p) <= 0) lo.pop(); lo.push(p); }
    for (const p of Q.slice().reverse()) { while (hi.length >= 2 && cr(hi.at(-2), hi.at(-1), p) <= 0) hi.pop(); hi.push(p); }
    return lo.slice(0, -1).concat(hi.slice(0, -1)); };
  const cutPts = (pts, ax, c) => { const o = []; for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) { const a = pts[i], d = pts[j];
    if ((a[ax] - c) * (d[ax] - c) < 0) { const t = (c - a[ax]) / (d[ax] - a[ax]); const p = [a[0] + t * (d[0] - a[0]), a[1] + t * (d[1] - a[1]), a[2] + t * (d[2] - a[2])]; p[ax] = c; o.push(p); } }
    return o.length > 2 ? hull2(o, ax) : o; };
  for (const b of s.bodies) { if (!/^foot_/.test(b.name)) continue; const H = b.shapes.filter(x => x.type === "hull"), h0 = H[0], P = H.flatMap(h => h.points);
    let pieces = [P];
    for (const [ax, fr] of [[2, apFracs], [0, mlFracs]]) { const vs = P.map(p => p[ax]), lo = Math.min(...vs), hi = Math.max(...vs);
      for (const f of fr) { const c = lo + f * (hi - lo), next = [];
        for (const Q of pieces) { const qv = Q.map(p => p[ax]); if (!(Math.min(...qv) < c && Math.max(...qv) > c)) { next.push(Q); continue; }
          const X = cutPts(Q, ax, c); next.push([...Q.filter(p => p[ax] <= c), ...X], [...Q.filter(p => p[ax] >= c), ...X]); }
        pieces = next; } }
    b.shapes = [...pieces.map((pts, k) => ({ ...h0, points: pts, note: `boot grid piece ${k + 1}/${pieces.length} (AP ${apFracs.join("/")} × ML ${mlFracs.join("/")})` })), ...b.shapes.filter(x => x.type !== "hull")]; }
  return s;
}
