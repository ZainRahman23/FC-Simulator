// TACKLED-PLAYER V1 — contact-aware comparison of two of_def_run.js dumps (small-sided games / demos) against the frozen Defending tag:
// the ball / possession trace must be identical up to the first tick at which the head run records a player-body contact or a launched slide
// (the only places the new model acts). Reports the first divergence and what preceded it.   node of_rx_gate_run.js <tag.json> <head.json>
const fs = require("fs");
const [A, B] = process.argv.slice(2).map(f => JSON.parse(fs.readFileSync(f)).out);
let bad = 0;
for (const k of Object.keys(A)) {
  const x = A[k], y = B[k]; const L = Math.min(x.trace.length, y.trace.length); let first = -1;
  for (let i = 0; i < L; i++) if (x.trace[i][0] !== y.trace[i][0] || x.trace[i][1] !== y.trace[i][1] || x.trace[i][2] !== y.trace[i][2]) { first = i; break; }
  if (first < 0) { console.log(k.padEnd(14), "IDENTICAL"); continue; }
  const tick = first + 1;                                                                   // trace row i is after tick i+1
  const trig = y.events.filter(e => (e.kind === "PLAYER_CONTACT" || e.kind === "TACKLE_BODY_CONTACT" || (e.kind === "TACKLE_START" && e.type === "SLIDE")) && e.tick <= tick).map(e => e.kind + "@" + e.tick);
  const trigT = x.events.filter(e => (e.kind === "TACKLE_BODY_CONTACT" || (e.kind === "TACKLE_START" && e.type === "SLIDE")) && e.tick <= tick).map(e => e.kind + "@" + e.tick);
  const ok = trig.length > 0 || trigT.length > 0; if (!ok) bad++;
  console.log(k.padEnd(14), ok ? "EXPECTED CHANGE" : "UNEXPECTED", "first divergence tick", tick, "preceded by", (trig.concat(trigT)).slice(-3).join(", ") || "nothing");
}
console.log(bad ? `RX RUN GATE FAIL (${bad})` : "RX RUN GATE PASS — divergence only after a player-body contact / a launched slide");
