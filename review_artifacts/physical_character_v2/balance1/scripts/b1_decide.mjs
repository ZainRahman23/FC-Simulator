// BALANCE-1 preregistered A-vs-B adoption rule (BALANCE1_PREREGISTRATION.md §7), applied mechanically to the two verdicts + evidence files.
// B (limited prediction) is adopted ONLY IF all of:
//   (1) no regression: B passes every criterion A passes;
//   (2) material human-likeness gain, at least one of: (a) B passes a criterion A fails; (b) quiet-standing ML COM RMS distance to the human
//       central 1.85 mm reduced by ≥ 25 %; (c) mean settle time of the four moderate pushes reduced by ≥ 25 %;
//   (3) not superhuman: B's thresholds ≤ 0.80 × the zero-delay limit (T1 upper bound) in both directions; B's quiet-standing COM RMS ≥ the U4 lower
//       bounds (1.0 / 0.43 mm); every over-limit push falls (P3); B's first command difference is never earlier than A's in any push (equal latencies).
// Otherwise A. usage: node b1_decide.mjs --qa <QA.json> --va <VA.json> --qb <QB.json> --vb <VB.json> [--out <json>]
import fs from "fs";
const arg = (k) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : null; }, J = (f) => JSON.parse(fs.readFileSync(f));
export function decide(QA, VA, QB, VB) { const pa = (v, k) => v.results[k].pass, ids = Object.keys(VA.results), why = {};
  why.noRegression = ids.filter(k => pa(VA, k) && !pa(VB, k)); const c1 = why.noRegression.length === 0;
  const mlA = QA.U.sway ? Math.abs(QA.U.sway.comMLmm.rms - 1.85) : Infinity, mlB = QB.U.sway ? Math.abs(QB.U.sway.comMLmm.rms - 1.85) : Infinity;
  const st = (Q) => { const v = ["fwd", "back", "left", "right"].map(d => Q.P.runs[d + ".moderate"].recovery.settleS); return v.some(x => x == null) ? Infinity : v.reduce((s, x) => s + x, 0) / 4; };
  why.gain = { criterionGained: ids.filter(k => !pa(VA, k) && pa(VB, k)), mlDistance: [mlA, mlB], settleMean: [st(QA), st(QB)] };
  const c2 = why.gain.criterionGained.length > 0 || mlB <= 0.75 * mlA || st(QB) <= 0.75 * st(QA);
  const fr = (Q, d) => Q.T[d].fracOfJlim, earliest = (Q) => Object.fromEntries(Object.entries(Q.P.runs).map(([k, v]) => [k, v.chronology.firstCommandDiff]));
  const eA = earliest(QA), eB = earliest(QB); why.superhuman = { thresholdsFrac: { fwd: fr(QB, "fwd"), left: fr(QB, "left") }, sway: QB.U.sway ? [QB.U.sway.comAPmm.rms, QB.U.sway.comMLmm.rms] : null, overLimitAllFall: pa(VB, "P3"), earlierCommand: Object.keys(eB).filter(k => eA[k] != null && eB[k] != null && eB[k] < eA[k]) };
  const c3 = fr(QB, "fwd") <= 0.80 && fr(QB, "left") <= 0.80 && QB.U.sway && QB.U.sway.comAPmm.rms >= 1.0 && QB.U.sway.comMLmm.rms >= 0.43 && pa(VB, "P3") && why.superhuman.earlierCommand.length === 0;
  return { adopted: c1 && c2 && c3 ? "B" : "A", conditions: { noRegression: c1, materialGain: c2, notSuperhuman: !!c3 }, why }; }
if (process.argv[1] && process.argv[1].endsWith("b1_decide.mjs")) { const d = decide(J(arg("qa")), J(arg("va")), J(arg("qb")), J(arg("vb"))); if (arg("out")) fs.writeFileSync(arg("out"), JSON.stringify(d, null, 1)); console.log(JSON.stringify(d, null, 1)); }
