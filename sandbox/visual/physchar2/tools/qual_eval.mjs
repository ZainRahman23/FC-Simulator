// ═══ physchar2/tools/qual_eval.mjs — corrected-knee qualification v2 (review_artifacts/physical_character_v2/knee_correction/QUALIFICATION_V2_PREREG.md
// Q3d / Q3e / Q5b): evaluates the G2 and G3 runs of the ADOPTED E1a configuration (v2k + k 0.13 + reference twist + lifecycle, set run-wide) with the
// SAME evaluators as the gates (G2 criteria v1 rows; G3 criteria v3.3 rows), using the RE-MEASURED browser checks (G2 D, G3 O) and the re-measured
// J2a mirror run of that configuration. Superseding: G3 row K → K′ (the T11 target-feasibility rule, tools/close_eval.mjs; the original K is printed
// next to it). Replaced rows (listed, not silently dropped): G2 R and G3 P2 "earlier gates unchanged" (a new configuration changes every hash by
// design — replaced by Q3a–c / Q5 of the qualification); G2 2.5 and G3 S2 controller cost (not re-measured: final_pre_e1a/RATE_PERFORMANCE.md §2).
// usage: node tools/qual_eval.mjs --g2=<g2 results> --g2browser=<json> --g3=<g3 results> --g3browser=<json> --mirror=<g3_mirror_v3 json>
//          --margins=<k_premise json> --ra=<accepted review_artifacts/physical_character_v2 dir> [--out=<json>]
import fs from "fs"; import path from "path";
import { evaluate as evalG2 } from "../gates/v2_g2_checks.js"; import { evaluateV33 } from "../gates/v2_g3_checks_v33.js";
const arg = (k, d) => (process.argv.find(a => a.startsWith(`--${k}=`)) || `--${k}=${d}`).split("=").slice(1).join("=");
const rd = (f) => { try { return JSON.parse(fs.readFileSync(f)); } catch (e) { return null; } }, RA = arg("ra", ""), ra = (f) => rd(path.join(RA, f)), out = {};
const g2 = rd(arg("g2", "")), g3 = rd(arg("g3", "")), M = rd(arg("margins", ""));
if (!g2 || !g3 || !M) throw new Error("missing input");
// G2
const REPL2 = { R: "replaced by Q3a–c (earlier gates in the adopted configuration)", "2.5": "controller cost: not re-measured (RATE_PERFORMANCE.md §2)" };
const E2 = evalG2(g2, { browser: rd(arg("g2browser", "")), regression: null });
const r2 = E2.checks.map(c => ({ id: c.id, pass: c.pass, value: String(c.value).slice(0, 220), replaced: REPL2[c.id] || null }));
const gat2 = r2.filter(c => !c.replaced && !c.reportOnly);
out.G2 = { xstand: g2.xstand, rows: r2, pass: gat2.every(c => c.pass) };
console.log(`G2 (xstand ${JSON.stringify(g2.xstand)}): ${gat2.filter(c => c.pass).length}/${gat2.length} gating rows pass → ${out.G2.pass ? "PASS" : "FAIL"}`);
for (const c of r2) console.log(`   ${c.replaced ? "—   " : c.pass ? "PASS" : "FAIL"} ${c.id}: ${c.replaced ? "(" + c.replaced + ") " : ""}${c.value}`);
// G3 (strip the run-wide xstand from each job's stand, as tools/g4cfg_eval.mjs, so the evaluator sees the scenario's own options)
for (const j of g3.jobs) if (j.xstand && j.stand) { const st = { ...j.stand }; for (const k of Object.keys(j.xstand)) if (JSON.stringify(st[k]) === JSON.stringify(j.xstand[k])) delete st[k]; if (Object.keys(st).length) j.stand = st; else delete j.stand; delete j.xstand; }
const E3 = evaluateV33(g3, { browser: rd(arg("g3browser", "")), regression: ra("g3/json/g3_regression.json"), mirrorPairs: ra("g3/json/g3_mirror_pairs.json"), earlier: ra("g3/json/g3_earlier.json"), bench: ra("g3/json/g3_bench.json"), mirrorV3: rd(arg("mirror", "")), g2checks: ra("g2/json/g2_checks.json") });
// K′ (superseding K): every T11 "over" request whose target lies OUTSIDE the stance foot's usable region is not realised as a stable stance
const notStable = (o) => /fell|relocated|not settled/.test(o || ""), marg = Object.fromEntries(M.filter(r => r.human).map(r => [r.human, r.marginCm]));
const t11 = g3.jobs.filter(j => /^T11:over/.test(j.key) && j.res && j.group !== "determinism").map(j => { const lam = +j.key.split(":")[2], h = j.human || j.res.human || "V2-REF", m = marg[h] ? marg[h][String(lam)] ?? marg[h][lam] : null;
  return { key: j.key, human: h, lam, marginCm: m, excessive: m != null && m < 0, outcome: j.res.outcome }; });
const kp = t11.some(r => r.excessive) && t11.filter(r => r.excessive).every(r => notStable(r.outcome));
const REPL3 = { P2: "replaced by Q3a–d and Q5 (earlier gates and browser checks in the adopted configuration)", S2: "controller cost: not re-measured (RATE_PERFORMANCE.md §2)" };
const r3 = E3.checks.map(c => ({ id: c.id, pass: c.pass, reportOnly: !!c.reportOnly, value: String(c.value).slice(0, 220), replaced: REPL3[c.id] || null }));
const kRow = r3.find(c => c.id === "K"); if (kRow) { kRow.superseded = { by: "K′", pass: kp, rows: t11 }; }
const gat3 = r3.filter(c => !c.replaced && !c.reportOnly), pass3 = gat3.every(c => (c.id === "K" ? kp : c.pass));
out.G3 = { xstand: g3.xstand || null, rows: r3, Kprime: { pass: kp, rows: t11 }, pass: pass3 };
console.log(`G3 v3.3 (adopted configuration; K → K′): ${gat3.filter(c => (c.id === "K" ? kp : c.pass)).length}/${gat3.length} gating rows pass → ${pass3 ? "PASS" : "FAIL"}`);
for (const c of r3) console.log(`   ${c.replaced ? "—   " : c.reportOnly ? "rep " : (c.id === "K" ? kp : c.pass) ? "PASS" : "FAIL"} ${c.id}: ${c.replaced ? "(" + c.replaced + ") " : ""}${c.id === "K" ? `[original K ${c.pass ? "PASS" : "FAIL"}; K′ ${kp ? "PASS" : "FAIL"}] ` : ""}${c.value}`);
for (const r of t11) console.log(`      ${r.key} ${r.human}: target margin ${r.marginCm} cm → ${r.excessive ? "EXCESSIVE" : "feasible"}; outcome ${r.outcome}`);
const outc = {}; for (const j of g3.jobs) if (j.res) outc[j.res.outcome] = (outc[j.res.outcome] || 0) + 1; console.log(`   G3 outcomes: ${JSON.stringify(outc)} over ${g3.jobs.length} jobs`);
const o = arg("out", ""); if (o) fs.writeFileSync(o, JSON.stringify(out, null, 1));
