// READ-ONLY (carrier investigation §2.2): in the LC-1 long-lead drift runs at 3 m/s (REV2 plant: posture tone at the promoted pose, B pelvis tether,
// no tackle), the translation errors at the first tick that fails the frozen coherence set, against the leg / slip errors at that tick.
// usage: node at_failure_translation.cjs <drift_on_speed_rows.json> <series dir (lc_v3_k*.json)> [out.json]
const fs = require("fs"), path = require("path"), [ROWS, DIR, OUT] = process.argv.slice(2);
const rows = JSON.parse(fs.readFileSync(ROWS)).filter(r => r.cs === "lc_v3"), out = [];
for (const r of rows) { const f = path.join(DIR, "lc_v3_k" + r.kp + ".json"); if (!fs.existsSync(f)) continue; const J = JSON.parse(fs.readFileSync(f)), runs = Object.values(J.cases)[0].runs;
  const run = runs.find(x => x.kp === r.kp && (x.variant || "v2") === "v2") || runs[0], tf = (r.tCoh || 0) + 1, s = run.series.find(x => x.t >= tf); if (!s) continue;
  out.push({ kp: r.kp, coherentTicks: r.tCoh, firstFail: r.firstFail, atTick: s.t, rootErrMm: s.rootDh, comHorizErrMm: s.comDh, dvFwd: s.dvFwd, dvLat: s.dvLat, tiltDeg: s.tiltDeg, legSimMm: s.legSimMm, slipMm: Math.max(s.slipMm.L, s.slipMm.R), BmeanFrac: r.BmeanFrac, BsatFrac: r.Bsat }); }
const mx = (k) => Math.max(...out.map(o => Math.abs(o[k]))), mn = (k) => Math.min(...out.map(o => Math.abs(o[k])));
console.log("runs", out.length, "| at the first failing tick: root err <=", mx("rootErrMm"), "mm, COM horizontal err <=", mx("comHorizErrMm"), "mm, |dv| <=", Math.max(mx("dvFwd"), mx("dvLat")), "m/s, tilt <=", mx("tiltDeg"), "deg | legs vs simulation", mn("legSimMm"), "-", mx("legSimMm"), "mm | slip", mn("slipMm"), "-", mx("slipMm"), "mm");
if (OUT) fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
