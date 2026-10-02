// ═══ physchar/tools/stepper/matrix_report.mjs — the Part-4 MATRIX and the Part-3 question, from the oracle runs ═════════════════════════════
// 1. per configuration and start: committed steps, upright steps (the committed sequence played on, the feedback controller after it);
// 2. MATCHED-STATE contrast (Part 3: "what does the two-step oracle preserve that the ordinary controller consumes?"): at every depth-2
//    decision the same state and the same candidate set give both a ONE-step pick (argmin of the next-start cost) and the TWO-step pick; the
//    difference of their next-start states (and of the commands) is what the second transition buys — no confound of history;
// 3. the committed sequences replayed through the identical instrumentation (gait_metrics.measure) — per configuration, the steps before the
//    collapse (k ≥ 3 and ≥ 3 steps before a fall).
// usage: node tools/stepper/matrix_report.mjs <dir with CFG_START.json> [--measure] --out report.json
import fs from "fs"; import path from "path";
const arg = (k, d) => { const i = process.argv.indexOf(k); return i < 0 ? d : process.argv[i + 1]; };
const dir = process.argv[2], files = fs.readdirSync(dir).filter(f => /^[A-Za-z0-9]+_[RL]@[0-9.]+\.json$/.test(f)), runs = {};
for (const f of files) { const D = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")); if (!D.results || !D.results.length) continue; const cfg = f.split("_")[0]; for (const R of D.results) (runs[cfg] = runs[cfg] || []).push(R); }
const mean = (a) => a.length ? a.reduce((x, y) => x + y, 0) / a.length : null, sd = (a) => { const m = mean(a); return a.length > 1 ? Math.sqrt(a.reduce((x, y) => x + (y - m) ** 2, 0) / (a.length - 1)) : 0; };
const report = { matrix: {}, matched: null, gait: {} };
console.log("── matrix: upright steps per start (committed decisions) ──");
const STARTS = ["R@0.5", "L@0.5", "L@0.6", "R@0.55", "R@0.6", "L@0.55"];
for (const cfg of Object.keys(runs).sort()) { const row = STARTS.map(s => { const R = runs[cfg].find(r => r.start === s); return R ? { upright: R.final.upright, committed: R.final.committed, fell: R.final.status === "fell" } : null; });
  const up = row.filter(Boolean).map(r => r.upright); report.matrix[cfg] = { perStart: Object.fromEntries(STARTS.map((s, i) => [s, row[i]])), mean: mean(up), min: up.length ? Math.min(...up) : null, n: up.length };
  console.log(`${cfg.padEnd(8)} ` + row.map((r, i) => r ? `${STARTS[i]} ${String(r.upright).padStart(2)}(${r.committed})` : `${STARTS[i]}  -`).join("  ") + `  | mean ${mean(up)?.toFixed(1)} min ${up.length ? Math.min(...up) : "-"} (n ${up.length})`); }
// ── 2. matched-state contrast at the depth-2 decisions ──
const F = ["xi.0", "xi.1", "v.0", "v.1", "com.0", "com.1", "swFoot.0", "swFoot.1", "L.0", "L.2", "trailExt", "stExt", "pelvisPitch", "loadSt", "dsDur"];
const fo = (z, nm) => { const p = nm.split("."); let v = z; for (const k of p) v = v == null ? null : Array.isArray(v) ? v[+k] : v[k]; return v; };
const dA = [], dU = [], dC = []; let nDiff = 0, nAll = 0;
for (const cfg of Object.keys(runs)) for (const R of runs[cfg]) for (const s of R.steps) { if (!s.lvl2 || !s.lvl2.length || !s.u) continue; nAll++;
  const fin = s.cands.filter(c => c.c != null && c.z1), one = fin.slice().sort((a, b) => (a.c0 ?? a.c) - (b.c0 ?? b.c))[0], two = s.cands.find(c => JSON.stringify(c.u) === JSON.stringify(s.u));
  if (!one || !two || !two.z1) continue; const same = JSON.stringify(one.u) === JSON.stringify(two.u); if (!same) nDiff++;
  const l1 = s.lvl2.find(l => JSON.stringify(l.u) === JSON.stringify(one.u)), l2 = s.lvl2.find(l => JSON.stringify(l.u) === JSON.stringify(two.u));
  dA.push({ cfg, start: R.start, k: s.k, same, du: two.u.map((v, i) => v - one.u[i]), dz: F.map(nm => (fo(two.z1, nm) ?? 0) - (fo(one.z1, nm) ?? 0)), c1: [one.c0 ?? one.c, two.c0 ?? two.c], b1: [l1 ? l1.b1 : null, l2 ? l2.b1 : null], v2: [l1 ? l1.viable2 / l1.n2 : null, l2 ? l2.viable2 / l2.n2 : null] }); }
const dd = dA.filter(d => !d.same);
report.matched = { decisions: nAll, differ: dd.length, du: { mean: [0, 1, 2].map(i => mean(dd.map(d => d.du[i]))), sd: [0, 1, 2].map(i => sd(dd.map(d => d.du[i]))) },
  dz: Object.fromEntries(F.map((nm, i) => [nm, { mean: mean(dd.map(d => d.dz[i])), sd: sd(dd.map(d => d.dz[i])) }])), c1: [mean(dd.map(d => d.c1[0])), mean(dd.map(d => d.c1[1]))],
  b1: [mean(dd.filter(d => d.b1[0] != null && d.b1[1] != null).map(d => d.b1[0])), mean(dd.filter(d => d.b1[0] != null && d.b1[1] != null).map(d => d.b1[1]))], viable2: [mean(dd.filter(d => d.v2[0] != null).map(d => d.v2[0])), mean(dd.filter(d => d.v2[1] != null).map(d => d.v2[1]))], rows: dA };
console.log(`\n── matched-state contrast: ${dd.length}/${nAll} depth-2 decisions differ from the one-step pick at the same state ──`);
console.log(`command (two − one): df ${report.matched.du.mean[0]?.toFixed(3)}±${report.matched.du.sd[0]?.toFixed(3)} · dl ${report.matched.du.mean[1]?.toFixed(3)}±${report.matched.du.sd[1]?.toFixed(3)} · T ${report.matched.du.mean[2]?.toFixed(3)}±${report.matched.du.sd[2]?.toFixed(3)}`);
console.log(`first-step cost one ${report.matched.c1[0]?.toFixed(2)} vs two ${report.matched.c1[1]?.toFixed(2)} | best second-step cost one ${report.matched.b1[0]?.toFixed(2)} vs two ${report.matched.b1[1]?.toFixed(2)} | viable second steps one ${report.matched.viable2[0]?.toFixed(2)} vs two ${report.matched.viable2[1]?.toFixed(2)}`);
console.log("next-start state (two − one): " + F.map((nm, i) => `${nm} ${report.matched.dz[nm].mean?.toFixed(3)}±${report.matched.dz[nm].sd?.toFixed(3)}`).join(" · "));
// ── 3. instrumentation of the committed sequences ──
if (process.argv.includes("--measure")) { const { runAndMeasure } = await import("./gait_metrics.mjs");
  for (const cfg of Object.keys(runs).sort()) { const per = []; for (const R of runs[cfg]) { const m = runAndMeasure({ label: `${cfg} ${R.start}`, start: R.start, fixed: R.fixed, n: Object.keys(R.fixed).length + 12 });
      const kF = m.summary.fell ? Math.max(...m.steps.filter(s => s.td != null && s.td < m.summary.tFall).map(s => s.k)) : Infinity, S = m.steps.filter(s => s.k >= 3 && s.k <= kF - 3 && s.td != null);
      const g = (f) => S.map(f).filter(v => v != null && Number.isFinite(v)); per.push({ start: R.start, upright: m.summary.upright, n: S.length, stepLen: mean(g(s => s.stepLen)), cmd: mean(g(s => s.cmd ? s.cmd.df ?? s.cmd[0] : null)), dsT: mean(g(s => s.dsAfter)), swingT: mean(g(s => s.swingT)),
        xi0f: mean(g(s => s.xi0 && s.xi0[0])), xi0fSd: sd(g(s => s.xi0 && s.xi0[0])), comTd: mean(g(s => s.comTd && s.comTd[0])), landPitch: mean(g(s => s.landPitch)), vTd: mean(g(s => s.vTd)), strideSpeed: m.summary.strideSpeed, slope: m.summary.strideSpeedSlopePerStride, Wmotor: m.summary.Wmotor, sat: m.summary.satMean }); }
    const A = (k) => mean(per.map(p => p[k]).filter(v => v != null && Number.isFinite(v))); report.gait[cfg] = { per, mean: Object.fromEntries(["stepLen", "cmd", "dsT", "swingT", "xi0f", "xi0fSd", "comTd", "landPitch", "vTd", "slope", "Wmotor", "sat"].map(k => [k, A(k)])) };
    const M = report.gait[cfg].mean; console.log(`${cfg.padEnd(8)} pre-collapse: step ${M.stepLen?.toFixed(3)} (cmd ${M.cmd?.toFixed(3)}) · DS ${M.dsT?.toFixed(3)} · swing ${M.swingT?.toFixed(3)} · ξ0 fwd ${M.xi0f?.toFixed(3)}±${M.xi0fSd?.toFixed(3)} · COM@td ${M.comTd?.toFixed(3)} · land pitch ${(M.landPitch * 57.3)?.toFixed(1)}° · speed slope ${M.slope?.toFixed(3)}/stride · W ${M.Wmotor?.toFixed(1)} J`); } }
if (arg("--out", null)) fs.writeFileSync(arg("--out"), JSON.stringify(report));
