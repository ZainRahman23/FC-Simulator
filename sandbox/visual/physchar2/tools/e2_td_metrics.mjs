// ═══ physchar2/tools/e2_td_metrics.mjs — touchdown metrics of the bounded 30 mm touchdown diagnostic matrix (e2/SWING_SERVO_VALIDATION_V2_PREREG.md §7;
// reading rules e2/TOUCHDOWN_A30_ANALYSIS_PLAN.md, both written before the matrix ran). DIAGNOSTIC: nothing here is an E2 criterion; E2-5 stays as frozen.
// Reads tools/e2_run.mjs step records. Per run:
//   FROZEN (tools/e2_eval.mjs evalStep, unchanged): contact φ, instantaneous peak (max probe normal load of the swing foot over [t_c, t_c + 0.1 s] = E2-5's impact), approach
//     normal / tangential speed (last row before t_c), 50 ms impulse from t_c, penetration (lowest boot point within 0.1 s of t_c), TOUCHDOWN→AIRBORNE count, re-entries,
//     every E2 criterion verdict (information only).
//   ADDED: span [t_c − 2 ticks, t_c + 0.1 s] (the probe can register the contact before the measured contact state); peak over the span; max load averaged over an EXACT
//     physical-time window of 10 ms and of 20 ms lying in the span (per-tick value held over [t_i − dt, t_i), fractional tick weights — the same function as
//     tools/swing_servo_eval2.mjs); 20 / 50 ms impulse from the first loaded tick; contact-loss rows and max upward foot speed in (t_c, t_c + 0.1 s] (rebound);
//     max applied Δτ / commanded Δτ0 in the span with the E1a-7 rate-rule limits at that rate; the run's E2-9 verdict.
// Summary per rate (180 / 240 / 480 Hz) and per body × side × direction group: rate ratios vs 180 Hz, the plan's S1 stability rule (10 ms mean ratio ≤ 1.2 in every group,
//   from the 1/dt alternative 2.67 / 1.33), S2 verdict flips at 25 % BW, the approach-speed and impulse ratios beside them.
// usage: node tools/e2_td_metrics.mjs <records...> [--json=<out>]   |   node tools/e2_td_metrics.mjs --selftest
import fs from "fs"; import zlib from "zlib"; import { evalStep } from "./e2_eval.mjs";
const f2 = (x, d = 2) => (x == null || !isFinite(x) ? "—" : x.toFixed(d)), mx = (a) => a.reduce((m, x) => Math.max(m, x), -Infinity), mn = (a) => a.reduce((m, x) => Math.min(m, x), Infinity);
// exact physical-time window mean of a piecewise-constant per-tick series (value v_i held over [t_i − dt, t_i)): max over window starts in [t0, t1]
// (copied verbatim from tools/swing_servo_eval2.mjs, frozen with SV-2)
function maxWindowMean(ts, vs, dt, Tw, t0, t1) { const starts = []; for (const t of ts) { starts.push(t - dt, t - Tw, t - dt - Tw, t); } let best = 0;
  for (const a of starts) { if (a < t0 - 1e-9 || a > t1 + 1e-9) continue; let acc = 0;
    for (let j = 0; j < ts.length; j++) { const lo = Math.max(ts[j] - dt, a), hi = Math.min(ts[j], a + Tw); if (hi > lo) acc += vs[j] * (hi - lo); } best = Math.max(best, acc / Tw); } return best; }
if (process.argv.includes("--selftest")) {
  // the same impulse J delivered in one tick at any rate gives the same 10 ms window mean J / 10 ms, while the instantaneous sample is J / dt
  const J = 1.5; for (const hz of [180, 240, 300, 480]) { const dt = 1 / hz, ts = [], vs = []; for (let i = 0; i < 60; i++) { ts.push(1 + i * dt); vs.push(i === 20 ? J / dt : 0); }
    const m = maxWindowMean(ts, vs, dt, 0.010, ts[0] - dt, ts[59] - 0.010); if (Math.abs(m - J / 0.010) > 1e-9) throw new Error(`selftest ${hz} Hz: ${m} vs ${J / 0.010}`); console.log(`selftest ${hz} Hz: 10 ms mean ${m.toFixed(6)} (expect ${(J / 0.010).toFixed(6)}), peak ${(J / dt).toFixed(2)}`); }
  process.exit(0); }
export function tdMetrics(r) { const { C, rep } = evalStep(r), dt = 1 / r.cfg.hz, R = r.rows, n = r.lifted, W = r.W, td = rep.touchdown, tc = rep.times ? rep.times.tc : null;
  const out = { body: r.run.human, side: r.run.side, kind: r.run.kind, hz: r.cfg.hz, traj: r.run.traj || "v2", config: r.run.config, W, verdict: rep.decision ? rep.decision.verdict : null,
    criteria: Object.fromEntries(Object.entries(C).map(([k, v]) => [k, v.pass])), e2_9: C["E2-9"] ? C["E2-9"].v : null };
  if (tc == null || !td) return out;
  const t0 = tc - 2 * dt, span = R.filter(x => x.t >= t0 - 1e-9 && x.t <= tc + 0.1 + 1e-9), ts = span.map(x => x.t), Fs = span.map(x => x.Jy[n]);
  const first = span.findIndex(x => x.Jy[n] > 0), tF = first >= 0 ? span[first].t - dt : tc, imp = (Tw) => R.filter(x => x.t - dt >= tF - 1e-9 && x.t - dt < tF + Tw - 1e-9).reduce((s, x) => s + x.Jy[n] * dt, 0);
  const after = R.filter(x => x.t > tc + 1e-9 && x.t <= tc + 0.1 + 1e-9), rs = r.cfg.hz === 240 ? 1 : 240 / r.cfg.hz;
  Object.assign(out, { phiC: td.phi, peakPctBW: 100 * td.impactBW, peakSpanPctBW: 100 * mx(Fs) / W, win10PctBW: 100 * maxWindowMean(ts, Fs, dt, 0.010, t0 - dt, tc + 0.09) / W,
    win20PctBW: 100 * maxWindowMean(ts, Fs, dt, 0.020, t0 - dt, tc + 0.08) / W, impulse20: imp(0.02), impulse50: imp(0.05), impulse50Frozen: td.impulse50, vNormal: td.vNormal, vTangential: td.vTangential,
    penetrationMm: Math.max(0, -td.penetrationMm), touchdownToAirborne: td.bounce, reentries: td.chatter, contactLossRows: after.filter(x => x.touch[n] === 0).length, maxUpSpeed: after.length ? Math.max(0, mx(after.map(x => x.foot[n].v[1]))) : null,
    dTauSpan: mx(span.map(x => x.dTau)), dTau0Span: mx(span.map(x => x.dTau0)), dTauLimitOnset: 25 * Math.max(1, rs), dTauLimit: 10 * Math.max(1, rs), dTau0Limit: 30 * rs });
  return out; }
if (process.argv[1] && process.argv[1].endsWith("e2_td_metrics.mjs") && !process.argv.includes("--selftest")) {
  const files = process.argv.slice(2).filter(a => !a.startsWith("--")), JS = (process.argv.find(a => a.startsWith("--json=")) || "").slice(7), runs = [];
  for (const f of files) runs.push(tdMetrics(JSON.parse(zlib.gunzipSync(fs.readFileSync(f)))));
  const HZ = [180, 240, 480], got = runs.filter(x => x.phiC != null), key = (x) => `${x.body} ${x.side} ${x.kind}`;
  console.log(`records ${runs.length}; planner verdicts: ${JSON.stringify(runs.reduce((a, x) => (a[x.verdict] = (a[x.verdict] || 0) + 1, a), {}))}; with a touchdown ${got.length}`);
  const M = [["instantaneous peak (frozen E2-5) %BW", "peakPctBW"], ["peak over the span %BW", "peakSpanPctBW"], ["max exact 10 ms mean %BW", "win10PctBW"], ["max exact 20 ms mean %BW", "win20PctBW"],
    ["impulse 20 ms N·s", "impulse20"], ["impulse 50 ms N·s", "impulse50"], ["approach normal m/s", "vNormal"], ["approach tangential m/s", "vTangential"], ["penetration mm", "penetrationMm"],
    ["max upward speed after contact m/s", "maxUpSpeed"], ["contact-loss rows after contact", "contactLossRows"], ["TOUCHDOWN→AIRBORNE", "touchdownToAirborne"], ["contact φ", "phiC"],
    ["applied Δτ in span N·m", "dTauSpan"], ["commanded Δτ0 in span N·m", "dTau0Span"]];
  console.log("\nper rate: min / median / max (n)"); for (const [lab, k] of M) { const cells = HZ.map(h => { const v = got.filter(x => x.hz === h).map(x => x[k]).filter(v => v != null).sort((a, b) => a - b);
      return v.length ? `${f2(v[0])} / ${f2(v[Math.floor(v.length / 2)])} / ${f2(v[v.length - 1])} (${v.length})` : "—"; }); console.log(`${lab.padEnd(38)} | ${cells.join(" | ")}`); }
  console.log(`\nE1a-7 limits in the span: applied ≤ ${HZ.map(h => f2(10 * Math.max(1, 240 / h), 1)).join(" / ")} (onset window ${HZ.map(h => f2(25 * Math.max(1, 240 / h), 1)).join(" / ")}), commanded ≤ ${HZ.map(h => f2(30 * 240 / h, 1)).join(" / ")} N·m`);
  console.log(`E2-9 pass: ${HZ.map(h => `${got.filter(x => x.hz === h && x.criteria["E2-9"]).length}/${got.filter(x => x.hz === h).length}`).join(" | ")}; frozen E2-5 pass: ${HZ.map(h => `${got.filter(x => x.hz === h && x.criteria["E2-5"]).length}/${got.filter(x => x.hz === h).length}`).join(" | ")}`);
  console.log(`25 % BW pass — instantaneous peak: ${HZ.map(h => `${got.filter(x => x.hz === h && x.peakPctBW <= 25).length}/${got.filter(x => x.hz === h).length}`).join(" | ")}; 10 ms mean: ${HZ.map(h => `${got.filter(x => x.hz === h && x.win10PctBW <= 25).length}/${got.filter(x => x.hz === h).length}`).join(" | ")}`);
  // groups: rate ratios vs 180 Hz; S1 (10 ms mean ratio ≤ 1.2 at 240 and 480 in every group); S2 verdict flips at 25 % BW
  const G = {}; for (const x of got) (G[key(x)] ||= {})[x.hz] = x; const rat = (k) => { const a = []; for (const g of Object.values(G)) for (const h of [240, 480]) if (g[180] && g[h] && g[180][k] > 0) a.push({ h, v: g[h][k] / g[180][k] }); return a; };
  console.log("\nratio vs 180 Hz over the groups: 240 min – max | 480 min – max"); for (const [lab, k] of M.slice(0, 8)) { const a = rat(k), s = (h) => { const v = a.filter(q => q.h === h).map(q => q.v); return v.length ? `${f2(mn(v))} – ${f2(mx(v))}` : "—"; }; console.log(`${lab.padEnd(38)} | ${s(240)} | ${s(480)}`); }
  const s1 = rat("win10PctBW").filter(q => q.v > 1.2), flips = Object.entries(G).filter(([, g]) => HZ.every(h => g[h]) && new Set(HZ.map(h => g[h].win10PctBW <= 25)).size > 1).map(([k]) => k), flipsPk = Object.entries(G).filter(([, g]) => HZ.every(h => g[h]) && new Set(HZ.map(h => g[h].peakPctBW <= 25)).size > 1).map(([k]) => k);
  console.log(`\nS1 (10 ms mean ratio vs 180 Hz ≤ 1.2 in every group): ${s1.length ? "NOT MET — " + s1.length + " group-rate cases > 1.2" : "MET"}; groups complete at all rates ${Object.values(G).filter(g => HZ.every(h => g[h])).length}/${Object.keys(G).length}`);
  console.log(`S2 25 % BW verdict flips across rates — 10 ms mean: ${flips.length} ${flips.join(", ")}; instantaneous peak: ${flipsPk.length} ${flipsPk.join(", ")}`);
  console.log("\nper group: peak / 10 ms / 20 ms (%BW), J50 (N·s), v_n (m/s) at 180 | 240 | 480"); for (const [k, g] of Object.entries(G).sort()) console.log(`${k.padEnd(26)} ${HZ.map(h => g[h] ? `${f2(g[h].peakPctBW, 1)}/${f2(g[h].win10PctBW, 1)}/${f2(g[h].win20PctBW, 1)}/${f2(g[h].impulse50)}/${f2(g[h].vNormal, 3)}` : "—").join(" | ")}`);
  if (JS) fs.writeFileSync(JS, JSON.stringify({ runs, s1: { met: s1.length === 0, over: s1 }, flips10: flips, flipsPeak: flipsPk }, null, 1)); }
