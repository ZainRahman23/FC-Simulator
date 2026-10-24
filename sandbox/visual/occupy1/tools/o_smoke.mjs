// occupy1/tools/o_smoke.mjs — the review cases, OLD vs OCCUPANCY V1: the deepest penetration, the ticks beyond the tolerance / the hard limit,
// ball contacts through the body, the outcome, the occupancy events, root corrections   node o_smoke.mjs [ids]
import { ENV } from "./o_env.mjs";
import { OCASES } from "../o_cases.js";
import { runO, outcomeO } from "../o_run.js";
import { measureRun, summary } from "./o_measure.mjs";
const ids = process.argv[2] ? process.argv[2].split(",") : OCASES.map((x) => x.id);
for (const id of ids) { const tc = OCASES.find((x) => x.id === id), line = [];
  for (const m of ["OLD", "OCC"]) { const c0 = performance.now(), r = runO(ENV, tc, m), ms = performance.now() - c0, S = summary(measureRun(ENV, r.W, r.clip), r.t0), o = outcomeO(r.W), b = S.best;
    const occ = r.W.occ ? `corr ${(r.W.att.occShift || 0).toFixed(2)}/${(r.W.def.occShift || 0).toFixed(2)} m · conflicts ${r.W.occ.conflicts} · blocked ${r.W.occ.blocked}${r.W.occ.unresolved ? " · UNRESOLVED " + JSON.stringify(r.W.occ.unresolved) : ""}` : "";
    line.push(`${m} ${b ? (b.pen * 100).toFixed(1).padStart(5) : "  —  "} cm ${b && b.pen > 0 ? (b.A + "↔" + b.B).padEnd(18) : "".padEnd(18)} >2cm ${String(S.nTol).padStart(3)} >5cm ${String(S.nHard).padStart(3)} through ${S.through.length} · ${o ? o.kind.replace("CONTACT — ", "") : "—"} ${occ} [${ms.toFixed(0)} ms]`); }
  console.log(`${id.padEnd(17)} ${line[0]}\n${"".padEnd(17)} ${line[1]}`); }
