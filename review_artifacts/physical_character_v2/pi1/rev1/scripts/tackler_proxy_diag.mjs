// Item 4 diagnosis: does the slide leg's kinematic motion after promotion (extension end = the 17.9 mm step; the far-rule sweep) matter for the
// contact a RIGID stand-in tackler (PI-1 §7: one body, shape frozen at k_p, translating with the simulation's root) would make? Read-only.
// Compares, per contact candidate, the gameplay contact (the simulation's own primitives) with the same contact test using the rigid stand-in's
// primitives, against the simulation's own runner segments (both from the AIR record).
import fs from "fs"; import zlib from "zlib";
const [dir, out, ...cases] = process.argv.slice(2), load = (c) => JSON.parse(zlib.gunzipSync(fs.readFileSync(`${dir}/${c}_OFF.json.gz`)));
const sub = (a, b) => a.map((x, i) => x - b[i]), add = (a, b) => a.map((x, i) => x + b[i]), len = (a) => Math.hypot(...a);
function segseg(p1, q1, p2, q2) { const d1 = sub(q1, p1), d2 = sub(q2, p2), r = sub(p1, p2), dot = (u, v) => u[0] * v[0] + u[1] * v[1] + u[2] * v[2], a = dot(d1, d1), e = dot(d2, d2), f = dot(d2, r), cl = (x) => Math.max(0, Math.min(1, x));
  let s, t; if (a <= 1e-12 && e <= 1e-12) { s = t = 0; } else if (a <= 1e-12) { s = 0; t = cl(f / e); } else { const c = dot(d1, r); if (e <= 1e-12) { t = 0; s = cl(-c / a); } else { const b = dot(d1, d2), den = a * e - b * b; s = den > 1e-12 ? cl((b * f - c * e) / den) : 0; t = (b * s + f) / e; if (t < 0) { t = 0; s = cl(-c / a); } else if (t > 1) { t = 1; s = cl((b - c) / a); } } }
  const P = add(p1, d1.map(x => x * s)), Qp = add(p2, d2.map(x => x * t)); return { d: len(sub(P, Qp)), s, t, P, Q: Qp }; }
const rR = (g, t) => (g.ra != null ? g.ra + (g.rb - g.ra) * Math.max(0, Math.min(1, t)) : g.r);
const res = {};
for (const cs of cases) { const R = load(cs), ev = R.events.filter(e => e.kind === "PLAYER_CONTACT"); if (!ev.length) continue;
  const RANK = { NEGLIGIBLE: 0, CORRECTION: 1, STUMBLE: 2, FALL: 3 }, cl = (e) => e.react || e.cls, fin = ev.reduce((m, e) => (RANK[cl(e)] > RANK[m] ? cl(e) : m), "NEGLIGIBLE"), dec = ev.find(e => cl(e) === fin);
  const kp = R.pred.findIndex(x => x != null && x <= 0.25), root = (k) => [R.rows[k][14], R.rows[k][15]];   // tackler = ctx[1]: x, y at 8 + 6
  const at = (k, n) => R.prims[k][n - 1], kpPr = at(kp, 4), rootKp = root(kp);
  // rigid stand-in primitives at sample (k, n): the k_p shapes translated with the simulation's root (the root position interpolated within the tick)
  const rootAt = (k, n) => { const r0 = root(k - 1), r1 = root(k), w = n / 4; return [r0[0] + (r1[0] - r0[0]) * w, r0[1] + (r1[1] - r0[1]) * w]; };
  const proxy = (k, n) => kpPr.map(p => { const d = sub(rootAt(k, n), rootKp); return { ...p, a: [p.a[0] + d[0], p.a[1] + d[1], p.a[2]], b: [p.b[0] + d[0], p.b[1] + d[1], p.b[2]] }; });
  const first = (prFn) => { for (let k = kp; k < Math.min(R.prims.length, dec.tick + 12); k++) for (let n = 1; n <= 4; n++) { const prs = prFn(k, n), segs = R.simBody[k][n - 1].segs; let best = null;
      for (const pr of prs) for (const g of segs) { const c = segseg(pr.a, pr.b, g.a, g.b), pen = pr.r + rR(g, c.t) - c.d; if (pen > 0 && (!best || pen > best.pen)) best = { pen, prim: pr.prim, seg: g.name, t: k + n / 4, point: c.Q }; }
      if (best) return best; } return null; };
  const g0 = first((k, n) => at(k, n)), g1 = first(proxy);
  const T = dec.tick, sb = dec.sub, legA = at(T - 1, sb).find(p => p.prim === dec.prim), legP = proxy(T - 1, sb).find(p => p.prim === dec.prim);
  // the 17.9 mm quantity: max change of per-sub-step displacement of any primitive endpoint over [k_p, contact + 2 ticks] (the v1.2 gate's metric), and where it is
  const seq = []; for (let k = Math.max(1, kp); k <= T + 1; k++) for (let n = 1; n <= 4; n++) seq.push({ t: k + n / 4, prs: at(k, n) }); let jump = { mm: 0 };
  for (let q = 2; q < seq.length; q++) for (const p of seq[q].prs) { const p1 = seq[q - 1].prs.find(x => x.prim === p.prim), p0 = seq[q - 2].prs.find(x => x.prim === p.prim); if (!p1 || !p0) continue;
    for (const e of ["a", "b"]) { const j = len(sub(sub(p[e], p1[e]), sub(p1[e], p0[e]))) * 1000; if (j > jump.mm) jump = { mm: +j.toFixed(1), prim: p.prim, end: e, t: seq[q].t }; } }
  res[cs] = { finalClass: fin, kp, decisive: { t: T - 1 + sb / 4, prim: dec.prim, seg: dec.seg }, jump,
    gameplayFirst: g0, rigidStandInFirst: g1, legEndpointDiffAtContactMm: legA && legP ? { a: +(len(sub(legA.a, legP.a)) * 1000).toFixed(0), b: +(len(sub(legA.b, legP.b)) * 1000).toFixed(0) } : null,
    sameSegment: !!(g0 && g1 && g0.seg === g1.seg && g0.prim === g1.prim), dTicks: g0 && g1 ? +(g1.t - g0.t).toFixed(2) : null };
  console.log(cs.padEnd(18), fin.padEnd(10), "kp", kp, "contact", res[cs].decisive.t, "| jump", jump.mm, "mm", jump.prim + "." + jump.end, "@", jump.t, "| gameplay first", g0 ? `${g0.prim}→${g0.seg} t${g0.t} pen ${(g0.pen * 1000).toFixed(0)}` : "-", "| rigid stand-in first", g1 ? `${g1.prim}→${g1.seg} t${g1.t} pen ${(g1.pen * 1000).toFixed(0)}` : "none", "| LEG endpoints Δ at contact", JSON.stringify(res[cs].legEndpointDiffAtContactMm)); }
fs.writeFileSync(out, JSON.stringify(res, null, 1));
