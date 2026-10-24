// occupy1/tools/o_old.mjs — §1 THE OLD FAILURE, reproduced before anything changes: every review case in OLD (Shared Possession + Reaction V1,
// MEDIUM 0.200 s — possess1/, unchanged), both bodies posed every tick, the occupancy volumes detected (o_volumes.js): the deepest penetration,
// the regions, the players' distance and closing speed, the ball, the possession state; ball contacts made with a leg inside the opponent.
//   node o_old.mjs [--json f]
import { ENV } from "../../vocab2/tools/u_env.mjs";
import { OCASES } from "../o_cases.js";
import { runMode } from "../../possess1/p_run.js";
import { measureRun, summary } from "./o_measure.mjs";
import { OCC } from "../o_volumes.js";
import fs from "node:fs";
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; }, out = [];
console.log(`OLD (Shared Possession + Reaction V1, MEDIUM) — the occupancy volumes' deepest penetration per case (contact tolerance ${OCC.tol * 100} cm, hard limit ${OCC.hard * 100} cm)`);
console.log("  case               deepest  regions (ATT ↔ DEF)       at t     dist  closing  ticks>2cm >5cm  feet  arms   ball contacts through the body");
for (const tc of OCASES) { const r = runMode(ENV, tc, "MEDIUM"), rec = measureRun(ENV, r.W, r.clip), S = summary(rec, r.t0), b = S.best;
  out.push({ id: tc.id, name: tc.name, S: Object.assign({}, S, { through: S.through, ambiguous: S.ambiguous }) });
  const th = [...S.through.map((c) => `${c.by} ${c.kind} ${c.F} THROUGH ${c.B} ${(c.pen * 100).toFixed(0)} cm`), ...S.ambiguous.map((c) => `${c.by} ${c.kind} ambiguous ${(c.pen * 100).toFixed(0)} cm`)].join("; ");
  console.log(`  ${tc.id.padEnd(17)} ${b ? ((b.pen * 100).toFixed(1) + " cm").padStart(8) : "—".padStart(8)}  ${b && b.pen > 0 ? (b.A + " ↔ " + b.B).padEnd(24) : "".padEnd(24)} ${b ? ((b.t >= 0 ? "+" : "") + b.t.toFixed(2)).padStart(6) : ""}  ${b ? b.dist.toFixed(2) : ""}  ${b && b.closing != null ? b.closing.toFixed(2).padStart(6) : ""}   ${String(S.nTol).padStart(5)} ${String(S.nHard).padStart(5)}  ${(S.per.FEET * 100).toFixed(0).padStart(3)}  ${(S.per.ARMS * 100).toFixed(0).padStart(3)}   ${th || "—"}`); }
if (arg("json")) fs.writeFileSync(arg("json"), JSON.stringify(out, null, 1));
