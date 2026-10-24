// occupy2/tools/o2_smoke.mjs — the review cases, OLD · STAGE 1 · STAGE 2: the deepest resolved penetration (and where), ticks beyond the
// tolerance / the hard limit, contacts through a body, the outcome, the unresolved ticks by reason   node o2_smoke.mjs [ids] [--res json]
import { ENV } from "../../occupy1/tools/o_env.mjs";
import { O2CASES } from "../o2_cases.js";
import { runO2, outcomeO2 } from "../o2_run.js";
import { measureRun, summary } from "../../occupy1/tools/o_measure.mjs";
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; }, res = arg("res") ? JSON.parse(arg("res")) : undefined;
const ids = process.argv[2] && !process.argv[2].startsWith("--") ? process.argv[2].split(",") : O2CASES.map((x) => x.id), modes = (arg("modes", "OLD,S1,S2")).split(",");
for (const id of ids) { const tc = O2CASES.find((x) => x.id === id); if (!tc) { console.log("no case", id); continue; } const line = [];
  for (const m of modes) { const c0 = performance.now(), r = runO2(ENV, tc, m, { res }), ms = performance.now() - c0, S = summary(measureRun(ENV, r.W, r.clip), r.t0), o = outcomeO2(r.W), b = S.best, U = r.W.occ && r.W.occOn !== false && m !== "OLD" ? r.W.occ.unresolved : null;
    line.push(`${m.padEnd(3)} ${b ? (b.pen * 100).toFixed(1).padStart(5) : "  —  "} cm ${b && b.pen > 0 ? (b.A + "↔" + b.B).padEnd(18) : "".padEnd(18)} >2cm ${String(S.nTol).padStart(3)} >5cm ${String(S.nHard).padStart(3)} through ${S.through.length} · ${o ? o.kind.replace("CONTACT — ", "") : "—"}${U ? " · " + Object.entries(U).map(([k, v]) => `${k} ${v}`).join(" · ") : ""} [${ms.toFixed(0)} ms]`); }
  console.log(`${id.padEnd(18)} ${line.join("\n" + "".padEnd(19))}`); }
