// occupy2/tools/o2_variants.mjs — THE STAGE 2 STUDIES (§9 look-ahead, §22 tolerance, §23 lean, the jolt levers): the review cases under Stage 2
// variants (RES2 overrides), beside OLD and Stage 1 — per variant: penetration (torso / legs: p99, max, ticks > 5 cm), continuity (root
// acceleration and jerk frames > 1 cm, the largest), support (the support consistency error: ordinary / committed part; forced plant
// releases), the unresolved ticks.   V='{"name": {res}, …}' node o2_variants.mjs [--set review] [--base 1]
import { ENV } from "../../occupy1/tools/o_env.mjs";
import { measure, summarize, setOf } from "./o2_metrics.mjs";
import { runO2 } from "../o2_run.js";
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; }, L = setOf(arg("set", "review")).filter((tc) => !tc.onlyCommitted || runO2(ENV, tc, "OLD", { record: false }).W.tk.act);
const V = JSON.parse(process.env.V || '{"S2":{}}'), rows = [], cm = (v) => (v * 100).toFixed(1);
const run = (name, mode, res) => { const R = { [mode]: L.map((tc) => measure(ENV, tc, mode, res)) }, s = summarize(R)[mode]; rows.push({ name, s }); process.stderr.write(`${name} `); };
if (arg("base", "1") === "1") { run("OLD", "OLD"); run("STAGE 1", "S1"); }
for (const [name, res] of Object.entries(V)) run(name, "S2", res);
console.log(`\n${L.length} encounters (${arg("set", "review")})`);
console.log(`${"variant".padEnd(30)}${"ORD torso max·>5".padStart(18)}${"ORD legs max·>5".padStart(17)}${"COM torso·>5".padStart(14)}${"COM legs·>5".padStart(13)}${"acc>1/2/4cm max".padStart(19)}${"jerk>1cm".padStart(10)}${"pelvis>2cm".padStart(11)}${"SCE ord/comm".padStart(15)}${"forced".padStart(8)}  unresolved`);
for (const { name, s } of rows) console.log(`${name.padEnd(30)}${`${cm(s.split.ordTRUNK.max)} ·${s.split.ordTRUNK.over5}`.padStart(18)}${`${cm(s.split.ordLEGS.max)} ·${s.split.ordLEGS.over5}`.padStart(17)}${`${cm(s.split.comTRUNK.max)} ·${s.split.comTRUNK.over5}`.padStart(14)}${`${cm(s.split.comLEGS.max)} ·${s.split.comLEGS.over5}`.padStart(13)}${`${s.cont.accOver1cm}/${s.cont.accOver2cm}/${s.cont.accOver4cm} ${cm(s.cont.accMax)}`.padStart(19)}${String(s.cont.jerkOver1cm).padStart(10)}${String(s.cont.pelvisJumps).padStart(11)}${`${cm(s.sup.sceMax)}/${cm(s.sup.sceCMax)}`.padStart(15)}${String(s.sup.forced).padStart(8)}  ${Object.entries(s.unresolved).map(([k, v]) => `${k.replace("UNRESOLVED ", "").replace(" (the stance budget)", "")} ${v}`).join(" · ")}`);
