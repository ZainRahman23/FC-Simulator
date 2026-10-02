import { runB, summarize } from "./clB.mjs";
const res = []; const t0 = Date.now();
for (const cvl of [0.2, 0.33, 0.45]) for (const cdl of [-0.5, 0, 0.5]) for (const f0l of [0.08, 0.12, 0.16]) for (const cvf of [0.15, 0.3]) {
  const g = { f0: [0.10, f0l], cd: [0, cdl], cv: [cvf, cvl] }; const s = summarize(runB({ gains: g, n: 14 }), 14); res.push({ g, ...s }); }
res.sort((a, b) => b.up - a.up || b.tF - a.tF);
for (const r of res.slice(0, 12)) console.log(`up ${r.up}/14 fall ${r.tF.toFixed(2)} gains f0 ${r.g.f0} cd ${r.g.cd} cv ${r.g.cv}`);
console.log("distribution of upright steps:", JSON.stringify(res.reduce((a, r) => (a[r.up] = (a[r.up] || 0) + 1, a), {})), "·", ((Date.now() - t0) / 1000).toFixed(0), "s");
