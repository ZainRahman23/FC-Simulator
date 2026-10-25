// occupy3/tools/o3_variants.mjs — THE CHOICES, compared on one set: STAGE 3 as built against its alternatives (RES3 overrides), every other input
// identical — the deepest torso / leg penetration, the ticks > 5 cm, the drawn pelvis's jolts, crossed legs, the responses' severities and balance
// outcomes, the recovery steps, the fall candidates, the time to regain balance.
//   V='{"name":{…RES3 overrides}, …}' node o3_variants.mjs --set matrix [--base 1]
import { setOf } from "./o3_identity.mjs";
import { measure } from "./o3_metrics.mjs";
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; }, SET = arg("set", "matrix"), V = JSON.parse(process.env.V || "{}");
const L = setOf(SET).filter((tc) => !tc.onlyCommitted), variants = Object.assign(arg("base", "1") === "1" ? { "STAGE 3 (as built)": {} } : {}, V), out = {};
for (const [name, imp] of Object.entries(variants)) { const R = L.map((tc) => measure(tc, "S3", Object.keys(imp).length ? imp : undefined)); out[name] = R; process.stderr.write(`${name} `); }
const cm = (v) => (v * 100).toFixed(1), P = (R) => R.flatMap((o) => o.eps.flatMap((e) => ["ATT", "DEF"].filter((k) => e.players[k]).map((k) => e.players[k]))), cnt = (A, f, v) => A.filter((x) => f(x) === v).length, med = (A) => { const s = A.slice().sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : null; };
const rows = [["deepest torso (cm)", (R) => cm(Math.max(...R.map((o) => o.torso)))], ["deepest legs (cm)", (R) => cm(Math.max(...R.map((o) => o.legs)))], ["ticks with a pair > 5 cm", (R) => R.reduce((a, o) => a + o.ticks5, 0)],
  ["pelvis jolts > 2 / > 4 cm per frame²", (R) => `${R.reduce((a, o) => a + o.jolt.f2, 0)} / ${R.reduce((a, o) => a + o.jolt.f4, 0)}`], ["largest pelvis jolt (cm)", (R) => cm(Math.max(...R.map((o) => o.jolt.max)))], ["crossed-legs ticks", (R) => R.reduce((a, o) => a + o.crossed, 0)],
  ["responses LIGHT / MODERATE / STRONG / SEVERE", (R) => { const A = P(R); return ["LIGHT", "MODERATE", "STRONG", "SEVERE"].map((v) => cnt(A, (x) => x.sev, v)).join(" / "); }], ["balance CORRECT / STEP / STAGGER / FALL", (R) => { const A = P(R); return [["CORRECT"], ["RECOVERY STEP"], ["STAGGER CANDIDATE"], ["FALL CANDIDATE"]].map(([v]) => cnt(A, (x) => x.cls, v)).join(" / "); }],
  ["recovery steps · largest (cm)", (R) => { const S = P(R).flatMap((x) => x.steps); return `${S.length} · ${S.length ? cm(Math.max(...S.map((s) => s.d))) : "—"}`; }], ["peak drawn pelvis offset (cm)", (R) => cm(Math.max(0, ...P(R).map((x) => x.peakP)))], ["peak overflow (cm)", (R) => cm(Math.max(0, ...P(R).map((x) => x.peakO)))],
  ["balance regained (median s)", (R) => { const m = med(P(R).filter((x) => x.regainAfter != null).map((x) => x.regainAfter)); return m == null ? "—" : m.toFixed(2); }], ["peak trunk lean (°) · rotation (°)", (R) => `${Math.max(0, ...P(R).map((x) => x.peakLean)).toFixed(1)} · ${Math.max(0, ...P(R).map((x) => x.peakYaw)).toFixed(1)}`]];
console.log(`\nTHE CHOICES — set ${SET} (${L.length} encounters), STAGE 3 variants on identical inputs`); const names = Object.keys(out), W = 30;
console.log(`${"".padEnd(46)}${names.map((n) => n.slice(0, W - 2).padStart(W)).join("")}`); for (const [l, f] of rows) console.log(`${l.padEnd(46)}${names.map((n) => String(f(out[n])).padStart(W)).join("")}`);
