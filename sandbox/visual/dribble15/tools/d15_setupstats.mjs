// dribble15/tools/d15_setupstats.mjs — SET-UP TOUCH STATISTICS per cut scenario (the owner's §13: how often a set-up is needed, its speed and direction,
// where the decisive touch then found the ball): for each run, the set-up touch (role setup / set-up with the switch) and the decisive touch
// (d15_quality.mjs). usage: node d15_setupstats.mjs "IDs" seeds [ver d12] [out.json]
import fs from "fs"; import { makeSim, PROFILES } from "./d15_env.mjs"; import { get } from "../../dribble1/d1_scenarios.js"; import { cutQuality } from "./d15_quality.mjs";
const [idsA = "CUT45_RUN,CUT60_RUN,CUT60L_RUN,CUT90_RUN,CUT90L_RUN", nA = "16", ver = "d15", outFile] = process.argv.slice(2), out = {};
const mean = (a) => (a.length ? +(a.reduce((s, x) => s + x, 0) / a.length).toFixed(2) : null), med = (a) => { const v = [...a].sort((p, q) => p - q); return v.length ? +v[v.length >> 1].toFixed(2) : null; };
for (const id of idsA.split(",")) { const scn = get(id), Q = [];
  for (let sd = 1; sd <= +nA; sd++) { const S = makeSim(scn, { ver, seed: sd, player: PROFILES.HIGH }); S.run(); const q = cutQuality(S, scn); if (q) Q.push({ seed: sd, ...q }); }
  const su = Q.filter((q) => q.setupUsed);
  out[id] = { runs: Q.length, setupUsed: su.length, setupUsedPct: +(100 * su.length / Q.length).toFixed(0), decisiveWasFirstTouch: Q.filter((q) => q.setupFromExistingTouch).length,
    setupSpeedMean: mean(su.map((q) => q.setupSpeed)), setupSpeedMedian: med(su.map((q) => q.setupSpeed)), setupDirMedianDeg: med(su.map((q) => Math.abs(q.setupDirDeg))),
    setupErrAtDecisiveMedianM: med(Q.map((q) => q.setupErrAtDecisiveM).filter((x) => x != null)), takenAfterSetup: su.filter((q) => q.taken).length, cleanAfterSetup: su.filter((q) => q.takenCleanly).length,
    decisive: Q.reduce((o, q) => { if (q.decisive) { const k = q.decisive.reg + (q.decisive.preferred ? "" : " (weak foot)"); o[k] = (o[k] || 0) + 1; } return o; }, {}), rows: Q };
  const o = out[id]; console.log(`${id.padEnd(11)} set-up ${o.setupUsed}/${o.runs} (${o.setupUsedPct} %) · speed ${o.setupSpeedMean} mean ${o.setupSpeedMedian} median · |dir| ${o.setupDirMedianDeg}° · err at decisive ${o.setupErrAtDecisiveMedianM} m · taken after set-up ${o.takenAfterSetup} (clean ${o.cleanAfterSetup}) · decisive ${JSON.stringify(o.decisive)}`); }
if (outFile) fs.writeFileSync(outFile, JSON.stringify(out, null, 1));
