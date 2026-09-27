// SLIDE CONTACT GEOMETRY V1.2 — run-level comparison of two of_def_run.js dumps (small-sided games / demos) against baseline/tackled-player-v1.
// STRICTER than the V1 run gate: the only thing V1.2 changes is what a SLIDE does, so the ball / possession trace must be identical up to the first
// slide REQUEST (TACKLE_START type SLIDE) of either run — a standing tackle, a jockey or an ordinary body contact before it must not move anything.
//   node of_slide_gate_run.js <tag.json> <head.json>
const fs = require("fs");
const [A, B] = process.argv.slice(2).map(f => JSON.parse(fs.readFileSync(f)).out);
let bad = 0;
for (const k of Object.keys(A)) {
  const x = A[k], y = B[k]; const L = Math.min(x.trace.length, y.trace.length); let first = -1;
  for (let i = 0; i < L; i++) if (x.trace[i][0] !== y.trace[i][0] || x.trace[i][1] !== y.trace[i][1] || x.trace[i][2] !== y.trace[i][2]) { first = i; break; }
  if (first < 0) { console.log(k.padEnd(14), "IDENTICAL"); continue; }
  const tick = first + 1, sl = (ev) => ev.filter(e => e.kind === "TACKLE_START" && e.type === "SLIDE" && e.tick <= tick).map(e => "SLIDE@" + e.tick);
  const trig = sl(y.events).concat(sl(x.events)), before = (ev) => JSON.stringify(ev.filter(e => e.tick < Math.min(tick, ...trig.map(s => +s.split("@")[1]))));
  const ok = trig.length > 0 && before(x.events) === before(y.events); if (!ok) bad++;
  console.log(k.padEnd(14), ok ? "EXPECTED CHANGE" : "UNEXPECTED", "first divergence tick", tick, "preceded by", trig.slice(-2).join(", ") || "no slide");
}
console.log(bad ? `SLIDE RUN GATE FAIL (${bad})` : "SLIDE RUN GATE PASS — divergence only after a slide request");
