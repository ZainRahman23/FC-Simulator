// CXA-1 collision-exclusion audit of a committed two-character record (read-only). For every recorded state (entry + each physics step) and every
// runner-shape × tackler-shape pair: exact signed separation / penetration (cxa1_geom), the separating normal, witness points, relative normal velocity
// at the contact, and the Jolt contact manifold that the NEXT step built from exactly this configuration (the plant decodes each step's contact cache
// with the pre-step transforms, so rec[n+1]'s manifolds were detected — and their depths reconstructed — at the state recorded as step n): normal and
// friction impulses, Jolt's own depth, point count, speculative (separated) contacts. Per pair: overlap episodes, maximum depth, consecutive overlapping
// steps, resolving vs increasing depth while the solver pushes, side crossing (separating normal before vs after an episode), uncached overlaps.
// usage: node cxa1_audit.mjs --run <record.json.gz> --fixture <fixture.json> --label <id> [--order RT|TR] [--window <last trusted step>] --out <out.json>
import fs from "fs"; import zlib from "zlib";
const GM = await import(new URL("./cxa1_geom.mjs", import.meta.url).href), { V, Q, CL } = GM;
const PL = await import(new URL("../../pvp1/scripts/pvp1a_lib.mjs", import.meta.url).href);
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
const run = JSON.parse(zlib.gunzipSync(fs.readFileSync(arg("run")))), FIX = JSON.parse(fs.readFileSync(arg("fixture"))), order = arg("order", "RT"), label = arg("label", "run"), win = +arg("window", "60");
const sR = PL.SPEC_R(), sT = PL.SPEC_T(), nR = sR.bodies.length, NEAR = 0.05, KEEP = 0.03, h = 1 / 240;
const SLOP = sR.contact.slop, SPEC_D = sR.contact.speculative, INTEG = PL.PV.integrity.crossPenMm / 1000;
const subIdx = (spec, name, raw) => { const n = spec.bodies.find(b => b.name === name).shapes.length, bits = n > 1 ? Math.ceil(Math.log2(n)) : 0; return bits ? (raw & ((1 << bits) - 1)) : 0; };
const split = (S) => (order === "TR" ? { R: S.slice(nR), T: S.slice(0, nR) } : { R: S.slice(0, nR), T: S.slice(nR) });
const comOf = (spec, i, p) => V.add(p.pos, Q.rot(p.rot, spec.bodies[i].comLocal));
const entryS = () => { const mk = (spec, w) => w.poses.map((p, i) => ({ pos: p.pos, rot: p.rot, com: comOf(spec, i, p), v: w.vel[i].v, w: w.vel[i].w })); return { R: mk(sR, FIX.write.runner), T: mk(sT, FIX.write.tackler) }; };
// manifolds of record r (cross pairs), keyed "rBody#k|tBody#k" (and per body pair)
function manifolds(r) { const sub = {}, body = {}; if (!r) return { sub, body };
  for (const c of r.contacts) { if (c.kind !== "cross") continue; const rIsA = c.a[0] === "runner", rn = rIsA ? c.a[1] : c.b[1], tn = rIsA ? c.b[1] : c.a[1], rr = rIsA ? c.sub1 : c.sub2, tr = rIsA ? c.sub2 : c.sub1;
    const key = `${rn}#${subIdx(sR, rn, rr)}|${tn}#${subIdx(sT, tn, tr)}`, bk = `${rn}|${tn}`, depthJ = Math.max(...c.points.map(p => p.depth)), lam = c.points.reduce((s, p) => s + p.lam, 0), Jf = c.friction ? V.len(c.friction.J) : 0;
    for (const [m, k] of [[sub, key], [body, bk]]) { const e = m[k] || (m[k] = { J: 0, lam: 0, Jf: 0, depthJ: -Infinity, npts: 0, nMan: 0 }); e.J += V.len(c.J2); e.lam += lam; e.Jf += Jf; e.depthJ = Math.max(e.depthJ, depthJ); e.npts += c.points.length; e.nMan++; } }
  return { sub, body }; }
const steps = [], pairs = {}, valid = [];
const N = run.recs.length;
for (let n = 0; n <= N; n++) { const S = n === 0 ? entryS() : split(run.recs[n - 1].S), WR = GM.worldShapes(sR, S.R), WT = GM.worldShapes(sT, S.T), M = manifolds(run.recs[n]);   // rec[n] = step n + 1 (0-based array)
  const rows = [];
  for (const a of WR) for (const b of WT) { const gap = V.dist(a.bc, b.bc) - a.br - b.br; if (gap > NEAR) continue;
    const g = GM.signedDistance(a.sup, b.sup), p = V.sc(V.add(g.pA, g.pB), 0.5), vRel = V.sub(GM.velAt(S.T[b.b], p), GM.velAt(S.R[a.b], p)), vn = V.dot(vRel, g.n), vt = V.len(V.sub(vRel, V.sc(g.n, vn)));
    const key = `${a.name}#${a.k}|${b.name}#${b.k}`, bk = `${a.name}|${b.name}`, ms = M.sub[key] || null, mb = M.body[bk] || null;
    const row = { key, d: g.d, n: g.n, p, vn, vt, rMin: Math.min(a.rMin, b.rMin), types: a.type + "/" + b.type, man: ms ? { J: ms.J, lam: ms.lam, Jf: ms.Jf, depthJ: ms.depthJ, npts: ms.npts } : null, bodyCached: !!mb };
    if (ms && ms.depthJ > 5e-4 && g.d < 0) valid.push({ n, key, geom: -g.d, jolt: ms.depthJ, types: row.types });
    const P = pairs[key] || (pairs[key] = { key, types: row.types, rMin: row.rMin, minD: Infinity, minDStep: null, steps: [], episodes: [], cur: null, lastSepN: null, lastSepNormal: null, Jtot: 0, uncachedOverlapSteps: 0 });
    P.steps.push([n, +g.d.toFixed(6), ms ? +ms.J.toFixed(6) : 0]); if (ms) P.Jtot += ms.J; if (g.d < P.minD) { P.minD = g.d; P.minDStep = n; }
    if (g.d < 0) { if (!mb) P.uncachedOverlapSteps++; if (!P.cur) P.cur = { from: n, to: n, maxDepth: 0, maxStep: n, normalBefore: P.lastSepNormal, normalFirst: g.n, depths: [], incWhilePushed: 0, prevDepth: null, flips: 0, prevN: g.n };
      const E = P.cur; E.to = n; E.depths.push(-g.d); if (-g.d > E.maxDepth) { E.maxDepth = -g.d; E.maxStep = n; } if (E.prevDepth != null && -g.d > E.prevDepth + 1e-5 && ms && ms.lam > 0) E.incWhilePushed++; if (V.dot(E.prevN, g.n) < 0) E.flips++; E.prevDepth = -g.d; E.prevN = g.n; }
    else { if (P.cur) { const E = P.cur; E.normalAfter = g.n; E.crossed = E.normalBefore ? V.dot(E.normalBefore, g.n) < 0 : null; E.sideTurnDeg = E.normalBefore ? Math.acos(Math.max(-1, Math.min(1, V.dot(E.normalBefore, g.n)))) * 180 / Math.PI : null; P.episodes.push(E); P.cur = null; } P.lastSepNormal = g.n; }
    if (g.d < KEEP) rows.push(row); }
  rows.sort((x, y) => x.d - y.d); const deepest = rows[0] || null;
  steps.push({ n, maxPen: deepest && deepest.d < 0 ? -deepest.d : 0, deepest: deepest ? { key: deepest.key, d: deepest.d, vn: deepest.vn, man: deepest.man } : null, nOverlap: rows.filter(r => r.d < 0).length, nOverSlop: rows.filter(r => r.d < -SLOP).length, nOverInteg: rows.filter(r => r.d < -INTEG).length,
    uncached: rows.filter(r => r.d < -1e-3 && !r.bodyCached).map(r => r.key), speculativeCached: rows.filter(r => r.man && r.man.depthJ < 0).length, rows: rows.map(r => ({ ...r, n: r.n.map(x => +x.toFixed(4)), p: r.p.map(x => +x.toFixed(5)), d: +r.d.toFixed(6), vn: +r.vn.toFixed(4), vt: +r.vt.toFixed(4) })) }); }
for (const P of Object.values(pairs)) if (P.cur) { P.cur.open = true; P.episodes.push(P.cur); P.cur = null; }
// summaries
const ep = (E) => ({ from: E.from, to: E.to, steps: E.to - E.from + 1, ms: +((E.to - E.from + 1) * h * 1000).toFixed(1), maxDepthMm: +(E.maxDepth * 1000).toFixed(3), maxStep: E.maxStep, overSlop: E.maxDepth > SLOP, overInteg: E.maxDepth > INTEG,
  depthOverRmin: null, incWhilePushed: E.incWhilePushed, normalFlipsWithin: E.flips, crossed: E.crossed ?? null, sideTurnDeg: E.sideTurnDeg != null ? +E.sideTurnDeg.toFixed(1) : null, open: !!E.open,
  trend: E.depths.length > 2 ? (E.depths[E.depths.length - 1] < E.maxDepth * 0.5 ? "resolved" : E.depths[E.depths.length - 1] >= E.maxDepth - 1e-6 && E.open ? "still at max when the record ends" : "resolving") : "brief" });
const pairSum = Object.values(pairs).filter(P => P.minD < KEEP).map(P => ({ key: P.key, types: P.types, rMinMm: +(P.rMin * 1000).toFixed(1), minDmm: +(P.minD * 1000).toFixed(3), minDStep: P.minDStep, Jtot: +P.Jtot.toFixed(4), uncachedOverlapSteps: P.uncachedOverlapSteps,
  episodes: P.episodes.map(E => ({ ...ep(E), depthOverRmin: +(E.maxDepth / P.rMin).toFixed(3) })), inWindow: P.episodes.filter(E => E.from <= win).map(E => ({ ...ep(E), depthOverRmin: +(E.maxDepth / P.rMin).toFixed(3) })) })).sort((a, b) => a.minDmm - b.minDmm);
const inW = steps.filter(s => s.n >= 1 && s.n <= win), all = steps.filter(s => s.n >= 1);
const stat = (S) => ({ maxPenMm: +(Math.max(0, ...S.map(s => s.maxPen)) * 1000).toFixed(3), at: (S.reduce((a, s) => (s.maxPen > a.maxPen ? s : a), { maxPen: -1 }) || {}).n, stepsWithOverlap: S.filter(s => s.nOverlap).length, stepsOverSlop: S.filter(s => s.nOverSlop).length, stepsOverInteg: S.filter(s => s.nOverInteg).length,
  uncachedOverlapSteps: S.filter(s => s.uncached.length).length, uncachedPairs: [...new Set(S.flatMap(s => s.uncached))], speculativeContacts: S.reduce((a, s) => a + s.speculativeCached, 0) });
const vd = valid.map(v => v.geom - v.jolt);
const out = { tool: "cxa1_audit.mjs", label, run: arg("run"), order, finalHash: run.finalHash, window: win, settings: { penetrationSlopM: SLOP, speculativeM: SPEC_D, integrityCrossPenM: INTEG, motionQuality: "discrete (G1_WORLD ccd 'discrete')", nearM: NEAR, keptBelowM: KEEP },
  window_stats: stat(inW), all_stats: stat(all), validation: { n: valid.length, meanGeomMinusJoltMm: vd.length ? +(vd.reduce((a, b) => a + b, 0) / vd.length * 1000).toFixed(3) : null, maxAbsMm: vd.length ? +(Math.max(...vd.map(Math.abs)) * 1000).toFixed(3) : null, rows: valid.slice(0, 400) },
  pairs: pairSum, steps };
fs.writeFileSync(arg("out"), zlib.gzipSync(JSON.stringify(out)));
console.log(`${label}: window 1–${win}: ${JSON.stringify(out.window_stats)}\n  all: ${JSON.stringify(out.all_stats)}\n  geometry vs Jolt depth (${valid.length} penetrating manifolds): mean ${out.validation.meanGeomMinusJoltMm} mm, max |Δ| ${out.validation.maxAbsMm} mm`);
for (const P of pairSum.slice(0, 12)) console.log(`  ${P.key.padEnd(30)} ${P.types.padEnd(16)} min ${P.minDmm} mm @${P.minDStep} rMin ${P.rMinMm} J ${P.Jtot} uncached ${P.uncachedOverlapSteps} | ${P.episodes.map(E => `[${E.from}-${E.to} max ${E.maxDepthMm}mm@${E.maxStep} ${E.trend} cross ${E.crossed} flips ${E.normalFlipsWithin} inc ${E.incWhilePushed}]`).join(" ")}`);
