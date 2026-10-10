// RH1 AUDIT — G3 rows of ONE body run in V2-REF's rows by the frozen tools/g3_run.js (substituted copy, exactly as rh1_battery.sh ran RH1)
// (2026-10-11 audit, documentation only; no criterion change). The evaluation is rh1_gate_eval.mjs's G3 section with the body as a parameter:
// frozen gates/v2_g3_checks_v33.js on the run with the body relabelled to the evaluator's "V2-REF" (T9 / T9U of other bodies dropped; xstand
// stripped as tools/qual_eval.mjs), K′ with the body's own k_premise margins. The J2a / J2b rows need a mirror run and are reported "not run" here.
// Self-check: applied to RH1's committed battery run it must reproduce the RH1 G3 rows of the committed gate_eval.json exactly.
// usage (cwd = any): node rh1_audit_g3_body.mjs <body id> <g3 results json[.gz]> <k_premise margins json> [out.json] [--selfcheck=<committed gate_eval.json>]
import fs from "fs"; import zlib from "zlib";
import { evaluateV33 } from "../../../../sandbox/visual/physchar2/gates/v2_g3_checks_v33.js";
const [BODY, G3F, MF, OUTF] = process.argv.slice(2).filter(a => !a.startsWith("--")), SELF = (process.argv.find(a => a.startsWith("--selfcheck=")) || "").slice(12);
const rd = (f) => JSON.parse(f.endsWith(".gz") ? zlib.gunzipSync(fs.readFileSync(f)) : fs.readFileSync(f));
const strip = (g) => { for (const j of g.jobs) if (j.xstand && j.stand) { const st = { ...j.stand }; for (const k of Object.keys(j.xstand)) if (JSON.stringify(st[k]) === JSON.stringify(j.xstand[k])) delete st[k]; if (Object.keys(st).length) j.stand = st; else delete j.stand; delete j.xstand; } return g; };
const gr = strip(rd(G3F)), M = rd(MF), marg = Object.fromEntries(M.filter(r => r.human).map(r => [r.human, r.marginCm])), rows = [];
const idsR = [...new Set(gr.jobs.filter(j => !["T9", "T9U"].includes(j.group)).map(j => j.human))];
const row = (id, pass, value) => { rows.push({ id, pass, value: String(value) }); console.log(`${pass === null ? "rep " : pass ? "PASS" : "FAIL"} G3 ${id.padEnd(7)} [${BODY}] ${String(value).slice(0, 300)}`); };
row("rows-id", idsR.length === 1 && idsR[0] === BODY, `non-T9 jobs run on ${idsR.join(", ")}; ${gr.jobs.length} jobs, ${gr.jobs.filter(j => j.error).length} errors`);
const jr = { ...gr, jobs: gr.jobs.filter(j => !["T9", "T9U"].includes(j.group) || j.human === BODY).map(j => (j.human === BODY ? { ...j, human: "V2-REF" } : j)) };
const Er = evaluateV33(jr, { mirrorV3: null });
const t11 = jr.jobs.filter(j => /^T11:over/.test(j.key) && j.res && j.group !== "determinism").map(j => { const lam = +j.key.split(":")[2], m = marg[BODY] ? marg[BODY][String(lam)] ?? marg[BODY][lam] : null; return { key: j.key, lam, marginCm: m, excessive: m != null && m < 0, outcome: j.res.outcome }; });
const notStable = (x) => /fell|relocated|not settled/.test(x || ""), kp = t11.some(r => r.excessive) && t11.filter(r => r.excessive).every(r => notStable(r.outcome));
const SKIP = { P2: 1, S2: 1, O: 1, I2: 1, J2a: 1, J2b: 1 };
for (const c of Er.checks) { if (SKIP[c.id]) continue;
  if (c.id === "K") { row("K′", kp, `[original K ${c.pass ? "PASS" : "FAIL"}] ` + t11.map(r => `${r.key}: margin ${r.marginCm} cm → ${r.excessive ? "EXCESSIVE" : "feasible"}; ${r.outcome}`).join(" · ")); continue; }
  row(c.id, c.reportOnly ? null : c.pass, String(c.value).slice(0, 600)); }
console.log("not evaluated here: P2 / S2 / O (replaced or declared in the battery), I2 (per body from the 10-body run), J2a / J2b (need the mirror run)");
let self = null;
if (SELF) { const G = rd(SELF).rows.filter(r => r.item === "G3" && r.body === "RH1" && !["I2", "J2a", "J2b", "J2a-n"].includes(r.id)), bad = [];
  for (const r of rows) { const g = G.find(x => x.id === r.id); if (!g || g.pass !== r.pass || g.value !== r.value) bad.push(r.id); }
  self = { compared: rows.length, mismatched: bad }; console.log(`self-check against the committed gate_eval.json (RH1 G3 rows): ${rows.length - bad.length}/${rows.length} identical${bad.length ? "; MISMATCH " + bad.join(", ") : ""}`); }
if (OUTF) fs.writeFileSync(OUTF, JSON.stringify({ tool: "rh1_audit_g3_body.mjs", body: BODY, input: G3F, rows, Kprime: t11, selfCheck: self }, null, 1));
