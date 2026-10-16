// dribble1/tools/d1_hull_build.mjs — DRIBBLE-1 boot colliders from the REAL rendered boot mesh (assets/characters/outfield/<id>/mesh.bin + rig.json).
// Per side two rigid convex hulls, each in its bone's local frame (bind = character frame translated to the joint: the rig's bind rotations are identity):
//   boot_<S> — the foot bone's boot vertices (heel, arch, laces, midfoot, forefoot up to the MTP junction band)
//   toe_<S>  — the toe bone's boot vertices (the toe box, from the junction band forward)
// Vertices: dominant skin bone ∈ {foot_S, toe_S}, bind height ≤ 0.16 m (boot collar), studs excluded below the sole (y < soleBottomY − 1 mm).
// Each hull is reduced to ≤ MAXP points by greedy farthest-outside insertion (an INNER hull: never larger than the mesh); the residual (largest
// distance of any boot vertex outside the reduced hull) is recorded. Also the leg capsules (shin / thigh) from the rig's bone lengths and radii.
// usage: node d1_hull_build.mjs [char=vinicius] > ../d1_colliders.json
import fs from "fs"; import path from "path"; import crypto from "crypto"; import { fileURLToPath } from "url";
const HERE = path.dirname(fileURLToPath(import.meta.url)), REPO = path.resolve(HERE, "../../../.."), CH = process.argv[2] || "vinicius";
const dir = path.join(REPO, "assets/characters/outfield", CH), rigTxt = fs.readFileSync(path.join(dir, "rig.json")), rig = JSON.parse(rigTxt), bin = fs.readFileSync(path.join(dir, "mesh.bin"));
const L = rig.mesh.layout, view = (k, T) => new T(bin.buffer.slice(bin.byteOffset + L[k].byteOffset, bin.byteOffset + L[k].byteOffset + L[k].byteLength));
const pos = view("positions", Float32Array), jnt = view("joints", Uint16Array), wgt = view("weights", Float32Array), ib = view("inverseBinds", Float32Array), nV = rig.mesh.vertexCount;
const B = Object.fromEntries(rig.bones.map(b => [b.name, b]));
// bind rotations must be identity (inverse bind = pure translation) — otherwise bone-local = R⁻¹(p − o)
let maxRot = 0; for (let i = 0; i < rig.bones.length; i++) { const m = ib.subarray(i * 16, i * 16 + 16); for (const [a, b] of [[0, 1], [5, 1], [10, 1], [1, 0], [2, 0], [4, 0], [6, 0], [8, 0], [9, 0]]) maxRot = Math.max(maxRot, Math.abs(m[a] - b)); }
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]], len = (a) => Math.sqrt(dot(a, a));
// ── incremental 3D convex hull (faces as CCW-outward index triples); points must not be all coplanar ─────────────────────────────────────────────
function hull(P) {
  const n = P.length; let i0 = 0, i1 = -1, i2 = -1, i3 = -1, best = -1;
  for (let i = 1; i < n; i++) { const d = len(sub(P[i], P[i0])); if (d > best) { best = d; i1 = i; } }
  best = -1; for (let i = 0; i < n; i++) { const d = len(cross(sub(P[i1], P[i0]), sub(P[i], P[i0]))); if (d > best) { best = d; i2 = i; } }
  best = -1; const nn = cross(sub(P[i1], P[i0]), sub(P[i2], P[i0])); for (let i = 0; i < n; i++) { const d = Math.abs(dot(nn, sub(P[i], P[i0]))); if (d > best) { best = d; i3 = i; } }
  let F = [[i0, i1, i2], [i0, i2, i3], [i0, i3, i1], [i1, i3, i2]];
  const c = [0, 1, 2].map(k => (P[i0][k] + P[i1][k] + P[i2][k] + P[i3][k]) / 4);
  const orient = (f) => { const n = cross(sub(P[f[1]], P[f[0]]), sub(P[f[2]], P[f[0]])); return dot(n, sub(P[f[0]], c)) < 0 ? [f[0], f[2], f[1]] : f; };
  F = F.map(orient);
  const plane = (f) => { const n = cross(sub(P[f[1]], P[f[0]]), sub(P[f[2]], P[f[0]])), l = len(n) || 1; return { n: n.map(x => x / l), d: dot(n, P[f[0]]) / l }; };
  const used = new Set([i0, i1, i2, i3]);
  for (let i = 0; i < n; i++) {
    if (used.has(i)) continue;
    const vis = F.map(f => { const pl = plane(f); return dot(pl.n, P[i]) - pl.d > 1e-9; });
    if (!vis.some(Boolean)) continue;
    const edges = new Map(); F.forEach((f, k) => { if (!vis[k]) return; for (let e = 0; e < 3; e++) { const a = f[e], b = f[(e + 1) % 3], key = a + "," + b, rk = b + "," + a; if (edges.has(rk)) edges.delete(rk); else edges.set(key, [a, b]); } });
    F = F.filter((f, k) => !vis[k]); for (const [a, b] of edges.values()) F.push([a, b, i]); used.add(i);
  }
  return F.map(f => ({ f, ...plane(f) }));
}
const outside = (H, p) => { let m = -Infinity; for (const h of H) m = Math.max(m, dot(h.n, p) - h.d); return m; };   // > 0: outside (approx distance for small values)
function reduce(P, maxp, tol) {
  // seed: extreme points along 26 directions
  const dirs = []; for (const x of [-1, 0, 1]) for (const y of [-1, 0, 1]) for (const z of [-1, 0, 1]) if (x || y || z) dirs.push([x, y, z].map(v => v / Math.hypot(x, y, z)));
  const S = new Set(); for (const d of dirs) { let bi = 0, bv = -Infinity; P.forEach((p, i) => { const v = dot(p, d); if (v > bv) { bv = v; bi = i; } }); S.add(bi); }
  let H, resid;
  for (;;) { const Q = [...S].map(i => P[i]); H = hull(Q); let wi = -1; resid = 0; P.forEach((p, i) => { const o = outside(H, p); if (o > resid) { resid = o; wi = i; } });
    if (resid <= tol || S.size >= maxp || wi < 0) break; S.add(wi); }
  const Q = [...S].map(i => P[i]), Hq = hull(Q), keep = new Set(); for (const h of Hq) for (const k of h.f) keep.add(k);
  return { points: [...keep].sort((a, b) => a - b).map(k => Q[k].map(v => +v.toFixed(5))), resid, n: keep.size };
}
const out = { id: "DRIBBLE-1 colliders", character: CH, source: { rig: path.relative(REPO, path.join(dir, "rig.json")), rigSha256: crypto.createHash("sha256").update(rigTxt).digest("hex"), mesh: path.relative(REPO, path.join(dir, "mesh.bin")), meshSha256: crypto.createHash("sha256").update(bin).digest("hex"), bindRotationResidual: maxRot },
  frames: "bone-local anim3d frame (x = character right, y up, z forward), origin = the bone's joint; hulls are INNER hulls of the boot vertices", maxPoints: 40, tolerance: 0.002, sides: {} };
const soleY = rig.ground.soleBottomY;
for (const S of ["R", "L"]) {
  const iF = B["foot_" + S].index, iT = B["toe_" + S].index, oF = B["foot_" + S].bindOrigin, oT = B["toe_" + S].bindOrigin, foot = [], toe = [];
  for (let v = 0; v < nV; v++) {
    let wf = 0, wt = 0, wmax = 0, jmax = -1; for (let k = 0; k < 4; k++) { const j = jnt[v * 4 + k], w = wgt[v * 4 + k]; if (j === iF) wf += w; if (j === iT) wt += w; if (w > wmax) { wmax = w; jmax = j; } }
    if (jmax !== iF && jmax !== iT) continue; const p = [pos[v * 3], pos[v * 3 + 1], pos[v * 3 + 2]]; if (p[1] > 0.16 || p[1] < soleY - 0.001) continue;
    const share = wt / Math.max(1e-9, wf + wt);
    if (share <= 0.75) foot.push(sub(p, oF)); if (share >= 0.25) toe.push(sub(p, oT));
  }
  const rf = reduce(foot, out.maxPoints, out.tolerance), rt = reduce(toe, out.maxPoints, out.tolerance);
  const ext = (Q) => [0, 1, 2].map(k => [Math.min(...Q.map(p => p[k])), Math.max(...Q.map(p => p[k]))].map(v => +v.toFixed(4)));
  out.sides[S] = { boot: { bone: "foot_" + S, vertices: foot.length, points: rf.points, residualMm: +(rf.resid * 1000).toFixed(2), extent: ext(rf.points) },
    toe: { bone: "toe_" + S, vertices: toe.length, points: rt.points, residualMm: +(rt.resid * 1000).toFixed(2), extent: ext(rt.points) },
    shin: { bone: "shin_" + S, type: "capsule", r: B["shin_" + S].radiusM, half: +((B["shin_" + S].lengthM - 0.10) / 2).toFixed(4), pos: [0, -+((B["shin_" + S].lengthM - 0.10) / 2 + 0.02).toFixed(4), 0] },
    thigh: { bone: "thigh_" + S, type: "capsule", r: B["thigh_" + S].radiusM, half: +((B["thigh_" + S].lengthM - 0.06) / 2).toFixed(4), pos: [0, -+((B["thigh_" + S].lengthM) / 2).toFixed(4), 0] } };
}
process.stdout.write(JSON.stringify(out, null, 1) + "\n");
