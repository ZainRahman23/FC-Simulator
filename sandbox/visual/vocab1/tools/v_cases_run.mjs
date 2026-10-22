// vocab1/tools/v_cases_run.mjs — every curated case of the Dribbling Lab (v_cases.js), run in node with the Lab's own runner (v_run.js): the
// result of each request, the technique phases (decisive · control returned · the next action), possession, and (--body 1) the posed body
//   node v_cases_run.mjs [--body 1] [--only <substring>] [--json f]
import fs from "node:fs";
import { ENV, makeSim } from "./u_env.mjs";
import { presetLayers } from "../c_sim.js";
import { CASES, CHAINS } from "../v_cases.js";
import { caseOpts, runCaseOn, summarize } from "../v_run.js";
import { measure } from "./v_extreme.mjs";
const AR = process.argv, opt = (k, d) => { const i = AR.indexOf("--" + k); return i > 0 ? AR[i + 1] : d; }, body = opt("body", "0") === "1", only = opt("only", null), out = [];
for (const c of CASES.concat(CHAINS)) { const name = `${c.tech}·${c.variant}${c.name ? "·" + c.name : ""}`; if (only && !name.includes(only)) continue;
  const sim = makeSim("TL", Object.assign(caseOpts(c), { layers: presetLayers("FULL") })), r = runCaseOn(sim, c), S = summarize(sim, r.t0), m = body ? measure(sim, Math.round(r.clip[0] * 240), 0) : null;
  const sk = S.skills.map((x) => `${x.intent} ${x.result}${x.result === "REJECTED" || x.result === "CANCELLED" ? ` → ${x.alt} (${Object.keys(x.rej || {}).slice(0, 2).join("; ")})` : ""}`).join(" + ");
  const ph = S.phases.map((p) => `${p.label}${p.tDecisive != null ? ` @${p.tDecisive.toFixed(2)} ctl+${p.tControl != null ? (p.tControl - p.tDecisive).toFixed(2) : "?"}${p.tNext != null ? ` next ${p.next} @${p.tNext.toFixed(2)}` : ""}` : " (no decisive)"}`).join(" → ");
  out.push(Object.assign({ name, variant: c.variant, tech: c.tech }, S, m ? { body: m.N, kinds: m.kinds } : {}));
  console.log(`${name.slice(0, 58).padEnd(58)} ${sk || "AUTO"} | ${ph.slice(0, 160)} | sep ${S.sepMax.toFixed(2)}${S.exits.length ? " EXITS " + S.exits : ""}${S.missed ? " MISSED " + S.missed : ""}${m ? ` | body ${m.N.normal}/${m.N.slow}` : ""}`); }
const played = out.filter((x) => x.skills.length && x.skills.every((s) => s.result === "PLAYED")).length, req = out.filter((x) => x.skills.length).length;
console.log(`■ ${out.length} cases · ${played}/${req} with every request PLAYED · possession exits ${out.reduce((a, x) => a + x.exits.length, 0)} · missed contacts ${out.reduce((a, x) => a + x.missed, 0)}${body ? ` · body normal-visible ${out.reduce((a, x) => a + x.body.normal, 0)} (cases with any: ${out.filter((x) => x.body.normal).length})` : ""}`);
if (opt("json")) fs.writeFileSync(opt("json"), JSON.stringify(out, null, 1));
