// ═══ physchar2/tools/region_study.mjs — overnight A1: boundary stress test of the usable foot regions, former (hull2 + radial inset) vs corrected
// (usableRegion: hull2Canonical → radial inset → canonical convex hull), every body variant. Questions: are the former 0.72 mm notches numerical construction artifacts? is the corrected
// boundary behaviour smoother rather than merely different? are left / right exact mirrors? is the collision geometry untouched? (DIAGNOSTIC)
//   1. convexity: the controller's region functions (insidePoly's sign-consistency test, clampPoly's nearest-edge projection) ASSUME a convex
//      polygon; is each region convex? (reflex vertices)
//   2. insidePoly correctness against an exact winding-number test on a dense grid around each region;
//   3. projection continuity: clampPoly of targets moved by 0.05 mm along dense rings outside the region — max output jump (a convex region gives a
//      1-Lipschitz projection: jump ≤ the target move);
//   4. invariance of the construction to the sampling of the SAME boot outline: extra collinear points inserted on every hull edge, point order
//      permuted, a 1e-15 m rounding perturbation — former vs corrected region change;
//   5. the boot's collision geometry (spec hull pieces) is not an input of either construction (a fingerprint of the boot pieces is printed).
// usage: node tools/region_study.mjs [--json=<out>]
import fs from "fs"; import { generateSpec } from "../spec/v2_spec.js"; import { VARIATION_SET } from "../spec/v2_human.js"; import { STAND, insetPoly, insidePoly, clampPoly, usableRegion } from "../ctrl/v2_stand.js"; import { bootSole, hull2, hull2Canonical } from "../sim/v2_geom.js";
const e = (x) => (+x).toExponential(2), out = [];
const reflex = (P) => P.filter((p, i) => { const a = P[(i - 1 + P.length) % P.length], b = P[(i + 1) % P.length]; return (p[0] - a[0]) * (b[1] - p[1]) - (p[1] - a[1]) * (b[0] - p[0]) < -1e-15; }).length;   // CCW: a right turn is reflex
const winding = (P, q) => { let w = 0; for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length]; if (a[1] <= q[1]) { if (b[1] > q[1] && (b[0] - a[0]) * (q[1] - a[1]) - (q[0] - a[0]) * (b[1] - a[1]) > 0) w++; } else if (b[1] <= q[1] && (b[0] - a[0]) * (q[1] - a[1]) - (q[0] - a[0]) * (b[1] - a[1]) < 0) w--; } return w !== 0; };
const segD = (p, a, b) => { const ex = b[0] - a[0], ez = b[1] - a[1], t = Math.max(0, Math.min(1, ((p[0] - a[0]) * ex + (p[1] - a[1]) * ez) / (ex * ex + ez * ez))); return Math.hypot(p[0] - a[0] - t * ex, p[1] - a[1] - t * ez); };
const haus = (P, R) => Math.max(...P.map(p => Math.min(...R.map((a, i) => segD(p, a, R[(i + 1) % R.length])))), ...R.map(p => Math.min(...P.map((a, i) => segD(p, a, P[(i + 1) % P.length])))));
function probe(P) { let xmin = Infinity, xmax = -Infinity, zmin = Infinity, zmax = -Infinity; for (const [x, z] of P) { xmin = Math.min(xmin, x); xmax = Math.max(xmax, x); zmin = Math.min(zmin, z); zmax = Math.max(zmax, z); }
  let wrong = 0, n = 0; const h = 0.0005; for (let x = xmin - 0.003; x <= xmax + 0.003; x += h) for (let z = zmin - 0.003; z <= zmax + 0.003; z += h) { n++; if (insidePoly(P, [x, z]) !== winding(P, [x, z])) wrong++; }
  const c = [(xmin + xmax) / 2, (zmin + zmax) / 2]; let jump = 0, ratio = 0; for (const R of [0.06, 0.08, 0.12, 0.2]) { let prev = null, prevT = null; const N = Math.round(2 * Math.PI * R / 0.00005);
    for (let k = 0; k <= N; k++) { const a = 2 * Math.PI * k / N, t = [c[0] + R * Math.cos(a), c[1] + R * Math.sin(a)], p = clampPoly(P, t); if (prev) { const d = Math.hypot(p[0] - prev[0], p[1] - prev[1]), dt = Math.hypot(t[0] - prevT[0], t[1] - prevT[1]); jump = Math.max(jump, d); ratio = Math.max(ratio, d / dt); } prev = p; prevT = t; } }
  return { insideWrong: wrong, gridN: n, maxProjJumpMm: jump * 1000, maxLipschitz: ratio }; }
for (const h of VARIATION_SET) { const spec = generateSpec(h); for (const f of ["foot_L", "foot_R"]) { const b = spec.bodies.find(x => x.name === f), s = bootSole(b), old = insetPoly(hull2(s.pts), STAND.footInset), nw = usableRegion(s.pts, STAND.footInset);
  // sampling invariance: extra collinear points on every canonical edge, permuted order, 1e-15 m perturbation
  const C = hull2Canonical(s.pts), extra = C.flatMap((p, i) => { const q = C[(i + 1) % C.length]; return [0.25, 0.5, 0.75].map(t => [p[0] + t * (q[0] - p[0]), s.y0, p[1] + t * (q[1] - p[1])]); });
  const pts2 = [...s.pts, ...extra], perm = s.pts.slice().reverse(), pert = s.pts.map(p => p.map(v => v * (1 + 2e-16)));
  const var_ = (fn) => ({ old: haus(insetPoly(hull2(fn), STAND.footInset), old) * 1000, new: haus(usableRegion(fn, STAND.footInset), nw) * 1000 });
  const pieces = JSON.stringify(b.boot || b.shapes); let fp = 0; for (let i = 0; i < pieces.length; i++) fp = (fp * 31 + pieces.charCodeAt(i)) >>> 0;
  const row = { body: h.id, foot: f, oldVertices: old.length, newVertices: nw.length, oldReflex: reflex(old), newReflex: reflex(nw), old: probe(old), new: probe(nw), extraCollinear: var_(pts2), permuted: var_(perm), perturbed1e15: var_(pert), bootPiecesFingerprint: fp.toString(16) };
  out.push(row); console.log(`${h.id.padEnd(13)} ${f}: vertices ${row.oldVertices}→${row.newVertices}, reflex ${row.oldReflex}→${row.newReflex} | insidePoly wrong on grid ${row.old.insideWrong}→${row.new.insideWrong} of ${row.new.gridN} | max projection jump ${row.old.maxProjJumpMm.toFixed(3)}→${row.new.maxProjJumpMm.toFixed(3)} mm (Lipschitz ${row.old.maxLipschitz.toFixed(2)}→${row.new.maxLipschitz.toFixed(2)}) | region change with extra collinear points ${row.extraCollinear.old.toFixed(3)}/${row.extraCollinear.new.toFixed(6)} mm, permuted ${row.permuted.old.toFixed(3)}/${row.permuted.new.toFixed(6)}, 1e-15 perturbed ${row.perturbed1e15.old.toFixed(3)}/${row.perturbed1e15.new.toFixed(6)} (old/new) | boot pieces ${row.bootPiecesFingerprint}`); } }
const jo = process.argv.find(a => a.startsWith("--json=")); if (jo) fs.writeFileSync(jo.slice(7), JSON.stringify(out, null, 1));
