// BALANCE-2 matched criteria (B2M; BALANCE2_MATCHED_CRITERIA.md §4, frozen before any candidate is run on the matched battery). BALANCE-1's criteria
// (b1_eval.mjs) unchanged EXCEPT: the AP push magnitudes of P1 / P2 / P3 (matched, §2), P4 → P4′ (criteria/b2_p4prime.mjs), M1 → M1′ (forward
// magnitude matched to the Rietdyk thesis A-P push), T1 → T1′ (all four directions with matched AP bands), and the new P8 (AP / ML overshoot, human).
// Labels: [M] measured human, [E] derived, [D] design threshold, [S] V2 specification. usage: node b2_eval.mjs --evidence <Q.json> --out <verdict.json>
import fs from "fs";
const { p4prime, P4P_TEXT } = await import(new URL("./b2_p4prime.mjs", import.meta.url).href), B1E = await import(new URL("../../balance1/scripts/b1_eval.mjs", import.meta.url).href);
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
export const CRIT = Object.freeze({ ...Object.fromEntries(["U1", "U2", "U3", "U4", "U5", "U6", "P5", "P6", "P7", "DET"].map(k => [k, B1E.CRIT[k]])),
  P1: "small pushes (fwd 4.82 / back 5.84 [matched] / lateral 7.5 N·s): recovered without a step (no fall; COM within 10 mm of the twin over the last 1 s; pelvis < 10 mm)",
  P2: "moderate pushes (fwd 9.64 / back 11.68 [matched] / lateral 15.0 N·s): recovered without a step",
  P3: "over-limit pushes (fwd 21.50 / back 26.07 [matched] / lateral 32.5 N·s): loss of no-step balance within 4 s in every direction — a feet-in-place save exceeds the matched human capability",
  P4: P4P_TEXT,
  P8: "[M] human overshoot: for small and moderate pushes in every direction, the COM excursion past the twin opposite to the push after the peak ≤ 0.26 × the peak (human ≈ 0.12–0.14: Rietdyk 1999 thesis A-P / M-L 0.7–0.8 cm on 5.6–6.4 cm; ankle-only releases overshoot-free, Zelei 2021; band × 2)",
  M1: "[M/E] Rietdyk-matched pushes: forward 10.58 N·s over 367 ms (88 steps; the thesis A-P pelvis push at its duration-corrected fraction on this fixture), left 20 N·s over 350 ms (BALANCE-1, unchanged): recovered; COM peak within [24, 120] mm; time to peak within [0.25, 1.0] s; settled (within 10 mm) by 3.5 s",
  T1: "[M/E] no-step failure threshold (50 ms pelvis pulse) in every direction: forward within [13.01, 18.22] N·s and backward within [15.77, 22.08] N·s (matched: duration-corrected fraction 0.50–0.70 of the fixture's zero-delay limit at the battery edge; backward assumes the forward fraction), left and right within [21.8, 49.8] N·s (BALANCE-1, unchanged)" });
export function evaluate(Q) { const v1 = B1E.evaluate(Q), res = {}; for (const k of ["U1", "U2", "U3", "U4", "U5", "U6", "P1", "P2", "P3", "P5", "P6", "P7", "DET"]) res[k] = v1.results[k];
  const pp = p4prime(Q); res.P4 = { pass: pp.pass, value: pp.perDirection };
  const P = Q.P.runs, os = ["fwd", "back", "left", "right"].flatMap(d => ["small", "moderate"].map(m => [d + "." + m, P[d + "." + m].overshoot]));
  res.P8 = { pass: os.every(([, o]) => o && o.frac <= 0.26), value: Object.fromEntries(os.map(([k, o]) => [k, o ? { frac: +o.frac.toFixed(3), peakMm: +o.peakMm.toFixed(1), oppositeMm: +o.oppositeMm.toFixed(1) } : "fell"])) };
  const M = Q.M, mOk = (m) => m.recovery.recovered && m.recovery.comPeakMm >= 24 && m.recovery.comPeakMm <= 120 && m.recovery.tPeakS >= 0.25 && m.recovery.tPeakS <= 1.0 && m.recovery.settleS != null && m.recovery.settleS <= 3.5;
  res.M1 = { pass: Object.values(M).every(mOk), value: Object.fromEntries(Object.entries(M).map(([k, m]) => [k, { J: m.J, steps: m.steps, recovered: m.recovery.recovered, peakMm: +m.recovery.comPeakMm.toFixed(1), tPeakS: m.recovery.tPeakS, settleS: m.recovery.settleS }])) };
  const T = Q.T, band = { fwd: [13.01, 18.22], back: [15.77, 22.08], left: [21.8, 49.8], right: [21.8, 49.8] };
  res.T1 = { pass: Object.entries(band).every(([d, [lo, hi]]) => T[d] && T[d].thresholdNs >= lo && T[d].thresholdNs <= hi), value: Object.fromEntries(Object.keys(band).map(d => [d, T[d] ? +T[d].thresholdNs.toFixed(2) : null])) };
  const ids = Object.keys(CRIT).filter(k => res[k]), failed = ids.filter(k => !res[k].pass); return { label: Q.label, pass: failed.length === 0, nPass: ids.length - failed.length, n: ids.length, failed, results: Object.fromEntries(ids.map(k => [k, res[k]])) }; }
if (process.argv[1] && process.argv[1].endsWith("b2_eval.mjs")) { const Q = JSON.parse(fs.readFileSync(arg("evidence"))), v = evaluate(Q);
  if (arg("out")) fs.writeFileSync(arg("out"), JSON.stringify({ criteria: CRIT, ...v }, null, 1));
  console.log(`${v.label}: ${v.pass ? "PASS" : "FAIL"} ${v.nPass}/${v.n}${v.failed.length ? " · failed: " + v.failed.join(", ") : ""}`);
  for (const [k, r] of Object.entries(v.results)) console.log(`  ${r.pass ? "✓" : "✗"} ${k.padEnd(4)} ${JSON.stringify(r.value).slice(0, 240)}`); }
