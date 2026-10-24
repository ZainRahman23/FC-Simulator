// review_artifacts/tackling_integration1/tools/milestone_regress.mjs — TACKLING INTEGRATION V1: the milestone's own regression evidence, reproduced in
// this branch (copied from the left-stick branch's runner). The tackling work adds files only (sandbox/visual/tackle1/, tackle1_lab.html, this folder); no canonical file is changed. This re-runs the
// DRIBBLING VOCABULARY INTEGRATION's suites (sandbox/visual/vocab2/tools, the commands of review_artifacts/vocab_integration1/HANDOFF.md) and
// compares each output with the evidence committed at the milestone (f775daac), line by line, the CPU timings masked (they vary run to run).
//   node milestone_regress.mjs --out <dir> [--only name,name]
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, "../../.."), TOOLS = path.join(ROOT, "sandbox/visual/vocab2/tools"), EV = path.join(ROOT, "review_artifacts/vocab_integration1/evidence");
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; }, OUT = arg("out"), ONLY = arg("only") ? arg("only").split(",") : null; fs.mkdirSync(OUT, { recursive: true });
const RUNUPS = [2.2, 2.25, 2.3, 2.35, 2.4, 2.45, 2.5, 2.55, 2.6, 2.65, 2.7, 2.75, 2.8, 2.85, 2.9, 2.95, 3.0].join(",");
const SUITES = [
  ["reproduction_vs_croqlw", "the approved motions ≡ their review builds (Croqueta LEG-WAVE V4 + Body Feint): every joint + ball, every tick", ["lib_repro.mjs", "--a", "../../croqlw/", "--set", "all"]],
  ["reproduction_vs_feint2ef", "the Body Feint (video-guided + exit foot) ≡ feint2ef: six approved cases + mirror", ["lib_repro.mjs", "--a", "../../feint2ef/", "--set", "bodyfeint"]],
  ["lab_cases", "the Lab's integrated cards: approved · ordinary play · declined", ["lib_vi_cases.mjs"]],
  ["chains", "the 7 curated vocabulary chains × mirror, each simulated twice (determinism)", ["lib_chains.mjs"]],
  ["bf_sweep_right_footed", "the Body Feint's entry envelope from ordinary play", ["lib_bf_sweep.mjs", "--angles", "25,30,35,40,45,50,55,60,65", "--transitions", "--delays", "0.1,0.2,0.3,0.45,0.6,0.8,1.0,1.3"]],
  ["croq_sweep", "the Croqueta's entry envelope (no foot hint)", ["lib_croq_sweep.mjs", "--hints", "none", "--angles", "35,38,40,42,45,48,50", "--runups", RUNUPS, "--transitions", "--delays", "0.1,0.3,0.6,0.8,1.0,1.15,1.3,1.6", "--from", "WALK,RUN"]],   // (the delays the committed file shows; the tool's default list differs)
  ["regression/cases", "the 122 curated vocabulary cases (the ordinary vocabulary, the body)", ["v_cases_run.mjs", "--body", "1"]],
  ["regression/battery", "the technique battery", ["v_battery.mjs"]],
  ["regression/determinism", "18 seeds × 30 s simulated twice + re-simulated from the record", ["v_det.mjs", "--seeds", "18", "--dur", "30"]],
  ["regression/torture_page_40", "possession torture: 40 seeds × 60 s (CONTROLLED · D38 · EXPANDED · CARRY-B)", ["c_torture.mjs", "--configs", "CONTROLLED", "--seeds", "40", "--dur", "60", "--pace", "D38", "--vocab", "EXPANDED", "--carry", "B", "--verbose"]],
];
const norm = (l) => l.replace(/CPU [0-9.]+ ms per simulated s(, worst tick [0-9.]+ ms)?/g, "CPU — ms").replace(/[0-9.]+ ms CPU/g, "— ms CPU").replace(/worst tick [0-9.]+ ms/g, "worst tick — ms").replace(/in [0-9.]+ ms/g, "in — ms").replace(/[0-9.]+ s wall/g, "— s wall").trimEnd();
const rows = []; let bad = 0;
for (const [name, what, cmd] of SUITES) { if (ONLY && !ONLY.includes(name)) continue; const ref = path.join(EV, name + ".txt"), outF = path.join(OUT, name.replace("/", "__") + ".txt"), t0 = Date.now();
  let txt; try { txt = execFileSync("node", cmd, { cwd: TOOLS, encoding: "utf8", maxBuffer: 1 << 28 }); } catch (e) { txt = (e.stdout || "") + "\nEXIT " + e.status; }
  fs.writeFileSync(outF, txt); const A = fs.readFileSync(ref, "utf8").split("\n").map(norm), B = txt.split("\n").map(norm), n = Math.max(A.length, B.length); let d = 0, first = null;
  for (let i = 0; i < n; i++) if ((A[i] || "") !== (B[i] || "")) { d++; if (!first) first = `line ${i + 1}: committed «${(A[i] || "").slice(0, 140)}» now «${(B[i] || "").slice(0, 140)}»`; }
  if (d) bad++; rows.push({ name, what, cmd: "node " + cmd.join(" "), lines: n, differ: d, first, s: Math.round((Date.now() - t0) / 1000) });
  console.log(`${d ? "DIFF" : "SAME"}  ${name.padEnd(28)} ${String(n).padStart(4)} lines · ${d} differ · ${String(Math.round((Date.now() - t0) / 1000)).padStart(4)} s · ${what}${first ? "\n      " + first : ""}`); }
console.log(`\n${bad ? `${bad} suite(s) differ from the milestone's evidence` : `ALL ${rows.length} SUITES IDENTICAL to the milestone's committed evidence (CPU timings masked)`}`);
fs.writeFileSync(path.join(OUT, "milestone_regress.json"), JSON.stringify(rows, null, 1)); process.exit(bad ? 1 : 0);
