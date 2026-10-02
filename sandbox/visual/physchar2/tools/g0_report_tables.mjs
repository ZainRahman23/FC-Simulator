// physchar2/tools/g0_report_tables.mjs — markdown tables for the G0 report, generated from the spec + g0_results.json (no hand transcription)
import fs from "fs"; import path from "path"; import { fileURLToPath } from "url";
import { generateSpec } from "../spec/v2_spec.js"; import { V2_REF } from "../spec/v2_human.js"; import { BONES } from "../spec/v2_skeleton.js";
const here = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(here, "../../../..");
const res = JSON.parse(fs.readFileSync(path.join(ROOT, "review_artifacts/physical_character_v2/g0/json/g0_results.json"), "utf8"));
const S = generateSpec(V2_REF), D = 180 / Math.PI, f = (v, n = 3) => v.map(x => x.toFixed(n)).join(", "), dg = (r) => (r * D).toFixed(1);
const out = [];
out.push("### Generated body table (V2-REF)\n", "| # | body | bones driven | segment length (m) | mass kg (body + equipment) | COM from proximal joint (m) | I_xx / I_yy / I_zz about COM (kg·m²) | off-diagonal max | colliders | parent joint |", "|---|---|---|---|---|---|---|---|---|---|");
for (const b of S.bodies) { const od = Math.max(Math.abs(b.inertia[0][1]), Math.abs(b.inertia[0][2]), Math.abs(b.inertia[1][2]));
  out.push(`| ${b.index} | ${b.name} | ${b.bones.join(", ")} | ${b.length.toFixed(4)} | ${b.mass.toFixed(3)} (${b.massBody.toFixed(3)} + ${b.massEquip.toFixed(2)}) | (${f(b.comLocal)}) | ${b.inertia[0][0].toFixed(4)} / ${b.inertia[1][1].toFixed(4)} / ${b.inertia[2][2].toFixed(4)} | ${od.toExponential(1)} | ${b.shapes.map(s => s.type + (s.material !== "body" ? `(${s.material})` : "")).join(" + ")} | ${b.joint || "— (root)"} |`); }
out.push(`\nTotals: ${S.totals.mass.toFixed(3)} kg (body ${S.totals.massBody.toFixed(3)} + equipment ${S.totals.massEquip.toFixed(3)}); canonical COM (${f(S.totals.com, 4)}) m.\n`);
out.push("### Joint table (V2-REF)\n", "Constraint-space limits in degrees (ROM-centred frames; x = twist, y / z = pyramid swing). Capacity = isometric torque limit of the structural motor in the + / − constraint direction (motors OFF in G0). Passive τ at hard = end-range torque at the hard limit (− / + side).\n",
  "| joint | bodies | anatomical joint | centre (m) | axis: + motion / − motion | hard [lo, hi] | soft [lo, hi] | capacity + / − N·m | passive τ at hard N·m | ROM centre (anat.) | damping N·m·s/rad |", "|---|---|---|---|---|---|---|---|---|---|---|");
for (const j of S.joints) ["x", "y", "z"].forEach((k, i) => { const ax = j.def.axes[k]; if (!ax) return;
  const head = i === 0 ? `| ${j.name} | ${j.parent} → ${j.child} | ${j.anat} | (${f(j.at)}) ` : "| | | | ";
  if (ax.locked) { out.push(head + `| ${k}: locked | 0 | 0 | — | — | ${i === 0 ? Object.entries(j.centreAnat).map(([a, v]) => `${a} ${(+v).toFixed(1)}`).join(", ") : ""} | ${i === 0 ? j.damping : ""} |`); return; }
  const cap = j.capacity[k], pp = j.passive[i];
  out.push(head + `| ${k}: ${ax.pos} / ${ax.neg}${ax.passiveOnly ? " (passive only)" : ""} | [${dg(j.limits.hard.lo[i])}, ${dg(j.limits.hard.hi[i])}] | [${dg(j.limits.soft.lo[i])}, ${dg(j.limits.soft.hi[i])}] | ${cap ? cap.plus.Nm.toFixed(0) + " / " + cap.minus.Nm.toFixed(0) : "—"} | ${pp ? pp.tauAtHard[0].toFixed(1) + " / " + pp.tauAtHard[1].toFixed(1) : "—"} | ${i === 0 ? Object.entries(j.centreAnat).map(([a, v]) => `${a} ${(+v).toFixed(1)}`).join(", ") : ""} | ${i === 0 ? j.damping : ""} |`); });
out.push("\n### Semantic skeleton + physics → render mapping (V2-REF, canonical T-pose)\n", "| # | bone | parent | Unity | class | driven by | T-pose position (m) | +Y_local (toward child) |", "|---|---|---|---|---|---|---|---|");
BONES.forEach((b, i) => out.push(`| ${i} | ${b.name} | ${b.parent || "—"} | ${b.unity || "unmapped"}${b.unityRequired ? " ✱" : ""} | ${b.cls} | ${b.body} | (${f(S.skeleton.positions[b.name])}) | (${f(S.skeleton.frames[b.name].y, 2)}) |`));
out.push("\n### Hashes (all bodies; identical in Node and headless Chrome)\n", "| body | H m | M kg | spec hash | engine post-step state hash | engine readback hash | checks pass |", "|---|---|---|---|---|---|---|");
for (const r of res.runs) out.push(`| ${r.human.id} | ${r.human.H} | ${r.human.M} | \`${r.specHash}\` | \`${r.engine.stateHash}\` | \`${r.engine.readHash}\` | ${r.checks.filter(c => c.pass).length}/${r.checks.length} |`);
out.push("\n### Every G0 check, every body\n", "| check | " + res.runs.map(r => r.human.id).join(" | ") + " |", "|---|" + res.runs.map(() => "---").join("|") + "|");
const ids = [...new Set(res.runs.flatMap(r => r.checks.map(c => c.id)))];
for (const id of ids) { const name = res.runs.find(r => r.checks.find(c => c.id === id)).checks.find(c => c.id === id).name;
  out.push(`| **${id}** ${name} | ` + res.runs.map(r => { const c = r.checks.find(x => x.id === id); return c ? (c.pass ? "PASS" : "**FAIL**") : "—"; }).join(" | ") + " |"); }
out.push("", "| global check | result | value |", "|---|---|---|"); for (const c of res.global) out.push(`| **${c.id}** ${c.name} | ${c.pass ? "PASS" : "**FAIL**"} | ${c.value} |`);
const ref = res.runs.find(r => r.human.id === "V2-REF");
out.push("\n### V2-REF check values (exact runner output)\n"); for (const c of ref.checks) out.push(`- **${c.pass ? "PASS" : "FAIL"} ${c.id}** ${c.name} — ${c.value} [${c.limit}]${c.detail ? " — " + c.detail : ""}`);
fs.writeFileSync(path.join(ROOT, "review_artifacts/physical_character_v2/g0/G0_TABLES.md"), "# V2-G0 generated tables\n\nGenerated by `sandbox/visual/physchar2/tools/g0_report_tables.mjs` from the spec generator and `g0/json/g0_results.json`.\n\n" + out.join("\n") + "\n");
console.log("wrote review_artifacts/physical_character_v2/g0/G0_TABLES.md", out.length, "lines");
