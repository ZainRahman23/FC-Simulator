// POST-HOC (labelled): per body-pair cross-contact timeline (first / last step with impulse ≥ 1e-3 N·s, total impulse) and runner foot-turf impulse per
// window, for DX run 1 N2 and the CF1 variant N2. Read-only over the recorded runs. usage: node pvp1a_contact_timeline.mjs <out.json>
import fs from "fs"; import path from "path"; import zlib from "zlib"; import { fileURLToPath } from "url";
const RA = fileURLToPath(new URL("..", import.meta.url)), L = (v) => Math.hypot(...v), nm = (x) => x.join("."), h = 1 / 240, wins = [[1, 14], [15, 36], [37, 131], [132, 170], [171, 260]];
const out = { tool: "pvp1a_contact_timeline.mjs", label: "POST-HOC — descriptive; not a frozen criterion", stepS: h, runs: {} };
for (const [k, f] of [["DX_run1_N2", "evidence/dx_run1/records/N2.json.gz"], ["CF1_N2", "evidence/diag_cf1/N2.json.gz"]]) {
  const N = JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(RA, f)))), pairs = {};
  for (const r of N.recs) for (const c of r.contacts.filter(c => c.kind === "cross")) { const key = nm(c.a) + "↔" + nm(c.b), j = L(c.J2); if (j < 1e-3) continue; const p = pairs[key] ??= { first: r.n, last: r.n, J: 0 }; p.last = r.n; p.J += j; }
  const windows = wins.map(([a, b]) => { const rs = N.recs.filter(r => r.n >= a && r.n <= b); return { steps: [a, b], runnerFootTurfNs: { L: +rs.reduce((s, r) => s + r.chars.runner.feet.L, 0).toFixed(2), R: +rs.reduce((s, r) => s + r.chars.runner.feet.R, 0).toFixed(2) } }; });
  out.runs[k] = { pairs: Object.fromEntries(Object.entries(pairs).sort((a, b) => a[1].first - b[1].first).map(([q, p]) => [q, { first: p.first, firstMsAfterActivation: +(p.first * h * 1000).toFixed(1), last: p.last, J: +p.J.toFixed(2) }])), windows };
  console.log(k); for (const [q, p] of Object.entries(out.runs[k].pairs)) console.log("  ", q.padEnd(40), p.first, "(" + p.firstMsAfterActivation + " ms) –", p.last, "ΣJ", p.J); }
fs.writeFileSync(process.argv[2], JSON.stringify(out, null, 1));
