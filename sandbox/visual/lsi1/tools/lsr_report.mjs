// lsi1/tools/lsr_report.mjs — a LEFT-STICK dataset (TOUCHLINE_LEFT_STICK_RECORDING_V1) as text, for analysis sessions: every attempt's summary
// row (the lab's SUMMARY TABLE, the same code: lsr_summary.js) and, per label, the descriptive ranges of each diagnostic. DIAGNOSTICS, NOT
// THRESHOLDS — nothing here classifies anything.   node lsr_report.mjs <dataset.json> [more.json …] [--anchor auto|mark|d150|omega|dzexit|release|start] [--json out.json]
import { summarize, labelStats, SUMMARY_COLUMNS, ANCHORS } from "../lsr_summary.js";
import { validateDataset } from "../lsr_schema.js";
import fs from "node:fs";
const args = process.argv.slice(2), ai = args.indexOf("--anchor"), anchor = ai >= 0 ? args[ai + 1] : "auto", ji = args.indexOf("--json"), files = args.filter((x, i) => !x.startsWith("--") && !(ai >= 0 && i === ai + 1) && !(ji >= 0 && i === ji + 1));
const atts = []; for (const f of files) { const v = validateDataset(JSON.parse(fs.readFileSync(f))); if (!v.ok) console.log(`${f}: ${v.errors.join("; ")}`); for (const a of v.attempts) if (!atts.some((x) => x.id === a.id)) atts.push(a); }
const fmt = (v, d) => (v == null || !Number.isFinite(+v) ? "—" : (+v).toFixed(d));
console.log(`${atts.length} attempt(s) from ${files.length} file(s) · anchor: ${ANCHORS[anchor] || anchor}\n`);
const hd = ["#", "label", "src", "mode"].concat(SUMMARY_COLUMNS.map((c) => c[1])), W = [3, 34, 9, 10].concat(SUMMARY_COLUMNS.map((c) => Math.max(7, c[1].length + 1)));
console.log(hd.map((h, i) => (i < 4 ? String(h).padEnd(W[i]) : String(h).padStart(W[i]))).join(" "));
const S = atts.map((a) => summarize(a, anchor));
S.forEach((s, i) => { const a = atts[i]; console.log([String(i + 1).padEnd(W[0]), a.label.slice(0, 33).padEnd(W[1]), String(a.input.source).slice(0, 8).padEnd(W[2]), a.capture.mode.padEnd(W[3])]
  .concat(SUMMARY_COLUMNS.map(([, , , g, d], j) => String(d == null ? g(s) ?? "—" : fmt(g(s), d)).padStart(W[4 + j]))).join(" ") + (a.flags && a.flags.explicitRequests ? "  [explicit request]" : "") + (a.owner && a.owner.mark != null ? "  [owner mark]" : "")); });
console.log("\nPER LABEL — median [min – max] (n); categorical: counts");
const L = labelStats(atts, anchor);
for (const [lab, o] of Object.entries(L)) { console.log(`\n${lab} — ${o.n} attempt(s)`);
  for (const [k, hd2, u, , d] of SUMMARY_COLUMNS) { if (d == null) { console.log(`  ${hd2.padEnd(14)} ${Object.entries(o.cat[k] || {}).map(([x, n]) => `${x} ${n}`).join(" · ")}`); continue; } const x = o.num[k]; if (!x) continue;
    console.log(`  ${(hd2 + (u ? " (" + u + ")" : "")).padEnd(20)} ${fmt(x.median, d).padStart(8)} [${fmt(x.min, d)} – ${fmt(x.max, d)}]  q25–q75 ${fmt(x.q25, d)}–${fmt(x.q75, d)}  sd ${fmt(x.sd, d)}  (n ${x.n})`); } }
if (ji >= 0) fs.writeFileSync(args[ji + 1], JSON.stringify({ anchor, summaries: S, labels: L }, null, 1));
