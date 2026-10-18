// dribble15/tools/d15_cache.mjs — CACHE / REUSE METRICS (the owner's DRIBBLE-1.3 §28) over scenarios × seeds, for a core and planner mode:
//   foot prediction (TURN-1.2): predicted-tick requests vs ticks actually stepped; main-track reuse (kept / adopted / new)
//   foot poses: pose requests (a tick's bone frames, a time-warped swing phase) vs poses computed
//   ball prediction: launch-trajectory requests served from the memo; free-ball predictions per second
//   plans: version results reused, candidate generations reused, plans kept by a held re-plan; replans (searches / passes) per simulated second
//   candidates: rejected by a broad phase (distance gates, the region's yaw limit, the release-reach and interval gates) vs exactly evaluated
//   (contact-geometry evaluations, plan versions evaluated)
// usage: node d15_cache.mjs "IDs|all" seeds [ver d15] [plan13 on|off] [out.json]
import fs from "fs"; import { makeSim } from "./d15_env.mjs"; import { get, list } from "../../dribble1/d1_scenarios.js";
const [idsA = "all", nA = "2", ver = "d15", mode = "on", outFile] = process.argv.slice(2), ids = idsA === "all" ? list().map((s) => s.id) : idsA.split(",");
const T = {}; let sim = 0, jobs = 0, noRel = 0, verEval = 0; const add = (k, v) => { if (typeof v === "number") T[k] = (T[k] || 0) + v; };
for (const id of ids) for (let sd = 1; sd <= +nA; sd++) {
  const S = makeSim(get(id), { ver, seed: sd, opts: { record: false, plan13: mode === "on" } }); S.run(); sim += S.k / 240;
  for (const [k, v] of Object.entries(S.cpu)) add(k, v); if (S.wu) for (const [k, v] of Object.entries(S.wu)) add("wu." + k, v);
  for (const d of S.decLog || []) { if (d.ev === "start") jobs++; if (d.ev === "noRelease") noRel++; if (d.ev === "stats") for (const [, [n]] of Object.entries(d.ver || {})) verEval += n; } }
const r = (a, b) => (b > 0 ? +(100 * a / b).toFixed(1) : null), ps = (x) => +(x / sim).toFixed(1);
const out = { ver, planner: mode === "on" ? "incremental (plan13)" : "synchronous (DRIBBLE-1.2 pass)", simS: +sim.toFixed(1),
  footPrediction: { tickRequestsPerS: ps(T.smpReq || 0), ticksSteppedPerS: ps(T["wu.step"] || T.predTicks || 0), hitRatePct: T.smpReq ? r(T.smpReq - (T["wu.step"] || 0), T.smpReq) : null,
    mainTrack: { kept: T.viewReuse || 0, adopted: T.viewAdopt || 0, newPrediction: T.viewNew || 0, reuseRatePct: r((T.viewReuse || 0) + (T.viewAdopt || 0), (T.viewReuse || 0) + (T.viewAdopt || 0) + (T.viewNew || 0)) } },
  footPoses: { requestsPerS: ps((T.poseReq || 0) + (T.wbReq || 0)), computedPerS: ps((T["wu.pose"] || 0) + (T["wu.leg"] || 0)), hitRatePct: T.poseReq ? r(T.poseReq + (T.wbReq || 0) - (T["wu.pose"] || 0) - (T["wu.leg"] || 0), T.poseReq + (T.wbReq || 0)) : null,
    warped: { requestsPerS: ps(T.wbReq || 0), memoHitsPerS: ps(T.wbHit || 0), legOnlyPerS: ps(T["wu.leg"] || 0) } },
  ballPrediction: { launchRequestsPerS: ps((T.launchHit || 0) + (T.launchMiss || 0)), launchReuseRatePct: r(T.launchHit || 0, (T.launchHit || 0) + (T.launchMiss || 0)), ballStepsPerS: ps(T["wu.ball"] || 0) },
  plans: { versionResultsReusedPerS: ps(T.verHit || 0), versionsEvaluatedPerS: mode === "on" ? ps(verEval) : null, versionReuseRatePct: mode === "on" ? r(T.verHit || 0, (T.verHit || 0) + verEval) : null,
    candidateGenerationsReusedPct: r(T.genHit || 0, (T.genHit || 0) + (T.genMiss || 0)), heldPlansKept: T.heldKeep || 0, replansPerS: mode === "on" ? ps(jobs) : ps(T.plans || 0) },
  candidates: { broadPhaseRejectedPerS: ps((T.bpFar || 0) + (T.bpYaw || 0)), releaseProbesSkippedByBroadPhasePerS: ps(noRel), exactContactGeometryPerS: ps(T["wu.geom"] || 0), exactCorridorsPerS: ps(T["wu.cor"] || 0) } };
console.log(JSON.stringify(out, null, 1)); if (outFile) fs.writeFileSync(outFile, JSON.stringify(out, null, 1));
