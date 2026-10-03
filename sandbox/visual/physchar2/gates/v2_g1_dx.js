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
export const DX_CONFIGS = [
  { id: "DX0", label: "reference (spec settings, 30 velocity iterations)", cfg: {} },
  { id: "DX1", label: "60 velocity iterations", cfg: { velSteps: 60 } },
  { id: "DX2", label: "100 velocity iterations", cfg: { velSteps: 100 } },
  { id: "DX3", label: "warm starting off", cfg: { warmStart: false } },
  { id: "DX4", label: "linear-cast CCD on every body", cfg: { ccd: "linearcast" } },
  { id: "DX5", label: "penetration slop 2 mm", cfg: { slop: 0.002 } },
  { id: "DX6", label: "body-pair contact cache off", cfg: { pairCache: false } },
  { id: "DX7", label: "boot hull split into 2 convex pieces (same outer surface)", cfg: {}, mods: ["bootSplit"] },
  { id: "DX8", label: "head capsule as a sphere pair (same AP extent / breadth)", cfg: {}, mods: ["headSpheres"] },
  { id: "DX9", label: "combined: 60 it + CCD + slop 2 mm + no pair cache + split boot + sphere-pair head", cfg: { velSteps: 60, ccd: "linearcast", slop: 0.002, pairCache: false }, mods: ["bootSplit", "headSpheres"] },
  { id: "DX10", label: "manifold reduction off + pair cache off + split boot (boot contact remedy)", cfg: { manifoldReduction: false, pairCache: false }, mods: ["bootSplit"] },
  { id: "DX11", label: "speculative contact distance 0.065 m (15 m/s × dt) — HARMFUL (rest sink)", cfg: { speculative: 0.065 } },
  { id: "DX12", label: "720 Hz physics (30 it)", cfg: { hz: 720 } },
  { id: "P", label: "PACKAGE P: 60 it · 240 Hz · manifold reduction off · pair cache off · split boot · sphere-pair head", cfg: { velSteps: 60, manifoldReduction: false, pairCache: false }, mods: ["bootSplit", "headSpheres"] },
  { id: "P720", label: "PACKAGE P at 720 Hz (30 it)", cfg: { velSteps: 30, hz: 720, manifoldReduction: false, pairCache: false }, mods: ["bootSplit", "headSpheres"] },
];
export function applyMods(spec, mods = []) { let s = spec; if (mods.includes("bootSplit")) s = splitBootHull(s); if (mods.includes("bootSplit4")) s = splitBootHull4(s); if (mods.includes("headSpheres")) s = headSpherePair(s); return s; }
