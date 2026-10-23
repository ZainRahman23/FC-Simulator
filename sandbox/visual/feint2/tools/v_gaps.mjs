// vocab1/tools/v_gaps.mjs — BALL / CONTACT GAPS: at every authoritative contact of every curated case (the Lab's runner), the posed boot's hull
// gap to the ball at that tick (> 0: the drawn boot short of the ball it plays) — per technique role, and the worst
//   node v_gaps.mjs
import fs from "node:fs";
import { ENV, makeSim } from "./u_env.mjs";
import { presetLayers } from "../c_sim.js";
import { PlayBody } from "../u_body.js";
import { CASES, CHAINS } from "../v_cases.js";
import { caseOpts, runCaseOn } from "../v_run.js";
const env = { ...ENV, colliders: JSON.parse(fs.readFileSync(new URL("../../dribble1/d1_colliders.json", import.meta.url))) };
const all = [], byRole = {}, worst = [];
for (const c of CASES.concat(CHAINS)) { const sim = makeSim("TL", Object.assign(caseOpts(c), { layers: presetLayers("FULL") })), r = runCaseOn(sim, c), body = new PlayBody(env, sim);
  for (const k of sim.contacts) { if (k.missed || k.t < r.clip[0]) continue; const p = body.pose(k.t), g = p.gap && p.gap[k.F] ? p.gap[k.F].gap : null; if (g == null) continue; const gg = Math.max(0, g);
    all.push(gg); const role = (k.role || "").replace(/ ·.*$/, "").slice(0, 26); (byRole[role] = byRole[role] || []).push(gg); worst.push({ g: gg, case: `${c.tech}·${c.variant}`, role: k.role, F: k.F, surface: k.surface }); } }
const q = (A, x) => { const s = A.slice().sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(x * s.length))]; };
console.log(`■ ${all.length} contacts in the curated cases · boot ↔ ball gap p50 ${(q(all, 0.5) * 100).toFixed(1)} cm · p90 ${(q(all, 0.9) * 100).toFixed(1)} cm · p99 ${(q(all, 0.99) * 100).toFixed(1)} cm · max ${(Math.max(...all) * 100).toFixed(1)} cm · > 5 cm: ${all.filter((x) => x > 0.05).length} · > 10 cm: ${all.filter((x) => x > 0.10).length}`);
for (const [r, A] of Object.entries(byRole).sort((a, b) => q(b[1], 0.9) - q(a[1], 0.9)).slice(0, 14)) console.log(`   ${r.padEnd(28)} n ${String(A.length).padStart(3)} · p50 ${(q(A, 0.5) * 100).toFixed(1)} · p90 ${(q(A, 0.9) * 100).toFixed(1)} · max ${(Math.max(...A) * 100).toFixed(1)} cm`);
console.log("   worst: " + worst.sort((a, b) => b.g - a.g).slice(0, 8).map((w) => `${w.case} ${w.F} ${w.surface} (${w.role.slice(0, 30)}) ${(w.g * 100).toFixed(1)} cm`).join(" · "));
