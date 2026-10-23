// lib_vi_cases.mjs — DRIBBLING VOCABULARY INTEGRATION: the main Lab's integrated cards (v_cases.js VI_MOVES) run as the Lab runs them — each
// approved case, ordinary-play sample and declined entry, as written and mirrored: the request's outcome (PLAYED / REJECTED with its first reason),
// the body (v_extreme normal-visible / slow-motion), possession (exits, missed) — the reasons a declined entry shows in the sandbox
//   node lib_vi_cases.mjs [--json f]
import fs from "node:fs";
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
const base = new URL(arg("build", "../"), import.meta.url);
const { makeSim, DT } = await import(new URL("tools/u_env.mjs", base)); const { presetLayers } = await import(new URL("c_sim.js", base)); const { caseOpts, runCaseOn, summarize } = await import(new URL("v_run.js", base));
const X = await import(new URL("tools/v_extreme.mjs", base)); const meta = await import(new URL("v_meta.js", base)); const { VI_MOVES } = await import(new URL("v_cases.js", base));
const reasonOf = meta.headlineReason;
const out = [];
for (const M of VI_MOVES) for (const [grp, list] of [["approved", M.approved.map((p) => p.c)], ["play", M.play], ["declined", M.declined]]) for (const c of list) for (const mirror of [false, true]) {
  const sim = makeSim("TL", Object.assign(caseOpts(c, mirror), { layers: presetLayers("FULL") })); sim.intentOf = meta.intentOf; const r = runCaseOn(sim, c, mirror), S = summarize(sim, r.t0), m = X.measure(sim, Math.round(Math.max(0, r.t0 - 0.3) / DT), 0);
  const sk = (sim.log.skill || [])[0] || null, o = { move: M.id, grp, variant: (mirror ? "MIRROR · " : "") + c.variant, result: sk ? sk.result : "—", played: sk ? sk.played || null : null, reason: sk && sk.result !== "PLAYED" ? reasonOf(sk.rej) : null, normal: m.N.normal, slow: m.N.slow, kinds: Object.fromEntries(Object.entries(m.kinds).filter(([k, n]) => n && !k.endsWith("·diag"))), exits: S.exits.length, missed: S.missed };
  o.ok = (grp === "declined" ? o.result === "REJECTED" : o.result === "PLAYED") && o.normal === 0 && !o.exits && !o.missed; out.push(o);
  console.log(`${o.ok ? "✓" : "✗"} ${M.id.padEnd(10)} ${grp.padEnd(8)} ${o.variant.padEnd(52)} ${o.result} ${o.played || ""}${o.reason ? " — " + o.reason : ""} · body ${o.normal}/${o.slow} · exits ${o.exits} · missed ${o.missed}`); }
console.log(`■ ${out.filter((x) => x.ok).length} / ${out.length} as expected (played clean / declined with a reason), possession kept`);
if (arg("json")) fs.writeFileSync(arg("json"), JSON.stringify(out, null, 1));
