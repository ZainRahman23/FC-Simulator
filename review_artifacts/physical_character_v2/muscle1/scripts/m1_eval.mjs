// MUSCLE-1 frozen criteria (MUSCLE1_PREREGISTRATION.md §6) applied to the evidence of m1_experiments.mjs → verdict JSON.
// Judged model: M1. V2ENV (CURRENT V2), V2ACT (S2 as in PPR-3) and M1a (force-production change only) are references, reported.
// Labels: [M] measured human value, [E] derived from measured values, [MODEL] model parameter, [D] design threshold, [S] V2 specification.
// usage: node m1_eval.mjs --evidence <MUSCLE1_RESULTS.json> --out <verdict.json>
import fs from "fs";
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
export const BANDS = Object.freeze({
  ankle: { PF: { rise: [250, 450], fall: [120, 250] }, DF: { rise: [150, 250], fall: [230, 360] } },
  knee: { KE: { rise: [165, 235], fall: [120, 200] } },
  onsetMs: [5, 30], firstTickFrac: 0.01, ampSpread: 1.10, rampOvershoot: 0.02, rampErr: 0.01,
  stiffRatio: [0.95, 1.10], vlutters: [0.5, 1.5], firstTickStretch: 0.9, hold: { 100: [0.25, 0.60], 300: [0.15, 0.45], 1000: [0.08, 0.35] },
  ledgerRel: 0.01, releaseTailW: 0.05, bcReturn: 1.0, bcMemory: 0.05,
  replay: { tight: 0.05, loose: 0.6, looseRuns: ["fwd_large", "left_moderate"], uErr: 1e-9 }, cpuCharUs: 32.5, axesPerChar: 35 });
export const CRIT = Object.freeze({
  A1: "[E] PF step-up (excitation +0.05 / +0.25 / +0.50): 10–90 % torque rise within [250, 450] ms (human plantarflexor step-drive descriptors, FORCE_PRODUCTION_LITERATURE §9 / §12.2)",
  A2: "[E] PF step-down: 90–10 % torque fall within [120, 250] ms (§9 relaxation descriptors)",
  A3: "[E] DF step-up (+0.10 / +0.30): rise within [150, 250] ms; DF step-down: fall within [230, 360] ms (dorsiflexor descriptors; fall evidence weak)",
  A4: "[M/D] every neural step (both groups, up and down): time to 2 % of the change within [5, 30] ms (EMD 8.5–30 ms) and first-tick change ≤ 1 % of the final change — a neural command cannot change force instantly",
  A5: "[M] amplitude independence: per group and direction, the largest / smallest 10–90 % time across amplitudes ≤ 1.10 (ballistic time to peak constant across 5–75 % MVC, Van Cutsem)",
  A6: "[D] moderate ramps (200 ms up, hold, 200 ms down): overshoot ≤ 2 %, steady value within 1 % of the commanded torque at the end of the hold and after the ramp down",
  B1: "[D] immediate stiffness preserved and not duplicated: end-of-ramp (41.7 ms) stiffness of M1 / V2ACT within [0.95, 1.10] at all 5 amplitudes, and M1 within [0.5, 1.5] × Vlutters 2015 (fixture; V2's joint passive rows excluded)",
  B2: "[D] the intrinsic response is immediate: the first-tick torque change of a stretch ≥ 0.9 × the model's own unclipped intrinsic response −(D + dt·K_tot)·ω (small and moderate stretch)",
  B3: "[LIT-MODEL] eccentric hold on S2's C1 protocol (near-step 1° stretch of the loaded group, 2-step ramp, held): strain-torque fraction at 100 / 300 / 1000 ms within [0.25, 0.60] / [0.15, 0.45] / [0.08, 0.35] (S2's C1 bands)",
  B4: "[D] energy: ledger residual ≤ 1 % of the absorbed work (stretch–hold–return, small and moderate; quick release) and the stretch–hold–return cycle is net absorbing (no generation); no energy created by stiffness change",
  B5: "[D] quick release to the operating load: first motion toward return, no growing oscillation (no later half-cycle's largest |ω| exceeds the first recoil's; first 6 half-cycles above 1e-3 rad/s), settled (|ω| ≤ 0.05 rad/s over the last 0.25 s)",
  BC1: "[D/M] C history consistency: with the loaded group's excitation raised during the hold, the strain element returns no more work on the return than it absorbed in the stretch (ratio ≤ 1)",
  BC2: "[M] enhancement abolished when force returns to zero (Herzog 2018): strain torque after 0.5 s at zero excitation and reactivation ≤ 5 % of before",
  C0: "[S] replay validity: the V2ACT replay reproduces PPR-3's recorded excitation (≤ 1e-9) and applied torque (≤ 0.05 N·m; ≤ 0.6 N·m in fwd_large / left_moderate) — so all models see PPR-3's exact inputs",
  DET: "[S] bit-identical reruns of the whole experiment set",
  CPU: "[D] M1 cost per character (35 axes) ≤ 32.5 µs per step (5 % of PPR-3's measured 0.65 ms full step)" });
const inB = (v, b) => v != null && v >= b[0] && v <= b[1];
let CAND = "M1";                                                                                    // the judged model (amendment M1b: --candidate M1b); criteria unchanged
function judgeJoint(J, joint) { const res = {}, put = (id, pass, value) => { res[id] = { pass: !!pass, value }; }, M1 = (s) => s.models[CAND];
  const steps = J.A.steps, byG = (g) => steps.filter(s => s.group === g), G = Object.keys(BANDS[joint]).filter(k => /^[A-Z]{2}$/.test(k));
  const g0 = joint === "ankle" ? "PF" : "KE";
  put("A1", byG(g0).every(s => inB(M1(s).up.t10_90ms, BANDS[joint][g0].rise)), byG(g0).map(s => [s.du, +M1(s).up.t10_90ms.toFixed(1)]));
  put("A2", byG(g0).every(s => inB(M1(s).down.t10_90ms, BANDS[joint][g0].fall)), byG(g0).map(s => [s.du, +M1(s).down.t10_90ms.toFixed(1)]));
  if (joint === "ankle") put("A3", byG("DF").every(s => inB(M1(s).up.t10_90ms, BANDS.ankle.DF.rise) && inB(M1(s).down.t10_90ms, BANDS.ankle.DF.fall)), byG("DF").map(s => [s.du, +M1(s).up.t10_90ms.toFixed(1), +M1(s).down.t10_90ms.toFixed(1)]));
  put("A4", steps.every(s => ["up", "down"].every(d => inB(M1(s)[d].onset2ms, BANDS.onsetMs) && M1(s)[d].firstTickFrac <= BANDS.firstTickFrac)), steps.map(s => [s.group, s.du, +M1(s).up.onset2ms.toFixed(1), +M1(s).up.firstTickFrac.toFixed(4), +M1(s).down.onset2ms.toFixed(1), +M1(s).down.firstTickFrac.toFixed(4)]));
  const spread = (g, d) => { const v = byG(g).map(s => M1(s)[d].t10_90ms); return Math.max(...v) / Math.min(...v); }, groups = [...new Set(steps.map(s => s.group))];
  put("A5", groups.every(g => ["up", "down"].every(d => spread(g, d) <= BANDS.ampSpread)), Object.fromEntries(groups.map(g => [g, [+spread(g, "up").toFixed(3), +spread(g, "down").toFixed(3)]])));
  const rp = J.A.ramps[0].models[CAND]; put("A6", rp.overshootFrac <= BANDS.rampOvershoot && rp.finalErrFrac <= BANDS.rampErr && rp.endErrFrac <= BANDS.rampErr, { overshoot: +rp.overshootFrac.toFixed(4), finalErr: +rp.finalErrFrac.toFixed(4), endErr: +rp.endErrFrac.toFixed(4), lagAt50ms: rp.lagAt50ms });
  const sM = J.B.series[CAND], sR = J.B.series.V2ACT, ratios = sM.map((x, i) => x.Kend / sR[i].Kend);
  put("B1", ratios.every(r => inB(r, BANDS.stiffRatio)) && (joint !== "ankle" || sM.every(x => inB(x.vluttersRatio, BANDS.vlutters))), { M1overV2ACT: ratios.map(r => +r.toFixed(3)), vlutters: sM.map(x => +x.vluttersRatio.toFixed(3)) });
  const H = J.B.hold[CAND]; put("B2", ["small", "moderate"].every(l => H[l].firstTickRatio >= BANDS.firstTickStretch), Object.fromEntries(["small", "moderate"].map(l => [l, +H[l].firstTickRatio.toFixed(3)])));
  const EC = J.B.ecc[CAND]; put("B3", Object.entries(BANDS.hold).every(([ms, b]) => inB(EC.fraction[ms], b)), { M1: Object.values(EC.fraction).map(v => +v.toFixed(3)), V2ACT: J.B.ecc.V2ACT ? Object.values(J.B.ecc.V2ACT.fraction).map(v => +v.toFixed(3)) : null });
  const led = [H.small.ledger, H.moderate.ledger, J.B.release[CAND].ledger], rel = (L) => Math.abs(L.residual) / Math.max(1e-9, Math.abs(L.absorbedTotal));
  put("B4", led.every(L => rel(L) <= BANDS.ledgerRel && Math.abs(L.createdByStiffnessChange) < 1e-12) && H.small.ledger.absorbedTotal >= 0 && H.moderate.ledger.absorbedTotal >= 0, led.map(L => ({ absorbed: +L.absorbedTotal.toExponential(3), residualRel: +rel(L).toExponential(2), created: L.createdByStiffnessChange })));
  const R = J.B.release[CAND]; put("B5", R.recoilTowardReturn && R.nonGrowing && R.tailMaxAbsW <= BANDS.releaseTailW, { recoil: R.recoilTowardReturn, nonGrowing: R.nonGrowing, halfCyclePeakW: R.halfCyclePeakW, tailMaxAbsW: +R.tailMaxAbsW.toExponential(2), finalOffsetFrac: +R.finalOffsetFrac.toFixed(3) });
  const bc = J.BC[CAND]; put("BC1", bc.BC1.returnOverInput <= BANDS.bcReturn, { returnOverInput: +bc.BC1.returnOverInput.toFixed(4), created: bc.BC1.createdByStiffnessChange, V2ACT: J.BC.V2ACT ? +J.BC.V2ACT.BC1.returnOverInput.toFixed(4) : null });
  put("BC2", bc.BC2.ratio <= BANDS.bcMemory, { ratio: +bc.BC2.ratio.toFixed(4), V2ACT: J.BC.V2ACT ? +J.BC.V2ACT.BC2.ratio.toFixed(4) : null });
  const V = J.C.validation; put("C0", Object.entries(V).every(([k, v]) => v.excitationMaxErr <= BANDS.replay.uErr && v.appliedTorqueMaxErr <= (BANDS.replay.looseRuns.includes(k.split(":")[0]) ? BANDS.replay.loose : BANDS.replay.tight)), Object.fromEntries(Object.entries(V).map(([k, v]) => [k, +v.appliedTorqueMaxErr.toExponential(2)])));
  return res; }
export function evaluate(R) { const out = { ankle: judgeJoint(R.joints.ankle, "ankle") }; const cpuChar = R.CPU[CAND].usPerAxisStep * BANDS.axesPerChar;
  out.global = { DET: { pass: !!R.DET.identical, value: R.DET }, CPU: { pass: cpuChar <= BANDS.cpuCharUs, value: { usPerCharStep: +cpuChar.toFixed(2), perAxis: R.CPU } } };
  const ankleIds = Object.keys(out.ankle), ankleFailed = ankleIds.filter(k => !out.ankle[k].pass).concat(Object.keys(out.global).filter(k => !out.global[k].pass));
  out.anklePass = ankleFailed.length === 0; out.ankleFailed = ankleFailed;
  // the second joint is judged only if every ankle criterion (and DET / CPU) passed (instruction §12); otherwise its results are reported only
  if (R.joints.knee) { const k = judgeJoint(R.joints.knee, "knee"); out.knee = Object.fromEntries(Object.entries(k).map(([id, v]) => ["K-" + id, { ...v, judged: out.anklePass }])); }
  const kneeFailed = out.knee ? Object.keys(out.knee).filter(id => !out.knee[id].pass) : ["(knee not run)"];
  out.pass = out.anklePass && kneeFailed.length === 0; out.kneeFailed = out.anklePass ? kneeFailed : null;
  // A7 (a finding about the reference, not a candidate criterion): does CURRENT V2 produce torque substantially faster than human evidence permits?
  const pf = R.joints.ankle.A.steps.filter(s => s.group === "PF" && s.models.V2ENV), rise = pf.map(s => s.models.V2ENV.up.t10_90ms), fall = pf.map(s => s.models.V2ENV.down.t10_90ms);
  out.findings = { A7_currentV2: { pfRiseMs: rise, pfFallMs: fall, humanPF: BANDS.ankle.PF, substantiallyFaster: rise.some(v => v < BANDS.ankle.PF.rise[0] / 2) || fall.some(v => v < BANDS.ankle.PF.fall[0] / 2) } };
  return out; }
if (process.argv[1] && process.argv[1].endsWith("m1_eval.mjs")) { CAND = arg("candidate", "M1"); const R = JSON.parse(fs.readFileSync(arg("evidence"))), v = evaluate(R); v.candidate = CAND;
  if (arg("out")) fs.writeFileSync(arg("out"), JSON.stringify({ criteria: CRIT, bands: BANDS, ...v }, null, 1));
  const line = (id, r) => console.log(`  ${r.pass ? "✓" : "✗"} ${id.padEnd(6)} ${JSON.stringify(r.value).slice(0, 220)}`);
  console.log(`MUSCLE-1 [${CAND}] ankle: ${v.anklePass ? "PASS" : "FAIL"}${v.ankleFailed.length ? " · failed: " + v.ankleFailed.join(", ") : ""}`); for (const [id, r] of Object.entries(v.ankle)) line(id, r); for (const [id, r] of Object.entries(v.global)) line(id, r);
  if (v.knee) { console.log(`MUSCLE-1 knee (${v.anklePass ? "judged" : "reported only — ankle did not pass"}): ${v.kneeFailed && v.kneeFailed.length ? "FAIL · " + v.kneeFailed.join(", ") : v.anklePass ? "PASS" : ""}`); for (const [id, r] of Object.entries(v.knee)) line(id, r); }
  console.log(`OVERALL: ${v.pass ? "PASS" : "FAIL"}`); }
