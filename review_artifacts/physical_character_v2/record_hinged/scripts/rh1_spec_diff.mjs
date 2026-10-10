// RH1 SPEC DIFF (documentation, 2026-10-11 audit; pure spec generation, no physics): the exact field-level differences between
//   RH1 = PI1-runner-vinicius-RH1 (spec/v2_pi1_runner_rh.js) and R0 = PI1-runner-vinicius (spec/v2_pi1_runner.js) — every differing leaf, listed;
//   R0 and RH1 vs the frozen validated reference body V2-REF (spec/v2_human.js) — summarised per section / body / joint (R0's record overrides).
// All specs at the accepted ankle neutral K 0.13 (the qualification-v2 configuration). Bodies and joints are keyed by name, so a path reads
// e.g. bodies.forearm_L.shapes.0.pos.1. Numbers compare exactly (Δ reported); nothing is rounded.
// usage (cwd = worktree root): node review_artifacts/physical_character_v2/record_hinged/scripts/rh1_spec_diff.mjs [out.json]
import fs from "fs"; import path from "path";
const P2 = path.join(process.cwd(), "sandbox/visual/physchar2/"), imp = (f) => import(P2 + f);
const { generateSpec, specHash } = await imp("spec/v2_spec.js"), { VARIATION_SET } = await imp("spec/v2_human.js"), { setAnkleNeutralKOverride } = await imp("spec/v2_joints.js");
const { PI1_RUNNER } = await imp("spec/v2_pi1_runner.js"), { PI1_RUNNER_RH1, RIG_RECORD } = await imp("spec/v2_pi1_runner_rh.js");
setAnkleNeutralKOverride(0.13);
const REFH = VARIATION_SET.find(h => h.id === "V2-REF"), REF = generateSpec(REFH), R0 = generateSpec(PI1_RUNNER), RH = generateSpec(PI1_RUNNER_RH1);
const keyed = (s) => ({ ...s, bodies: Object.fromEntries(s.bodies.map(b => [b.name, b])), joints: Object.fromEntries(s.joints.map(j => [j.name, j])) });
function flat(o, p = "", out = {}) { if (o === null || typeof o !== "object") { out[p] = o; return out; } for (const [k, v] of Object.entries(o)) flat(v, p ? `${p}.${k}` : k, out); return out; }
function diff(a, b) { const A = flat(keyed(a)), B = flat(keyed(b)), rows = [];
  for (const k of new Set([...Object.keys(A), ...Object.keys(B)])) { const x = A[k], y = B[k]; if (x === y) continue;
    rows.push({ path: k, a: x === undefined ? "(absent)" : x, b: y === undefined ? "(absent)" : y, delta: typeof x === "number" && typeof y === "number" ? y - x : null }); }
  return rows.sort((p, q) => (p.path < q.path ? -1 : 1)); }
const group = (rows) => { const g = {}; for (const r of rows) { const s = r.path.split("."), k = ["bodies", "joints"].includes(s[0]) ? `${s[0]}.${s[1]}` : s[0]; g[k] = (g[k] || 0) + 1; } return g; };
const d10 = diff(R0, RH), dRef0 = diff(REF, R0), dRef1 = diff(REF, RH);
const out = { tool: "rh1_spec_diff.mjs", ankleNeutralK: 0.13,
  hashes: { "V2-REF": specHash(REF), R0: specHash(R0), RH1: specHash(RH) },
  humans: { "V2-REF": REFH, R0: PI1_RUNNER, RH1: PI1_RUNNER_RH1 }, rigRecord: RIG_RECORD,
  RH1_vs_R0: { differingLeaves: d10.length, bySection: group(d10), leaves: d10 },
  R0_vs_V2REF: { differingLeaves: dRef0.length, bySection: group(dRef0) },
  RH1_vs_V2REF: { differingLeaves: dRef1.length, bySection: group(dRef1) } };
console.log(`hashes: V2-REF ${out.hashes["V2-REF"]}, R0 ${out.hashes.R0}, RH1 ${out.hashes.RH1} (ankle K 0.13)`);
console.log(`RH1 vs R0: ${d10.length} differing leaves (every one listed in the JSON); by section ${JSON.stringify(out.RH1_vs_R0.bySection)}; moved joint centres:`);
for (const r of d10.filter(r => /^joints\.[^.]+\.at\.|^bodies\.[^.]+\.origin\.|^bodies\.[^.]+\.distal\./.test(r.path))) console.log(`   ${r.path}: ${JSON.stringify(r.a)} → ${JSON.stringify(r.b)}${r.delta !== null ? ` (Δ ${(r.delta * 1000).toFixed(6)} mm)` : ""}`);
console.log(`R0 vs V2-REF: ${dRef0.length} differing leaves (the record overrides ${JSON.stringify(PI1_RUNNER.overrides)}, H ${PI1_RUNNER.H} / M ${PI1_RUNNER.M}); RH1 vs V2-REF: ${dRef1.length}`);
const o = process.argv[2]; if (o) fs.writeFileSync(o, JSON.stringify(out, null, 1));
