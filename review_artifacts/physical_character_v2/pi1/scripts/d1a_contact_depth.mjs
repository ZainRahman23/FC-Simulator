// exact capsule-vs-posed-body penetration (diagnostic): depth = max over the capsule axis (400 samples) of r − signedDist(axis point, hull),
// signedDist outside = exact Euclidean distance (GJK point vs piece), inside = −(distance to the nearest face plane); per primitive, per D-1 body
import fs from "fs"; import path from "path";
const W = process.cwd(), lib = await import(new URL("./d1a_lib.mjs", import.meta.url).href);
const { load, mapPose, slerp, V, Q, B, bi, gjk, supportOf } = lib;
const ptSup = (p) => () => p;
function hullPlanes(pts) { const P = [], n = pts.length; for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) for (let k = j + 1; k < n; k++) { let nr = V.cross(V.sub(pts[j], pts[i]), V.sub(pts[k], pts[i])); const l = V.len(nr); if (l < 1e-12) continue; nr = V.sc(nr, 1 / l); const d = V.dot(nr, pts[i]);
  let pos = 0, neg = 0; for (const q of pts) { const s = V.dot(nr, q) - d; if (s > 1e-9) pos++; else if (s < -1e-9) neg++; } if (pos === 0) P.push([nr, d]); else if (neg === 0) P.push([V.sc(nr, -1), -d]); } return P; }
function sdPiece(s, st, p) { const pts = s.points.map(q => V.add(st.pos, Q.rot(st.rot, V.add(s.pos, Q.rot(s.rot, q))))), g = gjk(ptSup(p), supportOf(s, st));
  if (!g.overlap && g.d > 1e-9) return g.d; const pl = s._pl || (s._pl = null); const planes = hullPlanes(pts); let m = -Infinity; for (const [nr, d] of planes) m = Math.max(m, V.dot(nr, p) - d); return m; }
const out = {};
for (const cs of ["rx_planted_leg", "rx_free_leg"]) { const R = load(`${cs}_LOCO.json.gz`), maps = R.pres.map(p => mapPose(R.bones, R.bind, p.world)), rows = [];
  for (let k = 50; k <= 62; k++) for (let n = 1; n <= 4; n++) { const t = n / 4, S = maps[k].S.map((s, i) => ({ rot: slerp(maps[k - 1].S[i].rot, s.rot, t), pos: V.lerp(maps[k - 1].S[i].pos, s.pos, t) })), row = { time: k + t };
    for (const w of ["LEG", "BODY"]) { const pa = R.prims[k - 1].find(x => x.prim === w), pb = R.prims[k].find(x => x.prim === w), L = (u, v) => u.map((x, i) => x + (v[i] - x) * t), A2 = L(pa.a, pb.a), B2 = L(pa.b, pb.b), a = [A2[0], A2[2], -A2[1]], b = [B2[0], B2[2], -B2[1]];
      let best = { pen: -Infinity };
      for (const nm of ["foot_L", "shank_L"]) { const i = bi(nm); for (const s of B[i].shapes) { if (s.type !== "hull") continue; for (let u = 0; u <= 400; u++) { const p = V.lerp(a, b, u / 400), pen = pb.r - sdPiece(s, S[i], p); if (pen > best.pen) best = { pen, body: nm, axisPt: p }; } } }
      row[w] = { penMm: +(best.pen * 1000).toFixed(1), body: best.body, contactHeightM: best.axisPt ? +(best.axisPt[1] - pb.r).toFixed(3) : null }; }
    row.footL_soleY = +lib.bodyLowest(B[bi("foot_L")], S[bi("foot_L")]).y.toFixed(4); rows.push(row); }
  out[cs] = rows; console.log("==", cs); for (const r of rows) if ((r.time * 4) % 2 === 0) console.log(r.time.toFixed(2), "LEG pen", r.LEG.penMm, "mm", r.LEG.body, "| BODY pen", r.BODY.penMm, "mm", r.BODY.body, "| footL sole", r.footL_soleY); }
fs.writeFileSync(path.join(W, "review_artifacts/physical_character_v2/pi1/d1a/d1a_contact_depth.json"), JSON.stringify(out, null, 1));
// boot geometry: height of the D-1 left boot's top surface under the slide-leg path at the authoritative contact (LOCO, row 49 → squad 49.5..50)
