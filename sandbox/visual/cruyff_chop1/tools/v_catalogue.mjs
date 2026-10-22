// vocab1/tools/v_catalogue.mjs — writes VOCABULARY.md: every family and technique of the library (v_meta.js) with its status, AUTO / MANUAL
// recommendation, purpose, entry, exit, primitives, difficulty dimensions and its curated cases' measured results (evidence/cases.json)
//   node v_catalogue.mjs --cases <cases.json> --out <VOCABULARY.md>
import fs from "node:fs";
import { META, FAMILIES } from "../v_meta.js";
import { TEMPLATES } from "../v_tech.js";
const AR = process.argv, opt = (k, d) => { const i = AR.indexOf("--" + k); return i > 0 ? AR[i + 1] : d; };
const CS = JSON.parse(fs.readFileSync(opt("cases"))), L = [], esc = (x) => String(x == null ? "" : x).replace(/\|/g, "/");
L.push("# DRIBBLING VOCAB-1 — the technical vocabulary (generated from `vocab1/v_meta.js` + the curated cases' measured results)", "",
  "**STATUS:** INTEGRATED = B4 may choose it from the live state and it passes the library's tests · REVIEW = reached by a manual intent (or the analog feint), works in its curated cases, not chosen automatically · EXPERIMENTAL = in the Lab with its blocker named.",
  "**MODE (the recommendation):** AUTO = ordinary football, always available to B4 · AUTO+MANUAL = B4 chooses it when it is the best solution, and it can be requested · MANUAL = expressive, only an explicit intent plays it.",
  "**Cases:** the Lab's curated replays for it — variant: result (decisive contact time; control returned after it); body = normal-speed-visible events in the clip (slow-motion-only events in brackets).", "");
let nTech = 0; const counts = { INTEGRATED: 0, REVIEW: 0, EXPERIMENTAL: 0 }, modes = { AUTO: 0, "AUTO+MANUAL": 0, MANUAL: 0 };
for (const fam of FAMILIES) { const items = META.filter((m) => m.family === fam); if (!items.length) continue; L.push(`## ${fam}`, "", "| Technique | Status | Mode | Football purpose | Entry → exit | Primitives | Difficulty (tech · max useful entry · support · weak foot · prep · chain · deceive) | Curated cases |", "|---|---|---|---|---|---|---|---|");
  for (const m of items) { nTech++; counts[m.status]++; modes[m.mode]++; const cs = CS.filter((c) => c.tech === m.id), d = m.diff;
    const cc = cs.map((c) => { const sk = c.skills[0], ph = c.phases.find((p) => p.tDecisive != null); return `${c.variant}: ${sk ? sk.result + (sk.result !== "PLAYED" ? ` → ${sk.alt}` : "") : "AUTO" + (ph ? ` → ${ph.label}` : "")}${ph ? ` (${ph.tDecisive.toFixed(2)} s; +${(ph.tControl - ph.tDecisive).toFixed(2)})` : ""}${c.body ? ` · body ${c.body.normal} (${c.body.slow})` : ""}`; }).join("<br>");
    L.push(`| **${esc(m.name)}**${m.ids && m.ids.length ? `<br><code>${m.ids.join(", ")}</code>` : m.gen ? `<br><code>${m.gen}</code>` : ""} | ${m.status} | ${m.mode} | ${esc(m.purpose)}${m.blocker ? `<br>**BLOCKER:** ${esc(m.blocker)}` : ""} | ${esc(m.entry)} → ${esc(m.exit)} | ${esc(m.prim)} | ${d ? `${d.tech} · ${d.vmax} m/s · ${d.support} · ${d.weak} · ${d.prep} · ${d.chain} · ${d.deceive}` : ""} | ${cc || "—"} |`); }
  L.push(""); }
const chains = CS.filter((c) => c.variant === "CHAIN");
L.push("## CHAINS", "", "| Chain | Requests | Each technique: decisive (s) · control returned (+s) · next action's start (s) |", "|---|---|---|");
for (const c of chains) L.push(`| ${esc(c.name.replace(/^CHAIN·CHAIN·/, ""))} | ${c.skills.map((s) => `${s.intent} ${s.result}`).join(" + ")} | ${c.phases.filter((p) => p.tDecisive != null).map((p) => `${p.label} ${p.tDecisive.toFixed(2)} · +${(p.tControl - p.tDecisive).toFixed(2)}${p.tNext != null ? ` · next ${p.tNext.toFixed(2)}` : ""}`).join(" → ")} |`);
L.push("", `**Totals:** ${nTech} catalogue entries — INTEGRATED ${counts.INTEGRATED} · REVIEW ${counts.REVIEW} · EXPERIMENTAL ${counts.EXPERIMENTAL}; AUTO ${modes.AUTO} · AUTO+MANUAL ${modes["AUTO+MANUAL"]} · MANUAL ${modes.MANUAL}; ${Object.keys(TEMPLATES).length} authored parametric templates (5 the locked baseline's, ${Object.keys(TEMPLATES).length - 5} new) + B4's one-contact families + the body feints.`, "");
fs.writeFileSync(opt("out"), L.join("\n")); console.log(`wrote ${opt("out")} (${nTech} entries)`);
