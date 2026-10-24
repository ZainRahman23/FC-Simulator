// possess1/tools/p_overlap.mjs — §23 NO PLAYER–PLAYER COLLISION YET (Milestone 3): MEASURED, never resolved. The two posed bodies' capsules
// (Tackling V1's: trunk 0.15 m, thighs 0.075, shins 0.055, feet 0.045 — t_body.js) every tick of every review case under every mode: the deepest
// interpenetration, the ticks deeper than 3 cm, and — where the missing collision can change the football — every ball contact made while the
// bodies are inside each other (a player playing the ball through his opponent's body)
//   node p_overlap.mjs [--json f]
import { ENV } from "../../vocab2/tools/u_env.mjs";
import { DT } from "../../vocab2/c_sim.js";
import { PlayBody } from "../../vocab2/u_body.js";
import { PCASES } from "../p_cases.js";
import { runMode, MODE_LIST } from "../p_run.js";
import fs from "node:fs";
import { overlapOf } from "../p_overlap.js";
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
if (process.argv[1] && process.argv[1].endsWith("p_overlap.mjs")) {
  const T = {}; for (const m of MODE_LIST) T[m] = { runs: 0, deep: 0, ticks3: 0, ticksAfter3: 0, through: [] }; const rows = [];
  for (const tc of PCASES) for (const m of MODE_LIST) { const r = runMode(ENV, tc, m), W = r.W, A = W.tk.act, kC = A && A.hits.length ? Math.round(A.hits[0].t / DT) : null, bA = new PlayBody(ENV, W.att), bD = new PlayBody(ENV, W.def), X = T[m], pens = new Map(); let deep = 0;
    for (let k = Math.round(r.clip[0] / DT); k <= Math.round(r.clip[1] / DT); k++) { const t = k * DT, pen = overlapOf(bA.pose(t).J, bD.pose(t).J); pens.set(k, pen); if (pen > deep) deep = pen; if (pen > 0.03) { X.ticks3++; if (kC != null && k >= kC) X.ticksAfter3++; } }
    X.runs++; X.deep = Math.max(X.deep, deep);
    // ball contacts made while the bodies interpenetrate by more than 3 cm (the boot through a leg, a touch through the opponent)
    const C = W.auth ? W.contactLog.map((c) => ({ k: c.k, by: c.by, kind: c.kind })) : [...(A ? A.hits.map((h) => ({ k: Math.round(h.t / DT), by: "DEF", kind: "tackle" })) : []), ...W.att.contacts.filter((c) => !c.missed).map((c) => ({ k: c.k, by: "ATT", kind: "touch" })), ...W.def.contacts.filter((c) => !c.missed).map((c) => ({ k: c.k, by: "DEF", kind: "touch" }))];
    for (const c of C) { const p = pens.get(c.k) || 0; if (p > 0.03) X.through.push(`${tc.id}: ${c.by} ${c.kind} at ${((c.k * DT) - r.t0).toFixed(3)} s through ${(p * 100).toFixed(0)} cm of overlap`); }
    rows.push({ id: tc.id, mode: m, deep: +(deep * 100).toFixed(1) }); process.stderr.write("."); }
  console.log(`\nBODY OVERLAP (no player collision exists — measured, never resolved) — ${PCASES.length} review cases × ${MODE_LIST.length} modes, every tick posed`);
  for (const m of MODE_LIST) { const X = T[m]; console.log(`  ${m.padEnd(7)} deepest ${(X.deep * 100).toFixed(1)} cm · ticks deeper than 3 cm: ${X.ticks3} (${X.ticksAfter3} after a tackle contact) · ball contacts made through overlapping bodies: ${X.through.length}`); }
  for (const m of MODE_LIST) for (const s of T[m].through.slice(0, 12)) console.log(`    ${m}: ${s}`);
  const worst = rows.filter((r) => r.mode === "MEDIUM").sort((a, b) => b.deep - a.deep).slice(0, 8); console.log(`  deepest per case (MEDIUM): ${worst.map((r) => `${r.id} ${r.deep} cm`).join(" · ")}`);
  if (arg("json")) fs.writeFileSync(arg("json"), JSON.stringify({ T, rows }, null, 1)); }
