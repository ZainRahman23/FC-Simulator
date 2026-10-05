// ═══ physchar2/tools/preswing_eval.mjs — evaluator of the pre-swing / contact-boundary validation (preswing/PRESWING_VALIDATION_PREREG.md §3), exactly as preregistered.
// usage: node tools/preswing_eval.mjs --manifest=<json> --results=<dir> --touchrest=<official touch-rest results dir> --boundary=<external-lift matrix dir>
//          --browser=<json> --regress=<regression eval json> [--out=<json>]
import fs from "fs"; import path from "path";
const arg = (k, d) => (process.argv.find(a => a.startsWith(`--${k}=`)) || `--${k}=${d}`).split("=").slice(1).join("=");
const M = JSON.parse(fs.readFileSync(arg("manifest", ""))), RD = arg("results", ""), TRD = arg("touchrest", ""), BD = arg("boundary", ""), BR = arg("browser", ""), RG = arg("regress", ""), OUT = arg("out", "");
const R = {}; let missing = 0; for (const run of M.runs) { const f = path.join(RD, run.id + ".json"); if (fs.existsSync(f)) R[run.id] = JSON.parse(fs.readFileSync(f)); else missing++; }
const get = (pred) => M.runs.filter(pred).map(r => R[r.id]).filter(Boolean), out = { missing, criteria: {}, reported: {} }, f2 = (x, d = 2) => (x == null || !isFinite(x) ? "—" : x.toFixed(d));
const mx = (a) => a.reduce((m, x) => Math.max(m, x ?? -Infinity), -Infinity), mn = (a) => a.reduce((m, x) => Math.min(m, x ?? Infinity), Infinity);
const add = (id, pass, v) => { out.criteria[id] = { pass: !!pass, v }; console.log(`${pass ? "PASS" : "FAIL"} ${id}: ${v}`); }, rep = (id, v) => { out.reported[id] = v; console.log(`rep  ${id}: ${v}`); };
const T = (o) => o.transRaw[o.nL], ids = (a, n = 6) => a.slice(0, n).map(o => o.id).join(", ") + (a.length > n ? " …" : "");
const postOk = (o) => { const A = T(o).filter(x => x.t > o.tRel); return !A.some(x => x.to === "LIFTOFF" || x.to === "AIRBORNE" || x.to === "LOAD_ACCEPT") && o.chatter === 0 && o.restLoadMaxN <= o.loadOnN && o.restLoadMeanTailN > 0 && o.restLoadMeanTailN < o.loadOffN; };
const energyOk = (o) => o.closMax <= 0.05 && o.closPos <= 0.5 && o.overCap === 0 && o.authorityWrites === 0 && o.extOk;
const torqueOk = (o) => o.dTauMaxNonOnset <= 10 && o.dTauMax <= 25 && o.dTau0Max <= 30;
const rank = (s) => (/fell/.test(s) ? 3 : /not settled/.test(s) ? 2 : /relocated/.test(s) ? 1 : 0);
console.log(`results ${Object.keys(R).length}/${M.runs.length} (missing ${missing})`);
// V1 release and rest (r = 0)
{ const L = get(r => r.set === "REL" && r.r === 0), bad = L.filter(o => !(o.released && o.tRel <= 3 + o.run.ramp + 2 + 1e-9 && postOk(o)));
  add("V1", L.length === 240 && !bad.length, `${L.length - bad.length}/${L.length}: released by ramp end + 2 s (t_rel − ramp end ${f2(mn(L.map(o => (o.tRel ?? 99) - 3 - o.run.ramp)))}…${f2(mx(L.map(o => (o.tRel ?? -99) - 3 - o.run.ramp)))} s); then no contact loss / LOAD_ACCEPT / chatter, load max ${f2(mx(L.map(o => o.restLoadMaxN)))} N ≤ loadOn, resting load ${f2(mn(L.map(o => o.restLoadMeanTailN)))}–${f2(mx(L.map(o => o.restLoadMeanTailN)))} N in (0, loadOff)${bad.length ? "; failing " + ids(bad) : ""}`); }
// V2 partial load never released
{ const L = get(r => r.set === "REL" && r.r === 0.02), bad = L.filter(o => o.released || T(o).length > 0); add("V2", L.length === 240 && !bad.length, `${L.length - bad.length}/${L.length} runs at 2 % never released${bad.length ? "; " + ids(bad) : ""}`); }
// V3 contact-point slip across release
{ const L = get(r => r.set === "REL" && r.r === 0).filter(o => o.released), bad = L.filter(o => !(o.slipRelMm <= 0.5));
  add("V3", L.length === 240 && !bad.length, `${L.length - bad.length}/${L.length}: contact-point slip over [t_rel − 0.1, t_rel + 0.5] ≤ ${f2(mx(L.map(o => o.slipRelMm)), 3)} mm (≤ 0.5); whole rest window ≤ ${f2(mx(L.map(o => o.slipPreMm)), 3)} mm; rotation tilt ≤ ${f2(mx(L.map(o => o.tiltMaxDeg)))}°, yaw ≤ ${f2(mx(L.map(o => o.yawMaxDeg)))}°${bad.length ? "; failing " + ids(bad) : ""}`); }
// V4 stance slip
{ const L = get(r => r.set === "REL" || r.set === "LIFT"), bad = L.filter(o => !(o.stanceSlipMm <= 1.0)); add("V4", !bad.length, `${L.length - bad.length}/${L.length}: stance slip ≤ ${f2(mx(L.map(o => o.stanceSlipMm)), 3)} mm (≤ 1.0)${bad.length ? "; " + ids(bad) : ""}`); }
// V5 lift sequence
const seqOk = (o) => { const l = o.lift; return l && l.tL != null && o.released && o.preContactLoss === 0 && o.preLoadAccept === 0 && l.airborne === 1 && l.touchdown === 1 && l.bounce === 0 && l.loadAccept === 1 && l.final === "SUPPORT" && o.chatter === 0; };
{ const L = get(r => r.set === "LIFT"), bad = L.filter(o => !seqOk(o));
  add("V5", L.length === 128 && !bad.length, `${L.length - bad.length}/${L.length} lifts (2 mm slow crossing, 5, 10, 20 mm; drops 1.5 / 2.5 cm): exactly 1 AIRBORNE, 1 TOUCHDOWN, 0 bounce, 1 LOAD_ACCEPT, final SUPPORT, no chatter, no pre-lift contact loss${bad.length ? "; failing " + bad.slice(0, 6).map(o => o.id + " " + JSON.stringify(o.lift && { a: o.lift.airborne, td: o.lift.touchdown, b: o.lift.bounce, la: o.lift.loadAccept, f: o.lift.final, ch: o.chatter, pre: o.preContactLoss })).join(", ") : ""}`); }
// V6 the redesigned contact boundary: a 2 mm slow-crossing dwell stays clear of the 0.5 mm touch gap
{ const L = get(r => r.set === "LIFT" && r.liftName === "X2"), bad = L.filter(o => !(o.lift && o.lift.clearMin > 0.5));
  add("V6", L.length === 32 && !bad.length, `${L.length - bad.length}/${L.length}: 2 mm dwell clearance min ${f2(mn(L.map(o => o.lift && o.lift.clearMin)))} mm (> 0.5 mm touch gap) after a slow crossing (2 s)${bad.length ? "; " + ids(bad) : ""}`); }
// V7 swing accuracy and touchdown (E1a-3 / E1b-3 / E1a-12 limits)
{ const L = get(r => r.set === "LIFT"), E5 = L.filter(o => o.run.liftName === "E5" && o.run.drop === 0.025), E20 = L.filter(o => o.run.liftName === "E20" && o.run.drop === 0.025);
  const b5 = E5.filter(o => !(o.lift.hoverErrMax <= 3 && o.lift.hoverErrRms <= 2 && o.lift.clearFrac06 >= 0.8)), b20 = E20.filter(o => !(o.lift.hoverErrMax <= 5)), btd = L.filter(o => !(o.lift && o.lift.tdErrMm <= 5 && o.lift.tdPeakN <= 0.25 * o.W));
  add("V7", E5.length === 16 && E20.length === 16 && !b5.length && !b20.length && !btd.length, `2.5 cm: 5 mm hover error ≤ ${f2(mx(E5.map(o => o.lift.hoverErrMax)))} mm (≤ 3), RMS ≤ ${f2(mx(E5.map(o => o.lift.hoverErrRms)))} (≤ 2), clearance ≥ 3 mm fraction ≥ ${f2(mn(E5.map(o => o.lift.clearFrac06)))} (≥ 0.8); 20 mm hover error ≤ ${f2(mx(E20.map(o => o.lift.hoverErrMax)))} mm (≤ 5); all lifts: touchdown error ≤ ${f2(mx(L.map(o => o.lift && o.lift.tdErrMm)))} mm (≤ 5), impact ≤ ${f2(mx(L.map(o => o.lift && o.lift.tdPeakN / o.W * 100)))} % BW (≤ 25)${b5.length || b20.length || btd.length ? "; failing " + ids([...b5, ...b20, ...btd]) : ""}`);
  rep("V7.1p5", `1.5 cm (reported): 5 mm hover error ≤ ${f2(mx(L.filter(o => o.run.liftName === "E5" && o.run.drop === 0.015).map(o => o.lift.hoverErrMax)))} mm, 20 mm ≤ ${f2(mx(L.filter(o => o.run.liftName === "E20" && o.run.drop === 0.015).map(o => o.lift.hoverErrMax)))} mm; liftoff after the command ${f2(mn(L.map(o => o.lift.liftoff - o.lift.tL)))}–${f2(mx(L.map(o => o.lift.liftoff - o.lift.tL)))} s`); }
// V8 fast body motion over the released foot
{ const P = get(r => r.set === "FAST" && r.arm === "P"), bad = P.filter(o => { const c = R[o.id.replace(/_P$/, "_C")]; return o.fell || o.chatter > 0 || !(o.slipPertMm <= 20) || !c || rank(o.outcome) > rank(c.outcome); });
  const oc = (A) => JSON.stringify(A.reduce((m, o) => ((m[o.outcome] = (m[o.outcome] || 0) + 1), m), {}));
  add("V8", P.length === 128 && !bad.length, `${P.length - bad.length}/${P.length}: no fall, no chatter, resting-foot contact-point slip from the perturbation ≤ ${f2(mx(P.map(o => o.slipPertMm)))} mm (≤ 20), outcome no worse than C; P ${oc(P)} vs C ${oc(get(r => r.set === "FAST" && r.arm === "C"))}${bad.length ? "; failing " + ids(bad) : ""}`);
  for (const fn of ["PF4", "PB4", "PT4", "PA4", "TUp15", "TUn15", "BU3", "BD3"]) { const a = P.filter(o => o.run.fast === fn), c = get(r => r.set === "FAST" && r.arm === "C" && r.fast === fn); rep(`V8.${fn}`, `slip P ≤ ${f2(mx(a.map(o => o.slipPertMm)))} mm vs C ≤ ${f2(mx(c.map(o => o.slipPertMm)))} mm; yaw P ≤ ${f2(mx(a.map(o => o.yawMaxDeg)))}°`); } }
// V9 energy, torque continuity, limits, no forcing (candidate runs)
{ const L = get(r => r.flags && r.flags.lcVff === "lin" && ["REL", "REL0", "LIFT", "RATE", "DET", "W"].includes(r.set)), F = get(r => r.set === "FAST" && r.arm === "P");
  const bad = L.filter(o => !(energyOk(o) && torqueOk(o))), bf = F.filter(o => !energyOk(o) || (!o.run.push && !torqueOk(o)));
  add("V9", !bad.length && !bf.length, `${L.length + F.length - bad.length - bf.length}/${L.length + F.length}: closure ≤ ${mx([...L, ...F].map(o => o.closMax)).toExponential(2)} J/tick, Σ+ ≤ ${f2(mx([...L, ...F].map(o => o.closPos)), 3)} J; applied Δτ ≤ ${f2(mx(L.map(o => o.dTauMaxNonOnset)))} N·m non-onset / ${f2(mx(L.map(o => o.dTauMax)))} all; Δτ0 ≤ ${f2(mx(L.map(o => o.dTau0Max)))} N·m; over-capacity ${mx([...L, ...F].map(o => o.overCap))}; authority 0; impulse = scheduled${bad.length || bf.length ? "; failing " + ids([...bad, ...bf]) : ""}`); }
// V10 rates
{ const L = get(r => r.set === "RATE"), bad = L.filter(o => (o.run.lift ? !seqOk(o) : o.fell || o.chatter > 0) || !(o.closMax <= 0.05 && o.closPos <= 0.5));
  add("V10", L.length === 32 && !bad.length, `${L.length - bad.length}/${L.length} at 180 / 480 Hz: 5 mm lift sequence / 15° turn without fall or chatter; energy${bad.length ? "; " + ids(bad) : ""}`); }
// V11 determinism
{ const D = get(r => r.set === "DET"), pairs = {}; for (const o of D) (pairs[o.id.replace(/_rep\d$/, "")] ||= []).push(o); const ok = Object.values(pairs).filter(p => p.length === 2 && JSON.stringify(p[0].hashes) === JSON.stringify(p[1].hashes));
  add("V11", Object.keys(pairs).length === 3 && ok.length === 3, `${ok.length}/3 pairs bit-identical`); }
// V12 browser = Node
{ let b = null; try { b = JSON.parse(fs.readFileSync(BR)); } catch (e) {} add("V12", b && b.allPass && b.rows.length === 3, b ? `${b.rows.filter(x => x.pass).length}/${b.rows.length}: ${b.rows.map(x => `${x.id} ${x.browser}/${x.node}`).join(", ")}` : "browser check not run"); }
// V13 external-lift harness matrix (the V3.9 rule)
{ let rows = []; try { rows = fs.readdirSync(BD).filter(f => f.endsWith(".json")).map(f => JSON.parse(fs.readFileSync(path.join(BD, f)))); } catch (e) {}
  const bad = rows.filter(r => /fell/.test(r.outcome) || r.chatterL !== 0 || !(r.closure.maxPerTickJ <= 0.05));
  add("V13", rows.length === 32 && !bad.length, `${rows.length - bad.length}/${rows.length} (8 bodies × 30 / 60 N × drop 0 / 2.5 cm): no fall, no chatter, closure ≤ ${rows.length ? mx(rows.map(r => r.closure.maxPerTickJ)).toExponential(2) : "—"} J/tick; applied Δτ ≤ ${f2(mx(rows.map(r => r.maxAppliedTorqueStep)))} N·m, τ0 Δ ≤ ${f2(mx(rows.map(r => r.maxTau0Step)))} (reported)${bad.length ? "; failing " + bad.map(r => r.human + " F" + r.F).join(", ") : ""}`); }
// V14 scope: official touch-rest runs reproduce hash-identically (new code inactive without its flags)
{ const L = get(r => r.set === "REPRO"), bad = L.filter(o => { const f = path.join(TRD, o.run.touchrestId + ".json"); if (!fs.existsSync(f)) return true; const t = JSON.parse(fs.readFileSync(f)); return JSON.stringify(t.hashes) !== JSON.stringify(o.hashes); });
  add("V14", L.length === 3 && !bad.length, `${L.length - bad.length}/${L.length} official touch-rest runs hash-identical`); }
// V15 G0–G3 regression of the candidate
{ let g = null; try { g = JSON.parse(fs.readFileSync(RG)); } catch (e) {} add("V15", !!(g && g.pass), g ? Object.entries(g).filter(([k, v]) => v && v.pass !== undefined && k !== "pass").map(([k, v]) => `${k} ${v.pass ? "PASS" : "FAIL"}`).join(", ") : "regression not run"); }
// reported: straight-leg 2 s transfer (R1 regime)
{ const L = get(r => r.set === "REL0"); rep("REL0", `drop 0, 2 s transfer: release − ramp end ${f2(mn(L.map(o => (o.tRel ?? 99) - 5)))}…${f2(mx(L.map(o => (o.tRel ?? -99) - 5)))} s; ${L.filter(o => o.released && postOk(o)).length}/${L.length} with clean rest after release`); }
out.pass = Object.values(out.criteria).every(c => c.pass);
console.log(`\nPRE-SWING VALIDATION: ${out.pass ? "PASS" : "FAIL"}`); if (OUT) fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
