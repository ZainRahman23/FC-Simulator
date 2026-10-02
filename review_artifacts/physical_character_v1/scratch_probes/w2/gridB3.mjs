// Controller B on the walker's inner loop v5, the measured first step, a grid over its per-axis gains (fixed T)
import { walk, fallT } from "./lib.mjs";
const res = [], t0 = Date.now(), n = 30, G = JSON.parse(process.argv[2] || "{}");
for (const T of G.T || [0.36, 0.40]) for (const [f0f, cvf] of G.fw || [[0.0, 0.33], [0.05, 0.33], [0.0, 0.45], [0.05, 0.45], [0.1, 0.25]]) for (const cdf of G.cdf || [0, 0.3]) for (const [f0l, cdl, cvl] of G.lat || [[0.08, 0, 0.33], [0.10, 0.3, 0.25], [0.06, 0.3, 0.33], [0.08, 0.5, 0.2]]) {
  const ctrl = { kind: "B", gains: { f0: [f0f, f0l], cd: [cdf, cdl], cv: [cvf, cvl] }, T, lo: [0.05, 0.17], hi: [0.32, 0.40], inSwing: 0.4, commitMargin: 0.16 };
  const r = walk({ n, seconds: 1.6 + n * 0.58, walk: { dsLead: true, dsFlat: false, dsExtEnd: 0.96, ...(G.inner || {}), char: { 0: G.first0 || { df: 0.24, dl: 0.351, T: 0.448 } }, ctrl }, human: { lateBlend: true, clrActual: true, clrActualUntil: [0.5, 0.2], ...(G.human || {}) }, loco: G.loco }); const tF = fallT(r);
  const done = r.LOCO.planner.exec.done.filter(d => d.kind === "rhythmic" && d.td && d.td.t < tF), dist = done.length > 1 ? Math.hypot(done[done.length - 1].td.center[0] - done[0].td.center[0], done[done.length - 1].td.center[1] - done[0].td.center[1]) : 0;
  res.push({ T, f0f, cvf, cdf, f0l, cdl, cvl, up: done.length, tF: Number.isFinite(tF) ? +tF.toFixed(2) : null, v: done.length > 2 ? +(dist / (done[done.length - 1].td.t - done[0].td.t)).toFixed(2) : null }); }
res.sort((a, b) => b.up - a.up); for (const r of res.slice(0, 8)) console.log(JSON.stringify(r));
console.log("dist", JSON.stringify(res.reduce((a, r) => (a[r.up] = (a[r.up] || 0) + 1, a), {})), res.length, "runs", ((Date.now() - t0) / 1000).toFixed(0), "s");
