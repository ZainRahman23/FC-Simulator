// TACKLED-PLAYER V1 — contact-aware regression against the frozen Defending tag (baseline/defending-v1.1-slide).
// Two probe dumps of the SAME fixtures (tag vs head). A fixture passes as IDENTICAL, or as an EXPECTED CHANGE only if the authoritative
// trace first diverges (a) at / after the first player-body contact of a challenge (the new reaction state and what follows from it), or
// (b) while a launched slide is within 1.2 m of an opponent (a sliding body is no longer a standing disc — the one intended pre-contact
// change). Anything else is UNEXPECTED. Events before the divergence must be identical.   node of_rx_gate.js <tag probe.json> <head probe.json>
const fs = require("fs");
const [A, B] = process.argv.slice(2).map(f => JSON.parse(fs.readFileSync(f)).results);
let bad = 0; const rows = [];
for (const k of Object.keys(A)) {
  const x = A[k], y = B[k]; if (!y) { rows.push([k, "MISSING"]); bad++; continue; }
  const L = Math.min(x.trace.length, y.trace.length); let first = -1;
  for (let i = 0; i < L && first < 0; i++) for (let j = 1; j < x.trace[i].length; j++) if (x.trace[i][j] !== y.trace[i][j]) { first = i; break; }
  if (first < 0 && x.trace.length === y.trace.length) { rows.push([k, "IDENTICAL"]); continue; }
  const contactT = (ev) => { const e = ev.find(e => e.kind === "TACKLE_BODY_CONTACT" || e.kind === "PLAYER_CONTACT"); return e ? e.tick : null; };
  const cH = contactT(y.events), cT = contactT(x.events), c = [cH, cT].filter(v => v != null).reduce((m, v) => Math.min(m, v), 1e9);
  const tick = x.trace[first][0];
  // (b) a launched slide near an opponent at the divergence tick (from the tag's own trace: tackler = the controlled player of the fixture)
  const st = x.events.find(e => e.kind === "TACKLE_START" && e.type === "SLIDE"), launched = st && tick >= st.tick + 6;
  const row = x.trace[first], nP = (row.length - 8) / 5, pid = st ? st.pid : null;
  let near = false; if (launched && pid != null) for (let q = 0; q < nP; q++) { if (q === pid) continue; const dx = row[8 + 5 * q] - row[8 + 5 * pid], dy = row[9 + 5 * q] - row[9 + 5 * pid]; if (Math.hypot(dx, dy) < 1.2) near = true; }
  const evBefore = (ev) => JSON.stringify(ev.filter(e => e.tick < tick));
  const evSame = evBefore(x.events) === evBefore(y.events);
  const cause = tick >= c - 1 ? "after the first body contact (tick " + c + ")" : near ? "launched slide within 1.2 m of an opponent (sliding body is not a standing disc)" : null;
  const ok = cause && evSame;
  if (!ok) bad++;
  const newEv = y.events.filter(e => e.kind === "PLAYER_CONTACT").map(e => `${e.seg} ${e.segPlanted ? "planted" : "swing"} → ${e.react || e.cls}${e.family ? " " + e.family : ""}`).join("; ");
  rows.push([k, ok ? "EXPECTED CHANGE" : "UNEXPECTED", `first divergence tick ${tick}`, cause || "no contact / no slide nearby", evSame ? "events before it identical" : "EVENTS BEFORE IT DIFFER", newEv]);
}
for (const r of rows) console.log(r.join("  |  "));
console.log(bad ? `RX GATE FAIL (${bad})` : "RX GATE PASS — every difference from baseline/defending-v1.1-slide begins at a player-body contact or at the intended sliding-body change");
