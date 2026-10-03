// ═══ physchar2/tools/b_summarize.mjs — INVESTIGATION B: tables from b_sweep.mjs outputs (per k / candidate: invalid-manifold classes, events) ═══
// Invalid turf manifold classes: REVERSED (normal y ≤ −0.5: built on the turf box's bottom face), TILTED (|normal y| < 0.5), OFF-FACE (normal up but
// turf-side points off the top surface). An energy event (> 1 J one-step rise) is NARROW-PHASE when a REVERSED manifold occurs on the same step.
// usage: node tools/b_summarize.mjs <sweep.json> [more.json ...] [--md]
import fs from "fs";
const files = process.argv.slice(2).filter(a => !a.startsWith("--")), md = process.argv.includes("--md");
const cls = (x) => (x.ny <= -0.5 ? "reversed" : x.ny < 0.5 ? "tilted" : "offface");
const rows = [];
for (const f of files) { const R = JSON.parse(fs.readFileSync(f)); const byK = new Map(); for (const r of R.runs) { const k = (r.cand ? r.cand + " " : "") + "k=" + r.k; if (!byK.has(k)) byK.set(k, []); byK.get(k).push(r); }
  for (const [k, rs] of byK) { const c = { reversed: 0, tilted: 0, offface: 0 }, runsInv = new Set(), evNP = [], evOther = []; let maxRise = -Infinity, pcMax = 0, pcOver = 0;
    for (const r of rs) { if (r.err) continue; maxRise = Math.max(maxRise, r.maxRise); if (r.posCorr) { pcMax = Math.max(pcMax, r.posCorr.maxMm); pcOver += r.posCorr.ticksOver5mm ? 1 : 0; }
      for (const x of r.invalid || []) { c[cls(x)]++; runsInv.add(r.id); }
      for (const e of r.events || []) { const rev = (r.invalid || []).find(x => x.n === e.n && cls(x) === "reversed"); const tag = `${r.human} ${r.key} ${r.hz} Hz${r.vel ? " " + r.vel + " it" : ""} t ${e.t} +${e.dE} J`;
        if (rev) evNP.push(`${tag} (${rev.body}[${rev.piece}], gap ${(-rev.depthMm).toFixed(3)} mm)`); else evOther.push(tag); } }
    rows.push({ file: f.split("/").pop(), k, runs: rs.length, errors: rs.filter(r => r.err).length, runsWithInvalid: runsInv.size, ...c, eventsNarrowPhase: evNP, eventsOther: evOther, maxRise, posCorrMaxMm: pcMax, runsPosCorrOver5mm: pcOver }); } }
if (md) { console.log("| set | runs | runs with invalid turf manifolds | reversed / tilted / off-face (manifold-ticks) | > 1 J events: narrow-phase | > 1 J events: other | max one-step rise (J) | max position-solver move (mm) |");
  console.log("|---|---|---|---|---|---|---|---|");
  for (const r of rows) console.log(`| ${r.k} | ${r.runs} | ${r.runsWithInvalid} | ${r.reversed} / ${r.tilted} / ${r.offface} | ${r.eventsNarrowPhase.length ? r.eventsNarrowPhase.join("; ") : "0"} | ${r.eventsOther.length ? r.eventsOther.length + " (" + [...new Set(r.eventsOther.map(e => e.split(" t ")[0].replace(/@[-0-9.e]+/, "")))].join(", ") + ")" : "0"} | ${r.maxRise.toFixed(3)} | ${r.posCorrMaxMm ? r.posCorrMaxMm.toFixed(2) : "—"} |`); }
else for (const r of rows) console.log(JSON.stringify(r));
