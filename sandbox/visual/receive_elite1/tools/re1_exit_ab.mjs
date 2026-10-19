// receive_elite1/tools/re1_exit_ab.mjs — RECEIVE → DRIBBLE-V1 CONTINUITY (owner #30): how close to the runner can the exit touch put the ball and still be
// taken over by the frozen DRIBBLE-V1? The exit distance (RE.exitAhead = RECEIVE-CONTROL-1.1's HANDOFF_AHEAD) × K for K = 1.0 / 0.85 / 0.7, on the elite set
// × seeds at 99 / 99 / 99: outcome, the receive's maximum separation, the takeover, DRIBBLE-V1's first touch.   node re1_exit_ab.mjs <out.json> [seeds] [K list]
import fs from "fs"; import { makeElite, RE1 } from "./re1_env.mjs"; import { ALL, parseCase } from "../re1_cases.js"; import { tight } from "./re1_metrics.mjs";
const out = process.argv[2], seeds = (process.argv[3] || "1,2,3").split(",").map(Number), KS = (process.argv[4] || "1.0,0.85,0.7").split(",").map(Number), rows = [], keep = RE1.RE.exitAheadK;
for (const K of KS) { RE1.RE.exitAheadK = K; for (const id of ALL) for (const sd of seeds) { const cs = parseCase(id + "_B99_D99_A99"), S = makeElite(cs, { seed: sd }); S.run(cs.scenario.dur); const m = tight(S, cs); delete m.sep.curve; m.K = K; m.seed = sd; m.window = S.rc2 && S.rc2.window || null; rows.push(m); } }
RE1.RE.exitAheadK = keep; fs.writeFileSync(out, JSON.stringify(rows));
const med = (a) => { const b = a.filter((x) => x != null).sort((x, y) => x - y); return b.length ? b[Math.floor(b.length / 2)] : null; };
for (const K of KS) { const R = rows.filter((r) => r.K === K), oc = {}; for (const r of R) oc[r.cls5] = (oc[r.cls5] || 0) + 1;
  console.log("K", K, JSON.stringify(oc), "recvMax med", med(R.map((r) => r.sep.receive && r.sep.receive.max)), "recvMean med", med(R.map((r) => r.sep.receive && r.sep.receive.mean)), "tStable med", med(R.map((r) => r.tStable)), "window timeouts", R.filter((r) => r.window && r.window.timeout).length); }
