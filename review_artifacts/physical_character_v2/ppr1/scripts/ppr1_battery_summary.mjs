// PPR-1 battery summary (read-only): ppr1_metrics on every run of one law's battery, plus BASELINE-SUBTRACTED responses: every SOLO disturbance run
// minus the same law's undisturbed QS run (same entry, deterministic, step by step), so the law's own standing drift is not read as a response.
//   pushes: peak horizontal COM deviation and trunk-tilt deviation within 0–400 ms after onset, the deviation remaining at 400 ms (decay),
//           the fall time (trunk tilt > 20°) against QS's own;
//   impacts: peak struck-joint deviation 0–120 ms, response onset order (|Δω| > 0.5 rad/s vs baseline), peak COM / trunk deviation.
// PVP: N2 window bins and the C0 control; N2 − C0 (same law) for the collision's own effect.
// usage: node ppr1_battery_summary.mjs --law A --dir <battery dir> --out <PPR1_BATTERY_A.json>
import fs from "fs"; import path from "path"; import zlib from "zlib";
const { metrics, KEY_AXES } = await import(new URL("./ppr1_metrics.mjs", import.meta.url).href);
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
const law = arg("law"), dir = arg("dir"), H = 1 / 240, load = (id) => { const f = path.join(dir, `${law}_${id}.json.gz`); return fs.existsSync(f) ? metrics(JSON.parse(zlib.gunzipSync(fs.readFileSync(f)))) : null; };
const QS = load("QS"), ids = fs.readdirSync(dir).filter(f => f.startsWith(law + "_") && f.endsWith(".json.gz")).map(f => f.slice(law.length + 1, -8)).sort();
const fallT = (m) => { const q = m.series.thorax.findIndex(t => Math.hypot(t[0], t[1]) > 20); return q < 0 ? null : +(q * H).toFixed(3); };
const dev = (m, b, q) => Math.hypot(m.series.com[q][0] - b.series.com[q][0], m.series.com[q][2] - b.series.com[q][2]) * 1000, tdev = (m, b, q) => Math.hypot(m.series.thorax[q][0] - b.series.thorax[q][0], m.series.thorax[q][1] - b.series.thorax[q][1]);
const out = { tool: "ppr1_battery_summary.mjs", law, dir, runs: {} };
for (const id of ids) { const m = id === "QS" ? QS : load(id); if (!m) continue; const { series, ...rest } = m; const e = { ...rest, fallTimeS: fallT(m) };
  if (id.startsWith("PUSH") && QS) { const on = 120, W = [...Array(96)].map((_, j) => on + j).filter(q => q < m.series.t.length && q < QS.series.t.length);
    e.push = { peakComDevMm: Math.max(...W.map(q => dev(m, QS, q))), comDevAt400msMm: dev(m, QS, W[W.length - 1]), peakTrunkDevDeg: Math.max(...W.map(q => tdev(m, QS, q))), trunkDevAt400msDeg: tdev(m, QS, W[W.length - 1]), qsFallTimeS: fallT(QS) }; }
  if (id.startsWith("IMP") && QS) { const imp = m.series.t.map((_, q) => q), W = imp.filter(q => q < 29), struck = id.includes("shankR") ? ["ankle_R.df", "knee_R.flex", "hip_R.flex"] : id.includes("shankL") ? ["ankle_L.inv", "knee_L.flex", "hip_L.abd"] : ["shoulder_L.abd", "shoulder_L.flex", "elbow_L.flex"];
    const om = (nm, q) => m.series.joints[nm].om[q] - QS.series.joints[nm].om[q];
    e.impact = { struckPeakDevDeg: Object.fromEntries(struck.map(nm => [nm, Math.max(...W.map(q => Math.abs(m.series.joints[nm].th[q] - QS.series.joints[nm].th[q])))])),
      onsetMs: Object.fromEntries(KEY_AXES.filter(nm => m.series.joints[nm]).map(nm => { const q = W.find(q => Math.abs(om(nm, q)) > 0.5); return [nm, q == null ? null : +(q * H * 1000).toFixed(1)]; })),
      peakComDevMm: Math.max(...imp.filter(q => q < Math.min(m.series.t.length, QS.series.t.length)).map(q => dev(m, QS, q))), peakTrunkDevDeg: Math.max(...imp.filter(q => q < Math.min(m.series.t.length, QS.series.t.length)).map(q => tdev(m, QS, q))) }; }
  out.runs[id] = e; }
// N2 − C0 (collision's own effect, same law): per-bin differences of the window statistics
const N2 = out.runs.N2, C0 = out.runs.C0; if (N2 && C0 && N2.window && C0.window) out.collisionEffect = N2.window.bins.map((b, j) => b && C0.window.bins[j] ? { bin: b.bin, comDispMm: b.comDispMm - C0.window.bins[j].comDispMm, trunkDeg: b.trunkDeg - C0.window.bins[j].trunkDeg, pelvisDeg: b.pelvisDeg - C0.window.bins[j].pelvisDeg } : null);
fs.writeFileSync(arg("out"), JSON.stringify(out, null, 1));
for (const [id, e] of Object.entries(out.runs)) console.log(`${id.padEnd(20)} ${e.verdict.padEnd(13)} fall ${e.fallTimeS ?? "—"} s${e.push ? ` · push dev COM ${e.push.peakComDevMm.toFixed(1)} → ${e.push.comDevAt400msMm.toFixed(1)} mm, trunk ${e.push.peakTrunkDevDeg.toFixed(2)}°` : ""}${e.impact ? ` · impact struck ${Object.entries(e.impact.struckPeakDevDeg).map(([k, v]) => k + " " + v.toFixed(2)).join(" ")}°, COM dev ${e.impact.peakComDevMm.toFixed(1)} mm` : ""}`);
