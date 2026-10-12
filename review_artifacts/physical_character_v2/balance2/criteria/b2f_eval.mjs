// BALANCE-2 FLAT-SOLE corrected criteria B2F (BALANCE2_FLAT_SOLE_CRITERION.md; frozen before any candidate is evaluated on it).
// The B2M battery is UNCHANGED (scripts/b2_qualify.mjs, same runs, same magnitudes). The B2M criteria (criteria/b2_eval.mjs, imported, unchanged) are
// applied with ONE criterion corrected: T1′ forward band [13.01, 18.22] → [10.15, 14.21] N·s = the human "try not to step" duration-corrected fraction
// 0.50–0.70 of this body's zero-delay limit at the LOADABLE FLAT-SOLE front edge (80.29 mm) instead of the 102.95 mm boot-rocker battery edge.
// Every other criterion, including P1 / P2 / P3 / M1′ / P8 and their (boot-rocker-scaled, hence more demanding) forward magnitudes, is unchanged.
// usage: node b2f_eval.mjs --evidence <B2M-format Q.json> --out <verdict.json>
import fs from "fs";
const B2E = await import(new URL("./b2_eval.mjs", import.meta.url).href), arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
export const BAND = Object.freeze({ fwd: [10.15, 14.21], back: [15.77, 22.08], left: [21.8, 49.8], right: [21.8, 49.8] });
export const CRIT = Object.freeze({ ...B2E.CRIT,
  T1: "[M/E] no-step failure threshold (50 ms pelvis pulse) in every direction: forward within [10.15, 14.21] N·s (FLAT-SOLE corrected: duration-corrected human fraction 0.50–0.70 of the zero-delay limit at the loadable flat-sole front edge, 80.29 mm), backward within [15.77, 22.08] N·s, left and right within [21.8, 49.8] N·s (unchanged)" });
export function evaluate(Q) { const v = B2E.evaluate(Q), T = Q.T; const t1 = { pass: Object.entries(BAND).every(([d, [lo, hi]]) => T[d] && T[d].thresholdNs >= lo && T[d].thresholdNs <= hi), value: Object.fromEntries(Object.keys(BAND).map(d => [d, T[d] ? +T[d].thresholdNs.toFixed(2) : null])) };
  const results = { ...v.results, T1: t1 }, ids = Object.keys(CRIT).filter(k => results[k]), failed = ids.filter(k => !results[k].pass);
  return { label: Q.label, criteria: "B2F", pass: failed.length === 0, nPass: ids.length - failed.length, n: ids.length, failed, results: Object.fromEntries(ids.map(k => [k, results[k]])) }; }
if (process.argv[1] && process.argv[1].endsWith("b2f_eval.mjs")) { const Q = JSON.parse(fs.readFileSync(arg("evidence"))), v = evaluate(Q);
  if (arg("out")) fs.writeFileSync(arg("out"), JSON.stringify({ criteria: CRIT, band: BAND, ...v }, null, 1));
  console.log(`${v.label} [B2F]: ${v.pass ? "PASS" : "FAIL"} ${v.nPass}/${v.n}${v.failed.length ? " · failed: " + v.failed.join(", ") : ""}`);
  for (const [k, r] of Object.entries(v.results)) console.log(`  ${r.pass ? "✓" : "✗"} ${k.padEnd(4)} ${JSON.stringify(r.value).slice(0, 240)}`); }
