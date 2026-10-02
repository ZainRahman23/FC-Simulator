import { runB, summarize } from "./clB.mjs";
const res = []; const t0 = Date.now();
for (const f0f of [0.0, 0.05, 0.10]) for (const cvf of [0.35, 0.45, 0.55]) for (const cdf of [0, 0.3]) for (const [f0l, cvl] of [[0.08, 0.33], [0.10, 0.25], [0.06, 0.4]]) {
  const g = { f0: [f0f, f0l], cd: [cdf, 0.3], cv: [cvf, cvl] }; const s = summarize(runB({ gains: g, n: 16, T: 0.40 }), 16); res.push({ g, ...s }); }
res.sort((a, b) => b.up - a.up || b.tF - a.tF);
for (const r of res.slice(0, 10)) console.log(`up ${r.up}/16 fall ${Number.isFinite(r.tF) ? r.tF.toFixed(2) : "none"} gains f0 ${r.g.f0} cd ${r.g.cd} cv ${r.g.cv}`);
console.log("distribution:", JSON.stringify(res.reduce((a, r) => (a[r.up] = (a[r.up] || 0) + 1, a), {})), "·", ((Date.now() - t0) / 1000).toFixed(0), "s");
