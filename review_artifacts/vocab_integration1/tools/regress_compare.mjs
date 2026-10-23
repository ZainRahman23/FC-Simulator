// regress_compare.mjs — DRIBBLING VOCABULARY INTEGRATION: the regression suites of the integrated library (vocab2) against LEG-WAVE V4's
// (croqlw, b489e4fd — review_artifacts/croqueta_lw/evidence, produced by the same commands), line by line. Each differing line is classed:
//   REQUEST  the line makes a BODY FEINT / CROQUETA request, or one of the retired entries (the old overlay feint, the feint → cut combos, the
//            unreviewed feint depths) — the integration changes these by design;
//   OTHER    anything else — a regression unless explained.
// Run for vocab2 as built (A) and with the old analog feint restored (ABL=analogfeint, B): B ≡ croqlw outside REQUEST lines shows that the
// analog feint's removal is the only change to ordinary play.
//   node regress_compare.mjs [--suite cases,battery,…]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, "../../..");
const OLD = path.join(ROOT, "review_artifacts/croqueta_lw/evidence"), NEW = path.join(ROOT, "review_artifacts/vocab_integration1/evidence/regression");
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
const SUITES = (arg("suite") || "cases,battery,extreme_ball_on,extreme_ball_off,body_torture_18,torture_page_40,intent_torture").split(",");
const REQ = /BODY_FEINT|BODY FEINT|CROQUETA|FEINT_OUTSIDE_CUT|FEINT_INSIDE_CUT|SHALLOW|STRONG|OLD \(VOCAB-1\)|BFEINT/;
// (the CPU figures differ run to run — masked before comparing)
const norm = (l) => l.replace(/CPU [0-9.]+ ms per simulated s(, worst tick [0-9.]+ ms)?/g, "CPU — ms").replace(/[0-9.]+ ms CPU/g, "— ms CPU").replace(/worst tick [0-9.]+ ms/g, "worst tick — ms").trimEnd();
const out = [];
for (const s of SUITES) { const fo = path.join(OLD, s + ".txt"); if (!fs.existsSync(fo)) { console.log(`${s}: no croqlw evidence`); continue; }
  const a = fs.readFileSync(fo, "utf8").split("\n").map(norm);
  for (const [lab, file] of [["A · vocab2", s + ".txt"], ["B · vocab2 + ABL=analogfeint", s + "__abl_analogfeint.txt"]]) { const fn = path.join(NEW, file); if (!fs.existsSync(fn)) { console.log(`${s} ${lab}: not run`); continue; }
    const b = fs.readFileSync(fn, "utf8").split("\n").map(norm), n = Math.max(a.length, b.length), diff = [];
    for (let i = 0; i < n; i++) if ((a[i] || "") !== (b[i] || "")) diff.push({ i, old: a[i] || "", now: b[i] || "", cls: REQ.test((a[i] || "") + (b[i] || "")) ? "REQUEST" : "OTHER" });
    const req = diff.filter((d) => d.cls === "REQUEST"), oth = diff.filter((d) => d.cls === "OTHER"), sum = (L) => L.filter((l) => /^■/.test(l)).join(" ‖ ");
    out.push({ suite: s, lane: lab, lines: n, differ: diff.length, request: req.length, other: oth.length, oldSummary: sum(a), newSummary: sum(b), others: oth.slice(0, 40) });
    console.log(`\n■ ${s} · ${lab}: ${n} lines · identical ${n - diff.length} · differ ${diff.length} (REQUEST ${req.length} · OTHER ${oth.length})`);
    console.log(`   croqlw: ${sum(a).slice(0, 300)}`); console.log(`   now:    ${sum(b).slice(0, 300)}`);
    for (const d of oth.slice(0, +arg("show", 12))) { console.log(`   OTHER line ${d.i + 1}:`); console.log(`     croqlw ${d.old.slice(0, 240)}`); console.log(`     now    ${d.now.slice(0, 240)}`); } } }
if (arg("json")) fs.writeFileSync(arg("json"), JSON.stringify(out, null, 1));
