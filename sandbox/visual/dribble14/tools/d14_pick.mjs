// dribble14/tools/d14_pick.mjs — picks the review examples from the reliability evidence: for each cut, seeds where DRIBBLE-1.2 takes the turn with the
// ball (and how DRIBBLE-1 did on the same seed), the first cut touch's redirect and speed; examples of INSIDE / OUTSIDE / LACES touches; a cut touch
// with a non-zero follow-through (for the close-up). usage: node d14_pick.mjs
import fs from "fs"; import path from "path"; import { fileURLToPath } from "url";
const EV = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../../review_artifacts/dribble11/evidence");
const rel = { d1: {}, d11: {} }; for (const v of ["d1", "d11"]) for (let g = 1; g <= 6; g++) { try { Object.assign(rel[v], JSON.parse(fs.readFileSync(path.join(EV, `rel_${v}_g${g}.json`), "utf8"))); } catch {} }
for (const id of ["CUT45_RUN", "CUT60_RUN", "CUT60L_RUN", "CUT90_RUN", "CUT90L_RUN"]) { const a = rel.d11[id], b = rel.d1[id]; if (!a) continue; console.log(id);
  for (const r of a.rows) { const o = b && b.rows.find((x) => x.seed === r.seed), ct = r.touchRows.filter((x) => x.cut || x.stage);
    console.log(`  seed ${String(r.seed).padStart(2)} d11 ${r.turn.takenWithBall ? "TAKEN" : "no   "} resp ${r.turn.responseS ?? "–"} done ${r.turn.completedS ?? "–"} err ${r.turn.finalHeadingErrDeg}° | d1 ${o ? (o.turn.takenWithBall ? "TAKEN" : "no   ") + " err " + o.turn.finalHeadingErrDeg + "°" : "–"} | cut touches ${ct.map((x) => `${x.t}s ${x.F}${x.reg[0]} ${x.speed}m/s ${(Math.atan2(x.lateral, x.along) * 180 / Math.PI).toFixed(0)}°${x.ft ? ` ft ${x.ft.iy.toFixed(2)}/${x.ft.ia.toFixed(2)}` : ""}${x.secondSame ? " 2ND" : ""}`).join(" | ")}`); } }
const ex = { INSIDE: [], OUTSIDE: [], LACES: [] }, ftEx = [];
for (const [id, o] of Object.entries(rel.d11)) for (const r of o.rows) for (const x of r.touchRows) { if (ex[x.reg] && ex[x.reg].length < 8 && !x.secondSame) ex[x.reg].push(`${id}:${r.seed} t ${x.t} ${x.F} ${x.speed}m/s ${(Math.atan2(x.lateral, x.along) * 180 / Math.PI).toFixed(0)}° ${x.cut ? "CUT" : ""}${x.stage ? "STG" : ""} clr ${x.minClearanceMm250}mm end ${r.end}`);
  if (x.ft && (x.ft.iy > 0 || x.ft.ia > 0) && (x.cut || x.stage) && ftEx.length < 12) ftEx.push(`${id}:${r.seed} t ${x.t} ${x.F}${x.reg[0]} ${x.speed}m/s ft ${x.ft.iy}/${x.ft.ia} clr ${JSON.stringify(x.clearanceMm)} min ${x.minClearanceMm250}`); }
for (const [k, v] of Object.entries(ex)) console.log(k, "\n  " + v.join("\n  ")); console.log("FOLLOW-THROUGH (non-zero) cut touches\n  " + ftEx.join("\n  "));
