// DS event distribution over a set of open-loop characterisation runs (ref A one-at-a-time inputs)
import { walk, f3 } from "./lib.mjs"; import { dsAnalyse } from "./dsan.mjs";
const COND = { df: 0.237, dl: 0.368, T: 0.45 }, rows = [];
const U = []; for (const df of [0.22, 0.28, 0.34, 0.40, 0.46]) U.push({ df }); for (const dl of [0.18, 0.22, 0.30, 0.34]) U.push({ dl }); for (const T of [0.37, 0.41, 0.49, 0.53]) U.push({ T });
for (const u of U) { const r = walk({ n: 4, seconds: 3.9, keep: true, walk: { ...(JSON.parse(process.argv[2] || "{}")), char: { 0: COND, 1: { df: 0.34, dl: 0.26, T: 0.45, ...u } } } }); for (const e of dsAnalyse(r)) if (e.end != null) rows.push({ u, ...e }); }
const q = (a, p) => { const s = a.filter(x => x != null).sort((x, y) => x - y); return s.length ? s[Math.floor(p * (s.length - 1))] : null; };
for (const k of ["flat", "land35", "trail30", "trail0"]) { const a = rows.map(e => e.first[k]); console.log(k.padEnd(8), "p10/50/90", f3(q(a, .1)), f3(q(a, .5)), f3(q(a, .9)), "missing", a.filter(x => x == null).length); }
const a = rows.map(e => e.end); console.log("end     p10/50/90", f3(q(a, .1)), f3(q(a, .5)), f3(q(a, .9)), "n", rows.length);
const lag = rows.map(e => e.end - (e.first.trail0 ?? e.end)); console.log("liftoff − trail0 p10/50/90", f3(q(lag, .1)), f3(q(lag, .5)), f3(q(lag, .9)));
// correlation of end with each event
const corr = (x, y) => { const n = x.length, mx = x.reduce((s, v) => s + v, 0) / n, my = y.reduce((s, v) => s + v, 0) / n; let a = 0, b = 0, c = 0; for (let i = 0; i < n; i++) { a += (x[i] - mx) * (y[i] - my); b += (x[i] - mx) ** 2; c += (y[i] - my) ** 2; } return a / Math.sqrt(b * c); };
for (const k of ["flat", "land35", "trail30", "trail0"]) { const ok = rows.filter(e => e.first[k] != null); console.log("corr(end,", k, ")", f3(corr(ok.map(e => e.end), ok.map(e => e.first[k])), 2)); }
for (const e of rows.filter(e => e.end > 0.3)) console.log("  long DS", JSON.stringify(e.u), "k", e.k, e.tdContact, "end", f3(e.end), JSON.stringify(Object.fromEntries(Object.entries(e.first).map(([k, v]) => [k, +v.toFixed(3)]))));
