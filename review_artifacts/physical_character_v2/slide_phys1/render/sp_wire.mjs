// SP2A presentation helper: wireframes of the tackler's ACTUAL collision shapes (the V2 SPEC_T body shapes, posed by the recorded body states)
// and the physical joint skeleton — diagnostic overlay only (nothing is simulated or altered). Polylines are returned in the local frame.
// shapes: box (he, rounded cr ignored), sphere (r), capsule (r, half, along local y), tapered (rTop at +y, rBot at −y, half), hull (points: drawn
// as rings of equal height around the hull centroid + vertical links).
const L = await import(new URL("../scripts/sp_lib.mjs", import.meta.url).href), { V, Q, B } = L;
const ring = (c, ax, r, n = 14) => { const a = V.norm(ax), t = Math.abs(a[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0], u = V.norm(V.cross(a, t)), w = V.cross(a, u), out = [];
  for (let k = 0; k <= n; k++) { const th = 2 * Math.PI * k / n; out.push(V.add(c, V.add(V.sc(u, r * Math.cos(th)), V.sc(w, r * Math.sin(th))))); } return out; };
function shapeLines(s, pos, rot) { const R = Q.norm(Q.mul(rot, s.rot || [0, 0, 0, 1])), P = V.add(pos, Q.rot(rot, s.pos || [0, 0, 0])), W = (p) => V.add(P, Q.rot(R, p)), ax = Q.rot(R, [0, 1, 0]), out = [];
  if (s.type === "sphere") { for (const a of [[1, 0, 0], [0, 1, 0], [0, 0, 1]]) out.push(ring(P, Q.rot(R, a), s.r, 16)); }
  else if (s.type === "capsule" || s.type === "tapered") { const rT = s.type === "capsule" ? s.r : s.rTop, rB = s.type === "capsule" ? s.r : s.rBot, h = s.half, top = W([0, h, 0]), bot = W([0, -h, 0]);
    out.push(ring(top, ax, rT), ring(bot, ax, rB), ring(V.sc(V.add(top, bot), 0.5), ax, (rT + rB) / 2));
    const t0 = Math.abs(ax[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0], u = V.norm(V.cross(ax, t0)), w = V.cross(ax, u);
    for (const d of [u, w, V.sc(u, -1), V.sc(w, -1)]) out.push([V.add(top, V.sc(d, rT)), V.add(bot, V.sc(d, rB))]);
    if (s.type === "capsule") for (const d of [u, w]) { const arc = (c, sg, r) => { const o = []; for (let k = 0; k <= 8; k++) { const th = Math.PI * k / 8; o.push(V.add(c, V.add(V.sc(d, r * Math.cos(th)), V.sc(ax, sg * r * Math.sin(th))))); } return o; }; out.push(arc(top, 1, rT), arc(bot, -1, rB)); } }
  else if (s.type === "box") { const [a, b, c] = s.he, C = []; for (const x of [-a, a]) for (const y of [-b, b]) for (const z of [-c, c]) C.push(W([x, y, z]));
    for (const [i, j] of [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]]) out.push([C[i], C[j]]); }
  else if (s.type === "hull") { const pts = s.points, cx = pts.reduce((m, p) => V.add(m, p), [0, 0, 0]).map(x => x / pts.length), lv = new Map();
    for (const p of pts) { const k = Math.round(p[1] / 0.008); (lv.get(k) || lv.set(k, []).get(k)).push(p); }
    const rings = [...lv.entries()].sort((a, b) => a[0] - b[0]).map(([, ps]) => ps.slice().sort((p, q) => Math.atan2(p[2] - cx[2], p[0] - cx[0]) - Math.atan2(q[2] - cx[2], q[0] - cx[0])));
    const keep = rings.filter(rg => rg.length >= 3), sel = keep.length > 3 ? [keep[0], keep[Math.floor(keep.length / 2)], keep[keep.length - 1]] : keep;   // sole, middle and top rings
    for (const rg of sel) out.push([...rg, rg[0]].map(W));
    for (let i = 0; i + 1 < sel.length; i++) for (const p of sel[i].filter((_, k) => k % 2 === 0)) { let best = null, bd = 1e9; for (const q of sel[i + 1]) { const d = Math.hypot(p[0] - q[0], p[2] - q[2]); if (d < bd) { bd = d; best = q; } } if (best) out.push([W(p), W(best)]); } }
  return out; }
// polylines (local frame) of every collision shape of the 14 tackler bodies in state S, and the joint skeleton segments
export function wireOf(S) { const lines = []; for (let i = 0; i < B.length; i++) for (const s of B[i].shapes || []) for (const pl of shapeLines(s, S[i].pos, S[i].rot)) lines.push(pl); return lines; }
export function skelOf(S) { const K = L.skel(S); return L.SEGS.filter(([a, b]) => K[a] && K[b]).map(([a, b]) => [K[a], K[b]]); }
// SP2F (presentation): exported for body-filtered wireframes (sp_clip --wireBodies)
export const Lref = L; export const shapeLinesOf = (s, pos, rot) => shapeLines(s, pos, rot);
