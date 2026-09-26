// DEFENDING V1 — authoritative trace identity between two of_def_run.js / of_autopass_run.js dumps (ball x/y and owner per tick, plus
// the full simulation event log where present): ON/OFF neutrality and determinism for the defending drills, demos and the auto-pass runs.
//   node of_def_tracediff.js <a.json> <b.json>
const fs = require("fs");
const [A, B] = process.argv.slice(2).map(f => JSON.parse(fs.readFileSync(f)).out);
let fail = false;
for (const k of Object.keys(A)) {
  const x = A[k], y = B[k]; if (!y) { console.log(k, "missing"); fail = true; continue; }
  let d = 0, first = -1; const L = Math.min(x.trace.length, y.trace.length);
  for (let i = 0; i < L; i++) { const dd = Math.max(Math.abs(x.trace[i][0] - y.trace[i][0]), Math.abs(x.trace[i][1] - y.trace[i][1]), x.trace[i][2] === y.trace[i][2] ? 0 : 1e9); if (dd > 0 && first < 0) first = i; d = Math.max(d, dd); }
  const strip = (ev) => JSON.stringify((ev || []).map(e => { const o = Object.assign({}, e); return o; }));
  const evOk = x.events == null || strip(x.events) === strip(y.events);
  const ok = d === 0 && evOk && x.trace.length === y.trace.length;
  if (!ok) fail = true;
  console.log(k.padEnd(14), "ticks", x.trace.length, "trace max|d|", d, first >= 0 ? "(first at " + first + ")" : "", "events", x.events ? (evOk ? "identical (" + x.events.length + ")" : "DIFF") : "-", ok ? "IDENTICAL" : "DIFF");
}
console.log(fail ? "TRACE GATE FAIL" : "TRACE GATE PASS");
