// occupy3b2/tools/b2_smoke.mjs — one case in 3B.1 and 3B.2: the decisions, the events, the checks (a quick look while building)
import { ENV, setOf, arg } from "../../occupy3b/tools/l3_common.mjs";
import { runB2 } from "../b2_run.js";
const ID = arg("id", "bf-into"), tc = setOf("l3").find((x) => x.id === ID) || setOf("review").find((x) => x.id === ID) || setOf("moves").find((x) => x.id === ID);
for (const m of arg("modes", "S3B,S3B2").split(",")) { const c0 = performance.now(), R = runB2(ENV, tc, m, { record: false }), W = R.W, ms = performance.now() - c0;
  console.log(`\n== ${m} ${ID}: ${ms.toFixed(0)} ms · Stage 3 episodes ${W.imp.episodes.length} · 3B apps ${W.l3 ? W.l3.apps.length : "-"} · checks ${W.l3 ? JSON.stringify(W.l3.check) : ""}`);
  for (const e of W.imp.episodes) for (const k of ["ATT", "DEF"]) if (e.players[k]) { const x = e.players[k]; console.log(`  ${k}: ${x.sev} ${x.cls} steps ${x.steps.length} ${x.fall ? "FALL: " + String(x.fall.why).slice(0, 120) : ""}`); }
  if (W.b2) { console.log(`  3B.2: ${W.b2.decisions.length} decisions · ${W.b2.results.length} NO_FEASIBLE · ${W.b2.release.length} releases · ${W.b2.pelvis.length} pelvis holds · boot ${W.b2.boot.length} · evals ${W.b2.nEval} · cpu ${W.b2.cpu.reduce((a, b) => a + b, 0).toFixed(0)} ms`);
    for (const d of W.b2.decisions.slice(0, 30)) console.log(`   ${(d.t - R.t0).toFixed(3)} ${d.who} ${d.kind}${d.obstruction ? " [" + d.obstruction.slice(0, 70) + "]" : ""}${d.s3 ? ` S3 ${d.s3.cls || ""} ${d.s3.X}` : ""} → ${JSON.stringify(d.result).slice(0, 170)}`);
    for (const e of W.b2.events.slice(0, 40)) console.log(`   ev ${(e.t - R.t0).toFixed(3)} ${e.who} ${e.kind}: ${String(e.why).slice(0, 150)}`); }
  for (const e of W.imp.events.filter((e) => /RECOVERY|FALL|TRIP|BLOCKED/.test(e.kind)).slice(0, 14)) console.log(`   s3 ${(e.t - R.t0).toFixed(3)} ${e.who} ${e.kind}: ${String(e.why).slice(0, 130)}`); }
