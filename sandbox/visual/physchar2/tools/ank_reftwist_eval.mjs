// ═══ physchar2/tools/ank_reftwist_eval.mjs — ankle reinvestigation DIAGNOSTIC (not a gate, not a selection): evaluates the G2 / G3 runs made with
// the diagnostic controller option ikRefTwist (twist DOFs solved at reference; G3-A7, evaluated, not adopted) at a given k, with the SAME
// evaluators as the gates (G2 criteria v1 rows; G3 criteria v3.3 rows — J2a / J2b and the browser / bench rows are taken from the k's
// validated-controller run, i.e. not re-measured here), plus the twist probes and the static yaw stiffness. It shows whether the twist mechanism
// identified in ankle_plane/ANKLE_RESULTS.md §3 is the obstacle, and what the combined design would cost — for the user's decision.
// usage: node tools/ank_reftwist_eval.mjs <scratch review_artifacts/physical_character_v2 dir> <twist dir> [tag]
import fs from "fs"; import path from "path";
import { evaluate as evalG2 } from "../gates/v2_g2_checks.js"; import { evaluateV33 } from "../gates/v2_g3_checks_v33.js";
const [RA, TW, TAG] = process.argv.slice(2), rd = (f) => { try { return JSON.parse(fs.readFileSync(path.join(RA, f))); } catch (e) { return null; } };
const g2 = rd(TAG ? `g2/json/g2_results_${TAG}.json` : "g2/json/g2_results_xstand.json"), g3 = rd(`g3/json/g3_results_${TAG || "reftwist"}.json`);   // TAG: blend50 / tau2 (pre-G4 runway batteries)
// the run-wide diagnostic option is merged into every job's stand: strip exactly those keys so the evaluator treats the jobs as the gate jobs
for (const j of g3.jobs) if (j.xstand && j.stand) { const st = { ...j.stand }; for (const k of Object.keys(j.xstand)) if (st[k] === j.xstand[k]) delete st[k]; if (Object.keys(st).length) j.stand = st; else delete j.stand; delete j.xstand; }
const E2 = evalG2(g2, { browser: null, regression: null }), fail2 = E2.checks.filter(c => !c.pass && !["R", "2.5", "D"].includes(c.id));
console.log(`G2 (ikRefTwist, xstand ${JSON.stringify(g2.xstand)}): rows failing (excl. R, 2.5, D-browser): ${fail2.map(c => c.id + " " + String(c.value).slice(0, 80)).join(" | ") || "none"}`);
const S4 = E2.checks.find(c => c.id === "S4"); console.log(`   S4: ${S4.pass ? "pass" : "FAIL"} ${S4.value} ${JSON.stringify((S4.detail || []).map(x => `${x.axis}${x.H}:${x.trunk.toFixed(2)}°`))}`);
const E3 = evaluateV33(g3, { browser: rd("g3/json/g3_browser.json"), regression: rd("g3/json/g3_regression.json"), mirrorPairs: rd("g3/json/g3_mirror_pairs.json"), earlier: rd("g3/json/g3_earlier.json"), bench: rd("g3/json/g3_bench.json"), mirrorV3: rd("g3/json/g3_mirror_v3.json"), g2checks: rd("g2/json/g2_checks.json") });
const nat = E3.checks.filter(c => !c.reportOnly && !["J2a", "O", "P2", "S2"].includes(c.id));
console.log(`G3 (ikRefTwist) G3-native rows: ${nat.filter(c => c.pass).length}/${nat.length}; failing: ${nat.filter(c => !c.pass).map(c => c.id + " " + String(c.value).slice(0, 120)).join(" | ") || "none"}`);
const yaw = g3.jobs.filter(j => j.group === "yaw" && j.res).map(j => { const p = j.key.split(":"), m = j.res.g3.marks, dy = m.length === 2 ? m[1].yaw - m[0].yaw : null; return `${p[1]}/${p[2]}${j.stand ? " ref" : ""}: ${dy ? (+p[2] / Math.abs(dy)).toFixed(2) : "—"}`; });
console.log(`   static yaw stiffness N·m/° (all jobs run with ikRefTwist): ${yaw.join("; ")}`);
for (const f of fs.readdirSync(TW).filter(f => f.endsWith(".json"))) { const d = JSON.parse(fs.readFileSync(path.join(TW, f))), g = (n) => d.scenarios.find(s => s.name === n), mx = (s) => Math.max(s.excursionDeg.fabdL, s.excursionDeg.fabdR).toFixed(1);
  const bad = d.probes.filter(p => Math.abs(p.dFabdAfterReleaseDeg["5.9s"]) > 2).length; console.log(`   twist ${d.human} k ${d.ankleNeutralKPerDeg}: T5 ${mx(g("G3 T5"))}° U:R ${mx(g("G3 U:R"))}° G2 R:10 ${mx(g("G2 R:10"))}° G2 R:20 ${mx(g("G2 R:20"))}° T7:R:1 ${mx(g("G3 T7:R:1"))}°; probes not re-centred ${bad}/20`); }
