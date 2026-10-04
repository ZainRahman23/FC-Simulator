// ═══ physchar2/tools/g4cfg_eval.mjs — final pre-E1a stage §4 / §11: evaluates the G2 and G3 runs of the PROPOSED G4 configuration (scratch tree:
// reference twist policy + experimental lifecycle + ankle k + diagnostic knee envelope, all set run-wide) with the SAME evaluators as the gates
// (G2 criteria v1 rows; G3 criteria v3.3 rows). J2a / browser / bench / regression inputs are taken from the accepted runs (not re-measured here),
// as in tools/ank_reftwist_eval.mjs. Not a gate: evidence for the decision.
// usage: node tools/g4cfg_eval.mjs <dir with g2_g4cfg.json + g3_results_g4cfg.json> <accepted review_artifacts/physical_character_v2 dir>
import fs from "fs"; import path from "path";
import { evaluate as evalG2 } from "../gates/v2_g2_checks.js"; import { evaluateV33 } from "../gates/v2_g3_checks_v33.js";
const [DIR, RA] = process.argv.slice(2), rd = (d, f) => { try { return JSON.parse(fs.readFileSync(path.join(d, f))); } catch (e) { return null; } };
const g2 = rd(DIR, "g2_g4cfg.json"), g3 = rd(DIR, "g3_results_g4cfg.json");
if (g3) for (const j of g3.jobs) if (j.xstand && j.stand) { const st = { ...j.stand }; for (const k of Object.keys(j.xstand)) if (JSON.stringify(st[k]) === JSON.stringify(j.xstand[k])) delete st[k]; if (Object.keys(st).length) j.stand = st; else delete j.stand; delete j.xstand; }
if (g2) { const E2 = evalG2(g2, { browser: null, regression: null }), fail2 = E2.checks.filter(c => !c.pass && !["R", "2.5", "D"].includes(c.id));
  console.log(`G2 (xstand ${JSON.stringify(g2.xstand)}): ${E2.checks.filter(c => c.pass).length}/${E2.checks.length} rows pass; failing (excl. R, 2.5 timing, D browser — not re-measured): ${fail2.map(c => c.id + " " + String(c.value).slice(0, 140)).join(" | ") || "none"}`); }
if (g3) { const E3 = evaluateV33(g3, { browser: rd(RA, "g3/json/g3_browser.json"), regression: rd(RA, "g3/json/g3_regression.json"), mirrorPairs: rd(RA, "g3/json/g3_mirror_pairs.json"), earlier: rd(RA, "g3/json/g3_earlier.json"), bench: rd(RA, "g3/json/g3_bench.json"), mirrorV3: rd(RA, "g3/json/g3_mirror_v3.json"), g2checks: rd(RA, "g2/json/g2_checks.json") });
  const nat = E3.checks.filter(c => !c.reportOnly && !["J2a", "O", "P2", "S2"].includes(c.id));
  console.log(`G3 v3.3 native rows (excl. J2a / O browser / P2 / S2 bench — taken from the accepted runs): ${nat.filter(c => c.pass).length}/${nat.length}; failing: ${nat.filter(c => !c.pass).map(c => c.id + " " + String(c.value).slice(0, 160)).join(" | ") || "none"}`);
  const outc = {}; for (const j of g3.jobs) if (j.res) outc[j.res.outcome] = (outc[j.res.outcome] || 0) + 1; console.log(`   G3 outcomes: ${JSON.stringify(outc)} over ${g3.jobs.length} jobs`); }
