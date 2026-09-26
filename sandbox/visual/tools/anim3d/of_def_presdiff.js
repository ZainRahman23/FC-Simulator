// DEFENDING V1 — PRESENTATION identity check between two probe dumps (of_rp_probe.js): per tick, per actor, the solve's pop / plant-slide /
// jump fingerprint, and every reception / pass contact record (final-state residuals). Used to show that squad fixtures WITHOUT defending
// render exactly as they did at the frozen tag (the authoritative side is compared by of_rp_regress.js).
//   node of_def_presdiff.js <probeA.json> <probeB.json>
const fs = require("fs");
const [A, B] = process.argv.slice(2).map(f => JSON.parse(fs.readFileSync(f)));
let fail = false, n = 0;
for (const k of Object.keys(A.results)) {
  const x = A.results[k], y = B.results[k]; if (!y) { console.log(k, "missing"); fail = true; continue; }
  let d = 0; const L = Math.min(x.pres.length, y.pres.length);
  for (let i = 0; i < L; i++) for (let j = 0; j < x.pres[i].length; j++) d = Math.max(d, Math.abs(x.pres[i][j] - y.pres[i][j]));
  const rec = JSON.stringify(x.recv) === JSON.stringify(y.recv) && JSON.stringify(x.pass) === JSON.stringify(y.pass);
  const ok = d === 0 && rec && x.pres.length === y.pres.length; n++;
  if (!ok) { fail = true; console.log(k.padEnd(22), "pres max|d|", d, "records identical", rec, "DIFF"); }
}
console.log(`presentation: ${n} fixtures compared — ${fail ? "PRESENTATION DIFF" : "PRESENTATION IDENTICAL"}`);
