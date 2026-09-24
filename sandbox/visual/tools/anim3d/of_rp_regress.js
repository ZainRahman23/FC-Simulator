// RECEIVING + PASSING V1 — ANIMATION ON/OFF NEUTRALITY (and determinism) for every squad fixture.
// Compares two probe dumps (of_rp_probe.js --anim on / --anim off, or two --anim on runs for the determinism self-test): the per-tick
// AUTHORITATIVE trace (ball x/y/z/vx/vy, owner, controlled player, every player's x/y/vx/vy/facing) and the simulation's event log
// (passes, receptions with foot / outcome / contact point / velocities, possession). The skeleton may explain; it may never decide.
//   node of_rp_regress.js <probeA.json> <probeB.json>
const fs = require("fs");
const [A, B] = process.argv.slice(2).map(f => JSON.parse(fs.readFileSync(f)));
const strip = (e) => { const o = Object.assign({}, e); return JSON.stringify(o); };
let fail = false;
console.log("scenario               ticks  trace max|d|   events   verdict");
for (const k of Object.keys(A.results)) {
  const x = A.results[k], y = B.results[k]; if (!y) { console.log(k, "missing"); fail = true; continue; }
  let d = 0, at = -1;
  for (let t = 0; t < Math.max(x.trace.length, y.trace.length); t++) { const u = x.trace[t] || [], v = y.trace[t] || [];
    for (let j = 0; j < Math.max(u.length, v.length); j++) { const q = Math.abs((u[j] ?? NaN) - (v[j] ?? NaN)); if (!(q <= d)) { d = isNaN(q) ? Infinity : q; at = t; } } }
  const ea = x.events.map(strip), eb = y.events.map(strip), evOk = ea.length === eb.length && ea.every((s, i) => s === eb[i]);
  const ok = d === 0 && evOk; if (!ok) fail = true;
  console.log(k.padEnd(22), String(x.trace.length).padStart(5), String(d).padStart(13), String(ea.length).padStart(8), "  ", ok ? "IDENTICAL" : "*** DIFFERS" + (d ? " trace tick " + at : "") + (evOk ? "" : " events") + " ***");
}
console.log("anim A", A.anim, " anim B", B.anim, " page errors", A.errors.length, B.errors.length);
console.log(fail ? "\nGATE FAIL" : "\nGATE PASS — receiving and passing presentation explain the authoritative outcome, they never change it");
process.exit(fail ? 1 : 0);
