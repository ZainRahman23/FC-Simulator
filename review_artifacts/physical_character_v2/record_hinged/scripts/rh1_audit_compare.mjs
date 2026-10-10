// RH1 AUDIT — comparison helper for rh1_audit_verify.sh (2026-10-11, documentation only). Prints one SAME / DIFF line and exits 0 / 1.
//   json <committed[.gz]> <new[.gz]> [--ignore=<regex on keys>] [--only=<comma list of top-level keys>]   deep equality after dropping ignored keys
//   spec <committed rh1_spec_check.json> <new>          rows (id, pass, value) and the report identical
//   sha  <file[.gz]> <sha256> [--ignore=<regex>]        sha256 of the file bytes, or (with --ignore) of JSON.stringify without the ignored keys
import fs from "fs"; import zlib from "zlib"; import crypto from "crypto";
const [mode, a, b] = process.argv.slice(2), opt = (k) => (process.argv.find(x => x.startsWith(`--${k}=`)) || "").slice(k.length + 3);
const raw = (f) => (f.endsWith(".gz") ? zlib.gunzipSync(fs.readFileSync(f)) : fs.readFileSync(f)), rd = (f) => JSON.parse(raw(f));
const ign = opt("ignore") ? new RegExp(opt("ignore")) : null, clean = (o) => (ign ? JSON.parse(JSON.stringify(o, (k, v) => (ign.test(k) ? undefined : v))) : o);
const only = opt("only") ? opt("only").split(",") : null, pick = (o) => (only ? Object.fromEntries(only.map(k => [k, o[k]])) : o);
function firstDiff(x, y, p = "") { if (JSON.stringify(x) === JSON.stringify(y)) return null; if (typeof x !== "object" || typeof y !== "object" || x === null || y === null) return `${p}: ${JSON.stringify(x)?.slice(0, 120)} ≠ ${JSON.stringify(y)?.slice(0, 120)}`;
  for (const k of new Set([...Object.keys(x), ...Object.keys(y)])) { const d = firstDiff(x[k], y[k], `${p}.${k}`); if (d) return d; } return `${p}: structure differs`; }
let ok, msg;
if (mode === "json") { const A = pick(clean(rd(a))), B = pick(clean(rd(b))), d = firstDiff(A, B); ok = !d; msg = ok ? `identical${ign ? ` (ignoring keys /${opt("ignore")}/)` : ""}${only ? ` (keys ${only.join(", ")})` : ""}` : `first difference ${d}`; }
else if (mode === "spec") { const A = rd(a), B = rd(b), f = (j) => JSON.stringify({ rows: j.rows.map(r => [r.id, r.pass, r.value]), report: j.report, pass: j.pass }); ok = f(A) === f(B); msg = ok ? `${B.rows.length} rows + report identical (${B.rows.filter(r => r.pass).length}/${B.rows.length} PASS)` : `differs: ${firstDiff(JSON.parse(f(A)), JSON.parse(f(B)))}`; }
else if (mode === "sha") { const bytes = ign ? Buffer.from(JSON.stringify(rd(a), (k, v) => (ign.test(k) ? undefined : v))) : raw(a), h = crypto.createHash("sha256").update(bytes).digest("hex"); ok = h === b; msg = `sha256 ${h}${ok ? " = recorded" : ` ≠ recorded ${b}`}`; }
else { console.error("unknown mode"); process.exit(2); }
console.log(`${ok ? "SAME" : "DIFF"} ${msg}`); process.exit(ok ? 0 : 1);
