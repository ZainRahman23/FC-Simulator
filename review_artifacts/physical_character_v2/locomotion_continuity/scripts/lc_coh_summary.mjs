// LC-1 §6.3 / §6.4 summary of the per-frame lead_drift runs (frozen coherence set: RC-4 h / tilt, CG-4 vs the simulation's segments, CG-2, P-12, NM-2 slip;
// drift_summarise.mjs rows): per record / speed — the coherent interval of a promoted unobstructed runner, coherent-through-horizon count, first failures,
// and PR-2 v2 (the PI-1 reading: physical joint displacement over the first frame vs the presentation's over the same frame, <= 3 mm).
// usage: node lc_coh_summary.mjs <rows.json> <out.json>
import fs from "fs";
const [ROWS, OUT] = process.argv.slice(2), rows = JSON.parse(fs.readFileSync(ROWS)), q = (a, p) => { const s = a.filter(x => x != null).sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(p * (s.length - 1) + 0.5))] : null; };
const by = {}; for (const r of rows) (by[r.cs] = by[r.cs] || []).push(r);
const out = {}; for (const [cs, g] of Object.entries(by)) { const tc = g.map(r => (r.cohThrough ? r.dur : r.tCoh)), through = g.filter(r => r.cohThrough).length, ff = {}; for (const r of g) for (const k of (r.firstFail || ["(none)"])) ff[k] = (ff[k] || 0) + 1;
  const pr2 = g.map(r => r.pr2 ? r.pr2.pi1Mm : null).filter(x => x != null), pr2pass = pr2.filter(x => x <= 3).length;
  out[cs] = { runs: g.length, coherentTicks: { p50: q(tc, 0.5), p90: q(tc, 0.9), max: q(tc, 1) }, throughHorizon: through, firstFail: ff, PR2v2: { p50: q(pr2, 0.5), min: q(pr2, 0), max: q(pr2, 1), pass: pr2pass, of: pr2.length }, Bmean: q(g.map(r => r.Bmean), 0.5), Bsat: q(g.map(r => r.Bsat), 0.5) };
  console.log(cs.padEnd(18), "runs", g.length, "| coherent ticks p50/p90/max", out[cs].coherentTicks.p50, out[cs].coherentTicks.p90, out[cs].coherentTicks.max, "| through horizon", through, "| first fail", JSON.stringify(ff), "| PR-2 v2 p50/min/max", out[cs].PR2v2.p50, out[cs].PR2v2.min, out[cs].PR2v2.max, "pass", pr2pass + "/" + pr2.length); }
fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
